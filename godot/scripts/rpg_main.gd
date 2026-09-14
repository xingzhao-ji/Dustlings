extends Node3D
## Integrated RPG opening. Legacy courtyard remains separately playable.
const Story = preload("res://scripts/rpg_story.gd")
const Village = preload("res://scripts/rpg_environment.gd")
const Actor = preload("res://scripts/rpg_actor.gd")
const Companion = preload("res://scripts/dustling_visual.gd")
const Soundscape = preload("res://scripts/rpg_audio.gd")
const Save = preload("res://scripts/rpg_save.gd")
const Navigation = preload("res://scripts/rpg_navigation.gd")
var navigation = Navigation.new()
var resident_navigation = Navigation.new()
var resident_navigation_generation = -1
var story = Story.new()
var world: Node3D
var player: CharacterBody3D
var avatar: Node3D
var camera: Camera3D
var audio: Node3D
var residents: Dictionary = {}
var companions: Array = []
var patches: Dictionary = {}
var patch_amount = {"lantern": 1.0, "bridge": 1.0}
var anchors: Dictionary = {}
var yaw = 0.0
var pitch = 0.48
var distance = 7.6
var camera_distance = 7.6
var camera_focus = Vector3.ZERO
var orbiting = false
var brush_held = false
var brush_mouse = false
var brush_point = Vector3.ZERO
var brush_valid = false
var brush_ring: MeshInstance3D
var brush_visual: Node3D
var brush_handle: MeshInstance3D
var brush_head: MeshInstance3D
var nearest = ""
var elapsed = 0.0
var joy = 0.0
var care_time=0.0
var care_point=Vector3.ZERO
var formation: Array=[]
var active = false
var modal: PanelContainer
var modal_kind = ""
var dialogue_id = ""
var layer: CanvasLayer
var place_label: Label
var prompt: Label
var notice: Label
var save_label: Label
var companion_label: Label
var notice_time = 0.0
var save_clock = 0.0
var save_store
var save_message = ""
var settings_status: Label
var settings = {"music":0.6,"sfx":0.75,"ambience":0.55,"gentle":false,"sensitivity":1.0,"invert":false,"quality":true}
var instance_lock: TCPServer
var primary = true
var qa = false
var qa_output = ""
var qa_case = ""
var qa_driver: Node
var waypoints: Array[Vector3] = []
var _last_trail = Vector3.ZERO
var _ui_buttons: Array[Button] = []
var _start_saved = false
var exiting=false
var moth_pending=false
var moth_phase=0
var moth_clock=0.0
var moth_meeting=Vector3(12.85,0,-12.55)
var moth_contact_sounded=false

func _ready():
	qa = "--rpg-qa" in OS.get_cmdline_user_args()
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--evidence="): qa_output = arg.trim_prefix("--evidence=")
		if arg.begins_with("--rpg-case="): qa_case = arg.trim_prefix("--rpg-case=")
	get_tree().auto_accept_quit = false
	_fit_screen()
	get_window().size_changed.connect(_fit_screen)
	if not qa:
		instance_lock = TCPServer.new()
		primary = instance_lock.listen(27384, "127.0.0.1") == OK
	var save_path = "user://neighborhood-v1.json"
	if qa:
		var profile = qa_output if not qa_output.is_empty() else OS.get_cache_dir().path_join("dustlings-rpg-qa")
		DirAccess.make_dir_recursive_absolute(profile)
		save_path = profile.path_join("isolated-save.json")
	save_store = Save.new(save_path)
	var loaded = save_store.load_progress()
	if loaded.ok:
		story.import_state(loaded.payload.game)
		patch_amount.merge(loaded.payload.get("patches", {}), true)
		for key in settings:
			var value = loaded.payload.settings.get(key, settings[key])
			if typeof(value) == typeof(settings[key]) or (value is float and settings[key] is float): settings[key] = value
		save_message = loaded.get("message", "")
		_start_saved = true
	world = Village.new()
	add_child(world)
	anchors = world.anchors.duplicate()
	anchors.lantern = Vector3(0.5,0,6.1)
	anchors.bed = Vector3(-9.0,0,3.5)
	anchors.table = anchors.get("shared_table",Vector3(-3,0,-10.7))
	anchors.wardrobe = anchors.get("wardrobe",Vector3(-11.6,0,3.8))
	_setup_light()
	_make_player()
	if loaded.ok:
		var pos = loaded.payload.position
		player.position = Vector3(clampf(pos[0],-16.5,16.5), maxf(0,pos[1]), clampf(pos[2],-16,14))
		if not story.state.flags.get("bridge_repaired",false) and player.position.z < -4.0: player.position = world.get_spawn()
	camera = Camera3D.new()
	camera.fov = 52
	camera.near = 0.12
	camera.far = 120
	camera.current = true
	add_child(camera)
	camera_focus = player.position + Vector3(0,1.1,0)
	audio = Soundscape.new()
	add_child(audio)
	audio.set_mix(settings.music,settings.sfx,settings.ambience)
	_make_residents()
	_make_patches()
	_make_brush()
	_make_ui()
	_apply_story()
	_place_camera(1)
	_apply_settings()
	_show_welcome()
	if loaded.ok: call_deferred("_recover_position")
	if qa and not qa_case.is_empty():
		var driver_script = load("res://scripts/rpg_qa.gd")
		if driver_script:
			qa_driver = driver_script.new()
			qa_driver.game = self
			add_child(qa_driver)

func _fit_screen():
	if DisplayServer.get_name() == "headless": return
	if qa and "--rpg-capture-hd" in OS.get_cmdline_user_args():
		# MovieMaker's native window is capped by the Mac display. Render an
		# actual 1080p viewport for store media, independently of that window.
		get_window().content_scale_mode=Window.CONTENT_SCALE_MODE_VIEWPORT
		get_window().content_scale_size=Vector2i(1920,1080)
		return
	get_window().content_scale_size = Vector2i(1280,800) if get_window().size.x >= 1100 else Vector2i(1080,720)

