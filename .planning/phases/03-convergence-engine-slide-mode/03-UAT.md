---
status: diagnosed
phase: 03-convergence-engine-slide-mode
source: 03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md, 03-04-SUMMARY.md
started: 2026-02-19T12:00:00Z
updated: 2026-02-19T12:10:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Mode Toggle
expected: Click the Synth/Slide segmented control in the header. The center panel switches from the chord arc to slide mode track status display. The right column switches from per-track volume to slide configuration controls.
result: pass
note: "User noted slide engine audio is audible in synth mode at startup — logged as gap"

### 2. Idle Track Motion
expected: In slide mode with no chord pressed, you hear multiple tracks continuously gliding through pitch space — audible pitch movement even before pressing any chord key.
result: pass

### 3. Chord Convergence
expected: Press a chord key (A-J) or click a chord targeting button and hear all sliding tracks arrive at the chord's notes simultaneously. The convergence is perceptible — tracks glide in from different pitches and land together.
result: pass

### 4. Proximity Volume Swell
expected: As tracks approach their chord target notes, their volume swells (gets louder). As tracks move away, volume fades. The chord "emerges" from the glissando rather than being struck.
result: pass

### 5. Track Count Change
expected: Change the number of sliding tracks (e.g., from 2 to 4) using the track count control. New tracks start sliding without audio glitches or pops.
result: issue
reported: "in-key pops on add (which you'd expect unless new tracks fade in)"
severity: minor

### 6. Anchor Voice
expected: With anchor enabled, pressing a chord plays the clean struck chord sound alongside the sliding tracks. Both the slide convergence and the anchor chord coexist clearly.
result: pass

### 7. Slide Configuration Controls
expected: In slide mode, the right column shows 5 collapsible control sections (Track Model, Idle Behavior, Convergence, Swell Envelope, Post-Arrival). Each section expands to show configurable parameters. Hovering over controls shows tooltip descriptions.
result: issue
reported: "I don't see the tooltips. The expand and collapse works. The expanded windows aren't scrollable and not all controls are visible, particularly when everything is expanded"
severity: major

### 8. Clean Mode Switching
expected: Toggle between Synth and Slide modes multiple times. No hanging notes, no audio glitches. Synth mode chord arc and slide mode track status each work correctly when active.
result: pass

## Summary

total: 8
passed: 6
issues: 2
pending: 0
skipped: 0

## Gaps

- truth: "Slide engine audio should be silent when app starts in synth mode"
  status: failed
  reason: "User reported: program starts in standard synth mode with the background tone of the sliding synth"
  severity: major
  test: 0
  root_cause: "SlideTrack oscillators start at swellGain=0.1 and osc.start() in constructor, connected directly to masterGain with no mode-gating gain node. pauseScheduler() is never called at construction, so initial 0.1 gain is never zeroed."
  artifacts:
    - path: "src/renderer/audio/SlideTrack.ts"
      issue: "Constructor sets swellGain=0.1 and calls osc.start() immediately — audible at construction regardless of app mode"
    - path: "src/renderer/audio/SlideEngine.ts"
      issue: "Constructor ramps track gains to idleVolume=0.1 in 10ms, no mode-aware muting"
    - path: "src/renderer/hooks/useAudioInit.ts"
      issue: "Line 40 constructs SlideEngine unconditionally on audio init, before slideMode is ever true"
    - path: "src/renderer/store/synthStore.ts"
      issue: "toggleSlideMode only controls scheduler start/pause, never touches initial gain"
  missing:
    - "Initialize SlideTrack swellGain to 0 in constructor (not 0.1)"
    - "SlideEngine constructor should set initial track gain to 0, not idleVolume"
    - "OR call pauseScheduler() after construction in useAudioInit.ts as simplest fix"

- truth: "New slide tracks start without audio pops when track count is increased"
  status: failed
  reason: "User reported: in-key pops on add (which you'd expect unless new tracks fade in)"
  severity: minor
  test: 5
  root_cause: "setTrackCount creates new SlideTrack whose constructor sets swellGain=0.1 via setValueAtTime (instant). Then scheduleGainRamp to idleVolume=0.1 over 50ms — no fade from 0, oscillator is instantly audible."
  artifacts:
    - path: "src/renderer/audio/SlideEngine.ts"
      issue: "setTrackCount (line 831-834) creates new track then ramps to idleVolume, but constructor already set swellGain=0.1"
    - path: "src/renderer/audio/SlideTrack.ts"
      issue: "Constructor initializes swellGain to 0.1 via setValueAtTime — instant non-zero gain causes pop"
  missing:
    - "SlideTrack constructor should initialize swellGain to 0"
    - "setTrackCount should fade new tracks from 0 to idleVolume over ~100ms"

- truth: "Slide configuration controls show tooltips on hover and all controls are visible/scrollable when sections are expanded"
  status: failed
  reason: "User reported: I don't see the tooltips. The expand and collapse works. The expanded windows aren't scrollable and not all controls are visible, particularly when everything is expanded"
  severity: major
  test: 7
  root_cause: "Right column container lacks overflow-y-auto so expanded sections clip. Global CSS sets overflow:hidden on html/body/#root and hides scrollbars. Native title tooltips may be suppressed in Electron frameless window."
  artifacts:
    - path: "src/renderer/App.tsx"
      issue: "Right column container missing overflow-y-auto class"
    - path: "src/renderer/index.css"
      issue: "Global overflow:hidden on html/body/#root and ::-webkit-scrollbar display:none prevents scrolling in nested containers"
    - path: "src/renderer/components/SlideControls.tsx"
      issue: "title attributes are present on controls but may not render in Electron — needs custom tooltip or CSS-based solution"
  missing:
    - "Add overflow-y-auto to right column container in App.tsx"
    - "Ensure SlideControls panel itself has overflow-y-auto with appropriate max-height"
    - "Replace native title tooltips with CSS-based tooltips (Electron may not reliably show native title attributes)"
