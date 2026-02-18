# Pitfalls Research

**Domain:** Electron + Web Audio API synthesizer with real-time visualization (Schmidi)
**Researched:** 2026-02-18
**Confidence:** MEDIUM-HIGH (Web Audio specifics verified against MDN/spec; Electron audio specifics partially LOW from WebSearch only)

---

## Critical Pitfalls

### Pitfall 1: Cannot Read Back Real-Time AudioParam Value Mid-Ramp

**What goes wrong:**
In slide mode, tracks continuously glide through pitch space. When a new chord target is set, each track's frequency ramp must be cancelled and re-aimed. The natural approach is to read `oscillator.frequency.value` to get the current pitch, then schedule a new ramp from that value. This silently fails: `AudioParam.value` returns the _last value you assigned in JavaScript_, not the actual real-time automation value during an in-progress ramp.

**Why it happens:**
The Web Audio spec separates the JavaScript-visible `.value` property from the audio-thread's internal automation timeline. There is no API to read back the true real-time parameter value mid-automation. This is a known spec-level gap (WebAudio/web-audio-api issue #344, #503).

**How to avoid:**
Track pitch state manually in JavaScript using the same timing arithmetic the audio thread uses. Store each ramp's `(startValue, endValue, startTime, endTime)` and compute the expected current value via linear interpolation when you need to re-schedule. Never trust `oscillator.frequency.value` during an active automation sequence. Also use `cancelAndHoldAtTime()` (available in Chromium/Electron since ~2019) rather than `cancelScheduledValues()`, which snaps to an unpredictable value when called during a ramp.

**Warning signs:**
- Pitch jumps or snaps occur when switching chord targets mid-glide
- Tracks snap to 0 Hz or their initial value on ramp interruption
- Sounds suddenly drop out or produce audible discontinuities when user clicks a chord while slide is active

**Phase to address:**
Slide mode core implementation phase — design the pitch-state tracking data structure before writing any ramp scheduling code.

---

### Pitfall 2: Oscillator Single-Use Constraint Causes Architecture Lock-In

**What goes wrong:**
`OscillatorNode` and `AudioBufferSourceNode` can only have `.start()` called once. After `.stop()`, the node is dead and cannot be restarted. Slide mode keeps tracks alive continuously and morphing. If the architecture creates new oscillators for each note event (the naïve web-audio pattern) rather than running persistent oscillators, you get: (a) accumulating dangling nodes, (b) discontinuities at every restart, (c) timing gaps when creating and wiring a new oscillator mid-ramp.

**Why it happens:**
Web Audio tutorials teach the "throw away and recreate" pattern because it works well for discrete note events. Slide mode requires _persistent voices_ — the opposite paradigm. Developers carry the tutorial pattern into continuous contexts without realizing the mismatch.

**How to avoid:**
Create one oscillator per slide track at startup and never stop it during normal operation. Control presence/absence via a GainNode gating the oscillator's output (gain 0 = silent, non-zero = audible). Only disconnect/stop oscillators on full app teardown or explicit voice removal. Keep the oscillator graph alive; modulate its frequency and gain continuously.

**Warning signs:**
- Any code that calls `oscillator.stop()` followed by creating a new oscillator for slide track continuation
- "Cannot call start twice" errors in the console
- Gaps or clicks when the chord changes, caused by the create-and-connect delay

**Phase to address:**
Audio engine architecture phase — the persistent-oscillator pattern must be the foundation, not retrofitted.

---

### Pitfall 3: AudioContext Suspended on App Launch (Autoplay Policy)

**What goes wrong:**
Creating an `AudioContext` before a user gesture initialises it in `suspended` state, even in Electron. Audio does not play. The app appears to work (no errors thrown on most operations) but produces no sound.

**Why it happens:**
Electron wraps Chromium, which enforces Web Audio autoplay policy. While Electron _can_ bypass this via `appendSwitch('autoplay-policy', 'no-user-gesture-required')` in the main process before window creation, many projects skip this or create the AudioContext at module load time and check state too late.

