extends SubViewportContainer
## A miniature capability demonstration. No game state, input, labels or audio.
const Creature = preload("res://scripts/dustling_visual.gd")
static var _shared_materials: Dictionary = {}
static var _shared_meshes: Dictionary = {}
var _kind = "brush"
var _gentle = false
var _clock = 0.0
var _viewport: SubViewport
var _world: Node3D
var _content: Node3D
var _camera: Camera3D
var _helpers: Array = []
var _ring: MeshInstance3D
var _water: MeshInstance3D
var _streams: MeshInstance3D
var _dust: MultiMeshInstance3D
var _built = false

func configure(kind: String, gentle_motion: bool):
	var next_kind = kind if kind in ["brush", "teamwork", "bloom"] else "brush"
	var rebuild = _kind != next_kind
	_kind = next_kind
	_gentle = gentle_motion
	if _built:
		if rebuild: _build_content()
		_update_pose(0)
		_update_visibility()

func _ready():
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	focus_mode = Control.FOCUS_NONE
	custom_minimum_size = Vector2(110, 84)
	stretch = true
	clip_contents = true
	_viewport = SubViewport.new()
	_viewport.name = "DiscoveryWorld"
	_viewport.size = Vector2i(110, 84)
	_viewport.transparent_bg = true
	_viewport.own_world_3d = true
	_viewport.gui_disable_input = true
	_viewport.audio_listener_enable_3d = false
	_viewport.msaa_3d = Viewport.MSAA_2X
	add_child(_viewport)
	_world = Node3D.new()
	_viewport.add_child(_world)
	var surroundings = WorldEnvironment.new()
	var environment = Environment.new()
	environment.background_mode = Environment.BG_CLEAR_COLOR
	environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	environment.ambient_light_color = Color("c4d9e1")
	environment.ambient_light_energy = 0.34
	environment.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	surroundings.environment = environment
	_world.add_child(surroundings)
	var light = DirectionalLight3D.new()
	light.rotation_degrees = Vector3(-58, -25, 0)
	light.light_color = Color("ffe9c4")
	light.light_energy = 0.9
	light.shadow_enabled = true
	light.directional_shadow_max_distance = 8
	light.shadow_bias = 0.03
	_world.add_child(light)
	_camera = Camera3D.new()
	_camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	_camera.size = 1.95
	_camera.position = Vector3(1.1, 3.2, 5.5)
	_world.add_child(_camera)
	_camera.look_at(Vector3(0, 0.23, 0))
	_camera.current = true
	_built = true
	_build_content()
	visibility_changed.connect(_update_visibility)
	_update_visibility()

static func _material(name: String, color: Color) -> StandardMaterial3D:
	if not _shared_materials.has(name):
		var material = StandardMaterial3D.new()
		material.albedo_color = color
		material.roughness = 0.88
		material.metallic_specular = 0.20
		_shared_materials[name] = material
	return _shared_materials[name]

func _part(mesh: Mesh, position: Vector3, material: Material) -> MeshInstance3D:
	var node = MeshInstance3D.new()
	node.mesh = mesh
	node.material_override = material
	node.position = position
	_content.add_child(node)
	return node

static func _box(size: Vector3) -> BoxMesh:
	var key = "box" + str(size)
	if not _shared_meshes.has(key):
		var mesh = BoxMesh.new()
		mesh.size = size
		_shared_meshes[key] = mesh
	return _shared_meshes[key]

static func _cylinder(top: float, bottom: float, height: float) -> CylinderMesh:
	var key = "cylinder" + str(Vector3(top, bottom, height))
	if not _shared_meshes.has(key):
		var mesh = CylinderMesh.new()
		mesh.top_radius = top
		mesh.bottom_radius = bottom
		mesh.height = height
		mesh.radial_segments = 24
		mesh.rings = 1
		_shared_meshes[key] = mesh
	return _shared_meshes[key]

static func _torus(inner: float, outer: float) -> TorusMesh:
	var key = "torus" + str(Vector2(inner, outer))
	if not _shared_meshes.has(key):
		var mesh = TorusMesh.new()
		mesh.inner_radius = inner
		mesh.outer_radius = outer
		mesh.rings = 32
		mesh.ring_segments = 6
		_shared_meshes[key] = mesh
	return _shared_meshes[key]

