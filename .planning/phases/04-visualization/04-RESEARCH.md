# Phase 4: Visualization - Research

**Researched:** 2026-02-20
**Domain:** Real-time Canvas 2D visualization, audio-reactive rendering, radial/waveform animation
**Confidence:** HIGH

## Summary

Phase 4 transforms Schmidi from a control-panel synthesizer into a visual instrument. The visualization must render 2-16 sliding track elements at 60fps, with proximity-based color intensity, convergence bloom effects, and two switchable view modes (radial convergence and waveform trace). The existing codebase already provides the data pipeline: `SlideEngine.getTrackStates()` returns per-track frequency, target, proximity, and state (idle/converging/held/departing) at 60fps via `useAnimationLoop` -> Zustand store. The visualization layer reads this data and paints the canvas.

Canvas 2D is the correct technology choice for this use case. The project has 2-8 primary track elements (not thousands of particles), and the glow/bloom effects can be achieved efficiently with pre-rendered radial gradient sprites and `globalCompositeOperation: 'lighter'` (additive blending). WebGL would add shader complexity with negligible benefit at this element count. Electron's Chromium provides hardware-accelerated Canvas 2D rendering on macOS, which is the primary target platform.

**Primary recommendation:** Use Canvas 2D with pre-rendered glow sprites, additive blending (`globalCompositeOperation: 'lighter'`), and per-track AnalyserNodes for waveform data. Structure as two standalone canvas components (RadialView, WaveformView) sharing a common data hook.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Per-track distinct hues (e.g. track 1 = cyan, track 2 = magenta) with proximity-mapped brightness/intensity
- Clean canvas with no reference geometry -- no pitch rings, no target markers, just the moving track elements
- Same color scheme across both views -- per-track hues with proximity-based brightness
- ~10 second time window for waveform trace showing the full arc of convergence
- Abstract presentation -- no pitch labels or note names on axes
- Full-viz toggle mode via hotkey or button -- hides all controls for performance/display view
- View-mode switch (radial vs waveform) lives on the canvas itself -- small toggle or icon
- Restyle the entire app to match the visualization aesthetic -- dark/glow treatment everywhere
- Bloom/flash at convergence moment -- dramatic, satisfying visual chord strike
- Flash then fade -- brief bloom at arrival, settles to steady glow while chord is held
- Bloom color blends converging tracks' hues -- chord's visual identity emerges from its voices
- Landscape (~16:9) target window aspect ratio

### Claude's Discretion
- Radial view element type (orbs, particles, lines, hybrid)
- Background aesthetic for both views
- Waveform visualization type
- Overall layout approach (overlay vs split vs sidebar)
- Whether keyboard shortcuts stay active in full-viz mode
- Chord arc placement (overlay vs separate zone)
- Waveform view convergence payoff style
- Exact animation timing, easing curves, frame budgeting
- Canvas rendering technology (Canvas 2D vs WebGL)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| VIZ-01 | Radial convergence view: tracks visualized as orbs/lines spiraling toward center as they converge on chord notes (60fps) | Canvas 2D with pre-rendered glow sprites, rAF loop, radial positioning math from SlideTrackState.proximity + currentFreq |
| VIZ-02 | Waveform trace view: colored waveform traces morph and align as pitches converge | Per-track AnalyserNodes with getByteTimeDomainData, rolling buffer for ~10s history, colored line rendering |
| VIZ-03 | User can switch between radial convergence and waveform trace visualization modes | React state toggle, conditional canvas rendering, shared data hook, no audio interruption |
| VIZ-04 | Visualization is the primary instrument UI, not a secondary display | Full-bleed canvas layout, controls as overlay/sidebar, full-viz toggle mode, dark/glow app restyle |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Canvas 2D API | Native | All visualization rendering | Sufficient for 2-16 elements with glow; GPU-accelerated in Electron/Chromium; no dependencies |
| Web Audio AnalyserNode | Native | Per-track waveform data extraction | Already in masterBus chain; can create per-oscillator analysers |
| React + useRef + useEffect | 19.x (existing) | Canvas lifecycle management | Existing pattern from Oscilloscope component |
| Zustand | 5.x (existing) | Visualization state (view mode, full-viz toggle) | Already manages all app state |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None | -- | -- | No additional dependencies needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Canvas 2D | WebGL/Three.js | Overkill for 2-16 elements; adds 500KB+ bundle; shader complexity for marginal gain |
| Canvas 2D | PixiJS | Abstraction layer not needed for direct draw calls; adds dependency |
| Manual rAF loop | react-spring/framer-motion | These target DOM animation, not canvas pixel painting |