func _setup_light():
	var we = WorldEnvironment.new()
	var env = Environment.new()
	var sky = Sky.new()
	var sky_mat = ProceduralSkyMaterial.new()
	sky_mat.sky_top_color = Color("8baeb0")
	sky_mat.sky_horizon_color = Color("dddbc2")
	sky_mat.ground_bottom_color = Color("8caaa1")
	sky_mat.ground_horizon_color = Color("dddbc2")
	sky.sky_material = sky_mat
	env.sky = sky
	env.background_mode = Environment.BG_SKY
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color("b2cbd0")
	env.ambient_light_energy = 0.32
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.ssao_enabled = true
	env.ssao_radius = 0.7
	env.ssao_intensity = 1.0
	env.glow_enabled = true
	env.glow_intensity = 0.17
	env.fog_enabled = true
	env.fog_light_color = Color("c7d3bf")
	env.fog_density = 0.004
	we.environment = env
	add_child(we)
	var sun = DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-43,-28,0)
	sun.light_color = Color("ffe9ce")
	sun.light_energy = 1.12
	sun.shadow_enabled = true
	sun.directional_shadow_max_distance = 50
	sun.light_size = 1.5
	add_child(sun)

func _body(radius: float,height: float) -> CharacterBody3D:
	var b = CharacterBody3D.new()
	b.collision_layer = 4
	b.collision_mask = 5
	b.floor_snap_length = 0.3
	var collision = CollisionShape3D.new()
	var shape = CapsuleShape3D.new()
	shape.radius = radius
	shape.height = height
	collision.shape = shape
	collision.position.y = height * 0.5
	b.add_child(collision)
	return b

func _make_player():
	player = _body(0.28,1.5)
	player.name = "Traveler"
	add_child(player)
	player.position = world.get_spawn()
	avatar = Actor.new()
	player.add_child(avatar)
	avatar.configure("player")
	avatar.foot_contact.connect(func(at: Vector3):
		if is_instance_valid(audio) and active: audio.footstep(at,_surface_at(at)))
	avatar.rotation.y=PI
	_last_trail = player.position
	waypoints.append(player.position)

func _make_residents():
	var positions = {"mara":Vector3(8,0,2),"ivo":Vector3(-2,0,3),"nell":Vector3(-4,0,-2),"tavi":Vector3(-6.3,0,2)}
	for id in positions:
		var body = _body(0.29,1.5)
		body.name = id.capitalize()
		add_child(body)
		body.position = positions[id]
		var visual = Actor.new()
		body.add_child(visual)
		visual.configure(id)
		residents[id] = {"body":body,"visual":visual,"home":positions[id],"target":positions[id],"phase":float(residents.size())*1.7,"route":[],"goal":positions[id]}

func _flat_part(at: Vector3, size: Vector3, color: Color, parent: Node3D) -> MeshInstance3D:
	var mesh = SphereMesh.new()
	mesh.radius = 0.5
	mesh.height = 1.0
	mesh.radial_segments = 10
	mesh.rings = 5
	var material = StandardMaterial3D.new()
	material.albedo_color = color
	material.roughness = 0.95
	var node = MeshInstance3D.new()
	node.mesh = mesh
	node.material_override = material
	node.position = at
	node.scale = size
	parent.add_child(node)
	return node

func _make_patches():
	for id in ["lantern","bridge"]:
		var root = Node3D.new()
		add_child(root)
		root.position = anchors[id] + Vector3(0,0.025,0)
		for i in 220:
			var a = float(i)*2.39996
			var r = sqrt(float(i)/220.0)*0.96
			_flat_part(Vector3(cos(a)*r,0.02+float(i%3)*0.008,sin(a)*r), Vector3(.10,.035,.075)*(0.7+float(i%4)*.12),Color("b7ad94").darkened(float(i%3)*.025),root)
		patches[id] = root
		root.visible = patch_amount[id] > .001

func _make_brush():
	brush_ring = MeshInstance3D.new()
	var ring = TorusMesh.new()
	ring.inner_radius = .43
	ring.outer_radius = .47
	ring.rings = 32
	ring.ring_segments = 6
	brush_ring.mesh = ring
	var mat = StandardMaterial3D.new()
	mat.albedo_color = Color("fff0b9")
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	brush_ring.material_override = mat
	brush_ring.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(brush_ring)
	brush_visual = Node3D.new()
	add_child(brush_visual)
	brush_handle=_flat_part(Vector3.ZERO,Vector3(.045,1,.045),Color("8a6546"),brush_visual)
	brush_head=_flat_part(Vector3.ZERO,Vector3(.28,.10,.20),Color("ded4aa"),brush_visual)
	brush_visual.visible = false

func _input(event):
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_ESCAPE:
			if is_instance_valid(modal): _close_modal()
			else: _show_settings()
			get_viewport().set_input_as_handled()
			return
		if is_instance_valid(modal): return
		if event.keycode in [KEY_W,KEY_A,KEY_S,KEY_D,KEY_Q,KEY_COMMA,KEY_PERIOD]:
			var focused=get_viewport().gui_get_focus_owner()
			if focused: focused.release_focus()
		match event.keycode:
			KEY_E: _interact_nearest(); get_viewport().set_input_as_handled()
			KEY_J: _show_journal(); get_viewport().set_input_as_handled()
			KEY_Q: yaw = atan2(-sin(avatar.rotation.y), -cos(avatar.rotation.y)); pitch = .48
			KEY_SPACE:
				if get_viewport().gui_get_focus_owner()==null: brush_held = true; get_viewport().set_input_as_handled()
			KEY_TAB:
				if get_viewport().gui_get_focus_owner() == null and not _ui_buttons.is_empty(): _ui_buttons[0].grab_focus(); get_viewport().set_input_as_handled()
	if event is InputEventKey and not event.pressed and event.keycode == KEY_SPACE: brush_held = false
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_RIGHT:
			orbiting = event.pressed and not is_instance_valid(modal)
		if event.button_index == MOUSE_BUTTON_LEFT and not event.pressed: brush_mouse = false
		if not is_instance_valid(modal) and not _over_ui():
			if event.button_index == MOUSE_BUTTON_LEFT:
				brush_mouse = event.pressed
				if event.pressed:
					var focused=get_viewport().gui_get_focus_owner()
					if focused: focused.release_focus()
			if event.pressed and event.button_index == MOUSE_BUTTON_WHEEL_UP: distance = maxf(4.8,distance-.5)
			if event.pressed and event.button_index == MOUSE_BUTTON_WHEEL_DOWN: distance = minf(10.5,distance+.5)
	if event is InputEventMouseMotion and orbiting:
		yaw -= event.screen_relative.x*.004*settings.sensitivity
		pitch = clampf(pitch+event.screen_relative.y*.003*settings.sensitivity*(-1 if settings.invert else 1),.23,.94)

func _over_ui() -> bool:
	var control = get_viewport().gui_get_hovered_control()
	return control != null and (control is Button or control is Range or control.get_parent() == modal)

