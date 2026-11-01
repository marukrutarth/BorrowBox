import {
  Timestamp,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytesResumable,
} from 'firebase/storage';
import { app, db } from './firebase';
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
import { PRIMARY_SUPER_ADMIN_EMAIL } from '../utils/adminRbac';

const storage = getStorage(app);

export const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_ATTACHMENTS_PER_TICKET = 5;

const ALLOWED_ATTACHMENT_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

const ALLOWED_ATTACHMENT_EXTENSIONS = /\.(jpg|jpeg|png|webp|pdf)$/i;

export const SUPPORT_TICKET_CATEGORIES: SupportTicketCategory[] = [
  'Booking & Handover',
  'Payment & Deposit',
  'Item Condition & Damage',
  'Account & Verification',
  'Safety & Trust',
  'General Enquiry',
];

function formatTimestamp(val: unknown, fallbackISO?: string): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof val === 'string' && val.trim().length > 0) {
    return val;
  }
  return fallbackISO || new Date().toISOString();
}

export function canAdminOverrideSupportTicket(
  admin: AdminRegistryRecord | null | undefined
): boolean {
  if (!admin || admin.status !== 'active') return false;
  const email = admin.email.trim().toLowerCase();
  if (
    email === PRIMARY_SUPER_ADMIN_EMAIL ||
    email === 'marukrutarth@gmail.com'
  ) {
    return true;
  }
  return admin.role === 'super_admin' || admin.role === 'admin';
}

export function canStaffModifyTicket(
  admin: AdminRegistryRecord | null | undefined,
  ticket: SupportTicketRecord
): boolean {
  if (!admin || admin.status !== 'active') return false;
  if (canAdminOverrideSupportTicket(admin)) return true;
  return Boolean(ticket.assignedTo && ticket.assignedTo === admin.uid);
}

export function generateTicketNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `BB-TKT-${year}-${rand}`;
}

export function isImageAttachment(att: SupportAttachmentItem): boolean {
  const mime = (att.contentType || att.mimeType || '').toLowerCase();
  if (mime.startsWith('image/')) return true;
  const nameOrUrl = `${att.name || ''} ${att.url || ''}`.toLowerCase();
  return /\.(jpg|jpeg|png|webp)(\?|$)/i.test(nameOrUrl);
}

export function isPdfAttachment(att: SupportAttachmentItem): boolean {
  const mime = (att.contentType || att.mimeType || '').toLowerCase();
  if (mime === 'application/pdf') return true;
  const nameOrUrl = `${att.name || ''} ${att.url || ''}`.toLowerCase();
  return /\.pdf(\?|$)/i.test(nameOrUrl);
}

export function validateAttachmentFile(file: File): {
  valid: boolean;
  normalizedContentType: string;
  error?: string;
} {
  if (!file) {
    return {
      valid: false,
      normalizedContentType: '',
      error: 'No file selected.',
    };
  }

  const cleanName = (file.name || '').trim();
  const extMatch = cleanName.toLowerCase().match(ALLOWED_ATTACHMENT_EXTENSIONS);
  let mime = (file.type || '').trim().toLowerCase();

  if (!mime && extMatch) {
    const ext = extMatch[1].toLowerCase();
    if (ext === 'jpg' || ext === 'jpeg') mime = 'image/jpeg';
    else if (ext === 'png') mime = 'image/png';
    else if (ext === 'webp') mime = 'image/webp';
    else if (ext === 'pdf') mime = 'application/pdf';
  }
  if (mime === 'image/jpg') {
    mime = 'image/jpeg';
  }

  if (!extMatch || !ALLOWED_ATTACHMENT_MIME_TYPES.has(mime)) {
    return {
      valid: false,
      normalizedContentType: mime,
      error:
        'Unsupported file format. Only JPEG, JPG, PNG, WebP images and PDF documents are allowed.',
    };
  }

  if (file.size <= 0) {
    return {
      valid: false,
      normalizedContentType: mime,
      error: `File "${cleanName}" is empty (0 bytes).`,
    };
  }

  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return {
      valid: false,
      normalizedContentType: mime,
      error: `File "${cleanName}" exceeds the 5 MB maximum size limit.`,
    };
  }

  return { valid: true, normalizedContentType: mime };
}

function readFileAsDataUrlWithProgress(
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0 && onProgress) {
        const ratio = Math.min(1, event.loaded / event.total);
        onProgress(Math.max(5, Math.round(ratio * 40)));
      }
    };
    reader.onload = () => {
      if (typeof reader.result === 'string' && reader.result.length > 0) {
        onProgress?.(45);
        resolve(reader.result);
      } else {
        reject(new Error(`Could not read file "${file.name}".`));
      }
    };
    reader.onerror = () =>
      reject(new Error(`Failed to read file "${file.name}".`));
    reader.readAsDataURL(file);
  });
}

/**
 * Attempts a fast Firebase Storage upload with a strict timeout so it never hangs
 * on "Uploading..." when Storage CORS or bucket provisioning is unavailable.
 */
async function tryFastFirebaseStorageUpload(
  file: File,
  storagePath: string,
  contentType: string,
  onProgress?: (percent: number) => void
): Promise<string | null> {
  return new Promise((resolve) => {
    let settled = false;
    let uploadTask: ReturnType<typeof uploadBytesResumable> | null = null;

    const finish = (url: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      resolve(url);
    };

    const timeoutId = setTimeout(() => {
      try {
        uploadTask?.cancel();
      } catch {
        // Ignore cancel errors
      }
      finish(null);
    }, 2200);

    try {
      const storageRef = ref(storage, storagePath);
      uploadTask = uploadBytesResumable(storageRef, file, {
        contentType,
      });

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (snapshot.totalBytes > 0 && onProgress) {
            const pct = Math.round(
              45 + (snapshot.bytesTransferred / snapshot.totalBytes) * 45
            );
            onProgress(Math.min(92, Math.max(45, pct)));
          }
        },
        () => {
          finish(null);
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask!.snapshot.ref);
            finish(downloadUrl);
          } catch {
            finish(null);
          }
        }
      );
    } catch {
      finish(null);
    }
  });
}

/**
 * Validates and uploads a support attachment (JPEG, JPG, PNG, WebP, or PDF up to 5 MB)
 * with real-time progress reporting (0% -> 100%) and guaranteed completion.
 */
