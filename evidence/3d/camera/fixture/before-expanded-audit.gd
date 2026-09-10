extends SceneTree
## Isolated native camera/raycast audit. Generated coordinates are not human input.
class CameraMain extends "res://scripts/main.gd":
	var audit_path = ""
	func _save_path() -> String:
		assert(audit_path.begins_with(OS.get_cache_dir().path_join("dustlings-camera-audit-")))
		return audit_path
	func _acquire_instance():
		instance_lock = TCPServer.new()
		instance_primary = instance_lock.listen(0, "127.0.0.1") == OK
	func _save_progress() -> bool:
		# This read-only camera fixture never writes game progress.
		return true

var game: CameraMain
var checks: Array = []
var failures: Array = []
var views: Array = []
var controls: Array = []
var findings: Dictionary = {}
var folder = ""
var ever_reachable: Dictionary = {}

func check(value: bool, description: String):
	if value: checks.append(description)
	else: failures.append(description)

func _initialize():
	if not "--qa" in OS.get_cmdline_user_args():
		push_error("Camera audit requires --qa and isolated storage.")
		quit(2)
		return
	call_deferred("run")

func _screen_state(index: int) -> Dictionary:
	var d = game.sim.dust[index]
	var point = Vector3(d.p.x, 0, d.p.y)
	var screen = game.camera.unproject_position(point)
	var rect = root.get_visible_rect()
	var in_view = rect.has_point(screen) and not game.camera.is_position_behind(point)
	var origin = game.camera.project_ray_origin(screen)
	var hit = game.get_world_3d().direct_space_state.intersect_ray(PhysicsRayQueryParameters3D.create(origin, origin + game.camera.project_ray_normal(screen) * 80, 1))
	var on_ground = not hit.is_empty() and hit.collider.get_meta("cleanable", false) and Vector2(hit.position.x, hit.position.z).distance_to(d.p) < 0.06
	var ui = ""
	if in_view:
		for control in controls:
			if control.is_visible_in_tree() and control.mouse_filter != Control.MOUSE_FILTER_IGNORE and control.get_global_rect().has_point(screen):
				ui = str(control.name)
				break
	return {"index":index, "world":[d.p.x,d.p.y], "screen":[screen.x,screen.y], "in_view":in_view, "ground_raycast":on_ground, "hit":str(hit.collider.name) if not hit.is_empty() else "none", "ui":ui, "reachable":in_view and on_ground and ui.is_empty()}

func _set_view(value: float, target: Vector3):
	game.zoom = value
	game.desired_zoom = value
	game.camera_target = target
	game.camera_focus = target
	game._place_camera(1.0)
	await process_frame
	await physics_frame

func _key(code: Key):
	var event = InputEventKey.new()
	event.keycode = code
	event.pressed = true
	game._unhandled_input(event)

func _held():
	game.brushing = true
	game.brush_keyboard_held = true
	game.tap_remaining = 0.8

func _held_cancelled() -> bool:
	return not game.brushing and not game.brush_keyboard_held and game.tap_remaining == 0

func _target_state() -> Dictionary:
	var closest = -1
	var distance = INF
	for i in game.sim.dust.size():
		var d = game.sim.dust[i]
		var screen = game.camera.unproject_position(Vector3(d.p.x,0,d.p.y))
		var next = screen.distance_to(game.keyboard_pointer)
		if next < distance: distance = next; closest = i
	var state = _screen_state(closest)
	state.pointer_distance = distance
	return state

