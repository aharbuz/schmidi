# Phase 5: Instrument Personality - Research

**Researched:** 2026-02-20
**Domain:** Preset-driven parameter bundling, scale-snapped pitch quantization (tonal library), Web Audio API drone synthesis, post-arrival behavior modes, Zustand store extension, overlay UI on visualization canvas
**Confidence:** HIGH (existing codebase analyzed directly; tonal API verified via Context7; Web Audio patterns verified against Phase 3 engine)

## Summary

Phase 5 adds the configurability layer that transforms Schmidi from a technical demo into an expressive instrument. The core engineering task is building a **preset system** that bundles many existing `SlideConfig` parameters into four distinct personality profiles (Eerie, Bloom, Swarm, Custom) with an intensity slider, plus implementing three features that are currently stubbed or missing in the engine: **post-arrival cycling** (Hold vs Cycle modes), **pre-press idle mode** (Silent, Quiet Sliding, Ambient Drone), and **scale-snapped glissando** (magnetic snap to diatonic degrees).

The good news: the existing `SlideEngine` and `SlideTrack` classes already have the parameter infrastructure for most of this. `SlideConfig` already declares `pitchMovement: 'continuous' | 'scale-snapped'`, `idleRangeType: 'stay-in-scale'`, `autoCycle`, `holdDuration`, `microMotion`, and `idleVolume`. Phase 5 fills in the implementations behind these stubs and adds the preset layer on top. No new npm dependencies are needed -- `tonal`'s `Scale.degrees()` + `Note.freq()` provides all scale pitch data for the snap algorithm.

The UI work splits into two areas: (1) preset buttons + intensity slider floating on the visualization canvas, and (2) reorganized advanced controls in the existing right-column `SlideControls` panel that expose the per-parameter overrides.

**Primary recommendation:** Build a `PresetEngine` module that maps preset name + intensity to concrete `SlideConfig` partial objects, implement scale-snap logic as a frequency quantizer function in the music/ layer, implement the three idle modes and two post-arrival modes as engine state branches, then wire preset buttons into the VisualizationPanel overlay and extend SlideControls for advanced overrides.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Slide Character Presets:**
- 4 presets: **Eerie**, **Bloom**, **Swarm**, **Custom**
- Each preset bundles multiple SlideConfig values (track correlation, movement speed, convergence easing, idle volume, post-arrival mode, idle mode, scale-snap, micro-vibrato, etc.)
- **Eerie**: Slow and creepy -- low movement speed, wide pitch range, independent tracks, horror-film pitch bending feel
- **Bloom**: Lush sweeping convergence -- Claude decides between parallel sweep (orchestral) or inward focus (cinematic)
- **Swarm**: Chaotic energy -- Claude decides track count and erratic behavior parameters
- **Custom** preset activates automatically when any advanced control is tweaked; can also be manually selected
- Each preset has an **intensity slider** that scales how extreme the effect is (subtle to extreme)
- Switching presets sets defaults for ALL personality parameters (post-arrival mode, idle mode, scale-snap, micro-vibrato behavior, etc.); player can override any via advanced controls

**Viz Overlay UI:**
- **Only preset buttons + intensity slider** float on the visualization canvas
- All other controls (post-arrival mode, idle mode, scale picker, convergence speed, track count, etc.) live in the controls panel as advanced options
- Preset switching behavior (immediate vs next-chord): Claude's discretion

**Post-Arrival Behavior:**
- **Two modes** (not three -- converge-then-restart was cut as too similar to cycle):
  - **Hold**: Tracks arrive at chord notes and stay until chord is released
  - **Cycle**: Tracks arrive, briefly hold, depart, and auto-reconverge to the same chord targets (breathing/pulsing feel)
- Each preset sets a default post-arrival mode; player can override in advanced controls
- Cycle touch duration (how long tracks hold before departing) is preset-dependent and configurable in advanced
- Micro-vibrato when held is preset-dependent: eerie = still (creepy), bloom = warm vibrato, swarm = jittery micro-motion; configurable in advanced
- Mid-performance mode switching behavior: Claude's discretion (avoid audio glitches)

