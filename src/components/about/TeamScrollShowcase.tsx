import React from 'react';
import {
  TEAM_PAGE_CONTENT,
  TeamMember,
  getContributorMember,
  getFounderMembers,
  getGuideMember,
} from '../../data/teamMembers';
import { ContributorProfile } from './ContributorProfile';
import { FoundingTeam } from './FoundingTeam';
import { GuideProfile } from './GuideProfile';

export interface TeamScrollShowcaseProps {
  members: TeamMember[];
}

/**
 * BorrowBox Our Team Section Showcase
 *
 * Renders the three distinct team categories in exact vertical sequence
 * with natural, unlocked scrolling:
 * 1. Section 1: Project Guide (Pradeep Kumar)
 * 2. Section 2: The Founding Team (All 4 founders visible simultaneously on desktop)
 * 3. Section 3: Technical Lead (Krutarth Maru)
 */
export const TeamScrollShowcase: React.FC<TeamScrollShowcaseProps> = ({
  members,
}) => {
  const guide = getGuideMember(members);
  const founders = getFounderMembers(members);
  const contributor = getContributorMember(members);

  return (
    <div data-testid="team-categories-sequence">
      {/* 1. SECTION 1: PROJECT GUIDE */}
      <GuideProfile
        sectionHeading={TEAM_PAGE_CONTENT.sections.guideHeading}
        guide={guide}
      />

      {/* 2. SECTION 2: THE FOUNDING TEAM (All 4 Founders Visible Simultaneously) */}
      <FoundingTeam
        sectionHeading={TEAM_PAGE_CONTENT.sections.foundersHeading}
        supportingText={TEAM_PAGE_CONTENT.sections.foundersSupportingText}
        founders={founders}
      />

      {/* 3. SECTION 3: TECHNICAL LEAD */}
      <ContributorProfile
        sectionHeading={TEAM_PAGE_CONTENT.sections.contributorHeading}
        contributor={contributor}
      />
    </div>
  );
};
