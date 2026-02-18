import type { MasterBus } from '../../shared/types';
import { MASTER_GAIN, COMPRESSOR_SETTINGS } from './constants';

/**
 * Create the master audio bus chain:
 * masterGain(0.15) -> compressor -> analyser -> destination
 */
export function createMasterBus(ctx: AudioContext): MasterBus {
  // Master gain node
  const masterGain = ctx.createGain();
  masterGain.gain.value = MASTER_GAIN;

  // Dynamics compressor to prevent clipping with 8 simultaneous oscillators
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = COMPRESSOR_SETTINGS.threshold;
  compressor.knee.value = COMPRESSOR_SETTINGS.knee;
  compressor.ratio.value = COMPRESSOR_SETTINGS.ratio;
  compressor.attack.value = COMPRESSOR_SETTINGS.attack;
  compressor.release.value = COMPRESSOR_SETTINGS.release;

  // Analyser for visualization
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;

  // Chain: masterGain -> compressor -> analyser -> destination
  masterGain.connect(compressor);
  compressor.connect(analyser);
  analyser.connect(ctx.destination);

  return { masterGain, compressor, analyser };
}

/**
 * Set master volume with anti-click pattern.
 * Uses linearRampToValueAtTime to avoid audible artifacts.
 */
export function setMasterVolume(bus: MasterBus, volume: number): void {
  const gain = bus.masterGain.gain;
  const ctx = bus.masterGain.context;
  const now = ctx.currentTime;

  gain.cancelScheduledValues(now);
  gain.setValueAtTime(gain.value, now);
  gain.linearRampToValueAtTime(Math.max(0, Math.min(1, volume)), now + 0.02);
}
