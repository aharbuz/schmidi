import { describe, it, expect, beforeAll } from 'vitest';
import {
  generateDiatonicChords,
  getChordQuality,
  deriveRomanNumeral,
} from '../renderer/music/chordEngine';
import type { ChordData, ChordQuality } from '../renderer/music/musicTypes';

// ---------------------------------------------------------------------------
// getChordQuality
// ---------------------------------------------------------------------------

describe('getChordQuality', () => {
  it('identifies major chord from symbol without suffix', () => {
    expect(getChordQuality('C')).toBe('major');
    expect(getChordQuality('F')).toBe('major');
    expect(getChordQuality('G')).toBe('major');
  });

  it('identifies minor chord from "m" suffix', () => {
    expect(getChordQuality('Dm')).toBe('minor');
    expect(getChordQuality('Em')).toBe('minor');
    expect(getChordQuality('Am')).toBe('minor');
  });

  it('identifies diminished chord from "dim" suffix', () => {
    expect(getChordQuality('Bdim')).toBe('diminished');
    expect(getChordQuality('F#dim')).toBe('diminished');
  });

  it('handles sharps and flats in chord root', () => {
    expect(getChordQuality('F#')).toBe('major');
    expect(getChordQuality('Bbm')).toBe('minor');
    expect(getChordQuality('Ebdim')).toBe('diminished');
    expect(getChordQuality('Db')).toBe('major');
  });
});

// ---------------------------------------------------------------------------
// deriveRomanNumeral
// ---------------------------------------------------------------------------

describe('deriveRomanNumeral', () => {
  it('returns uppercase for major chords', () => {
    expect(deriveRomanNumeral(0, 'major')).toBe('I');
    expect(deriveRomanNumeral(3, 'major')).toBe('IV');
    expect(deriveRomanNumeral(4, 'major')).toBe('V');
  });

  it('returns lowercase for minor chords', () => {
    expect(deriveRomanNumeral(1, 'minor')).toBe('ii');
    expect(deriveRomanNumeral(2, 'minor')).toBe('iii');
    expect(deriveRomanNumeral(5, 'minor')).toBe('vi');
  });

  it('returns lowercase with degree symbol for diminished chords', () => {
    expect(deriveRomanNumeral(6, 'diminished')).toBe('vii\u00B0');
    expect(deriveRomanNumeral(1, 'diminished')).toBe('ii\u00B0');
  });

  it('returns uppercase with + for augmented chords', () => {
    expect(deriveRomanNumeral(2, 'augmented')).toBe('III+');
  });
});

// ---------------------------------------------------------------------------
// generateDiatonicChords — C major
// ---------------------------------------------------------------------------

