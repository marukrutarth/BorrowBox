import React from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { ProductListing } from '../../types/marketplace';
import {
  SCROLL_VIEWPORT_CONFIG,
  sectionScrollRevealVariants,
} from '../../utils/motionVariants';
import { formatINR } from '../../utils/rentalLogic';
import { ProductImage } from '../ProductImage';

export interface BecomeLenderProps {
  spotlightListing?: ProductListing;
  onStartListing: () => void;
}

export const BecomeLender: React.FC<BecomeLenderProps> = ({
  spotlightListing,
  onStartListing,
}) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.section
      initial={prefersReducedMotion ? false : 'hidden'}
      whileInView="visible"
      viewport={SCROLL_VIEWPORT_CONFIG}
      variants={sectionScrollRevealVariants}
      className="py-10 sm:py-12 lg:py-16 border-t border-white/[0.08]"
    >
      <div className="bb-container">
        <div className="rounded-2xl bg-[#161E2E] border border-white/[0.08] p-5 sm:p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center">
          {/* Left: Promotional Copy & CTA */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-5 min-w-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#111827] border border-white/[0.08] text-xs font-medium text-[#8B5CF6]">
              Become a Lender
            </span>

            <h2
              className="text-2xl sm:text-3xl font-bold text-[#F8FAFC] tracking-tight leading-tight"
              style={{ textWrap: 'balance' }}
            >
              Turn What You Own Into Income.
            </h2>

            <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed max-w-xl">
              Your unused belongings could be useful to someone nearby.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 pt-1 text-xs text-[#94A3B8]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#8B5CF6] shrink-0" />
                <span>Set your own daily ₹ price</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#8B5CF6] shrink-0" />
                <span>Refundable security deposits</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#8B5CF6] shrink-0" />
                <span>Verified ID at handover</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={onStartListing}
                className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 sm:py-3 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-sm font-semibold bb-glow-button cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B5CF6]"
              >
                <span>Start Listing</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            </div>
          </div>

          {/* Right: Relevant Product Visual */}
          <div className="lg:col-span-5 min-w-0">
            {spotlightListing ? (
              <div className="rounded-xl bg-[#111827] border border-white/[0.08] overflow-hidden">
                <div className="aspect-[16/10] w-full overflow-hidden border-b border-white/[0.08]">
                  <ProductImage
                    srcKeyOrUrl={spotlightListing.imageUrl}
                    alt={spotlightListing.title}
                    className="w-full h-full"
                  />
                </div>
                <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-[#64748B] uppercase tracking-wider truncate">
                      Example Earner · {spotlightListing.city}
                    </p>
                    <p className="text-xs sm:text-sm font-semibold text-[#F8FAFC] truncate mt-0.5">
                      {spotlightListing.title}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-[#22C55E] font-mono-tabular">
                      +{formatINR(spotlightListing.dailyPriceINR * 4)}
                    </p>
                    <p className="text-[11px] text-[#64748B]">per 4-day rental</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </motion.section>
  );
};
