/**
 * Custom frameless title bar with drag region.
 *
 * 38px height, dark background, centered app name.
 * Left side has padding for macOS traffic light buttons.
 * The entire bar is draggable except interactive elements.
 */
export function TitleBar() {
  // Read platform from preload API -- defaults to macOS padding
  const platform = typeof window !== 'undefined' && window.schmidiAPI
    ? window.schmidiAPI.platform
    : 'darwin';

  const trafficLightPadding = platform === 'darwin' ? 80 : 0;

  return (
    <div
      className="flex items-center justify-center shrink-0
        bg-[#0a0a0f] border-b border-white/[0.03] select-none"
      style={{
        height: '38px',
        WebkitAppRegion: 'drag',
        paddingLeft: `${trafficLightPadding}px`,
      } as React.CSSProperties}
    >
      <span className="text-gray-500 text-xs font-medium tracking-widest uppercase">
        Schmidi
      </span>
    </div>
  );
}
