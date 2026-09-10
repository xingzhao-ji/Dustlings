extends SceneTree
## Actual Godot streams/voices plus bus samples. This is not a human audition.
const Soundscape = preload("res://scripts/soundscape.gd")
var checks: Array = []
var failures: Array = []
var measurements: Dictionary = {}
var sound
var capture: AudioEffectCapture
var recording: AudioEffectRecord
var world: Node3D

func check(value: bool, description: String):
	if value: checks.append(description)
	else: failures.append(description); push_error(description)

func _init(): call_deferred("run")

func sample(seconds = 0.18) -> Dictionary:
	# Dummy uses coarse mix blocks; drain two before measuring steady output.
	await create_timer(0.22).timeout
	capture.clear_buffer()
	await create_timer(seconds).timeout
	var frames = capture.get_buffer(capture.get_frames_available())
	var peak = 0.0
	var left = 0.0
	var right = 0.0
	for frame in frames:
		peak = maxf(peak, maxf(absf(frame.x), absf(frame.y)))
		left += frame.x * frame.x
		right += frame.y * frame.y
	return {"frames": frames.size(), "peak": peak, "left_energy": left, "right_energy": right}

func reset_cues():
	sound._stop_voices(sound.voices)
	sound._stop_voices(sound.ui_voices)
	sound.cooldown.clear()

