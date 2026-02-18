# Project Research Summary

**Project:** Schmidi
**Domain:** Electron desktop synthesizer — chord-based instrument with glissando/convergence mechanics
**Researched:** 2026-02-18
**Confidence:** MEDIUM-HIGH

## Executive Summary

Schmidi is a genuinely novel desktop synthesizer instrument: its core value is not clicking to play chords but watching and hearing multiple pitch tracks continuously glide through pitch space, converging simultaneously on chord tones as they are selected. No existing chord-based instrument (HiChord, Scaler, ChordFlow) implements continuous polyphonic glissando with proximity-based amplitude swells as the primary interaction paradigm. The recommended implementation path is Electron + Web Audio API via Tone.js, scaffolded with electron-vite, React renderer, and Zustand for UI state. The stack is well-understood and entirely within Chromium's renderer process — no native audio binaries, no IPC-crossing audio data.

The central architectural insight from research is that slide mode requires _persistent oscillators_, not the fire-and-forget OscillatorNode pattern taught in most Web Audio tutorials. Frequency and gain must be continuously modulated via AudioParam scheduling, and all timing must be anchored to `audioContext.currentTime` — not JavaScript timers. The convergence engine (the component that calculates ramp targets and durations so N tracks arrive at chord notes simultaneously) is the load-bearing module on which slide mode, volume swell, and visualization all depend. It must be designed first, with correct AudioParam lifecycle patterns built in from the start, because retrofitting the persistent-oscillator pattern after the fact is a high-cost recovery.

The primary risks are audio-specific: AudioParam value readback failure mid-ramp (the API hides the real-time value during automation), click/pop artifacts from abrupt parameter transitions, and AudioContext autoplay suspension on app launch. Each of these has a known solution (manual pitch-state tracking, `cancelAndHoldAtTime`, the Electron autoplay switch) but must be designed in, not patched in. The visualization and UI concerns are straightforward by comparison — Canvas 2D at 60fps handles the visualization scale comfortably, and React + Zustand covers the UI state surface without ceremony.

---

## Key Findings

### Recommended Stack

The stack is focused on Chromium's built-in audio capabilities. Electron 39.x hosts the app; the renderer process runs all audio and visualization via Web Audio API (built into Chromium, no install). Tone.js wraps Web Audio with musician-friendly abstractions — specifically, its `Signal.rampTo()` API maps directly to Schmidi's pitch-glide mechanic, and `PolySynth` handles multi-voice allocation. electron-vite (v5.0) provides the build tooling with HMR for the renderer, which is valuable when iterating on a visual instrument UI. Zustand manages UI-only state (mode, active chord, track count, volume per track); audio state lives in the audio graph and a lightweight `TrackStateStore` plain object, never in React state.

**Core technologies:**
- **Electron ^39.x:** Desktop shell, OS integration, Chromium renderer — the only practical path to Web Audio on desktop without native audio APIs
- **Web Audio API (browser-native):** AudioContext, OscillatorNode, GainNode, AnalyserNode, AudioParam scheduling — complete synthesis and analysis stack, no install required
- **Tone.js ^15.2.7:** Musician-friendly abstractions over Web Audio; `rampTo()` for pitch glide, `PolySynth` for voice management, portamento as a first-class Synth property
- **electron-vite ^5.0:** Single-config build tool for main, preload, and renderer; HMR without full Electron restart
- **TypeScript ^5.x:** Essential for multi-process Electron architecture; shared typed interfaces prevent IPC marshalling bugs
- **React (renderer) + Zustand ^5.x:** UI component model for chord grid and controls; Zustand for lightweight UI state management

**What not to use:** naudiodon/PortAudio (unnecessary native complexity), Redux (overkill for ~5 state slices), `nodeIntegration: true` (security violation), multiple AudioContexts, Web MIDI API (out of scope).

### Expected Features

The Convergence Engine is the most important feature — every differentiating feature depends on it. The chord grid and oscillator engine are table stakes that must exist first. ADSR is expected by any synth user. Slide mode and the volume swell mechanic are the core differentiators that define Schmidi as a novel instrument. Visualization is not a bolt-on feature — it is the instrument face.

**Must have (table stakes):**
- Waveform selector (sine, square, sawtooth, triangle) — baseline oscillator palette
- Shared ADSR envelope — universal synthesizer expectation
- Key + mode selector generating diatonic chord grid — required for harmonic structure
- Polyphonic output — mandatory for chord instruments
- Volume control (global + per-track GainNode)
- Low-latency audio feedback (sub-50ms) — determines playability
- Glide/portamento — expected by users; also the foundation for slide mode

