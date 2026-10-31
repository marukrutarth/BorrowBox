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
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  BookingMessageRecord,
  BookingStatus,
  BorrowBoxUserProfile,
  CancellationPolicyType,
  CategoryName,
  DepositStatus,
  IndianCity,
  ItemCondition,
  ProductListing,
  ProfileUpdateInput,
  RentalBookingRecord,
  RentalReviewRecord,
  UserActiveMode,
} from '../types/marketplace';
import { ALL_CITIES, BLUEPRINT_LIMITS } from '../utils/rentalLogic';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;

/**
 * Mandatory initial connection check to Firestore
 */
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

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
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function formatTimestampToISO(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  return new Date().toISOString();
}

function sanitizeCity(city?: string): IndianCity {
  if (city && ALL_CITIES.includes(city as IndianCity)) {
    return city as IndianCity;
  }
  return 'Bengaluru';
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
  const uid = user.uid;
  const publicPath = `users/${uid}`;
  const privatePath = `users/${uid}/private/info`;

  let publicSnap;
  try {
    publicSnap = await getDoc(doc(db, 'users', uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, publicPath);
  }

  let isAdminUser =
    user.email === 'marukrutarth@gmail.com' && user.emailVerified === true;
  if (!isAdminUser) {
    try {
      const adminSnap = await getDoc(doc(db, 'admins', uid));
      isAdminUser = adminSnap.exists();
    } catch {
      isAdminUser = false;
    }
  }

  if (!publicSnap.exists()) {
    const cleanName = sanitizeName(
      defaults?.fullName || user.displayName,
      user.email
    );
    const cleanPhoto = (
      defaults?.photoURL ||
      user.photoURL ||
      ''
    ).slice(0, BLUEPRINT_LIMITS.PHOTO_URL_MAX);
    const cleanCity = sanitizeCity(defaults?.city);
    const cleanNeighborhood = sanitizeNeighborhood(defaults?.neighborhood);
    const cleanEmail = (user.email || 'member@borrowbox.in')
      .trim()
      .slice(0, BLUEPRINT_LIMITS.EMAIL_MAX);
    const cleanPhone = (defaults?.phone || '')
      .trim()
      .slice(0, BLUEPRINT_LIMITS.PHONE_MAX);

    const publicPayload = {
      uid,
      name: cleanName,
      photoURL: cleanPhoto,
      city: cleanCity,
      neighborhood: cleanNeighborhood,
      canRent: true,
      canList: true,
      activeMode: 'renter' as UserActiveMode,
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
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, publicPath);
    }

    const nowISO = new Date().toISOString();
    return {
      uid,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      photoURL: cleanPhoto,
      city: cleanCity,
      neighborhood: cleanNeighborhood,
      canRent: true,
      canList: true,
      activeMode: 'renter',
      createdAtISO: nowISO,
      updatedAtISO: nowISO,
      isAdmin: isAdminUser,
    };
  }

  const pubData = publicSnap.data();
  let privData: Record<string, unknown> | null = null;
  try {
    const privSnap = await getDoc(doc(db, 'users', uid, 'private', 'info'));
    if (privSnap.exists()) {
      privData = privSnap.data();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, privatePath);
  }

  return {
    uid,
    name: String(pubData.name || 'BorrowBox Member'),
    email: String(privData?.email || user.email || ''),
    phone: String(privData?.phone || ''),
    photoURL: String(pubData.photoURL || ''),
    city: sanitizeCity(String(pubData.city || 'Bengaluru')),
    neighborhood: String(pubData.neighborhood || 'Indiranagar'),
    canRent: Boolean(pubData.canRent ?? true),
    canList: Boolean(pubData.canList ?? true),
    activeMode:
      pubData.activeMode === 'owner' ? 'owner' : ('renter' as UserActiveMode),
    createdAtISO: formatTimestampToISO(pubData.createdAt),
    updatedAtISO: formatTimestampToISO(pubData.updatedAt),
    isAdmin: isAdminUser,
  };
}

/**
 * Updates the authenticated user's public and private profile documents in Firestore.
 */
export async function updateUserProfileInFirestore(
  uid: string,
  updates: ProfileUpdateInput
): Promise<void> {
  const publicPath = `users/${uid}`;
  const cleanName = updates.name.trim().slice(0, BLUEPRINT_LIMITS.NAME_MAX);
  const cleanPhoto = updates.photoURL
    .trim()
    .slice(0, BLUEPRINT_LIMITS.PHOTO_URL_MAX);
  const cleanCity = sanitizeCity(updates.city);
  const cleanNeighborhood = updates.neighborhood
    .trim()
    .slice(0, BLUEPRINT_LIMITS.NEIGHBORHOOD_MAX);
  const cleanPhone = updates.phone.trim().slice(0, BLUEPRINT_LIMITS.PHONE_MAX);

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
    handleFirestoreError(error, OperationType.UPDATE, publicPath);
  }
}

