extends SceneTree
## Explicit four-companion progress fixture; followers use untouched live motion.
var game
var held: Dictionary = {}
var stages: Array = []
var failures: Array = []
var checks: Array = []
var output = "res://../evidence/rpg/companions"
var source_hashes: Dictionary = {}

func _init():
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--companion-evidence="): output=arg.trim_prefix("--companion-evidence=")
	for path in ["rpg_main.gd","rpg_environment.gd","rpg_actor.gd","rpg_story.gd","rpg_navigation.gd"]:
		if FileAccess.file_exists("res://scripts/"+path):source_hashes[path]=FileAccess.get_sha256("res://scripts/"+path)
	call_deferred("run")

func check(ok: bool, name: String, data: Dictionary = {}):
	var item={"ok":ok,"check":name,"details":data}
	if ok: checks.append(item)
	else: failures.append(item);push_warning(name)

func key(code: int, pressed: bool):
	if held.get(code,false)==pressed:return
	held[code]=pressed
	var event=InputEventKey.new()
	event.keycode=code;event.physical_keycode=code;event.pressed=pressed
	Input.parse_input_event(event)

func release():
	for code in held.keys():key(code,false)

func frames(n: int):
	for i in n: await physics_frame
	await process_frame

func walk(target: Vector3, label: String) -> bool:
	var reached=false
	for i in 900:
		var diff: Vector3=target-game.player.position;diff.y=0
		if diff.length()<.19:reached=true;break
		var local=Basis(Vector3.UP,-game.yaw)*diff
		key(KEY_D,local.x>.11);key(KEY_A,local.x<-.11);key(KEY_S,local.z>.11);key(KEY_W,local.z<-.11)
		await physics_frame
	release();await frames(3)
	check(reached,"Player walks " +label,{"target":str(target),"actual":str(game.player.position)})
	return reached

func snapshot(label: String) -> Dictionary:
	var out={"stage":label,"player":str(game.player.position),"companions":[]}
	for i in game.companions.size():
		var c=game.companions[i]
		var body: CharacterBody3D=c.body
		var next: Vector3=c.path[0] if not c.path.is_empty() else game.player.position
		var query=PhysicsRayQueryParameters3D.create(body.position+Vector3(0,.25,0),next+Vector3(0,.25,0),1)
		var hit=game.get_world_3d().direct_space_state.intersect_ray(query)
		var shape=CapsuleShape3D.new();shape.radius=.13;shape.height=.40
		var overlap_query=PhysicsShapeQueryParameters3D.new();overlap_query.shape=shape
		overlap_query.transform=Transform3D(Basis.IDENTITY,body.position+Vector3(0,.31,0));overlap_query.collision_mask=1
		var colliders=[]
		for overlap in game.get_world_3d().direct_space_state.intersect_shape(overlap_query):colliders.append(str(overlap.collider.name))
		var near=[]
		for j in game.companions.size():
			if j!=i:near.append({"id":j,"distance":body.position.distance_to(game.companions[j].body.position)})
		var contacts=[]
		for j in body.get_slide_collision_count():
			var contact=body.get_slide_collision(j)
			contacts.append({"collider":str(contact.get_collider().name),"normal":str(contact.get_normal()),"remainder":str(contact.get_remainder())})
		out.companions.append({"id":i,"position":str(body.position),"velocity":str(body.velocity),"player_distance":body.position.distance_to(game.player.position),"next":str(next),"next_distance":body.position.distance_to(next),"queue":c.path.size(),"next_points":str(c.path.slice(0,5)),"waypoint_blocker":str(hit.collider.name) if not hit.is_empty() else "", "overlap_colliders":colliders,"others":near,"contacts":contacts})
	return out

func rest(label: String):
	var before=snapshot(label+" before rest")
	await frames(1800)
	var after=snapshot(label+" after30s")
	stages.append({"before":before,"after":after})
	var close=true
	var grounded=true
	for c in after.companions:
		if c.player_distance>3:close=false
		if not c.overlap_colliders.is_empty():grounded=false
	check(close,"All four companions settle within3m after " +label,{"companions":after.companions})
	check(grounded,"Companion bodies avoid solid overlap after " +label)

