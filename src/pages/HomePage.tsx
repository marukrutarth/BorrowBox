import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Calculator,
  Camera,
  Compass,
  Cpu,
  Gamepad2,
  GraduationCap,
  Info,
  Loader2,
  MapPin,
  Music,
  PlusCircle,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react';
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
  Photography: <Camera className="w-5 h-5 text-indigo-600" />,
  Gaming: <Gamepad2 className="w-5 h-5 text-indigo-600" />,
  Electronics: <Cpu className="w-5 h-5 text-indigo-600" />,
  Tools: <Wrench className="w-5 h-5 text-indigo-600" />,
  Outdoor: <Compass className="w-5 h-5 text-indigo-600" />,
  'Musical Instruments': <Music className="w-5 h-5 text-indigo-600" />,
  Events: <Sparkles className="w-5 h-5 text-indigo-600" />,
  Education: <GraduationCap className="w-5 h-5 text-indigo-600" />,
};

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
  const [nearbySourceFilter, setNearbySourceFilter] =
    useState<ListingSourceFilter>('all');
  const [howItWorksTab, setHowItWorksTab] = useState<'borrower' | 'owner'>(
    'borrower'
  );

  // Interactive Rent-vs-Buy Calculator state on Homepage
  const [calcItemId, setCalcItemId] = useState<string>(
    listings[0]?.id || 'bb-cam-01'
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

  const heroShowcaseListing = useMemo(() => {
    const cityMatches = filterAndSortListings(listings, {
      city: selectedCity,
      sortBy: 'featured',
    });
    return cityMatches[0] || listings[0];
  }, [listings, selectedCity]);

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
    <div className="bg-white">
      {/* 1. Hero Section */}
      <section className="border-b border-slate-200 bg-gradient-to-b from-slate-50/70 to-white pt-10 pb-14 lg:pt-16 lg:pb-20">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center mb-10">
            <div className="lg:col-span-7 transition-opacity duration-200">
              <p className="text-sm font-semibold text-indigo-600 tracking-tight mb-3">
                Rent What You Need. Earn From What You Own.
              </p>
              <h1
                className="text-4xl sm:text-5xl lg:text-[3.25rem] font-bold text-slate-900 tracking-tight leading-[1.12] mb-5"
                style={{ textWrap: 'balance' }}
              >
                Why Buy It When You Can Borrow It?
              </h1>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mb-8">
                Borrow cameras, gaming consoles, power tools, trekking gear, and
                projectors from neighbors across Indian cities — or list your
                unused belongings and earn extra income in Indian Rupees (₹).
              </p>

              {/* Two Prominent CTAs required by Phase 1: Rent an Item & List Your Item */}
              <div className="flex flex-wrap items-center gap-3.5">
                <button
                  type="button"
                  onClick={() => {
                    onNavigate({
                      page: 'browse',
                      city: selectedCity !== 'All' ? selectedCity : undefined,
                    });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Rent an Item
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate({ page: 'list-item' });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-6 py-3 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  List Your Item
                </button>
                <span className="text-xs text-slate-500 pl-1">
                  Bengaluru · Mumbai · Delhi NCR · Hyderabad · Pune · Chennai
                </span>
              </div>
            </div>

            {/* Right Column: Showcase Card with Explicit Sample Preview Attribution */}
            {heroShowcaseListing && (
              <div className="lg:col-span-5 space-y-2 transition-opacity duration-200">
                <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                  <span className="font-medium text-slate-700">
                    {heroShowcaseListing.isDemoData
                      ? 'Sample Catalog Preview (Demonstration Only)'
                      : 'Community Listing Spotlight'}
                  </span>
                  <span>Click to inspect ₹ quote</span>
                </div>
                <ProductCard
                  listing={heroShowcaseListing}
                  onSelect={(itemId) => {
                    onNavigate({ page: 'details', itemId });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              </div>
            )}
          </div>

          {/* Location-Aware Search Bar */}
          <form
            onSubmit={handleHeroSearch}
            aria-label="Search rental items"
            className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs"
          >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              <div className="md:col-span-4">
                <label
                  htmlFor="hero-search-product"
                  className="block text-xs font-medium text-slate-600 mb-1"
                >
                  Product Name
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="hero-search-product"
                    type="text"
                    value={heroSearchQuery}
                    onChange={(e) => setHeroSearchQuery(e.target.value)}
                    placeholder="Try Sony A7 IV, PS5, Drill, Tent..."
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50/70 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="md:col-span-3">
                <label
                  htmlFor="hero-search-location"
                  className="block text-xs font-medium text-slate-600 mb-1"
                >
                  Location
                </label>
                <select
                  id="hero-search-location"
                  value={selectedCity}
                  onChange={(e) =>
                    onCityChange(e.target.value as IndianCity | 'All')
                  }
                  className="w-full px-3 py-2.5 bg-slate-50/70 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600"
                >
                  <option value="All">All Indian Cities</option>
                  {ALL_CITIES.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3">
                <label
                  htmlFor="hero-search-category"
                  className="block text-xs font-medium text-slate-600 mb-1"
                >
                  Category
                </label>
                <select
                  id="hero-search-category"
                  value={heroCategory}
                  onChange={(e) =>
                    setHeroCategory(e.target.value as CategoryName | 'All')
                  }
                  className="w-full px-3 py-2.5 bg-slate-50/70 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600"
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
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Search
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>

      {/* 2. Popular Categories Section */}
      <section className="py-16 lg:py-20 border-b border-slate-200 bg-white">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Popular Categories
              </h2>
              <p className="text-sm text-slate-600 mt-1">
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
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 whitespace-nowrap shrink-0 self-start sm:self-auto cursor-pointer"
            >
              Browse Full Catalog →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CATEGORY_DIRECTORY.map((cat) => {
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
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => {
                    onNavigate({
                      page: 'browse',
                      category: cat.name,
                      city: selectedCity !== 'All' ? selectedCity : undefined,
                    });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="group text-left p-5 bg-white border border-slate-200 rounded-xl hover:border-indigo-600 transition-colors flex flex-col justify-between gap-4 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {cat.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {cat.summary}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 shrink-0">
                      {CATEGORY_ICONS[cat.name]}
                    </div>
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="tabular-nums">{countLabel}</span>
                    <span className="font-mono-tabular font-medium text-slate-800">
                      From {formatINR(cat.startingPriceINR)}/day
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. Nearby Rental Listings Section (with Location Filter, Honest Source Separation, Loading/Empty/Error States) */}
      <section className="py-16 lg:py-20 border-b border-slate-200 bg-slate-50/60">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 mb-1.5">
                <MapPin className="w-3.5 h-3.5" />
                <span>
                  {selectedCity === 'All'
                    ? 'All Supported Cities in India'
                    : `Nearby in ${selectedCity}`}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Nearby Rental Listings
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Compare daily rental rates, refundable security deposits,
                approximate locations, and availability windows.
              </p>
            </div>

            {/* Source Filter Segmented Control: Separate Community Listings vs Sample Previews */}
            <div
              role="group"
              aria-label="Filter listings by source"
              className="inline-flex flex-wrap items-center gap-1 p-1 bg-white border border-slate-200 rounded-lg self-start"
            >
              <button
                type="button"
                onClick={() => setNearbySourceFilter('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  nearbySourceFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Views ({nearbyCounts.total})
              </button>
              <button
                type="button"
                onClick={() => setNearbySourceFilter('community')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  nearbySourceFilter === 'community'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Community Listings ({nearbyCounts.community})
              </button>
              <button
                type="button"
                onClick={() => setNearbySourceFilter('sample')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  nearbySourceFilter === 'sample'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sample Previews ({nearbyCounts.sample})
              </button>
            </div>
          </div>

          {/* Quick City Filter Bar */}
          <div
            role="group"
            aria-label="Select nearby city"
            className="flex items-center gap-1.5 flex-wrap"
          >
            <button
              type="button"
              onClick={() => onCityChange('All')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                selectedCity === 'All'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              All Cities
            </button>
            {ALL_CITIES.map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => onCityChange(city)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  selectedCity === city
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {city}
              </button>
            ))}
          </div>

          {/* Honest Catalog Transparency Banner when Sample Previews are shown */}
          {nearbySourceFilter !== 'community' && nearbyCounts.sample > 0 && (
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-start gap-2.5 text-xs text-slate-600">
              <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900">
                  Catalog Transparency:
                </strong>{' '}
                Items labeled{' '}
                <span className="font-medium text-slate-800">
                  Sample Preview (Unverified Demo)
                </span>{' '}
                are UI demonstration listings and not active neighborhood offers.
                Switch to{' '}
                <button
                  type="button"
                  onClick={() => setNearbySourceFilter('community')}
                  className="text-indigo-600 font-semibold underline hover:text-indigo-700 cursor-pointer"
                >
                  View Community Listings Only
                </button>{' '}
                to view only user-created listings.
              </div>
            </div>
          )}

          {/* Loading, Error, Empty, or Listings Grid State */}
          {isLoadingListings ? (
            <div
              role="status"
              aria-live="polite"
              className="py-16 px-4 bg-white border border-slate-200 rounded-xl flex flex-col items-center justify-center gap-3 text-slate-600"
            >
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <p className="text-sm font-medium">
                Loading nearby rental listings...
              </p>
            </div>
          ) : listingsError ? (
            <div
              role="alert"
              className="py-12 px-6 bg-red-50 border border-red-200 rounded-xl max-w-lg mx-auto text-center space-y-3"
            >
              <AlertCircle className="w-6 h-6 text-red-600 mx-auto" />
              <h3 className="text-base font-semibold text-red-900">
                Unable to load rental listings
              </h3>
              <p className="text-xs text-red-700 leading-relaxed">
                {listingsError}
              </p>
              {onRetryListings && (
                <button
                  type="button"
                  onClick={onRetryListings}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Retry
                </button>
              )}
            </div>
          ) : nearbyListings.length === 0 ? (
            <div className="py-14 px-6 bg-white border border-slate-200 rounded-xl max-w-xl mx-auto text-center space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">
                {nearbySourceFilter === 'community'
                  ? `No user-created community listings in ${
                      selectedCity === 'All' ? 'India' : selectedCity
                    } yet`
                  : `No matching listings found in ${selectedCity}`}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
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
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  List Your Item
                </button>
                {nearbySourceFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setNearbySourceFilter('all')}
                    className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Show Sample Previews
                  </button>
                )}
                {selectedCity !== 'All' && (
                  <button
                    type="button"
                    onClick={() => onCityChange('All')}
                    className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Reset to All Cities
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {nearbyListings.slice(0, 6).map((item) => (
                <ProductCard
                  key={item.id}
                  listing={item}
                  onSelect={(itemId) => {
                    onNavigate({ page: 'details', itemId });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 3.5 Phase 4: Rent-vs-Buy Calculator & Personalized Recommendations */}
      <section className="py-16 lg:py-20 border-b border-slate-200 bg-white">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 space-y-12">
          {/* Interactive Rent-vs-Buy Calculator */}
          {selectedCalcListing && rentVsBuyResult && (
            <div className="p-6 sm:p-8 border border-slate-200 rounded-xl bg-slate-50/60">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-6 space-y-4">
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600">
                    <Calculator className="w-4 h-4" />
                    <span>Smart Financial Decision Tool</span>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                    Rent-vs-Buy Savings Calculator
                  </h2>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Compare the annual cost of renting an item from a neighbor
                    against buying it brand new and absorbing annual maintenance
                    and storage depreciation.
                  </p>

                  <div className="space-y-3 pt-1">
                    <div>
                      <label
                        htmlFor="home-calc-item"
                        className="block text-xs font-medium text-slate-700 mb-1"
                      >
                        Select Equipment to Compare
                      </label>
                      <select
                        id="home-calc-item"
                        value={selectedCalcListing.id}
                        onChange={(e) => setCalcItemId(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-600"
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
                        <div className="flex justify-between text-xs mb-1">
                          <label
                            htmlFor="home-calc-days"
                            className="text-slate-600"
                          >
                            Days per rental
                          </label>
                          <span className="font-mono-tabular font-semibold text-slate-900">
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
                          className="w-full accent-indigo-600"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <label
                            htmlFor="home-calc-trips"
                            className="text-slate-600"
                          >
                            Uses per year
                          </label>
                          <span className="font-mono-tabular font-semibold text-slate-900">
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
                          className="w-full accent-indigo-600"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-6 p-6 bg-white border border-slate-200 rounded-xl space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                      <p className="text-xs text-slate-500">
                        Annual Rental Cost ({rentVsBuyResult.plannedDaysPerYear}{' '}
                        days/yr)
                      </p>
                      <p className="text-xl font-bold font-mono-tabular text-indigo-600 mt-1">
                        {formatINR(rentVsBuyResult.estimatedRentalCostINR)}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                      <p className="text-xs text-slate-500">
                        Retail Purchase Price
                      </p>
                      <p className="text-xl font-bold font-mono-tabular text-slate-900 mt-1">
                        {formatINR(rentVsBuyResult.retailPriceINR)}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-indigo-50/70 border border-indigo-100 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold text-indigo-950">
                        Recommendation:{' '}
                        <span className="uppercase text-indigo-700">
                          {rentVsBuyResult.recommendation === 'rent'
                            ? 'Rent on BorrowBox'
                            : 'Consider Buying'}
                        </span>
                      </p>
                      <p className="text-xs text-indigo-900 mt-1 leading-relaxed">
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
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shrink-0 cursor-pointer"
                    >
                      Inspect Item
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Personalized Recommendations Based on Available Listings */}
          {personalizedRecs.length > 0 && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-indigo-600 mb-1">
                    Tailored For Your City & Interests
                  </p>
                  <h3 className="text-xl font-bold text-slate-900">
                    Recommended Available Listings
                  </h3>
                </div>
                <span className="text-xs text-slate-500">
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
            </div>
          )}
        </div>
      </section>

      {/* 4. How It Works Section */}
      <section
        id="how-it-works"
        className="py-16 lg:py-20 border-b border-slate-200 bg-white"
      >
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                How BorrowBox Works
              </h2>
              <p className="text-sm text-slate-600 mt-1 max-w-xl">
                Whether you need equipment for a weekend project or want to earn
                from items sitting on your shelf, every rental follows a clear
                3-step workflow.
              </p>
            </div>

            {/* Interactive Segmented Control */}
            <div
              role="tablist"
              aria-label="How It Works Perspective"
              className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start"
            >
              <button
                type="button"
                role="tab"
                aria-selected={howItWorksTab === 'borrower'}
                onClick={() => setHowItWorksTab('borrower')}
                className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  howItWorksTab === 'borrower'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                For Borrowers
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={howItWorksTab === 'owner'}
                onClick={() => setHowItWorksTab('owner')}
                className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  howItWorksTab === 'owner'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                For Item Owners
              </button>
            </div>
          </div>

          {howItWorksTab === 'borrower' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-6 border border-slate-200 rounded-xl bg-white">
                <p className="text-xs font-mono-tabular font-semibold text-indigo-600 mb-2">
                  01. Find Gear Nearby
                </p>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Search Your Neighborhood
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Filter by city, locality, and category to compare daily rental
                  prices in ₹, condition notes, included accessories, and
                  refundable deposit terms.
                </p>
              </div>
              <div className="p-6 border border-slate-200 rounded-xl bg-white">
                <p className="text-xs font-mono-tabular font-semibold text-indigo-600 mb-2">
                  02. Reserve Dates & Verify
                </p>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Request Dates & Confirm ID
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Select your pickup and return dates. Review the instant ₹ cost
                  breakdown (including 10% weekly discounts on 7+ day rentals)
                  and submit a rental request.
                </p>
              </div>
              <div className="p-6 border border-slate-200 rounded-xl bg-white">
                <p className="text-xs font-mono-tabular font-semibold text-indigo-600 mb-2">
                  03. Pick Up, Use & Return
                </p>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Inspect & Get Deposit Back
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Meet at the agreed neighborhood landmark, verify the item
                  condition together, use the gear, and receive your refundable
                  security deposit back upon safe return.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-6 border border-slate-200 rounded-xl bg-white">
                <p className="text-xs font-mono-tabular font-semibold text-indigo-600 mb-2">
                  01. List for Free
                </p>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Set Your Daily Rate & Deposit
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Add your camera, console, drill, or musical instrument. You
                  choose the daily rental price in ₹, refundable security
                  deposit, minimum rental days, and usage rules.
                </p>
              </div>
              <div className="p-6 border border-slate-200 rounded-xl bg-white">
                <p className="text-xs font-mono-tabular font-semibold text-indigo-600 mb-2">
                  02. Review Rental Requests
                </p>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Full Control Over Every Booking
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Review borrower details, requested dates, and intended use
                  before approving. Coordinate a convenient pickup time in your
                  locality.
                </p>
              </div>
              <div className="p-6 border border-slate-200 rounded-xl bg-white">
                <p className="text-xs font-mono-tabular font-semibold text-indigo-600 mb-2">
                  03. Earn From Unused Gear
                </p>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Turn Idle Belongings Into Income
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Keep your equipment productive instead of collecting dust by
                  renting to neighbors with clear deposit terms and handover
                  checklists.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 5. Trust and Safety Section */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mb-12">
            <div className="flex items-center gap-2 text-indigo-600 text-xs font-semibold mb-2">
              <ShieldCheck className="w-4 h-4" />
              <span>Neighborhood Trust & Transparency</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Clear Rules for Peer-to-Peer Handovers
            </h2>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              Sharing high-value equipment requires honest verification status,
              clear deposit terms, and structured handover checklists.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 border border-slate-200 rounded-xl">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">
                In-Person ID Check at Handover
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Owners and borrowers inspect original Government photo ID in
                person during pickup. Online KYC document verification is not
                yet enabled.
              </p>
            </div>
            <div className="p-5 border border-slate-200 rounded-xl">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">
                Refundable Security Deposits
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Each listing specifies an upfront refundable deposit in ₹ to
                protect against accidental damage or missing accessories.
              </p>
            </div>
            <div className="p-5 border border-slate-200 rounded-xl">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">
                Accessory & Condition Checklist
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Every product page lists exact included items and condition
                notes so both parties can test the device at pickup and return.
              </p>
            </div>
            <div className="p-5 border border-slate-200 rounded-xl">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">
                Transparent ₹ Pricing
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                See daily rates, multi-day 10% discounts, and refundable deposit
                amounts upfront before submitting a rental request.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
