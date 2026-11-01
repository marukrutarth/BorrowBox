import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADMIN_TICKET_STATUS_CONFIG,
  buildTicketProblemSummary,
  filterTicketsBySearchQuery,
  partitionSupportTickets,
  validateCloseTicketResolution,
} from './supportTicketSummary';
import {
  SupportTicketHistoryEntry,
  SupportTicketMessageRecord,
  SupportTicketRecord,
} from '../types/marketplace';

const SAMPLE_TICKETS: SupportTicketRecord[] = [
  {
    id: 'BB-TKT-2026-1001',
    ticketNumber: 'BB-TKT-2026-1001',
    userId: 'usr-aarav',
    userName: 'Aarav Sharma',
    userEmail: 'aarav.sharma@gmail.com',
    category: 'Payment & Deposit',
    subject: 'Refundable deposit hold after Sony A7 IV return',
    description:
      'Returned the Sony A7 IV camera kit on time, awaiting deposit release of ₹15,000.',
    status: 'in_progress',
    bookingId: 'BKG-901',
    productId: 'LST-101',
    assignedTo: 'admin-root',
    assignedStaffName: 'Krutarth Maru',
    assignedToEmail: 'marukrutarth@gmail.com',
    internalNotes: '',
    createdAtISO: '2026-10-30T09:00:00.000Z',
    updatedAtISO: '2026-10-30T11:30:00.000Z',
  },
  {
    id: 'BB-TKT-2026-1002',
    ticketNumber: 'BB-TKT-2026-1002',
    userId: 'usr-meera',
    userName: 'Meera Nair',
    userEmail: 'meera.nair@gmail.com',
    category: 'Booking Issue',
    subject: 'Reschedule pickup time for DJI Mavic 3 Pro',
    description: 'Need to shift morning pickup by 2 hours due to flight delay.',
    status: 'resolved',
    bookingId: 'BKG-902',
    productId: 'LST-202',
    assignedTo: 'admin-root',
    assignedStaffName: 'Krutarth Maru',
    assignedToEmail: 'marukrutarth@gmail.com',
    internalNotes: '',
    createdAtISO: '2026-10-29T08:00:00.000Z',
    updatedAtISO: '2026-10-29T14:00:00.000Z',
  },
  {
    id: 'BB-TKT-2026-1003',
    ticketNumber: 'BB-TKT-2026-1003',
    userId: 'usr-rohan',
    userName: 'Rohan Kulkarni',
    userEmail: 'rohan.kulkarni@gmail.com',
    category: 'Payment & Deposit',
    subject: 'Duplicate UPI debit during checkout',
    description: 'UPI debited twice during booking confirmation.',
    status: 'closed',
    bookingId: 'BKG-903',
    resolutionSummary:
      'Verified gateway settlement and refunded duplicate ₹2,400 UPI debit to source bank account.',
    closedAtISO: '2026-10-28T17:45:00.000Z',
    assignedTo: 'admin-root',
    assignedStaffName: 'Krutarth Maru',
    assignedToEmail: 'marukrutarth@gmail.com',
    internalNotes: '',
    createdAtISO: '2026-10-28T10:00:00.000Z',
    updatedAtISO: '2026-10-28T17:45:00.000Z',
  },
];

test('partitionSupportTickets: separates active tickets (including resolved) from closed tickets', () => {
  const { activeTickets, closedTickets } =
    partitionSupportTickets(SAMPLE_TICKETS);
  assert.equal(activeTickets.length, 2);
  assert.deepEqual(
    activeTickets.map((t) => t.id),
    ['BB-TKT-2026-1001', 'BB-TKT-2026-1002']
  );
  assert.equal(closedTickets.length, 1);
  assert.equal(closedTickets[0].id, 'BB-TKT-2026-1003');
});

test('filterTicketsBySearchQuery: filters dynamically by Customer Name and Ticket ID', () => {
  const byCustomer = filterTicketsBySearchQuery(SAMPLE_TICKETS, 'Meera Nair');
  assert.equal(byCustomer.length, 1);
  assert.equal(byCustomer[0].id, 'BB-TKT-2026-1002');

  const byTicketId = filterTicketsBySearchQuery(
    SAMPLE_TICKETS,
    'BB-TKT-2026-1001'
  );
  assert.equal(byTicketId.length, 1);
  assert.equal(byTicketId[0].userName, 'Aarav Sharma');

  const emptySearch = filterTicketsBySearchQuery(SAMPLE_TICKETS, '   ');
  assert.equal(emptySearch.length, 3);
});

