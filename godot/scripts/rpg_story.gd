extends RefCounted
## Authored neighborhood state. No scene references, wall clock, or random rewards.
## All gates live here so exploration order and save recovery remain predictable.

const RESIDENTS = ["mara", "ivo", "nell", "tavi"]
const FLAGS = [
	"met_mara", "met_ivo", "met_nell", "met_tavi", "first_companion",
	"mara_concern", "ivo_concern", "nell_concern", "tavi_concern",
	"bridge_plan", "wood_collected", "bridge_cleared", "bridge_repaired",
	"garden_watered", "melody_learned", "greenhouse_open", "memory_found",
	"glow_unlocked", "alcove_found", "parcel_collected", "map_delivered",
	"map_shared", "herbs_gathered", "shared_table", "recipe_shared",
	"workshop_invited", "garden_invited"
]
var state: Dictionary = {
	"schema": 1, "day": 1, "flags": {},
	"trust": {"mara": 0, "ivo": 0, "nell": 0, "tavi": 0}, "home": "clay"
}

func has(flag: String) -> bool:
	return state.flags.get(flag, false) == true

func _line(speaker: String, text: String, choices: Array = [], changed: bool = false, ok: bool = true, event: String = "") -> Dictionary:
	var result = {"speaker": speaker, "text": text, "choices": choices, "changed": changed, "ok": ok}
	if not event.is_empty(): result.event = event
	return result

func _choice(label: String, action: String) -> Dictionary:
	return {"label": label, "action": action}

func _mark(flag: String) -> bool:
	if has(flag): return false
	state.flags[flag] = true
	_recount_trust()
	return true

func _recount_trust() -> void:
	state.trust = _trust_for(state.flags)

func _trust_for(flags: Dictionary) -> Dictionary:
	# Trust is recognition of specific events, never points farmed by repeat greetings.
	var out = {"mara": 0, "ivo": 0, "nell": 0, "tavi": 0}
	var events = {
		"mara": ["mara_concern", "bridge_repaired", "workshop_invited"],
		"ivo": ["ivo_concern", "map_delivered", "map_shared"],
		"nell": ["nell_concern", "garden_watered", "memory_found"],
		"tavi": ["tavi_concern", "shared_table", "recipe_shared"]
	}
	for id in RESIDENTS:
		if flags.get("met_" + id, false):
			out[id] = 1
			for flag in events[id]:
				if flags.get(flag, false): out[id] += 1
	return out

