/**
 * Octave-aware triad note name generation.
 *
 * Stub created by 02-02 execution to unblock typecheck.
 * Plan 02-01 will provide the full implementation with octave boundary logic.
 */

/** Standard note letter order for octave crossing detection */
const NOTE_ORDER = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

/**
 * Get the letter index (0-6) for a note name, ignoring accidentals.
 * "C#" -> 0, "Db" -> 1, "F" -> 3
 */
function noteLetterIndex(note: string): number {
  const letter = note.charAt(0).toUpperCase();
  const idx = NOTE_ORDER.indexOf(letter);
  return idx >= 0 ? idx : 0;
}

/**
 * Build a triad with correct octave assignments from a scale.
 *
 * Given a scale (e.g. ["C","D","E","F","G","A","B"]), a degree index (0-6),
 * and a base octave, returns 3 note names with octaves that respect
 * ascending pitch order (handling octave crossings).
 *
 * @param scaleNotes - 7-note scale without octave numbers
 * @param degreeIndex - 0-based index into the scale (0 = first degree)
 * @param baseOctave - Starting octave for the root note (default 4)
 * @returns Array of 3 note-octave strings, e.g. ["C4", "E4", "G4"]
 */
export function buildTriadWithOctave(
  scaleNotes: string[],
  degreeIndex: number,
  baseOctave: number = 4
): string[] {
  const len = scaleNotes.length;

  // Triad = root, third, fifth (stacked thirds: indices 0, 2, 4 from degree)
  const triadIndices = [0, 2, 4];
  const result: string[] = [];

  let currentOctave = baseOctave;
  let prevLetterIdx = -1;

  for (const offset of triadIndices) {
    const scaleIdx = (degreeIndex + offset) % len;
    const note = scaleNotes[scaleIdx];
    const letterIdx = noteLetterIndex(note);

    // Detect octave crossing: if this note's letter is at or before the previous
    // note's letter in the natural order, we've crossed an octave boundary
    if (prevLetterIdx >= 0 && letterIdx <= prevLetterIdx) {
      currentOctave++;
    }

    result.push(`${note}${currentOctave}`);
    prevLetterIdx = letterIdx;
  }

  return result;
}
