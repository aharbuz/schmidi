import { useSynthStore } from './store/synthStore';
import { useAnimationLoop } from './hooks/useAnimationLoop';
import { useChordKeyboard } from './hooks/useChordKeyboard';
import { useSlideKeyboard } from './hooks/useSlideKeyboard';
import { SplashScreen } from './components/SplashScreen';
import { TitleBar } from './components/TitleBar';
import { ChordArc } from './components/ChordArc';
import { ModeToggle } from './components/ModeToggle';
import { SlideModeUI } from './components/SlideModeUI';
import { KeySelector } from './components/KeySelector';
import { ModeSelector } from './components/ModeSelector';
import { WaveformSelector } from './components/WaveformSelector';
import { ADSRControls } from './components/ADSRControls';
import { EnvelopeCurve } from './components/EnvelopeCurve';
import { VolumeControl } from './components/VolumeControl';
import { Oscilloscope } from './components/Oscilloscope';
import { PerTrackVolume } from './components/PerTrackVolume';
import { SlideControls } from './components/SlideControls';
import { StatusBar } from './components/StatusBar';

/**
 * Root application component.
 *
 * Phase 3 layout: Synth/Slide mode toggle at top, center panel conditionally
 * renders ChordArc (synth mode) or SlideModeUI (slide mode).
 * Left column: key/mode selectors + waveform/ADSR controls.
 * Right column: volume + oscilloscope + per-track mix.
 *
 * Keyboard handling: useChordKeyboard (synth mode) and useSlideKeyboard (slide mode).
 * Animation loop polls voice states and slide track states at 60fps.
 */
export default function App() {
  const audioReady = useSynthStore((s) => s.audioReady);
  const slideMode = useSynthStore((s) => s.slideMode);

  // Start animation loop when audio is ready (polls voice states at 60fps)
  useAnimationLoop();

  // Chord keyboard handler (A S D F G H J = 7 diatonic chords) -- inactive in slide mode
  useChordKeyboard();

  // Slide keyboard handler (same keys, routes to slide actions) -- active in slide mode
  useSlideKeyboard();

  if (!audioReady) {
    return <SplashScreen />;
  }

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0f] text-white overflow-hidden">
      <TitleBar />

      {/* Mode toggle: Synth / Slide */}
      <div className="py-2">
        <ModeToggle />
      </div>

      <main className="flex-1 flex gap-4 px-4 pb-4 overflow-hidden">
        {/* Left column: Key/Mode selectors + Waveform/ADSR controls */}
        <section className="w-56 flex flex-col items-center justify-center gap-4 shrink-0">
          <KeySelector />
          <ModeSelector />
          <div className="w-full border-t border-gray-800/30 my-1" />
          <WaveformSelector />
          <span className="text-[10px] text-gray-500 uppercase tracking-widest">
            {slideMode ? 'Anchor ADSR' : 'Envelope'}
          </span>
          <ADSRControls />
          <EnvelopeCurve />
        </section>

        {/* Center: conditional render based on mode */}
        <section className="flex-1 flex items-center justify-center overflow-hidden">
          {slideMode ? <SlideModeUI /> : <ChordArc />}
        </section>

        {/* Right column: Volume + Oscilloscope + Per-track mix / Slide controls */}
        <section className="w-56 flex flex-col items-center gap-4 shrink-0 overflow-hidden">
          <VolumeControl />
          <Oscilloscope />
          {slideMode ? <SlideControls /> : <PerTrackVolume />}
        </section>
      </main>

      {/* Status bar: AudioContext diagnostics */}
      <StatusBar />
    </div>
  );
}
