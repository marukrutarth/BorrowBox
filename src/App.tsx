/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { DEMO_PRODUCT_LISTINGS } from './data/demoCatalog';
import {
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
  onAuthStateChanged,
  sendBookingMessageInFirestore,
  signOutUser,
  updateBookingWorkflowInFirestore,
  updateListingInFirestore,
} from './services/firebase';
import { Navbar, PageRoute } from './components/Navbar';
import { Footer, FooterInfoPageKey } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { BrowsePage } from './pages/BrowsePage';
import { ProductDetailsPage } from './pages/ProductDetailsPage';
import { ListItemPage } from './pages/ListItemPage';
import { AuthPage } from './pages/AuthPage';
import { ProfilePage } from './pages/ProfilePage';
import { DashboardPage } from './pages/DashboardPage';
import { InfoModal, RequestsModal } from './components/InfoAndRequestsModal';

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

  // Browse filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<
    CategoryName | 'All'
  >('All');
  const [selectedCity, setSelectedCity] = useState<IndianCity | 'All'>('All');
  const [selectedCondition, setSelectedCondition] = useState<
    ItemCondition | 'All'
  >('All');
  const [sortBy, setSortBy] = useState<SortOption>('featured');

  // Firebase Auth & Firestore User Profile state
  const [userProfile, setUserProfile] =
    useState<BorrowBoxUserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [pendingProtectedRoute, setPendingProtectedRoute] =
    useState<PageRoute | null>(null);

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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUserProfile(null);
        setIsAuthLoading(false);
        return;
      }
      try {
        const profile = await ensureOrLoadUserProfile(firebaseUser);
        setUserProfile(profile);

        // Load user's bookings and owner listings (including archived)
        const [userBookings, ownerItems] = await Promise.all([
          fetchUserBookingsFromFirestore(profile.uid),
          fetchOwnerListings(profile.uid),
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
      } catch (err) {
        console.error('Failed to load Firestore user profile:', err);
      } finally {
        setIsAuthLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

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
    if (currentRoute.page !== 'home') {
      handleNavigate({ page: 'home' });
      setTimeout(() => {
        document
          .getElementById('how-it-works')
          ?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    } else {
      document
        .getElementById('how-it-works')
        ?.scrollIntoView({ behavior: 'smooth' });
    }
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
  };

  const handleLogout = async () => {
    await signOutUser();
    setUserProfile(null);
    if (
      currentRoute.page === 'profile' ||
      currentRoute.page === 'list-item' ||
      currentRoute.page === 'dashboard'
    ) {
      handleNavigate({ page: 'home' });
    }
  };

  const handleAuthenticated = (profile: BorrowBoxUserProfile) => {
    setUserProfile(profile);
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
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-slate-600">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          <p className="text-sm font-medium">
            Verifying authentication status...
          </p>
        </div>
      );
    }

    // Protect authenticated pages (/list-item, /profile, /dashboard)
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
          onCityChange={setSelectedCity}
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

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      <Navbar
        currentRoute={currentRoute}
        onNavigate={handleNavigate}
        onScrollToHowItWorks={handleScrollToHowItWorks}
        userProfile={userProfile}
        onLogout={handleLogout}
        rentalRequests={rentalRequests}
        onOpenRequestsModal={() => setIsRequestsModalOpen(true)}
        selectedCity={selectedCity}
        onCityChange={setSelectedCity}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        unreadNotificationsCount={
          notifications.filter((n) => !n.read).length
        }
      />

      <main className="flex-1">{renderMainContent()}</main>

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
    </div>
  );
}