func _physics_process(delta):
	if not active or is_instance_valid(modal):
		player.velocity = Vector3.ZERO
		return
	var move = Vector2(float(Input.is_physical_key_pressed(KEY_D))-float(Input.is_physical_key_pressed(KEY_A)),float(Input.is_physical_key_pressed(KEY_S))-float(Input.is_physical_key_pressed(KEY_W)))
	move += Vector2(float(Input.is_physical_key_pressed(KEY_RIGHT))-float(Input.is_physical_key_pressed(KEY_LEFT)),float(Input.is_physical_key_pressed(KEY_DOWN))-float(Input.is_physical_key_pressed(KEY_UP)))
	move = move.limit_length()
	if get_viewport().gui_get_focus_owner() != null: move = Vector2.ZERO
	if Input.is_physical_key_pressed(KEY_COMMA): yaw += delta*1.3
	if Input.is_physical_key_pressed(KEY_PERIOD): yaw -= delta*1.3
	var direction = Basis(Vector3.UP,yaw)*Vector3(move.x,0,move.y)
	player.velocity.x = direction.x*2.6
	player.velocity.z = direction.z*2.6
	player.velocity.y = -1 if player.is_on_floor() else maxf(-12,player.velocity.y-18*delta)
	player.move_and_slide()
	if player.position.y < -2: player.position = world.get_spawn(); player.velocity = Vector3.ZERO
	if direction.length() > .05:
		avatar.rotation.y = lerp_angle(avatar.rotation.y,atan2(direction.x,direction.z),minf(1,delta*13))
	if player.position.distance_to(_last_trail) > .38:
		waypoints.append(player.position)
		for c in companions:
			c.path.append(player.position)
		_last_trail = player.position
		if waypoints.size()>100: waypoints.pop_front()
	_find_nearest()
	_update_brush(delta)
	_update_residents(delta)
	_update_companions(delta)
	_update_moth_scene(delta)
	save_clock += delta
	if save_clock > 10: save_clock=0; _save()

func _process(delta):
	if not is_instance_valid(player): return
	_place_camera(delta)
	if is_instance_valid(modal) and modal_kind == "dialogue":
		elapsed+=delta
		avatar.animate(delta,0,false,false)
		for id in residents:
			residents[id].visual.set_attention(player.position+Vector3(0,1.2,0),1.0 if id==dialogue_id else clampf((3.0-player.position.distance_to(residents[id].body.position))/1.2,0,1))
			residents[id].visual.animate(delta,0,id==dialogue_id,false)
		for c in companions:
			c.age+=delta
			c.visual.pose(delta,elapsed,0,0,c.age,false,settings.gentle)
		return
	if not active or is_instance_valid(modal): return
	elapsed += delta
	joy = maxf(0,joy-delta)
	care_time=maxf(0,care_time-delta)
	_tick_formation(delta)
	avatar.animate(delta,Vector2(player.velocity.x,player.velocity.z).length(),false,joy>0)
	brush_visual.visible = brush_valid and (brush_held or brush_mouse)
	_pose_brush()
	notice_time = maxf(0,notice_time-delta)
	notice.visible = notice_time > 0
	place_label.text = _place_name()
	companion_label.text = (str(companions.size())+(" companion" if companions.size()==1 else " companions")) if not companions.is_empty() else ""
	audio.set_activity(.25 if story.state.flags.get("first_companion",false) else 0,.65 if story.state.flags.get("bridge_repaired",false) else 0,brush_valid and (brush_held or brush_mouse),brush_point)

func _place_camera(delta):
	var focus = player.position + Vector3(0,1.1,0)
	camera_focus = camera_focus.lerp(focus,1.0-exp(-delta*12))
	var offset = Vector3(sin(yaw)*cos(pitch),sin(pitch),cos(yaw)*cos(pitch))
	var wanted = camera_focus+offset*distance
	var query = PhysicsRayQueryParameters3D.create(camera_focus,wanted,2)
	var hit = get_world_3d().direct_space_state.intersect_ray(query)
	var allowed = maxf(.6,camera_focus.distance_to(hit.position)-.22) if not hit.is_empty() else distance
	camera_distance = allowed if allowed < camera_distance else lerpf(camera_distance,allowed,minf(1,delta*7))
	camera.position = camera_focus+offset*camera_distance
	camera.look_at(camera_focus)

func _find_nearest():
	nearest = ""
	var best = 2.1
	for id in anchors:
		if id in ["shared_table","delivery","wardrobe"]: continue
		if id == "greenhouse_memory" and not story.state.flags.get("greenhouse_open",false): continue
		var p: Vector3 = anchors[id]
		var d = player.position.distance_to(p)
		if d < best and _line_clear(p): best=d; nearest=id
	for id in residents:
		var p: Vector3 = residents[id].body.position
		var d = player.position.distance_to(p)
		# The table's invisible interaction point must not steal E from a
		# guest the player has walked directly up to during shared tea.
		var guest_at_table = nearest=="table" and story.has("shared_table") and d<1.0
		if (d < best or guest_at_table) and _line_clear(p): best=d; nearest=id
	var names = {"lantern":"Dusty lantern","bridge":"Brook crossing","wood":"Salvaged wood","garden":"Thirsty seedlings","vine_wall":"Overgrown wall","greenhouse_memory":"Weathered letter","alcove":"Hollow in the stone","home":"Your home","bed":"Rest","parcel":"Ivo’s parcel","herbs":"Garden herbs","table":"The long table","workshop":"Mara’s workshop"}
	if story.has("first_companion"): names.lantern="Old lantern"
	if story.has("garden_watered"): names.garden="Nell’s seedlings"
	prompt.text = "E  ·  "+(nearest.capitalize() if residents.has(nearest) else names.get(nearest,nearest.capitalize())) if not nearest.is_empty() else "WASD  Walk   ·   Right-drag  Look   ·   E  Interact"
	if nearest in ["lantern","bridge"] and patch_amount.get(nearest,0)>.001: prompt.text += "    /    Hold Space  Brush"

func _line_clear(p: Vector3) -> bool:
	var query = PhysicsRayQueryParameters3D.create(player.position+Vector3(0,.8,0),p+Vector3(0,.8,0),2)
	return get_world_3d().direct_space_state.intersect_ray(query).is_empty()

