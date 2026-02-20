import type { WaveformType } from '../../shared/types';
import {
  SlideTrack,
  DEFAULT_SLIDE_CONFIG,
  type SlideConfig,
  type SlideTrackState,
} from './SlideTrack';
import type { IdleMode, PostArrivalMode } from './presets';
import { magneticSnap } from '../music/scaleFrequencies';

/**
 * DroneLayer: 2-3 detuned oscillators on root + fifth for ambient drone idle mode.
 * Fades out on chord press, fades back in on release.
 */
class DroneLayer {
  private ctx: AudioContext;
  private droneGain: GainNode;
  private oscs: OscillatorNode[];

  constructor(ctx: AudioContext, masterGain: GainNode, rootFreq: number) {
    this.ctx = ctx;

    // Drone gain node -- starts silent, fades in on request
    this.droneGain = ctx.createGain();
    this.droneGain.gain.setValueAtTime(0, ctx.currentTime);
    this.droneGain.connect(masterGain);

    // 3 oscillators: root, root+7 cents, root-5 cents (detuned unison for richness)
    const detunes = [0, 7, -5];
    this.oscs = detunes.map((det) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(rootFreq, ctx.currentTime);
      osc.detune.setValueAtTime(det, ctx.currentTime);
      osc.connect(this.droneGain);
      osc.start();
      return osc;
    });
  }

  /** Fade in drone gain with anti-click ramp */
  fadeIn(targetVolume: number, duration: number = 0.5): void {
    const now = this.ctx.currentTime;
    const gain = this.droneGain.gain;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(Math.max(0, Math.min(1, targetVolume)), now + duration);
  }

  /** Fade out drone gain with anti-click ramp */
  fadeOut(duration: number = 0.3): void {
    const now = this.ctx.currentTime;
    const gain = this.droneGain.gain;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(0, now + duration);
  }

  /** Update root frequency on all oscillators (for key changes) */
  setRootFreq(freq: number): void {
    const now = this.ctx.currentTime;
    for (const osc of this.oscs) {
      osc.frequency.cancelScheduledValues(now);
      osc.frequency.setValueAtTime(freq, now);
    }
  }

  /** Stop all oscillators, disconnect all nodes */
  dispose(): void {
    for (const osc of this.oscs) {
      try {
        osc.stop();
      } catch {
        // Already stopped
      }
      osc.disconnect();
    }
    this.droneGain.disconnect();
  }
}

/**
 * SlideEngine: N-track slide engine managing all slide mode audio behavior.
 *
 * Responsibilities:
 * - N persistent SlideTrack instances with idle motion scheduler
 * - Convergence to chord targets (simultaneous arrival, distance-optimized assignment)
 * - Proximity-based gain automation (swell on approach, fade on departure)
 * - Full track lifecycle: idle -> converging -> held -> departing
 * - Model A (heat-seeker): interrupt-and-retarget on new chord
 * - Model C (spawn-overflow): spawn new tracks when mid-convergence
 * - Dynamic track count changes
 * - LFO micro-motion, landing bounce, configurable hold/departure
 *
 * Audio scheduling uses setTimeout-based lookahead (not rAF) per research guidance.
 */
export class SlideEngine {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private tracks: SlideTrack[] = [];
  private spawnedTracks: SlideTrack[] = [];
  private config: SlideConfig;

  private schedulerHandle: ReturnType<typeof setTimeout> | null = null;
  private readonly LOOKAHEAD_MS = 100;
  private readonly SCHEDULE_INTERVAL_MS = 50;

  private activeDegree: number | null = null;
  private activeChordFreqs: number[] | null = null;
  private isRunning = false;

  // Phase 5: Personality state
  private idleMode: IdleMode = 'quiet-sliding';
  private postArrivalMode: PostArrivalMode = 'hold';
  private scaleFreqs: number[] = [];
  private droneLayer: DroneLayer | null = null;
  private cycleTimers: Map<SlideTrack, ReturnType<typeof setTimeout>> = new Map();

  // Root frequency for starting position (C4 default)
  private rootFreq = 261.63;
  // Pitch boundaries (musical-window defaults: C2 to C6)
  private pitchBoundaryLow = 65.41;
  private pitchBoundaryHigh = 1046.5;

  constructor(
    ctx: AudioContext,
    masterGain: GainNode,
    config: Partial<SlideConfig> = {}
  ) {
    this.ctx = ctx;
    this.masterGain = masterGain;
    this.config = { ...DEFAULT_SLIDE_CONFIG, ...config };

    // Create initial tracks at starting positions
    for (let i = 0; i < this.config.trackCount; i++) {
      const startFreq = this.getStartingFreq(i);
      const track = new SlideTrack(ctx, masterGain, startFreq);
      track.scheduleGainRamp(this.config.idleVolume, 0.01);
      this.tracks.push(track);
    }
  }

  // --- Scheduler ---

  /**
   * Start the scheduler tick loop. Sets isRunning = true.
   * Caller must call this explicitly after construction.
   */
  startScheduler(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.tick();
  }

