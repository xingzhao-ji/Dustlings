extends SceneTree
var game
var feedback
var elapsed = 0.0
var stage = 0
var report = {"kind":"Frozen native dust-feedback comparison; controlled accelerated brushing and50-helper/end fixtures, not human play or pacing", "checks": []}
func _init(): call_deferred("run")
func run():
    game = load("/tmp/dustlings-dust-main.gd").new()
    root.add_child(game)
    game._start()
    game.paused = true
    game.audio.set_paused(true)
    feedback = load("res://scripts/dust_feedback.gd").new()
    feedback.configure(game.dust_texture,game.sim.dust)
    game.add_child(feedback)
    feedback.hide()
    report.static_instances = feedback.static_instance_count
    report.checks.append({"no_collision_nodes":feedback.find_children("*","CollisionObject3D",true,false).is_empty(), "initial_particles":feedback._particles.size()})
    print("DUST_REVIEW_PID ", OS.get_process_id())
func capture(name):
    root.get_texture().get_image().save_png("/tmp/dustlings-dust-"+name+".png")
func _process(delta):
    if game == null or stage >= 7: return false
    elapsed += delta
    if stage == 0 and elapsed > 0.5:
        capture("before")
        report.baseline_draw_calls = Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME)
        feedback.show()
        stage = 1
    elif stage == 1 and elapsed > 1.25:
        capture("after")
        report.variant_draw_calls = Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME)
        report.variant_primitives = Performance.get_monitor(Performance.RENDER_TOTAL_PRIMITIVES_IN_FRAME)
        stage = 2
    if stage == 2 and elapsed < 4.5:
        var p = Vector3(-3.8 + sin(elapsed * 1.5) * 0.3, 0, 2.0 + cos(elapsed) * 0.25)
        var before = game.sim.stats.brushed
        game.sim.tick(minf(0.1, delta * 3),true,Vector2(p.x,p.z))
        game._sync_world(delta)
        game._update_ui()
        feedback.tick(delta,elapsed,game.sim.stats.brushed-before,p,false)
    elif stage == 2:
        feedback.tick(delta,elapsed,0,Vector3.ZERO,false)
        if elapsed > 4.95:
            capture("brushed")
            report.removed_brushed = game.sim.stats.brushed
            report.checks.append({"idle_response_after_settle":feedback._particles.size()})
            game._qa_fixture(false)
            feedback.reset()
            stage = 3
    elif stage == 3 and elapsed > 5.4:
        capture("fifty")
        report.fifty_draw_calls = Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME)
        for i in 40: feedback.tick(0.01,elapsed,1,Vector3(-3.8,0,2),false)
        report.checks.append({"normal_cap":feedback._particles.size() <= 32})
        feedback.reset()
        for i in 40: feedback.tick(0.01,elapsed,1,Vector3(-3.8,0,2),true)
        report.checks.append({"gentle_cap":feedback._particles.size() <= 8})
        feedback.reset()
        game._qa_fixture(true)
        stage = 4
    elif stage == 4 and elapsed > 5.8:
        capture("cleared")
        stage = 7
        finish()
    return false
func finish():
    feedback.reset()
    report.checks.append({"reset_particles":feedback._particles.size(),"brush_wisp_nodes":feedback._brush_wisps.multimesh.visible_instance_count})
    FileAccess.open("/tmp/dustlings-dust-review.json",FileAccess.WRITE).store_string(JSON.stringify(report,"\t"))
    print(JSON.stringify(report))
    await game.audio.shutdown()
    game.free()
    game = null
    feedback = null
    await create_timer(0.2).timeout
    quit()
