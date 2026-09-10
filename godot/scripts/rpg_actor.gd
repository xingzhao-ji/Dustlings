extends Node3D
## Original small village people. Ground origin; +Z forward. Root controls travel.
## Five coherent silhouettes use the same hand-made round forms as the Dustlings.

var kind := "player"
var _made := false
var _body: Node3D
var _head: Node3D
var _left_arm: Node3D
var _right_arm: Node3D
var _feet: Array[Node3D] = []
var _legs: Array[Node3D] = []
var _plants: Array[Vector3] = []
var _swing_from: Array[Vector3] = []
var _swing_to: Array[Vector3] = []
var _was_stance: Array[bool] = []
var _swing_phase: Array[float] = []
var _feet_ready := false
var _previous_actor_position := Vector3.ZERO
var _walk_distance := 0.0
var _attention_target := Vector3.ZERO
var _attention_amount := 0.0
var _attention := 0.0
var _notice := 0.0
var _map_grip_error := 0.0
var _eyes: Array[MeshInstance3D] = []
var _brows: Array[MeshInstance3D] = []
var _scarf: Node3D
var _clock := 0.0
var _stride := 0.0
var _moving := 0.0
var _chat := 0.0
var _happy := 0.0
var _phase := 0.0
var _height := 1.0
var _activity := ""
var _activity_blend := 0.0
var _activity_props: Dictionary = {}
var _gentle := false
var _skin := Color("c79a75")
var _cloth := Color("7d9b8a")
var _hair := Color("685b50")
var _accent := Color("d5b478")
static var _shared_meshes: Dictionary = {}
static var _shared_materials: Dictionary = {}

func configure(value: String) -> void:
    kind = value.to_lower()
    if is_inside_tree():
        for child in get_children():
            remove_child(child)
            child.queue_free()
        _feet.clear()
        _legs.clear()
        _plants.clear()
        _swing_from.clear()
        _swing_to.clear()
        _was_stance.clear()
        _swing_phase.clear()
        _feet_ready = false
        _walk_distance = 0.0
        _eyes.clear()
        _brows.clear()
        _activity_props.clear()
        _build()

func _ready() -> void:
    _build()

