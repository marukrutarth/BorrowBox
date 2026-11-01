import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { registerSupportRoutes } from './src/server/supportBackend.ts';
import { registerContactRoutes } from './src/server/contactBackend.ts';
import { registerCheckoutRoutes } from './src/server/checkoutBackend.ts';
import { ALL_CITIES, hasDateRangeOverlap } from './src/utils/rentalLogic.ts';
import { PRIMARY_SUPER_ADMIN_EMAIL } from './src/utils/adminRbac.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

function hasConfiguredGeminiKey(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(key && key.trim().length > 10 && key !== 'MY_GEMINI_API_KEY');
}

function getGenAIClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '12mb' }));
  registerSupportRoutes(app);
  registerContactRoutes(app);
  registerCheckoutRoutes(app);

  // 1. Server-side booking & date overlap validation endpoint
  app.post('/api/marketplace/validate-booking', (req, res) => {
    const {
      startDate,
      endDate,
      availableFrom,
      availableTo,
      minRentalDays = 1,
      existingBookings = [],
    } = req.body || {};

    if (!startDate || !endDate) {
      res.status(400).json({
        valid: false,
        error: 'Both pickup and return dates are required.',
      });
      return;
    }

    const startMs = Date.parse(`${startDate}T00:00:00Z`);
    const endMs = Date.parse(`${endDate}T00:00:00Z`);
    if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) {
      res.status(400).json({
        valid: false,
        error: 'Return date must be on or after the pickup date.',
      });
      return;
    }

    if (availableFrom && startDate < availableFrom) {
      res.status(400).json({
        valid: false,
        error: `Selected pickup date is earlier than the listing availability start (${availableFrom}).`,
      });
      return;
    }

    if (availableTo && endDate > availableTo) {
      res.status(400).json({
        valid: false,
        error: `Selected return date is after the listing availability end (${availableTo}).`,
      });
      return;
    }

    const diffDays = Math.round((endMs - startMs) / (1000 * 60 * 60 * 24));
    const days = diffDays === 0 ? 1 : diffDays;
    if (days < minRentalDays) {
      res.status(400).json({
        valid: false,
        error: `Minimum rental duration is ${minRentalDays} days.`,
      });
      return;
    }

    // Check overlapping active bookings using shared helper
    const conflict = Array.isArray(existingBookings)
      ? existingBookings.find(
          (b: {
            startDate?: string;
            endDate?: string;
            status?: string;
          }) => {
            if (!b.startDate || !b.endDate) return false;
            if (
              b.status !== 'pending' &&
              b.status !== 'accepted' &&
              b.status !== 'picked_up'
            ) {
              return false;
            }
            return hasDateRangeOverlap(startDate, endDate, b.startDate, b.endDate);
          }
        )
      : null;

    if (conflict) {
      res.status(409).json({
        valid: false,
        error: `Dates overlap with an existing reservation (${conflict.startDate} to ${conflict.endDate}).`,
      });
      return;
    }

    res.json({ valid: true, days });
  });

  // 2. Phase 4 AI Capability: Listing Description Assistant
  app.post('/api/ai/listing-description', async (req, res) => {
    const {
      title = '',
      category = 'Electronics',
      condition = 'Excellent',
      city = 'Bengaluru',
      neighborhood = '',
      includedItems = '',
    } = req.body || {};

    if (!title || String(title).trim().length < 3) {
      res.status(400).json({
        error: 'Enter a product title (at least 3 characters) first.',
      });
      return;
    }

    if (!hasConfiguredGeminiKey()) {
      const fallbackDescription = `${title} (${condition} condition) available for neighborhood pickup in ${
        neighborhood ? `${neighborhood}, ` : ''
      }${city}. Carefully maintained and tested prior to every handover. Ideal for short-term projects, weekend use, or testing before buying.${
        includedItems ? ` Includes: ${includedItems}.` : ''
      }`;
      res.json({
        aiGenerated: false,
        notice:
          'Generated using structured template (Configure GEMINI_API_KEY in Settings > Secrets for live Gemini AI copywriting).',
        description: fallbackDescription,
        suggestedRules:
          'Original Government photo ID required at pickup. Inspect and test together at handover. Return clean and on time.',
      });
      return;
    }

    try {
      const ai = getGenAIClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Write a concise, honest, professional peer-to-peer rental listing description (45 to 75 words) and 3 clear rental handover rules for an Indian marketplace called BorrowBox.
Product Title: ${title}
Category: ${category}
Condition: ${condition}
Location: ${neighborhood ? `${neighborhood}, ` : ''}${city}
Included Accessories: ${includedItems || 'Standard accessories'}
Do not invent fake warranty claims or fake past rental counts.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              description: {
                type: Type.STRING,
                description:
                  'Concise, practical product description and condition summary.',
              },
              suggestedRules: {
                type: Type.STRING,
                description:
                  'Period-separated handover rules for the borrower.',
              },
            },
            required: ['description', 'suggestedRules'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json({
        aiGenerated: true,
        notice: 'Drafted with Gemini AI — review and edit before publishing.',
        description: String(parsed.description || '').trim(),
        suggestedRules: String(parsed.suggestedRules || '').trim(),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Gemini API request failed.';
      res.status(500).json({
        error: `AI Description Assistant error: ${message}`,
      });
    }
  });

  // 3. Phase 4 AI Capability: AI Rental Price Suggestion (Clearly labelled as Estimate)
  app.post('/api/ai/price-suggestion', async (req, res) => {
    const {
      title = '',
      category = 'Electronics',
      condition = 'Excellent',
      city = 'Bengaluru',
      replacementValueINR = 25000,
    } = req.body || {};

    const numericRetail = Math.max(500, Number(replacementValueINR) || 25000);
    const conditionMultiplier =
      condition === 'Like New' ? 1.0 : condition === 'Excellent' ? 0.9 : 0.78;
    const baseDaily = Math.max(
      100,
      Math.round(((numericRetail * 0.025) / 50) * conditionMultiplier) * 50
    );
    const minDailyINR = Math.max(100, Math.round((baseDaily * 0.8) / 50) * 50);
    const maxDailyINR = Math.max(150, Math.round((baseDaily * 1.25) / 50) * 50);
    const suggestedDepositINR = Math.max(
      500,
      Math.round((numericRetail * 0.25) / 500) * 500
    );

    if (!hasConfiguredGeminiKey()) {
      res.json({
        aiGenerated: false,
        isEstimateOnly: true,
        disclaimer:
          'Estimate Only: Calculated from BorrowBox category & replacement-value benchmarks in ₹. Actual neighborhood demand may vary.',
        recommendedDailyINR: baseDaily,
        minDailyINR,
        maxDailyINR,
        suggestedDepositINR,
        rationale: `Based on a ₹${numericRetail.toLocaleString('en-IN')} replacement value in ${condition} condition in ${city}, a daily rate around ₹${baseDaily}/day (~2.2%–2.5% of retail) with a ₹${suggestedDepositINR.toLocaleString('en-IN')} refundable security deposit balances borrower affordability and asset protection.`,
      });
      return;
    }

    try {
      const ai = getGenAIClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Suggest a realistic Indian peer-to-peer daily rental price in INR (₹) and refundable security deposit in INR for:
Product: ${title || category}
Category: ${category}
Condition: ${condition}
City: ${city}
Estimated Retail Replacement Value: ₹${numericRetail}
Provide a recommended daily price, min/max range, suggested refundable deposit, and a short 1-2 sentence rationale. Clearly treat these numbers as estimates.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recommendedDailyINR: { type: Type.INTEGER },
              minDailyINR: { type: Type.INTEGER },
              maxDailyINR: { type: Type.INTEGER },
              suggestedDepositINR: { type: Type.INTEGER },
              rationale: { type: Type.STRING },
            },
            required: [
              'recommendedDailyINR',
              'minDailyINR',
              'maxDailyINR',
              'suggestedDepositINR',
              'rationale',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json({
        aiGenerated: true,
        isEstimateOnly: true,
        disclaimer:
          'AI Price Estimate Only: Suggested rates are non-binding estimates based on item category, condition, and replacement value.',
        recommendedDailyINR: Number(parsed.recommendedDailyINR) || baseDaily,
        minDailyINR: Number(parsed.minDailyINR) || minDailyINR,
        maxDailyINR: Number(parsed.maxDailyINR) || maxDailyINR,
        suggestedDepositINR:
          Number(parsed.suggestedDepositINR) || suggestedDepositINR,
        rationale:
          String(parsed.rationale || '').trim() ||
          `Estimated for ${condition} condition in ${city}.`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Gemini API request failed.';
      res.status(500).json({
        error: `AI Price Estimator error: ${message}`,
      });
    }
  });

  // 4. Phase 4 AI Capability: Natural-Language Search Parser grounded on real marketplace catalog
  app.post('/api/ai/nl-search', async (req, res) => {
    const { prompt = '' } = req.body || {};
    const raw = String(prompt || '').trim();
    if (!raw) {
      res.status(400).json({ error: 'Enter a natural-language search query.' });
      return;
    }

    // Deterministic parser fallback / baseline matching pan-India cities
    const lower = raw.toLowerCase();
    const sortedCities = [...ALL_CITIES].sort((a, b) => b.length - a.length);
    let matchedCity = 'All';
    for (const c of sortedCities) {
      if (lower.includes(c.toLowerCase())) {
        matchedCity = c;
        break;
      }
    }
    if (matchedCity === 'All') {
      if (lower.includes('bangalore')) matchedCity = 'Bengaluru';
      else if (lower.includes('delhi') || lower.includes('gurgaon') || lower.includes('noida'))
        matchedCity = 'Delhi NCR';
      else if (lower.includes('bombay')) matchedCity = 'Mumbai';
      else if (lower.includes('calcutta')) matchedCity = 'Kolkata';
      else if (lower.includes('madras')) matchedCity = 'Chennai';
      else if (lower.includes('banaras') || lower.includes('kashi')) matchedCity = 'Varanasi';
      else if (lower.includes('baroda')) matchedCity = 'Vadodara';
      else if (lower.includes('cochin')) matchedCity = 'Kochi';
      else if (lower.includes('pondicherry')) matchedCity = 'Puducherry';
      else if (lower.includes('trivandrum')) matchedCity = 'Thiruvananthapuram';
    }

    const categories: Array<{ name: string; keywords: string[] }> = [
      { name: 'Photography', keywords: ['camera', 'sony', 'lens', 'dslr', 'photo', 'gimbal', 'tripod'] },
      { name: 'Gaming', keywords: ['ps5', 'playstation', 'xbox', 'console', 'gaming', 'controller'] },
      { name: 'Electronics', keywords: ['projector', 'speaker', 'laptop', 'tablet', 'ipad', 'monitor'] },
      { name: 'Tools', keywords: ['drill', 'bosch', 'tool', 'washer', 'ladder', 'saw'] },
      { name: 'Outdoor', keywords: ['tent', 'trek', 'camping', 'outdoor', 'backpack', 'hiking'] },
      { name: 'Musical Instruments', keywords: ['guitar', 'fender', 'piano', 'keyboard', 'drum', 'music', 'amp'] },
      { name: 'Events', keywords: ['pa system', 'jbl', 'mic', 'party', 'event', 'lighting'] },
      { name: 'Education', keywords: ['calculator', 'texas instruments', 'study', 'exam', 'lab', 'education'] },
    ];
    let matchedCategory = 'All';
    for (const cat of categories) {
      if (cat.keywords.some((k) => lower.includes(k))) {
        matchedCategory = cat.name;
        break;
      }
    }

    let maxDailyPriceINR: number | undefined;
    const underMatch = lower.match(/(?:under|below|max|less than|<=?)\s*₹?\s*(\d+)/);
    if (underMatch) {
      maxDailyPriceINR = Number(underMatch[1]);
    }

    // Extract clean keyword if specific model is mentioned
    const stopWords = new Set([
      'find', 'show', 'me', 'rent', 'a', 'an', 'the', 'in', 'near', 'under',
      'below', 'less', 'than', 'for', 'days', 'day', 'weekend', 'bengaluru',
      'bangalore', 'mumbai', 'delhi', 'ncr', 'hyderabad', 'pune', 'chennai',
      'camera', 'tools', 'gaming', 'items', 'listings', 'available', 'rs', 'inr',
    ]);
    const tokens = raw
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2 && !stopWords.has(t.toLowerCase()) && !/^\d+$/.test(t));

    if (!hasConfiguredGeminiKey()) {
      res.json({
        aiGenerated: false,
        query: tokens.slice(0, 2).join(' '),
        category: matchedCategory,
        city: matchedCity,
        maxDailyPriceINR,
        explanation: `Parsed filter criteria: Category=${matchedCategory}, City=${matchedCity}${
          maxDailyPriceINR ? `, Max Price=₹${maxDailyPriceINR}/day` : ''
        }.`,
      });
      return;
    }

    try {
      const ai = getGenAIClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Parse the following Indian rental marketplace search request into structured filter parameters:
User query: "${raw}"
Allowed Categories: "All", "Electronics", "Photography", "Gaming", "Tools", "Events", "Outdoor", "Education", "Musical Instruments"
Allowed Cities: "All" or any recognised Indian city across all 28 states and 8 union territories (e.g. "Bengaluru", "Mumbai", "Delhi NCR", "Hyderabad", "Pune", "Chennai", "Ahmedabad", "Jaipur", "Kolkata", "Kochi", "Lucknow", "Chandigarh", "Indore", etc.)`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              query: {
                type: Type.STRING,
                description:
                  'Specific brand or product keyword (empty string if general category search).',
              },
              category: { type: Type.STRING },
              city: { type: Type.STRING },
              maxDailyPriceINR: { type: Type.INTEGER },
              explanation: { type: Type.STRING },
            },
            required: ['query', 'category', 'city', 'explanation'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json({
        aiGenerated: true,
        query: String(parsed.query || '').trim(),
        category: parsed.category || matchedCategory,
        city: parsed.city || matchedCity,
        maxDailyPriceINR:
          typeof parsed.maxDailyPriceINR === 'number' &&
          parsed.maxDailyPriceINR > 0
            ? parsed.maxDailyPriceINR
            : maxDailyPriceINR,
        explanation:
          String(parsed.explanation || '').trim() ||
          `Filtered by ${parsed.category || matchedCategory} in ${parsed.city || matchedCity}.`,
      });
    } catch {
      res.json({
        aiGenerated: false,
        query: tokens.slice(0, 2).join(' '),
        category: matchedCategory,
        city: matchedCity,
        maxDailyPriceINR,
        explanation: `Parsed filter criteria: Category=${matchedCategory}, City=${matchedCity}${
          maxDailyPriceINR ? `, Max Price=₹${maxDailyPriceINR}/day` : ''
        }.`,
      });
    }
  });

  // 5. Server-Side Administrator Session Verification Endpoint
  app.post('/api/admin/verify-session', (req, res) => {
    const {
      uid = '',
      email = '',
      role = '',
      status = 'active',
      effectivePermissions = [],
    } = req.body || {};

    const normalizedEmail = String(email).trim().toLowerCase();
    const gmailRegex = /^[a-z0-9._%+-]+@(gmail\.com|googlemail\.com)$/;
    if (!uid || !gmailRegex.test(normalizedEmail)) {
      res.status(403).json({
        authorized: false,
        error: 'Access Denied: Only verified Google (@gmail.com) accounts are permitted.',
      });
      return;
    }

    // Bootstrap primary Super Admin check
    if (
      normalizedEmail === 'marukrutarth@gmail.com' ||
      normalizedEmail === PRIMARY_SUPER_ADMIN_EMAIL
    ) {
      res.json({
        authorized: true,
        role: 'super_admin',
        status: 'active',
        verifiedAtISO: new Date().toISOString(),
      });
      return;
    }

    if (status !== 'active') {
      res.status(403).json({
        authorized: false,
        error: 'Access Denied: Administrator account is deactivated.',
      });
      return;
    }

    const allowedRoles = ['super_admin', 'admin', 'moderator', 'support_admin'];
    if (!allowedRoles.includes(role)) {
      res.status(403).json({
        authorized: false,
        error: 'Access Denied: Invalid administrator hierarchy role.',
      });
      return;
    }

    if (!Array.isArray(effectivePermissions) || effectivePermissions.length === 0) {
      res.status(403).json({
        authorized: false,
        error: 'Access Denied: No active administrative permissions assigned.',
      });
      return;
    }

    res.json({
      authorized: true,
      role,
      status: 'active',
      verifiedAtISO: new Date().toISOString(),
    });
  });

  // 6. Server-Side RBAC & Audit Log Verification Endpoint for Admin Dashboard
  app.post('/api/admin/verify-action', (req, res) => {
    const {
      adminEmail = '',
      adminRole = '',
      adminStatus = 'active',
      requiredPermission = '',
      effectivePermissions = [],
      action = '',
      targetType = '',
      targetId = '',
      targetEmail = '',
      requestedRole = '',
    } = req.body || {};

    const normalizedEmail = String(adminEmail).trim().toLowerCase();
    const gmailRegex = /^[a-z0-9._%+-]+@(gmail\.com|googlemail\.com)$/;
    if (!gmailRegex.test(normalizedEmail)) {
      res.status(403).json({
        allowed: false,
        error: 'Access Denied: Only verified Google (@gmail.com) accounts are permitted.',
      });
      return;
    }

    if (adminStatus !== 'active') {
      res.status(403).json({
        allowed: false,
        error: 'Access Denied: Administrator account is deactivated.',
      });
      return;
    }

    const allowedRoles = ['super_admin', 'admin', 'moderator', 'support_admin'];
    if (!allowedRoles.includes(adminRole)) {
      res.status(403).json({
        allowed: false,
        error: 'Access Denied: Invalid administrator hierarchy level.',
      });
      return;
    }

    // Super Admin hierarchy guardrails
    if (
      (requiredPermission === 'admins.create' ||
        requiredPermission === 'admins.update_role' ||
        targetType === 'admin' ||
        requestedRole === 'super_admin') &&
      adminRole !== 'super_admin'
    ) {
      res.status(403).json({
        allowed: false,
        error: 'Hierarchy Violation: Only a Super Admin can create administrators or modify administrator roles.',
      });
      return;
    }

    if (
      targetType === 'admin' &&
      (String(targetEmail).trim().toLowerCase() === 'marukrutarth@gmail.com' ||
        String(targetEmail).trim().toLowerCase() === PRIMARY_SUPER_ADMIN_EMAIL) &&
      requestedRole &&
      requestedRole !== 'super_admin'
    ) {
      res.status(403).json({
        allowed: false,
        error: 'Security Lock: The primary Super Admin account cannot be demoted or deactivated.',
      });
      return;
    }

    if (
      requiredPermission &&
      adminRole !== 'super_admin' &&
      (!Array.isArray(effectivePermissions) ||
        !effectivePermissions.includes(requiredPermission))
    ) {
      res.status(403).json({
        allowed: false,
        error: `Missing required permission: ${requiredPermission}`,
      });
      return;
    }

    res.json({
      allowed: true,
      verifiedAtISO: new Date().toISOString(),
      auditToken: `AUD-${Date.now().toString(36).toUpperCase()}`,
      summary: `${adminRole.toUpperCase()} (${normalizedEmail}) authorised for ${action || requiredPermission} on ${targetType}:${targetId}`,
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BorrowBox full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
