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
    | 'internal_note_added';
  actorId: string;
  actorName: string;
  actorEmail: string;
  actorRole: string;
  previousValue?: string;
  newValue?: string;
  summary: string;
  createdAtISO: string;
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
  recipientRole: 'customer' | 'staff';
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
  resolutionSummary?: string;
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
  createdAtISO: string;
  updatedAtISO: string;
}

interface PersistedSupportStore {
  tickets: Record<string, ServerTicketEnrichmentRecord>;
  messagesByTicket: Record<string, ServerSupportMessage[]>;
  historyByTicket: Record<string, ServerSupportHistoryEvent[]>;
  notifications: ServerSupportNotification[];
  auditLogs: ServerAdminAuditLog[];
}

const STORE_FILE_PATH = path.join(process.cwd(), '.support-tickets-state.json');

// Active in-flight mutex locks per ticket ID to prevent simultaneous claiming race conditions
const activeClaimMutex = new Set<string>();

function normalizeStoredNotification(
  raw: Partial<ServerSupportNotification>
): ServerSupportNotification {
  const recipientUid = String(raw.recipientUid || '').trim();
  const inferredRole: 'customer' | 'staff' =
    raw.recipientRole === 'staff' ||
    raw.recipientRole === 'customer'
      ? raw.recipientRole
      : recipientUid === 'ALL_SUPPORT_STAFF' ||
        raw.type === 'ticket_created' ||
        raw.type === 'customer_replied' ||
        raw.type === 'ticket_reassigned' ||
        raw.type === 'ticket_reopened'
      ? 'staff'
      : 'customer';

  return {
    id: String(
      raw.id || `NOTIF-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    ),
    recipientUid,
    recipientRole: inferredRole,
    ticketId: String(raw.ticketId || ''),
    ticketNumber: String(raw.ticketNumber || raw.ticketId || ''),
    type: (raw.type || 'staff_replied') as ServerSupportNotification['type'],
    title: String(raw.title || 'Support Update'),
    message: String(raw.message || ''),
    ...(raw.resolutionSummary
      ? { resolutionSummary: String(raw.resolutionSummary) }
      : {}),
    read: Boolean(raw.read),
    createdAtISO: String(raw.createdAtISO || new Date().toISOString()),
  };
}

function loadPersistedStore(): PersistedSupportStore {
  try {
    if (fs.existsSync(STORE_FILE_PATH)) {
      const raw = fs.readFileSync(STORE_FILE_PATH, 'utf8');
      const parsed = JSON.parse(raw) as Partial<PersistedSupportStore>;
      return {
        tickets: parsed.tickets ?? {},
        messagesByTicket: parsed.messagesByTicket ?? {},
        historyByTicket: parsed.historyByTicket ?? {},
        notifications: Array.isArray(parsed.notifications)
          ? parsed.notifications.map((n) => normalizeStoredNotification(n))
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

export function canRoleOverrideTicketOwnership(
  role: string,
  email?: string
): boolean {
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

export function filterNotificationsForViewer(
  notifications: ServerSupportNotification[],
  viewerUid: string,
  viewerRole: string
): ServerSupportNotification[] {
  const cleanUid = String(viewerUid || '').trim();
  const isStaff = [
    'super_admin',
    'admin',
    'moderator',
    'support_admin',
    'staff',
  ].includes(String(viewerRole || '').trim());

  if (isStaff) {
    return notifications.filter(
      (n) =>
        n.recipientRole === 'staff' &&
        (n.recipientUid === cleanUid ||
          n.recipientUid === 'ALL_SUPPORT_STAFF' ||
          cleanUid === 'admin')
    );
  }

  if (!cleanUid) return [];
  return notifications.filter(
    (n) => n.recipientRole === 'customer' && n.recipientUid === cleanUid
  );
}

export function registerSupportRoutes(app: Express): void {
  // 0. Backend Support Configuration Status (Website-only in-app notifications; email removed)
  app.get('/api/support/config-status', (_req: Request, res: Response) => {
    const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
    res.json({
      ok: true,
      notificationMode: 'in_app_firestore',
      emailIntegrationRemoved: true,
      envConfigured: {
        GEMINI_API_KEY: Boolean(
          geminiKey && geminiKey.length > 10 && geminiKey !== 'MY_GEMINI_API_KEY'
        ),
      },
    });
  });

  // 1. Get synchronized server support state (filtered by role so customers never see internal notes or other users' tickets/notifications)
  app.get('/api/support/state', (req: Request, res: Response) => {
    const viewerUid = String(req.query.uid || '').trim();
    const viewerRole = String(req.query.role || 'customer').trim();
    const isStaff = [
      'super_admin',
      'admin',
      'moderator',
      'support_admin',
      'staff',
    ].includes(viewerRole);

    if (isStaff) {
      res.json({
        tickets: supportStore.tickets,
        messagesByTicket: supportStore.messagesByTicket,
        historyByTicket: supportStore.historyByTicket,
        auditLogs: supportStore.auditLogs,
        notifications: filterNotificationsForViewer(
          supportStore.notifications,
          viewerUid,
          viewerRole
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
      notifications: filterNotificationsForViewer(
        supportStore.notifications,
        viewerUid,
        'customer'
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
      ticketNumber: String(
        ticket.ticketNumber || existing?.ticketNumber || ticketId
      ),
      userId: String(ticket.userId || existing?.userId || ''),
      userName: String(ticket.userName || existing?.userName || 'Customer'),
      userEmail: String(ticket.userEmail || existing?.userEmail || ''),
      category: String(
        ticket.category || existing?.category || 'General Enquiry'
      ),
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
      status: (ticket.status ||
        existing?.status ||
        'open') as ServerTicketStatus,
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
      createdAtISO: String(
        ticket.createdAtISO ||
          existing?.createdAtISO ||
          new Date().toISOString()
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

    let createdNotification: ServerSupportNotification | undefined;
    if (notification && notification.id) {
      const normalizedNotif = normalizeStoredNotification({
        ...notification,
        recipientRole: notification.recipientRole || 'staff',
      });
      createdNotification = normalizedNotif;
      if (
        !supportStore.notifications.some((n) => n.id === normalizedNotif.id)
      ) {
        supportStore.notifications.unshift(normalizedNotif);
      }
    } else if (!existing) {
      // Automatically generate a staff notification when a new ticket is synced without an explicit notification object
      createdNotification = {
        id: `NOTIF-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        recipientUid: 'ALL_SUPPORT_STAFF',
        recipientRole: 'staff',
        ticketId,
        ticketNumber: merged.ticketNumber,
        type: 'ticket_created',
        title: `New Support Ticket (${merged.ticketNumber})`,
        message: `${merged.userName} created "${merged.subject}" (${merged.category}).`,
        read: false,
        createdAtISO: merged.createdAtISO,
      };
      supportStore.notifications.unshift(createdNotification);
    }

    savePersistedStore();
    res.json({
      ok: true,
      ticket: merged,
      notification: createdNotification,
    });
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

      let claimNotification: ServerSupportNotification | undefined;
      const customerUid = supportStore.tickets[cleanTicketId]?.userId;
      if (customerUid) {
        claimNotification = {
          id: `NOTIF-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          recipientUid: customerUid,
          recipientRole: 'customer',
          ticketId: cleanTicketId,
          ticketNumber:
            supportStore.tickets[cleanTicketId]?.ticketNumber || cleanTicketId,
          type: 'ticket_claimed',
          title: `Ticket Claimed (${
            supportStore.tickets[cleanTicketId]?.ticketNumber || cleanTicketId
          })`,
          message: `${staffName} has claimed your support ticket "${
            supportStore.tickets[cleanTicketId]?.subject || cleanTicketId
          }" and it is now In Progress.`,
          read: false,
          createdAtISO: claimedAtISO,
        };
        supportStore.notifications.unshift(claimNotification);
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
        notification: claimNotification,
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

      // Dispatch website in-app notification ONLY for public replies (never for internal notes)
      let createdNotification: ServerSupportNotification | undefined;
      if (!msgRecord.isInternal && stored) {
        const excerpt =
          msgRecord.message.length > 120
            ? `${msgRecord.message.slice(0, 117)}...`
            : msgRecord.message;

        if (senderRole !== 'customer' && stored.userId) {
          createdNotification = {
            id: `NOTIF-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            recipientUid: stored.userId,
            recipientRole: 'customer',
            ticketId,
            ticketNumber: stored.ticketNumber || ticketId,
            type: 'staff_replied',
            title: `New Support Reply (${stored.ticketNumber || ticketId})`,
            message: `${senderName} replied to "${stored.subject}": "${excerpt}"`,
            read: false,
            createdAtISO: nowISO,
          };
          supportStore.notifications.unshift(createdNotification);
        } else if (senderRole === 'customer') {
          createdNotification = {
            id: `NOTIF-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            recipientUid: stored.assignedTo || 'ALL_SUPPORT_STAFF',
            recipientRole: 'staff',
            ticketId,
            ticketNumber: stored.ticketNumber || ticketId,
            type: 'customer_replied',
            title: `Customer Replied (${stored.ticketNumber || ticketId})`,
            message: `${senderName} replied on "${stored.subject}": "${excerpt}"`,
            read: false,
            createdAtISO: nowISO,
          };
          supportStore.notifications.unshift(createdNotification);
        }
      }

      savePersistedStore();
      res.json({
        ok: true,
        message: msgRecord,
        historyEvent,
        ticket: stored,
        notification: createdNotification,
      });
    }
  );

  // 5. Update Ticket Status, Resolution Summary, or Perform Admin Override (Reassign / Release Claim / Reopen)
  app.post(
    '/api/support/tickets/:ticketId/update',
    (req: Request, res: Response) => {
      const ticketId = String(req.params.ticketId || '').trim();
      const {
        actorUid = '',
        actorName = '',
        actorEmail = '',
        actorRole = '',
        operation = 'status_change', // 'status_change' | 'reassign' | 'release_claim' | 'reopen' | 'update_notes'
        newStatus,
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
      let createdNotification: ServerSupportNotification | undefined;

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
            createdNotification = {
              id: `NOTIF-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              recipientUid: stored.assignedTo,
              recipientRole: 'staff',
              ticketId,
              ticketNumber: stored.ticketNumber,
              type: 'ticket_reassigned',
              title: `Ticket Assigned to You (${stored.ticketNumber})`,
              message: `Administrator ${actorName} assigned ticket "${stored.subject}" to you.`,
              read: false,
              createdAtISO: nowISO,
            };
            supportStore.notifications.unshift(createdNotification);
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

          createdNotification = {
            id: `NOTIF-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            recipientUid: stored.assignedTo || 'ALL_SUPPORT_STAFF',
            recipientRole: 'staff',
            ticketId,
            ticketNumber: stored.ticketNumber,
            type: 'ticket_reopened',
            title: `Ticket Reopened (${stored.ticketNumber})`,
            message: `Ticket "${stored.subject}" was reopened by ${actorName}.`,
            read: false,
            createdAtISO: nowISO,
          };
          supportStore.notifications.unshift(createdNotification);
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
          // Never create a customer notification for internal note updates
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
            if (newStatus === 'closed') {
              createdNotification = {
                id: `NOTIF-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                recipientUid: stored.userId,
                recipientRole: 'customer',
                ticketId,
                ticketNumber: stored.ticketNumber,
                type: 'ticket_closed',
                title: `Ticket Closed (${stored.ticketNumber})`,
                message: `Your ticket "${stored.subject}" has been closed by ${actorName}. Resolution Summary: ${stored.resolutionSummary}`,
                resolutionSummary: stored.resolutionSummary,
                read: false,
                createdAtISO: nowISO,
              };
              supportStore.notifications.unshift(createdNotification);
            } else if (
              newStatus === 'waiting_for_user' ||
              newStatus === 'resolved'
            ) {
              createdNotification = {
                id: `NOTIF-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                recipientUid: stored.userId,
                recipientRole: 'customer',
                ticketId,
                ticketNumber: stored.ticketNumber,
                type:
                  newStatus === 'waiting_for_user'
                    ? 'status_waiting_for_user'
                    : 'ticket_resolved',
                title: `Ticket Status Updated: ${newStatus
                  .replace(/_/g, ' ')
                  .toUpperCase()}`,
                message: `Your ticket ${stored.ticketNumber} ("${
                  stored.subject
                }") is now ${newStatus.replace(/_/g, ' ')}.${
                  newStatus === 'resolved' && stored.resolutionSummary
                    ? ` Resolution Summary: ${stored.resolutionSummary}`
                    : ''
                }`,
                ...(stored.resolutionSummary
                  ? { resolutionSummary: stored.resolutionSummary }
                  : {}),
                read: false,
                createdAtISO: nowISO,
              };
              supportStore.notifications.unshift(createdNotification);
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
          : `Updated Ticket Status to ${String(
              newVal || newStatus || ''
            ).toUpperCase()}${
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
        notification: createdNotification,
      });
    }
  );

  // 6. Mark In-App Support Notification(s) as Read
  app.post('/api/support/notifications/read', (req: Request, res: Response) => {
    const {
      notificationId = '',
      recipientUid = '',
      role = 'customer',
    } = req.body || {};
    const cleanNotifId = String(notificationId || '').trim();
    const cleanUid = String(recipientUid || '').trim();
    const isStaff = [
      'super_admin',
      'admin',
      'moderator',
      'support_admin',
      'staff',
    ].includes(String(role || '').trim());

    let updatedCount = 0;
    for (const notif of supportStore.notifications) {
      if (cleanNotifId) {
        if (notif.id === cleanNotifId) {
          // Verify customer cannot mark another customer's or staff's notification
          if (
            !isStaff &&
            cleanUid &&
            (notif.recipientUid !== cleanUid ||
              notif.recipientRole !== 'customer')
          ) {
            res.status(403).json({
              ok: false,
              error: 'Cannot modify another user notification.',
            });
            return;
          }
          notif.read = true;
          updatedCount += 1;
        }
      } else if (cleanUid) {
        if (
          isStaff &&
          notif.recipientRole === 'staff' &&
          (notif.recipientUid === cleanUid ||
            notif.recipientUid === 'ALL_SUPPORT_STAFF')
        ) {
          notif.read = true;
          updatedCount += 1;
        } else if (
          !isStaff &&
          notif.recipientRole === 'customer' &&
          notif.recipientUid === cleanUid
        ) {
          notif.read = true;
          updatedCount += 1;
        }
      }
    }
    savePersistedStore();
    res.json({ ok: true, updatedCount });
  });

  // 7. Upload Support Attachment (Validates MIME type & 5 MB size, persists file & returns storagePath + downloadUrl)
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

  // 8. Serve Support Attachment by ID and Filename
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

      const isDownload =
        req.query.download === '1' || req.query.download === 'true';
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