**Installation:**
```bash
# No new packages needed -- all APIs are native browser/Web Audio
```

## Architecture Patterns

### Recommended Project Structure
```
src/renderer/
├── components/
│   ├── visualization/
│   │   ├── RadialView.tsx         # Radial convergence canvas
│   │   ├── WaveformView.tsx       # Waveform trace canvas
│   │   ├── VisualizationPanel.tsx  # View switcher + full-viz container
│   │   ├── ViewToggle.tsx          # Radial/Waveform toggle icon
│   │   └── vizColors.ts           # Track hue palette + proximity color math
│   ├── App.tsx                     # Modified: visualization-first layout
│   └── ... (existing components)
├── hooks/
│   ├── useVisualizationData.ts    # Extracts + formats track state for canvas
│   └── useAnimationLoop.ts        # Modified: also drives viz canvas refresh
├── audio/
│   ├── SlideTrack.ts              # Modified: optional per-track AnalyserNode
│   └── ... (existing)
└── store/
    └── synthStore.ts              # Modified: vizMode, fullViz state
```

### Pattern 1: Pre-Rendered Glow Sprite
**What:** Create a radial gradient circle on an offscreen canvas once, then draw it with `drawImage()` on each frame instead of re-creating the gradient.
**When to use:** Every frame for every track orb in the radial view.
**Example:**
```typescript
// Source: MDN Canvas Optimization + additive blending research
function createGlowSprite(size: number, hue: number, intensity: number): HTMLCanvasElement {
  const offscreen = document.createElement('canvas');
  offscreen.width = size;
  offscreen.height = size;
  const ctx = offscreen.getContext('2d')!;

  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  gradient.addColorStop(0, `hsla(${hue}, 100%, ${50 + intensity * 30}%, ${0.8 + intensity * 0.2})`);
  gradient.addColorStop(0.4, `hsla(${hue}, 90%, ${40 + intensity * 20}%, ${0.3 + intensity * 0.3})`);
  gradient.addColorStop(1, `hsla(${hue}, 80%, 20%, 0)`);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return offscreen;
}
```

### Pattern 2: Additive Blending for Bloom
**What:** Use `globalCompositeOperation: 'lighter'` to create natural glow overlap when tracks converge.
**When to use:** Convergence bloom moment -- when multiple track orbs overlap at the center.
**Example:**
```typescript
// Source: MDN globalCompositeOperation + research
function drawTrackOrbs(ctx: CanvasRenderingContext2D, tracks: TrackVizData[]) {
  // Normal drawing for track bodies
  ctx.globalCompositeOperation = 'source-over';
  for (const track of tracks) {
    ctx.drawImage(track.sprite, track.x - track.size/2, track.y - track.size/2);
  }

  // Additive blending for glow halos -- overlapping glows bloom naturally
  ctx.globalCompositeOperation = 'lighter';
  for (const track of tracks) {
    ctx.drawImage(track.glowSprite, track.x - track.glowSize/2, track.y - track.glowSize/2);
  }

  // Reset
  ctx.globalCompositeOperation = 'source-over';
}
```

