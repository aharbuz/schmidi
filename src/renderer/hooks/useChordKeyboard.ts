import { useEffect, useRef, useCallback } from 'react';
import { useSynthStore } from '../store/synthStore';
import { CHORD_KEYS } from '../music/musicTypes';

/**
 * Custom hook for chord keyboard triggering.
 *
 * Maps home row keys (A S D F G H J) to 7 diatonic chord degrees (1-7).
 * Tracks held keys to prevent key-repeat double triggers. Supports
 * polychordal playback -- multiple keys held simultaneously trigger
 * multiple chords.
 *
 * Replaces Phase 1's inline keyboard handler in App.tsx.
 */
export function useChordKeyboard() {
  const audioReady = useSynthStore((s) => s.audioReady);
  const slideMode = useSynthStore((s) => s.slideMode);
  const triggerChordByDegree = useSynthStore((s) => s.triggerChordByDegree);
  const releaseChordByDegree = useSynthStore((s) => s.releaseChordByDegree);

  // Track which keys are currently held to prevent key repeat
  const heldKeysRef = useRef<Set<string>>(new Set());

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.repeat) return;
      const key = e.key.toLowerCase();
      const index = CHORD_KEYS.indexOf(key as typeof CHORD_KEYS[number]);
      if (index === -1) return;

      const degree = index + 1; // 1-indexed degree
      if (!heldKeysRef.current.has(key)) {
        heldKeysRef.current.add(key);
        triggerChordByDegree(degree);
      }
    },
    [triggerChordByDegree]
  );

  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const index = CHORD_KEYS.indexOf(key as typeof CHORD_KEYS[number]);
      if (index === -1) return;

      const degree = index + 1;
      heldKeysRef.current.delete(key);
      releaseChordByDegree(degree);
    },
    [releaseChordByDegree]
  );

  useEffect(() => {
    // Inactive when audio not ready or when in slide mode
    if (!audioReady || slideMode) return;

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      heldKeysRef.current.clear();
    };
  }, [audioReady, slideMode, handleKeyDown, handleKeyUp]);
}