export async function uploadSupportAttachment(
  file: File,
  userId: string,
  onProgress?: (percent: number) => void
): Promise<SupportAttachmentItem> {
  onProgress?.(2);
  const validation = validateAttachmentFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid attachment file.');
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const cleanUserId = (userId || 'member').replace(/[^a-zA-Z0-9_-]/g, '_');
  const attachmentId = `ATT-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
  const storagePath = `support_attachments/${cleanUserId}/${attachmentId}_${safeName}`;
  const uploadedAtISO = new Date().toISOString();

  // Read file with progress (2% -> 45%)
  const base64DataUrl = await readFileAsDataUrlWithProgress(file, onProgress);

  // 1. Upload to backend attachment storage endpoint so the attachment URL is a fast, compact HTTP URL
  //    that works across all customer and admin sessions and never bloats Firestore documents.
  onProgress?.(60);
  let serverAttachment: SupportAttachmentItem | null = null;
  try {
    const response = await fetch('/api/support/attachments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: safeName,
        contentType: validation.normalizedContentType,
        sizeBytes: file.size,
        base64Data: base64DataUrl,
        userId: cleanUserId,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok || !data.attachment) {
      throw new Error(
        data.error || `Upload failed with status ${response.status}.`
      );
    }

    onProgress?.(85);
    serverAttachment = {
      id: String(data.attachment.id || attachmentId),
      name: String(data.attachment.name || file.name),
      url: String(data.attachment.url),
      downloadUrl: String(
        data.attachment.downloadUrl || data.attachment.url
      ),
      storagePath: String(data.attachment.storagePath || storagePath),
      contentType: String(
        data.attachment.contentType || validation.normalizedContentType
      ),
      sizeBytes: Number(data.attachment.sizeBytes || file.size),
      uploadedAtISO: String(data.attachment.uploadedAtISO || uploadedAtISO),
    };
  } catch (err) {
    // If the validation failed on the server, surface the exact error immediately
    if (
      err instanceof Error &&
      (err.message.includes('Unsupported') ||
        err.message.includes('5 MB') ||
        err.message.includes('empty'))
    ) {
      throw err;
    }
  }

  // 2. Also attempt non-blocking Firebase Storage upload (bounded by 2.2s timeout so it never hangs)
  const firebaseDownloadUrl = await tryFastFirebaseStorageUpload(
    file,
    serverAttachment?.storagePath || storagePath,
    validation.normalizedContentType,
    onProgress
  );

  onProgress?.(100);

  if (serverAttachment) {
    return {
      ...serverAttachment,
      // Prefer the server's same-origin attachment URL so images and PDFs always render reliably
      url: serverAttachment.url,
      downloadUrl: firebaseDownloadUrl || serverAttachment.downloadUrl || serverAttachment.url,
    };
  }

  if (firebaseDownloadUrl) {
    return {
      id: attachmentId,
      name: file.name,
      url: firebaseDownloadUrl,
      downloadUrl: firebaseDownloadUrl,
      storagePath,
      contentType: validation.normalizedContentType,
      sizeBytes: file.size,
      uploadedAtISO,
    };
  }

  throw new Error(
    `Failed to upload "${file.name}". Please check your connection and click Retry.`
  );
}

function normalizeAttachmentsList(raw: unknown): SupportAttachmentItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const a = item as Record<string, unknown>;
      const url = String(a.url || a.downloadUrl || '');
      const downloadUrl = String(a.downloadUrl || a.url || '');
      return {
        id: String(a.id || `ATT-${Math.random().toString(36).slice(2, 7)}`),
        name: String(a.name || 'Attachment'),
        url,
        downloadUrl,
        storagePath: a.storagePath ? String(a.storagePath) : undefined,
        contentType: String(
          a.contentType || a.mimeType || 'application/octet-stream'
        ),
        sizeBytes: Number(a.sizeBytes || 0),
        uploadedAtISO: String(a.uploadedAtISO || new Date().toISOString()),
      };
    })
    .filter((a) => Boolean(a.url));
}

function parseFirestoreAttachmentsField(raw: unknown): SupportAttachmentItem[] {
  if (Array.isArray(raw)) {
    return normalizeAttachmentsList(raw);
  }
  if (typeof raw === 'string' && raw.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      return normalizeAttachmentsList(parsed);
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeTicketRecord(
  docId: string,
  raw: Record<string, unknown>,
  serverEnrichment?: Record<string, unknown>
): SupportTicketRecord {
  const merged = { ...raw, ...(serverEnrichment || {}) };
  const id = String(merged.id || docId);
  const ticketNumber = String(merged.ticketNumber || id);

  // Backward compatibility: preserve priority only if already present on an existing ticket
  const rawPriority = String(merged.priority || '').toLowerCase();
  const optionalPriority: SupportTicketPriority | undefined =
    rawPriority === 'urgent' || rawPriority === 'high'
      ? 'urgent'
      : rawPriority === 'normal' ||
        rawPriority === 'low' ||
        rawPriority === 'medium'
      ? 'normal'
      : undefined;

  const rawStatus = String(merged.status || 'open').toLowerCase();
  const status: SupportTicketStatus =
    rawStatus === 'in_progress' ||
    rawStatus === 'waiting_for_user' ||
    rawStatus === 'resolved' ||
    rawStatus === 'closed'
      ? (rawStatus as SupportTicketStatus)
      : 'open';

  const assignedToEmail = String(
    merged.assignedStaffEmail ?? merged.assignedToEmail ?? ''
  );
  const assignedToRaw =
    merged.assignedTo !== undefined && merged.assignedTo !== null
      ? String(merged.assignedTo)
      : '';
  const assignedTo = assignedToRaw.trim().length > 0 ? assignedToRaw.trim() : null;

  const bookingId = String(
    merged.relatedBookingId ?? merged.bookingId ?? ''
  ).trim();
  const productId = String(
    merged.relatedProductId ?? merged.productId ?? ''
  ).trim();

  const attachments =
    parseFirestoreAttachmentsField(merged.attachments).length > 0
      ? parseFirestoreAttachmentsField(merged.attachments)
      : parseFirestoreAttachmentsField(raw.attachments);

  return {
    id,
    ticketNumber,
    userId: String(merged.userId || raw.userId || ''),
    userName: String(merged.userName || raw.userName || 'BorrowBox Member'),
    userEmail: String(merged.userEmail || raw.userEmail || ''),
    category: (merged.category ||
      raw.category ||
      'General Enquiry') as SupportTicketCategory,
    bookingId,
    productId,
    relatedBookingId: bookingId,
    relatedProductId: productId,
    subject: String(merged.subject || raw.subject || 'Support Request'),
    description: String(merged.description || raw.description || ''),
    ...(optionalPriority ? { priority: optionalPriority } : {}),
    status,
    assignedTo,
    assignedStaffName: String(
      merged.assignedStaffName || assignedToEmail || ''
    ),
    assignedStaffEmail: assignedToEmail,
    assignedToEmail,
    claimedAtISO: merged.claimedAtISO
      ? String(merged.claimedAtISO)
      : merged.claimedAt
      ? formatTimestamp(merged.claimedAt)
      : null,
    firstResponseAtISO: merged.firstResponseAtISO
      ? String(merged.firstResponseAtISO)
      : merged.firstResponseAt
      ? formatTimestamp(merged.firstResponseAt)
      : null,
    resolvedAtISO: merged.resolvedAtISO
      ? String(merged.resolvedAtISO)
      : merged.resolvedAt
      ? formatTimestamp(merged.resolvedAt)
      : null,
    closedAtISO: merged.closedAtISO
      ? String(merged.closedAtISO)
      : merged.closedAt
      ? formatTimestamp(merged.closedAt)
      : null,
    reopenedAtISO: merged.reopenedAtISO ? String(merged.reopenedAtISO) : null,
    reassignmentCount: Number(merged.reassignmentCount || 0),
    resolutionSummary: String(merged.resolutionSummary || ''),
    internalNotes: String(merged.internalNotes || ''),
    attachments,
    createdAtISO: formatTimestamp(
      raw.createdAt,
      String(merged.createdAtISO || new Date().toISOString())
    ),
    updatedAtISO: formatTimestamp(
      raw.updatedAt,
      String(merged.updatedAtISO || new Date().toISOString())
    ),
  };
}

/**
 * Creates a new customer support ticket (without priority), persists it to Firestore
 * (`/supportTickets/{ticketId}`, `/supportTickets/{ticketId}/messages`, and `/supportNotifications/{notifId}`),
 * and syncs with the backend for real-time staff notifications.
 */
export async function createCustomerSupportTicket(params: {
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  category: SupportTicketCategory;
  description: string;
  bookingId?: string;
  productId?: string;
  attachments?: SupportAttachmentItem[];
}): Promise<SupportTicketRecord> {
  const nowISO = new Date().toISOString();
  const ticketNumber = generateTicketNumber();
  const ticketId = ticketNumber;
  const cleanSubject = params.subject.trim().slice(0, 160);
  const cleanDescription = params.description.trim().slice(0, 2000);
  const cleanBookingId = (params.bookingId || '').trim().slice(0, 128);
  const cleanProductId = (params.productId || '').trim().slice(0, 128);
  const attachments = (params.attachments || []).slice(
    0,
    MAX_ATTACHMENTS_PER_TICKET
  );

  const initialMsgId = `MSG-${Date.now()}-init`;
  const historyId = `HIS-${Date.now()}-create`;
  const notifId = `NOTIF-${Date.now()}-create`;

  const initialMessage: SupportTicketMessageRecord = {
    id: initialMsgId,
    ticketId,
    senderId: params.userId,
    senderName: params.userName,
    senderEmail: params.userEmail,
    senderRole: 'customer',
    message: cleanDescription,
    attachments,
    isInternal: false,
    createdAtISO: nowISO,
  };

  const historyEvent: SupportTicketHistoryEntry = {
    id: historyId,
    ticketId,
    action: 'created',
    actorId: params.userId,
    actorName: params.userName,
    actorEmail: params.userEmail,
    actorRole: 'customer',
    previousValue: 'none',
    newValue: 'open (Unclaimed)',
    summary: `Support ticket ${ticketNumber} created by customer ${params.userName} (${params.category}).`,
    createdAtISO: nowISO,
  };

  const ticketRecord: SupportTicketRecord = {
    id: ticketId,
    ticketNumber,
    userId: params.userId,
    userName: params.userName,
    userEmail: params.userEmail,
    category: params.category,
    bookingId: cleanBookingId,
    productId: cleanProductId,
    relatedBookingId: cleanBookingId,
    relatedProductId: cleanProductId,
    subject: cleanSubject,
    description: cleanDescription,
    status: 'open',
    assignedTo: null,
    assignedStaffName: '',
    assignedStaffEmail: '',
    assignedToEmail: '',
    claimedAtISO: null,
    firstResponseAtISO: null,
    resolvedAtISO: null,
    closedAtISO: null,
    reopenedAtISO: null,
    reassignmentCount: 0,
    resolutionSummary: '',
    internalNotes: '',
    attachments,
    createdAtISO: nowISO,
    updatedAtISO: nowISO,
  };

  // 1. Write parent ticket document to Firestore FIRST so `/supportTickets/{ticketId}` is guaranteed to exist
  try {
    await setDoc(doc(db, 'supportTickets', ticketId), {
      id: ticketId,
      ticketNumber,
      userId: params.userId,
      userName: params.userName.slice(0, 80),
      userEmail: params.userEmail.slice(0, 120),
      subject: cleanSubject,
      description: cleanDescription,
      category: params.category,
      status: 'open',
      assignedTo: null,
      assignedStaffName: '',
      assignedStaffEmail: '',
      assignedToEmail: '',
      claimedAt: '',
      firstResponseAt: '',
      relatedBookingId: cleanBookingId,
      relatedProductId: cleanProductId,
      bookingId: cleanBookingId,
      productId: cleanProductId,
      attachments: JSON.stringify(attachments).slice(0, 400000),
      resolutionSummary: '',
      internalNotes: '',
      resolvedAt: '',
      closedAt: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdAtISO: nowISO,
      updatedAtISO: nowISO,
    });

    // Write initial message, history event, notification, and legacy mirror in a batch
    const subBatch = writeBatch(db);
    subBatch.set(doc(db, 'supportTickets', ticketId, 'messages', initialMsgId), {
      id: initialMsgId,
      ticketId,
      senderId: params.userId,
      senderName: params.userName.slice(0, 80),
      senderEmail: params.userEmail.slice(0, 120),
      senderRole: 'customer',
      message: cleanDescription,
      attachments: JSON.stringify(attachments).slice(0, 400000),
      isInternal: false,
      createdAt: serverTimestamp(),
      createdAtISO: nowISO,
    });
    subBatch.set(doc(db, 'supportTickets', ticketId, 'history', historyId), {
      id: historyId,
      ticketId,
      actorId: params.userId,
      actorName: params.userName.slice(0, 80),
      actorEmail: params.userEmail.slice(0, 120),
      actorRole: 'customer',
      action: 'created',
      summary: historyEvent.summary.slice(0, 500),
      createdAt: serverTimestamp(),
      createdAtISO: nowISO,
    });
    subBatch.set(doc(db, 'supportNotifications', notifId), {
      id: notifId,
      recipientUid: 'ALL_SUPPORT_STAFF',
      recipientRole: 'staff',
      type: 'ticket_created',
      ticketId,
      ticketNumber,
      title: `New Support Ticket (${ticketNumber})`,
      body: `${params.userName} opened "${cleanSubject}" (${params.category}).`,
      read: false,
      createdAt: serverTimestamp(),
      createdAtISO: nowISO,
    });
    subBatch.set(doc(db, 'support_tickets', ticketId), {
      id: ticketId,
      userId: params.userId,
      userName: params.userName.slice(0, 80),
      userEmail: params.userEmail.slice(0, 120),
      bookingId: cleanBookingId,
      subject: cleanSubject,
      description: cleanDescription.slice(0, 1200),
      status: 'open',
      internalNotes: '',
      assignedToEmail: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await subBatch.commit();
  } catch {
    // Fallback if legacy or notification write fails: still ensure initial message is saved
    try {
      await setDoc(
        doc(db, 'supportTickets', ticketId, 'messages', initialMsgId),
        {
          id: initialMsgId,
          ticketId,
          senderId: params.userId,
          senderName: params.userName.slice(0, 80),
          senderEmail: params.userEmail.slice(0, 120),
          senderRole: 'customer',
          message: cleanDescription,
          attachments: JSON.stringify(attachments).slice(0, 400000),
          isInternal: false,
          createdAt: serverTimestamp(),
          createdAtISO: nowISO,
        }
      );
    } catch {
      // Server sync below guarantees persistence
    }
  }

  // 2. Synchronize with backend state store
  try {
    await fetch('/api/support/sync-ticket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticket: ticketRecord,
        initialMessage,
        historyEvent,
        notification: {
          id: notifId,
          recipientUid: 'ALL_SUPPORT_STAFF',
          recipientRole: 'staff',
          ticketId,
          ticketNumber,
          type: 'ticket_created',
          title: `New Support Ticket (${ticketNumber})`,
          message: `${params.userName} opened "${cleanSubject}" (${params.category}).`,
          read: false,
          createdAtISO: nowISO,
        },
      }),
    });
  } catch {
    // Non-fatal
  }

  return ticketRecord;
}

/**
 * Fetches all tickets belonging to a specific customer (from both `/supportTickets` and `/support_tickets` + server state).
 * Strictly strips any internal staff notes.
 */
export async function fetchCustomerSupportTickets(
  userId: string
): Promise<SupportTicketRecord[]> {
  if (!userId) return [];

  const [v2Snap, legacySnap, serverRes] = await Promise.all([
    getDocs(
      query(collection(db, 'supportTickets'), where('userId', '==', userId))
    ).catch(() => null),
    getDocs(
      query(collection(db, 'support_tickets'), where('userId', '==', userId))
    ).catch(() => null),
    fetch(`/api/support/state?uid=${encodeURIComponent(userId)}&role=customer`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null),
  ]);

  const serverTicketsMap: Record<string, Record<string, unknown>> =
    serverRes && typeof serverRes.tickets === 'object'
      ? (serverRes.tickets as Record<string, Record<string, unknown>>)
      : {};

  const map = new Map<string, SupportTicketRecord>();

  if (legacySnap) {
    for (const d of legacySnap.docs) {
      const normalized = normalizeTicketRecord(
        d.id,
        d.data(),
        serverTicketsMap[d.id]
      );
      normalized.internalNotes = '';
      map.set(d.id, normalized);
    }
  }

  if (v2Snap) {
    for (const d of v2Snap.docs) {
      const normalized = normalizeTicketRecord(
        d.id,
        d.data(),
        serverTicketsMap[d.id]
      );
      normalized.internalNotes = '';
      map.set(d.id, normalized);
    }
  }

  for (const [id, srvTicket] of Object.entries(serverTicketsMap)) {
    if (!map.has(id) && String(srvTicket.userId) === userId) {
      const normalized = normalizeTicketRecord(id, srvTicket, srvTicket);
      normalized.internalNotes = '';
      map.set(id, normalized);
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    b.createdAtISO.localeCompare(a.createdAtISO)
  );
}

/**
 * Subscribes in real time to a customer's support tickets so status updates and newly created tickets
 * appear immediately without page refresh.
 */
export function subscribeToCustomerSupportTickets(
  userId: string,
  onTicketsChanged: (tickets: SupportTicketRecord[]) => void
): () => void {
  if (!userId) return () => {};
  let active = true;

  const refresh = async () => {
    if (!active) return;
    try {
      const list = await fetchCustomerSupportTickets(userId);
      if (active) {
        onTicketsChanged(list);
      }
    } catch {
      // Ignore transient errors
    }
  };

  void refresh();

  const q = query(
    collection(db, 'supportTickets'),
    where('userId', '==', userId)
  );
  const unsubFirestore = onSnapshot(
    q,
    () => {
      void refresh();
    },
    () => {
      // Ignore snapshot listener error if offline
    }
  );

  const pollTimer = setInterval(() => {
    void refresh();
  }, 3000);

  return () => {
    active = false;
    clearInterval(pollTimer);
    unsubFirestore();
  };
}

/**
 * Fetches and subscribes in real time to all support tickets for the Admin Panel
 * so new customer tickets, status updates, and claims reflect immediately.
 */
export async function fetchAllSupportTicketsForAdmin(
  staffUid?: string
): Promise<SupportTicketRecord[]> {
  const [v2Snap, legacySnap, serverRes] = await Promise.all([
    getDocs(collection(db, 'supportTickets')).catch(() => null),
    getDocs(collection(db, 'support_tickets')).catch(() => null),
    fetch(
      `/api/support/state?uid=${encodeURIComponent(
        staffUid || 'admin'
      )}&role=admin`
    )
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null),
  ]);

  const serverTicketsMap: Record<string, Record<string, unknown>> =
    serverRes && typeof serverRes.tickets === 'object'
      ? (serverRes.tickets as Record<string, Record<string, unknown>>)
      : {};

  const map = new Map<string, SupportTicketRecord>();

  if (legacySnap) {
    for (const d of legacySnap.docs) {
      map.set(
        d.id,
        normalizeTicketRecord(d.id, d.data(), serverTicketsMap[d.id])
      );
    }
  }

  if (v2Snap) {
    for (const d of v2Snap.docs) {
      map.set(
        d.id,
        normalizeTicketRecord(d.id, d.data(), serverTicketsMap[d.id])
      );
    }
  }

  for (const [id, srvTicket] of Object.entries(serverTicketsMap)) {
    if (!map.has(id)) {
      map.set(id, normalizeTicketRecord(id, srvTicket, srvTicket));
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    b.createdAtISO.localeCompare(a.createdAtISO)
  );
}

export function subscribeToAdminSupportTickets(
  staffUid: string,
  onTicketsChanged: (tickets: SupportTicketRecord[]) => void
): () => void {
  let active = true;

  const refresh = async () => {
    if (!active) return;
    try {
      const list = await fetchAllSupportTicketsForAdmin(staffUid);
      if (active) {
        onTicketsChanged(list);
      }
    } catch {
      // Ignore transient errors
    }
  };

  void refresh();

  const unsubFirestore = onSnapshot(
    collection(db, 'supportTickets'),
    () => {
      void refresh();
    },
    () => {
      // Ignore snapshot listener error if offline
    }
  );

  const pollTimer = setInterval(() => {
    void refresh();
  }, 2500);

  return () => {
    active = false;
    clearInterval(pollTimer);
    unsubFirestore();
  };
}

/**
 * Atomically claims an unclaimed ticket for a staff member using both the server mutex
 * and a Firestore transaction (`runTransaction`), preventing simultaneous claims.
 */
export async function claimSupportTicketAtomic(params: {
  ticket: SupportTicketRecord;
  staff: AdminRegistryRecord;
}): Promise<{
  updatedTicket: SupportTicketRecord;
  historyEvent: SupportTicketHistoryEntry;
  auditLog?: AdminAuditLogRecord;
}> {
  const { ticket, staff } = params;

  // 1. Atomic backend mutex & ownership validation
  const serverRes = await fetch('/api/support/claim-ticket', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ticketId: ticket.id,
      staffUid: staff.uid,
      staffName: staff.name,
      staffEmail: staff.email,
      staffRole: staff.role,
      currentAssignedTo: ticket.assignedTo || null,
      currentAssignedStaffName: ticket.assignedStaffName || '',
      ticketNumber: ticket.ticketNumber || ticket.id,
      ticketUserId: ticket.userId,
      ticketUserName: ticket.userName,
      ticketUserEmail: ticket.userEmail,
      ticketSubject: ticket.subject,
      ticketDescription: ticket.description,
      ticketCategory: ticket.category || 'General Enquiry',
    }),
  });

  const serverData = await serverRes.json().catch(() => ({}));
  if (!serverRes.ok || !serverData.claimed) {
    throw new Error(
      serverData.error ||
        'Ticket has already been claimed by another support staff member.'
    );
  }

  const claimedAtISO = String(
    serverData.claimedAtISO || new Date().toISOString()
  );

  // 2. Atomic Firestore transaction on `/supportTickets/{ticketId}`
  try {
    const ticketRef = doc(db, 'supportTickets', ticket.id);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ticketRef);
      if (snap.exists()) {
        const data = snap.data();
        const existingOwner = data.assignedTo ? String(data.assignedTo).trim() : '';
        if (existingOwner && existingOwner !== staff.uid) {
          throw new Error(
            `This ticket has already been claimed by ${
              data.assignedStaffName || existingOwner
            }.`
          );
        }
        tx.update(ticketRef, {
          assignedTo: staff.uid,
          assignedStaffName: staff.name.slice(0, 80),
          assignedStaffEmail: staff.email.slice(0, 120),
          assignedToEmail: staff.email.slice(0, 120),
          claimedAt: claimedAtISO,
          claimedAtISO,
          status: 'in_progress',
          updatedAt: serverTimestamp(),
          updatedAtISO: claimedAtISO,
        });
      } else {
        // Hydrate the document in /supportTickets/{ticketId} if it only existed in legacy collection
        tx.set(
          ticketRef,
          {
            id: ticket.id,
            ticketNumber: ticket.ticketNumber || ticket.id,
            userId: ticket.userId,
            userName: (ticket.userName || 'Customer').slice(0, 80),
            userEmail: (ticket.userEmail || '').slice(0, 120),
            subject: (ticket.subject || 'Support Request').slice(0, 160),
            description: (ticket.description || '').slice(0, 2000),
            category: ticket.category || 'General Enquiry',
            status: 'in_progress',
            assignedTo: staff.uid,
            assignedStaffName: staff.name.slice(0, 80),
            assignedStaffEmail: staff.email.slice(0, 120),
            assignedToEmail: staff.email.slice(0, 120),
            claimedAt: claimedAtISO,
            claimedAtISO,
            relatedBookingId: ticket.bookingId || '',
            relatedProductId: ticket.productId || '',
            bookingId: ticket.bookingId || '',
            productId: ticket.productId || '',
            resolutionSummary: ticket.resolutionSummary || '',
            internalNotes: '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdAtISO: ticket.createdAtISO || claimedAtISO,
            updatedAtISO: claimedAtISO,
          },
          { merge: true }
        );
      }
    });

    const historyId =
      serverData.historyEvent?.id || `HIS-${Date.now()}-claimed`;
    const batch = writeBatch(db);
    batch.set(doc(db, 'supportTickets', ticket.id, 'history', historyId), {
      id: historyId,
      ticketId: ticket.id,
      actorId: staff.uid,
      actorName: staff.name.slice(0, 80),
      actorEmail: staff.email.slice(0, 120),
      actorRole: 'staff',
      action: 'claimed',
      summary: `Ticket claimed by ${staff.name} (${staff.email}). Status changed to In Progress.`,
      createdAt: serverTimestamp(),
      createdAtISO: claimedAtISO,
    });
    batch.update(doc(db, 'support_tickets', ticket.id), {
      status: 'in_progress',
      assignedToEmail: staff.email.slice(0, 120),
      updatedAt: serverTimestamp(),
    });
    if (serverData.notification?.id && ticket.userId) {
      batch.set(doc(db, 'supportNotifications', serverData.notification.id), {
        id: serverData.notification.id,
        recipientUid: ticket.userId,
        recipientRole: 'customer',
        type: 'ticket_claimed',
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber || ticket.id,
        title: String(
          serverData.notification.title ||
            `Ticket Claimed (${ticket.ticketNumber || ticket.id})`
        ).slice(0, 160),
        body: String(
          serverData.notification.message ||
            `${staff.name} has claimed your support ticket.`
        ).slice(0, 500),
        read: false,
        createdAt: serverTimestamp(),
        createdAtISO: claimedAtISO,
      });
    }
    await batch.commit();
  } catch (err) {
    if (err instanceof Error && err.message.includes('already been claimed')) {
      throw err;
    }
  }

  const updatedTicket: SupportTicketRecord = {
    ...ticket,
    assignedTo: staff.uid,
    assignedStaffName: staff.name,
    assignedStaffEmail: staff.email,
    assignedToEmail: staff.email,
    claimedAtISO,
    status: 'in_progress',
    updatedAtISO: claimedAtISO,
  };

  const historyEvent: SupportTicketHistoryEntry = serverData.historyEvent || {
    id: `HIS-${Date.now()}-claim`,
    ticketId: ticket.id,
    actorId: staff.uid,
    actorName: staff.name,
    actorEmail: staff.email,
    actorRole: staff.role,
    action: 'claimed',
    previousValue: 'Unclaimed (open)',
    newValue: `${staff.name} (in_progress)`,
    summary: `Ticket claimed by ${staff.name} (${staff.email}). Status changed to In Progress.`,
    createdAtISO: claimedAtISO,
  };

  return {
    updatedTicket,
    historyEvent,
    auditLog: serverData.auditLog,
  };
}

/**
 * Posts a reply (customer or claimed staff/override admin) or an internal staff note.
 * Writes to BOTH `/api/support/tickets/:ticketId/message` and Firestore `/supportTickets/{ticketId}/messages/{messageId}`
 * with a shared deterministic message ID so both Customer (`My Support`) and Admin (`Support -> Tickets`)
 * see the exact same public conversation in real time without duplicates.
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
  const { ticket } = params;
  const isInternal =
    params.senderRole === 'customer' ? false : Boolean(params.isInternal);
  const cleanMessage = params.message.trim();
  const attachments = (params.attachments || []).slice(
    0,
    MAX_ATTACHMENTS_PER_TICKET
  );
  const deterministicMsgId = `MSG-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;

  const res = await fetch(
    `/api/support/tickets/${encodeURIComponent(ticket.id)}/message`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messageId: deterministicMsgId,
        senderId: params.senderId,
        senderName: params.senderName,
        senderEmail: params.senderEmail,
        senderRole: params.senderRole,
        actorAdminRole: params.actorAdminRole || params.senderRole,
        message: cleanMessage,
        attachments,
        isInternal,
        currentAssignedTo: ticket.assignedTo || null,
        ticketUserId: ticket.userId,
        ticketUserName: ticket.userName,
        ticketUserEmail: ticket.userEmail,
        ticketSubject: ticket.subject,
        ticketNumber: ticket.ticketNumber || ticket.id,
        ticketCategory: ticket.category || 'General Enquiry',
      }),
    }
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to post ticket message.');
  }

  const nowISO = String(data.message?.createdAtISO || new Date().toISOString());
  const resolvedRole: 'customer' | 'staff' | 'admin' =
    params.senderRole === 'customer'
      ? 'customer'
      : data.message?.senderRole === 'admin' || params.senderRole === 'admin'
      ? 'admin'
      : 'staff';

  const messageRecord: SupportTicketMessageRecord = {
    id: String(data.message?.id || deterministicMsgId),
    ticketId: ticket.id,
    senderId: params.senderId,
    senderName: params.senderName,
    senderEmail: params.senderEmail,
    senderRole: resolvedRole,
    message: cleanMessage || `Attached ${attachments.length} file(s)`,
    attachments,
    isInternal,
    createdAtISO: nowISO,
  };

  const historyEvent: SupportTicketHistoryEntry = data.historyEvent || {
    id: `HIS-${Date.now()}-msg`,
    ticketId: ticket.id,
    actorId: params.senderId,
    actorName: params.senderName,
    actorEmail: params.senderEmail,
    actorRole: params.actorAdminRole || params.senderRole,
    action: isInternal ? 'internal_note_added' : 'replied',
    summary: isInternal
      ? `Internal staff note added by ${params.senderName}.`
      : `${params.senderName} posted a reply.`,
    createdAtISO: nowISO,
  };

  // Persist message & history to Firestore subcollections for real-time onSnapshot listeners
  try {
    const ticketRef = doc(db, 'supportTickets', ticket.id);

    // If customer is replying to waiting_for_user, transition status -> in_progress; otherwise update timestamps
    if (params.senderRole === 'customer') {
      const nextCustomerStatus: SupportTicketStatus =
        ticket.status === 'waiting_for_user' ? 'in_progress' : ticket.status;
      try {
        await updateDoc(ticketRef, {
          status: nextCustomerStatus,
          updatedAt: serverTimestamp(),
          updatedAtISO: nowISO,
        });
      } catch {
        // Ignore if parent doc was only in server store
      }
    } else if (!isInternal) {
      try {
        await updateDoc(ticketRef, {
          ...(ticket.firstResponseAtISO
            ? {}
            : { firstResponseAt: nowISO, firstResponseAtISO: nowISO }),
          updatedAt: serverTimestamp(),
          updatedAtISO: nowISO,
        });
      } catch {
        // Ensure parent doc exists if admin is replying to a ticket that wasn't in /supportTickets yet
        try {
          await setDoc(
            ticketRef,
            {
              id: ticket.id,
              ticketNumber: ticket.ticketNumber || ticket.id,
              userId: ticket.userId,
              userName: (ticket.userName || 'Customer').slice(0, 80),
              userEmail: (ticket.userEmail || '').slice(0, 120),
              subject: (ticket.subject || 'Support Request').slice(0, 160),
              description: (ticket.description || '').slice(0, 2000),
              category: ticket.category || 'General Enquiry',
              status: ticket.status || 'in_progress',
              assignedTo: ticket.assignedTo || params.senderId,
              assignedStaffName:
                ticket.assignedStaffName || params.senderName.slice(0, 80),
              assignedStaffEmail:
                ticket.assignedToEmail || params.senderEmail.slice(0, 120),
              assignedToEmail:
                ticket.assignedToEmail || params.senderEmail.slice(0, 120),
              relatedBookingId: ticket.bookingId || '',
              relatedProductId: ticket.productId || '',
              bookingId: ticket.bookingId || '',
              productId: ticket.productId || '',
              resolutionSummary: ticket.resolutionSummary || '',
              internalNotes: '',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              createdAtISO: ticket.createdAtISO || nowISO,
              updatedAtISO: nowISO,
            },
            { merge: true }
          );
        } catch {
          // Ignore
        }
      }
    }

    // Write the message document to `/supportTickets/{ticketId}/messages/{messageRecord.id}`
    await setDoc(
      doc(db, 'supportTickets', ticket.id, 'messages', messageRecord.id),
      {
        id: messageRecord.id,
        ticketId: ticket.id,
        senderId: params.senderId,
        senderName: params.senderName.slice(0, 80),
        senderEmail: params.senderEmail.slice(0, 120),
        senderRole: resolvedRole,
        message: messageRecord.message.slice(0, 2000),
        attachments: JSON.stringify(attachments).slice(0, 400000),
        isInternal,
        createdAt: serverTimestamp(),
        createdAtISO: nowISO,
      }
    );

    // If internal note, also store in dedicated staff-only `/privateNotes` subcollection
    if (isInternal) {
      try {
        await setDoc(
          doc(
            db,
            'supportTickets',
            ticket.id,
            'privateNotes',
            messageRecord.id
          ),
          {
            id: messageRecord.id,
            ticketId: ticket.id,
            authorId: params.senderId,
            authorName: params.senderName.slice(0, 80),
            authorEmail: params.senderEmail.slice(0, 120),
            note: messageRecord.message.slice(0, 2000),
            createdAt: serverTimestamp(),
            createdAtISO: nowISO,
          }
        );
      } catch {
        // Ignore
      }
    }

    // Write history event
    try {
      await setDoc(
        doc(db, 'supportTickets', ticket.id, 'history', historyEvent.id),
        {
          id: historyEvent.id,
          ticketId: ticket.id,
          actorId: params.senderId,
          actorName: params.senderName.slice(0, 80),
          actorEmail: params.senderEmail.slice(0, 120),
          actorRole: resolvedRole,
          action: historyEvent.action,
          summary: historyEvent.summary.slice(0, 500),
          createdAt: serverTimestamp(),
          createdAtISO: nowISO,
        }
      );
    } catch {
      // Ignore
    }

    // Write in-app notification to Firestore `/supportNotifications/{notifId}` ONLY for public replies (never internal notes)
    if (!isInternal && data.notification?.id) {
      try {
        await setDoc(doc(db, 'supportNotifications', data.notification.id), {
          id: String(data.notification.id),
          recipientUid: String(data.notification.recipientUid),
          recipientRole:
            data.notification.recipientRole === 'staff' ? 'staff' : 'customer',
          type: String(
            data.notification.type ||
              (params.senderRole === 'customer'
                ? 'customer_replied'
                : 'staff_replied')
          ),
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber || ticket.id,
          title: String(data.notification.title || 'Support Update').slice(
            0,
            160
          ),
          body: String(data.notification.message || '').slice(0, 500),
          read: false,
          createdAt: serverTimestamp(),
          createdAtISO: nowISO,
        });
      } catch {
        // Ignore if notification write is handled by server state
      }
    }
  } catch {
    // Non-fatal if Firestore rules/offline mode block secondary write
  }

  const nextStatus: SupportTicketStatus =
    params.senderRole === 'customer' && ticket.status === 'waiting_for_user'
      ? 'in_progress'
      : ticket.status;

  const updatedTicket: SupportTicketRecord = {
    ...ticket,
    status: nextStatus,
    firstResponseAtISO:
      !isInternal && params.senderRole !== 'customer' && !ticket.firstResponseAtISO
        ? nowISO
        : ticket.firstResponseAtISO,
    internalNotes: isInternal
      ? data.ticket?.internalNotes ||
        (ticket.internalNotes
          ? `${ticket.internalNotes}\n[${params.senderName}]: ${cleanMessage}`
          : `[${params.senderName}]: ${cleanMessage}`)
      : ticket.internalNotes,
    updatedAtISO: nowISO,
  };

  return {
    messageRecord,
    historyEvent,
    updatedTicket,
  };
}

