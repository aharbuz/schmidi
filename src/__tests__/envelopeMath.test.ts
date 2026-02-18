import { describe, it, expect } from 'vitest';
import { computeEnvelopeCurve } from '../renderer/utils/envelopeMath';
import type { ADSRValues } from '../shared/types';

describe('computeEnvelopeCurve', () => {
  const width = 100;
  const height = 100;

  it('returns all points at max amplitude (y=0) for zero attack/decay, full sustain', () => {
    const adsr: ADSRValues = { attack: 0, decay: 0, sustain: 1, release: 0 };
    const points = computeEnvelopeCurve(adsr, width, height);

    // With zero attack, zero decay, sustain=1: amplitude should be at max (1.0)
    // In canvas coords, max amplitude = y=0 (top of canvas)
    // Skip the very first point (which starts at zero amplitude) and the release phase
    const sustainPoints = points.slice(1, Math.floor(points.length * 0.7));
    for (const point of sustainPoints) {
      // Should be near y=0 (max amplitude) for sustain=1
      expect(point.y).toBeLessThanOrEqual(10); // Near top
    }
  });

  it('produces a linear ramp up for attack=1 with no decay', () => {
    const adsr: ADSRValues = { attack: 1, decay: 0, sustain: 1, release: 0 };
    const points = computeEnvelopeCurve(adsr, width, height);

    // First point always starts at zero amplitude (y=height)
    expect(points[0].y).toBeCloseTo(height, 0);

    // During the attack phase, y should decrease (amplitude increases)
    // Check that points are generally moving upward (y decreasing)
    const attackEnd = Math.floor(points.length * 0.3); // Rough attack portion
    for (let i = 1; i < attackEnd; i++) {
      expect(points[i].y).toBeLessThanOrEqual(points[i - 1].y + 1); // Allow tiny floating point wobble
    }
  });

  it('first point is always at (0, height) representing zero amplitude', () => {
    const adsr: ADSRValues = { attack: 0.5, decay: 0.3, sustain: 0.6, release: 0.5 };
    const points = computeEnvelopeCurve(adsr, width, height);

    expect(points[0].x).toBe(0);
    expect(points[0].y).toBeCloseTo(height, 0);
  });

  it('all points are within canvas bounds', () => {
    const adsr: ADSRValues = { attack: 0.8, decay: 1.2, sustain: 0.7, release: 2.0 };
    const points = computeEnvelopeCurve(adsr, width, height);

    for (const point of points) {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(width);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(height);
    }
  });

  it('sampleCount matches returned array length', () => {
    const adsr: ADSRValues = { attack: 0.5, decay: 0.3, sustain: 0.6, release: 0.5 };
    const sampleCount = 50;
    const points = computeEnvelopeCurve(adsr, width, height, sampleCount);

    expect(points).toHaveLength(sampleCount);
  });

  it('defaults to a reasonable sample count when not provided', () => {
    const adsr: ADSRValues = { attack: 0.5, decay: 0.3, sustain: 0.6, release: 0.5 };
    const points = computeEnvelopeCurve(adsr, width, height);

    expect(points.length).toBeGreaterThan(10);
  });

  it('envelope ends near zero amplitude for release phase', () => {
    const adsr: ADSRValues = { attack: 0.1, decay: 0.2, sustain: 0.5, release: 0.5 };
    const points = computeEnvelopeCurve(adsr, width, height);

    // Last point should be near zero amplitude (y near height)
    const lastPoint = points[points.length - 1];
    expect(lastPoint.y).toBeGreaterThan(height * 0.8); // Near bottom = low amplitude
  });

  it('produces correct shape for Pad preset (long attack/release)', () => {
    const padPreset: ADSRValues = { attack: 0.8, decay: 1.2, sustain: 0.7, release: 2.0 };
    const points = computeEnvelopeCurve(padPreset, 200, 100, 100);

    expect(points).toHaveLength(100);
    // First point at zero amplitude
    expect(points[0].y).toBeCloseTo(100, 0);
    // All within bounds
    for (const p of points) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(200);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(100);
    }
  });

  it('produces correct shape for Pluck preset (instant attack, zero sustain)', () => {
    const pluckPreset: ADSRValues = { attack: 0.005, decay: 0.3, sustain: 0.0, release: 0.1 };
    const points = computeEnvelopeCurve(pluckPreset, 200, 100, 100);

    expect(points).toHaveLength(100);
    // Should reach near max amplitude quickly then decay to zero
    // Find the peak (lowest y value)
    const minY = Math.min(...points.map((p) => p.y));
    expect(minY).toBeLessThan(20); // Gets close to max amplitude
  });
});
