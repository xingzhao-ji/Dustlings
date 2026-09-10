# Real 3D courtyard environment checkpoint

Date: 2026-09-10. Status: integrated native prototype; **awaiting human validation and owner acceptance**. This replaces the environment implementation for the new fully 3D direction. It does not establish a completed courtyard, benchmark presentation quality, platform certification, or a new zone.

## Purpose and evidence

Player benefit: a miniature village with physical depth, clear ground contact and a landmark whose restoration is visible from the gameplay camera. Evidence is the owner's explicit requirement for fully real 3D, the approved courtyard scope, and the original presentation decisions in [SKY-DIRECTION.md](SKY-DIRECTION.md). There have been zero human playtest sessions. The inviting quality of the proportions, palette and transformation remains a hypothesis.

Smallest implementation: one procedural 3D courtyard, two peripheral houses, an open boundary gate, a bench, planters and one central fountain. No camera, creatures, interface, dust, progression or additional zones belong to this component. This was a bounded environment implementation and integration cycle, followed by focused runtime, collision and material corrections.

## Implemented and integrated contract

`godot/scripts/courtyard_environment.gd` extends `Node3D`; `_ready()` builds the original geometry. The root game owns the camera, lighting, elapsed animation time and restoration progression.

- Ground paving tops are at `y=0`. The usable rectangle is `x=[-7.3,7.3]`, `z=[-4.1,4.7]`. Recessed grout lies approximately 0.025 below the tile tops.
- The fountain is the central circular obstacle, inside radius 1.45. Buildings, bench, border stones and planters remain outside the usable rectangle.
- Static geometry is batched by five material groups. Each batch has exact triangle collision on layer 1. Ground collision has `cleanable=true`; other batches have `cleanable=false`. Animated water and blossoms sit inside already blocked fountain/planter geometry.
- Bevelled solid paving, wall blocks, pitched roofs, closed gables, raised roof ribs, windows, doors, chimney pots, basin rings and stems create real depth. There are no illustration backdrops or texture-only buildings.
- `set_restoration(value)` clamps to 0–1. Water appears after 0.12; curved streams appear after 0.54; flowers become visible after 0.25 and grow most noticeably from 0.35 to 1.0. Vegetation changes from muted to sage, and a restrained local fountain light increases to energy 0.20.
- `set_gentle_motion(enabled)` removes water and plant oscillation. Both this setting and restoration can be set before `_ready()`.
- `tick_environment(delta, time)` updates explicit shader time. There is no autonomous `_process()` or shader `TIME`, so the root can pause the entire scene consistently.
- The 174 flower parts use one `MultiMeshInstance3D`; static materials and repeated source meshes are shared. The implementation does not add a per-frame loop over static geometry.

## Actual checks and corrections

Godot version: **4.7.2.stable.official.ed1daf0bf** on the available Apple M4 Pro Mac host. These are automated host checks and visual inspection of actual native captures, not a representative player test or Windows-device result.

1. `Godot --headless --path godot --script res://scripts/courtyard_environment.gd --check-only` passed after the final source changes.
2. The final component ran in a real Metal Forward+ window at 1280 × 800. Both environment shaders compiled; the run exited normally with no errors or warnings. The isolated scene contained the environment and camera/lights, with no helpers or gameplay UI.
3. A collision grid sampled 493 points, excluding the fountain: zero missed ground rays and zero unexpected blockers. Ground hits ranged from approximately -0.025 to 0.00000048 in height. Five separate rays at the fountain, both houses, bench and a planter all hit `cleanable=false` geometry. This is sampled coverage, not an exhaustive proof of every possible ray.
4. Setting gentle motion produced shader motion values of zero for both water and plants. The restoration fixture produced 174 blossom instances.
5. A single environment-only rendering snapshot reported **23 draw calls and 245,800 rendered primitives**, including render passes. This is a workload observation, not sustained frame-time evidence. The integrated 50-helper scene requires the root's separate performance measurement.
6. Actual rendering exposed a missing gable face, hidden roof ribs, and three runtime-only API/type errors. These were corrected and the final scene re-rendered. Headless parsing alone had not exposed the runtime errors.

