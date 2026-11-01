import React, { useState } from 'react';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Coins,
  FileCheck2,
  HelpCircle,
  KeyRound,
  Layers,
  Percent,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  Truck,
  UploadCloud,
  UserCheck,
  Wallet,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PageRoute } from '../components/Navbar';
import { PRODUCT_IMAGES } from '../assets/imageRegistry';

export interface HowItWorksPageProps {
  onNavigate: (route: PageRoute) => void;
}

interface StepItem {
  number: string;
  title: string;
  shortDesc: string;
  details: string;
  icon: React.ComponentType<{ className?: string }>;
  tag: string;
}

const RENTER_STEPS: StepItem[] = [
  {
    number: '01',
    title: 'Browse & Discover Verified Gear',
    shortDesc: 'Search top-tier equipment from trusted lenders nearby.',
    details:
      'Search across 8 specialized categories—from full-frame mirrorless cameras and 4K cinema lenses to PS5 consoles, cordless rotary hammers, and camping tents. Every listing includes verified owner details and item condition.',
    icon: Search,
    tag: 'Discovery',
  },
  {
    number: '02',
    title: 'Filter by City & Availability',
    shortDesc: 'Instant matching across recognized cities and towns nationwide.',
    details:
      'Refine listings by metropolitan location, daily pricing, condition grade (Brand New, Like New, Good), and exact dates so you only see gear ready for pickup when you need it.',
    icon: Layers,
    tag: 'Precision',
  },
  {
    number: '03',
    title: 'Inspect Specs & Security Deposit',
    shortDesc: 'Full transparency before you initiate any reservation.',
    details:
      'Review detailed photo galleries, included cables and accessories, lender rules, and the exact refundable security deposit required. No surprise fees at checkout.',
    icon: FileCheck2,
    tag: 'Transparency',
  },
  {
    number: '04',
    title: 'Choose Dates with 10% Weekly Discount',
    shortDesc: 'Automatic 10% savings applied for any booking of 7 days or more.',
    details:
      'Pick your pickup and return dates with interactive calendar pickers. Bookings lasting 7 days or longer automatically calculate an extra 10% weekly discount applied directly to the base rental rate.',
    icon: Percent,
    tag: 'Smart Savings',
  },
  {
    number: '05',
    title: 'Submit Reservation Request',
    shortDesc: 'Fast confirmation with encrypted payment authorization.',
    details:
      'Send your rental request with optional notes describing your shoot, project, or trip. The lender is instantly notified and confirms the booking details.',
    icon: Calendar,
    tag: 'Quick Booking',
  },
  {
    number: '06',
    title: 'Refundable Deposit Held in Escrow',
    shortDesc: 'Safe, protected escrow custody—never transferred directly to the owner.',
    details:
      'Your security deposit is securely reserved in escrow. It is never paid out to the lender or withdrawn permanently, giving you total peace of mind throughout the rental window.',
    icon: ShieldCheck,
    tag: 'Escrow Protection',
  },
  {
    number: '07',
    title: 'In-Person Handover & 6-Digit Code',
    shortDesc: 'Mutual inspection and digital verification for safe custody transfer.',
    details:
      'Meet your lender at a convenient hub or agreed spot. Inspect the equipment together, test operation, and exchange the unique 6-digit handover verification code generated in your BorrowBox app to initiate active rental status.',
    icon: KeyRound,
    tag: 'Handover Security',
  },
  {
    number: '08',
    title: 'Return Gear & Automatic Deposit Release',
    shortDesc: 'Smooth wrap-up with prompt deposit restitution.',
    details:
      'Return the equipment on time in the same good condition. Once the lender confirms the return inspection, your escrow deposit is automatically released back to your original payment method.',
    icon: CheckCircle2,
    tag: 'Full Restitution',
  },
];