**Pre-Press Idle Mode:**
- **Three modes**, bundled into presets (not a separate selector on viz):
  - **Silent**: Tracks move visually but produce no sound; orbs are visually diminished (smaller radius, reduced brightness)
  - **Quiet sliding**: Current behavior -- tracks drift at low volume (~0.1). Volume level varies per preset
  - **Ambient drone**: Claude designs the drone sound based on what complements the convergence mechanic
- Each preset defines its default idle mode; overridable in advanced controls

**Scale-Snapped Glissando:**
- **Magnetic snap** feel: continuous glide that gravitates toward scale degrees, spending more time on in-scale pitches (not discrete jumps)
- Uses a **separate scale picker** that defaults to the active key/mode but can be decoupled and set independently
- Scale picker lives in the advanced controls panel
- Scale-snap on/off is preset-bundled with advanced override
- **Staircase convergence**: when scale-snap is on, convergence to chord targets also steps through scale degrees (harp-like cascading approach), not smooth glide
- Implements the currently-stubbed `pitchMovement: 'scale-snapped'` and `idleRangeType: 'stay-in-scale'` in SlideTrack/SlideEngine

### Claude's Discretion
- Bloom preset: parallel sweep vs inward focus character
- Swarm preset: track count and specific parameter values
- Preset switching timing (immediate vs next chord press)
- Ambient drone sound design
- Mid-performance mode switching behavior
- Intensity slider interpolation math
- Exact UI layout/positioning of overlay elements
- Which advanced controls to expose vs keep internal

### Deferred Ideas (OUT OF SCOPE)
- Hiding/collapsing the advanced controls panel entirely (user mentioned "maybe we'll allow them to be hidden later")
- Additional presets beyond the initial 4
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SLIDE-06 | User can configure slide character: eerie convergence (independent wandering) vs smooth bloom (lush sweeping) | Preset engine maps Eerie/Bloom/Swarm/Custom to concrete SlideConfig bundles; intensity slider scales parameter values via interpolation; existing `updateConfig()` applies changes to engine |
| SLIDE-07 | User can configure convergence behavior: converge-then-restart, converge-and-hold, or continuous cycle | CONTEXT.md narrowed to two modes (Hold + Cycle); Hold = existing `holdDuration: Infinity` behavior; Cycle = engine auto-departs + re-converges to same targets; uses existing `autoCycle` flag + new cycle-specific scheduling in `onTrackArrival` |
| SLIDE-08 | User can configure pre-press behavior: silent until pressed, always sliding quietly, or ambient drone | Three idle modes: Silent = `idleVolume: 0` + visual-only flag for dimmed orbs; Quiet sliding = current behavior with preset-varying `idleVolume`; Ambient drone = additional drone oscillator layer in SlideEngine |
| SLIDE-09 | User can toggle scale-snapped glissando (slides step through diatonic scale degrees instead of continuous pitch) | tonal `Scale.degrees()` + `Note.freq()` generates full scale frequency table; magnetic-snap quantizer applies gravitational pull toward nearest scale degree; staircase convergence replaces smooth ramp with stepped setValueCurveAtTime |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tonal | ^6.4.3 | Scale degree frequency generation for pitch snapping | Already in project; `Scale.degrees("C4 major")(n)` + `Note.freq()` generates scale frequencies across octaves without hand-rolling interval math |
| Web Audio API | (browser) | Drone oscillator synthesis, AudioParam scheduling for stepped ramps | Already the audio foundation; no alternatives needed |
| Zustand | ^5.0.11 | Preset state, active preset name, intensity value, idle mode, post-arrival mode | Already the store; extend existing `synthStore` with preset-related state |
| React | ^19 | Preset overlay buttons, advanced controls UI | Already the UI layer |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Tailwind CSS | ^4.1 | Overlay button styling, glow effects for active preset | Already used for all UI; continue dark/glow aesthetic from Phase 4 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| tonal Scale.degrees | Hand-rolled scale frequency table | Scale.degrees handles octave wrapping, accidentals, all 8 modes automatically; hand-rolling would duplicate tonal's exact logic |
| SlideConfig preset bundles | Separate PresetConfig type | Reusing SlideConfig means `updateConfig()` works unchanged; separate type would require translation layer |
| Zustand for preset state | React local state | Preset must be accessible by engine (for mid-switch coordination) and by visualization (for orb dimming); Zustand is the cross-component bridge |

