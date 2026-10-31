import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  BORROWBOX_LOGO_ASSET_PATH,
  DEFAULT_INTRO_TIMING,
  markIntroAnimationPlayed,
} from '../utils/introAnimation';

interface LogoIntroAnimationProps {
  /** Whether the intro overlay is currently active */
  isActive: boolean;
  /** Callback fired once the 1.80s intro sequence finishes */
  onComplete: () => void;
  /** Optional configuration to persist skip state across refreshes (defaults to false so every refresh plays the intro) */
  persistAcrossRefreshes?: boolean;
}

/**
 * Minimal, Apple/Vercel/Linear-inspired brand introduction animation for BorrowBox.
 *
 * Exact 4-Stage Choreography (1.80s total):
 * 1. 0.00s - 0.45s (Logo Appearance): Deep black background appears immediately;
 *    official uploaded BorrowBox symbol logo fades in smoothly (0 -> 1) and scales up slightly (94% -> 100%).
 * 2. 0.45s - 0.95s (Logo Hold): Logo remains centred and clearly visible (100% scale, opacity 1).
 * 3. 0.95s - 1.30s (Logo Disappearance): Logo smoothly fades out (1 -> 0) with a slight scale-down (100% -> 96%).
 * 4. 1.30s - 1.80s (Website Reveal): Intro background smoothly fades away while homepage content
 *    appears with a subtle fade-in and slight upward movement.
 */
export const LogoIntroAnimation: React.FC<LogoIntroAnimationProps> = ({
  isActive,
  onComplete,
  persistAcrossRefreshes = false,
}) => {
  const [phase, setPhase] = useState<
    'logo-appear-and-hold' | 'logo-disappear' | 'website-reveal'
  >('logo-appear-and-hold');

  useEffect(() => {
    if (!isActive) return;

    let logoDisappearTimer: number | undefined;
    let websiteRevealTimer: number | undefined;
    let finishTimer: number | undefined;
    let hasStartedTimers = false;

    const startSequenceTimers = () => {
      if (hasStartedTimers) return;
      hasStartedTimers = true;

      setPhase('logo-appear-and-hold');
      markIntroAnimationPlayed({ persistAcrossRefreshes });

      // Stage 3 begins at 0.95s: Logo Disappearance (0.95s - 1.30s)
      logoDisappearTimer = window.setTimeout(() => {
        setPhase('logo-disappear');
      }, DEFAULT_INTRO_TIMING.logoFadeOutDelaySec * 1000);

      // Stage 4 begins at 1.30s: Website Reveal (1.30s - 1.80s)
      websiteRevealTimer = window.setTimeout(() => {
        setPhase('website-reveal');
      }, DEFAULT_INTRO_TIMING.overlayFadeOutDelaySec * 1000);

      // Complete & unmount overlay at 1.80s
      finishTimer = window.setTimeout(() => {
        onComplete();
      }, DEFAULT_INTRO_TIMING.totalDurationMs);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        startSequenceTimers();
      }
    };

    if (
      typeof document !== 'undefined' &&
      document.visibilityState === 'hidden'
    ) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    } else {
      startSequenceTimers();
    }

    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener(
          'visibilitychange',
          handleVisibilityChange
        );
      }
      if (logoDisappearTimer !== undefined) {
        window.clearTimeout(logoDisappearTimer);
      }
      if (websiteRevealTimer !== undefined) {
        window.clearTimeout(websiteRevealTimer);
      }
      if (finishTimer !== undefined) {
        window.clearTimeout(finishTimer);
      }
    };
  }, [isActive, onComplete, persistAcrossRefreshes]);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          key="borrowbox-logo-intro-overlay"
          data-testid="borrowbox-logo-intro-overlay"
          data-intro-phase={phase}
          aria-hidden="true"
          initial={{ opacity: 1 }}
          animate={{
            opacity: phase === 'website-reveal' ? 0 : 1,
          }}
          exit={{ opacity: 0 }}
          transition={{
            duration:
              phase === 'website-reveal'
                ? DEFAULT_INTRO_TIMING.overlayFadeOutSec
                : 0.1,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-[#070210] pointer-events-none select-none overflow-hidden"
        >
          {/* Deep black-obsidian canvas matching the exact uploaded BorrowBox logo backdrop and dark theme */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#070210_0%,#090D16_75%)]" />

          {/* Official uploaded BorrowBox symbol logo positioned perfectly in the centre */}
          <motion.div
            data-testid="borrowbox-logo-intro-symbol"
            initial={{
              opacity: 0,
              scale: DEFAULT_INTRO_TIMING.initialScale,
            }}
            animate={
              phase === 'logo-appear-and-hold'
                ? {
                    opacity: 1,
                    scale: DEFAULT_INTRO_TIMING.holdScale,
                  }
                : {
                    opacity: 0,
                    scale: DEFAULT_INTRO_TIMING.exitScale,
                  }
            }
            transition={{
              duration:
                phase === 'logo-appear-and-hold'
                  ? DEFAULT_INTRO_TIMING.logoFadeInSec
                  : DEFAULT_INTRO_TIMING.logoFadeOutSec,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="relative flex items-center justify-center w-36 h-36 sm:w-44 sm:h-44 aspect-square"
          >
            <img
              src={BORROWBOX_LOGO_ASSET_PATH}
              alt="BorrowBox"
              fetchPriority="high"
              decoding="sync"
              draggable={false}
              className="w-full h-full object-contain aspect-square"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
