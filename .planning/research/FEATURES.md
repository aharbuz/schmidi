# Feature Research

**Domain:** Desktop synthesizer instrument — chord-based with glissando/convergence mechanics
**Researched:** 2026-02-18
**Confidence:** MEDIUM — synthesizer feature conventions are stable and well-documented; Schmidi's specific slide-convergence paradigm has no direct competitors, so differentiator analysis is partially inferred from adjacent products

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist in any software synthesizer. Missing these makes the product feel unfinished, not novel.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Waveform selector (sine, square, sawtooth, triangle) | Every synthesizer since Moog. These four are the baseline oscillator palette. | LOW | Web Audio API `OscillatorNode.type` handles all four natively |
| ADSR envelope (Attack, Decay, Sustain, Release) | ADSR is the universal language of synthesizer amplitude shaping. Users with any synth experience expect it. | MEDIUM | Web Audio API `AudioParam` scheduling (`linearRampToValueAtTime`, `exponentialRampToValueAtTime`) maps directly |
| Key + mode selector generating diatonic chords | Any chord-based instrument (HiChord, ChordFlow, Scaler) provides diatonic chord generation from a root key | MEDIUM | 12 keys × standard modes (major, minor, dorian, etc.) — chord math is straightforward |
| Polyphonic output (multiple simultaneous voices) | Single-voice monophonic output is inadequate for chords — users expect all chord tones to sound simultaneously | MEDIUM | Web Audio API supports multiple simultaneous `OscillatorNode` instances; resource management needed |
| Volume control (global and per-voice) | Every instrument has a master volume; users expect to balance individual voices | LOW | GainNode per oscillator + master GainNode |
| Start/stop sound on interaction | Basic playback — notes play when triggered, stop when released or on explicit action | LOW | Standard Web Audio API pattern |
| Glide/portamento (pitch sliding between notes) | Users of any mono/polyphonic synth with slide expect glide as a controllable parameter (time-based or rate-based) | MEDIUM | Web Audio API `AudioParam.linearRampToValueAtTime` or `exponentialRampToValueAtTime` for pitch curves |
| Preset chord progressions | Chord players (ChordFlow, Captain Chords, Cthulhu) all provide preset progressions; users expect at least common patterns (I-IV-V-I, ii-V-I, etc.) | LOW | Static data — no algorithmic complexity |
| Audio feedback is immediate (low latency) | Users playing an instrument expect sub-50ms latency; perceptible delay destroys playability | HIGH | Web Audio API scheduling is sample-accurate but Electron adds IPC overhead; audio must be scheduled on audio thread |

---

### Differentiators (Competitive Advantage)

Features that are not standard in synth instruments but directly serve Schmidi's core value: chords emerging from converging glissandos rather than being struck.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Slide mode: continuous multi-track pitch gliding | No mainstream chord instrument does this. Tracks perpetually wander pitch space and converge on chord targets — creates an "eerie emergence" effect absent from click-to-play instruments | HIGH | Core algorithmic challenge: calculate starting positions and rates so N tracks converge at chord notes simultaneously. Depends on: ADSR, waveform, swell timing parameters. |
| Volume swell on convergence (proximity-based amplitude) | Volume swells as a track approaches its target note and fades as it drifts. Rare even in modular synthesis contexts; creates a sense of "arriving" at harmony | HIGH | Requires real-time distance calculation (current pitch vs target pitch) mapped to GainNode value — continuous audio-rate update |
| Scale-snapped glissando option | Glide traverses only diatonic scale degrees rather than continuous pitch — produces a more melodic, less eerie quality | MEDIUM | On each pitch update tick, snap current frequency to nearest scale degree in Hz. Depends on key/mode selector. |
| Radial convergence visualization as primary UI | Visualization is the instrument face — not a meter bolted on. Orbs/lines spiral toward center as tracks converge. No competitor merges instrument UI with convergence visualization this way | HIGH | Canvas or WebGL at 60fps alongside audio thread. Position of visual elements driven by audio state (current pitch, proximity to target). |
| Waveform trace visualization mode | Colored waveform traces morph and align as pitches converge — alternative "lens" on the same data | HIGH | Requires reading oscillator output in real-time via `AnalyserNode` and rendering to canvas |
| Configurable slide character (eerie vs bloom) | "Eerie convergence" (independent wandering, converge eerily) vs "smooth bloom" (lush sweeping convergence) — user-selectable personality for the instrument | MEDIUM | Translates to different interpolation curves and starting-position strategies for glide tracks |
| Configurable pre-press behavior | Tracks can be silent before a chord is chosen, always sliding quietly as ambient drone, or held on last position — three distinct instrument personalities | MEDIUM | State machine per track: idle / pre-press / converging / hold. Transitions driven by UI events. |
| Configurable convergence behavior (restart vs hold vs cycle) | After reaching target: tracks can restart from random position (loop), hold chord note (sustain), or cycle to next chord note — changes how the instrument "breathes" | MEDIUM | Post-convergence behavior: branching from same track state machine |
| One "solid" anchor track plays chord cleanly | Provides harmonic grounding while slide tracks swarm around it — hybrid of traditional and slide mode in one gesture | LOW | Single additional oscillator set per chord note, no pitch ramping applied |
| Two-mode UI (synth mode vs slide mode) | Gives the instrument a traditional entry point (click-to-play) and a novel mode (slide convergence) — lowers the learning curve | MEDIUM | Mode toggle wires UI events differently; synth mode is standard, slide mode triggers glide engine |

