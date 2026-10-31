import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

export interface TeamIntroductionProps {
  eyebrow: string;
  heading: string;
  description: string;
}

export const TeamIntroduction: React.FC<TeamIntroductionProps> = ({
  eyebrow,
  heading,
  description,
}) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <header className="relative pb-10 sm:pb-14 lg:pb-16 border-b border-white/[0.10]">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start lg:items-end">
        {/* Left: Small label */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
          className="lg:col-span-3"
        >
          <div className="inline-flex items-center gap-2.5">
            <span
              className="w-1.5 h-1.5 rounded-full bg-[#A78BFA] shadow-[0_0_10px_#8B5CF6]"
              aria-hidden="true"
            />
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[#D8B4FE]">
              {eyebrow}
            </span>
          </div>
        </motion.div>

        {/* Centre: Large heading */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1], delay: 0.12 }}
          className="lg:col-span-5"
        >
          <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-tight text-[#F8FAFC] leading-[1.12]">
            {heading}
          </h1>
        </motion.div>

        {/* Right: Supporting description */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          className="lg:col-span-4 lg:pl-4"
        >
          <p className="text-sm sm:text-base text-[#9292AB] leading-relaxed">
            {description}
          </p>
        </motion.div>
      </div>
    </header>
  );
};
