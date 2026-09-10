extends "res://scripts/save_store.gd"
## Separate RPG namespace; retains verified staged-write/backup/conflict behavior.
const Story = preload("res://scripts/rpg_story.gd")
const SETTING_RANGES = {"music": [0.0, 1.0], "sfx": [0.0, 1.0], "ambience": [0.0, 1.0], "sensitivity": [0.3, 2.0]}
const BOOLEAN_SETTINGS = ["gentle", "invert", "quality"]
const GENERATIONS = ["", ".new", ".backup", ".backup.new"]

func _valid(payload: Variant) -> bool:
	if not payload is Dictionary or payload.size() not in [4, 5]: return false
	for key in payload:
		if key not in ["game", "settings", "position", "patches", "revision"]: return false
	var sequence = payload.get("revision", 0)
	if not _number(sequence) or sequence < 0 or sequence > 9007199254740990 or sequence != floorf(sequence): return false
	var settings = payload.get("settings")
	if not settings is Dictionary or settings.size() != 7: return false
	for key in SETTING_RANGES:
		var value = settings.get(key)
		if not _number(value) or value < SETTING_RANGES[key][0] or value > SETTING_RANGES[key][1]: return false
	for key in BOOLEAN_SETTINGS:
		if not settings.get(key) is bool: return false
	var pos = payload.get("position", [])
	if not pos is Array or pos.size() != 3: return false
	for n in pos:
		if not _number(n): return false
	# Character feet within the walkable neighborhood's outer walls. Collision
	# recovery inside these bounds remains a live scene capsule test at load time.
	if absf(pos[0]) > 17.75 or pos[2] < -17.45 or pos[2] > 15.45 or pos[1] < -0.05 or pos[1] > 0.5: return false
	var patches = payload.get("patches")
	if not patches is Dictionary or patches.size() != 2 or not patches.has("lantern") or not patches.has("bridge"): return false
	for value in patches.values():
		if not _number(value) or value < 0 or value > 1: return false
	if not payload.get("game") is Dictionary: return false
	var probe = Story.new()
	if not probe.import_state(payload.game): return false
	# A zero patch without its successful action would permanently remove a task;
	# a rewarded patch with residual dust would replay a completed formation.
	if (patches.lantern == 0) != probe.has("first_companion"): return false
	if (patches.bridge == 0) != probe.has("bridge_cleared"): return false
	if not probe.has("bridge_repaired") and pos[2] < -4.0: return false
	if not probe.has("greenhouse_open") and pos[0] > 9.4 and pos[0] < 14.6 and pos[2] < -9.6 and pos[2] > -15.0: return false
	return true

func _number(value: Variant) -> bool:
	return (value is int or value is float) and is_finite(value)

func _latest() -> Dictionary:
	var result: Dictionary = {}
	for suffix in GENERATIONS:
		var payload = _read(path + suffix)
		if payload != null and (result.is_empty() or payload.get("revision", 0) > result.payload.get("revision", 0)):
			result = {"payload": payload, "suffix": suffix}
	return result

func load_progress() -> Dictionary:
	var result = super.load_progress()
	if not result.ok:
		for suffix in GENERATIONS:
			if FileAccess.file_exists(path + suffix):
				result.message = "The save could not be read. The original files are preserved."
				break
	return result

func save_progress(payload: Dictionary) -> Dictionary:
	if not _valid(payload): return {"ok": false, "message": "Save verification failed. Keep this window open and save a copy."}
	var disk = _latest()
	if not disk.is_empty() and disk.payload.get("revision", 0) > revision:
		return {"ok": false, "conflict": true, "message": "Newer progress is saved elsewhere. Save a copy of this branch before closing."}
	# Preserve corrupt staged/backup bytes as well as a corrupt primary. Recovery
	# can succeed from another generation; that is not permission to erase evidence.
	for suffix in GENERATIONS:
		var original = path + suffix
		if not FileAccess.file_exists(original) or _read(original) != null: continue
		var stamp = str(Time.get_unix_time_from_system()).replace(".", "-") + "-" + str(Time.get_ticks_usec())
		var preserved = original + ".unreadable-" + stamp
		if DirAccess.copy_absolute(original, preserved) != OK:
			return {"ok": false, "message": "The unreadable save could not be preserved. Save a copy to another folder."}
	failed_original = false # Already preserved every affected generation above.
	return super.save_progress(payload)
