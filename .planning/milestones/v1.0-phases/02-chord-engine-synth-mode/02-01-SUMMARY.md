---
phase: 02-chord-engine-synth-mode
plan: 01
subsystem: audio
tags: [tonal, music-theory, diatonic-chords, modes, tdd, vitest]

# Dependency graph
requires:
  - phase: 01-audio-foundation
    provides: "Web Audio Voice class, VoiceManager, project scaffolding with Vitest"
provides:
  - "ChordData type and musicTypes constants (CIRCLE_OF_FIFTHS, MODES, HARMONIC_FUNCTIONS, CHORD_KEYS)"
  - "generateDiatonicChords(key, mode) -> 7 ChordData with frequencies"
  - "buildTriadWithOctave for octave-aware note name generation"
  - "getChordQuality and deriveRomanNumeral utility functions"
affects: [02-02, 02-03, 02-04, 03-slide-engine]

# Tech tracking
tech-stack:
  added: [tonal v6]
  patterns: [tonal Mode.triads/Mode.notes for chord generation, octave-crossing detection via note letter index]

key-files:
  created:
    - src/renderer/music/musicTypes.ts
    - src/renderer/music/chordEngine.ts
    - src/renderer/music/noteFrequency.ts
    - src/__tests__/chordEngine.test.ts
    - src/__tests__/noteFrequency.test.ts
  modified:
    - package.json

key-decisions:
  - "Used tonal library Mode.triads() and Mode.notes() for chord generation rather than hand-rolling interval tables"
  - "Mode aliases map user-facing names (major/minor) to tonal internal names (ionian/aeolian)"
  - "Octave crossing detection uses note letter index comparison (C=0 through B=6)"

patterns-established:
  - "Music theory as pure computation layer: no audio deps, no React deps, just types in -> data out"
  - "TDD cycle: RED (failing tests with stubs) -> GREEN (implementation) -> REFACTOR"

requirements-completed: [CHORD-01, CHORD-02]

# Metrics
duration: 7min
completed: 2026-02-18
---

# Phase 02 Plan 01: Chord Engine Data Foundation Summary

**Diatonic chord generation from any key + mode using tonal library, with 45 tests covering all 8 modes and octave boundary handling**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-18T17:47:56Z
- **Completed:** 2026-02-18T17:55:44Z
- **Tasks:** 2 (1 auto + 1 TDD feature)
- **Files modified:** 6

## Accomplishments
- tonal library installed for music theory computation
- Complete type system for chord engine (ChordData, HarmonicFunction, ChordQuality, MusicalKey, MusicalMode)
- generateDiatonicChords produces correct 7-chord grids for all 8 modes across all 12 keys
- buildTriadWithOctave correctly handles octave boundary crossings (e.g. B-D-F spans B4-D5-F5)
- 45 test cases: 13 for noteFrequency octave handling, 32 for chord engine (qualities, Roman numerals, harmonic functions, frequencies)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install tonal and create music theory types** - `f28e717` (feat)
2. **TDD RED: Failing tests for chord engine and note frequency** - `422a3d6` (test)
3. **TDD GREEN: Implement chord engine with tonal library** - `3d87136` (feat)

_Note: REFACTOR phase had no additional changes to commit (edits absorbed into prior commit)._

## Files Created/Modified
- `src/renderer/music/musicTypes.ts` - ChordData interface, HarmonicFunction/ChordQuality types, CIRCLE_OF_FIFTHS/MODES/HARMONIC_FUNCTIONS/CHORD_KEYS constants
- `src/renderer/music/chordEngine.ts` - generateDiatonicChords, getChordQuality, deriveRomanNumeral using tonal Mode.triads/Mode.notes/Note.freq
- `src/renderer/music/noteFrequency.ts` - buildTriadWithOctave with octave crossing detection via note letter index comparison
- `src/__tests__/chordEngine.test.ts` - 32 tests: quality parsing, Roman numerals, all 8 modes x C key, D dorian, B locrian, F lydian, frequency sanity
- `src/__tests__/noteFrequency.test.ts` - 13 tests: all 7 C major degrees, D dorian, B locrian, sharps, flats, different base octaves
- `package.json` - Added tonal dependency

## Decisions Made
- Used tonal library Mode.triads() and Mode.notes() for chord generation rather than hand-rolling interval tables -- eliminates 7 modes x 7 degrees x quality logic edge cases
- Mode aliases map user-facing names (major/minor) to tonal internal names (ionian/aeolian) -- clean separation between UI labels and library API
- Octave crossing detection uses note letter index comparison (C=0 through B=6) -- when current note index <= previous note index, increment octave

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Locrian mode quality expectation in test**
- **Found during:** TDD GREEN phase
- **Issue:** Test expected C Locrian qualities as [dim, minor, major, minor, major, major, minor] but correct music theory order is [dim, major, minor, minor, major, major, minor]
- **Fix:** Corrected expected quality array in test (positions 2 and 3 swapped)
- **Files modified:** src/__tests__/chordEngine.test.ts
- **Verification:** All 8 mode tests pass, verified against music theory (C Locrian scale: C Db Eb F Gb Ab Bb, degree 2 = Db-F-Ab = major)
- **Committed in:** 3d87136 (GREEN phase commit)

**2. [Rule 3 - Blocking] Fixed pre-existing TypeScript and ESLint errors in ChordVoiceManager.test.ts**
- **Found during:** REFACTOR commit attempt (pre-commit hook blocked)
- **Issue:** readonly currentTime assignment (TS2540) and unused variables (ESLint) in pre-existing test file
- **Fix:** Added type assertion for mock currentTime, prefixed unused vars with underscore
- **Files modified:** src/__tests__/ChordVoiceManager.test.ts
- **Verification:** tsc --noEmit passes, eslint passes
- **Committed in:** Absorbed into prior commit

---

**Total deviations:** 2 auto-fixed (1 bug in test, 1 blocking pre-existing error)
**Impact on plan:** Bug fix corrected a music theory error in test expectations. Blocking fix was pre-existing and unrelated to plan scope. No scope creep.

## Issues Encountered
- Pre-existing stub implementations (noteFrequency.ts, chordEngine.ts) from a previous session existed in working tree. noteFrequency.ts already had a correct implementation that passed all tests; chordEngine.ts had stubs that enabled TypeScript compilation but returned empty results. This affected the TDD flow: noteFrequency tests passed immediately in RED phase (implementation pre-existed), so only chordEngine required the full RED->GREEN cycle.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- ChordData types and generateDiatonicChords are ready for Plan 02-02 (ChordVoiceManager integration)
- musicTypes constants (CHORD_KEYS, CIRCLE_OF_FIFTHS, MODES) ready for Plan 02-03 (UI components)
- buildTriadWithOctave frequencies ready for voice allocation in ChordVoiceManager

## Self-Check: PASSED

All 6 created files verified on disk. All 3 task commits verified in git log.

---
*Phase: 02-chord-engine-synth-mode*
*Completed: 2026-02-18*
