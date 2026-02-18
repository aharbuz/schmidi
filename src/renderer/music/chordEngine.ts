/**
 * Diatonic chord generation from key + mode.
 *
 * Stub created by 02-02 execution to unblock typecheck.
 * Plan 02-01 will provide the full implementation using tonal library.
 */

import type { ChordData, ChordQuality } from './musicTypes';

/**
 * Parse chord quality from a tonal chord symbol.
 * "Dm" -> "minor", "C" -> "major", "Bdim" -> "diminished"
 */
export function getChordQuality(chordSymbol: string): ChordQuality {
  if (chordSymbol.endsWith('dim')) return 'diminished';
  // Check for 'm' suffix that is NOT part of 'dim'
  const root = chordSymbol.replace(/[#b]/, '');
  if (root.length > 1 && chordSymbol.endsWith('m')) return 'minor';
  return 'major';
}

/** Roman numeral labels by degree index (0-based) */
const ROMAN_UPPER = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const ROMAN_LOWER = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii'];

/**
 * Derive a Roman numeral from degree index and chord quality.
 */
export function deriveRomanNumeral(degreeIndex: number, quality: ChordQuality): string {
  switch (quality) {
    case 'major':
      return ROMAN_UPPER[degreeIndex] ?? 'I';
    case 'minor':
      return ROMAN_LOWER[degreeIndex] ?? 'i';
    case 'diminished':
      return (ROMAN_LOWER[degreeIndex] ?? 'i') + '\u00B0';
    case 'augmented':
      return (ROMAN_UPPER[degreeIndex] ?? 'I') + '+';
  }
}

/**
 * Generate 7 diatonic chords for a given key and mode.
 * Stub: returns empty array. Plan 02-01 will implement with tonal.
 */
export function generateDiatonicChords(_key: string, _mode: string): ChordData[] {
  // Stub -- plan 02-01 will implement
  return [];
}
