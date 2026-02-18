# Architecture Research

**Domain:** Electron desktop synthesizer with real-time audio visualization
**Researched:** 2026-02-18
**Confidence:** HIGH (Web Audio API patterns from MDN official docs + Chrome for Developers + Tone.js verified source)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Electron Main Process                            │
│  ┌───────────────┐  ┌──────────────────┐  ┌─────────────────────┐  │
│  │  App Lifecycle │  │  Window Manager  │  │   preload.ts (IPC   │  │
│  │  (main.ts)    │  │  BrowserWindow   │  │   bridge / context  │  │
│  └───────────────┘  └──────────────────┘  │   bridge)           │  │
│                                            └──────────┬──────────┘  │
└───────────────────────────────────────────────────────┼─────────────┘
                                                        │ contextBridge
                                                        │ ipcRenderer / ipcMain
┌───────────────────────────────────────────────────────┼─────────────┐
│                     Renderer Process                   │             │
│  ┌──────────────────────────────────────────────────── ▼ ──────┐    │
│  │                      React UI Layer                          │    │
│  │  ┌─────────────┐  ┌──────────────────┐  ┌───────────────┐   │    │
│  │  │ Chord Panel │  │  Mode Toggle     │  │ Visualizer    │   │    │
│  │  │ (buttons)   │  │ (Synth/Slide)    │  │ (Canvas)      │   │    │
│  │  └──────┬──────┘  └────────┬─────────┘  └───────┬───────┘   │    │
│  └─────────┼──────────────────┼────────────────────┼───────────┘    │
│            │ user events       │ mode state         │ reads track state│
│  ┌─────────▼──────────────────▼────────────────────┼───────────┐    │
│  │                    Synth Engine (audio/)          │           │    │
│  │  ┌──────────────┐  ┌───────────────────────┐    │           │    │
│  │  │ AudioContext │  │  Voice / Track Manager│    │           │    │
│  │  │ (singleton)  │  │  (oscillator pool)    │ ◄──┘           │    │
│  │  └──────┬───────┘  └──────────┬────────────┘                │    │
│  │         │                     │ OscillatorNode + GainNode    │    │
│  │  ┌──────▼─────────────────────▼──────────────────────────┐  │    │
│  │  │              Web Audio Graph                           │  │    │
│  │  │  [OscNode] → [GainNode] → [AnalyserNode] → [Dest]     │  │    │
│  │  │  (per voice)              (shared tap)   (speakers)   │  │    │
│  │  └───────────────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `main.ts` | App lifecycle, create BrowserWindow, native menus | Electron main process, Node.js |
| `preload.ts` | IPC bridge; expose safe APIs to renderer via contextBridge | Electron contextBridge, ipcRenderer |
| `ChordPanel` | Renders chord buttons; dispatches chord-play events | React component |
| `ModeToggle` | Switches between Synth mode and Slide mode | React state or context |
| `AudioContext` (singleton) | Single audio context shared across all audio work | `new AudioContext()` created once on user gesture |
| `TrackManager` | Owns the N continuous oscillator tracks; manages voice lifecycle | Plain TS class, lives in renderer |
| `SynthTrack` | One sliding voice: OscillatorNode + GainNode; exposes `setTargetFrequency`, `setGain` | TS class wrapping Web Audio nodes |
| `ChordScheduler` | Translates chord events into AudioParam schedules; handles glissando curves | TS module, uses `linearRampToValueAtTime` / `exponentialRampToValueAtTime` |
| `AnalyserNode` | Passive tap on the master bus for visualization data | Single shared node, `fftSize` configurable |
| `VisualizerCanvas` | 60fps canvas draw loop; reads from AnalyserNode or TrackState | React ref + `requestAnimationFrame` loop |
| `TrackStateStore` | Lightweight in-memory state (current freq, gain per track) read by visualizer | Plain object / Zustand slice |

## Recommended Project Structure

