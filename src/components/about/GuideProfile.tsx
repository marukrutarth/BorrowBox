import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { TeamMember } from '../../data/teamMembers';
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
      aria-labelledby="guide-section-heading"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="py-10 sm:py-14 border-b border-white/[0.08]"
    >
      <div className="mb-6 sm:mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A78BFA] mb-1">
            Academic &amp; Project Guidance · 05
          </p>
          <h2
            id="guide-section-heading"
            className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC]"
          >
            {sectionHeading}
          </h2>
        </div>
      </div>

      <article
        data-testid={`team-card-${guide.id}`}
        className="group relative rounded-2xl bg-[#1D293B] border border-white/[0.08] hover:border-[#A78BFA]/40 transition-colors duration-300 overflow-hidden"
      >
        <div
          className="pointer-events-none absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-[#8B5CF6] via-[#A78BFA] to-transparent"
          aria-hidden="true"
        />

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 p-5 sm:p-7 lg:p-9 items-center">
          <div className="md:col-span-5 lg:col-span-4">
            <div className="relative aspect-[4/5] w-full max-w-[320px] mx-auto md:mx-0 rounded-xl overflow-hidden bg-[#111827] border border-white/[0.08]">
              <TeamPortrait
                member={guide}
                className="w-full h-full"
                imageClassName="transition-transform duration-500 ease-out group-hover:scale-[1.03]"
              />
            </div>
          </div>

          <div className="md:col-span-7 lg:col-span-8 space-y-5">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#A78BFA]">
                {guide.role}
              </p>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC] leading-tight">
                {guide.name}
              </h3>
            </div>

            <div className="h-px w-16 bg-[#8B5CF6]/50" aria-hidden="true" />

            <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed max-w-2xl">
              {guide.bio}
            </p>

            <div className="pt-3 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-4 text-xs text-[#94A3B8]">
              <div>
                <span className="text-[#F8FAFC] font-medium">Focus: </span>
                Academic Mentorship &amp; Project Direction
              </div>
              <div className="font-mono text-[#A78BFA]">05 / 06</div>
            </div>
          </div>
        </div>
      </article>
    </motion.section>
  );
};
