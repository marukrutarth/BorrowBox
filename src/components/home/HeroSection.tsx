import React from 'react';
import { ArrowRight, MapPin } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { ProductListing } from '../../types/marketplace';
import {
  heroItemVariants,
  heroStaggerContainerVariants,
  heroVisualVariants,
} from '../../utils/motionVariants';
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
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="pt-8 pb-6 sm:pt-10 sm:pb-8 lg:pt-16 lg:pb-12">
      <div className="bb-container">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column (First on Mobile): Eyebrow -> Headline -> Description -> CTA Buttons */}
          <motion.div
            initial={prefersReducedMotion ? false : 'hidden'}
            animate="visible"
            variants={heroStaggerContainerVariants}
            className="lg:col-span-6 space-y-5 sm:space-y-6 min-w-0"
          >
            {/* 1. Hero Eyebrow */}
            <motion.div variants={heroItemVariants}>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#161E2E] border border-white/[0.08] text-xs font-medium text-[#94A3B8]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] shrink-0" />
                <span>Peer-to-Peer Rental Marketplace</span>
              </span>
            </motion.div>

            {/* 2. Hero Headline */}
            <motion.h1
              variants={heroItemVariants}
              className="text-[28px] min-[360px]:text-3xl sm:text-4xl lg:text-5xl font-bold text-[#F8FAFC] tracking-tight leading-[1.14]"
              style={{ textWrap: 'balance' }}
            >
              Access More.{' '}
              <span className="text-[#8B5CF6]">Own Less.</span>
            </motion.h1>

            {/* 3. Description */}
            <motion.p
              variants={heroItemVariants}
              className="text-sm min-[360px]:text-base sm:text-lg text-[#94A3B8] leading-relaxed max-w-xl"
            >
              Rent what you need from people around you. Turn the things you own
              into extra earnings.
            </motion.p>

            {/* 4. CTA Buttons */}
            <motion.div
              variants={heroItemVariants}
              className="flex flex-wrap items-center gap-3 pt-1"
            >
              <button
                type="button"
                onClick={() => {
                  onNavigate({ page: 'browse' });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 sm:py-3 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-sm font-semibold bb-glow-button cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B5CF6]"
              >
                <span>Explore Items</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => {
                  onNavigate({ page: 'list-item' });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 sm:py-3 rounded-xl bg-[#161E2E] hover:bg-[#1D293B] border border-white/[0.08] hover:border-white/[0.16] text-[#F8FAFC] text-sm font-semibold bb-btn-interactive cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B5CF6]"
              >
                <span>List Your Item</span>
              </button>
            </motion.div>
          </motion.div>

          {/* Right Column (Below on Mobile): Real Product Visual Showcase */}
          <motion.div
            initial={prefersReducedMotion ? false : 'hidden'}
            animate="visible"
            variants={heroVisualVariants}
            className="lg:col-span-6 min-w-0"
          >
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
                className="group bg-[#161E2E] border border-white/[0.08] rounded-2xl overflow-hidden bb-card-interactive cursor-pointer shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B5CF6]"
              >
                <div className="aspect-[16/10] w-full bg-[#111827] overflow-hidden relative border-b border-white/[0.08]">
                  <ProductImage
                    srcKeyOrUrl={featuredListing.imageUrl}
                    alt={featuredListing.title}
                    className="w-full h-full bb-card-image"
                  />
                  <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0B0F19]/85 border border-white/[0.1] text-xs font-medium text-[#F8FAFC]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] shrink-0" />
                    <span>Available Now</span>
                  </span>
                </div>

                <div className="p-3.5 sm:p-5 flex items-center justify-between gap-3 sm:gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs text-[#94A3B8] min-w-0">
                      <span className="text-[#8B5CF6] font-medium shrink-0">
                        {featuredListing.category}
                      </span>
                      <span aria-hidden="true" className="text-[#64748B]">
                        ·
                      </span>
                      <span className="inline-flex items-center gap-1 truncate min-w-0">
                        <MapPin className="w-3 h-3 text-[#64748B] shrink-0" />
                        <span className="truncate">
                          {featuredListing.neighborhood}, {featuredListing.city}
                        </span>
                      </span>
                    </div>
                    <h2 className="text-sm sm:text-base font-semibold text-[#F8FAFC] truncate mt-1">
                      {featuredListing.title}
                    </h2>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="flex items-baseline justify-end gap-1">
                      <span className="text-sm min-[360px]:text-base sm:text-lg font-bold text-[#F8FAFC] font-mono-tabular">
                        {formatINR(featuredListing.dailyPriceINR)}
                      </span>
                      <span className="text-[11px] sm:text-xs text-[#64748B]">
                        / day
                      </span>
                    </div>
                    <span className="text-xs font-medium text-[#8B5CF6] group-hover:text-[#A78BFA] transition-colors">
                      View rental →
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </motion.div>
        </div>
      </div>
    </section>
  );
};
