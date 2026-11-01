import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { TEAM_PAGE_CONTENT, TeamMember } from '../../data/teamMembers';
import {
  TEAM_VIEWPORT_CONFIG,
  founderGridContainerVariants,
  teamSectionRevealVariants,
} from '../../utils/motionVariants';
import { FounderCard } from './FounderCard';

export interface ContributorProfileProps {
  sectionHeading: string;
  supportingText?: string;
  contributor: TeamMember;
}

export const ContributorProfile: React.FC<ContributorProfileProps> = ({
  sectionHeading,
  supportingText = TEAM_PAGE_CONTENT.sections.contributorSupportingText,
  contributor,
}) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section
      id="team-section-technical-lead"
      data-testid="team-section-technical-lead"
      aria-labelledby="contributor-section-heading"
      className="pt-10 sm:pt-12 lg:pt-14"
    >
      {/* Section Header */}
      <motion.div
        initial={prefersReducedMotion ? false : 'hidden'}
        whileInView="visible"
        viewport={TEAM_VIEWPORT_CONFIG}
        variants={teamSectionRevealVariants}
        className="mb-8 sm:mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-3"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A78BFA] mb-1.5">
            Section 03 · Technical Lead
          </p>
          <h2
            id="contributor-section-heading"
            className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC]"
          >
            {sectionHeading}
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-[#94A3B8] max-w-md">
          {supportingText}
        </p>
      </motion.div>

      {/* Identical 4-Column Grid & FounderCard Component so Card Width, Height, and Styling Match Founders 1:1 */}
      <motion.div
        data-testid="technical-lead-grid"
        initial={prefersReducedMotion ? false : 'hidden'}
        whileInView="visible"
        viewport={TEAM_VIEWPORT_CONFIG}
        variants={founderGridContainerVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6 items-stretch"
      >
        <FounderCard founder={contributor} index={0} />
      </motion.div>
    </section>
  );
};

