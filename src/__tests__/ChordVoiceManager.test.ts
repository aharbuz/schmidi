import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChordVoiceManager } from '../renderer/audio/ChordVoiceManager';
import type { ADSRValues, WaveformType } from '../shared/types';
import { CHORD_VOICE_POOL_SIZE, VOICES_PER_CHORD } from '../renderer/audio/constants';

// ---------------------------------------------------------------------------
// Mock AudioContext factory
// ---------------------------------------------------------------------------

/**
 * Creates a mock AudioContext that tracks Voice creation.
 * Each Voice constructor calls createOscillator + createGain,
 * so we track those to verify pool size and voice operations.
 */
function createMockAudioContext() {
  const createdOscillators: ReturnType<typeof makeMockOscillator>[] = [];
  const createdGainNodes: ReturnType<typeof makeMockGainNode>[] = [];

  function makeMockGainParam() {
    return {
      value: 0,
      cancelScheduledValues: vi.fn(),
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      setTargetAtTime: vi.fn(),
    };
  }

  function makeMockOscillator() {
    return {
      type: 'sine' as OscillatorType,
      frequency: { value: 440, setValueAtTime: vi.fn() },
      detune: { value: 0, setValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      disconnect: vi.fn(),
    };
  }

  function makeMockGainNode() {
    return {
      gain: makeMockGainParam(),
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }

  const masterGainNode = makeMockGainNode();

  const ctx = {
    currentTime: 0,
    createOscillator: vi.fn(() => {
      const osc = makeMockOscillator();
      createdOscillators.push(osc);
      return osc;
    }),
    createGain: vi.fn(() => {
      const gain = makeMockGainNode();
      createdGainNodes.push(gain);
      return gain;
    }),
  } as unknown as AudioContext;

  return {
    ctx,
    masterGainNode: masterGainNode as unknown as GainNode,
    createdOscillators,
    createdGainNodes,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ChordVoiceManager', () => {
  let mock: ReturnType<typeof createMockAudioContext>;
  let manager: ChordVoiceManager;
  const defaultADSR: ADSRValues = { attack: 0.1, decay: 0.2, sustain: 0.6, release: 0.5 };
  const defaultWaveform: WaveformType = 'sine';

  beforeEach(() => {
    vi.useFakeTimers();
    mock = createMockAudioContext();
    manager = new ChordVoiceManager(mock.ctx, mock.masterGainNode);
  });

  // -------------------------------------------------------------------------
  // 1. Pool creation
  // -------------------------------------------------------------------------

  it('creates voice pool of configured size', () => {
    // Each Voice creates one oscillator and one gain node
    // Constructor also creates 7 per-degree GainNodes for independent volume control
    expect(mock.createdOscillators).toHaveLength(CHORD_VOICE_POOL_SIZE);
    expect(mock.createdGainNodes).toHaveLength(CHORD_VOICE_POOL_SIZE + 7);
  });

  // -------------------------------------------------------------------------
  // 2. Chord trigger allocates voices
  // -------------------------------------------------------------------------

  it('triggerChord allocates 3 voices and returns chordId', () => {
    const chordId = manager.triggerChord(1, [261.63, 329.63, 392.0], defaultWaveform, defaultADSR);

    expect(chordId).toMatch(/^1-\d+-\d+$/);
    expect(manager.getActiveVoiceCount()).toBe(VOICES_PER_CHORD);
    expect(manager.getAllocations().size).toBe(1);

    const allocation = manager.getAllocations().get(chordId);
    expect(allocation).toBeDefined();
    expect(allocation!.voiceIndices).toHaveLength(VOICES_PER_CHORD);
    expect(allocation!.degree).toBe(1);
    expect(allocation!.frequencies).toEqual([261.63, 329.63, 392.0]);
  });

  // -------------------------------------------------------------------------
  // 3. Chord release triggers ADSR release
  // -------------------------------------------------------------------------

  it('releaseChord triggers ADSR release on allocated voices', () => {
    const chordId = manager.triggerChord(1, [261.63, 329.63, 392.0], defaultWaveform, defaultADSR);

    // Voice indices were allocated
    const allocation = manager.getAllocations().get(chordId);
    expect(allocation).toBeDefined();

    manager.releaseChord(chordId);

    // Allocation should be removed from map
    expect(manager.getAllocations().has(chordId)).toBe(false);
    // Active voice count drops (allocation removed)
    expect(manager.getActiveVoiceCount()).toBe(0);
  });

  // -------------------------------------------------------------------------
  // 4. Release by degree
  // -------------------------------------------------------------------------

  it('releaseByDegree releases all allocations for a degree', () => {
    // Trigger degree 1 twice (edge case)
    const _id1 = manager.triggerChord(1, [261.63, 329.63, 392.0], defaultWaveform, defaultADSR);
    const _id2 = manager.triggerChord(1, [261.63, 329.63, 392.0], defaultWaveform, defaultADSR);

    expect(manager.getAllocations().size).toBe(2);
    expect(manager.getActiveVoiceCount()).toBe(6);

    manager.releaseByDegree(1);

    expect(manager.getAllocations().size).toBe(0);
    expect(manager.getActiveVoiceCount()).toBe(0);
  });

  // -------------------------------------------------------------------------
  // 5. Polychordal playback
  // -------------------------------------------------------------------------

  it('supports polychordal playback', () => {
    // Trigger 3 different chords simultaneously
    manager.triggerChord(1, [261.63, 329.63, 392.0], defaultWaveform, defaultADSR);
    manager.triggerChord(4, [349.23, 440.0, 523.25], defaultWaveform, defaultADSR);
    manager.triggerChord(5, [392.0, 493.88, 587.33], defaultWaveform, defaultADSR);

    expect(manager.getAllocations().size).toBe(3);
    expect(manager.getActiveVoiceCount()).toBe(9);
  });

  // -------------------------------------------------------------------------
  // 6. Voice stealing reclaims oldest chord
  // -------------------------------------------------------------------------

  it('voice stealing reclaims oldest chord when pool exhausted', () => {
    // Fill the pool: 8 chords x 3 voices = 24 voices (full pool)
    const chordIds: string[] = [];
    for (let degree = 1; degree <= 8; degree++) {
      // Small delay between triggers so triggerTime differs
      (mock.ctx as unknown as { currentTime: number }).currentTime = degree * 0.1;
      const id = manager.triggerChord(degree, [200 + degree * 10, 300 + degree * 10, 400 + degree * 10], defaultWaveform, defaultADSR);
      chordIds.push(id);
    }

    expect(manager.getActiveVoiceCount()).toBe(24);
    expect(manager.getAllocations().size).toBe(8);

    // Trigger 9th chord -- should steal oldest (degree 1, triggerTime 0.1)
    (mock.ctx as unknown as { currentTime: number }).currentTime = 1.0;
    const ninthId = manager.triggerChord(9, [500, 600, 700], defaultWaveform, defaultADSR);

    // Oldest chord (degree 1) should be removed, 9th chord allocated
    expect(manager.getAllocations().has(chordIds[0])).toBe(false);
    expect(manager.getAllocations().has(ninthId)).toBe(true);
    // Still 8 chords active (one stolen, one added)
    expect(manager.getAllocations().size).toBe(8);
    expect(manager.getActiveVoiceCount()).toBe(24);
  });

  // -------------------------------------------------------------------------
  // 7. Retune active chords
  // -------------------------------------------------------------------------

  it('retuneActiveChords updates frequencies on active voices', () => {
    manager.triggerChord(1, [261.63, 329.63, 392.0], defaultWaveform, defaultADSR);
    manager.triggerChord(5, [392.0, 493.88, 587.33], defaultWaveform, defaultADSR);

    // Retune: shift both chords to new frequencies
    manager.retuneActiveChords([
      { degree: 1, frequencies: [277.18, 349.23, 415.30] },
      { degree: 5, frequencies: [415.30, 523.25, 622.25] },
    ]);

    // Verify allocation frequencies updated
    for (const allocation of manager.getAllocations().values()) {
      if (allocation.degree === 1) {
        expect(allocation.frequencies).toEqual([277.18, 349.23, 415.30]);
      }
      if (allocation.degree === 5) {
        expect(allocation.frequencies).toEqual([415.30, 523.25, 622.25]);
      }
    }
  });

  // -------------------------------------------------------------------------
  // 8. setWaveform applies to all pool voices
  // -------------------------------------------------------------------------

  it('setWaveform applies to all pool voices', () => {
    // setWaveform should not throw and should apply to all voices
    manager.setWaveform('square');

    // Verify all oscillators were set to 'square'
    for (const osc of mock.createdOscillators) {
      expect(osc.type).toBe('square');
    }
  });

  // -------------------------------------------------------------------------
  // 9. Dispose cleans up all voices
  // -------------------------------------------------------------------------

  it('dispose cleans up all voices', () => {
    // Trigger a chord first
    manager.triggerChord(1, [261.63, 329.63, 392.0], defaultWaveform, defaultADSR);

    manager.dispose();

    // All oscillators should have been stopped
    for (const osc of mock.createdOscillators) {
      expect(osc.stop).toHaveBeenCalled();
    }
    // All gain nodes should have been disconnected
    for (const gain of mock.createdGainNodes) {
      expect(gain.disconnect).toHaveBeenCalled();
    }
    // Allocations should be cleared
    expect(manager.getAllocations().size).toBe(0);
    expect(manager.getActiveVoiceCount()).toBe(0);
  });
});
