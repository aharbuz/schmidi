import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Voice } from '../renderer/audio/Voice';
import type { ADSRValues } from '../shared/types';

// Minimal AudioContext mock that tracks scheduling calls
function createMockAudioContext() {
  const schedulingCalls: { method: string; args: unknown[] }[] = [];

  const mockGainParam = {
    value: 0,
    cancelScheduledValues: vi.fn((...args: unknown[]) => {
      schedulingCalls.push({ method: 'cancelScheduledValues', args });
    }),
    setValueAtTime: vi.fn((...args: unknown[]) => {
      schedulingCalls.push({ method: 'setValueAtTime', args });
    }),
    linearRampToValueAtTime: vi.fn((...args: unknown[]) => {
      schedulingCalls.push({ method: 'linearRampToValueAtTime', args });
    }),
    setTargetAtTime: vi.fn((...args: unknown[]) => {
      schedulingCalls.push({ method: 'setTargetAtTime', args });
    }),
  };

  const mockFrequencyParam = {
    value: 440,
    setValueAtTime: vi.fn(),
  };

  const mockDetuneParam = {
    value: 0,
    setValueAtTime: vi.fn(),
  };

  const mockOscillator = {
    type: 'sine' as OscillatorType,
    frequency: mockFrequencyParam,
    detune: mockDetuneParam,
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    disconnect: vi.fn(),
  };

  const mockGainNode = {
    gain: mockGainParam,
    connect: vi.fn(),
    disconnect: vi.fn(),
  };

  const ctx = {
    currentTime: 0,
    createOscillator: vi.fn(() => mockOscillator),
    createGain: vi.fn(() => mockGainNode),
  } as unknown as AudioContext;

  return { ctx, mockOscillator, mockGainNode, mockGainParam, schedulingCalls };
}

describe('Voice', () => {
  let mock: ReturnType<typeof createMockAudioContext>;
  let voice: Voice;
  const defaultADSR: ADSRValues = { attack: 0.1, decay: 0.2, sustain: 0.6, release: 0.5 };

  beforeEach(() => {
    mock = createMockAudioContext();
    voice = new Voice(mock.ctx, mock.mockGainNode as unknown as GainNode, 440, 0);
  });

  describe('triggerAttack', () => {
    it('follows anti-click scheduling pattern: cancel -> anchor -> ramp to 1 -> setTargetAtTime to sustain', () => {
      voice.setADSR(defaultADSR);
      voice.triggerAttack();

      const calls = mock.schedulingCalls;

      // Step 1: cancelScheduledValues
      expect(calls[0].method).toBe('cancelScheduledValues');

      // Step 2: setValueAtTime (anchor current value)
      expect(calls[1].method).toBe('setValueAtTime');

      // Step 3: linearRampToValueAtTime to 1 (peak)
      expect(calls[2].method).toBe('linearRampToValueAtTime');
      expect(calls[2].args[0]).toBe(1); // ramp to full gain

      // Step 4: setTargetAtTime to sustain level
      expect(calls[3].method).toBe('setTargetAtTime');
      expect(calls[3].args[0]).toBe(defaultADSR.sustain); // sustain level
    });
  });

  describe('triggerRelease', () => {
    it('follows anti-click scheduling pattern: cancel -> anchor -> setTargetAtTime to near-zero', () => {
      voice.setADSR(defaultADSR);
      voice.triggerAttack();

      // Clear previous calls
      mock.schedulingCalls.length = 0;

      voice.triggerRelease();

      const calls = mock.schedulingCalls;

      // Step 1: cancelScheduledValues
      expect(calls[0].method).toBe('cancelScheduledValues');

      // Step 2: setValueAtTime (anchor current value)
      expect(calls[1].method).toBe('setValueAtTime');

      // Step 3: setTargetAtTime to near-zero
      expect(calls[2].method).toBe('setTargetAtTime');
      expect(calls[2].args[0]).toBeCloseTo(0.0001, 4); // near-zero target
    });
  });

  describe('setWaveform', () => {
    it('changes the oscillator type', () => {
      voice.setWaveform('square');
      expect(mock.mockOscillator.type).toBe('square');

      voice.setWaveform('sawtooth');
      expect(mock.mockOscillator.type).toBe('sawtooth');

      voice.setWaveform('triangle');
      expect(mock.mockOscillator.type).toBe('triangle');

      voice.setWaveform('sine');
      expect(mock.mockOscillator.type).toBe('sine');
    });
  });

  describe('setADSR', () => {
    it('updates envelope values for next trigger', () => {
      const newADSR: ADSRValues = { attack: 0.5, decay: 0.3, sustain: 0.8, release: 1.0 };
      voice.setADSR(newADSR);

      // Trigger with new values and verify they are used
      voice.triggerAttack();

      const calls = mock.schedulingCalls;
      // The sustain target should match the new ADSR
      const setTargetCall = calls.find(
        (c) => c.method === 'setTargetAtTime' && c.args[0] === newADSR.sustain
      );
      expect(setTargetCall).toBeDefined();
    });
  });

  describe('getState', () => {
    it('reports voice state', () => {
      const state = voice.getState();
      expect(state).toHaveProperty('isActive');
      expect(state).toHaveProperty('stage');
      expect(state).toHaveProperty('frequency');
      expect(state).toHaveProperty('detune');
    });
  });
});
