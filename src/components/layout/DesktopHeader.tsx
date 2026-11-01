import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  Check,
  ChevronDown,
  Compass,
  Heart,
  HelpCircle,
  Info,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Mail,
  MapPin,
  Plus,
  Search,
  Shield,
  User,
  Users,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
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
import {
  DESKTOP_PRIMARY_NAV_ITEMS,
  SECONDARY_INFO_NAV_ITEMS,
  getCategoryDropdownItems,
  isPrimaryNavActive,
  isSecondaryDropdownActive,
} from '../../utils/headerNavigation';
import { BORROWBOX_TRANSPARENT_SYMBOL_ASSET_PATH } from '../../utils/introAnimation';
import { ALL_CITIES } from '../../utils/rentalLogic';
import { PageRoute } from '../Navbar';
import { CitySelectorModal } from '../location/CitySelectorModal';

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
  notifications?: AppNotificationItem[];
  onSelectNotification?: (notif: AppNotificationItem) => void;
  onMarkAllNotificationsRead?: () => void;
}

const SECONDARY_ITEM_ICONS: Record<string, React.ReactNode> = {
  'how-it-works': <HelpCircle className="w-3.5 h-3.5 text-[#8B5CF6] shrink-0" />,
  about: <Info className="w-3.5 h-3.5 text-[#8B5CF6] shrink-0" />,
  team: <Users className="w-3.5 h-3.5 text-[#8B5CF6] shrink-0" />,
  support: <LifeBuoy className="w-3.5 h-3.5 text-[#8B5CF6] shrink-0" />,
  contact: <Mail className="w-3.5 h-3.5 text-[#8B5CF6] shrink-0" />,
};

