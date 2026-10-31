import React from 'react';
import { ArrowRight, Clock } from 'lucide-react';
import { ProductListing } from '../../types/marketplace';
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
  if (listings.length === 0) {
    return null;
  }

  return (
    <section className="py-10 lg:py-14 border-t border-white/[0.08]">
      <div className="bb-container space-y-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
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
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#94A3B8] hover:text-[#F8FAFC] transition-colors self-start sm:self-auto cursor-pointer"
          >
            <span>Browse All Listings</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Desktop: 4-column grid | Mobile: compact 2-column grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-6">
          {listings.map((item) => (
            <ProductCard
              key={item.id}
              listing={item}
              onSelect={onSelectListing}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
