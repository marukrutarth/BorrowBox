import {
  AuthFormInput,
  CategoryName,
  FilterCriteria,
  IndianCity,
  NewListingInput,
  ProductListing,
  ProfileUpdateInput,
  RentalBookingRecord,
  RentalQuoteResult,
  RentVsBuyResult,
  ValidationResult,
} from '../types/marketplace';
import {
  INDIA_STATES_AND_UTS,
  areCitiesEquivalent,
  resolveCanonicalCityName,
} from '../data/indiaLocations';

export const ALL_CATEGORIES: CategoryName[] = [
  'Electronics',
  'Photography',
  'Gaming',
  'Tools',
  'Events',
  'Outdoor',
  'Education',
  'Musical Instruments',
];

export const ALL_CITIES: IndianCity[] = Array.from(
  new Set(INDIA_STATES_AND_UTS.flatMap((s) => s.cities))
);

// Blueprint validation constants (synced with firebase-blueprint.json & firestore.rules)
export const BLUEPRINT_LIMITS = {
  UID_MAX: 128,
  UID_REGEX: /^[a-zA-Z0-9_\-]+$/,
  NAME_MIN: 2,
  NAME_MAX: 80,
  PHOTO_URL_MAX: 500,
  CITY_MIN: 2,
  CITY_MAX: 40,
  NEIGHBORHOOD_MIN: 2,
  NEIGHBORHOOD_MAX: 80,
  EMAIL_MIN: 5,
  EMAIL_MAX: 120,
  PHONE_MAX: 20,
  TITLE_MIN: 5,
  TITLE_MAX: 140,
  DESCRIPTION_MIN: 20,
  DESCRIPTION_MAX: 2000,
  PICKUP_MIN: 5,
  PICKUP_MAX: 200,
  IMAGE_URL_MAX: 350000,
};

/**
 * Formats a numeric amount in Indian Rupees (₹) using the Indian numbering system (lakhs/thousands).
 */
export function formatINR(amount: number): string {
  if (!Number.isFinite(amount)) {
    return '₹0';
  }
  const rounded = Math.round(amount);
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(Math.abs(rounded));
  return rounded < 0 ? `-₹${formatted}` : `₹${formatted}`;
}

/**
 * Checks whether two inclusive YYYY-MM-DD date ranges overlap.
 */
export function hasDateRangeOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  if (!startA || !endA || !startB || !endB) {
    return false;
  }
  return startA <= endB && endA >= startB;
}

/**
 * Validates whether a listing is available for a requested date range and has no overlapping accepted/picked_up bookings.
 */
export function isListingAvailableForDates(
  listing: Pick<
    ProductListing,
    'id' | 'availableFrom' | 'availableTo' | 'minRentalDays' | 'status'
  >,
  startDate: string,
  endDate: string,
  existingBookings: Pick<
    RentalBookingRecord,
    'listingId' | 'startDate' | 'endDate' | 'status'
  >[]
): { available: boolean; reason?: string } {
  if (listing.status === 'archived') {
    return {
      available: false,
      reason: 'This listing has been archived by the owner.',
    };
  }
  if (!startDate || !endDate || endDate < startDate) {
    return {
      available: false,
      reason: 'Select a valid pickup and return date range.',
    };
  }
  if (listing.availableFrom && startDate < listing.availableFrom) {
    return {
      available: false,
      reason: `Item is available starting ${listing.availableFrom}.`,
    };
  }
  if (listing.availableTo && endDate > listing.availableTo) {
    return {
      available: false,
      reason: `Item availability ends on ${listing.availableTo}.`,
    };
  }

  const startMs = Date.parse(`${startDate}T00:00:00Z`);
  const endMs = Date.parse(`${endDate}T00:00:00Z`);
  const diffDays = Math.round((endMs - startMs) / (1000 * 60 * 60 * 24));
  const days = diffDays === 0 ? 1 : diffDays;
  if (days < listing.minRentalDays) {
    return {
      available: false,
      reason: `Requires a minimum rental of ${listing.minRentalDays} days.`,
    };
  }

  for (const booking of existingBookings) {
    if (booking.listingId !== listing.id) continue;
    if (
      booking.status !== 'pending' &&
      booking.status !== 'accepted' &&
      booking.status !== 'picked_up'
    ) {
      continue;
    }
    if (
      hasDateRangeOverlap(startDate, endDate, booking.startDate, booking.endDate)
    ) {
      return {
        available: false,
        reason: `Reserved from ${booking.startDate} to ${booking.endDate}. Please pick different dates.`,
      };
    }
  }

  return { available: true };
}

