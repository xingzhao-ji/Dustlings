extends SceneTree
func _init(): call_deferred("run")
func run():
    var sim = load("/tmp/dustlings-dust-sim.gd").new()
    var picture = Image.create(29,18,false,Image.FORMAT_RF)
    picture.fill(Color(1,0,0))
    var field = ImageTexture.create_from_image(picture)
    var feedback = load("/tmp/dustlings-dust-probe.gd").new()
    feedback.configure(field,sim.dust)
    root.add_child(feedback)
    var min_y = 100.0
    var max_y = -100.0
    var outside_flat_faces = 0
    for batch in feedback.submitted_batches:
        var vertices = batch.mesh.surface_get_arrays(0)[Mesh.ARRAY_VERTEX]
        for instance in batch.instances:
            var transform = instance.transform
            for vertex in vertices:
                var point = transform * vertex
                min_y = minf(min_y,point.y)
                max_y = maxf(max_y,point.y)
                var col = clampi(roundi((point.x+7.13)/1.02),0,14)
                var row = clampi(roundi((point.z+4.02)/0.95),0,9)
                var dx = absf(point.x-(-7.13+col*1.02))
                var dz = absf(point.z-(-4.02+row*0.95))
                if dx > 0.443 or dz > 0.409: outside_flat_faces += 1
    var normal_peak = 0
    for i in 120:
        feedback.tick(1.0/120.0,i/120.0,0.85/60.0 if i%2==0 else 0.0,Vector3(-3,0,2),false)
        normal_peak = maxi(normal_peak,feedback._particles.size())
    for i in 90: feedback.tick(1.0/120.0,1+i/120.0,0,Vector3.ZERO,false)
    var idle_empty = feedback._particles.is_empty()
    var gentle_peak = 0
    for i in 80:
        feedback.tick(0.01,2+i*0.01,1.0,Vector3(-3,0,2),true)
        gentle_peak = maxi(gentle_peak,feedback._particles.size())
    feedback.reset()
    var result = {"kind":"Headless CPU-submitted geometry and state checks, no GPU readback or human review","static_instances":feedback.static_instance_count,"min_y":min_y,"max_y":max_y,"vertices_outside_flat_paver_faces":outside_flat_faces,"interleaved120Hz_wisps_peak":normal_peak,"idle_empty":idle_empty,"gentle_peak":gentle_peak,"reset_empty":feedback._particles.is_empty()}
    result["passed"] = outside_flat_faces==0 and min_y>=0 and max_y<0.025 and normal_peak>0 and normal_peak<=32 and idle_empty and gentle_peak<=8
    print("FINAL ",JSON.stringify(result))
    FileAccess.open("/tmp/dustlings-dust-state.json",FileAccess.WRITE).store_string(JSON.stringify(result,"\t"))
    feedback.queue_free()
    await process_frame
    quit()