  /**
   * Pause the scheduler. Cancels all in-flight ramps, silences tracks.
   * Sets isRunning = false.
   */
  pauseScheduler(): void {
    if (this.schedulerHandle !== null) {
      clearTimeout(this.schedulerHandle);
      this.schedulerHandle = null;
    }
    this.isRunning = false;

    // Cancel all in-flight ramps and silence all tracks
    for (const track of this.tracks) {
      track.cancelAllRamps();
      track.scheduleGainRamp(0, 0.05);
    }
    for (const track of this.spawnedTracks) {
      track.cancelAllRamps();
      track.scheduleGainRamp(0, 0.05);
    }
  }

  // --- Phase 5: Personality Mode Methods ---

  /**
   * Set idle mode: silent, quiet-sliding, or ambient-drone.
   */
  setIdleMode(mode: IdleMode): void {
    const prevMode = this.idleMode;
    this.idleMode = mode;

    // Transitioning FROM ambient-drone: dispose drone
    if (prevMode === 'ambient-drone' && mode !== 'ambient-drone') {
      if (this.droneLayer) {
        this.droneLayer.fadeOut(0.3);
        const drone = this.droneLayer;
        this.droneLayer = null;
        setTimeout(() => drone.dispose(), 400);
      }
    }

    // Transitioning TO ambient-drone: create drone
    if (mode === 'ambient-drone' && prevMode !== 'ambient-drone') {
      this.droneLayer = new DroneLayer(this.ctx, this.masterGain, this.rootFreq);
      // Drone is a subtle backdrop -- half of idle volume
      this.droneLayer.fadeIn(this.config.idleVolume * 0.5, 0.5);
    }

    // Transitioning TO silent: mute all idle tracks, set silentMode flag
    if (mode === 'silent') {
      for (const track of this.tracks) {
        track.setSilentMode(true);
        if (track.state === 'idle') {
          track.scheduleGainRamp(0, 0.05);
        }
      }
    }

    // Transitioning FROM silent: restore normal idle volume, clear flag
    if (prevMode === 'silent' && mode !== 'silent') {
      for (const track of this.tracks) {
        track.setSilentMode(false);
        if (track.state === 'idle') {
          track.scheduleGainRamp(this.config.idleVolume, 0.05);
        }
      }
    }
  }

  /**
   * Set post-arrival mode: hold or cycle.
   */
  setPostArrivalMode(mode: PostArrivalMode): void {
    this.postArrivalMode = mode;
  }

  /**
   * Set precomputed scale frequency table for scale-snapped behavior.
   * Pass to all tracks for staircase convergence.
   */
  setScaleFrequencies(freqs: number[]): void {
    this.scaleFreqs = freqs;
    for (const track of this.tracks) {
      track.setScaleFreqs(freqs);
    }
    for (const track of this.spawnedTracks) {
      track.setScaleFreqs(freqs);
    }
  }

  /**
   * Core scheduler tick. Called every SCHEDULE_INTERVAL_MS.
   * Updates logical freq, processes state transitions, schedules idle/convergence.
   */
  private tick(): void {
    if (!this.isRunning) return;

    const now = this.ctx.currentTime;

    // Process persistent tracks
    for (let i = 0; i < this.tracks.length; i++) {
      const track = this.tracks[i];
      track.updateLogicalFreq(now);
      this.processTrack(track, now, i);
    }

    // Process spawned tracks
    for (let i = this.spawnedTracks.length - 1; i >= 0; i--) {
      const track = this.spawnedTracks[i];
      track.updateLogicalFreq(now);
      this.processTrack(track, now, -1);

      // Dispose completed spawned tracks (departed and fade complete)
      if (track.state === 'idle' && this.spawnedTracks.includes(track)) {
        track.dispose();
        this.spawnedTracks.splice(i, 1);
      }
    }

    this.schedulerHandle = setTimeout(() => this.tick(), this.SCHEDULE_INTERVAL_MS);
  }

  /**
   * Process a single track based on its current state.
   * trackIndex is -1 for spawned tracks.
   */
  private processTrack(track: SlideTrack, now: number, trackIndex: number): void {
    switch (track.state) {
      case 'idle':
        if (trackIndex >= 0) {
          this.scheduleIdleMotion(track, trackIndex, now);
        }
        break;

      case 'converging':
        this.updateProximityGain(track);
        this.checkArrival(track, now);
        break;

      case 'held':
        // No-op: held at target, micro-motion LFO handles vibrato
        break;

      case 'departing':
        this.checkDepartureComplete(track, now);
        break;
    }
  }

  // --- Idle Motion ---

