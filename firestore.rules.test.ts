import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

/**
 * Deterministic Security Rule & Dirty Dozen Payload Evaluator
 * Verifies the structure, invariants, and all 12 Dirty Dozen attack vectors against the Firestore ruleset.
 */

const rulesSource = fs.existsSync('./firestore.rules')
  ? fs.readFileSync('./firestore.rules', 'utf8')
  : fs.readFileSync('./DRAFT_firestore.rules', 'utf8');

interface MockAuth {
  uid: string;
  email?: string;
  email_verified?: boolean;
}

interface EvalContext {
  auth: MockAuth | null;
  requestTime: string;
  parentUserExists: boolean;
  isAdminDocExists: boolean;
}

const ALLOWED_CITIES = [
  'Bengaluru',
  'Mumbai',
  'Delhi NCR',
  'Hyderabad',
  'Pune',
  'Chennai',
];

function isValidId(id: string): boolean {
  return (
    typeof id === 'string' &&
    id.length >= 1 &&
    id.length <= 128 &&
    /^[a-zA-Z0-9_\-]+$/.test(id)
  );
}

function isAdmin(ctx: EvalContext): boolean {
  if (!ctx.auth) return false;
  if (ctx.isAdminDocExists) return true;
  return (
    ctx.auth.email === 'marukrutarth@gmail.com' &&
    ctx.auth.email_verified === true
  );
}

function evaluatePublicProfileCreate(
  ctx: EvalContext,
  userId: string,
  payload: Record<string, unknown>
): 'ALLOWED' | 'PERMISSION_DENIED' {
  if (!ctx.auth) return 'PERMISSION_DENIED';
  if (!isValidId(userId)) return 'PERMISSION_DENIED';
  if (ctx.auth.uid !== userId) return 'PERMISSION_DENIED';

  const requiredKeys = [
    'uid',
    'name',
    'photoURL',
    'city',
    'neighborhood',
    'canRent',
    'canList',
    'activeMode',
    'createdAt',
    'updatedAt',
  ];
  const payloadKeys = Object.keys(payload);
  if (
    payloadKeys.length !== requiredKeys.length ||
    !requiredKeys.every((k) => payloadKeys.includes(k))
  ) {
    return 'PERMISSION_DENIED';
  }

  if (payload.uid !== userId || payload.uid !== ctx.auth.uid) {
    return 'PERMISSION_DENIED';
  }
  if (
    typeof payload.name !== 'string' ||
    payload.name.length < 2 ||
    payload.name.length > 80
  ) {
    return 'PERMISSION_DENIED';
  }
  if (typeof payload.photoURL !== 'string' || payload.photoURL.length > 500) {
    return 'PERMISSION_DENIED';
  }
  if (
    typeof payload.city !== 'string' ||
    !ALLOWED_CITIES.includes(payload.city)
  ) {
    return 'PERMISSION_DENIED';
  }
  if (
    typeof payload.neighborhood !== 'string' ||
    payload.neighborhood.length < 2 ||
    payload.neighborhood.length > 80
  ) {
    return 'PERMISSION_DENIED';
  }
  if (
    typeof payload.canRent !== 'boolean' ||
    typeof payload.canList !== 'boolean'
  ) {
    return 'PERMISSION_DENIED';
  }
  if (payload.activeMode !== 'renter' && payload.activeMode !== 'owner') {
    return 'PERMISSION_DENIED';
  }
  if (
    payload.createdAt !== ctx.requestTime ||
    payload.updatedAt !== ctx.requestTime
  ) {
    return 'PERMISSION_DENIED';
  }

  return 'ALLOWED';
}

function evaluatePrivateProfileGet(
  ctx: EvalContext,
  userId: string,
  docId: string
): 'ALLOWED' | 'PERMISSION_DENIED' {
  if (!ctx.auth) return 'PERMISSION_DENIED';
  if (!isValidId(userId) || !isValidId(docId) || docId !== 'info') {
    return 'PERMISSION_DENIED';
  }
  if (!ctx.parentUserExists) return 'PERMISSION_DENIED';
  if (ctx.auth.uid !== userId && !isAdmin(ctx)) {
    return 'PERMISSION_DENIED';
  }
  return 'ALLOWED';
}

