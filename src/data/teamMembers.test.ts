import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TEAM_MEMBERS,
  TEAM_PAGE_CONTENT,
  getContributorMember,
  getFounderMembers,
  getGuideMember,
} from './teamMembers';

test('TEAM_PAGE_CONTENT matches exact editorial copy requirements', () => {
  assert.equal(TEAM_PAGE_CONTENT.intro.eyebrow, 'OUR TEAM');
  assert.equal(TEAM_PAGE_CONTENT.intro.heading, 'The People Behind BorrowBox');
  assert.equal(
    TEAM_PAGE_CONTENT.intro.description,
    'A shared vision, thoughtful guidance and a team working to make access easier.'
  );
  assert.equal(TEAM_PAGE_CONTENT.sections.foundersHeading, 'The Founding Team');
  assert.equal(
    TEAM_PAGE_CONTENT.sections.contributorHeading,
    'Behind the Platform'
  );
});

test('TEAM_MEMBERS contains exactly 6 profiles (1 guide, 4 founders, 1 contributor)', () => {
  assert.equal(TEAM_MEMBERS.length, 6);

  const guide = getGuideMember();
  assert.equal(guide.id, 'guide');
  assert.equal(guide.designation, 'Project Guide & Mentor');
  assert.equal(guide.image, '/images/team/guide.jpg');
  assert.equal(guide.category, 'guide');

  const founders = getFounderMembers();
  assert.equal(founders.length, 4);
  founders.forEach((founder, index) => {
    const num = index + 1;
    assert.equal(founder.id, `founder-${num}`);
    assert.equal(founder.designation, 'Co-founder');
    assert.equal(founder.image, `/images/team/founder-${num}.jpg`);
    assert.equal(founder.category, 'founder');
    assert.ok(founder.bio.length > 10);
  });

  const contributor = getContributorMember();
  assert.equal(contributor.id, 'contributor');
  assert.equal(
    contributor.designation,
    'Platform Development & Technical Contributor'
  );
  assert.equal(contributor.image, '/images/team/contributor.jpg');
  assert.equal(contributor.category, 'contributor');
});
