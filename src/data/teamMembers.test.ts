import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TEAM_MEMBERS,
  TEAM_PAGE_CONTENT,
  TECHNICAL_LEAD_IMAGE_PATH,
  getContributorMember,
  getFounderMembers,
  getGuideMember,
  getTechnicalLeadMember,
} from './teamMembers';

test('TEAM_PAGE_CONTENT matches exact section headings and supporting copy', () => {
  assert.equal(TEAM_PAGE_CONTENT.intro.eyebrow, 'OUR TEAM');
  assert.equal(
    TEAM_PAGE_CONTENT.intro.heading,
    'Meet the People Behind BorrowBox'
  );
  assert.equal(
    TEAM_PAGE_CONTENT.intro.description,
    'Behind every great idea is a team working to bring it to life. Meet the people building BorrowBox.'
  );
  assert.equal(TEAM_PAGE_CONTENT.sections.guideHeading, 'Project Guide');
  assert.equal(TEAM_PAGE_CONTENT.sections.foundersHeading, 'The Founding Team');
  assert.equal(
    TEAM_PAGE_CONTENT.sections.foundersSupportingText,
    'Four people, one shared vision. Meet the team building BorrowBox.'
  );
  assert.equal(TEAM_PAGE_CONTENT.sections.contributorHeading, 'Technical Lead');
});

test('TEAM_MEMBERS contains all 6 profiles in exact sequence: Project Guide -> 4 Founders -> Technical Lead', () => {
  assert.equal(TEAM_MEMBERS.length, 6);

  const expectedSequence = [
    {
      id: 'guide',
      name: 'Pradeep Kumar',
      role: 'Project Guide',
      image: '/guide.png',
      bio: 'Providing academic and project-level guidance, helping the team maintain direction and approach challenges thoughtfully.',
      category: 'guide',
    },
    {
      id: 'founder-1',
      name: 'Bhumika Khajuria',
      role: 'Co-Founder',
      image: '/founder-1.png',
      bio: "Contributing to BorrowBox's vision of making everyday products accessible through a smarter and more convenient rental marketplace.",
      category: 'founder',
    },
    {
      id: 'founder-2',
      name: 'Lipi Gupta',
      role: 'Co-Founder',
      image: '/founder-2.png',
      bio: 'Helping shape BorrowBox into a practical marketplace built around accessibility, convenience and community.',
      category: 'founder',
    },
    {
      id: 'founder-3',
      name: 'Shruti Singh',
      role: 'Co-Founder',
      image: '/founder-3.png',
      bio: 'Working towards a simple and useful rental experience that helps people rent or earn from their belongings.',
      category: 'founder',
    },
    {
      id: 'founder-4',
      name: 'Gauresh Sharma',
      role: 'Co-Founder',
      image: '/founder-4.png',
      bio: "Helping establish BorrowBox's foundation and build a marketplace where access matters more than ownership.",
      category: 'founder',
    },
    {
      id: 'contributor',
      name: 'Krutarth Maru',
      role: 'Technical Lead',
      image: '/contributor.jpg',
      bio: "Leading BorrowBox's technical development, including its architecture, frontend, backend and database integrations.",
      category: 'contributor',
    },
  ];

  TEAM_MEMBERS.forEach((member, idx) => {
    const exp = expectedSequence[idx];
    assert.equal(member.id, exp.id);
    assert.equal(member.order, idx + 1);
    assert.equal(member.name, exp.name);
    assert.equal(member.role, exp.role);
    assert.equal(member.designation, exp.role);
    assert.equal(member.image, exp.image);
    assert.equal(member.bio, exp.bio);
    assert.equal(member.category, exp.category);
  });

  const guide = getGuideMember();
  assert.equal(guide.name, 'Pradeep Kumar');
  assert.equal(guide.role, 'Project Guide');
  assert.equal(guide.image, '/guide.png');

  const founders = getFounderMembers();
  assert.equal(founders.length, 4);
  assert.deepEqual(
    founders.map((f) => f.name),
    ['Bhumika Khajuria', 'Lipi Gupta', 'Shruti Singh', 'Gauresh Sharma']
  );

  const techLead = getTechnicalLeadMember();
  assert.equal(techLead.name, 'Krutarth Maru');
  assert.equal(techLead.role, 'Technical Lead');
  assert.equal(techLead.image, TECHNICAL_LEAD_IMAGE_PATH);
  assert.equal(getContributorMember().name, 'Krutarth Maru');
});
