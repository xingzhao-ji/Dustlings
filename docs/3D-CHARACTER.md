# Dustling 3D character

Status: an original real-geometry character implementation for the 3D courtyard, awaiting integrated presentation and human validation. This replaces the sprite/Canvas approach for character rendering. It does not establish an accepted creature design, benchmark quality or readiness to sell.

## Integration contract

`godot/scripts/dustling_visual.gd` extends `Node3D` and builds its child visuals in `_ready()`. Root sets `position` and `rotation.y`; the creature faces **+Z**. Its origin is at the ground. Call:

```gdscript
creature.pose(delta, elapsed, speed, working, birth_age, celebrating, gentle_motion)
```

All numeric arguments are floats. `speed` is world units/meters per second, `working` is0–1, and `birth_age` is seconds since formation. The two final arguments are booleans. The function never changes the owner's root transform. There is no embedded camera, sprite, billboard, external art or private simulation.

Resting body diameter is approximately0.46m, with the two-leaf sprout reaching about0.66m. The body sits onto short ochre feet. Dark oval eyes, small light glints and a curved smile face forward. Warm matte cream, slight geometric irregularity and restrained rim lighting aim for a soft seed-like surface; this is a presentation hypothesis, not a fur simulation or human preference result. Normal `StandardMaterial3D.albedo_color = Color(hex)` is retained. Root owns scene lighting and exposure.

## Implemented response

- Birth grows from the ground and unfolds the two leaves; the eyes open after the initial formation.
- Idle breathing, a small curious turn and occasional blinking give quiet life without moving the root.
- Travel uses alternating lifted/stance feet and a brief anticipatory crouch/hop when motion begins.
- Cleaning leans the body and alternates two short hand sweeps.
- Celebration uses a small grounded preparation and readable hop/landing arc, with a slightly larger smile.
- Gentle motion removes hops, reduces sways and shortens the walking lift while retaining readable actions.

Feet are separate from the breathing/body pivot. Each stance foot's center/half-height pair is0.040m/0.040m, so its underside rests at y=0. Intentional airborne poses lift the complete child visual, including feet; the root remains on the ground. A late dimensional correction brought the body/foot volumes into contact, kept resting hands close to the approximately0.48m paired spacing, and kept eye glints attached while blinking. These final proportions still need review at the integrated default camera.

## Bounded work and actual checks

Benefit: make workers readable, grounded and expressive in an actual 3D village. Evidence: the owner's explicit 3D requirement and creature/contact/readability requirements; human sessions remain0. Smallest implementation: one shared procedural character, the requested pose interface, and no new mechanics or content. Initial budget20minutes; render-slot coordination and the shared lighting diagnosis extended this pass. Stop further character polish until integrated evidence identifies a specific defect.

- Godot4.7.2 official (`ed1daf0bf`) parsed the final script successfully.
- A headless fixture instantiated50 characters and performed6,000 pose updates across travel, work, birth, celebration and gentle-motion combinations. Root transforms remained unchanged and all bodies reused the same mesh. Seven geometry submission groups were counted per character. This is a correctness check, not a sustained performance measurement.
- A real OpenGL Compatibility lab on the M4 Pro Mac rendered180 frames of three characters with birth, cleaning and celebration. Total draw calls were27 including floor/shadows; measured minimum foot underside y was0, with no reported runtime error. The reusable model has seven geometry groups, with the body as its only shadow caster. Full-scene draw calls depend on lighting/shadow passes.
- Lab frames at30,90 and180 were inspected. Two leaves, dark eyes, smile, hands and short feet were visible; the initial global lighting clipped cream/stone highlights badly. No dark material workaround was applied. Root independently reproduced the global clipping and is testing Metal/Forward+ lighting. The final small body/foot/eye-glint correction passed parse and50-character pose checks; a final integrated render is still needed.
- The first headless foot-read assertion was invalid because the dummy renderer returned identity MultiMesh transforms. Foot contact was checked with the real renderer instead; the headless report does not claim rendered contact.

Temporary lab captures are `/tmp/dustlings-character-30.png`, `/tmp/dustlings-character-90.png` and `/tmp/dustlings-character-180.png`; they are diagnostic close views, not normal-camera milestone evidence. Root should preserve the final integrated gameplay captures with their build identity. No sound, human enjoyment, aesthetic acceptance or Windows/device support was tested here.

## Next review

Inspect the final character under the integrated Metal/Forward+ scene light at the default camera, including face clarity, body/dust contrast, planting of moving feet, paired spacing and a50-worker crowd. Record real gameplay motion and verify any clipping or silhouette collision before proposing corrections. Ask intended players about appeal, creature readability and whether work/formation/celebration are understandable; report counts and disagreements. Preserve a close view as a design inspection aid, while judging the actual playing view separately.

Godot API references used for implementation: [SphereMesh](https://docs.godotengine.org/en/stable/classes/class_spheremesh.html), [SurfaceTool normals and indexed geometry](https://docs.godotengine.org/en/stable/classes/class_surfacetool.html), and [BaseMaterial3D lighting/material parameters](https://docs.godotengine.org/en/stable/classes/class_basematerial3d.html). API correctness is distinct from presentation quality.
