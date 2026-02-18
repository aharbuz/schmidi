import type { ADSRValues, WaveformType } from '../../shared/types';
import { Voice } from './Voice';
import { CHORD_VOICE_POOL_SIZE, VOICES_PER_CHORD } from './constants';

/**
 * Minimal chord data shape needed for retuning active chords.
 * Matches the subset of ChordData from music/musicTypes.ts used here.
 * Once plan 02-01 lands, this can be replaced with the full ChordData import.
 */
export interface ChordRetuneData {
  degree: number;
  frequencies: number[];
}

/** Tracks a group of voices allocated to a single chord trigger */
export interface ChordAllocation {
  /** Unique identifier: "degree-{timestamp}" */
  chordId: string;
  /** Indices into the voice pool array */
  voiceIndices: number[];
  /** audioContext.currentTime when triggered */
  triggerTime: number;
  /** Hz values assigned to each voice */
  frequencies: number[];
  /** 1-7, the chord degree (stable ID for retuning on key/mode change) */
  degree: number;
}

/**
 * ChordVoiceManager: a voice pool that allocates groups of voices per chord,
 * supports polychordal playback, and implements oldest-first voice stealing.
 *
 * Phase 1 had a fixed 1:1 voice-to-button mapping (8 voices for 8 keys).
 * Phase 2 chords need 3 voices each (triads) with dynamic allocation from a
 * shared pool. This manager is the audio backbone for chord playback.
 */
export class ChordVoiceManager {
  private voices: Voice[];
  private allocations: Map<string, ChordAllocation>;
  private ctx: AudioContext;
  private nextChordSeq = 0;

  constructor(ctx: AudioContext, masterGain: GainNode, poolSize = CHORD_VOICE_POOL_SIZE) {
    this.ctx = ctx;
    this.allocations = new Map();

    // Create voice pool -- all voices start silent with oscillators running (persistent pattern)
    this.voices = [];
    for (let i = 0; i < poolSize; i++) {
      // Each voice gets a default frequency (will be overridden on allocation)
      // and zero detune (chord mode does not use per-voice detuning)
      const voice = new Voice(ctx, masterGain, 440, 0);
      this.voices.push(voice);
    }
  }

  /**
   * Trigger a chord: allocate voices from the pool, set frequencies, and start attack.
   * Returns a unique chordId for later release.
   */
  triggerChord(
    degree: number,
    frequencies: number[],
    waveform: WaveformType,
    adsr: ADSRValues
  ): string {
    const chordId = `${degree}-${Date.now()}-${this.nextChordSeq++}`;
    const voiceIndices = this.allocateVoices(VOICES_PER_CHORD);

    for (let i = 0; i < voiceIndices.length; i++) {
      const voice = this.voices[voiceIndices[i]];
      voice.setFrequency(frequencies[i] ?? frequencies[0]);
      voice.setWaveform(waveform);
      voice.setADSR(adsr);
      voice.triggerAttack();
    }

    const allocation: ChordAllocation = {
      chordId,
      voiceIndices,
      triggerTime: this.ctx.currentTime,
      frequencies,
      degree,
    };
    this.allocations.set(chordId, allocation);

    return chordId;
  }

  /**
   * Release a chord by its unique chordId.
   * Voices enter ADSR release phase (not instant silence).
   */
  releaseChord(chordId: string): void {
    const allocation = this.allocations.get(chordId);
    if (!allocation) return;

    for (const idx of allocation.voiceIndices) {
      this.voices[idx].triggerRelease();
    }

    // Remove from active allocations -- voices will transition to idle
    // after release completes via Voice's internal setTimeout
    this.allocations.delete(chordId);
  }

  /**
   * Release all active allocations for a given chord degree.
   * Primary release method: user releases a chord key, all instances of that degree release.
   */
  releaseByDegree(degree: number): void {
    const toRelease: string[] = [];
    for (const [chordId, allocation] of this.allocations) {
      if (allocation.degree === degree) {
        toRelease.push(chordId);
      }
    }
    for (const chordId of toRelease) {
      this.releaseChord(chordId);
    }
  }

