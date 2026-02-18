/** Shared types between main and renderer processes */

export interface SchmidiAPI {
  platform: NodeJS.Platform;
  getAppVersion: () => Promise<string>;
}

declare global {
  interface Window {
    schmidiAPI: SchmidiAPI;
  }
}

/** ADSR envelope values. Attack, decay, release in seconds. Sustain is 0-1 gain level. */
export interface ADSRValues {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

/** Current stage of an ADSR envelope */
export type EnvelopeStage = 'idle' | 'attack' | 'decay' | 'sustain' | 'release';

/** State of a single voice for UI display */
export interface VoiceState {
  isActive: boolean;
  stage: EnvelopeStage;
  frequency: number;
  detune: number;
}

/** Oscillator waveform type */
export type WaveformType = 'sine' | 'square' | 'sawtooth' | 'triangle';

/** Master bus audio chain */
export interface MasterBus {
  masterGain: GainNode;
  compressor: DynamicsCompressorNode;
  analyser: AnalyserNode;
}
