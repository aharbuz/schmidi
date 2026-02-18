# Phase 1: Audio Foundation - Context

**Gathered:** 2026-02-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Electron app scaffolded with a correctly architected audio engine — 8 persistent oscillators, anti-click AudioParam patterns, per-voice ADSR envelopes, global waveform selection, and AudioContext autoplay handling via splash screen. Includes minimal test UI for verification. Chord engine, slide mode, visualization, and personality are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Oscillator behavior
- 8 persistent oscillator voices, always running (gain set to 0 when silent)
- Global waveform selector — all voices share one waveform type (sine, square, sawtooth, triangle). Per-voice waveform deferred to future phase
- Subtle detune per voice for analog warmth/thickness
- Both keyboard mapping and on-screen click buttons for triggering voices
- Voice buttons show animated feedback (glow/pulse reflecting envelope stage — attack, sustain, release)
- Keyboard shortcut shown via tooltip on hover

### ADSR & envelope feel
- Per-voice envelope — each voice has its own independent ADSR cycle
- 3-4 envelope presets with technical + evocative names: Pad (Drift), Pluck (Snap), Organ (Breathe), Strings (Bloom)
- ADSR values displayed numerically alongside controls (e.g. "A: 45ms")
- Live envelope curve preview canvas that updates in real-time as parameters are adjusted

### Minimal UI surface
- React + TypeScript with Tailwind CSS
- Waveform selector as icon buttons in a row (one per wave type)
- Audio status bar at bottom showing AudioContext state, sample rate, latency
- Visual reference: Vital synth — dark, glowing accents, clean waveform displays

### Testing & developer tooling
- Storybook for interactive component stories (only for interactive controls — ADSR sliders, voice buttons, waveform selector, volume controls)
- Playwright configured for Electron app testing (full stack, not just renderer)
- Vitest for unit/integration tests
- Pre-commit hook: typecheck + lint (tests run at Claude's discretion during development)
- ESLint + Prettier for linting/formatting
- Electron Forge as build tooling
- Context7 MCP must be used to pull latest docs for Electron, Web Audio API, Electron Forge, Storybook, Playwright before coding

### App shell & launch
- Frameless window with custom title bar
- Resizable with minimum size (~800x500)
- Splash/welcome screen with Schmidi logo, version, tagline, and start button — unlocks AudioContext on click
- Remember window position and size between launches
- macOS primary target, Windows deferred
- Dev tools available but hidden (Cmd+Opt+I)
- Custom app/dock icon, no badge

### Claude's Discretion
- Test pitch assignment for the 8 voices (sensible musical defaults)
- Ramp type per parameter (exponential vs linear) based on Web Audio best practices
- Master gain/compressor approach for mix safety
- Default ADSR values for each preset
- Envelope curve display fidelity (exponential vs simplified)
- Volume control style (slider, fader, or knob)
- Small oscilloscope/waveform display inclusion
- UI layout arrangement (grouped sections)
- Visual tone (dark aesthetic direction)
- Menu bar approach for frameless window

</decisions>

<specifics>
## Specific Ideas

- Visual reference: Vital synth — dark, modern, glowing accents, clean waveform displays
- Envelope presets use dual naming: "Pad (Drift)", "Pluck (Snap)", "Organ (Breathe)", "Strings (Bloom)"
- Voice trigger buttons should show animated envelope stage feedback — not just on/off
- Status bar for AudioContext debugging info (sample rate, state, latency)
- Splash screen as a branding moment — logo, version, tagline before "Click to Start"
- Testability is a first-class concern: Storybook + Playwright (Electron) + Vitest from day one
- Use Context7 MCP to fetch latest documentation before implementation

</specifics>

<deferred>
## Deferred Ideas

- Per-voice waveform selection — future phase if needed
- Windows platform testing — deferred, build should be cross-platform but only verified on macOS
- Custom app icon design — needs to be created, placeholder acceptable for Phase 1

</deferred>

---

*Phase: 01-audio-foundation*
*Context gathered: 2026-02-18*
