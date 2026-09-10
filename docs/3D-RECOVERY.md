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

Prepared and executed 2026-09-10: `tools/native-3d-checks.mjs`. **45 packaged-process and artifact checks passed for the exact `2572e2f` candidate.** This build predates the active helper-work legibility correction; it is historical evidence for that exact package, not proof of later source changes. The 25 checks above remain the separate native engine integration result.

Preparation checks passed: Node syntax validation, and a deliberately incorrect archive hash was rejected with exit code 1 before extraction or any app process. That negative fixture is a tool guard check, not a game recovery result.

The runner requires an explicit build manifest and verifies the successful build record, Mac archive SHA-256, extracted executable and PCK SHA-256, bundle metadata, ad-hoc signature, and the actual ICNS resource linked by the plist. The Mac icon must match authored source bytes. A read-only Windows PE check verifies every authored ICO frame in actual RT_ICON resources and their RT_GROUP_ICON references. It never selects a `latest` build implicitly or launches the editor. The exported archive is extracted to a unique operating-system temporary directory so its exact signed bytes remain inspectable. Icon verification establishes actual resource contents and linkage; it does not constitute a visual review of the Dock or Windows shell.

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

### Earlier packaged result — `2572e2f`

[Exact report and check details](../evidence/3d/native-packaged/recovery-2572e2f/report.json), with per-process logs, results and actual opening images beside it. The preliminary [13-check artifact preflight](../evidence/3d/native-packaged/preflight-2572e2f/report.json) launched zero apps and is preserved separately.

| Identity or condition | Recorded value |
| --- | --- |
| Exact build manifest | `builds/3d/0.4.0-dev-2026-09-10T09-23-03-961Z-0db02d30ce/manifest.json` |
| Source revision | `2572e2f84d83f4175fac879e6735ee490fcfe47d` |
| Source SHA-256 | `0db02d30cecf84b28fce7919352f9ca2fd79c9deb82d5a7deffdb40e69d7d431` |
| Source dirty at build | `false`; repository separately recorded dirty |
| Mac PCK SHA-256 | `a55ebb8d8ec501f8cb9d5484d2e9a473d3b443224bbec0ad4915b4171c8adb04` |
| Mac executable SHA-256 | `1b048dabb863b272ae4bf91d5270f0a2c28a3b701723265fd8134b2354b32b7f` |
| Machine | Mac16,7; Apple M4 Pro; 48 GiB; macOS 26.6.2 |
| Runtime | Godot 4.7.2 release export; Metal 4.0 Forward+; logical viewport 1440×900 |
| Recorded interval | 2026-09-10 09:31:36–09:33:21 UTC |
| Processes | Opening 42210; resume 42272; hold 42280; second 42281; all exited 0 |
| Diagnostics | Zero recorded engine errors, warnings or leaked-resource messages in these four processes |

The generated opening created its first helper at 10.25 **simulation seconds**, produced five helpers, bought the brush upgrade and assigned the crew. It set music to 0.25 and gentle motion on through controls. A fresh process restored every compared game/settings field before resuming. Return started play/audio without held input. The concurrent second copy had disabled Start, rejected direct Start and left the primary, staged and backup bytes unchanged; closing the waiting primary also left them unchanged. This establishes the stated automated recovery checks, not representative-player timings or preference.

The Windows executable contained all six authored icon frames (16, 32, 48, 64, 128 and 256 pixels) byte for byte, with matching group references. This is structural resource verification on Mac. Windows execution is still **unrun**.

The unique cache profile `dustlings-qa-native3d_d0f725901cf94866bfa728080ebc4167.json` and temporary extracted bundle remain inspectable; their exact paths are in the report. The actual dirty-courtyard screenshot was inspected after launch. No human participant or owner acceptance was recorded. Next action: after the work-legibility correction is frozen and packaged, repeat this exact-manifest sequence for the new candidate and attach source-matched gameplay/performance evidence.

### Current packaged result — `960d96b`

The [new exact packaged report](../evidence/3d/native-packaged/recovery-960d96b/report.json) passed **45/45 checks** on 2026-09-10, 10:25:14–10:26:34 UTC. Four real release-app processes exited 0 with no recorded engine errors, warnings or leaked-resource diagnostics: opening PID 45791, resume 45879, primary hold 45887, second copy 45890. Conditions were the same Mac16,7 / Apple M4 Pro / 48 GiB / macOS 26.6.2 / Metal Forward+, logical viewport 1440×900. This is automated generated-input execution, not a human test or a performance measurement.

| Identity | Exact value |
| --- | --- |
| Build manifest | `builds/3d/0.4.0-dev-2026-09-10T10-09-48-517Z-056dc75f00/manifest.json` |
| Source revision | `960d96b7e464317eed8441c56446093b38661912` |
| Source SHA-256 | `056dc75f0078eda1fbf61752b940818671ad348ed554974f9dc519fadaaa2313` |
| Source dirty / changed during export | `false` / `false` |
| PCK SHA-256 | `3bd908a12c67ed1dfae9b5d093fdb31925292c9550f10644125fb738550dfd47` |
| Mac executable SHA-256 | `522062065f95971a98bdeb3f509512f8167f5b41a56f684cfb2bb992ebc0619d` |

The opening created helpers, bought the brush upgrade, assigned the crew and persisted music 0.25 / gentle motion on through actual controls. A new process restored all compared game and preference fields at welcome before deliberate Return resumed play/audio. The simultaneous second process could not start or change any primary, staged or backup save bytes; closing the waiting primary also left those bytes unchanged. The unique profile `dustlings-qa-native3d_444f1f7d454c426190c469b911295ebf.json` and extracted bundle remain available at the exact paths recorded in the report.

The separate [17-check preflight](../evidence/3d/native-packaged/preflight-960d96b/report.json) launched zero apps. Both this preflight and the full run inspected the actual Mac icon and all six Windows icon resources. Neither executed Windows. The prior `2572e2f` report remains historical, with its own package and results preserved.

The current build still has a separately observed Settings save-copy notice visibility defect; these checks do not exercise that native file-dialog feedback. Full-crew/active-chorus process return, physical sleep/device interruption, Windows execution, human comfort and owner acceptance remain unverified. The next correction requires a new package and affected checks before its result can replace this exact candidate. Human sessions remain **0**.
