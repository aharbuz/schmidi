import { create } from 'zustand';
import { Note } from 'tonal';
import type { ADSRValues, VoiceState, WaveformType } from '../../shared/types';
import type { VoiceManager } from '../audio/VoiceManager';
import type { ChordVoiceManager } from '../audio/ChordVoiceManager';
import type { SlideEngine } from '../audio/SlideEngine';
import type { ChordData, MusicalKey, MusicalMode } from '../music/musicTypes';
import { generateDiatonicChords } from '../music/chordEngine';
import { ENVELOPE_PRESETS } from '../audio/envelopePresets';
import { setMasterVolume } from '../audio/masterBus';
import { DEFAULT_SLIDE_CONFIG, type SlideConfig, type SlideTrackState } from '../audio/SlideTrack';
import {
  type PresetName,
  type IdleMode,
  type PostArrivalMode,
  getPresetConfig,
  getPresetIdleMode,
  getPresetPostArrivalMode,
} from '../audio/presets';
import { buildScaleFrequencyTable } from '../music/scaleFrequencies';

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

  // Slide mode state (Phase 3)
  slideMode: boolean;
  slideConfig: SlideConfig;
  activeSlideDegree: number | null;
  slideTrackStates: SlideTrackState[];

  // Visualization state (Phase 4)
  vizMode: 'radial' | 'waveform';
  fullViz: boolean;

  // Personality state (Phase 5)
  activePreset: PresetName;
  presetIntensity: number;
  idleMode: IdleMode;
  postArrivalMode: PostArrivalMode;
  snapScaleKey: string | null;
  snapScaleMode: string | null;

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

  // Actions (Phase 3 - Slide mode)
  toggleSlideMode: () => void;
  triggerSlideChord: (degree: number) => void;
  releaseSlideChord: () => void;
  updateSlideConfig: (partial: Partial<SlideConfig>) => void;
  setSlideTrackCount: (n: number) => void;
  updateSlideTrackStates: (states: SlideTrackState[]) => void;

  // Actions (Phase 4 - Visualization)
  setVizMode: (mode: 'radial' | 'waveform') => void;
  toggleFullViz: () => void;

  // Actions (Phase 5 - Personality)
  applyPreset: (name: PresetName) => void;
  setPresetIntensity: (intensity: number) => void;
  setIdleMode: (mode: IdleMode) => void;
  setPostArrivalMode: (mode: PostArrivalMode) => void;
  setSnapScale: (key: string | null, mode: string | null) => void;
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

// Module-level SlideEngine reference -- NOT reactive state (same pattern)
let slideEngineRef: SlideEngine | null = null;

/** Set the SlideEngine instance (called once during audio init) */
export function setSlideEngine(se: SlideEngine): void {
  slideEngineRef = se;
}

