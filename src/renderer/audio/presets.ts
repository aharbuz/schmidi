/**
 * Slide character presets — personality definitions for the convergence engine.
 *
 * Each preset maps (intensity: 0-1) to a Partial<SlideConfig> bundle.
 * Selecting a preset applies all its values at once via updateConfig().
 * "Custom" returns an empty partial — it means "use whatever values
 * the advanced controls currently have."
 */

import type { SlideConfig } from './SlideTrack';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The four instrument personalities */
export type PresetName = 'eerie' | 'bloom' | 'swarm' | 'custom';

/** A function that maps intensity (0-1) to a config snapshot */
export type PresetFn = (intensity: number) => Partial<SlideConfig>;

/** Pre-press idle behavior */
export type IdleMode = 'silent' | 'quiet-sliding' | 'ambient-drone';

/** What happens after tracks arrive at chord targets */
export type PostArrivalMode = 'hold' | 'cycle';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Linear interpolation between a and b by t (0-1) */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ---------------------------------------------------------------------------
// Preset Functions
// ---------------------------------------------------------------------------

/**
 * EERIE: Slow and creepy — horror-film pitch bending feel.
 * Independent tracks, slow convergence, still when held.
 */
const EERIE_PRESET: PresetFn = (intensity) => ({
  trackCorrelation: 'independent',
  movementSpeed: lerp(1.5, 0.4, intensity),
  movementSpeedVariation: lerp(0.3, 0.7, intensity),
  convergenceEasing: 'ease-out',
  convergenceDuration: lerp(1.5, 4.0, intensity),
  idleVolume: lerp(0.08, 0.02, intensity),
  microMotion: false,
  microMotionDepth: 0,
  microMotionRate: 5,
  autoCycle: false,
  holdDuration: Infinity,
  pitchMovement: 'continuous',
  idleMovementMode: 'slow-drift',
  swellCurve: 'exponential',
  heldVolume: lerp(0.7, 0.9, intensity),
});

/**
 * BLOOM: Lush sweeping convergence — inward focus (cinematic feel).
 * All tracks sweep toward center from spread positions.
 */
const BLOOM_PRESET: PresetFn = (intensity) => ({
  trackCorrelation: 'loosely-correlated',
  movementSpeed: lerp(3.0, 1.5, intensity),
  movementSpeedVariation: lerp(0.1, 0.2, intensity),
  convergenceEasing: 'ease-in-out',
  convergenceDuration: lerp(1.0, 2.5, intensity),
  idleVolume: lerp(0.1, 0.15, intensity),
  microMotion: true,
  microMotionDepth: lerp(5, 12, intensity),
  microMotionRate: lerp(4, 6, intensity),
  autoCycle: true,
  holdDuration: lerp(2.0, 1.0, intensity),
  pitchMovement: 'continuous',
  idleMovementMode: 'slow-drift',
  swellCurve: 'linear',
  heldVolume: lerp(0.8, 1.0, intensity),
});

/**
 * SWARM: Chaotic energy — erratic behavior, more tracks.
 */
const SWARM_PRESET: PresetFn = (intensity) => ({
  trackCorrelation: 'independent',
  trackCount: intensity > 0.5 ? 4 : 3,
  movementSpeed: lerp(4.0, 8.0, intensity),
  movementSpeedVariation: lerp(0.5, 0.9, intensity),
  convergenceEasing: 'linear',
  convergenceDuration: lerp(0.8, 0.4, intensity),
  idleVolume: lerp(0.06, 0.12, intensity),
  microMotion: intensity > 0.3,
  microMotionDepth: lerp(8, 25, intensity),
  microMotionRate: lerp(6, 12, intensity),
  autoCycle: true,
  holdDuration: lerp(1.0, 0.3, intensity),
  pitchMovement: 'continuous',
  idleMovementMode: 'random-walk',
  swellCurve: 'linear',
  heldVolume: lerp(0.7, 0.85, intensity),
});

/**
 * CUSTOM: Identity — returns empty partial. Selecting "custom" means
 * "use whatever values the advanced controls have set."
 */
const CUSTOM_PRESET: PresetFn = () => ({});

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/** Ordered list of preset names (for UI iteration) */
export const PRESET_NAMES: PresetName[] = ['eerie', 'bloom', 'swarm', 'custom'];

/** Map preset name to its function */
export const PRESET_MAP: Record<PresetName, PresetFn> = {
  eerie: EERIE_PRESET,
  bloom: BLOOM_PRESET,
  swarm: SWARM_PRESET,
  custom: CUSTOM_PRESET,
};

/**
 * Get the config snapshot for a preset at a given intensity.
 */
export function getPresetConfig(name: PresetName, intensity: number): Partial<SlideConfig> {
  return PRESET_MAP[name](Math.max(0, Math.min(1, intensity)));
}

/**
 * Get the default idle mode for a preset.
 */
export function getPresetIdleMode(name: PresetName): IdleMode {
  const map: Record<PresetName, IdleMode> = {
    eerie: 'quiet-sliding',
    bloom: 'quiet-sliding',
    swarm: 'quiet-sliding',
    custom: 'quiet-sliding',
  };
  return map[name];
}

/**
 * Get the default post-arrival mode for a preset.
 */
export function getPresetPostArrivalMode(name: PresetName): PostArrivalMode {
  const map: Record<PresetName, PostArrivalMode> = {
    eerie: 'hold',
    bloom: 'cycle',
    swarm: 'cycle',
    custom: 'hold',
  };
  return map[name];
}