function mapDocToProductListing(data: Record<string, unknown>): ProductListing {
  const city = sanitizeCity(String(data.city || 'Bengaluru'));
  const category = (data.category as CategoryName) || 'Electronics';
  const condition = (data.condition as ItemCondition) || 'Excellent';
  const imageUrl = String(data.imageUrl || 'sony_camera');
  const title = String(data.title || 'Community Rental Item');
  const neighborhood = String(data.neighborhood || 'Indiranagar');
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
  const path = 'listings';
  try {
    const q = query(collection(db, 'listings'), where('status', '==', 'active'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapDocToProductListing(d.data()));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Loads all listings (including archived) owned by the authenticated user.
 */
export async function fetchOwnerListings(
  ownerId: string
): Promise<ProductListing[]> {
  const path = 'listings';
  try {
    const q = query(
      collection(db, 'listings'),
      where('ownerId', '==', ownerId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapDocToProductListing(d.data()));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Creates a new community listing in Firestore `/listings/{listing.id}`.
 */
export async function createListingInFirestore(
  listing: ProductListing
): Promise<void> {
  const path = `listings/${listing.id}`;
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
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Updates an existing community listing in Firestore `/listings/{listing.id}`.
 */
export async function updateListingInFirestore(
  listing: ProductListing
): Promise<void> {
  const path = `listings/${listing.id}`;
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
    handleFirestoreError(error, OperationType.UPDATE, path);
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
  const path = 'bookings';
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
    for (const d of borrowerSnap.docs) {
      map.set(d.id, mapDocToBookingRecord(d.data()));
    }
    for (const d of ownerSnap.docs) {
      map.set(d.id, mapDocToBookingRecord(d.data()));
    }
    return Array.from(map.values()).sort((a, b) =>
      b.createdAtISO.localeCompare(a.createdAtISO)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Creates a persistent booking request in Firestore `/bookings/{booking.id}`.
 */
export async function createBookingInFirestore(
  booking: RentalBookingRecord
): Promise<void> {
  const path = `bookings/${booking.id}`;
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
    handleFirestoreError(error, OperationType.CREATE, path);
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
    handleFirestoreError(error, OperationType.UPDATE, path);
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
  const path = `bookings/${bookingId}/messages`;
  try {
    const field = role === 'borrower' ? 'borrowerId' : 'ownerId';
    const q = query(
      collection(db, 'bookings', bookingId, 'messages'),
      where(field, '==', uid)
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => {
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
      })
      .sort((a, b) => a.createdAtISO.localeCompare(b.createdAtISO));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Sends a private message in `/bookings/{bookingId}/messages/{messageId}`.
 */
export async function sendBookingMessageInFirestore(
  message: BookingMessageRecord
): Promise<void> {
  const path = `bookings/${message.bookingId}/messages/${message.id}`;
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
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Fetches verified reviews from `/reviews`.
 */
export async function fetchVerifiedReviewsFromFirestore(): Promise<
  RentalReviewRecord[]
> {
  const path = 'reviews';
  try {
    const q = query(collection(db, 'reviews'), where('rating', '>=', 1));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
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
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Submits a verified review linked to a completed/returned booking in `/reviews/{review.id}`.
 */
export async function createReviewInFirestore(
  review: RentalReviewRecord
): Promise<void> {
  const path = `reviews/${review.id}`;
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
    handleFirestoreError(error, OperationType.CREATE, path);
  }
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
  const credential = await createUserWithEmailAndPassword(
    auth,
    params.email.trim(),
    params.password
  );
  await updateProfile(credential.user, {
    displayName: params.fullName.trim(),
    photoURL: params.photoURL?.trim() || undefined,
  });
  return ensureOrLoadUserProfile(credential.user, {
    fullName: params.fullName,
    phone: params.phone,
    city: params.city,
    neighborhood: params.neighborhood,
    photoURL: params.photoURL,
  });
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<BorrowBoxUserProfile> {
  const credential = await signInWithEmailAndPassword(
    auth,
    email.trim(),
    password
  );
  return ensureOrLoadUserProfile(credential.user);
}

export async function signInWithGooglePopup(): Promise<BorrowBoxUserProfile> {
  const credential = await signInWithPopup(auth, googleProvider);
  return ensureOrLoadUserProfile(credential.user);
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export { onAuthStateChanged };
export type { User };
