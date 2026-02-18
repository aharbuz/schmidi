---
phase: 02-chord-engine-synth-mode
verified: 2026-02-18T21:36:00Z
status: gaps_found
score: 4/5 success criteria verified
gaps:
  - truth: "User adjusts per-track volume sliders and individual track levels change independently"
    status: failed
    reason: "PerTrackVolume sliders are uncontrolled inputs (defaultValue only, no onChange handler). No per-track volume state exists in synthStore beyond the expand/collapse boolean. No audio routing exists. Slider movement has zero effect on audio output."
    artifacts:
      - path: "src/renderer/components/PerTrackVolume.tsx"
        issue: "PerTrackSlider uses defaultValue (uncontrolled, line 91) with no onChange handler. Value is never persisted or forwarded to audio engine."
      - path: "src/renderer/store/synthStore.ts"
        issue: "No perTrackVolumes state array. Only perTrackExpanded: boolean exists. No setPerTrackVolume action."
      - path: "src/renderer/audio/ChordVoiceManager.ts"
        issue: "No per-group gain nodes. All voices share masterGain directly. No individual volume control per chord group."
    missing:
      - "Add perTrackVolumes: number[] (7 values, default 0.7) to synthStore state"
      - "Add setPerTrackVolume(degree: number, volume: number) action to synthStore"
      - "Wire onChange in PerTrackSlider to call store.setPerTrackVolume(degree, value)"
      - "Either add per-group GainNodes in ChordVoiceManager or accept UI-only scope with explicit deferred note"
human_verification:
  - test: "Launch app, click Start, press A key"
    expected: "Chord I (C major in default key) plays with current waveform and ADSR — three oscillator tones heard simultaneously"
    why_human: "Audio playback cannot be verified programmatically; requires listening"
  - test: "Press and hold A, then also press F simultaneously"
    expected: "Two chords sound simultaneously (polychordal output)"
    why_human: "Polychordal audio output requires listening to confirm voices don't cancel or fail to allocate"
  - test: "Release a held chord key"
    expected: "Chord fades via ADSR release envelope, no instant cut, no hanging note"
    why_human: "ADSR release timing and click-free fade requires listening"
  - test: "Click G in the key selector"
    expected: "Chord arc buttons update labels to G major diatonic chords; if a chord is held it retunes live"
    why_human: "Visual label update could be checked programmatically but live retuning requires hearing"
  - test: "Click 'Dorian' in the mode selector"
    expected: "Chord grid updates: first chord becomes minor (i), second minor (ii), etc."
    why_human: "Modal chord quality change needs listening to confirm audio matches displayed Roman numerals"
---

# Phase 2: Chord Engine + Synth Mode — Verification Report

**Phase Goal:** A fully playable chord instrument — select any key and mode, get a diatonic chord grid, click chords and hear them with correct envelopes and volume controls
**Verified:** 2026-02-18T21:36:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User selects key/mode and chord grid updates to correct diatonic chords | VERIFIED | KeySelector -> store.setKey -> generateDiatonicChords -> chordGrid; ModeSelector -> store.setMode; ChordArc renders chordGrid |
| 2 | User clicks/holds chord button and hears chord play with configured waveform and ADSR | VERIFIED* | ChordButton onMouseDown -> store.triggerChordByDegree -> ChordVoiceManager.triggerChord(frequencies, waveform, adsr); keyboard via useChordKeyboard |
| 3 | User releases chord button, note releases correctly (no hanging notes, no clicks) | VERIFIED* | ChordButton onMouseUp/onMouseLeave -> store.releaseChordByDegree -> ChordVoiceManager.releaseByDegree -> Voice.triggerRelease (ADSR path) |
| 4 | User adjusts master volume slider, output level changes smoothly | VERIFIED | VolumeControl -> store.setMasterVolume -> setMasterVolume(bus, vol) -> masterGain.gain; fully wired |
| 5 | User adjusts per-track volume sliders, individual track levels change independently | FAILED | PerTrackVolume sliders are uncontrolled inputs (no onChange); no per-track volume state in store; no per-group audio routing |

*Audio behavior requires human verification; code wiring is confirmed correct.

