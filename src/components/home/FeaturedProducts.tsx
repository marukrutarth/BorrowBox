import React from 'react';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { ProductListing } from '../../types/marketplace';
import {
  SCROLL_VIEWPORT_CONFIG,
  sectionScrollRevealVariants,
} from '../../utils/motionVariants';
import { ProductCard } from '../products/ProductCard';

export interface FeaturedProductsProps {
  listings: ProductListing[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onSelectListing: (listingId: string) => void;
  onViewAll: () => void;
}

export const FeaturedProducts: React.FC<FeaturedProductsProps> = ({
  listings,
  isLoading = false,
  error = null,
  onRetry,
  onSelectListing,
  onViewAll,
}) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.section
      initial={prefersReducedMotion ? false : 'hidden'}
      whileInView="visible"
      viewport={SCROLL_VIEWPORT_CONFIG}
      variants={sectionScrollRevealVariants}
      className="py-10 lg:py-14 border-t border-white/[0.08]"
    >
      <div className="bb-container space-y-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#F8FAFC] tracking-tight">
              Popular Rentals
            </h2>
            <p className="text-xs sm:text-sm text-[#94A3B8] mt-1">
              Discover items people are renting.
            </p>
          </div>

          <button
            type="button"
            onClick={onViewAll}
            className="inline-flex items-center gap-1.5 min-h-[40px] px-2 -mx-2 rounded-lg text-xs sm:text-sm font-semibold text-[#8B5CF6] hover:text-[#A78BFA] bb-btn-interactive self-start sm:self-auto cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B5CF6]"
          >
            <span>View All</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-[#161E2E] border border-[#EF4444]/30 flex items-center justify-between gap-4 text-xs text-[#F8FAFC]">
            <span>{error}</span>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1D293B] hover:bg-white/[0.08] font-medium bb-btn-interactive cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            )}
          </div>
        )}

        {isLoading && listings.length === 0 ? (
          <div className="grid grid-cols-1 min-[350px]:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-6">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="rounded-xl bg-[#161E2E] border border-white/[0.08] overflow-hidden animate-pulse"
              >
                <div className="aspect-[4/3] bg-[#111827]" />
                <div className="p-4 space-y-2.5">
                  <div className="h-3 w-1/2 bg-[#1D293B] rounded" />
                  <div className="h-4 w-5/6 bg-[#1D293B] rounded" />
                  <div className="h-4 w-1/3 bg-[#1D293B] rounded mt-3" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Desktop: 4-column grid | Mobile (350px+): compact 2-column grid | Ultra-narrow (320px): 1-column */
          <div className="grid grid-cols-1 min-[350px]:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-6 items-stretch">
            {listings.map((item) => (
              <ProductCard
                key={item.id}
                listing={item}
                onSelect={onSelectListing}
              />
            ))}
          </div>
        )}
      </div>
    </motion.section>
  );
};
