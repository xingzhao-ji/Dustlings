extends SceneTree
const Sim = preload("res://scripts/simulation.gd")
const Feedback = preload("res://scripts/dust_feedback.gd")
var checks: Array = []
var failures: Array = []
func check(value: bool, label: String):
	if value: checks.append(label)
	else: failures.append(label); push_error(label)
func _initialize(): call_deferred("run")
func run():
	var sim = Sim.new()
	for i in 800:
		sim.tick(0.05, true, Vector2(-5, 2))
		if sim.crew.size() == 1: break
	var image = Image.create(29, 18, false, Image.FORMAT_RF)
	image.fill(Color(1, 0, 0))
	var texture = ImageTexture.create_from_image(image)
	var feedback = Feedback.new()
	feedback.configure(texture, sim.dust)
	root.add_child(feedback)
	await process_frame
	var contributed = 0.0
	var before = sim.stats.assisted
	var peak = 0
	for step in 400:
		sim.tick(0.05, false, Vector2.ZERO)
		var samples: Array = []
		for c in sim.crew:
			contributed += c.assisted
			if c.assisted > 0: samples.append({"id": c.id, "removed": c.assisted, "strength": 1.0, "point": Vector3(c.p.x, 0, c.p.y)})
		feedback.tick(0.05, sim.elapsed, 0, Vector3.ZERO, false, samples)
		peak = maxi(peak, feedback._work_particles.size())
	check(contributed > 0.12 and absf(contributed - (sim.stats.assisted - before)) < 0.0000001, "Per-helper activity equals actual passive removal, with no rate or currency contribution from presentation")
	check(peak > 0 and peak <= Feedback.MAX_WORK_WISPS, "Actual first-helper assistance can produce a bounded local dust response")
	var saved = sim.serialise()
	var loaded = Sim.new()
	check(loaded.restore(JSON.parse_string(JSON.stringify(saved))) and not saved.crew[0].has("assisted"), "Transient work feedback stays outside the established save payload")
	for i in 30: feedback.tick(0.05, 0, 0, Vector3.ZERO, false)
	check(feedback._work_particles.is_empty() and feedback._work_credit.is_empty(), "Idle feedback drains and cannot spend stale work credit")
	for i in 50: feedback.tick(0.05, 0, 0, Vector3.ZERO, false, [{"id": 0, "removed": 0.0, "strength": 1.0, "point": Vector3(-5, 0, 2)}])
	check(feedback._work_particles.is_empty(), "A working-looking pose without actual removed dust emits nothing")
	var crowd: Array = []
	for i in 50: crowd.append({"id": i, "removed": 0.02, "strength": 1.0, "point": Vector3(-5 + (i % 10) * 0.4, 0, 2 + floorf(i / 10.0) * 0.2)})
	for i in 30: feedback.tick(0.05, 0, 0, Vector3.ZERO, false, crowd)
	check(feedback._work_particles.size() <= Feedback.MAX_WORK_WISPS and feedback._work_wisps.multimesh.instance_count == Feedback.MAX_WORK_WISPS, "Fifty simultaneous contacts stay within one fixed forty-instance work batch")
	for i in 30: feedback.tick(0.05, 0, 0, Vector3.ZERO, true, crowd)
	check(feedback._work_particles.size() <= Feedback.MAX_GENTLE_WORK_WISPS, "Gentle motion limits work response to ten low-lift particles")
	feedback.reset()
	check(feedback._work_particles.is_empty() and feedback._work_credit.is_empty() and feedback._work_wisps.multimesh.visible_instance_count == 0, "Reset hides particles and clears activity credit for returning or loading")
	var report = {"kind": "Headless simulation and bounded presentation checks; not rendered appearance, human clarity or enjoyment.", "checks": checks, "failures": failures, "passive_assistance": contributed, "sources": {"simulation": FileAccess.get_sha256("res://scripts/simulation.gd"), "feedback": FileAccess.get_sha256("res://scripts/dust_feedback.gd")}}
	var file = FileAccess.open("res://../evidence/3d/work-feedback/checks.json", FileAccess.WRITE)
	file.store_string(JSON.stringify(report, "  ")); file.close()
	print(JSON.stringify(report))
	feedback.free()
	quit(0 if failures.is_empty() else 1)
