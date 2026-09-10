# Courtyard audio checkpoint

Implemented in `src/audio.js`. The musical identity is an original, five-note D–F♯–E–A–D contour at 72 BPM, using soft sine mallets, a subdued upper partial, sparse bass, and warm sustained tones. A short, dark reverberation tail places cues in the same miniature stone courtyard. This is a presentation hypothesis, not a claim of benchmark quality.

The dirty court starts with air, isolated notes, and a low anchor. Above 20% restoration it gains held harmony; above 35% a second bass response; above 48% answering plucks. Above 78% water gradually enters, and above 84% a restrained high note joins the phrase. Completion reprises and resolves the motif while briefly lowering the background score. Arrangements change at phrase steps rather than restarting the music.

Brushing uses a continuous cloth-like filtered texture with a soft transient for discrete contacts. Dust birth is a short wooden seed followed by a rising mallet; direction is a two-note wooden confirmation; blocked direction is a lower falling pair; upgrades ascend; a landmark gets a warm chord and water-like rush. Completion is a longer motif resolution. No unbounded per-creature idle sounds exist. Repeated births are limited to one every 650 ms, blocked cues to one every 700 ms, and total overlapping transient voices to 48; there are three quiet continuous texture sources. Reduced motion centers new stereo accents.

## Benefit, evidence, implementation, acceptance

- Player benefit: distinguish actions without reading every status message, feel restoration become livelier, and avoid tiring swarm chatter.
- Available evidence: the confirmed creative requirements and engine contract. No human listening sessions or player preference evidence is available.
- Small implementation: one procedural courtyard score, seven action cues, three volume controls, mute, pause/resume, bounded sources, recording tap, and offline audition support.
- Observable acceptance: audio is silent before a start gesture; all seven cues are distinguishable; a crowded birth sequence remains restrained; brushing starts/stops smoothly; pause/mute silence all buses; restored ambience audibly differs; no clipping, harsh transitions, or accumulating sources during sustained play. Human listening is required for the aesthetic and cue-recognition portions.

## Integration

```js
import { DustAudio } from './audio.js';
const audio = new DustAudio();
// In the Start button's pointer/keyboard event:
await audio.start();
audio.setMix({ music: .6, sfx: .8, ambience: .55, muted: false });
audio.setProgress(state.restoration);
audio.setBrushing(pointer.active && state.mode === 'brush', brushStrength);
audio.event('birth');
```

`start()` returns false where WebAudio is unavailable; it may reject if the platform rejects context creation/resume, which the UI should handle by allowing silent play. All setters and events are safe before start. Call `pause()` on game pause/backgrounding and `resume()` on an explicit return-to-play gesture. `setBrushing(false)` should run on pointer cancellation and modal opening. `destroy()` releases the owned context and recording tracks. Constructor accepts either an AudioContext/OfflineAudioContext directly or `{ context }`; supplied contexts remain caller-owned.

`getCaptureStream()` returns the post-master, post-compressor MediaStream where supported, otherwise null. Its audio tracks can be combined with a canvas capture stream for gameplay recording. The live track should not be stopped until game capture is finished. `getDiagnostics()` exposes source limits and observed peak transient voice count, without relying on nonstandard browser diagnostics.

## Offline audition

In a browser served from the project:

```js
const context = new OfflineAudioContext(2, 44100 * 36, 44100);
const audio = new DustAudio(context);
await audio.start();
const cueSheet = audio.scheduleAudition(36);
const buffer = await context.startRendering();
```

This deterministic render covers the dirty, partially restored, and completed arrangements, brushing, all action cues, and a final fade. Do not invoke `scheduleAudition` on the live game context. The standalone tool `tools/audio-audition.mjs`, when present, exports the WAV and numeric checks using Chromium through Playwright.

## Verification status and remaining review

Run `node tools/audio-audition.mjs` to reproduce `artifacts/audio/courtyard-audition.wav`, `audio-checks.json`, and `audition-levels.svg`. It requires the Chromium version installed for Playwright (`npx playwright install chromium`), or a compatible browser binary specified by `PLAYWRIGHT_EXECUTABLE_PATH`. The 36-second Chromium offline render at 44.1 kHz stereo passed: zero invalid or clipped samples, a −15.29 dBFS sample peak at default mix, 15 simultaneous transient voices observed, silent pre-start events, one accepted birth cue from 50 simultaneous requests, and exact silence after the mute fade. Numeric inspection revealed and corrected a one-sample noise-start discontinuity: the maximum adjacent-sample change decreased from 0.183 to 0.027 after initializing transient gain before scheduled starts.

Offline rendering is a synthetic engine check, not a listening session. No unfamiliar player, physical iPhone/iPad, Windows, or MacBook audio-device review has been performed by this audio subtask. The procedural textures, note balance, stereo placement, repetition over 10–15 minutes, fade transitions, headphone comfort, and legibility on small speakers still require listening in the actual game. Capture and browser autoplay behavior also require integration verification. There are no externally sourced audio assets or third-party music licenses.
