import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  LifeBuoy,
  Mail,
  MessageSquare,
  Paperclip,
  Plus,
  Send,
  ShieldCheck,
  Ticket,
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
  SupportTicketMessageRecord,
  SupportTicketPriority,
  SupportTicketRecord,
} from '../types/marketplace';
import { PageRoute } from '../components/Navbar';
import {
  SUPPORT_CATEGORIES,
  createCustomerSupportTicket,
  fetchCustomerSupportTickets,
  fetchTicketConversationAndHistory,
  postSupportTicketReplyOrNote,
  uploadSupportAttachment,
} from '../services/supportTicketService';
import {
  formatSupportStatusLabel,
  getPriorityBadgeStyle,
  getStatusBadgeStyle,
} from '../components/support/AdminTicketsModule';

interface MySupportPageProps {
  userProfile: BorrowBoxUserProfile | null;
  userBookings: RentalBookingRecord[];
  userListings: ProductListing[];
  initialTicketId?: string;
  isAuthorizedAdmin?: boolean;
  onNavigate: (route: PageRoute) => void;
  onNotificationsLoaded?: (notifications: AppNotificationItem[]) => void;
}

export const MySupportPage: React.FC<MySupportPageProps> = ({
  userProfile,
  userBookings,
  userListings,
  initialTicketId,
  isAuthorizedAdmin = false,
  onNavigate,
  onNotificationsLoaded,
}) => {
  const [activeTab, setActiveTab] = useState<'active' | 'history' | 'create'>(
    'active'
  );
  const [tickets, setTickets] = useState<SupportTicketRecord[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(
    initialTicketId || null
  );

  // Selected Ticket Conversation State
  const [messages, setMessages] = useState<SupportTicketMessageRecord[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyAttachments, setReplyAttachments] = useState<
    SupportAttachmentItem[]
  >([]);
  const [uploadingReplyFile, setUploadingReplyFile] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const replyFileInputRef = useRef<HTMLInputElement | null>(null);

  // Create Ticket Form State
  const [category, setCategory] =
    useState<SupportTicketCategory>('Booking Issue');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<SupportTicketPriority>('normal');
  const [bookingId, setBookingId] = useState('');
  const [productId, setProductId] = useState('');
  const [newTicketAttachments, setNewTicketAttachments] = useState<
    SupportAttachmentItem[]
  >([]);
  const [uploadingCreateFile, setUploadingCreateFile] = useState(false);
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const submitLockRef = useRef(false);
  const createFileInputRef = useRef<HTMLInputElement | null>(null);

  const [banner, setBanner] = useState<{
    tone: 'success' | 'error';
    text: string;
  } | null>(null);

  const loadTickets = async () => {
    if (!userProfile?.uid) return;
    setLoadingTickets(true);
    try {
      const res = await fetchCustomerSupportTickets(userProfile.uid);
      setTickets(res.tickets);
      if (onNotificationsLoaded) {
        onNotificationsLoaded(res.notifications);
      }
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    void loadTickets();
  }, [userProfile?.uid]);

  useEffect(() => {
    if (initialTicketId) {
      setSelectedTicketId(initialTicketId);
    }
  }, [initialTicketId]);

  // Active Tickets: ONLY Open, In Progress, Waiting for User
  const activeTickets = useMemo(
    () =>
      tickets.filter(
        (t) =>
          t.status === 'open' ||
          t.status === 'in_progress' ||
          t.status === 'waiting_for_user'
      ),
    [tickets]
  );

  // Resolved History: Resolved and Closed tickets
  const resolvedHistoryTickets = useMemo(
    () =>
      tickets.filter((t) => t.status === 'resolved' || t.status === 'closed'),
    [tickets]
  );

  const selectedTicket = useMemo(
    () => tickets.find((t) => t.id === selectedTicketId) || null,
    [tickets, selectedTicketId]
  );

  useEffect(() => {
    if (!selectedTicket || !userProfile) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    setLoadingMessages(true);

    void fetchTicketConversationAndHistory({
      ticket: selectedTicket,
      viewerUid: userProfile.uid,
      viewerRole: 'customer',
    })
      .then((res) => {
        if (!cancelled) {
          // Strictly ensure no internal messages are ever shown to customer
          setMessages(res.messages.filter((m) => !m.isInternal));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingMessages(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedTicket?.id, userProfile?.uid]);

  if (!userProfile) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto">
          <LifeBuoy className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Sign in to access My Support
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
          Log in to your BorrowBox account to create support tickets, communicate
          with assigned support specialists, and track your requests.
        </p>
        <button
          type="button"
          onClick={() => onNavigate({ page: 'login' })}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition"
        >
          Sign In
        </button>
      </div>
    );
  }

  const handleUploadNewTicketAttachment = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCreateFile(true);
    setBanner(null);
    try {
      const uploaded = await uploadSupportAttachment(file, userProfile.uid);
      setNewTicketAttachments((prev) => [...prev, uploaded]);
    } catch (err) {
      setBanner({
        tone: 'error',
        text: err instanceof Error ? err.message : 'File upload failed.',
      });
    } finally {
      setUploadingCreateFile(false);
      if (createFileInputRef.current) createFileInputRef.current.value = '';
    }
  };

  const handleUploadReplyAttachment = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingReplyFile(true);
    setBanner(null);
    try {
      const uploaded = await uploadSupportAttachment(file, userProfile.uid);
      setReplyAttachments((prev) => [...prev, uploaded]);
    } catch (err) {
      setBanner({
        tone: 'error',
        text: err instanceof Error ? err.message : 'File upload failed.',
      });
    } finally {
      setUploadingReplyFile(false);
      if (replyFileInputRef.current) replyFileInputRef.current.value = '';
    }
  };

  const handleCreateTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Prevent duplicate ticket creation from repeated button clicks
    if (submitLockRef.current || submittingTicket) return;
    submitLockRef.current = true;
    setSubmittingTicket(true);
    setBanner(null);

    try {
      const canUseUrgent =
        isAuthorizedAdmin ||
        category === 'Safety Concern' ||
        category === 'Payment & Deposit';
      const created = await createCustomerSupportTicket({
        userId: userProfile.uid,
        userName: userProfile.name,
        userEmail: userProfile.email,
        category,
        subject,
        description,
        priority,
        canSelectUrgentPriority: canUseUrgent,
        bookingId,
        productId,
        attachments: newTicketAttachments,
      });

      setTickets((prev) => [created, ...prev]);
      setSubject('');
      setDescription('');
      setPriority('normal');
      setBookingId('');
      setProductId('');
      setNewTicketAttachments([]);
      setActiveTab('active');
      setSelectedTicketId(created.id);
      setBanner({
        tone: 'success',
        text:
          created.emailOpenedStatus === 'sent'
            ? `Support ticket ${created.ticketNumber} created! A confirmation email ("BorrowBox Support: Your Ticket Has Been Created - ${created.ticketNumber}") has been sent to ${userProfile.email}.`
            : `Support ticket ${created.ticketNumber} created! You can track your request and communicate with our support team directly here in My Support.`,
      });
    } catch (err) {
      setBanner({
        tone: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'Could not submit support ticket.',
      });
    } finally {
      setSubmittingTicket(false);
      submitLockRef.current = false;
    }
  };

  const handleCustomerReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || sendingReply) return;
    if (!replyText.trim()) return;

    setSendingReply(true);
    setBanner(null);
    try {
      const { messageRecord, updatedTicket } =
        await postSupportTicketReplyOrNote({
          ticket: selectedTicket,
          senderId: userProfile.uid,
          senderName: userProfile.name,
          senderEmail: userProfile.email,
          senderRole: 'customer',
          message: replyText.trim(),
          attachments: replyAttachments,
          isInternal: false,
        });
      setMessages((prev) => [...prev, messageRecord]);
      setTickets((prev) =>
        prev.map((t) => (t.id === updatedTicket.id ? updatedTicket : t))
      );
      setReplyText('');
      setReplyAttachments([]);
    } catch (err) {
      setBanner({
        tone: 'error',
        text: err instanceof Error ? err.message : 'Failed to send reply.',
      });
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate({ page: 'profile' })}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            title="Back to My Profile"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                BorrowBox Customer Care
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              My Support
            </h1>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setSelectedTicketId(null);
            setActiveTab('create');
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Create Support Ticket
        </button>
      </div>

      {/* Feedback Banner */}
      {banner && (
        <div
          className={`rounded-2xl p-4 border flex items-start justify-between gap-3 text-xs ${
            banner.tone === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {banner.tone === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <p className="font-medium leading-relaxed">{banner.text}</p>
          </div>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="text-slate-400 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => {
            setSelectedTicketId(null);
            setActiveTab('active');
          }}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
            activeTab === 'active' && !selectedTicket
              ? 'bg-indigo-600 text-white'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50'
          }`}
        >
          <Ticket className="w-3.5 h-3.5" />
          <span>Active Requests</span>
          <span className="px-1.5 py-0.2 rounded-md text-[11px] font-bold bg-indigo-500/20">
            {activeTickets.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedTicketId(null);
            setActiveTab('history');
          }}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
            activeTab === 'history' && !selectedTicket
              ? 'bg-indigo-600 text-white'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Resolved History</span>
          <span className="px-1.5 py-0.2 rounded-md text-[11px] font-bold bg-slate-500/20">
            {resolvedHistoryTickets.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedTicketId(null);
            setActiveTab('create');
          }}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
            activeTab === 'create' && !selectedTicket
              ? 'bg-indigo-600 text-white'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Support Ticket</span>
        </button>
      </div>

      {/* VIEW 1: SELECTED TICKET CONVERSATION & DETAILS */}
      {selectedTicket ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Ticket Metadata Sidebar */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <button
              type="button"
              onClick={() => setSelectedTicketId(null)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to{' '}
              {selectedTicket.status === 'resolved' ||
              selectedTicket.status === 'closed'
                ? 'Resolved History'
                : 'Active Requests'}
            </button>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3 text-xs">
              <div>
                <p className="text-slate-400 font-medium">Ticket ID</p>
                <p className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {selectedTicket.ticketNumber || selectedTicket.id}
                </p>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-slate-400 font-medium">Status</p>
                  <span
                    className={`inline-block mt-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${getStatusBadgeStyle(
                      selectedTicket.status
                    )}`}
                  >
                    {formatSupportStatusLabel(selectedTicket.status)}
                  </span>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Priority</p>
                  <span
                    className={`inline-block mt-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${getPriorityBadgeStyle(
                      selectedTicket.priority
                    )}`}
                  >
                    {selectedTicket.priority === 'urgent' ? 'Urgent' : 'Normal'}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-slate-400 font-medium">Category</p>
                <p className="font-semibold text-slate-900 dark:text-white mt-0.5">
                  {selectedTicket.category || 'General Enquiry'}
                </p>
              </div>

              <div>
                <p className="text-slate-400 font-medium">
                  Assigned Support Staff
                </p>
                <p className="font-semibold text-slate-900 dark:text-white mt-0.5 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                  <span>
                    {selectedTicket.assignedStaffName ||
                      (selectedTicket.assignedToEmail
                        ? 'BorrowBox Support Specialist'
                        : 'Awaiting Staff Claim')}
                  </span>
                </p>
              </div>

              {selectedTicket.bookingId && (
                <div>
                  <p className="text-slate-400 font-medium">
                    Related Booking ID
                  </p>
                  <p className="font-mono text-slate-700 dark:text-slate-300 mt-0.5">
                    {selectedTicket.bookingId}
                  </p>
                </div>
              )}

              {selectedTicket.productId && (
                <div>
                  <p className="text-slate-400 font-medium">
                    Related Product ID
                  </p>
                  <p className="font-mono text-slate-700 dark:text-slate-300 mt-0.5">
                    {selectedTicket.productId}
                  </p>
                </div>
              )}

              <div>
                <p className="text-slate-400 font-medium">Created On</p>
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

              {/* Resolution Summary Box for Resolved / Closed Tickets */}
              {(selectedTicket.status === 'resolved' ||
                selectedTicket.status === 'closed') &&
                selectedTicket.resolutionSummary && (
                  <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 p-3.5 space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      Resolution Summary
                    </p>
                    <p className="text-xs text-emerald-950 dark:text-emerald-200 leading-relaxed">
                      {selectedTicket.resolutionSummary}
                    </p>
                  </div>
                )}
            </div>
          </div>

          {/* Conversation Thread & Customer Reply Composer */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col min-h-[500px]">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Support Conversation
              </p>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                {selectedTicket.subject}
              </h2>
            </div>

            <div className="flex-1 p-4 space-y-3.5 overflow-y-auto max-h-[420px]">
              {loadingMessages ? (
                <p className="text-xs text-slate-400 text-center py-8">
                  Loading conversation...
                </p>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderRole === 'customer';
                  return (
                    <div
                      key={msg.id}
                      className={`rounded-2xl p-3.5 border ${
                        isMe
                          ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800'
                          : 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/50 ml-4'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {msg.senderName}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              isMe
                                ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                                : 'bg-indigo-600 text-white'
                            }`}
                          >
                            {isMe ? 'You' : 'BorrowBox Support'}
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
                        <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-wrap gap-2">
                          {msg.attachments.map((att) => (
                            <a
                              key={att.id}
                              href={att.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
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

            {/* Reply Composer (Active Tickets Only) */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-b-2xl">
              {selectedTicket.status === 'resolved' ||
              selectedTicket.status === 'closed' ? (
                <div className="rounded-xl bg-slate-100 dark:bg-slate-800 p-3 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between gap-3">
                  <span>
                    This ticket is{' '}
                    <strong>
                      {formatSupportStatusLabel(selectedTicket.status)}
                    </strong>{' '}
                    and stored in your Resolved History.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTicketId(null);
                      setActiveTab('create');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-semibold shrink-0"
                  >
                    Open Follow-Up Ticket
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={handleCustomerReplySubmit}
                  className="space-y-2.5"
                >
                  <textarea
                    rows={3}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a reply to your support specialist..."
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
                        ref={replyFileInputRef}
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.txt"
                        onChange={handleUploadReplyAttachment}
                        className="hidden"
                      />
                      <button
                        type="button"
                        disabled={uploadingReplyFile}
                        onClick={() => replyFileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition"
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                        {uploadingReplyFile ? 'Uploading...' : 'Attach File'}
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={sendingReply || !replyText.trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {sendingReply ? 'Sending...' : 'Send Message'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      ) : activeTab === 'create' ? (
        /* VIEW 2: CREATE NEW SUPPORT TICKET FORM */
        <form
          onSubmit={handleCreateTicketSubmit}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-2xl space-y-4"
        >
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Submit a Support Request
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              A unique Ticket ID (BBX-2026-XXXXXX) will be generated and emailed
              to <strong>{userProfile.email}</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as SupportTicketCategory)
                }
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white"
              >
                {SUPPORT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Priority Level
              </label>
              <select
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as SupportTicketPriority)
                }
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white"
              >
                <option value="normal">Normal (Default)</option>
                {(isAuthorizedAdmin ||
                  category === 'Safety Concern' ||
                  category === 'Payment & Deposit') && (
                  <option value="urgent">
                    Urgent (Payment, Booking Emergency, or Safety)
                  </option>
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Subject
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of your issue..."
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Related Booking ID (Optional)
              </label>
              {userBookings.length > 0 ? (
                <select
                  value={bookingId}
                  onChange={(e) => setBookingId(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white"
                >
                  <option value="">None</option>
                  {userBookings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.id} — {b.listingTitle}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={bookingId}
                  onChange={(e) => setBookingId(e.target.value)}
                  placeholder="e.g. BKG-1024"
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Related Product ID (Optional)
              </label>
              {userListings.length > 0 ? (
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white"
                >
                  <option value="">None</option>
                  {userListings.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id} — {p.title}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  placeholder="e.g. LST-2048"
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white"
                />
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Detailed Description
            </label>
            <textarea
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain what happened and how our support team can help..."
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white"
            />
          </div>

          {/* Optional Attachments */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Attachments (Optional, max 5MB)
              </label>
              <input
                ref={createFileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.txt"
                onChange={handleUploadNewTicketAttachment}
                className="hidden"
              />
              <button
                type="button"
                disabled={uploadingCreateFile}
                onClick={() => createFileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition"
              >
                <Paperclip className="w-3.5 h-3.5" />
                {uploadingCreateFile ? 'Uploading...' : 'Add File'}
              </button>
            </div>

            {newTicketAttachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {newTicketAttachments.map((att) => (
                  <span
                    key={att.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-700 dark:text-indigo-300"
                  >
                    <Paperclip className="w-3 h-3" />
                    {att.name}
                    <button
                      type="button"
                      onClick={() =>
                        setNewTicketAttachments((prev) =>
                          prev.filter((x) => x.id !== att.id)
                        )
                      }
                      className="text-slate-400 hover:text-rose-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('active')}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingTicket}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition"
            >
              {submittingTicket ? 'Submitting Ticket...' : 'Submit Ticket'}
            </button>
          </div>
        </form>
      ) : (
        /* VIEW 3: ACTIVE REQUESTS OR RESOLVED HISTORY LIST */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {loadingTickets ? (
            <div className="p-10 text-center text-xs text-slate-400">
              Loading your support tickets...
            </div>
          ) : (activeTab === 'active'
              ? activeTickets
              : resolvedHistoryTickets
            ).length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Ticket className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {activeTab === 'active'
                  ? 'No Active Support Tickets'
                  : 'No Resolved Tickets Yet'}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {activeTab === 'active'
                  ? 'All your active Open, In Progress, and Waiting for User requests appear here. Resolved and Closed tickets automatically move to your Resolved History.'
                  : 'Once a support specialist resolves and closes your request, the full conversation and resolution summary will be archived here.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {(activeTab === 'active'
                ? activeTickets
                : resolvedHistoryTickets
              ).map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTicketId(t.id)}
                  className="p-4 sm:p-5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {t.ticketNumber || t.id}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${getStatusBadgeStyle(
                          t.status
                        )}`}
                      >
                        {formatSupportStatusLabel(t.status)}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${getPriorityBadgeStyle(
                          t.priority
                        )}`}
                      >
                        {t.priority === 'urgent' ? 'Urgent' : 'Normal'}
                      </span>
                      <span className="text-xs text-slate-500">
                        · {t.category || 'General Enquiry'}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {t.subject}
                    </h3>

                    <p className="text-xs text-slate-500 line-clamp-1">
                      {t.resolutionSummary
                        ? `Resolution: ${t.resolutionSummary}`
                        : t.description}
                    </p>
                  </div>

                  <div className="text-left sm:text-right text-xs shrink-0 space-y-1">
                    <p className="font-semibold text-slate-700 dark:text-slate-300">
                      {t.assignedStaffName
                        ? `Assigned: ${t.assignedStaffName}`
                        : 'Awaiting Staff Assignment'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {new Date(t.createdAtISO).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
