import React, { useState } from 'react';
import {
  Heart,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Plus,
  Search,
  Shield,
  User,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AdminRegistryRecord,
  BorrowBoxUserProfile,
  IndianCity,
  RentalRequestRecord,
} from '../../types/marketplace';
import {
  ROLE_DEFINITIONS,
  shouldShowAdminPanelOption,
} from '../../utils/adminRbac';
import { ALL_CATEGORIES, ALL_CITIES } from '../../utils/rentalLogic';
import { BORROWBOX_TRANSPARENT_SYMBOL_ASSET_PATH } from '../../utils/introAnimation';
import { PageRoute } from '../Navbar';

export interface MobileHeaderProps {
  currentRoute: PageRoute;
  onNavigate: (route: PageRoute) => void;
  onOpenHowItWorks: () => void;
  onOpenWishlist: () => void;
  wishlistCount: number;
  userProfile: BorrowBoxUserProfile | null;
  verifiedAdminRecord?: AdminRegistryRecord | null;
  onLogout: () => Promise<void>;
  rentalRequests: RentalRequestRecord[];
  onOpenRequestsModal: () => void;
  selectedCity: IndianCity | 'All';
  onCityChange: (city: IndianCity | 'All') => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  onNavigate,
  onOpenHowItWorks,
  onOpenWishlist,
  wishlistCount,
  userProfile,
  verifiedAdminRecord = null,
  onLogout,
  rentalRequests,
  onOpenRequestsModal,
  selectedCity,
  onCityChange,
  searchQuery,
  onSearchQueryChange,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchBarOpen, setSearchBarOpen] = useState(false);

  const hasVerifiedAdminAccess = shouldShowAdminPanelOption(verifiedAdminRecord);
  const adminRoleLabel =
    hasVerifiedAdminAccess && verifiedAdminRecord
      ? ROLE_DEFINITIONS[verifiedAdminRecord.role]?.label || 'Administrator'
      : null;

  const handleMobileSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchBarOpen(false);
    setMenuOpen(false);
    onNavigate({
      page: 'browse',
      query: searchQuery.trim() || undefined,
      city: selectedCity !== 'All' ? selectedCity : undefined,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="md:hidden">
      {/* Compact 64px Mobile Header Bar: Logo on Left, Search Icon & Profile/Menu Button on Right */}
      <div className="bb-container h-16 flex items-center justify-between gap-3">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            setMenuOpen(false);
            setSearchBarOpen(false);
            onNavigate({ page: 'home' });
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="inline-flex items-center gap-2 text-base font-bold tracking-tight text-[#F8FAFC]"
        >
          <span className="w-8 h-8 rounded-lg bg-[#161E2E] border border-white/[0.08] flex items-center justify-center p-1">
            <img
              src={BORROWBOX_TRANSPARENT_SYMBOL_ASSET_PATH}
              alt=""
              className="w-full h-full object-contain"
            />
          </span>
          <span>
            Borrow<span className="text-[#8B5CF6]">Box</span>
          </span>
        </a>

        {/* Right: Search Icon & Profile/Menu Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Toggle search bar"
            aria-expanded={searchBarOpen}
            onClick={() => {
              setSearchBarOpen((prev) => !prev);
              setMenuOpen(false);
            }}
            className={`inline-flex items-center justify-center w-10 h-10 rounded-lg border transition-colors cursor-pointer ${
              searchBarOpen
                ? 'bg-[#1D293B] border-[#8B5CF6]/45 text-[#F8FAFC]'
                : 'bg-[#161E2E] border-white/[0.08] text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            type="button"
            aria-label={menuOpen ? 'Close menu' : 'Open profile and navigation menu'}
            aria-expanded={menuOpen}
            onClick={() => {
              setMenuOpen((prev) => !prev);
              setSearchBarOpen(false);
            }}
            className={`inline-flex items-center gap-1.5 h-10 px-2.5 rounded-lg border transition-colors cursor-pointer ${
              menuOpen
                ? 'bg-[#1D293B] border-[#8B5CF6]/45 text-[#F8FAFC]'
                : 'bg-[#161E2E] border-white/[0.08] text-[#F8FAFC]'
            }`}
          >
            {userProfile ? (
              <span className="w-5 h-5 rounded-full bg-[#8B5CF6] text-white text-[11px] font-bold flex items-center justify-center">
                {userProfile.name.charAt(0).toUpperCase()}
              </span>
            ) : (
              <User className="w-4 h-4 text-[#94A3B8]" />
            )}
            {menuOpen ? (
              <X className="w-4 h-4 text-[#94A3B8]" />
            ) : (
              <Menu className="w-4 h-4 text-[#94A3B8]" />
            )}
          </button>
        </div>
      </div>

      {/* Expandable Mobile Search Bar */}
      <AnimatePresence>
        {searchBarOpen && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            onSubmit={handleMobileSearchSubmit}
            className="bg-[#111827] border-t border-white/[0.08] bb-container py-3 space-y-2.5 overflow-hidden"
          >
            <div className="relative">
              <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                aria-label="Mobile search rentals"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                placeholder="What are you looking to rent?"
                className="w-full pl-9 pr-3 py-2 bg-[#161E2E] border border-white/[0.08] rounded-lg text-sm text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-[#161E2E] border border-white/[0.08] rounded-lg px-3 py-2 flex-1">
                <MapPin className="w-4 h-4 text-[#8B5CF6] shrink-0" />
                <select
                  aria-label="Mobile city selector"
                  value={selectedCity}
                  onChange={(e) =>
                    onCityChange(e.target.value as IndianCity | 'All')
                  }
                  className="w-full bg-transparent text-xs font-medium text-[#F8FAFC] focus:outline-none"
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
              <button
                type="submit"
                className="px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Search
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Mobile Navigation & Profile Drawer */}
      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            aria-label="Mobile Navigation"
            className="bg-[#111827] border-t border-white/[0.08] bb-container py-4 space-y-4 overflow-hidden"
          >
            {/* Primary Mobile Navigation Links */}
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onNavigate({ page: 'browse' });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[#F8FAFC] hover:bg-[#161E2E] cursor-pointer"
              >
                Explore Rentals
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenHowItWorks();
                }}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[#F8FAFC] hover:bg-[#161E2E] cursor-pointer"
              >
                How It Works
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenWishlist();
                }}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[#F8FAFC] hover:bg-[#161E2E] flex items-center justify-between cursor-pointer"
              >
                <span className="inline-flex items-center gap-2">
                  <Heart
                    className={`w-4 h-4 ${
                      wishlistCount > 0 ? 'fill-[#8B5CF6] text-[#8B5CF6]' : 'text-[#94A3B8]'
                    }`}
                  />
                  <span>Wishlist</span>
                </span>
                {wishlistCount > 0 && (
                  <span className="px-2 py-0.5 rounded bg-[#161E2E] text-xs font-mono-tabular text-[#F8FAFC]">
                    {wishlistCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onNavigate({ page: 'list-item' });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-[#8B5CF6] hover:bg-[#161E2E] flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>List Your Item</span>
              </button>
            </div>

            {/* Quick Category Pills */}
            <div className="pt-2 border-t border-white/[0.08]">
              <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-[#64748B] mb-2">
                Categories
              </p>
              <div className="flex flex-wrap gap-1.5 px-2">
                {ALL_CATEGORIES.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onNavigate({ page: 'browse', category });
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-[#161E2E] border border-white/[0.08] text-xs text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer"
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Account & Dashboard Section */}
            <div className="pt-2 border-t border-white/[0.08] space-y-1">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onNavigate({ page: 'dashboard' });
                }}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[#F8FAFC] hover:bg-[#161E2E] flex items-center gap-2 cursor-pointer"
              >
                <LayoutDashboard className="w-4 h-4 text-[#8B5CF6]" />
                <span>Dashboard</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onNavigate({ page: 'profile' });
                }}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[#F8FAFC] hover:bg-[#161E2E] flex items-center gap-2 cursor-pointer"
              >
                <User className="w-4 h-4 text-[#94A3B8]" />
                <span>
                  {userProfile ? `Profile (${userProfile.name})` : 'Profile'}
                </span>
              </button>

              {/* Dynamic Admin Panel Option */}
              {userProfile && hasVerifiedAdminAccess && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onNavigate({ page: 'admin' });
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-[#F8FAFC] bg-[#8B5CF6]/15 border border-[#8B5CF6]/35 flex items-center justify-between cursor-pointer"
                >
                  <span className="inline-flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#8B5CF6]" />
                    <span>Admin Panel</span>
                  </span>
                  {adminRoleLabel && (
                    <span className="text-xs font-mono text-[#06B6D4]">
                      {adminRoleLabel}
                    </span>
                  )}
                </button>
              )}

              {rentalRequests.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenRequestsModal();
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-[#06B6D4] hover:bg-[#161E2E] cursor-pointer"
                >
                  Session Requests ({rentalRequests.length})
                </button>
              )}

              {userProfile ? (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    void onLogout();
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[#EF4444] hover:bg-[#161E2E] flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onNavigate({ page: 'login' });
                    }}
                    className="py-2.5 rounded-lg bg-[#161E2E] border border-white/[0.08] text-xs font-semibold text-[#F8FAFC] cursor-pointer"
                  >
                    Log In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onNavigate({ page: 'signup' });
                    }}
                    className="py-2.5 rounded-lg bg-[#8B5CF6] hover:bg-[#7C3AED] text-xs font-semibold text-white cursor-pointer"
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </div>
  );
};
