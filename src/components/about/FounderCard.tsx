import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { TeamMember } from '../../data/teamMembers';
import { TeamPortrait } from './TeamPortrait';

export interface FounderCardProps {
  founder: TeamMember;
  index: number;
}

export const FounderCard: React.FC<FounderCardProps> = ({ founder, index }) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.article
      data-testid={`team-card-${founder.id}`}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration: 0.48,
        ease: [0.22, 1, 0.36, 1],
        delay: index * 0.06,
      }}
      className="group relative flex flex-col rounded-2xl bg-[#161E2E] hover:bg-[#1D293B] border border-white/[0.08] hover:border-[#8B5CF6]/40 transition-colors duration-300 overflow-hidden"
    >
      {/* 4:5 Portrait Frame */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#111827]">
        <TeamPortrait
          member={founder}
          priority={index < 2}
          className="w-full h-full"
          imageClassName="transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        />

        {/* Subtle editorial index badge */}
        <div className="absolute top-3.5 left-3.5 px-2.5 py-1 rounded-md bg-[#0B0F19]/80 backdrop-blur-sm border border-white/[0.08] text-[11px] font-mono font-medium text-[#A78BFA]">
          0{founder.order} / 06
        </div>

        {/* Gentle bottom gradient for tonal blending */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#161E2E] via-[#161E2E]/40 to-transparent"
          aria-hidden="true"
        />
      </div>

      {/* Founder Details */}
      <div className="flex-1 flex flex-col justify-between p-5 sm:p-6 space-y-4">
        <div className="space-y-2.5">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A78BFA]">
              {founder.role}
            </p>
            <h3 className="text-lg sm:text-xl font-bold tracking-tight text-[#F8FAFC] leading-snug">
              {founder.name}
            </h3>
          </div>

          <p className="text-sm text-[#94A3B8] leading-relaxed">
            {founder.bio}
          </p>
        </div>

        <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-[#94A3B8]">
          <span>Founding Team</span>
          <span className="font-mono text-[#A78BFA]">Founder 0{index + 1}</span>
        </div>
      </div>
    </motion.article>
  );
};