**Installation:**
No new packages needed. Everything builds on existing `tonal`, `zustand`, `react`, `tailwindcss`.

---

## Architecture Patterns

### Recommended Project Structure
```
src/renderer/
├── audio/
│   ├── SlideEngine.ts          # MODIFY: idle mode logic, cycle mode, drone oscillator
│   ├── SlideTrack.ts           # MODIFY: scale-snap frequency ramps, staircase convergence
│   └── presets.ts              # NEW: preset definitions + intensity interpolation
├── music/
│   ├── scaleFrequencies.ts     # NEW: scale frequency table generation using tonal
│   └── chordEngine.ts          # existing (no changes)
├── store/
│   └── synthStore.ts           # MODIFY: add preset state, idle mode, post-arrival mode
├── components/
│   ├── SlideControls.tsx        # MODIFY: add advanced personality controls (idle mode, post-arrival, scale picker)
│   └── visualization/
│       └── VisualizationPanel.tsx  # MODIFY: add preset overlay buttons + intensity slider
```

### Pattern 1: Preset as Config Snapshot
**What:** Each preset is a function `(intensity: number) => Partial<SlideConfig>` that returns the bundled parameter values scaled by intensity (0-1).
**When to use:** Always -- this is the core abstraction for the preset system.
**Example:**
```typescript
// Source: project-specific design based on existing SlideConfig
type PresetFn = (intensity: number) => Partial<SlideConfig>;

const EERIE_PRESET: PresetFn = (intensity) => ({
  trackCorrelation: 'independent',
  movementSpeed: lerp(1.0, 0.5, intensity),    // slower at higher intensity
  convergenceEasing: 'ease-out',
  convergenceDuration: lerp(1.5, 3.0, intensity), // longer at higher intensity
  idleVolume: lerp(0.08, 0.03, intensity),      // quieter at higher intensity
  microMotion: false,                             // eerie = still/creepy
  microMotionDepth: 0,
  autoCycle: false,                               // hold mode default
  holdDuration: Infinity,
  pitchMovement: 'continuous',
  idleMovementMode: 'slow-drift',
  movementSpeedVariation: lerp(0.3, 0.6, intensity),
  // ... additional parameters
});

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
```

### Pattern 2: Custom Preset Auto-Activation
**What:** When any advanced control changes a value that differs from the current preset's computed value, the active preset switches to "Custom" automatically.
**When to use:** Every `updateSlideConfig` call from advanced controls.
**Example:**
```typescript
// In synthStore, wrap updateSlideConfig to detect preset divergence
updateSlideConfig: (partial) => {
  const { slideConfig, activePreset, presetIntensity } = get();
  const newConfig = { ...slideConfig, ...partial };

  // Check if the new config matches the active preset
  if (activePreset !== 'custom') {
    const presetConfig = getPresetConfig(activePreset, presetIntensity);
    const diverged = Object.keys(partial).some(
      key => partial[key] !== presetConfig[key]
    );
    if (diverged) {
      set({ activePreset: 'custom' });
    }
  }

  slideEngineRef?.updateConfig(partial);
  set({ slideConfig: newConfig });
},
```

