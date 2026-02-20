# Phase 2: Chord Engine + Synth Mode - Research

**Researched:** 2026-02-18
**Domain:** Music theory computation (diatonic chord generation from key + mode), polyphonic voice management (chord playback with voice stealing), arc/radial UI layout (CSS trig functions), Zustand state extensions
**Confidence:** HIGH

## Summary

Phase 2 transforms Schmidi from an 8-voice monophonic pad instrument into a playable chord instrument. The core technical challenges are: (1) generating correct diatonic chords from any key + any of 8 modes, (2) adapting the existing Voice/VoiceManager architecture to play chords (3-4 notes simultaneously per chord, multiple chords allowed), (3) implementing voice stealing when the polychordal limit is exceeded, and (4) building an arc/circular UI layout for 7 diatonic chord buttons with a circular key selector.

The music theory computation is well-handled by the `tonal` library (v6.4.3, TypeScript-native, ~267KB unpacked / ~6KB gzipped). Its `Mode.triads()`, `Mode.notes()`, and `Note.freq()` APIs directly solve the key+mode-to-chord-frequencies pipeline. The alternative -- hand-rolling mode interval tables and frequency calculations -- is feasible but error-prone (7 modes x 7 degrees x chord qualities = many edge cases). `tonal` is the standard choice here.

The audio architecture requires a new `ChordVoiceManager` that dynamically allocates voices from a pool. Each chord needs 3 voices (triads). With polychordal support, the total voice pool should be sized at ~24 voices (allowing ~8 simultaneous triads before voice stealing kicks in, or ~6 with comfortable headroom). Voices are reused by retuning their oscillator frequency -- the existing Voice class already has `setFrequency()` for this. Voice stealing uses oldest-first allocation.

For the UI, CSS trigonometric functions (`sin()`, `cos()`) are now baseline-supported across all modern browsers and are the standard approach for positioning elements along an arc. No JavaScript layout library needed.

**Primary recommendation:** Add `tonal` as a dependency for music theory. Build a `ChordVoiceManager` wrapping a pool of the existing `Voice` instances. Use CSS `sin()`/`cos()` for arc layout. Extend the Zustand store with chord engine state (selected key, mode, active chords).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Circle/arc arrangement for the 7 diatonic chords -- hints at harmonic relationships
- Labels: Roman numeral primary (I, ii, iii, IV, V, vi, vii deg), note name secondary (smaller text underneath)
- Color-coded by harmonic function: tonic group (I, iii, vi), subdominant group (ii, IV), dominant group (V, vii deg) -- each group has its own color family
- Size variation: tonic chord (I) is larger/more prominent than the others
- Active chord state: button scales up slightly when pressed -- tactile feel
- Hold-to-play: chord sounds while mouse button or key is held, releases on lift (organ-style)
- Keyboard mapping: home row keys (A S D F G H J) map to the 7 diatonic chords
- Key labels always visible on each chord button + button highlights on key press
- Polychordal: multiple chords can sound simultaneously (hold multiple keys)
- Soft voice limit with voice stealing -- oldest voices released when limit exceeded
- Chord-to-chord transitions: overlap allowed (old chord fades via release while new chord attacks -- legato transitions)
- Release behavior: ADSR envelope release -- notes fade out musically, no instant cut
- No individual note display on chord buttons -- just chord name, keep it clean
- Key selection: circular selector (circle of fifths or chromatic wheel -- visual, musical)
- Live key/mode switching: if a chord is sounding, its notes retune immediately to the new key/mode
- Master volume: vertical slider (traditional fader)
- Per-track volume: expandable panel -- hidden by default, expand to reveal individual track sliders (cleaner main view)

