import { useSynthStore } from '../store/synthStore';
import { ENVELOPE_PRESETS } from '../audio/envelopePresets';
import type { ADSRValues } from '../../shared/types';

/** Preset names for the dropdown */
const PRESET_NAMES = Object.keys(ENVELOPE_PRESETS);

/** Slider configuration for each ADSR parameter */
interface SliderConfig {
  key: keyof ADSRValues;
  label: string;
  shortLabel: string;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
}

const SLIDER_CONFIGS: SliderConfig[] = [
  {
    key: 'attack',
    label: 'Attack',
    shortLabel: 'A',
    min: 0.001,
    max: 2.0,
    step: 0.001,
    format: formatTime,
  },
  {
    key: 'decay',
    label: 'Decay',
    shortLabel: 'D',
    min: 0.01,
    max: 3.0,
    step: 0.01,
    format: formatTime,
  },
  {
    key: 'sustain',
    label: 'Sustain',
    shortLabel: 'S',
    min: 0.0,
    max: 1.0,
    step: 0.01,
    format: (v) => `${Math.round(v * 100)}%`,
  },
  {
    key: 'release',
    label: 'Release',
    shortLabel: 'R',
    min: 0.01,
    max: 5.0,
    step: 0.01,
    format: formatTime,
  },
];

/** Format time value: ms for <1s, seconds for >=1s */
function formatTime(value: number): string {
  if (value < 1) {
    return `${Math.round(value * 1000)}ms`;
  }
  return `${value.toFixed(1)}s`;
}

/**
 * ADSR parameter controls with 4 vertical sliders, numeric displays,
 * and envelope preset selector.
 *
 * Preset dropdown snaps all sliders to preset values.
 * Manual slider changes update ADSR values in the store.
 */
export function ADSRControls() {
  const adsr = useSynthStore((s) => s.adsr);
  const currentPreset = useSynthStore((s) => s.currentPreset);
  const setADSR = useSynthStore((s) => s.setADSR);
  const setPreset = useSynthStore((s) => s.setPreset);

  const handleSliderChange = (key: keyof ADSRValues, value: number) => {
    setADSR({ ...adsr, [key]: value });
  };

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPreset(e.target.value);
  };

  return (
    <div className="w-full max-w-md flex flex-col gap-3">
      {/* Preset selector */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-gray-500 uppercase tracking-widest">
          Preset
        </span>
        <select
          data-testid="preset-selector"
          value={currentPreset}
          onChange={(e) => { handlePresetChange(e); e.target.blur(); }}
          className="flex-1 bg-[#12121a] border border-gray-700/50 rounded-md
            text-sm text-gray-300 px-3 py-1.5
            focus:outline-none focus:ring-1 focus:ring-cyan-500/40 focus:border-cyan-500/40
            cursor-pointer"
        >
          {PRESET_NAMES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {/* ADSR Sliders */}
      <div className="flex items-end gap-4 justify-center">
        {SLIDER_CONFIGS.map((config) => (
          <ADSRSlider
            key={config.key}
            config={config}
            value={adsr[config.key]}
            onChange={(v) => handleSliderChange(config.key, v)}
          />
        ))}
      </div>
    </div>
  );
}

/** Individual vertical ADSR slider with numeric display */
function ADSRSlider({
  config,
  value,
  onChange,
}: {
  config: SliderConfig;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* Numeric display */}
      <span className="text-[10px] text-cyan-400/80 font-mono whitespace-nowrap">
        {config.shortLabel}: {config.format(value)}
      </span>

      {/* Vertical slider */}
      <input
        data-testid={`adsr-${config.key}`}
        type="range"
        min={config.min}
        max={config.max}
        step={config.step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="adsr-slider"
        title={`${config.label}: ${config.format(value)}`}
        style={{
          writingMode: 'vertical-lr',
          direction: 'rtl',
          height: '80px',
          width: '24px',
        }}
      />

      {/* Label */}
      <span className="text-[10px] text-gray-500 uppercase tracking-wider">
        {config.shortLabel}
      </span>

      {/* Custom slider styles */}
      <style>{sliderStyles}</style>
    </div>
  );
}

/** Custom slider appearance matching dark synth theme */
const sliderStyles = `
  .adsr-slider {
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
    cursor: pointer;
  }

  .adsr-slider::-webkit-slider-runnable-track {
    width: 4px;
    height: 100%;
    background: linear-gradient(to top, #1a1a2e, #2a2a3e);
    border-radius: 2px;
    border: 1px solid rgba(107, 114, 128, 0.3);
  }

  .adsr-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: radial-gradient(circle, #22d3ee, #06b6d4);
    border: 2px solid rgba(6, 182, 212, 0.6);
    box-shadow: 0 0 6px rgba(6, 182, 212, 0.4);
    margin-left: -5px;
  }

  .adsr-slider::-webkit-slider-thumb:hover {
    box-shadow: 0 0 10px rgba(6, 182, 212, 0.6);
  }

  .adsr-slider:focus::-webkit-slider-thumb {
    box-shadow: 0 0 12px rgba(6, 182, 212, 0.7);
  }
`;
