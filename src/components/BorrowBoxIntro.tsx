import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  BORROWBOX_TRANSPARENT_SYMBOL_ASSET_PATH,
  DEFAULT_INTRO_TIMING,
  IdentityRevealScene,
  markIntroAnimationPlayed,
} from '../utils/introAnimation';

export interface BorrowBoxIntroProps {
  /** Whether the intro overlay is currently active */
  isActive: boolean;
  /** Callback fired once the 2.30s Identity Reveal finishes */
  onComplete: () => void;
  /** Optional configuration to persist skip state across refreshes (defaults to false so every refresh plays the intro) */
  persistAcrossRefreshes?: boolean;
}

/**
 * "The BorrowBox Identity Reveal"
 *
 * Art-directed standalone brand introduction built around a custom transparent
 * recreation of the BorrowBox symbol (electric purple 'B' monogram, isometric 3D
 * rental parcel box with tape bookmark, tapered orbital swoosh, and 3 spark ticks)
 * paired with the aligned BORROWBOX wordmark.
 *
 * 4-Scene Choreography (~2.30s total):
 * - Scene 1 (Darkness, 0.00s - 0.28s): Deep charcoal (#0B0F19) canvas; subtle purple ambient light develops in the centre.
 * - Scene 2 (Symbol Formation, 0.28s - 1.10s): Concentrated light core expands; standalone BorrowBox symbol reveals via smooth mask and natural element assembly (B monolith -> isometric parcel box -> tapered orbital swoosh -> 3 spark ticks).
 * - Scene 3 (Brand Identity, 1.10s - 1.82s): Completed symbol settles into natural proportions; BORROWBOX wordmark rises underneath with a subtle purple highlight; holds composition briefly.
 * - Scene 4 (Website Transition, 1.82s - 2.30s): Symbol and wordmark subtly dissolve into the background while the #0B0F19 canvas smoothly transitions to reveal the BorrowBox homepage.
 */
