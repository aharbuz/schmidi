# Schmidi

## What This Is

A desktop convergence synthesizer (Electron + Web Audio API) that plays chords in two modes: a traditional synth mode where clicking chord buttons plays them directly, and a "slide mode" where multiple synth tracks continuously glide through pitch space, swelling in volume as they converge on chord notes and fading as they drift away. Three character presets (Eerie, Bloom, Swarm) shape the slide personality, with configurable idle modes, post-arrival behaviors, and scale-snapped glissando. The real-time visualization of sliding tracks IS the primary instrument interface.

## Core Value

The slide mode — the feeling of chords *emerging* from converging glissandos rather than being struck, with the behavior visible and configurable in real-time.

## Requirements

### Validated

- ✓ Chord grid generated from user-selected key + mode (major, minor, dorian, etc.) — v1.0
- ✓ Standard synth mode: click/hold chord buttons to play chords with configurable waveform, ADSR envelope, and standard synth controls — v1.0
- ✓ Slide mode toggle: multiple synth tracks constantly sliding through pitch space — v1.0
- ✓ Slide tracks swell in volume as they approach chord target notes, fade as they move away — v1.0
- ✓ One "solid" anchor track plays the chord cleanly without slide behavior — v1.0
- ✓ Per-track volume sliders — v1.0
- ✓ Configurable slide behavior: converge-then-restart, converge-and-hold, continuous cycle — v1.0
- ✓ Configurable pre-press behavior: silent until pressed, always sliding quietly, ambient drone — v1.0
- ✓ Configurable slide character: eerie convergence vs smooth bloom — v1.0
- ✓ Option to snap glissando to scale (diatonic steps instead of continuous pitch) — v1.0
- ✓ Configurable number of sliding tracks (manual, default 2) — v1.0
- ✓ Real-time visualization switchable between radial convergence and waveform trace views — v1.0
- ✓ Visualization IS the primary instrument interface, not a secondary display — v1.0

### Active

- [ ] Preset chord progressions available (I-IV-V-I, ii-V-I, etc.) in selectable keys
- [ ] Auto-calculated track count based on swell timing, scale snapping, and note range bounds
- [ ] Optional reverb post-processing if it enhances convergence effect

### Out of Scope

- MIDI input/output — focus on mouse/keyboard interaction first
- Audio recording/export — play instrument only; use system-level audio capture (BlackHole, Loopback)
- Plugin format (VST/AU) — standalone app only; completely different build pipeline
- Mobile support — desktop Electron app; touch interaction would need redesigned UI
- Sequencer/arpeggiator — the slide cycle IS the rhythm
- 2000+ preset scales — 8 modes is sufficient for the convergence mechanic
- Per-track independent ADSR — convergence implies shared envelope behavior

## Context

Shipped v1.0 with 9,235 LOC TypeScript across 170 files.
Tech stack: Electron 40, React 19, Zustand 5, Web Audio API, Canvas 2D, Tailwind CSS 4, Vitest.
130 passing tests across 9 test files. Pre-commit hook enforces typecheck + lint.
All 22 v1 requirements satisfied. Audit passed with 0 gaps.
This is a vibes/portfolio project — experimentation and feel matter more than production polish.

## Constraints

- **Platform**: Electron desktop app — native resources and lower latency for real-time audio
- **Audio Engine**: Web Audio API — leverages native oscillator scheduling, no custom DSP needed
- **Rendering**: Canvas 2D for real-time track visualization — maintains 60fps alongside audio via pre-rendered glow sprites
- **Interaction**: Mouse/keyboard only — chord buttons and keyboard shortcuts as primary input

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Electron + Web Audio over pure web | Desktop resources, lower latency for real-time multi-oscillator synthesis | ✓ Good — sub-50ms latency achieved, 8+ simultaneous oscillators |
| Visualization as primary UI | The sliding tracks ARE the instrument — experimental, not just a meter | ✓ Good — canvas-first layout with full-viz mode |
| Two visualization modes (radial + waveform) | Different ways to see convergence — user picks what's intuitive | ✓ Good — both views implemented at 60fps |
| Manual track count for v1 | Auto-calculation is complex math — defer to v2 after core audio works | ✓ Good — deferred correctly, manual works well |
| @tailwindcss/postcss over @tailwindcss/vite | Forge Vite plugin CJS bundling cannot load ESM-only modules | ✓ Good — resolved CJS/ESM incompatibility |
| Persistent oscillators with gain-controlled audibility | Avoids click/pop artifacts from start/stop; anti-click AudioParam protocol | ✓ Good — zero audible artifacts |
| tonal library for chord generation | Eliminates hand-rolled interval tables; Mode.triads()/Mode.notes() for diatonic chords | ✓ Good — clean, tested music theory layer |
| Pre-rendered glow sprites for canvas | drawImage per frame instead of createRadialGradient; avoids GC pressure | ✓ Good — consistent 60fps rendering |
| 3 character presets (Eerie/Bloom/Swarm) | Cover the range from independent-wandering to lush-sweeping to chaotic convergence | ✓ Good — distinct, audibly different characters |
| loadURL retry with exponential backoff | Forge reports Vite "launched" before TCP socket accepts; ERR_CONNECTION_REFUSED | ✓ Good — fixed white screen race condition |

---
*Last updated: 2026-02-20 after v1.0 milestone*