  /**
   * Schedule idle motion for a track based on config.
   * Only called when track.state === 'idle'.
   */
  private scheduleIdleMotion(track: SlideTrack, trackIndex: number, now: number): void {
    if (this.config.idleMovementMode === 'stationary') return;

    // Only schedule a new ramp if the current one is complete or near-complete
    if (track.idleRampEndTime > now + 0.05) return;

    // Compute next target frequency
    let nextTarget = this.computeIdleTarget(track, trackIndex);

    // Apply boundary logic
    nextTarget = this.applyBoundary(nextTarget);

    // Apply track correlation
    nextTarget = this.applyCorrelation(nextTarget, trackIndex);

    // Apply track partitioning
    nextTarget = this.applyPartitioning(nextTarget, trackIndex);

    // Apply track interaction (avoid clustering)
    nextTarget = this.applyInteraction(nextTarget, trackIndex);

    // Apply magnetic snap when scale-snapped and scale table available
    if (this.config.pitchMovement === 'scale-snapped' && this.scaleFreqs.length > 0) {
      nextTarget = magneticSnap(nextTarget, this.scaleFreqs);
    }

    // Compute speed with organic variation
    const baseSpeed = this.config.movementSpeed; // semitones/sec
    const variation = this.config.movementSpeedVariation;
    const speed = baseSpeed * (1 + (Math.random() * 2 - 1) * variation);

    // Compute distance in semitones
    const distSemitones = Math.abs(
      Math.log2(nextTarget / Math.max(1, track.currentFreq)) * 12
    );
    const duration = Math.max(0.1, distSemitones / Math.max(0.01, speed));

    // Schedule the ramp
    track.scheduleFrequencyRamp(nextTarget, duration, 'linear');
    track.idleTargetFreq = nextTarget;
    track.idleRampEndTime = now + duration;

    // Set idle volume (silent mode: tracks move but produce no sound)
    const idleGain = this.idleMode === 'silent' ? 0 : this.config.idleVolume;
    track.scheduleGainRamp(idleGain, 0.05);
  }

  /**
   * Compute a random idle target frequency based on range type.
   */
  private computeIdleTarget(_track: SlideTrack, _trackIndex: number): number {
    switch (this.config.idleRangeType) {
      case 'orbit-home': {
        // Oscillate around rootFreq within a 12-semitone orbit radius
        const orbitRadiusSemitones = 12;
        const offset = (Math.random() * 2 - 1) * orbitRadiusSemitones;
        return this.rootFreq * Math.pow(2, offset / 12);
      }

      case 'stay-in-scale':
        // For Phase 3, treat stay-in-scale same as free-roam
        // Scale-snapping is Phase 5 territory
        // Fall through to free-roam

      case 'free-roam':
      default: {
        // Random frequency within pitch boundaries
        const logLow = Math.log2(this.pitchBoundaryLow);
        const logHigh = Math.log2(this.pitchBoundaryHigh);
        const logTarget = logLow + Math.random() * (logHigh - logLow);
        return Math.pow(2, logTarget);
      }
    }
  }

  /**
   * Apply pitch boundary and edge behavior.
   */
  private applyBoundary(freq: number): number {
    if (this.config.pitchBoundary === 'unconstrained') return freq;

    if (freq < this.pitchBoundaryLow) {
      switch (this.config.edgeBehavior) {
        case 'reflect':
          return this.pitchBoundaryLow + (this.pitchBoundaryLow - freq);
        case 'wrap-around':
          return this.pitchBoundaryHigh - (this.pitchBoundaryLow - freq);
        case 'smooth-curve':
          // Target center of range
          return (this.pitchBoundaryLow + this.pitchBoundaryHigh) / 2;
      }
    }

    if (freq > this.pitchBoundaryHigh) {
      switch (this.config.edgeBehavior) {
        case 'reflect':
          return this.pitchBoundaryHigh - (freq - this.pitchBoundaryHigh);
        case 'wrap-around':
          return this.pitchBoundaryLow + (freq - this.pitchBoundaryHigh);
        case 'smooth-curve':
          return (this.pitchBoundaryLow + this.pitchBoundaryHigh) / 2;
      }
    }

    return freq;
  }

  /**
   * Apply track correlation to target frequency.
   */
  private applyCorrelation(targetFreq: number, trackIndex: number): number {
    if (this.config.trackCorrelation === 'independent') return targetFreq;

    if (this.config.trackCorrelation === 'unison') {
      // All tracks target the same pitch (use track 0's target or average)
      if (trackIndex > 0 && this.tracks[0]?.idleTargetFreq) {
        return this.tracks[0].idleTargetFreq;
      }
      return targetFreq;
    }

    // Loosely correlated: blend random target with average of all tracks
    const factor = this.config.correlationFactor;
    const avgFreq = this.getAverageTrackFreq();
    return targetFreq * (1 - factor) + avgFreq * factor;
  }

  /**
   * Apply track partitioning (divide pitch range among tracks).
   */
  private applyPartitioning(targetFreq: number, trackIndex: number): number {
    if (this.config.trackPartitioning !== 'partition-range') return targetFreq;

    const n = this.tracks.length;
    if (n <= 1) return targetFreq;

    const logLow = Math.log2(this.pitchBoundaryLow);
    const logHigh = Math.log2(this.pitchBoundaryHigh);
    const rangePerTrack = (logHigh - logLow) / n;

    const partLow = logLow + trackIndex * rangePerTrack;
    const partHigh = partLow + rangePerTrack;

    // Clamp target to this track's partition
    const logTarget = Math.log2(Math.max(1, targetFreq));
    const clamped = Math.max(partLow, Math.min(partHigh, logTarget));
    return Math.pow(2, clamped);
  }