### Pattern 3: Proximity-to-Color Mapping
**What:** Map `SlideTrackState.proximity` (0-1) to visual intensity -- brightness, size, glow radius.
**When to use:** Every frame for every track in both views.
**Example:**
```typescript
// Track hue palette (distinct per track)
const TRACK_HUES = [185, 300, 45, 120, 260, 30, 330, 160]; // cyan, magenta, gold, green, purple, orange, pink, teal

interface TrackVizData {
  hue: number;
  proximity: number;        // 0 (far) to 1 (arrived)
  brightness: number;       // derived: 30 + proximity * 60  (30% to 90%)
  saturation: number;       // derived: 60 + proximity * 40  (60% to 100%)
  size: number;             // derived: baseSize * (0.5 + proximity * 0.5)
  glowRadius: number;       // derived: baseGlow * proximity
  alpha: number;            // derived: 0.3 + proximity * 0.7
}

function computeTrackViz(trackState: SlideTrackState, trackIndex: number): TrackVizData {
  const hue = TRACK_HUES[trackIndex % TRACK_HUES.length];
  const p = trackState.proximity;
  return {
    hue,
    proximity: p,
    brightness: 30 + p * 60,
    saturation: 60 + p * 40,
    size: 20 * (0.5 + p * 0.5),
    glowRadius: 40 * p,
    alpha: 0.3 + p * 0.7,
  };
}
```

### Pattern 4: Radial Position from Frequency
**What:** Map track frequency to radial position -- center = target, outer = distant.
**When to use:** Radial view, every frame.
**Example:**
```typescript
// Map proximity to radial distance (1 = center, 0 = outer ring)
function trackToRadialPosition(
  track: SlideTrackState,
  canvasWidth: number,
  canvasHeight: number,
  trackIndex: number,
  totalTracks: number
): { x: number; y: number } {
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  const maxRadius = Math.min(canvasWidth, canvasHeight) * 0.4;

  // Distance from center: inversely proportional to proximity
  const dist = maxRadius * (1 - track.proximity);

  // Angle: based on track index + slight rotation from frequency for organic feel
  const baseAngle = (trackIndex / totalTracks) * Math.PI * 2;
  const freqWobble = Math.sin(track.currentFreq * 0.01) * 0.3;
  const angle = baseAngle + freqWobble;

  return {
    x: centerX + Math.cos(angle) * dist,
    y: centerY + Math.sin(angle) * dist,
  };
}
```

### Pattern 5: Rolling Waveform Buffer
**What:** Maintain a circular buffer of waveform samples per track for the ~10s time window.
**When to use:** Waveform trace view.
**Example:**
```typescript
// 60fps * 10 seconds = 600 frames of waveform snapshots
const WAVEFORM_HISTORY_FRAMES = 600;
const SAMPLES_PER_FRAME = 128; // Subset of AnalyserNode data per snapshot

class WaveformBuffer {
  private buffer: Float32Array;
  private writeHead = 0;

  constructor(private frames: number = WAVEFORM_HISTORY_FRAMES,
              private samplesPerFrame: number = SAMPLES_PER_FRAME) {
    this.buffer = new Float32Array(frames * samplesPerFrame);
  }

  push(data: Uint8Array): void {
    const offset = this.writeHead * this.samplesPerFrame;
    for (let i = 0; i < this.samplesPerFrame; i++) {
      this.buffer[offset + i] = (data[i] ?? 128) / 128 - 1; // Normalize to -1..1
    }
    this.writeHead = (this.writeHead + 1) % this.frames;
  }

  getOrderedData(): Float32Array {
    // Return frames in chronological order (oldest first)
    const result = new Float32Array(this.frames * this.samplesPerFrame);
    const startOffset = this.writeHead * this.samplesPerFrame;
    const endPortion = this.buffer.length - startOffset;
    result.set(this.buffer.subarray(startOffset), 0);
    result.set(this.buffer.subarray(0, startOffset), endPortion);
    return result;
  }
}
```

