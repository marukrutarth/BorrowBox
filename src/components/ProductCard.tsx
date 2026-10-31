import React, { useState } from 'react';
import { ArrowUpRight, Heart, MapPin, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { ProductListing } from '../types/marketplace';
import { formatINR } from '../utils/rentalLogic';
import { ProductImage } from './ProductImage';

interface ProductCardProps {
  listing: ProductListing;
  onSelect: (listingId: string) => void;
}

const FAVORITES_STORAGE_KEY = 'borrowbox_favorite_ids';

function loadFavoriteIds(): string[] {
  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const ProductCard: React.FC<ProductCardProps> = ({
  listing,
  onSelect,
}) => {
  const [isFavorite, setIsFavorite] = useState<boolean>(() =>
    loadFavoriteIds().includes(listing.id)
  );

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const current = loadFavoriteIds();
    const next = current.includes(listing.id)
      ? current.filter((id) => id !== listing.id)
      : [...current, listing.id];
    try {
      window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota errors
    }
    setIsFavorite(next.includes(listing.id));
  };

  const isAvailable = listing.status !== 'archived';

  return (
    <motion.article
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="group relative bg-[#161E2E] border border-white/[0.08] hover:border-[#8B5CF6]/45 rounded-xl overflow-hidden flex flex-col transition-colors duration-200 shadow-lg shadow-black/20"
    >
      {/* Animated Favorite Heart Button */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.82 }}
        onClick={handleToggleFavorite}
        aria-label={
          isFavorite
            ? `Remove ${listing.title} from favorites`
            : `Save ${listing.title} to favorites`
        }
        className="absolute top-3 right-3 z-20 w-8 h-8 rounded-lg bg-[#0B0F19]/75 backdrop-blur-md border border-white/[0.12] flex items-center justify-center text-[#94A3B8] hover:text-[#F8FAFC] hover:border-[#8B5CF6]/50 transition-colors cursor-pointer"
      >
        <Heart
          className={`w-4 h-4 transition-colors ${
            isFavorite ? 'fill-[#8B5CF6] text-[#8B5CF6]' : ''
          }`}
        />
      </motion.button>

      <button
        type="button"
        onClick={() => onSelect(listing.id)}
        className="text-left flex flex-col flex-1 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#8B5CF6] cursor-pointer"
      >
        {/* 4:3 Product Image Slot with Zoom on Hover */}
        <div className="aspect-[4/3] w-full bg-[#1D293B] overflow-hidden border-b border-white/[0.08] relative">
          <ProductImage
            srcKeyOrUrl={listing.imageUrl}
            alt={listing.title}
            className="w-full h-full group-hover:scale-105 transition-transform duration-500 ease-out"
          />
          <div className="absolute bottom-2.5 left-3 z-10 flex items-center gap-1.5 text-[11px] font-medium text-[#F8FAFC]/90 bg-[#0B0F19]/80 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/[0.08]">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isAvailable ? 'bg-[#22C55E]' : 'bg-[#F59E0B]'
              }`}
            />
            <span>{isAvailable ? 'Available' : 'Archived'}</span>
            <span aria-hidden="true" className="text-[#94A3B8]">
              ·
            </span>
            <span className="text-[#94A3B8]">{listing.condition}</span>
          </div>
        </div>

        {/* Card Content */}
        <div className="p-5 flex flex-col flex-1 justify-between gap-4">
          <div className="space-y-2">
            {/* Category & Location Metadata */}
            <div className="flex items-center justify-between gap-2 text-xs text-[#94A3B8]">
              <span className="font-semibold uppercase tracking-wider text-[11px] text-[#8B5CF6]">
                {listing.category}
              </span>
              <span className="inline-flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3 text-[#06B6D4] shrink-0" />
                <span className="truncate">
                  {listing.neighborhood}, {listing.city}
                </span>
              </span>
            </div>

            {/* Product Name */}
            <h3 className="text-base font-semibold text-[#F8FAFC] group-hover:text-[#8B5CF6] transition-colors line-clamp-2 leading-snug">
              {listing.title}
            </h3>

            {/* Availability Window & Owner Rating / Source */}
            <div className="pt-1 space-y-1 text-xs text-[#94A3B8]">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate">
                  Owner:{' '}
                  <strong className="text-[#F8FAFC] font-medium">
                    {listing.owner.name}
                  </strong>
                </span>
                {listing.owner.rating > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[#F8FAFC] font-mono-tabular shrink-0">
                    <Star className="w-3 h-3 fill-[#F59E0B] text-[#F59E0B]" />
                    {listing.owner.rating.toFixed(1)}
                  </span>
                ) : (
                  <span className="text-[11px] text-[#06B6D4] shrink-0">
                    {listing.isDemoData ? 'Sample Preview' : 'Verified Owner'}
                  </span>
                )}
              </div>
              <p className="font-mono-tabular text-[11px] text-[#94A3B8] truncate">
                Window: {listing.availableFrom} → {listing.availableTo} · Min{' '}
                {listing.minRentalDays}d
              </p>
            </div>
          </div>

          {/* Pricing, Deposit & View Details Action Footer */}
          <div className="pt-3.5 border-t border-white/[0.08] flex items-end justify-between gap-2">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-[#F8FAFC] font-mono-tabular">
                  {formatINR(listing.dailyPriceINR)}
                </span>
                <span className="text-xs text-[#94A3B8]">/ day</span>
              </div>
              <p className="text-[11px] text-[#94A3B8] font-mono-tabular mt-0.5">
                Deposit: {formatINR(listing.refundableDepositINR)}
              </p>
            </div>

            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#8B5CF6] group-hover:text-[#F8FAFC] group-hover:bg-[#8B5CF6] px-2.5 py-1.5 rounded-lg border border-[#8B5CF6]/30 transition-all">
              <span>View Details</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </button>
    </motion.article>
  );
};
