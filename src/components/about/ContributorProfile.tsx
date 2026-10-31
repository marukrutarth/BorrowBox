import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { TeamMember } from '../../data/teamMembers';

export interface ContributorProfileProps {
  sectionHeading: string;
  contributor: TeamMember;
}

export const ContributorProfile: React.FC<ContributorProfileProps> = ({
  sectionHeading,
  contributor,
}) => {
  const [imageError, setImageError] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.section
      aria-labelledby="contributor-section-heading"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1], delay: 0.55 }}
      className="pt-10 sm:pt-14 lg:pt-16"
    >
      <div className="mb-6 sm:mb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A78BFA] mb-1.5">
          Engineering &amp; Architecture
        </p>
        <h2
          id="contributor-section-heading"
          className="text-xl sm:text-2xl font-bold tracking-tight text-[#F8FAFC]"
        >
          {sectionHeading}
        </h2>
      </div>

      <motion.article
        whileHover={
          prefersReducedMotion
            ? undefined
            : {
                y: -3,
                transition: { duration: 0.24, ease: 'easeOut' },
              }
        }
        className="group relative rounded-2xl bg-[#17172D]/90 hover:bg-[#20203A]/85 border border-white/[0.10] hover:border-[#A78BFA]/35 transition-colors duration-250 p-5 sm:p-6 lg:p-7 max-w-3xl"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-6">
          {/* Smaller, dignified 4:5 portrait */}
          <div className="relative aspect-[4/5] w-28 sm:w-32 shrink-0 rounded-xl overflow-hidden bg-[#20203A] border border-white/[0.10]">
            {!imageError ? (
              <img
                src={contributor.image}
                alt={contributor.name}
                onError={() => setImageError(true)}
                className="w-full h-full object-cover object-center transition-transform duration-250 ease-out group-hover:scale-[1.03]"
              />
            ) : (
              <div
                className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#20203A] to-[#17172D] p-2 text-center"
                role="img"
                aria-label={contributor.name}
              >
                <span className="text-xs font-semibold text-[#D8B4FE]">TC</span>
              </div>
            )}
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#080817]/60 via-transparent to-transparent"
              aria-hidden="true"
            />
          </div>

          {/* Contributor Text Details */}
          <div className="space-y-2.5">
            <div className="space-y-0.5">
              <h3 className="text-lg sm:text-xl font-semibold tracking-tight text-[#F8FAFC]">
                {contributor.name}
              </h3>
              <p className="text-xs sm:text-sm font-medium text-[#D8B4FE]">
                {contributor.designation}
              </p>
            </div>

            <p className="text-xs sm:text-sm text-[#9292AB] leading-relaxed max-w-xl">
              {contributor.bio}
            </p>
          </div>
        </div>
      </motion.article>
    </motion.section>
  );
};