### Pattern 6: Per-Track AnalyserNode for Waveform View
**What:** Insert an AnalyserNode between each SlideTrack's oscillator and its gain chain to get per-track waveform data.
**When to use:** Waveform trace view needs individual track waveforms, not the mixed master output.
**Example:**
```typescript
// Modified SlideTrack audio graph:
// osc -> analyser -> swellGain -> trackGain -> masterGain
//
// The analyser taps the raw oscillator output before gain processing,
// giving a clean per-track waveform regardless of volume level.

// In SlideTrack constructor:
this.analyser = ctx.createAnalyser();
this.analyser.fftSize = 256; // 128 frequency bins, enough for visual
this.osc.connect(this.analyser);
this.analyser.connect(this.swellGain);
// (instead of osc.connect(swellGain) directly)
```

### Anti-Patterns to Avoid
- **Creating radial gradients every frame:** Use pre-rendered sprites. `createRadialGradient()` on every frame for every track is expensive.
- **Using `shadowBlur` for glow effects:** MDN explicitly warns this is a performance hog. Use radial gradient sprites + additive blending instead.
- **Reading `AudioParam.value` from the audio thread:** The codebase already avoids this (uses JS-side logical frequency tracking). The visualization layer must read from `SlideTrackState`, never from `oscillator.frequency.value`.
- **Full canvas clear + redraw when only positions changed:** For the radial view, clear the full canvas is acceptable (small element count), but avoid re-creating sprites or gradients.
- **Storing per-frame waveform data in Zustand:** Too much data (128 samples * N tracks * 60fps). Keep waveform buffers in a module-level ref, not reactive state.
- **Running two separate rAF loops (one for viz, one for state polling):** Consolidate into a single rAF loop. The existing `useAnimationLoop` already runs at 60fps; the canvas draw should be driven from the same loop or a separate rAF that reads from the same store.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Glow/bloom effects | Custom pixel manipulation or shadowBlur | Pre-rendered radial gradient sprites + `globalCompositeOperation: 'lighter'` | shadowBlur is expensive per MDN; pixel-level manipulation is CPU-bound |
| High-DPI canvas scaling | Manual devicePixelRatio math everywhere | A `useCanvasSetup` hook that handles DPR once on mount/resize | Easy to forget, causes blurry rendering on Retina displays |
| Waveform data from mixed audio | Trying to separate tracks from master AnalyserNode | Per-track AnalyserNodes inserted into each SlideTrack | Unmixing FFT data is impossible; individual taps are trivial |
| Color blending for convergence bloom | Manual RGB math for multi-track color mixing | Additive blending via `globalCompositeOperation: 'lighter'` | The compositing engine handles overlap blending in hardware |
| Smooth canvas resize handling | Manual resize listeners with debounce | ResizeObserver on the canvas container + redraw on size change | Native API, handles all resize triggers (window, fullscreen, layout shift) |

**Key insight:** Canvas 2D's compositing operations (especially `'lighter'` for additive blending) give us the bloom/glow aesthetic for free when overlapping pre-rendered gradient sprites. This is far more performant than shadowBlur or manual pixel operations.

## Common Pitfalls

### Pitfall 1: Blurry Canvas on Retina/HiDPI Displays
**What goes wrong:** Canvas looks blurry because CSS pixels and canvas pixels don't match on HiDPI screens.
**Why it happens:** Default canvas pixel ratio is 1:1 with CSS pixels, but macOS Retina is 2x or 3x.
**How to avoid:** Scale canvas buffer size by `devicePixelRatio`, then CSS-scale it back down:
```typescript
const dpr = window.devicePixelRatio || 1;
canvas.width = rect.width * dpr;
canvas.height = rect.height * dpr;
ctx.scale(dpr, dpr);
canvas.style.width = `${rect.width}px`;
canvas.style.height = `${rect.height}px`;
```
**Warning signs:** Visualization looks fuzzy or aliased despite correct sizes.

