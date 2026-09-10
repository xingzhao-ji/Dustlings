extends SceneTree
## Actual Main/store integration in a unique QA profile. Never uses ordinary saves.
const Store = preload("res://scripts/save_store.gd")
const Sim = preload("res://scripts/simulation.gd")

class RecoveryMain extends "res://scripts/main.gd":
	var recovery_path = ""
	var recovery_port = 0
	func _save_path() -> String:
		assert(recovery_path.begins_with(OS.get_cache_dir().path_join("dustlings-native-recovery-")))
		return recovery_path
	func _acquire_instance():
		# Exercise the real Start/save guards with a test-local port, never the app port.
		instance_lock = TCPServer.new()
		instance_primary = instance_lock.listen(recovery_port, "127.0.0.1") == OK
		if instance_primary: recovery_port = instance_lock.get_local_port()
	func _load_progress():
		# QA normally deliberately skips applying a save. Keep its isolated path but
		# exercise the base application's actual restore/settings application branch.
		var was_qa = qa
		qa = false
		super._load_progress()
		qa = was_qa

var checks: Array = []
var failures: Array = []
var measurements: Dictionary = {}
var folder = ""
var game: RecoveryMain
var second: RecoveryMain
var reloaded: RecoveryMain

func check(value: bool, description: String):
	if value: checks.append(description)
	else: failures.append(description); push_error(description)

func _initialize():
	if not "--qa" in OS.get_cmdline_user_args():
		push_error("Refusing recovery checks without --qa; ordinary save testing is prohibited.")
		quit(2)
		return
	call_deferred("run")

func _new_game(path: String, port = 0) -> RecoveryMain:
	var node = RecoveryMain.new()
	node.recovery_path = path
	node.recovery_port = port
	root.add_child(node)
	return node

func _step(count: int):
	for i in count: game._physics_process(0.05)

func _hide_game(node: RecoveryMain):
	node.hide()
	node.hud.hide()
	node._stop_input()
	node.paused = true
	node.audio.set_paused(true)

func _dispose(node: RecoveryMain):
	if not is_instance_valid(node): return
	await node.audio.shutdown()
	if node.instance_lock: node.instance_lock.stop()
	node.free()
	await process_frame

func _write(path: String, payload: Dictionary):
	var file = FileAccess.open(path, FileAccess.WRITE)
	file.store_string(JSON.stringify(payload))
	file.flush()
	file.close()

func _copy_matches(path: String, payload: Dictionary) -> bool:
	var saved = Store.new(path).load_progress()
	return saved.ok and JSON.stringify(saved.payload.game) == JSON.stringify(JSON.parse_string(JSON.stringify(payload.game))) and saved.payload.settings == payload.settings

func _cancelled_input() -> bool:
	return not game.brushing and not game.brush_keyboard_held and game.tap_remaining == 0 and not game.dragging_camera

