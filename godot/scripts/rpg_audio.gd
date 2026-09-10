extends "res://scripts/soundscape.gd"
## Quiet player contacts and an original call/answer, within the existing mixer.
## No new loops; companion crowds do not emit footsteps.
const STEP_CAP = 2
const STEP_INTERVAL = 0.18
var step_streams: Dictionary = {}
var melody_streams: Dictionary = {}
var step_number = 0

func _ready():
	super._ready()
	for surface in ["stone", "wood", "grass"]:
		step_streams[surface] = []
		for i in 3:
			var stream = load("res://assets/audio/rpg-step-" + surface + "-" + str(i + 1) + ".wav")
			if stream:
				stream.loop_mode = AudioStreamWAV.LOOP_DISABLED
				step_streams[surface].append(stream)
	for kind in ["taught", "answer"]:
		var stream = load("res://assets/audio/rpg-melody-" + kind + ".wav")
		if stream:
			stream.loop_mode = AudioStreamWAV.LOOP_DISABLED
			melody_streams[kind] = stream
	# The neighborhood's water lies along the crossing, not the old fountain.
	water.position = Vector3(0, 0.35, -5)

func _configure_spatial(player: AudioStreamPlayer3D):
	player.unit_size = 3.2
	player.max_distance = 18.0
	player.attenuation_model = AudioStreamPlayer3D.ATTENUATION_INVERSE_DISTANCE

func _apply_mix():
	super._apply_mix()
	for player in voices:
		if is_instance_valid(player) and player.has_meta("rpg_gain"):
			_volume(player, effects_level * float(player.get_meta("rpg_gain")))

func _can_play() -> bool:
	return active and not is_paused and _focused and effects_level > 0

func _steps_playing() -> int:
	var count = 0
	for player in voices:
		if is_instance_valid(player) and player.get_meta("rpg_kind", "") == "step": count += 1
	return count

func _play_rpg(stream: AudioStream, where: Vector3, kind: String, gain: float, pitch: float = 1.0) -> bool:
	if stream == null or voices.size() >= MAX_WORLD_VOICES: return false
	var player = AudioStreamPlayer3D.new()
	player.stream = stream
	player.position = where
	player.pitch_scale = pitch
	player.set_meta("rpg_kind", kind)
	player.set_meta("rpg_gain", gain)
	_configure_spatial(player)
	_volume(player, effects_level * gain)
	add_child(player)
	voices.append(player)
	player.finished.connect(_finish_voice.bind(player, false), CONNECT_ONE_SHOT)
	player.play()
	return true

func footstep(where: Vector3, surface: String) -> bool:
	if not _can_play(): return false
	if surface not in step_streams: surface = "stone"
	if step_streams[surface].is_empty(): return false
	var now = Time.get_ticks_msec() / 1000.0
	if now - cooldown.get("rpg_step", -100.0) < STEP_INTERVAL: return false
	# Leave two world slots available for a birth, discovery or restoration cue.
	if _steps_playing() >= STEP_CAP or voices.size() >= MAX_WORLD_VOICES - 2: return false
	var variant = step_number % step_streams[surface].size()
	var pitch = [0.985, 1.015, 1.0][step_number % 3]
	if not _play_rpg(step_streams[surface][variant], where, "step", 0.58, pitch): return false
	cooldown.rpg_step = now
	step_number += 1
	return true

func melody(where: Vector3, answer: bool = false) -> bool:
	if not _can_play(): return false
	var kind = "answer" if answer else "taught"
	if not melody_streams.has(kind): return false
	var now = Time.get_ticks_msec() / 1000.0
	if now - cooldown.get("rpg_melody", -100.0) < 3.5: return false
	# A meaningful discovery may replace quiet footsteps, never another reward.
	for player in voices.duplicate():
		if player.get_meta("rpg_kind", "") == "step": _finish_voice(player, false)
	if not _play_rpg(melody_streams[kind], where, "melody", 0.88): return false
	cooldown.rpg_melody = now
	return true
