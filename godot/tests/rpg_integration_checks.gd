extends SceneTree
## Real instantiated scene and CharacterBody3D/InputEvent checks in headless Godot.
## Fixed-fps automation is not native visual QA, human controls, or performance.
var game
var checks: Array = []
var failures: Array = []
var observations: Array = []
var held: Dictionary = {}
var hashes: Dictionary = {}
var output = "res://../evidence/rpg/integration"

func _init() -> void:
	if "--rpg-qa" not in OS.get_cmdline_user_args():
		push_error("Scene tests require --rpg-qa to protect normal player saves.")
		quit(2)
		return
	for path in ["rpg_main.gd", "rpg_environment.gd", "rpg_actor.gd", "rpg_story.gd", "rpg_save.gd"]:
		hashes[path] = FileAccess.get_sha256("res://scripts/" + path)
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--integration-evidence="): output = arg.trim_prefix("--integration-evidence=")
	call_deferred("run")

func check(value: bool, name: String, details: Dictionary = {}) -> void:
	var item = {"check": name, "ok": value}
	if not details.is_empty(): item.details = details
	if value: checks.append(item)
	else: failures.append(item); push_warning(name)

func frames(count: int) -> void:
	for i in count: await physics_frame
	await process_frame

func remove_game() -> void:
	await game.audio.shutdown()
	# --fixed-fps advances the SceneTreeTimer faster than wall time. The Dummy
	# mixing thread still needs its real drain interval before destroying a scene.
	if AudioServer.get_driver_name() == "Dummy": OS.delay_msec(650)
	game.queue_free()
	await frames(5)

func key(code: int, pressed: bool) -> void:
	if held.get(code, false) == pressed: return
	held[code] = pressed
	var event = InputEventKey.new()
	event.physical_keycode = code
	event.keycode = code
	event.pressed = pressed
	Input.parse_input_event(event)

func release() -> void:
	for code in held.keys(): key(code, false)

func walk(target: Vector3, label: String, limit: int = 720) -> bool:
	var reached = false
	for i in limit:
		var delta: Vector3 = target - game.player.position
		delta.y = 0
		if delta.length() < 0.19: reached = true; break
		var local = Basis(Vector3.UP, -game.yaw) * delta
		key(KEY_D, local.x > 0.11)
		key(KEY_A, local.x < -0.11)
		key(KEY_S, local.z > 0.11)
		key(KEY_W, local.z < -0.11)
		await physics_frame
	release()
	await frames(3)
	observations.append({"route": label, "reached": reached, "position": str(game.player.position), "nearest": game.nearest})
	return reached

func near_anchor(id: String) -> bool:
	return game.player.position.distance_to(game.anchors[id]) < 2.1 and game._line_clear(game.anchors[id])

func controls(node: Node, kind: String) -> Array:
	var result: Array = []
	for child in node.get_children():
		if child.is_class(kind): result.append(child)
		result.append_array(controls(child, kind))
	return result

func import_fixture(path: String, payload: Dictionary) -> void:
	var file = FileAccess.open(path, FileAccess.WRITE)
	file.store_string(JSON.stringify(payload)); file.close()
	game._show_settings()
	await frames(5)
	game._file_copy(true)
	await frames(2)
	var pickers = controls(game, "FileDialog")
	if pickers.is_empty():
		check(false, "Production import opens a FileDialog for signal fixture")
		return
	pickers[-1].file_selected.emit(path)
	await frames(8)

