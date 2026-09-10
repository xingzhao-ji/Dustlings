extends Node3D

const Sim = preload("res://scripts/simulation.gd")
const EnvironmentScene = preload("res://scripts/courtyard_environment.gd")
const CreatureVisual = preload("res://scripts/dustling_visual.gd")
const Soundscape = preload("res://scripts/soundscape.gd")
const Store = preload("res://scripts/save_store.gd")
const DiscoveryPreview = preload("res://scripts/discovery_preview.gd")
var sim = Sim.new()
var environment_node: Node3D
var camera: Camera3D
var audio: Node3D
var dust_image: Image
var dust_texture: ImageTexture
var brush_ring: MeshInstance3D
var order_ring: MeshInstance3D
var creature_nodes: Array = []
var sparks: Array = []
var mode = "brush"
var brushing = false
var cursor_valid = false
var cursor_world = Vector3.ZERO
var started = false
var paused = true
var gentle_motion = false
var tap_sweep = false
var tap_remaining = 0.0
var zoom = 1.0
var desired_zoom = 1.0
var camera_target = Vector3(0, 0.1, 0.4)
var camera_focus = Vector3(0, 0.1, 0.4)
var dragging_camera = false
var last_pointer = Vector2.ZERO
var keyboard_pointer = Vector2.ZERO
var keyboard_aim = false
var brush_keyboard_held = false
var hud: CanvasLayer
var top: HBoxContainer
var counts: Label
var tip: Label
var save_label: Label
var brush_button: Button
var direct_button: Button
var grow_button: Button
var restore_button: Button
var modal: PanelContainer
var modal_kind = ""
var upgrade_buttons = {}
var save_timer = 0.0
var saved_once = false
var save_store
var instance_lock: TCPServer
var instance_primary = true
var exiting = false
var save_problem = ""
var settings = {"music": 0.6, "sfx": 0.8, "ambience": 0.55, "gentle": false, "tap": false, "quality": true}
var notice_timer = 0.0
var ui_timer = 0.0
var frame_times: Array = []
var qa = false
var qa_time = 0.0
var qa_stage = 0
var qa_output = ""
var qa_case = "overview"
var qa_capturing = false
var qa_report: Dictionary = {}
var qa_pointer = Vector2.ZERO
var qa_driving_pointer = false
var qa_profile_started = 0
var qa_profile_frames: Array = []

func _ready():
	get_tree().auto_accept_quit = false
	if get_window().has_signal("mouse_exited"): get_window().connect("mouse_exited", _stop_input)
	qa = "--qa" in OS.get_cmdline_user_args()
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--evidence="): qa_output = arg.trim_prefix("--evidence=")
		if arg.begins_with("--qa-case="): qa_case = arg.trim_prefix("--qa-case=")
	_acquire_instance()
	_load_progress()
	environment_node = EnvironmentScene.new()
	add_child(environment_node)
	_setup_light()
	camera = Camera3D.new()
	camera.fov = 36.0
	camera.near = 0.1
	camera.far = 90
	camera.current = true
	add_child(camera)
	_place_camera(1.0)
	audio = Soundscape.new()
	add_child(audio)
	_make_dust()
	brush_ring = _ring(0.88, Color("f2dcb0"))
	order_ring = _ring(0.58, Color("5c9e9b"))
	add_child(brush_ring)
	add_child(order_ring)
	brush_ring.visible = false
	_build_ui()
	_show_welcome()
	_apply_settings()
	_sync_world(0.0)

func _setup_light():
	var world = WorldEnvironment.new()
	var env = Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color("c8d6cf")
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color("c4d9e1")
	env.ambient_light_energy = 0.34
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.tonemap_exposure = 1.0
	env.ssao_enabled = true
	env.ssao_radius = 0.7
	env.ssao_intensity = 1.1
	env.ssao_detail = 0.7
	env.glow_enabled = true
	env.glow_intensity = 0.16
	world.environment = env
	add_child(world)
	var sun = DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-48, -32, 0)
	sun.light_color = Color("ffe9c4")
	sun.light_energy = 0.9
	sun.shadow_enabled = true
	sun.directional_shadow_max_distance = 45
	sun.light_size = 1.5
	sun.shadow_bias = 0.025
	sun.shadow_normal_bias = 0.6
	add_child(sun)

func _place_camera(delta: float):
	var amount = 1.0 if gentle_motion else minf(1, delta * 7)
	zoom = lerpf(zoom, desired_zoom, amount)
	camera_focus = camera_focus.lerp(camera_target, amount)
	camera.position = camera_focus + Vector3(11.7, 16.0, 20.0) / zoom
	camera.look_at(camera_focus)

func _make_dust():
	dust_image = Image.create(29, 18, false, Image.FORMAT_RF)
	dust_image.fill(Color(0, 0, 0))
	for d in sim.dust: dust_image.set_pixel(d.cell.x, d.cell.y, Color(d.amount, 0, 0))
	dust_texture = ImageTexture.create_from_image(dust_image)
	var material = ShaderMaterial.new()
	material.shader = preload("res://shaders/courtyard_surface.gdshader")
	material.set_shader_parameter("dust_field", dust_texture)
	var ground = environment_node.get_node("Courtyard_ground")
	ground.material_override = material