func interact(id: String) -> Dictionary:
	if id in RESIDENTS:
		var first = _mark("met_" + id)
		match id:
			"mara": return _mara(first)
			"ivo": return _ivo(first)
			"nell": return _nell(first)
			"tavi": return _tavi(first)
	match id:
		"lantern":
			return _line("Old lantern", "Something beneath the dust answers your footsteps." if not has("first_companion") else "Your little companion leans into the lantern's warm glass.")
		"bridge":
			if has("bridge_repaired"): return _line("Willow crossing", "Fresh boards carry two sets of familiar footprints. The neighborhood is connected again.")
			if not has("bridge_plan"): return _line("Willow crossing", "One rail has a careful chalk mark. Someone at the workshop has been measuring this gap.")
			var needs: Array[String] = []
			if not has("wood_collected"): needs.append("salvaged boards by the workshop")
			if not has("bridge_cleared"): needs.append("clear footing for your companion")
			if not needs.is_empty(): return _line("Willow crossing", "Mara's plan needs " + " and ".join(needs) + ".")
			return _line("Willow crossing", "The boards fit Mara's chalk marks. Your companion is ready to steady them.", [_choice("Repair together", "repair_bridge")])
		"wood":
			return _line("Salvaged boards", "Dry, sound wood. Someone has already pulled out the bent nails." if not has("wood_collected") else "A tidy outline remains where you gathered the boards.", [] if has("wood_collected") else [_choice("Gather boards", "collect_wood")])
		"garden":
			return _line("Nell's seedlings", "The soil is pale and dry. A watering can waits beside the bed." if not has("garden_watered") else "The seedlings have lifted their leaves. A tiny companion keeps watch.", [] if has("garden_watered") else [_choice("Water gently", "water_garden")])
		"vine_wall":
			if has("greenhouse_open"): return _line("Open ivy door", "The ivy parts at your approach. Cool air smells of rain on terracotta.")
			if has("melody_learned"): return _line("Ivy wall", "Your companion tilts its head. Through the leaves, three glass bells echo Nell's tune.", [_choice("Hum Nell's melody", "sing_wall")])
			return _line("Ivy wall", "Three small glass bells hang beneath the ivy. When the wind stills, you can almost hear a tune.")
		"greenhouse_memory":
			if not has("greenhouse_open"): return _line("Beyond the ivy", "A faint glimmer lies beyond the glass.", [], false, false)
			if has("memory_found"): return _line("A letter in the light", "‘If the door grows over, sing. Some things remember us longer than we expect.’ — Liora\n\nThe little lantern-moth rests beside your companion.")
			return _line("Moonlit greenhouse", "A sleeping lantern-moth unfolds beside an unopened letter. Your companion answers with a small, curious chirp.", [_choice("Read the letter together", "greenhouse_memory")])
		"alcove":
			if has("alcove_found"): return _line("Mender's alcove", "A child's practice bridge spans a cracked teacup. Someone believed a way across could be made.")
			if has("glow_unlocked"): return _line("Dark alcove", "A tiny bridge is scratched into the lintel. Your companion's light catches something inside.", [_choice("Ask for a little light", "light_alcove")])
			return _line("Dark alcove", "A tiny bridge is scratched into the lintel. The recess is too dark to make out.")
		"home":
			return _line("Your little home", "A room to make your own. The color you choose will stay when you return.", [_choice("Sage curtains", "home_sage"), _choice("Clay curtains", "home_clay")])
		"bed":
			return _line("A quiet evening", "Rest when you like. Nothing here expires while you take your time.", [_choice("Rest until morning", "rest")])
		"parcel":
			return _line("Ivo's parcel", "NELL is written twice on the label. A folded sheet rustles inside." if not has("parcel_collected") else "The parcel is already safely with you." if not has("map_delivered") else "The parcel found its way home.", [] if has("parcel_collected") else [_choice("Carry it for Ivo", "collect_parcel")])
		"herbs":
			return _line("Lemon thyme", "A small basket invites you to take a sprig. Leave the roots to grow." if not has("herbs_gathered") else "Fresh shoots remain for another day.", [] if has("herbs_gathered") else [_choice("Gather a few sprigs", "gather_herbs")])
		"table":
			if has("shared_table"): return _line("The long table", "Four cups, a fifth for you, and one saucer for a very small guest. There is room here.")
			return _line("The long table", "Tavi has set out five cups. The bread is waiting for lemon thyme, and guests need a way across.", [_choice("Prepare the shared table", "share_table")])
		"workshop":
			return _line("Mara's workshop", "Tools are hung at your height now. Mara has left the small workbench clear for you." if has("workshop_invited") else "A lamp illuminates an unfinished little bridge. Mara has kept every failed piece.")
	return _line("", "", [], false, false)

func _mara(first: bool) -> Dictionary:
	var choices: Array = []
	if not has("mara_concern"): choices.append(_choice("The unfinished bridge?", "mara_concern"))
	if has("first_companion") and not has("bridge_plan"): choices.append(_choice("Show her your companion", "mara_plan"))
	if has("bridge_repaired") and not has("workshop_invited"): choices.append(_choice("Could we make something else?", "mara_workshop"))
	if first: return _line("Mara", "New hands. Good. I'm Mara. I mend things. Usually.\n\nThat crossing has been the exception.", choices, true, true, "meet_mara")
	if has("alcove_found"): return _line("Mara", "You found my first bridge? It couldn't hold a beetle. I kept it anyway.\n\nYou can leave your unfinished things here too.", choices)
	if has("workshop_invited"): return _line("Mara", "Nell crossed twice this morning. Said she forgot something. Didn't forget a thing.\n\nYour workbench is ready whenever you are.", choices)
	if has("bridge_repaired"): return _line("Mara", "Listen. Footsteps on sound wood. I'd forgotten how much I missed that sound.", choices)
	if has("bridge_plan"): return _line("Mara", "Sound boards by my wall. Clear the landing, then let your little friend hold the far end.\n\nWe don't need to do everything alone.", choices)
	return _line("Mara", "I can measure the gap. I just can't hold both ends.\n\nThat old lantern has been making the strangest little noises.", choices)