```
src/
├── main/                    # Electron main process
│   ├── main.ts              # App entry, BrowserWindow setup
│   └── preload.ts           # contextBridge IPC surface
├── renderer/                # Everything running in the renderer process
│   ├── App.tsx              # Root component, AudioContext init on user gesture
│   ├── components/
│   │   ├── ChordPanel.tsx   # Chord selection buttons
│   │   ├── ModeToggle.tsx   # Synth / Slide mode switch
│   │   └── VisualizerCanvas.tsx  # Canvas element + rAF loop
│   ├── audio/
│   │   ├── audioContext.ts  # Singleton AudioContext accessor
│   │   ├── TrackManager.ts  # Manages N SynthTrack instances
│   │   ├── SynthTrack.ts    # Single oscillator+gain voice
│   │   ├── ChordScheduler.ts # Translates chord → AudioParam schedules
│   │   └── analyser.ts      # Shared AnalyserNode setup
│   ├── visualizer/
│   │   ├── radialView.ts    # Radial convergence draw logic
│   │   └── waveformView.ts  # Waveform trace draw logic
│   ├── store/
│   │   └── trackState.ts    # TrackStateStore: per-track freq/gain for visualizer
│   └── hooks/
│       ├── useAudio.ts      # React hook: init audio on user interaction
│       └── useAnimationLoop.ts  # rAF lifecycle tied to component mount
└── shared/                  # Types shared between main and renderer
    └── types.ts
```

### Structure Rationale

- **`main/` vs `renderer/`:** Hard separation required by Electron's process model. Nothing in `renderer/` may import Node.js APIs directly; nothing in `main/` touches the DOM.
- **`audio/`:** All Web Audio API code isolated here. React components never touch AudioNodes directly — they call `TrackManager` methods. This makes the audio engine independently testable.
- **`visualizer/`:** Draw logic separated from the React component. The canvas component is a thin shell; all pixel work is in pure functions that accept canvas context + data arrays.
- **`store/`:** The visualizer reads track state (current frequency, gain) from a shared lightweight store rather than querying the audio graph directly, avoiding cross-thread reads.

## Architectural Patterns

### Pattern 1: Single AudioContext, Created on User Gesture

**What:** One `AudioContext` is created the first time the user interacts (click or keypress). All audio nodes share this context.

**When to use:** Always. Browsers require a user gesture before audio can play (`AudioContext` starts in `suspended` state). Multiple AudioContexts on one page compete for resources.

**Trade-offs:** Simple and correct. The only complexity is ensuring the context is initialized before any node is created — handle with a promise or lazy accessor.

**Example:**
```typescript
// audio/audioContext.ts
let ctx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
  }
  return ctx;
}

export async function resumeIfSuspended(): Promise<void> {
  const ac = getAudioContext();
  if (ac.state === 'suspended') {
    await ac.resume();
  }
}
```

---

### Pattern 2: Persistent Oscillator Tracks (not fire-and-forget)

**What:** For slide mode, N oscillator tracks run continuously from app start. Their frequency and gain are modulated via AudioParam scheduling — they are never stopped and restarted.

**When to use:** Any time you need continuous, gliding pitch. Fire-and-forget `OscillatorNode.start() / .stop()` incurs startup click artifacts and prevents smooth glissando. Persistent oscillators eliminate both problems.

**Trade-offs:** Slightly more resource usage (N oscillators always running), but negligible for single-digit track counts. Gain is set to zero when a track is "silent" — the oscillator keeps running at near-zero volume.

**Example:**
```typescript
// audio/SynthTrack.ts
export class SynthTrack {
  private osc: OscillatorNode;
  private gain: GainNode;

  constructor(ctx: AudioContext, destination: AudioNode) {
    this.osc = new OscillatorNode(ctx, { type: 'sine', frequency: 440 });
    this.gain = new GainNode(ctx, { gain: 0 }); // silent until needed
    this.osc.connect(this.gain).connect(destination);
    this.osc.start(); // runs forever
  }

  setTargetFrequency(freq: number, rampDuration: number): void {
    const now = this.osc.context.currentTime;
    this.osc.frequency.cancelScheduledValues(now);
    this.osc.frequency.linearRampToValueAtTime(freq, now + rampDuration);
  }

  setGain(value: number, rampDuration: number): void {
    const now = this.gain.context.currentTime;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.linearRampToValueAtTime(value, now + rampDuration);
  }
}
```

---

### Pattern 3: AudioParam Scheduling for Glissando

**What:** Use `linearRampToValueAtTime` (even pitch feel) or `exponentialRampToValueAtTime` (musically natural pitch feel) on `OscillatorNode.frequency` to schedule smooth pitch transitions. Always call `cancelScheduledValues` before scheduling a new ramp to avoid stacking.

**When to use:** Any time frequency changes — chord selection, slide mode convergence, or both.

