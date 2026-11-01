import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  Lock,
  Mail,
  MessageSquare,
  Paperclip,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  ShieldAlert,
  UserCheck,
  UserMinus,
  Users,
  X,
} from 'lucide-react';
import {
  AdminAuditLogRecord,
  AdminRegistryRecord,
  SupportAttachmentItem,
  SupportTicketHistoryEntry,
  SupportTicketMessageRecord,
  SupportTicketPriority,
  SupportTicketRecord,
  SupportTicketStatus,
} from '../../types/marketplace';
import { canAdminOverrideTicket } from '../../utils/adminRbac';
import {
  claimSupportTicketAtomic,
  fetchTicketConversationAndHistory,
  postSupportTicketReplyOrNote,
  retryTicketEmailNotification,
  updateSupportTicketWorkflowOrOverride,
  uploadSupportAttachment,
} from '../../services/supportTicketService';

type PrimaryTicketFilter = 'all' | 'unclaimed' | 'mine' | 'resolved';

interface AdminTicketsModuleProps {
  currentAdmin: AdminRegistryRecord;
  tickets: SupportTicketRecord[];
  admins: AdminRegistryRecord[];
  onTicketUpdated: (
    updatedTicket: SupportTicketRecord,
    auditLog?: AdminAuditLogRecord
  ) => void;
  onNotify: (message: string, tone?: 'success' | 'error') => void;
}

export function formatSupportStatusLabel(status: SupportTicketStatus): string {
  switch (status) {
    case 'open':
      return 'Open';
    case 'in_progress':
      return 'In Progress';
    case 'waiting_for_user':
      return 'Waiting for User';
    case 'resolved':
      return 'Resolved';
    case 'closed':
      return 'Closed';
    default:
      return 'Open';
  }
}