func _build_content():
	if is_instance_valid(_content):
		_world.remove_child(_content)
		_content.queue_free()
	_helpers.clear()
	_ring = null
	_water = null
	_streams = null
	_dust = null
	_clock = 0
	_content = Node3D.new()
	_world.add_child(_content)
	var stone = _material("stone", Color("c3bea4"))
	var cream = _material("cream", Color("e7dab9"))
	var teal = _material("teal", Color("4d9381"))
	_part(_box(Vector3(2.1, 0.10, 1.65)), Vector3(0, -0.075, 0), stone)
	var tiles = MultiMeshInstance3D.new()
	var multi = MultiMesh.new()
	multi.transform_format = MultiMesh.TRANSFORM_3D
	multi.mesh = _box(Vector3(0.665, 0.045, 0.79))
	multi.instance_count = 6
	for i in 6:
		multi.set_instance_transform(i, Transform3D(Basis.IDENTITY, Vector3((i % 3 - 1) * 0.69, -0.0225, (floori(i / 3.0) - 0.5) * 0.82)))
	tiles.multimesh = multi
	tiles.material_override = _material("paving", Color("c8c8b2"))
	_content.add_child(tiles)
	_camera.size = 1.95 if _kind != "bloom" else 2.1
	if _kind == "brush":
		# Muted old radius remains visible so the new width has a comparison.
		_part(_torus(0.39, 0.411), Vector3(0, 0.023, 0), _material("old_radius", Color("89988b")))
		_ring = _part(_torus(0.69, 0.725), Vector3(0, 0.045, 0), teal)
		_build_dust(14)
	elif _kind == "teamwork":
		for x in [-0.37, 0.37]:
			var helper = _helper(Vector3(x, 0, -0.03), 1.18)
			helper.rotation.y = 0.08
		_build_dust(10)
	else:
		_part(_cylinder(0.50, 0.53, 0.13), Vector3(0, 0.07, -0.08), stone)
		_part(_torus(0.40, 0.54), Vector3(0, 0.19, -0.08), cream)
		_part(_cylinder(0.13, 0.20, 0.61), Vector3(0, 0.39, -0.08), cream)
		_part(_cylinder(0.28, 0.13, 0.13), Vector3(0, 0.72, -0.08), stone)
		_part(_torus(0.22, 0.30), Vector3(0, 0.81, -0.08), cream)
		_part(_cylinder(0.045, 0.075, 0.22), Vector3(0, 0.88, -0.08), cream)
		_water = _part(_cylinder(0.395, 0.395, 0.025), Vector3(0, 0.20, -0.08), teal)
		_streams = _part(_stream_mesh(), Vector3(0, 0, -0.08), teal)
		_part(_torus(0.745, 0.761), Vector3(0, 0.014, 0), _material("chorus_circle", Color("84967b")))
		for spot in [Vector3(-0.70, 0, -0.20), Vector3(0.70, 0, -0.20), Vector3(0, 0, 0.70)]:
			var helper = _helper(spot, 0.76)
			helper.rotation.y = atan2(-spot.x, -spot.z) if spot.z < 0.6 else 0.0
	_update_pose(0)

func _helper(position: Vector3, scale_value: float) -> Node3D:
	var helper = Creature.new()
	helper.position = position
	helper.scale = Vector3.ONE * scale_value
	_content.add_child(helper)
	_helpers.append(helper)
	return helper

func _build_dust(count: int):
	_dust = MultiMeshInstance3D.new()
	var multi = MultiMesh.new()
	multi.transform_format = MultiMesh.TRANSFORM_3D
	multi.mesh = _cylinder(0.035, 0.055, 0.012)
	multi.instance_count = count
	for i in count:
		var angle = float(i) * 2.4
		var distance = 0.34 + float(i % 4) * 0.10
		var spot = Vector3(cos(angle) * distance, 0.008, sin(angle) * distance)
		if _kind == "teamwork": spot = Vector3(-0.62 + (i % 5) * 0.31, 0.008, 0.40 + floori(i / 5.0) * 0.18)
		multi.set_instance_transform(i, Transform3D(Basis.IDENTITY, spot))
	_dust.multimesh = multi
	_dust.material_override = _material("dust", Color("9f9279"))
	_dust.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	_content.add_child(_dust)

static func _stream_mesh() -> ArrayMesh:
	if _shared_meshes.has("streams"): return _shared_meshes.streams
	var surface = SurfaceTool.new()
	surface.begin(Mesh.PRIMITIVE_TRIANGLES)
	for side in [-1.0, 1.0]:
		for segment in 8:
			for face in 6:
				for vertex in [Vector2i(0, 0), Vector2i(1, 1), Vector2i(1, 0), Vector2i(0, 0), Vector2i(0, 1), Vector2i(1, 1)]:
					var t = (segment + vertex.x) / 8.0
					var angle = (face + vertex.y) / 6.0 * TAU
					var normal = Vector3(cos(angle), 0, sin(angle))
					surface.set_normal(normal)
					surface.add_vertex(Vector3(side * (0.25 + t * 0.12), 0.79 - t * t * 0.58, 0) + normal * 0.015)
	var mesh = surface.commit()
	_shared_meshes.streams = mesh
	return mesh

func _update_pose(delta: float):
	var cycle = 1.0 if _gentle else 0.5 - cos(_clock * TAU / 5.0) * 0.5
	if is_instance_valid(_ring):
		var width = lerpf(0.60, 1.0, smoothstep(0.08, 0.70, cycle))
		_ring.scale = Vector3(width, 1, width)
	if is_instance_valid(_water):
		var growth = lerpf(0.60, 1.0, smoothstep(0.08, 0.80, cycle))
		_water.scale = Vector3(growth, 1, growth)
		_streams.visible = cycle > 0.20
	for helper in _helpers:
		helper.pose(0.1 if _gentle else delta, 1.3 if _gentle else _clock, 0, 0.9 if _kind == "teamwork" else 0, 2, false, _gentle)

func _update_visibility():
	if not _built: return
	var visible_now = is_visible_in_tree()
	set_process(visible_now and not _gentle)
	_viewport.render_target_update_mode = SubViewport.UPDATE_WHEN_VISIBLE if visible_now and not _gentle else (SubViewport.UPDATE_ONCE if visible_now else SubViewport.UPDATE_DISABLED)

func _visible_pixels() -> bool:
	var bounds = get_global_rect()
	var ancestor = get_parent()
	while ancestor:
		if ancestor is Control and ancestor.clip_contents:
			bounds = bounds.intersection(ancestor.get_global_rect())
		ancestor = ancestor.get_parent()
	return bounds.has_area() and bounds.intersects(get_viewport_rect())

func _process(delta: float):
	if not _visible_pixels(): return
	_clock += minf(delta, 0.1)
	_update_pose(delta)

func _exit_tree():
	set_process(false)
	if is_instance_valid(_viewport): _viewport.render_target_update_mode = SubViewport.UPDATE_DISABLED
	# The owned SubViewport/world are children and are freed with this container.