  /**
   * Retune all active chords to new frequencies.
   * Used for live key/mode switching -- voices update in place without retriggering.
   */
  retuneActiveChords(chordDataArray: ChordRetuneData[]): void {
    // Build a lookup by degree for O(1) access
    const dataByDegree = new Map<number, ChordRetuneData>();
    for (const cd of chordDataArray) {
      dataByDegree.set(cd.degree, cd);
    }

    for (const allocation of this.allocations.values()) {
      const newData = dataByDegree.get(allocation.degree);
      if (!newData) continue;

      for (let i = 0; i < allocation.voiceIndices.length; i++) {
        const voice = this.voices[allocation.voiceIndices[i]];
        const newFreq = newData.frequencies[i] ?? newData.frequencies[0];
        voice.setFrequency(newFreq);
      }

      // Update stored frequencies
      allocation.frequencies = [...newData.frequencies];
    }
  }

  /** Set waveform on ALL voices in pool (not just active ones) */
  setWaveform(waveform: WaveformType): void {
    for (const voice of this.voices) {
      voice.setWaveform(waveform);
    }
  }

  /** Set ADSR on ALL voices in pool */
  setADSR(adsr: ADSRValues): void {
    for (const voice of this.voices) {
      voice.setADSR(adsr);
    }
  }

  /** Read-only access to current allocations (for retuning, debugging) */
  getAllocations(): Map<string, ChordAllocation> {
    return this.allocations;
  }

  /** Count of currently allocated voices */
  getActiveVoiceCount(): number {
    let count = 0;
    for (const allocation of this.allocations.values()) {
      count += allocation.voiceIndices.length;
    }
    return count;
  }

  /**
   * Allocate `count` voices from the pool.
   * 1. Prefer idle voices.
   * 2. Voice stealing: reclaim oldest chord's voices when pool exhausted.
   */
  private allocateVoices(count: number): number[] {
    const allocated: number[] = [];

    // Step 1: Find idle voices
    for (let i = 0; i < this.voices.length && allocated.length < count; i++) {
      if (!this.voices[i].isActive) {
        // Also check this index is not currently allocated (voice may be in release
        // phase where isActive is still true, or freshly released where isActive is false)
        if (!this.isVoiceAllocated(i)) {
          allocated.push(i);
        }
      }
    }

    // Step 2: Voice stealing if not enough idle voices
    while (allocated.length < count) {
      const oldest = this.findOldestAllocation();
      if (!oldest) break; // Safety: no allocations to steal from

      // Silence stolen voices immediately to avoid pitch chirp during reallocation
      for (const idx of oldest.voiceIndices) {
        const voice = this.voices[idx];
        // Hard silence before reuse
        voice.triggerRelease();
        // The voice will handle the release envelope, but we also need the indices
        // available immediately. Since we're stealing, force immediate availability.
      }

      // Remove the stolen allocation
      this.allocations.delete(oldest.chordId);

      // Add stolen voice indices to our allocation pool
      for (const idx of oldest.voiceIndices) {
        if (allocated.length < count) {
          allocated.push(idx);
        }
      }
    }

    return allocated;
  }

  /** Check if a voice index is part of any current allocation */
  private isVoiceAllocated(index: number): boolean {
    for (const allocation of this.allocations.values()) {
      if (allocation.voiceIndices.includes(index)) {
        return true;
      }
    }
    return false;
  }

  /** Find the oldest allocation by triggerTime */
  private findOldestAllocation(): ChordAllocation | null {
    let oldest: ChordAllocation | null = null;
    for (const allocation of this.allocations.values()) {
      if (!oldest || allocation.triggerTime < oldest.triggerTime) {
        oldest = allocation;
      }
    }
    return oldest;
  }

  /** Stop and disconnect all voices, clear allocations */
  dispose(): void {
    for (const voice of this.voices) {
      voice.dispose();
    }
    this.voices = [];
    this.allocations.clear();
  }
}