### Pitfall 2: Canvas Resize Causes Flicker/Clear
**What goes wrong:** Changing `canvas.width` or `canvas.height` clears the entire canvas and resets all context state (transforms, styles, compositing mode).
**Why it happens:** This is by spec -- setting width/height is a full reset.
**How to avoid:** Only resize when the container actually changes size (use ResizeObserver), not on every frame. Restore context state after resize.
**Warning signs:** Canvas goes blank briefly on window resize.

### Pitfall 3: Memory Leak from Unreleased AnalyserNodes
**What goes wrong:** Per-track AnalyserNodes accumulate if tracks are dynamically created/disposed without disconnecting.
**Why it happens:** `SlideTrack.dispose()` needs to also disconnect the analyser.
**How to avoid:** Add `this.analyser.disconnect()` to `SlideTrack.dispose()`. Verify with Chrome DevTools Audio panel.
**Warning signs:** Audio graph node count grows over time.

### Pitfall 4: Waveform Buffer Causes GC Pressure
**What goes wrong:** Allocating new `Uint8Array` or `Float32Array` every frame triggers garbage collection pauses.
**Why it happens:** `new Uint8Array(bufferLength)` inside the rAF loop.
**How to avoid:** Pre-allocate all typed arrays once and reuse them. The existing Oscilloscope component already does this correctly.
**Warning signs:** Periodic micro-stutters every few seconds (GC pause).

### Pitfall 5: Canvas Compositing Mode Leaks
**What goes wrong:** Setting `globalCompositeOperation = 'lighter'` for bloom but forgetting to reset to `'source-over'` causes all subsequent draws to use additive blending.
**Why it happens:** Canvas context state is global and persists between draw calls.
**How to avoid:** Always bracket compositing mode changes: set before bloom draws, reset immediately after.
**Warning signs:** Everything looks washed out or over-bright.

### Pitfall 6: Full-Viz Toggle Breaks Keyboard Input
**What goes wrong:** Hiding all controls removes focused elements, and keyboard shortcuts stop working.
**Why it happens:** If the chord targeting buttons are removed from DOM, key handlers may lose context.
**How to avoid:** Keyboard handlers (`useSlideKeyboard`, `useChordKeyboard`) are already global `document.addEventListener` -- they work regardless of visible controls. Verify in full-viz mode.
**Warning signs:** Keys unresponsive after toggling full-viz mode.

### Pitfall 7: Two rAF Loops Fighting for Frame Budget
**What goes wrong:** Having separate rAF loops for state polling and canvas rendering can cause frame skips.
**Why it happens:** Each rAF callback must complete within ~16ms. Two independent loops may not coordinate.
**How to avoid:** Either consolidate into one rAF loop, or ensure the canvas rendering reads from Zustand store (which is updated by the existing rAF loop) and does its own rAF independently. The store read is cheap; the rendering is the expensive part.
**Warning signs:** Inconsistent frame timing, 30fps instead of 60fps.

## Code Examples

Verified patterns from official sources:

### Canvas Setup with HiDPI Support
```typescript
// Source: MDN Canvas Optimization guide
function setupCanvas(canvas: HTMLCanvasElement, container: HTMLElement): CanvasRenderingContext2D {
  const dpr = window.devicePixelRatio || 1;
  const rect = container.getBoundingClientRect();

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;

  const ctx = canvas.getContext('2d', { alpha: false })!; // Opaque for perf
  ctx.scale(dpr, dpr);
  return ctx;
}
```

