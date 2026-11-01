import {
  SupportTicketHistoryEntry,
  SupportTicketMessageRecord,
  SupportTicketRecord,
  SupportTicketStatus,
} from '../types/marketplace';

export interface TicketStatusPresentation {
  label: string;
  badgeClass: string;
  dotClass: string;
}

/**
 * Exact status colour mapping for Admin Support Ticket Dashboard & Workspace:
 * - Open: Blue
 * - In Progress: Purple
 * - Waiting for User: Orange
 * - Resolved: Green
 * - Closed: Muted grey
 */
export const ADMIN_TICKET_STATUS_CONFIG: Record<
  SupportTicketStatus,
  TicketStatusPresentation
> = {
  open: {
    label: 'Open',
    badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    dotClass: 'bg-blue-400',
  },
  in_progress: {
    label: 'In Progress',
    badgeClass: 'bg-[#8B5CF6]/15 text-[#A78BFA] border-[#8B5CF6]/30',
    dotClass: 'bg-[#8B5CF6]',
  },
  waiting_for_user: {
    label: 'Waiting for User',
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    dotClass: 'bg-amber-400',
  },
  resolved: {
    label: 'Resolved',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    dotClass: 'bg-emerald-400',
  },
  closed: {
    label: 'Closed',
    badgeClass: 'bg-slate-500/15 text-[#94A3B8] border-white/[0.12]',
    dotClass: 'bg-[#94A3B8]',
  },
};

export const ACTIVE_TICKET_STATUSES: SupportTicketStatus[] = [
  'open',
  'in_progress',
  'waiting_for_user',
  'resolved',
];

export function isTicketActive(status: SupportTicketStatus): boolean {
  return status !== 'closed';
}

export function partitionSupportTickets(tickets: SupportTicketRecord[]): {
  activeTickets: SupportTicketRecord[];
  closedTickets: SupportTicketRecord[];
} {
  const activeTickets: SupportTicketRecord[] = [];
  const closedTickets: SupportTicketRecord[] = [];

  for (const ticket of tickets) {
    if (ticket.status === 'closed') {
      closedTickets.push(ticket);
    } else {
      activeTickets.push(ticket);
    }
  }

  return { activeTickets, closedTickets };
}

/**
 * Dynamic search by Customer Name or Ticket ID (also matches ticketNumber/email/subject cleanly).
 */
export function filterTicketsBySearchQuery(
  tickets: SupportTicketRecord[],
  rawQuery: string
): SupportTicketRecord[] {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return tickets;

  return tickets.filter((t) => {
    const ticketIdMatch =
      t.id.toLowerCase().includes(q) ||
      (t.ticketNumber || '').toLowerCase().includes(q);
    const customerNameMatch = (t.userName || '').toLowerCase().includes(q);
    const customerEmailMatch = (t.userEmail || '').toLowerCase().includes(q);
    const subjectMatch = (t.subject || '').toLowerCase().includes(q);
    return (
      ticketIdMatch || customerNameMatch || customerEmailMatch || subjectMatch
    );
  });
}

export function validateCloseTicketResolution(summary: string): {
  valid: boolean;
  trimmed: string;
  error?: string;
} {
  const trimmed = (summary || '').trim();
  if (trimmed.length < 5) {
    return {
      valid: false,
      trimmed,
      error:
        'Please enter a clear official resolution summary (at least 5 characters) before closing this ticket.',
    };
  }
  return { valid: true, trimmed };
}

export interface TicketProblemSummary {
  reportedIssue: string;
  mainProblemIdentified: string;
  actionsTakenBySupport: string;
  currentSituation: string;
  remainingActionRequired: string;
}

/**
 * Builds a deterministic, factual Problem Summary Card strictly from actual ticket
 * messages, internal notes, and audit history. Never invents details.
 */
