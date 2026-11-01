import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  ArrowLeft,
  ArrowRightLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileText,
  History,
  Inbox,
  LifeBuoy,
  Lock,
  MessageSquare,
  Paperclip,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Tag,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import {
  AdminAuditLogRecord,
  AdminManagedUserRecord,
  AdminRegistryRecord,
  SupportAttachmentItem,
  SupportTicketHistoryEntry,
  SupportTicketMessageRecord,
  SupportTicketRecord,
  SupportTicketStatus,
} from '../../types/marketplace';
import { hasAdminPermission, ROLE_DEFINITIONS } from '../../utils/adminRbac';
import {
  canAdminOverrideSupportTicket,
  claimSupportTicketAtomic,
  isPdfAttachment,
  postSupportTicketReplyOrNote,
  subscribeToTicketConversation,
  updateSupportTicketWorkflowOrOverride,
  uploadSupportAttachment,
} from '../../services/supportTicketService';
import {
  ADMIN_TICKET_STATUS_CONFIG,
  buildTicketProblemSummary,
  filterTicketsBySearchQuery,
  partitionSupportTickets,
  validateCloseTicketResolution,
} from '../../utils/supportTicketSummary';

interface AdminTicketsModuleProps {
  currentAdmin: AdminRegistryRecord;
  tickets: SupportTicketRecord[];
  admins: AdminRegistryRecord[];
  users?: AdminManagedUserRecord[];
  selectedTicketIdFromParent?: string | null;
  onClearSelectedTicket?: () => void;
  onTicketUpdated: (
    updatedTicket: SupportTicketRecord,
    auditLog?: AdminAuditLogRecord
  ) => void;
  onNotify: (message: string, tone?: 'success' | 'error' | 'info') => void;
}

interface PendingAttachmentUpload {
  id: string;
  file: File;
  previewUrl: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  errorMessage?: string;
  uploadedItem?: SupportAttachmentItem;
}

const CLOSED_TICKETS_PER_PAGE = 10;

function formatShortDate(iso?: string | null): string {
  if (!iso) return '—';
  return iso.slice(0, 16).replace('T', ' ');
}

