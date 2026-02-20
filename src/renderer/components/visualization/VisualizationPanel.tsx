import { useSynthStore } from '../../store/synthStore';
import { RadialView } from './RadialView';
import { WaveformView } from './WaveformView';
import { ViewToggle } from './ViewToggle';
import { CHORD_KEYS } from '../../music/musicTypes';
import { TRACK_HUES } from './vizColors';
import { PRESET_NAMES } from '../../audio/presets';

/** Roman numeral labels for 7 degrees */
const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

/**
 * VisualizationPanel -- Container that holds the active visualization canvas
 * and overlay elements.
 *
 * Reads vizMode from Zustand to conditionally render RadialView or WaveformView.
 * Overlays:
 * 1. ViewToggle -- top-right corner for radial/waveform switching
 * 2. FullViz expand button -- top-left corner
 * 3. Chord buttons -- bottom center, semi-transparent overlay row (only in slide mode)
 * 4. Active chord indicator -- brief text showing chord name when triggered
 */
export function VisualizationPanel() {
  const vizMode = useSynthStore((s) => s.vizMode);
  const slideMode = useSynthStore((s) => s.slideMode);
  const fullViz = useSynthStore((s) => s.fullViz);
  const toggleFullViz = useSynthStore((s) => s.toggleFullViz);
  const chordGrid = useSynthStore((s) => s.chordGrid);
  const activeSlideDegree = useSynthStore((s) => s.activeSlideDegree);
  const triggerSlideChord = useSynthStore((s) => s.triggerSlideChord);
  const releaseSlideChord = useSynthStore((s) => s.releaseSlideChord);
  const activePreset = useSynthStore((s) => s.activePreset);
  const presetIntensity = useSynthStore((s) => s.presetIntensity);
  const applyPreset = useSynthStore((s) => s.applyPreset);
  const setPresetIntensity = useSynthStore((s) => s.setPresetIntensity);

  return (
    <div className="relative w-full h-full">
      {/* Active visualization canvas */}
      {vizMode === 'radial' ? <RadialView /> : <WaveformView />}

      {/* View toggle -- top-right */}
      <ViewToggle />

      {/* Expand/collapse full-viz button -- top-left */}
      <button
        type="button"
        onClick={toggleFullViz}
        title={fullViz ? 'Exit full visualization (Escape)' : 'Full visualization mode'}
        className="absolute top-3 left-3 w-7 h-7 flex items-center justify-center
          bg-black/40 backdrop-blur-sm rounded-full z-10
          text-gray-500 hover:text-gray-200 transition-all"
      >
        {fullViz ? (
          /* Collapse icon (arrows inward) */
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M1 5 L5 5 L5 1" />
            <path d="M13 9 L9 9 L9 13" />
          </svg>
        ) : (
          /* Expand icon (arrows outward) */
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M5 1 L1 1 L1 5" />
            <path d="M9 13 L13 13 L13 9" />
          </svg>
        )}
      </button>

      {/* Preset overlay -- top center, only in slide mode */}
      {slideMode && (
        <div
          className={`absolute top-3 left-1/2 -translate-x-1/2 z-10
            bg-black/30 backdrop-blur-sm border border-white/5 rounded-full
            flex items-center gap-2 px-3 py-1.5
            transition-opacity ${fullViz ? 'opacity-30 hover:opacity-80' : 'opacity-80 hover:opacity-100'}`}
        >
          {PRESET_NAMES.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => applyPreset(name)}
              className={`px-3 py-1 rounded-full text-xs transition-all
                ${
                  activePreset === name
                    ? 'bg-indigo-600/40 text-white border border-indigo-400/30 glow-text'
                    : 'text-gray-500 hover:text-gray-300 border border-transparent'
                }`}
            >
              {name.charAt(0).toUpperCase() + name.slice(1)}
            </button>
          ))}
          {activePreset !== 'custom' && (
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={presetIntensity}
              onChange={(e) => setPresetIntensity(parseFloat(e.target.value))}
              className="w-20 h-1.5 accent-indigo-500"
              title={`Intensity: ${Math.round(presetIntensity * 100)}%`}
            />
          )}
        </div>
      )}

      {/* Chord overlay buttons -- bottom center, only in slide mode */}
      {slideMode && (
        <div
          className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-10
            flex items-center gap-1.5 px-3 py-2 rounded-full
            bg-black/30 backdrop-blur-sm border border-white/5
            transition-opacity ${fullViz ? 'opacity-30 hover:opacity-80' : 'opacity-80 hover:opacity-100'}`}
        >
          {chordGrid.map((chord, i) => {
            const degree = chord.degree;
            const isActive = activeSlideDegree === degree;
            const keyLabel = CHORD_KEYS[i] ?? '';
            const hue = TRACK_HUES[i % TRACK_HUES.length];

            return (
              <button
                key={degree}
                type="button"
                onMouseDown={() => triggerSlideChord(degree)}
                onMouseUp={() => releaseSlideChord()}
                onMouseLeave={() => {
                  if (isActive) releaseSlideChord();
                }}
                className={`flex flex-col items-center justify-center
                  w-10 h-12 rounded-lg border transition-all text-center
                  ${
                    isActive
                      ? 'border-white/20 text-white'
                      : 'border-white/5 text-gray-500 hover:text-gray-300 hover:border-white/10'
                  }`}
                style={
                  isActive
                    ? {
                        backgroundColor: `hsla(${hue}, 80%, 50%, 0.25)`,
                        boxShadow: `0 0 12px hsla(${hue}, 90%, 60%, 0.3)`,
                      }
                    : { backgroundColor: 'rgba(0,0,0,0.2)' }
                }
              >
                <span className="text-[10px] font-semibold leading-none">{ROMAN_NUMERALS[i]}</span>
                <span className="text-[8px] text-gray-500 mt-0.5 uppercase leading-none">{keyLabel}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Active chord indicator text */}
      {slideMode && activeSlideDegree !== null && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <span className="text-lg font-bold text-white/60 tracking-wider drop-shadow-lg">
            {chordGrid[activeSlideDegree - 1]?.chordSymbol ?? ROMAN_NUMERALS[activeSlideDegree - 1]}
          </span>
        </div>
      )}
    </div>
  );
}
