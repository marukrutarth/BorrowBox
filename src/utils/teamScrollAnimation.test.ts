import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clampProgress,
  computeCardVisualState,
  computeSectionScrollProgress,
  computeTimelinePosition,
  getActiveCardIndex,
  getScrollTargetForCardIndex,
} from './teamScrollAnimation';

test('clampProgress clamps values to [0, 1]', () => {
  assert.equal(clampProgress(-0.5), 0);
  assert.equal(clampProgress(0), 0);
  assert.equal(clampProgress(0.45), 0.45);
  assert.equal(clampProgress(1.8), 1);
  assert.equal(clampProgress(Number.NaN), 0);
});

test('computeSectionScrollProgress calculates normalized scroll progress', () => {
  // At top of sticky section (rectTop === stickyOffsetPx)
  assert.equal(computeSectionScrollProgress(80, 3800, 800, 80), 0);
  // Halfway down the 3000px scrollable runway
  assert.equal(computeSectionScrollProgress(80 - 1500, 3800, 800, 80), 0.5);
  // At bottom of sticky section
  assert.equal(computeSectionScrollProgress(80 - 3000, 3800, 800, 80), 1);
});

test('computeTimelinePosition visits all 6 team members in order with dwell plateaus', () => {
  const total = 6;
  assert.equal(computeTimelinePosition(0, total), 0);
  assert.equal(getActiveCardIndex(computeTimelinePosition(0, total), total), 0);

  // Stop 1 (20% progress -> index 1)
  assert.equal(computeTimelinePosition(0.2, total), 1);
  assert.equal(getActiveCardIndex(computeTimelinePosition(0.2, total), total), 1);

  // Stop 2 (40% progress -> index 2)
  assert.equal(computeTimelinePosition(0.4, total), 2);
  assert.equal(getActiveCardIndex(computeTimelinePosition(0.4, total), total), 2);

  // Stop 3 (60% progress -> index 3)
  assert.equal(computeTimelinePosition(0.6, total), 3);
  assert.equal(getActiveCardIndex(computeTimelinePosition(0.6, total), total), 3);

  // Stop 4 (80% progress -> index 4, Project Guide)
  assert.equal(computeTimelinePosition(0.8, total), 4);
  assert.equal(getActiveCardIndex(computeTimelinePosition(0.8, total), total), 4);

  // Stop 5 (100% progress -> index 5, Technical Lead)
  assert.equal(computeTimelinePosition(1, total), 5);
  assert.equal(getActiveCardIndex(computeTimelinePosition(1, total), total), 5);
});

test('computeCardVisualState transitions current card left and incoming card from right', () => {
  // Exactly at card 0
  const atZero = computeCardVisualState(0, 0);
  assert.equal(atZero.isActive, true);
  assert.equal(atZero.translateX, 0);
  assert.equal(atZero.scale, 1);
  assert.equal(atZero.opacity, 1);

  // Mid-transition between card 0 and card 1 (timelinePosition = 0.5)
  const exitingCard0 = computeCardVisualState(0, 0.5);
  const enteringCard1 = computeCardVisualState(1, 0.5);
  const offstageCard3 = computeCardVisualState(3, 0.5);

  assert.ok(exitingCard0.translateX < 0, 'Exiting card moves left');
  assert.ok(exitingCard0.scale < 1, 'Exiting card scales down slightly');
  assert.ok(
    exitingCard0.opacity > 0 && exitingCard0.opacity < 1,
    'Exiting card fades smoothly'
  );

  assert.ok(enteringCard1.translateX > 0, 'Entering card arrives from right');
  assert.ok(enteringCard1.scale < 1, 'Entering card scales up toward 1');
  assert.ok(
    enteringCard1.opacity > 0 && enteringCard1.opacity < 1,
    'Entering card fades in smoothly'
  );

  assert.equal(offstageCard3.opacity, 0);
  assert.equal(offstageCard3.isVisible, false);
});

test('getScrollTargetForCardIndex maps card index to exact scroll coordinate', () => {
  const topY = 400;
  const height = 3800;
  const viewport = 800;
  assert.equal(
    getScrollTargetForCardIndex(0, 6, topY, height, viewport, 80),
    320
  );
  assert.equal(
    getScrollTargetForCardIndex(5, 6, topY, height, viewport, 80),
    3320
  );
});