func _update_brush(delta):
	brush_valid = false
	brush_point = player.position+Vector3(sin(avatar.rotation.y),0,cos(avatar.rotation.y))*.9
	if brush_mouse:
		var mouse = get_viewport().get_mouse_position()
		var from = camera.project_ray_origin(mouse)
		var hit = get_world_3d().direct_space_state.intersect_ray(PhysicsRayQueryParameters3D.create(from,from+camera.project_ray_normal(mouse)*80,1))
		if not hit.is_empty(): brush_point=hit.position
	if brush_held and nearest in ["lantern","bridge"]:
		var offset: Vector3=anchors[nearest]-player.position
		offset.y=0
		brush_point=player.position+offset.limit_length(1.4)
		var side=Vector3(offset.z,0,-offset.x).normalized()
		brush_point+=side*sin(elapsed*7)*.10
		brush_point.y=.025
	var closest = ""
	for id in patches:
		if id == "bridge" and not story.has("first_companion"): continue
		if patch_amount[id]>.001 and brush_point.distance_to(anchors[id])<1.0 and player.position.distance_to(anchors[id])<2.3 and _line_clear(anchors[id]): closest=id; break
	brush_valid = not closest.is_empty() and player.position.distance_to(brush_point)<=1.65
	brush_ring.visible = brush_valid and not is_instance_valid(modal)
	brush_ring.position = brush_point+Vector3(0,.07,0)
	if not brush_valid or not (brush_held or brush_mouse): return
	avatar.rotation.y = lerp_angle(avatar.rotation.y,atan2(brush_point.x-player.position.x,brush_point.z-player.position.z),minf(1,delta*10))
	patch_amount[closest] = maxf(0,patch_amount[closest]-delta/(4.5 if closest=="lantern" else 8.0))
	var amount = patch_amount[closest]
	for i in patches[closest].get_child_count():
		var mote = patches[closest].get_child(i)
		mote.visible = float(i)/220.0 < amount
		if mote.visible: mote.rotation.y += delta*2
	if amount<=.001:
		patch_amount[closest] = 0.0
		patches[closest].visible = false
		var result = story.perform("first_companion" if closest=="lantern" else "clear_bridge")
		_apply_story()
		_toast("A Dustling joins you." if closest=="lantern" else "Clear footing for a crossing.",5)
		if closest=="lantern": _begin_formation(anchors.lantern)
		audio.cue("birth" if closest=="lantern" else "complete",anchors[closest])
		joy = 2
		_save()

func _pose_brush():
	if not brush_visual.visible: return
	var hand: Vector3=avatar.get_hand_position(true)
	var contact=brush_point+Vector3(0,.045,0)
	brush_head.position=contact
	brush_head.rotation.y=avatar.rotation.y
	var shaft=hand-contact
	brush_handle.position=(hand+contact)*.5
	var up=shaft.normalized()
	var across=Vector3.FORWARD.cross(up).normalized()
	if across.length()<.01: across=Vector3.RIGHT
	brush_handle.basis=Basis(across,up,across.cross(up)).scaled(Vector3(.045,shaft.length(),.045))

func _update_residents(delta):
	if resident_navigation_generation!=navigation.generation:
		resident_navigation.configure(world,.29)
		resident_navigation_generation=navigation.generation
	for id in residents:
		var r = residents[id]
		var body: CharacterBody3D = r.body
		var target: Vector3 = r.target
		r.nav_retry=maxf(0,r.get("nav_retry",0.0)-delta)
		# Physics may move a resident out of initial wall contact after the
		# first path query. Retry an empty route at most twice per second.
		if r.goal != target or r.get("nav_generation",-1)!=resident_navigation.generation or (r.route.is_empty() and body.position.distance_to(target)>.1 and r.nav_retry<=0):
			r.goal=target
			r.route=resident_navigation.path(body.position,target)
			r.nav_generation=resident_navigation.generation
			r.nav_retry=.5
		if not r.route.is_empty() and not resident_navigation.segment_clear(body.position,r.route[0]):
			r.route=resident_navigation.path(body.position,target)
		while r.route.size()>1 and body.position.distance_to(r.route[0])<.25 and resident_navigation.segment_clear(body.position,r.route[1]): r.route.pop_front()
		target=r.route[0] if not r.route.is_empty() else body.position
		var offset = target-body.position
		offset.y = 0
		var arrival=.025 if r.route.size()>1 else .10
		var velocity = offset.normalized()*minf(.85,offset.length()*4) if offset.length()>arrival else Vector3.ZERO
		body.velocity = Vector3(velocity.x,-1,velocity.z)
		body.move_and_slide()
		if velocity.length()>.1: r.visual.rotation.y=lerp_angle(r.visual.rotation.y,atan2(velocity.x,velocity.z),minf(1,delta*6))
		var social = story.has("shared_table") and body.position.distance_to(r.target)<.3
		var focus = Vector3(-2.75,1.2,-9.8) if social and player.position.distance_to(body.position)>1.8 else player.position+Vector3(0,1.2,0)
		if velocity.length()<=.1 and (social or player.position.distance_to(body.position)<2.5):
			r.visual.rotation.y=lerp_angle(r.visual.rotation.y,atan2(focus.x-body.position.x,focus.z-body.position.z),minf(1,delta*3))
		r.visual.set_attention(focus,.55 if social else clampf((3.0-player.position.distance_to(body.position))/1.2,0,1))
		r.visual.set_activity("tea" if story.has("shared_table") else {"mara":"mend","ivo":"map","nell":"tend","tavi":"knead"}[id])
		r.visual.animate(delta,Vector2(body.velocity.x,body.velocity.z).length(),false,joy>0)

