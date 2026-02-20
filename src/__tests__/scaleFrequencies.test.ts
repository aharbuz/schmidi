import { describe, it, expect } from 'vitest';
import {
  buildScaleFrequencyTable,
  findNearestScaleFreq,
  magneticSnap,
  buildStaircaseCurve,
} from '../renderer/music/scaleFrequencies';

describe('scaleFrequencies', () => {
  describe('buildScaleFrequencyTable', () => {
    it('returns a sorted ascending array', () => {
      const freqs = buildScaleFrequencyTable('C', 'major');
      for (let i = 1; i < freqs.length; i++) {
        expect(freqs[i]).toBeGreaterThan(freqs[i - 1]);
      }
    });

    it('returns 27+ frequencies for C major across ~4 octaves', () => {
      const freqs = buildScaleFrequencyTable('C', 'major');
      expect(freqs.length).toBeGreaterThanOrEqual(27);
    });

    it('all frequencies are within the default range', () => {
      const freqs = buildScaleFrequencyTable('C', 'major');
      for (const f of freqs) {
        expect(f).toBeGreaterThanOrEqual(65.41);
        expect(f).toBeLessThanOrEqual(1046.5);
      }
    });

    it('returns fewer notes for a pentatonic scale (5 notes vs 7)', () => {
      const major = buildScaleFrequencyTable('C', 'major');
      const pent = buildScaleFrequencyTable('C', 'major pentatonic');
      expect(pent.length).toBeLessThan(major.length);
    });

    it('returns empty array for invalid scale', () => {
      const freqs = buildScaleFrequencyTable('Z', 'nonsense');
      expect(freqs).toEqual([]);
    });

    it('respects custom frequency range', () => {
      const freqs = buildScaleFrequencyTable('C', 'major', 200, 500);
      for (const f of freqs) {
        expect(f).toBeGreaterThanOrEqual(200);
        expect(f).toBeLessThanOrEqual(500);
      }
      expect(freqs.length).toBeGreaterThan(0);
    });

    it('works with sharp keys', () => {
      const freqs = buildScaleFrequencyTable('F#', 'major');
      expect(freqs.length).toBeGreaterThanOrEqual(28);
    });

    it('works with flat keys', () => {
      const freqs = buildScaleFrequencyTable('Bb', 'minor');
      expect(freqs.length).toBeGreaterThan(0);
    });
  });

  describe('findNearestScaleFreq', () => {
    const cMajorFreqs = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88];

    it('returns exact match', () => {
      expect(findNearestScaleFreq(440, cMajorFreqs)).toBe(440);
    });

    it('returns nearest for a frequency between two scale degrees', () => {
      // 430 Hz is closer to A4 (440) than G4 (392)
      expect(findNearestScaleFreq(430, cMajorFreqs)).toBe(440);
    });

    it('returns input freq for empty array', () => {
      expect(findNearestScaleFreq(440, [])).toBe(440);
    });

    it('returns single element for single-element array', () => {
      expect(findNearestScaleFreq(300, [440])).toBe(440);
    });

    it('compares in log-frequency space (not linear)', () => {
      // 300 Hz: linear midpoint of [261.63, 329.63] = 295.63
      // log-space midpoint favors 293.66 since octaves are logarithmic
      const result = findNearestScaleFreq(300, cMajorFreqs);
      expect(result).toBe(293.66);
    });
  });

  describe('magneticSnap', () => {
    const scaleFreqs = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88];

    it('snaps a frequency toward the nearest scale degree', () => {
      const snapped = magneticSnap(435, scaleFreqs);
      // Should be pulled toward 440
      expect(snapped).toBeGreaterThan(435);
      expect(snapped).toBeLessThanOrEqual(440);
    });

    it('returns exact frequency unchanged', () => {
      const snapped = magneticSnap(440, scaleFreqs);
      expect(snapped).toBeCloseTo(440, 2);
    });

    it('returns unmodified freq for empty array', () => {
      expect(magneticSnap(440, [])).toBe(440);
    });

    it('returns unmodified freq for freq <= 0', () => {
      expect(magneticSnap(0, scaleFreqs)).toBe(0);
      expect(magneticSnap(-1, scaleFreqs)).toBe(-1);
    });

    it('strength 0 means no snap', () => {
      const snapped = magneticSnap(435, scaleFreqs, 0);
      expect(snapped).toBeCloseTo(435, 2);
    });

    it('strength 1 produces stronger pull than strength 0.5', () => {
      const strong = magneticSnap(420, scaleFreqs, 1);
      const weak = magneticSnap(420, scaleFreqs, 0.5);
      // Both should move toward 440, strong should be closer
      const strongDist = Math.abs(strong - 440);
      const weakDist = Math.abs(weak - 440);
      expect(strongDist).toBeLessThan(weakDist);
    });
  });

  describe('buildStaircaseCurve', () => {
    const scaleFreqs = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88];

    it('returns a Float32Array of the correct length', () => {
      const curve = buildStaircaseCurve(261.63, 440, scaleFreqs, 512);
      expect(curve).toBeInstanceOf(Float32Array);
      expect(curve.length).toBe(512);
    });

    it('starts at startFreq and ends at targetFreq', () => {
      const curve = buildStaircaseCurve(261.63, 440, scaleFreqs, 512);
      expect(curve[0]).toBeCloseTo(261.63, 1);
      expect(curve[511]).toBeCloseTo(440, 1);
    });

    it('ascending curve values are non-decreasing', () => {
      const curve = buildStaircaseCurve(261.63, 440, scaleFreqs, 512);
      for (let i = 1; i < curve.length; i++) {
        expect(curve[i]).toBeGreaterThanOrEqual(curve[i - 1]);
      }
    });

    it('descending curve values are non-increasing', () => {
      const curve = buildStaircaseCurve(440, 261.63, scaleFreqs, 512);
      for (let i = 1; i < curve.length; i++) {
        expect(curve[i]).toBeLessThanOrEqual(curve[i - 1]);
      }
    });

    it('has staircase pattern (flat segments with jumps)', () => {
      const curve = buildStaircaseCurve(261.63, 440, scaleFreqs, 512);
      // Count distinct values — should be more than 2 (not just start/end) but less than 512
      const unique = new Set(Array.from(curve));
      expect(unique.size).toBeGreaterThan(2);
      expect(unique.size).toBeLessThan(50); // Steps, not continuous
    });

    it('fills with targetFreq when no scale degrees between start and target', () => {
      const curve = buildStaircaseCurve(440, 441, scaleFreqs, 64);
      // Should still have valid values
      expect(curve.length).toBe(64);
      expect(curve[63]).toBeCloseTo(441, 0);
    });

    it('handles custom curve length', () => {
      const curve = buildStaircaseCurve(261.63, 440, scaleFreqs, 128);
      expect(curve.length).toBe(128);
    });
  });
});
