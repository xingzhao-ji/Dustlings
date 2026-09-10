extends SceneTree
## Native rendering; generated FileDialog signal outcomes, not OS picker interaction.
class ProbeMain extends "res://scripts/main.gd":
	var probe_path = ""
	func _save_path() -> String:
		assert(probe_path.begins_with(OS.get_cache_dir().path_join("dustlings-accessibility-")))
		return probe_path
	func _acquire_instance():
		instance_lock = TCPServer.new()
		instance_primary = instance_lock.listen(0, "127.0.0.1") == OK

var game: ProbeMain
var checks: Array = []
var failures: Array = []
var cases: Array = []
var folder = ""
var output = ""

func _initialize():
	if not "--qa" in OS.get_cmdline_user_args():
		push_error("Requires --qa; refusing ordinary-save testing.")
		quit(2)
		return
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--probe-output="): output = arg.trim_prefix("--probe-output=")
	if output.is_empty(): quit(2); return
	call_deferred("run")

func check(value: bool, description: String):
	if value: checks.append(description)
	else: failures.append(description)

func settle():
	for i in 8: await process_frame

func write_text(path: String, content: String):
	var file = FileAccess.open(path, FileAccess.WRITE)
	file.store_string(content)
	file.close()

func button_named(text: String) -> Button:
	for button in game.modal.find_children("*", "Button", true, false):
		if button.text == text: return button
	return null

func screenshot(name: String):
	await RenderingServer.frame_post_draw
	root.get_texture().get_image().save_png(output.path_join(name + ".png"))

func outcome(id: String, kind: String, path: String, expected: String, capture = false):
	var before = JSON.stringify(game._payload())
	var previous_tip = game.tip.text
	var previous_modal = game.modal.get_instance_id()
	var button = button_named("Save a copy" if kind == "export" else "Load a copy")
	button.grab_focus()
	button.pressed.emit()
	var dialog: FileDialog
	for child in game.get_children():
		if child is FileDialog: dialog = child
	check(is_instance_valid(dialog) and not dialog.use_native_dialog, id + ": actual production FileDialog callbacks with embedded-picker fixture")
	if not is_instance_valid(dialog): return
	dialog.hide()
	if path == "__cancel__": dialog.canceled.emit()
	else: dialog.file_selected.emit(path)
	await settle()
	var matching: Array = []
	for label in game.modal.find_children("*", "Label", true, false):
		if expected in label.text and label.is_visible_in_tree(): matching.append({"text": label.text, "rect": str(label.get_global_rect())})
	var view = Rect2(Vector2.ZERO, root.get_visible_rect().size)
	var fit = view.encloses(game.modal.get_global_rect())
	for control in game.modal.find_children("*", "Control", true, false):
		if control.is_visible_in_tree() and (control is Button or control is Label or control is HSlider): fit = fit and view.encloses(control.get_global_rect())
	var focus = root.gui_get_focus_owner()
	var state = {"id": id, "visible_status": matching, "tip": game.tip.text, "tip_visible": game.tip.is_visible_in_tree(), "modal_rect": str(game.modal.get_global_rect()), "viewport": str(view), "fits": fit, "focus": focus.text if focus is Button else str(focus), "paused": game.paused, "audio_paused": game.audio.is_paused}
	cases.append(state)
	if path != "__cancel__": check(not matching.is_empty(), id + ": operation result is immediately visible inside Settings")
	else: check(game.tip.text == previous_tip, id + ": cancel does not invent an operation result")
	check(fit, id + ": status and essential controls fit the native viewport")
	check(game.modal.get_instance_id() == previous_modal and game.modal_kind == "settings" and game.paused and game.audio.is_paused, id + ": same Settings panel remains paused")
	check(JSON.stringify(game._payload()) == before, id + ": operation does not change current progress/preferences")
	check(focus == button, id + ": keyboard focus returns to the initiating control")
	check(not game.brushing and not game.brush_keyboard_held and game.tap_remaining == 0 and not game.dragging_camera, id + ": no held input resumes")
	if capture: await screenshot(id)

