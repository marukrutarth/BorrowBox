import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BORROWBOX_LOGO_ASSET_PATH,
  DEFAULT_INTRO_TIMING,
  markIntroAnimationPlayed,
  resetIntroMemoryStateForTest,
  shouldPlayIntroAnimation,
} from './introAnimation';

describe('BorrowBox Logo Intro Animation Logic', () => {
  it('follows the exact 1.80s 4-stage timing and scale specification', () => {
    assert.equal(DEFAULT_INTRO_TIMING.totalDurationMs, 1800);
    // Stage 1: 0.00s - 0.45s Logo Appearance (94% -> 100%)
    assert.equal(DEFAULT_INTRO_TIMING.logoFadeInSec, 0.45);
    assert.equal(DEFAULT_INTRO_TIMING.initialScale, 0.94);
    assert.equal(DEFAULT_INTRO_TIMING.holdScale, 1.0);
    // Stage 2: 0.45s - 0.95s Logo Hold
    assert.equal(DEFAULT_INTRO_TIMING.logoFadeOutDelaySec, 0.95);
    // Stage 3: 0.95s - 1.30s Logo Disappearance (100% -> 96%)
    assert.equal(DEFAULT_INTRO_TIMING.logoFadeOutSec, 0.35);
    assert.equal(DEFAULT_INTRO_TIMING.exitScale, 0.96);
    // Stage 4: 1.30s - 1.80s Website Reveal
    assert.equal(DEFAULT_INTRO_TIMING.overlayFadeOutDelaySec, 1.3);
    assert.equal(DEFAULT_INTRO_TIMING.overlayFadeOutSec, 0.5);
    assert.equal(DEFAULT_INTRO_TIMING.contentRevealDelaySec, 1.3);
    assert.equal(DEFAULT_INTRO_TIMING.contentRevealDurationSec, 0.5);
    assert.equal(BORROWBOX_LOGO_ASSET_PATH, '/logo.png');
  });

  it('skips the intro animation when prefers-reduced-motion is enabled', () => {
    resetIntroMemoryStateForTest();
    assert.equal(
      shouldPlayIntroAnimation({
        prefersReducedMotion: true,
        inMemoryAlreadyPlayed: false,
      }),
      false
    );
  });

  it('plays on every website refresh by default (ignoring sessionStorage) while preventing replays during internal SPA navigation', () => {
    resetIntroMemoryStateForTest();
    // Plays even if a prior session flag existed when persistAcrossRefreshes is false (default)
    assert.equal(
      shouldPlayIntroAnimation({
        prefersReducedMotion: false,
        sessionAlreadyPlayed: true,
        persistAcrossRefreshes: false,
      }),
      true
    );

    // Once played in the current page load, internal route changes or React re-renders do not replay it
    markIntroAnimationPlayed();

    assert.equal(
      shouldPlayIntroAnimation({
        prefersReducedMotion: false,
      }),
      false
    );

    // Simulate a full browser refresh (which resets in-memory module state)
    resetIntroMemoryStateForTest();
    assert.equal(
      shouldPlayIntroAnimation({
        prefersReducedMotion: false,
      }),
      true
    );
  });
});