/** Get the SlideEngine instance */
export function getSlideEngine(): SlideEngine | null {
  return slideEngineRef;
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

  // Initial state (Phase 3 - Slide mode)
  slideMode: false,
  slideConfig: { ...DEFAULT_SLIDE_CONFIG },
  activeSlideDegree: null,
  slideTrackStates: [],

  // Initial state (Phase 4 - Visualization)
  vizMode: 'radial',
  fullViz: false,

  // Initial state (Phase 5 - Personality)
  activePreset: 'bloom' as PresetName,
  presetIntensity: 0.5,
  idleMode: 'quiet-sliding' as IdleMode,
  postArrivalMode: 'hold' as PostArrivalMode,
  snapScaleKey: null,
  snapScaleMode: null,

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
    // Propagate root frequency to SlideEngine (key root at octave 4)
    const rootFreq = Note.freq(key + '4');
    if (rootFreq !== null && slideEngineRef) {
      slideEngineRef.setRootFreq(rootFreq);
    }
    set({ selectedKey: key, chordGrid: newChordGrid });
  },

  setMode: (mode) => {
    const { selectedKey } = get();
    const newChordGrid = generateDiatonicChords(selectedKey, mode);
    chordVoiceManagerRef?.retuneActiveChords(newChordGrid);
    // Propagate root frequency to SlideEngine (mode change may affect chord targets)
    const rootFreq = Note.freq(selectedKey + '4');
    if (rootFreq !== null && slideEngineRef) {
      slideEngineRef.setRootFreq(rootFreq);
    }
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

  // Actions (Phase 3 - Slide mode)
  toggleSlideMode: () => {
    const { slideMode } = get();
    if (!slideMode) {
      // Entering slide mode: start scheduler
      slideEngineRef?.startScheduler();
    } else {
      // Leaving slide mode: pause scheduler
      slideEngineRef?.pauseScheduler();
    }
    set({ slideMode: !slideMode, activeSlideDegree: null });
  },

  triggerSlideChord: (degree) => {
    const { chordGrid, activeSlideDegree, slideConfig, currentWaveform, adsr } = get();
    const chordData = chordGrid[degree - 1];
    if (!chordData) return;

    // Monophonic: release previous chord before triggering new
    if (activeSlideDegree !== null && activeSlideDegree !== degree) {
      slideEngineRef?.releaseChord();
      if (slideConfig.anchorEnabled) {
        chordVoiceManagerRef?.releaseByDegree(activeSlideDegree);
      }
    }

    // Converge slide tracks to chord target
    slideEngineRef?.convergeTo(degree, chordData.frequencies);

    // Fire anchor voice if enabled
    if (slideConfig.anchorEnabled && slideConfig.anchorFiresOnPress) {
      chordVoiceManagerRef?.triggerChord(degree, chordData.frequencies, currentWaveform, adsr);
    }

    set({ activeSlideDegree: degree });
  },

  releaseSlideChord: () => {
    const { activeSlideDegree, slideConfig } = get();
    slideEngineRef?.releaseChord();

    // Release anchor voice if it was playing
    if (activeSlideDegree !== null && slideConfig.anchorEnabled) {
      chordVoiceManagerRef?.releaseByDegree(activeSlideDegree);
    }

    set({ activeSlideDegree: null });
  },

  updateSlideConfig: (partial) => {
    const { slideConfig, activePreset, presetIntensity, snapScaleKey, snapScaleMode, selectedKey, selectedMode } = get();
    const newConfig = { ...slideConfig, ...partial };
    slideEngineRef?.updateConfig(partial);

    // When switching to scale-snapped, build and send scale frequency table
    if (partial.pitchMovement === 'scale-snapped') {
      const effectiveKey = snapScaleKey ?? selectedKey;
      const effectiveMode = snapScaleMode ?? selectedMode;
      const freqs = buildScaleFrequencyTable(effectiveKey, effectiveMode);
      slideEngineRef?.setScaleFrequencies(freqs);
    } else if (partial.pitchMovement === 'continuous') {
      slideEngineRef?.setScaleFrequencies([]);
    }

    // Detect preset divergence: if a changed key differs from current preset, switch to custom
    const updates: Partial<SynthState> = { slideConfig: newConfig };
    if (activePreset !== 'custom') {
      const presetConfig = getPresetConfig(activePreset, presetIntensity);
      const diverged = Object.keys(partial).some((key) => {
        const k = key as keyof SlideConfig;
        return k in presetConfig && partial[k] !== presetConfig[k];
      });
      if (diverged) {
        updates.activePreset = 'custom';
      }
    }

    set(updates);
  },

  setSlideTrackCount: (n) => {
    get().updateSlideConfig({ trackCount: n });
  },

  updateSlideTrackStates: (states) => set({ slideTrackStates: states }),

  // Actions (Phase 4 - Visualization)
  setVizMode: (mode) => set({ vizMode: mode }),
  toggleFullViz: () => {
    const { fullViz } = get();
    set({ fullViz: !fullViz });
  },

  // Actions (Phase 5 - Personality)
  applyPreset: (name) => {
    const { presetIntensity } = get();
    const presetConfig = getPresetConfig(name, presetIntensity);
    const idleMode = getPresetIdleMode(name);
    const postArrivalMode = getPresetPostArrivalMode(name);

    if (name === 'custom') {
      // Custom = use current values, just update the label and mode defaults
      set({ activePreset: name, idleMode, postArrivalMode });
      return;
    }

    // Apply preset config to engine and store
    slideEngineRef?.updateConfig(presetConfig);
    const { slideConfig } = get();
    set({
      activePreset: name,
      idleMode,
      postArrivalMode,
      slideConfig: { ...slideConfig, ...presetConfig },
    });
  },

  setPresetIntensity: (intensity) => {
    const clamped = Math.max(0, Math.min(1, intensity));
    const { activePreset } = get();

    if (activePreset !== 'custom') {
      // Recompute preset config at new intensity and apply
      const presetConfig = getPresetConfig(activePreset, clamped);
      slideEngineRef?.updateConfig(presetConfig);
      const { slideConfig } = get();
      set({
        presetIntensity: clamped,
        slideConfig: { ...slideConfig, ...presetConfig },
      });
    } else {
      set({ presetIntensity: clamped });
    }
  },

  setIdleMode: (mode) => {
    const { activePreset } = get();

    // Check if this diverges from current preset's default idle mode
    const updates: Partial<SynthState> = { idleMode: mode };
    if (activePreset !== 'custom') {
      const presetDefault = getPresetIdleMode(activePreset);
      if (mode !== presetDefault) {
        updates.activePreset = 'custom';
      }
    }

    slideEngineRef?.setIdleMode(mode);
    set(updates);
  },

  setPostArrivalMode: (mode) => {
    const { activePreset, slideConfig } = get();

    // Map post-arrival mode to engine config
    const engineConfig: Partial<SlideConfig> =
      mode === 'hold'
        ? { autoCycle: false, holdDuration: Infinity }
        : { autoCycle: true, holdDuration: slideConfig.holdDuration === Infinity ? 2.0 : slideConfig.holdDuration };

    slideEngineRef?.updateConfig(engineConfig);
    slideEngineRef?.setPostArrivalMode(mode);

    // Check if this diverges from current preset's default
    const updates: Partial<SynthState> = {
      postArrivalMode: mode,
      slideConfig: { ...slideConfig, ...engineConfig },
    };
    if (activePreset !== 'custom') {
      const presetDefault = getPresetPostArrivalMode(activePreset);
      if (mode !== presetDefault) {
        updates.activePreset = 'custom';
      }
    }

    set(updates);
  },

  setSnapScale: (key, mode) => {
    const { selectedKey, selectedMode } = get();
    const effectiveKey = key ?? selectedKey;
    const effectiveMode = mode ?? selectedMode;
    const freqs = buildScaleFrequencyTable(effectiveKey, effectiveMode);
    slideEngineRef?.setScaleFrequencies(freqs);
    set({ snapScaleKey: key, snapScaleMode: mode });
  },
}));
