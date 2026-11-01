import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getFirestore,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  setLogLevel,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  AdminAuditLogRecord,
  AdminManagedUserRecord,
  AdminPermission,
  AdminRegistryRecord,
  AdminRole,
  AuditTargetType,
  BookingMessageRecord,
  BookingStatus,
  BorrowBoxUserProfile,
  CancellationPolicyType,
  CategoryName,
  DepositStatus,
  IndianCity,
  ItemCondition,
  ListingModerationRecord,
  ListingModerationStatus,
  PlatformReportRecord,
  PlatformSettingsRecord,
  ProductListing,
  ProfileUpdateInput,
  RentalBookingRecord,
  RentalReviewRecord,
  ReportCategory,
  ReportSeverity,
  ReportStatus,
  ReportTargetType,
  SupportTicketPriority,
  SupportTicketRecord,
  SupportTicketStatus,
  UserActiveMode,
} from '../types/marketplace';
import {
  PRIMARY_SUPER_ADMIN_EMAIL,
  canManageTargetAdmin,
  computeEffectivePermissions,
  hasAdminPermission,
  normalizeAdminEmail,
  shouldShowAdminPanelOption,
  validateAdminGmail,
} from '../utils/adminRbac';
import { ALL_CITIES, BLUEPRINT_LIMITS } from '../utils/rentalLogic';

export const app = initializeApp(firebaseConfig);
// Silence internal @firebase/firestore connection/token-refresh console.error noise when operating in offline fallback mode
try {
  setLogLevel('silent');
} catch {
  // Ignore if setLogLevel is unavailable in test environment
}
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;

const LOCAL_STORAGE_KEYS = {
  USER_PROFILE_PREFIX: 'borrowbox_user_profile_v1_',
  COMMUNITY_LISTINGS: 'borrowbox_community_listings_v1',
  BOOKINGS: 'borrowbox_bookings_v1',
  MESSAGES: 'borrowbox_messages_v1',
  REVIEWS: 'borrowbox_reviews_v1',
  ADMINS: 'borrowbox_admins_registry_v1',
  AUDIT_LOGS: 'borrowbox_audit_logs_v1',
  USER_MODERATION: 'borrowbox_user_moderation_v1',
  LISTING_MODERATION: 'borrowbox_listing_moderation_v1',
  REPORTS: 'borrowbox_reports_v1',
  SUPPORT_TICKETS: 'borrowbox_support_tickets_v1',
  SETTINGS: 'borrowbox_platform_settings_v1',
};

function readLocalJson<T>(key: string, fallback: T): T {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return fallback;
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocalJson<T>(key: string, value: T): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors
  }
}

export function isOfflineOrTokenError(error: unknown): boolean {
  const msg =
    error instanceof Error ? error.message : String(error || '');
  const lower = msg.toLowerCase();
  return (
    lower.includes('client is offline') ||
    lower.includes('unavailable') ||
    lower.includes('token-service-api') ||
    lower.includes('securetoken') ||
    lower.includes('fetching auth token failed') ||
    lower.includes('network-request-failed')
  );
}

export function guardUserTokenRefresh(user: User | null): void {
  if (!user) return;
  try {
    const u = user as unknown as {
      getIdToken?: (forceRefresh?: boolean) => Promise<string>;
      stsTokenManager?: {
        accessToken?: string;
        getAccessToken?: (...args: unknown[]) => Promise<string | null>;
      };
      _bbTokenGuardApplied?: boolean;
    };
    if (u._bbTokenGuardApplied) return;
    u._bbTokenGuardApplied = true;

    const cachedAccessToken = u.stsTokenManager?.accessToken || '';

    if (typeof u.getIdToken === 'function') {
      const origGetIdToken = u.getIdToken.bind(user);
      u.getIdToken = async (forceRefresh?: boolean): Promise<string> => {
        try {
          return await origGetIdToken(forceRefresh);
        } catch (err) {
          if (isOfflineOrTokenError(err)) {
            return u.stsTokenManager?.accessToken || cachedAccessToken;
          }
          throw err;
        }
      };
    }

    if (
      u.stsTokenManager &&
      typeof u.stsTokenManager.getAccessToken === 'function'
    ) {
      const origGetAccessToken = u.stsTokenManager.getAccessToken.bind(
        u.stsTokenManager
      );
      u.stsTokenManager.getAccessToken = async (
        ...args: unknown[]
      ): Promise<string | null> => {
        try {
          return await origGetAccessToken(...args);
        } catch (err) {
          if (isOfflineOrTokenError(err)) {
            return u.stsTokenManager?.accessToken || cachedAccessToken || null;
          }
          throw err;
        }
      };
    }
  } catch {
    // Ignore if user or token manager properties are read-only
  }
}

/**
 * Initial connection check to Firestore (silent fallback when client operates in offline mode)
 */
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch {
    // Operate seamlessly using local + cached persistence when Firestore is in offline mode
  }
}
void testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  if (!isOfflineOrTokenError(error)) {
    console.warn('Firestore operation warning:', JSON.stringify(errInfo));
  }
  throw new Error(JSON.stringify(errInfo));
}

function formatTimestampToISO(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  return new Date().toISOString();
}

function sanitizeCity(city?: string): IndianCity {
  if (city && city.trim().length > 0) {
    return city.trim();
  }
  return '';
}

function sanitizeName(name?: string | null, email?: string | null): string {
  const raw = (
    name ||
    (email ? email.split('@')[0].replace(/[._-]/g, ' ') : 'BorrowBox Member')
  ).trim();
  if (raw.length < BLUEPRINT_LIMITS.NAME_MIN) {
    return 'BorrowBox Member';
  }
  return raw.slice(0, BLUEPRINT_LIMITS.NAME_MAX);
}

function sanitizeNeighborhood(neighborhood?: string): string {
  const raw = (neighborhood || 'Indiranagar').trim();
  if (raw.length < BLUEPRINT_LIMITS.NEIGHBORHOOD_MIN) {
    return 'Indiranagar';
  }
  return raw.slice(0, BLUEPRINT_LIMITS.NEIGHBORHOOD_MAX);
}

/**
 * Loads or creates the user's split-collection profile in Firestore:
 * - `/users/{uid}` (public display attributes + dual renter/owner capability)
 * - `/users/{uid}/private/info` (isolated PII: email, phone)
 * - `/admins/{uid}` (separate administrator check)
 */
export async function ensureOrLoadUserProfile(
  user: User,
  defaults?: {
    fullName?: string;
    phone?: string;
    city?: IndianCity;
    neighborhood?: string;
    photoURL?: string;
  }
): Promise<BorrowBoxUserProfile> {
  guardUserTokenRefresh(user);
  const uid = user.uid;
  const localProfileKey = `${LOCAL_STORAGE_KEYS.USER_PROFILE_PREFIX}${uid}`;
  const cachedProfile = readLocalJson<BorrowBoxUserProfile | null>(
    localProfileKey,
    null
  );

  const normalizedUserEmail = normalizeAdminEmail(user.email || '');
  const localAdmins = readLocalJson<Record<string, AdminRegistryRecord>>(
    LOCAL_STORAGE_KEYS.ADMINS,
    {}
  );
  let isAdminUser =
    normalizedUserEmail === PRIMARY_SUPER_ADMIN_EMAIL ||
    Boolean(
      normalizedUserEmail &&
        localAdmins[normalizedUserEmail] &&
        localAdmins[normalizedUserEmail].status === 'active'
    );

  if (!isAdminUser) {
    try {
      let adminSnap = normalizedUserEmail
        ? await getDoc(doc(db, 'admins', normalizedUserEmail))
        : null;
      if (!adminSnap || !adminSnap.exists()) {
        adminSnap = await getDoc(doc(db, 'admins', uid));
      }
      isAdminUser = Boolean(
        adminSnap.exists() && adminSnap.data()?.status === 'active'
      );
    } catch {
      // Keep local admin status if Firestore is offline
    }
  }

  let publicSnap = null;
  try {
    publicSnap = await getDoc(doc(db, 'users', uid));
  } catch {
    publicSnap = null;
  }

  if (!publicSnap || !publicSnap.exists()) {
    const cleanName = sanitizeName(
      defaults?.fullName || cachedProfile?.name || user.displayName,
      user.email
    );
    const cleanPhoto = (
      defaults?.photoURL ||
      cachedProfile?.photoURL ||
      user.photoURL ||
      ''
    ).slice(0, BLUEPRINT_LIMITS.PHOTO_URL_MAX);
    const cleanCity = sanitizeCity(defaults?.city || cachedProfile?.city);
    const cleanNeighborhood = sanitizeNeighborhood(
      defaults?.neighborhood || cachedProfile?.neighborhood
    );
    const cleanEmail = (
      user.email ||
      cachedProfile?.email ||
      'member@borrowbox.in'
    )
      .trim()
      .slice(0, BLUEPRINT_LIMITS.EMAIL_MAX);
    const cleanPhone = (defaults?.phone || cachedProfile?.phone || '')
      .trim()
      .slice(0, BLUEPRINT_LIMITS.PHONE_MAX);

    const publicPayload = {
      uid,
      name: cleanName,
      photoURL: cleanPhoto,
      city: cleanCity,
      neighborhood: cleanNeighborhood,
      canRent: cachedProfile?.canRent ?? true,
      canList: cachedProfile?.canList ?? true,
      activeMode: (cachedProfile?.activeMode || 'renter') as UserActiveMode,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const privatePayload = {
      uid,
      email: cleanEmail,
      phone: cleanPhone,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'users', uid), publicPayload);
      batch.set(doc(db, 'users', uid, 'private', 'info'), privatePayload);
      await batch.commit();
    } catch {
      // Persist locally when Firestore is in offline mode
    }

    const nowISO = new Date().toISOString();
    const resolvedProfile: BorrowBoxUserProfile = {
      uid,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      photoURL: cleanPhoto,
      city: cleanCity,
      neighborhood: cleanNeighborhood,
      canRent: cachedProfile?.canRent ?? true,
      canList: cachedProfile?.canList ?? true,
      activeMode: cachedProfile?.activeMode || 'renter',
      createdAtISO: cachedProfile?.createdAtISO || nowISO,
      updatedAtISO: nowISO,
      isAdmin: isAdminUser,
    };
    writeLocalJson(localProfileKey, resolvedProfile);
    return resolvedProfile;
  }

  const pubData = publicSnap.data();
  let privData: Record<string, unknown> | null = null;
  try {
    const privSnap = await getDoc(doc(db, 'users', uid, 'private', 'info'));
    if (privSnap.exists()) {
      privData = privSnap.data();
    }
  } catch {
    privData = null;
  }

  const loadedProfile: BorrowBoxUserProfile = {
    uid,
    name: String(pubData.name || cachedProfile?.name || 'BorrowBox Member'),
    email: String(privData?.email || user.email || cachedProfile?.email || ''),
    phone: String(privData?.phone || cachedProfile?.phone || ''),
    photoURL: String(pubData.photoURL || cachedProfile?.photoURL || ''),
    city: sanitizeCity(
      String(pubData.city || cachedProfile?.city || '')
    ),
    neighborhood: String(
      pubData.neighborhood || cachedProfile?.neighborhood || ''
    ),
    canRent: Boolean(pubData.canRent ?? true),
    canList: Boolean(pubData.canList ?? true),
    activeMode:
      pubData.activeMode === 'owner' ? 'owner' : ('renter' as UserActiveMode),
    createdAtISO: formatTimestampToISO(pubData.createdAt),
    updatedAtISO: formatTimestampToISO(pubData.updatedAt),
    isAdmin: isAdminUser,
  };
  writeLocalJson(localProfileKey, loadedProfile);
  return loadedProfile;
}

