extends SceneTree
## Prepared greenhouse progress and starting positions; production animation,
## collision, dialogue, pause and save code remain unchanged.
var game
var checks=[]
var failures=[]
var output="res://../evidence/rpg/reveal"
var hashes={}
var observations={}
func _init():
    if "--rpg-qa" not in OS.get_cmdline_user_args():
        push_error("Scene tests require --rpg-qa to protect normal player saves.")
        quit(2)
        return
    for arg in OS.get_cmdline_user_args():
        if arg.begins_with("--reveal-evidence="):output=arg.trim_prefix("--reveal-evidence=")
    for path in ["rpg_main.gd","rpg_environment.gd","rpg_actor.gd","rpg_story.gd","rpg_save.gd","dustling_visual.gd","rpg_navigation.gd"]:
        hashes[path]=FileAccess.get_sha256("res://scripts/"+path)
    call_deferred("run")
func check(ok:bool,label:String,details:Dictionary={}):
    var row={"ok":ok,"check":label,"details":details}
    if ok:checks.append(row)
    else:failures.append(row);push_warning(label)
func frames(count:int):
    for i in count:await physics_frame
    await process_frame
func key(code:int,pressed:bool):
    var event=InputEventKey.new();event.keycode=code;event.physical_keycode=code;event.pressed=pressed;Input.parse_input_event(event)
func create_game():
    game=load("res://scenes/neighborhood.tscn").instantiate();root.add_child(game);await frames(5)
func remove_game():
    await game.audio.shutdown()
    if AudioServer.get_driver_name()=="Dummy":OS.delay_msec(650)
    game.queue_free();await frames(5)