**Trade-offs:** `exponentialRampToValueAtTime` cannot pass through zero (use a small floor like 1Hz if needed). `linearRampToValueAtTime` works at any value including zero-crossing.

**Example:**
```typescript
// audio/ChordScheduler.ts
export function scheduleGlide(
  track: SynthTrack,
  targetFreq: number,
  slideDuration: number
): void {
  // Exponential ramp: musically natural for pitch (equal-tempered intervals)
  track.setTargetFrequency(targetFreq, slideDuration);
}

export function scheduleVolumeConverge(
  track: SynthTrack,
  proximityFraction: number  // 0 = far from chord note, 1 = on chord note
): void {
  const targetGain = proximityFraction * proximityFraction; // quadratic swell
  track.setGain(targetGain, 0.05); // 50ms smooth
}
```

---

### Pattern 4: AnalyserNode as a Passive Audio Tap

**What:** A single `AnalyserNode` is inserted between the master gain and the audio destination. The visualization loop reads `getByteTimeDomainData()` or `getFloatTimeDomainData()` each frame — it does not modify the audio graph.

**When to use:** All real-time visualizations. The analyser adds no perceivable latency.

**Trade-offs:** The analyser sees the mixed signal. For per-track visualization (e.g., coloring each waveform line differently), read track state from `TrackStateStore` (frequency + gain values) and draw mathematically rather than from raw PCM data. Raw waveform data cannot be separated per voice once mixed.

**Example:**
```typescript
// audio/analyser.ts
export function createAnalyser(ctx: AudioContext, destination: AudioNode): AnalyserNode {
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.8;
  analyser.connect(destination);
  return analyser;
}
```

---

### Pattern 5: requestAnimationFrame Draw Loop, Decoupled from Audio

**What:** The visualizer canvas runs its own `requestAnimationFrame` loop. Each frame it reads from the `AnalyserNode` (for waveform shape) and from `TrackStateStore` (for per-track frequency + gain). Audio scheduling runs independently via `setTimeout`-based lookahead or direct AudioParam calls — the draw loop never drives audio timing.

**When to use:** Always. Coupling `rAF` to audio creates timing dependencies that cause audio glitches when frames drop.

**Trade-offs:** `rAF` is throttled to the display refresh rate (~60fps), which is exactly what you want. If audio is running but the window is hidden, `rAF` pauses — audio continues uninterrupted.

**Example:**
```typescript
// hooks/useAnimationLoop.ts
export function useAnimationLoop(draw: (timestamp: number) => void): void {
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const loop = (ts: number) => {
      draw(ts);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);
}
```

---

### Pattern 6: TrackStateStore as Visualizer Data Source

**What:** `TrackManager` writes current frequency and gain for each track into a lightweight in-memory store after every AudioParam schedule call. The visualizer reads this store each frame to drive per-track visual behavior (e.g., orb position, line color, opacity).

**When to use:** Whenever the visualization needs to know per-voice state. This avoids querying the Web Audio graph from the draw loop (AudioParam values are not readable in real-time in all browsers).

**Trade-offs:** Slight state duplication (store mirrors AudioParam values), but this is negligible. The store is never the source of truth for audio — it follows the audio schedule.

**Example:**
```typescript
// store/trackState.ts
export interface TrackState {
  frequency: number;   // current target freq (Hz)
  gain: number;        // current target gain (0–1)
  targetNote: number;  // MIDI note or Hz of nearest chord tone
}

export const trackStateStore: TrackState[] = Array.from({ length: 4 }, () => ({
  frequency: 440,
  gain: 0,
  targetNote: 440,
}));
```

## Data Flow

### Synth Mode (click-to-play)

```
User clicks chord button
    ↓
ChordPanel → dispatch chord event
    ↓
ChordScheduler.playChord(notes[])
    ↓
For each note: create OscillatorNode + GainNode (fire-and-forget)
    ↓
ADSR envelope via GainNode.gain AudioParam
    ↓
[OscNode] → [GainNode] → [AnalyserNode] → [Destination]
    ↓ (passive tap)
VisualizerCanvas rAF loop reads AnalyserNode waveform data
    ↓
Canvas draw: waveform trace aligned to chord
```

### Slide Mode (continuous glide)

