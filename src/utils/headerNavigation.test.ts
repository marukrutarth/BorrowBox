import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DESKTOP_PRIMARY_NAV_ITEMS,
  SECONDARY_INFO_NAV_ITEMS,
  getCategoryDropdownItems,
  isPrimaryNavActive,
  isSecondaryDropdownActive,
} from './headerNavigation';

test('DESKTOP_PRIMARY_NAV_ITEMS prioritises Home, Browse, and List Your Item in exact order', () => {
  assert.deepEqual(
    DESKTOP_PRIMARY_NAV_ITEMS.map((item) => item.label),
    ['Home', 'Browse', 'List Your Item']
  );
  assert.deepEqual(
    DESKTOP_PRIMARY_NAV_ITEMS.map((item) => item.route.page),
    ['home', 'browse', 'list-item']
  );
});

test('SECONDARY_INFO_NAV_ITEMS preserves all secondary platform destinations without removing routes', () => {
  assert.deepEqual(
    SECONDARY_INFO_NAV_ITEMS.map((item) => item.route.page),
    ['how-it-works', 'about', 'team', 'support', 'contact']
  );
});

test('isPrimaryNavActive and isSecondaryDropdownActive evaluate active routes accurately', () => {
  assert.equal(isPrimaryNavActive('home', { page: 'home' }), true);
  assert.equal(isPrimaryNavActive('home', { page: 'browse' }), false);

  assert.equal(isPrimaryNavActive('browse', { page: 'browse' }), true);
  assert.equal(
    isPrimaryNavActive('browse', { page: 'details', itemId: 'cam-1' }),
    true
  );

  assert.equal(isPrimaryNavActive('list-item', { page: 'list-item' }), true);

  assert.equal(isSecondaryDropdownActive({ page: 'how-it-works' }), true);
  assert.equal(isSecondaryDropdownActive({ page: 'team' }), true);
  assert.equal(isSecondaryDropdownActive({ page: 'home' }), false);
});

test('getCategoryDropdownItems maps all rental categories to browse routes', () => {
  const categories = getCategoryDropdownItems();
  assert.ok(categories.length >= 8);
  assert.equal(categories[0].route.page, 'browse');
  assert.ok(categories.every((c) => Boolean(c.displayLabel)));
});