  /**
   * Apply track interaction: push target away from nearby tracks.
   */
  private applyInteraction(targetFreq: number, trackIndex: number): number {
    if (this.config.trackInteraction !== 'avoid-clustering') return targetFreq;

    const minDistSemitones = 2;

    for (let i = 0; i < this.tracks.length; i++) {
      if (i === trackIndex) continue;

      const otherFreq = this.tracks[i].currentFreq;
      const dist = Math.abs(Math.log2(targetFreq / otherFreq) * 12);

      if (dist < minDistSemitones) {
        // Push target away from the other track
        const direction = targetFreq > otherFreq ? 1 : -1;
        const pushSemitones = minDistSemitones - dist;
        targetFreq = targetFreq * Math.pow(2, (direction * pushSemitones) / 12);
      }
    }

    return this.applyBoundary(targetFreq);
  }

  /**
   * Get average frequency of all persistent tracks.
   */
  private getAverageTrackFreq(): number {
    if (this.tracks.length === 0) return this.rootFreq;
    const sum = this.tracks.reduce((s, t) => s + t.currentFreq, 0);
    return sum / this.tracks.length;
  }

  // --- Convergence ---

  /**
   * Converge tracks to chord target notes.
   * Core public method called when a chord is pressed.
   */
  convergeTo(degree: number, chordFreqs: number[]): void {
    this.activeDegree = degree;
    this.activeChordFreqs = [...chordFreqs];

    // Ambient drone: fade out on chord press
    if (this.idleMode === 'ambient-drone' && this.droneLayer) {
      this.droneLayer.fadeOut(0.3);
    }

    // Clear any active cycle timers (new chord interrupts cycling)
    this.clearAllCycleTimers();

    // Model C: spawn-overflow when tracks are mid-convergence
    if (
      this.config.midConvergenceBehavior === 'spawn-overflow' &&
      this.config.trackModel === 'spawn-overflow' &&
      this.hasConvergingTracks()
    ) {
      this.spawnOverflowTracks(chordFreqs);
      return;
    }

    // finish-then-retarget: queue target for when current convergence completes
    if (this.config.midConvergenceBehavior === 'finish-then-retarget') {
      let anyQueued = false;
      for (const track of this.tracks) {
        if (track.state === 'converging') {
          // Queue the target; will be applied on arrival
          // For simplicity, store the closest chord freq for this track
          const closest = this.findClosestNote(track.currentFreq, chordFreqs);
          track.queuedTargetFreq = closest;
          anyQueued = true;
        }
      }
      // Only converge non-converging tracks immediately
      if (anyQueued) {
        const idleTracks = this.tracks.filter(
          (t) => t.state !== 'converging'
        );
        if (idleTracks.length > 0) {
          this.performConvergence(idleTracks, chordFreqs);
        }
        return;
      }
    }

    // Model A / interrupt-retarget: cancel current ramps, re-converge all
    for (const track of this.tracks) {
      track.cancelAllRamps();
      if (track.holdTimeout !== null) {
        clearTimeout(track.holdTimeout);
        track.holdTimeout = null;
      }
      track.disableMicroMotion();
    }

    this.performConvergence(this.tracks, chordFreqs);
  }

