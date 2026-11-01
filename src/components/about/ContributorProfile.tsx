import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { TeamMember } from '../../data/teamMembers';
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
      aria-labelledby="contributor-section-heading"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="pt-10 sm:pt-14"
    >
      <div className="mb-6 sm:mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A78BFA] mb-1">
          Platform Engineering &amp; Architecture · 06
        </p>
        <h2
          id="contributor-section-heading"
          className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC]"
        >
          {sectionHeading}
        </h2>
      </div>

      <article
        data-testid={`team-card-${contributor.id}`}
        className="group relative rounded-2xl bg-[#161E2E] border border-white/[0.08] hover:border-[#8B5CF6]/40 transition-colors duration-300 overflow-hidden"
      >
        <div
          className="pointer-events-none absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-[#A78BFA] via-[#8B5CF6] to-transparent"
          aria-hidden="true"
        />

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 p-5 sm:p-7 lg:p-9 items-center">
          <div className="md:col-span-5 lg:col-span-4">
            <div className="relative aspect-[4/5] w-full max-w-[320px] mx-auto md:mx-0 rounded-xl overflow-hidden bg-[#111827] border border-white/[0.08]">
              <TeamPortrait
                member={contributor}
                className="w-full h-full"
                imageClassName="transition-transform duration-500 ease-out group-hover:scale-[1.03]"
              />
            </div>
          </div>

          <div className="md:col-span-7 lg:col-span-8 space-y-5">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#A78BFA]">
                {contributor.role}
              </p>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC] leading-tight">
                {contributor.name}
              </h3>
            </div>

            <div className="h-px w-16 bg-[#8B5CF6]/50" aria-hidden="true" />

            <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed max-w-2xl">
              {contributor.bio}
            </p>

            <div className="pt-3 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-4 text-xs text-[#94A3B8]">
              <div>
                <span className="text-[#F8FAFC] font-medium">Scope: </span>
                Architecture, Frontend, Backend &amp; Database Integrations
              </div>
              <div className="font-mono text-[#A78BFA]">06 / 06</div>
            </div>
          </div>
        </div>
      </article>
    </motion.section>
  );
};
