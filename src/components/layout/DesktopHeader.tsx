import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  Heart,
  LayoutDashboard,
  LogOut,
  MapPin,
  Plus,
  Search,
  Shield,
  User,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AdminRegistryRecord,
  BorrowBoxUserProfile,
  CategoryName,
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

export interface DesktopHeaderProps {
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
  unreadNotificationsCount?: number;
}

const CATEGORY_DISPLAY_LABELS: Record<CategoryName, string> = {
  Electronics: 'Electronics & Projectors',
  Photography: 'Cameras & Photography',
  Gaming: 'Gaming & Consoles',
  Tools: 'Tools & DIY Equipment',
  Outdoor: 'Travel & Outdoor Gear',
  Events: 'Events & Audio Systems',
  'Musical Instruments': 'Musical Instruments',
  Education: 'Education & Study Gear',
};

export const DesktopHeader: React.FC<DesktopHeaderProps> = ({
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
  unreadNotificationsCount = 0,
}) => {
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const categoriesRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const hasVerifiedAdminAccess = shouldShowAdminPanelOption(verifiedAdminRecord);
  const adminRoleLabel =
    hasVerifiedAdminAccess && verifiedAdminRecord
      ? ROLE_DEFINITIONS[verifiedAdminRecord.role]?.label || 'Administrator'
      : null;

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        categoriesRef.current &&
        !categoriesRef.current.contains(event.target as Node)
      ) {
        setCategoriesOpen(false);
      }
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setSearchOpen(false);
      }
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (searchOpen) {
      window.setTimeout(() => searchInputRef.current?.focus(), 40);
    }
  }, [searchOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchOpen(false);
    onNavigate({
      page: 'browse',
      query: searchQuery.trim() || undefined,
      city: selectedCity !== 'All' ? selectedCity : undefined,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isExploreActive =
    currentRoute.page === 'browse' || currentRoute.page === 'details';

  return (
    <div className="hidden md:flex bb-container h-16 items-center justify-between gap-6">
      {/* Left: BorrowBox Brand Logo */}
      <div className="flex items-center gap-3 shrink-0">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onNavigate({ page: 'home' });
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="group inline-flex items-center gap-2.5 text-lg font-bold tracking-tight text-[#F8FAFC] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8B5CF6]"
        >
          <span className="w-8 h-8 rounded-lg bg-[#161E2E] border border-white/[0.08] flex items-center justify-center p-1 group-hover:border-[#8B5CF6]/50 transition-colors duration-150">
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
      </div>

      {/* Centre: Explore, Categories, How It Works */}
      <nav
        aria-label="Primary Navigation"
        className="flex items-center gap-1 lg:gap-2 text-sm font-medium text-[#94A3B8]"
      >
        <a
          href="/browse"
          onClick={(e) => {
            e.preventDefault();
            onNavigate({ page: 'browse' });
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`px-3.5 py-2 rounded-lg transition-colors duration-150 ${
            isExploreActive
              ? 'text-[#F8FAFC] bg-white/[0.05]'
              : 'hover:text-[#F8FAFC] hover:bg-white/[0.03]'
          }`}
        >
          Explore
        </a>

        {/* Categories Dropdown */}
        <div ref={categoriesRef} className="relative">
          <button
            type="button"
            aria-expanded={categoriesOpen}
            onClick={() => setCategoriesOpen((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bb-btn-interactive cursor-pointer ${
              categoriesOpen
                ? 'text-[#F8FAFC] bg-white/[0.05]'
                : 'hover:text-[#F8FAFC] hover:bg-white/[0.03]'
            }`}
          >
            <span>Categories</span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-[#64748B] transition-transform duration-150 ${
                categoriesOpen ? 'rotate-180 text-[#F8FAFC]' : ''
              }`}
            />
          </button>

          <AnimatePresence>
            {categoriesOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                role="menu"
                aria-label="Rental Categories"
                className="absolute left-1/2 -translate-x-1/2 mt-2 w-64 rounded-xl bg-[#161E2E] border border-white/[0.08] shadow-2xl p-2 z-50"
              >
                <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  Browse by Category
                </div>
                <div className="space-y-0.5 mt-1">
                  {ALL_CATEGORIES.map((category) => (
                    <button
                      key={category}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setCategoriesOpen(false);
                        onNavigate({ page: 'browse', category });
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1D293B] bb-btn-interactive flex items-center justify-between cursor-pointer"
                    >
                      <span>{CATEGORY_DISPLAY_LABELS[category] || category}</span>
                      <span className="text-[11px] text-[#64748B]">→</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          type="button"
          onClick={onOpenHowItWorks}
          className="px-3.5 py-2 rounded-lg hover:text-[#F8FAFC] hover:bg-white/[0.03] bb-btn-interactive cursor-pointer"
        >
          How It Works
        </button>
      </nav>

      {/* Right: Search access, List Your Item, Wishlist, Admin Panel (if verified), Profile */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Search Access */}
        <div ref={searchRef} className="relative">
          <button
            type="button"
            aria-label="Open quick search"
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen((prev) => !prev)}
            className={`inline-flex items-center gap-2 h-9 px-3 rounded-lg border text-xs font-medium bb-btn-interactive cursor-pointer ${
              searchOpen || searchQuery
                ? 'bg-[#1D293B] border-[#8B5CF6]/40 text-[#F8FAFC]'
                : 'bg-[#161E2E] border-white/[0.08] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-white/[0.16]'
            }`}
          >
            <Search className="w-3.5 h-3.5 text-[#8B5CF6] shrink-0" />
            <span className="hidden xl:inline max-w-[120px] truncate">
              {searchQuery ? searchQuery : 'Search'}
            </span>
          </button>

          <AnimatePresence>
            {searchOpen && (
              <motion.form
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                onSubmit={handleSearchSubmit}
                role="search"
                aria-label="Quick search rentals"
                className="absolute right-0 mt-2 w-80 rounded-xl bg-[#161E2E] border border-white/[0.08] shadow-2xl p-3 z-50 space-y-2.5"
              >
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="search"
                    aria-label="Search rentals in header"
                    value={searchQuery}
                    onChange={(e) => onSearchQueryChange(e.target.value)}
                    placeholder="What are you looking to rent?"
                    className="w-full pl-8 pr-3 py-2 bg-[#111827] border border-white/[0.08] rounded-lg text-xs text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 bg-[#111827] border border-white/[0.08] rounded-lg px-2.5 py-1.5 flex-1">
                    <MapPin className="w-3.5 h-3.5 text-[#8B5CF6] shrink-0" />
                    <select
                      aria-label="Select city for search"
                      value={selectedCity}
                      onChange={(e) =>
                        onCityChange(e.target.value as IndianCity | 'All')
                      }
                      className="w-full bg-transparent text-xs text-[#F8FAFC] focus:outline-none"
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
                    className="px-3.5 py-1.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold rounded-lg bb-glow-button cursor-pointer"
                  >
                    Search
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* Wishlist Button */}
        <button
          type="button"
          onClick={onOpenWishlist}
          aria-label={`Wishlist (${wishlistCount} saved items)`}
          className="relative inline-flex items-center justify-center h-9 px-2.5 rounded-lg bg-[#161E2E] border border-white/[0.08] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-white/[0.16] bb-btn-interactive cursor-pointer"
        >
          <Heart
            className={`w-4 h-4 transition-transform duration-200 ${
              wishlistCount > 0 ? 'fill-[#8B5CF6] text-[#8B5CF6] scale-110' : ''
            }`}
          />
          {wishlistCount > 0 && (
            <span className="ml-1.5 text-[11px] font-semibold text-[#F8FAFC] font-mono-tabular">
              {wishlistCount}
            </span>
          )}
        </button>

        {/* List Your Item CTA */}
        <button
          type="button"
          onClick={() => {
            onNavigate({ page: 'list-item' });
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold bb-glow-button whitespace-nowrap cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>List Your Item</span>
        </button>

        {/* Dynamic Admin Panel Link — strictly for verified active administrators */}
        {userProfile && hasVerifiedAdminAccess && (
          <a
            href="/admin"
            onClick={(e) => {
              e.preventDefault();
              onNavigate({ page: 'admin' });
            }}
            className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold bb-btn-interactive whitespace-nowrap ${
              currentRoute.page === 'admin'
                ? 'bg-[#8B5CF6] text-white'
                : 'bg-[#8B5CF6]/15 text-[#F8FAFC] border border-[#8B5CF6]/35 hover:bg-[#8B5CF6]/25'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-[#8B5CF6] shrink-0" />
            <span>Admin Panel</span>
          </a>
        )}

        {/* Profile / Account Control */}
        <div ref={profileRef} className="relative">
          <button
            type="button"
            aria-label={
              userProfile
                ? `Account menu for ${userProfile.name}`
                : 'Account and Profile menu'
            }
            aria-expanded={profileMenuOpen}
            onClick={() => setProfileMenuOpen((prev) => !prev)}
            className={`inline-flex items-center gap-2 h-9 px-2.5 rounded-lg border bb-btn-interactive cursor-pointer ${
              profileMenuOpen ||
              currentRoute.page === 'profile' ||
              currentRoute.page === 'dashboard'
                ? 'bg-[#1D293B] border-[#8B5CF6]/45 text-[#F8FAFC]'
                : 'bg-[#161E2E] border-white/[0.08] text-[#F8FAFC] hover:border-white/[0.16]'
            }`}
          >
            {userProfile ? (
              <>
                <span className="w-5 h-5 rounded-full bg-[#8B5CF6] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                  {userProfile.name.charAt(0).toUpperCase()}
                </span>
                <span className="text-xs font-medium max-w-[90px] truncate">
                  {userProfile.name.split(' ')[0]}
                </span>
              </>
            ) : (
              <>
                <User className="w-4 h-4 text-[#94A3B8]" />
                <span className="text-xs font-medium">Profile</span>
              </>
            )}
            {unreadNotificationsCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-[#06B6D4]" />
            )}
            <ChevronDown
              className={`w-3.5 h-3.5 text-[#64748B] transition-transform duration-150 ${
                profileMenuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          <AnimatePresence>
            {profileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                role="menu"
                aria-label="User Account Menu"
                className="absolute right-0 mt-2 w-64 rounded-xl bg-[#161E2E] border border-white/[0.08] shadow-2xl py-2 z-50"
              >
                {userProfile ? (
                  <>
                    <div className="px-4 py-2.5 border-b border-white/[0.08]">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-[#F8FAFC] truncate">
                          {userProfile.name}
                        </p>
                        {hasVerifiedAdminAccess && adminRoleLabel && (
                          <span className="px-2 py-0.5 rounded bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 text-[10px] font-semibold text-purple-300 shrink-0">
                            {adminRoleLabel}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#94A3B8] truncate mt-0.5">
                        {userProfile.email}
                      </p>
                    </div>

                    <div className="py-1.5 px-1.5 space-y-0.5">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          onNavigate({ page: 'profile' });
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-[#F8FAFC] hover:bg-[#1D293B] flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <User className="w-3.5 h-3.5 text-[#94A3B8]" />
                        <span>Profile & Settings</span>
                      </button>

                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          onNavigate({ page: 'dashboard' });
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-[#F8FAFC] hover:bg-[#1D293B] flex items-center justify-between gap-2 transition-colors cursor-pointer"
                      >
                        <span className="inline-flex items-center gap-2.5">
                          <LayoutDashboard className="w-3.5 h-3.5 text-[#8B5CF6]" />
                          <span>Rentals Dashboard</span>
                        </span>
                        {unreadNotificationsCount > 0 && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#8B5CF6] text-white rounded">
                            {unreadNotificationsCount}
                          </span>
                        )}
                      </button>

                      {rentalRequests.length > 0 && (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setProfileMenuOpen(false);
                            onOpenRequestsModal();
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-[#06B6D4] hover:bg-[#1D293B] flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <span>Session Requests</span>
                          <span className="font-mono-tabular">
                            {rentalRequests.length}
                          </span>
                        </button>
                      )}

                      {hasVerifiedAdminAccess && verifiedAdminRecord && (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setProfileMenuOpen(false);
                            onNavigate({ page: 'admin' });
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-[#F8FAFC] bg-[#8B5CF6]/15 hover:bg-[#8B5CF6]/25 border border-[#8B5CF6]/30 flex items-center justify-between gap-2 transition-colors cursor-pointer mt-1"
                        >
                          <span className="inline-flex items-center gap-2">
                            <Shield className="w-3.5 h-3.5 text-[#8B5CF6]" />
                            <span>Admin Panel</span>
                          </span>
                          <span className="text-[10px] font-mono text-[#06B6D4]">
                            {adminRoleLabel}
                          </span>
                        </button>
                      )}
                    </div>

                    <div className="pt-1.5 mt-1 px-1.5 border-t border-white/[0.08]">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          void onLogout();
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-[#EF4444] hover:bg-[#EF4444]/10 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="p-1.5 space-y-1">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        onNavigate({ page: 'login' });
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-[#F8FAFC] hover:bg-[#1D293B] transition-colors cursor-pointer"
                    >
                      Log In
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        onNavigate({ page: 'signup' });
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-white bg-[#8B5CF6] hover:bg-[#7C3AED] transition-colors cursor-pointer"
                    >
                      Create Account
                    </button>
                    <div className="border-t border-white/[0.08] my-1 pt-1">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          onNavigate({ page: 'dashboard' });
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1D293B] transition-colors cursor-pointer"
                      >
                        Dashboard
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          onNavigate({ page: 'profile' });
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1D293B] transition-colors cursor-pointer"
                      >
                        Profile
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
