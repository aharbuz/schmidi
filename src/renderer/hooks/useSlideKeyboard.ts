import { useEffect, useRef } from 'react';
import { useSynthStore } from '../store/synthStore';

/**
 * Custom hook for slide mode chord keyboard targeting.
 *
 * Maps home row keys (A S D F G H J) to 7 diatonic chord degrees (1-7),
 * same mapping as useChordKeyboard but routes to slide mode actions.
 *
 * Key differences from useChordKeyboard:
 * 1. Only active when slideMode === true (effect re-runs on slideMode change)
 * 2. Monophonic: only one chord target at a time (per locked decision)
 * 3. Release fires only when ALL keys are released (last-key-up behavior)
 * 4. Routes to triggerSlideChord / releaseSlideChord instead of Phase 2 actions
 */

const SLIDE_CHORD_KEYS = ['a', 's', 'd', 'f', 'g', 'h', 'j'];

export function useSlideKeyboard(): void {
  const slideMode = useSynthStore((s) => s.slideMode);
  const triggerSlideChord = useSynthStore((s) => s.triggerSlideChord);
  const releaseSlideChord = useSynthStore((s) => s.releaseSlideChord);
  const heldKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!slideMode) return; // Only active in slide mode

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (e.repeat) return; // Prevent key repeat
      if (!SLIDE_CHORD_KEYS.includes(key)) return;
      if (heldKeysRef.current.has(key)) return; // Already held

      heldKeysRef.current.add(key);
      const degree = SLIDE_CHORD_KEYS.indexOf(key) + 1;

      // Monophonic: release previous chord, trigger new one
      // (triggerSlideChord handles this internally)
      triggerSlideChord(degree);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (!SLIDE_CHORD_KEYS.includes(key)) return;

      heldKeysRef.current.delete(key);

      // Only release if no keys are held (monophonic -- last key up releases)
      if (heldKeysRef.current.size === 0) {
        releaseSlideChord();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      heldKeysRef.current.clear();
    };
  }, [slideMode, triggerSlideChord, releaseSlideChord]);
}
