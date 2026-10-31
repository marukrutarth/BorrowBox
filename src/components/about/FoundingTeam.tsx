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
      className="py-10 sm:py-14 lg:py-16 border-b border-white/[0.10]"
    >
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1], delay: 0.28 }}
        className="mb-7 sm:mb-9 flex flex-col sm:flex-row sm:items-end justify-between gap-3"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A78BFA] mb-1.5">
            Core Leadership
          </p>
          <h2
            id="founding-team-heading"
            className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC]"
          >
            {sectionHeading}
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-[#9292AB] max-w-md">
          Four co-founders shaping product strategy, design, marketplace
          operations and growth.
        </p>
      </motion.div>

      {/* Desktop: 4 columns in a single balanced row; Tablet & Mobile: 2 columns */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {founders.map((founder, idx) => (
          <FounderCard key={founder.id} founder={founder} index={idx} />
        ))}
      </div>
    </section>
  );
};
