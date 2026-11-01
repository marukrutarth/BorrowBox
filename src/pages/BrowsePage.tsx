import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  AlertCircle,
  Calendar,
  Check,
  ChevronDown,
  Filter,
  Info,
  Loader2,
  MapPin,
  PlusCircle,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
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
import {
  INDIA_STATES_AND_UTS,
  getLocalitiesForCity,
  getStateForCity,
} from '../data/indiaLocations';
import { ProductCard } from '../components/products/ProductCard';
import { PageRoute } from '../components/Navbar';
import { CitySelectorModal } from '../components/location/CitySelectorModal';

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
  // Advanced Filter state
  const [sourceFilter, setSourceFilter] = useState<ListingSourceFilter>('all');
  const [selectedState, setSelectedState] = useState<string>('All');
  const [localityFilter, setLocalityFilter] = useState<string>('');
  const [minDailyPriceINR, setMinDailyPriceINR] = useState<number>(0);
  const [maxDailyPriceINR, setMaxDailyPriceINR] = useState<number>(0);
  const [availableStart, setAvailableStart] = useState<string>('');
  const [availableEnd, setAvailableEnd] = useState<string>('');
  const [brandFilter, setBrandFilter] = useState<string>('');

  // Dropdown menus & mobile drawer controls
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);

  // Secondary AI Smart Filter state
  const [showAiBar, setShowAiBar] = useState(false);
  const [nlPrompt, setNlPrompt] = useState('');
  const [isParsingNl, setIsParsingNl] = useState(false);
  const [nlExplanation, setNlExplanation] = useState<string | null>(null);

  // Search input focus & suggestions
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setActiveDropdown(null);
      }
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Update selectedState whenever selectedCity changes
  useEffect(() => {
    if (selectedCity && selectedCity !== 'All') {
      const detectedState = getStateForCity(selectedCity);
      if (detectedState) {
        setSelectedState(detectedState);
      }
    } else {
      setSelectedState('All');
      setLocalityFilter('');
    }
  }, [selectedCity]);

  // Localities available for currently selected city
  const availableLocalities = useMemo(() => {
    if (!selectedCity || selectedCity === 'All') return [];
    return getLocalitiesForCity(selectedCity);
  }, [selectedCity]);

  // Live search suggestions
  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];
    const q = searchQuery.toLowerCase();
    const suggestions = new Set<string>();

    for (const item of listings) {
      if (item.status === 'archived') continue;
      if (item.title.toLowerCase().includes(q)) suggestions.add(item.title);
      if (item.category.toLowerCase().includes(q)) suggestions.add(item.category);
      if (item.neighborhood?.toLowerCase().includes(q)) suggestions.add(item.neighborhood);
    }
    return Array.from(suggestions).slice(0, 5);
  }, [searchQuery, listings]);

  // Main filtered products
  const filteredListings = useMemo(() => {
    return filterAndSortListings(listings, {
      query: searchQuery,
      category: selectedCategory,
      city: selectedCity,
      neighborhood: localityFilter || undefined,
      condition: selectedCondition,
      sortBy,
      maxDailyPriceINR: maxDailyPriceINR > 0 ? maxDailyPriceINR : undefined,
      availableStart: availableStart || undefined,
      availableEnd: availableEnd || undefined,
      sourceFilter,
    }).filter((item) => {
      // Min price filter
      if (minDailyPriceINR > 0 && item.dailyPriceINR < minDailyPriceINR) {
        return false;
      }
      // Brand filter
      if (brandFilter.trim()) {
        const b = brandFilter.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(b);
        const matchDesc = item.description?.toLowerCase().includes(b);
        if (!matchTitle && !matchDesc) return false;
      }
      // State filter if city is All
      if (selectedState !== 'All' && selectedCity === 'All') {
        const itemState = getStateForCity(item.city);
        if (itemState !== selectedState) return false;
      }
      return true;
    });
  }, [
    listings,
    searchQuery,
    selectedCategory,
    selectedCity,
    selectedState,
    localityFilter,
    selectedCondition,
    sortBy,
    minDailyPriceINR,
    maxDailyPriceINR,
    availableStart,
    availableEnd,
    sourceFilter,
    brandFilter,
  ]);

  // Active filter count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (selectedCategory !== 'All') count++;
    if (selectedCity !== 'All') count++;
    if (selectedState !== 'All' && selectedCity === 'All') count++;
    if (localityFilter.trim()) count++;
    if (selectedCondition !== 'All') count++;
    if (minDailyPriceINR > 0) count++;
    if (maxDailyPriceINR > 0) count++;
    if (availableStart) count++;
    if (availableEnd) count++;
    if (brandFilter.trim()) count++;
    if (sortBy !== 'featured') count++;
    if (sourceFilter !== 'all') count++;
    return count;
  }, [
    searchQuery,
    selectedCategory,
    selectedCity,
    selectedState,
    localityFilter,
    selectedCondition,
    minDailyPriceINR,
    maxDailyPriceINR,
    availableStart,
    availableEnd,
    brandFilter,
    sortBy,
    sourceFilter,
  ]);

  const handleFullReset = () => {
    onSearchQueryChange('');
    onCategoryChange('All');
    onCityChange('All');
    setSelectedState('All');
    setLocalityFilter('');
    onConditionChange('All');
    setMinDailyPriceINR(0);
    setMaxDailyPriceINR(0);
    setAvailableStart('');
    setAvailableEnd('');
    setBrandFilter('');
    onSortByChange('featured');
    setSourceFilter('all');
    setNlPrompt('');
    setNlExplanation(null);
    onResetFilters();
    setActiveDropdown(null);
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
        if (data.query) onSearchQueryChange(data.query);
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
        }
        setNlExplanation(
          data.explanation || 'Applied smart filters from your query.'
        );
      }
    } catch {
      setNlExplanation('Applied local search query.');
      onSearchQueryChange(nlPrompt.trim());
    } finally {
      setIsParsingNl(false);
    }
  };

  return (
    <div className="bg-[#0B0F19] min-h-screen py-6 sm:py-8 lg:py-10 text-[#F8FAFC]">
      <div className="bb-container space-y-6">
        {/* A. Search Section: Single Prominent Field & Secondary AI Filter */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Main Prominent Search Input */}
            <div ref={searchContainerRef} className="relative flex-1">
              <Search className="w-5 h-5 text-[#8B5CF6] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onFocus={() => setShowSuggestions(true)}
                onChange={(e) => {
                  onSearchQueryChange(e.target.value);
                  setShowSuggestions(true);
                }}
                placeholder="What are you looking to rent? (Search camera, PS5, tools, brand...)"
                className="w-full h-12 pl-12 pr-10 bg-[#161E2E] border border-white/[0.12] focus:border-[#8B5CF6] rounded-2xl text-sm sm:text-base text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none transition-colors shadow-lg"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchQueryChange('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-[#64748B] hover:text-white cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* Suggestions Dropdown */}
              {showSuggestions && searchSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 rounded-xl bg-[#161E2E] border border-white/[0.12] shadow-2xl py-2 z-30">
                  <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                    Matching Suggestions
                  </div>
                  {searchSuggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        onSearchQueryChange(suggestion);
                        setShowSuggestions(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs sm:text-sm text-[#F8FAFC] hover:bg-white/[0.06] flex items-center justify-between cursor-pointer"
                    >
                      <span>{suggestion}</span>
                      <span className="text-[11px] text-[#8B5CF6]">Search →</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Mobile Filter Sheet Button */}
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              className="lg:hidden h-12 px-5 rounded-2xl bg-[#161E2E] border border-white/[0.12] text-sm font-semibold text-[#F8FAFC] flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <Filter className="w-4 h-4 text-[#8B5CF6]" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-[#8B5CF6] text-white text-xs flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* AI Assistant Expandable Trigger */}
            <button
              type="button"
              onClick={() => setShowAiBar((prev) => !prev)}
              className={`h-12 px-4 rounded-2xl border text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors shrink-0 ${
                showAiBar
                  ? 'bg-[#8B5CF6]/20 border-[#8B5CF6] text-[#C4B5FD]'
                  : 'bg-[#161E2E] border-white/[0.12] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-white/[0.2]'
              }`}
            >
              <Sparkles className="w-4 h-4 text-[#8B5CF6]" />
              <span className="hidden sm:inline">AI Smart Filter</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${showAiBar ? 'rotate-180' : ''}`}
              />
            </button>
          </div>

          {/* Expandable Secondary AI Smart Search Panel */}
          <AnimatePresence>
            {showAiBar && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleNaturalLanguageSearch}
                className="overflow-hidden p-3.5 rounded-2xl bg-[#111827] border border-[#8B5CF6]/30 space-y-2"
              >
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Sparkles className="w-4 h-4 text-[#8B5CF6] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={nlPrompt}
                      onChange={(e) => setNlPrompt(e.target.value)}
                      placeholder='Ask naturally: e.g. "Cinema camera in Bengaluru under ₹2000" or "Playstation in Mumbai"'
                      className="w-full pl-9 pr-3 py-2 bg-[#0B0F19] border border-white/[0.1] rounded-xl text-xs sm:text-sm text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none focus:border-[#8B5CF6]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isParsingNl}
                    className="px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    {isParsingNl ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>Apply Smart Query</span>
                  </button>
                </div>
                {nlExplanation && (
                  <p className="text-xs text-[#06B6D4] font-medium pl-1">
                    {nlExplanation}
                  </p>
                )}
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* B. Desktop Compact Horizontal Filter Toolbar */}
        <div ref={dropdownRef} className="hidden lg:flex items-center gap-2 relative z-20">
          {/* 1. Location Filter Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setActiveDropdown(activeDropdown === 'location' ? null : 'location')
              }
              className={`h-10 px-3.5 rounded-xl border text-xs font-medium flex items-center gap-2 cursor-pointer transition-colors ${
                selectedCity !== 'All' || selectedState !== 'All' || localityFilter
                  ? 'bg-[#8B5CF6]/15 border-[#8B5CF6] text-white'
                  : 'bg-[#161E2E] border-white/[0.08] text-[#94A3B8] hover:text-white hover:border-white/[0.16]'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-[#8B5CF6]" />
              <span>
                {selectedCity !== 'All'
                  ? selectedCity
                  : selectedState !== 'All'
                  ? selectedState
                  : 'Location'}
              </span>
              <ChevronDown className="w-3 h-3 text-[#64748B]" />
            </button>

            {activeDropdown === 'location' && (
              <div className="absolute left-0 top-full mt-2 w-72 rounded-2xl bg-[#161E2E] border border-white/[0.12] shadow-2xl p-4 space-y-3 z-30">
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                  <span className="text-xs font-bold text-white">Filter by Location</span>
                  <button
                    type="button"
                    onClick={() => {
                      onCityChange('All');
                      setSelectedState('All');
                      setLocalityFilter('');
                    }}
                    className="text-[11px] text-[#8B5CF6] hover:underline"
                  >
                    Reset
                  </button>
                </div>

                {/* City Picker Button to open Full India Modal */}
                <button
                  type="button"
                  onClick={() => {
                    setIsCityModalOpen(true);
                    setActiveDropdown(null);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-[#111827] border border-white/[0.08] hover:border-[#8B5CF6] text-xs font-medium text-left flex items-center justify-between text-[#F8FAFC] cursor-pointer"
                >
                  <span className="truncate">
                    {selectedCity !== 'All' ? selectedCity : 'Browse All 28 States & UTs'}
                  </span>
                  <span className="text-[11px] text-[#8B5CF6]">Browse →</span>
                </button>

                {/* Locality Selector if city is selected */}
                {selectedCity !== 'All' && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#94A3B8]">
                      Locality in {selectedCity}:
                    </label>
                    <select
                      value={localityFilter}
                      onChange={(e) => setLocalityFilter(e.target.value)}
                      className="w-full py-2 px-2.5 bg-[#111827] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none"
                    >
                      <option value="">All Localities</option>
                      {availableLocalities.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Category Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setActiveDropdown(activeDropdown === 'category' ? null : 'category')
              }
              className={`h-10 px-3.5 rounded-xl border text-xs font-medium flex items-center gap-2 cursor-pointer transition-colors ${
                selectedCategory !== 'All'
                  ? 'bg-[#8B5CF6]/15 border-[#8B5CF6] text-white'
                  : 'bg-[#161E2E] border-white/[0.08] text-[#94A3B8] hover:text-white hover:border-white/[0.16]'
              }`}
            >
              <Tag className="w-3.5 h-3.5 text-[#8B5CF6]" />
              <span>{selectedCategory !== 'All' ? selectedCategory : 'Category'}</span>
              <ChevronDown className="w-3 h-3 text-[#64748B]" />
            </button>

            {activeDropdown === 'category' && (
              <div className="absolute left-0 top-full mt-2 w-64 rounded-2xl bg-[#161E2E] border border-white/[0.12] shadow-2xl p-2 space-y-0.5 z-30">
                <button
                  type="button"
                  onClick={() => {
                    onCategoryChange('All');
                    setActiveDropdown(null);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between cursor-pointer ${
                    selectedCategory === 'All'
                      ? 'bg-[#8B5CF6] text-white'
                      : 'text-[#94A3B8] hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <span>All Categories</span>
                  {selectedCategory === 'All' && <Check className="w-3.5 h-3.5" />}
                </button>
                {ALL_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      onCategoryChange(cat);
                      setActiveDropdown(null);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-[#8B5CF6] text-white'
                        : 'text-[#94A3B8] hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <span>{cat}</span>
                    {selectedCategory === cat && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 3. Price Filter Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setActiveDropdown(activeDropdown === 'price' ? null : 'price')
              }
              className={`h-10 px-3.5 rounded-xl border text-xs font-medium flex items-center gap-2 cursor-pointer transition-colors ${
                minDailyPriceINR > 0 || maxDailyPriceINR > 0
                  ? 'bg-[#8B5CF6]/15 border-[#8B5CF6] text-white'
                  : 'bg-[#161E2E] border-white/[0.08] text-[#94A3B8] hover:text-white hover:border-white/[0.16]'
              }`}
            >
              <span>
                {maxDailyPriceINR > 0
                  ? `Max ₹${maxDailyPriceINR}`
                  : minDailyPriceINR > 0
                  ? `Min ₹${minDailyPriceINR}`
                  : 'Daily Price'}
              </span>
              <ChevronDown className="w-3 h-3 text-[#64748B]" />
            </button>

            {activeDropdown === 'price' && (
              <div className="absolute left-0 top-full mt-2 w-72 rounded-2xl bg-[#161E2E] border border-white/[0.12] shadow-2xl p-4 space-y-4 z-30">
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                  <span className="text-xs font-bold text-white">Daily Rental Rate (₹)</span>
                  <button
                    type="button"
                    onClick={() => {
                      setMinDailyPriceINR(0);
                      setMaxDailyPriceINR(0);
                    }}
                    className="text-[11px] text-[#8B5CF6] hover:underline"
                  >
                    Reset
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[11px] text-[#94A3B8] block mb-1">Min (₹)</label>
                    <input
                      type="number"
                      value={minDailyPriceINR || ''}
                      onChange={(e) => setMinDailyPriceINR(Number(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full px-2.5 py-1.5 bg-[#111827] border border-white/[0.08] rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#94A3B8] block mb-1">Max (₹)</label>
                    <input
                      type="number"
                      value={maxDailyPriceINR || ''}
                      onChange={(e) => setMaxDailyPriceINR(Number(e.target.value) || 0)}
                      placeholder="5000"
                      className="w-full px-2.5 py-1.5 bg-[#111827] border border-white/[0.08] rounded-lg text-white"
                    />
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    { label: 'Under ₹500', max: 500 },
                    { label: '₹500 - ₹1,500', min: 500, max: 1500 },
                    { label: '₹1,500+', min: 1500, max: 0 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setMinDailyPriceINR(preset.min || 0);
                        setMaxDailyPriceINR(preset.max || 0);
                      }}
                      className="px-2 py-1 rounded-md bg-[#111827] hover:bg-white/[0.06] text-[11px] text-[#C4B5FD] border border-white/[0.06] cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 4. Availability Dates Filter Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setActiveDropdown(activeDropdown === 'dates' ? null : 'dates')
              }
              className={`h-10 px-3.5 rounded-xl border text-xs font-medium flex items-center gap-2 cursor-pointer transition-colors ${
                availableStart || availableEnd
                  ? 'bg-[#8B5CF6]/15 border-[#8B5CF6] text-white'
                  : 'bg-[#161E2E] border-white/[0.08] text-[#94A3B8] hover:text-white hover:border-white/[0.16]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-[#8B5CF6]" />
              <span>
                {availableStart && availableEnd
                  ? `${availableStart.slice(5)} to ${availableEnd.slice(5)}`
                  : 'Availability'}
              </span>
              <ChevronDown className="w-3 h-3 text-[#64748B]" />
            </button>

            {activeDropdown === 'dates' && (
              <div className="absolute left-0 top-full mt-2 w-72 rounded-2xl bg-[#161E2E] border border-white/[0.12] shadow-2xl p-4 space-y-3 z-30">
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                  <span className="text-xs font-bold text-white">Rental Availability</span>
                  <button
                    type="button"
                    onClick={() => {
                      setAvailableStart('');
                      setAvailableEnd('');
                    }}
                    className="text-[11px] text-[#8B5CF6] hover:underline"
                  >
                    Reset
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <label className="text-[11px] text-[#94A3B8] block mb-1">Pickup Date</label>
                    <input
                      type="date"
                      value={availableStart}
                      onChange={(e) => setAvailableStart(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[#111827] border border-white/[0.08] rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#94A3B8] block mb-1">Return Date</label>
                    <input
                      type="date"
                      value={availableEnd}
                      min={availableStart || undefined}
                      onChange={(e) => setAvailableEnd(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[#111827] border border-white/[0.08] rounded-lg text-white"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 5. Condition Filter Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setActiveDropdown(activeDropdown === 'condition' ? null : 'condition')
              }
              className={`h-10 px-3.5 rounded-xl border text-xs font-medium flex items-center gap-2 cursor-pointer transition-colors ${
                selectedCondition !== 'All'
                  ? 'bg-[#8B5CF6]/15 border-[#8B5CF6] text-white'
                  : 'bg-[#161E2E] border-white/[0.08] text-[#94A3B8] hover:text-white hover:border-white/[0.16]'
              }`}
            >
              <span>{selectedCondition !== 'All' ? selectedCondition : 'Condition'}</span>
              <ChevronDown className="w-3 h-3 text-[#64748B]" />
            </button>

            {activeDropdown === 'condition' && (
              <div className="absolute left-0 top-full mt-2 w-48 rounded-2xl bg-[#161E2E] border border-white/[0.12] shadow-2xl p-2 space-y-0.5 z-30">
                {(['All', 'Like New', 'Excellent', 'Good'] as (ItemCondition | 'All')[]).map((cond) => (
                  <button
                    key={cond}
                    type="button"
                    onClick={() => {
                      onConditionChange(cond);
                      setActiveDropdown(null);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between cursor-pointer ${
                      selectedCondition === cond
                        ? 'bg-[#8B5CF6] text-white'
                        : 'text-[#94A3B8] hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <span>{cond === 'All' ? 'All Conditions' : cond}</span>
                    {selectedCondition === cond && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 6. Sorting Dropdown */}
          <div className="relative ml-auto">
            <button
              type="button"
              onClick={() =>
                setActiveDropdown(activeDropdown === 'sort' ? null : 'sort')
              }
              className="h-10 px-3.5 rounded-xl bg-[#161E2E] border border-white/[0.08] hover:border-white/[0.16] text-xs font-medium text-[#F8FAFC] flex items-center gap-2 cursor-pointer transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#8B5CF6]" />
              <span>
                {sortBy === 'price-asc'
                  ? 'Price: Low to High'
                  : sortBy === 'price-desc'
                  ? 'Price: High to Low'
                  : sortBy === 'deposit-asc'
                  ? 'Deposit: Low to High'
                  : 'Sort: Featured'}
              </span>
              <ChevronDown className="w-3 h-3 text-[#64748B]" />
            </button>

            {activeDropdown === 'sort' && (
              <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl bg-[#161E2E] border border-white/[0.12] shadow-2xl p-2 space-y-0.5 z-30">
                {[
                  { value: 'featured', label: 'Featured & Popular' },
                  { value: 'price-asc', label: 'Price: Low to High' },
                  { value: 'price-desc', label: 'Price: High to Low' },
                  { value: 'deposit-asc', label: 'Deposit: Low to High' },
                ].map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => {
                      onSortByChange(s.value as SortOption);
                      setActiveDropdown(null);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between cursor-pointer ${
                      sortBy === s.value
                        ? 'bg-[#8B5CF6] text-white'
                        : 'text-[#94A3B8] hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <span>{s.label}</span>
                    {sortBy === s.value && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* D. Active Filter Chips Bar (Shown whenever any filter is applied) */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1 pb-2">
            <span className="text-xs font-semibold text-[#64748B] mr-1">
              Active Filters ({activeFiltersCount}):
            </span>

            {searchQuery && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#161E2E] border border-white/[0.12] text-xs text-white">
                <span>Search: &quot;{searchQuery}&quot;</span>
                <button
                  type="button"
                  onClick={() => onSearchQueryChange('')}
                  className="hover:text-rose-400 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedCity !== 'All' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#161E2E] border border-white/[0.12] text-xs text-white">
                <MapPin className="w-3 h-3 text-[#8B5CF6]" />
                <span>City: {selectedCity}</span>
                <button
                  type="button"
                  onClick={() => onCityChange('All')}
                  className="hover:text-rose-400 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {localityFilter && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#161E2E] border border-white/[0.12] text-xs text-white">
                <span>Locality: {localityFilter}</span>
                <button
                  type="button"
                  onClick={() => setLocalityFilter('')}
                  className="hover:text-rose-400 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedCategory !== 'All' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#161E2E] border border-white/[0.12] text-xs text-white">
                <Tag className="w-3 h-3 text-[#8B5CF6]" />
                <span>{selectedCategory}</span>
                <button
                  type="button"
                  onClick={() => onCategoryChange('All')}
                  className="hover:text-rose-400 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {(minDailyPriceINR > 0 || maxDailyPriceINR > 0) && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#161E2E] border border-white/[0.12] text-xs text-white">
                <span>
                  {minDailyPriceINR > 0 ? `₹${minDailyPriceINR}` : '₹0'} -{' '}
                  {maxDailyPriceINR > 0 ? `₹${maxDailyPriceINR}` : 'Any'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setMinDailyPriceINR(0);
                    setMaxDailyPriceINR(0);
                  }}
                  className="hover:text-rose-400 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedCondition !== 'All' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#161E2E] border border-white/[0.12] text-xs text-white">
                <span>{selectedCondition}</span>
                <button
                  type="button"
                  onClick={() => onConditionChange('All')}
                  className="hover:text-rose-400 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={handleFullReset}
              className="text-xs font-semibold text-[#8B5CF6] hover:text-[#C4B5FD] ml-2 underline cursor-pointer"
            >
              Clear All
            </button>
          </div>
        )}

        {/* Results Count & Quick Info Banner */}
        <div className="flex items-center justify-between text-xs text-[#94A3B8] pt-1">
          <p>
            Showing <strong className="text-white">{filteredListings.length}</strong>{' '}
            {filteredListings.length === 1 ? 'item' : 'items'}
            {selectedCity !== 'All' && ` in ${selectedCity}`}
          </p>

          <span className="text-[11px] text-[#64748B]">
            All prices in ₹ (INR) · Escrow Protected
          </span>
        </div>

        {/* E. Product Discovery Grid: Positioned high up with visual priority */}
        {filteredListings.length === 0 ? (
          <div className="rounded-2xl bg-[#161E2E] border border-white/[0.08] p-10 sm:p-14 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 flex items-center justify-center text-[#A78BFA] mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white">
              {selectedCity !== 'All'
                ? `No items are currently available in ${selectedCity}`
                : 'No matching rental equipment found'}
            </h3>
            <p className="text-xs sm:text-sm text-[#94A3B8] max-w-md mx-auto leading-relaxed">
              {selectedCity !== 'All' ? (
                <>
                  <strong className="text-white">{selectedCity}</strong> is a supported BorrowBox
                  launch city, and there are currently no active rental listings matching your
                  filters here. Be the first owner to list equipment in {selectedCity} or browse
                  across India.
                </>
              ) : (
                <>
                  We couldn&apos;t find gear matching your active filters. Try expanding your search
                  or resetting your filters.
                </>
              )}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {selectedCity !== 'All' && (
                <button
                  type="button"
                  onClick={() => onNavigate({ page: 'list-item' })}
                  className="px-5 py-2.5 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold cursor-pointer"
                >
                  List an Item in {selectedCity}
                </button>
              )}
              <button
                type="button"
                onClick={handleFullReset}
                className={`px-5 py-2.5 rounded-xl text-white text-xs font-semibold cursor-pointer ${
                  selectedCity !== 'All'
                    ? 'bg-white/[0.08] hover:bg-white/[0.12]'
                    : 'bg-[#8B5CF6] hover:bg-[#7C3AED]'
                }`}
              >
                Reset All Filters
              </button>
              {selectedCity !== 'All' && (
                <button
                  type="button"
                  onClick={() => onCityChange('All')}
                  className="px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white text-xs font-semibold cursor-pointer"
                >
                  Browse All India
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredListings.map((listing) => (
              <ProductCard
                key={listing.id}
                listing={listing}
                onSelect={(id) => {
                  onNavigate({ page: 'details', itemId: id });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Mobile Bottom-Sheet Filter Drawer */}
      <AnimatePresence>
        {isMobileDrawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileDrawerOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-x-0 bottom-0 max-h-[85vh] bg-[#111827] border-t border-white/[0.12] rounded-t-3xl overflow-hidden flex flex-col z-10"
            >
              {/* Drawer Header */}
              <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#8B5CF6]" />
                  <h3 className="text-base font-bold text-white">Marketplace Filters</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="p-1.5 rounded-lg bg-white/[0.06] text-[#94A3B8] hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
                {/* 1. Location Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] block">
                    City & State
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCityModalOpen(true);
                      setIsMobileDrawerOpen(false);
                    }}
                    className="w-full py-2.5 px-3.5 rounded-xl bg-[#161E2E] border border-white/[0.1] text-xs font-semibold text-left flex items-center justify-between text-white"
                  >
                    <span className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-[#8B5CF6]" />
                      <span>{selectedCity !== 'All' ? selectedCity : 'Select your city'}</span>
                    </span>
                    <span className="text-[11px] text-[#8B5CF6]">Change →</span>
                  </button>
                  {selectedCity !== 'All' && (
                    <select
                      value={localityFilter}
                      onChange={(e) => setLocalityFilter(e.target.value)}
                      className="w-full mt-2 py-2 px-3 bg-[#161E2E] border border-white/[0.1] rounded-xl text-xs text-white"
                    >
                      <option value="">All Localities in {selectedCity}</option>
                      {availableLocalities.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* 2. Category */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] block">
                    Category
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onCategoryChange('All')}
                      className={`p-2.5 rounded-xl text-xs font-medium text-left border ${
                        selectedCategory === 'All'
                          ? 'bg-[#8B5CF6] text-white border-[#8B5CF6]'
                          : 'bg-[#161E2E] border-white/[0.08] text-[#94A3B8]'
                      }`}
                    >
                      All Categories
                    </button>
                    {ALL_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => onCategoryChange(cat)}
                        className={`p-2.5 rounded-xl text-xs font-medium text-left truncate border ${
                          selectedCategory === cat
                            ? 'bg-[#8B5CF6] text-white border-[#8B5CF6]'
                            : 'bg-[#161E2E] border-white/[0.08] text-[#94A3B8]'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Daily Price Range */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] block">
                    Daily Rental Price (₹)
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[11px] text-[#64748B] block mb-1">Min (₹)</span>
                      <input
                        type="number"
                        value={minDailyPriceINR || ''}
                        onChange={(e) => setMinDailyPriceINR(Number(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full px-3 py-2 bg-[#161E2E] border border-white/[0.08] rounded-xl text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-[#64748B] block mb-1">Max (₹)</span>
                      <input
                        type="number"
                        value={maxDailyPriceINR || ''}
                        onChange={(e) => setMaxDailyPriceINR(Number(e.target.value) || 0)}
                        placeholder="5000"
                        className="w-full px-3 py-2 bg-[#161E2E] border border-white/[0.08] rounded-xl text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Availability Dates */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] block">
                    Rental Dates
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[11px] text-[#64748B] block mb-1">Pickup</span>
                      <input
                        type="date"
                        value={availableStart}
                        onChange={(e) => setAvailableStart(e.target.value)}
                        className="w-full px-2.5 py-2 bg-[#161E2E] border border-white/[0.08] rounded-xl text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-[#64748B] block mb-1">Return</span>
                      <input
                        type="date"
                        value={availableEnd}
                        min={availableStart || undefined}
                        onChange={(e) => setAvailableEnd(e.target.value)}
                        className="w-full px-2.5 py-2 bg-[#161E2E] border border-white/[0.08] rounded-xl text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. Condition */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] block">
                    Item Condition
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(['All', 'Like New', 'Excellent', 'Good'] as (ItemCondition | 'All')[]).map((cond) => (
                      <button
                        key={cond}
                        type="button"
                        onClick={() => onConditionChange(cond)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border ${
                          selectedCondition === cond
                            ? 'bg-[#8B5CF6] text-white border-[#8B5CF6]'
                            : 'bg-[#161E2E] border-white/[0.08] text-[#94A3B8]'
                        }`}
                      >
                        {cond === 'All' ? 'All' : cond}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Drawer Fixed Footer */}
              <div className="p-4 border-t border-white/[0.08] bg-[#0B0F19] flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleFullReset}
                  className="flex-1 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-white"
                >
                  Reset All
                </button>
                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="flex-2 py-3 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-xs font-bold text-white shadow-lg"
                >
                  Apply Filters ({filteredListings.length} Results)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Location Modal */}
      <CitySelectorModal
        isOpen={isCityModalOpen}
        onClose={() => setIsCityModalOpen(false)}
        selectedCity={selectedCity !== 'All' ? selectedCity : null}
        listings={listings}
        onSelectCity={(city) => {
          if (!city) {
            onCityChange('All');
          } else {
            onCityChange(city as IndianCity);
          }
        }}
      />
    </div>
  );
};
