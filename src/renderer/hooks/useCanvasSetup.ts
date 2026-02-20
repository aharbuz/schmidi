import { useEffect, useRef, useState, type RefObject } from 'react';

/** Canvas dimensions in CSS pixels */
export interface CanvasDimensions {
  width: number;
  height: number;
}

/**
 * Reusable hook for HiDPI-aware canvas lifecycle.
 *
 * Handles:
 * - devicePixelRatio scaling for sharp rendering on Retina displays
 * - ResizeObserver for automatic resize when container changes
 * - Canvas context setup with `{ alpha: false }` for performance (opaque background)
 * - Context scale reset on resize
 *
 * @param containerRef - Ref to the containing div element
 * @returns canvasRef, ctxRef, and current CSS-pixel dimensions
 */
export function useCanvasSetup(containerRef: RefObject<HTMLDivElement | null>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [dimensions, setDimensions] = useState<CanvasDimensions>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const setupCanvas = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const dpr = window.devicePixelRatio || 1;

      // Scale canvas buffer by devicePixelRatio
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      // Set CSS size to match container
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      // Get or create context
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;

      // Scale context so drawing in CSS pixels maps to device pixels
      ctx.scale(dpr, dpr);
      ctxRef.current = ctx;

      setDimensions({ width: rect.width, height: rect.height });
    };

    // Initial setup
    setupCanvas();

    // Watch for container resizes
    const observer = new ResizeObserver(() => {
      setupCanvas();
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [containerRef]);

  return { canvasRef, ctxRef, dimensions };
}
