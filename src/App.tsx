/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { DEMO_PRODUCT_LISTINGS } from './data/demoCatalog';
import {
  AdminRegistryRecord,
  AppNotificationItem,
  BookingMessageRecord,
  BookingStatus,
  BorrowBoxUserProfile,
  CategoryName,
  DepositStatus,
  IndianCity,
  ItemCondition,
  ProductListing,
  RentalBookingRecord,
  RentalRequestRecord,
  RentalReviewRecord,
  SortOption,
} from './types/marketplace';
import {
  User,
  auth,
  createBookingInFirestore,
  createListingInFirestore,
  createReviewInFirestore,
  ensureOrLoadUserProfile,
  fetchActiveCommunityListings,
  fetchBookingMessagesFromFirestore,
  fetchOwnerListings,
  fetchUserBookingsFromFirestore,
  fetchVerifiedReviewsFromFirestore,
  getPersistedSessionProfile,
  onAuthStateChanged,
  sendBookingMessageInFirestore,
  signOutUser,
  subscribeToVerifiedAdminSession,
  updateBookingWorkflowInFirestore,
  updateListingInFirestore,
  verifyAndLoadAdminSession,
} from './services/firebase';
import { Navbar, PageRoute } from './components/Navbar';
import { Footer, FooterInfoPageKey } from './components/layout/Footer';
import { HomePage } from './pages/HomePage';

const BrowsePage = lazy(() =>
  import('./pages/BrowsePage').then((m) => ({ default: m.BrowsePage }))
);
const ProductDetailsPage = lazy(() =>
  import('./pages/ProductDetailsPage').then((m) => ({
    default: m.ProductDetailsPage,
  }))
);
const ListItemPage = lazy(() =>
  import('./pages/ListItemPage').then((m) => ({ default: m.ListItemPage }))
);
const AuthPage = lazy(() =>
  import('./pages/AuthPage').then((m) => ({ default: m.AuthPage }))
);
const ProfilePage = lazy(() =>
  import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage }))
);
const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
const AdminDashboardPage = lazy(() =>
  import('./pages/AdminDashboardPage').then((m) => ({
    default: m.AdminDashboardPage,
  }))
);
const MySupportPage = lazy(() =>
  import('./pages/MySupportPage').then((m) => ({ default: m.MySupportPage }))
);
const About = lazy(() =>
  import('./pages/About').then((m) => ({ default: m.About }))
);
const AboutUsPage = lazy(() =>
  import('./pages/AboutUsPage').then((m) => ({ default: m.AboutUsPage }))
);
const HowItWorksPage = lazy(() =>
  import('./pages/HowItWorksPage').then((m) => ({
    default: m.HowItWorksPage,
  }))
);
const ContactPage = lazy(() =>
  import('./pages/ContactPage').then((m) => ({ default: m.ContactPage }))
);
const TermsPage = lazy(() =>
  import('./pages/TermsPage').then((m) => ({ default: m.TermsPage }))
);
const PrivacyPage = lazy(() =>
  import('./pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage }))
);
import {
  InfoModal,
  RequestsModal,
  WishlistModal,
} from './components/InfoAndRequestsModal';
import { BorrowBoxIntro } from './components/BorrowBoxIntro';
import {
  detectPrefersReducedMotion,
  shouldPlayIntroAnimation,
} from './utils/introAnimation';
import {
  markSupportNotificationRead,
  subscribeToSupportNotifications,
} from './services/supportTicketService';

function parseUrlToRoute(pathname: string, search: string): PageRoute {
  const params = new URLSearchParams(search);
  if (pathname === '/browse') {
    return {
      page: 'browse',
      category: params.get('category') || undefined,
      query: params.get('q') || undefined,
      city: params.get('city') || undefined,
    };
  }
  if (pathname.startsWith('/items/')) {
    const itemId = pathname.replace('/items/', '').trim();
    if (itemId) {
      return { page: 'details', itemId };
    }
  }
  if (pathname === '/list-item') {
    return { page: 'list-item' };
  }
  if (pathname === '/dashboard') {
    return { page: 'dashboard' };
  }
  if (pathname === '/profile') {
    return { page: 'profile' };
  }
  if (pathname === '/login') {
    return { page: 'login' };
  }
  if (pathname === '/signup') {
    return { page: 'signup' };
  }
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return { page: 'admin' };
  }
  if (pathname === '/support' || pathname.startsWith('/support/')) {
    const ticketId = params.get('ticket') || undefined;
    return { page: 'support', ticketId };
  }
  if (pathname === '/about' || pathname === '/about/') {
    return { page: 'about' };
  }
  if (
    pathname === '/team' ||
    pathname === '/team/' ||
    pathname === '/our-team' ||
    pathname === '/our-team/'
  ) {
    return { page: 'team' };
  }
  if (
    pathname === '/how-it-works' ||
    pathname === '/how-it-works/' ||
    pathname === '/howitworks'
  ) {
    return { page: 'how-it-works' };
  }
  if (
    pathname === '/contact' ||
    pathname === '/contact/' ||
    pathname === '/contact-us'
  ) {
    return { page: 'contact' };
  }
  if (
    pathname === '/terms' ||
    pathname === '/terms/' ||
    pathname === '/terms-and-conditions'
  ) {
    return { page: 'terms' };
  }
  if (
    pathname === '/privacy' ||
    pathname === '/privacy/' ||
    pathname === '/privacy-policy'
  ) {
    return { page: 'privacy' };
  }
  return { page: 'home' };
}

