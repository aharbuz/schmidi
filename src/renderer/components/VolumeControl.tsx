import { useSynthStore } from '../store/synthStore';

/**
 * Master volume vertical slider.
 *
 * Range 0-1, maps to master gain via store.setMasterVolume().
 * Displays current value as percentage. Styled to match dark synth theme.
 */
export function VolumeControl() {
  const masterVolume = useSynthStore((s) => s.masterVolume);
  const setMasterVolume = useSynthStore((s) => s.setMasterVolume);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMasterVolume(parseFloat(e.target.value));
  };

  const pct = Math.round(masterVolume * 100);

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Label */}
      <span className="text-[10px] text-gray-500 uppercase tracking-widest">
        Vol
      </span>

      {/* Percentage display */}
      <span className="text-xs text-cyan-400/80 font-mono">{pct}%</span>

      {/* Vertical slider */}
      <input
        data-testid="volume-slider"
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={masterVolume}
        onChange={handleChange}
        className="volume-slider"
        title={`Volume: ${pct}%`}
        style={{
          writingMode: 'vertical-lr',
          direction: 'rtl',
          height: '120px',
          width: '28px',
        }}
      />

      {/* Custom slider styles */}
      <style>{volumeSliderStyles}</style>
    </div>
  );
}

/** Custom volume slider appearance matching dark synth theme */
const volumeSliderStyles = `
  .volume-slider {
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
    cursor: pointer;
  }

  .volume-slider::-webkit-slider-runnable-track {
    width: 6px;
    height: 100%;
    background: linear-gradient(to top, #1a1a2e, #2a2a3e);
    border-radius: 3px;
    border: 1px solid rgba(107, 114, 128, 0.3);
  }

  .volume-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: radial-gradient(circle, #22d3ee, #06b6d4);
    border: 2px solid rgba(6, 182, 212, 0.6);
    box-shadow: 0 0 8px rgba(6, 182, 212, 0.4);
    margin-left: -5px;
  }

  .volume-slider::-webkit-slider-thumb:hover {
    box-shadow: 0 0 12px rgba(6, 182, 212, 0.6);
  }

  .volume-slider:focus::-webkit-slider-thumb {
    box-shadow: 0 0 14px rgba(6, 182, 212, 0.7);
  }
`;
