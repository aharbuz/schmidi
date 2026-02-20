# Phase 3: Convergence Engine + Slide Mode - Context

**Gathered:** 2026-02-18
**Status:** Ready for planning

<domain>
## Phase Boundary

N persistent pitch tracks glide continuously through pitch space and converge simultaneously on chord target notes when a chord is pressed, with volume swelling on approach and fading on departure. Visualization, scale snapping, and per-track personality are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Track model — core architecture

Two track models implemented in Phase 3, toggleable:

- **Model A: Heat-seekers** — N persistent tracks always exist, always in motion. When a chord is pressed, each track hard-redirects immediately toward its assigned chord note (closest-wins distance optimization). Tracks hold on arrival, depart on chord release or after configurable hold time (whichever first).
- **Model C: Spawn-overflow hybrid** — Same persistent tracks as Model A, but when a chord is pressed while tracks are mid-convergence, NEW tracks spawn to handle the new chord while existing tracks finish their current journey. Spawned tracks hold their arrived note until chord release, then use departure fade (same as heat-seekers). Spawned track starting position is configurable.

Model B (pure spawn-and-die) is deferred to a later phase.

### Note assignment

Distance-optimized: each convergence event, tracks dynamically take the chord note closest to their current pitch. No fixed track-to-role identity.

### Convergence timing

All configurable:
- Convergence duration (fixed time OR distance-proportional — all tracks arrive simultaneously)
- Easing curve (linear / ease-in / ease-out)
- Mid-convergence behavior when new chord pressed: interrupt-and-retarget (heat-seeker default), finish-then-retarget, or spawn-overflow (Model C)
- Convergence speed range: all the way to instant (0ms = behaves like normal chord synth)

### Idle behavior — all options configurable, prune after hearing

All the following are configurable options (not defaults — user selects):
- **Idle movement mode:** stationary / slow drift / always moving
- **Idle range type:** free roam / orbit a home pitch / stay in scale
- **Track starting position:** root note of selected key / random / last known position
- **Track correlation:** fully independent / loosely correlated / in unison
- **Pitch range boundary:** bounded to musical window / bounded to key's octave / unconstrained
- **Edge behavior when hitting boundary:** reflect / wrap around / smooth curve back
- **Movement speed:** configurable range + organic variation
- **Pitch movement:** continuous glide OR scale-snapped (configurable)
- **Mode toggle behavior:** resume from last position OR reset to home (configurable)
- **Track range partitioning:** tracks independent regardless of count OR partition range (configurable)
- **Track interaction:** no interaction / avoid clustering (configurable)
- **Idle tone:** musical / textural (achieved via range/snap settings)

**All idle controls must have tooltips explaining what each option does.**

### Slide mode

- Separate mode — replaces chord grid. User toggles between Synth mode (Phase 2) and Slide mode.
- Monophonic chord targeting in Phase 3 (one chord target at a time). Multi-chord behavior deferred.

### Anchor voice

An optional anchor voice (solid chord sound, from Phase 2 engine) plays under the sliding tracks. User can toggle it on/off. Also configurable whether the anchor fires on chord press.

### Track count

- Default N is configurable with a sensible default (Claude decides appropriate default).
- Track count can be changed mid-session.
- For the spawn-overflow model, track count calculation accounts for convergence jitter window (Claude decides implementation of jitter math to ensure simultaneous arrival).

### Volume envelope

- **Driver:** proximity-based — volume = function of distance to target note
- **Swell curve:** configurable (linear / exponential / user-shaped)
- **Anticipatory swell:** yes — volume begins rising before the track crosses the final proximity threshold (anticipates arrival)
- **Swell start:** immediately on chord press (not deferred until trajectory is set)
- **Base/floor volume (when far from target):** configurable
- **Held volume (at target):** configurable
- **Departure fade time:** configurable
- **Idle volume:** no phantom target — tracks play at floor volume when no chord is pressed (idle volume target configurable independently)
- **Global behavior:** all tracks share the same envelope settings (per-track volume envelope deferred)
- **Master limiting:** automatic limiting at master level prevents overdriving when all tracks swell simultaneously

### After convergence

- **Post-arrival behavior:** tracks hold at arrived note for a configurable duration (can be set to hold indefinitely). Depart on chord release OR after hold time — whichever is first.
- **Departure direction:** configurable (random / inverse of approach / other)
- **Departure starting point:** Claude decides (from arrived note or previous position)
- **Landing bounce:** configurable — clean arrival OR organic overshoot-and-settle
- **Micro-motion when held:** configurable — static held tones OR subtle vibrato/oscillation around target pitch
- **Auto-cycle:** configurable — tracks can auto-restart wandering while chord is held, ready for next press, or wait for release
- **Hold mechanism:** Claude decides cleanest approach (ADSR sustain or separate mechanism)
- **First activation with no prior chord:** Claude decides sensible default (e.g. root note as phantom target or floor volume)

### ADSR and controls in slide mode

Claude decides architecture — whether existing Phase 2 ADSR controls apply to sliding tracks or slide mode has its own controls.

</decisions>

<specifics>
## Specific Ideas

- "It's going to be mad" — user wants to explore the full configuration space before pruning. Build all options, observe, then remove what doesn't work.
- The instrument will have a lot of knobs. Tooltips on all slide mode controls are a requirement, not nice-to-have.
- The "heat-seeker" mental model is the canonical one. Tracks are always alive, always moving, always lockable onto a target.
- Convergence can go all the way to instant (0ms) — at that point it degrades gracefully into normal synth behavior.

</specifics>

<deferred>
## Deferred Ideas

- **Model B (pure spawn-and-die):** Fresh tracks spawn from a start position per chord press and die after arrival. Could be its own toggle once A and C are working.
- **Multi-chord simultaneous targeting:** pressing multiple chord buttons at once, splitting tracks across multiple chords — deferred from Phase 3.
- **Per-track volume envelope:** individual tracks having different swell/fade settings — all tracks share one envelope for Phase 3.
- **Visualization:** radial convergence view, waveform trace view — Phase 4.
- **Scale snapping and slide character:** eerie vs. smooth bloom, pre-press modes, diatonic glissando — Phase 5.

</deferred>

---

*Phase: 03-convergence-engine-slide-mode*
*Context gathered: 2026-02-18*