/**
 * Updates ticket status, resolution summary, or executes an Administrator Override
 * (reassigning staff, releasing claim to Unclaimed, or reopening a resolved/closed ticket).
 * Persists website-based in-app notifications (including the resolution summary on closure) to Firestore.
 */
export async function updateSupportTicketWorkflowOrOverride(params: {
  ticket: SupportTicketRecord;
  actor: AdminRegistryRecord;
  operation:
    | 'status_change'
    | 'reassign'
    | 'release_claim'
    | 'reopen'
    | 'update_notes';
  newStatus?: SupportTicketStatus;
  newAssignedTo?: string | null;
  newAssignedStaffName?: string;
  newAssignedToEmail?: string;
  resolutionSummary?: string;
  internalNotes?: string;
}): Promise<{
  updatedTicket: SupportTicketRecord;
  historyEvent: SupportTicketHistoryEntry;
  auditLog?: AdminAuditLogRecord;
}> {
  const { ticket, actor, operation } = params;

  const res = await fetch(
    `/api/support/tickets/${encodeURIComponent(ticket.id)}/update`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actorUid: actor.uid,
        actorName: actor.name,
        actorEmail: actor.email,
        actorRole: actor.role,
        operation,
        newStatus: params.newStatus,
        newAssignedTo: params.newAssignedTo,
        newAssignedStaffName: params.newAssignedStaffName,
        newAssignedToEmail: params.newAssignedToEmail,
        resolutionSummary: params.resolutionSummary,
        internalNotes: params.internalNotes,
        currentAssignedTo: ticket.assignedTo || null,
      }),
    }
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update support ticket.');
  }

  const nowISO = new Date().toISOString();
  const updatedTicket: SupportTicketRecord = {
    ...ticket,
    status: (data.ticket?.status ||
      params.newStatus ||
      ticket.status) as SupportTicketStatus,
    assignedTo:
      data.ticket?.assignedTo !== undefined
        ? data.ticket.assignedTo
        : operation === 'release_claim'
        ? null
        : params.newAssignedTo !== undefined
        ? params.newAssignedTo
        : ticket.assignedTo,
    assignedStaffName:
      data.ticket?.assignedStaffName !== undefined
        ? data.ticket.assignedStaffName
        : operation === 'release_claim'
        ? ''
        : params.newAssignedStaffName ?? ticket.assignedStaffName,
    assignedStaffEmail:
      data.ticket?.assignedToEmail !== undefined
        ? data.ticket.assignedToEmail
        : operation === 'release_claim'
        ? ''
        : params.newAssignedToEmail ?? ticket.assignedToEmail,
    assignedToEmail:
      data.ticket?.assignedToEmail !== undefined
        ? data.ticket.assignedToEmail
        : operation === 'release_claim'
        ? ''
        : params.newAssignedToEmail ?? ticket.assignedToEmail,
    resolutionSummary:
      params.resolutionSummary !== undefined
        ? params.resolutionSummary.trim()
        : data.ticket?.resolutionSummary ?? ticket.resolutionSummary,
    internalNotes:
      params.internalNotes !== undefined
        ? params.internalNotes
        : data.ticket?.internalNotes ?? ticket.internalNotes,
    reassignmentCount:
      data.ticket?.reassignmentCount ??
      (operation === 'reassign'
        ? (ticket.reassignmentCount || 0) + 1
        : ticket.reassignmentCount || 0),
    resolvedAtISO:
      params.newStatus === 'resolved' || params.newStatus === 'closed'
        ? ticket.resolvedAtISO || nowISO
        : ticket.resolvedAtISO,
    closedAtISO:
      params.newStatus === 'closed' ? nowISO : ticket.closedAtISO,
    reopenedAtISO:
      operation === 'reopen' ? nowISO : ticket.reopenedAtISO,
    updatedAtISO: nowISO,
  };

  // Persist to Firestore
  try {
    const batch = writeBatch(db);
    const ticketRef = doc(db, 'supportTickets', ticket.id);
    batch.update(ticketRef, {
      status: updatedTicket.status,
      assignedTo: updatedTicket.assignedTo || null,
      assignedStaffName: (updatedTicket.assignedStaffName || '').slice(0, 80),
      assignedStaffEmail: (updatedTicket.assignedToEmail || '').slice(0, 120),
      assignedToEmail: (updatedTicket.assignedToEmail || '').slice(0, 120),
      resolutionSummary: (updatedTicket.resolutionSummary || '').slice(0, 2000),
      resolvedAt: updatedTicket.resolvedAtISO || '',
      closedAt: updatedTicket.closedAtISO || '',
      updatedAt: serverTimestamp(),
      updatedAtISO: nowISO,
    });

    if (data.historyEvent?.id) {
      batch.set(
        doc(db, 'supportTickets', ticket.id, 'history', data.historyEvent.id),
        {
          id: data.historyEvent.id,
          ticketId: ticket.id,
          actorId: actor.uid,
          actorName: actor.name.slice(0, 80),
          actorEmail: actor.email.slice(0, 120),
          actorRole: canAdminOverrideSupportTicket(actor) ? 'admin' : 'staff',
          action: data.historyEvent.action,
          summary: String(data.historyEvent.summary || '').slice(0, 500),
          createdAt: serverTimestamp(),
          createdAtISO: nowISO,
        }
      );
    }

    if (data.notification?.id) {
      batch.set(doc(db, 'supportNotifications', data.notification.id), {
        id: String(data.notification.id),
        recipientUid: String(data.notification.recipientUid),
        recipientRole:
          data.notification.recipientRole === 'staff' ? 'staff' : 'customer',
        type: String(data.notification.type || 'status_changed'),
        ticketId: ticket.id,
        ticketNumber: updatedTicket.ticketNumber || ticket.id,
        title: String(data.notification.title || 'Ticket Status Updated').slice(
          0,
          160
        ),
        body: String(data.notification.message || '').slice(0, 500),
        ...(data.notification.resolutionSummary ||
        updatedTicket.resolutionSummary
          ? {
              resolutionSummary: String(
                data.notification.resolutionSummary ||
                  updatedTicket.resolutionSummary
              ).slice(0, 2000),
            }
          : {}),
        read: false,
        createdAt: serverTimestamp(),
        createdAtISO: nowISO,
      });
    }

    batch.update(doc(db, 'support_tickets', ticket.id), {
      status:
        updatedTicket.status === 'waiting_for_user'
          ? 'in_progress'
          : updatedTicket.status,
      assignedToEmail: (updatedTicket.assignedToEmail || '').slice(0, 120),
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
  } catch {
    // Non-fatal if Firestore rules/offline mode block secondary write
  }

  return {
    updatedTicket,
    historyEvent: data.historyEvent,
    auditLog: data.auditLog,
  };
}

function mergeAndDeduplicateMessages(params: {
  ticket: SupportTicketRecord;
  viewerRole: 'customer' | 'staff' | 'admin';
  firestoreMessages: SupportTicketMessageRecord[];
  serverMessages: SupportTicketMessageRecord[];
}): SupportTicketMessageRecord[] {
  const { ticket, viewerRole, firestoreMessages, serverMessages } = params;
  const msgMap = new Map<string, SupportTicketMessageRecord>();

  // Helper to deduplicate messages that might have been saved with different IDs but identical content/sender
  const contentSignatures = new Set<string>();

  const addMessage = (m: SupportTicketMessageRecord) => {
    if (viewerRole === 'customer' && m.isInternal) return;
    if (!m.message && (!m.attachments || m.attachments.length === 0)) return;

    const existing = msgMap.get(m.id);
    if (existing) {
      msgMap.set(m.id, {
        ...existing,
        ...m,
        attachments:
          m.attachments && m.attachments.length > 0
            ? m.attachments
            : existing.attachments,
      });
      return;
    }

    const minuteBucket = (m.createdAtISO || '').slice(0, 16);
    const sig = `${m.senderId}:${m.senderRole}:${m.isInternal}:${m.message.trim()}:${minuteBucket}`;
    if (contentSignatures.has(sig)) {
      return;
    }
    contentSignatures.add(sig);
    msgMap.set(m.id, m);
  };

  for (const m of firestoreMessages) {
    addMessage(m);
  }
  for (const m of serverMessages) {
    addMessage(m);
  }

  // Ensure initial ticket description is always shown as the first message if not already present
  const hasCustomerOpeningMessage = Array.from(msgMap.values()).some(
    (m) =>
      m.senderRole === 'customer' &&
      (m.id.endsWith('-init') ||
        m.message.trim() === (ticket.description || '').trim())
  );

  if (ticket.description && !hasCustomerOpeningMessage) {
    msgMap.set(`${ticket.id}-init`, {
      id: `${ticket.id}-init`,
      ticketId: ticket.id,
      senderId: ticket.userId,
      senderName: ticket.userName,
      senderEmail: ticket.userEmail,
      senderRole: 'customer',
      message: ticket.description,
      attachments: ticket.attachments || [],
      isInternal: false,
      createdAtISO: ticket.createdAtISO,
    });
  }

  return Array.from(msgMap.values()).sort((a, b) =>
    a.createdAtISO.localeCompare(b.createdAtISO)
  );
}

/**
 * Fetches messages and audit history for a specific ticket.
 * Strictly filters out `isInternal === true` messages and `internal_note_added` history when `viewerRole === 'customer'`.
 */
export async function fetchTicketConversationAndHistory(params: {
  ticket: SupportTicketRecord;
  viewerUid: string;
  viewerRole: 'customer' | 'staff' | 'admin';
}): Promise<{
  messages: SupportTicketMessageRecord[];
  history: SupportTicketHistoryEntry[];
  ticketSnapshot?: SupportTicketRecord;
}> {
  const { ticket, viewerUid, viewerRole } = params;
  const roleParam = viewerRole === 'customer' ? 'customer' : 'admin';

  const [msgSnap, histSnap, serverRes] = await Promise.all([
    getDocs(collection(db, 'supportTickets', ticket.id, 'messages')).catch(
      () => null
    ),
    getDocs(collection(db, 'supportTickets', ticket.id, 'history')).catch(
      () => null
    ),
    fetch(
      `/api/support/state?uid=${encodeURIComponent(viewerUid)}&role=${roleParam}`
    )
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null),
  ]);

  const firestoreMessages: SupportTicketMessageRecord[] = [];
  if (msgSnap) {
    for (const d of msgSnap.docs) {
      const data = d.data();
      const isInternal = Boolean(data.isInternal);
      if (viewerRole === 'customer' && isInternal) continue;
      firestoreMessages.push({
        id: String(data.id || d.id),
        ticketId: ticket.id,
        senderId: String(data.senderId || ''),
        senderName: String(data.senderName || 'User'),
        senderEmail: String(data.senderEmail || ''),
        senderRole:
          (data.senderRole as 'customer' | 'staff' | 'admin') || 'customer',
        message: String(data.message || ''),
        attachments: parseFirestoreAttachmentsField(data.attachments),
        isInternal,
        createdAtISO: formatTimestamp(
          data.createdAt,
          String(data.createdAtISO || ticket.createdAtISO)
        ),
      });
    }
  }

  const serverMessages: SupportTicketMessageRecord[] = [];
  const rawServerMsgs: Record<string, unknown>[] =
    serverRes?.messagesByTicket?.[ticket.id] || [];
  for (const m of rawServerMsgs) {
    const isInternal = Boolean(m.isInternal);
    if (viewerRole === 'customer' && isInternal) continue;
    serverMessages.push({
      id: String(m.id),
      ticketId: ticket.id,
      senderId: String(m.senderId || ''),
      senderName: String(m.senderName || 'User'),
      senderEmail: String(m.senderEmail || ''),
      senderRole:
        (m.senderRole as 'customer' | 'staff' | 'admin') || 'customer',
      message: String(m.message || ''),
      attachments: parseFirestoreAttachmentsField(m.attachments),
      isInternal,
      createdAtISO: String(m.createdAtISO || new Date().toISOString()),
    });
  }

  const messages = mergeAndDeduplicateMessages({
    ticket,
    viewerRole,
    firestoreMessages,
    serverMessages,
  });

  const histMap = new Map<string, SupportTicketHistoryEntry>();
  if (histSnap) {
    for (const d of histSnap.docs) {
      const data = d.data();
      const action = String(
        data.action || 'status_changed'
      ) as SupportTicketHistoryEntry['action'];
      if (viewerRole === 'customer' && action === 'internal_note_added') {
        continue;
      }
      histMap.set(d.id, {
        id: String(data.id || d.id),
        ticketId: ticket.id,
        actorId: String(data.actorId || ''),
        actorName: String(data.actorName || ''),
        actorEmail: String(data.actorEmail || ''),
        actorRole: String(data.actorRole || ''),
        action,
        summary: String(data.summary || ''),
        previousValue: data.previousValue
          ? String(data.previousValue)
          : undefined,
        newValue: data.newValue ? String(data.newValue) : undefined,
        createdAtISO: formatTimestamp(
          data.createdAt,
          String(data.createdAtISO || ticket.createdAtISO)
        ),
      });
    }
  }

  const serverHist: Record<string, unknown>[] =
    serverRes?.historyByTicket?.[ticket.id] || [];
  for (const h of serverHist) {
    const action = String(
      h.action || 'status_changed'
    ) as SupportTicketHistoryEntry['action'];
    if (viewerRole === 'customer' && action === 'internal_note_added') continue;
    const id = String(h.id);
    if (!histMap.has(id)) {
      histMap.set(id, {
        id,
        ticketId: ticket.id,
        actorId: String(h.actorId || ''),
        actorName: String(h.actorName || ''),
        actorEmail: String(h.actorEmail || ''),
        actorRole: String(h.actorRole || ''),
        action,
        summary: String(h.summary || ''),
        previousValue: h.previousValue ? String(h.previousValue) : undefined,
        newValue: h.newValue ? String(h.newValue) : undefined,
        createdAtISO: String(h.createdAtISO || new Date().toISOString()),
      });
    }
  }

  const rawServerTicket = serverRes?.tickets?.[ticket.id] as
    | Record<string, unknown>
    | undefined;
  const ticketSnapshot = rawServerTicket
    ? normalizeTicketRecord(ticket.id, rawServerTicket, rawServerTicket)
    : undefined;
  if (ticketSnapshot && viewerRole === 'customer') {
    ticketSnapshot.internalNotes = '';
  }

  return {
    messages,
    history: Array.from(histMap.values()).sort((a, b) =>
      b.createdAtISO.localeCompare(a.createdAtISO)
    ),
    ticketSnapshot,
  };
}

