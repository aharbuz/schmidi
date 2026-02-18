import { useEffect, useCallback, useRef } from 'react';
import { useSynthStore } from './store/synthStore';
import { useAnimationLoop } from './hooks/useAnimationLoop';
import { SplashScreen } from './components/SplashScreen';
import { TitleBar } from './components/TitleBar';
import { VoiceButton } from './components/VoiceButton';
import { WaveformSelector } from './components/WaveformSelector';
import { ADSRControls } from './components/ADSRControls';
import { EnvelopeCurve } from './components/EnvelopeCurve';
import { DEFAULT_VOICE_KEYS } from './audio/constants';

/**
 * Root application component.
 *
 * Shows SplashScreen until audio is initialized, then transitions
 * to the main instrument layout with custom title bar.
 */
export default function App() {
  const audioReady = useSynthStore((s) => s.audioReady);
  const voiceStates = useSynthStore((s) => s.voiceStates);
  const triggerVoice = useSynthStore((s) => s.triggerVoice);
  const releaseVoice = useSynthStore((s) => s.releaseVoice);

  // Start animation loop when audio is ready (polls voice states at 60fps)
  useAnimationLoop();

  // Track which keys are currently held to prevent key repeat
  const heldKeysRef = useRef<Set<string>>(new Set());

  // Keyboard handler for voice triggering
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.repeat) return;
      const key = e.key.toLowerCase();
      const voiceIndex = DEFAULT_VOICE_KEYS.indexOf(key);
      if (voiceIndex !== -1 && !heldKeysRef.current.has(key)) {
        heldKeysRef.current.add(key);
        triggerVoice(voiceIndex);
      }
    },
    [triggerVoice]
  );

  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const voiceIndex = DEFAULT_VOICE_KEYS.indexOf(key);
      if (voiceIndex !== -1) {
        heldKeysRef.current.delete(key);
        releaseVoice(voiceIndex);
      }
    },
    [releaseVoice]
  );

  useEffect(() => {
    if (!audioReady) return;
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      heldKeysRef.current.clear();
    };
  }, [audioReady, handleKeyDown, handleKeyUp]);

  if (!audioReady) {
    return <SplashScreen />;
  }

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0f] text-white overflow-hidden">
      <TitleBar />
      <main className="flex-1 flex gap-6 p-4 overflow-hidden">
        {/* Left column: Voice button grid (2x4) */}
        <section className="flex flex-col items-center justify-center gap-3">
          <span className="text-[10px] text-gray-500 uppercase tracking-widest">
            Voices
          </span>
          <div className="grid grid-cols-4 gap-2">
            {voiceStates.map((state, i) => (
              <VoiceButton
                key={i}
                voiceIndex={i}
                voiceState={state}
                keyLabel={DEFAULT_VOICE_KEYS[i]}
                onTrigger={triggerVoice}
                onRelease={releaseVoice}
              />
            ))}
          </div>
        </section>

        {/* Center column: Waveform selector + ADSR controls + Envelope curve */}
        <section className="flex-1 flex flex-col gap-4 items-center justify-center">
          <WaveformSelector />

          <ADSRControls />
          <EnvelopeCurve />
        </section>

        {/* Right column: placeholder for volume + oscilloscope (Plan 05) */}
        <section className="w-48 flex flex-col items-center justify-center gap-3">
          <div className="w-full h-full rounded-lg border border-gray-800/50 bg-[#0e0e16] flex items-center justify-center text-gray-600 text-xs">
            Volume + Scope
          </div>
        </section>
      </main>
      {/* StatusBar will go here in Plan 05 */}
    </div>
  );
}