func _update_companions(delta):
	for i in companions.size():
		var c = companions[i]
		var body: CharacterBody3D = c.body
		var target: Vector3 = player.position+Vector3(cos(elapsed*.2+float(i)*2.1),0,sin(elapsed*.2+float(i)*2.1))*1.1
		while not c.path.is_empty() and body.position.distance_to(c.path[0])<.32:
			if c.path.size()>1 and not navigation.segment_clear(body.position,c.path[1]): break
			c.path.pop_front()
		if not c.path.is_empty(): target=c.path[0]
		var working = brush_valid and (brush_held or brush_mouse)
		if c.age < 1.4:
			target=body.position
			c.visual.rotation.y=atan2(player.position.x-body.position.x,player.position.z-body.position.z)
		if care_time>0: target=care_point+Vector3(cos(float(i)*2.1),0,sin(float(i)*2.1))*.8; working=true
		if working and care_time<=0: target=brush_point+Vector3(cos(float(i)*2.1),0,sin(float(i)*2.1))*.6
		if moth_phase>0 and i==0: target=moth_meeting; working=false
		# Orbit/work goals can lie beyond a prop. Choose a reachable floor point and
		# cache the actual collider detour; never discard a blocked breadcrumb.
		if not navigation.point_clear(target):
			var found=false
			for step in 12:
				var angle=float(i)*2.1+float(step)*TAU/12.0
				var candidate=player.position+Vector3(cos(angle),0,sin(angle))*.85
				if navigation.point_clear(candidate): target=candidate; found=true; break
			if not found: target=player.position
		if c.get("nav_generation",-1)!=navigation.generation or c.get("nav_goal",Vector3.INF).distance_to(target)>.22:
			c.nav_path=navigation.path(body.position,target)
			c.nav_goal=target
			c.nav_generation=navigation.generation
		if not c.nav_path.is_empty() and not navigation.segment_clear(body.position,c.nav_path[0]):
			c.nav_path=navigation.path(body.position,target)
		while c.nav_path.size()>1 and body.position.distance_to(c.nav_path[0])<.32 and navigation.segment_clear(body.position,c.nav_path[1]): c.nav_path.pop_front()
		var steering: Vector3=c.nav_path[0] if not c.nav_path.is_empty() else body.position
		var diff = steering-body.position
		diff.y=0
		# A detour corner must be reached accurately if the onward segment is
		# still blocked. The relaxed final/orbit radius cannot stop us before it.
		var precise=c.nav_path.size()>1 or (c.path.size()>1 and not navigation.segment_clear(body.position,c.path[1]))
		var arrival=.025 if precise else .16
		# Closely spaced trail points describe a route, not repeated destinations.
		# Slowing at every .38m sample made a 3m/s follower actually trail at <1m/s.
		var cruising=c.path.size()>1 or c.nav_path.size()>1
		var travel_speed=minf(3,diff.length()/maxf(delta,.001)) if cruising else minf(3,diff.length()*2)
		var desired = diff.normalized()*travel_speed if diff.length()>arrival else Vector3.ZERO
		for other in companions:
			if other.body==body: continue
			var apart: Vector3=body.position-other.body.position
			apart.y=0
			if apart.length()<.48 and apart.length()>.001: desired+=apart.normalized()*(.48-apart.length())*4
		if moth_phase==2 and i==0: desired=Vector3.ZERO
		body.velocity=Vector3(desired.x,-1,desired.z)
		body.move_and_slide()
		if desired.length()>.08: c.visual.rotation.y=lerp_angle(c.visual.rotation.y,atan2(desired.x,desired.z),minf(1,delta*8))
		if moth_phase>0 and i==0 and body.position.distance_to(moth_meeting)<.4:
			c.visual.rotation.y=lerp_angle(c.visual.rotation.y,atan2(12.0-body.position.x,-13.6-body.position.z),minf(1,delta*5))
		c.age += delta
		c.visual.pose(delta,elapsed,Vector2(body.velocity.x,body.velocity.z).length(),1.0 if working and diff.length()<.3 else 0.0,c.age,joy>0,settings.gentle)
		if c.has("light"):
			c.light.light_energy=(.18 if player.position.distance_to(anchors.alcove)<3 else .035) if i==0 and story.state.flags.get("glow_unlocked",false) else 0
			if moth_pending or moth_phase==1: c.light.light_energy=0
			elif moth_phase==2: c.light.light_energy*=smoothstep(1.65,2.3,moth_clock)

func _update_moth_scene(delta):
	if moth_phase==0 or companions.is_empty(): return
	moth_clock+=delta
	if moth_phase==1 and companions[0].body.position.distance_to(moth_meeting)<.38:
		moth_phase=2
		moth_meeting=companions[0].body.position
		moth_clock=0.0
		world.moth_greet(companions[0].body.position+Vector3(0,.48,0))
	if moth_phase==2:
		if moth_clock>=1.75 and not moth_contact_sounded:
			moth_contact_sounded=true
			audio.melody(companions[0].body.position,true)
		if moth_clock>5.6:
			moth_phase=0
			_toast("A little light to carry with you.",4)
	# The player may freely leave. The durable ability never depends on watching
	# a scene, and interrupting does not move either character or camera.
	if player.position.distance_to(moth_meeting)>6: moth_phase=0

func _interact_nearest():
	if nearest.is_empty(): return
	dialogue_id = nearest
	if residents.has(nearest):
		var p: Vector3 = residents[nearest].body.position
		avatar.rotation.y = atan2(p.x-player.position.x,p.z-player.position.z)
		residents[nearest].visual.rotation.y=atan2(player.position.x-p.x,player.position.z-p.z)
	_show_dialogue(story.interact(nearest))
	_apply_story()
	_save()

func _apply_story():
	world.set_story(story.state)
	navigation.configure(world)
	var flags: Dictionary = story.state.flags
	for id in patches:
		patches[id].visible=patch_amount[id]>.001
		for i in patches[id].get_child_count(): patches[id].get_child(i).visible=float(i)/220.0<patch_amount[id]
	for id in residents:
		residents[id].target=residents[id].home
		if not flags.get("bridge_repaired",false) and residents[id].body.position.z < -4:
			residents[id].body.position=residents[id].home
			residents[id].route=[]
			residents[id].goal=residents[id].home
	var desired = 0
	if flags.get("first_companion",false): desired=1
	if flags.get("bridge_repaired",false): desired=3
	if flags.get("glow_unlocked",false): desired=4
	while companions.size()<desired:
		var body = _body(.14,.52)
		body.collision_layer=0
		body.collision_mask=1
		add_child(body)
		body.position=brush_point+Vector3(.65,0,.1) if companions.is_empty() else player.position+Vector3(cos(float(companions.size())*2.1),0,sin(float(companions.size())*2.1))*.9
		if _start_saved: body.position=player.position+Vector3(.6,0,.8)
		var visual = Companion.new()
		body.add_child(visual)
		visual.pose(0,elapsed,0,0,0,false,settings.gentle)
		var light = OmniLight3D.new()
		light.position.y=.5
		light.light_color=Color("cbe4b7")
		light.omni_range=1.7
		light.light_energy=0
		body.add_child(light)
		companions.append({"body":body,"visual":visual,"age":0.0,"light":light,"path":[],"nav_path":[],"nav_goal":Vector3.INF,"nav_generation":-1})
	if flags.get("bridge_repaired",false):
		residents.nell.target=Vector3(-4,0,-8)
		residents.ivo.target=Vector3(1,0,-7.3)
	if flags.get("garden_invited",false): residents.nell.target=Vector3(10.7,0,-12)
	if flags.get("shared_table",false):
		residents.tavi.target=Vector3(-4.5,0,-10)
		residents.mara.target=Vector3(-1,0,-9.8)
		residents.nell.target=Vector3(-3.9,0,-10.8)
		residents.ivo.target=Vector3(-2.1,0,-10.8)
	if flags.get("first_companion",false): patch_amount.lantern=0.0; patches.lantern.visible=false
	if flags.get("bridge_cleared",false): patch_amount.bridge=0.0; patches.bridge.visible=false

