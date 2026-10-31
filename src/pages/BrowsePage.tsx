import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Info,
  Loader2,
  PlusCircle,
  RotateCcw,
  Search,
  Sparkles,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  CategoryName,
  IndianCity,
  ItemCondition,
  ListingSourceFilter,
  ProductListing,
  SortOption,
} from '../types/marketplace';
import {
  ALL_CATEGORIES,
  ALL_CITIES,
  filterAndSortListings,
  formatINR,
} from '../utils/rentalLogic';
import { ProductCard } from '../components/ProductCard';
import { PageRoute } from '../components/Navbar';

interface BrowsePageProps {
  listings: ProductListing[];
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  selectedCategory: CategoryName | 'All';
  onCategoryChange: (cat: CategoryName | 'All') => void;
  selectedCity: IndianCity | 'All';
  onCityChange: (city: IndianCity | 'All') => void;
  selectedCondition: ItemCondition | 'All';
  onConditionChange: (cond: ItemCondition | 'All') => void;
  sortBy: SortOption;
  onSortByChange: (sort: SortOption) => void;
  onResetFilters: () => void;
  onNavigate: (route: PageRoute) => void;
  isLoading?: boolean;
  error?: string | null;
}

export const BrowsePage: React.FC<BrowsePageProps> = ({
  listings,
  searchQuery,
  onSearchQueryChange,
  selectedCategory,
  onCategoryChange,
  selectedCity,
  onCityChange,
  selectedCondition,
  onConditionChange,
  sortBy,
  onSortByChange,
  onResetFilters,
  onNavigate,
  isLoading = false,
  error = null,
}) => {
  const [sourceFilter, setSourceFilter] = useState<ListingSourceFilter>('all');
  const [neighborhoodFilter, setNeighborhoodFilter] = useState('');
  const [maxDailyPriceINR, setMaxDailyPriceINR] = useState<number>(0);
  const [availableStart, setAvailableStart] = useState('');
  const [availableEnd, setAvailableEnd] = useState('');

  // Phase 4 Natural-Language Search state
  const [nlPrompt, setNlPrompt] = useState('');
  const [isParsingNl, setIsParsingNl] = useState(false);
  const [nlExplanation, setNlExplanation] = useState<string | null>(null);

  const filteredListings = useMemo(() => {
    return filterAndSortListings(listings, {
      query: searchQuery,
      category: selectedCategory,
      city: selectedCity,
      neighborhood: neighborhoodFilter,
      condition: selectedCondition,
      sortBy,
      maxDailyPriceINR: maxDailyPriceINR > 0 ? maxDailyPriceINR : undefined,
      availableStart: availableStart || undefined,
      availableEnd: availableEnd || undefined,
      sourceFilter,
    });
  }, [
    listings,
    searchQuery,
    selectedCategory,
    selectedCity,
    neighborhoodFilter,
    selectedCondition,
    sortBy,
    maxDailyPriceINR,
    availableStart,
    availableEnd,
    sourceFilter,
  ]);

  const counts = useMemo(() => {
    const active = listings.filter((l) => l.status !== 'archived');
    const community = active.filter((l) => !l.isDemoData).length;
    const sample = active.filter((l) => l.isDemoData).length;
    return { community, sample, total: active.length };
  }, [listings]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedCategory !== 'All' ||
    selectedCity !== 'All' ||
    neighborhoodFilter.trim().length > 0 ||
    selectedCondition !== 'All' ||
    maxDailyPriceINR > 0 ||
    Boolean(availableStart) ||
    Boolean(availableEnd) ||
    sortBy !== 'featured' ||
    sourceFilter !== 'all';

  const handleFullReset = () => {
    setSourceFilter('all');
    setNeighborhoodFilter('');
    setMaxDailyPriceINR(0);
    setAvailableStart('');
    setAvailableEnd('');
    setNlPrompt('');
    setNlExplanation(null);
    onResetFilters();
  };

  const handleNaturalLanguageSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nlPrompt.trim()) return;
    setIsParsingNl(true);
    setNlExplanation(null);
    try {
      const res = await fetch('/api/ai/nl-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: nlPrompt.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        onSearchQueryChange(data.query || '');
        if (
          data.category &&
          (data.category === 'All' ||
            ALL_CATEGORIES.includes(data.category as CategoryName))
        ) {
          onCategoryChange(data.category as CategoryName | 'All');
        }
        if (
          data.city &&
          (data.city === 'All' || ALL_CITIES.includes(data.city as IndianCity))
        ) {
          onCityChange(data.city as IndianCity | 'All');
        }
        if (
          typeof data.maxDailyPriceINR === 'number' &&
          data.maxDailyPriceINR > 0
        ) {
          setMaxDailyPriceINR(data.maxDailyPriceINR);
        } else {
          setMaxDailyPriceINR(0);
        }
        setNlExplanation(
          data.explanation || 'Applied smart filters from your request.'
        );
      }
    } catch {
      setNlExplanation('Applied local keyword filter.');
      onSearchQueryChange(nlPrompt.trim());
    } finally {
      setIsParsingNl(false);
    }
  };

  return (
    <div className="bg-transparent min-h-screen py-10 lg:py-12 text-[#F8FAFC]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-8 border-b border-white/[0.08]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#8B5CF6] mb-1">
              Marketplace Directory
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#F8FAFC] tracking-tight">
              Browse Rental Items
            </h1>
            <p className="text-sm text-[#94A3B8] mt-1">
              Compare rental prices, security deposits, approximate locations,
              and availability across Indian cities (₹).
            </p>
          </div>

          {/* Source Filter Segmented Control */}
          <div
            role="group"
            aria-label="Filter by listing source"
            className="inline-flex flex-wrap items-center gap-1 p-1 bg-[#161E2E] border border-white/[0.08] rounded-xl self-start"
          >
            <button
              type="button"
              onClick={() => setSourceFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                sourceFilter === 'all'
                  ? 'bg-[#8B5CF6] text-white'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              All ({counts.total})
            </button>
            <button
              type="button"
              onClick={() => setSourceFilter('community')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                sourceFilter === 'community'
                  ? 'bg-[#8B5CF6] text-white'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              Community Listings ({counts.community})
            </button>
            <button
              type="button"
              onClick={() => setSourceFilter('sample')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                sourceFilter === 'sample'
                  ? 'bg-[#8B5CF6] text-white'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              Sample Previews ({counts.sample})
            </button>
          </div>
        </div>

        {/* Phase 4 Natural-Language Search Bar */}
        <form
          onSubmit={(e) => void handleNaturalLanguageSearch(e)}
          className="mt-6 p-4 rounded-xl bg-[#161E2E] border border-white/[0.08] space-y-2"
        >
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Sparkles className="w-4 h-4 text-[#8B5CF6] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                aria-label="Natural language rental search"
                value={nlPrompt}
                onChange={(e) => setNlPrompt(e.target.value)}
                placeholder='Ask in plain English: e.g., "Camera in Bengaluru under ₹2000" or "Tools in Mumbai"'
                className="w-full pl-10 pr-4 py-2.5 bg-[#111827] border border-white/[0.08] rounded-xl text-xs sm:text-sm text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
            <button
              type="submit"
              disabled={isParsingNl}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold rounded-xl transition-all bb-glow-button shrink-0 cursor-pointer"
            >
              {isParsingNl ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              AI Smart Filter
            </button>
          </div>
          {nlExplanation && (
            <p className="text-xs text-[#06B6D4] font-medium pl-1">
              {nlExplanation}
            </p>
          )}
        </form>

        {/* Search, City, Condition, Price Sort & Advanced Date/Price Filters */}
        <div className="py-6 space-y-4 border-b border-white/[0.08]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
            {/* Search Input */}
            <div className="sm:col-span-2 lg:col-span-4">
              <label htmlFor="browse-search-input" className="sr-only">
                Search items by name, brand, or locality
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="browse-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchQueryChange(e.target.value)}
                  placeholder="Keyword, brand, or model..."
                  className="w-full pl-10 pr-4 py-2.5 bg-[#161E2E] border border-white/[0.08] rounded-xl text-sm text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>
            </div>

            {/* City Filter */}
            <div className="lg:col-span-2">
              <label htmlFor="browse-city-select" className="sr-only">
                Filter by City
              </label>
              <select
                id="browse-city-select"
                aria-label="Filter by City"
                value={selectedCity}
                onChange={(e) =>
                  onCityChange(e.target.value as IndianCity | 'All')
                }
                className="w-full px-3 py-2.5 bg-[#161E2E] border border-white/[0.08] rounded-xl text-sm text-[#F8FAFC] focus:outline-none focus:border-[#8B5CF6]"
              >
                <option value="All">All Cities</option>
                {ALL_CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            {/* Neighborhood Filter */}
            <div className="lg:col-span-2">
              <label htmlFor="browse-neighborhood-input" className="sr-only">
                Filter by Neighborhood
              </label>
              <input
                id="browse-neighborhood-input"
                type="text"
                value={neighborhoodFilter}
                onChange={(e) => setNeighborhoodFilter(e.target.value)}
                placeholder="Locality (e.g., Indiranagar)"
                className="w-full px-3 py-2.5 bg-[#161E2E] border border-white/[0.08] rounded-xl text-sm text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>

            {/* Condition Filter */}
            <div className="lg:col-span-2">
              <label htmlFor="browse-condition-select" className="sr-only">
                Filter by Condition
              </label>
              <select
                id="browse-condition-select"
                aria-label="Filter by Condition"
                value={selectedCondition}
                onChange={(e) =>
                  onConditionChange(e.target.value as ItemCondition | 'All')
                }
                className="w-full px-3 py-2.5 bg-[#161E2E] border border-white/[0.08] rounded-xl text-sm text-[#F8FAFC] focus:outline-none focus:border-[#8B5CF6]"
              >
                <option value="All">All Conditions</option>
                <option value="Like New">Like New</option>
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
              </select>
            </div>

            {/* Price Sorting */}
            <div className="lg:col-span-2">
              <label htmlFor="browse-sort-select" className="sr-only">
                Sort by Price
              </label>
              <select
                id="browse-sort-select"
                aria-label="Sort by Price"
                value={sortBy}
                onChange={(e) => onSortByChange(e.target.value as SortOption)}
                className="w-full px-3 py-2.5 bg-[#161E2E] border border-white/[0.08] rounded-xl text-sm text-[#F8FAFC] focus:outline-none focus:border-[#8B5CF6]"
              >
                <option value="featured">Sort: Featured</option>
                <option value="price-asc">Price: Low to High (₹)</option>
                <option value="price-desc">Price: High to Low (₹)</option>
                <option value="deposit-asc">Deposit: Low to High (₹)</option>
              </select>
            </div>
          </div>

          {/* Secondary Row: Max Daily Price & Date Availability Range */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="flex items-center gap-2 bg-[#161E2E] border border-white/[0.08] rounded-xl px-3.5 py-2">
              <label
                htmlFor="browse-max-price"
                className="text-xs font-medium text-[#94A3B8] shrink-0"
              >
                Max Daily Rate:
              </label>
              <select
                id="browse-max-price"
                value={maxDailyPriceINR}
                onChange={(e) => setMaxDailyPriceINR(Number(e.target.value))}
                className="w-full bg-transparent text-xs font-mono-tabular font-semibold text-[#F8FAFC] focus:outline-none"
              >
                <option value={0} className="bg-[#111827]">
                  Any Daily Rate (₹)
                </option>
                <option value={500} className="bg-[#111827]">
                  Up to {formatINR(500)}/day
                </option>
                <option value={1000} className="bg-[#111827]">
                  Up to {formatINR(1000)}/day
                </option>
                <option value={1500} className="bg-[#111827]">
                  Up to {formatINR(1500)}/day
                </option>
                <option value={2500} className="bg-[#111827]">
                  Up to {formatINR(2500)}/day
                </option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-[#161E2E] border border-white/[0.08] rounded-xl px-3.5 py-2">
              <label
                htmlFor="browse-avail-start"
                className="text-xs font-medium text-[#94A3B8] shrink-0"
              >
                Pickup From:
              </label>
              <input
                id="browse-avail-start"
                type="date"
                value={availableStart}
                onChange={(e) => setAvailableStart(e.target.value)}
                className="w-full bg-transparent text-xs font-mono-tabular text-[#F8FAFC] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 bg-[#161E2E] border border-white/[0.08] rounded-xl px-3.5 py-2">
              <label
                htmlFor="browse-avail-end"
                className="text-xs font-medium text-[#94A3B8] shrink-0"
              >
                Return By:
              </label>
              <input
                id="browse-avail-end"
                type="date"
                value={availableEnd}
                min={availableStart}
                onChange={(e) => setAvailableEnd(e.target.value)}
                className="w-full bg-transparent text-xs font-mono-tabular text-[#F8FAFC] focus:outline-none"
              />
            </div>
          </div>

          {/* Interactive Category Filter Bar */}
          <div className="flex items-center justify-between gap-4 flex-wrap pt-1">
            <div
              role="group"
              aria-label="Filter by Category"
              className="flex items-center gap-1.5 flex-wrap"
            >
              <button
                type="button"
                onClick={() => onCategoryChange('All')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedCategory === 'All'
                    ? 'bg-[#8B5CF6] text-white'
                    : 'bg-[#161E2E] border border-white/[0.08] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1D293B]'
                }`}
              >
                All Categories
              </button>
              {ALL_CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => onCategoryChange(category)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedCategory === category
                      ? 'bg-[#8B5CF6] text-white'
                      : 'bg-[#161E2E] border border-white/[0.08] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1D293B]'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <span className="text-xs text-[#94A3B8] tabular-nums">
                Showing{' '}
                <strong className="text-[#F8FAFC]">
                  {filteredListings.length}
                </strong>{' '}
                of {counts.total} items
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleFullReset}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8B5CF6] hover:text-[#A78BFA] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sample Catalog Notice */}
        {sourceFilter !== 'community' && counts.sample > 0 && (
          <div className="mt-6 p-3.5 rounded-xl bg-[#161E2E] border border-white/[0.08] flex items-start gap-2.5 text-xs text-[#94A3B8]">
            <Info className="w-4 h-4 text-[#06B6D4] shrink-0 mt-0.5" />
            <div>
              <strong className="text-[#F8FAFC]">
                Sample Catalog Separation:
              </strong>{' '}
              Items marked{' '}
              <span className="font-medium text-[#F8FAFC]">
                Sample Preview
              </span>{' '}
              are demonstration listings. Select{' '}
              <button
                type="button"
                onClick={() => setSourceFilter('community')}
                className="text-[#8B5CF6] font-semibold underline cursor-pointer"
              >
                Filter to Community Listings Only
              </button>{' '}
              to view only user-created items.
            </div>
          </div>
        )}

        {/* Product Listings Grid or Loading/Error/Empty State */}
        <div className="pt-8">
          {isLoading ? (
            <div
              role="status"
              aria-live="polite"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {[0, 1, 2, 3, 4, 5].map((idx) => (
                <div
                  key={idx}
                  className="bg-[#161E2E] border border-white/[0.08] rounded-xl overflow-hidden animate-pulse"
                >
                  <div className="aspect-[4/3] bg-[#1D293B]" />
                  <div className="p-5 space-y-3">
                    <div className="h-3 w-1/3 bg-[#1D293B] rounded" />
                    <div className="h-5 w-3/4 bg-[#1D293B] rounded" />
                    <div className="h-3 w-1/2 bg-[#1D293B] rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div
              role="alert"
              className="py-14 px-6 border border-[#EF4444]/30 rounded-xl bg-[#EF4444]/10 max-w-lg mx-auto text-center space-y-3"
            >
              <AlertCircle className="w-6 h-6 text-[#EF4444] mx-auto" />
              <h2 className="text-base font-semibold text-[#F8FAFC]">
                Error loading rental items
              </h2>
              <p className="text-xs text-[#94A3B8]">{error}</p>
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="text-center py-16 px-6 border border-white/[0.08] rounded-xl bg-[#161E2E] max-w-lg mx-auto space-y-4">
              <h2 className="text-lg font-semibold text-[#F8FAFC]">
                {sourceFilter === 'community'
                  ? 'No community listings match your current filters'
                  : 'No matching rental items found'}
              </h2>
              <p className="text-sm text-[#94A3B8]">
                {sourceFilter === 'community'
                  ? 'Genuine community listings appear here as users publish items. You can list your own item now or switch to Sample Previews to test the catalog.'
                  : 'Try clearing your search term or switching to “All Cities” or “All Categories”.'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => onNavigate({ page: 'list-item' })}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  List an Item
                </button>
                <button
                  type="button"
                  onClick={handleFullReset}
                  className="px-4 py-2 bg-[#1D293B] hover:bg-[#334155] text-[#F8FAFC] border border-white/[0.08] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Reset All Filters
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredListings.map((listing, idx) => (
                <motion.div
                  key={listing.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(idx * 0.04, 0.24) }}
                >
                  <ProductCard
                    listing={listing}
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
      </div>
    </div>
  );
};
