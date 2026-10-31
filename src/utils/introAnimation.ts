/**
 * Pure configuration and lifecycle helpers for "The BorrowBox Identity Reveal" (`BorrowBoxIntro.tsx`).
 */

/** Standalone transparent BorrowBox brand symbol asset (no square background) */
export const BORROWBOX_TRANSPARENT_SYMBOL_ASSET_PATH =
  '/assets/borrowbox-symbol-transparent.svg';

/** Original uploaded logo asset kept untouched */
export const ORIGINAL_UPLOADED_LOGO_PATH = '/logo.png';

export const INTRO_SESSION_STORAGE_KEY = 'borrowbox_intro_played_session_v1';

export type IdentityRevealScene =
  | 'scene-1-darkness'
  | 'scene-2-symbol-formation'
  | 'scene-3-brand-identity'
  | 'scene-4-website-transition';

export interface IntroTimingConfig {
  /** Total duration of The BorrowBox Identity Reveal in milliseconds (2.0s - 2.5s target) */
  totalDurationMs: number;
  /** Scene 1 (Darkness): 0.00s - 0.30s ambient light development */
  scene2StartMs: number;
  /** Scene 2 (Symbol Formation): 0.30s - 1.10s mask reveal & element assembly */
  scene3StartMs: number;
  /** Scene 3 (Brand Identity): 1.10s - 1.85s settled symbol + BORROWBOX wordmark hold */
  scene4StartMs: number;
  /** Duration of the Scene 4 website transition in seconds (1.85s - 2.30s) */
  overlayFadeOutSec: number;
  /** Delay before the website homepage content begins its smooth reveal in seconds */
  contentRevealDelaySec: number;
  /** Duration of the website homepage content reveal in seconds */
  contentRevealDurationSec: number;
}

export const DEFAULT_INTRO_TIMING: IntroTimingConfig = {
  totalDurationMs: 2300,
  scene2StartMs: 280,
  scene3StartMs: 1100,
  scene4StartMs: 1820,
  overlayFadeOutSec: 0.48,
  contentRevealDelaySec: 1.82,
  contentRevealDurationSec: 0.5,
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
