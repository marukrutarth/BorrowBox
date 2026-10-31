import React, { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Calculator,
  Camera,
  CheckCircle2,
  Compass,
  Cpu,
  Gamepad2,
  GraduationCap,
  Info,
  Lock,
  MapPin,
  Music,
  PlusCircle,
  QrCode,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wrench,
} from 'lucide-react';
import { motion, useScroll, useTransform } from 'motion/react';
import { CATEGORY_DIRECTORY } from '../data/demoCatalog';
import {
  CategoryName,
  IndianCity,
  ListingSourceFilter,
  ProductListing,
} from '../types/marketplace';
import {
  ALL_CATEGORIES,
  ALL_CITIES,
  calculateRentVsBuy,
  computePersonalizedRecommendations,
  filterAndSortListings,
  formatINR,
} from '../utils/rentalLogic';
import { PageRoute } from '../components/Navbar';
import { ProductCard } from '../components/ProductCard';
import { ProductImage } from '../components/ProductImage';

interface HomePageProps {
  listings: ProductListing[];
  selectedCity: IndianCity | 'All';
  onCityChange: (city: IndianCity | 'All') => void;
  isLoadingListings?: boolean;
  listingsError?: string | null;
  onRetryListings?: () => void;
  onNavigate: (route: PageRoute) => void;
}

const CATEGORY_ICONS: Record<CategoryName, React.ReactNode> = {
  Photography: <Camera className="w-4 h-4 text-[#8B5CF6]" />,
  Gaming: <Gamepad2 className="w-4 h-4 text-[#8B5CF6]" />,
  Electronics: <Cpu className="w-4 h-4 text-[#8B5CF6]" />,
  Tools: <Wrench className="w-4 h-4 text-[#8B5CF6]" />,
  Outdoor: <Compass className="w-4 h-4 text-[#8B5CF6]" />,
  'Musical Instruments': <Music className="w-4 h-4 text-[#8B5CF6]" />,
  Events: <Sparkles className="w-4 h-4 text-[#8B5CF6]" />,
  Education: <GraduationCap className="w-4 h-4 text-[#8B5CF6]" />,
};

