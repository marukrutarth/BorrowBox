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

export type IndianCity = string;

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
  type?: string;
  resolutionSummary?: string;
  bookingId?: string;
  listingId?: string;
  ticketId?: string;
  ticketNumber?: string;
  recipientUid?: string;
  recipientRole?: 'customer' | 'staff';
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

export type AdminRole = 'super_admin' | 'admin' | 'moderator' | 'support_admin';

export type AdminPermission =
  | 'users.view'
  | 'users.suspend'
  | 'users.delete'
  | 'products.view'
  | 'products.approve'
  | 'products.reject'
  | 'bookings.view'
  | 'reports.manage'
  | 'support.manage'
  | 'admins.view'
  | 'admins.create'
  | 'admins.update_role'
  | 'analytics.view'
  | 'finance.view'
  | 'settings.manage'
  | 'audit_logs.view';

export interface AdminRegistryRecord {
  id: string;
  uid: string;
  email: string;
  name: string;
  role: AdminRole;
  status: 'active' | 'deactivated';
  customPermissions: AdminPermission[];
  revokedPermissions: AdminPermission[];
  grantedBy: string;
  grantedAtISO: string;
  lastLoginAtISO: string;
  updatedAtISO: string;
}

export type ListingModerationStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'flagged';

export interface ListingModerationRecord {
  listingId: string;
  moderationStatus: ListingModerationStatus;
  reason: string;
  reviewedByEmail: string;
  reviewedAtISO: string;
}

export interface UserModerationRecord {
  userId: string;
  status: 'active' | 'suspended' | 'deleted';
  reason: string;
  updatedByEmail: string;
  updatedAtISO: string;
}

export interface AdminManagedUserRecord {
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
  accountStatus: 'active' | 'suspended' | 'deleted';
  suspensionReason: string;
  createdAtISO: string;
  updatedAtISO: string;
}

export type ReportTargetType = 'listing' | 'user' | 'booking';
export type ReportCategory =
  | 'fraud_scam'
  | 'damaged_item'
  | 'prohibited_item'
  | 'no_show'
  | 'abusive_behavior'
  | 'other';
export type ReportSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ReportStatus = 'open' | 'investigating' | 'resolved' | 'dismissed';

export interface PlatformReportRecord {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  targetTitle: string;
  reporterId: string;
  reporterName: string;
  reason: string;
  category: ReportCategory;
  severity: ReportSeverity;
  status: ReportStatus;
  resolutionNote: string;
  assignedAdminEmail: string;
  createdAtISO: string;
  updatedAtISO: string;
}

export type SupportTicketPriority = 'normal' | 'urgent';

export type SupportTicketStatus =
  | 'open'
  | 'in_progress'
  | 'waiting_for_user'
  | 'resolved'
  | 'closed';

export type SupportTicketCategory =
  | 'Booking Issue'
  | 'Booking & Handover'
  | 'Payment & Deposit'
  | 'Damage or Dispute'
  | 'Item Condition & Damage'
  | 'Account & Verification'
  | 'Product Listing'
  | 'Safety Concern'
  | 'Safety & Trust'
  | 'General Enquiry';

export interface SupportAttachmentItem {
  id: string;
  name: string;
  url: string;
  downloadUrl?: string;
  storagePath?: string;
  contentType?: string;
  mimeType?: string;
  sizeBytes: number;
  uploadedAtISO: string;
}

export interface SupportTicketMessageRecord {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderEmail?: string;
  senderRole: 'customer' | 'staff' | 'admin';
  message: string;
  attachments: SupportAttachmentItem[];
  isInternal: boolean;
  createdAtISO: string;
  readAtISO?: string | null;
}

export type SupportTicketHistoryAction =
  | 'created'
  | 'claimed'
  | 'replied'
  | 'reassigned'
  | 'claim_released'
  | 'released'
  | 'priority_changed'
  | 'status_changed'
  | 'internal_note_added'
  | 'staff_replied'
  | 'customer_replied'
  | 'resolved'
  | 'closed'
  | 'reopened';

export interface SupportTicketHistoryEntry {
  id: string;
  ticketId: string;
  actorId: string;
  actorName: string;
  actorEmail: string;
  actorRole: string;
  action: SupportTicketHistoryAction;
  summary: string;
  previousValue?: string;
  newValue?: string;
  createdAtISO: string;
}

export interface SupportTicketRecord {
  id: string;
  ticketNumber?: string;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  description: string;
  category?: SupportTicketCategory;
  priority?: SupportTicketPriority;
  status: SupportTicketStatus;
  assignedTo?: string | null;
  assignedStaffName?: string;
  assignedStaffEmail?: string;
  assignedToEmail: string;
  claimedAtISO?: string | null;
  firstResponseAtISO?: string | null;
  resolvedAtISO?: string | null;
  closedAtISO?: string | null;
  reopenedAtISO?: string | null;
  reassignmentCount?: number;
  bookingId: string;
  productId?: string;
  relatedBookingId?: string;
  relatedProductId?: string;
  attachments?: SupportAttachmentItem[];
  resolutionSummary?: string;
  internalNotes: string;
  createdAtISO: string;
  updatedAtISO: string;
}

export type AuditTargetType =
  | 'user'
  | 'product'
  | 'booking'
  | 'report'
  | 'support_ticket'
  | 'admin'
  | 'settings';

export interface AdminAuditLogRecord {
  id: string;
  adminId: string;
  adminEmail: string;
  adminRole: AdminRole;
  action: string;
  targetType: AuditTargetType;
  targetId: string;
  targetLabel: string;
  previousValue: string;
  newValue: string;
  createdAtISO: string;
}

export interface PlatformSettingsRecord {
  id: 'global';
  platformFeePercent: number;
  minDepositINR: number;
  requireListingApproval: boolean;
  maintenanceMode: boolean;
  autoFlagHighValueThresholdINR: number;
  supportEscalationEmail: string;
  updatedByEmail: string;
  updatedAtISO: string;
}