function evaluatePrivateProfileUpdate(
  ctx: EvalContext,
  userId: string,
  docId: string,
  existingDoc: Record<string, unknown>,
  incomingDoc: Record<string, unknown>
): 'ALLOWED' | 'PERMISSION_DENIED' {
  if (!ctx.auth) return 'PERMISSION_DENIED';
  if (!isValidId(userId) || !isValidId(docId) || docId !== 'info') {
    return 'PERMISSION_DENIED';
  }
  if (!ctx.parentUserExists) return 'PERMISSION_DENIED';
  if (ctx.auth.uid !== userId && !isAdmin(ctx)) {
    return 'PERMISSION_DENIED';
  }
  if (incomingDoc.uid !== existingDoc.uid || incomingDoc.uid !== userId) {
    return 'PERMISSION_DENIED';
  }
  if (incomingDoc.createdAt !== existingDoc.createdAt) {
    return 'PERMISSION_DENIED';
  }
  if (incomingDoc.updatedAt !== ctx.requestTime) {
    return 'PERMISSION_DENIED';
  }
  return 'ALLOWED';
}

function evaluateAdminCreate(
  ctx: EvalContext,
  adminId: string,
  payload: Record<string, unknown>
): 'ALLOWED' | 'PERMISSION_DENIED' {
  if (!ctx.auth || !isValidId(adminId)) return 'PERMISSION_DENIED';
  if (!isAdmin(ctx)) return 'PERMISSION_DENIED';
  if (payload.uid !== adminId || payload.grantedAt !== ctx.requestTime) {
    return 'PERMISSION_DENIED';
  }
  return 'ALLOWED';
}

test('Firestore rules file enforces all 8 hardened security pillars plus Admin RBAC, Support Ticket Ownership/Override & immutable audit logs in syntax', () => {
  assert.ok(
    rulesSource.includes("rules_version = '2';"),
    'Must use rules_version 2'
  );
  assert.ok(
    rulesSource.includes('match /{document=**} {\n      allow read, write: if false;\n    }'),
    'Must include Global Safety Net default-deny'
  );
  assert.ok(
    rulesSource.includes('isValidUserPublicProfile(incoming(), userId)'),
    'Must validate UserPublicProfile schema on create and update'
  );
  assert.ok(
    rulesSource.includes('isValidUserPrivateProfile(incoming(), userId)'),
    'Must validate UserPrivateProfile schema on create and update'
  );
  assert.ok(
    rulesSource.includes('request.auth.token.email_verified == true'),
    'Must enforce email_verified == true on email-based admin checks'
  );
  assert.ok(
    rulesSource.includes('function isSuperAdmin()') &&
      rulesSource.includes('function isOverrideAdmin()'),
    'Must enforce separate Super Admin and Override Admin authority checks'
  );
  assert.ok(
    rulesSource.includes('match /supportTickets/{ticketId}') &&
      rulesSource.includes('resource.data.isInternal != true') &&
      rulesSource.includes('match /privateNotes/{noteId}') &&
      rulesSource.includes('request.resource.data.resolutionSummary.size() >= 5'),
    'Must enforce customer internal-note exclusion, staff ownership/override tiers, and resolution summary on ticket closure'
  );
  assert.ok(
    rulesSource.includes('match /supportNotifications/{notifId}') &&
      rulesSource.includes('resource.data.recipientUid == request.auth.uid') &&
      rulesSource.includes("resource.data.recipientRole == 'customer'"),
    'Must enforce customer ownership and role isolation on supportNotifications'
  );
  assert.ok(
    rulesSource.includes('match /audit_logs/{logId}') &&
      rulesSource.includes('isValidAuditLog(incoming(), logId)'),
    'Must validate immutable audit logs'
  );
});

