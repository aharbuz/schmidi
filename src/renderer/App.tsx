import { useSynthStore } from './store/synthStore';
import { useAnimationLoop } from './hooks/useAnimationLoop';
import { useChordKeyboard } from './hooks/useChordKeyboard';
import { SplashScreen } from './components/SplashScreen';
import { TitleBar } from './components/TitleBar';
import { ChordArc } from './components/ChordArc';
import { KeySelector } from './components/KeySelector';
import { ModeSelector } from './components/ModeSelector';
import { WaveformSelector } from './components/WaveformSelector';
import { ADSRControls } from './components/ADSRControls';
import { EnvelopeCurve } from './components/EnvelopeCurve';
import { VolumeControl } from './components/VolumeControl';
import { Oscilloscope } from './components/Oscilloscope';
import { PerTrackVolume } from './components/PerTrackVolume';
import { StatusBar } from './components/StatusBar';

/**
 * Root application component.
 *
 * Phase 2 layout: chord arc as the dominant instrument face in the center,
 * key/mode selectors + waveform/ADSR controls in the left column,
 * volume + oscilloscope + per-track mix in the right column.
 *
 * Keyboard handling delegated to useChordKeyboard hook (A-J = 7 chords).
 * Phase 1 VoiceButton grid replaced; VoiceButton component file retained
 * for potential debug/legacy mode.
 */
export default function App() {
  const audioReady = useSynthStore((s) => s.audioReady);

  // Start animation loop when audio is ready (polls voice states at 60fps)
  useAnimationLoop();

  // Chord keyboard handler (A S D F G H J = 7 diatonic chords)
  useChordKeyboard();

  if (!audioReady) {
    return <SplashScreen />;
  }

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0f] text-white overflow-hidden">
      <TitleBar />

      <main className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* Left column: Key/Mode selectors + Waveform/ADSR controls */}
        <section className="w-56 flex flex-col items-center justify-center gap-4 shrink-0">
          <KeySelector />
          <ModeSelector />
          <div className="w-full border-t border-gray-800/30 my-1" />
          <WaveformSelector />
          <ADSRControls />
          <EnvelopeCurve />
        </section>

        {/* Center: Chord Arc -- the instrument face */}
        <section className="flex-1 flex items-center justify-center overflow-hidden">
          <ChordArc />
        </section>

        {/* Right column: Volume + Oscilloscope + Per-track mix */}
        <section className="w-52 flex flex-col items-center justify-center gap-4 shrink-0">
          <VolumeControl />
          <Oscilloscope />
          <PerTrackVolume />
        </section>
      </main>

      {/* Status bar: AudioContext diagnostics */}
      <StatusBar />
    </div>
  );
}
