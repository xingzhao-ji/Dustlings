# Bellwether neighborhood — world and characters

Status: first integrated RPG environment/character implementation, **awaiting actual human validation**. The user's RPG direction supersedes the earlier cleanup-only zone restriction. This document concerns one opening neighborhood, not an expanded campaign or a quality verdict. Stardew's attachment to residents/place and Sky's sensory cohesion are references; neither benchmark is claimed achieved. Human participants: 0. Figma remains unavailable.

## Bounded implementation

Owner: `rpg_world`, coordinated by the root lead. Files: `godot/scripts/rpg_environment.gd`, `godot/scripts/rpg_actor.gd`, this document and the scripts' generated UID companions. Initial pass plus integration corrections: one bounded production cycle, approximately 25 minutes. Existing courtyard, companion design, audio and materials were reused or preserved; no old gameplay source was edited.

Benefit: give the player real places to enter, residents distinguishable at walking distance, and visible changes corresponding to conversation rewards. Evidence: explicit new user requirements, followed by actual integrated captures and a native engine physics query. Appearance and emotional attachment remain hypotheses requiring player observation.

Smallest integrated implementation: one connected flat neighborhood with a cutaway home and workshop, physically blocked broken bridge, accessible northern garden, vine-sealed greenhouse and secluded bench alcove. Actual 3D rounded geometry and manual broad colliders permit comfortable walking without vegetation snags. Story changes reveal repaired bridge planks, flowers growing from their own bed positions, curling gate vines, a softly lit greenhouse, tea on the shared table, sage/clay home curtains and rug, a recipe kettle and a found paper star. An actual old lantern beside the opening dust changes to warm glass when the first companion appears.

Five humanoid silhouettes use one original rounded visual language: player coat/scarf/satchel; Mara's apron and tied hair; Ivo's soft cap, glasses and waistcoat; Nell's garden hat and pockets; Tavi's swept hair and courier bag. Faces have eyes, blinks, small smiles and conversation head/hand motion. Walking alternates feet and arms; breathing stays subtle. Feet rest at ground y=0, world travel belongs to the lead's CharacterBody. These are procedural original assets; they have not received a finished-character or attachment verdict.

## Integration contract

`rpg_environment.gd` extends the existing environment only to reuse material and geometry constructors. It replaces scene construction and uses its own animation; do not call inherited `set_restoration()`, whose fountain arrays belong to the old courtyard. `set_gentle_motion()` remains valid for water and plants. Tree pause pauses the world process.

- `get_spawn()` returns `(0,0,9)`.
- `set_story(state)` reads `state.flags` and `state.home`.
- Flags: `bridge_repaired`, `garden_watered`, `greenhouse_open`, `shared_table`, `recipe_shared`, `alcove_found`, `first_companion`.
- Home: `clay` or `sage`, matching the authored curtain choice.
- World collision layer 1; room walls additionally layer 2 for camera obstruction. Manual primitives are separate from visual plants, tiny props and seams.
- Full physical map x[-18,18], z[-18,16], flat y=0. The canal spans z=-5; solid banks and missing crossing prevent bypass. Bridge repairs remove its crossing barrier. Greenhouse gate becomes traversable on the matching flag.
- Root owns player, residents, lighting, camera, companions, save, dialogue and audio. No native window was launched by the world agent.

| Anchor | Position (x,y,z) | Physical referent |
| --- | --- | --- |
| home | -10,0,6.2 | Open home doorway |
| wardrobe | -11.6,0,3.8 | Wardrobe inside home |
| workshop | 10,0,1.6 | Workshop doorway |
| wood | 7,0,3.4 | Workshop offcuts |
| parcel | 7.2,0,2.8 | Tied parcel |
| delivery | -2,0,3 | Ivo's initial neighborhood position |
| bridge | 0,0,-3.25 | South bridge approach |
| garden | -4.6,0,-8.0 | Watering can approach |
| herbs | -6.4,0,-9.2 | Herbs outside solid raised beds |
| vine_wall | 12,0,-9 | Greenhouse vine doorway |
| greenhouse_memory | 12,0,-13 | Front of memory table |
| alcove | -12,0,-11.7 | Secluded bench approach |
| shared_table | -3,0,-10.7 | Garden table approach |