const EASE_OUT_CINEMATIC: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const HomePage: React.FC<HomePageProps> = ({
  listings,
  selectedCity,
  onCityChange,
  isLoadingListings = false,
  listingsError = null,
  onRetryListings,
  onNavigate,
}) => {
  const [heroSearchQuery, setHeroSearchQuery] = useState('');
  const [heroCategory, setHeroCategory] = useState<CategoryName | 'All'>('All');
  const [heroSpotlightIndex, setHeroSpotlightIndex] = useState(0);
  const [nearbySourceFilter, setNearbySourceFilter] =
    useState<ListingSourceFilter>('all');
  const [howItWorksTab, setHowItWorksTab] = useState<'borrower' | 'owner'>(
    'borrower'
  );

  // Subtle scroll parallax for the hero product showcase
  const heroSectionRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: heroSectionRef,
    offset: ['start start', 'end start'],
  });
  const heroImageParallaxY = useTransform(scrollYProgress, [0, 1], [0, -24]);

  // Interactive Rent-vs-Buy Calculator state on Homepage
  const [calcItemId, setCalcItemId] = useState<string>(
    listings[0]?.id || 'bb-ind-101'
  );
  const [calcDaysPerTrip, setCalcDaysPerTrip] = useState(3);
  const [calcTripsPerYear, setCalcTripsPerYear] = useState(4);

  const selectedCalcListing = useMemo(() => {
    return listings.find((l) => l.id === calcItemId) || listings[0];
  }, [listings, calcItemId]);

  const rentVsBuyResult = useMemo(() => {
    if (!selectedCalcListing) return null;
    return calculateRentVsBuy({
      dailyRentalINR: selectedCalcListing.dailyPriceINR,
      retailPriceINR:
        selectedCalcListing.replacementValueINR ||
        selectedCalcListing.dailyPriceINR * 35,
      plannedDaysPerYear: calcDaysPerTrip * calcTripsPerYear,
    });
  }, [selectedCalcListing, calcDaysPerTrip, calcTripsPerYear]);

  const personalizedRecs = useMemo(() => {
    return computePersonalizedRecommendations(listings, {
      userCity: selectedCity,
      preferredCategory:
        heroCategory !== 'All' ? heroCategory : 'Photography',
      limit: 3,
    });
  }, [listings, selectedCity, heroCategory]);

  const heroArrangementListings = useMemo(() => {
    const cityMatches = filterAndSortListings(listings, {
      city: selectedCity,
      sortBy: 'featured',
    });
    const base = cityMatches.length >= 3 ? cityMatches : listings;
    return base.slice(0, 3);
  }, [listings, selectedCity]);

  const activeHeroListing =
    heroArrangementListings[heroSpotlightIndex] || heroArrangementListings[0];

  const nearbyListings = useMemo(() => {
    return filterAndSortListings(listings, {
      city: selectedCity,
      sourceFilter: nearbySourceFilter,
      sortBy: 'featured',
    });
  }, [listings, selectedCity, nearbySourceFilter]);

  const nearbyCounts = useMemo(() => {
    const allInCity = filterAndSortListings(listings, {
      city: selectedCity,
      sourceFilter: 'all',
    });
    const communityCount = allInCity.filter((i) => !i.isDemoData).length;
    const sampleCount = allInCity.filter((i) => i.isDemoData).length;
    return {
      total: allInCity.length,
      community: communityCount,
      sample: sampleCount,
    };
  }, [listings, selectedCity]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, { community: number; sample: number }> = {};
    for (const cat of ALL_CATEGORIES) {
      counts[cat] = { community: 0, sample: 0 };
    }
    for (const item of listings) {
      if (selectedCity !== 'All' && item.city !== selectedCity) {
        continue;
      }
      if (!counts[item.category]) {
        counts[item.category] = { community: 0, sample: 0 };
      }
      if (item.isDemoData) {
        counts[item.category].sample += 1;
      } else {
        counts[item.category].community += 1;
      }
    }
    return counts;
  }, [listings, selectedCity]);

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onNavigate({
      page: 'browse',
      query: heroSearchQuery.trim() || undefined,
      city: selectedCity !== 'All' ? selectedCity : undefined,
      category: heroCategory !== 'All' ? heroCategory : undefined,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="bg-transparent text-[#F8FAFC]">
      {/* 1. Cinematic, Minimal Hero Section */}
      <section
        ref={heroSectionRef}
        className="relative border-b border-white/[0.07] pt-14 pb-20 lg:pt-24 lg:pb-28 overflow-hidden"
      >
        {/* Soft Ambient Lighting Around Hero Only */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-8 right-[10%] w-[520px] h-[360px] rounded-full bg-gradient-to-tr from-[#8B5CF6]/12 via-[#06B6D4]/6 to-transparent blur-3xl -z-10"
        />

        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center mb-14">
            {/* Hero Left: Staggered Typography & Elegant CTAs */}
            <div className="lg:col-span-7 space-y-7">
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE_OUT_CINEMATIC }}
                className="text-xs font-semibold tracking-[0.14em] uppercase text-[#06B6D4]"
              >
                Rent What You Need · Earn From What You Own
              </motion.p>

              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.58,
                  delay: 0.06,
                  ease: EASE_OUT_CINEMATIC,
                }}
                className="text-4xl sm:text-5xl lg:text-[3.65rem] font-extrabold text-[#F8FAFC] tracking-tight leading-[1.06]"
                style={{ textWrap: 'balance' }}
              >
                Why Buy It When You Can{' '}
                <span className="bg-gradient-to-r from-[#F8FAFC] via-[#C4B5FD] to-[#8B5CF6] bg-clip-text text-transparent">
                  Borrow It?
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.55,
                  delay: 0.12,
                  ease: EASE_OUT_CINEMATIC,
                }}
                className="text-base sm:text-lg text-[#94A3B8] leading-relaxed max-w-xl"
              >
                Rent studio cameras, PlayStation 5 consoles, power tools, and
                trekking equipment from verified neighbors across Indian cities —
                or list your idle gear to earn in Indian Rupees (₹).
              </motion.p>

              {/* Elegant CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  delay: 0.18,
                  ease: EASE_OUT_CINEMATIC,
                }}
                className="flex flex-wrap items-center gap-3.5 pt-1"
              >
                <button
                  type="button"
                  onClick={() => {
                    onNavigate({
                      page: 'browse',
                      city: selectedCity !== 'All' ? selectedCity : undefined,
                    });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="group inline-flex items-center gap-2 px-6 py-3.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-sm font-semibold rounded-xl bb-glow-button whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Explore Items</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate({ page: 'list-item' });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-6 py-3.5 bg-[#141C2B] hover:bg-[#1B2538] text-[#F8FAFC] border border-white/[0.09] hover:border-white/[0.18] text-sm font-semibold rounded-xl transition-colors duration-200 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  List Your Item
                </button>
              </motion.div>

              {/* Quiet Supported Hubs Line */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.55, delay: 0.24 }}
                className="pt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[#94A3B8]"
              >
                <span className="font-medium text-[#F8FAFC]">Active Cities</span>
                <span aria-hidden="true" className="text-white/20">
                  ·
                </span>
                <span>Bengaluru</span>
                <span aria-hidden="true" className="text-white/20">
                  ·
                </span>
                <span>Mumbai</span>
                <span aria-hidden="true" className="text-white/20">
                  ·
                </span>
                <span>Delhi NCR</span>
                <span aria-hidden="true" className="text-white/20">
                  ·
                </span>
                <span>Hyderabad</span>
                <span aria-hidden="true" className="text-white/20">
                  ·
                </span>
                <span>Pune</span>
                <span aria-hidden="true" className="text-white/20">
                  ·
                </span>
                <span>Chennai</span>
              </motion.div>
            </div>

            {/* Hero Right: Single Striking Product Composition with Subtle Float & Parallax */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.65,
                delay: 0.14,
                ease: EASE_OUT_CINEMATIC,
              }}
              style={{ y: heroImageParallaxY }}
              className="lg:col-span-5"
            >
              {activeHeroListing && (
                <div className="bb-animate-float">
                  <div className="rounded-2xl bg-[#141C2B] border border-white/[0.08] overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate({
                          page: 'details',
                          itemId: activeHeroListing.id,
                        });
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="group block w-full text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#8B5CF6]"
                    >
                      <div className="aspect-[4/3] w-full overflow-hidden bg-[#1B2538] relative">
                        <ProductImage
                          srcKeyOrUrl={activeHeroListing.imageUrl}
                          alt={activeHeroListing.title}
                          className="w-full h-full group-hover:scale-[1.03] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                        />
                      </div>

                      <div className="p-5 flex items-end justify-between gap-4 border-t border-white/[0.07]">
                        <div className="min-w-0 space-y-1">
                          <p className="text-[11px] font-medium uppercase tracking-wider text-[#8B5CF6]">
                            {activeHeroListing.category} ·{' '}
                            {activeHeroListing.city}
                          </p>
                          <h2 className="text-base font-semibold text-[#F8FAFC] truncate group-hover:text-white transition-colors">
                            {activeHeroListing.title}
                          </h2>
                          <p className="text-xs text-[#94A3B8] font-mono-tabular">
                            Refundable deposit{' '}
                            {formatINR(activeHeroListing.refundableDepositINR)}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-lg font-bold text-[#F8FAFC] font-mono-tabular">
                            {formatINR(activeHeroListing.dailyPriceINR)}
                            <span className="text-xs font-normal text-[#94A3B8]">
                              /day
                            </span>
                          </p>
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-[#06B6D4] mt-0.5">
                            <span>View item</span>
                            <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                          </span>
                        </div>
                      </div>
                    </button>

                    {/* Minimal Composition Switcher */}
                    {heroArrangementListings.length > 1 && (
                      <div className="px-5 py-3 bg-[#0F1523] border-t border-white/[0.06] flex items-center justify-between gap-2">
                        <span className="text-[11px] text-[#94A3B8]">
                          Featured Spotlight
                        </span>
                        <div
                          role="tablist"
                          aria-label="Select featured hero product"
                          className="flex items-center gap-1.5"
                        >
                          {heroArrangementListings.map((item, idx) => (
                            <button
                              key={item.id}
                              type="button"
                              role="tab"
                              aria-selected={heroSpotlightIndex === idx}
                              aria-label={`Spotlight ${idx + 1}: ${item.title}`}
                              onClick={() => setHeroSpotlightIndex(idx)}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-mono-tabular transition-colors duration-200 cursor-pointer ${
                                heroSpotlightIndex === idx
                                  ? 'bg-[#8B5CF6] text-white font-semibold'
                                  : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.05]'
                              }`}
                            >
                              0{idx + 1}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* Smooth Search Bar Interaction */}
          <motion.form
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.55,
              delay: 0.22,
              ease: EASE_OUT_CINEMATIC,
            }}
            onSubmit={handleHeroSearch}
            aria-label="Search rental items"
            className="bg-[#141C2B]/90 backdrop-blur-xl border border-white/[0.07] focus-within:border-white/[0.16] rounded-2xl p-4 sm:p-5 transition-colors duration-250 shadow-[0_16px_40px_rgba(0,0,0,0.35)]"
          >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
              <div className="md:col-span-5">
                <label
                  htmlFor="hero-search-product"
                  className="block text-xs font-medium text-[#94A3B8] mb-1.5"
                >
                  Product Name or Equipment
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="hero-search-product"
                    type="text"
                    value={heroSearchQuery}
                    onChange={(e) => setHeroSearchQuery(e.target.value)}
                    placeholder="Try Sony A7 IV, PS5, Bosch Drill, Camping Tent..."
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#0F1523] border border-white/[0.07] rounded-xl text-sm text-[#F8FAFC] placeholder:text-[#94A3B8] focus:bg-[#1B2538] focus:outline-none focus:border-white/[0.22] transition-colors duration-200"
                  />
                </div>
              </div>

              <div className="md:col-span-3">
                <label
                  htmlFor="hero-search-location"
                  className="block text-xs font-medium text-[#94A3B8] mb-1.5"
                >
                  Location
                </label>
                <select
                  id="hero-search-location"
                  value={selectedCity}
                  onChange={(e) =>
                    onCityChange(e.target.value as IndianCity | 'All')
                  }
                  className="w-full px-3.5 py-2.5 bg-[#0F1523] border border-white/[0.07] rounded-xl text-sm text-[#F8FAFC] focus:bg-[#1B2538] focus:outline-none focus:border-white/[0.22] transition-colors duration-200"
                >
                  <option value="All">All Indian Cities</option>
                  {ALL_CITIES.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="hero-search-category"
                  className="block text-xs font-medium text-[#94A3B8] mb-1.5"
                >
                  Category
                </label>
                <select
                  id="hero-search-category"
                  value={heroCategory}
                  onChange={(e) =>
                    setHeroCategory(e.target.value as CategoryName | 'All')
                  }
                  className="w-full px-3.5 py-2.5 bg-[#0F1523] border border-white/[0.07] rounded-xl text-sm text-[#F8FAFC] focus:bg-[#1B2538] focus:outline-none focus:border-white/[0.22] transition-colors duration-200"
                >
                  <option value="All">All Categories</option>
                  {ALL_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 md:pt-5">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-sm font-semibold rounded-xl bb-glow-button whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Search Gear
                </button>
              </div>
            </div>
          </motion.form>
        </div>
      </section>

      {/* 2. Popular Categories Section */}
      <section className="py-20 lg:py-24 border-b border-white/[0.07] bg-[#0F1523]/70">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.55, ease: EASE_OUT_CINEMATIC }}
            className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8B5CF6] mb-1.5">
                Equipment Verticals
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#F8FAFC] tracking-tight">
                Popular Categories
              </h2>
              <p className="text-sm text-[#94A3B8] mt-1">
                Explore rental categories in{' '}
                {selectedCity === 'All' ? 'all Indian cities' : selectedCity}{' '}
                with daily rates in ₹.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onNavigate({
                  page: 'browse',
                  city: selectedCity !== 'All' ? selectedCity : undefined,
                });
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-sm font-semibold text-[#8B5CF6] hover:text-[#A78BFA] transition-colors duration-200 whitespace-nowrap shrink-0 self-start sm:self-auto cursor-pointer"
            >
              Browse Full Catalog →
            </button>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CATEGORY_DIRECTORY.map((cat, idx) => {
              const countObj = categoryCounts[cat.name] || {
                community: 0,
                sample: 0,
              };
              const totalInCat = countObj.community + countObj.sample;
              const countLabel =
                countObj.community > 0
                  ? `${countObj.community} community · ${countObj.sample} sample`
                  : totalInCat > 0
                  ? `${countObj.sample} sample preview`
                  : '0 listings in city';

              return (
                <motion.button
                  key={cat.name}
                  type="button"
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{
                    duration: 0.5,
                    delay: idx * 0.035,
                    ease: EASE_OUT_CINEMATIC,
                  }}
                  whileHover={{ y: -2 }}
                  onClick={() => {
                    onNavigate({
                      page: 'browse',
                      category: cat.name,
                      city: selectedCity !== 'All' ? selectedCity : undefined,
                    });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="group text-left p-5 bg-[#141C2B] border border-white/[0.07] hover:border-white/[0.16] rounded-xl transition-colors duration-250 flex flex-col justify-between gap-5 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-[#F8FAFC] group-hover:text-white transition-colors duration-200">
                        {cat.name}
                      </h3>
                      <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed">
                        {cat.summary}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#1B2538] border border-white/[0.06] shrink-0">
                      {CATEGORY_ICONS[cat.name]}
                    </div>
                  </div>
                  <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-[#94A3B8]">
                    <span className="tabular-nums">{countLabel}</span>
                    <span className="font-mono-tabular font-semibold text-[#F8FAFC]">
                      From {formatINR(cat.startingPriceINR)}/day
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. Featured & Nearby Rental Products Section */}
      <section className="py-20 lg:py-24 border-b border-white/[0.07] bg-[#090D16]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.55, ease: EASE_OUT_CINEMATIC }}
            className="flex flex-col lg:flex-row lg:items-end justify-between gap-4"
          >
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#06B6D4] mb-1.5">
                <MapPin className="w-3.5 h-3.5" />
                <span>
                  {selectedCity === 'All'
                    ? 'Featured Across Indian Cities'
                    : `Featured Nearby in ${selectedCity}`}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#F8FAFC] tracking-tight">
                Featured Rental Products
              </h2>
              <p className="text-sm text-[#94A3B8] mt-1">
                Compare daily rental rates, refundable security deposits,
                approximate locations, and availability windows.
              </p>
            </div>

            {/* Source Filter Segmented Control */}
            <div
              role="group"
              aria-label="Filter listings by source"
              className="inline-flex flex-wrap items-center gap-1 p-1 bg-[#141C2B] border border-white/[0.07] rounded-xl self-start"
            >
              <button
                type="button"
                onClick={() => setNearbySourceFilter('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors duration-200 cursor-pointer ${
                  nearbySourceFilter === 'all'
                    ? 'bg-[#8B5CF6] text-white'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                All Views ({nearbyCounts.total})
              </button>
              <button
                type="button"
                onClick={() => setNearbySourceFilter('community')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors duration-200 cursor-pointer ${
                  nearbySourceFilter === 'community'
                    ? 'bg-[#8B5CF6] text-white'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                Community Listings ({nearbyCounts.community})
              </button>
              <button
                type="button"
                onClick={() => setNearbySourceFilter('sample')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors duration-200 cursor-pointer ${
                  nearbySourceFilter === 'sample'
                    ? 'bg-[#8B5CF6] text-white'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                Sample Previews ({nearbyCounts.sample})
              </button>
            </div>
          </motion.div>

          {/* Quick City Filter Bar */}
          <div
            role="group"
            aria-label="Select nearby city"
            className="flex items-center gap-2 flex-wrap"
          >
            <button
              type="button"
              onClick={() => onCityChange('All')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors duration-200 cursor-pointer ${
                selectedCity === 'All'
                  ? 'bg-[#8B5CF6] text-white'
                  : 'bg-[#141C2B] border border-white/[0.07] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-white/[0.15]'
              }`}
            >
              All Cities
            </button>
            {ALL_CITIES.map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => onCityChange(city)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors duration-200 cursor-pointer ${
                  selectedCity === city
                    ? 'bg-[#8B5CF6] text-white'
                    : 'bg-[#141C2B] border border-white/[0.07] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-white/[0.15]'
                }`}
              >
                {city}
              </button>
            ))}
          </div>

          {/* Honest Catalog Transparency Banner */}
          {nearbySourceFilter !== 'community' && nearbyCounts.sample > 0 && (
            <div className="p-3.5 rounded-xl bg-[#141C2B] border border-white/[0.07] flex items-start gap-2.5 text-xs text-[#94A3B8]">
              <Info className="w-4 h-4 text-[#06B6D4] shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#F8FAFC]">
                  Catalog Transparency:
                </strong>{' '}
                Items labeled{' '}
                <span className="font-medium text-[#F8FAFC]">
                  Sample Preview
                </span>{' '}
                are demonstration listings and not active neighborhood offers.
                Switch to{' '}
                <button
                  type="button"
                  onClick={() => setNearbySourceFilter('community')}
                  className="text-[#8B5CF6] font-semibold underline hover:text-[#A78BFA] cursor-pointer"
                >
                  View Community Listings Only
                </button>{' '}
                to view only user-created listings.
              </div>
            </div>
          )}

          {/* Smooth Skeleton Loading, Error, Empty, or Staggered Listings Grid */}
          {isLoadingListings ? (
            <div
              role="status"
              aria-live="polite"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {[0, 1, 2].map((skeletonIdx) => (
                <div
                  key={skeletonIdx}
                  className="bg-[#141C2B] border border-white/[0.07] rounded-xl overflow-hidden animate-pulse"
                >
                  <div className="aspect-[4/3] bg-[#1B2538]" />
                  <div className="p-5 space-y-3">
                    <div className="h-3 w-1/3 bg-[#1B2538] rounded" />
                    <div className="h-5 w-3/4 bg-[#1B2538] rounded" />
                    <div className="h-3 w-1/2 bg-[#1B2538] rounded" />
                    <div className="pt-3 border-t border-white/[0.06] flex justify-between">
                      <div className="h-6 w-24 bg-[#1B2538] rounded" />
                      <div className="h-6 w-20 bg-[#1B2538] rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : listingsError ? (
            <div
              role="alert"
              className="py-12 px-6 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl max-w-lg mx-auto text-center space-y-3"
            >
              <AlertCircle className="w-6 h-6 text-[#EF4444] mx-auto" />
              <h3 className="text-base font-semibold text-[#F8FAFC]">
                Unable to load rental listings
              </h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                {listingsError}
              </p>
              {onRetryListings && (
                <button
                  type="button"
                  onClick={onRetryListings}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#EF4444] hover:bg-[#DC2626] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Retry
                </button>
              )}
            </div>
          ) : nearbyListings.length === 0 ? (
            <div className="py-14 px-6 bg-[#141C2B] border border-white/[0.07] rounded-xl max-w-xl mx-auto text-center space-y-4">
              <h3 className="text-lg font-semibold text-[#F8FAFC]">
                {nearbySourceFilter === 'community'
                  ? `No user-created community listings in ${
                      selectedCity === 'All' ? 'India' : selectedCity
                    } yet`
                  : `No matching listings found in ${selectedCity}`}
              </h3>
              <p className="text-sm text-[#94A3B8] leading-relaxed">
                {nearbySourceFilter === 'community'
                  ? 'BorrowBox never disguises demo products as real community listings. Be the first neighbor to list an item for rent, or switch to Sample Previews to explore the interface.'
                  : 'Try selecting All Cities or switching the source filter to view available items.'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onNavigate({ page: 'list-item' });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  List Your Item
                </button>
                {nearbySourceFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setNearbySourceFilter('all')}
                    className="px-4 py-2.5 bg-[#1B2538] hover:bg-[#243147] text-[#F8FAFC] border border-white/[0.08] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Show Sample Previews
                  </button>
                )}
                {selectedCity !== 'All' && (
                  <button
                    type="button"
                    onClick={() => onCityChange('All')}
                    className="px-4 py-2.5 bg-[#1B2538] hover:bg-[#243147] text-[#F8FAFC] border border-white/[0.08] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Reset to All Cities
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {nearbyListings.slice(0, 6).map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{
                    duration: 0.52,
                    delay: idx * 0.045,
                    ease: EASE_OUT_CINEMATIC,
                  }}
                >
                  <ProductCard
                    listing={item}
                    onSelect={(itemId) => {
                      onNavigate({ page: 'details', itemId });
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 4. Why Choose BorrowBox & Rent-vs-Buy Calculator Section */}
      <section className="py-20 lg:py-24 border-b border-white/[0.07] bg-[#0F1523]/75">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 space-y-16">
          {/* Why Choose BorrowBox Pillars */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.55, ease: EASE_OUT_CINEMATIC }}
            className="space-y-8"
          >
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8B5CF6] mb-1.5">
                Why Choose BorrowBox
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#F8FAFC] tracking-tight">
                Engineered for High-Trust Neighborhood Sharing
              </h2>
              <p className="text-sm text-[#94A3B8] mt-1.5">
                Instead of spending ₹80,000+ on equipment used twice a year,
                rent locally with auditable handover protection.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-xl bg-[#141C2B] border border-white/[0.07] space-y-3">
                <div className="w-9 h-9 rounded-lg bg-[#1B2538] border border-white/[0.08] flex items-center justify-center text-[#8B5CF6]">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h3 className="text-base font-semibold text-[#F8FAFC]">
                  Save Up to 90% Over Buying New
                </h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Pay only for the days you actually use a camera, console, or
                  tool. Multi-day rentals of 7+ days automatically unlock a 10%
                  weekly discount.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-[#141C2B] border border-white/[0.07] space-y-3">
                <div className="w-9 h-9 rounded-lg bg-[#1B2538] border border-white/[0.08] flex items-center justify-center text-[#06B6D4]">
                  <QrCode className="w-4 h-4" />
                </div>
                <h3 className="text-base font-semibold text-[#F8FAFC]">
                  QR Code & Timestamped Handovers
                </h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Every approved booking generates a unique handover QR code.
                  Both parties log pickup and return condition notes and photos.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-[#141C2B] border border-white/[0.07] space-y-3">
                <div className="w-9 h-9 rounded-lg bg-[#1B2538] border border-white/[0.08] flex items-center justify-center text-[#22C55E]">
                  <Lock className="w-4 h-4" />
                </div>
                <h3 className="text-base font-semibold text-[#F8FAFC]">
                  Protected Security Deposits in ₹
                </h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Clear refundable deposit terms protect item owners while
                  giving borrowers complete visibility into their total upfront
                  amount.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Interactive Rent-vs-Buy Calculator */}
          {selectedCalcListing && rentVsBuyResult && (
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.58, ease: EASE_OUT_CINEMATIC }}
              className="p-6 sm:p-8 border border-white/[0.07] rounded-2xl bg-[#141C2B]"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-6 space-y-4">
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#06B6D4]">
                    <Calculator className="w-4 h-4 text-[#8B5CF6]" />
                    <span>Smart Financial Decision Tool</span>
                  </div>
                  <h2 className="text-2xl font-bold text-[#F8FAFC] tracking-tight">
                    Rent-vs-Buy Savings Calculator
                  </h2>
                  <p className="text-sm text-[#94A3B8] leading-relaxed">
                    Compare the annual cost of renting an item from a neighbor
                    against buying it brand new and absorbing annual maintenance
                    and storage depreciation.
                  </p>

                  <div className="space-y-4 pt-1">
                    <div>
                      <label
                        htmlFor="home-calc-item"
                        className="block text-xs font-medium text-[#94A3B8] mb-1.5"
                      >
                        Select Equipment to Compare
                      </label>
                      <select
                        id="home-calc-item"
                        value={selectedCalcListing.id}
                        onChange={(e) => setCalcItemId(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[#0F1523] border border-white/[0.07] rounded-xl text-sm text-[#F8FAFC] focus:outline-none focus:border-white/[0.2]"
                      >
                        {listings.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.title} ({formatINR(item.dailyPriceINR)}/day vs{' '}
                            {formatINR(
                              item.replacementValueINR ||
                                item.dailyPriceINR * 35
                            )}{' '}
                            retail)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <label
                            htmlFor="home-calc-days"
                            className="text-[#94A3B8]"
                          >
                            Days per rental
                          </label>
                          <span className="font-mono-tabular font-semibold text-[#F8FAFC]">
                            {calcDaysPerTrip} days
                          </span>
                        </div>
                        <input
                          id="home-calc-days"
                          type="range"
                          min={1}
                          max={14}
                          value={calcDaysPerTrip}
                          onChange={(e) =>
                            setCalcDaysPerTrip(Number(e.target.value))
                          }
                          className="w-full accent-[#8B5CF6] cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <label
                            htmlFor="home-calc-trips"
                            className="text-[#94A3B8]"
                          >
                            Uses per year
                          </label>
                          <span className="font-mono-tabular font-semibold text-[#F8FAFC]">
                            {calcTripsPerYear} times/yr
                          </span>
                        </div>
                        <input
                          id="home-calc-trips"
                          type="range"
                          min={1}
                          max={12}
                          value={calcTripsPerYear}
                          onChange={(e) =>
                            setCalcTripsPerYear(Number(e.target.value))
                          }
                          className="w-full accent-[#8B5CF6] cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-6 p-6 bg-[#0F1523] border border-white/[0.07] rounded-xl space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-[#141C2B] border border-white/[0.07]">
                      <p className="text-xs text-[#94A3B8]">
                        Annual Rental Cost ({rentVsBuyResult.plannedDaysPerYear}{' '}
                        days/yr)
                      </p>
                      <p className="text-xl sm:text-2xl font-bold font-mono-tabular text-[#8B5CF6] mt-1">
                        {formatINR(rentVsBuyResult.estimatedRentalCostINR)}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-[#141C2B] border border-white/[0.07]">
                      <p className="text-xs text-[#94A3B8]">
                        Retail Purchase Price
                      </p>
                      <p className="text-xl sm:text-2xl font-bold font-mono-tabular text-[#F8FAFC] mt-1">
                        {formatINR(rentVsBuyResult.retailPriceINR)}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#141C2B] border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold text-[#F8FAFC]">
                        Recommendation:{' '}
                        <span className="uppercase text-[#06B6D4]">
                          {rentVsBuyResult.recommendation === 'rent'
                            ? 'Rent on BorrowBox'
                            : 'Consider Buying'}
                        </span>
                      </p>
                      <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed">
                        {rentVsBuyResult.summary}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate({
                          page: 'details',
                          itemId: selectedCalcListing.id,
                        });
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold rounded-lg bb-glow-button shrink-0 cursor-pointer"
                    >
                      Inspect Item
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Personalized Recommendations */}
          {personalizedRecs.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.55, ease: EASE_OUT_CINEMATIC }}
              className="space-y-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#06B6D4] mb-1">
                    Tailored For Your City & Interests
                  </p>
                  <h3 className="text-xl font-bold text-[#F8FAFC]">
                    Recommended Available Listings
                  </h3>
                </div>
                <span className="text-xs text-[#94A3B8]">
                  Ranked by city match, availability status, and daily value
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {personalizedRecs.map((rec) => (
                  <ProductCard
                    key={rec.id}
                    listing={rec}
                    onSelect={(itemId) => {
                      onNavigate({ page: 'details', itemId });
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* 5. How BorrowBox Works Section */}
      <section
        id="how-it-works"
        className="py-20 lg:py-24 border-b border-white/[0.07] bg-[#090D16]"
      >
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.55, ease: EASE_OUT_CINEMATIC }}
            className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8B5CF6] mb-1.5">
                Simple 3-Step Workflow
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#F8FAFC] tracking-tight">
                How BorrowBox Works
              </h2>
              <p className="text-sm text-[#94A3B8] mt-1 max-w-xl">
                Whether you need equipment for a weekend project or want to earn
                from items sitting on your shelf, every rental follows an
                auditable 3-step workflow.
              </p>
            </div>

            {/* Interactive Segmented Control */}
            <div
              role="tablist"
              aria-label="How It Works Perspective"
              className="inline-flex items-center gap-1 p-1 bg-[#141C2B] border border-white/[0.07] rounded-xl self-start"
            >
              <button
                type="button"
                role="tab"
                aria-selected={howItWorksTab === 'borrower'}
                onClick={() => setHowItWorksTab('borrower')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors duration-200 whitespace-nowrap shrink-0 cursor-pointer ${
                  howItWorksTab === 'borrower'
                    ? 'bg-[#8B5CF6] text-white'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                For Borrowers
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={howItWorksTab === 'owner'}
                onClick={() => setHowItWorksTab('owner')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors duration-200 whitespace-nowrap shrink-0 cursor-pointer ${
                  howItWorksTab === 'owner'
                    ? 'bg-[#8B5CF6] text-white'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                For Item Owners
              </button>
            </div>
          </motion.div>

          {howItWorksTab === 'borrower' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 border border-white/[0.07] rounded-xl bg-[#141C2B] space-y-2.5">
                <p className="text-xs font-mono-tabular font-semibold text-[#8B5CF6]">
                  01. Find Gear Nearby
                </p>
                <h3 className="text-lg font-semibold text-[#F8FAFC]">
                  Search Your Neighborhood
                </h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  Filter by city, locality, and category to compare daily rental
                  prices in ₹, condition notes, included accessories, and
                  refundable deposit terms.
                </p>
              </div>
              <div className="p-6 border border-white/[0.07] rounded-xl bg-[#141C2B] space-y-2.5">
                <p className="text-xs font-mono-tabular font-semibold text-[#06B6D4]">
                  02. Reserve Dates & Verify
                </p>
                <h3 className="text-lg font-semibold text-[#F8FAFC]">
                  Request Dates & Confirm ID
                </h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  Select your pickup and return dates. Review the instant ₹ cost
                  breakdown (including 10% weekly discounts on 7+ day rentals)
                  and submit a rental request.
                </p>
              </div>
              <div className="p-6 border border-white/[0.07] rounded-xl bg-[#141C2B] space-y-2.5">
                <p className="text-xs font-mono-tabular font-semibold text-[#22C55E]">
                  03. Pick Up, Use & Return
                </p>
                <h3 className="text-lg font-semibold text-[#F8FAFC]">
                  Inspect & Get Deposit Back
                </h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  Meet at the agreed neighborhood landmark, verify the item
                  condition with your QR handover code, and receive your
                  security deposit back upon safe return.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 border border-white/[0.07] rounded-xl bg-[#141C2B] space-y-2.5">
                <p className="text-xs font-mono-tabular font-semibold text-[#8B5CF6]">
                  01. List for Free
                </p>
                <h3 className="text-lg font-semibold text-[#F8FAFC]">
                  Set Your Daily Rate & Deposit
                </h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  Add your camera, console, drill, or musical instrument. You
                  choose the daily rental price in ₹, refundable security
                  deposit, minimum rental days, and usage rules.
                </p>
              </div>
              <div className="p-6 border border-white/[0.07] rounded-xl bg-[#141C2B] space-y-2.5">
                <p className="text-xs font-mono-tabular font-semibold text-[#06B6D4]">
                  02. Review Rental Requests
                </p>
                <h3 className="text-lg font-semibold text-[#F8FAFC]">
                  Full Control Over Every Booking
                </h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  Review borrower details, requested dates, and intended use
                  before approving. Coordinate a convenient pickup time in your
                  locality via private booking chat.
                </p>
              </div>
              <div className="p-6 border border-white/[0.07] rounded-xl bg-[#141C2B] space-y-2.5">
                <p className="text-xs font-mono-tabular font-semibold text-[#22C55E]">
                  03. Earn From Unused Gear
                </p>
                <h3 className="text-lg font-semibold text-[#F8FAFC]">
                  Turn Idle Belongings Into Income
                </h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  Keep your equipment productive instead of collecting dust by
                  renting to neighbors with clear deposit terms and handover
                  checklists.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 6. Trust and Safety + Verified Review Architecture */}
      <section className="py-20 lg:py-24 border-b border-white/[0.07] bg-[#0F1523]/70">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 space-y-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.55, ease: EASE_OUT_CINEMATIC }}
            className="max-w-2xl"
          >
            <div className="flex items-center gap-2 text-[#06B6D4] text-xs font-semibold uppercase tracking-[0.12em] mb-2">
              <ShieldCheck className="w-4 h-4 text-[#8B5CF6]" />
              <span>Neighborhood Trust & Safety</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#F8FAFC] tracking-tight">
              Clear Rules for Peer-to-Peer Handovers
            </h2>
            <p className="text-sm text-[#94A3B8] mt-2 leading-relaxed">
              Sharing high-value equipment requires honest verification status,
              clear deposit terms, and structured handover checklists.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 border border-white/[0.07] bg-[#141C2B] rounded-xl space-y-2">
              <CheckCircle2 className="w-4 h-4 text-[#8B5CF6]" />
              <h3 className="text-sm font-semibold text-[#F8FAFC]">
                In-Person ID Check at Handover
              </h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Owners and borrowers inspect original Government photo ID in
                person during pickup alongside the booking QR verification code.
              </p>
            </div>
            <div className="p-5 border border-white/[0.07] bg-[#141C2B] rounded-xl space-y-2">
              <CheckCircle2 className="w-4 h-4 text-[#06B6D4]" />
              <h3 className="text-sm font-semibold text-[#F8FAFC]">
                Refundable Security Deposits
              </h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Each listing specifies an upfront refundable deposit in ₹ to
                protect against accidental damage or missing accessories.
              </p>
            </div>
            <div className="p-5 border border-white/[0.07] bg-[#141C2B] rounded-xl space-y-2">
              <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
              <h3 className="text-sm font-semibold text-[#F8FAFC]">
                Accessory & Condition Checklist
              </h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Every product page lists exact included items and condition
                notes so both parties can test the device at pickup and return.
              </p>
            </div>
            <div className="p-5 border border-white/[0.07] bg-[#141C2B] rounded-xl space-y-2">
              <CheckCircle2 className="w-4 h-4 text-[#8B5CF6]" />
              <h3 className="text-sm font-semibold text-[#F8FAFC]">
                100% Verified Rental Reviews
              </h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                BorrowBox never displays fabricated testimonials. Reviews are
                cryptographically restricted by Firestore rules to completed
                bookings.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Final Call-to-Action Section */}
      <section className="py-20 lg:py-26 bg-[#090D16]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.58, ease: EASE_OUT_CINEMATIC }}
            className="relative overflow-hidden rounded-2xl bg-[#141C2B] border border-white/[0.07] p-8 sm:p-12 lg:p-16 text-center space-y-6"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[480px] h-[220px] bg-[#8B5CF6]/12 blur-[100px]"
            />
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#06B6D4] relative z-10">
              Start Sharing Across India Today
            </p>
            <h2
              className="text-2xl sm:text-4xl font-extrabold text-[#F8FAFC] tracking-tight max-w-2xl mx-auto relative z-10"
              style={{ textWrap: 'balance' }}
            >
              Ready to Borrow Gear for Your Next Project or Earn From Unused
              Items?
            </h2>
            <p className="text-sm sm:text-base text-[#94A3B8] max-w-xl mx-auto relative z-10">
              Join BorrowBox to explore neighborhood rentals with transparent ₹
              daily pricing, or publish your first item in under two minutes.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2 relative z-10">
              <button
                type="button"
                onClick={() => {
                  onNavigate({ page: 'browse' });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-6 py-3.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-sm font-semibold rounded-xl bb-glow-button cursor-pointer"
              >
                Explore Items
              </button>
              <button
                type="button"
                onClick={() => {
                  onNavigate({ page: 'list-item' });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-6 py-3.5 bg-[#1B2538] hover:bg-[#243147] text-[#F8FAFC] border border-white/[0.09] text-sm font-semibold rounded-xl transition-colors duration-200 cursor-pointer"
              >
                List Your Item
              </button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};
