# Phase 3: Convergence Engine + Slide Mode - Research

**Researched:** 2026-02-19
**Domain:** Web Audio API continuous oscillator management, AudioParam scheduling for simultaneous-arrival glissando, proximity-based gain automation, LFO-driven idle motion, Zustand store extension, React mode-toggle UI
**Confidence:** HIGH (Web Audio API spec directly; codebase analyzed directly; patterns verified against existing Phase 1/2 implementations)

## Summary

Phase 3 introduces the core Schmidi mechanic: N persistent oscillator tracks that continuously glide through pitch space and converge simultaneously on chord target notes when pressed, with volume swelling on approach. This is entirely a Web Audio API + TypeScript engineering problem. No new npm dependencies are needed — the existing stack (Web Audio API, Zustand, React, Tailwind) handles everything.

The audio engine side has two main challenges. First, computing simultaneous-arrival ramp durations when tracks are at different distances from their target notes (distance-proportional timing so all arrive at the same wall-clock time). Second, driving continuous idle motion without blocking the main thread — the right solution is a `setTimeout`-based lookahead scheduler (not `requestAnimationFrame`), pre-scheduling pitch movements 100–150ms ahead at a 50ms tick rate. This keeps motion smooth independent of frame rate and avoids audio drift.

The UI challenge is complexity management: slide mode has a very large number of configurable parameters (idle behavior, convergence, envelope, post-arrival). The planner should decompose tasks so controls groups are built incrementally. The mode toggle (Synth vs. Slide) is a simple top-level boolean in the Zustand store that swaps the center panel content.

**Primary recommendation:** Build `SlideEngine` as a class parallel to `ChordVoiceManager` (same module-level reference pattern), integrate via the existing `useAudioInit` hook, wire to a new `slideStore` slice or extend `synthStore`, and build `SlideModeUI` as the center panel swap. No new dependencies.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Track model — two models, toggleable:**
- Model A (Heat-seekers): N persistent tracks always exist, always in motion. Chord press → immediate hard-redirect to closest chord note. Hold on arrival, depart on chord release or configurable hold time (whichever first).
- Model C (Spawn-overflow hybrid): Same persistent tracks as Model A, but when chord pressed mid-convergence, NEW tracks spawn to handle the new chord while existing tracks finish. Spawned tracks hold until chord release, then departure fade.
- Model B (pure spawn-and-die) is deferred.

**Note assignment:** Distance-optimized — each convergence event, tracks take the chord note closest to their current pitch. No fixed track-to-role identity.

**Convergence timing (all configurable):**
- Convergence duration: fixed time OR distance-proportional (all tracks arrive simultaneously)
- Easing curve: linear / ease-in / ease-out
- Mid-convergence behavior when new chord pressed: interrupt-and-retarget (Model A default), finish-then-retarget, or spawn-overflow (Model C)
- Speed range: all the way to instant (0ms = normal chord synth)

**Idle behavior (all configurable, all with tooltips):**
- Movement mode: stationary / slow drift / always moving
- Range type: free roam / orbit home pitch / stay in scale
- Starting position: root note / random / last known position
- Track correlation: fully independent / loosely correlated / in unison
- Pitch range boundary: musical window / key's octave / unconstrained
- Edge behavior: reflect / wrap around / smooth curve back
- Movement speed: configurable range + organic variation
- Pitch movement: continuous glide OR scale-snapped
- Mode toggle behavior: resume from last position OR reset to home
- Track range partitioning: independent regardless of count OR partition range
- Track interaction: no interaction / avoid clustering

**Slide mode:** Separate mode replacing chord grid. Monophonic chord targeting (one target at a time). Multi-chord deferred.

**Anchor voice:** Optional solid chord (from Phase 2 ChordVoiceManager) plays under sliding tracks. Togglable. Configurable whether it fires on chord press.

**Track count:** Default N Claude decides (recommendation: 3). Changeable mid-session. Spawn-overflow model accounts for convergence jitter window.

**Volume envelope:**
- Driver: proximity-based — volume = f(distance to target)
- Swell curve: configurable (linear / exponential / user-shaped)
- Anticipatory swell: yes — rises before final proximity threshold
- Swell start: immediately on chord press
- Base/floor volume (far from target): configurable
- Held volume (at target): configurable
- Departure fade time: configurable
- Idle volume: floor volume, no phantom target
- Global: all tracks share same envelope settings
- Master limiting: automatic at master level

**After convergence:**
- Post-arrival: hold for configurable duration (or indefinitely). Depart on chord release OR hold time — whichever first.
- Departure direction: configurable (random / inverse of approach / other)
- Departure starting point: Claude decides (recommendation: from arrived note)
- Landing bounce: configurable (clean or organic overshoot-and-settle)
- Micro-motion when held: configurable (static or subtle vibrato)
- Auto-cycle: configurable (auto-restart wandering or wait for release)
- Hold mechanism: Claude decides (recommendation: separate held state + scheduled release — not ADSR sustain)
- First activation with no prior chord: Claude decides (recommendation: root note as phantom target at floor volume)

**ADSR in slide mode:** Claude decides (recommendation: slide mode has its own attack/release controls for departure fade and swell — the Phase 2 ADSR is for chord mode, not sliding tracks).