func run():
	root.size=Vector2i(1280,800);root.content_scale_size=Vector2i(1280,800)
	game=load("res://scenes/neighborhood.tscn").instantiate();root.add_child(game)
	await frames(6)
	# The only progress injection: initialize the complete companion/door abilities
	# so the same four actual bodies can be observed over a bounded traversal.
	var s=game.story
	s.perform("first_companion");s.interact("mara");s.choose("mara_plan")
	s.perform("collect_wood");s.perform("clear_bridge");s.perform("repair_bridge")
	s.interact("nell");s.choose("nell_concern");s.perform("water_garden");s.choose("nell_melody");s.perform("sing_wall");s.perform("greenhouse_memory")
	game.patch_amount={"lantern":0.0,"bridge":0.0}
	game.brush_point=game.player.position
	game._apply_story();game._close_modal()
	await frames(120)
	check(game.companions.size()==4,"Explicit four-companion fixture initialized without changing follower code")
	if "--navigation-only" in OS.get_cmdline_user_args():
		await navigation_probe()
		await finish()
		return
	if "--shared-waypoint-only" in OS.get_cmdline_user_args():
		await shared_waypoint_probe()
		await finish()
		return
	await walk(Vector3(0,0,5),"first open lane")
	await rest("first open lane")
	await walk(Vector3(-5,0,7.8),"home street")
	await walk(Vector3(-10,0,7.8),"home door")
	await walk(Vector3(-10,0,5.1),"home interior")
	await rest("home interior")
	await walk(Vector3(-10,0,7.8),"home exit")
	await walk(Vector3(-6,0,7.8),"home street exit")
	await walk(Vector3(0,0,4.4),"plaza")
	await walk(Vector3(0,0,-2.8),"bridge approach")
	await walk(Vector3(0,0,-6.5),"repaired bridge")
	await walk(Vector3(5,0,-6.5),"north lane")
	await rest("bridge crossing")
	await walk(Vector3(12,0,-8),"greenhouse approach")
	await walk(Vector3(12,0,-11.7),"greenhouse interior")
	await rest("greenhouse interior")
	await walk(Vector3(12,0,-8),"greenhouse exit")
	await walk(Vector3(5,0,-6.5),"north lane return")
	await walk(Vector3(0,0,-6.5),"bridge return approach")
	await walk(Vector3(0,0,4.4),"bridge return")
	await rest("return to plaza")
	await finish()

func shared_waypoint_probe():
	# Separate artificial geometry-free fixture to test the specific queue/spacing
	# hypothesis. This is not evidence that the ordinary route reaches this setup.
	var center=Vector3(5,0,5)
	for node in game.world.get_children():
		if node is StaticBody3D and node.name!="WalkingGround":node.collision_layer=0
	game.player.position=Vector3(5,0,8)
	game._last_trail=game.player.position
	game.waypoints.clear()
	game.waypoints.append(game.player.position)
	for i in game.companions.size():
		var c=game.companions[i]
		c.body.position=center+Vector3(cos(float(i)*PI*.5),0,sin(float(i)*PI*.5))*.36
		c.body.velocity=Vector3.ZERO
		c.path=[center]
		c.age=3.0
	var before=snapshot("Artificial shared waypoint before")
	await frames(720)
	var after=snapshot("Artificial shared waypoint after12s")
	stages.append({"fixture":"Four companions placed symmetrically .36m from one clear breadcrumb; player3m away. Nonfloor world collision disabled solely to isolate crowd spacing; no runtime motion alteration.","before":before,"after":after})
	var consumed=true
	for c in after.companions:
		if c.queue>0:consumed=false
	check(consumed,"All four consume one unobstructed shared waypoint within12fixtureseconds",{"companions":after.companions})

