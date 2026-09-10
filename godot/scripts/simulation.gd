class_name CourtyardSimulation
extends RefCounted

const COSTS = {"brush": 32, "teamwork": 32, "bloom": 58}
const FOUNTAIN_RADIUS = 1.45
var dust: Array = []
var crew: Array = []
var upgrades = {"brush": false, "teamwork": false, "bloom": false}
var motes = 0
var earned = 0
var cleaned = 0.0
var elapsed = 0.0
var restoration = 0.0
var ritual = false
var ritual_time = 0.0
var completed = false
var assignment = Vector2.INF
var first_helper_at = -1.0
var first_upgrade_at = -1.0
var events: Array = []
var stats = {"brushed": 0.0, "assisted": 0.0, "orders": 0}

func _init():
	var rng = RandomNumberGenerator.new()
	rng.seed = 617
	for z in range(18):
		for x in range(29):
			var p = Vector2(-7.0 + x * 0.5, -3.85 + z * 0.48) + Vector2(rng.randf_range(-0.10, 0.10), rng.randf_range(-0.08, 0.08))
			if walkable(p, 0.08):
				dust.append({"p": p, "amount": 1.0, "seed": rng.randf()})

func walkable(p: Vector2, margin = 0.0) -> bool:
	return p.x >= -7.3 + margin and p.x <= 7.3 - margin and p.y >= -4.1 + margin and p.y <= 4.7 - margin and p.length() >= FOUNTAIN_RADIUS + margin

func brush_radius() -> float:
	return 1.28 if upgrades.brush else 0.88

func ratio() -> float:
	return cleaned / float(dust.size())

func collect(index: int, amount: float, source: String):
	var d = dust[index]
	var removed = minf(d.amount, maxf(0.0, amount))
	d.amount = maxf(0, d.amount - removed)
	cleaned += removed
	stats[source] += removed
	var fresh = int(floor(cleaned + 0.00001)) - earned
	if fresh > 0:
		earned += fresh
		motes += fresh
	while crew.size() < mini(50, int(floor((cleaned + 0.00001) / 7.0))):
		var id = crew.size()
		var p = d.p
		if p.length() < 1.72:
			p = p.normalized() * 1.72
		crew.append({"id": id, "p": p, "target": -1, "born": elapsed, "direction": 0.0, "work": 0.0, "speed": 0.0})
		events.append({"kind": "birth", "p": p, "first": id == 0})
		if id == 0: first_helper_at = elapsed

func buy(id: String) -> bool:
	if not COSTS.has(id) or upgrades[id] or motes < COSTS[id]: return false
	if id == "bloom" and not (upgrades.brush and upgrades.teamwork): return false
	motes -= COSTS[id]
	upgrades[id] = true
	if first_upgrade_at < 0: first_upgrade_at = elapsed
	for c in crew: c.target = -1
	events.append({"kind": "upgrade", "id": id})
	return true

func direct(p: Vector2) -> bool:
	if crew.is_empty() or ritual or not walkable(p, 0.22): return false
	assignment = p
	stats.orders += 1
	for c in crew: c.target = -1
	events.append({"kind": "assign", "p": p})
	return true

func release():
	assignment = Vector2.INF
	for c in crew: c.target = -1

func begin_restoration() -> bool:
	if not upgrades.bloom or ratio() < 0.75 or ritual or restoration >= 1: return false
	ritual = true
	ritual_time = 0
	release()
	events.append({"kind": "chorus"})
	return true

func choose_target(c: Dictionary) -> int:
	if upgrades.teamwork and c.id % 2 == 1:
		var lead = crew[c.id - 1]
		if lead.target >= 0 and dust[lead.target].amount > 0.00001: return lead.target
	var best = -1
	var score = INF
	var anchor = c.p if assignment == Vector2.INF else assignment
	for i in range(dust.size()):
		if dust[i].amount <= 0.00001: continue
		var occupied = 0
		for other in crew:
			if other.target == i: occupied += 1
		var value = dust[i].p.distance_to(anchor) + occupied * (0.5 if upgrades.teamwork else 0.7)
		if assignment != Vector2.INF: value += dust[i].p.distance_to(c.p) * 0.1
		if value < score:
			score = value
			best = i
	return best

