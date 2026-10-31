import React, { useEffect, useState } from 'react';
import { Heart, MapPin } from 'lucide-react';
import { ProductListing } from '../../types/marketplace';
import { formatINR } from '../../utils/rentalLogic';
import {
  WISHLIST_CHANGE_EVENT,
  loadWishlistIds,
  toggleWishlistId,
} from '../../utils/wishlist';
import { ProductImage } from '../ProductImage';

export interface ProductCardProps {
  listing: ProductListing;
  onSelect: (listingId: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  listing,
  onSelect,
}) => {
  const [isFavorite, setIsFavorite] = useState<boolean>(() =>
    loadWishlistIds().includes(listing.id)
  );

  useEffect(() => {
    const syncWishlist = () => {
      setIsFavorite(loadWishlistIds().includes(listing.id));
    };
    window.addEventListener(WISHLIST_CHANGE_EVENT, syncWishlist);
    window.addEventListener('storage', syncWishlist);
    return () => {
      window.removeEventListener(WISHLIST_CHANGE_EVENT, syncWishlist);
      window.removeEventListener('storage', syncWishlist);
    };
  }, [listing.id]);

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const next = toggleWishlistId(listing.id);
    setIsFavorite(next.includes(listing.id));
  };

  const isAvailable = listing.status !== 'archived';
  const rentalPeriodLabel =
    listing.minRentalDays && listing.minRentalDays > 1
      ? `per day · Min ${listing.minRentalDays}d`
      : 'per day';

  return (
    <article className="group relative bg-[#161E2E] border border-white/[0.08] hover:border-white/[0.16] rounded-xl overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5">
      {/* Wishlist Control */}
      <button
        type="button"
        onClick={handleToggleFavorite}
        aria-label={
          isFavorite
            ? `Remove ${listing.title} from wishlist`
            : `Save ${listing.title} to wishlist`
        }
        aria-pressed={isFavorite}
        className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-20 w-8 h-8 rounded-full bg-[#0B0F19]/80 border border-white/[0.1] flex items-center justify-center text-[#94A3B8] hover:text-[#F8FAFC] hover:border-white/[0.22] transition-colors duration-150 cursor-pointer"
      >
        <Heart
          className={`w-4 h-4 transition-colors duration-150 ${
            isFavorite ? 'fill-[#8B5CF6] text-[#8B5CF6]' : ''
          }`}
        />
      </button>

      <button
        type="button"
        onClick={() => onSelect(listing.id)}
        className="text-left flex flex-col flex-1 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#8B5CF6] cursor-pointer"
      >
        {/* Product Image + Availability Indicator */}
        <div className="aspect-[4/3] w-full bg-[#111827] overflow-hidden border-b border-white/[0.08] relative">
          <ProductImage
            srcKeyOrUrl={listing.imageUrl}
            alt={listing.title}
            className="w-full h-full group-hover:scale-[1.03] transition-transform duration-300 ease-out"
          />
          <span
            className={`absolute bottom-2.5 left-2.5 sm:bottom-3 sm:left-3 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border ${
              isAvailable
                ? 'bg-[#0B0F19]/85 text-[#F8FAFC] border-white/[0.1]'
                : 'bg-[#0B0F19]/85 text-[#94A3B8] border-white/[0.08]'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isAvailable ? 'bg-[#22C55E]' : 'bg-[#64748B]'
              }`}
            />
            <span>{isAvailable ? 'Available' : 'Unavailable'}</span>
          </span>
        </div>

        {/* Card Body */}
        <div className="p-3.5 sm:p-4 flex flex-col flex-1 justify-between gap-3">
          <div className="space-y-1">
            {/* Location */}
            <div className="flex items-center gap-1 text-[11px] sm:text-xs text-[#94A3B8] truncate">
              <MapPin className="w-3 h-3 text-[#64748B] shrink-0" />
              <span className="truncate">
                {listing.neighborhood}, {listing.city}
              </span>
            </div>

            {/* Product Name */}
            <h3 className="text-sm sm:text-[15px] font-semibold text-[#F8FAFC] group-hover:text-white transition-colors duration-150 line-clamp-2 leading-snug">
              {listing.title}
            </h3>
          </div>

          {/* Rental Price & Rental Period */}
          <div className="pt-2.5 border-t border-white/[0.08] flex items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-sm sm:text-base font-bold text-[#F8FAFC] font-mono-tabular">
                {formatINR(listing.dailyPriceINR)}
              </span>
              <span className="text-[11px] sm:text-xs text-[#64748B]">
                {rentalPeriodLabel}
              </span>
            </div>
            <span className="hidden sm:inline-block text-[11px] font-medium text-[#8B5CF6] group-hover:text-[#A78BFA] transition-colors shrink-0">
              Rent →
            </span>
          </div>
        </div>
      </button>
    </article>
  );
};