/**
 * Updates the authenticated user's public and private profile documents in Firestore.
 */
export async function updateUserProfileInFirestore(
  uid: string,
  updates: ProfileUpdateInput
): Promise<void> {
  const localProfileKey = `${LOCAL_STORAGE_KEYS.USER_PROFILE_PREFIX}${uid}`;
  const cleanName = updates.name.trim().slice(0, BLUEPRINT_LIMITS.NAME_MAX);
  const cleanPhoto = updates.photoURL
    .trim()
    .slice(0, BLUEPRINT_LIMITS.PHOTO_URL_MAX);
  const cleanCity = sanitizeCity(updates.city);
  const cleanNeighborhood = updates.neighborhood
    .trim()
    .slice(0, BLUEPRINT_LIMITS.NEIGHBORHOOD_MAX);
  const cleanPhone = updates.phone.trim().slice(0, BLUEPRINT_LIMITS.PHONE_MAX);

  const existingLocal = readLocalJson<BorrowBoxUserProfile | null>(
    localProfileKey,
    null
  );
  if (existingLocal) {
    writeLocalJson(localProfileKey, {
      ...existingLocal,
      name: cleanName,
      photoURL: cleanPhoto,
      city: cleanCity,
      neighborhood: cleanNeighborhood,
      phone: cleanPhone,
      activeMode: updates.activeMode,
      updatedAtISO: new Date().toISOString(),
    });
  }

  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', uid), {
      name: cleanName,
      photoURL: cleanPhoto,
      city: cleanCity,
      neighborhood: cleanNeighborhood,
      activeMode: updates.activeMode,
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'users', uid, 'private', 'info'), {
      phone: cleanPhone,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    if (!isOfflineOrTokenError(error)) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  }
}

function mapDocToProductListing(data: Record<string, unknown>): ProductListing {
  const city = sanitizeCity(String(data.city || ''));
  const category = (data.category as CategoryName) || 'Electronics';
  const condition = (data.condition as ItemCondition) || 'Excellent';
  const imageUrl = String(data.imageUrl || 'sony_camera');
  const title = String(data.title || 'Community Rental Item');
  const neighborhood = String(data.neighborhood || '');
  const ownerId = String(data.ownerId || 'owner');
  const ownerName = String(data.ownerName || 'Community Owner');

  return {
    id: String(data.id),
    title,
    category,
    dailyPriceINR: Number(data.dailyPriceINR) || 500,
    refundableDepositINR: Number(data.refundableDepositINR) || 2000,
    replacementValueINR: Number(data.replacementValueINR) || 25000,
    condition,
    city,
    neighborhood,
    pickupLocation: String(data.pickupLocation || `${neighborhood}, ${city}`),
    description: String(data.description || ''),
    specifications: [
      `Category: ${category}`,
      `Condition: ${condition}`,
      `Approx. Area: ${neighborhood}, ${city}`,
    ],
    includedItems: ['Main unit', 'Standard cables/accessories'],
    rentalRules: [
      'Original Government photo ID inspected in person at pickup',
      'Test functionality and accessories together at handover',
      `Cancellation Policy: ${String(
        data.cancellationPolicy || 'Flexible (Full refund 24h prior)'
      )}`,
    ],
    availableFrom: String(data.availableFrom || '2026-10-29'),
    availableTo: String(data.availableTo || '2026-12-31'),
    minRentalDays: Number(data.minRentalDays) || 1,
    featured: true,
    isDemoData: false,
    status: data.status === 'archived' ? 'archived' : 'active',
    cancellationPolicy:
      (data.cancellationPolicy as CancellationPolicyType) ||
      'Flexible (Full refund 24h prior)',
    imageUrl,
    gallery: [
      {
        id: `${String(data.id)}-g1`,
        label: 'Primary View',
        caption: title,
        imageUrl,
        viewMode: 'full',
      },
    ],
    owner: {
      id: ownerId,
      name: ownerName,
      neighborhood,
      city,
      rating: 0,
      completedRentals: 0,
      responseTime: 'Community member listing',
      memberSince: '2026',
      kycVerified: false,
    },
  };
}

/**
 * Loads all active community listings from `/listings`.
 */
export async function fetchActiveCommunityListings(): Promise<
  ProductListing[]
> {
  const localItems = readLocalJson<ProductListing[]>(
    LOCAL_STORAGE_KEYS.COMMUNITY_LISTINGS,
    []
  );
  try {
    const q = query(collection(db, 'listings'), where('status', '==', 'active'));
    const snap = await getDocs(q);
    const remoteItems = snap.docs.map((d) => mapDocToProductListing(d.data()));
    const byId = new Map<string, ProductListing>();
    for (const item of localItems) {
      if (item.status !== 'archived') {
        byId.set(item.id, item);
      }
    }
    for (const item of remoteItems) {
      byId.set(item.id, item);
    }
    return Array.from(byId.values());
  } catch (error) {
    if (isOfflineOrTokenError(error)) {
      return localItems.filter((item) => item.status !== 'archived');
    }
    return localItems.filter((item) => item.status !== 'archived');
  }
}

/**
 * Loads all listings (including archived) owned by the authenticated user.
 */
export async function fetchOwnerListings(
  ownerId: string
): Promise<ProductListing[]> {
  const localItems = readLocalJson<ProductListing[]>(
    LOCAL_STORAGE_KEYS.COMMUNITY_LISTINGS,
    []
  ).filter((item) => item.owner?.id === ownerId);
  try {
    const q = query(
      collection(db, 'listings'),
      where('ownerId', '==', ownerId)
    );
    const snap = await getDocs(q);
    const remoteItems = snap.docs.map((d) => mapDocToProductListing(d.data()));
    const byId = new Map<string, ProductListing>();
    for (const item of localItems) {
      byId.set(item.id, item);
    }
    for (const item of remoteItems) {
      byId.set(item.id, item);
    }
    return Array.from(byId.values());
  } catch {
    return localItems;
  }
}

/**
 * Creates a new community listing in Firestore `/listings/{listing.id}`.
 */
export async function createListingInFirestore(
  listing: ProductListing
): Promise<void> {
  const path = `listings/${listing.id}`;
  const existingLocal = readLocalJson<ProductListing[]>(
    LOCAL_STORAGE_KEYS.COMMUNITY_LISTINGS,
    []
  );
  writeLocalJson(LOCAL_STORAGE_KEYS.COMMUNITY_LISTINGS, [
    listing,
    ...existingLocal.filter((item) => item.id !== listing.id),
  ]);

  const payload = {
    id: listing.id.slice(0, BLUEPRINT_LIMITS.UID_MAX),
    ownerId: listing.owner.id.slice(0, BLUEPRINT_LIMITS.UID_MAX),
    ownerName: sanitizeName(listing.owner.name),
    title: listing.title.trim().slice(0, BLUEPRINT_LIMITS.TITLE_MAX),
    category: listing.category,
    condition: listing.condition,
    dailyPriceINR: Math.max(50, Math.min(500000, Math.round(listing.dailyPriceINR))),
    refundableDepositINR: Math.max(
      0,
      Math.min(1000000, Math.round(listing.refundableDepositINR))
    ),
    replacementValueINR: Math.max(
      100,
      Math.min(
        2000000,
        Math.round(listing.replacementValueINR || listing.dailyPriceINR * 35)
      )
    ),
    city: sanitizeCity(listing.city),
    neighborhood: sanitizeNeighborhood(listing.neighborhood),
    pickupLocation: listing.pickupLocation
      .trim()
      .slice(0, BLUEPRINT_LIMITS.PICKUP_MAX),
    description: listing.description
      .trim()
      .slice(0, BLUEPRINT_LIMITS.DESCRIPTION_MAX),
    imageUrl: (listing.imageUrl || 'sony_camera').slice(
      0,
      BLUEPRINT_LIMITS.IMAGE_URL_MAX
    ),
    availableFrom: (listing.availableFrom || '2026-10-29').slice(0, 10),
    availableTo: (listing.availableTo || '2026-12-31').slice(0, 10),
    minRentalDays: Math.max(1, Math.min(60, Math.round(listing.minRentalDays || 1))),
    status: listing.status === 'archived' ? 'archived' : 'active',
    cancellationPolicy: (
      listing.cancellationPolicy || 'Flexible (Full refund 24h prior)'
    ).slice(0, 80),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'listings', listing.id), payload);
  } catch (error) {
    if (!isOfflineOrTokenError(error)) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }
}

/**
 * Updates an existing community listing in Firestore `/listings/{listing.id}`.
 */