  /**
   * Perform convergence for a set of tracks toward chord frequencies.
   */
  private performConvergence(tracks: SlideTrack[], chordFreqs: number[]): void {
    if (tracks.length === 0 || chordFreqs.length === 0) return;

    // Assign tracks to chord notes (distance-optimized greedy)
    const trackFreqs = tracks.map((t) => t.currentFreq);
    const assignment = this.assignTracksToNotes(trackFreqs, chordFreqs);

    // Compute convergence duration
    const durations = this.computeConvergenceDurations(tracks, chordFreqs, assignment);

    // Determine if scale-snapped staircase convergence should be used
    const useStaircase =
      this.config.pitchMovement === 'scale-snapped' && this.scaleFreqs.length > 0;

    const now = this.ctx.currentTime;

    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      const targetHz = chordFreqs[assignment[i]];
      const duration = durations[i];

      // Record initial distance for proximity calculation
      track.initialDistance = this.semitoneDist(track.currentFreq, targetHz);

      if (duration <= 0) {
        // Instant arrival
        track.scheduleFrequencyRamp(targetHz, 0, this.config.convergenceEasing);
        track.state = 'converging'; // will be caught as arrived on next tick
      } else {
        track.scheduleFrequencyRamp(targetHz, duration, this.config.convergenceEasing, useStaircase);
        track.state = 'converging';
      }

      track.targetFreq = targetHz;
      track.convergenceStartTime = now;
      track.convergenceDuration = duration;

      // Anticipatory swell: start rising immediately on chord press
      const midSwell =
        this.config.floorVolume +
        (this.config.heldVolume - this.config.floorVolume) * 0.3;
      track.scheduleGainRamp(midSwell, 0.05);
    }
  }

  /**
   * Greedy nearest-neighbor note assignment.
   * Returns array where assignment[i] is the chord note index for track i.
   */
  private assignTracksToNotes(
    trackFreqs: number[],
    chordFreqs: number[]
  ): number[] {
    const n = trackFreqs.length;
    const m = chordFreqs.length;

    if (m === 0) return new Array(n).fill(0);

    const assignment: number[] = new Array(n);

    for (let i = 0; i < n; i++) {
      let bestJ = 0;
      let bestDist = Infinity;

      for (let j = 0; j < m; j++) {
        const d = this.semitoneDist(trackFreqs[i], chordFreqs[j]);
        if (d < bestDist) {
          bestDist = d;
          bestJ = j;
        }
      }

      assignment[i] = bestJ;
    }

    return assignment;
  }

  /**
   * Compute convergence durations based on config mode.
   * All tracks arrive at the same time (simultaneous arrival).
   */
  private computeConvergenceDurations(
    tracks: SlideTrack[],
    chordFreqs: number[],
    assignment: number[]
  ): number[] {
    if (this.config.convergenceMode === 'fixed-time') {
      // All tracks get the same duration
      return new Array(tracks.length).fill(this.config.convergenceDuration);
    }

    // Distance-proportional: duration scaled to max distance
    const distances = tracks.map((t, i) =>
      this.semitoneDist(t.currentFreq, chordFreqs[assignment[i]])
    );
    const maxDist = Math.max(...distances, 0.01);

    // Scale duration: durationPerOctave * (maxDist / 12 semitones)
    const maxDuration = Math.max(
      this.config.minDuration,
      (maxDist / 12) * this.config.durationPerOctave
    );

    // All tracks arrive at same time (same ramp window for all = simultaneous arrival)
    return new Array(tracks.length).fill(maxDuration);
  }

  // --- Proximity Gain ---

  /**
   * Update proximity-based gain for a converging track.
   * Proximity: 1 when on target, 0 when at initial distance.
   */
  private updateProximityGain(track: SlideTrack): void {
    if (track.targetFreq === null || track.initialDistance <= 0) return;

    const currentDist = this.semitoneDist(track.currentFreq, track.targetFreq);
    const proximity = 1 - Math.min(1, currentDist / track.initialDistance);

    let gainTarget: number;
    switch (this.config.swellCurve) {
      case 'exponential':
        gainTarget =
          this.config.floorVolume +
          proximity ** 2 * (this.config.heldVolume - this.config.floorVolume);
        break;
      case 'linear':
      default:
        gainTarget =
          this.config.floorVolume +
          proximity * (this.config.heldVolume - this.config.floorVolume);
        break;
    }

    // Anti-click ramp to computed gain over 50ms lookahead
    track.scheduleGainRamp(gainTarget, 0.05);
  }

  // --- Arrival Detection ---

  /**
   * Check if a converging track has arrived at its target.
   * Threshold: < 0.5 semitones from target.
   */
  private checkArrival(track: SlideTrack, now: number): void {
    if (track.targetFreq === null) return;

    const dist = this.semitoneDist(track.currentFreq, track.targetFreq);

    // Also check if ramp duration has elapsed (covers instant convergence)
    const elapsed = now - track.convergenceStartTime;
    const durationElapsed = track.convergenceDuration > 0
      ? elapsed >= track.convergenceDuration
      : true;

    if (dist < 0.5 || durationElapsed) {
      this.onTrackArrival(track);
    }
  }

  /**
   * Handle track arrival at target note.
   */
  private onTrackArrival(track: SlideTrack): void {
    track.state = 'held';

    // Snap logical freq to target
    if (track.targetFreq !== null) {
      track.currentFreq = track.targetFreq;
    }

    // Set swell gain to held volume
    track.scheduleGainRamp(this.config.heldVolume, 0.02);

    // Enable micro-motion if configured
    if (this.config.microMotion) {
      track.enableMicroMotion(
        this.config.microMotionDepth,
        this.config.microMotionRate
      );
    }

    // Landing bounce: overshoot and settle
    if (this.config.landingBounce && track.targetFreq !== null) {
      const bounceHz =
        track.targetFreq * Math.pow(2, this.config.bounceDepthCents / 1200);
      // Schedule overshoot then settle back
      track.scheduleFrequencyRamp(bounceHz, 0.05, 'linear');
      // Schedule settle back to target after bounce
      setTimeout(() => {
        if (track.state === 'held' && track.targetFreq !== null) {
          track.scheduleFrequencyRamp(
            track.targetFreq,
            this.config.bounceDecayTime,
            'linear'
          );
        }
      }, 50);
    }

    // Post-arrival mode branching
    if (this.postArrivalMode === 'cycle') {
      // Cycle mode: hold briefly then depart, reconverge to same chord targets
      const holdMs = this.config.holdDuration === Infinity
        ? 500  // Default cycle hold when holdDuration is Infinity
        : this.config.holdDuration * 1000;

      track.holdTimeout = setTimeout(() => {
        if (track.state === 'held') {
          this.startDeparture(track);

          // After departure completes, reconverge to same chord if still active
          const departureMs = this.config.departureFadeTime * 1000 + 50;
          const cycleTimer = setTimeout(() => {
            if (this.activeChordFreqs && track.state === 'idle') {
              // Reconverge to same chord targets using the state machine
              const closest = this.findClosestNote(track.currentFreq, this.activeChordFreqs);
              const cycleStaircase =
                this.config.pitchMovement === 'scale-snapped' && this.scaleFreqs.length > 0;
              track.initialDistance = this.semitoneDist(track.currentFreq, closest);
              track.targetFreq = closest;
              track.state = 'converging';
              track.convergenceStartTime = this.ctx.currentTime;
              track.convergenceDuration = this.config.convergenceDuration;
              track.scheduleFrequencyRamp(
                closest,
                this.config.convergenceDuration,
                this.config.convergenceEasing,
                cycleStaircase
              );
              // Anticipatory swell
              const midSwell =
                this.config.floorVolume +
                (this.config.heldVolume - this.config.floorVolume) * 0.3;
              track.scheduleGainRamp(midSwell, 0.05);
            }
          }, departureMs);
          this.cycleTimers.set(track, cycleTimer);
        }
      }, holdMs);
    } else {
      // Hold mode: stay at arrived pitch until chord is released
      if (this.config.holdDuration !== Infinity) {
        track.holdTimeout = setTimeout(() => {
          if (track.state === 'held') {
            this.startDeparture(track);
          }
        }, this.config.holdDuration * 1000);
      }
      // holdDuration === Infinity: hold indefinitely (existing behavior)
    }

    // Legacy autoCycle support: if autoCycle is true but postArrivalMode is hold,
    // respect autoCycle (backwards compatibility with existing presets)
    if (this.config.autoCycle && this.postArrivalMode === 'hold' && this.config.holdDuration === Infinity) {
      track.holdTimeout = setTimeout(() => {
        if (track.state === 'held') {
          this.startDeparture(track);
        }
      }, 500);
    }

    // Check for queued convergence target (finish-then-retarget)
    if (track.queuedTargetFreq !== null) {
      const queuedTarget = track.queuedTargetFreq;
      track.queuedTargetFreq = null;

      // Brief hold then re-converge to queued target
      setTimeout(() => {
        if (track.state === 'held') {
          const queuedStaircase =
            this.config.pitchMovement === 'scale-snapped' && this.scaleFreqs.length > 0;
          track.state = 'converging';
          const dist = this.semitoneDist(track.currentFreq, queuedTarget);
          track.initialDistance = dist;
          track.targetFreq = queuedTarget;
          track.scheduleFrequencyRamp(
            queuedTarget,
            this.config.convergenceDuration,
            this.config.convergenceEasing,
            queuedStaircase
          );
        }
      }, 100);
    }
  }

  // --- Chord Release ---

  /**
   * Release the currently targeted chord.
   * All held/converging tracks begin departure.
   */
  releaseChord(): void {
    // Clear ALL cycle timers to prevent orphaned reconvergences
    this.clearAllCycleTimers();

    for (const track of this.tracks) {
      if (track.state === 'held' || track.state === 'converging') {
        if (track.holdTimeout !== null) {
          clearTimeout(track.holdTimeout);
          track.holdTimeout = null;
        }
        this.startDeparture(track);
      }
    }

    // Release spawned tracks too
    for (const track of this.spawnedTracks) {
      if (track.state === 'held' || track.state === 'converging') {
        if (track.holdTimeout !== null) {
          clearTimeout(track.holdTimeout);
          track.holdTimeout = null;
        }
        this.startDeparture(track);
      }
    }

    // Ambient drone: fade back in on chord release
    if (this.idleMode === 'ambient-drone' && this.droneLayer) {
      this.droneLayer.fadeIn(this.config.idleVolume * 0.5, 0.5);
    }

    this.activeDegree = null;
    this.activeChordFreqs = null;
  }

  // --- Departure ---

  /**
   * Start departure for a track: fade volume, glide away from target.
   */
  private startDeparture(track: SlideTrack): void {
    track.state = 'departing';
    track.disableMicroMotion();

    // Pick departure target frequency based on config
    const departureTarget = this.computeDepartureTarget(track);

    // Departure starting point: from arrived note (current position)
    track.scheduleFrequencyRamp(
      departureTarget,
      this.config.departureFadeTime,
      'linear'
    );

    // Fade swell gain from held to floor
    track.scheduleGainRamp(this.config.floorVolume, this.config.departureFadeTime);

    // Transition to idle after departure fade completes
    track.holdTimeout = setTimeout(() => {
      if (track.state === 'departing') {
        track.state = 'idle';
        track.targetFreq = null;
        track.idleRampEndTime = 0; // Allow immediate idle scheduling
      }
    }, this.config.departureFadeTime * 1000);
  }

  /**
   * Compute departure target frequency based on config direction.
   */
  private computeDepartureTarget(track: SlideTrack): number {
    const current = track.currentFreq;

    switch (this.config.departureDirection) {
      case 'inverse': {
        // Opposite direction from approach
        const preConv = track.getPreConvergenceFreq();
        if (track.targetFreq !== null && preConv !== track.targetFreq) {
          // Go in opposite direction from approach
          const approachDir = track.targetFreq > preConv ? 1 : -1;
          const departureSemitones = 6 + Math.random() * 6; // 6-12 semitones away
          return current * Math.pow(2, (-approachDir * departureSemitones) / 12);
        }
        // Fallthrough to random if no approach direction
        return this.randomFreqInBounds();
      }

      case 'continue': {
        // Same direction as approach (past the target)
        const preConv = track.getPreConvergenceFreq();
        if (track.targetFreq !== null && preConv !== track.targetFreq) {
          const approachDir = track.targetFreq > preConv ? 1 : -1;
          const departureSemitones = 6 + Math.random() * 6;
          return current * Math.pow(2, (approachDir * departureSemitones) / 12);
        }
        return this.randomFreqInBounds();
      }

      case 'random':
      default:
        return this.randomFreqInBounds();
    }
  }

  /**
   * Check if a departing track has completed its departure fade.
   */
  private checkDepartureComplete(track: SlideTrack, _now: number): void {
    // Departure completion is handled by setTimeout in startDeparture.
    // This method exists for the tick loop structure but is a no-op;
    // the setTimeout callback handles the state transition.
    void _now;
    void track;
  }

  // --- Model C: Spawn Overflow ---

  /**
   * Check if any persistent tracks are currently converging.
   */
  private hasConvergingTracks(): boolean {
    return this.tracks.some((t) => t.state === 'converging');
  }

  /**
   * Spawn new tracks for Model C overflow.
   * Existing tracks continue their current ramps.
   */
  private spawnOverflowTracks(chordFreqs: number[]): void {
    // Safety cap
    if (this.spawnedTracks.length >= this.config.maxSpawnedTracks) {
      // Dispose oldest spawned tracks to make room
      const toRemove = this.spawnedTracks.length - this.config.maxSpawnedTracks + chordFreqs.length;
      for (let i = 0; i < Math.min(toRemove, this.spawnedTracks.length); i++) {
        this.spawnedTracks[i].dispose();
      }
      this.spawnedTracks.splice(0, Math.min(toRemove, this.spawnedTracks.length));
    }

    // Create one spawned track per chord note
    const spawnStaircase =
      this.config.pitchMovement === 'scale-snapped' && this.scaleFreqs.length > 0;
    for (const targetHz of chordFreqs) {
      const startFreq = this.getSpawnStartFreq();
      const track = new SlideTrack(this.ctx, this.masterGain, startFreq);

      // Propagate scale frequencies to spawned tracks
      if (this.scaleFreqs.length > 0) {
        track.setScaleFreqs(this.scaleFreqs);
      }

      // Set initial volume to floor
      track.scheduleGainRamp(this.config.floorVolume, 0.15); // 150ms fade-in to avoid pop

      // Set up convergence
      track.initialDistance = this.semitoneDist(startFreq, targetHz);
      track.targetFreq = targetHz;
      track.state = 'converging';

      // Schedule convergence ramp
      track.scheduleFrequencyRamp(
        targetHz,
        this.config.convergenceDuration,
        this.config.convergenceEasing,
        spawnStaircase
      );

      // Anticipatory swell
      const midSwell =
        this.config.floorVolume +
        (this.config.heldVolume - this.config.floorVolume) * 0.3;
      track.scheduleGainRamp(midSwell, 0.05);

      this.spawnedTracks.push(track);
    }
  }

  /**
   * Get starting frequency for spawned tracks based on config.
   */
  private getSpawnStartFreq(): number {
    switch (this.config.spawnStartPosition) {
      case 'root-note':
        return this.rootFreq;
      case 'random':
        return this.randomFreqInBounds();
      case 'last-known':
        // Use average of existing track positions
        return this.getAverageTrackFreq();
      default:
        return this.randomFreqInBounds();
    }
  }

  // --- Dynamic Track Count ---

  /**
   * Change the number of persistent tracks dynamically.
   * Adds or removes tracks without audio glitches.
   */
  setTrackCount(n: number): void {
    const current = this.tracks.length;

    if (n > current) {
      // Add new tracks at rootFreq with floor volume, idle state
      for (let i = current; i < n; i++) {
        const track = new SlideTrack(this.ctx, this.masterGain, this.rootFreq);
        track.scheduleGainRamp(this.config.idleVolume, 0.15); // 150ms fade-in to avoid pop
        // Propagate scale frequencies and silent mode to new tracks
        if (this.scaleFreqs.length > 0) {
          track.setScaleFreqs(this.scaleFreqs);
        }
        if (this.idleMode === 'silent') {
          track.setSilentMode(true);
        }
        this.tracks.push(track);
      }
    } else if (n < current) {
      // Dispose last (current - n) tracks cleanly
      const toRemove = this.tracks.splice(n, current - n);
      for (const track of toRemove) {
        track.cancelAllRamps();
        track.scheduleGainRamp(0, 0.05);
        // Dispose after brief silence to avoid click
        setTimeout(() => track.dispose(), 100);
      }
    }

    this.config.trackCount = n;
  }

  // --- Configuration Update ---

  /**
   * Update configuration. Applies relevant changes immediately.
   */
  updateConfig(partial: Partial<SlideConfig>): void {
    const prev = { ...this.config };
    Object.assign(this.config, partial);

    // Apply immediate changes
    if (
      partial.trackCount !== undefined &&
      partial.trackCount !== prev.trackCount
    ) {
      this.setTrackCount(partial.trackCount);
    }

    if (partial.idleVolume !== undefined) {
      for (const track of this.tracks) {
        if (track.state === 'idle') {
          track.scheduleGainRamp(this.config.idleVolume, 0.05);
        }
      }
    }
  }

  // --- State Reporting ---

  /**
   * Get track states for UI rendering.
   */
  getTrackStates(): SlideTrackState[] {
    const states: SlideTrackState[] = [];

    for (const track of this.tracks) {
      states.push(this.getTrackState(track));
    }

    // Include spawned tracks in state report
    for (const track of this.spawnedTracks) {
      states.push(this.getTrackState(track));
    }

    return states;
  }

  /**
   * Get state for a single track.
   */
  private getTrackState(track: SlideTrack): SlideTrackState {
    let proximity = 0;
    if (
      track.targetFreq !== null &&
      track.initialDistance > 0 &&
      (track.state === 'converging' || track.state === 'held')
    ) {
      const currentDist = this.semitoneDist(track.currentFreq, track.targetFreq);
      proximity = 1 - Math.min(1, currentDist / track.initialDistance);
    }
    if (track.state === 'held') {
      proximity = 1;
    }

    return {
      state: track.state,
      currentFreq: track.currentFreq,
      targetFreq: track.targetFreq,
      proximity,
      silentMode: this.idleMode === 'silent',
    };
  }

  // --- Root / Boundary Updates ---

  /**
   * Update root frequency (on key change).
   */
  setRootFreq(freq: number): void {
    this.rootFreq = freq;

    // Update drone frequencies on key change
    if (this.droneLayer) {
      this.droneLayer.setRootFreq(freq);
    }

    // If modeToggleBehavior is 'reset-home', reset idle tracks to root
    if (
      this.config.startingPosition === 'root-note' &&
      this.config.modeToggleBehavior === 'reset-home'
    ) {
      for (const track of this.tracks) {
        if (track.state === 'idle') {
          track.scheduleFrequencyRamp(freq, 0.5, 'linear');
        }
      }
    }
  }

  /**
   * Update pitch boundaries.
   */
  setPitchBoundaries(low: number, high: number): void {
    this.pitchBoundaryLow = Math.max(1, low);
    this.pitchBoundaryHigh = Math.max(this.pitchBoundaryLow + 1, high);
  }

  // --- Cleanup ---

  /**
   * Stop scheduler, dispose all tracks and spawned tracks, clear state.
   */
  dispose(): void {
    if (this.schedulerHandle !== null) {
      clearTimeout(this.schedulerHandle);
      this.schedulerHandle = null;
    }
    this.isRunning = false;

    // Clear cycle timers
    this.clearAllCycleTimers();

    // Dispose drone layer
    if (this.droneLayer) {
      this.droneLayer.dispose();
      this.droneLayer = null;
    }

    for (const track of this.tracks) {
      if (track.holdTimeout !== null) {
        clearTimeout(track.holdTimeout);
      }
      track.dispose();
    }
    for (const track of this.spawnedTracks) {
      if (track.holdTimeout !== null) {
        clearTimeout(track.holdTimeout);
      }
      track.dispose();
    }

    this.tracks = [];
    this.spawnedTracks = [];
    this.activeDegree = null;
    this.activeChordFreqs = null;
  }

  // --- Cycle Timer Management ---

  /**
   * Clear all per-track cycle reconvergence timers.
   * Called on chord release and new chord press to prevent orphaned reconvergences.
   */
  private clearAllCycleTimers(): void {
    for (const timer of this.cycleTimers.values()) {
      clearTimeout(timer);
    }
    this.cycleTimers.clear();
  }

  // --- Utility ---

  /**
   * Semitone distance between two frequencies.
   */
  private semitoneDist(f1: number, f2: number): number {
    return Math.abs(Math.log2(Math.max(1, f1) / Math.max(1, f2)) * 12);
  }

  /**
   * Random frequency within pitch boundaries.
   */
  private randomFreqInBounds(): number {
    const logLow = Math.log2(this.pitchBoundaryLow);
    const logHigh = Math.log2(this.pitchBoundaryHigh);
    return Math.pow(2, logLow + Math.random() * (logHigh - logLow));
  }

  /**
   * Find the closest chord note to a given frequency.
   */
  private findClosestNote(freq: number, chordFreqs: number[]): number {
    let best = chordFreqs[0];
    let bestDist = Infinity;
    for (const cf of chordFreqs) {
      const d = this.semitoneDist(freq, cf);
      if (d < bestDist) {
        bestDist = d;
        best = cf;
      }
    }
    return best;
  }

  /**
   * Get starting frequency for a track at construction time.
   */
  private getStartingFreq(_trackIndex: number): number {
    switch (this.config.startingPosition) {
      case 'root-note':
        return this.rootFreq;
      case 'random':
        return this.randomFreqInBounds();
      case 'last-known':
        // At construction time, there's no "last known" — default to root
        return this.rootFreq;
      default:
        return this.rootFreq;
    }
  }

  // --- Read-only accessors ---

  /** Currently active chord degree (or null if none) */
  getActiveDegree(): number | null {
    return this.activeDegree;
  }

  /** Whether the scheduler is running */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  /** Current configuration (read-only copy) */
  getConfig(): Readonly<SlideConfig> {
    return { ...this.config };
  }

  /** Get persistent tracks (for waveform view analyser access) */
  getTracks(): SlideTrack[] {
    return this.tracks;
  }

  /** Set waveform on all tracks */
  setWaveform(type: WaveformType): void {
    for (const track of this.tracks) {
      track.setWaveform(type);
    }
    for (const track of this.spawnedTracks) {
      track.setWaveform(type);
    }
  }
}
