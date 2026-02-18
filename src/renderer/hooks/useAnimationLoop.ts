import { useEffect, useRef } from 'react';
import { useSynthStore, getVoiceManager } from '../store/synthStore';
import { getAudioContext } from '../audio/audioContext';

/**
 * requestAnimationFrame loop that polls voice states and audio status.
 *
 * Starts when audioReady becomes true, cancels on unmount.
 * Lightweight: just reads states from VoiceManager and pushes to Zustand store.
 */
export function useAnimationLoop() {
  const audioReady = useSynthStore((s) => s.audioReady);
  const updateVoiceStates = useSynthStore((s) => s.updateVoiceStates);
  const updateAudioStatus = useSynthStore((s) => s.updateAudioStatus);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!audioReady) return;

    const loop = () => {
      const vm = getVoiceManager();
      if (vm) {
        updateVoiceStates(vm.getVoiceStates());
      }

      const ctx = getAudioContext();
      updateAudioStatus({
        state: ctx.state,
        sampleRate: ctx.sampleRate,
        baseLatency: ctx.baseLatency ?? 0,
      });

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [audioReady, updateVoiceStates, updateAudioStatus]);
}