func move(c: Dictionary, goal: Vector2, delta: float, speed: float) -> float:
	var target_distance = c.p.distance_to(goal)
	var clearance = 1.76
	var orbit = 1.91
	if c.p.length() < clearance: c.p = c.p.normalized() * clearance if c.p.length() > 0.001 else Vector2(0, clearance)
	goal = goal.clamp(Vector2(-7.0, -3.8), Vector2(7.0, 4.4))
	if goal.length() < clearance + 0.03: goal = goal.normalized() * (clearance + 0.03) if goal.length() > 0.001 else Vector2(0, clearance + 0.03)
	var direction = goal - c.p
	var distance = direction.length()
	if distance < 0.02:
		c.speed = 0.0
		return target_distance
	var nearest = clampf(-c.p.dot(direction) / (distance * distance), 0.0, 1.0)
	if (c.p + direction * nearest).length() < clearance:
		var from_angle = c.p.angle()
		var turn = wrapf(goal.angle() - from_angle, -PI, PI)
		var a = from_angle + signf(turn if absf(turn) > 0.0001 else 1.0) * minf(0.28, absf(turn))
		goal = Vector2(cos(a), sin(a)) * orbit
		direction = goal - c.p
		distance = direction.length()
	var step = minf(distance, speed * delta)
	var next = c.p + direction.normalized() * step
	if next.length() < clearance: next = next.normalized() * clearance
	c.speed = step / maxf(delta, 0.0001)
	c.p = next.clamp(Vector2(-7.0, -3.8), Vector2(7.0, 4.4))
	c.direction = atan2(direction.x, direction.y)
	return target_distance

func tick(delta: float, brushing: bool, brush_point: Vector2):
	delta = clampf(delta, 0, 0.1)
	elapsed += delta
	if brushing and not completed and not ritual and walkable(brush_point):
		var targets: Array = []
		var total_weight = 0.0
		for i in range(dust.size()):
			var distance = dust[i].p.distance_to(brush_point)
			if dust[i].amount > 0 and distance < brush_radius():
				var weight = 1.0 - distance / (brush_radius() + 0.2)
				targets.append([i, weight])
				total_weight += weight
		for t in targets: collect(t[0], (1.148 if upgrades.brush else 0.85) * delta * t[1] / total_weight, "brushed")
	var remaining = 1.0 - ratio()
	for c in crew:
		c.work = 0.0
		c.speed = 0.0
		if elapsed - c.born < 0.8: continue
		if ritual or completed:
			var ring = c.id % 2
			var count = ceili((crew.size() - ring) / 2.0)
			var a = floorf(c.id / 2.0) / maxf(1, count) * TAU + ring * 0.13
			var radius = 2.25 if ring == 0 else 3.15
			c.work = 1.0 if move(c, Vector2(cos(a), sin(a)) * radius, delta, 1.05) < 0.12 else 0.0
			continue
		if c.target < 0 or dust[c.target].amount <= 0.00001: c.target = choose_target(c)
		if c.target >= 0:
			var d = dust[c.target]
			var offset = Vector2(0.24 if c.id % 2 == 1 else -0.24, 0.12) if upgrades.teamwork else Vector2(0, 0.15)
			var distance = move(c, d.p + offset, delta, 1.02 if upgrades.teamwork else 0.86)
			if c.p.distance_to(d.p) < 0.54:
				c.work = 1.0
				collect(c.target, delta * (0.0245 if upgrades.teamwork else 0.014) * (3.0 if remaining < 0.06 else 1.0), "assisted")
	if ritual:
		var gathered = 0
		for c in crew:
			if c.work > 0: gathered += 1
		if gathered >= mini(12, crew.size()) * 0.8:
			ritual_time += delta
			restoration = minf(1.0, ritual_time / 38.0)
		if restoration >= 1.0:
			ritual = false
			for c in crew: c.target = -1
			events.append({"kind": "restored"})
	if not crew.is_empty() and remaining < 0.015 and not ritual:
		for i in range(dust.size()):
			if dust[i].amount > 0: collect(i, delta * 0.08, "assisted")
	if cleaned >= dust.size() - 0.0001 and restoration >= 1 and not completed:
		completed = true
		events.append({"kind": "complete"})

