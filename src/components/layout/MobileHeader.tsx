import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Compass,
  Heart,
  HelpCircle,
  Home,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  MapPin,
  Menu,
  Plus,
  Search,
  Shield,
  User,
  X,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
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
import { mobileMenuPanelTransition } from '../../utils/motionVariants';
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
  currentRoute,
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
  const prefersReducedMotion = useReducedMotion();

  const hasVerifiedAdminAccess = shouldShowAdminPanelOption(verifiedAdminRecord);
  const adminRoleLabel =
    hasVerifiedAdminAccess && verifiedAdminRecord
      ? ROLE_DEFINITIONS[verifiedAdminRecord.role]?.label || 'Administrator'
      : null;

  useEffect(() => {
    if (!menuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

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
      {/* Compact 56px Mobile Header Bar: Logo on Left, Search Icon & Profile/Menu Button on Right */}
      <div className="bb-container h-14 flex items-center justify-between gap-2">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            setMenuOpen(false);
            setSearchBarOpen(false);
            onNavigate({ page: 'home' });
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="inline-flex items-center gap-1.5 text-base font-bold tracking-tight text-[#F8FAFC] min-h-[44px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B5CF6]"
        >
          <img
            src={BORROWBOX_TRANSPARENT_SYMBOL_ASSET_PATH}
            alt=""
            className="w-9 h-9 object-contain shrink-0 -mx-1"
          />
          <span className="truncate">
            Borrow<span className="text-[#8B5CF6]">Box</span>
          </span>
        </a>

        {/* Right: Search Icon & Profile/Menu Button (Minimum 44px touch targets) */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            aria-label="Toggle search bar"
            aria-expanded={searchBarOpen}
            onClick={() => {
              setSearchBarOpen((prev) => !prev);
              setMenuOpen(false);
            }}
            className={`inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl border bb-btn-interactive cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B5CF6] ${
              searchBarOpen
                ? 'bg-[#1D293B] border-[#8B5CF6]/45 text-[#F8FAFC]'
                : 'bg-[#161E2E] border-white/[0.08] text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            type="button"
            aria-label={
              menuOpen ? 'Close menu' : 'Open profile and navigation menu'
            }
            aria-expanded={menuOpen}
            onClick={() => {
              setMenuOpen((prev) => !prev);
              setSearchBarOpen(false);
            }}
            className={`inline-flex items-center justify-center gap-1.5 min-w-[44px] min-h-[44px] px-2.5 rounded-xl border bb-btn-interactive cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B5CF6] ${
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
      <AnimatePresence initial={false}>
        {searchBarOpen && (
          <motion.form
            initial={
              prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -6 }
            }
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            onSubmit={handleMobileSearchSubmit}
            className="bg-[#111827] border-t border-white/[0.08] bb-container py-3 space-y-2.5"
          >
            <div className="relative">
              <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                aria-label="Mobile search rentals"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                placeholder="What are you looking to rent?"
                className="w-full min-h-[44px] pl-9 pr-3 py-2 bg-[#161E2E] border border-white/[0.08] rounded-xl text-sm text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-[#161E2E] border border-white/[0.08] rounded-xl px-3 min-h-[44px] flex-1 min-w-0">
                <MapPin className="w-4 h-4 text-[#8B5CF6] shrink-0" />
                <select
                  aria-label="Mobile city selector"
                  value={selectedCity}
                  onChange={(e) =>
                    onCityChange(e.target.value as IndianCity | 'All')
                  }
                  className="w-full bg-transparent text-xs font-medium text-[#F8FAFC] focus:outline-none truncate"
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
                className="min-h-[44px] px-4 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold rounded-xl bb-glow-button cursor-pointer shrink-0"
              >
                Search
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Mobile Slide-Over Menu Drawer (Portaled to document.body to escape header backdrop-filter containment) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {menuOpen && (
              <div className="fixed inset-0 z-50 md:hidden">
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setMenuOpen(false)}
                  aria-hidden="true"
                  className="fixed inset-0 bg-black/65 backdrop-blur-xs"
                />

                {/* Side Panel */}
                <motion.nav
                  initial={
                    prefersReducedMotion
                      ? { opacity: 0 }
                      : { opacity: 0, x: '100%' }
                  }
                  animate={
                    prefersReducedMotion ? { opacity: 1 } : { opacity: 1, x: 0 }
                  }
                  exit={
                    prefersReducedMotion
                      ? { opacity: 0 }
                      : { opacity: 0, x: '100%' }
                  }
                  transition={mobileMenuPanelTransition}
                  aria-label="Mobile Navigation"
                  className="fixed top-0 right-0 bottom-0 w-full max-w-[340px] bg-[#111827] border-l border-white/[0.08] shadow-2xl flex flex-col z-10 overflow-y-auto"
                >
                  {/* Menu Top Bar with Clear Close Action */}
                  <div className="h-14 px-4 border-b border-white/[0.08] flex items-center justify-between gap-3 shrink-0">
                    <div className="inline-flex items-center gap-1.5 text-sm font-bold text-[#F8FAFC]">
                      <img
                        src={BORROWBOX_TRANSPARENT_SYMBOL_ASSET_PATH}
                        alt=""
                        className="w-8 h-8 object-contain shrink-0 -mx-1"
                      />
                      <span>
                        Borrow<span className="text-[#8B5CF6]">Box</span>
                      </span>
                    </div>

                    <button
                      type="button"
                      aria-label="Close mobile menu"
                      onClick={() => setMenuOpen(false)}
                      className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl bg-[#161E2E] border border-white/[0.08] text-[#94A3B8] hover:text-[#F8FAFC] bb-btn-interactive cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-4 space-y-5 flex-1 pb-24">
                    {/* Account Summary Card (if signed in) */}
                    {userProfile && (
                      <div className="p-3.5 rounded-xl bg-[#161E2E] border border-white/[0.08] space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-8 h-8 rounded-full bg-[#8B5CF6] text-white text-xs font-bold flex items-center justify-center shrink-0">
                              {userProfile.name.charAt(0).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-[#F8FAFC] truncate">
                                {userProfile.name}
                              </p>
                              <p className="text-[11px] text-[#94A3B8] truncate">
                                {userProfile.email}
                              </p>
                            </div>
                          </div>
                          {hasVerifiedAdminAccess && adminRoleLabel && (
                            <span className="px-2 py-0.5 rounded bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 text-[10px] font-semibold text-purple-300 shrink-0">
                              {adminRoleLabel}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Primary Mobile Navigation Links */}
                    <div className="space-y-1">
                      <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-[#64748B] mb-1.5">
                        Navigation
                      </p>

                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          onNavigate({ page: 'home' });
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={`w-full min-h-[44px] text-left px-3 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 bb-btn-interactive cursor-pointer ${
                          currentRoute.page === 'home'
                            ? 'bg-[#1D293B] text-[#F8FAFC]'
                            : 'text-[#F8FAFC] hover:bg-[#161E2E]'
                        }`}
                      >
                        <Home className="w-4 h-4 text-[#8B5CF6] shrink-0" />
                        <span>Home</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          onNavigate({ page: 'browse' });
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={`w-full min-h-[44px] text-left px-3 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 bb-btn-interactive cursor-pointer ${
                          currentRoute.page === 'browse'
                            ? 'bg-[#1D293B] text-[#F8FAFC]'
                            : 'text-[#F8FAFC] hover:bg-[#161E2E]'
                        }`}
                      >
                        <Compass className="w-4 h-4 text-[#8B5CF6] shrink-0" />
                        <span>Explore Rentals</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          onOpenHowItWorks();
                        }}
                        className="w-full min-h-[44px] text-left px-3 py-2.5 rounded-xl text-sm font-medium text-[#F8FAFC] hover:bg-[#161E2E] flex items-center gap-3 bb-btn-interactive cursor-pointer"
                      >
                        <HelpCircle className="w-4 h-4 text-[#94A3B8] shrink-0" />
                        <span>How It Works</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          onOpenWishlist();
                        }}
                        className="w-full min-h-[44px] text-left px-3 py-2.5 rounded-xl text-sm font-medium text-[#F8FAFC] hover:bg-[#161E2E] flex items-center justify-between bb-btn-interactive cursor-pointer"
                      >
                        <span className="inline-flex items-center gap-3">
                          <Heart
                            className={`w-4 h-4 shrink-0 ${
                              wishlistCount > 0
                                ? 'fill-[#8B5CF6] text-[#8B5CF6]'
                                : 'text-[#94A3B8]'
                            }`}
                          />
                          <span>Wishlist</span>
                        </span>
                        {wishlistCount > 0 && (
                          <span className="px-2 py-0.5 rounded bg-[#161E2E] border border-white/[0.08] text-xs font-mono-tabular text-[#F8FAFC]">
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
                        className="w-full min-h-[44px] text-left px-3 py-2.5 rounded-xl text-sm font-semibold text-[#8B5CF6] hover:bg-[#161E2E] flex items-center gap-3 bb-btn-interactive cursor-pointer"
                      >
                        <Plus className="w-4 h-4 shrink-0" />
                        <span>List Your Item</span>
                      </button>
                    </div>

                    {/* Separator + Categories */}
                    <div className="pt-4 border-t border-white/[0.08]">
                      <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-[#64748B] mb-2">
                        Categories
                      </p>
                      <div className="flex flex-wrap gap-1.5 px-1">
                        {ALL_CATEGORIES.map((category) => (
                          <button
                            key={category}
                            type="button"
                            onClick={() => {
                              setMenuOpen(false);
                              onNavigate({ page: 'browse', category });
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="min-h-[36px] px-3 py-1.5 rounded-lg bg-[#161E2E] hover:bg-[#1D293B] border border-white/[0.08] text-xs text-[#94A3B8] hover:text-[#F8FAFC] bb-btn-interactive cursor-pointer"
                          >
                            {category}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Separator + Account Options According to Authentication Status */}
                    <div className="pt-4 border-t border-white/[0.08] space-y-1">
                      <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-[#64748B] mb-1.5">
                        Account
                      </p>

                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          onNavigate({ page: 'dashboard' });
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="w-full min-h-[44px] text-left px-3 py-2.5 rounded-xl text-sm font-medium text-[#F8FAFC] hover:bg-[#161E2E] flex items-center gap-3 bb-btn-interactive cursor-pointer"
                      >
                        <LayoutDashboard className="w-4 h-4 text-[#8B5CF6] shrink-0" />
                        <span>Rentals Dashboard</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          onNavigate({ page: 'profile' });
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="w-full min-h-[44px] text-left px-3 py-2.5 rounded-xl text-sm font-medium text-[#F8FAFC] hover:bg-[#161E2E] flex items-center gap-3 bb-btn-interactive cursor-pointer"
                      >
                        <User className="w-4 h-4 text-[#94A3B8] shrink-0" />
                        <span className="truncate">
                          {userProfile
                            ? `Profile (${userProfile.name})`
                            : 'Profile & Settings'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          onNavigate({ page: 'support' });
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="w-full min-h-[44px] text-left px-3 py-2.5 rounded-xl text-sm font-medium text-[#F8FAFC] hover:bg-[#161E2E] flex items-center gap-3 bb-btn-interactive cursor-pointer"
                      >
                        <LifeBuoy className="w-4 h-4 text-[#06B6D4] shrink-0" />
                        <span>My Support</span>
                      </button>

                      {/* Dynamic Admin Panel Option — strictly for verified active administrators */}
                      {userProfile && hasVerifiedAdminAccess && (
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            onNavigate({ page: 'admin' });
                          }}
                          className="w-full min-h-[44px] text-left px-3 py-2.5 rounded-xl text-sm font-semibold text-[#F8FAFC] bg-[#8B5CF6]/15 border border-[#8B5CF6]/35 flex items-center justify-between gap-2 bb-btn-interactive cursor-pointer mt-1"
                        >
                          <span className="inline-flex items-center gap-2.5">
                            <Shield className="w-4 h-4 text-[#8B5CF6] shrink-0" />
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
                          className="w-full min-h-[44px] text-left px-3 py-2.5 rounded-xl text-sm font-semibold text-[#06B6D4] hover:bg-[#161E2E] bb-btn-interactive cursor-pointer"
                        >
                          Session Requests ({rentalRequests.length})
                        </button>
                      )}

                      {userProfile ? (
                        <div className="pt-2 mt-2 border-t border-white/[0.08]">
                          <button
                            type="button"
                            onClick={() => {
                              setMenuOpen(false);
                              void onLogout();
                            }}
                            className="w-full min-h-[44px] text-left px-3 py-2.5 rounded-xl text-sm font-medium text-[#EF4444] hover:bg-[#EF4444]/10 flex items-center gap-3 bb-btn-interactive cursor-pointer"
                          >
                            <LogOut className="w-4 h-4 shrink-0" />
                            <span>Log Out</span>
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 pt-3">
                          <button
                            type="button"
                            onClick={() => {
                              setMenuOpen(false);
                              onNavigate({ page: 'login' });
                            }}
                            className="min-h-[44px] py-2.5 rounded-xl bg-[#161E2E] hover:bg-[#1D293B] border border-white/[0.08] text-xs font-semibold text-[#F8FAFC] bb-btn-interactive cursor-pointer"
                          >
                            Log In
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMenuOpen(false);
                              onNavigate({ page: 'signup' });
                            }}
                            className="min-h-[44px] py-2.5 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-xs font-semibold text-white bb-glow-button cursor-pointer"
                          >
                            Sign Up
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.nav>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};
