import React from 'react';
import { PageRoute } from '../components/Navbar';
import {
  LegalDocumentLayout,
  TableOfContentsItem,
} from '../components/legal/LegalDocumentLayout';

interface PrivacyPageProps {
  onNavigate: (route: PageRoute) => void;
}

const TOC_ITEMS: TableOfContentsItem[] = [
  { id: 'overview', sectionNumber: '1.0', title: 'Overview & Privacy Principles' },
  { id: 'data-collected', sectionNumber: '2.0', title: 'Information We Collect' },
  { id: 'isolated-pii', sectionNumber: '3.0', title: 'Isolated Private Profile Architecture' },
  { id: 'marketplace-data', sectionNumber: '4.0', title: 'Marketplace, Booking & Handover Data' },
  { id: 'support-records', sectionNumber: '5.0', title: 'Support Tickets & Conversation Records' },
  { id: 'how-we-use', sectionNumber: '6.0', title: 'How We Use Your Information' },
  { id: 'data-storage', sectionNumber: '7.0', title: 'Data Storage & Cloud Infrastructure' },
  { id: 'data-sharing', sectionNumber: '8.0', title: 'Strict Data Sharing & Non-Sale Policy' },
  { id: 'cookies-session', sectionNumber: '9.0', title: 'Local Session Storage & Analytics' },
  { id: 'data-retention', sectionNumber: '10.0', title: 'Data Retention & Account Deletion' },
  { id: 'security-measures', sectionNumber: '11.0', title: 'Security Safeguards & Access Control' },
  { id: 'user-rights', sectionNumber: '12.0', title: 'User Rights & Profile Controls' },
  { id: 'privacy-contact', sectionNumber: '13.0', title: 'Privacy Inquiries & Regulatory Contact' },
];