func run():
	folder = OS.get_cache_dir().path_join("dustlings-camera-audit-" + str(OS.get_process_id()))
	DirAccess.make_dir_recursive_absolute(folder)
	game = CameraMain.new()
	game.audit_path = folder.path_join("courtyard.json")
	root.add_child(game)
	game.set_process(false)
	game.set_physics_process(false)
	game.started = true # Expose the actual HUD without starting audio or writing saves.
	game._close_modal()
	await physics_frame
	await process_frame
	controls = game.hud.find_children("*", "Control", true, false)
	print("CAMERA_AUDIT_PID ", OS.get_process_id())
	var positions = [
		{"name":"default", "zoom":1.12, "target":Vector3(0,0.1,0.4)},
		{"name":"frame", "zoom":1.0, "target":Vector3(0,0.1,0.4)},
		{"name":"close_center", "zoom":1.8, "target":Vector3(0,0.1,0.4)},
		{"name":"close_left_rear", "zoom":1.8, "target":Vector3(-3,0.1,-2.2)},
		{"name":"close_right_rear", "zoom":1.8, "target":Vector3(3,0.1,-2.2)},
		{"name":"close_left_front", "zoom":1.8, "target":Vector3(-3,0.1,2.2)},
		{"name":"close_right_front", "zoom":1.8, "target":Vector3(3,0.1,2.2)}]
	for size in [Vector2i(1280,800),Vector2i(960,640)]:
		root.size = size
		game._fit_screen()
		await process_frame
		await process_frame
		for setting in positions:
			await _set_view(setting.zoom,setting.target)
			var sample = {"window":[root.size.x,root.size.y], "logical_viewport":[root.get_visible_rect().size.x,root.get_visible_rect().size.y], "scale_factor":root.content_scale_factor, "view":setting.name, "zoom":setting.zoom, "reachable":0, "offscreen":0, "obstacle":0, "ui":0, "inaccessible_samples":[]}
			for i in game.sim.dust.size():
				var state = _screen_state(i)
				if state.reachable: sample.reachable += 1; ever_reachable[i] = true
				else:
					if not state.in_view: sample.offscreen += 1
					elif not state.ground_raycast: sample.obstacle += 1
					elif not state.ui.is_empty(): sample.ui += 1
					if sample.inaccessible_samples.size() < 8: sample.inaccessible_samples.append(state)
			game._next_dust()
			sample.n_target = _target_state()
			check(sample.n_target.reachable, "N selects an in-view unobscured ground patch: %s %s" % [str(size),setting.name])
			views.append(sample)
	# An actual obstructed remaining cell followed by an accessible alternative.
	root.size = Vector2i(1280,800)
	game._fit_screen()
	await process_frame
	await _set_view(1.12,Vector3(0,0.1,0.4))
	var blocked = -1
	var accessible = -1
	for i in game.sim.dust.size():
		var state = _screen_state(i)
		if blocked == -1 and state.in_view and not state.ground_raycast: blocked = i
		if blocked >= 0 and i > blocked and state.reachable: accessible = i; break
	if blocked >= 0 and accessible >= 0:
		for i in game.sim.dust.size(): game.sim.dust[i].amount = 1 if i in [blocked,accessible] else 0
		game._next_dust()
		var first = _target_state()
		game._next_dust()
		var second = _target_state()
		findings.blocked_remaining = {"first":first,"second":second,"available_alternative":_screen_state(accessible)}
		check(first.reachable or second.reachable, "Repeated N escapes an occluded remaining patch when a visible alternative exists")
	# A remaining cell outside a close/panned view must be brought back into view.
	await _set_view(1.8,Vector3(-3,0.1,-2.2))
	var offscreen = -1
	for i in game.sim.dust.size():
		if not _screen_state(i).in_view: offscreen = i; break
	if offscreen >= 0:
		for i in game.sim.dust.size(): game.sim.dust[i].amount = 1 if i == offscreen else 0
		var before_offscreen = _screen_state(offscreen)
		game._next_dust()
		game._place_camera(1.0)
		game._update_cursor()
		var after_offscreen = _target_state()
		findings.offscreen_remaining = {"before":before_offscreen,"after":after_offscreen,"notice":game.tip.text}
		check(after_offscreen.reachable, "N makes an offscreen remaining patch reachable from a close panned view")
	await _set_view(1.12,Vector3(0,0.1,0.4))
	# Frame/Home must not carry a held sweep across a camera move.
	_held()
	_key(KEY_HOME)
	findings.home = {"cancelled":_held_cancelled(),"zoom":game.desired_zoom,"target":str(game.camera_target)}
	check(_held_cancelled(), "Home cancels a held mouse/keyboard/tap stroke before reframing")
	game._stop_input()
	_held()
	for control in controls:
		if control is Button and control.text == "Frame": control.pressed.emit(); break
	findings.frame = {"cancelled":_held_cancelled(),"zoom":game.desired_zoom,"target":str(game.camera_target)}
	check(_held_cancelled(), "Frame cancels a held mouse/keyboard/tap stroke before reframing")
	game._stop_input()
	# Keyboard aim should not depend on where the physical pointer was parked.
	for i in game.sim.dust.size(): game.sim.dust[i].amount = 1 if i == accessible else 0
	var settings_button: Control
	for control in controls:
		if control is Button and control.text == "Settings": settings_button = control; break
	if accessible >= 0 and settings_button:
		var motion = InputEventMouseMotion.new()
		motion.position = settings_button.get_global_rect().get_center()
		motion.global_position = motion.position
		root.push_input(motion, true)
		await process_frame
		game._next_dust()
		game._update_cursor()
		var hovered = root.gui_get_hovered_control()
		findings.keyboard_with_hud_hover = {"hovered":str(hovered.name) if hovered else "none","cursor_valid":game.cursor_valid,"target":_target_state()}
		check(game.cursor_valid, "Keyboard aiming remains usable while the pointer rests over HUD")
	var never_reachable: Array = []
	for i in game.sim.dust.size():
		if not ever_reachable.has(i): never_reachable.append({"index":i,"world":str(game.sim.dust[i].p),"simulation_walkable":game.sim.walkable(game.sim.dust[i].p)})
	findings.never_reachable_in_tested_views = never_reachable
	if not never_reachable.is_empty():
		var residual = load("res://scripts/simulation.gd").new()
		for i in residual.dust.size(): residual.dust[i].amount = 1 if not ever_reachable.has(i) else 0
		residual.cleaned = residual.dust.size() - never_reachable.size()
		residual.earned = int(residual.cleaned)
		for i in 50:
			var position = residual._birth_position(Vector2(-5+(i%10),-3+floorf(i/10.0)*1.5))
			residual.crew.append({"id":i,"p":position,"target":-1,"born":-2.0,"direction":0.0,"work":0.0,"speed":0.0})
		for i in 280: residual.tick(0.05,false,Vector2.ZERO)
		var left = 0.0
		for d in residual.dust: left += d.amount
		findings.helper_residual_fixture = {"helpers":50,"simulated_seconds":14,"initial_hidden_dust":never_reachable.size(),"remaining":left,"assisted":residual.stats.assisted,"scope":"Controlled final-speck fixture; existing helper residual cleanup, not manual target reachability or human pacing"}
		check(left <= 0.00001, "Existing helper final-speck cleanup clears all six cells hidden in the sampled views")
	check(not FileAccess.file_exists(game.audit_path), "Read-only camera audit never creates game progress")
	check(not game.audio.active, "Camera audit never starts the soundscape")
	var report = {"kind":"Native camera projection and actual physics raycasts with controlled remaining-dust/input fixtures; no human usability or physical-device claim", "engine":Engine.get_version_info().string,"display":DisplayServer.get_name(),"main_sha256":FileAccess.get_sha256("res://scripts/main.gd"),"checks":checks,"failures":failures,"dust_cells":game.sim.dust.size(),"views":views,"findings":findings,"ordinary_save_accessed":false,"profile":folder}
	var output = folder.path_join("results.json")
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--camera-output="): output = arg.trim_prefix("--camera-output=")
	FileAccess.open(output, FileAccess.WRITE).store_string(JSON.stringify(report,"\t")+"\n")
	print("CAMERA_AUDIT ",JSON.stringify({"passed":checks.size(),"failed":failures.size(),"failures":failures,"findings":findings}))
	await game.audio.shutdown()
	if game.instance_lock: game.instance_lock.stop()
	game.free()
	await process_frame
	quit(0 if failures.is_empty() else 1)
