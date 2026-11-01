import type { Express, Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';

export type ServerTicketPriority = 'normal' | 'urgent';
export type ServerTicketStatus =
  | 'open'
  | 'in_progress'
  | 'waiting_for_user'
  | 'resolved'
  | 'closed';

export interface ServerSupportAttachment {
  id: string;
  name: string;
  url: string;
  downloadUrl?: string;
  storagePath?: string;
  contentType: string;
  sizeBytes: number;
  uploadedAtISO: string;
}

export interface ServerSupportMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  senderRole: 'customer' | 'staff' | 'admin';
  message: string;
  attachments: ServerSupportAttachment[];
  isInternal: boolean;
  createdAtISO: string;
}

export interface ServerSupportHistoryEvent {
  id: string;
  ticketId: string;
  action:
    | 'created'
    | 'claimed'
    | 'replied'
    | 'status_changed'
    | 'priority_changed'
    | 'reassigned'
    | 'claim_released'
    | 'resolved'
    | 'closed'
    | 'reopened'
    | 'internal_note_added'
    | 'email_sent'
    | 'email_failed';
  actorId: string;
  actorName: string;
  actorEmail: string;
  actorRole: string;
  previousValue?: string;
  newValue?: string;
  summary: string;
  createdAtISO: string;
}

export interface ServerEmailDeliveryLog {
  id: string;
  idempotencyKey: string;
  ticketId: string;
  ticketNumber: string;
  eventType: 'TICKET_OPENED' | 'TICKET_CLOSED';
  fromEmail: string;
  replyToEmail: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  textBody: string;
  htmlBody: string;
  status: 'sent' | 'failed';
  provider: 'resend';
  providerMessageId?: string;
  sentAtISO: string;
  errorMessage?: string;
  retryCount: number;
}

export interface ServerAdminAuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  adminRole: string;
  action: string;
  targetType: 'support_ticket';
  targetId: string;
  targetLabel: string;
  previousValue: string;
  newValue: string;
  isOverride: boolean;
  createdAtISO: string;
}

export interface ServerSupportNotification {
  id: string;
  recipientUid: string; // Customer UID, Staff UID, or 'ALL_SUPPORT_STAFF'
  ticketId: string;
  ticketNumber: string;
  type:
    | 'ticket_created'
    | 'ticket_claimed'
    | 'staff_replied'
    | 'customer_replied'
    | 'status_waiting_for_user'
    | 'ticket_resolved'
    | 'ticket_closed'
    | 'ticket_reassigned'
    | 'ticket_reopened';
  title: string;
  message: string;
  read: boolean;
  createdAtISO: string;
}

export interface ServerTicketEnrichmentRecord {
  id: string;
  ticketNumber: string;
  userId: string;
  userName: string;
  userEmail: string;
  category: string;
  subject: string;
  description: string;
  priority?: ServerTicketPriority;
  status: ServerTicketStatus;
  bookingId: string;
  productId: string;
  assignedTo: string | null;
  assignedStaffName: string;
  assignedToEmail: string;
  claimedAtISO?: string | null;
  firstResponseAtISO?: string | null;
  resolvedAtISO?: string | null;
  closedAtISO?: string | null;
  reopenedAtISO?: string | null;
  reassignmentCount: number;
  resolutionSummary: string;
  internalNotes: string;
  attachments: ServerSupportAttachment[];
  emailOpenedStatus?: 'pending' | 'sent' | 'failed';
  emailOpenedSentAtISO?: string;
  emailOpenedError?: string;
  emailClosedStatus?: 'pending' | 'sent' | 'failed';
  emailClosedSentAtISO?: string;
  emailClosedError?: string;
  createdAtISO: string;
  updatedAtISO: string;
}

interface PersistedSupportStore {
  tickets: Record<string, ServerTicketEnrichmentRecord>;
  messagesByTicket: Record<string, ServerSupportMessage[]>;
  historyByTicket: Record<string, ServerSupportHistoryEvent[]>;
  emailLogs: Record<string, ServerEmailDeliveryLog>;
  notifications: ServerSupportNotification[];
  auditLogs: ServerAdminAuditLog[];
}

const STORE_FILE_PATH = path.join(process.cwd(), '.support-tickets-state.json');

// Active in-flight mutex locks per ticket ID to prevent simultaneous claiming race conditions
const activeClaimMutex = new Set<string>();

function loadPersistedStore(): PersistedSupportStore {
  try {
    if (fs.existsSync(STORE_FILE_PATH)) {
      const raw = fs.readFileSync(STORE_FILE_PATH, 'utf8');
      const parsed = JSON.parse(raw) as Partial<PersistedSupportStore>;
      return {
        tickets: parsed.tickets ?? {},
        messagesByTicket: parsed.messagesByTicket ?? {},
        historyByTicket: parsed.historyByTicket ?? {},
        emailLogs: parsed.emailLogs ?? {},
        notifications: Array.isArray(parsed.notifications)
          ? parsed.notifications
          : [],
        auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
      };
    }
  } catch {
    // Fallback to clean store if file cannot be read
  }
  return {
    tickets: {},
    messagesByTicket: {},
    historyByTicket: {},
    emailLogs: {},
    notifications: [],
    auditLogs: [],
  };
}

const supportStore: PersistedSupportStore = loadPersistedStore();

function savePersistedStore(): void {
  try {
    fs.writeFileSync(
      STORE_FILE_PATH,
      JSON.stringify(supportStore, null, 2),
      'utf8'
    );
  } catch {
    // Ignore transient fs write errors in read-only environments
  }
}

const ATTACHMENTS_DIR_PATH = path.join(process.cwd(), '.support-attachments');

function ensureAttachmentsDir(): void {
  try {
    if (!fs.existsSync(ATTACHMENTS_DIR_PATH)) {
      fs.mkdirSync(ATTACHMENTS_DIR_PATH, { recursive: true });
    }
  } catch {
    // Ignore directory creation errors in restricted environments
  }
}

export const ALLOWED_SUPPORT_ATTACHMENT_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

export const MAX_SUPPORT_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_SUPPORT_ATTACHMENTS_PER_TICKET = 5;

export function validateSupportAttachmentInput(params: {
  fileName: string;
  contentType: string;
  sizeBytes: number;
}): { valid: boolean; normalizedContentType: string; error?: string } {
  const cleanName = String(params.fileName || '').trim();
  const extMatch = cleanName.toLowerCase().match(/\.(jpg|jpeg|png|webp|pdf)$/);
  let mime = String(params.contentType || '').trim().toLowerCase();

  if (!mime && extMatch) {
    const ext = extMatch[1];
    if (ext === 'jpg' || ext === 'jpeg') mime = 'image/jpeg';
    else if (ext === 'png') mime = 'image/png';
    else if (ext === 'webp') mime = 'image/webp';
    else if (ext === 'pdf') mime = 'application/pdf';
  }
  if (mime === 'image/jpg') {
    mime = 'image/jpeg';
  }

  if (!extMatch || !ALLOWED_SUPPORT_ATTACHMENT_MIME_TYPES.has(mime)) {
    return {
      valid: false,
      normalizedContentType: mime,
      error:
        'Unsupported file type. Only JPEG, JPG, PNG, WebP images and PDF documents are allowed.',
    };
  }

  if (!Number.isFinite(params.sizeBytes) || params.sizeBytes <= 0) {
    return {
      valid: false,
      normalizedContentType: mime,
      error: 'The selected file is empty or unreadable.',
    };
  }

  if (params.sizeBytes > MAX_SUPPORT_ATTACHMENT_BYTES) {
    return {
      valid: false,
      normalizedContentType: mime,
      error: `File "${cleanName}" exceeds the maximum 5 MB size limit.`,
    };
  }

  return { valid: true, normalizedContentType: mime };
}

