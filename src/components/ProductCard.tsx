import React, { useState } from 'react';
import { ArrowUpRight, Heart } from 'lucide-react';
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
      whileHover={{ y: -3 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className="group relative bg-[#141C2B] border border-white/[0.07] hover:border-white/[0.16] rounded-xl overflow-hidden flex flex-col transition-colors duration-250"
    >
      {/* Smooth Favorite Heart Button */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.86 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        onClick={handleToggleFavorite}
        aria-label={
          isFavorite
            ? `Remove ${listing.title} from favorites`
            : `Save ${listing.title} to favorites`
        }
        className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-[#090D16]/70 backdrop-blur-md border border-white/[0.1] flex items-center justify-center text-[#94A3B8] hover:text-[#F8FAFC] hover:border-white/[0.22] transition-colors duration-200 cursor-pointer"
      >
        <Heart
          className={`w-3.5 h-3.5 transition-colors duration-200 ${
            isFavorite ? 'fill-[#8B5CF6] text-[#8B5CF6]' : ''
          }`}
        />
      </motion.button>

      <button
        type="button"
        onClick={() => onSelect(listing.id)}
        className="text-left flex flex-col flex-1 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#8B5CF6] cursor-pointer"
      >
        {/* 4:3 Product Image Slot with Gentle Zoom on Hover */}
        <div className="aspect-[4/3] w-full bg-[#1B2538] overflow-hidden border-b border-white/[0.06] relative">
          <ProductImage
            srcKeyOrUrl={listing.imageUrl}
            alt={listing.title}
            className="w-full h-full group-hover:scale-[1.035] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          />
        </div>

        {/* Minimal, Editorial Card Content */}
        <div className="p-5 flex flex-col flex-1 justify-between gap-4">
          <div className="space-y-1.5">
            {/* Small Category & City Metadata */}
            <div className="flex items-center justify-between gap-2 text-xs text-[#94A3B8]">
              <span className="font-medium tracking-wide uppercase text-[11px] text-[#8B5CF6]">
                {listing.category}
              </span>
              <span className="truncate text-[11px]">
                {listing.neighborhood}, {listing.city}
              </span>
            </div>

            {/* Clean Product Title */}
            <h3 className="text-[15px] font-semibold text-[#F8FAFC] group-hover:text-white transition-colors duration-200 line-clamp-2 leading-snug">
              {listing.title}
            </h3>

            {/* Quiet Unboxed Metadata Line */}
            <p className="text-xs text-[#94A3B8] pt-0.5 truncate">
              <span>{isAvailable ? 'Available' : 'Archived'}</span>
              <span aria-hidden="true" className="mx-1.5 text-white/20">
                ·
              </span>
              <span>{listing.condition}</span>
              <span aria-hidden="true" className="mx-1.5 text-white/20">
                ·
              </span>
              <span>{listing.owner.name}</span>
            </p>
          </div>

          {/* Clear Pricing & Subtle Interactive Affordance */}
          <div className="pt-3.5 border-t border-white/[0.06] flex items-end justify-between gap-2">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-bold text-[#F8FAFC] font-mono-tabular">
                  {formatINR(listing.dailyPriceINR)}
                </span>
                <span className="text-xs text-[#94A3B8]">/ day</span>
              </div>
              <p className="text-[11px] text-[#94A3B8] font-mono-tabular mt-0.5">
                Deposit {formatINR(listing.refundableDepositINR)}
              </p>
            </div>

            <span className="inline-flex items-center gap-1 text-xs font-medium text-[#94A3B8] group-hover:text-[#F8FAFC] transition-colors duration-200">
              <span>Inspect</span>
              <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 text-[#8B5CF6]" />
            </span>
          </div>
        </div>
      </button>
    </motion.article>
  );
};
