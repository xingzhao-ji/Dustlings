# Courtyard 0.2 normal-time endurance

The frozen courtyard completed in **9 minutes 3 seconds** under an automated pointer policy, with all 466 dust units cleaned and 50 helpers present. The completed save survived an actual export, page reload and return to play with all compared ending fields exactly equal. There were no console errors, page errors or harness failures. This is one integration run, not a human playtest or evidence of enjoyable pacing.

## Purpose and method

Player benefit: a full restoration should finish without stranded specks, cumulative session faults or a lost ending on return. Earlier focused and accelerated checks left normal-time integration unverified. The smallest useful addition was one fresh-save, foreground run capped at 15 minutes, followed by actual save/reload/resume. Acceptance required complete cleanup and landmark restoration, no runtime errors, and exact ending recovery. Those checks passed.

The tested standalone file was `builds/Dustlings Courtyard.html`, version 0.2.0, source revision `4384d82d61210269332cb8568ef89c7399425b86`. Its SHA-256 was verified before launch and before reload:

`cb4b9d7bc6174a96bd203a22f9a8a5a766f3fa0eca10475e80c8e4d681f5feea`

Run window: 2026-09-10 06:22:57–06:32:10 UTC. Environment: headless installed Chrome 152.0.7977.83 on the development Mac, 1440×900 CSS pixels, DPR 2. This was browser automation on a development machine, not physical Windows, iPad or iPhone validation. Host workload was **not isolated**: other development work could include media conversion and review checks. Timing results are integration observations, not comparative performance benchmarks.

The harness used actual mouse and interface events, with read-only game state and projection access. Every three seconds it chose the highest-amount visible dust node, held the brush for 1.2 seconds, and released. It bought brush, teamwork and bloom upgrades through their buttons as they became available, then activated the fountain chorus through its button. Manual brushing stopped at the chorus; helpers completed the remaining cleanup. No game-state writes, fixture loads, time acceleration or forced garbage collection were used. The diagnostic observer maintained its own separate data arrays.

## Observed progression

| Event | Observed time |
| --- | ---: |
| First helper | 18.94 game seconds |
| First meaningful upgrade | 89.94 game seconds; button click at 90.09 wall seconds |
| Teamwork button click | 147.10 wall seconds |
| Bloom button click | 225.15 wall seconds |
| Chorus button click; manual brushing ends | 414.24 wall seconds |
| Complete courtyard detected | 543.26 wall seconds |

Measured manual brushing was 166.05 seconds before the chorus, a 40.09% duty cycle. The player brush cleaned 179.37 dust units and helpers cleaned 286.63. All three upgrades were owned at completion. This policy made zero crew assignments; direction behavior is covered by separate input checks. These timings do not establish unfamiliar-player understanding, comfort, upgrade preference, enjoyment or voluntary continuation.

The ending comparison included completion, every dust amount, restoration, elapsed and event times, motes and total earnings, upgrades, helper identity/position/phase, and player statistics. It was taken while paused before reload and compared immediately after reload. The resumed game remained completed with 50 helpers. The exported save and fresh-context storage checkpoint are retained with the evidence.

## Frame intervals and heap

The passive foreground observer collected 32,578 intervals: mean 16.68ms, p95 16.7ms, p99 16.8ms, worst **216.6ms**. Three raw intervals exceeded the numeric 33.4ms threshold, including one floating-point boundary record that rounds to 33.4ms. None reached 500ms. The long-task observer recorded no entries.

| Browser navigation-relative timestamp | Raw interval | Helpers |
| --- | ---: | ---: |
| 586.7ms | 216.60000000000002ms | 0 |
| 540531.8ms | 33.40000000002328ms | 50 |
| 540715.1ms | 100ms | 50 |

The 216.6ms interval was present in the first 1.56-second progress checkpoint, whose window included startup and the opening screenshot. The opening screenshot's exact start/end were not logged, so its involvement cannot be established. The two late intervals occur near the final-cleanup still, recorded at wall second 540.45. Browser and harness clocks were not precisely synchronized in the evidence. This is timing coincidence only; no cause or game correction is inferred. All three records remain in the raw results.

Nineteen CDP heap samples were collected at roughly 30-second intervals. Used JavaScript heap ranged from 2.83 to 6.99 MiB; the first sample was 3.10 MiB and the final sample 4.25 MiB. Allocated heap capacity grew from 7.88 to 12.39 MiB. Natural allocation and collection, and the observer's accumulating arrays, affect these values. One nine-minute run does not prove absence of memory leaks.

## Review and remaining evidence

Actual stills: [opening](../evidence/v0.2/endurance-normal-time-opening.png), [final cleanup](../evidence/v0.2/endurance-normal-time-final-cleanup.png), [completion](../evidence/v0.2/endurance-normal-time-completed.png), [ending dialog](../evidence/v0.2/endurance-normal-time-ending-dialog.png), [returned game](../evidence/v0.2/endurance-normal-time-returned.png). The inspected cleanup and return frames showed the restored fountain and gardens, readable controls, and the returned crew gathering in rings. No visible recovery defect was found in these stills. This run made no motion recording or audio assessment; separate milestone recordings cover those review materials.

[Full results](../evidence/v0.2/endurance-normal-time-results.json) retain progress, exact event times, errors, raw outliers, heap samples, build identity and recovery results. [Harness](../tools/endurance-checks.mjs) runs with `node tools/endurance-checks.mjs --run`; without `--run` it launches no browser. It overwrites the default evidence prefix, so use `DUSTLINGS_ENDURANCE_LABEL` for a separate repeat. The browser closed after verification.

No application change was justified by this successful run. The next remaining acceptance work is unfamiliar target-player testing and physical platform checks. Actual human participant count for this evidence is **zero**; no enjoyment, market-demand or benchmark-quality claim follows from it.
