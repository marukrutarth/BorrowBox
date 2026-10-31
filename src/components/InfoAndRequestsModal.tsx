import React from 'react';
import { X } from 'lucide-react';
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
      'In this frontend foundation environment, any rental requests, new item listings, or demo login profiles you submit are stored strictly in temporary session memory and are cleared when you reload or close the browser.',
    ],
  },
  help: {
    title: 'Help & Frequently Asked Questions',
    subtitle: 'Getting Started with Peer-to-Peer Rentals',
    paragraphs: [
      'How are multi-day discounts calculated? Rentals of 7 or more consecutive days automatically receive a 10% discount on the base daily rate.',
      'What happens when I click Request Rental? The calculator validates your dates and logs a session rental request with a complete ₹ breakdown.',
      'Can I list my own item right now? Yes — click "List an Item" in the top bar to publish a listing into the active marketplace catalog.',
    ],
  },
};

export const InfoModal: React.FC<InfoModalProps> = ({ infoKey, onClose }) => {
  if (!infoKey) return null;
  const content = INFO_CONTENT[infoKey];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="info-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2
              id="info-modal-title"
              className="text-lg font-bold text-slate-900"
            >
              {content.title}
            </h2>
            <p className="text-xs text-indigo-600 font-medium mt-0.5">
              {content.subtitle}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
          {content.paragraphs.map((p, idx) => (
            <p key={idx}>{p}</p>
          ))}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
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
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="requests-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2
              id="requests-modal-title"
              className="text-lg font-bold text-slate-900"
            >
              Session Rental Requests ({requests.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Temporary in-memory requests logged during this session.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close rental requests dialog"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {requests.length === 0 ? (
          <p className="text-sm text-slate-600 py-4">
            You have not submitted any rental requests in this session yet.
          </p>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div
                key={req.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSelectListing(req.listingId);
                    }}
                    className="text-sm font-semibold text-slate-900 hover:text-indigo-600 text-left cursor-pointer"
                  >
                    {req.listingTitle}
                  </button>
                  <span className="font-mono-tabular text-slate-500 shrink-0">
                    {req.createdAt}
                  </span>
                </div>
                <p className="text-slate-600">
                  Owner: {req.ownerName} ({req.listingCity}) · Dates:{' '}
                  <span className="font-mono-tabular font-medium">
                    {req.startDate} to {req.endDate} ({req.days} days)
                  </span>
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-slate-800">
                  <span>Status: {req.status}</span>
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
            className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
