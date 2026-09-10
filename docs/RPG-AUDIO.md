# Neighborhood footsteps and family melody

The implemented candidate adds tactile player footsteps and gives Nell's taught melody an actual authored musical identity. **No one has auditioned these cues in this session.** PCM limits and engine checks do not demonstrate pleasant sound, relaxation, effective spatial balance or benchmark quality.

## Benefit, evidence and bounded change

The integrated RPG had walking without contact sounds, and the learned family melody used a generic upgrade cue. Those are concrete omissions from the owner's requested tactile, living world and the authored melody discovery. The intended benefit is gentle material feedback underfoot and a recognizable musical connection between Nell's relationship and the ivy door's answer.

The smallest implementation is eleven short original one-shots: three stone steps, three wooden steps, three grass steps, a taught phrase and its answered form. No ambient loop or old soundtrack was changed. Root owns actual walked-distance triggering, surface selection and the two earned story-event calls. This specialist pass was bounded to roughly eight minutes for synthesis/implementation, followed by focused engine verification of two initial probe assumptions.

Observable acceptance: footsteps occur only when the player actually travels on the ground, fit the visible material and remain quiet over repeated walking. NPCs and companions do not emit a multiplying step chorus. Nell's D–F♯–E phrase must be audible and recognizably answered with A–D at the door; it must not double with a generic upgrade cue. Volume changes/mute/pause/focus loss act immediately. Players should be able to identify the musical connection without finding the cue repetitive, shrill or intrusive.

## Implementation and integration

`godot/scripts/rpg_audio.gd` extends the existing `soundscape.gd`; the base file and all old audio assets remain unchanged. It preserves the original phase-aligned music stems, ambience, settings, gesture start, interface sound behavior, voice cleanup and shared voice cap.

```gdscript
# Root replaces its Soundscape preload with rpg_audio.gd.
audio.footstep(contact_position, "stone") # also "wood" / "grass"; unknown → stone
audio.melody(nell_position)              # earned nell_melody event
audio.melody(vine_position, true)        # earned sing_wall response
```

These methods return whether a cue was admitted. Root should trigger story sounds only when the corresponding action succeeds and changes state. Ordinary failed/repeated interactions must not replay an acquisition. Footsteps require real traveled distance and ground contact; turning, brushing in place, menus, blocked movement and helpers are not step triggers.

All new sounds are mono, letting actual `AudioStreamPlayer3D` position provide panning. RPG world sounds use `unit_size = 3.2`, `max_distance = 18`, inverse-distance attenuation rather than the old courtyard's wider scale. The inherited water emitter moves to the actual neighborhood crossing at (0,0.35,−5). These scale decisions are hypotheses awaiting listening with the close camera.

Contacts rotate deterministically through three material variants with subtle 0.985/1.015/1.0 playback pitch changes. A 0.18-second global contact cooldown prevents a surface change from triggering a burst while admitting the actor's intended 0.55 m foot contacts at 2.6 m/s (approximately 0.212 seconds per step). Root identified that the initial 0.25-second candidate would skip alternating contacts; it was corrected before integration. At most two contact voices exist inside the shared eight-world-voice cap; contacts leave two slots free for meaningful events. A family melody removes quiet step tails, uses the same shared cap, never steals a different meaningful cue, and has a 3.5-second cooldown. There are no new looping or random ambient calls.

The mixer preserves a contact gain of 0.58 and melody gain of 0.88 multiplied by the user's effects setting on every frame. Muting clears existing tails; unmuting cannot resurrect them. The old music and ambience controls remain independent. The candidate does not duck the music: actual audition should determine whether the family phrase has enough space, before introducing that extra behavior.

## Original assets and actual checks

`tools/generate-rpg-audio.py` writes only `rpg-*.wav` using deterministic NumPy synthesis. There are no reference-game samples, recordings, outside licenses or generated imitation performances. Stone combines a short low contact with restrained filtered grit; wood uses lower resonances; grass uses softer filtered movement. These are synthesis descriptions, not listening judgments.

The family tune uses Dustlings' own D–F♯–E–A–D motif. Nell teaches D4–F♯4–E4 (1.98 seconds). The answered cue repeats those three notes, leaves a pause, then adds A3–D4 (3.25 seconds). It is a soft synthesized whistle with small breath/noise components, not recorded character speech. Footstep durations are 0.19/0.25/0.27 seconds for stone/wood/grass.

Saved PCM verification: **66/66 checks** across eleven 44.1 kHz, 16-bit mono WAVs. Checks measure finite data, peak headroom, DC below 0.0002, exact silent endpoints, bounded neighboring-sample steps and duration. Peaks are approximately −22.6…−18.8 dBFS for contacts and −16.1/−15.9 dBFS for the phrases. The report `evidence/rpg/audio/pcm-checks.json` records file hashes, peaks, RMS, DC and every result. These values do not prove mix loudness at the listener.

Actual Godot 4.7.2 Dummy-driver checks: **20/20**, clean exit. `evidence/rpg/audio/engine-checks.json` and `engine.log` cover loaded assets, gesture start, material/cooldown behavior, spatial settings, two-step/eight-world caps, cue priority, live gain, pause, mute/unmute, focus loss and actual one-shot completion/release. Six successive contacts at 0.212-second timer intervals are admitted without alternating drops. `engine-probe.gd` preserves the exact probe. Cap fixtures deliberately reset cooldown values to exercise overlap; they are not ordinary player timing or a performance test.

The first probe reported 17/19. One assertion used exact floating-point equality for 3.2; the corrected probe uses approximate equality. The other queried a new 3D player's paused state before its first playback frame. Waiting for actual playback initialization verified that pause stops the live melody and rejects new cues. No runtime behavior was changed to force those probe assertions. Initial output is retained as `engine-initial.json` / `engine-initial.log`; no rapid same-frame pause guarantee is inferred from the corrected case.

## Required listening and human review

Listen on named headphones and speakers at recorded system/in-game volumes using the integrated build. Walk continuously over each material, move against walls, turn in place, stop and resume, and open pause mid-step. Check foot contact timing against animation and whether spatial attenuation makes steps disappear or follow the camera unnaturally. Then hear Nell's phrase once, explore in ordinary music/ambience, and discover the answer at the ivy door. Check whether the pause and final two notes are noticeable without becoming a jingle.

Audition repeated transitions, the busiest companion scene, muted effects, low music, sudden focus loss and resumption. Ask unfamiliar players what they connected the tune to and whether repeated footfalls felt tactile, mechanical, tiring or too loud. Human sessions and listening reviews remain **zero**. Root still must capture the source-matched integrated cues and preserve any observed problems before judging their aesthetic success.
