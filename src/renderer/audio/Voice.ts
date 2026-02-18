import type { ADSRValues, EnvelopeStage, VoiceState, WaveformType } from '../../shared/types';

/**
 * A single voice: OscillatorNode + GainNode + ADSR scheduling.
 *
 * The oscillator runs continuously (started in constructor). Volume is controlled
 * by the gain node using anti-click AudioParam scheduling patterns.
 *
 * Anti-click protocol:
 * 1. cancelScheduledValues (clear any pending ramps)
 * 2. setValueAtTime (anchor current value to prevent jumps)
 * 3. Apply the desired ramp/target
 */
export class Voice {
  private oscillator: OscillatorNode;
  private gainNode: GainNode;
  private ctx: AudioContext;
  private adsr: ADSRValues = { attack: 0.1, decay: 0.2, sustain: 0.6, release: 0.5 };
  private _isActive = false;
  private _stage: EnvelopeStage = 'idle';
  private _frequency: number;
  private _detune: number;
  private attackStartTime = 0;
  private releaseStartTime = 0;

  constructor(ctx: AudioContext, destination: GainNode, frequency: number, detune: number) {
    this.ctx = ctx;
    this._frequency = frequency;
    this._detune = detune;

    // Create oscillator -- runs continuously, gain controls audibility
    this.oscillator = ctx.createOscillator();
    this.oscillator.type = 'sine';
    this.oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    this.oscillator.detune.setValueAtTime(detune, ctx.currentTime);

    // Create gain node -- starts at 0 (silent)
    this.gainNode = ctx.createGain();
    this.gainNode.gain.value = 0;

    // Connect: oscillator -> gain -> destination (master bus)
    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(destination);

    // Start oscillator immediately (persistent)
    this.oscillator.start();
  }

  /**
   * Trigger the attack phase of the ADSR envelope.
   * Anti-click pattern: cancel -> anchor -> linear ramp to 1 -> setTargetAtTime to sustain
   */
  triggerAttack(): void {
    const now = this.ctx.currentTime;
    const gain = this.gainNode.gain;

    // Anti-click: cancel all pending, anchor current value
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);

    // Attack: linear ramp to peak (1.0)
    gain.linearRampToValueAtTime(1, now + this.adsr.attack);

    // Decay: exponential approach to sustain level
    // timeConstant = decay/3 gives ~95% convergence by end of decay period
    const decayTimeConstant = this.adsr.decay / 3 || 0.001;
    gain.setTargetAtTime(this.adsr.sustain, now + this.adsr.attack, decayTimeConstant);

    this._isActive = true;
    this._stage = 'attack';
    this.attackStartTime = now;
  }

  /**
   * Trigger the release phase of the ADSR envelope.
   * Anti-click pattern: cancel -> anchor -> setTargetAtTime to near-zero -> hard silence
   */
  triggerRelease(): void {
    const now = this.ctx.currentTime;
    const gain = this.gainNode.gain;

    // Anti-click: cancel all pending, anchor current value
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);

    // Release: exponential approach to near-zero
    const releaseTimeConstant = this.adsr.release / 3 || 0.001;
    gain.setTargetAtTime(0.0001, now, releaseTimeConstant);

    // Hard silence at end of release to avoid lingering near-zero oscillation
    // Use 1.67x release time for ~99.8% convergence (5 time constants)
    const silenceTime = now + this.adsr.release * 1.67;
    gain.setValueAtTime(0, silenceTime);

    this._stage = 'release';
    this.releaseStartTime = now;

    // Schedule stage transition to idle
    setTimeout(() => {
      if (this._stage === 'release') {
        this._isActive = false;
        this._stage = 'idle';
      }
    }, this.adsr.release * 1.67 * 1000);
  }

  /** Set the oscillator waveform type */
  setWaveform(type: WaveformType): void {
    this.oscillator.type = type;
  }

  /** Update ADSR values for the next trigger */
  setADSR(adsr: ADSRValues): void {
    this.adsr = { ...adsr };
  }

  /** Set oscillator frequency with anti-click pattern */
  setFrequency(freq: number): void {
    this._frequency = freq;
    this.oscillator.frequency.setValueAtTime(freq, this.ctx.currentTime);
  }

  /** Get current envelope stage based on timing */
  getEnvelopeStage(): EnvelopeStage {
    if (!this._isActive) return 'idle';

    const now = this.ctx.currentTime;

    if (this._stage === 'release') return 'release';

    const elapsed = now - this.attackStartTime;

    if (elapsed < this.adsr.attack) return 'attack';
    if (elapsed < this.adsr.attack + this.adsr.decay) return 'decay';
    return 'sustain';
  }

  /** Whether this voice is currently producing sound */
  get isActive(): boolean {
    return this._isActive;
  }

  /** Get the current voice state for UI display */
  getState(): VoiceState {
    return {
      isActive: this._isActive,
      stage: this.getEnvelopeStage(),
      frequency: this._frequency,
      detune: this._detune,
    };
  }

  /** Reconnect voice output to a new destination node */
  reconnect(destination: AudioNode): void {
    this.gainNode.disconnect();
    this.gainNode.connect(destination);
  }

  /** Stop and disconnect all audio nodes */
  dispose(): void {
    try {
      this.oscillator.stop();
    } catch {
      // Already stopped
    }
    this.oscillator.disconnect();
    this.gainNode.disconnect();
  }
}
