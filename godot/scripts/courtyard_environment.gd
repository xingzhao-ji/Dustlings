extends Node3D
## Original real-3D courtyard. The root game owns camera, time, dust and helpers.
## Walkable: x[-7.3,7.3], z[-4.1,4.7], ground y=0; fountain obstacle radius1.45.

var _batches: Dictionary = {}
var _mesh_cache: Dictionary = {}
var _materials: Dictionary = {}
var _restoration: float = 0.0
var _gentle_motion: bool = false
var _built: bool = false
var _water_material: ShaderMaterial
var _stream_material: ShaderMaterial
var _plant_material: ShaderMaterial
var _water_nodes: Array[Node3D] = []
var _flower_parts: Array[Dictionary] = []
var _flowers: MultiMeshInstance3D
var _fountain_light: OmniLight3D
var _window_lights: Array[OmniLight3D] = []
var _last_growth: float = -1.0
var _stone := Color("d9cdae")
var _cream := Color("efe1bf")
var _sage := Color("6e967d")
var _clay := Color("b77e60")

func _ready() -> void:
    _create_materials()
    _build_ground()
    _build_house(Vector3(-5.1, 0.0, -6.28), false)
    _build_house(Vector3(5.25, 0.0, -6.28), true)
    _build_boundary()
    _build_fountain()
    _build_gardens()
    _finish_batches()
    _build_blossoms()
    _built = true
    set_restoration(_restoration)
    set_gentle_motion(_gentle_motion)

func _create_materials() -> void:
    for key in ["ground", "stone", "wood", "metal", "flowers", "windows"]:
        var material := StandardMaterial3D.new()
        material.vertex_color_use_as_albedo = true
        material.vertex_color_is_srgb = true
        material.albedo_color = Color.WHITE
        material.roughness = 0.86 if key != "metal" else 0.55
        material.metallic = 0.15 if key == "metal" else 0.0
        material.metallic_specular = 0.3
        _materials[key] = material
    _materials["windows"].albedo_color = Color("d3dbc0")
    _materials["windows"].emission_enabled = true
    _materials["windows"].emission = Color("f1ca87")
    _materials["windows"].emission_energy_multiplier = 0.0
    _water_material = ShaderMaterial.new()
    _water_material.shader = load("res://shaders/courtyard_environment_water.gdshader")
    _stream_material = ShaderMaterial.new()
    _stream_material.shader = load("res://shaders/courtyard_stream_flow.gdshader")
    _plant_material = ShaderMaterial.new()
    _plant_material.shader = load("res://shaders/courtyard_environment_vegetation.gdshader")
    _materials["plants"] = _plant_material

func _queue_mesh(mesh: Mesh, transform: Transform3D, color: Color, group: String = "stone") -> void:
    if not _batches.has(group):
        _batches[group] = {"vertices": [], "normals": [], "colors": [], "uv": [], "indices": []}
    var data: Dictionary = _batches[group]
    var source: Array = mesh.surface_get_arrays(0)
    var vertices: PackedVector3Array = source[Mesh.ARRAY_VERTEX]
    var normals: PackedVector3Array = source[Mesh.ARRAY_NORMAL]
    var indices: PackedInt32Array = source[Mesh.ARRAY_INDEX] if source[Mesh.ARRAY_INDEX] != null else PackedInt32Array()
    var uvs: PackedVector2Array = source[Mesh.ARRAY_TEX_UV] if source[Mesh.ARRAY_TEX_UV] != null else PackedVector2Array()
    var first: int = data["vertices"].size()
    var normal_basis: Basis = transform.basis.inverse().transposed()
    for i in vertices.size():
        data["vertices"].append(transform * vertices[i])
        data["normals"].append((normal_basis * normals[i]).normalized())
        data["colors"].append(color)
        data["uv"].append(uvs[i] if i < uvs.size() else Vector2.ZERO)
    if indices.is_empty():
        for i in vertices.size():
            data["indices"].append(first + i)
    else:
        for index in indices:
            data["indices"].append(first + index)

func _mesh_from_data(data: Dictionary) -> ArrayMesh:
    var arrays: Array = []
    arrays.resize(Mesh.ARRAY_MAX)
    arrays[Mesh.ARRAY_VERTEX] = PackedVector3Array(data["vertices"])
    arrays[Mesh.ARRAY_NORMAL] = PackedVector3Array(data["normals"])
    arrays[Mesh.ARRAY_COLOR] = PackedColorArray(data["colors"])
    arrays[Mesh.ARRAY_TEX_UV] = PackedVector2Array(data["uv"])
    arrays[Mesh.ARRAY_INDEX] = PackedInt32Array(data["indices"])
    var mesh := ArrayMesh.new()
    mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
    return mesh