func _place_name() -> String:
	if player.position.x < -7 and player.position.z > 1 and player.position.z < 8: return "Keeper’s house"
	if player.position.x > 7 and player.position.z > -3 and player.position.z < 3: return "Mara’s workshop"
	if player.position.x > 8 and player.position.z < -9: return "The glasshouse"
	if player.position.z < -6: return "Nell’s garden"
	return "Bellwether  ·  Day "+str(story.state.day)

func _style(color: Color,border: Color=Color("b9bea5")) -> StyleBoxFlat:
	var style=StyleBoxFlat.new()
	style.bg_color=color
	style.border_color=border
	style.set_border_width_all(1)
	style.set_corner_radius_all(14)
	style.content_margin_left=18
	style.content_margin_right=18
	style.content_margin_top=12
	style.content_margin_bottom=12
	return style

func _label(text: String,size: int=20) -> Label:
	var l=Label.new()
	l.text=text
	l.add_theme_font_size_override("font_size",size)
	l.add_theme_color_override("font_color",Color("334b43"))
	l.mouse_filter=Control.MOUSE_FILTER_IGNORE
	return l

func _button(text: String,callback: Callable) -> Button:
	var b=Button.new()
	b.text=text
	b.custom_minimum_size.y=46
	b.add_theme_font_size_override("font_size",19)
	b.add_theme_color_override("font_color",Color("344c44"))
	b.add_theme_color_override("font_focus_color",Color("344c44"))
	b.add_theme_color_override("font_disabled_color",Color("758176"))
	b.add_theme_color_override("font_hover_color",Color("233f35"))
	b.add_theme_color_override("font_pressed_color",Color("233f35"))
	b.add_theme_stylebox_override("normal",_style(Color("e8e6cf")))
	b.add_theme_stylebox_override("hover",_style(Color("f6edcd"),Color("a8b496")))
	b.add_theme_stylebox_override("pressed",_style(Color("c5d3b6")))
	b.add_theme_stylebox_override("focus",_style(Color(0,0,0,0),Color("628773")))
	b.pressed.connect(func(): audio.ui(); callback.call())
	b.mouse_entered.connect(func(): audio.ui())
	return b

func _make_ui():
	layer=CanvasLayer.new()
	add_child(layer)
	var screen=Control.new()
	screen.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	screen.mouse_filter=Control.MOUSE_FILTER_IGNORE
	layer.add_child(screen)
	var top=PanelContainer.new()
	top.position=Vector2(24,20)
	top.add_theme_stylebox_override("panel",_style(Color("ede7ce")))
	screen.add_child(top)
	var names=VBoxContainer.new()
	top.add_child(names)
	place_label=_label("Bellwether",22)
	names.add_child(place_label)
	companion_label=_label("",16)
	names.add_child(companion_label)
	var tools=HBoxContainer.new()
	tools.set_anchors_and_offsets_preset(Control.PRESET_TOP_RIGHT)
	tools.position=Vector2(-264,20)
	screen.add_child(tools)
	for item in [["Journal  J",_show_journal],["Pause",_show_settings]]:
		var b=_button(item[0],item[1])
		tools.add_child(b)
		_ui_buttons.append(b)
	prompt=_label("",19)
	prompt.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER
	prompt.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	prompt.offset_top=-59
	prompt.offset_bottom=-21
	prompt.add_theme_color_override("font_color",Color("fff6dc"))
	prompt.add_theme_color_override("font_shadow_color",Color("354c45"))
	prompt.add_theme_constant_override("shadow_offset_x",1)
	prompt.add_theme_constant_override("shadow_offset_y",2)
	screen.add_child(prompt)
	notice=_label("",20)
	notice.set_anchors_and_offsets_preset(Control.PRESET_CENTER_TOP)
	notice.offset_left=-340
	notice.offset_right=340
	notice.offset_top=96
	notice.offset_bottom=180
	notice.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	notice.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER
	notice.add_theme_color_override("font_color",Color("fff8e3"))
	notice.add_theme_color_override("font_shadow_color",Color("354c45"))
	notice.add_theme_constant_override("shadow_offset_y",2)
	screen.add_child(notice)
	save_label=_label("",15)
	save_label.position=Vector2(25,112)
	screen.add_child(save_label)

func _panel(kind: String,width: float=640) -> VBoxContainer:
	if is_instance_valid(modal): modal.queue_free()
	modal_kind=kind
	_stop_input()
	audio.set_paused(kind != "dialogue")
	world.set_process(kind=="dialogue")
	prompt.visible=false
	notice.visible=false
	notice_time=0
	brush_ring.visible=false
	modal=PanelContainer.new()
	modal.modulate.a=0
	layer.add_child(modal)
	modal.add_theme_stylebox_override("panel",_style(Color("f2ead4")))
	modal.custom_minimum_size.x=width
	modal.size=Vector2(width,100)
	modal.position=Vector2((get_viewport().get_visible_rect().size.x-width)*.5,100)
	var box=VBoxContainer.new()
	box.add_theme_constant_override("separation",12)
	modal.add_child(box)
	call_deferred("_fit_panel",modal,kind)
	return box

func _fit_panel(panel: PanelContainer,kind: String):
	await get_tree().process_frame
	await get_tree().process_frame
	if not is_instance_valid(panel) or panel!=modal: return
	var size=panel.get_combined_minimum_size()
	panel.size=size
	var view=get_viewport().get_visible_rect().size
	panel.position=Vector2((view.x-size.x)*.5,(view.y-size.y)*.5 if kind!="dialogue" else view.y-size.y-24)
	# Layout and text wrapping complete before the first visible pixel. Bind the
	# deferred work to this exact panel so repeated choices cannot move a newer one.
	var reveal=create_tween()
	reveal.tween_property(panel,"modulate:a",1.0,.10 if settings.gentle else .16)

func _copy(box: VBoxContainer,text: String,size: int=22):
	var label=_label(text,size)
	label.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	box.add_child(label)

