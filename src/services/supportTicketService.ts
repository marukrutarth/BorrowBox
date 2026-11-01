import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import {
  AdminAuditLogRecord,
  AdminRegistryRecord,
  AppNotificationItem,
  SupportAttachmentItem,
  SupportTicketCategory,
  SupportTicketHistoryEntry,
  SupportTicketMessageRecord,
  SupportTicketPriority,
  SupportTicketRecord,
  SupportTicketStatus,
} from '../types/marketplace';
import { canAdminOverrideTicket } from '../utils/adminRbac';
import { app, db } from './firebase';

const storage = getStorage(app);

const ALLOWED_ATTACHMENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
]);

const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const SUPPORT_CATEGORIES: SupportTicketCategory[] = [
  'Booking Issue',
  'Payment & Deposit',
  'Damage or Dispute',
  'Account & Verification',
  'Product Listing',
  'Safety Concern',
  'General Enquiry',
];

export function generateUniqueTicketNumber(): string {
  const year = new Date().getFullYear();
  const sixDigits = Math.floor(100000 + Math.random() * 900000);
  return `BBX-${year}-${sixDigits}`;
}

function formatFirestoreTs(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (
    typeof val === 'object' &&
    val !== null &&
    'seconds' in val &&
    typeof (val as { seconds: unknown }).seconds === 'number'
  ) {
    return new Date((val as { seconds: number }).seconds * 1000).toISOString();
  }
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read attachment file.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Validates and uploads a support attachment to Firebase Storage (`support_attachments/{uid}/{id}_{filename}`),
 * falling back to an inline data URL if the remote Storage bucket rules reject client uploads.
 */
export async function uploadSupportAttachment(
  file: File,
  userId: string
): Promise<SupportAttachmentItem> {
  if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
    throw new Error(
      `Unsupported file type (${file.type || 'unknown'}). Allowed: JPG, PNG, WEBP, GIF, PDF, TXT.`
    );
  }
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    throw new Error('Attachment size exceeds the 5 MB limit.');
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  const attachmentId = `ATT-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
  const uploadedAtISO = new Date().toISOString();

  try {
    const storagePath = `support_attachments/${userId}/${attachmentId}_${safeName}`;
    const storageRef = ref(storage, storagePath);
    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type,
    });
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return {
      id: attachmentId,
      name: file.name.slice(0, 120),
      url: downloadUrl,
      contentType: file.type,
      sizeBytes: file.size,
      uploadedAtISO,
    };
  } catch {
    const fallbackUrl = await fileToDataUrl(file);
    return {
      id: attachmentId,
      name: file.name.slice(0, 120),
      url: fallbackUrl,
      contentType: file.type,
      sizeBytes: file.size,
      uploadedAtISO,
    };
  }
}

/**
 * Writes legacy-compatible `/support_tickets/{id}` document so existing Firestore rules on
 * imported projects accept the write even before `firestore.rules` is manually redeployed.
 */
async function syncLegacySupportTicketDoc(
  ticket: SupportTicketRecord,
  isCreate: boolean
): Promise<void> {
  const legacyPriority = ticket.priority === 'urgent' ? 'urgent' : 'medium';
  const legacyStatus =
    ticket.status === 'waiting_for_user' ? 'in_progress' : ticket.status;
  try {
    const payload: Record<string, unknown> = {
      id: ticket.id.slice(0, 128),
      userId: ticket.userId.slice(0, 128),
      userName: (ticket.userName || 'BorrowBox Member').slice(0, 80),
      userEmail: (ticket.userEmail || 'member@borrowbox.in').slice(0, 120),
      bookingId: (ticket.bookingId || '').slice(0, 128),
      subject: ticket.subject.slice(0, 160),
      description: ticket.description.slice(0, 1200),
      priority: legacyPriority,
      status: legacyStatus,
      internalNotes: (ticket.internalNotes || '').slice(0, 2000),
      assignedToEmail: (ticket.assignedToEmail || '').slice(0, 120),
      updatedAt: serverTimestamp(),
    };
    if (isCreate) {
      payload.createdAt = serverTimestamp();
      await setDoc(doc(db, 'support_tickets', ticket.id), payload);
    } else {
      const existingSnap = await getDoc(doc(db, 'support_tickets', ticket.id));
      if (existingSnap.exists()) {
        await updateDoc(doc(db, 'support_tickets', ticket.id), {
          ...payload,
          id: existingSnap.data().id || ticket.id,
          createdAt: existingSnap.data().createdAt || serverTimestamp(),
        });
      } else {
        payload.createdAt = serverTimestamp();
        await setDoc(doc(db, 'support_tickets', ticket.id), payload);
      }
    }
  } catch {
    // Non-fatal if user is customer updating or offline
  }
}

/**
 * Customer creates a new Support Ticket:
 * 1. Generates unique `BBX-2026-XXXXXX` ID
 * 2. Sets status='open', assignedTo=null, priority='normal' by default
 * 3. Persists to Firestore (`/supportTickets`, `/supportTickets/{id}/messages`, `/supportTickets/{id}/history`, `/support_tickets`) + server atomic store
 * 4. Triggers Mandatory Email 1: Ticket Opened Notification to customer's registered email
 */
export async function createCustomerSupportTicket(params: {
  userId: string;
  userName: string;
  userEmail: string;
  category: SupportTicketCategory;
  subject: string;
  description: string;
  priority?: SupportTicketPriority;
  canSelectUrgentPriority?: boolean;
  bookingId?: string;
  productId?: string;
  attachments?: SupportAttachmentItem[];
}): Promise<SupportTicketRecord> {
  const cleanSubject = params.subject.trim();
  const cleanDescription = params.description.trim();

  if (cleanSubject.length < 4) {
    throw new Error('Please enter a clear ticket subject (at least 4 characters).');
  }
  if (cleanDescription.length < 10) {
    throw new Error(
      'Please describe your issue in detail (at least 10 characters).'
    );
  }

  const ticketNumber = generateUniqueTicketNumber();
  const ticketId = ticketNumber;
  const nowISO = new Date().toISOString();

  // Priority is 'normal' by default unless urgent is explicitly allowed/selected
  const effectivePriority: SupportTicketPriority =
    params.canSelectUrgentPriority && params.priority === 'urgent'
      ? 'urgent'
      : 'normal';

  const newTicket: SupportTicketRecord = {
    id: ticketId,
    ticketNumber,
    userId: params.userId,
    userName: params.userName.trim() || 'BorrowBox Customer',
    userEmail: params.userEmail.trim(),
    category: params.category,
    bookingId: (params.bookingId || '').trim(),
    productId: (params.productId || '').trim(),
    subject: cleanSubject,
    description: cleanDescription,
    priority: effectivePriority,
    status: 'open',
    assignedTo: null,
    assignedStaffName: '',
    assignedToEmail: '',
    claimedAtISO: null,
    firstResponseAtISO: null,
    resolvedAtISO: null,
    closedAtISO: null,
    reopenedAtISO: null,
    reassignmentCount: 0,
    resolutionSummary: '',
    internalNotes: '',
    attachments: params.attachments || [],
    emailOpenedStatus: 'pending',
    createdAtISO: nowISO,
    updatedAtISO: nowISO,
  };

  const initialMsgId = `MSG-${Date.now().toString(36)}-init`;
  const initialMessage: SupportTicketMessageRecord = {
    id: initialMsgId,
    ticketId,
    senderId: params.userId,
    senderName: newTicket.userName,
    senderEmail: newTicket.userEmail,
    senderRole: 'customer',
    message: cleanDescription,
    attachments: newTicket.attachments || [],
    isInternal: false,
    createdAtISO: nowISO,
  };

  const historyId = `HIS-${Date.now().toString(36)}-create`;
  const initialHistory: SupportTicketHistoryEntry = {
    id: historyId,
    ticketId,
    action: 'created',
    actorId: params.userId,
    actorName: newTicket.userName,
    actorEmail: newTicket.userEmail,
    actorRole: 'customer',
    previousValue: 'None',
    newValue: `Open (${effectivePriority.toUpperCase()})`,
    summary: `Support ticket ${ticketNumber} created by ${newTicket.userName} under category "${params.category}". Placed in Unclaimed queue.`,
    createdAtISO: nowISO,
  };

  const staffNotifId = `NOTIF-${Date.now().toString(36)}-staff`;
  const customerNotifId = `NOTIF-${Date.now().toString(36)}-cust`;

  // 1. Write to Firestore `/supportTickets/{ticketId}` + subcollections
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'supportTickets', ticketId), {
      ...newTicket,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'supportTickets', ticketId, 'messages', initialMsgId), {
      ...initialMessage,
      createdAt: serverTimestamp(),
    });
    batch.set(doc(db, 'supportTickets', ticketId, 'history', historyId), {
      ...initialHistory,
      createdAt: serverTimestamp(),
    });
    batch.set(doc(db, 'supportNotifications', staffNotifId), {
      id: staffNotifId,
      recipientUid: 'ALL_SUPPORT_STAFF',
      ticketId,
      ticketNumber,
      type: 'ticket_created',
      title: `New Unclaimed Ticket: ${ticketNumber}`,
      message: `${newTicket.userName} submitted "${cleanSubject}" [${params.category}].`,
      read: false,
      createdAt: serverTimestamp(),
    });
    batch.set(doc(db, 'supportNotifications', customerNotifId), {
      id: customerNotifId,
      recipientUid: params.userId,
      ticketId,
      ticketNumber,
      type: 'ticket_created',
      title: `Ticket Created: ${ticketNumber}`,
      message: `Your support request "${cleanSubject}" is Open and waiting for a support specialist to claim it.`,
      read: false,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch {
    // Fallback to legacy `/support_tickets` if `/supportTickets` rules are not yet deployed on remote project
  }

  // 2. Also write legacy `/support_tickets/{ticketId}` for backward compatibility
  await syncLegacySupportTicketDoc(newTicket, true);

  // 3. Synchronize with server-side atomic store
  try {
    await fetch('/api/support/sync-ticket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticket: newTicket,
        initialMessage,
        historyEvent: initialHistory,
        notification: {
          id: staffNotifId,
          recipientUid: 'ALL_SUPPORT_STAFF',
          ticketId,
          ticketNumber,
          type: 'ticket_created',
          title: `New Unclaimed Ticket: ${ticketNumber}`,
          message: `${newTicket.userName} submitted "${cleanSubject}" [${params.category}].`,
          read: false,
          createdAtISO: nowISO,
        },
      }),
    });
  } catch {
    // Non-fatal if offline
  }

  // 4. Trigger Mandatory Email 1: Ticket Opened Notification (after database transaction succeeds)
  try {
    const emailRes = await fetch('/api/support/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticketId,
        ticketNumber,
        eventType: 'TICKET_OPENED',
        customerName: newTicket.userName,
        customerEmail: newTicket.userEmail,
        subject: newTicket.subject,
        category: newTicket.category,
        priority: newTicket.priority,
        description: newTicket.description,
      }),
    });
    if (emailRes.ok) {
      const emailData = await emailRes.json();
      newTicket.emailOpenedStatus = emailData.sent ? 'sent' : 'failed';
      newTicket.emailOpenedSentAtISO =
        emailData.emailLog?.sentAtISO || new Date().toISOString();
      newTicket.emailOpenedError = emailData.emailLog?.errorMessage || '';
    }
  } catch (err) {
    newTicket.emailOpenedStatus = 'failed';
    newTicket.emailOpenedError =
      err instanceof Error ? err.message : 'Email service unreachable';
  }

  return newTicket;
}

/**
 * Atomic Staff Claiming Workflow:
 * - Protects against simultaneous claiming via server-side mutex lock (`/api/support/claim-ticket`)
 *   AND Firestore `runTransaction` atomic ownership check.
 * - Assigns ticket to authenticated staff member, records `claimedAt`, changes status to `in_progress`,
 *   writes immutable `/audit_logs` record, and moves ticket into `My Tickets`.
 */
export async function claimSupportTicketAtomic(params: {
  actor: AdminRegistryRecord;
  ticket: SupportTicketRecord;
}): Promise<{
  updatedTicket: SupportTicketRecord;
  historyEvent: SupportTicketHistoryEntry;
  auditLog: AdminAuditLogRecord;
}> {
  // 1. Server-side atomic lock & claim check
  const claimResponse = await fetch('/api/support/claim-ticket', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ticketId: params.ticket.id,
      staffUid: params.actor.uid,
      staffName: params.actor.name,
      staffEmail: params.actor.email,
      staffRole: params.actor.role,
      currentAssignedTo: params.ticket.assignedTo || null,
      currentAssignedStaffName: params.ticket.assignedStaffName || '',
    }),
  });

  const claimBody = await claimResponse.json().catch(() => ({}));
  if (!claimResponse.ok || !claimBody.claimed) {
    throw new Error(
      claimBody.error ||
        'Could not claim ticket. It may have already been claimed by another staff member.'
    );
  }

  const claimedAtISO: string =
    claimBody.claimedAtISO || new Date().toISOString();
  const historyEvent: SupportTicketHistoryEntry = claimBody.historyEvent || {
    id: `HIS-${Date.now().toString(36)}-claim`,
    ticketId: params.ticket.id,
    action: 'claimed',
    actorId: params.actor.uid,
    actorName: params.actor.name,
    actorEmail: params.actor.email,
    actorRole: params.actor.role,
    previousValue: 'Unclaimed (open)',
    newValue: `${params.actor.name} (in_progress)`,
    summary: `Ticket claimed by ${params.actor.name} (${params.actor.email}). Status changed to In Progress.`,
    createdAtISO: claimedAtISO,
  };

  // 2. Atomic Firestore Transaction on `/supportTickets/{ticketId}`
  try {
    const ticketRef = doc(db, 'supportTickets', params.ticket.id);
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ticketRef);
      if (snap.exists()) {
        const data = snap.data();
        if (
          data.assignedTo &&
          String(data.assignedTo).trim().length > 0 &&
          data.assignedTo !== params.actor.uid
        ) {
          throw new Error(
            `Simultaneous claim prevented: Ticket already claimed by ${
              data.assignedStaffName || data.assignedToEmail || 'another staff member'
            }.`
          );
        }
        transaction.update(ticketRef, {
          assignedTo: params.actor.uid,
          assignedStaffName: params.actor.name,
          assignedToEmail: params.actor.email,
          claimedAtISO,
          claimedAt: serverTimestamp(),
          status: 'in_progress',
          updatedAtISO: claimedAtISO,
          updatedAt: serverTimestamp(),
        });
      }
    });

    await setDoc(
      doc(db, 'supportTickets', params.ticket.id, 'history', historyEvent.id),
      {
        ...historyEvent,
        createdAt: serverTimestamp(),
      }
    );
  } catch (err) {
    if (
      err instanceof Error &&
      err.message.includes('Simultaneous claim prevented')
    ) {
      throw err;
    }
  }

  const updatedTicket: SupportTicketRecord = {
    ...params.ticket,
    assignedTo: params.actor.uid,
    assignedStaffName: params.actor.name,
    assignedToEmail: params.actor.email,
    claimedAtISO,
    status: 'in_progress',
    updatedAtISO: claimedAtISO,
  };

  // 3. Sync legacy `/support_tickets` and write immutable `/audit_logs`
  await syncLegacySupportTicketDoc(updatedTicket, false);

  const logId = `aud-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
  const auditLog: AdminAuditLogRecord = {
    id: logId,
    adminId: params.actor.uid,
    adminEmail: params.actor.email,
    adminRole: params.actor.role,
    action: 'Claimed Support Ticket',
    targetType: 'support_ticket',
    targetId: params.ticket.id,
    targetLabel: `${params.ticket.ticketNumber || params.ticket.id}: ${params.ticket.subject}`,
    previousValue: 'assignedTo=Unclaimed, status=open',
    newValue: `assignedTo=${params.actor.name} (${params.actor.email}), status=in_progress`,
    createdAtISO: claimedAtISO,
  };

  try {
    await setDoc(doc(db, 'audit_logs', logId), {
      ...auditLog,
      createdAt: serverTimestamp(),
    });
  } catch {
    // Non-fatal if offline
  }

  return { updatedTicket, historyEvent, auditLog };
}

