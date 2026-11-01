import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTicketClosedEmailPayload,
  buildTicketOpenedEmailPayload,
  isAllowedSupportEmailEvent,
  resolveFormattedSenderEmail,
  resolveReplyToEmail,
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

test('Mandatory Customer Email Payloads: Ticket Opened & Ticket Closed subjects and content match specification without priority', () => {
  const openedEmail = buildTicketOpenedEmailPayload({
    ticketNumber: 'BB-TKT-2026-4829',
    customerName: 'Aarav Sharma',
    customerEmail: 'aarav@gmail.com',
    subject: 'Deposit refund status',
    category: 'Payment & Deposit',
    description: 'My rental ended yesterday, checking when deposit is released.',
  });

  assert.equal(
    openedEmail.subject,
    'BorrowBox Support: Your Ticket Has Been Created - BB-TKT-2026-4829'
  );
  assert.ok(openedEmail.textBody.includes('Aarav Sharma'));
  assert.ok(openedEmail.textBody.includes('BB-TKT-2026-4829'));
  assert.ok(openedEmail.textBody.includes('Payment & Deposit'));
  assert.ok(!openedEmail.textBody.includes('Priority:'));
  assert.ok(openedEmail.textBody.includes('Open'));

  const closedEmail = buildTicketClosedEmailPayload({
    ticketNumber: 'BB-TKT-2026-4829',
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
    'BorrowBox Support: Your Ticket Has Been Resolved - BB-TKT-2026-4829'
  );
  assert.ok(closedEmail.textBody.includes('Priya Support'));
  assert.ok(closedEmail.textBody.includes('Closed'));
  assert.ok(
    closedEmail.textBody.includes(
      'Security deposit of ₹5,000 has been released'
    )
  );
});

test('Resend Sender & Reply-To Normalization: preserves RFC 5322 formatted SUPPORT_FROM_EMAIL without nested angle brackets', () => {
  const formatted = resolveFormattedSenderEmail();
  assert.ok(formatted.includes('<') && formatted.includes('>'));
  assert.equal((formatted.match(/</g) || []).length, 1);
  assert.equal((formatted.match(/>/g) || []).length, 1);

  const replyTo = resolveReplyToEmail();
  assert.equal(typeof replyTo, 'string');
});

test('Strict Email Trigger Policy: allows only TICKET_OPENED and TICKET_CLOSED and rejects replies, assignments, priority changes, and intermediate status changes', () => {
  assert.equal(isAllowedSupportEmailEvent('TICKET_OPENED'), true);
  assert.equal(isAllowedSupportEmailEvent('TICKET_CLOSED'), true);

  // Forbidden intermediate/conversation email events
  assert.equal(isAllowedSupportEmailEvent('ADMIN_REPLIED'), false);
  assert.equal(isAllowedSupportEmailEvent('CUSTOMER_REPLIED'), false);
  assert.equal(isAllowedSupportEmailEvent('TICKET_CLAIMED'), false);
  assert.equal(isAllowedSupportEmailEvent('TICKET_ASSIGNED'), false);
  assert.equal(isAllowedSupportEmailEvent('PRIORITY_CHANGED'), false);
  assert.equal(isAllowedSupportEmailEvent('STATUS_IN_PROGRESS'), false);
  assert.equal(isAllowedSupportEmailEvent('STATUS_WAITING_FOR_USER'), false);
  assert.equal(isAllowedSupportEmailEvent('STATUS_RESOLVED'), false);
  assert.equal(isAllowedSupportEmailEvent(''), false);
  assert.equal(isAllowedSupportEmailEvent(undefined), false);
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


