extends "res://scripts/courtyard_environment.gd"
## Bellwether: one connected, walkable opening neighborhood. Real geometry;
## intentional cutaway roofs keep the close third-person camera out of ceilings.
## Root owns campaign state, inhabitants, lighting, player and interactions.

var anchors: Dictionary = {
    "home": Vector3(-10, 0, 6.2), "wardrobe": Vector3(-11.6, 0, 3.8),
    "workshop": Vector3(10, 0, 1.6), "wood": Vector3(7, 0, 3.4),
    "parcel": Vector3(7.2, 0, 2.8), "delivery": Vector3(-2, 0, 3),
    "bridge": Vector3(0, 0, -3.25), "garden": Vector3(-4.6, 0, -8.0),
    "herbs": Vector3(-6.4, 0, -9.2), "vine_wall": Vector3(12, 0, -9.0),
    "greenhouse_memory": Vector3(12, 0, -13), "alcove": Vector3(-12, 0, -11.7),
    "shared_table": Vector3(-3, 0, -10.7)
}
var _bridge_parts: Node3D
var _broken_parts: Node3D
var _bridge_stop: StaticBody3D
var _vine_gate: Node3D
var _vine_stop: StaticBody3D
var _garden_blooms: Node3D
var _gathering_props: Node3D
var _home_cloth: MeshInstance3D
var _home_curtains: Array[MeshInstance3D] = []
var _old_lantern_glass: MeshInstance3D
var _old_lantern_light: OmniLight3D
var _home_kettle: Node3D
var _home_star: Node3D
var _garden_flower_parts: Array[Dictionary] = []
var _greenhouse_glow: OmniLight3D
var _story: Dictionary = {}
var _story_ready := false
var _reveal := 0.0
var _garden_growth := 0.0
var _world_time := 0.0
var _story_seen := false
var _bridge_settle := 1.0
var _bridge_planks: Array[Dictionary] = []
var _moth: Node3D
var _moth_wings: Array[Node3D] = []
var _moth_wake := 0.0
var _moth_greeting := 10.0
var _moth_target := Vector3.ZERO
var _moth_glow: OmniLight3D
var _alcove_glow: OmniLight3D
var _alcove_treasure: Node3D
var _alcove_star: Node3D
var _alcove_reveal := 0.0

func _create_materials() -> void:
    super._create_materials()
    # Preserve the existing three solid batches; material distinction is quiet,
    # static and localized to the arrival representative location in the shader.
    for i in 3:
        var material := ShaderMaterial.new()
        material.shader = load("res://shaders/rpg_surface.gdshader")
        material.set_shader_parameter("material_kind", i)
        _materials[["ground", "stone", "wood"][i]] = material

func _ready() -> void:
    _create_materials()
    _materials["windows"].albedo_color = Color("f1d6a4")
    _materials["windows"].emission_energy_multiplier = 0.20
    _plant_material.set_shader_parameter("restoration", 1.0)
    _water_material.set_shader_parameter("restoration", 1.0)
    _terrain()
    _home()
    _workshop()
    _canal_bridge()
    _garden()
    _greenhouse()
    _quiet_alcove()
    _village_details()
    _old_lantern()
    _finish_batches()
    _build_blossoms()
    # Ordinary potted blossoms are not tied to the campaign's garden reveal.
    for i in _flower_parts.size():
        var part: Dictionary = _flower_parts[i]
        _flowers.multimesh.set_instance_transform(i, Transform3D(Basis.IDENTITY.scaled(part["size"]), part["center"] + part["offset"]))
    _story_ready = true
    set_story(_story)
    # The first external story application is a load, not a live repair event.
    _story_seen = false
    _moth_wake = 1.0 if _flag("memory_found") else 0.0
    _alcove_reveal = 1.0 if _flag("alcove_found") else 0.0
    _reveal = 1.0 if _flag("greenhouse_open") else 0.0
    _garden_growth = 1.0 if _flag("garden_watered") else 0.0
    _apply_animated_story()

func get_spawn() -> Vector3:
    return Vector3(0, 0, 9)

func set_story(state: Dictionary) -> void:
    var was_repaired := _flag("bridge_repaired")
    _story = state.duplicate(true)
    if not _story_ready: return
    var repaired := _flag("bridge_repaired")
    if repaired and not was_repaired and _story_seen:
        _bridge_settle = 0.0
    elif not _story_seen or not repaired:
        _bridge_settle = 1.0
    if not _story_seen:
        _moth_wake = 1.0 if _flag("memory_found") else 0.0
        _alcove_reveal = 1.0 if _flag("alcove_found") else 0.0
    _story_seen = true
    _bridge_parts.visible = repaired
    _broken_parts.visible = not repaired
    _bridge_stop.collision_layer = 0 if repaired else 1
    _vine_stop.collision_layer = 0 if _flag("greenhouse_open") else 1
    _gathering_props.visible = _flag("shared_table")
    var color := Color("779883") if str(state.get("home", "clay")) == "sage" else Color("c68b6c")
    var cloth := _home_cloth.material_override as StandardMaterial3D
    cloth.albedo_color = color
    for curtain in _home_curtains:
        (curtain.material_override as StandardMaterial3D).albedo_color = color
    _home_kettle.visible = _flag("recipe_shared")
    _home_star.visible = _flag("alcove_found")
    var lantern_lit := _flag("first_companion")
    var glass := _old_lantern_glass.material_override as StandardMaterial3D
    glass.albedo_color = Color("f0d59c") if lantern_lit else Color("acb09a")
    glass.emission_energy_multiplier = 0.38 if lantern_lit else 0.0
    _old_lantern_light.light_energy = 0.15 if lantern_lit else 0.0

func _flag(key: String) -> bool:
    return bool(_story.get("flags", {}).get(key, false))

func _process(delta: float) -> void:
    _world_time += delta
    _moth_greeting += delta
    _water_material.set_shader_parameter("time_seconds", _world_time)
    _plant_material.set_shader_parameter("time_seconds", _world_time)
    _reveal = move_toward(_reveal, 1.0 if _flag("greenhouse_open") else 0.0, delta * 0.38)
    _garden_growth = move_toward(_garden_growth, 1.0 if _flag("garden_watered") else 0.0, delta * 0.45)
    _bridge_settle = move_toward(_bridge_settle, 1.0, delta / 2.8)
    _moth_wake = move_toward(_moth_wake, 1.0 if _flag("memory_found") else 0.0, delta * 0.48)
    _alcove_reveal = move_toward(_alcove_reveal, 1.0 if _flag("alcove_found") else 0.0, delta * 0.7)
    if _story_ready: _apply_animated_story()

