/**
 * Rolling circular buffer for ~10 seconds of per-track waveform data.
 *
 * Performance-critical: ALL typed arrays are pre-allocated in the constructor.
 * No `new` allocations in push() or getOrderedData() to avoid GC pressure
 * in the rAF render loop.
 *
 * Usage: one WaveformBuffer instance per SlideTrack, stored in a useRef.
 */

/** 60fps x 10 seconds = 600 frames of waveform snapshots */
export const WAVEFORM_HISTORY_FRAMES = 600;

/** Matches fftSize/2 from SlideTrack's AnalyserNode (fftSize = 256) */
export const SAMPLES_PER_FRAME = 128;

export class WaveformBuffer {
  private buffer: Float32Array;
  private writeHead = 0;
  private readonly frames: number;
  private readonly samplesPerFrame: number;

  /** Reusable Uint8Array for getByteTimeDomainData reads (avoids GC per Pitfall 4) */
  private readonly readBuffer: Uint8Array<ArrayBuffer>;

  /** Pre-allocated result array for getOrderedData (reused, not new each call) */
  private readonly orderedResult: Float32Array;

  constructor(
    frames: number = WAVEFORM_HISTORY_FRAMES,
    samplesPerFrame: number = SAMPLES_PER_FRAME
  ) {
    this.frames = frames;
    this.samplesPerFrame = samplesPerFrame;
    this.buffer = new Float32Array(frames * samplesPerFrame);
    this.readBuffer = new Uint8Array(samplesPerFrame);
    this.orderedResult = new Float32Array(frames * samplesPerFrame);
  }

  /**
   * Read current time-domain data from AnalyserNode, normalize to -1..1,
   * and write into circular buffer at writeHead.
   */
  push(analyser: AnalyserNode): void {
    // Read byte time-domain data into pre-allocated buffer
    analyser.getByteTimeDomainData(this.readBuffer);

    // Normalize 0-255 (where 128 = zero crossing) to -1..1 and write to circular buffer
    const offset = this.writeHead * this.samplesPerFrame;
    for (let i = 0; i < this.samplesPerFrame; i++) {
      this.buffer[offset + i] = (this.readBuffer[i] ?? 128) / 128 - 1;
    }

    this.writeHead = (this.writeHead + 1) % this.frames;
  }

  /**
   * Return waveform data in chronological order (oldest to newest).
   * Returns a reference to an internal pre-allocated Float32Array -- reused each call.
   * The caller must NOT store a reference across frames.
   */
  getOrderedData(): Float32Array {
    const startOffset = this.writeHead * this.samplesPerFrame;
    const totalLength = this.buffer.length;
    const endPortion = totalLength - startOffset;

    // Copy oldest portion (writeHead to end) then newest portion (0 to writeHead)
    this.orderedResult.set(this.buffer.subarray(startOffset), 0);
    this.orderedResult.set(this.buffer.subarray(0, startOffset), endPortion);

    return this.orderedResult;
  }

  /**
   * Zero the buffer and reset writeHead. Call when track count changes.
   */
  reset(): void {
    this.buffer.fill(0);
    this.orderedResult.fill(0);
    this.writeHead = 0;
  }
}