func _finish_batches() -> void:
    for group in _batches:
        var mesh: ArrayMesh = _mesh_from_data(_batches[group])
        var instance := MeshInstance3D.new()
        instance.name = "Courtyard_" + group
        instance.mesh = mesh
        instance.material_override = _materials[group]
        instance.set_meta("cleanable", group == "ground")
        add_child(instance)
        # Exact triangle geometry is used for brush rays, including bevelled paving.
        var body := StaticBody3D.new()
        body.name = "Ground" if group == "ground" else "CourtyardBlockers_" + group
        body.collision_layer = 1
        body.collision_mask = 0
        body.set_meta("cleanable", group == "ground")
        var shape := CollisionShape3D.new()
        shape.shape = mesh.create_trimesh_shape()
        body.add_child(shape)
        add_child(body)
    _batches.clear()

func _bevel_box(size: Vector3, bevel: float) -> ArrayMesh:
    var key := "box_" + str(size) + "_" + str(bevel)
    if _mesh_cache.has(key):
        return _mesh_cache[key]
    var half: Vector3 = size * 0.5
    var radius: float = minf(bevel, minf(half.x, minf(half.y, half.z)) * 0.85)
    var inner: Vector3 = half - Vector3.ONE * radius
    var st := SurfaceTool.new()
    st.begin(Mesh.PRIMITIVE_TRIANGLES)
    # Six tessellated cube faces, projected onto a rounded box; real bevel geometry.
    for axis in 3:
        var a: int = (axis + 1) % 3
        var b: int = (axis + 2) % 3
        var u: Array[float] = [-half[a], -inner[a], inner[a], half[a]]
        var v: Array[float] = [-half[b], -inner[b], inner[b], half[b]]
        for sign_value in [-1.0, 1.0]:
            for row in 3:
                for col in 3:
                    var points: Array[Vector3] = []
                    var normals: Array[Vector3] = []
                    for corner in [Vector2i(col, row), Vector2i(col + 1, row), Vector2i(col + 1, row + 1), Vector2i(col, row + 1)]:
                        var raw := Vector3.ZERO
                        raw[axis] = half[axis] * sign_value
                        raw[a] = u[corner.x]
                        raw[b] = v[corner.y]
                        var closest := Vector3(clampf(raw.x, -inner.x, inner.x), clampf(raw.y, -inner.y, inner.y), clampf(raw.z, -inner.z, inner.z))
                        var normal: Vector3 = (raw - closest).normalized()
                        points.append(closest + normal * radius)
                        normals.append(normal)
                    var order: Array = [0, 2, 1, 0, 3, 2] if sign_value > 0 else [0, 1, 2, 0, 2, 3]
                    for i in order:
                        st.set_normal(normals[i])
                        st.set_uv(Vector2(points[i][a], points[i][b]))
                        st.add_vertex(points[i])
    var mesh: ArrayMesh = st.commit()
    _mesh_cache[key] = mesh
    return mesh

func _box(position: Vector3, size: Vector3, color: Color, bevel: float = 0.08, group: String = "stone", rotation_y: float = 0.0) -> void:
    _queue_mesh(_bevel_box(size, bevel), Transform3D(Basis(Vector3.UP, rotation_y), position), color, group)

func _sphere(position: Vector3, size: Vector3, color: Color, group: String = "plants") -> void:
    if not _mesh_cache.has("sphere"):
        var mesh := SphereMesh.new()
        mesh.radius = 0.5
        mesh.height = 1.0
        mesh.radial_segments = 12
        mesh.rings = 6
        _mesh_cache["sphere"] = mesh
    _queue_mesh(_mesh_cache["sphere"], Transform3D(Basis.IDENTITY.scaled(size), position), color, group)

func _cylinder(position: Vector3, top: float, bottom: float, height: float, color: Color, group: String = "stone", sides: int = 24) -> void:
    var mesh := CylinderMesh.new()
    mesh.top_radius = top
    mesh.bottom_radius = bottom
    mesh.height = height
    mesh.radial_segments = sides
    mesh.rings = 1
    _queue_mesh(mesh, Transform3D(Basis.IDENTITY, position), color, group)