**How to avoid:**
Either add `app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')` in `main.js` before any `BrowserWindow` is created (preferred for a desktop synth app where autoplay restriction is nonsensical), or always check `audioContext.state === 'suspended'` and call `audioContext.resume()` on first user interaction. Do not assume the context is running just because no error was thrown.

**Warning signs:**
- App launches, UI renders, buttons respond, but no audio output
- `audioContext.state` is `'suspended'` after context creation
- Silence only on first launch or after window loses then regains focus

**Phase to address:**
Initial Electron + Web Audio integration phase — verify context state as the first integration test.

---

### Pitfall 4: Click and Pop Artifacts from Abrupt Gain/Frequency Changes

**What goes wrong:**
Any abrupt change to an AudioParam — setting `gain.value = 0` directly, calling `oscillator.stop()` mid-wave, or even scheduling a ramp that starts from zero without an initial `setValueAtTime` — produces an audible click. In slide mode, which has constantly evolving gain envelopes tied to pitch proximity, clicks occur on every chord change if transitions are not carefully shaped.

**Why it happens:**
A click is a waveform discontinuity: the audio signal jumps from a non-zero value to a different value in a single sample, which the ear hears as a transient. The Web Audio thread cannot "slow down" to wait for JavaScript to figure out the next value, so any unsynchronised assignment produces a step function in the output signal.

**How to avoid:**
- Never assign directly to `gain.value` or `frequency.value` on a live oscillator when precision matters; always use scheduling methods.
- For gain-to-zero: use `gain.setTargetAtTime(0.0001, audioContext.currentTime, 0.015)` (15ms time constant) rather than hard-setting to 0. The `exponentialRampToValueAtTime` also works but cannot target exactly 0.0 (use 0.0001 as the floor).
- For starting envelopes: always call `setValueAtTime(currentValue, now)` immediately before any ramp call to anchor the automation queue.
- Use `cancelAndHoldAtTime(audioContext.currentTime)` before re-scheduling ramps to preserve the current live value rather than snapping.

**Warning signs:**
- Audible ticking or crackling on chord changes
- Click sounds when the app loads or when slide tracks start/stop
- "Zipper noise" when volume responds to pitch proximity — usually means gain is being set with direct `.value` assignment in the animation loop

**Phase to address:**
Slide mode gain envelope implementation — design the anti-click envelope strategy before any volume automation code is written.

---

### Pitfall 5: JavaScript Timer Drift Breaks Convergence Timing

**What goes wrong:**
Schmidi's slide mode requires multiple tracks to _converge at chord notes at the same time_. If convergence timing is calculated using `Date.now()` or `performance.now()` and then passed to `linearRampToValueAtTime`, the scheduled arrival time will be correct in the audio domain. However, if JS `setInterval`/`setTimeout` is used to _trigger_ ramp scheduling or to update visual state, timer drift (tens of milliseconds, sometimes more during GC or layout) causes the visual convergence indicator to disagree with the audio convergence.

**Why it happens:**
`setTimeout`/`setInterval` run on the main thread and can be delayed by layout, paint, garbage collection, or any other synchronous work. The Web Audio clock (`audioContext.currentTime`) runs on a dedicated audio thread and is accurate to the sample. These two clocks diverge under load. Using JS timers to drive audio scheduling — rather than the audio clock — is the root cause.

**How to avoid:**
- Schedule all audio ramp endpoints using `audioContext.currentTime` math exclusively. Never compute "arrive in X milliseconds using Date.now() + X" for audio scheduling; compute `audioContext.currentTime + duration_in_seconds`.
- For the visual layer: read `audioContext.currentTime` inside the `requestAnimationFrame` callback to compute interpolated track positions, rather than maintaining a separate timer-tracked state. This keeps audio and visuals anchored to the same clock.
- If you need a lookahead scheduler pattern (for dynamic rescheduling), use `setTimeout` only as a heartbeat to call the scheduler, not to determine timing values — all timing values come from `audioContext.currentTime`.

**Warning signs:**
- Visual convergence indicator shows tracks arriving at chord notes but no audio change, or vice versa
- Convergence timing is accurate at app launch but drifts over time or under load
- Tests show correct timing in an idle browser tab but incorrect timing when the tab is busy