func _ivo(first: bool) -> Dictionary:
	var choices: Array = []
	if not has("ivo_concern"): choices.append(_choice("Why so many maps?", "ivo_concern"))
	if not has("parcel_collected"): choices.append(_choice("I'll carry Nell's parcel", "collect_parcel"))
	if has("map_delivered") and not has("map_shared"): choices.append(_choice("Show me your favorite route", "ivo_map"))
	if first: return _line("Ivo", "Ivo. Courier, route-finder, occasional wrong-turn enthusiast.\n\nI've got a parcel for Nell and a map that insists there's still a bridge.", choices, true, true, "meet_ivo")
	if has("map_shared"): return _line("Ivo", "I've added the crossing back in. And a seat by the water.\n\nUseful maps should include places to stop.", choices)
	if has("map_delivered"): return _line("Ivo", "You got it there? Good. I kept writing ‘tomorrow’ on the label.\n\nCome here. There's a corner of this place the street signs miss.", choices)
	if has("bridge_repaired"): return _line("Ivo", "A direct route! A beautiful, completely unscenic direct route.\n\nNell is just across it. Her parcel's the one with the extra knot.", choices)
	return _line("Ivo", "The long way round is lovely. Not much use when someone is waiting.\n\nNell's parcel is safe by my satchel.", choices)

func _nell(first: bool) -> Dictionary:
	var choices: Array = []
	if not has("nell_concern"): choices.append(_choice("Who planted this garden?", "nell_concern"))
	if has("parcel_collected") and has("bridge_repaired") and not has("map_delivered"): choices.append(_choice("A parcel from Ivo", "deliver_parcel"))
	if has("garden_watered") and has("nell_concern") and not has("melody_learned"): choices.append(_choice("What are you humming?", "nell_melody"))
	if has("memory_found") and not has("garden_invited"): choices.append(_choice("Tell her about the letter", "nell_invitation"))
	if first:
		var greeting = "I'm Nell. Mind the small green ones. They look like weeds until they don't."
		if has("garden_watered"): greeting += "\n\nYou watered them already. Thank you for noticing."
		else: greeting += "\n\nThe can is there, if you feel like staying a moment."
		return _line("Nell", greeting, choices, true, true, "meet_nell")
	if has("garden_invited"): return _line("Nell", "I opened the greenhouse windows this morning. Just a little.\n\nBring your tea there sometime. No need to knock.", choices)
	if has("memory_found"): return _line("Nell", "That light... I haven't seen a lantern-moth since I was small.\n\nDid you find something beyond the ivy?", choices)
	if has("melody_learned"): return _line("Nell", "My mother hummed to things that wouldn't open. Seedpods. Stuck windows. Me.\n\nI heard your companion hum back.", choices)
	if has("garden_watered"): return _line("Nell", "They're standing up straighter. I suppose I am too.\n\nYou didn't pull the crooked one. I'm glad.", choices)
	return _line("Nell", "I can reach the top leaves. The seedlings need someone who remembers to look down.", choices)

func _tavi(first: bool) -> Dictionary:
	var choices: Array = []
	if not has("tavi_concern"): choices.append(_choice("Who's the extra cup for?", "tavi_concern"))
	if not has("shared_table"): choices.append(_choice("Help with the table", "share_table"))
	if has("shared_table") and not has("recipe_shared"): choices.append(_choice("Could you teach me that bread?", "tavi_recipe"))
	if first: return _line("Tavi", "You're here! I'm Tavi. That's a greeting, not an appointment.\n\nI made too much bread again. Someday it'll be exactly enough.", choices, true, true, "meet_tavi")
	if has("recipe_shared"): return _line("Tavi", "Your loaf can be lopsided. Mine always is. It leaves more room for butter.\n\nSave me a seat when you put the kettle on.", choices)
	if has("shared_table"): return _line("Tavi", "Mara stayed for a second cup. Nell brought a flower. Ivo arrived by the short way.\n\nExactly enough bread. Finally.", choices)
	if has("bridge_repaired"): return _line("Tavi", "Now the table can have its people back. Just a little lemon thyme from the garden.\n\nLeave the roots, won't you?", choices)
	return _line("Tavi", "I set their cups out anyway. Seems rude to let a broken bridge decide who's welcome.", choices)