func _build() -> void:
    _skin = Color("cba580")
    _cloth = Color("7e9e8c")
    _hair = Color("6c5a4d")
    _accent = Color("d9b975")
    _height = 1.0
    match kind:
        "mara":
            _skin = Color("b98a6e")
            _cloth = Color("b57d66")
            _hair = Color("554e48")
            _accent = Color("e0c691")
        "ivo":
            _skin = Color("ddba93")
            _cloth = Color("768e9e")
            _hair = Color("c6c3b0")
            _accent = Color("bdac85")
        "nell":
            _skin = Color("ad8466")
            _cloth = Color("928796")
            _hair = Color("5b5950")
            _accent = Color("a4b391")
        "tavi":
            _skin = Color("d2a482")
            _cloth = Color("c4a267")
            _hair = Color("795a49")
            _accent = Color("7f9c8a")
            _height = 0.93
    scale = Vector3.ONE * _height
    _phase = float(["player", "mara", "ivo", "nell", "tavi"].find(kind)) * 1.21
    _body = Node3D.new()
    _body.name = "BreathingBody"
    add_child(_body)
    _round(_body, "Coat", Vector3(0, 0.72, 0), Vector3(0.56, 0.75, 0.38), _cloth)
    _round(_body, "Shoulders", Vector3(0, 0.96, 0), Vector3(0.59, 0.28, 0.39), _cloth)
    _round(_body, "Collar", Vector3(0, 1.10, 0.016), Vector3(0.23, 0.16, 0.24), _accent)
    # Coat hem, centre seam and two buttons give quiet readable material detail.
    _round(_body, "CoatHem", Vector3(0, 0.43, 0), Vector3(0.56, 0.15, 0.40), _cloth.darkened(0.05))
    for y in [0.70, 0.87]:
        _round(_body, "Button", Vector3(0, y, 0.192), Vector3(0.04, 0.04, 0.024), _accent)
    _head = Node3D.new()
    _head.name = "LookAndExpression"
    _head.position = Vector3(0, 1.27, 0.01)
    _body.add_child(_head)
    _round(_head, "Face", Vector3.ZERO, Vector3(0.44, 0.44, 0.41), _skin)
    _round(_head, "HairCap", Vector3(0, 0.09, -0.04), Vector3(0.47, 0.36, 0.40), _hair)
    # A face inset in the hair remains visible from front and three-quarter views.
    _round(_head, "Forehead", Vector3(0, 0.025, 0.085), Vector3(0.37, 0.34, 0.30), _skin)
    for side in [-1.0, 1.0]:
        _round(_head, "Ear", Vector3(side * 0.224, -0.015, 0.014), Vector3(0.065, 0.10, 0.069), _skin)
        var eye := _round(_head, "Eye", Vector3(side * 0.082, 0.015, 0.222), Vector3(0.030, 0.046, 0.023), Color("4e514a"))
        _eyes.append(eye)
        _round(_head, "EyeLight", Vector3(side * 0.082 - 0.005, 0.025, 0.234), Vector3(0.008, 0.011, 0.005), Color("f2e9d1"))
        _round(_head, "Cheek", Vector3(side * 0.13, -0.045, 0.205), Vector3(0.066, 0.032, 0.020), _skin.lerp(Color("bd7f76"), 0.25))
        _brows.append(_round(_head, "Brow", Vector3(side * 0.081, 0.069, 0.220), Vector3(0.050, 0.014, 0.012), _hair))
    _round(_head, "Nose", Vector3(0, -0.020, 0.239), Vector3(0.055, 0.055, 0.052), _skin.lightened(0.035))
    _round(_head, "Smile", Vector3(0, -0.093, 0.226), Vector3(0.049, 0.013, 0.012), Color("876751"))
    for i in 2:
        var side := -1.0 if i == 0 else 1.0
        var arm := Node3D.new()
        arm.name = "LeftArm" if i == 0 else "RightArm"
        arm.position = Vector3(side * 0.30, 0.99, 0)
        _body.add_child(arm)
        _round(arm, "Sleeve", Vector3(side * 0.025, -0.17, 0), Vector3(0.18, 0.40, 0.21), _cloth)
        _round(arm, "Cuff", Vector3(side * 0.025, -0.33, 0), Vector3(0.17, 0.09, 0.20), _accent)
        _round(arm, "Hand", Vector3(side * 0.025, -0.41, 0.017), Vector3(0.14, 0.15, 0.15), _skin)
        if i == 0: _left_arm = arm
        else: _right_arm = arm
        var foot := Node3D.new()
        foot.name = "LeftLegAndBoot" if i == 0 else "RightLegAndBoot"
        add_child(foot)
        var leg_mesh := _round(self, "TrouserLeg", Vector3(side * 0.125, 0.28, 0), Vector3(0.18, 0.42, 0.20), Color("6d776d"))
        _legs.append(leg_mesh.get_parent())
        _round(foot, "Boot", Vector3(0, 0.08, 0.035), Vector3(0.21, 0.16, 0.31), Color("857360"))
        _feet.append(foot)
    _scarf = Node3D.new()
    _scarf.position = Vector3(0.09, 1.055, -0.04)
    _body.add_child(_scarf)
    _round(_scarf, "ScarfTail", Vector3(0, -0.16, -0.17), Vector3(0.18, 0.39, 0.07), _accent)
    _accessories()
    _make_activity_props()
    _made = true
    animate(0, 0)
    # Root may place/turn a newly built actor after configure(). Initial boot
    # contacts must be captured in that final transform on the first real tick.
    _feet_ready = false