func _ring(radius: float, color: Color) -> MeshInstance3D:
	var mesh = TorusMesh.new()
	mesh.inner_radius = radius - 0.015
	mesh.outer_radius = radius + 0.015
	mesh.rings = 48
	mesh.ring_segments = 6
	var mat = StandardMaterial3D.new()
	mat.albedo_color = color
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mesh.material = mat
	var node = MeshInstance3D.new()
	node.mesh = mesh
	node.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	return node

func _physics_process(delta):
	if not started or paused:
		brushing = false
		return
	_update_cursor()
	if tap_remaining > 0:
		tap_remaining = maxf(0, tap_remaining - delta)
		brushing = tap_remaining > 0
	sim.tick(delta, (brushing or brush_keyboard_held) and cursor_valid and mode == "brush", Vector2(cursor_world.x, cursor_world.z))
	_handle_events()
	save_timer += delta
	if save_timer >= 8:
		save_timer = 0
		if not _save_progress(): _show_settings()

func _process(delta):
	_place_camera(delta)
	if not paused:
		environment_node.tick_environment(delta, sim.elapsed)
		_sync_world(delta)
		notice_timer = maxf(0, notice_timer - delta)
		frame_times.append(delta * 1000)
		if frame_times.size() > 14400: frame_times.pop_front()
		audio.set_activity(sim.ratio(), sim.restoration, (brushing or brush_keyboard_held) and cursor_valid and mode == "brush", cursor_world)
	ui_timer += delta
	if ui_timer > 0.12:
		ui_timer = 0
		_update_ui()
	if qa and qa_output != "": _qa_driver(delta)

func _sync_world(delta: float):
	for d in sim.dust:
		dust_image.set_pixel(d.cell.x, d.cell.y, Color(d.amount, 0, 0))
	dust_texture.update(dust_image)
	while creature_nodes.size() < sim.crew.size():
		var creature = CreatureVisual.new()
		add_child(creature)
		creature_nodes.append(creature)
	for i in range(creature_nodes.size()):
		var c = sim.crew[i]
		var node = creature_nodes[i]
		node.position = Vector3(c.p.x, 0, c.p.y)
		node.rotation.y = lerp_angle(node.rotation.y, c.direction, minf(1, delta * 9))
		node.pose(delta, sim.elapsed + i * 0.73, c.speed, c.work, sim.elapsed - c.born, sim.ritual or sim.completed, gentle_motion)
	environment_node.set_restoration(sim.restoration)
	brush_ring.visible = cursor_valid and started and not paused and modal_kind == ""
	brush_ring.position = cursor_world + Vector3(0, 0.04, 0)
	brush_ring.scale = Vector3.ONE * (sim.brush_radius() / 0.88 if mode == "brush" else 0.45)
	order_ring.visible = sim.assignment != Vector2.INF
	if order_ring.visible: order_ring.position = Vector3(sim.assignment.x, 0.055, sim.assignment.y)
	for i in range(sparks.size() - 1, -1, -1):
		var spark = sparks[i]
		spark.life -= delta
		if spark.life <= 0:
			spark.node.queue_free()
			sparks.remove_at(i)
		else:
			var fraction = spark.life / 0.8
			var angle = spark.angle + (1 - fraction) * 5.2
			spark.node.position = spark.origin + Vector3(cos(angle) * fraction * 0.52, sin((1 - fraction) * PI) * 0.25, sin(angle) * fraction * 0.52)
			spark.node.scale = Vector3.ONE * minf(1.0, spark.life * 2.5)

func _update_cursor():
	cursor_valid = false
	var hovered = get_viewport().gui_get_hovered_control()
	if is_instance_valid(hovered) and hovered.is_visible_in_tree() and hovered.mouse_filter != Control.MOUSE_FILTER_IGNORE: return
	var screen = keyboard_pointer if keyboard_aim else get_viewport().get_mouse_position()
	if qa_driving_pointer: screen = qa_pointer
	var origin = camera.project_ray_origin(screen)
	var end = origin + camera.project_ray_normal(screen) * 80
	var result = get_world_3d().direct_space_state.intersect_ray(PhysicsRayQueryParameters3D.create(origin, end, 1))
	cursor_valid = false
	if not result.is_empty():
		cursor_world = result.position
		cursor_valid = result.collider.get_meta("cleanable", false) and sim.walkable(Vector2(cursor_world.x, cursor_world.z))