### Pattern 3: Scale Frequency Table (Precomputed)
**What:** Generate a sorted array of all scale degree frequencies across the engine's pitch range (C2-C6) once on key/mode/scale change, not per-tick.
**When to use:** On key change, mode change, or scale picker change. SlideEngine holds the table for tick-time lookups.
**Example:**
```typescript
// Source: tonal Scale.degrees() + Note.freq() (verified via Context7)
import { Scale, Note } from 'tonal';

function buildScaleFrequencyTable(
  key: string,
  mode: string,
  lowOctave: number = 2,
  highOctave: number = 6
): number[] {
  const scaleName = `${key}${lowOctave} ${mode}`;
  const degreeFn = Scale.degrees(scaleName);
  const scaleSize = Scale.get(`${key} ${mode}`).notes.length; // 7 for diatonic

  const freqs: number[] = [];
  const totalDegrees = (highOctave - lowOctave) * scaleSize + 1;

  for (let d = 1; d <= totalDegrees; d++) {
    const noteName = degreeFn(d);
    if (!noteName) continue;
    const freq = Note.freq(noteName);
    if (freq !== null) freqs.push(freq);
  }

  return freqs; // Already sorted ascending (scale degrees are monotonic)
}
```

### Pattern 4: Magnetic Snap Quantizer
**What:** Instead of hard-snapping to nearest scale degree (which produces discrete jumps), apply gravitational pull that increases near scale degrees. The track frequency is interpolated between the "free" target and the nearest scale degree based on proximity.
**When to use:** In `scheduleIdleMotion` and convergence frequency computation when `pitchMovement === 'scale-snapped'`.
**Example:**
```typescript
// Magnetic snap: spend more time near scale degrees, glide quickly between them
function magneticSnap(
  freeFreq: number,
  scaleFreqs: number[],
  snapStrength: number = 0.8  // 0 = no snap, 1 = hard snap
): number {
  // Binary search for nearest scale degree
  const nearest = findNearestScaleFreq(freeFreq, scaleFreqs);
  const distSemitones = Math.abs(Math.log2(freeFreq / nearest) * 12);

  // Gravitational pull: stronger when closer to a scale degree
  // Using inverse-square-like curve: pull = 1 / (1 + dist^2)
  const pull = 1 / (1 + distSemitones * distSemitones);
  const effectivePull = pull * snapStrength;

  // Interpolate in log-frequency space
  const logFree = Math.log2(freeFreq);
  const logNearest = Math.log2(nearest);
  return Math.pow(2, logFree + (logNearest - logFree) * effectivePull);
}
```

### Pattern 5: Staircase Convergence via setValueCurveAtTime
**What:** When scale-snap is on during convergence, replace the smooth ramp with a stepped curve that dwells on each scale degree between current position and target.
**When to use:** In `SlideTrack.scheduleFrequencyRamp` when pitchMovement is 'scale-snapped' and state is 'converging'.
**Example:**
```typescript
// Build staircase curve through scale degrees
function buildStaircaseCurve(
  startFreq: number,
  targetFreq: number,
  scaleFreqs: number[],
  curveLength: number = 512
): Float32Array {
  // Find scale degrees between start and target
  const ascending = targetFreq > startFreq;
  const steps = scaleFreqs.filter(f =>
    ascending ? (f >= startFreq && f <= targetFreq) : (f <= startFreq && f >= targetFreq)
  );
  if (!ascending) steps.reverse();

  // Ensure start and target are included
  if (steps.length === 0 || steps[0] !== startFreq) steps.unshift(startFreq);
  if (steps[steps.length - 1] !== targetFreq) steps.push(targetFreq);

  const curve = new Float32Array(curveLength);
  const samplesPerStep = Math.floor(curveLength / steps.length);

  for (let i = 0; i < curveLength; i++) {
    const stepIndex = Math.min(Math.floor(i / samplesPerStep), steps.length - 1);
    curve[i] = steps[stepIndex];
  }

  return curve;
}
```