export const DesktopHeader: React.FC<DesktopHeaderProps> = ({
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
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);

  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const hasVerifiedAdminAccess = shouldShowAdminPanelOption(verifiedAdminRecord);
  const adminRoleLabel =
    hasVerifiedAdminAccess && verifiedAdminRecord
      ? ROLE_DEFINITIONS[verifiedAdminRecord.role]?.label || 'Administrator'
      : null;

  const categoryItems = getCategoryDropdownItems();
  const isMoreActive = isSecondaryDropdownActive(currentRoute);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(event.target as Node)
      ) {
        setMoreMenuOpen(false);
      }
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setSearchOpen(false);
      }
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setNotificationsOpen(false);
      }
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setProfileMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMoreMenuOpen(false);
        setSearchOpen(false);
        setNotificationsOpen(false);
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
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

  const handleNavigate = (route: PageRoute) => {
    setMoreMenuOpen(false);
    setSearchOpen(false);
    setNotificationsOpen(false);
    setProfileMenuOpen(false);
    onNavigate(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div
      data-testid="desktop-header-bar"
      className="hidden md:flex bb-container h-16 items-center justify-between gap-3 lg:gap-6"
    >
      {/* Left: BorrowBox Brand Logo */}
      <div className="flex items-center shrink-0">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            handleNavigate({ page: 'home' });
          }}
          className="group inline-flex items-center gap-2 text-lg font-bold tracking-tight text-[#F8FAFC] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8B5CF6]"
        >
          <img
            src={BORROWBOX_TRANSPARENT_SYMBOL_ASSET_PATH}
            alt=""
            className="w-10 h-10 object-contain shrink-0 -mx-1.5"
          />
          <span>
            Borrow<span className="text-[#8B5CF6]">Box</span>
          </span>
        </a>
      </div>

      {/* Centre: Simplified Primary Navigation (Home, Browse, List Your Item + More Dropdown) */}
      <nav
        aria-label="Primary Navigation"
        className="flex items-center gap-0.5 lg:gap-1.5 text-xs lg:text-sm font-medium text-[#94A3B8]"
      >
        {DESKTOP_PRIMARY_NAV_ITEMS.map((item) => {
          const active = isPrimaryNavActive(item.id, currentRoute);
          return (
            <a
              key={item.id}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              onClick={(e) => {
                e.preventDefault();
                handleNavigate(item.route);
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 lg:px-3.5 py-2 rounded-lg transition-colors duration-150 whitespace-nowrap ${
                active
                  ? 'text-[#F8FAFC] bg-white/[0.06] font-semibold'
                  : 'text-[#CBD5E1] hover:text-[#F8FAFC] hover:bg-white/[0.04]'
              }`}
            >
              {item.id === 'list-item' && (
                <Plus className="w-3.5 h-3.5 text-[#8B5CF6] shrink-0" />
              )}
              <span>{item.label}</span>
            </a>
          );
        })}

        {/* Secondary Navigation Grouped in Clean "More" Dropdown */}
        <div ref={moreMenuRef} className="relative">
          <button
            type="button"
            data-testid="desktop-more-dropdown-trigger"
            aria-expanded={moreMenuOpen}
            aria-haspopup="menu"
            onClick={() => setMoreMenuOpen((prev) => !prev)}
            className={`inline-flex items-center gap-1 px-2.5 lg:px-3.5 py-2 rounded-lg transition-colors duration-150 cursor-pointer whitespace-nowrap ${
              moreMenuOpen || isMoreActive
                ? 'text-[#F8FAFC] bg-white/[0.06] font-semibold'
                : 'text-[#CBD5E1] hover:text-[#F8FAFC] hover:bg-white/[0.04]'
            }`}
          >
            <span>More</span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-[#64748B] transition-transform duration-150 ${
                moreMenuOpen ? 'rotate-180 text-[#F8FAFC]' : ''
              }`}
            />
          </button>

          <AnimatePresence>
            {moreMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                role="menu"
                aria-label="More Navigation and Categories"
                data-testid="desktop-more-dropdown-menu"
                className="absolute left-1/2 -translate-x-1/2 mt-2 w-[460px] max-w-[calc(100vw-2rem)] rounded-xl bg-[#161E2E] border border-white/[0.08] shadow-2xl p-3 z-50 grid grid-cols-12 gap-3"
              >
                {/* Left Column: Categories */}
                <div className="col-span-7 pr-3 border-r border-white/[0.08]">
                  <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#64748B] flex items-center justify-between">
                    <span>Rental Categories</span>
                    <Compass className="w-3 h-3 text-[#8B5CF6]" />
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {categoryItems.map(({ category, displayLabel, route }) => (
                      <button
                        key={category}
                        type="button"
                        role="menuitem"
                        onClick={() => handleNavigate(route)}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1D293B] bb-btn-interactive flex items-center justify-between cursor-pointer"
                      >
                        <span className="truncate">{displayLabel}</span>
                        <span className="text-[11px] text-[#64748B]">→</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right Column: Secondary Platform Links & Quick Destinations */}
                <div className="col-span-5 flex flex-col justify-between">
                  <div>
                    <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                      Platform &amp; Help
                    </div>
                    <div className="space-y-0.5 mt-1">
                      {SECONDARY_INFO_NAV_ITEMS.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          role="menuitem"
                          onClick={() => handleNavigate(item.route)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 bb-btn-interactive cursor-pointer ${
                            currentRoute.page === item.route.page
                              ? 'bg-[#1D293B] text-[#F8FAFC]'
                              : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1D293B]'
                          }`}
                        >
                          {SECONDARY_ITEM_ICONS[item.id]}
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Account & Saved Access */}
                  <div className="pt-2 mt-2 border-t border-white/[0.08] space-y-0.5">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMoreMenuOpen(false);
                        onOpenWishlist();
                      }}
                      className="lg:hidden w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1D293B] flex items-center justify-between cursor-pointer"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Heart className="w-3.5 h-3.5 text-[#8B5CF6]" />
                        <span>Wishlist</span>
                      </span>
                      {wishlistCount > 0 && (
                        <span className="text-[11px] font-mono text-[#F8FAFC]">
                          {wishlistCount}
                        </span>
                      )}
                    </button>

                    {!userProfile && (
                      <>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => handleNavigate({ page: 'dashboard' })}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1D293B] flex items-center gap-2 cursor-pointer"
                        >
                          <LayoutDashboard className="w-3.5 h-3.5 text-[#8B5CF6]" />
                          <span>Rentals Dashboard</span>
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => handleNavigate({ page: 'profile' })}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1D293B] flex items-center gap-2 cursor-pointer"
                        >
                          <User className="w-3.5 h-3.5 text-[#94A3B8]" />
                          <span>Profile &amp; Settings</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* Right: Location, Search, Wishlist, and Auth / User Controls */}
      <div className="flex items-center gap-1.5 lg:gap-2 shrink-0">
        {/* City Selector Button */}
        <button
          type="button"
          aria-label={`Select location (current: ${selectedCity === 'All' ? 'All India' : selectedCity})`}
          onClick={() => setIsCityModalOpen(true)}
          className="inline-flex items-center gap-1.5 h-9 px-2.5 lg:px-3 rounded-lg border border-white/[0.08] bg-[#161E2E] hover:border-[#8B5CF6]/50 text-xs text-[#E2E8F0] hover:text-[#F8FAFC] transition-colors cursor-pointer"
          title="Select your city or region"
        >
          <MapPin className="w-3.5 h-3.5 text-[#8B5CF6] shrink-0" />
          <span className="hidden lg:inline font-medium max-w-[110px] truncate">
            {selectedCity === 'All' ? 'All India' : selectedCity}
          </span>
          <ChevronDown className="hidden lg:inline w-3 h-3 text-[#64748B] shrink-0" />
        </button>

        {/* Quick Search Access */}
        <div ref={searchRef} className="relative">
          <button
            type="button"
            aria-label="Open quick search"
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen((prev) => !prev)}
            className={`inline-flex items-center justify-center gap-1.5 h-9 px-2.5 rounded-lg border text-xs font-medium bb-btn-interactive cursor-pointer ${
              searchOpen || searchQuery
                ? 'bg-[#1D293B] border-[#8B5CF6]/40 text-[#F8FAFC]'
                : 'bg-[#161E2E] border-white/[0.08] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-white/[0.16]'
            }`}
          >
            <Search className="w-3.5 h-3.5 text-[#8B5CF6] shrink-0" />
            <span className="hidden xl:inline max-w-[96px] truncate">
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
                        Select your city
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

        {/* Wishlist Button (Shown on lg+, inside More menu on compact 768px tablet to prevent crowding) */}
        <button
          type="button"
          onClick={onOpenWishlist}
          aria-label={`Wishlist (${wishlistCount} saved items)`}
          className="hidden lg:inline-flex relative items-center justify-center h-9 px-2.5 rounded-lg bg-[#161E2E] border border-white/[0.08] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-white/[0.16] bb-btn-interactive cursor-pointer"
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

        {/* Dynamic Admin Panel Link — strictly for verified active administrators */}
        {userProfile && hasVerifiedAdminAccess && (
          <a
            href="/admin"
            onClick={(e) => {
              e.preventDefault();
              handleNavigate({ page: 'admin' });
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

        {/* In-App Notifications Indicator & Dropdown (Authenticated) */}
        {userProfile && (
          <div ref={notificationsRef} className="relative">
            <button
              type="button"
              data-testid="header-notifications-bell"
              aria-label={`Notifications (${unreadNotificationsCount} unread)`}
              aria-expanded={notificationsOpen}
              onClick={() => setNotificationsOpen((prev) => !prev)}
              className={`relative inline-flex items-center justify-center h-9 px-2.5 rounded-lg border bb-btn-interactive cursor-pointer ${
                notificationsOpen
                  ? 'bg-[#1D293B] border-[#8B5CF6]/45 text-[#F8FAFC]'
                  : 'bg-[#161E2E] border-white/[0.08] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-white/[0.16]'
              }`}
            >
              <Bell className="w-4 h-4 text-[#06B6D4]" />
              {unreadNotificationsCount > 0 && (
                <span
                  data-testid="header-unread-badge"
                  className="ml-1.5 px-1.5 py-0.2 rounded-full bg-[#8B5CF6] text-white text-[10px] font-bold font-mono-tabular"
                >
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {notificationsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.98 }}
                  transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                  role="menu"
                  aria-label="In-App Notifications"
                  data-testid="header-notifications-dropdown"
                  className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-[#161E2E] border border-white/[0.08] shadow-2xl p-3 z-50"
                >
                  <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/[0.08]">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#F8FAFC]">
                        Notifications
                      </span>
                      {unreadNotificationsCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 text-[10px] font-mono font-bold text-[#C4B5FD]">
                          {unreadNotificationsCount} unread
                        </span>
                      )}
                    </div>
                    {unreadNotificationsCount > 0 &&
                      onMarkAllNotificationsRead && (
                        <button
                          type="button"
                          onClick={() => onMarkAllNotificationsRead()}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#06B6D4] hover:underline cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                          <span>Mark all read</span>
                        </button>
                      )}
                  </div>

                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-xs text-[#94A3B8]">
                      No notifications yet. Ticket replies and updates will
                      appear here in real time.
                    </div>
                  ) : (
                    <div className="mt-2 max-h-80 overflow-y-auto space-y-1.5 pr-0.5">
                      {notifications.slice(0, 12).map((notif) => (
                        <div
                          key={notif.id}
                          data-testid={`header-notification-item-${notif.id}`}
                          onClick={() => {
                            setNotificationsOpen(false);
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
                          className={`p-2.5 rounded-lg border transition-colors cursor-pointer ${
                            notif.read
                              ? 'bg-[#111827]/60 border-white/[0.06] text-[#94A3B8] hover:border-white/[0.14]'
                              : 'bg-[#8B5CF6]/10 border-[#8B5CF6]/35 text-[#F8FAFC] hover:bg-[#8B5CF6]/15'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {!notif.read && (
                                <span className="w-2 h-2 rounded-full bg-[#06B6D4] shrink-0" />
                              )}
                              <span className="text-xs font-semibold truncate">
                                {notif.title}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-[#64748B] shrink-0">
                              {notif.timestampISO
                                ? new Date(
                                    notif.timestampISO
                                  ).toLocaleTimeString('en-IN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : ''}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#CBD5E1] mt-1 line-clamp-2">
                            {notif.body}
                          </p>
                          {notif.resolutionSummary && (
                            <div className="mt-1.5 p-2 rounded bg-[#22C55E]/10 border border-[#22C55E]/25 text-[11px] text-[#DCFCE7]">
                              <span className="font-semibold text-[#22C55E]">
                                Resolution Summary:{' '}
                              </span>
                              {notif.resolutionSummary}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Authenticated User Profile Menu OR Directly Visible Login / Sign Up */}
        {userProfile ? (
          <div ref={profileRef} className="relative">
            <button
              type="button"
              aria-label={`Account menu for ${userProfile.name}`}
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
              <span className="w-5 h-5 rounded-full bg-[#8B5CF6] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                {userProfile.name.charAt(0).toUpperCase()}
              </span>
              <span className="text-xs font-medium max-w-[90px] truncate">
                {userProfile.name.split(' ')[0]}
              </span>
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
                      onClick={() => handleNavigate({ page: 'profile' })}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-[#F8FAFC] hover:bg-[#1D293B] flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5 text-[#94A3B8]" />
                      <span>Profile &amp; Settings</span>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => handleNavigate({ page: 'dashboard' })}
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
                        onClick={() => handleNavigate({ page: 'admin' })}
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
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div
            data-testid="desktop-auth-actions"
            className="flex items-center gap-2 pl-1 border-l border-white/[0.08]"
          >
            <button
              type="button"
              data-testid="desktop-login-button"
              onClick={() => handleNavigate({ page: 'login' })}
              className={`h-9 px-3.5 rounded-lg text-xs font-semibold border transition-colors bb-btn-interactive cursor-pointer whitespace-nowrap ${
                currentRoute.page === 'login'
                  ? 'bg-[#1D293B] border-[#8B5CF6]/45 text-[#F8FAFC]'
                  : 'bg-[#161E2E] hover:bg-[#1D293B] border-white/[0.08] hover:border-white/[0.16] text-[#F8FAFC]'
              }`}
            >
              Login
            </button>
            <button
              type="button"
              data-testid="desktop-signup-button"
              onClick={() => handleNavigate({ page: 'signup' })}
              className="h-9 px-4 rounded-lg bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold bb-glow-button cursor-pointer whitespace-nowrap"
            >
              Sign Up
            </button>
          </div>
        )}
      </div>

      <CitySelectorModal
        isOpen={isCityModalOpen}
        onClose={() => setIsCityModalOpen(false)}
        selectedCity={selectedCity === 'All' ? null : selectedCity}
        onSelectCity={(c) => onCityChange(c ? (c as IndianCity) : 'All')}
      />
    </div>
  );
};
