import type { SlideTrackState } from '../../audio/SlideTrack';

/**
 * Track hue palette -- distinct per track.
 * cyan, magenta, gold, green, purple, orange, pink, teal
 */
export const TRACK_HUES = [185, 300, 45, 120, 260, 30, 330, 160] as const;

/** Visual properties derived from track state + proximity */
export interface TrackVizData {
  hue: number;
  proximity: number;
  brightness: number;
  saturation: number;
  size: number;
  glowRadius: number;
  alpha: number;
}

/**
 * Map a SlideTrackState + track index to visual intensity values.
 * Proximity 0 = far (dim, small), 1 = arrived (bright, large).
 */
export function computeTrackViz(
  trackState: SlideTrackState,
  trackIndex: number
): TrackVizData {
  const hue = TRACK_HUES[trackIndex % TRACK_HUES.length];
  const p = trackState.proximity;
  return {
    hue,
    proximity: p,
    brightness: 30 + p * 60,
    saturation: 60 + p * 40,
    size: 20 * (0.5 + p * 0.5),
    glowRadius: 40 * p,
    alpha: 0.3 + p * 0.7,
  };
}

/**
 * Blend multiple hues with optional weights, correctly wrapping around 360.
 * Uses circular mean (atan2 of averaged sin/cos components).
 * Returns a hue in [0, 360).
 */
export function blendHues(hues: number[], weights?: number[]): number {
  if (hues.length === 0) return 0;
  if (hues.length === 1) return hues[0];

  const w = weights ?? hues.map(() => 1 / hues.length);
  const totalWeight = w.reduce((a, b) => a + b, 0);

  let sinSum = 0;
  let cosSum = 0;

  for (let i = 0; i < hues.length; i++) {
    const rad = (hues[i] * Math.PI) / 180;
    const nw = (w[i] ?? 0) / totalWeight;
    sinSum += Math.sin(rad) * nw;
    cosSum += Math.cos(rad) * nw;
  }

  let result = (Math.atan2(sinSum, cosSum) * 180) / Math.PI;
  if (result < 0) result += 360;
  return result;
}
