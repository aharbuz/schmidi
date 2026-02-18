/** Audio engine constants */

/** Default pitches for 8 voices: C major scale C3-C4 (Hz) */
export const DEFAULT_VOICE_PITCHES = [
  130.81, // C3
  146.83, // D3
  164.81, // E3
  174.61, // F3
  196.0, // G3
  220.0, // A3
  246.94, // B3
  261.63, // C4
];

/** Default detune offsets per voice (cents, range -12 to +12) for slight detuning */
export const DEFAULT_VOICE_DETUNE = [-7, +5, -3, +8, -10, +4, -6, +11];

/** Default keyboard keys mapped to each voice */
export const DEFAULT_VOICE_KEYS = ['a', 's', 'd', 'f', 'j', 'k', 'l', ';'];

/** Master gain level (0-1) */
export const MASTER_GAIN = 0.15;

/** DynamicsCompressor settings for the master bus */
export const COMPRESSOR_SETTINGS = {
  threshold: -24,
  knee: 12,
  ratio: 4,
  attack: 0.003,
  release: 0.25,
};