func _apply_animated_story() -> void:
    # Vines curl down to the threshold, opening real physical passage.
    _vine_gate.scale.y = maxf(0.03, 1.0 - smoothstep(0, 1, _reveal))
    _vine_gate.visible = _reveal < 0.995
    _greenhouse_glow.light_energy = _reveal * 0.85
    var growth := lerpf(0.04, 1.0, smoothstep(0, 1, _garden_growth))
    for part in _garden_flower_parts:
        var blossom: MeshInstance3D = part.node
        blossom.scale = part.size * growth
        blossom.position.y = float(part.height) * growth
    _garden_blooms.visible = _garden_growth > 0.005
    for i in _bridge_planks.size():
        var plank: MeshInstance3D = _bridge_planks[i].node
        var place := clampf((_bridge_settle - float(i) * 0.058) / 0.42, 0, 1)
        var settle := 1.0 - smoothstep(0, 1, place)
        plank.visible = place > 0 or i < 2 or i > 7
        plank.position = _bridge_planks[i].at + Vector3((1.0 if i % 2 else -1.0) * settle * 0.10, settle * (0.03 if _gentle_motion else 0.16), 0)
        plank.rotation = Vector3(0, settle * (0.025 if _gentle_motion else 0.08) * (1.0 if i % 2 else -1.0), 0)
    if _moth:
        var awaken := smoothstep(0, 1, _moth_wake)
        var hover := sin(_world_time * 2.6) * (0.004 if _gentle_motion else 0.025) * awaken
        _moth.position = Vector3(12, 1.17 + awaken * 0.32 + hover, -13.6 + awaken * 0.22)
        if _moth_greeting < 5.5:
            var greeting := smoothstep(0, 1, _moth_greeting / 1.8) * (1.0 - smoothstep(0, 1, (_moth_greeting - 2.6) / 2.9))
            _moth.position = _moth.position.lerp(_moth_target, greeting) + Vector3(0, sin(greeting * PI) * 0.25, 0)
        _moth.rotation.y = sin(_world_time * 0.8) * 0.07 * awaken
        for i in _moth_wings.size():
            var side := -1.0 if i == 0 else 1.0
            var flutter := sin(_world_time * 7.5) * (0.045 if _gentle_motion else 0.20) * awaken
            _moth_wings[i].rotation.z = side * (lerpf(1.1, 0.10, awaken) + flutter)
        _moth_glow.light_energy = 0.035 + awaken * 0.10
    if _alcove_glow:
        _alcove_glow.light_energy = _alcove_reveal * 0.48
        _alcove_treasure.visible = true
        _alcove_star.visible = _alcove_reveal < 0.99

func _finish_batches() -> void:
    # Geometry is visual; broad, deliberate colliders below avoid leaf/handle snags.
    # Ground is a flat collision surface while paving has sub-centimetre relief.
    for group in _batches:
        var instance := MeshInstance3D.new()
        instance.name = "Neighborhood_" + str(group)
        instance.mesh = _mesh_from_data(_batches[group])
        instance.material_override = _materials[group]
        add_child(instance)
    _batches.clear()

func _solid(label: String, at: Vector3, size: Vector3, camera: bool = false) -> StaticBody3D:
    var body := StaticBody3D.new()
    body.name = label
    body.position = at
    body.collision_layer = 3 if camera else 1
    body.collision_mask = 0
    var shape := CollisionShape3D.new()
    var box := BoxShape3D.new()
    box.size = size
    shape.shape = box
    body.add_child(shape)
    add_child(body)
    return body

func _dynamic_box(parent: Node3D, at: Vector3, size: Vector3, color: Color, label: String = "Detail") -> MeshInstance3D:
    var mesh := MeshInstance3D.new()
    mesh.name = label
    mesh.mesh = _bevel_box(size, 0.045)
    var material := StandardMaterial3D.new()
    material.albedo_color = color
    material.roughness = 0.86
    mesh.material_override = material
    mesh.position = at
    parent.add_child(mesh)
    return mesh

func _dynamic_round(parent: Node3D, at: Vector3, size: Vector3, color: Color) -> MeshInstance3D:
    var mesh := MeshInstance3D.new()
    var ball := SphereMesh.new()
    ball.radius = 0.5
    ball.height = 1.0
    ball.radial_segments = 10
    ball.rings = 5
    mesh.mesh = ball
    var material := StandardMaterial3D.new()
    material.albedo_color = color
    material.roughness = 0.88
    mesh.material_override = material
    mesh.position = at
    mesh.scale = size
    parent.add_child(mesh)
    return mesh

func _terrain() -> void:
    _scenic_surround()
    _box(Vector3(0, -0.42, -1), Vector3(37, 0.8, 35), Color("839b82"), 0.5, "ground")
    _solid("WalkingGround", Vector3(0, -0.5, -1), Vector3(37, 1, 35))
    # Long boundaries are dressed by hillside trees rather than invisible room walls.
    for side in [-1.0, 1.0]:
        _solid("VillageEdge", Vector3(side * 18.3, 1, -1), Vector3(0.6, 3, 35))
    _solid("NorthEdge", Vector3(0, 1, -18), Vector3(37, 3, 0.6))
    _solid("SouthEdge", Vector3(0, 1, 16), Vector3(37, 3, 0.6))
    # Hand-set slabs keep the same plaza footprint without a checkerboard of
    # equal square joints. Larger staggered clusters carry attention up the lane.
    var widths: Array[float] = [1.52, 1.13, 1.87, 1.34]
    for row in 8:
        var z := -2.984 + (float(row) + 0.5) * 1.346
        var left := -7.534
        var col := 0
        while left < 6.82:
            var length: float = widths[(col + row) % widths.size()]
            if col == 0 and row % 2 == 1: length = 0.77
            length = minf(length, 6.834 - left)
            var x := left + length * 0.5
            if not (absf(x) > 4.5 and z > 5.7):
                var shade := sin(float(row * 17 + col * 11)) * 0.012
                var center_warmth := 1.0 - smoothstep(1.6, 6.4, absf(x))
                var color := Color("c2b79a").lerp(Color("d3c6a6"), center_warmth * 0.58).lightened(shade)
                # Flat broad faces and 16mm joints, down from 32mm; no extra
                # collision bodies or small stepping edges are introduced.
                _box(Vector3(x, -0.035, z), Vector3(length - 0.016, 0.08, 1.330), color, 0.017, "ground")
            left += length
            col += 1
    _path(Vector3(-10, 0, 7.5), Vector3(-5, 0, 7.5), 2.4)
    _path(Vector3(5, 0, 2), Vector3(10, 0, 2), 2.6)
    _path(Vector3(0, 0, -2.5), Vector3(0, 0, -9), 2.8)
    _path(Vector3(-12, 0, -9), Vector3(12, 0, -9), 2.0)
    _path(Vector3(-3, 0, -9), Vector3(-3, 0, -14), 2.8)
    _path(Vector3(12, 0, -9), Vector3(12, 0, -13), 2.2)
    # The entry settles into a ring of old stones and one small village marker.
    for i in 14:
        var angle := float(i) / 14.0 * TAU
        _box(Vector3(sin(angle) * 2.0, -0.008, 9 + cos(angle) * 2.0), Vector3(0.33, 0.07, 0.50), _cream, 0.06, "stone", -angle)
    _post_lamp(Vector3(-2.6, 0, 8.3))
    _post_lamp(Vector3(3.4, 0, 7))