```
App init
    ↓
TrackManager.init(N=4)
    → creates N SynthTracks (persistent oscillators, gain=0)
    → all connected: [OscNode] → [GainNode] → [AnalyserNode] → [Dest]

User selects chord
    ↓
ChordScheduler.assignTracksToChord(chordNotes, tracks)
    → each track gets a target note
    → schedules exponentialRampToValueAtTime on osc.frequency
    → schedules gain swell via linearRampToValueAtTime on gain.gain
    → writes new freq + gain to TrackStateStore

TrackManager periodic update loop (per animation frame or setTimeout)
    → recalculates proximity of each track to its target note
    → schedules micro gain adjustments for convergence swell effect
    → updates TrackStateStore

VisualizerCanvas rAF loop (every ~16ms)
    → reads TrackStateStore: per-track freq + gain
    → reads AnalyserNode: mixed waveform
    → radialView: maps freq → angle, gain → orb size/opacity
       OR waveformView: colors each waveform line by track gain
    → clearRect + draw
```

### Key Data Flows Summary

1. **User → Audio:** User gestures reach `TrackManager` / `ChordScheduler` via React event handlers. Audio scheduling is synchronous (AudioParam methods return immediately).
2. **Audio → Visualizer:** Two channels — (a) `AnalyserNode` for raw PCM shape, (b) `TrackStateStore` for per-track semantic state (freq, gain). The visualizer never drives audio.
3. **Audio → UI state:** `TrackStateStore` is also readable by React for any UI indicators (e.g., which chord is active, which tracks are near a note). Read it in `rAF`, not in React state, to avoid unnecessary re-renders.
4. **Electron IPC:** Main process only needs to handle window lifecycle and native menus. No audio data crosses the IPC boundary — all audio and visualization lives in the renderer.

## Scaling Considerations

This is a desktop single-user app, so "scaling" means handling more simultaneous voices and higher visualization complexity without frame drops.

| Concern | At 4 tracks (MVP) | At 8–12 tracks | Notes |
|---------|-------------------|----------------|-------|
| Audio CPU | Negligible — pure oscillators are cheap | Might notice if adding heavy effects chain | Profile with AudioContext.baseLatency |
| Canvas draw cost | Trivial for 4 lines/orbs | Fine if draw routines avoid path recreation per frame | Use `beginPath` once, reuse canvas state |
| AudioParam scheduling | No issue | No issue — scheduled in advance, not per-frame | Avoid scheduling in rAF; pre-schedule ahead |
| React re-renders | None during audio/viz (rAF loop bypasses React) | Same | Keep hot path out of React state |

### Scaling Priorities

1. **First bottleneck:** Canvas overdraw — radial view with many overlapping paths. Fix: reduce `fftSize`, use `OffscreenCanvas` if needed.
2. **Second bottleneck:** AudioParam micro-scheduling per rAF frame — don't schedule inside rAF. Pre-schedule 50–100ms ahead via a `setTimeout` scheduler instead.

## Anti-Patterns

### Anti-Pattern 1: Creating and Destroying Oscillators for Glissando

**What people do:** Stop the current `OscillatorNode` and create a new one at the target pitch for each chord change in slide mode.

**Why it's wrong:** `OscillatorNode` creation has a startup click artifact. The new oscillator begins at the target pitch instantly — there is no slide. The glissando must happen on a *running* oscillator's `frequency` AudioParam.

**Do this instead:** Keep N oscillators running from app start (gain=0 when silent). Schedule frequency ramps on the live `frequency` AudioParam.

---

### Anti-Pattern 2: Driving Audio Timing from requestAnimationFrame

**What people do:** Call `osc.frequency.setValueAtTime(...)` inside the `rAF` draw loop to "sync" audio with visuals.

**Why it's wrong:** `rAF` is unreliable for audio timing — it can be throttled, skipped, or batched. Audio will drift and stutter. The Web Audio clock (`AudioContext.currentTime`) is independent of the display clock.

**Do this instead:** Schedule audio ahead of time using a `setTimeout`-based lookahead scheduler (25ms interval, 100ms lookahead). Let `rAF` only read state and draw.

---

### Anti-Pattern 3: Reading Per-Track Frequency from AudioParam in rAF

**What people do:** Call `osc.frequency.value` inside the draw loop to find out where each track currently "is" for visualization.

**Why it's wrong:** `AudioParam.value` returns the current instantaneous value but does not reflect scheduled ramps mid-ramp in all implementations. It also introduces a tight coupling between the draw loop and the audio graph.

