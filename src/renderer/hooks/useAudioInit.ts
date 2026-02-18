import { useCallback } from 'react';
import { useSynthStore, setVoiceManager, setChordVoiceManager } from '../store/synthStore';
import { getAudioContext, ensureAudioRunning } from '../audio/audioContext';
import { VoiceManager } from '../audio/VoiceManager';
import { ChordVoiceManager } from '../audio/ChordVoiceManager';

/**
 * Hook to initialize the audio engine on user interaction.
 *
 * Returns initAudio (call on splash click) and audioReady status.
 * Creates VoiceManager (Phase 1 voices) and ChordVoiceManager (Phase 2 chord pool),
 * resumes AudioContext, and wires both to Zustand store.
 *
 * Both managers share the same masterGain node for unified volume control.
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
