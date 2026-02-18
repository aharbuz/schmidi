/** Singleton AudioContext with resume helper */

let audioContext: AudioContext | null = null;

/**
 * Get the singleton AudioContext instance.
 * Creates a new one with interactive latency hint on first call.
 */
export function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext({ latencyHint: 'interactive' });
    // Expose for Playwright testing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__audioContext = audioContext;
  }
  return audioContext;
}

/**
 * Ensure the AudioContext is in 'running' state.
 * Browsers suspend AudioContext until user gesture -- call this on first interaction.
 */
export async function ensureAudioRunning(): Promise<void> {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
}