export function buildTicketProblemSummary(
  ticket: SupportTicketRecord,
  messages: SupportTicketMessageRecord[],
  history: SupportTicketHistoryEntry[]
): TicketProblemSummary {
  const customerMessages = messages.filter(
    (m) => m.senderRole === 'customer' && !m.isInternal
  );
  const supportPublicReplies = messages.filter(
    (m) => m.senderRole !== 'customer' && !m.isInternal
  );
  const internalStaffNotes = messages.filter((m) => Boolean(m.isInternal));

  // 1. Customer's reported issue
  const openingText = (
    ticket.description ||
    customerMessages[0]?.message ||
    ticket.subject ||
    'No description provided.'
  ).trim();
  const reportedIssue =
    ticket.subject &&
    !openingText.toLowerCase().startsWith(ticket.subject.toLowerCase())
      ? `${ticket.subject} — ${openingText}`
      : openingText;

  // 2. Main problem identified from the conversation
  const categoryLabel = ticket.category || 'General Enquiry';
  const contextParts: string[] = [`Category: ${categoryLabel}`];
  if (ticket.bookingId || ticket.relatedBookingId) {
    contextParts.push(`Booking ${ticket.bookingId || ticket.relatedBookingId}`);
  }
  if (ticket.productId || ticket.relatedProductId) {
    contextParts.push(`Product ${ticket.productId || ticket.relatedProductId}`);
  }
  const latestInternalNote =
    internalStaffNotes.length > 0
      ? internalStaffNotes[internalStaffNotes.length - 1].message.trim()
      : (ticket.internalNotes || '').trim();
  const latestFollowUpCustomerMsg =
    customerMessages.length > 1
      ? customerMessages[customerMessages.length - 1].message.trim()
      : '';

  let mainProblemIdentified = `${contextParts.join(' · ')}. `;
  if (latestInternalNote) {
    mainProblemIdentified += `Staff assessment: "${latestInternalNote}"`;
  } else if (latestFollowUpCustomerMsg) {
    mainProblemIdentified += `Latest customer update: "${latestFollowUpCustomerMsg}"`;
  } else {
    mainProblemIdentified += `Reported under ${categoryLabel}: "${openingText}"`;
  }

  // 3. Actions already taken by support
  const actionParts: string[] = [];
  if (ticket.assignedTo) {
    actionParts.push(
      `Assigned to ${
        ticket.assignedStaffName || ticket.assignedToEmail || ticket.assignedTo
      }`
    );
  } else {
    actionParts.push('Not yet claimed by a support staff member');
  }

  if (supportPublicReplies.length > 0) {
    const latestReply =
      supportPublicReplies[supportPublicReplies.length - 1].message.trim();
    actionParts.push(
      `${supportPublicReplies.length} support ${
        supportPublicReplies.length === 1 ? 'reply' : 'replies'
      } sent (latest: "${
        latestReply.length > 110
          ? `${latestReply.slice(0, 110)}...`
          : latestReply
      }")`
    );
  } else {
    actionParts.push('No public support replies sent yet');
  }

  if (internalStaffNotes.length > 0) {
    actionParts.push(
      `${internalStaffNotes.length} internal staff ${
        internalStaffNotes.length === 1 ? 'note' : 'notes'
      } logged`
    );
  }

  if (history.length > 0) {
    const statusChanges = history.filter(
      (h) =>
        h.action === 'status_changed' ||
        h.action === 'closed' ||
        h.action === 'reopened'
    );
    if (statusChanges.length > 0) {
      const lastChange = statusChanges[0];
      actionParts.push(`Last workflow transition: ${lastChange.summary}`);
    }
  }

  const actionsTakenBySupport = actionParts.join(' · ');

  // 4. Current situation
  const statusLabel =
    ADMIN_TICKET_STATUS_CONFIG[ticket.status]?.label || ticket.status;
  const ownerLabel = ticket.assignedTo
    ? `Handled by ${
        ticket.assignedStaffName || ticket.assignedToEmail || ticket.assignedTo
      }`
    : 'Unassigned (Awaiting Staff Claim)';
  const closedEvent = history.find((h) => h.action === 'closed');
  const closingActorName =
    closedEvent?.actorName ||
    ticket.assignedStaffName ||
    ticket.assignedToEmail ||
    'Support Team';
  const currentSituation =
    ticket.status === 'closed'
      ? `Closed by ${closingActorName}${
          ticket.closedAtISO
            ? ` on ${ticket.closedAtISO.slice(0, 16).replace('T', ' ')}`
            : ''
        }. Official Resolution: "${
          ticket.resolutionSummary || 'Resolved and closed.'
        }"`
      : `Status is ${statusLabel} (${ownerLabel}). Total messages in thread: ${messages.length}.`;

  // 5. Remaining action required, if any
  let remainingActionRequired = '';
  if (ticket.status === 'closed') {
    remainingActionRequired =
      'None — Ticket is closed and archived in Closed Tickets.';
  } else if (!ticket.assignedTo) {
    remainingActionRequired =
      'Claim this ticket and send an initial response to the customer.';
  } else if (ticket.status === 'resolved') {
    remainingActionRequired =
      'Confirm final customer satisfaction or close the ticket with an official resolution summary.';
  } else if (ticket.status === 'waiting_for_user') {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.senderRole === 'customer') {
      remainingActionRequired =
        'Customer has responded — review their latest message and update the ticket.';
    } else {
      remainingActionRequired =
        'Awaiting customer reply or supporting attachment.';
    }
  } else if (supportPublicReplies.length === 0) {
    remainingActionRequired =
      'Review customer complaint and send the first support response.';
  } else {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.senderRole === 'customer') {
      remainingActionRequired =
        'Respond to the latest customer message and progress toward resolution.';
    } else {
      remainingActionRequired =
        'Continue investigation, update status to Waiting for User or Mark Resolved, or Close Ticket when complete.';
    }
  }

  return {
    reportedIssue,
    mainProblemIdentified,
    actionsTakenBySupport,
    currentSituation,
    remainingActionRequired,
  };
}
