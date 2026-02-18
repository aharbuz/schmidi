import { useSynthStore, getVoiceManager } from '../store/synthStore';

/**
 * Bottom status bar showing AudioContext diagnostics.
 *
 * Displays: context state (running/suspended), sample rate, base latency,
 * and compressor gain reduction.
 *
 * 28px height, dark background, monospace numbers, dim text.
 */
export function StatusBar() {
  const audioStatus = useSynthStore((s) => s.audioStatus);

  // Get compressor reduction (updated via animation loop reads)
  const vm = getVoiceManager();
  const compReduction = vm
    ? vm.getMasterBus().compressor.reduction
    : 0;

  const stateColor =
    audioStatus.state === 'running'
      ? 'text-emerald-500/80'
      : 'text-amber-500/80';

  const latencyMs =
    audioStatus.baseLatency > 0
      ? `~${(audioStatus.baseLatency * 1000).toFixed(1)}ms`
      : '--';

  const reductionDb =
    compReduction < -0.1
      ? `GR: ${compReduction.toFixed(1)}dB`
      : 'GR: 0dB';

  return (
    <div
      data-testid="status-bar"
      className="h-7 flex items-center justify-between px-4
        bg-[#111116] border-t border-gray-800/40
        text-[11px] font-mono text-gray-500 select-none no-select"
    >
      {/* Left: context state */}
      <div className="flex items-center gap-3">
        <span className={stateColor}>
          {audioStatus.state}
        </span>
        <span>{audioStatus.sampleRate > 0 ? `${audioStatus.sampleRate} Hz` : '--'}</span>
        <span>{latencyMs}</span>
      </div>

      {/* Right: compressor reduction */}
      <div className="flex items-center gap-3">
        <span className="text-gray-600">{reductionDb}</span>
      </div>
    </div>
  );
}
