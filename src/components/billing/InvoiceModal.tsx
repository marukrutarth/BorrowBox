import React from 'react';
import {
  Calendar,
  CheckCircle2,
  Copy,
  Download,
  MapPin,
  Printer,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import { RentalBookingRecord } from '../../types/marketplace';
import { formatINR } from '../../utils/rentalLogic';

export interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: RentalBookingRecord | null;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  onClose,
  booking,
}) => {
  if (!isOpen || !booking) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyHandoverCode = () => {
    navigator.clipboard.writeText(booking.handoverCode);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Rental Tax Invoice and Receipt"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
    >
      <div className="relative w-full max-w-xl bg-[#0F172A] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#161E2E]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 flex items-center justify-center">
              <Printer className="w-4 h-4 text-[#C4B5FD]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F8FAFC]">
                Tax Invoice & Handover Receipt
              </h3>
              <p className="text-[11px] text-[#94A3B8]">
                Reference: <span className="font-mono text-[#F8FAFC]">{booking.id}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[#94A3B8] hover:text-[#F8FAFC] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Invoice Sheet */}
        <div className="p-6 space-y-5 overflow-y-auto text-xs text-[#CBD5E1]">
          {/* Status banner */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#161E2E] border border-white/[0.06]">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#94A3B8]">
                Booking Status
              </span>
              <p className="text-xs font-bold text-emerald-400 capitalize">
                {booking.status} • Escrow Protected
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#94A3B8]">
                Invoice Date
              </span>
              <p className="text-xs font-semibold text-[#F8FAFC]">
                {new Date(booking.createdAtISO).toLocaleDateString('en-IN')}
              </p>
            </div>
          </div>

          {/* Handover Code Box */}
          <div className="p-4 rounded-xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-[#C4B5FD] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Handover Verification Code
              </span>
              <p className="text-[10px] text-[#94A3B8]">
                Verify in person at item collection
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-mono font-extrabold tracking-wider text-[#F8FAFC] bg-[#0F172A] px-3 py-1 rounded-lg border border-white/[0.08]">
                {booking.handoverCode}
              </span>
              <button
                type="button"
                onClick={handleCopyHandoverCode}
                title="Copy Code"
                className="p-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Parties & Dates */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-[#161E2E]/60 border border-white/[0.06]">
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-[#94A3B8] font-semibold">
                Rental Gear
              </span>
              <p className="text-xs font-bold text-[#F8FAFC]">{booking.listingTitle}</p>
              <p className="text-[11px] text-[#94A3B8]">Lender: {booking.ownerName}</p>
              <p className="text-[11px] text-[#94A3B8]">City: {booking.listingCity}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-[#94A3B8] font-semibold">
                Borrower & Dates
              </span>
              <p className="text-xs font-bold text-[#F8FAFC]">{booking.borrowerName}</p>
              <p className="text-[11px] text-[#94A3B8]">
                {booking.startDate} to {booking.endDate}
              </p>
              <p className="text-[11px] text-[#94A3B8]">Duration: {booking.days} days</p>
            </div>
          </div>

          {/* Itemised Billing Table */}
          <div className="space-y-2 border-t border-b border-white/[0.08] py-3">
            <div className="flex justify-between text-[#CBD5E1]">
              <span>Base Rental ({formatINR(booking.dailyRateINR)} × {booking.days} days):</span>
              <span className="font-medium text-[#F8FAFC]">
                {formatINR(booking.dailyRateINR * booking.days)}
              </span>
            </div>
            <div className="flex justify-between text-[#CBD5E1]">
              <span>Platform Escrow & Handover Fee (5%):</span>
              <span className="font-medium text-[#F8FAFC]">
                {formatINR(Math.max(25, Math.round(booking.netRentalCostINR * 0.05)))}
              </span>
            </div>
            <div className="flex justify-between text-amber-300">
              <span>Security Deposit (Refundable):</span>
              <span className="font-mono font-medium">
                {formatINR(booking.refundableDepositINR)}
              </span>
            </div>
            <div className="pt-2 border-t border-white/[0.06] flex justify-between text-sm font-bold text-[#F8FAFC]">
              <span>Total Upfront Amount Held:</span>
              <span className="text-[#8B5CF6]">{formatINR(booking.totalUpfrontINR)}</span>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-3.5 bg-[#161E2E] border-t border-white/[0.08] flex items-center justify-between">
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-medium text-[#F8FAFC] flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Invoice</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold bb-glow-button cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
