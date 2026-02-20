---
phase: 04-visualization
plan: 03
subsystem: visualization
tags: [canvas-2d, layout, full-viz, view-toggle, dark-theme, glow, electron]

# Dependency graph
requires:
  - phase: 04-visualization
    provides: "RadialView canvas (04-01), WaveformView canvas (04-02), vizColors palette, useCanvasSetup hook, synthStore vizMode/fullViz state"
provides:
  - "VisualizationPanel.tsx: view switcher container rendering RadialView or WaveformView based on vizMode, with chord overlay"
  - "ViewToggle.tsx: radial/waveform toggle icon overlaying canvas top-right"
  - "App.tsx restructured: canvas-primary layout in slide mode, full-viz mode hiding all chrome"
  - "index.css: dark/glow restyle with glow-border, glow-text, fade-in utilities"
  - "main.ts: 16:9 default window (1280x720)"
affects: [05-instrument-personality]

# Tech tracking
tech-stack:
  added: []
  patterns: [canvas-primary-layout, full-viz-mode, chord-overlay-on-canvas, view-mode-switching]

key-files:
  created:
    - src/renderer/components/visualization/VisualizationPanel.tsx
    - src/renderer/components/visualization/ViewToggle.tsx
  modified:
    - src/renderer/App.tsx
    - src/renderer/index.css
    - src/main/main.ts
    - src/renderer/components/TitleBar.tsx
    - src/renderer/components/StatusBar.tsx
    - src/renderer/components/ModeToggle.tsx

key-decisions:
  - "VisualizationPanel renders chord overlay buttons only in slideMode, matching SlideModeUI's triggerSlideChord/releaseSlideChord actions"
  - "Full-viz mode hides TitleBar, sidebars, StatusBar, ModeToggle -- only canvas and overlay controls remain"
  - "Escape key exits full-viz; expand icon button enters full-viz (avoids chord key conflicts with A-J mapping)"
  - "Dark/glow restyle uses CSS utilities (glow-border, glow-text, fade-in) rather than component-level inline styles"
  - "Window defaults to 1280x720 (16:9) on first launch; windowStateKeeper preserves user's actual size after that"

patterns-established:
  - "Canvas-primary layout: visualization fills center flex-1, sidebars are secondary"
  - "Full-viz pattern: fullViz boolean in Zustand hides all chrome, keyboard shortcuts remain active via global document listeners"
  - "Chord overlay pattern: semi-transparent buttons over canvas with Roman numerals + keyboard shortcut hints"

requirements-completed: [VIZ-03, VIZ-04]

# Metrics
duration: 2min
completed: 2026-02-20
---

# Phase 4 Plan 03: Layout Integration Summary

**Canvas-primary layout with VisualizationPanel view switcher, full-viz performance mode hiding all chrome, chord overlay buttons, and dark/glow app restyle at 16:9 default window**

## Performance

- **Duration:** 2 min (implementation) + human verification checkpoint
- **Started:** 2026-02-20T12:26:22Z
- **Completed:** 2026-02-20T12:27:51Z (implementation); checkpoint approved 2026-02-20
- **Tasks:** 3 (2 auto + 1 checkpoint)
- **Files modified:** 8

## Accomplishments
- VisualizationPanel container that switches between RadialView and WaveformView based on vizMode, with chord overlay buttons for mouse interaction
- ViewToggle component with radial/waveform icons overlaying the canvas top-right corner
- App layout restructured: canvas fills center in slide mode, full-viz mode hides all chrome (TitleBar, sidebars, StatusBar, ModeToggle)
- Dark/glow CSS restyle applied globally with glow-border, glow-text, and fade-in animation utilities
- Window defaults to 1280x720 (16:9 aspect ratio) on first launch
- All 11 verification items passed during human checkpoint review

## Task Commits

Each task was committed atomically:

1. **Task 1: VisualizationPanel + ViewToggle + chord overlay** - `374f809` (feat)
2. **Task 2: App layout restructure + full-viz mode + dark/glow restyle + window aspect ratio** - `9732aa9` (feat)
3. **Task 3: Visual verification checkpoint** - human-approved (no commit; verification-only task)

## Files Created/Modified
- `src/renderer/components/visualization/VisualizationPanel.tsx` - View switcher container rendering RadialView or WaveformView, chord overlay buttons with Roman numerals and keyboard shortcut hints
- `src/renderer/components/visualization/ViewToggle.tsx` - Small radial/waveform toggle icon in canvas top-right corner
- `src/renderer/App.tsx` - Canvas-primary layout in slide mode, full-viz mode toggling, expand/collapse icon
- `src/renderer/index.css` - Dark/glow restyle: glow-border, glow-text, fade-in animation, subtle separators
- `src/main/main.ts` - Window dimensions changed to 1280x720 (16:9), minHeight to 450
- `src/renderer/components/TitleBar.tsx` - Dark theme blend (subtle bottom border)
- `src/renderer/components/StatusBar.tsx` - Dark theme blend
- `src/renderer/components/ModeToggle.tsx` - Glow treatment for slide mode active state

## Decisions Made
- VisualizationPanel renders chord overlay only when slideMode is true (visualization is a slide mode feature)
- Full-viz mode uses Escape to exit and an expand icon button to enter (avoids conflicting with chord keys A-J)
- Keyboard chord shortcuts remain active in full-viz mode because useSlideKeyboard/useChordKeyboard use global document.addEventListener (no DOM dependency)
- Dark/glow restyle applied as CSS utility classes rather than per-component inline styles for consistency and reuse
- Window defaults to 1280x720; windowStateKeeper persists user's actual preferred size

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Enhancement Ideas (from checkpoint review)
User noted these as future improvements (explicitly not blockers):
- Orbs jump to center from far out (smoother convergence desired)
- Waveform view not yet compelling on its own
- Start converging tracks from volume 0, toggle off solid chord
- Orbs should drift away when note is de-pressed
- Master volume control should move to bottom left
- Sidebar pane height issues (can't scroll within panes)

## Next Phase Readiness
- Phase 4 Visualization complete: all 3 plans delivered, all 4 VIZ requirements met
- Ready for Phase 5: Instrument Personality (slide character, convergence behavior, pre-press modes, scale snapping)
- Enhancement ideas from checkpoint review can inform Phase 5 planning or a future polish phase

## Self-Check: PASSED

All 8 files found. Both commit hashes verified (374f809, 9732aa9).

---
*Phase: 04-visualization*
*Completed: 2026-02-20*
