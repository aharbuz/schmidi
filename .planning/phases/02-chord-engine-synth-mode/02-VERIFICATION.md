---
phase: 02-chord-engine-synth-mode
verified: 2026-02-18T22:10:00Z
status: human_needed
score: 5/5 success criteria verified
re_verification:
  previous_status: gaps_found
  previous_score: 4/5
  gaps_closed:
    - "User adjusts per-track volume sliders and individual track levels change independently"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Launch app, click Start, press A key"
    expected: "Chord I (C major in default key) plays with current waveform and ADSR — three oscillator tones heard simultaneously"
    why_human: "Audio playback cannot be verified programmatically; requires listening"
  - test: "Press and hold A, then also press F simultaneously"
    expected: "Two chords sound simultaneously (polychordal output)"
    why_human: "Polychordal audio output requires listening to confirm voices do not cancel or fail to allocate"
  - test: "Release a held chord key"
    expected: "Chord fades via ADSR release envelope, no instant cut, no hanging note"
    why_human: "ADSR release timing and click-free fade requires listening"
  - test: "Click G in the key selector"
    expected: "Chord arc buttons update labels to G major diatonic chords; if a chord is held it retunes live"
    why_human: "Visual label update could be checked programmatically but live retuning requires hearing"
  - test: "Click 'Dorian' in the mode selector"
    expected: "Chord grid updates: first chord becomes minor (i), second minor (ii), etc."
    why_human: "Modal chord quality change needs listening to confirm audio matches displayed Roman numerals"
  - test: "Expand mix panel, drag chord I slider to 0, press A key"
    expected: "Chord I is silent; other chords play at their configured level"
    why_human: "Per-degree audio routing requires listening to confirm degree GainNode controls only that chord"
---

# Phase 2: Chord Engine + Synth Mode — Verification Report

**Phase Goal:** A fully playable chord instrument — select any key and mode, get a diatonic chord grid, click chords and hear them with correct envelopes and volume controls
**Verified:** 2026-02-18T22:10:00Z
**Status:** human_needed
**Re-verification:** Yes — after gap closure (02-05 plan closed CTRL-01 gap)

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User selects key/mode and chord grid updates to correct diatonic chords | VERIFIED | KeySelector -> store.setKey -> generateDiatonicChords -> chordGrid; ModeSelector -> store.setMode; ChordArc renders chordGrid |
| 2 | User clicks/holds chord button and hears chord play with configured waveform and ADSR | VERIFIED* | ChordButton onMouseDown -> store.triggerChordByDegree -> ChordVoiceManager.triggerChord; keyboard via useChordKeyboard |
| 3 | User releases chord button, note releases correctly (no hanging notes, no clicks) | VERIFIED* | ChordButton onMouseUp/onMouseLeave -> store.releaseChordByDegree -> ChordVoiceManager.releaseByDegree -> Voice.triggerRelease (ADSR path) |
| 4 | User adjusts master volume slider, output level changes smoothly | VERIFIED | VolumeControl -> store.setMasterVolume -> setMasterVolume(bus, vol) -> masterGain.gain; fully wired |
| 5 | User adjusts per-track volume sliders, individual track levels change independently | VERIFIED* | PerTrackSlider value={volume} + onChange -> store.setPerTrackVolume -> ChordVoiceManager.setDegreeVolume -> degree GainNode gain with anti-click ramp |

*Audio behavior requires human verification; code wiring is confirmed correct.

**Score:** 5/5 success criteria verified (code wiring complete; audio output needs human confirmation)

### Re-verification: Gap Closure Results