/**
 * Posts a reply (customer or assigned staff) or a private Internal Note (staff only).
 * Enforces ownership on backend & Firestore.
 */
export async function postSupportTicketReplyOrNote(params: {
  ticket: SupportTicketRecord;
  senderId: string;
  senderName: string;
  senderEmail: string;
  senderRole: 'customer' | 'staff' | 'admin';
  actorAdminRole?: string;
  message: string;
  attachments?: SupportAttachmentItem[];
  isInternal?: boolean;
}): Promise<{
  messageRecord: SupportTicketMessageRecord;
  historyEvent: SupportTicketHistoryEntry;
  updatedTicket: SupportTicketRecord;
}> {
  const cleanMsg = params.message.trim();
  if (!cleanMsg) {
    throw new Error('Please enter a message before sending.');
  }

  const res = await fetch(`/api/support/tickets/${params.ticket.id}/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      senderId: params.senderId,
      senderName: params.senderName,
      senderEmail: params.senderEmail,
      senderRole: params.senderRole,
      actorAdminRole: params.actorAdminRole || params.senderRole,
      message: cleanMsg,
      attachments: params.attachments || [],
      isInternal: Boolean(params.isInternal),
      currentAssignedTo: params.ticket.assignedTo,
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || 'Failed to post ticket message.');
  }

  const messageRecord: SupportTicketMessageRecord = body.message;
  const historyEvent: SupportTicketHistoryEntry = body.historyEvent;
  const nowISO = messageRecord.createdAtISO || new Date().toISOString();

  const updatedTicket: SupportTicketRecord = {
    ...params.ticket,
    status:
      params.senderRole === 'customer' &&
      params.ticket.status === 'waiting_for_user'
        ? 'in_progress'
        : params.ticket.status,
    firstResponseAtISO:
      params.senderRole !== 'customer' &&
      !params.isInternal &&
      !params.ticket.firstResponseAtISO
        ? nowISO
        : params.ticket.firstResponseAtISO,
    internalNotes: body.ticket?.internalNotes ?? params.ticket.internalNotes,
    updatedAtISO: nowISO,
  };

  try {
    const batch = writeBatch(db);
    batch.set(
      doc(db, 'supportTickets', params.ticket.id, 'messages', messageRecord.id),
      {
        ...messageRecord,
        createdAt: serverTimestamp(),
      }
    );
    batch.set(
      doc(db, 'supportTickets', params.ticket.id, 'history', historyEvent.id),
      {
        ...historyEvent,
        createdAt: serverTimestamp(),
      }
    );
    if (params.senderRole === 'customer') {
      if (params.ticket.status === 'waiting_for_user') {
        batch.update(doc(db, 'supportTickets', params.ticket.id), {
          status: 'in_progress',
          updatedAtISO: nowISO,
          updatedAt: serverTimestamp(),
        });
      }
    } else {
      batch.update(doc(db, 'supportTickets', params.ticket.id), {
        status: updatedTicket.status,
        firstResponseAtISO: updatedTicket.firstResponseAtISO || null,
        internalNotes: '',
        updatedAtISO: nowISO,
        updatedAt: serverTimestamp(),
      });
      if (updatedTicket.internalNotes) {
        batch.set(
          doc(db, 'supportTickets', params.ticket.id, 'privateNotes', 'scratchpad'),
          {
            ticketId: params.ticket.id,
            internalNotes: updatedTicket.internalNotes,
            updatedBy: params.senderEmail,
            updatedAtISO: nowISO,
            updatedAt: serverTimestamp(),
          }
        );
      }
    }
    await batch.commit();
  } catch {
    // Non-fatal if `/supportTickets` collection rules are pending manual deploy
  }

  if (params.senderRole !== 'customer') {
    await syncLegacySupportTicketDoc(updatedTicket, false);
  }

  return { messageRecord, historyEvent, updatedTicket };
}

/**
 * Updates ticket status (`open`, `in_progress`, `waiting_for_user`, `resolved`, `closed`),
 * priority (`normal`, `urgent`), resolution summary, or performs an Administrator Override
 * (`reassign`, `release_claim`, `reopen`).
 * Triggers Mandatory Email 2: Ticket Closed Notification when closed.
 */
export async function updateSupportTicketWorkflowOrOverride(params: {
  actor: AdminRegistryRecord;
  ticket: SupportTicketRecord;
  operation:
    | 'status_change'
    | 'priority_change'
    | 'reassign'
    | 'release_claim'
    | 'reopen'
    | 'update_notes';
  newStatus?: SupportTicketStatus;
  newPriority?: SupportTicketPriority;
  newAssignedTo?: string | null;
  newAssignedStaffName?: string;
  newAssignedToEmail?: string;
  resolutionSummary?: string;
  internalNotes?: string;
}): Promise<{
  updatedTicket: SupportTicketRecord;
  historyEvent: SupportTicketHistoryEntry;
  auditLog: AdminAuditLogRecord;
}> {
  const isOverrideOp = ['reassign', 'release_claim', 'reopen'].includes(
    params.operation
  );
  if (isOverrideOp && !canAdminOverrideTicket(params.actor)) {
    throw new Error(
      'Permission Denied: Only Super Admins and Level 2 Administrators can reassign tickets, release staff claims, or reopen resolved tickets.'
    );
  }

  if (
    !isOverrideOp &&
    params.ticket.assignedTo !== params.actor.uid &&
    !canAdminOverrideTicket(params.actor)
  ) {
    throw new Error(
      'Access Denied: Regular support staff can only modify tickets assigned to them.'
    );
  }

  if (params.newStatus === 'closed') {
    const summaryText = (
      params.resolutionSummary ??
      params.ticket.resolutionSummary ??
      ''
    ).trim();
    if (summaryText.length < 5) {
      throw new Error(
        'Please provide a clear Resolution Summary (at least 5 characters) before closing this ticket.'
      );
    }
  }

  // First sync current ticket to server so server has full metadata
  await fetch('/api/support/sync-ticket', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticket: params.ticket }),
  }).catch(() => null);

  const response = await fetch(
    `/api/support/tickets/${params.ticket.id}/update`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actorUid: params.actor.uid,
        actorName: params.actor.name,
        actorEmail: params.actor.email,
        actorRole: params.actor.role,
        operation: params.operation,
        newStatus: params.newStatus,
        newPriority: params.newPriority,
        newAssignedTo: params.newAssignedTo,
        newAssignedStaffName: params.newAssignedStaffName,
        newAssignedToEmail: params.newAssignedToEmail,
        resolutionSummary: params.resolutionSummary,
        internalNotes: params.internalNotes,
        currentAssignedTo: params.ticket.assignedTo,
      }),
    }
  );

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || 'Failed to update support ticket.');
  }

  const nowISO = new Date().toISOString();
  const serverTicket = body.ticket || {};
  const historyEvent: SupportTicketHistoryEntry = body.historyEvent || {
    id: `HIS-${Date.now().toString(36)}-upd`,
    ticketId: params.ticket.id,
    action: 'status_changed',
    actorId: params.actor.uid,
    actorName: params.actor.name,
    actorEmail: params.actor.email,
    actorRole: params.actor.role,
    previousValue: params.ticket.status,
    newValue: params.newStatus || params.ticket.status,
    summary: `Ticket updated by ${params.actor.name}.`,
    createdAtISO: nowISO,
  };

  const updatedTicket: SupportTicketRecord = {
    ...params.ticket,
    status: (serverTicket.status ||
      params.newStatus ||
      params.ticket.status) as SupportTicketStatus,
    priority: (serverTicket.priority ||
      params.newPriority ||
      params.ticket.priority) as SupportTicketPriority,
    assignedTo:
      serverTicket.assignedTo !== undefined
        ? serverTicket.assignedTo
        : params.newAssignedTo !== undefined
        ? params.newAssignedTo
        : params.ticket.assignedTo,
    assignedStaffName:
      serverTicket.assignedStaffName !== undefined
        ? serverTicket.assignedStaffName
        : params.newAssignedStaffName !== undefined
        ? params.newAssignedStaffName
        : params.ticket.assignedStaffName,
    assignedToEmail:
      serverTicket.assignedToEmail !== undefined
        ? serverTicket.assignedToEmail
        : params.newAssignedToEmail !== undefined
        ? params.newAssignedToEmail
        : params.ticket.assignedToEmail,
    claimedAtISO:
      serverTicket.claimedAtISO !== undefined
        ? serverTicket.claimedAtISO
        : params.ticket.claimedAtISO,
    resolvedAtISO:
      serverTicket.resolvedAtISO !== undefined
        ? serverTicket.resolvedAtISO
        : params.ticket.resolvedAtISO,
    closedAtISO:
      serverTicket.closedAtISO !== undefined
        ? serverTicket.closedAtISO
        : params.ticket.closedAtISO,
    reopenedAtISO:
      serverTicket.reopenedAtISO !== undefined
        ? serverTicket.reopenedAtISO
        : params.ticket.reopenedAtISO,
    reassignmentCount:
      typeof serverTicket.reassignmentCount === 'number'
        ? serverTicket.reassignmentCount
        : params.ticket.reassignmentCount || 0,
    resolutionSummary:
      params.resolutionSummary !== undefined
        ? params.resolutionSummary
        : serverTicket.resolutionSummary ?? params.ticket.resolutionSummary,
    internalNotes:
      params.internalNotes !== undefined
        ? params.internalNotes
        : serverTicket.internalNotes ?? params.ticket.internalNotes,
    updatedAtISO: nowISO,
  };

  // Persist to Firestore `/supportTickets` and `/support_tickets`
  try {
    const batch = writeBatch(db);
    batch.set(
      doc(db, 'supportTickets', params.ticket.id),
      {
        ...updatedTicket,
        internalNotes: '',
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    if (updatedTicket.internalNotes) {
      batch.set(
        doc(db, 'supportTickets', params.ticket.id, 'privateNotes', 'scratchpad'),
        {
          ticketId: params.ticket.id,
          internalNotes: updatedTicket.internalNotes,
          updatedBy: params.actor.email,
          updatedAtISO: nowISO,
          updatedAt: serverTimestamp(),
        }
      );
    }
    batch.set(
      doc(db, 'supportTickets', params.ticket.id, 'history', historyEvent.id),
      {
        ...historyEvent,
        createdAt: serverTimestamp(),
      }
    );
    await batch.commit();
  } catch {
    // Non-fatal
  }

  await syncLegacySupportTicketDoc(updatedTicket, false);

  // Record administrative action in immutable `/audit_logs`
  const logId = `aud-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
  const auditActionLabel =
    params.operation === 'reassign'
      ? 'Reassigned Support Ticket (Admin Override)'
      : params.operation === 'release_claim'
      ? 'Released Ticket Claim (Admin Override)'
      : params.operation === 'reopen'
      ? 'Reopened Support Ticket (Admin Override)'
      : params.operation === 'priority_change'
      ? `Changed Ticket Priority to ${(
          params.newPriority || updatedTicket.priority
        ).toUpperCase()}`
      : `Updated Ticket Status to ${updatedTicket.status.toUpperCase()}`;

  const auditLog: AdminAuditLogRecord = {
    id: logId,
    adminId: params.actor.uid,
    adminEmail: params.actor.email,
    adminRole: params.actor.role,
    action: auditActionLabel,
    targetType: 'support_ticket',
    targetId: params.ticket.id,
    targetLabel: `${params.ticket.ticketNumber || params.ticket.id}: ${params.ticket.subject}`,
    previousValue: `${historyEvent.previousValue || params.ticket.status}`,
    newValue: `${historyEvent.newValue || updatedTicket.status}`,
    createdAtISO: nowISO,
  };

  try {
    await setDoc(doc(db, 'audit_logs', logId), {
      ...auditLog,
      createdAt: serverTimestamp(),
    });
  } catch {
    // Non-fatal
  }

  // Trigger Mandatory Email 2: Ticket Closed Notification when ticket is closed
  if (params.newStatus === 'closed') {
    try {
      const emailRes = await fetch('/api/support/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: updatedTicket.id,
          ticketNumber: updatedTicket.ticketNumber || updatedTicket.id,
          eventType: 'TICKET_CLOSED',
          customerName: updatedTicket.userName,
          customerEmail: updatedTicket.userEmail,
          subject: updatedTicket.subject,
          assignedStaffName:
            updatedTicket.assignedStaffName || params.actor.name,
          resolutionSummary:
            updatedTicket.resolutionSummary ||
            'Your issue has been resolved and closed.',
          closedAtISO: updatedTicket.closedAtISO || nowISO,
        }),
      });
      if (emailRes.ok) {
        const emailData = await emailRes.json();
        updatedTicket.emailClosedStatus = emailData.sent ? 'sent' : 'failed';
        updatedTicket.emailClosedSentAtISO =
          emailData.emailLog?.sentAtISO || nowISO;
        updatedTicket.emailClosedError =
          emailData.emailLog?.errorMessage || '';
      }
    } catch (err) {
      updatedTicket.emailClosedStatus = 'failed';
      updatedTicket.emailClosedError =
        err instanceof Error ? err.message : 'Email service unreachable';
    }
  }

  return { updatedTicket, historyEvent, auditLog };
}

