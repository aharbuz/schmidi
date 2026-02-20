# Roadmap: Schmidi

## Overview

Schmidi is built from the audio foundation up: correct oscillator architecture and AudioContext patterns first, then a playable chord instrument in synth mode, then the slide mode convergence engine (the load-bearing core differentiator), then the visualization that makes the sliding tracks visible, and finally the configuration personality that makes the instrument expressive and tuneable. Each phase delivers a coherent, verifiable capability. Nothing ships until it sounds right.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Audio Foundation** - Electron app scaffolded with persistent oscillators and correct AudioParam patterns
- [ ] **Phase 2: Chord Engine + Synth Mode** - Playable chord instrument with key/mode selection and ADSR
- [x] **Phase 3: Convergence Engine + Slide Mode** - Core Schmidi mechanic: N tracks gliding to chord targets simultaneously
- [x] **Phase 4: Visualization** - Radial and waveform views as primary instrument UI
- [x] **Phase 5: Instrument Personality** - Slide character, convergence behavior, pre-press modes, scale snapping

## Phase Details

### Phase 1: Audio Foundation
**Goal**: A running Electron app with a correctly architected audio engine — persistent oscillators, anti-click AudioParam patterns, and AudioContext autoplay handling — ready to drive musical features
**Depends on**: Nothing (first phase)
**Requirements**: AUDIO-01, AUDIO-02, AUDIO-03, AUDIO-04
**Success Criteria** (what must be TRUE):
  1. User launches the app and audio plays without requiring a manual gesture to unlock the AudioContext
  2. User hears multiple simultaneous oscillator voices (polyphonic output) with no clicks or pops on parameter changes
  3. User can select waveform type (sine, square, sawtooth, triangle) and hear the timbre change immediately
  4. User can adjust ADSR controls and hear the amplitude envelope shape change on the next note
  5. Audio response is immediate — no perceptible lag between interaction and sound (sub-50ms)
**Plans**: 5 plans
- [x] 01-01-PLAN.md -- Electron app scaffold + shell (Forge + Vite + React + TS + Tailwind + main process)
- [ ] 01-02-PLAN.md -- Audio engine core with TDD (Voice, VoiceManager, masterBus, ADSR, Vitest)
- [ ] 01-03-PLAN.md -- App shell UI + state (Zustand store, splash screen, title bar, hooks)
- [ ] 01-04-PLAN.md -- Instrument controls (voice buttons, waveform selector, ADSR controls, envelope curve)
- [ ] 01-05-PLAN.md -- Monitoring + testing + verification (volume, oscilloscope, status bar, Storybook, Playwright)

### Phase 2: Chord Engine + Synth Mode
**Goal**: A fully playable chord instrument — select any key and mode, get a diatonic chord grid, click chords and hear them with correct envelopes and volume controls
**Depends on**: Phase 1
**Requirements**: CHORD-01, CHORD-02, CHORD-03, CTRL-01, CTRL-02
**Success Criteria** (what must be TRUE):
  1. User selects a key (C through B) and mode (major, minor, dorian, phrygian, lydian, mixolydian, aeolian, locrian) and the chord grid updates to show the correct diatonic chords
  2. User clicks or holds a chord button and hears that chord play with the configured waveform and ADSR envelope
  3. User releases a chord button and hears the note release correctly (no hanging notes, no clicks)
  4. User adjusts the master volume slider and the overall output level changes smoothly
  5. User adjusts per-track volume sliders and individual track levels change independently
**Plans**: 5 plans
- [x] 02-01-PLAN.md -- Music theory types + diatonic chord engine with TDD (tonal, chordEngine, noteFrequency)
- [x] 02-02-PLAN.md -- ChordVoiceManager voice pool with allocation, release, and voice stealing
- [x] 02-03-PLAN.md -- Zustand store extension + chord arc UI + key/mode selectors
- [x] 02-04-PLAN.md -- App layout integration, keyboard handler, per-track volume, verification
- [x] 02-05-PLAN.md -- Gap closure: wire per-track volume sliders to per-degree audio routing (CTRL-01)

