import React, { useMemo, useState } from 'react';
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
import { MarketplaceBenefits } from '../components/home/MarketplaceBenefits';
import { BecomeLender } from '../components/home/BecomeLender';
import { CitySelectorModal } from '../components/location/CitySelectorModal';

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
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);

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

  // 2. Featured Rental Items (Top 4 featured products)
  const popularRentals = useMemo(() => {
    return activeCityListings.slice(0, 4);
  }, [activeCityListings]);

  // 3. Recently Listed Items (Sorted by recency, distinct from featured)
  const recentlyAddedListings = useMemo(() => {
    const popularIds = new Set(popularRentals.map((item) => item.id));
    const allActive = listings.filter((item) => item.status !== 'archived');

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
      {/* 1. Hero Section with Top-Prominence Rent and List Actions */}
      <HeroSection
        featuredListing={heroFeaturedListing}
        onNavigate={onNavigate}
        onOpenCitySelector={() => setIsCityModalOpen(true)}
        selectedCity={selectedCity !== 'All' ? selectedCity : null}
      />

      {/* Prominent Search Bar */}
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

      {/* 1. Explore Popular Categories */}
      <CategorySection
        listings={listings}
        onSelectCategory={handleSelectCategory}
      />

      {/* 2. Featured Rental Items */}
      <FeaturedProducts
        listings={popularRentals}
        isLoading={isLoadingListings}
        error={listingsError}
        onRetry={onRetryListings}
        onSelectListing={handleSelectListing}
        onViewAll={handleViewAll}
      />

      {/* 3. Recently Listed Items */}
      <RecentlyAdded
        listings={recentlyAddedListings}
        onSelectListing={handleSelectListing}
        onViewAll={handleViewAll}
      />

      {/* 4. How BorrowBox Works + 5. Benefits of Renting + 6. Benefits of Listing Items */}
      <MarketplaceBenefits onNavigate={onNavigate} />

      {/* 7. Become a Lender CTA */}
      <BecomeLender
        spotlightListing={lenderSpotlightListing}
        onStartListing={() => {
          onNavigate({ page: 'list-item' });
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* City Selector Modal */}
      <CitySelectorModal
        isOpen={isCityModalOpen}
        onClose={() => setIsCityModalOpen(false)}
        selectedCity={selectedCity !== 'All' ? selectedCity : null}
        onSelectCity={(city) => {
          if (!city) {
            onCityChange('All');
          } else {
            onCityChange(city as IndianCity);
          }
        }}
      />
    </div>
  );
};
