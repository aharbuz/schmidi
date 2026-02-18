---
phase: 02-chord-engine-synth-mode
plan: 05
subsystem: audio
tags: [web-audio, gain-node, zustand, react, per-track-volume]

# Dependency graph
requires:
  - phase: 02-chord-engine-synth-mode
    provides: "ChordVoiceManager voice pool, PerTrackVolume component, synthStore chord state"
provides:
  - "Per-degree GainNodes for independent chord volume control"
  - "Voice.reconnect() method for output re-routing"
  - "perTrackVolumes store state and setPerTrackVolume action"
  - "Controlled PerTrackVolume sliders wired to audio engine"
affects: [03-convergence-engine]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Per-degree GainNode insertion between voice gain and masterGain", "Voice reconnect pattern for dynamic audio routing"]

key-files:
  created: []
  modified:
    - src/renderer/audio/Voice.ts
    - src/renderer/audio/ChordVoiceManager.ts
    - src/renderer/store/synthStore.ts
    - src/renderer/components/PerTrackVolume.tsx
    - src/__tests__/ChordVoiceManager.test.ts

key-decisions:
  - "Voice.reconnect() minimal API addition over inserting gain nodes at Voice construction time -- keeps Voice simple"
  - "Per-degree GainNodes created in constructor (not lazily) to guarantee audio chain exists before first triggerChord"
  - "Anti-click 20ms linearRamp on setDegreeVolume matching masterBus pattern"

patterns-established:
  - "Per-degree gain routing: oscillator -> voice gain (ADSR) -> degree gain (volume) -> masterGain -> compressor -> analyser -> destination"
  - "Voice.reconnect() for dynamic output re-routing without Voice reconstruction"

requirements-completed: [CTRL-01]

# Metrics
duration: 3min
completed: 2026-02-18
---

# Phase 2 Plan 5: Per-Track Volume Wiring Summary

**Per-degree GainNodes in ChordVoiceManager with controlled PerTrackVolume sliders wired through Zustand store for independent chord volume control (CTRL-01)**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-18T20:59:26Z
- **Completed:** 2026-02-18T21:02:26Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Added 7 per-degree GainNodes to ChordVoiceManager, each routed to masterGain with default gain 0.7
- Created Voice.reconnect() method enabling dynamic output re-routing during triggerChord
- Added perTrackVolumes state (7-element array) and setPerTrackVolume action to synthStore
- Converted PerTrackVolume sliders from uncontrolled (defaultValue) to controlled (value + onChange) inputs wired to audio engine
- Full audio chain: slider onChange -> store.setPerTrackVolume -> ChordVoiceManager.setDegreeVolume -> degree GainNode with anti-click scheduling

## Task Commits

Each task was committed atomically:

1. **Task 1: Add per-degree GainNodes to ChordVoiceManager and per-track state to synthStore** - `34e1ec3` (feat)
2. **Task 2: Wire PerTrackVolume component to store and verify full stack** - `e612e65` (feat)

**Plan metadata:** [pending] (docs: complete plan)

## Files Created/Modified
- `src/renderer/audio/Voice.ts` - Added reconnect(destination) method for output re-routing
- `src/renderer/audio/ChordVoiceManager.ts` - Added degreeGains Map, setDegreeVolume(), degreeGainFor() helper, voice routing in triggerChord
- `src/renderer/store/synthStore.ts` - Added perTrackVolumes state and setPerTrackVolume action
- `src/renderer/components/PerTrackVolume.tsx` - Converted to controlled sliders with store wiring
- `src/__tests__/ChordVoiceManager.test.ts` - Updated pool creation test to account for 7 degree GainNodes

## Decisions Made
- Voice.reconnect() minimal API addition over inserting gain nodes at Voice construction time -- keeps Voice class simple and focused on ADSR
- Per-degree GainNodes created eagerly in constructor (not lazily) to guarantee audio chain exists before first triggerChord call
- Anti-click 20ms linearRamp on setDegreeVolume matches the established masterBus scheduling pattern

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated test assertion for gain node count**
- **Found during:** Task 1 (after adding degree GainNodes)
- **Issue:** ChordVoiceManager.test.ts expected exactly CHORD_VOICE_POOL_SIZE (24) gain nodes, but constructor now creates 7 additional degree GainNodes
- **Fix:** Updated assertion to expect CHORD_VOICE_POOL_SIZE + 7
- **Files modified:** src/__tests__/ChordVoiceManager.test.ts
- **Verification:** All 87 tests pass
- **Committed in:** 34e1ec3 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Test fix necessary for correctness after adding degree GainNodes. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 2 success criterion #5 is fully satisfied: per-track volume sliders control individual chord degree audio output independently
- CTRL-01 requirement complete
- All 87 tests pass with zero regressions
- Ready for Phase 3 (Convergence Engine + Slide Mode)

## Self-Check: PASSED

All 6 files verified present. Both task commits (34e1ec3, e612e65) verified in git log.

---
*Phase: 02-chord-engine-synth-mode*
*Completed: 2026-02-18*
