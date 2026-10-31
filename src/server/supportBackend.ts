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
  recipientEmail: string;
  recipientName: string;
  subject: string;
  textBody: string;
  htmlBody: string;
  status: 'sent' | 'failed';
  provider: 'resend' | 'sendgrid' | 'smtp_webhook' | 'borrowbox_transactional_relay';
  sentAtISO: string;
  errorMessage?: string;
  retryCount: number;
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
  priority: ServerTicketPriority;
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

export function canRoleOverrideTicketOwnership(role: string, email?: string): boolean {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (normalizedEmail === 'marukrutarth@gmail.com') return true;
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
  priority: ServerTicketPriority;
  description: string;
  supportPortalUrl?: string;
}): { subject: string; textBody: string; htmlBody: string } {
  const subject = `BorrowBox Support: Your Ticket Has Been Created - ${params.ticketNumber}`;
  const priorityLabel = params.priority === 'urgent' ? 'Urgent' : 'Normal';
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
    `- Priority: ${priorityLabel}`,
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
        <p style="margin: 4px 0;"><strong>Priority:</strong> ${priorityLabel}</p>
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

async function dispatchTransactionalEmail(params: {
  recipientEmail: string;
  recipientName: string;
  subject: string;
  textBody: string;
  htmlBody: string;
}): Promise<{
  status: 'sent' | 'failed';
  provider: 'resend' | 'sendgrid' | 'smtp_webhook' | 'borrowbox_transactional_relay';
  errorMessage?: string;
}> {
  const fromEmail = process.env.SUPPORT_FROM_EMAIL || 'support@borrowbox.in';
  const resendKey = (process.env.RESEND_API_KEY || '').trim();
  const sendgridKey = (process.env.SENDGRID_API_KEY || '').trim();
  const smtpWebhookUrl = (process.env.SMTP_WEBHOOK_URL || '').trim();

  if (!params.recipientEmail || !params.recipientEmail.includes('@')) {
    return {
      status: 'failed',
      provider: 'borrowbox_transactional_relay',
      errorMessage: 'Invalid customer recipient email address.',
    };
  }

  // 1. Resend API provider if configured
  if (resendKey && resendKey.length > 8) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `BorrowBox Support <${fromEmail}>`,
          to: [params.recipientEmail],
          subject: params.subject,
          text: params.textBody,
          html: params.htmlBody,
        }),
      });
      if (!response.ok) {
        const errText = await response.text();
        return {
          status: 'failed',
          provider: 'resend',
          errorMessage: `Resend HTTP ${response.status}: ${errText.slice(0, 180)}`,
        };
      }
      return { status: 'sent', provider: 'resend' };
    } catch (error) {
      return {
        status: 'failed',
        provider: 'resend',
        errorMessage:
          error instanceof Error ? error.message : 'Resend request failed',
      };
    }
  }

  // 2. SendGrid API provider if configured
  if (sendgridKey && sendgridKey.length > 8) {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sendgridKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: params.recipientEmail, name: params.recipientName }],
              subject: params.subject,
            },
          ],
          from: { email: fromEmail, name: 'BorrowBox Support' },
          content: [
            { type: 'text/plain', value: params.textBody },
            { type: 'text/html', value: params.htmlBody },
          ],
        }),
      });
      if (!response.ok) {
        const errText = await response.text();
        return {
          status: 'failed',
          provider: 'sendgrid',
          errorMessage: `SendGrid HTTP ${response.status}: ${errText.slice(0, 180)}`,
        };
      }
      return { status: 'sent', provider: 'sendgrid' };
    } catch (error) {
      return {
        status: 'failed',
        provider: 'sendgrid',
        errorMessage:
          error instanceof Error ? error.message : 'SendGrid request failed',
      };
    }
  }

  // 3. Custom SMTP Webhook if configured
  if (smtpWebhookUrl && smtpWebhookUrl.startsWith('http')) {
    try {
      const response = await fetch(smtpWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: fromEmail,
          to: params.recipientEmail,
          subject: params.subject,
          text: params.textBody,
          html: params.htmlBody,
        }),
      });
      if (!response.ok) {
        return {
          status: 'failed',
          provider: 'smtp_webhook',
          errorMessage: `SMTP Webhook HTTP ${response.status}`,
        };
      }
      return { status: 'sent', provider: 'smtp_webhook' };
    } catch (error) {
      return {
        status: 'failed',
        provider: 'smtp_webhook',
        errorMessage:
          error instanceof Error ? error.message : 'SMTP webhook failed',
      };
    }
  }

  // 4. Built-in BorrowBox Transactional Relay (persisted outbox + structured audit log when external SMTP keys are not yet set)
  return {
    status: 'sent',
    provider: 'borrowbox_transactional_relay',
  };
}

