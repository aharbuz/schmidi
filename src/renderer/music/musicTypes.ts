/**
 * Music theory type definitions and constants for chord engine.
 *
 * Provides the foundational types for diatonic chord generation,
 * key/mode selection, and harmonic function classification.
 */

// ---------------------------------------------------------------------------
// Chord Quality & Harmonic Function
// ---------------------------------------------------------------------------

/** Quality of a diatonic triad */
export type ChordQuality = 'major' | 'minor' | 'diminished' | 'augmented';

/** Harmonic function groups (same mapping regardless of mode) */
export type HarmonicFunction = 'tonic' | 'subdominant' | 'dominant';

// ---------------------------------------------------------------------------
// ChordData — the primary output of the chord engine
// ---------------------------------------------------------------------------

/** Complete data for a single diatonic chord */
export interface ChordData {
  /** Scale degree 1-7 */
  degree: number;
  /** Roman numeral label (uppercase=major, lowercase=minor, +deg=dim) */
  romanNumeral: string;
  /** Chord symbol from tonal (e.g. "C", "Dm", "Bdim") */
  chordSymbol: string;
  /** Root note name without octave (e.g. "C", "D") */
  rootNote: string;
  /** Note names with octave (e.g. ["C4","E4","G4"]) */
  noteNames: string[];
  /** Frequencies in Hz (ascending order) */
  frequencies: number[];
  /** Harmonic function group */
  harmonicFunction: HarmonicFunction;
  /** Triad quality */
  quality: ChordQuality;
}

// ---------------------------------------------------------------------------
// Key & Mode Constants
// ---------------------------------------------------------------------------

/** Keys in circle-of-fifths order (clockwise from C) */
export const CIRCLE_OF_FIFTHS = [
  'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F',
] as const;

/** All supported modes */
export const MODES = [
  'major', 'minor', 'dorian', 'phrygian',
  'lydian', 'mixolydian', 'aeolian', 'locrian',
] as const;

/** Type derived from CIRCLE_OF_FIFTHS constant */
export type MusicalKey = (typeof CIRCLE_OF_FIFTHS)[number];

/** Type derived from MODES constant */
export type MusicalMode = (typeof MODES)[number];

// ---------------------------------------------------------------------------
// Harmonic Function Mapping
// ---------------------------------------------------------------------------

/**
 * Maps degree index (0-6) to harmonic function.
 *
 * Degrees 1/3/6 = tonic group, 2/4 = subdominant, 5/7 = dominant.
 * This mapping is consistent across all modes.
 */
export const HARMONIC_FUNCTIONS: readonly HarmonicFunction[] = [
  'tonic',        // I   (degree 1)
  'subdominant',  // ii  (degree 2)
  'tonic',        // iii (degree 3)
  'subdominant',  // IV  (degree 4)
  'dominant',     // V   (degree 5)
  'tonic',        // vi  (degree 6)
  'dominant',     // vii (degree 7)
] as const;

// ---------------------------------------------------------------------------
// Keyboard Mapping
// ---------------------------------------------------------------------------

/** Home row keys mapped to 7 diatonic chords */
export const CHORD_KEYS = ['a', 's', 'd', 'f', 'g', 'h', 'j'] as const;
