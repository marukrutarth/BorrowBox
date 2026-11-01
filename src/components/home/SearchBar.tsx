import React, { useState } from 'react';
import { MapPin, Search } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { IndianCity } from '../../types/marketplace';
import { searchEntranceVariants } from '../../utils/motionVariants';
import { ALL_CITIES } from '../../utils/rentalLogic';

export interface SearchBarProps {
  selectedCity: IndianCity | 'All';
  onCityChange: (city: IndianCity | 'All') => void;
  onSearchSubmit: (params: {
    query?: string;
    city?: IndianCity | 'All';
  }) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  selectedCity,
  onCityChange,
  onSearchSubmit,
}) => {
  const [query, setQuery] = useState('');
  const prefersReducedMotion = useReducedMotion();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchSubmit({
      query: query.trim() || undefined,
      city: selectedCity,
    });
  };

  return (
    <motion.section
      aria-label="Search rentals"
      initial={prefersReducedMotion ? false : 'hidden'}
      animate="visible"
      variants={searchEntranceVariants}
      className="py-3 sm:py-4 lg:py-6"
    >
      <div className="bb-container">
        <form
          onSubmit={handleSubmit}
          role="search"
          className="bg-[#161E2E] border border-white/[0.08] focus-within:border-[#8B5CF6]/45 transition-colors duration-200 rounded-2xl p-2 sm:p-2.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shadow-lg"
        >
          {/* Search Input */}
          <div className="relative flex-1 flex items-center min-w-0">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 pointer-events-none shrink-0" />
            <input
              type="search"
              aria-label="What are you looking to rent?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What are you looking to rent?"
              className="w-full min-h-[44px] pl-10 pr-4 py-2 bg-transparent text-sm text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none"
            />
          </div>

          <div
            aria-hidden="true"
            className="hidden sm:block w-px h-7 bg-white/[0.08]"
          />

          {/* Location Selection */}
          <div className="flex items-center gap-2 min-h-[44px] px-3 py-2 sm:py-1.5 rounded-xl bg-[#111827] sm:bg-transparent border border-white/[0.08] sm:border-transparent sm:w-48 min-w-0">
            <MapPin className="w-4 h-4 text-[#8B5CF6] shrink-0" />
            <select
              aria-label="Select rental location"
              value={selectedCity}
              onChange={(e) =>
                onCityChange(e.target.value as IndianCity | 'All')
              }
              className="w-full bg-transparent text-xs sm:text-sm font-medium text-[#F8FAFC] focus:outline-none cursor-pointer truncate"
            >
              <option value="All" className="bg-[#111827]">
                Select your city
              </option>
              {ALL_CITIES.map((city) => (
                <option key={city} value={city} className="bg-[#111827]">
                  {city}
                </option>
              ))}
            </select>
          </div>

          {/* Search Action */}
          <button
            type="submit"
            className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-sm font-semibold bb-glow-button cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B5CF6]"
          >
            Search
          </button>
        </form>
      </div>
    </motion.section>
  );
};
