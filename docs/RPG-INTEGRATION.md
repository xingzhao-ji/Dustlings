# Neighborhood integration checks

This is actual Godot scene/physics evidence for the RPG opening, not human review. The script is `godot/tests/rpg_integration_checks.gd`; root owns all runtime corrections. No native window was opened by this task.

**Player benefit:** reliable walking, reachable activities, forgiving interruptions, and returning to an internally consistent saved neighborhood. **Evidence source:** root requested direct integration of the new state/world/UI rather than relying on individual modules. Subsequent corrective work is justified by reproduced engine behavior below. **Bounded implementation:** approximately ten minutes for a headless scene/InputEvent route and collision/modal/reload checks, then a short focused extension for three inspected import risks. **Acceptance:** actual CharacterBody3D movement reaches all initially eligible activities, geometry blocks travel through walls/locked crossing, brushing cannot permanently lose its task, dialogue retains living ambience while stopping accidental input, deliberate pause stops it, and imports/reloads restore the state players see and hear.

## Method

Godot 4.7.2 headless instantiates the real `neighborhood.tscn`. Generated physical-key `InputEvent`s drive its ordinary movement and brushing code. The route does not teleport the player or inject quest advancement during opening/anchor checks. It physically visits the lantern, broken crossing, four residents, home door/interior/bed, workshop, boards and parcel. Fixed FPS runs deterministic engine steps without establishing real-world pacing or performance. Ordinary engine physics/collision and UI Control layouts still execute.

The test deliberately configures a 1280×800 canvas and then a compact 1080×720 canvas. Bounds checks validate node rectangles, not optical composition, physical screen scale, native clipping or comfortable text. A real native review remains necessary.

Scene reloads use a unique QA directory. A separately labelled copy fixture writes a format-valid point inside a house wall to that isolated directory. The reloaded actual scene is checked using a capsule overlap query. Further import fixtures emit the production `FileDialog.file_selected` signal with real saved JSON paths. They exercise the runtime callback and filesystem integration; they do not constitute native OS picker interaction or user input. The later/earlier copy data are explicit progress fixtures.

Each report records source hashes before and after execution, exact results, destinations, positions and QA paths. Every run below completed with matching before/after source maps. Historical failed reports remain intact.

## Observed results

| Report | Runtime main SHA | Actual outcome |
| --- | --- | --- |
| `evidence/rpg/integration/initial/report.json` | `992eb56bd09726f1e84f0ebb31d316277a47c16e38f74e9e36ae84f8292da4ec` | **29/30**; only environmental animation froze during dialogue |
| `evidence/rpg/integration/wall-recovery/report.json` | `fe0ccaa4ac27b190edd9cb1568180257270f84780429f250efb58fa335238256` | **32/33**; new live wall-overlap recovery passed, dialogue freeze remained |
| `evidence/rpg/integration/import-regressions/report.json` | same `fe0ccaa…` | **34/38**; focused copy callbacks reproduced three additional import defects |

Passed across the applicable route: grounded player contact; ordinary key movement; dialogue blocks incidental walk/brush; dialogue soundscape is active; explicit pause stops audio/decorative time; actual unrepaired bridge blocks at approximately z −3.818; early bridge brushing leaves its patch intact until a companion exists; held brushing forms one 3D helper; all initially eligible resident/prop targets are reachable; home back wall blocks at approximately z 1.921; journal has scrolling; settings/journal/dialogue node bounds fit their specified canvas; exact flags/home and safe position survive a new scene instance.

The wall-recovery fixture loads an accepted copy position (−10,0,1.7) inside the house wall. Root's live fix returns the player to (0,0,9) with zero capsule overlaps and unchanged authored state/home. This is a real collider query, not only bounds validation. It remains a same-process scene reload rather than exported-process/device proof.

## Reproduced open defects at this checkpoint

1. **Earlier save can hide unfinished dust.** Importing a later copy then an initial copy returns both patch amounts to 1 but leaves both MeshInstance roots invisible. The companion workforce correctly returns from three to zero. Root should rebuild/reset each dust child's visibility from imported amounts, including the root visibility, rather than only hiding completed patches.
2. **Earlier save retains locked destinations.** The same copy sequence returns the bridge flag to false but leaves residents targeting the north neighborhood. Root should reset destinations from the complete current state before applying progressed destinations, and consider physically returning residents stranded across a newly locked crossing.
3. **Imported audio preferences do not reach audio.** Imported settings show music 0, effects 0.2, ambience 0.3, while the actual Soundscape levels remain 0.6/0.75/0.55. Root should apply the mix when applying settings, including imports. This is a numerical engine-state observation; no listening is claimed.
4. **Conversation freezes the living background.** `_panel` pauses world processing for dialogue even though it correctly keeps audio unpaused. The environment's clock stays 0.75 over 30 physics frames. Root should allow environment processing during dialogue while keeping explicit pause/settings stopped. Physical player/resident movement can remain stopped for comfortable conversation.

The core state and saves pass their separate suites (83 authored-state, 44 filesystem cases), but they cannot close these combined-experience defects. The independent critic and human players must assess attachment, agency, readable interactions, atmosphere and surprise after integration. Human sessions remain zero.

Exact next action: root implements the four targeted corrections; rerun this script with a fresh QA path and new evidence subdirectory, inspect actual gameplay/import behavior in the native game, then preserve the updated source-bound report. Do not replace the failed reports with a passing one.

```sh
.tools/Godot.app/Contents/MacOS/Godot --headless --fixed-fps 60 --path godot --script res://tests/rpg_integration_checks.gd -- --rpg-qa --evidence=/tmp/dustlings-rpg-integration-new-label --integration-evidence=res://../evidence/rpg/integration/new-label
```

The test requires a fresh `--evidence` directory; reusing the directory intentionally resumes its prior fixture and invalidates the opening checks. No game files or legacy ordinary saves are deleted by the test.