const LENDER_STEPS: StepItem[] = [
  {
    number: '01',
    title: 'Create Your Verified Lender Account',
    shortDesc: 'Fast profile onboarding with trusted identity verification.',
    details:
      'Sign in and complete your user profile. Connect your bank account details for seamless direct payouts and establish verified badges to attract top-rated borrowers.',
    icon: UserCheck,
    tag: 'Onboarding',
  },
  {
    number: '02',
    title: 'List Your Equipment in Minutes',
    shortDesc: 'State title, brand, category, and replacement value.',
    details:
      'Specify your item specs, manufacturer model, serial numbers (for your private records), replacement valuation, and guidelines for proper handling.',
    icon: Tag,
    tag: 'Listing Setup',
  },
  {
    number: '03',
    title: 'Upload Real Condition Photos',
    shortDesc: 'Clear visual proof builds trust and protects your gear.',
    details:
      'Upload high-definition photos showcasing current condition, included cases, spare batteries, and chargers so borrowers know exactly what to expect at handover.',
    icon: UploadCloud,
    tag: 'Visual Verification',
  },
  {
    number: '04',
    title: 'Set Daily Rates & Security Deposit',
    shortDesc: 'You control your pricing, deposit thresholds, and rental rules.',
    details:
      'Set competitive daily rates, define custom security deposit amounts to cover potential risks, and set minimum rental durations (e.g. 1-day or weekend minimums).',
    icon: Coins,
    tag: 'Pricing Control',
  },
  {
    number: '05',
    title: 'Accept Booking Requests',
    shortDesc: 'Review borrower profiles and approve rentals with one click.',
    details:
      'Receive instant alerts when a borrower requests your item. Check their profile, past rental history, and message them directly to coordinate handover timing.',
    icon: Clock,
    tag: 'Coordination',
  },
  {
    number: '06',
    title: 'Verify 6-Digit Handover Code',
    shortDesc: 'Never release gear without the digital handover verification code.',
    details:
      'At handover, verify the borrower’s ID, review item functionality together, and enter the borrower’s 6-digit code into your BorrowBox dashboard. This locks in the mutual contract and activates escrow protection.',
    icon: KeyRound,
    tag: 'Verified Handover',
  },
  {
    number: '07',
    title: 'Direct Bank Payout Upon Safe Return',
    shortDesc: 'Earnings transferred to your account within 24 hours of return.',
    details:
      'Inspect the returned equipment and confirm receipt in your dashboard. Your rental earnings are automatically transferred directly to your bank account without delays.',
    icon: Wallet,
    tag: 'Reliable Payouts',
  },
];

const FAQS = [
  {
    q: 'How does the refundable security deposit work?',
    a: 'When you book an item, the required security deposit is placed into an automated escrow hold. It is never paid out to the lender or converted to platform revenue. Once the rental concludes and the lender confirms the item was returned in good order, the escrow hold is released back to your original payment method immediately.',
  },
  {
    q: 'What is the 6-digit handover verification code?',
    a: 'BorrowBox generates a unique 6-digit cryptographic verification code for every confirmed booking. At the in-person meeting, the renter provides this code to the lender only after inspecting the gear. The lender inputs the code into their BorrowBox dashboard to officially start the rental period and activate BorrowBox protection.',
  },
  {
    q: 'How is the 10% weekly discount calculated?',
    a: 'Any booking with a duration of 7 consecutive days or longer automatically qualifies for a 10% weekly discount on the base daily rental charge. The calculation is executed automatically in the booking breakdown before you pay—no coupon codes required.',
  },
  {
    q: 'What happens if equipment is accidentally damaged?',
    a: 'BorrowBox requires all equipment to be inspected together at pickup and drop-off. In the rare event of damage, our support mediation desk facilitates an assessment based on time-stamped handover photos and manufacturer repair estimates. Minor accidental wear is evaluated fairly, and damages are covered strictly within the documented deposit and platform resolution framework.',
  },
  {
    q: 'Can I cancel my rental reservation before pickup?',
    a: 'Yes. Cancellations made at least 24 hours prior to the scheduled pickup time receive a 100% full refund of both the rental fee and the security deposit hold. Cancellations within 24 hours may be subject to a nominal one-day compensation fee to protect the lender who held the gear reserved.',
  },
  {
    q: 'When and how do lenders receive their earnings?',
    a: 'Lender earnings are paid out directly to their registered Indian bank account via NEFT/IMPS/UPI within 24 hours of the rental item being safely returned and inspected.',
  },
];

const FEATURED_GEAR = [
  {
    title: 'Sony Alpha A7 IV + 24-70mm GM',
    category: 'Photography',
    price: '₹1,850/day',
    deposit: '₹12,000 deposit in escrow',
    image: PRODUCT_IMAGES.sony_camera,
    discountBadge: '10% off for 7+ days',
  },
  {
    title: 'PlayStation 5 + 2 DualSense Controllers',
    category: 'Gaming',
    price: '₹650/day',
    deposit: '₹5,000 deposit in escrow',
    image: PRODUCT_IMAGES.ps5_console,
    discountBadge: 'Weekend & weekly rates',
  },
  {
    title: 'Bosch GBH 2-26 DRE Rotary Hammer',
    category: 'Tools',
    price: '₹350/day',
    deposit: '₹2,500 deposit in escrow',
    image: PRODUCT_IMAGES.bosch_drill,
    discountBadge: 'Includes 5 drill bits',
  },
  {
    title: 'Quechua 4-Person Waterproof Camping Tent',
    category: 'Outdoor',
    price: '₹400/day',
    deposit: '₹2,000 deposit in escrow',
    image: PRODUCT_IMAGES.camping_tent,
    discountBadge: 'Freshly sanitized',
  },
];

