import React from 'react';
import { motion } from 'motion/react';
import { TeamMember } from '../../data/teamMembers';
import { founderCardRevealVariants } from '../../utils/motionVariants';
import { TeamPortrait } from './TeamPortrait';

export interface FounderCardProps {
  founder: TeamMember;
  index: number;
}

export const FounderCard: React.FC<FounderCardProps> = ({ founder, index }) => {
  return (
    <motion.article
      data-testid={`team-card-${founder.id}`}
      variants={founderCardRevealVariants}
      className="group relative h-full flex flex-col rounded-2xl bg-[#161E2E] hover:bg-[#1D293B] border border-white/[0.08] hover:border-[#8B5CF6]/40 bb-team-card-interactive overflow-hidden"
    >
      {/* Large, Properly Cropped 4:5 Portrait Photograph */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#111827] shrink-0">
        <TeamPortrait
          member={founder}
          priority={index < 2}
          className="w-full h-full"
        />

        {/* Gentle bottom gradient for natural tonal transition */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#161E2E] via-[#161E2E]/35 to-transparent"
          aria-hidden="true"
        />
      </div>

      {/* Consistent Founder Identity & Biography Alignment */}
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

          <p className="text-sm text-[#94A3B8] leading-relaxed min-h-[7.125rem]">
            {founder.bio}
          </p>
        </div>

        <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-[#94A3B8]">
          <span>{founder.groupLabel}</span>
          <span className="font-mono text-[#A78BFA]">
            0{index + 1} / {founder.category === 'contributor' ? '01' : '04'}
          </span>
        </div>
      </div>
    </motion.article>
  );
};