/**
 * Real-time subscription (`onSnapshot` + server state sync) for a selected ticket's
 * conversation messages, history, and parent ticket fields.
 * Guarantees two-way live updates between Customer (`My Support`) and Admin (`Support -> Tickets`)
 * without manual page refresh.
 */
export function subscribeToTicketConversation(
  params: {
    ticket: SupportTicketRecord;
    viewerUid: string;
    viewerRole: 'customer' | 'staff' | 'admin';
  },
  onUpdate: (payload: {
    messages: SupportTicketMessageRecord[];
    history: SupportTicketHistoryEntry[];
    ticketSnapshot?: SupportTicketRecord;
  }) => void
): () => void {
  const { ticket, viewerUid, viewerRole } = params;
  if (!ticket?.id) return () => {};

  let active = true;
  let latestFirestoreMsgs: SupportTicketMessageRecord[] | null = null;

  const triggerSync = async () => {
    if (!active) return;
    try {
      const res = await fetchTicketConversationAndHistory({
        ticket,
        viewerUid,
        viewerRole,
      });
      if (!active) return;

      if (latestFirestoreMsgs && latestFirestoreMsgs.length > 0) {
        const merged = mergeAndDeduplicateMessages({
          ticket: res.ticketSnapshot || ticket,
          viewerRole,
          firestoreMessages: latestFirestoreMsgs,
          serverMessages: res.messages,
        });
        onUpdate({
          messages: merged,
          history: res.history,
          ticketSnapshot: res.ticketSnapshot,
        });
      } else {
        onUpdate(res);
      }
    } catch {
      // Ignore transient network errors
    }
  };

  void triggerSync();

  // 1. Real-time Firestore listener on `/supportTickets/{ticketId}/messages`
  const messagesColRef = collection(
    db,
    'supportTickets',
    ticket.id,
    'messages'
  );
  const unsubMessages = onSnapshot(
    messagesColRef,
    (snap) => {
      if (!active) return;
      const list: SupportTicketMessageRecord[] = [];
      for (const d of snap.docs) {
        const data = d.data();
        const isInternal = Boolean(data.isInternal);
        if (viewerRole === 'customer' && isInternal) continue;
        list.push({
          id: String(data.id || d.id),
          ticketId: ticket.id,
          senderId: String(data.senderId || ''),
          senderName: String(data.senderName || 'User'),
          senderEmail: String(data.senderEmail || ''),
          senderRole:
            (data.senderRole as 'customer' | 'staff' | 'admin') || 'customer',
          message: String(data.message || ''),
          attachments: parseFirestoreAttachmentsField(data.attachments),
          isInternal,
          createdAtISO: formatTimestamp(
            data.createdAt,
            String(data.createdAtISO || new Date().toISOString())
          ),
        });
      }
      latestFirestoreMsgs = list;
      void triggerSync();
    },
    () => {
      // Fallback to server sync if Firestore snapshot is restricted/offline
    }
  );

  // 2. Real-time Firestore listener on parent ticket document `/supportTickets/{ticketId}`
  const ticketDocRef = doc(db, 'supportTickets', ticket.id);
  const unsubTicket = onSnapshot(
    ticketDocRef,
    () => {
      if (!active) return;
      void triggerSync();
    },
    () => {
      // Ignore
    }
  );

  // 3. Fast background sync with server state for cross-session updates
  const pollInterval = setInterval(() => {
    void triggerSync();
  }, 2000);

  return () => {
    active = false;
    clearInterval(pollInterval);
    unsubMessages();
    unsubTicket();
  };
}

