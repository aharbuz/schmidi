import type { VoiceState } from '../../shared/types';

/** Note names for 8 voices: C major scale C3-C4 */
const NOTE_NAMES = ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4'];

interface VoiceButtonProps {
  voiceIndex: number;
  voiceState: VoiceState;
  keyLabel: string;
  onTrigger: (index: number) => void;
  onRelease: (index: number) => void;
}

/**
 * Per-voice trigger button with keyboard binding and envelope animation.
 *
 * Displays note name and keyboard shortcut. Mouse interaction triggers
 * attack/release. Animated glow reflects current envelope stage:
 * - idle: dark, no glow
 * - attack: cyan glow intensifying
 * - sustain/decay: steady cyan pulse
 * - release: glow fading out
 */
export function VoiceButton({
  voiceIndex,
  voiceState,
  keyLabel,
  onTrigger,
  onRelease,
}: VoiceButtonProps) {
  const { stage } = voiceState;
  const noteName = NOTE_NAMES[voiceIndex] ?? `V${voiceIndex}`;

  const handleMouseDown = () => {
    onTrigger(voiceIndex);
  };

  const handleMouseUp = () => {
    onRelease(voiceIndex);
  };

  const handleMouseLeave = () => {
    // Release if mouse leaves while held (stage is not idle or release)
    if (stage === 'attack' || stage === 'decay' || stage === 'sustain') {
      onRelease(voiceIndex);
    }
  };

  // Build dynamic class for envelope stage animation
  const stageClass = getStageClass(stage);

  return (
    <button
      data-testid={`voice-button-${voiceIndex}`}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      title={`Press '${keyLabel.toUpperCase()}' to play ${noteName}`}
      className={`
        relative w-[68px] h-[68px] rounded-lg
        border border-gray-700/50
        bg-[#12121a] text-white
        flex flex-col items-center justify-center gap-0.5
        cursor-pointer select-none no-select
        transition-all duration-150
        hover:border-gray-600/70
        focus:outline-none focus:ring-1 focus:ring-cyan-500/40
        ${stageClass}
      `}
    >
      {/* Note name */}
      <span className="text-sm font-semibold tracking-wide">{noteName}</span>

      {/* Keyboard shortcut */}
      <span className="text-[10px] text-gray-500 uppercase tracking-widest">
        {keyLabel}
      </span>

      {/* Inline style tag for animations */}
      <style>{voiceButtonAnimations}</style>
    </button>
  );
}

/** Get Tailwind/style classes based on envelope stage */
function getStageClass(stage: string): string {
  switch (stage) {
    case 'attack':
      return 'voice-btn-attack';
    case 'decay':
    case 'sustain':
      return 'voice-btn-sustain';
    case 'release':
      return 'voice-btn-release';
    default:
      return '';
  }
}

/** CSS animations for voice button envelope stages */
const voiceButtonAnimations = `
  .voice-btn-attack {
    box-shadow: 0 0 16px rgba(6, 182, 212, 0.5),
                0 0 32px rgba(6, 182, 212, 0.2);
    border-color: rgba(6, 182, 212, 0.6);
    background-color: rgba(6, 182, 212, 0.08);
    animation: voice-glow-in 0.15s ease-out forwards;
  }

  .voice-btn-sustain {
    box-shadow: 0 0 12px rgba(6, 182, 212, 0.4),
                0 0 24px rgba(6, 182, 212, 0.15);
    border-color: rgba(6, 182, 212, 0.5);
    background-color: rgba(6, 182, 212, 0.06);
    animation: voice-pulse 1.5s ease-in-out infinite;
  }

  .voice-btn-release {
    box-shadow: 0 0 4px rgba(6, 182, 212, 0.1);
    border-color: rgba(107, 114, 128, 0.5);
    background-color: rgba(6, 182, 212, 0.02);
    animation: voice-glow-out 0.4s ease-in forwards;
  }

  @keyframes voice-glow-in {
    from {
      box-shadow: 0 0 0 rgba(6, 182, 212, 0);
      border-color: rgba(107, 114, 128, 0.5);
    }
    to {
      box-shadow: 0 0 16px rgba(6, 182, 212, 0.5),
                  0 0 32px rgba(6, 182, 212, 0.2);
      border-color: rgba(6, 182, 212, 0.6);
    }
  }

  @keyframes voice-pulse {
    0%, 100% {
      box-shadow: 0 0 12px rgba(6, 182, 212, 0.4),
                  0 0 24px rgba(6, 182, 212, 0.15);
    }
    50% {
      box-shadow: 0 0 18px rgba(6, 182, 212, 0.55),
                  0 0 36px rgba(6, 182, 212, 0.2);
    }
  }

  @keyframes voice-glow-out {
    from {
      box-shadow: 0 0 12px rgba(6, 182, 212, 0.4),
                  0 0 24px rgba(6, 182, 212, 0.15);
      border-color: rgba(6, 182, 212, 0.5);
    }
    to {
      box-shadow: 0 0 0 rgba(6, 182, 212, 0);
      border-color: rgba(107, 114, 128, 0.5);
    }
  }
`;
