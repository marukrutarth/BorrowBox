import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Ban,
  BarChart3,
  Bell,
  BookOpen,
  Box,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  DollarSign,
  Download,
  Eye,
  FileText,
  Filter,
  Flag,
  KeyRound,
  Layers,
  LifeBuoy,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Ticket,
  UserCheck,
  UserPlus,
  UserX,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AdminAuditLogRecord,
  AdminManagedUserRecord,
  AdminPermission,
  AdminRegistryRecord,
  AdminRole,
  AppNotificationItem,
  BorrowBoxUserProfile,
  ListingModerationRecord,
  ListingModerationStatus,
  PlatformReportRecord,
  PlatformSettingsRecord,
  ProductListing,
  RentalBookingRecord,
  RentalReviewRecord,
  ReportCategory,
  ReportSeverity,
  ReportStatus,
  SupportTicketRecord,
  SupportTicketStatus,
} from '../types/marketplace';
import {
  ADMIN_SIDEBAR_SECTIONS,
  ALL_ADMIN_PERMISSIONS,
  AdminSectionId,
  PRIMARY_SUPER_ADMIN_EMAIL,
  ROLE_DEFINITIONS,
  canManageTargetAdmin,
  computeEffectivePermissions,
  getAccessibleAdminSections,
  hasAdminPermission,
  normalizeAdminEmail,
  validateAdminGmail,
} from '../utils/adminRbac';
import {
  DEFAULT_PLATFORM_SETTINGS,
  User,
  adminModerateListingInFirestore,
  adminSavePlatformSettingsInFirestore,
  adminSaveReportInFirestore,
  adminSaveSupportTicketInFirestore,
  adminSetUserModerationInFirestore,
  adminUpsertAdministratorInFirestore,
  fetchAdminDashboardData,
  verifyAndLoadAdminSession,
} from '../services/firebase';
import { ProductImage } from '../components/ProductImage';
import { BORROWBOX_TRANSPARENT_SYMBOL_ASSET_PATH } from '../utils/introAnimation';
import { PageRoute } from '../components/Navbar';
import { AdminTicketsModule } from '../components/support/AdminTicketsModule';
import {
  INDIA_STATES_AND_UTS,
  areCitiesEquivalent,
  getStateForCity,
  getLocalitiesForCity,
  resolveCanonicalCityName,
} from '../data/indiaLocations';
import { ALL_CITIES } from '../utils/rentalLogic';
import {
  markSupportNotificationRead,
  subscribeToAdminSupportTickets,
  subscribeToSupportNotifications,
} from '../services/supportTicketService';

interface AdminDashboardPageProps {
  firebaseUser: User | null;
  userProfile: BorrowBoxUserProfile | null;
  verifiedAdminRecord?: AdminRegistryRecord | null;
  isVerifyingAdminSession?: boolean;
  adminAccessDeniedReason?: string | null;
  allListings: ProductListing[];
  allBookings: RentalBookingRecord[];
  allReviews: RentalReviewRecord[];
  onNavigate: (route: PageRoute) => void;
  onLogout: () => Promise<void>;
  onListingModerationChanged?: (
    listingId: string,
    status: ListingModerationStatus
  ) => void;
}