**Score:** 4/5 success criteria verified (1 gap)

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `src/renderer/music/musicTypes.ts` | VERIFIED | ChordData interface, HarmonicFunction, ChordQuality, MusicalKey, MusicalMode types; CIRCLE_OF_FIFTHS, MODES, HARMONIC_FUNCTIONS, CHORD_KEYS constants — all present and exported |
| `src/renderer/music/chordEngine.ts` | VERIFIED | generateDiatonicChords, getChordQuality, deriveRomanNumeral exported; uses tonal Mode.triads/Mode.notes/Note.freq; buildTriadWithOctave wired in |
| `src/renderer/music/noteFrequency.ts` | VERIFIED | buildTriadWithOctave exported; octave crossing detection via note letter index comparison |
| `src/renderer/audio/ChordVoiceManager.ts` | VERIFIED | Pool of 24 voices; triggerChord, releaseChord, releaseByDegree, retuneActiveChords, setWaveform, setADSR, dispose — all implemented and substantive |
| `src/__tests__/chordEngine.test.ts` | VERIFIED | 32 tests — all 8 modes for C key, D dorian, B locrian, F lydian, quality parsing, Roman numerals, harmonic functions, frequencies |
| `src/__tests__/noteFrequency.test.ts` | VERIFIED | 13 tests — all 7 C major degrees, D dorian, B locrian, sharps, flats, different base octaves |
| `src/__tests__/ChordVoiceManager.test.ts` | VERIFIED | 9 tests — pool size, allocation, release, releaseByDegree, polychordal, voice stealing, retuning, waveform, dispose |
| `src/renderer/store/synthStore.ts` | VERIFIED | selectedKey, selectedMode, chordGrid, activeChordDegrees state; setKey, setMode, triggerChordByDegree, releaseChordByDegree, togglePerTrackPanel actions; chordVoiceManagerRef module-level ref; Phase 1 state intact |
| `src/renderer/components/ChordArc.tsx` | VERIFIED | Reads chordGrid, activeChordDegrees, triggerChordByDegree, releaseChordByDegree from store; positions 7 ChordButtons via Math.sin/cos arc; degree I at top-center |
| `src/renderer/components/ChordButton.tsx` | VERIFIED | Roman numeral primary, rootNote secondary, keyLabel always visible; harmonic function color coding (tonic=indigo, subdominant=amber, dominant=rose); tonic chord larger (w-20 h-20 vs w-16 h-16); active state scale-110 + glow; onMouseDown/Up/Leave event handlers |
| `src/renderer/components/KeySelector.tsx` | VERIFIED | CIRCLE_OF_FIFTHS 12-key circular layout; active key highlighted white; click dispatches setKey |
| `src/renderer/components/ModeSelector.tsx` | VERIFIED | MODES 8-mode segmented horizontal control; active mode filled; click dispatches setMode |
| `src/renderer/hooks/useChordKeyboard.ts` | VERIFIED | Maps A-J to degrees 1-7; useRef<Set> held-key tracking; repeat guard; polychordal support; listeners active only when audioReady |
| `src/renderer/components/PerTrackVolume.tsx` | STUB/PARTIAL | Expand/collapse toggle works (wired to perTrackExpanded store state); 7 sliders render with Roman numeral labels; BUT sliders use defaultValue (uncontrolled, no onChange), no audio routing, no store values for individual levels |
| `src/renderer/hooks/useAudioInit.ts` | VERIFIED | Creates VoiceManager + ChordVoiceManager in sequence; ChordVoiceManager connected to vm.getMasterBus().masterGain; setChordVoiceManager called; dispose handled |
| `src/renderer/App.tsx` | VERIFIED | ChordArc as center instrument face; KeySelector + ModeSelector + WaveformSelector + ADSRControls in left column; VolumeControl + Oscilloscope + PerTrackVolume in right; useChordKeyboard() called; Phase 1 VoiceButton grid removed |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `chordEngine.ts` | `tonal` | `import { Mode, Note }` | WIRED | Mode.triads, Mode.notes, Note.freq all used in generateDiatonicChords |
| `chordEngine.ts` | `noteFrequency.ts` | `buildTriadWithOctave` | WIRED | imported and called for each chord degree |
| `synthStore.ts` | `chordEngine.ts` | `generateDiatonicChords` | WIRED | called in setKey, setMode, and for defaultChordGrid initialization |
| `synthStore.ts` | `ChordVoiceManager.ts` | `chordVoiceManagerRef` | WIRED | module-level ref, setChordVoiceManager/getChordVoiceManager exported; ref used in triggerChordByDegree, releaseChordByDegree, setKey, setMode, setWaveform, setADSR |
| `ChordArc.tsx` | `synthStore.ts` | `useSynthStore` | WIRED | reads chordGrid, activeChordDegrees, triggerChordByDegree, releaseChordByDegree |
| `KeySelector.tsx` | `synthStore.ts` | `useSynthStore` for setKey | WIRED | selectedKey read, setKey dispatched on click |
| `ModeSelector.tsx` | `synthStore.ts` | `useSynthStore` for setMode | WIRED | selectedMode read, setMode dispatched on click |
| `useChordKeyboard.ts` | `synthStore.ts` | `triggerChordByDegree/releaseChordByDegree` | WIRED | both actions used in keydown/keyup handlers |
| `App.tsx` | `ChordArc.tsx` | `<ChordArc />` | WIRED | rendered as center section content |
| `App.tsx` | `useChordKeyboard.ts` | `useChordKeyboard()` | WIRED | called at top of App component |
| `useAudioInit.ts` | `ChordVoiceManager.ts` | `new ChordVoiceManager` | WIRED | instantiated and connected to masterGain; setChordVoiceManager called |
| `PerTrackVolume.tsx` (sliders) | `synthStore.ts` | per-track volume values | NOT WIRED | No onChange handler; no per-track state in store; sliders are display-only |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CHORD-01 | 02-01, 02-03 | User can select key (C through B) and mode | SATISFIED | KeySelector (12 keys, circle-of-fifths), ModeSelector (8 modes), store.setKey/setMode, generateDiatonicChords |
| CHORD-02 | 02-01, 02-03 | App generates diatonic chord grid from key + mode | SATISFIED | generateDiatonicChords produces 7 ChordData with qualities, Roman numerals, frequencies; 32 tests pass across all 8 modes |
| CHORD-03 | 02-02, 02-03, 02-04 | User can click/hold chord buttons to play chords (synth mode) | SATISFIED | ChordButton onMouseDown/Up + useChordKeyboard A-J; ChordVoiceManager allocated voices + ADSR; 9 voice pool tests pass |
| CTRL-01 | 02-04 | Per-track volume sliders for each sliding track and anchor track | BLOCKED | PerTrackVolume renders 7 sliders but they are uncontrolled inputs with no onChange. No audio effect. Success criterion #5 ("individual track levels change independently") not met. |
| CTRL-02 | 02-04 | Master volume control | SATISFIED | VolumeControl -> store.setMasterVolume -> setMasterVolume(bus, vol) applied to masterGain node immediately |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/renderer/components/PerTrackVolume.tsx` | 91 | `defaultValue={defaultValue}` on range input — uncontrolled, no onChange | Blocker | Slider drag has zero effect on audio output; CTRL-01 / SC#5 not met |
| `src/renderer/components/PerTrackVolume.tsx` | 13-15 | Scope boundary comment: "Phase 2 scope: local state only -- audio routing deferred" | Warning | Documented intentionally, but ROADMAP SC#5 requires functional behavior in Phase 2 |

### Human Verification Required

#### 1. Chord playback (keyboard)

**Test:** Launch app (`npm start` or `npx vite --port 5199`), click Start, press the A key.
**Expected:** C major triad plays immediately — three distinct tones audible simultaneously.
**Why human:** Audio output cannot be verified programmatically.

#### 2. Polychordal playback

**Test:** Hold A, then also press F simultaneously.
**Expected:** Both chord I (C major) and chord IV (F major) sound together, six simultaneous oscillator tones.
**Why human:** Polychordal audio requires listening to confirm.

#### 3. ADSR release (no hanging notes)

**Test:** Press and hold A, release A.
**Expected:** Chord fades naturally over the release time, no instant cut, no sustained drone.
**Why human:** Release envelope timing requires listening.

#### 4. Mouse click chord

**Test:** Click and hold a chord button in the arc, release.
**Expected:** Chord sounds on mousedown, fades on mouseup via release envelope.
**Why human:** Requires interaction and audio output.

#### 5. Live key change

**Test:** Click G in the key selector.
**Expected:** Chord arc labels update to G major diatonic chords (G, Am, Bm, C, D, Em, F#dim).
**Why human:** Visual label update observable; live retune of active voices requires audio.

### Gaps Summary

One gap blocks full goal achievement: **per-track volume sliders do not function**.

The ROADMAP success criterion #5 explicitly states "User adjusts per-track volume sliders and individual track levels change independently." The Phase 2 SUMMARY documented deferring per-group gain routing to Phase 3 as a deliberate scope decision, but this deferred behavior is directly stated as a success criterion for Phase 2 in the ROADMAP.

**Root cause:** `PerTrackSlider` uses `defaultValue` (HTML uncontrolled input) with no `onChange` handler. There is no per-track volume state in the Zustand store (only `perTrackExpanded: boolean`). The `ChordVoiceManager` has no per-group gain nodes — all voices connect directly to `masterGain`.

**What exists:** 7 sliders render correctly with Roman numeral labels. The expand/collapse toggle works. The visual panel is complete.

**What is missing:**
1. `perTrackVolumes: number[]` state in synthStore (7 values)
2. `setPerTrackVolume(degree: number, volume: number)` action
3. `onChange` in PerTrackSlider wired to the store action
4. Either per-group GainNodes in ChordVoiceManager OR explicit acceptance that this is UI-only with a Phase 3 note in the ROADMAP

Note: all other 4 success criteria pass automated verification. The music theory layer (45 tests), voice pool (9 tests), and all other Phase 1 tests (33 tests) all pass — 87 tests total with 0 failures. TypeScript type check passes clean.

---

_Verified: 2026-02-18T21:36:00Z_
_Verifier: Claude (gsd-verifier)_
