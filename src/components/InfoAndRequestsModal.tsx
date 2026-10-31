import React from 'react';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { FooterInfoPageKey } from './Footer';
import { RentalRequestRecord } from '../types/marketplace';
import { formatINR } from '../utils/rentalLogic';

interface InfoModalProps {
  infoKey: FooterInfoPageKey | null;
  onClose: () => void;
}

const INFO_CONTENT: Record<
  FooterInfoPageKey,
  { title: string; subtitle: string; paragraphs: string[] }
> = {
  about: {
    title: 'About BorrowBox India',
    subtitle: 'Rent What You Need. Earn From What You Own.',
    paragraphs: [
      'BorrowBox is a peer-to-peer neighborhood rental marketplace built for Indian cities including Bengaluru, Mumbai, Delhi NCR, Hyderabad, Pune, and Chennai.',
      'Most high-quality cameras, gaming consoles, power drills, camping tents, and projectors are used fewer than 10 days a year. BorrowBox connects local owners with nearby borrowers so communities can access better equipment at a fraction of retail cost while owners earn recurring income in Indian Rupees (₹).',
    ],
  },
  contact: {
    title: 'Contact & Support',
    subtitle: 'Community Operations & Handover Desk',
    paragraphs: [
      'Email: support@borrowbox.in (Demo Support Desk)',
      'Operating Hours: Monday to Sunday, 8:00 AM – 10:00 PM IST',
      'Coverage Hubs: Indiranagar & HSR Layout (Bengaluru), Andheri & Powai (Mumbai), Hauz Khas (New Delhi), Jubilee Hills (Hyderabad), Koregaon Park (Pune), Adyar (Chennai).',
    ],
  },
  terms: {
    title: 'Terms of Service & Rental Guidelines',
    subtitle: 'Fair-Use Rules for Owners and Borrowers',
    paragraphs: [
      '1. Identity & Handover Verification: Both owner and borrower must verify a valid Government photo ID (Aadhaar, Passport, or Driving Licence) during physical handover.',
      '2. Condition Inspection: Borrowers and owners must jointly inspect the item and included accessories at pickup and return.',
      '3. Refundable Deposit: Security deposits are held against accidental damage or unreturned accessories and refunded in full upon timely, undamaged return.',
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    subtitle: 'How BorrowBox Handles Your Information',
    paragraphs: [
      'Exact apartment or house numbers are never displayed publicly on product cards; listings only display the neighborhood and landmark.',
      'Private contact information (email and phone) is isolated in Cloud Firestore security rules and never exposed publicly.',
    ],
  },
  help: {
    title: 'Help & Frequently Asked Questions',
    subtitle: 'Getting Started with Peer-to-Peer Rentals',
    paragraphs: [
      'How are multi-day discounts calculated? Rentals of 7 or more consecutive days automatically receive a 10% discount on the base daily rate.',
      'What happens when I click Request Rental? The calculator validates your dates and logs a reservation with a complete ₹ breakdown and QR handover code.',
      'Can I list my own item right now? Yes — click "List an Item" in the top bar to publish a listing into the active marketplace catalog.',
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0F19]/80 backdrop-blur-md p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.2 }}
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0F19]/80 backdrop-blur-md p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.2 }}
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
