class_name DustlingVisual
extends Node3D
## Original volumetric character. The owner positions this ground-origin node and
## points +Z toward travel. pose() changes children only; no sprites or camera.

static var _meshes: Dictionary = {}
static var _materials: Dictionary = {}
var _visual: Node3D
var _rig: Node3D
var _eyes: MultiMeshInstance3D
var _glints: MultiMeshInstance3D
var _feet: MultiMeshInstance3D
var _hands: MultiMeshInstance3D
var _leaves: MultiMeshInstance3D
var _mouth: MeshInstance3D
var _stride := 0.0
var _walk := 0.0
var _work := 0.0
var _anticipation := 0.0
var _moving := false
var _phase := 0.0
var _work_clock := 0.0
var _was_working := false
var _contact_strength := 0.0
var _contact_point := Vector3.ZERO

func _ready() -> void:
	_prepare_resources()
	_phase = fmod(float(get_instance_id()) * 0.618034, TAU)
	_visual = Node3D.new()
	_visual.name = "GroundedVisual"
	add_child(_visual)
	_rig = Node3D.new()
	_rig.name = "SoftBodyAndFace"
	_visual.add_child(_rig)
	var body := _part("SeedBody", _meshes.body, _materials.cream, _rig)
	body.position.y = 0.281
	body.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	_eyes = _pair("Eyes", _meshes.round, _materials.eyes, _rig)
	_glints = _pair("EyeGlints", _meshes.round, _materials.glints, _rig)
	_feet = _pair("LittleFeet", _meshes.round, _materials.feet, _visual)
	# Independent hand transforms let the working reach contact the paving while
	# the body leans. Idle/travel retain the original body-relative transforms.
	_hands = _pair("TidyingHands", _meshes.round, _materials.cream, _visual)
	_leaves = _pair("TwoLeafSprout", _meshes.leaf, _materials.leaf, _rig)
	_mouth = _part("QuietSmile", _meshes.smile, _materials.eyes, _rig)
	_mouth.position = Vector3(0, 0.287, 0.213)
	pose(0, 0, 0, 0, 1, false, false)

