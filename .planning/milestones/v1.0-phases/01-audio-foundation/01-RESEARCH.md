# Phase 1: Audio Foundation - Research

**Researched:** 2026-02-18
**Domain:** Electron desktop app with Web Audio API synthesis engine (persistent oscillators, ADSR envelopes, anti-click AudioParam patterns)
**Confidence:** HIGH

## Summary

Phase 1 delivers a running Electron app with 8 persistent oscillator voices, per-voice ADSR envelopes, global waveform selection, and AudioContext autoplay handling via a splash screen. The technical domain is well-understood: Web Audio API's AudioParam scheduling is the foundation for click-free audio, and the persistent-oscillator pattern (never stop/restart, gate with gain) is the established approach for continuous synth voices. Electron Forge with the Vite plugin provides the build tooling, though the Vite plugin is marked experimental as of v7.5.0 -- this is a known status, not a blocker, as it is the officially recommended path for new Vite-based Electron apps.

The biggest architectural decisions to get right on day one are: (1) the audio graph topology (8 oscillators -> per-voice GainNodes for ADSR -> master GainNode -> DynamicsCompressorNode -> destination), (2) always using AudioParam scheduling methods (never direct `.value` assignment on live params), and (3) anchoring all timing to `audioContext.currentTime`. These patterns are non-negotiable -- retrofitting them after the fact is a HIGH-cost refactor.

