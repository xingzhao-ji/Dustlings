extends "res://native_feedback_probe.gd"

func focus_text() -> String:
	var focus = root.gui_get_focus_owner()
	return focus.text if focus is Button else str(focus)

func run():
	folder = OS.get_cache_dir().path_join("dustlings-accessibility-" + str(OS.get_process_id()) + "-" + str(Time.get_ticks_usec()))
	DirAccess.make_dir_recursive_absolute(folder)
	DirAccess.make_dir_recursive_absolute(output)
	game = ProbeMain.new()
	game.probe_path = folder.path_join("courtyard.json")
	root.add_child(game)
	await settle()
	game.started = true
	game._show_settings()
	button_named("Controls & help").grab_focus()
	game._qa_key(KEY_ENTER)
	await settle()
	var initial_focus = focus_text()
	check(game.modal_kind == "help", "Keyboard Enter opens Help through its real Settings button")
	check(root.gui_get_focus_owner() != null, "Help gives the player a visible initial focused action")
	await screenshot("help-entry")
	game._qa_key(KEY_ENTER)
	await settle()
	var after_enter = {"modal": game.modal_kind, "focus": focus_text()}
	game._qa_key(KEY_TAB)
	await process_frame
	var first_tab = focus_text()
	game._qa_key(KEY_TAB)
	await process_frame
	var second_tab = focus_text()
	check(first_tab == "Let the crew roam" and second_tab == "Back to settings", "Default Tab traversal reaches only the two Help actions")
	game._qa_key(KEY_ENTER)
	await settle()
	check(game.modal_kind == "settings" and game.paused, "Keyboard activation of Back returns safely to paused Settings")
	var report = {"scope": "One native generated keyboard Help-entry/navigation check; no physical input or human comfort judgment", "main_sha256": FileAccess.get_sha256("res://scripts/main.gd"), "pid": OS.get_process_id(), "initial_focus": initial_focus, "after_initial_Enter": after_enter, "first_Tab": first_tab, "second_Tab": second_tab, "checks": checks, "failures": failures}
	write_text(output.path_join("results.json"), JSON.stringify(report, "  "))
	print("HELP_RESULT pid=", OS.get_process_id(), " passed=", checks.size(), " failed=", failures.size(), " initial_focus=", initial_focus)
	await game.audio.shutdown()
	game.instance_lock.stop()
	game.free()
	await create_timer(0.15).timeout
	quit(0 if failures.is_empty() else 1)
