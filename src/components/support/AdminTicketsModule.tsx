import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Inbox,
  Lock,
  Mail,
  Maximize2,
  MessageSquare,
  Paperclip,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  Unlock,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import {
  AdminAuditLogRecord,
  AdminRegistryRecord,
  SupportAttachmentItem,
  SupportTicketHistoryEntry,
  SupportTicketMessageRecord,
  SupportTicketRecord,
  SupportTicketStatus,
} from '../../types/marketplace';
import {
  MAX_ATTACHMENTS_PER_TICKET,
  canAdminOverrideSupportTicket,
  canStaffModifyTicket,
  claimSupportTicketAtomic,
  isImageAttachment,
  isPdfAttachment,
  postSupportTicketReplyOrNote,
  retryTicketEmailNotification,
  subscribeToTicketConversation,
  updateSupportTicketWorkflowOrOverride,
  uploadSupportAttachment,
} from '../../services/supportTicketService';

interface AdminTicketsModuleProps {
  currentAdmin: AdminRegistryRecord;
  tickets: SupportTicketRecord[];
  admins: AdminRegistryRecord[];
  onTicketUpdated: (
    updatedTicket: SupportTicketRecord,
    auditLog?: AdminAuditLogRecord
  ) => void;
  onNotify: (message: string, tone?: 'success' | 'error' | 'info') => void;
}

type PrimaryTicketFilter = 'all' | 'unclaimed' | 'my_tickets' | 'resolved';

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

function getStatusBadgeStyle(status: SupportTicketStatus): string {
  switch (status) {
    case 'open':
      return 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30';
    case 'in_progress':
      return 'bg-[#06B6D4]/15 text-[#06B6D4] border-[#06B6D4]/30';
    case 'waiting_for_user':
      return 'bg-[#8B5CF6]/15 text-[#8B5CF6] border-[#8B5CF6]/30';
    case 'resolved':
      return 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30';
    case 'closed':
      return 'bg-white/[0.06] text-[#94A3B8] border-white/[0.12]';
    default:
      return 'bg-white/[0.06] text-[#94A3B8] border-white/[0.12]';
  }
}

