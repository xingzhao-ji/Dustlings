# Neighborhood integration checks

This is actual Godot scene/physics evidence for the RPG opening, not human review. The script is `godot/tests/rpg_integration_checks.gd`; root owns all runtime corrections. No native window was opened by this task.

**Latest integrated result: 45/45 passed**, `evidence/rpg/integration/drained/report.json`, main SHA `b0a5eff777c07730b063eaed9e459c4b58d90616d8959ed6763a3b2dd1b5d941`. Source maps match before/after. Engine log exits 0 without errors/warnings. This closes the reproduced runtime cases below, not native presentation or human acceptance.

**Player benefit:** reliable walking, reachable activities, forgiving interruptions, and returning to an internally consistent saved neighborhood. **Evidence source:** root requested direct integration of the new state/world/UI rather than relying on individual modules. Subsequent corrective work is justified by reproduced engine behavior below. **Bounded implementation:** approximately ten minutes for a headless scene/InputEvent route and collision/modal/reload checks, then a short focused extension for three inspected import risks. **Acceptance:** actual CharacterBody3D movement reaches all initially eligible activities, geometry blocks travel through walls/locked crossing, brushing cannot permanently lose its task, dialogue retains living ambience while stopping accidental input, deliberate pause stops it, and imports/reloads restore the state players see and hear.

## Method

Godot 4.7.2 headless instantiates the real `neighborhood.tscn`. Generated physical-key `InputEvent`s drive its ordinary movement and brushing code. The route does not teleport the player or inject quest advancement during opening/anchor checks. It physically visits the lantern, broken crossing, four residents, home door/interior/bed, workshop, boards and parcel. Fixed FPS runs deterministic engine steps without establishing real-world pacing or performance. Ordinary engine physics/collision and UI Control layouts still execute.

The test deliberately configures a 1280×800 canvas and then a compact 1080×720 canvas. Bounds checks validate node rectangles, not optical composition, physical screen scale, native clipping or comfortable text. A real native review remains necessary.

Scene reloads use a unique QA directory. A separately labelled copy fixture writes a format-valid point inside a house wall to that isolated directory. The reloaded actual scene is checked using a capsule overlap query. Further import fixtures emit the production `FileDialog.file_selected` signal with real saved JSON paths. They exercise the runtime callback and filesystem integration; they do not constitute native OS picker interaction or user input. The later/earlier copy data are explicit progress fixtures.

Each report records source hashes before and after execution, exact results, destinations, positions and QA paths. The initial three reports and final corrected/drained reports have matching source maps; the intermediate collision-route report explicitly records a concurrent root main change and is not proof of a frozen current build. Historical failed reports remain intact.

## Observed results

| Report | Runtime main SHA | Actual outcome |
| --- | --- | --- |
| `evidence/rpg/integration/initial/report.json` | `992eb56bd09726f1e84f0ebb31d316277a47c16e38f74e9e36ae84f8292da4ec` | **29/30**; only environmental animation froze during dialogue |
| `evidence/rpg/integration/wall-recovery/report.json` | `fe0ccaa4ac27b190edd9cb1568180257270f84780429f250efb58fa335238256` | **32/33**; new live wall-overlap recovery passed, dialogue freeze remained |
| `evidence/rpg/integration/import-regressions/report.json` | same `fe0ccaa…` | **34/38**; focused copy callbacks reproduced three additional import defects |
| `evidence/rpg/integration/collision-routes/report.json` | `ad076648…` → `a9530afe…` during run | **39/45**; original four defects fixed, new earlier-copy resident stranding reproduced; five failures cascaded from a test route cutting across the home corner |
| `evidence/rpg/integration/corrected-routes/report.json` | `a9530afe2a55d934630da55177e27ea2495554592539d7696b1307621d1e609b` | **45/45**; explicit street waypoint, physical resident rollback and all current cases pass; accelerated teardown emitted audio leftovers |
| `evidence/rpg/integration/drained/report.json` | `b0a5eff777c07730b063eaed9e459c4b58d90616d8959ed6763a3b2dd1b5d941` | **45/45**, clean exit after correct real-time Dummy audio teardown |

Passed across the applicable route: grounded player contact; ordinary key movement; dialogue blocks incidental walk/brush; dialogue soundscape is active; explicit pause stops audio/decorative time; actual unrepaired bridge blocks at approximately z −3.818; early bridge brushing leaves its patch intact until a companion exists; held brushing forms one 3D helper; all initially eligible resident/prop targets are reachable; home back wall blocks at approximately z 1.921; journal has scrolling; settings/journal/dialogue node bounds fit their specified canvas; exact flags/home and safe position survive a new scene instance.

