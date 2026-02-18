/**
 * Diatonic chord generation from key + mode.
 *
 * Uses the tonal library (Mode.triads, Mode.notes, Note.freq) to generate
 * ChordData for all 7 diatonic triads in any key/mode combination.
 */

import { Mode, Note } from 'tonal';
import type { ChordData, ChordQuality } from './musicTypes';
import { HARMONIC_FUNCTIONS } from './musicTypes';
import { buildTriadWithOctave } from './noteFrequency';

// ---------------------------------------------------------------------------
// Mode name aliases: user-facing names -> tonal internal names
// ---------------------------------------------------------------------------

const MODE_ALIASES: Record<string, string> = {
  major: 'ionian',
  minor: 'aeolian',
  dorian: 'dorian',
  phrygian: 'phrygian',
  lydian: 'lydian',
  mixolydian: 'mixolydian',
  aeolian: 'aeolian',
  locrian: 'locrian',
};

// ---------------------------------------------------------------------------
// getChordQuality
// ---------------------------------------------------------------------------

/**
 * Parse chord quality from a tonal chord symbol.
 *
 * tonal Mode.triads() returns symbols like:
 * - "C" (major), "Dm" (minor), "Bdim" (diminished)
 * - Sharps/flats in root: "F#", "Bbm", "Ebdim"
 *
 * Strategy: strip root note (letter + optional accidentals), examine suffix.
 */
export function getChordQuality(chordSymbol: string): ChordQuality {
  if (chordSymbol.includes('dim')) return 'diminished';
  if (chordSymbol.includes('aug')) return 'augmented';

  // Strip root letter + accidentals to get the suffix
  const suffix = chordSymbol.replace(/^[A-G][#b]*/, '');

  if (suffix.startsWith('m') && !suffix.startsWith('maj')) return 'minor';
  return 'major';
}

// ---------------------------------------------------------------------------
// deriveRomanNumeral
// ---------------------------------------------------------------------------

/** Roman numeral labels by degree index (0-based) */
const ROMAN_UPPER = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const ROMAN_LOWER = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii'];

/**
 * Derive a Roman numeral from degree index (0-based) and chord quality.
 *
 * - Major: uppercase (I, IV, V)
 * - Minor: lowercase (ii, iii, vi)
 * - Diminished: lowercase + degree symbol (vii deg)
 * - Augmented: uppercase + plus sign (III+)
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

// ---------------------------------------------------------------------------
// generateDiatonicChords
// ---------------------------------------------------------------------------

/**
 * Generate 7 diatonic chords for a given key and mode.
 *
 * @param key - Root key name (e.g. "C", "D", "F#", "Bb")
 * @param mode - Mode name (e.g. "major", "dorian", "locrian")
 * @returns Array of 7 ChordData objects, one per scale degree
 */
export function generateDiatonicChords(key: string, mode: string): ChordData[] {
  const tonalMode = MODE_ALIASES[mode] ?? mode;

  // Get triads and scale notes from tonal
  const triads = Mode.triads(tonalMode, key);
  const scaleNotes = Mode.notes(tonalMode, key);

  return triads.map((chordSymbol, i) => {
    const quality = getChordQuality(chordSymbol);
    const rootNote = scaleNotes[i];
    const noteNames = buildTriadWithOctave(scaleNotes, i, 4);
    const frequencies = noteNames.map((n) => Note.freq(n) as number);

    return {
      degree: i + 1,
      romanNumeral: deriveRomanNumeral(i, quality),
      chordSymbol,
      rootNote,
      noteNames,
      frequencies,
      harmonicFunction: HARMONIC_FUNCTIONS[i],
      quality,
    };
  });
}