func run():
	folder = OS.get_cache_dir().path_join("dustlings-native-recovery-" + str(OS.get_process_id()) + "-" + str(Time.get_ticks_usec()))
	DirAccess.make_dir_recursive_absolute(folder)
	print("RECOVERY_RUN pid=", OS.get_process_id(), " profile=", folder)
	var path = folder.path_join("courtyard.json")
	game = _new_game(path)
	await physics_frame
	await process_frame
	check(game.qa and game._save_path() == path and game.instance_primary, "First native Main instance uses only the fresh QA path and isolated lock")
	check(not game.started and game.paused and not game.audio.active, "A fresh launch waits silently at welcome")
	check(not FileAccess.file_exists(path), "Welcome alone does not write an invented save")
	game._start()
	await physics_frame
	var patch = game.camera.unproject_position(Vector3(-4, 0, 2))
	game._qa_mouse(patch, true)
	_step(70)
	game._qa_mouse(patch, false)
	check(game.sim.stats.brushed > 0 and game.sim.cleaned > 0, "Generated native input creates real brushed progress on raycast paving")
	game._show_settings()
	await process_frame
	var sliders = game.modal.find_children("*", "HSlider", true, false)
	var toggles = game.modal.find_children("*", "CheckButton", true, false)
	check(sliders.size() == 3 and toggles.size() == 3, "Current settings panel exposes its three mix controls and three preferences")
	if sliders.size() == 3:
		sliders[0].value = 0.25
		sliders[1].value = 0
		sliders[2].value = 0.35
	if toggles.size() == 3:
		toggles[0].button_pressed = true
		toggles[1].button_pressed = true
		toggles[2].button_pressed = false
	var expected_settings = game.settings.duplicate()
	check(is_equal_approx(game.settings.music, 0.25) and game.settings.sfx == 0 and is_equal_approx(game.settings.ambience, 0.35) and game.audio.effects_level == 0 and game.gentle_motion and game.tap_sweep and not game.settings.quality, "Actual settings controls update live sound, gentle motion and tap behavior")
	game._close_modal()
	check(game._save_progress(), "Returning from settings persists a verified current generation")
	var earned_payload = game._payload().duplicate(true)
	check(_copy_matches(path, earned_payload), "Saved progress and preferences exactly match the live Main payload")
	var revision = game.save_store.revision
	var primary_bytes = FileAccess.get_file_as_string(path)
	var port = game.recovery_port
	_hide_game(game)
	second = _new_game(path, port)
	await process_frame
	check(not second.instance_primary and not second.started and not second.audio.active, "Second live Main instance cannot acquire the same isolated writer lock")
	var disabled_start = false
	for button in second.modal.find_children("*", "Button", true, false):
		if "courtyard" in button.text or "Bring it" in button.text: disabled_start = button.disabled
	check(disabled_start, "Second-launch welcome visibly disables its Start action")
	second._start()
	check(not second.started and FileAccess.get_file_as_string(path) == primary_bytes, "Calling Start on the second instance cannot progress or write")
	second.started = true # Direct guard probe, not a player action or legitimate launch.
	check(not second._save_progress() and FileAccess.get_file_as_string(path) == primary_bytes, "Non-primary save guard protects disk even if started state is injected")
	second.started = false
	await _dispose(second)
	second = null
	game.show()
	game.hud.show()
	game._close_modal()
	await process_frame
	# A held pointer/keyboard/tap stroke is interrupted through real modal methods.
	game.brushing = true
	game.brush_keyboard_held = true
	game.tap_remaining = 1.2
	game.dragging_camera = true
	game._show_settings()
	var brushed = game.sim.stats.brushed
	var elapsed = game.sim.elapsed
	_step(10)
	check(_cancelled_input() and game.sim.stats.brushed == brushed and game.sim.elapsed == elapsed, "Settings pause cancels every held input and freezes progression")
	game._close_modal()
	_step(2)
	check(_cancelled_input() and game.sim.stats.brushed == brushed, "Return never resumes an old brush or tap stroke")
	game.brushing = true
	game.brush_keyboard_held = true
	game.tap_remaining = 1.1
	game._notification(Node.NOTIFICATION_APPLICATION_FOCUS_OUT)
	check(game.paused and game.audio.is_paused and _cancelled_input(), "Focus loss pauses audio and cancels held mouse, keyboard and tap state")
	game._notification(Node.NOTIFICATION_APPLICATION_FOCUS_IN)
	check(game.paused, "Focus return does not silently restart play")
	# External writer advances a valid generation, then the live instance autosaves.
	var outsider = Store.new(path)
	outsider.load_progress()
	var newer = game._payload().duplicate(true)
	newer.settings.ambience = 0.55
	check(outsider.save_progress(newer).ok, "A controlled external writer creates a newer verified generation")
	var newer_bytes = FileAccess.get_file_as_string(path)
	game._close_modal()
	game.brushing = true
	game.tap_remaining = 1.0
	game.save_timer = 8
	game._physics_process(0.05)
	check(game.paused and game.modal_kind == "settings" and _cancelled_input(), "Stale-writer autosave interrupts safely in settings without a held stroke")
	game._update_ui()
	check("Newer progress" in game.save_label.text and "Newer progress" in game.save_problem and FileAccess.get_file_as_string(path) == newer_bytes, "Conflict explains newer progress and never overwrites it")
	var branch = game._payload().duplicate(true)
	var copy_path = folder.path_join("branch-copy.json")
	check(game.save_store.export_copy(copy_path, branch) and _copy_matches(copy_path, branch), "The interrupted branch remains exportable as an exact verified copy")
	measurements.first_saved_revision = revision
	measurements.latest_disk_revision = outsider.revision
	measurements.brushed_before_interruption = brushed
	measurements.branch_cleaned = game.sim.cleaned
	await _dispose(game)
	game = null
	# New Main acquires the released lock and takes the real production load branch.
	reloaded = _new_game(path, port)
	await process_frame
	check(reloaded.instance_primary and reloaded.saved_once and not reloaded.started, "After closing the first instance, a fresh Main can own and restore the profile")
	# JSON parser normalizes all numbers to floats; compare both serialized sides.
	var normal_actual = JSON.parse_string(JSON.stringify(reloaded.sim.serialise()))
	var normal_expected = JSON.parse_string(JSON.stringify(newer.game))
	measurements.reload_data_identical = JSON.stringify(normal_actual) == JSON.stringify(normal_expected)
	measurements.reloaded_settings = reloaded.settings.duplicate()
	check(reloaded.settings == newer.settings and measurements.reload_data_identical, "Fresh Main restores the saved simulation and actual preference values")
	check(not reloaded.brushing and not reloaded.brush_keyboard_held and reloaded.tap_remaining == 0 and reloaded.paused, "Reloaded progress has no saved held inputs or automatic continuation")
	await _dispose(reloaded)
	reloaded = null
	# Interrupted atomic promotion: newer verified .new must win in Main restore.
	var staged = newer.duplicate(true)
	staged.revision = outsider.revision + 1
	staged.settings.music = 0.10
	_write(path + ".new", staged)
	reloaded = _new_game(path, port)
	await process_frame
	check(reloaded.saved_once and reloaded.settings.music == 0.10 and "Recovered" in reloaded.save_problem, "Fresh Main recovers a newer valid staged generation and explains recovery")
	reloaded._start()
	check(reloaded._save_progress() and Store.new(path).load_progress().payload.settings.music == 0.10, "Recovered progress can resume and save a new verified generation")
	await _dispose(reloaded)
	reloaded = null
	await create_timer(0.15).timeout
	var report = {"kind": "Godot Main/settings/input/save recovery in isolated QA storage; generated viewport events and controlled state fixtures, not human/device input or timing", "engine": Engine.get_version_info().string, "audio_driver": AudioServer.get_driver_name(), "checks": checks, "failures": failures, "profile": folder, "ordinary_save_accessed": false, "two_instance_scope": "Two real Main nodes share a test-local loopback lock in one engine process; packaged multi-process startup remains a separate check", "measurements": measurements}
	var output = folder.path_join("results.json")
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--recovery-output="): output = arg.trim_prefix("--recovery-output=")
	var file = FileAccess.open(output, FileAccess.WRITE)
	if file: file.store_string(JSON.stringify(report, "\t") + "\n"); file.close()
	print(JSON.stringify(report))
	quit(0 if failures.is_empty() else 1)
