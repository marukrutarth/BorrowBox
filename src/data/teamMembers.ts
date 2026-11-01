export type TeamMemberCategory = 'guide' | 'founder' | 'contributor';

/**
 * Easy-to-replace image path constant for the Technical Lead profile.
 * Currently uses the supplied temporary image (`/contributor.jpg`).
 */
export const TECHNICAL_LEAD_IMAGE_PATH = '/contributor.jpg';

export interface TeamMember {
  id: string;
  order: number;
  name: string;
  role: string;
  designation: string;
  image: string;
  fallbackImage: string;
  bio: string;
  category: TeamMemberCategory;
  groupLabel: string;
  isTemporaryPhoto?: boolean;
}

export interface TeamPageContent {
  intro: {
    eyebrow: string;
    heading: string;
    description: string;
  };
  sections: {
    guideHeading: string;
    guideSupportingText: string;
    foundersHeading: string;
    foundersSupportingText: string;
    contributorHeading: string;
    contributorSupportingText: string;
  };
}

export const TEAM_PAGE_CONTENT: TeamPageContent = {
  intro: {
    eyebrow: 'OUR TEAM',
    heading: 'Meet the People Behind BorrowBox',
    description:
      'Behind every great idea is a team working to bring it to life. Meet the people building BorrowBox.',
  },
  sections: {
    guideHeading: 'Project Guide',
    guideSupportingText:
      'Academic mentorship and project-level guidance shaping BorrowBox.',
    foundersHeading: 'The Founding Team',
    foundersSupportingText:
      'Four people, one shared vision. Meet the team building BorrowBox.',
    contributorHeading: 'Technical Lead',
    contributorSupportingText:
      'Full-stack architecture, frontend, backend and database engineering.',
  },
};

/**
 * Centralized BorrowBox Team Data (`src/data/teamMembers.ts`).
 *
 * Exact Category & Profile Sequence:
 * Section 1 — Project Guide:
 *   1. Pradeep Kumar (Project Guide)
 * Section 2 — Founding Team:
 *   2. Bhumika Khajuria (Co-Founder)
 *   3. Lipi Gupta (Co-Founder)
 *   4. Shruti Singh (Co-Founder)
 *   5. Gauresh Sharma (Co-Founder)
 * Section 3 — Technical Lead:
 *   6. Krutarth Maru (Technical Lead)
 */
export const TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'guide',
    order: 1,
    name: 'Pradeep Kumar',
    role: 'Project Guide',
    designation: 'Project Guide',
    image: '/guide.png',
    fallbackImage: '/images/guide.png',
    bio: 'Providing academic and project-level guidance, helping the team maintain direction and approach challenges thoughtfully.',
    category: 'guide',
    groupLabel: 'Project Guide',
  },
  {
    id: 'founder-1',
    order: 2,
    name: 'Bhumika Khajuria',
    role: 'Co-Founder',
    designation: 'Co-Founder',
    image: '/founder-1.png',
    fallbackImage: '/images/founder-1.png',
    bio: "Contributing to BorrowBox's vision of making everyday products accessible through a smarter and more convenient rental marketplace.",
    category: 'founder',
    groupLabel: 'The Founding Team',
  },
  {
    id: 'founder-2',
    order: 3,
    name: 'Lipi Gupta',
    role: 'Co-Founder',
    designation: 'Co-Founder',
    image: '/founder-2.png',
    fallbackImage: '/images/founder-2.png',
    bio: 'Helping shape BorrowBox into a practical marketplace built around accessibility, convenience and community.',
    category: 'founder',
    groupLabel: 'The Founding Team',
  },
  {
    id: 'founder-3',
    order: 4,
    name: 'Shruti Singh',
    role: 'Co-Founder',
    designation: 'Co-Founder',
    image: '/founder-3.png',
    fallbackImage: '/images/founder-3.png',
    bio: 'Working towards a simple and useful rental experience that helps people rent or earn from their belongings.',
    category: 'founder',
    groupLabel: 'The Founding Team',
  },
  {
    id: 'founder-4',
    order: 5,
    name: 'Gauresh Sharma',
    role: 'Co-Founder',
    designation: 'Co-Founder',
    image: '/founder-4.png',
    fallbackImage: '/images/founder-4.png',
    bio: "Helping establish BorrowBox's foundation and build a marketplace where access matters more than ownership.",
    category: 'founder',
    groupLabel: 'The Founding Team',
  },
  {
    id: 'contributor',
    order: 6,
    name: 'Krutarth Maru',
    role: 'Technical Lead',
    designation: 'Technical Lead',
    image: TECHNICAL_LEAD_IMAGE_PATH,
    fallbackImage: '/images/contributor.jpg',
    bio: "Leading BorrowBox's technical development, including its architecture, frontend, backend and database integrations.",
    category: 'contributor',
    groupLabel: 'Technical Lead',
    isTemporaryPhoto: true,
  },
];

export function getGuideMember(
  members: TeamMember[] = TEAM_MEMBERS
): TeamMember {
  const guide = members.find((m) => m.category === 'guide');
  if (!guide) {
    throw new Error('Guide profile is missing from TEAM_MEMBERS configuration.');
  }
  return guide;
}

export function getFounderMembers(
  members: TeamMember[] = TEAM_MEMBERS
): TeamMember[] {
  return members
    .filter((m) => m.category === 'founder')
    .sort((a, b) => a.order - b.order);
}

export function getContributorMember(
  members: TeamMember[] = TEAM_MEMBERS
): TeamMember {
  const contributor = members.find((m) => m.category === 'contributor');
  if (!contributor) {
    throw new Error(
      'Technical Lead profile is missing from TEAM_MEMBERS configuration.'
    );
  }
  return contributor;
}

export function getTechnicalLeadMember(
  members: TeamMember[] = TEAM_MEMBERS
): TeamMember {
  return getContributorMember(members);
}