export const AdminTicketsModule: React.FC<AdminTicketsModuleProps> = ({
  currentAdmin,
  tickets,
  admins,
  users = [],
  selectedTicketIdFromParent = null,
  onClearSelectedTicket,
  onTicketUpdated,
  onNotify,
}) => {
  // Dashboard Top Navigation Tab: 'active_tickets' vs 'closed_tickets'
  const [dashboardTab, setDashboardTab] = useState<
    'active_tickets' | 'closed_tickets'
  >('active_tickets');

  // Single Unified Search Input (Customer Name or Ticket ID)
  const [searchQuery, setSearchQuery] = useState('');

  // Closed Tickets Pagination
  const [closedPage, setClosedPage] = useState(1);

  // Selected Ticket ID for Individual Ticket Workspace (null = show Main Ticket Dashboard only)
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(
    selectedTicketIdFromParent || null
  );
  // Track which tab the admin opened the ticket from so "Back to ..." returns accurately
  const [openedFromTab, setOpenedFromTab] = useState<
    'active_tickets' | 'closed_tickets'
  >('active_tickets');

  useEffect(() => {
    if (selectedTicketIdFromParent) {
      setSelectedTicketId(selectedTicketIdFromParent);
      const target = tickets.find((t) => t.id === selectedTicketIdFromParent);
      if (target) {
        const targetTab =
          target.status === 'closed' ? 'closed_tickets' : 'active_tickets';
        setDashboardTab(targetTab);
        setOpenedFromTab(targetTab);
      }
    }
  }, [selectedTicketIdFromParent, tickets]);

  // Selected Ticket Conversation & Audit History
  const [messages, setMessages] = useState<SupportTicketMessageRecord[]>([]);
  const [history, setHistory] = useState<SupportTicketHistoryEntry[]>([]);
  const [isLoadingThread, setIsLoadingThread] = useState(false);

  // Composer State (1. Reply to Customer | 2. Internal Staff Note)
  const [composerMode, setComposerMode] = useState<
    'customer_reply' | 'internal_note'
  >('customer_reply');
  const [replyText, setReplyText] = useState('');
  const [pendingUploads, setPendingUploads] = useState<
    PendingAttachmentUpload[]
  >([]);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{
    url: string;
    name: string;
  } | null>(null);

  // Action Loading & Error States
  const [isClaiming, setIsClaiming] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isUpdatingWorkflow, setIsUpdatingWorkflow] = useState(false);

  // Close Ticket Confirmation Modal State
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [closeResolutionDraft, setCloseResolutionDraft] = useState('');
  const [closeModalError, setCloseModalError] = useState<string | null>(null);

  // Reopen Ticket Confirmation Modal State
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
  const [reopenReasonDraft, setReopenReasonDraft] = useState('');

  // Change Assignment Controls (for authorised Super Admin / Admin override)
  const [isReassignOpen, setIsReassignOpen] = useState(false);
  const [reassignTargetUid, setReassignTargetUid] = useState('');
  const [reassignNote, setReassignNote] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const threadEndRef = useRef<HTMLDivElement | null>(null);

  const canManageSupport = hasAdminPermission(currentAdmin, 'support.manage');
  const hasAdminOverride = canAdminOverrideSupportTicket(currentAdmin);

  const supportCapableAdmins = useMemo(
    () =>
      admins.filter(
        (adm) =>
          adm.status === 'active' &&
          (adm.role === 'super_admin' ||
            adm.role === 'admin' ||
            adm.role === 'support_admin' ||
            hasAdminPermission(adm, 'support.manage'))
      ),
    [admins]
  );

  // Partition all tickets into Active vs Closed
  const { activeTickets, closedTickets } = useMemo(() => {
    const sorted = [...tickets].sort((a, b) => {
      const aTime = a.updatedAtISO || a.createdAtISO;
      const bTime = b.updatedAtISO || b.createdAtISO;
      return bTime.localeCompare(aTime);
    });
    return partitionSupportTickets(sorted);
  }, [tickets]);

  // Filtered Active & Closed lists based on unified Search Bar
  const filteredActiveTickets = useMemo(
    () => filterTicketsBySearchQuery(activeTickets, searchQuery),
    [activeTickets, searchQuery]
  );

  const filteredClosedTickets = useMemo(() => {
    const matches = filterTicketsBySearchQuery(closedTickets, searchQuery);
    return [...matches].sort((a, b) => {
      const aTime = a.closedAtISO || a.updatedAtISO || a.createdAtISO;
      const bTime = b.closedAtISO || b.updatedAtISO || b.createdAtISO;
      return bTime.localeCompare(aTime);
    });
  }, [closedTickets, searchQuery]);

  // Reset pagination when search changes
  useEffect(() => {
    setClosedPage(1);
  }, [searchQuery, dashboardTab]);

  const totalClosedPages = Math.max(
    1,
    Math.ceil(filteredClosedTickets.length / CLOSED_TICKETS_PER_PAGE)
  );

  const paginatedClosedTickets = useMemo(() => {
    const startIndex = (closedPage - 1) * CLOSED_TICKETS_PER_PAGE;
    return filteredClosedTickets.slice(
      startIndex,
      startIndex + CLOSED_TICKETS_PER_PAGE
    );
  }, [filteredClosedTickets, closedPage]);

  // Currently opened ticket (or null when viewing Dashboard)
  const selectedTicket = useMemo(
    () => tickets.find((t) => t.id === selectedTicketId) || null,
    [tickets, selectedTicketId]
  );

  // Customer account profile from users registry if available
  const selectedCustomerAccount = useMemo(() => {
    if (!selectedTicket) return null;
    return (
      users.find(
        (u) =>
          u.uid === selectedTicket.userId ||
          (selectedTicket.userEmail &&
            u.email.toLowerCase() === selectedTicket.userEmail.toLowerCase())
      ) || null
    );
  }, [selectedTicket, users]);

  // Subscribe to real-time conversation & history ONLY when a ticket is open in the workspace
  useEffect(() => {
    if (!selectedTicket) {
      setMessages([]);
      setHistory([]);
      return;
    }

    setIsLoadingThread(true);
    setComposerError(null);
    setReassignTargetUid(selectedTicket.assignedTo || '');
    setCloseResolutionDraft(selectedTicket.resolutionSummary || '');

    const unsubscribe = subscribeToTicketConversation(
      {
        ticket: selectedTicket,
        viewerUid: currentAdmin.uid,
        viewerRole: hasAdminOverride ? 'admin' : 'staff',
      },
      ({ messages: nextMessages, history: nextHistory }) => {
        setMessages(nextMessages);
        setHistory(nextHistory);
        setIsLoadingThread(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [
    selectedTicket?.id,
    selectedTicket?.updatedAtISO,
    currentAdmin.uid,
    hasAdminOverride,
  ]);

  // Deterministic Problem Summary Card derived from real messages & history
  const problemSummary = useMemo(() => {
    if (!selectedTicket) return null;
    return buildTicketProblemSummary(selectedTicket, messages, history);
  }, [selectedTicket, messages, history]);

  // Closing staff member name derived from history or assigned staff
  const closedByStaffDisplayName = useMemo(() => {
    if (!selectedTicket) return '';
    const closedEvt = history.find((h) => h.action === 'closed');
    return (
      closedEvt?.actorName ||
      selectedTicket.assignedStaffName ||
      selectedTicket.assignedToEmail ||
      'Support Team'
    );
  }, [selectedTicket, history]);

  // Ownership & Modification Authority for the selected ticket
  const isUnclaimed = !selectedTicket?.assignedTo;
  const isClaimedByCurrentStaff =
    Boolean(selectedTicket?.assignedTo) &&
    (selectedTicket?.assignedTo === currentAdmin.uid ||
      (Boolean(selectedTicket?.assignedToEmail) &&
        selectedTicket?.assignedToEmail?.toLowerCase() ===
          currentAdmin.email.toLowerCase()));
  const canModifySelectedTicket =
    canManageSupport &&
    Boolean(selectedTicket) &&
    !isUnclaimed &&
    (isClaimedByCurrentStaff || hasAdminOverride);

  // Navigation Handlers
  const handleOpenTicketWorkspace = (
    ticket: SupportTicketRecord,
    sourceTab: 'active_tickets' | 'closed_tickets'
  ) => {
    setOpenedFromTab(sourceTab);
    setSelectedTicketId(ticket.id);
    setIsCloseModalOpen(false);
    setIsReopenModalOpen(false);
    setIsReassignOpen(false);
    setComposerError(null);
  };

  const handleBackToDashboard = (
    targetTab?: 'active_tickets' | 'closed_tickets'
  ) => {
    const destination = targetTab || openedFromTab;
    setDashboardTab(destination);
    setSelectedTicketId(null);
    setIsCloseModalOpen(false);
    setIsReopenModalOpen(false);
    setIsReassignOpen(false);
    onClearSelectedTicket?.();
  };

  // Claim Ticket Handler
  const handleClaimTicket = async (ticket: SupportTicketRecord) => {
    if (!canManageSupport || isClaiming) return;
    setIsClaiming(true);
    try {
      const result = await claimSupportTicketAtomic({
        ticket,
        staff: currentAdmin,
      });

      if (result.historyEvent) {
        setHistory((prev) => [result.historyEvent, ...prev]);
      }

      onTicketUpdated(result.updatedTicket, result.auditLog);
      onNotify(
        `Ticket ${ticket.ticketNumber || ticket.id} claimed by ${currentAdmin.name}.`,
        'success'
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Could not claim ticket.';
      onNotify(msg, 'error');
    } finally {
      setIsClaiming(false);
    }
  };

  // File Upload Handlers
  const startUploadForFile = async (uploadId: string, file: File) => {
    if (!selectedTicket) return;
    setPendingUploads((prev) =>
      prev.map((u) =>
        u.id === uploadId
          ? { ...u, status: 'uploading', progress: 5, errorMessage: undefined }
          : u
      )
    );

    try {
      const uploaded = await uploadSupportAttachment(
        file,
        currentAdmin.uid,
        (pct) => {
          setPendingUploads((prev) =>
            prev.map((u) => (u.id === uploadId ? { ...u, progress: pct } : u))
          );
        }
      );

      setPendingUploads((prev) =>
        prev.map((u) =>
          u.id === uploadId
            ? {
                ...u,
                status: 'completed',
                progress: 100,
                uploadedItem: uploaded,
              }
            : u
        )
      );
    } catch (err) {
      const errMsg =
        err instanceof Error
          ? err.message
          : `Failed to upload "${file.name}".`;
      setPendingUploads((prev) =>
        prev.map((u) =>
          u.id === uploadId
            ? { ...u, status: 'error', progress: 0, errorMessage: errMsg }
            : u
        )
      );
      onNotify(errMsg, 'error');
    }
  };

  const handleAttachmentFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedTicket) return;

    const currentCount = pendingUploads.length;
    if (currentCount + files.length > 5) {
      onNotify('Maximum 5 attachments allowed per message.', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const newEntries: PendingAttachmentUpload[] = Array.from(files).map(
      (file) => ({
        id: `UP-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        previewUrl: file.type.startsWith('image/')
          ? URL.createObjectURL(file)
          : '',
        progress: 0,
        status: 'uploading',
      })
    );

    setPendingUploads((prev) => [...prev, ...newEntries]);
    if (fileInputRef.current) fileInputRef.current.value = '';

    await Promise.all(
      newEntries.map((entry) => startUploadForFile(entry.id, entry.file))
    );
  };

  const handleRemovePendingUpload = (uploadId: string) => {
    setPendingUploads((prev) => {
      const target = prev.find((u) => u.id === uploadId);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((u) => u.id !== uploadId);
    });
  };

  const isUploadingAttachment = pendingUploads.some(
    (u) => u.status === 'uploading'
  );
  const completedAttachments = useMemo(
    () =>
      pendingUploads
        .filter((u) => u.status === 'completed' && u.uploadedItem)
        .map((u) => u.uploadedItem!),
    [pendingUploads]
  );

  // Send Reply or Internal Staff Note
  const handleSendMessageOrNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || isSendingReply) return;

    const isInternal = composerMode === 'internal_note';
    if (!replyText.trim() && completedAttachments.length === 0) {
      setComposerError(
        isInternal
          ? 'Please enter an internal staff note before submitting.'
          : 'Please enter a reply message or attach a file before sending.'
      );
      return;
    }

    setComposerError(null);
    setIsSendingReply(true);
    try {
      const res = await postSupportTicketReplyOrNote({
        ticket: selectedTicket,
        senderId: currentAdmin.uid,
        senderName: currentAdmin.name,
        senderEmail: currentAdmin.email,
        senderRole: hasAdminOverride ? 'admin' : 'staff',
        actorAdminRole: currentAdmin.role,
        message: replyText,
        isInternal,
        attachments: completedAttachments,
      });

      if (res.messageRecord) {
        setMessages((prev) =>
          prev.some((m) => m.id === res.messageRecord.id)
            ? prev
            : [...prev, res.messageRecord]
        );
      }
      if (res.historyEvent) {
        setHistory((prev) =>
          prev.some((h) => h.id === res.historyEvent.id)
            ? prev
            : [res.historyEvent, ...prev]
        );
      }

      setReplyText('');
      pendingUploads.forEach((u) => {
        if (u.previewUrl) URL.revokeObjectURL(u.previewUrl);
      });
      setPendingUploads([]);
      onTicketUpdated(res.updatedTicket);
      onNotify(
        isInternal
          ? 'Internal staff note saved to ticket.'
          : `Reply sent to ${selectedTicket.userName}.`,
        'success'
      );
    } catch (err) {
      const errMsg =
        err instanceof Error ? err.message : 'Could not send message.';
      setComposerError(errMsg);
      onNotify(errMsg, 'error');
    } finally {
      setIsSendingReply(false);
    }
  };

  // Status Update Handler (In Progress, Waiting for User, Mark Resolved)
  const handleQuickStatusChange = async (newStatus: SupportTicketStatus) => {
    if (!selectedTicket || isUpdatingWorkflow) return;
    if (newStatus === 'closed') {
      // Closing always requires the confirmation modal
      setCloseResolutionDraft(selectedTicket.resolutionSummary || '');
      setCloseModalError(null);
      setIsCloseModalOpen(true);
      return;
    }

    setIsUpdatingWorkflow(true);
    try {
      const res = await updateSupportTicketWorkflowOrOverride({
        ticket: selectedTicket,
        actor: currentAdmin,
        operation: 'status_change',
        newStatus,
        resolutionSummary: selectedTicket.resolutionSummary,
      });

      if (res.historyEvent) {
        setHistory((prev) => [res.historyEvent, ...prev]);
      }

      onTicketUpdated(res.updatedTicket, res.auditLog);
      onNotify(
        `Ticket ${selectedTicket.ticketNumber || selectedTicket.id} marked as ${
          ADMIN_TICKET_STATUS_CONFIG[newStatus].label
        }.`,
        'success'
      );
    } catch (err) {
      const errMsg =
        err instanceof Error ? err.message : 'Failed to update ticket status.';
      onNotify(errMsg, 'error');
    } finally {
      setIsUpdatingWorkflow(false);
    }
  };

  // Confirm Close Ticket Modal Handler
  const handleConfirmCloseTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || isUpdatingWorkflow) return;

    const validation = validateCloseTicketResolution(closeResolutionDraft);
    if (!validation.valid) {
      setCloseModalError(
        validation.error || 'Please enter an official resolution summary.'
      );
      return;
    }

    setCloseModalError(null);
    setIsUpdatingWorkflow(true);
    try {
      const res = await updateSupportTicketWorkflowOrOverride({
        ticket: selectedTicket,
        actor: currentAdmin,
        operation: 'status_change',
        newStatus: 'closed',
        resolutionSummary: validation.trimmed,
      });

      if (res.historyEvent) {
        setHistory((prev) => [res.historyEvent, ...prev]);
      }

      const closedTicketNumber =
        selectedTicket.ticketNumber || selectedTicket.id;

      // Update parent ticket state
      onTicketUpdated(res.updatedTicket, res.auditLog);

      // Close modal and return administrator to the Active Tickets dashboard
      setIsCloseModalOpen(false);
      setCloseResolutionDraft('');
      setDashboardTab('active_tickets');
      setSelectedTicketId(null);
      onClearSelectedTicket?.();

      onNotify(
        `Ticket ${closedTicketNumber} closed and moved to Closed Tickets.`,
        'success'
      );
    } catch (err) {
      const errMsg =
        err instanceof Error ? err.message : 'Failed to close ticket.';
      setCloseModalError(errMsg);
      onNotify(errMsg, 'error');
    } finally {
      setIsUpdatingWorkflow(false);
    }
  };

  // Confirm Reopen Ticket Modal Handler
  const handleConfirmReopenTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || isUpdatingWorkflow) return;

    setIsUpdatingWorkflow(true);
    try {
      const res = await updateSupportTicketWorkflowOrOverride({
        ticket: selectedTicket,
        actor: currentAdmin,
        operation: 'reopen',
        newStatus: 'in_progress',
        internalNotes: reopenReasonDraft.trim()
          ? `${
              selectedTicket.internalNotes
                ? `${selectedTicket.internalNotes}\n`
                : ''
            }[Reopened by ${currentAdmin.name}]: ${reopenReasonDraft.trim()}`
          : selectedTicket.internalNotes,
      });

      if (res.historyEvent) {
        setHistory((prev) => [res.historyEvent, ...prev]);
      }

      onTicketUpdated(res.updatedTicket, res.auditLog);
      setIsReopenModalOpen(false);
      setReopenReasonDraft('');
      setDashboardTab('active_tickets');
      setOpenedFromTab('active_tickets');
      onNotify(
        `Ticket ${
          selectedTicket.ticketNumber || selectedTicket.id
        } reopened and moved back to Active Tickets.`,
        'success'
      );
    } catch (err) {
      const errMsg =
        err instanceof Error ? err.message : 'Failed to reopen ticket.';
      onNotify(errMsg, 'error');
    } finally {
      setIsUpdatingWorkflow(false);
    }
  };

  // Change Assignment Handler
  const handleReassignTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !hasAdminOverride || isUpdatingWorkflow) return;

    const targetAdmin = admins.find((a) => a.uid === reassignTargetUid);
    if (!targetAdmin) {
      onNotify('Select a valid support staff member to assign.', 'error');
      return;
    }

    setIsUpdatingWorkflow(true);
    try {
      const res = await updateSupportTicketWorkflowOrOverride({
        ticket: selectedTicket,
        actor: currentAdmin,
        operation: 'reassign',
        newAssignedTo: targetAdmin.uid,
        newAssignedStaffName: targetAdmin.name,
        newAssignedToEmail: targetAdmin.email,
      });

      if (res.historyEvent) {
        setHistory((prev) => [res.historyEvent, ...prev]);
      }

      setReassignNote('');
      setIsReassignOpen(false);
      onTicketUpdated(res.updatedTicket, res.auditLog);
      onNotify(`Ticket assigned to ${targetAdmin.name}.`, 'success');
    } catch (err) {
      const errMsg =
        err instanceof Error ? err.message : 'Failed to change assignment.';
      onNotify(errMsg, 'error');
    } finally {
      setIsUpdatingWorkflow(false);
    }
  };

  // ============================================================================
  // RENDER VIEW 1: MAIN TICKET DASHBOARD (when no individual ticket is opened)
  // ============================================================================
  if (!selectedTicket) {
    const displayedTickets =
      dashboardTab === 'active_tickets'
        ? filteredActiveTickets
        : paginatedClosedTickets;

    return (
      <div
        data-testid="admin-tickets-dashboard"
        className="space-y-5 text-[#F8FAFC]"
      >
        {/* Top Navigation Bar + Unified Search */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#161E2E] border border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Two Clear Horizontal Tabs with Counts */}
          <div
            role="tablist"
            aria-label="Ticket Dashboard Tabs"
            className="inline-flex items-center p-1 rounded-xl bg-[#0B0F19] border border-white/[0.08] self-start"
          >
            <button
              type="button"
              role="tab"
              aria-selected={dashboardTab === 'active_tickets'}
              data-testid="admin-tab-active-tickets"
              onClick={() => setDashboardTab('active_tickets')}
              className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                dashboardTab === 'active_tickets'
                  ? 'bg-[#8B5CF6] text-white shadow-md shadow-[#8B5CF6]/25'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>Active Tickets</span>
              <span
                className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold ${
                  dashboardTab === 'active_tickets'
                    ? 'bg-white/20 text-white'
                    : 'bg-[#161E2E] text-[#06B6D4]'
                }`}
              >
                {activeTickets.length}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={dashboardTab === 'closed_tickets'}
              data-testid="admin-tab-closed-tickets"
              onClick={() => setDashboardTab('closed_tickets')}
              className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                dashboardTab === 'closed_tickets'
                  ? 'bg-[#8B5CF6] text-white shadow-md shadow-[#8B5CF6]/25'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Closed Tickets</span>
              <span
                className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold ${
                  dashboardTab === 'closed_tickets'
                    ? 'bg-white/20 text-white'
                    : 'bg-[#161E2E] text-[#94A3B8]'
                }`}
              >
                {closedTickets.length}
              </span>
            </button>
          </div>

          {/* Single Clean Dynamic Search Bar */}
          <div className="relative w-full md:w-80 lg:w-96">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              data-testid="admin-tickets-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Customer name or Ticket ID..."
              className="w-full bg-[#0B0F19] border border-white/[0.08] rounded-xl pl-10 pr-9 py-2.5 text-xs text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#8B5CF6] transition-colors"
            />
            {searchQuery.trim() && (
              <button
                type="button"
                aria-label="Clear ticket search"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Ticket List Table Container */}
        <div className="rounded-2xl bg-[#161E2E] border border-white/[0.08] overflow-hidden shadow-xl">
          {/* Panel Subheader */}
          <div className="px-5 py-3.5 bg-[#111827] border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#F8FAFC]">
                {dashboardTab === 'active_tickets'
                  ? 'Active Support Queue'
                  : 'Historical Closed Tickets'}
              </span>
              <span className="text-[11px] text-[#94A3B8]">
                {dashboardTab === 'active_tickets'
                  ? '— Click any row to open its dedicated ticket workspace'
                  : '— Click any row to inspect the preserved conversation & resolution'}
              </span>
            </div>
            <span className="text-[11px] font-mono text-[#94A3B8]">
              {dashboardTab === 'active_tickets'
                ? `Showing ${filteredActiveTickets.length} of ${activeTickets.length} active`
                : `Showing ${paginatedClosedTickets.length} of ${filteredClosedTickets.length} closed`}
            </span>
          </div>

          {displayedTickets.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <LifeBuoy className="w-8 h-8 text-[#94A3B8] mx-auto opacity-60" />
              <div className="text-sm font-semibold text-[#F8FAFC]">
                {searchQuery.trim()
                  ? `No ${
                      dashboardTab === 'active_tickets' ? 'active' : 'closed'
                    } tickets match "${searchQuery}"`
                  : dashboardTab === 'active_tickets'
                  ? 'No Active Support Tickets'
                  : 'No Closed Support Tickets Yet'}
              </div>
              <p className="text-xs text-[#94A3B8] max-w-md mx-auto">
                {searchQuery.trim()
                  ? 'Try searching with a different customer name or ticket ID.'
                  : dashboardTab === 'active_tickets'
                  ? 'All customer support requests have been resolved and closed.'
                  : 'Tickets closed with an official resolution summary will be archived here.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-[#111827]/60 text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                    <th className="py-3.5 px-4 whitespace-nowrap">Ticket ID</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Customer</th>
                    <th className="py-3.5 px-4">Subject</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Category</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">
                      Assigned Staff
                    </th>
                    <th className="py-3.5 px-4 whitespace-nowrap">
                      Creation Date
                    </th>
                    <th className="py-3.5 px-4 whitespace-nowrap">
                      {dashboardTab === 'active_tickets'
                        ? 'Last Activity'
                        : 'Closure Date'}
                    </th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] text-xs">
                  {displayedTickets.map((t) => {
                    const statusPresentation =
                      ADMIN_TICKET_STATUS_CONFIG[t.status] ||
                      ADMIN_TICKET_STATUS_CONFIG.open;
                    const assignedName =
                      t.assignedStaffName ||
                      t.assignedToEmail ||
                      (t.assignedTo ? 'Assigned Staff' : null);

                    return (
                      <tr
                        key={t.id}
                        data-testid={`admin-ticket-row-${t.id}`}
                        onClick={() =>
                          handleOpenTicketWorkspace(t, dashboardTab)
                        }
                        className="group hover:bg-white/[0.04] transition-colors cursor-pointer"
                      >
                        {/* Ticket ID */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-mono font-semibold text-[#06B6D4] group-hover:underline">
                            {t.ticketNumber || t.id}
                          </span>
                        </td>

                        {/* Customer Name */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-semibold text-[#F8FAFC]">
                            {t.userName}
                          </div>
                          <div className="text-[11px] font-mono text-[#94A3B8]">
                            {t.userEmail}
                          </div>
                        </td>

                        {/* Subject */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="font-medium text-[#F8FAFC] truncate">
                            {t.subject}
                          </div>
                          {t.status === 'closed' && t.resolutionSummary && (
                            <div className="text-[11px] text-[#94A3B8] truncate mt-0.5">
                              Resolution: {t.resolutionSummary}
                            </div>
                          )}
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-[#111827] text-[#CBD5E1] border border-white/[0.07]">
                            {t.category || 'General Enquiry'}
                          </span>
                        </td>

                        {/* Assigned Staff Member */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {assignedName ? (
                            <span className="inline-flex items-center gap-1.5 text-[#F8FAFC] font-medium">
                              <UserCheck className="w-3.5 h-3.5 text-[#06B6D4]" />
                              <span>{assignedName}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-amber-300 font-medium">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Unassigned</span>
                            </span>
                          )}
                        </td>

                        {/* Creation Date */}
                        <td className="py-3.5 px-4 font-mono text-[11px] text-[#94A3B8] whitespace-nowrap">
                          {formatShortDate(t.createdAtISO)}
                        </td>

                        {/* Last Activity or Closure Date */}
                        <td className="py-3.5 px-4 font-mono text-[11px] text-[#94A3B8] whitespace-nowrap">
                          {dashboardTab === 'active_tickets'
                            ? formatShortDate(t.updatedAtISO || t.createdAtISO)
                            : formatShortDate(t.closedAtISO || t.updatedAtISO)}
                        </td>

                        {/* Current Status at Far Right */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-2.5">
                            <span
                              data-testid={`admin-ticket-status-${t.id}`}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${statusPresentation.badgeClass}`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${statusPresentation.dotClass}`}
                              />
                              <span>{statusPresentation.label}</span>
                            </span>
                            <button
                              type="button"
                              data-testid={`admin-open-ticket-btn-${t.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenTicketWorkspace(t, dashboardTab);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#111827] group-hover:bg-[#8B5CF6] border border-white/[0.08] group-hover:border-[#8B5CF6] text-[11px] font-semibold text-[#CBD5E1] group-hover:text-white transition-colors cursor-pointer"
                            >
                              Open
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination for Closed Tickets */}
          {dashboardTab === 'closed_tickets' &&
            filteredClosedTickets.length > CLOSED_TICKETS_PER_PAGE && (
              <div className="px-5 py-3.5 bg-[#111827] border-t border-white/[0.08] flex items-center justify-between text-xs">
                <span className="text-[#94A3B8] font-mono">
                  Page {closedPage} of {totalClosedPages} (
                  {filteredClosedTickets.length} closed tickets)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={closedPage <= 1}
                    onClick={() => setClosedPage((p) => Math.max(1, p - 1))}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#161E2E] hover:bg-[#1D293B] disabled:opacity-40 border border-white/[0.08] text-xs font-medium text-[#F8FAFC] cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Previous</span>
                  </button>
                  <button
                    type="button"
                    disabled={closedPage >= totalClosedPages}
                    onClick={() =>
                      setClosedPage((p) => Math.min(totalClosedPages, p + 1))
                    }
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#161E2E] hover:bg-[#1D293B] disabled:opacity-40 border border-white/[0.08] text-xs font-medium text-[#F8FAFC] cursor-pointer"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER VIEW 2: INDIVIDUAL TICKET WORKSPACE (shown ONLY when a ticket is open)
  // ============================================================================
  const selectedStatusPresentation =
    ADMIN_TICKET_STATUS_CONFIG[selectedTicket.status] ||
    ADMIN_TICKET_STATUS_CONFIG.open;
  const isClosedTicket = selectedTicket.status === 'closed';
  const assignedStaffLabel =
    selectedTicket.assignedStaffName ||
    selectedTicket.assignedToEmail ||
    (selectedTicket.assignedTo ? 'Assigned Staff' : 'Unassigned');

  return (
    <div
      data-testid="admin-ticket-workspace"
      className="space-y-5 text-[#F8FAFC]"
    >
      {/* WORKSPACE TOP BAR */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#161E2E] border border-white/[0.08] flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-lg">
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <button
            type="button"
            data-testid="admin-back-to-tickets-btn"
            onClick={() =>
              handleBackToDashboard(
                isClosedTicket ? 'closed_tickets' : 'active_tickets'
              )
            }
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#111827] hover:bg-[#1D293B] border border-white/[0.08] text-xs font-semibold text-[#F8FAFC] transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-[#8B5CF6]" />
            <span>
              {isClosedTicket && openedFromTab === 'closed_tickets'
                ? 'Back to Closed Tickets'
                : 'Back to Active Tickets'}
            </span>
          </button>

          <div className="h-5 w-px bg-white/[0.08] hidden sm:block" />

          <span
            data-testid="admin-workspace-ticket-id"
            className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-[#111827] text-[#06B6D4] border border-white/[0.08] shrink-0"
          >
            {selectedTicket.ticketNumber || selectedTicket.id}
          </span>

          <h2
            data-testid="admin-workspace-subject"
            className="text-sm sm:text-base font-bold text-[#F8FAFC] truncate max-w-xl"
          >
            {selectedTicket.subject}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#111827] border border-white/[0.08] text-xs">
            <span className="text-[#94A3B8]">Assigned:</span>
            <span
              data-testid="admin-workspace-assigned-staff"
              className="font-semibold text-[#F8FAFC]"
            >
              {assignedStaffLabel}
            </span>
          </div>

          <span
            data-testid="admin-workspace-status-badge"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${selectedStatusPresentation.badgeClass}`}
          >
            <span
              className={`w-2 h-2 rounded-full ${selectedStatusPresentation.dotClass}`}
            />
            <span>{selectedStatusPresentation.label}</span>
          </span>
        </div>
      </div>

      {/* TWO-COLUMN RESPONSIVE WORKSPACE (Left ~65% Conversation | Right ~35% Summary + Controls) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ====================================================================
            LEFT PANEL (Approx. 65% width -> 8 of 12 cols on lg):
            CUSTOMER CONVERSATION & COMPOSER
           ==================================================================== */}
        <div
          data-testid="admin-workspace-conversation-panel"
          className="lg:col-span-8 rounded-2xl bg-[#161E2E] border border-white/[0.08] flex flex-col overflow-hidden shadow-xl"
        >
          {/* Conversation Panel Header */}
          <div className="px-5 py-4 bg-[#111827] border-b border-white/[0.08] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <MessageSquare className="w-4 h-4 text-[#8B5CF6]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#F8FAFC]">
                Customer Conversation Thread
              </h3>
            </div>
            <span className="text-[11px] font-mono text-[#94A3B8]">
              {messages.length} {messages.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>

          {/* Closed Ticket Resolution Banner (if ticket is closed) */}
          {isClosedTicket && (
            <div
              data-testid="admin-closed-resolution-banner"
              className="mx-5 mt-5 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Official Resolution Summary (Ticket Closed)</span>
                </span>
                <span className="text-[11px] font-mono text-[#94A3B8]">
                  Closed by {closedByStaffDisplayName} ·{' '}
                  {formatShortDate(
                    selectedTicket.closedAtISO || selectedTicket.updatedAtISO
                  )}
                </span>
              </div>
              <p className="text-xs text-[#F8FAFC] leading-relaxed whitespace-pre-wrap">
                {selectedTicket.resolutionSummary ||
                  'Closed after support resolution.'}
              </p>
            </div>
          )}

          {/* Chronological Conversation Thread */}
          <div className="p-5 space-y-4 max-h-[600px] overflow-y-auto">
            {isLoadingThread && messages.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#94A3B8] flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#8B5CF6]" />
                <span>Loading conversation history...</span>
              </div>
            ) : messages.length === 0 ? (
              /* Fallback to original complaint description if messages array is empty */
              <div className="p-4 rounded-xl bg-[#111827] border border-white/[0.08] space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-[#F8FAFC]">
                    {selectedTicket.userName} (Customer · Original Complaint)
                  </span>
                  <span className="font-mono text-[#94A3B8]">
                    {formatShortDate(selectedTicket.createdAtISO)}
                  </span>
                </div>
                <p className="text-xs text-[#E2E8F0] leading-relaxed whitespace-pre-wrap">
                  {selectedTicket.description}
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isCustomer = msg.senderRole === 'customer';
                const isInternalNote = Boolean(msg.isInternal);
                const msgAttachments = msg.attachments || [];

                return (
                  <div
                    key={msg.id}
                    data-testid={`admin-thread-msg-${msg.id}`}
                    className={`p-4 rounded-xl border transition-all ${
                      isInternalNote
                        ? 'bg-amber-500/10 border-amber-500/35'
                        : isCustomer
                        ? 'bg-[#111827] border-white/[0.08] mr-0 sm:mr-8'
                        : 'bg-[#8B5CF6]/10 border-[#8B5CF6]/30 ml-0 sm:ml-8'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#F8FAFC]">
                          {msg.senderName}
                        </span>
                        {isInternalNote ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            <Lock className="w-2.5 h-2.5" />
                            <span>Internal Staff Note (Staff Only)</span>
                          </span>
                        ) : isCustomer ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-blue-500/15 text-blue-300 border border-blue-500/30">
                            {idx === 0
                              ? 'Customer · Original Complaint'
                              : 'Customer Reply'}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-[#8B5CF6]/20 text-[#C4B5FD] border border-[#8B5CF6]/35">
                            Support Reply
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-[#94A3B8]">
                        {formatShortDate(msg.createdAtISO)}
                      </span>
                    </div>

                    {msg.message && (
                      <p className="text-xs text-[#F8FAFC] leading-relaxed whitespace-pre-wrap">
                        {msg.message}
                      </p>
                    )}

                    {/* Message Attachments (Images & PDFs) */}
                    {msgAttachments.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/[0.07] grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {msgAttachments.map((att) => {
                          const isPdf = isPdfAttachment(att);
                          const displayName = att.name || 'Attachment';
                          return (
                            <div
                              key={att.id}
                              className="p-2.5 rounded-lg bg-[#0B0F19]/80 border border-white/[0.08] flex items-center justify-between gap-2.5"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                {!isPdf && att.url ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setLightboxImage({
                                        url: att.url,
                                        name: displayName,
                                      })
                                    }
                                    className="w-11 h-11 rounded-md overflow-hidden border border-white/[0.1] shrink-0 cursor-pointer"
                                  >
                                    <img
                                      src={att.url}
                                      alt={displayName}
                                      className="w-full h-full object-cover"
                                    />
                                  </button>
                                ) : (
                                  <div className="w-11 h-11 rounded-md bg-[#161E2E] border border-white/[0.08] flex items-center justify-center text-[#06B6D4] shrink-0">
                                    <FileText className="w-5 h-5" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="text-xs font-medium text-[#F8FAFC] truncate">
                                    {displayName}
                                  </div>
                                  <div className="text-[10px] font-mono text-[#94A3B8]">
                                    {isPdf ? 'PDF Document' : 'Image Attachment'}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {!isPdf && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setLightboxImage({
                                        url: att.url,
                                        name: displayName,
                                      })
                                    }
                                    className="px-2 py-1 rounded bg-[#161E2E] hover:bg-[#1D293B] text-[10px] font-semibold text-[#06B6D4] cursor-pointer"
                                  >
                                    Preview
                                  </button>
                                )}
                                <a
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download={displayName}
                                  className="p-1.5 rounded bg-[#161E2E] hover:bg-[#1D293B] text-[#CBD5E1] hover:text-white"
                                  title="Open / Download"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={threadEndRef} />
          </div>

          {/* BOTTOM COMPOSER (Active Tickets) OR READ-ONLY ARCHIVE FOOTER (Closed Tickets) */}
          <div className="p-5 bg-[#111827] border-t border-white/[0.08]">
            {isClosedTicket ? (
              <div className="p-4 rounded-xl bg-[#161E2E] border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-xs text-[#94A3B8]">
                  <Lock className="w-4 h-4 text-[#94A3B8] shrink-0" />
                  <span>
                    This ticket is closed and archived in read-only mode. Reopen
                    the ticket if additional conversation is required.
                  </span>
                </div>
                {canManageSupport && (
                  <button
                    type="button"
                    data-testid="admin-reopen-ticket-btn"
                    onClick={() => {
                      setReopenReasonDraft('');
                      setIsReopenModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold cursor-pointer shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reopen Ticket</span>
                  </button>
                )}
              </div>
            ) : isUnclaimed ? (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-amber-300">
                    Ticket Must Be Claimed Before Replying
                  </div>
                  <p className="text-[11px] text-[#CBD5E1]">
                    Claim this ticket to take ownership and reply to{' '}
                    {selectedTicket.userName} or record internal staff notes.
                  </p>
                </div>
                {canManageSupport && (
                  <button
                    type="button"
                    disabled={isClaiming}
                    onClick={() => void handleClaimTicket(selectedTicket)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 text-white text-xs font-semibold cursor-pointer shrink-0"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>{isClaiming ? 'Claiming...' : 'Claim Ticket'}</span>
                  </button>
                )}
              </div>
            ) : !canModifySelectedTicket ? (
              <div className="p-4 rounded-xl bg-[#161E2E] border border-white/[0.08] text-xs text-[#94A3B8]">
                This ticket is currently assigned to{' '}
                <strong className="text-[#F8FAFC]">{assignedStaffLabel}</strong>
                . Only the assigned staff member or an overriding administrator
                can post replies.
              </div>
            ) : (
              <form onSubmit={handleSendMessageOrNote} className="space-y-3">
                {/* Two Clearly Separated Composer Options */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex items-center p-1 rounded-xl bg-[#0B0F19] border border-white/[0.08]">
                    <button
                      type="button"
                      data-testid="admin-composer-mode-reply"
                      onClick={() => {
                        setComposerMode('customer_reply');
                        setComposerError(null);
                      }}
                      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        composerMode === 'customer_reply'
                          ? 'bg-[#8B5CF6] text-white'
                          : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                      }`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>1. Reply to Customer</span>
                    </button>

                    <button
                      type="button"
                      data-testid="admin-composer-mode-note"
                      onClick={() => {
                        setComposerMode('internal_note');
                        setComposerError(null);
                      }}
                      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        composerMode === 'internal_note'
                          ? 'bg-amber-500 text-[#0B0F19]'
                          : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>2. Internal Staff Note</span>
                    </button>
                  </div>

                  <span className="text-[11px] text-[#94A3B8]">
                    {composerMode === 'internal_note'
                      ? 'Visible only to authorised staff & admins'
                      : `Visible to customer (${selectedTicket.userName})`}
                  </span>
                </div>

                {/* Error Alert if submission fails */}
                {composerError && (
                  <div className="p-3 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-xs text-[#EF4444] flex items-center justify-between">
                    <span>{composerError}</span>
                    <button
                      type="button"
                      onClick={() => setComposerError(null)}
                      className="p-0.5 hover:opacity-80 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Textarea */}
                <textarea
                  rows={4}
                  data-testid="admin-composer-textarea"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={
                    composerMode === 'internal_note'
                      ? 'Write an internal staff note (hidden from the customer)...'
                      : `Write a response to ${selectedTicket.userName}...`
                  }
                  className={`w-full rounded-xl p-3.5 text-xs text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none border transition-colors ${
                    composerMode === 'internal_note'
                      ? 'bg-amber-500/[0.06] border-amber-500/35 focus:border-amber-400'
                      : 'bg-[#0B0F19] border-white/[0.08] focus:border-[#8B5CF6]'
                  }`}
                />

                {/* Pending Attachment Previews */}
                {pendingUploads.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {pendingUploads.map((item) => (
                      <div
                        key={item.id}
                        className="px-3 py-1.5 rounded-lg bg-[#0B0F19] border border-white/[0.08] flex items-center gap-2 text-xs"
                      >
                        <Paperclip className="w-3.5 h-3.5 text-[#06B6D4]" />
                        <span className="truncate max-w-[160px] text-[#F8FAFC]">
                          {item.file.name}
                        </span>
                        {item.status === 'uploading' && (
                          <span className="font-mono text-[10px] text-[#06B6D4]">
                            {item.progress}%
                          </span>
                        )}
                        {item.status === 'error' && (
                          <button
                            type="button"
                            onClick={() =>
                              void startUploadForFile(item.id, item.file)
                            }
                            className="text-[10px] font-semibold text-amber-400 underline cursor-pointer"
                          >
                            Retry
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemovePendingUpload(item.id)}
                          className="text-[#94A3B8] hover:text-[#EF4444] cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Composer Bottom Action Row */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      multiple
                      onChange={handleAttachmentFileSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSendingReply || isUploadingAttachment}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#161E2E] hover:bg-[#1D293B] border border-white/[0.08] text-xs font-medium text-[#CBD5E1] transition-colors cursor-pointer"
                    >
                      <Paperclip className="w-3.5 h-3.5 text-[#06B6D4]" />
                      <span>Attach Image / PDF</span>
                    </button>
                  </div>

                  <button
                    type="submit"
                    data-testid="admin-composer-submit-btn"
                    disabled={isSendingReply || isUploadingAttachment}
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 ${
                      composerMode === 'internal_note'
                        ? 'bg-amber-500 hover:bg-amber-400 text-[#0B0F19]'
                        : 'bg-[#8B5CF6] hover:bg-[#7C3AED] text-white shadow-lg shadow-[#8B5CF6]/25'
                    }`}
                  >
                    {isSendingReply ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : composerMode === 'internal_note' ? (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>Save Internal Staff Note</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Reply to Customer</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* ====================================================================
            RIGHT PANEL (Approx. 35% width -> 4 of 12 cols on lg):
            CUSTOMER INFO, TICKET INFO, PROBLEM SUMMARY CARD & TICKET CONTROLS
           ==================================================================== */}
        <div
          data-testid="admin-workspace-summary-panel"
          className="lg:col-span-4 space-y-5"
        >
          {/* 1. TICKET CONTROLS CARD */}
          <div className="p-5 rounded-2xl bg-[#161E2E] border border-white/[0.08] space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#F8FAFC] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#8B5CF6]" />
                <span>Ticket Controls</span>
              </h3>
              <span className="text-[11px] font-mono text-[#94A3B8]">
                {ROLE_DEFINITIONS[currentAdmin.role]?.label || currentAdmin.role}
              </span>
            </div>

            {!canManageSupport ? (
              <p className="text-xs text-[#94A3B8]">
                Your account has read-only support permissions.
              </p>
            ) : isClosedTicket ? (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-[#111827] border border-white/[0.06] text-xs text-[#94A3B8]">
                  Closed on{' '}
                  <span className="font-mono text-[#F8FAFC]">
                    {formatShortDate(
                      selectedTicket.closedAtISO || selectedTicket.updatedAtISO
                    )}
                  </span>{' '}
                  by{' '}
                  <span className="font-semibold text-[#F8FAFC]">
                    {closedByStaffDisplayName}
                  </span>
                  .
                </div>
                <button
                  type="button"
                  data-testid="admin-control-reopen-btn"
                  onClick={() => {
                    setReopenReasonDraft('');
                    setIsReopenModalOpen(true);
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reopen Ticket</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Claim Ticket Button (when unclaimed) */}
                {isUnclaimed && (
                  <button
                    type="button"
                    data-testid="admin-control-claim-btn"
                    disabled={isClaiming}
                    onClick={() => void handleClaimTicket(selectedTicket)}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-[#8B5CF6]/20 transition-all cursor-pointer"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>
                      {isClaiming ? 'Claiming Ticket...' : 'Claim Ticket'}
                    </span>
                  </button>
                )}

                {/* Status Workflow Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-2">
                  <button
                    type="button"
                    data-testid="admin-control-status-in_progress"
                    disabled={
                      !canModifySelectedTicket ||
                      isUpdatingWorkflow ||
                      selectedTicket.status === 'in_progress'
                    }
                    onClick={() => void handleQuickStatusChange('in_progress')}
                    className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer disabled:opacity-45 ${
                      selectedTicket.status === 'in_progress'
                        ? 'bg-[#8B5CF6]/20 text-[#C4B5FD] border-[#8B5CF6]/50'
                        : 'bg-[#111827] hover:bg-[#1D293B] text-[#F8FAFC] border-white/[0.08]'
                    }`}
                  >
                    <span>In Progress</span>
                    <span className="w-2 h-2 rounded-full bg-[#8B5CF6]" />
                  </button>

                  <button
                    type="button"
                    data-testid="admin-control-status-waiting_for_user"
                    disabled={
                      !canModifySelectedTicket ||
                      isUpdatingWorkflow ||
                      selectedTicket.status === 'waiting_for_user'
                    }
                    onClick={() =>
                      void handleQuickStatusChange('waiting_for_user')
                    }
                    className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer disabled:opacity-45 ${
                      selectedTicket.status === 'waiting_for_user'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-[#111827] hover:bg-[#1D293B] text-[#F8FAFC] border-white/[0.08]'
                    }`}
                  >
                    <span>Waiting for User</span>
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                  </button>

                  <button
                    type="button"
                    data-testid="admin-control-status-resolved"
                    disabled={
                      !canModifySelectedTicket ||
                      isUpdatingWorkflow ||
                      selectedTicket.status === 'resolved'
                    }
                    onClick={() => void handleQuickStatusChange('resolved')}
                    className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer disabled:opacity-45 ${
                      selectedTicket.status === 'resolved'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                        : 'bg-[#111827] hover:bg-[#1D293B] text-[#F8FAFC] border-white/[0.08]'
                    }`}
                  >
                    <span>Mark Resolved</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  </button>
                </div>

                {/* Change Assignment (where authorised) */}
                {hasAdminOverride && (
                  <div className="pt-2 border-t border-white/[0.07]">
                    <button
                      type="button"
                      data-testid="admin-control-change-assignment-toggle"
                      onClick={() => setIsReassignOpen((prev) => !prev)}
                      className="w-full inline-flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#111827] hover:bg-[#1D293B] border border-white/[0.08] text-xs font-medium text-[#CBD5E1] cursor-pointer"
                    >
                      <span className="inline-flex items-center gap-2">
                        <ArrowRightLeft className="w-3.5 h-3.5 text-[#06B6D4]" />
                        <span>Change Assignment</span>
                      </span>
                      <span className="text-[11px] font-mono text-[#94A3B8]">
                        {isReassignOpen ? 'Hide' : 'Assign'}
                      </span>
                    </button>

                    {isReassignOpen && (
                      <form
                        onSubmit={handleReassignTicket}
                        className="mt-2.5 p-3 rounded-xl bg-[#0B0F19] border border-white/[0.08] space-y-2.5"
                      >
                        <select
                          value={reassignTargetUid}
                          onChange={(e) => setReassignTargetUid(e.target.value)}
                          className="w-full bg-[#161E2E] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#8B5CF6]"
                        >
                          <option value="">Select staff member...</option>
                          {supportCapableAdmins.map((adm) => (
                            <option key={adm.uid} value={adm.uid}>
                              {adm.name} ({adm.email})
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={reassignNote}
                          onChange={(e) => setReassignNote(e.target.value)}
                          placeholder="Assignment note (optional)..."
                          className="w-full bg-[#161E2E] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#8B5CF6]"
                        />
                        <button
                          type="submit"
                          disabled={!reassignTargetUid || isUpdatingWorkflow}
                          className="w-full py-1.5 rounded-lg bg-[#06B6D4] hover:bg-[#0891B2] disabled:opacity-40 text-[#0B0F19] text-xs font-bold cursor-pointer"
                        >
                          Confirm Assignment
                        </button>
                      </form>
                    )}
                  </div>
                )}

                {/* Close Ticket Button (Opens Confirmation Modal) */}
                <div className="pt-2 border-t border-white/[0.07]">
                  <button
                    type="button"
                    data-testid="admin-control-close-ticket-btn"
                    disabled={!canModifySelectedTicket || isUpdatingWorkflow}
                    onClick={() => {
                      setCloseResolutionDraft(
                        selectedTicket.resolutionSummary || ''
                      );
                      setCloseModalError(null);
                      setIsCloseModalOpen(true);
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-40"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Close Ticket</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 2. PROBLEM SUMMARY CARD (Derived from real ticket messages & history) */}
          {problemSummary && (
            <div
              data-testid="admin-problem-summary-card"
              className="p-5 rounded-2xl bg-[#161E2E] border border-white/[0.08] space-y-3.5 shadow-xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#F8FAFC] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#06B6D4]" />
                  <span>Problem Summary Card</span>
                </h3>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#111827] text-[#06B6D4] border border-white/[0.07]">
                  Live Context
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-[#111827] border border-white/[0.06] space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                    1. Customer&apos;s Reported Issue
                  </div>
                  <p className="text-[#F8FAFC] leading-relaxed">
                    {problemSummary.reportedIssue}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#111827] border border-white/[0.06] space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                    2. Main Problem Identified
                  </div>
                  <p className="text-[#E2E8F0] leading-relaxed">
                    {problemSummary.mainProblemIdentified}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#111827] border border-white/[0.06] space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                    3. Actions Already Taken by Support
                  </div>
                  <p className="text-[#E2E8F0] leading-relaxed">
                    {problemSummary.actionsTakenBySupport}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#111827] border border-white/[0.06] space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                    4. Current Situation
                  </div>
                  <p className="text-[#F8FAFC] font-medium leading-relaxed">
                    {problemSummary.currentSituation}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#C4B5FD]">
                    5. Remaining Action Required
                  </div>
                  <p className="text-[#F8FAFC] font-medium leading-relaxed">
                    {problemSummary.remainingActionRequired}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 3. CUSTOMER INFORMATION CARD */}
          <div
            data-testid="admin-customer-info-card"
            className="p-5 rounded-2xl bg-[#161E2E] border border-white/[0.08] space-y-3 shadow-xl"
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#F8FAFC] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#8B5CF6]" />
              <span>Customer Information</span>
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between gap-2 py-1.5 border-b border-white/[0.06]">
                <span className="text-[#94A3B8]">Customer Name</span>
                <span className="font-semibold text-[#F8FAFC]">
                  {selectedTicket.userName}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 py-1.5 border-b border-white/[0.06]">
                <span className="text-[#94A3B8]">Customer Email</span>
                <span className="font-mono text-[#06B6D4] truncate max-w-[200px]">
                  {selectedTicket.userEmail}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 py-1.5 border-b border-white/[0.06]">
                <span className="text-[#94A3B8]">Customer ID</span>
                <span className="font-mono text-[11px] text-[#CBD5E1]">
                  {selectedTicket.userId}
                </span>
              </div>

              {selectedCustomerAccount && (
                <>
                  <div className="flex items-center justify-between gap-2 py-1.5 border-b border-white/[0.06]">
                    <span className="text-[#94A3B8]">Location</span>
                    <span className="text-[#F8FAFC]">
                      {selectedCustomerAccount.city}
                      {selectedCustomerAccount.neighborhood
                        ? ` · ${selectedCustomerAccount.neighborhood}`
                        : ''}
                    </span>
                  </div>

                  {selectedCustomerAccount.phone && (
                    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-white/[0.06]">
                      <span className="text-[#94A3B8]">Phone</span>
                      <span className="font-mono text-[#F8FAFC]">
                        {selectedCustomerAccount.phone}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 py-1">
                    <span className="text-[#94A3B8]">Account Status</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      {selectedCustomerAccount.accountStatus}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 4. TICKET INFORMATION CARD */}
          <div
            data-testid="admin-ticket-info-card"
            className="p-5 rounded-2xl bg-[#161E2E] border border-white/[0.08] space-y-3 shadow-xl"
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#F8FAFC] flex items-center gap-2">
              <Tag className="w-4 h-4 text-[#06B6D4]" />
              <span>Ticket Information</span>
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between gap-2 py-1.5 border-b border-white/[0.06]">
                <span className="text-[#94A3B8]">Ticket ID</span>
                <span className="font-mono font-semibold text-[#06B6D4]">
                  {selectedTicket.ticketNumber || selectedTicket.id}
                </span>
              </div>

              <div className="flex items-start justify-between gap-2 py-1.5 border-b border-white/[0.06]">
                <span className="text-[#94A3B8] shrink-0">Subject</span>
                <span className="font-semibold text-[#F8FAFC] text-right">
                  {selectedTicket.subject}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 py-1.5 border-b border-white/[0.06]">
                <span className="text-[#94A3B8]">Category</span>
                <span className="font-medium text-[#F8FAFC]">
                  {selectedTicket.category || 'General Enquiry'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 py-1.5 border-b border-white/[0.06]">
                <span className="text-[#94A3B8]">Original Complaint Date</span>
                <span className="font-mono text-[11px] text-[#CBD5E1]">
                  {formatShortDate(selectedTicket.createdAtISO)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 py-1.5 border-b border-white/[0.06]">
                <span className="text-[#94A3B8]">Related Booking ID</span>
                <span className="font-mono text-[11px] text-[#F8FAFC]">
                  {selectedTicket.bookingId ||
                    selectedTicket.relatedBookingId ||
                    'None'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 py-1.5 border-b border-white/[0.06]">
                <span className="text-[#94A3B8]">Related Product ID</span>
                <span className="font-mono text-[11px] text-[#F8FAFC]">
                  {selectedTicket.productId ||
                    selectedTicket.relatedProductId ||
                    'None'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 py-1.5 border-b border-white/[0.06]">
                <span className="text-[#94A3B8]">Assigned Staff Member</span>
                <span className="font-semibold text-[#F8FAFC]">
                  {assignedStaffLabel}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 py-1">
                <span className="text-[#94A3B8]">Last Activity</span>
                <span className="font-mono text-[11px] text-[#CBD5E1]">
                  {formatShortDate(
                    selectedTicket.updatedAtISO || selectedTicket.createdAtISO
                  )}
                </span>
              </div>

              {isClosedTicket && (
                <>
                  <div className="flex items-center justify-between gap-2 py-1.5 border-t border-white/[0.06]">
                    <span className="text-[#94A3B8]">Closed By</span>
                    <span className="font-semibold text-emerald-400">
                      {closedByStaffDisplayName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 py-1">
                    <span className="text-[#94A3B8]">Closure Timestamp</span>
                    <span className="font-mono text-[11px] text-emerald-400">
                      {formatShortDate(
                        selectedTicket.closedAtISO ||
                          selectedTicket.updatedAtISO
                      )}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 5. ASSIGNMENT & AUDIT HISTORY */}
          <div className="p-5 rounded-2xl bg-[#161E2E] border border-white/[0.08] space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#F8FAFC] flex items-center gap-2">
                <History className="w-4 h-4 text-[#94A3B8]" />
                <span>Assignment & Audit History</span>
              </h3>
              <span className="text-[11px] font-mono text-[#94A3B8]">
                {history.length} events
              </span>
            </div>

            {history.length === 0 ? (
              <p className="text-xs text-[#94A3B8]">
                No workflow audit events recorded yet.
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {history.map((h) => (
                  <div
                    key={h.id}
                    className="p-2.5 rounded-xl bg-[#111827] border border-white/[0.06] text-[11px] space-y-0.5"
                  >
                    <div className="flex items-center justify-between text-[#94A3B8] font-mono text-[10px]">
                      <span className="uppercase text-[#06B6D4] font-semibold">
                        {h.action.replace(/_/g, ' ')}
                      </span>
                      <span>{formatShortDate(h.createdAtISO)}</span>
                    </div>
                    <div className="text-[#F8FAFC] font-medium">
                      {h.summary}
                    </div>
                    <div className="text-[10px] text-[#94A3B8]">
                      Actor: {h.actorName} ({h.actorRole})
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================================
          CLOSE TICKET CONFIRMATION MODAL
         ====================================================================== */}
      {isCloseModalOpen && (
        <div
          data-testid="admin-close-ticket-modal"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="w-full max-w-lg rounded-2xl bg-[#161E2E] border border-white/[0.1] p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                  Confirm Ticket Closure
                </span>
                <h3 className="text-base font-bold text-[#F8FAFC] mt-0.5">
                  Close Support Ticket
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCloseModalOpen(false)}
                className="p-1.5 rounded-lg bg-[#111827] text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Ticket ID & Customer Name Summary */}
            <div className="p-3.5 rounded-xl bg-[#111827] border border-white/[0.08] space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#94A3B8]">Ticket ID:</span>
                <span className="font-mono font-bold text-[#06B6D4]">
                  {selectedTicket.ticketNumber || selectedTicket.id}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#94A3B8]">Customer Name:</span>
                <span className="font-semibold text-[#F8FAFC]">
                  {selectedTicket.userName} ({selectedTicket.userEmail})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#94A3B8]">Subject:</span>
                <span className="text-[#CBD5E1] truncate max-w-[260px]">
                  {selectedTicket.subject}
                </span>
              </div>
            </div>

            <form onSubmit={handleConfirmCloseTicket} className="space-y-4">
              <div>
                <label
                  htmlFor="close-ticket-resolution-summary"
                  className="block text-xs font-semibold text-[#F8FAFC] mb-1.5"
                >
                  Official Resolution Summary{' '}
                  <span className="text-[#EF4444]">*</span>
                </label>
                <textarea
                  id="close-ticket-resolution-summary"
                  data-testid="admin-close-resolution-textarea"
                  rows={4}
                  value={closeResolutionDraft}
                  onChange={(e) => {
                    setCloseResolutionDraft(e.target.value);
                    if (closeModalError) setCloseModalError(null);
                  }}
                  placeholder="Enter the final resolution summary shared with the customer and recorded in the historical archive..."
                  className="w-full rounded-xl bg-[#0B0F19] border border-white/[0.1] p-3.5 text-xs text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-emerald-400"
                />
                <p className="text-[11px] text-[#94A3B8] mt-1">
                  Closing will move this ticket from Active Tickets to Closed
                  Tickets and synchronize the resolution summary with the
                  customer&apos;s support history.
                </p>
              </div>

              {closeModalError && (
                <div className="p-3 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-xs text-[#EF4444]">
                  {closeModalError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  data-testid="admin-cancel-close-ticket-btn"
                  onClick={() => setIsCloseModalOpen(false)}
                  disabled={isUpdatingWorkflow}
                  className="px-4 py-2.5 rounded-xl bg-[#111827] hover:bg-[#1D293B] border border-white/[0.08] text-xs font-semibold text-[#CBD5E1] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="admin-confirm-close-ticket-btn"
                  disabled={isUpdatingWorkflow}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-[#0B0F19] text-xs font-bold cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isUpdatingWorkflow
                      ? 'Closing Ticket...'
                      : 'Confirm & Close Ticket'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================
          REOPEN TICKET CONFIRMATION MODAL
         ====================================================================== */}
      {isReopenModalOpen && (
        <div
          data-testid="admin-reopen-ticket-modal"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-[#161E2E] border border-white/[0.1] p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#06B6D4] font-semibold">
                  Restore Historical Ticket
                </span>
                <h3 className="text-base font-bold text-[#F8FAFC] mt-0.5">
                  Reopen Ticket {selectedTicket.ticketNumber || selectedTicket.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsReopenModalOpen(false)}
                className="p-1.5 rounded-lg bg-[#111827] text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmReopenTicket} className="space-y-4">
              <div>
                <label
                  htmlFor="reopen-ticket-reason"
                  className="block text-xs font-semibold text-[#F8FAFC] mb-1.5"
                >
                  Reason for Reopening (Recorded in Audit History)
                </label>
                <textarea
                  id="reopen-ticket-reason"
                  data-testid="admin-reopen-reason-textarea"
                  rows={3}
                  value={reopenReasonDraft}
                  onChange={(e) => setReopenReasonDraft(e.target.value)}
                  placeholder="Optional note explaining why this closed ticket is being reopened..."
                  className="w-full rounded-xl bg-[#0B0F19] border border-white/[0.1] p-3 text-xs text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsReopenModalOpen(false)}
                  disabled={isUpdatingWorkflow}
                  className="px-4 py-2 rounded-xl bg-[#111827] hover:bg-[#1D293B] border border-white/[0.08] text-xs font-semibold text-[#CBD5E1] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="admin-confirm-reopen-ticket-btn"
                  disabled={isUpdatingWorkflow}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>
                    {isUpdatingWorkflow ? 'Reopening...' : 'Confirm Reopen'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================
          IMAGE ATTACHMENT LIGHTBOX PREVIEW MODAL
         ====================================================================== */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-3xl w-full rounded-2xl bg-[#161E2E] border border-white/[0.12] overflow-hidden shadow-2xl"
          >
            <div className="px-4 py-3 bg-[#111827] border-b border-white/[0.08] flex items-center justify-between">
              <span className="text-xs font-semibold text-[#F8FAFC] truncate">
                {lightboxImage.name}
              </span>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="p-1 rounded-lg text-[#94A3B8] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-[#0B0F19]">
              <img
                src={lightboxImage.url}
                alt={lightboxImage.name}
                className="max-h-[75vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
