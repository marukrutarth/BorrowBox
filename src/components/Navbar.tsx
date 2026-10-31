import React, { useState } from 'react';
import { LayoutDashboard, MapPin, Menu, Search, User, X } from 'lucide-react';
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

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left Zone: BorrowBox Wordmark + Location Selector */}
        <div className="flex items-center gap-4 shrink-0">
          <a
            href="/"
            onClick={(e) =>
              handleNavClick(e, () => onNavigate({ page: 'home' }))
            }
            className="text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600"
          >
            BorrowBox
          </a>

          {/* Location Selector */}
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
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
              className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="All">All India</option>
              {ALL_CITIES.map((city) => (
                <option key={city} value={city}>
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
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            aria-label="Search rentals in navbar"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search cameras, tools, PS5..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 transition-colors"
          />
        </form>

        {/* Right Zone: Navigation Links (Browse, List an Item, Dashboard, Profile) + Auth Actions */}
        <div className="flex items-center gap-5 shrink-0">
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-4 text-sm font-medium text-slate-600"
          >
            <a
              href="/browse"
              onClick={(e) =>
                handleNavClick(e, () => onNavigate({ page: 'browse' }))
              }
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
                currentRoute.page === 'browse' ||
                currentRoute.page === 'details'
                  ? 'border-indigo-600 text-slate-900 font-semibold'
                  : 'border-transparent'
              }`}
            >
              Browse
            </a>

            <a
              href="/list-item"
              onClick={(e) =>
                handleNavClick(e, () => onNavigate({ page: 'list-item' }))
              }
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
                currentRoute.page === 'list-item'
                  ? 'border-indigo-600 text-slate-900 font-semibold'
                  : 'border-transparent'
              }`}
            >
              List an Item
            </a>

            <a
              href="/dashboard"
              onClick={(e) =>
                handleNavClick(e, () => onNavigate({ page: 'dashboard' }))
              }
              className={`inline-flex items-center gap-1.5 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
                currentRoute.page === 'dashboard'
                  ? 'border-indigo-600 text-slate-900 font-semibold'
                  : 'border-transparent'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-slate-500" />
              <span>Dashboard</span>
              {unreadNotificationsCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-600 text-white rounded-full tabular-nums">
                  {unreadNotificationsCount}
                </span>
              )}
            </a>

            <a
              href="/#how-it-works"
              onClick={(e) => handleNavClick(e, onScrollToHowItWorks)}
              className="hidden xl:inline-block hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent"
            >
              How It Works
            </a>

            {rentalRequests.length > 0 && (
              <button
                type="button"
                onClick={onOpenRequestsModal}
                className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 text-indigo-600 font-semibold cursor-pointer"
              >
                Requests ({rentalRequests.length})
              </button>
            )}

            <a
              href="/profile"
              onClick={(e) =>
                handleNavClick(e, () => onNavigate({ page: 'profile' }))
              }
              className={`inline-flex items-center gap-1.5 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
                currentRoute.page === 'profile'
                  ? 'border-indigo-600 text-slate-900 font-semibold'
                  : 'border-transparent'
              }`}
            >
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>
                {userProfile
                  ? `Profile (${userProfile.name.split(' ')[0]})`
                  : 'Profile'}
              </span>
            </a>

            {userProfile ? (
              <button
                type="button"
                onClick={() => {
                  void onLogout();
                }}
                className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 text-slate-600 cursor-pointer"
              >
                Log Out
              </button>
            ) : (
              <a
                href="/login"
                onClick={(e) =>
                  handleNavClick(e, () => onNavigate({ page: 'login' }))
                }
                className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
                  currentRoute.page === 'login'
                    ? 'border-indigo-600 text-slate-900 font-semibold'
                    : 'border-transparent'
                }`}
              >
                Login
              </a>
            )}
          </nav>

          {/* Primary CTA Action */}
          <div className="flex items-center gap-2.5 shrink-0">
            {userProfile ? (
              <button
                type="button"
                onClick={() => onNavigate({ page: 'list-item' })}
                className="hidden sm:inline-flex px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                + List Item
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate({ page: 'signup' })}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
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
              className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
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
      {mobileMenuOpen && (
        <nav
          aria-label="Mobile Navigation"
          className="md:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-5 space-y-3"
        >
          {/* Mobile Search & Location Controls */}
          <form onSubmit={handleNavbarSearchSubmit} className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                aria-label="Mobile search rentals"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                placeholder="Search cameras, tools, consoles..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <MapPin className="w-4 h-4 text-indigo-600 shrink-0" />
              <label
                htmlFor="mobile-location-select"
                className="text-xs font-medium text-slate-600 shrink-0"
              >
                City:
              </label>
              <select
                id="mobile-location-select"
                value={selectedCity}
                onChange={(e) =>
                  handleLocationSelect(e.target.value as IndianCity | 'All')
                }
                className="w-full bg-transparent text-xs font-semibold text-slate-900 focus:outline-none"
              >
                <option value="All">All India</option>
                {ALL_CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
          </form>

          <div className="space-y-1 pt-1 border-t border-slate-100">
            <a
              href="/browse"
              onClick={(e) =>
                handleNavClick(e, () => onNavigate({ page: 'browse' }))
              }
              className="block px-3 py-2.5 rounded-lg text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Browse
            </a>
            <a
              href="/list-item"
              onClick={(e) =>
                handleNavClick(e, () => onNavigate({ page: 'list-item' }))
              }
              className="block px-3 py-2.5 rounded-lg text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              List an Item
            </a>
            <a
              href="/dashboard"
              onClick={(e) =>
                handleNavClick(e, () => onNavigate({ page: 'dashboard' }))
              }
              className="block px-3 py-2.5 rounded-lg text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Dashboard
            </a>
            <a
              href="/profile"
              onClick={(e) =>
                handleNavClick(e, () => onNavigate({ page: 'profile' }))
              }
              className="block px-3 py-2.5 rounded-lg text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              {userProfile ? `Profile (${userProfile.name})` : 'Profile'}
            </a>
            <a
              href="/#how-it-works"
              onClick={(e) => handleNavClick(e, onScrollToHowItWorks)}
              className="block px-3 py-2.5 rounded-lg text-sm font-medium text-slate-800 hover:bg-slate-50"
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
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-indigo-600 hover:bg-indigo-50"
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
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Log Out
              </button>
            ) : (
              <a
                href="/login"
                onClick={(e) =>
                  handleNavClick(e, () => onNavigate({ page: 'login' }))
                }
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-slate-800 hover:bg-slate-50"
              >
                Login
              </a>
            )}
          </div>
        </nav>
      )}
    </header>
  );
};
