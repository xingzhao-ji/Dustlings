extends Node
## Generated InputEvent review route. No story rewards or player position injected.
var game: Node3D
var commands: Array = []
var index = 0
var age = 0.0
var total = 0.0
var held: Dictionary = {}
var results = {"method":"Generated native InputEvents; authored route knows destinations. No player or story progression injection.","checks":[],"humanTests":0}
var done = false
var profile_frames: Array = []
var last_tick = 0
var profile_start = 0
var _right_held := false
var _orbit_started := false
var _orbit_pitch_start := 0.0
var _art_yaw_start := 0.0

func _ready():
	if game.qa_case=="overview": commands=[{ "wait":1.0},{"capture":"welcome"},{"button":"Step into"},{"wait":3.0},{"capture":"arrival"},{"wait":1.0}]
	elif game.qa_case=="profile": commands=[{"wait":1.0},{"button":"Return home" if game._start_saved else "Step into"},{"profile":60.0}]
	elif game.qa_case=="ui": commands=[{"wait":1.0},{"capture":"welcome"},{"button":"Step into"},{"key":KEY_ESCAPE},{"wait":1.0},{"capture":"settings"},{"key":KEY_ESCAPE},{"key":KEY_J},{"wait":1.0},{"capture":"journal"},{"key":KEY_ESCAPE}]
	elif game.qa_case=="art":
		if game._start_saved:
			results.checks.append({"ok":false,"reason":"Art comparison requires a fresh isolated save."})
			call_deferred("_finish",false)
			return
		commands=_art_commands()
		_art_yaw_start=game.yaw
		results.art_review={"source":"Fresh game; helper earned by brushing.","controls":"Generated physical WASD/Space/E/Enter and right-button mouse drags. No teleport, camera property assignment or reward injection.","segments":[],"orbits":[]}
	elif game.qa_case=="resume": commands=[{"wait":1.0},{"button":"Return home"},{"wait":2.0},{"capture":"resumed"}]
	else:
		commands=[
			{"wait":1.0},{"button":"Step into"},{"wait":1.0},{"capture":"arrival"},
			{"move":Vector3(.5,0,7.4)},{"brush":5.0},{"wait":2.0},{"capture":"first-companion"},
			{"move":Vector3(-2,0,4.4)},{"interact":"ivo"},{"wait":2.0},{"capture":"ivo"},{"button":"Why so many"},{"wait":2.0},{"close":true},
			{"interact":"ivo"},{"button":"carry Nell"},{"wait":1.5},{"close":true},
			{"move":Vector3(-5.7,0,3.0)},{"interact":"tavi"},{"wait":2.5},{"capture":"tavi"},{"button":"extra cup"},{"wait":2.0},{"close":true},
			{"move":Vector3(-10,0,7.8)},{"interact":"home"},{"button":"Sage"},{"wait":1.5},{"close":true},
			{"move":Vector3(-10,0,5.1)},{"capture":"home-interior"},{"wait":2.0},
			{"move":Vector3(-10,0,7.8)},{"move":Vector3(0,0,4.4)},{"move":Vector3(8.6,0,2.8)},
			{"interact":"mara"},{"wait":2.5},{"capture":"mara"},{"button":"unfinished bridge"},{"wait":2.0},{"close":true},
			{"interact":"mara"},{"button":"Show her"},{"wait":2.0},{"close":true},
			{"move":Vector3(6.4,0,4.0)},{"interact":"wood"},{"button":"Gather boards"},{"wait":1.5},{"close":true},
			{"move":Vector3(0,0,0)},{"move":Vector3(-3.1,0,-1.0)},{"interact":"nell"},{"wait":2.5},{"capture":"nell"},{"button":"Who planted"},{"wait":2.0},{"close":true},
			{"move":Vector3(0,0,-2.2)},{"brush":9.0},{"interact":"bridge"},{"capture":"bridge-before"},{"button":"Repair together"},{"wait":7.0},{"capture":"bridge-after"},
			{"move":Vector3(0,0,-7.4)},{"move":Vector3(0,0,-6.5)},{"move":Vector3(-5.5,0,-6.5)},{"move":Vector3(-5.5,0,-8)},{"interact":"garden"},{"button":"Water gently"},{"wait":2.0},{"close":true},{"wait":3.0},{"capture":"garden"},
			{"move":Vector3(2.2,0,-6.5)},{"move":Vector3(-3,0,-6.5)},{"move":Vector3(-3,0,-8)},{"interact":"nell"},{"button":"parcel from Ivo"},{"wait":2.0},{"close":true},
			{"interact":"nell"},{"button":"humming"},{"wait":3.0},{"capture":"melody"},{"close":true},
			{"move":Vector3(4,0,-8.0)},{"move":Vector3(12,0,-8.0)},{"interact":"vine_wall"},{"wait":2.0},{"capture":"ivy-before"},{"button":"Hum Nell"},{"wait":5.0},{"capture":"ivy-after"},
			{"move":Vector3(12,0,-11.7)},{"interact":"greenhouse_memory"},{"wait":3.0},{"capture":"greenhouse"},{"button":"Read the letter"},{"wait":3.0},{"capture":"letter"},{"close":true},{"wait":2.0},{"capture":"moth-exchange"},{"wait":3.0},{"capture":"moth-gift"},{"wait":2.0},
			{"move":Vector3(12,0,-8.2)},{"move":Vector3(5,0,-6.5)},{"move":Vector3(-9,0,-6.5)},{"move":Vector3(-12,0,-10.5)},{"interact":"alcove"},{"button":"little light"},{"wait":3.0},{"capture":"alcove"},{"close":true},
			{"move":Vector3(-6.3,0,-8.3)},{"interact":"herbs"},{"button":"Gather a few"},{"wait":1.0},{"close":true},
			{"move":Vector3(-3,0,-9.6)},{"interact":"table"},{"button":"Prepare the shared"},{"wait":2.0},{"close":true},{"wait":18.0},{"capture":"gathering"},
			{"move":Vector3(-4.5,0,-9.3)},{"interact":"tavi"},{"button":"teach me"},{"wait":2.0},{"close":true},
			{"move":Vector3(-1,0,-8.5)},{"interact":"mara"},{"button":"make something"},{"wait":2.0},{"close":true},
			{"move":Vector3(-1,0,-6.5)},{"move":Vector3(2.2,0,-6.5)},{"move":Vector3(2.2,0,-7.4)},{"interact":"ivo"},{"button":"favorite route"},{"wait":2.0},{"close":true},
			{"move":Vector3(2.2,0,-6.5)},{"move":Vector3(-3,0,-6.5)},{"move":Vector3(-3,0,-8)},{"interact":"nell"},{"button":"letter"},{"wait":2.0},{"close":true},
			{"move":Vector3(0,0,-7)},{"move":Vector3(0,0,3)},{"move":Vector3(-10,0,7.8)},{"move":Vector3(-10,0,5.1)},{"wait":3.0},{"capture":"home-return"},
			{"save":true},{"wait":1.0}
		]

