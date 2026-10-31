import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeEffectivePermissions,
  hasAdminPermission,
  getAccessibleAdminSections,
  canManageTargetAdmin,
  validateAdminGmail,
  shouldShowAdminPanelOption,
  PRIMARY_SUPER_ADMIN_EMAIL,
  AdminIdentityRecord,
} from './adminRbac';

describe('Admin RBAC & Hierarchy Engine', () => {
  it('validates authorised Gmail addresses strictly', () => {
    assert.equal(validateAdminGmail('marukrutarth@gmail.com').valid, true);
    assert.equal(validateAdminGmail('  Team.BorrowBox@gmail.com ').valid, true);
    assert.equal(validateAdminGmail('user@yahoo.com').valid, false);
    assert.equal(validateAdminGmail('not-an-email').valid, false);
  });

  it('assigns complete permissions to Super Admin and blocks revocation of core Super Admin privileges', () => {
    const perms = computeEffectivePermissions('super_admin', [], ['admins.create', 'settings.manage']);
    assert.equal(perms.includes('admins.create'), true);
    assert.equal(perms.includes('admins.update_role'), true);
    assert.equal(perms.includes('finance.view'), true);
    assert.equal(perms.includes('settings.manage'), true);
  });

  it('enforces Level 2 Admin restrictions (no Super Admin creation, role updates, finance, or settings by default)', () => {
    const adminRecord: AdminIdentityRecord = {
      uid: 'admin-2',
      email: 'ops.admin@gmail.com',
      name: 'Ops Admin',
      role: 'admin',
      status: 'active',
    };

    assert.equal(hasAdminPermission(adminRecord, 'users.view'), true);
    assert.equal(hasAdminPermission(adminRecord, 'users.suspend'), true);
    assert.equal(hasAdminPermission(adminRecord, 'products.approve'), true);
    assert.equal(hasAdminPermission(adminRecord, 'admins.create'), false);
    assert.equal(hasAdminPermission(adminRecord, 'admins.update_role'), false);
    assert.equal(hasAdminPermission(adminRecord, 'finance.view'), false);
    assert.equal(hasAdminPermission(adminRecord, 'settings.manage'), false);
  });

  it('enforces Level 3 Moderator and Level 4 Support Admin boundaries', () => {
    const moderator: AdminIdentityRecord = {
      uid: 'mod-1',
      email: 'mod.team@gmail.com',
      name: 'Listing Moderator',
      role: 'moderator',
      status: 'active',
    };
    assert.equal(hasAdminPermission(moderator, 'products.approve'), true);
    assert.equal(hasAdminPermission(moderator, 'products.reject'), true);
    assert.equal(hasAdminPermission(moderator, 'reports.manage'), true);
    assert.equal(hasAdminPermission(moderator, 'users.suspend'), false);
    assert.equal(hasAdminPermission(moderator, 'admins.view'), false);
    assert.equal(hasAdminPermission(moderator, 'finance.view'), false);

    const supportAdmin: AdminIdentityRecord = {
      uid: 'sup-1',
      email: 'support.team@gmail.com',
      name: 'Support Specialist',
      role: 'support_admin',
      status: 'active',
    };
    assert.equal(hasAdminPermission(supportAdmin, 'users.view'), true);
    assert.equal(hasAdminPermission(supportAdmin, 'bookings.view'), true);
    assert.equal(hasAdminPermission(supportAdmin, 'support.manage'), true);
    assert.equal(hasAdminPermission(supportAdmin, 'products.approve'), false);
    assert.equal(hasAdminPermission(supportAdmin, 'settings.manage'), false);
  });

  it('supports granular per-admin permission overrides without allowing privilege escalation to admin creation', () => {
    const customModerator: AdminIdentityRecord = {
      uid: 'mod-custom',
      email: 'senior.mod@gmail.com',
      name: 'Senior Moderator',
      role: 'moderator',
      status: 'active',
      customPermissions: ['analytics.view', 'admins.create'], // admins.create must be ignored for non-super_admin
      revokedPermissions: ['products.reject'],
    };

    assert.equal(hasAdminPermission(customModerator, 'analytics.view'), true);
    assert.equal(hasAdminPermission(customModerator, 'products.approve'), true);
    assert.equal(hasAdminPermission(customModerator, 'products.reject'), false);
    assert.equal(hasAdminPermission(customModerator, 'admins.create'), false);
  });

  it('filters sidebar sections strictly to permissions held by the logged-in administrator', () => {
    const supportAdmin: AdminIdentityRecord = {
      uid: 'sup-1',
      email: 'support.team@gmail.com',
      name: 'Support Specialist',
      role: 'support_admin',
      status: 'active',
    };
    const visibleIds = getAccessibleAdminSections(supportAdmin).map((s) => s.id);
    assert.deepEqual(visibleIds, ['overview', 'users', 'bookings', 'support']);
  });

  it('prevents non-Super Admins from managing admins and protects primary Super Admin from demotion', () => {
    const regularAdmin: AdminIdentityRecord = {
      uid: 'admin-2',
      email: 'ops.admin@gmail.com',
      name: 'Ops Admin',
      role: 'admin',
      status: 'active',
    };
    const superAdmin: AdminIdentityRecord = {
      uid: 'super-1',
      email: PRIMARY_SUPER_ADMIN_EMAIL,
      name: 'Primary Super Admin',
      role: 'super_admin',
      status: 'active',
    };

    assert.equal(canManageTargetAdmin(regularAdmin, 'new.mod@gmail.com', null, 'moderator').allowed, false);
    assert.equal(canManageTargetAdmin(superAdmin, 'new.mod@gmail.com', null, 'moderator').allowed, true);
    assert.equal(canManageTargetAdmin(superAdmin, PRIMARY_SUPER_ADMIN_EMAIL, 'super_admin', 'admin').allowed, false);
  });

  it('dynamically displays Admin Panel option only for active verified administrators and revokes on deactivation', () => {
    assert.equal(shouldShowAdminPanelOption(null), false);
    assert.equal(shouldShowAdminPanelOption(undefined), false);

    const activeSuperAdmin: AdminIdentityRecord = {
      uid: 'super-1',
      email: PRIMARY_SUPER_ADMIN_EMAIL,
      name: 'Krutarth Maru',
      role: 'super_admin',
      status: 'active',
    };
    assert.equal(shouldShowAdminPanelOption(activeSuperAdmin), true);

    const deactivatedMod: AdminIdentityRecord = {
      uid: 'mod-2',
      email: 'former.mod@gmail.com',
      name: 'Former Mod',
      role: 'moderator',
      status: 'deactivated',
    };
    assert.equal(shouldShowAdminPanelOption(deactivatedMod), false);

    const strippedSupport: AdminIdentityRecord = {
      uid: 'sup-2',
      email: 'stripped.sup@gmail.com',
      name: 'Stripped Support',
      role: 'support_admin',
      status: 'active',
      revokedPermissions: ['users.view', 'bookings.view', 'support.manage'],
    };
    assert.equal(shouldShowAdminPanelOption(strippedSupport), false);
  });
});

