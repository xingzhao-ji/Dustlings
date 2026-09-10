extends "res://scripts/dust_feedback.gd"
var submitted_batches: Array = []
func _static_batch(mesh: Mesh, instances: Array, label: String):
    submitted_batches.append({"mesh":mesh,"instances":instances,"label":label})
    super._static_batch(mesh,instances,label)