func _art_commands() -> Array:
	# One uninterrupted movie at ordinary game speed. Captures mark source times;
	# the quarter-orbit snapshots do not cut or retime the recorded experience.
	return [
		{"wait":1.0},{"capture":"welcome"},{"button":"Step into"},{"wait":1.0},
		{"mark":"arrival"},{"capture":"art-arrival"},
		{"move":Vector3(.5,0,7.4)},{"brush":5.0},{"wait":1.5},{"capture":"art-first-companion"},
		{"mark":"normal-walk-and-rapid-reversal"},
		{"walk_for":KEY_D,"seconds":.70},{"walk_for":KEY_A,"seconds":.35},{"walk_for":KEY_D,"seconds":.35},
		{"wait":.8},{"capture":"art-reversal-stop"},
		{"mark":"stop-start"},{"walk_for":KEY_A,"seconds":.35},{"wait":.35},{"walk_for":KEY_A,"seconds":.35},
		{"wait":.65},{"capture":"art-stop-start"},
		{"move":Vector3(-2,0,4.4)},{"wait":1.0},{"mark":"ivo-meeting"},{"interact":"ivo"},
		{"wait":2.0},{"capture":"art-ivo-notice"},{"button":"Why so many"},{"wait":2.5},
		{"capture":"art-ivo-gesture"},{"close":true},{"wait":2.0},{"capture":"art-ivo-return"},
		{"move":Vector3(0,0,6.8)},{"wait":1.5},{"mark":"stationary-full-yaw-normal-pitch"},
		{"orbit_yaw":PI*.5,"seconds":3.0},{"capture":"art-orbit-quarter"},
		{"orbit_yaw":PI*.5,"seconds":3.0},{"capture":"art-orbit-back"},
		{"orbit_yaw":PI*.5,"seconds":3.0},{"capture":"art-orbit-three-quarter"},
		{"orbit_yaw":PI*.5,"seconds":3.0},{"capture":"art-orbit-front"},
		{"mark":"low-pitch"},{"orbit_yaw":0.0,"pitch_target":.23,"seconds":1.5},
		{"orbit_yaw":PI*.5,"seconds":3.0},{"capture":"art-orbit-low"},
		{"mark":"high-pitch"},{"orbit_yaw":0.0,"pitch_target":.94,"seconds":2.0},
		{"orbit_yaw":PI*.5,"seconds":3.0},{"capture":"art-orbit-high"},
		{"orbit_yaw":0.0,"pitch_target":.48,"seconds":1.5},
		{"orbit_yaw":PI,"seconds":6.0},{"wait":.8},{"capture":"art-returned-view"},
		{"save":true},{"wait":.5}
	]

