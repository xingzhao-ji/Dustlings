# Native interruption and recovery checks

Date: 2026-09-10. Status: 25 focused native integration checks passed; this is reliability evidence, not human usability or release approval.

## Purpose and scope

Player benefit: interrupted play preserves progress and preferences, resuming never repeats a held stroke, and a second writer cannot silently replace newer progress. Evidence is the approved save/recovery requirement and gaps in the existing checks: `save_checks.gd` covered storage in isolation, while `integration_checks.gd` covered input but did not reconstruct Main from its saved state or exercise Main's second-instance welcome guard.

The smallest useful addition is `godot/tests/native_recovery_checks.gd`. It changes no game, save, simulation, audio or interface implementation. The task also preserves the latest audio evidence separately under `evidence/3d/audio/reliability-34/`.

## Safe test profile and actual execution

The test refuses to run without `--qa`. A test-only `RecoveryMain` subclass redirects the save path to a unique `dustlings-native-recovery-*` directory in the operating system cache. It asserts that prefix before returning the path. A temporary loopback port replaces the application's ordinary port. The test never reads or writes `user://courtyard.json` and never acquires the ordinary application's instance lock.

The subclass invokes Main's actual production restore branch using that isolated path; normal QA deliberately skips applying saved progress. It does not replace the save store, simulation restore, preference loading, Start/save guards, modal methods or input cancellation behavior. Two real Main nodes share the test-local lock inside one engine process. That is narrower than launching two packaged operating-system processes and is labelled accordingly in the report.

Run, after coordinating the shared native app slot:

```sh
.tools/Godot.app/Contents/MacOS/Godot --path godot --script res://tests/native_recovery_checks.gd --rendering-method forward_plus --rendering-driver metal -- --qa --recovery-output=/tmp/dustlings-native-recovery-results.json
```

Omit the renderer/driver overrides on another platform when appropriate. A headless run can check logic, but must not be reported as this native-window result. The script can leave its temporary cache profile intact for inspection.

Actual final run: Godot 4.7.2, Apple M4 Pro, Metal Forward+, **CoreAudio**, native window, PID 39550. Profile: `/Users/xingzhaoji/Library/Caches/dustlings-native-recovery-39550-445831`. Result: **25 passed, zero failed; no engine error, warning or leaked-resource diagnostics**. The root received the app slot immediately after this process closed.

Events are generated through Godot's viewport input path. Controlled held-input and non-primary-start states are explicitly injected for guard checks. Several simulation steps are accelerated. These are not physical mouse/keyboard actions, player timings, a human playtest, or performance measurements.

## What passed

- Fresh welcome waits silently, holds the isolated primary lock and does not create a save before Start.
- Generated pointer input brushes actual raycast paving and produces saved progress.
- Actual HSlider and CheckButton controls update live volume, gentle motion, tap interaction and rendering preference. Returning persists their values together with current progress.
- A second Main cannot acquire the same lock, displays a disabled Start action, rejects direct Start and cannot save even when started state is injected for the guard probe.
- Opening settings cancels held mouse, keyboard, tap and camera-drag state. Progress stays paused. Return does not revive an old stroke.
- Focus loss pauses audio and clears held input; focus return does not automatically resume.
- A controlled external writer advances the valid generation. The old Main's next autosave pauses in settings, visibly explains the conflict and leaves the newer disk bytes unchanged. Its in-memory branch still exports as an exact verified copy.
- Closing the first instance releases its lock. A fresh Main restores the saved simulation and actual preferences while remaining paused at welcome, with no held input.
- A newer verified `.new` generation is recovered through Main, recovery is explained, and the recovered state can resume and save again.

The first native run passed 24/25 and failed the exact reload comparison. The comparison had normalized JSON numbers only on the expected side; Godot parses JSON numbers as floating values while simulation serialization restores some integer fields. Normalizing both sides corrected the test without changing game code. The initial log/result are retained at `/tmp/dustlings-native-recovery-first.{log,json}`. Final files are `/tmp/dustlings-native-recovery.log` and `/tmp/dustlings-native-recovery-results.json`; the root should preserve these with the milestone evidence.

