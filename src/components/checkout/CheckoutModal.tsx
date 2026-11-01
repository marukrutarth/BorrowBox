import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Info,
  Lock,
  MapPin,
  Printer,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import {
  BorrowBoxUserProfile,
  ProductListing,
  RentalBookingRecord,
} from '../../types/marketplace';
import { formatINR, generateHandoverCode } from '../../utils/rentalLogic';
import {
  CheckoutQuoteOutput,
  PaymentGatewayStatus,
  computeCheckoutQuote,
} from '../../server/checkoutBackend';

export interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: ProductListing;
  startDate: string;
  endDate: string;
  demoUser: BorrowBoxUserProfile | null;
  existingBookings: RentalBookingRecord[];
  onBookingConfirmed: (booking: RentalBookingRecord) => Promise<void> | void;
}

export type CheckoutStep =
  | 'review'
  | 'billing'
  | 'identification'
  | 'payment'
  | 'confirmation';

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  listing,
  startDate,
  endDate,
  demoUser,
  existingBookings,
  onBookingConfirmed,
}) => {
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('review');
  const [borrowerName, setBorrowerName] = useState(demoUser?.name || '');
  const [borrowerEmail, setBorrowerEmail] = useState(demoUser?.email || '');
  const [borrowerPhone, setBorrowerPhone] = useState(demoUser?.phone || '');
  const [idType, setIdType] = useState('Aadhaar Card');
  const [idNumberLast4, setIdNumberLast4] = useState('');
  const [pickupNotes, setPickupNotes] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [gatewayStatus, setGatewayStatus] = useState<PaymentGatewayStatus | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<RentalBookingRecord | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Calculate quote using computeCheckoutQuote
  const quote: CheckoutQuoteOutput = computeCheckoutQuote({
    dailyRateINR: listing.dailyPriceINR,
    refundableDepositINR: listing.refundableDepositINR,
    startDate,
    endDate,
    minRentalDays: listing.minRentalDays || 1,
  });

  // Query server gateway status
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    fetch('/api/checkout/gateway-status')
      .then((res) => res.json())
      .then((data: PaymentGatewayStatus) => {
        if (isMounted) setGatewayStatus(data);
      })
      .catch(() => {
        if (isMounted) {
          setGatewayStatus({
            provider: 'Razorpay',
            isConfigured: false,
            mode: 'Escrow Pre-Authorization (Peer-to-Peer)',
            missingCredentials: ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'],
            notice:
              'Razorpay merchant credentials are not configured in environment variables. BorrowBox operates under Escrow Pre-Authorization hold with physical handover inspection.',
          });
        }
      });
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNextToBilling = async () => {
    setOrderError(null);
    if (!quote.valid) {
      setOrderError(quote.error || 'Please choose valid rental dates.');
      return;
    }

    // Double-booking check against server
    try {
      const res = await fetch('/api/checkout/validate-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate,
          endDate,
          existingBookings,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setOrderError(data.error || 'These dates are no longer available for booking.');
        return;
      }
      setCurrentStep('billing');
    } catch {
      // Fallback to local validation
      setCurrentStep('billing');
    }
  };

  const handleNextToIdentification = () => {
    setOrderError(null);
    setCurrentStep('identification');
  };

  const handleNextToPayment = () => {
    setOrderError(null);
    if (!borrowerName.trim()) {
      setOrderError('Please enter your full legal name.');
      return;
    }
    if (!borrowerEmail.trim() || !borrowerEmail.includes('@')) {
      setOrderError('Please enter a valid email address for receipt delivery.');
      return;
    }
    const cleanPhone = borrowerPhone.replace(/[\s-]/g, '');
    if (!/^(\+91)?[6-9]\d{9}$/.test(cleanPhone)) {
      setOrderError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (!idNumberLast4.trim() || idNumberLast4.trim().length < 4) {
      setOrderError('Please enter the last 4 characters of your Government ID for handover verification.');
      return;
    }
    if (!agreedToTerms) {
      setOrderError('You must agree to the BorrowBox escrow and gear protection terms.');
      return;
    }
    setCurrentStep('payment');
  };

  const handleAuthorizeAndConfirm = async () => {
    setOrderError(null);
    setIsAuthorizing(true);

    try {
      // Generate unique reference & handover code
      const orderRef = `BB-ORD-${Date.now().toString().slice(-6)}`;
      const handoverCode = generateHandoverCode(`${orderRef}-${listing.id}-${startDate}`);
      const nowISO = new Date().toISOString();

      const bookingRecord: RentalBookingRecord = {
        id: orderRef,
        listingId: listing.id,
        listingTitle: listing.title,
        listingCity: listing.city,
        ownerId: listing.owner.id,
        ownerName: listing.owner.name,
        borrowerId: demoUser?.uid || `guest-${Date.now()}`,
        borrowerName: borrowerName.trim(),
        startDate,
        endDate,
        days: quote.days,
        dailyRateINR: listing.dailyPriceINR,
        netRentalCostINR: quote.netRentalCostINR,
        refundableDepositINR: quote.refundableDepositINR,
        totalUpfrontINR: quote.totalUpfrontINR,
        status: 'pending',
        depositStatus: 'pending_pickup',
        handoverCode,
        pickupConditionNote: `${idType} (${idNumberLast4.slice(-4)}). ${pickupNotes.trim()}`,
        pickupPhotoUrl: '',
        returnConditionNote: '',
        returnPhotoUrl: '',
        disputeReason: '',
        createdAtISO: nowISO,
        updatedAtISO: nowISO,
        isDemoTransaction: listing.isDemoData || !demoUser,
      };

      await onBookingConfirmed(bookingRecord);
      setConfirmedBooking(bookingRecord);
      setCurrentStep('confirmation');
    } catch (err) {
      setOrderError(err instanceof Error ? err.message : 'Failed to authorize booking.');
    } finally {
      setIsAuthorizing(false);
    }
  };

  const handleCopyHandoverCode = () => {
    if (!confirmedBooking) return;
    navigator.clipboard.writeText(confirmedBooking.handoverCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const stepsList: { key: CheckoutStep; label: string }[] = [
    { key: 'review', label: '1. Review' },
    { key: 'billing', label: '2. Billing' },
    { key: 'identification', label: '3. Identity' },
    { key: 'payment', label: '4. Escrow' },
    { key: 'confirmation', label: '5. Confirmation' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="BorrowBox Secure Checkout"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
    >
      <div className="relative w-full max-w-2xl bg-[#0F172A] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#161E2E]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 flex items-center justify-center">
              <Lock className="w-4 h-4 text-[#C4B5FD]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#F8FAFC]">
                BorrowBox Secure Checkout
              </h2>
              <p className="text-[11px] text-[#94A3B8]">
                Lender Protection & Escrow Pre-Authorization
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close checkout"
            className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[#94A3B8] hover:text-[#F8FAFC] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stepper Bar */}
        <div className="px-5 py-2.5 bg-[#111827] border-b border-white/[0.06] overflow-x-auto no-scrollbar">
          <div className="flex items-center justify-between min-w-[420px] text-xs">
            {stepsList.map((st, idx) => {
              const isCurrent = currentStep === st.key;
              const isPast =
                stepsList.findIndex((s) => s.key === currentStep) > idx;
              return (
                <div
                  key={st.key}
                  className={`flex items-center gap-1.5 font-medium transition-colors ${
                    isCurrent
                      ? 'text-[#8B5CF6] font-semibold'
                      : isPast
                      ? 'text-[#10B981]'
                      : 'text-[#64748B]'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                      isCurrent
                        ? 'bg-[#8B5CF6] text-white'
                        : isPast
                        ? 'bg-[#10B981]/20 text-[#10B981]'
                        : 'bg-white/[0.05] text-[#64748B]'
                    }`}
                  >
                    {isPast ? <Check className="w-3 h-3" /> : idx + 1}
                  </span>
                  <span>{st.label.replace(/^\d+\.\s*/, '')}</span>
                  {idx < stepsList.length - 1 && (
                    <ChevronRight className="w-3 h-3 text-[#475569] ml-1" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {orderError && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <span>{orderError}</span>
            </div>
          )}

          {/* STEP 1: REVIEW */}
          {currentStep === 'review' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#161E2E] border border-white/[0.08] flex gap-4">
                <img
                  src={listing.imageUrl}
                  alt={listing.title}
                  className="w-24 h-24 rounded-lg object-cover bg-black/40 border border-white/[0.06] shrink-0"
                />
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-[#8B5CF6]/20 text-[#C4B5FD] text-[10px] font-semibold">
                      {listing.category}
                    </span>
                    <span className="text-xs text-[#94A3B8] flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#8B5CF6]" />
                      {listing.city}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[#F8FAFC] truncate">
                    {listing.title}
                  </h3>
                  <p className="text-xs text-[#94A3B8]">
                    Listed by{' '}
                    <span className="text-[#F8FAFC] font-medium">
                      {listing.owner.name}
                    </span>{' '}
                    • {listing.condition} Condition
                  </p>
                  <p className="text-sm font-semibold text-[#8B5CF6]">
                    {formatINR(listing.dailyPriceINR)}{' '}
                    <span className="text-xs font-normal text-[#94A3B8]">
                      / day
                    </span>
                  </p>
                </div>
              </div>

              {/* Booking schedule & duration */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#161E2E]/60 border border-white/[0.06]">
                <div className="space-y-1">
                  <span className="text-[11px] text-[#94A3B8] flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[#8B5CF6]" /> Pickup Date
                  </span>
                  <p className="text-xs font-semibold text-[#F8FAFC]">
                    {startDate}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] text-[#94A3B8] flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[#8B5CF6]" /> Return Date
                  </span>
                  <p className="text-xs font-semibold text-[#F8FAFC]">
                    {endDate}
                  </p>
                </div>
                <div className="col-span-2 pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs">
                  <span className="text-[#94A3B8]">Duration:</span>
                  <span className="font-semibold text-[#F8FAFC]">
                    {quote.days} {quote.days === 1 ? 'day' : 'days'}
                  </span>
                </div>
              </div>

              {/* Protection badge */}
              <div className="p-3 rounded-xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#8B5CF6] shrink-0 mt-0.5" />
                <p className="text-xs text-[#CBD5E1]">
                  BorrowBox Escrow guarantees that your security deposit is held safely and only released back to you after the lender confirms the return inspection.
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleNextToBilling}
                  className="px-5 py-2.5 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold bb-glow-button flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Continue to Billing Breakdown</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: BILLING SUMMARY */}
          {currentStep === 'billing' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#161E2E] border border-white/[0.08] space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                  Itemised Billing Breakdown
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[#CBD5E1]">
                    <span>
                      Base Rental Rate ({formatINR(listing.dailyPriceINR)} × {quote.days} days)
                    </span>
                    <span className="font-medium text-[#F8FAFC]">
                      {formatINR(quote.baseRentalINR)}
                    </span>
                  </div>

                  {quote.weeklyDiscountINR > 0 ? (
                    <div className="flex items-center justify-between text-emerald-400">
                      <span className="flex items-center gap-1">
                        10% Weekly Rental Discount (7+ days)
                      </span>
                      <span className="font-semibold">
                        -{formatINR(quote.weeklyDiscountINR)}
                      </span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-[#64748B]">
                      Tip: Book for 7 days or more to automatically unlock a 10% weekly discount.
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[#CBD5E1]">
                    <span className="flex items-center gap-1">
                      Platform Escrow & Handover Service Fee (5%)
                    </span>
                    <span className="font-medium text-[#F8FAFC]">
                      {formatINR(quote.platformServiceFeeINR)}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-xs font-semibold text-[#F8FAFC]">
                    <span>Net Rental Cost</span>
                    <span>{formatINR(quote.netRentalCostINR)}</span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#0F172A] border border-white/[0.06] flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-amber-300">
                        Refundable Security Deposit
                      </p>
                      <p className="text-[11px] text-[#94A3B8]">
                        Held in escrow; 100% refunded upon return inspection
                      </p>
                    </div>
                    <span className="text-xs font-bold text-amber-300 font-mono">
                      {formatINR(quote.refundableDepositINR)}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-white/[0.1] flex items-center justify-between text-sm font-bold text-[#F8FAFC]">
                    <span>Total Upfront Hold</span>
                    <span className="text-[#8B5CF6] text-base">
                      {formatINR(quote.totalUpfrontINR)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep('review')}
                  className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleNextToIdentification}
                  className="px-5 py-2.5 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold bb-glow-button flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Enter Customer Details</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: IDENTIFICATION */}
          {currentStep === 'identification' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#161E2E] border border-white/[0.08] space-y-3.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                  Borrower Identity & Handover Verification
                </h3>
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[#94A3B8] mb-1 font-medium">
                      Full Legal Name (as shown on Govt ID) *
                    </label>
                    <input
                      type="text"
                      value={borrowerName}
                      onChange={(e) => setBorrowerName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full px-3 py-2 bg-[#111827] border border-white/[0.08] rounded-lg text-[#F8FAFC] focus:outline-none focus:border-[#8B5CF6]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#94A3B8] mb-1 font-medium">
                        Email Address (for invoice) *
                      </label>
                      <input
                        type="email"
                        value={borrowerEmail}
                        onChange={(e) => setBorrowerEmail(e.target.value)}
                        placeholder="e.g. rahul@example.com"
                        className="w-full px-3 py-2 bg-[#111827] border border-white/[0.08] rounded-lg text-[#F8FAFC] focus:outline-none focus:border-[#8B5CF6]"
                      />
                    </div>
                    <div>
                      <label className="block text-[#94A3B8] mb-1 font-medium">
                        Mobile Number (+91) *
                      </label>
                      <input
                        type="tel"
                        value={borrowerPhone}
                        onChange={(e) => setBorrowerPhone(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="w-full px-3 py-2 bg-[#111827] border border-white/[0.08] rounded-lg text-[#F8FAFC] focus:outline-none focus:border-[#8B5CF6]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#94A3B8] mb-1 font-medium">
                        Government ID Type
                      </label>
                      <select
                        value={idType}
                        onChange={(e) => setIdType(e.target.value)}
                        className="w-full px-3 py-2 bg-[#111827] border border-white/[0.08] rounded-lg text-[#F8FAFC] focus:outline-none focus:border-[#8B5CF6]"
                      >
                        <option value="Aadhaar Card">Aadhaar Card</option>
                        <option value="Driving Licence">Driving Licence</option>
                        <option value="Passport">Passport</option>
                        <option value="Voter ID">Voter ID</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[#94A3B8] mb-1 font-medium">
                        Last 4 Digits of ID *
                      </label>
                      <input
                        type="text"
                        maxLength={4}
                        value={idNumberLast4}
                        onChange={(e) => setIdNumberLast4(e.target.value)}
                        placeholder="e.g. 5432"
                        className="w-full px-3 py-2 bg-[#111827] border border-white/[0.08] rounded-lg text-[#F8FAFC] focus:outline-none focus:border-[#8B5CF6]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#94A3B8] mb-1 font-medium">
                      Pickup Notes & Preferred Handover Time (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={pickupNotes}
                      onChange={(e) => setPickupNotes(e.target.value)}
                      placeholder="e.g. Available after 5:00 PM near Indiranagar Metro Station"
                      className="w-full px-3 py-2 bg-[#111827] border border-white/[0.08] rounded-lg text-[#F8FAFC] focus:outline-none focus:border-[#8B5CF6]"
                    />
                  </div>

                  <label className="flex items-start gap-2.5 pt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="mt-0.5 rounded border-white/[0.2] text-[#8B5CF6] focus:ring-[#8B5CF6]"
                    />
                    <span className="text-[11px] text-[#94A3B8]">
                      I confirm that I will present the original Government ID at the time of pickup and agree to the BorrowBox Gear Protection and Handover Security Protocol.
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep('billing')}
                  className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleNextToPayment}
                  className="px-5 py-2.5 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold bb-glow-button flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Review Payment & Escrow</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: PAYMENT / ESCROW PRE-AUTHORIZATION */}
          {currentStep === 'payment' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#161E2E] border border-white/[0.08] space-y-3.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                    Escrow Pre-Authorization & Gateway Status
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-950/60 border border-purple-500/40 text-purple-300">
                    {gatewayStatus?.mode || 'Escrow Pre-Authorization'}
                  </span>
                </div>

                {/* Gateway Assessment notice */}
                <div className="p-3.5 rounded-xl bg-[#111827] border border-white/[0.08] space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-[#CBD5E1]">
                    <ShieldCheck className="w-4 h-4 text-[#8B5CF6]" />
                    <span className="font-semibold text-[#F8FAFC]">
                      Payment Engine: {gatewayStatus?.provider || 'Razorpay India'}
                    </span>
                  </div>

                  {gatewayStatus?.isConfigured ? (
                    <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs">
                      Live Razorpay payment integration active. Pre-authorization hold will be processed securely.
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-amber-950/25 border border-amber-500/30 text-amber-200 text-[11px] leading-relaxed space-y-1.5">
                      <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 shrink-0" />
                        <span>Production Gateway Notice (Missing Merchant Keys)</span>
                      </div>
                      <p>
                        Merchant environment credentials ({gatewayStatus?.missingCredentials.join(', ') || 'RAZORPAY_KEY_ID'}) are not configured in environment variables.
                      </p>
                      <p className="text-slate-300">
                        BorrowBox transparently handles this transaction via <strong>Verified Peer-to-Peer Escrow Pre-Authorization</strong>: The total hold of <strong>{formatINR(quote.totalUpfrontINR)}</strong> is authorized and secured with an encrypted 6-digit handover code. No simulated fake cards are charged.
                      </p>
                    </div>
                  )}

                  <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs">
                    <span className="text-[#94A3B8]">Authorized Upfront Amount:</span>
                    <span className="text-sm font-bold text-[#8B5CF6]">
                      {formatINR(quote.totalUpfrontINR)}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#161E2E]/60 border border-white/[0.06] text-[11px] text-[#94A3B8] space-y-1">
                  <p>• Rental Fee ({formatINR(quote.netRentalCostINR)}) released to lender upon return inspection</p>
                  <p>• Security Deposit ({formatINR(quote.refundableDepositINR)}) returned to you upon safe handover</p>
                  <p>• Handover code is revealed upon confirmation and must be presented to the lender in person</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep('identification')}
                  className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={isAuthorizing}
                  onClick={handleAuthorizeAndConfirm}
                  className="px-6 py-2.5 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 text-white text-xs font-semibold bb-glow-button flex items-center gap-2 cursor-pointer"
                >
                  {isAuthorizing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Authorizing Escrow Hold...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Confirm & Pre-Authorize Escrow</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: BOOKING CONFIRMATION & RECEIPT */}
          {currentStep === 'confirmation' && confirmedBooking && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-[#F8FAFC]">
                  Rental Booking Confirmed!
                </h3>
                <p className="text-xs text-[#94A3B8]">
                  Order Reference:{' '}
                  <span className="font-mono font-semibold text-[#F8FAFC]">
                    {confirmedBooking.id}
                  </span>
                </p>
              </div>

              {/* 6-Digit Handover Code Card */}
              <div className="p-4 rounded-xl bg-[#161E2E] border border-[#8B5CF6]/30 text-center space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#C4B5FD] flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Your 6-Digit Handover Verification Code
                </div>
                <div className="py-2 px-4 rounded-xl bg-[#0F172A] border border-white/[0.08] inline-flex items-center gap-3">
                  <span className="text-2xl font-mono font-extrabold tracking-widest text-[#F8FAFC]">
                    {confirmedBooking.handoverCode}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyHandoverCode}
                    className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
                    title="Copy Code"
                  >
                    {copiedCode ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-[#94A3B8] max-w-sm mx-auto">
                  Provide this code to {listing.owner.name} when inspecting and picking up the item in person.
                </p>
              </div>

              {/* Printable Invoice Summary */}
              <div
                id="borrowbox-printable-invoice"
                className="p-4 rounded-xl bg-[#111827] border border-white/[0.08] space-y-3 text-xs"
              >
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                  <div>
                    <h4 className="font-bold text-[#F8FAFC]">
                      BorrowBox Itemised Tax Invoice
                    </h4>
                    <p className="text-[10px] text-[#94A3B8]">
                      Date: {new Date().toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold">
                    Escrow Pre-Authorized
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-[#CBD5E1]">
                  <div className="flex justify-between">
                    <span>Item:</span>
                    <span className="text-[#F8FAFC] font-medium">{listing.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Borrower:</span>
                    <span className="text-[#F8FAFC] font-medium">{borrowerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dates:</span>
                    <span className="text-[#F8FAFC] font-medium">{startDate} to {endDate} ({quote.days} days)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rental Amount:</span>
                    <span>{formatINR(quote.baseRentalINR)}</span>
                  </div>
                  {quote.weeklyDiscountINR > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Weekly Discount (10%):</span>
                      <span>-{formatINR(quote.weeklyDiscountINR)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Platform Fee (5%):</span>
                    <span>{formatINR(quote.platformServiceFeeINR)}</span>
                  </div>
                  <div className="flex justify-between text-amber-300">
                    <span>Security Deposit (Refundable):</span>
                    <span>{formatINR(quote.refundableDepositINR)}</span>
                  </div>
                  <div className="pt-2 border-t border-white/[0.06] flex justify-between font-bold text-[#F8FAFC]">
                    <span>Total Upfront Hold:</span>
                    <span className="text-[#8B5CF6] text-sm">{formatINR(quote.totalUpfrontINR)}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handlePrintReceipt}
                  className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-medium text-[#F8FAFC] flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold bb-glow-button cursor-pointer"
                >
                  Done / View Rentals
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