### Convergence Bloom Effect
```typescript
// Flash + fade bloom at convergence moment
// Triggered when track transitions from 'converging' to 'held'
function drawConvergenceBloom(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  blendedHue: number,    // Weighted average of converging track hues
  bloomPhase: number,     // 0 = just arrived, 1 = fully faded
  maxRadius: number
): void {
  if (bloomPhase >= 1) return;

  const radius = maxRadius * (0.5 + bloomPhase * 0.5); // Expands outward
  const alpha = 1 - bloomPhase; // Fades out

  ctx.globalCompositeOperation = 'lighter';

  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, `hsla(${blendedHue}, 100%, 90%, ${alpha * 0.8})`);
  gradient.addColorStop(0.3, `hsla(${blendedHue}, 100%, 70%, ${alpha * 0.4})`);
  gradient.addColorStop(1, `hsla(${blendedHue}, 80%, 40%, 0)`);

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalCompositeOperation = 'source-over';
}
```
Note: The bloom gradient is created per-frame but only when bloom is active (brief flash, ~300ms). This is acceptable since it only fires on chord convergence events, not every frame.

### Waveform Trace Rendering (Per-Track)
```typescript
// Source: MDN Web Audio API Visualizations
function drawWaveformTrace(
  ctx: CanvasRenderingContext2D,
  data: Float32Array,          // Normalized -1..1 waveform data
  width: number,
  height: number,
  yOffset: number,             // Vertical position for this track
  hue: number,
  proximity: number            // 0-1, affects brightness
): void {
  const brightness = 40 + proximity * 50;
  const alpha = 0.4 + proximity * 0.6;

  ctx.strokeStyle = `hsla(${hue}, 90%, ${brightness}%, ${alpha})`;
  ctx.lineWidth = 1 + proximity; // Thicker when converged
  ctx.beginPath();

  const sliceWidth = width / data.length;
  let x = 0;

  for (let i = 0; i < data.length; i++) {
    const amplitude = data[i] * (30 + proximity * 20); // Scale with proximity
    const y = yOffset + amplitude;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
    x += sliceWidth;
  }

  ctx.stroke();
}
```

## Design Recommendations (Claude's Discretion Areas)

### Radial View: Orb Elements (Recommended)
Soft glowing orbs (radial gradient circles) are the best fit for showing convergence:
- Position = distance from center (proximity-mapped)
- Size = grows as proximity increases
- Brightness/saturation = proximity-mapped (warm/bright on approach, cool/dim on drift)
- Glow halo = additive blending creates natural bloom when orbs overlap at center
- Motion trail: brief fading afterimage using reduced-alpha clear (`fillRect` with semi-transparent black instead of full `clearRect`)

### Background: Subtle Radial Gradient Void
- Near-black center (`#08080c`) fading to slightly lighter edges (`#0f0f18`)
- Creates depth/focus toward center where convergence happens
- Consistent across both views

### Waveform View: Oscilloscope Traces (Recommended)
- Per-track colored waveform lines showing ~10s of time-domain data
- Traces stack vertically with slight offset (not overlapping)
- Proximity affects line brightness, thickness, and amplitude scaling
- As tracks converge, waveforms visually align (same frequency = same shape)
- Convergence payoff: waveforms briefly flash bright + thicken when tracks arrive at target

### Layout: Canvas + Collapsible Side Controls
- Canvas fills the entire center area (replaces SlideModeUI center section)
- Left and right control columns remain but can be collapsed
- Full-viz mode hides sidebars + mode toggle + status bar, leaving only the canvas
- View toggle (radial/waveform icon) overlays top-right corner of canvas
- Chord buttons overlay bottom of canvas (small, semi-transparent)

### Keyboard Shortcuts in Full-Viz Mode: Keep Active
- All chord key shortcuts (A S D F G H J) remain active in full-viz mode
- This is the "performance view" -- playing the instrument with visualization only
- No visual controls, just the canvas and keyboard input

