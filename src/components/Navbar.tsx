import React, { useState } from 'react';
import {
  Box,
  LayoutDashboard,
  MapPin,
  Menu,
  Search,
  User,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  BorrowBoxUserProfile,
  IndianCity,
  RentalRequestRecord,
} from '../types/marketplace';
import { ALL_CITIES } from '../utils/rentalLogic';

export type PageRoute =
  | { page: 'home' }
  | { page: 'browse'; category?: string; query?: string; city?: string }
  | { page: 'details'; itemId: string }
  | { page: 'list-item' }
  | { page: 'dashboard' }
  | { page: 'profile' }
  | { page: 'login' }
  | { page: 'signup' };

interface NavbarProps {
  currentRoute: PageRoute;
  onNavigate: (route: PageRoute) => void;
  onScrollToHowItWorks: () => void;
  userProfile: BorrowBoxUserProfile | null;
  onLogout: () => Promise<void>;
  rentalRequests: RentalRequestRecord[];
  onOpenRequestsModal: () => void;
  selectedCity: IndianCity | 'All';
  onCityChange: (city: IndianCity | 'All') => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  unreadNotificationsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRoute,
  onNavigate,
  onScrollToHowItWorks,
  userProfile,
  onLogout,
  rentalRequests,
  onOpenRequestsModal,
  selectedCity,
  onCityChange,
  searchQuery,
  onSearchQueryChange,
  unreadNotificationsCount = 0,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (e: React.MouseEvent, action: () => void) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    action();
  };

  const handleNavbarSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    onNavigate({
      page: 'browse',
      query: searchQuery.trim() || undefined,
      city: selectedCity !== 'All' ? selectedCity : undefined,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLocationSelect = (newCity: IndianCity | 'All') => {
    onCityChange(newCity);
    if (currentRoute.page === 'browse') {
      onNavigate({
        page: 'browse',
        city: newCity !== 'All' ? newCity : undefined,
        query: searchQuery.trim() || undefined,
      });
    }
  };

  const isBrowseActive =
    currentRoute.page === 'browse' || currentRoute.page === 'details';

  return (
    <header className="sticky top-0 z-40 bg-[#0B0F19]/80 backdrop-blur-xl border-b border-white/[0.08]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left Zone: BorrowBox Wordmark + Location Selector */}
        <div className="flex items-center gap-4 shrink-0">
          <a
            href="/"
            onClick={(e) =>
              handleNavClick(e, () => onNavigate({ page: 'home' }))
            }
            className="group inline-flex items-center gap-2.5 text-lg font-bold tracking-tight text-[#F8FAFC] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8B5CF6]"
          >
            <span className="w-8 h-8 rounded-lg bg-[#8B5CF6]/15 border border-[#8B5CF6]/40 flex items-center justify-center text-[#8B5CF6] group-hover:bg-[#8B5CF6] group-hover:text-white transition-colors duration-200">
              <Box className="w-4 h-4" />
            </span>
            <span>
              Borrow<span className="text-[#8B5CF6]">Box</span>
            </span>
          </a>

          {/* Location Selector */}
          <div className="hidden sm:flex items-center gap-1.5 bg-[#161E2E] border border-white/[0.08] hover:border-white/[0.16] rounded-lg px-2.5 py-1.5 transition-colors">
            <MapPin className="w-3.5 h-3.5 text-[#8B5CF6] shrink-0" />
            <label htmlFor="navbar-location-select" className="sr-only">
              Select Location
            </label>
            <select
              id="navbar-location-select"
              aria-label="Select Location"
              value={selectedCity}
              onChange={(e) =>
                handleLocationSelect(e.target.value as IndianCity | 'All')
              }
              className="bg-transparent text-xs font-medium text-[#F8FAFC] focus:outline-none cursor-pointer"
            >
              <option value="All" className="bg-[#111827] text-[#F8FAFC]">
                All India
              </option>
              {ALL_CITIES.map((city) => (
                <option
                  key={city}
                  value={city}
                  className="bg-[#111827] text-[#F8FAFC]"
                >
                  {city}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Center Zone: Quick Search Input */}
        <form
          onSubmit={handleNavbarSearchSubmit}
          role="search"
          aria-label="Quick search rentals"
          className="hidden lg:flex flex-1 max-w-xs xl:max-w-sm items-center relative"
        >
          <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            aria-label="Search rentals in navbar"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search cameras, tools, PS5..."
            className="w-full pl-8 pr-3 py-1.5 bg-[#161E2E] border border-white/[0.08] rounded-lg text-xs text-[#F8FAFC] placeholder:text-[#94A3B8] focus:bg-[#1D293B] focus:outline-none focus:border-[#8B5CF6] transition-colors"
          />
        </form>

        {/* Right Zone: Navigation Links + Auth Actions */}
        <div className="flex items-center gap-5 shrink-0">
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-1 text-sm font-medium text-[#94A3B8]"
          >
            <a
              href="/browse"
              onClick={(e) =>
                handleNavClick(e, () => onNavigate({ page: 'browse' }))
              }
              className={`relative px-3 py-2 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                isBrowseActive
                  ? 'text-[#F8FAFC] font-semibold'
                  : 'hover:text-[#F8FAFC] hover:bg-white/[0.04]'
              }`}
            >
              <span>Browse</span>
              {isBrowseActive && (
                <motion.span
                  layoutId="navbar-active-indicator"
                  className="absolute inset-x-2 -bottom-[11px] h-0.5 bg-[#8B5CF6] rounded-full"
                />
              )}
            </a>

            <a
              href="/list-item"
              onClick={(e) =>
                handleNavClick(e, () => onNavigate({ page: 'list-item' }))
              }
              className={`relative px-3 py-2 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                currentRoute.page === 'list-item'
                  ? 'text-[#F8FAFC] font-semibold'
                  : 'hover:text-[#F8FAFC] hover:bg-white/[0.04]'
              }`}
            >
              <span>List an Item</span>
              {currentRoute.page === 'list-item' && (
                <motion.span
                  layoutId="navbar-active-indicator"
                  className="absolute inset-x-2 -bottom-[11px] h-0.5 bg-[#8B5CF6] rounded-full"
                />
              )}
            </a>

            <a
              href="/dashboard"
              onClick={(e) =>
                handleNavClick(e, () => onNavigate({ page: 'dashboard' }))
              }
              className={`relative inline-flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                currentRoute.page === 'dashboard'
                  ? 'text-[#F8FAFC] font-semibold'
                  : 'hover:text-[#F8FAFC] hover:bg-white/[0.04]'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-[#8B5CF6]" />
              <span>Dashboard</span>
              {unreadNotificationsCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#8B5CF6] text-white rounded-md tabular-nums">
                  {unreadNotificationsCount}
                </span>
              )}
              {currentRoute.page === 'dashboard' && (
                <motion.span
                  layoutId="navbar-active-indicator"
                  className="absolute inset-x-2 -bottom-[11px] h-0.5 bg-[#8B5CF6] rounded-full"
                />
              )}
            </a>

            <a
              href="/#how-it-works"
              onClick={(e) => handleNavClick(e, onScrollToHowItWorks)}
              className="hidden xl:inline-block px-3 py-2 rounded-lg hover:text-[#F8FAFC] hover:bg-white/[0.04] transition-colors whitespace-nowrap shrink-0"
            >
              How It Works
            </a>

            {rentalRequests.length > 0 && (
              <button
                type="button"
                onClick={onOpenRequestsModal}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#06B6D4] bg-[#06B6D4]/10 border border-[#06B6D4]/30 hover:bg-[#06B6D4]/20 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Requests ({rentalRequests.length})
              </button>
            )}

            <a
              href="/profile"
              onClick={(e) =>
                handleNavClick(e, () => onNavigate({ page: 'profile' }))
              }
              className={`relative inline-flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                currentRoute.page === 'profile'
                  ? 'text-[#F8FAFC] font-semibold'
                  : 'hover:text-[#F8FAFC] hover:bg-white/[0.04]'
              }`}
            >
              <User className="w-3.5 h-3.5 text-[#94A3B8]" />
              <span>
                {userProfile
                  ? `Profile (${userProfile.name.split(' ')[0]})`
                  : 'Profile'}
              </span>
              {currentRoute.page === 'profile' && (
                <motion.span
                  layoutId="navbar-active-indicator"
                  className="absolute inset-x-2 -bottom-[11px] h-0.5 bg-[#8B5CF6] rounded-full"
                />
              )}
            </a>

            {userProfile ? (
              <button
                type="button"
                onClick={() => {
                  void onLogout();
                }}
                className="px-3 py-2 rounded-lg hover:text-[#F8FAFC] hover:bg-white/[0.04] transition-colors whitespace-nowrap shrink-0 text-[#94A3B8] cursor-pointer"
              >
                Log Out
              </button>
            ) : (
              <a
                href="/login"
                onClick={(e) =>
                  handleNavClick(e, () => onNavigate({ page: 'login' }))
                }
                className={`relative px-3 py-2 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  currentRoute.page === 'login'
                    ? 'text-[#F8FAFC] font-semibold'
                    : 'hover:text-[#F8FAFC] hover:bg-white/[0.04]'
                }`}
              >
                <span>Login</span>
                {currentRoute.page === 'login' && (
                  <motion.span
                    layoutId="navbar-active-indicator"
                    className="absolute inset-x-2 -bottom-[11px] h-0.5 bg-[#8B5CF6] rounded-full"
                  />
                )}
              </a>
            )}
          </nav>

          {/* Primary CTA Action */}
          <div className="flex items-center gap-2.5 shrink-0">
            {userProfile ? (
              <button
                type="button"
                onClick={() => onNavigate({ page: 'list-item' })}
                className="hidden sm:inline-flex px-3.5 py-2 text-xs font-semibold text-white bg-[#8B5CF6] hover:bg-[#7C3AED] rounded-lg transition-all bb-glow-button whitespace-nowrap shrink-0 cursor-pointer"
              >
                + List Item
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate({ page: 'signup' })}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-[#8B5CF6] hover:bg-[#7C3AED] rounded-lg transition-all bb-glow-button whitespace-nowrap shrink-0 cursor-pointer"
              >
                Sign Up
              </button>
            )}

            <button
              type="button"
              aria-label={
                mobileMenuOpen
                  ? 'Close navigation menu'
                  : 'Open navigation menu'
              }
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-white/[0.08] bg-[#161E2E] text-[#F8FAFC] hover:bg-[#1D293B] cursor-pointer"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            aria-label="Mobile Navigation"
            className="md:hidden bg-[#111827] border-b border-white/[0.08] px-4 pt-3 pb-5 space-y-3 overflow-hidden"
          >
            {/* Mobile Search & Location Controls */}
            <form onSubmit={handleNavbarSearchSubmit} className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  aria-label="Mobile search rentals"
                  value={searchQuery}
                  onChange={(e) => onSearchQueryChange(e.target.value)}
                  placeholder="Search cameras, tools, consoles..."
                  className="w-full pl-9 pr-3 py-2 bg-[#161E2E] border border-white/[0.08] rounded-lg text-sm text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div className="flex items-center gap-2 bg-[#161E2E] border border-white/[0.08] rounded-lg px-3 py-2">
                <MapPin className="w-4 h-4 text-[#8B5CF6] shrink-0" />
                <label
                  htmlFor="mobile-location-select"
                  className="text-xs font-medium text-[#94A3B8] shrink-0"
                >
                  City:
                </label>
                <select
                  id="mobile-location-select"
                  value={selectedCity}
                  onChange={(e) =>
                    handleLocationSelect(e.target.value as IndianCity | 'All')
                  }
                  className="w-full bg-transparent text-xs font-semibold text-[#F8FAFC] focus:outline-none"
                >
                  <option value="All" className="bg-[#111827]">
                    All India
                  </option>
                  {ALL_CITIES.map((city) => (
                    <option key={city} value={city} className="bg-[#111827]">
                      {city}
                    </option>
                  ))}
                </select>
              </div>
            </form>

            <div className="space-y-1 pt-1 border-t border-white/[0.08]">
              <a
                href="/browse"
                onClick={(e) =>
                  handleNavClick(e, () => onNavigate({ page: 'browse' }))
                }
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-[#F8FAFC] hover:bg-[#161E2E]"
              >
                Browse
              </a>
              <a
                href="/list-item"
                onClick={(e) =>
                  handleNavClick(e, () => onNavigate({ page: 'list-item' }))
                }
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-[#F8FAFC] hover:bg-[#161E2E]"
              >
                List an Item
              </a>
              <a
                href="/dashboard"
                onClick={(e) =>
                  handleNavClick(e, () => onNavigate({ page: 'dashboard' }))
                }
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-[#F8FAFC] hover:bg-[#161E2E]"
              >
                Dashboard
              </a>
              <a
                href="/profile"
                onClick={(e) =>
                  handleNavClick(e, () => onNavigate({ page: 'profile' }))
                }
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-[#F8FAFC] hover:bg-[#161E2E]"
              >
                {userProfile ? `Profile (${userProfile.name})` : 'Profile'}
              </a>
              <a
                href="/#how-it-works"
                onClick={(e) => handleNavClick(e, onScrollToHowItWorks)}
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-[#F8FAFC] hover:bg-[#161E2E]"
              >
                How It Works
              </a>
              {rentalRequests.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenRequestsModal();
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-[#06B6D4] hover:bg-[#161E2E]"
                >
                  My Rental Requests ({rentalRequests.length})
                </button>
              )}
              {userProfile ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    void onLogout();
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[#94A3B8] hover:bg-[#161E2E]"
                >
                  Log Out
                </button>
              ) : (
                <a
                  href="/login"
                  onClick={(e) =>
                    handleNavClick(e, () => onNavigate({ page: 'login' }))
                  }
                  className="block px-3 py-2.5 rounded-lg text-sm font-medium text-[#F8FAFC] hover:bg-[#161E2E]"
                >
                  Login
                </a>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
};
