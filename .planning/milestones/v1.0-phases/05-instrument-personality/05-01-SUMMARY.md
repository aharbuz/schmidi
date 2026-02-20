---
phase: 05-instrument-personality
plan: 01
subsystem: audio
tags: [presets, scale-snap, zustand, tonal, web-audio]

# Dependency graph
requires:
  - phase: 03-convergence-engine
    provides: SlideConfig interface, SlideEngine, SlideTrack types
  - phase: 02-chord-engine
    provides: tonal library usage patterns, musicTypes constants
provides:
  - Preset definitions (Eerie, Bloom, Swarm, Custom) with intensity interpolation
  - Scale frequency table builder using tonal Scale.degrees + Note.freq
  - Magnetic snap quantizer and staircase convergence curve builder
  - Extended synthStore with preset/personality state and actions
affects: [05-02-engine-integration, 05-03-ui-overlay]

# Tech tracking
tech-stack:
  added: []
  patterns: [preset-as-config-snapshot, magnetic-snap-quantizer, custom-preset-auto-activation]

key-files:
  created:
    - src/renderer/audio/presets.ts
    - src/renderer/music/scaleFrequencies.ts
  modified:
    - src/renderer/store/synthStore.ts
    - src/renderer/audio/SlideTrack.ts

key-decisions:
  - "Extended EasingType and IdleMovementMode unions with 'ease-in-out' and 'random-walk' for preset compatibility"
  - "Bloom preset uses inward-focus cinematic character (loosely-correlated tracks, ease-in-out convergence)"
  - "Custom preset auto-activation on updateSlideConfig divergence detection"
  - "PostArrivalMode 'hold' maps to autoCycle:false/holdDuration:Infinity; 'cycle' maps to autoCycle:true with configurable holdDuration"

patterns-established:
  - "Preset-as-config-snapshot: PresetFn maps (intensity) to Partial<SlideConfig>, applied via updateConfig pipeline"
  - "Custom preset auto-activation: any advanced control change that diverges from preset switches activePreset to 'custom'"
  - "Scale frequency table: precomputed sorted array for O(log n) binary search at tick time"
  - "Magnetic snap: gravitational pull in log-frequency space using inverse-square distance"

requirements-completed: [SLIDE-06, SLIDE-07, SLIDE-08, SLIDE-09]

# Metrics
duration: 14min
completed: 2026-02-20
---

# Phase 5 Plan 1: Preset System & Scale Utilities Summary

**Four preset personality definitions with intensity interpolation, scale frequency utilities with magnetic snap, and Zustand store extended with preset/idle/post-arrival state**

## Performance

- **Duration:** 14 min
- **Started:** 2026-02-20T16:42:06Z
- **Completed:** 2026-02-20T16:56:23Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created 4 preset definitions (Eerie, Bloom, Swarm, Custom) as functions mapping intensity to SlideConfig partials with lerp interpolation
- Built scale frequency utilities: table builder via tonal Scale.degrees, binary search, magnetic snap quantizer, staircase convergence curve
- Extended synthStore with 6 new state fields and 5 new actions for preset/personality management
- Implemented custom preset auto-activation when advanced controls diverge from current preset values

## Task Commits

Each task was committed atomically:

1. **Task 1: Create preset definitions and scale frequency utilities** - `813a11e` (feat)
2. **Task 2: Extend synthStore with preset and personality state** - `390dc95` (feat)

**Plan metadata:** (pending final docs commit)

## Files Created/Modified
- `src/renderer/audio/presets.ts` - Preset definitions, PresetFn type, getPresetConfig, PRESET_NAMES, IdleMode, PostArrivalMode types
- `src/renderer/music/scaleFrequencies.ts` - buildScaleFrequencyTable, findNearestScaleFreq, magneticSnap, buildStaircaseCurve
- `src/renderer/store/synthStore.ts` - Extended with activePreset, presetIntensity, idleMode, postArrivalMode, snapScale state + 5 actions
- `src/renderer/audio/SlideTrack.ts` - Added 'ease-in-out' to EasingType, 'random-walk' to IdleMovementMode unions

## Decisions Made
- Extended EasingType with 'ease-in-out' and IdleMovementMode with 'random-walk' to support preset definitions (bloom needs ease-in-out, swarm needs random-walk). Engine handling of these new values deferred to Plan 02.
- Bloom preset: chose inward-focus cinematic character (loosely-correlated tracks sweeping toward center) per CONTEXT.md decision
- Custom preset auto-activation: implemented in updateSlideConfig by comparing changed keys against current preset's computed values
- PostArrivalMode mapping: 'hold' sets autoCycle=false + holdDuration=Infinity; 'cycle' sets autoCycle=true with a sensible default holdDuration of 2.0s when switching from Infinity

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Extended type unions in SlideTrack.ts for preset compatibility**
- **Found during:** Task 1 (preset definitions)
- **Issue:** Plan specifies 'ease-in-out' for bloom convergenceEasing and 'random-walk' for swarm idleMovementMode, but these values didn't exist in the EasingType and IdleMovementMode type unions
- **Fix:** Added 'ease-in-out' to EasingType and 'random-walk' to IdleMovementMode in SlideTrack.ts
- **Files modified:** src/renderer/audio/SlideTrack.ts
- **Verification:** npx tsc --noEmit passes, engine code safely falls through for unhandled values
- **Committed in:** 813a11e (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Type extension necessary for presets to compile. Engine-side handling of new values deferred to Plan 02. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Preset definitions ready for engine integration (Plan 02 will wire presets to SlideEngine behavior)
- Scale frequency utilities ready for engine consumption (buildScaleFrequencyTable, magneticSnap, buildStaircaseCurve)
- Store state ready for UI binding (Plan 03 will add preset overlay and advanced controls)
- Engine handling of 'ease-in-out' easing and 'random-walk' idle mode needed in Plan 02

## Self-Check: PASSED

All 4 files verified on disk. Both task commits (813a11e, 390dc95) found in git log.

---
*Phase: 05-instrument-personality*
*Completed: 2026-02-20*