func _unhandled_input(event):
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_ESCAPE:
			if modal_kind == "welcome": return
			if modal_kind != "": _close_modal()
			else: _show_settings()
			get_viewport().set_input_as_handled()
			return
	if paused or not started or modal_kind != "": return
	if event is InputEventMouseMotion:
		keyboard_aim = false
		if dragging_camera:
			var right = camera.global_basis.x
			var forward = Vector3(camera.global_basis.z.x, 0, camera.global_basis.z.z).normalized()
			camera_target -= (right * event.relative.x + forward * event.relative.y) * 0.012 / zoom
			camera_target.x = clampf(camera_target.x, -3.0, 3.0)
			camera_target.z = clampf(camera_target.z, -2.2, 2.2)
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_MIDDLE or event.button_index == MOUSE_BUTTON_RIGHT:
			dragging_camera = event.pressed
			brushing = false
		if event.button_index == MOUSE_BUTTON_WHEEL_UP and event.pressed: _zoom(0.15)
		if event.button_index == MOUSE_BUTTON_WHEEL_DOWN and event.pressed: _zoom(-0.15)
		if event.button_index == MOUSE_BUTTON_LEFT:
			if event.pressed:
				_update_cursor()
				if mode == "direct": _direct()
				elif cursor_valid:
					brushing = true
					if tap_sweep: tap_remaining = 1.6
			else:
				if not tap_sweep: brushing = false
	if event is InputEventKey:
		if event.keycode == KEY_SPACE:
			brush_keyboard_held = event.pressed
			keyboard_aim = true
			if keyboard_pointer == Vector2.ZERO: keyboard_pointer = camera.unproject_position(Vector3(-4, 0, 2))
		if event.pressed:
			match event.keycode:
				KEY_B: _set_mode("brush")
				KEY_D: _set_mode("direct")
				KEY_U: _show_grow()
				KEY_EQUAL, KEY_PLUS: _zoom(0.15)
				KEY_MINUS: _zoom(-0.15)
				KEY_HOME: desired_zoom = 1.0; camera_target = Vector3(0, 0.1, 0.4)
				KEY_N: _next_dust()
				KEY_ENTER:
					if mode == "direct": _direct()
				KEY_LEFT, KEY_RIGHT, KEY_UP, KEY_DOWN:
					if not keyboard_aim: keyboard_pointer = camera.unproject_position(Vector3(-4, 0, 2))
					keyboard_aim = true
					var direction = {KEY_LEFT: Vector2(-18, 0), KEY_RIGHT: Vector2(18, 0), KEY_UP: Vector2(0, -18), KEY_DOWN: Vector2(0, 18)}[event.keycode]
					keyboard_pointer = (keyboard_pointer + direction).clamp(Vector2(10, 72), get_viewport().get_visible_rect().size - Vector2(10, 100))

func _input(event):
	if event is InputEventMouseButton and event.button_index in [MOUSE_BUTTON_MIDDLE, MOUSE_BUTTON_RIGHT] and not event.pressed: dragging_camera = false
	# Release a held stroke even when its ending lands on UI.
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and not event.pressed and not tap_sweep: brushing = false
	if event is InputEventKey and event.keycode == KEY_SPACE and not event.pressed: brush_keyboard_held = false

func _direct():
	if cursor_valid and sim.direct(Vector2(cursor_world.x, cursor_world.z)):
		_notice("Your crew is on its way.")
	elif sim.crew.is_empty(): _notice("Brush some dust to meet your first helper.")
	elif sim.ritual: _notice("The crew is singing to the fountain.")
	else: _notice("Choose an open patch of paving."); audio.cue("blocked", cursor_world)

func _next_dust():
	var focus = get_viewport().gui_get_focus_owner()
	if focus: focus.release_focus()
	for d in sim.dust:
		if d.amount > 0.01:
			keyboard_pointer = camera.unproject_position(Vector3(d.p.x, 0, d.p.y))
			keyboard_aim = true
			return

func _zoom(change: float):
	desired_zoom = clampf(desired_zoom + change, 0.85, 1.8)
	_stop_input()
	audio.ui()

func _stop_input():
	brushing = false
	brush_keyboard_held = false
	tap_remaining = 0
	dragging_camera = false

func _set_mode(value: String):
	_stop_input()
	mode = value
	audio.ui()
	_update_ui()

func _handle_events():
	for event in sim.events:
		var where = Vector3(event.get("p", Vector2.ZERO).x, 0.3, event.get("p", Vector2.ZERO).y)
		audio.cue(event.kind, where)
		match event.kind:
			"birth":
				_burst(where)
				if event.first: _notice("That dust became a Dustling. It will help you clean.", 7)
				elif sim.crew.size() == 4: _notice("A little crew. Try Direct, then choose a dusty patch.", 7)
			"upgrade":
				var confirmations = {"brush": "A softer sweep · wider, quicker brushing", "teamwork": "Better together · paired, quicker helpers", "bloom": "Fountain chorus · clear 75%, then ring the bell"}
				_notice(confirmations[event.id], 7)
			"chorus": _notice("The fountain chorus…", 8)
			"restored": _notice("Water, at last. Your crew will find the last specks.", 8)
			"complete": _save_progress(); _show_completion()
	sim.events.clear()

func _burst(where: Vector3):
	if gentle_motion: return
	var mesh = SphereMesh.new()
	mesh.radius = 0.04
	mesh.height = 0.08
	mesh.radial_segments = 6
	mesh.rings = 3
	var mat = StandardMaterial3D.new()
	mat.albedo_color = Color("ead7a7")
	mesh.material = mat
	for i in range(9):
		var node = MeshInstance3D.new()
		node.mesh = mesh
		node.position = where
		node.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		add_child(node)
		var a = i * TAU / 9
		sparks.append({"node": node, "life": 0.8, "angle": a, "origin": where})

func _panel_style(color: Color, border: Color, radius = 18) -> StyleBoxFlat:
	var style = StyleBoxFlat.new()
	style.bg_color = color
	style.border_color = border
	style.set_border_width_all(1)
	style.set_corner_radius_all(radius)
	style.set_content_margin_all(14)
	style.shadow_color = Color(0.12, 0.2, 0.19, 0.16)
	style.shadow_size = 8
	style.shadow_offset = Vector2(0, 4)
	return style