func _accessories() -> void:
    match kind:
        "mara":
            _round(_body, "WorkApron", Vector3(0, 0.68, 0.17), Vector3(0.40, 0.53, 0.085), Color("d2bb91"))
            _round(_body, "ApronPocket", Vector3(0, 0.61, 0.219), Vector3(0.25, 0.17, 0.036), Color("b9a17a"))
            _round(_head, "TiedHair", Vector3(0.04, 0.17, -0.20), Vector3(0.29, 0.27, 0.25), _hair)
            _round(_head, "HairTie", Vector3(0.02, 0.25, -0.15), Vector3(0.27, 0.065, 0.12), _accent)
        "ivo":
            _round(_head, "SoftCap", Vector3(0, 0.235, -0.01), Vector3(0.49, 0.20, 0.43), Color("768f8b"))
            _round(_head, "CapBrim", Vector3(0, 0.16, 0.16), Vector3(0.50, 0.065, 0.29), Color("667e79"))
            for side in [-1.0, 1.0]:
                _rim(_head, Vector3(side * 0.083, 0.018, 0.237), 0.048, Color("6d766a"))
            _round(_head, "GlassesBridge", Vector3(0, 0.023, 0.245), Vector3(0.059, 0.012, 0.012), Color("6d766a"))
            _round(_body, "Waistcoat", Vector3(0, 0.81, 0.168), Vector3(0.40, 0.44, 0.08), Color("9baca8"))
            _round(_body, "LetterPocket", Vector3(0.12, 0.89, 0.205), Vector3(0.12, 0.10, 0.025), Color("e5ddbf"))
        "nell":
            _round(_head, "GardenHatBrim", Vector3(0, 0.205, -0.01), Vector3(0.65, 0.075, 0.62), Color("a9b596"))
            _round(_head, "GardenHatCrown", Vector3(0, 0.29, -0.04), Vector3(0.41, 0.21, 0.40), Color("a9b596"))
            _round(_head, "HatRibbon", Vector3(0, 0.25, -0.04), Vector3(0.43, 0.06, 0.43), Color("8f7f8f"))
            var leaf := _round(_head, "HatLeaf", Vector3(-0.23, 0.27, 0.07), Vector3(0.09, 0.23, 0.03), Color("668976"))
            leaf.rotation.z = -0.5
            for side in [-1.0, 1.0]:
                _round(_body, "GardenPocket", Vector3(side * 0.15, 0.56, 0.155), Vector3(0.19, 0.21, 0.09), Color("ada48e"))
        "tavi":
            _round(_head, "HairSweep", Vector3(-0.08, 0.18, 0.13), Vector3(0.32, 0.21, 0.22), _hair)
            _round(_body, "CourierBag", Vector3(0.28, 0.55, -0.025), Vector3(0.24, 0.34, 0.29), Color("799382"))
            var strap := _round(_body, "BagStrap", Vector3(0, 0.83, 0.196), Vector3(0.070, 0.60, 0.029), Color("789382"))
            strap.rotation.z = -0.5
        _:
            _round(_body, "TravelerSatchel", Vector3(-0.285, 0.54, -0.005), Vector3(0.23, 0.30, 0.30), Color("9f8262"))
            var strap := _round(_body, "SatchelStrap", Vector3(0, 0.83, 0.191), Vector3(0.056, 0.58, 0.030), Color("a58a68"))
            strap.rotation.z = 0.50
            _round(_head, "HairPart", Vector3(0.09, 0.16, 0.11), Vector3(0.28, 0.23, 0.26), _hair)
            _round(_body, "LeafBrooch", Vector3(-0.12, 1.035, 0.188), Vector3(0.064, 0.094, 0.025), Color("d9c893"))

func set_activity(value: String) -> void:
    _activity = value if value in ["mend", "map", "tend", "knead", "tea"] else ""

func set_gentle_motion(enabled: bool) -> void:
    _gentle = enabled

func set_attention(world_target: Vector3, amount: float = 1.0) -> void:
    if amount > 0.15 and _attention_amount <= 0.15: _notice = 0.7
    _attention_target = world_target
    _attention_amount = clampf(amount, 0, 1)

func clear_attention() -> void:
    _attention_amount = 0.0

func get_hand_position(right: bool = true) -> Vector3:
    var arm := _right_arm if right else _left_arm
    return arm.get_node("HandShape").global_position if is_instance_valid(arm) else global_position

