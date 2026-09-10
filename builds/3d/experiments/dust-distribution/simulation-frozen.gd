extends RefCounted

const COSTS = {"brush": 32, "teamwork": 32, "bloom": 58}
const FOUNTAIN_RADIUS = 1.45
const HELPER_SPACING = 0.54 # 0.46 m body plus a visible gap at the playing camera.
const PAIR_OFFSET = 0.29
const CHORUS_DURATION = 18.0
const LEGACY_CHORUS_DURATION = 38.0
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
				dust.append({"p": p, "cell": Vector2i(x, z), "amount": 1.0, "seed": rng.randf()})

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
		var p = _birth_position(d.p)
		crew.append({"id": id, "p": p, "target": -1, "born": elapsed, "direction": 0.0, "work": 0.0, "speed": 0.0, "assisted": 0.0})
		events.append({"kind": "birth", "p": p, "first": id == 0})
		if id == 0: first_helper_at = elapsed
	return removed

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
	ritual_time = restoration * CHORUS_DURATION
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
	var reserved = PackedVector2Array()
	for other in crew:
		if other.id != c.id and other.target >= 0 and dust[other.target].amount > 0.00001:
			reserved.append(_work_position(dust[other.target].p, other.id))
	for i in range(dust.size()):
		if dust[i].amount <= 0.00001: continue
		var first = _work_position(dust[i].p, c.id)
		var second = _work_position(dust[i].p, c.id + 1) if upgrades.teamwork and c.id % 2 == 0 and c.id + 1 < crew.size() else first
		var has_room = true
		for position in reserved:
			if first.distance_squared_to(position) < HELPER_SPACING * HELPER_SPACING or second.distance_squared_to(position) < HELPER_SPACING * HELPER_SPACING:
				has_room = false
				break
		if not has_room: continue
		var value = dust[i].p.distance_to(anchor)
		if assignment != Vector2.INF: value += dust[i].p.distance_to(c.p) * 0.1
		if value < score:
			score = value
			best = i
	return best

func _work_position(patch: Vector2, id: int) -> Vector2:
	var offset = Vector2(PAIR_OFFSET if id % 2 == 1 else -PAIR_OFFSET, -0.20) if upgrades.teamwork else Vector2(0, -0.27)
	var goal = _walk_position(patch + offset)
	if goal.length() < 1.79: goal = goal.normalized() * 1.79
	return goal

func _walk_position(p: Vector2) -> Vector2:
	p = p.clamp(Vector2(-7.0, -3.8), Vector2(7.0, 4.4))
	if p.length() < 1.76:
		p = p.normalized() * 1.76 if p.length() > 0.001 else Vector2(0, 1.76)
	return p

func _birth_position(origin: Vector2) -> Vector2:
	# New helpers unfold beside their source patch without forming inside a worker.
	var best = _walk_position(origin)
	var best_space = -1.0
	for attempt in range(65):
		var angle = attempt * 2.399963
		var radius = sqrt(float(attempt)) * 0.12
		var candidate = _walk_position(origin + Vector2(cos(angle), sin(angle)) * radius)
		var space = INF
		for other in crew: space = minf(space, candidate.distance_to(other.p))
		if space >= HELPER_SPACING: return candidate
		if space > best_space: best_space = space; best = candidate
	return best

