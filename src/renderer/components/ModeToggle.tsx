import { useSynthStore } from '../store/synthStore';

/**
 * Synth/Slide mode toggle - segmented control in the app header.
 *
 * Two-state pill toggle: "Synth" (chord arc mode) and "Slide" (convergence mode).
 * Active state highlighted with indigo, inactive grayed out.
 * Calls toggleSlideMode action in store.
 */
export function ModeToggle() {
  const slideMode = useSynthStore((s) => s.slideMode);
  const toggleSlideMode = useSynthStore((s) => s.toggleSlideMode);

  return (
    <div className="flex items-center justify-center">
      <div className="flex rounded-full bg-gray-900 border border-gray-700/50 p-0.5">
        <button
          type="button"
          onClick={() => slideMode && toggleSlideMode()}
          className={`px-4 h-8 rounded-full text-xs font-semibold tracking-wider uppercase transition-all ${
            !slideMode
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-transparent text-gray-400 hover:text-gray-300'
          }`}
        >
          Synth
        </button>
        <button
          type="button"
          onClick={() => !slideMode && toggleSlideMode()}
          className={`px-4 h-8 rounded-full text-xs font-semibold tracking-wider uppercase transition-all ${
            slideMode
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-transparent text-gray-400 hover:text-gray-300'
          }`}
        >
          Slide
        </button>
      </div>
    </div>
  );
}
