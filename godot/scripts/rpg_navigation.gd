extends RefCounted
## Flat neighborhood routes from the actual current BoxShape3D collision geometry.
## No position warps, visual-mesh assumptions, or discarded breadcrumb history.
const CELL = 0.32
const ORIGIN = Vector2(-18.0, -18.0)
const NAV_RADIUS = 0.18
const BODY_RADIUS = 0.14
var grid: AStarGrid2D
var obstacles: Array[Rect2] = []
var obstacle_names: Array[String] = []
var signature = ""
var generation = 0
var build_info: Dictionary = {}
var body_radius = BODY_RADIUS

func configure(world: Node3D, radius: float = BODY_RADIUS) -> void:
	var rects: Array[Rect2] = []
	var names: Array[String] = []
	_collect(world, rects, names)
	var next_signature = (str(rects)+str(radius)).sha256_text()
	if grid != null and next_signature == signature: return
	var started = Time.get_ticks_usec()
	obstacles = rects
	obstacle_names = names
	signature = next_signature
	body_radius = radius
	grid = AStarGrid2D.new()
	grid.region = Rect2i(0, 0, 113, 107)
	grid.cell_size = Vector2(CELL, CELL)
	grid.offset = ORIGIN
	# Cardinal cells avoid corner cutting; the subsequent continuous-capsule
	# visibility pass removes unnecessary turns where geometry permits.
	grid.diagonal_mode = AStarGrid2D.DIAGONAL_MODE_NEVER
	grid.default_compute_heuristic = AStarGrid2D.HEURISTIC_MANHATTAN
	grid.default_estimate_heuristic = AStarGrid2D.HEURISTIC_MANHATTAN
	grid.update()
	var blocked = 0
	for y in grid.region.size.y:
		for x in grid.region.size.x:
			var id = Vector2i(x, y)
			if not _point_clear(grid.get_point_position(id), body_radius + 0.04):
				grid.set_point_solid(id, true)
				blocked += 1
	generation += 1
	build_info = {"generation": generation, "obstacles": obstacles.size(), "cells": grid.region.size.x * grid.region.size.y, "blocked": blocked, "build_ms": float(Time.get_ticks_usec() - started) / 1000.0, "signature": signature}

func _collect(node: Node, rects: Array[Rect2], names: Array[String]) -> void:
	if node is StaticBody3D and node.collision_layer & 1:
		for child in node.get_children():
			if not child is CollisionShape3D or child.disabled or not child.shape is BoxShape3D: continue
			var half: Vector3 = child.shape.size * 0.5
			var low = Vector3(INF, INF, INF)
			var high = Vector3(-INF, -INF, -INF)
			for x in [-1, 1]:
				for y in [-1, 1]:
					for z in [-1, 1]:
						var point: Vector3 = child.global_transform * (half * Vector3(x, y, z))
						low = low.min(point)
						high = high.max(point)
			if high.y <= 0.05: continue
			rects.append(Rect2(Vector2(low.x, low.z), Vector2(high.x - low.x, high.z - low.z)))
			names.append(str(node.name))
	for child in node.get_children(): _collect(child, rects, names)

func _point_clear(point: Vector2, radius: float = -1.0) -> bool:
	if radius < 0: radius=body_radius
	if point.x < -17.85 or point.x > 17.85 or point.y < -17.55 or point.y > 15.55: return false
	for rect in obstacles:
		if point.distance_squared_to(point.clamp(rect.position,rect.end)) <= radius*radius: return false
	return true

func point_clear(point: Vector3) -> bool:
	return grid != null and _point_clear(Vector2(point.x, point.z))

func _crosses_rect(a: Vector2, b: Vector2, rect: Rect2) -> bool:
	# Slab intersection includes the endpoints; tangent segments are conservatively
	# blocked. The actual capsule's own physics remains the final movement guard.
	var low = 0.0
	var high = 1.0
	var direction = b - a
	for axis in 2:
		if absf(direction[axis]) < 0.000001:
			if a[axis] < rect.position[axis] or a[axis] > rect.end[axis]: return false
		else:
			var t1 = (rect.position[axis] - a[axis]) / direction[axis]
			var t2 = (rect.end[axis] - a[axis]) / direction[axis]
			low = maxf(low, minf(t1, t2))
			high = minf(high, maxf(t1, t2))
			if low > high: return false
	return true

func segment_clear(from: Vector3, to: Vector3) -> bool:
	if grid == null: return false
	var a = Vector2(from.x, from.z)
	var b = Vector2(to.x, to.z)
	if not _point_clear(a) or not _point_clear(b): return false
	for rect in obstacles:
		if _segment_touches_rect(a,b,rect,body_radius): return false
	return true

func _segment_touches_rect(a: Vector2,b: Vector2,rect: Rect2,radius: float) -> bool:
	if not _crosses_rect(a,b,rect.grow(radius)): return false
	if _crosses_rect(a,b,rect): return true
	# A real capsule rounds a box corner. Square-expanded rectangles incorrectly
	# rejected valid contact positions and stranded a follower at the home door.
	var distance=minf(a.distance_squared_to(a.clamp(rect.position,rect.end)),b.distance_squared_to(b.clamp(rect.position,rect.end)))
	for corner in [rect.position,Vector2(rect.end.x,rect.position.y),rect.end,Vector2(rect.position.x,rect.end.y)]:
		var nearest=Geometry2D.get_closest_point_to_segment(corner,a,b)
		distance=minf(distance,corner.distance_squared_to(nearest))
	return distance<=radius*radius

func _cell_for(point: Vector3) -> Vector2i:
	var p = Vector2(point.x, point.z)
	var around = Vector2i((p - ORIGIN) / CELL + Vector2(0.5, 0.5))
	var found = Vector2i(-1, -1)
	var distance = INF
	for ring in 5:
		for y in range(around.y - ring, around.y + ring + 1):
			for x in range(around.x - ring, around.x + ring + 1):
				var id = Vector2i(x, y)
				if not grid.is_in_boundsv(id) or grid.is_point_solid(id): continue
				var position: Vector2 = grid.get_point_position(id)
				var gap = p.distance_squared_to(position)
				if gap < distance and segment_clear(point, Vector3(position.x, 0, position.y)):
					found = id
					distance = gap
		if found.x >= 0: return found
	return found

func path(from: Vector3, to: Vector3) -> Array[Vector3]:
	var result: Array[Vector3] = []
	if grid == null or not point_clear(from) or not point_clear(to): return result
	if segment_clear(from, to):
		result.append(Vector3(to.x, 0, to.z))
		return result
	var start = _cell_for(from)
	var end = _cell_for(to)
	if start.x < 0 or end.x < 0: return result
	var ids = grid.get_id_path(start, end)
	if ids.is_empty(): return result
	var raw: Array[Vector3] = []
	for id in ids:
		var point: Vector2 = grid.get_point_position(id)
		raw.append(Vector3(point.x, 0, point.y))
	raw.append(Vector3(to.x, 0, to.z))
	var at = from
	var index = 0
	while index < raw.size():
		var furthest = index
		for candidate in range(index, raw.size()):
			if segment_clear(at, raw[candidate]): furthest = candidate
		if not segment_clear(at, raw[furthest]): return []
		result.append(raw[furthest])
		at = raw[furthest]
		index = furthest + 1
	return result