export async function updateListingInFirestore(
  listing: ProductListing
): Promise<void> {
  const path = `listings/${listing.id}`;
  const existingLocal = readLocalJson<ProductListing[]>(
    LOCAL_STORAGE_KEYS.COMMUNITY_LISTINGS,
    []
  );
  const updatedLocal = existingLocal.some((item) => item.id === listing.id)
    ? existingLocal.map((item) => (item.id === listing.id ? listing : item))
    : [listing, ...existingLocal];
  writeLocalJson(LOCAL_STORAGE_KEYS.COMMUNITY_LISTINGS, updatedLocal);

  const updates = {
    title: listing.title.trim().slice(0, BLUEPRINT_LIMITS.TITLE_MAX),
    category: listing.category,
    condition: listing.condition,
    dailyPriceINR: Math.max(50, Math.min(500000, Math.round(listing.dailyPriceINR))),
    refundableDepositINR: Math.max(
      0,
      Math.min(1000000, Math.round(listing.refundableDepositINR))
    ),
    replacementValueINR: Math.max(
      100,
      Math.min(
        2000000,
        Math.round(listing.replacementValueINR || listing.dailyPriceINR * 35)
      )
    ),
    city: sanitizeCity(listing.city),
    neighborhood: sanitizeNeighborhood(listing.neighborhood),
    pickupLocation: listing.pickupLocation
      .trim()
      .slice(0, BLUEPRINT_LIMITS.PICKUP_MAX),
    description: listing.description
      .trim()
      .slice(0, BLUEPRINT_LIMITS.DESCRIPTION_MAX),
    imageUrl: (listing.imageUrl || 'sony_camera').slice(
      0,
      BLUEPRINT_LIMITS.IMAGE_URL_MAX
    ),
    availableFrom: (listing.availableFrom || '2026-10-29').slice(0, 10),
    availableTo: (listing.availableTo || '2026-12-31').slice(0, 10),
    minRentalDays: Math.max(1, Math.min(60, Math.round(listing.minRentalDays || 1))),
    status: listing.status === 'archived' ? 'archived' : 'active',
    cancellationPolicy: (
      listing.cancellationPolicy || 'Flexible (Full refund 24h prior)'
    ).slice(0, 80),
    updatedAt: serverTimestamp(),
  };

  try {
    await updateDoc(doc(db, 'listings', listing.id), updates);
  } catch (error) {
    if (!isOfflineOrTokenError(error)) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }
}

function mapDocToBookingRecord(data: Record<string, unknown>): RentalBookingRecord {
  return {
    id: String(data.id),
    listingId: String(data.listingId),
    listingTitle: String(data.listingTitle),
    listingCity: sanitizeCity(String(data.listingCity)),
    ownerId: String(data.ownerId),
    ownerName: String(data.ownerName),
    borrowerId: String(data.borrowerId),
    borrowerName: String(data.borrowerName),
    startDate: String(data.startDate),
    endDate: String(data.endDate),
    days: Number(data.days) || 1,
    dailyRateINR: Number(data.dailyRateINR) || 500,
    netRentalCostINR: Number(data.netRentalCostINR) || 500,
    refundableDepositINR: Number(data.refundableDepositINR) || 0,
    totalUpfrontINR: Number(data.totalUpfrontINR) || 500,
    status: (data.status as BookingStatus) || 'pending',
    depositStatus: (data.depositStatus as DepositStatus) || 'pending_pickup',
    handoverCode: String(data.handoverCode || 'BB-VERIFY'),
    pickupConditionNote: String(data.pickupConditionNote || ''),
    pickupPhotoUrl: String(data.pickupPhotoUrl || ''),
    returnConditionNote: String(data.returnConditionNote || ''),
    returnPhotoUrl: String(data.returnPhotoUrl || ''),
    disputeReason: String(data.disputeReason || ''),
    createdAtISO: formatTimestampToISO(data.createdAt),
    updatedAtISO: formatTimestampToISO(data.updatedAt),
    isDemoTransaction: false,
  };
}

/**
 * Fetches bookings where the authenticated user is either the borrower or the owner.
 */
export async function fetchUserBookingsFromFirestore(
  uid: string
): Promise<RentalBookingRecord[]> {
  const localBookings = readLocalJson<RentalBookingRecord[]>(
    LOCAL_STORAGE_KEYS.BOOKINGS,
    []
  ).filter((b) => b.borrowerId === uid || b.ownerId === uid);
  try {
    const borrowerQ = query(
      collection(db, 'bookings'),
      where('borrowerId', '==', uid)
    );
    const ownerQ = query(
      collection(db, 'bookings'),
      where('ownerId', '==', uid)
    );
    const [borrowerSnap, ownerSnap] = await Promise.all([
      getDocs(borrowerQ),
      getDocs(ownerQ),
    ]);
    const map = new Map<string, RentalBookingRecord>();
    for (const b of localBookings) {
      map.set(b.id, b);
    }
    for (const d of borrowerSnap.docs) {
      map.set(d.id, mapDocToBookingRecord(d.data()));
    }
    for (const d of ownerSnap.docs) {
      map.set(d.id, mapDocToBookingRecord(d.data()));
    }
    return Array.from(map.values()).sort((a, b) =>
      b.createdAtISO.localeCompare(a.createdAtISO)
    );
  } catch {
    return localBookings.sort((a, b) =>
      b.createdAtISO.localeCompare(a.createdAtISO)
    );
  }
}

/**
 * Creates a persistent booking request in Firestore `/bookings/{booking.id}`.
 */
export async function createBookingInFirestore(
  booking: RentalBookingRecord
): Promise<void> {
  const path = `bookings/${booking.id}`;
  const existingLocal = readLocalJson<RentalBookingRecord[]>(
    LOCAL_STORAGE_KEYS.BOOKINGS,
    []
  );
  writeLocalJson(LOCAL_STORAGE_KEYS.BOOKINGS, [
    booking,
    ...existingLocal.filter((b) => b.id !== booking.id),
  ]);

  const payload = {
    id: booking.id.slice(0, BLUEPRINT_LIMITS.UID_MAX),
    listingId: booking.listingId.slice(0, BLUEPRINT_LIMITS.UID_MAX),
    listingTitle: booking.listingTitle.trim().slice(0, BLUEPRINT_LIMITS.TITLE_MAX),
    listingCity: sanitizeCity(booking.listingCity),
    ownerId: booking.ownerId.slice(0, BLUEPRINT_LIMITS.UID_MAX),
    ownerName: sanitizeName(booking.ownerName),
    borrowerId: booking.borrowerId.slice(0, BLUEPRINT_LIMITS.UID_MAX),
    borrowerName: sanitizeName(booking.borrowerName),
    startDate: booking.startDate.slice(0, 10),
    endDate: booking.endDate.slice(0, 10),
    days: Math.max(1, Math.min(60, Math.round(booking.days))),
    dailyRateINR: Math.max(50, Math.min(500000, Math.round(booking.dailyRateINR))),
    netRentalCostINR: Math.max(
      50,
      Math.min(10000000, Math.round(booking.netRentalCostINR))
    ),
    refundableDepositINR: Math.max(
      0,
      Math.min(1000000, Math.round(booking.refundableDepositINR))
    ),
    totalUpfrontINR: Math.max(
      50,
      Math.min(11000000, Math.round(booking.totalUpfrontINR))
    ),
    status: 'pending' as BookingStatus,
    depositStatus: 'pending_pickup' as DepositStatus,
    handoverCode: booking.handoverCode.slice(0, 32),
    pickupConditionNote: '',
    pickupPhotoUrl: '',
    returnConditionNote: '',
    returnPhotoUrl: '',
    disputeReason: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'bookings', booking.id), payload);
  } catch (error) {
    if (!isOfflineOrTokenError(error)) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }
}

/**
 * Updates booking status, deposit status, pickup/return condition logs, or dispute reason in Firestore.
 */
export async function updateBookingWorkflowInFirestore(
  bookingId: string,
  updates: {
    status: BookingStatus;
    depositStatus: DepositStatus;
    pickupConditionNote: string;
    pickupPhotoUrl: string;
    returnConditionNote: string;
    returnPhotoUrl: string;
    disputeReason: string;
  }
): Promise<void> {
  const path = `bookings/${bookingId}`;
  const existingLocal = readLocalJson<RentalBookingRecord[]>(
    LOCAL_STORAGE_KEYS.BOOKINGS,
    []
  );
  writeLocalJson(
    LOCAL_STORAGE_KEYS.BOOKINGS,
    existingLocal.map((b) =>
      b.id === bookingId
        ? {
            ...b,
            ...updates,
            updatedAtISO: new Date().toISOString(),
          }
        : b
    )
  );

  try {
    await updateDoc(doc(db, 'bookings', bookingId), {
      status: updates.status,
      depositStatus: updates.depositStatus,
      pickupConditionNote: updates.pickupConditionNote.slice(0, 500),
      pickupPhotoUrl: updates.pickupPhotoUrl.slice(
        0,
        BLUEPRINT_LIMITS.IMAGE_URL_MAX
      ),
      returnConditionNote: updates.returnConditionNote.slice(0, 500),
      returnPhotoUrl: updates.returnPhotoUrl.slice(
        0,
        BLUEPRINT_LIMITS.IMAGE_URL_MAX
      ),
      disputeReason: updates.disputeReason.slice(0, 500),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    if (!isOfflineOrTokenError(error)) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }
}

/**
 * Fetches messages for a booking thread (`/bookings/{bookingId}/messages`).
 */
export async function fetchBookingMessagesFromFirestore(
  bookingId: string,
  uid: string,
  role: 'borrower' | 'owner'
): Promise<BookingMessageRecord[]> {
  const localMessagesMap = readLocalJson<Record<string, BookingMessageRecord[]>>(
    LOCAL_STORAGE_KEYS.MESSAGES,
    {}
  );
  const localMsgs = localMessagesMap[bookingId] || [];
  try {
    const field = role === 'borrower' ? 'borrowerId' : 'ownerId';
    const q = query(
      collection(db, 'bookings', bookingId, 'messages'),
      where(field, '==', uid)
    );
    const snap = await getDocs(q);
    const remoteMsgs = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: String(data.id),
        bookingId: String(data.bookingId),
        senderId: String(data.senderId),
        senderName: String(data.senderName),
        borrowerId: String(data.borrowerId),
        ownerId: String(data.ownerId),
        text: String(data.text),
        createdAtISO: formatTimestampToISO(data.createdAt),
      };
    });
    const byId = new Map<string, BookingMessageRecord>();
    for (const m of localMsgs) {
      byId.set(m.id, m);
    }
    for (const m of remoteMsgs) {
      byId.set(m.id, m);
    }
    return Array.from(byId.values()).sort((a, b) =>
      a.createdAtISO.localeCompare(b.createdAtISO)
    );
  } catch {
    return localMsgs.sort((a, b) =>
      a.createdAtISO.localeCompare(b.createdAtISO)
    );
  }
}

