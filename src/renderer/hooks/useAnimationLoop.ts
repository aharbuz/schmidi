import { useEffect, useRef } from 'react';
import { useSynthStore, getVoiceManager, getSlideEngine } from '../store/synthStore';
import { getAudioContext } from '../audio/audioContext';

/**
 * requestAnimationFrame loop that polls voice states, slide track states,
 * and audio status.
 *
 * Starts when audioReady becomes true, cancels on unmount.
 * Lightweight: just reads states from VoiceManager/SlideEngine and pushes to Zustand store.
 *
 * Phase 3: when slideMode is true, also polls SlideEngine.getTrackStates()
 * and updates slideTrackStates in the store.
 */
export function useAnimationLoop() {
  const audioReady = useSynthStore((s) => s.audioReady);
  const updateVoiceStates = useSynthStore((s) => s.updateVoiceStates);
  const updateAudioStatus = useSynthStore((s) => s.updateAudioStatus);
  const updateSlideTrackStates = useSynthStore((s) => s.updateSlideTrackStates);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!audioReady) return;

    const loop = () => {
      const vm = getVoiceManager();
      if (vm) {
        updateVoiceStates(vm.getVoiceStates());
      }

      // Poll slide engine track states when slide mode is active
      const slideEngine = getSlideEngine();
      if (slideEngine && useSynthStore.getState().slideMode) {
        updateSlideTrackStates(slideEngine.getTrackStates());
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
  }, [audioReady, updateVoiceStates, updateAudioStatus, updateSlideTrackStates]);
}
