# The opening neighborhood: narrative implementation

The owner's new RPG direction supersedes the former cleanup-only scope. This file describes the first neighborhood's implemented story state, not a claim of a complete RPG or a human-approved narrative. Stardew Valley informs attachment to people and place; Sky informs sensory care. Dustlings' fiction, residents, dialogue and discoveries are original. Human narrative sessions: **0**.

## Purpose and evidence

**Player benefit:** restoration creates reasons to know people, return to familiar places, and use companions beyond a cleaning task. Specific acts of care earn new conversations and invitations; greetings cannot farm affection. The repaired crossing connects four personal concerns to one visible shared accomplishment.

**Available evidence:** the owner explicitly requested an on-foot RPG with four substantial residents, lasting world consequences, an earned secret and useful companion ability. These are requirements, not observations that this particular cast or writing works. The old cleanup footage cannot validate these new relationships.

**Smallest useful implementation / budget:** one deterministic, UI-independent story module, four short resident arcs, a coherent crossing project, one greenhouse secret and a smaller follow-on discovery. Initial story/testing pass bounded to approximately 15 minutes; integration, cinematic timing, actual motion inspection and player judgment are separate work.

**Observable acceptance:** the integrated game must let players pursue garden care, home color, courier help and social conversations in varied order. The crossing must physically enable a new route and resident life; the greenhouse must open only after learning its melody through care and conversation. The light ability must expose an actual previously hidden alcove. Save/load must retain these choices and rewards. Human reviewers must be able to describe who each resident is, what changed through their help, and why they would return.

## Four residents and their first arcs

| Resident | Concern conveyed through dialogue and activity | Meaningful act | Lasting reward / reaction |
| --- | --- | --- | --- |
| Mara, workshop mender | Keeps incomplete pieces; can measure a broken crossing but cannot hold both ends | Bring a living dust companion, salvage sound boards, clear the footing, repair together | Opens a workbench invitation; comments on residents using the route; responds to a hidden childhood model |
| Ivo, courier and map maker | His exact building maps have missed the people waiting for deliveries | Carry the overdue drawing to Nell after the crossing is safe | Shares a personal route clue about an unlit recess; starts marking places to stop on his maps |
| Nell, gardener | Tends her mother Liora's garden while avoiding the overgrown greenhouse | Water the seedlings, ask who planted the garden, learn the family melody, return with the letter | A personal greenhouse invitation; later dialogue describes opening its windows again |
| Tavi, baker and host | Keeps setting out cups while the bridge separates friends | Gather a few herbs without uprooting them, reconnect the neighborhood, prepare the table | Bread recipe / spare kettle for the player's home; offers a return visit; recognizes each resident's presence |

Personal conversations grant one recognition event each. Care, delivery, restoration and invitations grant distinct recognition events. `state.trust` is derived from those flags and capped by authored events, not currency. No friendship decay, deadline, daily gift loop or missable dialogue is implemented. Repeat actions are safe and reward-free. The day advances only when the player deliberately rests.

## Discovery sequence and clue fairness

1. Before any unlock, inspecting the ivy wall describes three glass bells and an unfinished tune. It offers no secret action or map marker.
2. After meeting Nell, hearing about Liora and watering her seedlings, the player can ask about Nell's humming. She teaches a short family melody and mentions glass bells on the ivy door.
3. The earned tune and a dust companion let the player hum at the wall. The companion completes the answer and the ivy door opens.
4. In the greenhouse, reading Liora's letter wakes a lantern-moth. The encounter gives the companion a small persistent light.
5. Returning to Nell unlocks a personal invitation. Independently, Ivo's completed courier arc provides a clue to a dark recess. The new light reveals Mara's childhood bridge model and a paper star for the player's home.

The journal retains only earned clues; it does not identify the greenhouse, moth, light reward or alcove in advance. It remains possible to find the small recess by observation without Ivo's clue. Hearing the family melody can occur before finding the first companion; using it requires the companion, with a contextual reason and no consumed item.

## Integration contract

Owned implementation: `godot/scripts/rpg_story.gd`. Test: `godot/tests/rpg_story_checks.gd`. Root owns scenes, controls, geometry, UI, visual consequences, audio and disk persistence.

