# Continuation checkpoint — 2026-09-10 08:50 UTC

Session active. Current milestone: exceptional real 3D courtyard, Godot 4.7.2, version 0.4.0-dev. No additional zones eligible. Human sessions **0**; representative-player, presentation and current-build owner acceptance are all pending. An ended session is not a finished game.

## Current integrated work

- Actual 3D buildings, paving, fountain, plants and expressive seed-shaped helpers; elevated stable camera; geometry raycast brushing; original spatial soundscape; three capability upgrades;50-helper limit; coordinated fountain chorus and finite courtyard restoration.
- Dust coverage now fades on the actual paving material. Critic confirms improved continuity but still sees brown paving/polishing rather than dust. This remains a material gap.
- Body spacing and spatial work reservations corrected merging helpers without losing cleanup throughput. Latest simulation8dc96b4:5,904 routes pass; minimum50-helper spacing0.536m; paired crowded cleanup33.99 motes/45s vs the intermediate8.88 regression; controlled ending586.5s. These are automated fixtures, not human pacing.
- Real3D upgrade previews, specific purchase feedback, tactile buttons and legible focus. Camera now1.12 with compact separate header panels; Frame/Home keeps overview1.0. The rejected1.22 candidate clips roofs. New themed settings controls retain the same native input behavior.
- Root just corrected a restoration interruption: completion saves and celebrates in the world; a deliberate Courtyard restored button opens the recap. Music is no longer immediately paused by an automatic panel. Current source still needs the state-driven ritual recording after this change.
- Verified native saves recover newer stages/backups, preserve unreadable originals, reject stale writers, and guard ordinary progress with a local single-writer lock. Native isolated Metal/CoreAudio recovery25/25 checks pass (63b9000); one prior exact JSON int/float comparison failure was in the test, preserved. Headless integration15/15 and save-store16/16 pass.
- Audio34 PCM checks pass; rapid Dummy shutdown reproduced then corrected with driver-specific drain. Native recovery exits cleanly. Numerical/audio-engine checks do not constitute listening.

## Active team and exact next actions

Root owns main.gd, courtyard_surface shader, integration/camera/UI, capture tool and source freeze. Native_icon owns only new dust_feedback.gd / optional dust_drift shader /docs/3D-DUST.md: one restrained grounded dust + actual-brushing feedback candidate. Do not overwrite this work. It is preparing while the native profile runs.

Store_requirements owns evidence/3d/REVIEW.html, tools/review-3d.mjs and docs/QUALITY-GATES.md. Pending hub is committed848f507, verifies links and refuses stale baseline as current. Give it final build/capture/profile/Mac-launch metadata to populate; no current final package yet.

Independent_critic owns its own docs/CRITIQUE-3D-0.4.md and evidence/3d/critic. It is reviewing the actual compact-framing and current-chorus footage independently. Do not write or steer its verdict toward approval. CUA is blocked by pending macOS permissions; do not repeat long blocked calls. No direct physical input or audio audition was claimed.

**Exact next action:** poll exec session98147 (node tools/capture-3d.mjs profile before-dust-feedback). This is a60-second wall-clock native Metal50-helper run on MacBook Pro Mac16,7/M4 Pro/48GB/macOS26.6.2,1280×800, normal MSAA/shadows/audio, no movie/screenshots during measurement. Avoid heavy parallel work until closed. Profile uses monotonic microseconds between all process callbacks, without discarded outliers.

Then inspect the new dust candidate, integrate only if it addresses the concrete causality defect without occlusion/comfort regressions. Capture current opening and state-driven chorus/optional recap, compare actual frames and movement, measure updated performance if candidate changes cost. Run relevant current integration/recovery checks, not redundant broad suites. Freeze source; export fresh native Mac/Windows with node tools/build-3d.mjs; verify PCK runtime sources and run the exported Mac. Populate the review hub and obtain independent follow-up. Continue useful reliability/presentation work supported by findings; do not add zones or claim benchmark quality.

## Reviewable evidence and packaging

- evidence/3d/surface-and-spacing/opening.mp4:66-second actual engine opening, generated native input with real raycasts; first helper10.25s, upgrade/direction pass. MovieMaker runs30fps engine time, faster than wall clock. Initial spacing only.
- evidence/3d/closer-camera/: same runtime at QA zoom1.22; reject this framing as default. Runtime argument was added to manifest from the executed command; metadata says so.
- evidence/3d/compact-framing/overview.mp4 and current-chorus/ritual.mp4: latest reservations, camera1.12/splitheader; explicitly labelled50-helper/restoration fixtures. Chorus reaches completion but its48s screenshot precedes the final recap. These recordings predate optional recap/themed settings changes.
- evidence/3d/recovery/: actual native isolated recovery; evidence/3d/audio/reliability-34/: exact PCM/leak/drain evidence; evidence/3d/crowd/: quantitative before/after plus historical spacing-only recording.
- Latest packaged baseline is **historical to current corrections**: builds/3d/0.4.0-dev-2026-09-10T08-14-03-063Z-672c9b898d/manifest.json, PCK dd5d2ab545697f9a15e9b780edc6e496c97e15b5fa14f8960481476cb57d4143. Mac Universal2 ZIP61.95MB ad-hoc verified and native fixture launched; Windowsx64 unrun. Regenerate after freeze. Build output is ignored; source/evidence checkpoints are committed.

## Remaining gates and limitations

Prioritize dust identity/brush response, current restoration continuity,50-helper motion, native comfort/performance and reliable copies/relaunch. Review actual source-bound gameplay with people. Figma unavailable; actual engine UI is fallback. Windows physical run, mouse/trackpad comfort, native listening, representative unfamiliar players and owner review are absent. Steam submission/signing/notarization and later iPad/iPhone ports remain separate work. Historical Canvas/Electron0.3 is preserved mechanics/reliability reference; it is not the current product or a substitute for native3D delivery.
