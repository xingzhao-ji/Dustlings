# Native 3D development builds

The active product direction is the real-geometry Godot courtyard. These packages are development integration candidates, not store submissions or an accepted milestone. The historical Canvas/Electron 0.3 captures, performance and recovery checks do not validate the 3D game. Human sessions: **0**. Current-build owner release approval: **not obtained**.

## Build locally

From the repository root on macOS:

```sh
node tools/build-3d.mjs
```

The default editor is `.tools/Godot.app/Contents/MacOS/Godot`. Selected official templates live at `.tools/templates/macos.zip`, `.tools/templates/windows_release_x86_64.exe`, and `.tools/templates/version.txt`. `GODOT_BIN` and `GODOT_TEMPLATES` can select another local installation. The editor and templates must have the same engine version. This script uses macOS signature/plist tools; the paths are portable across Mac checkouts, not a claim that the script itself has been tested on Windows.

The checked-in preset paths are relative to `godot/`. The build tool copies an immutable project snapshot, then resolves template paths only in that snapshot. It derives numeric bundle metadata from `config/version`; `0.4.0-dev` stays the game's recorded version while platform metadata becomes `0.4.0`. Universal Mac export requires `rendering/textures/vram_compression/import_etc2_astc=true` in the source project.

Output is a unique ignored directory under `builds/3d/`, containing:

- `macOS/Dustlings.zip`: a Godot-exported app archive containing the Universal2 runtime and PCK, built-in ad-hoc signature, no notarization.
- `Windows/Dustlings.exe` and `Windows/Dustlings.pck`: unsigned x64 runtime and separate game data; distribute both together.
- `manifest.json`: project version, Git revision, explicit tracked/untracked dirty state, full source hashes, actual template/executable/PCK hashes, export checks and limitations.
- `source/godot/`: the exact source snapshot plus explicitly recorded export-preset overrides; export/import logs and independent PCK-check logs remain alongside it.

`builds/3d/latest-build.json` points only to the last successful technical export. Its name does not establish current source parity, presentation approval or release readiness. Failed attempts keep their own diagnostic manifest and never replace this pointer. A manifest with `source.changedSinceSnapshot=true` is a preserved integration candidate that must be rebuilt before it is described as current.

## What the checks establish

The tool freezes and hashes source bytes before import; concurrent source changes fail freezing or are reported after export. It uses genuine Godot release export templates. Development PCKs keep GDScript as text. Each exported pack is mounted in an otherwise empty project, and the runtime `.gd` and `.gdshader` bytes are compared to the frozen source inventory, excluding test scripts. Scenes and imported audio are packaged by Godot; generated import representations are not mislabeled as byte-identical authored source. The full authored inventory remains available for provenance.

The Mac archive is extracted to a unique local temporary directory. That bundle must pass `codesign --verify --deep --strict`, report an ad-hoc signature and contain both arm64 and x86_64 executable slices. Its exported bundle version is checked. The temporary `macOS.localInspectionApp` path is available for a coordinated local launch; preserve the zip, because temporary directories are disposable. This avoids a measured local problem: Desktop/iCloud repeatedly attached signature-forbidden FinderInfo to live `.app` folders. No system setting or downloaded-tool attributes are changed. Windows must have a valid x64 PE header. None of these checks executes Windows, tests Gatekeeper on another Mac, measures gameplay performance, listens to sound or establishes player satisfaction.

The script never launches an app, accesses a signing account, uploads anything or repairs system frameworks. Local ad-hoc signing does not establish Steam readiness, Apple distribution signing, notarization or App Store acceptance. The prototype bundle identifier is a local development identifier and is not a registered ownership claim.

## Review after a source freeze

