import React from 'react';
import { ProductListing } from '../types/marketplace';
import { formatINR } from '../utils/rentalLogic';
import { ProductImage } from './ProductImage';

interface ProductCardProps {
  listing: ProductListing;
  onSelect: (listingId: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  listing,
  onSelect,
}) => {
  const verificationStatusText = listing.isDemoData
    ? 'Sample Preview (Unverified Demo)'
    : listing.owner.kycVerified
    ? 'Identity Verified'
    : 'Account Email Registered';

  return (
    <article className="group bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300">
      <button
        type="button"
        onClick={() => onSelect(listing.id)}
        className="text-left flex flex-col flex-1 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-indigo-600 cursor-pointer"
      >
        {/* 4:3 Product Image Slot */}
        <div className="aspect-[4/3] w-full bg-slate-100 overflow-hidden border-b border-slate-100">
          <ProductImage
            srcKeyOrUrl={listing.imageUrl}
            alt={listing.title}
            className="w-full h-full group-hover:scale-[1.02] transition-transform duration-200"
          />
        </div>

        {/* Card Content */}
        <div className="p-5 flex flex-col flex-1 justify-between gap-4">
          <div className="space-y-2">
            {/* Unboxed Metadata: Category, Approximate Location, Condition */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
              <span className="font-semibold text-indigo-600">
                {listing.category}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Approx. {listing.neighborhood}, {listing.city}
              </span>
              <span aria-hidden="true">·</span>
              <span>{listing.condition}</span>
            </div>

            {/* Product Name */}
            <h3 className="text-base font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">
              {listing.title}
            </h3>

            {/* Unboxed Verification Status & Availability Window */}
            <div className="pt-1 space-y-1 text-xs text-slate-500">
              <p className="truncate">
                <span className="font-medium text-slate-700">Status:</span>{' '}
                {verificationStatusText}
              </p>
              <p className="font-mono-tabular truncate">
                <span className="font-sans font-medium text-slate-700">
                  Available:
                </span>{' '}
                {listing.availableFrom} to {listing.availableTo} · Min{' '}
                {listing.minRentalDays}d
              </p>
            </div>
          </div>

          {/* Pricing, Deposit & Source Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-baseline justify-between gap-2">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-slate-900 font-mono-tabular">
                  {formatINR(listing.dailyPriceINR)}
                </span>
                <span className="text-xs text-slate-500">/ day</span>
              </div>
              <p className="text-xs text-slate-500 font-mono-tabular mt-0.5">
                Deposit: {formatINR(listing.refundableDepositINR)}
              </p>
            </div>

            <div className="text-right text-xs text-slate-500 shrink-0">
              <p className="font-medium text-slate-700">{listing.owner.name}</p>
              <p className="tabular-nums">
                {listing.isDemoData
                  ? 'Sample Catalog'
                  : listing.owner.completedRentals > 0
                  ? `${listing.owner.completedRentals} rentals`
                  : 'New community listing'}
              </p>
            </div>
          </div>
        </div>
      </button>
    </article>
  );
};