**Phase to address:**
Convergence calculation and scheduling design — establish the "single clock source" principle before writing the slide-mode scheduler.

---

### Pitfall 6: Excessive AudioParam Automation Events Cause Non-Gecko CPU Overhead

**What goes wrong:**
Each call to `setValueAtTime`, `linearRampToValueAtTime`, or `setTargetAtTime` appends an event to the AudioParam's internal event list. Chromium (and therefore Electron) performs a linear scan of this list on every rendering quantum (~2.67ms at 48kHz). For slide mode with, say, 8–16 continuously gliding tracks, each track scheduling frequent gain and frequency events can accumulate thousands of events in the queue, causing measurable CPU spikes.

**Why it happens:**
Slide mode's volume envelope tied to pitch proximity may naively be implemented by scheduling a new gain ramp on every animation frame (60 times per second per track). At 8 tracks, that is 480 gain automation events per second accumulating without cleanup.

**How to avoid:**
- Call `cancelScheduledValues` (or `cancelAndHoldAtTime`) before re-scheduling any ramp on a given AudioParam. This purges future events from the queue and keeps the list short.
- Avoid scheduling gain updates more frequently than necessary. Calculate gain at a coarser cadence (e.g., 10–15 times per second from a scheduler) rather than every rAF tick. Visual interpolation can still run at 60fps using the last scheduled values.
- Profile using Chrome DevTools Performance tab with the "Enable audio rendering thread" checkbox to verify audio thread CPU usage.

**Warning signs:**
- CPU usage increases progressively over time while slide mode runs
- Audio glitches or dropouts appear after the app has been running for several minutes
- Chrome DevTools timeline shows the audio thread spending increasing time in "AudioParam event processing"

**Phase to address:**
Slide mode optimization and audio engine robustness phase.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Direct `gain.value = x` assignment in rAF loop | Simple visual-driven gain | Zipper noise / click artifacts under any load | Never for live audio parameters |
| Create new oscillator per chord change | Familiar tutorial pattern; easy to reason about | Gaps, GC pressure, click artifacts, single-use constraint violation | Never for slide mode; acceptable for traditional mode's discrete notes |
| Use `Date.now()` for scheduling math | Intuitive | Timer drift breaks convergence; audio and visual drift apart | Never for scheduling endpoints; acceptable for coarse heartbeat |
| Single GainNode for all tracks mixed | Fewer nodes | Clipping when multiple tracks are near full volume simultaneously | Never; use per-track gain nodes before a master compressor |
| Skip `cancelAndHoldAtTime` before re-scheduling | Fewer API calls | Sudden value snaps when interrupting ramps | Never during active slide mode |
| Inline everything in the renderer process | No IPC code | Audio logic becomes coupled to UI, hard to test, hard to optimize | Acceptable for MVP; extract if audio logic grows complex |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Electron + Chromium autoplay | Assuming desktop == no restrictions | Add `autoplay-policy: no-user-gesture-required` in `main.js` before window creation, or call `audioContext.resume()` on first click |
| Electron contextBridge | Passing raw `ipcRenderer` over the bridge (results in empty object on renderer side) | Expose only parameterized, named functions via `contextBridge.exposeInMainWorld` |
| Electron + Node.js in renderer | Using `nodeIntegration: true` for convenience | Keep `nodeIntegration: false`, `contextIsolation: true`; all Node access via preload bridge |
| Canvas + Web Audio timing | Using rAF timestamp to drive audio scheduling | Use `audioContext.currentTime` inside rAF for all audio-time calculations; rAF timestamp is for display only |
| AudioParam and `exponentialRampToValueAtTime` | Ramping to exactly 0 | Target `0.0001` instead; true zero is mathematically impossible with exponential math |
| Multiple oscillators summing | No master gain reduction | Wire all voices through per-voice GainNodes into a single master GainNode (typically 0.7 / N voices) and a `DynamicsCompressorNode` before destination |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Scheduling gain ramps at 60fps per track | Progressive CPU increase, eventual audio dropout | Decouple gain calculation cadence from visual frame rate; schedule at 10–15Hz, interpolate visually | With 8+ tracks after a few minutes of slide mode |
| Rebuilding the audio graph on every chord change | GC pauses causing audio glitches | Create the audio graph once at startup; only change AudioParam values | Any time the graph is dynamic, especially under GC |
| `requestAnimationFrame` used to drive audio event timing | Convergence timing drifts under load | Use `audioContext.currentTime` as the single source of timing truth | When main thread is busy (UI interaction, window resize, GC) |
| Canvas full-page clear-and-redraw per frame without dirty regions | GPU overdraw causes frame drops; audio thread competes for CPU | Use layered canvases (static background separate from animated tracks); only clear/redraw changed regions | With 8+ track lines on a large canvas at 60fps |
| Accumulating stopped oscillators without disconnecting | Memory grows over time; GC stalls cause audio pops | Always call `oscillator.disconnect()` after `oscillator.stop()`; or use persistent-oscillator pattern and never stop | Traditional mode if many chord presses accumulate over a session |
| Running audio processing logic in the main thread via ScriptProcessorNode | Main thread blocking causes audio glitches | Use `AudioWorklet` for any custom DSP; keep all oscillator graph manipulation lightweight | Even small amounts of JS in a ScriptProcessorNode under load |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No audio on launch with no explanation | User thinks app is broken | Detect `audioContext.state === 'suspended'` and show a prominent "Click to activate audio" affordance if auto-resume fails |
| Convergence timing that feels random | Slide mode feels chaotic, not musical | Calculate convergence so all tracks arrive at chord notes simultaneously from their respective current positions, not based on a fixed ramp time |
| Abrupt volume swells that don't feel tied to pitch proximity | Mechanical, unmusical feel | Shape volume as a function of frequency distance; exponential curve feels more natural than linear (the ear perceives volume logarithmically) |
| Tracks that are never audible even near chord notes | User can't perceive the slide behavior | Ensure even the quietest track (farthest from a chord note) has a minimum non-zero gain floor; otherwise slide mode feels like silence with occasional chords |
| Visualization that is decoupled from audio timing | Visual and audio disagree — trust is broken | Drive visualization position from `audioContext.currentTime` + stored ramp math, not from separate JS state |
| Mode switch from traditional to slide that resets state abruptly | Jarring discontinuity | Cross-fade or gracefully transition oscillator states when switching modes |

