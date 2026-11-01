import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  Check,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Inbox,
  LifeBuoy,
  Maximize2,
  MessageSquare,
  Paperclip,
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';
import {
  AppNotificationItem,
  BorrowBoxUserProfile,
  ProductListing,
  RentalBookingRecord,
  SupportAttachmentItem,
  SupportTicketCategory,
  SupportTicketHistoryEntry,
  SupportTicketMessageRecord,
  SupportTicketRecord,
} from '../types/marketplace';
import { PageRoute } from '../components/Navbar';
import {
  MAX_ATTACHMENTS_PER_TICKET,
  SUPPORT_TICKET_CATEGORIES,
  createCustomerSupportTicket,
  fetchCustomerSupportTickets,
  isImageAttachment,
  isPdfAttachment,
  markSupportNotificationRead,
  postSupportTicketReplyOrNote,
  subscribeToCustomerSupportTickets,
  subscribeToSupportNotifications,
  subscribeToTicketConversation,
  uploadSupportAttachment,
} from '../services/supportTicketService';

interface MySupportPageProps {
  userProfile: BorrowBoxUserProfile | null;
  isAuthenticated?: boolean;
  userBookings: RentalBookingRecord[];
  listings?: ProductListing[];
  userListings?: ProductListing[];
  initialTicketId?: string;
  initialBookingId?: string;
  initialProductId?: string;
  initialSubject?: string;
  isAuthorizedAdmin?: boolean;
  onNavigate: (route: PageRoute) => void;
  onOpenAuthModal?: (mode: 'signin' | 'register') => void;
  onNotify?: (message: string, tone?: 'success' | 'info' | 'warning') => void;
  onNotificationsLoaded?: (supportNotifs: AppNotificationItem[]) => void;
}

type SupportTab = 'active' | 'resolved' | 'create';

interface AttachmentUploadEntry {
  localId: string;
  file: File;
  name: string;
  sizeBytes: number;
  status: 'uploading' | 'completed' | 'failed';
  progress: number;
  error?: string;
  uploadedItem?: SupportAttachmentItem;
}

function getStatusBadgeStyle(status: SupportTicketRecord['status']): string {
  switch (status) {
    case 'open':
      return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
    case 'in_progress':
      return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
    case 'waiting_for_user':
      return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    case 'resolved':
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    case 'closed':
      return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
    default:
      return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
  }
}