### Chord Arc Placement: Overlay Bottom of Canvas
- Small, semi-transparent chord degree indicators at bottom of visualization
- Shows which chord is active and available targets
- Fades partially in full-viz mode or disappears entirely

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| shadowBlur for glow | Pre-rendered sprites + additive blending | Long-standing best practice | 5-10x faster for multiple glowing elements |
| setInterval for animation | requestAnimationFrame | ~2012+ | Syncs with display refresh, saves battery |
| Full canvas clear every frame | Partial clear or semi-transparent overlay | Long-standing | Better for motion trails, marginal perf gain |
| Single master AnalyserNode | Per-source AnalyserNodes | Always available in Web Audio API | Individual track visualization possible |
| Canvas 2D for everything | WebGL for 1000+ elements | Threshold varies | Canvas 2D fine for <100 elements on modern hardware |

**Deprecated/outdated:**
- `CanvasRenderingContext2D.mozDash` / vendor prefixes: use standard `setLineDash()` instead
- `webkitRequestAnimationFrame`: standard `requestAnimationFrame` universally supported in Electron

## Open Questions

1. **Per-Track AnalyserNode Performance Impact**
   - What we know: Adding an AnalyserNode per SlideTrack adds nodes to the audio graph. Each AnalyserNode performs FFT computation.
   - What's unclear: With 2-8 tracks, the overhead should be minimal, but unconfirmed at 16 spawned tracks (Model C).
   - Recommendation: Add AnalyserNodes conditionally (only when waveform view is active). Lazy creation pattern. Profile after implementation if >4 tracks.

2. **Bloom Gradient Performance During Flash**
   - What we know: Creating `createRadialGradient()` is more expensive than `drawImage()`, but bloom only fires on convergence events (not every frame).
   - What's unclear: If all tracks converge simultaneously and all bloom at once, could there be a frame drop?
   - Recommendation: Acceptable risk. Bloom lasts ~300ms per event, and simultaneous convergence is the desired dramatic moment. If profiling shows issues, pre-render bloom sprites at multiple sizes.

3. **Waveform Buffer Memory at 16 Tracks**
   - What we know: 600 frames * 128 samples * 4 bytes * 16 tracks = ~4.9MB of Float32Array buffers.
   - What's unclear: Whether this causes memory pressure in Electron renderer process.
   - Recommendation: 5MB is trivial for a desktop Electron app. Not a concern.

## Sources

### Primary (HIGH confidence)
- [MDN Canvas Optimization Guide](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas) - shadowBlur avoidance, offscreen canvas, integer coordinates, layered canvases
- [MDN Web Audio Visualizations](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API) - AnalyserNode setup, getByteTimeDomainData/getByteFrequencyData, canvas draw patterns
- [MDN globalCompositeOperation](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation) - 'lighter' additive blending for glow
- [MDN shadowBlur](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/shadowBlur) - performance warning

### Secondary (MEDIUM confidence)
- [web.dev Canvas Performance](https://web.dev/canvas-performance/) - pre-rendering, batching, avoiding state changes
- [Chrome 2D Canvas GPU Acceleration](https://developer.chrome.com/blog/taking-advantage-of-gpu-acceleration-in-the-2d-canvas) - drawImage is GPU-accelerated, thresholds for GPU benefit
- [Semi/Signal Canvas 2D vs WebGL Performance](https://semisignal.com/a-look-at-2d-vs-webgl-canvas-performance/) - Canvas 2D competitive with WebGL at low element counts, especially on macOS

### Tertiary (LOW confidence)
- WebSearch results on Electron GPU acceleration: Linux may have issues, macOS is reliable. Unverified for Electron 40.x specifically.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Canvas 2D is native, no dependencies, verified patterns from MDN
- Architecture: HIGH - Builds directly on existing SlideTrackState data pipeline and Oscilloscope component pattern
- Pitfalls: HIGH - Well-documented Canvas 2D gotchas from MDN; HiDPI and compositing issues are standard knowledge
- Waveform per-track AnalyserNode: MEDIUM - Standard Web Audio API pattern but unverified at scale in this specific app
- Performance at 16 tracks: MEDIUM - Should be fine based on element count, but needs profiling confirmation

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (stable -- Canvas 2D and Web Audio APIs are mature, no breaking changes expected)