The wall-recovery fixture loads an accepted copy position (−10,0,1.7) inside the house wall. Root's live fix returns the player to (0,0,9) with zero capsule overlaps and unchanged authored state/home. This is a real collider query, not only bounds validation. It remains a same-process scene reload rather than exported-process/device proof.

## Reproduced defects and verified corrections

1. **Earlier save can hide unfinished dust.** Importing a later copy then an initial copy returns both patch amounts to 1 but leaves both MeshInstance roots invisible. The companion workforce correctly returns from three to zero. Root should rebuild/reset each dust child's visibility from imported amounts, including the root visibility, rather than only hiding completed patches.
2. **Earlier save retains locked destinations.** The same copy sequence returns the bridge flag to false but leaves residents targeting the north neighborhood. Root should reset destinations from the complete current state before applying progressed destinations, and consider physically returning residents stranded across a newly locked crossing.
3. **Imported audio preferences do not reach audio.** Imported settings show music 0, effects 0.2, ambience 0.3, while the actual Soundscape levels remain 0.6/0.75/0.55. Root should apply the mix when applying settings, including imports. This is a numerical engine-state observation; no listening is claimed.
4. **Conversation freezes the living background.** `_panel` pauses world processing for dialogue even though it correctly keeps audio unpaused. The environment's clock stays 0.75 over 30 physics frames. Root should allow environment processing during dialogue while keeping explicit pause/settings stopped. Physical player/resident movement can remain stopped for comfortable conversation.

Root corrected all four in the playable runtime. The current fixture observes visible dust roots after importing an earlier copy, matching displayed/engine audio levels (0/0.2/0.3), environment time advancing during dialogue, and explicit pause stopping it. Resident destinations reset; a longer restoration/import sequence additionally exposed residents physically stranded north after the crossing relocked. Root now restores their positions to the accessible home side on rollback; all four are verified back at their home positions.

The core state and saves passed separate suites (83 authored-state, 44 filesystem cases), but those alone could not close these combined-experience defects. No old story/save suite was repeated solely for the greenhouse title wording change. The independent critic and human players must assess attachment, agency, readable interactions, atmosphere and surprise after integration. Human sessions remain zero.

## Physical inhabitants and route fixture

The updated runtime's player and NPC masks include layer 4. A generated walk directly toward Ivo stops at **0.5702 m** center separation rather than crossing his body. A separately labelled late-state import enables the repaired bridge/shared table, then runs **72 simulated seconds** of actual resident navigation. All four reach their current destinations with gaps below **0.097 m**; minimum resident pair separation observed over the route is **0.9058 m**. These measurements concern this authored route and four-resident fixture, not every possible jam, a large swarm, human comfort or real-time performance.

The initial extended route left the home by walking diagonally through its front corner. That automation became blocked and caused five later anchor assertions to fail from the same position. The report remains preserved. The corrected fixture follows the visible street through (−6,0,7.8), then the plaza, and all initial destinations are reached again. This was a test-route correction, not evidence that the residents or props were inaccessible.

## Teardown diagnostic

The passing accelerated fixture initially reported **14 ObjectDB instances / 6 resources** retained at exit. A verbose follow-up (`teardown-diagnostic/engine.log`) identified synchronized/Ogg playback references for air, brush and water. Merely awaiting `Soundscape.shutdown()` still advanced its timer faster than real time under `--fixed-fps`; the `final/` report preserves that outcome. The test now awaits the existing shutdown and gives the Dummy mixing thread a **650 ms real wall-time drain** before each artificial scene removal. `drained/engine.log` exits cleanly with the same 45 gameplay assertions. Root also added orderly shutdown to the ordinary quit path. These accelerated test diagnostics are not proof of a native gameplay memory leak, and no audio content or mix behavior was changed to hide them.

Exact next action: inspect the corrected behavior in the actual native route and export, keeping these results bound to their source map. In particular, review readable player/NPC contact, conversation background continuity, earlier-save recovery and residents crossing together. Expand testing only for a new failure/change or unverified device/packaged behavior. Keep the failed reports as before evidence.

```sh
.tools/Godot.app/Contents/MacOS/Godot --headless --fixed-fps 60 --path godot --script res://tests/rpg_integration_checks.gd -- --rpg-qa --evidence=/tmp/dustlings-rpg-integration-new-label --integration-evidence=res://../evidence/rpg/integration/new-label
```

The test requires a fresh `--evidence` directory; reusing the directory intentionally resumes its prior fixture and invalidates the opening checks. No game files or legacy ordinary saves are deleted by the test.
