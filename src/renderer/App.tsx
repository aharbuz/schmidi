import { useSynthStore } from './store/synthStore';
import { useAnimationLoop } from './hooks/useAnimationLoop';
import { SplashScreen } from './components/SplashScreen';
import { TitleBar } from './components/TitleBar';

/**
 * Root application component.
 *
 * Shows SplashScreen until audio is initialized, then transitions
 * to the main instrument layout with custom title bar.
 */
export default function App() {
  const audioReady = useSynthStore((s) => s.audioReady);

  // Start animation loop when audio is ready (polls voice states at 60fps)
  useAnimationLoop();

  if (!audioReady) {
    return <SplashScreen />;
  }

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0f] text-white overflow-hidden">
      <TitleBar />
      <main className="flex-1 flex">
        {/* Voice buttons, controls, etc. will go here in Plans 04/05 */}
        <div className="flex-1 flex items-center justify-center text-gray-500">
          Instrument controls will appear here
        </div>
      </main>
      {/* StatusBar will go here in Plan 05 */}
    </div>
  );
}
