import { useEffect, useRef } from 'react';
import { useSynthStore, getSlideEngine } from '../../store/synthStore';
import { useCanvasSetup } from '../../hooks/useCanvasSetup';
import { TRACK_HUES, computeTrackViz } from './vizColors';
import { WaveformBuffer } from './WaveformBuffer';
import type { SlideTrackPhase } from '../../audio/SlideTrack';

/**
 * Flash state per track: triggered when track transitions from converging to held.
 */
interface FlashState {
  flashing: boolean;
  /** 0 = flash start, 1 = fully faded */
  flashPhase: number;
}

/** Flash duration in ms */
const FLASH_DURATION = 300;
/** Fade-back duration in ms after flash peak */
const FADE_DURATION = 200;
/** Total flash lifecycle in ms */
const TOTAL_FLASH_MS = FLASH_DURATION + FADE_DURATION;

/**
 * WaveformView -- per-track colored oscilloscope traces showing ~10 seconds
 * of convergence history.
 *
 * Each track gets its own WaveformBuffer (circular buffer for ~10s of samples)
 * and its own colored trace line. Traces stack vertically with even spacing.
 *
 * Performance: WaveformBuffers are in useRef (NOT Zustand). All typed arrays
 * are pre-allocated. Only reads from AnalyserNode when this component is mounted.
 */
export function WaveformView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { canvasRef, ctxRef, dimensions } = useCanvasSetup(containerRef);
  const rafRef = useRef<number>(0);

  // Per-track WaveformBuffer instances (managed in ref, not reactive state)
  const buffersRef = useRef<WaveformBuffer[]>([]);
  const prevTrackCountRef = useRef<number>(0);

  // Previous track states for convergence flash detection
  const prevStatesRef = useRef<SlideTrackPhase[]>([]);

  // Per-track flash state
  const flashStatesRef = useRef<FlashState[]>([]);

  // Timestamp tracking for delta time
  const lastFrameTimeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = (timestamp: number) => {
      rafRef.current = requestAnimationFrame(draw);

      const ctx = ctxRef.current;
      if (!ctx) return;

      const { width, height } = dimensions;
      if (width === 0 || height === 0) return;

      // Delta time for flash animation
      const deltaMs =
        lastFrameTimeRef.current > 0
          ? timestamp - lastFrameTimeRef.current
          : 16;
      lastFrameTimeRef.current = timestamp;

      // Get engine and track data
      const engine = getSlideEngine();
      const slideTrackStates = useSynthStore.getState().slideTrackStates;

      // Get tracks for analyser access
      const tracks = engine?.getTracks() ?? [];
      const trackCount = tracks.length;

      // Manage buffers: create/reset when track count changes
      if (trackCount !== prevTrackCountRef.current) {
        const newBuffers: WaveformBuffer[] = [];
        const newFlashes: FlashState[] = [];
        const newPrevStates: SlideTrackPhase[] = [];
        for (let i = 0; i < trackCount; i++) {
          // Reuse existing buffer if possible, else create new
          if (i < buffersRef.current.length) {
            newBuffers.push(buffersRef.current[i]);
          } else {
            newBuffers.push(new WaveformBuffer());
          }
          newFlashes.push({ flashing: false, flashPhase: 0 });
          newPrevStates.push('idle');
        }
        buffersRef.current = newBuffers;
        flashStatesRef.current = newFlashes;
        prevStatesRef.current = newPrevStates;
        prevTrackCountRef.current = trackCount;
      }

      // Push current frame data into each buffer
      for (let i = 0; i < trackCount; i++) {
        const track = tracks[i];
        if (track) {
          buffersRef.current[i].push(track.getAnalyser());
        }
      }

      // Detect convergence flash: track transitions from converging to held
      for (let i = 0; i < trackCount; i++) {
        const currentState = slideTrackStates[i]?.state ?? 'idle';
        const prevState = prevStatesRef.current[i] ?? 'idle';
        if (prevState === 'converging' && currentState === 'held') {
          flashStatesRef.current[i] = { flashing: true, flashPhase: 0 };
        }
        prevStatesRef.current[i] = currentState;
      }

      // --- Drawing ---

      // Background: dark void gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#0f0f18');
      bgGrad.addColorStop(0.5, '#08080c');
      bgGrad.addColorStop(1, '#0f0f18');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      if (trackCount === 0) return;

      // Draw subtle horizontal baseline per track
      for (let i = 0; i < trackCount; i++) {
        const yOffset = (height / (trackCount + 1)) * (i + 1);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, yOffset);
        ctx.lineTo(width, yOffset);
        ctx.stroke();
      }

      // Draw waveform traces per track
      for (let i = 0; i < trackCount; i++) {
        const trackState = slideTrackStates[i];
        if (!trackState) continue;

        const viz = computeTrackViz(trackState, i);
        const yOffset = (height / (trackCount + 1)) * (i + 1);
        const data = buffersRef.current[i].getOrderedData();

        // Update flash state
        const flash = flashStatesRef.current[i];
        if (flash.flashing) {
          flash.flashPhase += deltaMs / TOTAL_FLASH_MS;
          if (flash.flashPhase >= 1) {
            flash.flashing = false;
            flash.flashPhase = 1;
          }
        }

        // Determine visual properties (with flash override)
        let lineBrightness = viz.brightness;
        let lineAlpha = viz.alpha;
        let lineWidth = 1 + viz.proximity;
        const amplitudeScale = 30 + viz.proximity * 20;

        if (flash.flashing) {
          const fp = flash.flashPhase;
          if (fp < FLASH_DURATION / TOTAL_FLASH_MS) {
            // Flash peak: bright, thick, full alpha
            const flashIntensity =
              1 - fp / (FLASH_DURATION / TOTAL_FLASH_MS);
            lineBrightness = viz.brightness + (95 - viz.brightness) * flashIntensity;
            lineAlpha = viz.alpha + (1.0 - viz.alpha) * flashIntensity;
            lineWidth = lineWidth + (3 - lineWidth) * flashIntensity;
          } else {
            // Fade back to normal
            const fadeProgress =
              (fp - FLASH_DURATION / TOTAL_FLASH_MS) /
              (FADE_DURATION / TOTAL_FLASH_MS);
            const fadeEase = 1 - fadeProgress;
            lineBrightness = viz.brightness + (95 - viz.brightness) * fadeEase * 0.3;
            lineAlpha = viz.alpha + (1.0 - viz.alpha) * fadeEase * 0.3;
            lineWidth = lineWidth + (3 - lineWidth) * fadeEase * 0.3;
          }
        }

        const hue = TRACK_HUES[i % TRACK_HUES.length];
        const isSilent = trackState.silentMode === true;
        const traceAlpha = isSilent ? lineAlpha * 0.3 : lineAlpha; // 30% opacity in silent mode
        ctx.strokeStyle = `hsla(${hue}, ${viz.saturation}%, ${lineBrightness}%, ${traceAlpha})`;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();

        // Draw the waveform trace across the full canvas width
        // data contains frames * samplesPerFrame floats in chronological order.
        // We sample at a stride to fill the canvas width.
        const totalSamples = data.length;
        const samplesPerPixel = totalSamples / width;

        for (let px = 0; px < width; px++) {
          const sampleIndex = Math.floor(px * samplesPerPixel);
          const value = data[sampleIndex] ?? 0;
          const y = yOffset + value * amplitudeScale;

          if (px === 0) {
            ctx.moveTo(px, y);
          } else {
            ctx.lineTo(px, y);
          }
        }

        ctx.stroke();
      }
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      lastFrameTimeRef.current = 0;
    };
  }, [canvasRef, ctxRef, dimensions]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}
