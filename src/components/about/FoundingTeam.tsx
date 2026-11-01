import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { TEAM_PAGE_CONTENT, TeamMember } from '../../data/teamMembers';
import {
  TEAM_VIEWPORT_CONFIG,
  founderGridContainerVariants,
  teamSectionRevealVariants,
} from '../../utils/motionVariants';
import { FounderCard } from './FounderCard';

export interface FoundingTeamProps {
  sectionHeading: string;
  supportingText?: string;
  founders: TeamMember[];
}

export const FoundingTeam: React.FC<FoundingTeamProps> = ({
  sectionHeading,
  supportingText = TEAM_PAGE_CONTENT.sections.foundersSupportingText,
  founders,
}) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section
      id="team-section-founding-team"
      data-testid="team-section-founding-team"
      aria-labelledby="founding-team-heading"
      className="py-10 sm:py-12 lg:py-14 border-b border-white/[0.08]"
    >
      {/* Section Heading & Supporting Text */}
      <motion.div
        initial={prefersReducedMotion ? false : 'hidden'}
        whileInView="visible"
        viewport={TEAM_VIEWPORT_CONFIG}
        variants={teamSectionRevealVariants}
        className="mb-8 sm:mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-3"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A78BFA] mb-1.5">
            Section 02 · Co-Founders
          </p>
          <h2
            id="founding-team-heading"
            className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC]"
          >
            {sectionHeading}
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-[#94A3B8] max-w-md">
          {supportingText}
        </p>
      </motion.div>

      {/* All 4 Founders Visible Simultaneously: 4 columns on desktop, 2x2 on tablet, 1 column on mobile */}
      <motion.div
        data-testid="founders-simultaneous-grid"
        initial={prefersReducedMotion ? false : 'hidden'}
        whileInView="visible"
        viewport={TEAM_VIEWPORT_CONFIG}
        variants={founderGridContainerVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6 items-stretch"
      >
        {founders.map((founder, idx) => (
          <FounderCard key={founder.id} founder={founder} index={idx} />
        ))}
      </motion.div>
    </section>
  );
};
