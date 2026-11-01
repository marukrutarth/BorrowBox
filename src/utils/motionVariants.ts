import type { Transition, Variants } from 'motion/react';

/**
 * BorrowBox Motion System
 *
 * Calibrated for smooth 60fps+ GPU-composited animations (`transform` & `opacity` only):
 * - Small hover interactions: 150ms–220ms
 * - Card entrances: 350ms–500ms
 * - Page transitions: 180ms–300ms
 * - Scroll reveals trigger once (`once: true`) via IntersectionObserver
 * - Respects `prefers-reduced-motion: reduce`
 */

export const EASE_OUT_EXPO: [number, number, number, number] = [
  0.22,
  1,
  0.36,
  1,
];

export const BB_EASE_OUT = EASE_OUT_EXPO;

export const MOTION_TIMING = {
  /** Header fade-in duration (s) */
  headerDurationSec: 0.34,
  /** Hero staggered item duration (s) */
  heroItemDurationSec: 0.42,
  /** Hero stagger interval between children (s) */
  heroStaggerSec: 0.06,
  /** Hero visual card delay after text starts (s) */
  heroVisualDelaySec: 0.14,
  /** Hero visual card duration (s) */
  heroVisualDurationSec: 0.5,
  /** Scroll-triggered section reveal duration (s) — within 350–500ms & 450–650ms */
  scrollRevealDurationSec: 0.46,
  /** Scroll-triggered vertical offset (px) */
  scrollRevealOffsetPx: 14,
  /** Card entrance duration (s) — 350ms–500ms */
  cardEntranceDurationSec: 0.42,
  /** Founder card stagger interval (s) */
  founderCardStaggerSec: 0.06,
  /** Card hover transition duration (s) — 200ms */
  cardHoverDurationSec: 0.2,
  /** Small hover interaction duration (s) — 150ms–220ms */
  hoverInteractionDurationSec: 0.18,
  /** Page transition duration (s) — 180ms–300ms */
  pageTransitionDurationSec: 0.22,
  /** Modal & dropdown transition duration (s) — 160ms–220ms */
  modalTransitionDurationSec: 0.2,
  dropdownTransitionDurationSec: 0.16,
  /** Button press scale factor */
  buttonPressScale: 0.98,
} as const;

/**
 * Total homepage entrance sequence duration in milliseconds:
 * heroVisualDelaySec (140ms) + heroVisualDurationSec (500ms) = 640ms
 * Strictly within 600ms–900ms.
 */
export function getTotalEntranceDurationMs(): number {
  return Math.round(
    (MOTION_TIMING.heroVisualDelaySec + MOTION_TIMING.heroVisualDurationSec) *
      1000
  );
}

export const headerEntranceVariants: Variants = {
  hidden: {
    opacity: 0,
    y: -6,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: MOTION_TIMING.headerDurationSec,
      ease: EASE_OUT_EXPO,
    },
  },
};

export const heroStaggerContainerVariants: Variants = {
  hidden: {
    opacity: 1,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: MOTION_TIMING.heroStaggerSec,
      delayChildren: 0.03,
    },
  },
};

export const heroItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 12,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: MOTION_TIMING.heroItemDurationSec,
      ease: EASE_OUT_EXPO,
    },
  },
};

export const heroVisualVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 14,
    scale: 0.985,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: MOTION_TIMING.heroVisualDelaySec,
      duration: MOTION_TIMING.heroVisualDurationSec,
      ease: EASE_OUT_EXPO,
    },
  },
};

export const searchEntranceVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 12,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.12,
      duration: 0.4,
      ease: EASE_OUT_EXPO,
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
      ease: EASE_OUT_EXPO,
    },
  },
};

/**
 * Shared Our Team Section Variants (Project Guide, Founding Team, Technical Lead)
 */
export const teamSectionRevealVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 16,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: MOTION_TIMING.cardEntranceDurationSec,
      ease: EASE_OUT_EXPO,
    },
  },
};

export const teamImageRevealVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.975,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.44,
      ease: EASE_OUT_EXPO,
    },
  },
};

export const teamTextStaggerContainerVariants: Variants = {
  hidden: {
    opacity: 1,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.055,
      delayChildren: 0.04,
    },
  },
};

export const teamTextItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 10,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.38,
      ease: EASE_OUT_EXPO,
    },
  },
};

export const founderGridContainerVariants: Variants = {
  hidden: {
    opacity: 1,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: MOTION_TIMING.founderCardStaggerSec,
      delayChildren: 0.04,
    },
  },
};

export const founderCardRevealVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 16,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: MOTION_TIMING.cardEntranceDurationSec,
      ease: EASE_OUT_EXPO,
    },
  },
};

export const SCROLL_VIEWPORT_CONFIG = {
  once: true,
  amount: 0.14,
  margin: '0px 0px -36px 0px',
} as const;

export const TEAM_VIEWPORT_CONFIG = {
  once: true,
  amount: 0.16,
  margin: '0px 0px -32px 0px',
} as const;

export const pageTransitionConfig: Transition = {
  duration: MOTION_TIMING.pageTransitionDurationSec,
  ease: EASE_OUT_EXPO,
};

export const dropdownMenuTransition: Transition = {
  duration: MOTION_TIMING.dropdownTransitionDurationSec,
  ease: EASE_OUT_EXPO,
};

export const modalSurfaceTransition: Transition = {
  duration: MOTION_TIMING.modalTransitionDurationSec,
  ease: EASE_OUT_EXPO,
};

export const mobileMenuPanelTransition: Transition = {
  duration: 0.22,
  ease: EASE_OUT_EXPO,
};
