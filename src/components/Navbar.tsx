import React, { useEffect, useState } from 'react';
import {
  AdminRegistryRecord,
  BorrowBoxUserProfile,
  IndianCity,
  RentalRequestRecord,
} from '../types/marketplace';
import {
  WISHLIST_CHANGE_EVENT,
  loadWishlistIds,
} from '../utils/wishlist';
import { DesktopHeader } from './layout/DesktopHeader';
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
  | { page: 'admin' };

export interface NavbarProps {
  currentRoute: PageRoute;
  onNavigate: (route: PageRoute) => void;
  onScrollToHowItWorks: () => void;
  onOpenWishlist?: () => void;
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
  onOpenWishlist,
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
  const [isScrolled, setIsScrolled] = useState(false);
  const [wishlistCount, setWishlistCount] = useState<number>(() =>
    loadWishlistIds().length
  );

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 12);
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
    <header
      className={`sticky top-0 z-40 transition-colors duration-200 border-b border-white/[0.08] ${
        isScrolled
          ? 'bg-[#0B0F19]/95 backdrop-blur-md'
          : 'bg-[#0B0F19]/85 backdrop-blur-sm'
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
      />
    </header>
  );
};