func _ring(position: Vector3, inner: float, outer: float, color: Color) -> void:
    var mesh := TorusMesh.new()
    mesh.inner_radius = inner
    mesh.outer_radius = outer
    mesh.rings = 32
    mesh.ring_segments = 10
    _queue_mesh(mesh, Transform3D(Basis.IDENTITY, position), color)

func _build_ground() -> void:
    _box(Vector3(0, -0.35, -0.5), Vector3(19.2, 0.64, 14.7), Color("b3ab91"), 0.30, "ground")
    _box(Vector3(0, -0.075, 0.3), Vector3(15.7, 0.10, 9.6), Color("b6b59d"), 0.12, "ground")
    # Tactile paving, batched in one mesh. Main tile tops are exactly at y=0.
    for row in 10:
        for col in 15:
            var x: float = -7.13 + float(col) * 1.02
            var z: float = -4.02 + float(row) * 0.95
            var shade: float = sin(float(row * 23 + col * 13)) * 0.023
            var color: Color = Color("d8cfb4").lightened(shade)
            _box(Vector3(x, -0.06, z), Vector3(0.975, 0.12, 0.907), color, 0.045, "ground")
    # Low border stones sit outside the clear work rectangle.
    for col in 17:
        var x: float = -7.55 + col * 0.94
        _box(Vector3(x, 0.025, 5.24), Vector3(0.9, 0.17, 0.42), _cream, 0.06)
    for side in [-1.0, 1.0]:
        for row in 11:
            _box(Vector3(side * 7.93, 0.035, -4.35 + row * 0.93), Vector3(0.40, 0.19, 0.88), _cream, 0.06)
    _box(Vector3(0, -0.06, 5.69), Vector3(2.4, 0.22, 0.64), _stone, 0.09)
    _box(Vector3(0, -0.20, 6.14), Vector3(2.78, 0.24, 0.48), _cream, 0.09)

func _gable_mesh(width: float, height: float, depth: float) -> ArrayMesh:
    var vertices: Array[Vector3] = [Vector3(-width * 0.5, 0, depth * 0.5), Vector3(width * 0.5, 0, depth * 0.5), Vector3(0, height, depth * 0.5), Vector3(-width * 0.5, 0, -depth * 0.5), Vector3(width * 0.5, 0, -depth * 0.5), Vector3(0, height, -depth * 0.5)]
    var faces: Array = [[0, 2, 1], [3, 4, 5], [0, 1, 4], [0, 4, 3], [1, 2, 5], [1, 5, 4], [2, 0, 3], [2, 3, 5]]
    var st := SurfaceTool.new()
    st.begin(Mesh.PRIMITIVE_TRIANGLES)
    for face in faces:
        var normal: Vector3 = -(vertices[face[1]] - vertices[face[0]]).cross(vertices[face[2]] - vertices[face[0]]).normalized()
        for index in face:
            st.set_normal(normal)
            st.set_uv(Vector2(vertices[index].x, vertices[index].y))
            st.add_vertex(vertices[index])
    return st.commit()

