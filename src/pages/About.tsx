import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { PageRoute } from '../components/Navbar';
import {
  TEAM_PAGE_CONTENT,
  getContributorMember,
  getFounderMembers,
  getGuideMember,
} from '../data/teamMembers';
import { ContributorProfile } from '../components/about/ContributorProfile';
import { FoundingTeam } from '../components/about/FoundingTeam';
import { GuideProfile } from '../components/about/GuideProfile';
import { TeamIntroduction } from '../components/about/TeamIntroduction';

export interface AboutProps {
  onNavigate: (route: PageRoute) => void;
}

const COSMIC_PARTICLES = [
  { top: '8%', left: '14%', size: '2px', opacity: 0.45 },
  { top: '16%', left: '84%', size: '2.5px', opacity: 0.55 },
  { top: '29%', left: '7%', size: '1.5px', opacity: 0.35 },
  { top: '44%', left: '92%', size: '2px', opacity: 0.4 },
  { top: '63%', left: '11%', size: '2px', opacity: 0.35 },
  { top: '78%', left: '88%', size: '2.5px', opacity: 0.45 },
  { top: '91%', left: '22%', size: '1.5px', opacity: 0.3 },
];

export const About: React.FC<AboutProps> = ({ onNavigate }) => {
  const prefersReducedMotion = useReducedMotion();
  const guide = getGuideMember();
  const founders = getFounderMembers();
  const contributor = getContributorMember();

  return (
    <div className="relative min-h-screen bg-[#05050B] text-[#F8FAFC] py-8 sm:py-12 lg:py-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Outer Cosmic Purple Atmospheric Lighting */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[920px] h-[420px] rounded-full bg-[#8B5CF6]/16 blur-[130px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[860px] h-[380px] rounded-full bg-[#A78BFA]/12 blur-[140px]"
        aria-hidden="true"
      />

      {/* Very subtle cosmic light points */}
      {COSMIC_PARTICLES.map((dot, idx) => (
        <span
          key={idx}
          style={{
            top: dot.top,
            left: dot.left,
            width: dot.size,
            height: dot.size,
            opacity: dot.opacity,
          }}
          className="pointer-events-none absolute rounded-full bg-[#D8B4FE] shadow-[0_0_8px_#A78BFA]"
          aria-hidden="true"
        />
      ))}

      <div className="relative z-10 max-w-[1280px] mx-auto">
        {/* Top Back Navigation */}
        <div className="mb-5 sm:mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              onNavigate({ page: 'home' });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-[#9292AB] hover:text-[#F8FAFC] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#A78BFA]" />
            <span>Back to BorrowBox</span>
          </button>

          <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#9292AB]">
            BorrowBox · Editorial Dossier
          </span>
        </div>

        {/* Main Central Panel (#080817, 20px radius, thin lavender border, top & bottom ambient glow) */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-[20px] bg-[#080817] border border-white/[0.10] shadow-[0_32px_90px_rgba(0,0,0,0.85),0_0_0_1px_rgba(167,139,250,0.08)] overflow-hidden px-5 sm:px-8 md:px-12 lg:px-16 py-8 sm:py-12 lg:py-16"
        >
          {/* Top and Bottom Ambient Panel Illumination */}
          <div
            className="pointer-events-none absolute -top-28 left-1/2 -translate-x-1/2 w-[75%] h-56 rounded-full bg-gradient-to-b from-[#8B5CF6]/20 via-[#A78BFA]/8 to-transparent blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute top-0 inset-x-12 h-px bg-gradient-to-r from-transparent via-[#D8B4FE]/45 to-transparent"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-28 left-1/2 -translate-x-1/2 w-[70%] h-56 rounded-full bg-gradient-to-t from-[#8B5CF6]/18 via-[#A78BFA]/6 to-transparent blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute bottom-0 inset-x-12 h-px bg-gradient-to-r from-transparent via-[#A78BFA]/35 to-transparent"
            aria-hidden="true"
          />

          <div className="relative z-10">
            <TeamIntroduction
              eyebrow={TEAM_PAGE_CONTENT.intro.eyebrow}
              heading={TEAM_PAGE_CONTENT.intro.heading}
              description={TEAM_PAGE_CONTENT.intro.description}
            />

            <GuideProfile
              sectionHeading={TEAM_PAGE_CONTENT.sections.guideHeading}
              guide={guide}
            />

            <FoundingTeam
              sectionHeading={TEAM_PAGE_CONTENT.sections.foundersHeading}
              founders={founders}
            />

            <ContributorProfile
              sectionHeading={TEAM_PAGE_CONTENT.sections.contributorHeading}
              contributor={contributor}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
};
