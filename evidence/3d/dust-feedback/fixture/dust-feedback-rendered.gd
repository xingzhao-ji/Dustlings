extends Node3D
## A low dust texture made from actual geometry. Root owns field, progress and time.
const MAX_BRUSH_WISPS = 32
const MAX_GENTLE_WISPS = 8
const MAX_STATIC_INSTANCES = 1200
var _field: ImageTexture
var _configured_dust: Array = []
var _batches: Array = []
var _drift_material: ShaderMaterial
var _particle_material: StandardMaterial3D
var _brush_wisps: MultiMeshInstance3D
var _particles: Array = []
var _spawn_credit = 0.0
var _last_brush = Vector3.ZERO
var _has_last_brush = false
var _rng = RandomNumberGenerator.new()
var _ready_done = false
var static_instance_count = 0

func configure(field: ImageTexture, dust: Array):
	_field = field
	_configured_dust = dust
	if _ready_done: _build()

func _ready():
	_ready_done = true
	_rng.seed = 619
	if _field: _build()

func reset():
	_particles.clear()
	_spawn_credit = 0
	_has_last_brush = false
	if is_instance_valid(_brush_wisps): _brush_wisps.multimesh.visible_instance_count = 0

func _build():
	for batch in _batches:
		if is_instance_valid(batch): remove_child(batch); batch.queue_free()
	_batches.clear()
	if is_instance_valid(_brush_wisps): remove_child(_brush_wisps); _brush_wisps.queue_free()
	reset()
	static_instance_count = 0
	_drift_material = ShaderMaterial.new()
	_drift_material.shader = preload("res://shaders/dust_drift.gdshader")
	_drift_material.set_shader_parameter("dust_field", _field)
	var drifts: Array = [[], [], []]
	var fibres: Array = []
	for d in _configured_dust:
		if static_instance_count >= MAX_STATIC_INSTANCES: break
		var seed = float(d.get("seed", 0.5))
		var spot: Vector2 = d.p
		# Sparse irregular drifts, not one pebble per simulation cell.
		if seed < 0.43:
			var length = lerpf(0.21, 0.37, fmod(seed * 29.7, 1.0))
			var width = lerpf(0.09, 0.18, fmod(seed * 43.1, 1.0))
			var angle = seed * 37.0
			var extent = Vector2(absf(cos(angle)) * length + absf(sin(angle)) * width, absf(sin(angle)) * length + absf(cos(angle)) * width)
			var center = _on_paver(spot, extent)
			var basis = Basis(Vector3.UP, angle) * Basis.IDENTITY.scaled(Vector3(length, 0.65 + seed * 0.70, width))
			drifts[int(seed * 97) % 3].append({"transform": Transform3D(basis, Vector3(center.x, 0.0008, center.y)), "color": Color("aaa08c").lightened(fmod(seed * 17.0, 1.0) * 0.07)})
			static_instance_count += 1
		if seed > 0.22:
			for i in 2:
				if static_instance_count >= MAX_STATIC_INSTANCES: break
				var angle = seed * 28.0 + i * 1.4
				var span = 0.08 + fmod(seed * 15.7 + i * 0.23, 1.0) * 0.10
				var center = _on_paver(spot + Vector2(cos(angle), sin(angle)) * 0.10, Vector2.ONE * span * 0.58)
				var basis = Basis(Vector3.UP, angle).scaled(Vector3(span, 0.11, span))
				fibres.append({"transform": Transform3D(basis, Vector3(center.x, 0.001, center.y)), "color": Color("b8ad96").darkened(i * 0.035)})
				static_instance_count += 1
	for i in 3: _static_batch(_drift_mesh(i), drifts[i], "LowDustDrifts" + str(i))
	_static_batch(_fibre_mesh(), fibres, "GroundDustFibres")
	_particle_material = StandardMaterial3D.new()
	_particle_material.albedo_color = Color("b7aa91")
	_particle_material.roughness = 1.0
	_particle_material.metallic_specular = 0.05
	_particle_material.cull_mode = BaseMaterial3D.CULL_DISABLED
	_brush_wisps = MultiMeshInstance3D.new()
	_brush_wisps.name = "BrushingWisps"
	var multi = MultiMesh.new()
	multi.transform_format = MultiMesh.TRANSFORM_3D
	multi.mesh = _fibre_mesh()
	multi.instance_count = MAX_BRUSH_WISPS
	multi.visible_instance_count = 0
	_brush_wisps.multimesh = multi
	_brush_wisps.material_override = _particle_material
	_brush_wisps.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(_brush_wisps)