### Claude's Discretion
- Mode selector control type (dropdown, segmented, radial -- whatever complements the circular key selector)
- Key/mode selector placement relative to chord arc
- Volume/mixing controls placement
- Level meter inclusion (may already be covered by Phase 1 plan 05 monitoring)
- Voice stealing threshold (how many simultaneous voices before stealing kicks in)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CHORD-01 | User can select a key (C through B) and mode (major, minor, dorian, phrygian, lydian, mixolydian, aeolian, locrian) | `tonal` library: 12 chromatic keys via `Note.get()`, 8 modes via `Mode.names()` + aliases. Circular key selector (CSS trig) + mode selector. Live retuning via `Voice.setFrequency()`. |
| CHORD-02 | App generates diatonic chord grid from selected key + mode | `Mode.triads(modeName, tonic)` returns 7 diatonic chord symbols. `Mode.notes(modeName, tonic)` returns 7 scale degree notes. Build triads by stacking 3rds from each degree: `[degree, degree+2, degree+4]` in the scale. `Note.freq(noteName + octave)` converts to Hz. |
| CHORD-03 | User can click/hold chord buttons to play chords directly (synth mode) | ChordVoiceManager allocates 3 voices per chord from pool. Hold-to-play triggers attack on mousedown/keydown, release on mouseup/keyup. Home row keys A-J map to 7 chords. Polychordal via simultaneous key holds. |
| CTRL-01 | Per-track volume sliders for each sliding track and the anchor track | Phase 2 scope: per-voice-group gain nodes. Each chord routes through a group GainNode before master bus. Expandable panel UI with individual sliders. Full per-track implementation extends in Phase 3 when tracks exist. |
| CTRL-02 | Master volume control | Already implemented in Phase 1 (VolumeControl component + masterBus.setMasterVolume). Phase 2 preserves and repositions it in the new layout. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tonal | ^6.4.3 | Music theory: modes, scales, chords, note frequencies | TypeScript-native, 6KB gzipped, pure functions, no audio dependencies. Standard JS music theory library. Provides `Mode.triads()`, `Mode.notes()`, `Note.freq()` -- exactly the APIs needed for diatonic chord generation. Source: [tonal GitHub](https://github.com/tonaljs/tonal) |
| Web Audio API | Browser-native | Voice pool, oscillators, gain scheduling | Already in use from Phase 1. Extend with dynamic voice allocation. |
| React | ^19.x | UI components for chord arc, key/mode selectors | Already installed. |
| Zustand | ^5.x | Chord engine state (key, mode, active chords, voice states) | Already installed. Extend existing store with chord state slice. |
| Tailwind CSS | ^4.x | Styling for chord buttons, selectors, layout | Already installed. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| CSS trig functions (sin/cos) | Browser-native | Arc/circular layout positioning | Baseline support in all modern browsers (Chrome, Firefox, Safari, Edge). Use for chord arc and circular key selector. No library needed. Source: [web.dev CSS trig functions](https://web.dev/articles/css-trig-functions) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| tonal | Hand-rolled mode/chord tables | Feasible for 7 modes, but error-prone: 7 modes x 7 degrees x chord quality logic + frequency math. tonal is 6KB gzipped, TypeScript, pure functions. Not worth hand-rolling. |
| tonal | Tone.js | Tone.js is an audio framework (80KB+), not a music theory library. Overkill -- we only need data computation, not audio. Phase 1 already uses raw Web Audio API. |
| CSS trig for arc layout | JavaScript layout computation | CSS trig is cleaner, more performant, and now baseline-supported. JS computation would be needed for dynamic repositioning on resize, but CSS custom properties + trig handle this natively. |
| Dynamic voice creation | Pre-allocated fixed voice pool | Dynamic creation (new OscillatorNode per note) is the Web Audio standard and avoids the complexity of frequency-retuning artifacts. However, the existing Phase 1 Voice class uses persistent oscillators with `setFrequency()`, which is cleaner for retuning and avoids start/stop overhead. Recommend: pool of persistent voices, retune on allocation. |

**Installation:**
```bash
npm install tonal
```

No other new dependencies needed. All other tools (React, Zustand, Tailwind, Web Audio) are already installed from Phase 1.

## Architecture Patterns

### Recommended Project Structure (New/Modified Files)
```
src/
├── renderer/
│   ├── audio/
│   │   ├── Voice.ts               # EXISTING -- no changes needed
│   │   ├── VoiceManager.ts        # EXISTING -- retained for Phase 1 compatibility, may be deprecated
│   │   ├── ChordVoiceManager.ts   # NEW -- voice pool for chord playback
│   │   ├── masterBus.ts           # EXISTING -- extend with per-chord group gains
│   │   ├── audioContext.ts         # EXISTING -- no changes
│   │   ├── constants.ts            # MODIFY -- add chord voice pool size, keyboard mapping
│   │   └── envelopePresets.ts      # EXISTING -- no changes
│   ├── music/
│   │   ├── chordEngine.ts          # NEW -- key/mode selection, diatonic chord generation
│   │   ├── musicTypes.ts           # NEW -- chord, key, mode type definitions
│   │   └── noteFrequency.ts        # NEW -- note name to frequency with octave assignment
│   ├── components/
│   │   ├── ChordArc.tsx            # NEW -- arc layout of 7 diatonic chord buttons
│   │   ├── ChordButton.tsx         # NEW -- single chord button (Roman numeral + note name)
│   │   ├── KeySelector.tsx         # NEW -- circular key selector (circle of fifths)
│   │   ├── ModeSelector.tsx        # NEW -- mode selector (complements circular key)
│   │   ├── PerTrackVolume.tsx      # NEW -- expandable per-track volume panel
│   │   ├── VolumeControl.tsx       # EXISTING -- repositioned in new layout
│   │   ├── App.tsx                 # MODIFY -- new layout with chord arc as centerpiece
│   │   └── ... (existing Phase 1 components retained)
│   ├── store/
│   │   └── synthStore.ts           # MODIFY -- add chord engine state slice
│   └── hooks/
│       └── useChordKeyboard.ts     # NEW -- keyboard handler for chord triggering
├── shared/
│   └── types.ts                    # MODIFY -- add chord/music types
└── __tests__/
    ├── chordEngine.test.ts          # NEW -- diatonic chord generation tests
    ├── ChordVoiceManager.test.ts    # NEW -- voice pool allocation tests
    └── noteFrequency.test.ts        # NEW -- frequency calculation tests
```

### Pattern 1: Chord Engine (Music Theory Layer)

**What:** Pure TypeScript module using `tonal` to generate diatonic chord data from a key + mode selection. No audio dependencies. Input: key name + mode name. Output: array of 7 ChordData objects (chord symbol, Roman numeral, constituent note names, harmonic function group, frequencies at target octave).

**When to use:** Every time the user changes key or mode. The output feeds both the UI (chord button labels/colors) and the audio layer (frequencies for voice allocation).

**Example:**
```typescript
// music/chordEngine.ts
import { Mode, Note } from 'tonal';

export type HarmonicFunction = 'tonic' | 'subdominant' | 'dominant';

export interface ChordData {
  degree: number;           // 1-7
  romanNumeral: string;     // "I", "ii", "iii", "IV", "V", "vi", "vii°"
  chordSymbol: string;      // "C", "Dm", "Em", etc. (from Mode.triads)
  rootNote: string;         // "C", "D", "E", etc.
  noteNames: string[];      // ["C4", "E4", "G4"] -- with octave
  frequencies: number[];    // [261.63, 329.63, 392.00] -- Hz
  harmonicFunction: HarmonicFunction;
  quality: 'major' | 'minor' | 'diminished';
}

// Harmonic function mapping (same for all modes -- based on degree position)
const HARMONIC_FUNCTIONS: HarmonicFunction[] = [
  'tonic',        // I
  'subdominant',  // ii
  'tonic',        // iii (tonic group)
  'subdominant',  // IV
  'dominant',     // V
  'tonic',        // vi (tonic group)
  'dominant',     // vii° (dominant group)
];

const ROMAN_NUMERALS_MAJOR = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
// Derived from chord quality -- uppercase for major, lowercase for minor, ° for dim

export function generateDiatonicChords(
  key: string,   // "C", "D", "Eb", etc.
  mode: string   // "major", "dorian", "phrygian", etc.
): ChordData[] {
  const triads = Mode.triads(mode, key);     // ["C", "Dm", "Em", "F", "G", "Am", "Bdim"]
  const scaleNotes = Mode.notes(mode, key);  // ["C", "D", "E", "F", "G", "A", "B"]

  return triads.map((chordSymbol, i) => {
    const quality = getChordQuality(chordSymbol);
    const rootNote = scaleNotes[i];
    const noteNames = buildTriadNotes(scaleNotes, i);
    const frequencies = noteNames.map(n => Note.freq(n) as number);

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
```

### Pattern 2: Voice Pool with Chord Allocation

**What:** A `ChordVoiceManager` that manages a pool of N Voice instances. When a chord is triggered, 3 voices are allocated from the pool, retuned to the chord's frequencies, and attack is triggered. When a chord is released, those 3 voices enter ADSR release. Voice stealing reclaims the oldest active chord's voices when the pool is exhausted.

**When to use:** All chord playback. Replaces the Phase 1 direct voice-index triggering for chord mode.

**Key design decisions:**
- Pool size: 24 voices (8 simultaneous triads). Voice stealing threshold at ~18 (6 chords) for comfortable headroom.
- Voice allocation unit: 3 voices per chord (triad). Allocated as a group, released as a group.
- Oldest-first stealing: when pool is full, release the chord that was triggered earliest.
- Frequency retuning: use existing `Voice.setFrequency()` with anti-click scheduling.
- Per-chord group gain: optional intermediate GainNode per chord allocation for future per-track volume.

**Example:**
```typescript
// audio/ChordVoiceManager.ts

interface ChordAllocation {
  chordId: string;           // unique ID for this chord trigger
  voiceIndices: number[];    // indices into the voice pool
  triggerTime: number;       // audioContext.currentTime when triggered
  frequencies: number[];     // frequencies assigned to voices
}

export class ChordVoiceManager {
  private voices: Voice[];
  private allocations: Map<string, ChordAllocation> = new Map();
  private masterBus: MasterBus;
  private ctx: AudioContext;
  private maxVoices: number;

  constructor(ctx: AudioContext, poolSize: number = 24) {
    this.ctx = ctx;
    this.maxVoices = poolSize;
    this.masterBus = createMasterBus(ctx);
    this.voices = Array.from({ length: poolSize }, () =>
      new Voice(ctx, this.masterBus.masterGain, 440, 0)
    );
  }

  triggerChord(chordId: string, frequencies: number[]): void {
    // Find free voices or steal oldest
    const indices = this.allocateVoices(frequencies.length);
    if (!indices) return; // shouldn't happen with stealing

    // Retune and trigger
    frequencies.forEach((freq, i) => {
      this.voices[indices[i]].setFrequency(freq);
      this.voices[indices[i]].triggerAttack();
    });

    this.allocations.set(chordId, {
      chordId,
      voiceIndices: indices,
      triggerTime: this.ctx.currentTime,
      frequencies,
    });
  }

  releaseChord(chordId: string): void {
    const alloc = this.allocations.get(chordId);
    if (!alloc) return;

    for (const idx of alloc.voiceIndices) {
      this.voices[idx].triggerRelease();
    }
    // Remove after release time (voices return to idle)
    this.allocations.delete(chordId);
  }

  private allocateVoices(count: number): number[] {
    // 1. Find idle voices
    const idle = this.voices
      .map((v, i) => ({ voice: v, index: i }))
      .filter(({ voice }) => !voice.isActive);

    if (idle.length >= count) {
      return idle.slice(0, count).map(v => v.index);
    }

    // 2. Voice stealing -- release oldest chord
    const oldest = this.getOldestAllocation();
    if (oldest) {
      this.releaseChord(oldest.chordId);
      // Reclaim those voices immediately
      return oldest.voiceIndices.slice(0, count);
    }

    return []; // fallback
  }

  private getOldestAllocation(): ChordAllocation | null {
    let oldest: ChordAllocation | null = null;
    for (const alloc of this.allocations.values()) {
      if (!oldest || alloc.triggerTime < oldest.triggerTime) {
        oldest = alloc;
      }
    }
    return oldest;
  }
}
```

### Pattern 3: Arc Layout with CSS Trigonometric Functions

**What:** Position 7 chord buttons along an arc using CSS `sin()` and `cos()` functions with custom properties. Each button's position is calculated from its index and the arc's radius/angle range.

**When to use:** ChordArc component layout.

**Example:**
```css
/* Chord arc: 7 buttons along a ~180-degree arc */
.chord-arc {
  --radius: 200px;
  --start-angle: -90deg;   /* top of arc */
  --sweep: 180deg;         /* half circle */
  --count: 7;
  position: relative;
  width: calc(var(--radius) * 2 + 100px);
  height: calc(var(--radius) + 100px);
}

.chord-button {
  --angle: calc(
    var(--start-angle) + var(--sweep) * var(--i) / (var(--count) - 1)
  );
  position: absolute;
  left: calc(50% + var(--radius) * cos(var(--angle)));
  top: calc(var(--radius) + var(--radius) * sin(var(--angle)));
  transform: translate(-50%, -50%);
}
```

```tsx
// React: set --i as inline style per button
{chords.map((chord, i) => (
  <div
    key={i}
    className="chord-button"
    style={{ '--i': i } as React.CSSProperties}
  >
    <ChordButton chord={chord} />
  </div>
))}
```

### Pattern 4: Live Key/Mode Retuning

**What:** When user changes key or mode while chords are sounding, all currently active voice allocations retune their oscillator frequencies to the new chord's notes in the new key/mode. Uses existing `Voice.setFrequency()` which applies `setValueAtTime` (instant, anti-click).

**When to use:** Key or mode change events while chords are held.

**Example:**
```typescript
// In store action or chord engine:
function handleKeyModeChange(newKey: string, newMode: string): void {
  const newChords = generateDiatonicChords(newKey, newMode);

  // For each currently active chord allocation, retune voices
  for (const [chordId, allocation] of chordVoiceManager.getAllocations()) {
    const degree = extractDegreeFromChordId(chordId);
    const newFreqs = newChords[degree - 1].frequencies;

    allocation.voiceIndices.forEach((voiceIdx, i) => {
      voices[voiceIdx].setFrequency(newFreqs[i]);
    });
  }
}
```

### Anti-Patterns to Avoid

- **Creating new OscillatorNodes per chord trigger:** Wasteful and causes GC pressure. Use persistent oscillators with frequency retuning from the Phase 1 pattern.
- **Computing chord frequencies in the render loop:** Music theory computation should happen on key/mode change only, not per frame. Cache the ChordData array.
- **Storing tonal library objects in React state:** `tonal` returns plain objects/arrays, but store only the extracted data (frequencies, names) in Zustand, not intermediate library objects.
- **Hard-coding mode interval tables:** Use `tonal` -- it handles all 7 modes correctly including edge cases (Locrian diminished tonic triad, Lydian augmented fourth, etc.).
- **Using `setTimeout` for voice stealing:** Voice management must be synchronous with audio scheduling. Use `audioContext.currentTime` for all timing decisions.
- **Mapping chord degrees 1:1 to Phase 1 voice indices:** Phase 2 chords need 3 voices each (triads), not 1 voice per button. The voice pool is a separate concern from the chord grid.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Diatonic chord generation from mode + key | Mode interval tables + chord quality derivation + enharmonic handling | `tonal` Mode.triads(), Mode.notes() | 7 modes x 7 degrees x quality logic. tonal handles Locrian dim, Lydian aug4, enharmonic spellings, all edge cases. 6KB gzipped. |
| Note name to frequency conversion | `440 * Math.pow(2, (midi - 69) / 12)` with hand-rolled note-to-MIDI table | `tonal` Note.freq() | Handles all note names including sharps/flats/double-accidentals, octave numbers. One function call. |
| Roman numeral derivation from chord quality | String manipulation on chord symbols | Derive from tonal output: uppercase = major, lowercase = minor, dim suffix = diminished | tonal's chord symbols encode quality. Parse once, cache. |
| Circle-of-fifths key order | Hard-coded array of 12 keys in fifths order | Constant: `['C','G','D','A','E','B','F#','Db','Ab','Eb','Bb','F']` | This IS a constant -- 12 items, never changes. Acceptable to hard-code. tonal doesn't provide circle-of-fifths ordering directly. |
| Arc layout positioning | JavaScript getBoundingClientRect + manual positioning | CSS `sin()` / `cos()` with custom properties | Browser-native, GPU-accelerated, responsive. No JS layout computation needed. |

**Key insight:** Music theory computation has many edge cases (enharmonic equivalents, diminished chords, augmented intervals). `tonal` encodes decades of music theory correctly. The audio layer (voice management, gain scheduling) is custom because it must integrate with the existing Phase 1 Web Audio architecture.

## Common Pitfalls

### Pitfall 1: Octave Assignment for Chord Notes
**What goes wrong:** All chord notes end up in the same octave, producing a cluster instead of a spread voicing. Or notes cross octave boundaries incorrectly (e.g., B followed by C should be C in the next octave up, not the same octave).
**Why it happens:** `Mode.notes()` returns note names without octave numbers. Naive octave assignment puts all notes in one octave.
**How to avoid:** When building triads from scale degrees, track octave crossings. If a note in the triad is lower in pitch letter than the root, it should be in the next octave up. Example: B-D-F in B diminished -- D and F are in the octave above B. Assign a base octave (e.g., 4) and increment when a note wraps past the root.
**Warning signs:** Chords sound muddy/clustered, or intervals sound wrong (e.g., minor 2nd instead of minor 3rd).

### Pitfall 2: Voice Stealing During Release Phase
**What goes wrong:** A voice in its ADSR release phase is "stolen" and immediately retuned to a new frequency, causing an audible pitch jump in the release tail.
**Why it happens:** The voice's gain is still non-zero during release. Changing frequency while gain > 0 produces a click or audible frequency change.
**How to avoid:** When stealing a voice, first check if it's in release phase. If so, schedule a hard silence (`gain.setValueAtTime(0, now)`) before retuning. Or preferentially steal voices that are already idle. Only steal releasing voices as last resort.
**Warning signs:** Brief "chirp" or pitch glitch when many chords overlap.

### Pitfall 3: Stale Chord Data After Key/Mode Change
**What goes wrong:** User changes key while holding a chord. The UI updates but the audio continues playing the old frequencies, or the chord ID mapping becomes inconsistent.
**Why it happens:** Key/mode change regenerates the chord grid. If active chord allocations reference the old chord data by index, the mapping breaks.
**How to avoid:** On key/mode change: (1) regenerate chord data, (2) for each active allocation, look up the NEW chord data for the same degree, (3) retune active voices to new frequencies. Use chord degree (1-7) as the stable identifier, not chord symbol (which changes with key/mode).
**Warning signs:** Wrong notes playing after key change, or audio not updating until chord is re-triggered.

### Pitfall 4: Keyboard Event Conflicts with Phase 1 Voices
**What goes wrong:** The home row keys (A-J) were mapped to 8 individual voices in Phase 1. Phase 2 remaps them to 7 diatonic chords. If both handlers are active, key presses trigger both old voices and new chords.
**Why it happens:** Phase 1's keydown/keyup listeners in App.tsx aren't disabled when chord mode is active.
**How to avoid:** Phase 2 replaces the Phase 1 voice-triggering keyboard handler. The App.tsx keyboard handler should route to chord triggering, not individual voice triggering. The Phase 1 voice buttons may be hidden or relegated to a secondary panel.
**Warning signs:** Double-triggering, unexpected notes alongside chords, key mapping confusion.

### Pitfall 5: Too Many Simultaneous Oscillators Causing Audio Glitches
**What goes wrong:** With a 24-voice pool and polychordal support, triggering many chords quickly can exceed the browser's audio processing budget, causing crackling or dropouts.
**Why it happens:** Each oscillator is a real-time DSP operation. 24 running oscillators is manageable, but combined with the existing Phase 1 voices (if still running), the total could exceed limits.
**How to avoid:** (1) Dispose or silence Phase 1 voice instances when chord mode is active. (2) Keep voice pool at 24 max. (3) The DynamicsCompressor on the master bus will help prevent clipping but won't prevent CPU overload -- voice stealing is the real safety valve. (4) Monitor AudioContext `baseLatency` and warn if it increases.
**Warning signs:** Audio crackling, increasing `baseLatency`, browser tab becoming unresponsive during heavy polychordal passages.

### Pitfall 6: CSS Trig Functions and Browser Calc Precision
**What goes wrong:** Chord buttons in the arc are slightly misaligned or the arc doesn't render as expected in certain browsers.
**Why it happens:** CSS `sin()`/`cos()` use `<angle>` values and some combinations with `calc()` can have edge cases. Also, the arc size may not adapt well to different window sizes without proper responsive design.
**How to avoid:** Use `deg` units consistently. Test the arc layout at minimum window size (800x500). Use CSS custom properties for radius so it can be responsive via media queries or container queries. Fallback: compute positions in JS if CSS trig proves problematic in Electron's Chromium.
**Warning signs:** Buttons overlapping at small window sizes, uneven spacing, buttons outside the visible area.

## Code Examples

### Diatonic Chord Generation with tonal
```typescript
// music/chordEngine.ts
// Source: tonal GitHub README, @tonaljs/mode npm docs

import { Mode, Note } from 'tonal';

// Mode name aliases (user-facing -> tonal internal)
export const MODE_ALIASES: Record<string, string> = {
  'major': 'ionian',
  'minor': 'aeolian',
  'dorian': 'dorian',
  'phrygian': 'phrygian',
  'lydian': 'lydian',
  'mixolydian': 'mixolydian',
  'aeolian': 'aeolian',
  'locrian': 'locrian',
};

// Generate scale notes for a mode
// Mode.notes("dorian", "D") => ["D", "E", "F", "G", "A", "B", "C"]
const notes = Mode.notes('dorian', 'D');

// Generate diatonic triads for a mode
// Mode.triads("dorian", "D") => ["Dm", "Em", "F", "G", "Am", "Bdim", "C"]
const triads = Mode.triads('dorian', 'D');

// Get frequency for a note with octave
// Note.freq("C4") => 261.6255653005986
// Note.freq("A4") => 440
const freq = Note.freq('C4');
```

### Building Chord Frequencies with Octave Tracking
```typescript
// music/noteFrequency.ts
// Source: tonal Note.freq API + equal temperament octave logic

import { Note } from 'tonal';

const NOTE_ORDER = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

/**
 * Build triad note names with correct octave assignment.
 * Prevents octave clustering by tracking when notes wrap past the root.
 */
export function buildTriadWithOctave(
  scaleNotes: string[],
  degreeIndex: number,
  baseOctave: number = 4
): string[] {
  const triadIndices = [0, 2, 4]; // root, third, fifth (stacked thirds)
  const scaleLength = scaleNotes.length;

  let currentOctave = baseOctave;
  let prevNoteOrder = -1;

  return triadIndices.map((offset) => {
    const noteIndex = (degreeIndex + offset) % scaleLength;
    const noteName = scaleNotes[noteIndex];

    // Determine note position in chromatic order
    const letterIndex = NOTE_ORDER.indexOf(noteName.charAt(0));

    // If this note is lower than previous, we've crossed an octave boundary
    if (letterIndex <= prevNoteOrder && prevNoteOrder !== -1) {
      currentOctave++;
    }
    prevNoteOrder = letterIndex;

    return `${noteName}${currentOctave}`;
  });
}

// Usage:
// const scaleNotes = Mode.notes('major', 'C'); // ["C","D","E","F","G","A","B"]
// buildTriadWithOctave(scaleNotes, 0, 4)  => ["C4", "E4", "G4"]
// buildTriadWithOctave(scaleNotes, 6, 4)  => ["B4", "D5", "F5"]
```

### Chord Quality and Roman Numeral Derivation
```typescript
// music/chordEngine.ts
// Source: Music theory conventions

type ChordQuality = 'major' | 'minor' | 'diminished' | 'augmented';

/**
 * Derive chord quality from tonal chord symbol.
 * tonal Mode.triads() returns: "C" (major), "Dm" (minor), "Bdim" (diminished)
 */
export function getChordQuality(chordSymbol: string): ChordQuality {
  if (chordSymbol.includes('dim')) return 'diminished';
  if (chordSymbol.includes('aug')) return 'augmented';
  // If the symbol has a lowercase 'm' after the root note (but not 'maj')
  const root = chordSymbol.charAt(0);
  const suffix = chordSymbol.slice(root === chordSymbol.charAt(0) ? 1 : 0);
  if (suffix.startsWith('m') && !suffix.startsWith('maj')) return 'minor';
  return 'major';
}

/**
 * Derive Roman numeral from degree and quality.
 */
export function deriveRomanNumeral(degree: number, quality: ChordQuality): string {
  const numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  const numeral = numerals[degree];

  switch (quality) {
    case 'major': return numeral;                    // "I", "IV", "V"
    case 'minor': return numeral.toLowerCase();      // "ii", "iii", "vi"
    case 'diminished': return numeral.toLowerCase() + '\u00B0'; // "vii°"
    case 'augmented': return numeral + '+';           // rare in diatonic context
  }
}
```

### Circle of Fifths Key Selector Data
```typescript
// music/musicTypes.ts

/** Keys in circle of fifths order (clockwise from C at top) */
export const CIRCLE_OF_FIFTHS = [
  'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'
] as const;

/** Display-friendly key names (enharmonic preferences) */
export const KEY_DISPLAY: Record<string, string> = {
  'C': 'C', 'G': 'G', 'D': 'D', 'A': 'A', 'E': 'E', 'B': 'B',
  'F#': 'F#', 'Db': 'Db', 'Ab': 'Ab', 'Eb': 'Eb', 'Bb': 'Bb', 'F': 'F',
};

/** All supported modes */
export const MODES = [
  'major', 'minor', 'dorian', 'phrygian',
  'lydian', 'mixolydian', 'aeolian', 'locrian'
] as const;

export type MusicalKey = typeof CIRCLE_OF_FIFTHS[number];
export type MusicalMode = typeof MODES[number];
```

### Zustand Store Extension for Chord State
```typescript
// store/synthStore.ts -- additional state for chord engine

interface ChordEngineState {
  selectedKey: MusicalKey;
  selectedMode: MusicalMode;
  chordGrid: ChordData[];         // 7 diatonic chords (recomputed on key/mode change)
  activeChords: Set<number>;      // degrees currently held (1-7)
  perTrackVolumes: number[];      // per-track volume levels
  perTrackExpanded: boolean;      // whether per-track panel is visible

  // Actions
  setKey: (key: MusicalKey) => void;
  setMode: (mode: MusicalMode) => void;
  triggerChord: (degree: number) => void;
  releaseChord: (degree: number) => void;
  setPerTrackVolume: (index: number, volume: number) => void;
  togglePerTrackPanel: () => void;
}
```

### Keyboard Mapping for Chord Triggering
```typescript
// audio/constants.ts -- updated for Phase 2

/** Keyboard keys mapped to 7 diatonic chords (home row) */
export const CHORD_KEYS = ['a', 's', 'd', 'f', 'g', 'h', 'j'] as const;

// Note: Phase 1 used ['a','s','d','f','j','k','l',';'] for 8 voices.
// Phase 2 maps 7 keys to 7 chords. The 'g' key fills the gap between
// 'f' and 'j' (Phase 1 skipped it for the 4+4 split layout).
```

## Discretion Recommendations

### Mode Selector Control Type
**Recommendation:** Horizontal segmented control (pill-shaped buttons in a row) placed directly below the circular key selector. This pairs well with the circular key selector by contrasting the circular (spatial) key selection with a linear (sequential) mode selection. A radial mode selector would compete visually with the key circle and the chord arc. A dropdown hides the options and adds a click. Segmented control shows all 8 modes at once, with the active mode highlighted.
**Confidence:** HIGH -- common UI pattern, visually clean, complements the circular key selector without competing with it.

### Key/Mode Selector Placement
**Recommendation:** Place the circular key selector and mode selector in the upper-center of the layout, above the chord arc. The chord arc occupies the main center space (it IS the instrument face). Key/mode selection is a setup action (less frequent), so it belongs above the arc -- visible but not competing for space. The key circle is small (~120px diameter) with the mode segmented control below it (~300px wide).
**Confidence:** MEDIUM -- layout needs hands-on validation. May need to shift to side position if vertical space is tight at 500px minimum height.

### Volume/Mixing Controls Placement
**Recommendation:** Master volume slider in the right margin (vertical, same position as Phase 1). Per-track volume in an expandable panel that slides out from the right edge (or bottom edge) -- hidden by default per user decision. This keeps the main view clean and focused on the chord arc.
**Confidence:** MEDIUM -- expandable panel interaction needs prototyping. Slide-out from right is standard for settings panels.

### Level Meter Inclusion
**Recommendation:** The Phase 1 oscilloscope already provides visual audio feedback via the master bus AnalyserNode. No additional level meter needed for Phase 2. The oscilloscope can be repositioned alongside the volume control in the right margin. If a simple peak meter is desired later, it can use the same AnalyserNode's `getByteFrequencyData()`.
**Confidence:** HIGH -- Phase 1 already covers this with the Oscilloscope component.

### Voice Stealing Threshold
**Recommendation:** Voice pool size of 24 (8 triads), with soft voice stealing kicking in when all 24 voices are active. In practice, this means the 9th simultaneous chord steals from the oldest. For typical playing (2-3 chords at once with legato overlap), 24 voices provides ample headroom. This is generous -- even Tone.js PolySynth defaults to 32 voices for a general-purpose polysynth.
**Confidence:** HIGH -- 24 oscillators is well within Web Audio performance budget (Chromium handles 100+ with ease). The compressor on the master bus prevents clipping.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual mode interval tables | `tonal` library Mode module | tonal v6.x (stable since 2023) | Eliminates hand-rolled music theory code. Pure functions, TypeScript, tree-shakeable. |
| JavaScript layout for circle/arc UI | CSS `sin()` / `cos()` trigonometric functions | Baseline across browsers since 2023 | No JS needed for arc positioning. More performant, declarative, responsive. |
| Fixed voice count (N oscillators) | Dynamic voice pool with allocation/stealing | Standard synth architecture | Allows polychordal playback without pre-determining max simultaneous chords. |

**Deprecated/outdated:**
- `tonal` v2 (pre-2020): Completely different API. Current is v6.4.3.
- Manual CSS transform `rotate() translateY() rotate()` for circular layout: Still works but CSS trig functions are cleaner and more readable.

## Open Questions

1. **tonal `Mode.triads()` output format for edge cases**
   - What we know: `Mode.triads("major", "C")` returns `["C", "Dm", "Em", "F", "G", "Am", "Bdim"]`. Standard major/minor/dim chord symbols.
   - What's unclear: Exact format for modes with unusual qualities. Does `Mode.triads("locrian", "B")` return `"Bdim"` as first chord? Does `Mode.triads("lydian", "F")` handle the augmented triad on degree ii correctly?
   - Recommendation: Write unit tests for all 8 modes during implementation. Verify tonal output against known music theory references. LOW risk -- tonal is mature and well-tested.

2. **Voice retuning audibility during key/mode switch**
   - What we know: `Voice.setFrequency()` uses `setValueAtTime` (instant change). When a chord is sounding, changing frequency will produce an instant pitch change.
   - What's unclear: Whether the instant frequency change produces a click. Phase 1 voices use detune offsets which may interact with frequency changes.
   - Recommendation: Test during implementation. If instant change clicks, use `linearRampToValueAtTime` with a very short ramp (5-10ms) for smooth retuning. This is a minor refinement, not an architectural concern.

3. **Per-track volume scope in Phase 2 vs Phase 3**
   - What we know: CTRL-01 requires per-track volume. Phase 2 doesn't have "tracks" yet (tracks are a Phase 3 slide mode concept).
   - What's unclear: How to implement "per-track" volume when the only tracks in Phase 2 are chord voice groups.
   - Recommendation: Phase 2 implements per-chord-group volume as a step toward CTRL-01. The expandable panel shows volume sliders for each active chord group. When Phase 3 adds sliding tracks + anchor track, the per-track sliders become per-track. The UI pattern (expandable panel with sliders) is the same.

## Sources

### Primary (HIGH confidence)
- [tonal GitHub](https://github.com/tonaljs/tonal) -- Mode.triads(), Mode.notes(), Note.freq() APIs, TypeScript support, package version 6.4.3
- [@tonaljs/mode npm](https://www.npmjs.com/package/@tonaljs/mode) -- Mode module API: Mode.triads(), Mode.seventhChords(), Mode.notes(), Mode.names()
- [@tonaljs/key GitHub](https://github.com/tonaljs/tonal/tree/main/packages/key) -- Key.majorKey() returns triads, chords, chordScales, grades, intervals
- [web.dev CSS trig functions](https://web.dev/articles/css-trig-functions) -- CSS sin()/cos() for circular positioning, baseline browser support
- [CSS-Tricks CSS sin/cos](https://css-tricks.com/creating-a-clock-with-the-new-css-sin-and-cos-trigonometry-functions/) -- Practical examples of circular element positioning
- [MDN OscillatorNode.frequency](https://developer.mozilla.org/en-US/docs/Web/API/OscillatorNode/frequency) -- Frequency AudioParam scheduling for retuning
- [Tone.js PolySynth docs](https://tonejs.github.io/) -- Voice allocation patterns for polyphonic synthesis
- Phase 1 codebase: Voice.ts, VoiceManager.ts, masterBus.ts, synthStore.ts -- existing architecture to extend

### Secondary (MEDIUM confidence)
- [tonal docs getting started](https://tonaljs.github.io/tonal/docs) -- Usage examples for Note, Scale, Chord, Mode modules
- [react-circle-of-fifths](https://github.com/epiccoleman/react-circle-of-fifths) -- React circle-of-fifths component (reference for UI pattern, not a dependency)
- [WhatsMusic/circle-of-fifths](https://github.com/WhatsMusic/circle-of-fifths) -- Vanilla JS circle of fifths implementation (reference)
- [LogRocket CSS trig functions](https://blog.logrocket.com/css-trig-functions-practical-applications/) -- Practical arc layout examples with CSS trig

### Tertiary (LOW confidence)
- Voice pool sizing at 24: Based on general Web Audio performance expectations and Tone.js defaults. Actual performance depends on Electron's Chromium version and system hardware. Needs validation under load.
- Octave assignment logic for triads: Derived from music theory conventions. Edge cases (modes with augmented intervals, enharmonic crossings) may need refinement during implementation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- tonal verified via npm (v6.4.3, TypeScript, active maintenance). CSS trig functions verified via web.dev (baseline support). All other libraries from Phase 1.
- Architecture: HIGH -- Voice pool pattern is standard for polyphonic synths. Chord generation via tonal is well-established. Zustand extension follows existing patterns.
- Music theory: HIGH -- Mode/chord relationships are foundational music theory. tonal encodes them correctly. Verified Mode.triads() output against multiple sources.
- UI layout (arc/circle): MEDIUM -- CSS trig functions are well-supported but arc layout for interactive buttons needs hands-on validation. Circle-of-fifths selector is a known pattern.
- Pitfalls: HIGH -- Voice stealing, octave assignment, and keyboard conflict pitfalls are well-understood from synth design literature and Phase 1 experience.
- Discretion recommendations: MEDIUM -- Layout and control placement are aesthetic choices requiring hands-on iteration.

**Research date:** 2026-02-18
**Valid until:** 2026-03-18 (30 days -- stable domain, mature library)
