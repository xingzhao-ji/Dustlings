# Earned-route navigation correction

The complete native progression route exposed failures that the prepared greenhouse and open-gate traversal fixtures did not cover. The prepared checks remain valid for their stated conditions; they were insufficient evidence of ordinary discovery arrival. Root's native `neighborhood-art-route` failed at 200.258s while trying to speak with Mara after the shared table. Mara was stranded near her workshop, and the first companion was absent from the moth exchange.

This bounded investigation preserves all progress, interactions, colliders and route history. Its player benefit is companionship that stays with ordinary exploration, and residents who can physically join the life the player has restored. No human approval is implied.

## Reproduction and causes

`godot/tests/rpg_earned_route_checks.gd` runs the native QA driver's authored InputEvents on a frozen project. Screenshot commands become one-frame observations; there is no injected reward, player position or companion position. It records actual body contacts, breadcrumb and navigation queues, resident targets and gift continuity. This is accelerated headless QA, not an unfamiliar player or a native performance measurement.

The first reproduction, using the frozen native route, failed at step135 /198.47 simulated seconds. Mara's stranded position `(6.963416, 0.000139, 2.128124)` matches root's native observation exactly. Her route used a straight segment from the workshop through intervening props.

The first companion had two problems:

1. A cached detour stopped around 0.1565m before its corner because movement stopped inside 0.16m, while the blocked onward segment prevented skipping that corner. During the gift its body was near `(1.035491,0,-3.58254)`, waypoint `(0.879999,0,-3.6)`, followed by `(1.52,0,-9.04)`.
2. More consequentially, slowing according to distance to every 0.38m breadcrumb kept effective following below 1m/s while the player walked at 2.6m/s. The corner-only correction left 149 queued breadcrumbs at the greenhouse. The creature was still retracing earlier workshop travel when the player read the letter.

## Correction

Commit `ac1ca15` changes only navigation fields and the resident/companion movement methods in main, plus the shared navigation module.

- Residents use the actual collision geometry with their 0.29m capsule radius; the shared module accepts a radius and uses 0.04m grid clearance beyond it. A separate resident grid rebuilds only when the companion navigation topology generation changes. Precise intermediate points keep them from stopping before a required corner.
- Companions reach necessary detour corners to 0.025m and travel through intermediate route samples at up to 3m/s. Speed is capped by the distance remaining in the current tick, so they do not step beyond the point. Final destinations retain relaxed slowing. No history is cleared, no body is relocated, and no collision is disabled.

Two old generated route diagonals crossed residents after the improved navigation let them arrive. These are driver defects, not permission to walk through residents. The test now takes explicit north-lane walking approaches before the first garden visit and the later Ivo visit; root applies the same changes to native capture. The story actions and destination order are unchanged. The test avoids adding these detours twice when root's driver already contains them.

## Verification

The corrected full route completes **163/163 commands**, 194.78 simulated seconds. **6/6 additional checks pass**:

- The same first companion receives the moth. Minimum measured moth-to-head distance is approximately 0m. At both gift observations the companion is 1.007m from the player, grounded and stationary, with no breadcrumb backlog.
- Mara reaches the shared table within 0.094m and her invitation can be earned. All four residents' relationship rewards are reached.
- All four companions return home without a backlog, at distances 1.225m, 1.057m, 1.058m and 0.957m. First companion maximum measured travel between frames is 0.070m; no position warp occurred.
- Runtime files remain unchanged during the run.

Authoritative hashes and observations: `evidence/rpg/earned-route/final`. Main SHA256 `102420728a1c0f6d6e4b3c6ae7417ac2aa0b99d65c88f259c8f9aa201114dea8`; navigation SHA256 `aca4c8cc95ecc6ec3fc1346940885d0d7f107b86b1cfe3ade099e75ca9aad8a4`. Root's concurrent actor/UI/environment integration is included and individually hashed in the report. This is a source-bound integration result, not isolation of those presentation changes.

Failed diagnostic iterations remain in `before`, `after-second` and `after-lane`. `after-first` contains the initial navigation indentation parse rejection; the fixture did not start. Its repetitive follow-on log was reduced to the first diagnostic lines and labeled. Earlier successful route output had teardown resource warnings from the test driver's direct quit. Final teardown drains Dummy audio, frees the scene and exits cleanly; this does not establish native audio behavior.

The already-running four-companion prepared traversal also completed: **28/28 pass**, clean log, source unchanged. Evidence: `evidence/rpg/companions/earned-route-fix`. It remains a separate prepared-state regression rather than a substitute for the earned route.

## Next action and remaining limits

Root has frozen the corrected source for native art and progression captures. Inspect continuous companion travel and the same moth gift in actual gameplay, plus Mara's workshop-to-table journey and player passage around residents. Check whether cruising feels comfortably lively and whether ordinary players understand and value the exchange. Native performance, listening, independent critic review, representative humans and owner acceptance remain separate pending gates. Human sessions are still zero.

Execution stopped at the owner's explicit stop instruction. No agent-owned processes remain active. The final test file includes defensive handling for a runtime parse failure and avoids duplicate driver detours; those defensive branches were not exercised in the successful route run. No new tests were launched after the stop instruction.