/**
 * Generates a deterministic 6-character alphanumeric handover verification code for QR & pickup/return confirmation.
 */
export function generateHandoverCode(seed: string): string {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  let code = '';
  for (let i = 0; i < 6; i++) {
    const idx = Math.abs((hash >> (i * 4)) ^ (i * 31)) % alphabet.length;
    code += alphabet[idx];
  }
  return `BB-${code}`;
}

/**
 * Phase 4 Rent-vs-Buy Calculator in Indian Rupees (₹).
 */
export function calculateRentVsBuy(params: {
  retailPriceINR: number;
  dailyRentalINR: number;
  plannedDaysPerYear: number;
  annualMaintenancePercent?: number;
}): RentVsBuyResult {
  const retailPriceINR = Math.max(500, Math.round(params.retailPriceINR || 0));
  const dailyRentalINR = Math.max(50, Math.round(params.dailyRentalINR || 0));
  const plannedDaysPerYear = Math.max(
    1,
    Math.min(365, Math.round(params.plannedDaysPerYear || 1))
  );
  const maintenanceRate = (params.annualMaintenancePercent ?? 5) / 100;

  // Apply 10% multi-day discount when renting 7+ days per year
  const effectiveDaily =
    plannedDaysPerYear >= 7 ? dailyRentalINR * 0.9 : dailyRentalINR;
  const estimatedRentalCostINR = Math.round(
    effectiveDaily * plannedDaysPerYear
  );

  // Net 1-year ownership cost = depreciation (~28% first-year value drop) + annual maintenance/storage (~5%)
  const firstYearDepreciation = retailPriceINR * 0.28;
  const maintenanceCost = retailPriceINR * maintenanceRate;
  const estimatedAnnualOwnershipCostINR = Math.round(
    firstYearDepreciation + maintenanceCost
  );

  const estimatedSavingsINR =
    retailPriceINR + Math.round(maintenanceCost) - estimatedRentalCostINR;
  const breakEvenDays = Math.max(
    1,
    Math.ceil(retailPriceINR / Math.max(1, dailyRentalINR))
  );
  const recommendation =
    plannedDaysPerYear < Math.min(breakEvenDays, 30) ? 'rent' : 'buy';

  const summary =
    recommendation === 'rent'
      ? `Renting for ${plannedDaysPerYear} days costs ${formatINR(
          estimatedRentalCostINR
        )} vs. ${formatINR(
          retailPriceINR
        )} upfront to buy — keeping ${formatINR(
          Math.max(0, retailPriceINR - estimatedRentalCostINR)
        )} in your pocket.`
      : `At ${plannedDaysPerYear} rental days/year, you approach the ${breakEvenDays}-day break-even point (${formatINR(
          retailPriceINR
        )} retail). Buying and listing it on BorrowBox may be more economical.`;

  return {
    retailPriceINR,
    dailyRentalINR,
    plannedDaysPerYear,
    estimatedRentalCostINR,
    estimatedAnnualOwnershipCostINR,
    estimatedSavingsINR,
    breakEvenDays,
    recommendation,
    summary,
  };
}

/**
 * Phase 4 Personalized Recommendations based on real available listings.
 */
export function computePersonalizedRecommendations(
  listings: ProductListing[],
  options: {
    userCity?: IndianCity | 'All';
    preferredCategory?: CategoryName | 'All';
    excludeListingId?: string;
    limit?: number;
  }
): ProductListing[] {
  const limit = options.limit ?? 3;
  const activeListings = listings.filter(
    (item) =>
      item.status !== 'archived' && item.id !== options.excludeListingId
  );

  const scored = activeListings.map((item) => {
    let score = 0;
    if (!item.isDemoData) {
      score += 30; // Prioritize genuine community listings
    }
    if (
      options.userCity &&
      options.userCity !== 'All' &&
      areCitiesEquivalent(item.city, options.userCity)
    ) {
      score += 25;
    }
    if (
      options.preferredCategory &&
      options.preferredCategory !== 'All' &&
      item.category === options.preferredCategory
    ) {
      score += 20;
    }
    if (item.featured) {
      score += 5;
    }
    return { item, score };
  });

  scored.sort(
    (a, b) =>
      b.score - a.score || a.item.dailyPriceINR - b.item.dailyPriceINR
  );

  return scored.slice(0, limit).map((s) => s.item);
}

