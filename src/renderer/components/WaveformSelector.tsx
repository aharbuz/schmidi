import { useSynthStore } from '../store/synthStore';
import type { WaveformType } from '../../shared/types';

/** Waveform options with SVG icon paths */
const WAVEFORMS: { type: WaveformType; label: string }[] = [
  { type: 'sine', label: 'Sine' },
  { type: 'square', label: 'Square' },
  { type: 'sawtooth', label: 'Sawtooth' },
  { type: 'triangle', label: 'Triangle' },
];

/**
 * Horizontal row of waveform icon buttons.
 *
 * Displays 4 waveform types as SVG icons. The active waveform has a
 * cyan highlight. Clicking sets the waveform on all voices via the store.
 */
export function WaveformSelector() {
  const currentWaveform = useSynthStore((s) => s.currentWaveform);
  const setWaveform = useSynthStore((s) => s.setWaveform);

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-500 uppercase tracking-widest mr-1">
        Wave
      </span>
      {WAVEFORMS.map(({ type, label }) => {
        const isActive = currentWaveform === type;
        return (
          <button
            key={type}
            data-testid={`waveform-${type}`}
            onClick={() => setWaveform(type)}
            title={label}
            className={`
              w-10 h-10 rounded-md flex items-center justify-center
              border transition-all duration-150
              cursor-pointer select-none no-select
              focus:outline-none focus:ring-1 focus:ring-cyan-500/40
              ${
                isActive
                  ? 'border-cyan-500/60 bg-cyan-500/10 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                  : 'border-gray-700/50 bg-[#12121a] text-gray-500 hover:border-gray-600/70 hover:text-gray-400'
              }
            `}
          >
            <WaveformIcon type={type} />
          </button>
        );
      })}
    </div>
  );
}

/** SVG waveform icons */
function WaveformIcon({ type }: { type: WaveformType }) {
  const strokeColor = 'currentColor';
  const svgProps = {
    width: 22,
    height: 16,
    viewBox: '0 0 22 16',
    fill: 'none',
    stroke: strokeColor,
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (type) {
    case 'sine':
      return (
        <svg {...svgProps}>
          <path d="M1 8 C4 2, 7 2, 11 8 C15 14, 18 14, 21 8" />
        </svg>
      );
    case 'square':
      return (
        <svg {...svgProps}>
          <path d="M1 12 L1 4 L7 4 L7 12 L13 12 L13 4 L19 4 L19 12 L21 12" />
        </svg>
      );
    case 'sawtooth':
      return (
        <svg {...svgProps}>
          <path d="M1 12 L7 3 L7 12 L13 3 L13 12 L19 3 L19 12 L21 12" />
        </svg>
      );
    case 'triangle':
      return (
        <svg {...svgProps}>
          <path d="M1 12 L5.5 3 L11 12 L16.5 3 L21 12" />
        </svg>
      );
  }
}
