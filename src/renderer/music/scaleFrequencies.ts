/**
 * Scale frequency utilities for pitch quantization and staircase convergence.
 *
 * Provides:
 * - buildScaleFrequencyTable: precompute all scale degree frequencies across a range
 * - findNearestScaleFreq: binary search for closest scale degree
 * - magneticSnap: gravitational pull toward nearest scale degree (not hard snap)
 * - buildStaircaseCurve: stepped Float32Array through scale degrees for setValueCurveAtTime
 */

import { Scale, Note } from 'tonal';

// ---------------------------------------------------------------------------
// Scale Frequency Table
// ---------------------------------------------------------------------------

/**
 * Build a sorted array of all scale degree frequencies within a pitch range.
 *
 * Uses tonal's Scale.degrees() to iterate through degrees starting at octave 0,
 * filtering to the specified frequency window.
 *
 * @param key - Root key name (e.g. "C", "D", "F#", "Bb")
 * @param mode - Mode name (e.g. "major", "dorian", "locrian")
 * @param lowFreq - Lower frequency bound (default: 65.41 Hz = C2)
 * @param highFreq - Upper frequency bound (default: 1046.5 Hz = C6)
 * @returns Sorted ascending array of frequencies
 */
export function buildScaleFrequencyTable(
  key: string,
  mode: string,
  lowFreq: number = 65.41,
  highFreq: number = 1046.5
): number[] {
  const degreeFn = Scale.degrees(`${key}0 ${mode}`);
  const scaleInfo = Scale.get(`${key} ${mode}`);
  const scaleSize = scaleInfo.notes.length;

  if (scaleSize === 0) return [];

  const freqs: number[] = [];

  // Iterate through enough degrees to cover ~8 octaves
  for (let d = 1; d <= scaleSize * 8; d++) {
    const noteName = degreeFn(d);
    if (!noteName) continue;

    const freq = Note.freq(noteName);
    if (freq === null) continue;
    if (freq < lowFreq) continue;
    if (freq > highFreq) break; // Sorted ascending, safe to stop

    freqs.push(freq);
  }

  return freqs;
}

// ---------------------------------------------------------------------------
// Binary Search
// ---------------------------------------------------------------------------

/**
 * Find the nearest scale degree frequency using binary search.
 * Comparison is in log-frequency space (semitone-proportional distance).
 *
 * @param freq - The frequency to find the nearest scale degree for
 * @param scaleFreqs - Sorted ascending array of scale degree frequencies
 * @returns The nearest scale frequency (or the input freq if array is empty)
 */
export function findNearestScaleFreq(freq: number, scaleFreqs: number[]): number {
  if (scaleFreqs.length === 0) return freq;
  if (scaleFreqs.length === 1) return scaleFreqs[0];

  let lo = 0;
  let hi = scaleFreqs.length - 1;

  while (lo < hi - 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (scaleFreqs[mid] <= freq) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  // Compare distances in log-frequency space (semitone-proportional)
  const dLo = Math.abs(Math.log2(freq / scaleFreqs[lo]));
  const dHi = Math.abs(Math.log2(freq / scaleFreqs[hi]));
  return dLo <= dHi ? scaleFreqs[lo] : scaleFreqs[hi];
}

// ---------------------------------------------------------------------------
// Magnetic Snap
// ---------------------------------------------------------------------------

/**
 * Apply magnetic-snap quantization: continuous glide that gravitates toward
 * scale degrees, spending more time on in-scale pitches (not discrete jumps).
 *
 * Uses inverse-square gravitational pull in log-frequency space.
 *
 * @param freeFreq - The unquantized frequency
 * @param scaleFreqs - Sorted ascending array of scale degree frequencies
 * @param snapStrength - 0 = no snap, 1 = strong snap (default: 0.8)
 * @returns The magnetically-snapped frequency
 */
export function magneticSnap(
  freeFreq: number,
  scaleFreqs: number[],
  snapStrength: number = 0.8
): number {
  if (scaleFreqs.length === 0 || freeFreq <= 0) return freeFreq;

  const nearest = findNearestScaleFreq(freeFreq, scaleFreqs);
  const distSemitones = Math.abs(Math.log2(freeFreq / nearest) * 12);

  // Gravitational pull: stronger when closer to a scale degree
  // Inverse-square-like curve: pull = 1 / (1 + dist^2)
  const pull = 1 / (1 + distSemitones * distSemitones);
  const effectivePull = pull * snapStrength;

  // Interpolate in log-frequency space
  const logFree = Math.log2(freeFreq);
  const logNearest = Math.log2(nearest);
  return Math.pow(2, logFree + (logNearest - logFree) * effectivePull);
}

// ---------------------------------------------------------------------------
// Staircase Convergence Curve
// ---------------------------------------------------------------------------

/**
 * Build a stepped (staircase) convergence curve through scale degrees
 * between a start and target frequency.
 *
 * The curve is a Float32Array compatible with AudioParam.setValueCurveAtTime().
 * Each scale degree gets an equal number of samples (dwell time), creating
 * the harp-like cascading approach to chord targets.
 *
 * @param startFreq - Starting frequency
 * @param targetFreq - Target frequency
 * @param scaleFreqs - Sorted ascending array of scale degree frequencies
 * @param curveLength - Number of samples in the output curve (default: 512)
 * @returns Float32Array of frequency values for setValueCurveAtTime
 */
export function buildStaircaseCurve(
  startFreq: number,
  targetFreq: number,
  scaleFreqs: number[],
  curveLength: number = 512
): Float32Array {
  const ascending = targetFreq > startFreq;

  // Filter scale degrees to those between start and target
  const lo = Math.min(startFreq, targetFreq);
  const hi = Math.max(startFreq, targetFreq);
  const between = scaleFreqs.filter((f) => f >= lo && f <= hi);

  // Sort in the correct direction
  if (!ascending) {
    between.reverse();
  }

  // Build the step list: ensure start and target are included
  const steps: number[] = [];

  if (between.length === 0 || between[0] !== startFreq) {
    steps.push(startFreq);
  }
  steps.push(...between);
  if (steps[steps.length - 1] !== targetFreq) {
    steps.push(targetFreq);
  }

  // Allocate output curve
  const curve = new Float32Array(curveLength);

  if (steps.length === 0) {
    // Edge case: no steps, fill with target
    curve.fill(targetFreq);
    return curve;
  }

  // Distribute samples evenly across steps
  const samplesPerStep = Math.floor(curveLength / steps.length);

  for (let i = 0; i < curveLength; i++) {
    const stepIndex = Math.min(
      Math.floor(i / Math.max(1, samplesPerStep)),
      steps.length - 1
    );
    curve[i] = steps[stepIndex];
  }

  return curve;
}
