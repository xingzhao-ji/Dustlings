extends SceneTree
const CurrentSim = preload("res://scripts/simulation.gd")
var failures: Array = []

func _init():
	var simulation_script = CurrentSim
	var output = "res://../builds/3d/crowd-checks.json"
	var baseline = false
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--baseline="): simulation_script = load(arg.trim_prefix("--baseline=")); baseline = true
		if arg.begins_with("--output="): output = arg.trim_prefix("--output=")
	if not simulation_script: push_error("Missing simulation fixture"); quit(1); return
	var cases: Array = []
	for count in [5, 50]:
		for teamwork in [false, true]:
			cases.append(run_case(simulation_script, count, teamwork))
	var route_sim = simulation_script.new()
	var bad_routes: Array = []
	var side = 0.24 if baseline else CurrentSim.PAIR_OFFSET
	for d in route_sim.dust:
		for offset in [Vector2(0, 0.15), Vector2(-side, 0.12), Vector2(side, 0.12)]:
			for start in [Vector2(-6.8, -3.6), Vector2(6.8, -3.6), Vector2(-6.8, 4.2), Vector2(6.8, 4.2)]:
				var c = {"p": start, "speed": 0.0, "direction": 0.0}
				for step in range(2400):
					route_sim.move(c, d.p + offset, 0.025, 1.02)
					if c.p.distance_to(d.p) < 0.54: break
				if c.p.distance_to(d.p) >= 0.54: bad_routes.append({"dust": d.p, "end": c.p})
	if not bad_routes.is_empty(): failures.append("Required dust routes blocked")
	var report = {"kind": "Deterministic 5/50-helper travel/work fixtures; no human review", "baseline": baseline, "source_sha256": FileAccess.get_sha256(simulation_script.resource_path), "cases": cases, "route_count": route_sim.dust.size() * 12, "failed_routes": bad_routes, "failures": failures}
	var file = FileAccess.open(output, FileAccess.WRITE)
	if file: file.store_string(JSON.stringify(report, "  ")); file.close()
	print(JSON.stringify(report))
	quit(0 if baseline or failures.is_empty() else 1)

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
	return {"initial_helpers": count, "final_helpers": sim.crew.size(), "teamwork": teamwork, "seconds": 45, "minimum_distance_m": min_distance, "minimum_travel_distance_m": min_travel, "minimum_work_distance_m": min_work, "maximum_speed_m_s": max_speed, "invalid_positions": invalid_positions, "arrived": arrived, "working_frames": working_frames, "assisted": sim.stats.assisted - assisted_before, "average_simulation_tick_ms": tick_usec / 2700000.0}