export const PrivacyPage: React.FC<PrivacyPageProps> = ({ onNavigate }) => {
  return (
    <LegalDocumentLayout
      title="Privacy Policy"
      subtitle="How BorrowBox collects, protects, isolates, and respects your personal data across our peer-to-peer equipment sharing marketplace."
      lastUpdated="October 2026"
      documentNumber="BB-LEGAL-PRIVACY-v1.3"
      legalNotice="BorrowBox employs zero-trust data separation. Sensitive personal contact identifiers (phone numbers, full email addresses) are strictly segregated in isolated private subcollections and never displayed on public marketplace listings."
      tocItems={TOC_ITEMS}
      onNavigate={onNavigate}
    >
      {/* 1.0 */}
      <section id="overview" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#A78BFA]">
          <span>Section 1.0</span>
          <span aria-hidden="true">·</span>
          <span>Core Commitment</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
          1.0 Overview & Privacy Principles
        </h2>
        <p className="text-sm sm:text-base leading-relaxed">
          At BorrowBox, we believe trust is the cornerstone of community sharing. When you rent a camera, lens, gaming console, or power tool from someone in your neighborhood, you deserve complete transparency regarding what data is collected, how it is secured, and who has access to it.
        </p>
        <p className="text-sm sm:text-base leading-relaxed">
          This Privacy Policy outlines our data handling practices across the BorrowBox web application, backend API endpoints, and real-time database architecture in compliance with the Digital Personal Data Protection Act, 2023 (DPDP Act) and applicable Indian information technology guidelines.
        </p>
      </section>

      {/* 2.0 */}
      <section id="data-collected" className="space-y-4 scroll-mt-28 border-t border-white/[0.08] pt-10">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#A78BFA]">
          <span>Section 2.0</span>
          <span aria-hidden="true">·</span>
          <span>Information Scope</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
          2.0 Information We Collect
        </h2>
        <p className="text-sm sm:text-base leading-relaxed">
          We collect only the minimum necessary information required to facilitate equipment discovery, coordinate in-person handovers, protect security deposits, and operate the platform:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base text-[#94A3B8]">
          <li>
            <strong className="text-[#F8FAFC]">Authentication Credentials:</strong> Email address and encrypted password hash (managed securely via Firebase Authentication) or Google Identity OAuth tokens.
          </li>
          <li>
            <strong className="text-[#F8FAFC]">Public Display Attributes:</strong> Your display name, city, neighborhood, avatar image URL, and active mode (renter or owner).
          </li>
          <li>
            <strong className="text-[#F8FAFC]">Direct Contact Information:</strong> Your phone number and private email address, used strictly for verified handover communication.
          </li>
          <li>
            <strong className="text-[#F8FAFC]">Listing Content:</strong> Item titles, descriptions, daily rental prices in ₹, refundable deposits, replacement values, city, neighborhood, and uploaded gear photographs.
          </li>
          <li>
            <strong className="text-[#F8FAFC]">Booking Records:</strong> Pickup dates, return dates, calculation tallies in Indian Rupees, handover verification codes, and condition inspection notes.
          </li>
        </ul>
      </section>

      {/* 3.0 */}
      <section id="isolated-pii" className="space-y-4 scroll-mt-28 border-t border-white/[0.08] pt-10">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#A78BFA]">
          <span>Section 3.0</span>
          <span aria-hidden="true">·</span>
          <span>Architectural Safeguards</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
          3.0 Isolated Private Profile Architecture
        </h2>
        <p className="text-sm sm:text-base leading-relaxed">
          Unlike platforms that lump all user attributes into a single exposed database document, BorrowBox enforces strict architectural segregation at the database schema level:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div className="p-4 rounded-xl bg-[#161E2E] border border-white/[0.08] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#F8FAFC]">Public Profile Layer</span>
              <span className="text-[10px] font-mono text-[#22C55E]">/users/{'{uid}'}</span>
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Contains only your display name, city, neighborhood, and renter/owner permissions. This document contains zero contact details and is visible on community listings.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[#161E2E] border border-[#8B5CF6]/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#F8FAFC]">Private PII Subcollection</span>
              <span className="text-[10px] font-mono text-[#D8B4FE]">/users/{'{uid}'}/private/info</span>
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Contains your verified phone number and email address. Firestore security rules strictly forbid anyone except the authenticated user from reading this document.
            </p>
          </div>
        </div>
      </section>

      {/* 4.0 */}
      <section id="marketplace-data" className="space-y-4 scroll-mt-28 border-t border-white/[0.08] pt-10">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#A78BFA]">
          <span>Section 4.0</span>
          <span aria-hidden="true">·</span>
          <span>Transaction Security</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
          4.0 Marketplace, Booking & Handover Data
        </h2>
        <p className="text-sm sm:text-base leading-relaxed">
          When an equipment rental is reserved, BorrowBox generates a transactional record stored under <code className="text-[#A78BFA] font-mono text-xs">/bookings/{'{bookingId}'}</code>. This record links:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-sm sm:text-base text-[#94A3B8]">
          <li>The listing ID, item title, and city.</li>
          <li>The Lender&apos;s display name and user ID.</li>
          <li>The Borrower&apos;s display name, phone number, and user ID.</li>
          <li>The agreed rental calendar dates and 6-digit Handover Code.</li>
          <li>Pickup and return condition notes and optional condition photos.</li>
        </ul>
        <p className="text-sm sm:text-base leading-relaxed">
          Access to this record is restricted exclusively to the borrower, the lender, and authorized platform administrators for moderation and dispute resolution.
        </p>
      </section>

      {/* 5.0 */}
      <section id="support-records" className="space-y-4 scroll-mt-28 border-t border-white/[0.08] pt-10">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#A78BFA]">
          <span>Section 5.0</span>
          <span aria-hidden="true">·</span>
          <span>Communications</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
          5.0 Support Tickets & Conversation Records
        </h2>
        <p className="text-sm sm:text-base leading-relaxed">
          When you submit a support ticket via our Support Desk, the ticket metadata, category, description, and message thread are securely maintained. Customer tickets and notifications are accessible only by the ticket creator and assigned support staff.
        </p>
        <p className="text-sm sm:text-base leading-relaxed">
          Internal staff notes (<code className="text-[#A78BFA] font-mono text-xs">isInternal == true</code>) are permanently excluded from customer views, ensuring confidential administrative investigations remain protected.
        </p>
      </section>

      {/* 6.0 */}
      <section id="how-we-use" className="space-y-4 scroll-mt-28 border-t border-white/[0.08] pt-10">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#A78BFA]">
          <span>Section 6.0</span>
          <span aria-hidden="true">·</span>
          <span>Data Usage</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
          6.0 How We Use Your Information
        </h2>
        <p className="text-sm sm:text-base leading-relaxed">
          We use your information exclusively for the following transparent purposes:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base text-[#94A3B8]">
          <li>To display and search gear listings across Indian metropolitan rental hubs.</li>
          <li>To validate rental dates and prevent overlapping bookings.</li>
          <li>To coordinate physical handover between borrower and owner via 6-digit verification codes.</li>
          <li>To securely hold, track, and release refundable security deposits in accordance with rental condition.</li>
          <li>To deliver in-app notifications regarding booking approvals, ticket replies, and resolution summaries.</li>
          <li>To prevent fraudulent claims, account impersonation, and unauthorized gear sub-rentals.</li>
        </ul>
      </section>

      {/* 7.0 */}
      <section id="data-storage" className="space-y-4 scroll-mt-28 border-t border-white/[0.08] pt-10">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#A78BFA]">
          <span>Section 7.0</span>
          <span aria-hidden="true">·</span>
          <span>Infrastructure</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
          7.0 Data Storage & Cloud Infrastructure
        </h2>
        <p className="text-sm sm:text-base leading-relaxed">
          BorrowBox utilizes Google Cloud Platform and Firebase infrastructure located in secure cloud regions with enterprise-grade physical and network security. All data transmissions are encrypted in transit via Transport Layer Security (TLS 1.3) and encrypted at rest using AES-256 standards.
        </p>
        <p className="text-sm sm:text-base leading-relaxed">
          In addition, client browsers maintain local offline snapshots of user profile state and active bookings to provide seamless offline responsiveness without exposing authentication tokens.
        </p>
      </section>

      {/* 8.0 */}
      <section id="data-sharing" className="space-y-4 scroll-mt-28 border-t border-white/[0.08] pt-10">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#A78BFA]">
          <span>Section 8.0</span>
          <span aria-hidden="true">·</span>
          <span>Zero Selling Policy</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
          8.0 Strict Data Sharing & Non-Sale Policy
        </h2>
        <div className="p-4 rounded-xl bg-[#161E2E] border border-[#22C55E]/30 text-xs text-[#CBD5E1] space-y-1.5">
          <p className="font-semibold text-[#22C55E]">Our Absolute Guarantee:</p>
          <p className="leading-relaxed">
            BorrowBox does not sell, rent, monetize, or trade your personal information, phone numbers, or rental history with third-party data brokers, advertising networks, or marketing conglomerates.
          </p>
        </div>
        <p className="text-sm sm:text-base leading-relaxed">
          Data is shared only in the following narrowly defined scenarios:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-sm sm:text-base text-[#94A3B8]">
          <li>
            <strong className="text-[#F8FAFC]">Handover Exchange:</strong> Upon booking acceptance, the borrower and owner receive each other&apos;s verified display names and contact phone numbers solely to coordinate pickup and return.
          </li>
          <li>
            <strong className="text-[#F8FAFC]">Legal Compliance:</strong> If mandated by a valid court order, warrant, or statutory directive under Indian law.
          </li>
        </ul>
      </section>

      {/* 9.0 */}
      <section id="cookies-session" className="space-y-4 scroll-mt-28 border-t border-white/[0.08] pt-10">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#A78BFA]">
          <span>Section 9.0</span>
          <span aria-hidden="true">·</span>
          <span>Storage & Analytics</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
          9.0 Local Session Storage & Analytics
        </h2>
        <p className="text-sm sm:text-base leading-relaxed">
          BorrowBox does not use intrusive third-party cross-site advertising cookies or behavioral tracking pixels (such as Meta Pixel or third-party ad networks). We utilize essential browser localStorage and session storage keys strictly to maintain:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-sm sm:text-base text-[#94A3B8]">
          <li>Authenticated user session state and profile caching.</li>
          <li>Saved items in your personal Wishlist (<code className="text-[#A78BFA] font-mono text-xs">borrowbox_wishlist_ids_v1</code>).</li>
          <li>Active city selection and search query filters.</li>
          <li>In-app unread notification badges.</li>
        </ul>
      </section>

      {/* 10.0 */}
      <section id="data-retention" className="space-y-4 scroll-mt-28 border-t border-white/[0.08] pt-10">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#A78BFA]">
          <span>Section 10.0</span>
          <span aria-hidden="true">·</span>
          <span>Retention Schedule</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
          10.0 Data Retention & Account Deletion
        </h2>
        <p className="text-sm sm:text-base leading-relaxed">
          We retain your personal information for as long as your BorrowBox account remains active. If you choose to close your account, your profile is permanently removed from the public marketplace.
        </p>
        <p className="text-sm sm:text-base leading-relaxed">
          Completed booking records, financial tallies in INR, and handover verification logs are retained for a minimum period of 3 years strictly to fulfill Indian tax compliance, accounting audits, and unresolved dispute resolution.
        </p>
      </section>

      {/* 11.0 */}
      <section id="security-measures" className="space-y-4 scroll-mt-28 border-t border-white/[0.08] pt-10">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#A78BFA]">
          <span>Section 11.0</span>
          <span aria-hidden="true">·</span>
          <span>Security Controls</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
          11.0 Security Safeguards & Access Control
        </h2>
        <p className="text-sm sm:text-base leading-relaxed">
          BorrowBox enforces multi-layered technical, administrative, and physical controls to protect your data:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-sm sm:text-base text-[#94A3B8]">
          <li>Strict Firestore security rules preventing horizontal privilege escalation or unauthorized profile mutations.</li>
          <li>Granular 4-tier Role-Based Access Control (RBAC) governing administrative access to listings, reports, and support tickets.</li>
          <li>Immutable administrative audit logging of every moderation, listing change, and deposit override action.</li>
          <li>Input sanitization and validation on all customer messages, enquiry forms, and uploaded attachments.</li>
        </ul>
      </section>

      {/* 12.0 */}
      <section id="user-rights" className="space-y-4 scroll-mt-28 border-t border-white/[0.08] pt-10">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#A78BFA]">
          <span>Section 12.0</span>
          <span aria-hidden="true">·</span>
          <span>Your Entitlements</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
          12.0 User Rights & Profile Controls
        </h2>
        <p className="text-sm sm:text-base leading-relaxed">
          Under Indian privacy laws and BorrowBox community principles, you retain full ownership of your data:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base text-[#94A3B8]">
          <li>
            <strong className="text-[#F8FAFC]">Right to Access & Edit:</strong> You can review and update your name, city, neighborhood, and phone number at any time via your{' '}
            <button
              type="button"
              onClick={() => {
                onNavigate({ page: 'profile' });
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-[#8B5CF6] hover:text-[#A78BFA] underline cursor-pointer font-medium"
            >
              Profile Settings
            </button>.
          </li>
          <li>
            <strong className="text-[#F8FAFC]">Right to Archive Listings:</strong> Owners can archive or unlist equipment from public search at any time from the Rentals Dashboard.
          </li>
          <li>
            <strong className="text-[#F8FAFC]">Right to Erasure:</strong> You may request complete erasure of your profile and personal data when there are no active bookings or pending deposit holds.
          </li>
        </ul>
      </section>

      {/* 13.0 */}
      <section id="privacy-contact" className="space-y-4 scroll-mt-28 border-t border-white/[0.08] pt-10">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#A78BFA]">
          <span>Section 13.0</span>
          <span aria-hidden="true">·</span>
          <span>Data Protection Officer</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
          13.0 Privacy Inquiries & Regulatory Contact
        </h2>
        <p className="text-sm sm:text-base leading-relaxed">
          If you have any questions, concerns, or requests regarding this Privacy Policy or wish to exercise your data rights, please contact our community privacy desk via our{' '}
          <button
            type="button"
            onClick={() => {
              onNavigate({ page: 'contact' });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-[#8B5CF6] hover:text-[#A78BFA] underline cursor-pointer font-medium"
          >
            Contact Desk
          </button>{' '}
          or file an inquiry through our dedicated{' '}
          <button
            type="button"
            onClick={() => {
              onNavigate({ page: 'support' });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-[#8B5CF6] hover:text-[#A78BFA] underline cursor-pointer font-medium"
          >
            Support Center
          </button>.
        </p>
      </section>
    </LegalDocumentLayout>
  );
};