**Gap closed (CTRL-01 / Truth #5):** Per-track volume sliders are now fully wired end-to-end.

Commits that closed the gap:
- `34e1ec3` — feat(02-05): add per-degree GainNodes and per-track volume state
- `e612e65` — feat(02-05): wire PerTrackVolume sliders to store and audio engine

Evidence in actual code (not just SUMMARY claims):

1. `src/renderer/components/PerTrackVolume.tsx` line 89: `value={volume}` — controlled input reading from store
2. `src/renderer/components/PerTrackVolume.tsx` line 90: `onChange={(e) => setPerTrackVolume(degree, parseFloat(e.target.value))}` — wired to store action
3. `src/renderer/store/synthStore.ts` line 34: `perTrackVolumes: number[]` in SynthState interface
4. `src/renderer/store/synthStore.ts` line 113: initialized as `[0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7]`
5. `src/renderer/store/synthStore.ts` lines 193-198: `setPerTrackVolume` action calls `chordVoiceManagerRef?.setDegreeVolume(degree, volume)` then updates state immutably
6. `src/renderer/audio/ChordVoiceManager.ts` lines 52-58: 7 per-degree GainNodes created in constructor, each connected to masterGain
7. `src/renderer/audio/ChordVoiceManager.ts` lines 83-88: `triggerChord` calls `voice.reconnect(degreeGain)` to route each voice through its degree's GainNode
8. `src/renderer/audio/ChordVoiceManager.ts` lines 184-193: `setDegreeVolume` uses anti-click scheduling (cancel -> anchor -> linearRamp over 20ms)
9. `src/renderer/audio/Voice.ts` lines 153-157: `reconnect(destination: AudioNode)` method disconnects and reconnects gainNode output

Audio chain verified by code inspection: oscillator -> voice gainNode (ADSR) -> degree GainNode (per-track volume) -> masterGain -> compressor -> analyser -> destination

### Regressions Check

Previously passing truths verified as still intact:

- `generateDiatonicChords` imported and called in store setKey/setMode — INTACT
- `triggerChordByDegree`/`releaseChordByDegree` wired in ChordArc.tsx lines 61-62 — INTACT
- `setMasterVolume` wired through masterBus in store lines 137-143 — INTACT
- `useChordKeyboard()` called at App.tsx line 35 — INTACT
- All 87 tests pass (7 test files, 0 failures) — INTACT
- TypeScript compiles with zero errors — INTACT

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `src/renderer/music/musicTypes.ts` | VERIFIED | ChordData, MusicalKey, MusicalMode types; constants CIRCLE_OF_FIFTHS, MODES, HARMONIC_FUNCTIONS, CHORD_KEYS |
| `src/renderer/music/chordEngine.ts` | VERIFIED | generateDiatonicChords, getChordQuality, deriveRomanNumeral; tonal integration |
| `src/renderer/music/noteFrequency.ts` | VERIFIED | buildTriadWithOctave with octave crossing detection |
| `src/renderer/audio/Voice.ts` | VERIFIED | ADSR voice + new reconnect(destination) method at lines 153-157 |
| `src/renderer/audio/ChordVoiceManager.ts` | VERIFIED | 24-voice pool; 7 degree GainNodes; triggerChord routes through degree GainNode; setDegreeVolume with anti-click; dispose disconnects all gainNodes |
| `src/__tests__/chordEngine.test.ts` | VERIFIED | 32 tests across all 8 modes |
| `src/__tests__/noteFrequency.test.ts` | VERIFIED | 13 tests across keys, octaves, accidentals |
| `src/__tests__/ChordVoiceManager.test.ts` | VERIFIED | 9 tests including updated pool size assertion (CHORD_VOICE_POOL_SIZE + 7) |
| `src/renderer/store/synthStore.ts` | VERIFIED | perTrackVolumes state array (7 values at 0.7); setPerTrackVolume action wired to audio |
| `src/renderer/components/ChordArc.tsx` | VERIFIED | Reads chordGrid, activeChordDegrees, triggerChordByDegree, releaseChordByDegree from store |
| `src/renderer/components/ChordButton.tsx` | VERIFIED | onMouseDown/Up/Leave handlers; harmonic function color coding |
| `src/renderer/components/KeySelector.tsx` | VERIFIED | 12-key circular layout dispatching setKey |
| `src/renderer/components/ModeSelector.tsx` | VERIFIED | 8-mode selector dispatching setMode |
| `src/renderer/hooks/useChordKeyboard.ts` | VERIFIED | A-J mapped to degrees 1-7; polychordal support; repeat guard |
| `src/renderer/components/PerTrackVolume.tsx` | VERIFIED | Controlled sliders (value + onChange) wired to store; no defaultValue; no deferral comment |
| `src/renderer/hooks/useAudioInit.ts` | VERIFIED | Creates VoiceManager + ChordVoiceManager; ChordVoiceManager connected to masterGain |
| `src/renderer/App.tsx` | VERIFIED | ChordArc center; KeySelector + ModeSelector + WaveformSelector + ADSRControls left; VolumeControl + Oscilloscope + PerTrackVolume right |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `chordEngine.ts` | `tonal` | `import { Mode, Note }` | WIRED | Mode.triads, Mode.notes, Note.freq all used |
| `chordEngine.ts` | `noteFrequency.ts` | `buildTriadWithOctave` | WIRED | imported and called for each chord degree |
| `synthStore.ts` | `chordEngine.ts` | `generateDiatonicChords` | WIRED | called in setKey, setMode, defaultChordGrid init |
| `synthStore.ts` | `ChordVoiceManager.ts` | `chordVoiceManagerRef` | WIRED | used in triggerChordByDegree, releaseChordByDegree, setKey, setMode, setWaveform, setADSR, setPerTrackVolume |
| `ChordArc.tsx` | `synthStore.ts` | `useSynthStore` | WIRED | reads chordGrid, activeChordDegrees; dispatches triggerChordByDegree, releaseChordByDegree |
| `KeySelector.tsx` | `synthStore.ts` | `useSynthStore` for setKey | WIRED | selectedKey read, setKey dispatched on click |
| `ModeSelector.tsx` | `synthStore.ts` | `useSynthStore` for setMode | WIRED | selectedMode read, setMode dispatched on click |
| `useChordKeyboard.ts` | `synthStore.ts` | `triggerChordByDegree/releaseChordByDegree` | WIRED | both actions used in keydown/keyup handlers |
| `App.tsx` | `ChordArc.tsx` | `<ChordArc />` | WIRED | rendered as center section |
| `App.tsx` | `useChordKeyboard.ts` | `useChordKeyboard()` | WIRED | called at top of App component |
| `useAudioInit.ts` | `ChordVoiceManager.ts` | `new ChordVoiceManager` | WIRED | instantiated and connected to masterGain |
| `PerTrackVolume.tsx` | `synthStore.ts` | `onChange -> setPerTrackVolume` | WIRED | controlled input; onChange dispatches setPerTrackVolume |
| `synthStore.ts` | `ChordVoiceManager.ts` | `setDegreeVolume` | WIRED | setPerTrackVolume action calls cvm.setDegreeVolume(degree, volume) |
| `ChordVoiceManager.ts` | `Voice.ts` | `voice.reconnect(degreeGain)` | WIRED | triggerChord routes each voice through degree GainNode |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CHORD-01 | 02-01, 02-03 | User can select key (C through B) and mode | SATISFIED | KeySelector (12 keys, circle-of-fifths), ModeSelector (8 modes), store.setKey/setMode, generateDiatonicChords; 32 tests |
| CHORD-02 | 02-01, 02-03 | App generates diatonic chord grid from key + mode | SATISFIED | generateDiatonicChords produces 7 ChordData with qualities, Roman numerals, frequencies for all 8 modes |
| CHORD-03 | 02-02, 02-03, 02-04 | User can click/hold chord buttons to play chords (synth mode) | SATISFIED | ChordButton onMouseDown/Up + useChordKeyboard A-J; ChordVoiceManager allocated voices + ADSR; 9 voice pool tests pass |
| CTRL-01 | 02-04, 02-05 | Per-track volume sliders for each sliding track and anchor track | SATISFIED | PerTrackVolume renders 7 controlled sliders; onChange -> store.setPerTrackVolume -> CVM.setDegreeVolume -> degree GainNode gain; anti-click scheduling |
| CTRL-02 | 02-04 | Master volume control | SATISFIED | VolumeControl -> store.setMasterVolume -> setMasterVolume(bus, vol) applied to masterGain node immediately |

All 5 Phase 2 requirements satisfied. No orphaned requirements.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | — | — | All previous blocker anti-patterns resolved in 02-05 |

The `defaultValue` uncontrolled input from the previous verification is gone. The scope deferral comment is removed. No new anti-patterns detected.

### Human Verification Required

#### 1. Chord playback (keyboard)

**Test:** Launch app (`npm start` or `npx vite --port 5199`), click Start, press the A key.
**Expected:** C major triad plays immediately — three distinct tones audible simultaneously.
**Why human:** Audio output cannot be verified programmatically.

#### 2. Polychordal playback

**Test:** Hold A, then also press F simultaneously.
**Expected:** Both chord I (C major) and chord IV (F major) sound together — six simultaneous oscillator tones.
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

#### 6. Per-track volume (new — gap closure verification)

**Test:** Expand mix panel (click Mix toggle), drag chord I slider to 0. Press A (chord I). Press D (chord III).
**Expected:** Chord I is completely silent; chord III plays at normal volume. Raise slider for I — chord I volume returns.
**Why human:** Per-degree audio routing requires listening to confirm the degree GainNode controls only that chord's output independently.

### Summary

This is a re-verification after the 02-05 gap closure plan. The one gap from the initial verification (CTRL-01 / success criterion #5) has been closed in the actual codebase — verified by direct code inspection, not SUMMARY claims.

All 5 success criteria now have correct code wiring:
- Music theory layer: 45 tests (chordEngine + noteFrequency) pass
- Audio voice pool: 9 ChordVoiceManager tests pass
- Phase 1 tests: 33 tests pass
- Total: 87 tests, 0 failures
- TypeScript: 0 errors

All Phase 2 requirements (CHORD-01, CHORD-02, CHORD-03, CTRL-01, CTRL-02) are satisfied.

Remaining items are audio output behaviors that require human listening verification. Code wiring for all 5 truths is confirmed correct.

---

_Verified: 2026-02-18T22:10:00Z_
_Verifier: Claude (gsd-verifier)_
_Re-verification: Yes — initial verification 2026-02-18T21:36:00Z, gap-closure plan 02-05 executed_
