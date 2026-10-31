import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { TeamMember } from '../../data/teamMembers';

export interface FounderCardProps {
  founder: TeamMember;
  index: number;
}

export const FounderCard: React.FC<FounderCardProps> = ({ founder, index }) => {
  const [imageError, setImageError] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.article
      initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.48,
        ease: [0.22, 1, 0.36, 1],
        delay: 0.32 + index * 0.08,
      }}
      whileHover={
        prefersReducedMotion
          ? undefined
          : {
              y: -4,
              transition: { duration: 0.24, ease: 'easeOut' },
            }
      }
      className="group relative flex flex-col rounded-2xl bg-[#17172D] hover:bg-[#20203A] border border-white/[0.10] hover:border-[#A78BFA]/40 transition-colors duration-250 overflow-hidden shadow-[0_18px_40px_rgba(5,5,11,0.55)]"
    >
      {/* 4:5 Portrait Frame */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#20203A]">
        {!imageError ? (
          <img
            src={founder.image}
            alt={founder.name}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover object-center transition-transform duration-250 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#20203A] to-[#17172D] p-4 text-center"
            role="img"
            aria-label={founder.name}
          >
            <div className="w-14 h-14 rounded-full bg-[#8B5CF6]/15 border border-[#A78BFA]/30 flex items-center justify-center mb-2.5">
              <span className="text-sm font-semibold text-[#D8B4FE]">
                0{index + 1}
              </span>
            </div>
            <span className="text-[11px] uppercase tracking-widest text-[#9292AB]">
              Portrait Placeholder
            </span>
          </div>
        )}

        {/* Gentle bottom gradient for tonal blending and text readability */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#17172D] via-[#17172D]/20 to-transparent"
          aria-hidden="true"
        />
      </div>

      {/* Founder Details */}
      <div className="flex-1 flex flex-col p-4 sm:p-5 pt-3.5 sm:pt-4 space-y-2.5">
        <div className="space-y-1">
          <h3 className="text-base sm:text-lg font-semibold tracking-tight text-[#F8FAFC] leading-snug">
            {founder.name}
          </h3>
          <p className="text-xs sm:text-sm font-medium text-[#A78BFA]">
            {founder.designation}
          </p>
        </div>

        <p className="text-xs sm:text-sm text-[#9292AB] leading-relaxed">
          {founder.bio}
        </p>
      </div>
    </motion.article>
  );
};