func _right_button(pressed: bool) -> void:
	if _right_held == pressed: return
	_right_held = pressed
	var event := InputEventMouseButton.new()
	event.button_index = MOUSE_BUTTON_RIGHT
	event.button_mask = MOUSE_BUTTON_MASK_RIGHT if pressed else 0
	event.position = game.get_viewport().get_visible_rect().size * Vector2(.5,.4)
	event.global_position = event.position
	event.pressed = pressed
	Input.parse_input_event(event)

func _orbit_input(cmd: Dictionary, delta: float) -> bool:
	if not _orbit_started:
		_release()
		_orbit_pitch_start = game.pitch
		_orbit_started = true
		_right_button(true)
	var duration: float = cmd.seconds
	var portion := (minf(age,duration)-minf(maxf(0,age-delta),duration))/duration
	var sensitivity: float = maxf(.01,game.settings.sensitivity)
	var pitch_change: float = float(cmd.get("pitch_target",_orbit_pitch_start))-_orbit_pitch_start
	var event := InputEventMouseMotion.new()
	event.button_mask = MOUSE_BUTTON_MASK_RIGHT
	event.position = game.get_viewport().get_visible_rect().size * Vector2(.5,.4)
	event.global_position = event.position
	event.relative = Vector2(-float(cmd.orbit_yaw)*portion/(.004*sensitivity),pitch_change*portion/(.003*sensitivity)*(-1.0 if game.settings.invert else 1.0))
	Input.parse_input_event(event)
	if age >= duration:
		_right_button(false)
		_orbit_started = false
		return true
	return false

func _key(code: int,pressed: bool):
	var event=InputEventKey.new()
	event.keycode=code
	event.physical_keycode=code
	event.pressed=pressed
	Input.parse_input_event(event)

func _hold(code: int,pressed: bool):
	if held.get(code,false)==pressed: return
	held[code]=pressed
	_key(code,pressed)

func _release():
	for code in held.keys(): _hold(code,false)
	_right_button(false)

func _tap(code: int):
	_key(code,true)
	_key(code,false)

func _buttons(node: Node) -> Array:
	var found: Array=[]
	for child in node.get_children():
		if child is Button and child.visible: found.append(child)
		found.append_array(_buttons(child))
	return found

