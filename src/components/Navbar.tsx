import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
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
} from '../types/marketplace';
import {
  ROLE_DEFINITIONS,
  shouldShowAdminPanelOption,
} from '../utils/adminRbac';
import { ALL_CITIES } from '../utils/rentalLogic';

export type PageRoute =
  | { page: 'home' }
  | { page: 'browse'; category?: string; query?: string; city?: string }
  | { page: 'details'; itemId: string }
  | { page: 'list-item' }
  | { page: 'dashboard' }
  | { page: 'profile' }
  | { page: 'login' }
  | { page: 'signup' }
  | { page: 'admin' };

interface NavbarProps {
  currentRoute: PageRoute;
  onNavigate: (route: PageRoute) => void;
  onScrollToHowItWorks: () => void;
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

export const Navbar: React.FC<NavbarProps> = ({
  currentRoute,
  onNavigate,
  onScrollToHowItWorks,
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cityMenuOpen, setCityMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const cityDropdownRef = useRef<HTMLDivElement | null>(null);
  const profileDropdownRef = useRef<HTMLDivElement | null>(null);

  const hasVerifiedAdminAccess = shouldShowAdminPanelOption(verifiedAdminRecord);
  const adminRoleLabel =
    hasVerifiedAdminAccess && verifiedAdminRecord
      ? ROLE_DEFINITIONS[verifiedAdminRecord.role]?.label || 'Administrator'
      : null;

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 16);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        cityDropdownRef.current &&
        !cityDropdownRef.current.contains(event.target as Node)
      ) {
        setCityMenuOpen(false);
      }
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target as Node)
      ) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleNavClick = (e: React.MouseEvent, action: () => void) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    setCityMenuOpen(false);
    setProfileMenuOpen(false);
    action();
  };

  const handleNavbarSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    setProfileMenuOpen(false);
    onNavigate({
      page: 'browse',
      query: searchQuery.trim() || undefined,
      city: selectedCity !== 'All' ? selectedCity : undefined,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLocationSelect = (newCity: IndianCity | 'All') => {
    onCityChange(newCity);
    setCityMenuOpen(false);
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
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#090D16]/90 backdrop-blur-xl border-b border-white/[0.09] shadow-[0_8px_30px_rgba(0,0,0,0.45)]'
          : 'bg-[#090D16]/60 backdrop-blur-md border-b border-white/[0.05]'
      }`}
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left Zone: BorrowBox Wordmark + Animated City Selector */}
        <div className="flex items-center gap-4 shrink-0">
          <a
            href="/"
            onClick={(e) =>
              handleNavClick(e, () => onNavigate({ page: 'home' }))
            }
            className="group inline-flex items-center gap-2.5 text-lg font-bold tracking-tight text-[#F8FAFC] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8B5CF6]"
          >
            <span className="w-8 h-8 rounded-lg bg-[#141C2B] border border-white/[0.1] flex items-center justify-center text-[#8B5CF6] group-hover:border-[#8B5CF6]/50 transition-colors duration-200">
              <Box className="w-4 h-4" />
            </span>
            <span>
              Borrow<span className="text-[#8B5CF6]">Box</span>
            </span>
          </a>

          {/* Elegant City Dropdown */}
          <div ref={cityDropdownRef} className="hidden sm:block relative">
            <button
              type="button"
              aria-label="Select Location"
              aria-expanded={cityMenuOpen}
              onClick={() => setCityMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 bg-[#141C2B] border border-white/[0.07] hover:border-white/[0.16] rounded-lg px-3 py-1.5 text-xs font-medium text-[#F8FAFC] transition-colors duration-200 cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-[#8B5CF6] shrink-0" />
              <span>{selectedCity === 'All' ? 'All India' : selectedCity}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-[#94A3B8] transition-transform duration-200 ${
                  cityMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            <AnimatePresence>
              {cityMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.98 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  role="listbox"
                  aria-label="Choose city"
                  className="absolute left-0 mt-2 w-44 rounded-xl bg-[#141C2B] border border-white/[0.09] shadow-2xl py-1.5 z-50"
                >
                  <button
                    type="button"
                    role="option"
                    aria-selected={selectedCity === 'All'}
                    onClick={() => handleLocationSelect('All')}
                    className={`w-full text-left px-3.5 py-2 text-xs font-medium transition-colors duration-150 flex items-center justify-between cursor-pointer ${
                      selectedCity === 'All'
                        ? 'text-[#F8FAFC] bg-white/[0.06]'
                        : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.04]'
                    }`}
                  >
                    <span>All India</span>
                    {selectedCity === 'All' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]" />
                    )}
                  </button>
                  {ALL_CITIES.map((city) => (
                    <button
                      key={city}
                      type="button"
                      role="option"
                      aria-selected={selectedCity === city}
                      onClick={() => handleLocationSelect(city)}
                      className={`w-full text-left px-3.5 py-2 text-xs font-medium transition-colors duration-150 flex items-center justify-between cursor-pointer ${
                        selectedCity === city
                          ? 'text-[#F8FAFC] bg-white/[0.06]'
                          : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.04]'
                      }`}
                    >
                      <span>{city}</span>
                      {selectedCity === city && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]" />
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
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
            className="w-full pl-8 pr-3 py-1.5 bg-[#141C2B] border border-white/[0.07] rounded-lg text-xs text-[#F8FAFC] placeholder:text-[#94A3B8] focus:bg-[#1B2538] focus:outline-none focus:border-white/[0.2] transition-colors duration-200"
          />
        </form>

        {/* Right Zone: Navigation Links + Auth Actions */}
        <div className="flex items-center gap-4 shrink-0">
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-1 text-sm font-medium text-[#94A3B8]"
          >
            <a
              href="/browse"
              onClick={(e) =>
                handleNavClick(e, () => onNavigate({ page: 'browse' }))
              }
              className={`relative px-3 py-2 rounded-lg transition-colors duration-200 whitespace-nowrap shrink-0 ${
                isBrowseActive
                  ? 'text-[#F8FAFC] font-medium'
                  : 'hover:text-[#F8FAFC]'
              }`}
            >
              <span>Browse</span>
              {isBrowseActive && (
                <motion.span
                  layoutId="navbar-active-indicator"
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-x-3 -bottom-[11px] h-[2px] bg-[#8B5CF6] rounded-full"
                />
              )}
            </a>

            <a
              href="/list-item"
              onClick={(e) =>
                handleNavClick(e, () => onNavigate({ page: 'list-item' }))
              }
              className={`relative px-3 py-2 rounded-lg transition-colors duration-200 whitespace-nowrap shrink-0 ${
                currentRoute.page === 'list-item'
                  ? 'text-[#F8FAFC] font-medium'
                  : 'hover:text-[#F8FAFC]'
              }`}
            >
              <span>List an Item</span>
              {currentRoute.page === 'list-item' && (
                <motion.span
                  layoutId="navbar-active-indicator"
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-x-3 -bottom-[11px] h-[2px] bg-[#8B5CF6] rounded-full"
                />
              )}
            </a>

            <a
              href="/dashboard"
              onClick={(e) =>
                handleNavClick(e, () => onNavigate({ page: 'dashboard' }))
              }
              className={`relative inline-flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors duration-200 whitespace-nowrap shrink-0 ${
                currentRoute.page === 'dashboard'
                  ? 'text-[#F8FAFC] font-medium'
                  : 'hover:text-[#F8FAFC]'
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
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-x-3 -bottom-[11px] h-[2px] bg-[#8B5CF6] rounded-full"
                />
              )}
            </a>

            {/* Dynamic Admin Panel Navigation Link — rendered ONLY for verified active administrators */}
            {userProfile && hasVerifiedAdminAccess && (
              <a
                href="/admin"
                onClick={(e) =>
                  handleNavClick(e, () => onNavigate({ page: 'admin' }))
                }
                className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap shrink-0 ${
                  currentRoute.page === 'admin'
                    ? 'bg-[#8B5CF6] text-white shadow-sm'
                    : 'bg-[#8B5CF6]/12 text-[#F8FAFC] border border-[#8B5CF6]/35 hover:bg-[#8B5CF6]/20 hover:border-[#8B5CF6]/55'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-[#8B5CF6] shrink-0" />
                <span>Admin Panel</span>
              </a>
            )}

            <a
              href="/#how-it-works"
              onClick={(e) => handleNavClick(e, onScrollToHowItWorks)}
              className="hidden xl:inline-block px-3 py-2 rounded-lg hover:text-[#F8FAFC] transition-colors duration-200 whitespace-nowrap shrink-0"
            >
              How It Works
            </a>

            {rentalRequests.length > 0 && (
              <button
                type="button"
                onClick={onOpenRequestsModal}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#06B6D4] bg-[#06B6D4]/10 border border-[#06B6D4]/25 hover:bg-[#06B6D4]/15 transition-colors duration-200 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Requests ({rentalRequests.length})
              </button>
            )}

            {userProfile ? (
              /* Authenticated User Profile Dropdown Menu */
              <div ref={profileDropdownRef} className="relative">
                <button
                  type="button"
                  aria-label={`Account menu for ${userProfile.name}`}
                  aria-expanded={profileMenuOpen}
                  onClick={() => setProfileMenuOpen((prev) => !prev)}
                  className={`relative inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-colors duration-200 whitespace-nowrap shrink-0 cursor-pointer ${
                    currentRoute.page === 'profile' || profileMenuOpen
                      ? 'bg-[#161E2E] border-[#8B5CF6]/45 text-[#F8FAFC]'
                      : 'bg-[#141C2B] border-white/[0.08] text-[#F8FAFC] hover:border-white/[0.18]'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-[#8B5CF6] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                    {userProfile.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-xs font-semibold">
                    {userProfile.name.split(' ')[0]}
                  </span>
                  {hasVerifiedAdminAccess && (
                    <Shield
                      className="w-3.5 h-3.5 text-[#06B6D4] shrink-0"
                      aria-label="Verified Administrator"
                    />
                  )}
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-[#94A3B8] transition-transform duration-200 ${
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
                      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                      role="menu"
                      aria-label="User Account Menu"
                      className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#141C2B] border border-white/[0.1] shadow-2xl py-2 z-50"
                    >
                      {/* User Identity Header */}
                      <div className="px-4 py-2.5 border-b border-white/[0.08]">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-[#F8FAFC] truncate">
                            {userProfile.name}
                          </p>
                          {hasVerifiedAdminAccess && adminRoleLabel && (
                            <span className="px-2 py-0.5 rounded-md bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 text-[10px] font-semibold text-purple-300 shrink-0">
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
                          onClick={(e) =>
                            handleNavClick(e, () =>
                              onNavigate({ page: 'profile' })
                            )
                          }
                          className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-[#F8FAFC] hover:bg-white/[0.06] flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <User className="w-3.5 h-3.5 text-[#94A3B8]" />
                          <span>Profile & Account Settings</span>
                        </button>

                        <button
                          type="button"
                          role="menuitem"
                          onClick={(e) =>
                            handleNavClick(e, () =>
                              onNavigate({ page: 'dashboard' })
                            )
                          }
                          className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-[#F8FAFC] hover:bg-white/[0.06] flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <LayoutDashboard className="w-3.5 h-3.5 text-[#8B5CF6]" />
                          <span>Borrower & Lender Dashboard</span>
                        </button>

                        {/* Dynamic Admin Panel Option in Profile Dropdown */}
                        {hasVerifiedAdminAccess && verifiedAdminRecord && (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={(e) =>
                              handleNavClick(e, () =>
                                onNavigate({ page: 'admin' })
                              )
                            }
                            className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold text-[#F8FAFC] bg-[#8B5CF6]/12 hover:bg-[#8B5CF6]/22 border border-[#8B5CF6]/30 flex items-center justify-between gap-2 transition-colors cursor-pointer mt-1"
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
                          className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-[#EF4444] hover:bg-[#EF4444]/10 flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Log Out</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <>
                <a
                  href="/profile"
                  onClick={(e) =>
                    handleNavClick(e, () => onNavigate({ page: 'profile' }))
                  }
                  className={`relative inline-flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors duration-200 whitespace-nowrap shrink-0 ${
                    currentRoute.page === 'profile'
                      ? 'text-[#F8FAFC] font-medium'
                      : 'hover:text-[#F8FAFC]'
                  }`}
                >
                  <User className="w-3.5 h-3.5 text-[#94A3B8]" />
                  <span>Profile</span>
                  {currentRoute.page === 'profile' && (
                    <motion.span
                      layoutId="navbar-active-indicator"
                      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute inset-x-3 -bottom-[11px] h-[2px] bg-[#8B5CF6] rounded-full"
                    />
                  )}
                </a>

                <a
                  href="/login"
                  onClick={(e) =>
                    handleNavClick(e, () => onNavigate({ page: 'login' }))
                  }
                  className={`relative px-3 py-2 rounded-lg transition-colors duration-200 whitespace-nowrap shrink-0 ${
                    currentRoute.page === 'login'
                      ? 'text-[#F8FAFC] font-medium'
                      : 'hover:text-[#F8FAFC]'
                  }`}
                >
                  <span>Login</span>
                  {currentRoute.page === 'login' && (
                    <motion.span
                      layoutId="navbar-active-indicator"
                      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute inset-x-3 -bottom-[11px] h-[2px] bg-[#8B5CF6] rounded-full"
                    />
                  )}
                </a>
              </>
            )}
          </nav>

          {/* Primary CTA Action */}
          <div className="flex items-center gap-2.5 shrink-0">
            {userProfile ? (
              <button
                type="button"
                onClick={() => onNavigate({ page: 'list-item' })}
                className="hidden sm:inline-flex px-4 py-2 text-xs font-semibold text-white bg-[#8B5CF6] hover:bg-[#7C3AED] rounded-lg bb-glow-button whitespace-nowrap shrink-0 cursor-pointer"
              >
                + List Item
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate({ page: 'signup' })}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#8B5CF6] hover:bg-[#7C3AED] rounded-lg bb-glow-button whitespace-nowrap shrink-0 cursor-pointer"
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
              className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-white/[0.08] bg-[#141C2B] text-[#F8FAFC] hover:bg-[#1B2538] transition-colors duration-200 cursor-pointer"
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
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            aria-label="Mobile Navigation"
            className="md:hidden bg-[#0F1523] border-b border-white/[0.08] px-4 pt-3 pb-5 space-y-3 overflow-hidden"
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
                  className="w-full pl-9 pr-3 py-2 bg-[#141C2B] border border-white/[0.08] rounded-lg text-sm text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-white/[0.2]"
                />
              </div>

              <div className="flex items-center gap-2 bg-[#141C2B] border border-white/[0.08] rounded-lg px-3 py-2">
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
                  <option value="All" className="bg-[#0F1523]">
                    All India
                  </option>
                  {ALL_CITIES.map((city) => (
                    <option key={city} value={city} className="bg-[#0F1523]">
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
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-[#F8FAFC] hover:bg-[#141C2B]"
              >
                Browse
              </a>
              <a
                href="/list-item"
                onClick={(e) =>
                  handleNavClick(e, () => onNavigate({ page: 'list-item' }))
                }
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-[#F8FAFC] hover:bg-[#141C2B]"
              >
                List an Item
              </a>
              <a
                href="/dashboard"
                onClick={(e) =>
                  handleNavClick(e, () => onNavigate({ page: 'dashboard' }))
                }
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-[#F8FAFC] hover:bg-[#141C2B]"
              >
                Dashboard
              </a>
              <a
                href="/profile"
                onClick={(e) =>
                  handleNavClick(e, () => onNavigate({ page: 'profile' }))
                }
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-[#F8FAFC] hover:bg-[#141C2B]"
              >
                {userProfile ? `Profile (${userProfile.name})` : 'Profile'}
              </a>

              {/* Dynamic Mobile Admin Panel Link — only for verified active admins */}
              {userProfile && hasVerifiedAdminAccess && (
                <a
                  href="/admin"
                  onClick={(e) =>
                    handleNavClick(e, () => onNavigate({ page: 'admin' }))
                  }
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold text-[#F8FAFC] bg-[#8B5CF6]/15 border border-[#8B5CF6]/35 hover:bg-[#8B5CF6]/25"
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
                </a>
              )}

              <a
                href="/#how-it-works"
                onClick={(e) => handleNavClick(e, onScrollToHowItWorks)}
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-[#F8FAFC] hover:bg-[#141C2B]"
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
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-[#06B6D4] hover:bg-[#141C2B]"
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
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[#94A3B8] hover:bg-[#141C2B]"
                >
                  Log Out
                </button>
              ) : (
                <a
                  href="/login"
                  onClick={(e) =>
                    handleNavClick(e, () => onNavigate({ page: 'login' }))
                  }
                  className="block px-3 py-2.5 rounded-lg text-sm font-medium text-[#F8FAFC] hover:bg-[#141C2B]"
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