---

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem natural to request but would harm Schmidi's focus, add disproportionate complexity, or dilute the core concept.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| MIDI input/output | Power users expect MIDI as a standard interop channel — send chords to DAW, trigger from controller | Adds significant integration surface (Web MIDI API, OS MIDI driver complexity, testing matrix). Schmidi's value is in its instrument UI, not as a MIDI device. Electron + Web MIDI has known latency and driver issues on macOS. | Explicitly out of scope for v1. If added later, MIDI output (export chord events) is lower complexity than MIDI input control. |
| Audio recording / export | Natural to want to capture what you're playing | Adds file system permissions, WAV encoding, session management UI. Distracts from instrument feel, and the experience is visual+audio — a recording captures neither fully. | Out of scope. Direct the user to system-level audio capture (BlackHole, Loopback) as the workaround. |
| VST/AU plugin format | "I want this in my DAW" is a common request for interesting instruments | Completely different build and distribution pipeline (C++ or CLAP, codesigning, DAW host integration). Incompatible with Web Audio API. Would require a full rewrite of the audio engine. | Standalone Electron app only. |
| Effects chain (reverb, delay, filter, chorus) | Standard synths all have effects | Each effect is medium complexity individually; a full chain is high complexity. Reverb and delay change the character of the convergence dramatically and unpredictably — could mask the emergence effect rather than enhance it. | Add reverb as a single optional post-processing GainNode → ConvolverNode later, only if it enhances the convergence. Don't build a chain. |
| Sequencer / arpeggiator | Natural next step from chord playing | Shifts the instrument from real-time expressive play to pattern programming — a completely different UX paradigm. Competes with the slide mode's own rhythmic quality. | The continuous slide cycle IS the rhythmic movement. Don't replace it with a sequencer. |
| Mobile / touch support | Web Audio API works in browser; "why not mobile?" | Electron does not produce mobile apps. A web version would need a separate build pipeline. Touch interaction needs redesigned UI (no hover states, different chord trigger paradigm). | Desktop Electron only. Re-evaluate after v1 if there's a separate "web toy" version of interest. |
| 2,000+ preset scales / genre detection (Scaler-style) | Scaler has it; seems like a reasonable richness feature | Schmidi's value is in the slide-convergence behavior, not scale variety. Deep scale libraries add UI surface area (search, browse, preview) with no payoff for the core mechanic. | 7 standard modes (ionian, dorian, phrygian, lydian, mixolydian, aeolian, locrian) is sufficient. Add pentatonic as a bonus. |
| Auto-calculated track count based on swell timing | Mathematically elegant — let the system decide optimal N tracks | HIGH complexity math (depends on swell timing, note range, scale snapping, convergence character). High risk of confusing behavior without manual override. | Manual track count with a sensible default (2 tracks). Auto-calculation is explicitly a v2 feature after core works. |
| Full ADSR per-track (independent attack/decay per voice) | More control = better | Per-track ADSR multiplies UI complexity by N tracks. The convergence mechanic already implies shared envelope behavior (all tracks swell toward targets at the same rate). | One shared ADSR for all slide tracks. The anchor "solid" track gets its own ADSR if differentiation is needed. |

---

## Feature Dependencies