func run():
    root.size=Vector2i(1280,800);root.content_scale_size=Vector2i(1280,800)
    await create_game()
    check(game.qa and not game._start_saved,"Fresh isolated QA save")
    game._close_modal()
    var s=game.story
    s.perform("first_companion");s.interact("mara");s.choose("mara_plan")
    s.perform("collect_wood");s.perform("clear_bridge");s.perform("repair_bridge")
    s.interact("nell");s.choose("nell_concern");s.perform("water_garden");s.choose("nell_melody");s.perform("sing_wall")
    game.patch_amount={"lantern":0.0,"bridge":0.0}
    game.player.position=Vector3(12,0,-11.5);game.player.velocity=Vector3.ZERO;game.brush_point=Vector3(11.5,0,-11.1)
    game._apply_story()
    for i in game.companions.size():
        var c=game.companions[i]
        c.body.position=Vector3(11.3+float(i)*.5,0,-11.1)
        c.body.velocity=Vector3.ZERO;c.path.clear();c.nav_path.clear();c.nav_goal=Vector3.INF;c.age=3.0
    game._last_trail=game.player.position;game.waypoints.clear()
    await frames(5)
    var first=game.companions[0].body
    var original_id=first.get_instance_id()
    var initial_position:Vector3=first.position
    game.dialogue_id="greenhouse_memory"
    game._show_dialogue(game.story.interact("greenhouse_memory"))
    game._choose("greenhouse_memory")
    check(game.moth_pending and game.moth_phase==0,"Letter creates a pending handoff without starting behind its panel")
    check(game.companions.size()==4 and game.story.has("glow_unlocked"),"Letter grants durable ability and fourth companion")
    var newborn=game.companions[-1]
    var initial_scale:float=newborn.visual._visual.scale.x
    var first_min=1.0
    var later_newborn_min=1.0
    for frame in 360:
        await frames(1)
        first_min=minf(first_min,game.companions[0].visual._visual.scale.x)
        if frame>90:later_newborn_min=minf(later_newborn_min,newborn.visual._visual.scale.x)
    check(initial_scale<.1 and newborn.age>5.8 and later_newborn_min>.99,"Newborn grows during six-second letter without full-size to dot restart",{"initial_scale":initial_scale,"age":newborn.age,"later_min_scale":later_newborn_min})
    check(first_min>.99 and first.position.distance_to(initial_position)<.01,"Existing first companion keeps body size and position while reading",{"minimum_scale":first_min,"position":str(first.position)})
    check(game.moth_phase==0 and game.companions[0].light.light_energy==0,"Gift does not occur while letter remains open")
    var pending_save=game.save_store.load_progress()
    check(pending_save.ok and pending_save.payload.game.flags.get("glow_unlocked",false) and pending_save.payload.game.flags.get("memory_found",false),"Production choice saves the ability before the player finishes reading")
    game._close_modal();await frames(1)
    var last:Vector3=first.position
    var max_step=0.0
    var approach_frames=0
    while game.moth_phase==1 and approach_frames<900:
        await frames(1)
        max_step=maxf(max_step,first.position.distance_to(last));last=first.position;approach_frames+=1
    check(game.moth_phase==2 and max_step<.08,"Same companion physically reaches meeting without a position warp",{"frames":approach_frames,"max_frame_travel":max_step,"position":str(first.position)})
    check(first.get_instance_id()==original_id,"Handoff preserves the first companion instance")
    var held_at:Vector3=first.position
    var start_player:Vector3=game.player.position
    key(KEY_S,true);key(KEY_COMMA,true);await frames(12);key(KEY_S,false);key(KEY_COMMA,false)
    check(game.player.position.distance_to(start_player)>.25,"Player can walk while the moth approaches",{"distance":game.player.position.distance_to(start_player)})
    check(absf(game.yaw)>.1,"Camera orbit controls remain live during handoff",{"yaw":game.yaw})
    await frames(30)
    game._show_settings();await frames(3)
    var paused_clock:float=game.moth_clock
    var paused_moth:Vector3=game.world._moth.position
    var paused_player:Vector3=game.player.position
    var paused_first:Vector3=first.position
    key(KEY_A,true);await frames(120);key(KEY_A,false)
    check(game.moth_clock==paused_clock and game.world._moth.position.distance_to(paused_moth)<.0001,"Pause freezes both handoff timing and actual moth position")
    check(game.player.position.distance_to(paused_player)<.0001 and first.position.distance_to(paused_first)<.0001,"Pause prevents walking and companion movement")
    check(game.audio.is_paused,"Pause applies to soundscape during handoff")
    game._close_modal();await frames(1)
    check(game.moth_phase==2 and game.moth_clock>=paused_clock,"Resume continues the same handoff phase")
    var closest=100.0
    var hold_drift=0.0
    var contact_light=0.0
    var count=0
    while game.moth_phase==2 and count<600:
        await frames(1)
        closest=minf(closest,game.world._moth.global_position.distance_to(first.global_position+Vector3(0,.48,0)))
        hold_drift=maxf(hold_drift,first.position.distance_to(held_at))
        if game.moth_clock>2.3:contact_light=maxf(contact_light,game.companions[0].light.light_energy)
        count+=1
    check(closest<.08,"Moth reaches the same companion head within eight centimeters",{"minimum_distance":closest})
    check(hold_drift<.02,"Receiving companion remains grounded and still through contact",{"maximum_drift":hold_drift})
    check(game.moth_contact_sounded and contact_light>.02,"Contact triggers its sound event and visible retained light",{"light_energy":contact_light})
    check(game.moth_phase==0 and count<600,"Handoff finishes after pause and frees normal following")
    await frames(60)
    check(first.get_instance_id()==original_id and game.companions[0].light.light_energy>.02,"Same companion retains light after scene finishes")
    check(game._save(),"Current greenhouse progress saves through production store")
    var saved=game.save_store.load_progress()
    check(saved.ok and saved.payload.game.flags.get("glow_unlocked",false) and saved.payload.game.flags.get("memory_found",false),"Saved flags preserve both memory and useful ability")
    observations={"fixture":"Story prerequisites prepared once; player at (12,0,-11.5), three companions at x11.3/11.8/12.3,z-11.1, age3. Production dialogue, movement, animation, pause and filesystem saving then used unchanged.","first_id":original_id,"approach_frames":approach_frames,"approach_max_frame_step":max_step,"moth_minimum_head_distance":closest,"contact_hold_drift":hold_drift}
    await remove_game();await create_game()
    check(game._start_saved and game.story.has("glow_unlocked") and game.story.has("memory_found"),"Fresh scene reloads the earned memory and ability")
    game._close_modal();await frames(180)
    check(game.companions.size()==4 and game.companions[0].light.light_energy>.02,"Reload reconstructs four companions with a usable retained light")
    await remove_game()
    var ending={}
    for path in hashes:ending[path]=FileAccess.get_sha256("res://scripts/"+path)
    check(hashes==ending,"Frozen runtime source remains unchanged during checks")
    var report={"kind":"Headless prepared-state interruption and continuity checks, not native visual/audio or human validation","source_at_start":hashes,"source_at_end":ending,"checks":checks,"failures":failures,"observations":observations}
    DirAccess.make_dir_recursive_absolute(output)
    var file=FileAccess.open(output.path_join("report.json"),FileAccess.WRITE);file.store_string(JSON.stringify(report,"  "));file.close()
    print(JSON.stringify({"checks":checks.size(),"failures":failures.size(),"observations":observations}))
    quit(0 if failures.is_empty() else 1)
