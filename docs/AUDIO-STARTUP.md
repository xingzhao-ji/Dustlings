# Audio startup: measured cause and bounded change

The observed first-click stall was reproducible in three sequential fresh headless Chrome 152 processes. The native `AudioContext` constructor consumed 110.9, 113.5, and 110.9 ms. Building the audio graph took approximately 14 ms, including approximately 7.1 ms for the impulse and 2.3 ms for the noise buffer. Optimizing those buffers would not address the largest measured cost.

The player benefit is a more responsive transition from Start into the courtyard. The evidence is browser instrumentation, not a report of perceived latency from a player. The smallest change adds `audio.prepare()`: it creates only a source-free context during welcome idle. The existing graph, procedural buffers, score, mixing, and sound cues remain created by `start()` from the player's gesture. Preparation does not create a recording stream, oscillator, texture source, or music timer.

| Measured phase | Before, three cold browser trials | With prepared context, three verification trials |
| --- | --- | --- |
| Synchronous `audio.start()` work | 125.8–128.4 ms | 13.0–13.4 ms |
| `audio.start()` promise settled | 125.9–128.4 ms | 25.9–26.6 ms |
| Long tasks after Start | One per trial, 127–130 ms | Zero in all three trials |
| Native setup before Start | None | 110.1–112.9 ms during welcome idle |

The native setup cost is **moved, not removed**. The prepared trials still record an approximately 110 ms welcome-idle long task. A person tapping during that work could still experience a delay. First-paint ordering, the immediate-click fallback, and perceived welcome responsiveness require review on actual devices. These results do not explain every earlier frame stall or establish sustained frame rate.

## Integration and lifecycle

After the welcome screen paints, schedule a caught `audio.prepare()` call using `requestIdleCallback` with a timeout fallback. Skip it once play has started or while the document is hidden. `prepare()` returns false if WebAudio is unavailable and may throw when the platform denies context creation; silent play remains available. The ordinary `start()` path still works if a player clicks before preparation.

Before the Start gesture, every measured prepared context was suspended, `ready` was false, and the diagnostics reported zero sources and voices. `resume()` now always queues the native resume request, covering a Start gesture arriving while an idle suspension is still pending. That immediate prepare/start race reached a running graph with three texture sources. Destroying a prepared but never-started instance closed its owned context; supplied contexts remain caller-owned.

## Sound preservation checks

No synthesis, note timing, buffer-generation formula, envelope, gain, filter, or mixing parameter changed. Comparison against the pre-change audio module found **zero differences across 304,290 generated noise/impulse samples**.

A same-browser 36-second stereo OfflineAudioContext comparison examined 3,175,200 output samples. The floating-point rendered outputs were not bit-identical; their maximum absolute difference was `3.31e-7`. This is numeric evidence, not a listening assessment or a claim about headphone comfort. The playable cue composition and procedural source data remain unchanged.

## Evidence and reproduction

- `evidence/audio-startup-before.json`: three measured cold starts before preparation.
- `evidence/audio-startup-prepared.json`: first three prepared trials.
- `evidence/audio-startup-prepared-verified.json`: three final trials, generated-buffer/output comparison, silent-before-start diagnostics, destroy-before-start, and immediate prepare/start lifecycle checks.
- `tools/audio-startup-checks.mjs`: native constructor, graph, buffer, resume, long-task, and long-animation-frame instrumentation.

Run the local server, then `node tools/audio-startup-checks.mjs prepared` for three fresh prepared trials. The harness waits for the welcome paint and invokes preparation in idle time if Root has not already done so.

To compare the historical audio source, export `src/audio.js` from commit `1834ab5fce1eea94b88ec6e5418d9937578028e9` to a temporary file and set `DUSTLINGS_AUDIO_BASELINE` to that path when running with label `prepared-verified`. With label `before` and that environment variable, the tool serves the baseline audio module only to its isolated test browsers; it does not edit the game files. Record machine workload and browser version when comparing results. No human listening, screen-reader, or physical mobile-device assessment occurred in this subtask.
