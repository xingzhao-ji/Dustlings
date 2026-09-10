extends SceneTree
const Sim = preload("res://scripts/simulation.gd")
var checks: Array = []
var failures: Array = []

func check(value: bool, description: String):
	if value: checks.append(description)
	else: failures.append(description); push_error(description)

func _init():
	var sim = Sim.new()
	check(sim.dust.size() > 400 and sim.dust.size() < 550, "Compact courtyard contains a reachable dust field")
	var bad_routes: Array = []
	for d in sim.dust:
		for seat in ["solo", "paired-left", "paired-right"]:
			sim.upgrades.teamwork = seat != "solo"
			var goal = sim._work_position(d.p, 1 if seat == "paired-right" else 0)
			for start in [Vector2(-6.8, -3.6), Vector2(6.8, -3.6), Vector2(-6.8, 4.2), Vector2(6.8, 4.2)]:
				var c = {"p": start, "speed": 0.0, "direction": 0.0}
				for step in range(2400):
					sim.move(c, goal, 0.025, 1.02)
					if c.p.distance_to(d.p) < 0.54: break
				if c.p.distance_to(d.p) >= 0.54: bad_routes.append({"dust": d.p, "seat": seat, "goal": goal, "start": start, "end": c.p})
	sim.upgrades.teamwork = false
	check(bad_routes.is_empty(), "All actual solo/paired work seats and four approach corners reach cleaning range")
	var first_upgrade = -1.0
	var target = 0
	for step in range(15000):
		if sim.dust[target].amount < 0.01 or step % 120 == 0:
			for i in range(sim.dust.size()):
				if sim.dust[i].amount > 0.01: target = i; break
		sim.tick(0.05, step % 100 < 40, sim.dust[target].p)
		for id in ["brush", "teamwork", "bloom"]: sim.buy(id)
		if sim.first_upgrade_at >= 0: first_upgrade = sim.first_upgrade_at
		sim.begin_restoration()
		sim.events.clear()
		if sim.completed: break
	check(sim.first_helper_at >= 0 and sim.first_helper_at < 30, "40% brush-duty fixture forms first helper within the 30-second hypothesis")
	check(first_upgrade > 0 and first_upgrade < 300, "Controlled fixture reaches meaningful upgrade under five minutes")
	check(sim.completed and sim.crew.size() == 50, "Normal simulation step completes all dust and fountain with 50 helpers")
	var data = sim.serialise()
	var loaded = Sim.new()
	check(loaded.restore(JSON.parse_string(JSON.stringify(data))) and loaded.completed, "Completed 3D save round-trips through JSON")
	var impossible = data.duplicate(true)
	impossible.dust[0] = 1
	check(not loaded.restore(impossible), "Inconsistent currency / completion save is rejected atomically")
	var bad_number = data.duplicate(true)
	bad_number.crew[0].x = NAN
	check(not loaded.restore(bad_number), "Non-finite creature position is rejected")
	var locked = Sim.new()
	locked.motes = 1000
	check(not locked.buy("bloom"), "Chorus requires both earlier capabilities")
	check(not locked.direct(Vector2.ZERO) and not locked.begin_restoration(), "Blocked/no-crew orders and premature restoration are rejected")
	var report = {"engine": Engine.get_version_info(), "kind": "Deterministic automated3D simulation fixtures; no human pacing or enjoyment evidence.", "source_sha256": FileAccess.get_sha256("res://scripts/simulation.gd"), "route_method": "Actual _work_position for solo and both paired seats, including boundary/fountain projection", "chorus_duration": Sim.CHORUS_DURATION, "dust_count": sim.dust.size(), "route_count": sim.dust.size() * 12, "failed_routes": bad_routes, "checks": checks, "failures": failures, "pacing": {"first_helper": sim.first_helper_at, "first_upgrade": first_upgrade, "completed_at": sim.elapsed, "brush_duty": 0.4}}
	var file = FileAccess.open("res://../evidence/3d/simulation-checks.json", FileAccess.WRITE)
	file.store_string(JSON.stringify(report, "  "))
	file.close()
	print(JSON.stringify(report))
	quit(0 if failures.is_empty() else 1)
