extends SceneTree
const Story = preload("res://scripts/rpg_story.gd")
var checks: Array[String] = []
var failures: Array[String] = []

func check(value: bool, description: String) -> void:
	if value: checks.append(description)
	else: failures.append(description); push_error(description)

func play_bridge(story) -> void:
	story.perform("collect_wood")
	story.perform("first_companion")
	story.perform("clear_bridge")
	story.interact("mara")
	story.choose("mara_plan")
	story.perform("repair_bridge")

func _init() -> void:
	var story = Story.new()
	var initial = story.export_state()
	check(story.import_state(JSON.parse_string(JSON.stringify(initial))), "Empty RPG save round-trips independently of legacy courtyard state")
	for action in ["repair_bridge", "mara_plan", "clear_bridge", "sing_wall", "greenhouse_memory", "light_alcove", "nell_melody", "nell_invitation", "mara_workshop", "deliver_parcel", "ivo_map", "share_table", "tavi_recipe"]:
		var before = story.export_state()
		var answer = story.perform(action)
		check(not answer.ok and story.export_state() == before, "Premature " + action + " explains gate without mutating state")
	var intros: Array[String] = []
	for id in Story.RESIDENTS:
		var intro = story.interact(id)
		intros.append(intro.text)
		check(intro.changed and intro.text.length() < 240 and intro.choices.size() > 0, id + " introduction is short and offers a personal conversation")
		story.choose(id + "_concern")
		var trust = story.state.trust[id]
		for repeat in range(20):
			story.interact(id)
			story.choose(id + "_concern")
		check(story.state.trust[id] == trust, id + " repeated greetings/questions cannot farm trust")
	check(intros[0] != intros[1] and intros[1] != intros[2] and intros[2] != intros[3], "Four residents have distinct authored introductions")
	var unseen = Story.new()
	check(not "greenhouse" in " ".join(unseen.journal()).to_lower() and not "glow" in " ".join(unseen.journal()).to_lower(), "Unearned journal does not reveal hidden place or ability")
	check(unseen.interact("vine_wall").choices.is_empty() and "bells" in unseen.interact("vine_wall").text, "Unopened wall offers a fair sensory clue without secret interaction")
	story.perform("water_garden")
	check(story.choose("nell_melody").ok and story.has("melody_learned"), "Nell teaches melody after specific care and personal conversation")
	check(not story.perform("sing_wall").ok, "Melody alone cannot open wall without central dust companion")
	play_bridge(story)
	check(story.has("bridge_repaired"), "Bridge action accepts actual plan, wood, brush and companion prerequisites")
	check(story.choose("mara_workshop").ok and story.state.trust.mara == 4, "Mara's completed personal arc grants workshop invitation")
	story.perform("collect_parcel")
	check(story.perform("deliver_parcel").ok, "Repair makes parcel delivery possible")
	check(story.choose("ivo_map").ok and story.state.trust.ivo == 4, "Ivo's completed arc shares an authored exploration clue")
	check(story.perform("sing_wall").ok and story.has("greenhouse_open"), "Earned melody and companion reveal greenhouse")
	check(story.perform("greenhouse_memory").ok and story.has("glow_unlocked"), "Letter and unusual visitor grant new companion ability together")
	check(story.choose("nell_invitation").ok and story.state.trust.nell == 4, "Returning with memory changes Nell and unlocks personal invitation")
	check(story.perform("light_alcove").ok and "first bridge" in story.interact("mara").text, "Companion light reveals keepsake and new Mara reaction")
	story.perform("gather_herbs")
	check(story.perform("share_table").ok, "Connected crossing and herbs enable shared gathering")
	check(story.choose("tavi_recipe").ok and story.state.trust.tavi == 4, "Tavi's completed arc grants a personal home invitation reward")
	var progressed = story.export_state()
	for action in ["first_companion", "collect_wood", "clear_bridge", "mara_plan", "repair_bridge", "mara_workshop", "water_garden", "nell_melody", "sing_wall", "greenhouse_memory", "nell_invitation", "light_alcove", "collect_parcel", "deliver_parcel", "ivo_map", "gather_herbs", "share_table", "tavi_recipe"]:
		check(not story.perform(action).changed and story.export_state() == progressed, "Repeated " + action + " gives no duplicate advancement")
	story.perform("home_sage")
	story.perform("rest")
	story.perform("rest")
	var saved = story.export_state()
	var resumed = Story.new()
	check(resumed.import_state(JSON.parse_string(JSON.stringify(saved))) and resumed.state == saved, "Completed arcs, home and unhurried day reliably round-trip through JSON")
	check(resumed.state.day == 3 and resumed.has("garden_invited") and resumed.state.home == "sage", "Rest advances day without losing relationships or home selection")
	var copy = resumed.export_state()
	copy.flags.clear()
	check(resumed.has("glow_unlocked"), "Export returns a deep copy that cannot mutate live progress")
	# Different exploration orders must remain complete-able, including acts of care before meeting NPCs.
	for permutation in range(12):
		var order = Story.new()
		var optional = ["water_garden", "collect_parcel", "gather_herbs", "collect_wood"]
		for j in range(optional.size()): order.perform(optional[(j + permutation) % optional.size()])
		for j in range(Story.RESIDENTS.size()):
			var id = Story.RESIDENTS[(j + permutation / 3) % Story.RESIDENTS.size()]
			order.interact(id)
			order.choose(id + "_concern")
		if permutation % 2 == 0: order.choose("nell_melody")
		play_bridge(order)
		order.perform("deliver_parcel")
		order.choose("nell_melody")
		order.perform("sing_wall")
		order.perform("greenhouse_memory")
		order.perform("light_alcove")
		order.choose("mara_workshop")
		order.choose("ivo_map")
		order.choose("nell_invitation")
		order.perform("share_table")
		order.choose("tavi_recipe")
		check(order.has("alcove_found") and order.has("shared_table") and order.state.trust == {"mara": 4, "ivo": 4, "nell": 4, "tavi": 4} and Story.new().import_state(order.export_state()), "Alternative activity order " + str(permutation + 1) + " finishes all resident arcs without softlock")
	var corrupted: Array = []
	var bad = saved.duplicate(true); bad.flags.erase("melody_learned"); corrupted.append(bad)
	bad = saved.duplicate(true); bad.flags.erase("glow_unlocked"); corrupted.append(bad)
	bad = saved.duplicate(true); bad.flags.erase("wood_collected"); corrupted.append(bad)
	bad = saved.duplicate(true); bad.flags.fake_reward = true; corrupted.append(bad)
	bad = saved.duplicate(true); bad.flags.met_mara = "yes"; corrupted.append(bad)
	bad = saved.duplicate(true); bad.trust.mara = 99; corrupted.append(bad)
	bad = saved.duplicate(true); bad.day = NAN; corrupted.append(bad)
	bad = saved.duplicate(true); bad.day = 1.5; corrupted.append(bad)
	bad = saved.duplicate(true); bad.day = -1; corrupted.append(bad)
	bad = saved.duplicate(true); bad.home = "unknown"; corrupted.append(bad)
	bad = saved.duplicate(true); bad.schema = 2; corrupted.append(bad)
	bad = saved.duplicate(true); bad.extra = true; corrupted.append(bad)
	for index in range(corrupted.size()):
		check(not resumed.import_state(corrupted[index]) and resumed.export_state() == saved, "Damaged or inconsistent save " + str(index + 1) + " rejected atomically")
	check(not resumed.perform("unknown_action").ok and resumed.export_state() == saved, "Unknown actions cannot mutate progress")
	var report = {"kind": "Deterministic authored-state checks, no player/narrative/visual approval", "engine": Engine.get_version_info(), "source_sha256": FileAccess.get_sha256("res://scripts/rpg_story.gd"), "checks": checks, "failures": failures}
	DirAccess.make_dir_recursive_absolute("res://../evidence/rpg")
	var file = FileAccess.open("res://../evidence/rpg/story-checks.json", FileAccess.WRITE)
	if file: file.store_string(JSON.stringify(report, "  ")); file.close()
	print(JSON.stringify(report))
	quit(0 if failures.is_empty() else 1)
