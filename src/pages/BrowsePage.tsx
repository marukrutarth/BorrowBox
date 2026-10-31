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
        if (typeof data.maxDailyPriceINR === 'number' && data.maxDailyPriceINR > 0) {
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
    <div className="bg-white min-h-screen py-10 lg:py-12">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-8 border-b border-slate-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Browse Rental Items
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Compare rental prices, security deposits, approximate locations,
              and availability across Indian cities (₹).
            </p>
          </div>

          {/* Source Filter Segmented Control */}
          <div
            role="group"
            aria-label="Filter by listing source"
            className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg self-start"
          >
            <button
              type="button"
              onClick={() => setSourceFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                sourceFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({counts.total})
            </button>
            <button
              type="button"
              onClick={() => setSourceFilter('community')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                sourceFilter === 'community'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Community Listings ({counts.community})
            </button>
            <button
              type="button"
              onClick={() => setSourceFilter('sample')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                sourceFilter === 'sample'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sample Previews ({counts.sample})
            </button>
          </div>
        </div>

        {/* Phase 4 Natural-Language Search Bar */}
        <form
          onSubmit={(e) => void handleNaturalLanguageSearch(e)}
          className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2"
        >
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Sparkles className="w-4 h-4 text-indigo-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                aria-label="Natural language rental search"
                value={nlPrompt}
                onChange={(e) => setNlPrompt(e.target.value)}
                placeholder='Ask in plain English: e.g., "Camera in Bengaluru under ₹2000" or "Tools in Mumbai"'
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
              />
            </div>
            <button
              type="submit"
              disabled={isParsingNl}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors shrink-0 cursor-pointer"
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
            <p className="text-xs text-indigo-700 font-medium pl-1">
              {nlExplanation}
            </p>
          )}
        </form>

        {/* Search, City, Condition, Price Sort & Advanced Date/Price Filters */}
        <div className="py-6 space-y-4 border-b border-slate-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
            {/* Search Input */}
            <div className="sm:col-span-2 lg:col-span-4">
              <label htmlFor="browse-search-input" className="sr-only">
                Search items by name, brand, or locality
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="browse-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchQueryChange(e.target.value)}
                  placeholder="Keyword, brand, or model..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
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
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-600"
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
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
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
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-600"
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
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-600"
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
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <label
                htmlFor="browse-max-price"
                className="text-xs font-medium text-slate-600 shrink-0"
              >
                Max Daily Rate:
              </label>
              <select
                id="browse-max-price"
                value={maxDailyPriceINR}
                onChange={(e) => setMaxDailyPriceINR(Number(e.target.value))}
                className="w-full bg-transparent text-xs font-mono-tabular font-semibold text-slate-900 focus:outline-none"
              >
                <option value={0}>Any Daily Rate (₹)</option>
                <option value={500}>Up to {formatINR(500)}/day</option>
                <option value={1000}>Up to {formatINR(1000)}/day</option>
                <option value={1500}>Up to {formatINR(1500)}/day</option>
                <option value={2500}>Up to {formatINR(2500)}/day</option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <label
                htmlFor="browse-avail-start"
                className="text-xs font-medium text-slate-600 shrink-0"
              >
                Pickup From:
              </label>
              <input
                id="browse-avail-start"
                type="date"
                value={availableStart}
                onChange={(e) => setAvailableStart(e.target.value)}
                className="w-full bg-transparent text-xs font-mono-tabular text-slate-900 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <label
                htmlFor="browse-avail-end"
                className="text-xs font-medium text-slate-600 shrink-0"
              >
                Return By:
              </label>
              <input
                id="browse-avail-end"
                type="date"
                value={availableEnd}
                min={availableStart}
                onChange={(e) => setAvailableEnd(e.target.value)}
                className="w-full bg-transparent text-xs font-mono-tabular text-slate-900 focus:outline-none"
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
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-500 tabular-nums">
                Showing{' '}
                <strong className="text-slate-900">
                  {filteredListings.length}
                </strong>{' '}
                of {counts.total} items
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleFullReset}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 whitespace-nowrap shrink-0 cursor-pointer"
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
          <div className="mt-6 p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5 text-xs text-slate-600">
            <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900">
                Sample Catalog Separation:
              </strong>{' '}
              Items marked{' '}
              <span className="font-medium text-slate-800">
                Sample Preview (Unverified Demo)
              </span>{' '}
              are demonstration listings. Select{' '}
              <button
                type="button"
                onClick={() => setSourceFilter('community')}
                className="text-indigo-600 font-semibold underline cursor-pointer"
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
              className="py-16 px-4 border border-slate-200 rounded-xl bg-slate-50/50 flex flex-col items-center justify-center gap-3 text-slate-600"
            >
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <p className="text-sm font-medium">Loading marketplace items...</p>
            </div>
          ) : error ? (
            <div
              role="alert"
              className="py-14 px-6 border border-red-200 rounded-xl bg-red-50 max-w-lg mx-auto text-center space-y-3"
            >
              <AlertCircle className="w-6 h-6 text-red-600 mx-auto" />
              <h2 className="text-base font-semibold text-red-900">
                Error loading rental items
              </h2>
              <p className="text-xs text-red-700">{error}</p>
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="text-center py-16 px-6 border border-slate-200 rounded-xl bg-slate-50/50 max-w-lg mx-auto space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {sourceFilter === 'community'
                  ? 'No community listings match your current filters'
                  : 'No matching rental items found'}
              </h2>
              <p className="text-sm text-slate-600">
                {sourceFilter === 'community'
                  ? 'Genuine community listings appear here as users publish items. You can list your own item now or switch to Sample Previews to test the catalog.'
                  : 'Try clearing your search term or switching to “All Cities” or “All Categories”.'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => onNavigate({ page: 'list-item' })}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  List an Item
                </button>
                <button
                  type="button"
                  onClick={handleFullReset}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Reset All Filters
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredListings.map((listing) => (
                <ProductCard
                  key={listing.id}
                  listing={listing}
                  onSelect={(itemId) => {
                    onNavigate({ page: 'details', itemId });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