function formatStatusLabel(status: SupportTicketStatus): string {
  switch (status) {
    case 'open':
      return 'OPEN';
    case 'in_progress':
      return 'IN PROGRESS';
    case 'waiting_for_user':
      return 'WAITING FOR USER';
    case 'resolved':
      return 'RESOLVED';
    case 'closed':
      return 'CLOSED';
    default:
      return String(status).toUpperCase();
  }
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export const AdminTicketsModule: React.FC<AdminTicketsModuleProps> = ({
  currentAdmin,
  tickets,
  admins,
  onTicketUpdated,
  onNotify,
}) => {
  // Primary filter & search state (Strictly 4 primary filters + 1 simple search field)
  const [primaryFilter, setPrimaryFilter] =
    useState<PrimaryTicketFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(
    tickets[0]?.id || null
  );

  // Selected Ticket Thread & History
  const [messages, setMessages] = useState<SupportTicketMessageRecord[]>([]);
  const [history, setHistory] = useState<SupportTicketHistoryEntry[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);

  // Workspace Action States
  const [claimingTicketId, setClaimingTicketId] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [retryingEmailEvent, setRetryingEmailEvent] = useState<
    'TICKET_OPENED' | 'TICKET_CLOSED' | null
  >(null);

  // Composer State (Public Reply vs Internal Note)
  const [composerMode, setComposerMode] = useState<'reply' | 'internal_note'>(
    'reply'
  );
  const [composerText, setComposerText] = useState('');
  const [replyUploadEntries, setReplyUploadEntries] = useState<
    AttachmentUploadEntry[]
  >([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Resolution Summary Draft
  const [resolutionSummaryDraft, setResolutionSummaryDraft] = useState('');

  // Admin Override Reassign Target State
  const [reassignStaffId, setReassignStaffId] = useState('');

  // Lightbox Modal State for Image Attachments
  const [lightboxAttachment, setLightboxAttachment] =
    useState<SupportAttachmentItem | null>(null);

  const hasAdminOverride = useMemo(
    () => canAdminOverrideSupportTicket(currentAdmin),
    [currentAdmin]
  );

  const activeSupportAdmins = useMemo(
    () => admins.filter((a) => a.status === 'active'),
    [admins]
  );

  // 4 Compact Statistics at the top
  const stats = useMemo(() => {
    const total = tickets.length;
    const unclaimed = tickets.filter(
      (t) =>
        !t.assignedTo && !['resolved', 'closed'].includes(t.status)
    ).length;
    const myTickets = tickets.filter(
      (t) =>
        t.assignedTo === currentAdmin.uid ||
        (!t.assignedTo &&
          t.assignedToEmail &&
          t.assignedToEmail.toLowerCase() === currentAdmin.email.toLowerCase())
    ).length;
    const resolved = tickets.filter((t) =>
      ['resolved', 'closed'].includes(t.status)
    ).length;

    return { total, unclaimed, myTickets, resolved };
  }, [tickets, currentAdmin]);

  // Filtered tickets based on the 4 primary filters & simple search field
  const filteredTickets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tickets.filter((t) => {
      // 1. Primary Filter
      if (primaryFilter === 'unclaimed') {
        if (t.assignedTo || ['resolved', 'closed'].includes(t.status)) {
          return false;
        }
      } else if (primaryFilter === 'my_tickets') {
        const isMine =
          t.assignedTo === currentAdmin.uid ||
          (!t.assignedTo &&
            t.assignedToEmail &&
            t.assignedToEmail.toLowerCase() ===
              currentAdmin.email.toLowerCase());
        if (!isMine) return false;
      } else if (primaryFilter === 'resolved') {
        if (!['resolved', 'closed'].includes(t.status)) return false;
      }

      // 2. Simple Search (Ticket ID, Customer name, Customer email, Subject)
      if (!q) return true;
      const ticketRef = (t.ticketNumber || t.id || '').toLowerCase();
      const customerName = (t.userName || '').toLowerCase();
      const customerEmail = (t.userEmail || '').toLowerCase();
      const subject = (t.subject || '').toLowerCase();

      return (
        ticketRef.includes(q) ||
        t.id.toLowerCase().includes(q) ||
        customerName.includes(q) ||
        customerEmail.includes(q) ||
        subject.includes(q)
      );
    });
  }, [tickets, primaryFilter, searchQuery, currentAdmin]);

  const selectedTicket = useMemo(
    () => tickets.find((t) => t.id === selectedTicketId) || null,
    [tickets, selectedTicketId]
  );

  useEffect(() => {
    if (!selectedTicket && filteredTickets.length > 0) {
      setSelectedTicketId(filteredTickets[0].id);
    }
  }, [filteredTickets, selectedTicket]);

  useEffect(() => {
    if (selectedTicket) {
      setResolutionSummaryDraft(selectedTicket.resolutionSummary || '');
      setReassignStaffId(selectedTicket.assignedTo || '');
      setReplyUploadEntries([]);
      setUploadError(null);
    }
  }, [selectedTicket?.id]);

  // Real-time subscription to selected ticket's conversation & history
  useEffect(() => {
    if (!selectedTicket) {
      setMessages([]);
      setHistory([]);
      return;
    }

    setLoadingThread(true);
    const unsub = subscribeToTicketConversation(
      {
        ticket: selectedTicket,
        viewerUid: currentAdmin.uid,
        viewerRole: hasAdminOverride ? 'admin' : 'staff',
      },
      (res) => {
        setMessages(res.messages);
        setHistory(res.history);
        if (res.ticketSnapshot) {
          onTicketUpdated({
            ...selectedTicket,
            ...res.ticketSnapshot,
          });
        }
        setLoadingThread(false);
      }
    );

    return () => {
      unsub();
    };
  }, [selectedTicket?.id, currentAdmin.uid, hasAdminOverride]);

  const canModifySelectedTicket = useMemo(() => {
    if (!selectedTicket) return false;
    return canStaffModifyTicket(currentAdmin, selectedTicket);
  }, [currentAdmin, selectedTicket]);

  const isSelectedClaimedByMe = useMemo(() => {
    if (!selectedTicket) return false;
    return Boolean(
      selectedTicket.assignedTo &&
        selectedTicket.assignedTo === currentAdmin.uid
    );
  }, [selectedTicket, currentAdmin.uid]);

  const isSelectedUnclaimed = useMemo(() => {
    if (!selectedTicket) return false;
    return !selectedTicket.assignedTo;
  }, [selectedTicket]);

  // Atomic Claim Handler
  const handleClaimTicket = async (ticketToClaim: SupportTicketRecord) => {
    setClaimingTicketId(ticketToClaim.id);
    try {
      const result = await claimSupportTicketAtomic({
        ticket: ticketToClaim,
        staff: currentAdmin,
      });
      onTicketUpdated(result.updatedTicket, result.auditLog);
      setSelectedTicketId(ticketToClaim.id);
      setHistory((prev) => [result.historyEvent, ...prev]);
      onNotify(
        `Ticket ${
          ticketToClaim.ticketNumber || ticketToClaim.id
        } claimed by you and moved to In Progress.`,
        'success'
      );
    } catch (err) {
      onNotify(
        err instanceof Error
          ? err.message
          : 'Could not claim ticket. Another staff member may have claimed it.',
        'error'
      );
    } finally {
      setClaimingTicketId(null);
    }
  };

  // Status Update Handler (In Progress, Waiting for User, Resolved, Closed)
  const handleStatusChange = async (nextStatus: SupportTicketStatus) => {
    if (!selectedTicket) return;

    if (nextStatus === 'closed') {
      const cleanSummary = resolutionSummaryDraft.trim();
      if (cleanSummary.length < 5) {
        onNotify(
          'A clear Resolution Summary (at least 5 characters) is required before closing a ticket.',
          'error'
        );
        return;
      }
    }

    setUpdatingStatus(true);
    try {
      const result = await updateSupportTicketWorkflowOrOverride({
        ticket: selectedTicket,
        actor: currentAdmin,
        operation: 'status_change',
        newStatus: nextStatus,
        resolutionSummary: resolutionSummaryDraft.trim(),
      });
      onTicketUpdated(result.updatedTicket, result.auditLog);
      if (result.historyEvent) {
        setHistory((prev) => [result.historyEvent, ...prev]);
      }

      if (nextStatus === 'closed') {
        onNotify(
          result.closedEmailDispatched
            ? `Ticket ${
                selectedTicket.ticketNumber || selectedTicket.id
              } closed and Resolution Summary email sent to ${
                selectedTicket.userEmail
              }.`
            : `Ticket ${
                selectedTicket.ticketNumber || selectedTicket.id
              } closed.`,
          'success'
        );
      } else {
        onNotify(
          `Ticket status updated to ${formatStatusLabel(nextStatus)}.`,
          'success'
        );
      }
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Failed to update ticket status.',
        'error'
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Admin Override: Reassign Ticket
  const handleAdminReassign = async () => {
    if (!selectedTicket || !hasAdminOverride || !reassignStaffId) return;
    const targetAdmin =
      activeSupportAdmins.find((a) => a.uid === reassignStaffId) ||
      activeSupportAdmins.find((a) => a.email === reassignStaffId);

    if (!targetAdmin) {
      onNotify('Select a valid support staff member to reassign.', 'error');
      return;
    }

    setUpdatingStatus(true);
    try {
      const result = await updateSupportTicketWorkflowOrOverride({
        ticket: selectedTicket,
        actor: currentAdmin,
        operation: 'reassign',
        newAssignedTo: targetAdmin.uid,
        newAssignedStaffName: targetAdmin.name,
        newAssignedToEmail: targetAdmin.email,
      });
      onTicketUpdated(result.updatedTicket, result.auditLog);
      if (result.historyEvent) {
        setHistory((prev) => [result.historyEvent, ...prev]);
      }
      onNotify(
        `Ticket reassigned to ${targetAdmin.name} (${targetAdmin.email}).`,
        'success'
      );
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Failed to reassign ticket.',
        'error'
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Admin Override: Release Claim back to Unclaimed Queue
  const handleAdminReleaseClaim = async () => {
    if (!selectedTicket || !hasAdminOverride) return;
    setUpdatingStatus(true);
    try {
      const result = await updateSupportTicketWorkflowOrOverride({
        ticket: selectedTicket,
        actor: currentAdmin,
        operation: 'release_claim',
      });
      onTicketUpdated(result.updatedTicket, result.auditLog);
      if (result.historyEvent) {
        setHistory((prev) => [result.historyEvent, ...prev]);
      }
      onNotify(
        `Claim released. Ticket ${
          selectedTicket.ticketNumber || selectedTicket.id
        } returned to Unclaimed queue.`,
        'info'
      );
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Failed to release claim.',
        'error'
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Admin Override: Reopen Resolved/Closed Ticket
  const handleAdminReopen = async () => {
    if (!selectedTicket || !hasAdminOverride) return;
    setUpdatingStatus(true);
    try {
      const result = await updateSupportTicketWorkflowOrOverride({
        ticket: selectedTicket,
        actor: currentAdmin,
        operation: 'reopen',
      });
      onTicketUpdated(result.updatedTicket, result.auditLog);
      if (result.historyEvent) {
        setHistory((prev) => [result.historyEvent, ...prev]);
      }
      onNotify(
        `Ticket ${
          selectedTicket.ticketNumber || selectedTicket.id
        } reopened by Admin Override.`,
        'success'
      );
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Failed to reopen ticket.',
        'error'
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Retry Automated Email Handler (TICKET_OPENED or TICKET_CLOSED)
  const handleRetryEmail = async (
    eventType: 'TICKET_OPENED' | 'TICKET_CLOSED'
  ) => {
    if (!selectedTicket) return;
    setRetryingEmailEvent(eventType);
    try {
      const result = await retryTicketEmailNotification({
        ticket: selectedTicket,
        eventType,
      });

      const updatedTicket: SupportTicketRecord =
        eventType === 'TICKET_OPENED'
          ? {
              ...selectedTicket,
              emailOpenedStatus: result.status,
              emailOpenedSentAtISO: result.sentAtISO,
              emailOpenedError: result.errorMessage || '',
            }
          : {
              ...selectedTicket,
              emailClosedStatus: result.status,
              emailClosedSentAtISO: result.sentAtISO,
              emailClosedError: result.errorMessage || '',
            };

      onTicketUpdated(updatedTicket);
      if (result.sent) {
        onNotify(
          `${
            eventType === 'TICKET_OPENED' ? 'Ticket Opened' : 'Ticket Closed'
          } email successfully delivered to ${selectedTicket.userEmail}.`,
          'success'
        );
      } else {
        onNotify(
          `Email retry failed: ${
            result.errorMessage || 'Check Resend configuration'
          }`,
          'error'
        );
      }
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Email retry failed.',
        'error'
      );
    } finally {
      setRetryingEmailEvent(null);
    }
  };

  // Attachment Upload Helpers with Progress, Error State, Retry, and Removal
  const executeAttachmentUpload = async (localId: string, file: File) => {
    setReplyUploadEntries((prev) =>
      prev.map((entry) =>
        entry.localId === localId
          ? { ...entry, status: 'uploading', progress: 5, error: undefined }
          : entry
      )
    );

    try {
      const uploaded = await uploadSupportAttachment(
        file,
        currentAdmin.uid,
        (pct) => {
          setReplyUploadEntries((prev) =>
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

      setReplyUploadEntries((prev) =>
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
      setReplyUploadEntries((prev) =>
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

  const handleSelectReplyFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    setUploadError(null);

    const incomingFiles: File[] = Array.from(fileList);
    const remainingSlots =
      MAX_ATTACHMENTS_PER_TICKET - replyUploadEntries.length;

    if (remainingSlots <= 0) {
      setUploadError(
        `Maximum ${MAX_ATTACHMENTS_PER_TICKET} attachments allowed per message.`
      );
      e.target.value = '';
      return;
    }

    if (incomingFiles.length > remainingSlots) {
      setUploadError(
        `Only ${remainingSlots} more file(s) can be added (max ${MAX_ATTACHMENTS_PER_TICKET} attachments).`
      );
    }

    const filesToQueue = incomingFiles.slice(0, remainingSlots);
    const newEntries: AttachmentUploadEntry[] = filesToQueue.map(
      (file, index) => ({
        localId: `ADM-UP-${Date.now()}-${index}-${Math.random()
          .toString(36)
          .slice(2, 6)}`,
        file,
        name: file.name,
        sizeBytes: file.size,
        status: 'uploading',
        progress: 0,
      })
    );

    setReplyUploadEntries((prev) => [...prev, ...newEntries]);
    e.target.value = '';

    for (const item of newEntries) {
      void executeAttachmentUpload(item.localId, item.file);
    }
  };

  const handleRetryAttachment = (localId: string) => {
    const targetEntry = replyUploadEntries.find(
      (item) => item.localId === localId
    );
    if (!targetEntry) return;
    void executeAttachmentUpload(targetEntry.localId, targetEntry.file);
  };

  const handleRemoveAttachment = (localId: string) => {
    setReplyUploadEntries((prev) =>
      prev.filter((item) => item.localId !== localId)
    );
  };

  const hasPendingUploads = replyUploadEntries.some(
    (item) => item.status === 'uploading'
  );
  const hasFailedUploads = replyUploadEntries.some(
    (item) => item.status === 'failed'
  );

  // Send Staff Reply or Add Internal Note
  const handleSendComposerMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    setUploadError(null);

    if (hasPendingUploads) {
      setUploadError('Please wait for attachment uploads to complete first.');
      return;
    }

    if (hasFailedUploads) {
      setUploadError('Please retry or remove failed attachments before sending.');
      return;
    }

    const completedAttachments = replyUploadEntries
      .filter((item) => item.status === 'completed' && item.uploadedItem)
      .map((item) => item.uploadedItem!);

    const cleanText = composerText.trim();
    if (!cleanText && completedAttachments.length === 0) return;

    setSendingMessage(true);
    try {
      const isInternalNote = composerMode === 'internal_note';
      const result = await postSupportTicketReplyOrNote({
        ticket: selectedTicket,
        senderId: currentAdmin.uid,
        senderName: currentAdmin.name,
        senderEmail: currentAdmin.email,
        senderRole: hasAdminOverride ? 'admin' : 'staff',
        actorAdminRole: currentAdmin.role,
        message:
          cleanText || `Attached ${completedAttachments.length} file(s)`,
        attachments: completedAttachments,
        isInternal: isInternalNote,
      });

      setMessages((prev) => {
        if (prev.some((m) => m.id === result.messageRecord.id)) return prev;
        return [...prev, result.messageRecord];
      });
      setHistory((prev) => [result.historyEvent, ...prev]);
      onTicketUpdated(result.updatedTicket);
      setComposerText('');
      setReplyUploadEntries([]);
      onNotify(
        isInternalNote
          ? 'Private internal staff note saved.'
          : `Reply sent to ${selectedTicket.userName}.`,
        'success'
      );
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Failed to post message.',
        'error'
      );
    } finally {
      setSendingMessage(false);
    }
  };

  const renderAttachmentPreviewList = (
    attachments: SupportAttachmentItem[],
    contextKey: string
  ) => {
    if (!attachments || attachments.length === 0) return null;
    return (
      <div className="mt-2 space-y-2">
        <div className="flex flex-wrap gap-2">
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
                  className="group relative rounded-xl overflow-hidden border border-white/[0.12] bg-[#0B0F19] max-w-[200px]"
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
                      className="w-full h-28 object-cover group-hover:scale-[1.02] transition-transform"
                    />
                    <div className="px-2 py-1 flex items-center justify-between gap-1.5 text-[10px] text-[#F8FAFC] bg-[#111827]">
                      <span className="truncate font-medium">{att.name}</span>
                      <Maximize2 className="w-3 h-3 text-[#06B6D4] shrink-0" />
                    </div>
                  </button>
                </div>
              );
            }

            return (
              <div
                key={`${contextKey}-${att.id}`}
                className="flex items-center justify-between gap-2.5 px-2.5 py-1.5 rounded-xl bg-[#0B0F19] border border-white/[0.12] text-[11px] text-[#F8FAFC] min-w-[210px]"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-3.5 h-3.5 text-[#06B6D4] shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{att.name}</div>
                    <div className="text-[10px] text-[#94A3B8]">
                      {isPdf ? 'PDF' : 'File'} · {formatBytes(att.sizeBytes)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={openUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#06B6D4]/15 hover:bg-[#06B6D4]/25 border border-[#06B6D4]/30 text-[10px] font-semibold text-[#06B6D4]"
                  >
                    <ExternalLink className="w-2.5 h-2.5" />
                    <span>Open</span>
                  </a>
                  <a
                    href={dlUrl}
                    download={att.name}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#161E2E] hover:bg-[#1D293B] border border-white/[0.1] text-[10px] font-medium text-[#F8FAFC]"
                  >
                    <Download className="w-2.5 h-2.5" />
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

  return (
    <div className="space-y-6">
      {/* ====================================================================
          1. FOUR COMPACT STATISTICS
         ==================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#161E2E] border border-white/[0.08]">
          <div className="flex items-center justify-between text-xs text-[#94A3B8]">
            <span>Total Tickets</span>
            <Inbox className="w-4 h-4 text-[#8B5CF6]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#F8FAFC] mt-1.5">
            {stats.total}
          </div>
          <div className="text-[11px] text-[#94A3B8] mt-0.5">
            All customer support requests
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#161E2E] border border-white/[0.08]">
          <div className="flex items-center justify-between text-xs text-[#94A3B8]">
            <span>Unclaimed</span>
            <Clock className="w-4 h-4 text-[#F59E0B]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#F59E0B] mt-1.5">
            {stats.unclaimed}
          </div>
          <div className="text-[11px] text-[#94A3B8] mt-0.5">
            Awaiting staff ownership claim
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#161E2E] border border-white/[0.08]">
          <div className="flex items-center justify-between text-xs text-[#94A3B8]">
            <span>My Tickets</span>
            <UserCheck className="w-4 h-4 text-[#06B6D4]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#06B6D4] mt-1.5">
            {stats.myTickets}
          </div>
          <div className="text-[11px] text-[#94A3B8] mt-0.5">
            Claimed by {currentAdmin.name}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#161E2E] border border-white/[0.08]">
          <div className="flex items-center justify-between text-xs text-[#94A3B8]">
            <span>Resolved</span>
            <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#22C55E] mt-1.5">
            {stats.resolved}
          </div>
          <div className="text-[11px] text-[#94A3B8] mt-0.5">
            Resolved & closed tickets
          </div>
        </div>
      </div>

      {/* ====================================================================
          2. PRIMARY FILTERS (4) & SIMPLE SEARCH FIELD
         ==================================================================== */}
      <div className="p-4 rounded-2xl bg-[#161E2E] border border-white/[0.08] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'all', label: `All Tickets (${stats.total})` },
              { id: 'unclaimed', label: `Unclaimed (${stats.unclaimed})` },
              { id: 'my_tickets', label: `My Tickets (${stats.myTickets})` },
              { id: 'resolved', label: `Resolved (${stats.resolved})` },
            ] as { id: PrimaryTicketFilter; label: string }[]
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setPrimaryFilter(f.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                primaryFilter === f.id
                  ? 'bg-[#8B5CF6] text-white'
                  : 'bg-[#111827] text-[#94A3B8] hover:text-[#F8FAFC] border border-white/[0.07]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Ticket ID, customer name, email, or subject..."
            className="w-full pl-9 pr-4 py-2 bg-[#111827] border border-white/[0.08] rounded-xl text-xs text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#8B5CF6]"
          />
        </div>
      </div>

      {/* ====================================================================
          3. CLEAN TICKET TABLE (8 Columns — Priority Removed)
         ==================================================================== */}
      <div className="rounded-2xl bg-[#161E2E] border border-white/[0.08] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] bg-[#111827] text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                <th className="py-3.5 px-4">Ticket ID</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Subject</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Assigned Staff</th>
                <th className="py-3.5 px-4">Created Date</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] text-xs">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-8 text-center text-[#94A3B8]"
                  >
                    No support tickets match the selected filter or search query.
                  </td>
                </tr>
              ) : (
                filteredTickets.map((t) => {
                  const isSelected = selectedTicket?.id === t.id;
                  const isUnclaimed = !t.assignedTo;
                  const isClaimedByMe = t.assignedTo === currentAdmin.uid;

                  return (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedTicketId(t.id)}
                      className={`transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#8B5CF6]/10'
                          : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-[#06B6D4] whitespace-nowrap">
                        {t.ticketNumber || t.id}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#F8FAFC]">
                          {t.userName}
                        </div>
                        <div className="font-mono text-[11px] text-[#94A3B8]">
                          {t.userEmail}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 max-w-[240px]">
                        <div className="font-semibold text-[#F8FAFC] truncate">
                          {t.subject}
                        </div>
                        {t.bookingId && (
                          <div className="font-mono text-[10px] text-[#94A3B8]">
                            Booking: {t.bookingId}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-[#94A3B8] whitespace-nowrap">
                        {t.category || 'General Enquiry'}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isUnclaimed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/25 text-[11px] font-medium">
                            Unclaimed
                          </span>
                        ) : (
                          <div>
                            <div className="font-semibold text-[#F8FAFC] flex items-center gap-1">
                              <span>
                                {t.assignedStaffName || t.assignedToEmail}
                              </span>
                              {isClaimedByMe && (
                                <span className="px-1.5 py-0.2 rounded bg-[#06B6D4]/20 text-[#06B6D4] text-[9px] font-mono">
                                  YOU
                                </span>
                              )}
                            </div>
                            <div className="font-mono text-[10px] text-[#94A3B8]">
                              {t.assignedToEmail}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#94A3B8] whitespace-nowrap">
                        {t.createdAtISO.slice(0, 10)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusBadgeStyle(
                            t.status
                          )}`}
                        >
                          {formatStatusLabel(t.status)}
                        </span>
                      </td>
                      <td
                        className="py-3.5 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isUnclaimed &&
                        !['resolved', 'closed'].includes(t.status) ? (
                          <button
                            type="button"
                            disabled={claimingTicketId === t.id}
                            onClick={() => void handleClaimTicket(t)}
                            className="px-3 py-1.5 rounded-lg bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
                          >
                            {claimingTicketId === t.id
                              ? 'Claiming...'
                              : 'Claim Ticket'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedTicketId(t.id)}
                            className="px-3 py-1.5 rounded-lg bg-[#111827] hover:bg-[#1D293B] border border-white/[0.08] text-xs font-medium text-[#F8FAFC] cursor-pointer"
                          >
                            {isSelected ? 'Viewing' : 'Open Workspace'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ====================================================================
          4. TWO-COLUMN TICKET WORKSPACE (Left: Conversation & Notes | Right: Metadata, Claiming & Admin Override)
         ==================================================================== */}
      {selectedTicket && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN (7 cols): Customer Request, Conversation Thread, Reply / Internal Note Composer */}
          <div className="lg:col-span-7 rounded-2xl bg-[#161E2E] border border-white/[0.08] overflow-hidden flex flex-col">
            {/* Workspace Header */}
            <div className="p-5 bg-[#111827] border-b border-white/[0.08] space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#06B6D4] bg-[#06B6D4]/10 border border-[#06B6D4]/30 px-2.5 py-1 rounded-lg">
                    {selectedTicket.ticketNumber || selectedTicket.id}
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${getStatusBadgeStyle(
                      selectedTicket.status
                    )}`}
                  >
                    {formatStatusLabel(selectedTicket.status)}
                  </span>
                </div>

                {/* Email Delivery Verification Badges */}
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border font-mono ${
                      selectedTicket.emailOpenedStatus === 'sent'
                        ? 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30'
                        : selectedTicket.emailOpenedStatus === 'failed'
                        ? 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30'
                        : 'bg-white/[0.05] text-[#94A3B8] border-white/[0.1]'
                    }`}
                  >
                    <Mail className="w-3 h-3" />
                    <span>
                      Opened Email:{' '}
                      {(
                        selectedTicket.emailOpenedStatus || 'sent'
                      ).toUpperCase()}
                    </span>
                  </span>
                  {selectedTicket.emailOpenedStatus === 'failed' && (
                    <button
                      type="button"
                      disabled={retryingEmailEvent === 'TICKET_OPENED'}
                      onClick={() => void handleRetryEmail('TICKET_OPENED')}
                      className="px-2 py-0.5 rounded bg-[#EF4444]/20 hover:bg-[#EF4444]/30 text-[#EF4444] text-[10px] font-semibold cursor-pointer"
                    >
                      {retryingEmailEvent === 'TICKET_OPENED'
                        ? 'Retrying...'
                        : 'Retry Opened Email'}
                    </button>
                  )}

                  {selectedTicket.status === 'closed' && (
                    <>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border font-mono ${
                          selectedTicket.emailClosedStatus === 'sent'
                            ? 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30'
                            : 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30'
                        }`}
                      >
                        <Mail className="w-3 h-3" />
                        <span>
                          Closed Email:{' '}
                          {(
                            selectedTicket.emailClosedStatus || 'sent'
                          ).toUpperCase()}
                        </span>
                      </span>
                      {selectedTicket.emailClosedStatus === 'failed' && (
                        <button
                          type="button"
                          disabled={retryingEmailEvent === 'TICKET_CLOSED'}
                          onClick={() => void handleRetryEmail('TICKET_CLOSED')}
                          className="px-2 py-0.5 rounded bg-[#EF4444]/20 hover:bg-[#EF4444]/30 text-[#EF4444] text-[10px] font-semibold cursor-pointer"
                        >
                          {retryingEmailEvent === 'TICKET_CLOSED'
                            ? 'Retrying...'
                            : 'Retry Closed Email'}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              <h2 className="text-base font-bold text-[#F8FAFC]">
                {selectedTicket.subject}
              </h2>
            </div>

            {/* Ownership Lock Banner if Unclaimed or Claimed by Another Staff Member */}
            {!canModifySelectedTicket && (
              <div className="px-5 py-3 bg-[#F59E0B]/10 border-b border-[#F59E0B]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-[#F59E0B]">
                  <Lock className="w-4 h-4 shrink-0" />
                  <span>
                    {isSelectedUnclaimed
                      ? 'This ticket is currently Unclaimed. Claim this ticket to reply to the customer or update its status.'
                      : `This ticket is claimed by ${
                          selectedTicket.assignedStaffName ||
                          selectedTicket.assignedToEmail
                        }. Regular support staff cannot modify tickets owned by another staff member.`}
                  </span>
                </div>
                {isSelectedUnclaimed && (
                  <button
                    type="button"
                    disabled={claimingTicketId === selectedTicket.id}
                    onClick={() => void handleClaimTicket(selectedTicket)}
                    className="px-3.5 py-1.5 rounded-lg bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold shrink-0 cursor-pointer"
                  >
                    {claimingTicketId === selectedTicket.id
                      ? 'Claiming...'
                      : 'Claim Ticket Now'}
                  </button>
                )}
              </div>
            )}

            {/* Conversation & Internal Notes Feed */}
            <div className="p-5 space-y-3.5 max-h-[460px] overflow-y-auto flex-1">
              {loadingThread && messages.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#94A3B8]">
                  Loading ticket conversation and staff notes...
                </div>
              ) : (
                messages.map((m) => {
                  const isCustomer = m.senderRole === 'customer';
                  const isInternal = Boolean(m.isInternal);

                  return (
                    <div
                      key={m.id}
                      className={`rounded-xl p-4 space-y-2 border ${
                        isInternal
                          ? 'bg-[#F59E0B]/10 border-[#F59E0B]/35 text-[#F8FAFC]'
                          : isCustomer
                          ? 'bg-[#111827] border-white/[0.08] text-[#F8FAFC]'
                          : 'bg-[#8B5CF6]/15 border-[#8B5CF6]/35 text-[#F8FAFC]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold ${
                              isInternal
                                ? 'text-[#F59E0B]'
                                : isCustomer
                                ? 'text-[#06B6D4]'
                                : 'text-purple-300'
                            }`}
                          >
                            {m.senderName}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-black/30 text-[10px] font-mono uppercase text-[#94A3B8]">
                            {isInternal
                              ? 'PRIVATE INTERNAL STAFF NOTE (HIDDEN FROM CUSTOMER)'
                              : isCustomer
                              ? 'CUSTOMER'
                              : `SUPPORT (${m.senderRole.toUpperCase()})`}
                          </span>
                        </div>
                        <span className="font-mono text-[#94A3B8]">
                          {m.createdAtISO.slice(0, 16).replace('T', ' ')}
                        </span>
                      </div>

                      <p className="text-xs leading-relaxed whitespace-pre-wrap">
                        {m.message}
                      </p>

                      {renderAttachmentPreviewList(m.attachments || [], m.id)}
                    </div>
                  );
                })
              )}
            </div>

            {/* Reply / Internal Note Composer */}
            <form
              onSubmit={handleSendComposerMessage}
              className="p-4 bg-[#111827] border-t border-white/[0.08] space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setComposerMode('reply')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                      composerMode === 'reply'
                        ? 'bg-[#8B5CF6] text-white'
                        : 'bg-[#161E2E] text-[#94A3B8] hover:text-[#F8FAFC]'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 inline mr-1.5" />
                    Reply to Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => setComposerMode('internal_note')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                      composerMode === 'internal_note'
                        ? 'bg-[#F59E0B] text-slate-950'
                        : 'bg-[#161E2E] text-[#94A3B8] hover:text-[#F8FAFC]'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5 inline mr-1.5" />
                    Internal Staff Note (Private)
                  </button>
                </div>

                {composerMode === 'reply' && (
                  <span className="text-[11px] text-[#94A3B8]">
                    Visible in customer&apos;s My Support conversation
                  </span>
                )}
              </div>

              {uploadError && (
                <div className="p-2.5 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-xs text-rose-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              <textarea
                rows={3}
                disabled={!canModifySelectedTicket}
                value={composerText}
                onChange={(e) => setComposerText(e.target.value)}
                placeholder={
                  !canModifySelectedTicket
                    ? 'Claim this ticket first to post a reply or internal note...'
                    : composerMode === 'internal_note'
                    ? 'Write a private internal note for support staff and admins (never visible to the customer)...'
                    : `Write a public reply to ${selectedTicket.userName}...`
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#161E2E] border border-white/[0.08] text-xs text-[#F8FAFC] placeholder:text-[#94A3B8] disabled:opacity-50 focus:outline-none focus:border-[#8B5CF6]"
              />

              {replyUploadEntries.length > 0 && (
                <div className="space-y-2">
                  {replyUploadEntries.map((entry) => (
                    <div
                      key={entry.localId}
                      className={`p-2.5 rounded-xl border text-xs flex flex-col gap-1.5 ${
                        entry.status === 'failed'
                          ? 'bg-[#EF4444]/10 border-[#EF4444]/30 text-rose-200'
                          : entry.status === 'completed'
                          ? 'bg-[#22C55E]/10 border-[#22C55E]/25 text-[#F8FAFC]'
                          : 'bg-[#161E2E] border-white/[0.1] text-[#F8FAFC]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {entry.file.type.startsWith('image/') ? (
                            <ImageIcon className="w-4 h-4 text-[#06B6D4] shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-[#06B6D4] shrink-0" />
                          )}
                          <span className="font-medium truncate">
                            {entry.name}
                          </span>
                          <span className="text-[11px] font-mono text-[#94A3B8] shrink-0">
                            ({formatBytes(entry.sizeBytes)})
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {entry.status === 'uploading' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#06B6D4]">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span>Uploading {entry.progress}%</span>
                            </span>
                          )}
                          {entry.status === 'completed' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#22C55E]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Completed (100%)</span>
                            </span>
                          )}
                          {entry.status === 'failed' && (
                            <>
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#EF4444]">
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>Failed</span>
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleRetryAttachment(entry.localId)
                                }
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#EF4444]/20 hover:bg-[#EF4444]/30 border border-[#EF4444]/40 text-[11px] font-semibold text-rose-200 cursor-pointer"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Retry</span>
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveAttachment(entry.localId)
                            }
                            className="p-1 rounded hover:bg-white/10 text-[#94A3B8] hover:text-white cursor-pointer"
                            title="Remove attachment"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {entry.status === 'uploading' && (
                        <div className="w-full h-1.5 rounded-full bg-[#0B0F19] overflow-hidden">
                          <div
                            className="h-full bg-[#06B6D4] transition-all duration-200"
                            style={{ width: `${Math.max(5, entry.progress)}%` }}
                          />
                        </div>
                      )}

                      {entry.status === 'failed' && entry.error && (
                        <p className="text-[11px] text-rose-300">
                          {entry.error}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between gap-2">
                <label
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161E2E] hover:bg-[#1D293B] border border-white/[0.08] text-xs font-medium text-[#94A3B8] ${
                    !canModifySelectedTicket ||
                    replyUploadEntries.length >= MAX_ATTACHMENTS_PER_TICKET
                      ? 'opacity-50 cursor-not-allowed'
                      : 'cursor-pointer'
                  }`}
                >
                  <Paperclip className="w-3.5 h-3.5 text-[#06B6D4]" />
                  <span>
                    Attach File ({replyUploadEntries.length}/
                    {MAX_ATTACHMENTS_PER_TICKET})
                  </span>
                  <input
                    type="file"
                    multiple
                    disabled={
                      !canModifySelectedTicket ||
                      replyUploadEntries.length >= MAX_ATTACHMENTS_PER_TICKET
                    }
                    accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleSelectReplyFiles}
                    className="hidden"
                  />
                </label>

                <button
                  type="submit"
                  disabled={
                    !canModifySelectedTicket ||
                    sendingMessage ||
                    hasPendingUploads ||
                    (!composerText.trim() &&
                      replyUploadEntries.filter((i) => i.status === 'completed')
                        .length === 0)
                  }
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 ${
                    composerMode === 'internal_note'
                      ? 'bg-[#F59E0B] hover:bg-amber-400 text-slate-950'
                      : 'bg-[#8B5CF6] hover:bg-[#7C3AED] text-white'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {sendingMessage
                      ? 'Saving...'
                      : hasPendingUploads
                      ? 'Uploading...'
                      : composerMode === 'internal_note'
                      ? 'Save Internal Note'
                      : 'Send Customer Reply'}
                  </span>
                </button>
              </div>
            </form>
          </div>

          {/* RIGHT COLUMN (5 cols): Metadata, Ownership, Status Workflow, Resolution Summary & Admin Override */}
          <div className="lg:col-span-5 space-y-4">
            {/* Card 1: Customer & Context Metadata */}
            <div className="p-5 rounded-2xl bg-[#161E2E] border border-white/[0.08] space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                Ticket Metadata & Customer Profile
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-[#111827] p-3.5 rounded-xl border border-white/[0.06]">
                <div>
                  <span className="text-[#94A3B8] text-[11px]">Customer:</span>
                  <div className="font-semibold text-[#F8FAFC]">
                    {selectedTicket.userName}
                  </div>
                  <div className="font-mono text-[11px] text-[#06B6D4] truncate">
                    {selectedTicket.userEmail}
                  </div>
                </div>
                <div>
                  <span className="text-[#94A3B8] text-[11px]">Category:</span>
                  <div className="font-semibold text-[#F8FAFC]">
                    {selectedTicket.category || 'General Enquiry'}
                  </div>
                  <div className="font-mono text-[10px] text-[#94A3B8]">
                    UID: {selectedTicket.userId.slice(0, 12)}
                  </div>
                </div>
                <div>
                  <span className="text-[#94A3B8] text-[11px]">
                    Related Booking:
                  </span>
                  <div className="font-mono text-[#F8FAFC]">
                    {selectedTicket.bookingId || 'None'}
                  </div>
                </div>
                <div>
                  <span className="text-[#94A3B8] text-[11px]">
                    Related Listing:
                  </span>
                  <div className="font-mono text-[#F8FAFC]">
                    {selectedTicket.productId || 'None'}
                  </div>
                </div>
              </div>

              {/* Claim Ownership Status Box */}
              <div className="p-3.5 rounded-xl bg-[#111827] border border-white/[0.06] flex items-center justify-between gap-2 text-xs">
                <div>
                  <div className="text-[11px] text-[#94A3B8]">
                    Assigned Support Owner:
                  </div>
                  {selectedTicket.assignedTo ? (
                    <div className="font-semibold text-[#F8FAFC] mt-0.5">
                      {selectedTicket.assignedStaffName ||
                        selectedTicket.assignedToEmail}{' '}
                      {isSelectedClaimedByMe && (
                        <span className="text-[#06B6D4] font-mono text-[11px]">
                          (Claimed by You)
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="font-semibold text-[#F59E0B] mt-0.5">
                      Unclaimed · Available to Claim
                    </div>
                  )}
                </div>

                {isSelectedUnclaimed &&
                  !['resolved', 'closed'].includes(selectedTicket.status) && (
                    <button
                      type="button"
                      disabled={claimingTicketId === selectedTicket.id}
                      onClick={() => void handleClaimTicket(selectedTicket)}
                      className="px-3.5 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold cursor-pointer"
                    >
                      {claimingTicketId === selectedTicket.id
                        ? 'Claiming...'
                        : 'Claim Ticket'}
                    </button>
                  )}
              </div>
            </div>

            {/* Card 2: Status Controls & Mandatory Resolution Summary (Priority Removed) */}
            <div className="p-5 rounded-2xl bg-[#161E2E] border border-white/[0.08] space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                Ticket Status & Resolution Controls
              </div>

              {/* Status Workflow Buttons */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#94A3B8]">
                  Workflow Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { status: 'in_progress', label: 'In Progress' },
                      {
                        status: 'waiting_for_user',
                        label: 'Waiting for User',
                      },
                      { status: 'resolved', label: 'Mark Resolved' },
                      { status: 'closed', label: 'Close & Send Email' },
                    ] as { status: SupportTicketStatus; label: string }[]
                  ).map((st) => (
                    <button
                      key={st.status}
                      type="button"
                      disabled={
                        !canModifySelectedTicket ||
                        updatingStatus ||
                        selectedTicket.status === st.status
                      }
                      onClick={() => void handleStatusChange(st.status)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-colors cursor-pointer disabled:opacity-50 ${
                        selectedTicket.status === st.status
                          ? getStatusBadgeStyle(st.status)
                          : 'bg-[#111827] border-white/[0.07] text-[#F8FAFC] hover:bg-[#1D293B]'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resolution Summary (Required before Closing) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#94A3B8]">
                  Official Resolution Summary (Included in Ticket Closed Email) *
                </label>
                <textarea
                  rows={3}
                  disabled={!canModifySelectedTicket}
                  value={resolutionSummaryDraft}
                  onChange={(e) => setResolutionSummaryDraft(e.target.value)}
                  placeholder="Enter the final resolution summary for the customer (required before closing ticket)..."
                  className="w-full px-3 py-2 rounded-xl bg-[#111827] border border-white/[0.08] text-xs text-[#F8FAFC] placeholder:text-[#94A3B8] disabled:opacity-50"
                />
              </div>
            </div>

            {/* Card 3: Administrator Override Controls (Super Admin & Level 2 Admin Only) */}
            {hasAdminOverride && (
              <div className="p-5 rounded-2xl bg-[#161E2E] border border-[#8B5CF6]/30 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-purple-300">
                    <ShieldAlert className="w-4 h-4 text-[#8B5CF6]" />
                    <span>Administrator Override Controls</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#94A3B8]">
                    {currentAdmin.role.toUpperCase()}
                  </span>
                </div>

                {/* Reassign Ticket to Any Staff Member */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] text-[#94A3B8]">
                    Reassign Ticket to Support Staff
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={reassignStaffId}
                      onChange={(e) => setReassignStaffId(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl bg-[#111827] border border-white/[0.08] text-xs text-[#F8FAFC]"
                    >
                      <option value="">Select staff member...</option>
                      {activeSupportAdmins.map((adm) => (
                        <option key={adm.id} value={adm.uid}>
                          {adm.name} ({adm.email}) · {adm.role}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={updatingStatus || !reassignStaffId}
                      onClick={() => void handleAdminReassign()}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 text-white text-xs font-semibold cursor-pointer shrink-0"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Reassign</span>
                    </button>
                  </div>
                </div>

                {/* Release Claim & Reopen Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {selectedTicket.assignedTo && (
                    <button
                      type="button"
                      disabled={updatingStatus}
                      onClick={() => void handleAdminReleaseClaim()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111827] hover:bg-[#1D293B] border border-white/[0.1] text-xs font-medium text-[#F59E0B] cursor-pointer"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Release Claim to Unclaimed</span>
                    </button>
                  )}

                  {['resolved', 'closed'].includes(selectedTicket.status) && (
                    <button
                      type="button"
                      disabled={updatingStatus}
                      onClick={() => void handleAdminReopen()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111827] hover:bg-[#1D293B] border border-white/[0.1] text-xs font-medium text-[#06B6D4] cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reopen Ticket</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Card 4: Immutable Ticket History Log */}
            <div className="p-5 rounded-2xl bg-[#161E2E] border border-white/[0.08] space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                Ticket Claim & Activity History ({history.length})
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {history.length === 0 ? (
                  <div className="text-xs text-[#94A3B8]">
                    No history events recorded yet.
                  </div>
                ) : (
                  history.map((h) => (
                    <div
                      key={h.id}
                      className="p-2.5 rounded-xl bg-[#111827] border border-white/[0.06] text-[11px] space-y-0.5"
                    >
                      <div className="flex items-center justify-between text-[#F8FAFC] font-medium">
                        <span>{h.summary}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-[#94A3B8]">
                        <span>
                          {h.actorName} ({h.actorRole})
                        </span>
                        <span>
                          {h.createdAtISO.slice(0, 16).replace('T', ' ')}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
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
            className="relative max-w-4xl w-full bg-[#161E2E] border border-white/15 rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 bg-[#111827] border-b border-white/10">
              <div className="text-xs font-semibold text-[#F8FAFC] truncate">
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
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
                <button
                  type="button"
                  onClick={() => setLightboxAttachment(null)}
                  className="p-1.5 rounded-lg bg-[#161E2E] hover:bg-[#1D293B] text-[#94A3B8] hover:text-white cursor-pointer"
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