func _make_activity_props() -> void:
    # Props belong to actions, not idle silhouettes. Root chooses routines.
    for action in ["mend", "map", "tend", "knead", "tea"]:
        var prop := Node3D.new()
        prop.name = "Activity_" + action
        prop.visible = false
        _body.add_child(prop)
        _activity_props[action] = prop
    var prop: Node3D = _activity_props["map"]
    prop.position = Vector3(0, 0.75, 0.32)
    prop.rotation.x = -0.20
    _flat(prop, Vector3.ZERO, Vector3(0.48, 0.018, 0.31), Color("e8d9b7"))
    _flat(prop, Vector3(0, 0.012, 0), Vector3(0.018, 0.008, 0.28), Color("b9ae8a"))
    for i in 3:
        var line := _flat(prop, Vector3(-0.14 + i * 0.13, 0.015, -0.06 + i * 0.025), Vector3(0.085, 0.006, 0.02), Color("7f9d8b"))
        line.rotation.y = float(i - 1) * 0.30
    prop = _activity_props["mend"]
    prop.position = Vector3(-0.03, 0.74, 0.34)
    _flat(prop, Vector3.ZERO, Vector3(0.28, 0.09, 0.20), Color("b59b76"))
    _round(prop, "RepairPin", Vector3(0.06, 0.062, 0.02), Vector3(0.09, 0.085, 0.09), Color("9fae99"))
    _flat(prop, Vector3(-0.045, 0.07, 0), Vector3(0.027, 0.015, 0.19), Color("dcc99d"))
    prop = _activity_props["tend"]
    prop.position = Vector3(-0.06, 0.70, 0.34)
    _round(prop, "SeedlingPot", Vector3.ZERO, Vector3(0.22, 0.19, 0.20), Color("bb9574"))
    _round(prop, "SeedlingSoil", Vector3(0, 0.068, 0), Vector3(0.17, 0.032, 0.16), Color("797d58"))
    _round(prop, "SeedlingStem", Vector3(0, 0.16, 0), Vector3(0.026, 0.20, 0.026), Color("79967b"))
    var leaf := _round(prop, "SeedlingLeaf", Vector3(-0.045, 0.21, 0), Vector3(0.15, 0.065, 0.06), Color("92ac86"))
    leaf.rotation.z = -0.3
    _round(prop, "SeedlingLeaf", Vector3(0.042, 0.17, 0), Vector3(0.13, 0.06, 0.08), Color("89a580"))
    prop = _activity_props["knead"]
    prop.position = Vector3(0, 0.67, 0.32)
    _round(prop, "BreadBasket", Vector3.ZERO, Vector3(0.44, 0.18, 0.30), Color("a58c67"))
    for i in 3:
        _round(prop, "SmallLoaf", Vector3(-0.13 + i * 0.13, 0.092, 0), Vector3(0.15, 0.13, 0.20), Color("d3b481"))
        _flat(prop, Vector3(-0.13 + i * 0.13, 0.153, 0), Vector3(0.022, 0.005, 0.09), Color("ead0a1"))
    prop = _activity_props["tea"]
    prop.position = Vector3(0.08, 0.76, 0.33)
    _round(prop, "Cup", Vector3.ZERO, Vector3(0.17, 0.19, 0.17), Color("c4cbb1"))
    _round(prop, "Tea", Vector3(0, 0.074, 0), Vector3(0.137, 0.025, 0.137), Color("8f7e5e"))
    _round(prop, "CupHandle", Vector3(0.10, 0, 0), Vector3(0.09, 0.11, 0.055), Color("c4cbb1"))

