extends SceneTree
const Main = preload("res://scripts/main.gd")
var checks: Array = []
var failures: Array = []
var game: Node3D
func check(value: bool, name: String):
	if value: checks.append(name)
	else: failures.append(name); push_error(name)
func mouse(point: Vector2, down: Variant = null):
	game._qa_mouse(point, down)
func step(count: int):
	for i in range(count): game._physics_process(0.05)
func _initialize():
	call_deferred("run")
func run():
	game = Main.new()
	root.add_child(game)
	await physics_frame
	await process_frame
	check(not game.started and game.paused and not game.audio.active, "Welcome has no game progression or audio playback")
	game._start()
	await physics_frame
	var patch = game.camera.unproject_position(Vector3(-4, 0, 2))
	mouse(patch, true)
	step(100)
	check(game.sim.cleaned > 3.5 and game.cursor_valid, "Native pointer event brushes the visible raycast ground surface")
	check(Vector2(game.cursor_world.x, game.cursor_world.z).distance_to(Vector2(-4, 2)) < 0.05, "Raycast and visible target agree spatially")
	mouse(Vector2(1300, 45), false)
	var held = game.sim.stats.brushed
	step(10)
	check(game.sim.stats.brushed == held and not game.brushing, "Releasing a stroke over interface stops cleaning")
	var fountain = game.camera.unproject_position(Vector3(0, 1.0, 0))
	mouse(fountain, true)
	held = game.sim.stats.brushed
	step(10)
	check(not game.cursor_valid and game.sim.stats.brushed == held, "Visible fountain blocks brushing through to the ground")
	mouse(patch, true)
	game._show_settings()
	var elapsed = game.sim.elapsed
	step(10)
	check(game.sim.elapsed == elapsed and not game.brushing and game.audio.is_paused, "Pause stops held input, progression and the soundscape")
	game._close_modal()
	check(not game.brushing and not game.paused, "Returning does not resume a stale held stroke")
	game._set_mode("direct")
	mouse(patch, true)
	step(3)
	check(game.sim.assignment == Vector2.INF, "Direct mode does not invent helpers or clean before a crew exists")
	game._set_mode("brush")
	for cycle in range(12):
		mouse(game.camera.unproject_position(Vector3(-5.5 + (cycle % 5), 0, 1.5 + floorf(cycle / 5.0))), true)
		step(80)
	mouse(patch, false)
	check(game.sim.crew.size() > 0 and game.sim.motes >= 32, "Brushing produces helpers and upgrade currency through real raycast input")
	game._show_grow()
	game._buy("brush")
	check(game.sim.upgrades.brush and game.sim.brush_radius() == 1.28, "Purchase changes the visible brush capability")
	game._close_modal()
	game._set_mode("direct")
	mouse(game.camera.unproject_position(Vector3(5, 0, 2)), true)
	check(game.sim.assignment.distance_to(Vector2(5, 2)) < 0.1, "Crew direction uses the visible destination surface")
	mouse(patch, false)
	game._set_mode("brush")
	mouse(patch, true)
	game._zoom(0.15)
	check(not game.brushing, "Changing camera zoom cancels the old brush target")
	game._next_dust()
	check(game.keyboard_aim and game.keyboard_pointer != Vector2.ZERO, "Keyboard dust finding selects an aimable visible target")
	game._notification(Node.NOTIFICATION_APPLICATION_FOCUS_OUT)
	check(game.paused and not game.brushing, "Focus loss preserves and pauses the courtyard")
	check(game._save_progress(), "Integrated current state passes verified native save")
	game._qa_fixture(true)
	game.sim.cleaned = float(game.sim.dust.size()) - 0.000000003
	game._update_ui()
	check(game.counts.text.contains("100% clear"), "Completed courtyard displays100% despite actual floating-point accumulation residual")
	var report = {"kind": "Headless Godot integration: generated local viewport input, actual3D physics raycasts, accelerated test steps. Not human timing, native physical input or presentation evidence.", "checks": checks, "failures": failures, "helpers": game.sim.crew.size(), "brushed": game.sim.stats.brushed}
	var file = FileAccess.open("res://../evidence/3d/integration-checks.json", FileAccess.WRITE)
	file.store_string(JSON.stringify(report, "  "))
	file.close()
	print(JSON.stringify(report))
	await game.audio.shutdown()
	game.free()
	await create_timer(0.1).timeout
	quit(0 if failures.is_empty() else 1)