func _build_house(origin: Vector3, green_roof: bool) -> void:
    var wall := Color("e7d9b8") if not green_roof else Color("e1dac0")
    var roof := _sage if green_roof else _clay
    _box(origin + Vector3(0, 0.08, 0), Vector3(3.70, 0.22, 3.0), _stone, 0.10)
    _box(origin + Vector3(0, 1.28, 0), Vector3(3.35, 2.45, 2.65), wall, 0.15)
    _queue_mesh(_gable_mesh(3.35, 0.72, 2.65), Transform3D(Basis.IDENTITY, origin + Vector3(0, 2.43, 0)), wall)
    # Two pitched solid roof slabs and a rounded ridge, rather than a texture roof.
    for side in [-1.0, 1.0]:
        var mesh: ArrayMesh = _bevel_box(Vector3(2.05, 0.19, 3.22), 0.055)
        var basis := Basis(Vector3.FORWARD, side * 0.42)
        _queue_mesh(mesh, Transform3D(basis, origin + Vector3(side * 0.91, 2.76, 0)), roof, "wood")
        for row in 5:
            var tile_x: float = side * (0.16 + row * 0.35)
            var tile_y: float = 3.295 - absf(tile_x) * 0.445
            _box(origin + Vector3(tile_x, tile_y, 0), Vector3(0.055, 0.045, 3.07), roof.lightened(0.08), 0.015, "wood")
    _box(origin + Vector3(0, 3.19, 0), Vector3(0.20, 0.20, 3.29), roof.lightened(0.06), 0.09, "wood")
    _box(origin + Vector3(0.93, 3.25, -0.72), Vector3(0.36, 0.95, 0.45), wall, 0.07)
    _box(origin + Vector3(0.93, 3.73, -0.72), Vector3(0.47, 0.12, 0.56), _cream, 0.045)
    # Arched door and window proportions make the buildings feel like inviting toys.
    _box(origin + Vector3(0, 0.67, 1.354), Vector3(0.80, 1.22, 0.09), Color("617c68") if not green_roof else Color("a17c59"), 0.13, "wood")
    _sphere(origin + Vector3(0, 1.25, 1.35), Vector3(0.79, 0.58, 0.10), Color("617c68") if not green_roof else Color("a17c59"), "wood")
    _sphere(origin + Vector3(0.23, 0.67, 1.416), Vector3.ONE * 0.08, Color("d8b979"), "metal")
    for x in [-1.04, 1.04]:
        _box(origin + Vector3(x, 1.43, 1.365), Vector3(0.66, 0.84, 0.09), Color("98ae95"), 0.14)
        _box(origin + Vector3(x, 1.43, 1.42), Vector3(0.48, 0.63, 0.04), Color.WHITE, 0.10, "windows")
        _box(origin + Vector3(x, 1.42, 1.45), Vector3(0.035, 0.63, 0.055), _cream, 0.008)
        _box(origin + Vector3(x, 1.38, 1.45), Vector3(0.48, 0.035, 0.055), _cream, 0.008)
        _box(origin + Vector3(x, 0.99, 1.45), Vector3(0.77, 0.10, 0.21), _stone, 0.045)
    var window_light := OmniLight3D.new()
    window_light.position = origin + Vector3(0, 1.30, 1.68)
    window_light.light_color = Color("f5cf91")
    window_light.omni_range = 1.8
    window_light.light_energy = 0.0
    window_light.shadow_enabled = false
    add_child(window_light)
    _window_lights.append(window_light)
    _box(origin + Vector3(0, 0.07, 1.68), Vector3(1.18, 0.15, 0.40), _cream, 0.07)
    _pot(origin + Vector3(-1.71, 0, 1.25), 0.25)
    _pot(origin + Vector3(1.70, 0, 1.26), 0.24)

func _build_boundary() -> void:
    for side in [-1.0, 1.0]:
        for col in 4:
            var x: float = side * (1.40 + col * 0.62)
            _box(Vector3(x, 0.59, -5.04), Vector3(0.59, 1.12, 0.44), Color("cec8aa"), 0.075)
            _box(Vector3(x, 1.17, -5.04), Vector3(0.66, 0.12, 0.55), _cream, 0.045)
        _cylinder(Vector3(side * 1.11, 0.75, -5.08), 0.14, 0.18, 1.52, _stone)
        _sphere(Vector3(side * 1.11, 1.55, -5.08), Vector3.ONE * 0.28, _cream, "stone")
    # An open gate offers a village boundary without inventing an accessible zone.
    for x in [-0.80, -0.52, -0.24]:
        _box(Vector3(x, 0.69, -5.00 + (x + 0.8) * 0.45), Vector3(0.035, 1.18, 0.035), Color("6b8574"), 0.01, "metal")
    _box(Vector3(-0.52, 0.99, -4.88), Vector3(0.68, 0.045, 0.045), Color("6b8574"), 0.01, "metal", -0.42)
    _box(Vector3(-0.52, 0.26, -4.88), Vector3(0.68, 0.045, 0.045), Color("6b8574"), 0.01, "metal", -0.42)
    # Bench outside the work rectangle, with real legs touching the base.
    for z in [1.75, 2.50]:
        _box(Vector3(-8.64, 0.31, z), Vector3(0.12, 0.63, 0.13), Color("829078"), 0.035, "wood")
        _box(Vector3(-8.05, 0.31, z), Vector3(0.12, 0.63, 0.13), Color("829078"), 0.035, "wood")
    for x in [-8.60, -8.34, -8.08]:
        _box(Vector3(x, 0.65, 2.13), Vector3(0.21, 0.12, 1.08), Color("b19a70"), 0.035, "wood")
    for y in [0.92, 1.15]:
        _box(Vector3(-8.71, y, 2.13), Vector3(0.12, 0.15, 1.12), Color("b8a27a"), 0.035, "wood")

