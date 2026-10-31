import React, { useState } from 'react';
import {
  AlertTriangle,
  Archive,
  Bell,
  Calendar,
  CheckCircle2,
  Edit3,
  MessageSquare,
  Package,
  QrCode,
  Send,
  ShieldCheck,
  Star,
  Upload,
  XCircle,
} from 'lucide-react';
import {
  AppNotificationItem,
  BookingMessageRecord,
  BookingStatus,
  BorrowBoxUserProfile,
  DepositStatus,
  ProductListing,
  RentalBookingRecord,
  RentalReviewRecord,
} from '../types/marketplace';
import { formatINR, isListingAvailableForDates } from '../utils/rentalLogic';
import { PageRoute } from '../components/Navbar';

interface DashboardPageProps {
  userProfile: BorrowBoxUserProfile;
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
      className="w-20 h-20 border border-slate-200 rounded bg-white p-1.5 shrink-0"
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
            fill="#0f172a"
          />
        );
      })}
    </svg>
  );
};

export const DashboardPage: React.FC<DashboardPageProps> = ({
  userProfile,
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
    'borrower' | 'lender' | 'trust'
  >(userProfile.activeMode === 'owner' ? 'lender' : 'borrower');

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
        className="border border-slate-200 rounded-xl bg-white p-5 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-mono-tabular font-medium text-slate-700">
                #{booking.id}
              </span>
              <span aria-hidden="true">·</span>
              <span>{booking.listingCity}</span>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-indigo-600 uppercase">
                Status: {booking.status.replace('_', ' ')}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Deposit: {booking.depositStatus.replace(/_/g, ' ')}
              </span>
            </div>
            <h3 className="text-base font-semibold text-slate-900 mt-1">
              {booking.listingTitle}
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              {perspective === 'borrower'
                ? `Owner: ${booking.ownerName}`
                : `Borrower: ${booking.borrowerName}`}{' '}
              · Dates:{' '}
              <span className="font-mono-tabular font-medium">
                {booking.startDate} to {booking.endDate} ({booking.days}d)
              </span>
            </p>
          </div>

          <div className="text-left sm:text-right shrink-0">
            <p className="text-base font-bold text-slate-900 font-mono-tabular">
              {formatINR(booking.netRentalCostINR)}{' '}
              <span className="text-xs font-normal text-slate-500">rental</span>
            </p>
            <p className="text-xs text-slate-500 font-mono-tabular">
              + {formatINR(booking.refundableDepositINR)} deposit
            </p>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Lender Accept / Reject on pending */}
            {perspective === 'lender' && booking.status === 'pending' && (
              <>
                <button
                  type="button"
                  onClick={() => void handleOwnerAccept(booking)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
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
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Reject
                </button>
              </>
            )}

            {/* Borrower Cancel on pending */}
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
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Cancel Request
              </button>
            )}

            {/* Open Handover / Messaging / Dispute Drawer */}
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
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5 text-indigo-600" />
              {isExpanded
                ? 'Hide Handover, Messages & Audit Log'
                : 'Manage Handover, QR, Messages & Dispute'}
            </button>
          </div>

          <button
            type="button"
            onClick={() =>
              onNavigate({ page: 'details', itemId: booking.listingId })
            }
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
          >
            View Item Page →
          </button>
        </div>

        {/* Expanded Handover, QR Verification, Condition Photos, Messaging & Review Panel */}
        {isExpanded && (
          <div className="pt-4 border-t border-slate-200 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50/60 p-4 rounded-xl">
            {/* Left 6 cols: QR Code + Pickup/Return Condition Confirmation + Review/Dispute */}
            <div className="lg:col-span-6 space-y-4">
              {/* QR Code & Handover Code */}
              <div className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-center gap-4">
                <HandoverQrMatrix code={booking.handoverCode} />
                <div className="space-y-1 text-xs">
                  <p className="font-semibold text-slate-900">
                    Handover QR & Verification Code
                  </p>
                  <p className="font-mono-tabular text-sm font-bold text-indigo-600">
                    {booking.handoverCode}
                  </p>
                  <p className="text-slate-500 leading-relaxed">
                    Match this code during in-person pickup and return alongside
                    timestamped condition notes.
                  </p>
                </div>
              </div>

              {/* Condition Log History */}
              {(booking.pickupConditionNote || booking.returnConditionNote || booking.disputeReason) && (
                <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2 text-xs">
                  <p className="font-semibold text-slate-900">
                    Auditable Handover & Condition Log
                  </p>
                  {booking.pickupConditionNote && (
                    <div className="text-slate-600">
                      <strong className="text-slate-800">Pickup Log:</strong>{' '}
                      {booking.pickupConditionNote}
                      {booking.pickupPhotoUrl && (
                        <img
                          src={booking.pickupPhotoUrl}
                          alt="Pickup condition"
                          className="mt-1.5 w-24 h-16 object-cover rounded border border-slate-200"
                        />
                      )}
                    </div>
                  )}
                  {booking.returnConditionNote && (
                    <div className="text-slate-600">
                      <strong className="text-slate-800">Return Log:</strong>{' '}
                      {booking.returnConditionNote}
                      {booking.returnPhotoUrl && (
                        <img
                          src={booking.returnPhotoUrl}
                          alt="Return condition"
                          className="mt-1.5 w-24 h-16 object-cover rounded border border-slate-200"
                        />
                      )}
                    </div>
                  )}
                  {booking.disputeReason && (
                    <div className="p-2 rounded bg-red-50 border border-red-200 text-red-800">
                      <strong>Dispute Reason:</strong> {booking.disputeReason}
                    </div>
                  )}
                </div>
              )}

              {/* Step 1: Confirm Pickup (when status === 'accepted') */}
              {booking.status === 'accepted' && (
                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                  <h4 className="text-xs font-semibold text-slate-900">
                    Confirm Item Pickup & Condition
                  </h4>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">
                      Enter Verification Code ({booking.handoverCode})
                    </label>
                    <input
                      type="text"
                      value={qrCodeVerifyInput}
                      onChange={(e) => setQrCodeVerifyInput(e.target.value)}
                      placeholder={booking.handoverCode}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono-tabular"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">
                      Pickup Condition Note
                    </label>
                    <input
                      type="text"
                      value={conditionNoteInput}
                      onChange={(e) => setConditionNoteInput(e.target.value)}
                      placeholder="e.g., Sensor clean, 2 batteries included, working properly"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Attach Condition Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                    {conditionPhotoInput && (
                      <span className="text-xs text-emerald-700 font-medium">
                        Photo attached
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handlePickupConfirm(booking)}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    Confirm Pickup & Hold Deposit
                  </button>
                </div>
              )}

              {/* Step 2: Confirm Return / Complete Rental (when status === 'picked_up' or 'returned') */}
              {(booking.status === 'picked_up' ||
                (perspective === 'lender' &&
                  booking.status === 'returned')) && (
                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                  <h4 className="text-xs font-semibold text-slate-900">
                    {perspective === 'borrower'
                      ? 'Log Item Return & Condition'
                      : 'Inspect Return & Release Refundable Deposit'}
                  </h4>
                  <input
                    type="text"
                    value={conditionNoteInput}
                    onChange={(e) => setConditionNoteInput(e.target.value)}
                    placeholder="Return condition note (e.g., Returned clean with all cables)"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
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
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    {perspective === 'lender'
                      ? 'Confirm Safe Return & Refund Deposit'
                      : 'Mark Item Returned'}
                  </button>
                </div>
              )}

              {/* Step 3: Verified Review Form (ONLY on returned or completed bookings for borrower) */}
              {perspective === 'borrower' &&
                (booking.status === 'returned' ||
                  booking.status === 'completed') &&
                !alreadyReviewed && (
                  <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                      <Star className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Leave a Verified Rental Review</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-slate-600">Rating:</label>
                      <select
                        value={reviewRating}
                        onChange={(e) =>
                          setReviewRating(Number(e.target.value))
                        }
                        className="px-2.5 py-1 border border-slate-200 rounded text-xs"
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
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => void handleReviewSubmit(booking)}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
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
                  <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Report Handover Issue or Dispute</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={disputeReasonInput}
                        onChange={(e) => setDisputeReasonInput(e.target.value)}
                        placeholder="Describe missing accessory, delay, or damage..."
                        className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => void handleRaiseDispute(booking)}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shrink-0 cursor-pointer"
                      >
                        Freeze & Report
                      </button>
                    </div>
                  </div>
                )}
            </div>

            {/* Right 6 cols: Private Booking Message Thread */}
            <div className="lg:col-span-6 flex flex-col justify-between bg-white border border-slate-200 rounded-xl p-4 min-h-[260px]">
              <div>
                <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Private Handover Coordination Chat</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Visible only to Borrower & Owner
                  </span>
                </div>

                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                  {messages.length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center">
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
                              ? 'bg-indigo-50 text-slate-900 ml-6'
                              : 'bg-slate-100 text-slate-800 mr-6'
                          }`}
                        >
                          <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                            <span className="font-semibold text-slate-700">
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

              <div className="pt-3 mt-3 border-t border-slate-100 flex gap-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Write a message to coordinate pickup..."
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-600"
                />
                <button
                  type="button"
                  onClick={() => void handleSendBookingMessage(booking)}
                  className="inline-flex items-center gap-1 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
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
    <div className="bg-white min-h-screen py-10 lg:py-12">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <p className="text-xs font-semibold text-indigo-600 mb-1">
              Marketplace Operations & Trust Hub
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Borrower & Lender Dashboard
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Manage booking requests, QR handover confirmations, condition
              photos, private messages, and listings.
            </p>
          </div>

          {/* Dashboard Tabs */}
          <div
            role="tablist"
            aria-label="Dashboard perspective"
            className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg self-start"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'borrower'}
              onClick={() => setActiveTab('borrower')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                activeTab === 'borrower'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Borrower View ({myBorrowerBookings.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'lender'}
              onClick={() => setActiveTab('lender')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                activeTab === 'lender'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Lender View ({myLenderBookings.length} requests ·{' '}
              {myListings.length} items)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'trust'}
              onClick={() => {
                setActiveTab('trust');
                onMarkNotificationsRead();
              }}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                activeTab === 'trust'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Notifications & ID Workflow (
              {notifications.filter((n) => !n.read).length})
            </button>
          </div>
        </div>

        {actionFeedback && (
          <div
            role="status"
            className={`p-4 rounded-xl border text-xs font-medium ${
              actionFeedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {actionFeedback.text}
          </div>
        )}

        {/* TAB 1: BORROWER DASHBOARD */}
        {activeTab === 'borrower' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                My Outgoing Rental Bookings ({myBorrowerBookings.length})
              </h2>
              <button
                type="button"
                onClick={() => onNavigate({ page: 'browse' })}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
              >
                Browse More Gear →
              </button>
            </div>

            {myBorrowerBookings.length === 0 ? (
              <div className="p-12 border border-slate-200 rounded-xl bg-slate-50/50 text-center space-y-3">
                <Calendar className="w-6 h-6 text-slate-400 mx-auto" />
                <h3 className="text-base font-semibold text-slate-900">
                  No rental reservations yet
                </h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  When you request to borrow an item, your reservation status,
                  deposit tracker, QR handover code, and owner chat will appear
                  here.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate({ page: 'browse' })}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
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
            {/* Incoming Requests for Owner */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Incoming Booking Requests ({myLenderBookings.length})
              </h2>
              {myLenderBookings.length === 0 ? (
                <div className="p-8 border border-slate-200 rounded-xl bg-slate-50/50 text-center space-y-2">
                  <p className="text-sm font-medium text-slate-800">
                    No incoming booking requests yet
                  </p>
                  <p className="text-xs text-slate-500">
                    Requests from borrowers for your published listings will
                    appear here for approval.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myLenderBookings.map((b) => renderBookingCard(b, 'lender'))}
                </div>
              )}
            </div>

            {/* Owner's Listings Management (Create, Edit, Archive) */}
            <div className="space-y-4 pt-6 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    My Published Listings ({myListings.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Edit pricing, update availability windows, or archive items
                    when unavailable.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate({ page: 'list-item' })}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  + List New Item
                </button>
              </div>

              {myListings.length === 0 ? (
                <div className="p-10 border border-slate-200 rounded-xl bg-slate-50/50 text-center space-y-3">
                  <Package className="w-6 h-6 text-slate-400 mx-auto" />
                  <h3 className="text-base font-semibold text-slate-900">
                    You haven’t published any community listings yet
                  </h3>
                  <p className="text-xs text-slate-600 max-w-md mx-auto">
                    Publish your unused camera, console, drill, or musical
                    instrument to earn rental income in ₹.
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigate({ page: 'list-item' })}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    Create Your First Listing
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myListings.map((item) => (
                    <div
                      key={item.id}
                      className="p-5 border border-slate-200 rounded-xl bg-white flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span className="font-semibold text-indigo-600">
                            {item.category}
                          </span>
                          <span className="font-mono-tabular">
                            Status:{' '}
                            <strong className="text-slate-900">
                              {item.status || 'active'}
                            </strong>
                          </span>
                        </div>
                        <h3 className="text-base font-semibold text-slate-900">
                          {item.title}
                        </h3>
                        <p className="text-xs text-slate-600 font-mono-tabular">
                          {formatINR(item.dailyPriceINR)}/day · Deposit:{' '}
                          {formatINR(item.refundableDepositINR)} ·{' '}
                          {item.availableFrom} to {item.availableTo}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => onEditListing(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Edit Listing
                        </button>
                        <button
                          type="button"
                          onClick={() => void onToggleArchiveListing(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg cursor-pointer"
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
                          className="ml-auto text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Notifications Feed */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-600" />
                <h2 className="text-lg font-semibold text-slate-900">
                  Booking & Handover Notifications
                </h2>
              </div>

              {notifications.length === 0 ? (
                <div className="p-8 border border-slate-200 rounded-xl bg-slate-50/50 text-xs text-slate-500 text-center">
                  No new booking notifications in this session.
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className="p-4 border border-slate-200 rounded-xl bg-white space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="font-semibold text-slate-900">
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
                      <p className="text-xs text-slate-600">{n.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Privacy-Preserving Verification Workflow */}
            <div className="lg:col-span-5 p-6 border border-slate-200 rounded-xl bg-slate-50/60 space-y-4">
              <div className="flex items-center gap-2 text-indigo-600 text-xs font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>Privacy-First Handover Verification</span>
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                In-Person ID Check Preference
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                To protect your privacy, BorrowBox never exposes sensitive
                government identity documents or raw ID numbers on public
                profiles. Third-party automated KYC is not yet integrated;
                instead, borrowers and owners verify original photo ID in person
                using the booking QR code at pickup.
              </p>

              <div className="space-y-2">
                <label
                  htmlFor="id-type-select"
                  className="block text-xs font-semibold text-slate-800"
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
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
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
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Save Private Handover Preference
              </button>

              {idPreferenceSaved && (
                <p className="text-xs text-emerald-700 font-medium">
                  Saved privately: {preferredIdType}. Never displayed publicly.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