func run():
	capture = AudioEffectCapture.new()
	capture.buffer_length = 1.0
	AudioServer.add_bus_effect(0, capture)
	recording = AudioEffectRecord.new()
	AudioServer.add_bus_effect(0, recording)
	recording.set_recording_active(true)
	world = Node3D.new()
	root.add_child(world)
	root.audio_listener_enable_3d = true
	var camera = Camera3D.new()
	world.add_child(camera)
	camera.position = Vector3(0, 0, 8)
	camera.look_at(Vector3.ZERO)
	camera.current = true
	sound = Soundscape.new()
	world.add_child(sound)
	sound.cue("birth", Vector3.ZERO)
	sound.ui()
	var before_start = await sample()
	check(before_start.frames > 0 and before_start.peak == 0, "Actual bus is silent before Start")
	check(not sound.score.playing and sound.voices.is_empty() and sound.ui_voices.is_empty(), "Start gate prevents music and cue creation")
	sound.start_soundscape()
	var started = await sample()
	check(started.peak > 0, "Actual synchronized score produces audio after Start")
	var lengths: Array = []
	for i in 3:
		var stream = sound.score_stream.get_sync_stream(i)
		lengths.append(stream.get_length())
		check(stream.loop, "Score stem %d loops" % i)
	check(lengths[0] == lengths[1] and lengths[1] == lengths[2], "All synchronized stems have identical decoded duration")
	check(sound.score.stream is AudioStreamSynchronized and sound.score_stream.stream_count == 3, "One synchronized playback owns the three exact-start score stems")
	measurements.score_lengths_seconds = lengths
	sound.set_activity(1, 1, true, Vector3.ZERO)
	var position_before = sound.score.get_playback_position()
	sound._process(0.5)
	check(is_equal_approx(sound.warmth_level, 0.09) and is_equal_approx(sound.bloom_level, 0.06), "Restoration layers fade gradually at the established rates")
	await create_timer(0.1).timeout
	check(sound.score.get_playback_position() > position_before, "Changing score layers does not restart playback")
	sound.set_paused(true)
	var frozen = [sound.brush_level, sound.warmth_level, sound.bloom_level, sound.water_level]
	sound._process(1)
	check(frozen == [sound.brush_level, sound.warmth_level, sound.bloom_level, sound.water_level], "Pause freezes brush, restoration and water envelopes")
	var paused_sample = await sample()
	check(paused_sample.peak == 0, "Actual bus is silent during world pause")
	var pause_position = sound.score.get_playback_position()
	await create_timer(0.1).timeout
	check(sound.score.get_playback_position() == pause_position, "Paused synchronized playback position remains fixed")
	sound.cue("complete", Vector3.ZERO)
	check(sound.voices.is_empty(), "Paused world rejects new positional effects")
	sound.ui()
	var paused_ui = await sample()
	check(paused_ui.peak > 0 and sound.ui_voices.size() == 1, "A deliberate UI cue remains audible in pause")
	sound.set_mix(0, 0.4, 0)
	check(is_equal_approx(sound.ui_voices[0].volume_linear, 0.2), "Live volume change updates an existing UI cue immediately")
	reset_cues()
	sound.cue("upgrade", Vector3.ZERO)
	sound.set_paused(true)
	sound.ui()
	check(sound.ui_voices.size() == 1 and sound.ui_voices[0].stream == sound.cues.upgrade, "A paused purchase keeps its distinct cue through the Grow panel rebuild")
	sound.set_mix(0, 0, 0)
	var muted = await sample()
	check(muted.peak == 0 and sound.ui_voices.is_empty(), "Muting cancels a playing UI tail and produces exact zero bus output")
	sound.set_paused(false)
	sound.set_mix(0, 0.8, 0)
	reset_cues()
	sound.set_activity(0, 0, false, Vector3.ZERO)
	sound.brush_level = 0
	sound._apply_mix()
	sound.cue("complete", Vector3.ZERO)
	check(sound.voices.size() == 1, "A real positional completion cue starts")
	var spatial_playing = await sample()
	check(spatial_playing.peak > 0, "Positional cue produces actual bus audio at the courtyard")
	var voice = sound.voices[0]
	sound.set_mix(0, 0.2, 0)
	check(is_equal_approx(voice.volume_linear, 0.16), "Live volume change updates an existing 3-second world cue immediately")
	sound.set_mix(0, 0, 0)
	check(sound.voices.is_empty() and not voice.playing and sound.brush.volume_linear == 0, "Effects mute stops existing world cues and exactly zeros the brush loop")
	sound.cue("birth", Vector3.ZERO)
	sound.ui()
	var all_muted = await sample()
	check(all_muted.peak == 0 and sound.voices.is_empty() and sound.ui_voices.is_empty(), "Zero effects rejects future cues and preserves exact silent output")
	sound.set_mix(0, 0.8, 0)
	reset_cues()
	for i in 50: sound.cue("birth", Vector3.ZERO)
	check(sound.voices.size() == 1, "A simultaneous 50-helper birth burst creates only one cue")
	for i in 50:
		sound.cooldown.clear()
		sound.cue("assign", Vector3.ZERO)
	check(sound.voices.size() == Soundscape.MAX_WORLD_VOICES, "Repeated world events cannot exceed eight live voices")
	for i in 50:
		sound.cooldown.erase("ui")
		sound.ui()
	check(sound.ui_voices.size() == Soundscape.MAX_UI_VOICES, "Repeated interface input cannot exceed three live UI voices")
	reset_cues()
	sound.cue("birth", Vector3(-4, 0, 0))
	var left_sample = await sample()
	reset_cues()
	sound.cue("birth", Vector3(4, 0, 0))
	var right_sample = await sample()
	check(left_sample.left_energy > left_sample.right_energy and right_sample.right_energy > right_sample.left_energy, "Actual positional samples pan toward their world source")
	reset_cues()
	sound.cue("birth", Vector3(80, 0, 0))
	var distant = await sample()
	check(distant.peak == 0, "A source beyond the 50-unit distance bound is inaudible")
	reset_cues()
	sound._notification(Node.NOTIFICATION_APPLICATION_FOCUS_OUT)
	sound.ui()
	sound.cue("birth", Vector3.ZERO)
	var unfocused = await sample()
	check(unfocused.peak == 0 and sound.is_paused and sound.ui_voices.is_empty(), "Focus loss freezes world audio and suppresses interface sounds")
	sound._notification(Node.NOTIFICATION_APPLICATION_FOCUS_IN)
	check(sound.is_paused, "Focus return waits for explicit Return before resuming")
	sound.set_paused(false)
	reset_cues()
	sound.cue("birth", Vector3.ZERO)
	sound.ui()
	var finish_deadline = Time.get_ticks_msec() + 6000
	while (not sound.voices.is_empty() or not sound.ui_voices.is_empty()) and Time.get_ticks_msec() < finish_deadline:
		await create_timer(0.1).timeout
	check(sound.voices.is_empty() and sound.ui_voices.is_empty(), "Finished 3-second world/UI cues leave no tracked voices or playback nodes")
	sound.set_mix(0.6, 0, 0)
	sound.score.seek(lengths[0] - 0.08)
	await create_timer(0.3).timeout
	check(sound.score.playing and sound.score.get_playback_position() >= 0 and sound.score.get_playback_position() < 1, "Synchronized score crosses an actual loop boundary and wraps to its opening")
	measurements.loop_position_after_seek = sound.score.get_playback_position()
	measurements.samples = {"before_start": before_start, "started": started, "paused": paused_sample, "paused_ui": paused_ui, "muted": muted, "world_cue": spatial_playing, "all_muted": all_muted, "left": left_sample, "right": right_sample, "distant": distant, "unfocused": unfocused}
	var score_reference = weakref(sound.score_stream)
	var air_reference = weakref(sound.air.stream)
	await sound.shutdown()
	check(score_reference.get_ref() == null and air_reference.get_ref() == null, "Mixer drain releases synchronized score and ambient resources, not just player fields")
	check(not sound.active and sound.score.stream == null and sound.air.stream == null and sound.brush.stream == null and sound.water.stream == null, "Explicit shutdown releases all looping streams before engine exit")
	world.queue_free()
	sound = null
	world = null
	await create_timer(0.2).timeout
	recording.set_recording_active(false)
	var recorded = recording.get_recording()
	AudioServer.remove_bus_effect(0, 1)
	AudioServer.remove_bus_effect(0, 0)
	capture = null
	recording = null
	var result = {"kind": "Automated Godot audio-engine checks; not human listening", "engine": Engine.get_version_info().string, "audio_driver": AudioServer.get_driver_name(), "checks": checks, "failures": failures, "measurements": measurements}
	var output = "/tmp/dustlings-3d-audio-checks.json"
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--output="): output = arg.trim_prefix("--output=")
	var recording_output = output.get_basename() + "-harness.wav"
	recorded.save_to_wav(recording_output)
	result.recording = {"path": recording_output, "kind": "Actual Godot audio-bus harness, deliberate technical transitions; not normal gameplay or a human audition"}
	FileAccess.open(output, FileAccess.WRITE).store_string(JSON.stringify(result, "\t") + "\n")
	print(JSON.stringify(result))
	quit(0 if failures.is_empty() else 1)