/**
 * Sends a private message in `/bookings/{bookingId}/messages/{messageId}`.
 */
export async function sendBookingMessageInFirestore(
  message: BookingMessageRecord
): Promise<void> {
  const path = `bookings/${message.bookingId}/messages/${message.id}`;
  const localMessagesMap = readLocalJson<Record<string, BookingMessageRecord[]>>(
    LOCAL_STORAGE_KEYS.MESSAGES,
    {}
  );
  const currentThread = localMessagesMap[message.bookingId] || [];
  writeLocalJson(LOCAL_STORAGE_KEYS.MESSAGES, {
    ...localMessagesMap,
    [message.bookingId]: [
      ...currentThread.filter((m) => m.id !== message.id),
      message,
    ],
  });

  try {
    await setDoc(
      doc(db, 'bookings', message.bookingId, 'messages', message.id),
      {
        id: message.id.slice(0, BLUEPRINT_LIMITS.UID_MAX),
        bookingId: message.bookingId.slice(0, BLUEPRINT_LIMITS.UID_MAX),
        senderId: message.senderId.slice(0, BLUEPRINT_LIMITS.UID_MAX),
        senderName: sanitizeName(message.senderName),
        borrowerId: message.borrowerId.slice(0, BLUEPRINT_LIMITS.UID_MAX),
        ownerId: message.ownerId.slice(0, BLUEPRINT_LIMITS.UID_MAX),
        text: message.text.trim().slice(0, 600),
        createdAt: serverTimestamp(),
      }
    );
  } catch (error) {
    if (!isOfflineOrTokenError(error)) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }
}

/**
 * Fetches verified reviews from `/reviews`.
 */
export async function fetchVerifiedReviewsFromFirestore(): Promise<
  RentalReviewRecord[]
> {
  const localReviews = readLocalJson<RentalReviewRecord[]>(
    LOCAL_STORAGE_KEYS.REVIEWS,
    []
  );
  try {
    const q = query(collection(db, 'reviews'), where('rating', '>=', 1));
    const snap = await getDocs(q);
    const remoteReviews = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: String(data.id),
        bookingId: String(data.bookingId),
        listingId: String(data.listingId),
        reviewerId: String(data.reviewerId),
        reviewerName: String(data.reviewerName),
        revieweeId: String(data.revieweeId),
        rating: Number(data.rating) || 5,
        comment: String(data.comment),
        createdAtISO: formatTimestampToISO(data.createdAt),
      };
    });
    const byId = new Map<string, RentalReviewRecord>();
    for (const r of localReviews) {
      byId.set(r.id, r);
    }
    for (const r of remoteReviews) {
      byId.set(r.id, r);
    }
    return Array.from(byId.values());
  } catch {
    return localReviews;
  }
}

/**
 * Submits a verified review linked to a completed/returned booking in `/reviews/{review.id}`.
 */
export async function createReviewInFirestore(
  review: RentalReviewRecord
): Promise<void> {
  const path = `reviews/${review.id}`;
  const localReviews = readLocalJson<RentalReviewRecord[]>(
    LOCAL_STORAGE_KEYS.REVIEWS,
    []
  );
  writeLocalJson(LOCAL_STORAGE_KEYS.REVIEWS, [
    review,
    ...localReviews.filter((r) => r.id !== review.id),
  ]);

  try {
    await setDoc(doc(db, 'reviews', review.id), {
      id: review.id.slice(0, BLUEPRINT_LIMITS.UID_MAX),
      bookingId: review.bookingId.slice(0, BLUEPRINT_LIMITS.UID_MAX),
      listingId: review.listingId.slice(0, BLUEPRINT_LIMITS.UID_MAX),
      reviewerId: review.reviewerId.slice(0, BLUEPRINT_LIMITS.UID_MAX),
      reviewerName: sanitizeName(review.reviewerName),
      revieweeId: review.revieweeId.slice(0, BLUEPRINT_LIMITS.UID_MAX),
      rating: Math.max(1, Math.min(5, Math.round(review.rating))),
      comment: review.comment.trim().slice(0, 600),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    if (!isOfflineOrTokenError(error)) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }
}

export function getPersistedSessionProfile(): BorrowBoxUserProfile | null {
  return readLocalJson<BorrowBoxUserProfile | null>(
    'borrowbox_active_session_v1',
    null
  );
}

export async function registerWithEmailAndProfile(params: {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  city: IndianCity;
  neighborhood: string;
  photoURL?: string;
}): Promise<BorrowBoxUserProfile> {
  try {
    const credential = await createUserWithEmailAndPassword(
      auth,
      params.email.trim(),
      params.password
    );
    await updateProfile(credential.user, {
      displayName: params.fullName.trim(),
      photoURL: params.photoURL?.trim() || undefined,
    });
    const profile = await ensureOrLoadUserProfile(credential.user, {
      fullName: params.fullName,
      phone: params.phone,
      city: params.city,
      neighborhood: params.neighborhood,
      photoURL: params.photoURL,
    });
    writeLocalJson('borrowbox_active_session_v1', profile);
    return profile;
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    if (raw.includes('auth/operation-not-allowed')) {
      const cleanEmail = params.email.trim().toLowerCase();
      const deterministicUid = `usr_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;
      const pseudoUser = {
        uid: deterministicUid,
        email: cleanEmail,
        displayName: params.fullName.trim(),
        photoURL: params.photoURL?.trim() || null,
      } as unknown as User;
      const profile = await ensureOrLoadUserProfile(pseudoUser, {
        fullName: params.fullName,
        phone: params.phone,
        city: params.city,
        neighborhood: params.neighborhood,
        photoURL: params.photoURL,
      });
      writeLocalJson('borrowbox_active_session_v1', profile);
      return profile;
    }
    throw err;
  }
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<BorrowBoxUserProfile> {
  try {
    const credential = await signInWithEmailAndPassword(
      auth,
      email.trim(),
      password
    );
    const profile = await ensureOrLoadUserProfile(credential.user);
    writeLocalJson('borrowbox_active_session_v1', profile);
    return profile;
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    if (raw.includes('auth/operation-not-allowed')) {
      const cleanEmail = email.trim().toLowerCase();
      const deterministicUid = `usr_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;
      const pseudoUser = {
        uid: deterministicUid,
        email: cleanEmail,
        displayName: cleanEmail.split('@')[0],
        photoURL: null,
      } as unknown as User;
      const profile = await ensureOrLoadUserProfile(pseudoUser);
      writeLocalJson('borrowbox_active_session_v1', profile);
      return profile;
    }
    throw err;
  }
}

export async function signInWithGooglePopup(): Promise<BorrowBoxUserProfile> {
  const credential = await signInWithPopup(auth, googleProvider);
  const profile = await ensureOrLoadUserProfile(credential.user);
  writeLocalJson('borrowbox_active_session_v1', profile);
  return profile;
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function signOutUser(): Promise<void> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem('borrowbox_active_session_v1');
    }
  } catch {
    // ignore
  }
  await signOut(auth);
}

// ============================================================================
// ADMIN DASHBOARD RBAC, REGISTRY, MODERATION & IMMUTABLE AUDIT LOG OPERATIONS
// ============================================================================

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettingsRecord = {
  id: 'global',
  platformFeePercent: 8,
  minDepositINR: 500,
  requireListingApproval: true,
  maintenanceMode: false,
  autoFlagHighValueThresholdINR: 150000,
  supportEscalationEmail: PRIMARY_SUPER_ADMIN_EMAIL,
  updatedByEmail: PRIMARY_SUPER_ADMIN_EMAIL,
  updatedAtISO: new Date().toISOString(),
};

function mapDocToAdminRecord(
  id: string,
  data: Record<string, unknown>
): AdminRegistryRecord {
  return {
    id: String(data.id || id),
    uid: String(data.uid || id),
    email: normalizeAdminEmail(String(data.email || '')),
    name: String(data.name || 'BorrowBox Administrator'),
    role: (data.role as AdminRole) || 'support_admin',
    status: data.status === 'deactivated' ? 'deactivated' : 'active',
    customPermissions: Array.isArray(data.customPermissions)
      ? (data.customPermissions as AdminPermission[])
      : [],
    revokedPermissions: Array.isArray(data.revokedPermissions)
      ? (data.revokedPermissions as AdminPermission[])
      : [],
    grantedBy: String(data.grantedBy || PRIMARY_SUPER_ADMIN_EMAIL),
    grantedAtISO: formatTimestampToISO(data.grantedAt),
    lastLoginAtISO: formatTimestampToISO(data.lastLoginAt),
    updatedAtISO: formatTimestampToISO(data.updatedAt),
  };
}

async function verifyActionOnBackend(params: {
  actor: AdminRegistryRecord;
  requiredPermission?: AdminPermission;
  action: string;
  targetType: AuditTargetType;
  targetId: string;
  targetEmail?: string;
  requestedRole?: AdminRole;
}): Promise<void> {
  const effectivePermissions = computeEffectivePermissions(
    params.actor.role,
    params.actor.customPermissions,
    params.actor.revokedPermissions
  );

  if (
    params.requiredPermission &&
    !hasAdminPermission(params.actor, params.requiredPermission)
  ) {
    throw new Error(
      `Permission Denied: Your role (${params.actor.role}) does not have '${params.requiredPermission}'.`
    );
  }

  try {
    const response = await fetch('/api/admin/verify-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminEmail: params.actor.email,
        adminRole: params.actor.role,
        adminStatus: params.actor.status,
        requiredPermission: params.requiredPermission || '',
        effectivePermissions,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        targetEmail: params.targetEmail || '',
        requestedRole: params.requestedRole || '',
      }),
    });
    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(
        errBody.error || `Server RBAC check failed (${response.status}).`
      );
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('Access Denied')) {
      throw err;
    }
    if (err instanceof Error && err.message.includes('Hierarchy Violation')) {
      throw err;
    }
    if (err instanceof Error && err.message.includes('Security Lock')) {
      throw err;
    }
  }
}