**Primary recommendation:** Build the audio engine as a standalone TypeScript module with zero React dependencies. React components call imperative methods on the engine. Keep the audio graph wired at startup and never tear it down during normal operation.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- 8 persistent oscillator voices, always running (gain set to 0 when silent)
- Global waveform selector -- all voices share one waveform type (sine, square, sawtooth, triangle). Per-voice waveform deferred to future phase
- Subtle detune per voice for analog warmth/thickness
- Both keyboard mapping and on-screen click buttons for triggering voices
- Voice buttons show animated feedback (glow/pulse reflecting envelope stage -- attack, sustain, release)
- Keyboard shortcut shown via tooltip on hover
- Per-voice envelope -- each voice has its own independent ADSR cycle
- 3-4 envelope presets with technical + evocative names: Pad (Drift), Pluck (Snap), Organ (Breathe), Strings (Bloom)
- ADSR values displayed numerically alongside controls (e.g. "A: 45ms")
- Live envelope curve preview canvas that updates in real-time as parameters are adjusted
- React + TypeScript with Tailwind CSS
- Waveform selector as icon buttons in a row (one per wave type)
- Audio status bar at bottom showing AudioContext state, sample rate, latency
- Visual reference: Vital synth -- dark, glowing accents, clean waveform displays
- Storybook for interactive component stories (only for interactive controls -- ADSR sliders, voice buttons, waveform selector, volume controls)
- Playwright configured for Electron app testing (full stack, not just renderer)
- Vitest for unit/integration tests
- Pre-commit hook: typecheck + lint (tests run at Claude's discretion during development)
- ESLint + Prettier for linting/formatting
- Electron Forge as build tooling
- Frameless window with custom title bar
- Resizable with minimum size (~800x500)
- Splash/welcome screen with Schmidi logo, version, tagline, and start button -- unlocks AudioContext on click
- Remember window position and size between launches
- macOS primary target, Windows deferred
- Dev tools available but hidden (Cmd+Opt+I)
- Custom app/dock icon, no badge

### Claude's Discretion
- Test pitch assignment for the 8 voices (sensible musical defaults)
- Ramp type per parameter (exponential vs linear) based on Web Audio best practices
- Master gain/compressor approach for mix safety
- Default ADSR values for each preset
- Envelope curve display fidelity (exponential vs simplified)
- Volume control style (slider, fader, or knob)
- Small oscilloscope/waveform display inclusion
- UI layout arrangement (grouped sections)
- Visual tone (dark aesthetic direction)
- Menu bar approach for frameless window

### Deferred Ideas (OUT OF SCOPE)
- Per-voice waveform selection -- future phase if needed
- Windows platform testing -- deferred, build should be cross-platform but only verified on macOS
- Custom app icon design -- needs to be created, placeholder acceptable for Phase 1
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUDIO-01 | User hears sound through polyphonic oscillator engine supporting multiple simultaneous voices | 8 persistent OscillatorNodes always running, gated by per-voice GainNodes. Tone.js is NOT needed for Phase 1 -- raw Web Audio API is sufficient and preferred for the persistent-oscillator pattern. Polyphony is implicit: all 8 oscillators can produce sound simultaneously. |
| AUDIO-02 | User can select oscillator waveform (sine, square, sawtooth, triangle) | `OscillatorNode.type` property accepts `'sine'`, `'square'`, `'sawtooth'`, `'triangle'`. Changing `.type` on a running oscillator is instantaneous and click-free (no discontinuity because the Web Audio thread handles the transition). Global selector updates all 8 oscillators. |
| AUDIO-03 | User can shape amplitude with ADSR envelope (attack, decay, sustain, release controls) | Per-voice ADSR via GainNode AudioParam scheduling: `setValueAtTime` + `linearRampToValueAtTime` for attack, `setTargetAtTime` for exponential decay, hold at sustain level, `setTargetAtTime` or `linearRampToValueAtTime` for release. 4 presets with editable values. Anti-click requires anchoring every ramp with `setValueAtTime(currentValue, now)` before scheduling. |
| AUDIO-04 | Audio feedback is immediate (sub-50ms latency) | AudioContext created with `{ latencyHint: 'interactive' }` targets lowest latency. Persistent oscillators eliminate node creation overhead. AudioParam scheduling is synchronous (methods return immediately, audio thread executes at sample rate). Sub-50ms is achievable on macOS with default audio output. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Electron | ^39.x | Desktop shell, Chromium runtime for Web Audio API | Current stable (Feb 2026). Chromium 142, Node 22. Provides full Web Audio API in native desktop context. Source: [Electron Releases](https://releases.electronjs.org/) |
| Electron Forge | ^7.11.x | Build tooling, packaging, dev server | User decision. Official Electron build tool. `@electron-forge/cli@7.11.1` is current npm latest. Vite plugin is experimental but is the recommended path for Vite projects. Source: [npm @electron-forge/cli](https://www.npmjs.com/package/@electron-forge/cli) |
| @electron-forge/plugin-vite | ^7.x | Vite integration for Forge (main, preload, renderer builds) | Pairs Forge with Vite for HMR in renderer. Experimental status since v7.5.0 -- means API may change in minor versions, not that it is broken. Source: [Electron Forge Vite Plugin docs](https://www.electronforge.io/config/plugins/vite) |
| React | ^18.x or ^19.x | UI framework for renderer | User decision. Component model for chord buttons, ADSR controls, voice buttons. Source: Context7 Electron Forge React guide |
| TypeScript | ^5.x | Type safety across main + renderer + preload | User decision. Prevents IPC marshalling bugs. `"jsx": "react-jsx"` in tsconfig. Source: Context7 Electron Forge React+TS guide |
| Tailwind CSS | ^4.x | Utility-first styling | User decision. Minimal overhead for synth UI. Source: Prior stack research |
| Web Audio API | Browser-native | Real-time audio synthesis | No library needed. AudioContext, OscillatorNode, GainNode, DynamicsCompressorNode, AnalyserNode are all built into Chromium. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| electron-window-state | ^5.x | Save/restore window position and size between launches | User decided on window state persistence. Drop-in solution: `windowStateKeeper({ defaultWidth, defaultHeight })` + `.manage(win)`. Source: [electron-window-state GitHub](https://github.com/mawie81/electron-window-state) |
| Zustand | ^5.x | UI state management (ADSR values, active preset, waveform selection, voice states) | Lightweight store for React. Audio engine state lives outside React; Zustand holds only UI-visible state. Source: Prior stack research |
| @electron-toolkit/preload | ^3.x | Preload script utilities for contextBridge | Removes IPC boilerplate. Source: Prior stack research |

### Dev Dependencies
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Storybook (@storybook/react-vite) | ^9.x | Interactive component stories for ADSR sliders, voice buttons, waveform selector, volume controls | Storybook 9 is current (9.1.4 on npm). `@storybook/react-vite` framework integrates with Vite. Runs standalone against renderer components -- does NOT need Electron runtime. Source: [Storybook React Vite docs](https://storybook.js.org/docs/get-started/frameworks/react-vite) |
| Playwright (@playwright/test) | ^1.58.x | Electron app end-to-end testing | `_electron.launch()` API launches the full Electron app. Experimental Electron support but functional. Tests can evaluate in main process context, interact with renderer windows. Source: [Playwright Electron docs](https://playwright.dev/docs/api/class-electron) |
| Vitest | ^4.x | Unit/integration tests for audio engine logic, utility functions | Vitest 4.0.18 is current. Vite-native test runner. Use for pure TypeScript logic (envelope calculations, frequency math, state management). Do NOT unit test Web Audio nodes -- test the scheduling logic. Source: [Vitest npm](https://www.npmjs.com/package/vitest) |
| ESLint + @typescript-eslint | latest | Linting | Standard TypeScript linting. |
| Prettier | latest | Code formatting | User decision. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Raw Web Audio API | Tone.js | Tone.js adds `rampTo()` convenience and PolySynth voice management. However, for Phase 1's persistent-oscillator pattern with manual ADSR, raw Web Audio gives full control without the ~80KB bundle. Tone.js may be added in Phase 2/3 for chord scheduling and slide mode. |
| Electron Forge + Vite | electron-vite (standalone) | electron-vite is more mature for Vite specifically, but user decided on Electron Forge. Forge provides packaging/distribution pipeline that electron-vite does not. |
| electron-window-state | Manual getBounds/setBounds + electron-store | electron-window-state handles edge cases (maximized state, multi-monitor). Not worth hand-rolling. |
| Storybook | None (test in-app only) | Storybook enables isolated development of ADSR controls and voice buttons without running the full Electron app. Worth the setup cost for interactive audio controls. |

**Installation:**
```bash
# Scaffold project
npx create-electron-app@latest schmidi --template=vite-typescript

# Core renderer dependencies
npm install react react-dom zustand electron-window-state
npm install -D @types/react @types/react-dom

# Styling
npm install -D tailwindcss @tailwindcss/vite

# Testing
npm install -D vitest @playwright/test
npx playwright install

# Storybook
npx storybook@latest init --type react_vite

# Linting/formatting
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-config prettier eslint-config-prettier

# Preload utilities
npm install @electron-toolkit/preload
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── main/                        # Electron main process
│   ├── main.ts                  # App entry, BrowserWindow, autoplay policy
│   └── preload.ts               # contextBridge IPC surface
├── renderer/                    # Everything in the renderer process
│   ├── index.html               # Entry HTML
│   ├── App.tsx                  # Root component, splash screen gate
│   ├── components/
│   │   ├── TitleBar.tsx         # Custom frameless title bar (draggable)
│   │   ├── SplashScreen.tsx     # Logo + "Click to Start" -> resumes AudioContext
│   │   ├── VoiceButton.tsx      # Per-voice trigger button with envelope animation
│   │   ├── WaveformSelector.tsx # Icon row: sine, square, sawtooth, triangle
│   │   ├── ADSRControls.tsx     # Sliders + numeric display + preset selector
│   │   ├── EnvelopeCurve.tsx    # Live canvas preview of ADSR shape
│   │   ├── VolumeControl.tsx    # Master volume slider/fader
│   │   ├── StatusBar.tsx        # AudioContext state, sample rate, latency
│   │   └── Oscilloscope.tsx     # Optional: small waveform display
│   ├── audio/
│   │   ├── audioContext.ts      # Singleton AudioContext with resume helper
│   │   ├── Voice.ts             # Single voice: OscillatorNode + GainNode + ADSR logic
│   │   ├── VoiceManager.ts     # Manages 8 Voice instances, global waveform, detune
│   │   ├── envelopePresets.ts   # Preset ADSR values (Pad, Pluck, Organ, Strings)
│   │   ├── masterBus.ts        # Master GainNode + DynamicsCompressorNode + AnalyserNode
│   │   └── constants.ts         # Default pitches, detune values, timing constants
│   ├── store/
│   │   └── synthStore.ts        # Zustand: waveform, preset, ADSR values, voice states
│   ├── hooks/
│   │   ├── useAudioInit.ts      # Init audio engine on splash screen click
│   │   └── useAnimationLoop.ts  # rAF lifecycle for envelope animation + oscilloscope
│   └── utils/
│       └── envelopeMath.ts      # Pure functions for ADSR curve calculation (for canvas preview)
├── shared/
│   └── types.ts                 # Shared types between main and renderer
└── stories/                     # Storybook stories
    ├── VoiceButton.stories.tsx
    ├── ADSRControls.stories.tsx
    ├── WaveformSelector.stories.tsx
    └── VolumeControl.stories.tsx
```

### Pattern 1: Audio Graph Topology (8 Persistent Voices)

**What:** Wire the complete audio graph at app startup and never tear it down. Each of the 8 voices is an OscillatorNode -> GainNode chain. All voice GainNodes connect to a master GainNode, which connects to a DynamicsCompressorNode, which connects to an optional AnalyserNode, which connects to `audioContext.destination`.

**When to use:** Always. This is the foundational pattern for the entire app.

**Example:**
```typescript
// audio/masterBus.ts
// Source: MDN Web Audio API, DynamicsCompressorNode docs

export function createMasterBus(ctx: AudioContext) {
  const masterGain = new GainNode(ctx, { gain: 0.7 });
  const compressor = new DynamicsCompressorNode(ctx, {
    threshold: -24,   // start compressing at -24dB
    knee: 12,         // gentle knee for musical compression
    ratio: 4,         // 4:1 ratio -- moderate, not brickwall
    attack: 0.003,    // 3ms attack
    release: 0.25     // 250ms release
  });
  const analyser = new AnalyserNode(ctx, {
    fftSize: 2048,
    smoothingTimeConstant: 0.8
  });

  masterGain.connect(compressor);
  compressor.connect(analyser);
  analyser.connect(ctx.destination);

  return { masterGain, compressor, analyser };
}
```

```typescript
// audio/Voice.ts
// Source: MDN OscillatorNode, AudioParam scheduling docs

export class Voice {
  readonly oscillator: OscillatorNode;
  readonly gainNode: GainNode;
  private adsr: ADSRValues;
  private ctx: AudioContext;

  constructor(ctx: AudioContext, destination: AudioNode, frequency: number, detuneCents: number) {
    this.ctx = ctx;
    this.oscillator = new OscillatorNode(ctx, {
      type: 'sine',
      frequency,
      detune: detuneCents
    });
    this.gainNode = new GainNode(ctx, { gain: 0 }); // silent until triggered
    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(destination);
    this.oscillator.start(); // runs forever
    this.adsr = DEFAULT_ADSR;
  }

  setWaveform(type: OscillatorType): void {
    this.oscillator.type = type; // instantaneous, no click
  }

  triggerAttack(): void {
    const now = this.ctx.currentTime;
    const gain = this.gainNode.gain;

    // Cancel any in-progress automation
    gain.cancelScheduledValues(now);
    // Anchor at current value to prevent click
    gain.setValueAtTime(gain.value, now);

    // Attack: ramp to 1.0
    gain.linearRampToValueAtTime(1.0, now + this.adsr.attack);
    // Decay: exponential approach to sustain level
    gain.setTargetAtTime(this.adsr.sustain, now + this.adsr.attack, this.adsr.decay / 3);
  }

  triggerRelease(): void {
    const now = this.ctx.currentTime;
    const gain = this.gainNode.gain;

    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    // Release: approach zero (use small floor to avoid exponential-to-zero issue)
    gain.setTargetAtTime(0.0001, now, this.adsr.release / 3);
    // Hard silence after 5x time constant to clean up
    gain.setValueAtTime(0, now + this.adsr.release * 1.67);
  }
}
```

### Pattern 2: ADSR Envelope with Anti-Click Scheduling

**What:** Every gain automation sequence follows this protocol: (1) `cancelScheduledValues(now)`, (2) `setValueAtTime(currentValue, now)` to anchor, (3) schedule the ramp. Never skip step 2 -- it prevents clicks by ensuring the automation timeline starts from the actual current value.

**When to use:** Every voice trigger and release. Every gain change.

**Why `setTargetAtTime` for decay/release:** `setTargetAtTime(target, startTime, timeConstant)` creates an exponential approach that naturally shapes musical decay. The `timeConstant` parameter means the signal reaches ~63% of the way to target after one time constant. For a desired decay time, use `timeConstant = desiredTime / 3` (reaches ~95% in the desired time). Unlike `exponentialRampToValueAtTime`, `setTargetAtTime` CAN target 0.0 (asymptotically approaches it).

**Example:**
```typescript
// Source: MDN AudioParam.setTargetAtTime docs

// Attack phase: linear ramp is preferred (constant perceived loudness increase)
gain.setValueAtTime(0, now);
gain.linearRampToValueAtTime(1.0, now + attackTime);

// Decay phase: exponential approach feels natural
gain.setTargetAtTime(sustainLevel, now + attackTime, decayTime / 3);

// Sustain: no scheduling needed -- value holds at sustainLevel

// Release phase: exponential approach to silence
gain.cancelScheduledValues(releaseStart);
gain.setValueAtTime(currentGain, releaseStart);
gain.setTargetAtTime(0.0001, releaseStart, releaseTime / 3);
// Clean cutoff after envelope effectively reaches zero
gain.setValueAtTime(0, releaseStart + releaseTime * 1.67);
```

### Pattern 3: AudioContext Autoplay Handling via Splash Screen

**What:** Create AudioContext eagerly (or lazily on first use), but always check state and call `.resume()` inside a user gesture handler. The splash screen's "Click to Start" button provides the required gesture.

**When to use:** App launch. The splash screen is both a branding moment and the autoplay unlock mechanism.

**Example:**
```typescript
// main/main.ts -- optional belt-and-suspenders
import { app } from 'electron';
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// renderer/audio/audioContext.ts
let ctx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext({ latencyHint: 'interactive' });
  }
  return ctx;
}

export async function ensureAudioRunning(): Promise<void> {
  const ac = getAudioContext();
  if (ac.state === 'suspended') {
    await ac.resume();
  }
}

// renderer/components/SplashScreen.tsx
// onClick handler calls ensureAudioRunning() then transitions to main UI
```

### Pattern 4: Frameless Window with Custom Title Bar

**What:** Use `titleBarStyle: 'hidden'` on macOS to hide the native title bar while keeping traffic light buttons. Add a custom HTML title bar with `-webkit-app-region: drag` for window dragging.

**When to use:** Always (user decision).

**Example:**
```typescript
// main/main.ts
// Source: Electron docs - Custom Title Bar tutorial (Context7)

import { BrowserWindow } from 'electron';
import windowStateKeeper from 'electron-window-state';

const mainWindowState = windowStateKeeper({
  defaultWidth: 1000,
  defaultHeight: 700
});

const win = new BrowserWindow({
  x: mainWindowState.x,
  y: mainWindowState.y,
  width: mainWindowState.width,
  height: mainWindowState.height,
  minWidth: 800,
  minHeight: 500,
  titleBarStyle: 'hidden',
  trafficLightPosition: { x: 12, y: 12 },
  frame: process.platform === 'darwin' ? true : false, // frameless on non-mac
  ...(process.platform !== 'darwin' ? { titleBarOverlay: true } : {}),
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true
  }
});

mainWindowState.manage(win);
```

```css
/* renderer CSS */
.title-bar {
  -webkit-app-region: drag;
  height: 38px;
  display: flex;
  align-items: center;
  padding-left: 80px; /* space for macOS traffic lights */
}
.title-bar button, .title-bar input {
  -webkit-app-region: no-drag; /* interactive elements must opt out */
}
```

### Anti-Patterns to Avoid

- **Creating/destroying oscillators per note:** OscillatorNode.start() can only be called once. Use persistent oscillators gated by gain.
- **Direct `.value` assignment on live AudioParams:** Causes clicks. Always use scheduling methods.
- **Driving audio timing from requestAnimationFrame:** rAF is for visuals. Audio timing uses `audioContext.currentTime`.
- **Storing AudioNode references in React state:** Triggers re-renders, causes scheduling jitter. Keep audio engine outside React.
- **Multiple AudioContext instances:** One singleton per app. Multiple contexts compete for system audio resources.
- **`nodeIntegration: true` in renderer:** Security anti-pattern. Use contextBridge + preload.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Window state persistence | Manual getBounds/setBounds + JSON file | `electron-window-state` | Handles maximized/fullscreen state, multi-monitor edge cases, manage/unmanage lifecycle |
| Click-free gain transitions | Custom ramp functions with setInterval | AudioParam scheduling (`setValueAtTime` + `linearRampToValueAtTime` + `setTargetAtTime`) | AudioParam scheduling runs on the audio thread at sample rate. JS timers cannot match this precision. |
| ADSR envelope timing | setTimeout-based envelope stages | AudioParam scheduling chain (see Pattern 2) | Audio thread handles all timing. JS timer drift would cause audible envelope inconsistencies. |
| Electron IPC boilerplate | Manual contextBridge setup | `@electron-toolkit/preload` | Removes repetitive IPC plumbing code |
| Component isolation testing | Manual test harnesses | Storybook (`@storybook/react-vite`) | Purpose-built for interactive component development. User decision. |

**Key insight:** In audio applications, anything time-sensitive MUST be handled by the audio thread via AudioParam scheduling. JavaScript main thread is too unreliable for musical timing.

## Common Pitfalls

### Pitfall 1: Click Artifacts from Missing Anchor Values
**What goes wrong:** Scheduling a ramp without first calling `setValueAtTime(currentValue, now)` causes the ramp to start from an unpredictable value, producing an audible click.
**Why it happens:** `cancelScheduledValues` purges future events but does not set the current value. The AudioParam's internal value becomes undefined in the automation timeline.
**How to avoid:** Always: `cancelScheduledValues(now)` -> `setValueAtTime(currentValue, now)` -> then schedule the ramp.
**Warning signs:** Clicks on note-on, clicks on note-off, clicks when changing presets during sustained notes.

### Pitfall 2: exponentialRampToValueAtTime Cannot Reach Zero
**What goes wrong:** Scheduling `gain.exponentialRampToValueAtTime(0, endTime)` throws or produces unexpected behavior because exponential math cannot reach exactly zero.
**Why it happens:** The exponential formula involves division by the current value. Zero is mathematically unreachable.
**How to avoid:** Use `setTargetAtTime(0.0001, startTime, timeConstant)` for release phases. The signal asymptotically approaches zero. Follow up with `setValueAtTime(0, startTime + timeConstant * 5)` for a clean cutoff after the envelope is inaudible.
**Warning signs:** Console errors about invalid AudioParam values, or sustained low-level hum after note release.

### Pitfall 3: AudioContext Suspended on Launch
**What goes wrong:** App launches, UI renders, but no sound. AudioContext is in 'suspended' state due to Chromium autoplay policy.
**Why it happens:** Electron wraps Chromium which enforces autoplay restrictions. Creating AudioContext before user gesture starts it suspended.
**How to avoid:** Two-layer approach: (1) `app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')` in main process, (2) splash screen with click handler that calls `audioContext.resume()`. Belt and suspenders.
**Warning signs:** `audioContext.state === 'suspended'` after creation. No audio output despite no errors.

### Pitfall 4: Electron Forge Vite Plugin Experimental Status
**What goes wrong:** Minor version updates to `@electron-forge/plugin-vite` may include breaking changes without semver major bump.
**Why it happens:** Plugin is marked experimental as of v7.5.0. API stability is not guaranteed across minor versions.
**How to avoid:** Pin the Forge plugin version in package.json (exact version, not range). Test builds after any Forge dependency update. Check release notes before upgrading.
**Warning signs:** Build failures after `npm update`. Config file format changes.

### Pitfall 5: Storybook Cannot Access Electron APIs
**What goes wrong:** Storybook runs in a browser context, not an Electron renderer. Components that import Electron-specific APIs (ipcRenderer, etc.) will fail in Storybook.
**Why it happens:** Storybook serves components via its own dev server with no Electron runtime. Electron's contextBridge APIs are unavailable.
**How to avoid:** Ensure all Storybook-targeted components are pure React with no Electron imports. If a component needs IPC data, abstract it behind a prop or hook that can be mocked in stories. The audio engine (Web Audio API) is available in Storybook's browser context -- audio components CAN be tested with real audio in Storybook.
**Warning signs:** "Cannot find module 'electron'" errors when running Storybook.

### Pitfall 6: 8 Voices Summing to Clipping
**What goes wrong:** When multiple voices are triggered simultaneously at full gain, the summed signal exceeds 0dBFS, causing digital clipping/distortion.
**Why it happens:** 8 oscillators each at gain 1.0 sum to 8.0 peak amplitude. The output clips at 1.0.
**How to avoid:** (1) Set master gain to `1/N` where N is voice count (e.g., 0.125 for 8 voices), or more practically ~0.15-0.2 to leave headroom. (2) Place a DynamicsCompressorNode on the master bus as a safety limiter. (3) Monitor `compressor.reduction` to detect compression events.
**Warning signs:** Distorted sound when playing many voices simultaneously. `compressor.reduction` showing significant values.

## Code Examples

### Complete Voice Class with ADSR
```typescript
// Source: MDN AudioParam scheduling docs + setTargetAtTime docs

export interface ADSRValues {
  attack: number;   // seconds to reach peak (linear ramp)
  decay: number;    // seconds to reach sustain (exponential approach)
  sustain: number;  // 0-1 gain level during sustain
  release: number;  // seconds to reach silence (exponential approach)
}

export class Voice {
  readonly oscillator: OscillatorNode;
  readonly gainNode: GainNode;
  private ctx: AudioContext;
  private adsr: ADSRValues;
  private _isActive: boolean = false;

  constructor(
    ctx: AudioContext,
    destination: AudioNode,
    frequency: number,
    detuneCents: number,
    adsr: ADSRValues
  ) {
    this.ctx = ctx;
    this.adsr = adsr;
    this.oscillator = new OscillatorNode(ctx, {
      type: 'sine',
      frequency,
      detune: detuneCents
    });
    this.gainNode = new GainNode(ctx, { gain: 0 });
    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(destination);
    this.oscillator.start();
  }

  get isActive(): boolean { return this._isActive; }

  triggerAttack(): void {
    const now = this.ctx.currentTime;
    const g = this.gainNode.gain;

    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    // Attack: linear ramp to peak
    g.linearRampToValueAtTime(1.0, now + this.adsr.attack);
    // Decay: exponential approach to sustain
    // timeConstant = decay / 3 means ~95% reached in decay seconds
    g.setTargetAtTime(this.adsr.sustain, now + this.adsr.attack, this.adsr.decay / 3);

    this._isActive = true;
  }

  triggerRelease(): void {
    const now = this.ctx.currentTime;
    const g = this.gainNode.gain;

    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    // Release: exponential approach to near-zero
    g.setTargetAtTime(0.0001, now, this.adsr.release / 3);
    // Clean silence after envelope is inaudible
    g.setValueAtTime(0, now + this.adsr.release * 1.67);

    this._isActive = false;
  }

  setWaveform(type: OscillatorType): void {
    this.oscillator.type = type;
  }

  setADSR(adsr: ADSRValues): void {
    this.adsr = adsr;
  }

  setFrequency(freq: number): void {
    this.oscillator.frequency.setValueAtTime(freq, this.ctx.currentTime);
  }

  dispose(): void {
    this.oscillator.stop();
    this.oscillator.disconnect();
    this.gainNode.disconnect();
  }
}
```

### Envelope Presets
```typescript
// audio/envelopePresets.ts
// Source: Synthesizer design conventions, user-specified preset names

export const ENVELOPE_PRESETS: Record<string, ADSRValues> = {
  'Pad (Drift)': {
    attack: 0.8,     // 800ms -- slow, swelling onset
    decay: 1.2,      // 1200ms -- gradual settle
    sustain: 0.7,    // 70% -- full, warm sustain
    release: 2.0     // 2000ms -- long, fading tail
  },
  'Pluck (Snap)': {
    attack: 0.005,   // 5ms -- near-instant onset
    decay: 0.3,      // 300ms -- quick drop
    sustain: 0.0,    // 0% -- no sustain (fully decayed)
    release: 0.1     // 100ms -- short tail
  },
  'Organ (Breathe)': {
    attack: 0.01,    // 10ms -- fast but not instant (avoids click)
    decay: 0.05,     // 50ms -- minimal decay
    sustain: 0.85,   // 85% -- strong sustain
    release: 0.01    // 10ms -- immediate cutoff feel
  },
  'Strings (Bloom)': {
    attack: 0.4,     // 400ms -- gradual bloom
    decay: 0.5,      // 500ms -- gentle settle
    sustain: 0.6,    // 60% -- moderate sustain
    release: 1.5     // 1500ms -- lingering fade
  }
};
```

### Default Voice Pitches (8 Voices)
```typescript
// audio/constants.ts
// Recommendation: C major scale from C3 to C4 (musically coherent, spans one octave)
// This gives instant polyphonic playability without needing chord engine

export const DEFAULT_VOICE_PITCHES: number[] = [
  130.81,  // C3
  146.83,  // D3
  164.81,  // E3
  174.61,  // F3
  196.00,  // G3
  220.00,  // A3
  246.94,  // B3
  261.63   // C4
];

// Detune values in cents -- subtle spread for analog warmth
// Range: -12 to +12 cents (imperceptible as "out of tune", adds thickness)
export const DEFAULT_VOICE_DETUNE: number[] = [
  -7, +5, -3, +8, -10, +4, -6, +11
];

// Keyboard mapping: home row for quick access
export const DEFAULT_VOICE_KEYS: string[] = [
  'a', 's', 'd', 'f', 'j', 'k', 'l', ';'
];
```

### ADSR Curve Canvas Drawing
```typescript
// utils/envelopeMath.ts
// Pure function: computes ADSR curve points for canvas preview

export function computeEnvelopeCurve(
  adsr: ADSRValues,
  width: number,
  height: number,
  sampleCount: number = 200
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const totalDuration = adsr.attack + adsr.decay + 0.3 + adsr.release; // 0.3s sustain display
  const attackEnd = adsr.attack / totalDuration;
  const decayEnd = (adsr.attack + adsr.decay) / totalDuration;
  const sustainEnd = (adsr.attack + adsr.decay + 0.3) / totalDuration;

  for (let i = 0; i < sampleCount; i++) {
    const t = i / (sampleCount - 1); // 0 to 1
    let amplitude: number;

    if (t <= attackEnd) {
      // Linear attack
      amplitude = t / attackEnd;
    } else if (t <= decayEnd) {
      // Exponential decay toward sustain
      const decayProgress = (t - attackEnd) / (decayEnd - attackEnd);
      const timeConst = 1 / 3; // matches decay/3 scheduling
      amplitude = adsr.sustain + (1 - adsr.sustain) * Math.exp(-decayProgress / timeConst);
    } else if (t <= sustainEnd) {
      // Sustain hold
      amplitude = adsr.sustain;
    } else {
      // Exponential release
      const releaseProgress = (t - sustainEnd) / (1 - sustainEnd);
      const timeConst = 1 / 3;
      amplitude = adsr.sustain * Math.exp(-releaseProgress / timeConst);
    }

    points.push({
      x: t * width,
      y: height - amplitude * height
    });
  }

  return points;
}
```

### Playwright Electron Test Setup
```typescript
// e2e/app.spec.ts
// Source: Playwright Electron docs (Context7)

import { test, expect, _electron as electron } from '@playwright/test';
import type { ElectronApplication, Page } from '@playwright/test';

let electronApp: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
  electronApp = await electron.launch({
    args: ['.'], // points to package.json main
  });
  page = await electronApp.firstWindow();
});

test.afterAll(async () => {
  await electronApp.close();
});

test('splash screen shows and unlocks audio', async () => {
  // Splash screen should be visible
  await expect(page.locator('[data-testid="splash-screen"]')).toBeVisible();

  // Click start button
  await page.click('[data-testid="start-button"]');

  // Splash screen should disappear
  await expect(page.locator('[data-testid="splash-screen"]')).not.toBeVisible();

  // Verify AudioContext is running
  const audioState = await page.evaluate(() => {
    // Access audio context state from the renderer
    return (window as any).__audioContext?.state;
  });
  expect(audioState).toBe('running');
});

test('voice buttons are visible and interactive', async () => {
  const voiceButtons = page.locator('[data-testid^="voice-button-"]');
  await expect(voiceButtons).toHaveCount(8);
});
```

## Discretion Recommendations

Based on research, these are recommendations for the areas marked as Claude's discretion:

### Voice Pitches
**Recommendation:** C major scale C3-C4 (130.81 Hz to 261.63 Hz). This is the most immediately musical mapping -- 8 notes of a major scale in a comfortable mid-range octave. Provides instant polyphonic playability.
**Confidence:** HIGH -- standard synth convention.

### Ramp Types
**Recommendation:**
- **Attack:** `linearRampToValueAtTime` -- constant perceived loudness increase, natural for onset.
- **Decay:** `setTargetAtTime` with `timeConstant = decayTime / 3` -- exponential approach, musically natural.
- **Release:** `setTargetAtTime` with `timeConstant = releaseTime / 3` -- exponential approach, can target near-zero.
- **Frequency changes:** `setValueAtTime` for instant changes in Phase 1 (ramps deferred to slide mode).
**Confidence:** HIGH -- verified against MDN docs and Web Audio best practices.

### Master Gain / Compressor
**Recommendation:** Master GainNode at 0.15 (conservative for 8 voices) -> DynamicsCompressorNode (threshold: -24dB, knee: 12dB, ratio: 4:1, attack: 3ms, release: 250ms) -> AnalyserNode -> destination. The compressor acts as a safety limiter, not a creative effect. Monitor `compressor.reduction` in the status bar.
**Confidence:** HIGH -- standard audio mixing practice, DynamicsCompressorNode docs verified.

### Default ADSR Values
**Recommendation:** See ENVELOPE_PRESETS in Code Examples above. Default active preset: "Pad (Drift)" for immediate impact on first use.
**Confidence:** MEDIUM -- values are based on synthesizer conventions, but final feel requires hands-on tuning.

### Envelope Curve Display
**Recommendation:** Use simplified exponential math matching `setTargetAtTime` behavior (exponential decay with timeConstant = duration/3). The preview canvas shows the shape, not sample-accurate reproduction. 200 sample points is sufficient for smooth visual at any canvas width.
**Confidence:** HIGH -- the math directly mirrors the AudioParam scheduling.

### Volume Control Style
**Recommendation:** Vertical slider (CSS range input styled to match dark theme). A slider is the most accessible and familiar control. Knobs require custom interaction handlers and accessibility work. A fader (horizontal slider) would also work but vertical is more synth-conventional.
**Confidence:** MEDIUM -- aesthetic choice, either works.

### Oscilloscope / Waveform Display
**Recommendation:** Include a small oscilloscope (AnalyserNode + canvas). It provides visual feedback that sound is working, aids debugging, and fits the Vital-inspired aesthetic. Use the master bus AnalyserNode's `getByteTimeDomainData()` for the waveform trace. Keep it small -- 200x80px, positioned near the status bar.
**Confidence:** MEDIUM -- nice to have, not essential, but aligns with user's reference (Vital synth).

### UI Layout
**Recommendation:** Top-to-bottom layout:
1. Custom title bar (38px)
2. Main content area:
   - Left column: Voice buttons (2x4 grid) with keyboard shortcuts
   - Center: Waveform selector row + ADSR controls + envelope curve preview
   - Right: Volume control + oscilloscope
3. Status bar (28px, bottom)
**Confidence:** MEDIUM -- layout needs iteration based on actual component sizing.

### Visual Tone
**Recommendation:** Dark background (#0a0a0f or similar near-black), subtle accent color (cyan/teal glow, matching Vital's aesthetic). Use `box-shadow` with accent color for voice button active states. Envelope curve canvas has dark background with bright trace line. Minimal use of borders -- prefer subtle gradients and glow effects.
**Confidence:** MEDIUM -- aesthetic direction, final look requires iteration.

### Menu Bar for Frameless Window
**Recommendation:** No menu bar in the renderer. On macOS, `titleBarStyle: 'hidden'` preserves the native menu bar in the OS menu area. For any app actions (quit, dev tools), use the native Electron Menu API in the main process. The custom title bar shows only the app name and minimal controls.
**Confidence:** HIGH -- standard macOS pattern for frameless Electron apps.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `ScriptProcessorNode` for custom DSP | `AudioWorklet` | Chrome 64 (2018), widely available | ScriptProcessorNode runs on main thread, causes glitches. AudioWorklet runs on audio thread. Not needed for Phase 1 (no custom DSP), but important to know. |
| Electron Forge + Webpack | Electron Forge + Vite (`@electron-forge/plugin-vite`) | Forge v6+ (2023) | Vite provides faster builds and HMR. Webpack template is legacy. |
| `electron-builder` alternative | Electron Forge as official tool | Electron team endorsement (2023+) | Forge is the Electron team's recommended build tool. |
| Storybook 8 with Webpack | Storybook 9 with Vite-first | July 2025 | Storybook 9 is Vite-native, includes built-in component testing with Vitest. |
| `AudioContext.state` manual polling | `AudioContext.onstatechange` event | Widely available | Event-driven approach is cleaner for detecting suspend/resume. |

**Deprecated/outdated:**
- `ScriptProcessorNode`: Deprecated in favor of AudioWorklet. Still works but should not be used.
- `createOscillator()` factory method: Still works but constructor syntax (`new OscillatorNode(ctx, options)`) is modern standard.
- Electron `remote` module: Removed. Use `contextBridge` + `ipcMain`/`ipcRenderer`.

## Open Questions

1. **Electron Forge Vite plugin + React template: Does a combined template exist?**
   - What we know: `--template=vite-typescript` exists. React must be added manually (npm install react react-dom, tsconfig JSX config, renderer entry point change). The Forge docs show a React+TypeScript guide but it references the Webpack template.
   - What's unclear: Whether Forge has released a combined `vite-react-typescript` template since the docs were written. Community templates exist but are not official.
   - Recommendation: Use `--template=vite-typescript` and add React manually per the Forge guide. This is well-documented and takes ~5 minutes.

2. **Storybook 9 compatibility with Electron Forge Vite setup**
   - What we know: `@storybook/react-vite@9.1.4` runs standalone via its own Vite dev server. It does not need Electron at runtime. Components using only Web Audio API and React will work.
   - What's unclear: Whether Storybook's Vite config will conflict with Forge's Vite config (separate config files should isolate them).
   - Recommendation: Initialize Storybook with `npx storybook@latest init`. It should detect the React+Vite setup and configure accordingly. If config conflicts arise, Storybook's `.storybook/main.ts` can specify its own Vite config independently.

3. **Playwright Electron support stability**
   - What we know: `_electron` API exists in Playwright, launches the full Electron app, provides Page objects for renderer windows. Version 1.58.2 is current.
   - What's unclear: The `_electron` prefix (underscore) suggests this may still be considered experimental/internal API.
   - Recommendation: Use it -- it is the only viable option for end-to-end Electron testing with Playwright. The underscore prefix has been stable for multiple major versions. Pin Playwright version to avoid surprise breakage.

## Sources

### Primary (HIGH confidence)
- `/websites/electronjs` (Context7) -- BrowserWindow configuration, custom title bar, frameless window, window bounds API, titleBarStyle, titleBarOverlay
- `/electron-forge/electron-forge-docs` (Context7) -- Vite plugin config, React+TypeScript integration, template scaffolding
- `/tonejs/tone.js` (Context7) -- AmplitudeEnvelope ADSR, Oscillator detune, rampTo API, 8-oscillator example with detune
- `/microsoft/playwright.dev` (Context7) -- Electron launch API, ElectronApplication class, firstWindow(), evaluate()
- `/websites/storybook_js` (Context7) -- React Vite framework setup, @storybook/react-vite configuration
- MDN AudioParam.setTargetAtTime: https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/setTargetAtTime
- MDN OscillatorNode.detune: https://developer.mozilla.org/en-US/docs/Web/API/OscillatorNode/detune
- MDN DynamicsCompressorNode: https://developer.mozilla.org/en-US/docs/Web/API/DynamicsCompressorNode
- Electron Custom Title Bar tutorial: https://www.electronjs.org/docs/latest/tutorial/custom-title-bar
- ADSR Envelope implementation (Dobrian): https://dobrian.github.io/cmp/topics/building-a-synthesizer-with-web-audio-api/4.envelopes.html

### Secondary (MEDIUM confidence)
- electron-window-state: https://github.com/mawie81/electron-window-state -- API verified against README
- Electron Forge Vite + TypeScript template: https://www.electronforge.io/templates/vite-+-typescript -- experimental status confirmed
- Electron Forge React+TypeScript guide: https://www.electronforge.io/guides/framework-integration/react-with-typescript
- Storybook/Electron integration challenges: https://github.com/storybookjs/storybook/issues/1435

### Tertiary (LOW confidence)
- Electron Forge Vite experimental status implications: Based on WebSearch + Forge release notes (v7.5.0). The exact scope of "experimental" breaking changes is unclear.
- Optimal detune range for analog warmth: WebSearch suggested <=25 cents. Tone.js example uses `Math.random() * 30 - 15` (+-15 cents). Recommendation of +-12 cents is a conservative middle ground -- needs hands-on validation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all core libraries verified via Context7 and npm. Versions current as of Feb 2026.
- Architecture: HIGH -- audio graph patterns verified against MDN official docs. Persistent oscillator pattern is well-established.
- ADSR implementation: HIGH -- AudioParam scheduling methods verified against MDN. Anti-click patterns confirmed.
- Tooling (Forge/Storybook/Playwright): MEDIUM -- all tools verified but Forge Vite plugin is experimental, Storybook/Electron integration has known friction, Playwright Electron is underscore-prefixed API.
- Pitfalls: HIGH -- all pitfalls verified against MDN specs, WebAudio spec issues, and prior project research.
- Discretion recommendations: MEDIUM -- based on conventions and research, but aesthetic/feel choices require hands-on tuning.

**Research date:** 2026-02-18
**Valid until:** 2026-03-18 (30 days -- stable domain, slow-moving APIs)