func animate(delta: float, speed: float, talking: bool = false, joy: bool = false) -> void:
    if not _made: return
    var dt := clampf(delta, 0, 0.1)
    _clock += dt
    _walk_distance += maxf(speed, 0.0) * dt
    _stride = _walk_distance * TAU / 1.10 + PI * 0.5
    _moving = move_toward(_moving, clampf(speed / 2.5, 0, 1), dt * 6)
    _chat = move_toward(_chat, 1.0 if talking else 0.0, dt * 5)
    _happy = move_toward(_happy, 1.0 if joy else 0.0, dt * 4)
    _attention = move_toward(_attention, _attention_amount, dt * 3.5)
    _notice = maxf(0, _notice - dt)
    var t := _clock + _phase
    _pose_feet(dt, speed)
    var motion := 0.0 if _gentle else 1.0
    _body.position.y = (absf(sin(_stride)) * 0.025 * _moving + sin(t * 1.8) * 0.005) * motion
    _body.rotation.z = sin(_stride) * 0.027 * _moving * motion
    _head.rotation = Vector3(sin(t * 3.4) * 0.035 * _chat, sin(t * 0.61) * 0.065 * (1.0 - _moving) * motion, sin(t * 1.2) * 0.045 * _chat)
    _left_arm.rotation = Vector3(sin(_stride) * 0.42 * _moving, 0, -0.045 - sin(t * 2.6) * 0.08 * _chat - 0.25 * _happy)
    _right_arm.rotation = Vector3(-sin(_stride) * 0.42 * _moving - 0.18 * _chat, 0, 0.045 + (0.24 + sin(t * 3.1) * 0.09) * _chat + 0.25 * _happy)
    _scarf.rotation.x = (sin(_stride - 0.4) * 0.10 * _moving + sin(t * 1.7) * 0.03) * motion
    _pose_activity(dt, t, speed, talking)
    if _attention > 0.001:
        var local := to_local(_attention_target) - Vector3(0, 1.27, 0)
        var gaze := Vector3(clampf(-atan2(local.y, maxf(0.1, Vector2(local.x, local.z).length())), -0.24, 0.25), clampf(atan2(local.x, local.z), -0.55, 0.55), 0)
        _head.rotation = _head.rotation.lerp(gaze, _attention)
    var blink := 1.0
    var blink_clock := fmod(t, 4.7)
    if blink_clock > 4.53: blink = 1.0 - sin((blink_clock - 4.53) / 0.17 * PI) * 0.92
    for eye in _eyes: eye.scale.y = blink * (1.0 - _happy * 0.18)
    for i in _brows.size():
        _brows[i].rotation.z = (-1.0 if i == 0 else 1.0) * (_chat * 0.08 + _happy * 0.10 + sin(_notice / 0.7 * PI) * 0.06)

func _pose_feet(dt: float, speed: float) -> void:
    # A loaded save or safe-spawn recovery relocates the whole actor. Re-seed
    # contacts there rather than leaving limbs stretched to a previous scene.
    if _feet_ready and global_position.distance_to(_previous_actor_position) > 0.8:
        _feet_ready = false
        _plants.clear()
        _swing_from.clear()
        _swing_to.clear()
        _was_stance.clear()
        _swing_phase.clear()
    _previous_actor_position = global_position
    if not _feet_ready:
        _plants.clear()
        _swing_from.clear()
        _swing_to.clear()
        _was_stance.clear()
        _swing_phase.clear()
        for i in 2:
            var side := -0.125 if i == 0 else 0.125
            _feet[i].position = Vector3(side, 0, 0)
            var at := to_global(_feet[i].position)
            _plants.append(at)
            _swing_from.append(at)
            _swing_to.append(at)
            _was_stance.append(true)
            _swing_phase.append(0.6)
        _feet_ready = true
    for i in 2:
        var foot := _feet[i]
        var side := -0.125 if i == 0 else 0.125
        var phase := fposmod(_stride / TAU + float(i) * 0.5, 1.0)
        var stance := phase < 0.60
        var at := foot.position
        if speed < 0.04:
            # A lifted foot completes a short settling step; grounded support
            # does not scrub back to a cosmetic neutral stance when input stops.
            if at.y > 0.001:
                at = at.move_toward(Vector3(side, 0, clampf(at.z, -0.24, 0.24)), dt * 1.7)
                _plants[i] = to_global(Vector3(at.x, 0, at.z))
            else:
                at = to_local(_plants[i])
                at.y = 0
                var neutral := Vector3(side, 0, 0)
                # Turn-in-place recovery stays on the ground with a tiny lift;
                # it is bounded, rather than swapping left/right boots instantly.
                if at.distance_to(neutral) > 0.28 or at.x * side < 0:
                    at = at.move_toward(neutral, dt * 0.9)
                    at.y = minf(0.035, at.distance_to(neutral) * 0.1)
                    _plants[i] = to_global(Vector3(at.x, 0, at.z))
            _was_stance[i] = true
            foot.rotation.x = move_toward(foot.rotation.x, 0, dt * 2)
        elif stance:
            if not _was_stance[i]: _plants[i] = _swing_to[i]
            at = to_local(_plants[i])
            at.y = 0
            # During an abrupt reversal, recover an overextended contact with a
            # short visible step. Normal straight stances remain world-locked.
            var neutral := Vector3(side, 0, 0)
            if at.distance_to(neutral) > 0.46:
                at = at.move_toward(neutral, dt * 2.4)
                at.y = 0.045
                _plants[i] = to_global(Vector3(at.x, 0, at.z))
            foot.rotation.x = 0
            _was_stance[i] = true
        else:
            if _was_stance[i]:
                _swing_from[i] = to_global(at)
                _swing_phase[i] = phase
                _swing_to[i] = to_global(Vector3(side, 0, 0.33 + (1.0 - phase) * 1.10 / _height))
            var desired := to_global(Vector3(side, 0, 0.33 + (1.0 - phase) * 1.10 / _height))
            _swing_to[i] = _swing_to[i].lerp(desired, 1.0 - exp(-dt * 13))
            var u := clampf((phase - _swing_phase[i]) / maxf(0.02, 1.0 - _swing_phase[i]), 0, 1)
            var travel := smoothstep(0, 1, u)
            at = to_local(_swing_from[i].lerp(_swing_to[i], travel))
            at.y = sin(u * PI) * (0.075 if _gentle else 0.105) * clampf(speed / 1.3, 0.55, 1)
            foot.rotation.x = -sin(u * PI) * 0.075
            _was_stance[i] = false
        foot.position = at
        # A separate leg joins the stationary hip to the moving ankle so a
        # planted boot does not drag an upright trouser tube out of the coat.
        var hip := Vector3(side, 0.46, 0)
        var ankle := at + Vector3(0, 0.13, 0)
        var limb := hip - ankle
        _legs[i].position = (hip + ankle) * 0.5
        _legs[i].quaternion = Quaternion(Vector3.UP, limb.normalized())
        _legs[i].scale = Vector3(0.18, limb.length() + 0.12, 0.20)