1. Run the relevant 3D simulation/save checks, then rerun this build tool. Preserve the exact successful manifest and build directory before making a new candidate.
2. Obtain the shared interactive app slot and launch the exported Mac executable. Record the exact PCK/executable hashes, physical Mac model, OS, renderer and test conditions. Default `--qa` uses `dustlings-qa-<process-id>.json` in the OS cache and skips applying saved progress. Supplying a valid `--qa-profile=<token>` instead uses `dustlings-qa-<token>.json` in the OS cache and follows the actual restore and TCP instance-lock branches. Both avoid ordinary `user://courtyard.json`. Use `tools/native-3d-checks.mjs` with the exact manifest for isolated packaged save/return and concurrent-process checks; see [the recovery scope](3D-RECOVERY.md). Generated QA actions remain automated evidence, not a human session.
3. Inspect and record actual packaged opening, brushing/birth, upgrade/assignment, 50-worker crowd, final cleanup, restoration, settings, pause and returning to play. Listen to affected audio. Preserve capture/media hashes with the same build identity. A short launch probe alone does not complete these checks.
4. Run and measure the Windows package on a physical Windows machine before claiming that target works. Intel Mac and mobile support also need their own actual checks; architecture presence is not execution evidence.
5. Obtain unfamiliar intended-player feedback and current-build owner acceptance. Record exact counts, cohort, build and reasons. Presentation comparison and sales readiness remain human gates.

## Official references

- [Godot command-line export](https://docs.godotengine.org/en/stable/tutorials/editor/command_line_tutorial.html)
- [macOS export, Universal2 and ad-hoc signing](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_macos.html)
- [Windows runtime and PCK export](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_windows.html)
- [macOS preset properties](https://docs.godotengine.org/en/stable/classes/class_editorexportplatformmacos.html) and [Windows preset properties](https://docs.godotengine.org/en/stable/classes/class_editorexportplatformwindows.html)
- [GDScript export modes](https://docs.godotengine.org/en/stable/classes/class_editorexportpreset.html)

The original official download URLs and recorded SHA-256 values are in `evidence/3d/toolchain-download.json`. Each build separately records hashes of the selected local templates actually used.

## Initial actual result — September 10, 2026

Bounded purpose: make the owner's required native 3D direction directly inspectable while preventing stale or dirty payloads from masquerading as a current release. Evidence is the confirmed platform requirement and actual exporter/signature failures, not a player preference study. The smallest implementation is two development presets, a frozen-source exporter and explicit provenance. This packaging pass used an approximately 20-minute budget.

Successful candidate: `builds/3d/0.4.0-dev-2026-09-10T08-14-03-063Z-672c9b898d/manifest.json`, based on revision `c05e7b9fb180db17d7f6d2c5379c04452a88c9f3` plus explicitly recorded dirty/untracked source. Source was unchanged during that export; subsequent active edits make it a historical integration candidate. Both packs passed all seven script/shader comparisons, and an intentionally incorrect expected `main.gd` hash was rejected with exit 1. The Mac signature and Universal2 slices passed; Windows x64 packaging passed without Windows execution.

- Frozen source SHA-256: `672c9b898d70b923ba6ef9a4ae5ed8daa77014b5a5e4689006ed2a89e3ac411d`.
- Mac and Windows PCK SHA-256: `dd5d2ab545697f9a15e9b780edc6e496c97e15b5fa14f8960481476cb57d4143`.
- Mac archive SHA-256: `edc55d143be7ffbb09efa4b44c455460bf02aa93f701ccf68de29a395113f09b` (61,951,552 bytes).

The actual exported Mac app then ran the scripted overview fixture on an Apple M4 Pro, model Mac16,7, macOS 26.6.2, using Metal 4.0 / Forward+. It exited 0 after 34 seconds including startup and captures. `native-launch-probe/` in that candidate preserves the exact executable/PCK identity, stdout/stderr, game report, and welcome/dirty/50-worker/close/restored/settings screenshots. The busy frame was visually inspected. The final sampled frame reported 329 draw calls at the 1440×900 logical viewport; this is not a sustained performance result. The 50-helper completed state and timing values came from a labeled fixture, not normal-play pacing.

This release probe emitted no stderr diagnostics. Root's separate debug run reported exit resource leaks; this probe does **not** close that issue or establish general error-free behavior. No short interaction recording, normal save recovery, Windows execution, human satisfaction or owner approval was established by this packaging task. Root owns the integrated capture/reliability/human gates. Next packaging action: after the pending source corrections and freeze, rerun `node tools/build-3d.mjs`, then review that exact new package instead of reusing these results.