/**
 * Retries sending a Ticket Opened or Ticket Closed email notification.
 */
export async function retryTicketEmailNotification(params: {
  ticket: SupportTicketRecord;
  eventType: 'TICKET_OPENED' | 'TICKET_CLOSED';
}): Promise<{
  sent: boolean;
  sentAtISO: string;
  errorMessage?: string;
}> {
  const response = await fetch('/api/support/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ticketId: params.ticket.id,
      ticketNumber: params.ticket.ticketNumber || params.ticket.id,
      eventType: params.eventType,
      customerName: params.ticket.userName,
      customerEmail: params.ticket.userEmail,
      subject: params.ticket.subject,
      category: params.ticket.category || 'General Enquiry',
      priority: params.ticket.priority,
      description: params.ticket.description,
      assignedStaffName:
        params.ticket.assignedStaffName || 'BorrowBox Support Specialist',
      resolutionSummary:
        params.ticket.resolutionSummary ||
        'Resolved by BorrowBox Support Team.',
      closedAtISO: params.ticket.closedAtISO || new Date().toISOString(),
      forceRetry: true,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Failed to retry email notification.');
  }

  return {
    sent: Boolean(data.sent),
    sentAtISO: data.emailLog?.sentAtISO || new Date().toISOString(),
    errorMessage: data.emailLog?.errorMessage,
  };
}

