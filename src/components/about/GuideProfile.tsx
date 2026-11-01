import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { TeamMember } from '../../data/teamMembers';
import {
  TEAM_VIEWPORT_CONFIG,
  teamImageRevealVariants,
  teamSectionRevealVariants,
  teamTextItemVariants,
  teamTextStaggerContainerVariants,
} from '../../utils/motionVariants';
import { TeamPortrait } from './TeamPortrait';

export interface GuideProfileProps {
  sectionHeading: string;
  guide: TeamMember;
}

export const GuideProfile: React.FC<GuideProfileProps> = ({
  sectionHeading,
  guide,
}) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.section
      id="team-section-project-guide"
      data-testid="team-section-project-guide"
      aria-labelledby="guide-section-heading"
      initial={prefersReducedMotion ? false : 'hidden'}
      whileInView="visible"
      viewport={TEAM_VIEWPORT_CONFIG}
      variants={teamSectionRevealVariants}
      className="py-10 sm:py-12 lg:py-14 border-b border-white/[0.08]"
    >
      {/* Section Header */}
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A78BFA] mb-1.5">
            Section 01 · Academic &amp; Project Mentorship
          </p>
          <h2
            id="guide-section-heading"
            className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC]"
          >
            {sectionHeading}
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-[#94A3B8] max-w-md">
          Dedicated mentorship guiding BorrowBox&apos;s direction and academic
          foundation.
        </p>
      </div>

      {/* Distinguished Mentor Showcase Card (Completely distinct editorial layout from founder cards) */}
      <article
        data-testid={`team-card-${guide.id}`}
        className="group relative rounded-2xl bg-[#1D293B] border border-white/[0.08] hover:border-[#A78BFA]/35 bb-team-card-interactive overflow-hidden"
      >
        {/* Top Luminous Hairline Accent */}
        <div
          className="pointer-events-none absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-[#8B5CF6] via-[#A78BFA] to-transparent"
          aria-hidden="true"
        />

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 lg:gap-12 p-5 sm:p-7 lg:p-9 items-center">
          {/* Left: Larger Distinguished Mentor Portrait */}
          <motion.div
            variants={teamImageRevealVariants}
            className="md:col-span-5 lg:col-span-4"
          >
            <div className="relative aspect-[4/5] w-full max-w-[340px] mx-auto md:mx-0 rounded-xl overflow-hidden bg-[#111827] border border-white/[0.08]">
              <TeamPortrait
                member={guide}
                priority
                className="w-full h-full"
              />
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0B0F19]/65 to-transparent"
                aria-hidden="true"
              />
            </div>
          </motion.div>

          {/* Right: Balanced Editorial Mentor Profile & Staggered Copy */}
          <motion.div
            variants={teamTextStaggerContainerVariants}
            className="md:col-span-7 lg:col-span-8 space-y-5"
          >
            <motion.div
              variants={teamTextItemVariants}
              className="flex items-center justify-between gap-4 pb-3 border-b border-white/[0.08]"
            >
              <span className="text-xs font-medium uppercase tracking-[0.16em] text-[#94A3B8]">
                Academic &amp; Project Guidance
              </span>
              <span className="text-xs font-mono text-[#A78BFA]">
                Mentor Profile
              </span>
            </motion.div>

            <motion.div variants={teamTextItemVariants} className="space-y-2">
              <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.16em] text-[#A78BFA]">
                {guide.role}
              </p>
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#F8FAFC] leading-tight">
                {guide.name}
              </h3>
            </motion.div>

            <motion.div
              variants={teamTextItemVariants}
              className="h-px w-16 bg-[#8B5CF6]/55"
              aria-hidden="true"
            />

            <motion.p
              variants={teamTextItemVariants}
              className="text-sm sm:text-base lg:text-lg text-[#94A3B8] leading-relaxed max-w-2xl"
            >
              {guide.bio}
            </motion.p>

            <motion.div
              variants={teamTextItemVariants}
              className="pt-4 border-t border-white/[0.08] grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs"
            >
              <div>
                <p className="text-[#94A3B8]">Guidance Pillar</p>
                <p className="font-medium text-[#F8FAFC] mt-0.5">
                  Academic Mentorship &amp; Strategic Direction
                </p>
              </div>
              <div>
                <p className="text-[#94A3B8]">Role in BorrowBox</p>
                <p className="font-medium text-[#F8FAFC] mt-0.5">
                  Project Oversight &amp; Thoughtful Problem Solving
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </article>
    </motion.section>
  );
};