### Pattern 6: Ambient Drone via Detuned Oscillator Stack
**What:** The drone idle mode creates a pad-like sound using 2-3 low-volume, slightly detuned oscillators on the root note. The drone fades out when a chord is pressed (convergence takes over) and fades back in on release.
**When to use:** When `idleMode === 'ambient-drone'`.
**Example:**
```typescript
// Drone: 2-3 detuned oscillators at root frequency, very low volume
// Connected to a separate droneGain node for independent volume control
class DroneLayer {
  private oscs: OscillatorNode[] = [];
  private droneGain: GainNode;
  private ctx: AudioContext;

  constructor(ctx: AudioContext, masterGain: GainNode, rootFreq: number) {
    this.ctx = ctx;
    this.droneGain = ctx.createGain();
    this.droneGain.gain.setValueAtTime(0, ctx.currentTime);
    this.droneGain.connect(masterGain);

    const detunes = [0, 7, -5]; // cents offset for warmth
    for (const detune of detunes) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(rootFreq, ctx.currentTime);
      osc.detune.setValueAtTime(detune, ctx.currentTime);
      osc.connect(this.droneGain);
      osc.start();
      this.oscs.push(osc);
    }
  }

  fadeIn(targetVolume: number, duration: number = 0.5): void {
    const g = this.droneGain.gain;
    g.cancelScheduledValues(this.ctx.currentTime);
    g.setValueAtTime(g.value, this.ctx.currentTime);
    g.linearRampToValueAtTime(targetVolume, this.ctx.currentTime + duration);
  }

  fadeOut(duration: number = 0.3): void {
    const g = this.droneGain.gain;
    g.cancelScheduledValues(this.ctx.currentTime);
    g.setValueAtTime(g.value, this.ctx.currentTime);
    g.linearRampToValueAtTime(0, this.ctx.currentTime + duration);
  }
}
```

### Anti-Patterns to Avoid
- **Recomputing scale frequency table on every tick:** Build once on key/mode/scale change, store in engine. The tick loop only does binary search lookups.
- **Stopping/starting oscillators for drone on/off:** Use gain fading (same persistent-oscillator pattern as SlideTrack). Stop/start causes clicks.
- **Hard-snapping pitch to scale degrees:** Produces jarring discrete jumps. The magnetic-snap approach creates the "harp-like" feel the user wants while keeping motion continuous.
- **Applying preset changes to individual config fields sequentially:** Apply as a single `updateConfig(presetPartial)` call to avoid intermediate states where half the preset is applied.
- **Duplicate idle mode logic across SlideEngine methods:** The idle mode should be a single check point in `scheduleIdleMotion` and `convergeTo`, not scattered throughout.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Scale degree frequencies across octaves | Manual interval arithmetic from root | `Scale.degrees("C4 major")(n)` + `Note.freq()` from tonal | Handles all 8 modes, accidentals, octave wrapping automatically; already verified in Phase 2 chord engine |
| Nearest scale degree lookup | Linear scan through all scale freqs every tick | Binary search on pre-sorted frequency array | O(log n) vs O(n) per track per tick; with 4 octaves x 7 degrees = 28 entries, not huge but discipline matters |
| Interpolation between preset extremes | Custom easing per parameter | Simple `lerp(low, high, intensity)` for most, with optional easing for perceptually nonlinear params | Most parameters scale linearly; only a few (like movement speed) benefit from exponential curves |

**Key insight:** The preset system is NOT a new abstraction layer -- it's a convenience mapping from `(presetName, intensity)` to a `Partial<SlideConfig>` that feeds directly into the existing `updateConfig()` pipeline. No engine changes needed for presets themselves; only for the three new behaviors (scale-snap, cycle mode, drone mode).

---

## Common Pitfalls

### Pitfall 1: Audio Glitches on Preset Switch
**What goes wrong:** Switching presets changes many SlideConfig values simultaneously. If tracks are mid-convergence, abrupt parameter changes (especially convergence duration, easing) cause audible artifacts.
**Why it happens:** The engine's `updateConfig()` applies changes immediately, but in-flight ramps were scheduled with previous parameters.
**How to avoid:** On preset switch, let in-flight convergences complete with their current parameters. Apply new parameters only to idle tracks immediately and to converging tracks on their next state transition. Or: cancel all ramps and re-schedule from current position with new parameters (same pattern as `convergeTo` interrupt-retarget).
**Warning signs:** Clicks, pitch jumps, or gain discontinuities when clicking preset buttons rapidly.