func _button(text: String, action: Callable, width = 100) -> Button:
	var button = Button.new()
	button.text = text
	button.custom_minimum_size = Vector2(width, 46)
	button.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	button.add_theme_font_size_override("font_size", 17)
	button.add_theme_color_override("font_color", Color("294842"))
	button.add_theme_color_override("font_hover_color", Color("173d37"))
	button.add_theme_color_override("font_pressed_color", Color("173d37"))
	button.add_theme_color_override("font_focus_color", Color("173d37"))
	button.add_theme_color_override("font_hover_pressed_color", Color("173d37"))
	button.add_theme_color_override("font_disabled_color", Color("7b8074"))
	button.add_theme_stylebox_override("normal", _panel_style(Color("f6eddb"), Color("c9c4aa"), 13))
	button.add_theme_stylebox_override("hover", _panel_style(Color("fff7e7"), Color("8aa592"), 13))
	button.add_theme_stylebox_override("pressed", _panel_style(Color("d4dfc9"), Color("658977"), 13))
	button.add_theme_stylebox_override("disabled", _panel_style(Color("e6e3d5"), Color("cecebf"), 13))
	var focus = _panel_style(Color(0, 0, 0, 0), Color("406e61"), 13)
	focus.set_border_width_all(2)
	button.add_theme_stylebox_override("focus", focus)
	button.pressed.connect(action)
	button.mouse_entered.connect(func(): _button_motion(button, 1.018))
	button.mouse_exited.connect(func(): _button_motion(button, 1.0))
	button.button_down.connect(func(): _button_motion(button, 0.975))
	button.button_up.connect(func(): _button_motion(button, 1.0))
	return button

func _button_motion(button: Button, target: float):
	if gentle_motion or button.disabled: return
	button.pivot_offset = button.size * 0.5
	var previous = button.get_meta("response_tween") if button.has_meta("response_tween") else null
	if previous and previous.is_valid(): previous.kill()
	var tween = button.create_tween()
	tween.tween_property(button, "scale", Vector2.ONE * target, 0.1).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	button.set_meta("response_tween", tween)

func _label(text: String, size = 17) -> Label:
	var label = Label.new()
	label.text = text
	label.add_theme_color_override("font_color", Color("294842"))
	label.add_theme_font_size_override("font_size", size)
	return label

func _build_ui():
	hud = CanvasLayer.new()
	add_child(hud)
	var upper = PanelContainer.new()
	upper.set_anchors_and_offsets_preset(Control.PRESET_TOP_WIDE)
	upper.offset_left = 22
	upper.offset_right = -22
	upper.offset_top = 18
	upper.offset_bottom = 80
	upper.add_theme_stylebox_override("panel", _panel_style(Color("f4eddc"), Color("ded8c4")))
	hud.add_child(upper)
	top = HBoxContainer.new()
	top.add_theme_constant_override("separation", 20)
	upper.add_child(top)
	top.add_child(_label("Dustlings  /  Courtyard", 20))
	var space = Control.new()
	space.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.add_child(space)
	counts = _label("")
	top.add_child(counts)
	top.add_child(_button("Settings", _show_settings, 105))
	var dock = HBoxContainer.new()
	dock.set_anchors_and_offsets_preset(Control.PRESET_CENTER_BOTTOM)
	dock.offset_left = -320
	dock.offset_right = 320
	dock.offset_top = -76
	dock.offset_bottom = -22
	dock.add_theme_constant_override("separation", 9)
	hud.add_child(dock)
	brush_button = _button("Brush  B", func(): _set_mode("brush"), 125)
	direct_button = _button("Direct  D", func(): _set_mode("direct"), 125)
	grow_button = _button("Grow  U", _show_grow, 115)
	for button in [brush_button, direct_button, grow_button]: dock.add_child(button)
	dock.add_child(_button("−", func(): _zoom(-0.15), 46))
	dock.add_child(_button("+", func(): _zoom(0.15), 46))
	dock.add_child(_button("Frame", func(): desired_zoom = 1.0; camera_target = Vector3(0, 0.1, 0.4), 82))
	tip = _label("Hold and sweep over a dusty patch.", 17)
	tip.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	tip.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	tip.offset_top = -113
	tip.offset_bottom = -84
	tip.mouse_filter = Control.MOUSE_FILTER_IGNORE
	tip.add_theme_color_override("font_color", Color("233f38"))
	tip.add_theme_color_override("font_shadow_color", Color("e8eee6"))
	tip.add_theme_constant_override("shadow_outline_size", 4)
	hud.add_child(tip)
	save_label = _label("", 14)
	save_label.position = Vector2(32, 100)
	hud.add_child(save_label)
	restore_button = _button("Ring the fountain bell", _restore, 250)
	restore_button.set_anchors_and_offsets_preset(Control.PRESET_CENTER_TOP)
	restore_button.offset_left = -125
	restore_button.offset_right = 125
	restore_button.offset_top = 104
	restore_button.offset_bottom = 154
	hud.add_child(restore_button)

func _modal(title: String, kind: String, width = 450) -> VBoxContainer:
	_stop_input()
	if is_instance_valid(modal): modal.hide(); modal.queue_free()
	modal_kind = kind
	paused = true
	if audio: audio.set_paused(true)
	modal = PanelContainer.new()
	modal.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	modal.offset_left = -width / 2.0
	modal.offset_right = width / 2.0
	modal.offset_top = -220
	modal.offset_bottom = 220
	modal.add_theme_stylebox_override("panel", _panel_style(Color("f4ecdb"), Color("bdc9b4"), 22))
	hud.add_child(modal)
	var column = VBoxContainer.new()
	column.add_theme_constant_override("separation", 14)
	modal.add_child(column)
	var header = _label(title, 27)
	column.add_child(header)
	call_deferred("_fit_modal")
	return column

