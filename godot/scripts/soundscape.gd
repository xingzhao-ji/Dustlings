extends Node3D
## Original audio assets; synchronized score and bounded, immediately mutable cues.
const MAX_WORLD_VOICES = 8
const MAX_UI_VOICES = 3
const CUE_INTERVALS = {"birth": 0.75, "assign": 0.2, "upgrade": 0.5, "chorus": 4.0, "restored": 3.0, "complete": 5.0, "blocked": 0.8}
var score: AudioStreamPlayer
var score_stream: AudioStreamSynchronized
var air: AudioStreamPlayer
var brush: AudioStreamPlayer3D
var water: AudioStreamPlayer3D
var active = false
var is_paused = true
var music_level = 0.6
var effects_level = 0.8
var ambience_level = 0.55
var brush_target = 0.0
var warmth_target = 0.0
var bloom_target = 0.0
var water_target = 0.0
var brush_level = 0.0
var warmth_level = 0.0
var bloom_level = 0.0
var water_level = 0.0
var cooldown = {}
var voices: Array = []
var ui_voices: Array = []
var cues = {}
var _focused = true

func _ready():
	for name in ["birth", "assign", "upgrade", "chorus", "restored", "complete", "blocked", "ui"]:
		cues[name] = load("res://assets/audio/" + name + ".wav")
	# One playback starts all three equal-length stems on the same audio sample.
	score_stream = AudioStreamSynchronized.new()
	score_stream.stream_count = 3
	for i in 3:
		var stem = load("res://assets/audio/" + ["music-base", "music-warm", "music-bloom"][i] + ".ogg")
		stem.loop = true
		score_stream.set_sync_stream(i, stem)
	score = AudioStreamPlayer.new()
	score.stream = score_stream
	score.volume_linear = 0
	add_child(score)
	air = _music("air")
	brush = _spatial("brush")
	water = _spatial("water")
	water.position = Vector3(0, 0.8, 0)
	process_mode = Node.PROCESS_MODE_ALWAYS
	_apply_mix()

func _music(name: String) -> AudioStreamPlayer:
	var player = AudioStreamPlayer.new()
	player.stream = load("res://assets/audio/" + name + ".ogg")
	player.stream.loop = true
	player.volume_linear = 0
	add_child(player)
	return player

func _configure_spatial(player: AudioStreamPlayer3D):
	player.unit_size = 16
	player.max_distance = 50
	player.attenuation_model = AudioStreamPlayer3D.ATTENUATION_INVERSE_DISTANCE

func _spatial(name: String) -> AudioStreamPlayer3D:
	var player = AudioStreamPlayer3D.new()
	player.stream = load("res://assets/audio/" + name + ".ogg")
	player.stream.loop = true
	_configure_spatial(player)
	player.volume_linear = 0
	add_child(player)
	return player

func start_soundscape():
	if active: return
	active = true
	is_paused = not _focused
	_apply_mix()
	for player in [score, air, brush, water]:
		player.play()
		player.stream_paused = is_paused

func set_paused(value: bool):
	var was_paused = is_paused
	is_paused = value or not _focused
	for player in [score, air, brush, water]:
		if is_instance_valid(player): player.stream_paused = is_paused
	for player in voices:
		if is_instance_valid(player): player.stream_paused = is_paused
	# Previously triggered interface tails do not leak into a newly paused scene.
	if is_paused and (not was_paused or not _focused): _stop_voices(ui_voices)

func set_mix(music: float, sfx: float, ambience: float):
	music_level = clampf(music, 0, 1)
	effects_level = clampf(sfx, 0, 1)
	ambience_level = clampf(ambience, 0, 1)
	# A mute cancels existing cue tails; unmuting cannot resurrect old effects.
	if effects_level <= 0:
		_stop_voices(voices)
		_stop_voices(ui_voices)
	_apply_mix()

func set_activity(progress: float, restored: float, brushing: bool, where: Vector3):
	progress = clampf(progress, 0, 1)
	restored = clampf(restored, 0, 1)
	warmth_target = smoothstep(0.08, 0.45, progress)
	bloom_target = smoothstep(0.4, 0.9, progress) * 0.75 + restored * 0.25
	water_target = restored
	brush_target = 1.0 if brushing else 0.0
	if is_instance_valid(brush): brush.position = where

func _volume(player: Node, value: float):
	if is_instance_valid(player): player.volume_linear = maxf(0, value)