func _scenic_height(x: float, z: float) -> float:
    # Six broad earthen banks, blended into one continuous nonwalkable surround.
    # Nothing rises inside the established village rectangle. The original
    # physical floor and boundary bodies remain the only traversable terrain.
    var outside := maxf(absf(x) - 18.0, absf(z + 1.0) - 17.0)
    var hills: Array[Vector4] = [
        Vector4(-28, -25, 18, 15), Vector4(8, -34, 23, 15),
        Vector4(33, -7, 18, 25), Vector4(25, 30, 21, 20),
        Vector4(-8, 35, 28, 15), Vector4(-34, 5, 16, 24)
    ]
    var heights: Array[float] = [5.4, 6.2, 5.4, 4.3, 5.5, 5.1]
    var height := 0.0
    for i in hills.size():
        var hill := hills[i]
        var dx := (x - hill.x) / hill.z
        var dz := (z - hill.y) / hill.w
        height += heights[i] * exp(-dx * dx - dz * dz)
    return -0.028 + height * smoothstep(0.0, 8.5, outside)

func _scenic_surround() -> void:
    # A single softly shaded real-geometry ring, not more explorable land.
    # The inner edge overlaps the visual floor by half a metre; sparse radial
    # rings keep the background modest (4,096 triangles, one existing batch).
    var offsets: Array[float] = [0, 1, 2, 3, 4, 5, 7, 9, 12, 16, 21, 27, 35, 45, 60, 80, 110]
    var segments := 128
    var data := {"vertices": [], "normals": [], "colors": [], "uv": [], "indices": []}
    for ring in offsets.size():
        for segment in segments:
            var angle := TAU * float(segment) / float(segments)
            var direction := Vector2(sin(angle), cos(angle))
            var edge := 1.0 / maxf(absf(direction.x) / 18.0, absf(direction.y) / 17.0)
            var pos := direction * (edge + offsets[ring]) + Vector2(0, -1)
            var height := _scenic_height(pos.x, pos.y)
            var dx := (_scenic_height(pos.x + 0.15, pos.y) - _scenic_height(pos.x - 0.15, pos.y)) / 0.30
            var dz := (_scenic_height(pos.x, pos.y + 0.15) - _scenic_height(pos.x, pos.y - 0.15)) / 0.30
            var distance_tint := smoothstep(2.0, 28.0, offsets[ring])
            var color := Color("839b82").lerp(Color("728f83"), distance_tint)
            color = color.lerp(Color("8ca197"), smoothstep(32.0, 72.0, offsets[ring]) * 0.36)
            data.vertices.append(Vector3(pos.x, height, pos.y))
            data.normals.append(Vector3(-dx, 1, -dz).normalized())
            data.colors.append(color)
            data.uv.append(pos * 0.05)
            if ring < offsets.size() - 1:
                var a := ring * segments + segment
                var b := ring * segments + (segment + 1) % segments
                var c := a + segments
                var d := b + segments
                data.indices.append_array([a, b, c, b, d, c])
    # Add vertex colors directly instead of _queue_mesh, which gives each prop
    # one color. Reuse the matte ground material with no new texture or shader.
    if not _batches.has("ground"):
        _batches["ground"] = {"vertices": [], "normals": [], "colors": [], "uv": [], "indices": []}
    var batch: Dictionary = _batches["ground"]
    var first: int = batch.vertices.size()
    for key in ["vertices", "normals", "colors", "uv"]:
        batch[key].append_array(data[key])
    for index in data.indices:
        batch.indices.append(first + index)

func _path(from: Vector3, to: Vector3, width: float) -> void:
    var length := from.distance_to(to)
    var count := maxi(1, int(length / 0.8))
    var across := Vector3(-(to - from).z, 0, (to - from).x).normalized()
    var cols := maxi(1, int(width / 0.8))
    for i in count + 1:
        for j in cols:
            var pos := from.lerp(to, float(i) / count) + across * (float(j) - float(cols - 1) * 0.5) * 0.78
            if pos.z > -5.85 and pos.z < -4.15: continue
            _box(pos + Vector3(0, -0.025, 0), Vector3(0.746, 0.065, 0.746), Color("cfc6a9").lightened(float((i + j) % 4) * 0.008), 0.05, "ground")

func _wall(at: Vector3, size: Vector3, color: Color = Color("e4d7b9")) -> void:
    _box(at, size, color, 0.1)
    _solid("HouseWall", at, size, true)
    _box(at + Vector3(0, size.y * 0.5, 0), Vector3(size.x + 0.09, 0.11, size.z + 0.08), _cream, 0.04)