export const BorrowBoxIntro: React.FC<BorrowBoxIntroProps> = ({
  isActive,
  onComplete,
  persistAcrossRefreshes = false,
}) => {
  const [scene, setScene] = useState<IdentityRevealScene>('scene-1-darkness');
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!isActive) return;

    let cancelled = false;
    let activeTimeout: number | undefined;
    let activeRaf: number | undefined;

    const waitMsAndPaint = (ms: number, next: () => void) => {
      activeTimeout = window.setTimeout(() => {
        if (cancelled) return;
        activeRaf = window.requestAnimationFrame(() => {
          if (cancelled) return;
          next();
        });
      }, ms);
    };

    setScene('scene-1-darkness');
    markIntroAnimationPlayed({ persistAcrossRefreshes });

    const scene1Duration = DEFAULT_INTRO_TIMING.scene2StartMs;
    const scene2Duration =
      DEFAULT_INTRO_TIMING.scene3StartMs - DEFAULT_INTRO_TIMING.scene2StartMs;
    const scene3Duration =
      DEFAULT_INTRO_TIMING.scene4StartMs - DEFAULT_INTRO_TIMING.scene3StartMs;
    const scene4Duration =
      DEFAULT_INTRO_TIMING.totalDurationMs - DEFAULT_INTRO_TIMING.scene4StartMs;

    // Chained scene progression guarantees every scene paints and holds cleanly
    waitMsAndPaint(scene1Duration, () => {
      setScene('scene-2-symbol-formation');
      waitMsAndPaint(scene2Duration, () => {
        setScene('scene-3-brand-identity');
        waitMsAndPaint(scene3Duration, () => {
          setScene('scene-4-website-transition');
          waitMsAndPaint(scene4Duration, () => {
            onCompleteRef.current();
          });
        });
      });
    });

    return () => {
      cancelled = true;
      if (activeTimeout !== undefined) {
        window.clearTimeout(activeTimeout);
      }
      if (activeRaf !== undefined) {
        window.cancelAnimationFrame(activeRaf);
      }
    };
  }, [isActive, persistAcrossRefreshes]);

  const isScene2OrLater =
    scene === 'scene-2-symbol-formation' ||
    scene === 'scene-3-brand-identity' ||
    scene === 'scene-4-website-transition';

  const isScene3OrLater =
    scene === 'scene-3-brand-identity' ||
    scene === 'scene-4-website-transition';

  const isScene4 = scene === 'scene-4-website-transition';

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          key="borrowbox-identity-reveal-overlay"
          data-testid="borrowbox-logo-intro-overlay"
          data-intro-scene={scene}
          data-transparent-asset={BORROWBOX_TRANSPARENT_SYMBOL_ASSET_PATH}
          aria-hidden="true"
          initial={{ opacity: 1 }}
          animate={{
            opacity: isScene4 ? 0 : 1,
          }}
          exit={{ opacity: 0 }}
          transition={{
            duration: isScene4 ? DEFAULT_INTRO_TIMING.overlayFadeOutSec : 0.15,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="fixed inset-0 z-[120] flex flex-col items-center justify-center bg-[#0B0F19] pointer-events-none select-none overflow-hidden"
        >
          {/* Scene 1 -> 3: Restrained Ambient Purple & Subtle Cyan Center Illumination (naturally feathered radial gradient, zero rectangular bounds) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.75 }}
            animate={
              isScene4
                ? { opacity: 0, scale: 1.06 }
                : isScene3OrLater
                  ? { opacity: 1, scale: 1.0 }
                  : isScene2OrLater
                    ? { opacity: 0.85, scale: 0.94 }
                    : { opacity: 0.5, scale: 0.82 }
            }
            transition={{
              duration: 0.65,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="absolute w-[420px] h-[420px] sm:w-[560px] sm:h-[560px] rounded-full bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.20)_0%,rgba(6,182,212,0.05)_36%,rgba(11,15,25,0)_68%)]"
          />

          {/* Scene 2 Initiation: Concentrated Central Light Source */}
          <motion.div
            initial={{ opacity: 0, scale: 0.3 }}
            animate={
              scene === 'scene-1-darkness'
                ? { opacity: 0.7, scale: 0.6 }
                : scene === 'scene-2-symbol-formation'
                  ? { opacity: 0.95, scale: 1.05 }
                  : { opacity: 0.35, scale: 0.92 }
            }
            transition={{
              duration: 0.48,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="absolute w-36 h-36 rounded-full bg-[radial-gradient(circle_at_center,rgba(196,181,253,0.34)_0%,rgba(139,92,246,0.14)_42%,rgba(11,15,25,0)_72%)]"
          />

          {/* Central Brand Composition Container (Standalone Transparent Symbol + Wordmark) */}
          <motion.div
            data-testid="borrowbox-identity-composition"
            initial={{ opacity: 1, scale: 0.95, y: 4 }}
            animate={
              isScene4
                ? {
                    opacity: 0,
                    scale: 0.985,
                    y: -6,
                  }
                : isScene3OrLater
                  ? {
                      opacity: 1,
                      scale: 1,
                      y: 0,
                    }
                  : {
                      opacity: 1,
                      scale: 0.98,
                      y: 2,
                    }
            }
            transition={{
              duration: isScene4 ? 0.44 : 0.55,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="relative z-10 flex flex-col items-center justify-center px-6"
          >
            {/* Standalone Transparent BorrowBox Symbol (No Square Background) */}
            <motion.div
              data-testid="borrowbox-logo-intro-symbol"
              initial={{
                clipPath: 'inset(88% 0% 0% 0%)',
                opacity: 0,
                scale: 0.92,
              }}
              animate={
                isScene2OrLater
                  ? {
                      clipPath: 'inset(0% 0% 0% 0%)',
                      opacity: 1,
                      scale: 1,
                    }
                  : {
                      clipPath: 'inset(88% 0% 0% 0%)',
                      opacity: 0,
                      scale: 0.92,
                    }
              }
              transition={{
                duration: 0.58,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="relative w-36 h-36 sm:w-44 sm:h-44 flex items-center justify-center"
            >
              {/* Settled Standalone Transparent SVG Asset Layer */}
              <motion.img
                src={BORROWBOX_TRANSPARENT_SYMBOL_ASSET_PATH}
                alt="BorrowBox Symbol"
                draggable={false}
                initial={{ opacity: 0 }}
                animate={
                  isScene3OrLater ? { opacity: 1 } : { opacity: 0 }
                }
                transition={{
                  duration: 0.36,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              />

              {/* Multi-part Assembling Vector Symbol (B Monolith + Isometric Box + Tapered Orbital Swoosh + 3 Sparks) */}
              <svg
                viewBox="0 0 512 512"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full overflow-visible"
                role="img"
                aria-label="BorrowBox Brand Symbol"
              >
                <defs>
                  {/* Upper 'B' Monogram Gradient */}
                  <linearGradient
                    id="intro-bb-b-upper"
                    x1="148"
                    y1="92"
                    x2="340"
                    y2="280"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0%" stopColor="#C084FC" />
                    <stop offset="48%" stopColor="#8B5CF6" />
                    <stop offset="100%" stopColor="#6D28D9" />
                  </linearGradient>

                  {/* Sculpted Lower 'B' Bowl Gradient */}
                  <linearGradient
                    id="intro-bb-b-lower"
                    x1="148"
                    y1="204"
                    x2="388"
                    y2="408"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0%" stopColor="#A855F7" />
                    <stop offset="52%" stopColor="#7C3AED" />
                    <stop offset="100%" stopColor="#4C1D95" />
                  </linearGradient>

                  {/* Subtle Depth Fold Along Lower Bowl Arch */}
                  <linearGradient
                    id="intro-bb-b-fold"
                    x1="148"
                    y1="196"
                    x2="320"
                    y2="250"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0%" stopColor="#2E1065" stopOpacity="0.55" />
                    <stop offset="100%" stopColor="#2E1065" stopOpacity="0" />
                  </linearGradient>

                  {/* Tapered Orbital Swoosh Gradient */}
                  <linearGradient
                    id="intro-bb-orbit-grad"
                    x1="96"
                    y1="382"
                    x2="418"
                    y2="216"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="55%" stopColor="#EDE9FE" />
                    <stop offset="85%" stopColor="#C4B5FD" />
                    <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.9" />
                  </linearGradient>

                  {/* Isometric Parcel Box Top Face */}
                  <linearGradient
                    id="intro-bb-box-top"
                    x1="196"
                    y1="252"
                    x2="326"
                    y2="306"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="100%" stopColor="#F3E8FF" />
                  </linearGradient>

                  {/* Isometric Parcel Box Left Face */}
                  <linearGradient
                    id="intro-bb-box-left"
                    x1="196"
                    y1="280"
                    x2="260"
                    y2="388"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="55%" stopColor="#DDD6FE" />
                    <stop offset="100%" stopColor="#A78BFA" />
                  </linearGradient>

                  {/* Isometric Parcel Box Right Face */}
                  <linearGradient
                    id="intro-bb-box-right"
                    x1="262"
                    y1="284"
                    x2="328"
                    y2="388"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0%" stopColor="#F5F3FF" />
                    <stop offset="60%" stopColor="#C4B5FD" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                  </linearGradient>
                </defs>

                {/* Layer 1: Right Tapered Crescent of Orbital Swoosh (Passing Behind Right of 'B') */}
                <motion.path
                  d="M332 212C388 215 424 242 414 278C407 302 384 322 352 336C374 318 390 298 394 276C400 246 374 222 332 212Z"
                  fill="url(#intro-bb-orbit-grad)"
                  initial={{ opacity: 0, x: -12, scale: 0.92 }}
                  animate={
                    isScene2OrLater
                      ? { opacity: 1, x: 0, scale: 1 }
                      : { opacity: 0, x: -12, scale: 0.92 }
                  }
                  transition={{
                    duration: 0.46,
                    delay: 0.16,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                />

                {/* Layer 2: Upper 'B' Stem & Loop with Slanted Geometric Counter */}
                <motion.path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M148 96H282C330 96 360 123 360 164C360 192 343 214 316 225V260H148V96ZM210 148H270C292 148 304 159 304 176C304 193 292 204 270 204H194L210 148Z"
                  fill="url(#intro-bb-b-upper)"
                  initial={{ opacity: 0, y: 12 }}
                  animate={
                    isScene2OrLater
                      ? { opacity: 1, y: 0 }
                      : { opacity: 0, y: 12 }
                  }
                  transition={{
                    duration: 0.46,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                />

                {/* Layer 3: Soft Contour Shadow & Sculpted Lower 'B' Bowl */}
                <motion.path
                  d="M148 242C176 208 222 194 276 194C302 194 326 200 344 212L316 228C298 216 274 210 248 210C204 210 168 226 148 258V242Z"
                  fill="url(#intro-bb-b-fold)"
                  initial={{ opacity: 0 }}
                  animate={
                    isScene2OrLater ? { opacity: 1 } : { opacity: 0 }
                  }
                  transition={{
                    duration: 0.42,
                    delay: 0.05,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                />

                <motion.path
                  d="M148 252C174 214 222 198 278 198C344 198 388 240 388 304C388 366 342 408 274 408H148V382H256C304 382 334 352 334 306C334 264 304 238 258 238C214 238 178 260 162 296L148 252Z"
                  fill="url(#intro-bb-b-lower)"
                  initial={{ opacity: 0 }}
                  animate={
                    isScene2OrLater ? { opacity: 1 } : { opacity: 0 }
                  }
                  transition={{
                    duration: 0.44,
                    delay: 0.06,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                />

                {/* Layer 4: Isometric 3D Parcel Box Assembling Inside the Lower Bowl */}
                <motion.g
                  initial={{ opacity: 0, scale: 0.85, y: 10 }}
                  animate={
                    isScene2OrLater
                      ? { opacity: 1, scale: 1, y: 0 }
                      : { opacity: 0, scale: 0.85, y: 10 }
                  }
                  transition={{
                    duration: 0.48,
                    delay: 0.12,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  style={{ transformOrigin: '262px 320px' }}
                >
                  {/* Contoured Separation Outline Matching #0B0F19 Canvas */}
                  <path
                    d="M262 240L338 272V364L262 400L186 364V272L262 240Z"
                    fill="#0B0F19"
                    stroke="#0B0F19"
                    strokeWidth="10"
                    strokeLinejoin="round"
                  />

                  {/* Isometric Top Diamond Face */}
                  <path
                    d="M262 250L326 277L262 304L198 277L262 250Z"
                    fill="url(#intro-bb-box-top)"
                  />

                  {/* Isometric Left Face */}
                  <path
                    d="M196 285L257 311V386L196 356V285Z"
                    fill="url(#intro-bb-box-left)"
                  />

                  {/* Isometric Right Face with Shipping Tape Bookmark Cutout */}
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M267 311L328 285V356L267 386V311ZM289 302L310 293V333L299 325L289 336V302Z"
                    fill="url(#intro-bb-box-right)"
                  />
                </motion.g>

                {/* Layer 5: Foreground Tapered Crescent of Orbital Swoosh */}
                <motion.path
                  d="M168 294C116 320 96 356 114 380C132 402 184 404 248 390C194 394 148 388 134 368C122 350 136 322 168 294Z"
                  fill="url(#intro-bb-orbit-grad)"
                  initial={{ opacity: 0, x: 10, scale: 0.92 }}
                  animate={
                    isScene2OrLater
                      ? { opacity: 1, x: 0, scale: 1 }
                      : { opacity: 0, x: 10, scale: 0.92 }
                  }
                  transition={{
                    duration: 0.48,
                    delay: 0.22,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                />

                {/* Layer 6: Three Radiating Spark Ticks (Sequential Illumination) */}
                <motion.rect
                  x="304"
                  y="216"
                  width="10"
                  height="26"
                  rx="5"
                  transform="rotate(14 304 216)"
                  fill="#FFFFFF"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={
                    isScene2OrLater
                      ? { opacity: 1, scale: 1 }
                      : { opacity: 0, scale: 0.5 }
                  }
                  transition={{
                    duration: 0.26,
                    delay: 0.32,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                />
                <motion.rect
                  x="328"
                  y="225"
                  width="10"
                  height="26"
                  rx="5"
                  transform="rotate(42 328 225)"
                  fill="#FFFFFF"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={
                    isScene2OrLater
                      ? { opacity: 1, scale: 1 }
                      : { opacity: 0, scale: 0.5 }
                  }
                  transition={{
                    duration: 0.26,
                    delay: 0.38,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                />
                <motion.rect
                  x="344"
                  y="246"
                  width="10"
                  height="26"
                  rx="5"
                  transform="rotate(68 344 246)"
                  fill="#FFFFFF"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={
                    isScene2OrLater
                      ? { opacity: 1, scale: 1 }
                      : { opacity: 0, scale: 0.5 }
                  }
                  transition={{
                    duration: 0.26,
                    delay: 0.44,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                />
              </svg>
            </motion.div>

            {/* Scene 3: Aligned BORROWBOX Wordmark & Subtle Purple Highlight */}
            <motion.div
              data-testid="borrowbox-intro-wordmark"
              initial={{ opacity: 0, y: 10 }}
              animate={
                isScene3OrLater
                  ? { opacity: 1, y: 0 }
                  : { opacity: 0, y: 10 }
              }
              transition={{
                duration: 0.44,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="mt-3 flex flex-col items-center text-center"
            >
              <div className="flex items-center tracking-[0.22em] text-xl sm:text-2xl font-extrabold uppercase text-[#F8FAFC] pl-[0.22em]">
                <span>BORROW</span>
                <span className="bg-gradient-to-r from-[#A78BFA] via-[#8B5CF6] to-[#06B6D4] bg-clip-text text-transparent">
                  BOX
                </span>
              </div>

              {/* Restrained Luminous Underline Accent */}
              <motion.div
                initial={{ scaleX: 0, opacity: 0 }}
                animate={
                  isScene3OrLater
                    ? { scaleX: 1, opacity: 0.85 }
                    : { scaleX: 0, opacity: 0 }
                }
                transition={{
                  duration: 0.42,
                  delay: 0.06,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="mt-2.5 h-[1.5px] w-24 bg-gradient-to-r from-transparent via-[#8B5CF6] to-transparent"
              />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
