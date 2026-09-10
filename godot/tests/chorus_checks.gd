extends SceneTree
const Sim = preload("res://scripts/simulation.gd")
var checks: Array = []
var failures: Array = []

func check(value: bool, description: String):
	if value: checks.append(description)
	else: failures.append(description); push_error(description)

func ready_courtyard():
	var sim = Sim.new()
	sim.elapsed = 100
	for i in range(sim.dust.size()): sim.collect(i, 1, "brushed")
	for id in ["brush", "teamwork", "bloom"]: sim.buy(id)
	sim.events.clear()
	return sim

func _init():
	var sim = ready_courtyard()
	check(sim.begin_restoration(), "Prepared courtyard starts the chorus")
	sim.tick(0.1, false, Vector2.INF)
	check(sim.ritual_time == 0 and sim.restoration == 0, "Chorus clock waits while newborn crew has not gathered")
	var first_advance = -1.0
	for frame in range(1000):
		sim.tick(0.1, false, Vector2.INF)
		if sim.restoration > 0 and first_advance < 0: first_advance = sim.elapsed
		if sim.restoration >= 0.5: break
	check(sim.restoration >= 0.5 and sim.restoration < 0.51, "Active new chorus reaches half restoration without finishing")
	var partial = JSON.parse_string(JSON.stringify(sim.serialise()))
	check(partial.version == 1 and partial.ritual_duration == 18, "New version1 save records the18-second duration")
	var loaded = Sim.new()
	check(loaded.restore(partial) and loaded.restoration == partial.restoration and loaded.ritual_time == partial.ritual_time, "Current partial save restores the exact persisted progress and clock")
	for repeat in range(5):
		var copy = Sim.new()
		check(copy.restore(JSON.parse_string(JSON.stringify(loaded.serialise()))), "Repeated interruption checkpoint restores")
		loaded = copy
	check(loaded.restoration == partial.restoration and loaded.ritual_time == partial.ritual_time, "Repeated interruptions do not accumulate progress or timing drift")
	var legacy_results: Array = []
	for fraction in [0.25, 0.5, 0.9]:
		var legacy = partial.duplicate(true)
		legacy.erase("ritual_duration")
		legacy.restoration = fraction
		legacy.ritual_time = fraction * 38.0
		var resumed = Sim.new()
		check(resumed.restore(legacy) and resumed.restoration == fraction and is_equal_approx(resumed.ritual_time, fraction * 18.0), "Legacy38-second partial save retains its visible fraction")
		resumed.tick(0.1, false, Vector2.INF)
		check(resumed.restoration >= fraction and resumed.restoration <= fraction + 0.1 / 18.0 + 0.000001 and not resumed.completed, "Legacy partial save resumes incrementally without jumping to completion")
		legacy_results.append({"saved_fraction": fraction, "after_one_tick": resumed.restoration, "new_duration": resumed.serialise().ritual_duration})
	var interrupted_inactive = partial.duplicate(true)
	interrupted_inactive.ritual = false
	var inactive = Sim.new()
	check(inactive.restore(interrupted_inactive) and inactive.begin_restoration() and is_equal_approx(inactive.ritual_time, inactive.restoration * 18), "Restarting an inactive partial chorus retains restored progress")
	for frame in range(1000):
		if sim.completed: break
		sim.tick(0.1, false, Vector2.INF)
	check(sim.completed and sim.restoration == 1 and sim.ritual_time == 18, "New chorus completes after exactly18 active seconds")
	check(absf(sim.elapsed - first_advance + 0.1 - 18.0) < 0.11, "Gathered fixture reaches completion in18 simulated seconds within one test frame")
	var completed_data = JSON.parse_string(JSON.stringify(sim.serialise()))
	var completed_new = Sim.new()
	check(completed_new.restore(completed_data) and completed_new.completed, "Completed current save remains completed")
	completed_data.erase("ritual_duration")
	completed_data.ritual_time = 38.0
	var completed_old = Sim.new()
	check(completed_old.restore(completed_data) and completed_old.completed and completed_old.restoration == 1 and completed_old.ritual_time == 18, "Completed legacy save stays complete under the new duration")
	completed_old.tick(0.1, false, Vector2.INF)
	check(completed_old.events.is_empty(), "Returning to a completed legacy courtyard does not replay completion events")
	var before_rejection = loaded.serialise()
	for duration in [0, -1, NAN, "18"]:
		var invalid = partial.duplicate(true)
		invalid.ritual_duration = duration
		check(not loaded.restore(invalid), "Invalid duration metadata is rejected")
	check(loaded.serialise() == before_rejection, "Rejected duration metadata leaves current progress unchanged")
	var report = {"kind": "Deterministic new/legacy/interrupted chorus fixtures; no human timing or enjoyment evidence", "source_sha256": FileAccess.get_sha256("res://scripts/simulation.gd"), "duration": Sim.CHORUS_DURATION, "first_progress_at": first_advance, "completed_at": sim.elapsed, "gathered_fixture_active_seconds": sim.elapsed - first_advance + 0.1, "legacy": legacy_results, "checks": checks, "failures": failures}
	var file = FileAccess.open("res://../evidence/3d/chorus-checks.json", FileAccess.WRITE)
	file.store_string(JSON.stringify(report, "  ")); file.close()
	print(JSON.stringify(report))
	quit(0 if failures.is_empty() else 1)
