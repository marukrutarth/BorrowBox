import React from 'react';
import { PageRoute } from '../components/Navbar';
import {
  LegalDocumentLayout,
  TableOfContentsItem,
} from '../components/legal/LegalDocumentLayout';

interface TermsPageProps {
  onNavigate: (route: PageRoute) => void;
}

const TOC_ITEMS: TableOfContentsItem[] = [
  { id: 'introduction', sectionNumber: '1.0', title: 'Introduction & Acceptance' },
  { id: 'eligibility', sectionNumber: '2.0', title: 'Eligibility & Account Registration' },
  { id: 'platform-model', sectionNumber: '3.0', title: 'Platform Model & Neutral Facilitation' },
  { id: 'user-responsibilities', sectionNumber: '4.0', title: 'User Conduct & Responsibilities' },
  { id: 'renting-items', sectionNumber: '5.0', title: 'Renting Items & Permitted Use' },
  { id: 'listing-items', sectionNumber: '6.0', title: 'Listing Items & Lender Obligations' },
  { id: 'booking-requests', sectionNumber: '7.0', title: 'Booking Workflow & Handover Codes' },
  { id: 'rental-periods', sectionNumber: '8.0', title: 'Rental Periods, Extensions & Surcharges' },
  { id: 'payments-charges', sectionNumber: '9.0', title: 'Payments, Pricing & Service Fees' },
  { id: 'security-deposits', sectionNumber: '10.0', title: 'Security Deposits & Release Terms' },
  { id: 'cancellations', sectionNumber: '11.0', title: 'Cancellations & Refund Policy' },
  { id: 'returns-handover', sectionNumber: '12.0', title: 'Returns, Inspection & Handover' },
  { id: 'damage-loss', sectionNumber: '13.0', title: 'Damage, Loss & Dispute Resolution' },
  { id: 'prohibited-activities', sectionNumber: '14.0', title: 'Prohibited Items & Activities' },
  { id: 'limitation-liability', sectionNumber: '15.0', title: 'Limitation of Liability & Contact' },
];

