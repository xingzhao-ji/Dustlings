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

func _ready():
	if game.qa_case=="overview": commands=[{ "wait":1.0},{"capture":"welcome"},{"button":"Step into"},{"wait":3.0},{"capture":"arrival"},{"wait":1.0}]
	elif game.qa_case=="profile": commands=[{"wait":1.0},{"button":"Step into"},{"profile":60.0}]
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
			{"move":Vector3(0,0,-7.4)},{"move":Vector3(-5.5,0,-8)},{"interact":"garden"},{"button":"Water gently"},{"wait":2.0},{"close":true},{"wait":3.0},{"capture":"garden"},
			{"move":Vector3(-3,0,-8)},{"interact":"nell"},{"button":"parcel from Ivo"},{"wait":2.0},{"close":true},
			{"interact":"nell"},{"button":"humming"},{"wait":3.0},{"capture":"melody"},{"close":true},
			{"move":Vector3(4,0,-8.0)},{"move":Vector3(12,0,-8.0)},{"interact":"vine_wall"},{"wait":2.0},{"capture":"ivy-before"},{"button":"Hum Nell"},{"wait":5.0},{"capture":"ivy-after"},
			{"move":Vector3(12,0,-11.7)},{"interact":"greenhouse_memory"},{"wait":3.0},{"capture":"greenhouse"},{"button":"Read the letter"},{"wait":4.0},{"capture":"letter"},{"close":true},{"wait":2.0},
			{"move":Vector3(12,0,-8.2)},{"move":Vector3(-9,0,-8.2)},{"move":Vector3(-12,0,-10.5)},{"interact":"alcove"},{"button":"little light"},{"wait":3.0},{"capture":"alcove"},{"close":true},
			{"move":Vector3(-6.3,0,-8.3)},{"interact":"herbs"},{"button":"Gather a few"},{"wait":1.0},{"close":true},
			{"move":Vector3(-3,0,-9.6)},{"interact":"table"},{"button":"Prepare the shared"},{"wait":2.0},{"close":true},{"wait":18.0},{"capture":"gathering"},
			{"save":true},{"wait":1.0}
		]

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
	if cmd.has("wait"): complete=age>=cmd.wait
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
		index+=1
		age=0

func _finish(ok: bool):
	done=true
	_release()
	results.ok=ok
	results.elapsed_engine_seconds=total
	results.story=game.story.export_state()
	results.patches=game.patch_amount
	results.position=[game.player.position.x,game.player.position.y,game.player.position.z]
	results.companions=game.companions.size()
	results.camera_distance=game.camera_distance
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