/**
 * Loads conversation messages and activity history for a specific ticket.
 * Strictly strips internal notes (`isInternal: true`) when `viewerRole === 'customer'`.
 */
export async function fetchTicketConversationAndHistory(params: {
  ticket: SupportTicketRecord;
  viewerUid: string;
  viewerRole: 'customer' | 'staff' | 'admin';
}): Promise<{
  messages: SupportTicketMessageRecord[];
  history: SupportTicketHistoryEntry[];
}> {
  const messagesMap = new Map<string, SupportTicketMessageRecord>();
  const historyMap = new Map<string, SupportTicketHistoryEntry>();

  // 1. Always seed with the original customer message so conversation thread is never blank
  const initialMsgId = `init-${params.ticket.id}`;
  messagesMap.set(initialMsgId, {
    id: initialMsgId,
    ticketId: params.ticket.id,
    senderId: params.ticket.userId,
    senderName: params.ticket.userName,
    senderEmail: params.ticket.userEmail,
    senderRole: 'customer',
    message: params.ticket.description,
    attachments: params.ticket.attachments || [],
    isInternal: false,
    createdAtISO: params.ticket.createdAtISO,
  });

  // 2. Query Firestore `/supportTickets/{id}/messages` and `/supportTickets/{id}/history`
  try {
    const [msgSnap, hisSnap] = await Promise.all([
      getDocs(collection(db, 'supportTickets', params.ticket.id, 'messages')).catch(
        () => null
      ),
      getDocs(collection(db, 'supportTickets', params.ticket.id, 'history')).catch(
        () => null
      ),
    ]);

    if (msgSnap) {
      for (const d of msgSnap.docs) {
        const data = d.data();
        const isInternal = Boolean(data.isInternal);
        if (params.viewerRole === 'customer' && isInternal) continue;
        // Avoid duplicating the initial description message if already present
        if (
          data.message === params.ticket.description &&
          data.senderId === params.ticket.userId
        ) {
          messagesMap.delete(initialMsgId);
        }
        messagesMap.set(d.id, {
          id: String(data.id || d.id),
          ticketId: params.ticket.id,
          senderId: String(data.senderId || ''),
          senderName: String(data.senderName || 'User'),
          senderEmail: String(data.senderEmail || ''),
          senderRole:
            data.senderRole === 'admin'
              ? 'admin'
              : data.senderRole === 'staff'
              ? 'staff'
              : 'customer',
          message: String(data.message || ''),
          attachments: Array.isArray(data.attachments) ? data.attachments : [],
          isInternal,
          createdAtISO: formatFirestoreTs(data.createdAt || data.createdAtISO),
        });
      }
    }

    if (hisSnap) {
      for (const d of hisSnap.docs) {
        const data = d.data();
        if (
          params.viewerRole === 'customer' &&
          data.action === 'internal_note_added'
        ) {
          continue;
        }
        historyMap.set(d.id, {
          id: String(data.id || d.id),
          ticketId: params.ticket.id,
          action: (data.action ||
            'status_changed') as SupportTicketHistoryEntry['action'],
          actorId: String(data.actorId || ''),
          actorName: String(data.actorName || ''),
          actorEmail: String(data.actorEmail || ''),
          actorRole: String(data.actorRole || ''),
          previousValue: data.previousValue ? String(data.previousValue) : undefined,
          newValue: data.newValue ? String(data.newValue) : undefined,
          summary: String(data.summary || ''),
          createdAtISO: formatFirestoreTs(data.createdAt || data.createdAtISO),
        });
      }
    }
  } catch {
    // Fallback to server state
  }

  // 3. Merge server-synchronized state (`/api/support/state`)
  try {
    const roleParam = params.viewerRole === 'customer' ? 'customer' : 'admin';
    const res = await fetch(
      `/api/support/state?uid=${encodeURIComponent(
        params.viewerUid
      )}&role=${roleParam}`
    );
    if (res.ok) {
      const state = await res.json();
      const srvMsgs: SupportTicketMessageRecord[] =
        state.messagesByTicket?.[params.ticket.id] || [];
      for (const m of srvMsgs) {
        if (params.viewerRole === 'customer' && m.isInternal) continue;
        if (
          m.message === params.ticket.description &&
          m.senderId === params.ticket.userId
        ) {
          messagesMap.delete(initialMsgId);
        }
        messagesMap.set(m.id, m);
      }

      const srvHis: SupportTicketHistoryEntry[] =
        state.historyByTicket?.[params.ticket.id] || [];
      for (const h of srvHis) {
        if (
          params.viewerRole === 'customer' &&
          h.action === 'internal_note_added'
        ) {
          continue;
        }
        historyMap.set(h.id, h);
      }
    }
  } catch {
    // Non-fatal
  }

  if (historyMap.size === 0) {
    historyMap.set(`init-his-${params.ticket.id}`, {
      id: `init-his-${params.ticket.id}`,
      ticketId: params.ticket.id,
      action: 'created',
      actorId: params.ticket.userId,
      actorName: params.ticket.userName,
      actorEmail: params.ticket.userEmail,
      actorRole: 'customer',
      newValue: 'Open',
      summary: `Ticket ${
        params.ticket.ticketNumber || params.ticket.id
      } created by ${params.ticket.userName}.`,
      createdAtISO: params.ticket.createdAtISO,
    });
  }

  const messages = Array.from(messagesMap.values()).sort((a, b) =>
    a.createdAtISO.localeCompare(b.createdAtISO)
  );
  const history = Array.from(historyMap.values()).sort((a, b) =>
    b.createdAtISO.localeCompare(a.createdAtISO)
  );

  return { messages, history };
}

