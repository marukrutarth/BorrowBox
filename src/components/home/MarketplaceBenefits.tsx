import React from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Coins,
  Compass,
  FileCheck2,
  KeyRound,
  Percent,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Wallet,
  Zap,
} from 'lucide-react';
import { PageRoute } from '../Navbar';

export interface MarketplaceBenefitsProps {
  onNavigate: (route: PageRoute) => void;
}

export const MarketplaceBenefits: React.FC<MarketplaceBenefitsProps> = ({
  onNavigate,
}) => {
  return (
    <div className="space-y-16 sm:space-y-24 py-12 border-t border-white/[0.08]">
      {/* 1. Quick Circular Lifecycle: How BorrowBox Works */}
      <section className="bb-container">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-xs font-semibold text-[#C4B5FD]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Circular Economy</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[#F8FAFC]">
            How BorrowBox Works
          </h2>
          <p className="text-xs sm:text-sm text-[#94A3B8]">
            Four simple steps to safely access or monetize gear in your community.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="rounded-2xl bg-[#161E2E] border border-white/[0.08] p-5 space-y-3 relative group hover:border-[#8B5CF6]/40 transition-colors">
            <span className="text-2xl font-black font-mono text-[#8B5CF6]/50">01</span>
            <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/15 flex items-center justify-center text-[#A78BFA]">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Find Nearby Gear</h3>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Search by your city, dates, and category. Compare verified owner ratings, condition notes, and daily rates.
            </p>
          </div>

          <div className="rounded-2xl bg-[#161E2E] border border-white/[0.08] p-5 space-y-3 relative group hover:border-[#8B5CF6]/40 transition-colors">
            <span className="text-2xl font-black font-mono text-[#8B5CF6]/50">02</span>
            <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/15 flex items-center justify-center text-[#A78BFA]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Escrow Deposit Reserve</h3>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Book dates with automatic 10% discount for 7+ days. Your refundable deposit is safely held in neutral escrow.
            </p>
          </div>

          <div className="rounded-2xl bg-[#161E2E] border border-white/[0.08] p-5 space-y-3 relative group hover:border-[#8B5CF6]/40 transition-colors">
            <span className="text-2xl font-black font-mono text-[#8B5CF6]/50">03</span>
            <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/15 flex items-center justify-center text-[#A78BFA]">
              <KeyRound className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">6-Digit Handover Code</h3>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Meet the owner, inspect the item together, and share your 6-digit code to activate the rental coverage securely.
            </p>
          </div>

          <div className="rounded-2xl bg-[#161E2E] border border-white/[0.08] p-5 space-y-3 relative group hover:border-[#8B5CF6]/40 transition-colors">
            <span className="text-2xl font-black font-mono text-[#8B5CF6]/50">04</span>
            <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/15 flex items-center justify-center text-[#A78BFA]">
              <RotateCcw className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Return & Deposit Release</h3>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Return on time in good condition. The owner confirms inspection, and your deposit is released back instantly.
            </p>
          </div>
        </div>

        <div className="text-center mt-6">
          <button
            type="button"
            onClick={() => {
              onNavigate({ page: 'how-it-works' });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#8B5CF6] hover:text-[#C4B5FD] transition-colors cursor-pointer"
          >
            <span>Read full step-by-step breakdown & FAQs</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* 2. Dual Side-by-Side: Benefits of Renting vs Benefits of Listing */}
      <section className="bb-container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
          {/* Benefits of Renting */}
          <div className="rounded-2xl bg-[#161E2E] border border-white/[0.08] p-6 sm:p-8 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-xs font-semibold text-[#C4B5FD]">
                <Compass className="w-3.5 h-3.5" />
                <span>For Renters</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white">
                Why Rent on BorrowBox?
              </h3>
              <p className="text-xs sm:text-sm text-[#94A3B8]">
                Get the exact professional gear you need for projects, shoots, and trips without committing to full retail prices.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Massive Cost Savings</h4>
                    <p className="text-xs text-[#94A3B8]">Rent a ₹1.5L Sony A7 IV for just ₹1,850/day. Save 90%+ compared to buying.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Automatic 10% Weekly Discount</h4>
                    <p className="text-xs text-[#94A3B8]">Book for 7 days or more and receive an automated 10% discount on base rates.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Protected Escrow Custody</h4>
                    <p className="text-xs text-[#94A3B8]">Deposits remain locked in neutral escrow—never paid to owners upfront.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Convenient Neighborhood Handovers</h4>
                    <p className="text-xs text-[#94A3B8]">Pickup from verified creators and makers in your own locality.</p>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onNavigate({ page: 'browse' });
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs sm:text-sm font-semibold shadow-lg shadow-[#8B5CF6]/30 cursor-pointer transition-all"
            >
              <span>Start Browsing Rental Items</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Benefits of Listing Items */}
          <div className="rounded-2xl bg-[#161E2E] border border-white/[0.08] p-6 sm:p-8 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-xs font-semibold text-[#C4B5FD]">
                <Coins className="w-3.5 h-3.5" />
                <span>For Lenders</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white">
                Why List on BorrowBox?
              </h3>
              <p className="text-xs sm:text-sm text-[#94A3B8]">
                Equipment sits unused in closets 90% of the year. Put your belongings to work and earn regular extra income.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#8B5CF6]/20 text-[#A78BFA] flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Zero Listing Fees</h4>
                    <p className="text-xs text-[#94A3B8]">List as many cameras, consoles, and tools as you own completely free.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#8B5CF6]/20 text-[#A78BFA] flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">You Control Price & Deposit</h4>
                    <p className="text-xs text-[#94A3B8]">Set your daily rental rate, custom security deposit, and minimum rental days.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#8B5CF6]/20 text-[#A78BFA] flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Verified Borrower Profiles</h4>
                    <p className="text-xs text-[#94A3B8]">Review borrower identity and rental history before approving any booking request.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#8B5CF6]/20 text-[#A78BFA] flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Direct & Prompt Bank Payouts</h4>
                    <p className="text-xs text-[#94A3B8]">Rental earnings are transferred to your bank account within 24 hours of return.</p>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onNavigate({ page: 'list-item' });
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.12] text-white text-xs sm:text-sm font-semibold cursor-pointer transition-all"
            >
              <span>List Your First Item</span>
              <Plus className="w-4 h-4 text-[#8B5CF6]" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