func _room(origin: Vector3, tint: Color, width: float = 5.8, depth: float = 5.0) -> void:
    _box(origin + Vector3(0, -0.035, 0), Vector3(width, 0.08, depth), Color("c6ad84"), 0.06, "wood")
    for plank in 11:
        _box(origin + Vector3(-width * 0.45 + plank * width * 0.09, 0.009, 0), Vector3(0.023, 0.012, depth - 0.12), Color("aa936f"), 0.004, "wood")
    _wall(origin + Vector3(0, 1.30, -depth * 0.5), Vector3(width + 0.24, 2.6, 0.28))
    for side in [-1.0, 1.0]:
        _wall(origin + Vector3(side * width * 0.5, 0.92, 0), Vector3(0.28, 1.84, depth))
        _wall(origin + Vector3(side * (width * 0.25 + 0.5), 0.62, depth * 0.5), Vector3(width * 0.5 - 1.0, 1.24, 0.28))
        _box(origin + Vector3(side * 1.05, 1.03, depth * 0.5), Vector3(0.16, 2.05, 0.27), tint, 0.04, "wood")
    # Only a rear roof strip is modeled: sunlight and the camera enter from front.
    _box(origin + Vector3(0, 2.64, -depth * 0.5 + 0.47), Vector3(width + 0.50, 0.20, 1.32), tint, 0.09, "wood")
    for i in 12:
        _box(origin + Vector3(-width * 0.49 + i * width / 11.5, 2.76, -depth * 0.5 + 0.47), Vector3(0.035, 0.028, 1.25), tint.lightened(0.1), 0.01, "wood")
    # Front lintel is cut away with the roof. A solid beam crossed the avatar
    # at the actual home entry camera; posts retain the doorway without a zoom jump.
    _box(origin + Vector3(0, 1.7, -depth * 0.5 + 0.17), Vector3(1.15, 0.94, 0.075), Color("f1d9a5"), 0.15, "windows")
    _box(origin + Vector3(0, 1.7, -depth * 0.5 + 0.24), Vector3(0.075, 0.99, 0.08), tint, 0.02, "wood")
    _box(origin + Vector3(0, 1.7, -depth * 0.5 + 0.24), Vector3(1.17, 0.065, 0.08), tint, 0.02, "wood")
    _pot(origin + Vector3(1.65, 0, depth * 0.5 + 0.5), 0.32)

func _home() -> void:
    var p := Vector3(-10, 0, 4)
    _room(p, Color("a8755f"))
    # A modest lived-in room: patchwork bed, reading desk, movable colored rug.
    _box(p + Vector3(1.60, 0.24, -0.75), Vector3(1.30, 0.43, 2.10), Color("8d785e"), 0.12, "wood")
    _box(p + Vector3(1.60, 0.52, -0.68), Vector3(1.28, 0.19, 1.99), Color("f2e6c8"), 0.13, "stone")
    _box(p + Vector3(1.60, 0.63, -1.37), Vector3(0.96, 0.18, 0.46), Color("ece1c6"), 0.15)
    _box(p + Vector3(1.6, 0.645, -0.30), Vector3(1.28, 0.10, 1.18), Color("779583"), 0.06, "wood")
    _solid("Bed", p + Vector3(1.6, 0.36, -0.75), Vector3(1.30, 0.72, 2.1))
    _box(p + Vector3(-2.28, 0.74, -0.45), Vector3(0.58, 1.48, 1.12), Color("937f63"), 0.09, "wood")
    _box(p + Vector3(-1.94, 0.76, -0.45), Vector3(0.05, 1.18, 0.9), Color("b8baaa"), 0.06, "metal")
    _solid("Wardrobe", p + Vector3(-2.28, 0.75, -0.45), Vector3(0.62, 1.5, 1.15), true)
    _table(p + Vector3(-0.85, 0, -1.65), 1.50, 0.70)
    _book(p + Vector3(-0.85, 0.79, -1.68), Color("687f78"))
    _home_cloth = _dynamic_box(self, p + Vector3(0, 0.022, 0.67), Vector3(2.20, 0.025, 1.42), Color("c68b6c"), "HomeRug")
    for side in [-1.0, 1.0]:
        var curtain := _dynamic_box(self, p + Vector3(side * 0.79, 1.70, -2.18), Vector3(0.38, 1.08, 0.09), Color("c68b6c"), "HomeCurtain")
        _home_curtains.append(curtain)
        for fold in 3:
            _box(p + Vector3(side * 0.79 - 0.11 + fold * 0.11, 1.70, -2.122), Vector3(0.022, 0.91, 0.015), Color("d9ccac"), 0.005, "wood")
    _box(p + Vector3(0, 2.27, -2.16), Vector3(2.14, 0.065, 0.09), Color("9a8668"), 0.025, "wood")
    _home_kettle = Node3D.new()
    _home_kettle.name = "IvosSharedKettle"
    _home_kettle.position = p + Vector3(-0.35, 0.82, -1.65)
    add_child(_home_kettle)
    _dynamic_round(_home_kettle, Vector3(0, 0.15, 0), Vector3(0.31, 0.29, 0.28), Color("a3b49c"))
    _dynamic_round(_home_kettle, Vector3(0, 0.30, 0), Vector3(0.19, 0.06, 0.19), Color("bbc7ad"))
    var spout := _dynamic_round(_home_kettle, Vector3(0.18, 0.20, 0), Vector3(0.10, 0.20, 0.09), Color("a3b49c"))
    spout.rotation.z = -0.55
    _dynamic_round(_home_kettle, Vector3(-0.17, 0.16, 0), Vector3(0.12, 0.18, 0.08), Color("91a38b"))
    _home_star = Node3D.new()
    _home_star.name = "TavisPaperStar"
    _home_star.position = p + Vector3(0.39, 1.95, -2.02)
    add_child(_home_star)
    for i in 5:
        var point := _dynamic_box(_home_star, Vector3.ZERO, Vector3(0.08, 0.31, 0.018), Color("ead5a2"))
        point.rotation.z = float(i) * TAU / 5.0
    for i in 11:
        _box(p + Vector3(-1.0 + i * 0.20, 0.026, 1.44), Vector3(0.06, 0.025, 0.12), Color("e5d9b8"), 0.01, "wood")
    _post_lamp(Vector3(-7.7, 0, 7.4))
    # Friendly letter slot, a real house detail rather than floating marker.
    _box(p + Vector3(-1.70, 0.74, 2.72), Vector3(0.54, 0.35, 0.28), Color("859882"), 0.07, "wood")
    _box(p + Vector3(-1.7, 0.78, 2.87), Vector3(0.33, 0.025, 0.025), Color("53685e"), 0.008, "metal")

