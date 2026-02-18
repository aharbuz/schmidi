import { useEffect, useRef } from 'react';
import { getVoiceManager } from '../store/synthStore';

/** Canvas dimensions */
const WIDTH = 200;
const HEIGHT = 80;

/** Stroke color: cyan accent */
const STROKE_COLOR = '#22d3ee';

/**
 * Small waveform oscilloscope display.
 *
 * Reads time-domain data from the master bus AnalyserNode and draws
 * a continuous waveform trace on a canvas using requestAnimationFrame.
 * Shows a flat center line when no audio is playing.
 */
export function Oscilloscope() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return;

    // Buffer for time-domain data
    const bufferLength = 256;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);

      const vm = getVoiceManager();
      const analyser = vm?.getMasterBus().analyser;

      // Clear canvas
      ctx2d.fillStyle = '#0a0a12';
      ctx2d.fillRect(0, 0, WIDTH, HEIGHT);

      if (analyser) {
        analyser.fftSize = 512;
        analyser.getByteTimeDomainData(dataArray);
      }

      // Draw waveform
      ctx2d.lineWidth = 1.5;
      ctx2d.strokeStyle = STROKE_COLOR;
      ctx2d.beginPath();

      const sliceWidth = WIDTH / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        // Default 128 (center) if no analyser data
        const v = analyser ? dataArray[i] / 128.0 : 1.0;
        const y = (v * HEIGHT) / 2;

        if (i === 0) {
          ctx2d.moveTo(x, y);
        } else {
          ctx2d.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx2d.lineTo(WIDTH, HEIGHT / 2);
      ctx2d.stroke();

      // Subtle glow effect for the line
      ctx2d.shadowBlur = 0;
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* Label */}
      <span className="text-[10px] text-gray-500 uppercase tracking-widest">
        Scope
      </span>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        data-testid="oscilloscope"
        className="rounded-md border border-gray-800/50"
        style={{ width: `${WIDTH}px`, height: `${HEIGHT}px` }}
      />
    </div>
  );
}
