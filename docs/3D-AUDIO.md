# Native 3D audio reliability checkpoint

Date: 2026-09-10. Status: functional correction verified in Godot's audio engine; **awaiting current-build human listening and owner acceptance**. No sound assets or musical arrangement were changed in this cycle. There are zero human audio reviews/playtests recorded.

## Purpose, evidence and bounded implementation

Player benefit: volume controls affect sounds already playing; pausing and returning preserve the musical moment; successful purchases retain their distinct feedback; crowd events do not overwhelm the soundscape.

The lead's existing original assets use the Dustlings D–F♯–E–A–D motif, with three equal-length score stems, quiet ambience, positional brushing/water, and separate birth, assignment, upgrade, chorus, restoration, completion and blocked-action cues. Provenance and source measurements are in `tools/generate-3d-audio.py` and `evidence/3d/audio-generation.json`. This task did not modify either the generator or the audio assets.

Confirmed before-change defects:

- A real completion voice stayed at `volume_linear = 0.63999999` immediately after `set_mix(..., 0, ...)`. The 3-second sound could continue despite the effects slider reaching zero.
- Interface voices were outside the tracked voice collection and had no explicit crowd limit.
- Calling the audio process while paused advanced the restoration envelope from 0 to 0.18 over one simulated second.
- An upgrade is purchased inside the paused Grow panel, while `cue()` rejected all paused events; the upgrade's distinct cue was therefore suppressed.
- Immediate engine exit left audio playback/resources pending. The lead's `evidence/3d/exit-busy-trace.log` records the diagnostic rather than hiding it.

The bounded correction changes only soundscape control and its audio-engine checks. Existing cue synthesis, volume defaults, fade rates, spatial distances and motif remain intact. No subjective remix was justified by this evidence.

## Current behavior and interface

All existing public methods retain their signatures: `start_soundscape()`, `set_paused(value)`, `set_mix(music, sfx, ambience)`, `set_activity(progress, restored, brushing, where)`, `cue(kind, where)`, and `ui()`.

- Nothing starts before the player's Start action. Pause freezes world playback and the restoration/brush/water envelopes.
- One `AudioStreamSynchronized` owns the three score stems. Each decoded stem is 53.333332 seconds long and loops. Restoration changes layer gain without restarting or separately starting a stem.
- Music, ambience and effect levels apply immediately to existing players. Zero effects stops and releases active world/UI cue tails, rejects future cues, and gives the brush loop exact zero linear gain. Raising the slider cannot revive an old tail.
- World cue capacity is eight; UI capacity is three. Birth calls are limited to one per 0.75 seconds. A simultaneous 50-birth fixture creates one sound.
- Interface settings feedback can play while the world is paused. A paused `upgrade` event is treated as deliberate purchase feedback, replaces older UI tails, and suppresses the redundant generic panel-rebuild click. Rebuilding the already-paused Grow panel does not cancel that purchase cue.
- Focus loss pauses all world playback, clears UI tails and suppresses new cues. Focus return alone does not resume the world; the root's explicit Return action does.
- Finished cues are removed from their collection, stopped, disconnected by a one-shot signal, and freed. Spatial world cues keep inverse-distance attenuation, unit size 16 and a maximum distance of 50. Brush position follows the supplied world target; water remains at the fountain.

Additive integration method: **`await audio.shutdown()` before `get_tree().quit()`**. It stops voices/loops, clears their stream references and synchronized substreams, then waits for the mixer to drain (0.6 real seconds with Godot’s coarse Dummy driver; 0.15 seconds with a normal audio driver). `_exit_tree()` also releases resources, but abrupt tree destruction alone cannot guarantee the audio thread has consumed its stop requests. The lead must use the awaited method for normal and automated exits. This does not claim reliable cleanup after a forced process termination.

The private `base`, `warm`, and `bloom` players have been replaced by `score` plus `score_stream`; no root gameplay caller used those former internals.

## Verification and actual audio evidence

Run:

```sh
.tools/Godot.app/Contents/MacOS/Godot --headless --path godot --script res://tests/audio_checks.gd -- --output=/tmp/dustlings-3d-audio-checks.json
```

The test creates actual Godot streams, 3D audio sources and a listener, and captures mixed PCM from `AudioEffectCapture`. It runs on Godot 4.7.2 on the available Mac host using the **Dummy audio driver**. The driver still executes the audio mixer and produces real nonzero samples; it is not a speaker/headphone audition or a physical-device usability test.

Initial functional result: **33 checks passed, zero failures, zero engine errors/warnings**. The rapid-cycle cleanup follow-up below expands the resource-release check and supersedes the original shutdown timing. Pre-Start, pause, settled mute, unfocused and out-of-range sample peaks were exactly zero. Nonzero score/UI/world samples establish that the capture path was active.