func _fit_modal():
	if not is_instance_valid(modal): return
	var height = maxf(350, modal.get_combined_minimum_size().y)
	modal.offset_top = -height * 0.5
	modal.offset_bottom = height * 0.5

func _body(column: VBoxContainer, text: String):
	var label = _label(text, 17)
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.custom_minimum_size.x = 390
	column.add_child(label)

func _show_welcome():
	var column = _modal("Dustlings", "welcome")
	_body(column, "Brush the dust. Meet the little lives inside it.\nBring an old courtyard back to life.")
	_body(column, "Hold & sweep to brush · D to direct\nScroll to look closer · Right-drag to frame")
	_body(column, "3D courtyard — work in progress")
	if not instance_primary: _body(column, "Progress is already in use, or its local lock is unavailable. Close the other copy and reopen this one.")
	elif not save_problem.is_empty(): _body(column, save_problem)
	var start = _button("Return to the courtyard" if saved_once else "Bring it to life", _start, 390)
	column.add_child(start)
	start.disabled = not instance_primary
	start.grab_focus()

func _start():
	if not instance_primary: return
	started = true
	_close_modal()
	audio.start_soundscape()
	_save_progress()

func _close_modal():
	if modal_kind == "welcome" and not started: return
	if is_instance_valid(modal): modal.hide(); modal.queue_free()
	modal_kind = ""
	paused = false
	_stop_input()
	if audio: audio.set_paused(false); audio.ui()
	if brush_button: brush_button.grab_focus()
	_save_progress()

func _show_grow():
	if not started: return
	var column = _modal("Little discoveries", "grow", 480)
	upgrade_buttons.clear()
	var titles = {"brush": "A softer sweep", "teamwork": "Better together", "bloom": "The fountain chorus"}
	var details = {"brush": "Wider strokes · more dust with each sweep", "teamwork": "Side-by-side helpers · faster cleaning", "bloom": "Gather and sing · awaken the fountain"}
	for id in ["brush", "teamwork", "bloom"]:
		var row = HBoxContainer.new()
		row.add_theme_constant_override("separation", 12)
		column.add_child(row)
		var preview = DiscoveryPreview.new()
		preview.configure(id, gentle_motion)
		row.add_child(preview)
		var information = VBoxContainer.new()
		information.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		information.add_theme_constant_override("separation", 5)
		row.add_child(information)
		var label = titles[id] + (" · Found" if sim.upgrades[id] else " · %d motes" % Sim.COSTS[id])
		var button = _button(label, func(): _buy(id), 305)
		button.disabled = sim.upgrades[id] or sim.motes < Sim.COSTS[id] or (id == "bloom" and not (sim.upgrades.brush and sim.upgrades.teamwork))
		information.add_child(button)
		var effect = _label(details[id], 15)
		effect.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		effect.custom_minimum_size.x = 305
		information.add_child(effect)
		upgrade_buttons[id] = button
	column.add_child(_button("Back to the courtyard", _close_modal, 430))
	column.get_child(column.get_child_count() - 1).grab_focus()
	audio.ui()

func _buy(id: String):
	if sim.buy(id):
		_handle_events()
		_save_progress()
		_show_grow()

func _show_settings():
	if not started: return
	_save_progress()
	var column = _modal("A quiet moment", "settings", 480)
	for key in ["music", "sfx", "ambience"]:
		var row = HBoxContainer.new()
		row.add_theme_constant_override("separation", 18)
		column.add_child(row)
		var names = {"music": "Music", "sfx": "Little sounds", "ambience": "World sounds"}
		var name_label = _label(names[key])
		name_label.custom_minimum_size.x = 142
		row.add_child(name_label)
		var slider = HSlider.new()
		slider.min_value = 0
		slider.max_value = 1
		slider.step = 0.05
		slider.value = settings[key]
		slider.custom_minimum_size = Vector2(225, 42)
		slider.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		slider.value_changed.connect(func(value): settings[key] = value; _apply_settings())
		row.add_child(slider)
	for entry in [["gentle", "Gentle motion"], ["tap", "Tap to sweep"], ["quality", "Soft shadows & smooth edges"]]:
		var toggle = CheckButton.new()
		toggle.text = entry[1]
		toggle.custom_minimum_size.y = 44
		for state in ["font_color", "font_pressed_color", "font_hover_color", "font_focus_color", "font_hover_pressed_color"]:
			toggle.add_theme_color_override(state, Color("294842"))
		toggle.add_theme_font_size_override("font_size", 17)
		toggle.button_pressed = settings[entry[0]]
		toggle.toggled.connect(func(value): settings[entry[0]] = value; _apply_settings(); audio.ui())
		column.add_child(toggle)
	var row = HBoxContainer.new()
	row.add_theme_constant_override("separation", 10)
	column.add_child(row)
	row.add_child(_button("Save a copy", _export_save, 208))
	row.add_child(_button("Load a copy", _import_save, 208))
	column.add_child(_button("Controls & help", _show_help, 430))
	column.add_child(_button("Return to the courtyard", _close_modal, 430))
	column.get_child(column.get_child_count() - 1).grab_focus()

func _show_help():
	var column = _modal("Make yourself at home", "help", 480)
	_body(column, "Brush: hold and sweep over dusty paving. Dust becomes a new helper every seven motes.\n\nDirect: press D, then choose open paving. Your crew cleans around that spot.\n\nGrow: press U to discover wider brushing, paired helpers and the fountain chorus.")
	_body(column, "Scroll or + / −: look closer\nRight-drag: frame the village · Home: reset\nKeyboard: N finds dust, arrows aim, Space brushes. Enter directs. Escape pauses.")
	column.add_child(_button("Let the crew roam", func(): sim.release(); _close_modal(), 430))
	column.add_child(_button("Back to settings", _show_settings, 430))