func run():
	folder = OS.get_cache_dir().path_join("dustlings-accessibility-" + str(OS.get_process_id()) + "-" + str(Time.get_ticks_usec()))
	DirAccess.make_dir_recursive_absolute(folder)
	DirAccess.make_dir_recursive_absolute(output)
	print("ACCESSIBILITY_PROBE pid=", OS.get_process_id(), " isolated_storage=", folder)
	game = ProbeMain.new()
	game.probe_path = folder.path_join("courtyard.json")
	# Native OS picker operation is deliberately outside this deterministic probe.
	# Leave Main's signal closures unchanged; only use the embedded Godot picker.
	game.child_entered_tree.connect(func(child):
		if child is FileDialog: child.use_native_dialog = false)
	root.add_child(game)
	await settle()
	check(game.qa and game.instance_primary and not FileAccess.file_exists(game.probe_path), "Fresh QA path and ephemeral lock; welcome has not written progress")
	# No soundscape starts. This is a paused menu fixture, not an opening playthrough.
	game.started = true
	write_text(folder.path_join("broken.json"), "{broken")
	write_text(folder.path_join("wrong-schema.json"), "{\"game\": {\"unknown\": true}}")
	for size in [Vector2i(1280, 800), Vector2i(960, 640)]:
		root.size = size
		await settle()
		game._show_settings()
		await settle()
		var prefix = str(size.x) + "-"
		await outcome(prefix + "saved-copy", "export", folder.path_join(prefix + "copy.json"), "A copy is saved.", true)
		check(game.save_store.read_copy(folder.path_join(prefix + "copy.json")) != null, prefix + "exported bytes pass the production copy validator")
		await outcome(prefix + "failed-copy", "export", folder.path_join("missing/fail.json"), "The copy could not be saved.")
		await outcome(prefix + "invalid-json", "import", folder.path_join("broken.json"), "not a valid 3D courtyard save", true)
		await outcome(prefix + "invalid-schema", "import", folder.path_join("wrong-schema.json"), "not a valid 3D courtyard save")
		await outcome(prefix + "missing-import", "import", folder.path_join("missing.json"), "not a valid 3D courtyard save")
		await outcome(prefix + "cancel-export", "export", "__cancel__", "")
		await outcome(prefix + "cancel-import", "import", "__cancel__", "")
		var normal_path = game.save_store.path
		game.save_store.path = folder.path_join("missing/current.json")
		game._show_settings()
		await settle()
		check(not game.save_problem.is_empty(), prefix + "existing device-save failure is real and remains recorded")
		await outcome(prefix + "recovery-copy", "export", folder.path_join(prefix + "recovery.json"), "A copy is saved.", true)
		await outcome(prefix + "recovery-invalid", "import", folder.path_join("broken.json"), "not a valid 3D courtyard save", true)
		check(not game.save_problem.is_empty(), prefix + "copy/import feedback does not erase the separate device-save failure")
		game.save_store.path = normal_path
	var report = {"scope": "Actual native Godot rendering and production FileDialog signal callbacks, with embedded-picker fixture and generated outcomes. No physical/native-OS-picker interaction, human session, pacing or performance claim.", "main_sha256": FileAccess.get_sha256("res://scripts/main.gd"), "engine": Engine.get_version_info(), "display": DisplayServer.get_name(), "pid": OS.get_process_id(), "qa_storage": folder, "checks": checks, "failures": failures, "cases": cases}
	write_text(output.path_join("results.json"), JSON.stringify(report, "  "))
	print("ACCESSIBILITY_RESULT passed=", checks.size(), " failed=", failures.size())
	for failure in failures: print("OBSERVED_FAILURE: ", failure)
	await game.audio.shutdown()
	game.instance_lock.stop()
	game.free()
	await create_timer(0.15).timeout
	quit(0 if failures.is_empty() else 1)
