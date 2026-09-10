# Ground contact and Ivo encounter — first animation pass

Status: implemented and checked as headless transforms; awaiting matched native motion inspection and human feedback. This is a bounded correction within the existing neighborhood, not a finished animation-quality claim. Art direction follows `RPG-ART-DIRECTION.md` and the shared Bellwether board; no new assets or destinations were added.

## Benefit and evidence

Players should see people carrying their weight across the miniature world and attending to a real object/person. The selected art-direction gap concerns the upright, similar resident rhythms in actual integrated footage at 2–16s and 41–48s. Source inspection found that boots previously followed a local sine regardless of the ground traveled, and map props faded by shrinking whenever conversation started. These are developer observations, not player approval.

The smallest correction replaces the common foot trajectory and gives Ivo's existing map encounter one purposeful sequence. Root retains camera, movement, collision, tool integration and all other scene ownership.

## Implemented

- The 1.10m gait cycle advances with supplied travel speed. A stance boot retains a world-space contact while the body travels over it; a lifted swing advances to the next contact. Separate trouser shapes connect hip and ankle. Stops settle a lifted boot without sliding planted boots back to a display pose; rapid reversals use bounded recovery steps.
- First real animation tick captures contacts after root has placed and rotated the actor. Root found crossed stationary boots in an intermediate capture because the previous pass captured contacts before the avatar's PI turn. The fix has a 300-frame stationary regression.
- Ivo looks over the existing full-size map, notices attention with a small brow/hand beat, looks toward the player, and returns to the map. The left grip derives the map transform from the actual posed hand; the other hand can gesture. His map remains present during walking and dialogue.
- Existing five identities, other resident activities, gentle motion and the public `animate` signature are preserved.

Optional integration APIs:

```gdscript
set_attention(world_target: Vector3, amount: float = 1.0)
clear_attention()
get_hand_position(right: bool = true) -> Vector3
```

Root should supply the nearby player's head position and clear attention when they leave. The hand hook returns the actual `HandShape` global center after posing; it supplies a physical tool endpoint without adding tool IK in this pass.

## Verification

Godot 4.7.2 on the Mac host, headless, explicit actor translation at 60Hz. `godot/tests/rpg_actor_checks.gd`: **25/25 checks pass**, clean engine log. Source SHA256 `0c7fccb5c4c7fc8ece4010ff1b34602182e00ac7a39c867a294e6f3a33be8854`. Evidence: `evidence/rpg/actor/pose-checks.json` and `pose-checks.log`.

| Speed | Sampled planted frames | Maximum planted drift/frame | Lowest actual boot ellipsoid | Maximum foot travel/frame |
| --- | ---: | ---: | ---: | ---: |
| 0.85m/s | 316 | 0m | 0m | 0.0558m |
| 1.6m/s | 309 | 0m | 0m | 0.1032m |
| 2.6m/s | 301 | 0m | 0m | 0.1717m |

Checks also cover two-foot/two-eye identity, rapid reversals, interrupted strides, still boots after stopping, save relocation, actual hand coordinates, a 240-frame idle/notice/conversation/return sequence, no invisible or scaled map frames, and gentle-motion map preservation. Left map grip error was 0m; sampled idle right grip error was 0.000066m. These measure transforms and geometry bounds, not comfort, performance or appeal.

## Exact next inspection

Root captures the source above with matching normal-size gameplay views: stationary arrival; slow/normal walk; short repeated stops and reversals; Ivo from approach through dialogue dismissal; and brushing with the new hand endpoint. Inspect sole contact, coat/leg intersection, swing speed, map readable orientation, hand contact and gaze. Compare steady footstep timing to the audio distance events: the shared 1.10m cycle alone does not prove first-step synchronization. No listening check has been performed here.

The first implementation still uses the existing rounded single-segment arms/legs. Its expressiveness, naturalness, transition comfort and resemblance to the intended crafted atmosphere require actual motion and human review. Human sessions remain zero; owner approval is pending. Other residents' generic activity transitions and physical tool reaches are outside this focused pass and remain candidate gaps after the representative encounter is reviewed.
