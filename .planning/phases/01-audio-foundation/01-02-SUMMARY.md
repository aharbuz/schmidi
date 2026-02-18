---
phase: 01-audio-foundation
plan: 02
subsystem: audio
tags: [web-audio, oscillator, adsr, envelope, vitest, tdd, voice-manager]

# Dependency graph
requires:
  - phase: 01-01
    provides: Electron Forge scaffold with Vite, React, TypeScript, and pre-commit hook
provides:
  - 8 persistent oscillator voices with anti-click ADSR scheduling
  - VoiceManager for global waveform/ADSR/preset control
  - Master bus chain (gain -> compressor -> analyser -> destination)
  - 4 named ADSR envelope presets (Pad, Pluck, Organ, Strings)
  - Pure envelope math utility for canvas curve visualization
  - Vitest test suite with 33 tests across 4 test files
  - ADSRValues, VoiceState, EnvelopeStage, WaveformType, MasterBus types
affects: [01-03, 01-04, 01-05]

# Tech tracking
tech-stack:
  added: [vitest@4, jsdom@28, @vitest/coverage-v8@4]
  patterns: [tdd-red-green, anti-click-audioparam, persistent-oscillator, singleton-audiocontext]

key-files:
  created:
    - vitest.config.ts
    - src/renderer/audio/Voice.ts
    - src/renderer/audio/VoiceManager.ts
    - src/renderer/audio/audioContext.ts
    - src/renderer/audio/masterBus.ts
    - src/renderer/audio/envelopePresets.ts
    - src/renderer/audio/constants.ts
    - src/renderer/utils/envelopeMath.ts
    - src/__tests__/envelopeMath.test.ts
    - src/__tests__/envelopePresets.test.ts
    - src/__tests__/Voice.test.ts
    - src/__tests__/VoiceManager.test.ts
  modified:
    - src/shared/types.ts
    - package.json
    - tsconfig.json

key-decisions:
  - "Anti-click AudioParam protocol: cancelScheduledValues -> setValueAtTime (anchor) -> ramp/target for all gain changes"
  - "Persistent oscillators always running, gain controls audibility -- avoids click/pop from start/stop"
  - "Envelope decay/release use setTargetAtTime with timeConstant=period/3 for ~95% convergence"
  - "Hard silence setValueAtTime(0) at release*1.67 to prevent lingering near-zero oscillation"

patterns-established:
  - "Anti-click AudioParam scheduling: cancel -> anchor -> ramp for every gain change"
  - "Persistent oscillator pattern: oscillators run continuously, gain node controls volume"
  - "Voice + VoiceManager architecture for polyphonic synth"
  - "Vitest with jsdom environment and mocked AudioContext for audio logic testing"

requirements-completed: [AUDIO-01, AUDIO-02, AUDIO-03, AUDIO-04]

# Metrics
duration: 5min
completed: 2026-02-18
---

# Phase 1 Plan 02: Audio Engine Core Summary

**TDD-built 8-voice polyphonic synth engine with anti-click ADSR scheduling, master bus compressor/analyser, 4 envelope presets, and pure envelope math for canvas visualization**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-18T12:44:42Z
- **Completed:** 2026-02-18T12:50:08Z
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments
- Built complete audio engine with TDD (RED -> GREEN): 33 tests across 4 test files all passing
- 8 persistent oscillator voices with anti-click AudioParam scheduling for zero clicks/pops
- VoiceManager with global waveform selection, ADSR propagation, and preset lookup
- Master bus chain: gain(0.15) -> compressor(threshold:-24, knee:12, ratio:4) -> analyser(fft:2048) -> destination
- 4 distinct ADSR presets: Pad (Drift), Pluck (Snap), Organ (Breathe), Strings (Bloom)
- Pure envelope math utility computing ADSR curves for canvas visualization

## Task Commits

Each task was committed atomically:

1. **Task 1: RED -- Write failing tests for audio engine modules** - `a5f8275` (test)
2. **Task 2: GREEN -- Implement audio engine modules to pass all tests** - `0ba6e56` (feat)

