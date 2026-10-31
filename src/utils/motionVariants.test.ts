import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MOTION_TIMING,
  SCROLL_VIEWPORT_CONFIG,
  getTotalEntranceDurationMs,
} from './motionVariants';

describe('BorrowBox Stage 2 Motion System', () => {
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
  });

  it('configures button press scale to 0.98 and card hover within 200-250ms', () => {
    assert.equal(MOTION_TIMING.buttonPressScale, 0.98);
    const cardHoverMs = MOTION_TIMING.cardHoverDurationSec * 1000;
    assert.ok(
      cardHoverMs >= 200 && cardHoverMs <= 250,
      `Expected card hover duration in 200-250ms, got ${cardHoverMs}ms`
    );
  });
});
