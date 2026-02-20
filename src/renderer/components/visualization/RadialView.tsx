import { useRef, useEffect, useCallback } from 'react';
import { useSynthStore } from '../../store/synthStore';
import { useCanvasSetup } from '../../hooks/useCanvasSetup';
import { computeTrackViz, blendHues, TRACK_HUES, type TrackVizData } from './vizColors';
import type { SlideTrackPhase } from '../../audio/SlideTrack';

// --- Glow sprite cache ---

interface GlowSprite {
  body: HTMLCanvasElement;
  halo: HTMLCanvasElement;
}

/**
 * Create a pre-rendered radial gradient sprite for a given hue.
 * Returns separate body and halo canvases for two-pass rendering.
 */
function createGlowSprite(hue: number): GlowSprite {
  // Body sprite: core orb
  const bodySize = 128;
  const body = document.createElement('canvas');
  body.width = bodySize;
  body.height = bodySize;
  const bCtx = body.getContext('2d')!;

  const bGrad = bCtx.createRadialGradient(
    bodySize / 2, bodySize / 2, 0,
    bodySize / 2, bodySize / 2, bodySize / 2
  );
  bGrad.addColorStop(0, `hsla(${hue}, 100%, 85%, 1)`);
  bGrad.addColorStop(0.3, `hsla(${hue}, 95%, 65%, 0.7)`);
  bGrad.addColorStop(0.6, `hsla(${hue}, 85%, 45%, 0.3)`);
  bGrad.addColorStop(1, `hsla(${hue}, 80%, 30%, 0)`);

  bCtx.fillStyle = bGrad;
  bCtx.fillRect(0, 0, bodySize, bodySize);

  // Halo sprite: softer, larger glow for additive blending pass
  const haloSize = 256;
  const halo = document.createElement('canvas');
  halo.width = haloSize;
  halo.height = haloSize;
  const hCtx = halo.getContext('2d')!;

  const hGrad = hCtx.createRadialGradient(
    haloSize / 2, haloSize / 2, 0,
    haloSize / 2, haloSize / 2, haloSize / 2
  );
  hGrad.addColorStop(0, `hsla(${hue}, 100%, 70%, 0.5)`);
  hGrad.addColorStop(0.3, `hsla(${hue}, 90%, 50%, 0.2)`);
  hGrad.addColorStop(0.7, `hsla(${hue}, 80%, 35%, 0.05)`);
  hGrad.addColorStop(1, `hsla(${hue}, 70%, 25%, 0)`);

  hCtx.fillStyle = hGrad;
  hCtx.fillRect(0, 0, haloSize, haloSize);

  return { body, halo };
}

// --- Bloom state ---

interface BloomState {
  active: boolean;
  phase: number; // 0 = just triggered, 1 = fully faded
  blendedHue: number;
}

// --- Background gradient cache ---

let bgGradientCache: {
  width: number;
  height: number;
  gradient: CanvasGradient;
} | null = null;

function getBackgroundGradient(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number
): CanvasGradient {
  if (bgGradientCache && bgGradientCache.width === w && bgGradientCache.height === h) {
    return bgGradientCache.gradient;
  }
  const cx = w / 2;
  const cy = h / 2;
  const maxR = Math.sqrt(cx * cx + cy * cy);
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
  grad.addColorStop(0, '#08080c');
  grad.addColorStop(1, '#0f0f18');
  bgGradientCache = { width: w, height: h, gradient: grad };
  return grad;
}

// --- Held glow state ---

interface HeldGlowState {
  active: boolean;
  blendedHue: number;
  alpha: number; // ramp up to 0.15 when held
}

// --- Component ---

/**
 * RadialView: Radial convergence canvas.
 *
 * Reads slideTrackStates from Zustand every frame and paints:
 * - Per-track glowing orbs positioned radially by proximity (center = arrived)
 * - Additive-blended glow halos for natural overlap bloom
 * - Convergence bloom flash when tracks arrive at chord targets
 * - Subtle steady glow at center while chord is held
 *
 * Uses pre-rendered glow sprites for performance. No reference geometry.
 */
