import type { WaveformType } from '../../shared/types';

// --- Configuration types for SlideEngine ---

export type EasingType = 'linear' | 'ease-in' | 'ease-out';
export type TrackModel = 'heat-seeker' | 'spawn-overflow';
export type IdleMovementMode = 'stationary' | 'slow-drift' | 'always-moving';
export type IdleRangeType = 'free-roam' | 'orbit-home' | 'stay-in-scale';
export type StartingPosition = 'root-note' | 'random' | 'last-known';
export type TrackCorrelation = 'independent' | 'loosely-correlated' | 'unison';
export type PitchBoundary = 'musical-window' | 'key-octave' | 'unconstrained';
export type EdgeBehavior = 'reflect' | 'wrap-around' | 'smooth-curve';
export type SwellCurve = 'linear' | 'exponential';
export type DepartureDirection = 'random' | 'inverse' | 'continue';
export type ModeToggleBehavior = 'resume' | 'reset-home';
export type TrackPartitioning = 'independent' | 'partition-range';
export type TrackInteraction = 'none' | 'avoid-clustering';
export type MidConvergenceBehavior =
  | 'interrupt-retarget'
  | 'finish-then-retarget'
  | 'spawn-overflow';

export interface SlideConfig {
  // Track model
  trackModel: TrackModel;
  trackCount: number;

  // Convergence
  convergenceDuration: number; // seconds (0 = instant)
  convergenceEasing: EasingType;
  convergenceMode: 'fixed-time' | 'distance-proportional';
  midConvergenceBehavior: MidConvergenceBehavior;
  durationPerOctave: number; // seconds, for distance-proportional mode
  minDuration: number; // seconds, floor for distance-proportional

  // Idle behavior
  idleMovementMode: IdleMovementMode;
  idleRangeType: IdleRangeType;
  startingPosition: StartingPosition;
  trackCorrelation: TrackCorrelation;
  correlationFactor: number; // 0-1
  pitchBoundary: PitchBoundary;
  edgeBehavior: EdgeBehavior;
  movementSpeed: number; // semitones per second
  movementSpeedVariation: number; // 0-1, organic randomness
  pitchMovement: 'continuous' | 'scale-snapped';
  modeToggleBehavior: ModeToggleBehavior;
  trackPartitioning: TrackPartitioning;
  trackInteraction: TrackInteraction;

  // Volume envelope
  swellCurve: SwellCurve;
  floorVolume: number; // 0-1
  heldVolume: number; // 0-1
  departureFadeTime: number; // seconds
  idleVolume: number; // 0-1

  // Post-arrival
  holdDuration: number; // seconds (Infinity = hold indefinitely)
  departureDirection: DepartureDirection;
  landingBounce: boolean;
  bounceDepthCents: number; // overshoot amount
  bounceDecayTime: number; // seconds
  microMotion: boolean;
  microMotionDepth: number; // cents
  microMotionRate: number; // Hz
  autoCycle: boolean; // restart wandering while held

  // Anchor
  anchorEnabled: boolean;
  anchorFiresOnPress: boolean;

  // Spawn overflow (Model C)
  spawnStartPosition: StartingPosition;
  maxSpawnedTracks: number;
}

export const DEFAULT_SLIDE_CONFIG: SlideConfig = {
  trackModel: 'heat-seeker',
  trackCount: 2,

  convergenceDuration: 1.5,
  convergenceEasing: 'linear',
  convergenceMode: 'fixed-time',
  midConvergenceBehavior: 'interrupt-retarget',
  durationPerOctave: 1.0,
  minDuration: 0.2,

  idleMovementMode: 'slow-drift',
  idleRangeType: 'free-roam',
  startingPosition: 'root-note',
  trackCorrelation: 'independent',
  correlationFactor: 0.5,
  pitchBoundary: 'musical-window',
  edgeBehavior: 'reflect',
  movementSpeed: 2,
  movementSpeedVariation: 0.3,
  pitchMovement: 'continuous',
  modeToggleBehavior: 'resume',
  trackPartitioning: 'independent',
  trackInteraction: 'none',

  swellCurve: 'linear',
  floorVolume: 0.1,
  heldVolume: 0.8,
  departureFadeTime: 1.0,
  idleVolume: 0.1,

  holdDuration: Infinity,
  departureDirection: 'random',
  landingBounce: false,
  bounceDepthCents: 30,
  bounceDecayTime: 0.3,
  microMotion: false,
  microMotionDepth: 10,
  microMotionRate: 5,
  autoCycle: false,

  anchorEnabled: true,
  anchorFiresOnPress: true,

  spawnStartPosition: 'random',
  maxSpawnedTracks: 16,
};

// --- Track state type for UI reporting ---

export type SlideTrackPhase = 'idle' | 'converging' | 'held' | 'departing';

