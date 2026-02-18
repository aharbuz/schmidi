import { describe, it, expect } from 'vitest';
import { buildTriadWithOctave } from '../renderer/music/noteFrequency';

describe('buildTriadWithOctave', () => {
  // C major scale: C D E F G A B
  const cMajorScale = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

  it('builds C major triad (degree 1) — no octave crossing', () => {
    const result = buildTriadWithOctave(cMajorScale, 0, 4);
    expect(result).toEqual(['C4', 'E4', 'G4']);
  });

  it('builds D minor triad (degree 2) — no octave crossing', () => {
    const result = buildTriadWithOctave(cMajorScale, 1, 4);
    expect(result).toEqual(['D4', 'F4', 'A4']);
  });

  it('builds E minor triad (degree 3) — no octave crossing', () => {
    const result = buildTriadWithOctave(cMajorScale, 2, 4);
    expect(result).toEqual(['E4', 'G4', 'B4']);
  });

  it('builds F major triad (degree 4) — octave crossing on fifth', () => {
    // F-A-C: A is above F, but C is below A -> octave crossing
    const result = buildTriadWithOctave(cMajorScale, 3, 4);
    expect(result).toEqual(['F4', 'A4', 'C5']);
  });

  it('builds G major triad (degree 5) — octave crossing on fifth', () => {
    // G-B-D: B is above G, but D is below B -> octave crossing
    const result = buildTriadWithOctave(cMajorScale, 4, 4);
    expect(result).toEqual(['G4', 'B4', 'D5']);
  });

  it('builds A minor triad (degree 6) — octave crossing on third and fifth', () => {
    // A-C-E: C is below A -> octave crossing, E is above C -> same octave as C
    const result = buildTriadWithOctave(cMajorScale, 5, 4);
    expect(result).toEqual(['A4', 'C5', 'E5']);
  });

  it('builds B diminished triad (degree 7) — octave crossing on third and fifth', () => {
    // B-D-F: D is below B -> octave crossing, F is above D -> same octave as D
    const result = buildTriadWithOctave(cMajorScale, 6, 4);
    expect(result).toEqual(['B4', 'D5', 'F5']);
  });

  // D Dorian scale: D E F G A B C
  const dDorianScale = ['D', 'E', 'F', 'G', 'A', 'B', 'C'];

  it('builds D minor triad from Dorian (degree 1)', () => {
    const result = buildTriadWithOctave(dDorianScale, 0, 4);
    expect(result).toEqual(['D4', 'F4', 'A4']);
  });

  it('builds C major triad from Dorian (degree 7) — wraps around scale', () => {
    // degree 7 in D Dorian: C-E-G (indices 6, 1, 3 wrapping)
    const result = buildTriadWithOctave(dDorianScale, 6, 4);
    expect(result).toEqual(['C4', 'E4', 'G4']);
  });

  // B Locrian scale: B C# D E F# G A (NOTE: tonal uses C# not Db for B locrian)
  // Actually tonal Mode.notes returns note names that may include sharps
  const bLocrianScale = ['B', 'C#', 'D', 'E', 'F#', 'G', 'A'];

  it('builds B diminished triad from Locrian (degree 1) — octave crossing', () => {
    // B-D-F#: D is below B -> octave crossing, F# above D -> same octave
    const result = buildTriadWithOctave(bLocrianScale, 0, 4);
    expect(result).toEqual(['B4', 'D5', 'F#5']);
  });

  it('handles different base octaves', () => {
    const result = buildTriadWithOctave(cMajorScale, 0, 3);
    expect(result).toEqual(['C3', 'E3', 'G3']);
  });

  it('handles sharps in note names correctly', () => {
    // F# major scale: F# G# A# B C# D# E#
    const fSharpScale = ['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#'];
    const result = buildTriadWithOctave(fSharpScale, 0, 4);
    expect(result).toEqual(['F#4', 'A#4', 'C#5']);
  });

  it('handles flats in note names correctly', () => {
    // Db major scale: Db Eb F Gb Ab Bb C
    const dbScale = ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C'];
    const result = buildTriadWithOctave(dbScale, 0, 4);
    expect(result).toEqual(['Db4', 'F4', 'Ab4']);
  });
});
