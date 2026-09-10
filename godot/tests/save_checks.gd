extends SceneTree
const Sim = preload("res://scripts/simulation.gd")
const Store = preload("res://scripts/save_store.gd")
var checks: Array = []
var failures: Array = []
func check(value: bool, name: String):
	if value: checks.append(name)
	else: failures.append(name); push_error(name)
func write(path: String, payload: Variant):
	var file = FileAccess.open(path, FileAccess.WRITE)
	file.store_string(JSON.stringify(payload))
	file.close()
func _init():
	var folder = OS.get_cache_dir().path_join("dustlings-save-check-" + str(Time.get_ticks_usec()))
	DirAccess.make_dir_recursive_absolute(folder)
	var path = folder.path_join("test.json")
	var sim = Sim.new()
	var settings = {"music": 0.35, "sfx": 0.7, "ambience": 0.2, "gentle": true, "tap": true, "quality": false}
	var payload = {"game": sim.serialise(), "settings": settings}
	var a = Store.new(path)
	check(not a.load_progress().ok, "Fresh store has no invented progress")
	check(a.save_progress(payload).ok, "First verified save writes primary")
	var b = Store.new(path)
	check(b.load_progress().payload.settings == settings, "Preferences survive a separate store instance")
	sim.collect(0, 1, "brushed")
	payload.game = sim.serialise()
	check(a.save_progress(payload).ok and FileAccess.file_exists(path + ".backup"), "Second generation preserves valid backup")
	check(not b.save_progress(payload).ok, "A stale instance cannot overwrite newer progress")
	var next = payload.duplicate(true)
	next.revision = 3
	sim.collect(1, 1, "brushed")
	next.game = sim.serialise()
	write(path + ".new", next)
	var recovered = Store.new(path)
	var read = recovered.load_progress()
	check(read.ok and read.recovered and read.payload.game.earned == 2, "Interrupted promotion resumes newer verified staged progress")
	write(path, {"broken": true})
	DirAccess.remove_absolute(path + ".new")
	var backup_store = Store.new(path)
	check(backup_store.load_progress().recovered, "Corrupt primary falls back to valid backup")
	var before = FileAccess.get_file_as_string(path + ".backup")
	check(backup_store.save_progress({"game": Sim.new().serialise(), "settings": settings}).ok, "Recovered store can save without copying corrupt bytes to backup")
	var fresh = Store.new(path)
	check(fresh.load_progress().ok, "Recovered write remains loadable")
	var invalid = payload.duplicate(true)
	invalid.game.motes = 999999
	var primary_before = FileAccess.get_file_as_string(path)
	check(not fresh.save_progress(invalid).ok and FileAccess.get_file_as_string(path) == primary_before, "Rejected state leaves valid primary unchanged")
	check(fresh.export_copy(folder.path_join("copy.json"), payload), "Export writes and verifies a movable copy")
	check(JSON.stringify(fresh.read_copy(folder.path_join("copy.json")).game) == JSON.stringify(JSON.parse_string(JSON.stringify(payload.game))), "Imported copy retains exact game data")
	var absent = Store.new(folder.path_join("missing/blocked.json"))
	check(not absent.save_progress(payload).ok, "Unavailable destination reports failure without false saved state")
	var corrupt_path = folder.path_join("corrupt.json")
	write(corrupt_path, {"unreadable": true})
	var corrupt = Store.new(corrupt_path)
	corrupt.load_progress()
	check(corrupt.save_progress(payload).ok, "Unreadable original is preserved before a fresh start")
	var preserved = false
	for name in DirAccess.get_files_at(folder):
		if name.begins_with("corrupt.json.unreadable-"): preserved = true
	check(preserved, "Unreadable original has an inspectable retained copy")
	var first_lock = TCPServer.new()
	var first_error = first_lock.listen(0, "127.0.0.1")
	var second_lock = TCPServer.new()
	check(first_error == OK and second_lock.listen(first_lock.get_local_port(), "127.0.0.1") != OK, "Loopback instance lock admits only one writer at a time")
	first_lock.stop()
	second_lock.stop()
	var report = {"kind": "Actual Godot filesystem and loopback-lock checks in a unique temporary folder; no human test.", "checks": checks, "failures": failures, "folder": folder}
	write("res://../evidence/3d/save-checks.json", report)
	print(JSON.stringify(report))
	quit(0 if failures.is_empty() else 1)