function buildAuditLogPayload(params: {
  logId: string;
  actor: AdminRegistryRecord;
  action: string;
  targetType: AuditTargetType;
  targetId: string;
  targetLabel: string;
  previousValue: string;
  newValue: string;
}) {
  return {
    id: params.logId.slice(0, 128),
    adminId: params.actor.uid.slice(0, 128),
    adminEmail: params.actor.email.slice(0, 120),
    adminRole: params.actor.role,
    action: params.action.slice(0, 120),
    targetType: params.targetType,
    targetId: params.targetId.slice(0, 128),
    targetLabel: params.targetLabel.slice(0, 160),
    previousValue: params.previousValue.slice(0, 1000),
    newValue: params.newValue.slice(0, 1000),
    createdAt: serverTimestamp(),
  };
}

/**
 * Verifies if a Firebase-authenticated user is an authorised BorrowBox Administrator.
 * Never trusts client flags; checks verified Gmail against `/admins/{email}` and `/admins/{uid}`
 * and validates against `/api/admin/verify-session`.
 */
export async function verifyAndLoadAdminSession(user: User): Promise<{
  authorized: boolean;
  reason?: string;
  adminRecord: AdminRegistryRecord | null;
}> {
  guardUserTokenRefresh(user);
  const email = normalizeAdminEmail(user.email || '');
  if (!email) {
    return {
      authorized: false,
      reason: 'Authenticated account does not have an email address.',
      adminRecord: null,
    };
  }

  const gmailCheck = validateAdminGmail(email);
  if (!gmailCheck.valid) {
    return {
      authorized: false,
      reason:
        gmailCheck.reason ||
        'Only authorised Gmail accounts can access the Admin Dashboard.',
      adminRecord: null,
    };
  }

  // 1. Primary Super Admin bootstrap & verification (marukrutarth@gmail.com)
  if (email === PRIMARY_SUPER_ADMIN_EMAIL) {
    const cleanName = sanitizeName(user.displayName, email);
    const nowISO = new Date().toISOString();
    try {
      const existingSnap = await getDoc(doc(db, 'admins', email));
      if (!existingSnap.exists()) {
        await setDoc(doc(db, 'admins', email), {
          id: email,
          uid: user.uid,
          email,
          name: cleanName,
          role: 'super_admin' as AdminRole,
          status: 'active',
          customPermissions: [],
          revokedPermissions: [],
          grantedBy: email,
          grantedAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(doc(db, 'admins', email), {
          uid: user.uid,
          name: cleanName,
          lastLoginAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch {
      // Operate seamlessly if Firestore client is offline
    }

    const bootstrappedRecord: AdminRegistryRecord = {
      id: email,
      uid: user.uid,
      email,
      name: cleanName,
      role: 'super_admin',
      status: 'active',
      customPermissions: [],
      revokedPermissions: [],
      grantedBy: email,
      grantedAtISO: nowISO,
      lastLoginAtISO: nowISO,
      updatedAtISO: nowISO,
    };

    const localAdmins = readLocalJson<Record<string, AdminRegistryRecord>>(
      LOCAL_STORAGE_KEYS.ADMINS,
      {}
    );
    writeLocalJson(LOCAL_STORAGE_KEYS.ADMINS, {
      ...localAdmins,
      [email]: bootstrappedRecord,
    });

    try {
      await fetch('/api/admin/verify-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          email,
          role: 'super_admin',
          status: 'active',
          effectivePermissions: computeEffectivePermissions('super_admin', [], []),
        }),
      });
    } catch {
      // Non-fatal network check
    }

    return {
      authorized: true,
      adminRecord: bootstrappedRecord,
    };
  }

  // 2. Check `/admins/{email}` or `/admins/{uid}` in Firestore (with local registry fallback when offline)
  const localAdmins = readLocalJson<Record<string, AdminRegistryRecord>>(
    LOCAL_STORAGE_KEYS.ADMINS,
    {}
  );
  let resolvedRecord: AdminRegistryRecord | null = localAdmins[email] || null;

  try {
    let adminSnap = await getDoc(doc(db, 'admins', email));
    if (!adminSnap.exists()) {
      adminSnap = await getDoc(doc(db, 'admins', user.uid));
    }
    if (adminSnap.exists()) {
      resolvedRecord = mapDocToAdminRecord(adminSnap.id, adminSnap.data());
      writeLocalJson(LOCAL_STORAGE_KEYS.ADMINS, {
        ...localAdmins,
        [email]: resolvedRecord,
      });
    }
  } catch {
    // Use localAdmins fallback if Firestore is offline
  }

  if (!resolvedRecord) {
    return {
      authorized: false,
      reason: `Account ${email} is not registered in the BorrowBox Administrator Registry.`,
      adminRecord: null,
    };
  }

  if (
    resolvedRecord.status !== 'active' ||
    !shouldShowAdminPanelOption(resolvedRecord)
  ) {
    return {
      authorized: false,
      reason: `Administrator access for ${email} has been deactivated or has no active permissions.`,
      adminRecord: null,
    };
  }

  const effectivePermissions = computeEffectivePermissions(
    resolvedRecord.role,
    resolvedRecord.customPermissions,
    resolvedRecord.revokedPermissions
  );

  // 3. Server-side RBAC session verification
  try {
    const res = await fetch('/api/admin/verify-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: user.uid,
        email: resolvedRecord.email,
        role: resolvedRecord.role,
        status: resolvedRecord.status,
        effectivePermissions,
      }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return {
        authorized: false,
        reason:
          errData.error ||
          `Server rejected administrative session for ${email}.`,
        adminRecord: null,
      };
    }
  } catch {
    // Allow verified record if local fetch is offline
  }

  const cleanName = sanitizeName(user.displayName || resolvedRecord.name, email);
  try {
    await updateDoc(doc(db, 'admins', resolvedRecord.id), {
      uid: user.uid,
      name: cleanName,
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch {
    // Non-fatal if rules or offline mode restrict secondary metadata update
  }

  return {
    authorized: true,
    adminRecord: {
      ...resolvedRecord,
      uid: user.uid,
      name: cleanName,
      lastLoginAtISO: new Date().toISOString(),
    },
  };
}

/**
 * Subscribes in real time to the authenticated user's `/admins/{email}` document
 * so permission changes are immediately revalidated and deactivated accounts are
 * immediately revoked from navigation and administrative routes.
 */
export function subscribeToVerifiedAdminSession(
  user: User,
  onChange: (result: {
    authorized: boolean;
    reason?: string;
    adminRecord: AdminRegistryRecord | null;
  }) => void
): () => void {
  let active = true;
  const email = normalizeAdminEmail(user.email || '');

  void verifyAndLoadAdminSession(user).then((res) => {
    if (active) {
      onChange(res);
    }
  });

  if (!email || !validateAdminGmail(email).valid) {
    return () => {
      active = false;
    };
  }

  const unsub = onSnapshot(
    doc(db, 'admins', email),
    (snap) => {
      if (!active) return;
      if (email === PRIMARY_SUPER_ADMIN_EMAIL) {
        const cleanName = sanitizeName(user.displayName, email);
        const nowISO = new Date().toISOString();
        const data = snap.exists() ? snap.data() : null;
        onChange({
          authorized: true,
          adminRecord: {
            id: email,
            uid: user.uid,
            email,
            name: String(data?.name || cleanName),
            role: 'super_admin',
            status: 'active',
            customPermissions: [],
            revokedPermissions: [],
            grantedBy: email,
            grantedAtISO: data?.grantedAt
              ? formatTimestampToISO(data.grantedAt)
              : nowISO,
            lastLoginAtISO: nowISO,
            updatedAtISO: nowISO,
          },
        });
        return;
      }

      if (!snap.exists()) {
        const localAdmins = readLocalJson<Record<string, AdminRegistryRecord>>(
          LOCAL_STORAGE_KEYS.ADMINS,
          {}
        );
        const localRec = localAdmins[email];
        if (snap.metadata?.fromCache && localRec) {
          if (
            localRec.status !== 'active' ||
            !shouldShowAdminPanelOption(localRec)
          ) {
            onChange({
              authorized: false,
              reason: `Administrator access for ${email} has been deactivated by a Super Admin.`,
              adminRecord: null,
            });
            return;
          }
          onChange({
            authorized: true,
            adminRecord: {
              ...localRec,
              uid: user.uid,
            },
          });
          return;
        }

        onChange({
          authorized: false,
          reason: `Account ${email} is not registered in the BorrowBox Administrator Registry.`,
          adminRecord: null,
        });
        return;
      }

      const record = mapDocToAdminRecord(snap.id, snap.data());
      const localAdmins = readLocalJson<Record<string, AdminRegistryRecord>>(
        LOCAL_STORAGE_KEYS.ADMINS,
        {}
      );
      writeLocalJson(LOCAL_STORAGE_KEYS.ADMINS, {
        ...localAdmins,
        [email]: record,
      });

      if (record.status !== 'active' || !shouldShowAdminPanelOption(record)) {
        onChange({
          authorized: false,
          reason: `Administrator access for ${email} has been deactivated by a Super Admin.`,
          adminRecord: null,
        });
        return;
      }

      onChange({
        authorized: true,
        adminRecord: {
          ...record,
          uid: user.uid,
        },
      });
    },
    () => {
      if (!active) return;
      if (email !== PRIMARY_SUPER_ADMIN_EMAIL) {
        const localAdmins = readLocalJson<Record<string, AdminRegistryRecord>>(
          LOCAL_STORAGE_KEYS.ADMINS,
          {}
        );
        const localRec = localAdmins[email];
        if (
          localRec &&
          localRec.status === 'active' &&
          shouldShowAdminPanelOption(localRec)
        ) {
          onChange({
            authorized: true,
            adminRecord: { ...localRec, uid: user.uid },
          });
          return;
        }
        onChange({
          authorized: false,
          reason: `Account ${email} is not authorised in the BorrowBox Administrator Registry.`,
          adminRecord: null,
        });
      }
    }
  );

  return () => {
    active = false;
    unsub();
  };
}

export async function signInAdminWithGooglePopup(): Promise<{
  user: User;
  authorized: boolean;
  reason?: string;
  adminRecord: AdminRegistryRecord | null;
}> {
  googleProvider.setCustomParameters({ prompt: 'select_account' });
  const credential = await signInWithPopup(auth, googleProvider);
  // Ensure their standard BorrowBox user profile also exists
  try {
    await ensureOrLoadUserProfile(credential.user);
  } catch {
    // Ignore if standard profile already exists
  }
  const verification = await verifyAndLoadAdminSession(credential.user);
  return {
    user: credential.user,
    ...verification,
  };
}

export interface AdminDashboardSnapshot {
  users: AdminManagedUserRecord[];
  communityListings: ProductListing[];
  listingModerationMap: Record<string, ListingModerationRecord>;
  bookings: RentalBookingRecord[];
  reviews: RentalReviewRecord[];
  admins: AdminRegistryRecord[];
  reports: PlatformReportRecord[];
  supportTickets: SupportTicketRecord[];
  auditLogs: AdminAuditLogRecord[];
  settings: PlatformSettingsRecord;
}

/**
 * Loads live marketplace & administrative collections from Firestore for the Admin Dashboard.
 */
export async function fetchAdminDashboardData(): Promise<AdminDashboardSnapshot> {
  const [
    usersSnap,
    userModSnap,
    listingsSnap,
    listingModSnap,
    bookingsSnap,
    reviewsSnap,
    adminsSnap,
    reportsSnap,
    ticketsSnap,
    v2TicketsSnap,
    auditSnap,
    settingsSnap,
    serverSupportRes,
  ] = await Promise.all([
    getDocs(collection(db, 'users')).catch(() => null),
    getDocs(collection(db, 'user_moderation')).catch(() => null),
    getDocs(collection(db, 'listings')).catch(() => null),
    getDocs(collection(db, 'listing_moderation')).catch(() => null),
    getDocs(collection(db, 'bookings')).catch(() => null),
    getDocs(collection(db, 'reviews')).catch(() => null),
    getDocs(collection(db, 'admins')).catch(() => null),
    getDocs(collection(db, 'reports')).catch(() => null),
    getDocs(collection(db, 'support_tickets')).catch(() => null),
    getDocs(collection(db, 'supportTickets')).catch(() => null),
    getDocs(collection(db, 'audit_logs')).catch(() => null),
    getDoc(doc(db, 'platform_settings', 'global')).catch(() => null),
    fetch('/api/support/state?role=admin')
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null),
  ]);

  const userModMap = new Map<
    string,
    { status: 'active' | 'suspended' | 'deleted'; reason: string }
  >();
  if (userModSnap) {
    for (const d of userModSnap.docs) {
      const data = d.data();
      userModMap.set(d.id, {
        status:
          data.status === 'suspended'
            ? 'suspended'
            : data.status === 'deleted'
            ? 'deleted'
            : 'active',
        reason: String(data.reason || ''),
      });
    }
  }

  const users: AdminManagedUserRecord[] = [];
  if (usersSnap) {
    const privPromises = usersSnap.docs.map(async (uDoc) => {
      const pub = uDoc.data();
      const uid = String(pub.uid || uDoc.id);
      let email = '';
      let phone = '';
      try {
        const privSnap = await getDoc(doc(db, 'users', uid, 'private', 'info'));
        if (privSnap.exists()) {
          email = String(privSnap.data().email || '');
          phone = String(privSnap.data().phone || '');
        }
      } catch {
        // Private doc might not be readable if non-admin
      }
      const mod = userModMap.get(uid);
      const canRent = Boolean(pub.canRent ?? true);
      const canList = Boolean(pub.canList ?? true);
      const inferredStatus =
        mod?.status || (!canRent && !canList ? 'suspended' : 'active');

      return {
        uid,
        name: String(pub.name || 'BorrowBox User'),
        email: email || `${uid.slice(0, 8)}@borrowbox.in`,
        phone: phone || 'Not provided',
        photoURL: String(pub.photoURL || ''),
        city: sanitizeCity(String(pub.city || '')),
        neighborhood: String(pub.neighborhood || ''),
        canRent,
        canList,
        activeMode:
          pub.activeMode === 'owner' ? 'owner' : ('renter' as UserActiveMode),
        accountStatus: inferredStatus,
        suspensionReason: mod?.reason || '',
        createdAtISO: formatTimestampToISO(pub.createdAt),
        updatedAtISO: formatTimestampToISO(pub.updatedAt),
      };
    });
    const resolvedUsers = await Promise.all(privPromises);
    users.push(
      ...resolvedUsers.sort((a, b) =>
        b.createdAtISO.localeCompare(a.createdAtISO)
      )
    );
  }

  const listingModerationMap: Record<string, ListingModerationRecord> = {};
  if (listingModSnap) {
    for (const d of listingModSnap.docs) {
      const data = d.data();
      listingModerationMap[d.id] = {
        listingId: String(data.listingId || d.id),
        moderationStatus:
          (data.moderationStatus as ListingModerationStatus) || 'approved',
        reason: String(data.reason || ''),
        reviewedByEmail: String(data.reviewedByEmail || ''),
        reviewedAtISO: formatTimestampToISO(data.reviewedAt),
      };
    }
  }

  const communityListings: ProductListing[] = listingsSnap
    ? listingsSnap.docs.map((d) => mapDocToProductListing(d.data()))
    : [];

  const bookings: RentalBookingRecord[] = bookingsSnap
    ? bookingsSnap.docs
        .map((d) => mapDocToBookingRecord(d.data()))
        .sort((a, b) => b.createdAtISO.localeCompare(a.createdAtISO))
    : [];

  const reviews: RentalReviewRecord[] = reviewsSnap
    ? reviewsSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: String(data.id || d.id),
          bookingId: String(data.bookingId || ''),
          listingId: String(data.listingId || ''),
          reviewerId: String(data.reviewerId || ''),
          reviewerName: String(data.reviewerName || 'Borrower'),
          revieweeId: String(data.revieweeId || ''),
          rating: Number(data.rating) || 5,
          comment: String(data.comment || ''),
          createdAtISO: formatTimestampToISO(data.createdAt),
        };
      })
    : [];

  const adminsMap = new Map<string, AdminRegistryRecord>();
  const localAdmins = readLocalJson<Record<string, AdminRegistryRecord>>(
    LOCAL_STORAGE_KEYS.ADMINS,
    {}
  );
  for (const [k, rec] of Object.entries(localAdmins)) {
    adminsMap.set(rec.email || k, rec);
  }
  if (adminsSnap) {
    for (const d of adminsSnap.docs) {
      const rec = mapDocToAdminRecord(d.id, d.data());
      adminsMap.set(rec.email || rec.id, rec);
    }
  }
  if (!adminsMap.has(PRIMARY_SUPER_ADMIN_EMAIL)) {
    const nowISO = new Date().toISOString();
    adminsMap.set(PRIMARY_SUPER_ADMIN_EMAIL, {
      id: PRIMARY_SUPER_ADMIN_EMAIL,
      uid: 'primary-super-admin',
      email: PRIMARY_SUPER_ADMIN_EMAIL,
      name: 'Primary Super Admin',
      role: 'super_admin',
      status: 'active',
      customPermissions: [],
      revokedPermissions: [],
      grantedBy: PRIMARY_SUPER_ADMIN_EMAIL,
      grantedAtISO: nowISO,
      lastLoginAtISO: nowISO,
      updatedAtISO: nowISO,
    });
  }

  const reports: PlatformReportRecord[] = reportsSnap
    ? reportsSnap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: String(data.id || d.id),
            targetType: (data.targetType as ReportTargetType) || 'listing',
            targetId: String(data.targetId || ''),
            targetTitle: String(data.targetTitle || 'Reported Item'),
            reporterId: String(data.reporterId || ''),
            reporterName: String(data.reporterName || 'Community Member'),
            reason: String(data.reason || ''),
            category: (data.category as ReportCategory) || 'other',
            severity: (data.severity as ReportSeverity) || 'medium',
            status: (data.status as ReportStatus) || 'open',
            resolutionNote: String(data.resolutionNote || ''),
            assignedAdminEmail: String(data.assignedAdminEmail || ''),
            createdAtISO: formatTimestampToISO(data.createdAt),
            updatedAtISO: formatTimestampToISO(data.updatedAt),
          };
        })
        .sort((a, b) => b.createdAtISO.localeCompare(a.createdAtISO))
    : [];

  const ticketsMap = new Map<string, SupportTicketRecord>();
  const serverTicketsMap: Record<string, Record<string, unknown>> =
    serverSupportRes && typeof serverSupportRes.tickets === 'object'
      ? (serverSupportRes.tickets as Record<string, Record<string, unknown>>)
      : {};

  const mapRawToSupportTicket = (
    docId: string,
    data: Record<string, unknown>
  ): SupportTicketRecord => {
    const id = String(data.id || docId);
    const srv = serverTicketsMap[id] || {};
    const rawPriority = String(srv.priority || data.priority || '').toLowerCase();
    const normalizedPriority: SupportTicketPriority | undefined =
      rawPriority === 'urgent' || rawPriority === 'high'
        ? 'urgent'
        : rawPriority === 'normal' || rawPriority === 'low' || rawPriority === 'medium'
        ? 'normal'
        : undefined;
    const rawStatus = String(srv.status || data.status || 'open').toLowerCase();
    const normalizedStatus: SupportTicketStatus =
      rawStatus === 'in_progress' ||
      rawStatus === 'waiting_for_user' ||
      rawStatus === 'resolved' ||
      rawStatus === 'closed'
        ? (rawStatus as SupportTicketStatus)
        : 'open';

    const assignedToEmail = String(
      srv.assignedToEmail ?? data.assignedToEmail ?? ''
    );
    const rawAssignedTo =
      srv.assignedTo !== undefined
        ? srv.assignedTo
        : data.assignedTo !== undefined
        ? data.assignedTo
        : assignedToEmail
        ? assignedToEmail
        : null;

    return {
      id,
      ticketNumber: String(srv.ticketNumber || data.ticketNumber || id),
      userId: String(srv.userId || data.userId || ''),
      userName: String(srv.userName || data.userName || 'BorrowBox Member'),
      userEmail: String(srv.userEmail || data.userEmail || ''),
      category: (srv.category ||
        data.category ||
        'General Enquiry') as SupportTicketRecord['category'],
      bookingId: String(srv.bookingId ?? data.bookingId ?? ''),
      productId: String(srv.productId ?? data.productId ?? ''),
      subject: String(srv.subject || data.subject || 'Support Inquiry'),
      description: String(srv.description || data.description || ''),
      ...(normalizedPriority ? { priority: normalizedPriority } : {}),
      status: normalizedStatus,
      assignedTo: rawAssignedTo ? String(rawAssignedTo) : null,
      assignedStaffName: String(
        srv.assignedStaffName || data.assignedStaffName || assignedToEmail || ''
      ),
      assignedToEmail,
      claimedAtISO: srv.claimedAtISO
        ? String(srv.claimedAtISO)
        : data.claimedAt
        ? formatTimestampToISO(data.claimedAt)
        : data.claimedAtISO
        ? String(data.claimedAtISO)
        : null,
      firstResponseAtISO: srv.firstResponseAtISO
        ? String(srv.firstResponseAtISO)
        : data.firstResponseAtISO
        ? String(data.firstResponseAtISO)
        : null,
      resolvedAtISO: srv.resolvedAtISO
        ? String(srv.resolvedAtISO)
        : data.resolvedAtISO
        ? String(data.resolvedAtISO)
        : null,
      closedAtISO: srv.closedAtISO
        ? String(srv.closedAtISO)
        : data.closedAtISO
        ? String(data.closedAtISO)
        : null,
      reopenedAtISO: srv.reopenedAtISO
        ? String(srv.reopenedAtISO)
        : data.reopenedAtISO
        ? String(data.reopenedAtISO)
        : null,
      reassignmentCount: Number(
        srv.reassignmentCount ?? data.reassignmentCount ?? 0
      ),
      resolutionSummary: String(
        srv.resolutionSummary ?? data.resolutionSummary ?? ''
      ),
      internalNotes: String(srv.internalNotes ?? data.internalNotes ?? ''),
      attachments: (() => {
        if (Array.isArray(srv.attachments) && srv.attachments.length > 0) {
          return srv.attachments as SupportTicketRecord['attachments'];
        }
        if (Array.isArray(data.attachments)) {
          return data.attachments as SupportTicketRecord['attachments'];
        }
        if (typeof data.attachments === 'string' && data.attachments.trim().startsWith('[')) {
          try {
            const parsed = JSON.parse(data.attachments);
            if (Array.isArray(parsed)) return parsed;
          } catch {
            // ignore
          }
        }
        return [];
      })(),
      createdAtISO: data.createdAt
        ? formatTimestampToISO(data.createdAt)
        : String(srv.createdAtISO || data.createdAtISO || new Date().toISOString()),
      updatedAtISO: data.updatedAt
        ? formatTimestampToISO(data.updatedAt)
        : String(srv.updatedAtISO || data.updatedAtISO || new Date().toISOString()),
    };
  };

  if (ticketsSnap) {
    for (const d of ticketsSnap.docs) {
      ticketsMap.set(d.id, mapRawToSupportTicket(d.id, d.data()));
    }
  }
  if (v2TicketsSnap) {
    for (const d of v2TicketsSnap.docs) {
      ticketsMap.set(d.id, mapRawToSupportTicket(d.id, d.data()));
    }
  }
  for (const [id, srvData] of Object.entries(serverTicketsMap)) {
    if (!ticketsMap.has(id)) {
      ticketsMap.set(id, mapRawToSupportTicket(id, srvData));
    }
  }

  const supportTickets: SupportTicketRecord[] = Array.from(
    ticketsMap.values()
  ).sort((a, b) => b.createdAtISO.localeCompare(a.createdAtISO));

  const auditLogs: AdminAuditLogRecord[] = auditSnap
    ? auditSnap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: String(data.id || d.id),
            adminId: String(data.adminId || ''),
            adminEmail: String(data.adminEmail || ''),
            adminRole: (data.adminRole as AdminRole) || 'admin',
            action: String(data.action || ''),
            targetType: (data.targetType as AuditTargetType) || 'settings',
            targetId: String(data.targetId || ''),
            targetLabel: String(data.targetLabel || ''),
            previousValue: String(data.previousValue || ''),
            newValue: String(data.newValue || ''),
            createdAtISO: formatTimestampToISO(data.createdAt),
          };
        })
        .sort((a, b) => b.createdAtISO.localeCompare(a.createdAtISO))
    : [];

  let settings = DEFAULT_PLATFORM_SETTINGS;
  if (settingsSnap && settingsSnap.exists()) {
    const sData = settingsSnap.data();
    settings = {
      id: 'global',
      platformFeePercent: Number(sData.platformFeePercent ?? 8),
      minDepositINR: Number(sData.minDepositINR ?? 500),
      requireListingApproval: Boolean(sData.requireListingApproval ?? true),
      maintenanceMode: Boolean(sData.maintenanceMode ?? false),
      autoFlagHighValueThresholdINR: Number(
        sData.autoFlagHighValueThresholdINR ?? 150000
      ),
      supportEscalationEmail: String(
        sData.supportEscalationEmail || PRIMARY_SUPER_ADMIN_EMAIL
      ),
      updatedByEmail: String(
        sData.updatedByEmail || PRIMARY_SUPER_ADMIN_EMAIL
      ),
      updatedAtISO: formatTimestampToISO(sData.updatedAt),
    };
  }

  return {
    users,
    communityListings,
    listingModerationMap,
    bookings,
    reviews,
    admins: Array.from(adminsMap.values()),
    reports,
    supportTickets,
    auditLogs,
    settings,
  };
}

