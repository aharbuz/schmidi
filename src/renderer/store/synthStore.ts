import { create } from 'zustand';
import type { ADSRValues, VoiceState, WaveformType } from '../../shared/types';
import type { VoiceManager } from '../audio/VoiceManager';
import { ENVELOPE_PRESETS } from '../audio/envelopePresets';
import { setMasterVolume } from '../audio/masterBus';

/** Audio status information for UI display */
interface AudioStatus {
  state: string;
  sampleRate: number;
  baseLatency: number;
}

/** Synth store state shape */
interface SynthState {
  // UI state
  audioReady: boolean;
  currentWaveform: WaveformType;
  currentPreset: string;
  adsr: ADSRValues;
  masterVolume: number;
  voiceStates: VoiceState[];
  audioStatus: AudioStatus;

  // Actions
  setAudioReady: (ready: boolean) => void;
  setWaveform: (type: WaveformType) => void;
  setPreset: (name: string) => void;
  setADSR: (adsr: ADSRValues) => void;
  setMasterVolume: (vol: number) => void;
  triggerVoice: (index: number) => void;
  releaseVoice: (index: number) => void;
  updateVoiceStates: (states: VoiceState[]) => void;
  updateAudioStatus: (status: AudioStatus) => void;
}

// Module-level VoiceManager reference -- NOT reactive state
let voiceManagerRef: VoiceManager | null = null;

/** Set the VoiceManager instance (called once during audio init) */
export function setVoiceManager(vm: VoiceManager): void {
  voiceManagerRef = vm;
}

/** Get the VoiceManager instance */
export function getVoiceManager(): VoiceManager | null {
  return voiceManagerRef;
}

/** Default ADSR from the default preset */
const defaultPreset = 'Pad (Drift)';
const defaultADSR = ENVELOPE_PRESETS[defaultPreset];

/** Default idle voice state */
const defaultVoiceState: VoiceState = {
  isActive: false,
  stage: 'idle',
  frequency: 0,
  detune: 0,
};

export const useSynthStore = create<SynthState>()((set) => ({
  // Initial state
  audioReady: false,
  currentWaveform: 'sine',
  currentPreset: defaultPreset,
  adsr: { ...defaultADSR },
  masterVolume: 0.7,
  voiceStates: Array.from({ length: 8 }, () => ({ ...defaultVoiceState })),
  audioStatus: { state: 'suspended', sampleRate: 0, baseLatency: 0 },

  // Actions
  setAudioReady: (ready) => set({ audioReady: ready }),

  setWaveform: (type) => {
    voiceManagerRef?.setWaveform(type);
    set({ currentWaveform: type });
  },

  setPreset: (name) => {
    const preset = ENVELOPE_PRESETS[name];
    if (!preset) return;
    voiceManagerRef?.setPreset(name);
    set({ currentPreset: name, adsr: { ...preset } });
  },

  setADSR: (adsr) => {
    voiceManagerRef?.setADSR(adsr);
    set({ adsr: { ...adsr } });
  },

  setMasterVolume: (vol) => {
    const bus = voiceManagerRef?.getMasterBus();
    if (bus) {
      setMasterVolume(bus, vol);
    }
    set({ masterVolume: vol });
  },

  triggerVoice: (index) => {
    voiceManagerRef?.triggerAttack(index);
  },

  releaseVoice: (index) => {
    voiceManagerRef?.triggerRelease(index);
  },

  updateVoiceStates: (states) => set({ voiceStates: states }),

  updateAudioStatus: (status) => set({ audioStatus: status }),
}));
