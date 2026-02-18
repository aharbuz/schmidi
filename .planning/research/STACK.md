# Stack Research

**Domain:** Desktop synthesizer instrument (Electron + Web Audio API)
**Researched:** 2026-02-18
**Confidence:** MEDIUM-HIGH (core stack HIGH; peripheral library choices MEDIUM)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Electron | ^39.x (latest stable) | Desktop shell, OS integration, window management | Current stable as of Feb 2026 (Chromium 142, Node 22, V8 14.2). Provides Chromium's full Web Audio API implementation in a native desktop context with GPU-accelerated rendering. Only supported line for Web Audio desktop apps without using native audio APIs. |
| Web Audio API | Browser-native (no version) | Real-time audio synthesis, pitch manipulation, volume automation | Built into Chromium (Electron's renderer). The AudioContext, OscillatorNode, GainNode, AnalyserNode, and AudioWorklet form the complete synthesis and analysis primitives. No install required. |
| Tone.js | ^15.2.7 (npm latest) | Higher-level synthesis abstractions: oscillators, envelopes, portamento, polyphony, scheduling | Tone.js wraps Web Audio API with musician-friendly primitives. The `rampTo()` / `exponentialRampTo()` Signal API maps directly to Schmidi's pitch-glide "slide mode". PolySynth handles multi-track voice allocation automatically. Portamento is a first-class Synth property. |
| TypeScript | ^5.x | Type safety across main + renderer + preload | Electron's multi-process architecture (main, renderer, preload) benefits heavily from shared typed interfaces. Prevents common IPC marshalling bugs. electron-vite ships TypeScript support out of the box. |
| Vite (via electron-vite) | ^5.0 (electron-vite v5.0) | Build tooling, HMR during development, ES module bundling | electron-vite is the standard build tool for Electron in 2025/2026. Provides a single config point for main process, preload scripts, and renderer. HMR works in the renderer without full reload — critical for UI iteration on a synth instrument. Requires Node 20.19+ or 22.12+. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Tone.js PolySynth | (bundled in tone@^15) | Polyphonic voice management for the multi-track slide mode | Use for all synthesis voices. PolySynth handles voice allocation and disposal automatically — no manual pooling needed. |
| Canvas 2D API | Browser-native | Real-time visualization: waveform trace view, radial convergence view | For Schmidi's 2-view visualization. Canvas 2D hits 60fps comfortably for ~100–500 data points (the scale needed for pitch-track paths and frequency data). AnalyserNode feeds data into requestAnimationFrame draw loops. Use this before reaching for WebGL. |
| AnalyserNode | Browser-native (Web Audio API) | Extracts real-time frequency and time-domain data for visualization | `getFloatTimeDomainData()` for waveform trace view; `getByteFrequencyData()` for frequency magnitude. Connect one AnalyserNode per synth voice to track individual sliding pitches in the visualization. |
| Zustand | ^5.x | UI state management (active chords, mode toggle, track volumes, UI settings) | Zustand is the 2025 consensus pick for React + Electron apps. Lightweight, no boilerplate, works cleanly in the renderer process. Does not require cross-process state sync (audio state lives in audio graph, not React). |
| Tailwind CSS | ^4.x | Utility-first styling for the instrument UI | Minimal CSS overhead for a button-heavy synth UI. Pairs well with Vite. Alternative: CSS Modules are fine too — Tailwind is optional if the UI is simple HTML. |
| @electron-toolkit/preload | ^3.x | Convenience wrapper for exposing safe IPC stubs in preload scripts | Removes boilerplate for exposing `ipcRenderer`, `webFrame`, and `process` through `contextBridge`. Saves setup time without sacrificing security principles. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| electron-vite | Build tool + dev server | Run `npx electron-vite` or add as project dependency. Single config file for all three entry points (main, preload, renderer). Targets Electron 36–39 in v4/v5. |
| Electron Forge (optional) | Packaging and distribution | Use only if distribution (macOS .dmg, Windows .exe) is needed. Electron Forge integrates with electron-vite via `@electron-forge/plugin-vite`. For a local-only vibes project, Forge adds complexity with minimal payoff. |
| ESLint + @typescript-eslint | Linting | Standard TypeScript linting. Catches common async/IPC bugs in preload scripts. |
| Vitest | Unit testing | Vite-native test runner. Use for pure synthesis logic and utility functions. Browser/audio API testing is impractical to unit test — test logic, not audio nodes. |

---

## Installation

```bash
# Scaffold with electron-vite (recommended)
npm create electron-vite@latest schmidi -- --template vanilla-ts

# Or with React renderer (if React is chosen):
npm create electron-vite@latest schmidi -- --template react-ts

# Core audio library
npm install tone

# UI state (if using React)
npm install zustand

# Preload utilities
npm install @electron-toolkit/preload

# Dev dependencies (already included in electron-vite template)
npm install -D electron typescript vite @types/node
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| electron-vite | Electron Forge + @electron-forge/plugin-vite | Use Forge if you need auto-update (Squirrel), code signing, or multi-platform publishing pipelines. Forge's Vite plugin is still marked experimental for renderer HMR. For a vibes project without distribution needs, electron-vite is simpler and more stable. |
| Tone.js | Raw Web Audio API (no library) | Use raw Web Audio if you need extremely fine-grained control, AudioWorklet custom DSP, or want to avoid the ~80KB bundle. For Schmidi's pitch-glide mechanic, Tone.js Signal `rampTo()` saves significant manual implementation. Not worth going raw here. |
| Canvas 2D | WebGL / Three.js / PixiJS | Use WebGL if visualizing tens of thousands of vertices simultaneously, or needing 3D. Schmidi's radial convergence and waveform trace views operate on hundreds of points at 60fps — Canvas 2D handles this cleanly. Canvas starts fast (~15ms), WebGL costs ~40ms initialization. Only reach for WebGL if Canvas profiling shows frame drops. |
| Zustand | Jotai | Use Jotai if state is highly granular and atomic (per-note fine-grained reactivity). Zustand's centralized store is easier to reason about for a synth UI with a small number of distinct state buckets (mode, active chord, track volumes). |
| TypeScript | JavaScript (vanilla) | Use vanilla JS only for quick throwaway prototype. TypeScript pays for itself immediately in a multi-process Electron app where IPC message shapes need to be consistent across processes. |
| React (renderer) | Vanilla HTML / No framework | For a button-heavy UI with a canvas visualization, vanilla HTML is viable and has zero bundle overhead. React adds a component model that helps manage the chord button grid and mode toggles. Schmidi's UI is simple enough that either works — lean vanilla if you want zero framework overhead, React if you want component reuse. The recommended electron-vite template supports both. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| naudiodon / PortAudio | Native Node audio I/O is unnecessary — Web Audio API in Electron's Chromium renderer provides the audio graph, mixing, and output. naudiodon adds native build complexity, OS-specific binaries, and Node-Gyp pain with no benefit for synthesized (not recorded) audio. | Web Audio API (native in Chromium) |
| Web MIDI API for chord triggering | Schmidi explicitly uses mouse/keyboard interaction only. Adding MIDI complicates the input model with no stated requirement. | Keyboard events + mouse events directly |
| Redux / Redux Toolkit | Excessive boilerplate for a UI this size. Schmidi has ~5 distinct state concepts (mode, active chord, track count, volume per track, display mode). Redux is appropriate at 50+ state slices, not 5. | Zustand |
| `nodeIntegration: true` | Disabling context isolation is a critical security anti-pattern per Electron's own docs. Context isolation has been the default since Electron 12. Enabling nodeIntegration in renderer breaks this. | contextBridge + preload scripts for any Node access |
| Webpack (via Electron Forge's webpack template) | Slower builds, less ergonomic HMR, larger config footprint than Vite. The Forge Vite plugin is the modern path when using Forge. Forge's webpack template is legacy at this point. | Vite via electron-vite |
| Older Electron versions (< 37) | Electron's support policy covers only the latest 3 stable major releases. As of Feb 2026, supported versions are 37, 38, and 39. Using older versions means no security patches. | Electron ^39.x |
| OffscreenCanvas for visualization | Adds complexity (Worker message passing for draw calls) with negligible gains at Schmidi's visualization complexity. Only beneficial when the main thread is blocked, which Canvas + rAF handles fine. | Canvas 2D + requestAnimationFrame on main thread |

---

## Stack Patterns by Variant

**If building with React renderer (recommended for component reuse):**
- Use `npm create electron-vite@latest -- --template react-ts`
- Add Zustand for mode/chord/track UI state
- Use React refs to attach Canvas elements; draw loop runs outside React's render cycle
- Because: React manages declarative UI state; Canvas is imperative and should not be re-rendered by React's reconciler

**If building with vanilla HTML renderer (minimal overhead):**
- Use `npm create electron-vite@latest -- --template vanilla-ts`
- Manage UI state manually or with a tiny reactive utility (e.g., `@preact/signals-core` standalone)
- Because: Schmidi's UI surface (chord buttons, mode toggle, canvas) is small enough for DOM manipulation without a framework

**For slide mode audio (the core Schmidi mechanic):**
- Create one `Tone.Oscillator` per sliding track
- Use `oscillator.frequency.rampTo(targetHz, glideSeconds)` for smooth pitch transitions
- Use `oscillator.volume.rampTo(targetDb, rampSeconds)` for proximity-based swell
- Connect each oscillator to its own `AnalyserNode` before `Tone.getDestination()` for per-track visualization data
- Because: Tone.js Signal rampTo is sample-accurate and maps directly to the described mechanic

**For visualization loop:**
```typescript
// In renderer, after audio setup:
function drawFrame() {
  const data = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(data);
  // draw to canvas using data
  requestAnimationFrame(drawFrame);
}
requestAnimationFrame(drawFrame);
```
- Do NOT throttle the rAF loop — let it run at display refresh rate
- Do NOT read AnalyserNode data on a separate Worker — the read is cheap and synchronous

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| electron@^39.x | Node 22.20.0, Chromium 142 | Electron 39 is current stable (Feb 2026). Chromium 142 ships full Web Audio API including AudioWorklet. |
| electron-vite@^5.0 | Electron 36–39, Vite ^5.0, Node 20.19+ / 22.12+ | electron-vite v4 targets Electron 36–37; v5 targets 38–39. Use v5 with Electron 39. |
| tone@^15.x | Any modern browser / Chromium (Electron renderer) | Tone.js 15 is the npm `latest` tag. GitHub releases only show 14.7.39 as tagged, but 15.2.7+ is published to npm and referenced in official docs. Verify with `npm show tone version` before installing. |
| zustand@^5.x | React 18+ | Zustand v5 dropped legacy React support. Compatible with React 18+ which is current. |
| @electron-toolkit/preload@^3.x | Electron ^28+ | Provides safe preload stubs. Works with contextIsolation: true (required). |

---

## Electron Security Configuration (Required)

For any Electron app using Web Audio in the renderer, use this `BrowserWindow` configuration:

```typescript
const mainWindow = new BrowserWindow({
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,       // REQUIRED — default since Electron 12
    nodeIntegration: false,        // REQUIRED — never enable in renderer
    sandbox: true,                 // Recommended for renderer isolation
  }
});
```

Web Audio API does not require Node.js access in the renderer — it runs entirely in the Chromium environment. No IPC bridging is needed for audio synthesis itself.

---

## Sources

- `/websites/electronjs` (Context7, High reputation) — IPC, contextBridge, preload patterns, security guidelines
- https://www.electronjs.org/blog/electron-34-0 — Electron 34 release notes (Jan 2025), versions confirmed
- https://releases.electronjs.org/release — Electron 39.6.0 current stable confirmed (Feb 2026)
- `/tonejs/tone.js` (Context7, High reputation, score 84) — rampTo, Signal API, PolySynth, portamento
- https://github.com/Tonejs/Tone.js/releases — 14.7.39 last GitHub-tagged release; 15.x available on npm
- https://libraries.io/npm/tone — tone 15.2.7 confirmed on npm (dev branch at 15.4.0)
- https://electron-vite.org/guide/ — electron-vite v5.0.0, Node requirements, project structure
- https://www.electronforge.io/templates/vite-+-typescript — Electron Forge Vite plugin (experimental status noted)
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API — AnalyserNode visualization patterns (MDN, authoritative)
- https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/AudioContext — latencyHint "interactive" for low-latency synthesis (MDN)
- https://www.svggenie.com/blog/svg-vs-canvas-vs-webgl-performance-2025 — Canvas 2D vs WebGL benchmarks 2025 (MEDIUM confidence — single source)
- https://www.electronjs.org/docs/latest/tutorial/performance — rAF and idle scheduling in Electron renderer

---

*Stack research for: Schmidi — Electron + Web Audio API desktop synthesizer*
*Researched: 2026-02-18*