```
Key + Mode Selector
    └──requires──> Diatonic Chord Grid
                       └──requires──> Preset Chord Progressions (chord math must exist first)
                       └──requires──> Scale-Snapped Glissando (must know current scale degrees)

Waveform Selector + ADSR Envelope
    └──requires──> Polyphonic Oscillator Engine (multi-voice)
                       └──requires──> Per-Track Volume + Global Volume
                       └──requires──> Glide / Portamento (pitch ramping per voice)

Glide / Portamento
    └──requires──> Polyphonic Oscillator Engine
    └──enables──> Slide Mode (the slide mode is glide applied continuously and driven by the convergence engine)

Slide Mode
    └──requires──> Glide / Portamento
    └──requires──> Convergence Engine (pitch target calculation, timing math)
    └──enhances──> Volume Swell on Convergence (requires knowing current pitch vs target pitch distance)

Volume Swell on Convergence
    └──requires──> Convergence Engine (must know pitch proximity in real-time)
    └──requires──> Per-Track GainNode (to modulate volume independently per track)

Radial Convergence Visualization
    └──requires──> Convergence Engine (pitch positions needed for visual position)
    └──conflicts──> Waveform Trace Visualization (two modes, mutually exclusive views, shared canvas)

Waveform Trace Visualization
    └──requires──> AnalyserNode per track (Web Audio API)
    └──conflicts──> Radial Convergence Visualization (same canvas, mode-switched)

Configurable Slide Character (eerie vs bloom)
    └──requires──> Convergence Engine (changes interpolation strategy)

Configurable Convergence Behavior (restart/hold/cycle)
    └──requires──> Convergence Engine (post-convergence state transitions)

Configurable Pre-Press Behavior (silent/drone/ambient)
    └──requires──> Polyphonic Oscillator Engine (tracks must exist before chord is selected)

Scale-Snapped Glissando
    └──requires──> Key + Mode Selector (must know active scale)
    └──requires──> Glide / Portamento (snapping applied to pitch steps, not to continuous slide)
```

### Dependency Notes

- **Convergence Engine is the load-bearing component**: Slide mode, volume swell, visualization (radial), and configurable behaviors all depend on it. Build this before building any of those features.
- **Key + Mode Selector must precede chord grid and scale-snap**: Scale-snapped glissando requires knowing current scale degrees in Hz.
- **Polyphonic oscillator engine is the foundation**: ADSR, waveform, volume, and glide all layer onto it. Get per-voice oscillators working with gain and pitch control before anything else.
- **Radial visualization conflicts with waveform trace visualization**: They share the canvas. Implement as a toggle; build radial first (it directly represents the convergence mechanic, lower implementation risk).
- **AnalyserNode per track is required for waveform trace**: This is an additional Web Audio node per track — budget for it in the oscillator engine design.

---

## MVP Definition

### Launch With (v1)

Minimum to validate the core concept: does the slide-convergence mechanic feel interesting as an instrument?

- [ ] Polyphonic oscillator engine with waveform selector (sine/square/sawtooth/triangle) and shared ADSR — makes sound
- [ ] Key + mode selector generating diatonic chord grid — gives harmonic structure
- [ ] Synth mode: click chord buttons to play chord — traditional entry point that proves audio engine works
- [ ] Slide mode: N tracks (default 2, manual slider) continuously gliding toward current chord target — core mechanic
- [ ] Volume swell on convergence (proximity-based amplitude per track) — the "emerging" feel that defines the instrument
- [ ] Radial convergence visualization as primary UI (60fps) — the visual experience is part of the instrument
- [ ] Preset chord progressions (I-IV-V-I, ii-V-I, I-V-vi-IV) — lets users play without knowing music theory
- [ ] Per-track volume sliders + master volume — basic balance control

### Add After Validation (v1.x)

Features that extend the instrument once the core mechanic is confirmed to work and feel good.

- [ ] Scale-snapped glissando toggle — adds a melodic character option (lower algorithmic risk now that pitch calculation exists)
- [ ] Configurable slide character (eerie vs bloom) — allows instrument personality tuning
- [ ] Configurable convergence behavior (restart / hold / cycle) — changes how the instrument "breathes"
- [ ] Configurable pre-press behavior (silent / drone / ambient) — instrument personality before a chord is selected
- [ ] Waveform trace visualization mode — second visual lens on the convergence
- [ ] One "solid" anchor track alongside slide tracks — harmonic grounding option

### Future Consideration (v2+)

Features to defer until the v1 instrument has been used and understood.

- [ ] Auto-calculated track count (based on swell timing, scale snapping, note range bounds) — HIGH complexity math, validated design needed first
- [ ] Reverb as optional post-processing (single ConvolverNode, no chain) — only if it provably enhances rather than masks convergence
- [ ] Additional modes beyond the 7 standard (pentatonic, chromatic, exotic) — only if users want harmonic variety

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Polyphonic oscillator engine (waveform + ADSR) | HIGH | MEDIUM | P1 |
| Diatonic chord grid (key + mode selector) | HIGH | LOW | P1 |
| Synth mode (click-to-play chords) | HIGH | LOW | P1 |
| Slide mode + convergence engine | HIGH | HIGH | P1 |
| Volume swell on convergence | HIGH | HIGH | P1 |
| Radial convergence visualization (60fps) | HIGH | HIGH | P1 |
| Preset chord progressions | HIGH | LOW | P1 |
| Per-track + master volume | MEDIUM | LOW | P1 |
| Scale-snapped glissando | MEDIUM | MEDIUM | P2 |
| Configurable slide character | MEDIUM | MEDIUM | P2 |
| Configurable convergence behavior | MEDIUM | MEDIUM | P2 |
| Configurable pre-press behavior | MEDIUM | MEDIUM | P2 |
| Waveform trace visualization mode | MEDIUM | HIGH | P2 |
| Solid anchor track | LOW | LOW | P2 |
| Auto track count calculation | LOW | HIGH | P3 |
| Reverb (single ConvolverNode) | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