### Pitfall 2: Scale Frequency Table Stale After Key/Mode Change
**What goes wrong:** Player changes key from C to D but the scale frequency table still has C major degrees. Tracks snap to wrong pitches.
**Why it happens:** The table rebuild trigger is missing or delayed.
**How to avoid:** Rebuild the scale frequency table in the same `setKey()` / `setMode()` store actions that already call `slideEngineRef.setRootFreq()`. Add a `setScaleFrequencies()` method on SlideEngine. Also rebuild when the scale picker (separate from key/mode) changes.
**Warning signs:** Tracks snapping to pitches that don't belong to the current key/mode.

### Pitfall 3: Cycle Mode Creates Infinite Convergence
**What goes wrong:** In Cycle mode, tracks depart and reconverge to the same chord targets. If departure direction is 'continue' (past target), the next convergence starts from far away, creating very long ramps that feel sluggish. Or: departure and reconvergence overlap, creating a mushy never-arriving effect.
**Why it happens:** Cycle touch duration and departure fade time interact. If departure fade > cycle period, tracks never fully depart before reconverging.
**How to avoid:** Cycle touch duration must be > departure fade time. Reconvergence should only trigger after departure fade completes and track is in 'idle' state. Use the existing state machine: held -> departing -> idle -> converging (don't shortcut).
**Warning signs:** Tracks never reaching full held volume, or never producing the "breathing" effect.

### Pitfall 4: Drone Layer Not Cleaned Up
**What goes wrong:** Switching from ambient-drone to another idle mode leaves drone oscillators running at 0 gain, consuming resources.
**Why it happens:** Forgot to call `dispose()` on the DroneLayer when switching idle modes.
**How to avoid:** DroneLayer should have a `dispose()` method that stops all oscillators and disconnects nodes. Call it when idle mode changes away from 'ambient-drone'. Or: keep the drone layer persistent (like SlideTrack oscillators) and just fade gain to 0 -- simpler lifecycle management.
**Warning signs:** Growing CPU usage over time, AudioContext node count increasing.

### Pitfall 5: Silent Mode Breaks Visualization
**What goes wrong:** Setting `idleVolume: 0` for silent mode makes tracks invisible in the radial view because orb brightness is derived from gain.
**Why it happens:** RadialView uses `proximity` (which is gain-correlated) for visual properties.
**How to avoid:** In silent mode, tracks still report their position via `getTrackStates()`. The visualization must check for the silent idle mode flag and render dimmed orbs based on position alone, not gain. Add an `idleMode` field to `SlideTrackState` (or a store-level flag) so the visualization knows to use the dimmed visual style.
**Warning signs:** Orbs disappearing entirely in silent mode instead of being dimmed.

---

## Code Examples

Verified patterns from official sources and the existing codebase:

### Scale Degree Frequency Table Generation
```typescript
// Source: tonal Context7 docs (Scale.degrees, Note.freq)
import { Scale, Note } from 'tonal';

/**
 * Build a sorted frequency table of all scale degrees
 * within the engine's pitch boundaries.
 */
export function buildScaleFrequencyTable(
  key: string,
  mode: string,
  lowFreq: number = 65.41,  // C2
  highFreq: number = 1046.5  // C6
): number[] {
  // Use octave 0 as starting point, generate enough degrees
  const degreeFn = Scale.degrees(`${key}0 ${mode}`);
  const scaleSize = Scale.get(`${key} ${mode}`).notes.length;

  const freqs: number[] = [];
  // Generate degrees from 1 up through ~8 octaves worth
  for (let d = 1; d <= scaleSize * 8; d++) {
    const noteName = degreeFn(d);
    if (!noteName) continue;
    const freq = Note.freq(noteName);
    if (freq === null) continue;
    if (freq < lowFreq) continue;
    if (freq > highFreq) break; // Sorted, so we can stop
    freqs.push(freq);
  }

  return freqs;
}
```

### Binary Search for Nearest Scale Degree
```typescript
/**
 * Find the nearest scale degree frequency using binary search.
 * scaleFreqs must be sorted ascending.
 */
export function findNearestScaleFreq(
  freq: number,
  scaleFreqs: number[]
): number {
  if (scaleFreqs.length === 0) return freq;
  if (scaleFreqs.length === 1) return scaleFreqs[0];

  let lo = 0;
  let hi = scaleFreqs.length - 1;

  while (lo < hi - 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (scaleFreqs[mid] <= freq) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  // Compare distances in log-frequency space (semitone-proportional)
  const dLo = Math.abs(Math.log2(freq / scaleFreqs[lo]));
  const dHi = Math.abs(Math.log2(freq / scaleFreqs[hi]));
  return dLo <= dHi ? scaleFreqs[lo] : scaleFreqs[hi];
}
```

### Preset Overlay Component (VisualizationPanel Extension)
```typescript
// UI pattern: floating preset buttons on the canvas
// Follows existing VisualizationPanel overlay pattern (chord buttons, view toggle)
<div className="absolute top-3 left-1/2 -translate-x-1/2 z-10
  flex items-center gap-2 px-3 py-1.5 rounded-full
  bg-black/30 backdrop-blur-sm border border-white/5">

  {PRESET_NAMES.map((name) => (
    <button
      key={name}
      onClick={() => applyPreset(name)}
      className={`px-3 py-1 rounded-full text-xs transition-all
        ${activePreset === name
          ? 'bg-indigo-600/40 text-white border border-indigo-400/30'
          : 'text-gray-500 hover:text-gray-300'
        }`}
    >
      {name}
    </button>
  ))}

  {/* Intensity slider */}
  <input
    type="range"
    min={0} max={1} step={0.01}
    value={presetIntensity}
    onChange={(e) => setPresetIntensity(parseFloat(e.target.value))}
    className="w-20 h-1.5 accent-indigo-500"
  />
</div>
```

### Cycle Mode Implementation (onTrackArrival Extension)
```typescript
// In SlideEngine.onTrackArrival, add cycle mode logic:
// Existing code handles holdDuration and autoCycle partially.
// Phase 5 unifies under post-arrival mode:

if (postArrivalMode === 'cycle' && this.activeChordFreqs) {
  const touchDuration = this.config.cycleTouchDuration; // ms, preset-dependent
  track.holdTimeout = setTimeout(() => {
    if (track.state === 'held' && this.activeChordFreqs) {
      // Start departure
      this.startDeparture(track);
      // After departure completes, reconverge to same targets
      const reconvergeDelay = this.config.departureFadeTime * 1000 + 50;
      setTimeout(() => {
        if (track.state === 'idle' && this.activeChordFreqs) {
          // Re-converge to same chord targets
          this.performConvergence([track], this.activeChordFreqs);
        }
      }, reconvergeDelay);
    }
  }, touchDuration);
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `pitchMovement: 'scale-snapped'` stub (falls through to continuous) | Magnetic-snap quantizer with precomputed scale table | Phase 5 | Enables SLIDE-09 scale-snapped glissando |
| `idleRangeType: 'stay-in-scale'` stub (falls through to free-roam) | Constrains idle targets to scale degrees via frequency table | Phase 5 | Idle wandering respects scale when enabled |
| `autoCycle` boolean + fixed 500ms hold | Post-arrival mode enum ('hold' / 'cycle') with configurable touch duration | Phase 5 | Replaces the simplistic autoCycle with the cycle breathing behavior |
| No preset system, all manual config | Preset functions mapping (name, intensity) to SlideConfig partials | Phase 5 | The core UX shift -- choosing a personality instead of tweaking 30+ parameters |

**Deprecated/outdated:**
- `autoCycle` boolean in SlideConfig: replaced by explicit post-arrival mode. Keep the field for backward compatibility but gate on the new `postArrivalMode` field.

---

## Open Questions

1. **Ambient Drone Pitch Selection**
   - What we know: The drone should complement the convergence mechanic and use the root note of the selected key.
   - What's unclear: Should the drone pitch change when a chord is pressed (drone on chord root) or stay on the key root? Should it include the fifth for richness?
   - Recommendation: Default to key root + fifth (power chord drone), fade out on chord press (convergence takes over), fade back in after release. This creates a "home base" that the convergence events emerge from and return to. Can be refined after hearing it.

2. **Intensity Slider Interpolation for Non-Numeric Parameters**
   - What we know: Numeric parameters (speed, duration, volume) interpolate linearly between subtle and extreme endpoints.
   - What's unclear: How does intensity affect boolean parameters (microMotion, landingBounce) or enum parameters (trackCorrelation, convergenceEasing)?
   - Recommendation: Use thresholds -- e.g., microMotion enables at intensity > 0.3, landingBounce at > 0.7. Enum parameters can have threshold-based switching (e.g., trackCorrelation switches from 'loosely-correlated' to 'independent' at intensity > 0.5 for Eerie preset). Document these thresholds in the preset definitions.

3. **Scale Picker Scope**
   - What we know: CONTEXT.md says a separate scale picker that defaults to active key/mode but can be decoupled.
   - What's unclear: What scales should be offered? Just the 8 modes? Pentatonic? Blues? Chromatic?
   - Recommendation: Start with the 8 modes already in `MODES` constant plus 'chromatic'. The tonal library supports many more (`Scale.names()` returns 100+), but for v1 the existing modes are sufficient and match the chord engine's vocabulary. Expansion is straightforward later.

4. **Visual Dimming for Silent Mode**
   - What we know: In silent idle mode, orbs should be "visually diminished (smaller radius, reduced brightness)."
   - What's unclear: Exact dimming multipliers, and whether this is a RadialView-only concern or also affects WaveformView.
   - Recommendation: Apply to both views. Use a `silentMode` flag from the store. RadialView: reduce orb radius to 60% and halo opacity to 30% of normal. WaveformView: reduce trace opacity to 30%. These are tunable after visual testing.

---

## Sources

### Primary (HIGH confidence)
- `/tonaljs/tonal` via Context7 -- Scale.degrees(), Scale.get(), Scale.steps(), Note.freq(), Note.fromFreq(), Midi.freqToMidi(), Midi.midiToFreq() -- verified API signatures and return types for scale frequency generation
- Existing codebase analysis: `SlideEngine.ts` (1063 lines), `SlideTrack.ts` (444 lines), `SlideConfig` interface (76 fields), `synthStore.ts` (327 lines), `SlideControls.tsx` (691 lines), `VisualizationPanel.tsx` (121 lines), `App.tsx` (119 lines), `chordEngine.ts` (116 lines), `musicTypes.ts` (89 lines)

### Secondary (MEDIUM confidence)
- Web Audio API OscillatorNode.detune for drone detuning technique -- [MDN OscillatorNode.detune](https://developer.mozilla.org/en-US/docs/Web/API/OscillatorNode/detune)
- Ambient drone design patterns (detuned oscillator stacks, slow LFO modulation) -- [Artists in DSP: Ambient Sound Design techniques](https://artistsindsp.com/ambient-sound-design-7-advanced-techniques-for-evolving-drones-and-textures/)

### Tertiary (LOW confidence)
- None -- all critical claims verified against codebase or Context7.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all features implementable with existing tonal + Web Audio + Zustand
- Architecture: HIGH -- preset-as-config-snapshot pattern is a direct extension of existing updateConfig pipeline; scale frequency table is standard music theory + tonal API
- Pitfalls: HIGH -- identified from direct codebase analysis of state machine transitions, gain management patterns, and visualization rendering logic

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (stable domain -- Web Audio API and tonal library are mature)
