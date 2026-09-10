extends "res://native_feedback_probe.gd"

func state() -> Dictionary:
	var focus = root.gui_get_focus_owner()
	return {"focus": focus.text if focus is Button else str(focus), "mode": game.mode, "keyboard_aim": game.keyboard_aim, "pointer": str(game.keyboard_pointer), "assignment": str(game.sim.assignment), "held": game.brush_keyboard_held, "brushed": game.sim.stats.brushed, "modal": game.modal_kind}

func return_to_world():
	game._show_settings()
	await settle()
	game._qa_key(KEY_ENTER)
	await settle()
	game._stop_input()
	game.sim.release()
	game._set_mode("brush")
	game.keyboard_aim = false
	game.keyboard_pointer = Vector2.ZERO
	game._qa_mouse(game.camera.unproject_position(Vector3(-4, 0, 2)))
	await process_frame

func direct_case(id: String, use_n: bool):
	var before = state()
	game._qa_key(KEY_D)
	var selected = state()
	if use_n: game._qa_key(KEY_N)
	game._qa_key(KEY_ENTER)
	await settle()
	var after = state()
	cases.append({"id": id, "before": before, "after_D": selected, "after_Enter": after})
	check(selected.mode == "direct", id + ": D selects Direct")
	check(game.mode == "direct" and game.sim.assignment != Vector2.INF, id + ": Enter directs without a focused HUD action replacing the tool")

