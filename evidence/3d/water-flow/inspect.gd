extends SceneTree
const Main = preload("res://scripts/main.gd")
var game
var output = ""
var frame = 0
var ready = false
var captures: Array = []
var paused_time = 0.0
var draw_calls: Array = []
var report = {"kind": "Native restored50-helper visual fixture; fixed30fps Movie Maker, no human test or performance run", "checks": [], "failures": [], "humanTests": 0}

func _initialize():
	if not "--qa" in OS.get_cmdline_user_args(): push_error("Isolated QA mode required"); quit(1); return
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--water-output="): output = arg.trim_prefix("--water-output=")
	if output.is_empty(): push_error("Explicit water evidence path required"); quit(1); return
	DirAccess.make_dir_recursive_absolute(output)
	call_deferred("setup")

func check(value: bool, label: String):
	if value: report.checks.append(label)
	else: report.failures.append(label); push_error(label)

func setup():
	game = Main.new()
	root.add_child(game)
	game._start()
	game._qa_fixture(true)
	var streams = game.environment_node._water_nodes
	check(streams.size() == 3, "Only the existing basin and two stream meshes exist")
	check(streams[1].material_override == streams[2].material_override, "Both streams share one material")
	var count = 0
	var extent = 0.0
	for index in [1, 2]:
		var vertices = streams[index].mesh.surface_get_arrays(0)[Mesh.ARRAY_VERTEX]
		count += vertices.size()
		for vertex in vertices: extent = maxf(extent, Vector2(vertex.x, vertex.z).length())
	check(count == 1536, "Existing stream triangle count is unchanged")
	check(extent < 1.10, "All stream geometry remains inside basin and obstacle footprint")
	report.geometry = {"stream_vertices": count, "maximum_stream_radius": extent, "helpers": game.sim.crew.size()}
	report.source = {"environment_sha256": FileAccess.get_sha256("res://scripts/courtyard_environment.gd"), "stream_shader_sha256": FileAccess.get_sha256("res://shaders/courtyard_stream_flow.gdshader") if FileAccess.file_exists("res://shaders/courtyard_stream_flow.gdshader") else "baseline basin shader"}
	ready = true

func capture(label: String):
	await RenderingServer.frame_post_draw
	root.get_texture().get_image().save_png(output.path_join(label + ".png"))
	captures.append(label)

func _process(_delta):
	if not ready: return false
	frame += 1
	if frame >= 30: draw_calls.append(Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME))
	if frame in [90, 95, 100, 105, 110, 115, 120]: capture("normal-%03d" % frame)
	if frame == 240:
		game.settings.gentle = true
		game._apply_settings()
		check(game.environment_node._water_nodes[1].material_override.get_shader_parameter("motion_amount") == 0.0, "Gentle motion freezes stream phase")
	if frame == 270: capture("gentle")
	if frame == 300:
		game.settings.gentle = false
		game._apply_settings()
		game.paused = true
		game._stop_input()
		game.audio.set_paused(true)
		paused_time = game.environment_node._water_nodes[1].material_override.get_shader_parameter("time_seconds")
		capture("paused-start")
	if frame == 345:
		check(game.environment_node._water_nodes[1].material_override.get_shader_parameter("time_seconds") == paused_time, "Pause preserves the exact stream source time")
		capture("paused-end")
	if frame == 360:
		ready = false
		report.engine = Engine.get_version_info()
		report.draw_calls = {"minimum": draw_calls.min(), "maximum": draw_calls.max(), "samples": draw_calls.size(), "scope": "Scene draw-count comparison only; Movie Maker is not sustained performance"}
		report.captures = captures
		report.status = "passed" if report.failures.is_empty() else "failed"
		var file = FileAccess.open(output.path_join("results.json"), FileAccess.WRITE)
		file.store_string(JSON.stringify(report, "  "))
		file.close()
		print(JSON.stringify(report))
		game._quit_safely(0 if report.failures.is_empty() else 1)
	return false
