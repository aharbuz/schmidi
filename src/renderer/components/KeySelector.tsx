import { useSynthStore } from '../store/synthStore';
import { CIRCLE_OF_FIFTHS } from '../music/musicTypes';
import type { MusicalKey } from '../music/musicTypes';

/**
 * Circular key selector showing 12 musical keys in circle-of-fifths order.
 *
 * Compact circle (~120px diameter) with each key as a small circular element.
 * Active key is highlighted with a filled background; inactive keys are
 * outlined. Clicking a key dispatches setKey to the store, which regenerates
 * the chord grid and retunes active voices.
 *
 * Positioned above the chord arc as a secondary control -- subtle styling
 * that doesn't compete with the chord arc's harmonic function colors.
 */
export function KeySelector() {
  const selectedKey = useSynthStore((s) => s.selectedKey);
  const setKey = useSynthStore((s) => s.setKey);

  const count = CIRCLE_OF_FIFTHS.length; // 12
  const radius = 48; // px - compact circle radius

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-[10px] text-gray-500 uppercase tracking-widest">
        Key
      </span>
      <div
        className="relative"
        style={{
          width: radius * 2 + 32,
          height: radius * 2 + 32,
        }}
      >
        {CIRCLE_OF_FIFTHS.map((key, i) => {
          const isActive = key === selectedKey;
          // Full 360-degree circle, starting from top (12 o'clock = -PI/2)
          const angle = (-Math.PI / 2) + (2 * Math.PI * i) / count;
          const x = radius * Math.cos(angle);
          const y = radius * Math.sin(angle);

          return (
            <button
              key={key}
              data-testid={`key-selector-${key}`}
              onClick={() => setKey(key as MusicalKey)}
              title={`Key of ${key}`}
              className={`
                absolute w-7 h-7 rounded-full
                flex items-center justify-center
                text-[11px] font-medium
                transition-all duration-100
                cursor-pointer
                focus:outline-none
                ${isActive
                  ? 'bg-white text-gray-900 shadow-sm shadow-white/30'
                  : 'bg-transparent text-gray-400 border border-gray-600/60 hover:border-gray-400/80 hover:text-gray-200'
                }
              `}
              style={{
                left: `calc(50% + ${x}px)`,
                top: `calc(50% + ${y}px)`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {key}
            </button>
          );
        })}
      </div>
    </div>
  );
}