func _pose_activity(dt: float, t: float, speed: float, talking: bool) -> void:
    if kind == "ivo" and _activity == "map":
        _pose_map(dt, t, speed, talking)
        return
    var working := not _activity.is_empty() and speed < 0.08 and not talking
    _activity_blend = move_toward(_activity_blend, 1.0 if working else 0.0, dt * 4)
    for key in _activity_props:
        var prop: Node3D = _activity_props[key]
        prop.visible = key == _activity and _activity_blend > 0.03
        prop.scale = Vector3.ONE * maxf(0.01, smoothstep(0, 0.5, _activity_blend))
    if _activity_blend < 0.001: return
    var rhythm := sin(t * 2.0) * (0.25 if _gentle else 1.0)
    var left := Vector3(-0.95, 0, 0.30)
    var right := Vector3(-0.95, 0, -0.30)
    var glance := Vector3(0.15, 0, -0.025)
    match _activity:
        "mend":
            right = Vector3(-1.05 + rhythm * 0.13, 0.02, -0.35)
            glance = Vector3(0.18, -0.04, 0.025)
        "map":
            glance.y = sin(t * 0.7) * (0.025 if _gentle else 0.07)
        "tend":
            right = Vector3(-1.15 + rhythm * 0.08, -0.1, -0.38)
            glance = Vector3(0.19, -0.05, -0.06)
        "knead":
            left = Vector3(-0.81 + rhythm * 0.045, 0, 0.32)
            right = Vector3(-0.87 - rhythm * 0.045, 0, -0.32)
            glance = Vector3(0.13, 0, 0.035)
        "tea":
            left = Vector3(-0.89, 0, 0.36)
            right = Vector3(-1.02, 0, -0.35)
            glance = Vector3(0.035, sin(t * 0.65) * 0.04, -0.025)
    _left_arm.rotation = _left_arm.rotation.lerp(left, _activity_blend)
    _right_arm.rotation = _right_arm.rotation.lerp(right, _activity_blend)
    _head.rotation = _head.rotation.lerp(glance, _activity_blend)

func _aim_hand(arm: Node3D, destination: Vector3, left: bool) -> void:
    var bone := Vector3(-0.025 if left else 0.025, -0.41, 0.017)
    arm.quaternion = Quaternion(bone.normalized(), (destination - arm.position).normalized())

