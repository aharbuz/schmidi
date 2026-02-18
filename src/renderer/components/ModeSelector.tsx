import { useSynthStore } from '../store/synthStore';
import { MODES } from '../music/musicTypes';
import type { MusicalMode } from '../music/musicTypes';

/**
 * Horizontal segmented control for selecting one of 8 musical modes.
 *
 * Active mode has a filled background with contrasting text.
 * Inactive modes are transparent with muted text. Clean, minimal styling
 * using neutral gray colors to avoid competing with the chord arc's
 * harmonic function colors.
 *
 * Clicking a mode dispatches setMode to the store, which regenerates
 * the chord grid and retunes active voices.
 */
export function ModeSelector() {
  const selectedMode = useSynthStore((s) => s.selectedMode);
  const setMode = useSynthStore((s) => s.setMode);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-[10px] text-gray-500 uppercase tracking-widest">
        Mode
      </span>
      <div className="flex flex-wrap justify-center gap-1 max-w-[320px]">
        {MODES.map((mode) => {
          const isActive = mode === selectedMode;
          const label = mode.charAt(0).toUpperCase() + mode.slice(1);

          return (
            <button
              key={mode}
              data-testid={`mode-selector-${mode}`}
              onClick={() => setMode(mode as MusicalMode)}
              title={`${label} mode`}
              className={`
                px-2.5 py-1 rounded-full
                text-[11px] font-medium
                transition-all duration-100
                cursor-pointer
                focus:outline-none
                ${isActive
                  ? 'bg-gray-200 text-gray-900'
                  : 'bg-transparent text-gray-500 border border-gray-700/50 hover:border-gray-500/70 hover:text-gray-300'
                }
              `}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
