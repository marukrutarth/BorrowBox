import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Archive,
  BarChart3,
  Bell,
  Calendar,
  CheckCircle2,
  Edit3,
  IndianRupee,
  LayoutDashboard,
  MessageSquare,
  Package,
  PlusCircle,
  QrCode,
  Send,
  ShieldCheck,
  Star,
  Upload,
  User,
  XCircle,
  FileText,
  Printer,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  AdminRegistryRecord,
  AppNotificationItem,
  BookingMessageRecord,
  BookingStatus,
  BorrowBoxUserProfile,
  DepositStatus,
  ProductListing,
  RentalBookingRecord,
  RentalReviewRecord,
} from '../types/marketplace';
import {
  ROLE_DEFINITIONS,
  shouldShowAdminPanelOption,
} from '../utils/adminRbac';
import {
  ALL_CATEGORIES,
  formatINR,
  isListingAvailableForDates,
} from '../utils/rentalLogic';
import { PageRoute } from '../components/Navbar';
import { InvoiceModal } from '../components/billing/InvoiceModal';

interface DashboardPageProps {
  userProfile: BorrowBoxUserProfile;
  verifiedAdminRecord?: AdminRegistryRecord | null;
  listings: ProductListing[];
  bookings: RentalBookingRecord[];
  messagesByBooking: Record<string, BookingMessageRecord[]>;
  reviews: RentalReviewRecord[];
  notifications: AppNotificationItem[];
  onNavigate: (route: PageRoute) => void;
  onEditListing: (listing: ProductListing) => void;
  onToggleArchiveListing: (listing: ProductListing) => Promise<void>;
  onUpdateBookingWorkflow: (
    booking: RentalBookingRecord,
    nextStatus: BookingStatus,
    nextDepositStatus: DepositStatus,
    extra?: {
      pickupConditionNote?: string;
      pickupPhotoUrl?: string;
      returnConditionNote?: string;
      returnPhotoUrl?: string;
      disputeReason?: string;
    }
  ) => Promise<void>;
  onSendMessage: (booking: RentalBookingRecord, text: string) => Promise<void>;
  onLoadMessagesForBooking: (booking: RentalBookingRecord) => Promise<void>;
  onSubmitReview: (
    booking: RentalBookingRecord,
    rating: number,
    comment: string
  ) => Promise<void>;
  onMarkNotificationsRead: () => void;
}

/**
 * Animated Counter for Dashboard Statistics
 */
const AnimatedCounter: React.FC<{
  target: number;
  isCurrency?: boolean;
}> = ({ target, isCurrency = false }) => {
  const [displayVal, setDisplayVal] = useState(0);

  useEffect(() => {
    let frame = 0;
    const totalFrames = 18;
    const timer = setInterval(() => {
      frame += 1;
      if (frame >= totalFrames) {
        setDisplayVal(target);
        clearInterval(timer);
      } else {
        setDisplayVal(Math.round((target * frame) / totalFrames));
      }
    }, 18);
    return () => clearInterval(timer);
  }, [target]);

  return (
    <span className="font-mono-tabular">
      {isCurrency ? formatINR(displayVal) : displayVal}
    </span>
  );
};

/**
 * Renders a deterministic SVG QR-style matrix from a booking handover code.
 */
const HandoverQrMatrix: React.FC<{ code: string }> = ({ code }) => {
  const size = 9;
  const cells: boolean[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const isCorner =
        (r < 3 && c < 3) ||
        (r < 3 && c >= size - 3) ||
        (r >= size - 3 && c < 3);
      if (isCorner) {
        const isBorder =
          r === 0 ||
          r === 2 ||
          r === size - 1 ||
          r === size - 3 ||
          c === 0 ||
          c === 2 ||
          c === size - 1 ||
          c === size - 3 ||
          (r === 1 && c === 1) ||
          (r === 1 && c === size - 2) ||
          (r === size - 2 && c === 1);
        cells.push(isBorder);
      } else {
        const charCode = code.charCodeAt((r * size + c) % code.length) || 65;
        cells.push((charCode + r * 7 + c * 13) % 2 === 0);
      }
    }
  }

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="w-20 h-20 border border-white/[0.15] rounded-lg bg-white p-1.5 shrink-0"
      aria-label={`QR verification code ${code}`}
    >
      {cells.map((filled, idx) => {
        if (!filled) return null;
        const r = Math.floor(idx / size);
        const c = idx % size;
        return (
          <rect
            key={idx}
            x={c}
            y={r}
            width={0.9}
            height={0.9}
            fill="#0B0F19"
          />
        );
      })}
    </svg>
  );
};