func _show_welcome():
	var box=_panel("welcome",610)
	_copy(box,"Dustlings",38)
	_copy(box,"A home in Bellwether",24)
	_copy(box,"WASD to walk. Right-drag to look around. E to talk or inspect.\nHold Space near dust to brush. Your journal keeps what you’ve learned.",20)
	if not primary: _copy(box,"Another neighborhood window is open. Close this window and return to it to keep progress safe.",19)
	elif not save_message.is_empty(): _copy(box,save_message,18)
	var b=_button("Return home" if _start_saved else "Step into the village",_close_modal)
	b.disabled=not primary
	box.add_child(b)
	if primary: b.grab_focus()

func _show_dialogue(result: Dictionary):
	var box=_panel("dialogue",790)
	var heading=HBoxContainer.new()
	box.add_child(heading)
	var name_label=_label(result.get("speaker",dialogue_id.capitalize()),25)
	name_label.size_flags_horizontal=Control.SIZE_EXPAND_FILL
	heading.add_child(name_label)
	var leave=_button("Leave" if residents.has(dialogue_id) else "Back",_close_modal)
	heading.add_child(leave)
	_copy(box,result.get("text","").replace("\n\n","\n"),21)
	var first: Button
	for choice in result.get("choices",[]):
		var action: String=choice.action
		var b=_button(choice.label,func(): _choose(action))
		box.add_child(b)
		if first==null: first=b
	if first==null: first=leave
	first.grab_focus()

func _choose(action: String):
	if action=="close": _close_modal(); return
	var before=story.export_state()
	var result=story.choose(action)
	_apply_story()
	if result.get("changed",false):
		joy=2.5
		if action in ["repair_bridge","water_garden","sing_wall"]:
			care_time=3.0
			care_point=anchors.get({"repair_bridge":"bridge","water_garden":"garden","sing_wall":"vine_wall"}[action],player.position)
		if action in ["nell_melody","sing_wall"]: audio.melody(residents.nell.body.position if action=="nell_melody" else anchors.vine_wall,action=="sing_wall")
		elif action!="greenhouse_memory": audio.cue("restored" if action=="repair_bridge" else "upgrade",player.position)
		_save()
	if action=="greenhouse_memory" and result.get("changed",false):
		moth_pending=true
		result.text="‘Nell — If the door grows over, sing. Some things remember us longer than we expect.’"
	if action=="share_table" and result.get("changed",false):
		_close_modal(); _toast("The table is ready for company.",5)
	elif story.state.flags.get("bridge_repaired",false) and not before.flags.get("bridge_repaired",false):
		_close_modal()
		_toast("The crossing is open. Nell and Ivo are heading to the garden.",6)
	elif story.state.flags.get("greenhouse_open",false) and not before.flags.get("greenhouse_open",false):
		_close_modal(); _toast("Leaves stir. The old door gives way.",5)
	else: _show_dialogue(result)

func _close_modal():
	if not primary: return
	if is_instance_valid(modal): modal.queue_free()
	modal=null
	modal_kind=""
	dialogue_id=""
	active=true
	if moth_pending:
		moth_pending=false
		moth_phase=1
		moth_clock=0.0
		moth_contact_sounded=false
	world.set_process(true)
	prompt.visible=true
	_stop_input()
	var focus=get_viewport().gui_get_focus_owner()
	if focus: focus.release_focus()
	audio.start_soundscape()
	audio.set_paused(false)
	_save()

func _stop_input():
	orbiting=false
	brush_held=false
	brush_mouse=false
	if is_instance_valid(brush_visual): brush_visual.visible=false

func _show_journal():
	var box=_panel("journal",690)
	_copy(box,"Your days in Bellwether",29)
	var scroll=ScrollContainer.new()
	scroll.custom_minimum_size=Vector2(0,clampf(story.journal().size()*52,110,360))
	scroll.horizontal_scroll_mode=ScrollContainer.SCROLL_MODE_DISABLED
	box.add_child(scroll)
	var entries=VBoxContainer.new()
	entries.size_flags_horizontal=Control.SIZE_EXPAND_FILL
	entries.add_theme_constant_override("separation",14)
	scroll.add_child(entries)
	for line in story.journal(): _copy(entries,"•  "+line,19)
	var b=_button("Back to the village",_close_modal)
	box.add_child(b)
	b.grab_focus()

func _show_settings():
	var box=_panel("settings",640)
	_copy(box,"A quiet moment",29)
	var scroll=ScrollContainer.new()
	scroll.custom_minimum_size=Vector2(0,360)
	scroll.horizontal_scroll_mode=ScrollContainer.SCROLL_MODE_DISABLED
	box.add_child(scroll)
	var content=VBoxContainer.new()
	content.size_flags_horizontal=Control.SIZE_EXPAND_FILL
	content.add_theme_constant_override("separation",10)
	scroll.add_child(content)
	for item in [["Music","music"],["Sounds","sfx"],["Ambience","ambience"],["Look speed","sensitivity"]]:
		var row=HBoxContainer.new()
		content.add_child(row)
		var label=_label(item[0],19)
		label.custom_minimum_size.x=155
		row.add_child(label)
		var slider=HSlider.new()
		slider.custom_minimum_size=Vector2(310,34)
		slider.max_value=2 if item[1]=="sensitivity" else 1
		slider.min_value=.3 if item[1]=="sensitivity" else 0
		slider.step=.05
		slider.value=settings[item[1]]
		var key=item[1]
		slider.value_changed.connect(func(v): settings[key]=v; audio.set_mix(settings.music,settings.sfx,settings.ambience))
		row.add_child(slider)
	for item in [["Gentle animation","gentle"],["Invert vertical look","invert"],["Detailed shadows","quality"]]:
		var b=CheckButton.new()
		b.text=item[0]
		b.custom_minimum_size.y=42
		b.add_theme_font_size_override("font_size",19)
		b.add_theme_color_override("font_color",Color("334b43"))
		b.add_theme_color_override("font_focus_color",Color("334b43"))
		b.add_theme_color_override("font_pressed_color",Color("334b43"))
		b.add_theme_color_override("font_hover_color",Color("334b43"))
		b.add_theme_color_override("font_hover_pressed_color",Color("334b43"))
		b.button_pressed=settings[item[1]]
		var key=item[1]
		b.toggled.connect(func(v): settings[key]=v; _apply_settings())
		content.add_child(b)
	_copy(content,"Move  WASD / arrows   ·   Interact  E\nBrush  hold Space / click dust   ·   Look  right-drag / , .\nZoom  wheel   ·   Recenter  Q   ·   Journal  J   ·   Pause  Esc",17)
	settings_status=_label(save_message,18)
	settings_status.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	content.add_child(settings_status)
	var b=_button("Back to the village",_close_modal)
	box.add_child(b)
	b.grab_focus()
	var copies=HBoxContainer.new()
	box.add_child(copies)
	for item in [["Save a copy",func():_file_copy(false)],["Load a copy",func():_file_copy(true)],["Save & quit",_quit]]:
		var button=_button(item[0],item[1])
		button.size_flags_horizontal=Control.SIZE_EXPAND_FILL
		copies.add_child(button)

