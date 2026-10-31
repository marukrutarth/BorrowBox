import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { TeamMember } from '../../data/teamMembers';

export interface GuideProfileProps {
  sectionHeading: string;
  guide: TeamMember;
}

export const GuideProfile: React.FC<GuideProfileProps> = ({
  sectionHeading,
  guide,
}) => {
  const [imageError, setImageError] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.section
      aria-labelledby="guide-section-heading"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.26 }}
      className="py-10 sm:py-14 lg:py-16 border-b border-white/[0.10]"
    >
      <div className="mb-6 sm:mb-8 flex items-center justify-between gap-4">
        <h2
          id="guide-section-heading"
          className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A78BFA]"
        >
          {sectionHeading}
        </h2>
        <div
          className="hidden sm:block h-px flex-1 max-w-[180px] bg-gradient-to-r from-transparent via-[#A78BFA]/25 to-transparent"
          aria-hidden="true"
        />
      </div>

      <motion.article
        whileHover={
          prefersReducedMotion
            ? undefined
            : {
                y: -4,
                transition: { duration: 0.25, ease: 'easeOut' },
              }
        }
        className="group relative rounded-2xl bg-[#17172D] hover:bg-[#20203A]/90 border border-white/[0.10] hover:border-[#A78BFA]/35 transition-colors duration-250 overflow-hidden shadow-[0_24px_60px_rgba(5,5,11,0.65)]"
      >
        {/* Subtle purple ambient glow inside the Guide card */}
        <div
          className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-[#8B5CF6]/15 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-[#A78BFA]/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 lg:gap-10 p-5 sm:p-7 lg:p-9 items-center">
          {/* Larger distinguished 4:5 portrait */}
          <div className="md:col-span-5 lg:col-span-4">
            <div className="relative aspect-[4/5] w-full max-w-[320px] mx-auto md:mx-0 rounded-xl overflow-hidden bg-[#20203A] border border-white/[0.10]">
              {!imageError ? (
                <img
                  src={guide.image}
                  alt={guide.name}
                  onError={() => setImageError(true)}
                  className="w-full h-full object-cover object-center transition-transform duration-300 ease-out group-hover:scale-[1.03]"
                />
              ) : (
                <div
                  className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#20203A] to-[#17172D] p-6 text-center"
                  role="img"
                  aria-label={guide.name}
                >
                  <div className="w-20 h-20 rounded-full bg-[#8B5CF6]/15 border border-[#A78BFA]/30 flex items-center justify-center mb-3">
                    <span className="text-lg font-semibold text-[#D8B4FE]">
                      PG
                    </span>
                  </div>
                  <span className="text-xs uppercase tracking-widest text-[#9292AB]">
                    Portrait Placeholder
                  </span>
                </div>
              )}

              {/* Subtle bottom gradient for editorial depth */}
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#080817]/75 via-transparent to-transparent"
                aria-hidden="true"
              />
            </div>
          </div>

          {/* Guide editorial details */}
          <div className="md:col-span-7 lg:col-span-8 space-y-4 sm:space-y-5">
            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#D8B4FE]">
                Academic &amp; Strategic Mentorship
              </p>
              <h3 className="text-2xl sm:text-3xl lg:text-[2rem] font-bold tracking-tight text-[#F8FAFC] leading-tight">
                {guide.name}
              </h3>
              <p className="text-sm sm:text-base font-medium text-[#A78BFA]">
                {guide.designation}
              </p>
            </div>

            <div className="h-px w-16 bg-[#8B5CF6]/40" aria-hidden="true" />

            <p className="text-sm sm:text-base text-[#9292AB] leading-relaxed max-w-2xl">
              {guide.bio}
            </p>
          </div>
        </div>
      </motion.article>
    </motion.section>
  );
};