const SECTION_ICONS: Record<AdminSectionId, React.ReactNode> = {
  overview: <Activity className="w-4 h-4" />,
  users: <Users className="w-4 h-4" />,
  products: <Package className="w-4 h-4" />,
  bookings: <BookOpen className="w-4 h-4" />,
  reports: <Flag className="w-4 h-4" />,
  support: <Ticket className="w-4 h-4" />,
  administrators: <Shield className="w-4 h-4" />,
  analytics: <BarChart3 className="w-4 h-4" />,
  finance: <DollarSign className="w-4 h-4" />,
  audit_logs: <FileText className="w-4 h-4" />,
  settings: <Settings className="w-4 h-4" />,
};

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  firebaseUser,
  userProfile,
  verifiedAdminRecord = null,
  isVerifyingAdminSession = false,
  adminAccessDeniedReason = null,
  allListings,
  allBookings,
  allReviews,
  onNavigate,
  onLogout,
  onListingModerationChanged,
}) => {
  // Authentication & RBAC Session State
  const [isVerifyingAdmin, setIsVerifyingAdmin] = useState(
    isVerifyingAdminSession
  );
  const [adminRecord, setAdminRecord] = useState<AdminRegistryRecord | null>(
    verifiedAdminRecord
  );
  const [accessDeniedReason, setAccessDeniedReason] = useState<string | null>(
    adminAccessDeniedReason
  );

  // Role Preview / RBAC Simulator (available only to verified Super Admins)
  const [simulatedRole, setSimulatedRole] = useState<AdminRole | null>(null);

  // Active Sidebar Module
  const [activeSection, setActiveSection] =
    useState<AdminSectionId>('overview');
  const [selectedSupportTicketId, setSelectedSupportTicketId] = useState<
    string | null
  >(null);
  const [staffNotifications, setStaffNotifications] = useState<
    AppNotificationItem[]
  >([]);
  const [staffNotificationsOpen, setStaffNotificationsOpen] = useState(false);

  // Firestore Administrative Data State
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [users, setUsers] = useState<AdminManagedUserRecord[]>([]);
  const [communityListings, setCommunityListings] = useState<ProductListing[]>(
    []
  );
  const [listingModerationMap, setListingModerationMap] = useState<
    Record<string, ListingModerationRecord>
  >({});
  const [bookings, setBookings] = useState<RentalBookingRecord[]>([]);
  const [reviews, setReviews] = useState<RentalReviewRecord[]>([]);
  const [admins, setAdmins] = useState<AdminRegistryRecord[]>([]);
  const [reports, setReports] = useState<PlatformReportRecord[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicketRecord[]>(
    []
  );
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogRecord[]>([]);
  const [settings, setSettings] = useState<PlatformSettingsRecord>(
    DEFAULT_PLATFORM_SETTINGS
  );

  // UI Feedback Banner
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Module Filters & Search
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<
    'all' | 'active' | 'suspended' | 'deleted'
  >('all');
  const [selectedUserForInspect, setSelectedUserForInspect] =
    useState<AdminManagedUserRecord | null>(null);
  const [userActionModal, setUserActionModal] = useState<{
    user: AdminManagedUserRecord;
    nextStatus: 'active' | 'suspended' | 'deleted';
    reason: string;
  } | null>(null);

  const [productSearch, setProductSearch] = useState('');
  const [productModFilter, setProductModFilter] = useState<
    'all' | ListingModerationStatus
  >('all');
  const [selectedProductForInspect, setSelectedProductForInspect] =
    useState<ProductListing | null>(null);
  const [productModModal, setProductModModal] = useState<{
    listing: ProductListing;
    targetStatus: ListingModerationStatus;
    reason: string;
  } | null>(null);

  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>('all');

  // India-Wide Dynamic Admin Location Filters
  const [adminStateFilter, setAdminStateFilter] = useState<string>('all');
  const [adminCityFilter, setAdminCityFilter] = useState<string>('all');
  const [adminLocalityFilter, setAdminLocalityFilter] = useState<string>('');

  const adminAvailableCities = useMemo(() => {
    if (adminStateFilter === 'all') return ALL_CITIES;
    const st = INDIA_STATES_AND_UTS.find((s) => s.name === adminStateFilter);
    return st ? st.cities : ALL_CITIES;
  }, [adminStateFilter]);

  const [reportFilter, setReportFilter] = useState<'all' | ReportStatus>('all');
  const [isNewReportModalOpen, setIsNewReportModalOpen] = useState(false);
  const [newReportDraft, setNewReportDraft] = useState<{
    targetType: 'listing' | 'user' | 'booking';
    targetId: string;
    targetTitle: string;
    category: ReportCategory;
    severity: ReportSeverity;
    reason: string;
  }>({
    targetType: 'listing',
    targetId: '',
    targetTitle: '',
    category: 'fraud_scam',
    severity: 'high',
    reason: '',
  });

  const [ticketFilter, setTicketFilter] = useState<'all' | SupportTicketStatus>(
    'all'
  );
  const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState(false);
  const [newTicketDraft, setNewTicketDraft] = useState<{
    userName: string;
    userEmail: string;
    bookingId: string;
    subject: string;
    description: string;
  }>({
    userName: '',
    userEmail: '',
    bookingId: '',
    subject: '',
    description: '',
  });

  // Administrator Management Modal State
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [editingAdminRecord, setEditingAdminRecord] =
    useState<AdminRegistryRecord | null>(null);
  const [adminFormEmail, setAdminFormEmail] = useState('');
  const [adminFormName, setAdminFormName] = useState('');
  const [adminFormRole, setAdminFormRole] = useState<AdminRole>('admin');
  const [adminFormStatus, setAdminFormStatus] = useState<
    'active' | 'deactivated'
  >('active');
  const [adminFormCustomPerms, setAdminFormCustomPerms] = useState<
    AdminPermission[]
  >([]);
  const [adminFormRevokedPerms, setAdminFormRevokedPerms] = useState<
    AdminPermission[]
  >([]);

  const [auditSearch, setAuditSearch] = useState('');
  const [auditTargetFilter, setAuditTargetFilter] = useState<string>('all');

  const [settingsDraft, setSettingsDraft] = useState<PlatformSettingsRecord>(
    DEFAULT_PLATFORM_SETTINGS
  );
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const showToast = (
    type: 'success' | 'error' | 'info',
    message: string
  ) => {
    setStatusBanner({ type, message });
    setTimeout(() => {
      setStatusBanner((prev) => (prev?.message === message ? null : prev));
    }, 5500);
  };

  // Load Firestore Admin Snapshot
  const refreshDashboardSnapshot = async () => {
    setIsLoadingData(true);
    try {
      const snap = await fetchAdminDashboardData();
      setUsers(snap.users);
      setCommunityListings(snap.communityListings);
      setListingModerationMap(snap.listingModerationMap);
      setBookings(snap.bookings);
      setReviews(snap.reviews);
      setAdmins(snap.admins);
      setReports(snap.reports);
      setSupportTickets(snap.supportTickets);
      setAuditLogs(snap.auditLogs);
      setSettings(snap.settings);
      setSettingsDraft(snap.settings);
    } catch (err) {
      console.warn('Admin snapshot load warning:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Sync with parent App's verifiedAdminRecord or verify directly if needed
  useEffect(() => {
    let mounted = true;

    if (verifiedAdminRecord) {
      setAdminRecord(verifiedAdminRecord);
      setAccessDeniedReason(null);
      setIsVerifyingAdmin(false);
      void refreshDashboardSnapshot();
      return () => {
        mounted = false;
      };
    }

    if (isVerifyingAdminSession) {
      setIsVerifyingAdmin(true);
      return () => {
        mounted = false;
      };
    }

    const runVerification = async () => {
      if (!firebaseUser) {
        if (mounted) {
          setAdminRecord(null);
          setAccessDeniedReason(
            adminAccessDeniedReason ||
              'Please sign in with your authorised BorrowBox account.'
          );
          setIsVerifyingAdmin(false);
        }
        return;
      }

      setIsVerifyingAdmin(true);
      try {
        const result = await verifyAndLoadAdminSession(firebaseUser);
        if (!mounted) return;
        if (result.authorized && result.adminRecord) {
          setAdminRecord(result.adminRecord);
          setAccessDeniedReason(null);
          await refreshDashboardSnapshot();
        } else {
          setAdminRecord(null);
          setAccessDeniedReason(
            result.reason ||
              'Your account is not registered in the BorrowBox Administrator Registry.'
          );
        }
      } catch (err) {
        if (!mounted) return;
        setAdminRecord(null);
        setAccessDeniedReason(
          err instanceof Error
            ? err.message
            : 'Unable to verify administrator credentials.'
        );
      } finally {
        if (mounted) {
          setIsVerifyingAdmin(false);
        }
      }
    };

    void runVerification();
    return () => {
      mounted = false;
    };
  }, [
    firebaseUser,
    verifiedAdminRecord,
    isVerifyingAdminSession,
    adminAccessDeniedReason,
  ]);

  // Effective Active Admin Identity (Verified Firebase Admin, with optional Super Admin role hierarchy inspector)
  const effectiveAdmin: AdminRegistryRecord | null = useMemo(() => {
    const base = verifiedAdminRecord || adminRecord;
    if (!base || base.status !== 'active') return null;
    if (base.role === 'super_admin' && simulatedRole) {
      return {
        ...base,
        role: simulatedRole,
        customPermissions: [],
        revokedPermissions: [],
      };
    }
    return base;
  }, [verifiedAdminRecord, adminRecord, simulatedRole]);

  const effectivePermissions = useMemo(() => {
    if (!effectiveAdmin) return [];
    return computeEffectivePermissions(
      effectiveAdmin.role,
      effectiveAdmin.customPermissions,
      effectiveAdmin.revokedPermissions
    );
  }, [effectiveAdmin]);

  const accessibleSections = useMemo(
    () => getAccessibleAdminSections(effectiveAdmin),
    [effectiveAdmin]
  );

  // Ensure activeSection is always allowed for the current role
  useEffect(() => {
    if (
      accessibleSections.length > 0 &&
      !accessibleSections.some((s) => s.id === activeSection)
    ) {
      setActiveSection(accessibleSections[0].id);
    }
  }, [accessibleSections, activeSection]);

  // Real-time subscription to support tickets when viewing Support -> Tickets
  useEffect(() => {
    if (!effectiveAdmin || activeSection !== 'support') return;
    const unsubscribe = subscribeToAdminSupportTickets(
      effectiveAdmin.uid,
      (liveTickets) => {
        setSupportTickets(liveTickets);
      }
    );
    return () => {
      unsubscribe();
    };
  }, [effectiveAdmin, activeSection]);

  // Real-time subscription to staff support notifications across all Admin sections
  useEffect(() => {
    if (!effectiveAdmin) return;
    const unsubscribe = subscribeToSupportNotifications(
      { uid: effectiveAdmin.uid, role: 'staff' },
      (notifs) => {
        setStaffNotifications(notifs);
      }
    );
    return () => {
      unsubscribe();
    };
  }, [effectiveAdmin?.uid]);

  // Combined Listings (Firestore Community Listings + Catalog Listings)
  const combinedListings = useMemo(() => {
    const map = new Map<string, ProductListing>();
    for (const item of communityListings) {
      map.set(item.id, item);
    }
    for (const item of allListings) {
      if (!map.has(item.id)) {
        map.set(item.id, item);
      }
    }
    return Array.from(map.values());
  }, [communityListings, allListings]);

  // Combined Bookings
  const combinedBookings = useMemo(() => {
    const map = new Map<string, RentalBookingRecord>();
    for (const b of bookings) {
      map.set(b.id, b);
    }
    for (const b of allBookings) {
      if (!map.has(b.id)) {
        map.set(b.id, b);
      }
    }
    return Array.from(map.values());
  }, [bookings, allBookings]);

  //Combined Users (Real Firestore Users + any current signed-in userProfile if not yet in list)
  const combinedUsers = useMemo(() => {
    const map = new Map<string, AdminManagedUserRecord>();
    for (const u of users) {
      map.set(u.uid, u);
    }
    if (userProfile && !map.has(userProfile.uid)) {
      map.set(userProfile.uid, {
        uid: userProfile.uid,
        name: userProfile.name,
        email: userProfile.email,
        phone: userProfile.phone || 'Not provided',
        photoURL: userProfile.photoURL,
        city: userProfile.city,
        neighborhood: userProfile.neighborhood,
        canRent: userProfile.canRent,
        canList: userProfile.canList,
        activeMode: userProfile.activeMode,
        accountStatus:
          !userProfile.canRent && !userProfile.canList ? 'suspended' : 'active',
        suspensionReason: '',
        createdAtISO: userProfile.createdAtISO,
        updatedAtISO: userProfile.updatedAtISO,
      });
    }
    return Array.from(map.values());
  }, [users, userProfile]);

  const getListingModStatus = (
    listing: ProductListing
  ): ListingModerationStatus => {
    const rec = listingModerationMap[listing.id];
    if (rec) return rec.moderationStatus;
    if (listing.status === 'archived') return 'rejected';
    return listing.isDemoData ? 'approved' : 'pending';
  };

  // Real-time Overview Metrics derived strictly from actual BorrowBox data
  const overviewMetrics = useMemo(() => {
    const totalUsers = combinedUsers.length;
    const activeUsers = combinedUsers.filter(
      (u) => u.accountStatus === 'active'
    ).length;
    const suspendedUsers = combinedUsers.filter(
      (u) => u.accountStatus !== 'active'
    ).length;

    const totalListings = combinedListings.length;
    const pendingListings = combinedListings.filter(
      (l) => getListingModStatus(l) === 'pending'
    ).length;
    const flaggedListings = combinedListings.filter(
      (l) => getListingModStatus(l) === 'flagged'
    ).length;

    const activeRentals = combinedBookings.filter((b) =>
      ['accepted', 'picked_up'].includes(b.status)
    ).length;
    const completedRentals = combinedBookings.filter((b) =>
      ['returned', 'completed'].includes(b.status)
    ).length;
    const totalTransactions = combinedBookings.length;

    const openReports = reports.filter((r) =>
      ['open', 'investigating'].includes(r.status)
    ).length;
    const pendingTickets = supportTickets.filter((t) =>
      ['open', 'in_progress'].includes(t.status)
    ).length;

    const grossRentalValueINR = combinedBookings
      .filter((b) => !['rejected', 'cancelled'].includes(b.status))
      .reduce((acc, b) => acc + (b.netRentalCostINR || 0), 0);

    const platformRevenueINR = Math.round(
      grossRentalValueINR * (settings.platformFeePercent / 100)
    );

    const depositsHeldINR = combinedBookings
      .filter((b) => b.depositStatus === 'held_at_pickup')
      .reduce((acc, b) => acc + (b.refundableDepositINR || 0), 0);

    return {
      totalUsers,
      activeUsers,
      suspendedUsers,
      totalListings,
      pendingListings,
      flaggedListings,
      activeRentals,
      completedRentals,
      totalTransactions,
      openReports: openReports + flaggedListings,
      pendingTickets,
      grossRentalValueINR,
      platformRevenueINR,
      depositsHeldINR,
    };
  }, [
    combinedUsers,
    combinedListings,
    listingModerationMap,
    combinedBookings,
    reports,
    supportTickets,
    settings.platformFeePercent,
  ]);

  // Category distribution for charts
  const categoryBreakdown = useMemo(() => {
    const counts: Record<string, { count: number; avgPrice: number }> = {};
    for (const item of combinedListings) {
      if (!counts[item.category]) {
        counts[item.category] = { count: 0, avgPrice: 0 };
      }
      counts[item.category].count += 1;
      counts[item.category].avgPrice += item.dailyPriceINR;
    }
    return Object.entries(counts)
      .map(([category, info]) => ({
        category,
        count: info.count,
        avgDailyINR: Math.round(info.avgPrice / Math.max(1, info.count)),
        sharePercent: Math.round(
          (info.count / Math.max(1, combinedListings.length)) * 100
        ),
      }))
      .sort((a, b) => b.count - a.count);
  }, [combinedListings]);

  const appendLocalAuditLog = (entry: Omit<AdminAuditLogRecord, 'id' | 'createdAtISO'>) => {
    const newLog: AdminAuditLogRecord = {
      ...entry,
      id: `aud-${Date.now().toString(36)}`,
      createdAtISO: new Date().toISOString(),
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // User Suspension / Reactivation / Restriction
  const handleConfirmUserStatusChange = async () => {
    if (!userActionModal || !effectiveAdmin) return;
    const { user, nextStatus, reason } = userActionModal;

    const requiredPerm: AdminPermission =
      nextStatus === 'deleted' ? 'users.delete' : 'users.suspend';
    if (!hasAdminPermission(effectiveAdmin, requiredPerm)) {
      showToast(
        'error',
        `Permission Denied: Role '${effectiveAdmin.role}' lacks '${requiredPerm}'.`
      );
      return;
    }

    try {
      await adminSetUserModerationInFirestore({
        actor: effectiveAdmin,
        targetUser: user,
        nextStatus,
        reason: reason || `Administrative status set to ${nextStatus}`,
      });

      const enableMarket = nextStatus === 'active';
      setUsers((prev) => {
        const exists = prev.some((u) => u.uid === user.uid);
        const updatedUser: AdminManagedUserRecord = {
          ...user,
          accountStatus: nextStatus,
          canRent: enableMarket,
          canList: enableMarket,
          suspensionReason: reason,
          updatedAtISO: new Date().toISOString(),
        };
        if (exists) {
          return prev.map((u) => (u.uid === user.uid ? updatedUser : u));
        }
        return [updatedUser, ...prev];
      });

      appendLocalAuditLog({
        adminId: effectiveAdmin.uid,
        adminEmail: effectiveAdmin.email,
        adminRole: effectiveAdmin.role,
        action:
          nextStatus === 'active'
            ? 'Reactivated User Account'
            : nextStatus === 'suspended'
            ? 'Suspended User Account'
            : 'Permanently Restricted User Account',
        targetType: 'user',
        targetId: user.uid,
        targetLabel: `${user.name} (${user.email})`,
        previousValue: `status=${user.accountStatus}`,
        newValue: `status=${nextStatus}, reason=${
          reason || 'Administrative review'
        }`,
      });

      setUserActionModal(null);
      showToast(
        'success',
        `User ${user.name} (${user.email}) updated to ${nextStatus.toUpperCase()}.`
      );
    } catch (err) {
      showToast(
        'error',
        err instanceof Error ? err.message : 'Failed to update user status.'
      );
    }
  };

  // Product Listing Approval / Rejection / Flagging
  const handleQuickApproveListing = async (listing: ProductListing) => {
    if (!effectiveAdmin) return;
    if (!hasAdminPermission(effectiveAdmin, 'products.approve')) {
      showToast(
        'error',
        `Permission Denied: Role '${effectiveAdmin.role}' cannot approve listings.`
      );
      return;
    }

    const prevStatus = getListingModStatus(listing);
    try {
      const rec = await adminModerateListingInFirestore({
        actor: effectiveAdmin,
        listing,
        moderationStatus: 'approved',
        reason: 'Approved by BorrowBox moderation team',
        previousModerationStatus: prevStatus,
      });
      setListingModerationMap((prev) => ({ ...prev, [listing.id]: rec }));
      onListingModerationChanged?.(listing.id, 'approved');
      appendLocalAuditLog({
        adminId: effectiveAdmin.uid,
        adminEmail: effectiveAdmin.email,
        adminRole: effectiveAdmin.role,
        action: 'Approved Product Listing',
        targetType: 'product',
        targetId: listing.id,
        targetLabel: `${listing.title} (${listing.city})`,
        previousValue: `moderationStatus=${prevStatus}`,
        newValue: 'moderationStatus=approved',
      });
      showToast('success', `Listing "${listing.title}" approved.`);
    } catch (err) {
      showToast(
        'error',
        err instanceof Error ? err.message : 'Failed to approve listing.'
      );
    }
  };

  const handleConfirmProductModerationModal = async () => {
    if (!productModModal || !effectiveAdmin) return;
    const { listing, targetStatus, reason } = productModModal;
    const prevStatus = getListingModStatus(listing);

    try {
      const rec = await adminModerateListingInFirestore({
        actor: effectiveAdmin,
        listing,
        moderationStatus: targetStatus,
        reason,
        previousModerationStatus: prevStatus,
      });
      setListingModerationMap((prev) => ({ ...prev, [listing.id]: rec }));
      onListingModerationChanged?.(listing.id, targetStatus);
      appendLocalAuditLog({
        adminId: effectiveAdmin.uid,
        adminEmail: effectiveAdmin.email,
        adminRole: effectiveAdmin.role,
        action:
          targetStatus === 'rejected'
            ? 'Rejected Product Listing'
            : 'Flagged Suspicious Listing',
        targetType: 'product',
        targetId: listing.id,
        targetLabel: `${listing.title} (${listing.city})`,
        previousValue: `moderationStatus=${prevStatus}`,
        newValue: `moderationStatus=${targetStatus}, reason=${reason}`,
      });
      setProductModModal(null);
      showToast(
        'success',
        `Listing "${listing.title}" marked as ${targetStatus.toUpperCase()}.`
      );
    } catch (err) {
      showToast(
        'error',
        err instanceof Error ? err.message : 'Moderation action failed.'
      );
    }
  };

  // Administrator Creation & Role/Permission Editing
  const openCreateAdminModal = () => {
    setEditingAdminRecord(null);
    setAdminFormEmail('');
    setAdminFormName('');
    setAdminFormRole('admin');
    setAdminFormStatus('active');
    setAdminFormCustomPerms([]);
    setAdminFormRevokedPerms([]);
    setIsAdminModalOpen(true);
  };

  const openEditAdminModal = (target: AdminRegistryRecord) => {
    setEditingAdminRecord(target);
    setAdminFormEmail(target.email);
    setAdminFormName(target.name);
    setAdminFormRole(target.role);
    setAdminFormStatus(target.status);
    setAdminFormCustomPerms(target.customPermissions || []);
    setAdminFormRevokedPerms(target.revokedPermissions || []);
    setIsAdminModalOpen(true);
  };

  const handleToggleAdminFormPermission = (perm: AdminPermission) => {
    const defaultForRole = ROLE_DEFINITIONS[adminFormRole].defaultPermissions;
    const isDefault = defaultForRole.includes(perm);
    const currentlyEffective = computeEffectivePermissions(
      adminFormRole,
      adminFormCustomPerms,
      adminFormRevokedPerms
    ).includes(perm);

    if (currentlyEffective) {
      // Turn off permission
      if (isDefault) {
        setAdminFormRevokedPerms((prev) =>
          prev.includes(perm) ? prev : [...prev, perm]
        );
      } else {
        setAdminFormCustomPerms((prev) => prev.filter((p) => p !== perm));
      }
    } else {
      // Turn on permission
      if (isDefault) {
        setAdminFormRevokedPerms((prev) => prev.filter((p) => p !== perm));
      } else {
        setAdminFormCustomPerms((prev) =>
          prev.includes(perm) ? prev : [...prev, perm]
        );
      }
    }
  };

  const handleSaveAdministrator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveAdmin) return;

    try {
      const saved = await adminUpsertAdministratorInFirestore({
        actor: effectiveAdmin,
        targetEmail: adminFormEmail,
        targetName: adminFormName,
        role: adminFormRole,
        status: adminFormStatus,
        customPermissions: adminFormCustomPerms,
        revokedPermissions: adminFormRevokedPerms,
        existingRecord: editingAdminRecord,
      });

      setAdmins((prev) => {
        const exists = prev.some((a) => a.email === saved.email);
        if (exists) {
          return prev.map((a) => (a.email === saved.email ? saved : a));
        }
        return [saved, ...prev];
      });

      appendLocalAuditLog({
        adminId: effectiveAdmin.uid,
        adminEmail: effectiveAdmin.email,
        adminRole: effectiveAdmin.role,
        action: editingAdminRecord
          ? `Updated Admin Role/Permissions (${saved.role})`
          : `Added Administrator (${saved.role})`,
        targetType: 'admin',
        targetId: saved.email,
        targetLabel: `${saved.name} <${saved.email}>`,
        previousValue: editingAdminRecord
          ? `role=${editingAdminRecord.role}, status=${editingAdminRecord.status}`
          : 'none',
        newValue: `role=${saved.role}, status=${saved.status}`,
      });

      setIsAdminModalOpen(false);
      showToast(
        'success',
        `Administrator ${saved.email} saved with role ${ROLE_DEFINITIONS[saved.role].label}.`
      );
    } catch (err) {
      showToast(
        'error',
        err instanceof Error ? err.message : 'Failed to save administrator.'
      );
    }
  };

  // Report Creation & Resolution
  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveAdmin) return;
    if (
      !newReportDraft.targetTitle.trim() ||
      newReportDraft.reason.trim().length < 5
    ) {
      showToast(
        'error',
        'Please provide a target title and a reason of at least 5 characters.'
      );
      return;
    }

    const nowISO = new Date().toISOString();
    const report: PlatformReportRecord = {
      id: `rep-${Date.now().toString(36)}`,
      targetType: newReportDraft.targetType,
      targetId:
        newReportDraft.targetId.trim() || `item-${Date.now().toString(36)}`,
      targetTitle: newReportDraft.targetTitle.trim(),
      reporterId: effectiveAdmin.uid,
      reporterName: effectiveAdmin.name,
      reason: newReportDraft.reason.trim(),
      category: newReportDraft.category,
      severity: newReportDraft.severity,
      status: 'open',
      resolutionNote: '',
      assignedAdminEmail: effectiveAdmin.email,
      createdAtISO: nowISO,
      updatedAtISO: nowISO,
    };

    try {
      await adminSaveReportInFirestore({
        actor: effectiveAdmin,
        report,
      });
      setReports((prev) => [report, ...prev]);
      appendLocalAuditLog({
        adminId: effectiveAdmin.uid,
        adminEmail: effectiveAdmin.email,
        adminRole: effectiveAdmin.role,
        action: 'Logged New Trust & Safety Report',
        targetType: 'report',
        targetId: report.id,
        targetLabel: report.targetTitle,
        previousValue: 'none',
        newValue: `severity=${report.severity}, category=${report.category}`,
      });
      setIsNewReportModalOpen(false);
      setNewReportDraft({
        targetType: 'listing',
        targetId: '',
        targetTitle: '',
        category: 'fraud_scam',
        severity: 'high',
        reason: '',
      });
      showToast('success', `Incident report ${report.id} logged.`);
    } catch (err) {
      showToast(
        'error',
        err instanceof Error ? err.message : 'Could not save report.'
      );
    }
  };

  const handleUpdateReportStatus = async (
    report: PlatformReportRecord,
    nextStatus: ReportStatus,
    resolutionNote: string
  ) => {
    if (!effectiveAdmin) return;
    const updated: PlatformReportRecord = {
      ...report,
      status: nextStatus,
      resolutionNote: resolutionNote || report.resolutionNote,
      assignedAdminEmail: effectiveAdmin.email,
      updatedAtISO: new Date().toISOString(),
    };
    try {
      await adminSaveReportInFirestore({
        actor: effectiveAdmin,
        report: updated,
        previousStatus: report.status,
      });
      setReports((prev) =>
        prev.map((r) => (r.id === report.id ? updated : r))
      );
      appendLocalAuditLog({
        adminId: effectiveAdmin.uid,
        adminEmail: effectiveAdmin.email,
        adminRole: effectiveAdmin.role,
        action: `Updated Report Status (${nextStatus.toUpperCase()})`,
        targetType: 'report',
        targetId: report.id,
        targetLabel: report.targetTitle,
        previousValue: `status=${report.status}`,
        newValue: `status=${nextStatus}`,
      });
      showToast('success', `Report ${report.id} marked as ${nextStatus}.`);
    } catch (err) {
      showToast(
        'error',
        err instanceof Error ? err.message : 'Failed to update report.'
      );
    }
  };

  // Support Ticket Creation & Resolution
  const handleCreateSupportTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveAdmin) return;
    if (
      !newTicketDraft.subject.trim() ||
      newTicketDraft.description.trim().length < 5
    ) {
      showToast('error', 'Please enter a ticket subject and description.');
      return;
    }

    const nowISO = new Date().toISOString();
    const ticket: SupportTicketRecord = {
      id: `tkt-${Date.now().toString(36)}`,
      userId: effectiveAdmin.uid,
      userName: newTicketDraft.userName.trim() || 'BorrowBox Customer',
      userEmail: newTicketDraft.userEmail.trim() || 'member@gmail.com',
      bookingId: newTicketDraft.bookingId.trim(),
      subject: newTicketDraft.subject.trim(),
      description: newTicketDraft.description.trim(),
      status: 'open',
      internalNotes: '',
      assignedToEmail: effectiveAdmin.email,
      createdAtISO: nowISO,
      updatedAtISO: nowISO,
    };

    try {
      await adminSaveSupportTicketInFirestore({
        actor: effectiveAdmin,
        ticket,
      });
      setSupportTickets((prev) => [ticket, ...prev]);
      appendLocalAuditLog({
        adminId: effectiveAdmin.uid,
        adminEmail: effectiveAdmin.email,
        adminRole: effectiveAdmin.role,
        action: 'Created Support Ticket',
        targetType: 'support_ticket',
        targetId: ticket.id,
        targetLabel: ticket.subject,
        previousValue: 'none',
        newValue: 'status=open',
      });
      setIsNewTicketModalOpen(false);
      setNewTicketDraft({
        userName: '',
        userEmail: '',
        bookingId: '',
        subject: '',
        description: '',
      });
      showToast('success', `Support ticket ${ticket.id} created.`);
    } catch (err) {
      showToast(
        'error',
        err instanceof Error ? err.message : 'Failed to create ticket.'
      );
    }
  };

  const handleUpdateSupportTicket = async (
    ticket: SupportTicketRecord,
    nextStatus: SupportTicketStatus,
    internalNotes: string
  ) => {
    if (!effectiveAdmin) return;
    const updated: SupportTicketRecord = {
      ...ticket,
      status: nextStatus,
      internalNotes,
      assignedToEmail: effectiveAdmin.email,
      updatedAtISO: new Date().toISOString(),
    };
    try {
      await adminSaveSupportTicketInFirestore({
        actor: effectiveAdmin,
        ticket: updated,
        previousStatus: ticket.status,
      });
      setSupportTickets((prev) =>
        prev.map((t) => (t.id === ticket.id ? updated : t))
      );
      appendLocalAuditLog({
        adminId: effectiveAdmin.uid,
        adminEmail: effectiveAdmin.email,
        adminRole: effectiveAdmin.role,
        action: `Updated Support Ticket (${nextStatus.toUpperCase()})`,
        targetType: 'support_ticket',
        targetId: ticket.id,
        targetLabel: ticket.subject,
        previousValue: `status=${ticket.status}`,
        newValue: `status=${nextStatus}, note=${internalNotes.slice(0, 80)}`,
      });
      showToast('success', `Support ticket ${ticket.id} updated.`);
    } catch (err) {
      showToast(
        'error',
        err instanceof Error ? err.message : 'Failed to update support ticket.'
      );
    }
  };

  // Save Platform Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveAdmin) return;
    setIsSavingSettings(true);
    try {
      const saved = await adminSavePlatformSettingsInFirestore({
        actor: effectiveAdmin,
        previousSettings: settings,
        nextSettings: settingsDraft,
      });
      setSettings(saved);
      setSettingsDraft(saved);
      appendLocalAuditLog({
        adminId: effectiveAdmin.uid,
        adminEmail: effectiveAdmin.email,
        adminRole: effectiveAdmin.role,
        action: 'Updated Platform Configuration Settings',
        targetType: 'settings',
        targetId: 'global',
        targetLabel: 'BorrowBox Global Settings',
        previousValue: `fee=${settings.platformFeePercent}%, minDeposit=₹${settings.minDepositINR}`,
        newValue: `fee=${saved.platformFeePercent}%, minDeposit=₹${saved.minDepositINR}`,
      });
      showToast('success', 'Global platform settings saved and logged.');
    } catch (err) {
      showToast(
        'error',
        err instanceof Error ? err.message : 'Failed to save platform settings.'
      );
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Export Financial Ledger CSV
  const handleExportFinancialCSV = () => {
    const headers = [
      'Booking ID',
      'Listing Title',
      'City',
      'Owner',
      'Borrower',
      'Start Date',
      'End Date',
      'Days',
      'Net Rental INR',
      'Platform Fee INR',
      'Refundable Deposit INR',
      'Booking Status',
      'Deposit Status',
    ];
    const rows = combinedBookings.map((b) => [
      b.id,
      `"${b.listingTitle.replace(/"/g, '""')}"`,
      b.listingCity,
      `"${b.ownerName}"`,
      `"${b.borrowerName}"`,
      b.startDate,
      b.endDate,
      b.days,
      b.netRentalCostINR,
      Math.round(b.netRentalCostINR * (settings.platformFeePercent / 100)),
      b.refundableDepositINR,
      b.status,
      b.depositStatus,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `borrowbox-financial-ledger-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('info', 'Exported BorrowBox Financial Ledger CSV.');
  };

  // ============================================================================
  // VIEW 1: LOADING / VERIFYING ADMIN REGISTRY
  // ============================================================================
  if (isVerifyingAdmin) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-[#F8FAFC] flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 rounded-2xl bg-[#161E2E] border border-white/[0.08] flex items-center justify-center text-[#8B5CF6] mb-4">
          <RefreshCw className="w-5 h-5 animate-spin" />
        </div>
        <h1 className="text-lg font-semibold tracking-tight">
          Verifying BorrowBox Administrator Registry
        </h1>
        <p className="text-xs text-[#94A3B8] mt-1.5">
          Checking Google identity, RBAC hierarchy tier, and assigned permissions...
        </p>
      </div>
    );
  }

  // ============================================================================
  // VIEW 2: ACCESS DENIED SCREEN FOR UNAUTHORISED ACCOUNTS
  // ============================================================================
  if (!effectiveAdmin) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-[#F8FAFC] flex flex-col justify-between p-6 relative overflow-hidden">
        <div className="max-w-[1280px] w-full mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigate({ page: 'home' })}
            className="inline-flex items-center gap-2 text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to BorrowBox Marketplace</span>
          </button>
          <span className="inline-flex items-center gap-2 text-xs font-mono text-[#94A3B8] bg-[#111827] border border-white/[0.08] px-3 py-1.5 rounded-lg">
            <Lock className="w-3.5 h-3.5 text-[#8B5CF6]" />
            <span>RBAC Security Gate · /admin</span>
          </span>
        </div>

        <div className="max-w-lg w-full mx-auto my-12 bg-[#161E2E] border border-white/[0.08] rounded-2xl p-8 shadow-2xl relative z-10">
          <div className="w-12 h-12 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 flex items-center justify-center text-[#EF4444] mb-5">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[#EF4444]">
            HTTP 403 · Administrative Access Denied
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-[#F8FAFC] mt-1">
            Access Denied
          </h1>
          <p className="text-sm text-[#94A3B8] mt-2 leading-relaxed">
            {accessDeniedReason ||
              adminAccessDeniedReason ||
              'Your account does not have administrative permissions in the BorrowBox Administrator Registry (/admins).'}
          </p>

          <div className="mt-5 p-4 rounded-xl bg-[#111827] border border-white/[0.07] space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#94A3B8]">Authenticated Account:</span>
              <span className="font-mono text-[#F8FAFC]">
                {firebaseUser?.email || userProfile?.email || 'Not Signed In'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#94A3B8]">Registry Verification:</span>
              <span className="text-[#EF4444] font-semibold">
                Unauthorised / Not in /admins
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#94A3B8]">Account Access:</span>
              <span className="text-[#22C55E]">
                Standard Borrower & Owner Access Only
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => onNavigate({ page: 'home' })}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to BorrowBox Marketplace</span>
            </button>
            {firebaseUser ? (
              <button
                type="button"
                onClick={() => void onLogout()}
                className="px-4 py-2.5 rounded-xl bg-[#111827] hover:bg-[#1D293B] border border-white/[0.08] text-xs font-semibold text-[#F8FAFC] transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate({ page: 'login' })}
                className="px-4 py-2.5 rounded-xl bg-[#111827] hover:bg-[#1D293B] border border-white/[0.08] text-xs font-semibold text-[#F8FAFC] transition-colors cursor-pointer"
              >
                Sign In to BorrowBox
              </button>
            )}
          </div>
        </div>

        <div className="max-w-[1280px] w-full mx-auto text-center text-xs text-[#94A3B8]">
          BorrowBox Peer-to-Peer Rental Marketplace · Zero-Trust Admin Security
        </div>
      </div>
    );
  }

  // ============================================================================
  // VIEW 3: AUTHORISED ADMIN DASHBOARD CONSOLE
  // ============================================================================
  const currentRoleDef = ROLE_DEFINITIONS[effectiveAdmin.role];

  const filteredUsers = combinedUsers.filter((u) => {
    if (userStatusFilter !== 'all' && u.accountStatus !== userStatusFilter) {
      return false;
    }
    if (adminStateFilter !== 'all') {
      const userState = getStateForCity(u.city);
      if (userState !== adminStateFilter) return false;
    }
    if (adminCityFilter !== 'all' && !areCitiesEquivalent(u.city, adminCityFilter)) {
      return false;
    }
    if (adminLocalityFilter.trim()) {
      const locQ = adminLocalityFilter.trim().toLowerCase();
      if (!u.neighborhood.toLowerCase().includes(locQ)) return false;
    }
    if (userSearch.trim()) {
      const q = userSearch.trim().toLowerCase();
      const canonicalSearchCity = resolveCanonicalCityName(q).toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.city.toLowerCase().includes(q) ||
        (canonicalSearchCity !== q && u.city.toLowerCase().includes(canonicalSearchCity)) ||
        u.neighborhood.toLowerCase().includes(q) ||
        u.uid.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredListings = combinedListings.filter((item) => {
    const modStatus = getListingModStatus(item);
    if (productModFilter !== 'all' && modStatus !== productModFilter) {
      return false;
    }
    if (adminStateFilter !== 'all') {
      const itemState = getStateForCity(item.city);
      if (itemState !== adminStateFilter) return false;
    }
    if (adminCityFilter !== 'all' && !areCitiesEquivalent(item.city, adminCityFilter)) {
      return false;
    }
    if (adminLocalityFilter.trim()) {
      const locQ = adminLocalityFilter.trim().toLowerCase();
      if (!item.neighborhood.toLowerCase().includes(locQ)) return false;
    }
    if (productSearch.trim()) {
      const q = productSearch.trim().toLowerCase();
      const canonicalSearchCity = resolveCanonicalCityName(q).toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.city.toLowerCase().includes(q) ||
        (canonicalSearchCity !== q && item.city.toLowerCase().includes(canonicalSearchCity)) ||
        item.neighborhood.toLowerCase().includes(q) ||
        item.owner.name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredBookings = combinedBookings.filter((b) => {
    if (bookingStatusFilter !== 'all' && b.status !== bookingStatusFilter) {
      return false;
    }
    if (adminStateFilter !== 'all') {
      const bookingState = getStateForCity(b.listingCity);
      if (bookingState !== adminStateFilter) return false;
    }
    if (adminCityFilter !== 'all' && !areCitiesEquivalent(b.listingCity, adminCityFilter)) {
      return false;
    }
    if (bookingSearch.trim()) {
      const q = bookingSearch.trim().toLowerCase();
      const canonicalSearchCity = resolveCanonicalCityName(q).toLowerCase();
      return (
        b.listingTitle.toLowerCase().includes(q) ||
        b.borrowerName.toLowerCase().includes(q) ||
        b.ownerName.toLowerCase().includes(q) ||
        b.listingCity.toLowerCase().includes(q) ||
        (canonicalSearchCity !== q && b.listingCity.toLowerCase().includes(canonicalSearchCity)) ||
        b.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredReports = reports.filter((r) => {
    if (reportFilter !== 'all' && r.status !== reportFilter) return false;
    if (adminStateFilter !== 'all' || adminCityFilter !== 'all') {
      const targetListing = combinedListings.find((l) => l.id === r.targetId);
      if (targetListing) {
        if (adminStateFilter !== 'all' && getStateForCity(targetListing.city) !== adminStateFilter) {
          return false;
        }
        if (adminCityFilter !== 'all' && !areCitiesEquivalent(targetListing.city, adminCityFilter)) {
          return false;
        }
      }
    }
    return true;
  });

  const filteredTickets = supportTickets.filter((t) =>
    ticketFilter === 'all' ? true : t.status === ticketFilter
  );

  const filteredAuditLogs = auditLogs.filter((log) => {
    if (auditTargetFilter !== 'all' && log.targetType !== auditTargetFilter) {
      return false;
    }
    if (auditSearch.trim()) {
      const q = auditSearch.trim().toLowerCase();
      return (
        log.adminEmail.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.targetLabel.toLowerCase().includes(q) ||
        log.targetId.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const renderAdminLocationFilterBar = (itemCountLabel: string) => (
    <div className="p-3.5 rounded-xl bg-[#111827] border border-white/[0.07] flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="font-semibold text-[#06B6D4] flex items-center gap-1.5 shrink-0">
          <MapPin className="w-3.5 h-3.5 text-[#8B5CF6]" />
          <span>Location:</span>
        </span>

        {/* State / UT */}
        <select
          value={adminStateFilter}
          onChange={(e) => {
            const nextState = e.target.value;
            setAdminStateFilter(nextState);
            if (nextState !== 'all') {
              const stateObj = INDIA_STATES_AND_UTS.find(
                (s) => s.name === nextState
              );
              if (
                stateObj &&
                adminCityFilter !== 'all' &&
                !stateObj.cities.includes(adminCityFilter)
              ) {
                setAdminCityFilter('all');
              }
            }
          }}
          className="bg-[#161E2E] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#8B5CF6]"
        >
          <option value="all">All States & UTs ({INDIA_STATES_AND_UTS.length})</option>
          {INDIA_STATES_AND_UTS.map((st) => (
            <option key={st.name} value={st.name}>
              {st.name} ({st.type === 'ut' ? 'UT' : 'State'})
            </option>
          ))}
        </select>

        {/* City */}
        <select
          value={adminCityFilter}
          onChange={(e) => {
            const nextCity = e.target.value;
            setAdminCityFilter(nextCity);
            if (nextCity !== 'all') {
              const parentState = getStateForCity(nextCity);
              if (parentState) setAdminStateFilter(parentState);
            }
          }}
          className="bg-[#161E2E] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#8B5CF6]"
        >
          <option value="all">All Cities ({adminAvailableCities.length})</option>
          {adminAvailableCities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Locality Input with City-Dependent Suggestions */}
        <input
          type="text"
          list="admin-city-localities-list"
          value={adminLocalityFilter}
          onChange={(e) => setAdminLocalityFilter(e.target.value)}
          placeholder="Filter locality..."
          className="bg-[#161E2E] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#8B5CF6] w-36 sm:w-44"
        />
        {adminCityFilter !== 'all' && (
          <datalist id="admin-city-localities-list">
            {getLocalitiesForCity(adminCityFilter).map((loc) => (
              <option key={loc} value={loc} />
            ))}
          </datalist>
        )}

        {(adminStateFilter !== 'all' ||
          adminCityFilter !== 'all' ||
          adminLocalityFilter.trim()) && (
          <button
            type="button"
            onClick={() => {
              setAdminStateFilter('all');
              setAdminCityFilter('all');
              setAdminLocalityFilter('');
            }}
            className="text-[11px] text-[#8B5CF6] hover:underline cursor-pointer flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            <span>Reset Location</span>
          </button>
        )}
      </div>

      <span className="text-[11px] font-mono text-[#94A3B8]">
        {itemCountLabel}
      </span>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B0F19] text-[#F8FAFC] flex flex-col lg:flex-row">
      {/* LEFT SIDEBAR: Permission-Gated Navigation */}
      <aside className="w-full lg:w-64 xl:w-72 bg-[#111827] border-b lg:border-b-0 lg:border-r border-white/[0.08] shrink-0 flex flex-col justify-between">
        <div>
          {/* Brand Header */}
          <div className="h-16 px-5 border-b border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img
                src={BORROWBOX_TRANSPARENT_SYMBOL_ASSET_PATH}
                alt=""
                className="w-9 h-9 object-contain shrink-0 -mx-1"
              />
              <div>
                <div className="text-sm font-bold tracking-tight text-[#F8FAFC] flex items-center gap-1.5">
                  <span>
                    Borrow<span className="text-[#8B5CF6]">Box</span>
                  </span>
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/30">
                    Admin
                  </span>
                </div>
                <p className="text-[10px] text-[#94A3B8] font-mono">
                  RBAC Governance Console
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate({ page: 'home' })}
              title="Back to Storefront"
              className="p-2 rounded-lg bg-[#161E2E] hover:bg-[#1D293B] border border-white/[0.07] text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Logged-In Admin Identity Card */}
          <div className="p-4 border-b border-white/[0.08] bg-[#0B0F19]/40">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold border ${currentRoleDef.badgeColor}`}
              >
                <ShieldCheck className="w-3 h-3" />
                <span>
                  L{currentRoleDef.level} · {currentRoleDef.label}
                </span>
              </span>
              <span className="text-[10px] font-mono text-[#22C55E]">
                ● Verified
              </span>
            </div>
            <div className="text-xs font-semibold text-[#F8FAFC] truncate">
              {effectiveAdmin.name}
            </div>
            <div className="text-[11px] font-mono text-[#94A3B8] truncate">
              {effectiveAdmin.email}
            </div>

            {/* Role Hierarchy Switcher (for Super Admin RBAC verification) */}
            {(verifiedAdminRecord?.role === 'super_admin' ||
              adminRecord?.role === 'super_admin') && (
              <div className="mt-3 pt-3 border-t border-white/[0.07]">
                <label
                  htmlFor="rbac-role-simulator"
                  className="block text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8] mb-1.5"
                >
                  Inspect Hierarchy View:
                </label>
                <select
                  id="rbac-role-simulator"
                  value={effectiveAdmin.role}
                  onChange={(e) => {
                    const nextRole = e.target.value as AdminRole;
                    setSimulatedRole(
                      nextRole === 'super_admin' ? null : nextRole
                    );
                  }}
                  className="w-full bg-[#161E2E] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#8B5CF6]"
                >
                  <option value="super_admin">
                    Level 1: Super Admin (16 perms)
                  </option>
                  <option value="admin">Level 2: Admin (11 perms)</option>
                  <option value="moderator">
                    Level 3: Moderator (6 perms)
                  </option>
                  <option value="support_admin">
                    Level 4: Support Admin (3 perms)
                  </option>
                </select>
              </div>
            )}
          </div>

          {/* Permission-Filtered Navigation Items */}
          <nav
            aria-label="Admin Sidebar Navigation"
            className="p-3 space-y-1 flex lg:flex-col overflow-x-auto lg:overflow-x-visible"
          >
            {accessibleSections.map((section) => {
              const isActive = activeSection === section.id;
              let badgeCount: number | null = null;
              if (section.id === 'products' && overviewMetrics.pendingListings > 0) {
                badgeCount = overviewMetrics.pendingListings;
              } else if (section.id === 'reports' && overviewMetrics.openReports > 0) {
                badgeCount = overviewMetrics.openReports;
              } else if (section.id === 'support' && overviewMetrics.pendingTickets > 0) {
                badgeCount = overviewMetrics.pendingTickets;
              }

              return (
                <React.Fragment key={section.id}>
                  {section.categoryGroup && (
                    <div className="hidden lg:block pt-2.5 pb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                      {section.categoryGroup}
                    </div>
                  )}
                  <button
                    type="button"
                    data-testid={`admin-sidebar-${section.id}`}
                    onClick={() => {
                      setActiveSection(section.id);
                      if (section.id === 'support') {
                        setSelectedSupportTicketId(null);
                      }
                    }}
                    className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all shrink-0 lg:shrink cursor-pointer ${
                      isActive
                        ? 'bg-[#8B5CF6] text-white shadow-md shadow-[#8B5CF6]/20'
                        : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#161E2E]'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 whitespace-nowrap">
                      {SECTION_ICONS[section.id]}
                      <span>{section.label}</span>
                    </span>
                    {badgeCount !== null && (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-[#1D293B] text-[#06B6D4]'
                        }`}
                      >
                        {badgeCount}
                      </span>
                    )}
                  </button>
                </React.Fragment>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="hidden lg:block p-4 border-t border-white/[0.08] space-y-2">
          <div className="text-[11px] text-[#94A3B8] flex items-center justify-between">
            <span>Granted Permissions</span>
            <span className="font-mono text-[#F8FAFC]">
              {effectivePermissions.length} / 16
            </span>
          </div>
          <button
            type="button"
            onClick={async () => {
              setAdminRecord(null);
              setSimulatedRole(null);
              if (firebaseUser) {
                await onLogout();
              }
              onNavigate({ page: 'home' });
            }}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#161E2E] hover:bg-[#1D293B] border border-white/[0.08] text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out of Admin</span>
          </button>
        </div>
      </aside>

      {/* MAIN WORKSPACE */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Command Header */}
        <header className="h-16 px-6 bg-[#111827]/80 backdrop-blur-md border-b border-white/[0.08] flex items-center justify-between gap-4 sticky top-0 z-20">
          <div>
            <h1 className="text-base font-bold text-[#F8FAFC] tracking-tight">
              {
                ADMIN_SIDEBAR_SECTIONS.find((s) => s.id === activeSection)
                  ?.label
              }
            </h1>
            <p className="text-xs text-[#94A3B8] hidden sm:block">
              {
                ADMIN_SIDEBAR_SECTIONS.find((s) => s.id === activeSection)
                  ?.description
              }
            </p>
          </div>

          <div className="flex items-center gap-3">
            {simulatedRole && (
              <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-medium">
                <Eye className="w-3.5 h-3.5" />
                <span>Simulating: {ROLE_DEFINITIONS[simulatedRole].label}</span>
              </span>
            )}

            {/* Admin Support Notifications Bell */}
            <div className="relative">
              <button
                type="button"
                data-testid="admin-header-notifications-bell"
                onClick={() => setStaffNotificationsOpen((prev) => !prev)}
                className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161E2E] hover:bg-[#1D293B] border border-white/[0.08] text-xs font-medium text-[#F8FAFC] transition-colors cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5 text-[#06B6D4]" />
                <span className="hidden sm:inline">Notifications</span>
                {staffNotifications.filter((n) => !n.read).length > 0 && (
                  <span
                    data-testid="admin-header-unread-badge"
                    className="px-1.5 py-0.2 rounded-full bg-[#8B5CF6] text-white text-[10px] font-mono font-bold"
                  >
                    {staffNotifications.filter((n) => !n.read).length}
                  </span>
                )}
              </button>

              {staffNotificationsOpen && (
                <div
                  data-testid="admin-header-notifications-dropdown"
                  className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-[#161E2E] border border-white/[0.08] shadow-2xl p-3 z-50"
                >
                  <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/[0.08]">
                    <span className="text-xs font-bold text-[#F8FAFC]">
                      Staff Ticket Notifications
                    </span>
                    {staffNotifications.some((n) => !n.read) && (
                      <button
                        type="button"
                        onClick={async () => {
                          setStaffNotifications((prev) =>
                            prev.map((n) => ({ ...n, read: true }))
                          );
                          await markSupportNotificationRead({
                            recipientUid: effectiveAdmin.uid,
                            role: 'staff',
                          });
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#06B6D4] hover:underline cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                        <span>Mark all read</span>
                      </button>
                    )}
                  </div>

                  {staffNotifications.length === 0 ? (
                    <div className="py-6 text-center text-xs text-[#94A3B8]">
                      No ticket notifications yet.
                    </div>
                  ) : (
                    <div className="mt-2 max-h-80 overflow-y-auto space-y-1.5">
                      {staffNotifications.slice(0, 12).map((notif) => (
                        <div
                          key={notif.id}
                          data-testid={`admin-header-notif-${notif.id}`}
                          onClick={async () => {
                            setStaffNotificationsOpen(false);
                            setStaffNotifications((prev) =>
                              prev.map((n) =>
                                n.id === notif.id ? { ...n, read: true } : n
                              )
                            );
                            await markSupportNotificationRead({
                              notificationId: notif.id,
                              recipientUid: effectiveAdmin.uid,
                              role: 'staff',
                            });
                            if (notif.ticketId) {
                              setActiveSection('support');
                              setSelectedSupportTicketId(notif.ticketId);
                            }
                          }}
                          className={`p-2.5 rounded-lg border transition-colors cursor-pointer ${
                            notif.read
                              ? 'bg-[#111827]/60 border-white/[0.06] text-[#94A3B8]'
                              : 'bg-[#8B5CF6]/10 border-[#8B5CF6]/35 text-[#F8FAFC]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold truncate">
                              {notif.title}
                            </span>
                            {!notif.read && (
                              <span className="w-2 h-2 rounded-full bg-[#06B6D4] shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-[#CBD5E1] mt-1">
                            {notif.body}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => void refreshDashboardSnapshot()}
              disabled={isLoadingData}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#161E2E] hover:bg-[#1D293B] border border-white/[0.08] text-xs font-medium text-[#F8FAFC] transition-colors cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-[#8B5CF6] ${
                  isLoadingData ? 'animate-spin' : ''
                }`}
              />
              <span>Sync Firestore</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate({ page: 'home' })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161E2E] hover:bg-[#1D293B] border border-white/[0.08] text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
            >
              <span>Storefront</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Status Toast Banner */}
        <AnimatePresence>
          {statusBanner && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={`mx-6 mt-4 p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between ${
                statusBanner.type === 'success'
                  ? 'bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E]'
                  : statusBanner.type === 'error'
                  ? 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]'
                  : 'bg-[#06B6D4]/10 border-[#06B6D4]/30 text-[#06B6D4]'
              }`}
            >
              <span>{statusBanner.message}</span>
              <button
                type="button"
                onClick={() => setStatusBanner(null)}
                className="p-1 hover:opacity-75 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active Module Content */}
        <div className="p-6 space-y-6 max-w-[1440px]">
          {/* ================================================================
              MODULE 1: OVERVIEW
             ================================================================ */}
          {activeSection === 'overview' && (
            <div className="space-y-6">
              {/* 9 Real-Time KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                <div className="p-4 rounded-xl bg-[#161E2E] border border-white/[0.08]">
                  <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                    <span>Registered Users</span>
                    <Users className="w-4 h-4 text-[#8B5CF6]" />
                  </div>
                  <div className="text-2xl font-bold font-mono text-[#F8FAFC] mt-2">
                    {overviewMetrics.totalUsers}
                  </div>
                  <div className="text-[11px] text-[#22C55E] mt-1">
                    {overviewMetrics.activeUsers} active ·{' '}
                    {overviewMetrics.suspendedUsers} restricted
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#161E2E] border border-white/[0.08]">
                  <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                    <span>Product Listings</span>
                    <Package className="w-4 h-4 text-[#06B6D4]" />
                  </div>
                  <div className="text-2xl font-bold font-mono text-[#F8FAFC] mt-2">
                    {overviewMetrics.totalListings}
                  </div>
                  <div className="text-[11px] text-[#94A3B8] mt-1">
                    {communityListings.length} community ·{' '}
                    {overviewMetrics.pendingListings} pending approval
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#161E2E] border border-white/[0.08]">
                  <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                    <span>Active & Completed Rentals</span>
                    <BookOpen className="w-4 h-4 text-[#22C55E]" />
                  </div>
                  <div className="text-2xl font-bold font-mono text-[#F8FAFC] mt-2">
                    {overviewMetrics.activeRentals} /{' '}
                    {overviewMetrics.completedRentals}
                  </div>
                  <div className="text-[11px] text-[#94A3B8] mt-1">
                    {overviewMetrics.totalTransactions} total rental
                    transactions
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#161E2E] border border-white/[0.08]">
                  <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                    <span>Reported Listings & Flags</span>
                    <Flag className="w-4 h-4 text-[#F59E0B]" />
                  </div>
                  <div className="text-2xl font-bold font-mono text-[#F8FAFC] mt-2">
                    {overviewMetrics.openReports}
                  </div>
                  <div className="text-[11px] text-[#F59E0B] mt-1">
                    {overviewMetrics.flaggedListings} flagged listings
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#161E2E] border border-white/[0.08]">
                  <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                    <span>Pending Support Tickets</span>
                    <LifeBuoy className="w-4 h-4 text-[#8B5CF6]" />
                  </div>
                  <div className="text-2xl font-bold font-mono text-[#F8FAFC] mt-2">
                    {overviewMetrics.pendingTickets}
                  </div>
                  <div className="text-[11px] text-[#94A3B8] mt-1">
                    {supportTickets.length} total support threads
                  </div>
                </div>
              </div>

              {/* Charts Row: User Growth & Rental Activity + Popular Categories */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* User Growth & Rental Activity Chart */}
                <div className="lg:col-span-2 p-5 rounded-2xl bg-[#161E2E] border border-white/[0.08] space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-[#F8FAFC]">
                        Platform Telemetry: User Growth & Rental Activity
                      </h2>
                      <p className="text-xs text-[#94A3B8]">
                        Live Firestore entity distribution across users,
                        listings, bookings, and reviews
                      </p>
                    </div>
                    <span className="text-xs font-mono text-[#06B6D4] bg-[#06B6D4]/10 border border-[#06B6D4]/25 px-2.5 py-1 rounded-lg">
                      Live Firestore Sync
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    {[
                      {
                        label: 'Active Users',
                        value: overviewMetrics.activeUsers,
                        max: Math.max(10, overviewMetrics.totalUsers),
                        color: 'bg-[#8B5CF6]',
                      },
                      {
                        label: 'Total Listings',
                        value: overviewMetrics.totalListings,
                        max: Math.max(20, overviewMetrics.totalListings),
                        color: 'bg-[#06B6D4]',
                      },
                      {
                        label: 'Rental Bookings',
                        value: overviewMetrics.totalTransactions,
                        max: Math.max(10, overviewMetrics.totalTransactions),
                        color: 'bg-[#22C55E]',
                      },
                      {
                        label: 'Verified Reviews',
                        value: allReviews.length + reviews.length,
                        max: Math.max(10, allReviews.length + reviews.length),
                        color: 'bg-[#F59E0B]',
                      },
                    ].map((bar) => {
                      const pct = Math.min(
                        100,
                        Math.max(12, Math.round((bar.value / bar.max) * 100))
                      );
                      return (
                        <div
                          key={bar.label}
                          className="p-3.5 rounded-xl bg-[#111827] border border-white/[0.06] flex flex-col justify-between"
                        >
                          <div className="text-[11px] text-[#94A3B8]">
                            {bar.label}
                          </div>
                          <div className="text-xl font-bold font-mono text-[#F8FAFC] my-2">
                            {bar.value}
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                            <div
                              className={`h-full rounded-full ${bar.color}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pending Administrative Actions Queue */}
                  <div className="pt-3 border-t border-white/[0.07]">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8] mb-3">
                      Pending Administrative Actions Queue
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {hasAdminPermission(effectiveAdmin, 'products.view') && (
                        <button
                          type="button"
                          onClick={() => setActiveSection('products')}
                          className="p-3.5 rounded-xl bg-[#111827] hover:bg-[#1D293B] border border-white/[0.07] text-left transition-colors cursor-pointer"
                        >
                          <div className="flex items-center justify-between text-xs font-semibold text-[#F8FAFC]">
                            <span>Listing Approvals</span>
                            <span className="font-mono text-[#F59E0B]">
                              {overviewMetrics.pendingListings}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#94A3B8] mt-1">
                            Review pending or flagged products →
                          </p>
                        </button>
                      )}

                      {hasAdminPermission(effectiveAdmin, 'reports.manage') && (
                        <button
                          type="button"
                          onClick={() => setActiveSection('reports')}
                          className="p-3.5 rounded-xl bg-[#111827] hover:bg-[#1D293B] border border-white/[0.07] text-left transition-colors cursor-pointer"
                        >
                          <div className="flex items-center justify-between text-xs font-semibold text-[#F8FAFC]">
                            <span>Open Safety Reports</span>
                            <span className="font-mono text-[#EF4444]">
                              {overviewMetrics.openReports}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#94A3B8] mt-1">
                            Investigate reported items & users →
                          </p>
                        </button>
                      )}

                      {hasAdminPermission(effectiveAdmin, 'support.manage') && (
                        <button
                          type="button"
                          onClick={() => setActiveSection('support')}
                          className="p-3.5 rounded-xl bg-[#111827] hover:bg-[#1D293B] border border-white/[0.07] text-left transition-colors cursor-pointer"
                        >
                          <div className="flex items-center justify-between text-xs font-semibold text-[#F8FAFC]">
                            <span>Support Escalations</span>
                            <span className="font-mono text-[#06B6D4]">
                              {overviewMetrics.pendingTickets}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#94A3B8] mt-1">
                            Resolve open borrower/owner tickets →
                          </p>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Popular Product Categories */}
                <div className="p-5 rounded-2xl bg-[#161E2E] border border-white/[0.08] space-y-4">
                  <div>
                    <h2 className="text-sm font-bold text-[#F8FAFC]">
                      Popular Product Categories
                    </h2>
                    <p className="text-xs text-[#94A3B8]">
                      Inventory share and average daily rate (₹)
                    </p>
                  </div>
                  <div className="space-y-3">
                    {categoryBreakdown.slice(0, 6).map((cat) => (
                      <div key={cat.category} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-[#F8FAFC]">
                            {cat.category}
                          </span>
                          <span className="font-mono text-[#94A3B8]">
                            {cat.count} items · ₹{cat.avgDailyINR}/day
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#8B5CF6]"
                            style={{ width: `${Math.max(8, cat.sharePercent)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Platform Activities */}
              <div className="p-5 rounded-2xl bg-[#161E2E] border border-white/[0.08] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-[#F8FAFC]">
                      Recent Platform & Administrative Activity
                    </h2>
                    <p className="text-xs text-[#94A3B8]">
                      Real-time feed of administrative actions and marketplace
                      events
                    </p>
                  </div>
                  {hasAdminPermission(effectiveAdmin, 'audit_logs.view') && (
                    <button
                      type="button"
                      onClick={() => setActiveSection('audit_logs')}
                      className="text-xs font-semibold text-[#8B5CF6] hover:underline cursor-pointer"
                    >
                      View Immutable Audit Trail →
                    </button>
                  )}
                </div>

                {auditLogs.length === 0 && combinedBookings.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#94A3B8] bg-[#111827] rounded-xl border border-white/[0.06]">
                    No administrative events recorded yet in this session.
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.06]">
                    {auditLogs.slice(0, 6).map((log) => (
                      <div
                        key={log.id}
                        className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-2 h-2 rounded-full bg-[#8B5CF6] shrink-0" />
                          <div>
                            <span className="font-semibold text-[#F8FAFC]">
                              {log.action}
                            </span>{' '}
                            <span className="text-[#94A3B8]">on</span>{' '}
                            <span className="font-mono text-[#06B6D4]">
                              {log.targetLabel}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] font-mono text-[#94A3B8]">
                          <span>{log.adminEmail}</span>
                          <span>·</span>
                          <span>{log.createdAtISO.slice(0, 16).replace('T', ' ')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================================
              MODULE 2: USER MANAGEMENT
             ================================================================ */}
          {activeSection === 'users' &&
            hasAdminPermission(effectiveAdmin, 'users.view') && (
              <div className="space-y-5">
                {/* Search & Status Filters */}
                <div className="p-4 rounded-2xl bg-[#161E2E] border border-white/[0.08] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="search"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search users by name, Gmail, city, or UID..."
                      className="w-full pl-9 pr-4 py-2 bg-[#111827] border border-white/[0.08] rounded-xl text-xs text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#8B5CF6]"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    {(['all', 'active', 'suspended'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setUserStatusFilter(st)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors cursor-pointer ${
                          userStatusFilter === st
                            ? 'bg-[#8B5CF6] text-white'
                            : 'bg-[#111827] text-[#94A3B8] hover:text-[#F8FAFC] border border-white/[0.07]'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {renderAdminLocationFilterBar(
                  `Showing ${filteredUsers.length} of ${combinedUsers.length} users`
                )}

                {/* Users Table */}
                <div className="rounded-2xl bg-[#161E2E] border border-white/[0.08] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/[0.08] bg-[#111827] text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                          <th className="py-3.5 px-4">User Identity</th>
                          <th className="py-3.5 px-4">Location</th>
                          <th className="py-3.5 px-4">Capabilities</th>
                          <th className="py-3.5 px-4">Status</th>
                          <th className="py-3.5 px-4">Registered</th>
                          <th className="py-3.5 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.06] text-xs">
                        {filteredUsers.length === 0 ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="py-8 text-center text-[#94A3B8]"
                            >
                              No registered users match the current filter.
                            </td>
                          </tr>
                        ) : (
                          filteredUsers.map((u) => (
                            <tr
                              key={u.uid}
                              className="hover:bg-white/[0.02] transition-colors"
                            >
                              <td className="py-3.5 px-4">
                                <div className="font-semibold text-[#F8FAFC]">
                                  {u.name}
                                </div>
                                <div className="text-[11px] font-mono text-[#94A3B8]">
                                  {u.email}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-[#94A3B8]">
                                {u.neighborhood}, {u.city}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="font-mono text-[11px] text-[#06B6D4]">
                                  {u.canRent ? 'Renter' : 'No-Rent'} ·{' '}
                                  {u.canList ? 'Owner' : 'No-List'}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                                    u.accountStatus === 'active'
                                      ? 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30'
                                      : 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30'
                                  }`}
                                >
                                  {u.accountStatus.toUpperCase()}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 font-mono text-[11px] text-[#94A3B8]">
                                {u.createdAtISO.slice(0, 10)}
                              </td>
                              <td className="py-3.5 px-4 text-right space-x-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedUserForInspect(u)}
                                  className="px-2.5 py-1 rounded-lg bg-[#111827] hover:bg-[#1D293B] border border-white/[0.08] text-[#F8FAFC] text-xs font-medium cursor-pointer"
                                >
                                  Inspect
                                </button>
                                {hasAdminPermission(
                                  effectiveAdmin,
                                  'users.suspend'
                                ) && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setUserActionModal({
                                        user: u,
                                        nextStatus:
                                          u.accountStatus === 'active'
                                            ? 'suspended'
                                            : 'active',
                                        reason: '',
                                      })
                                    }
                                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                                      u.accountStatus === 'active'
                                        ? 'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30 hover:bg-[#F59E0B]/25'
                                        : 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30 hover:bg-[#22C55E]/25'
                                    }`}
                                  >
                                    {u.accountStatus === 'active'
                                      ? 'Suspend'
                                      : 'Reactivate'}
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

          {/* ================================================================
              MODULE 3: PRODUCT LISTING MANAGEMENT
             ================================================================ */}
          {activeSection === 'products' &&
            hasAdminPermission(effectiveAdmin, 'products.view') && (
              <div className="space-y-5">
                <div className="p-4 rounded-2xl bg-[#161E2E] border border-white/[0.08] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="search"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Search listings by title, category, city, or owner..."
                      className="w-full pl-9 pr-4 py-2 bg-[#111827] border border-white/[0.08] rounded-xl text-xs text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#8B5CF6]"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {(
                      [
                        'all',
                        'pending',
                        'approved',
                        'rejected',
                        'flagged',
                      ] as const
                    ).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setProductModFilter(st)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors cursor-pointer ${
                          productModFilter === st
                            ? 'bg-[#8B5CF6] text-white'
                            : 'bg-[#111827] text-[#94A3B8] hover:text-[#F8FAFC] border border-white/[0.07]'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {renderAdminLocationFilterBar(
                  `Showing ${filteredListings.length} of ${combinedListings.length} listings`
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredListings.map((item) => {
                    const modStatus = getListingModStatus(item);
                    const modRecord = listingModerationMap[item.id];

                    return (
                      <div
                        key={item.id}
                        className="rounded-2xl bg-[#161E2E] border border-white/[0.08] overflow-hidden flex flex-col justify-between"
                      >
                        <div>
                          <div className="h-44 bg-[#111827] relative overflow-hidden">
                            <ProductImage
                              srcKeyOrUrl={item.imageUrl}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2">
                              <span className="px-2.5 py-1 rounded-md bg-[#0B0F19]/90 backdrop-blur-md border border-white/[0.1] text-[10px] font-semibold text-[#F8FAFC]">
                                {item.category}
                              </span>
                              <span
                                className={`px-2.5 py-1 rounded-md bg-[#0B0F19]/90 backdrop-blur-md text-[10px] font-bold uppercase ${
                                  modStatus === 'approved'
                                    ? 'text-[#22C55E] border border-[#22C55E]/50'
                                    : modStatus === 'rejected'
                                    ? 'text-[#EF4444] border border-[#EF4444]/50'
                                    : modStatus === 'flagged'
                                    ? 'text-[#F59E0B] border border-[#F59E0B]/50'
                                    : 'text-purple-300 border border-[#8B5CF6]/50'
                                }`}
                              >
                                {modStatus}
                              </span>
                            </div>
                          </div>

                          <div className="p-4 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="text-sm font-bold text-[#F8FAFC] line-clamp-1">
                                {item.title}
                              </h3>
                              <span className="font-mono text-xs font-bold text-[#06B6D4] shrink-0">
                                ₹{item.dailyPriceINR}/day
                              </span>
                            </div>

                            <div className="text-xs text-[#94A3B8] flex items-center justify-between">
                              <span>
                                Owner: <strong className="text-[#F8FAFC]">{item.owner.name}</strong>
                              </span>
                              <span>
                                {item.neighborhood}, {item.city}
                              </span>
                            </div>

                            <div className="text-[11px] font-mono text-[#94A3B8]">
                              Deposit: ₹{item.refundableDepositINR.toLocaleString('en-IN')} · Condition: {item.condition}
                            </div>

                            {modRecord?.reason && (
                              <div className="p-2.5 rounded-lg bg-[#111827] border border-white/[0.06] text-[11px] text-[#94A3B8]">
                                <span className="font-semibold text-[#F8FAFC]">
                                  Moderation Note:
                                </span>{' '}
                                {modRecord.reason}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="p-4 pt-3 border-t border-white/[0.07] flex flex-wrap items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedProductForInspect(item)}
                            className="px-2.5 py-1.5 rounded-lg bg-[#111827] hover:bg-[#1D293B] border border-white/[0.08] text-xs font-medium text-[#F8FAFC] cursor-pointer"
                          >
                            Photos & Owner
                          </button>

                          <div className="flex items-center gap-1.5">
                            {hasAdminPermission(
                              effectiveAdmin,
                              'products.approve'
                            ) &&
                              modStatus !== 'approved' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleQuickApproveListing(item)
                                  }
                                  className="px-2.5 py-1.5 rounded-lg bg-[#22C55E]/15 hover:bg-[#22C55E]/25 border border-[#22C55E]/30 text-[#22C55E] text-xs font-semibold cursor-pointer"
                                >
                                  Approve
                                </button>
                              )}

                            {hasAdminPermission(
                              effectiveAdmin,
                              'products.reject'
                            ) && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setProductModModal({
                                      listing: item,
                                      targetStatus: 'rejected',
                                      reason: '',
                                    })
                                  }
                                  className="px-2.5 py-1.5 rounded-lg bg-[#EF4444]/15 hover:bg-[#EF4444]/25 border border-[#EF4444]/30 text-[#EF4444] text-xs font-semibold cursor-pointer"
                                >
                                  Reject
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setProductModModal({
                                      listing: item,
                                      targetStatus: 'flagged',
                                      reason: '',
                                    })
                                  }
                                  className="px-2.5 py-1.5 rounded-lg bg-[#F59E0B]/15 hover:bg-[#F59E0B]/25 border border-[#F59E0B]/30 text-[#F59E0B] text-xs font-semibold cursor-pointer"
                                >
                                  Flag
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          {/* ================================================================
              MODULE 4: RENTAL BOOKINGS LEDGER
             ================================================================ */}
          {activeSection === 'bookings' &&
            hasAdminPermission(effectiveAdmin, 'bookings.view') && (
              <div className="space-y-5">
                <div className="p-4 rounded-2xl bg-[#161E2E] border border-white/[0.08] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="search"
                      value={bookingSearch}
                      onChange={(e) => setBookingSearch(e.target.value)}
                      placeholder="Search bookings by item, borrower, owner, or ID..."
                      className="w-full pl-9 pr-4 py-2 bg-[#111827] border border-white/[0.08] rounded-xl text-xs text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#8B5CF6]"
                    />
                  </div>
                  <select
                    value={bookingStatusFilter}
                    onChange={(e) => setBookingStatusFilter(e.target.value)}
                    className="bg-[#111827] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-[#F8FAFC]"
                  >
                    <option value="all">All Booking Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="accepted">Accepted</option>
                    <option value="picked_up">Picked Up</option>
                    <option value="returned">Returned</option>
                    <option value="completed">Completed</option>
                    <option value="disputed">Disputed</option>
                  </select>
                </div>

                {renderAdminLocationFilterBar(
                  `Showing ${filteredBookings.length} of ${combinedBookings.length} bookings`
                )}

                <div className="rounded-2xl bg-[#161E2E] border border-white/[0.08] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/[0.08] bg-[#111827] text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                          <th className="py-3.5 px-4">Booking ID & Item</th>
                          <th className="py-3.5 px-4">Borrower → Owner</th>
                          <th className="py-3.5 px-4">Rental Window</th>
                          <th className="py-3.5 px-4">Rental / Deposit</th>
                          <th className="py-3.5 px-4">Status</th>
                          <th className="py-3.5 px-4">Handover QR Code</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.06] text-xs">
                        {filteredBookings.length === 0 ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="py-8 text-center text-[#94A3B8]"
                            >
                              No rental bookings recorded matching your filter.
                            </td>
                          </tr>
                        ) : (
                          filteredBookings.map((b) => (
                            <tr key={b.id} className="hover:bg-white/[0.02]">
                              <td className="py-3.5 px-4">
                                <div className="font-semibold text-[#F8FAFC]">
                                  {b.listingTitle}
                                </div>
                                <div className="text-[11px] font-mono text-[#94A3B8]">
                                  {b.id} · {b.listingCity}
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="text-[#F8FAFC]">
                                  {b.borrowerName}
                                </span>{' '}
                                <span className="text-[#94A3B8]">→</span>{' '}
                                <span className="text-[#06B6D4]">
                                  {b.ownerName}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 font-mono text-[11px] text-[#94A3B8]">
                                {b.startDate} to {b.endDate} ({b.days}d)
                              </td>
                              <td className="py-3.5 px-4 font-mono">
                                <span className="text-[#F8FAFC] font-semibold">
                                  ₹{b.netRentalCostINR.toLocaleString('en-IN')}
                                </span>{' '}
                                <span className="text-[#94A3B8]">
                                  (+₹{b.refundableDepositINR.toLocaleString('en-IN')} dep)
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="px-2 py-0.5 rounded bg-[#111827] border border-white/[0.08] font-mono text-[11px] uppercase text-[#F8FAFC]">
                                  {b.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 font-mono text-[11px] text-[#8B5CF6]">
                                {b.handoverCode}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

          {/* ================================================================
              MODULE 5: REPORTS & COMPLAINTS
             ================================================================ */}
          {activeSection === 'reports' &&
            hasAdminPermission(effectiveAdmin, 'reports.manage') && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#161E2E] border border-white/[0.08]">
                  <div className="flex items-center gap-2">
                    {(
                      ['all', 'open', 'investigating', 'resolved', 'dismissed'] as const
                    ).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setReportFilter(st)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize cursor-pointer ${
                          reportFilter === st
                            ? 'bg-[#8B5CF6] text-white'
                            : 'bg-[#111827] text-[#94A3B8] hover:text-[#F8FAFC] border border-white/[0.07]'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsNewReportModalOpen(true)}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Log Trust & Safety Report</span>
                  </button>
                </div>

                {renderAdminLocationFilterBar(
                  `Showing ${filteredReports.length} of ${reports.length} reports`
                )}

                {filteredReports.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-[#161E2E] border border-white/[0.08] text-center space-y-2">
                    <Flag className="w-6 h-6 text-[#94A3B8] mx-auto" />
                    <div className="text-sm font-semibold text-[#F8FAFC]">
                      No Open Reports in Queue
                    </div>
                    <p className="text-xs text-[#94A3B8]">
                      Use "Log Trust & Safety Report" above to record and track
                      any reported user, listing, or dispute.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredReports.map((rep) => (
                      <div
                        key={rep.id}
                        className="p-4 rounded-2xl bg-[#161E2E] border border-white/[0.08] flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30">
                              {rep.severity}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#111827] text-[#94A3B8] border border-white/[0.07]">
                              {rep.targetType} · {rep.category}
                            </span>
                            <span className="text-xs font-mono text-[#06B6D4]">
                              {rep.id}
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-[#F8FAFC]">
                            {rep.targetTitle}
                          </h3>
                          <p className="text-xs text-[#94A3B8]">{rep.reason}</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              void handleUpdateReportStatus(
                                rep,
                                'investigating',
                                'Under active moderation review'
                              )
                            }
                            className="px-3 py-1.5 rounded-lg bg-[#111827] hover:bg-[#1D293B] border border-white/[0.08] text-xs font-medium text-[#F8FAFC] cursor-pointer"
                          >
                            Investigate
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void handleUpdateReportStatus(
                                rep,
                                'resolved',
                                'Verified and resolved by moderation team'
                              )
                            }
                            className="px-3 py-1.5 rounded-lg bg-[#22C55E]/15 hover:bg-[#22C55E]/25 border border-[#22C55E]/30 text-[#22C55E] text-xs font-semibold cursor-pointer"
                          >
                            Resolve
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void handleUpdateReportStatus(
                                rep,
                                'dismissed',
                                'Dismissed after inspection'
                              )
                            }
                            className="px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-[#94A3B8] text-xs font-medium cursor-pointer"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          {/* ================================================================
              MODULE 6: SUPPORT TICKETS (Support -> Tickets)
             ================================================================ */}
          {activeSection === 'support' &&
            hasAdminPermission(effectiveAdmin, 'support.manage') && (
              <div className="dark">
                <AdminTicketsModule
                  currentAdmin={effectiveAdmin}
                  tickets={supportTickets}
                  admins={admins}
                  users={combinedUsers}
                  selectedTicketIdFromParent={selectedSupportTicketId}
                  onClearSelectedTicket={() => setSelectedSupportTicketId(null)}
                  onTicketUpdated={(updatedTicket, auditLog) => {
                    setSupportTickets((prev) => {
                      const exists = prev.some((t) => t.id === updatedTicket.id);
                      if (exists) {
                        return prev.map((t) =>
                          t.id === updatedTicket.id ? updatedTicket : t
                        );
                      }
                      return [updatedTicket, ...prev];
                    });
                    if (auditLog) {
                      setAuditLogs((prev) => [auditLog, ...prev]);
                    }
                  }}
                  onNotify={(message, tone = 'success') => {
                    showToast(tone, message);
                  }}
                />
              </div>
            )}

          {/* ================================================================
              MODULE 7: ADMINISTRATOR REGISTRY & RBAC HIERARCHY
             ================================================================ */}
          {activeSection === 'administrators' &&
            hasAdminPermission(effectiveAdmin, 'admins.view') && (
              <div className="space-y-6">
                <div className="p-5 rounded-2xl bg-[#161E2E] border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-bold text-[#F8FAFC]">
                      Authorised Gmail Administrator Registry (/admins)
                    </h2>
                    <p className="text-xs text-[#94A3B8] mt-0.5">
                      Only Super Admins can invite new administrators, assign
                      hierarchy roles, or modify granular permissions.
                    </p>
                  </div>

                  {hasAdminPermission(effectiveAdmin, 'admins.create') && (
                    <button
                      type="button"
                      onClick={openCreateAdminModal}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold cursor-pointer shadow-lg shadow-[#8B5CF6]/20 shrink-0"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>+ Add Administrator by Gmail</span>
                    </button>
                  )}
                </div>

                {/* 4-Level Hierarchy Reference Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {(
                    [
                      'super_admin',
                      'admin',
                      'moderator',
                      'support_admin',
                    ] as AdminRole[]
                  ).map((r) => {
                    const def = ROLE_DEFINITIONS[r];
                    return (
                      <div
                        key={r}
                        className="p-4 rounded-xl bg-[#161E2E] border border-white/[0.08] space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${def.badgeColor}`}
                          >
                            LEVEL {def.level} · {def.label.toUpperCase()}
                          </span>
                          <span className="font-mono text-xs text-[#94A3B8]">
                            {def.defaultPermissions.length} perms
                          </span>
                        </div>
                        <p className="text-xs text-[#94A3B8] leading-relaxed">
                          {def.description}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Administrators Registry Table */}
                <div className="rounded-2xl bg-[#161E2E] border border-white/[0.08] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/[0.08] bg-[#111827] text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                          <th className="py-3.5 px-4">Administrator</th>
                          <th className="py-3.5 px-4">Hierarchy Role</th>
                          <th className="py-3.5 px-4">Effective Permissions</th>
                          <th className="py-3.5 px-4">Status</th>
                          <th className="py-3.5 px-4">Last Login</th>
                          <th className="py-3.5 px-4 text-right">Manage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.06] text-xs">
                        {admins.map((adm) => {
                          const rDef = ROLE_DEFINITIONS[adm.role];
                          const effPerms = computeEffectivePermissions(
                            adm.role,
                            adm.customPermissions,
                            adm.revokedPermissions
                          );
                          const isPrimary =
                            adm.email === PRIMARY_SUPER_ADMIN_EMAIL;

                          return (
                            <tr key={adm.id} className="hover:bg-white/[0.02]">
                              <td className="py-3.5 px-4">
                                <div className="font-semibold text-[#F8FAFC] flex items-center gap-1.5">
                                  <span>{adm.name}</span>
                                  {isPrimary && (
                                    <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-mono">
                                      ROOT
                                    </span>
                                  )}
                                </div>
                                <div className="font-mono text-[11px] text-[#94A3B8]">
                                  {adm.email}
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-semibold border ${rDef.badgeColor}`}
                                >
                                  L{rDef.level} · {rDef.label}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="font-mono text-[#06B6D4]">
                                  {effPerms.length} active permissions
                                </span>
                                {(adm.customPermissions.length > 0 ||
                                  adm.revokedPermissions.length > 0) && (
                                  <div className="text-[10px] text-[#94A3B8]">
                                    +{adm.customPermissions.length} custom / -
                                    {adm.revokedPermissions.length} revoked
                                  </div>
                                )}
                              </td>
                              <td className="py-3.5 px-4">
                                <span
                                  className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                    adm.status === 'active'
                                      ? 'bg-[#22C55E]/15 text-[#22C55E]'
                                      : 'bg-[#EF4444]/15 text-[#EF4444]'
                                  }`}
                                >
                                  {adm.status.toUpperCase()}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 font-mono text-[11px] text-[#94A3B8]">
                                {adm.lastLoginAtISO.slice(0, 16).replace('T', ' ')}
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                {hasAdminPermission(
                                  effectiveAdmin,
                                  'admins.update_role'
                                ) ? (
                                  <button
                                    type="button"
                                    onClick={() => openEditAdminModal(adm)}
                                    className="px-3 py-1.5 rounded-lg bg-[#111827] hover:bg-[#1D293B] border border-white/[0.08] text-xs font-medium text-[#F8FAFC] cursor-pointer"
                                  >
                                    Configure RBAC
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-[#94A3B8]">
                                    Read-Only
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

          {/* ================================================================
              MODULE 8: PLATFORM ANALYTICS
             ================================================================ */}
          {activeSection === 'analytics' &&
            hasAdminPermission(effectiveAdmin, 'analytics.view') && (
              <div className="space-y-6">
                {renderAdminLocationFilterBar(
                  `Analytics filtered for ${
                    adminCityFilter !== 'all'
                      ? adminCityFilter
                      : adminStateFilter !== 'all'
                      ? adminStateFilter
                      : 'All India'
                  }`
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-5 rounded-2xl bg-[#161E2E] border border-white/[0.08] space-y-4">
                    <h2 className="text-sm font-bold text-[#F8FAFC]">
                      Category Inventory & Average Pricing
                    </h2>
                    <div className="space-y-3">
                      {categoryBreakdown.map((c) => (
                        <div
                          key={c.category}
                          className="p-3 rounded-xl bg-[#111827] border border-white/[0.06] flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-semibold text-[#F8FAFC]">
                              {c.category}
                            </div>
                            <div className="text-[11px] text-[#94A3B8]">
                              {c.count} listings ({c.sharePercent}% of catalog)
                            </div>
                          </div>
                          <div className="font-mono text-sm font-bold text-[#06B6D4]">
                            ₹{c.avgDailyINR}/day
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#161E2E] border border-white/[0.08] space-y-4">
                    <h2 className="text-sm font-bold text-[#F8FAFC]">
                      City-Wise Marketplace Distribution
                    </h2>
                    <div className="space-y-3">
                      {(() => {
                        const cityStats = new Map<
                          string,
                          { listings: number; users: number; state: string }
                        >();

                        for (const item of filteredListings) {
                          if (!item.city) continue;
                          const canonicalCity = resolveCanonicalCityName(item.city);
                          const cur = cityStats.get(canonicalCity) || {
                            listings: 0,
                            users: 0,
                            state: getStateForCity(canonicalCity) || 'India',
                          };
                          cur.listings += 1;
                          cityStats.set(canonicalCity, cur);
                        }

                        for (const user of filteredUsers) {
                          if (!user.city) continue;
                          const canonicalCity = resolveCanonicalCityName(user.city);
                          const cur = cityStats.get(canonicalCity) || {
                            listings: 0,
                            users: 0,
                            state: getStateForCity(canonicalCity) || 'India',
                          };
                          cur.users += 1;
                          cityStats.set(canonicalCity, cur);
                        }

                        const entries = Array.from(cityStats.entries())
                          .map(([cityName, data]) => ({
                            cityName,
                            ...data,
                            total: data.listings + data.users,
                          }))
                          .sort((a, b) => b.total - a.total);

                        if (entries.length === 0) {
                          return (
                            <div className="p-4 text-center text-xs text-[#94A3B8]">
                              No active cities recorded for the selected filter.
                            </div>
                          );
                        }

                        return entries.slice(0, 12).map((entry) => (
                          <div
                            key={entry.cityName}
                            className="p-3 rounded-xl bg-[#111827] border border-white/[0.06] flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-semibold text-[#F8FAFC]">
                                {entry.cityName}
                              </span>
                              <span className="text-[11px] text-[#94A3B8] ml-2">
                                ({entry.state})
                              </span>
                            </div>
                            <span className="font-mono text-[#94A3B8]">
                              {entry.listings} listings · {entry.users} users
                            </span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}

          {/* ================================================================
              MODULE 9: FINANCIAL REPORTS
             ================================================================ */}
          {activeSection === 'finance' &&
            hasAdminPermission(effectiveAdmin, 'finance.view') && (
              <div className="space-y-6">
                {renderAdminLocationFilterBar(
                  `Financial ledger across ${filteredBookings.length} bookings`
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#161E2E] border border-white/[0.08]">
                  <div>
                    <h2 className="text-sm font-bold text-[#F8FAFC]">
                      Financial Ledger & Escrow Summary (INR ₹)
                    </h2>
                    <p className="text-xs text-[#94A3B8]">
                      Computed from live BorrowBox rental bookings at{' '}
                      {settings.platformFeePercent}% platform fee rate
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportFinancialCSV}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export CSV Ledger</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-5 rounded-2xl bg-[#161E2E] border border-white/[0.08]">
                    <div className="text-xs text-[#94A3B8]">
                      Gross Rental Volume (GMV)
                    </div>
                    <div className="text-2xl font-bold font-mono text-[#F8FAFC] mt-2">
                      ₹
                      {overviewMetrics.grossRentalValueINR.toLocaleString(
                        'en-IN'
                      )}
                    </div>
                    <div className="text-[11px] text-[#22C55E] mt-1">
                      Across {overviewMetrics.totalTransactions} bookings
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#161E2E] border border-white/[0.08]">
                    <div className="text-xs text-[#94A3B8]">
                      Platform Support Fee Revenue ({settings.platformFeePercent}
                      %)
                    </div>
                    <div className="text-2xl font-bold font-mono text-[#06B6D4] mt-2">
                      ₹
                      {overviewMetrics.platformRevenueINR.toLocaleString(
                        'en-IN'
                      )}
                    </div>
                    <div className="text-[11px] text-[#94A3B8] mt-1">
                      Net marketplace fee allocation
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#161E2E] border border-white/[0.08]">
                    <div className="text-xs text-[#94A3B8]">
                      Refundable Security Deposits Held
                    </div>
                    <div className="text-2xl font-bold font-mono text-[#8B5CF6] mt-2">
                      ₹
                      {overviewMetrics.depositsHeldINR.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[11px] text-[#94A3B8] mt-1">
                      Active handover deposit protection
                    </div>
                  </div>
                </div>
              </div>
            )}

          {/* ================================================================
              MODULE 10: IMMUTABLE AUDIT LOGS
             ================================================================ */}
          {activeSection === 'audit_logs' &&
            hasAdminPermission(effectiveAdmin, 'audit_logs.view') && (
              <div className="space-y-5">
                <div className="p-4 rounded-2xl bg-[#161E2E] border border-white/[0.08] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="search"
                      value={auditSearch}
                      onChange={(e) => setAuditSearch(e.target.value)}
                      placeholder="Search audit logs by admin email, action, or target..."
                      className="w-full pl-9 pr-4 py-2 bg-[#111827] border border-white/[0.08] rounded-xl text-xs text-[#F8FAFC] placeholder:text-[#94A3B8]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-[#22C55E] bg-[#22C55E]/10 border border-[#22C55E]/25 px-2.5 py-1 rounded-lg">
                      Append-Only · Immutable Rules Enforced
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl bg-[#161E2E] border border-white/[0.08] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/[0.08] bg-[#111827] text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                          <th className="py-3.5 px-4">Timestamp</th>
                          <th className="py-3.5 px-4">Administrator</th>
                          <th className="py-3.5 px-4">Action</th>
                          <th className="py-3.5 px-4">Target</th>
                          <th className="py-3.5 px-4">State Diff (Prev → New)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.06] text-xs">
                        {filteredAuditLogs.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="py-8 text-center text-[#94A3B8]"
                            >
                              No administrative audit logs recorded yet. Perform
                              an action (e.g., approve a listing or update
                              settings) to see live immutable entries.
                            </td>
                          </tr>
                        ) : (
                          filteredAuditLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-white/[0.02]">
                              <td className="py-3.5 px-4 font-mono text-[11px] text-[#94A3B8] whitespace-nowrap">
                                {log.createdAtISO
                                  .slice(0, 19)
                                  .replace('T', ' ')}
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="font-mono text-[#F8FAFC]">
                                  {log.adminEmail}
                                </div>
                                <div className="text-[10px] uppercase text-[#8B5CF6] font-semibold">
                                  {log.adminRole}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 font-semibold text-[#F8FAFC]">
                                {log.action}
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="text-[#06B6D4] font-medium">
                                  {log.targetLabel}
                                </div>
                                <div className="font-mono text-[10px] text-[#94A3B8]">
                                  {log.targetType}:{log.targetId}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 font-mono text-[11px] text-[#94A3B8] max-w-xs truncate">
                                <span className="text-rose-300">
                                  {log.previousValue}
                                </span>{' '}
                                →{' '}
                                <span className="text-emerald-300">
                                  {log.newValue}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

          {/* ================================================================
              MODULE 11: PLATFORM SETTINGS
             ================================================================ */}
          {activeSection === 'settings' &&
            hasAdminPermission(effectiveAdmin, 'settings.manage') && (
              <form
                onSubmit={handleSaveSettings}
                className="max-w-2xl p-6 rounded-2xl bg-[#161E2E] border border-white/[0.08] space-y-5"
              >
                <div>
                  <h2 className="text-base font-bold text-[#F8FAFC]">
                    Global Platform Settings (/platform_settings/global)
                  </h2>
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    Restricted to Super Admins. All configuration changes are
                    recorded in the immutable audit log.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                      Platform Support Fee (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={settingsDraft.platformFeePercent}
                      onChange={(e) =>
                        setSettingsDraft((prev) => ({
                          ...prev,
                          platformFeePercent: Number(e.target.value),
                        }))
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-[#111827] border border-white/[0.08] text-sm font-mono text-[#F8FAFC]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                      Minimum Refundable Deposit (₹ INR)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={50000}
                      step={100}
                      value={settingsDraft.minDepositINR}
                      onChange={(e) =>
                        setSettingsDraft((prev) => ({
                          ...prev,
                          minDepositINR: Number(e.target.value),
                        }))
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-[#111827] border border-white/[0.08] text-sm font-mono text-[#F8FAFC]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                      Auto-Flag High-Value Threshold (₹ INR)
                    </label>
                    <input
                      type="number"
                      min={5000}
                      max={2000000}
                      step={5000}
                      value={settingsDraft.autoFlagHighValueThresholdINR}
                      onChange={(e) =>
                        setSettingsDraft((prev) => ({
                          ...prev,
                          autoFlagHighValueThresholdINR: Number(e.target.value),
                        }))
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-[#111827] border border-white/[0.08] text-sm font-mono text-[#F8FAFC]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                      Support Escalation Gmail
                    </label>
                    <input
                      type="email"
                      value={settingsDraft.supportEscalationEmail}
                      onChange={(e) =>
                        setSettingsDraft((prev) => ({
                          ...prev,
                          supportEscalationEmail: e.target.value,
                        }))
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-[#111827] border border-white/[0.08] text-sm font-mono text-[#F8FAFC]"
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#111827] border border-white/[0.07] cursor-pointer">
                    <div>
                      <div className="text-xs font-semibold text-[#F8FAFC]">
                        Require Moderator Approval for New Community Listings
                      </div>
                      <div className="text-[11px] text-[#94A3B8]">
                        Places new listings in the Pending Approval queue before
                        public spotlight
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settingsDraft.requireListingApproval}
                      onChange={(e) =>
                        setSettingsDraft((prev) => ({
                          ...prev,
                          requireListingApproval: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 accent-[#8B5CF6]"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#111827] border border-white/[0.07] cursor-pointer">
                    <div>
                      <div className="text-xs font-semibold text-[#F8FAFC]">
                        Platform Maintenance Mode
                      </div>
                      <div className="text-[11px] text-[#94A3B8]">
                        Temporarily pause new booking requests during scheduled
                        maintenance
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settingsDraft.maintenanceMode}
                      onChange={(e) =>
                        setSettingsDraft((prev) => ({
                          ...prev,
                          maintenanceMode: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 accent-[#8B5CF6]"
                    />
                  </label>
                </div>

                <div className="pt-2 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="px-5 py-2.5 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold cursor-pointer shadow-lg shadow-[#8B5CF6]/20"
                  >
                    {isSavingSettings
                      ? 'Saving Settings...'
                      : 'Save Platform Configuration'}
                  </button>
                </div>
              </form>
            )}
        </div>
      </div>

      {/* ====================================================================
          MODAL 1: ADD / EDIT ADMINISTRATOR & GRANULAR PERMISSIONS
         ==================================================================== */}
      <AnimatePresence>
        {isAdminModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <motion.form
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onSubmit={handleSaveAdministrator}
              className="w-full max-w-2xl rounded-2xl bg-[#161E2E] border border-white/[0.1] p-6 space-y-5 my-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#F8FAFC]">
                    {editingAdminRecord
                      ? `Configure RBAC: ${editingAdminRecord.email}`
                      : 'Add Authorised Gmail Administrator'}
                  </h2>
                  <p className="text-xs text-[#94A3B8]">
                    Select a hierarchy role and customize granular permission
                    overrides
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAdminModalOpen(false)}
                  className="p-1.5 rounded-lg bg-[#111827] text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#94A3B8] mb-1">
                    Authorised Gmail Address *
                  </label>
                  <input
                    type="email"
                    required
                    disabled={Boolean(editingAdminRecord)}
                    value={adminFormEmail}
                    onChange={(e) => setAdminFormEmail(e.target.value)}
                    placeholder="colleague@gmail.com"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#111827] border border-white/[0.08] text-xs font-mono text-[#F8FAFC] disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#94A3B8] mb-1">
                    Administrator Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={adminFormName}
                    onChange={(e) => setAdminFormName(e.target.value)}
                    placeholder="e.g. Priya Nair"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#111827] border border-white/[0.08] text-xs text-[#F8FAFC]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#94A3B8] mb-1">
                    Hierarchy Role Level *
                  </label>
                  <select
                    value={adminFormRole}
                    onChange={(e) => {
                      setAdminFormRole(e.target.value as AdminRole);
                      setAdminFormCustomPerms([]);
                      setAdminFormRevokedPerms([]);
                    }}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#111827] border border-white/[0.08] text-xs text-[#F8FAFC]"
                  >
                    <option value="super_admin">Level 1: Super Admin</option>
                    <option value="admin">Level 2: Admin</option>
                    <option value="moderator">Level 3: Moderator</option>
                    <option value="support_admin">
                      Level 4: Support Admin
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#94A3B8] mb-1">
                    Access Status
                  </label>
                  <select
                    value={adminFormStatus}
                    onChange={(e) =>
                      setAdminFormStatus(
                        e.target.value as 'active' | 'deactivated'
                      )
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-[#111827] border border-white/[0.08] text-xs text-[#F8FAFC]"
                  >
                    <option value="active">Active</option>
                    <option value="deactivated">Deactivated</option>
                  </select>
                </div>
              </div>

              {/* Granular Permission Matrix */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-[#F8FAFC]">
                  Granular Permission Matrix (16 Capabilities)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto p-2 rounded-xl bg-[#111827] border border-white/[0.06]">
                  {ALL_ADMIN_PERMISSIONS.map((perm) => {
                    const isChecked = computeEffectivePermissions(
                      adminFormRole,
                      adminFormCustomPerms,
                      adminFormRevokedPerms
                    ).includes(perm.id);
                    const isLockedForRole =
                      adminFormRole === 'super_admin' ||
                      perm.id === 'admins.create' ||
                      perm.id === 'admins.update_role';

                    return (
                      <label
                        key={perm.id}
                        className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs ${
                          isChecked
                            ? 'bg-[#161E2E] border-[#8B5CF6]/40 text-[#F8FAFC]'
                            : 'bg-transparent border-white/[0.05] text-[#94A3B8]'
                        } ${
                          isLockedForRole
                            ? 'opacity-70 cursor-not-allowed'
                            : 'cursor-pointer'
                        }`}
                      >
                        <input
                          type="checkbox"
                          disabled={isLockedForRole}
                          checked={isChecked}
                          onChange={() =>
                            handleToggleAdminFormPermission(perm.id)
                          }
                          className="mt-0.5 accent-[#8B5CF6]"
                        />
                        <div>
                          <div className="font-mono text-[11px] font-semibold">
                            {perm.id}
                          </div>
                          <div className="text-[10px] text-[#94A3B8]">
                            {perm.label}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdminModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#111827] text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold cursor-pointer"
                >
                  Save Administrator Registry
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* ====================================================================
          MODAL 2: USER ACCOUNT CONFIRMATION DIALOG (SUSPEND / REACTIVATE)
         ==================================================================== */}
      <AnimatePresence>
        {userActionModal && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-md rounded-2xl bg-[#161E2E] border border-white/[0.1] p-6 space-y-4"
            >
              <h3 className="text-base font-bold text-[#F8FAFC]">
                Confirm User Account Action:{' '}
                {userActionModal.nextStatus.toUpperCase()}
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Target User:{' '}
                <strong className="text-[#F8FAFC]">
                  {userActionModal.user.name}
                </strong>{' '}
                ({userActionModal.user.email})
              </p>
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1">
                  Administrative Reason (Logged in Audit Trail)
                </label>
                <textarea
                  rows={3}
                  value={userActionModal.reason}
                  onChange={(e) =>
                    setUserActionModal((prev) =>
                      prev ? { ...prev, reason: e.target.value } : null
                    )
                  }
                  placeholder="Enter reason for account status change..."
                  className="w-full px-3 py-2 rounded-xl bg-[#111827] border border-white/[0.08] text-xs text-[#F8FAFC]"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUserActionModal(null)}
                  className="px-4 py-2 rounded-xl bg-[#111827] text-xs text-[#94A3B8] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleConfirmUserStatusChange()}
                  className="px-4 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold cursor-pointer"
                >
                  Confirm & Log Action
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ====================================================================
          MODAL 3: PRODUCT REJECTION / FLAGGING MODAL (MANDATORY REASON)
         ==================================================================== */}
      <AnimatePresence>
        {productModModal && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-md rounded-2xl bg-[#161E2E] border border-white/[0.1] p-6 space-y-4"
            >
              <h3 className="text-base font-bold text-[#F8FAFC]">
                {productModModal.targetStatus === 'rejected'
                  ? 'Reject Product Listing'
                  : 'Flag Suspicious Listing'}
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Listing:{' '}
                <strong className="text-[#F8FAFC]">
                  {productModModal.listing.title}
                </strong>
              </p>
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1">
                  Mandatory Moderation Reason *
                </label>
                <textarea
                  rows={3}
                  value={productModModal.reason}
                  onChange={(e) =>
                    setProductModModal((prev) =>
                      prev ? { ...prev, reason: e.target.value } : null
                    )
                  }
                  placeholder="Specify why this listing is being rejected or flagged..."
                  className="w-full px-3 py-2 rounded-xl bg-[#111827] border border-white/[0.08] text-xs text-[#F8FAFC]"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setProductModModal(null)}
                  className="px-4 py-2 rounded-xl bg-[#111827] text-xs text-[#94A3B8] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleConfirmProductModerationModal()}
                  className="px-4 py-2 rounded-xl bg-[#EF4444] hover:bg-red-600 text-white text-xs font-semibold cursor-pointer"
                >
                  Confirm {productModModal.targetStatus.toUpperCase()}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ====================================================================
          MODAL 4: INSPECT USER PROFILE, RENTAL HISTORY & LISTED ITEMS
         ==================================================================== */}
      <AnimatePresence>
        {selectedUserForInspect && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-lg rounded-2xl bg-[#161E2E] border border-white/[0.1] p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#F8FAFC]">
                    {selectedUserForInspect.name}
                  </h3>
                  <p className="text-xs font-mono text-[#94A3B8]">
                    {selectedUserForInspect.email} · UID:{' '}
                    {selectedUserForInspect.uid}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedUserForInspect(null)}
                  className="p-1.5 rounded-lg bg-[#111827] text-[#94A3B8] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-[#111827] p-4 rounded-xl border border-white/[0.06]">
                <div>
                  <span className="text-[#94A3B8]">Location:</span>
                  <div className="font-semibold text-[#F8FAFC]">
                    {selectedUserForInspect.neighborhood},{' '}
                    {selectedUserForInspect.city}
                  </div>
                </div>
                <div>
                  <span className="text-[#94A3B8]">Registered:</span>
                  <div className="font-mono text-[#F8FAFC]">
                    {selectedUserForInspect.createdAtISO.slice(0, 10)}
                  </div>
                </div>
                <div>
                  <span className="text-[#94A3B8]">Listed Products:</span>
                  <div className="font-mono text-[#06B6D4]">
                    {
                      combinedListings.filter(
                        (l) => l.owner.id === selectedUserForInspect.uid
                      ).length
                    }{' '}
                    listings
                  </div>
                </div>
                <div>
                  <span className="text-[#94A3B8]">Rental History:</span>
                  <div className="font-mono text-[#8B5CF6]">
                    {
                      combinedBookings.filter(
                        (b) =>
                          b.borrowerId === selectedUserForInspect.uid ||
                          b.ownerId === selectedUserForInspect.uid
                      ).length
                    }{' '}
                    bookings
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ====================================================================
          MODAL 5: INSPECT PRODUCT PHOTOS & OWNER DETAILS
         ==================================================================== */}
      <AnimatePresence>
        {selectedProductForInspect && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-lg rounded-2xl bg-[#161E2E] border border-white/[0.1] p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-[#F8FAFC]">
                  {selectedProductForInspect.title}
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedProductForInspect(null)}
                  className="p-1.5 rounded-lg bg-[#111827] text-[#94A3B8] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="h-52 rounded-xl overflow-hidden bg-[#111827]">
                <ProductImage
                  srcKeyOrUrl={selectedProductForInspect.imageUrl}
                  alt={selectedProductForInspect.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                {selectedProductForInspect.description}
              </p>
              <div className="p-3.5 rounded-xl bg-[#111827] border border-white/[0.06] text-xs space-y-1">
                <div>
                  Owner:{' '}
                  <strong className="text-[#F8FAFC]">
                    {selectedProductForInspect.owner.name}
                  </strong>{' '}
                  (ID: {selectedProductForInspect.owner.id})
                </div>
                <div>
                  Pickup Area: {selectedProductForInspect.pickupLocation}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ====================================================================
          MODAL 6: NEW REPORT MODAL & NEW SUPPORT TICKET MODAL
         ==================================================================== */}
      <AnimatePresence>
        {isNewReportModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.form
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onSubmit={handleCreateReport}
              className="w-full max-w-md rounded-2xl bg-[#161E2E] border border-white/[0.1] p-6 space-y-4"
            >
              <h3 className="text-base font-bold text-[#F8FAFC]">
                Log Trust & Safety Report
              </h3>
              <input
                type="text"
                required
                value={newReportDraft.targetTitle}
                onChange={(e) =>
                  setNewReportDraft((p) => ({
                    ...p,
                    targetTitle: e.target.value,
                  }))
                }
                placeholder="Reported Item or User Name"
                className="w-full px-3.5 py-2 rounded-xl bg-[#111827] border border-white/[0.08] text-xs text-[#F8FAFC]"
              />
              <textarea
                rows={3}
                required
                value={newReportDraft.reason}
                onChange={(e) =>
                  setNewReportDraft((p) => ({ ...p, reason: e.target.value }))
                }
                placeholder="Detailed description of complaint or policy violation..."
                className="w-full px-3.5 py-2 rounded-xl bg-[#111827] border border-white/[0.08] text-xs text-[#F8FAFC]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewReportModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#111827] text-xs text-[#94A3B8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#8B5CF6] text-white text-xs font-semibold"
                >
                  Submit Report
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isNewTicketModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.form
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onSubmit={handleCreateSupportTicket}
              className="w-full max-w-md rounded-2xl bg-[#161E2E] border border-white/[0.1] p-6 space-y-4"
            >
              <h3 className="text-base font-bold text-[#F8FAFC]">
                Create Support Ticket
              </h3>
              <input
                type="text"
                required
                value={newTicketDraft.subject}
                onChange={(e) =>
                  setNewTicketDraft((p) => ({ ...p, subject: e.target.value }))
                }
                placeholder="Ticket Subject"
                className="w-full px-3.5 py-2 rounded-xl bg-[#111827] border border-white/[0.08] text-xs text-[#F8FAFC]"
              />
              <input
                type="email"
                value={newTicketDraft.userEmail}
                onChange={(e) =>
                  setNewTicketDraft((p) => ({
                    ...p,
                    userEmail: e.target.value,
                  }))
                }
                placeholder="Customer Email (e.g. borrower@gmail.com)"
                className="w-full px-3.5 py-2 rounded-xl bg-[#111827] border border-white/[0.08] text-xs text-[#F8FAFC]"
              />
              <textarea
                rows={3}
                required
                value={newTicketDraft.description}
                onChange={(e) =>
                  setNewTicketDraft((p) => ({
                    ...p,
                    description: e.target.value,
                  }))
                }
                placeholder="Customer issue details..."
                className="w-full px-3.5 py-2 rounded-xl bg-[#111827] border border-white/[0.08] text-xs text-[#F8FAFC]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewTicketModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#111827] text-xs text-[#94A3B8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#8B5CF6] text-white text-xs font-semibold"
                >
                  Create Ticket
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
