---
phase: 02-chord-engine-synth-mode
plan: 03
subsystem: ui
tags: [react, zustand, chord-ui, arc-layout, css-trig, harmonic-function-colors, circle-of-fifths]

# Dependency graph
requires:
  - phase: 02-chord-engine-synth-mode
    plan: 01
    provides: "ChordData type, musicTypes constants (CIRCLE_OF_FIFTHS, MODES, CHORD_KEYS), generateDiatonicChords"
  - phase: 02-chord-engine-synth-mode
    plan: 02
    provides: "ChordVoiceManager class with triggerChord, releaseByDegree, retuneActiveChords"
provides:
  - "Extended synthStore with chord state (selectedKey, selectedMode, chordGrid, activeChordDegrees) and actions"
  - "ChordArc component: semicircular arc layout for 7 diatonic chord buttons"
  - "ChordButton component: harmonic-function color-coded chord button with Roman numeral + root note"
  - "KeySelector component: circular 12-key selector in circle-of-fifths order"
  - "ModeSelector component: horizontal segmented control for 8 modes"
affects: [02-04-app-layout, 03-slide-engine, 04-visualization]

# Tech tracking
tech-stack:
  added: []
  patterns: [zustand-get-for-actions, module-level-audio-ref, math-trig-arc-layout, harmonic-function-color-coding]

key-files:
  created:
    - src/renderer/components/ChordArc.tsx
    - src/renderer/components/ChordButton.tsx
    - src/renderer/components/KeySelector.tsx
    - src/renderer/components/ModeSelector.tsx
  modified:
    - src/renderer/store/synthStore.ts

key-decisions:
  - "Used zustand get() for chord actions that need current state (key, mode, chordGrid) rather than closure over stale values"
  - "Math.sin/cos in JS for arc positioning rather than CSS trig functions (better cross-browser compat)"
  - "Semicircle arc opens upward with degree I at top-center for natural instrument feel"
  - "Harmonic function colors: indigo=tonic, amber=subdominant, rose=dominant -- visually distinct, accessible"

patterns-established:
  - "Harmonic function color mapping: tonic=indigo, subdominant=amber, dominant=rose across all chord UI"
  - "Module-level audio manager ref pattern for ChordVoiceManager (same as Phase 1 VoiceManager)"
  - "Circular layout via Math.cos/sin positioning with absolute positioning and translate(-50%,-50%) centering"

requirements-completed: [CHORD-01, CHORD-02, CHORD-03]

# Metrics
duration: 3min
completed: 2026-02-18
---

# Phase 02 Plan 03: Store Extension + Chord UI Components Summary

**Zustand store extended with chord engine state, plus 4 React components: semicircular chord arc with harmonic-function colors, circular key selector, and segmented mode selector**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-18T18:00:07Z
- **Completed:** 2026-02-18T18:02:57Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Zustand store extended with chord state (key, mode, chordGrid, activeChordDegrees) and 5 new actions without breaking Phase 1 functionality
- ChordArc positions 7 chord buttons in a semicircular arc using Math.sin/cos, with I at top-center
- ChordButton shows Roman numeral, root note, and key label with harmonic-function color coding (tonic=indigo, subdominant=amber, dominant=rose)
- Circular KeySelector with 12 keys in circle-of-fifths order, ModeSelector with 8 modes as horizontal pills
- Key/mode changes regenerate chord grid AND retune active voices via ChordVoiceManager (live retuning)
- Waveform and ADSR changes forwarded to ChordVoiceManager for consistent sound across both instrument modes

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend Zustand store with chord engine state and actions** - `6655b09` (feat)
2. **Task 2: Create ChordButton and ChordArc components with arc layout** - `cddd500` (feat)
3. **Task 3: Create KeySelector and ModeSelector components** - `39f6b04` (feat)

**Plan metadata:** (pending final commit)

## Files Created/Modified
- `src/renderer/store/synthStore.ts` - Extended with chord state (selectedKey, selectedMode, chordGrid, activeChordDegrees), chord actions (setKey, setMode, triggerChordByDegree, releaseChordByDegree, togglePerTrackPanel), and ChordVoiceManager module-level ref
- `src/renderer/components/ChordButton.tsx` - Single chord button with Roman numeral, root note, key label, harmonic function color coding, active state scale/glow
- `src/renderer/components/ChordArc.tsx` - Semicircular arc container using Math.sin/cos to position 7 ChordButtons, reads from store for chord grid and active states
- `src/renderer/components/KeySelector.tsx` - Circular layout with 12 key buttons in circle-of-fifths order, active key filled white, dispatches setKey
- `src/renderer/components/ModeSelector.tsx` - Horizontal segmented control with 8 mode pills, active mode filled, dispatches setMode

## Decisions Made
- Used zustand `get()` for chord actions that read current state (selectedKey, selectedMode, chordGrid, adsr) -- ensures fresh values rather than closure-captured stale state
- Used Math.sin/cos in JavaScript for arc and circle positioning rather than CSS trig functions -- better cross-browser compatibility and simpler to reason about
- Semicircle arc opens upward with degree I at the center-top for natural instrument feel -- the tonic is the "home" position
- Harmonic function color palette: indigo for tonic group (I, iii, vi), amber for subdominant (ii, IV), rose for dominant (V, vii) -- maximally distinct, accessible contrast ratios

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 4 components (ChordArc, ChordButton, KeySelector, ModeSelector) are self-contained and ready to compose into the App layout in Plan 02-04
- Store chord actions integrate with ChordVoiceManager via module-level ref -- audio init code needs to call setChordVoiceManager() (to be wired in Plan 02-04)
- Keyboard shortcut mapping ready via CHORD_KEYS constant passed as keyLabel props

## Self-Check: PASSED

All 5 files verified on disk. All 3 task commits verified in git log.

---
*Phase: 02-chord-engine-synth-mode*
*Completed: 2026-02-18*
