# Phase 5: Instrument Personality - Context

**Gathered:** 2026-02-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Configurability that shapes how the instrument feels — slide character, convergence behavior, pre-press mode, and scale snapping. These are higher-level "personality" settings that map to the low-level SlideConfig parameters already in the engine. The underlying engine mechanics (SlideEngine, SlideTrack) are built; this phase creates the player-facing personality layer on top.

</domain>

<decisions>
## Implementation Decisions

### Slide Character Presets
- 4 presets: **Eerie**, **Bloom**, **Swarm**, **Custom**
- Each preset bundles multiple SlideConfig values (track correlation, movement speed, convergence easing, idle volume, post-arrival mode, idle mode, scale-snap, micro-vibrato, etc.)
- **Eerie**: Slow and creepy — low movement speed, wide pitch range, independent tracks, horror-film pitch bending feel
- **Bloom**: Lush sweeping convergence — Claude decides between parallel sweep (orchestral) or inward focus (cinematic)
- **Swarm**: Chaotic energy — Claude decides track count and erratic behavior parameters
- **Custom** preset activates automatically when any advanced control is tweaked; can also be manually selected
- Each preset has an **intensity slider** that scales how extreme the effect is (subtle to extreme)
- Switching presets sets defaults for ALL personality parameters (post-arrival mode, idle mode, scale-snap, micro-vibrato behavior, etc.); player can override any via advanced controls

### Viz Overlay UI
- **Only preset buttons + intensity slider** float on the visualization canvas
- All other controls (post-arrival mode, idle mode, scale picker, convergence speed, track count, etc.) live in the controls panel as advanced options
- Preset switching behavior (immediate vs next-chord): Claude's discretion

### Post-Arrival Behavior
- **Two modes** (not three — converge-then-restart was cut as too similar to cycle):
  - **Hold**: Tracks arrive at chord notes and stay until chord is released
  - **Cycle**: Tracks arrive, briefly hold, depart, and auto-reconverge to the same chord targets (breathing/pulsing feel)
- Each preset sets a default post-arrival mode; player can override in advanced controls
- Cycle touch duration (how long tracks hold before departing) is preset-dependent and configurable in advanced
- Micro-vibrato when held is preset-dependent: eerie = still (creepy), bloom = warm vibrato, swarm = jittery micro-motion; configurable in advanced
- Mid-performance mode switching behavior: Claude's discretion (avoid audio glitches)

### Pre-Press Idle Mode
- **Three modes**, bundled into presets (not a separate selector on viz):
  - **Silent**: Tracks move visually but produce no sound; orbs are visually diminished (smaller radius, reduced brightness)
  - **Quiet sliding**: Current behavior — tracks drift at low volume (~0.1). Volume level varies per preset
  - **Ambient drone**: Claude designs the drone sound based on what complements the convergence mechanic
- Each preset defines its default idle mode; overridable in advanced controls

### Scale-Snapped Glissando
- **Magnetic snap** feel: continuous glide that gravitates toward scale degrees, spending more time on in-scale pitches (not discrete jumps)
- Uses a **separate scale picker** that defaults to the active key/mode but can be decoupled and set independently
- Scale picker lives in the advanced controls panel
- Scale-snap on/off is preset-bundled with advanced override
- **Staircase convergence**: when scale-snap is on, convergence to chord targets also steps through scale degrees (harp-like cascading approach), not smooth glide
- Implements the currently-stubbed `pitchMovement: 'scale-snapped'` and `idleRangeType: 'stay-in-scale'` in SlideTrack/SlideEngine

### Claude's Discretion
- Bloom preset: parallel sweep vs inward focus character
- Swarm preset: track count and specific parameter values
- Preset switching timing (immediate vs next chord press)
- Ambient drone sound design
- Mid-performance mode switching behavior
- Intensity slider interpolation math
- Exact UI layout/positioning of overlay elements
- Which advanced controls to expose vs keep internal

</decisions>

<specifics>
## Specific Ideas

- Presets should feel like choosing an instrument personality, not configuring parameters — the name IS the experience
- Silent idle mode: tracks still visibly moving but orbs diminished (smaller, dimmer) — visual anticipation without audio
- Custom preset auto-activating when advanced controls are tweaked ensures the preset buttons always reflect reality
- Scale-snapped convergence should create a harp-like cascading approach to chord targets

</specifics>

<deferred>
## Deferred Ideas

- Hiding/collapsing the advanced controls panel entirely (user mentioned "maybe we'll allow them to be hidden later")
- Additional presets beyond the initial 4

</deferred>

---

*Phase: 05-instrument-personality*
*Context gathered: 2026-02-20*
