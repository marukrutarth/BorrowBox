import React, { useEffect, useState } from 'react';
import { Heart, MapPin, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { FooterInfoPageKey } from './layout/Footer';
import { ProductListing, RentalRequestRecord } from '../types/marketplace';
import { formatINR } from '../utils/rentalLogic';
import {
  WISHLIST_CHANGE_EVENT,
  loadWishlistIds,
  toggleWishlistId,
} from '../utils/wishlist';
import { ProductImage } from './ProductImage';

interface InfoModalProps {
  infoKey: FooterInfoPageKey | null;
  onClose: () => void;
}

const INFO_CONTENT: Record<
  FooterInfoPageKey,
  { title: string; subtitle: string; paragraphs: string[] }
> = {
  about: {
    title: 'About BorrowBox',
    subtitle: 'Access More. Own Less.',
    paragraphs: [
      'BorrowBox is a peer-to-peer neighborhood rental marketplace operating across all 28 states and 8 union territories throughout India.',
      'High-value items like full-frame cameras, PlayStation 5 consoles, power tools, projectors, and alpine trekking gear often sit unused for most of the year. BorrowBox connects local owners with nearby borrowers so people can rent what they need in Indian Rupees (₹) and turn what they own into extra earnings.',
      'Community listings published by verified owners are clearly distinguished from sample catalog items.',
    ],
  },
  'how-it-works': {
    title: 'How BorrowBox Works',
    subtitle: 'Step-by-Step Guide for Borrowers & Lenders',
    paragraphs: [
      '1. Discover Nearby Gear: Search by keyword, category, or city to find available equipment with transparent daily rates and refundable security deposits.',
      '2. Reserve Your Dates: Select your pickup and return dates on the item page. Rentals of 7+ consecutive days automatically receive a 10% weekly discount.',
      '3. Verified Handover: Meet at the agreed neighborhood location, verify government photo ID, inspect the item together, and confirm pickup using the unique handover code.',
      '4. Return & Deposit Refund: Return the item on time in the same condition to release your refundable security deposit immediately.',
    ],
  },
  help: {
    title: 'Help Centre & FAQs',
    subtitle: 'Answers to Common Rental & Listing Questions',
    paragraphs: [
      'How are multi-day rental prices calculated? Your total upfront cost includes the daily rate multiplied by rental days (minus 10% for 7+ days), a small platform support fee, and the refundable security deposit.',
      'How do I list an item? Click "List Your Item" in the header, provide your item title, category, daily price in ₹, refundable deposit, and city, then publish it directly to the marketplace.',
      'Where can I manage my bookings? Open your Rentals Dashboard from the profile menu to track active requests, handover codes, messages, and reviews.',
    ],
  },
  safety: {
    title: 'Safety Centre',
    subtitle: 'Trust, Verification & Handover Protection',
    paragraphs: [
      'Government ID Check: Both borrowers and owners verify a valid photo ID (Aadhaar, Passport, or Driving Licence) during physical handover.',
      'Condition Documentation: Every booking supports pickup and return condition notes and handover verification codes so both parties have a clear record.',
      'Privacy Protection: Exact residential addresses and private phone numbers are protected; public listings only display the neighborhood and city.',
    ],
  },
  contact: {
    title: 'Contact Support',
    subtitle: 'Community Operations & Support Desk',
    paragraphs: [
      'Support Email: support@borrowbox.in',
      'Operating Hours: Monday to Sunday, 8:00 AM – 10:00 PM IST',
      'Active Coverage: Recognized cities, towns, and local communities across all 28 states and 8 union territories throughout India.',
    ],
  },
  terms: {
    title: 'Terms & Rental Guidelines',
    subtitle: 'Fair-Use Policies for Borrowers and Owners',
    paragraphs: [
      '1. Accurate Listings: Owners must provide accurate condition descriptions, working accessories, and clear handover rules.',
      '2. Care & Timely Return: Borrowers are responsible for using rented equipment carefully and returning it by the agreed end date.',
      '3. Refundable Deposits: Security deposits are held against accidental damage or missing accessories and refunded upon verified return.',
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    subtitle: 'How BorrowBox Protects Your Data',
    paragraphs: [
      'Public vs. Private Data: Only your display name, city, and neighborhood appear on marketplace listings. Personal contact details are isolated in protected Firestore records.',
      'Authentication Security: Sign-in is powered by Firebase Authentication with role-based access controls enforced across all protected routes.',
    ],
  },
};

export const InfoModal: React.FC<InfoModalProps> = ({ infoKey, onClose }) => {
  return (
    <AnimatePresence>
      {infoKey && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="info-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0F19]/85 backdrop-blur-xs p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="bg-[#161E2E] border border-white/[0.08] rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] pb-4">
              <div>
                <h2
                  id="info-modal-title"
                  className="text-lg font-bold text-[#F8FAFC]"
                >
                  {INFO_CONTENT[infoKey].title}
                </h2>
                <p className="text-xs text-[#8B5CF6] font-medium mt-0.5">
                  {INFO_CONTENT[infoKey].subtitle}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close dialog"
                onClick={onClose}
                className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1D293B] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-sm text-[#94A3B8] leading-relaxed">
              {INFO_CONTENT[infoKey].paragraphs.map((p, idx) => (
                <p key={idx}>{p}</p>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface RequestsModalProps {
  isOpen: boolean;
  requests: RentalRequestRecord[];
  onClose: () => void;
  onSelectListing: (listingId: string) => void;
}

export const RequestsModal: React.FC<RequestsModalProps> = ({
  isOpen,
  requests,
  onClose,
  onSelectListing,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="requests-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0F19]/85 backdrop-blur-xs p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="bg-[#161E2E] border border-white/[0.08] rounded-xl max-w-xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] pb-4">
              <div>
                <h2
                  id="requests-modal-title"
                  className="text-lg font-bold text-[#F8FAFC]"
                >
                  Session Rental Requests ({requests.length})
                </h2>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  Active rental requests logged during this session.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close rental requests dialog"
                onClick={onClose}
                className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1D293B] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {requests.length === 0 ? (
              <p className="text-sm text-[#94A3B8] py-4">
                You have not submitted any rental requests in this session yet.
              </p>
            ) : (
              <div className="space-y-3">
                {requests.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-xl border border-white/[0.08] bg-[#111827] space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onSelectListing(req.listingId);
                        }}
                        className="text-sm font-semibold text-[#F8FAFC] hover:text-[#8B5CF6] text-left cursor-pointer"
                      >
                        {req.listingTitle}
                      </button>
                      <span className="font-mono-tabular text-[#94A3B8] shrink-0">
                        {req.createdAt}
                      </span>
                    </div>
                    <p className="text-[#94A3B8]">
                      Owner: {req.ownerName} ({req.listingCity}) · Dates:{' '}
                      <span className="font-mono-tabular font-medium text-[#F8FAFC]">
                        {req.startDate} to {req.endDate} ({req.days} days)
                      </span>
                    </p>
                    <div className="flex items-center justify-between pt-2 border-t border-white/[0.08] text-[#F8FAFC]">
                      <span className="text-[#22C55E] font-medium uppercase">
                        Status: {req.status}
                      </span>
                      <span className="font-mono-tabular font-bold">
                        Total at Pickup: {formatINR(req.totalUpfrontINR)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface WishlistModalProps {
  isOpen: boolean;
  listings: ProductListing[];
  onClose: () => void;
  onSelectListing: (listingId: string) => void;
}

export const WishlistModal: React.FC<WishlistModalProps> = ({
  isOpen,
  listings,
  onClose,
  onSelectListing,
}) => {
  const [wishlistIds, setWishlistIds] = useState<string[]>(() =>
    loadWishlistIds()
  );

  useEffect(() => {
    const sync = () => setWishlistIds(loadWishlistIds());
    sync();
    window.addEventListener(WISHLIST_CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(WISHLIST_CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [isOpen]);

  const savedListings = listings.filter((item) =>
    wishlistIds.includes(item.id)
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="wishlist-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0F19]/80 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.18 }}
            className="bg-[#161E2E] border border-white/[0.08] rounded-xl max-w-xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 flex items-center justify-center text-[#8B5CF6]">
                  <Heart className="w-4 h-4 fill-[#8B5CF6]" />
                </span>
                <div>
                  <h2
                    id="wishlist-modal-title"
                    className="text-lg font-bold text-[#F8FAFC]"
                  >
                    Saved Wishlist ({savedListings.length})
                  </h2>
                  <p className="text-xs text-[#94A3B8]">
                    Rentals you have bookmarked for quick access.
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close wishlist dialog"
                onClick={onClose}
                className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1D293B] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {savedListings.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <p className="text-sm font-medium text-[#F8FAFC]">
                  Your wishlist is currently empty.
                </p>
                <p className="text-xs text-[#94A3B8]">
                  Tap the heart icon on any rental card to save items here.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {savedListings.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#111827] border border-white/[0.08] hover:border-white/[0.16] transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onSelectListing(item.id);
                      }}
                      className="flex items-center gap-3 text-left flex-1 min-w-0 cursor-pointer"
                    >
                      <div className="w-14 h-14 rounded-lg bg-[#161E2E] overflow-hidden shrink-0 border border-white/[0.08]">
                        <ProductImage
                          srcKeyOrUrl={item.imageUrl}
                          alt={item.title}
                          className="w-full h-full"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#F8FAFC] truncate">
                          {item.title}
                        </p>
                        <p className="text-xs text-[#94A3B8] flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-[#64748B]" />
                          <span className="truncate">
                            {item.neighborhood}, {item.city}
                          </span>
                        </p>
                        <p className="text-xs font-bold text-[#8B5CF6] font-mono-tabular mt-1">
                          {formatINR(item.dailyPriceINR)} / day
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      aria-label={`Remove ${item.title} from wishlist`}
                      onClick={() => toggleWishlistId(item.id)}
                      className="p-2 rounded-lg text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#161E2E] transition-colors cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