Resident initial points: Mara(8,0,2), Ivo(-2,0,3), Nell(-4,0,-2), Tavi(-6.3,0,2). The originally proposed Tavi(-7,0,2) intersected the home's side wall; a real capsule query detected it and root moved Tavi. Post-bridge residents are controlled by root; avoid placing Nell atop the watering-can action or a solid raised bed.

`rpg_actor.gd`: `configure(kind)` accepts `player/mara/ivo/nell/tavi` before or after adding to tree. `animate(delta,speed,talking=false,joy=false)` moves children only. +Z is forward, feet origin y=0. The owner rotates/translates the root.

## Observed checks and corrections

- Godot 4.7.2 headless editor import passed without diagnostics.
- Actual engine instantiation built the complete world, 13 anchors and all five actor configurations. Repeated walking/talking/joy poses and full story state application completed without diagnostics. Bridge/vine collision layers switched from blocking to open; authored curtains, kettle and star state applied.
- A real Godot physics query used a capsule radius .28m, height 1.5m, foot clearance .02m. Initial 26-case pass had one failure: Tavi's proposed point inside the home wall. Corrected point produced **26/26**, including 15 approach points, five blocked bridge positions, five repaired crossing positions and the opened greenhouse doorway. Queries are not proof of human movement comfort.
- Inspected actual root captures `evidence/rpg/neighborhood-first/arrival.png` and `neighborhood-route-first/home-interior.png`. The first showed the authored lantern reference had no physical lantern; root identified it and a real lantern was added. The second showed the front door beam crossing the avatar's crown. The beam is now cut away consistently with the front roof, retaining colored doorway posts and avoiding a forced camera zoom to roughly 1.5m. Root must capture the matched entry again to verify the actual correction.
- Root identified the old garden action at an empty walkway. It is now anchored to the visible watering can, outside blocked beds. Root's route and resident positioning must use the new anchor.

## Remaining human and integration checks

Actual gameplay review still needs to verify the corrected entry frame, reachable contextual actions, home reward visibility, a representative crowd, sustained rendering cost, facial appeal, scale, environmental variety and comfort. The first wide capture exposes uniform perimeter trees, broad empty grass and grid paving; this is a concrete presentation gap for independent review, not an excuse to declare completion or retune without a bounded comparison. Interaction and resident reaction timing belong to integrated motion review. None of these engine checks establish relaxation, attachment, delight, surprise or desire to return.

## Follow-up: visible resident activities and Gentle motion

A second bounded eight-minute pass addresses the lead/critic's observation that the first integrated residents stand without an apparent purpose. Benefit: communicate what each person cares about before opening dialogue. Small implementation: `set_activity("mend"|"map"|"tend"|"knead"|"tea"|"")` adds one matching held repair piece, folded map, seedling, bread basket or cup, with a restrained gaze and hand pose. The lead chooses each resident's activity at an arrived destination. Walking and speaking smoothly blend the pose away; the visible prop fades with it. This does not claim a full daily schedule or a substantial relationship improvement.

`set_gentle_motion(bool)` removes incidental body bob, scarf motion and idle head swivel while preserving planted foot animation and readable action poses. Repetitive work gesture amplitude is reduced. NPC faces and silhouettes are retained.

The actual headless engine checked all five configurations through all five activity transitions, dialogue, walking, unsupported-action fallback and Gentle motion. **125/125 checks passed**: one active prop, downward attention to the object, no carried work prop after conversational/walking transition, no Gentle body bob or scarf sway, distinct feet and grounded resting feet. Probe: `/tmp/dustlings-rpg-activity-check.gd` in this session. These deterministic checks do not replace the required actual integrated motion inspection. Next action: lead captures residents at their activity positions and entering conversation; critic checks prop scale, hand contact, readability and whether the neighborhood feels more inhabited. Human attachment and comfort remain untested.