/**
 * Filters and sorts product listings deterministically based on search query, category, city, neighborhood, condition, date range, price, and source.
 */
export function filterAndSortListings(
  listings: ProductListing[],
  criteria: FilterCriteria
): ProductListing[] {
  const normalizedQuery = (criteria.query ?? '').trim().toLowerCase();
  const normalizedNeighborhood = (criteria.neighborhood ?? '')
    .trim()
    .toLowerCase();
  const category = criteria.category ?? 'All';
  const city = criteria.city ?? 'All';
  const condition = criteria.condition ?? 'All';
  const sortBy = criteria.sortBy ?? 'featured';
  const maxDailyPrice = criteria.maxDailyPriceINR;
  const sourceFilter = criteria.sourceFilter ?? 'all';
  const availableStart = criteria.availableStart;
  const availableEnd = criteria.availableEnd;

  const filtered = listings.filter((item) => {
    if (!criteria.includeArchived && item.status === 'archived') {
      return false;
    }
    if (sourceFilter === 'community' && item.isDemoData) {
      return false;
    }
    if (sourceFilter === 'sample' && !item.isDemoData) {
      return false;
    }
    if (category !== 'All' && item.category !== category) {
      return false;
    }
    if (city !== 'All' && !areCitiesEquivalent(item.city, city)) {
      return false;
    }
    if (
      normalizedNeighborhood.length > 0 &&
      !item.neighborhood.toLowerCase().includes(normalizedNeighborhood)
    ) {
      return false;
    }
    if (condition !== 'All' && item.condition !== condition) {
      return false;
    }
    if (
      typeof maxDailyPrice === 'number' &&
      maxDailyPrice > 0 &&
      item.dailyPriceINR > maxDailyPrice
    ) {
      return false;
    }
    if (availableStart && item.availableFrom > availableStart) {
      return false;
    }
    if (availableEnd && item.availableTo < availableEnd) {
      return false;
    }

    if (normalizedQuery.length > 0) {
      const canonicalQueryCity = resolveCanonicalCityName(normalizedQuery).toLowerCase();
      const searchable = [
        item.title,
        item.category,
        item.city,
        item.neighborhood,
        item.description,
        item.owner.name,
        ...item.specifications,
      ]
        .join(' ')
        .toLowerCase();
      if (
        !searchable.includes(normalizedQuery) &&
        (!canonicalQueryCity || !searchable.includes(canonicalQueryCity))
      ) {
        return false;
      }
    }

    return true;
  });

  const sorted = [...filtered];
  sorted.sort((a, b) => {
    switch (sortBy) {
      case 'price-asc':
        return a.dailyPriceINR - b.dailyPriceINR || a.title.localeCompare(b.title);
      case 'price-desc':
        return b.dailyPriceINR - a.dailyPriceINR || a.title.localeCompare(b.title);
      case 'deposit-asc':
        return (
          a.refundableDepositINR - b.refundableDepositINR ||
          a.dailyPriceINR - b.dailyPriceINR
        );
      case 'featured':
      default:
        // Community listings appear before demo listings when both are featured
        if (a.isDemoData !== b.isDemoData) {
          return a.isDemoData ? 1 : -1;
        }
        if (a.featured !== b.featured) {
          return a.featured ? -1 : 1;
        }
        return 0;
    }
  });

  return sorted;
}

/**
 * Calculates rental quote in INR given daily rate, deposit, start date, and end date (YYYY-MM-DD).
 */
