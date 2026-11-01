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

export interface ContributorProfileProps {
  sectionHeading: string;
  contributor: TeamMember;
}

export const ContributorProfile: React.FC<ContributorProfileProps> = ({
  sectionHeading,
  contributor,
}) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.section
      id="team-section-technical-lead"
      data-testid="team-section-technical-lead"
      aria-labelledby="contributor-section-heading"
      initial={prefersReducedMotion ? false : 'hidden'}
      whileInView="visible"
      viewport={TEAM_VIEWPORT_CONFIG}
      variants={teamSectionRevealVariants}
      className="pt-10 sm:pt-12 lg:pt-14"
    >
      {/* Section Header */}
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A78BFA] mb-1.5">
            Section 03 · Platform Engineering &amp; Architecture
          </p>
          <h2
            id="contributor-section-heading"
            className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC]"
          >
            {sectionHeading}
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-[#94A3B8] max-w-md">
          Leading BorrowBox&apos;s technical engineering, system architecture,
          and end-to-end platform execution.
        </p>
      </div>

      {/* Contemporary Technical Showcase Card (Visually distinct from both Project Guide and Founder cards) */}
      <article
        data-testid={`team-card-${contributor.id}`}
        className="group relative rounded-2xl bg-[#161E2E] border border-white/[0.08] hover:border-[#8B5CF6]/40 bb-team-card-interactive overflow-hidden"
      >
        {/* Top Technical Accent Line */}
        <div
          className="pointer-events-none absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-[#A78BFA] via-[#8B5CF6] to-transparent"
          aria-hidden="true"
        />

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 lg:gap-12 p-5 sm:p-7 lg:p-9 items-center">
          {/* Left: Larger Photograph */}
          <motion.div
            variants={teamImageRevealVariants}
            className="md:col-span-5 lg:col-span-4"
          >
            <div className="relative aspect-[4/5] w-full max-w-[340px] mx-auto md:mx-0 rounded-xl overflow-hidden bg-[#111827] border border-white/[0.08]">
              <TeamPortrait
                member={contributor}
                className="w-full h-full"
              />
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0B0F19]/65 to-transparent"
                aria-hidden="true"
              />
            </div>
          </motion.div>

          {/* Right: Balanced Technical & Editorial Text Layout */}
          <motion.div
            variants={teamTextStaggerContainerVariants}
            className="md:col-span-7 lg:col-span-8 space-y-5"
          >
            <motion.div
              variants={teamTextItemVariants}
              className="flex items-center justify-between gap-4 pb-3 border-b border-white/[0.08]"
            >
              <span className="text-xs font-medium uppercase tracking-[0.16em] text-[#94A3B8]">
                Engineering &amp; System Architecture
              </span>
              <span className="text-xs font-mono text-[#A78BFA]">
                Technical Leadership
              </span>
            </motion.div>

            <motion.div variants={teamTextItemVariants} className="space-y-2">
              <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.16em] text-[#A78BFA]">
                {contributor.role}
              </p>
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#F8FAFC] leading-tight">
                {contributor.name}
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
              {contributor.bio}
            </motion.p>

            {/* Technical Domain Matrix (Clean borderless micro-typography) */}
            <motion.div
              variants={teamTextItemVariants}
              className="pt-4 border-t border-white/[0.08] grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs"
            >
              <div>
                <p className="font-mono text-[11px] uppercase tracking-wider text-[#A78BFA]">
                  01 · Architecture
                </p>
                <p className="font-medium text-[#F8FAFC] mt-0.5">
                  Core Marketplace Systems
                </p>
              </div>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-wider text-[#A78BFA]">
                  02 · Application
                </p>
                <p className="font-medium text-[#F8FAFC] mt-0.5">
                  React, TypeScript &amp; Express
                </p>
              </div>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-wider text-[#A78BFA]">
                  03 · Data Layer
                </p>
                <p className="font-medium text-[#F8FAFC] mt-0.5">
                  Database &amp; Auth Integrations
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </article>
    </motion.section>
  );
};