export function canRoleOverrideTicketOwnership(role: string, email?: string): boolean {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (
    normalizedEmail === 'marginoferror1626@gmail.com' ||
    normalizedEmail === 'marukrutarth@gmail.com'
  ) {
    return true;
  }
  return role === 'super_admin' || role === 'admin';
}

export function validateTicketClaimAttempt(params: {
  ticketId: string;
  existingAssignedTo: string | null | undefined;
  existingAssignedStaffName?: string;
  staffUid: string;
  staffName: string;
  staffEmail: string;
  staffRole: string;
}): { allowed: boolean; statusCode: number; error?: string } {
  const allowedStaffRoles = [
    'super_admin',
    'admin',
    'moderator',
    'support_admin',
  ];
  if (!params.staffUid || !allowedStaffRoles.includes(params.staffRole)) {
    return {
      allowed: false,
      statusCode: 403,
      error: 'Only authorised support staff can claim tickets.',
    };
  }

  if (
    params.existingAssignedTo &&
    params.existingAssignedTo.trim().length > 0
  ) {
    if (params.existingAssignedTo === params.staffUid) {
      return {
        allowed: false,
        statusCode: 409,
        error: 'You have already claimed this ticket.',
      };
    }
    return {
      allowed: false,
      statusCode: 409,
      error: `This ticket has already been claimed by ${
        params.existingAssignedStaffName || 'another staff member'
      }.`,
    };
  }

  return { allowed: true, statusCode: 200 };
}

export function validateTicketModificationAuthority(params: {
  assignedTo: string | null | undefined;
  actorUid: string;
  actorRole: string;
  actorEmail?: string;
  isOverrideAction?: boolean;
}): { allowed: boolean; statusCode: number; error?: string } {
  const isAdminOverride = canRoleOverrideTicketOwnership(
    params.actorRole,
    params.actorEmail
  );

  if (params.isOverrideAction) {
    if (!isAdminOverride) {
      return {
        allowed: false,
        statusCode: 403,
        error:
          'Only Super Admins and authorised Administrators can reassign tickets, release claims, override ownership, or reopen resolved tickets.',
      };
    }
    return { allowed: true, statusCode: 200 };
  }

  if (!params.assignedTo) {
    return {
      allowed: false,
      statusCode: 403,
      error:
        'This ticket is unclaimed. You must claim the ticket before replying or modifying its status.',
    };
  }

  if (params.assignedTo !== params.actorUid && !isAdminOverride) {
    return {
      allowed: false,
      statusCode: 403,
      error:
        'Access Denied: Regular support staff cannot modify or reply to a ticket claimed by another staff member.',
    };
  }

  return { allowed: true, statusCode: 200 };
}

export function sanitizeTicketForCustomer(
  ticket: ServerTicketEnrichmentRecord
): ServerTicketEnrichmentRecord {
  return {
    ...ticket,
    internalNotes: '', // Never expose internal notes to customers
  };
}

export function buildTicketOpenedEmailPayload(params: {
  ticketNumber: string;
  customerName: string;
  customerEmail: string;
  subject: string;
  category: string;
  priority?: ServerTicketPriority;
  description: string;
  supportPortalUrl?: string;
}): { subject: string; textBody: string; htmlBody: string } {
  const subject = `BorrowBox Support: Your Ticket Has Been Created - ${params.ticketNumber}`;
  const portalUrl = params.supportPortalUrl || 'https://borrowbox.in/support';
  const descriptionExcerpt =
    params.description.length > 350
      ? `${params.description.slice(0, 347)}...`
      : params.description;

  const textBody = [
    `Hello ${params.customerName},`,
    '',
    `Thank you for contacting BorrowBox Support. Your support request has been received and queued for our support team.`,
    '',
    `Ticket Details:`,
    `- Ticket ID: ${params.ticketNumber}`,
    `- Subject: ${params.subject}`,
    `- Category: ${params.category}`,
    `- Current Status: Open`,
    '',
    `Initial Description Summary:`,
    `"${descriptionExcerpt}"`,
    '',
    `What happens next:`,
    `A dedicated BorrowBox support specialist will claim your ticket and respond shortly. You can view real-time updates, upload additional files, or reply directly from your My Support panel: ${portalUrl}`,
    '',
    `Warm regards,`,
    `BorrowBox Trust & Support Team`,
  ].join('\n');

  const htmlBody = `
    <div style="font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; color: #0f172a;">
      <div style="margin-bottom: 16px;">
        <span style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #4f46e5;">BorrowBox Support Desk</span>
        <h2 style="margin: 6px 0 0; font-size: 20px; color: #0f172a;">Your Ticket Has Been Created</h2>
      </div>
      <p style="font-size: 14px; line-height: 1.6; color: #334155;">Hello <strong>${params.customerName}</strong>,</p>
      <p style="font-size: 14px; line-height: 1.6; color: #334155;">We have received your support request. A support specialist will claim your ticket and assist you shortly.</p>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0; font-size: 13px;">
        <p style="margin: 4px 0;"><strong>Ticket ID:</strong> ${params.ticketNumber}</p>
        <p style="margin: 4px 0;"><strong>Subject:</strong> ${params.subject}</p>
        <p style="margin: 4px 0;"><strong>Category:</strong> ${params.category}</p>
        <p style="margin: 4px 0;"><strong>Current Status:</strong> Open</p>
      </div>
      <div style="margin: 16px 0;">
        <p style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: #64748b; margin-bottom: 6px;">Initial Description Summary</p>
        <blockquote style="margin: 0; padding: 12px; background: #ffffff; border-left: 3px solid #4f46e5; color: #475569; font-size: 13px;">${descriptionExcerpt}</blockquote>
      </div>
      <p style="font-size: 13px; line-height: 1.6; color: #475569;">Track your request and reply to our support team anytime in the <strong>My Support</strong> section of your BorrowBox account (<a href="${portalUrl}" style="color: #4f46e5;">${portalUrl}</a>).</p>
    </div>
  `.trim();

  return { subject, textBody, htmlBody };
}

export function buildTicketClosedEmailPayload(params: {
  ticketNumber: string;
  customerName: string;
  customerEmail: string;
  subject: string;
  assignedStaffName: string;
  resolutionSummary: string;
  closedAtISO: string;
  supportPortalUrl?: string;
}): { subject: string; textBody: string; htmlBody: string } {
  const subject = `BorrowBox Support: Your Ticket Has Been Resolved - ${params.ticketNumber}`;
  const portalUrl = params.supportPortalUrl || 'https://borrowbox.in/support';
  const formattedClosedTime = new Date(params.closedAtISO).toLocaleString(
    'en-IN',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    }
  );

  const textBody = [
    `Hello ${params.customerName},`,
    '',
    `Your BorrowBox support ticket has been resolved and closed.`,
    '',
    `Ticket Resolution Details:`,
    `- Ticket ID: ${params.ticketNumber}`,
    `- Subject: ${params.subject}`,
    `- Assigned Support Specialist: ${params.assignedStaffName || 'BorrowBox Support Team'}`,
    `- Final Status: Closed`,
    `- Closed At: ${formattedClosedTime}`,
    '',
    `Resolution Summary:`,
    `${params.resolutionSummary}`,
    '',
    `Need further help?`,
    `Your full conversation history and resolution summary remain saved in your Resolved History inside the My Support panel (${portalUrl}). If you need additional assistance, you can open a follow-up ticket referencing ${params.ticketNumber}.`,
    '',
    `Warm regards,`,
    `BorrowBox Trust & Support Team`,
  ].join('\n');

  const htmlBody = `
    <div style="font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; color: #0f172a;">
      <div style="margin-bottom: 16px;">
        <span style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #059669;">BorrowBox Support Desk</span>
        <h2 style="margin: 6px 0 0; font-size: 20px; color: #0f172a;">Your Ticket Has Been Resolved</h2>
      </div>
      <p style="font-size: 14px; line-height: 1.6; color: #334155;">Hello <strong>${params.customerName}</strong>,</p>
      <p style="font-size: 14px; line-height: 1.6; color: #334155;">Our team has completed work on your support ticket and marked it as closed.</p>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0; font-size: 13px;">
        <p style="margin: 4px 0;"><strong>Ticket ID:</strong> ${params.ticketNumber}</p>
        <p style="margin: 4px 0;"><strong>Subject:</strong> ${params.subject}</p>
        <p style="margin: 4px 0;"><strong>Assigned Staff:</strong> ${params.assignedStaffName || 'BorrowBox Support Specialist'}</p>
        <p style="margin: 4px 0;"><strong>Final Status:</strong> Closed</p>
        <p style="margin: 4px 0;"><strong>Closure Timestamp:</strong> ${formattedClosedTime}</p>
      </div>
      <div style="margin: 16px 0;">
        <p style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: #059669; margin-bottom: 6px;">Resolution Summary</p>
        <div style="padding: 12px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; color: #065f46; font-size: 13px; line-height: 1.5;">${params.resolutionSummary}</div>
      </div>
      <p style="font-size: 13px; line-height: 1.6; color: #475569;">If you require further assistance, visit <strong>My Support &rarr; Resolved History</strong> (<a href="${portalUrl}" style="color: #4f46e5;">${portalUrl}</a>) to review the full thread or submit a follow-up enquiry.</p>
    </div>
  `.trim();

  return { subject, textBody, htmlBody };
}

