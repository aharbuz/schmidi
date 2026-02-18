import { useSynthStore } from '../store/synthStore';

/**
 * Roman numeral labels for 7 diatonic chord degrees.
 */
const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

/**
 * Expandable per-chord-group volume panel.
 *
 * Hidden by default; expands to reveal 7 vertical sliders (one per chord
 * degree) labeled with Roman numerals. The panel slides out from a compact
 * toggle button.
 *
 * Each slider is a controlled input wired through the Zustand store to
 * per-degree GainNodes in ChordVoiceManager, providing independent volume
 * control for each chord degree in the audio chain.
 */
export function PerTrackVolume() {
  const perTrackExpanded = useSynthStore((s) => s.perTrackExpanded);
  const togglePerTrackPanel = useSynthStore((s) => s.togglePerTrackPanel);

  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* Toggle button */}
      <button
        data-testid="per-track-toggle"
        onClick={togglePerTrackPanel}
        title={perTrackExpanded ? 'Collapse mix panel' : 'Expand mix panel'}
        className="
          flex items-center gap-1.5 px-2.5 py-1 rounded-md
          text-[10px] uppercase tracking-widest
          border border-gray-700/50 bg-[#12121a]
          text-gray-500 hover:text-gray-300 hover:border-gray-600/70
          transition-all duration-150 cursor-pointer
          focus:outline-none
        "
      >
        <span
          className="transition-transform duration-200"
          style={{ transform: perTrackExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          {'\u25B6'}
        </span>
        Mix
      </button>

      {/* Expandable slider panel */}
      {perTrackExpanded && (
        <div
          data-testid="per-track-panel"
          className="
            flex gap-2.5 p-3 rounded-lg
            bg-[#0d0d14] border border-gray-800/40
          "
        >
          {ROMAN_NUMERALS.map((numeral, i) => (
            <PerTrackSlider key={i} degree={i + 1} label={numeral} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Individual per-track vertical slider.
 *
 * Controlled input reading from store perTrackVolumes and dispatching
 * setPerTrackVolume on change, which routes through ChordVoiceManager's
 * per-degree GainNodes for independent audio level control.
 */
function PerTrackSlider({ degree, label }: { degree: number; label: string }) {
  const volume = useSynthStore((s) => s.perTrackVolumes[degree - 1]);
  const setPerTrackVolume = useSynthStore((s) => s.setPerTrackVolume);

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Roman numeral label */}
      <span className="text-[9px] text-gray-500 font-mono">{label}</span>

      {/* Vertical slider */}
      <input
        data-testid={`per-track-slider-${degree}`}
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={volume}
        onChange={(e) => setPerTrackVolume(degree, parseFloat(e.target.value))}
        title={`${label} volume`}
        className="per-track-slider"
        style={{
          writingMode: 'vertical-lr',
          direction: 'rtl',
          height: '60px',
          width: '18px',
        }}
      />

      {/* Custom slider styles */}
      <style>{perTrackSliderStyles}</style>
    </div>
  );
}

/** Custom slider appearance for per-track sliders -- compact, muted */
const perTrackSliderStyles = `
  .per-track-slider {
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
    cursor: pointer;
  }

  .per-track-slider::-webkit-slider-runnable-track {
    width: 3px;
    height: 100%;
    background: linear-gradient(to top, #1a1a2e, #252535);
    border-radius: 2px;
    border: 1px solid rgba(107, 114, 128, 0.2);
  }

  .per-track-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: radial-gradient(circle, #94a3b8, #64748b);
    border: 1px solid rgba(148, 163, 184, 0.4);
    margin-left: -4px;
  }

  .per-track-slider::-webkit-slider-thumb:hover {
    box-shadow: 0 0 6px rgba(148, 163, 184, 0.4);
  }
`;