export const HowItWorksPage: React.FC<HowItWorksPageProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'renter' | 'lender'>('renter');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const steps = activeTab === 'renter' ? RENTER_STEPS : LENDER_STEPS;

  return (
    <div className="min-h-screen bg-[#0B0F19] text-[#F8FAFC]">
      {/* Top Breadcrumb Header */}
      <div className="border-b border-white/[0.08] bg-[#0E1526]/80 backdrop-blur-md sticky top-16 z-20">
        <div className="bb-container py-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-[#94A3B8]">
            <button
              type="button"
              onClick={() => onNavigate({ page: 'home' })}
              className="hover:text-[#F8FAFC] transition-colors cursor-pointer"
            >
              Home
            </button>
            <span>/</span>
            <span className="text-[#8B5CF6] font-semibold">How It Works</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[#94A3B8] font-medium hidden sm:inline">
              Verified Peer-to-Peer Protocol
            </span>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-24 border-b border-white/[0.08]">
        {/* Ambient Gradient Glows */}
        <div
          className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[900px] h-[380px] rounded-full bg-gradient-to-b from-[#8B5CF6]/20 via-[#6366F1]/10 to-transparent blur-[120px]"
          aria-hidden="true"
        />

        <div className="bb-container relative z-10 text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-xs font-semibold text-[#C4B5FD]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>The BorrowBox Rental Lifecycle</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#F8FAFC] leading-[1.12]">
            How BorrowBox Works.{' '}
            <span className="bg-gradient-to-r from-[#A78BFA] via-[#C084FC] to-[#818CF8] bg-clip-text text-transparent">
              Simple, secure, circular.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-[#94A3B8] leading-relaxed">
            Whether you need a cinema camera for a weekend shoot or want to turn
            your idle tools into recurring passive income, BorrowBox provides
            verified community handovers, escrow deposit security, and automatic
            weekly discounts.
          </p>

          {/* Interactive Mode Switcher */}
          <div className="pt-4 flex justify-center">
            <div className="inline-flex p-1.5 rounded-2xl bg-[#161E2E] border border-white/[0.12] shadow-xl">
              <button
                type="button"
                onClick={() => setActiveTab('renter')}
                className={`relative px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  activeTab === 'renter'
                    ? 'bg-[#8B5CF6] text-white shadow-lg shadow-[#8B5CF6]/30'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                For Renters (Borrow Gear)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('lender')}
                className={`relative px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  activeTab === 'lender'
                    ? 'bg-[#8B5CF6] text-white shadow-lg shadow-[#8B5CF6]/30'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                For Lenders (List & Earn)
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Core Pillars Bar */}
      <section className="py-8 bg-[#0E1526]/60 border-b border-white/[0.08]">
        <div className="bb-container grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-start gap-3.5 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <div className="w-10 h-10 rounded-lg bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 flex items-center justify-center text-[#A78BFA] shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[#F8FAFC]">Escrow Deposit Security</h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Deposits remain locked in neutral escrow—never paid to owners upfront and released automatically upon clean return.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <div className="w-10 h-10 rounded-lg bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 flex items-center justify-center text-[#A78BFA] shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[#F8FAFC]">6-Digit Handover Code</h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Both parties inspect the item at pickup; exchanging the digital 6-digit code starts the rental securely.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <div className="w-10 h-10 rounded-lg bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 flex items-center justify-center text-[#A78BFA] shrink-0">
              <Percent className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[#F8FAFC]">10% Weekly Discount</h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Rent for 7 days or longer to automatically receive a 10% discount on the rental fee, automatically applied.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Step by Step Progression */}
      <section className="py-16 sm:py-24">
        <div className="bb-container">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16 space-y-3">
            <span className="text-xs font-semibold tracking-wider uppercase text-[#8B5CF6]">
              {activeTab === 'renter' ? 'Renter Journey' : 'Lender Journey'}
            </span>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[#F8FAFC]">
              {activeTab === 'renter'
                ? '8 Simple Steps from Browsing to Return'
                : '7 Simple Steps to Safely Monetize Your Gear'}
            </h2>
            <p className="text-sm text-[#94A3B8]">
              {activeTab === 'renter'
                ? 'Everything you need to know about reserving, inspecting, and returning gear with total confidence.'
                : 'How to list in minutes, set deposits, verify borrowers, and receive reliable direct bank deposits.'}
            </p>
          </div>

          {/* Stepper Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, idx) => {
              const IconComponent = step.icon;
              return (
                <motion.div
                  key={`${activeTab}-${step.number}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: idx * 0.05 }}
                  className="group relative rounded-2xl bg-[#161E2E]/90 border border-white/[0.08] hover:border-[#8B5CF6]/40 p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:shadow-[#8B5CF6]/5"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-black font-mono text-[#8B5CF6]/60 group-hover:text-[#8B5CF6] transition-colors">
                        {step.number}
                      </span>
                      <span className="px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.08] text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                        {step.tag}
                      </span>
                    </div>

                    <div className="w-12 h-12 rounded-xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/25 flex items-center justify-center text-[#A78BFA] group-hover:scale-105 transition-transform">
                      <IconComponent className="w-6 h-6" />
                    </div>

                    <h3 className="text-base font-bold text-[#F8FAFC] leading-snug">
                      {step.title}
                    </h3>

                    <p className="text-xs text-[#94A3B8] leading-relaxed">
                      {step.details}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-[#64748B]">
                    <span>Step {idx + 1} of {steps.length}</span>
                    <span className="text-[#8B5CF6] font-medium">BorrowBox Protocol</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Gear in Action */}
      <section className="py-16 bg-[#0E1526]/50 border-y border-white/[0.08]">
        <div className="bb-container">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <span className="text-xs font-semibold tracking-wider uppercase text-[#8B5CF6]">
                Marketplace Realities
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC] mt-1">
                Real Equipment Available Right Now
              </h2>
              <p className="text-xs sm:text-sm text-[#94A3B8] mt-1">
                From professional cinematography rigs to home DIY power tools, verified community items ready in your city.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate({ page: 'browse' })}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.12] text-xs font-semibold text-[#F8FAFC] cursor-pointer self-start md:self-auto"
            >
              <span>Explore All Listings</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#8B5CF6]" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURED_GEAR.map((item, idx) => (
              <div
                key={idx}
                className="rounded-2xl bg-[#161E2E] border border-white/[0.08] overflow-hidden flex flex-col group hover:border-[#8B5CF6]/40 transition-colors"
              >
                <div className="relative h-44 overflow-hidden bg-slate-900">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-semibold text-[#C4B5FD] border border-white/10">
                    {item.category}
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="text-sm font-bold text-[#F8FAFC] line-clamp-1">
                      {item.title}
                    </h3>
                    <div className="flex items-center justify-between text-xs mt-1.5">
                      <span className="font-semibold text-white">{item.price}</span>
                      <span className="text-[11px] text-emerald-400 font-medium">{item.discountBadge}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/[0.06] text-[11px] text-[#94A3B8] flex items-center justify-between">
                    <span>{item.deposit}</span>
                    <button
                      type="button"
                      onClick={() => onNavigate({ page: 'browse' })}
                      className="text-[#8B5CF6] hover:underline font-medium cursor-pointer"
                    >
                      View →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive FAQ Section */}
      <section className="py-16 sm:py-24">
        <div className="bb-container max-w-4xl mx-auto">
          <div className="text-center mb-12 space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-semibold text-[#94A3B8]">
              <HelpCircle className="w-3.5 h-3.5 text-[#8B5CF6]" />
              <span>Got Questions?</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC]">
              Frequently Asked Questions About BorrowBox
            </h2>
            <p className="text-sm text-[#94A3B8]">
              Clear answers on verification, insurance, deposits, and dispute safety.
            </p>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  className="rounded-xl bg-[#161E2E]/90 border border-white/[0.08] overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.02]"
                  >
                    <span className="text-sm font-semibold text-[#F8FAFC]">
                      {faq.q}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#8B5CF6] shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-[#94A3B8] leading-relaxed border-t border-white/[0.04]">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="py-16 sm:py-20 border-t border-white/[0.08] bg-gradient-to-b from-[#0B0F19] to-[#111827]">
        <div className="bb-container text-center max-w-2xl mx-auto space-y-6">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[#F8FAFC]">
            Ready to experience smarter gear access?
          </h2>
          <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed">
            Join thousands of photographers, gamers, makers, and outdoor enthusiasts across all 28 states, 8 union territories, and communities throughout India.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigate({ page: 'browse' })}
              className="px-6 py-3 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-sm font-semibold shadow-lg shadow-[#8B5CF6]/30 cursor-pointer transition-all"
            >
              Browse Available Gear
            </button>
            <button
              type="button"
              onClick={() => onNavigate({ page: 'list-item' })}
              className="px-6 py-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.12] text-[#F8FAFC] text-sm font-semibold cursor-pointer transition-all"
            >
              List an Item for Rent
            </button>
            <button
              type="button"
              onClick={() => onNavigate({ page: 'contact' })}
              className="px-6 py-3 rounded-xl bg-transparent hover:bg-white/[0.04] text-[#94A3B8] hover:text-[#F8FAFC] text-sm font-medium cursor-pointer transition-all"
            >
              Have a Question?
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
