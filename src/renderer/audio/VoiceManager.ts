import type { ADSRValues, MasterBus, VoiceState, WaveformType } from '../../shared/types';
import { Voice } from './Voice';
import { createMasterBus } from './masterBus';
import { ENVELOPE_PRESETS } from './envelopePresets';
import { DEFAULT_VOICE_PITCHES, DEFAULT_VOICE_DETUNE } from './constants';

/**
 * Manages 8 Voice instances, global waveform selection, and master bus.
 *
 * Creates an AudioContext, master bus (gain -> compressor -> analyser -> destination),
 * and 8 persistent oscillator voices with default pitches and detune offsets.
 */
export class VoiceManager {
  private voices: Voice[];
  private masterBus: MasterBus;
  private ctx: AudioContext;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;

    // Create master bus chain
    this.masterBus = createMasterBus(ctx);

    // Create 8 voices with default pitches and detune, connected to master gain
    this.voices = DEFAULT_VOICE_PITCHES.map(
      (freq, i) => new Voice(ctx, this.masterBus.masterGain, freq, DEFAULT_VOICE_DETUNE[i])
    );
  }

  /** Trigger attack on a specific voice */
  triggerAttack(voiceIndex: number): void {
    if (voiceIndex >= 0 && voiceIndex < this.voices.length) {
      this.voices[voiceIndex].triggerAttack();
    }
  }

  /** Trigger release on a specific voice */
  triggerRelease(voiceIndex: number): void {
    if (voiceIndex >= 0 && voiceIndex < this.voices.length) {
      this.voices[voiceIndex].triggerRelease();
    }
  }

  /** Set waveform type on all 8 voices */
  setWaveform(type: WaveformType): void {
    for (const voice of this.voices) {
      voice.setWaveform(type);
    }
  }

  /** Set ADSR envelope values on all 8 voices */
  setADSR(adsr: ADSRValues): void {
    for (const voice of this.voices) {
      voice.setADSR(adsr);
    }
  }

  /** Look up a preset by name and apply its ADSR to all voices */
  setPreset(presetName: string): void {
    const preset = ENVELOPE_PRESETS[presetName];
    if (!preset) {
      throw new Error(`Unknown envelope preset: "${presetName}"`);
    }
    this.setADSR(preset);
  }

  /** Get the state of all 8 voices for UI display */
  getVoiceStates(): VoiceState[] {
    return this.voices.map((voice) => voice.getState());
  }

  /** Get the master bus for analyser access (visualization) */
  getMasterBus(): MasterBus {
    return this.masterBus;
  }

  /** Clean up all voices and disconnect nodes */
  dispose(): void {
    for (const voice of this.voices) {
      voice.dispose();
    }
    this.masterBus.masterGain.disconnect();
    this.masterBus.compressor.disconnect();
    this.masterBus.analyser.disconnect();
  }
}