---

## "Looks Done But Isn't" Checklist

- [ ] **Slide mode ramp interruption:** Test clicking a new chord _while tracks are mid-glide_. Verify no pitch snap, no click, and tracks glide from their current position — not from their last JavaScript-assigned value.
- [ ] **AudioContext state:** Test launching the app without touching anything. Verify `audioContext.state === 'running'` before any sound is expected, and that sound plays on first button click without a manual "resume" step.
- [ ] **Convergence timing under load:** Play slide mode continuously for 5 minutes while scrolling, resizing the window, and switching focus. Verify convergence timing remains consistent.
- [ ] **Gain headroom:** Play all tracks at maximum volume simultaneously (all near chord notes). Verify no clipping/distortion (check DevTools for audio thread reports or use a DynamicsCompressorNode's `reduction` property).
- [ ] **Memory stability:** Run slide mode for 10 minutes in DevTools Memory profiler. Verify heap does not grow monotonically (indicates accumulating disconnected nodes or uncancelled automation events).
- [ ] **Traditional mode click-freedom:** Play chords rapidly in traditional mode. Verify no clicks/pops on attack or release (requires proper ADSR envelope, not abrupt gain changes).
- [ ] **60fps visual stability:** Profile the rAF loop during heavy slide mode. Verify `requestAnimationFrame` callbacks consistently complete within 16ms.
- [ ] **Mode switching:** Switch from traditional to slide mode and back repeatedly. Verify oscillator state, gain, and frequency remain consistent with no orphaned nodes.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Persistent-oscillator pattern not used from start | HIGH | Refactor entire voice management layer; all ramp scheduling code depends on this assumption |
| AudioParam value tracking not built into ramp scheduler | HIGH | The scheduler must be redesigned; band-aids (reading `.value` during ramp) will not work |
| Click artifacts in delivered build | MEDIUM | Add anti-click gain shapes at all transition points; may require re-architecting how gain envelopes are applied |
| Timer drift in convergence timing | MEDIUM | Refactor all scheduling code to use `audioContext.currentTime`; grep for `Date.now()` and `performance.now()` in scheduling paths |
| Autoplay not configured in Electron main | LOW | Add one line to `main.js`; test across macOS, Windows |
| Accumulating AudioParam events causing CPU growth | MEDIUM | Audit every `setValueAtTime`/`linearRampToValueAtTime` call site and ensure `cancelAndHoldAtTime` precedes each rescheduling |
| Canvas frame rate drops | MEDIUM | Layer canvases, reduce overdraw, profile GPU usage; may require moving from Canvas 2D to WebGL for the track visualization |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Cannot read AudioParam value mid-ramp | Audio engine architecture (before slide mode) | Unit test: schedule a ramp, interrupt at 50%, verify new ramp starts from the correct interpolated value |
| Oscillator single-use architecture mismatch | Audio engine architecture | Integration test: run slide mode for 60 seconds without any oscillator recreations; confirm no AudioContext errors |
| AudioContext suspended on launch | Electron + Web Audio integration spike | Test script: launch app, immediately check `audioContext.state`; assert `'running'` |
| Click/pop artifacts | Slide mode gain envelope implementation | Manual audio test: record output during chord changes; check waveform for discontinuities |
| JS timer drift breaks convergence | Convergence calculation design | Automated test: schedule convergence with a known duration; measure actual audio arrival time with OfflineAudioContext |
| Excessive AudioParam automation events | Slide mode optimization pass | Chrome DevTools audio thread profiling: verify CPU stable after 5 minutes of slide mode |
| Canvas frame drops | Visualization implementation | rAF timing: assert P95 frame time < 16ms during peak load |
| Audio clipping from summed voices | Audio graph architecture | Play all voices at full gain; assert DynamicsCompressor `reduction` stays within acceptable range |

---

## Sources

- MDN Web Audio API Best Practices: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices (HIGH confidence)
- MDN AudioParam cancelScheduledValues: https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/cancelScheduledValues (HIGH confidence)
- MDN linearRampToValueAtTime: https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/linearRampToValueAtTime (HIGH confidence)
- MDN exponentialRampToValueAtTime: https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/exponentialRampToValueAtTime (HIGH confidence)
- "A Tale of Two Clocks" (Chris Wilson, web.dev): https://web.dev/articles/audio-scheduling (HIGH confidence — canonical reference for Web Audio scheduling)
- "Web Audio: the ugly click and the human ear" (alemangui.github.io): http://alemangui.github.io/ramp-to-value (MEDIUM confidence — detailed analysis of click artifacts)
- "Web Audio API — things I learned the hard way" (blog.szynalski.com): https://blog.szynalski.com/2014/04/web-audio-api/ (MEDIUM confidence — practitioner gotchas; older but issue still applies)
- Web Audio API Performance Notes (padenot.github.io): https://padenot.github.io/web-audio-perf/ (MEDIUM confidence — Gecko-perspective performance analysis)
- WebAudio spec issue #344 (cancelScheduledValues value snap): https://github.com/WebAudio/web-audio-api/issues/344 (HIGH confidence — spec-level documentation of the problem)
- WebAudio spec issue #904 (AudioNode stop/disconnect memory): https://github.com/WebAudio/web-audio-api/issues/904 (HIGH confidence)
- Electron Security: https://www.electronjs.org/docs/latest/tutorial/security (HIGH confidence)
- Electron Context Isolation: https://www.electronjs.org/docs/latest/tutorial/context-isolation (HIGH confidence)
- MDN Optimizing Canvas: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas (HIGH confidence)
- Chrome autoplay policy: https://developer.chrome.com/blog/autoplay (HIGH confidence)
- Electron autoplay 2025 patterns: https://thecodersblog.com/electron-video-player-sound-autoplay-2025 (LOW confidence — WebSearch only)

---
*Pitfalls research for: Electron + Web Audio synthesizer with real-time visualization (Schmidi)*
*Researched: 2026-02-18*
