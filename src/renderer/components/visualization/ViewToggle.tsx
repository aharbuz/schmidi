import { useSynthStore } from '../../store/synthStore';

/**
 * Small radial/waveform toggle icon overlaying the canvas.
 *
 * Two inline SVG icons: circle for radial, wavy line for waveform.
 * Current mode is bright, other is dimmed. Positioned top-right of canvas.
 * Does NOT interrupt audio when switching -- only changes which canvas renders.
 */
export function ViewToggle() {
  const vizMode = useSynthStore((s) => s.vizMode);
  const setVizMode = useSynthStore((s) => s.setVizMode);

  return (
    <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2 py-1 z-10">
      {/* Radial view icon (concentric circle) */}
      <button
        type="button"
        onClick={() => setVizMode('radial')}
        title="Radial view"
        className={`w-6 h-6 flex items-center justify-center rounded-full transition-all ${
          vizMode === 'radial'
            ? 'text-cyan-300 bg-cyan-500/20'
            : 'text-gray-500 hover:text-gray-300'
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        </svg>
      </button>

      {/* Waveform view icon (wavy line) */}
      <button
        type="button"
        onClick={() => setVizMode('waveform')}
        title="Waveform view"
        className={`w-6 h-6 flex items-center justify-center rounded-full transition-all ${
          vizMode === 'waveform'
            ? 'text-cyan-300 bg-cyan-500/20'
            : 'text-gray-500 hover:text-gray-300'
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M1 7 C3 3, 5 3, 7 7 C9 11, 11 11, 13 7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}
