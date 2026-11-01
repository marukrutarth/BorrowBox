import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell,
  Check,
  Compass,
  Heart,
  HelpCircle,
  Home,
  Info,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Plus,
  Search,
  Shield,
  User,
  Users,
  X,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  AdminRegistryRecord,
  AppNotificationItem,
  BorrowBoxUserProfile,
  IndianCity,
  RentalRequestRecord,
} from '../../types/marketplace';
import {
  ROLE_DEFINITIONS,
  shouldShowAdminPanelOption,
} from '../../utils/adminRbac';
import { SECONDARY_INFO_NAV_ITEMS } from '../../utils/headerNavigation';
import { BORROWBOX_TRANSPARENT_SYMBOL_ASSET_PATH } from '../../utils/introAnimation';
import { mobileMenuPanelTransition } from '../../utils/motionVariants';
import { ALL_CATEGORIES } from '../../utils/rentalLogic';
import { PageRoute } from '../Navbar';
import { CitySelectorModal } from '../location/CitySelectorModal';

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
  unreadNotificationsCount?: number;
  notifications?: AppNotificationItem[];
  onSelectNotification?: (notif: AppNotificationItem) => void;
  onMarkAllNotificationsRead?: () => void;
}

const MOBILE_SECONDARY_ICONS: Record<string, React.ReactNode> = {
  'how-it-works': <HelpCircle className="w-4 h-4 text-[#8B5CF6] shrink-0" />,
  about: <Info className="w-4 h-4 text-[#8B5CF6] shrink-0" />,
  team: <Users className="w-4 h-4 text-[#8B5CF6] shrink-0" />,
  support: <LifeBuoy className="w-4 h-4 text-[#8B5CF6] shrink-0" />,
  contact: <Mail className="w-4 h-4 text-[#8B5CF6] shrink-0" />,
};

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  currentRoute,
  onNavigate,
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
  notifications = [],
  onSelectNotification,
  onMarkAllNotificationsRead,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchBarOpen, setSearchBarOpen] = useState(false);
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
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

  const handleMobileNavigate = (route: PageRoute) => {
    setMenuOpen(false);
    setSearchBarOpen(false);
    onNavigate(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="md:hidden">
      {/* Compact 56px Mobile Header Bar: [Logo] on Left, [Login] [Sign Up] [Menu] on Right */}
      <div
        data-testid="mobile-header-bar"
        className="bb-container h-14 flex items-center justify-between gap-2"
      >
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            handleMobileNavigate({ page: 'home' });
          }}
          className="inline-flex items-center gap-1.5 text-sm sm:text-base font-bold tracking-tight text-[#F8FAFC] min-h-[40px] shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B5CF6]"
        >
          <img
            src={BORROWBOX_TRANSPARENT_SYMBOL_ASSET_PATH}
            alt=""
            className="w-8 h-8 sm:w-9 sm:h-9 object-contain shrink-0 -mx-1"
          />
          <span className="truncate">
            Borrow<span className="text-[#8B5CF6]">Box</span>
          </span>
        </a>

        {/* Right: Directly Visible Auth Actions (or Authenticated Controls) + Hamburger Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {!userProfile ? (
            <>
              <button
                type="button"
                data-testid="mobile-login-button"
                onClick={() => handleMobileNavigate({ page: 'login' })}
                className={`min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs font-semibold bb-btn-interactive cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B5CF6] ${
                  currentRoute.page === 'login'
                    ? 'bg-[#1D293B] border-[#8B5CF6]/45 text-[#F8FAFC]'
                    : 'bg-[#161E2E] hover:bg-[#1D293B] border-white/[0.08] text-[#F8FAFC]'
                }`}
              >
                Login
              </button>

              <button
                type="button"
                data-testid="mobile-signup-button"
                onClick={() => handleMobileNavigate({ page: 'signup' })}
                className="min-h-[36px] px-3 sm:px-3.5 py-1.5 rounded-lg bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold bb-glow-button cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B5CF6]"
              >
                Sign Up
              </button>
            </>
          ) : (
            <button
              type="button"
              aria-label="Toggle search bar"
              aria-expanded={searchBarOpen}
              onClick={() => {
                setSearchBarOpen((prev) => !prev);
                setMenuOpen(false);
              }}
              className={`inline-flex items-center justify-center min-w-[40px] min-h-[40px] rounded-xl border bb-btn-interactive cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B5CF6] ${
                searchBarOpen
                  ? 'bg-[#1D293B] border-[#8B5CF6]/45 text-[#F8FAFC]'
                  : 'bg-[#161E2E] border-white/[0.08] text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            data-testid="mobile-menu-trigger"
            aria-label={
              menuOpen ? 'Close navigation menu' : 'Open navigation menu'
            }
            aria-expanded={menuOpen}
            onClick={() => {
              setMenuOpen((prev) => !prev);
              setSearchBarOpen(false);
            }}
            className={`inline-flex items-center justify-center gap-1.5 min-w-[40px] min-h-[40px] px-2.5 rounded-xl border bb-btn-interactive cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B5CF6] ${
              menuOpen
                ? 'bg-[#1D293B] border-[#8B5CF6]/45 text-[#F8FAFC]'
                : 'bg-[#161E2E] border-white/[0.08] text-[#F8FAFC]'
            }`}
          >
            {userProfile && (
              <span className="w-5 h-5 rounded-full bg-[#8B5CF6] text-white text-[11px] font-bold flex items-center justify-center">
                {userProfile.name.charAt(0).toUpperCase()}
              </span>
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
              <button
                type="button"
                onClick={() => setIsCityModalOpen(true)}
                className="flex items-center justify-between gap-1.5 bg-[#161E2E] border border-white/[0.08] hover:border-[#8B5CF6]/50 rounded-xl px-3 min-h-[44px] flex-1 min-w-0 text-left cursor-pointer"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <MapPin className="w-4 h-4 text-[#8B5CF6] shrink-0" />
                  <span className="text-xs font-medium text-[#F8FAFC] truncate">
                    {selectedCity === 'All' ? 'Select your city' : selectedCity}
                  </span>
                </div>
                <span className="text-[11px] text-[#8B5CF6] font-medium shrink-0">
                  Change
                </span>
              </button>
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
                  data-testid="mobile-menu-drawer"
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
                      className="inline-flex items-center justify-center min-w-[40px] min-h-[40px] rounded-xl bg-[#161E2E] border border-white/[0.08] text-[#94A3B8] hover:text-[#F8FAFC] bb-btn-interactive cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-4 space-y-5 flex-1 pb-24">
                    {/* Quick Search Input Inside Mobile Menu */}
                    <form
                      onSubmit={handleMobileSearchSubmit}
                      className="flex items-center gap-2"
                    >
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="search"
                          aria-label="Search rentals from menu"
                          value={searchQuery}
                          onChange={(e) => onSearchQueryChange(e.target.value)}
                          placeholder="Search rentals..."
                          className="w-full min-h-[40px] pl-9 pr-3 py-1.5 bg-[#161E2E] border border-white/[0.08] rounded-xl text-xs text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none focus:border-[#8B5CF6]"
                        />
                      </div>
                      <button
                        type="submit"
                        className="min-h-[40px] px-3.5 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold bb-glow-button cursor-pointer shrink-0"
                      >
                        Go
                      </button>
                    </form>

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

                    {/* Mobile In-App Notifications Section */}
                    {userProfile && notifications.length > 0 && (
                      <div className="p-3 rounded-xl bg-[#161E2E] border border-white/[0.08] space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#F8FAFC]">
                            <Bell className="w-3.5 h-3.5 text-[#06B6D4]" />
                            <span>Notifications</span>
                            {unreadNotificationsCount > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-[#8B5CF6]/20 text-[10px] font-mono text-[#C4B5FD]">
                                {unreadNotificationsCount} new
                              </span>
                            )}
                          </div>
                          {unreadNotificationsCount > 0 &&
                            onMarkAllNotificationsRead && (
                              <button
                                type="button"
                                onClick={() => onMarkAllNotificationsRead()}
                                className="inline-flex items-center gap-1 text-[11px] text-[#06B6D4] cursor-pointer"
                              >
                                <Check className="w-3 h-3" />
                                <span>Mark read</span>
                              </button>
                            )}
                        </div>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {notifications.slice(0, 5).map((notif) => (
                            <div
                              key={notif.id}
                              onClick={() => {
                                setMenuOpen(false);
                                if (onSelectNotification) {
                                  onSelectNotification(notif);
                                } else if (notif.ticketId) {
                                  onNavigate({
                                    page: 'support',
                                    ticketId: notif.ticketId,
                                  });
                                } else {
                                  onNavigate({ page: 'dashboard' });
                                }
                              }}
                              className={`p-2 rounded-lg border text-xs cursor-pointer ${
                                notif.read
                                  ? 'bg-[#111827]/60 border-white/[0.06] text-[#94A3B8]'
                                  : 'bg-[#8B5CF6]/10 border-[#8B5CF6]/35 text-[#F8FAFC]'
                              }`}
                            >
                              <div className="font-semibold truncate">
                                {notif.title}
                              </div>
                              <p className="text-[11px] text-[#CBD5E1] line-clamp-2 mt-0.5">
                                {notif.body}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Primary Marketplace Actions */}
                    <div className="space-y-1">
                      <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-[#64748B] mb-1.5">
                        Marketplace
                      </p>

                      <button
                        type="button"
                        onClick={() => handleMobileNavigate({ page: 'home' })}
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
                        onClick={() => handleMobileNavigate({ page: 'browse' })}
                        className={`w-full min-h-[44px] text-left px-3 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 bb-btn-interactive cursor-pointer ${
                          currentRoute.page === 'browse'
                            ? 'bg-[#1D293B] text-[#F8FAFC]'
                            : 'text-[#F8FAFC] hover:bg-[#161E2E]'
                        }`}
                      >
                        <Compass className="w-4 h-4 text-[#8B5CF6] shrink-0" />
                        <span>Browse Rentals</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleMobileNavigate({ page: 'list-item' })
                        }
                        className="w-full min-h-[44px] text-left px-3 py-2.5 rounded-xl text-sm font-semibold text-[#8B5CF6] hover:bg-[#161E2E] flex items-center gap-3 bb-btn-interactive cursor-pointer"
                      >
                        <Plus className="w-4 h-4 shrink-0" />
                        <span>List Your Item</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          setIsCityModalOpen(true);
                        }}
                        className="w-full min-h-[44px] text-left px-3 py-2.5 rounded-xl text-sm font-medium flex items-center justify-between text-[#F8FAFC] hover:bg-[#161E2E] bb-btn-interactive cursor-pointer border border-white/[0.06]"
                      >
                        <span className="inline-flex items-center gap-3">
                          <MapPin className="w-4 h-4 text-[#8B5CF6] shrink-0" />
                          <span>
                            Location:{' '}
                            {selectedCity === 'All'
                              ? 'All India'
                              : selectedCity}
                          </span>
                        </span>
                        <span className="text-xs text-[#8B5CF6]">Change</span>
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
                    </div>

                    {/* Platform & Support Links */}
                    <div className="pt-4 border-t border-white/[0.08] space-y-1">
                      <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-[#64748B] mb-1.5">
                        Platform &amp; Help
                      </p>
                      {SECONDARY_INFO_NAV_ITEMS.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleMobileNavigate(item.route)}
                          className={`w-full min-h-[40px] text-left px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-3 bb-btn-interactive cursor-pointer ${
                            currentRoute.page === item.route.page
                              ? 'bg-[#1D293B] text-[#F8FAFC]'
                              : 'text-[#CBD5E1] hover:text-[#F8FAFC] hover:bg-[#161E2E]'
                          }`}
                        >
                          {MOBILE_SECONDARY_ICONS[item.id]}
                          <span>{item.label}</span>
                        </button>
                      ))}
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
                            onClick={() =>
                              handleMobileNavigate({
                                page: 'browse',
                                category,
                              })
                            }
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
                        onClick={() =>
                          handleMobileNavigate({ page: 'dashboard' })
                        }
                        className="w-full min-h-[44px] text-left px-3 py-2.5 rounded-xl text-sm font-medium text-[#F8FAFC] hover:bg-[#161E2E] flex items-center gap-3 bb-btn-interactive cursor-pointer"
                      >
                        <LayoutDashboard className="w-4 h-4 text-[#8B5CF6] shrink-0" />
                        <span>Rentals Dashboard</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleMobileNavigate({ page: 'profile' })
                        }
                        className="w-full min-h-[44px] text-left px-3 py-2.5 rounded-xl text-sm font-medium text-[#F8FAFC] hover:bg-[#161E2E] flex items-center gap-3 bb-btn-interactive cursor-pointer"
                      >
                        <User className="w-4 h-4 text-[#94A3B8] shrink-0" />
                        <span className="truncate">
                          {userProfile
                            ? `Profile (${userProfile.name})`
                            : 'Profile & Settings'}
                        </span>
                      </button>

                      {/* Dynamic Admin Panel Option — strictly for verified active administrators */}
                      {userProfile && hasVerifiedAdminAccess && (
                        <button
                          type="button"
                          onClick={() =>
                            handleMobileNavigate({ page: 'admin' })
                          }
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
                            onClick={() =>
                              handleMobileNavigate({ page: 'login' })
                            }
                            className="min-h-[44px] py-2.5 rounded-xl bg-[#161E2E] hover:bg-[#1D293B] border border-white/[0.08] text-xs font-semibold text-[#F8FAFC] bb-btn-interactive cursor-pointer"
                          >
                            Login
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleMobileNavigate({ page: 'signup' })
                            }
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

      <CitySelectorModal
        isOpen={isCityModalOpen}
        onClose={() => setIsCityModalOpen(false)}
        selectedCity={selectedCity === 'All' ? null : selectedCity}
        onSelectCity={(c) => onCityChange(c ? (c as IndianCity) : 'All')}
      />
    </div>
  );
};