export function RadialView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { canvasRef, ctxRef, dimensions } = useCanvasSetup(containerRef);

  // Pre-rendered sprites (one per track hue)
  const spritesRef = useRef<GlowSprite[]>([]);
  const spriteCountRef = useRef(0);

  // Previous track states for transition detection
  const prevStatesRef = useRef<SlideTrackPhase[]>([]);

  // Bloom state
  const bloomRef = useRef<BloomState>({ active: false, phase: 0, blendedHue: 0 });

  // Held glow state
  const heldGlowRef = useRef<HeldGlowState>({ active: false, blendedHue: 0, alpha: 0 });

  // rAF ref
  const rafRef = useRef<number>(0);

  // Last frame timestamp for deltaTime
  const lastTimeRef = useRef(0);

  // Ensure sprites exist for N tracks
  const ensureSprites = useCallback((trackCount: number) => {
    if (trackCount === spriteCountRef.current && spritesRef.current.length >= trackCount) {
      return;
    }
    const sprites: GlowSprite[] = [];
    for (let i = 0; i < trackCount; i++) {
      const hue = TRACK_HUES[i % TRACK_HUES.length];
      sprites.push(createGlowSprite(hue));
    }
    spritesRef.current = sprites;
    spriteCountRef.current = trackCount;
  }, []);

  useEffect(() => {
    const draw = (timestamp: number) => {
      const ctx = ctxRef.current;
      const { width: w, height: h } = dimensions;

      if (!ctx || w === 0 || h === 0) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      // Delta time in ms
      const dt = lastTimeRef.current === 0 ? 16 : timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      // Read track states from store (cheap Zustand read)
      const trackStates = useSynthStore.getState().slideTrackStates;
      const trackCount = trackStates.length;

      // Ensure sprites
      if (trackCount > 0) {
        ensureSprites(trackCount);
      }

      // --- Paint background ---
      ctx.fillStyle = getBackgroundGradient(ctx, w, h);
      ctx.fillRect(0, 0, w, h);

      if (trackCount === 0) {
        // Nothing to draw -- just show the void
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      // --- Compute per-track visuals ---
      const cx = w / 2;
      const cy = h / 2;
      const maxRadius = Math.min(w, h) * 0.4;

      const vizData: (TrackVizData & { x: number; y: number })[] = [];
      const convergingHues: number[] = [];
      const convergingWeights: number[] = [];

      for (let i = 0; i < trackCount; i++) {
        const ts = trackStates[i];
        const viz = computeTrackViz(ts, i);

        // Radial position: proximity 1 = center, 0 = outer ring
        const dist = maxRadius * (1 - viz.proximity);
        const baseAngle = (i / trackCount) * Math.PI * 2;
        const freqWobble = Math.sin(ts.currentFreq * 0.01) * 0.3;
        const angle = baseAngle + freqWobble;

        vizData.push({
          ...viz,
          x: cx + Math.cos(angle) * dist,
          y: cy + Math.sin(angle) * dist,
        });

        // Collect converging/held track hues for bloom blending
        if (ts.state === 'converging' || ts.state === 'held') {
          convergingHues.push(viz.hue);
          convergingWeights.push(viz.proximity);
        }
      }

      // --- Detect converging -> held transitions for bloom trigger ---
      const prevStates = prevStatesRef.current;
      let triggerBloom = false;

      for (let i = 0; i < trackCount; i++) {
        const prev = prevStates[i];
        const curr = trackStates[i].state;
        if (prev === 'converging' && curr === 'held') {
          triggerBloom = true;
        }
      }

      // Update previous states
      prevStatesRef.current = trackStates.map((ts) => ts.state);

      // --- Bloom logic ---
      const bloom = bloomRef.current;
      if (triggerBloom) {
        bloom.active = true;
        bloom.phase = 0;
        bloom.blendedHue =
          convergingHues.length > 0
            ? blendHues(convergingHues, convergingWeights)
            : 180;
      }

      if (bloom.active) {
        bloom.phase += dt / 400; // 400ms bloom duration
        if (bloom.phase >= 1) {
          bloom.active = false;
          bloom.phase = 1;
        }
      }

      // --- Held glow logic ---
      const heldGlow = heldGlowRef.current;
      const anyHeld = trackStates.some((ts) => ts.state === 'held');

      if (anyHeld) {
        heldGlow.active = true;
        heldGlow.blendedHue =
          convergingHues.length > 0
            ? blendHues(convergingHues, convergingWeights)
            : heldGlow.blendedHue;
        // Ramp alpha up
        heldGlow.alpha = Math.min(0.15, heldGlow.alpha + dt * 0.001);
      } else {
        // Fade out
        heldGlow.alpha = Math.max(0, heldGlow.alpha - dt * 0.002);
        if (heldGlow.alpha <= 0) {
          heldGlow.active = false;
        }
      }

      // --- Draw orb bodies (source-over) ---
      ctx.globalCompositeOperation = 'source-over';

      for (let i = 0; i < vizData.length; i++) {
        const v = vizData[i];
        const sprite = spritesRef.current[i];
        if (!sprite) continue;

        const drawSize = v.size * 2; // Scale sprite to TrackVizData size
        ctx.globalAlpha = v.alpha;
        ctx.drawImage(
          sprite.body,
          v.x - drawSize / 2,
          v.y - drawSize / 2,
          drawSize,
          drawSize
        );
      }

      // --- Draw glow halos (additive blending) ---
      ctx.globalCompositeOperation = 'lighter';

      for (let i = 0; i < vizData.length; i++) {
        const v = vizData[i];
        const sprite = spritesRef.current[i];
        if (!sprite) continue;

        const glowSize = v.glowRadius * 3; // Larger than body
        if (glowSize < 1) continue; // Skip if too small

        ctx.globalAlpha = v.alpha * 0.4;
        ctx.drawImage(
          sprite.halo,
          v.x - glowSize / 2,
          v.y - glowSize / 2,
          glowSize,
          glowSize
        );
      }

      // --- Convergence bloom (additive) ---
      if (bloom.active && bloom.phase < 1) {
        const bloomRadius = maxRadius * 0.6 * (0.5 + bloom.phase * 0.5);
        const bloomAlpha = 1 - bloom.phase;

        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, bloomRadius);
        gradient.addColorStop(
          0,
          `hsla(${bloom.blendedHue}, 100%, 90%, ${bloomAlpha * 0.8})`
        );
        gradient.addColorStop(
          0.3,
          `hsla(${bloom.blendedHue}, 100%, 70%, ${bloomAlpha * 0.4})`
        );
        gradient.addColorStop(1, `hsla(${bloom.blendedHue}, 80%, 40%, 0)`);

        ctx.globalAlpha = 1;
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, bloomRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- Held steady glow (additive) ---
      if (heldGlow.active && heldGlow.alpha > 0.001) {
        const glowRadius = maxRadius * 0.25;
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
        gradient.addColorStop(
          0,
          `hsla(${heldGlow.blendedHue}, 90%, 70%, ${heldGlow.alpha})`
        );
        gradient.addColorStop(
          0.5,
          `hsla(${heldGlow.blendedHue}, 80%, 50%, ${heldGlow.alpha * 0.5})`
        );
        gradient.addColorStop(1, `hsla(${heldGlow.blendedHue}, 70%, 30%, 0)`);

        ctx.globalAlpha = 1;
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- Reset state ---
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      lastTimeRef.current = 0;
    };
  }, [dimensions, ctxRef, ensureSprites]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}
