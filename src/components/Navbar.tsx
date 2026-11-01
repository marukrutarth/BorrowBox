import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  AdminRegistryRecord,
  AppNotificationItem,
  BorrowBoxUserProfile,
  IndianCity,
  RentalRequestRecord,
} from '../types/marketplace';
import { headerEntranceVariants } from '../utils/motionVariants';
import {
  WISHLIST_CHANGE_EVENT,
  loadWishlistIds,
} from '../utils/wishlist';
import { DesktopHeader } from './layout/DesktopHeader';
import { MobileBottomNav } from './layout/MobileBottomNav';
import { MobileHeader } from './layout/MobileHeader';

export type PageRoute =
  | { page: 'home' }
  | { page: 'browse'; category?: string; query?: string; city?: string }
  | { page: 'details'; itemId: string }
  | { page: 'list-item' }
  | { page: 'dashboard' }
  | { page: 'profile' }
  | { page: 'login' }
  | { page: 'signup' }
  | { page: 'admin' }
  | { page: 'support'; ticketId?: string }
  | { page: 'about' }
  | { page: 'team' }
  | { page: 'how-it-works' }
  | { page: 'contact' }
  | { page: 'terms' }
  | { page: 'privacy' };

export interface NavbarProps {
  currentRoute: PageRoute;
  onNavigate: (route: PageRoute) => void;
  onScrollToHowItWorks: () => void;
  onOpenWishlist?: () => void;
  isWishlistModalOpen?: boolean;
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

const NavbarComponent: React.FC<NavbarProps> = ({
  currentRoute,
  onNavigate,
  onScrollToHowItWorks,
  onOpenWishlist,
  isWishlistModalOpen = false,
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
  const [isScrolled, setIsScrolled] = useState(false);
  const [wishlistCount, setWishlistCount] = useState<number>(() =>
    loadWishlistIds().length
  );
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const onScroll = () => {
      const next = window.scrollY > 12;
      setIsScrolled((prev) => (prev === next ? prev : next));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const syncWishlist = () => {
      setWishlistCount(loadWishlistIds().length);
    };
    window.addEventListener(WISHLIST_CHANGE_EVENT, syncWishlist);
    window.addEventListener('storage', syncWishlist);
    return () => {
      window.removeEventListener(WISHLIST_CHANGE_EVENT, syncWishlist);
      window.removeEventListener('storage', syncWishlist);
    };
  }, []);

  const handleOpenWishlist = () => {
    if (onOpenWishlist) {
      onOpenWishlist();
    } else {
      onNavigate({ page: 'browse' });
    }
  };

  return (
    <>
      <motion.header
        initial={prefersReducedMotion ? false : 'hidden'}
        animate="visible"
        variants={headerEntranceVariants}
        className={`sticky top-0 z-40 transition-colors duration-180 border-b border-white/[0.08] backdrop-blur-xs ${
          isScrolled ? 'bg-[#0B0F19]/95' : 'bg-[#0B0F19]/88'
        }`}
      >
        <DesktopHeader
          currentRoute={currentRoute}
          onNavigate={onNavigate}
          onOpenHowItWorks={onScrollToHowItWorks}
          onOpenWishlist={handleOpenWishlist}
          wishlistCount={wishlistCount}
          userProfile={userProfile}
          verifiedAdminRecord={verifiedAdminRecord}
          onLogout={onLogout}
          rentalRequests={rentalRequests}
          onOpenRequestsModal={onOpenRequestsModal}
          selectedCity={selectedCity}
          onCityChange={onCityChange}
          searchQuery={searchQuery}
          onSearchQueryChange={onSearchQueryChange}
          unreadNotificationsCount={unreadNotificationsCount}
          notifications={notifications}
          onSelectNotification={onSelectNotification}
          onMarkAllNotificationsRead={onMarkAllNotificationsRead}
        />

        <MobileHeader
          currentRoute={currentRoute}
          onNavigate={onNavigate}
          onOpenHowItWorks={onScrollToHowItWorks}
          onOpenWishlist={handleOpenWishlist}
          wishlistCount={wishlistCount}
          userProfile={userProfile}
          verifiedAdminRecord={verifiedAdminRecord}
          onLogout={onLogout}
          rentalRequests={rentalRequests}
          onOpenRequestsModal={onOpenRequestsModal}
          selectedCity={selectedCity}
          onCityChange={onCityChange}
          searchQuery={searchQuery}
          onSearchQueryChange={onSearchQueryChange}
          unreadNotificationsCount={unreadNotificationsCount}
          notifications={notifications}
          onSelectNotification={onSelectNotification}
          onMarkAllNotificationsRead={onMarkAllNotificationsRead}
        />
      </motion.header>

      <MobileBottomNav
        currentRoute={currentRoute}
        onNavigate={onNavigate}
        onOpenWishlist={handleOpenWishlist}
        wishlistCount={wishlistCount}
        isWishlistModalOpen={isWishlistModalOpen}
        userProfile={userProfile}
      />
    </>
  );
};

export const Navbar = React.memo(NavbarComponent);