func pose(delta: float, elapsed: float, speed: float, working: float, birth_age: float, celebrating: bool, gentle_motion: bool) -> void:
	if not is_instance_valid(_visual):
		return
	var dt := clampf(delta, 0.0, 0.1)
	var moving_now := speed > 0.08 and birth_age > 0.8
	if moving_now and not _moving and not gentle_motion:
		_anticipation = 0.24
	_moving = moving_now
	_anticipation = maxf(0, _anticipation - dt)
	_walk = move_toward(_walk, clampf(speed / 0.8, 0, 1), dt * 7)
	var working_now := working > 0.01 and birth_age > 0.8 and not celebrating
	if working_now and not _was_working: _work_clock = 0.0
	_was_working = working_now
	_work = move_toward(_work, clampf(working, 0, 1) if working_now else 0.0, dt * 7)
	if working_now: _work_clock += dt * (1.0 + sin(_phase) * 0.035)
	# Work stays distinct from travel and the fountain celebration. This only
	# changes pose; simulation speed, direction and actual production stay owned.
	var work_weight := (0.0 if celebrating else _work) * (1.0 - smoothstep(0.12, 0.45, maxf(speed, 0)))
	var cycle := fmod(_work_clock, 1.6) / 1.6
	var reach := smoothstep(0.12, 0.30, cycle) * (1.0 - smoothstep(0.73, 0.94, cycle))
	var contact := smoothstep(0.27, 0.34, cycle) * (1.0 - smoothstep(0.66, 0.75, cycle))
	var sweep := lerpf(-1.0, 1.0, smoothstep(0.32, 0.68, cycle))
	var preparing := sin(clampf(cycle / 0.16, 0, 1) * PI) if cycle < 0.16 else 0.0
	if gentle_motion:
		reach = 1.0
		contact = 0.30
		sweep = 0.0
		preparing = 0.0
	_contact_strength = contact * work_weight if working_now else 0.0
	_contact_point = Vector3.ZERO
	_stride += maxf(speed, 0) * dt * TAU / 0.28
	var mood := elapsed + _phase
	var growth := smoothstep(0.0, 0.62, maxf(0, birth_age))
	var scale_birth := maxf(0.035, growth)
	if not gentle_motion and birth_age > 0.4 and birth_age < 0.9:
		scale_birth += sin((birth_age - 0.4) / 0.5 * PI) * 0.045
	_visual.scale = Vector3.ONE * scale_birth
	var hop := 0.0
	var crouch := 0.0
	if not gentle_motion:
		if _anticipation > 0.16:
			crouch = sin((_anticipation - 0.16) / 0.08 * PI) * 0.05
		elif _anticipation > 0:
			hop = sin(_anticipation / 0.16 * PI) * 0.038
		if celebrating:
			var beat := fmod(mood * 0.9, 1.0)
			hop = pow(maxf(0, sin(beat * TAU)), 1.5) * 0.075
			crouch = maxf(crouch, pow(maxf(0, -sin(beat * TAU)), 3) * 0.035)
	_visual.position.y = hop
	var breathing := sin(mood * 2.5) * (0.002 if gentle_motion else 0.012) * (1.0 - work_weight * 0.75)
	_rig.scale = Vector3(1 + crouch * 0.55, 1 + breathing - crouch, 1 + crouch * 0.35)
	_rig.position = Vector3(sweep * contact * work_weight * 0.016, -reach * work_weight * 0.012, -preparing * work_weight * 0.010)
	if not gentle_motion: _rig.position.y += absf(sin(_stride)) * _walk * 0.012
	var curiosity := sin(mood * 0.65) * sin(mood * 0.31) * (1 - _walk) * (1 - _work)
	_rig.rotation = Vector3((reach * 0.34 - preparing * 0.065) * work_weight * (0.76 if gentle_motion else 1.0), curiosity * (0.025 if gentle_motion else 0.18), sweep * contact * work_weight * -0.045)
	if not gentle_motion:
		_rig.rotation.z += sin(_stride) * _walk * 0.035 + curiosity * 0.07
	var blink_clock := fmod(mood, 4.4)
	var blink := 1.0
	if blink_clock > 4.23:
		blink = 1.0 - sin((blink_clock - 4.23) / 0.17 * PI) * 0.93
	if birth_age < 0.20:
		blink = 0.12
	for i in range(2):
		var side := -1.0 if i == 0 else 1.0
		_put(_eyes, i, Vector3(side * 0.077, 0.335, 0.193), Vector3(0.045, 0.069 * blink, 0.028))
		_put(_glints, i, Vector3(side * 0.077 - 0.006, 0.335 + 0.011 * blink, 0.207), Vector3(0.012, 0.016 * blink, 0.008))
		var foot_phase := _stride + i * PI
		var lift := maxf(0, sin(foot_phase)) * _walk * (0.011 if gentle_motion else 0.035)
		var fore := -cos(foot_phase) * _walk * 0.067
		# Ellipsoid half-height is0.040: stance feet touch y=0 exactly.
		_put(_feet, i, Vector3(side * 0.087, 0.040 + lift, 0.047 + fore), Vector3(0.104, 0.080, 0.142))
		var idle_hand := Transform3D(Basis.from_euler(Vector3(0, 0, side * 0.20)).scaled(Vector3(0.073, 0.105, 0.085)), Vector3(side * 0.193, 0.212, 0.065))
		idle_hand = _rig.transform * idle_hand
		var shoulder := _rig.transform * Vector3(side * 0.17, 0.205, 0.075)
		var hand_ground := Vector3(side * 0.155 + sweep * contact * 0.10, 0.018, 0.26 + contact * 0.028)
		var ground_hand := _reaching_hand(shoulder, hand_ground)
		# The existing round hand becomes a soft reaching arm. No extra mesh,
		# material, particle or shadow is added to a crowded character.
		var blend := reach * work_weight
		var hand_transform := idle_hand if blend <= 0.00001 else idle_hand.interpolate_with(ground_hand, blend)
		_hands.multimesh.set_instance_transform(i, hand_transform)
		_contact_point += _ellipsoid_lowpoint(hand_transform) * 0.5
		var leaf_growth := maxf(0.08, smoothstep(0.16, 0.72, birth_age))
		var sway := sin(mood * 2.8 + i) * (0.01 if gentle_motion else 0.09)
		var leaf_rotation := Vector3(sway + reach * work_weight * 0.08, PI if i == 0 else 0.0, side * (-0.13 + sway))
		_put(_leaves, i, Vector3(side * 0.012, 0.503, 0), Vector3.ONE * leaf_growth, leaf_rotation)
	_mouth.scale = Vector3(1.15 if celebrating else 1.0, 1.18 if celebrating else 1.0, 1)

func work_stroke() -> float:
	## Actual pose contact, not an authority to award or remove dust.
	return _contact_strength

func work_contact() -> Vector3:
	## World-space ground point; caller controls all emitted feedback.
	return _visual.to_global(_contact_point) if is_instance_valid(_visual) else global_position

static func _reaching_hand(shoulder: Vector3, contact: Vector3) -> Transform3D:
	var axis := (shoulder - contact).normalized()
	var across := Vector3.FORWARD.cross(axis).normalized()
	var forward := across.cross(axis).normalized()
	var length := shoulder.distance_to(contact) + 0.040
	var basis := Basis(across, axis, forward) * Basis.IDENTITY.scaled(Vector3(0.083, length, 0.083))
	var center := (shoulder + contact) * 0.5
	# Analytic ellipsoid bound keeps the complete round hand above the paving.
	var half_y := Vector3(basis.x.y, basis.y.y, basis.z.y).length() * 0.5
	center.y = maxf(center.y, half_y + 0.003)
	return Transform3D(basis, center)

static func _ellipsoid_lowpoint(transform: Transform3D) -> Vector3:
	var basis := transform.basis
	var extent := Vector3(basis.x.y, basis.y.y, basis.z.y).length()
	var weighted := basis.x * basis.x.y + basis.y * basis.y.y + basis.z * basis.z.y
	return transform.origin - weighted / maxf(0.00001, 2.0 * extent)