func _pose_map(dt: float, t: float, speed: float, talking: bool) -> void:
    # Ivo carries the same full-size map through notice/conversation/walking.
    # Its left grip is derived from the actual hand transform every frame.
    for key in _activity_props:
        _activity_props[key].visible = key == "map"
        _activity_props[key].scale = Vector3.ONE
    _activity_blend = move_toward(_activity_blend, 1.0, dt * 4)
    var prop: Node3D = _activity_props["map"]
    var attention := maxf(_chat, _attention)
    var scan := sin(t * 0.52) * (0.018 if _gentle else 0.045)
    var grip := Vector3(-0.215, 0.745 - attention * 0.035, 0.32 - attention * 0.035)
    _aim_hand(_left_arm, grip, true)
    prop.rotation = Vector3(-0.20 + attention * 0.16, 0, 0)
    var left_hand := _left_arm.position + _left_arm.basis * Vector3(-0.025, -0.41, 0.017)
    prop.position = left_hand - prop.basis * Vector3(-0.215, 0, 0)
    var right_grip := prop.position + prop.basis * Vector3(0.215, 0, 0)
    _aim_hand(_right_arm, right_grip, false)
    var hold := _right_arm.quaternion
    # A single open-hand beat at noticing, then a restrained conversational lift.
    var greeting := sin(clampf(_notice / 0.7, 0, 1) * PI)
    var gesture := maxf(greeting * 0.58, _chat * (0.30 + 0.05 * sin(t * 1.4)))
    var open_hand := Quaternion.from_euler(Vector3(-1.12, -0.16, -0.58))
    _right_arm.quaternion = hold.slerp(open_hand, gesture)
    _head.rotation = _head.rotation.lerp(Vector3(0.22 * (1.0 - attention), scan * (1.0 - attention), -0.025 * (1.0 - attention)), 1.0 - _moving)
    _map_grip_error = (left_hand - (prop.position + prop.basis * Vector3(-0.215, 0, 0))).length()

static func _flat(parent: Node3D, at: Vector3, size: Vector3, color: Color) -> MeshInstance3D:
    var mesh := MeshInstance3D.new()
    var box := BoxMesh.new()
    box.size = size
    mesh.mesh = box
    var material := StandardMaterial3D.new()
    material.albedo_color = color
    material.roughness = 0.94
    mesh.material_override = material
    mesh.position = at
    mesh.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
    parent.add_child(mesh)
    return mesh

static func _round(parent: Node3D, label: String, at: Vector3, size: Vector3, color: Color) -> MeshInstance3D:
    if not _shared_meshes.has("round"):
        var ball := SphereMesh.new()
        ball.radius = 0.5
        ball.height = 1.0
        ball.radial_segments = 14
        ball.rings = 7
        _shared_meshes["round"] = ball
    var key := color.to_html()
    if not _shared_materials.has(key):
        var material := StandardMaterial3D.new()
        material.albedo_color = color
        material.roughness = 0.90
        _shared_materials[key] = material
    var instance := MeshInstance3D.new()
    instance.name = label
    instance.mesh = _shared_meshes["round"]
    instance.material_override = _shared_materials[key]
    instance.position = at
    # Mesh baked into a scaled child so eye scale animation preserves proportions.
    var transform_node := Node3D.new()
    transform_node.name = label + "Shape"
    transform_node.position = at
    transform_node.scale = size
    parent.add_child(transform_node)
    instance.position = Vector3.ZERO
    transform_node.add_child(instance)
    instance.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if label in ["Coat", "Shoulders", "Face", "HairCap", "Boot", "GardenHatCrown", "SoftCap"] else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
    return instance

static func _rim(parent: Node3D, at: Vector3, radius: float, color: Color) -> void:
    var rim := TorusMesh.new()
    rim.inner_radius = radius - 0.006
    rim.outer_radius = radius + 0.006
    rim.rings = 16
    rim.ring_segments = 6
    var mesh := MeshInstance3D.new()
    mesh.mesh = rim
    var material := StandardMaterial3D.new()
    material.albedo_color = color
    material.roughness = 0.65
    mesh.material_override = material
    mesh.position = at
    mesh.rotation.x = PI * 0.5
    mesh.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
    parent.add_child(mesh)