function routeToUrl(route: PageRoute): string {
  switch (route.page) {
    case 'browse': {
      const params = new URLSearchParams();
      if (route.category && route.category !== 'All') {
        params.set('category', route.category);
      }
      if (route.query) {
        params.set('q', route.query);
      }
      if (route.city && route.city !== 'All') {
        params.set('city', route.city);
      }
      const qs = params.toString();
      return qs ? `/browse?${qs}` : '/browse';
    }
    case 'details':
      return `/items/${route.itemId}`;
    case 'list-item':
      return '/list-item';
    case 'dashboard':
      return '/dashboard';
    case 'profile':
      return '/profile';
    case 'login':
      return '/login';
    case 'signup':
      return '/signup';
    case 'admin':
      return '/admin';
    case 'support':
      return route.ticketId
        ? `/support?ticket=${encodeURIComponent(route.ticketId)}`
        : '/support';
    case 'about':
      return '/about';
    case 'team':
      return '/team';
    case 'how-it-works':
      return '/how-it-works';
    case 'contact':
      return '/contact';
    case 'terms':
      return '/terms';
    case 'privacy':
      return '/privacy';
    case 'home':
    default:
      return '/';
  }
}

export default function App() {
  const [listings, setListings] = useState<ProductListing[]>(
    DEMO_PRODUCT_LISTINGS
  );
  const [isLoadingListings, setIsLoadingListings] = useState(false);
  const [listingsError, setListingsError] = useState<string | null>(null);
  const [editingListing, setEditingListing] = useState<ProductListing | null>(
    null
  );

  const [currentRoute, setCurrentRoute] = useState<PageRoute>(() =>
    parseUrlToRoute(window.location.pathname, window.location.search)
  );

  // Brand signature intro state (plays on every website load/refresh, never replays during internal SPA navigation)
  const [isIntroActive, setIsIntroActive] = useState<boolean>(() =>
    shouldPlayIntroAnimation({
      prefersReducedMotion: detectPrefersReducedMotion(),
    })
  );

  // Browse filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<
    CategoryName | 'All'
  >('All');
  const [selectedCity, setSelectedCity] = useState<IndianCity | 'All'>(() => {
    try {
      const saved = localStorage.getItem('borrowbox_selected_city');
      return (saved as IndianCity) || 'All';
    } catch {
      return 'All';
    }
  });

  const handleCityChange = (city: IndianCity | 'All') => {
    setSelectedCity(city);
    try {
      if (city === 'All') {
        localStorage.removeItem('borrowbox_selected_city');
      } else {
        localStorage.setItem('borrowbox_selected_city', city);
      }
    } catch {
      // Storage unavailable
    }
  };
  const [selectedCondition, setSelectedCondition] = useState<
    ItemCondition | 'All'
  >('All');
  const [sortBy, setSortBy] = useState<SortOption>('featured');

  // Firebase Auth & Firestore User Profile state
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] =
    useState<BorrowBoxUserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [pendingProtectedRoute, setPendingProtectedRoute] =
    useState<PageRoute | null>(null);

  // Verified Administrator session state (populated after Firebase Auth login & synced in real time)
  const [verifiedAdminRecord, setVerifiedAdminRecord] =
    useState<AdminRegistryRecord | null>(null);
  const [isVerifyingAdminSession, setIsVerifyingAdminSession] = useState(false);
  const [adminAccessDeniedReason, setAdminAccessDeniedReason] = useState<
    string | null
  >(null);

  // Bookings, messages, reviews, notifications & modals
  const [bookings, setBookings] = useState<RentalBookingRecord[]>([]);
  const [messagesByBooking, setMessagesByBooking] = useState<
    Record<string, BookingMessageRecord[]>
  >({});
  const [reviews, setReviews] = useState<RentalReviewRecord[]>([]);
  const [notifications, setNotifications] = useState<AppNotificationItem[]>([]);
  const [rentalRequests, setRentalRequests] = useState<RentalRequestRecord[]>(
    []
  );
  const [activeInfoModal, setActiveInfoModal] =
    useState<FooterInfoPageKey | null>(null);
  const [isRequestsModalOpen, setIsRequestsModalOpen] = useState(false);
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);

  const addNotification = (
    title: string,
    body: string,
    bookingId?: string
  ) => {
    const newItem: AppNotificationItem = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      body,
      timestampISO: new Date().toISOString(),
      read: false,
      bookingId,
    };
    setNotifications((prev) => [newItem, ...prev]);
  };

  // Load community listings and verified reviews from Firestore
  const loadCommunityData = async () => {
    setIsLoadingListings(true);
    setListingsError(null);
    try {
      const [communityItems, verifiedReviews] = await Promise.all([
        fetchActiveCommunityListings(),
        fetchVerifiedReviewsFromFirestore(),
      ]);
      setListings((prev) => {
        const demoItems = prev.filter((i) => i.isDemoData);
        const byId = new Map<string, ProductListing>();
        for (const item of communityItems) {
          byId.set(item.id, item);
        }
        for (const item of demoItems) {
          byId.set(item.id, item);
        }
        return Array.from(byId.values());
      });
      setReviews(verifiedReviews);
    } catch (err) {
      console.warn('Could not load community listings from Firestore:', err);
    } finally {
      setIsLoadingListings(false);
    }
  };

  useEffect(() => {
    void loadCommunityData();
  }, []);

  // Subscribe to Firebase Authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        const persisted = getPersistedSessionProfile();
        if (persisted) {
          setUserProfile(persisted);
          const pseudoUser = {
            uid: persisted.uid,
            email: persisted.email,
            displayName: persisted.name,
            photoURL: persisted.photoURL || null,
          } as unknown as User;
          setFirebaseUser(pseudoUser);
          setIsAuthLoading(false);
          return;
        }
        setFirebaseUser(null);
        setUserProfile(null);
        setIsAuthLoading(false);
        return;
      }
      setFirebaseUser(fbUser);
      try {
        const profile = await ensureOrLoadUserProfile(fbUser);
        setUserProfile(profile);

        // Load user's bookings and owner listings (including archived)
        const [userBookings, ownerItems] = await Promise.all([
          fetchUserBookingsFromFirestore(profile.uid).catch(() => []),
          fetchOwnerListings(profile.uid).catch(() => []),
        ]);
        setBookings(userBookings);
        if (ownerItems.length > 0) {
          setListings((prev) => {
            const byId = new Map<string, ProductListing>();
            for (const item of ownerItems) {
              byId.set(item.id, item);
            }
            for (const item of prev) {
              if (!byId.has(item.id)) {
                byId.set(item.id, item);
              }
            }
            return Array.from(byId.values());
          });
        }
      } catch {
        const fallbackNow = new Date().toISOString();
        setUserProfile({
          uid: fbUser.uid,
          name:
            fbUser.displayName ||
            (fbUser.email ? fbUser.email.split('@')[0] : 'BorrowBox Member'),
          email: fbUser.email || '',
          phone: '',
          photoURL: fbUser.photoURL || '',
          city: (selectedCity !== 'All' ? selectedCity : '') as IndianCity,
          neighborhood: '',
          canRent: true,
          canList: true,
          activeMode: 'renter',
          createdAtISO: fallbackNow,
          updatedAtISO: fallbackNow,
          isAdmin:
            (fbUser.email || '').trim().toLowerCase() ===
            'marukrutarth@gmail.com',
        });
      } finally {
        setIsAuthLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-time administrator verification & live revocation listener whenever firebaseUser changes
  useEffect(() => {
    if (!firebaseUser) {
      setVerifiedAdminRecord(null);
      setIsVerifyingAdminSession(false);
      setAdminAccessDeniedReason(null);
      return;
    }

    setIsVerifyingAdminSession(true);
    const unsubscribeAdmin = subscribeToVerifiedAdminSession(
      firebaseUser,
      (res) => {
        if (res.authorized && res.adminRecord) {
          setVerifiedAdminRecord(res.adminRecord);
          setAdminAccessDeniedReason(null);
        } else {
          setVerifiedAdminRecord(null);
          setAdminAccessDeniedReason(res.reason || null);
        }
        setIsVerifyingAdminSession(false);
      }
    );

    return () => {
      unsubscribeAdmin();
    };
  }, [firebaseUser]);

  // Real-time customer support notifications listener (accessible from anywhere in BorrowBox)
  useEffect(() => {
    if (!userProfile?.uid) return;
    const unsubscribe = subscribeToSupportNotifications(
      { uid: userProfile.uid, role: 'customer' },
      (supportNotifs) => {
        setNotifications((prev) => {
          const nonSupport = prev.filter((item) => !item.ticketId);
          const merged = [...supportNotifs, ...nonSupport];
          const byId = new Map<string, AppNotificationItem>();
          for (const item of merged) {
            byId.set(item.id, item);
          }
          return Array.from(byId.values()).sort(
            (a, b) =>
              new Date(b.timestampISO || 0).getTime() -
              new Date(a.timestampISO || 0).getTime()
          );
        });
      }
    );
    return () => {
      unsubscribe();
    };
  }, [userProfile?.uid]);

  // Sync browse filters if browser back/forward buttons are used
  useEffect(() => {
    const handlePopState = () => {
      const parsed = parseUrlToRoute(
        window.location.pathname,
        window.location.search
      );
      setCurrentRoute(parsed);
      if (parsed.page === 'browse') {
        setSelectedCategory((parsed.category as CategoryName) || 'All');
        setSearchQuery(parsed.query || '');
        setSelectedCity((parsed.city as IndianCity) || 'All');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleNavigate = (route: PageRoute) => {
    if (route.page === 'browse') {
      if (route.category !== undefined) {
        setSelectedCategory((route.category as CategoryName) || 'All');
      }
      if (route.query !== undefined) {
        setSearchQuery(route.query);
      }
      if (route.city !== undefined) {
        setSelectedCity((route.city as IndianCity) || 'All');
      }
    }
    if (route.page !== 'list-item') {
      setEditingListing(null);
    }
    setCurrentRoute(route);
    const targetUrl = routeToUrl(route);
    if (window.location.pathname + window.location.search !== targetUrl) {
      window.history.pushState({}, '', targetUrl);
    }
  };

  const handleScrollToHowItWorks = () => {
    setActiveInfoModal('how-it-works');
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedCity('All');
    setSelectedCondition('All');
    setSortBy('featured');
    window.history.replaceState({}, '', '/browse');
  };

  const handleSaveListing = async (
    savedListing: ProductListing,
    isEdit: boolean
  ) => {
    if (userProfile && !savedListing.isDemoData) {
      if (isEdit) {
        await updateListingInFirestore(savedListing);
      } else {
        await createListingInFirestore(savedListing);
      }
    }

    setListings((prev) => {
      const exists = prev.some((i) => i.id === savedListing.id);
      if (exists) {
        return prev.map((i) => (i.id === savedListing.id ? savedListing : i));
      }
      return [savedListing, ...prev];
    });
    setEditingListing(null);
    addNotification(
      isEdit ? 'Listing Updated' : 'Listing Published',
      `${savedListing.title} is now live in ${savedListing.city}.`
    );
  };

  const handleToggleArchiveListing = async (listing: ProductListing) => {
    const nextStatus = listing.status === 'archived' ? 'active' : 'archived';
    const updated: ProductListing = {
      ...listing,
      status: nextStatus,
    };
    if (!listing.isDemoData && userProfile) {
      await updateListingInFirestore(updated);
    }
    setListings((prev) =>
      prev.map((item) => (item.id === listing.id ? updated : item))
    );
    addNotification(
      nextStatus === 'archived' ? 'Listing Archived' : 'Listing Restored',
      `${listing.title} has been ${
        nextStatus === 'archived'
          ? 'archived from public search'
          : 'restored to active search'
      }.`
    );
  };

  const handleSubmitBooking = async (booking: RentalBookingRecord) => {
    if (userProfile && !booking.isDemoTransaction) {
      try {
        await createBookingInFirestore(booking);
      } catch (err) {
        console.warn('Firestore booking save warning:', err);
      }
    }
    setBookings((prev) => [booking, ...prev]);

    // Also mirror in session rentalRequests so the Navbar Requests modal stays in sync
    const legacyRequest: RentalRequestRecord = {
      id: booking.id,
      listingId: booking.listingId,
      listingTitle: booking.listingTitle,
      listingCity: booking.listingCity,
      ownerName: booking.ownerName,
      startDate: booking.startDate,
      endDate: booking.endDate,
      days: booking.days,
      netRentalCostINR: booking.netRentalCostINR,
      refundableDepositINR: booking.refundableDepositINR,
      totalUpfrontINR: booking.totalUpfrontINR,
      borrowerName: booking.borrowerName,
      borrowerPhone: userProfile?.phone || '9876543210',
      pickupNote: booking.pickupConditionNote || 'Standard pickup',
      createdAt: booking.createdAtISO,
      status: booking.status,
      isDemoTransaction: Boolean(booking.isDemoTransaction),
    };
    setRentalRequests((prev) => [legacyRequest, ...prev]);

    addNotification(
      'Booking Request Submitted',
      `Your reservation for ${booking.listingTitle} (${booking.startDate} to ${booking.endDate}) has been logged with code ${booking.handoverCode}.`,
      booking.id
    );
  };

  const handleUpdateBookingWorkflow = async (
    booking: RentalBookingRecord,
    nextStatus: BookingStatus,
    nextDepositStatus: DepositStatus,
    extra?: {
      pickupConditionNote?: string;
      pickupPhotoUrl?: string;
      returnConditionNote?: string;
      returnPhotoUrl?: string;
      disputeReason?: string;
    }
  ) => {
    const mergedUpdates = {
      status: nextStatus,
      depositStatus: nextDepositStatus,
      pickupConditionNote:
        extra?.pickupConditionNote ?? booking.pickupConditionNote,
      pickupPhotoUrl: extra?.pickupPhotoUrl ?? booking.pickupPhotoUrl,
      returnConditionNote:
        extra?.returnConditionNote ?? booking.returnConditionNote,
      returnPhotoUrl: extra?.returnPhotoUrl ?? booking.returnPhotoUrl,
      disputeReason: extra?.disputeReason ?? booking.disputeReason,
    };

    if (!booking.isDemoTransaction && userProfile) {
      await updateBookingWorkflowInFirestore(booking.id, mergedUpdates);
    }

    setBookings((prev) =>
      prev.map((b) =>
        b.id === booking.id
          ? {
              ...b,
              ...mergedUpdates,
              updatedAtISO: new Date().toISOString(),
            }
          : b
      )
    );
    addNotification(
      `Booking Status: ${nextStatus.toUpperCase()}`,
      `${booking.listingTitle} moved to ${nextStatus}.`,
      booking.id
    );
  };

  const handleLoadMessagesForBooking = async (booking: RentalBookingRecord) => {
    if (!userProfile || booking.isDemoTransaction) return;
    const role = booking.borrowerId === userProfile.uid ? 'borrower' : 'owner';
    try {
      const msgs = await fetchBookingMessagesFromFirestore(
        booking.id,
        userProfile.uid,
        role
      );
      setMessagesByBooking((prev) => ({ ...prev, [booking.id]: msgs }));
    } catch (err) {
      console.warn('Could not load messages from Firestore:', err);
    }
  };

  const handleSendMessage = async (
    booking: RentalBookingRecord,
    text: string
  ) => {
    if (!userProfile) return;

    const newMsg: BookingMessageRecord = {
      id: `msg-${Date.now().toString(36)}`,
      bookingId: booking.id,
      borrowerId: booking.borrowerId,
      ownerId: booking.ownerId,
      senderId: userProfile.uid,
      senderName: userProfile.name,
      text: text.trim(),
      createdAtISO: new Date().toISOString(),
    };

    if (!booking.isDemoTransaction) {
      try {
        await sendBookingMessageInFirestore(newMsg);
        const role =
          booking.borrowerId === userProfile.uid ? 'borrower' : 'owner';
        const refreshed = await fetchBookingMessagesFromFirestore(
          booking.id,
          userProfile.uid,
          role
        );
        setMessagesByBooking((prev) => ({ ...prev, [booking.id]: refreshed }));
        return;
      } catch (err) {
        console.warn('Fallback to session message store:', err);
      }
    }

    setMessagesByBooking((prev) => ({
      ...prev,
      [booking.id]: [...(prev[booking.id] || []), newMsg],
    }));
  };

  const handleSubmitReview = async (
    booking: RentalBookingRecord,
    rating: number,
    comment: string
  ) => {
    if (!userProfile) return;
    const review: RentalReviewRecord = {
      id: `rev-${Date.now().toString(36)}`,
      bookingId: booking.id,
      listingId: booking.listingId,
      reviewerId: userProfile.uid,
      reviewerName: userProfile.name,
      revieweeId: booking.ownerId,
      rating,
      comment: comment.trim(),
      createdAtISO: new Date().toISOString(),
    };

    if (!booking.isDemoTransaction) {
      await createReviewInFirestore(review);
    }
    setReviews((prev) => [review, ...prev]);
    addNotification(
      'Verified Review Published',
      `Your ${review.rating}-star review for ${booking.listingTitle} is now linked to booking ${booking.id}.`,
      booking.id
    );
  };

  const handleMarkNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (userProfile?.uid) {
      void markSupportNotificationRead({
        recipientUid: userProfile.uid,
        role: 'customer',
      });
    }
  };

  const handleSelectNotification = (notif: AppNotificationItem) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
    );
    if (userProfile?.uid && notif.ticketId) {
      void markSupportNotificationRead({
        notificationId: notif.id,
        recipientUid: userProfile.uid,
        role: 'customer',
      });
    }
    if (notif.ticketId) {
      handleNavigate({ page: 'support', ticketId: notif.ticketId });
    } else {
      handleNavigate({ page: 'dashboard' });
    }
  };

  const handleLogout = async () => {
    await signOutUser();
    setUserProfile(null);
    setVerifiedAdminRecord(null);
    setAdminAccessDeniedReason(null);
    if (
      currentRoute.page === 'profile' ||
      currentRoute.page === 'list-item' ||
      currentRoute.page === 'dashboard' ||
      currentRoute.page === 'admin'
    ) {
      handleNavigate({ page: 'home' });
    }
  };

  const handleAuthenticated = (profile: BorrowBoxUserProfile) => {
    setUserProfile(profile);
    const activeUser =
      auth.currentUser ||
      ({
        uid: profile.uid,
        email: profile.email,
        displayName: profile.name,
        photoURL: profile.photoURL || null,
      } as unknown as User);
    setFirebaseUser(activeUser);
    setIsVerifyingAdminSession(true);
    void verifyAndLoadAdminSession(activeUser).then((res) => {
      if (res.authorized && res.adminRecord) {
        setVerifiedAdminRecord(res.adminRecord);
        setAdminAccessDeniedReason(null);
      } else {
        setVerifiedAdminRecord(null);
        setAdminAccessDeniedReason(res.reason || null);
      }
      setIsVerifyingAdminSession(false);
    });
    if (pendingProtectedRoute) {
      const target = pendingProtectedRoute;
      setPendingProtectedRoute(null);
      handleNavigate(target);
    } else {
      handleNavigate({ page: 'profile' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeListing =
    currentRoute.page === 'details'
      ? listings.find((item) => item.id === currentRoute.itemId)
      : undefined;

  const isProtectedPage =
    currentRoute.page === 'list-item' ||
    currentRoute.page === 'profile' ||
    currentRoute.page === 'dashboard';

  const renderMainContent = () => {
    if (isAuthLoading && isProtectedPage) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-[#94A3B8]">
          <Loader2 className="w-6 h-6 animate-spin text-[#8B5CF6]" />
          <p className="text-sm font-medium text-[#F8FAFC]">
            Verifying authentication status...
          </p>
        </div>
      );
    }

    // Protect authenticated pages (/list-item, /profile, /dashboard, /support)
    if (isProtectedPage && !userProfile) {
      const reason =
        currentRoute.page === 'list-item'
          ? 'Protected Page: Please log in or create a BorrowBox account to list an item for rent.'
          : currentRoute.page === 'dashboard'
          ? 'Protected Page: Please log in or create an account to access your Borrower & Lender Dashboard.'
          : 'Protected Page: Please log in or create an account to view and edit your BorrowBox profile.';

      return (
        <AuthPage
          mode="login"
          redirectReason={reason}
          onSwitchMode={(newMode) => {
            setPendingProtectedRoute(currentRoute);
            handleNavigate({ page: newMode });
          }}
          onAuthenticated={(profile) => {
            setUserProfile(profile);
            handleNavigate(currentRoute);
          }}
          onNavigate={handleNavigate}
        />
      );
    }

    if (currentRoute.page === 'home') {
      return (
        <HomePage
          listings={listings}
          selectedCity={selectedCity}
          onCityChange={handleCityChange}
          isLoadingListings={isLoadingListings}
          listingsError={listingsError}
          onRetryListings={() => void loadCommunityData()}
          onNavigate={handleNavigate}
        />
      );
    }

    if (currentRoute.page === 'browse') {
      return (
        <BrowsePage
          listings={listings}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          selectedCity={selectedCity}
          onCityChange={setSelectedCity}
          selectedCondition={selectedCondition}
          onConditionChange={setSelectedCondition}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          onResetFilters={handleResetFilters}
          onNavigate={handleNavigate}
        />
      );
    }

    if (currentRoute.page === 'details') {
      return (
        <ProductDetailsPage
          listing={activeListing}
          allListings={listings}
          demoUser={userProfile}
          onNavigate={handleNavigate}
          onSubmitBooking={handleSubmitBooking}
          existingBookingsForListing={bookings.filter(
            (b) => b.listingId === currentRoute.itemId
          )}
          reviewsForListing={reviews.filter(
            (rev) => rev.listingId === currentRoute.itemId
          )}
        />
      );
    }

    if (currentRoute.page === 'list-item') {
      return (
        <ListItemPage
          demoUser={userProfile}
          editingListing={editingListing}
          onSaveListing={handleSaveListing}
          onCancelEdit={() => {
            setEditingListing(null);
            handleNavigate({ page: 'dashboard' });
          }}
          onNavigate={handleNavigate}
        />
      );
    }

    if (currentRoute.page === 'dashboard' && userProfile) {
      return (
        <DashboardPage
          userProfile={userProfile}
          verifiedAdminRecord={verifiedAdminRecord}
          listings={listings}
          bookings={bookings}
          messagesByBooking={messagesByBooking}
          reviews={reviews}
          notifications={notifications}
          onNavigate={handleNavigate}
          onEditListing={(listingToEdit) => {
            setEditingListing(listingToEdit);
            handleNavigate({ page: 'list-item' });
          }}
          onToggleArchiveListing={handleToggleArchiveListing}
          onUpdateBookingWorkflow={handleUpdateBookingWorkflow}
          onSendMessage={handleSendMessage}
          onLoadMessagesForBooking={handleLoadMessagesForBooking}
          onSubmitReview={handleSubmitReview}
          onMarkNotificationsRead={handleMarkNotificationsRead}
        />
      );
    }

    if (currentRoute.page === 'profile' && userProfile) {
      return (
        <ProfilePage
          userProfile={userProfile}
          verifiedAdminRecord={verifiedAdminRecord}
          onProfileUpdated={setUserProfile}
          onLogout={handleLogout}
          onNavigate={handleNavigate}
          userListings={listings.filter(
            (l) => !l.isDemoData && l.owner.id === userProfile.uid
          )}
          userRequests={rentalRequests}
        />
      );
    }

    if (currentRoute.page === 'support') {
      return (
        <div className="dark">
          <MySupportPage
            userProfile={userProfile}
            isAuthenticated={Boolean(userProfile)}
            onOpenAuthModal={() => handleNavigate({ page: 'login' })}
            userBookings={
              userProfile
                ? bookings.filter(
                    (b) =>
                      b.borrowerId === userProfile.uid ||
                      b.ownerId === userProfile.uid
                  )
                : []
            }
            userListings={
              userProfile
                ? listings.filter(
                    (l) => !l.isDemoData && l.owner.id === userProfile.uid
                  )
                : []
            }
            initialTicketId={currentRoute.ticketId}
            isAuthorizedAdmin={Boolean(verifiedAdminRecord)}
            onNavigate={handleNavigate}
            onNotificationsLoaded={(supportNotifs) => {
              setNotifications((prev) => {
                const existingIds = new Set(prev.map((p) => p.id));
                const fresh = supportNotifs.filter(
                  (s) => !existingIds.has(s.id)
                );
                return fresh.length > 0 ? [...fresh, ...prev] : prev;
              });
            }}
          />
        </div>
      );
    }

    if (currentRoute.page === 'login' || currentRoute.page === 'signup') {
      return (
        <AuthPage
          mode={currentRoute.page}
          redirectReason={
            pendingProtectedRoute
              ? 'Please complete authentication to continue to your requested page.'
              : null
          }
          onSwitchMode={(newMode) => handleNavigate({ page: newMode })}
          onAuthenticated={handleAuthenticated}
          onNavigate={handleNavigate}
        />
      );
    }

    if (currentRoute.page === 'about') {
      return <AboutUsPage onNavigate={handleNavigate} />;
    }

    if (currentRoute.page === 'team') {
      return <About onNavigate={handleNavigate} />;
    }

    if (currentRoute.page === 'how-it-works') {
      return <HowItWorksPage onNavigate={handleNavigate} />;
    }

    if (currentRoute.page === 'contact') {
      return <ContactPage onNavigate={handleNavigate} />;
    }

    if (currentRoute.page === 'terms') {
      return <TermsPage onNavigate={handleNavigate} />;
    }

    if (currentRoute.page === 'privacy') {
      return <PrivacyPage onNavigate={handleNavigate} />;
    }

    return (
      <HomePage
        listings={listings}
        selectedCity={selectedCity}
        onCityChange={setSelectedCity}
        isLoadingListings={isLoadingListings}
        listingsError={listingsError}
        onRetryListings={() => void loadCommunityData()}
        onNavigate={handleNavigate}
      />
    );
  };

  const routeTransitionKey =
    currentRoute.page === 'details'
      ? `details-${currentRoute.itemId}`
      : currentRoute.page;

  // Dynamic route-aware SEO synchronization
  useEffect(() => {
    const seoMap: Record<
      PageRoute['page'],
      { title: string; description: string }
    > = {
      home: {
        title: 'BorrowBox — Access More. Own Less. | Peer-to-Peer Rental Marketplace Across India',
        description:
          'BorrowBox is an Indian peer-to-peer neighborhood rental marketplace where verified owners and borrowers rent cameras, PS5 consoles, tools, projectors, and outdoor gear in ₹ (INR) across India.',
      },
      browse: {
        title: `Explore Rentals${selectedCity !== 'All' ? ` in ${selectedCity}` : ' Across India'} | BorrowBox`,
        description:
          'Browse verified peer-to-peer equipment rentals across all 28 states and 8 union territories in India with transparent daily ₹ rates and refundable security deposits.',
      },
      details: {
        title: activeListing
          ? `${activeListing.title} (${activeListing.city}) | BorrowBox Rental`
          : 'Item Details | BorrowBox',
        description: activeListing
          ? `Rent ${activeListing.title} in ${activeListing.neighborhood}, ${activeListing.city} on BorrowBox. Verified owner handover with refundable deposit protection.`
          : 'View verified equipment specifications, daily ₹ pricing, and availability on BorrowBox.',
      },
      'list-item': {
        title: 'List an Item & Earn | BorrowBox India',
        description:
          'Turn your idle cameras, consoles, tools, and event gear into extra income by listing on BorrowBox across any Indian city.',
      },
      dashboard: {
        title: 'Rental Workspace & Bookings | BorrowBox',
        description:
          'Manage your active borrows, owner listings, QR handover codes, and verified booking conversations on BorrowBox.',
      },
      profile: {
        title: 'My Profile & Location Settings | BorrowBox',
        description:
          'Manage your BorrowBox account profile, Indian state and city location preferences, and verified rental history.',
      },
      login: {
        title: 'Sign In | BorrowBox',
        description: 'Sign in to your BorrowBox account to rent or list equipment across India.',
      },
      signup: {
        title: 'Create Account | BorrowBox',
        description: 'Join BorrowBox to borrow and lend verified gear in your city across India.',
      },
      admin: {
        title: 'Admin Console | BorrowBox',
        description: 'BorrowBox platform operations, RBAC governance, moderation, and support management.',
      },
      support: {
        title: 'Support & Help Center | BorrowBox',
        description: 'Create and track support tickets, booking inquiries, and resolution updates with BorrowBox Support.',
      },
      about: {
        title: 'About Us | BorrowBox — Access More. Own Less.',
        description: 'Learn how BorrowBox is building India’s trusted peer-to-peer sharing economy across every state and city.',
      },
      team: {
        title: 'Our Team | BorrowBox',
        description: 'Meet the engineering and product team behind BorrowBox.',
      },
      'how-it-works': {
        title: 'How It Works — Borrowing & Lending Guide | BorrowBox',
        description: 'Step-by-step guide to discovering gear, reserving dates, QR handover verification, and deposit protection on BorrowBox.',
      },
      contact: {
        title: 'Contact Us | BorrowBox',
        description: 'Get in touch with the BorrowBox team for support, partnership, or platform inquiries.',
      },
      terms: {
        title: 'Terms & Conditions | BorrowBox',
        description: 'Read BorrowBox marketplace rental terms, borrower responsibilities, and security deposit policies.',
      },
      privacy: {
        title: 'Privacy Policy | BorrowBox',
        description: 'Learn how BorrowBox protects your personal data, location preferences, and transaction security.',
      },
    };

    const meta = seoMap[currentRoute.page] || seoMap.home;
    document.title = meta.title;

    const descEl = document.querySelector('meta[name="description"]');
    if (descEl) descEl.setAttribute('content', meta.description);
    const ogTitleEl = document.querySelector('meta[property="og:title"]');
    if (ogTitleEl) ogTitleEl.setAttribute('content', meta.title);
    const ogDescEl = document.querySelector('meta[property="og:description"]');
    if (ogDescEl) ogDescEl.setAttribute('content', meta.description);
  }, [currentRoute, activeListing, selectedCity]);

  const routeFallback = (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex items-center gap-3 text-sm text-[#94A3B8]">
        <Loader2 className="w-5 h-5 animate-spin text-[#8B5CF6]" />
        <span>Loading workspace…</span>
      </div>
    </div>
  );

  // Dedicated standalone Admin Console route (/admin)
  if (currentRoute.page === 'admin') {
    return (
      <>
        <BorrowBoxIntro
          isActive={isIntroActive}
          onComplete={() => {
            setIsIntroActive(false);
          }}
        />
        <Suspense fallback={routeFallback}>
          <AdminDashboardPage
            firebaseUser={firebaseUser}
            userProfile={userProfile}
            verifiedAdminRecord={verifiedAdminRecord}
            isVerifyingAdminSession={isVerifyingAdminSession || isAuthLoading}
            adminAccessDeniedReason={adminAccessDeniedReason}
            allListings={listings}
            allBookings={bookings}
            allReviews={reviews}
            onNavigate={handleNavigate}
            onLogout={handleLogout}
            onListingModerationChanged={(listingId, modStatus) => {
              setListings((prev) =>
                prev.map((item) =>
                  item.id === listingId
                    ? {
                        ...item,
                        status: modStatus === 'rejected' ? 'archived' : 'active',
                      }
                    : item
                )
              );
            }}
          />
        </Suspense>
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F19] text-[#F8FAFC] bb-ambient-canvas relative overflow-x-clip">
      <BorrowBoxIntro
        isActive={isIntroActive}
        onComplete={() => {
          setIsIntroActive(false);
        }}
      />

      <Navbar
        currentRoute={currentRoute}
        onNavigate={handleNavigate}
        onScrollToHowItWorks={handleScrollToHowItWorks}
        onOpenWishlist={() => setIsWishlistModalOpen(true)}
        isWishlistModalOpen={isWishlistModalOpen}
        userProfile={userProfile}
        verifiedAdminRecord={verifiedAdminRecord}
        onLogout={handleLogout}
        rentalRequests={rentalRequests}
        onOpenRequestsModal={() => setIsRequestsModalOpen(true)}
        selectedCity={selectedCity}
        onCityChange={handleCityChange}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        unreadNotificationsCount={
          notifications.filter((n) => !n.read).length
        }
        notifications={notifications}
        onSelectNotification={handleSelectNotification}
        onMarkAllNotificationsRead={handleMarkNotificationsRead}
      />

      <main className="flex-1 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={routeTransitionKey}
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.22,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <Suspense fallback={routeFallback}>
              {renderMainContent()}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer
        onNavigate={handleNavigate}
        onOpenInfoModal={(key) => setActiveInfoModal(key)}
      />

      <InfoModal
        infoKey={activeInfoModal}
        onClose={() => setActiveInfoModal(null)}
      />

      <RequestsModal
        isOpen={isRequestsModalOpen}
        requests={rentalRequests}
        onClose={() => setIsRequestsModalOpen(false)}
        onSelectListing={(itemId) => {
          handleNavigate({ page: 'details', itemId });
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      <WishlistModal
        isOpen={isWishlistModalOpen}
        listings={listings}
        onClose={() => setIsWishlistModalOpen(false)}
        onSelectListing={(itemId) => {
          handleNavigate({ page: 'details', itemId });
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </div>
  );
}
