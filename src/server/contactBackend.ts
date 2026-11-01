import { Express, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import {
  ALLOWED_CONTACT_CATEGORIES,
  ContactEnquiryCategory,
} from '../types/contact';

export { ALLOWED_CONTACT_CATEGORIES };
export type { ContactEnquiryCategory };

export interface ContactEnquiryRecord {
  id: string;
  name: string;
  email: string;
  category: ContactEnquiryCategory;
  subject: string;
  message: string;
  status: 'new' | 'reviewed' | 'resolved';
  createdAtISO: string;
  ipHash?: string;
}

const ENQUIRIES_FILE_PATH = path.join(process.cwd(), '.contact-enquiries.json');

export function validateContactEnquiryInput(body: {
  name?: unknown;
  email?: unknown;
  category?: unknown;
  subject?: unknown;
  message?: unknown;
}): { valid: boolean; error?: string; cleanData?: Omit<ContactEnquiryRecord, 'id' | 'status' | 'createdAtISO'> } {
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const category = String(body.category || '').trim() as ContactEnquiryCategory;
  const subject = String(body.subject || '').trim();
  const message = String(body.message || '').trim();

  if (!name || name.length < 2 || name.length > 80) {
    return { valid: false, error: 'Full name must be between 2 and 80 characters.' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email) || email.length > 120) {
    return { valid: false, error: 'Please enter a valid email address.' };
  }

  if (!ALLOWED_CONTACT_CATEGORIES.includes(category)) {
    return { valid: false, error: 'Please select a valid enquiry category.' };
  }

  if (!subject || subject.length < 3 || subject.length > 140) {
    return { valid: false, error: 'Subject must be between 3 and 140 characters.' };
  }

  if (!message || message.length < 10 || message.length > 2500) {
    return { valid: false, error: 'Message must be between 10 and 2,500 characters.' };
  }

  return {
    valid: true,
    cleanData: {
      name,
      email,
      category,
      subject,
      message,
    },
  };
}

function loadEnquiries(): ContactEnquiryRecord[] {
  try {
    if (fs.existsSync(ENQUIRIES_FILE_PATH)) {
      const raw = fs.readFileSync(ENQUIRIES_FILE_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // fallback
  }
  return [];
}

function saveEnquiries(records: ContactEnquiryRecord[]): void {
  try {
    fs.writeFileSync(ENQUIRIES_FILE_PATH, JSON.stringify(records, null, 2), 'utf8');
  } catch {
    // ignore in restricted env
  }
}

export function registerContactRoutes(app: Express): void {
  // 1. Submit general contact enquiry
  app.post('/api/contact/enquiries', (req: Request, res: Response) => {
    const validation = validateContactEnquiryInput(req.body);
    if (!validation.valid || !validation.cleanData) {
      res.status(400).json({ ok: false, error: validation.error });
      return;
    }

    const { name, email, category, subject, message } = validation.cleanData;
    const existing = loadEnquiries();

    // Duplicate submission prevention (same email and subject within 3 minutes)
    const threeMinutesAgo = Date.now() - 3 * 60 * 1000;
    const isDuplicate = existing.some(
      (e) =>
        e.email === email &&
        e.subject.toLowerCase() === subject.toLowerCase() &&
        new Date(e.createdAtISO).getTime() > threeMinutesAgo
    );

    if (isDuplicate) {
      res.status(429).json({
        ok: false,
        error:
          'A similar enquiry was just received from this email address. Please wait a few minutes before submitting again.',
      });
      return;
    }

    const newEnquiry: ContactEnquiryRecord = {
      id: `ENQ-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      name,
      email,
      category,
      subject,
      message,
      status: 'new',
      createdAtISO: new Date().toISOString(),
    };

    existing.unshift(newEnquiry);
    saveEnquiries(existing);

    res.json({
      ok: true,
      enquiryId: newEnquiry.id,
      message:
        'Thank you for reaching out to BorrowBox. Your enquiry has been received and our community operations team will follow up within 24 hours.',
    });
  });

  // 2. Administrator enquiry review endpoint
  app.get('/api/contact/enquiries', (_req: Request, res: Response) => {
    const list = loadEnquiries();
    res.json({
      ok: true,
      enquiries: list,
    });
  });
}