export interface SlideTrackState {
  state: SlideTrackPhase;
  currentFreq: number;
  targetFreq: number | null;
  proximity: number;
}

// --- SlideTrack class ---

/**
 * A single sliding voice: OscillatorNode + dual GainNode chain + LFO micro-motion.
 *
 * Audio graph: osc -> swellGain (proximity-driven 0-1) -> trackGain (per-track volume) -> masterGain
 *
 * The oscillator runs continuously (started in constructor). Volume is controlled
 * by swellGain (proximity-based swell) and trackGain (per-track user slider).
 *
 * Anti-click protocol (same as Voice.ts):
 * 1. cancelScheduledValues (clear any pending ramps)
 * 2. setValueAtTime (anchor current value to prevent jumps)
 * 3. Apply the desired ramp/target
 */
export class SlideTrack {
  private osc: OscillatorNode;
  private analyser: AnalyserNode;
  private swellGain: GainNode;
  private trackGain: GainNode;
  private ctx: AudioContext;

  // LFO for micro-motion (vibrato when held)
  private lfoOsc: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;

  // Logical state (JS-side tracking, NOT AudioParam.value reads)
  currentFreq: number;
  targetFreq: number | null = null;
  initialDistance = 0; // semitone distance at convergence start
  convergenceStartTime = 0;
  convergenceDuration = 0;
  state: SlideTrackPhase = 'idle';
  holdTimeout: ReturnType<typeof setTimeout> | null = null;

  // For departure direction calculation
  private preConvergenceFreq = 0;

  // For idle motion scheduling
  idleTargetFreq: number | null = null;
  idleRampEndTime = 0;

  // Queued convergence target (for finish-then-retarget)
  queuedTargetFreq: number | null = null;

  constructor(
    ctx: AudioContext,
    masterGain: GainNode,
    startFreq: number,
    waveformType: WaveformType = 'sine'
  ) {
    this.ctx = ctx;
    this.currentFreq = startFreq;
    this.preConvergenceFreq = startFreq;

    // Create oscillator -- runs continuously, gain controls audibility
    this.osc = ctx.createOscillator();
    this.osc.type = waveformType;
    this.osc.frequency.setValueAtTime(startFreq, ctx.currentTime);

    // Per-track analyser: taps raw oscillator output for waveform visualization
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256; // 128 samples, enough for visual
    this.analyser.smoothingTimeConstant = 0.3; // slight smoothing for visual coherence

    // Swell gain: proximity-driven 0-1 (starts at floor volume)
    this.swellGain = ctx.createGain();
    this.swellGain.gain.setValueAtTime(0, ctx.currentTime);

    // Track gain: per-track volume (user slider, default 0.7)
    this.trackGain = ctx.createGain();
    this.trackGain.gain.setValueAtTime(0.7, ctx.currentTime);

    // Connect: osc -> analyser -> swellGain -> trackGain -> masterGain
    this.osc.connect(this.analyser);
    this.analyser.connect(this.swellGain);
    this.swellGain.connect(this.trackGain);
    this.trackGain.connect(masterGain);

    // Start oscillator immediately (persistent, never stopped until dispose)
    this.osc.start();
  }

  /**
   * Schedule a frequency ramp with anti-click pattern.
   * Supports linear, ease-in, and ease-out easing via setValueCurveAtTime.
   */
  scheduleFrequencyRamp(
    targetHz: number,
    durationSeconds: number,
    easing: EasingType
  ): void {
    const clampedTarget = Math.max(1, targetHz); // exponentialRamp cannot pass through 0
    const now = this.ctx.currentTime;
    const freq = this.osc.frequency;

    // Anti-click: cancel -> anchor -> ramp
    freq.cancelScheduledValues(now);
    freq.setValueAtTime(freq.value, now);

    this.preConvergenceFreq = this.currentFreq;

    if (durationSeconds <= 0) {
      // Instant arrival
      freq.setValueAtTime(clampedTarget, now);
      this.currentFreq = clampedTarget;
      this.targetFreq = clampedTarget;
      this.convergenceStartTime = now;
      this.convergenceDuration = 0;
      return;
    }

    if (easing === 'linear') {
      freq.linearRampToValueAtTime(clampedTarget, now + durationSeconds);
    } else {
      // Use setValueCurveAtTime for ease-in and ease-out curves
      const curveLength = 256;
      const curve = new Float32Array(curveLength);
      const startFreq = freq.value;

      for (let i = 0; i < curveLength; i++) {
        const t = i / (curveLength - 1); // normalized 0-1
        let easedT: number;

        if (easing === 'ease-in') {
          // Quadratic ease-in: starts slow, ends fast
          easedT = t * t;
        } else {
          // Quadratic ease-out: starts fast, ends slow
          easedT = 1 - (1 - t) * (1 - t);
        }

        curve[i] = startFreq + (clampedTarget - startFreq) * easedT;
      }

      freq.setValueCurveAtTime(curve, now, durationSeconds);
    }

    this.targetFreq = clampedTarget;
    this.convergenceStartTime = now;
    this.convergenceDuration = durationSeconds;
  }