export function getStatusBadgeStyle(status: SupportTicketStatus): string {
  switch (status) {
    case 'open':
      return 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60';
    case 'in_progress':
      return 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60';
    case 'waiting_for_user':
      return 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60';
    case 'resolved':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60';
    case 'closed':
      return 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

export function getPriorityBadgeStyle(priority: SupportTicketPriority): string {
  if (priority === 'urgent') {
    return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60';
  }
  return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
}

function formatDurationMinutes(startISO?: string | null, endISO?: string | null): string {
  if (!startISO || !endISO) return '—';
  const startMs = Date.parse(startISO);
  const endMs = Date.parse(endISO);
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) return '—';
  const diffMins = Math.round((endMs - startMs) / 60000);
  if (diffMins < 1) return '< 1m';
  if (diffMins < 60) return `${diffMins}m`;
  const hrs = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

export const AdminTicketsModule: React.FC<AdminTicketsModuleProps> = ({
  currentAdmin,
  tickets,
  admins,
  onTicketUpdated,
  onNotify,
}) => {
  const [primaryFilter, setPrimaryFilter] =
    useState<PrimaryTicketFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [showStaffWorkloadBar, setShowStaffWorkloadBar] = useState(false);

  // Claim confirmation dialog state
  const [ticketPendingClaim, setTicketPendingClaim] =
    useState<SupportTicketRecord | null>(null);
  const [claimingInFlight, setClaimingInFlight] = useState(false);

  // Workspace conversation & history state
  const [messages, setMessages] = useState<SupportTicketMessageRecord[]>([]);
  const [history, setHistory] = useState<SupportTicketHistoryEntry[]>([]);
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);

  // Reply composer & attachment state
  const [replyText, setReplyText] = useState('');
  const [replyAttachments, setReplyAttachments] = useState<
    SupportAttachmentItem[]
  >([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Right column controls state
  const [resolutionDraft, setResolutionDraft] = useState('');
  const [internalNoteDraft, setInternalNoteDraft] = useState('');
  const [reassignTargetUid, setReassignTargetUid] = useState('');
  const [updatingControls, setUpdatingControls] = useState(false);
  const [retryingEmailType, setRetryingEmailType] = useState<
    'TICKET_OPENED' | 'TICKET_CLOSED' | null
  >(null);

  const hasAdminOverride = useMemo(
    () => canAdminOverrideTicket(currentAdmin),
    [currentAdmin]
  );

  const isTicketUnclaimed = (t: SupportTicketRecord): boolean => {
    return (
      !t.assignedTo &&
      !t.assignedToEmail &&
      t.status !== 'resolved' &&
      t.status !== 'closed'
    );
  };

  const isTicketOwnedByCurrentStaff = (t: SupportTicketRecord): boolean => {
    return (
      (Boolean(t.assignedTo) && t.assignedTo === currentAdmin.uid) ||
      (Boolean(t.assignedToEmail) &&
        t.assignedToEmail.toLowerCase() === currentAdmin.email.toLowerCase())
    );
  };

  const isTicketResolvedOrClosed = (t: SupportTicketRecord): boolean => {
    return t.status === 'resolved' || t.status === 'closed';
  };

  // Top 4 Compact Statistics
  const stats = useMemo(() => {
    const total = tickets.length;
    const unclaimed = tickets.filter((t) => isTicketUnclaimed(t)).length;
    const myTickets = tickets.filter((t) =>
      isTicketOwnedByCurrentStaff(t)
    ).length;
    const resolved = tickets.filter((t) => isTicketResolvedOrClosed(t)).length;
    return { total, unclaimed, myTickets, resolved };
  }, [tickets, currentAdmin]);

  // Staff Workload Overview (For Super Admins & Level 2 Admins)
  const staffWorkloads = useMemo(() => {
    const activeStaff = admins.filter((a) => a.status === 'active');
    return activeStaff.map((staff) => {
      const claimedActive = tickets.filter(
        (t) =>
          (t.assignedTo === staff.uid ||
            t.assignedToEmail?.toLowerCase() === staff.email.toLowerCase()) &&
          t.status !== 'resolved' &&
          t.status !== 'closed'
      ).length;
      const resolvedCount = tickets.filter(
        (t) =>
          (t.assignedTo === staff.uid ||
            t.assignedToEmail?.toLowerCase() === staff.email.toLowerCase()) &&
          (t.status === 'resolved' || t.status === 'closed')
      ).length;
      return {
        uid: staff.uid,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        claimedActive,
        resolvedCount,
      };
    });
  }, [admins, tickets]);

  // Filtered Tickets according to the 4 primary filters + simple search field
  const filteredTickets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tickets.filter((ticket) => {
      if (primaryFilter === 'unclaimed' && !isTicketUnclaimed(ticket)) {
        return false;
      }
      if (primaryFilter === 'mine' && !isTicketOwnedByCurrentStaff(ticket)) {
        return false;
      }
      if (primaryFilter === 'resolved' && !isTicketResolvedOrClosed(ticket)) {
        return false;
      }

      if (!q) return true;
      const ticketNum = (ticket.ticketNumber || ticket.id).toLowerCase();
      return (
        ticketNum.includes(q) ||
        ticket.id.toLowerCase().includes(q) ||
        ticket.userName.toLowerCase().includes(q) ||
        ticket.userEmail.toLowerCase().includes(q) ||
        ticket.subject.toLowerCase().includes(q)
      );
    });
  }, [tickets, primaryFilter, searchQuery, currentAdmin]);

  const selectedTicket = useMemo(
    () => tickets.find((t) => t.id === selectedTicketId) || null,
    [tickets, selectedTicketId]
  );

  // Load conversation & history when a ticket is opened in the 3-column workspace
  useEffect(() => {
    if (!selectedTicket) {
      setMessages([]);
      setHistory([]);
      return;
    }

    setResolutionDraft(selectedTicket.resolutionSummary || '');
    setReassignTargetUid(selectedTicket.assignedTo || '');

    let cancelled = false;
    setLoadingWorkspace(true);

    void fetchTicketConversationAndHistory({
      ticket: selectedTicket,
      viewerUid: currentAdmin.uid,
      viewerRole: hasAdminOverride ? 'admin' : 'staff',
    })
      .then((res) => {
        if (!cancelled) {
          setMessages(res.messages);
          setHistory(res.history);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingWorkspace(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedTicket?.id, currentAdmin.uid, hasAdminOverride]);

  const handleConfirmClaimTicket = async () => {
    if (!ticketPendingClaim || claimingInFlight) return;
    setClaimingInFlight(true);
    try {
      const { updatedTicket, historyEvent, auditLog } =
        await claimSupportTicketAtomic({
          actor: currentAdmin,
          ticket: ticketPendingClaim,
        });
      onTicketUpdated(updatedTicket, auditLog);
      if (selectedTicketId === updatedTicket.id) {
        setHistory((prev) => [historyEvent, ...prev]);
      }
      setTicketPendingClaim(null);
      setPrimaryFilter('mine');
      setSelectedTicketId(updatedTicket.id);
      onNotify(
        `Ticket ${
          updatedTicket.ticketNumber || updatedTicket.id
        } claimed and moved to My Tickets (In Progress).`,
        'success'
      );
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Failed to claim support ticket.',
        'error'
      );
      setTicketPendingClaim(null);
    } finally {
      setClaimingInFlight(false);
    }
  };

  const handleUploadReplyFile = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAttachment(true);
    try {
      const uploaded = await uploadSupportAttachment(file, currentAdmin.uid);
      setReplyAttachments((prev) => [...prev, uploaded]);
      onNotify(`Attached "${uploaded.name}".`, 'success');
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Attachment upload failed.',
        'error'
      );
    } finally {
      setUploadingAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || sendingReply) return;
    if (!replyText.trim()) {
      onNotify('Enter a reply message for the customer.', 'error');
      return;
    }

    setSendingReply(true);
    try {
      const { messageRecord, historyEvent, updatedTicket } =
        await postSupportTicketReplyOrNote({
          ticket: selectedTicket,
          senderId: currentAdmin.uid,
          senderName: currentAdmin.name,
          senderEmail: currentAdmin.email,
          senderRole: hasAdminOverride ? 'admin' : 'staff',
          actorAdminRole: currentAdmin.role,
          message: replyText.trim(),
          attachments: replyAttachments,
          isInternal: false,
        });
      setMessages((prev) => [...prev, messageRecord]);
      setHistory((prev) => [historyEvent, ...prev]);
      onTicketUpdated(updatedTicket);
      setReplyText('');
      setReplyAttachments([]);
      onNotify('Reply sent to customer.', 'success');
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Failed to send reply.',
        'error'
      );
    } finally {
      setSendingReply(false);
    }
  };

  const handleAddInternalNote = async () => {
    if (!selectedTicket || updatingControls) return;
    if (!internalNoteDraft.trim()) {
      onNotify('Enter an internal note first.', 'error');
      return;
    }

    setUpdatingControls(true);
    try {
      const { messageRecord, historyEvent, updatedTicket } =
        await postSupportTicketReplyOrNote({
          ticket: selectedTicket,
          senderId: currentAdmin.uid,
          senderName: currentAdmin.name,
          senderEmail: currentAdmin.email,
          senderRole: hasAdminOverride ? 'admin' : 'staff',
          actorAdminRole: currentAdmin.role,
          message: internalNoteDraft.trim(),
          isInternal: true,
        });
      setMessages((prev) => [...prev, messageRecord]);
      setHistory((prev) => [historyEvent, ...prev]);
      onTicketUpdated(updatedTicket);
      setInternalNoteDraft('');
      onNotify('Private internal note saved.', 'success');
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Failed to save internal note.',
        'error'
      );
    } finally {
      setUpdatingControls(false);
    }
  };

  const handleStatusChange = async (nextStatus: SupportTicketStatus) => {
    if (!selectedTicket || updatingControls) return;
    if (nextStatus === 'closed' && resolutionDraft.trim().length < 5) {
      onNotify(
        'A Resolution Summary (minimum 5 characters) is required before closing a ticket.',
        'error'
      );
      return;
    }

    setUpdatingControls(true);
    try {
      const { updatedTicket, historyEvent, auditLog } =
        await updateSupportTicketWorkflowOrOverride({
          actor: currentAdmin,
          ticket: selectedTicket,
          operation: 'status_change',
          newStatus: nextStatus,
          resolutionSummary: resolutionDraft.trim(),
        });
      setHistory((prev) => [historyEvent, ...prev]);
      onTicketUpdated(updatedTicket, auditLog);
      onNotify(
        nextStatus === 'closed'
          ? updatedTicket.emailClosedStatus === 'sent'
            ? `Ticket closed and Resolution Email dispatched to ${updatedTicket.userEmail}.`
            : `Ticket closed. Email notification could not be delivered (${
                updatedTicket.emailClosedError || 'delivery failed'
              }) — you can retry from Customer Email Notifications.`
          : `Ticket status updated to ${formatSupportStatusLabel(nextStatus)}.`,
        'success'
      );
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Failed to update ticket status.',
        'error'
      );
    } finally {
      setUpdatingControls(false);
    }
  };

  const handlePriorityChange = async (nextPriority: SupportTicketPriority) => {
    if (
      !selectedTicket ||
      updatingControls ||
      selectedTicket.priority === nextPriority
    ) {
      return;
    }

    setUpdatingControls(true);
    try {
      const { updatedTicket, historyEvent, auditLog } =
        await updateSupportTicketWorkflowOrOverride({
          actor: currentAdmin,
          ticket: selectedTicket,
          operation: 'priority_change',
          newPriority: nextPriority,
        });
      setHistory((prev) => [historyEvent, ...prev]);
      onTicketUpdated(updatedTicket, auditLog);
      onNotify(
        `Ticket priority changed to ${
          nextPriority === 'urgent' ? 'Urgent' : 'Normal'
        }.`,
        'success'
      );
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Failed to update priority.',
        'error'
      );
    } finally {
      setUpdatingControls(false);
    }
  };

  const handleAdminReassign = async () => {
    if (!selectedTicket || !hasAdminOverride || updatingControls) return;
    const targetStaff = admins.find(
      (a) => a.uid === reassignTargetUid || a.email === reassignTargetUid
    );
    if (!targetStaff) {
      onNotify('Select a valid support staff member to reassign.', 'error');
      return;
    }

    setUpdatingControls(true);
    try {
      const { updatedTicket, historyEvent, auditLog } =
        await updateSupportTicketWorkflowOrOverride({
          actor: currentAdmin,
          ticket: selectedTicket,
          operation: 'reassign',
          newAssignedTo: targetStaff.uid,
          newAssignedStaffName: targetStaff.name,
          newAssignedToEmail: targetStaff.email,
        });
      setHistory((prev) => [historyEvent, ...prev]);
      onTicketUpdated(updatedTicket, auditLog);
      onNotify(
        `Ticket reassigned to ${targetStaff.name} (${targetStaff.email}). Recorded in audit log.`,
        'success'
      );
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Failed to reassign ticket.',
        'error'
      );
    } finally {
      setUpdatingControls(false);
    }
  };

  const handleAdminReleaseClaim = async () => {
    if (!selectedTicket || !hasAdminOverride || updatingControls) return;
    setUpdatingControls(true);
    try {
      const { updatedTicket, historyEvent, auditLog } =
        await updateSupportTicketWorkflowOrOverride({
          actor: currentAdmin,
          ticket: selectedTicket,
          operation: 'release_claim',
        });
      setHistory((prev) => [historyEvent, ...prev]);
      onTicketUpdated(updatedTicket, auditLog);
      onNotify(
        'Staff claim released. Ticket returned to Unclaimed queue and logged in audit trail.',
        'success'
      );
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Failed to release claim.',
        'error'
      );
    } finally {
      setUpdatingControls(false);
    }
  };

  const handleAdminReopenTicket = async () => {
    if (!selectedTicket || !hasAdminOverride || updatingControls) return;
    setUpdatingControls(true);
    try {
      const { updatedTicket, historyEvent, auditLog } =
        await updateSupportTicketWorkflowOrOverride({
          actor: currentAdmin,
          ticket: selectedTicket,
          operation: 'reopen',
        });
      setHistory((prev) => [historyEvent, ...prev]);
      onTicketUpdated(updatedTicket, auditLog);
      onNotify('Ticket reopened and logged in audit trail.', 'success');
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Failed to reopen ticket.',
        'error'
      );
    } finally {
      setUpdatingControls(false);
    }
  };

  const handleRetryEmail = async (
    eventType: 'TICKET_OPENED' | 'TICKET_CLOSED'
  ) => {
    if (!selectedTicket || retryingEmailType) return;
    setRetryingEmailType(eventType);
    try {
      const res = await retryTicketEmailNotification({
        ticket: selectedTicket,
        eventType,
      });
      const nextTicket: SupportTicketRecord =
        eventType === 'TICKET_OPENED'
          ? {
              ...selectedTicket,
              emailOpenedStatus: res.sent ? 'sent' : 'failed',
              emailOpenedSentAtISO: res.sentAtISO,
              emailOpenedError: res.errorMessage || '',
            }
          : {
              ...selectedTicket,
              emailClosedStatus: res.sent ? 'sent' : 'failed',
              emailClosedSentAtISO: res.sentAtISO,
              emailClosedError: res.errorMessage || '',
            };
      if (res.historyEvent) {
        setHistory((prev) => [res.historyEvent!, ...prev]);
      }
      onTicketUpdated(nextTicket);
      onNotify(
        res.sent
          ? `Successfully dispatched ${
              eventType === 'TICKET_OPENED' ? 'Ticket Opened' : 'Ticket Closed'
            } email to ${selectedTicket.userEmail}.`
          : `Email retry failed: ${res.errorMessage || 'Provider error'}`,
        res.sent ? 'success' : 'error'
      );
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Email retry failed.',
        'error'
      );
    } finally {
      setRetryingEmailType(null);
    }
  };

  const canModifySelectedTicket = useMemo(() => {
    if (!selectedTicket) return false;
    if (isTicketUnclaimed(selectedTicket)) return false;
    return (
      isTicketOwnedByCurrentStaff(selectedTicket) || Boolean(hasAdminOverride)
    );
  }, [selectedTicket, currentAdmin, hasAdminOverride]);

  const publicConversationMessages = useMemo(
    () => messages.filter((m) => !m.isInternal),
    [messages]
  );

  const internalNoteMessages = useMemo(
    () => messages.filter((m) => m.isInternal),
    [messages]
  );

  return (
    <div className="space-y-5">
      {/* Claim Ticket Confirmation Dialog */}
      {ticketPendingClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="claim-ticket-dialog-title"
            className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3
                  id="claim-ticket-dialog-title"
                  className="text-base font-bold text-slate-900 dark:text-white"
                >
                  Claim Support Ticket
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                  Are you sure you want to take responsibility for this ticket?
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 p-3.5 text-xs space-y-1">
              <p className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {ticketPendingClaim.ticketNumber || ticketPendingClaim.id}
              </p>
              <p className="font-semibold text-slate-900 dark:text-white">
                {ticketPendingClaim.subject}
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                Customer: {ticketPendingClaim.userName} ({ticketPendingClaim.userEmail})
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={claimingInFlight}
                onClick={() => setTicketPendingClaim(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={claimingInFlight}
                onClick={handleConfirmClaimTicket}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition flex items-center gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5" />
                {claimingInFlight ? 'Claiming...' : 'Confirm & Claim Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top 4 Compact Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Tickets
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {stats.total}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-200/80 dark:border-amber-900/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Unclaimed
          </p>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-1">
            {stats.unclaimed}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            My Tickets
          </p>
          <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300 mt-1">
            {stats.myTickets}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Resolved
          </p>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
            {stats.resolved}
          </p>
        </div>
      </div>

      {/* Administrator Oversight: Staff Workload & Accountability Toggle */}
      {hasAdminOverride && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Staff Workload & Accountability Overview
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowStaffWorkloadBar((v) => !v)}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {showStaffWorkloadBar ? 'Hide Workloads' : 'View Staff Workloads'}
            </button>
          </div>

          {showStaffWorkloadBar && (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {staffWorkloads.map((staff) => (
                <div
                  key={staff.email}
                  className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 p-3 flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {staff.name}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {staff.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-right">
                    <div>
                      <p className="text-[10px] uppercase text-slate-400 font-semibold">
                        Claimed
                      </p>
                      <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                        {staff.claimedActive}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-slate-400 font-semibold">
                        Resolved
                      </p>
                      <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        {staff.resolvedCount}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Three-Column Ticket Details Workspace OR Ticket Table */}
      {selectedTicket ? (
        <div className="space-y-4">
          {/* Top Workspace Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedTicketId(null)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Ticket Queue
              </button>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
              <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                {selectedTicket.ticketNumber || selectedTicket.id}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${getPriorityBadgeStyle(
                  selectedTicket.priority
                )}`}
              >
                {selectedTicket.priority === 'urgent' ? 'Urgent' : 'Normal'}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${getStatusBadgeStyle(
                  selectedTicket.status
                )}`}
              >
                {formatSupportStatusLabel(selectedTicket.status)}
              </span>
            </div>

            {isTicketUnclaimed(selectedTicket) && (
              <button
                type="button"
                onClick={() => setTicketPendingClaim(selectedTicket)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-xs"
              >
                <UserCheck className="w-3.5 h-3.5" />
                Claim Ticket
              </button>
            )}
          </div>

          {/* Three-Column Workspace Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* LEFT COLUMN: Ticket Information & History */}
            <div className="lg:col-span-3 space-y-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 space-y-3.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Ticket Information
                </h3>

                <div className="space-y-2.5 text-xs">
                  <div>
                    <p className="text-slate-400 font-medium">Ticket ID</p>
                    <p className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                      {selectedTicket.ticketNumber || selectedTicket.id}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">Customer Name</p>
                    <p className="font-semibold text-slate-900 dark:text-white mt-0.5">
                      {selectedTicket.userName}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">Customer Email</p>
                    <p className="font-medium text-slate-700 dark:text-slate-300 break-all mt-0.5">
                      {selectedTicket.userEmail}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">Category</p>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                      {selectedTicket.category || 'General Enquiry'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">Priority</p>
                    <span
                      className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${getPriorityBadgeStyle(
                        selectedTicket.priority
                      )}`}
                    >
                      {selectedTicket.priority === 'urgent'
                        ? 'Urgent'
                        : 'Normal'}
                    </span>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">
                      Related Booking ID
                    </p>
                    <p className="font-mono text-slate-700 dark:text-slate-300 mt-0.5">
                      {selectedTicket.bookingId || 'None'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">
                      Related Product ID
                    </p>
                    <p className="font-mono text-slate-700 dark:text-slate-300 mt-0.5">
                      {selectedTicket.productId || 'None'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">Creation Date</p>
                    <p className="text-slate-700 dark:text-slate-300 mt-0.5">
                      {new Date(selectedTicket.createdAtISO).toLocaleString(
                        'en-IN',
                        {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        }
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">
                      Assigned Staff Member
                    </p>
                    <p className="font-semibold text-slate-900 dark:text-white mt-0.5">
                      {selectedTicket.assignedStaffName ||
                        selectedTicket.assignedToEmail ||
                        'Unclaimed'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Staff Accountability & SLA Metrics */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Accountability Metrics
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">
                      Claim Time
                    </p>
                    <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {formatDurationMinutes(
                        selectedTicket.createdAtISO,
                        selectedTicket.claimedAtISO
                      )}
                    </p>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">
                      First Response
                    </p>
                    <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {formatDurationMinutes(
                        selectedTicket.createdAtISO,
                        selectedTicket.firstResponseAtISO
                      )}
                    </p>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">
                      Resolution Time
                    </p>
                    <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {formatDurationMinutes(
                        selectedTicket.createdAtISO,
                        selectedTicket.resolvedAtISO ||
                          selectedTicket.closedAtISO
                      )}
                    </p>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">
                      Reassignments
                    </p>
                    <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {selectedTicket.reassignmentCount || 0}
                    </p>
                  </div>
                </div>
              </div>

              {/* Ticket Activity History */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Complete Ticket History
                </h4>
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {history.map((h) => (
                    <div
                      key={h.id}
                      className="text-xs border-l-2 border-indigo-200 dark:border-indigo-800 pl-2.5 py-0.5"
                    >
                      <p className="font-medium text-slate-800 dark:text-slate-200">
                        {h.summary}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(h.createdAtISO).toLocaleString('en-IN', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CENTRE COLUMN: Conversation */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col min-h-[580px]">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Conversation
                </p>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedTicket.subject}
                </h3>
              </div>

              {/* Messages Thread */}
              <div className="flex-1 p-4 space-y-3.5 overflow-y-auto max-h-[420px]">
                {loadingWorkspace ? (
                  <p className="text-xs text-slate-400 py-8 text-center">
                    Loading ticket conversation...
                  </p>
                ) : (
                  publicConversationMessages.map((msg, idx) => {
                    const isCustomer = msg.senderRole === 'customer';
                    return (
                      <div
                        key={msg.id}
                        className={`rounded-2xl p-3.5 border ${
                          isCustomer
                            ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800'
                            : 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-200/80 dark:border-indigo-900/50 ml-4'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {msg.senderName}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                isCustomer
                                  ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                                  : 'bg-indigo-600 text-white'
                              }`}
                            >
                              {idx === 0 && isCustomer
                                ? 'Original Customer Message'
                                : isCustomer
                                ? 'Customer'
                                : 'Support Staff'}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {new Date(msg.createdAtISO).toLocaleString('en-IN', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>

                        <p className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                          {msg.message}
                        </p>

                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-wrap gap-2">
                            {msg.attachments.map((att) => (
                              <a
                                key={att.id}
                                href={att.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                              >
                                <Paperclip className="w-3 h-3" />
                                {att.name}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Reply Composer or Claim Lock Banner */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 rounded-b-2xl">
                {isTicketUnclaimed(selectedTicket) ? (
                  <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-900 dark:text-amber-200">
                        This ticket is currently <strong>Unclaimed</strong>.
                        Claim this ticket first to reply to the customer or
                        modify ticket controls.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTicketPendingClaim(selectedTicket)}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shrink-0 transition"
                    >
                      Claim Ticket
                    </button>
                  </div>
                ) : !canModifySelectedTicket ? (
                  <div className="rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3.5 flex items-center gap-2.5">
                    <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      This ticket is claimed by{' '}
                      <strong>
                        {selectedTicket.assignedStaffName ||
                          selectedTicket.assignedToEmail}
                      </strong>
                      . Only the assigned staff member or an overriding
                      Administrator can reply or modify it.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSendReply} className="space-y-2.5">
                    <textarea
                      rows={3}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`Reply to ${selectedTicket.userName}...`}
                      className="w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />

                    {replyAttachments.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {replyAttachments.map((att) => (
                          <span
                            key={att.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-[11px] text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                          >
                            <Paperclip className="w-3 h-3" />
                            {att.name}
                            <button
                              type="button"
                              onClick={() =>
                                setReplyAttachments((prev) =>
                                  prev.filter((x) => x.id !== att.id)
                                )
                              }
                              className="ml-1 text-slate-400 hover:text-rose-500"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.txt"
                          onChange={handleUploadReplyFile}
                          className="hidden"
                        />
                        <button
                          type="button"
                          disabled={uploadingAttachment}
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          {uploadingAttachment ? 'Uploading...' : 'Attach File'}
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={sendingReply || !replyText.trim()}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {sendingReply ? 'Sending...' : 'Send Reply'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Ticket Controls, Resolution Summary, Admin Oversight & Private Internal Notes */}
            <div className="lg:col-span-4 space-y-4">
              {/* Status, Priority & Claim Info */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Ticket Controls
                </h3>

                {/* Claim Ownership Info */}
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 p-3 text-xs space-y-1">
                  <p className="text-slate-400 font-medium">Claim Information</p>
                  {selectedTicket.assignedTo ||
                  selectedTicket.assignedToEmail ? (
                    <>
                      <p className="font-bold text-slate-900 dark:text-white">
                        Claimed by:{' '}
                        {selectedTicket.assignedStaffName ||
                          selectedTicket.assignedToEmail}
                      </p>
                      {selectedTicket.claimedAtISO && (
                        <p className="text-slate-500">
                          Claimed at:{' '}
                          {new Date(selectedTicket.claimedAtISO).toLocaleString(
                            'en-IN',
                            {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            }
                          )}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="font-semibold text-amber-600 dark:text-amber-400">
                      Unclaimed (Waiting in queue)
                    </p>
                  )}
                </div>

                {/* Priority Toggle (Strictly TWO levels: Normal and Urgent) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Priority Level
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={!canModifySelectedTicket || updatingControls}
                      onClick={() => handlePriorityChange('normal')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                        selectedTicket.priority === 'normal'
                          ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white'
                          : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      } disabled:opacity-50`}
                    >
                      Normal
                    </button>
                    <button
                      type="button"
                      disabled={!canModifySelectedTicket || updatingControls}
                      onClick={() => handlePriorityChange('urgent')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                        selectedTicket.priority === 'urgent'
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-rose-50/60 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60 hover:bg-rose-100/70'
                      } disabled:opacity-50`}
                    >
                      Urgent
                    </button>
                  </div>
                </div>

                {/* Status Lifecycle Controls */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Current Status ({formatSupportStatusLabel(selectedTicket.status)})
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        'in_progress',
                        'waiting_for_user',
                        'resolved',
                        'closed',
                      ] as SupportTicketStatus[]
                    ).map((st) => (
                      <button
                        key={st}
                        type="button"
                        disabled={
                          !canModifySelectedTicket ||
                          updatingControls ||
                          selectedTicket.status === st
                        }
                        onClick={() => handleStatusChange(st)}
                        className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition ${
                          selectedTicket.status === st
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                        } disabled:opacity-50`}
                      >
                        {formatSupportStatusLabel(st)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Resolution Summary (Required before closing) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Resolution Summary{' '}
                    <span className="text-slate-400 font-normal">
                      (Required to Close & emailed to customer)
                    </span>
                  </label>
                  <textarea
                    rows={3}
                    disabled={!canModifySelectedTicket}
                    value={resolutionDraft}
                    onChange={(e) => setResolutionDraft(e.target.value)}
                    placeholder="Summarize how this customer issue was resolved..."
                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Administrator Oversight Panel (Super Admin & Level 2 Admin Only) */}
              {hasAdminOverride && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/50 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      Administrator Oversight
                    </h4>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                      Reassign or Override Ownership
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={reassignTargetUid}
                        onChange={(e) => setReassignTargetUid(e.target.value)}
                        className="flex-1 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                      >
                        <option value="">Select staff member...</option>
                        {admins
                          .filter((a) => a.status === 'active')
                          .map((a) => (
                            <option key={a.email} value={a.uid}>
                              {a.name} ({a.role.replace('_', ' ')})
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        disabled={updatingControls || !reassignTargetUid}
                        onClick={handleAdminReassign}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition"
                      >
                        Reassign
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {(selectedTicket.assignedTo ||
                      selectedTicket.assignedToEmail) && (
                      <button
                        type="button"
                        disabled={updatingControls}
                        onClick={handleAdminReleaseClaim}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 text-xs font-semibold hover:bg-amber-100 transition"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                        Release Staff Claim
                      </button>
                    )}

                    {isTicketResolvedOrClosed(selectedTicket) && (
                      <button
                        type="button"
                        disabled={updatingControls}
                        onClick={handleAdminReopenTicket}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 text-xs font-semibold hover:bg-indigo-100 transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reopen Ticket
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Customer Transactional Email Delivery Status */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-500" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Customer Email Notifications
                  </h4>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        1. Ticket Opened Email
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Status:{' '}
                        <span
                          className={`font-semibold uppercase ${
                            selectedTicket.emailOpenedStatus === 'failed'
                              ? 'text-rose-600 dark:text-rose-400'
                              : selectedTicket.emailOpenedStatus === 'sent'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : ''
                          }`}
                        >
                          {selectedTicket.emailOpenedStatus || 'pending'}
                        </span>
                      </p>
                      {selectedTicket.emailOpenedStatus === 'failed' &&
                        selectedTicket.emailOpenedError && (
                          <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5 break-words">
                            {selectedTicket.emailOpenedError}
                          </p>
                        )}
                    </div>
                    <button
                      type="button"
                      disabled={retryingEmailType === 'TICKET_OPENED'}
                      onClick={() => handleRetryEmail('TICKET_OPENED')}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold shrink-0 transition ${
                        selectedTicket.emailOpenedStatus === 'failed'
                          ? 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-white'
                      }`}
                    >
                      <RefreshCw className="w-3 h-3" />
                      {retryingEmailType === 'TICKET_OPENED'
                        ? 'Sending...'
                        : selectedTicket.emailOpenedStatus === 'failed'
                        ? 'Retry'
                        : 'Resend'}
                    </button>
                  </div>

                  <div className="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        2. Ticket Closed Email
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Status:{' '}
                        <span
                          className={`font-semibold uppercase ${
                            selectedTicket.emailClosedStatus === 'failed'
                              ? 'text-rose-600 dark:text-rose-400'
                              : selectedTicket.emailClosedStatus === 'sent'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : ''
                          }`}
                        >
                          {selectedTicket.emailClosedStatus ||
                            (selectedTicket.status === 'closed'
                              ? 'pending'
                              : 'awaiting closure')}
                        </span>
                      </p>
                      {selectedTicket.emailClosedStatus === 'failed' &&
                        selectedTicket.emailClosedError && (
                          <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5 break-words">
                            {selectedTicket.emailClosedError}
                          </p>
                        )}
                    </div>
                    {(selectedTicket.status === 'closed' ||
                      selectedTicket.emailClosedStatus === 'failed') && (
                      <button
                        type="button"
                        disabled={retryingEmailType === 'TICKET_CLOSED'}
                        onClick={() => handleRetryEmail('TICKET_CLOSED')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold shrink-0 transition ${
                          selectedTicket.emailClosedStatus === 'failed'
                            ? 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
                            : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-white'
                        }`}
                      >
                        <RefreshCw className="w-3 h-3" />
                        {retryingEmailType === 'TICKET_CLOSED'
                          ? 'Sending...'
                          : selectedTicket.emailClosedStatus === 'failed'
                          ? 'Retry'
                          : 'Resend'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Private Internal Staff Notes (Never visible to customers) */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-200/80 dark:border-amber-900/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      Internal Notes (Staff Only)
                    </h4>
                  </div>
                  <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                    Hidden from Customer
                  </span>
                </div>

                {selectedTicket.internalNotes && (
                  <div className="rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/50 p-3 text-xs text-amber-950 dark:text-amber-200 whitespace-pre-wrap">
                    {selectedTicket.internalNotes}
                  </div>
                )}

                {internalNoteMessages.length > 0 && (
                  <div className="space-y-2 max-h-36 overflow-y-auto">
                    {internalNoteMessages.map((note) => (
                      <div
                        key={note.id}
                        className="rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 p-2.5 text-xs"
                      >
                        <div className="flex justify-between text-[11px] text-amber-700 dark:text-amber-400 font-semibold mb-1">
                          <span>{note.senderName}</span>
                          <span>
                            {new Date(note.createdAtISO).toLocaleTimeString(
                              'en-IN',
                              {
                                hour: '2-digit',
                                minute: '2-digit',
                              }
                            )}
                          </span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-200">
                          {note.message}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {canModifySelectedTicket && (
                  <div className="space-y-2">
                    <textarea
                      rows={2}
                      value={internalNoteDraft}
                      onChange={(e) => setInternalNoteDraft(e.target.value)}
                      placeholder="Add a private note for support staff & administrators..."
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      disabled={updatingControls || !internalNoteDraft.trim()}
                      onClick={handleAddInternalNote}
                      className="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold transition"
                    >
                      Save Internal Note
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* TICKET QUEUE TABLE VIEW */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
          {/* 4 Primary Filters + Simple Search Field */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'all', label: 'All Tickets', count: stats.total },
                  {
                    id: 'unclaimed',
                    label: 'Unclaimed',
                    count: stats.unclaimed,
                  },
                  { id: 'mine', label: 'My Tickets', count: stats.myTickets },
                  {
                    id: 'resolved',
                    label: 'Resolved',
                    count: stats.resolved,
                  },
                ] as Array<{
                  id: PrimaryTicketFilter;
                  label: string;
                  count: number;
                }>
              ).map((tab) => {
                const active = primaryFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setPrimaryFilter(tab.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                      active
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-md text-[11px] font-bold ${
                        active
                          ? 'bg-indigo-500 text-white'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Ticket ID, name, email, subject..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Clean Ticket Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50 dark:bg-slate-950/40">
                  <th className="py-3 px-4">Ticket ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Assigned Staff</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800 text-xs">
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="py-10 text-center text-slate-400"
                    >
                      No support tickets match the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((ticket) => {
                    const unclaimed = isTicketUnclaimed(ticket);
                    return (
                      <tr
                        key={ticket.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                          {ticket.ticketNumber || ticket.id}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {ticket.userName}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {ticket.userEmail}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="font-semibold text-slate-900 dark:text-white truncate">
                            {ticket.subject}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {ticket.category || 'General Enquiry'}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${getPriorityBadgeStyle(
                              ticket.priority
                            )}`}
                          >
                            {ticket.priority === 'urgent' ? 'Urgent' : 'Normal'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {ticket.assignedStaffName ||
                          ticket.assignedToEmail ? (
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {ticket.assignedStaffName ||
                                ticket.assignedToEmail}
                            </span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400 font-semibold">
                              Unclaimed
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                          {new Date(ticket.createdAtISO).toLocaleDateString(
                            'en-IN',
                            {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            }
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${getStatusBadgeStyle(
                              ticket.status
                            )}`}
                          >
                            {formatSupportStatusLabel(ticket.status)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-2">
                            {unclaimed && (
                              <button
                                type="button"
                                onClick={() => setTicketPendingClaim(ticket)}
                                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
                              >
                                Claim Ticket
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setSelectedTicketId(ticket.id)}
                              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition"
                            >
                              {unclaimed ? 'Inspect' : 'Manage'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
