import { useCallback } from 'react';
import { useSynthStore, setVoiceManager, setChordVoiceManager, setSlideEngine } from '../store/synthStore';
import { getAudioContext, ensureAudioRunning } from '../audio/audioContext';
import { VoiceManager } from '../audio/VoiceManager';
import { ChordVoiceManager } from '../audio/ChordVoiceManager';
import { SlideEngine } from '../audio/SlideEngine';
import { DEFAULT_SLIDE_CONFIG } from '../audio/SlideTrack';

/**
 * Hook to initialize the audio engine on user interaction.
 *
 * Returns initAudio (call on splash click) and audioReady status.
 * Creates VoiceManager (Phase 1 voices), ChordVoiceManager (Phase 2 chord pool),
 * and SlideEngine (Phase 3 slide mode). Resumes AudioContext and wires all to Zustand store.
 *
 * All three managers share the same masterGain node for unified volume control.
 */
export function useAudioInit() {
  const audioReady = useSynthStore((s) => s.audioReady);
  const setAudioReady = useSynthStore((s) => s.setAudioReady);
  const updateAudioStatus = useSynthStore((s) => s.updateAudioStatus);

  const initAudio = useCallback(async () => {
    if (audioReady) return;

    // Get or create the singleton AudioContext
    const ctx = getAudioContext();

    // Create VoiceManager (creates master bus + 8 voices)
    const vm = new VoiceManager(ctx);
    setVoiceManager(vm);

    // Create ChordVoiceManager -- connects to the SAME masterGain as Phase 1 voices
    // This ensures master volume slider controls both Phase 1 and Phase 2 audio
    const cvm = new ChordVoiceManager(ctx, vm.getMasterBus().masterGain);
    setChordVoiceManager(cvm);

    // Create SlideEngine -- connects to the SAME masterGain for unified volume control
    // Scheduler not started until user toggles to slide mode (via toggleSlideMode action)
    const se = new SlideEngine(ctx, vm.getMasterBus().masterGain, DEFAULT_SLIDE_CONFIG);
    se.pauseScheduler(); // Ensure slide tracks are silent until user toggles to slide mode
    setSlideEngine(se);

    // Resume AudioContext (required after user gesture)
    await ensureAudioRunning();

    // Update store with audio status
    updateAudioStatus({
      state: ctx.state,
      sampleRate: ctx.sampleRate,
      baseLatency: ctx.baseLatency ?? 0,
    });

    // Mark audio as ready -- triggers UI transition
    setAudioReady(true);
  }, [audioReady, setAudioReady, updateAudioStatus]);

  return { initAudio, audioReady };
}
