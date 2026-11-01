import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MOTION_TIMING,
  SCROLL_VIEWPORT_CONFIG,
  TEAM_VIEWPORT_CONFIG,
  getTotalEntranceDurationMs,
} from './motionVariants';

describe('BorrowBox Stage 2 & Website-Wide Motion System', () => {
  it('keeps total homepage entrance sequence between 600ms and 900ms', () => {
    const totalMs = getTotalEntranceDurationMs();
    assert.ok(
      totalMs >= 600 && totalMs <= 900,
      `Expected entrance duration between 600ms and 900ms, got ${totalMs}ms`
    );
  });

  it('configures scroll reveal animations within 450-650ms and 12-18px vertical offset', () => {
    const durationMs = MOTION_TIMING.scrollRevealDurationSec * 1000;
    const offsetPx = MOTION_TIMING.scrollRevealOffsetPx;

    assert.ok(
      durationMs >= 450 && durationMs <= 650,
      `Expected scroll reveal duration in 450-650ms, got ${durationMs}ms`
    );
    assert.ok(
      offsetPx >= 12 && offsetPx <= 18,
      `Expected scroll reveal offset in 12-18px, got ${offsetPx}px`
    );
    assert.equal(SCROLL_VIEWPORT_CONFIG.once, true);
    assert.equal(TEAM_VIEWPORT_CONFIG.once, true);
  });

  it('configures hover interactions (150-220ms), card entrances (350-500ms), and page transitions (180-300ms)', () => {
    assert.equal(MOTION_TIMING.buttonPressScale, 0.98);

    const cardHoverMs = MOTION_TIMING.cardHoverDurationSec * 1000;
    assert.ok(
      cardHoverMs >= 150 && cardHoverMs <= 220,
      `Expected card hover duration in 150-220ms, got ${cardHoverMs}ms`
    );

    const hoverMs = MOTION_TIMING.hoverInteractionDurationSec * 1000;
    assert.ok(
      hoverMs >= 150 && hoverMs <= 220,
      `Expected small hover duration in 150-220ms, got ${hoverMs}ms`
    );

    const cardEntranceMs = MOTION_TIMING.cardEntranceDurationSec * 1000;
    assert.ok(
      cardEntranceMs >= 350 && cardEntranceMs <= 500,
      `Expected card entrance duration in 350-500ms, got ${cardEntranceMs}ms`
    );

    const pageTransitionMs = MOTION_TIMING.pageTransitionDurationSec * 1000;
    assert.ok(
      pageTransitionMs >= 180 && pageTransitionMs <= 300,
      `Expected page transition duration in 180-300ms, got ${pageTransitionMs}ms`
    );
  });
});