func _show_completion():
	var column = _modal("The courtyard is awake", "complete")
	_body(column, "Every little speck found its place.\nThe fountain flows again.")
	_body(column, "Your restored courtyard is saved.\nThe canal is the next planned place; it is not in this development build.")
	column.add_child(_button("Enjoy the courtyard", _close_modal, 390))

func _restore():
	if sim.begin_restoration(): _stop_input(); _handle_events(); _save_progress()

func _update_ui():
	if not counts: return
	counts.text = "%d %s   ·   %d motes   ·   %d%% clear" % [sim.crew.size(), "helper" if sim.crew.size() == 1 else "helpers", sim.motes, floori(sim.ratio() * 100)]
	brush_button.modulate = Color("c9ddcb") if mode == "brush" else Color.WHITE
	direct_button.modulate = Color("c9ddcb") if mode == "direct" else Color.WHITE
	grow_button.text = "Grow  U" if sim.motes < 32 or (sim.upgrades.brush and sim.upgrades.teamwork and sim.upgrades.bloom) else "Grow  •"
	restore_button.visible = started and sim.upgrades.bloom and sim.ratio() >= 0.75 and sim.restoration < 1 and not sim.ritual and modal_kind == ""
	if notice_timer <= 0:
		if sim.completed: tip.text = "Courtyard restored"
		elif sim.ritual: tip.text = "The fountain chorus…"
		elif sim.upgrades.bloom and sim.restoration < 1: tip.text = "Ring the fountain bell when you’re ready." if sim.ratio() >= 0.75 else "Clear 75%% to awaken the fountain  ·  %d%%" % floori(sim.ratio() * 100)
		elif mode == "direct": tip.text = "Choose open paving. Your crew will tidy nearby."
		elif sim.crew.is_empty(): tip.text = "Hold and sweep over a dusty patch."
		else: tip.text = "B  Brush    ·    D  Direct    ·    U  Grow"
	save_label.text = save_problem if not save_problem.is_empty() else ("Saved on this device" if saved_once else "")

func _notice(text: String, duration = 4.0):
	notice_timer = duration
	if tip: tip.text = text

func _apply_settings():
	gentle_motion = settings.gentle
	tap_sweep = settings.tap
	if environment_node: environment_node.set_gentle_motion(gentle_motion)
	get_viewport().msaa_3d = Viewport.MSAA_2X if settings.quality else Viewport.MSAA_DISABLED
	if audio: audio.set_mix(settings.music, settings.sfx, settings.ambience)

func _save_path() -> String:
	return OS.get_cache_dir().path_join("dustlings-qa-%d.json" % OS.get_process_id()) if qa else "user://courtyard.json"

func _payload() -> Dictionary:
	return {"game": sim.serialise(), "settings": settings.duplicate()}

func _acquire_instance():
	if qa: return
	instance_lock = TCPServer.new()
	var port = 49166 + abs(OS.get_user_data_dir().hash()) % 6000
	instance_primary = instance_lock.listen(port, "127.0.0.1") == OK

func _save_progress() -> bool:
	if not started: return true
	if not instance_primary: return false
	var result = save_store.save_progress(_payload())
	save_problem = result.message
	if result.ok: saved_once = true
	return result.ok

func _load_progress():
	save_store = Store.new(_save_path())
	if qa:
		# QA never loads ordinary user progress; its isolated path has its own revision.
		save_store.load_progress()
		return
	var result = save_store.load_progress()
	save_problem = result.message
	if result.ok:
		sim.restore(result.payload.game)
		_load_settings(result.payload.get("settings", {}))
		saved_once = true

func _load_settings(data: Variant):
	if not data is Dictionary: return
	for key in ["music", "sfx", "ambience"]:
		if (data.get(key) is float or data.get(key) is int) and is_finite(data[key]): settings[key] = clampf(data[key], 0, 1)
	for key in ["gentle", "tap", "quality"]:
		if data.get(key) is bool: settings[key] = data[key]

func _export_save():
	var dialog = FileDialog.new()
	dialog.file_mode = FileDialog.FILE_MODE_SAVE_FILE
	dialog.access = FileDialog.ACCESS_FILESYSTEM
	dialog.use_native_dialog = true
	dialog.current_file = "Dustlings-courtyard.json"
	dialog.add_filter("*.json", "Dustlings save")
	add_child(dialog)
	dialog.file_selected.connect(func(file):
		if save_store.export_copy(file, _payload()): _notice("A copy is saved.")
		else: _notice("The copy could not be saved. Try another folder.")
		dialog.queue_free())
	dialog.canceled.connect(dialog.queue_free)
	dialog.popup_centered_ratio(0.7)