## Follow-up: make discoveries tangible and repair visible

A third bounded ten-minute pass responds to the actual integrated `neighborhood-route-corrected/greenhouse.png` and `alcove.png` captures. The greenhouse text described a sleeping lantern-moth while the scene contained only its music box. The alcove text described a child's bridge in a cracked cup while the scene showed an ordinary bench and ground rings. Benefit: curiosity produces an observable encounter and keepsake, rather than dialogue describing absent art.

A small original real-3D moth now rests on the greenhouse music box: paired fore/hind wings, pale wing marks, antennae, little eyes and a soft body. `memory_found` unfolds its wings, lifts it 32cm and gently increases its localized light. Motion is quiet; Gentle mode limits ongoing hover to under 9mm peak-to-peak. It does not turn the daytime neighborhood into night. The lead is correcting the unsupported moonlit wording.

Beside the secluded bench is a low, shaded stone recess containing a cracked cup, a visibly crooked five-plank miniature bridge and a paper star. `alcove_found` warms that recess and removes the found star there, while the existing home reward displays it. The discovery stays inside the approved opening and grants no new campaign feature.

Fresh `bridge_repaired` transitions now settle the ten new planks sequentially over 2.8 seconds. Collisions open immediately, preserving input responsiveness. An initial saved repaired state displays its finished planks immediately; repeated story synchronization cannot restart the animation. Gentle mode reduces height and rotation during settling.

A concrete geometry defect found during this pass also obscured the actual canal water: its bed box top was +0.03m, above the water at +0.003m. The bed top is now -0.04m. This changes no walking collision or progression, and makes the existing water surface visible.

Actual Godot headless verification: **27/27** reveal/load tests, including the full 2.8-second timeline, repeated synchronization, immediate crossing collision, loaded-state behavior, final poses, awake moth, source/home star consistency and Gentle hover bound. The existing **26/26** capsule approach/bridge/gate query still passes after the alcove prop addition. Probe: `/tmp/dustlings-rpg-reveal-check.gd`. The world still needs matched native captures and motion inspection; these numerical checks do not establish that the discoveries feel surprising or emotionally satisfying.

## Art-direction cycle01: arrival material and ground hierarchy

Read the shared `RPG-ART-DIRECTION.md` and its Bellwether board before producing this ten-minute candidate. The selected evidence is the independent arrival diagnosis at 2–11 seconds in `neighborhood-integrated/route.mp4`: equal small-square paving, flat grass and similarly lit planes compete with the lantern and residents. Root owns light, camera and acting; this pass changes only arrival materials/plaza visuals and existing perimeter canopies.

The same plaza footprint now uses fewer, larger staggered slabs with 16mm joints instead of 32mm square joints. Warmth is concentrated gently along the center lane. All anchors and physical walking/collision geometry stay unchanged. Tree count and trunk positions stay unchanged; the same four canopy volumes vary in overlap, height, width and cool green tone along the perimeter. The discovery alcove's trees retain their prior shape.

`rpg_surface.gdshader` replaces the existing ground, stone and wood batch materials without adding batches. Within a softly bounded arrival area, stone gains quiet mineral variation, plaster a broad matte response, wood restrained directional fibres and grass broad cool value variation. Grain uses static world/mesh coordinates and projected-frequency filtering. It has no time or screen-space noise, no animated normal detail and no added lights or obstacles. Outside that candidate region, the prior solid material values are retained. This is a material hypothesis for actual matched capture review; it is not an owner or player verdict.

Headless results: the shader resource loads and exposes its material-kind uniform; the actual scene instantiates with **six existing static batches**, **80 collision bodies**, **13 anchors** and **133,580 static triangles**. The real capsule approach/bridge/gate query remains **26/26**. This headless check does not establish native GPU appearance or lack of shimmer. The lead's exact next step is the matched arrival/Ivo location capture plus a camera orbit; the independent critic receives only media/source/method for the first comparison, before this developer explanation. Human attention, comfort and aesthetic preference remain untested.
