import { useCallback } from 'react';
import { useSynthStore, setVoiceManager } from '../store/synthStore';
import { getAudioContext, ensureAudioRunning } from '../audio/audioContext';
import { VoiceManager } from '../audio/VoiceManager';

/**
 * Hook to initialize the audio engine on user interaction.
 *
 * Returns initAudio (call on splash click) and audioReady status.
 * Creates VoiceManager, resumes AudioContext, and wires to Zustand store.
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
