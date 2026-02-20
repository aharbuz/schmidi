import { describe, it, expect } from 'vitest';
import {
  PRESET_NAMES,
  PRESET_MAP,
  getPresetConfig,
  getPresetIdleMode,
  getPresetPostArrivalMode,
} from '../renderer/audio/presets';

describe('presets', () => {
  describe('PRESET_NAMES', () => {
    it('contains all four presets in order', () => {
      expect(PRESET_NAMES).toEqual(['eerie', 'bloom', 'swarm', 'custom']);
    });
  });

  describe('PRESET_MAP', () => {
    it('has a function for each preset name', () => {
      for (const name of PRESET_NAMES) {
        expect(typeof PRESET_MAP[name]).toBe('function');
      }
    });
  });

  describe('getPresetConfig', () => {
    it('returns a non-empty config for eerie, bloom, swarm', () => {
      for (const name of ['eerie', 'bloom', 'swarm'] as const) {
        const config = getPresetConfig(name, 0.5);
        expect(Object.keys(config).length).toBeGreaterThan(0);
      }
    });

    it('returns an empty config for custom', () => {
      const config = getPresetConfig('custom', 0.5);
      expect(Object.keys(config).length).toBe(0);
    });

    it('clamps intensity below 0 to 0', () => {
      const atZero = getPresetConfig('eerie', 0);
      const belowZero = getPresetConfig('eerie', -5);
      expect(belowZero).toEqual(atZero);
    });

    it('clamps intensity above 1 to 1', () => {
      const atOne = getPresetConfig('eerie', 1);
      const aboveOne = getPresetConfig('eerie', 10);
      expect(aboveOne).toEqual(atOne);
    });

    it('varies config values with intensity', () => {
      const low = getPresetConfig('eerie', 0);
      const high = getPresetConfig('eerie', 1);
      // Eerie convergenceDuration: lerp(1.5, 4.0, intensity) — should differ
      expect(low.convergenceDuration).not.toEqual(high.convergenceDuration);
    });

    it('eerie has slow convergence at high intensity', () => {
      const config = getPresetConfig('eerie', 1);
      expect(config.convergenceDuration).toBe(4.0);
    });

    it('bloom enables autoCycle and microMotion', () => {
      const config = getPresetConfig('bloom', 0.5);
      expect(config.autoCycle).toBe(true);
      expect(config.microMotion).toBe(true);
    });

    it('swarm gets faster at higher intensity', () => {
      const low = getPresetConfig('swarm', 0);
      const high = getPresetConfig('swarm', 1);
      expect(high.movementSpeed).toBeGreaterThan(low.movementSpeed!);
    });

    it('swarm has 4 tracks at high intensity', () => {
      const config = getPresetConfig('swarm', 0.8);
      expect(config.trackCount).toBe(4);
    });

    it('swarm has 3 tracks at low intensity', () => {
      const config = getPresetConfig('swarm', 0.3);
      expect(config.trackCount).toBe(3);
    });
  });

  describe('getPresetIdleMode', () => {
    it('returns quiet-sliding for all presets', () => {
      for (const name of PRESET_NAMES) {
        expect(getPresetIdleMode(name)).toBe('quiet-sliding');
      }
    });
  });

  describe('getPresetPostArrivalMode', () => {
    it('eerie defaults to hold', () => {
      expect(getPresetPostArrivalMode('eerie')).toBe('hold');
    });

    it('bloom defaults to cycle', () => {
      expect(getPresetPostArrivalMode('bloom')).toBe('cycle');
    });

    it('swarm defaults to cycle', () => {
      expect(getPresetPostArrivalMode('swarm')).toBe('cycle');
    });

    it('custom defaults to hold', () => {
      expect(getPresetPostArrivalMode('custom')).toBe('hold');
    });
  });
});
