export type TeamMemberCategory = 'founder' | 'guide' | 'contributor';

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
    foundersHeading: string;
    guideHeading: string;
    contributorHeading: string;
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
    foundersHeading: 'Founders',
    guideHeading: 'Project Guide',
    contributorHeading: 'Technical Lead',
  },
};

/**
 * Centralized BorrowBox Team Data (`src/data/teamMembers.ts`).
 *
 * Order:
 * 1. Bhumika Khajuria (Co-Founder)
 * 2. Lipi Gupta (Co-Founder)
 * 3. Shruti Singh (Co-Founder)
 * 4. Gauresh Sharma (Co-Founder)
 * 5. Pradeep Kumar (Project Guide)
 * 6. Krutarth Maru (Technical Lead)
 */
export const TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'founder-1',
    order: 1,
    name: 'Bhumika Khajuria',
    role: 'Co-Founder',
    designation: 'Co-Founder',
    image: '/founder-1.png',
    fallbackImage: '/images/founder-1.png',
    bio: "Contributing to BorrowBox's vision of making everyday products accessible through a smarter and more convenient rental marketplace.",
    category: 'founder',
    groupLabel: 'Founding Team',
  },
  {
    id: 'founder-2',
    order: 2,
    name: 'Lipi Gupta',
    role: 'Co-Founder',
    designation: 'Co-Founder',
    image: '/founder-2.png',
    fallbackImage: '/images/founder-2.png',
    bio: 'Helping shape BorrowBox into a practical marketplace built around accessibility, convenience and community.',
    category: 'founder',
    groupLabel: 'Founding Team',
  },
  {
    id: 'founder-3',
    order: 3,
    name: 'Shruti Singh',
    role: 'Co-Founder',
    designation: 'Co-Founder',
    image: '/founder-3.png',
    fallbackImage: '/images/founder-3.png',
    bio: 'Working towards a simple and useful rental experience that helps people rent or earn from their belongings.',
    category: 'founder',
    groupLabel: 'Founding Team',
  },
  {
    id: 'founder-4',
    order: 4,
    name: 'Gauresh Sharma',
    role: 'Co-Founder',
    designation: 'Co-Founder',
    image: '/founder-4.png',
    fallbackImage: '/images/founder-4.png',
    bio: "Helping establish BorrowBox's foundation and build a marketplace where access matters more than ownership.",
    category: 'founder',
    groupLabel: 'Founding Team',
  },
  {
    id: 'guide',
    order: 5,
    name: 'Pradeep Kumar',
    role: 'Project Guide',
    designation: 'Project Guide',
    image: '/guide.png',
    fallbackImage: '/images/guide.png',
    bio: 'Providing academic and project-level guidance, helping the team maintain direction and approach challenges thoughtfully.',
    category: 'guide',
    groupLabel: 'Project Guidance',
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
    groupLabel: 'Technical Leadership',
    isTemporaryPhoto: true,
  },
];

export function getFounderMembers(
  members: TeamMember[] = TEAM_MEMBERS
): TeamMember[] {
  return members
    .filter((m) => m.category === 'founder')
    .sort((a, b) => a.order - b.order);
}

export function getGuideMember(
  members: TeamMember[] = TEAM_MEMBERS
): TeamMember {
  const guide = members.find((m) => m.category === 'guide');
  if (!guide) {
    throw new Error('Guide profile is missing from TEAM_MEMBERS configuration.');
  }
  return guide;
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
