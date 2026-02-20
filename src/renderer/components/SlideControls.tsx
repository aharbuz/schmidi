import { useState } from 'react';
import { useSynthStore } from '../store/synthStore';
import type { IdleMode, PostArrivalMode } from '../audio/presets';
import { CIRCLE_OF_FIFTHS, MODES } from '../music/musicTypes';
import type {
  TrackModel,
  IdleMovementMode,
  IdleRangeType,
  StartingPosition,
  TrackCorrelation,
  PitchBoundary,
  EdgeBehavior,
  SwellCurve,
  DepartureDirection,
  EasingType,
  MidConvergenceBehavior,
  ModeToggleBehavior,
  TrackPartitioning,
  TrackInteraction,
} from '../audio/SlideTrack';

/**
 * All slide mode configuration controls, organized in 5 collapsible sections.
 *
 * Sections: Track Model, Idle Behavior, Convergence, Swell Envelope, Post-Arrival.
 * Every control has a tooltip (CSS-based via data-tooltip attribute).
 * All controls call updateSlideConfig with the changed property.
 *
 * Only renders when slideMode is true (guarded by parent).
 */
export function SlideControls() {
  const slideConfig = useSynthStore((s) => s.slideConfig);
  const updateSlideConfig = useSynthStore((s) => s.updateSlideConfig);
  const idleMode = useSynthStore((s) => s.idleMode);
  const setIdleMode = useSynthStore((s) => s.setIdleMode);
  const postArrivalMode = useSynthStore((s) => s.postArrivalMode);
  const setPostArrivalMode = useSynthStore((s) => s.setPostArrivalMode);
  const snapScaleKey = useSynthStore((s) => s.snapScaleKey);
  const snapScaleMode = useSynthStore((s) => s.snapScaleMode);
  const setSnapScale = useSynthStore((s) => s.setSnapScale);

  // Collapsible section state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    personality: true,
    trackModel: false,
    idle: false,
    convergence: false,
    swell: false,
    postArrival: false,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="w-full flex flex-col gap-1 overflow-y-auto max-h-full pr-1 text-xs">
      {/* Section 0: Personality */}
      <CollapsibleSection
        title="Personality"
        isOpen={openSections.personality}
        onToggle={() => toggleSection('personality')}
      >
        <RadioGroup<IdleMode>
          label="Idle Mode"
          value={idleMode}
          options={[
            { value: 'silent', label: 'Silent' },
            { value: 'quiet-sliding', label: 'Quiet Sliding' },
            { value: 'ambient-drone', label: 'Ambient Drone' },
          ]}
          onChange={(v) => setIdleMode(v)}
          tooltip="Silent: tracks move visually but produce no sound. Quiet Sliding: tracks drift at low volume before chord press. Ambient Drone: detuned root+fifth drone fades in/out with chords."
        />
        <RadioGroup<PostArrivalMode>
          label="Post-Arrival"
          value={postArrivalMode}
          options={[
            { value: 'hold', label: 'Hold' },
            { value: 'cycle', label: 'Cycle' },
          ]}
          onChange={(v) => setPostArrivalMode(v)}
          tooltip="Hold: tracks stay on chord notes until released. Cycle: tracks arrive, hold briefly, depart, and reconverge (breathing)."
        />
        {postArrivalMode === 'cycle' && (
          <SliderControl
            label="Touch Duration"
            value={slideConfig.holdDuration === Infinity ? 2.0 : slideConfig.holdDuration}
            min={0.2}
            max={5.0}
            step={0.1}
            format={(v) => `${v.toFixed(1)}s`}
            onChange={(v) => updateSlideConfig({ holdDuration: v })}
            tooltip="How long tracks hold at chord notes before departing (cycle mode)."
          />
        )}
        <CheckboxControl
          label="Scale-Snapped Glissando"
          checked={slideConfig.pitchMovement === 'scale-snapped'}
          onChange={(checked) =>
            updateSlideConfig({ pitchMovement: checked ? 'scale-snapped' : 'continuous' })
          }
          tooltip="Pitches gravitate toward scale degrees instead of continuous glide."
        />
        {slideConfig.pitchMovement === 'scale-snapped' && (
          <div className="flex flex-col gap-2 pl-5">
            <div className="flex items-center gap-2" data-tooltip="Scale for pitch snapping (defaults to active key/mode)">
              <label className="text-gray-400 w-20 shrink-0">Snap Key</label>
              <select
                value={snapScaleKey ?? ''}
                onChange={(e) => setSnapScale(e.target.value || null, snapScaleMode)}
                className="flex-1 bg-gray-900 border border-gray-700/50 rounded px-2 py-1 text-gray-300
                  focus:outline-none focus:ring-1 focus:ring-indigo-500/40 cursor-pointer"
              >
                <option value="">Same as active key</option>
                {CIRCLE_OF_FIFTHS.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2" data-tooltip="Scale mode for pitch snapping (defaults to active mode)">
              <label className="text-gray-400 w-20 shrink-0">Snap Mode</label>
              <select
                value={snapScaleMode ?? ''}
                onChange={(e) => setSnapScale(snapScaleKey, e.target.value || null)}
                className="flex-1 bg-gray-900 border border-gray-700/50 rounded px-2 py-1 text-gray-300
                  focus:outline-none focus:ring-1 focus:ring-indigo-500/40 cursor-pointer"
              >
                <option value="">Same as active mode</option>
                {MODES.map((m) => (
                  <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </CollapsibleSection>

      {/* Section 1: Track Model */}
      <CollapsibleSection
        title="Track Model"
        isOpen={openSections.trackModel}
        onToggle={() => toggleSection('trackModel')}
      >
        <RadioGroup<TrackModel>
          label="Model"
          value={slideConfig.trackModel}
          options={[
            { value: 'heat-seeker', label: 'Heat-seeker' },
            { value: 'spawn-overflow', label: 'Spawn-overflow' },
          ]}
          onChange={(v) => updateSlideConfig({ trackModel: v })}
          tooltip="Heat-seeker: tracks always exist, redirect on chord press. Spawn-overflow: new tracks spawn when chord pressed mid-convergence."
        />
        <SliderControl
          label="Track Count"
          value={slideConfig.trackCount}
          min={1}
          max={8}
          step={1}
          format={(v) => String(v)}
          onChange={(v) => updateSlideConfig({ trackCount: v })}
          tooltip="Number of persistent sliding tracks. More tracks = richer convergence. Default: 2."
        />
      </CollapsibleSection>

      {/* Section 2: Idle Behavior */}
      <CollapsibleSection
        title="Idle Behavior"
        isOpen={openSections.idle}
        onToggle={() => toggleSection('idle')}
      >
        <SelectControl<IdleMovementMode>
          label="Movement"
          value={slideConfig.idleMovementMode}
          options={[
            { value: 'stationary', label: 'Stationary' },
            { value: 'slow-drift', label: 'Slow drift' },
            { value: 'always-moving', label: 'Always moving' },
          ]}
          onChange={(v) => updateSlideConfig({ idleMovementMode: v })}
          tooltip="How tracks move when no chord is pressed."
        />
        <SelectControl<IdleRangeType>
          label="Range"
          value={slideConfig.idleRangeType}
          options={[
            { value: 'free-roam', label: 'Free roam' },
            { value: 'orbit-home', label: 'Orbit home' },
            { value: 'stay-in-scale', label: 'Stay in scale' },
          ]}
          onChange={(v) => updateSlideConfig({ idleRangeType: v })}
          tooltip="Where tracks wander during idle."
        />
        <SelectControl<StartingPosition>
          label="Start Position"
          value={slideConfig.startingPosition}
          options={[
            { value: 'root-note', label: 'Root note' },
            { value: 'random', label: 'Random' },
            { value: 'last-known', label: 'Last known' },
          ]}
          onChange={(v) => updateSlideConfig({ startingPosition: v })}
          tooltip="Where tracks start when entering slide mode."
        />
        <SelectControl<TrackCorrelation>
          label="Correlation"
          value={slideConfig.trackCorrelation}
          options={[
            { value: 'independent', label: 'Independent' },
            { value: 'loosely-correlated', label: 'Loosely correlated' },
            { value: 'unison', label: 'Unison' },
          ]}
          onChange={(v) => updateSlideConfig({ trackCorrelation: v })}
          tooltip="How tracks relate to each other during idle."
        />
        {slideConfig.trackCorrelation === 'loosely-correlated' && (
          <SliderControl
            label="Correlation Factor"
            value={slideConfig.correlationFactor}
            min={0}
            max={1}
            step={0.01}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => updateSlideConfig({ correlationFactor: v })}
            tooltip="How strongly tracks follow each other. 0 = fully independent, 1 = locked together."
          />
        )}
        <SelectControl<PitchBoundary>
          label="Pitch Boundary"
          value={slideConfig.pitchBoundary}
          options={[
            { value: 'musical-window', label: 'Musical window' },
            { value: 'key-octave', label: "Key's octave" },
            { value: 'unconstrained', label: 'Unconstrained' },
          ]}
          onChange={(v) => updateSlideConfig({ pitchBoundary: v })}
          tooltip="Pitch range tracks can wander within."
        />
        <SelectControl<EdgeBehavior>
          label="Edge Behavior"
          value={slideConfig.edgeBehavior}
          options={[
            { value: 'reflect', label: 'Reflect' },
            { value: 'wrap-around', label: 'Wrap around' },
            { value: 'smooth-curve', label: 'Smooth curve' },
          ]}
          onChange={(v) => updateSlideConfig({ edgeBehavior: v })}
          tooltip="What happens when a track hits the boundary."
        />
        <SliderControl
          label="Movement Speed"
          value={slideConfig.movementSpeed}
          min={0.5}
          max={10}
          step={0.1}
          format={(v) => `${v.toFixed(1)} st/s`}
          onChange={(v) => updateSlideConfig({ movementSpeed: v })}
          tooltip="How fast tracks glide during idle. Higher = more energetic."
        />
        <SliderControl
          label="Speed Variation"
          value={slideConfig.movementSpeedVariation}
          min={0}
          max={1}
          step={0.01}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => updateSlideConfig({ movementSpeedVariation: v })}
          tooltip="Organic randomness in movement speed. 0 = mechanical, 1 = chaotic."
        />
        <RadioGroup<'continuous' | 'scale-snapped'>
          label="Pitch Movement"
          value={slideConfig.pitchMovement}
          options={[
            { value: 'continuous', label: 'Continuous' },
            { value: 'scale-snapped', label: 'Scale-snapped' },
          ]}
          onChange={(v) => updateSlideConfig({ pitchMovement: v })}
          tooltip="Continuous: smooth glide. Scale-snapped: steps through scale degrees."
        />
        <RadioGroup<ModeToggleBehavior>
          label="Mode Toggle"
          value={slideConfig.modeToggleBehavior}
          options={[
            { value: 'resume', label: 'Resume' },
            { value: 'reset-home', label: 'Reset home' },
          ]}
          onChange={(v) => updateSlideConfig({ modeToggleBehavior: v })}
          tooltip="On re-entering slide mode: resume where tracks were, or reset to home pitch."
        />
        <RadioGroup<TrackPartitioning>
          label="Partitioning"
          value={slideConfig.trackPartitioning}
          options={[
            { value: 'independent', label: 'Independent' },
            { value: 'partition-range', label: 'Partition range' },
          ]}
          onChange={(v) => updateSlideConfig({ trackPartitioning: v })}
          tooltip="Independent: tracks roam entire range. Partition: each track gets its own pitch zone."
        />
        <RadioGroup<TrackInteraction>
          label="Interaction"
          value={slideConfig.trackInteraction}
          options={[
            { value: 'none', label: 'None' },
            { value: 'avoid-clustering', label: 'Avoid clustering' },
          ]}
          onChange={(v) => updateSlideConfig({ trackInteraction: v })}
          tooltip="Whether tracks try to avoid being at the same pitch."
        />
      </CollapsibleSection>

      {/* Section 3: Convergence */}
      <CollapsibleSection
        title="Convergence"
        isOpen={openSections.convergence}
        onToggle={() => toggleSection('convergence')}
      >
        <SliderControl
          label="Duration"
          value={slideConfig.convergenceDuration}
          min={0}
          max={5}
          step={0.05}
          format={(v) => `${v.toFixed(2)}s`}
          onChange={(v) => updateSlideConfig({ convergenceDuration: v })}
          tooltip="Time for tracks to reach chord target. 0 = instant (normal synth behavior)."
        />
        <SelectControl<EasingType>
          label="Easing"
          value={slideConfig.convergenceEasing}
          options={[
            { value: 'linear', label: 'Linear' },
            { value: 'ease-in', label: 'Ease-in' },
            { value: 'ease-out', label: 'Ease-out' },
          ]}
          onChange={(v) => updateSlideConfig({ convergenceEasing: v })}
          tooltip="Linear: constant speed. Ease-in: starts slow, ends fast. Ease-out: starts fast, ends slow."
        />
        <RadioGroup<'fixed-time' | 'distance-proportional'>
          label="Mode"
          value={slideConfig.convergenceMode}
          options={[
            { value: 'fixed-time', label: 'Fixed time' },
            { value: 'distance-proportional', label: 'Distance proportional' },
          ]}
          onChange={(v) => updateSlideConfig({ convergenceMode: v })}
          tooltip="Fixed: all convergences take same time. Distance: duration scales with pitch distance."
        />
        <SelectControl<MidConvergenceBehavior>
          label="Mid-convergence"
          value={slideConfig.midConvergenceBehavior}
          options={[
            { value: 'interrupt-retarget', label: 'Interrupt & retarget' },
            { value: 'finish-then-retarget', label: 'Finish then retarget' },
            { value: 'spawn-overflow', label: 'Spawn overflow' },
          ]}
          onChange={(v) => updateSlideConfig({ midConvergenceBehavior: v })}
          tooltip="What happens when a new chord is pressed while tracks are still converging."
        />
        {slideConfig.convergenceMode === 'distance-proportional' && (
          <>
            <SliderControl
              label="Duration / Octave"
              value={slideConfig.durationPerOctave}
              min={0.5}
              max={3}
              step={0.1}
              format={(v) => `${v.toFixed(1)}s`}
              onChange={(v) => updateSlideConfig({ durationPerOctave: v })}
              tooltip="How long convergence takes per octave of pitch distance."
            />
            <SliderControl
              label="Min Duration"
              value={slideConfig.minDuration}
              min={0}
              max={1}
              step={0.05}
              format={(v) => `${v.toFixed(2)}s`}
              onChange={(v) => updateSlideConfig({ minDuration: v })}
              tooltip="Minimum convergence time regardless of distance."
            />
          </>
        )}
      </CollapsibleSection>

      {/* Section 4: Swell Envelope */}
      <CollapsibleSection
        title="Swell Envelope"
        isOpen={openSections.swell}
        onToggle={() => toggleSection('swell')}
      >
        <RadioGroup<SwellCurve>
          label="Swell Curve"
          value={slideConfig.swellCurve}
          options={[
            { value: 'linear', label: 'Linear' },
            { value: 'exponential', label: 'Exponential' },
          ]}
          onChange={(v) => updateSlideConfig({ swellCurve: v })}
          tooltip="Linear: even volume ramp. Exponential: volume swells faster near arrival."
        />
        <SliderControl
          label="Floor Volume"
          value={slideConfig.floorVolume}
          min={0}
          max={0.5}
          step={0.01}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => updateSlideConfig({ floorVolume: v })}
          tooltip="Volume when track is far from target. Lower = more dramatic swell."
        />
        <SliderControl
          label="Held Volume"
          value={slideConfig.heldVolume}
          min={0.3}
          max={1.0}
          step={0.01}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => updateSlideConfig({ heldVolume: v })}
          tooltip="Volume when track arrives at target note."
        />
        <SliderControl
          label="Idle Volume"
          value={slideConfig.idleVolume}
          min={0}
          max={0.3}
          step={0.01}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => updateSlideConfig({ idleVolume: v })}
          tooltip="Volume during idle wandering (no chord pressed)."
        />
        <SliderControl
          label="Departure Fade"
          value={slideConfig.departureFadeTime}
          min={0.1}
          max={5}
          step={0.1}
          format={(v) => `${v.toFixed(1)}s`}
          onChange={(v) => updateSlideConfig({ departureFadeTime: v })}
          tooltip="How long volume fades after departure from target."
        />
      </CollapsibleSection>

      {/* Section 5: Post-Arrival */}
      <CollapsibleSection
        title="Post-Arrival"
        isOpen={openSections.postArrival}
        onToggle={() => toggleSection('postArrival')}
      >
        <div className="flex items-center gap-2" data-tooltip="How long tracks hold at target before departing. Infinite = wait for chord release.">
          <label className="text-gray-400 w-20 shrink-0">Hold</label>
          <CheckboxControl
            label="Infinite"
            checked={slideConfig.holdDuration === Infinity}
            onChange={(checked) =>
              updateSlideConfig({ holdDuration: checked ? Infinity : 2 })
            }
            tooltip="Hold indefinitely until chord release."
          />
          {slideConfig.holdDuration !== Infinity && (
            <input
              type="range"
              min={0.5}
              max={10}
              step={0.1}
              value={slideConfig.holdDuration}
              onChange={(e) =>
                updateSlideConfig({ holdDuration: parseFloat(e.target.value) })
              }
              className="flex-1 h-1.5 accent-indigo-500"
              data-tooltip={`Hold duration: ${slideConfig.holdDuration.toFixed(1)}s`}
            />
          )}
          {slideConfig.holdDuration !== Infinity && (
            <span className="text-gray-500 font-mono w-10 text-right">
              {slideConfig.holdDuration.toFixed(1)}s
            </span>
          )}
        </div>

        <SelectControl<DepartureDirection>
          label="Departure Dir."
          value={slideConfig.departureDirection}
          options={[
            { value: 'random', label: 'Random' },
            { value: 'inverse', label: 'Inverse' },
            { value: 'continue', label: 'Continue' },
          ]}
          onChange={(v) => updateSlideConfig({ departureDirection: v })}
          tooltip="Random: depart in random direction. Inverse: reverse approach path. Continue: keep going past target."
        />

        <CheckboxControl
          label="Landing Bounce"
          checked={slideConfig.landingBounce}
          onChange={(checked) => updateSlideConfig({ landingBounce: checked })}
          tooltip="Tracks overshoot target slightly and bounce back on arrival."
        />
        {slideConfig.landingBounce && (
          <>
            <SliderControl
              label="Bounce Depth"
              value={slideConfig.bounceDepthCents}
              min={5}
              max={50}
              step={1}
              format={(v) => `${v}c`}
              onChange={(v) => updateSlideConfig({ bounceDepthCents: v })}
              tooltip="How far past the target the track overshoots."
            />
            <SliderControl
              label="Bounce Decay"
              value={slideConfig.bounceDecayTime}
              min={0.05}
              max={0.5}
              step={0.01}
              format={(v) => `${(v * 1000).toFixed(0)}ms`}
              onChange={(v) => updateSlideConfig({ bounceDecayTime: v })}
              tooltip="How quickly the bounce settles."
            />
          </>
        )}

        <CheckboxControl
          label="Micro-motion"
          checked={slideConfig.microMotion}
          onChange={(checked) => updateSlideConfig({ microMotion: checked })}
          tooltip="Subtle vibrato when tracks are held at target."
        />
        {slideConfig.microMotion && (
          <>
            <SliderControl
              label="Motion Depth"
              value={slideConfig.microMotionDepth}
              min={2}
              max={30}
              step={1}
              format={(v) => `${v}c`}
              onChange={(v) => updateSlideConfig({ microMotionDepth: v })}
              tooltip="Vibrato intensity. Lower = subtle shimmer, higher = wobbly."
            />
            <SliderControl
              label="Motion Rate"
              value={slideConfig.microMotionRate}
              min={2}
              max={8}
              step={0.1}
              format={(v) => `${v.toFixed(1)}Hz`}
              onChange={(v) => updateSlideConfig({ microMotionRate: v })}
              tooltip="Vibrato speed in Hz."
            />
          </>
        )}

        <CheckboxControl
          label="Auto-cycle"
          checked={slideConfig.autoCycle}
          onChange={(checked) => updateSlideConfig({ autoCycle: checked })}
          tooltip="Tracks auto-restart wandering while chord is held, creating continuous convergence cycles."
        />

        <CheckboxControl
          label="Anchor Enabled"
          checked={slideConfig.anchorEnabled}
          onChange={(checked) => updateSlideConfig({ anchorEnabled: checked })}
          tooltip="Play a solid chord sound alongside the sliding tracks."
        />
        {slideConfig.anchorEnabled && (
          <CheckboxControl
            label="Anchor on Press"
            checked={slideConfig.anchorFiresOnPress}
            onChange={(checked) =>
              updateSlideConfig({ anchorFiresOnPress: checked })
            }
            tooltip="Anchor chord plays immediately on chord press."
          />
        )}
      </CollapsibleSection>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reusable control components
// ---------------------------------------------------------------------------

/** Collapsible section with chevron toggle */
function CollapsibleSection({
  title,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-gray-800/50 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-900/80 hover:bg-gray-800/80 transition-colors"
      >
        <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">
          {title}
        </span>
        <span className="text-gray-500 text-xs">
          {isOpen ? '\u25B2' : '\u25BC'}
        </span>
      </button>
      {isOpen && (
        <div className="px-3 py-2 flex flex-col gap-2 bg-gray-950/40">
          {children}
        </div>
      )}
    </div>
  );
}

/** Slider with label, value display, and tooltip */
function SliderControl({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
  tooltip,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  tooltip: string;
}) {
  return (
    <div className="flex items-center gap-2" data-tooltip={tooltip}>
      <label className="text-gray-400 w-20 shrink-0">{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1.5 accent-indigo-500"
      />
      <span className="text-gray-500 font-mono w-12 text-right">
        {format(value)}
      </span>
    </div>
  );
}

/** Select dropdown with label and tooltip */
function SelectControl<T extends string>({
  label,
  value,
  options,
  onChange,
  tooltip,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  tooltip: string;
}) {
  return (
    <div className="flex items-center gap-2" data-tooltip={tooltip}>
      <label className="text-gray-400 w-20 shrink-0">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="flex-1 bg-gray-900 border border-gray-700/50 rounded px-2 py-1 text-gray-300
          focus:outline-none focus:ring-1 focus:ring-indigo-500/40 cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Radio button group with label and tooltip */
function RadioGroup<T extends string>({
  label,
  value,
  options,
  onChange,
  tooltip,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  tooltip: string;
}) {
  return (
    <div className="flex items-center gap-2" data-tooltip={tooltip}>
      <label className="text-gray-400 w-20 shrink-0">{label}</label>
      <div className="flex gap-2 flex-wrap">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={`flex items-center gap-1 cursor-pointer px-2 py-0.5 rounded
              ${value === opt.value ? 'bg-indigo-600/20 text-indigo-300' : 'text-gray-400 hover:text-gray-300'}`}
          >
            <input
              type="radio"
              name={label}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="sr-only"
            />
            <span
              className={`w-2.5 h-2.5 rounded-full border ${
                value === opt.value
                  ? 'border-indigo-400 bg-indigo-500'
                  : 'border-gray-600 bg-transparent'
              }`}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

/** Checkbox with label and tooltip */
function CheckboxControl({
  label,
  checked,
  onChange,
  tooltip,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  tooltip: string;
}) {
  return (
    <label
      className="flex items-center gap-2 cursor-pointer"
      data-tooltip={tooltip}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <div
        className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
          checked
            ? 'bg-indigo-600 border-indigo-500'
            : 'bg-transparent border-gray-600'
        }`}
      >
        {checked && (
          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 6l3 3 5-5" />
          </svg>
        )}
      </div>
      <span className="text-gray-400">{label}</span>
    </label>
  );
}