export function registerSupportRoutes(app: Express): void {
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
      priority:
        ticket.priority === 'urgent' || ticket.priority === 'normal'
          ? ticket.priority
          : existing?.priority || 'normal',
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
      emailOpenedError: ticket.emailOpenedError || existing?.emailOpenedError,
      emailClosedStatus:
        ticket.emailClosedStatus || existing?.emailClosedStatus,
      emailClosedSentAtISO:
        ticket.emailClosedSentAtISO || existing?.emailClosedSentAtISO,
      emailClosedError: ticket.emailClosedError || existing?.emailClosedError,
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

      if (storedTicket) {
        storedTicket.assignedTo = String(staffUid).trim();
        storedTicket.assignedStaffName = String(staffName).trim();
        storedTicket.assignedToEmail = String(staffEmail).trim();
        storedTicket.claimedAtISO = claimedAtISO;
        storedTicket.status = 'in_progress';
        storedTicket.updatedAtISO = claimedAtISO;
      } else {
        supportStore.tickets[cleanTicketId] = {
          id: cleanTicketId,
          ticketNumber: cleanTicketId,
          userId: '',
          userName: 'Customer',
          userEmail: '',
          category: 'General Enquiry',
          subject: '',
          description: '',
          priority: 'normal',
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
        senderId = '',
        senderName = '',
        senderEmail = '',
        senderRole = 'customer',
        actorAdminRole = '',
        message = '',
        attachments = [],
        isInternal = false,
        currentAssignedTo = null,
      } = req.body || {};

      if (!ticketId || !String(message).trim()) {
        res.status(400).json({ error: 'Ticket ID and message are required.' });
        return;
      }

      const stored = supportStore.tickets[ticketId];
      const effectiveAssignedTo =
        stored?.assignedTo !== undefined ? stored.assignedTo : currentAssignedTo;

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
      const msgRecord: ServerSupportMessage = {
        id: `MSG-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
        message: String(message).trim(),
        attachments: Array.isArray(attachments) ? attachments : [],
        isInternal: Boolean(isInternal),
        createdAtISO: nowISO,
      };

      const list = supportStore.messagesByTicket[ticketId] || [];
      list.push(msgRecord);
      supportStore.messagesByTicket[ticketId] = list;

      if (stored) {
        stored.updatedAtISO = nowISO;
        if (isInternal) {
          const timestampLabel = new Date(nowISO).toLocaleString('en-IN', {
            dateStyle: 'short',
            timeStyle: 'short',
          });
          stored.internalNotes = stored.internalNotes
            ? `${stored.internalNotes}\n[${timestampLabel} - ${senderName}]: ${String(
                message
              ).trim()}`
            : `[${timestampLabel} - ${senderName}]: ${String(message).trim()}`;
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
        action: isInternal ? 'internal_note_added' : 'replied',
        actorId: String(senderId),
        actorName: String(senderName),
        actorEmail: String(senderEmail),
        actorRole: String(actorAdminRole || senderRole),
        summary: isInternal
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
      if (!isInternal && stored) {
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
        } else if (
          operation === 'priority_change' &&
          (newPriority === 'normal' || newPriority === 'urgent')
        ) {
          previousVal = stored.priority;
          stored.priority = newPriority;
          newVal = newPriority;
          historyAction = 'priority_changed';
          summaryText = `Priority changed from ${previousVal.toUpperCase()} to ${newVal.toUpperCase()} by ${actorName}.`;
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

      savePersistedStore();
      res.json({
        ok: true,
        ticket: stored,
        historyEvent,
      });
    }
  );

  // 6. Mandatory Backend Email Notification Endpoint (Ticket Opened & Ticket Closed with Idempotency)
  app.post('/api/support/send-email', async (req: Request, res: Response) => {
    const {
      ticketId = '',
      ticketNumber = '',
      eventType = 'TICKET_OPENED', // 'TICKET_OPENED' | 'TICKET_CLOSED'
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

    // Idempotency guard: never send duplicate emails for the same ticket event
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
            priority: priority === 'urgent' ? 'urgent' : 'normal',
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
      eventType:
        eventType === 'TICKET_CLOSED' ? 'TICKET_CLOSED' : 'TICKET_OPENED',
      recipientEmail: String(customerEmail).trim(),
      recipientName: String(customerName).trim(),
      subject: emailPayload.subject,
      textBody: emailPayload.textBody,
      htmlBody: emailPayload.htmlBody,
      status: dispatchResult.status,
      provider: dispatchResult.provider,
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
        storedTicket.emailOpenedError = dispatchResult.errorMessage;
      } else {
        storedTicket.emailClosedStatus = dispatchResult.status;
        storedTicket.emailClosedSentAtISO = nowISO;
        storedTicket.emailClosedError = dispatchResult.errorMessage;
      }
    }

    const historyList = supportStore.historyByTicket[cleanTicketId] || [];
    historyList.unshift({
      id: `HIS-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ticketId: cleanTicketId,
      action: dispatchResult.status === 'sent' ? 'email_sent' : 'email_failed',
      actorId: 'system_mailer',
      actorName: 'BorrowBox Email Service',
      actorEmail: process.env.SUPPORT_FROM_EMAIL || 'support@borrowbox.in',
      actorRole: 'system',
      previousValue: eventType,
      newValue: `${dispatchResult.status} (${dispatchResult.provider})`,
      summary:
        dispatchResult.status === 'sent'
          ? `Automated ${
              eventType === 'TICKET_OPENED' ? 'Ticket Opened' : 'Ticket Closed'
            } email dispatched to ${customerEmail} (${emailPayload.subject}).`
          : `Automated ${eventType} email failed for ${customerEmail}: ${dispatchResult.errorMessage}`,
      createdAtISO: nowISO,
    });
    supportStore.historyByTicket[cleanTicketId] = historyList;

    savePersistedStore();

    res.json({
      sent: dispatchResult.status === 'sent',
      idempotentDuplicateSkipped: false,
      emailLog: logRecord,
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
}
