---
phase: 05-instrument-personality
plan: 02
subsystem: audio
tags: [web-audio, convergence, drone, cycle-mode, scale-snap, staircase-curve]

# Dependency graph
requires:
  - phase: 05-instrument-personality
    provides: Preset types (IdleMode, PostArrivalMode), scale utilities (buildScaleFrequencyTable, magneticSnap, buildStaircaseCurve)
  - phase: 03-convergence-engine
    provides: SlideEngine state machine, SlideTrack frequency ramps, SlideConfig
provides:
  - Cycle mode (depart + reconverge) via postArrivalMode branching in SlideEngine
  - DroneLayer class for ambient drone idle mode (detuned oscillators, fade in/out)
  - Idle mode switching (silent, quiet-sliding, ambient-drone) in SlideEngine
  - Scale-snapped convergence via staircase curves in SlideTrack
  - Magnetic snap applied to idle motion targets
  - silentMode flag on SlideTrackState for visualization dimming
  - ease-in-out quadratic easing in SlideTrack frequency ramps
affects: [05-03-ui-overlay]

# Tech tracking
tech-stack:
  added: []
  patterns: [drone-layer-lifecycle, cycle-timer-map, staircase-convergence, postArrivalMode-branching]

key-files:
  created: []
  modified:
    - src/renderer/audio/SlideEngine.ts
    - src/renderer/audio/SlideTrack.ts

key-decisions:
  - "DroneLayer uses 3 detuned sine oscillators ([0, +7, -5] cents) at root frequency for subtle ambient backdrop"
  - "Cycle mode uses per-track setTimeout timers stored in a Map, all cleared on chord release to prevent orphaned reconvergences"
  - "Staircase convergence passed via useStaircase boolean parameter on scheduleFrequencyRamp rather than reading pitchMovement from config in SlideTrack"
  - "Legacy autoCycle boolean preserved for backward compatibility with existing presets when postArrivalMode is hold"

patterns-established:
  - "DroneLayer lifecycle: create on idle mode switch to ambient-drone, fadeOut on chord press, fadeIn on release, dispose on mode switch away"
  - "Per-track cycle timers via Map<SlideTrack, Timeout>: cleared on chord release and new chord press"
  - "useStaircase flag pattern: engine determines scale-snapped state, passes boolean to track ramp method"

requirements-completed: [SLIDE-07, SLIDE-08, SLIDE-09]

# Metrics
duration: 6min
completed: 2026-02-20
---

# Phase 5 Plan 2: Engine Behaviors Integration Summary

**Cycle mode, idle mode branching (silent/quiet/drone), and scale-snapped staircase convergence wired into SlideEngine and SlideTrack state machines**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-20T16:59:35Z
- **Completed:** 2026-02-20T17:05:35Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Implemented postArrivalMode branching: hold mode keeps tracks at target, cycle mode departs and reconverges to same chord targets in a breathing pattern
- Added DroneLayer class with 3 detuned oscillators that fades out on chord press and fades back in on release
- Added idle mode switching with silent (gain 0 + visualization flag), quiet-sliding (existing), and ambient-drone behaviors
- Implemented scale-snapped convergence using buildStaircaseCurve for stepped frequency transitions through scale degrees
- Added ease-in-out quadratic easing (was falling through to ease-out from Plan 01 type extension)
- Applied magneticSnap to idle motion targets when pitchMovement is scale-snapped

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement cycle mode, idle modes, and drone layer in SlideEngine** - `53168ca` (feat)
2. **Task 2: Implement scale-snapped convergence in SlideTrack** - `eb08764` (feat)

**Plan metadata:** (pending final docs commit)

## Files Created/Modified
- `src/renderer/audio/SlideEngine.ts` - DroneLayer class, postArrivalMode branching, idle mode switching, scale frequency propagation, magnetic snap on idle, cycle timer management, drone lifecycle on chord press/release
- `src/renderer/audio/SlideTrack.ts` - buildStaircaseCurve import, useStaircase parameter on scheduleFrequencyRamp, ease-in-out easing, scaleFreqs state, silentMode field on SlideTrackState

## Decisions Made
- DroneLayer uses 3 detuned sine oscillators at root frequency with detune [0, +7, -5] cents for a rich but subtle ambient backdrop. Volume set to half of idleVolume.
- Cycle reconvergence timers stored in a Map<SlideTrack, Timeout> for easy cleanup. All timers cleared on both chord release and new chord press.
- Scale-snapped staircase convergence controlled via `useStaircase` boolean parameter on `scheduleFrequencyRamp` rather than having SlideTrack read pitchMovement config. This keeps SlideTrack decoupled from SlideConfig awareness.
- Legacy `autoCycle` boolean preserved for backward compatibility: when `postArrivalMode === 'hold'` and `autoCycle === true` and `holdDuration === Infinity`, the old auto-cycle behavior still works.
- `ease-in-out` easing implemented as quadratic: first half uses `2*t*t` (ease-in), second half uses `1-2*(1-t)*(1-t)` (ease-out), creating smooth acceleration and deceleration.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added ease-in-out easing implementation in SlideTrack**
- **Found during:** Task 2
- **Issue:** The `ease-in-out` value was added to EasingType in Plan 01, but the scheduleFrequencyRamp else-branch was only handling ease-in and falling through to ease-out for ease-in-out. The bloom preset uses ease-in-out convergence.
- **Fix:** Added explicit `ease-in-out` branch with quadratic ease-in-out curve
- **Files modified:** src/renderer/audio/SlideTrack.ts
- **Verification:** npx tsc --noEmit passes, bloom preset convergenceEasing 'ease-in-out' now uses correct curve
- **Committed in:** eb08764 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary to handle the ease-in-out easing that bloom preset relies on. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Engine behaviors (cycle mode, idle modes, drone, scale-snap) ready for UI exposure in Plan 03
- silentMode flag on SlideTrackState ready for visualization to render dimmed orbs
- setIdleMode, setPostArrivalMode, setScaleFrequencies public methods ready for store integration
- All existing continuous-mode behavior verified unchanged

## Self-Check: PASSED

All 2 modified files verified on disk. Both task commits (53168ca, eb08764) found in git log.

---
*Phase: 05-instrument-personality*
*Completed: 2026-02-20*