function formatStatusLabel(status: SupportTicketRecord['status']): string {
  switch (status) {
    case 'open':
      return 'Open · Queued';
    case 'in_progress':
      return 'In Progress';
    case 'waiting_for_user':
      return 'Action Needed · Waiting for You';
    case 'resolved':
      return 'Resolved';
    case 'closed':
      return 'Closed';
    default:
      return status;
  }
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export const MySupportPage: React.FC<MySupportPageProps> = ({
  userProfile,
  isAuthenticated: isAuthenticatedProp,
  userBookings,
  listings: listingsProp,
  userListings,
  initialTicketId,
  initialBookingId = '',
  initialProductId = '',
  initialSubject = '',
  onNavigate,
  onOpenAuthModal = () => onNavigate({ page: 'login' }),
  onNotify = () => {},
  onNotificationsLoaded,
}) => {
  const isAuthenticated = isAuthenticatedProp ?? Boolean(userProfile);
  const listings = listingsProp || userListings || [];
  const [activeTab, setActiveTab] = useState<SupportTab>(
    initialBookingId || initialProductId || initialSubject ? 'create' : 'active'
  );
  const [tickets, setTickets] = useState<SupportTicketRecord[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(
    initialTicketId || null
  );

  // Website Confirmation Banner when Customer Creates a Ticket
  const [createdTicketConfirmation, setCreatedTicketConfirmation] =
    useState<SupportTicketRecord | null>(null);

  // Customer In-App Support Notifications (Real-Time)
  const [supportNotifications, setSupportNotifications] = useState<
    AppNotificationItem[]
  >([]);

  // Selected Ticket Conversation & History
  const [messages, setMessages] = useState<SupportTicketMessageRecord[]>([]);
  const [history, setHistory] = useState<SupportTicketHistoryEntry[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);

  // Create Ticket Form State (Priority removed)
  const [subject, setSubject] = useState(initialSubject);
  const [category, setCategory] = useState<SupportTicketCategory>(
    initialBookingId ? 'Booking & Handover' : 'General Enquiry'
  );
  const [relatedBookingId, setRelatedBookingId] = useState(initialBookingId);
  const [relatedProductId, setRelatedProductId] = useState(initialProductId);
  const [description, setDescription] = useState('');
  const [createUploadEntries, setCreateUploadEntries] = useState<
    AttachmentUploadEntry[]
  >([]);
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Reply Composer State
  const [replyText, setReplyText] = useState('');
  const [replyUploadEntries, setReplyUploadEntries] = useState<
    AttachmentUploadEntry[]
  >([]);
  const [sendingReply, setSendingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  // Lightbox Modal State for Image Attachments
  const [lightboxAttachment, setLightboxAttachment] =
    useState<SupportAttachmentItem | null>(null);

  // Sync selectedTicketId & tab when initialTicketId prop changes (e.g. clicking a header notification)
  useEffect(() => {
    if (!initialTicketId) return;
    setSelectedTicketId(initialTicketId);
    const matching = tickets.find(
      (t) => t.id === initialTicketId || t.ticketNumber === initialTicketId
    );
    if (matching) {
      setSelectedTicketId(matching.id);
      if (['resolved', 'closed'].includes(matching.status)) {
        setActiveTab('resolved');
      } else {
        setActiveTab('active');
      }
    }
  }, [initialTicketId, tickets]);

  const loadCustomerTickets = async () => {
    if (!userProfile?.uid) return;
    setLoadingTickets(true);
    try {
      const list = await fetchCustomerSupportTickets(userProfile.uid);
      setTickets(list);
      if (!selectedTicketId && list.length > 0 && activeTab !== 'create') {
        setSelectedTicketId(list[0].id);
      }
    } finally {
      setLoadingTickets(false);
    }
  };

  // Real-time subscription to customer's tickets
  useEffect(() => {
    if (!isAuthenticated || !userProfile?.uid) {
      setTickets([]);
      return;
    }
    setLoadingTickets(true);
    const unsub = subscribeToCustomerSupportTickets(
      userProfile.uid,
      (liveTickets) => {
        setTickets(liveTickets);
        setLoadingTickets(false);
        setSelectedTicketId((prev) => {
          if (prev && liveTickets.some((t) => t.id === prev)) return prev;
          if (liveTickets.length > 0 && activeTab !== 'create') {
            return liveTickets[0].id;
          }
          return prev;
        });
      }
    );
    return () => unsub();
  }, [isAuthenticated, userProfile?.uid]);

  // Real-time subscription to customer's in-app support notifications
  useEffect(() => {
    if (!isAuthenticated || !userProfile?.uid) {
      setSupportNotifications([]);
      return;
    }
    const unsub = subscribeToSupportNotifications(
      { uid: userProfile.uid, role: 'customer' },
      (liveNotifs) => {
        setSupportNotifications(liveNotifs);
        onNotificationsLoaded?.(liveNotifs);
      }
    );
    return () => unsub();
  }, [isAuthenticated, userProfile?.uid]);

  const handleOpenNotificationTicket = async (notif: AppNotificationItem) => {
    if (userProfile?.uid && !notif.read) {
      setSupportNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      );
      await markSupportNotificationRead({
        notificationId: notif.id,
        recipientUid: userProfile.uid,
        role: 'customer',
      });
    }

    const targetTicketId = notif.ticketId || notif.ticketNumber;
    if (!targetTicketId) return;

    const targetTicket = tickets.find(
      (t) => t.id === targetTicketId || t.ticketNumber === targetTicketId
    );
    if (targetTicket) {
      setSelectedTicketId(targetTicket.id);
      if (['resolved', 'closed'].includes(targetTicket.status)) {
        setActiveTab('resolved');
      } else {
        setActiveTab('active');
      }
      onNavigate({ page: 'support', ticketId: targetTicket.id });
    } else {
      setSelectedTicketId(targetTicketId);
      setActiveTab('active');
      onNavigate({ page: 'support', ticketId: targetTicketId });
    }
  };

  const handleMarkSingleNotificationRead = async (
    e: React.MouseEvent,
    notif: AppNotificationItem
  ) => {
    e.stopPropagation();
    if (!userProfile?.uid || notif.read) return;
    setSupportNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
    );
    await markSupportNotificationRead({
      notificationId: notif.id,
      recipientUid: userProfile.uid,
      role: 'customer',
    });
  };

  const handleMarkAllNotificationsRead = async () => {
    if (!userProfile?.uid) return;
    setSupportNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await markSupportNotificationRead({
      recipientUid: userProfile.uid,
      role: 'customer',
    });
  };

  const selectedTicket = useMemo(
    () => tickets.find((t) => t.id === selectedTicketId) || null,
    [tickets, selectedTicketId]
  );

  // Real-time subscription to selected ticket's conversation & history
  useEffect(() => {
    if (!selectedTicket || !userProfile?.uid) {
      setMessages([]);
      setHistory([]);
      return;
    }

    setLoadingThread(true);
    const unsub = subscribeToTicketConversation(
      {
        ticket: selectedTicket,
        viewerUid: userProfile.uid,
        viewerRole: 'customer',
      },
      (res) => {
        setMessages(res.messages.filter((m) => !m.isInternal));
        setHistory(
          res.history.filter((h) => h.action !== 'internal_note_added')
        );
        if (res.ticketSnapshot) {
          setTickets((prev) =>
            prev.map((t) =>
              t.id === res.ticketSnapshot!.id
                ? { ...t, ...res.ticketSnapshot, internalNotes: '' }
                : t
            )
          );
        }
        setLoadingThread(false);
      }
    );

    return () => {
      unsub();
    };
  }, [selectedTicket?.id, userProfile?.uid]);

  const activeTickets = useMemo(
    () =>
      tickets.filter((t) =>
        ['open', 'in_progress', 'waiting_for_user', 'resolved'].includes(
          t.status
        )
      ),
    [tickets]
  );

  const resolvedTickets = useMemo(
    () => tickets.filter((t) => t.status === 'closed'),
    [tickets]
  );

  // Attachment upload helpers with progress, error state, retry, and removal
  const executeAttachmentUpload = async (
    localId: string,
    file: File,
    target: 'create' | 'reply'
  ) => {
    if (!userProfile?.uid) return;
    const setEntries =
      target === 'create' ? setCreateUploadEntries : setReplyUploadEntries;

    setEntries((prev) =>
      prev.map((entry) =>
        entry.localId === localId
          ? { ...entry, status: 'uploading', progress: 5, error: undefined }
          : entry
      )
    );

    try {
      const uploaded = await uploadSupportAttachment(
        file,
        userProfile.uid,
        (pct) => {
          setEntries((prev) =>
            prev.map((entry) =>
              entry.localId === localId
                ? {
                    ...entry,
                    status: 'uploading',
                    progress: Math.max(entry.progress, pct),
                  }
                : entry
            )
          );
        }
      );

      setEntries((prev) =>
        prev.map((entry) =>
          entry.localId === localId
            ? {
                ...entry,
                status: 'completed',
                progress: 100,
                uploadedItem: uploaded,
                error: undefined,
              }
            : entry
        )
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Upload failed. Click Retry or remove the file.';
      setEntries((prev) =>
        prev.map((entry) =>
          entry.localId === localId
            ? {
                ...entry,
                status: 'failed',
                progress: 0,
                error: errorMessage,
              }
            : entry
        )
      );
    }
  };

  const handleSelectFiles = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'create' | 'reply'
  ) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0 || !userProfile) return;

    const currentEntries =
      target === 'create' ? createUploadEntries : replyUploadEntries;
    const setEntries =
      target === 'create' ? setCreateUploadEntries : setReplyUploadEntries;
    const setErr = target === 'create' ? setFormError : setReplyError;

    setErr(null);

    const incomingFiles: File[] = Array.from(fileList);
    const remainingSlots = MAX_ATTACHMENTS_PER_TICKET - currentEntries.length;

    if (remainingSlots <= 0) {
      setErr(
        `Maximum ${MAX_ATTACHMENTS_PER_TICKET} attachments allowed per ticket.`
      );
      e.target.value = '';
      return;
    }

    if (incomingFiles.length > remainingSlots) {
      setErr(
        `Only ${remainingSlots} more file(s) can be added (max ${MAX_ATTACHMENTS_PER_TICKET} attachments).`
      );
    }

    const filesToQueue = incomingFiles.slice(0, remainingSlots);
    const newEntries: AttachmentUploadEntry[] = filesToQueue.map(
      (file, index) => ({
        localId: `UP-${Date.now()}-${index}-${Math.random()
          .toString(36)
          .slice(2, 6)}`,
        file,
        name: file.name,
        sizeBytes: file.size,
        status: 'uploading',
        progress: 0,
      })
    );

    setEntries((prev) => [...prev, ...newEntries]);
    e.target.value = '';

    for (const item of newEntries) {
      void executeAttachmentUpload(item.localId, item.file, target);
    }
  };

  const handleRetryAttachment = (
    localId: string,
    target: 'create' | 'reply'
  ) => {
    const entries =
      target === 'create' ? createUploadEntries : replyUploadEntries;
    const targetEntry = entries.find((item) => item.localId === localId);
    if (!targetEntry) return;
    void executeAttachmentUpload(
      targetEntry.localId,
      targetEntry.file,
      target
    );
  };

  const handleRemoveAttachment = (
    localId: string,
    target: 'create' | 'reply'
  ) => {
    const setEntries =
      target === 'create' ? setCreateUploadEntries : setReplyUploadEntries;
    setEntries((prev) => prev.filter((item) => item.localId !== localId));
  };

  const hasPendingCreateUploads = createUploadEntries.some(
    (item) => item.status === 'uploading'
  );
  const hasFailedCreateUploads = createUploadEntries.some(
    (item) => item.status === 'failed'
  );

  const hasPendingReplyUploads = replyUploadEntries.some(
    (item) => item.status === 'uploading'
  );
  const hasFailedReplyUploads = replyUploadEntries.some(
    (item) => item.status === 'failed'
  );

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    setFormError(null);

    if (hasPendingCreateUploads) {
      setFormError('Please wait for attachment uploads to finish before submitting.');
      return;
    }

    if (hasFailedCreateUploads) {
      setFormError(
        'Please retry or remove failed attachments before submitting your ticket.'
      );
      return;
    }

    if (subject.trim().length < 4) {
      setFormError('Please enter a clear subject (at least 4 characters).');
      return;
    }
    if (description.trim().length < 10) {
      setFormError(
        'Please describe your issue in detail (at least 10 characters).'
      );
      return;
    }

    const completedAttachments = createUploadEntries
      .filter((item) => item.status === 'completed' && item.uploadedItem)
      .map((item) => item.uploadedItem!);

    setSubmittingTicket(true);
    try {
      const created = await createCustomerSupportTicket({
        userId: userProfile.uid,
        userName: userProfile.name,
        userEmail: userProfile.email,
        subject: subject.trim(),
        category,
        description: description.trim(),
        bookingId: relatedBookingId,
        productId: relatedProductId,
        attachments: completedAttachments,
      });

      setTickets((prev) => [
        created,
        ...prev.filter((t) => t.id !== created.id),
      ]);
      setSelectedTicketId(created.id);
      setCreatedTicketConfirmation(created);
      setActiveTab('active');
      setSubject('');
      setDescription('');
      setCreateUploadEntries([]);
      onNotify(
        `Support Ticket ${created.ticketNumber} created successfully in BorrowBox.`,
        'success'
      );
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to create support ticket.'
      );
    } finally {
      setSubmittingTicket(false);
    }
  };

  const handleSendCustomerReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || !selectedTicket) return;
    setReplyError(null);

    if (hasPendingReplyUploads) {
      setReplyError('Please wait for attachment uploads to complete first.');
      return;
    }

    if (hasFailedReplyUploads) {
      setReplyError('Please retry or remove failed attachments before sending.');
      return;
    }

    const completedAttachments = replyUploadEntries
      .filter((item) => item.status === 'completed' && item.uploadedItem)
      .map((item) => item.uploadedItem!);

    const cleanText = replyText.trim();
    if (!cleanText && completedAttachments.length === 0) return;

    setSendingReply(true);
    try {
      const res = await postSupportTicketReplyOrNote({
        ticket: selectedTicket,
        senderId: userProfile.uid,
        senderName: userProfile.name,
        senderEmail: userProfile.email,
        senderRole: 'customer',
        message:
          cleanText || `Attached ${completedAttachments.length} file(s)`,
        attachments: completedAttachments,
        isInternal: false,
      });

      setMessages((prev) => {
        if (prev.some((m) => m.id === res.messageRecord.id)) return prev;
        return [...prev, res.messageRecord];
      });
      setHistory((prev) => [res.historyEvent, ...prev]);
      setTickets((prev) =>
        prev.map((t) => (t.id === selectedTicket.id ? res.updatedTicket : t))
      );
      setReplyText('');
      setReplyUploadEntries([]);
      onNotify('Reply sent to BorrowBox Support.', 'success');
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Could not send reply.';
      setReplyError(msg);
      onNotify(msg, 'warning');
    } finally {
      setSendingReply(false);
    }
  };

  const renderAttachmentPreviewList = (
    attachments: SupportAttachmentItem[],
    contextKey: string
  ) => {
    if (!attachments || attachments.length === 0) return null;
    return (
      <div className="mt-2.5 space-y-2">
        <div className="flex flex-wrap gap-2.5">
          {attachments.map((att) => {
            const isImg = isImageAttachment(att);
            const isPdf = isPdfAttachment(att);
            const openUrl = att.url || att.downloadUrl || '';
            const dlUrl = openUrl.includes('?')
              ? `${openUrl}&download=1`
              : `${openUrl}?download=1`;

            if (isImg) {
              return (
                <div
                  key={`${contextKey}-${att.id}`}
                  className="group relative rounded-xl overflow-hidden border border-white/15 bg-slate-950/80 max-w-[220px]"
                >
                  <button
                    type="button"
                    onClick={() => setLightboxAttachment(att)}
                    className="block w-full text-left cursor-pointer focus:outline-none"
                    title={`Click to view larger: ${att.name}`}
                  >
                    <img
                      src={openUrl}
                      alt={att.name}
                      className="w-full h-32 object-cover group-hover:scale-[1.02] transition-transform"
                    />
                    <div className="px-2.5 py-1.5 flex items-center justify-between gap-2 text-[11px] text-slate-200 bg-slate-900/90">
                      <span className="truncate font-medium">{att.name}</span>
                      <Maximize2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    </div>
                  </button>
                </div>
              );
            }

            return (
              <div
                key={`${contextKey}-${att.id}`}
                className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-slate-950/80 border border-white/15 text-xs text-slate-200 min-w-[220px] max-w-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{att.name}</div>
                    <div className="text-[10px] text-slate-400">
                      {isPdf ? 'PDF Document' : 'Attachment'} ·{' '}
                      {formatBytes(att.sizeBytes)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href={openUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-[11px] font-semibold text-indigo-300"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Open</span>
                  </a>
                  <a
                    href={dlUrl}
                    download={att.name}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-[11px] font-medium text-slate-200"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderUploadEntriesList = (
    entries: AttachmentUploadEntry[],
    target: 'create' | 'reply'
  ) => {
    if (entries.length === 0) return null;
    return (
      <div className="space-y-2 pt-2">
        {entries.map((entry) => (
          <div
            key={entry.localId}
            className={`p-2.5 rounded-xl border text-xs flex flex-col gap-1.5 ${
              entry.status === 'failed'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                : entry.status === 'completed'
                ? 'bg-emerald-500/10 border-emerald-500/25 text-slate-200'
                : 'bg-slate-950 border-white/10 text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {entry.file.type.startsWith('image/') ? (
                  <ImageIcon className="w-4 h-4 text-indigo-400 shrink-0" />
                ) : (
                  <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                )}
                <span className="font-medium truncate">{entry.name}</span>
                <span className="text-[11px] font-mono text-slate-400 shrink-0">
                  ({formatBytes(entry.sizeBytes)})
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {entry.status === 'uploading' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono text-indigo-300">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Uploading {entry.progress}%</span>
                  </span>
                )}
                {entry.status === 'completed' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Completed (100%)</span>
                  </span>
                )}
                {entry.status === 'failed' && (
                  <>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-300">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Failed</span>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleRetryAttachment(entry.localId, target)
                      }
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-[11px] font-semibold text-rose-200 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Retry</span>
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(entry.localId, target)}
                  className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                  title="Remove attachment"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {entry.status === 'uploading' && (
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all duration-200"
                  style={{ width: `${Math.max(5, entry.progress)}%` }}
                />
              </div>
            )}

            {entry.status === 'failed' && entry.error && (
              <p className="text-[11px] text-rose-300">{entry.error}</p>
            )}
          </div>
        ))}
      </div>
    );
  };

  if (!isAuthenticated || !userProfile) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <div className="rounded-2xl bg-slate-900/90 border border-white/10 p-8 text-center space-y-5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto">
            <LifeBuoy className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            BorrowBox Customer Support Desk
          </h1>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Sign in to your BorrowBox account to create support tickets, attach
            handover photos or PDFs, and communicate with our support team.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onOpenAuthModal('signin')}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold cursor-pointer"
            >
              Sign In to Support
            </button>
            <button
              type="button"
              onClick={() => onNavigate({ page: 'home' })}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium cursor-pointer"
            >
              Back to Marketplace
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-white/10 rounded-2xl p-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
            <LifeBuoy className="w-4 h-4" />
            <span>BorrowBox Customer Support</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Support</h1>
          <p className="text-xs text-slate-400">
            Create support requests, track ticket progress, and communicate
            directly with assigned BorrowBox support staff.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => void loadCustomerTickets()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-medium text-slate-200 cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loadingTickets ? 'animate-spin' : ''}`}
            />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Support Ticket</span>
          </button>
        </div>
      </div>

      {/* Website Ticket Creation Confirmation Banner */}
      {createdTicketConfirmation && (
        <div
          data-testid="ticket-created-confirmation"
          className="rounded-2xl bg-emerald-500/10 border border-emerald-500/35 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="text-sm font-bold text-white">
                Support Ticket Created Successfully ·{' '}
                <span className="font-mono text-emerald-300">
                  {createdTicketConfirmation.ticketNumber ||
                    createdTicketConfirmation.id}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Your support request &ldquo;{createdTicketConfirmation.subject}
                &rdquo; ({createdTicketConfirmation.category}) is now active. Our
                support team has been notified inside BorrowBox and you will
                receive real-time in-app notifications here when a specialist
                claims, replies to, or resolves your ticket.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCreatedTicketConfirmation(null)}
            className="self-end sm:self-center p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
            aria-label="Dismiss ticket confirmation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Website-Based In-App Support Notifications Panel */}
      {supportNotifications.length > 0 && (
        <div
          data-testid="customer-support-notifications"
          className="rounded-2xl bg-slate-900/90 border border-white/10 p-4 space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                In-App Support Notifications
              </h2>
              {supportNotifications.filter((n) => !n.read).length > 0 && (
                <span
                  data-testid="customer-unread-notif-count"
                  className="px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-bold font-mono"
                >
                  {supportNotifications.filter((n) => !n.read).length} Unread
                </span>
              )}
            </div>
            {supportNotifications.some((n) => !n.read) && (
              <button
                type="button"
                onClick={() => void handleMarkAllNotificationsRead()}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-[11px] font-medium text-slate-200 cursor-pointer"
              >
                <Check className="w-3 h-3 text-emerald-400" />
                <span>Mark all as read</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
            {supportNotifications.slice(0, 8).map((notif) => (
              <div
                key={notif.id}
                role="button"
                tabIndex={0}
                onClick={() => void handleOpenNotificationTicket(notif)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    void handleOpenNotificationTicket(notif);
                  }
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                  notif.read
                    ? 'bg-slate-950/60 border-white/10 text-slate-300 hover:bg-slate-900'
                    : 'bg-indigo-500/10 border-indigo-500/40 text-white hover:bg-indigo-500/15'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                      )}
                      <span className="text-xs font-bold truncate">
                        {notif.title}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">
                      {notif.timestampISO.slice(0, 16).replace('T', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {notif.body}
                  </p>
                  {notif.resolutionSummary && (
                    <div className="mt-1.5 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-200">
                      <span className="font-bold text-emerald-300">
                        Resolution Summary:{' '}
                      </span>
                      {notif.resolutionSummary}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5 text-[11px]">
                  <span className="font-mono text-indigo-300 font-semibold">
                    Open Ticket {notif.ticketNumber || notif.ticketId} &rarr;
                  </span>
                  {!notif.read ? (
                    <button
                      type="button"
                      onClick={(e) =>
                        void handleMarkSingleNotificationRead(e, notif)
                      }
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-medium text-slate-200 cursor-pointer"
                    >
                      Mark Read
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-500">Read</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Primary Section Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
        <button
          type="button"
          onClick={() => {
            setActiveTab('active');
            if (activeTickets.length > 0) {
              setSelectedTicketId(activeTickets[0].id);
            }
          }}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'active'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-white/10'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Active Requests ({activeTickets.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('resolved');
            if (resolvedTickets.length > 0) {
              setSelectedTicketId(resolvedTickets[0].id);
            }
          }}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'resolved'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-white/10'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Resolved History ({resolvedTickets.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('create')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'create'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-white/10'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Support Ticket</span>
        </button>
      </div>

      {/* ====================================================================
          TAB 1: CREATE SUPPORT TICKET FORM (Priority Removed)
         ==================================================================== */}
      {activeTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={handleCreateTicket}
            className="lg:col-span-2 rounded-2xl bg-slate-900/90 border border-white/10 p-6 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="text-base font-bold text-white">
                  Submit a Support Request
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  All updates, staff replies, and resolution summaries are
                  delivered directly inside BorrowBox via real-time in-app
                  notifications.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('active')}
                className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Tickets</span>
              </button>
            </div>

            {formError && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as SupportTicketCategory)
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {SUPPORT_TICKET_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Related Booking (Optional)
                </label>
                <select
                  value={relatedBookingId}
                  onChange={(e) => setRelatedBookingId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">None / General Account Support</option>
                  {userBookings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.id} · {b.listingTitle} ({b.startDate})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary of your issue or request..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Related Product Listing (Optional)
                </label>
                <select
                  value={relatedProductId}
                  onChange={(e) => setRelatedProductId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">None</option>
                  {listings.slice(0, 30).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title} ({item.city})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Detailed Description *
              </label>
              <textarea
                rows={5}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide full details, handover codes, dates, or specific questions so our support specialist can resolve your request quickly..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* File Attachments Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  Attachments (Optional · JPEG, PNG, WebP or PDF up to 5 MB · Max{' '}
                  {MAX_ATTACHMENTS_PER_TICKET} files)
                </label>
                <label
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-medium text-slate-200 ${
                    createUploadEntries.length >= MAX_ATTACHMENTS_PER_TICKET
                      ? 'opacity-50 cursor-not-allowed'
                      : 'cursor-pointer'
                  }`}
                >
                  <Paperclip className="w-3.5 h-3.5 text-indigo-400" />
                  <span>
                    Attach Files ({createUploadEntries.length}/
                    {MAX_ATTACHMENTS_PER_TICKET})
                  </span>
                  <input
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                    disabled={
                      createUploadEntries.length >= MAX_ATTACHMENTS_PER_TICKET
                    }
                    onChange={(e) => handleSelectFiles(e, 'create')}
                    className="hidden"
                  />
                </label>
              </div>

              {renderUploadEntriesList(createUploadEntries, 'create')}
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setActiveTab('active')}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingTicket || hasPendingCreateUploads}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {submittingTicket
                    ? 'Creating Ticket...'
                    : hasPendingCreateUploads
                    ? 'Waiting for Uploads...'
                    : 'Submit Support Ticket'}
                </span>
              </button>
            </div>
          </form>

          {/* Right Column: Support Guidelines */}
          <div className="rounded-2xl bg-slate-900/90 border border-white/10 p-6 space-y-4 h-fit">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400">
              <ShieldCheck className="w-4 h-4" />
              <span>How BorrowBox Support Works</span>
            </div>
            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-white/10">
                <div className="font-semibold text-white mb-1">
                  1. Instant Ticket ID & On-Site Confirmation
                </div>
                <p className="text-slate-400">
                  Every request receives a unique ticket reference (e.g.{' '}
                  <span className="font-mono text-indigo-300">
                    BB-TKT-2026-XXXX
                  </span>
                  ) and an immediate confirmation in My Support.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-white/10">
                <div className="font-semibold text-white mb-1">
                  2. Single-Owner Staff Claiming
                </div>
                <p className="text-slate-400">
                  A dedicated BorrowBox support specialist claims your ticket and
                  takes personal responsibility through resolution.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-white/10">
                <div className="font-semibold text-white mb-1">
                  3. Two-Way Real-Time Conversation & Notifications
                </div>
                <p className="text-slate-400">
                  Reply directly in your ticket thread and share handover photos
                  or PDF receipts. Once closed, you receive an in-app
                  notification with the full Resolution Summary.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 2 & 3: ACTIVE REQUESTS & RESOLVED HISTORY + CONVERSATION VIEW
         ==================================================================== */}
      {(activeTab === 'active' || activeTab === 'resolved') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left List of Tickets */}
          <div className="lg:col-span-5 space-y-3">
            {(activeTab === 'active' ? activeTickets : resolvedTickets)
              .length === 0 ? (
              <div className="rounded-2xl bg-slate-900/90 border border-white/10 p-8 text-center space-y-3">
                <Inbox className="w-8 h-8 text-slate-500 mx-auto" />
                <div className="text-sm font-semibold text-white">
                  {activeTab === 'active'
                    ? 'No Active Support Requests'
                    : 'No Resolved Tickets Yet'}
                </div>
                <p className="text-xs text-slate-400">
                  {activeTab === 'active'
                    ? 'Need help with a rental booking, deposit, or listing? Create a support ticket anytime.'
                    : 'Completed and closed support tickets will appear here with their full resolution summary.'}
                </p>
                {activeTab === 'active' && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('create')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer mt-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Support Ticket</span>
                  </button>
                )}
              </div>
            ) : (
              (activeTab === 'active' ? activeTickets : resolvedTickets).map(
                (t) => {
                  const isSelected = selectedTicket?.id === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTicketId(t.id)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
                        isSelected
                          ? 'bg-slate-800/95 border-indigo-500/60 shadow-lg shadow-indigo-500/10'
                          : 'bg-slate-900/80 hover:bg-slate-800/60 border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-400">
                          {t.ticketNumber || t.id}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusBadgeStyle(
                            t.status
                          )}`}
                        >
                          {formatStatusLabel(t.status)}
                        </span>
                      </div>

                      <div className="text-sm font-bold text-white line-clamp-1">
                        {t.subject}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>{t.category || 'General Enquiry'}</span>
                        <span className="font-mono">
                          {t.createdAtISO.slice(0, 10)}
                        </span>
                      </div>

                      <div className="pt-1 border-t border-white/5 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                          <span>
                            {t.assignedStaffName
                              ? `Assigned: ${t.assignedStaffName}`
                              : 'Unclaimed · Queued for Staff'}
                          </span>
                        </span>
                        {t.bookingId && (
                          <span className="font-mono text-slate-400">
                            Booking: {t.bookingId}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                }
              )
            )}
          </div>

          {/* Right Conversation & Ticket Details Panel */}
          <div className="lg:col-span-7">
            {!selectedTicket ? (
              <div className="rounded-2xl bg-slate-900/90 border border-white/10 p-12 text-center space-y-2">
                <MessageSquare className="w-8 h-8 text-slate-500 mx-auto" />
                <div className="text-sm font-semibold text-white">
                  Select a Support Ticket
                </div>
                <p className="text-xs text-slate-400">
                  Choose any ticket on the left to view the conversation history,
                  assigned staff member, and resolution status.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl bg-slate-900/90 border border-white/10 overflow-hidden flex flex-col">
                {/* Ticket Header */}
                <div className="p-5 bg-slate-950/70 border-b border-white/10 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-1 rounded-lg">
                        {selectedTicket.ticketNumber || selectedTicket.id}
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${getStatusBadgeStyle(
                          selectedTicket.status
                        )}`}
                      >
                        {formatStatusLabel(selectedTicket.status)}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-slate-400">
                      Opened{' '}
                      {selectedTicket.createdAtISO
                        .slice(0, 16)
                        .replace('T', ' ')}
                    </span>
                  </div>

                  <h2 className="text-lg font-bold text-white">
                    {selectedTicket.subject}
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-white/10">
                      <div className="text-[10px] uppercase text-slate-400">
                        Category
                      </div>
                      <div className="font-semibold text-slate-200 mt-0.5">
                        {selectedTicket.category || 'General Enquiry'}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-white/10">
                      <div className="text-[10px] uppercase text-slate-400">
                        Assigned Staff
                      </div>
                      <div className="font-semibold text-cyan-300 mt-0.5">
                        {selectedTicket.assignedStaffName ||
                          'Awaiting Staff Claim'}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-white/10">
                      <div className="text-[10px] uppercase text-slate-400">
                        Related Booking / Item
                      </div>
                      <div className="font-mono text-slate-200 mt-0.5 truncate">
                        {selectedTicket.bookingId ||
                          selectedTicket.productId ||
                          'General Account'}
                      </div>
                    </div>
                  </div>

                  {/* Resolution Summary Banner when Resolved or Closed */}
                  {selectedTicket.resolutionSummary && (
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Official Resolution Summary</span>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed">
                        {selectedTicket.resolutionSummary}
                      </p>
                    </div>
                  )}
                </div>

                {/* Conversation Thread (Strictly public messages; internal notes never shown) */}
                <div className="p-5 space-y-4 max-h-[440px] overflow-y-auto">
                  {loadingThread && messages.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      Loading ticket conversation...
                    </div>
                  ) : (
                    messages
                      .filter((m) => !m.isInternal)
                      .map((msg) => {
                        const isCustomer = msg.senderRole === 'customer';
                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${
                              isCustomer ? 'items-end' : 'items-start'
                            }`}
                          >
                            <div
                              className={`max-w-[85%] rounded-2xl p-4 space-y-2 border ${
                                isCustomer
                                  ? 'bg-indigo-600/20 border-indigo-500/30 text-slate-100'
                                  : 'bg-slate-800/90 border-cyan-500/30 text-slate-100'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-4 text-[11px]">
                                <span
                                  className={`font-bold ${
                                    isCustomer
                                      ? 'text-indigo-300'
                                      : 'text-cyan-300'
                                  }`}
                                >
                                  {isCustomer
                                    ? `${msg.senderName} (You)`
                                    : `${msg.senderName} · BorrowBox Support`}
                                </span>
                                <span className="font-mono text-slate-400">
                                  {msg.createdAtISO
                                    .slice(0, 16)
                                    .replace('T', ' ')}
                                </span>
                              </div>
                              <p className="text-xs leading-relaxed whitespace-pre-wrap">
                                {msg.message}
                              </p>
                              {renderAttachmentPreviewList(
                                msg.attachments || [],
                                msg.id
                              )}
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>

                {/* Reply Composer (Available when ticket is not closed) */}
                {selectedTicket.status === 'closed' ? (
                  <div className="p-4 bg-slate-950/80 border-t border-white/10 text-center text-xs text-slate-400">
                    This support ticket is closed. If you need further help,
                    please create a new support ticket referencing{' '}
                    <span className="font-mono text-slate-200">
                      {selectedTicket.ticketNumber || selectedTicket.id}
                    </span>
                    .
                  </div>
                ) : (
                  <form
                    onSubmit={handleSendCustomerReply}
                    className="p-4 bg-slate-950/80 border-t border-white/10 space-y-3"
                  >
                    {selectedTicket.status === 'waiting_for_user' && (
                      <div className="px-3 py-2 rounded-lg bg-purple-500/15 border border-purple-500/30 text-[11px] text-purple-200">
                        Our support team is waiting for your response. Replying
                        below will automatically move your ticket back to{' '}
                        <strong>In Progress</strong>.
                      </div>
                    )}

                    {replyError && (
                      <div className="px-3 py-2 rounded-lg bg-rose-500/15 border border-rose-500/30 text-[11px] text-rose-200 flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{replyError}</span>
                      </div>
                    )}

                    <textarea
                      rows={3}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write a reply to BorrowBox Support..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                    />

                    {renderUploadEntriesList(replyUploadEntries, 'reply')}

                    <div className="flex items-center justify-between gap-2">
                      <label
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-medium text-slate-300 ${
                          replyUploadEntries.length >=
                          MAX_ATTACHMENTS_PER_TICKET
                            ? 'opacity-50 cursor-not-allowed'
                            : 'cursor-pointer'
                        }`}
                      >
                        <Paperclip className="w-3.5 h-3.5 text-indigo-400" />
                        <span>
                          Attach File ({replyUploadEntries.length}/
                          {MAX_ATTACHMENTS_PER_TICKET})
                        </span>
                        <input
                          type="file"
                          multiple
                          accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                          disabled={
                            replyUploadEntries.length >=
                            MAX_ATTACHMENTS_PER_TICKET
                          }
                          onChange={(e) => handleSelectFiles(e, 'reply')}
                          className="hidden"
                        />
                      </label>

                      <button
                        type="submit"
                        disabled={
                          sendingReply ||
                          hasPendingReplyUploads ||
                          (!replyText.trim() &&
                            replyUploadEntries.filter(
                              (i) => i.status === 'completed'
                            ).length === 0)
                        }
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>
                          {sendingReply
                            ? 'Sending...'
                            : hasPendingReplyUploads
                            ? 'Uploading...'
                            : 'Send Reply'}
                        </span>
                      </button>
                    </div>
                  </form>
                )}

                {/* Ticket Status Timeline */}
                {history.length > 0 && (
                  <div className="p-4 bg-slate-950/40 border-t border-white/10 space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Ticket Activity Log
                    </div>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {history.map((h) => (
                        <div
                          key={h.id}
                          className="flex items-center justify-between gap-2 text-[11px] text-slate-400"
                        >
                          <span className="truncate">{h.summary}</span>
                          <span className="font-mono shrink-0">
                            {h.createdAtISO.slice(0, 16).replace('T', ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lightbox Modal for Larger Image View */}
      {lightboxAttachment && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxAttachment(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-slate-900 border border-white/15 rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-white/10">
              <div className="text-xs font-semibold text-white truncate">
                {lightboxAttachment.name} (
                {formatBytes(lightboxAttachment.sizeBytes)})
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={
                    (lightboxAttachment.url || '').includes('?')
                      ? `${lightboxAttachment.url}&download=1`
                      : `${lightboxAttachment.url}?download=1`
                  }
                  download={lightboxAttachment.name}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
                <button
                  type="button"
                  onClick={() => setLightboxAttachment(null)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-4 flex items-center justify-center max-h-[80vh] overflow-auto bg-black/60">
              <img
                src={lightboxAttachment.url || lightboxAttachment.downloadUrl}
                alt={lightboxAttachment.name}
                className="max-w-full max-h-[72vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
