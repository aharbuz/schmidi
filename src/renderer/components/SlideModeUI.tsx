import { useSynthStore } from '../store/synthStore';
import { CHORD_KEYS } from '../music/musicTypes';
import type { SlideTrackPhase } from '../audio/SlideTrack';

/**
 * Slide mode center panel - replaces ChordArc when slideMode is true.
 *
 * Layout (top to bottom):
 * 1. Track status area: colored dots/bars showing each track's phase and pitch
 * 2. Active chord indicator: large text showing targeted chord degree
 * 3. Chord targeting buttons: 7 horizontal buttons for degrees I-VII
 *
 * Mouse down/up on chord buttons triggers/releases slide chord (monophonic).
 */

/** Color mapping for track phases */
const PHASE_COLORS: Record<SlideTrackPhase, string> = {
  idle: 'bg-gray-500',
  converging: 'bg-amber-400',
  held: 'bg-emerald-400',
  departing: 'bg-rose-400',
};

const PHASE_GLOW: Record<SlideTrackPhase, string> = {
  idle: '',
  converging: 'animate-pulse shadow-amber-400/50 shadow-sm',
  held: 'shadow-emerald-400/40 shadow-sm',
  departing: 'opacity-60',
};

/** Convert frequency to approximate note name for display */
function freqToNote(freq: number): string {
  if (freq <= 0) return '--';
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const semitones = 12 * Math.log2(freq / 440);
  const midi = Math.round(semitones + 69);
  const noteName = noteNames[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${noteName}${octave}`;
}

/** Roman numeral labels for 7 degrees */
const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

export function SlideModeUI() {
  const slideTrackStates = useSynthStore((s) => s.slideTrackStates);
  const activeSlideDegree = useSynthStore((s) => s.activeSlideDegree);
  const chordGrid = useSynthStore((s) => s.chordGrid);
  const triggerSlideChord = useSynthStore((s) => s.triggerSlideChord);
  const releaseSlideChord = useSynthStore((s) => s.releaseSlideChord);

  return (
    <div className="flex flex-col items-center justify-center gap-8 w-full max-w-lg">
      {/* Track status area */}
      <div className="w-full">
        <h3 className="text-[10px] text-gray-500 uppercase tracking-widest mb-3 text-center">
          Track Status
        </h3>
        <div className="flex flex-col gap-2">
          {slideTrackStates.length === 0 ? (
            <div className="text-xs text-gray-600 text-center py-2">
              No active tracks
            </div>
          ) : (
            slideTrackStates.map((track, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-gray-900/60"
              >
                {/* Phase indicator dot */}
                <div
                  className={`w-2.5 h-2.5 rounded-full ${PHASE_COLORS[track.state]} ${PHASE_GLOW[track.state]}`}
                  title={`Track ${i + 1}: ${track.state}`}
                />

                {/* Track label */}
                <span className="text-[10px] text-gray-500 w-8 font-mono">
                  T{i + 1}
                </span>

                {/* Current pitch */}
                <span className="text-xs text-gray-300 font-mono w-10">
                  {freqToNote(track.currentFreq)}
                </span>

                {/* Proximity bar (during convergence/held) */}
                <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-100 ${
                      track.state === 'held'
                        ? 'bg-emerald-400'
                        : track.state === 'converging'
                          ? 'bg-amber-400'
                          : 'bg-gray-600'
                    }`}
                    style={{ width: `${Math.round(track.proximity * 100)}%` }}
                  />
                </div>

                {/* Phase label */}
                <span className="text-[9px] text-gray-500 uppercase w-16 text-right">
                  {track.state}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Active chord indicator */}
      <div className="text-center">
        <div
          className={`text-4xl font-bold tracking-wide transition-colors ${
            activeSlideDegree !== null
              ? 'text-indigo-400'
              : 'text-gray-600'
          }`}
        >
          {activeSlideDegree !== null
            ? chordGrid[activeSlideDegree - 1]?.chordSymbol ?? ROMAN_NUMERALS[activeSlideDegree - 1]
            : 'No target'}
        </div>
        {activeSlideDegree !== null && (
          <div className="text-xs text-gray-500 mt-1">
            Degree {ROMAN_NUMERALS[activeSlideDegree - 1]}
          </div>
        )}
      </div>

      {/* Chord targeting buttons */}
      <div className="w-full">
        <h3 className="text-[10px] text-gray-500 uppercase tracking-widest mb-3 text-center">
          Chord Targets
        </h3>
        <div className="flex gap-2 justify-center">
          {chordGrid.map((chord, i) => {
            const degree = chord.degree;
            const isActive = activeSlideDegree === degree;
            const keyLabel = CHORD_KEYS[i] ?? '';

            return (
              <button
                key={degree}
                type="button"
                onMouseDown={() => triggerSlideChord(degree)}
                onMouseUp={() => releaseSlideChord()}
                onMouseLeave={() => {
                  // Release if mouse leaves while pressed
                  if (isActive) releaseSlideChord();
                }}
                className={`
                  flex flex-col items-center justify-center
                  w-14 h-16 rounded-xl
                  border transition-all
                  ${
                    isActive
                      ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300 shadow-lg shadow-indigo-600/20'
                      : 'bg-gray-900 border-gray-700/50 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                  }
                `}
                title={`${chord.chordSymbol} (${ROMAN_NUMERALS[i]}) - Key: ${keyLabel.toUpperCase()}`}
              >
                <span className="text-sm font-semibold">{chord.chordSymbol}</span>
                <span className="text-[9px] text-gray-500 mt-0.5">{ROMAN_NUMERALS[i]}</span>
                <span className="text-[8px] text-gray-600 mt-0.5 uppercase">{keyLabel}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
