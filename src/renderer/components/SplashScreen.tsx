import { useState } from 'react';
import { useAudioInit } from '../hooks/useAudioInit';

/**
 * Full-screen splash overlay shown on app launch.
 *
 * Displays Schmidi branding, version, tagline, and a pulsing start button.
 * Clicking the button initializes the audio engine (resumes AudioContext)
 * and transitions to the main instrument UI.
 */
export function SplashScreen() {
  const { initAudio } = useAudioInit();
  const [isStarting, setIsStarting] = useState(false);

  const handleStart = async () => {
    if (isStarting) return;
    setIsStarting(true);
    try {
      await initAudio();
    } catch (err) {
      console.error('Failed to initialize audio:', err);
      setIsStarting(false);
    }
  };

  return (
    <div
      data-testid="splash-screen"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a0f]"
    >
      {/* Logo */}
      <h1
        className="text-7xl font-bold tracking-wider mb-2"
        style={{
          background: 'linear-gradient(135deg, #06b6d4, #22d3ee, #67e8f9)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: 'none',
          filter: 'drop-shadow(0 0 30px rgba(6, 182, 212, 0.3))',
        }}
      >
        Schmidi
      </h1>

      {/* Version */}
      <p className="text-gray-600 text-sm tracking-widest uppercase mb-1">
        v0.1.0
      </p>

      {/* Tagline */}
      <p className="text-gray-400 text-lg tracking-wide mb-16">
        Convergence Synthesizer
      </p>

      {/* Start button */}
      <button
        data-testid="start-button"
        onClick={handleStart}
        disabled={isStarting}
        className="relative px-10 py-4 text-lg font-medium tracking-wider uppercase
          text-cyan-300 border border-cyan-500/40 rounded-lg
          bg-cyan-500/5 backdrop-blur-sm
          transition-all duration-300
          hover:bg-cyan-500/15 hover:border-cyan-400/60 hover:text-cyan-200
          disabled:opacity-50 disabled:cursor-wait
          focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
        style={{
          animation: isStarting ? 'none' : 'pulse-glow 2.5s ease-in-out infinite',
        }}
      >
        {isStarting ? 'Initializing...' : 'Click to Start'}
      </button>

      {/* Pulse glow animation */}
      <style>{`
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(6, 182, 212, 0.15),
                        0 0 40px rgba(6, 182, 212, 0.05);
          }
          50% {
            box-shadow: 0 0 30px rgba(6, 182, 212, 0.3),
                        0 0 60px rgba(6, 182, 212, 0.1);
          }
        }
      `}</style>
    </div>
  );
}
