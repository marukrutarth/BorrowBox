import React from 'react';
import { ArrowRight, Clock } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { ProductListing } from '../../types/marketplace';
import {
  SCROLL_VIEWPORT_CONFIG,
  sectionScrollRevealVariants,
} from '../../utils/motionVariants';
import { ProductCard } from '../products/ProductCard';

export interface RecentlyAddedProps {
  listings: ProductListing[];
  onSelectListing: (listingId: string) => void;
  onViewAll: () => void;
}

export const RecentlyAdded: React.FC<RecentlyAddedProps> = ({
  listings,
  onSelectListing,
  onViewAll,
}) => {
  const prefersReducedMotion = useReducedMotion();

  if (listings.length === 0) {
    return null;
  }

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
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#06B6D4] mb-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Recently Added</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#F8FAFC] tracking-tight">
              Just Listed
            </h2>
          </div>

          <button
            type="button"
            onClick={onViewAll}
            className="inline-flex items-center gap-1.5 min-h-[40px] px-2 -mx-2 rounded-lg text-xs sm:text-sm font-semibold text-[#94A3B8] hover:text-[#F8FAFC] bb-btn-interactive self-start sm:self-auto cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B5CF6]"
          >
            <span>Browse All Listings</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Desktop: 4-column grid | Mobile (350px+): compact 2-column grid | Ultra-narrow (320px): 1-column */}
        <div className="grid grid-cols-1 min-[350px]:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-6 items-stretch">
          {listings.map((item) => (
            <ProductCard
              key={item.id}
              listing={item}
              onSelect={onSelectListing}
            />
          ))}
        </div>
      </div>
    </motion.section>
  );
};
