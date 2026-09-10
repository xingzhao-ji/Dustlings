extends SceneTree
## Same authored InputEvent route as native capture. Only screenshot commands are
## replaced by one-frame observations; no progress, position or collider injection.
class RouteProbe extends "res://scripts/rpg_qa.gd":
    signal finished(passed:bool)
    var observations=[]
    var source={}
    var gift_contact_seen=false
    var gift_first_id=0
    var gift_min_distance=100.0
    var max_first_step=0.0
    var previous_first=Vector3.INF
    func _ready():
        for file in ["rpg_main.gd","rpg_navigation.gd","rpg_environment.gd","rpg_actor.gd","rpg_story.gd","rpg_qa.gd"]:
            source[file]=FileAccess.get_sha256("res://scripts/"+file)
        super._ready()
        # The native driver's old garden diagonal crosses Nell after she
        # arrives. Walk the same clear north lane used elsewhere in the route.
        for i in commands.size():
            if commands[i].get("move",Vector3.INF)==Vector3(-5.5,0,-8):
                if i==0 or commands[i-1].get("move",Vector3.INF)!=Vector3(-5.5,0,-6.5):
                    commands.insert(i,{"move":Vector3(-5.5,0,-6.5)})
                    commands.insert(i,{"move":Vector3(0,0,-6.5)})
                break
        for i in commands.size():
            if commands[i].get("move",Vector3.INF)==Vector3(2.2,0,-7.4):
                if i==0 or commands[i-1].get("move",Vector3.INF)!=Vector3(2.2,0,-6.5):
                    commands.insert(i,{"move":Vector3(2.2,0,-6.5)})
                    commands.insert(i,{"move":Vector3(-1,0,-6.5)})
                break
    func snapshot(label:String):
        var row={"label":label,"time":total,"player":str(game.player.position),"moth_phase":game.moth_phase,"companions":[],"residents":{}}
        for c in game.companions:
            var body:CharacterBody3D=c.body
            var contacts=[]
            for i in body.get_slide_collision_count():
                var hit=body.get_slide_collision(i);contacts.append({"name":str(hit.get_collider().name),"normal":str(hit.get_normal())})
            row.companions.append({"position":str(body.position),"velocity":str(body.velocity),"path":str(c.path.slice(0,4)),"queue":c.path.size(),"nav_path":str(c.nav_path),"nav_goal":str(c.nav_goal),"player_distance":body.position.distance_to(game.player.position),"contacts":contacts})
        for id in game.residents:
            var r=game.residents[id];var contacts=[]
            for i in r.body.get_slide_collision_count():
                var hit=r.body.get_slide_collision(i);contacts.append({"name":str(hit.get_collider().name),"normal":str(hit.get_normal())})
            row.residents[id]={"position":str(r.body.position),"target":str(r.target),"route":str(r.route),"nav_path":str(r.get("nav_path",[])),"velocity":str(r.body.velocity),"target_distance":r.body.position.distance_to(r.target),"contacts":contacts}
        observations.append(row)
    func _process(delta):
        if not game.companions.is_empty():
            var at:Vector3=game.companions[0].body.position
            if previous_first!=Vector3.INF:max_first_step=maxf(max_first_step,at.distance_to(previous_first))
            previous_first=at
            if game.moth_phase==2:
                gift_contact_seen=true
                gift_first_id=game.companions[0].body.get_instance_id()
                gift_min_distance=minf(gift_min_distance,game.world._moth.global_position.distance_to(at+Vector3(0,.48,0)))
        if not done and index<commands.size() and commands[index].has("capture"):
            snapshot(commands[index].capture)
            commands[index]={"wait":.016667}
        super._process(delta)
    func _finish(ok:bool):
        done=true
        _release()
        snapshot("finish")
        var ending={}
        for file in source:ending[file]=FileAccess.get_sha256("res://scripts/"+file)
        var additional={"earned_route_completed":ok,"first_companion_received_moth":gift_contact_seen and gift_min_distance<.08,"mara_arrived_shared_table":game.story.has("shared_table") and game.residents.mara.body.position.distance_to(game.residents.mara.target)<.25,"source_unchanged":source==ending,"first_companion_no_position_warp":max_first_step<.12,"all_four_finish_near_player_without_backlog":game.companions.size()==4 and game.companions.all(func(c):return c.body.position.distance_to(game.player.position)<3 and c.path.is_empty())}
        var file=FileAccess.open(game.qa_output.path_join("route-observations.json"),FileAccess.WRITE)
        file.store_string(JSON.stringify({"method":"Headless fixed60Hz authored InputEvents from the native route; screenshot commands replaced by observations only. No state/position/collision injection. Not human testing or native performance.","source":source,"ending_source":ending,"checks":additional,"max_first_frame_step":max_first_step,"gift_min_distance":gift_min_distance,"gift_first_id":gift_first_id,"observations":observations},"  "));file.close()
        results.ok=ok and additional.values().all(func(value):return value)
        results.method="Headless earned InputEvent route with explicit garden/Ivo walking detours; captures replaced by observations. No position/progress injection."
        results.elapsed_engine_seconds=total
        results.story=game.story.export_state()
        results.companion_distances=game.companions.map(func(c):return c.body.position.distance_to(game.player.position))
        file=FileAccess.open(game.qa_output.path_join("results.json"),FileAccess.WRITE);file.store_string(JSON.stringify(results,"  "));file.close()
        print(JSON.stringify({"ok":results.ok,"steps":index,"checks":additional,"seconds":total}))
        finished.emit(results.ok)
func _init():call_deferred("run")
func run():
    root.size=Vector2i(1280,800);root.content_scale_size=Vector2i(1280,800)
    var game=load("res://scenes/neighborhood.tscn").instantiate();root.add_child(game)
    if game.get_script()==null:
        push_error("Neighborhood failed to load its runtime script; route did not start.")
        quit(1)
        return
    for i in 5:await process_frame
    var driver=RouteProbe.new();driver.game=game;driver.finished.connect(func(passed):finish_game(game,passed));game.add_child(driver)
func finish_game(game,passed:bool):
    await game.audio.shutdown()
    if AudioServer.get_driver_name()=="Dummy":OS.delay_msec(650)
    game.queue_free()
    for i in 5:await process_frame
    quit(0 if passed else 1)