func _import_save():
	var dialog = FileDialog.new()
	dialog.file_mode = FileDialog.FILE_MODE_OPEN_FILE
	dialog.access = FileDialog.ACCESS_FILESYSTEM
	dialog.use_native_dialog = true
	dialog.add_filter("*.json", "Dustlings save")
	add_child(dialog)
	dialog.file_selected.connect(func(file):
		var data = save_store.read_copy(file)
		var candidate = Sim.new()
		if data is Dictionary and candidate.restore(data.get("game")):
			sim = candidate
			for node in creature_nodes: node.queue_free()
			creature_nodes.clear()
			_load_settings(data.get("settings", {}))
			_apply_settings()
			_sync_world(0)
			_save_progress()
			_close_modal()
			_notice("Your courtyard is here.")
		else: _notice("That is not a valid 3D courtyard save. Your progress is unchanged.")
		dialog.queue_free())
	dialog.canceled.connect(dialog.queue_free)
	dialog.popup_centered_ratio(0.7)

func _quit_safely(code = 0):
	if exiting: return
	exiting = true
	paused = true
	_stop_input()
	if audio: await audio.shutdown()
	if instance_lock: instance_lock.stop()
	get_tree().quit(code)

func _notification(what):
	if what == NOTIFICATION_WM_CLOSE_REQUEST:
		_stop_input()
		if _save_progress(): _quit_safely()
		else: _show_settings()
	if what == NOTIFICATION_APPLICATION_FOCUS_OUT:
		_stop_input()
		if started and modal_kind == "": _show_settings()

func _qa_capture(name: String):
	qa_capturing = true
	await RenderingServer.frame_post_draw
	DirAccess.make_dir_recursive_absolute(qa_output)
	var image = get_viewport().get_texture().get_image()
	image.save_png(qa_output.path_join(name + ".png"))
	qa_capturing = false

func _qa_fixture(restored: bool):
	sim = Sim.new()
	for node in creature_nodes: node.queue_free()
	creature_nodes.clear()
	sim.elapsed = 200
	for i in range(sim.dust.size()):
		sim.collect(i, 1.0 if restored or i < sim.dust.size() * 0.8 else 0.0, "assisted")
	for id in ["brush", "teamwork", "bloom"]: sim.buy(id)
	for c in sim.crew:
		var row = c.id / 10
		c.p = Vector2(-5.6 + (c.id % 10) * 1.15, 1.7 + row * 0.53)
		c.born = 0
	if restored:
		sim.restoration = 1.0
		sim.completed = true
	sim.events.clear()
	_sync_world(0.016)

func _qa_finish():
	qa_report["status"] = "failed" if qa_case == "opening" and (not sim.upgrades.brush or sim.assignment == Vector2.INF or sim.first_helper_at < 0 or sim.first_helper_at > 30) else "recorded"
	qa_report.merge({"kind": "Native Godot automated inspection; fixtures are explicitly labelled. No human test.", "engine": Engine.get_version_info(), "case": qa_case, "helpers": sim.crew.size(), "first_helper_at": sim.first_helper_at, "elapsed": sim.elapsed, "cleaned": sim.cleaned, "motes": sim.motes, "restoration": sim.restoration, "completed": sim.completed, "viewport": str(get_viewport().get_visible_rect().size), "draw_calls": Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME), "objects": Performance.get_monitor(Performance.RENDER_TOTAL_OBJECTS_IN_FRAME)})
	var file = FileAccess.open(qa_output.path_join("results.json"), FileAccess.WRITE)
	file.store_string(JSON.stringify(qa_report, "  "))
	file.close()
	print(JSON.stringify(qa_report))
	_quit_safely(1 if qa_report.status == "failed" else 0)

func _qa_mouse(point: Vector2, pressed: Variant = null):
	qa_pointer = point
	qa_driving_pointer = true
	var motion = InputEventMouseMotion.new()
	motion.position = point
	motion.global_position = point
	get_viewport().push_input(motion, true)
	if pressed != null:
		var button = InputEventMouseButton.new()
		button.position = point
		button.global_position = point
		button.button_index = MOUSE_BUTTON_LEFT
		button.pressed = pressed
		get_viewport().push_input(button, true)

func _qa_click(text: String) -> bool:
	for button in hud.find_children("*", "Button", true, false):
		if button.text == text and button.is_visible_in_tree() and not button.disabled:
			var center = button.get_global_rect().get_center()
			_qa_mouse(center, true)
			_qa_mouse(center, false)
			return true
	return false

