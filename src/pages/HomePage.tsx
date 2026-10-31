import React, { useMemo } from 'react';
import {
  CategoryName,
  IndianCity,
  ProductListing,
} from '../types/marketplace';
import { filterAndSortListings } from '../utils/rentalLogic';
import { PageRoute } from '../components/Navbar';
import { HeroSection } from '../components/home/HeroSection';
import { SearchBar } from '../components/home/SearchBar';
import { CategorySection } from '../components/home/CategorySection';
import { FeaturedProducts } from '../components/home/FeaturedProducts';
import { RecentlyAdded } from '../components/home/RecentlyAdded';
import { BecomeLender } from '../components/home/BecomeLender';

export interface HomePageProps {
  listings: ProductListing[];
  selectedCity: IndianCity | 'All';
  onCityChange: (city: IndianCity | 'All') => void;
  isLoadingListings?: boolean;
  listingsError?: string | null;
  onRetryListings?: () => void;
  onNavigate: (route: PageRoute) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  listings,
  selectedCity,
  onCityChange,
  isLoadingListings = false,
  listingsError = null,
  onRetryListings,
  onNavigate,
}) => {
  // Active listings filtered by selected city (falling back to all active listings if city has none)
  const activeCityListings = useMemo(() => {
    const filtered = filterAndSortListings(listings, {
      city: selectedCity,
      sortBy: 'featured',
    });
    return filtered.length > 0
      ? filtered
      : filterAndSortListings(listings, { sortBy: 'featured' });
  }, [listings, selectedCity]);

  // Hero visual product
  const heroFeaturedListing = useMemo(() => {
    return activeCityListings[0] || listings[0];
  }, [activeCityListings, listings]);

  // Popular Rentals (Top 4 featured products)
  const popularRentals = useMemo(() => {
    return activeCityListings.slice(0, 4);
  }, [activeCityListings]);

  // Just Listed (Sorted by actual availableFrom / timestamp descending, avoiding duplicating the top 4 Popular Rentals where possible)
  const recentlyAddedListings = useMemo(() => {
    const popularIds = new Set(popularRentals.map((item) => item.id));
    const allActive = listings.filter((item) => item.status !== 'archived');

    // Prioritize community-created listings and most recent availableFrom dates
    const sortedByRecency = [...allActive].sort((a, b) => {
      if (a.isDemoData !== b.isDemoData) {
        return a.isDemoData ? 1 : -1;
      }
      const dateA = Date.parse(a.availableFrom || '') || 0;
      const dateB = Date.parse(b.availableFrom || '') || 0;
      return dateB - dateA;
    });

    const distinct = sortedByRecency.filter((item) => !popularIds.has(item.id));
    if (distinct.length >= 4) {
      return distinct.slice(0, 4);
    }
    return sortedByRecency.slice(0, 4);
  }, [listings, popularRentals]);

  // Become a Lender spotlight item
  const lenderSpotlightListing = useMemo(() => {
    return activeCityListings[1] || activeCityListings[0] || listings[0];
  }, [activeCityListings, listings]);

  const handleSelectListing = (listingId: string) => {
    onNavigate({ page: 'details', itemId: listingId });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectCategory = (category: CategoryName) => {
    onNavigate({
      page: 'browse',
      category,
      city: selectedCity !== 'All' ? selectedCity : undefined,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewAll = () => {
    onNavigate({
      page: 'browse',
      city: selectedCity !== 'All' ? selectedCity : undefined,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="bg-[#0B0F19] text-[#F8FAFC]">
      {/* B. Hero Section */}
      <HeroSection
        featuredListing={heroFeaturedListing}
        onNavigate={onNavigate}
      />

      {/* C. Prominent Search Bar */}
      <SearchBar
        selectedCity={selectedCity}
        onCityChange={onCityChange}
        onSearchSubmit={({ query, city }) => {
          onNavigate({
            page: 'browse',
            query,
            city: city && city !== 'All' ? city : undefined,
          });
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* D. Explore Categories */}
      <CategorySection
        listings={listings}
        onSelectCategory={handleSelectCategory}
      />

      {/* E. Popular Rentals */}
      <FeaturedProducts
        listings={popularRentals}
        isLoading={isLoadingListings}
        error={listingsError}
        onRetry={onRetryListings}
        onSelectListing={handleSelectListing}
        onViewAll={handleViewAll}
      />

      {/* F. Just Listed (Recently Added) */}
      <RecentlyAdded
        listings={recentlyAddedListings}
        onSelectListing={handleSelectListing}
        onViewAll={handleViewAll}
      />

      {/* G. Become a Lender */}
      <BecomeLender
        spotlightListing={lenderSpotlightListing}
        onStartListing={() => {
          onNavigate({ page: 'list-item' });
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </div>
  );
};
