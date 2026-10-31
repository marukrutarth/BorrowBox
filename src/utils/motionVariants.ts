import type { Variants, Transition } from 'motion/react';

/**
 * BorrowBox Motion System (Stage 2)
 *
 * Philosophy:
 * - Smooth, purposeful, premium ease-out transitions.
 * - Page entrance completes within 600–900ms without delaying user interaction.
 * - Scroll reveals use subtle 12–18px vertical movement over 450–650ms and trigger once.
 * - Strictly animates compositor-friendly properties (opacity, transform/scale/y).
 */

export const BB_EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const MOTION_TIMING = {
  // Page entrance sequence (total ~760ms, within 600-900ms budget)
  headerDurationSec: 0.42,
  heroItemDurationSec: 0.46,
  heroStaggerSec: 0.08,
  heroInitialDelaySec: 0.04,
  heroVisualDurationSec: 0.56,
  heroVisualDelaySec: 0.18,
  searchDurationSec: 0.48,
  searchDelaySec: 0.28,

  // Scroll reveal (450-650ms, 12-18px vertical offset)
  scrollRevealDurationSec: 0.52,
  scrollRevealOffsetPx: 16,
  scrollStaggerSec: 0.06,

  // Micro-interactions (200-250ms)
  cardHoverDurationSec: 0.22,
  buttonPressScale: 0.98,
} as const;

/**
 * Calculates total page entrance duration in milliseconds for verification.
 */
export function getTotalEntranceDurationMs(): number {
  const heroSequenceMs =
    (MOTION_TIMING.heroInitialDelaySec +
      MOTION_TIMING.heroStaggerSec * 3 +
      MOTION_TIMING.heroItemDurationSec) *
    1000;
  const searchSequenceMs =
    (MOTION_TIMING.searchDelaySec + MOTION_TIMING.searchDurationSec) * 1000;
  return Math.round(Math.max(heroSequenceMs, searchSequenceMs));
}

export const headerEntranceVariants: Variants = {
  hidden: { opacity: 0, y: -8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: MOTION_TIMING.headerDurationSec,
      ease: BB_EASE_OUT,
    },
  },
};

export const heroStaggerContainerVariants: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: MOTION_TIMING.heroInitialDelaySec,
      staggerChildren: MOTION_TIMING.heroStaggerSec,
    },
  },
};

export const heroItemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: MOTION_TIMING.heroItemDurationSec,
      ease: BB_EASE_OUT,
    },
  },
};

export const heroVisualVariants: Variants = {
  hidden: { opacity: 0, scale: 0.97, y: 12 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: MOTION_TIMING.heroVisualDurationSec,
      delay: MOTION_TIMING.heroVisualDelaySec,
      ease: BB_EASE_OUT,
    },
  },
};

export const searchEntranceVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: MOTION_TIMING.searchDurationSec,
      delay: MOTION_TIMING.searchDelaySec,
      ease: BB_EASE_OUT,
    },
  },
};

export const sectionScrollRevealVariants: Variants = {
  hidden: {
    opacity: 0,
    y: MOTION_TIMING.scrollRevealOffsetPx,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: MOTION_TIMING.scrollRevealDurationSec,
      ease: BB_EASE_OUT,
    },
  },
};

export const gridStaggerContainerVariants: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: MOTION_TIMING.scrollStaggerSec,
    },
  },
};

export const gridItemRevealVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.48,
      ease: BB_EASE_OUT,
    },
  },
};

export const mobileMenuPanelTransition: Transition = {
  duration: 0.24,
  ease: BB_EASE_OUT,
};

export const SCROLL_VIEWPORT_CONFIG = {
  once: true,
  amount: 0.12,
  margin: '0px 0px -36px 0px',
} as const;
