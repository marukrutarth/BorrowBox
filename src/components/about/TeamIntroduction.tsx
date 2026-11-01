import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

export interface TeamIntroductionProps {
  eyebrow: string;
  heading: string;
  description: string;
  headingTag?: 'h1' | 'h2';
}

export const TeamIntroduction: React.FC<TeamIntroductionProps> = ({
  eyebrow,
  heading,
  description,
  headingTag = 'h1',
}) => {
  const prefersReducedMotion = useReducedMotion();
  const HeadingComponent = headingTag === 'h2' ? motion.h2 : motion.h1;

  return (
    <header className="relative pb-6 sm:pb-8 lg:pb-9 border-b border-white/[0.08]">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-10 items-start lg:items-end">
        <div className="lg:col-span-7 space-y-2.5">
          <motion.p
            initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A78BFA]"
          >
            {eyebrow}
          </motion.p>

          <HeadingComponent
            initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.45,
              ease: [0.22, 1, 0.36, 1],
              delay: 0.05,
            }}
            className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-tight text-[#F8FAFC] leading-[1.1]"
          >
            {heading}
          </HeadingComponent>
        </div>

        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.45,
            ease: [0.22, 1, 0.36, 1],
            delay: 0.1,
          }}
          className="lg:col-span-5 lg:pl-4 space-y-3"
        >
          <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed">
            {description}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-[#94A3B8] border-t border-white/[0.08]">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[#A78BFA]">01–04</span>
              <span>Founding Team</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[#A78BFA]">05</span>
              <span>Project Guide</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[#A78BFA]">06</span>
              <span>Technical Lead</span>
            </div>
          </div>
        </motion.div>
      </div>
    </header>
  );
};