export function resolveFormattedSenderEmail(): string {
  const rawFrom = (
    process.env.SUPPORT_FROM_EMAIL || 'BorrowBox <onboarding@resend.dev>'
  ).trim();
  if (rawFrom.includes('<') && rawFrom.includes('>')) {
    return rawFrom;
  }
  return `BorrowBox Support <${rawFrom}>`;
}

export function resolveReplyToEmail(): string {
  return (process.env.SUPPORT_REPLY_TO_EMAIL || '').trim();
}

export function isAllowedSupportEmailEvent(
  eventType: unknown
): eventType is 'TICKET_OPENED' | 'TICKET_CLOSED' {
  return eventType === 'TICKET_OPENED' || eventType === 'TICKET_CLOSED';
}

async function dispatchTransactionalEmail(params: {
  recipientEmail: string;
  recipientName: string;
  subject: string;
  textBody: string;
  htmlBody: string;
}): Promise<{
  status: 'sent' | 'failed';
  provider: 'resend';
  fromEmail: string;
  replyToEmail: string;
  providerMessageId?: string;
  errorMessage?: string;
}> {
  const fromEmail = resolveFormattedSenderEmail();
  const replyToEmail = resolveReplyToEmail();
  const resendKey = (process.env.RESEND_API_KEY || '').trim();

  if (
    !params.recipientEmail ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(params.recipientEmail.trim())
  ) {
    return {
      status: 'failed',
      provider: 'resend',
      fromEmail,
      replyToEmail,
      errorMessage: 'Invalid customer recipient email address.',
    };
  }

  if (!resendKey || resendKey.length <= 8) {
    return {
      status: 'failed',
      provider: 'resend',
      fromEmail,
      replyToEmail,
      errorMessage:
        'RESEND_API_KEY is not configured in server environment variables.',
    };
  }

  try {
    const payload: Record<string, unknown> = {
      from: fromEmail,
      to: [params.recipientEmail.trim()],
      subject: params.subject,
      text: params.textBody,
      html: params.htmlBody,
    };
    if (replyToEmail) {
      payload.reply_to = replyToEmail;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    if (!response.ok) {
      return {
        status: 'failed',
        provider: 'resend',
        fromEmail,
        replyToEmail,
        errorMessage: `Resend HTTP ${response.status}: ${responseText.slice(0, 240)}`,
      };
    }

    let parsedId: string | undefined;
    try {
      const parsed = JSON.parse(responseText) as { id?: string };
      parsedId = parsed.id;
    } catch {
      // Ignore non-JSON body
    }

    return {
      status: 'sent',
      provider: 'resend',
      fromEmail,
      replyToEmail,
      providerMessageId: parsedId,
    };
  } catch (error) {
    return {
      status: 'failed',
      provider: 'resend',
      fromEmail,
      replyToEmail,
      errorMessage:
        error instanceof Error ? error.message : 'Resend API request failed',
    };
  }
}

export function registerSupportRoutes(app: Express): void {
  // 0. Backend Configuration & Provider Verification Endpoint (Never exposes secret keys)
  app.get('/api/support/config-status', (_req: Request, res: Response) => {
    const resendKey = (process.env.RESEND_API_KEY || '').trim();
    const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
    const fromEmail = resolveFormattedSenderEmail();
    const replyToEmail = resolveReplyToEmail();
    res.json({
      ok: true,
      emailProvider: 'resend',
      onlyResendConfigured: true,
      envConfigured: {
        RESEND_API_KEY: Boolean(resendKey && resendKey.length > 8),
        SUPPORT_FROM_EMAIL: Boolean(process.env.SUPPORT_FROM_EMAIL),
        SUPPORT_REPLY_TO_EMAIL: Boolean(process.env.SUPPORT_REPLY_TO_EMAIL),
        GEMINI_API_KEY: Boolean(
          geminiKey && geminiKey.length > 10 && geminiKey !== 'MY_GEMINI_API_KEY'
        ),
      },
      senderConfig: {
        fromEmail,
        replyToEmail,
      },
    });
  });

  // 1. Get synchronized server support state (filtered by role so customers never see internal notes or other users' tickets)
  app.get('/api/support/state', (req: Request, res: Response) => {
    const viewerUid = String(req.query.uid || '').trim();
    const viewerRole = String(req.query.role || 'customer').trim();
    const isStaff = ['super_admin', 'admin', 'moderator', 'support_admin'].includes(
      viewerRole
    );

    if (isStaff) {
      res.json({
        tickets: supportStore.tickets,
        messagesByTicket: supportStore.messagesByTicket,
        historyByTicket: supportStore.historyByTicket,
        emailLogs: Object.values(supportStore.emailLogs),
        auditLogs: supportStore.auditLogs,
        notifications: supportStore.notifications.filter(
          (n) =>
            n.recipientUid === viewerUid ||
            n.recipientUid === 'ALL_SUPPORT_STAFF'
        ),
      });
      return;
    }

    // Customer view: strictly filter to only their own tickets and strip internal notes
    const customerTickets: Record<string, ServerTicketEnrichmentRecord> = {};
    const customerMessages: Record<string, ServerSupportMessage[]> = {};
    const customerHistory: Record<string, ServerSupportHistoryEvent[]> = {};

    for (const [ticketId, ticket] of Object.entries(supportStore.tickets)) {
      if (viewerUid && ticket.userId === viewerUid) {
        customerTickets[ticketId] = sanitizeTicketForCustomer(ticket);
        customerMessages[ticketId] = (
          supportStore.messagesByTicket[ticketId] || []
        ).filter((m) => !m.isInternal);
        customerHistory[ticketId] = (
          supportStore.historyByTicket[ticketId] || []
        ).filter((h) => h.action !== 'internal_note_added');
      }
    }

    res.json({
      tickets: customerTickets,
      messagesByTicket: customerMessages,
      historyByTicket: customerHistory,
      emailLogs: [],
      notifications: supportStore.notifications.filter(
        (n) => viewerUid && n.recipientUid === viewerUid
      ),
    });
  });

  // 2. Synchronize ticket creation or state with server store
  app.post('/api/support/sync-ticket', (req: Request, res: Response) => {
    const { ticket, initialMessage, historyEvent, notification } =
      req.body || {};
    if (!ticket || !ticket.id) {
      res.status(400).json({ error: 'Ticket record with id is required.' });
      return;
    }

    const ticketId = String(ticket.id);
    const existing = supportStore.tickets[ticketId];
    const merged: ServerTicketEnrichmentRecord = {
      id: ticketId,
      ticketNumber: String(ticket.ticketNumber || existing?.ticketNumber || ticketId),
      userId: String(ticket.userId || existing?.userId || ''),
      userName: String(ticket.userName || existing?.userName || 'Customer'),
      userEmail: String(ticket.userEmail || existing?.userEmail || ''),
      category: String(ticket.category || existing?.category || 'General Enquiry'),
      subject: String(ticket.subject || existing?.subject || ''),
      description: String(ticket.description || existing?.description || ''),
      ...(ticket.priority || existing?.priority
        ? {
            priority:
              (ticket.priority || existing?.priority) === 'urgent'
                ? 'urgent'
                : 'normal',
          }
        : {}),
      status: (ticket.status || existing?.status || 'open') as ServerTicketStatus,
      bookingId: String(ticket.bookingId ?? existing?.bookingId ?? ''),
      productId: String(ticket.productId ?? existing?.productId ?? ''),
      assignedTo:
        ticket.assignedTo !== undefined
          ? ticket.assignedTo
          : existing?.assignedTo ?? null,
      assignedStaffName: String(
        ticket.assignedStaffName ?? existing?.assignedStaffName ?? ''
      ),
      assignedToEmail: String(
        ticket.assignedToEmail ?? existing?.assignedToEmail ?? ''
      ),
      claimedAtISO:
        ticket.claimedAtISO !== undefined
          ? ticket.claimedAtISO
          : existing?.claimedAtISO ?? null,
      firstResponseAtISO:
        ticket.firstResponseAtISO !== undefined
          ? ticket.firstResponseAtISO
          : existing?.firstResponseAtISO ?? null,
      resolvedAtISO:
        ticket.resolvedAtISO !== undefined
          ? ticket.resolvedAtISO
          : existing?.resolvedAtISO ?? null,
      closedAtISO:
        ticket.closedAtISO !== undefined
          ? ticket.closedAtISO
          : existing?.closedAtISO ?? null,
      reopenedAtISO:
        ticket.reopenedAtISO !== undefined
          ? ticket.reopenedAtISO
          : existing?.reopenedAtISO ?? null,
      reassignmentCount:
        typeof ticket.reassignmentCount === 'number'
          ? ticket.reassignmentCount
          : existing?.reassignmentCount ?? 0,
      resolutionSummary: String(
        ticket.resolutionSummary ?? existing?.resolutionSummary ?? ''
      ),
      internalNotes: String(
        ticket.internalNotes ?? existing?.internalNotes ?? ''
      ),
      attachments: Array.isArray(ticket.attachments)
        ? ticket.attachments
        : existing?.attachments || [],
      emailOpenedStatus:
        ticket.emailOpenedStatus || existing?.emailOpenedStatus || 'pending',
      emailOpenedSentAtISO:
        ticket.emailOpenedSentAtISO || existing?.emailOpenedSentAtISO,
      emailOpenedError:
        ticket.emailOpenedError !== undefined
          ? String(ticket.emailOpenedError)
          : existing?.emailOpenedError,
      emailClosedStatus:
        ticket.emailClosedStatus || existing?.emailClosedStatus,
      emailClosedSentAtISO:
        ticket.emailClosedSentAtISO || existing?.emailClosedSentAtISO,
      emailClosedError:
        ticket.emailClosedError !== undefined
          ? String(ticket.emailClosedError)
          : existing?.emailClosedError,
      createdAtISO: String(
        ticket.createdAtISO || existing?.createdAtISO || new Date().toISOString()
      ),
      updatedAtISO: new Date().toISOString(),
    };

    supportStore.tickets[ticketId] = merged;

    if (initialMessage && initialMessage.id) {
      const list = supportStore.messagesByTicket[ticketId] || [];
      if (!list.some((m) => m.id === initialMessage.id)) {
        list.push(initialMessage);
        supportStore.messagesByTicket[ticketId] = list;
      }
    }

    if (historyEvent && historyEvent.id) {
      const list = supportStore.historyByTicket[ticketId] || [];
      if (!list.some((h) => h.id === historyEvent.id)) {
        list.unshift(historyEvent);
        supportStore.historyByTicket[ticketId] = list;
      }
    }

    if (notification && notification.id) {
      if (!supportStore.notifications.some((n) => n.id === notification.id)) {
        supportStore.notifications.unshift(notification);
      }
    }

    savePersistedStore();
    res.json({ ok: true, ticket: merged });
  });

  // 3. Atomic Server-Side Ticket Claiming Endpoint (Prevents simultaneous claiming race conditions)
  app.post('/api/support/claim-ticket', (req: Request, res: Response) => {
    const {
      ticketId = '',
      staffUid = '',
      staffName = '',
      staffEmail = '',
      staffRole = '',
      currentAssignedTo = null,
      currentAssignedStaffName = '',
    } = req.body || {};

    const cleanTicketId = String(ticketId).trim();
    if (!cleanTicketId) {
      res.status(400).json({ claimed: false, error: 'Ticket ID is required.' });
      return;
    }

    // Immediate atomic mutex check for simultaneous in-flight claims
    if (activeClaimMutex.has(cleanTicketId)) {
      res.status(409).json({
        claimed: false,
        error:
          'Another support staff member is claiming this ticket right now. Simultaneous claim blocked.',
      });
      return;
    }

    activeClaimMutex.add(cleanTicketId);

    try {
      const storedTicket = supportStore.tickets[cleanTicketId];
      const effectiveAssignedTo =
        storedTicket?.assignedTo || currentAssignedTo || null;
      const effectiveAssignedName =
        storedTicket?.assignedStaffName || currentAssignedStaffName || '';

      const validation = validateTicketClaimAttempt({
        ticketId: cleanTicketId,
        existingAssignedTo: effectiveAssignedTo,
        existingAssignedStaffName: effectiveAssignedName,
        staffUid: String(staffUid).trim(),
        staffName: String(staffName).trim(),
        staffEmail: String(staffEmail).trim(),
        staffRole: String(staffRole).trim(),
      });

      if (!validation.allowed) {
        res.status(validation.statusCode).json({
          claimed: false,
          error: validation.error,
        });
        return;
      }

      const claimedAtISO = new Date().toISOString();

      const {
        ticketNumber = '',
        ticketUserId = '',
        ticketUserName = '',
        ticketUserEmail = '',
        ticketSubject = '',
        ticketDescription = '',
        ticketCategory = 'General Enquiry',
      } = req.body || {};

      if (storedTicket) {
        storedTicket.assignedTo = String(staffUid).trim();
        storedTicket.assignedStaffName = String(staffName).trim();
        storedTicket.assignedToEmail = String(staffEmail).trim();
        storedTicket.claimedAtISO = claimedAtISO;
        storedTicket.status = 'in_progress';
        storedTicket.updatedAtISO = claimedAtISO;
        if (!storedTicket.userId && ticketUserId) {
          storedTicket.userId = String(ticketUserId).trim();
        }
        if (
          (!storedTicket.userName || storedTicket.userName === 'Customer') &&
          ticketUserName
        ) {
          storedTicket.userName = String(ticketUserName).trim();
        }
        if (!storedTicket.userEmail && ticketUserEmail) {
          storedTicket.userEmail = String(ticketUserEmail).trim();
        }
        if (!storedTicket.subject && ticketSubject) {
          storedTicket.subject = String(ticketSubject).trim();
        }
      } else {
        supportStore.tickets[cleanTicketId] = {
          id: cleanTicketId,
          ticketNumber: String(ticketNumber || cleanTicketId).trim(),
          userId: String(ticketUserId || '').trim(),
          userName: String(ticketUserName || 'Customer').trim(),
          userEmail: String(ticketUserEmail || '').trim(),
          category: String(ticketCategory || 'General Enquiry').trim(),
          subject: String(ticketSubject || '').trim(),
          description: String(ticketDescription || '').trim(),
          status: 'in_progress',
          bookingId: '',
          productId: '',
          assignedTo: String(staffUid).trim(),
          assignedStaffName: String(staffName).trim(),
          assignedToEmail: String(staffEmail).trim(),
          claimedAtISO,
          reassignmentCount: 0,
          resolutionSummary: '',
          internalNotes: '',
          attachments: [],
          createdAtISO: claimedAtISO,
          updatedAtISO: claimedAtISO,
        };
      }

      const claimEvent: ServerSupportHistoryEvent = {
        id: `HIS-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ticketId: cleanTicketId,
        action: 'claimed',
        actorId: String(staffUid).trim(),
        actorName: String(staffName).trim(),
        actorEmail: String(staffEmail).trim(),
        actorRole: String(staffRole).trim(),
        previousValue: 'Unclaimed (open)',
        newValue: `${staffName} (in_progress)`,
        summary: `Ticket claimed by ${staffName} (${staffEmail}). Status changed to In Progress.`,
        createdAtISO: claimedAtISO,
      };

      const historyList = supportStore.historyByTicket[cleanTicketId] || [];
      historyList.unshift(claimEvent);
      supportStore.historyByTicket[cleanTicketId] = historyList;

      const auditLog: ServerAdminAuditLog = {
        id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        adminId: String(staffUid).trim(),
        adminEmail: String(staffEmail).trim(),
        adminRole: String(staffRole).trim(),
        action: 'Claimed Support Ticket',
        targetType: 'support_ticket',
        targetId: cleanTicketId,
        targetLabel: `${
          supportStore.tickets[cleanTicketId]?.ticketNumber || cleanTicketId
        }: ${supportStore.tickets[cleanTicketId]?.subject || 'Support Ticket'}`,
        previousValue: 'Unclaimed (open)',
        newValue: `${staffName} (in_progress)`,
        isOverride: false,
        createdAtISO: claimedAtISO,
      };
      supportStore.auditLogs.unshift(auditLog);

      const customerUid = supportStore.tickets[cleanTicketId]?.userId;
      if (customerUid) {
        supportStore.notifications.unshift({
          id: `NOTIF-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          recipientUid: customerUid,
          ticketId: cleanTicketId,
          ticketNumber:
            supportStore.tickets[cleanTicketId]?.ticketNumber || cleanTicketId,
          type: 'ticket_claimed',
          title: 'Support Ticket Claimed',
          message: `${staffName} has taken responsibility for your ticket (${
            supportStore.tickets[cleanTicketId]?.ticketNumber || cleanTicketId
          }) and it is now In Progress.`,
          read: false,
          createdAtISO: claimedAtISO,
        });
      }

      savePersistedStore();

      res.json({
        claimed: true,
        ticketId: cleanTicketId,
        assignedTo: String(staffUid).trim(),
        assignedStaffName: String(staffName).trim(),
        assignedToEmail: String(staffEmail).trim(),
        claimedAtISO,
        status: 'in_progress',
        historyEvent: claimEvent,
        auditLog,
      });
    } finally {
      activeClaimMutex.delete(cleanTicketId);
    }
  });

  // 4. Add Message or Internal Note to Ticket
  app.post(
    '/api/support/tickets/:ticketId/message',
    (req: Request, res: Response) => {
      const ticketId = String(req.params.ticketId || '').trim();
      const {
        messageId = '',
        senderId = '',
        senderName = '',
        senderEmail = '',
        senderRole = 'customer',
        actorAdminRole = '',
        message = '',
        attachments = [],
        isInternal = false,
        currentAssignedTo = null,
        ticketUserId = '',
        ticketUserName = '',
        ticketUserEmail = '',
        ticketSubject = '',
        ticketNumber = '',
        ticketCategory = 'General Enquiry',
      } = req.body || {};

      const cleanMessageText = String(message || '').trim();
      const normalizedAttachments: ServerSupportAttachment[] = Array.isArray(
        attachments
      )
        ? attachments
        : [];

      if (
        !ticketId ||
        (!cleanMessageText && normalizedAttachments.length === 0)
      ) {
        res.status(400).json({ error: 'Ticket ID and message are required.' });
        return;
      }

      if (normalizedAttachments.length > MAX_SUPPORT_ATTACHMENTS_PER_TICKET) {
        res.status(400).json({
          error: `Maximum ${MAX_SUPPORT_ATTACHMENTS_PER_TICKET} attachments allowed per message.`,
        });
        return;
      }

      let stored = supportStore.tickets[ticketId];
      if (!stored && (ticketUserId || senderRole === 'customer')) {
        const createdIso = new Date().toISOString();
        stored = {
          id: ticketId,
          ticketNumber: String(ticketNumber || ticketId),
          userId: String(
            ticketUserId || (senderRole === 'customer' ? senderId : '')
          ),
          userName: String(
            ticketUserName ||
              (senderRole === 'customer' ? senderName : 'Customer')
          ),
          userEmail: String(
            ticketUserEmail || (senderRole === 'customer' ? senderEmail : '')
          ),
          category: String(ticketCategory || 'General Enquiry'),
          subject: String(ticketSubject || 'Support Request'),
          description: cleanMessageText,
          status: currentAssignedTo ? 'in_progress' : 'open',
          bookingId: '',
          productId: '',
          assignedTo: currentAssignedTo ? String(currentAssignedTo) : null,
          assignedStaffName: '',
          assignedToEmail: '',
          reassignmentCount: 0,
          resolutionSummary: '',
          internalNotes: '',
          attachments: [],
          createdAtISO: createdIso,
          updatedAtISO: createdIso,
        };
        supportStore.tickets[ticketId] = stored;
      } else if (stored) {
        if (!stored.userId && ticketUserId) {
          stored.userId = String(ticketUserId);
        }
        if (
          (!stored.userName || stored.userName === 'Customer') &&
          ticketUserName
        ) {
          stored.userName = String(ticketUserName);
        }
        if (!stored.userEmail && ticketUserEmail) {
          stored.userEmail = String(ticketUserEmail);
        }
        if (!stored.subject && ticketSubject) {
          stored.subject = String(ticketSubject);
        }
      }

      const effectiveAssignedTo =
        stored?.assignedTo !== undefined && stored?.assignedTo !== null
          ? stored.assignedTo
          : currentAssignedTo;

      // Customers can never post internal notes
      if (senderRole === 'customer' && isInternal) {
        res.status(403).json({
          error: 'Customers cannot create internal staff notes.',
        });
        return;
      }

      // If staff/admin is replying or adding internal note, verify ownership or admin override authority
      if (senderRole !== 'customer') {
        const authCheck = validateTicketModificationAuthority({
          assignedTo: effectiveAssignedTo,
          actorUid: String(senderId),
          actorRole: String(actorAdminRole || senderRole),
          actorEmail: String(senderEmail),
          isOverrideAction: false,
        });
        if (!authCheck.allowed) {
          res.status(authCheck.statusCode).json({ error: authCheck.error });
          return;
        }
      }

      const nowISO = new Date().toISOString();
      const resolvedMsgId =
        String(messageId || '').trim() ||
        `MSG-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      const msgRecord: ServerSupportMessage = {
        id: resolvedMsgId,
        ticketId,
        senderId: String(senderId),
        senderName: String(senderName || 'User'),
        senderEmail: String(senderEmail || ''),
        senderRole:
          senderRole === 'customer'
            ? 'customer'
            : canRoleOverrideTicketOwnership(actorAdminRole, senderEmail)
            ? 'admin'
            : 'staff',
        message:
          cleanMessageText ||
          `Attached ${normalizedAttachments.length} file(s)`,
        attachments: normalizedAttachments,
        isInternal: senderRole === 'customer' ? false : Boolean(isInternal),
        createdAtISO: nowISO,
      };

      const list = supportStore.messagesByTicket[ticketId] || [];
      const existingIdx = list.findIndex((m) => m.id === msgRecord.id);
      if (existingIdx >= 0) {
        list[existingIdx] = msgRecord;
      } else {
        list.push(msgRecord);
      }
      supportStore.messagesByTicket[ticketId] = list;

      if (stored) {
        stored.updatedAtISO = nowISO;
        if (msgRecord.isInternal) {
          const timestampLabel = new Date(nowISO).toLocaleString('en-IN', {
            dateStyle: 'short',
            timeStyle: 'short',
          });
          stored.internalNotes = stored.internalNotes
            ? `${stored.internalNotes}\n[${timestampLabel} - ${senderName}]: ${cleanMessageText}`
            : `[${timestampLabel} - ${senderName}]: ${cleanMessageText}`;
        } else if (senderRole !== 'customer' && !stored.firstResponseAtISO) {
          stored.firstResponseAtISO = nowISO;
        } else if (
          senderRole === 'customer' &&
          stored.status === 'waiting_for_user'
        ) {
          stored.status = 'in_progress';
        }
      }

      const historyEvent: ServerSupportHistoryEvent = {
        id: `HIS-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ticketId,
        action: msgRecord.isInternal ? 'internal_note_added' : 'replied',
        actorId: String(senderId),
        actorName: String(senderName),
        actorEmail: String(senderEmail),
        actorRole: String(actorAdminRole || senderRole),
        summary: msgRecord.isInternal
          ? `Internal staff note added by ${senderName}.`
          : `${
              senderRole === 'customer' ? 'Customer' : 'Support staff'
            } (${senderName}) posted a reply.`,
        createdAtISO: nowISO,
      };

      const historyList = supportStore.historyByTicket[ticketId] || [];
      historyList.unshift(historyEvent);
      supportStore.historyByTicket[ticketId] = historyList;

      // Dispatch in-app notification for non-internal replies
      if (!msgRecord.isInternal && stored) {
        if (senderRole !== 'customer' && stored.userId) {
          supportStore.notifications.unshift({
            id: `NOTIF-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            recipientUid: stored.userId,
            ticketId,
            ticketNumber: stored.ticketNumber || ticketId,
            type: 'staff_replied',
            title: `New Support Reply (${stored.ticketNumber || ticketId})`,
            message: `${senderName} replied to your support ticket "${stored.subject}".`,
            read: false,
            createdAtISO: nowISO,
          });
        } else if (senderRole === 'customer') {
          supportStore.notifications.unshift({
            id: `NOTIF-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            recipientUid: stored.assignedTo || 'ALL_SUPPORT_STAFF',
            ticketId,
            ticketNumber: stored.ticketNumber || ticketId,
            type: 'customer_replied',
            title: `Customer Replied (${stored.ticketNumber || ticketId})`,
            message: `${senderName} replied on ticket "${stored.subject}".`,
            read: false,
            createdAtISO: nowISO,
          });
        }
      }

      savePersistedStore();
      res.json({
        ok: true,
        message: msgRecord,
        historyEvent,
        ticket: stored,
      });
    }
  );

  // 5. Update Ticket Status, Priority, Resolution Summary, or Perform Admin Override (Reassign / Release Claim / Reopen)
  app.post(
    '/api/support/tickets/:ticketId/update',
    (req: Request, res: Response) => {
      const ticketId = String(req.params.ticketId || '').trim();
      const {
        actorUid = '',
        actorName = '',
        actorEmail = '',
        actorRole = '',
        operation = 'status_change', // 'status_change' | 'priority_change' | 'reassign' | 'release_claim' | 'reopen' | 'update_notes'
        newStatus,
        newPriority,
        newAssignedTo,
        newAssignedStaffName,
        newAssignedToEmail,
        resolutionSummary,
        internalNotes,
        currentAssignedTo,
      } = req.body || {};

      const stored = supportStore.tickets[ticketId];
      const effectiveAssignedTo =
        stored?.assignedTo !== undefined ? stored.assignedTo : currentAssignedTo;

      const isOverrideOperation = [
        'reassign',
        'release_claim',
        'reopen',
      ].includes(operation);

      const authCheck = validateTicketModificationAuthority({
        assignedTo: effectiveAssignedTo,
        actorUid: String(actorUid),
        actorRole: String(actorRole),
        actorEmail: String(actorEmail),
        isOverrideAction: isOverrideOperation,
      });

      if (!authCheck.allowed) {
        res.status(authCheck.statusCode).json({ error: authCheck.error });
        return;
      }

      // Closing a ticket requires a resolution summary
      if (newStatus === 'closed') {
        const effectiveSummary = String(
          resolutionSummary ?? stored?.resolutionSummary ?? ''
        ).trim();
        if (effectiveSummary.length < 5) {
          res.status(400).json({
            error:
              'A clear Resolution Summary (at least 5 characters) is required before closing a ticket.',
          });
          return;
        }
      }

      const nowISO = new Date().toISOString();
      let historyAction: ServerSupportHistoryEvent['action'] = 'status_changed';
      let previousVal = '';
      let newVal = '';
      let summaryText = '';

      if (stored) {
        if (operation === 'reassign') {
          previousVal = stored.assignedStaffName || 'Unclaimed';
          stored.assignedTo = newAssignedTo || null;
          stored.assignedStaffName = String(newAssignedStaffName || '');
          stored.assignedToEmail = String(newAssignedToEmail || '');
          stored.claimedAtISO = nowISO;
          stored.reassignmentCount = (stored.reassignmentCount || 0) + 1;
          if (stored.status === 'open') {
            stored.status = 'in_progress';
          }
          newVal = stored.assignedStaffName || 'Unclaimed';
          historyAction = 'reassigned';
          summaryText = `Administrator ${actorName} reassigned ticket from ${previousVal} to ${newVal}.`;

          if (stored.assignedTo) {
            supportStore.notifications.unshift({
              id: `NOTIF-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              recipientUid: stored.assignedTo,
              ticketId,
              ticketNumber: stored.ticketNumber,
              type: 'ticket_reassigned',
              title: `Ticket Assigned to You (${stored.ticketNumber})`,
              message: `Administrator ${actorName} assigned ticket "${stored.subject}" to you.`,
              read: false,
              createdAtISO: nowISO,
            });
          }
        } else if (operation === 'release_claim') {
          previousVal = stored.assignedStaffName || 'Claimed';
          stored.assignedTo = null;
          stored.assignedStaffName = '';
          stored.assignedToEmail = '';
          stored.claimedAtISO = null;
          stored.status = 'open';
          newVal = 'Unclaimed (Open)';
          historyAction = 'claim_released';
          summaryText = `Administrator ${actorName} released staff claim (${previousVal}). Ticket returned to Unclaimed queue.`;
        } else if (operation === 'reopen') {
          previousVal = stored.status;
          stored.status = stored.assignedTo ? 'in_progress' : 'open';
          stored.reopenedAtISO = nowISO;
          newVal = stored.status;
          historyAction = 'reopened';
          summaryText = `Administrator ${actorName} reopened ticket from ${previousVal} to ${newVal}.`;

          supportStore.notifications.unshift({
            id: `NOTIF-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            recipientUid: stored.assignedTo || 'ALL_SUPPORT_STAFF',
            ticketId,
            ticketNumber: stored.ticketNumber,
            type: 'ticket_reopened',
            title: `Ticket Reopened (${stored.ticketNumber})`,
            message: `Ticket "${stored.subject}" was reopened by ${actorName}.`,
            read: false,
            createdAtISO: nowISO,
          });
        } else if (operation === 'update_notes') {
          previousVal = 'Internal notes';
          if (typeof internalNotes === 'string') {
            stored.internalNotes = internalNotes;
          }
          if (typeof resolutionSummary === 'string') {
            stored.resolutionSummary = resolutionSummary;
          }
          newVal = 'Updated';
          historyAction = 'internal_note_added';
          summaryText = `Internal notes / resolution summary updated by ${actorName}.`;
        } else if (newStatus) {
          previousVal = stored.status;
          stored.status = newStatus as ServerTicketStatus;
          if (typeof resolutionSummary === 'string' && resolutionSummary.trim()) {
            stored.resolutionSummary = resolutionSummary.trim();
          }
          if (newStatus === 'resolved') {
            stored.resolvedAtISO = nowISO;
            historyAction = 'resolved';
          } else if (newStatus === 'closed') {
            stored.closedAtISO = nowISO;
            if (!stored.resolvedAtISO) stored.resolvedAtISO = nowISO;
            historyAction = 'closed';
          } else {
            historyAction = 'status_changed';
          }
          newVal = newStatus;
          summaryText = `Status changed from ${previousVal} to ${newVal} by ${actorName}.`;

          if (stored.userId) {
            const notifType =
              newStatus === 'waiting_for_user'
                ? 'status_waiting_for_user'
                : newStatus === 'resolved'
                ? 'ticket_resolved'
                : newStatus === 'closed'
                ? 'ticket_closed'
                : null;
            if (notifType) {
              supportStore.notifications.unshift({
                id: `NOTIF-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                recipientUid: stored.userId,
                ticketId,
                ticketNumber: stored.ticketNumber,
                type: notifType,
                title: `Ticket Status Updated: ${newStatus
                  .replace(/_/g, ' ')
                  .toUpperCase()}`,
                message: `Your ticket ${stored.ticketNumber} ("${stored.subject}") is now ${newStatus.replace(
                  /_/g,
                  ' '
                )}.`,
                read: false,
                createdAtISO: nowISO,
              });
            }
          }
        }
        stored.updatedAtISO = nowISO;
      }

      const historyEvent: ServerSupportHistoryEvent = {
        id: `HIS-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ticketId,
        action: historyAction,
        actorId: String(actorUid),
        actorName: String(actorName),
        actorEmail: String(actorEmail),
        actorRole: String(actorRole),
        previousValue: previousVal,
        newValue: newVal,
        summary: summaryText || `Ticket updated by ${actorName}.`,
        createdAtISO: nowISO,
      };

      const historyList = supportStore.historyByTicket[ticketId] || [];
      historyList.unshift(historyEvent);
      supportStore.historyByTicket[ticketId] = historyList;

      const isCrossStaffAdminOverride =
        isOverrideOperation ||
        Boolean(effectiveAssignedTo && effectiveAssignedTo !== String(actorUid));

      const auditActionLabel =
        operation === 'reassign'
          ? 'Reassigned Support Ticket (Admin Override)'
          : operation === 'release_claim'
          ? 'Released Ticket Claim (Admin Override)'
          : operation === 'reopen'
          ? 'Reopened Support Ticket (Admin Override)'
          : `Updated Ticket Status to ${String(newVal || newStatus || '').toUpperCase()}${
              isCrossStaffAdminOverride ? ' (Admin Override)' : ''
            }`;

      const auditLog: ServerAdminAuditLog = {
        id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        adminId: String(actorUid),
        adminEmail: String(actorEmail),
        adminRole: String(actorRole),
        action: auditActionLabel,
        targetType: 'support_ticket',
        targetId: ticketId,
        targetLabel: `${stored?.ticketNumber || ticketId}: ${
          stored?.subject || 'Support Ticket'
        }`,
        previousValue: previousVal,
        newValue: newVal,
        isOverride: isCrossStaffAdminOverride,
        createdAtISO: nowISO,
      };
      supportStore.auditLogs.unshift(auditLog);

      savePersistedStore();
      res.json({
        ok: true,
        ticket: stored,
        historyEvent,
        auditLog,
      });
    }
  );

  // 6. Mandatory Backend Email Notification Endpoint (Strictly TICKET_OPENED & TICKET_CLOSED with Idempotency & Retry)
  app.post('/api/support/send-email', async (req: Request, res: Response) => {
    const {
      ticketId = '',
      ticketNumber = '',
      eventType = '', // Strictly 'TICKET_OPENED' | 'TICKET_CLOSED'
      customerName = 'Customer',
      customerEmail = '',
      subject = '',
      category = 'General Enquiry',
      priority = 'normal',
      description = '',
      assignedStaffName = 'BorrowBox Support Team',
      resolutionSummary = '',
      closedAtISO = new Date().toISOString(),
      forceRetry = false,
    } = req.body || {};

    if (!isAllowedSupportEmailEvent(eventType)) {
      res.status(400).json({
        sent: false,
        error:
          'Invalid email eventType. Emails are only sent for TICKET_OPENED (ticket created) and TICKET_CLOSED (admin closes ticket).',
      });
      return;
    }

    const cleanTicketId = String(ticketId || ticketNumber).trim();
    const cleanTicketNumber = String(ticketNumber || ticketId).trim();
    if (!cleanTicketId || !customerEmail) {
      res.status(400).json({
        sent: false,
        error: 'ticketId and customerEmail are required for email notifications.',
      });
      return;
    }

    const idempotencyKey = `${cleanTicketId}:${eventType}`;
    const existingLog = supportStore.emailLogs[idempotencyKey];

    // Idempotency guard: never send duplicate emails for the same ticket event unless admin retries
    if (existingLog && existingLog.status === 'sent' && !forceRetry) {
      res.json({
        sent: true,
        idempotentDuplicateSkipped: true,
        emailLog: existingLog,
      });
      return;
    }

    const emailPayload =
      eventType === 'TICKET_CLOSED'
        ? buildTicketClosedEmailPayload({
            ticketNumber: cleanTicketNumber,
            customerName: String(customerName),
            customerEmail: String(customerEmail),
            subject: String(subject),
            assignedStaffName: String(assignedStaffName),
            resolutionSummary:
              String(resolutionSummary) ||
              'Your support request has been resolved by our team.',
            closedAtISO: String(closedAtISO),
          })
        : buildTicketOpenedEmailPayload({
            ticketNumber: cleanTicketNumber,
            customerName: String(customerName),
            customerEmail: String(customerEmail),
            subject: String(subject),
            category: String(category),
            description: String(description),
          });

    const dispatchResult = await dispatchTransactionalEmail({
      recipientEmail: String(customerEmail).trim(),
      recipientName: String(customerName).trim(),
      subject: emailPayload.subject,
      textBody: emailPayload.textBody,
      htmlBody: emailPayload.htmlBody,
    });

    const nowISO = new Date().toISOString();
    const logRecord: ServerEmailDeliveryLog = {
      id: existingLog?.id || `EML-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      idempotencyKey,
      ticketId: cleanTicketId,
      ticketNumber: cleanTicketNumber,
      eventType,
      fromEmail: dispatchResult.fromEmail,
      replyToEmail: dispatchResult.replyToEmail,
      recipientEmail: String(customerEmail).trim(),
      recipientName: String(customerName).trim(),
      subject: emailPayload.subject,
      textBody: emailPayload.textBody,
      htmlBody: emailPayload.htmlBody,
      status: dispatchResult.status,
      provider: dispatchResult.provider,
      providerMessageId: dispatchResult.providerMessageId,
      sentAtISO: nowISO,
      errorMessage: dispatchResult.errorMessage,
      retryCount: existingLog ? existingLog.retryCount + 1 : 0,
    };

    supportStore.emailLogs[idempotencyKey] = logRecord;

    const storedTicket = supportStore.tickets[cleanTicketId];
    if (storedTicket) {
      if (eventType === 'TICKET_OPENED') {
        storedTicket.emailOpenedStatus = dispatchResult.status;
        storedTicket.emailOpenedSentAtISO = nowISO;
        storedTicket.emailOpenedError = dispatchResult.errorMessage || '';
      } else {
        storedTicket.emailClosedStatus = dispatchResult.status;
        storedTicket.emailClosedSentAtISO = nowISO;
        storedTicket.emailClosedError = dispatchResult.errorMessage || '';
      }
    }

    const historyEvent: ServerSupportHistoryEvent = {
      id: `HIS-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ticketId: cleanTicketId,
      action: dispatchResult.status === 'sent' ? 'email_sent' : 'email_failed',
      actorId: 'system_mailer',
      actorName: 'BorrowBox Email Service',
      actorEmail: dispatchResult.fromEmail,
      actorRole: 'system',
      previousValue: eventType,
      newValue: `${dispatchResult.status} (${dispatchResult.provider}${
        dispatchResult.providerMessageId
          ? `:${dispatchResult.providerMessageId}`
          : ''
      })`,
      summary:
        dispatchResult.status === 'sent'
          ? `Automated ${
              eventType === 'TICKET_OPENED' ? 'Ticket Opened' : 'Ticket Closed'
            } email dispatched to ${customerEmail} (${emailPayload.subject}).`
          : `Automated ${eventType} email failed for ${customerEmail}: ${dispatchResult.errorMessage}`,
      createdAtISO: nowISO,
    };

    const historyList = supportStore.historyByTicket[cleanTicketId] || [];
    historyList.unshift(historyEvent);
    supportStore.historyByTicket[cleanTicketId] = historyList;

    savePersistedStore();

    res.json({
      sent: dispatchResult.status === 'sent',
      idempotentDuplicateSkipped: false,
      emailLog: logRecord,
      historyEvent,
    });
  });

  // 7. Mark In-App Support Notification as Read
  app.post('/api/support/notifications/read', (req: Request, res: Response) => {
    const { notificationId = '', recipientUid = '' } = req.body || {};
    let updatedCount = 0;
    for (const notif of supportStore.notifications) {
      if (
        (notificationId && notif.id === notificationId) ||
        (!notificationId && recipientUid && notif.recipientUid === recipientUid)
      ) {
        notif.read = true;
        updatedCount += 1;
      }
    }
    savePersistedStore();
    res.json({ ok: true, updatedCount });
  });

  // 8. Upload Support Attachment (Validates MIME type & 5 MB size, persists file & returns storagePath + downloadUrl)
  app.post('/api/support/attachments', (req: Request, res: Response) => {
    const {
      fileName = '',
      contentType = '',
      sizeBytes = 0,
      base64Data = '',
      userId = 'member',
    } = req.body || {};

    const cleanFileName = String(fileName || 'attachment')
      .trim()
      .replace(/[^a-zA-Z0-9._-]/g, '_');

    const rawBase64 = String(base64Data || '').trim();
    const strippedBase64 = rawBase64.includes(',')
      ? rawBase64.split(',')[1]
      : rawBase64;

    if (!strippedBase64) {
      res.status(400).json({
        ok: false,
        error: 'Attachment file payload is missing or empty.',
      });
      return;
    }

    let fileBuffer: Buffer;
    try {
      fileBuffer = Buffer.from(strippedBase64, 'base64');
    } catch {
      res.status(400).json({
        ok: false,
        error: 'Invalid base64 encoding for uploaded file.',
      });
      return;
    }

    const effectiveSize =
      typeof sizeBytes === 'number' && sizeBytes > 0
        ? sizeBytes
        : fileBuffer.byteLength;

    const validation = validateSupportAttachmentInput({
      fileName: cleanFileName,
      contentType: String(contentType || ''),
      sizeBytes: effectiveSize,
    });

    if (!validation.valid) {
      res.status(400).json({
        ok: false,
        error: validation.error,
      });
      return;
    }

    if (fileBuffer.byteLength > MAX_SUPPORT_ATTACHMENT_BYTES) {
      res.status(400).json({
        ok: false,
        error: `File "${cleanFileName}" exceeds the maximum 5 MB size limit.`,
      });
      return;
    }

    ensureAttachmentsDir();
    const attachmentId = `ATT-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`;
    const diskFileName = `${attachmentId}_${cleanFileName}`;
    const diskFilePath = path.join(ATTACHMENTS_DIR_PATH, diskFileName);

    try {
      fs.writeFileSync(diskFilePath, fileBuffer);
    } catch {
      res.status(500).json({
        ok: false,
        error: 'Server failed to store attachment file. Please retry.',
      });
      return;
    }

    const cleanUserId = String(userId || 'member').replace(
      /[^a-zA-Z0-9_-]/g,
      '_'
    );
    const storagePath = `support_attachments/${cleanUserId}/${diskFileName}`;
    const downloadUrl = `/api/support/attachments/${encodeURIComponent(
      attachmentId
    )}/${encodeURIComponent(cleanFileName)}`;
    const uploadedAtISO = new Date().toISOString();

    const attachment: ServerSupportAttachment = {
      id: attachmentId,
      name: cleanFileName,
      url: downloadUrl,
      downloadUrl,
      storagePath,
      contentType: validation.normalizedContentType,
      sizeBytes: fileBuffer.byteLength,
      uploadedAtISO,
    };

    res.json({
      ok: true,
      attachment,
    });
  });

  // 9. Serve Support Attachment by ID and Filename
  app.get(
    '/api/support/attachments/:attachmentId/:fileName',
    (req: Request, res: Response) => {
      const attachmentId = String(req.params.attachmentId || '')
        .trim()
        .replace(/[^a-zA-Z0-9_-]/g, '');
      const rawFileName = String(req.params.fileName || 'attachment')
        .trim()
        .replace(/[^a-zA-Z0-9._-]/g, '_');

      if (!attachmentId) {
        res.status(404).json({ error: 'Attachment not found.' });
        return;
      }

      const diskFileName = `${attachmentId}_${rawFileName}`;
      const diskFilePath = path.join(ATTACHMENTS_DIR_PATH, diskFileName);

      if (!fs.existsSync(diskFilePath)) {
        res.status(404).json({ error: 'Attachment file not found.' });
        return;
      }

      const lower = rawFileName.toLowerCase();
      let contentType = 'application/octet-stream';
      if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
        contentType = 'image/jpeg';
      } else if (lower.endsWith('.png')) {
        contentType = 'image/png';
      } else if (lower.endsWith('.webp')) {
        contentType = 'image/webp';
      } else if (lower.endsWith('.pdf')) {
        contentType = 'application/pdf';
      }

      const isDownload = req.query.download === '1' || req.query.download === 'true';
      res.setHeader('Content-Type', contentType);
      res.setHeader(
        'Content-Disposition',
        `${isDownload ? 'attachment' : 'inline'}; filename="${rawFileName}"`
      );
      res.setHeader('Cache-Control', 'private, max-age=86400');

      const stream = fs.createReadStream(diskFilePath);
      stream.on('error', () => {
        if (!res.headersSent) {
          res.status(500).end('Error reading attachment');
        }
      });
      stream.pipe(res);
    }
  );
}