func choose(action: String) -> Dictionary:
	return perform(action)

func perform(action: String) -> Dictionary:
	match action:
		"close": return _line("", "")
		"first_companion":
			return _line("A little beginning", "The dust curls inward. Two bright eyes open.\n\nYour new companion copies your wave, then pats the dusty ground.", [], _mark("first_companion"), true, "first_companion")
		"mara_concern":
			if not has("met_mara"): return _missing("Find Mara at her workshop first.")
			return _line("Mara", "The flood took the old crossing. I rebuilt it in my head a hundred times.\n\nOn the bench, it still has one end missing.", [], _mark("mara_concern"))
		"mara_plan":
			if not has("met_mara") or not has("first_companion"): return _missing("Mara needs to meet you and your little companion first.")
			return _line("Mara", "Well. You can reach where my hands can't.\n\nTake this plan. Sound boards by my wall; brush the landing clear. Then we'll give the village its way across.", [], _mark("bridge_plan"), true, "bridge_plan")
		"collect_wood":
			return _line("Salvaged boards", "Sound wood, light enough to carry. Saved for the crossing.", [], _mark("wood_collected"), true, "wood_collected")
		"clear_bridge":
			if not has("first_companion"): return _missing("Your brush can loosen the dust. A small companion could reach under the rail.")
			return _line("A clear landing", "Your companion nudges the last speck free. Mara's chalk marks are visible again.", [], _mark("bridge_cleared"), true, "bridge_cleared")
		"repair_bridge":
			if not has("bridge_plan"): return _missing("Someone at the workshop has measured this gap. Find their plan first.")
			if not has("wood_collected"): return _missing("The plan calls for the sound boards beside Mara's workshop.")
			if not has("bridge_cleared"): return _missing("Brush the landing clear so the new boards can sit safely.")
			return _line("Willow crossing", "The final peg settles. Your companion gives the rail a proud little tap.\n\nAcross the water, someone has already put the kettle on.", [], _mark("bridge_repaired"), true, "bridge_repaired")
		"mara_workshop":
			if not has("met_mara") or not has("bridge_repaired"): return _missing("Help Mara make the crossing sound first.")
			return _line("Mara", "I cleared you a workbench. Try a color for those curtains at home.\n\nAnd if a piece won't fit, bring it here. We can look at it together.", [], _mark("workshop_invited"), true, "workshop_invited")
		"ivo_concern":
			if not has("met_ivo"): return _missing("Find Ivo by the old signpost first.")
			return _line("Ivo", "My first map had every building and none of the people.\n\nI'm trying to fix that. The parcel's an old drawing of Nell's mother. It's waited too long.", [], _mark("ivo_concern"))
		"collect_parcel":
			return _line("A carefully tied parcel", "Nell's name is written twice. You tuck it somewhere dry.", [], _mark("parcel_collected"), true, "parcel_collected")
		"deliver_parcel":
			if not has("parcel_collected"): return _missing("Nell's parcel is beside Ivo's satchel.")
			if not has("bridge_repaired"): return _missing("The parcel needs a safe, dry route across the crossing.")
			var changed = _mark("map_delivered")
			_mark("met_nell")
			return _line("Nell", "Oh. Mother at the greenhouse. Look, she's wearing the wrong gloves. She always did.\n\nTell Ivo it arrived at the right time.", [], changed, true, "map_delivered")
		"ivo_map":
			if not has("met_ivo") or not has("map_delivered"): return _missing("Help Ivo's parcel reach Nell, then come back to him.")
			return _line("Ivo", "Here. My small map, with all the useful mistakes.\n\nThere's a little bridge carved over a dark recess by the workshop. Too dark for me. Perhaps not for your friend, one day.", [], _mark("map_shared"), true, "map_shared")
		"nell_concern":
			if not has("met_nell"): return _missing("Meet Nell beside the seedlings first.")
			return _line("Nell", "My mother planted the first beds. Liora. She called herself a keeper of things that almost disappeared.\n\nI kept the garden. I let the greenhouse go.", [], _mark("nell_concern"))
		"water_garden":
			return _line("A little care", "Water darkens the soil. The smallest leaves slowly lift toward the light.", [], _mark("garden_watered"), true, "garden_watered")
		"nell_melody":
			if not has("met_nell") or not has("garden_watered") or not has("nell_concern"): return _missing("Stay with Nell a moment. Care for the seedlings and ask about her garden.")
			return _line("Nell", "It's Mother's tune. Three notes, then room for an answer.\n\nShe hung glass bells on the old ivy door. I haven't heard them answer in years. Listen...", [], _mark("melody_learned"), true, "melody_learned")
		"sing_wall":
			if not has("melody_learned"): return _missing("The glass bells wait in the ivy. Their tune feels unfinished.")
			if not has("first_companion"): return _missing("You hum Nell's tune. It needs a small voice to answer.")
			return _line("An answering note", "Your companion holds the last note. The bells answer.\n\nIvy loosens around a forgotten door. Moon-pale glass waits beyond.", [], _mark("greenhouse_open"), true, "greenhouse_open")
		"greenhouse_memory":
			if not has("greenhouse_open"): return _missing("The ivy door is still closed.")
			var changed = _mark("memory_found")
			_mark("glow_unlocked")
			return _line("Liora's letter", "‘Nell — If the door grows over, sing. Some things remember us longer than we expect.’\n\nA lantern-moth touches your companion's brow. A small light stays when it lifts away.", [], changed, true, "glow_unlocked")
		"nell_invitation":
			if not has("met_nell") or not has("memory_found"): return _missing("There is something beyond the ivy Nell hasn't seen in years.")
			return _line("Nell", "She left the door waiting for me. All this time.\n\nWould you come back with me? We can open a window. That will be enough for one day.", [], _mark("garden_invited"), true, "garden_invited")
		"light_alcove":
			if not has("glow_unlocked"): return _missing("Something small lies in the dark. Your companion may learn a way to light it.")
			return _line("The first attempt", "In a cracked teacup sits a child's crooked bridge. Beneath it: MARA, AGE 7.\n\nYour companion lights each tiny plank. A paper star waits beside it, ready for your windowsill.", [], _mark("alcove_found"), true, "alcove_found")
		"tavi_concern":
			if not has("met_tavi"): return _missing("Meet Tavi beside the long table first.")
			return _line("Tavi", "Whoever needs it. Before the flood, that was an easy thing to say.\n\nI'd like it to be easy again. A crossing, a few herbs, people with nowhere urgent to be.", [], _mark("tavi_concern"))
		"gather_herbs":
			return _line("Lemon thyme", "A few fragrant sprigs for Tavi. The roots stay tucked in their bed.", [], _mark("herbs_gathered"), true, "herbs_gathered")
		"share_table":
			if not has("met_tavi"): return _missing("Say hello to Tavi before helping with the table.")
			if not has("bridge_repaired"): return _missing("Tavi's guests need the crossing repaired before everyone can gather.")
			if not has("herbs_gathered"): return _missing("A few sprigs of lemon thyme grow beside Nell's garden. Leave their roots to grow.")
			return _line("A table with room", "Tavi scatters thyme over warm bread. Cups settle into waiting hands.\n\nYour companion curls beneath the fifth chair — yours.", [], _mark("shared_table"), true, "shared_table")
		"tavi_recipe":
			if not has("met_tavi") or not has("shared_table"): return _missing("Share the first table with Tavi, then ask about the bread.")
			return _line("Tavi", "Flour, warm water, thyme. Let it rest longer than you think.\n\nTake my spare kettle home. Next cup's at yours, if you'd like.", [], _mark("recipe_shared"), true, "recipe_shared")
		"home_sage", "home_clay":
			var color = action.trim_prefix("home_")
			var changed = state.home != color
			state.home = color
			return _line("Your little home", "Sage curtains catch the garden light." if color == "sage" else "Clay curtains warm the room.", [], changed, true, "home_changed")
		"rest":
			state.day = mini(int(state.day) + 1, 9999)
			return _line("Morning", "A new morning. Everything you cared for is still here.", [], true, true, "new_day")
	return _line("", "", [], false, false)

