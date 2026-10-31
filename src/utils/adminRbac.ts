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

export type AdminSectionId =
  | 'overview'
  | 'users'
  | 'products'
  | 'bookings'
  | 'reports'
  | 'support'
  | 'administrators'
  | 'analytics'
  | 'finance'
  | 'audit_logs'
  | 'settings';

export interface AdminRoleDefinition {
  role: AdminRole;
  level: 1 | 2 | 3 | 4;
  label: string;
  badgeColor: string;
  description: string;
  defaultPermissions: AdminPermission[];
}

export interface AdminIdentityRecord {
  uid: string;
  email: string;
  name: string;
  role: AdminRole;
  status: 'active' | 'deactivated';
  customPermissions?: AdminPermission[];
  revokedPermissions?: AdminPermission[];
  grantedBy?: string;
  grantedAt?: string;
  lastLoginAt?: string;
  updatedAt?: string;
}

export const PRIMARY_SUPER_ADMIN_EMAIL = 'marukrutarth@gmail.com';

export const ALL_ADMIN_PERMISSIONS: {
  id: AdminPermission;
  label: string;
  category: 'Users' | 'Products' | 'Operations' | 'Administration' | 'Intelligence & System';
  description: string;
}[] = [
  { id: 'users.view', label: 'View Users', category: 'Users', description: 'Inspect registered user profiles, activity, and verification history' },
  { id: 'users.suspend', label: 'Suspend / Reactivate Users', category: 'Users', description: 'Temporarily suspend or restore user borrowing and lending privileges' },
  { id: 'users.delete', label: 'Delete / Permanently Restrict Users', category: 'Users', description: 'Permanently restrict high-risk or fraudulent accounts' },
  { id: 'products.view', label: 'View Product Listings', category: 'Products', description: 'Browse all active, archived, pending, and flagged rental listings' },
  { id: 'products.approve', label: 'Approve Listings', category: 'Products', description: 'Verify and approve pending or flagged community rental listings' },
  { id: 'products.reject', label: 'Reject / Flag Listings', category: 'Products', description: 'Reject non-compliant listings with mandatory moderation notes' },
  { id: 'bookings.view', label: 'View Rental Bookings', category: 'Operations', description: 'Inspect rental transactions, escrow deposit states, and handovers' },
  { id: 'reports.manage', label: 'Manage Reports & Complaints', category: 'Operations', description: 'Investigate and resolve reported listings, disputes, and user flags' },
  { id: 'support.manage', label: 'Manage Support Tickets', category: 'Operations', description: 'Update support ticket status and record internal resolution notes' },
  { id: 'admins.view', label: 'View Administrators', category: 'Administration', description: 'View the authorised administrator registry and assigned roles' },
  { id: 'admins.create', label: 'Add Administrators', category: 'Administration', description: 'Invite and authorise new Gmail accounts into the admin registry' },
  { id: 'admins.update_role', label: 'Modify Admin Roles & Permissions', category: 'Administration', description: 'Change administrator hierarchy tiers and granular permission overrides' },
  { id: 'analytics.view', label: 'View Platform Analytics', category: 'Intelligence & System', description: 'Access marketplace growth, category velocity, and regional metrics' },
  { id: 'finance.view', label: 'Access Financial Reports', category: 'Intelligence & System', description: 'View GMV, platform fee revenue, and security deposit ledgers' },
  { id: 'settings.manage', label: 'Configure Platform Settings', category: 'Intelligence & System', description: 'Modify platform fee rates, moderation policies, and system rules' },
  { id: 'audit_logs.view', label: 'View Administrative Audit Logs', category: 'Intelligence & System', description: 'Inspect immutable history of administrative actions and state changes' },
];