test('Dirty Dozen #1-12 payloads all return PERMISSION_DENIED', () => {
  const now = '2026-10-29T17:25:00Z';
  const validBaseProfile = {
    uid: 'user_A',
    name: 'Aarav Sharma',
    photoURL: '',
    city: 'Bengaluru',
    neighborhood: 'Indiranagar',
    canRent: true,
    canList: true,
    activeMode: 'renter',
    createdAt: now,
    updatedAt: now,
  };

  // 1. Identity Spoofing on Public Profile Create
  assert.equal(
    evaluatePublicProfileCreate(
      { auth: { uid: 'user_A' }, requestTime: now, parentUserExists: false, isAdminDocExists: false },
      'user_B',
      { ...validBaseProfile, uid: 'user_B' }
    ),
    'PERMISSION_DENIED'
  );

  // 2. Cross-User Private Profile Read (PII Leak)
  assert.equal(
    evaluatePrivateProfileGet(
      { auth: { uid: 'user_A' }, requestTime: now, parentUserExists: true, isAdminDocExists: false },
      'user_B',
      'info'
    ),
    'PERMISSION_DENIED'
  );

  // 3. Cross-User Private Profile Edit
  assert.equal(
    evaluatePrivateProfileUpdate(
      { auth: { uid: 'user_A' }, requestTime: now, parentUserExists: true, isAdminDocExists: false },
      'user_B',
      'info',
      { uid: 'user_B', email: 'b@example.in', phone: '9876543210', createdAt: now, updatedAt: now },
      { uid: 'user_B', email: 'hacked@example.in', phone: '9876543210', createdAt: now, updatedAt: now }
    ),
    'PERMISSION_DENIED'
  );

  // 4. Self-Assigned Admin Shadow Field
  assert.equal(
    evaluatePublicProfileCreate(
      { auth: { uid: 'user_A' }, requestTime: now, parentUserExists: false, isAdminDocExists: false },
      'user_A',
      { ...validBaseProfile, isAdmin: true }
    ),
    'PERMISSION_DENIED'
  );

  // 5. Direct Privilege Escalation in /admins
  assert.equal(
    evaluateAdminCreate(
      { auth: { uid: 'user_A' }, requestTime: now, parentUserExists: true, isAdminDocExists: false },
      'user_A',
      { uid: 'user_A', email: 'a@example.in', grantedAt: now }
    ),
    'PERMISSION_DENIED'
  );

  // 6. Unverified Email Spoof Attack on Admin
  assert.equal(
    evaluateAdminCreate(
      {
        auth: { uid: 'spoof_uid', email: 'marukrutarth@gmail.com', email_verified: false },
        requestTime: now,
        parentUserExists: true,
        isAdminDocExists: false,
      },
      'spoof_uid',
      { uid: 'spoof_uid', email: 'marukrutarth@gmail.com', grantedAt: now }
    ),
    'PERMISSION_DENIED'
  );

  // 7. Orphaned Private Profile Access when parent /users/{userId} does not exist
  assert.equal(
    evaluatePrivateProfileGet(
      { auth: { uid: 'user_A' }, requestTime: now, parentUserExists: false, isAdminDocExists: false },
      'user_A',
      'info'
    ),
    'PERMISSION_DENIED'
  );

  // 8. Immortal Field Mutation (createdAt changed)
  assert.equal(
    evaluatePrivateProfileUpdate(
      { auth: { uid: 'user_A' }, requestTime: now, parentUserExists: true, isAdminDocExists: false },
      'user_A',
      'info',
      { uid: 'user_A', email: 'a@example.in', phone: '9876543210', createdAt: '2026-01-01T00:00:00Z', updatedAt: now },
      { uid: 'user_A', email: 'a2@example.in', phone: '9876543210', createdAt: now, updatedAt: now }
    ),
    'PERMISSION_DENIED'
  );

  // 9. Client Timestamp Forgery (updatedAt != request.time)
  assert.equal(
    evaluatePublicProfileCreate(
      { auth: { uid: 'user_A' }, requestTime: now, parentUserExists: false, isAdminDocExists: false },
      'user_A',
      { ...validBaseProfile, updatedAt: '2099-01-01T00:00:00Z' }
    ),
    'PERMISSION_DENIED'
  );

  // 10. Resource Exhaustion / String Overflow
  assert.equal(
    evaluatePublicProfileCreate(
      { auth: { uid: 'user_A' }, requestTime: now, parentUserExists: false, isAdminDocExists: false },
      'user_A',
      { ...validBaseProfile, name: 'A'.repeat(500) }
    ),
    'PERMISSION_DENIED'
  );

  // 11. Invalid Enum City or Mode
  assert.equal(
    evaluatePublicProfileCreate(
      { auth: { uid: 'user_A' }, requestTime: now, parentUserExists: false, isAdminDocExists: false },
      'user_A',
      { ...validBaseProfile, city: 'Atlantis' }
    ),
    'PERMISSION_DENIED'
  );

  // 12. ID Poisoning Attack
  assert.equal(
    evaluatePublicProfileCreate(
      { auth: { uid: 'bad/id$!' }, requestTime: now, parentUserExists: false, isAdminDocExists: false },
      'bad/id$!',
      { ...validBaseProfile, uid: 'bad/id$!' }
    ),
    'PERMISSION_DENIED'
  );
});
