# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-18)

**Core value:** The slide mode — the feeling of chords emerging from converging glissandos rather than being struck, with the behavior visible and configurable in real-time
**Current focus:** Phase 4 complete. Ready for Phase 5 — Instrument Personality

## Current Position

Phase: 4 of 5 (Visualization) -- COMPLETE
Plan: 3 of 3 in current phase (all plans complete)
Status: Phase Complete
Last activity: 2026-02-20 — Completed 04-03 (Layout Integration + Visual Verification)

Progress: [█████████████████████████████████████] 80%

## Performance Metrics

**Velocity:**
- Total plans completed: 18
- Average duration: 5min
- Total execution time: 95min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Audio Foundation | 4 | 25min | 6min |
| 2. Chord Engine + Synth Mode | 5 | 24min | 5min |
| 3. Convergence Engine + Slide Mode | 6 | 36min | 6min |
| 4. Visualization | 3 | 10min | 3min |

**Recent Trend:**
- Last 5 plans: 5min, 3min, 2min, 3min, 2min
- Trend: Phase 4 visualization plans consistently fast (2-5min each)

*Updated after each plan completion*

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 02 P01 | 7min | 3 tasks | 6 files |
| Phase 02 P02 | 7min | 2 tasks | 3 files |
| Phase 02 P03 | 3min | 3 tasks | 5 files |
| Phase 02 P04 | 4min | 3 tasks | 4 files |
| Phase 02 P05 | 3min | 2 tasks | 5 files |
| Phase 03 P01 | 6min | 2 tasks | 2 files |
| Phase 03 P02 | 3min | 2 tasks | 3 files |
| Phase 03 P03 | 5min | 2 tasks | 6 files |
| Phase 03 P04 | 17min | 2 tasks | 0 files |
| Phase 03 P05 | 2min | 2 tasks | 3 files |
| Phase 03 P06 | 3min | 2 tasks | 3 files |
| Phase 04 P01 | 5min | 2 tasks | 4 files |
| Phase 04 P02 | 3min | 2 tasks | 4 files |
| Phase 04 P03 | 2min | 3 tasks | 8 files |

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
- 02-04: Per-track volume sliders store values in Zustand but defer per-group gain routing to gap closure plan 02-05
- 02-04: ChordVoiceManager connects to same masterGain as Phase 1 VoiceManager (shared master bus)
- 02-04: Phase 1 VoiceButton grid replaced by ChordArc -- old component file preserved for debug/legacy mode
- 02-05: Voice.reconnect() minimal API addition over inserting gain nodes at Voice construction time -- keeps Voice simple
- 02-05: Per-degree GainNodes created eagerly in constructor (not lazily) to guarantee audio chain exists before first triggerChord
- 02-05: Anti-click 20ms linearRamp on setDegreeVolume matching masterBus scheduling pattern
- [Phase 02]: Used tonal library for chord generation rather than hand-rolling interval tables
- 03-01: Dual gain chain: osc -> swellGain (proximity) -> trackGain (per-track volume) -> masterGain
- 03-01: setTimeout-based lookahead scheduler (50ms interval, 100ms lookahead) for continuous audio motion
- 03-01: JS-side logical frequency tracking via linear interpolation (no AudioParam.value reads during ramps)
- 03-01: Hold mechanism uses separate state enum + setTimeout, not ADSR sustain
- 03-01: Departure starts from arrived note pitch (musically coherent push-off)
- 03-01: setValueCurveAtTime with 256-sample Float32Array for ease-in/ease-out easing curves
- 03-02: Note.freq from tonal library for key-to-root-frequency conversion (consistent with chordEngine)
- 03-02: Last-key-up release behavior for monophonic slide keyboard (hold note while switching)
- 03-03: SlideControls placed in right column replacing PerTrackVolume in slide mode -- keeps layout balanced
- 03-03: Native title attributes for tooltips (superseded by 03-06: CSS data-tooltip for Electron frameless compat)
- 03-03: Reusable typed control components (SliderControl, SelectControl<T>, RadioGroup<T>, CheckboxControl)
- 03-03: Mode-conditional rendering pattern: slideMode ? SlideComponent : SynthComponent
- 03-04: Task 1 work already completed by 03-03 -- verified correct rather than re-implementing
- 03-05: swellGain starts at 0 (not 0.1) -- engine must be explicitly activated via startScheduler
- 03-05: 150ms fade-in duration for dynamically added tracks balances smoothness vs responsiveness
- 03-05: pauseScheduler called after construction as belt-and-suspenders silence guarantee
- 03-06: CSS data-tooltip with ::after pseudo-element instead of custom React tooltip component -- zero JS overhead
- 03-06: scrollbar-thin opt-in class preserves global scrollbar hiding while allowing specific containers to scroll
- 04-01: Pre-rendered glow sprites (body + halo) per-hue, drawImage per frame instead of createRadialGradient
- 04-01: Two-pass rendering: source-over for orb bodies, globalCompositeOperation 'lighter' for glow halos
- 04-01: Bloom gradient per-frame only during 400ms flash events -- acceptable per research
- 04-01: Circular mean (atan2) for hue blending handles 360-degree wraparound correctly
- 04-01: RadialView uses own rAF loop reading Zustand, separate from useAnimationLoop
- [Phase 04]: AnalyserNode between osc and swellGain for clean per-track waveform before gain processing
- [Phase 04]: WaveformBuffer pre-allocates all typed arrays to avoid GC pressure in rAF render loop
- [Phase 04]: Convergence flash uses delta-time phase animation (300ms flash + 200ms fade) synced to rAF
- 04-03: VisualizationPanel renders chord overlay only in slideMode, reusing SlideModeUI's triggerSlideChord/releaseSlideChord
- 04-03: Full-viz mode hides all chrome; Escape exits, expand icon enters (avoids chord key conflicts A-J)
- 04-03: Dark/glow restyle via CSS utility classes (glow-border, glow-text, fade-in) not component-level inline styles
- 04-03: Window defaults 1280x720 (16:9); windowStateKeeper preserves user size after first launch

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 1: Electron autoplay behavior (2025/2026) needs integration testing on both macOS and Windows — LOW confidence source
- Phase 4: Canvas performance above 4 tracks unconfirmed — profile in Phase 4 before Phase 5

## Session Continuity

Last session: 2026-02-20
Stopped at: Completed 04-03-PLAN.md (Layout Integration) -- Phase 4 Visualization complete
Resume file: .planning/phases/04-visualization/04-03-SUMMARY.md
