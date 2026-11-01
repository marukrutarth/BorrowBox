import React from 'react';
import { ArrowRight, Globe2, MapPin, Plus, RefreshCw } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { IndianCity, ProductListing } from '../../types/marketplace';
import {
  SCROLL_VIEWPORT_CONFIG,
  sectionScrollRevealVariants,
} from '../../utils/motionVariants';
import { ProductCard } from '../products/ProductCard';

export interface FeaturedProductsProps {
  listings: ProductListing[];
  selectedCity?: IndianCity | 'All';
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onSelectListing: (listingId: string) => void;
  onViewAll: () => void;
  onBrowseAllIndia?: () => void;
  onListInCity?: () => void;
}

export const FeaturedProducts: React.FC<FeaturedProductsProps> = ({
  listings,
  selectedCity = 'All',
  isLoading = false,
  error = null,
  onRetry,
  onSelectListing,
  onViewAll,
  onBrowseAllIndia,
  onListInCity,
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
              {selectedCity !== 'All'
                ? `Popular Rentals in ${selectedCity}`
                : 'Popular Rentals'}
            </h2>
            <p className="text-xs sm:text-sm text-[#94A3B8] mt-1">
              {selectedCity !== 'All'
                ? `Verified peer-to-peer equipment currently listed in ${selectedCity}.`
                : 'Discover items people are renting across India.'}
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
        ) : listings.length === 0 ? (
          <div className="rounded-2xl bg-[#161E2E] border border-white/[0.08] p-8 sm:p-10 text-center space-y-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 flex items-center justify-center text-[#A78BFA] mx-auto">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-[#F8FAFC]">
              No items are currently available in {selectedCity}
            </h3>
            <p className="text-xs sm:text-sm text-[#94A3B8] max-w-md mx-auto leading-relaxed">
              {selectedCity} is a supported BorrowBox launch city, but there are no active rental listings published here yet. Be the first owner to list gear in {selectedCity} or browse available equipment across India.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              {onListInCity && (
                <button
                  type="button"
                  onClick={onListInCity}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>List an Item in {selectedCity}</span>
                </button>
              )}
              {onBrowseAllIndia && (
                <button
                  type="button"
                  onClick={onBrowseAllIndia}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-[#F8FAFC] text-xs font-semibold cursor-pointer"
                >
                  <Globe2 className="w-3.5 h-3.5 text-[#8B5CF6]" />
                  <span>Browse All India</span>
                </button>
              )}
            </div>
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