func _process(delta):
	if done: return
	total += delta
	age += delta
	if index>=commands.size(): _finish(true); return
	var cmd: Dictionary=commands[index]
	if age>30 and not cmd.has("profile"):
		results.checks.append({"ok":false,"step":index,"command":str(cmd),"position":str(game.player.position),"nearest":game.nearest,"reason":"30-second route timeout"})
		_finish(false); return
	var complete=false
	if cmd.has("mark"):
		results.art_review.segments.append({"label":cmd.mark,"time":total,"position":[game.player.position.x,game.player.position.y,game.player.position.z],"yaw":game.yaw,"pitch":game.pitch})
		complete=true
	elif cmd.has("walk_for"):
		_hold(cmd.walk_for,age<float(cmd.seconds))
		complete=age>=float(cmd.seconds)
		if complete: _release()
	elif cmd.has("orbit_yaw"): complete=_orbit_input(cmd,delta)
	elif cmd.has("wait"): complete=age>=cmd.wait
	elif cmd.has("move"):
		var diff: Vector3=cmd.move-game.player.position
		diff.y=0
		if diff.length()<.18: _release(); complete=true
		else:
			var local=Basis(Vector3.UP,-game.yaw)*diff
			_hold(KEY_D,local.x>.12)
			_hold(KEY_A,local.x<-.12)
			_hold(KEY_S,local.z>.12)
			_hold(KEY_W,local.z<-.12)
	elif cmd.has("brush"):
		_hold(KEY_SPACE,age<cmd.brush)
		complete=age>=cmd.brush+.1
	elif cmd.has("interact"):
		if game.nearest==cmd.interact:
			_tap(KEY_E)
			complete=is_instance_valid(game.modal)
	elif cmd.has("button"):
		if is_instance_valid(game.modal):
			for b in _buttons(game.modal):
				if cmd.button.to_lower() in b.text.to_lower() and not b.disabled:
					b.grab_focus()
					# A real pressed/released Enter reaches the focused Godot button.
					_tap(KEY_ENTER)
					complete=true
					break
	elif cmd.has("key"): _tap(cmd.key); complete=true
	elif cmd.has("close"):
		if is_instance_valid(game.modal): _tap(KEY_ESCAPE)
		complete=true
	elif cmd.has("capture"):
		done=true
		await RenderingServer.frame_post_draw
		game.get_viewport().get_texture().get_image().save_png(game.qa_output.path_join(cmd.capture+".png"))
		done=false
		complete=true
	elif cmd.has("save"):
		complete=game._save()
	elif cmd.has("profile"):
		var now=Time.get_ticks_usec()
		if profile_start==0: profile_start=now; last_tick=now
		else: profile_frames.append(float(now-last_tick)/1000.0); last_tick=now
		complete=float(now-profile_start)/1000000.0>=cmd.profile
	if complete:
		results.checks.append({"ok":true,"step":index,"command":str(cmd),"time":total,"position":str(game.player.position),"nearest":game.nearest})
		if game.qa_case=="art":
			results.checks[-1].camera={"yaw":game.yaw,"pitch":game.pitch,"distance":game.camera_distance,"right_held":_right_held}
			results.checks[-1].held_keys=held.duplicate()
			if cmd.has("orbit_yaw"):
				results.art_review.orbits.append({"time":total,"requested_yaw":cmd.orbit_yaw,"requested_pitch":cmd.get("pitch_target",_orbit_pitch_start),"actual_yaw":game.yaw,"actual_pitch":game.pitch,"right_released":not _right_held})
		index+=1
		age=0

func _finish(ok: bool):
	done=true
	_release()
	if game.qa_case=="art" and results.has("art_review"):
		var art_checks={"earned_companion":game.story.has("first_companion"),"met_ivo":game.story.has("met_ivo"),"controls_released":not _right_held and not held.values().any(func(value):return value),"full_camera_input":absf(game.yaw-_art_yaw_start-TAU*2)<.05,"pitch_returned":absf(game.pitch-.48)<.02}
		results.art_review.validation=art_checks
		for label in art_checks:
			if not art_checks[label]:
				results.checks.append({"ok":false,"reason":"Art capture acceptance failed: "+label})
				ok=false
	results.ok=ok
	results.elapsed_engine_seconds=total
	results.story=game.story.export_state()
	results.patches=game.patch_amount
	results.position=[game.player.position.x,game.player.position.y,game.player.position.z]
	results.companions=game.companions.size()
	results.camera_distance=game.camera_distance
	results.companion_distances=game.companions.map(func(c):return c.body.position.distance_to(game.player.position))
	results.companion_routes=game.companions.map(func(c):return {"position":str(c.body.position),"next":str(c.path[0]) if not c.path.is_empty() else "idle","queued":c.path.size()})
	results.resident_positions={}
	for id in game.residents: results.resident_positions[id]=str(game.residents[id].body.position)
	if not profile_frames.is_empty():
		results.callback_ms=profile_frames
		var sorted=profile_frames.duplicate()
		sorted.sort()
		results.performance={"wall_seconds":float(Time.get_ticks_usec()-profile_start)/1000000.0,"callbacks":sorted.size(),"p95_ms":sorted[int(sorted.size()*.95)],"p99_ms":sorted[int(sorted.size()*.99)],"worst_ms":sorted[-1],"over_33_4":sorted.filter(func(x):return x>33.4).size(),"limits":"Native callback intervals, not GPU or input latency. Opening scene; no human inputs."}
	var f=FileAccess.open(game.qa_output.path_join("results.json"),FileAccess.WRITE)
	f.store_string(JSON.stringify(results,"\t"))
	f.close()
	print("RPG_QA="+JSON.stringify({"ok":ok,"steps":index,"elapsed":total,"story":results.story}))
	await game.audio.shutdown()
	get_tree().quit(0 if ok else 1)
