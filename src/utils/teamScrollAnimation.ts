export interface TeamCardVisualState {
  cardIndex: number;
  delta: number;
  isActive: boolean;
  isVisible: boolean;
  translateX: number;
  translateY: number;
  scale: number;
  opacity: number;
  zIndex: number;
}

export function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clampProgress((x - edge0) / Math.max(1e-6, edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/**
 * Computes normalized scroll progress [0, 1] for a sticky scroll runway.
 */
export function computeSectionScrollProgress(
  rectTop: number,
  sectionHeight: number,
  viewportHeight: number,
  stickyOffsetPx = 80
): number {
  const scrollableDistance = Math.max(1, sectionHeight - viewportHeight);
  const scrolled = -(rectTop - stickyOffsetPx);
  return clampProgress(scrolled / scrollableDistance);
}

/**
 * Maps normalized scroll progress [0, 1] to a continuous card timeline coordinate [0, totalCards - 1]
 * with a stable dwell zone at each card stop and a smooth cubic transition between adjacent cards.
 */
export function computeTimelinePosition(
  progress: number,
  totalCards: number,
  dwellMargin = 0.2
): number {
  const maxIndex = Math.max(0, totalCards - 1);
  if (maxIndex === 0) return 0;

  const p = clampProgress(progress);
  const raw = p * maxIndex;
  if (raw >= maxIndex) return maxIndex;

  const segmentIndex = Math.min(maxIndex - 1, Math.floor(raw));
  const localFraction = raw - segmentIndex;

  const easedFraction = smoothstep(
    dwellMargin,
    1 - dwellMargin,
    localFraction
  );

  return Number((segmentIndex + easedFraction).toFixed(4));
}

/**
 * Computes the active card index (0 .. totalCards - 1) from timeline position.
 */
export function getActiveCardIndex(
  timelinePosition: number,
  totalCards: number
): number {
  if (totalCards <= 1) return 0;
  const clamped = Math.max(0, Math.min(totalCards - 1, timelinePosition));
  return Math.round(clamped);
}

/**
 * Computes GPU-friendly transform & opacity properties for a given card index at timelinePosition.
 * - Previous card exits smoothly to the left with subtle scale-down and fade.
 * - Next card enters naturally from the right with subtle scale-up and fade-in.
 */
export function computeCardVisualState(
  cardIndex: number,
  timelinePosition: number
): TeamCardVisualState {
  const delta = cardIndex - timelinePosition;
  const absDelta = Math.abs(delta);
  const isActive = Math.round(timelinePosition) === cardIndex;
  const isVisible = absDelta < 1.02;

  if (!isVisible) {
    return {
      cardIndex,
      delta,
      isActive: false,
      isVisible: false,
      translateX: delta < 0 ? -88 : 96,
      translateY: 12,
      scale: delta < 0 ? 0.94 : 0.95,
      opacity: 0,
      zIndex: 10,
    };
  }

  const translateX = delta < 0 ? delta * 88 : delta * 96;
  const translateY = absDelta * 10;
  const scale =
    delta < 0
      ? 1 - Math.min(1, absDelta) * 0.06
      : 1 - Math.min(1, absDelta) * 0.05;

  const normalizedFade = Math.min(1, absDelta / 0.92);
  const opacity = Math.max(0, 1 - Math.pow(normalizedFade, 1.35));

  return {
    cardIndex,
    delta: Number(delta.toFixed(4)),
    isActive,
    isVisible: opacity > 0.005 || isActive,
    translateX: Number(translateX.toFixed(2)),
    translateY: Number(translateY.toFixed(2)),
    scale: Number(scale.toFixed(4)),
    opacity: Number(opacity.toFixed(4)),
    zIndex: isActive ? 30 : 20,
  };
}

/**
 * Calculates target window.scrollY to focus a specific card index on the sticky runway.
 */
export function getScrollTargetForCardIndex(
  cardIndex: number,
  totalCards: number,
  sectionTopDocumentY: number,
  sectionHeight: number,
  viewportHeight: number,
  stickyOffsetPx = 80
): number {
  const maxIndex = Math.max(1, totalCards - 1);
  const targetProgress = clampProgress(cardIndex / maxIndex);
  const scrollableDistance = Math.max(1, sectionHeight - viewportHeight);
  return Math.max(
    0,
    Math.round(
      sectionTopDocumentY - stickyOffsetPx + targetProgress * scrollableDistance
    )
  );
}