/**
 * Fetches in-app support notifications for a customer or staff member from both Firestore (`/supportNotifications`)
 * and the synchronized server state store.
 */
export async function fetchSupportNotifications(params: {
  uid: string;
  role: 'customer' | 'staff';
}): Promise<AppNotificationItem[]> {
  if (!params.uid) return [];
  const cleanUid = params.uid.trim();
  const isStaff = params.role === 'staff';

  const [firestoreSnap, serverRes] = await Promise.all([
    (isStaff
      ? getDocs(collection(db, 'supportNotifications'))
      : getDocs(
          query(
            collection(db, 'supportNotifications'),
            where('recipientUid', '==', cleanUid)
          )
        )
    ).catch(() => null),
    fetch(
      `/api/support/state?uid=${encodeURIComponent(cleanUid)}&role=${
        isStaff ? 'admin' : 'customer'
      }`
    )
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null),
  ]);

  const map = new Map<string, AppNotificationItem>();

  if (firestoreSnap) {
    for (const d of firestoreSnap.docs) {
      const n = d.data();
      const recipientUid = String(n.recipientUid || '');
      const recipientRole =
        n.recipientRole === 'staff' ? 'staff' : 'customer';

      if (isStaff) {
        if (
          recipientRole !== 'staff' ||
          (recipientUid !== cleanUid && recipientUid !== 'ALL_SUPPORT_STAFF')
        ) {
          continue;
        }
      } else {
        if (recipientRole !== 'customer' || recipientUid !== cleanUid) {
          continue;
        }
      }

      const id = String(n.id || d.id);
      map.set(id, {
        id,
        title: String(n.title || 'Support Update'),
        body: String(n.body || n.message || ''),
        type: n.type ? String(n.type) : undefined,
        resolutionSummary: n.resolutionSummary
          ? String(n.resolutionSummary)
          : undefined,
        ticketId: String(n.ticketId || ''),
        ticketNumber: String(n.ticketNumber || n.ticketId || ''),
        recipientUid,
        recipientRole,
        timestampISO: formatTimestamp(
          n.createdAt,
          String(n.createdAtISO || new Date().toISOString())
        ),
        read: Boolean(n.read),
      });
    }
  }

  const serverList: Record<string, unknown>[] = Array.isArray(
    serverRes?.notifications
  )
    ? serverRes.notifications
    : [];

  for (const n of serverList) {
    const id = String(n.id || '');
    if (!id) continue;
    const recipientUid = String(n.recipientUid || '');
    const recipientRole = n.recipientRole === 'staff' ? 'staff' : 'customer';

    if (isStaff) {
      if (
        recipientRole !== 'staff' ||
        (recipientUid !== cleanUid && recipientUid !== 'ALL_SUPPORT_STAFF')
      ) {
        continue;
      }
    } else {
      if (recipientRole !== 'customer' || recipientUid !== cleanUid) {
        continue;
      }
    }

    const existing = map.get(id);
    map.set(id, {
      id,
      title: String(n.title || existing?.title || 'Support Update'),
      body: String(n.message || n.body || existing?.body || ''),
      type: n.type ? String(n.type) : existing?.type,
      resolutionSummary: n.resolutionSummary
        ? String(n.resolutionSummary)
        : existing?.resolutionSummary,
      ticketId: String(n.ticketId || existing?.ticketId || ''),
      ticketNumber: String(
        n.ticketNumber || n.ticketId || existing?.ticketNumber || ''
      ),
      recipientUid,
      recipientRole,
      timestampISO: String(
        n.createdAtISO || existing?.timestampISO || new Date().toISOString()
      ),
      read: Boolean(n.read || existing?.read),
    });
  }

  return Array.from(map.values()).sort((a, b) =>
    b.timestampISO.localeCompare(a.timestampISO)
  );
}

