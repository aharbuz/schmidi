# Schmidi

## What This Is

A desktop synthesizer instrument (Electron + Web Audio API) that plays chords in two modes: a traditional synth mode where clicking chord buttons plays them directly, and a "slide mode" where multiple synth tracks continuously glide through pitch space, swelling in volume as they converge on chord notes and fading as they drift away. The UI visualizes the sliding tracks in real-time, making the instrument as much a visual experience as an auditory one.

## Core Value

The slide mode — the feeling of chords *emerging* from converging glissandos rather than being struck, with the behavior visible and configurable in real-time.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Chord grid generated from user-selected key + mode (major, minor, dorian, etc.)
- [ ] Preset chord progressions available (I-IV-V-I, ii-V-I, etc.) in selectable keys
- [ ] Standard synth mode: click/hold chord buttons to play chords with configurable waveform (sine, square, sawtooth, triangle), ADSR envelope, and standard synth controls
- [ ] Slide mode toggle: multiple synth tracks constantly sliding through pitch space
- [ ] Slide tracks swell in volume as they approach chord target notes, fade as they move away — configurable swell/fade timing
- [ ] One "solid" track plays the chord cleanly without slide behavior
- [ ] Per-track volume sliders
- [ ] Configurable slide behavior: converge-then-restart, converge-and-hold, continuous cycle through chord notes
- [ ] Configurable pre-press behavior: silent until pressed, always sliding but quiet, ambient drone
- [ ] Configurable slide character: eerie convergence (independent wandering, eerily align) vs smooth bloom (lush sweeping convergence)
- [ ] Option to snap glissando to scale (diatonic steps instead of continuous pitch)
- [ ] Configurable number of sliding tracks (v1 manual, default 2)
- [ ] Real-time visualization of sliding tracks — switchable between radial convergence view (orbs/lines spiraling toward center) and waveform trace view (colored waveforms morphing/aligning)
- [ ] Experimental UI that IS the instrument — the visualization is the primary interface, not a secondary display

### Out of Scope

- [ ] MIDI input/output — focus on mouse/keyboard interaction first
- [ ] Audio recording/export — play instrument only
- [ ] Plugin format (VST/AU) — standalone app only
- [ ] Mobile support — desktop Electron app
- [ ] Auto-calculated track count based on swell timing, scale snapping, and note bounds — deferred to v2

## Context

- Electron app using Web Audio API for synthesis (runs on audio thread, sample-rate accurate scheduling)
- Web Audio API's AudioParam scheduling (`linearRampToValueAtTime`, `exponentialRampToValueAtTime`) handles pitch sliding and volume envelopes natively
- The "slide mode" requires calculating starting positions for sliding tracks so they converge on chord notes at the right time — this is the core algorithmic challenge
- v2 will introduce mathematical auto-calculation of optimal track count based on swell timing, scale snapping toggle, and note range bounds
- This is a vibes/portfolio project — experimentation and feel matter more than production polish

## Constraints

- **Platform**: Electron desktop app — need native resources and lower latency for real-time audio
- **Audio Engine**: Web Audio API — leverages native oscillator scheduling, no custom DSP needed for v1
- **Rendering**: Canvas or WebGL for real-time track visualization — must maintain 60fps alongside audio
- **Interaction**: Mouse/keyboard only — chord buttons as primary input

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Electron + Web Audio over pure web | Desktop resources, lower latency for real-time multi-oscillator synthesis | -- Pending |
| Visualization as primary UI | The sliding tracks ARE the instrument — experimental, not just a meter | -- Pending |
| Two visualization modes (radial + waveform) | Different ways to see convergence — user picks what's intuitive | -- Pending |
| Manual track count for v1 | Auto-calculation is complex math — defer to v2 after core audio works | -- Pending |

---
*Last updated: 2026-02-18 after initialization*
