import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ServerSupportNotification,
  filterNotificationsForViewer,
  sanitizeTicketForCustomer,
  validateSupportAttachmentInput,
  validateTicketClaimAttempt,
  validateTicketModificationAuthority,
} from './supportBackend';

test('Support Claiming System: allows authorised staff to claim an unclaimed ticket and blocks simultaneous/second claims', () => {
  const firstClaim = validateTicketClaimAttempt({
    ticketId: 'BB-TKT-2026-1002',
    existingAssignedTo: null,
    staffUid: 'staff_1',
    staffName: 'Priya Support',
    staffEmail: 'priya@gmail.com',
    staffRole: 'support_admin',
  });
  assert.equal(firstClaim.allowed, true);
  assert.equal(firstClaim.statusCode, 200);

  const secondSimultaneousClaim = validateTicketClaimAttempt({
    ticketId: 'BB-TKT-2026-1002',
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
    id: 'BB-TKT-2026-5551',
    ticketNumber: 'BB-TKT-2026-5551',
    userId: 'cust_1',
    userName: 'Aarav Sharma',
    userEmail: 'aarav@gmail.com',
    category: 'Booking Issue',
    subject: 'Camera handover delay',
    description: 'Lender was 30 mins late',
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

test('Website-Based Notifications & Customer Access Isolation: customers only see their own customer notifications and never see other customers or staff notifications', () => {
  const notifications: ServerSupportNotification[] = [
    {
      id: 'notif-1',
      recipientUid: 'ALL_SUPPORT_STAFF',
      recipientRole: 'staff',
      type: 'ticket_created',
      title: 'New Support Ticket: BB-TKT-2026-1001',
      message: 'Aarav Sharma opened a Booking Issue ticket.',
      ticketId: 'BB-TKT-2026-1001',
      ticketNumber: 'BB-TKT-2026-1001',
      read: false,
      createdAtISO: '2026-10-31T10:00:00Z',
    },
    {
      id: 'notif-2',
      recipientUid: 'cust_1',
      recipientRole: 'customer',
      type: 'staff_replied',
      title: 'Support Reply on BB-TKT-2026-1001',
      message: 'Priya Support replied to your ticket.',
      ticketId: 'BB-TKT-2026-1001',
      ticketNumber: 'BB-TKT-2026-1001',
      read: false,
      createdAtISO: '2026-10-31T10:05:00Z',
    },
    {
      id: 'notif-3',
      recipientUid: 'cust_2',
      recipientRole: 'customer',
      type: 'staff_replied',
      title: 'Support Reply on BB-TKT-2026-2002',
      message: 'Rohan Support replied to cust_2.',
      ticketId: 'BB-TKT-2026-2002',
      ticketNumber: 'BB-TKT-2026-2002',
      read: false,
      createdAtISO: '2026-10-31T10:06:00Z',
    },
    {
      id: 'notif-4',
      recipientUid: 'staff_1',
      recipientRole: 'staff',
      type: 'customer_replied',
      title: 'Customer Reply: BB-TKT-2026-1001',
      message: 'Aarav Sharma replied.',
      ticketId: 'BB-TKT-2026-1001',
      ticketNumber: 'BB-TKT-2026-1001',
      read: false,
      createdAtISO: '2026-10-31T10:07:00Z',
    },
    {
      id: 'notif-5',
      recipientUid: 'cust_1',
      recipientRole: 'customer',
      type: 'ticket_closed',
      title: 'Ticket Closed: BB-TKT-2026-1001',
      message: 'Your ticket was closed. Resolution Summary: Full deposit refunded.',
      ticketId: 'BB-TKT-2026-1001',
      ticketNumber: 'BB-TKT-2026-1001',
      resolutionSummary: 'Full deposit refunded.',
      read: false,
      createdAtISO: '2026-10-31T10:15:00Z',
    },
  ];

  // Customer 1 sees only their own customer notifications (notif-2 and notif-5)
  const cust1View = filterNotificationsForViewer(
    notifications,
    'cust_1',
    'customer'
  );
  assert.equal(cust1View.length, 2);
  assert.deepEqual(
    cust1View.map((n) => n.id),
    ['notif-2', 'notif-5']
  );
  assert.equal(cust1View[1].resolutionSummary, 'Full deposit refunded.');

  // Customer 2 sees only their own customer notification (notif-3) and cannot see Customer 1's notifications
  const cust2View = filterNotificationsForViewer(
    notifications,
    'cust_2',
    'customer'
  );
  assert.equal(cust2View.length, 1);
  assert.equal(cust2View[0].id, 'notif-3');

  // Staff 1 sees ALL_SUPPORT_STAFF notifications and notifications assigned to staff_1 (notif-1 and notif-4), never customer notifications
  const staff1View = filterNotificationsForViewer(
    notifications,
    'staff_1',
    'staff'
  );
  assert.equal(staff1View.length, 2);
  assert.deepEqual(
    staff1View.map((n) => n.id),
    ['notif-1', 'notif-4']
  );
});

test('Attachment Upload Validation: accepts JPEG, JPG, PNG, WebP, and PDF <= 5MB and rejects invalid types or >5MB payloads', () => {
  const validPng = validateSupportAttachmentInput({
    fileName: 'evidence.png',
    contentType: 'image/png',
    sizeBytes: 120 * 1024,
  });
  assert.equal(validPng.valid, true);
  assert.equal(validPng.normalizedContentType, 'image/png');

  const validPdf = validateSupportAttachmentInput({
    fileName: 'invoice.pdf',
    contentType: 'application/pdf',
    sizeBytes: 250 * 1024,
  });
  assert.equal(validPdf.valid, true);
  assert.equal(validPdf.normalizedContentType, 'application/pdf');

  const invalidType = validateSupportAttachmentInput({
    fileName: 'malware.exe',
    contentType: 'application/octet-stream',
    sizeBytes: 1024,
  });
  assert.equal(invalidType.valid, false);
  assert.ok(invalidType.error?.includes('Unsupported file type'));

  const oversized = validateSupportAttachmentInput({
    fileName: 'large_photo.jpg',
    contentType: 'image/jpeg',
    sizeBytes: 6 * 1024 * 1024,
  });
  assert.equal(oversized.valid, false);
  assert.ok(oversized.error?.includes('5 MB'));
});


