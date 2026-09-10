extends SceneTree
var failures: Array = []
var checks: Array = []
func check(value: bool, label: String):
	if value: checks.append(label)
	else: failures.append(label)
func _initialize(): call_deferred("run")
func run():
	var Visual = load("res://scripts/dustling_visual.gd")
	var node = Visual.new()
	root.add_child(node)
	node._phase = 0
	var original = node.transform
	var max_lean = 0.0
	var max_stroke = 0.0
	var lowest_contact = 100.0
	var phases: Array = []
	for i in 240:
		node.pose(1.0/60.0,i/60.0,0,1,4,false,false)
		max_lean = maxf(max_lean,node._rig.rotation.x)
		max_stroke = maxf(max_stroke,node.work_stroke())
		if node.work_stroke() > 0.8: lowest_contact = minf(lowest_contact,node.work_contact().y)
		if i in [10,22,40,58,80,95]: phases.append({"frame":i,"lean":node._rig.rotation.x,"stroke":node.work_stroke(),"contact":str(node.work_contact())})
	check(max_lean>0.3 and max_stroke>0.9,"Working cycle has a distinct forward reach and actual contact interval")
	check(lowest_contact>=0.0029 and lowest_contact<0.015,"Computed work contact stays above and close to the paving")
	node.pose(1.0/60.0,4.1,0,0,4,false,false)
	check(node.work_stroke()==0,"No incoming work immediately disables contact despite animation blend tail")
	node.pose(1.0/60.0,4.2,0,1,4,true,false)
	check(node.work_stroke()==0,"Celebration never advertises cleaning contact")
	for i in 30: node.pose(1.0/60.0,4.3+i/60.0,0.8,1,4,false,false)
	check(node.work_stroke()==0,"Travel never advertises a planted cleaning stroke")
	var gentle_min = 100.0
	var gentle_max = 0.0
	var gentle_lean_min = 100.0
	var gentle_lean_max = -100.0
	for i in 180:
		node.pose(1.0/60.0,5+i/60.0,0,1,4,false,true)
		if i>30:
			gentle_min=minf(gentle_min,node.work_stroke());gentle_max=maxf(gentle_max,node.work_stroke())
			gentle_lean_min=minf(gentle_lean_min,node._rig.rotation.x);gentle_lean_max=maxf(gentle_lean_max,node._rig.rotation.x)
	check(gentle_max<=0.3 and gentle_min>=0.299,"Gentle mode retains low steady contact without repeated sweeping")
	check(gentle_lean_max-gentle_lean_min<0.001,"Gentle working body pose stays steady after entering")
	check(node.transform==original,"Pose never moves, rotates or scales the simulation-owned root")
	check(node.find_children("*","GeometryInstance3D",true,false).size()==7,"Character still uses seven geometry groups")
	var report={"kind":"Headless animation-state and analytic ellipsoid checks; no GPU transform readback, performance or human claim","checks":checks,"failures":failures,"max_lean_radians":max_lean,"max_stroke":max_stroke,"lowest_contact":lowest_contact,"gentle_contact_range":[gentle_min,gentle_max],"phases":phases}
	FileAccess.open("/tmp/dustlings-work-checks.json",FileAccess.WRITE).store_string(JSON.stringify(report,"\t"))
	print(JSON.stringify(report))
	node.free()
	await process_frame
	quit(0 if failures.is_empty() else 1)