export function calculateRentalQuote(
  dailyRateINR: number,
  refundableDepositINR: number,
  startDateStr: string,
  endDateStr: string,
  minRentalDays = 1
): RentalQuoteResult {
  const emptyResult = (error: string): RentalQuoteResult => ({
    valid: false,
    error,
    days: 0,
    dailyRateINR,
    baseRentalINR: 0,
    weeklyDiscountINR: 0,
    platformSupportFeeINR: 0,
    refundableDepositINR,
    totalUpfrontINR: 0,
    netRentalCostINR: 0,
  });

  if (!startDateStr || !endDateStr) {
    return emptyResult('Select both pickup and return dates.');
  }

  const startMs = Date.parse(`${startDateStr}T00:00:00Z`);
  const endMs = Date.parse(`${endDateStr}T00:00:00Z`);

  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    return emptyResult('Enter valid calendar dates.');
  }

  if (endMs < startMs) {
    return emptyResult('Return date must be on or after the pickup date.');
  }

  const diffDays = Math.round((endMs - startMs) / (1000 * 60 * 60 * 24));
  const days = diffDays === 0 ? 1 : diffDays;

  if (days < minRentalDays) {
    return emptyResult(
      `This item requires a minimum rental of ${minRentalDays} days.`
    );
  }

  if (days > 60) {
    return emptyResult('Maximum single booking duration is 60 days.');
  }

  const baseRentalINR = days * dailyRateINR;
  const weeklyDiscountINR =
    days >= 7 ? Math.round(baseRentalINR * 0.1) : 0;
  const discountedRental = baseRentalINR - weeklyDiscountINR;
  const platformSupportFeeINR = Math.min(
    1500,
    Math.max(49, Math.round(discountedRental * 0.05))
  );
  const netRentalCostINR = discountedRental + platformSupportFeeINR;
  const totalUpfrontINR = netRentalCostINR + refundableDepositINR;

  return {
    valid: true,
    days,
    dailyRateINR,
    baseRentalINR,
    weeklyDiscountINR,
    platformSupportFeeINR,
    refundableDepositINR,
    totalUpfrontINR,
    netRentalCostINR,
  };
}

/**
 * Validates input when an owner lists or edits an item for rent.
 */
