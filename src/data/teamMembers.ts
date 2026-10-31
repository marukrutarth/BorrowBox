export type TeamMemberCategory = 'guide' | 'founder' | 'contributor';

export interface TeamMember {
  id: string;
  name: string;
  designation: string;
  image: string;
  bio: string;
  category: TeamMemberCategory;
}

export interface TeamPageContent {
  intro: {
    eyebrow: string;
    heading: string;
    description: string;
  };
  sections: {
    guideHeading: string;
    foundersHeading: string;
    contributorHeading: string;
  };
}

export const TEAM_PAGE_CONTENT: TeamPageContent = {
  intro: {
    eyebrow: 'OUR TEAM',
    heading: 'The People Behind BorrowBox',
    description:
      'A shared vision, thoughtful guidance and a team working to make access easier.',
  },
  sections: {
    guideHeading: 'Project Guide',
    foundersHeading: 'The Founding Team',
    contributorHeading: 'Behind the Platform',
  },
};

/**
 * Central Team Configuration for BorrowBox (/about).
 *
 * HOW TO CUSTOMIZE:
 * 1. Replace placeholder names ("Project Guide Name", "Founder Name 01", etc.)
 *    with the actual full names of each team member below.
 * 2. Update designations or biographies as needed.
 * 3. Place real portrait photographs (4:5 aspect ratio recommended) in:
 *    - public/images/team/guide.jpg
 *    - public/images/team/founder-1.jpg
 *    - public/images/team/founder-2.jpg
 *    - public/images/team/founder-3.jpg
 *    - public/images/team/founder-4.jpg
 *    - public/images/team/contributor.jpg
 */
export const TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'guide',
    name: 'Project Guide Name',
    designation: 'Project Guide & Mentor',
    image: '/images/team/guide.jpg',
    bio: 'Provided academic guidance, strategic direction and continuous mentorship throughout the development of BorrowBox.',
    category: 'guide',
  },
  {
    id: 'founder-1',
    name: 'Founder Name 01',
    designation: 'Co-founder',
    image: '/images/team/founder-1.jpg',
    bio: 'Focused on product vision, platform strategy and overall execution.',
    category: 'founder',
  },
  {
    id: 'founder-2',
    name: 'Founder Name 02',
    designation: 'Co-founder',
    image: '/images/team/founder-2.jpg',
    bio: 'Focused on user experience, interface design and customer journey.',
    category: 'founder',
  },
  {
    id: 'founder-3',
    name: 'Founder Name 03',
    designation: 'Co-founder',
    image: '/images/team/founder-3.jpg',
    bio: 'Focused on operations, marketplace structure and workflows.',
    category: 'founder',
  },
  {
    id: 'founder-4',
    name: 'Founder Name 04',
    designation: 'Co-founder',
    image: '/images/team/founder-4.jpg',
    bio: 'Focused on research, planning and business development.',
    category: 'founder',
  },
  {
    id: 'contributor',
    name: 'Technical Contributor Name',
    designation: 'Platform Development & Technical Contributor',
    image: '/images/team/contributor.jpg',
    bio: 'Contributed to the technical implementation, interface refinement and development support of BorrowBox.',
    category: 'contributor',
  },
];

export function getGuideMember(members: TeamMember[] = TEAM_MEMBERS): TeamMember {
  const guide = members.find((m) => m.category === 'guide');
  if (!guide) {
    throw new Error('Guide profile is missing from TEAM_MEMBERS configuration.');
  }
  return guide;
}

export function getFounderMembers(
  members: TeamMember[] = TEAM_MEMBERS
): TeamMember[] {
  return members.filter((m) => m.category === 'founder');
}

export function getContributorMember(
  members: TeamMember[] = TEAM_MEMBERS
): TeamMember {
  const contributor = members.find((m) => m.category === 'contributor');
  if (!contributor) {
    throw new Error(
      'Contributor profile is missing from TEAM_MEMBERS configuration.'
    );
  }
  return contributor;
}
