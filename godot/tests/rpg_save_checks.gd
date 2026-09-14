extends SceneTree
const Story = preload("res://scripts/rpg_story.gd")
const Store = preload("res://scripts/rpg_save.gd")
var checks: Array[String] = []
var failures: Array[String] = []
var folder: String

func check(value: bool, description: String) -> void:
	if value: checks.append(description)
	else: failures.append(description); push_error(description)

func write(path: String, payload: Variant) -> void:
	var file = FileAccess.open(path, FileAccess.WRITE)
	file.store_string(JSON.stringify(payload))
	file.close()

func payload(story) -> Dictionary:
	return {"game": story.export_state(), "position": [0.0, 0.0, 9.0], "patches": {"lantern": 0.0 if story.has("first_companion") else 1.0, "bridge": 0.0 if story.has("bridge_cleared") else 1.0}, "settings": {"music": 0.6, "sfx": 0.75, "ambience": 0.55, "gentle": false, "sensitivity": 1.0, "invert": false, "quality": true}}

func _init() -> void:
	folder = OS.get_cache_dir().path_join("dustlings-rpg-save-checks-" + str(Time.get_ticks_usec()))
	DirAccess.make_dir_recursive_absolute(folder)
	var path = folder.path_join("neighborhood-v1.json")
	var legacy_path = folder.path_join("courtyard.json")
	write(legacy_path, {"legacy": "untouched reference"})
	var legacy_hash = FileAccess.get_sha256(legacy_path)
	var story = Story.new()
	var store = Store.new(path)
	check(not store.load_progress().ok, "New namespace invents no progress")
	var initial = payload(story)
	check(store.save_progress(initial).ok and store.revision == 1, "Initial RPG state saves through verified staging")
	var other = Store.new(path)
	check(other.load_progress().ok and other.revision == 1, "Independent store reads current generation")
	story.perform("first_companion")
	story.interact("mara")
	story.choose("mara_plan")
	var current = payload(story)
	current.settings.sensitivity = 0.3
	current.settings.music = 0.0
	check(store.save_progress(current).ok and store.revision == 2, "Real minimum sensitivity and muted volume survive save validation")
	check(not other.save_progress(initial).ok and other.save_progress(initial).get("conflict", false), "Stale store cannot overwrite a newer RPG generation")
	var newer = current.duplicate(true)
	newer.revision = 3
	newer.game.day = 2
	write(path + ".new", newer)
	var recovery = Store.new(path)
	var recovered = recovery.load_progress()
	check(recovered.ok and recovered.recovered and recovery.revision == 3 and recovered.payload.game.day == 2, "Newer valid staged checkpoint wins after interrupted promotion")
	check(recovery.save_progress(recovered.payload).ok and recovery.revision == 4, "Recovered staged generation promotes without losing day/settings")
	# Corrupt primary recovery must preserve corrupt bytes as well as last good data.
	var truncated_file = FileAccess.open(path, FileAccess.WRITE)
	truncated_file.store_string("{\"game\":")
	truncated_file.close()
	var corrupt_primary_bytes = FileAccess.get_file_as_string(path)
	var backup = Store.new(path)
	var fallback = backup.load_progress()
	check(fallback.ok and fallback.recovered, "Damaged primary falls back to verified backup")
	check(backup.save_progress(fallback.payload).ok, "Recovered backup can write safely")
	var kept_primary = false
	for name in DirAccess.get_files_at(folder):
		if name.begins_with("neighborhood-v1.json.unreadable-") and FileAccess.get_file_as_string(folder.path_join(name)) == corrupt_primary_bytes: kept_primary = true
	check(kept_primary, "Damaged primary bytes remain inspectable after successful recovery write")
	# A lone interrupted backup is a real generation, not an empty new game.
	var backup_only_path = folder.path_join("backup-only.json")
	var backup_only_data = current.duplicate(true)
	backup_only_data.revision = 9
	write(backup_only_path + ".backup.new", backup_only_data)
	var backup_only = Store.new(backup_only_path)
	var backup_only_result = backup_only.load_progress()
	check(backup_only_result.ok and backup_only_result.recovered and backup_only.revision == 9, "Interrupted backup-only generation is recoverable")
	check(backup_only.save_progress(backup_only_result.payload).ok and backup_only.revision == 10, "Backup-only recovery can resume normal saving")
	# All damaged generations are retained before creating a new start.
	var damaged_path = folder.path_join("all-damaged.json")
	for suffix in Store.GENERATIONS: write(damaged_path + suffix, {"damaged_generation": suffix})
	var damaged = Store.new(damaged_path)
	check(not damaged.load_progress().ok and "preserved" in damaged.load_progress().message, "All-invalid generations report retained originals")
	check(damaged.save_progress(initial).ok, "Fresh start can replace corrupt generations after preserving them")
	for suffix in Store.GENERATIONS:
		var found = false
		for name in DirAccess.get_files_at(folder):
			if name.begins_with("all-damaged.json" + suffix + ".unreadable-") and JSON.parse_string(FileAccess.get_file_as_string(folder.path_join(name))).get("damaged_generation", "unknown") == suffix: found = true
		check(found, "Unreadable generation '" + suffix + "' preserved exactly")
	var staged_only_path = folder.path_join("bad-staged-only.json")
	write(staged_only_path + ".new", {"bad": true})
	var staged_only = Store.new(staged_only_path)
	check(not staged_only.load_progress().ok and not staged_only.load_progress().message.is_empty(), "Corrupt staged-only save shows recovery message instead of silent fresh start")
	var safe = Store.new(path)
	var valid = safe.load_progress().payload
	var protected_bytes = FileAccess.get_file_as_string(path)
	var invalids: Array = []
	var bad = valid.duplicate(true); bad.settings.music = 1.1; invalids.append(bad)
	bad = valid.duplicate(true); bad.settings.sensitivity = 0.1; invalids.append(bad)
	bad = valid.duplicate(true); bad.settings.gentle = "yes"; invalids.append(bad)
	bad = valid.duplicate(true); bad.settings.erase("quality"); invalids.append(bad)
	bad = valid.duplicate(true); bad.settings.extra = 0; invalids.append(bad)
	bad = valid.duplicate(true); bad.position = [100, 0, 9]; invalids.append(bad)
	bad = valid.duplicate(true); bad.position = [0, 50, 9]; invalids.append(bad)
	bad = valid.duplicate(true); bad.position = [0, -1, 9]; invalids.append(bad)
	bad = valid.duplicate(true); bad.position = [0, 0, -8]; invalids.append(bad)
	bad = valid.duplicate(true); bad.position = [0, 0, INF]; invalids.append(bad)
	bad = valid.duplicate(true); bad.patches.bridge = 0; invalids.append(bad)
	bad = valid.duplicate(true); bad.patches.lantern = 0.1; invalids.append(bad)
	bad = valid.duplicate(true); bad.patches.extra = 1; invalids.append(bad)
	bad = valid.duplicate(true); bad.patches.erase("bridge"); invalids.append(bad)
	bad = valid.duplicate(true); bad.game = "wrong type"; invalids.append(bad)
	bad = valid.duplicate(true); bad.revision = 1.5; invalids.append(bad)
	bad = valid.duplicate(true); bad.revision = 9007199254740992; invalids.append(bad)
	for i in range(invalids.size()):
		check(not safe.save_progress(invalids[i]).ok and FileAccess.get_file_as_string(path) == protected_bytes, "Invalid settings/position/progress envelope " + str(i + 1) + " leaves primary unchanged")
	var edge = valid.duplicate(true)
	edge.position = [0, 0, -3.8]
	check(safe._valid(edge), "Reachable front edge of unrepaired crossing remains saveable")
	story.perform("collect_wood")
	story.perform("clear_bridge")
	story.perform("repair_bridge")
	var repaired = payload(story)
	repaired.position = [0, 0, -8]
	check(safe._valid(repaired), "Repaired crossing permits saving in north neighborhood")
	repaired.position = [12, 0, -12]
	check(not safe._valid(repaired), "Locked greenhouse interior cannot be introduced by an imported save")
	repaired.position = [12, 0, -16]
	check(safe._valid(repaired), "Walking behind unopened greenhouse remains saveable")
	var copy_path = folder.path_join("my-neighborhood-copy.json")
	check(safe.export_copy(copy_path, valid), "Save copy is written and verified")
	check(safe.read_copy(copy_path) == JSON.parse_string(JSON.stringify(valid)), "Imported save copy exactly preserves JSON game/settings/position")
	var missing = Store.new(folder.path_join("missing/blocked.json"))
	check(not missing.save_progress(valid).ok, "Unavailable folder reports failure without a false saved result")
	check(FileAccess.get_sha256(legacy_path) == legacy_hash, "All RPG operations leave legacy courtyard namespace byte-identical")
	var report = {"kind": "Actual Godot filesystem fixtures in unique cache directory; no human or physical input test", "engine": Engine.get_version_info(), "source_sha256": FileAccess.get_sha256("res://scripts/rpg_save.gd"), "story_sha256": FileAccess.get_sha256("res://scripts/rpg_story.gd"), "folder": folder, "checks": checks, "failures": failures}
	DirAccess.make_dir_recursive_absolute("res://../evidence/rpg")
	write("res://../evidence/rpg/save-checks.json", report)
	print(JSON.stringify(report))
	quit(0 if failures.is_empty() else 1)