export const ROLE_DEFINITIONS: Record<AdminRole, AdminRoleDefinition> = {
  super_admin: {
    role: 'super_admin',
    level: 1,
    label: 'Super Admin',
    badgeColor: 'text-purple-300 bg-purple-500/15 border-purple-500/30',
    description: 'Highest authority. Complete control over administrators, role assignments, platform configuration, finance, and moderation.',
    defaultPermissions: [
      'users.view',
      'users.suspend',
      'users.delete',
      'products.view',
      'products.approve',
      'products.reject',
      'bookings.view',
      'reports.manage',
      'support.manage',
      'admins.view',
      'admins.create',
      'admins.update_role',
      'analytics.view',
      'finance.view',
      'settings.manage',
      'audit_logs.view',
    ],
  },
  admin: {
    role: 'admin',
    level: 2,
    label: 'Admin',
    badgeColor: 'text-cyan-300 bg-cyan-500/15 border-cyan-500/30',
    description: 'General platform management across users, listings, bookings, reports, and analytics. Cannot manage Super Admins or restricted financial settings.',
    defaultPermissions: [
      'users.view',
      'users.suspend',
      'products.view',
      'products.approve',
      'products.reject',
      'bookings.view',
      'reports.manage',
      'support.manage',
      'admins.view',
      'analytics.view',
      'audit_logs.view',
    ],
  },
  moderator: {
    role: 'moderator',
    level: 3,
    label: 'Moderator',
    badgeColor: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30',
    description: 'Content and listing moderation. Reviews product listings, approves or rejects items, and handles reported products and users.',
    defaultPermissions: [
      'users.view',
      'products.view',
      'products.approve',
      'products.reject',
      'reports.manage',
      'support.manage',
    ],
  },
  support_admin: {
    role: 'support_admin',
    level: 4,
    label: 'Support Admin',
    badgeColor: 'text-amber-300 bg-amber-500/15 border-amber-500/30',
    description: 'Customer support operations. Views user profiles, rental history, and bookings, and resolves customer complaints and support tickets.',
    defaultPermissions: [
      'users.view',
      'bookings.view',
      'support.manage',
    ],
  },
};

export const ADMIN_SIDEBAR_SECTIONS: {
  id: AdminSectionId;
  label: string;
  categoryGroup?: string;
  requiredPermission: AdminPermission | null;
  description: string;
}[] = [
  { id: 'overview', label: 'Overview', requiredPermission: null, description: 'Real-time marketplace telemetry & pending queues' },
  { id: 'users', label: 'Users', requiredPermission: 'users.view', description: 'Registered renters & owners directory' },
  { id: 'products', label: 'Product Listings', requiredPermission: 'products.view', description: 'Listing approvals, rejections & safety flags' },
  { id: 'bookings', label: 'Bookings', requiredPermission: 'bookings.view', description: 'Rental lifecycle & escrow deposit ledger' },
  { id: 'reports', label: 'Reports & Complaints', requiredPermission: 'reports.manage', description: 'Community trust & safety investigations' },
  { id: 'support', label: 'Tickets', categoryGroup: 'Support', requiredPermission: 'support.manage', description: 'Customer support ticket claiming, workspace & resolution' },
  { id: 'administrators', label: 'Administrators', requiredPermission: 'admins.view', description: 'Authorised Gmail registry & RBAC matrix' },
  { id: 'analytics', label: 'Analytics', requiredPermission: 'analytics.view', description: 'Growth velocity & category performance' },
  { id: 'finance', label: 'Financial Reports', requiredPermission: 'finance.view', description: 'GMV, platform fees & deposit accounting' },
  { id: 'audit_logs', label: 'Audit Logs', requiredPermission: 'audit_logs.view', description: 'Immutable record of administrative actions' },
  { id: 'settings', label: 'Settings', requiredPermission: 'settings.manage', description: 'Marketplace policies & operational parameters' },
];

export function canAdminOverrideTicket(
  admin: Pick<AdminIdentityRecord, 'role' | 'status' | 'customPermissions' | 'revokedPermissions'> | null | undefined
): boolean {
  if (!admin || admin.status !== 'active') return false;
  if (!hasAdminPermission(admin, 'support.manage')) return false;
  return admin.role === 'super_admin' || admin.role === 'admin';
}

export function normalizeAdminEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function emailToAdminDocKey(email: string): string {
  return normalizeAdminEmail(email).replace(/[^a-z0-9]/g, '_');
}

export function validateAdminGmail(email: string): { valid: boolean; reason?: string } {
  const normalized = normalizeAdminEmail(email);
  if (!normalized) {
    return { valid: false, reason: 'Email address is required.' };
  }
  const gmailRegex = /^[a-z0-9._%+-]+@(gmail\.com|googlemail\.com)$/;
  if (!gmailRegex.test(normalized)) {
    return {
      valid: false,
      reason: 'Only authorised Google (@gmail.com) accounts can be registered as administrators.',
    };
  }
  return { valid: true };
}