describe('generateDiatonicChords — C major', () => {
  let chords: ChordData[];

  beforeAll(() => {
    chords = generateDiatonicChords('C', 'major');
  });

  it('returns exactly 7 chords', () => {
    expect(chords).toHaveLength(7);
  });

  it('assigns correct degrees 1 through 7', () => {
    expect(chords.map((c) => c.degree)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('produces correct chord qualities', () => {
    const qualities = chords.map((c) => c.quality);
    expect(qualities).toEqual([
      'major', 'minor', 'minor', 'major', 'major', 'minor', 'diminished',
    ]);
  });

  it('produces correct Roman numerals', () => {
    const numerals = chords.map((c) => c.romanNumeral);
    expect(numerals).toEqual(['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii\u00B0']);
  });

  it('assigns correct harmonic functions', () => {
    const functions = chords.map((c) => c.harmonicFunction);
    expect(functions).toEqual([
      'tonic', 'subdominant', 'tonic', 'subdominant',
      'dominant', 'tonic', 'dominant',
    ]);
  });

  it('has 3 note names per chord', () => {
    for (const chord of chords) {
      expect(chord.noteNames).toHaveLength(3);
    }
  });

  it('has 3 frequencies per chord, all positive and ascending', () => {
    for (const chord of chords) {
      expect(chord.frequencies).toHaveLength(3);
      for (const freq of chord.frequencies) {
        expect(freq).toBeGreaterThan(0);
      }
      // Ascending order
      expect(chord.frequencies[0]).toBeLessThan(chord.frequencies[1]);
      expect(chord.frequencies[1]).toBeLessThan(chord.frequencies[2]);
    }
  });

  it('has correct root notes', () => {
    const roots = chords.map((c) => c.rootNote);
    expect(roots).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
  });
});

// ---------------------------------------------------------------------------
// generateDiatonicChords — D Dorian
// ---------------------------------------------------------------------------

describe('generateDiatonicChords — D dorian', () => {
  let chords: ChordData[];

  beforeAll(() => {
    chords = generateDiatonicChords('D', 'dorian');
  });

  it('returns 7 chords', () => {
    expect(chords).toHaveLength(7);
  });

  it('produces correct chord qualities for dorian mode', () => {
    // Dorian: min min maj maj min dim maj
    const qualities = chords.map((c) => c.quality);
    expect(qualities).toEqual([
      'minor', 'minor', 'major', 'major', 'minor', 'diminished', 'major',
    ]);
  });

  it('produces correct Roman numerals', () => {
    const numerals = chords.map((c) => c.romanNumeral);
    expect(numerals).toEqual(['i', 'ii', 'III', 'IV', 'v', 'vi\u00B0', 'VII']);
  });
});

// ---------------------------------------------------------------------------
// generateDiatonicChords — B Locrian (diminished tonic)
// ---------------------------------------------------------------------------

describe('generateDiatonicChords — B locrian', () => {
  let chords: ChordData[];

  beforeAll(() => {
    chords = generateDiatonicChords('B', 'locrian');
  });

  it('first chord is diminished', () => {
    expect(chords[0].quality).toBe('diminished');
    expect(chords[0].romanNumeral).toBe('i\u00B0');
  });
});

// ---------------------------------------------------------------------------
// generateDiatonicChords — F Lydian (augmented triad check: degree 2 should be major)
// ---------------------------------------------------------------------------

describe('generateDiatonicChords — F lydian', () => {
  let chords: ChordData[];

  beforeAll(() => {
    chords = generateDiatonicChords('F', 'lydian');
  });

  it('degree 2 is major (not minor)', () => {
    expect(chords[1].quality).toBe('major');
  });

  it('produces correct chord qualities for lydian mode', () => {
    // Lydian: maj maj min dim maj min min
    const qualities = chords.map((c) => c.quality);
    expect(qualities).toEqual([
      'major', 'major', 'minor', 'diminished', 'major', 'minor', 'minor',
    ]);
  });
});

// ---------------------------------------------------------------------------
// All 8 modes x C key — verify each returns 7 chords with correct qualities
// ---------------------------------------------------------------------------

describe('generateDiatonicChords — all 8 modes for C key', () => {
  const expectedQualities: Record<string, ChordQuality[]> = {
    major:      ['major', 'minor', 'minor', 'major', 'major', 'minor', 'diminished'],
    minor:      ['minor', 'diminished', 'major', 'minor', 'minor', 'major', 'major'],
    dorian:     ['minor', 'minor', 'major', 'major', 'minor', 'diminished', 'major'],
    phrygian:   ['minor', 'major', 'major', 'minor', 'diminished', 'major', 'minor'],
    lydian:     ['major', 'major', 'minor', 'diminished', 'major', 'minor', 'minor'],
    mixolydian: ['major', 'minor', 'diminished', 'major', 'minor', 'minor', 'major'],
    aeolian:    ['minor', 'diminished', 'major', 'minor', 'minor', 'major', 'major'],
    locrian:    ['diminished', 'minor', 'major', 'minor', 'major', 'major', 'minor'],
  };

  for (const [mode, qualities] of Object.entries(expectedQualities)) {
    it(`${mode} mode produces correct qualities`, () => {
      const chords = generateDiatonicChords('C', mode);
      expect(chords).toHaveLength(7);
      expect(chords.map((c) => c.quality)).toEqual(qualities);
    });
  }
});

// ---------------------------------------------------------------------------
// Frequency sanity checks
// ---------------------------------------------------------------------------

describe('frequency sanity checks', () => {
  it('C major I chord has frequencies near C4-E4-G4 reference', () => {
    const chords = generateDiatonicChords('C', 'major');
    const cMajor = chords[0];

    // C4 = 261.63, E4 = 329.63, G4 = 392.00 (equal temperament)
    expect(cMajor.frequencies[0]).toBeCloseTo(261.63, 0);
    expect(cMajor.frequencies[1]).toBeCloseTo(329.63, 0);
    expect(cMajor.frequencies[2]).toBeCloseTo(392.00, 0);
  });

  it('A4 frequency is exactly 440 Hz in A minor i chord', () => {
    const chords = generateDiatonicChords('A', 'minor');
    // A minor i = Am = A-C-E -> A4-C5-E5
    expect(chords[0].frequencies[0]).toBeCloseTo(440, 0);
  });
});