func _missing(text: String) -> Dictionary:
	return _line("A little preparation", text, [], false, false)

func journal() -> Array[String]:
	var notes: Array[String] = []
	if not has("first_companion"): notes.append("Brush the old lantern's dust. Something small is stirring.")
	if not has("met_mara"): notes.append("Meet the mender at the workshop.")
	elif has("first_companion") and not has("bridge_plan"): notes.append("Mara might know what your little companion can help with.")
	if has("bridge_plan") and not has("bridge_repaired"):
		if not has("wood_collected"): notes.append("Gather the sound boards beside Mara's workshop.")
		if not has("bridge_cleared"): notes.append("Brush the crossing's landing with your companion.")
		if has("wood_collected") and has("bridge_cleared"): notes.append("Repair the crossing together.")
	if has("met_ivo") and not has("map_delivered"): notes.append("Ivo's parcel belongs to Nell, across the crossing.")
	if has("met_nell") and not has("garden_watered"): notes.append("Nell's seedlings could use a little water.")
	if has("garden_watered") and has("met_nell") and not has("melody_learned"): notes.append("Stay and get to know Nell.")
	# Remember only clues the player earned; never reveal a secret's location/reward early.
	if has("melody_learned") and not has("greenhouse_open"): notes.append("Nell's family tune leaves room for an answer. She remembers glass bells in the ivy.")
	if has("memory_found") and not has("garden_invited"): notes.append("Nell may want to hear about Liora's letter.")
	if has("map_shared") and not has("alcove_found"): notes.append("Ivo noticed a little bridge carved above a dark recess.")
	if has("met_tavi") and not has("shared_table"): notes.append("Help Tavi bring everyone to the table: a crossing and fresh thyme.")
	if has("shared_table") and not has("recipe_shared"): notes.append("Ask Tavi about the bread you shared.")
	if has("bridge_repaired") and not has("workshop_invited"): notes.append("Visit Mara now that the crossing is open.")
	if notes.is_empty(): notes.append("The neighborhood is yours to return to. Visit, wander, or make your home your own.")
	return notes

