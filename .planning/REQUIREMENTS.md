# Requirements: Schmidi

**Defined:** 2026-02-18
**Core Value:** The slide mode — the feeling of chords emerging from converging glissandos rather than being struck, with the behavior visible and configurable in real-time.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Audio Engine

- [x] **AUDIO-01**: User hears sound through polyphonic oscillator engine supporting multiple simultaneous voices
- [x] **AUDIO-02**: User can select oscillator waveform (sine, square, sawtooth, triangle)
- [x] **AUDIO-03**: User can shape amplitude with ADSR envelope (attack, decay, sustain, release controls)
- [x] **AUDIO-04**: Audio feedback is immediate (sub-50ms latency)

### Chord System

- [x] **CHORD-01**: User can select a key (C through B) and mode (major, minor, dorian, phrygian, lydian, mixolydian, aeolian, locrian)
- [x] **CHORD-02**: App generates diatonic chord grid from selected key + mode
- [x] **CHORD-03**: User can click/hold chord buttons to play chords directly (synth mode)

### Slide Mode

- [x] **SLIDE-01**: User can toggle between synth mode and slide mode
- [x] **SLIDE-02**: In slide mode, multiple synth tracks continuously glide through pitch space toward chord target notes
- [x] **SLIDE-03**: Track volume swells as pitch approaches chord target note and fades as it moves away (proximity-based amplitude)
- [x] **SLIDE-04**: User can configure number of sliding tracks (default 2)
- [x] **SLIDE-05**: One "solid" anchor track plays chord cleanly without slide behavior alongside sliding tracks
- [ ] **SLIDE-06**: User can configure slide character: eerie convergence (independent wandering) vs smooth bloom (lush sweeping)
- [ ] **SLIDE-07**: User can configure convergence behavior: converge-then-restart, converge-and-hold, or continuous cycle
- [ ] **SLIDE-08**: User can configure pre-press behavior: silent until pressed, always sliding quietly, or ambient drone
- [ ] **SLIDE-09**: User can toggle scale-snapped glissando (slides step through diatonic scale degrees instead of continuous pitch)

### Visualization

- [ ] **VIZ-01**: Radial convergence view: tracks visualized as orbs/lines spiraling toward center as they converge on chord notes (60fps)
- [ ] **VIZ-02**: Waveform trace view: colored waveform traces morph and align as pitches converge
- [ ] **VIZ-03**: User can switch between radial convergence and waveform trace visualization modes
- [ ] **VIZ-04**: Visualization is the primary instrument UI, not a secondary display

### Controls

- [x] **CTRL-01**: Per-track volume sliders for each sliding track and the anchor track
- [x] **CTRL-02**: Master volume control

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Chord System

- **CHORD-04**: Preset chord progressions available (I-IV-V-I, ii-V-I, I-V-vi-IV) in selectable keys

### Slide Mode

- **SLIDE-10**: Auto-calculated track count based on swell timing, scale snapping, and note range bounds

### Audio Engine

- **AUDIO-05**: Optional reverb post-processing (single ConvolverNode) if it enhances convergence effect

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| MIDI input/output | Adds significant integration surface; Schmidi's value is in its UI, not as a MIDI device |
| Audio recording/export | Distracts from instrument feel; use system-level audio capture (BlackHole, Loopback) |
| VST/AU plugin format | Completely different build pipeline; incompatible with Web Audio API |
| Effects chain (reverb, delay, filter) | Could mask the convergence effect; single reverb may be added in v2 only if it helps |
| Sequencer/arpeggiator | Shifts from real-time expressive play to pattern programming; the slide cycle IS the rhythm |
| Mobile/touch support | Electron desktop only; touch interaction would need redesigned UI |
| 2000+ preset scales | Schmidi's value is in slide-convergence, not scale variety; 8 modes is sufficient |
| Per-track independent ADSR | Multiplies UI complexity; convergence implies shared envelope behavior |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUDIO-01 | Phase 1 | Complete |
| AUDIO-02 | Phase 1 | Complete |
| AUDIO-03 | Phase 1 | Complete |
| AUDIO-04 | Phase 1 | Complete |
| CHORD-01 | Phase 2 | Complete |
| CHORD-02 | Phase 2 | Complete |
| CHORD-03 | Phase 2 | Complete |
| CTRL-01 | Phase 2 | Complete |
| CTRL-02 | Phase 2 | Complete |
| SLIDE-01 | Phase 3 | Complete |
| SLIDE-02 | Phase 3 | Complete |
| SLIDE-03 | Phase 3 | Complete |
| SLIDE-04 | Phase 3 | Complete |
| SLIDE-05 | Phase 3 | Complete |
| VIZ-01 | Phase 4 | Pending |
| VIZ-02 | Phase 4 | Pending |
| VIZ-03 | Phase 4 | Pending |
| VIZ-04 | Phase 4 | Pending |
| SLIDE-06 | Phase 5 | Pending |
| SLIDE-07 | Phase 5 | Pending |
| SLIDE-08 | Phase 5 | Pending |
| SLIDE-09 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 22 total
- Mapped to phases: 22
- Unmapped: 0

---
*Requirements defined: 2026-02-18*
*Last updated: 2026-02-18 after roadmap creation*