export const DashboardPage: React.FC<DashboardPageProps> = ({
  userProfile,
  verifiedAdminRecord = null,
  listings,
  bookings,
  messagesByBooking,
  reviews,
  notifications,
  onNavigate,
  onEditListing,
  onToggleArchiveListing,
  onUpdateBookingWorkflow,
  onSendMessage,
  onLoadMessagesForBooking,
  onSubmitReview,
  onMarkNotificationsRead,
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'borrower' | 'lender' | 'trust' | 'billing'
  >(userProfile.activeMode === 'owner' ? 'lender' : 'borrower');

  // Invoice modal state
  const [selectedInvoiceBooking, setSelectedInvoiceBooking] =
    useState<RentalBookingRecord | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  // Expanded booking panel states
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [conditionNoteInput, setConditionNoteInput] = useState('');
  const [conditionPhotoInput, setConditionPhotoInput] = useState('');
  const [qrCodeVerifyInput, setQrCodeVerifyInput] = useState('');
  const [disputeReasonInput, setDisputeReasonInput] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [preferredIdType, setPreferredIdType] = useState(
    'Aadhaar Card (Last 4 digits verified in person)'
  );
  const [idPreferenceSaved, setIdPreferenceSaved] = useState(false);

  const myBorrowerBookings = bookings.filter(
    (b) => b.borrowerId === userProfile.uid
  );
  const myLenderBookings = bookings.filter(
    (b) => b.ownerId === userProfile.uid
  );
  const myListings = listings.filter(
    (l) => !l.isDemoData && l.owner.id === userProfile.uid
  );

  // Compute Analytics Metrics for SaaS Dashboard Overview
  const dashboardStats = useMemo(() => {
    const activeCatalogCount = listings.filter(
      (l) => l.status !== 'archived'
    ).length;
    const totalBookingVolumeINR = bookings.reduce(
      (acc, b) => acc + b.netRentalCostINR,
      0
    );
    const totalDepositsProtectedINR = bookings.reduce(
      (acc, b) => acc + b.refundableDepositINR,
      0
    );
    const potentialMonthlyLenderIncomeINR = myListings
      .filter((l) => l.status !== 'archived')
      .reduce((acc, l) => acc + l.dailyPriceINR * 8, 0);

    const categoryBreakdown = ALL_CATEGORIES.map((cat) => {
      const itemsInCat = listings.filter(
        (l) => l.category === cat && l.status !== 'archived'
      );
      const avgDailyINR =
        itemsInCat.length > 0
          ? Math.round(
              itemsInCat.reduce((s, i) => s + i.dailyPriceINR, 0) /
                itemsInCat.length
            )
          : 0;
      return {
        category: cat,
        count: itemsInCat.length,
        avgDailyINR,
      };
    });

    return {
      activeCatalogCount,
      totalBookingVolumeINR,
      totalDepositsProtectedINR,
      potentialMonthlyLenderIncomeINR,
      categoryBreakdown,
    };
  }, [listings, bookings, myListings]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setConditionPhotoInput(reader.result.slice(0, 300000));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleOwnerAccept = async (booking: RentalBookingRecord) => {
    setActionFeedback(null);
    const targetListing = listings.find((l) => l.id === booking.listingId);
    if (targetListing) {
      const check = isListingAvailableForDates(
        targetListing,
        booking.startDate,
        booking.endDate,
        bookings.filter((b) => b.id !== booking.id)
      );
      if (!check.available) {
        setActionFeedback({
          type: 'error',
          text:
            check.reason ||
            'Cannot accept: dates overlap with another accepted reservation.',
        });
        return;
      }
    }
    try {
      await onUpdateBookingWorkflow(booking, 'accepted', 'pending_pickup');
      setActionFeedback({
        type: 'success',
        text: `Booking ${booking.id} accepted. Handover QR code ${booking.handoverCode} is now active.`,
      });
    } catch (err) {
      setActionFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to accept booking.',
      });
    }
  };

  const handlePickupConfirm = async (booking: RentalBookingRecord) => {
    setActionFeedback(null);
    if (
      qrCodeVerifyInput.trim().toUpperCase() !==
      booking.handoverCode.toUpperCase()
    ) {
      setActionFeedback({
        type: 'error',
        text: `Enter matching handover verification code (${booking.handoverCode}) to confirm item pickup.`,
      });
      return;
    }
    try {
      await onUpdateBookingWorkflow(booking, 'picked_up', 'held_at_pickup', {
        pickupConditionNote:
          conditionNoteInput.trim() ||
          `Verified at pickup on ${new Date().toLocaleDateString('en-IN')}.`,
        pickupPhotoUrl: conditionPhotoInput.trim(),
      });
      setConditionNoteInput('');
      setConditionPhotoInput('');
      setQrCodeVerifyInput('');
      setActionFeedback({
        type: 'success',
        text: 'Pickup confirmed and refundable deposit marked as Held at Pickup.',
      });
    } catch (err) {
      setActionFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to confirm pickup.',
      });
    }
  };

  const handleReturnConfirm = async (
    booking: RentalBookingRecord,
    nextStatus: 'returned' | 'completed'
  ) => {
    setActionFeedback(null);
    try {
      await onUpdateBookingWorkflow(
        booking,
        nextStatus,
        nextStatus === 'completed' ? 'refunded' : 'held_at_pickup',
        {
          returnConditionNote:
            conditionNoteInput.trim() ||
            `Returned in verified condition on ${new Date().toLocaleDateString(
              'en-IN'
            )}.`,
          returnPhotoUrl: conditionPhotoUrlOrDefault(
            conditionPhotoInput,
            booking.returnPhotoUrl
          ),
        }
      );
      setConditionNoteInput('');
      setConditionPhotoInput('');
      setActionFeedback({
        type: 'success',
        text:
          nextStatus === 'completed'
            ? 'Rental completed and security deposit marked as Refunded.'
            : 'Return logged. Waiting for owner final inspection to release deposit.',
      });
    } catch (err) {
      setActionFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update return.',
      });
    }
  };

  function conditionPhotoUrlOrDefault(input: string, existing: string): string {
    return input.trim() || existing || '';
  }

  const handleRaiseDispute = async (booking: RentalBookingRecord) => {
    setActionFeedback(null);
    if (disputeReasonInput.trim().length < 10) {
      setActionFeedback({
        type: 'error',
        text: 'Please describe the issue or damage (at least 10 characters) to log a dispute.',
      });
      return;
    }
    try {
      await onUpdateBookingWorkflow(booking, 'disputed', 'disputed', {
        disputeReason: disputeReasonInput.trim(),
      });
      setDisputeReasonInput('');
      setActionFeedback({
        type: 'success',
        text: 'Dispute logged and deposit frozen pending resolution.',
      });
    } catch (err) {
      setActionFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to log dispute.',
      });
    }
  };

  const handleSendBookingMessage = async (booking: RentalBookingRecord) => {
    if (!messageInput.trim()) return;
    try {
      await onSendMessage(booking, messageInput.trim());
      setMessageInput('');
    } catch (err) {
      setActionFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not send message.',
      });
    }
  };

  const handleReviewSubmit = async (booking: RentalBookingRecord) => {
    setActionFeedback(null);
    if (reviewComment.trim().length < 5) {
      setActionFeedback({
        type: 'error',
        text: 'Please write a short review (at least 5 characters).',
      });
      return;
    }
    try {
      await onSubmitReview(booking, reviewRating, reviewComment.trim());
      setReviewComment('');
      setActionFeedback({
        type: 'success',
        text: 'Verified rental review published.',
      });
    } catch (err) {
      setActionFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not submit review.',
      });
    }
  };

  const renderBookingCard = (
    booking: RentalBookingRecord,
    perspective: 'borrower' | 'lender'
  ) => {
    const isExpanded = activeBookingId === booking.id;
    const messages = messagesByBooking[booking.id] || [];
    const alreadyReviewed = reviews.some((r) => r.bookingId === booking.id);

    return (
      <div
        key={booking.id}
        className="border border-white/[0.08] rounded-xl bg-[#161E2E] p-5 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#94A3B8] flex-wrap">
              <span className="font-mono-tabular font-medium text-[#F8FAFC]">
                #{booking.id}
              </span>
              <span aria-hidden="true">·</span>
              <span>{booking.listingCity}</span>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-[#8B5CF6] uppercase">
                Status: {booking.status.replace('_', ' ')}
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-[#06B6D4]">
                Deposit: {booking.depositStatus.replace(/_/g, ' ')}
              </span>
            </div>
            <h3 className="text-base font-semibold text-[#F8FAFC] mt-1">
              {booking.listingTitle}
            </h3>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              {perspective === 'borrower'
                ? `Owner: ${booking.ownerName}`
                : `Borrower: ${booking.borrowerName}`}{' '}
              · Dates:{' '}
              <span className="font-mono-tabular font-medium text-[#F8FAFC]">
                {booking.startDate} to {booking.endDate} ({booking.days}d)
              </span>
            </p>
          </div>

          <div className="text-left sm:text-right shrink-0">
            <p className="text-base font-bold text-[#F8FAFC] font-mono-tabular">
              {formatINR(booking.netRentalCostINR)}{' '}
              <span className="text-xs font-normal text-[#94A3B8]">rental</span>
            </p>
            <p className="text-xs text-[#06B6D4] font-mono-tabular">
              + {formatINR(booking.refundableDepositINR)} deposit
            </p>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {perspective === 'lender' && booking.status === 'pending' && (
              <>
                <button
                  type="button"
                  onClick={() => void handleOwnerAccept(booking)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Accept Request
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void onUpdateBookingWorkflow(
                      booking,
                      'rejected',
                      'pending_pickup'
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Reject
                </button>
              </>
            )}

            {perspective === 'borrower' && booking.status === 'pending' && (
              <button
                type="button"
                onClick={() =>
                  void onUpdateBookingWorkflow(
                    booking,
                    'cancelled',
                    'pending_pickup'
                  )
                }
                className="px-3 py-1.5 bg-[#1D293B] hover:bg-[#334155] text-[#F8FAFC] border border-white/[0.08] text-xs font-semibold rounded-lg cursor-pointer"
              >
                Cancel Request
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (isExpanded) {
                  setActiveBookingId(null);
                } else {
                  setActiveBookingId(booking.id);
                  void onLoadMessagesForBooking(booking);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1D293B] hover:bg-[#334155] text-[#F8FAFC] border border-white/[0.08] text-xs font-semibold rounded-lg cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5 text-[#8B5CF6]" />
              {isExpanded
                ? 'Hide Handover, Messages & Audit Log'
                : 'Manage Handover, QR, Messages & Dispute'}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setSelectedInvoiceBooking(booking);
                setIsInvoiceModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111827] hover:bg-[#1D293B] border border-white/[0.08] text-xs font-medium text-[#F8FAFC] cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-[#8B5CF6]" />
              <span>Tax Invoice</span>
            </button>

            <button
              type="button"
              onClick={() =>
                onNavigate({ page: 'details', itemId: booking.listingId })
              }
              className="text-xs font-semibold text-[#8B5CF6] hover:text-[#A78BFA] cursor-pointer"
            >
              View Item Page →
            </button>
          </div>
        </div>

        {/* Expanded Handover, QR Verification, Condition Photos, Messaging & Review Panel */}
        {isExpanded && (
          <div className="pt-4 border-t border-white/[0.08] grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#111827] p-4 rounded-xl">
            {/* Left 6 cols: QR Code + Pickup/Return Condition Confirmation + Review/Dispute */}
            <div className="lg:col-span-6 space-y-4">
              {/* QR Code & Handover Code */}
              <div className="p-3.5 bg-[#161E2E] border border-white/[0.08] rounded-xl flex items-center gap-4">
                <HandoverQrMatrix code={booking.handoverCode} />
                <div className="space-y-1 text-xs">
                  <p className="font-semibold text-[#F8FAFC]">
                    Handover QR & Verification Code
                  </p>
                  <p className="font-mono-tabular text-sm font-bold text-[#8B5CF6]">
                    {booking.handoverCode}
                  </p>
                  <p className="text-[#94A3B8] leading-relaxed">
                    Match this code during in-person pickup and return alongside
                    timestamped condition notes.
                  </p>
                </div>
              </div>

              {/* Condition Log History */}
              {(booking.pickupConditionNote ||
                booking.returnConditionNote ||
                booking.disputeReason) && (
                <div className="p-3.5 bg-[#161E2E] border border-white/[0.08] rounded-xl space-y-2 text-xs">
                  <p className="font-semibold text-[#F8FAFC]">
                    Auditable Handover & Condition Log
                  </p>
                  {booking.pickupConditionNote && (
                    <div className="text-[#94A3B8]">
                      <strong className="text-[#F8FAFC]">Pickup Log:</strong>{' '}
                      {booking.pickupConditionNote}
                      {booking.pickupPhotoUrl && (
                        <img
                          src={booking.pickupPhotoUrl}
                          alt="Pickup condition"
                          className="mt-1.5 w-24 h-16 object-cover rounded border border-white/[0.08]"
                        />
                      )}
                    </div>
                  )}
                  {booking.returnConditionNote && (
                    <div className="text-[#94A3B8]">
                      <strong className="text-[#F8FAFC]">Return Log:</strong>{' '}
                      {booking.returnConditionNote}
                      {booking.returnPhotoUrl && (
                        <img
                          src={booking.returnPhotoUrl}
                          alt="Return condition"
                          className="mt-1.5 w-24 h-16 object-cover rounded border border-white/[0.08]"
                        />
                      )}
                    </div>
                  )}
                  {booking.disputeReason && (
                    <div className="p-2 rounded bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444]">
                      <strong>Dispute Reason:</strong> {booking.disputeReason}
                    </div>
                  )}
                </div>
              )}

              {/* Step 1: Confirm Pickup */}
              {booking.status === 'accepted' && (
                <div className="p-4 bg-[#161E2E] border border-white/[0.08] rounded-xl space-y-3">
                  <h4 className="text-xs font-semibold text-[#F8FAFC]">
                    Confirm Item Pickup & Condition
                  </h4>
                  <div>
                    <label className="block text-xs text-[#94A3B8] mb-1">
                      Enter Verification Code ({booking.handoverCode})
                    </label>
                    <input
                      type="text"
                      value={qrCodeVerifyInput}
                      onChange={(e) => setQrCodeVerifyInput(e.target.value)}
                      placeholder={booking.handoverCode}
                      className="w-full px-3 py-1.5 bg-[#111827] border border-white/[0.08] rounded-lg text-xs font-mono-tabular text-[#F8FAFC]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#94A3B8] mb-1">
                      Pickup Condition Note
                    </label>
                    <input
                      type="text"
                      value={conditionNoteInput}
                      onChange={(e) => setConditionNoteInput(e.target.value)}
                      placeholder="e.g., Sensor clean, 2 batteries included, working properly"
                      className="w-full px-3 py-1.5 bg-[#111827] border border-white/[0.08] rounded-lg text-xs text-[#F8FAFC]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1D293B] hover:bg-[#334155] text-[#F8FAFC] text-xs font-medium rounded-lg cursor-pointer">
                      <Upload className="w-3.5 h-3.5 text-[#8B5CF6]" />
                      <span>Attach Condition Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                    {conditionPhotoInput && (
                      <span className="text-xs text-[#22C55E] font-medium">
                        Photo attached
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handlePickupConfirm(booking)}
                    className="w-full py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    Confirm Pickup & Hold Deposit
                  </button>
                </div>
              )}

              {/* Step 2: Confirm Return / Complete Rental */}
              {(booking.status === 'picked_up' ||
                (perspective === 'lender' &&
                  booking.status === 'returned')) && (
                <div className="p-4 bg-[#161E2E] border border-white/[0.08] rounded-xl space-y-3">
                  <h4 className="text-xs font-semibold text-[#F8FAFC]">
                    {perspective === 'borrower'
                      ? 'Log Item Return & Condition'
                      : 'Inspect Return & Release Refundable Deposit'}
                  </h4>
                  <input
                    type="text"
                    value={conditionNoteInput}
                    onChange={(e) => setConditionNoteInput(e.target.value)}
                    placeholder="Return condition note (e.g., Returned clean with all cables)"
                    className="w-full px-3 py-1.5 bg-[#111827] border border-white/[0.08] rounded-lg text-xs text-[#F8FAFC]"
                  />
                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1D293B] hover:bg-[#334155] text-[#F8FAFC] text-xs font-medium rounded-lg cursor-pointer">
                      <Upload className="w-3.5 h-3.5 text-[#8B5CF6]" />
                      <span>Attach Return Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      void handleReturnConfirm(
                        booking,
                        perspective === 'lender' ? 'completed' : 'returned'
                      )
                    }
                    className="w-full py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    {perspective === 'lender'
                      ? 'Confirm Safe Return & Refund Deposit'
                      : 'Mark Item Returned'}
                  </button>
                </div>
              )}

              {/* Step 3: Verified Review Form */}
              {perspective === 'borrower' &&
                (booking.status === 'returned' ||
                  booking.status === 'completed') &&
                !alreadyReviewed && (
                  <div className="p-4 bg-[#161E2E] border border-white/[0.08] rounded-xl space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#F8FAFC]">
                      <Star className="w-3.5 h-3.5 text-[#F59E0B]" />
                      <span>Leave a Verified Rental Review</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-[#94A3B8]">Rating:</label>
                      <select
                        value={reviewRating}
                        onChange={(e) =>
                          setReviewRating(Number(e.target.value))
                        }
                        className="px-2.5 py-1 bg-[#111827] border border-white/[0.08] rounded text-xs text-[#F8FAFC]"
                      >
                        <option value={5}>5 ★ — Excellent</option>
                        <option value={4}>4 ★ — Good</option>
                        <option value={3}>3 ★ — Satisfactory</option>
                        <option value={2}>2 ★ — Subpar</option>
                        <option value={1}>1 ★ — Poor</option>
                      </select>
                    </div>
                    <textarea
                      rows={2}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Share your honest experience with the item condition and handover..."
                      className="w-full px-3 py-1.5 bg-[#111827] border border-white/[0.08] rounded-lg text-xs text-[#F8FAFC]"
                    />
                    <button
                      type="button"
                      onClick={() => void handleReviewSubmit(booking)}
                      className="px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold rounded-lg cursor-pointer"
                    >
                      Publish Verified Review
                    </button>
                  </div>
                )}

              {/* Dispute / Complaint Box */}
              {booking.status !== 'completed' &&
                booking.status !== 'rejected' &&
                booking.status !== 'cancelled' &&
                booking.status !== 'disputed' && (
                  <div className="p-3.5 bg-[#161E2E] border border-white/[0.08] rounded-xl space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#F8FAFC]">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B]" />
                      <span>Report Handover Issue or Dispute</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={disputeReasonInput}
                        onChange={(e) => setDisputeReasonInput(e.target.value)}
                        placeholder="Describe missing accessory, delay, or damage..."
                        className="flex-1 px-3 py-1.5 bg-[#111827] border border-white/[0.08] rounded-lg text-xs text-[#F8FAFC]"
                      />
                      <button
                        type="button"
                        onClick={() => void handleRaiseDispute(booking)}
                        className="px-3 py-1.5 bg-[#EF4444] hover:bg-[#DC2626] text-white text-xs font-semibold rounded-lg shrink-0 cursor-pointer"
                      >
                        Freeze & Report
                      </button>
                    </div>
                  </div>
                )}
            </div>

            {/* Right 6 cols: Private Booking Message Thread */}
            <div className="lg:col-span-6 flex flex-col justify-between bg-[#161E2E] border border-white/[0.08] rounded-xl p-4 min-h-[260px]">
              <div>
                <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-white/[0.08]">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#F8FAFC]">
                    <MessageSquare className="w-3.5 h-3.5 text-[#8B5CF6]" />
                    <span>Private Handover Coordination Chat</span>
                  </div>
                  <span className="text-[11px] text-[#94A3B8]">
                    Visible only to Borrower & Owner
                  </span>
                </div>

                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                  {messages.length === 0 ? (
                    <p className="text-xs text-[#94A3B8] py-6 text-center">
                      No messages yet. Coordinate pickup time and landmark
                      details here.
                    </p>
                  ) : (
                    messages.map((msg) => {
                      const isMine = msg.senderId === userProfile.uid;
                      return (
                        <div
                          key={msg.id}
                          className={`p-2.5 rounded-lg text-xs ${
                            isMine
                              ? 'bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 text-[#F8FAFC] ml-6'
                              : 'bg-[#111827] border border-white/[0.08] text-[#F8FAFC] mr-6'
                          }`}
                        >
                          <div className="flex justify-between text-[10px] text-[#94A3B8] mb-0.5">
                            <span className="font-semibold text-[#06B6D4]">
                              {msg.senderName}
                            </span>
                            <span className="font-mono-tabular">
                              {new Date(msg.createdAtISO).toLocaleTimeString(
                                'en-IN',
                                {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                }
                              )}
                            </span>
                          </div>
                          <p>{msg.text}</p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-white/[0.08] flex gap-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Write a message to coordinate pickup..."
                  className="flex-1 px-3 py-2 bg-[#111827] border border-white/[0.08] rounded-lg text-xs text-[#F8FAFC] focus:outline-none focus:border-[#8B5CF6]"
                />
                <button
                  type="button"
                  onClick={() => void handleSendBookingMessage(booking)}
                  className="inline-flex items-center gap-1 px-3.5 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-transparent min-h-screen py-8 lg:py-10 text-[#F8FAFC]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 space-y-6">
        {/* Top SaaS Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#94A3B8] mb-1">
              <span>BorrowBox Workspace</span>
              <span>/</span>
              <span className="text-[#8B5CF6] font-semibold">
                Operations & Analytics Console
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#F8FAFC] tracking-tight">
              Borrower & Lender Dashboard
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
            {shouldShowAdminPanelOption(verifiedAdminRecord) &&
              verifiedAdminRecord && (
                <button
                  type="button"
                  onClick={() => onNavigate({ page: 'admin' })}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#8B5CF6]/15 hover:bg-[#8B5CF6]/25 text-[#F8FAFC] border border-[#8B5CF6]/40 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#8B5CF6]" />
                  <span>
                    Admin Panel (
                    {ROLE_DEFINITIONS[verifiedAdminRecord.role]?.label ||
                      'Admin'}
                    )
                  </span>
                </button>
              )}
            <button
              type="button"
              onClick={() => onNavigate({ page: 'profile' })}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#161E2E] hover:bg-[#1D293B] text-[#F8FAFC] border border-white/[0.08] text-xs font-semibold rounded-xl cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-[#06B6D4]" />
              <span>{userProfile.name}</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate({ page: 'list-item' })}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold rounded-xl transition-all bb-glow-button cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ List New Item</span>
            </button>
          </div>
        </div>

        {/* Animated Top Statistics Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-[#161E2E] border border-white/[0.08] space-y-1.5">
            <div className="flex items-center justify-between text-xs text-[#94A3B8]">
              <span>My Rental Bookings</span>
              <Calendar className="w-4 h-4 text-[#8B5CF6]" />
            </div>
            <p className="text-2xl font-bold text-[#F8FAFC]">
              <AnimatedCounter
                target={myBorrowerBookings.length + myLenderBookings.length}
              />
            </p>
            <p className="text-[11px] text-[#94A3B8]">
              {myBorrowerBookings.length} outgoing · {myLenderBookings.length}{' '}
              incoming
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#161E2E] border border-white/[0.08] space-y-1.5">
            <div className="flex items-center justify-between text-xs text-[#94A3B8]">
              <span>My Published Listings</span>
              <Package className="w-4 h-4 text-[#06B6D4]" />
            </div>
            <p className="text-2xl font-bold text-[#F8FAFC]">
              <AnimatedCounter target={myListings.length} />
            </p>
            <p className="text-[11px] text-[#06B6D4] font-mono-tabular">
              Est. {formatINR(dashboardStats.potentialMonthlyLenderIncomeINR)}
              /mo capacity
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#161E2E] border border-white/[0.08] space-y-1.5">
            <div className="flex items-center justify-between text-xs text-[#94A3B8]">
              <span>Session Rental Volume</span>
              <IndianRupee className="w-4 h-4 text-[#22C55E]" />
            </div>
            <p className="text-2xl font-bold text-[#F8FAFC]">
              <AnimatedCounter
                target={dashboardStats.totalBookingVolumeINR}
                isCurrency
              />
            </p>
            <p className="text-[11px] text-[#94A3B8]">
              Net rental value across bookings
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#161E2E] border border-white/[0.08] space-y-1.5">
            <div className="flex items-center justify-between text-xs text-[#94A3B8]">
              <span>Deposits Tracked</span>
              <ShieldCheck className="w-4 h-4 text-[#8B5CF6]" />
            </div>
            <p className="text-2xl font-bold text-[#06B6D4]">
              <AnimatedCounter
                target={dashboardStats.totalDepositsProtectedINR}
                isCurrency
              />
            </p>
            <p className="text-[11px] text-[#94A3B8]">
              Protected by QR handover codes
            </p>
          </div>
        </div>

        {/* Main SaaS Workspace: Left Dark Sidebar + Right Content Canvas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Sidebar Navigation */}
          <aside className="lg:col-span-3 bg-[#111827] border border-white/[0.08] rounded-xl p-3 space-y-1.5">
            <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
              Workspace Views
            </p>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'borrower'}
              onClick={() => setActiveTab('borrower')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'borrower'
                  ? 'bg-[#8B5CF6] text-white'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#161E2E]'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Borrower View</span>
              </span>
              <span className="font-mono-tabular">
                ({myBorrowerBookings.length})
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'lender'}
              onClick={() => setActiveTab('lender')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'lender'
                  ? 'bg-[#8B5CF6] text-white'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#161E2E]'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <Package className="w-4 h-4" />
                <span>Lender View</span>
              </span>
              <span className="font-mono-tabular">
                ({myLenderBookings.length} · {myListings.length})
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'overview'}
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-[#8B5CF6] text-white'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#161E2E]'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                <span>Analytics & Activity</span>
              </span>
              <span className="font-mono-tabular text-[11px]">₹</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'trust'}
              onClick={() => {
                setActiveTab('trust');
                onMarkNotificationsRead();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'trust'
                  ? 'bg-[#8B5CF6] text-white'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#161E2E]'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <Bell className="w-4 h-4" />
                <span>Notifications & ID</span>
              </span>
              <span className="font-mono-tabular">
                ({notifications.filter((n) => !n.read).length})
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'billing'}
              onClick={() => setActiveTab('billing')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'billing'
                  ? 'bg-[#8B5CF6] text-white'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#161E2E]'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>Billing & Invoices</span>
              </span>
              <span className="font-mono-tabular">
                ({myBorrowerBookings.length + myLenderBookings.length})
              </span>
            </button>
          </aside>

          {/* Right Main Content Viewport */}
          <div className="lg:col-span-9 space-y-6">
            {actionFeedback && (
              <div
                role="status"
                className={`p-4 rounded-xl border text-xs font-medium ${
                  actionFeedback.type === 'success'
                    ? 'bg-[#22C55E]/15 border-[#22C55E]/30 text-[#22C55E]'
                    : 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]'
                }`}
              >
                {actionFeedback.text}
              </div>
            )}

            {/* TAB: ANALYTICS & ACTIVITY OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="p-6 rounded-xl bg-[#161E2E] border border-white/[0.08] space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-[#F8FAFC]">
                        Category Supply & Daily Rate Analytics (₹)
                      </h2>
                      <p className="text-xs text-[#94A3B8]">
                        Live distribution of active marketplace items and
                        average daily rental rates.
                      </p>
                    </div>
                    <Activity className="w-4 h-4 text-[#06B6D4]" />
                  </div>

                  <div className="space-y-3">
                    {dashboardStats.categoryBreakdown.map((row) => {
                      const widthPct = Math.min(
                        100,
                        Math.max(12, Math.round((row.avgDailyINR / 2500) * 100))
                      );
                      return (
                        <div key={row.category} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-[#F8FAFC]">
                              {row.category}{' '}
                              <span className="text-[#94A3B8]">
                                ({row.count} items)
                              </span>
                            </span>
                            <span className="font-mono-tabular text-[#06B6D4]">
                              Avg {formatINR(row.avgDailyINR)}/day
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-[#111827] overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${widthPct}%` }}
                              transition={{ duration: 0.45 }}
                              className="h-full rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4]"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Recent Transactions / Bookings Table */}
                <div className="p-6 rounded-xl bg-[#161E2E] border border-white/[0.08] space-y-4">
                  <h2 className="text-base font-semibold text-[#F8FAFC]">
                    Recent Rental Transactions & Booking Ledger
                  </h2>
                  {bookings.length === 0 ? (
                    <p className="text-xs text-[#94A3B8] py-4">
                      No booking transactions recorded yet in this session.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-white/[0.08] text-[#94A3B8]">
                            <th className="pb-2.5 font-medium">Booking ID</th>
                            <th className="pb-2.5 font-medium">Item</th>
                            <th className="pb-2.5 font-medium">Dates</th>
                            <th className="pb-2.5 font-medium">Status</th>
                            <th className="pb-2.5 font-medium text-right">
                              Net Rental (₹)
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.06]">
                          {bookings.map((b) => (
                            <tr key={b.id} className="hover:bg-white/[0.02]">
                              <td className="py-2.5 font-mono-tabular text-[#8B5CF6]">
                                #{b.id}
                              </td>
                              <td className="py-2.5 text-[#F8FAFC] font-medium">
                                {b.listingTitle}
                              </td>
                              <td className="py-2.5 font-mono-tabular text-[#94A3B8]">
                                {b.startDate} → {b.endDate}
                              </td>
                              <td className="py-2.5 uppercase font-semibold text-[#22C55E]">
                                {b.status}
                              </td>
                              <td className="py-2.5 font-mono-tabular font-bold text-[#F8FAFC] text-right">
                                {formatINR(b.netRentalCostINR)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 1: BORROWER DASHBOARD */}
            {activeTab === 'borrower' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-[#F8FAFC]">
                    My Outgoing Rental Bookings ({myBorrowerBookings.length})
                  </h2>
                  <button
                    type="button"
                    onClick={() => onNavigate({ page: 'browse' })}
                    className="text-xs font-semibold text-[#8B5CF6] hover:text-[#A78BFA] cursor-pointer"
                  >
                    Browse More Gear →
                  </button>
                </div>

                {myBorrowerBookings.length === 0 ? (
                  <div className="p-12 border border-white/[0.08] rounded-xl bg-[#161E2E] text-center space-y-3">
                    <Calendar className="w-6 h-6 text-[#8B5CF6] mx-auto" />
                    <h3 className="text-base font-semibold text-[#F8FAFC]">
                      No rental reservations yet
                    </h3>
                    <p className="text-xs text-[#94A3B8] max-w-md mx-auto">
                      When you request to borrow an item, your reservation
                      status, deposit tracker, QR handover code, and owner chat
                      will appear here.
                    </p>
                    <button
                      type="button"
                      onClick={() => onNavigate({ page: 'browse' })}
                      className="px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold rounded-lg cursor-pointer"
                    >
                      Explore Rentals
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myBorrowerBookings.map((b) =>
                      renderBookingCard(b, 'borrower')
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: LENDER DASHBOARD */}
            {activeTab === 'lender' && (
              <div className="space-y-10">
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-[#F8FAFC]">
                    Incoming Booking Requests ({myLenderBookings.length})
                  </h2>
                  {myLenderBookings.length === 0 ? (
                    <div className="p-8 border border-white/[0.08] rounded-xl bg-[#161E2E] text-center space-y-2">
                      <p className="text-sm font-medium text-[#F8FAFC]">
                        No incoming booking requests yet
                      </p>
                      <p className="text-xs text-[#94A3B8]">
                        Requests from borrowers for your published listings will
                        appear here for approval.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {myLenderBookings.map((b) =>
                        renderBookingCard(b, 'lender')
                      )}
                    </div>
                  )}
                </div>

                {/* Owner's Listings Management */}
                <div className="space-y-4 pt-6 border-t border-white/[0.08]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-[#F8FAFC]">
                        My Published Listings ({myListings.length})
                      </h2>
                      <p className="text-xs text-[#94A3B8]">
                        Edit pricing, update availability windows, or archive
                        items when unavailable.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate({ page: 'list-item' })}
                      className="px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold rounded-lg cursor-pointer"
                    >
                      + List New Item
                    </button>
                  </div>

                  {myListings.length === 0 ? (
                    <div className="p-10 border border-white/[0.08] rounded-xl bg-[#161E2E] text-center space-y-3">
                      <Package className="w-6 h-6 text-[#06B6D4] mx-auto" />
                      <h3 className="text-base font-semibold text-[#F8FAFC]">
                        You haven’t published any community listings yet
                      </h3>
                      <p className="text-xs text-[#94A3B8] max-w-md mx-auto">
                        Publish your unused camera, console, drill, or musical
                        instrument to earn rental income in ₹.
                      </p>
                      <button
                        type="button"
                        onClick={() => onNavigate({ page: 'list-item' })}
                        className="px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold rounded-lg cursor-pointer"
                      >
                        Create Your First Listing
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {myListings.map((item) => (
                        <div
                          key={item.id}
                          className="p-5 border border-white/[0.08] rounded-xl bg-[#161E2E] flex flex-col justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                              <span className="font-semibold text-[#8B5CF6]">
                                {item.category}
                              </span>
                              <span className="font-mono-tabular">
                                Status:{' '}
                                <strong className="text-[#22C55E]">
                                  {item.status || 'active'}
                                </strong>
                              </span>
                            </div>
                            <h3 className="text-base font-semibold text-[#F8FAFC]">
                              {item.title}
                            </h3>
                            <p className="text-xs text-[#94A3B8] font-mono-tabular">
                              {formatINR(item.dailyPriceINR)}/day · Deposit:{' '}
                              {formatINR(item.refundableDepositINR)} ·{' '}
                              {item.availableFrom} to {item.availableTo}
                            </p>
                          </div>

                          <div className="pt-3 border-t border-white/[0.08] flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() => onEditListing(item)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1D293B] hover:bg-[#334155] text-[#F8FAFC] text-xs font-semibold rounded-lg cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              Edit Listing
                            </button>
                            <button
                              type="button"
                              onClick={() => void onToggleArchiveListing(item)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#111827] hover:bg-[#1D293B] text-[#94A3B8] border border-white/[0.08] text-xs font-semibold rounded-lg cursor-pointer"
                            >
                              <Archive className="w-3.5 h-3.5" />
                              {item.status === 'archived'
                                ? 'Restore to Active'
                                : 'Archive Listing'}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onNavigate({ page: 'details', itemId: item.id })
                              }
                              className="ml-auto text-xs font-semibold text-[#8B5CF6] hover:text-[#A78BFA] cursor-pointer"
                            >
                              View →
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: NOTIFICATIONS & PRIVACY-PRESERVING IDENTITY WORKFLOW */}
            {activeTab === 'trust' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#8B5CF6]" />
                    <h2 className="text-lg font-semibold text-[#F8FAFC]">
                      Booking & Handover Notifications
                    </h2>
                  </div>

                  {notifications.length === 0 ? (
                    <div className="p-8 border border-white/[0.08] rounded-xl bg-[#161E2E] text-xs text-[#94A3B8] text-center">
                      No new booking notifications in this session.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          className="p-4 border border-white/[0.08] rounded-xl bg-[#161E2E] space-y-1"
                        >
                          <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                            <span className="font-semibold text-[#F8FAFC]">
                              {n.title}
                            </span>
                            <span className="font-mono-tabular">
                              {new Date(n.timestampISO).toLocaleTimeString(
                                'en-IN',
                                {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                }
                              )}
                            </span>
                          </div>
                          <p className="text-xs text-[#94A3B8]">{n.body}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Privacy-Preserving Verification Workflow */}
                <div className="lg:col-span-5 p-6 border border-white/[0.08] rounded-xl bg-[#161E2E] space-y-4">
                  <div className="flex items-center gap-2 text-[#06B6D4] text-xs font-semibold">
                    <ShieldCheck className="w-4 h-4 text-[#8B5CF6]" />
                    <span>Privacy-First Handover Verification</span>
                  </div>
                  <h3 className="text-base font-semibold text-[#F8FAFC]">
                    In-Person ID Check Preference
                  </h3>
                  <p className="text-xs text-[#94A3B8] leading-relaxed">
                    To protect your privacy, BorrowBox never exposes sensitive
                    government identity documents or raw ID numbers on public
                    profiles. Borrowers and owners verify original photo ID in
                    person using the booking QR code at pickup.
                  </p>

                  <div className="space-y-2">
                    <label
                      htmlFor="id-type-select"
                      className="block text-xs font-semibold text-[#F8FAFC]"
                    >
                      Preferred Photo ID Presented at Handover
                    </label>
                    <select
                      id="id-type-select"
                      value={preferredIdType}
                      onChange={(e) => {
                        setPreferredIdType(e.target.value);
                        setIdPreferenceSaved(false);
                      }}
                      className="w-full px-3 py-2 bg-[#111827] border border-white/[0.08] rounded-lg text-xs text-[#F8FAFC]"
                    >
                      <option value="Aadhaar Card (Last 4 digits verified in person)">
                        Aadhaar Card (In-person visual check)
                      </option>
                      <option value="Indian Driving Licence (In-person check)">
                        Indian Driving Licence (In-person visual check)
                      </option>
                      <option value="Indian Passport (In-person check)">
                        Indian Passport (In-person visual check)
                      </option>
                      <option value="Voter ID / EPIC Card (In-person check)">
                        Voter ID Card (In-person visual check)
                      </option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIdPreferenceSaved(true)}
                    className="w-full py-2.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    Save Private Handover Preference
                  </button>

                  {idPreferenceSaved && (
                    <p className="text-xs text-[#22C55E] font-medium">
                      Saved privately: {preferredIdType}. Never displayed
                      publicly.
                    </p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'billing' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
                  <div>
                    <h2 className="text-lg font-bold text-[#F8FAFC]">
                      Billing & Invoices
                    </h2>
                    <p className="text-xs text-[#94A3B8]">
                      Complete payment records, escrow holds, and printable tax receipts for all your rentals.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-lg bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-xs font-semibold text-[#C4B5FD]">
                      {myBorrowerBookings.length + myLenderBookings.length} Total Transactions
                    </span>
                  </div>
                </div>

                {myBorrowerBookings.length + myLenderBookings.length === 0 ? (
                  <div className="p-12 text-center rounded-xl bg-[#161E2E] border border-white/[0.08] space-y-3">
                    <FileText className="w-10 h-10 text-[#64748B] mx-auto" />
                    <h3 className="text-sm font-semibold text-[#F8FAFC]">
                      No Billing History Yet
                    </h3>
                    <p className="text-xs text-[#94A3B8] max-w-sm mx-auto">
                      When you rent gear or accept a rental request from another member, all itemised tax invoices and receipts will appear here.
                    </p>
                    <button
                      type="button"
                      onClick={() => onNavigate({ page: 'browse' })}
                      className="px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold rounded-lg cursor-pointer"
                    >
                      Explore Rentals
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[...myBorrowerBookings, ...myLenderBookings]
                      .sort(
                        (a, b) =>
                          new Date(b.createdAtISO).getTime() -
                          new Date(a.createdAtISO).getTime()
                      )
                      .map((b) => (
                        <div
                          key={b.id}
                          className="p-4 rounded-xl bg-[#161E2E] border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-mono font-bold text-[#F8FAFC]">
                                {b.id}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 capitalize">
                                {b.status}
                              </span>
                              <span className="text-[#94A3B8]">
                                {new Date(b.createdAtISO).toLocaleDateString('en-IN')}
                              </span>
                            </div>
                            <h4 className="text-sm font-semibold text-[#F8FAFC]">
                              {b.listingTitle}
                            </h4>
                            <p className="text-xs text-[#94A3B8]">
                              {b.borrowerId === userProfile.uid ? 'Rented by you' : `Rented to ${b.borrowerName}`} • {b.days} days ({b.startDate} to {b.endDate})
                            </p>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-sm font-bold text-[#8B5CF6] font-mono">
                                {formatINR(b.totalUpfrontINR)}
                              </p>
                              <p className="text-[11px] text-[#94A3B8]">
                                Incl. {formatINR(b.refundableDepositINR)} deposit
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedInvoiceBooking(b);
                                setIsInvoiceModalOpen(true);
                              }}
                              className="px-3.5 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-xs font-semibold text-[#F8FAFC] flex items-center gap-1.5 cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>View / Print Invoice</span>
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invoice Modal */}
      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        booking={selectedInvoiceBooking}
      />
    </div>
  );
};