func run() -> void:
	root.size = Vector2i(1280, 800)
	root.content_scale_size = Vector2i(1280, 800)
	game = load("res://scenes/neighborhood.tscn").instantiate()
	root.add_child(game)
	await frames(5)
	check(game.qa and game.save_store.path != "user://neighborhood-v1.json", "Integration uses isolated QA save namespace")
	check(is_instance_valid(game.modal) and game.modal_kind == "welcome", "Actual opening presents a deliberate start")
	game._close_modal()
	await frames(4)
	check(game.player.is_on_floor() and absf(game.player.position.y) < 0.1, "Player capsule settles into grounded contact")
	var moved = await walk(Vector3(.5,0,7.4), "opening lantern")
	check(moved and near_anchor("lantern"), "Generated physical walking reaches first brushing target")
	var previous: Vector3 = game.player.position
	var dust_before: float = game.patch_amount.lantern
	game.dialogue_id = "lantern"
	game._show_dialogue(game.story.interact("lantern"))
	await frames(5)
	var world_time: float = game.world._world_time
	key(KEY_W, true); key(KEY_SPACE, true)
	await frames(30)
	release()
	check(game.player.position.distance_to(previous) < 0.001 and game.patch_amount.lantern == dust_before, "Dialogue prevents incidental walking and brushing")
	check(not game.audio.is_paused, "Dialogue retains the engine soundscape")
	check(game.world._world_time > world_time, "Dialogue retains living environmental animation", {"before": world_time, "after": game.world._world_time})
	var dialog_rect: Rect2 = game.modal.get_global_rect()
	check(dialog_rect.position.x >= 0 and dialog_rect.position.y >= 0 and dialog_rect.end.x <= 1280 and dialog_rect.end.y <= 800, "Dialogue Control bounds fit configured 1280x800 canvas", {"rect": str(dialog_rect)})
	game._close_modal()
	await frames(3)
	game._show_settings()
	await frames(5)
	world_time = game.world._world_time
	await frames(30)
	check(game.audio.is_paused and game.world._world_time == world_time, "Explicit pause stops ambience streams and decorative world time")
	game._close_modal()
	await frames(3)
	# Walk to the bridge before forming a companion, and attempt the full brush.
	await walk(Vector3(0,0,-2.2), "unrepaired bridge approach")
	check(near_anchor("bridge"), "Unrepaired crossing is a reachable, inspectable objective")
	key(KEY_SPACE, true)
	await frames(540)
	release()
	check(game.patch_amount.bridge == 1.0 and not game.story.has("bridge_cleared"), "Early bridge brushing preserves its future task until a companion exists")
	key(KEY_W, true)
	await frames(180)
	release()
	check(game.player.position.z > -4.0, "Actual unrepaired crossing collider blocks walking into locked north", {"position": str(game.player.position)})
	# Restore normal opening route through actual movement; no progress injection.
	await walk(Vector3(0,0,0), "back from bridge")
	await walk(Vector3(.5,0,7.4), "return to lantern")
	key(KEY_SPACE, true)
	await frames(290)
	release()
	check(game.story.has("first_companion") and game.companions.size() == 1 and game.patch_amount.lantern == 0, "Actual held brush transforms dust into the first 3D companion")
	check(game._save(), "Physical opening progress passes strict RPG save validation")
	var saved = game.save_store.load_progress()
	check(saved.ok and saved.payload.game.flags.get("first_companion", false), "Saved physical opening preserves companion reward")
	# Initial residents and interiors remain optional, reached in a different order.
	await walk(Vector3(-2,0,4.4), "Ivo approach")
	check(game.nearest == "ivo", "Ivo is physically reachable for introductory conversation")
	var resident_min_distance = INF
	key(KEY_W, true)
	for i in 90:
		await physics_frame
		resident_min_distance = minf(resident_min_distance, Vector2(game.player.position.x - game.residents.ivo.body.position.x, game.player.position.z - game.residents.ivo.body.position.z).length())
	release()
	await frames(3)
	check(resident_min_distance >= 0.54 and game.player.position.z >= game.residents.ivo.body.position.z + 0.52, "Player capsule cannot walk through an idle resident", {"minimum_ground_distance": resident_min_distance, "player": str(game.player.position), "resident": str(game.residents.ivo.body.position), "player_mask": game.player.collision_mask})
	await walk(Vector3(-5.7,0,3.0), "Tavi approach")
	check(game.nearest == "tavi", "Tavi is physically reachable before restoration")
	await walk(Vector3(-6,0,7.8), "home street")
	await walk(Vector3(-10,0,7.8), "home door")
	check(near_anchor("home"), "Home door can be inspected from the street")
	await walk(Vector3(-10,0,4.5), "home interior")
	check(near_anchor("bed"), "Player enters real home and reaches optional rest")
	key(KEY_W, true)
	await frames(160)
	release()
	check(game.player.position.z > 1.85, "Actual home back wall prevents walking through architecture", {"position": str(game.player.position)})
	await walk(Vector3(-10,0,7.8), "leave home")
	await walk(Vector3(-6,0,7.8), "home street exit")
	await walk(Vector3(0,0,4.4), "return plaza")
	await walk(Vector3(8.6,0,2.8), "Mara approach")
	check(game.nearest == "mara", "Mara is physically reachable beside workshop")
	check(near_anchor("workshop"), "Workshop entrance is reachable and visible")
	await walk(Vector3(6.4,0,4), "wood approach")
	check(near_anchor("wood"), "Salvaged bridge wood is physically reachable")
	await walk(Vector3(6.4,0,2.8), "parcel approach")
	check(near_anchor("parcel"), "Courier parcel is physically reachable")
	await walk(Vector3(0,0,0), "Nell street")
	await walk(Vector3(-3.1,0,-1), "Nell approach")
	check(game.nearest == "nell", "Nell can be introduced before the crossing opens")
	# Modal overflow constraints at a simulated compact canvas, not a device test.
	root.size = Vector2i(1080,720)
	root.content_scale_size = Vector2i(1080,720)
	game._show_journal()
	await frames(5)
	var journal_rect: Rect2 = game.modal.get_global_rect()
	check(not controls(game.modal, "ScrollContainer").is_empty() and journal_rect.position.y >= 0 and journal_rect.end.y <= 720, "Journal has scrolling and fits configured compact canvas", {"rect": str(journal_rect)})
	game._close_modal()
	await frames(3)
	game._show_settings()
	await frames(5)
	var settings_rect: Rect2 = game.modal.get_global_rect()
	check(settings_rect.position.y >= 0 and settings_rect.end.y <= 720, "Settings Control bounds fit configured compact canvas", {"rect": str(settings_rect)})
	game._close_modal()
	await frames(3)
	# Save/load keeps real state. A second scene reload is bounded and isolated.
	game.story.interact("mara")
	game.story.choose("mara_concern")
	game.story.perform("home_sage")
	check(game._save(), "Relationship/home choice combine with physical progress in saved envelope")
	var before_reload: Dictionary = game.story.export_state()
	var position_before: Vector3 = game.player.position
	await remove_game()
	game = load("res://scenes/neighborhood.tscn").instantiate()
	root.add_child(game)
	await frames(8)
	check(game._start_saved and game.story.export_state() == before_reload, "New scene instance reloads all authored flags/home without loss")
	check(game.player.position.distance_to(position_before) < 0.2, "Reload restores the grounded safe player position")
	# A syntactically valid copy can contain a point inside architecture. The live
	# scene must recover it using actual colliders, not duplicate map constants.
	var bad_position_payload: Dictionary = game.save_store.load_progress().payload.duplicate(true)
	bad_position_payload.position = [-10.0, 0.0, 1.7]
	var qa_save_path: String = game.save_store.path
	check(game.save_store.export_copy(qa_save_path, bad_position_payload), "Isolated fixture writes a format-valid in-bounds wall position")
	await remove_game()
	game = load("res://scenes/neighborhood.tscn").instantiate()
	root.add_child(game)
	await frames(8)
	var shape = CapsuleShape3D.new()
	shape.radius = .26
	shape.height = 1.4
	var query = PhysicsShapeQueryParameters3D.new()
	query.shape = shape
	query.transform = Transform3D(Basis.IDENTITY, game.player.position + Vector3(0,.75,0))
	query.collision_mask = 1
	query.exclude = [game.player.get_rid()]
	var overlaps = game.get_world_3d().direct_space_state.intersect_shape(query)
	var obstacle_names: Array = []
	for hit in overlaps: obstacle_names.append(str(hit.collider.name))
	check(overlaps.is_empty(), "Live load recovers a format-valid wall overlap to reachable ground", {"position": str(game.player.position), "overlap_colliders": obstacle_names})
	check(game.story.export_state() == before_reload, "Spatial recovery preserves authored progress/home")
	# Exercise the production file-selected callback with actual JSON files. This
	# checks integration only, not native OS-picker usability or physical input.
	var imported: Dictionary = game._payload()
	imported.settings.music = 0.0
	imported.settings.sfx = 0.2
	imported.settings.ambience = 0.3
	await import_fixture(qa_save_path.get_base_dir().path_join("quiet-copy.dustlings"), imported)
	check(game.audio.music_level == game.settings.music and game.audio.effects_level == game.settings.sfx and game.audio.ambience_level == game.settings.ambience, "Import immediately applies its displayed sound settings to actual soundscape", {"settings": game.settings, "audio_levels": [game.audio.music_level, game.audio.effects_level, game.audio.ambience_level]})
	var restored_story = load("res://scripts/rpg_story.gd").new()
	restored_story.perform("first_companion")
	restored_story.interact("mara")
	restored_story.choose("mara_plan")
	restored_story.perform("collect_wood")
	restored_story.perform("clear_bridge")
	restored_story.perform("repair_bridge")
	restored_story.interact("tavi")
	restored_story.perform("gather_herbs")
	restored_story.perform("share_table")
	var later_copy: Dictionary = game._payload()
	later_copy.game = restored_story.export_state()
	later_copy.patches = {"lantern": 0.0, "bridge": 0.0}
	later_copy.position = [0,0,9]
	await import_fixture(qa_save_path.get_base_dir().path_join("later-copy.dustlings"), later_copy)
	check(game.story.has("bridge_repaired") and game.companions.size() == 3 and game.residents.nell.target.z < -6, "Import of later checkpoint applies physical progress and resident destination")
	game._close_modal()
	await frames(3)
	# Explicit campaign fixture: imported repaired crossing/shared table, followed
	# by 72 simulated seconds of the actual resident navigation/collision code.
	var crowd_min_distance = INF
	for i in 4320:
		await physics_frame
		for left in range(game.residents.size()):
			for right in range(left + 1, game.residents.size()):
				var a: Vector3 = game.residents.values()[left].body.position
				var b: Vector3 = game.residents.values()[right].body.position
				crowd_min_distance = minf(crowd_min_distance, Vector2(a.x-b.x,a.z-b.z).length())
	await process_frame
	var travel: Dictionary = {}
	for id in game.residents:
		var resident = game.residents[id]
		var gap = Vector2(resident.body.position.x-resident.target.x,resident.body.position.z-resident.target.z).length()
		travel[id] = {"position": str(resident.body.position), "target": str(resident.target), "gap": gap, "route": str(resident.route)}
		check(gap < 0.45, id + " reaches actual restored-neighborhood destination within 72 fixture seconds", travel[id])
	check(crowd_min_distance >= 0.54, "Resident physical routes preserve separate capsule bodies", {"minimum_ground_distance": crowd_min_distance})
	observations.append({"fixture": "Imported repaired crossing/shared table, 72 fixed-fps simulated seconds; no pacing/performance/player claim", "travel": travel})
	var fresh_story = load("res://scripts/rpg_story.gd").new()
	var earlier_copy: Dictionary = game._payload()
	earlier_copy.game = fresh_story.export_state()
	earlier_copy.patches = {"lantern": 1.0, "bridge": 1.0}
	earlier_copy.position = [0,0,9]
	await import_fixture(qa_save_path.get_base_dir().path_join("earlier-copy.dustlings"), earlier_copy)
	check(not game.story.has("first_companion") and game.companions.is_empty(), "Earlier copy removes unearned companion workforce")
	check(game.patches.lantern.visible and game.patches.bridge.visible, "Earlier copy restores visible dust for unfinished tasks", {"patch_amount": game.patch_amount, "visible": [game.patches.lantern.visible, game.patches.bridge.visible]})
	var destinations_reset = true
	for resident in game.residents.values():
		if resident.target != resident.home: destinations_reset = false
	check(destinations_reset, "Earlier copy restores resident destinations before locked crossing")
	var residents_accessible = true
	var rollback_positions: Dictionary = {}
	for id in game.residents:
		rollback_positions[id] = str(game.residents[id].body.position)
		if game.residents[id].body.position.z < -4.0: residents_accessible = false
	check(residents_accessible, "Earlier copy restores residents to the reachable side of a newly locked crossing", {"positions": rollback_positions})
	var end_hashes: Dictionary = {}
	for path in hashes: end_hashes[path] = FileAccess.get_sha256("res://scripts/" + path)
	var report = {"kind": "Headless actual-scene InputEvent/physics fixtures; fixed fps; no native presentation, listening, human usability, or performance claim", "engine": Engine.get_version_info(), "source_at_start": hashes, "source_at_end": end_hashes, "source_changed_during_run": end_hashes != hashes, "checks": checks, "failures": failures, "observations": observations, "qa_save": game.save_store.path, "unverified": ["Actual packaged processes and OS save picker", "Human attachment, surprise, comfort and native visual clipping"]}
	DirAccess.make_dir_recursive_absolute(output)
	var file = FileAccess.open(output.path_join("report.json"), FileAccess.WRITE)
	file.store_string(JSON.stringify(report, "  ")); file.close()
	print(JSON.stringify(report))
	await remove_game()
	quit(0 if failures.is_empty() else 1)
