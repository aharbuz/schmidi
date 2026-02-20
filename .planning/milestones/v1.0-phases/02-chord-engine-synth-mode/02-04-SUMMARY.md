---
phase: 02-chord-engine-synth-mode
plan: 04
subsystem: ui
tags: [react, keyboard-handler, per-track-volume, chord-arc, app-layout, audio-init, polychordal]

# Dependency graph
requires:
  - phase: 02-chord-engine-synth-mode
    plan: 03
    provides: "ChordArc, ChordButton, KeySelector, ModeSelector components + extended synthStore with chord actions"
  - phase: 02-chord-engine-synth-mode
    plan: 02
    provides: "ChordVoiceManager with triggerChord, releaseByDegree, retuneActiveChords"
  - phase: 02-chord-engine-synth-mode
    plan: 01
    provides: "ChordData type, CHORD_KEYS mapping, generateDiatonicChords"
provides:
  - "Playable chord instrument: keyboard hook mapping A-J to 7 diatonic chords"
  - "Integrated App layout with chord arc as centerpiece instrument face"
  - "Per-track volume panel with expand/collapse and 7 individual sliders"
  - "ChordVoiceManager wired into audio initialization alongside Phase 1 VoiceManager"
  - "Full polychordal playback via keyboard and mouse"
affects: [03-convergence-engine, 04-visualization, 05-instrument-personality]

# Tech tracking
tech-stack:
  added: []
  patterns: [global-keyboard-hook-with-held-set, expandable-panel-ui, dual-voice-manager-init]

key-files:
  created:
    - src/renderer/hooks/useChordKeyboard.ts
    - src/renderer/components/PerTrackVolume.tsx
  modified:
    - src/renderer/hooks/useAudioInit.ts
    - src/renderer/App.tsx

key-decisions:
  - "useChordKeyboard hook with useRef<Set> for held-key tracking prevents key repeat and enables clean polychordal triggering"
  - "Per-track volume sliders store values in Zustand but defer actual per-group gain routing to Phase 3 refinement"
  - "ChordVoiceManager connects to same masterGain as Phase 1 VoiceManager (shared master bus)"
  - "Phase 1 VoiceButton grid replaced by ChordArc -- old component file preserved for potential debug/legacy mode"

patterns-established:
  - "Global keyboard hook pattern: useRef<Set> for held keys + keydown/keyup with repeat guard"
  - "Dual voice manager initialization: both VoiceManager and ChordVoiceManager created in same audio init flow"
  - "Expandable panel pattern: toggle state in store, slide-out with per-item sliders"

requirements-completed: [CHORD-03, CTRL-01, CTRL-02]

# Metrics
duration: 4min
completed: 2026-02-18
---

# Phase 02 Plan 04: App Layout Integration + Playable Chord Instrument Summary

**Keyboard-driven chord instrument with home-row mapping (A-J), polychordal playback, chord arc centerpiece layout, per-track volume panel, and ChordVoiceManager audio initialization -- all 13 verification checks passed**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-18T18:06:00Z
- **Completed:** 2026-02-18T18:10:00Z
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint)
- **Files modified:** 4

## Accomplishments
- Fully playable chord instrument: press A-J keys to trigger 7 diatonic chords with ADSR envelope, release to fade
- Polychordal support verified: hold multiple keys simultaneously for layered chord output
- App layout rewritten with chord arc as dominant center instrument face, controls in side columns
- ChordVoiceManager initialized alongside VoiceManager in shared audio init, connected to same master bus
- Per-track volume panel with expand/collapse toggle and 7 individual sliders (Roman numeral labels)
- All 13 human verification checks passed: chord playback, keyboard/mouse triggering, key/mode switching, volume controls, no hanging notes

## Task Commits

Each task was committed atomically:

1. **Task 1: Create keyboard hook, per-track volume, and update audio init** - `38aff04` (feat)
2. **Task 2: Rewrite App layout with chord arc centerpiece** - `6d2f661` (feat)
3. **Task 3: Verify playable chord instrument** - human-verify checkpoint (approved, no commit)

## Files Created/Modified
- `src/renderer/hooks/useChordKeyboard.ts` - Custom hook mapping A-J keys to chord degrees 1-7, useRef<Set> held-key tracking, global keydown/keyup listeners with repeat guard
- `src/renderer/components/PerTrackVolume.tsx` - Expandable panel with 7 vertical range sliders (one per chord degree), Roman numeral labels, dark slide-out styling
- `src/renderer/hooks/useAudioInit.ts` - Extended to create ChordVoiceManager alongside VoiceManager, connected to same masterGain node, stored via setChordVoiceManager
- `src/renderer/App.tsx` - Complete layout rewrite: chord arc fills center, key/mode selectors + waveform/ADSR in left column, volume + oscilloscope + per-track in right column. Phase 1 VoiceButton grid and inline keyboard handlers removed.

## Decisions Made
- useChordKeyboard hook uses useRef<Set<string>> for held-key tracking -- prevents key repeat events from retriggering chords, enables clean polychordal triggering via multiple simultaneous held keys
- Per-track volume sliders are wired to Zustand store state but actual per-voice-group gain node routing is deferred to Phase 3 refinement -- the UI is ready, the plumbing is a future concern
- ChordVoiceManager connects to the same masterGain as Phase 1's VoiceManager -- shared master bus means the master volume slider controls both instrument modes
- Phase 1 VoiceButton component file preserved on disk (not deleted) in case it is needed for a debug or legacy mode -- only removed from App.tsx imports and layout

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 2 complete: all 4 plans delivered a fully playable chord instrument with key/mode selection, ADSR envelopes, keyboard and mouse triggering, polychordal support, and volume controls
- Ready for Phase 3 (Convergence Engine + Slide Mode): the chord engine, voice manager pool, store architecture, and UI layout are all in place
- Per-track volume sliders are UI-ready but need actual per-group gain routing in Phase 3 when sliding tracks are introduced
- The shared masterGain bus architecture supports adding slide mode voices without audio pipeline changes

## Self-Check: PASSED

All 4 files verified on disk. Both task commits verified in git log (38aff04, 6d2f661).

---
*Phase: 02-chord-engine-synth-mode*
*Completed: 2026-02-18*