**Should have (Schmidi differentiators):**
- Slide mode: N persistent tracks continuously gliding toward chord targets simultaneously — the core mechanic
- Volume swell on convergence: proximity-based amplitude per track — defines the "arriving" feel
- Radial convergence visualization as primary UI — the instrument's visual identity
- Two-mode UI (synth mode / slide mode) — lowers the learning curve
- Preset chord progressions (I-IV-V-I, ii-V-I, I-V-vi-IV) — removes music theory barrier
- Configurable slide character (eerie vs bloom), convergence behavior (restart/hold/cycle), pre-press behavior
- Scale-snapped glissando toggle — melodic variant of the core mechanic
- Waveform trace visualization mode — second visual lens

**Defer to v2+:**
- Auto-calculated track count (high complexity math, validated design needed first)
- Reverb (only if it demonstrably enhances, not masks, convergence)
- MIDI I/O, audio recording/export, effects chain, VST/AU format — all explicitly out of scope

### Architecture Approach

The architecture cleanly separates Electron's process boundary (main process: window lifecycle only, no audio data), the audio engine (TypeScript classes in the renderer: `AudioContext` singleton, `TrackManager`, `SynthTrack`, `ChordScheduler`, `AnalyserNode`), and the React UI layer (components call imperative audio engine methods; never hold audio node references in React state). The visualizer reads from two sources per frame: `AnalyserNode` for raw PCM waveform shape, and a lightweight `TrackStateStore` plain object for per-track semantic state (frequency, gain, target note). No audio data crosses the Electron IPC boundary.

**Major components:**
1. **`audioContext.ts` (singleton):** One AudioContext for the entire app lifetime, created on first user gesture and resumed if suspended
2. **`SynthTrack.ts`:** One persistent oscillator+gain voice per slide track; exposes `setTargetFrequency` and `setGain` via AudioParam scheduling with `cancelAndHoldAtTime` guard
3. **`TrackManager.ts`:** Owns N SynthTrack instances; coordinates voice lifecycle, writes to TrackStateStore on every schedule call
4. **`ChordScheduler.ts`:** Translates chord selection into AudioParam ramp schedules; owns the convergence timing math; single clock source is `audioContext.currentTime`
5. **`TrackStateStore`:** Lightweight plain object; TrackManager writes target freq/gain after scheduling; visualizer reads per frame — avoids querying AudioParam values during ramps
6. **`VisualizerCanvas.tsx`:** Canvas element + `requestAnimationFrame` loop; draws from TrackStateStore + AnalyserNode; never drives audio timing
7. **`radialView.ts` / `waveformView.ts`:** Pure draw functions accepting canvas context + data arrays; two mutually exclusive visualization modes sharing the same canvas

### Critical Pitfalls

1. **AudioParam value readback fails mid-ramp** — `oscillator.frequency.value` returns the last JS-assigned value, not the real-time automation value. Avoid: track ramp state manually in JS (`startValue`, `endValue`, `startTime`, `endTime`) and interpolate on re-schedule. Use `cancelAndHoldAtTime()` not `cancelScheduledValues()`.

2. **Oscillator single-use constraint causes architecture lock-in** — OscillatorNode.start() can only be called once; stop() permanently kills the node. Creating new oscillators per chord change produces clicks, gaps, and dangling nodes. Avoid: create N oscillators at app startup, run them forever, silence via GainNode (gain=0). This must be the foundation, not a retrofit.

