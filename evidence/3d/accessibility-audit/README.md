# Settings feedback evidence

The source-only audit found save-copy outcomes written to a hidden world hint. The lead authorized isolated native reproduction, a narrow patch and merged-source verification. `docs/3D-ACCESSIBILITY-AUDIT.md` records findings, limits and next actions.

`main.patch` contains the initial Settings status/focus proposal and minimum-window spacing condition. A later focused input sequence found its typed deferred-focus argument could fail before the validity guard; the lead corrected that and the world/HUD handoff. `main-focus-final.gd` is the final tested generation. `prepare-candidate.py` produces the historical proposal from the exact hash-checked frozen Main and deliberately refuses a changed canonical source. Do not apply the old proposal over the corrected game.

Runs use native Godot 4.7.2 Metal on M4 Pro, unique cache saves and ephemeral locks. The probe converts only the picker surface to embedded Godot UI and emits selected/cancelled signals through the actual production closures. It does not operate a physical OS file picker. No ordinary save is touched.

- `baseline/`: 119/133 pass; 14 hidden-feedback failures.
- `candidate-initial/`: 132/133 pass; one minimum-window clipping failure. Its exact Main is preserved there.
- `candidate/`: 133/133 pass after Settings-only responsive spacing.
- `integrated/`: 133/133 pass after lead merges the patch with separate recap/hint changes.
- `valid-import-initial/`: probe-only serialization assertion failure; process terminated. Do not count this as a runtime regression or a passing run.
- `valid-import/`: separate 10/10 valid-load/deferred-free/focus checks pass; started audio shuts down cleanly. This uses the subsequent QA-only ritual-assertion source.
- `focus-before/`: 7/10; D/Enter tool conflict and arrow routing fail, plus one real freed-Control deferred-conversion diagnostic.
- `focus-after-initial/`: 20/21; world handoff/free guard corrected, but no-focus Tab entry fails.
- `focus-after-entry-only/`: 21/23; first Tab enters Settings, but default traversal cannot cross HUD root containers. All ten modal controls traverse correctly.
- `help-before/`: 1/4; Help opens without focus and neither Enter nor Tab recovers it in this generated input path.
- `help-after/`: 5/5; explicit Back focus and native Help navigation pass, on the pre-HUD-link source.
- `focus-after-combined-space/`: 27/28; the remaining failed combined expectation is a probe issue, because activating Brush intentionally hands off to world aiming.
- `focus-after/`: final 30/30 on Main `8864aa55…`; full forward/reverse HUD traversal including the newly available bell, modal confinement, intentional input handoff and eight valid-import/free cycles pass without diagnostics.

The 960×640 native window produces a 960×600 captured canvas with logical dimensions 1080×675. The 1280×800 window produces a 1280×800 canvas, logical 1440×900. Images show the actual game renderer behind the paused controls. They are not mockups or human playtests.

The copied projects for these runs are in `/tmp/dustlings-accessibility-study/{baseline,candidate,integrated}`. Their relevant Main copies and probe scripts are preserved here. Commands, run sequentially while the native slot is free:

```sh
.tools/Godot.app/Contents/MacOS/Godot --path /tmp/dustlings-accessibility-study/integrated --script res://native_feedback_probe.gd -- --qa --probe-output=/absolute/new/evidence/directory
.tools/Godot.app/Contents/MacOS/Godot --path /tmp/dustlings-accessibility-study/integrated --script res://native_valid_import_probe.gd -- --qa --probe-output=/absolute/new/valid-import/directory
```

Use a fresh output directory. The original baseline/candidate project copies use the exact frozen main source in `proposal.json`; the integrated temporary project was updated to the later QA-only Main for the additional valid-import run. Restore the named saved Main to a new temporary project when reproducing an earlier generation. Do not mistake the final temporary project's contents for every previous run.

Malformed JSON is intentional in the 133-check fixture and the production store logs four parse errors per run; these diagnostics are retained. The single valid-import run did not encounter the freed-Control conversion problem; the later `focus-before` sequence did, and the final eight-cycle run verifies the corrected guard without diagnostics. `files.json` binds preserved evidence bytes; `proposal.json` binds each run to its Main hash. No performance, Windows execution, human comfort, audio audition or owner acceptance is claimed.
