export type CategoryName =
  | 'Electronics'
  | 'Photography'
  | 'Gaming'
  | 'Tools'
  | 'Events'
  | 'Outdoor'
  | 'Education'
  | 'Musical Instruments';

export type ItemCondition = 'Like New' | 'Excellent' | 'Good';

export type IndianCity =
  | 'Bengaluru'
  | 'Mumbai'
  | 'Delhi NCR'
  | 'Hyderabad'
  | 'Pune'
  | 'Chennai';

export type UserActiveMode = 'renter' | 'owner';

export type CancellationPolicyType =
  | 'Flexible (Full refund 24h prior)'
  | 'Moderate (50% refund 24h prior)'
  | 'Strict (Non-refundable once accepted)';

export interface OwnerInfo {
  id: string;
  name: string;
  neighborhood: string;
  city: IndianCity;
  rating: number;
  completedRentals: number;
  responseTime: string;
  memberSince: string;
  kycVerified: boolean;
}

export interface ProductGalleryItem {
  id: string;
  label: string;
  caption: string;
  imageUrl: string;
  viewMode?: 'full' | 'closeup' | 'accessories';
}

export interface ProductListing {
  id: string;
  title: string;
  category: CategoryName;
  dailyPriceINR: number;
  refundableDepositINR: number;
  replacementValueINR?: number;
  condition: ItemCondition;
  city: IndianCity;
  neighborhood: string;
  pickupLocation: string;
  description: string;
  specifications: string[];
  includedItems: string[];
  rentalRules: string[];
  availableFrom: string;
  availableTo: string;
  minRentalDays: number;
  featured: boolean;
  isDemoData: boolean;
  status?: 'active' | 'archived';
  cancellationPolicy?: CancellationPolicyType;
  imageUrl: string;
  gallery: ProductGalleryItem[];
  owner: OwnerInfo;
}

export type SortOption =
  | 'featured'
  | 'price-asc'
  | 'price-desc'
  | 'deposit-asc';

export type ListingSourceFilter = 'all' | 'community' | 'sample';

export interface FilterCriteria {
  query?: string;
  category?: CategoryName | 'All';
  city?: IndianCity | 'All';
  neighborhood?: string;
  condition?: ItemCondition | 'All';
  sortBy?: SortOption;
  maxDailyPriceINR?: number;
  availableStart?: string;
  availableEnd?: string;
  sourceFilter?: ListingSourceFilter;
  includeArchived?: boolean;
}

export interface RentalQuoteResult {
  valid: boolean;
  error?: string;
  days: number;
  dailyRateINR: number;
  baseRentalINR: number;
  weeklyDiscountINR: number;
  platformSupportFeeINR: number;
  refundableDepositINR: number;
  totalUpfrontINR: number;
  netRentalCostINR: number;
}

export type BookingStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'cancelled'
  | 'picked_up'
  | 'returned'
  | 'completed'
  | 'disputed';

export type DepositStatus =
  | 'pending_pickup'
  | 'held_at_pickup'
  | 'refunded'
  | 'disputed';

export interface RentalBookingRecord {
  id: string;
  listingId: string;
  listingTitle: string;
  listingCity: IndianCity;
  ownerId: string;
  ownerName: string;
  borrowerId: string;
  borrowerName: string;
  startDate: string;
  endDate: string;
  days: number;
  dailyRateINR: number;
  netRentalCostINR: number;
  refundableDepositINR: number;
  totalUpfrontINR: number;
  status: BookingStatus;
  depositStatus: DepositStatus;
  handoverCode: string;
  pickupConditionNote: string;
  pickupPhotoUrl: string;
  returnConditionNote: string;
  returnPhotoUrl: string;
  disputeReason: string;
  createdAtISO: string;
  updatedAtISO: string;
  isDemoTransaction?: boolean;
}

export interface BookingMessageRecord {
  id: string;
  bookingId: string;
  senderId: string;
  senderName: string;
  borrowerId: string;
  ownerId: string;
  text: string;
  createdAtISO: string;
}

export interface RentalReviewRecord {
  id: string;
  bookingId: string;
  listingId: string;
  reviewerId: string;
  reviewerName: string;
  revieweeId: string;
  rating: number;
  comment: string;
  createdAtISO: string;
}

export interface AppNotificationItem {
  id: string;
  title: string;
  body: string;
  bookingId?: string;
  listingId?: string;
  timestampISO: string;
  read: boolean;
}

export interface RentVsBuyResult {
  retailPriceINR: number;
  dailyRentalINR: number;
  plannedDaysPerYear: number;
  estimatedRentalCostINR: number;
  estimatedAnnualOwnershipCostINR: number;
  estimatedSavingsINR: number;
  breakEvenDays: number;
  recommendation: 'rent' | 'buy';
  summary: string;
}

export interface RentalRequestRecord {
  id: string;
  listingId: string;
  listingTitle: string;
  listingCity: IndianCity;
  ownerName: string;
  startDate: string;
  endDate: string;
  days: number;
  borrowerName: string;
  borrowerPhone: string;
  pickupNote: string;
  netRentalCostINR: number;
  refundableDepositINR: number;
  totalUpfrontINR: number;
  createdAt: string;
  status: string;
  isDemoTransaction: boolean;
}

export interface NewListingInput {
  title: string;
  category: CategoryName | '';
  dailyPriceINR: number;
  refundableDepositINR: number;
  replacementValueINR?: number;
  condition: ItemCondition;
  city: IndianCity | '';
  neighborhood: string;
  pickupLocation: string;
  description: string;
  includedItemsText: string;
  rentalRulesText: string;
  ownerName: string;
  availableFrom?: string;
  availableTo?: string;
  minRentalDays?: number;
  cancellationPolicy?: CancellationPolicyType;
}

export interface AuthFormInput {
  fullName?: string;
  email: string;
  phone?: string;
  city?: IndianCity | '';
  neighborhood?: string;
  photoURL?: string;
  password: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/**
 * Combined authenticated user profile loaded from Firestore:
 * - Public doc: `/users/{uid}`
 * - Private PII doc: `/users/{uid}/private/info`
 * - Separate admin check: `/admins/{uid}`
 */
export interface BorrowBoxUserProfile {
  uid: string;
  name: string;
  email: string;
  phone: string;
  photoURL: string;
  city: IndianCity;
  neighborhood: string;
  canRent: boolean;
  canList: boolean;
  activeMode: UserActiveMode;
  createdAtISO: string;
  updatedAtISO: string;
  isAdmin: boolean;
}

export interface ProfileUpdateInput {
  name: string;
  photoURL: string;
  city: IndianCity;
  neighborhood: string;
  phone: string;
  activeMode: UserActiveMode;
}
