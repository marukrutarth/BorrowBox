/**
 * Pure configuration and session-lifecycle helpers for the BorrowBox Logo Intro Animation.
 */

export const BORROWBOX_LOGO_ASSET_PATH =
  '/assets/aistudio/679aa7af-911d-44f2-a60e-f75306d83251_42758b8b.png';

export const INTRO_SESSION_STORAGE_KEY = 'borrowbox_intro_played_session_v1';

export interface IntroTimingConfig {
  /** Total duration of the intro sequence in milliseconds (1.5s - 2.0s target) */
  totalDurationMs: number;
  /** Duration of the logo fade-in and subtle scale-up in seconds */
  logoFadeInSec: number;
  /** Time in seconds when the logo begins fading out */
  logoFadeOutDelaySec: number;
  /** Duration of the logo fade-out in seconds */
  logoFadeOutSec: number;
  /** Time in seconds when the dark overlay begins transitioning into the website background */
  overlayFadeOutDelaySec: number;
  /** Duration of the overlay background transition in seconds */
  overlayFadeOutSec: number;
  /** Delay before the website content begins its gentle upward reveal in seconds */
  contentRevealDelaySec: number;
  /** Duration of the website content reveal in seconds */
  contentRevealDurationSec: number;
}

export const DEFAULT_INTRO_TIMING: IntroTimingConfig = {
  totalDurationMs: 1800,
  logoFadeInSec: 0.48,
  logoFadeOutDelaySec: 0.94,
  logoFadeOutSec: 0.34,
  overlayFadeOutDelaySec: 1.28,
  overlayFadeOutSec: 0.52,
  contentRevealDelaySec: 1.26,
  contentRevealDurationSec: 0.54,
};

let hasPlayedInMemory = false;

/**
 * Determines whether the intro animation should play on initial application entry.
 * Respects `prefers-reduced-motion` and ensures the intro plays at most once per session
 * (never replaying on React re-renders or internal route navigation).
 */
export function shouldPlayIntroAnimation(options: {
  prefersReducedMotion: boolean;
  sessionAlreadyPlayed: boolean;
  inMemoryAlreadyPlayed?: boolean;
}): boolean {
  if (options.prefersReducedMotion) {
    return false;
  }
  const memoryPlayed =
    options.inMemoryAlreadyPlayed !== undefined
      ? options.inMemoryAlreadyPlayed
      : hasPlayedInMemory;
  if (memoryPlayed || options.sessionAlreadyPlayed) {
    return false;
  }
  return true;
}

export function markIntroAnimationPlayed(): void {
  hasPlayedInMemory = true;
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(INTRO_SESSION_STORAGE_KEY, '1');
    }
  } catch {
    // Ignore storage access errors in restricted environments
  }
}

export function readSessionIntroPlayed(): boolean {
  if (hasPlayedInMemory) return true;
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage.getItem(INTRO_SESSION_STORAGE_KEY) === '1';
    }
  } catch {
    // Ignore storage access errors
  }
  return false;
}

export function detectPrefersReducedMotion(): boolean {
  try {
    if (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function'
    ) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
  } catch {
    // Ignore matchMedia errors
  }
  return false;
}

export function resetIntroMemoryStateForTest(): void {
  hasPlayedInMemory = false;
}