3. **AudioContext suspended on app launch** — Electron's Chromium enforces autoplay policy; AudioContext starts suspended. Avoid: add `app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')` in main.ts before BrowserWindow creation, OR check `audioContext.state === 'suspended'` and call `resume()` on first user gesture.

4. **Click/pop artifacts from abrupt AudioParam changes** — Direct `gain.value = 0` assignment or unanchored ramps produce audible transients. Avoid: always call `setValueAtTime(currentValue, now)` before ramps to anchor the queue; use `setTargetAtTime(0.0001, now, 0.015)` for fade-to-silence; never assign directly to live AudioParam values in the rAF loop.

5. **JS timer drift breaks convergence timing** — `setTimeout`/`setInterval` drift under load; `Date.now()` for scheduling math misaligns audio and visual clocks. Avoid: use `audioContext.currentTime` exclusively for all scheduling math; use setTimeout only as a heartbeat, never as a timing source; read `audioContext.currentTime` in rAF to drive visual interpolation.

---

## Implications for Roadmap

Based on the dependency graph (Convergence Engine is load-bearing for slide mode, volume swell, and visualization; polyphonic oscillator engine underpins everything), the following phase structure is strongly suggested:

### Phase 1: Electron Shell + Audio Foundation

**Rationale:** Nothing else can be built without a working AudioContext in Electron and persistent oscillators with correct AudioParam patterns. This phase eliminates the two highest-recovery-cost pitfalls (oscillator architecture lock-in, AudioContext suspension) before any feature code is written.

**Delivers:** Running Electron app with electron-vite scaffold; singleton AudioContext with autoplay policy configured; N persistent SynthTracks with GainNode gating; verified `setTargetFrequency` and `setGain` with `cancelAndHoldAtTime` anti-click patterns.

**Addresses:** Table-stakes audio output, waveform selector, ADSR envelope skeleton.

**Avoids:** Pitfall 2 (oscillator single-use), Pitfall 3 (AudioContext suspended), Pitfall 4 (click artifacts from abrupt changes).

**Research flag:** Standard patterns — electron-vite scaffold and Web Audio singleton are well-documented. No additional research phase needed.

---

### Phase 2: Chord Engine + Synth Mode

**Rationale:** Proves the audio engine works with real musical output before slide mode complexity is added. Key + mode selector and diatonic chord grid are low-complexity features with clear implementations. Synth mode (click-to-play) validates that the oscillator engine handles polyphonic playback with correct ADSR envelopes — the same engine slide mode will extend.

**Delivers:** Key + mode selector; diatonic chord grid (12 keys × 7 modes); synth mode chord playback with ADSR; preset chord progressions; per-track and master volume; basic chord panel UI.

**Addresses:** All P1 table-stakes features except slide mode and visualization.

**Avoids:** Pitfall 4 (click artifacts in traditional mode require correct ADSR from the start).

**Research flag:** Standard patterns — diatonic chord math and ADSR scheduling are textbook Web Audio. No additional research phase needed.

---

### Phase 3: Convergence Engine + Slide Mode

**Rationale:** This is the core Schmidi differentiator and the highest-complexity implementation phase. The Convergence Engine must be designed before slide mode, volume swell, or visualization because all three depend on it. AudioParam state tracking (Pitfall 1) and single-clock-source principle (Pitfall 5) must be designed into the Convergence Engine, not added later.

**Delivers:** Convergence Engine (multi-track simultaneous arrival math using `audioContext.currentTime`); slide mode with N persistent tracks gliding to chord targets; volume swell on convergence (proximity-based GainNode automation); configurable track count (default 2); mode toggle (synth / slide).

**Addresses:** P1 differentiators: slide mode, volume swell, two-mode UI.

**Avoids:** Pitfall 1 (AudioParam readback), Pitfall 5 (timer drift), Pitfall 6 (excessive AudioParam events — schedule at 10-15Hz not per rAF frame).

**Research flag:** This phase warrants a `/gsd:research-phase` during planning. The convergence math (calculating per-track ramp durations so all tracks arrive simultaneously from different starting positions, respecting current mid-ramp state) has no direct documented reference implementation. The scheduling pattern itself is standard; the convergence geometry is not.

---

### Phase 4: Visualization

**Rationale:** Visualization reads from infrastructure built in Phase 3 (TrackStateStore, AnalyserNode). Building it after the Convergence Engine means visual state can be driven by real audio data rather than mocked values. The radial convergence view directly represents the core mechanic and should be built first; the waveform trace view is the second mode.

**Delivers:** `requestAnimationFrame` loop decoupled from audio timing; radial convergence visualization (orbs/lines mapped from TrackStateStore freq + gain); AnalyserNode tap on master bus; waveform trace visualization mode; canvas/mode toggle.

**Addresses:** P1 differentiator: radial convergence visualization. P2: waveform trace visualization.

**Avoids:** Pitfall 5 (visual timing must use `audioContext.currentTime`, not rAF timestamp, for interpolation); canvas overdraw anti-patterns (pre-allocate buffers, reuse paths).

**Research flag:** Standard patterns — MDN Canvas + Web Audio visualization patterns are authoritative and well-documented. No additional research phase needed.

---

### Phase 5: Instrument Personality + Polish

**Rationale:** Once the core mechanic works and feels playable, the configurability features extend it without changing the architecture. Scale-snapped glissando, slide character (eerie vs bloom), convergence behavior (restart/hold/cycle), and pre-press behavior are all state-machine variations on the Convergence Engine's interpolation strategy.

**Delivers:** Scale-snapped glissando toggle; configurable slide character (eerie vs bloom interpolation curves); configurable convergence behavior (restart/hold/cycle); configurable pre-press behavior (silent/drone/ambient); solid anchor track option.

**Addresses:** All P2 differentiators from FEATURES.md.

**Avoids:** No new pitfall categories — this phase is extending existing patterns.

**Research flag:** Standard extension of Phase 3 patterns. No additional research phase needed.

---

### Phase Ordering Rationale

- **Foundation before features:** AudioContext + persistent oscillators must be correct before anything musical is built. The recovery cost of retrofitting these patterns is HIGH.
- **Synth mode before slide mode:** Synth mode proves the polyphonic oscillator engine without the complexity of the Convergence Engine. A working musical instrument at Phase 2 exit is a testable milestone.
- **Convergence Engine before visualization:** Visualization reads from audio state. Building visualization against real audio data (not mocks) ensures the visual-audio relationship is accurate from the start.
- **Configurability last:** The personality features are variations on established patterns. Building them after the core mechanic is validated avoids over-engineering configurations for a mechanic that might need adjustment.

---

### Research Flags

**Needs `/gsd:research-phase` during planning:**
- **Phase 3 (Convergence Engine):** The math for simultaneously converging N tracks from arbitrary mid-ramp positions to N chord notes at a specified time has no standard reference implementation. The scheduling primitives are documented; the convergence geometry problem is not.

**Standard patterns — skip additional research:**
- **Phase 1:** electron-vite scaffold + Electron BrowserWindow security config are official documentation patterns
- **Phase 2:** Diatonic chord generation and ADSR scheduling are textbook Web Audio + music theory
- **Phase 4:** Canvas 2D + AnalyserNode visualization follows MDN official patterns exactly
- **Phase 5:** State machine extensions of Phase 3 patterns

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core technologies (Electron, Web Audio, Tone.js, electron-vite) verified against official docs and npm. Version compatibility confirmed. One note: Tone.js 15.x is npm-latest but not GitHub-tagged — verify with `npm show tone version` before install. |
| Features | MEDIUM | Table stakes and differentiators are clear. Competitor analysis is solid. Schmidi's specific slide-convergence paradigm has no direct precedent, so differentiator value is partially inferred. |
| Architecture | HIGH | Patterns sourced from MDN official docs, Chrome for Developers, Electron official docs. The `TrackStateStore` pattern for visualizer readback is inferred but well-reasoned; no direct counter-evidence found. |
| Pitfalls | MEDIUM-HIGH | Critical pitfalls (AudioParam readback, oscillator single-use, autoplay policy, click artifacts) are verified against MDN spec and canonical sources (Chris Wilson's "A Tale of Two Clocks"). Electron-specific autoplay behavior in 2025/2026 has partial LOW-confidence sourcing. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Convergence math implementation:** No reference implementation for simultaneous multi-track convergence from arbitrary mid-ramp positions exists in research. This is the primary open question. Flag for research-phase during Phase 3 planning, or prototype the math early in Phase 3 before committing to the full implementation.

- **Tone.js 15.x version verification:** GitHub releases only show 14.7.39 tagged; 15.x is published to npm but documentation coverage may be incomplete. Run `npm show tone version` and review changelog before finalizing the audio engine design.

- **Electron autoplay behavior on Windows vs macOS:** Research confirmed the pattern (`appendSwitch('autoplay-policy', 'no-user-gesture-required')`) but the LOW-confidence source for 2025/2026 Electron behavior means this should be integration-tested on both platforms in Phase 1.

- **Canvas performance at track counts above 4:** Research confirms Canvas 2D handles "hundreds of points at 60fps" but does not give a hard track-count threshold. Profile in Phase 4 with 8+ tracks to determine if layered canvases or reduced `fftSize` are needed before Phase 5.

---

## Sources

### Primary (HIGH confidence)
- MDN Web Audio API (official specification documentation) — AudioParam scheduling, AnalyserNode, autoplay best practices
- MDN Canvas API (official) — Canvas 2D visualization patterns, optimization
- Electron official docs (electronjs.org) — IPC, contextBridge, security, process model
- Chrome for Developers — AudioWorklet design patterns, autoplay policy
- Tone.js documentation via Context7 (score 84, high reputation) — rampTo, PolySynth, portamento
- electron-vite official docs (electron-vite.org) — v5.0 scaffold, Node requirements, project structure
- WebAudio spec issues #344 and #904 (github.com/WebAudio/web-audio-api) — AudioParam cancelScheduledValues value snap, memory pitfalls
- "A Tale of Two Clocks" (Chris Wilson, web.dev) — canonical Web Audio scheduling reference

### Secondary (MEDIUM confidence)
- Moog Music official docs — portamento vs legato distinction
- Sweetwater, Attack Magazine — synthesizer feature conventions
- AudioCipher, Integraudio — chord generator plugin landscape 2025
- SVGGENIE — Canvas 2D vs WebGL performance benchmarks 2025 (single source)
- alemangui.github.io — Web Audio click artifact analysis
- blog.szynalski.com — practitioner Web Audio gotchas (older; issues still apply)
- padenot.github.io — Web Audio performance notes (Gecko perspective)
- GitHub/synthviz — open source polyphonic synthesizer + visualizer reference

### Tertiary (LOW confidence)
- thecodersblog.com — Electron autoplay 2025 patterns (WebSearch only; needs validation)

---

*Research completed: 2026-02-18*
*Ready for roadmap: yes*
