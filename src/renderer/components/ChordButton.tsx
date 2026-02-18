import type { ChordData, HarmonicFunction } from '../music/musicTypes';

interface ChordButtonProps {
  chord: ChordData;
  isActive: boolean;
  keyLabel: string;
  onTrigger: (degree: number) => void;
  onRelease: (degree: number) => void;
}

/**
 * Single chord button for the chord arc instrument face.
 *
 * Displays Roman numeral (primary), root note name (secondary),
 * and keyboard shortcut. Color-coded by harmonic function:
 * - Tonic (I, iii, vi): indigo
 * - Subdominant (ii, IV): amber
 * - Dominant (V, vii): rose
 *
 * Tonic chord (degree 1) is visually larger than others.
 * Active state scales up with a glow effect.
 */
export function ChordButton({
  chord,
  isActive,
  keyLabel,
  onTrigger,
  onRelease,
}: ChordButtonProps) {
  const isTonic = chord.degree === 1;
  const colors = getHarmonicColors(chord.harmonicFunction);

  const size = isTonic ? 'w-20 h-20' : 'w-16 h-16';
  const romanSize = isTonic ? 'text-lg' : 'text-base';

  const handleMouseDown = () => onTrigger(chord.degree);
  const handleMouseUp = () => onRelease(chord.degree);
  const handleMouseLeave = () => {
    if (isActive) onRelease(chord.degree);
  };

  return (
    <button
      data-testid={`chord-button-${chord.degree}`}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      title={`${chord.chordSymbol} (${chord.romanNumeral}) - Press '${keyLabel.toUpperCase()}'`}
      className={`
        ${size} rounded-full
        flex flex-col items-center justify-center
        cursor-pointer select-none
        transition-all duration-100
        border-2
        ${isActive ? colors.active : colors.idle}
        ${isActive ? 'scale-110' : 'scale-100'}
        focus:outline-none
      `}
      style={isActive ? { boxShadow: colors.glow } : undefined}
    >
      {/* Roman numeral - primary label */}
      <span className={`${romanSize} font-bold leading-tight`}>
        {chord.romanNumeral}
      </span>

      {/* Root note name - secondary label */}
      <span className="text-[10px] opacity-70 leading-tight">
        {chord.rootNote}
      </span>

      {/* Keyboard shortcut - always visible */}
      <span className="text-[9px] opacity-40 uppercase mt-0.5 leading-tight">
        {keyLabel}
      </span>
    </button>
  );
}

/** Color scheme per harmonic function */
interface HarmonicColors {
  idle: string;
  active: string;
  glow: string;
}

function getHarmonicColors(fn: HarmonicFunction): HarmonicColors {
  switch (fn) {
    case 'tonic':
      return {
        idle: 'bg-indigo-600/80 border-indigo-500/50 text-indigo-50 hover:bg-indigo-500/90 hover:border-indigo-400/70',
        active: 'bg-indigo-400 border-indigo-300 text-white',
        glow: '0 0 20px rgba(99, 102, 241, 0.6), 0 0 40px rgba(99, 102, 241, 0.2)',
      };
    case 'subdominant':
      return {
        idle: 'bg-amber-600/80 border-amber-500/50 text-amber-50 hover:bg-amber-500/90 hover:border-amber-400/70',
        active: 'bg-amber-400 border-amber-300 text-white',
        glow: '0 0 20px rgba(245, 158, 11, 0.6), 0 0 40px rgba(245, 158, 11, 0.2)',
      };
    case 'dominant':
      return {
        idle: 'bg-rose-600/80 border-rose-500/50 text-rose-50 hover:bg-rose-500/90 hover:border-rose-400/70',
        active: 'bg-rose-400 border-rose-300 text-white',
        glow: '0 0 20px rgba(244, 63, 94, 0.6), 0 0 40px rgba(244, 63, 94, 0.2)',
      };
  }
}
