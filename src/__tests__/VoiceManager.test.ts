import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VoiceManager } from '../renderer/audio/VoiceManager';
import type { ADSRValues, WaveformType } from '../shared/types';

// Mock AudioContext and related nodes
function createMockAudioContext() {
  const mockAnalyser = {
    fftSize: 2048,
    connect: vi.fn(),
    disconnect: vi.fn(),
  };

  const mockCompressor = {
    threshold: { value: -24 },
    knee: { value: 12 },
    ratio: { value: 4 },
    attack: { value: 0.003 },
    release: { value: 0.25 },
    connect: vi.fn(() => mockAnalyser),
    disconnect: vi.fn(),
  };

  const mockMasterGainParam = {
    value: 0.15,
    cancelScheduledValues: vi.fn(),
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    setTargetAtTime: vi.fn(),
  };

  const mockMasterGainNode = {
    gain: mockMasterGainParam,
    connect: vi.fn(() => mockCompressor),
    disconnect: vi.fn(),
  };

  const mockVoiceGainParam = {
    value: 0,
    cancelScheduledValues: vi.fn(),
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    setTargetAtTime: vi.fn(),
  };

  const mockVoiceGainNode = {
    gain: mockVoiceGainParam,
    connect: vi.fn(),
    disconnect: vi.fn(),
  };

  const mockOscillator = {
    type: 'sine' as OscillatorType,
    frequency: { value: 440, setValueAtTime: vi.fn() },
    detune: { value: 0, setValueAtTime: vi.fn() },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    disconnect: vi.fn(),
  };

  let gainCallCount = 0;
  const ctx = {
    currentTime: 0,
    destination: {},
    createOscillator: vi.fn(() => ({ ...mockOscillator })),
    createGain: vi.fn(() => {
      gainCallCount++;
      // First call is the master gain, subsequent are voice gains
      if (gainCallCount === 1) {
        return { ...mockMasterGainNode };
      }
      return {
        gain: { ...mockVoiceGainParam },
        connect: vi.fn(),
        disconnect: vi.fn(),
      };
    }),
    createDynamicsCompressor: vi.fn(() => ({ ...mockCompressor })),
    createAnalyser: vi.fn(() => ({ ...mockAnalyser })),
    resume: vi.fn(() => Promise.resolve()),
    state: 'running',
  } as unknown as AudioContext;

  return { ctx, mockOscillator };
}

describe('VoiceManager', () => {
  let mock: ReturnType<typeof createMockAudioContext>;
  let manager: VoiceManager;

  beforeEach(() => {
    mock = createMockAudioContext();
    manager = new VoiceManager(mock.ctx);
  });

  it('creates 8 Voice instances', () => {
    const states = manager.getVoiceStates();
    expect(states).toHaveLength(8);
  });

  it('setWaveform propagates to all voices', () => {
    // Should not throw
    manager.setWaveform('square');
    manager.setWaveform('sawtooth');
    manager.setWaveform('triangle');
    manager.setWaveform('sine');
  });

  it('setADSR propagates to all voices', () => {
    const adsr: ADSRValues = { attack: 0.5, decay: 0.3, sustain: 0.8, release: 1.0 };
    // Should not throw
    manager.setADSR(adsr);
  });

  it('setPreset looks up preset and calls setADSR', () => {
    // Should not throw for valid preset
    manager.setPreset('Pad (Drift)');
    manager.setPreset('Pluck (Snap)');
    manager.setPreset('Organ (Breathe)');
    manager.setPreset('Strings (Bloom)');
  });

  it('setPreset throws for invalid preset name', () => {
    expect(() => manager.setPreset('NonExistent')).toThrow();
  });

  it('getVoiceStates returns 8 VoiceState entries', () => {
    const states = manager.getVoiceStates();
    expect(states).toHaveLength(8);

    for (const state of states) {
      expect(state).toHaveProperty('isActive');
      expect(state).toHaveProperty('stage');
      expect(state).toHaveProperty('frequency');
      expect(state).toHaveProperty('detune');
    }
  });

  it('triggerAttack and triggerRelease work for valid voice indices', () => {
    // Should not throw
    manager.triggerAttack(0);
    manager.triggerAttack(7);
    manager.triggerRelease(0);
    manager.triggerRelease(7);
  });

  it('getMasterBus returns the master bus', () => {
    const bus = manager.getMasterBus();
    expect(bus).toHaveProperty('masterGain');
    expect(bus).toHaveProperty('compressor');
    expect(bus).toHaveProperty('analyser');
  });

  it('dispose cleans up all voices', () => {
    // Should not throw
    manager.dispose();
  });
});
