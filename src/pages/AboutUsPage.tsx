import React from 'react';
import {
  ArrowLeft,
  Compass,
  DollarSign,
  Layers,
  Leaf,
  Plus,
  RefreshCw,
  ShieldCheck,
  Users,
  Zap,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { PageRoute } from '../components/Navbar';
import { PRODUCT_IMAGES } from '../assets/imageRegistry';
import { BORROWBOX_TRANSPARENT_SYMBOL_ASSET_PATH } from '../utils/introAnimation';
import { TEAM_MEMBERS, TEAM_PAGE_CONTENT } from '../data/teamMembers';
import { TeamIntroduction } from '../components/about/TeamIntroduction';
import { TeamScrollShowcase } from '../components/about/TeamScrollShowcase';
import { EASE_OUT_EXPO } from '../utils/motionVariants';

interface AboutUsPageProps {
  onNavigate: (route: PageRoute) => void;
}

const WHY_BORROWBOX_BENEFITS = [
  {
    icon: <Zap className="w-5 h-5 text-[#8B5CF6]" />,
    title: 'Access Without Ownership',
    description:
      'Use high-grade mirrorless cameras, gaming consoles, precision power tools, and camping tents whenever you need them without committing to steep retail price tags or depreciation.',
  },
  {
    icon: <DollarSign className="w-5 h-5 text-[#22C55E]" />,
    title: 'Earn From Unused Belongings',
    description:
      'High-utility equipment often spends 90% of the year sitting idle in closets. BorrowBox turns your gear into passive Indian Rupee earnings with built-in security deposit escrow.',
  },
  {
    icon: <Compass className="w-5 h-5 text-[#06B6D4]" />,
    title: 'Discover Useful Products',
    description:
      'Test items in real project conditions before making long-term purchase decisions. Rent a 4K projector for a weekend film screening or an alpine tent for a Himalayan trek.',
  },
  {
    icon: <Leaf className="w-5 h-5 text-[#10B981]" />,
    title: 'Make Better Use of Resources',
    description:
      'Sharing equipment prolongs product lifecycles, cuts down on electronic manufacturing waste, and encourages mindful, circular consumption within local communities.',
  },
  {
    icon: <Users className="w-5 h-5 text-[#A78BFA]" />,
    title: 'Connect With a Rental Community',
    description:
      'Meet fellow photographers, creators, gamers, and makers in your neighborhood through in-person, verified handovers across India.',
  },
];

const CORE_VALUES = [
  {
    number: '01',
    title: 'Accessibility',
    description:
      'Democratizing access to high-grade tools and creative technology for students, freelancers, hobbyists, and families across India.',
  },
  {
    number: '02',
    title: 'Trust',
    description:
      'Zero-trust verification architecture, mandatory photo ID checks, and transparent security deposit escrow protect every handover.',
  },
  {
    number: '03',
    title: 'Community',
    description:
      'Encouraging local collaboration where neighbors support each other’s creative aspirations and practical needs.',
  },
  {
    number: '04',
    title: 'Convenience',
    description:
      'Frictionless calendar booking, automated weekly discounts on 7+ days, and transparent neighborhood pickup points.',
  },
  {
    number: '05',
    title: 'Responsible Consumption',
    description:
      'Maximizing the utility of physical goods so fewer items end up gathering dust or prematurely discarded.',
  },
];

export const AboutUsPage: React.FC<AboutUsPageProps> = ({ onNavigate }) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="min-h-screen bg-[#0B0F19] text-[#F8FAFC] relative overflow-x-clip">
      {/* Lightweight Radial Gradient Atmosphere (Eliminates blur-[160px] GPU overdraw) */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1200px] h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.12)_0%,rgba(11,15,25,0)_72%)]"
        aria-hidden="true"
      />

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              onNavigate({ page: 'home' });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-[#94A3B8] hover:text-[#F8FAFC] bb-btn-interactive cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#8B5CF6]" />
            <span>Back to Marketplace</span>
          </button>

          <span className="text-[11px] font-mono uppercase tracking-wider text-[#A78BFA]">
            BorrowBox · Editorial
          </span>
        </div>

        {/* =========================================================================
            1. HERO SECTION
           ========================================================================= */}
        <section className="pt-6 pb-16 sm:pb-24 border-b border-white/[0.08]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Hero Text */}
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, ease: EASE_OUT_EXPO }}
              className="lg:col-span-7 space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#161E2E] border border-white/[0.08] text-xs font-semibold text-[#A78BFA]">
                <img
                  src={BORROWBOX_TRANSPARENT_SYMBOL_ASSET_PATH}
                  alt=""
                  width={16}
                  height={16}
                  className="w-4 h-4 object-contain"
                />
                <span>The Peer-to-Peer Rental Marketplace</span>
              </div>

              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-[#F8FAFC] leading-[1.08]">
                Access More.{' '}
                <span className="bg-gradient-to-r from-[#8B5CF6] via-[#A78BFA] to-[#D8B4FE] bg-clip-text text-transparent">
                  Own Less.
                </span>
              </h1>

              <p className="text-base sm:text-xl text-[#94A3B8] max-w-2xl leading-relaxed">
                BorrowBox makes it easier to access the things you need and earn
                from the things you already own.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onNavigate({ page: 'browse' });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs sm:text-sm font-semibold bb-glow-button cursor-pointer"
                >
                  <Compass className="w-4 h-4" />
                  <span>Explore Items</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onNavigate({ page: 'list-item' });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#161E2E] hover:bg-[#1D293B] border border-white/[0.08] text-xs sm:text-sm font-semibold text-[#F8FAFC] bb-btn-interactive cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-[#8B5CF6]" />
                  <span>List Your Item</span>
                </button>
              </div>
            </motion.div>

            {/* Right Hero Image Composition */}
            <motion.div
              initial={
                prefersReducedMotion ? false : { opacity: 0, scale: 0.975 }
              }
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.46, delay: 0.08, ease: EASE_OUT_EXPO }}
              className="lg:col-span-5 relative"
            >
              <div className="relative rounded-3xl bg-gradient-to-br from-[#161E2E] to-[#111827] border border-white/[0.12] p-4 shadow-2xl overflow-hidden group">
                <div className="aspect-[4/3] rounded-2xl overflow-hidden relative bg-[#1D293B]">
                  <img
                    src={PRODUCT_IMAGES.sony_camera}
                    alt="Sony Alpha Full Frame Mirrorless Camera on BorrowBox"
                    width={640}
                    height={480}
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-200 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19]/80 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#A78BFA] bg-[#0B0F19]/85 px-2 py-0.5 rounded">
                      Featured Marketplace Gear
                    </span>
                    <h3 className="text-base font-bold text-[#F8FAFC] mt-1 truncate">
                      Sony A7 IV · 4K 60p Mirrorless
                    </h3>
                    <p className="text-xs text-[#94A3B8]">
                      Rent for ₹1,800/day · Indiranagar, Bengaluru
                    </p>
                  </div>
                </div>

                {/* Overlaid Floating Feature Badge */}
                <div className="absolute -bottom-2 -right-2 p-3 rounded-2xl bg-[#0B0F19]/95 border border-white/[0.12] shadow-xl flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#8B5CF6]/20 flex items-center justify-center text-[#8B5CF6]">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#F8FAFC]">
                      100% Verified
                    </div>
                    <div className="text-[10px] text-[#94A3B8]">
                      Escrow Deposit Security
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* =========================================================================
            2. OUR STORY
           ========================================================================= */}
        <section className="py-16 sm:py-24 border-b border-white/[0.08]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
            {/* Story Visual Grid */}
            <div className="lg:col-span-5 order-2 lg:order-1 grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="rounded-2xl overflow-hidden bg-[#161E2E] border border-white/[0.08] aspect-[3/4] relative">
                  <img
                    src={PRODUCT_IMAGES.camping_tent}
                    alt="Camping and Outdoor Gear"
                    width={480}
                    height={640}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19]/60 to-transparent" />
                  <div className="absolute bottom-2.5 left-2.5 text-[11px] font-semibold text-[#F8FAFC]">
                    Outdoor &amp; Camping
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-[#161E2E] border border-white/[0.08]">
                  <div className="text-2xl font-bold font-mono text-[#8B5CF6]">
                    10% Off
                  </div>
                  <div className="text-xs text-[#94A3B8] mt-0.5">
                    Weekly discounts on all 7+ day rentals
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-6">
                <div className="p-4 rounded-2xl bg-[#161E2E] border border-white/[0.08]">
                  <div className="text-2xl font-bold font-mono text-[#22C55E]">
                    ₹ 0
                  </div>
                  <div className="text-xs text-[#94A3B8] mt-0.5">
                    Zero listing fee for gear owners
                  </div>
                </div>
                <div className="rounded-2xl overflow-hidden bg-[#161E2E] border border-white/[0.08] aspect-[3/4] relative">
                  <img
                    src={PRODUCT_IMAGES.ps5_console}
                    alt="PlayStation 5 Console"
                    width={480}
                    height={640}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19]/60 to-transparent" />
                  <div className="absolute bottom-2.5 left-2.5 text-[11px] font-semibold text-[#F8FAFC]">
                    Gaming &amp; Consoles
                  </div>
                </div>
              </div>
            </div>

            {/* Story Content */}
            <div className="lg:col-span-7 order-1 lg:order-2 space-y-6">
              <span className="text-xs font-mono uppercase tracking-wider text-[#A78BFA]">
                The Concept Behind BorrowBox
              </span>

              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#F8FAFC]">
                Why Buy When You Only Need It for the Weekend?
              </h2>

              <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed">
                Think about the most capable things stored in modern homes:
                high-resolution mirrorless cameras bought for a single vacation,
                power drills used twice a year to mount wall shelves, camping
                tents folded in cupboards between annual treks, and high-end
                projectors resting in drawers.
              </p>

              <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed">
                Ownership imposes financial friction. It requires substantial
                upfront capital, ongoing depreciation, and space. Yet down the
                street, an aspiring filmmaker, student creator, or weekend DIYer
                is looking for that exact piece of equipment.
              </p>

              <div className="p-5 rounded-2xl bg-[#161E2E] border border-white/[0.08] space-y-2">
                <h4 className="text-sm font-bold text-[#F8FAFC]">
                  Connecting People Who Need With People Who Own
                </h4>
                <p className="text-xs text-[#CBD5E1] leading-relaxed">
                  BorrowBox bridges this gap. We provide the digital
                  verification infrastructure, calendar booking, handover
                  verification codes, and security deposit escrow that enable
                  neighbors to share resources with total confidence.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            3. MISSION & VISION
           ========================================================================= */}
        <section className="py-16 sm:py-24 border-b border-white/[0.08]">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
            <span className="text-xs font-mono uppercase tracking-wider text-[#A78BFA]">
              Purpose &amp; Long-Term Horizon
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#F8FAFC]">
              Our Mission and Vision
            </h2>
            <p className="text-sm text-[#94A3B8]">
              Two complementary commitments guiding every feature we architect
              into BorrowBox.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Mission Box */}
            <div className="p-8 rounded-3xl bg-[#161E2E] border border-white/[0.08] relative overflow-hidden space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 flex items-center justify-center text-[#8B5CF6]">
                <Compass className="w-6 h-6" />
              </div>
              <span className="text-xs font-mono uppercase tracking-wider text-[#A78BFA]">
                Our Mission
              </span>
              <h3 className="text-2xl font-bold text-[#F8FAFC]">
                Lower the Barriers to Creative &amp; Practical Ambition
              </h3>
              <p className="text-sm text-[#94A3B8] leading-relaxed">
                To unlock the latent utility of quality equipment in
                neighborhoods across India. We believe creative projects, video
                shoots, weekend hobbies, and home renovations should never be
                cancelled simply because high-end equipment costs too much to
                purchase outright.
              </p>
            </div>

            {/* Vision Box */}
            <div className="p-8 rounded-3xl bg-[#161E2E] border border-white/[0.08] relative overflow-hidden space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#06B6D4]/20 border border-[#06B6D4]/40 flex items-center justify-center text-[#06B6D4]">
                <RefreshCw className="w-6 h-6" />
              </div>
              <span className="text-xs font-mono uppercase tracking-wider text-[#06B6D4]">
                Our Vision
              </span>
              <h3 className="text-2xl font-bold text-[#F8FAFC]">
                A Circular, Community-Powered Sharing Economy
              </h3>
              <p className="text-sm text-[#94A3B8] leading-relaxed">
                A sustainable future where temporary access replaces unnecessary
                ownership as the default instinct. A circular neighborhood
                network where resources flow efficiently, items are valued and
                preserved, and community members earn directly from the
                belongings they maintain.
              </p>
            </div>
          </div>
        </section>

        {/* =========================================================================
            4. WHY BORROWBOX
           ========================================================================= */}
        <section className="py-16 sm:py-24 border-b border-white/[0.08]">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
            <span className="text-xs font-mono uppercase tracking-wider text-[#A78BFA]">
              Tangible Value
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#F8FAFC]">
              Why Choose BorrowBox?
            </h2>
            <p className="text-sm text-[#94A3B8]">
              Engineered from the ground up for transparent, safe, peer-to-peer
              equipment rentals.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {WHY_BORROWBOX_BENEFITS.map((benefit, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-[#161E2E] border border-white/[0.08] hover:border-white/[0.16] transition-colors duration-200 space-y-3"
              >
                <div className="w-10 h-10 rounded-xl bg-[#1D293B] border border-white/[0.06] flex items-center justify-center">
                  {benefit.icon}
                </div>
                <h3 className="text-base font-bold text-[#F8FAFC]">
                  {benefit.title}
                </h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}

            {/* Active City Hubs Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-[#161E2E] to-[#1D293B] border border-[#8B5CF6]/30 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/20 flex items-center justify-center text-[#8B5CF6]">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#F8FAFC]">
                36 States &amp; Union Territories
              </h3>
              <p className="text-xs text-[#CBD5E1] leading-relaxed">
                Active community peer rentals across all 28 states and 8 union
                territories with verified neighborhood pickup locations
                throughout India.
              </p>
            </div>
          </div>
        </section>

        {/* =========================================================================
            5. OUR VALUES
           ========================================================================= */}
        <section className="py-16 sm:py-24 border-b border-white/[0.08]">
          <div className="max-w-2xl mb-12 space-y-3">
            <span className="text-xs font-mono uppercase tracking-wider text-[#A78BFA]">
              Guiding Principles
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#F8FAFC]">
              Our Values
            </h2>
            <p className="text-sm text-[#94A3B8]">
              The commitments that shape our product decisions, safety rules,
              and moderation policies.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {CORE_VALUES.map((val) => (
              <div
                key={val.number}
                className="p-5 rounded-2xl bg-[#161E2E] border border-white/[0.08] space-y-3"
              >
                <div className="text-xs font-mono font-bold text-[#8B5CF6]">
                  {val.number}
                </div>
                <h3 className="text-sm font-bold text-[#F8FAFC]">
                  {val.title}
                </h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  {val.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* =========================================================================
            6. OUR TEAM SECTION
           ========================================================================= */}
        <section
          id="our-team-section"
          className="py-16 sm:py-24 border-b border-white/[0.08]"
        >
          <TeamIntroduction
            eyebrow={TEAM_PAGE_CONTENT.intro.eyebrow}
            heading={TEAM_PAGE_CONTENT.intro.heading}
            description={TEAM_PAGE_CONTENT.intro.description}
            headingTag="h2"
          />
          <TeamScrollShowcase members={TEAM_MEMBERS} />
        </section>

        {/* =========================================================================
            7. FINAL CALL TO ACTION
           ========================================================================= */}
        <section className="py-16 sm:py-20 text-center">
          <div className="max-w-3xl mx-auto p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-[#161E2E] to-[#111827] border border-white/[0.12] space-y-6 shadow-2xl relative overflow-hidden">
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.18)_0%,rgba(17,24,39,0)_75%)]"
              aria-hidden="true"
            />
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#F8FAFC]">
              Make More Possible with BorrowBox.
            </h2>
            <p className="text-sm sm:text-base text-[#94A3B8] max-w-xl mx-auto leading-relaxed">
              Join thousands of neighbors across Indian cities discovering the
              freedom of temporary access and community earnings.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  onNavigate({ page: 'browse' });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs sm:text-sm font-semibold bb-glow-button cursor-pointer"
              >
                <Compass className="w-4 h-4" />
                <span>Explore Items</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onNavigate({ page: 'list-item' });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#111827] hover:bg-[#1D293B] border border-white/[0.08] text-xs sm:text-sm font-semibold text-[#F8FAFC] bb-btn-interactive cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#8B5CF6]" />
                <span>List Your Item</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