func export_state() -> Dictionary:
	_recount_trust()
	return state.duplicate(true)

func import_state(data: Dictionary) -> bool:
	# Strict, atomic import. No partial updates or invented advancement after damage.
	if data.size() != 5 or data.get("schema") != 1: return false
	if not data.get("day") is float and not data.get("day") is int: return false
	var day = float(data.day)
	if not is_finite(day) or day != floor(day) or day < 1 or day > 9999: return false
	if not data.get("flags") is Dictionary or not data.get("trust") is Dictionary: return false
	if not data.get("home") is String or data.home not in ["sage", "clay"]: return false
	var flags: Dictionary = data.flags
	for key in flags:
		if key not in FLAGS or not flags[key] is bool or flags[key] != true: return false
	var prerequisites = {
		"mara_concern": ["met_mara"], "ivo_concern": ["met_ivo"],
		"nell_concern": ["met_nell"], "tavi_concern": ["met_tavi"],
		"bridge_plan": ["met_mara", "first_companion"],
		"bridge_cleared": ["first_companion"],
		"bridge_repaired": ["bridge_plan", "wood_collected", "bridge_cleared"],
		"workshop_invited": ["met_mara", "bridge_repaired"],
		"map_delivered": ["parcel_collected", "bridge_repaired", "met_nell"],
		"map_shared": ["met_ivo", "map_delivered"],
		"melody_learned": ["met_nell", "nell_concern", "garden_watered"],
		"greenhouse_open": ["melody_learned", "first_companion"],
		"memory_found": ["greenhouse_open", "glow_unlocked"],
		"glow_unlocked": ["memory_found"], "garden_invited": ["met_nell", "memory_found"],
		"alcove_found": ["glow_unlocked"], "shared_table": ["met_tavi", "bridge_repaired", "herbs_gathered"],
		"recipe_shared": ["met_tavi", "shared_table"]
	}
	for flag in prerequisites:
		if flags.get(flag, false):
			for need in prerequisites[flag]:
				if not flags.get(need, false): return false
	var expected = _trust_for(flags)
	if data.trust.size() != 4: return false
	for id in RESIDENTS:
		if not data.trust.has(id): return false
		if not data.trust[id] is int and not data.trust[id] is float: return false
		if float(data.trust[id]) != float(expected[id]): return false
	state = {"schema": 1, "day": int(day), "flags": flags.duplicate(true), "trust": expected, "home": data.home}
	return true
