extends "res://native_feedback_probe.gd"
const CopySim = preload("res://scripts/simulation.gd")

func run():
	folder = OS.get_cache_dir().path_join("dustlings-accessibility-" + str(OS.get_process_id()) + "-" + str(Time.get_ticks_usec()))
	DirAccess.make_dir_recursive_absolute(folder)
	DirAccess.make_dir_recursive_absolute(output)
	print("VALID_IMPORT_PROBE pid=", OS.get_process_id(), " isolated_storage=", folder)
	game = ProbeMain.new()
	game.probe_path = folder.path_join("courtyard.json")
	game.child_entered_tree.connect(func(child):
		if child is FileDialog: child.use_native_dialog = false)
	root.add_child(game)
	await settle()
	game._start()
	game._show_settings()
	await settle()
	var copied = CopySim.new()
	for i in 14: copied.collect(i, 1.0, "brushed")
	copied.elapsed = 50
	var preferences = {"music": 0.25, "sfx": 0.4, "ambience": 0.3, "gentle": true, "tap": true, "quality": false}
	var payload = {"game": copied.serialise(), "settings": preferences}
	var copy_path = folder.path_join("valid-copy.json")
	check(game.save_store.export_copy(copy_path, payload), "A different real valid courtyard/settings copy is written and verified")
	check(game.sim.cleaned != copied.cleaned and game.settings != preferences, "Imported progress/preferences differ from the current courtyard")
	var launch_button = button_named("Load a copy")
	launch_button.grab_focus()
	launch_button.pressed.emit()
	var dialog: FileDialog
	for child in game.get_children():
		if child is FileDialog: dialog = child
	check(is_instance_valid(dialog) and not dialog.use_native_dialog, "Valid import uses the actual production callback with an embedded-picker fixture")
	dialog.hide()
	dialog.file_selected.emit(copy_path)
	check(game.sim.cleaned == copied.cleaned and game.sim.motes == copied.motes and game.sim.crew.size() == copied.crew.size() and game.settings == preferences, "Selected valid copy immediately restores its intended progress and every preference")
	await settle()
	check(game.modal_kind.is_empty() and not is_instance_valid(game.modal) and not is_instance_valid(launch_button), "Settings and its initiating button are freed before deferred callback completion")
	check(not game.paused and game.audio.active and not game.audio.is_paused and game.sim.elapsed > copied.elapsed, "World and started soundscape resume after successful import")
	check(root.gui_get_focus_owner() == game.brush_button and game.brush_button.is_visible_in_tree(), "Deferred file-dialog focus does not replace the live Brush focus")
	check(game.tip.is_visible_in_tree() and game.tip.text == "Your courtyard is here.", "Successful load confirmation appears in the visible world")
	check(not game.brushing and not game.brush_keyboard_held and game.tap_remaining == 0 and not game.dragging_camera, "Valid load does not revive held input")
	var saved = game.save_store.read_copy(game.probe_path)
	check(saved != null and saved.settings == preferences and saved.game.cleaned == copied.cleaned, "Loaded progress/preferences are also saved through the production path")
	await screenshot("valid-import-return")
	var report = {"scope": "Additional single valid-import production callback with different saved progress/preferences, started audio and deferred Settings free/focus processing. Generated embedded picker, not physical OS picker operation.", "main_sha256": FileAccess.get_sha256("res://scripts/main.gd"), "pid": OS.get_process_id(), "checks": checks, "failures": failures, "qa_storage": folder}
	write_text(output.path_join("results.json"), JSON.stringify(report, "  "))
	print("VALID_IMPORT_RESULT passed=", checks.size(), " failed=", failures.size())
	for failure in failures: print("OBSERVED_FAILURE: ", failure)
	await game.audio.shutdown()
	game.instance_lock.stop()
	game.free()
	await create_timer(0.15).timeout
	quit(0 if failures.is_empty() else 1)