Schmidi's slide-convergence mechanic has no direct competitor. Comparisons are drawn from adjacent product categories.

| Feature | HiChord (chord controller) | Scaler 3 (chord/theory tool) | ChordFlow (progression player) | Schmidi Approach |
|---------|---------------------------|------------------------------|-------------------------------|------------------|
| Diatonic chord generation | Yes (7 buttons, any key) | Yes (2,000+ scales, genre presets) | Yes (scale-aware chord suggestions) | Yes — 7 modes, 12 keys, clean grid |
| Chord triggering | Button press, polyphonic | DAW integration, MIDI | Button press, polyphonic | Button press (synth mode) + continuous slide (slide mode) |
| Portamento / glide | No | No | No | Core mechanic — continuous, convergence-targeted |
| Volume swell on pitch proximity | No | No | No | Core differentiator — proximity drives amplitude |
| Audio visualization | No | No | No | Primary UI — radial convergence + waveform trace views |
| ADSR control | Basic (HiChord hardware) | Via DAW | No | Shared ADSR configurable per mode |
| Preset progressions | No | 500+ factory presets | Built-in progressions | Common progressions (I-IV-V-I, ii-V-I, etc.) |
| MIDI output | Yes (hardware) | Yes | Yes | Out of scope v1 |
| Waveform selection | Fixed (DSP engine) | Via host synth | No | sine/square/sawtooth/triangle |
| Standalone desktop app | Hardware device | VST/AU only | iOS/macOS | Electron desktop, standalone |

**Key insight:** No competitor combines real-time pitch gliding with proximity-based amplitude with visualization as primary UI. The convergence mechanic is genuinely novel in this combination.

---

## Sources

- [UVI Falcon 2026 — chord generator, synthesis engines](https://synthanatomy.com/2025/10/uvi-falcon-2026.html) — MEDIUM confidence
- [Moog Music — Portamento vs Legato distinction](https://moogmusic-help.freshdesk.com/en/support/solutions/articles/69000840667-synthesis-101-what-is-the-difference-between-legato-and-portamento-) — HIGH confidence (official Moog documentation)
- [Attack Magazine — Legato, Glide, Slide, Portamento](https://www.attackmagazine.com/technique/passing-notes/legato-synths-glide-slide-portamento/) — MEDIUM confidence
- [Sweetwater — Portamento definition and controls](https://www.sweetwater.com/insync/portamento/) — MEDIUM confidence (authoritative music tech publication)
- [MasterClass — ADSR Envelope explained](https://www.masterclass.com/articles/adsr-envelope-explained) — MEDIUM confidence
- [Integraudio — Chord generator plugins 2025](https://integraudio.com/best-chord-generator-plugin/) — MEDIUM confidence
- [AudioCipher — Best chord progression generators 2025](https://www.audiocipher.com/post/chord-generator) — MEDIUM confidence
- [MDN Web Docs — Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) — HIGH confidence (official specification documentation)
- [fireship.io — Web Audio API introduction](https://fireship.io/web-audio-api) — MEDIUM confidence
- [Behringer DEEPMIND 12D — polyphonic glissando feature](https://deeptonemusic.com.au/products/behringer-deepmind-12d-desktop-polyphonic-synth) — MEDIUM confidence (product documentation)
- [HiChord — chord mapping + ADSR + diatonic buttons](https://hichord.shop/) — MEDIUM confidence (product documentation)
- [GitHub/synthviz — dual oscillator polyphonic synthesizer + visualizer](https://github.com/joetessy/synthviz) — MEDIUM confidence (open source reference)
- [MusicRadar — best synthesizers 2026](https://www.musicradar.com/news/best-synthesizers) — MEDIUM confidence
- [ChordFlow App Store — chord progression player](https://apps.apple.com/us/app/chordflow/id1219789464) — MEDIUM confidence

---

*Feature research for: desktop synthesizer instrument (chord-based, glissando/convergence mechanics)*
*Researched: 2026-02-18*