## Audit findings and remaining gates

No additional main/settings/save correction was required by this run. The initial progress fixture is deliberately small (about 2.98 brushed units), so this does not replace the existing simulation's completed-save checks or future return-to-play tests with a large crew and active restoration.

The lead separately identified that the completion modal immediately paused newly emitted celebration audio. Keeping completion in the world is compatible with the verified recovery paths: retain the completion save, leave a failed-save message/export path accessible, and show any recap only on deliberate request. Do not claim the save succeeded when `_save_progress()` returns false. Settings and focus pause can remain unchanged. This audit did not implement or verify that subsequent completion change.

Remaining player-facing reliability checks are packaged multi-process second launch, physical Windows/macOS sleep and device interruption, actual import/export file dialogs, full crew and active-ritual return, and human comfort with the conflict/recovery messages. The current engine fixture does not establish those results.

Exact next action: preserve the final native report and integrate the lead's uninterrupted completion change, then run its focused completion/save check. Do not repeat broader checks or change already-passing storage behavior without new evidence.

## Packaged operating-system process check

Prepared 2026-09-10: `tools/native-3d-checks.mjs`. **The packaged sequence has not yet run.** It awaits the final exact native build manifest and the shared interactive app slot. The 25 checks above remain the separate native engine integration result; they do not establish packaged multi-process recovery.

Preparation checks passed: Node syntax validation, and a deliberately incorrect archive hash was rejected with exit code 1 before extraction or any app process. That negative fixture is a tool guard check, not a game recovery result.

The runner requires an explicit build manifest and verifies the successful build record, Mac archive SHA-256, extracted executable and PCK SHA-256, bundle metadata, ad-hoc signature, and the actual ICNS resource linked by the plist. It never selects a `latest` build implicitly or launches the editor. The exported archive is extracted to a unique operating-system temporary directory so its exact signed bytes remain inspectable. Icon verification establishes that the bundle contains and references a valid resource; it does not constitute a visual review of the Dock icon.

Run only after coordinating the app slot:

```sh
node tools/native-3d-checks.mjs --manifest builds/3d/EXACT-BUILD/manifest.json --output evidence/3d/native-packaged/EXACT-RUN
```

`--preflight-only` performs artifact checks without launching an app. Its report explicitly says no recovery test ran and must not be used as a native recovery pass. Output must be empty to prevent mixed evidence.

The intended sequence uses four actual packaged Mac processes and one random `--qa-profile` identifier. Unlike default no-profile QA, this named profile follows Main's actual load and TCP instance-lock branches, with a unique `dustlings-qa-<token>.json` in the OS cache. The ordinary save path and lock are untouched.

- Opening: 66 engine seconds of real-time generated viewport input brush actual surfaces, create helpers, buy the brush upgrade, direct the crew, and change music volume and gentle motion through controls. No progress fixture or accelerated simulation is injected.
- Fresh process: compare every saved game/settings key and array entry at the silent welcome screen, before time resumes. JSON number types are normalized; only numerical round-trip noise within `1e-9 × max(1, absolute values)` is tolerated. Verify deliberate Return resumes audio/play without reviving held input.
- Concurrent processes: hold a primary app at welcome, launch a second copy with the same profile, verify disabled Start and rejected direct Start, and compare primary, staged and backup save hashes byte for byte. Finish the primary only after those checks.

Timeouts or failures terminate only the runner's own app PIDs. Its isolated profile, extraction, per-process logs/results and top-level `report.json` remain available for inspection. The report binds `pckSha256`, `executableSha256`, `sourceSha256`, build revision/dirty status, exit code and individual checks to that exact artifact. A later source change requires a new build and new execution before calling this evidence current.

Remaining scope: this small opening save does not establish full-crowd or active-chorus return, physical sleep/device interruption, native file-dialog comfort, Windows execution, mobile support, human satisfaction or owner release approval. Human test count remains **0**.
