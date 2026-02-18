import { useEffect, useRef } from 'react';
import { useSynthStore } from '../store/synthStore';
import { computeEnvelopeCurve } from '../utils/envelopeMath';
import type { ADSRValues } from '../../shared/types';

/** Canvas dimensions */
const CANVAS_WIDTH = 300;
const CANVAS_HEIGHT = 120;
const PADDING = { top: 10, right: 16, bottom: 22, left: 16 };

/** Draw area dimensions */
const DRAW_WIDTH = CANVAS_WIDTH - PADDING.left - PADDING.right;
const DRAW_HEIGHT = CANVAS_HEIGHT - PADDING.top - PADDING.bottom;

/**
 * Canvas preview of ADSR envelope shape.
 *
 * Draws the envelope curve using computeEnvelopeCurve() in cyan accent color.
 * Updates in real-time as ADSR values change in the store.
 * Labels A, D, S, R stages below the curve at phase boundaries.
 */
export function EnvelopeCurve() {
  const adsr = useSynthStore((s) => s.adsr);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawEnvelope(ctx, adsr);
  }, [adsr]);

  return (
    <div className="w-full max-w-md">
      <canvas
        ref={canvasRef}
        data-testid="envelope-curve"
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="w-full rounded-lg border border-gray-800/50 bg-[#0a0a12]"
      />
    </div>
  );
}

/** Draw the complete envelope visualization */
function drawEnvelope(ctx: CanvasRenderingContext2D, adsr: ADSRValues): void {
  const { attack, decay, release, sustain } = adsr;

  // Clear canvas
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Draw grid lines
  drawGrid(ctx);

  // Compute envelope curve points (within the draw area)
  const points = computeEnvelopeCurve(adsr, DRAW_WIDTH, DRAW_HEIGHT, 96);

  // Draw the curve
  if (points.length > 0) {
    ctx.beginPath();
    ctx.moveTo(points[0].x + PADDING.left, points[0].y + PADDING.top);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x + PADDING.left, points[i].y + PADDING.top);
    }
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.85)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Fill under the curve with subtle gradient
    ctx.lineTo(points[points.length - 1].x + PADDING.left, DRAW_HEIGHT + PADDING.top);
    ctx.lineTo(PADDING.left, DRAW_HEIGHT + PADDING.top);
    ctx.closePath();
    const gradient = ctx.createLinearGradient(0, PADDING.top, 0, DRAW_HEIGHT + PADDING.top);
    gradient.addColorStop(0, 'rgba(6, 182, 212, 0.08)');
    gradient.addColorStop(1, 'rgba(6, 182, 212, 0.01)');
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  // Draw stage labels
  drawStageLabels(ctx, adsr);

  // Draw phase boundary lines
  drawPhaseBoundaries(ctx, attack, decay, sustain, release);
}

/** Subtle grid lines for visual reference */
function drawGrid(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 0.5;

  // Horizontal lines
  for (let i = 1; i < 4; i++) {
    const y = PADDING.top + (DRAW_HEIGHT / 4) * i;
    ctx.beginPath();
    ctx.moveTo(PADDING.left, y);
    ctx.lineTo(PADDING.left + DRAW_WIDTH, y);
    ctx.stroke();
  }

  // Vertical lines
  for (let i = 1; i < 4; i++) {
    const x = PADDING.left + (DRAW_WIDTH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(x, PADDING.top);
    ctx.lineTo(x, PADDING.top + DRAW_HEIGHT);
    ctx.stroke();
  }
}

/** Draw A, D, S, R labels below the curve at phase boundaries */
function drawStageLabels(ctx: CanvasRenderingContext2D, adsr: ADSRValues): void {
  const { attack, decay, release } = adsr;
  const sustainDuration = 0.3;
  const totalTime = attack + decay + sustainDuration + release;

  if (totalTime === 0) return;

  const labels = ['A', 'D', 'S', 'R'];
  const durations = [attack, decay, sustainDuration, release];

  ctx.font = '9px monospace';
  ctx.fillStyle = 'rgba(156, 163, 175, 0.6)';
  ctx.textAlign = 'center';

  let accumulatedTime = 0;
  for (let i = 0; i < labels.length; i++) {
    const midTime = accumulatedTime + durations[i] / 2;
    const x = PADDING.left + (midTime / totalTime) * DRAW_WIDTH;
    const y = CANVAS_HEIGHT - 4;
    ctx.fillText(labels[i], x, y);
    accumulatedTime += durations[i];
  }
}

/** Subtle vertical dotted lines at phase boundaries */
function drawPhaseBoundaries(
  ctx: CanvasRenderingContext2D,
  attack: number,
  decay: number,
  sustain: number,
  release: number
): void {
  const sustainDuration = 0.3;
  const totalTime = attack + decay + sustainDuration + release;
  if (totalTime === 0) return;

  // Suppress unused variable warning -- sustain used via parameter list
  void sustain;

  const boundaries = [
    attack / totalTime,
    (attack + decay) / totalTime,
    (attack + decay + sustainDuration) / totalTime,
  ];

  ctx.setLineDash([2, 3]);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 0.5;

  for (const ratio of boundaries) {
    const x = PADDING.left + ratio * DRAW_WIDTH;
    ctx.beginPath();
    ctx.moveTo(x, PADDING.top);
    ctx.lineTo(x, PADDING.top + DRAW_HEIGHT);
    ctx.stroke();
  }

  ctx.setLineDash([]);
}
