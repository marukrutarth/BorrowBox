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
  it('keeps total intro sequence between 1.5 and 2.0 seconds', () => {
    assert.ok(
      DEFAULT_INTRO_TIMING.totalDurationMs >= 1500 &&
        DEFAULT_INTRO_TIMING.totalDurationMs <= 2000,
      `Expected totalDurationMs (${DEFAULT_INTRO_TIMING.totalDurationMs}ms) to be between 1500ms and 2000ms`
    );
    assert.ok(
      DEFAULT_INTRO_TIMING.logoFadeOutDelaySec > DEFAULT_INTRO_TIMING.logoFadeInSec,
      'Logo should remain visible briefly after fading in before fading out'
    );
    assert.equal(
      BORROWBOX_LOGO_ASSET_PATH,
      '/assets/aistudio/679aa7af-911d-44f2-a60e-f75306d83251_42758b8b.png'
    );
  });

  it('skips the intro animation when prefers-reduced-motion is enabled', () => {
    resetIntroMemoryStateForTest();
    assert.equal(
      shouldPlayIntroAnimation({
        prefersReducedMotion: true,
        sessionAlreadyPlayed: false,
        inMemoryAlreadyPlayed: false,
      }),
      false
    );
  });

  it('plays once on first visit and prevents re-playing on re-renders or internal route navigation', () => {
    resetIntroMemoryStateForTest();
    assert.equal(
      shouldPlayIntroAnimation({
        prefersReducedMotion: false,
        sessionAlreadyPlayed: false,
      }),
      true
    );

    markIntroAnimationPlayed();

    assert.equal(
      shouldPlayIntroAnimation({
        prefersReducedMotion: false,
        sessionAlreadyPlayed: false,
      }),
      false
    );

    assert.equal(
      shouldPlayIntroAnimation({
        prefersReducedMotion: false,
        sessionAlreadyPlayed: true,
        inMemoryAlreadyPlayed: false,
      }),
      false
    );
  });
});
