---
phase: 01-audio-foundation
plan: 04
subsystem: ui
tags: [react, zustand, keyboard-input, canvas, svg-icons, adsr, envelope, waveform, tailwind]

# Dependency graph
requires:
  - phase: 01-02
    provides: 8-voice audio engine with VoiceManager, ADSR presets, computeEnvelopeCurve
  - phase: 01-03
    provides: Zustand store with triggerVoice/releaseVoice/setWaveform/setADSR/setPreset, animation loop, App shell
provides:
  - 8 voice trigger buttons with keyboard mapping (a,s,d,f,j,k,l,;) and animated envelope stage feedback
  - Waveform selector with 4 SVG icon buttons (sine, square, sawtooth, triangle)
  - 4 ADSR parameter sliders with numeric displays and preset dropdown
  - Live canvas envelope curve preview updating in real-time
affects: [01-05]

# Tech tracking
tech-stack:
  added: []
  patterns: [keyboard-voice-mapping, css-envelope-animations, canvas-envelope-preview, vertical-range-sliders]

key-files:
  created:
    - src/renderer/components/VoiceButton.tsx
    - src/renderer/components/WaveformSelector.tsx
    - src/renderer/components/ADSRControls.tsx
    - src/renderer/components/EnvelopeCurve.tsx
  modified:
    - src/renderer/App.tsx

key-decisions:
  - "Global keydown/keyup listeners with heldKeysRef Set for repeat prevention and polyphonic key tracking"
  - "CSS animation classes per envelope stage (attack glow-in, sustain pulse, release glow-out) driven by voiceState.stage"
  - "Inline SVG waveform icons rather than Unicode or external assets for crisp rendering at small sizes"
  - "Vertical sliders with writingMode vertical-lr for native range input orientation"

patterns-established:
  - "Keyboard mapping: DEFAULT_VOICE_KEYS array indexed to voice indices, global listeners in App with ref-tracked held keys"
  - "Envelope animation: CSS class per stage applied dynamically, glow-in/pulse/glow-out keyframe animations"
  - "Canvas redraw on useEffect(adsr): parameter-driven redraws without requestAnimationFrame loop"
  - "ADSR numeric formatting: ms for <1s, Xs for >=1s, percentage for sustain"

requirements-completed: [AUDIO-01, AUDIO-02, AUDIO-03]

# Metrics
duration: 3min
completed: 2026-02-18
---

# Phase 1 Plan 04: Core Instrument Controls Summary

**8 voice trigger buttons with keyboard mapping and envelope animations, waveform selector with SVG icons, ADSR sliders with presets, and live canvas envelope curve preview**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-18T12:57:35Z
- **Completed:** 2026-02-18T13:00:41Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- 8 voice buttons in 2x4 grid with note names (C3-C4), keyboard shortcuts (a,s,d,f,j,k,l,;), and animated envelope stage glow
- Waveform selector with 4 inline SVG icons (sine, square, sawtooth, triangle) with active cyan highlight
- 4 vertical ADSR sliders with real-time numeric displays (ms/s/%) and 4 dual-named presets
- Canvas envelope curve (300x120) with cyan stroke, gradient fill, stage labels (A/D/S/R), grid lines, and phase boundaries
- Full keyboard polyphony with key repeat prevention via heldKeysRef

## Task Commits

Each task was committed atomically:

1. **Task 1: Voice buttons with keyboard mapping and waveform selector** - `f4b5b82` (feat)
2. **Task 2: ADSR controls with presets and live envelope curve preview** - `e3cbc39` (feat)

## Files Created/Modified
- `src/renderer/components/VoiceButton.tsx` - Per-voice trigger button with keyboard binding, envelope animation (glow-in, pulse, glow-out)
- `src/renderer/components/WaveformSelector.tsx` - 4 SVG waveform icon buttons with active state highlight
- `src/renderer/components/ADSRControls.tsx` - 4 vertical sliders + numeric displays + preset dropdown
- `src/renderer/components/EnvelopeCurve.tsx` - Canvas preview of ADSR envelope shape with labels and grid
- `src/renderer/App.tsx` - Main layout with voice grid, waveform selector, ADSR controls, envelope curve, and keyboard event handling

## Decisions Made
- **Global keyboard listeners with heldKeysRef:** Using a Set ref to track held keys prevents double-trigger from key repeat and enables clean polyphonic input across multiple simultaneous keys.
- **CSS animation per envelope stage:** Rather than JS-driven animation, each stage (attack, sustain, release) maps to a CSS class with keyframe animations. The animation loop already polls voiceState.stage at 60fps, so CSS classes change smoothly.
- **Inline SVG waveform icons:** Small hand-drawn SVG paths for each waveform type render crisply at 22x16px without external dependencies.
- **Vertical range inputs with writingMode:** Native browser range input rotated via `writingMode: vertical-lr` + `direction: rtl` for correct bottom-to-top orientation, avoiding complex custom slider implementations.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All core instrument controls complete: voice buttons, waveform selection, ADSR parameters, envelope preview
- Right column placeholder ready for Plan 05 (volume control + oscilloscope visualization)
- StatusBar placeholder ready for Plan 05
- Keyboard and mouse interaction patterns established for future control additions

## Self-Check: PASSED

All 4 created files and 1 modified file verified on disk. Both task commits (f4b5b82, e3cbc39) verified in git log.

---
*Phase: 01-audio-foundation*
*Completed: 2026-02-18*
