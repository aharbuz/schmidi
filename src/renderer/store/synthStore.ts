import { create } from 'zustand';
import type { ADSRValues, VoiceState, WaveformType } from '../../shared/types';
import type { VoiceManager } from '../audio/VoiceManager';
import type { ChordVoiceManager } from '../audio/ChordVoiceManager';
import type { ChordData, MusicalKey, MusicalMode } from '../music/musicTypes';
import { generateDiatonicChords } from '../music/chordEngine';
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
  // UI state (Phase 1)
  audioReady: boolean;
  currentWaveform: WaveformType;
  currentPreset: string;
  adsr: ADSRValues;
  masterVolume: number;
  voiceStates: VoiceState[];
  audioStatus: AudioStatus;

  // Chord engine state (Phase 2)
  selectedKey: MusicalKey;
  selectedMode: MusicalMode;
  chordGrid: ChordData[];
  activeChordDegrees: Set<number>;
  perTrackExpanded: boolean;
  perTrackVolumes: number[];

  // Actions (Phase 1)
  setAudioReady: (ready: boolean) => void;
  setWaveform: (type: WaveformType) => void;
  setPreset: (name: string) => void;
  setADSR: (adsr: ADSRValues) => void;
  setMasterVolume: (vol: number) => void;
  triggerVoice: (index: number) => void;
  releaseVoice: (index: number) => void;
  updateVoiceStates: (states: VoiceState[]) => void;
  updateAudioStatus: (status: AudioStatus) => void;

  // Actions (Phase 2 - Chord engine)
  setKey: (key: MusicalKey) => void;
  setMode: (mode: MusicalMode) => void;
  triggerChordByDegree: (degree: number) => void;
  releaseChordByDegree: (degree: number) => void;
  togglePerTrackPanel: () => void;
  setPerTrackVolume: (degree: number, volume: number) => void;
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

// Module-level ChordVoiceManager reference -- NOT reactive state (same pattern)
let chordVoiceManagerRef: ChordVoiceManager | null = null;

/** Set the ChordVoiceManager instance (called once during chord audio init) */
export function setChordVoiceManager(cvm: ChordVoiceManager): void {
  chordVoiceManagerRef = cvm;
}

/** Get the ChordVoiceManager instance */
export function getChordVoiceManager(): ChordVoiceManager | null {
  return chordVoiceManagerRef;
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

/** Default chord grid for initial key/mode */
const defaultChordGrid = generateDiatonicChords('C', 'major');

export const useSynthStore = create<SynthState>()((set, get) => ({
  // Initial state (Phase 1)
  audioReady: false,
  currentWaveform: 'sine',
  currentPreset: defaultPreset,
  adsr: { ...defaultADSR },
  masterVolume: 0.7,
  voiceStates: Array.from({ length: 8 }, () => ({ ...defaultVoiceState })),
  audioStatus: { state: 'suspended', sampleRate: 0, baseLatency: 0 },

  // Initial state (Phase 2 - Chord engine)
  selectedKey: 'C',
  selectedMode: 'major',
  chordGrid: defaultChordGrid,
  activeChordDegrees: new Set<number>(),
  perTrackExpanded: false,
  perTrackVolumes: [0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7],

  // Actions (Phase 1)
  setAudioReady: (ready) => set({ audioReady: ready }),

  setWaveform: (type) => {
    voiceManagerRef?.setWaveform(type);
    chordVoiceManagerRef?.setWaveform(type);
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
    chordVoiceManagerRef?.setADSR(adsr);
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

  // Actions (Phase 2 - Chord engine)
  setKey: (key) => {
    const { selectedMode } = get();
    const newChordGrid = generateDiatonicChords(key, selectedMode);
    chordVoiceManagerRef?.retuneActiveChords(newChordGrid);
    set({ selectedKey: key, chordGrid: newChordGrid });
  },

  setMode: (mode) => {
    const { selectedKey } = get();
    const newChordGrid = generateDiatonicChords(selectedKey, mode);
    chordVoiceManagerRef?.retuneActiveChords(newChordGrid);
    set({ selectedMode: mode, chordGrid: newChordGrid });
  },

  triggerChordByDegree: (degree) => {
    const { chordGrid, currentWaveform, adsr, activeChordDegrees } = get();
    const chordData = chordGrid[degree - 1];
    if (!chordData) return;
    chordVoiceManagerRef?.triggerChord(degree, chordData.frequencies, currentWaveform, adsr);
    set({ activeChordDegrees: new Set([...activeChordDegrees, degree]) });
  },

  releaseChordByDegree: (degree) => {
    const { activeChordDegrees } = get();
    chordVoiceManagerRef?.releaseByDegree(degree);
    const newDegrees = new Set(activeChordDegrees);
    newDegrees.delete(degree);
    set({ activeChordDegrees: newDegrees });
  },

  togglePerTrackPanel: () => {
    const { perTrackExpanded } = get();
    set({ perTrackExpanded: !perTrackExpanded });
  },

  setPerTrackVolume: (degree, volume) => {
    chordVoiceManagerRef?.setDegreeVolume(degree, volume);
    const copy = [...get().perTrackVolumes];
    copy[degree - 1] = volume;
    set({ perTrackVolumes: copy });
  },
}));
