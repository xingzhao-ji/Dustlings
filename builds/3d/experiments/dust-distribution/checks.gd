extends SceneTree
var folder = "/Users/xingzhaoji/Desktop/Dustlings/builds/3d/experiments/dust-distribution"
func _initialize(): call_deferred("run")
func run():
	var sim = load("res://scripts/simulation.gd").new()
	var picture = Image.create(29,18,false,Image.FORMAT_RF)
	picture.fill(Color(1,0,0))
	var texture = ImageTexture.create_from_image(picture)
	var report = {"kind":"Headless CPU-submitted mesh geometry/distribution; no GPU readback or aesthetic score","variants":{}}
	for kind in ["baseline","candidate"]:
		var node = load(folder.path_join(kind+"-probe.gd")).new()
		node.configure(texture,sim.dust)
		root.add_child(node)
		var min_y = 100.0
		var max_y = -100.0
		var bad_vertices = 0
		var drifts = 0
		var near_centers = 0
		var tiles: Dictionary = {}
		for batch in node.submissions:
			var vertices = batch.mesh.surface_get_arrays(0)[Mesh.ARRAY_VERTEX]
			for instance in batch.instances:
				var transform = instance.transform
				var x = roundi((transform.origin.x+7.13)/1.02)
				var z = roundi((transform.origin.z+4.02)/0.95)
				tiles[str(x)+","+str(z)] = true
				if "Drifts" in batch.label:
					drifts += 1
					if Vector2(transform.origin.x-(-7.13+x*1.02),transform.origin.z-(-4.02+z*0.95)).length()<0.10: near_centers += 1
				for vertex in vertices:
					var point = transform*vertex
					min_y=minf(min_y,point.y);max_y=maxf(max_y,point.y)
					var col=roundi((point.x+7.13)/1.02)
					var row=roundi((point.z+4.02)/0.95)
					if absf(point.x-(-7.13+col*1.02))>0.443 or absf(point.z-(-4.02+row*0.95))>0.409: bad_vertices+=1
		var unchanged_feedback = node.has_method("_tick_work") and node.MAX_WORK_WISPS==40 and node.MAX_BRUSH_WISPS==32
		report.variants[kind]={"static_instances":node.static_instance_count,"static_batches":node._batches.size(),"drifts":drifts,"drifts_within0_10_of_tile_center":near_centers,"occupied_tiles":tiles.size(),"min_y":min_y,"max_y":max_y,"vertices_outside_flat_faces":bad_vertices,"existing_feedback_api_and_caps":unchanged_feedback,"passed":bad_vertices==0 and min_y>=0 and max_y<0.025 and node._batches.size()==4 and node.static_instance_count<=1200 and unchanged_feedback}
		node.free()
	await process_frame
	FileAccess.open(folder.path_join("checks.json"),FileAccess.WRITE).store_string(JSON.stringify(report,"\t"))
	print(JSON.stringify(report))
	quit(0 if report.variants.baseline.passed and report.variants.candidate.passed else 1)