Acceptance checks cover pre-Start silence, audible synchronized playback, equal stem duration, gradual layers without restart, paused playback position/envelopes, pause silence, deliberate UI/purchase feedback, live existing-voice volume changes, existing/future mute, eight/three voice caps, the 50-birth burst, actual left/right panning, silence beyond the spatial cutoff, focus loss, finished-cue cleanup, crossing a real loop boundary and explicit stream release before exit.

The final JSON/log and the emitted `-harness.wav` are handed to the lead from `/tmp/dustlings-3d-audio-checks*` for the milestone evidence directory. The WAV is actual Godot bus output from deliberately isolated test transitions. **It is an audio-only technical harness, not normal gameplay.** It exists so the exact changed audio path can be heard; producing it is not evidence that anyone listened or liked it.

The lead's `evidence/3d/opening.mp4` supplies actual integrated gameplay and audio from before this correction. It must not be presented as proof of the corrected purchase/mute behavior. A fresh integrated purchase → live mute → pause → return clip remains the next audio capture for current-build human review.

Two test-fixture issues were corrected openly: the Dummy driver uses coarse audio blocks, so a sample after 80 ms could include a previously queued fade-out block; steady-output capture now allows 220 ms to drain two blocks. Cue-end verification also waits for actual completion up to a bounded deadline rather than assuming the Dummy mixer precisely matches a 3.25-second wall timer. The earlier failing log is preserved as `/tmp/dustlings-3d-audio-checks-initial.log`. Immediate player gain/stop state is checked separately; silence assertions concern the settled mixed output.

A separate direct-exit probe started synchronized music and both cue types, awaited `shutdown()`, then immediately quit. It exited with no errors, warnings or leaked-resource diagnostics (`/tmp/dustlings-audio-shutdown.log`). This is a focused host result; the lead's integrated native exit still needs its own check.

Godot documents synchronized substreams as starting together and provides mixed bus samples through AudioEffectCapture. These API properties informed the implementation; human sound quality is not inferred from them. Sources inspected 2026-09-10: [AudioStreamSynchronized](https://docs.godotengine.org/en/latest/classes/class_audiostreamsynchronized.html), [AudioEffectCapture](https://docs.godotengine.org/en/latest/classes/class_audioeffectcapture.html), [AudioStreamPlayer](https://docs.godotengine.org/en/4.4/classes/class_audiostreamplayer.html).

## Remaining quality gates

1. Capture the corrected native gameplay path, including a purchase while Grow is paused, a cue already playing when effects reach zero, pause/return and normal exit. Verify the integrated cleanup log.
2. Listen to the current opening, a full 53-second loop join, restoration crossfade, busy 50-helper scene and earned fountain completion over speakers and headphones. Record listener, build, setup, fatigue/awkwardness and exact objections. Neither source amplitude measurements nor bus-silence assertions establish pleasantness.
3. Ask unfamiliar target players whether formation, assignment, upgrade and completion sounds are distinct and useful, whether quiet periods feel comfortable, and whether the restoration arrangement rewards the reveal. Separate target groups and owner acceptance.
4. Validate native Windows audio-device changes, focus behavior, spatial balance and cleanup on physical hardware. The current Mac-host/Dummy checks do not establish Windows or iOS audio readiness.

Exact next action: the lead integrates the awaited shutdown path, records the corrected purchase/mute/pause sequence in actual gameplay, and makes that clip plus the harness available for human listening before any taste-driven remix.

## Rapid-cycle cleanup follow-up

After the initial clean probe, the lead observed leaked synchronized playback, upgrade cue and ambience resources in the full start → purchase → pause/focus test. Three bounded repeats reproduced 11 leaked ObjectDB instances and four retained resources despite the original 0.15-second drain. These failures are preserved in `/tmp/dustlings-audio-integration-repeat-{1,2,3}.log` and summarized by `/tmp/dustlings-audio-integration-repeat.json`. A clean isolated probe therefore did not close the integrated reliability gap.

Two isolated alternatives were compared: unpausing before stopping did not fix the leak; allowing the Dummy mixer 0.6 seconds to drain did. The longer drain then passed three consecutive full integration checks with no diagnostics (`/tmp/dustlings-audio-drain-repeat-{1,2,3}.log`, summary `.json`). The source now applies that delay specifically to the Dummy driver, which also serves offline movie capture, while retaining the normal-driver delay. No cue, motif, gain, playback or pause behavior changed. The audio regression now also observes weak references to the released synchronized score and ambience resource; it does not merely assert that player fields were set to null.

The lead still needs the current native-device exit check. A Windows audio-driver result is not inferred from this Dummy-driver correction, and no diagnostic suppression was added.

Final follow-up verification: 34 audio-engine checks passed with zero failures/diagnostics, including weak-reference release; the current shared source also passed the full integration script without errors or leak warnings (`/tmp/dustlings-3d-audio-checks-final.log`, `/tmp/dustlings-audio-integration-final.log`).