func _workshop() -> void:
    var p := Vector3(10, 0, -0.5)
    _room(p, Color("778f85"), 6.0, 4.4)
    _table(p + Vector3(0, 0, -1.45), 3.8, 0.9)
    _box(p + Vector3(-1, 0.94, -1.42), Vector3(0.7, 0.20, 0.55), Color("ae9270"), 0.06, "wood")
    _cylinder(p + Vector3(0.6, 0.94, -1.50), 0.25, 0.30, 0.28, Color("8b9582"), "metal")
    for i in 4:
        _box(p + Vector3(-1.3 + i * 0.85, 1.76, -2.04), Vector3(0.11, 0.66, 0.075), Color("9a8566"), 0.025, "wood", float(i - 2) * 0.07)
        _box(p + Vector3(-1.3 + i * 0.85, 2.0, -1.99), Vector3(0.34, 0.13, 0.09), Color("7f9289"), 0.035, "metal")
    _solid("Workbench", p + Vector3(0, 0.4, -1.45), Vector3(3.8, 0.8, 0.9))
    for row in 3:
        for col in 3 - row:
            _cylinder(Vector3(6.85 + col * 0.23 + row * 0.1, 0.11 + row * 0.2, 3.6), 0.10, 0.11, 0.2, Color("b59873"), "wood", 10)
    _box(Vector3(7.2, 0.19, 2.8), Vector3(0.62, 0.38, 0.48), Color("c1a780"), 0.07, "wood")
    _box(Vector3(7.2, 0.386, 2.8), Vector3(0.62, 0.025, 0.06), Color("e5d7b9"), 0.01, "wood")
    _box(Vector3(7.2, 0.387, 2.8), Vector3(0.07, 0.025, 0.48), Color("e5d7b9"), 0.01, "wood")
    _post_lamp(Vector3(13.6, 0, 2.5))

func _canal_bridge() -> void:
    _box(Vector3(0, -0.09, -5), Vector3(36, 0.10, 1.75), Color("78988e"), 0.03, "ground")
    var water := MeshInstance3D.new()
    var water_plane := PlaneMesh.new()
    water_plane.size = Vector2(36, 1.70)
    water.mesh = water_plane
    water.position = Vector3(0, 0.003, -5)
    water.material_override = _water_material
    water.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
    add_child(water)
    for side in [-1.0, 1.0]:
        for i in 20:
            var x := -17.1 + i * 1.8
            if absf(x) < 1.45: continue
            _box(Vector3(x, 0.12, -5 + side * 0.96), Vector3(1.74, 0.29, 0.29), Color("b3bba3"), 0.08)
        _solid("CanalBankWest", Vector3(-9.7, 0.45, -5 + side * 0.86), Vector3(16.6, 0.9, 0.32))
        _solid("CanalBankEast", Vector3(9.7, 0.45, -5 + side * 0.86), Vector3(16.6, 0.9, 0.32))
    _bridge_stop = _solid("UnrepairedBridge", Vector3(0, 0.65, -5), Vector3(2.8, 1.3, 1.8))
    _bridge_parts = Node3D.new()
    _bridge_parts.name = "RepairedBridge"
    add_child(_bridge_parts)
    for i in 10:
        var at := Vector3(0, 0.020, -6.04 + i * 0.232)
        var plank := _dynamic_box(_bridge_parts, at, Vector3(2.75, 0.10, 0.218), Color("beaa80").lightened(float(i % 3) * 0.018))
        _bridge_planks.append({"node": plank, "at": at})
    for side in [-1.0, 1.0]:
        for z in [-6.0, -5.0, -4.0]:
            _box(Vector3(side * 1.45, 0.5, z), Vector3(0.17, 1.0, 0.18), Color("9d906e"), 0.05, "wood")
        _box(Vector3(side * 1.45, 0.88, -5), Vector3(0.17, 0.13, 2.37), Color("c2b18a"), 0.05, "wood")
        _solid("BridgeRail", Vector3(side * 1.45, 0.45, -5), Vector3(0.15, 0.9, 2.3))
    _broken_parts = Node3D.new()
    _broken_parts.name = "MissingPlanks"
    add_child(_broken_parts)
    for z in [-6.03, -5.78, -4.0, -4.24]:
        _dynamic_box(_broken_parts, Vector3(0, 0.02, z), Vector3(2.75, 0.10, 0.21), Color("988d73"))
    var loose := _dynamic_box(_broken_parts, Vector3(0.6, 0.10, -4.06), Vector3(1.47, 0.09, 0.19), Color("a99878"))
    loose.rotation.y = 0.38
    _post_lamp(Vector3(2.25, 0, -3.2))

func _garden() -> void:
    # A protected working garden, with a gathering table at its heart.
    for side in [-1.0, 1.0]:
        for row in 2:
            var center := Vector3(-3 + side * 3.0, 0, -11.2 - row * 2.5)
            _box(center + Vector3(0, 0.10, 0), Vector3(1.9, 0.25, 2.0), Color("a59772"), 0.12)
            _box(center + Vector3(0, 0.245, 0), Vector3(1.66, 0.08, 1.74), Color("867b57"), 0.06, "ground")
            _solid("GardenBed", center + Vector3(0, 0.18, 0), Vector3(1.9, 0.36, 2.0))
            for i in 6:
                _plant(center + Vector3(-0.45 + (i % 2) * 0.9, 0.29, -0.6 + floorf(i / 2.0) * 0.60), 0.19)
    _table(Vector3(-3, 0, -12.1), 2.1, 1.1)
    _solid("GardenTable", Vector3(-3, 0.4, -12.1), Vector3(2.1, 0.8, 1.1))
    _bench(Vector3(-4.6, 0, -12.1), PI * 0.5)
    _bench(Vector3(-1.4, 0, -12.1), -PI * 0.5)
    _garden_blooms = Node3D.new()
    _garden_blooms.name = "RevivedGarden"
    # Growth origin remains at bed height so flowers do not scale toward world zero.
    _garden_blooms.position = Vector3(-3, 0.28, -12.4)
    add_child(_garden_blooms)
    for i in 24:
        var side := -1.0 if i % 2 == 0 else 1.0
        var x := side * (2.55 + float(i % 3) * 0.4)
        var z := -1.8 + float(i / 2) * 0.30
        var col := Color("e6caa4") if i % 3 else Color("bc9db9")
        _dynamic_round(_garden_blooms, Vector3(x, 0.38, z), Vector3(0.3, 0.13, 0.3), col)
        _dynamic_round(_garden_blooms, Vector3(x, 0.32, z), Vector3(0.12, 0.55, 0.12), Color("769777"))
    for blossom in _garden_blooms.get_children():
        _garden_flower_parts.append({"node": blossom, "size": blossom.scale, "height": blossom.position.y})
    _gathering_props = Node3D.new()
    _gathering_props.name = "SharedTea"
    add_child(_gathering_props)
    for i in 5:
        _dynamic_round(_gathering_props, Vector3(-3.7 + i * 0.37, 0.87, -12.0), Vector3(0.17, 0.19, 0.17), Color("e6d8bb"))
    _dynamic_round(_gathering_props, Vector3(-3, 0.91, -12.30), Vector3(0.40, 0.37, 0.35), Color("a4b29b"))
    # Accessible herbs beside, not inside, the solid raised beds.
    for i in 5:
        _plant(Vector3(-6.65 + i * 0.13, 0, -9.65), 0.25)
    _cylinder(Vector3(-4.6, 0.26, -8.4), 0.19, 0.23, 0.50, Color("98a993"), "metal")
    _box(Vector3(-4.30, 0.35, -8.4), Vector3(0.45, 0.10, 0.13), Color("98a993"), 0.035, "metal")
    for x in [-7.8, 1.7]:
        _post_lamp(Vector3(x, 0, -10.2))