### Phase 3: Convergence Engine + Slide Mode
**Goal**: The core Schmidi mechanic: N persistent pitch tracks glide continuously through pitch space and converge simultaneously on chord target notes when a chord is pressed, with volume swelling on approach and fading on departure
**Depends on**: Phase 2
**Requirements**: SLIDE-01, SLIDE-02, SLIDE-03, SLIDE-04, SLIDE-05
**Success Criteria** (what must be TRUE):
  1. User toggles to slide mode and hears multiple tracks continuously gliding (pitch movement is audible even before a chord is pressed)
  2. User presses a chord and hears all sliding tracks arrive at the chord's notes simultaneously — the convergence is perceptible, not staggered
  3. User hears track volume swell as each track approaches its chord target note and fade as it moves away — the "emerging" feel is present
  4. User changes the number of sliding tracks (from the default of 2) and the track count updates without audio glitches
  5. User hears the solid anchor track play the chord cleanly alongside the sliding tracks — the two behaviors coexist without cancellation
**Plans**: 6 plans
- [x] 03-01-PLAN.md -- SlideTrack + SlideEngine core (idle motion, convergence, proximity gain, Model A + C)
- [x] 03-02-PLAN.md -- Zustand store extension + audio init + slide keyboard hook + anchor voice
- [x] 03-03-PLAN.md -- Mode toggle UI + SlideModeUI + all configuration controls with tooltips
- [x] 03-04-PLAN.md -- Animation loop integration + chord keyboard mode-awareness + verification
- [ ] 03-05-PLAN.md -- Gap closure: fix slide audio bleed at startup + track count pops
- [ ] 03-06-PLAN.md -- Gap closure: scrollable slide controls + CSS tooltips

### Phase 4: Visualization
**Goal**: The visualization IS the instrument interface — real-time canvas views of sliding tracks that make the convergence visible and serve as the primary UI surface, not a meter
**Depends on**: Phase 3
**Requirements**: VIZ-01, VIZ-02, VIZ-03, VIZ-04
**Success Criteria** (what must be TRUE):
  1. User sees the radial convergence view running at 60fps — orbs or lines spiraling toward center as tracks approach chord notes, moving outward as they drift
  2. User switches to waveform trace view and sees colored waveforms morphing and aligning as pitches converge
  3. User can switch between radial and waveform views without audio interruption
  4. The visualization is the dominant element of the UI — chord controls and settings are secondary; the canvas fills the instrument face
**Plans**: 3 plans
- [x] 04-01-PLAN.md -- Visualization color system + canvas setup hook + radial convergence view with orbs and bloom
- [x] 04-02-PLAN.md -- Per-track AnalyserNodes in SlideTrack + waveform buffer + waveform trace view
- [x] 04-03-PLAN.md -- Layout integration: VisualizationPanel, view toggle, full-viz mode, app restyle, 16:9 window

### Phase 5: Instrument Personality
**Goal**: The configurability that makes Schmidi expressive — slide character, convergence behavior, pre-press mode, and scale snapping let the player shape how the instrument feels without changing what it fundamentally is
**Depends on**: Phase 4
**Requirements**: SLIDE-06, SLIDE-07, SLIDE-08, SLIDE-09
**Success Criteria** (what must be TRUE):
  1. User switches between eerie convergence (tracks wander independently, eerily align) and smooth bloom (lush sweeping convergence) and hears a clearly different slide character
  2. User selects converge-then-restart, converge-and-hold, or continuous cycle behavior and the tracks respond correctly after reaching chord targets
  3. User selects pre-press mode (silent until pressed, always sliding quietly, or ambient drone) and the idle behavior changes as described
  4. User toggles scale-snapped glissando and hears the pitch movement change from continuous glide to diatonic step motion through the selected scale
**Plans**: 3 plans
- [x] 05-01-PLAN.md -- Preset system + scale frequency utilities + store extension
- [x] 05-02-PLAN.md -- Engine behaviors: cycle mode, idle modes, drone layer, scale-snapped convergence
- [x] 05-03-PLAN.md -- Preset overlay UI + advanced controls + silent mode dimming + verification

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Audio Foundation | 1/5 | In Progress | - |
| 2. Chord Engine + Synth Mode | 5/5 | Complete | 2026-02-18 |
| 3. Convergence Engine + Slide Mode | 4/6 | Gap Closure | - |
| 4. Visualization | 3/3 | Complete | 2026-02-20 |
| 5. Instrument Personality | 3/3 | Complete | 2026-02-20 |