static func _put(group: MultiMeshInstance3D, index: int, origin: Vector3, size: Vector3, rotation_angles := Vector3.ZERO) -> void:
	group.multimesh.set_instance_transform(index, Transform3D(Basis.from_euler(rotation_angles).scaled(size), origin))

static func _part(label: String, mesh: Mesh, material: Material, parent: Node3D) -> MeshInstance3D:
	var node := MeshInstance3D.new()
	node.name = label
	node.mesh = mesh
	node.material_override = material
	node.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(node)
	return node

static func _pair(label: String, mesh: Mesh, material: Material, parent: Node3D) -> MultiMeshInstance3D:
	var node := MultiMeshInstance3D.new()
	node.name = label
	var instances := MultiMesh.new()
	instances.transform_format = MultiMesh.TRANSFORM_3D
	instances.mesh = mesh
	instances.instance_count = 2
	node.multimesh = instances
	node.material_override = material
	node.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(node)
	return node

static func _mat(color: Color, roughness: float) -> StandardMaterial3D:
	var material := StandardMaterial3D.new()
	material.albedo_color = color
	material.roughness = roughness
	material.metallic_specular = 0.18
	return material

static func _prepare_resources() -> void:
	if not _meshes.is_empty():
		return
	var sphere := SphereMesh.new()
	sphere.radius = 0.5
	sphere.height = 1.0
	sphere.radial_segments = 20
	sphere.rings = 12
	_meshes.round = sphere
	_materials.cream = _mat(Color("e8dec4"), 0.96)
	_materials.cream.rim_enabled = true
	_materials.cream.rim = 0.20
	_materials.cream.rim_tint = 0.75
	_materials.cream.vertex_color_use_as_albedo = true
	_materials.eyes = _mat(Color("283a31"), 0.65)
	_materials.glints = _mat(Color("fff9df"), 0.7)
	_materials.feet = _mat(Color("b39366"), 0.94)
	_materials.leaf = _mat(Color("72926a"), 0.88)
	_meshes.body = _seed_mesh()
	_meshes.leaf = _leaf_mesh()
	_meshes.smile = _smile_mesh()

static func _seed_mesh() -> ArrayMesh:
	var source := SphereMesh.new()
	source.radius = 0.5
	source.height = 1
	source.radial_segments = 28
	source.rings = 18
	var arrays := source.get_mesh_arrays()
	var vertices: PackedVector3Array = arrays[Mesh.ARRAY_VERTEX]
	var normals: PackedVector3Array = arrays[Mesh.ARRAY_NORMAL]
	var colors := PackedColorArray()
	for i in range(vertices.size()):
		var v := vertices[i]
		var ny := v.y * 2
		var nap := sin(v.x * 26 + v.y * 11) * sin(v.z * 23 - v.y * 15) * 0.008
		var taper := 1.0 - ny * 0.10 + nap
		vertices[i] = Vector3(v.x * 0.46 * taper, v.y * 0.46, v.z * 0.42 * taper)
		normals[i] = Vector3(v.x / 0.46, v.y / 0.46, v.z / 0.42).normalized()
		var tint := 0.965 + (ny + 1) * 0.012 + nap
		colors.append(Color(tint, tint, tint, 1))
	arrays[Mesh.ARRAY_VERTEX] = vertices
	arrays[Mesh.ARRAY_NORMAL] = normals
	arrays[Mesh.ARRAY_COLOR] = colors
	var mesh := ArrayMesh.new()
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
	return mesh

static func _leaf_mesh() -> ArrayMesh:
	# A closed, curved almond volume. Its narrow lower section forms the stem.
	var surface := SurfaceTool.new()
	surface.begin(Mesh.PRIMITIVE_TRIANGLES)
	var rows := 12
	var sides := 8
	for row in range(rows + 1):
		var t := float(row) / rows
		var width := pow(sin(t * PI), 1.25) * 0.054 + 0.001
		for side in range(sides + 1):
			var a := float(side) / sides * TAU
			surface.add_vertex(Vector3(t * t * 0.086 + cos(a) * width, t * 0.160, sin(a) * width * 0.24 + sin(t * PI) * 0.016))
	for row in range(rows):
		for side in range(sides):
			var a := row * (sides + 1) + side
			var b := a + sides + 1
			for index in [a, a + 1, b, a + 1, b + 1, b]:
				surface.add_index(index)
	surface.generate_normals()
	return surface.commit()

static func _smile_mesh() -> ArrayMesh:
	var surface := SurfaceTool.new()
	surface.begin(Mesh.PRIMITIVE_TRIANGLES)
	for row in range(11):
		var t := float(row) / 10
		for side in range(7):
			var a := float(side) / 6 * TAU
			surface.add_vertex(Vector3((t - 0.5) * 0.044, -sin(t * PI) * 0.012 + cos(a) * 0.0045, sin(a) * 0.0045))
	for row in range(10):
		for side in range(6):
			var a := row * 7 + side
			var b := a + 7
			for index in [a, b, a + 1, a + 1, b, b + 1]:
				surface.add_index(index)
	surface.generate_normals()
	return surface.commit()