/**
 * Subscribes in real time (`onSnapshot` on `/supportNotifications` + server sync)
 * to support notifications for a customer or staff member.
 */
export function subscribeToSupportNotifications(
  params: {
    uid: string;
    role: 'customer' | 'staff';
  },
  onNotificationsChanged: (notifications: AppNotificationItem[]) => void
): () => void {
  const { uid, role } = params;
  if (!uid) return () => {};

  let active = true;
  const refresh = async () => {
    if (!active) return;
    try {
      const list = await fetchSupportNotifications({ uid, role });
      if (active) {
        onNotificationsChanged(list);
      }
    } catch {
      // Ignore transient errors
    }
  };

  void refresh();

  const notifQuery =
    role === 'staff'
      ? collection(db, 'supportNotifications')
      : query(
          collection(db, 'supportNotifications'),
          where('recipientUid', '==', uid)
        );

  const unsubFirestore = onSnapshot(
    notifQuery,
    () => {
      if (active) void refresh();
    },
    () => {
      // Fallback to poll if offline
    }
  );

  const pollInterval = setInterval(() => {
    void refresh();
  }, 2500);

  return () => {
    active = false;
    clearInterval(pollInterval);
    unsubFirestore();
  };
}

/**
 * Marks a single support notification or all support notifications for the current user as read
 * in both Firestore (`/supportNotifications`) and the backend store.
 */
export async function markSupportNotificationRead(params: {
  notificationId?: string;
  recipientUid: string;
  role: 'customer' | 'staff';
}): Promise<void> {
  const { notificationId, recipientUid, role } = params;
  if (!recipientUid) return;

  try {
    await fetch('/api/support/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notificationId: notificationId || '',
        recipientUid,
        role,
      }),
    });
  } catch {
    // Non-fatal
  }

  if (notificationId) {
    try {
      await updateDoc(doc(db, 'supportNotifications', notificationId), {
        read: true,
      });
    } catch {
      // Ignore if notification document only existed in server store
    }
  }
}
