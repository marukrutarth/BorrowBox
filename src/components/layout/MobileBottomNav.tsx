import React from 'react';
import { Compass, Heart, Home, Plus, User } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { BorrowBoxUserProfile } from '../../types/marketplace';
import { BB_EASE_OUT } from '../../utils/motionVariants';
import { PageRoute } from '../Navbar';

export interface MobileBottomNavProps {
  currentRoute: PageRoute;
  onNavigate: (route: PageRoute) => void;
  onOpenWishlist: () => void;
  wishlistCount: number;
  isWishlistModalOpen?: boolean;
  userProfile: BorrowBoxUserProfile | null;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentRoute,
  onNavigate,
  onOpenWishlist,
  wishlistCount,
  isWishlistModalOpen = false,
  userProfile,
}) => {
  const prefersReducedMotion = useReducedMotion();

  const isHomeActive = !isWishlistModalOpen && currentRoute.page === 'home';
  const isExploreActive =
    !isWishlistModalOpen &&
    (currentRoute.page === 'browse' || currentRoute.page === 'details');
  const isListActive =
    !isWishlistModalOpen && currentRoute.page === 'list-item';
  const isWishlistActive = isWishlistModalOpen;
  const isProfileActive =
    !isWishlistModalOpen &&
    (currentRoute.page === 'profile' ||
      currentRoute.page === 'dashboard' ||
      currentRoute.page === 'login' ||
      currentRoute.page === 'signup');

  const handleNavClick = (route: PageRoute) => {
    onNavigate(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0B0F19]/95 backdrop-blur-md border-t border-white/[0.08] bb-safe-bottom"
    >
      <div className="grid grid-cols-5 items-center h-16 max-w-lg mx-auto px-1">
        {/* 1. Home */}
        <button
          type="button"
          onClick={() => handleNavClick({ page: 'home' })}
          aria-label="Home"
          aria-current={isHomeActive ? 'page' : undefined}
          className={`relative flex flex-col items-center justify-center min-h-[48px] min-w-[44px] py-1 rounded-xl bb-btn-interactive cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#8B5CF6] ${
            isHomeActive
              ? 'text-[#F8FAFC]'
              : 'text-[#64748B] hover:text-[#94A3B8]'
          }`}
        >
          {isHomeActive && (
            <motion.span
              layoutId={
                prefersReducedMotion ? undefined : 'mobile-bottom-nav-indicator'
              }
              transition={{ duration: 0.22, ease: BB_EASE_OUT }}
              className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-[#8B5CF6]"
            />
          )}
          <Home
            className={`w-5 h-5 transition-colors duration-200 ${
              isHomeActive ? 'text-[#8B5CF6]' : 'text-[#64748B]'
            }`}
          />
          <span
            className={`text-[11px] font-medium leading-tight mt-1 transition-colors duration-200 ${
              isHomeActive ? 'text-[#F8FAFC]' : 'text-[#94A3B8]'
            }`}
          >
            Home
          </span>
        </button>

        {/* 2. Explore */}
        <button
          type="button"
          onClick={() => handleNavClick({ page: 'browse' })}
          aria-label="Explore"
          aria-current={isExploreActive ? 'page' : undefined}
          className={`relative flex flex-col items-center justify-center min-h-[48px] min-w-[44px] py-1 rounded-xl bb-btn-interactive cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#8B5CF6] ${
            isExploreActive
              ? 'text-[#F8FAFC]'
              : 'text-[#64748B] hover:text-[#94A3B8]'
          }`}
        >
          {isExploreActive && (
            <motion.span
              layoutId={
                prefersReducedMotion ? undefined : 'mobile-bottom-nav-indicator'
              }
              transition={{ duration: 0.22, ease: BB_EASE_OUT }}
              className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-[#8B5CF6]"
            />
          )}
          <Compass
            className={`w-5 h-5 transition-colors duration-200 ${
              isExploreActive ? 'text-[#8B5CF6]' : 'text-[#64748B]'
            }`}
          />
          <span
            className={`text-[11px] font-medium leading-tight mt-1 transition-colors duration-200 ${
              isExploreActive ? 'text-[#F8FAFC]' : 'text-[#94A3B8]'
            }`}
          >
            Explore
          </span>
        </button>

        {/* 3. List (Slightly more visual emphasis without being oversized) */}
        <button
          type="button"
          onClick={() => handleNavClick({ page: 'list-item' })}
          aria-label="List an item"
          aria-current={isListActive ? 'page' : undefined}
          className="relative flex flex-col items-center justify-center min-h-[48px] min-w-[44px] py-1 rounded-xl bb-btn-interactive cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#8B5CF6]"
        >
          {isListActive && (
            <motion.span
              layoutId={
                prefersReducedMotion ? undefined : 'mobile-bottom-nav-indicator'
              }
              transition={{ duration: 0.22, ease: BB_EASE_OUT }}
              className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-[#8B5CF6]"
            />
          )}
          <span
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-200 ${
              isListActive
                ? 'bg-[#8B5CF6] text-white shadow-sm shadow-[#8B5CF6]/40'
                : 'bg-[#8B5CF6]/20 border border-[#8B5CF6]/45 text-[#8B5CF6]'
            }`}
          >
            <Plus className="w-4 h-4 stroke-[2.25]" />
          </span>
          <span
            className={`text-[11px] font-semibold leading-tight mt-0.5 transition-colors duration-200 ${
              isListActive ? 'text-[#F8FAFC]' : 'text-[#F8FAFC]/90'
            }`}
          >
            List
          </span>
        </button>

        {/* 4. Wishlist */}
        <button
          type="button"
          onClick={onOpenWishlist}
          aria-label={
            wishlistCount > 0
              ? `Wishlist (${wishlistCount} saved)`
              : 'Wishlist'
          }
          aria-pressed={isWishlistActive}
          className={`relative flex flex-col items-center justify-center min-h-[48px] min-w-[44px] py-1 rounded-xl bb-btn-interactive cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#8B5CF6] ${
            isWishlistActive
              ? 'text-[#F8FAFC]'
              : 'text-[#64748B] hover:text-[#94A3B8]'
          }`}
        >
          {isWishlistActive && (
            <motion.span
              layoutId={
                prefersReducedMotion ? undefined : 'mobile-bottom-nav-indicator'
              }
              transition={{ duration: 0.22, ease: BB_EASE_OUT }}
              className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-[#8B5CF6]"
            />
          )}
          <span className="relative inline-flex items-center justify-center">
            <Heart
              className={`w-5 h-5 transition-colors duration-200 ${
                isWishlistActive || wishlistCount > 0
                  ? 'text-[#8B5CF6]'
                  : 'text-[#64748B]'
              } ${wishlistCount > 0 ? 'fill-[#8B5CF6]/25' : ''}`}
            />
            {wishlistCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-[#8B5CF6] text-white text-[10px] font-bold font-mono-tabular flex items-center justify-center leading-none">
                {wishlistCount}
              </span>
            )}
          </span>
          <span
            className={`text-[11px] font-medium leading-tight mt-1 transition-colors duration-200 ${
              isWishlistActive ? 'text-[#F8FAFC]' : 'text-[#94A3B8]'
            }`}
          >
            Wishlist
          </span>
        </button>

        {/* 5. Profile */}
        <button
          type="button"
          onClick={() => handleNavClick({ page: 'profile' })}
          aria-label={userProfile ? `Profile (${userProfile.name})` : 'Profile'}
          aria-current={isProfileActive ? 'page' : undefined}
          className={`relative flex flex-col items-center justify-center min-h-[48px] min-w-[44px] py-1 rounded-xl bb-btn-interactive cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#8B5CF6] ${
            isProfileActive
              ? 'text-[#F8FAFC]'
              : 'text-[#64748B] hover:text-[#94A3B8]'
          }`}
        >
          {isProfileActive && (
            <motion.span
              layoutId={
                prefersReducedMotion ? undefined : 'mobile-bottom-nav-indicator'
              }
              transition={{ duration: 0.22, ease: BB_EASE_OUT }}
              className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-[#8B5CF6]"
            />
          )}
          {userProfile ? (
            <span
              className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center transition-colors duration-200 ${
                isProfileActive
                  ? 'bg-[#8B5CF6] text-white'
                  : 'bg-[#1D293B] text-[#F8FAFC] border border-white/[0.14]'
              }`}
            >
              {userProfile.name.charAt(0).toUpperCase()}
            </span>
          ) : (
            <User
              className={`w-5 h-5 transition-colors duration-200 ${
                isProfileActive ? 'text-[#8B5CF6]' : 'text-[#64748B]'
              }`}
            />
          )}
          <span
            className={`text-[11px] font-medium leading-tight mt-1 transition-colors duration-200 ${
              isProfileActive ? 'text-[#F8FAFC]' : 'text-[#94A3B8]'
            }`}
          >
            Profile
          </span>
        </button>
      </div>
    </nav>
  );
};