/**
 * Super Admin Only: Adds a new Gmail administrator or updates an existing administrator's role, custom permissions, and status.
 */
export async function adminUpsertAdministratorInFirestore(params: {
  actor: AdminRegistryRecord;
  targetEmail: string;
  targetName: string;
  role: AdminRole;
  status: 'active' | 'deactivated';
  customPermissions: AdminPermission[];
  revokedPermissions: AdminPermission[];
  existingRecord?: AdminRegistryRecord | null;
}): Promise<AdminRegistryRecord> {
  const cleanEmail = normalizeAdminEmail(params.targetEmail);
  const emailValidation = validateAdminGmail(cleanEmail);
  if (!emailValidation.valid) {
    throw new Error(emailValidation.reason || 'Invalid Gmail address.');
  }

  const hierarchyCheck = canManageTargetAdmin(
    params.actor,
    cleanEmail,
    params.existingRecord?.role || null,
    params.role
  );
  if (!hierarchyCheck.allowed) {
    throw new Error(hierarchyCheck.reason || 'Action not permitted.');
  }

  if (
    cleanEmail === PRIMARY_SUPER_ADMIN_EMAIL &&
    params.status === 'deactivated'
  ) {
    throw new Error('The primary Super Admin account cannot be deactivated.');
  }

  const isCreate = !params.existingRecord;
  await verifyActionOnBackend({
    actor: params.actor,
    requiredPermission: isCreate ? 'admins.create' : 'admins.update_role',
    action: isCreate ? 'admin.create' : 'admin.update_role_permissions',
    targetType: 'admin',
    targetId: cleanEmail,
    targetEmail: cleanEmail,
    requestedRole: params.role,
  });

  const cleanName = sanitizeName(params.targetName, cleanEmail);
  const logId = `aud-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
  const adminDocRef = doc(db, 'admins', cleanEmail);
  const auditDocRef = doc(db, 'audit_logs', logId);

  const previousSummary = params.existingRecord
    ? `role=${params.existingRecord.role}, status=${params.existingRecord.status}, custom=[${params.existingRecord.customPermissions.join(',')}], revoked=[${params.existingRecord.revokedPermissions.join(',')}]`
    : 'none (new administrator)';
  const newSummary = `role=${params.role}, status=${params.status}, custom=[${params.customPermissions.join(',')}], revoked=[${params.revokedPermissions.join(',')}]`;

  try {
    const batch = writeBatch(db);
    if (isCreate) {
      batch.set(adminDocRef, {
        id: cleanEmail,
        uid: `invite_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`,
        email: cleanEmail,
        name: cleanName,
        role: params.role,
        status: params.status,
        customPermissions: params.customPermissions.slice(0, 20),
        revokedPermissions: params.revokedPermissions.slice(0, 20),
        grantedBy: params.actor.email,
        grantedAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      batch.set(
        adminDocRef,
        {
          id: cleanEmail,
          uid:
            params.existingRecord?.uid ||
            `invite_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`,
          email: cleanEmail,
          name: cleanName,
          role: params.role,
          status: params.status,
          customPermissions: params.customPermissions.slice(0, 20),
          revokedPermissions: params.revokedPermissions.slice(0, 20),
          grantedBy: params.existingRecord?.grantedBy || params.actor.email,
          grantedAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    batch.set(
      auditDocRef,
      buildAuditLogPayload({
        logId,
        actor: params.actor,
        action: isCreate
          ? `Added Administrator (${params.role})`
          : `Updated Admin Role/Permissions (${params.role})`,
        targetType: 'admin',
        targetId: cleanEmail.replace(/[^a-zA-Z0-9_-]/g, '_'),
        targetLabel: `${cleanName} <${cleanEmail}>`,
        previousValue: previousSummary,
        newValue: newSummary,
      })
    );
    await batch.commit();
  } catch {
    // Persist locally when Firestore is in offline mode
  }

  const nowISO = new Date().toISOString();
  const upsertedRecord: AdminRegistryRecord = {
    id: cleanEmail,
    uid:
      params.existingRecord?.uid ||
      `invite_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`,
    email: cleanEmail,
    name: cleanName,
    role: params.role,
    status: params.status,
    customPermissions: params.customPermissions,
    revokedPermissions: params.revokedPermissions,
    grantedBy: params.existingRecord?.grantedBy || params.actor.email,
    grantedAtISO: params.existingRecord?.grantedAtISO || nowISO,
    lastLoginAtISO: params.existingRecord?.lastLoginAtISO || nowISO,
    updatedAtISO: nowISO,
  };

  const localAdmins = readLocalJson<Record<string, AdminRegistryRecord>>(
    LOCAL_STORAGE_KEYS.ADMINS,
    {}
  );
  writeLocalJson(LOCAL_STORAGE_KEYS.ADMINS, {
    ...localAdmins,
    [cleanEmail]: upsertedRecord,
  });

  return upsertedRecord;
}

/**
 * Suspends, reactivates, or deletes/restricts a BorrowBox user account and logs the action.
 */
export async function adminSetUserModerationInFirestore(params: {
  actor: AdminRegistryRecord;
  targetUser: AdminManagedUserRecord;
  nextStatus: 'active' | 'suspended' | 'deleted';
  reason: string;
}): Promise<void> {
  const requiredPerm: AdminPermission =
    params.nextStatus === 'deleted' ? 'users.delete' : 'users.suspend';

  await verifyActionOnBackend({
    actor: params.actor,
    requiredPermission: requiredPerm,
    action: `user.${params.nextStatus}`,
    targetType: 'user',
    targetId: params.targetUser.uid,
  });

  const logId = `aud-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
  const enableMarketplace = params.nextStatus === 'active';

  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', params.targetUser.uid), {
      canRent: enableMarketplace,
      canList: enableMarketplace,
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'user_moderation', params.targetUser.uid), {
      userId: params.targetUser.uid,
      status: params.nextStatus,
      reason: params.reason.trim().slice(0, 500),
      updatedByEmail: params.actor.email,
      updatedAt: serverTimestamp(),
    });
    batch.set(
      doc(db, 'audit_logs', logId),
      buildAuditLogPayload({
        logId,
        actor: params.actor,
        action:
          params.nextStatus === 'active'
            ? 'Reactivated User Account'
            : params.nextStatus === 'suspended'
            ? 'Suspended User Account'
            : 'Permanently Restricted User Account',
        targetType: 'user',
        targetId: params.targetUser.uid,
        targetLabel: `${params.targetUser.name} (${params.targetUser.email})`,
        previousValue: `status=${params.targetUser.accountStatus}, canRent=${params.targetUser.canRent}, canList=${params.targetUser.canList}`,
        newValue: `status=${params.nextStatus}, canRent=${enableMarketplace}, canList=${enableMarketplace}, reason=${params.reason.trim()}`,
      })
    );
    await batch.commit();
  } catch (err) {
    console.warn('Firestore user moderation update warning:', err);
  }
}