func _payload() -> Dictionary:
	return {"game":story.export_state(),"position":[player.position.x,player.position.y,player.position.z],"patches":patch_amount.duplicate(),"settings":settings.duplicate()}

func _file_copy(importing: bool):
	var picker=FileDialog.new()
	picker.access=FileDialog.ACCESS_FILESYSTEM
	picker.file_mode=FileDialog.FILE_MODE_OPEN_FILE if importing else FileDialog.FILE_MODE_SAVE_FILE
	picker.use_native_dialog=true
	picker.title="Load a Dustlings copy" if importing else "Save a Dustlings copy"
	picker.add_filter("*.dustlings","Dustlings neighborhood")
	picker.current_file="Bellwether.dustlings"
	add_child(picker)
	picker.file_selected.connect(func(path):
		if importing:
			var payload=save_store.read_copy(path)
			if payload==null: _save_feedback("This copy could not be read. Your current progress is unchanged.")
			else:
				story.import_state(payload.game)
				patch_amount=payload.patches.duplicate()
				settings=payload.settings.duplicate()
				player.position=Vector3(payload.position[0],payload.position[1],payload.position[2])
				for c in companions: c.body.queue_free()
				companions.clear()
				_apply_story()
				_apply_settings()
				await _recover_position()
				_save_feedback("Copy loaded." if _save() else "Copy loaded; device saving needs attention. Save another copy before closing.")
		else: _save_feedback("Copy saved." if save_store.export_copy(path,_payload()) else "The copy could not be saved. Choose another folder.")
		picker.queue_free()
		if is_instance_valid(modal):
			for c in modal.find_children("*","Button",true,false):
				if c.visible: c.grab_focus(); break
	)
	picker.canceled.connect(func(): picker.queue_free())
	picker.popup_centered_ratio(.75)

func _save_feedback(message: String):
	if is_instance_valid(settings_status): settings_status.text=message
	else: _toast(message,6)

func _apply_settings():
	audio.set_mix(settings.music,settings.sfx,settings.ambience)
	world.set_gentle_motion(settings.gentle)
	for child in get_children():
		if child is DirectionalLight3D: child.shadow_enabled=settings.quality
	get_viewport().msaa_3d=Viewport.MSAA_2X if settings.quality else Viewport.MSAA_DISABLED
	for r in residents.values():
		r.visual.set_gentle_motion(settings.gentle)
	avatar.set_gentle_motion(settings.gentle)

func _toast(text: String,seconds: float=4):
	notice.text=text
	notice_time=seconds
	notice.visible=true

func _save() -> bool:
	if not primary: return false
	var payload=_payload()
	var result=save_store.save_progress(payload)
	save_message=result.get("message","")
	save_label.text="Saved" if result.ok else "Save needs attention · Pause"
	return result.ok

func _notification(what):
	if what==NOTIFICATION_WM_CLOSE_REQUEST: _quit()
	if what==NOTIFICATION_APPLICATION_FOCUS_OUT and is_instance_valid(player) and active and not qa:
		_stop_input()
		if not is_instance_valid(modal): _show_settings()

func _quit():
	if exiting: return
	if is_instance_valid(player) and primary and not _save(): _show_settings(); return
	exiting=true
	if is_instance_valid(audio): await audio.shutdown()
	get_tree().quit()

func _recover_position():
	await get_tree().physics_frame
	await get_tree().physics_frame
	var shape=CapsuleShape3D.new()
	shape.radius=.27
	shape.height=1.47
	var query=PhysicsShapeQueryParameters3D.new()
	query.shape=shape
	query.collision_mask=1
	query.transform=Transform3D(Basis.IDENTITY,player.position+Vector3(0,.78,0))
	query.margin=.001
	if not get_world_3d().direct_space_state.intersect_shape(query).is_empty():
		player.position=world.get_spawn()
		camera_focus=player.position+Vector3(0,1.1,0)
		waypoints=[player.position]
		_last_trail=player.position
		for i in companions.size(): companions[i].body.position=player.position+Vector3(.6,0,.6+float(i)*.5)
		save_message="Returned you to the village path. Your progress is safe."
		if modal_kind=="welcome": _show_welcome()
		else: _save_feedback(save_message)

func _begin_formation(at: Vector3):
	for i in 16:
		var angle=float(i)*TAU/16.0
		var node=_flat_part(at+Vector3(cos(angle)*.8,.1,sin(angle)*.8),Vector3(.08,.065,.08),Color("dfd5b1"),self)
		formation.append({"node":node,"angle":angle,"age":0.0,"center":at})

func _tick_formation(delta: float):
	for i in range(formation.size()-1,-1,-1):
		var p=formation[i]
		p.age+=delta
		var t=clampf(p.age/1.25,0,1)
		p.node.position=p.center+Vector3(.65*t,0,.1*t)+Vector3(cos(p.angle+t*TAU)*.8*(1-t),sin(t*PI)*.4+.15,sin(p.angle+t*TAU)*.8*(1-t))
		p.node.scale=Vector3.ONE*(.09*(1-t)+.005)
		if t>=1: p.node.queue_free(); formation.remove_at(i)

func _surface_at(at: Vector3) -> String:
	if (at.x>-12.9 and at.x<-7.1 and at.z>1.5 and at.z<6.5) or (at.x>7 and at.x<13 and at.z>-2.7 and at.z<1.7) or (absf(at.x)<1.45 and at.z>-6.2 and at.z<-3.8): return "wood"
	if (absf(at.x)<7.5 and at.z>-3.8 and at.z<5.7) or (absf(at.z+9)<1.1 and absf(at.x)<13) or (absf(at.x)<1.5 and at.z>-9 and at.z<-3) or (at.x<-5 and at.x>-11 and absf(at.z-7.5)<1.1): return "stone"
	return "grass"
