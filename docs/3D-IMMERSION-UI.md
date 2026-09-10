# Immersion and recovery feedback — 2026-09-10

Bounded cycle: approximately 20 minutes for a focused correction and native verification, followed by source-bound packaging/captures. Human sessions remain **0**. These changes address observed interface contradictions and the approved contextual-UI requirement; subjective comfort and emotional benefit are still hypotheses.

## Evidence and intended benefit

The independent critic's integrated review of runtime `960d96b` found that the optional restoration recap introduces development-roadmap text after the player returns the fountain to life. The full film also spends roughly 110 seconds after the chorus in ordinary cleanup, mostly showing repeated control shortcuts. These are specific interruptions or clarity questions in actual gameplay, not evidence to expand the courtyard or alter its rates.

Separately, source and native callback inspection reproduced missing Save a copy and invalid Load a copy results: they were written to the world tip while Settings hid that tip. The first correction exposed clipping when a long copy error and a device-save warning appeared together at the minimum window. See [the specialist audit](3D-ACCESSIBILITY-AUDIT.md) for original failures and exact before/after evidence.

## Smallest integrated correction

- Settings contains one wrapping status label. Export success/failure and invalid imports update it immediately, retain any separate device-saving failure, and return focus to the initiating control. Canceling invents no new outcome. Text and controls retain their sizes; only vertical gaps tighten when a visible status needs space in a short viewport.
- After water returns, the contextual hint says that helpers are finishing the cleanup. The regular shortcut labels remain on their controls and help remains accessible. Simulation, crew work and completion thresholds are unchanged.
- The optional recap becomes a compact **Courtyard restored** panel with the true save state and an **Enjoy the courtyard** button. It explicitly focuses that button for keyboard return. Development scope stays disclosed in the welcome/review materials and package README; the panel offers no nonexistent next zone.

All changes are in `main.gd`. Geometry, materials, lighting, camera, movement, pacing, audio and save schema are unchanged. Completion still celebrates in the unpaused world; the recap remains optional.

## Acceptance and actual verification

The existing 16 integrated input/raycast/pause/save checks pass with the combined changes (`evidence/3d/settings-recap-integration.log`). The specialist's native integrated probe passes 133/133 checks, preserving pause, progress/preferences, immediate visible results, keyboard focus and unclipped controls. It uses real production FileDialog callbacks with generated results and an embedded picker fixture; it does not establish physical interaction with the OS file picker.

The separate valid-import callback path passes 10/10 checks, including actual copied progress/preferences, deferred panel freeing, unpaused world and live focus. Its corrected probe and an earlier probe-only assertion failure are preserved in the specialist audit. The revised 41.3-second ritual recording (`evidence/3d/contextual-recap/`) verifies actual optional recap focus, generated Enter return and unpaused celebration. Its source hash is `1ec1e548c0e2c138f3545341bd77b8db72a6b8d4439a2c1f8beee6ae3e04dcd6`; the root inspected actual before/after panels at normal size.

Still pending: post-water hint inspection, exact updated desktop packages, and fresh independent/human review of the affected experience. A distinct keyboard-routing probe is now investigating whether HUD focus consumes intended world controls after menu return; the preceding live-focus check did not establish that routing. The earlier source-bound full recording and performance run remain attached to `960d96b`; they are not silently relabeled as this newer runtime.
