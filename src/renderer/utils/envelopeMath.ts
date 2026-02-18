import type { ADSRValues } from '../../shared/types';

/** A point on the envelope curve in canvas coordinates */
export interface EnvelopePoint {
  x: number;
  y: number;
}

/**
 * Compute ADSR envelope curve points for canvas visualization.
 *
 * Canvas coordinate system: y=0 is top (max amplitude), y=height is bottom (zero amplitude).
 *
 * Attack phase: linear from 0 to 1 (amplitude)
 * Decay phase: exponential approach to sustain (matches setTargetAtTime with timeConstant = decay/3)
 * Sustain phase: flat at sustain level (displayed for 0.3s equivalent)
 * Release phase: exponential approach to 0 (matches setTargetAtTime with timeConstant = release/3)
 */
export function computeEnvelopeCurve(
  adsr: ADSRValues,
  width: number,
  height: number,
  sampleCount: number = 64
): EnvelopePoint[] {
  const { attack, decay, sustain, release } = adsr;

  // Display sustain for a fixed 0.3s equivalent duration
  const sustainDuration = 0.3;

  // Total time for the envelope
  const totalTime = attack + decay + sustainDuration + release;

  // Avoid division by zero
  if (totalTime === 0) {
    return Array.from({ length: sampleCount }, (_, i) => ({
      x: (i / (sampleCount - 1)) * width,
      y: height, // zero amplitude
    }));
  }

  const points: EnvelopePoint[] = [];

  for (let i = 0; i < sampleCount; i++) {
    const t = (i / (sampleCount - 1)) * totalTime;
    let amplitude: number;

    if (t <= attack) {
      // Attack phase: linear ramp from 0 to 1
      amplitude = attack === 0 ? 1 : t / attack;
    } else if (t <= attack + decay) {
      // Decay phase: exponential approach to sustain
      // Matches setTargetAtTime behavior with timeConstant = decay/3
      const decayElapsed = t - attack;
      const timeConstant = decay / 3;
      if (timeConstant === 0) {
        amplitude = sustain;
      } else {
        amplitude = sustain + (1 - sustain) * Math.exp(-decayElapsed / timeConstant);
      }
    } else if (t <= attack + decay + sustainDuration) {
      // Sustain phase: flat at sustain level
      amplitude = sustain;
    } else {
      // Release phase: exponential approach to 0
      const releaseElapsed = t - (attack + decay + sustainDuration);
      const timeConstant = release / 3;
      if (timeConstant === 0) {
        amplitude = 0;
      } else {
        amplitude = sustain * Math.exp(-releaseElapsed / timeConstant);
      }
    }

    // Clamp amplitude to [0, 1]
    amplitude = Math.max(0, Math.min(1, amplitude));

    // Convert to canvas coordinates: y=0 is max amplitude, y=height is zero amplitude
    const x = (t / totalTime) * width;
    const y = height - amplitude * height;

    points.push({ x, y });
  }

  return points;
}
