extends SceneTree
const CurrentSim = preload("res://scripts/simulation.gd")
var failures: Array = []

func _init():
	var output = ""
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--output="): output = arg.trim_prefix("--output=")
	if output.is_empty(): push_error("Explicit isolated --output required"); quit(1); return
	var cases: Array = []
	for count in [5, 50]:
		for teamwork in [false, true]: cases.append(run_case(CurrentSim, count, teamwork))
	var report = {"kind": "Isolated deterministic 5/50-helper travel/work fixtures; no visual or human acceptance", "source_sha256": FileAccess.get_sha256("res://scripts/simulation.gd"), "cases": cases, "route_coverage": "Separate simulation_driver.gd tests all5904 actual _work_position seats; no approximate offsets in this crowd driver.", "failures": failures}
	var file = FileAccess.open(output, FileAccess.WRITE)
	if not file: push_error("Cannot write isolated report"); quit(1); return
	file.store_string(JSON.stringify(report, "  "))
	file.close()
	print(JSON.stringify(report))
	quit(0 if failures.is_empty() else 1)

func run_case(script: GDScript, count: int, teamwork: bool) -> Dictionary:
	var sim = script.new()
	sim.elapsed = 50
	for i in range(count * 7): sim.collect(i, 1.0, "brushed")
	sim.upgrades.teamwork = teamwork
	for c in sim.crew:
		c.p = Vector2(-6.2 + (c.id % 5) * 0.66, -3.25 + floorf(c.id / 5.0) * 0.66)
		c.born = 0
	sim.direct(Vector2(5.5, 2.5))
	var min_distance = INF
	var min_travel = INF
	var min_work = INF
	var max_speed = 0.0
	var invalid_positions = 0
	var working_frames = 0
	var arrived = false
	var tick_usec = 0
	var assisted_before = sim.stats.assisted
	for frame in range(2700):
		var start = Time.get_ticks_usec()
		sim.tick(1.0 / 60.0, false, Vector2.INF)
		tick_usec += Time.get_ticks_usec() - start
		sim.events.clear()
		for c in sim.crew:
			if not sim.walkable(c.p, 0.22): invalid_positions += 1
			max_speed = maxf(max_speed, c.speed)
			if c.work > 0: working_frames += 1
			if c.p.x > 4.0: arrived = true
		for i in range(sim.crew.size()):
			for j in range(i + 1, sim.crew.size()):
				var a = sim.crew[i]
				var b = sim.crew[j]
				var distance = a.p.distance_to(b.p)
				min_distance = minf(min_distance, distance)
				if a.speed > 0.15 or b.speed > 0.15: min_travel = minf(min_travel, distance)
				if a.work > 0 and b.work > 0: min_work = minf(min_work, distance)
	var name = str(count) + (" paired" if teamwork else " solo")
	if min_distance < 0.50: failures.append(name + " bodies overlap")
	if invalid_positions > 0: failures.append(name + " left walkable ground")
	if not arrived or working_frames == 0 or sim.stats.assisted <= assisted_before: failures.append(name + " did not reach and clean assigned area")
	if max_speed > 1.7: failures.append(name + " jumped instead of walking")
	# Regression floor for the measured overlapping-seat queue (8.88 motes/45s),
	# deliberately below the corrected33.99 result; not a player pacing target.
	if count == 50 and teamwork and sim.stats.assisted - assisted_before < 25.0:
		failures.append(name + " physical work reservations caused a long queue")
	return {"initial_helpers": count, "final_helpers": sim.crew.size(), "teamwork": teamwork, "seconds": 45, "minimum_distance_m": min_distance, "minimum_travel_distance_m": min_travel, "minimum_work_distance_m": min_work, "maximum_speed_m_s": max_speed, "invalid_positions": invalid_positions, "arrived": arrived, "working_frames": working_frames, "assisted": sim.stats.assisted - assisted_before, "average_simulation_tick_ms": tick_usec / 2700000.0}
