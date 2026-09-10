# Interruption and settings recovery audit

The initial browser audit reproduced two material defects. Both now pass their focused regression checks. The audit uses real N/Space keyboard input, 450 ms of live brushing, and actual navigation; it does not call the explicit QA save hook or advance simulation time. All contexts are isolated headless Chrome 152 contexts; this is not physical-device lifecycle testing or human feedback.

| Check | Before | After integration |
| --- | --- | --- |
| Fresh progress retained after reload/back/close | 0/5 | 5/5 |
| Corrupt settings cases normalized after native edits and reload | 1/2 | 2/2 |
| Same-primary/newer-journal two-tab conflict preserved and recovered | Not present | Pass |
| Existing two-tab save conflict checks | Previously passed | 6/6 still pass |
| Storage/conflict unit tests | Existing coverage | 20/20 pass, including 10 interruption cases |

All post-fix browser checks reported zero errors. Differences of approximately `1e-15` in restored dust totals are floating-point summation differences, within the `1e-6` comparison tolerance.

## Fresh progress is lost during teardown

Three reloads, one history back/forward, and one close/reopen all discarded newly brushed progress: **0 of 5 interruptions retained it**. Each trial removed approximately 0.3825 dust units immediately before leaving, while the previous canonical save still contained zero cleaned dust. Returning restored that zero-progress checkpoint. There were no browser exceptions.

The source explains the failure path: `pagehide` invokes `save()`, which awaits `navigator.locks.request` before `store.save` performs its synchronous localStorage write. The outgoing document can be torn down before that asynchronous callback runs. The same Web Lock path is used by hidden-visibility saving. The test establishes lost persistence, rather than directly observing the browser's cancellation mechanism.

Player benefit: an interruption immediately after a sweep should preserve the work that was just visible. The implemented bounded correction is `SaveStore.checkpoint(state)`, a synchronous write to `dustlings.courtyard.v1.interrupted`, carrying the serialized state and the exact canonical raw baseline. It never writes the primary or backup. Root invokes it on pagehide and hidden visibility before its normal asynchronous save.

`load()` prefers a valid matching-baseline journal and marks `recovered=true`, `recoverySource='interrupted'`. A stale or malformed journal is ignored in favor of the established primary/backup recovery. A successful normal locked save or reset removes obsolete recovery data; failure to remove an old journal after a successful canonical commit leaves a baseline-mismatched record that cannot override the new primary.

One guarded recovery slot is used. The store remembers the exact journal it last read or wrote, as well as the primary revision. A valid matching-baseline journal written by another window causes a conflict instead of being replaced; a caller that has not loaded an existing valid journal is also refused. This was checked in two actual tabs where B had loaded the same canonical revision before A's interruption: B preserved primary, backup, and journal, displayed the conflict flow, and recovered A's sweep through explicit Load latest. Canonical writes retain their Web Lock. The implementation does not attempt to merge independent play branches.

Acceptance checks:

- Repeat all five real-input interruption cases without an explicit save call; restored dust and elapsed progress should match the final visible state within serialization tolerance.
- In two tabs, save newer progress in A and then interrupt stale B. B's emergency snapshot must not replace A's newer canonical save.
- A completed canonical save consumes obsolete emergency data so a later reload cannot revive an older courtyard.
- Storage failure or a damaged recovery record preserves the readable canonical/backup saves and keeps the existing export path usable.

## Settings JSON is parsed without a value schema

Malformed JSON correctly falls back to defaults, and subsequent music/mute changes persist as valid values. A syntactically valid object with wrong types does not recover correctly. The tested object contained `music:"loud"`, `sfx:{}`, `ambience:-8`, and string `"false"` values for the flags.

Observed results were `NaN%` music/sound labels, an `-800%` ambience label, and enabled mute, tap-to-sweep, gentle motion, and lightweight scenery despite the strings saying “false.” Changing music to 23% and toggling mute retained those two changes, but saved the other invalid fields again. On reload, the `NaN%`/`-800%` labels and unintended flags remained. Audio's own clamps prevented invalid gain values; its effective mix disagreed with the controls.

Player benefit: recovering settings should leave understandable controls with matching audio and behavior. Root added whitelist validation at settings load, accepting valid finite volume values and actual boolean flags while retaining established defaults for invalid input. Unknown keys are ignored. The tested malformed and wrong-type cases now show normal percentage labels, agree with the audio mix, and retain native music/mute edits through reload with all fields valid.

Acceptance checks:

- Malformed JSON, wrong types, out-of-range volumes, null, and arrays all produce finite percentage labels, consistent sliders/audio gains, and actual boolean flags.
- Change music and mute through the native controls, reload, and verify those changes plus the validity of every other saved setting.
- A string `"false"` does not enable tap-to-sweep or change rendering quality.

## Evidence and next task

`tools/interruption-checks.mjs` reproduces both checks against the local server and writes `evidence/interruption-checks.json`, now with 5/5 retained interruptions, 2/2 valid settings cases, and the passing journal conflict scenario. `evidence/interruption-checks-before.json` preserves the original failing observations. `tests/interrupted-save.test.mjs` covers synchronous recovery, null initial baselines, queued canonical commits, journal conflicts, corrupt/stale recovery data, reset, denied writes, and failed journal cleanup.

The focused implementation and regression checks are complete. Actual Safari/iOS background termination, memory pressure, physical-device storage behavior, and player understanding of conflict recovery remain unverified.