**Do this instead:** Maintain `TrackStateStore` as a separate lightweight object. `TrackManager` writes target values to it whenever it schedules a ramp. The draw loop reads from the store.

---

### Anti-Pattern 4: Multiple AudioContexts

**What people do:** Create a new `AudioContext` per chord play or per component mount.

**Why it's wrong:** Each `AudioContext` runs its own audio thread. Multiple contexts compete for system audio resources and can cause performance degradation or silent failures on some platforms.

**Do this instead:** One singleton `AudioContext` for the entire app lifetime (see Pattern 1).

---

### Anti-Pattern 5: Mixing Audio Concerns into React State

**What people do:** Store `OscillatorNode` references in React `useState` or `useReducer`. Trigger audio parameter changes inside `useEffect`.

**Why it's wrong:** React state changes trigger re-renders, which can cause audio scheduling jitter. `useEffect` timing is not sample-accurate.

**Do this instead:** Keep the audio engine entirely outside React state. React components call imperative methods on the audio engine (`TrackManager.setChord(notes)`). React holds only UI state (which mode, which chord name, etc.).

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| React UI ↔ TrackManager | Direct method call (imperative) | TrackManager is a module-level singleton, not a React service |
| TrackManager ↔ SynthTrack | Direct method call | TrackManager owns and coordinates SynthTrack instances |
| SynthTrack ↔ Web Audio graph | Web Audio API (AudioParam scheduling) | The only place AudioNode methods are called |
| TrackManager ↔ TrackStateStore | Direct write to plain object | No pub/sub needed; visualizer reads synchronously per frame |
| VisualizerCanvas ↔ AnalyserNode | `analyser.getByteTimeDomainData(buffer)` per frame | Buffer pre-allocated once outside rAF loop |
| VisualizerCanvas ↔ TrackStateStore | Direct read of plain object | No abstraction needed; same-process, same-thread |
| Renderer ↔ Main process (Electron IPC) | `contextBridge` / `ipcRenderer.invoke` | Only needed for native features (file access, OS menus) — not for audio |

### Build Order Implications

The component dependencies dictate this build sequence:

1. **`audioContext.ts` singleton** — no deps; everything else depends on this
2. **`SynthTrack.ts`** — depends only on AudioContext; the atomic audio unit
3. **`analyser.ts`** — depends on AudioContext; shared tap
4. **`TrackManager.ts`** — depends on SynthTrack + analyser + TrackStateStore
5. **`ChordScheduler.ts`** — depends on TrackManager; translates music theory to audio calls
6. **`trackState.ts` store** — no deps; can be initialized any time
7. **`radialView.ts` / `waveformView.ts`** — depend on TrackStateStore + AnalyserNode data shape; pure draw functions
8. **`VisualizerCanvas.tsx`** — depends on draw functions + `useAnimationLoop` hook
9. **`ChordPanel.tsx` / `ModeToggle.tsx`** — depend on ChordScheduler + TrackManager; React UI layer
10. **`App.tsx`** — wires everything together; AudioContext init on first user gesture
11. **`main.ts` / `preload.ts`** — Electron shell; can be scaffolded at any point independently

## Sources

- MDN Web Audio API — Visualizations: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API (HIGH confidence)
- MDN Web Audio API — Advanced Techniques: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques (HIGH confidence)
- MDN — AudioWorklet: https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet (HIGH confidence)
- Chrome for Developers — Audio Worklet Design Pattern: https://developer.chrome.com/blog/audio-worklet-design-pattern/ (HIGH confidence)
- Chrome for Developers — AudioWorklet available by default: https://developer.chrome.com/blog/audio-worklet (HIGH confidence)
- MDN — Background audio processing with AudioWorklet: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Using_AudioWorklet (HIGH confidence)
- Tone.js documentation (Context7 — High reputation source): https://tonejs.github.io/ (HIGH confidence — verified portamento and PolySynth patterns)
- Electron IPC documentation: https://www.electronjs.org/docs/latest/tutorial/ipc (HIGH confidence)
- Electron Process Model: https://www.electronjs.org/docs/latest/tutorial/process-model (HIGH confidence)

---
*Architecture research for: Electron + Web Audio synthesizer with real-time visualization (Schmidi)*
*Researched: 2026-02-18*
