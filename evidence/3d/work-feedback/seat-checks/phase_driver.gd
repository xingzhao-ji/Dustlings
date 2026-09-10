extends SceneTree
const Sim = preload("res://scripts/simulation.gd")

func _init():
	var output = ""
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--output="): output = arg.trim_prefix("--output=")
	if output.is_empty(): push_error("Explicit isolated --output required"); quit(1); return
	var sim = Sim.new()
	var target = 0
	var milestones = {}
	var previous_upgrades = {}
	var phases: Array = []
	for step in range(15000):
		if sim.dust[target].amount < 0.01 or step % 120 == 0:
			for i in range(sim.dust.size()):
				if sim.dust[i].amount > 0.01: target = i; break
		sim.tick(0.05, step % 100 < 40, sim.dust[target].p)
		for id in ["brush", "teamwork", "bloom"]:
			sim.buy(id)
			if sim.upgrades[id] and not previous_upgrades.has(id):
				previous_upgrades[id] = sim.elapsed
		sim.begin_restoration()
		for threshold in [0.75, 0.90, 0.99, 1.0]:
			if sim.ratio() >= threshold - 0.000001 and not milestones.has(str(threshold)):
				milestones[str(threshold)] = sim.elapsed
		for event in sim.events:
			if event.kind in ["chorus", "restored", "complete"]:
				phases.append({"event": event.kind, "elapsed": sim.elapsed, "cleaned": sim.cleaned, "assisted": sim.stats.assisted, "brushed": sim.stats.brushed, "helpers": sim.crew.size()})
		sim.events.clear()
		if sim.completed: break
	var report = {"kind": "Headless deterministic phase diagnostics of the same 40% brushing fixture; no human timing", "source_sha256": FileAccess.get_sha256("res://scripts/simulation.gd"), "completed": sim.completed, "completed_at": sim.elapsed, "upgrades_at": previous_upgrades, "clean_thresholds_at": milestones, "phases": phases, "stats": sim.stats}
	var file = FileAccess.open(output, FileAccess.WRITE)
	if not file: push_error("Cannot write isolated report"); quit(1); return
	file.store_string(JSON.stringify(report, "  "))
	file.close()
	print(JSON.stringify(report))
	quit(0 if sim.completed else 1)
