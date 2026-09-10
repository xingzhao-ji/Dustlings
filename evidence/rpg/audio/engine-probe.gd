extends SceneTree
const Audio = preload("res://scripts/rpg_audio.gd")
var checks=[]
var failures=[]
func check(value,name):
	if value: checks.append(name)
	else: failures.append(name); push_warning(name)
func _init(): call_deferred("run")
func run():
	var audio=Audio.new()
	root.add_child(audio)
	await process_frame
	check(audio.step_streams.size()==3 and audio.step_streams.stone.size()==3 and audio.melody_streams.size()==2,"All11 original cues load in actual Godot")
	check(not audio.footstep(Vector3.ZERO,"stone") and not audio.melody(Vector3.ZERO),"No contacts/melody before gesture-start")
	audio.start_soundscape()
	audio.set_mix(.6,.5,.55)
	check(audio.footstep(Vector3(1,0,2),"stone"),"Walking contact uses spatial cue")
	check(not audio.footstep(Vector3.ZERO,"wood"),"Global contact cooldown prevents rapid material switching spam")
	check(is_equal_approx(audio.voices[0].unit_size,3.2) and audio.voices[0].max_distance==18.0 and audio.voices[0].position==Vector3(1,0,2),"Cue uses neighborhood-scale attenuation and actual contact position")
	audio.cooldown.rpg_step=-100
	check(audio.footstep(Vector3.ZERO,"wood") and audio.voices.size()==2,"Two overlapping contacts permitted")
	audio.cooldown.rpg_step=-100
	check(not audio.footstep(Vector3.ZERO,"grass") and audio.voices.size()==2,"Third overlapping footstep refused")
	audio._apply_mix()
	check(is_equal_approx(audio.voices[0].volume_linear,.5*.58),"Ongoing mix preserves restrained contact gain")
	check(audio.melody(Vector3.ZERO) and audio.voices.size()==1 and audio.voices[0].get_meta("rpg_kind")=="melody","Family melody replaces contacts without adding crowd noise")
	check(not audio.melody(Vector3.ZERO,true),"Melody cooldown prevents overlap with its answering cadence")
	await physics_frame
	await process_frame
	audio.set_paused(true)
	check(not audio.footstep(Vector3.ZERO,"stone") and not audio.melody(Vector3.ZERO,true) and audio.voices[0].stream_paused,"Explicit pause pauses live melody and prevents new world cues")
	audio.set_paused(false)
	audio.set_mix(.6,0,.55)
	check(audio.voices.is_empty() and not audio.footstep(Vector3.ZERO,"stone") and not audio.melody(Vector3.ZERO,true),"Effects mute immediately clears tails and blocks future cues")
	audio.set_mix(.6,.5,.55)
	check(audio.voices.is_empty(),"Unmute cannot resurrect tails")
	audio.cooldown.rpg_melody=-100
	check(audio.melody(Vector3.ZERO,true) and audio.voices[0].stream.get_length()>3,"Earned answer includes the full five-note cadence")
	audio._focused=false
	check(not audio.footstep(Vector3.ZERO,"stone") and not audio.melody(Vector3.ZERO),"Focus loss blocks new contacts and melody")
	audio._focused=true
	audio._stop_voices(audio.voices)
	for i in 8: audio._play_rpg(audio.melody_streams.taught,Vector3.ZERO,"fixture",.1)
	check(audio.voices.size()==8 and not audio.footstep(Vector3.ZERO,"stone"),"New cues share base world8 cap and leave contact priority lower")
	audio.cooldown.rpg_melody=-100
	check(not audio.melody(Vector3.ZERO,true) and audio.voices.size()==8,"Melody never exceeds8 world voices or steals meaningful cues")
	audio._stop_voices(audio.voices)
	audio.cooldown.rpg_step=-100
	check(audio.footstep(Vector3.ZERO,"unrecognized"),"Unknown material falls back to restrained stone contact")
	await create_timer(.5).timeout
	check(audio.voices.is_empty(),"One-shot contact finishes and releases its actual world voice")
	var cadence_admitted=0
	for i in 6:
		if audio.footstep(Vector3.ZERO,["stone","wood","grass"][i%3]): cadence_admitted+=1
		await create_timer(.212).timeout
	check(cadence_admitted==6 and audio._steps_playing()<=2,"Actual 0.212-second walking contacts are admitted without alternating drops")
	var result={"kind":"Actual headless Godot audio-state and loaded-stream checks; no audition or native sound-device claim","checks":checks,"failures":failures,"source_sha256":FileAccess.get_sha256("res://scripts/rpg_audio.gd"),"driver":AudioServer.get_driver_name()}
	var file=FileAccess.open("res://../evidence/rpg/audio/engine-checks.json",FileAccess.WRITE)
	file.store_string(JSON.stringify(result,"  "));file.close()
	print(JSON.stringify(result))
	await audio.shutdown()
	audio.queue_free()
	await process_frame
	quit(0 if failures.is_empty() else 1)
