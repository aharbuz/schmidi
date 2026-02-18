---
phase: 01-audio-foundation
plan: 01
subsystem: infra
tags: [electron, electron-forge, vite, react, typescript, tailwind, eslint, prettier]

# Dependency graph
requires: []
provides:
  - Electron Forge + Vite project scaffold with React 19 renderer
  - Frameless window with window state persistence
  - Autoplay policy configured for Web Audio API
  - contextBridge preload with schmidiAPI IPC surface
  - Pre-commit hook enforcing typecheck + lint
  - ESLint flat config + Prettier formatting
  - Tailwind CSS v4 via PostCSS
affects: [01-02, 01-03, 01-04, 01-05]

# Tech tracking
tech-stack:
  added: [electron@40.4.1, electron-forge@7.11.1, react@19, typescript@5, tailwindcss@4, zustand@5, electron-window-state@5, eslint@10, prettier@3]
  patterns: [electron-forge-vite-plugin, frameless-window, contextBridge-ipc, postcss-tailwind]

key-files:
  created:
    - package.json
    - forge.config.ts
    - tsconfig.json
    - vite.main.config.ts
    - vite.preload.config.ts
    - vite.renderer.config.ts
    - postcss.config.cjs
    - eslint.config.mjs
    - .prettierrc
    - .gitignore
    - index.html
    - src/main/main.ts
    - src/main/preload.ts
    - src/renderer/main.tsx
    - src/renderer/App.tsx
    - src/renderer/index.css
    - src/renderer/index.html
    - src/shared/types.ts
    - forge.env.d.ts
  modified: []

key-decisions:
  - "Used @tailwindcss/postcss instead of @tailwindcss/vite -- Forge Vite plugin bundles configs with esbuild CJS which cannot load ESM-only Vite plugins"
  - "Pinned @electron-forge/plugin-vite to exact 7.11.1 per research pitfall #4 (experimental API stability)"
  - "Used ESLint v10 flat config (eslint.config.mjs) instead of legacy .eslintrc format"

patterns-established:
  - "src/main + src/renderer + src/shared directory structure for Electron process separation"
  - "Frameless window with titleBarStyle hidden and traffic lights at (12,12)"
  - "contextBridge preload pattern with schmidiAPI namespace"
  - "Pre-commit hook: npx tsc --noEmit && npx eslint src/ --max-warnings=0"

requirements-completed: [AUDIO-04]

# Metrics
duration: 15min
completed: 2026-02-18
---

# Phase 1 Plan 01: Electron App Scaffold Summary

**Electron Forge + Vite + React 19 project with frameless window, window state persistence, autoplay policy, and pre-commit typecheck/lint hook**

## Performance

- **Duration:** 15 min
- **Started:** 2026-02-18T12:25:54Z
- **Completed:** 2026-02-18T12:41:29Z
- **Tasks:** 2
- **Files modified:** 20

## Accomplishments
- Electron Forge app scaffolded with Vite plugin, React 19, TypeScript 5 strict mode, and Tailwind CSS v4
- Main process configured with frameless window, window state persistence, autoplay policy, and native macOS menu
- contextBridge preload exposing schmidiAPI with platform info and app version IPC
- Pre-commit hook enforcing typecheck + lint on every commit
- ESLint flat config + Prettier formatting rules established

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Electron Forge project** - `5c8ecff` (feat)
2. **Task 2: Configure main process + preload + pre-commit hook** - `9c2b5c2` (feat)

## Files Created/Modified
- `package.json` - Project config with Electron Forge, React, TypeScript, Tailwind, ESLint, Prettier
- `forge.config.ts` - Electron Forge config with Vite plugin pointing to src/main paths
- `tsconfig.json` - TypeScript strict mode, react-jsx, bundler module resolution
- `vite.renderer.config.ts` - Renderer Vite config (Tailwind via PostCSS auto-detection)
- `postcss.config.cjs` - PostCSS config with @tailwindcss/postcss plugin
- `eslint.config.mjs` - ESLint flat config with TypeScript + Prettier rules
- `.prettierrc` - Prettier config: singleQuote, semi, printWidth 100
- `.gitignore` - Standard ignores: node_modules, out, .vite, dist, .env, do-work
- `index.html` - Root HTML entry for Vite/Forge renderer
- `src/main/main.ts` - Electron main process: frameless window, window state, autoplay, menu, dev tools shortcut
- `src/main/preload.ts` - contextBridge preload exposing schmidiAPI (platform, getAppVersion)
- `src/renderer/main.tsx` - React entry point rendering App component
- `src/renderer/App.tsx` - Placeholder App component with dark theme styling
- `src/renderer/index.css` - Tailwind v4 import
- `src/shared/types.ts` - SchmidiAPI type definition and Window augmentation
- `forge.env.d.ts` - Forge Vite environment type reference

## Decisions Made
- **Tailwind via PostCSS instead of Vite plugin:** The `@tailwindcss/vite` package is ESM-only, but Electron Forge's Vite plugin bundles config files using esbuild with CJS output, which cannot load ESM-only imports. Switched to `@tailwindcss/postcss` which provides a CJS entry point and is auto-detected by Vite via `postcss.config.cjs`.
- **ESLint v10 flat config:** Used modern flat config format (`eslint.config.mjs`) instead of the deprecated `.eslintrc.json` that the Forge template generates.
- **Pinned plugin-vite version:** Exact version `7.11.1` (no caret) per research pitfall #4 about experimental API stability.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Tailwind Vite plugin ESM incompatibility with Forge**
- **Found during:** Task 1 (scaffold verification)
- **Issue:** `@tailwindcss/vite` is ESM-only. Forge's Vite plugin uses esbuild to bundle config files as CJS, which cannot `require()` ESM modules. App failed to start with "ESM file cannot be loaded by require" error.
- **Fix:** Replaced `@tailwindcss/vite` plugin with `@tailwindcss/postcss` PostCSS plugin. Created `postcss.config.cjs` for auto-detection by Vite. Removed unused `@tailwindcss/vite` dependency.
- **Files modified:** `vite.renderer.config.ts`, `postcss.config.cjs`, `package.json`
- **Verification:** App launches successfully with Tailwind CSS processing working
- **Committed in:** `5c8ecff` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential fix for app to build. No scope creep. Tailwind CSS works identically via PostCSS.

## Issues Encountered
None beyond the Tailwind Vite plugin ESM issue documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Electron app scaffold complete with all tooling configured
- Ready for 01-02: Audio engine core (Voice, VoiceManager, masterBus, ADSR, Vitest)
- The `src/renderer/App.tsx` placeholder will be replaced by the app shell UI in 01-03

## Self-Check: PASSED

All 18 created files verified on disk. Both task commits (5c8ecff, 9c2b5c2) verified in git log.

---
*Phase: 01-audio-foundation*
*Completed: 2026-02-18*
