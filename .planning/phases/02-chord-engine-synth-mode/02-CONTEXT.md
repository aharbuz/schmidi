# Phase 2: Chord Engine + Synth Mode - Context

**Gathered:** 2026-02-18
**Status:** Ready for planning

<domain>
## Phase Boundary

A fully playable chord instrument: select any key and mode, get a diatonic chord grid, click/hold chords and hear them with correct envelopes and volume controls. Creating slide mode, visualization, and instrument personality are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Chord grid layout
- Circle/arc arrangement for the 7 diatonic chords — hints at harmonic relationships
- Labels: Roman numeral primary (I, ii, iii, IV, V, vi, vii°), note name secondary (smaller text underneath)
- Color-coded by harmonic function: tonic group (I, iii, vi), subdominant group (ii, IV), dominant group (V, vii°) — each group has its own color family
- Size variation: tonic chord (I) is larger/more prominent than the others
- Active chord state: button scales up slightly when pressed — tactile feel

### Chord triggering
- Hold-to-play: chord sounds while mouse button or key is held, releases on lift (organ-style)
- Keyboard mapping: home row keys (A S D F G H J) map to the 7 diatonic chords
- Key labels always visible on each chord button + button highlights on key press
- Polychordal: multiple chords can sound simultaneously (hold multiple keys)
- Soft voice limit with voice stealing — oldest voices released when limit exceeded
- Chord-to-chord transitions: overlap allowed (old chord fades via release while new chord attacks — legato transitions)
- Release behavior: ADSR envelope release — notes fade out musically, no instant cut
- No individual note display on chord buttons — just chord name, keep it clean

### Key/mode selector
- Key selection: circular selector (circle of fifths or chromatic wheel — visual, musical)
- Mode selection: Claude's discretion — pick what pairs well with the circular key selector
- Live key/mode switching: if a chord is sounding, its notes retune immediately to the new key/mode
- Placement: Claude's discretion — place where it integrates best with the arc layout

### Volume & mixing
- Master volume: vertical slider (traditional fader)
- Per-track volume: expandable panel — hidden by default, expand to reveal individual track sliders (cleaner main view)
- Level meter: Claude's discretion — decide based on what Phase 1 plan 05 already covers for monitoring
- Placement: Claude's discretion — integrate where it works best with the arc + selectors

### Claude's Discretion
- Mode selector control type (dropdown, segmented, radial — whatever complements the circular key selector)
- Key/mode selector placement relative to chord arc
- Volume/mixing controls placement
- Level meter inclusion (may already be covered by Phase 1 plan 05 monitoring)
- Voice stealing threshold (how many simultaneous voices before stealing kicks in)

</decisions>

<specifics>
## Specific Ideas

- Chord arc layout should feel like a musical instrument face, not a settings panel — the arc IS the instrument
- Color-coded harmonic function groups give the arc visual structure without text clutter
- Tonic chord being physically larger creates a natural visual anchor in the arc
- Overlap/legato transitions are important — chord changes should feel fluid, not choppy
- Home row keyboard mapping should make it feel playable like a real instrument

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-chord-engine-synth-mode*
*Context gathered: 2026-02-18*
