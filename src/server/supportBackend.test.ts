import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTicketClosedEmailPayload,
  buildTicketOpenedEmailPayload,
  sanitizeTicketForCustomer,
  validateTicketClaimAttempt,
  validateTicketModificationAuthority,
} from './supportBackend';

test('Support Claiming System: allows authorised staff to claim an unclaimed ticket and blocks simultaneous/second claims', () => {
  const firstClaim = validateTicketClaimAttempt({
    ticketId: 'BBX-2026-100200',
    existingAssignedTo: null,
    staffUid: 'staff_1',
    staffName: 'Priya Support',
    staffEmail: 'priya@gmail.com',
    staffRole: 'support_admin',
  });
  assert.equal(firstClaim.allowed, true);
  assert.equal(firstClaim.statusCode, 200);

  const secondSimultaneousClaim = validateTicketClaimAttempt({
    ticketId: 'BBX-2026-100200',
    existingAssignedTo: 'staff_1',
    existingAssignedStaffName: 'Priya Support',
    staffUid: 'staff_2',
    staffName: 'Rohan Support',
    staffEmail: 'rohan@gmail.com',
    staffRole: 'support_admin',
  });
  assert.equal(secondSimultaneousClaim.allowed, false);
  assert.equal(secondSimultaneousClaim.statusCode, 409);
});

test('Support Ownership & Admin Oversight: blocks regular staff from modifying another staff member ticket while allowing Super Admin override', () => {
  // Unclaimed ticket cannot be modified before claiming
  const unclaimedAttempt = validateTicketModificationAuthority({
    assignedTo: null,
    actorUid: 'staff_1',
    actorRole: 'support_admin',
    actorEmail: 'priya@gmail.com',
  });
  assert.equal(unclaimedAttempt.allowed, false);

  // Regular staff cannot modify another staff member's claimed ticket
  const otherStaffAttempt = validateTicketModificationAuthority({
    assignedTo: 'staff_1',
    actorUid: 'staff_2',
    actorRole: 'support_admin',
    actorEmail: 'rohan@gmail.com',
  });
  assert.equal(otherStaffAttempt.allowed, false);
  assert.equal(otherStaffAttempt.statusCode, 403);

  // Super Admin can override and reassign
  const superAdminOverride = validateTicketModificationAuthority({
    assignedTo: 'staff_1',
    actorUid: 'admin_root',
    actorRole: 'super_admin',
    actorEmail: 'marukrutarth@gmail.com',
    isOverrideAction: true,
  });
  assert.equal(superAdminOverride.allowed, true);
});

test('Internal Notes Privacy: sanitizeTicketForCustomer strictly strips internalNotes', () => {
  const sanitized = sanitizeTicketForCustomer({
    id: 'BBX-2026-555111',
    ticketNumber: 'BBX-2026-555111',
    userId: 'cust_1',
    userName: 'Aarav Sharma',
    userEmail: 'aarav@gmail.com',
    category: 'Booking Issue',
    subject: 'Camera handover delay',
    description: 'Lender was 30 mins late',
    priority: 'normal',
    status: 'in_progress',
    bookingId: 'BKG-1',
    productId: 'LST-1',
    assignedTo: 'staff_1',
    assignedStaffName: 'Priya Support',
    assignedToEmail: 'priya@gmail.com',
    reassignmentCount: 0,
    resolutionSummary: '',
    internalNotes: 'CONFIDENTIAL STAFF NOTE: Verify escrow hold first',
    attachments: [],
    createdAtISO: '2026-10-31T10:00:00Z',
    updatedAtISO: '2026-10-31T10:05:00Z',
  });

  assert.equal(sanitized.internalNotes, '');
});

test('Mandatory Customer Email Payloads: Ticket Opened & Ticket Closed subjects and content match specification', () => {
  const openedEmail = buildTicketOpenedEmailPayload({
    ticketNumber: 'BBX-2026-482910',
    customerName: 'Aarav Sharma',
    customerEmail: 'aarav@gmail.com',
    subject: 'Deposit refund status',
    category: 'Payment & Deposit',
    priority: 'urgent',
    description: 'My rental ended yesterday, checking when deposit is released.',
  });

  assert.equal(
    openedEmail.subject,
    'BorrowBox Support: Your Ticket Has Been Created - BBX-2026-482910'
  );
  assert.ok(openedEmail.textBody.includes('Aarav Sharma'));
  assert.ok(openedEmail.textBody.includes('BBX-2026-482910'));
  assert.ok(openedEmail.textBody.includes('Payment & Deposit'));
  assert.ok(openedEmail.textBody.includes('Urgent'));
  assert.ok(openedEmail.textBody.includes('Open'));

  const closedEmail = buildTicketClosedEmailPayload({
    ticketNumber: 'BBX-2026-482910',
    customerName: 'Aarav Sharma',
    customerEmail: 'aarav@gmail.com',
    subject: 'Deposit refund status',
    assignedStaffName: 'Priya Support',
    resolutionSummary:
      'Security deposit of ₹5,000 has been released to your original payment method.',
    closedAtISO: '2026-10-31T16:00:00Z',
  });

  assert.equal(
    closedEmail.subject,
    'BorrowBox Support: Your Ticket Has Been Resolved - BBX-2026-482910'
  );
  assert.ok(closedEmail.textBody.includes('Priya Support'));
  assert.ok(closedEmail.textBody.includes('Closed'));
  assert.ok(
    closedEmail.textBody.includes(
      'Security deposit of ₹5,000 has been released'
    )
  );
});