func serialise() -> Dictionary:
	var amounts: Array = []
	for d in dust: amounts.append(d.amount)
	var creatures: Array = []
	for c in crew: creatures.append({"x": c.p.x, "z": c.p.y, "born": c.born, "direction": c.direction})
	return {"format": "dustlings-3d", "version": 1, "dust": amounts, "crew": creatures, "upgrades": upgrades.duplicate(), "motes": motes, "earned": earned, "elapsed": elapsed, "restoration": restoration, "ritual": ritual, "ritual_time": ritual_time, "completed": completed, "first_helper_at": first_helper_at, "first_upgrade_at": first_upgrade_at, "assignment": [] if assignment == Vector2.INF else [assignment.x, assignment.y], "stats": stats.duplicate()}

func restore(data: Variant) -> bool:
	if not data is Dictionary or data.get("format") != "dustlings-3d" or data.get("version") != 1: return false
	if not data.get("dust") is Array or data.dust.size() != dust.size(): return false
	if not data.get("crew") is Array or data.crew.size() > 50: return false
	var total = 0.0
	for amount in data.dust:
		if not (amount is float or amount is int) or not is_finite(amount) or amount < 0 or amount > 1: return false
		total += 1 - amount
	if data.crew.size() != mini(50, int(floor((total + 0.00001) / 7.0))): return false
	if not data.get("upgrades") is Dictionary: return false
	var spent = 0
	for id in COSTS:
		if not data.upgrades.get(id) is bool: return false
		if data.upgrades[id]: spent += COSTS[id]
	if data.upgrades.bloom and not (data.upgrades.brush and data.upgrades.teamwork): return false
	if data.get("motes", -1) != int(floor(total + 0.00001)) - spent: return false
	for key in ["elapsed", "restoration", "ritual_time", "first_helper_at", "first_upgrade_at"]:
		if not (data.get(key) is float or data.get(key) is int) or not is_finite(data[key]): return false
	if data.elapsed < 0 or data.restoration < 0 or data.restoration > 1 or data.ritual_time < 0: return false
	if not data.get("ritual") is bool or not data.get("completed") is bool: return false
	if (data.ritual or data.restoration > 0) and (not data.upgrades.bloom or total / dust.size() < 0.75): return false
	if data.completed and (total < dust.size() - 0.0001 or data.restoration < 1): return false
	if not data.get("assignment") is Array or data.assignment.size() not in [0, 2]: return false
	var order = Vector2.INF
	if data.assignment.size() == 2:
		for n in data.assignment:
			if not (n is float or n is int) or not is_finite(n): return false
		order = Vector2(data.assignment[0], data.assignment[1])
		if not walkable(order, 0.22): return false
	var restored_crew: Array = []
	for entry in data.crew:
		if not entry is Dictionary: return false
		for key in ["x", "z", "born", "direction"]:
			if not (entry.get(key) is float or entry.get(key) is int) or not is_finite(entry[key]): return false
		var pos = Vector2(entry.x, entry.z)
		if not walkable(pos) or entry.born < 0 or entry.born > data.elapsed: return false
		restored_crew.append({"id": restored_crew.size(), "p": pos, "target": -1, "born": entry.born, "direction": entry.direction, "speed": 0.0, "work": 0.0})
	for i in range(dust.size()): dust[i].amount = data.dust[i]
	crew = restored_crew
	upgrades = data.upgrades.duplicate()
	cleaned = total
	earned = int(floor(total + 0.00001))
	motes = int(data.motes)
	elapsed = data.elapsed
	restoration = data.restoration
	ritual = data.ritual
	ritual_time = data.ritual_time
	completed = data.completed
	first_helper_at = data.first_helper_at
	first_upgrade_at = data.first_upgrade_at
	assignment = order
	events.clear()
	return true