func navigation_probe():
	game.set_physics_process(false)
	var nav=load("res://scripts/rpg_navigation.gd").new()
	game.world.set_story({"flags":{}})
	await frames(3)
	nav.configure(game.world)
	var first_build=nav.build_info.duplicate(true)
	var gen=nav.generation
	nav.configure(game.world)
	check(nav.generation==gen,"Navigation does not rebuild unchanged collision topology")
	check(nav.path(Vector3(0,0,-3),Vector3(0,0,-7)).is_empty(),"Unrepaired bridge blocks companion routing")
	check(nav.path(Vector3(12,0,-8),Vector3(12,0,-11.7)).is_empty(),"Closed ivy gate blocks companion routing")
	check(nav.path(Vector3(0,0,9),Vector3(-8.4,0,3.25)).is_empty(),"Unsafe destination inside bed is refused")
	check(nav.path(Vector3(100,0,100),Vector3.ZERO).is_empty(),"Out-of-world navigation start is refused")
	game.world.set_story({"flags":{"bridge_repaired":true,"greenhouse_open":true}})
	await frames(3)
	nav.configure(game.world)
	check(nav.generation==gen+1,"Opening bridge and ivy gate rebuilds topology once")
	var routes=[
		{"name":"actual stalled OldLantern position","from":Vector3(1.291065,0,5.651238),"to":Vector3(-.398337,0,5.541665)},
		{"name":"home doorway","from":Vector3(-10,0,7.8),"to":Vector3(-10,0,5.1)},
		{"name":"repaired bridge","from":Vector3(0,0,-3),"to":Vector3(0,0,-7)},
		{"name":"open greenhouse","from":Vector3(12,0,-8),"to":Vector3(12,0,-11.7)}]
	var results=[]
	for i in routes.size():
		var route=routes[i]
		var points: Array[Vector3]=nav.path(route.from,route.to)
		var at: Vector3=route.from
		var clear=not points.is_empty()
		for point in points:
			if not nav.segment_clear(at,point):clear=false
			at=point
		check(clear,"Route has continuously clear capsule segments: "+route.name,{"path":str(points)})
		var body: CharacterBody3D=game.companions[i].body
		body.position=route.from;body.velocity=Vector3.ZERO
		var point_index=0
		var max_step=0.0
		for frame in 1200:
			await physics_frame
			if point_index>=points.size():break
			var delta: Vector3=points[point_index]-body.position;delta.y=0
			if delta.length()<.055:point_index+=1;continue
			var last=body.position
			var velocity=delta.normalized()*minf(3,delta.length()*6)
			body.velocity=Vector3(velocity.x,-1,velocity.z)
			body.move_and_slide()
			max_step=maxf(max_step,body.position.distance_to(last))
		var gap=Vector2(body.position.x-route.to.x,body.position.z-route.to.z).length()
		check(gap<.08 and max_step<.07,"Actual companion capsule traverses route without position warp: "+route.name,{"gap":gap,"max_frame_step":max_step,"position":str(body.position)})
		results.append({"name":route.name,"path":str(points),"gap":gap,"max_frame_step":max_step})
	stages.append({"fixture":"Navigation geometry probe. Existing companion capsules placed at four explicit starts then moved only by move_and_slide along returned route. This is not integrated following/animation.","initial_build":first_build,"open_build":nav.build_info,"routes":results})

func finish():
	check(stages.size()==(1 if "--shared-waypoint-only" in OS.get_cmdline_user_args() or "--navigation-only" in OS.get_cmdline_user_args() else 5),"Fixture reaches every required observation stage")
	var final_hashes={}
	for path in source_hashes:final_hashes[path]=FileAccess.get_sha256("res://scripts/"+path)
	var report={"kind":"Headless fixed-fps actual CharacterBody3D and generated walking fixture. Four-companion/door progress initialized once; no follower teleport, no native visual/human/performance claim.","engine":Engine.get_version_info(),"source_at_start":source_hashes,"source_at_end":final_hashes,"source_changed":source_hashes!=final_hashes,"checks":checks,"failures":failures,"stages":stages}
	DirAccess.make_dir_recursive_absolute(output)
	var file=FileAccess.open(output.path_join("report.json"),FileAccess.WRITE);file.store_string(JSON.stringify(report,"  "));file.close()
	print(JSON.stringify({"checks":checks.size(),"failures":failures.size(),"source_changed":report.source_changed}))
	await game.audio.shutdown()
	if AudioServer.get_driver_name()=="Dummy":OS.delay_msec(650)
	game.queue_free();await frames(5)
	quit(0 if failures.is_empty() else 1)