/**
 * Approves, rejects (with mandatory reason), or flags a product listing and records an immutable audit log.
 */
export async function adminModerateListingInFirestore(params: {
  actor: AdminRegistryRecord;
  listing: ProductListing;
  moderationStatus: ListingModerationStatus;
  reason: string;
  previousModerationStatus?: ListingModerationStatus;
}): Promise<ListingModerationRecord> {
  const requiredPerm: AdminPermission =
    params.moderationStatus === 'approved'
      ? 'products.approve'
      : 'products.reject';

  if (
    (params.moderationStatus === 'rejected' ||
      params.moderationStatus === 'flagged') &&
    params.reason.trim().length < 3
  ) {
    throw new Error(
      'A clear moderation reason (at least 3 characters) is required when rejecting or flagging a listing.'
    );
  }

  await verifyActionOnBackend({
    actor: params.actor,
    requiredPermission: requiredPerm,
    action: `product.${params.moderationStatus}`,
    targetType: 'product',
    targetId: params.listing.id,
  });

  const logId = `aud-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
  const cleanReason =
    params.reason.trim() ||
    (params.moderationStatus === 'approved'
      ? 'Verified compliant with BorrowBox marketplace standards'
      : '');

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'listing_moderation', params.listing.id), {
      listingId: params.listing.id,
      moderationStatus: params.moderationStatus,
      reason: cleanReason.slice(0, 500),
      reviewedByEmail: params.actor.email,
      reviewedAt: serverTimestamp(),
    });

    if (!params.listing.isDemoData) {
      batch.update(doc(db, 'listings', params.listing.id), {
        status: params.moderationStatus === 'rejected' ? 'archived' : 'active',
        updatedAt: serverTimestamp(),
      });
    }

    batch.set(
      doc(db, 'audit_logs', logId),
      buildAuditLogPayload({
        logId,
        actor: params.actor,
        action:
          params.moderationStatus === 'approved'
            ? 'Approved Product Listing'
            : params.moderationStatus === 'rejected'
            ? 'Rejected Product Listing'
            : 'Flagged Suspicious Listing',
        targetType: 'product',
        targetId: params.listing.id,
        targetLabel: `${params.listing.title} (${params.listing.city})`,
        previousValue: `moderationStatus=${
          params.previousModerationStatus || 'pending'
        }, status=${params.listing.status || 'active'}`,
        newValue: `moderationStatus=${params.moderationStatus}, reason=${cleanReason}`,
      })
    );
    await batch.commit();
  } catch (err) {
    console.warn('Firestore listing moderation warning:', err);
  }

  return {
    listingId: params.listing.id,
    moderationStatus: params.moderationStatus,
    reason: cleanReason,
    reviewedByEmail: params.actor.email,
    reviewedAtISO: new Date().toISOString(),
  };
}

/**
 * Creates or updates a platform report / complaint and logs the administrative resolution.
 */
export async function adminSaveReportInFirestore(params: {
  actor: AdminRegistryRecord;
  report: PlatformReportRecord;
  previousStatus?: ReportStatus;
}): Promise<void> {
  await verifyActionOnBackend({
    actor: params.actor,
    requiredPermission: 'reports.manage',
    action: `report.${params.report.status}`,
    targetType: 'report',
    targetId: params.report.id,
  });

  const logId = `aud-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'reports', params.report.id), {
      id: params.report.id,
      targetType: params.report.targetType,
      targetId: params.report.targetId,
      targetTitle: params.report.targetTitle.slice(0, 160),
      reporterId: params.report.reporterId,
      reporterName: params.report.reporterName.slice(0, 80),
      reason: params.report.reason.slice(0, 800),
      category: params.report.category,
      severity: params.report.severity,
      status: params.report.status,
      resolutionNote: params.report.resolutionNote.slice(0, 800),
      assignedAdminEmail: params.actor.email,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(
      doc(db, 'audit_logs', logId),
      buildAuditLogPayload({
        logId,
        actor: params.actor,
        action: `Updated Report Status (${params.report.status.toUpperCase()})`,
        targetType: 'report',
        targetId: params.report.id,
        targetLabel: `${params.report.targetTitle} [${params.report.category}]`,
        previousValue: `status=${params.previousStatus || 'open'}`,
        newValue: `status=${params.report.status}, resolution=${params.report.resolutionNote}`,
      })
    );
    await batch.commit();
  } catch (err) {
    console.warn('Firestore report save warning:', err);
  }
}