func _build_fountain() -> void:
    _cylinder(Vector3(0, 0.02, 0), 1.44, 1.44, 0.10, Color("c9c5a9"), "stone", 48)
    _cylinder(Vector3(0, 0.13, 0), 1.31, 1.39, 0.18, _stone, "stone", 32)
    _ring(Vector3(0, 0.30, 0), 1.12, 1.43, _cream)
    _cylinder(Vector3(0, 0.28, 0), 1.13, 1.14, 0.10, Color("829b85"), "stone", 48)
    _cylinder(Vector3(0, 0.44, 0), 0.39, 0.53, 0.25, _stone)
    _cylinder(Vector3(0, 0.92, 0), 0.23, 0.28, 0.78, _cream)
    _cylinder(Vector3(0, 1.35, 0), 0.60, 0.24, 0.24, _stone)
    _ring(Vector3(0, 1.49, 0), 0.47, 0.64, _cream)
    _cylinder(Vector3(0, 1.69, 0), 0.10, 0.15, 0.41, _cream)
    _sphere(Vector3(0, 1.91, 0), Vector3(0.25, 0.32, 0.25), Color("bba16b"), "stone")
    for i in 12:
        var angle: float = i * TAU / 12.0
        _box(Vector3(cos(angle) * 1.34, 0.29, sin(angle) * 1.34), Vector3(0.14, 0.14, 0.14), _stone, 0.045)
    var water_mesh := CylinderMesh.new()
    water_mesh.top_radius = 1.10
    water_mesh.bottom_radius = 1.10
    water_mesh.height = 0.025
    water_mesh.radial_segments = 48
    var water := MeshInstance3D.new()
    water.name = "RestoredWater"
    water.mesh = water_mesh
    water.material_override = _water_material
    water.position.y = 0.347
    add_child(water)
    _water_nodes.append(water)
    # Real curved water streams from the bowl to the basin.
    for side in [-1.0, 1.0]:
        var points: Array[Vector3] = []
        for i in 17:
            var t: float = i / 16.0
            points.append(Vector3(side * (0.51 + t * 0.37), 1.45 - t * t * 1.08, 0.0))
        var stream := MeshInstance3D.new()
        stream.mesh = _tube_mesh(points, 0.045)
        stream.material_override = _stream_material
        stream.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
        add_child(stream)
        _water_nodes.append(stream)
    _fountain_light = OmniLight3D.new()
    _fountain_light.position = Vector3(0, 1.1, 0)
    _fountain_light.light_color = Color("cce6cc")
    _fountain_light.omni_range = 2.6
    _fountain_light.light_energy = 0.0
    _fountain_light.shadow_enabled = false
    add_child(_fountain_light)

func _tube_mesh(points: Array[Vector3], radius: float) -> ArrayMesh:
    var st := SurfaceTool.new()
    st.begin(Mesh.PRIMITIVE_TRIANGLES)
    for segment in points.size() - 1:
        var tangent: Vector3 = (points[segment + 1] - points[segment]).normalized()
        var side: Vector3 = tangent.cross(Vector3.FORWARD).normalized()
        var up: Vector3 = tangent.cross(side).normalized()
        for i in 8:
            for corner in [Vector2i(0, i), Vector2i(1, i + 1), Vector2i(1, i), Vector2i(0, i), Vector2i(0, i + 1), Vector2i(1, i + 1)]:
                var angle: float = corner.y * TAU / 8.0
                var normal: Vector3 = side * cos(angle) + up * sin(angle)
                st.set_normal(normal)
                st.set_uv(Vector2(float(corner.y) / 8.0, float(segment + corner.x) / 16.0))
                st.add_vertex(points[segment + corner.x] + normal * radius)
    return st.commit()

func _pot(position: Vector3, radius: float) -> void:
    _cylinder(position + Vector3(0, radius * 0.63, 0), radius, radius * 0.73, radius * 1.3, _clay)
    _ring(position + Vector3(0, radius * 1.23, 0), radius * 0.77, radius * 1.04, _clay.lightened(0.07))
    _cylinder(position + Vector3(0, radius * 1.30, 0), radius * 0.79, radius * 0.79, 0.035, Color("796f50"))
    _plant(position + Vector3(0, radius * 1.30, 0), radius * 0.8)

func _plant(position: Vector3, scale_value: float) -> void:
    for i in 5:
        var angle: float = i * TAU / 5.0
        _sphere(position + Vector3(cos(angle) * scale_value * 0.35, scale_value * 0.6, sin(angle) * scale_value * 0.35), Vector3(scale_value * 0.75, scale_value * 1.2, scale_value * 0.75), _sage.lightened(float(i % 3) * 0.025))
    var center: Vector3 = position + Vector3(0, scale_value * 1.4, 0)
    for petal in 5:
        var angle: float = petal * TAU / 5.0
        _flower_parts.append({"center": center, "offset": Vector3(cos(angle) * 0.075, 0, sin(angle) * 0.075), "size": Vector3(0.105, 0.055, 0.105), "color": Color("eedac0")})
    _flower_parts.append({"center": center, "offset": Vector3(0, 0.018, 0), "size": Vector3.ONE * 0.067, "color": Color("d2ac65")})

