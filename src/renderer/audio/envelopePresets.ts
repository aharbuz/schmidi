import type { ADSRValues } from '../../shared/types';

/** Named ADSR envelope presets with distinct audible characters */
export const ENVELOPE_PRESETS: Record<string, ADSRValues> = {
  'Pad (Drift)': { attack: 0.8, decay: 1.2, sustain: 0.7, release: 2.0 },
  'Pluck (Snap)': { attack: 0.005, decay: 0.3, sustain: 0.0, release: 0.1 },
  'Organ (Breathe)': { attack: 0.01, decay: 0.05, sustain: 0.85, release: 0.01 },
  'Strings (Bloom)': { attack: 0.4, decay: 0.5, sustain: 0.6, release: 1.5 },
};