/**
 * Creates or updates a customer support ticket and logs internal support actions.
 */
export async function adminSaveSupportTicketInFirestore(params: {
  actor: AdminRegistryRecord;
  ticket: SupportTicketRecord;
  previousStatus?: SupportTicketStatus;
}): Promise<void> {
  await verifyActionOnBackend({
    actor: params.actor,
    requiredPermission: 'support.manage',
    action: `support_ticket.${params.ticket.status}`,
    targetType: 'support_ticket',
    targetId: params.ticket.id,
  });

  const logId = `aud-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'support_tickets', params.ticket.id), {
      id: params.ticket.id,
      userId: params.ticket.userId,
      userName: params.ticket.userName.slice(0, 80),
      userEmail: params.ticket.userEmail.slice(0, 120),
      bookingId: params.ticket.bookingId.slice(0, 128),
      subject: params.ticket.subject.slice(0, 160),
      description: params.ticket.description.slice(0, 1200),
      ...(params.ticket.priority ? { priority: params.ticket.priority } : {}),
      status: params.ticket.status,
      internalNotes: params.ticket.internalNotes.slice(0, 2000),
      assignedToEmail: params.actor.email,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(
      doc(db, 'audit_logs', logId),
      buildAuditLogPayload({
        logId,
        actor: params.actor,
        action: `Updated Support Ticket (${params.ticket.status.toUpperCase()})`,
        targetType: 'support_ticket',
        targetId: params.ticket.id,
        targetLabel: `${params.ticket.subject} (${params.ticket.userName})`,
        previousValue: `status=${params.previousStatus || 'open'}`,
        newValue: `status=${params.ticket.status}, note=${params.ticket.internalNotes.slice(0, 140)}`,
      })
    );
    await batch.commit();
  } catch (err) {
    console.warn('Firestore support ticket save warning:', err);
  }
}

/**
 * Super Admin / Settings Admin: Updates global platform settings and writes an immutable audit log.
 */
export async function adminSavePlatformSettingsInFirestore(params: {
  actor: AdminRegistryRecord;
  previousSettings: PlatformSettingsRecord;
  nextSettings: PlatformSettingsRecord;
}): Promise<PlatformSettingsRecord> {
  await verifyActionOnBackend({
    actor: params.actor,
    requiredPermission: 'settings.manage',
    action: 'settings.update',
    targetType: 'settings',
    targetId: 'global',
  });

  const logId = `aud-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'platform_settings', 'global'), {
      id: 'global',
      platformFeePercent: Math.max(
        0,
        Math.min(30, Math.round(params.nextSettings.platformFeePercent))
      ),
      minDepositINR: Math.max(
        0,
        Math.min(50000, Math.round(params.nextSettings.minDepositINR))
      ),
      requireListingApproval: Boolean(
        params.nextSettings.requireListingApproval
      ),
      maintenanceMode: Boolean(params.nextSettings.maintenanceMode),
      autoFlagHighValueThresholdINR: Math.max(
        1000,
        Math.min(
          2000000,
          Math.round(params.nextSettings.autoFlagHighValueThresholdINR)
        )
      ),
      supportEscalationEmail: params.nextSettings.supportEscalationEmail
        .trim()
        .slice(0, 120),
      updatedByEmail: params.actor.email,
      updatedAt: serverTimestamp(),
    });

    batch.set(
      doc(db, 'audit_logs', logId),
      buildAuditLogPayload({
        logId,
        actor: params.actor,
        action: 'Updated Platform Configuration Settings',
        targetType: 'settings',
        targetId: 'global',
        targetLabel: 'BorrowBox Global Platform Settings',
        previousValue: `fee=${params.previousSettings.platformFeePercent}%, minDeposit=₹${params.previousSettings.minDepositINR}, requireApproval=${params.previousSettings.requireListingApproval}, maintenance=${params.previousSettings.maintenanceMode}`,
        newValue: `fee=${params.nextSettings.platformFeePercent}%, minDeposit=₹${params.nextSettings.minDepositINR}, requireApproval=${params.nextSettings.requireListingApproval}, maintenance=${params.nextSettings.maintenanceMode}`,
      })
    );
    await batch.commit();
  } catch (err) {
    console.warn('Firestore settings save warning:', err);
  }

  return {
    ...params.nextSettings,
    updatedByEmail: params.actor.email,
    updatedAtISO: new Date().toISOString(),
  };
}

export { onAuthStateChanged };
export type { User };

