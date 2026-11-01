import React, { useEffect, useState } from 'react';
import { TeamMember } from '../../data/teamMembers';

export interface TeamPortraitProps {
  member: TeamMember;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export const TeamPortrait: React.FC<TeamPortraitProps> = ({
  member,
  className = '',
  imageClassName = '',
  priority = false,
}) => {
  const [currentSrc, setCurrentSrc] = useState<string>(member.image);
  const [triedFallback, setTriedFallback] = useState(false);
  const [hasFailedAll, setHasFailedAll] = useState(false);

  useEffect(() => {
    setCurrentSrc(member.image);
    setTriedFallback(false);
    setHasFailedAll(false);
  }, [member.image]);

  const handleImageError = () => {
    if (
      !triedFallback &&
      member.fallbackImage &&
      member.fallbackImage !== currentSrc
    ) {
      setTriedFallback(true);
      setCurrentSrc(member.fallbackImage);
      return;
    }
    setHasFailedAll(true);
  };

  const objectPositionClass = 'object-[50%_18%]';

  return (
    <div
      className={`relative overflow-hidden bg-[#111827] select-none ${className}`}
    >
      {!hasFailedAll ? (
        <img
          src={currentSrc}
          alt={`${member.name} — ${member.role}`}
          width={640}
          height={800}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onError={handleImageError}
          className={`w-full h-full object-cover ${objectPositionClass} bb-team-portrait-img ${imageClassName}`}
        />
      ) : (
        <div
          className="w-full h-full flex flex-col items-center justify-center bg-[#111827] p-6 text-center"
          role="img"
          aria-label={`${member.name} — ${member.role}`}
        >
          <div className="w-16 h-16 rounded-2xl bg-[#1D293B] border border-white/[0.08] flex items-center justify-center mb-3">
            <span className="text-lg font-semibold tracking-tight text-[#A78BFA]">
              {getInitials(member.name)}
            </span>
          </div>
          <span className="text-xs font-medium text-[#94A3B8]">
            {member.name}
          </span>
        </div>
      )}
    </div>
  );
};