func _build_gardens() -> void:
    for side in [-1.0, 1.0]:
        for z in [-2.30, 3.85]:
            _box(Vector3(side * 8.55, 0.17, z), Vector3(0.97, 0.40, 1.62), _stone, 0.15)
            _box(Vector3(side * 8.55, 0.38, z), Vector3(0.72, 0.10, 1.37), Color("817c58"), 0.12)
            for offset in [-0.48, 0.0, 0.48]:
                _plant(Vector3(side * 8.55, 0.43, z + offset), 0.32)
        for col in 6:
            var x: float = side * (2.0 + col * 0.82)
            _box(Vector3(x, 0.11, 5.64), Vector3(0.76, 0.28, 0.69), _stone, 0.11)
            _plant(Vector3(x, 0.27, 5.64), 0.28)
    for x in [-2.8, 2.7]:
        _sphere(Vector3(x, 1.31, -5.08), Vector3(0.84, 0.58, 0.58), _sage)
        _sphere(Vector3(x + 0.27, 1.30, -5.00), Vector3(0.52, 0.45, 0.55), _sage.lightened(0.05))
    _pot(Vector3(8.53, 0, 0.4), 0.30)

func _build_blossoms() -> void:
    var sphere := SphereMesh.new()
    sphere.radius = 0.5
    sphere.height = 1.0
    sphere.radial_segments = 8
    sphere.rings = 4
    var multi := MultiMesh.new()
    multi.transform_format = MultiMesh.TRANSFORM_3D
    multi.use_colors = true
    multi.mesh = sphere
    multi.instance_count = _flower_parts.size()
    _flowers = MultiMeshInstance3D.new()
    _flowers.name = "RestorationBlossoms"
    _flowers.multimesh = multi
    _flowers.material_override = _materials["flowers"]
    add_child(_flowers)
    for i in _flower_parts.size():
        multi.set_instance_color(i, Color(_flower_parts[i]["color"]))

func set_restoration(value: float) -> void:
    _restoration = clampf(value, 0.0, 1.0)
    if not _built:
        return
    _plant_material.set_shader_parameter("restoration", _restoration)
    _water_material.set_shader_parameter("restoration", _restoration)
    _stream_material.set_shader_parameter("restoration", _restoration)
    _water_nodes[0].visible = _restoration > 0.12
    for i in range(1, _water_nodes.size()):
        _water_nodes[i].visible = _restoration > 0.54
    _fountain_light.light_energy = _restoration * 0.20
    var warmth := smoothstep(0.58, 0.98, _restoration)
    _materials["windows"].albedo_color = Color("d3dbc0").lerp(Color("f1d29a"), warmth)
    _materials["windows"].emission_energy_multiplier = warmth * 0.45
    for light in _window_lights: light.light_energy = warmth * 0.14
    if absf(_last_growth - _restoration) > 0.005 or _last_growth < 0.0:
        _last_growth = _restoration
        var growth: float = lerpf(0.08, 1.0, smoothstep(0.35, 1.0, _restoration))
        _flowers.visible = _restoration > 0.25
        for i in _flower_parts.size():
            var part: Dictionary = _flower_parts[i]
            var size: Vector3 = part["size"] * growth
            var position: Vector3 = part["center"] + part["offset"] * growth
            _flowers.multimesh.set_instance_transform(i, Transform3D(Basis.IDENTITY.scaled(size), position))

func set_gentle_motion(enabled: bool) -> void:
    _gentle_motion = enabled
    if _water_material:
        _water_material.set_shader_parameter("motion_amount", 0.0 if enabled else 1.0)
    if _stream_material:
        _stream_material.set_shader_parameter("motion_amount", 0.0 if enabled else 1.0)
    if _plant_material:
        _plant_material.set_shader_parameter("motion_amount", 0.0 if enabled else 1.0)

func tick_environment(_delta: float, time: float) -> void:
    if not _built:
        return
    _water_material.set_shader_parameter("time_seconds", time)
    _stream_material.set_shader_parameter("time_seconds", time)
    _plant_material.set_shader_parameter("time_seconds", time)