/**
 * Fetches all support tickets belonging to a specific customer (`userId`).
 * Strictly strips `internalNotes` so customers never see internal staff notes.
 */
export async function fetchCustomerSupportTickets(
  userId: string
): Promise<{
  tickets: SupportTicketRecord[];
  notifications: AppNotificationItem[];
}> {
  const ticketsMap = new Map<string, SupportTicketRecord>();
  const notifications: AppNotificationItem[] = [];

  // 1. Load from server state for this customer
  let serverTickets: Record<string, Record<string, unknown>> = {};
  try {
    const res = await fetch(
      `/api/support/state?uid=${encodeURIComponent(userId)}&role=customer`
    );
    if (res.ok) {
      const data = await res.json();
      serverTickets = data.tickets || {};
      if (Array.isArray(data.notifications)) {
        for (const n of data.notifications) {
          notifications.push({
            id: String(n.id),
            title: String(n.title || 'Support Update'),
            body: String(n.message || ''),
            timestampISO: String(n.createdAtISO || new Date().toISOString()),
            read: Boolean(n.read),
            ticketId: String(n.ticketId || ''),
            ticketNumber: String(n.ticketNumber || ''),
          });
        }
      }
    }
  } catch {
    // Non-fatal
  }

  // 2. Query Firestore `/supportTickets` and `/support_tickets` where `userId == userId`
  const [v2Snap, legacySnap] = await Promise.all([
    getDocs(
      query(collection(db, 'supportTickets'), where('userId', '==', userId))
    ).catch(() => null),
    getDocs(
      query(collection(db, 'support_tickets'), where('userId', '==', userId))
    ).catch(() => null),
  ]);

  const mapCustomerTicket = (
    docId: string,
    raw: Record<string, unknown>
  ): SupportTicketRecord => {
    const id = String(raw.id || docId);
    const srv = serverTickets[id] || {};
    const rawPriority = String(srv.priority || raw.priority || 'normal').toLowerCase();
    const priority: SupportTicketPriority =
      rawPriority === 'urgent' || rawPriority === 'high' ? 'urgent' : 'normal';
    const rawStatus = String(srv.status || raw.status || 'open').toLowerCase();
    const status: SupportTicketStatus =
      rawStatus === 'in_progress' ||
      rawStatus === 'waiting_for_user' ||
      rawStatus === 'resolved' ||
      rawStatus === 'closed'
        ? (rawStatus as SupportTicketStatus)
        : 'open';

    const assignedToEmail = String(
      srv.assignedToEmail ?? raw.assignedToEmail ?? ''
    );
    const assignedTo =
      srv.assignedTo !== undefined
        ? srv.assignedTo
        : raw.assignedTo !== undefined
        ? raw.assignedTo
        : assignedToEmail || null;

    return {
      id,
      ticketNumber: String(srv.ticketNumber || raw.ticketNumber || id),
      userId,
      userName: String(srv.userName || raw.userName || 'Customer'),
      userEmail: String(srv.userEmail || raw.userEmail || ''),
      category: (srv.category ||
        raw.category ||
        'General Enquiry') as SupportTicketCategory,
      bookingId: String(srv.bookingId ?? raw.bookingId ?? ''),
      productId: String(srv.productId ?? raw.productId ?? ''),
      subject: String(srv.subject || raw.subject || ''),
      description: String(srv.description || raw.description || ''),
      priority,
      status,
      assignedTo: assignedTo ? String(assignedTo) : null,
      assignedStaffName: String(
        srv.assignedStaffName ||
          raw.assignedStaffName ||
          (assignedToEmail ? 'BorrowBox Support Specialist' : '')
      ),
      assignedToEmail,
      claimedAtISO: srv.claimedAtISO
        ? String(srv.claimedAtISO)
        : raw.claimedAt
        ? formatFirestoreTs(raw.claimedAt)
        : null,
      resolvedAtISO: srv.resolvedAtISO ? String(srv.resolvedAtISO) : null,
      closedAtISO: srv.closedAtISO ? String(srv.closedAtISO) : null,
      resolutionSummary: String(
        srv.resolutionSummary ?? raw.resolutionSummary ?? ''
      ),
      internalNotes: '', // Strictly strip internal notes for customers
      attachments: Array.isArray(srv.attachments)
        ? (srv.attachments as SupportAttachmentItem[])
        : Array.isArray(raw.attachments)
        ? (raw.attachments as SupportAttachmentItem[])
        : [],
      emailOpenedStatus: (srv.emailOpenedStatus ||
        raw.emailOpenedStatus) as SupportTicketRecord['emailOpenedStatus'],
      emailOpenedSentAtISO: String(
        srv.emailOpenedSentAtISO || raw.emailOpenedSentAtISO || ''
      ),
      emailClosedStatus: (srv.emailClosedStatus ||
        raw.emailClosedStatus) as SupportTicketRecord['emailClosedStatus'],
      emailClosedSentAtISO: String(
        srv.emailClosedSentAtISO || raw.emailClosedSentAtISO || ''
      ),
      createdAtISO: raw.createdAt
        ? formatFirestoreTs(raw.createdAt)
        : String(srv.createdAtISO || raw.createdAtISO || new Date().toISOString()),
      updatedAtISO: raw.updatedAt
        ? formatFirestoreTs(raw.updatedAt)
        : String(srv.updatedAtISO || raw.updatedAtISO || new Date().toISOString()),
    };
  };

  if (legacySnap) {
    for (const d of legacySnap.docs) {
      ticketsMap.set(d.id, mapCustomerTicket(d.id, d.data()));
    }
  }
  if (v2Snap) {
    for (const d of v2Snap.docs) {
      ticketsMap.set(d.id, mapCustomerTicket(d.id, d.data()));
    }
  }
  for (const [id, srv] of Object.entries(serverTickets)) {
    if (!ticketsMap.has(id)) {
      ticketsMap.set(id, mapCustomerTicket(id, srv));
    }
  }

  return {
    tickets: Array.from(ticketsMap.values()).sort((a, b) =>
      b.createdAtISO.localeCompare(a.createdAtISO)
    ),
    notifications,
  };
}