## Files Created/Modified
- `vitest.config.ts` - Vitest config with jsdom environment, globals, v8 coverage
- `src/shared/types.ts` - ADSRValues, EnvelopeStage, VoiceState, WaveformType, MasterBus types
- `src/renderer/audio/constants.ts` - Default pitches (C3-C4), detune offsets, keyboard keys, compressor settings
- `src/renderer/audio/envelopePresets.ts` - 4 named ADSR presets with distinct audible characters
- `src/renderer/utils/envelopeMath.ts` - Pure ADSR curve computation for canvas visualization
- `src/renderer/audio/audioContext.ts` - Singleton AudioContext with resume helper and Playwright test exposure
- `src/renderer/audio/masterBus.ts` - Master gain -> compressor -> analyser -> destination chain
- `src/renderer/audio/Voice.ts` - Single voice: persistent oscillator + gain + ADSR scheduling (126 lines)
- `src/renderer/audio/VoiceManager.ts` - Manages 8 voices, global waveform/ADSR, preset lookup (80 lines)
- `src/__tests__/envelopeMath.test.ts` - 9 tests for curve shape, bounds, sample count, preset shapes
- `src/__tests__/envelopePresets.test.ts` - 10 tests for preset existence, valid ranges, distinct values
- `src/__tests__/Voice.test.ts` - 5 tests for anti-click scheduling, waveform, ADSR, state
- `src/__tests__/VoiceManager.test.ts` - 9 tests for 8 voices, propagation, presets, bus, dispose

## Decisions Made
- **Anti-click AudioParam protocol:** All gain changes follow cancel -> anchor -> ramp pattern to prevent audible clicks. This is consistent across triggerAttack, triggerRelease, and setMasterVolume.
- **Persistent oscillators:** Oscillators start in constructor and run continuously at gain=0. This avoids the click/pop artifact from starting/stopping oscillators and simplifies voice lifecycle.
- **Decay/release time constants:** Using timeConstant = period/3 for setTargetAtTime, which gives ~95% convergence at the end of the specified period. Release adds a hard silence at 1.67x release time (~5 time constants = 99.8% convergence).
- **Vitest with jsdom + mocks for testing:** Full AudioContext mocking tracks scheduling call order and arguments to verify anti-click protocol without needing actual audio output.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript strict mode window type cast**
- **Found during:** Task 2 (audioContext.ts implementation)
- **Issue:** `(window as Record<string, unknown>)` type cast fails under strict TypeScript -- Window type doesn't have index signature
- **Fix:** Changed to `(window as any)` with eslint-disable comment
- **Files modified:** `src/renderer/audio/audioContext.ts`
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** `0ba6e56` (Task 2 commit)

**2. [Rule 1 - Bug] Fixed unused import and variable lint errors in VoiceManager test**
- **Found during:** Task 2 (pre-commit lint check)
- **Issue:** `WaveformType` import and `mockVoiceGainNode` variable unused -- ESLint strict no-unused-vars rule
- **Fix:** Removed unused import and variable
- **Files modified:** `src/__tests__/VoiceManager.test.ts`
- **Verification:** ESLint passes with zero errors
- **Committed in:** `0ba6e56` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Minor type/lint fixes. No scope creep. All planned functionality delivered.

## Issues Encountered
None beyond the type/lint fixes documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Audio engine complete with all 8 voices, ADSR scheduling, and master bus
- Ready for 01-03: App shell UI with Zustand state management wiring to VoiceManager
- Voice.ts and VoiceManager.ts export clean APIs that React components can call directly
- Envelope presets ready for preset selector UI
- computeEnvelopeCurve ready for live envelope preview canvas

## Self-Check: PASSED

All 13 created files verified on disk. Both task commits (a5f8275, 0ba6e56) verified in git log.

---
*Phase: 01-audio-foundation*
*Completed: 2026-02-18*
