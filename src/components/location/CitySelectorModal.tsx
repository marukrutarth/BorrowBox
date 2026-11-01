import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  Globe2,
  MapPin,
  Search,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  INDIA_STATES_AND_UTS,
  MAJOR_METROS,
  areCitiesEquivalent,
  getActiveListingCountForCity,
  searchIndianCities,
} from '../../data/indiaLocations';

export interface CitySelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCity: string | null;
  onSelectCity: (city: string | null) => void; // null represents 'All India' or unselected
  listings?: ReadonlyArray<{ city: string; status?: string }>;
}

export const CitySelectorModal: React.FC<CitySelectorModalProps> = ({
  isOpen,
  onClose,
  selectedCity,
  onSelectCity,
  listings = [],
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStateTab, setActiveStateTab] = useState<string>('Karnataka');

  // Search results if user is typing in search bar (supports canonical names & historical aliases)
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchIndianCities(searchQuery, 24);
  }, [searchQuery]);

  // Selected state's cities
  const selectedStateObj = useMemo(() => {
    return (
      INDIA_STATES_AND_UTS.find((s) => s.name === activeStateTab) ||
      INDIA_STATES_AND_UTS[10] // Karnataka default state view
    );
  }, [activeStateTab]);

  if (!isOpen) return null;

  const handlePickCity = (cityName: string) => {
    onSelectCity(cityName);
    onClose();
  };

  const handlePickAllIndia = () => {
    onSelectCity(null);
    onClose();
  };

  const renderCityAvailabilityLabel = (cityName: string) => {
    if (!listings || listings.length === 0) {
      return (
        <p className="text-[10px] text-[#94A3B8]">
          Supported launch city
        </p>
      );
    }
    const activeCount = getActiveListingCountForCity(cityName, listings);
    if (activeCount > 0) {
      return (
        <p className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
          <span>
            {activeCount} active {activeCount === 1 ? 'listing' : 'listings'}
          </span>
        </p>
      );
    }
    return (
      <p className="text-[10px] text-[#94A3B8]">
        Supported city · No active listings yet
      </p>
    );
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="city-selector-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
        className="fixed inset-0 bg-[#0B0F19]/85 backdrop-blur-xs"
        aria-hidden="true"
      />

      {/* Modal Surface */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 10 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-3xl rounded-2xl bg-[#111827] border border-white/[0.12] shadow-2xl overflow-hidden flex flex-col max-h-[88vh] z-10"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-white/[0.08] flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8B5CF6]">
              <MapPin className="w-3.5 h-3.5" />
              <span>Location Selection · India</span>
            </div>
            <h2 id="city-selector-title" className="text-xl sm:text-2xl font-bold text-[#F8FAFC]">
              {selectedCity ? `City: ${selectedCity}` : 'Select Your City'}
            </h2>
            <p className="text-xs text-[#94A3B8]">
              BorrowBox never uses automatic IP or browser geolocation. Choose your city or browse all India.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
            aria-label="Close location selector"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & All-India Discovery Bar */}
        <div className="p-4 sm:p-5 bg-[#161E2E] border-b border-white/[0.08] space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#8B5CF6] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search city, state, or alias (e.g., Bengaluru, Bangalore, Delhi, Gurugram, Vizag, Kochi)..."
              className="w-full pl-10 pr-9 py-2.5 bg-[#0B0F19] border border-white/[0.12] focus:border-[#8B5CF6] rounded-xl text-sm text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none transition-colors"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#64748B] hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick All-India Discovery Switcher */}
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-[#94A3B8]">Want to view listings across all cities?</span>
            <button
              type="button"
              onClick={handlePickAllIndia}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                !selectedCity
                  ? 'bg-[#8B5CF6]/20 border-[#8B5CF6] text-[#C4B5FD]'
                  : 'bg-white/[0.04] border-white/[0.1] text-[#F8FAFC] hover:bg-white/[0.08]'
              }`}
            >
              <Globe2 className="w-3.5 h-3.5 text-[#8B5CF6]" />
              <span>Browse All India</span>
              {!selectedCity && <Check className="w-3.5 h-3.5 text-[#8B5CF6]" />}
            </button>
          </div>
        </div>

        {/* Major Metropolitan Fast Links */}
        {!searchQuery && (
          <div className="px-5 py-3 bg-[#0E1526] border-b border-white/[0.06] flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] shrink-0">
              Popular Cities:
            </span>
            {MAJOR_METROS.map((metro) => (
              <button
                key={metro}
                type="button"
                onClick={() => handlePickCity(metro)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                  selectedCity === metro
                    ? 'bg-[#8B5CF6] text-white font-semibold'
                    : 'bg-white/[0.04] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.08]'
                }`}
              >
                {metro}
              </button>
            ))}
          </div>
        )}

        {/* Content Body: Live Search Results OR State-based Browser */}
        <div className="flex-1 overflow-y-auto min-h-[300px]">
          {searchQuery.trim() ? (
            <div className="p-5">
              <p className="text-xs font-semibold text-[#94A3B8] mb-3">
                Found {searchResults.length} matching cities for &quot;{searchQuery}&quot;:
              </p>

              {searchResults.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <p className="text-sm font-medium text-[#F8FAFC]">No cities matching &quot;{searchQuery}&quot;</p>
                  <p className="text-xs text-[#94A3B8]">
                    Try checking spelling or browse by Indian State from the sidebar list.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {searchResults.map(({ city, state }) => {
                    const isSelected = Boolean(
                      selectedCity && areCitiesEquivalent(selectedCity, city)
                    );
                    return (
                      <button
                        key={`${state}-${city}`}
                        type="button"
                        onClick={() => handlePickCity(city)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-[#8B5CF6]/15 border-[#8B5CF6] text-white'
                            : 'bg-[#161E2E] border-white/[0.06] text-[#F8FAFC] hover:border-white/[0.16] hover:bg-[#1D293B]'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{city}</p>
                          <p className="text-[11px] text-[#94A3B8] truncate">{state}</p>
                          <div className="mt-0.5">
                            {renderCityAvailabilityLabel(city)}
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-[#8B5CF6] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* 2-Column State / Cities Browser */
            <div className="grid grid-cols-1 md:grid-cols-12 min-h-full">
              {/* States & UTs Column */}
              <div className="md:col-span-5 border-r border-white/[0.08] bg-[#0E1526]/50 p-2 sm:p-3 overflow-y-auto max-h-[460px]">
                <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  28 States & 8 Union Territories
                </p>
                <div className="space-y-0.5">
                  {INDIA_STATES_AND_UTS.map((s) => {
                    const isActive = s.name === activeStateTab;
                    return (
                      <button
                        key={s.name}
                        type="button"
                        onClick={() => setActiveStateTab(s.name)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between cursor-pointer transition-colors ${
                          isActive
                            ? 'bg-[#8B5CF6] text-white font-semibold'
                            : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.03]'
                        }`}
                      >
                        <span className="truncate">{s.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          isActive ? 'bg-black/20 text-white' : 'bg-white/[0.06] text-[#64748B]'
                        }`}>
                          {s.cities.length}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cities belonging to Selected State Column */}
              <div className="md:col-span-7 p-4 sm:p-5 overflow-y-auto max-h-[460px] bg-[#111827]">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/[0.06]">
                  <div>
                    <h3 className="text-sm font-bold text-[#F8FAFC]">
                      {selectedStateObj.name}
                    </h3>
                    <p className="text-xs text-[#94A3B8]">
                      {selectedStateObj.type === 'ut' ? 'Union Territory' : 'State'} · {selectedStateObj.cities.length} launch cities
                    </p>
                  </div>
                  <span className="text-[11px] text-[#64748B] font-mono">{selectedStateObj.code}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedStateObj.cities.map((city) => {
                    const isSelected = Boolean(
                      selectedCity && areCitiesEquivalent(selectedCity, city)
                    );
                    return (
                      <button
                        key={city}
                        type="button"
                        onClick={() => handlePickCity(city)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-[#8B5CF6]/20 border-[#8B5CF6] text-white shadow-sm'
                            : 'bg-[#161E2E] border-white/[0.06] text-[#F8FAFC] hover:border-white/[0.18] hover:bg-[#1D293B]'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-semibold truncate">{city}</p>
                          {renderCityAvailabilityLabel(city)}
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#8B5CF6] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/[0.08] bg-[#0E1526] flex items-center justify-between text-xs text-[#94A3B8]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>
              Selected location:{' '}
              <strong className="text-white">
                {selectedCity || 'Select your city (All India)'}
              </strong>
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-white font-medium cursor-pointer"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};