func _on_paver(point: Vector2, extent: Vector2) -> Vector2:
	# Match unchanged paver faces. Large outer-edge drifts move to the adjacent
	# full tile rather than bridge grout or extend beyond the cleanable field.
	var col = clampi(roundi((point.x + 7.13) / 1.02), 0, 14)
	var row = clampi(roundi((point.y + 4.02) / 0.95), 0, 9)
	var low = Vector2.ZERO
	var high = Vector2.ZERO
	for attempt in 2:
		var center = Vector2(-7.13 + col * 1.02, -4.02 + row * 0.95)
		var half = Vector2(0.465, 0.430)
		low = center - half + extent
		high = center + half - extent
		low = Vector2(maxf(low.x, -7.24 + extent.x), maxf(low.y, -4.08 + extent.y))
		high = Vector2(minf(high.x, 7.24 - extent.x), minf(high.y, 4.54 - extent.y))
		if low.x > high.x: col += 1 if col < 7 else -1
		if low.y > high.y: row += 1 if row < 5 else -1
	return point.clamp(low, high)

func _static_batch(mesh: Mesh, instances: Array, label: String):
	if instances.is_empty(): return
	var node = MultiMeshInstance3D.new()
	node.name = label
	var multi = MultiMesh.new()
	multi.transform_format = MultiMesh.TRANSFORM_3D
	multi.use_colors = true
	multi.mesh = mesh
	multi.instance_count = instances.size()
	for i in instances.size():
		multi.set_instance_transform(i, instances[i].transform)
		multi.set_instance_color(i, instances[i].color)
	node.multimesh = multi
	node.material_override = _drift_material
	node.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(node)
	_batches.append(node)

func _drift_mesh(variant: int) -> ArrayMesh:
	var surface = SurfaceTool.new()
	surface.begin(Mesh.PRIMITIVE_TRIANGLES)
	var ring: Array[Vector3] = []
	for i in 14:
		var angle = i * TAU / 14.0
		var radius = 0.80 + sin(angle * 3 + variant * 1.7) * 0.12 + cos(angle * 5 + variant) * 0.06
		ring.append(Vector3(cos(angle) * radius, 0.001, sin(angle) * radius))
	var peak = Vector3(0.12 * sin(variant), 0.024, -0.12 * cos(variant))
	for i in 14:
		for point in [peak, ring[(i + 1) % 14], ring[i]]:
			surface.add_vertex(point)
	surface.generate_normals()
	return surface.commit()

func _fibre_mesh() -> ArrayMesh:
	var surface = SurfaceTool.new()
	surface.begin(Mesh.PRIMITIVE_TRIANGLES)
	for segment in 5:
		for corner in [Vector2i(0, 0), Vector2i(1, 1), Vector2i(1, 0), Vector2i(0, 0), Vector2i(0, 1), Vector2i(1, 1)]:
			var t = (segment + corner.x) / 5.0
			var point = Vector3(t - 0.5, sin(t * PI) * 0.07, sin(t * TAU) * 0.08 + (corner.y - 0.5) * 0.065)
			surface.set_normal(Vector3.UP)
			surface.add_vertex(point)
	return surface.commit()

func tick(delta: float, _elapsed: float, removed_brushed: float, world_point: Vector3, gentle: bool):
	if not is_instance_valid(_brush_wisps): return
	var dt = clampf(delta, 0, 0.10)
	for i in range(_particles.size() - 1, -1, -1):
		var p = _particles[i]
		p.age += dt
		if p.age >= p.life: _particles.remove_at(i)
	var cap = MAX_GENTLE_WISPS if gentle else MAX_BRUSH_WISPS
	while _particles.size() > cap: _particles.pop_back()
	if removed_brushed > 0 and dt > 0:
		_spawn_credit = minf(_spawn_credit + removed_brushed * (18.0 if gentle else 34.0), 4.0)
		var direction = Vector2(world_point.x - _last_brush.x, world_point.z - _last_brush.z) if _has_last_brush else Vector2.ZERO
		if direction.length() > 0.01: direction = direction.normalized()
		while _spawn_credit >= 1 and _particles.size() < cap:
			_spawn_credit -= 1
			var angle = _rng.randf() * TAU
			var offset = Vector2(cos(angle), sin(angle)) * _rng.randf_range(0.08, 0.35)
			var center = _on_paver(Vector2(world_point.x, world_point.z) + offset, Vector2.ONE * 0.07)
			if center.length() < 1.52: continue
			_particles.append({"origin": center, "direction": direction * 0.10 + offset * 0.13, "age": 0.0, "life": 0.22 if gentle else _rng.randf_range(0.32, 0.48), "angle": angle, "length": _rng.randf_range(0.075, 0.14), "lift": 0.008 if gentle else 0.045})
		_last_brush = world_point
		_has_last_brush = true
	else:
		_spawn_credit = 0
		_has_last_brush = false
	for i in _particles.size():
		var p = _particles[i]
		var fraction = p.age / p.life
		var position = p.origin + p.direction * fraction
		var height = 0.003 + sin(fraction * PI) * p.lift
		var size = p.length * (1.0 - fraction * 0.78)
		var basis = Basis(Vector3.UP, p.angle + fraction * 0.4).scaled(Vector3(size, 0.12, size))
		_brush_wisps.multimesh.set_instance_transform(i, Transform3D(basis, Vector3(position.x, height, position.y)))
	_brush_wisps.multimesh.visible_instance_count = _particles.size()
