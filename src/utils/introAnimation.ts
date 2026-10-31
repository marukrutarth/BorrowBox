/**
 * Pure configuration and lifecycle helpers for the BorrowBox Logo Intro Animation.
 */

export const BORROWBOX_LOGO_ASSET_PATH = '/logo.png';

export const INTRO_SESSION_STORAGE_KEY = 'borrowbox_intro_played_session_v1';

export interface IntroTimingConfig {
  /** Total duration of the intro sequence in milliseconds (1.80s target) */
  totalDurationMs: number;
  /** 0.00s - 0.45s: Duration of the logo fade-in and scale-up (0.94 -> 1.0) in seconds */
  logoFadeInSec: number;
  /** 0.45s - 0.95s: Time in seconds when the logo hold finishes and fade-out begins */
  logoFadeOutDelaySec: number;
  /** 0.95s - 1.30s: Duration of the logo fade-out and slight scale-down (1.0 -> 0.96) in seconds */
  logoFadeOutSec: number;
  /** 1.30s - 1.80s: Time in seconds when the dark intro overlay begins fading away */
  overlayFadeOutDelaySec: number;
  /** 1.30s - 1.80s: Duration of the intro overlay fade-out in seconds */
  overlayFadeOutSec: number;
  /** 1.30s: Delay before the website content begins its subtle fade-in and upward reveal in seconds */
  contentRevealDelaySec: number;
  /** 0.50s: Duration of the website content reveal in seconds */
  contentRevealDurationSec: number;
  /** Initial scale of the logo at 0.00s (94%) */
  initialScale: number;
  /** Hold scale of the logo from 0.45s - 0.95s (100%) */
  holdScale: number;
  /** Slight scale-down of the logo during disappearance 0.95s - 1.30s (96%) */
  exitScale: number;
}

export const DEFAULT_INTRO_TIMING: IntroTimingConfig = {
  totalDurationMs: 1800,
  logoFadeInSec: 0.45,
  logoFadeOutDelaySec: 0.95,
  logoFadeOutSec: 0.35,
  overlayFadeOutDelaySec: 1.3,
  overlayFadeOutSec: 0.5,
  contentRevealDelaySec: 1.3,
  contentRevealDurationSec: 0.5,
  initialScale: 0.94,
  holdScale: 1.0,
  exitScale: 0.96,
};

let hasPlayedInCurrentPageLoad = false;

/**
 * Determines whether the intro animation should play on initial application load/refresh.
 *
 * By default (`persistAcrossRefreshes: false`), the intro animation plays every time
 * the browser page is loaded or refreshed, and uses an in-memory guard so it never
 * replays during React re-renders or internal SPA route navigation.
 * Respects `prefers-reduced-motion` accessibility settings.
 */
export function shouldPlayIntroAnimation(options: {
  prefersReducedMotion: boolean;
  inMemoryAlreadyPlayed?: boolean;
  persistAcrossRefreshes?: boolean;
  sessionAlreadyPlayed?: boolean;
}): boolean {
  if (options.prefersReducedMotion) {
    return false;
  }

  const memoryPlayed =
    options.inMemoryAlreadyPlayed !== undefined
      ? options.inMemoryAlreadyPlayed
      : hasPlayedInCurrentPageLoad;

  if (memoryPlayed) {
    return false;
  }

  if (options.persistAcrossRefreshes && options.sessionAlreadyPlayed) {
    return false;
  }

  return true;
}

export function markIntroAnimationPlayed(options?: {
  persistAcrossRefreshes?: boolean;
}): void {
  hasPlayedInCurrentPageLoad = true;
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      if (options?.persistAcrossRefreshes) {
        window.sessionStorage.setItem(INTRO_SESSION_STORAGE_KEY, '1');
      } else {
        // Ensure no stale sessionStorage flag blocks the intro on page refresh
        window.sessionStorage.removeItem(INTRO_SESSION_STORAGE_KEY);
      }
    }
  } catch {
    // Ignore storage access errors in restricted environments
  }
}

export function readSessionIntroPlayed(options?: {
  persistAcrossRefreshes?: boolean;
}): boolean {
  if (hasPlayedInCurrentPageLoad) return true;
  if (!options?.persistAcrossRefreshes) {
    return false;
  }
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
  hasPlayedInCurrentPageLoad = false;
}