func _greenhouse() -> void:
    var p := Vector3(12, 0, -12.3)
    _box(p + Vector3(0, -0.012, 0), Vector3(5.7, 0.065, 5.7), Color("c0c5ac"), 0.1, "ground")
    var metal := Color("719084")
    # Thin ribs and open glazing frames make a recognizable glasshouse silhouette.
    for side in [-1.0, 1.0]:
        _wall(p + Vector3(side * 2.9, 0.39, 0), Vector3(0.24, 0.78, 5.8), Color("b4bfa6"))
        for z in [-2.8, -1.4, 0.0, 1.4, 2.8]:
            _box(p + Vector3(side * 2.85, 1.62, z), Vector3(0.10, 2.45, 0.12), metal, 0.03, "metal")
            var rib := _bevel_box(Vector3(3.02, 0.10, 0.12), 0.025)
            _queue_mesh(rib, Transform3D(Basis(Vector3.FORWARD, side * 0.27), p + Vector3(side * 1.43, 3.04, z)), metal, "metal")
        _wall(p + Vector3(side * 1.98, 0.80, 2.86), Vector3(1.86, 1.6, 0.23), Color("b5c0a7"))
    _wall(p + Vector3(0, 0.60, -2.88), Vector3(5.9, 1.2, 0.24), Color("b5c0a7"))
    _box(p + Vector3(0, 3.47, 0), Vector3(0.13, 0.12, 5.9), metal, 0.04, "metal")
    _solid("GreenhouseBack", p + Vector3(0, 1.3, -2.88), Vector3(5.9, 2.6, 0.22), true)
    for side in [-1.0, 1.0]:
        _solid("GreenhouseSide", p + Vector3(side * 2.9, 1.3, 0), Vector3(0.22, 2.6, 5.8), true)
    _vine_stop = _solid("VineGate", p + Vector3(0, 1.1, 2.86), Vector3(2.1, 2.2, 0.25))
    _vine_gate = Node3D.new()
    _vine_gate.name = "SleepingVines"
    _vine_gate.position = p + Vector3(0, 0, 2.92)
    add_child(_vine_gate)
    for i in 7:
        var x := -0.9 + i * 0.30
        var vine := _dynamic_box(_vine_gate, Vector3(x, 1.18, 0), Vector3(0.09, 2.35, 0.09), Color("6f886d"))
        vine.rotation.z = sin(float(i)) * 0.12
        for j in 4:
            var leaf := _dynamic_round(_vine_gate, Vector3(x + sin(float(j + i)) * 0.12, 0.36 + j * 0.50, 0.05), Vector3(0.36, 0.20, 0.13), Color("789978"))
            leaf.rotation.z = float(j % 2) * 0.75 - 0.35
    # Moon garden: an old bench, family music box, sleeping luminous seed.
    _bench(p + Vector3(-1.8, 0, -1.1), PI * 0.5)
    _table(p + Vector3(0, 0, -1.3), 1.3, 0.85)
    _box(p + Vector3(0, 0.93, -1.3), Vector3(0.58, 0.28, 0.43), Color("c4ad85"), 0.08, "wood")
    _ring(p + Vector3(0, 1.09, -1.3), 0.10, 0.17, Color("d6c29b"))
    _book(p + Vector3(0.37, 0.81, -1.13), Color("97a694"))
    _solid("MemoryTable", p + Vector3(0, 0.4, -1.3), Vector3(1.3, 0.8, 0.85))
    for side in [-1.0, 1.0]:
        for z in [-1.7, -0.3, 1.0]:
            _pot(p + Vector3(side * 2.13, 0, z), 0.35)
    _sleeping_moth()
    _greenhouse_glow = OmniLight3D.new()
    _greenhouse_glow.position = p + Vector3(0, 1.6, -0.8)
    _greenhouse_glow.light_color = Color("cfe5c1")
    _greenhouse_glow.omni_range = 7
    _greenhouse_glow.shadow_enabled = false
    add_child(_greenhouse_glow)

func _quiet_alcove() -> void:
    var p := Vector3(-12, 0, -12)
    _box(p + Vector3(0, 0.4, -1.9), Vector3(5.4, 0.8, 0.36), Color("b6bea2"), 0.15)
    _solid("AlcoveWall", p + Vector3(0, 0.4, -1.9), Vector3(5.4, 0.8, 0.36))
    _bench(p + Vector3(0, 0, -1.3), 0)
    _tree(p + Vector3(-2.3, 0, -0.4), 1.12, Color("849c86"))
    _tree(p + Vector3(2.6, 0, -0.8), 0.82, Color("96a48a"))
    # Repeated crescent marks tie an intimate shelter to the greenhouse clue.
    for i in 3:
        _ring(p + Vector3(-0.55 + i * 0.55, 0.03, 0.50), 0.12, 0.18, Color("d2ccb0"))
    _pot(p + Vector3(-1.6, 0, -0.9), 0.30)
    _alcove_discovery(p)

func _table(at: Vector3, width: float, depth: float) -> void:
    _box(at + Vector3(0, 0.76, 0), Vector3(width, 0.12, depth), Color("bca27a"), 0.075, "wood")
    for side in [-1.0, 1.0]:
        for back in [-1.0, 1.0]:
            _box(at + Vector3(side * width * 0.38, 0.36, back * depth * 0.33), Vector3(0.12, 0.72, 0.12), Color("938064"), 0.035, "wood")

func _bench(at: Vector3, facing: float) -> void:
    var axis := Basis(Vector3.UP, facing)
    for side in [-1.0, 1.0]:
        for z in [-0.19, 0.19]:
            _box(at + axis * Vector3(side * 0.65, 0.26, z), Vector3(0.11, 0.52, 0.12), Color("879781"), 0.03, "wood", facing)
    _box(at + Vector3(0, 0.53, 0), Vector3(1.66, 0.14, 0.56), Color("b6a17b"), 0.055, "wood", facing)
    _box(at + axis * Vector3(0, 0.90, -0.26), Vector3(1.65, 0.45, 0.11), Color("c1ad86"), 0.07, "wood", facing)
    var size := Vector3(0.65, 1.1, 1.8) if absf(sin(facing)) > 0.5 else Vector3(1.8, 1.1, 0.65)
    _solid("Bench", at + Vector3(0, 0.5, 0), size)

