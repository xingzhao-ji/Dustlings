extends SceneTree
const FOLDER = "/Users/xingzhaoji/Desktop/Dustlings/builds/3d/experiments/dust-distribution"
var game
var variant
var elapsed = 0.0
var stage = 0
var report = {"kind":"Frozen native matched distribution comparison. Four seconds of generated continuous brushing at normal engine time, then labelled50-helper and complete fixtures; no human input or wall-clock performance claim."}
func _initialize(): call_deferred("run")
func run():
	game = load(FOLDER+"/main-frozen.gd").new()
	root.add_child(game)
	game.set_process(false)
	game.set_physics_process(false)
	game.started=true
	game._close_modal()
	variant=load(FOLDER+"/candidate.gd").new()
	variant.configure(game.dust_texture,game.sim.dust)
	game.add_child(variant)
	variant.hide()
	report.baseline_instances=game.dust_feedback.static_instance_count
	report.candidate_instances=variant.static_instance_count
	print("DISTRIBUTION_PID ",OS.get_process_id())
func capture(name): root.get_texture().get_image().save_png(FOLDER+"/"+name+".png")
func _process(delta):
	if game==null or stage>=8:return false
	elapsed+=delta
	game._update_ui()
	if stage==0 and elapsed>.5:
		capture("before")
		report.before_draw_calls=Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME)
		game.dust_feedback.hide();variant.show();stage=1
	elif stage==1 and elapsed>.9:
		capture("after")
		report.after_draw_calls=Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME)
		game._qa_mouse(game.camera.unproject_position(Vector3(-4,0,2)),true)
		stage=2
	if stage==2:
		var p=Vector3(-4+sin((elapsed-.9)*.8)*.35,0,2.0+cos(elapsed*.7)*.20)
		game._qa_mouse(game.camera.unproject_position(p))
		var before=game.sim.stats.brushed
		game._physics_process(delta)
		game._sync_world(delta)
		game._update_ui()
		variant.tick(delta,elapsed,game.sim.stats.brushed-before,p,false)
		if elapsed>4.9:
			game._qa_mouse(game.camera.unproject_position(p),false)
			capture("brushed")
			report.removed_brushed=game.sim.stats.brushed
			report.brush_interval_seconds=4.0
			variant.reset();game.dust_feedback.reset();game._qa_fixture(false)
			stage=3
	elif stage==3 and elapsed>5.3:
		capture("fifty-after")
		report.fifty_after_draw_calls=Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME)
		variant.hide();game.dust_feedback.show();stage=4
	elif stage==4 and elapsed>5.6:
		capture("fifty-before")
		report.fifty_before_draw_calls=Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME)
		game.dust_feedback.hide();variant.show();game._qa_fixture(true);stage=5
	elif stage==5 and elapsed>6.0:
		capture("cleared")
		report.audio_never_started=not game.audio.active
		report.zero_idle_wisps=variant._particles.is_empty() and variant._work_particles.is_empty()
		report.no_collision_nodes=variant.find_children("*","CollisionObject3D",true,false).is_empty()
		stage=8
		finish()
	return false
func finish():
	FileAccess.open(FOLDER+"/render-results.json",FileAccess.WRITE).store_string(JSON.stringify(report,"\t"))
	print(JSON.stringify(report))
	await game.audio.shutdown()
	game.free();game=null;variant=null
	await create_timer(.15).timeout
	quit()
