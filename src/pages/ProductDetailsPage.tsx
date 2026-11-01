import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Calculator,
  Calendar,
  CheckCircle2,
  MapPin,
  QrCode,
  ShieldCheck,
  Star,
  UserCheck,
} from 'lucide-react';
import {
  BorrowBoxUserProfile,
  ProductListing,
  RentalBookingRecord,
  RentalReviewRecord,
} from '../types/marketplace';
import {
  calculateRentalQuote,
  calculateRentVsBuy,
  computePersonalizedRecommendations,
  formatINR,
  generateHandoverCode,
  isListingAvailableForDates,
} from '../utils/rentalLogic';
import { ProductImage } from '../components/ProductImage';
import { ProductCard } from '../components/products/ProductCard';
import { PageRoute } from '../components/Navbar';
import { CheckoutModal } from '../components/checkout/CheckoutModal';

interface ProductDetailsPageProps {
  listing: ProductListing | undefined;
  allListings: ProductListing[];
  demoUser: BorrowBoxUserProfile | null;
  onNavigate: (route: PageRoute) => void;
  onSubmitBooking: (booking: RentalBookingRecord) => Promise<void> | void;
  existingBookingsForListing: RentalBookingRecord[];
  reviewsForListing: RentalReviewRecord[];
}

export const ProductDetailsPage: React.FC<ProductDetailsPageProps> = ({
  listing,
  allListings,
  demoUser,
  onNavigate,
  onSubmitBooking,
  existingBookingsForListing,
  reviewsForListing,
}) => {
  const [selectedGalleryIndex, setSelectedGalleryIndex] = useState(0);
  const [startDate, setStartDate] = useState('2026-11-05');
  const [endDate, setEndDate] = useState('2026-11-08');
  const [borrowerName, setBorrowerName] = useState(demoUser?.name || '');
  const [borrowerPhone, setBorrowerPhone] = useState(demoUser?.phone || '');
  const [pickupNote, setPickupNote] = useState('');
  const [agreedToRules, setAgreedToRules] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedBooking, setSubmittedBooking] =
    useState<RentalBookingRecord | null>(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

  // Phase 4 Rent-vs-Buy Calculator state
  const [plannedDaysPerYear, setPlannedDaysPerYear] = useState(6);

  const quote = useMemo(() => {
    if (!listing) {
      return null;
    }
    return calculateRentalQuote(
      listing.dailyPriceINR,
      listing.refundableDepositINR,
      startDate,
      endDate,
      listing.minRentalDays
    );
  }, [listing, startDate, endDate]);

  const dateAvailability = useMemo(() => {
    if (!listing) {
      return { available: false, reason: 'Listing not found.' };
    }
    return isListingAvailableForDates(
      listing,
      startDate,
      endDate,
      existingBookingsForListing
    );
  }, [listing, startDate, endDate, existingBookingsForListing]);

  const rentVsBuy = useMemo(() => {
    if (!listing) return null;
    const retail =
      listing.replacementValueINR || listing.dailyPriceINR * 35;
    return calculateRentVsBuy({
      retailPriceINR: retail,
      dailyRentalINR: listing.dailyPriceINR,
      plannedDaysPerYear,
    });
  }, [listing, plannedDaysPerYear]);

  const recommendations = useMemo(() => {
    if (!listing) return [];
    return computePersonalizedRecommendations(allListings, {
      userCity: demoUser?.city || listing.city,
      preferredCategory: listing.category,
      excludeListingId: listing.id,
      limit: 3,
    });
  }, [allListings, demoUser?.city, listing]);

  if (!listing) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-16 text-center text-[#F8FAFC]">
        <h1 className="text-2xl font-bold text-[#F8FAFC] mb-2">
          Listing Not Found
        </h1>
        <p className="text-sm text-[#94A3B8] mb-6">
          The product you are looking for may have been removed or is no longer
          available.
        </p>
        <button
          type="button"
          onClick={() => onNavigate({ page: 'browse' })}
          className="px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
        >
          Back to Browse Items
        </button>
      </div>
    );
  }

  const galleryItems =
    listing.gallery && listing.gallery.length > 0
      ? listing.gallery
      : [
          {
            id: 'default-1',
            label: 'Primary Studio View',
            caption: listing.title,
            imageUrl: listing.imageUrl,
            viewMode: 'full' as const,
          },
        ];

  const activeGalleryItem =
    galleryItems[selectedGalleryIndex] || galleryItems[0];

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!quote || !quote.valid) {
      setFormError(quote?.error || 'Please select valid rental dates.');
      return;
    }

    if (!dateAvailability.available) {
      setFormError(
        dateAvailability.reason ||
          'Selected dates conflict with an existing reservation.'
      );
      return;
    }

    if (demoUser && demoUser.uid === listing.owner.id) {
      setFormError('You cannot book your own listing.');
      return;
    }

    const effectiveName = (borrowerName || demoUser?.name || '').trim();
    if (effectiveName.length < 2) {
      setFormError('Enter your full name to request this rental.');
      return;
    }

    const cleanedPhone = (borrowerPhone || demoUser?.phone || '').replace(
      /[\s-]/g,
      ''
    );
    if (!/^(\+91)?[6-9]\d{9}$/.test(cleanedPhone)) {
      setFormError('Enter a valid 10-digit Indian mobile number.');
      return;
    }

    if (!agreedToRules) {
      setFormError(
        'Please confirm that you agree to the owner’s rental rules and ID verification at pickup.'
      );
      return;
    }

    const bookingId = `bk-${Date.now()}`;
    const handoverCode = generateHandoverCode(
      `${bookingId}-${listing.id}-${startDate}`
    );
    const nowISO = new Date().toISOString();

    const bookingRecord: RentalBookingRecord = {
      id: bookingId,
      listingId: listing.id,
      listingTitle: listing.title,
      listingCity: listing.city,
      ownerId: listing.owner.id,
      ownerName: listing.owner.name,
      borrowerId: demoUser?.uid || `guest-${Date.now()}`,
      borrowerName: effectiveName,
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
      pickupConditionNote: pickupNote.trim(),
      pickupPhotoUrl: '',
      returnConditionNote: '',
      returnPhotoUrl: '',
      disputeReason: '',
      createdAtISO: nowISO,
      updatedAtISO: nowISO,
      isDemoTransaction: listing.isDemoData || !demoUser,
    };

    setIsSubmitting(true);
    try {
      await onSubmitBooking(bookingRecord);
      setSubmittedBooking(bookingRecord);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to submit booking request.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeReservedDates = existingBookingsForListing.filter(
    (b) => b.status === 'accepted' || b.status === 'picked_up'
  );

  return (
    <div className="bg-transparent min-h-screen py-8 lg:py-12 text-[#F8FAFC]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
        {/* Top Breadcrumb Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-8 border-b border-white/[0.08] text-xs text-[#94A3B8]">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => onNavigate({ page: 'browse' })}
              className="inline-flex items-center gap-1.5 font-semibold text-[#F8FAFC] hover:text-[#8B5CF6] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Browse Items
            </button>
            <span aria-hidden="true">/</span>
            <button
              type="button"
              onClick={() =>
                onNavigate({ page: 'browse', category: listing.category })
              }
              className="hover:text-[#F8FAFC] transition-colors cursor-pointer"
            >
              {listing.category}
            </button>
            <span aria-hidden="true">/</span>
            <span className="text-[#F8FAFC] font-medium truncate max-w-[30ch]">
              {listing.title}
            </span>
          </div>

          <span className="text-[#06B6D4]">
            {listing.isDemoData
              ? 'Source: Sample Catalog Preview'
              : 'Source: Community Listing'}
          </span>
        </div>

        {listing.isDemoData && (
          <div className="mb-8 p-4 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-xs text-[#F8FAFC] leading-relaxed">
            <strong className="text-[#F59E0B]">Sample Catalog Preview:</strong>{' '}
            This product is a demonstration template for testing BorrowBox
            pricing and booking flows. It is not an active neighborhood listing
            from a verified community owner.
          </div>
        )}

        {/* Main 2-Column Product Details Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Column (7 cols) */}
          <div className="lg:col-span-7 space-y-8">
            {/* Title & Metadata Header */}
            <div>
              <div className="flex items-center gap-2 text-xs text-[#94A3B8] mb-2">
                <span className="font-semibold uppercase tracking-wider text-[#8B5CF6]">
                  {listing.category}
                </span>
                <span aria-hidden="true">·</span>
                <span>Condition: {listing.condition}</span>
                <span aria-hidden="true">·</span>
                <span className="text-[#06B6D4]">
                  Approx. {listing.neighborhood}, {listing.city}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#F8FAFC] tracking-tight leading-snug">
                {listing.title}
              </h1>
            </div>

            {/* 1. Product Image Gallery */}
            <div className="space-y-3">
              <div className="aspect-[4/3] w-full rounded-xl overflow-hidden border border-white/[0.08] bg-[#161E2E]">
                <ProductImage
                  srcKeyOrUrl={activeGalleryItem.imageUrl}
                  alt={`${listing.title} — ${activeGalleryItem.label}`}
                  viewMode={activeGalleryItem.viewMode}
                  className="w-full h-full"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-[#94A3B8] px-1">
                <span>{activeGalleryItem.caption}</span>
                <span className="tabular-nums">
                  View {selectedGalleryIndex + 1} of {galleryItems.length}
                </span>
              </div>

              {galleryItems.length > 1 && (
                <div className="grid grid-cols-3 gap-3 pt-1">
                  {galleryItems.map((item, idx) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedGalleryIndex(idx)}
                      className={`text-left p-2 rounded-xl border transition-colors cursor-pointer ${
                        selectedGalleryIndex === idx
                          ? 'border-[#8B5CF6] bg-[#8B5CF6]/15'
                          : 'border-white/[0.08] hover:border-white/[0.2] bg-[#161E2E]'
                      }`}
                    >
                      <div className="aspect-[4/3] rounded-lg overflow-hidden mb-1.5 bg-[#1D293B]">
                        <ProductImage
                          srcKeyOrUrl={item.imageUrl}
                          alt={item.label}
                          viewMode={item.viewMode}
                          className="w-full h-full"
                        />
                      </div>
                      <p className="text-xs font-medium text-[#F8FAFC] truncate">
                        {item.label}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Product Description & Condition */}
            <div className="space-y-6 pt-4 border-t border-white/[0.08]">
              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-[#F8FAFC]">
                  Product Description & Condition Notes
                </h2>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  {listing.description}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                <div className="p-4 rounded-xl bg-[#161E2E] border border-white/[0.08]">
                  <h3 className="text-xs font-semibold text-[#F8FAFC] mb-3">
                    Key Specifications
                  </h3>
                  <ul className="space-y-2 text-xs text-[#94A3B8]">
                    {listing.specifications.map((spec, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-[#8B5CF6] font-bold">·</span>
                        <span>{spec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-[#161E2E] border border-white/[0.08]">
                  <h3 className="text-xs font-semibold text-[#F8FAFC] mb-3">
                    Included in Rental Box
                  </h3>
                  <ul className="space-y-2 text-xs text-[#94A3B8]">
                    {listing.includedItems.map((inc, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E] shrink-0 mt-0.5" />
                        <span>{inc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* 3. Pickup Location, Availability Window, Cancellation Policy & Rental Rules */}
            <div className="space-y-6 pt-6 border-t border-white/[0.08]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#161E2E] border border-white/[0.08]">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#F8FAFC] mb-1">
                    <MapPin className="w-4 h-4 text-[#06B6D4]" />
                    <span>Pickup & Return Location</span>
                  </div>
                  <p className="text-sm text-[#F8FAFC] font-medium">
                    {listing.pickupLocation}
                  </p>
                  <p className="text-xs text-[#94A3B8] mt-1">
                    Exact building landmark shared via private booking chat once
                    owner approves dates.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#161E2E] border border-white/[0.08]">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#F8FAFC] mb-1">
                    <Calendar className="w-4 h-4 text-[#8B5CF6]" />
                    <span>Available Dates & Cancellation Policy</span>
                  </div>
                  <p className="text-sm text-[#F8FAFC] font-medium font-mono-tabular">
                    {listing.availableFrom} to {listing.availableTo}
                  </p>
                  <p className="text-xs text-[#94A3B8] mt-1">
                    Min {listing.minRentalDays}d · Policy:{' '}
                    {listing.cancellationPolicy ||
                      'Flexible (Full refund 24h prior)'}
                  </p>
                </div>
              </div>

              {activeReservedDates.length > 0 && (
                <div className="p-3.5 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-xs text-[#F8FAFC]">
                  <strong className="text-[#F59E0B]">
                    Reserved Date Windows (Unavailable):
                  </strong>{' '}
                  {activeReservedDates
                    .map((b) => `${b.startDate} to ${b.endDate}`)
                    .join(' · ')}
                </div>
              )}

              <div>
                <h2 className="text-sm font-semibold text-[#F8FAFC] mb-3">
                  Owner’s Rental Rules & Handover Policy
                </h2>
                <ul className="space-y-2 text-sm text-[#94A3B8] border border-white/[0.08] rounded-xl p-4 bg-[#161E2E]">
                  {listing.rentalRules.map((rule, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="font-mono-tabular text-xs font-semibold text-[#8B5CF6] mt-0.5">
                        0{idx + 1}.
                      </span>
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 4. Phase 4 Rent-vs-Buy Calculator */}
            {rentVsBuy && (
              <div className="pt-6 border-t border-white/[0.08]">
                <div className="p-5 rounded-xl border border-white/[0.08] bg-[#161E2E] space-y-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#06B6D4]">
                      <Calculator className="w-4 h-4 text-[#8B5CF6]" />
                      <span>Rent vs. Buy Calculator (₹)</span>
                    </div>
                    <span className="text-xs text-[#94A3B8] font-mono-tabular">
                      Est. Retail Price: {formatINR(rentVsBuy.retailPriceINR)} ·
                      Break-even: {rentVsBuy.breakEvenDays} days
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium text-[#94A3B8]">
                      <label htmlFor="detail-rent-vs-buy-slider">
                        How many days per year do you need this item?
                      </label>
                      <span className="font-mono-tabular font-bold text-[#F8FAFC]">
                        {plannedDaysPerYear} days / year
                      </span>
                    </div>
                    <input
                      id="detail-rent-vs-buy-slider"
                      type="range"
                      min={1}
                      max={45}
                      value={plannedDaysPerYear}
                      onChange={(e) =>
                        setPlannedDaysPerYear(Number(e.target.value))
                      }
                      className="w-full accent-[#8B5CF6] cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-[#111827] border border-white/[0.08]">
                      <p className="text-[#94A3B8]">BorrowBox Rental Cost</p>
                      <p className="text-base font-bold text-[#8B5CF6] font-mono-tabular mt-0.5">
                        {formatINR(rentVsBuy.estimatedRentalCostINR)}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-[#111827] border border-white/[0.08]">
                      <p className="text-[#94A3B8]">Buying New (Upfront)</p>
                      <p className="text-base font-bold text-[#F8FAFC] font-mono-tabular mt-0.5">
                        {formatINR(rentVsBuy.retailPriceINR)}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-[#111827] border border-white/[0.08]">
                      <p className="text-[#94A3B8]">Upfront Cash Saved</p>
                      <p className="text-base font-bold text-[#22C55E] font-mono-tabular mt-0.5">
                        {formatINR(
                          Math.max(
                            0,
                            rentVsBuy.retailPriceINR -
                              rentVsBuy.estimatedRentalCostINR
                          )
                        )}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-[#94A3B8] leading-relaxed">
                    {rentVsBuy.summary}
                  </p>
                </div>
              </div>
            )}

            {/* 5. Owner Information & Phase 3 Verified Reviews */}
            <div className="pt-6 border-t border-white/[0.08] space-y-6">
              <div>
                <h2 className="text-sm font-semibold text-[#F8FAFC] mb-3">
                  Listing Source & Verification Status
                </h2>
                <div className="p-5 rounded-xl border border-white/[0.08] bg-[#161E2E] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-[#8B5CF6]" />
                      <h3 className="text-base font-semibold text-[#F8FAFC]">
                        {listing.owner.name}
                      </h3>
                      <span className="text-xs text-[#94A3B8]">
                        ·{' '}
                        {listing.isDemoData
                          ? 'Sample Preview'
                          : listing.owner.kycVerified
                          ? 'Identity Verified'
                          : 'Account Email Registered'}
                      </span>
                    </div>
                    <p className="text-xs text-[#94A3B8]">
                      Approx. {listing.owner.neighborhood}, {listing.owner.city}{' '}
                      · {listing.owner.memberSince}
                    </p>
                    <p className="text-xs text-[#06B6D4]">
                      {listing.owner.responseTime}
                    </p>
                  </div>

                  <div className="text-left sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-white/[0.08]">
                    <p className="text-sm font-semibold text-[#F8FAFC]">
                      {listing.isDemoData
                        ? 'Demonstration Item'
                        : `${reviewsForListing.length} verified review(s)`}
                    </p>
                    <p className="text-xs text-[#94A3B8]">
                      {listing.isDemoData
                        ? 'No real reviews or transactions'
                        : 'Reviews are restricted to completed rentals'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Verified Reviews Linked to Completed Rentals */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#F8FAFC]">
                    Verified Completed-Rental Reviews ({reviewsForListing.length})
                  </h3>
                  <span className="text-xs text-[#94A3B8]">
                    Enforced by Firestore booking completion rules
                  </span>
                </div>

                {reviewsForListing.length === 0 ? (
                  <div className="p-5 rounded-xl border border-white/[0.08] bg-[#161E2E] text-xs text-[#94A3B8]">
                    No verified reviews yet for this listing. BorrowBox never
                    displays fabricated testimonials — reviews can only be
                    submitted by a borrower after a booking is marked Returned
                    or Completed.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reviewsForListing.map((rev) => (
                      <div
                        key={rev.id}
                        className="p-4 rounded-xl border border-white/[0.08] bg-[#161E2E] space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#F8FAFC]">
                            {rev.reviewerName}
                          </span>
                          <span className="inline-flex items-center gap-1 font-mono-tabular font-semibold text-[#F59E0B]">
                            <Star className="w-3.5 h-3.5 fill-[#F59E0B]" />
                            {rev.rating} / 5 · Booking #{rev.bookingId}
                          </span>
                        </div>
                        <p className="text-xs text-[#94A3B8] leading-relaxed">
                          {rev.comment}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column (5 cols): Contiguous Rental Booking Module */}
          <div className="lg:col-span-5 lg:sticky lg:top-24">
            <div className="border border-white/[0.08] rounded-2xl bg-[#161E2E] p-6 space-y-6 shadow-2xl">
              {/* Pricing Header */}
              <div className="pb-4 border-b border-white/[0.08] flex items-baseline justify-between gap-4">
                <div>
                  <p className="text-xs text-[#94A3B8] mb-0.5">
                    Daily Rental Rate
                  </p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-bold text-[#F8FAFC] font-mono-tabular">
                      {formatINR(listing.dailyPriceINR)}
                    </span>
                    <span className="text-sm text-[#94A3B8]">/ day</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#94A3B8] mb-0.5">
                    Refundable Deposit
                  </p>
                  <p className="text-lg font-semibold text-[#06B6D4] font-mono-tabular">
                    {formatINR(listing.refundableDepositINR)}
                  </p>
                </div>
              </div>

              {submittedBooking ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="p-5 rounded-xl bg-[#111827] border border-white/[0.08] space-y-4"
                >
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-[#22C55E] shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-base font-semibold text-[#F8FAFC]">
                        {submittedBooking.isDemoTransaction
                          ? 'Sample Booking Preview Logged'
                          : 'Booking Request Saved to Firestore'}
                      </h3>
                      <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed">
                        Booking ID{' '}
                        <span className="font-mono-tabular font-medium text-[#F8FAFC]">
                          {submittedBooking.id}
                        </span>{' '}
                        for <strong>{submittedBooking.days} days</strong> (
                        {submittedBooking.startDate} to{' '}
                        {submittedBooking.endDate}).
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg bg-[#161E2E] border border-white/[0.08] text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-[#94A3B8]">Handover QR Code:</span>
                      <span className="font-mono-tabular font-bold text-[#8B5CF6]">
                        {submittedBooking.handoverCode}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#94A3B8]">Booking Status:</span>
                      <span className="font-medium text-[#22C55E] uppercase">
                        {submittedBooking.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#94A3B8]">Deposit Status:</span>
                      <span className="font-medium text-[#F8FAFC]">
                        Pending Pickup Handover
                      </span>
                    </div>
                    <div className="flex justify-between pt-1.5 border-t border-white/[0.08] font-semibold text-[#F8FAFC]">
                      <span>Estimated Total at Pickup:</span>
                      <span className="font-mono-tabular">
                        {formatINR(submittedBooking.totalUpfrontINR)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    {demoUser && (
                      <button
                        type="button"
                        onClick={() => onNavigate({ page: 'dashboard' })}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#8B5CF6] rounded-lg hover:bg-[#7C3AED] cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        Open Borrower Dashboard
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSubmittedBooking(null)}
                      className="px-4 py-2 text-xs font-semibold text-[#F8FAFC] bg-[#1D293B] border border-white/[0.08] rounded-lg hover:bg-[#334155] cursor-pointer"
                    >
                      New Dates
                    </button>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={(e) => void handleRequestSubmit(e)}
                  className="space-y-4"
                >
                  {/* Date Range Selector */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="rental-start-date"
                        className="block text-xs font-medium text-[#94A3B8] mb-1"
                      >
                        Pickup Date
                      </label>
                      <input
                        id="rental-start-date"
                        type="date"
                        value={startDate}
                        min={listing.availableFrom}
                        max={listing.availableTo}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 bg-[#111827] border border-white/[0.08] rounded-lg text-xs font-mono-tabular text-[#F8FAFC] focus:outline-none focus:border-[#8B5CF6]"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="rental-end-date"
                        className="block text-xs font-medium text-[#94A3B8] mb-1"
                      >
                        Return Date
                      </label>
                      <input
                        id="rental-end-date"
                        type="date"
                        value={endDate}
                        min={startDate || listing.availableFrom}
                        max={listing.availableTo}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 bg-[#111827] border border-white/[0.08] rounded-lg text-xs font-mono-tabular text-[#F8FAFC] focus:outline-none focus:border-[#8B5CF6]"
                      />
                    </div>
                  </div>

                  {/* Date Availability Check Banner */}
                  {!dateAvailability.available && (
                    <div
                      role="alert"
                      className="p-3 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 text-xs text-[#EF4444] font-medium"
                    >
                      {dateAvailability.reason}
                    </div>
                  )}

                  {/* Live INR Quote Breakdown */}
                  {quote && quote.valid ? (
                    <div className="p-4 rounded-xl bg-[#111827] border border-white/[0.08] space-y-2 text-xs">
                      <div className="flex justify-between text-[#94A3B8]">
                        <span>
                          {formatINR(listing.dailyPriceINR)} × {quote.days}{' '}
                          {quote.days === 1 ? 'day' : 'days'}
                        </span>
                        <span className="font-mono-tabular font-medium text-[#F8FAFC]">
                          {formatINR(quote.baseRentalINR)}
                        </span>
                      </div>
                      {quote.weeklyDiscountINR > 0 && (
                        <div className="flex justify-between text-[#22C55E] font-medium">
                          <span>7+ Day Weekly Discount (10% off)</span>
                          <span className="font-mono-tabular">
                            -{formatINR(quote.weeklyDiscountINR)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-[#94A3B8]">
                        <span>Platform Handover & QR Verification Fee</span>
                        <span className="font-mono-tabular text-[#F8FAFC]">
                          {formatINR(quote.platformSupportFeeINR)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[#94A3B8] pt-2 border-t border-white/[0.08]">
                        <span>Net Rental Subtotal</span>
                        <span className="font-mono-tabular font-semibold text-[#F8FAFC]">
                          {formatINR(quote.netRentalCostINR)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[#94A3B8]">
                        <span>Refundable Security Deposit (Held at pickup)</span>
                        <span className="font-mono-tabular font-medium text-[#06B6D4]">
                          {formatINR(quote.refundableDepositINR)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-white/[0.08] text-sm font-bold text-[#F8FAFC]">
                        <span>Total Payable at Pickup</span>
                        <span className="font-mono-tabular">
                          {formatINR(quote.totalUpfrontINR)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-xs text-[#F59E0B]">
                      {quote?.error || 'Select valid pickup and return dates.'}
                    </div>
                  )}

                  {/* Borrower Contact Inputs */}
                  <div className="space-y-3 pt-1">
                    <div>
                      <label
                        htmlFor="borrower-name"
                        className="block text-xs font-medium text-[#94A3B8] mb-1"
                      >
                        Your Full Name
                      </label>
                      <input
                        id="borrower-name"
                        type="text"
                        value={borrowerName}
                        onChange={(e) => setBorrowerName(e.target.value)}
                        placeholder="e.g., Aarav Sharma"
                        className="w-full px-3 py-2 bg-[#111827] border border-white/[0.08] rounded-lg text-sm text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#8B5CF6]"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="borrower-phone"
                        className="block text-xs font-medium text-[#94A3B8] mb-1"
                      >
                        Indian Mobile Number (+91)
                      </label>
                      <input
                        id="borrower-phone"
                        type="tel"
                        value={borrowerPhone}
                        onChange={(e) => setBorrowerPhone(e.target.value)}
                        placeholder="e.g., 9876543210"
                        className="w-full px-3 py-2 bg-[#111827] border border-white/[0.08] rounded-lg text-sm font-mono-tabular text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#8B5CF6]"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="borrower-note"
                        className="block text-xs font-medium text-[#94A3B8] mb-1"
                      >
                        Purpose & Preferred Pickup Time (Optional)
                      </label>
                      <input
                        id="borrower-note"
                        type="text"
                        value={pickupNote}
                        onChange={(e) => setPickupNote(e.target.value)}
                        placeholder="e.g., Weekend portrait shoot, can pick up at 10 AM"
                        className="w-full px-3 py-2 bg-[#111827] border border-white/[0.08] rounded-lg text-sm text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#8B5CF6]"
                      />
                    </div>
                  </div>

                  {/* Rule Confirmation Checkbox */}
                  <label className="flex items-start gap-2.5 text-xs text-[#94A3B8] cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={agreedToRules}
                      onChange={(e) => setAgreedToRules(e.target.checked)}
                      className="mt-0.5 rounded border-white/[0.2] accent-[#8B5CF6]"
                    />
                    <span>
                      I agree to bring a valid Government ID at pickup in{' '}
                      <strong className="text-[#F8FAFC]">
                        {listing.neighborhood}
                      </strong>
                      , verify the QR handover code, and follow the owner’s
                      rental rules.
                    </span>
                  </label>

                  {formError && (
                    <div
                      role="alert"
                      className="p-3 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 text-xs text-[#EF4444] font-medium"
                    >
                      {formError}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsCheckoutModalOpen(true)}
                    disabled={!dateAvailability.available}
                    className="w-full py-3 px-4 bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6D28D9] disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all bb-glow-button cursor-pointer flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Proceed to 5-Step Secure Checkout</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting || !dateAvailability.available}
                    className="w-full py-2.5 px-4 bg-[#161E2E] hover:bg-[#1D293B] border border-white/[0.1] disabled:bg-[#1D293B] disabled:text-[#94A3B8] text-slate-300 hover:text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
                  >
                    {isSubmitting ? 'Submitting Request...' : 'Quick Book with Saved Details'}
                  </button>

                  <div className="flex items-center justify-center gap-1.5 text-xs text-[#94A3B8] pt-1">
                    <ShieldCheck className="w-4 h-4 text-[#06B6D4] shrink-0" />
                    <span>
                      Settle & verify with QR handover code at pickup
                    </span>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Phase 4 Personalized Recommendations Section */}
        {recommendations.length > 0 && (
          <div className="mt-16 pt-12 border-t border-white/[0.08]">
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#06B6D4] mb-1">
                Personalized For Your Location & Category
              </p>
              <h2 className="text-xl font-bold text-[#F8FAFC]">
                Similar Available Rentals
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {recommendations.map((rec) => (
                <ProductCard
                  key={rec.id}
                  listing={rec}
                  onSelect={(itemId) => {
                    setSelectedGalleryIndex(0);
                    setSubmittedBooking(null);
                    onNavigate({ page: 'details', itemId });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Checkout Modal */}
        <CheckoutModal
          isOpen={isCheckoutModalOpen}
          onClose={() => setIsCheckoutModalOpen(false)}
          listing={listing}
          startDate={startDate}
          endDate={endDate}
          demoUser={demoUser}
          existingBookings={existingBookingsForListing}
          onBookingConfirmed={(booking) => {
            onSubmitBooking(booking);
            setSubmittedBooking(booking);
          }}
        />
      </div>
    </div>
  );
};
