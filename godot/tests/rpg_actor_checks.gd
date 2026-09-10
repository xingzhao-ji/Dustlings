extends SceneTree
const Actor=preload("res://scripts/rpg_actor.gd")
var checks=[]
var failures=[]
var measures=[]
func check(ok: bool,name: String,details: Dictionary={}):
    var item={"check":name,"ok":ok,"details":details}
    if ok:checks.append(item)
    else:failures.append(item);push_warning(name)
func _init():call_deferred("run")
func actor(kind: String):
    var a=Actor.new();root.add_child(a);a.configure(kind);return a
func run():
    for kind in ["player","mara","ivo","nell","tavi"]:
        var a=actor(kind)
        check(a._feet.size()==2 and a._legs.size()==2 and a._eyes.size()==2,"Preserve coherent two-foot/two-eye identity: "+kind)
        a.queue_free()
    await process_frame
    var initial=actor("player")
    initial.rotation.y=PI
    for frame in 300:initial.animate(1.0/60.0,0)
    check(initial._feet[0].position.distance_to(Vector3(-.125,0,0))<.001 and initial._feet[1].position.distance_to(Vector3(.125,0,0))<.001,"Root's post-build half-turn preserves parallel stationary boots",{"left":str(initial._feet[0].position),"right":str(initial._feet[1].position)})
    check(initial.get_hand_position().distance_to(initial._right_arm.get_node("HandShape").global_position)<.0001 and initial.get_hand_position(false).distance_to(initial._left_arm.get_node("HandShape").global_position)<.0001,"Hand hook returns the actual posed hand centers")
    initial.queue_free()
    for speed in [.85,1.6,2.6]:
        var a=actor("player")
        var last=[a._feet[0].global_position,a._feet[1].global_position]
        var was=[true,true]
        var max_stance_drift=0.0
        var max_step=0.0
        var lowest=0.0
        var lowest_sole=0.0
        var max_extension=0.0
        var contacts=0
        for frame in 360:
            a.position.z+=speed/60.0
            a.animate(1.0/60.0,speed)
            for i in 2:
                var foot: Node3D=a._feet[i]
                if frame>90 and a._was_stance[i] and was[i] and foot.position.y<.001:
                    max_stance_drift=maxf(max_stance_drift,Vector2(foot.global_position.x-last[i].x,foot.global_position.z-last[i].z).length());contacts+=1
                max_step=maxf(max_step,foot.global_position.distance_to(last[i]))
                lowest=minf(lowest,foot.position.y)
                var boot: Node3D=foot.get_node("BootShape")
                var extent=.5*Vector3(boot.global_basis.x.y,boot.global_basis.y.y,boot.global_basis.z.y).length()
                lowest_sole=minf(lowest_sole,boot.global_position.y-extent)
                max_extension=maxf(max_extension,Vector2(foot.position.x,foot.position.z).length())
                last[i]=foot.global_position;was[i]=a._was_stance[i]
        var values={"speed":speed,"max_stance_drift_m":max_stance_drift,"max_frame_foot_step_m":max_step,"minimum_foot_origin_y":lowest,"minimum_boot_ellipsoid_y":lowest_sole,"max_horizontal_extension_m":max_extension,"sampled_planted_frames":contacts}
        measures.append(values)
        check(max_stance_drift<.0001 and contacts>180,"Steady planted feet cancel actual travel at "+str(speed)+"m/s",values)
        check(lowest>=-.0001 and lowest_sole>=-.0001 and max_extension<.65 and max_step<.24,"Steady gait keeps grounded soles and bounded limb travel at "+str(speed)+"m/s",values)
        for frame in 30:a.animate(1.0/60.0,0)
        check(a._feet[0].position.y<.001 and a._feet[1].position.y<.001,"Interrupted stride settles both boots at "+str(speed)+"m/s")
        var previous=[a._feet[0].global_position,a._feet[1].global_position]
        for frame in 30:a.animate(1.0/60.0,0)
        check(a._feet[0].global_position.distance_to(previous[0])<.001 and a._feet[1].global_position.distance_to(previous[1])<.001,"Stopped boots remain still at "+str(speed)+"m/s")
        a.queue_free()
    await process_frame
    var turn=actor("player")
    var maximum_turn_step=0.0
    var minimum_turn_y=0.0
    var last=[turn._feet[0].global_position,turn._feet[1].global_position]
    for frame in 240:
        if frame%40==0:turn.rotation.y+=PI
        turn.position+=turn.basis*Vector3(0,0,2.6/60.0)
        turn.animate(1.0/60.0,2.6)
        for i in 2:
            maximum_turn_step=maxf(maximum_turn_step,turn._feet[i].global_position.distance_to(last[i]));minimum_turn_y=minf(minimum_turn_y,turn._feet[i].position.y)
            last[i]=turn._feet[i].global_position
    check(minimum_turn_y>=-.0001 and maximum_turn_step<.35,"Rapid reversals avoid floor penetration or whole-foot jumps",{"max_frame_step_m":maximum_turn_step,"min_y":minimum_turn_y})
    turn.position=Vector3(12,0,-11)
    turn.animate(1.0/60.0,0)
    check(turn._feet[0].position.length()<.3 and turn._feet[1].position.length()<.3,"Save relocation reseeds contacts without stretched limbs")
    turn.queue_free()
    var ivo=actor("ivo");ivo.set_activity("map")
    var max_grip=0.0
    var right_grip=0.0
    var invalid_map_frames=[]
    for frame in 240:
        var speaking=frame>=60 and frame<180
        if frame==45:ivo.set_attention(ivo.global_position+Vector3(.8,1.3,2),1)
        if frame==180:ivo.clear_attention()
        ivo.animate(1.0/60.0,0,speaking)
        var map: Node3D=ivo._activity_props.map
        max_grip=maxf(max_grip,ivo._map_grip_error)
        if not map.visible or map.scale!=Vector3.ONE:invalid_map_frames.append(frame)
        if frame==30:
            var hand=ivo._right_arm.position+ivo._right_arm.basis*Vector3(.025,-.41,.017)
            right_grip=hand.distance_to(map.position+map.basis*Vector3(.215,0,0))
    check(invalid_map_frames.is_empty(),"Map remains full-size and visible throughout 240-frame encounter",{"invalid_frames":invalid_map_frames})
    check(max_grip<.0001 and right_grip<.025,"Ivo's left support grip stays attached and idle right grip touches map",{"max_left_grip_error_m":max_grip,"idle_right_grip_error_m":right_grip})
    check(ivo._head.rotation.x>.15,"Ivo deliberately returns attention to map after conversation")
    ivo.set_gentle_motion(true);ivo.animate(.016,0,true)
    check(ivo._activity_props.map.visible,"Gentle motion preserves Ivo's held object")
    ivo.queue_free();await process_frame
    var report={"kind":"Headless pose/transform checks with explicit actor translation, not native motion or aesthetic/human approval","source_sha256":FileAccess.get_sha256("res://scripts/rpg_actor.gd"),"checks":checks,"failures":failures,"measurements":measures}
    DirAccess.make_dir_recursive_absolute("res://../evidence/rpg/actor")
    var file=FileAccess.open("res://../evidence/rpg/actor/pose-checks.json",FileAccess.WRITE);file.store_string(JSON.stringify(report,"  "));file.close()
    print(JSON.stringify({"checks":checks.size(),"failures":failures.size(),"measurements":measures}))
    quit(0 if failures.is_empty() else 1)