func _book(at: Vector3, tint: Color) -> void:
    _box(at, Vector3(0.35, 0.055, 0.26), tint, 0.016, "wood", -0.12)
    _box(at + Vector3(0, 0.030, 0), Vector3(0.30, 0.025, 0.23), Color("e1d6b9"), 0.009, "wood", -0.12)

func _post_lamp(at: Vector3) -> void:
    _cylinder(at + Vector3(0, 0.95, 0), 0.065, 0.08, 1.9, Color("8c8d71"), "wood", 10)
    _box(at + Vector3(0, 2.02, 0), Vector3(0.31, 0.37, 0.31), Color("ecd6a3"), 0.06, "windows")
    _box(at + Vector3(0, 2.23, 0), Vector3(0.42, 0.09, 0.42), Color("7d917e"), 0.05, "metal")
    _box(at + Vector3(0, 1.8, 0), Vector3(0.38, 0.09, 0.38), Color("7d917e"), 0.04, "metal")
    _solid("LampPost", at + Vector3(0, 0.75, 0), Vector3(0.17, 1.5, 0.17))

func _tree(at: Vector3, amount: float, tint: Color) -> void:
    _cylinder(at + Vector3(0, 1.3 * amount, 0), 0.11 * amount, 0.24 * amount, 2.6 * amount, Color("8c8162"), "wood", 10)
    _solid("TreeTrunk", at + Vector3(0, 1.2, 0), Vector3(0.38 * amount, 2.4, 0.38 * amount))
    var perimeter := absf(at.x) > 16.0 or at.z < -15.0
    if not perimeter:
        # Preserve the authored discovery/bench tree silhouettes in this pass.
        for i in 4:
            var angle := float(i) * 2.4
            _sphere(at + Vector3(sin(angle) * 0.58, 2.9 + sin(angle) * 0.25, cos(angle) * 0.58) * amount, Vector3(2.0, 1.45, 1.9) * amount, tint.lightened(float(i % 2) * 0.035))
        return
    # Same four canopy volumes and same trunk/collider: asymmetric overlapping
    # crowns create groups instead of a row of repeated equally lit lollipops.
    var seed := sin(at.x * 1.37 + at.z * 0.71)
    var turn := at.x * 0.19 + at.z * 0.11
    var heights: Array[float] = [3.05, 2.78, 3.28, 2.80]
    var sizes: Array[Vector3] = [Vector3(2.10,1.40,1.92), Vector3(1.62,1.26,1.62), Vector3(1.75,1.53,1.63), Vector3(1.46,1.08,1.55)]
    for i in 4:
        var angle := float(i) * 2.1 + turn
        var reach := 0.30 if i == 0 else 0.68
        var shape: Vector3 = sizes[i] * Vector3(1.0 + seed * 0.12, 1.0 + seed * 0.13, 1.0 - seed * 0.07)
        var position := at + Vector3(sin(angle) * reach, heights[i] + seed * 0.20, cos(angle) * reach) * amount
        var color := tint.lerp(Color("527d65"), 0.34).lightened(float(i % 2) * 0.025 + seed * 0.022)
        _sphere(position, shape * amount, color)

func _village_details() -> void:
    # Perimeter massing frames the inhabited center, preserving open routes.
    for i in 10:
        _tree(Vector3(-16.8 + i * 3.7, 0, -16.5 + sin(float(i)) * 0.6), 0.86 + float(i % 3) * 0.10, Color("7d977f"))
    for side in [-1.0, 1.0]:
        for i in 6:
            _tree(Vector3(side * (16.7 + sin(float(i)) * 0.25), 0, -11.9 + i * 4.5), 0.85, Color("889e84"))
        for i in 5:
            _sphere(Vector3(side * (5.7 + i * 2.4), 0.32, 12.3 + sin(float(i)) * 0.4), Vector3(1.4, 0.8, 1.35), Color("9dac8a"))
    _bench(Vector3(4.5, 0, 5.5), -0.25)
    _pot(Vector3(5.5, 0, 5.8), 0.28)
    # Weathered public memory: small monument with four inset river stones.
    _cylinder(Vector3(3.4, 0.15, -0.7), 0.78, 0.84, 0.3, Color("c4c3a6"), "stone", 24)
    _box(Vector3(3.4, 0.58, -0.7), Vector3(0.70, 0.90, 0.48), Color("d7cfb0"), 0.18)
    for i in 4:
        _sphere(Vector3(3.19 + (i % 2) * 0.40, 0.43 + floorf(i / 2.0) * 0.29, -0.435), Vector3(0.16, 0.13, 0.055), Color("879d8c"), "stone")
    _solid("RiverStoneMonument", Vector3(3.4, 0.50, -0.7), Vector3(1.4, 1.0, 1.4))
    # Low flowering drifts mark destination thresholds without arrow signs.
    for at in [Vector3(-6.8, 0, 6.9), Vector3(6.2, 0, 1), Vector3(-1.9, 0, -7.4), Vector3(9.8, 0, -8.2)]:
        for i in 3: _plant(at + Vector3(float(i) * 0.33, 0, 0), 0.25)

func _old_lantern() -> void:
    var at := Vector3(0.95, 0, 5.6)
    _cylinder(at + Vector3(0, 0.07, 0), 0.30, 0.35, 0.14, Color("b7b69b"), "stone", 20)
    _box(at + Vector3(0, 0.19, 0), Vector3(0.31, 0.09, 0.31), Color("799082"), 0.045, "metal")
    _box(at + Vector3(0, 0.58, 0), Vector3(0.34, 0.09, 0.34), Color("799082"), 0.055, "metal")
    for x in [-0.13, 0.13]:
        for z in [-0.13, 0.13]:
            _box(at + Vector3(x, 0.38, z), Vector3(0.038, 0.38, 0.038), Color("718576"), 0.012, "metal")
    _old_lantern_glass = _dynamic_box(self, at + Vector3(0, 0.39, 0), Vector3(0.235, 0.30, 0.235), Color("acb09a"), "OldLanternGlass")
    var glass := _old_lantern_glass.material_override as StandardMaterial3D
    glass.emission_enabled = true
    glass.emission = Color("f2d89e")
    var loop := TorusMesh.new()
    loop.inner_radius = 0.105
    loop.outer_radius = 0.135
    loop.rings = 16
    loop.ring_segments = 6
    _queue_mesh(loop, Transform3D(Basis(Vector3.RIGHT, PI * 0.5), at + Vector3(0, 0.71, 0)), Color("7a8b77"), "metal")
    _old_lantern_light = OmniLight3D.new()
    _old_lantern_light.position = at + Vector3(0, 0.5, 0)
    _old_lantern_light.light_color = Color("ead09a")
    _old_lantern_light.omni_range = 1.6
    _old_lantern_light.shadow_enabled = false
    add_child(_old_lantern_light)
    _solid("OldLanternBase", at + Vector3(0, 0.28, 0), Vector3(0.40, 0.56, 0.40))