The lead's stable integrated evidence is at `evidence/3d/metal-integration/dirty.png`, `busy-fixture.png`, and `restored-fixture.png`; these are automated native gameplay fixtures, including a deliberately injected 50-helper state. They are not records of a player's earned progression. The component's final isolated dirty/restored images and log were handed to the lead from `/tmp/dustlings-environment-{dirty,restored}.png` and `/tmp/dustlings-environment-final.log` for inclusion in the milestone evidence. Do not use an earlier temporary color experiment as the final component capture.

## Color and renderer correction

The first integrated GL Compatibility view clipped pale surfaces enough to lose shape. This was visible in actual native output, not just inferred from color values. The lead changed the renderer to Metal Forward+ and is adjusting shared lighting; that integration work is outside this component's ownership.

A three-swatch unlit GL check measured authored `Color("6e967d")` as `(0.4314, 0.5882, 0.4902)` for both StandardMaterial albedo and vertex color. Explicitly pre-converting that vertex color produced `(0.1451, 0.3020, 0.2000)` and made the swatch too dark. The final environment therefore preserves authored sRGB vertex values and enables `vertex_color_is_srgb` on StandardMaterial batches. Godot documents that this flag affects Forward+/Mobile and is ignored by Compatibility. The two custom shaders use `OUTPUT_IS_SRGB` to apply the conversion only for the linear renderer. This avoids permanently baking a renderer-specific compensation into the palette. See [Godot BaseMaterial3D documentation](https://docs.godotengine.org/en/4.5/classes/class_basematerial3d.html) and [Godot spatial shader reference](https://docs.godotengine.org/en/4.2/tutorials/shaders/shader_reference/spatial_shader.html), inspected 2026-09-10.

Final local inspection shows the restored teal basin, differently colored roof planes, house side shadows and planted borders. These establish visible shape/color differences; they do not establish human aesthetic satisfaction.

## Remaining gaps, ordered by player impact

| Gap and evidence | Smallest next correction/check | Acceptance and remaining uncertainty |
| --- | --- | --- |
| Pale helpers overlap in value with the pale floor in the first integrated 50-helper capture. Material shape improved with Metal, but the worker/floor distinction still needs the lead's lower-light capture. | Inspect the lead's lighting and dust-surface correction at normal gameplay framing, both moving and paused. Preserve authored material colors. | Ground contact, direction and individual silhouettes remain understandable in the busiest scene; unfamiliar players must confirm comfortable tracking. |
| Fountain water/flowers visibly change, but the brief isolated fixture cannot establish an emotionally rewarding restoration. Small blossoms are subtle from the wide camera. | Review the full completion sequence with crew choreography, sound and root camera in the actual current build. Obtain a fresh human response to the earned reveal. | Humans notice what changed, describe the restoration as rewarding, and understand the next opportunity. A still image cannot pass this gate. |
| Repeated paving and regular border planters dominate the wide courtyard. This is an observed repetition and an aesthetic hypothesis, not evidence that players dislike it. | Test the current composition and helper readability before changing ornamentation. If humans find the scene sterile or repetitive, compare one focused paving/plant grouping alternative. | The village feels inviting while cleanup surfaces and crew destinations stay legible. No extra decorative scope is justified yet. |
| Current shadows and water depend on the renderer and shared exposure. GL initially clipped; only the Mac Metal path received this final component render. | Run the same dirty/restored/50-helper fixtures on the first physical Windows target; record GPU, resolution and lighting configuration. | No material clipping, missing shaders, obvious ground separation or rendering errors. Windows and mobile presentation are presently unverified. |
| The component's workload snapshot does not establish 50-helper sustained performance. | Use the lead's bounded integrated frame-time sample, followed by physical target-device checks. | Responsive brushing and legible movement remain stable with the agreed 50-helper cap; report measured conditions rather than extrapolating platform support. |

Exact next action: integrate this component checkpoint, keep the corrected renderer/color convention, inspect the lead's lower-light and shallow-dust native input recording, and use that evidence to resolve the first readability gap before any new environment content. Human experience, presentation and owner-acceptance gates remain open.
