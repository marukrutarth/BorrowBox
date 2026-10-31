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
}

/**
 * Minimal, Apple/ASUS-inspired brand signature intro screen for BorrowBox.
 *
 * Strict Sequential Choreography (1.80s total):
 * 1. Full-screen dark background appears immediately.
 * 2. Centered BorrowBox symbol logo fades in with a very slight scale-up (0.94 -> 1.0).
 * 3. Holds briefly in center without any text or clutter.
 * 4. Symbol smoothly fades out completely while dark background stays solid.
 * 5. Intro background transitions into the website background as homepage content gently rises.
 */
export const LogoIntroAnimation: React.FC<LogoIntroAnimationProps> = ({
  isActive,
  onComplete,
}) => {
  const [phase, setPhase] = useState<
    'logo-enter-hold' | 'logo-fade-out' | 'overlay-dissolve'
  >('logo-enter-hold');

  useEffect(() => {
    if (!isActive) return;

    markIntroAnimationPlayed();

    const logoExitTimer = window.setTimeout(() => {
      setPhase('logo-fade-out');
    }, DEFAULT_INTRO_TIMING.logoFadeOutDelaySec * 1000);

    const overlayDissolveTimer = window.setTimeout(() => {
      setPhase('overlay-dissolve');
    }, DEFAULT_INTRO_TIMING.overlayFadeOutDelaySec * 1000);

    const finishTimer = window.setTimeout(() => {
      onComplete();
    }, DEFAULT_INTRO_TIMING.totalDurationMs);

    return () => {
      window.clearTimeout(logoExitTimer);
      window.clearTimeout(overlayDissolveTimer);
      window.clearTimeout(finishTimer);
    };
  }, [isActive, onComplete]);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          key="borrowbox-logo-intro-overlay"
          aria-hidden="true"
          initial={{ opacity: 1 }}
          animate={{
            opacity: phase === 'overlay-dissolve' ? 0 : 1,
          }}
          exit={{ opacity: 0 }}
          transition={{
            duration:
              phase === 'overlay-dissolve'
                ? DEFAULT_INTRO_TIMING.overlayFadeOutSec
                : 0.15,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-[#090D16] pointer-events-none select-none overflow-hidden"
        >
          {/* Seamless center backdrop matching the logo asset's deep obsidian-indigo tone */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#080214_0%,#090D16_58%)]" />

          {/* Centered BorrowBox Symbol Logo (symbol only, no text) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={
              phase === 'logo-enter-hold'
                ? { opacity: 1, scale: 1 }
                : { opacity: 0, scale: 1.025 }
            }
            transition={{
              duration:
                phase === 'logo-enter-hold'
                  ? DEFAULT_INTRO_TIMING.logoFadeInSec
                  : DEFAULT_INTRO_TIMING.logoFadeOutSec,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="relative flex items-center justify-center w-36 h-36 sm:w-44 sm:h-44"
          >
            <img
              src={BORROWBOX_LOGO_ASSET_PATH}
              alt=""
              fetchPriority="high"
              decoding="sync"
              draggable={false}
              className="w-full h-full object-contain mix-blend-lighten [mask-image:radial-gradient(circle_at_center,black_46%,transparent_72%)]"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