### Claude's Discretion
- Default track count N (recommendation: 3 — enough for triad convergence, not overwhelming)
- Hold mechanism architecture
- Departure starting point
- First activation behavior
- Jitter window math for spawn-overflow
- ADSR/controls architecture for slide mode

### Deferred Ideas (OUT OF SCOPE)
- Model B (pure spawn-and-die)
- Multi-chord simultaneous targeting
- Per-track volume envelope
- Visualization (Phase 4)
- Scale snapping and slide character (Phase 5)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SLIDE-01 | User can toggle between synth mode and slide mode | Boolean `slideMode` in Zustand store. Mode toggle component in TitleBar or main header. Center panel conditionally renders `ChordArc` (synth) or `SlideModeUI` (slide). Audio init creates `SlideEngine` alongside existing managers. |
| SLIDE-02 | In slide mode, multiple synth tracks continuously glide through pitch space toward chord target notes | `SlideEngine` class: N persistent OscillatorNode+GainNode pairs always running. Idle: lookahead scheduler drives continuous frequency ramps via `linearRampToValueAtTime` / `exponentialRampToValueAtTime`. Convergence: distance-optimized note assignment + simultaneous-arrival ramp calculation + anti-click cancel→anchor→ramp protocol. |
| SLIDE-03 | Track volume swells as pitch approaches chord target note and fades as it moves away (proximity-based amplitude) | Per-track `GainNode` automated by proximity. Proximity = 1 - (currentFreqDistance / initialDistance). Swell function applied: linear, quadratic, or exponential. Updated every lookahead tick, not in rAF. Anticipatory swell starts immediately on chord press. |
| SLIDE-04 | User can configure number of sliding tracks (default 2) | `SlideEngine.setTrackCount(n)`: adds/removes tracks dynamically. Existing tracks survive resize (remove last N or add new ones at current idle position). Default recommendation: 3. |
| SLIDE-05 | One "solid" anchor track plays chord cleanly without slide behavior | Reuse `ChordVoiceManager` (already exists). Anchor toggle: boolean in slide state. When enabled, `triggerChordByDegree` fires on chord press, `releaseChordByDegree` on release/departure. Anchor volume: separate slider. |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Web Audio API | Browser-native | OscillatorNode + GainNode for persistent sliding tracks, AudioParam scheduling for glissando | Already in use. Sufficient for all slide engine needs. |
| Zustand | ^5.x | Slide mode state (mode toggle, track count, all configurable parameters) | Already installed. Extend `synthStore` with slide state slice or create `slideStore`. |
| React | ^19.x | `SlideModeUI` component, mode toggle, controls panels | Already installed. |
| Tailwind CSS | ^4.x | Styling for slide mode controls, tooltip system | Already installed. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `tonal` | ^6.4.3 | Already installed from Phase 2. Use for frequency lookups during idle range calculations (key's octave boundaries, scale-snapped idle — but scale-snap is Phase 5). | Only needed if idle range type "stay in scale" references scale notes. Can defer to Phase 5. |

### No New Dependencies Required

The entire Phase 3 implementation uses browser-native APIs and already-installed packages. Installing a synthesis library (Tone.js, etc.) would conflict with the existing direct-Web-Audio-API architecture and create unnecessary abstraction.

### Installation
```bash
# No new packages needed
```

---

## Architecture Patterns

### Recommended File Structure (additions to existing)
```
src/renderer/
├── audio/
│   ├── SlideEngine.ts        # New: N persistent tracks, idle scheduler, convergence
│   ├── SlideTrack.ts         # New: single sliding voice (osc + gain + state)
│   └── [existing files unchanged]
├── components/
│   ├── SlideModeUI.tsx       # New: full slide mode center panel
│   ├── IdleControls.tsx      # New: idle behavior group (collapsible)
│   ├── ConvergenceControls.tsx # New: convergence group
│   ├── EnvelopeControls.tsx  # New: swell/fade envelope group
│   ├── PostArrivalControls.tsx # New: hold/bounce/micro-motion group
│   ├── ModeToggle.tsx        # New: Synth/Slide toggle button (header)
│   └── [existing files unchanged]
├── hooks/
│   └── useSlideKeyboard.ts   # New: keyboard handler for slide mode chord targeting
└── store/
    └── synthStore.ts         # Extended: slide state slice added
```

### Pattern 1: SlideEngine as Module-Level Singleton (mirrors ChordVoiceManager)

**What:** `SlideEngine` instance lives as a module-level variable in `synthStore.ts` (same pattern as `voiceManagerRef` and `chordVoiceManagerRef`). React components call store actions; store actions call `SlideEngine` imperatively.

**When to use:** Always. Audio objects must not live in React state.

**Example:**
```typescript
// src/renderer/store/synthStore.ts additions
let slideEngineRef: SlideEngine | null = null;

export function setSlideEngine(se: SlideEngine): void {
  slideEngineRef = se;
}

export function getSlideEngine(): SlideEngine | null {
  return slideEngineRef;
}
```

```typescript
// src/renderer/hooks/useAudioInit.ts addition
const se = new SlideEngine(ctx, vm.getMasterBus().masterGain, slideConfig);
setSlideEngine(se);
```

---

### Pattern 2: SlideTrack — Persistent Oscillator + Gain, Always Running

**What:** Each `SlideTrack` holds one `OscillatorNode` and two `GainNode`s: one for proximity-based swell (inner), one for per-track volume control (outer, connects to master). Oscillator starts on construction, never stops.

**When to use:** Always. Creating/stopping oscillators for each glide causes click artifacts and disables glissando.

**Example:**
```typescript
// src/renderer/audio/SlideTrack.ts
export class SlideTrack {
  private osc: OscillatorNode;
  private swellGain: GainNode;   // proximity-driven 0→1
  private trackGain: GainNode;   // per-track volume (user slider)
  private ctx: AudioContext;

  // Logical state (write here, schedule below)
  currentFreq: number;
  targetFreq: number | null = null;
  state: 'idle' | 'converging' | 'held' | 'departing' = 'idle';

  constructor(ctx: AudioContext, masterGain: GainNode, startFreq: number) {
    this.ctx = ctx;
    this.currentFreq = startFreq;

    this.osc = ctx.createOscillator();
    this.osc.type = 'sine';
    this.osc.frequency.setValueAtTime(startFreq, ctx.currentTime);

    this.swellGain = ctx.createGain();
    this.swellGain.gain.setValueAtTime(0.1, ctx.currentTime); // floor volume

    this.trackGain = ctx.createGain();
    this.trackGain.gain.setValueAtTime(0.7, ctx.currentTime);

    this.osc.connect(this.swellGain);
    this.swellGain.connect(this.trackGain);
    this.trackGain.connect(masterGain);

    this.osc.start(); // runs forever
  }

  scheduleFrequencyRamp(targetHz: number, durationSeconds: number, easing: EasingType): void {
    const now = this.ctx.currentTime;
    const freq = this.osc.frequency;
    freq.cancelScheduledValues(now);
    freq.setValueAtTime(freq.value, now); // anchor current value
    if (easing === 'linear') {
      freq.linearRampToValueAtTime(targetHz, now + durationSeconds);
    } else {
      // exponential: more natural for pitch perception
      // exponentialRamp cannot pass through zero: clamp to >=1
      freq.exponentialRampToValueAtTime(Math.max(1, targetHz), now + durationSeconds);
    }
    this.targetFreq = targetHz;
  }

  scheduleGainRamp(targetGain: number, durationSeconds: number): void {
    const now = this.ctx.currentTime;
    const gain = this.swellGain.gain;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(targetGain, now + durationSeconds);
  }

  setTrackVolume(volume: number): void {
    const now = this.ctx.currentTime;
    this.trackGain.gain.cancelScheduledValues(now);
    this.trackGain.gain.setValueAtTime(this.trackGain.gain.value, now);
    this.trackGain.gain.linearRampToValueAtTime(volume, now + 0.02);
  }

  dispose(): void {
    try { this.osc.stop(); } catch { /* already stopped */ }
    this.osc.disconnect();
    this.swellGain.disconnect();
    this.trackGain.disconnect();
  }
}
```

---

### Pattern 3: Lookahead Scheduler for Continuous Idle Motion

**What:** A `setTimeout`-based scheduler runs at ~50ms intervals and pre-schedules pitch ramps 100–150ms into the future. This keeps idle motion smooth without coupling audio timing to `requestAnimationFrame`. The scheduler is a private loop in `SlideEngine`.

**Why not rAF:** `rAF` is throttled when the window is hidden, can be janky under load, and is visually-timed — not audio-timed. The Web Audio clock (`AudioContext.currentTime`) is independent. Driving audio from rAF causes drift. (See ARCHITECTURE.md Anti-Pattern 2.)

**When to use:** All continuous motion (idle drift, vibrato micro-motion, any oscillating pitch movement).

**Example:**
```typescript
// Inside SlideEngine
private schedulerHandle: ReturnType<typeof setTimeout> | null = null;
private readonly LOOKAHEAD_MS = 100;
private readonly SCHEDULE_INTERVAL_MS = 50;

private startScheduler(): void {
  const tick = () => {
    const now = this.ctx.currentTime;
    const scheduleUntil = now + this.LOOKAHEAD_MS / 1000;

    for (const track of this.tracks) {
      if (track.state === 'idle') {
        this.scheduleIdleMotion(track, scheduleUntil);
      } else if (track.state === 'converging') {
        this.updateProximityGain(track);
      }
    }

    this.schedulerHandle = setTimeout(tick, this.SCHEDULE_INTERVAL_MS);
  };
  this.schedulerHandle = setTimeout(tick, 0);
}

private stopScheduler(): void {
  if (this.schedulerHandle !== null) {
    clearTimeout(this.schedulerHandle);
    this.schedulerHandle = null;
  }
}
```

---

### Pattern 4: Simultaneous Arrival — Distance-Proportional Ramp Duration

**What:** When chord is pressed, all tracks must arrive at their target notes at the same time. Tracks closer to their target get a shorter absolute duration; tracks farther away get longer. The convergence end time = `now + baseDuration`. Each track's ramp duration = `baseDuration` (same endpoint, different distances → different effective speeds).

**Key insight:** In fixed-time mode, every track always schedules to arrive at `now + convergenceDuration` regardless of distance. In distance-proportional mode, find the track with max distance, assign it `maxDuration`, then scale all others: `trackDuration = (trackDistance / maxDistance) * maxDuration`.

Wait — this contradicts simultaneous arrival. The correct approach: **in distance-proportional mode, the convergence duration is set by the FASTEST required movement (shortest distance / minimum time)**. All tracks arrive at the same endpoint time = `now + shortestFeasibleTime`. Tracks closer than the slowest just arrive earlier, OR (for true simultaneous): use fixed-time but let speed vary. The simplest simultaneous-arrival implementation:

```typescript
// Always schedule all tracks to arrive at the same absolute time
function computeSimultaneousArrival(
  tracks: SlideTrack[],
  targetFreqs: number[],
  config: ConvergenceConfig
): void {
  const now = ctx.currentTime;
  const arrivalTime = now + config.convergenceDurationSeconds;

  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    const targetHz = targetFreqs[i];
    // All tracks get the same arrival time; speed varies with distance
    track.scheduleFrequencyRamp(targetHz, config.convergenceDurationSeconds, config.easing);
  }
}
```

For distance-proportional mode (the engine picks a convergence duration scaled to distance):
```typescript
function computeDistanceProportionalArrival(
  tracks: SlideTrack[],
  targetFreqs: number[],
  config: ConvergenceConfig
): void {
  const now = ctx.currentTime;

  // Find max distance in semitones (log ratio)
  const distances = tracks.map((t, i) =>
    Math.abs(Math.log2(targetFreqs[i] / t.currentFreq) * 12)
  );
  const maxDist = Math.max(...distances);

  // Scale duration to max distance; minimum floor prevents 0ms
  const maxDuration = Math.max(config.minDurationSeconds, (maxDist / 12) * config.durationPerOctave);
  const arrivalTime = now + maxDuration;

  for (let i = 0; i < tracks.length; i++) {
    // Each track schedules to arrive at the same time (different ramp speeds)
    const rampDuration = maxDuration; // same arrival time = same ramp window for all
    tracks[i].scheduleFrequencyRamp(targetFreqs[i], rampDuration, config.easing);
  }
}
```

---

### Pattern 5: Distance-Optimized Note Assignment (Hungarian Algorithm Lite)

**What:** When a chord is pressed with notes `[f1, f2, f3]` and tracks are at positions `[p1, p2, p3]`, find the assignment that minimizes total distance (sum of |log2(pi/fj)| in semitones). For small N (≤8 tracks, ≤4 chord notes), brute-force permutations is acceptable (4! = 24, 8! = 40320 — acceptable).

**When N > chord size:** Assign extra tracks to nearest unassigned chord note (allow multiple tracks to same note). When chord is smaller than track count, distribute remaining tracks to chord notes closest to their current positions.

**Example:**
```typescript
function assignTracksToNotes(
  trackFreqs: number[],
  chordFreqs: number[]
): number[] { // returns chordFreqs[assignment[i]] for track i
  if (chordFreqs.length === 0) return trackFreqs.map(() => -1);

  const n = trackFreqs.length;
  const m = chordFreqs.length;

  // For each track, find closest chord note (greedy is sufficient for small N)
  // Uses semitone distance = |log2(trackFreq/chordFreq)| * 12
  const semitoneDist = (f1: number, f2: number) =>
    Math.abs(Math.log2(f1 / f2) * 12);

  const assignment: number[] = new Array(n);
  const taken = new Map<number, number>(); // chordIdx → track count assigned

  for (let i = 0; i < n; i++) {
    let bestJ = 0;
    let bestDist = Infinity;
    for (let j = 0; j < m; j++) {
      const d = semitoneDist(trackFreqs[i], chordFreqs[j]);
      if (d < bestDist) {
        bestDist = d;
        bestJ = j;
      }
    }
    assignment[i] = bestJ;
    taken.set(bestJ, (taken.get(bestJ) ?? 0) + 1);
  }

  return assignment;
}
```

For Phase 3 with ≤8 tracks, greedy-nearest is sufficient. True global-optimal requires the Hungarian algorithm and is only needed at larger N.

---

### Pattern 6: Proximity-Based Gain Automation

**What:** Each scheduler tick, compute proximity fraction for converging tracks and schedule a gain ramp on `swellGain`. Proximity = 1 when on target, 0 when at initial distance.

**Anti-click:** Always use cancel→anchor→ramp before scheduling gain. Never set `.value` directly while converging.

**Anticipatory swell:** Starts immediately on chord press, not after trajectory is established. At t=0, proximity is 0, but swell starts rising based on the scheduled trajectory.

```typescript
function updateProximityGain(track: SlideTrack, config: EnvelopeConfig): void {
  if (track.targetFreq === null || track.initialDistance === 0) return;

  const now = ctx.currentTime;
  const currentDist = Math.abs(Math.log2(track.currentFreq / track.targetFreq) * 12);
  const proximity = 1 - Math.min(1, currentDist / track.initialDistance);

  // Apply swell curve
  let gainTarget: number;
  switch (config.swellCurve) {
    case 'linear':
      gainTarget = config.floorVolume + proximity * (config.heldVolume - config.floorVolume);
      break;
    case 'exponential':
      gainTarget = config.floorVolume + (proximity ** 2) * (config.heldVolume - config.floorVolume);
      break;
    default:
      gainTarget = config.floorVolume + proximity * (config.heldVolume - config.floorVolume);
  }

  // Anti-click: cancel→anchor→ramp to next tick
  const gain = track.swellGain.gain;
  gain.cancelScheduledValues(now);
  gain.setValueAtTime(gain.value, now);
  gain.linearRampToValueAtTime(gainTarget, now + 0.05); // 50ms lookahead
}
```

**Critical issue:** `track.currentFreq` is the logical/target value, not the instantaneous AudioParam value. During a ramp, `osc.frequency.value` may not reflect the in-flight value accurately cross-browser. Track `currentFreq` as a JS number that advances toward `targetFreq` using linear interpolation on each scheduler tick (based on elapsed time and ramp duration). Do not read `AudioParam.value` for proximity computation.

---

### Pattern 7: LFO-Driven Micro-Motion (Vibrato When Held)

**What:** When a track is in `held` state with micro-motion enabled, connect a low-frequency OscillatorNode to the track oscillator's `detune` AudioParam through a GainNode (depth control). Disconnect on departure.

**Audio graph:** `lfoOsc → lfoGain → mainOsc.detune`

**Key detail:** `detune` is in cents. 50 cents = quarter semitone depth is perceptible. For subtle vibrato: 5–15 cents depth at 4–6 Hz.

```typescript
// LFO for micro-motion
private lfoOsc: OscillatorNode | null = null;
private lfoGain: GainNode | null = null;

enableMicroMotion(track: SlideTrack, depthCents: number, rateHz: number): void {
  const lfoOsc = this.ctx.createOscillator();
  lfoOsc.type = 'sine';
  lfoOsc.frequency.value = rateHz;

  const lfoGain = this.ctx.createGain();
  lfoGain.gain.value = depthCents;

  lfoOsc.connect(lfoGain);
  lfoGain.connect(track.osc.detune); // connect to AudioParam directly
  lfoOsc.start();

  track.lfoOsc = lfoOsc;
  track.lfoGain = lfoGain;
}

disableMicroMotion(track: SlideTrack): void {
  if (track.lfoOsc) {
    try { track.lfoOsc.stop(); } catch {}
    track.lfoOsc.disconnect();
    track.lfoGain?.disconnect();
    track.lfoOsc = null;
    track.lfoGain = null;
  }
}
```

---

### Pattern 8: Mode Toggle — Zustand Boolean + Conditional Render

**What:** A single `slideMode: boolean` in the Zustand store. The center panel in `App.tsx` conditionally renders `<ChordArc />` or `<SlideModeUI />`. The `ModeToggle` component calls `toggleSlideMode()`.

**Key consideration for audio on mode switch:** When switching TO slide mode, `SlideEngine` must be initialized (if not already) and its scheduler started. When switching BACK to synth mode, the scheduler should be paused (not disposed) to preserve track positions. On re-entering slide mode: resume from last position vs. reset is a user config.

```typescript
// Zustand store addition
slideMode: false,
toggleSlideMode: () => {
  const { slideMode } = get();
  const newMode = !slideMode;
  if (newMode) {
    slideEngineRef?.startScheduler();
  } else {
    slideEngineRef?.pauseScheduler();
  }
  set({ slideMode: newMode });
},
```

---

### Pattern 9: Spawn-Overflow Track Management (Model C)

**What:** When chord pressed mid-convergence (Model C active), the current tracks continue their in-progress ramps. New ephemeral `SlideTrack` instances are spawned, connected to master gain, assigned to the new chord notes, and disposed after departure completes.

**Jitter window math:** For simultaneous arrival of spawned tracks, no special math is needed — they all use the same convergence duration from their spawn position to the target. The user-visible "jitter" is per-track pitch variation at start position (configurable spawn origin). If spawn origin is "random", tracks start at scattered pitches and arrive at different perceptible speeds — that IS the behavior. For "clean" simultaneous arrival from random start: all tracks use the same absolute arrival time (`now + convergenceDurationSeconds`).

**Spawn track lifecycle:**
```typescript
state: 'spawned' → (convergence) → 'held' → (chord release) → 'departing' → dispose
```

Spawned tracks are tracked in a separate `spawnedTracks: SlideTrack[]` array in `SlideEngine`. Disposed via `track.dispose()` after departure fade completes (setTimeout).

---

### Pattern 10: Hold Mechanism (Separate State, Not ADSR Sustain)

**What:** ADSR sustain is a gain level, not a state. For slide mode's "hold" behavior (track arrived, stays at target pitch for configurable duration), use explicit state tracking + `setTimeout`.

**Recommendation:** Track state enum `'idle' | 'converging' | 'held' | 'departing'`. On arrival (detected by scheduler: `Math.abs(currentFreq - targetFreq) < 1 Hz threshold`), transition to `'held'`, set a timeout for hold duration. On timeout OR chord release: transition to `'departing'`, schedule departure trajectory.

```typescript
private onTrackArrival(track: SlideTrack): void {
  track.state = 'held';

  if (this.config.holdDurationSeconds === Infinity) {
    // Hold indefinitely — wait for chord release
    return;
  }

  track.holdTimeout = setTimeout(() => {
    if (track.state === 'held') {
      this.startDeparture(track);
    }
  }, this.config.holdDurationSeconds * 1000);
}

private onChordRelease(): void {
  for (const track of this.tracks) {
    if (track.state === 'held' || track.state === 'converging') {
      clearTimeout(track.holdTimeout);
      this.startDeparture(track);
    }
  }
}
```

---

### Pattern 11: Anchor Voice Integration

**What:** The anchor voice IS the existing `ChordVoiceManager` from Phase 2. When chord pressed in slide mode with anchor enabled: call `triggerChordByDegree(degree)`. When released: call `releaseChordByDegree(degree)`. The anchor uses the Phase 2 ADSR envelope as-is. Its volume is controlled via the per-track degree gain in `ChordVoiceManager`.

No new audio code needed for the anchor — only a UI toggle and store wiring.

```typescript
// Store action
triggerSlideChord: (degree: number) => {
  const { anchorEnabled, chordGrid, currentWaveform, adsr } = get();

  // Sliding tracks
  const chordData = chordGrid[degree - 1];
  slideEngineRef?.convergeTo(degree, chordData.frequencies);

  // Anchor voice (reuses Phase 2 engine)
  if (anchorEnabled) {
    chordVoiceManagerRef?.triggerChord(degree, chordData.frequencies, currentWaveform, adsr);
  }

  set({ activeSlideDegree: degree });
},
```

---

### Anti-Patterns to Avoid

- **Setting AudioParam.value directly during a ramp:** Always use cancel→anchor→ramp. Direct `.value =` during a scheduled ramp cancels the ramp with a click.
- **Reading AudioParam.value for proximity:** In-flight ramp values are unreliable via `.value` cross-browser. Maintain JS-side `currentFreq` state that advances each scheduler tick.
- **Driving audio from rAF:** Do not put AudioParam scheduling inside `requestAnimationFrame`. Use `setTimeout` lookahead scheduler. (rAF pauses when window is hidden; setTimeout does not.)
- **Creating/stopping oscillators per glide:** Oscillator start/stop produces click artifacts. Keep all N track oscillators running from app start with gain=0 when silent.
- **exponentialRampToValueAtTime through zero:** Exponential ramp cannot pass through 0 Hz. Always clamp target frequency to `>= 1`. For frequency ramps: prefer `linearRampToValueAtTime` for simplicity (audible difference is minor for glissando), OR use exponential with a 1Hz floor.
- **cancelAndHoldAtTime for mid-ramp interruption:** `cancelAndHoldAtTime` has limited browser availability (not Baseline). Use instead: `cancelScheduledValues(now)` + `setValueAtTime(param.value, now)` to anchor, then schedule new ramp. This is the established anti-click pattern already in the codebase.
- **State in React for audio objects:** `SlideEngine` and `SlideTrack` must not live in React state. Module-level refs only.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Music theory (scale degrees, frequencies) | Custom interval tables | `tonal` (already installed) | Already has `Note.freq()`, scale notes, mode intervals — use for idle range boundary calculations |
| Audio scheduling loop | Custom event loop | `setTimeout` lookahead (native) | Well-established pattern; no library adds value here |
| Track-to-note assignment | Hungarian algorithm from scratch | Greedy nearest for N≤8 | Brute-force or greedy is correct and sufficient at this scale |

**Key insight:** The hardest part of this phase is managing state transitions correctly (idle → converging → held → departing) and keeping JS-side state in sync with audio-side scheduled values. No library solves this better than careful imperative state management in `SlideEngine`.

---

## Common Pitfalls

### Pitfall 1: cancelScheduledValues leaves a jump to default
**What goes wrong:** Calling `cancelScheduledValues(now)` without a follow-up `setValueAtTime(param.value, now)` causes the parameter to jump to its default value at cancellation time.
**Why it happens:** `cancelScheduledValues` removes all events after the given time, including any currently-computing ramp. Without an anchor, the next value is the parameter's `defaultValue`.
**How to avoid:** Always follow with `setValueAtTime(param.value, now)` to anchor. This pattern is already established in the codebase (Voice.ts lines 58-59, 83-84).
**Warning signs:** Audible clicks on chord change or mode switch.

### Pitfall 2: Track count change mid-session breaks state
**What goes wrong:** Removing a track that is currently converging (has scheduled ramps) without canceling those ramps causes memory leaks or phantom audio.
**Why it happens:** The scheduled ramps continue executing even after the JS reference is gone, until GC collects the AudioNode.
**How to avoid:** Call `track.dispose()` which cancels pending values via `osc.stop()` and disconnects all nodes. On track count increase, add new tracks at root note (or last position) with floor gain.
**Warning signs:** Unexpected sounds after reducing track count.

### Pitfall 3: Proximity computed from wrong frequency
**What goes wrong:** Using `osc.frequency.value` to compute proximity during a ramp gives stale/wrong values, producing gain jumps.
**Why it happens:** `AudioParam.value` during an active ramp may return the initial value or the current sample value depending on browser and timing.
**How to avoid:** Maintain a JS-side `logicalFreq` on each `SlideTrack` that is updated each scheduler tick using linear interpolation based on elapsed time. Use `logicalFreq` for all proximity calculations.
**Warning signs:** Volume behaves incorrectly — doesn't swell on approach, or swells randomly.

### Pitfall 4: Anticipatory swell before target is assigned
**What goes wrong:** Swell gain ramps to floor before chord is pressed (correct), but when chord IS pressed, there's a brief moment before `targetFreq` is set where proximity can't be computed — swell hangs at floor.
**Why it happens:** The chord press event, target assignment, and first scheduler tick happen asynchronously.
**How to avoid:** Set `targetFreq` and `initialDistance` synchronously on chord press, before the scheduler tick. Start swell ramp to a "pre-swell" level (e.g., midpoint between floor and held) immediately on chord press, then let proximity take over on next tick.
**Warning signs:** Volume doesn't swell until after the first scheduler tick (50ms delay).

### Pitfall 5: Mode switch leaves orphaned audio
**What goes wrong:** Switching from slide mode to synth mode while tracks are converging leaves tracks playing their scheduled ramps.
**Why it happens:** Scheduler is stopped but ramps already in the Web Audio timeline continue executing.
**How to avoid:** On slide mode exit, call `SlideEngine.pauseScheduler()` AND cancel all in-flight ramps on all tracks (each track: cancel→setValueAtTime→ramp to floor). Then silence all tracks.
**Warning signs:** Audible sliding tones after switching back to synth mode.

### Pitfall 6: Spawn-overflow tracks not disposed
**What goes wrong:** Spawned tracks (Model C) accumulate over repeated chord presses without being disposed, increasing CPU load.
**Why it happens:** If the departure completion callback is not scheduled or fires incorrectly.
**How to avoid:** Every spawned track disposal must be triggered by a `setTimeout` set at departure start. Track them in a Set; remove from Set on disposal. Add a hard cap (e.g., max 32 total tracks including spawned) as a safety valve.
**Warning signs:** CPU climbing over a session with many chord presses.

---

## Code Examples

### Verified Patterns from Existing Codebase

### Anti-Click Ramp (existing established pattern)
```typescript
// Source: Voice.ts lines 57-67 (existing codebase)
const now = this.ctx.currentTime;
const gain = this.gainNode.gain;
gain.cancelScheduledValues(now);
gain.setValueAtTime(gain.value, now);  // anchor current value
gain.linearRampToValueAtTime(1, now + this.adsr.attack);
```

### Module-Level Engine Ref (existing established pattern)
```typescript
// Source: synthStore.ts lines 57-79 (existing codebase)
let slideEngineRef: SlideEngine | null = null;
export function setSlideEngine(se: SlideEngine): void { slideEngineRef = se; }
export function getSlideEngine(): SlideEngine | null { return slideEngineRef; }
```

### LFO-Driven AudioParam Modulation (verified, Web Audio API spec)
```typescript
// Source: Context7 /webaudio/web-audio-api
const lfo = context.createOscillator();
const lfoGain = context.createGain();
lfo.frequency.value = 5;      // 5 Hz vibrato
lfoGain.gain.value = 10;      // 10 cents depth
lfo.connect(lfoGain);
lfoGain.connect(oscillator.detune);  // connect to AudioParam
lfo.start();
```

### setValueCurveAtTime for Custom Easing (verified, Web Audio API spec)
```typescript
// Source: Context7 /webaudio/web-audio-api
// For ease-in: curve starts slow, ends fast
const curveLength = 256;
const curve = new Float32Array(curveLength);
for (let i = 0; i < curveLength; i++) {
  // ease-in: x^2
  curve[i] = (i / curveLength) ** 2;
}
osc.frequency.setValueCurveAtTime(curve, now, durationSeconds);
// Note: setValueCurveAtTime goes FROM current value TO target value using curve shape
// The curve[0] = current value, curve[last] = target value (scaled internally)
```

**Important:** `setValueCurveAtTime` scales the provided curve between the current param value and the endpoint value — it does NOT use raw curve values directly. For glissando easing, it's simpler to use `linearRampToValueAtTime` (linear) or `exponentialRampToValueAtTime` (natural pitch). Use `setValueCurveAtTime` only for complex custom curves (landing bounce).

### Simultaneous Arrival — Fixed Duration (primary approach)
```typescript
// All tracks arrive at now + convergenceDuration, regardless of starting distance
function convergeTo(tracks: SlideTrack[], targetFreqs: number[], durationSec: number): void {
  const now = ctx.currentTime;
  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    const freq = track.osc.frequency;
    freq.cancelScheduledValues(now);
    freq.setValueAtTime(freq.value, now);
    freq.linearRampToValueAtTime(targetFreqs[i], now + durationSec);
    track.initialDistance = Math.abs(Math.log2(targetFreqs[i] / track.currentFreq) * 12);
    track.state = 'converging';
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Fire-and-forget OscillatorNode per note | Persistent oscillators (start once, never stop) | Enables glissando; eliminates click artifacts |
| Gain = 0 for silence | Gain ramp to floor (not 0) to allow idle hum | Ensures tracks are always audible at floor volume in idle |
| AudioParam.value reads for position tracking | JS-side logical state advanced per scheduler tick | Cross-browser reliable; avoids ramp-reading inconsistencies |
| rAF as audio scheduler | setTimeout lookahead (50ms interval, 100ms lookahead) | Audio continues when window hidden; no drift |
| cancelScheduledValues alone for mid-ramp cancel | cancelScheduledValues + setValueAtTime anchor | Prevents jump to default value |
| cancelAndHoldAtTime | Not used — limited browser support | Use cancel + anchor pattern instead |

---

## Decisions for Claude's Discretion

These are areas where the user deferred to Claude. This section documents the recommended choices so the planner can include them as explicit decisions in task plans.

### Default Track Count: 3
Three tracks for the initial default. Triads have 3 notes; with 3 tracks, the most natural convergence is 1:1 track-to-note. Enough to hear the effect clearly. Easy to compare against Model C spawning. A default of 2 (per REQUIREMENTS.md) is also defensible — 2 tracks gives a simpler, cleaner intro to the mechanic. **Recommendation: start with the REQUIREMENTS.md default of 2, expose the control visibly so the user can immediately change it.**

### Hold Mechanism: Separate State + setTimeout
Do not use ADSR sustain for hold. Use an explicit `state: 'held'` + `setTimeout` for hold duration. ADSR sustain is a gain level, not a behavioral state. Mixing them would make departure behavior unpredictable.

### Departure Starting Point: From Arrived Note
Begin departure trajectory from the arrived note's pitch. This is the most musically logical: the track "pushes off" from the chord note. Starting from the pre-convergence position would be physically incoherent.

### First Activation With No Prior Chord: Floor Volume, Root Note as Home
On app start in slide mode: tracks initialize at the root note of the selected key (C4 = 261.63 Hz for C major). They play at floor volume. No phantom target — they just idle at root pitch. On first chord press, they converge normally.

### ADSR in Slide Mode: Dedicated Controls, Not Phase 2 ADSR
Slide mode has its own envelope parameters: `swellCurve`, `floorVolume`, `heldVolume`, `departureFadeTime`. The Phase 2 ADSR controls (attack, decay, sustain, release) govern the **anchor voice** only (when anchor is enabled). The sliding tracks do not use traditional ADSR — their amplitude is purely proximity-driven. UI should make this clear: in slide mode, the ADSR panel title changes to "Anchor ADSR" and a separate "Swell Envelope" section appears.

### Jitter Window for Spawn-Overflow: No Special Math Needed
For Model C, spawned tracks start from configurable positions and all schedule to arrive at `now + convergenceDurationSeconds`. The per-track "jitter" arises naturally from different starting pitches causing different effective glide rates. For visually/sonically interesting spawning, the starting positions can be spread across the pitch range. No extra jitter math is needed — the simultaneous arrival endpoint handles synchronization.

---

## Open Questions

1. **Track state tracking for proximity computation**
   - What we know: `AudioParam.value` is unreliable during ramps cross-browser.
   - What's unclear: Exactly how to advance `logicalFreq` each scheduler tick when easing curves (non-linear) are used. Linear interpolation underestimates position for ease-in, overestimates for ease-out.
   - Recommendation: For Phase 3, use linear interpolation (good enough for proximity calculation since the gain curve is a separate configurable shape). Document that proximity is approximate during non-linear ramps.

2. **Idle motion: continuous scheduling without gaps**
   - What we know: Scheduler runs every 50ms, scheduling 100ms ahead.
   - What's unclear: Edge case where track reaches boundary and the next scheduled movement pushes it past boundary before the scheduler catches it.
   - Recommendation: Over-schedule into the future (200ms instead of 100ms) for boundary detection, and apply boundary logic at schedule time, not during ramp.

3. **Model C spawn cap**
   - What we know: Spawned tracks accumulate if user presses chords rapidly.
   - What's unclear: At what total track count does audio quality degrade noticeably in Electron/Chrome.
   - Recommendation: Hard cap at 16 total tracks (persistent + spawned) as a safe default. Configurable. Profile during integration testing.

4. **Correlation between idle tracks ("loosely correlated")**
   - What we know: User wants "loosely correlated" as a configurable idle correlation mode.
   - What's unclear: The mathematical implementation of "loose correlation" — presumably each track picks a movement direction influenced by the average of others.
   - Recommendation: Implement as: each track's next target pitch = (random drift) * (1 - correlationFactor) + (average of all tracks' current targets) * correlationFactor. CorrelationFactor range 0–1, configurable.

---

## Sources

### Primary (HIGH confidence)
- Context7 `/webaudio/web-audio-api` — AudioParam scheduling methods, LFO-AudioParam modulation, OscillatorNode attributes
- Context7 `/websites/webaudio_github_io_web-audio-api` — AudioParam automation spec, setValueCurveAtTime behavior, OscillatorNode frequency/detune compound parameter
- Existing codebase (Voice.ts, ChordVoiceManager.ts, synthStore.ts, masterBus.ts) — anti-click pattern, module-level engine ref pattern, persistent oscillator pattern — analyzed directly
- MDN `AudioParam.cancelAndHoldAtTime` — confirmed limited browser availability, not Baseline

### Secondary (MEDIUM confidence)
- ARCHITECTURE.md (planning/research) — established patterns for this project: lookahead scheduler, TrackStateStore, anti-patterns. Written 2026-02-18 with MDN + Tone.js sources.

### Tertiary (LOW confidence — no external verification needed)
- Greedy nearest-neighbor note assignment at small N — based on algorithmic reasoning, not an external source. Sufficient for N≤8.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies needed; all confirmed in existing codebase
- Architecture: HIGH — patterns verified against Phase 1/2 implementations and Web Audio API spec
- Simultaneous arrival math: HIGH — based on AudioParam spec + basic algebra; verified conceptually
- Proximity gain computation: HIGH — standard pattern, confirmed approach in codebase
- Pitfalls: HIGH — most verified from existing codebase patterns and MDN spec behavior
- LFO micro-motion: HIGH — confirmed directly in Web Audio API spec (Context7)
- cancelAndHoldAtTime: HIGH — confirmed NOT reliable cross-browser (MDN)

**Research date:** 2026-02-19
**Valid until:** 2026-03-19 (stable Web Audio API spec; no expiry concern)
