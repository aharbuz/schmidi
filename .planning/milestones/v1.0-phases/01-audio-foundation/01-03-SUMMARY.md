---
phase: 01-audio-foundation
plan: 03
subsystem: ui
tags: [zustand, react-hooks, splash-screen, title-bar, audiocontext, animation-loop, tailwind]

# Dependency graph
requires:
  - phase: 01-01
    provides: Electron Forge scaffold with Vite, React, TypeScript, Tailwind
  - phase: 01-02
    provides: 8-voice audio engine with VoiceManager, master bus, ADSR presets
provides:
  - Zustand store bridging audio engine to React UI (waveform, ADSR, voice states, audio status)
  - useAudioInit hook for on-demand AudioContext creation via user gesture
  - useAnimationLoop hook polling voice states at 60fps via requestAnimationFrame
  - SplashScreen component with branding, pulsing start button, AudioContext resume
  - TitleBar component with drag region and macOS traffic light padding
  - App shell with splash -> main layout conditional routing
affects: [01-04, 01-05]

# Tech tracking
tech-stack:
  added: []
  patterns: [zustand-module-ref, raf-polling-loop, splash-gate-audiocontext, css-app-region-drag]

key-files:
  created:
    - src/renderer/store/synthStore.ts
    - src/renderer/hooks/useAudioInit.ts
    - src/renderer/hooks/useAnimationLoop.ts
    - src/renderer/components/SplashScreen.tsx
    - src/renderer/components/TitleBar.tsx
  modified:
    - src/renderer/App.tsx
    - src/renderer/index.css

key-decisions:
  - "VoiceManager stored as module-level variable (not reactive state) to avoid re-render overhead"
  - "Splash screen gates AudioContext resume on user click per Web Audio autoplay policy"
  - "Animation loop uses rAF polling rather than event-driven updates for consistent 60fps visual feedback"

patterns-established:
  - "Module-level refs for non-reactive engine instances in Zustand stores"
  - "Splash screen as AudioContext gate: user gesture -> initAudio -> audioReady state transition"
  - "rAF loop for polling audio engine state into UI store"
  - "CSS -webkit-app-region: drag for custom frameless title bar"

requirements-completed: [AUDIO-01, AUDIO-04]

# Metrics
duration: 2min
completed: 2026-02-18
---

# Phase 1 Plan 03: App Shell + State Management Summary

**Zustand store bridging VoiceManager to React UI, splash screen gating AudioContext on user click, custom title bar with drag region, and 60fps animation loop for voice state polling**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-18T12:53:00Z
- **Completed:** 2026-02-18T12:54:55Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Zustand store with all synth UI state (waveform, preset, ADSR, masterVolume, voiceStates, audioStatus) and actions wired directly to VoiceManager methods
- useAudioInit hook: creates VoiceManager, resumes AudioContext, updates audio status on splash button click
- useAnimationLoop hook: rAF-based 60fps polling of voice states and audio context status
- SplashScreen with gradient Schmidi logo, version, tagline, CSS pulse-glow animated start button
- TitleBar with -webkit-app-region drag, macOS traffic light padding (80px), centered app name
- App.tsx conditional routing: SplashScreen when !audioReady, main layout when audioReady

## Task Commits

Each task was committed atomically:

1. **Task 1: Zustand store + audio hooks** - `800d23b` (feat)
2. **Task 2: Splash screen + title bar + App shell** - `91aebec` (feat)

## Files Created/Modified
- `src/renderer/store/synthStore.ts` - Zustand store: all UI state + actions calling VoiceManager
- `src/renderer/hooks/useAudioInit.ts` - Hook to init audio engine on user gesture
- `src/renderer/hooks/useAnimationLoop.ts` - rAF loop polling voice states at 60fps
- `src/renderer/components/SplashScreen.tsx` - Full-screen splash with branding and start button
- `src/renderer/components/TitleBar.tsx` - Custom frameless title bar with drag region
- `src/renderer/App.tsx` - Root component with splash/main routing
- `src/renderer/index.css` - Global dark theme styles, scrollbar hiding, selection color

## Decisions Made
- **VoiceManager as module-level ref:** Stored outside Zustand reactive state to avoid unnecessary re-renders. The audio engine instance doesn't need to trigger React updates -- only the voice states it produces do.
- **Splash screen AudioContext gate:** Following Web Audio API autoplay policy, AudioContext is created and resumed only on explicit user click, ensuring cross-browser compatibility.
- **rAF polling pattern:** Rather than event-driven voice state updates, the animation loop polls at 60fps. This is simpler, consistent, and matches the visual refresh rate for envelope animations.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Store + hooks ready for Plan 04 (voice buttons, keyboard input) to call triggerVoice/releaseVoice
- Main layout placeholder ready for instrument controls in Plans 04/05
- Animation loop will drive envelope visualizations when canvas components are added
- TitleBar in place for all subsequent UI development

## Self-Check: PASSED

All 5 created files and 2 modified files verified on disk. Both task commits (800d23b, 91aebec) verified in git log.

---
*Phase: 01-audio-foundation*
*Completed: 2026-02-18*