export function validateListingInput(input: NewListingInput): ValidationResult {
  const errors: Record<string, string> = {};

  if (
    !input.title ||
    input.title.trim().length < BLUEPRINT_LIMITS.TITLE_MIN ||
    input.title.trim().length > BLUEPRINT_LIMITS.TITLE_MAX
  ) {
    errors.title = `Enter a descriptive product name (${BLUEPRINT_LIMITS.TITLE_MIN}–${BLUEPRINT_LIMITS.TITLE_MAX} characters).`;
  }
  if (!input.category) {
    errors.category = 'Select a product category.';
  }
  if (
    !Number.isFinite(input.dailyPriceINR) ||
    input.dailyPriceINR < 50 ||
    input.dailyPriceINR > 500000
  ) {
    errors.dailyPriceINR = 'Daily rental price must be between ₹50 and ₹5,00,000.';
  }
  if (
    !Number.isFinite(input.refundableDepositINR) ||
    input.refundableDepositINR < 0 ||
    input.refundableDepositINR > 1000000
  ) {
    errors.refundableDepositINR =
      'Refundable deposit must be between ₹0 and ₹10,00,000.';
  }
  if (!input.city) {
    errors.city = 'Select your city.';
  }
  if (
    !input.neighborhood ||
    input.neighborhood.trim().length < BLUEPRINT_LIMITS.NEIGHBORHOOD_MIN ||
    input.neighborhood.trim().length > BLUEPRINT_LIMITS.NEIGHBORHOOD_MAX
  ) {
    errors.neighborhood =
      'Enter your neighborhood or locality (2–80 characters).';
  }
  if (
    !input.pickupLocation ||
    input.pickupLocation.trim().length < BLUEPRINT_LIMITS.PICKUP_MIN ||
    input.pickupLocation.trim().length > BLUEPRINT_LIMITS.PICKUP_MAX
  ) {
    errors.pickupLocation = 'Provide a clear pickup landmark (5–200 characters).';
  }
  if (
    !input.description ||
    input.description.trim().length < BLUEPRINT_LIMITS.DESCRIPTION_MIN ||
    input.description.trim().length > BLUEPRINT_LIMITS.DESCRIPTION_MAX
  ) {
    errors.description =
      'Provide a detailed description and condition note (20–2000 characters).';
  }
  if (!input.ownerName || input.ownerName.trim().length < 2) {
    errors.ownerName = 'Enter your full name.';
  }
  if (
    input.availableFrom &&
    input.availableTo &&
    input.availableTo < input.availableFrom
  ) {
    errors.availableTo = 'Available until date must be on or after start date.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates Login and Sign Up form inputs strictly against firebase-blueprint.json boundaries.
 */
export function validateAuthInput(
  mode: 'login' | 'signup',
  input: AuthFormInput
): ValidationResult {
  const errors: Record<string, string> = {};
  const emailTrimmed = (input.email ?? '').trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (
    !emailRegex.test(emailTrimmed) ||
    emailTrimmed.length < BLUEPRINT_LIMITS.EMAIL_MIN ||
    emailTrimmed.length > BLUEPRINT_LIMITS.EMAIL_MAX
  ) {
    errors.email = 'Enter a valid email address (5–120 characters).';
  }

  if (!input.password || input.password.length < 6) {
    errors.password = 'Password must be at least 6 characters.';
  }

  if (mode === 'signup') {
    const nameTrimmed = (input.fullName ?? '').trim();
    if (
      nameTrimmed.length < BLUEPRINT_LIMITS.NAME_MIN ||
      nameTrimmed.length > BLUEPRINT_LIMITS.NAME_MAX
    ) {
      errors.fullName = `Enter your full name (${BLUEPRINT_LIMITS.NAME_MIN}–${BLUEPRINT_LIMITS.NAME_MAX} characters).`;
    }

    const cleanedPhone = (input.phone ?? '').replace(/[\s-]/g, '');
    if (
      !/^(\+91)?[6-9]\d{9}$/.test(cleanedPhone) ||
      cleanedPhone.length > BLUEPRINT_LIMITS.PHONE_MAX
    ) {
      errors.phone = 'Enter a valid 10-digit Indian mobile number.';
    }

    const canonicalSignupCity = resolveCanonicalCityName(input.city || '');
    if (!canonicalSignupCity || !ALL_CITIES.includes(canonicalSignupCity as IndianCity)) {
      errors.city = 'Select your primary city.';
    }

    const neighborhoodTrimmed = (input.neighborhood ?? '').trim();
    if (
      neighborhoodTrimmed.length > 0 &&
      (neighborhoodTrimmed.length < BLUEPRINT_LIMITS.NEIGHBORHOOD_MIN ||
        neighborhoodTrimmed.length > BLUEPRINT_LIMITS.NEIGHBORHOOD_MAX)
    ) {
      errors.neighborhood = `Neighborhood must be ${BLUEPRINT_LIMITS.NEIGHBORHOOD_MIN}–${BLUEPRINT_LIMITS.NEIGHBORHOOD_MAX} characters.`;
    }

    const photoTrimmed = (input.photoURL ?? '').trim();
    if (photoTrimmed.length > BLUEPRINT_LIMITS.PHOTO_URL_MAX) {
      errors.photoURL = `Profile image URL must be under ${BLUEPRINT_LIMITS.PHOTO_URL_MAX} characters.`;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates profile update inputs against firebase-blueprint.json schema limits.
 */
export function validateProfileUpdateInput(
  input: ProfileUpdateInput
): ValidationResult {
  const errors: Record<string, string> = {};
  const nameTrimmed = (input.name ?? '').trim();

  if (
    nameTrimmed.length < BLUEPRINT_LIMITS.NAME_MIN ||
    nameTrimmed.length > BLUEPRINT_LIMITS.NAME_MAX
  ) {
    errors.name = `Name must be between ${BLUEPRINT_LIMITS.NAME_MIN} and ${BLUEPRINT_LIMITS.NAME_MAX} characters.`;
  }

  const canonicalProfileCity = resolveCanonicalCityName(input.city || '');
  if (!canonicalProfileCity || !ALL_CITIES.includes(canonicalProfileCity as IndianCity)) {
    errors.city = 'Select a valid Indian city.';
  }

  const neighborhoodTrimmed = (input.neighborhood ?? '').trim();
  if (
    neighborhoodTrimmed.length < BLUEPRINT_LIMITS.NEIGHBORHOOD_MIN ||
    neighborhoodTrimmed.length > BLUEPRINT_LIMITS.NEIGHBORHOOD_MAX
  ) {
    errors.neighborhood = `Neighborhood must be between ${BLUEPRINT_LIMITS.NEIGHBORHOOD_MIN} and ${BLUEPRINT_LIMITS.NEIGHBORHOOD_MAX} characters.`;
  }

  const photoTrimmed = (input.photoURL ?? '').trim();
  if (photoTrimmed.length > BLUEPRINT_LIMITS.PHOTO_URL_MAX) {
    errors.photoURL = `Profile image URL cannot exceed ${BLUEPRINT_LIMITS.PHOTO_URL_MAX} characters.`;
  }

  const cleanedPhone = (input.phone ?? '').replace(/[\s-]/g, '');
  if (
    cleanedPhone.length > 0 &&
    (!/^(\+91)?[6-9]\d{9}$/.test(cleanedPhone) ||
      cleanedPhone.length > BLUEPRINT_LIMITS.PHONE_MAX)
  ) {
    errors.phone = 'Enter a valid 10-digit Indian mobile number.';
  }

  if (input.activeMode !== 'renter' && input.activeMode !== 'owner') {
    errors.activeMode = 'Select either Renter or Owner workspace mode.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
