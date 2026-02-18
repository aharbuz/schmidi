# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-18)

**Core value:** The slide mode — the feeling of chords emerging from converging glissandos rather than being struck, with the behavior visible and configurable in real-time
**Current focus:** Phase 2 complete -- ready for Phase 3 (Convergence Engine + Slide Mode)

## Current Position

Phase: 2 of 5 (Chord Engine + Synth Mode) -- COMPLETE
Plan: 4 of 4 in current phase (all plans complete)
Status: Phase Complete
Last activity: 2026-02-18 — Completed 02-04 (App Layout Integration + Playable Chord Instrument)

Progress: [████████████████████░░░░░░░░░░] 36%

## Performance Metrics

**Velocity:**
- Total plans completed: 8
- Average duration: 6min
- Total execution time: 46min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Audio Foundation | 4 | 25min | 6min |
| 2. Chord Engine + Synth Mode | 4 | 21min | 5min |

**Recent Trend:**
- Last 5 plans: 2min, 3min, 7min, 3min, 4min
- Trend: stable

*Updated after each plan completion*

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 02 P01 | 7min | 3 tasks | 6 files |
| Phase 02 P02 | 7min | 2 tasks | 3 files |
| Phase 02 P03 | 3min | 3 tasks | 5 files |
| Phase 02 P04 | 4min | 3 tasks | 4 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Pre-roadmap: Electron + Web Audio over pure web — desktop resources, lower latency
- Pre-roadmap: Visualization as primary UI — the sliding tracks ARE the instrument
- Pre-roadmap: Manual track count for v1 — auto-calculation deferred to v2
- 01-01: Used @tailwindcss/postcss instead of @tailwindcss/vite -- Forge Vite plugin CJS bundling cannot load ESM-only modules
- 01-01: Pinned @electron-forge/plugin-vite to exact 7.11.1 (experimental API stability)
- 01-01: ESLint v10 flat config instead of legacy .eslintrc format
- 01-02: Anti-click AudioParam protocol: cancelScheduledValues -> setValueAtTime (anchor) -> ramp/target for all gain changes
- 01-02: Persistent oscillators always running, gain controls audibility -- avoids click/pop from start/stop
- 01-02: Envelope decay/release use setTargetAtTime with timeConstant=period/3 for ~95% convergence
- 01-02: Hard silence setValueAtTime(0) at release*1.67 to prevent lingering near-zero oscillation
- 01-03: VoiceManager stored as module-level variable (not reactive state) to avoid re-render overhead
- 01-03: Splash screen gates AudioContext resume on user click per Web Audio autoplay policy
- 01-03: Animation loop uses rAF polling rather than event-driven updates for consistent 60fps visual feedback
- 01-04: Global keydown/keyup listeners with heldKeysRef Set for repeat prevention and polyphonic key tracking
- 01-04: CSS animation classes per envelope stage driven by voiceState.stage from animation loop
- 01-04: Inline SVG waveform icons for crisp rendering at small sizes
- 01-04: Vertical range inputs via writingMode vertical-lr for native slider orientation
- 02-01: Used tonal library Mode.triads()/Mode.notes() for chord generation — eliminates hand-rolled interval tables
- 02-01: Mode aliases map user-facing names (major/minor) to tonal internal names (ionian/aeolian)
- 02-01: Octave crossing detection via note letter index comparison (C=0 through B=6)
- 02-02: ChordRetuneData local interface decouples ChordVoiceManager from plan 02-01 execution order
- 02-02: Sequence counter in chordId generation prevents same-millisecond collisions
- 02-02: Voice allocation checks both isActive and isVoiceAllocated to prevent reuse during release phase
- 02-03: Zustand get() for chord actions that need current state rather than closure over stale values
- 02-03: Math.sin/cos in JS for arc/circle positioning rather than CSS trig functions (cross-browser compat)
- 02-03: Harmonic function colors: tonic=indigo, subdominant=amber, dominant=rose
- 02-03: Module-level ChordVoiceManager ref pattern (same as Phase 1 VoiceManager)
- 02-04: useChordKeyboard hook with useRef<Set> for held-key tracking prevents key repeat and enables polychordal triggering
- 02-04: Per-track volume sliders store values in Zustand but defer per-group gain routing to Phase 3
- 02-04: ChordVoiceManager connects to same masterGain as Phase 1 VoiceManager (shared master bus)
- 02-04: Phase 1 VoiceButton grid replaced by ChordArc -- old component file preserved for debug/legacy mode
- [Phase 02]: Used tonal library for chord generation rather than hand-rolling interval tables

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 3: Convergence math (simultaneous N-track arrival from arbitrary mid-ramp positions) has no reference implementation — flag for `/gsd:research-phase` during Phase 3 planning
- Phase 1: Electron autoplay behavior (2025/2026) needs integration testing on both macOS and Windows — LOW confidence source
- Phase 4: Canvas performance above 4 tracks unconfirmed — profile in Phase 4 before Phase 5

## Session Continuity

Last session: 2026-02-18
Stopped at: Completed 02-04-PLAN.md (App Layout Integration + Playable Chord Instrument) -- Phase 2 complete
Resume file: .planning/phases/02-chord-engine-synth-mode/02-04-SUMMARY.md
