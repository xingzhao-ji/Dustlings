extends "/Users/xingzhaoji/Desktop/Dustlings/builds/3d/experiments/dust-distribution/baseline.gd"
var submissions: Array = []
func _static_batch(mesh: Mesh, instances: Array, label: String):
	submissions.append({"mesh":mesh,"instances":instances,"label":label})
	super._static_batch(mesh,instances,label)
