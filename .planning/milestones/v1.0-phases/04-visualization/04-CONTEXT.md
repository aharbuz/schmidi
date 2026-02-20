# Phase 4: Visualization - Context

**Gathered:** 2026-02-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Real-time canvas visualizations of sliding tracks — radial convergence view and waveform trace view — as the primary instrument face. The visualization IS the UI, not a secondary meter. Includes restyling the entire app to match the visualization aesthetic. Does not include new audio features, new controls, or new modes.

</domain>

<decisions>
## Implementation Decisions

### Radial view style
- Claude's choice on visual element type (orbs, particles, lines, or hybrid) — pick what best shows the convergence effect
- Each track gets a distinct hue (e.g. track 1 = cyan, track 2 = magenta) with proximity-mapped brightness/intensity — color shifts warm/bright as track approaches target, cools/dims as it drifts
- Claude's choice on background aesthetic — dark void, subtle gradient, or hybrid
- Clean canvas with no reference geometry — no pitch rings, no target markers, just the moving track elements

### Waveform trace style
- Claude's choice on waveform visualization type (oscilloscope traces, flowing ribbons, or other) — pick what best shows convergence
- Same color scheme as radial view — per-track hues with proximity-based brightness, consistent identity across both views
- ~10 second time window showing the full arc of convergence (drift to arrival)
- Abstract presentation — no pitch labels or note names on axes

### Canvas vs controls layout
- Claude's choice on layout approach (full canvas + overlay, canvas top / controls bottom, or sidebar) — make the visualization feel primary
- Full-viz toggle mode via hotkey or button — hides all controls for a performance/display view
- Claude's choice on whether keyboard chord shortcuts remain active in full-viz mode
- View-mode switch (radial vs waveform) lives on the canvas itself — small toggle or icon, contextual to the visualization
- Restyle the entire app to match the visualization aesthetic — title bar, background, all controls get the dark/glow treatment. The whole app becomes the instrument
- Claude's choice on whether chord arc overlays the canvas or sits in a separate zone
- Landscape (~16:9) target window aspect ratio

### Convergence payoff moment
- Bloom / flash at the moment tracks converge on chord notes — dramatic, satisfying visual chord strike
- Flash then fade — brief bloom at moment of arrival, then settles to steady glow while chord is held
- Bloom color is a blend of the converging tracks' hues — the chord's visual identity emerges from its voices
- Claude's choice on waveform view payoff — pick what's appropriate for the waveform medium

### Claude's Discretion
- Radial view element type (orbs, particles, lines, hybrid)
- Background aesthetic for both views
- Waveform visualization type
- Overall layout approach (overlay vs split vs sidebar)
- Whether keyboard shortcuts stay active in full-viz mode
- Chord arc placement (overlay vs separate zone)
- Waveform view convergence payoff style
- Exact animation timing, easing curves, frame budgeting
- Canvas rendering technology (Canvas 2D vs WebGL)

</decisions>

<specifics>
## Specific Ideas

- Track colors shift warm/bright on approach, cool/dim on drift — proximity is the visual language
- Convergence bloom blends the track hues — the chord's color emerges from its voices, like the audio emerges from the glissandos
- The app should feel like an instrument when the visualization is running — dark, glowing, immersive
- Full-viz toggle for performance context — just the visual and the sound

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-visualization*
*Context gathered: 2026-02-20*
