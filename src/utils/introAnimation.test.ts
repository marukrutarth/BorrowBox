import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BORROWBOX_TRANSPARENT_SYMBOL_ASSET_PATH,
  DEFAULT_INTRO_TIMING,
  ORIGINAL_UPLOADED_LOGO_PATH,
  markIntroAnimationPlayed,
  resetIntroMemoryStateForTest,
  shouldPlayIntroAnimation,
} from './introAnimation';

describe('BorrowBox Identity Reveal Logic', () => {
  it('follows the 2.0s - 2.5s 4-scene choreography and separates the transparent symbol from the original logo', () => {
    assert.ok(
      DEFAULT_INTRO_TIMING.totalDurationMs >= 2000 &&
        DEFAULT_INTRO_TIMING.totalDurationMs <= 2500,
      `Expected totalDurationMs (${DEFAULT_INTRO_TIMING.totalDurationMs}ms) to be between 2000ms and 2500ms`
    );
    assert.ok(
      DEFAULT_INTRO_TIMING.scene2StartMs > 0 &&
        DEFAULT_INTRO_TIMING.scene3StartMs > DEFAULT_INTRO_TIMING.scene2StartMs &&
        DEFAULT_INTRO_TIMING.scene4StartMs > DEFAULT_INTRO_TIMING.scene3StartMs &&
        DEFAULT_INTRO_TIMING.totalDurationMs > DEFAULT_INTRO_TIMING.scene4StartMs,
      'Scenes 1 -> 2 -> 3 -> 4 must progress strictly in chronological order'
    );
    assert.equal(
      BORROWBOX_TRANSPARENT_SYMBOL_ASSET_PATH,
      '/assets/borrowbox-symbol-transparent.svg'
    );
    assert.equal(ORIGINAL_UPLOADED_LOGO_PATH, '/logo.png');
    assert.notEqual(
      BORROWBOX_TRANSPARENT_SYMBOL_ASSET_PATH,
      ORIGINAL_UPLOADED_LOGO_PATH
    );
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

  it('plays on every website refresh by default while preventing replays during internal SPA navigation', () => {
    resetIntroMemoryStateForTest();
    assert.equal(
      shouldPlayIntroAnimation({
        prefersReducedMotion: false,
        sessionAlreadyPlayed: true,
        persistAcrossRefreshes: false,
      }),
      true
    );

    markIntroAnimationPlayed();

    assert.equal(
      shouldPlayIntroAnimation({
        prefersReducedMotion: false,
      }),
      false
    );

    resetIntroMemoryStateForTest();
    assert.equal(
      shouldPlayIntroAnimation({
        prefersReducedMotion: false,
      }),
      true
    );
  });
});