export function computeEffectivePermissions(
  role: AdminRole,
  customPermissions: AdminPermission[] = [],
  revokedPermissions: AdminPermission[] = []
): AdminPermission[] {
  const roleDef = ROLE_DEFINITIONS[role];
  if (!roleDef) return [];

  // Super Admin always retains core administrative integrity permissions
  if (role === 'super_admin') {
    return [...ROLE_DEFINITIONS.super_admin.defaultPermissions];
  }

  const grantedSet = new Set<AdminPermission>(roleDef.defaultPermissions);
  for (const perm of customPermissions) {
    // Non-super-admins cannot be granted super-admin-only admin creation/role mutation through loose overrides unless explicitly super_admin
    if (perm === 'admins.create' || perm === 'admins.update_role') {
      continue;
    }
    grantedSet.add(perm);
  }
  for (const perm of revokedPermissions) {
    grantedSet.delete(perm);
  }
  return Array.from(grantedSet);
}

export function hasAdminPermission(
  admin: Pick<AdminIdentityRecord, 'role' | 'status' | 'customPermissions' | 'revokedPermissions'> | null | undefined,
  permission: AdminPermission
): boolean {
  if (!admin || admin.status !== 'active') return false;
  const effective = computeEffectivePermissions(
    admin.role,
    admin.customPermissions || [],
    admin.revokedPermissions || []
  );
  return effective.includes(permission);
}

export function getAccessibleAdminSections(
  admin: Pick<AdminIdentityRecord, 'role' | 'status' | 'customPermissions' | 'revokedPermissions'> | null | undefined
) {
  if (!admin || admin.status !== 'active') return [];
  return ADMIN_SIDEBAR_SECTIONS.filter((section) => {
    if (section.requiredPermission === null) return true;
    return hasAdminPermission(admin, section.requiredPermission);
  });
}

export function canManageTargetAdmin(
  actor: Pick<AdminIdentityRecord, 'email' | 'role' | 'status' | 'customPermissions' | 'revokedPermissions'> | null | undefined,
  targetEmail: string,
  targetCurrentRole: AdminRole | null,
  requestedNewRole?: AdminRole
): { allowed: boolean; reason?: string } {
  if (!actor || actor.status !== 'active') {
    return { allowed: false, reason: 'Inactive or unauthenticated administrator.' };
  }

  // Only Super Admins can create administrators, change roles, or modify other administrators
  if (actor.role !== 'super_admin') {
    return {
      allowed: false,
      reason: 'Only Super Admins can add administrators, modify administrator roles, or change permissions.',
    };
  }

  const normalizedTarget = normalizeAdminEmail(targetEmail);
  const normalizedActor = normalizeAdminEmail(actor.email);

  // Protect the primary root Super Admin from being demoted or deactivated
  if (normalizedTarget === PRIMARY_SUPER_ADMIN_EMAIL) {
    if (requestedNewRole && requestedNewRole !== 'super_admin') {
      return {
        allowed: false,
        reason: 'The primary Super Admin account cannot be demoted or stripped of Super Admin authority.',
      };
    }
  }

  // Prevent an admin from demoting their own active Super Admin session accidentally
  if (normalizedTarget === normalizedActor && requestedNewRole && requestedNewRole !== 'super_admin') {
    return {
      allowed: false,
      reason: 'Super Admins cannot demote their own active account.',
    };
  }

  if (targetCurrentRole === 'super_admin' && normalizedTarget === PRIMARY_SUPER_ADMIN_EMAIL && requestedNewRole !== 'super_admin') {
    return {
      allowed: false,
      reason: 'Primary Super Admin authority is locked.',
    };
  }

  return { allowed: true };
}

/**
 * Determines whether the dynamic "Admin Panel" option should be displayed in user navigation.
 * Requires a verified administrator registry record with active status, valid Gmail,
 * valid hierarchy role, and at least one effective permission.
 */
export function shouldShowAdminPanelOption(
  admin:
    | Pick<
        AdminIdentityRecord,
        'email' | 'role' | 'status' | 'customPermissions' | 'revokedPermissions'
      >
    | null
    | undefined
): boolean {
  if (!admin) return false;
  if (admin.status !== 'active') return false;
  if (!ROLE_DEFINITIONS[admin.role]) return false;
  if (!validateAdminGmail(admin.email).valid) return false;
  const effective = computeEffectivePermissions(
    admin.role,
    admin.customPermissions || [],
    admin.revokedPermissions || []
  );
  return effective.length > 0;
}

