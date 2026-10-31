import React from 'react';
import { ArrowRight, MapPin } from 'lucide-react';
import { ProductListing } from '../../types/marketplace';
import { formatINR } from '../../utils/rentalLogic';
import { PageRoute } from '../Navbar';
import { ProductImage } from '../ProductImage';

export interface HeroSectionProps {
  featuredListing?: ProductListing;
  onNavigate: (route: PageRoute) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  featuredListing,
  onNavigate,
}) => {
  return (
    <section className="pt-10 pb-8 lg:pt-16 lg:pb-12">
      <div className="bb-container">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column (First on Mobile): Headline, Supporting Text, and Action Buttons */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#161E2E] border border-white/[0.08] text-xs font-medium text-[#94A3B8]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]" />
              <span>Peer-to-Peer Rental Marketplace</span>
            </div>

            <h1
              className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#F8FAFC] tracking-tight leading-[1.12]"
              style={{ textWrap: 'balance' }}
            >
              Access More.{' '}
              <span className="text-[#8B5CF6]">Own Less.</span>
            </h1>

            <p className="text-base sm:text-lg text-[#94A3B8] leading-relaxed max-w-xl">
              Rent what you need from people around you. Turn the things you own
              into extra earnings.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  onNavigate({ page: 'browse' });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-sm font-semibold bb-glow-button cursor-pointer"
              >
                <span>Explore Items</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  onNavigate({ page: 'list-item' });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#161E2E] hover:bg-[#1D293B] border border-white/[0.08] hover:border-white/[0.16] text-[#F8FAFC] text-sm font-semibold transition-colors duration-150 cursor-pointer"
              >
                <span>List Your Item</span>
              </button>
            </div>
          </div>

          {/* Right Column (Below on Mobile): Real Product Visual Showcase */}
          <div className="lg:col-span-6">
            {featuredListing ? (
              <div
                onClick={() => {
                  onNavigate({ page: 'details', itemId: featuredListing.id });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onNavigate({ page: 'details', itemId: featuredListing.id });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className="group bg-[#161E2E] border border-white/[0.08] hover:border-white/[0.16] rounded-2xl overflow-hidden transition-all duration-200 cursor-pointer shadow-xl"
              >
                <div className="aspect-[16/10] w-full bg-[#111827] overflow-hidden relative border-b border-white/[0.08]">
                  <ProductImage
                    srcKeyOrUrl={featuredListing.imageUrl}
                    alt={featuredListing.title}
                    className="w-full h-full group-hover:scale-[1.02] transition-transform duration-300 ease-out"
                  />
                  <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0B0F19]/85 border border-white/[0.1] text-xs font-medium text-[#F8FAFC]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                    <span>Available Now</span>
                  </span>
                </div>

                <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs text-[#94A3B8]">
                      <span className="text-[#8B5CF6] font-medium">
                        {featuredListing.category}
                      </span>
                      <span aria-hidden="true" className="text-[#64748B]">
                        ·
                      </span>
                      <span className="inline-flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-[#64748B] shrink-0" />
                        {featuredListing.neighborhood}, {featuredListing.city}
                      </span>
                    </div>
                    <h2 className="text-sm sm:text-base font-semibold text-[#F8FAFC] truncate mt-1">
                      {featuredListing.title}
                    </h2>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="flex items-baseline justify-end gap-1">
                      <span className="text-base sm:text-lg font-bold text-[#F8FAFC] font-mono-tabular">
                        {formatINR(featuredListing.dailyPriceINR)}
                      </span>
                      <span className="text-xs text-[#64748B]">/ day</span>
                    </div>
                    <span className="text-xs font-medium text-[#8B5CF6] group-hover:text-[#A78BFA] transition-colors">
                      View rental →
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
};