export const TermsPage: React.FC<TermsPageProps> = ({ onNavigate }) => {
  return (
    <LegalDocumentLayout
      title="Terms & Conditions"
      subtitle="Operational rules, community expectations, and legal guidelines governing the BorrowBox peer-to-peer rental marketplace."
      lastUpdated="October 2026"
      documentNumber="BB-LEGAL-TOS-v1.4"
      legalNotice="Important: BorrowBox provides a digital facilitation platform connecting verified equipment owners and borrowers across Indian metropolitan hubs. Formal jurisdictional dispute resolution remains subject to Indian contract and consumer protection law."
      tocItems={TOC_ITEMS}
      onNavigate={onNavigate}
    >
      {/* 1.0 */}
      <section id="introduction" className="space-y-4 scroll-mt-28">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#A78BFA]">
          <span>Section 1.0</span>
          <span aria-hidden="true">·</span>
          <span>Binding Agreement</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
          1.0 Introduction & Acceptance of Terms
        </h2>
        <p className="text-sm sm:text-base leading-relaxed">
          Welcome to BorrowBox. These Terms & Conditions (&quot;Terms&quot;) constitute a legally binding agreement between you (&quot;User&quot;, &quot;Borrower&quot;, &quot;Lender&quot;, or &quot;Owner&quot;) and BorrowBox (&quot;Platform&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;). By accessing our website, creating an account, browsing listings, submitting booking requests, or listing items for rent, you acknowledge that you have read, understood, and agreed to be bound by these Terms and our Privacy Policy.
        </p>
        <p className="text-sm sm:text-base leading-relaxed">
          If you do not agree with any provision set forth in these Terms, you must discontinue using the BorrowBox platform immediately. Continued use of our marketplace signifies your ongoing acceptance of these terms and any subsequent revisions.
        </p>
      </section>

      {/* 2.0 */}
      <section id="eligibility" className="space-y-4 scroll-mt-28 border-t border-white/[0.08] pt-10">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#A78BFA]">
          <span>Section 2.0</span>
          <span aria-hidden="true">·</span>
          <span>User Verification</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
          2.0 Eligibility & Account Registration
        </h2>
        <p className="text-sm sm:text-base leading-relaxed">
          To register for an account or engage in rental transactions on BorrowBox, you must be at least 18 years of age and legally capable of entering into binding contracts under the Indian Contract Act, 1872. You represent and warrant that all information provided during registration—including your legal name, email address, phone number, and residential city—is accurate, current, and complete.
        </p>
        <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base text-[#94A3B8]">
          <li>
            <strong className="text-[#F8FAFC]">Account Security:</strong> You are responsible for safeguarding your credentials and are solely liable for any activity conducted through your authenticated session.
          </li>
          <li>
            <strong className="text-[#F8FAFC]">Identity Verification:</strong> Both borrowers and owners are required to present valid government photo identification (such as Aadhaar, Indian Passport, Voter ID, or Driving Licence) in person at physical equipment handover.
          </li>
          <li>
            <strong className="text-[#F8FAFC]">Single Account Policy:</strong> Users may not register duplicate accounts to bypass community restrictions, suspensions, or dispute investigations.
          </li>
        </ul>
      </section>

      {/* 3.0 */}
      <section id="platform-model" className="space-y-4 scroll-mt-28 border-t border-white/[0.08] pt-10">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#A78BFA]">
          <span>Section 3.0</span>
          <span aria-hidden="true">·</span>
          <span>Marketplace Structure</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
          3.0 Platform Model & Neutral Facilitation
        </h2>
        <p className="text-sm sm:text-base leading-relaxed">
          BorrowBox operates exclusively as a digital peer-to-peer facilitation marketplace. BorrowBox does not own, manufacture, store, inspect in warehouse, or physically deliver items listed on the platform. The actual rental contract is formed directly between the Lender and the Borrower.
        </p>
        <p className="text-sm sm:text-base leading-relaxed">
          While BorrowBox facilitates secure bookings, transparent security deposit tracking, mutual handover verification codes, and dispute moderation, the platform is not an insurer, guarantor, or bailee of listed equipment.
        </p>
      </section>

      {/* 4.0 */}
      <section id="user-responsibilities" className="space-y-4 scroll-mt-28 border-t border-white/[0.08] pt-10">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#A78BFA]">
          <span>Section 4.0</span>
          <span aria-hidden="true">·</span>
          <span>Community Standards</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
          4.0 User Conduct & Community Responsibilities
        </h2>
        <p className="text-sm sm:text-base leading-relaxed">
          The integrity of BorrowBox rests upon mutual respect, punctual communication, and conscientious care of shared community resources. Users agree to:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div className="p-4 rounded-xl bg-[#161E2E] border border-white/[0.08] space-y-1">
            <h4 className="text-sm font-semibold text-[#F8FAFC]">Honest Communication</h4>
            <p className="text-xs text-[#94A3B8]">
              Disclose any pre-existing cosmetic flaws, quirks, or accessory limitations before completing handover.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[#161E2E] border border-white/[0.08] space-y-1">
            <h4 className="text-sm font-semibold text-[#F8FAFC]">Timely Coordination</h4>
            <p className="text-xs text-[#94A3B8]">
              Arrive punctually for scheduled pickup and return appointments in your designated neighborhood hub.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[#161E2E] border border-white/[0.08] space-y-1">
            <h4 className="text-sm font-semibold text-[#F8FAFC]">Safe Operational Use</h4>
            <p className="text-xs text-[#94A3B8]">
              Operate gear strictly in accordance with manufacturer guidelines and safety recommendations.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[#161E2E] border border-white/[0.08] space-y-1">
            <h4 className="text-sm font-semibold text-[#F8FAFC]">Zero Off-Platform Circumvention</h4>
            <p className="text-xs text-[#94A3B8]">
              Do not solicit off-platform cash bookings to circumvent security deposit protections and handover records.
            </p>
          </div>
        </div>
      </section>

      {/* 5.0 */}
      <section id="renting-items" className="space-y-4 scroll-mt-28 border-t border-white/[0.08] pt-10">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#A78BFA]">
          <span>Section 5.0</span>
          <span aria-hidden="true">·</span>
          <span>Borrower Guidelines</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
          5.0 Renting Items & Permitted Use
        </h2>
        <p className="text-sm sm:text-base leading-relaxed">
          When submitting a booking request as a Borrower, you agree to:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base text-[#94A3B8]">
          <li>
            Inspect the item thoroughly during physical handover in the presence of the owner.
          </li>
          <li>
            Test all primary switches, battery health, screens, optical elements, and included cables before confirming the 6-digit handover code.
          </li>
          <li>
            Treat the item with standard care, protecting it from moisture, extreme heat, drop impact, dust, and electrical surges.
          </li>
          <li>
            Never sub-rent, pledge, pawn, transfer, or modify the firmware/hardware of rented equipment.
          </li>
          <li>
            Return the item along with all original accessories, charging bricks, lens caps, and carrying cases provided at pickup.
          </li>
        </ul>
      </section>

      {/* 6.0 */}
      <section id="listing-items" className="space-y-4 scroll-mt-28 border-t border-white/[0.08] pt-10">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#A78BFA]">
          <span>Section 6.0</span>
          <span aria-hidden="true">·</span>
          <span>Lender Guidelines</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
          6.0 Listing Items & Lender Obligations
        </h2>
        <p className="text-sm sm:text-base leading-relaxed">
          When listing an item on BorrowBox, you represent and warrant that:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base text-[#94A3B8]">
          <li>
            You are the lawful owner of the equipment or possess documented authority to rent it out.
          </li>
          <li>
            The item is in fully working, safe mechanical and electrical condition, free of hazardous defects.
          </li>
          <li>
            Photographs uploaded accurately portray the current cosmetic state of the exact item available for pickup.
          </li>
          <li>
            Pricing, refundable deposit amount, and minimum rental duration are set in good faith and displayed in Indian Rupees (₹).
          </li>
          <li>
            You will maintain active calendar availability and respond promptly to incoming booking requests in your Rentals Dashboard.
          </li>
        </ul>
      </section>

      {/* 7.0 */}
      <section id="booking-requests" className="space-y-4 scroll-mt-28 border-t border-white/[0.08] pt-10">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#A78BFA]">
          <span>Section 7.0</span>
          <span aria-hidden="true">·</span>
          <span>Handover Protocol</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
          7.0 Booking Workflow & Handover Verification Codes
        </h2>
        <p className="text-sm sm:text-base leading-relaxed">
          To eliminate fraudulent claims and unverified handovers, BorrowBox generates a unique 6-digit Handover Verification Code for every accepted booking.
        </p>
        <div className="p-4 rounded-xl bg-[#161E2E] border border-white/[0.08] space-y-2 text-xs text-[#CBD5E1]">
          <p className="font-semibold text-[#F8FAFC]">Mandatory Handover Sequence:</p>
          <ol className="list-decimal pl-5 space-y-1.5 text-[#94A3B8]">
            <li>Borrower and Owner meet at the agreed public neighborhood pickup location.</li>
            <li>Both parties inspect government photo ID credentials to verify user identities.</li>
            <li>Borrower inspects item condition, accessories, and functionality.</li>
            <li>Borrower shares the 6-digit Handover Code with the Owner, who enters it in BorrowBox to officially transition booking status to <span className="text-[#06B6D4] font-mono">Picked Up</span>.</li>
          </ol>
        </div>
      </section>

      {/* 8.0 */}
      <section id="rental-periods" className="space-y-4 scroll-mt-28 border-t border-white/[0.08] pt-10">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#A78BFA]">
          <span>Section 8.0</span>
          <span aria-hidden="true">·</span>
          <span>Duration & Extensions</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
          8.0 Rental Periods, Extensions & Surcharges
        </h2>
        <p className="text-sm sm:text-base leading-relaxed">
          The rental period begins at verified handover and concludes at the agreed return time on the scheduled end date. Consecutive multi-day rentals of 7 days or longer automatically benefit from a 10% weekly discount applied directly to the net rental cost.
        </p>
        <p className="text-sm sm:text-base leading-relaxed">
          Borrowers wishing to extend their rental must submit an extension request through BorrowBox prior to the scheduled conclusion of the original booking. Unauthorised late returns disrupt subsequent confirmed reservations and incur daily rental rates plus a late fee of 50% of the daily rate per delayed 24-hour cycle.
        </p>
      </section>

      {/* 9.0 */}
      <section id="payments-charges" className="space-y-4 scroll-mt-28 border-t border-white/[0.08] pt-10">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#A78BFA]">
          <span>Section 9.0</span>
          <span aria-hidden="true">·</span>
          <span>Financial Structure</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
          9.0 Payments, Pricing & Service Fees
        </h2>
        <p className="text-sm sm:text-base leading-relaxed">
          All financial figures across BorrowBox are denominated in Indian Rupees (₹). Total upfront booking cost is computed as:
        </p>
        <div className="p-4 rounded-xl bg-[#111827] border border-white/[0.08] font-mono text-xs text-[#A78BFA] space-y-1">
          <div>Total Upfront (₹) = (Daily Rate × Days [−10% if ≥ 7d]) + Platform Fee + Refundable Security Deposit</div>
        </div>
        <p className="text-sm sm:text-base leading-relaxed">
          BorrowBox charges a transparent platform facilitation fee (configured under administrative settings, standard 10%) on net rental costs to maintain real-time support infrastructure, cloud systems, and platform security.
        </p>
      </section>

      {/* 10.0 */}
      <section id="security-deposits" className="space-y-4 scroll-mt-28 border-t border-white/[0.08] pt-10">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#A78BFA]">
          <span>Section 10.0</span>
          <span aria-hidden="true">·</span>
          <span>Escrow Protection</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
          10.0 Security Deposits & Release Terms
        </h2>
        <p className="text-sm sm:text-base leading-relaxed">
          Refundable security deposits are an indispensable safeguard for community gear owners. Security deposit funds are held in escrow-style reserve during the active booking lifecycle and are never disbursed to the lender during rental use.
        </p>
        <p className="text-sm sm:text-base leading-relaxed">
          Upon physical return and mutual verification that the gear is in satisfactory working condition without damage or missing accessories, the owner marks the booking as returned and the deposit status transitions to <span className="text-[#22C55E] font-mono">Released</span>.
        </p>
      </section>

      {/* 11.0 */}
      <section id="cancellations" className="space-y-4 scroll-mt-28 border-t border-white/[0.08] pt-10">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#A78BFA]">
          <span>Section 11.0</span>
          <span aria-hidden="true">·</span>
          <span>Refund Schedule</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
          11.0 Cancellations & Refund Policy
        </h2>
        <p className="text-sm sm:text-base leading-relaxed">
          BorrowBox enforces a fair, balanced cancellation policy designed to protect lenders from lost bookings while giving borrowers scheduling flexibility:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base text-[#94A3B8]">
          <li>
            <strong className="text-[#F8FAFC]">Cancellation 24+ Hours Before Pickup:</strong> 100% refund of rental fees and 100% refund of security deposit.
          </li>
          <li>
            <strong className="text-[#F8FAFC]">Cancellation Under 24 Hours:</strong> Full security deposit refunded immediately; the first day&apos;s rental fee is disbursed to the owner to compensate for reserved calendar lock.
          </li>
          <li>
            <strong className="text-[#F8FAFC]">Owner Cancellation:</strong> If an owner cancels a confirmed booking, the borrower receives a 100% immediate refund of all funds paid.
          </li>
        </ul>
      </section>

      {/* 12.0 */}
      <section id="returns-handover" className="space-y-4 scroll-mt-28 border-t border-white/[0.08] pt-10">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#A78BFA]">
          <span>Section 12.0</span>
          <span aria-hidden="true">·</span>
          <span>Return Protocol</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
          12.0 Returns, Inspection & Handover Completion
        </h2>
        <p className="text-sm sm:text-base leading-relaxed">
          At the conclusion of the rental, the borrower and owner meet at the agreed location. Both parties inspect the equipment together:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base text-[#94A3B8]">
          <li>Check optical elements, sensor cleanlines, screens, and body housings for new cracks or deep scratches.</li>
          <li>Confirm all bundled accessories, batteries, chargers, caps, and cases are accounted for.</li>
          <li>Document any issues with timestamped photographs inside the BorrowBox booking thread notes.</li>
          <li>If all items match pickup condition, the owner confirms receipt and authorizes deposit release.</li>
        </ul>
      </section>

      {/* 13.0 */}
      <section id="damage-loss" className="space-y-4 scroll-mt-28 border-t border-white/[0.08] pt-10">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#A78BFA]">
          <span>Section 13.0</span>
          <span aria-hidden="true">·</span>
          <span>Dispute Resolution</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
          13.0 Damage, Loss & Dispute Resolution
        </h2>
        <p className="text-sm sm:text-base leading-relaxed">
          Borrowers are responsible for returning items in the exact condition received, normal fair wear-and-tear excepted (e.g. minor microscopic scuffs on camera strap eyelets that do not impair function).
        </p>
        <p className="text-sm sm:text-base leading-relaxed">
          In the event of physical damage, liquid ingress, lost components, or total loss:
        </p>
        <ol className="list-decimal pl-5 space-y-1.5 text-sm sm:text-base text-[#94A3B8]">
          <li>The owner logs a dispute in their Rentals Dashboard and attaches condition photographs before the deposit is released.</li>
          <li>BorrowBox Support opens an official investigation thread in our verified Support Desk.</li>
          <li>Both parties submit handover evidence, repair estimates from authorized service centers, and photo records.</li>
          <li>Security deposit funds remain securely held in escrow until mutual resolution or platform mediation completes.</li>
        </ol>
      </section>

      {/* 14.0 */}
      <section id="prohibited-activities" className="space-y-4 scroll-mt-28 border-t border-white/[0.08] pt-10">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#A78BFA]">
          <span>Section 14.0</span>
          <span aria-hidden="true">·</span>
          <span>Safety Restrictions</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
          14.0 Prohibited Items & Activities
        </h2>
        <p className="text-sm sm:text-base leading-relaxed">
          To maintain a safe community, the following items and behaviors are strictly banned on BorrowBox:
        </p>
        <div className="p-4 rounded-xl bg-[#161E2E] border border-[#EF4444]/30 space-y-2 text-xs text-[#CBD5E1]">
          <p className="font-semibold text-[#EF4444]">Strictly Prohibited on the Marketplace:</p>
          <ul className="list-disc pl-5 space-y-1 text-[#94A3B8]">
            <li>Firearms, weapons, ammunition, fireworks, or hazardous chemicals.</li>
            <li>Stolen property or equipment without documented proof of ownership.</li>
            <li>Medical devices requiring licensed prescriptions or controlled clinical oversight.</li>
            <li>Unregistered drone equipment operating outside DGCA guidelines.</li>
            <li>Illegal recording or covert surveillance apparatus.</li>
            <li>Harassment, abusive messaging, or discriminatory conduct towards community members.</li>
          </ul>
        </div>
      </section>

      {/* 15.0 */}
      <section id="limitation-liability" className="space-y-4 scroll-mt-28 border-t border-white/[0.08] pt-10">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#A78BFA]">
          <span>Section 15.0</span>
          <span aria-hidden="true">·</span>
          <span>Legal Disclaimers</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
          15.0 Limitation of Liability & Contact
        </h2>
        <p className="text-sm sm:text-base leading-relaxed">
          To the maximum extent permitted by applicable Indian law, BorrowBox and its contributors, mentors, and administrators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your access to or use of the marketplace, including equipment malfunction, lost creative project earnings, or personal injury resulting from improper tool operation.
        </p>
        <p className="text-sm sm:text-base leading-relaxed">
          For questions, legal notices, or formal clarifications regarding these Terms & Conditions, please contact us through our dedicated{' '}
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
          or open a request in our{' '}
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
