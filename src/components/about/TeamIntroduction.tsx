import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  TEAM_VIEWPORT_CONFIG,
  teamTextItemVariants,
  teamTextStaggerContainerVariants,
} from '../../utils/motionVariants';

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
    <motion.header
      initial={prefersReducedMotion ? false : 'hidden'}
      whileInView="visible"
      viewport={TEAM_VIEWPORT_CONFIG}
      variants={teamTextStaggerContainerVariants}
      className="relative pb-7 sm:pb-9 lg:pb-10 border-b border-white/[0.08]"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-10 items-start lg:items-end">
        <div className="lg:col-span-7 space-y-2.5">
          <motion.p
            variants={teamTextItemVariants}
            className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A78BFA]"
          >
            {eyebrow}
          </motion.p>

          <HeadingComponent
            variants={teamTextItemVariants}
            className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-tight text-[#F8FAFC] leading-[1.1]"
          >
            {heading}
          </HeadingComponent>
        </div>

        <motion.div
          variants={teamTextItemVariants}
          className="lg:col-span-5 lg:pl-4 space-y-3"
        >
          <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed">
            {description}
          </p>

          <div className="pt-2.5 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-[#94A3B8] border-t border-white/[0.08]">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[#A78BFA]">01</span>
              <span>Project Guide</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[#A78BFA]">02</span>
              <span>The Founding Team</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[#A78BFA]">03</span>
              <span>Technical Lead</span>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.header>
  );
};
