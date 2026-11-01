import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INDIA_STATES_AND_UTS,
  getAllIndianCities,
  getLocalitiesForCity,
  getStateForCity,
  searchIndianCities,
} from './indiaLocations';

test('Indian Location Dataset: contains all 28 states and 8 union territories', () => {
  const states = INDIA_STATES_AND_UTS.filter((s) => s.type === 'state');
  const uts = INDIA_STATES_AND_UTS.filter((s) => s.type === 'ut');

  assert.equal(states.length, 28, 'Should have exactly 28 states');
  assert.equal(uts.length, 8, 'Should have exactly 8 union territories');
  assert.equal(INDIA_STATES_AND_UTS.length, 36, 'Total states and UTs should be 36');
});

test('Indian Location Dataset: retrieves state accurately for major cities', () => {
  assert.equal(getStateForCity('Bengaluru'), 'Karnataka');
  assert.equal(getStateForCity('Mumbai'), 'Maharashtra');
  assert.equal(getStateForCity('Pune'), 'Maharashtra');
  assert.equal(getStateForCity('Chennai'), 'Tamil Nadu');
  assert.equal(getStateForCity('Hyderabad'), 'Telangana');
  assert.equal(getStateForCity('Kolkata'), 'West Bengal');
  assert.equal(getStateForCity('Kochi'), 'Kerala');
  assert.equal(getStateForCity('Jaipur'), 'Rajasthan');
  assert.equal(getStateForCity('Delhi NCR'), 'Delhi NCR');
});

test('Indian Location Dataset: searchIndianCities finds matching cities and states', () => {
  const bResults = searchIndianCities('bengal');
  assert.ok(bResults.some((r) => r.city === 'Bengaluru'));

  const pResults = searchIndianCities('pune');
  assert.ok(pResults.some((r) => r.city === 'Pune'));

  const emptyResults = searchIndianCities('nonexistentcityxyz123');
  assert.equal(emptyResults.length, 0);
});

test('Indian Location Dataset: getLocalitiesForCity returns curated or structured localities', () => {
  const blrLocalities = getLocalitiesForCity('Bengaluru');
  assert.ok(blrLocalities.includes('Indiranagar'));
  assert.ok(blrLocalities.includes('Koramangala'));

  const mumLocalities = getLocalitiesForCity('Mumbai');
  assert.ok(mumLocalities.includes('Bandra West'));

  const fallback = getLocalitiesForCity('SmallTownUnknown');
  assert.ok(fallback.length > 0);
});