```gdscript
var story = preload("res://scripts/rpg_story.gd").new()
story.state # schema/day/flags/trust/home dictionary
story.has("bridge_repaired") # convenience, missing flags are false
story.interact("nell") # marks the first meeting, returns authored response
story.choose("nell_melody") # same gate enforcement as perform
story.perform("water_garden")
story.journal() # Array[String], earned goals/clues
story.export_state() # deep copy
story.import_state(dictionary) # strict, atomic, bool
```

Responses contain `speaker`, `text`, `choices` (`[{label, action}]`), `changed`, and `ok`. Important actions also return `event`. **Use `changed && ok` to trigger advancement effects**: an idempotent repeated action still includes its event name for consistent semantics but must not replay acquisition animation or award anything again. Dialogue may reopen for inspection without repeating rewards.

Interaction IDs: `mara`, `ivo`, `nell`, `tavi`, `lantern`, `bridge`, `wood`, `garden`, `vine_wall`, `greenhouse_memory`, `alcove`, `home`, `bed`, `parcel`, `herbs`, `table`, `workshop`.

Physical actions root triggers when their actual interaction completes:

| Action | Gate / result |
| --- | --- |
| `first_companion` | Marks first dust formation; root must show brushing → formation → first response |
| `collect_wood` | One salvaged bundle; may be collected before speaking to Mara |
| `clear_bridge` | Requires companion; root must finish actual bridge brushing |
| `repair_bridge` | Requires Mara's plan, wood, cleared footing; connects village |
| `water_garden` | May happen before meeting Nell; she acknowledges it |
| `collect_parcel` / `deliver_parcel` | Pickup anywhere in sequence; delivery requires repaired crossing and introduces Nell if needed |
| `gather_herbs` / `share_table` | Herbs may be gathered early; table requires meeting Tavi and restoring crossing |
| `sing_wall` | Earned melody + companion opens greenhouse |
| `greenhouse_memory` | Open greenhouse grants letter and glow in one transaction |
| `light_alcove` | Glow unlocks model, Mara's extra reaction and home star |
| `home_sage` / `home_clay` | Persistent curtain color |
| `rest` | Advances day, no deadlines or progress reset |

Conversation actions rendered directly from response choices: `mara_concern`, `mara_plan`, `mara_workshop`, `ivo_concern`, `ivo_map`, `nell_concern`, `nell_melody`, `nell_invitation`, `tavi_concern`, `tavi_recipe`. `close` returns an empty response. Unknown IDs/actions fail without changing state.

`state.flags` persists only known true boolean flags. The import rejects unknown keys/schema, false or mistyped flags, noninteger/nonfinite/out-of-range days, unrecognized home colors, forged trust totals, and inconsistent progress prerequisites. All edits are validated before replacing live state. Root's save namespace must remain separate from the preserved cleanup build. Spatial proximity is root's responsibility: this module intentionally has no scene position and cannot enforce that the player stands beside a prop.

## Actual verification and unresolved integration work

Godot 4.7.2 headless deterministic tests passed **83/83** on the first implementation, report `evidence/rpg/story-checks.json` (contains exact script SHA). Checks cover every substantial premature action, all four introductions, repeated greetings/concerns and repeated rewards, twelve different exploration orders, every resident's authored arc, journal secrecy, actual JSON round trip, deep-copy isolation, and twelve damaged/inconsistent-save cases. This proves state logic only; actions in the test are direct calls, not physical player controls.

Required visible consequences for the integration team: bridge geometry and resident crossings; Nell's greenhouse visit after invitation; shared table seating; usable workbench invitation; home kettle for `recipe_shared`; home paper star for `alcove_found`; curtains visibly change; lantern-moth encounter and companion light; glow reveals actual alcove contents. If these are absent, their dialogue remains an unfulfilled promise and the milestone is unfinished.

No game motion, audio or current screenshots were evaluated by this story task. There is no claim that the cast is appealing, dialogue moving, discovery surprising, or the neighborhood worth inhabiting. The independent critic should inspect the integrated route without being asked to approve it. Representative humans and the owner must assess the current experience separately.

Next narrative observation: ask an unfamiliar player, after ordinary uninterrupted play, which resident they want to revisit and why; what they believe caused the greenhouse to open; whether any request felt like an errand or a wall of text; and whether the new light made them curious about an already-seen place. Record actual build and participant segment. Preserve disagreements instead of turning a single preference into a broad verdict.