test('ADMIN_TICKET_STATUS_CONFIG: enforces required status colour scheme', () => {
  assert.ok(ADMIN_TICKET_STATUS_CONFIG.open.badgeClass.includes('blue'));
  assert.ok(ADMIN_TICKET_STATUS_CONFIG.in_progress.badgeClass.includes('#8B5CF6'));
  assert.ok(
    ADMIN_TICKET_STATUS_CONFIG.waiting_for_user.badgeClass.includes('amber')
  );
  assert.ok(ADMIN_TICKET_STATUS_CONFIG.resolved.badgeClass.includes('emerald'));
  assert.ok(ADMIN_TICKET_STATUS_CONFIG.closed.badgeClass.includes('#94A3B8'));
});

test('validateCloseTicketResolution: requires at least 5 characters for official resolution summary', () => {
  const invalidShort = validateCloseTicketResolution('ok');
  assert.equal(invalidShort.valid, false);
  assert.ok(invalidShort.error);

  const validSummary = validateCloseTicketResolution(
    '  Escrow deposit released in full after inspection.  '
  );
  assert.equal(validSummary.valid, true);
  assert.equal(
    validSummary.trimmed,
    'Escrow deposit released in full after inspection.'
  );
});

test('buildTicketProblemSummary: derives structured 5-point summary strictly from actual messages and history', () => {
  const messages: SupportTicketMessageRecord[] = [
    {
      id: 'msg-1',
      ticketId: 'BB-TKT-2026-1001',
      senderId: 'usr-aarav',
      senderRole: 'customer',
      senderName: 'Aarav Sharma',
      senderEmail: 'aarav.sharma@gmail.com',
      message:
        'Returned the Sony A7 IV camera kit on time, awaiting deposit release of ₹15,000.',
      attachments: [],
      isInternal: false,
      createdAtISO: '2026-10-30T09:00:00.000Z',
    },
    {
      id: 'msg-2',
      ticketId: 'BB-TKT-2026-1001',
      senderId: 'admin-root',
      senderRole: 'admin',
      senderName: 'Krutarth Maru',
      senderEmail: 'marukrutarth@gmail.com',
      message: 'Checked lender handover log; battery serial verified.',
      attachments: [],
      isInternal: true,
      createdAtISO: '2026-10-30T10:00:00.000Z',
    },
    {
      id: 'msg-3',
      ticketId: 'BB-TKT-2026-1001',
      senderId: 'admin-root',
      senderRole: 'admin',
      senderName: 'Krutarth Maru',
      senderEmail: 'marukrutarth@gmail.com',
      message:
        'We have verified the return checklist with the lender and initiated your ₹15,000 deposit release.',
      attachments: [],
      isInternal: false,
      createdAtISO: '2026-10-30T11:30:00.000Z',
    },
  ];

  const history: SupportTicketHistoryEntry[] = [
    {
      id: 'hist-1',
      ticketId: 'BB-TKT-2026-1001',
      action: 'claimed',
      actorId: 'admin-root',
      actorName: 'Krutarth Maru',
      actorEmail: 'marukrutarth@gmail.com',
      actorRole: 'super_admin',
      summary: 'Ticket claimed by Krutarth Maru',
      createdAtISO: '2026-10-30T09:15:00.000Z',
    },
  ];

  const summary = buildTicketProblemSummary(
    SAMPLE_TICKETS[0],
    messages,
    history
  );

  assert.ok(summary.reportedIssue.includes('Sony A7 IV'));
  assert.ok(
    summary.mainProblemIdentified.includes(
      'Checked lender handover log; battery serial verified.'
    )
  );
  assert.ok(summary.actionsTakenBySupport.includes('Assigned to Krutarth Maru'));
  assert.ok(summary.actionsTakenBySupport.includes('1 support reply sent'));
  assert.ok(summary.actionsTakenBySupport.includes('1 internal staff note logged'));
  assert.ok(summary.currentSituation.includes('In Progress'));
  assert.ok(summary.remainingActionRequired.length > 10);
});
