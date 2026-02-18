import { useSynthStore } from '../store/synthStore';
import { CHORD_KEYS } from '../music/musicTypes';
import { ChordButton } from './ChordButton';

/**
 * Arc layout container positioning 7 ChordButton components in a semicircular arc.
 *
 * Uses CSS trig functions (sin/cos) for positioning. The arc sweeps ~180 degrees
 * with chord I at center-top, forming the instrument face -- the visual centerpiece
 * of the app. Dark background, chord buttons are the prominent visual elements.
 *
 * Layout: semicircle opening downward, degree I at top-center.
 * CSS custom properties control radius, start angle, and sweep.
 */
export function ChordArc() {
  const chordGrid = useSynthStore((s) => s.chordGrid);
  const activeChordDegrees = useSynthStore((s) => s.activeChordDegrees);
  const triggerChordByDegree = useSynthStore((s) => s.triggerChordByDegree);
  const releaseChordByDegree = useSynthStore((s) => s.releaseChordByDegree);

  const count = chordGrid.length; // 7
  const radius = 140; // px - radius of the arc
  // Arc from -90deg (left) through 90deg (right), chord I at top center (0deg up)
  // We use -PI to 0 in radians for a semicircle opening upward
  const startAngle = -Math.PI; // -180deg (left)
  const sweep = Math.PI; // 180deg total sweep

  return (
    <div
      className="relative"
      style={{
        width: radius * 2 + 96, // radius*2 + button diameter margin
        height: radius + 96, // half circle + button space
      }}
    >
      {chordGrid.map((chord, i) => {
        // Angle for this button: distribute evenly along the arc
        const angle = startAngle + (sweep * i) / (count - 1);
        // Convert to x,y position (origin at center-bottom of arc)
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);

        const isActive = activeChordDegrees.has(chord.degree);
        const keyLabel = CHORD_KEYS[i] ?? '';

        return (
          <div
            key={chord.degree}
            className="absolute"
            style={{
              // Center horizontally, position from bottom-center of container
              left: `calc(50% + ${x}px)`,
              top: `calc(${radius + 40}px + ${y}px)`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <ChordButton
              chord={chord}
              isActive={isActive}
              keyLabel={keyLabel}
              onTrigger={triggerChordByDegree}
              onRelease={releaseChordByDegree}
            />
          </div>
        );
      })}
    </div>
  );
}