func run():
	folder = OS.get_cache_dir().path_join("dustlings-accessibility-" + str(OS.get_process_id()) + "-" + str(Time.get_ticks_usec()))
	DirAccess.make_dir_recursive_absolute(folder)
	DirAccess.make_dir_recursive_absolute(output)
	print("FOCUS_PROBE pid=", OS.get_process_id(), " isolated_storage=", folder)
	game = ProbeMain.new()
	game.probe_path = folder.path_join("courtyard.json")
	game.child_entered_tree.connect(func(child):
		if child is FileDialog: child.use_native_dialog = false)
	root.add_child(game)
	await settle()
	game._start()
	for i in 14: game.sim.collect(i, 1.0, "brushed")
	await return_to_world()
	await direct_case("Return-D-Enter", false)
	await return_to_world()
	await direct_case("Return-D-N-Enter", true)
	await return_to_world()
	var before_arrow = state()
	game._qa_key(KEY_RIGHT)
	var after_arrow = state()
	cases.append({"id": "Return-arrow", "before": before_arrow, "after": after_arrow})
	check(game.keyboard_aim and game.keyboard_pointer != Vector2.ZERO, "Return-arrow: arrow aims in the world")
	await return_to_world()
	var before_space = game.sim.stats.brushed
	game._qa_hold_key(KEY_SPACE, true)
	var space_held = state()
	await create_timer(0.12).timeout
	game._qa_hold_key(KEY_SPACE, false)
	cases.append({"id": "Return-Space", "during": space_held, "after": state()})
	check(space_held.held and game.sim.stats.brushed > before_space, "Return-Space: held Space brushes the visible ground target")
	await return_to_world()
	game._qa_key(KEY_N)
	var n_pointer = game.keyboard_pointer
	game._qa_key(KEY_RIGHT)
	check(game.keyboard_aim and game.keyboard_pointer != n_pointer, "Return-N-arrow: arrow changes the existing world aim")
	var n_before = game.sim.stats.brushed
	game._qa_hold_key(KEY_SPACE, true)
	var n_held = state()
	await create_timer(0.12).timeout
	game._qa_hold_key(KEY_SPACE, false)
	cases.append({"id": "Return-N-arrow-Space", "during": n_held, "after": state()})
	check(n_held.held and game.sim.stats.brushed > n_before, "Return-N-Space: held Space brushes after the explicit N handoff")
	var copy_path = folder.path_join("focus-copy.json")
	game._show_settings()
	game.save_store.export_copy(copy_path, game._payload())
	var load_button = button_named("Load a copy")
	load_button.grab_focus()
	load_button.pressed.emit()
	for child in game.get_children():
		if child is FileDialog:
			child.hide()
			child.file_selected.emit(copy_path)
	await settle()
	game._stop_input()
	game.sim.release()
	game.keyboard_aim = false
	game._qa_mouse(game.camera.unproject_position(Vector3(-4, 0, 2)))
	await direct_case("Import-D-Enter", false)
	await screenshot("after-import-D-Enter")
	await return_to_world()
	var tab_event = InputEventKey.new()
	tab_event.keycode = KEY_TAB
	tab_event.pressed = true
	var tab_matches = tab_event.is_action_pressed("ui_focus_next")
	game._qa_key(KEY_TAB)
	var after_tab = state()
	for pressed in [true, false]:
		var shift_tab = InputEventKey.new()
		shift_tab.keycode = KEY_TAB
		shift_tab.shift_pressed = true
		shift_tab.pressed = pressed
		root.push_input(shift_tab, true)
	var after_shift_tab = state()
	cases.append({"id": "HUD-Tab", "after_Tab": after_tab, "after_ShiftTab": after_shift_tab, "tab_matches_ui_focus_next": tab_matches, "button_focus_mode": game.brush_button.focus_mode})
	check(after_tab.focus != "<Object#null>" and after_shift_tab.focus != "<Object#null>" and after_tab.focus != after_shift_tab.focus, "Tab/Shift-Tab can enter and traverse the visible HUD after world handoff")
	var hud_focuses: Array = []
	for i in 7:
		game._qa_key(KEY_TAB)
		var current_focus = root.gui_get_focus_owner()
		if current_focus and current_focus.is_visible_in_tree() and not hud_focuses.has(current_focus.get_instance_id()): hud_focuses.append(current_focus.get_instance_id())
	check(hud_focuses.size() == 7, "Subsequent Tab traversal reaches all seven visible HUD actions")
	game.direct_button.grab_focus()
	game._qa_key(KEY_ENTER)
	check(game.mode == "direct" and root.gui_get_focus_owner() == null, "Keyboard activation of Direct hands focus back to the world")
	game._show_settings()
	await settle()
	var slider = game.modal.find_children("*", "HSlider", true, false)[0]
	slider.grab_focus()
	var prior_volume = slider.value
	var prior_pointer = game.keyboard_pointer
	game._qa_key(KEY_RIGHT)
	check(slider.value > prior_volume and root.gui_get_focus_owner() == slider and game.keyboard_pointer == prior_pointer and game.paused, "Modal slider arrow changes volume while preserving modal focus and world pause")
	var modal_focuses: Array = []
	for i in 10:
		game._qa_key(KEY_TAB)
		var current_focus = root.gui_get_focus_owner()
		if current_focus and game.modal.is_ancestor_of(current_focus) and not modal_focuses.has(current_focus.get_instance_id()): modal_focuses.append(current_focus.get_instance_id())
	check(modal_focuses.size() == 10 and game.paused, "Tab traversal stays within all ten enabled Settings controls")
	for cycle in 8:
		game._show_settings()
		await settle()
		var origin = button_named("Load a copy")
		origin.grab_focus()
		origin.pressed.emit()
		for child in game.get_children():
			if child is FileDialog:
				child.hide()
				child.file_selected.emit(copy_path)
		await settle()
		check(not is_instance_valid(origin) and game.modal_kind.is_empty() and not game.paused and root.gui_get_focus_owner() == null, "Valid import cycle %d frees Settings and leaves intended world focus" % (cycle + 1))
	var report = {"scope": "Native viewport-generated key events after actual Enter-return and production valid-import callback. Controlled two-helper progress and parked valid pointer; no physical input/human claim.", "main_sha256": FileAccess.get_sha256("res://scripts/main.gd"), "pid": OS.get_process_id(), "checks": checks, "failures": failures, "cases": cases, "qa_storage": folder}
	write_text(output.path_join("results.json"), JSON.stringify(report, "  "))
	print("FOCUS_RESULT passed=", checks.size(), " failed=", failures.size())
	for failure in failures: print("OBSERVED_FAILURE: ", failure)
	await game.audio.shutdown()
	game.instance_lock.stop()
	game.free()
	await create_timer(0.15).timeout
	quit(0 if failures.is_empty() else 1)