func _apply_mix():
	if not is_instance_valid(score) or score_stream == null: return
	_volume(score, music_level * 0.8)
	score_stream.set_sync_stream_volume(0, 0)
	score_stream.set_sync_stream_volume(1, linear_to_db(warmth_level))
	score_stream.set_sync_stream_volume(2, linear_to_db(bloom_level))
	_volume(air, ambience_level * 0.8)
	_volume(brush, effects_level * brush_level * 0.9)
	_volume(water, ambience_level * water_level * 0.9)
	for player in voices: _volume(player, effects_level * 0.8)
	for player in ui_voices: _volume(player, effects_level * player.get_meta("gain", 0.5))

func _process(delta: float):
	if not active or is_paused: return
	brush_level = move_toward(brush_level, brush_target, delta * 6)
	warmth_level = move_toward(warmth_level, warmth_target, delta * 0.18)
	bloom_level = move_toward(bloom_level, bloom_target, delta * 0.12)
	water_level = move_toward(water_level, water_target, delta * 0.25)
	_apply_mix()

func _finish_voice(player: Node, interface_voice: bool):
	(ui_voices if interface_voice else voices).erase(player)
	if is_instance_valid(player):
		player.stop()
		player.stream = null
		player.queue_free()

func _stop_voices(collection: Array):
	for player in collection:
		if is_instance_valid(player):
			player.stop()
			player.stream = null
			player.queue_free()
	collection.clear()

func cue(kind: String, where: Vector3):
	# Buying in the paused Grow panel is an explicit interface action.
	if kind == "upgrade" and is_paused:
		_interface_cue("upgrade", 0.8, 0.5)
		return
	if not active or is_paused or not _focused or effects_level <= 0 or not cues.has(kind): return
	var now = Time.get_ticks_msec() / 1000.0
	if now - cooldown.get(kind, -100.0) < CUE_INTERVALS.get(kind, 0.2): return
	if voices.size() >= MAX_WORLD_VOICES: return
	cooldown[kind] = now
	var player = AudioStreamPlayer3D.new()
	player.stream = cues[kind]
	player.position = where
	_configure_spatial(player)
	_volume(player, effects_level * 0.8)
	add_child(player)
	voices.append(player)
	player.finished.connect(_finish_voice.bind(player, false), CONNECT_ONE_SHOT)
	player.play()

func ui():
	_interface_cue("ui", 0.5, 0.12)

func _interface_cue(kind: String, gain: float, interval: float):
	# Deliberate settings/purchase feedback remains available while the world pauses.
	if not active or not _focused or effects_level <= 0: return
	var now = Time.get_ticks_msec() / 1000.0
	if now - cooldown.get(kind, -100.0) < interval: return
	if kind == "upgrade":
		_stop_voices(ui_voices)
		cooldown.ui = now # The panel rebuild's generic click cannot mask the purchase.
	if ui_voices.size() >= MAX_UI_VOICES: return
	cooldown[kind] = now
	var player = AudioStreamPlayer.new()
	player.stream = cues[kind]
	player.set_meta("gain", gain)
	_volume(player, effects_level * gain)
	add_child(player)
	ui_voices.append(player)
	player.finished.connect(_finish_voice.bind(player, true), CONNECT_ONE_SHOT)
	player.play()

func _notification(what):
	if what == NOTIFICATION_APPLICATION_FOCUS_OUT:
		_focused = false
		set_paused(true)
	elif what == NOTIFICATION_APPLICATION_FOCUS_IN:
		_focused = true
		# The root's explicit Return action resumes the paused world.

func shutdown():
	_release_audio()
	# Dummy mixes coarse blocks and retained paused playbacks after rapid UI cycles.
	# Drain those blocks before engine teardown; normal devices keep the short exit.
	var drain_seconds = 0.6 if AudioServer.get_driver_name() == "Dummy" else 0.15
	if is_inside_tree(): await get_tree().create_timer(drain_seconds, true, false, true).timeout

func _exit_tree():
	_release_audio()

func _release_audio():
	active = false
	_stop_voices(voices)
	_stop_voices(ui_voices)
	for player in [score, air, brush, water]:
		if is_instance_valid(player):
			player.stop()
			player.stream = null
	if score_stream:
		for i in score_stream.stream_count: score_stream.set_sync_stream(i, null)
	cues.clear()
	score_stream = null