  /**
   * Schedule a gain ramp on swellGain with anti-click pattern.
   */
  scheduleGainRamp(targetGain: number, durationSeconds: number): void {
    const now = this.ctx.currentTime;
    const gain = this.swellGain.gain;

    // Anti-click: cancel -> anchor -> ramp
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(
      Math.max(0, Math.min(1, targetGain)),
      now + Math.max(0.001, durationSeconds)
    );
  }

  /**
   * Set per-track volume with anti-click 20ms ramp (matches ChordVoiceManager.setDegreeVolume).
   */
  setTrackVolume(volume: number): void {
    const now = this.ctx.currentTime;
    const gain = this.trackGain.gain;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(Math.max(0, Math.min(1, volume)), now + 0.02);
  }

  /**
   * Set oscillator waveform type.
   */
  setWaveform(type: WaveformType): void {
    this.osc.type = type;
  }

  /**
   * Compute current logical frequency using linear interpolation.
   * When state is 'idle' or 'held', returns currentFreq.
   * When converging, interpolates between start and target based on elapsed time.
   *
   * This is used for proximity calculation -- do NOT read osc.frequency.value.
   */
  getLogicalFreq(now: number): number {
    if (
      this.state !== 'converging' ||
      this.targetFreq === null ||
      this.convergenceDuration <= 0
    ) {
      return this.currentFreq;
    }

    const elapsed = now - this.convergenceStartTime;
    const progress = Math.min(1, Math.max(0, elapsed / this.convergenceDuration));

    // Linear interpolation in frequency space (good enough for proximity calc)
    return this.preConvergenceFreq + (this.targetFreq - this.preConvergenceFreq) * progress;
  }

  /**
   * Call getLogicalFreq and store result in currentFreq.
   * Called by engine scheduler each tick.
   */
  updateLogicalFreq(now: number): void {
    this.currentFreq = this.getLogicalFreq(now);
  }

  /**
   * Cancel all scheduled ramps on both osc.frequency and swellGain.gain.
   * Anchors current values. Used for mode switch cleanup.
   */
  cancelAllRamps(): void {
    const now = this.ctx.currentTime;

    const freq = this.osc.frequency;
    freq.cancelScheduledValues(now);
    freq.setValueAtTime(freq.value, now);

    const gain = this.swellGain.gain;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
  }

  /**
   * Enable LFO micro-motion (vibrato when held).
   * Audio graph: lfoOsc (sine, rateHz) -> lfoGain (depthCents) -> osc.detune
   */
  enableMicroMotion(depthCents: number, rateHz: number): void {
    // Disable any existing micro-motion first
    this.disableMicroMotion();

    this.lfoOsc = this.ctx.createOscillator();
    this.lfoOsc.type = 'sine';
    this.lfoOsc.frequency.value = rateHz;

    this.lfoGain = this.ctx.createGain();
    this.lfoGain.gain.value = depthCents;

    this.lfoOsc.connect(this.lfoGain);
    this.lfoGain.connect(this.osc.detune);
    this.lfoOsc.start();
  }

  /**
   * Disable LFO micro-motion. Stop and disconnect LFO nodes.
   */
  disableMicroMotion(): void {
    if (this.lfoOsc) {
      try {
        this.lfoOsc.stop();
      } catch {
        // Already stopped
      }
      this.lfoOsc.disconnect();
      this.lfoOsc = null;
    }
    if (this.lfoGain) {
      this.lfoGain.disconnect();
      this.lfoGain = null;
    }
  }

  /**
   * Get the frequency the track was at before the last convergence started.
   * Used for departure direction calculation ('inverse' direction).
   */
  getPreConvergenceFreq(): number {
    return this.preConvergenceFreq;
  }

  /**
   * Get current swell gain value (for state reporting).
   */
  getSwellGainValue(): number {
    return this.swellGain.gain.value;
  }

  /**
   * Get the per-track AnalyserNode for waveform visualization.
   * The analyser taps the raw oscillator output before gain processing.
   */
  getAnalyser(): AnalyserNode {
    return this.analyser;
  }

  /**
   * Stop oscillator, disconnect all nodes. Matches Voice.dispose() pattern.
   */
  dispose(): void {
    this.disableMicroMotion();

    if (this.holdTimeout !== null) {
      clearTimeout(this.holdTimeout);
      this.holdTimeout = null;
    }

    try {
      this.osc.stop();
    } catch {
      // Already stopped
    }
    this.osc.disconnect();
    this.analyser.disconnect();
    this.swellGain.disconnect();
    this.trackGain.disconnect();
  }
}