func _sleeping_moth() -> void:
    _moth = Node3D.new()
    _moth.name = "SleepingLanternMoth"
    _moth.position = Vector3(12, 1.17, -13.6)
    add_child(_moth)
    _dynamic_round(_moth, Vector3(0, 0.03, 0), Vector3(0.10, 0.13, 0.25), Color("d9cdab"))
    _dynamic_round(_moth, Vector3(0, 0.07, 0.12), Vector3(0.16, 0.15, 0.14), Color("e5d9b4"))
    for side in [-1.0, 1.0]:
        _dynamic_round(_moth, Vector3(side * 0.040, 0.09, 0.178), Vector3(0.023, 0.030, 0.015), Color("657569"))
        var antenna := _dynamic_box(_moth, Vector3(side * 0.075, 0.19, 0.12), Vector3(0.016, 0.17, 0.017), Color("a4ad89"))
        antenna.rotation.z = -side * 0.4
        _dynamic_round(_moth, Vector3(side * 0.11, 0.265, 0.12), Vector3(0.040, 0.030, 0.040), Color("daca9b"))
        var wing := Node3D.new()
        wing.position = Vector3(side * 0.035, 0.045, 0)
        _moth.add_child(wing)
        _moth_wings.append(wing)
        var fore := _dynamic_round(wing, Vector3(side * 0.18, 0, 0.05), Vector3(0.38, 0.032, 0.30), Color("c6d3b0"))
        fore.rotation.y = -side * 0.25
        _dynamic_round(wing, Vector3(side * 0.13, -0.003, -0.13), Vector3(0.28, 0.028, 0.25), Color("b6c7a3"))
        _dynamic_round(wing, Vector3(side * 0.205, 0.017, 0.057), Vector3(0.11, 0.014, 0.12), Color("e8dbad"))
        _dynamic_round(wing, Vector3(side * 0.205, 0.026, 0.057), Vector3(0.047, 0.010, 0.048), Color("a3b594"))
    _moth_glow = OmniLight3D.new()
    _moth_glow.position = Vector3(0, 0.15, 0)
    _moth_glow.light_color = Color("e5deb1")
    _moth_glow.omni_range = 1.2
    _moth_glow.shadow_enabled = false
    _moth.add_child(_moth_glow)

func _alcove_discovery(p: Vector3) -> void:
    # A low recess beside the bench holds Mara's intimate first attempt.
    # Dark inner stone and an overhang support the clue without changing day/night.
    var at := p + Vector3(1.05, 0, -0.48)
    _box(at + Vector3(0, 0.32, 0), Vector3(1.02, 0.64, 0.74), Color("7a8b78"), 0.12)
    _box(at + Vector3(0, 0.83, -0.30), Vector3(1.03, 0.49, 0.15), Color("788876"), 0.06)
    for side in [-1.0, 1.0]:
        _box(at + Vector3(side * 0.47, 0.80, 0), Vector3(0.13, 0.42, 0.76), Color("859680"), 0.05)
    _box(at + Vector3(0, 1.055, 0), Vector3(1.12, 0.15, 0.85), Color("8a9a82"), 0.08)
    _solid("AlcoveKeepsakeRecess", at + Vector3(0, 0.53, 0), Vector3(1.1, 1.07, 0.80))
    _alcove_treasure = Node3D.new()
    _alcove_treasure.name = "MarasFirstBridge"
    _alcove_treasure.position = at + Vector3(0, 0.69, 0.10)
    add_child(_alcove_treasure)
    _dynamic_round(_alcove_treasure, Vector3(0, 0.035, 0), Vector3(0.45, 0.11, 0.38), Color("c9c7ad"))
    _dynamic_round(_alcove_treasure, Vector3(0, 0.082, 0), Vector3(0.36, 0.035, 0.30), Color("889f91"))
    _dynamic_round(_alcove_treasure, Vector3(0.24, 0.048, 0), Vector3(0.14, 0.10, 0.09), Color("b8bea4"))
    for i in 5:
        var plank := _dynamic_box(_alcove_treasure, Vector3(-0.15 + i * 0.075, 0.117 + sin(float(i) * 1.2) * 0.015, 0), Vector3(0.069, 0.025, 0.22), Color("cbb68a"))
        plank.rotation.y = sin(float(i) * 1.7) * 0.13
    for side in [-1.0, 1.0]:
        _dynamic_box(_alcove_treasure, Vector3(side * 0.13, 0.12, -0.105), Vector3(0.022, 0.14, 0.021), Color("b6a174"))
    var crack := _dynamic_box(_alcove_treasure, Vector3(-0.16, 0.065, 0.119), Vector3(0.012, 0.082, 0.012), Color("8e9781"))
    crack.rotation.z = -0.30
    _alcove_star = Node3D.new()
    _alcove_star.name = "WaitingPaperStar"
    _alcove_star.position = Vector3(0.36, 0.037, 0.12)
    _alcove_treasure.add_child(_alcove_star)
    for i in 5:
        var point := _dynamic_box(_alcove_star, Vector3.ZERO, Vector3(0.038, 0.15, 0.012), Color("e8d5a2"))
        point.rotation = Vector3(PI * 0.5, 0, float(i) * TAU / 5.0)
    _alcove_glow = OmniLight3D.new()
    _alcove_glow.position = at + Vector3(0, 0.94, 0.30)
    _alcove_glow.light_color = Color("e8d9aa")
    _alcove_glow.omni_range = 1.25
    _alcove_glow.shadow_enabled = false
    add_child(_alcove_glow)

func moth_greet(companion_head: Vector3) -> void:
    _moth_target = companion_head
    _moth_greeting = 0.0
