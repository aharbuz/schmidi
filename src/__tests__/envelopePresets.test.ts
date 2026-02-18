import { describe, it, expect } from 'vitest';
import { ENVELOPE_PRESETS } from '../renderer/audio/envelopePresets';

describe('ENVELOPE_PRESETS', () => {
  const expectedNames = ['Pad (Drift)', 'Pluck (Snap)', 'Organ (Breathe)', 'Strings (Bloom)'];

  it('has exactly 4 presets', () => {
    expect(Object.keys(ENVELOPE_PRESETS)).toHaveLength(4);
  });

  for (const name of expectedNames) {
    it(`has preset "${name}"`, () => {
      expect(ENVELOPE_PRESETS).toHaveProperty(name);
    });
  }

  it('all presets have valid attack values (>= 0)', () => {
    for (const [name, preset] of Object.entries(ENVELOPE_PRESETS)) {
      expect(preset.attack, `${name} attack`).toBeGreaterThanOrEqual(0);
    }
  });

  it('all presets have valid decay values (>= 0)', () => {
    for (const [name, preset] of Object.entries(ENVELOPE_PRESETS)) {
      expect(preset.decay, `${name} decay`).toBeGreaterThanOrEqual(0);
    }
  });

  it('all presets have valid sustain values (0-1)', () => {
    for (const [name, preset] of Object.entries(ENVELOPE_PRESETS)) {
      expect(preset.sustain, `${name} sustain`).toBeGreaterThanOrEqual(0);
      expect(preset.sustain, `${name} sustain`).toBeLessThanOrEqual(1);
    }
  });

  it('all presets have valid release values (>= 0)', () => {
    for (const [name, preset] of Object.entries(ENVELOPE_PRESETS)) {
      expect(preset.release, `${name} release`).toBeGreaterThanOrEqual(0);
    }
  });

  it('presets produce distinct characters (different ADSR values)', () => {
    const presets = Object.values(ENVELOPE_PRESETS);
    for (let i = 0; i < presets.length; i++) {
      for (let j = i + 1; j < presets.length; j++) {
        const a = presets[i];
        const b = presets[j];
        const same =
          a.attack === b.attack &&
          a.decay === b.decay &&
          a.sustain === b.sustain &&
          a.release === b.release;
        expect(same).toBe(false);
      }
    }
  });
});
