import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { TeamMember } from '../../data/teamMembers';
import { FounderCard } from './FounderCard';

export interface FoundingTeamProps {
  sectionHeading: string;
  founders: TeamMember[];
}

export const FoundingTeam: React.FC<FoundingTeamProps> = ({
  sectionHeading,
  founders,
}) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section
      aria-labelledby="founding-team-heading"
      className="py-10 sm:py-14 border-b border-white/[0.08]"
    >
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-3"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A78BFA] mb-1.5">
            Primary Leadership · 01–04
          </p>
          <h2
            id="founding-team-heading"
            className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC]"
          >
            {sectionHeading}
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-[#94A3B8] max-w-md">
          Four co-founders establishing BorrowBox&apos;s marketplace vision,
          community focus and everyday accessibility.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
        {founders.map((founder, idx) => (
          <FounderCard key={founder.id} founder={founder} index={idx} />
        ))}
      </div>
    </section>
  );
};