func _qa_driver(delta):
	if qa_capturing or exiting: return
	qa_time += delta
	if qa_case == "opening":
		if qa_stage == 0 and qa_time >= 1:
			qa_stage = 1
			_qa_click("Bring it to life")
		elif qa_stage == 1 and qa_time >= 2:
			qa_stage = 2
			_qa_capture("dirty")
		elif qa_stage == 2 and qa_time >= 3:
			qa_stage = 3
			_qa_mouse(camera.unproject_position(Vector3(-5, 0, 2.0)), true)
		elif qa_stage == 3:
			var segment = floori((qa_time - 3) / 4.0)
			var point = Vector3(-5.5 + (segment % 5) * 1.0, 0, 1.7 + floorf(segment / 5.0) * 1.0)
			_qa_mouse(camera.unproject_position(point))
			if qa_time >= 15 and not qa_report.has("first_view"):
				qa_report.first_view = sim.crew.size()
				_qa_capture("first-helper")
			if qa_time >= 45:
				_qa_mouse(qa_pointer, false)
				qa_report.opening_motes = sim.motes
				qa_report.opening_crew = sim.crew.size()
				qa_stage = 4
		elif qa_stage == 4 and qa_time >= 46:
			qa_stage = 5
			_qa_mouse(grow_button.get_global_rect().get_center(), true)
			_qa_mouse(grow_button.get_global_rect().get_center(), false)
		elif qa_stage == 5 and qa_time >= 48:
			qa_stage = 6
			_qa_capture("discoveries")
		elif qa_stage == 6 and qa_time >= 49:
			qa_stage = 7
			var button = upgrade_buttons.get("brush")
			if button:
				_qa_mouse(button.get_global_rect().get_center(), true)
				_qa_mouse(button.get_global_rect().get_center(), false)
		elif qa_stage == 7 and qa_time >= 51:
			qa_stage = 8
			_qa_capture("purchase")
		elif qa_stage == 8 and qa_time >= 52:
			qa_stage = 9
			_qa_click("Back to the courtyard")
		elif qa_stage == 9 and qa_time >= 53:
			qa_stage = 10
			_qa_click("Direct  D")
		elif qa_stage == 10 and qa_time >= 54:
			qa_stage = 11
			var point = camera.unproject_position(Vector3(5, 0, 2.5))
			_qa_mouse(point, true)
			_qa_mouse(point, false)
		elif qa_stage == 11 and qa_time >= 57:
			qa_stage = 12
			_qa_capture("direction")
		elif qa_stage == 12 and qa_time >= 59:
			qa_stage = 13
			_qa_click("+")
		elif qa_stage == 13 and qa_time >= 61:
			qa_stage = 14
			_qa_click("Settings")
		elif qa_stage == 14 and qa_time >= 63:
			qa_stage = 15
			_qa_capture("settings")
		elif qa_stage == 15 and qa_time >= 64:
			qa_stage = 16
			_qa_click("Return to the courtyard")
		elif qa_stage == 16 and qa_time >= 66:
			qa_report.upgrade_bought = sim.upgrades.brush
			qa_report.crew_directed = sim.assignment != Vector2.INF
			qa_report.input_kind = "Generated native Godot InputEvents through visible buttons and surface raycast; no progress fixture or accelerated simulation in this opening."
			_qa_finish()
	elif qa_case == "profile":
		if qa_stage == 0 and qa_time >= 1:
			qa_stage = 1
			_start()
			_qa_fixture(false)
		elif qa_stage == 1 and qa_time >= 3:
			qa_stage = 2
			qa_profile_started = Time.get_ticks_usec()
		elif qa_stage == 2:
			qa_profile_frames.append(delta * 1000.0)
			if Time.get_ticks_usec() - qa_profile_started >= 60000000:
				qa_profile_frames.sort()
				var over = qa_profile_frames.filter(func(value): return value > 33.4)
				qa_report.performance = {"duration_seconds": (Time.get_ticks_usec() - qa_profile_started) / 1000000.0, "samples": qa_profile_frames.size(), "p95_ms": qa_profile_frames[int(qa_profile_frames.size() * 0.95)], "p99_ms": qa_profile_frames[int(qa_profile_frames.size() * 0.99)], "worst_ms": qa_profile_frames[-1], "over_33_4_ms": over, "conditions": "Visible native Godot Metal Forward+, 1280x800 window, normal MSAA/shadows/audio,50-helper fixture. No movie or screenshots during measured interval."}
				_qa_finish()
	elif qa_case == "ritual":
		if qa_stage == 0 and qa_time >= 1:
			qa_stage = 1
			_start()
			_qa_fixture(true)
			sim.restoration = 0
			sim.completed = false
			_sync_world(0)
		elif qa_stage == 1 and qa_time >= 3:
			qa_stage = 2
			_qa_click("Ring the fountain bell")
		elif qa_stage == 2 and qa_time >= 15:
			qa_stage = 3
			_qa_capture("chorus")
		elif qa_stage == 3 and qa_time >= 48:
			qa_stage = 4
			_qa_capture("completion")
		elif qa_stage == 4 and qa_time >= 50:
			qa_stage = 5
			_qa_click("Enjoy the courtyard")
		elif qa_stage == 5 and qa_time >= 53:
			qa_report.fixture = "All cleanup completed; fountain unawakened. Real-time chorus and ending triggered through visible bell."
			_qa_finish()
	elif qa_case == "overview":
		if qa_stage == 0 and qa_time >= 1:
			qa_stage = 1
			_qa_capture("welcome")
		elif qa_stage == 1 and qa_time >= 2:
			qa_stage = 2
			_start()
		elif qa_stage == 2 and qa_time >= 3:
			qa_stage = 3
			_qa_capture("dirty")
		elif qa_stage == 3 and qa_time >= 4:
			qa_stage = 4
			_qa_fixture(false)
		elif qa_stage == 4 and qa_time >= 9:
			qa_stage = 5
			_qa_capture("busy-fixture")
		elif qa_stage == 5 and qa_time >= 10:
			qa_stage = 6
			desired_zoom = 1.65
			camera_target = Vector3(-2, 0.1, 2.3)
		elif qa_stage == 6 and qa_time >= 12:
			qa_stage = 7
			_qa_capture("close-fixture")
		elif qa_stage == 7 and qa_time >= 13:
			qa_stage = 8
			desired_zoom = 1
			camera_target = Vector3(0, 0.1, 0.4)
			_qa_fixture(true)
		elif qa_stage == 8 and qa_time >= 16:
			qa_stage = 9
			_qa_capture("restored-fixture")
		elif qa_stage == 9 and qa_time >= 17:
			qa_stage = 10
			_show_settings()
		elif qa_stage == 10 and qa_time >= 18:
			qa_stage = 11
			_qa_capture("settings")
		elif qa_stage == 11 and qa_time >= 19:
			_qa_finish()