func _separate_crew():
	# A few symmetric ground-plane constraint passes preserve body clearance. This
	# also resolves overlap in older saves without changing their format or count.
	var positions = PackedVector2Array()
	for c in crew: positions.append(c.p)
	var count = positions.size()
	var spacing_squared = HELPER_SPACING * HELPER_SPACING
	for pass_index in range(12):
		var corrected = false
		for a in range(count):
			var i = a if pass_index % 2 == 0 else count - 1 - a
			for b in range(a + 1, count):
				var j = b if pass_index % 2 == 0 else count - 1 - b
				var offset = positions[j] - positions[i]
				var distance_squared = offset.length_squared()
				if distance_squared >= spacing_squared: continue
				var distance = sqrt(distance_squared)
				corrected = true
				var axis = offset / distance if distance > 0.00001 else Vector2.from_angle((i * 17 + j * 11) * 0.618)
				var correction = axis * (HELPER_SPACING - distance + 0.0001) * 0.5
				positions[i] = _walk_position(positions[i] - correction)
				positions[j] = _walk_position(positions[j] + correction)
		if not corrected: break
	for i in range(count): crew[i].p = positions[i]

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
	if c.has("id") and distance > 0.35:
		# Consistent passing side prevents two opposing helpers from pushing into a
		# stationary deadlock. Stop steering near a work spot so resting crews settle.
		var heading = direction.normalized()
		var turn_aside = 0.0
		for other in crew:
			if other.id == c.id: continue
			var relative: Vector2 = other.p - c.p
			var gap = relative.length()
			if gap > 0.001 and gap < 0.85 and heading.dot(relative / gap) > 0.35:
				turn_aside = maxf(turn_aside, (0.85 - gap) / 0.45)
		direction = (heading + heading.orthogonal() * turn_aside * 1.2).normalized() * distance
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
	var previous_positions: Array[Vector2] = []
	for c in crew:
		previous_positions.append(c.p)
		c.work = 0.0
		c.assisted = 0.0
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
			move(c, _work_position(d.p, c.id), delta, 1.02 if upgrades.teamwork else 0.86)
	_separate_crew()
	for index in range(previous_positions.size()):
		var c = crew[index]
		c.speed = c.p.distance_to(previous_positions[index]) / maxf(delta, 0.0001)
		if not ritual and not completed and elapsed - c.born >= 0.8 and c.target >= 0:
			if c.p.distance_to(dust[c.target].p) < 0.54:
				c.assisted = collect(c.target, delta * (0.0245 if upgrades.teamwork else 0.014) * (3.0 if remaining < 0.06 else 1.0), "assisted")
				c.work = 1.0 if c.assisted > 0 else 0.0
	if ritual:
		var gathered = 0
		for c in crew:
			if c.work > 0: gathered += 1
		if gathered >= mini(12, crew.size()) * 0.8:
			ritual_time = minf(CHORUS_DURATION, ritual_time + delta)
			if ritual_time >= CHORUS_DURATION - 0.000001: ritual_time = CHORUS_DURATION
			restoration = minf(1.0, ritual_time / CHORUS_DURATION)
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
	return {"format": "dustlings-3d", "version": 1, "dust": amounts, "crew": creatures, "upgrades": upgrades.duplicate(), "motes": motes, "earned": earned, "elapsed": elapsed, "restoration": restoration, "ritual": ritual, "ritual_time": ritual_time, "ritual_duration": CHORUS_DURATION, "completed": completed, "first_helper_at": first_helper_at, "first_upgrade_at": first_upgrade_at, "assignment": [] if assignment == Vector2.INF else [assignment.x, assignment.y], "stats": stats.duplicate()}

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
	if data.get("earned", -1) != int(floor(total + 0.00001)): return false
	if not data.get("stats") is Dictionary: return false
	for key in ["brushed", "assisted", "orders"]:
		if not (data.stats.get(key) is float or data.stats.get(key) is int) or not is_finite(data.stats[key]) or data.stats[key] < 0: return false
	if absf(data.stats.brushed + data.stats.assisted - total) > 0.001 or data.stats.orders != floorf(data.stats.orders): return false
	for key in ["elapsed", "restoration", "ritual_time", "first_helper_at", "first_upgrade_at"]:
		if not (data.get(key) is float or data.get(key) is int) or not is_finite(data[key]): return false
	if data.elapsed < 0 or data.restoration < 0 or data.restoration > 1 or data.ritual_time < 0: return false
	var saved_duration = data.get("ritual_duration", LEGACY_CHORUS_DURATION)
	if not (saved_duration is float or saved_duration is int) or not is_finite(saved_duration) or saved_duration <= 0: return false
	# Visible restoration is authoritative across duration changes. A legacy19s /
	# 38s save remains half restored; interpreting19 as the new clock would finish it.
	var resumed_time = data.restoration * CHORUS_DURATION
	if saved_duration == CHORUS_DURATION and is_equal_approx(minf(1.0, data.ritual_time / saved_duration), data.restoration):
		resumed_time = minf(CHORUS_DURATION, data.ritual_time)
	if data.first_helper_at > data.elapsed or data.first_upgrade_at > data.elapsed: return false
	if data.crew.size() > 0 and data.first_helper_at < 0: return false
	if spent > 0 and data.first_upgrade_at < 0: return false
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
		restored_crew.append({"id": restored_crew.size(), "p": pos, "target": -1, "born": entry.born, "direction": entry.direction, "speed": 0.0, "work": 0.0, "assisted": 0.0})
	for i in range(dust.size()): dust[i].amount = data.dust[i]
	crew = restored_crew
	upgrades = data.upgrades.duplicate()
	cleaned = total
	earned = int(floor(total + 0.00001))
	motes = int(data.motes)
	elapsed = data.elapsed
	restoration = data.restoration
	ritual = data.ritual
	ritual_time = resumed_time
	completed = data.completed
	first_helper_at = data.first_helper_at
	first_upgrade_at = data.first_upgrade_at
	assignment = order
	stats = data.stats.duplicate()
	events.clear()
	return true
