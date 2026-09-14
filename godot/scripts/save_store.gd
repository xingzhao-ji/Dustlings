class_name CourtyardSaveStore
extends RefCounted
const Sim = preload("res://scripts/simulation.gd")
const MAX_BYTES = 2000000
var path: String
var revision = 0
var failed_original = false

func _init(file_path: String):
	path = file_path

func _valid(payload: Variant) -> bool:
	if not payload is Dictionary: return false
	if not payload.get("settings", {}) is Dictionary: return false
	var sequence = payload.get("revision", 0)
	if not (sequence is int or sequence is float) or not is_finite(sequence) or sequence < 0 or sequence != floorf(sequence): return false
	var probe = Sim.new()
	return probe.restore(payload.get("game"))

func _read(file_path: String) -> Variant:
	var file = FileAccess.open(file_path, FileAccess.READ)
	if not file: return null
	if file.get_length() > MAX_BYTES:
		file.close()
		return null
	var parser = JSON.new()
	var result = parser.parse(file.get_as_text())
	file.close()
	# Damaged generations are an expected recovery case. The instance parser
	# returns its error without emitting an engine error for each retry.
	if result != OK: return null
	var payload = parser.data
	return payload if _valid(payload) else null

func _latest() -> Dictionary:
	var result: Dictionary = {}
	for suffix in ["", ".new", ".backup"]:
		var payload = _read(path + suffix)
		if payload != null and (result.is_empty() or payload.get("revision", 0) > result.payload.get("revision", 0)):
			result = {"payload": payload, "suffix": suffix}
	return result

func load_progress() -> Dictionary:
	var result = _latest()
	if result.is_empty():
		failed_original = FileAccess.file_exists(path)
		return {"ok": false, "message": "The save could not be read. The original file is preserved." if failed_original else ""}
	revision = int(result.payload.get("revision", 0))
	return {"ok": true, "payload": result.payload, "recovered": result.suffix != "", "message": "Recovered the latest safe checkpoint." if result.suffix != "" else ""}

func save_progress(payload: Dictionary) -> Dictionary:
	if not _valid(payload): return {"ok": false, "message": "Save verification failed. Keep this window open and save a copy."}
	var disk = _latest()
	if not disk.is_empty() and disk.payload.get("revision", 0) > revision:
		return {"ok": false, "conflict": true, "message": "Newer progress is saved elsewhere. Save a copy of this branch before closing."}
	# Keep an unreadable original inspectable before writing a new start.
	if failed_original:
		var preserved = path + ".unreadable-" + str(Time.get_unix_time_from_system()).replace(".", "-")
		if DirAccess.copy_absolute(path, preserved) != OK:
			return {"ok": false, "message": "The unreadable original could not be preserved. Save a copy to another folder."}
		failed_original = false
	var candidate = payload.duplicate(true)
	candidate.revision = revision + 1
	var staged = path + ".new"
	var file = FileAccess.open(staged, FileAccess.WRITE)
	if not file: return {"ok": false, "message": "Could not save. Keep this window open and save a copy."}
	file.store_string(JSON.stringify(candidate))
	file.flush()
	var error = file.get_error()
	file.close()
	if error != OK or _read(staged) == null:
		return {"ok": false, "message": "The save was interrupted. Keep this window open and save a copy."}
	# Backup copies the last valid generation, never corrupt bytes.
	if not disk.is_empty():
		var backup = FileAccess.open(path + ".backup.new", FileAccess.WRITE)
		if not backup: return {"ok": false, "message": "Backup could not be written. Save a copy before closing."}
		backup.store_string(JSON.stringify(disk.payload))
		backup.flush()
		backup.close()
		if _read(path + ".backup.new") == null or DirAccess.rename_absolute(path + ".backup.new", path + ".backup") != OK:
			return {"ok": false, "message": "Backup verification failed. Save a copy before closing."}
	if DirAccess.rename_absolute(staged, path) != OK:
		return {"ok": false, "message": "Save could not be replaced. Its safe staged copy is retained."}
	revision += 1
	return {"ok": true, "revision": revision, "message": ""}

func export_copy(file_path: String, payload: Dictionary) -> bool:
	if not _valid(payload): return false
	var file = FileAccess.open(file_path, FileAccess.WRITE)
	if not file: return false
	file.store_string(JSON.stringify(payload))
	file.flush()
	file.close()
	return _read(file_path) != null

func read_copy(file_path: String) -> Variant:
	return _read(file_path)
