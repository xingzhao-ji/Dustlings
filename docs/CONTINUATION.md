# Continuation checkpoint — 2026-09-10 06:32 UTC

Current milestone: **courtyard 0.2, awaiting human validation**. Human sessions: **0**. Player experience, presentation quality and owner acceptance are separate gates; none has passed. Development is still running at this checkpoint.

Exact playable candidate:

- `builds/Dustlings Courtyard.html`, version0.2.0, 148,970 bytes, offline and self-contained.
- Source `4384d82d61210269332cb8568ef89c7399425b86`, clean when built.
- Artifact SHA-256 `cb4b9d7bc6174a96bd203a22f9a8a5a766f3fa0eca10475e80c8e4d681f5feea`.
- Integrated source/artifact/evidence saved in commit `b0c0526`; source runtime has not changed since freeze.

Completed since06:12:

- Guarded synchronous interruption journal implemented. All5 real reload/back/close cases retain the last sweep; both invalid-settings cases recover. Same-primary journal conflicts preserve unseen progress;6 prior two-tab conflicts and20 storage tests pass. All37 source tests pass; navigation/save/lifecycle audit13 pass.
- Exact standalone Chrome smoke passes, plus12 WebKit file checks. Current WebKit source26/26; no external requests or JS exceptions in artifact checks. WebKit is an engine test on Mac, not branded Safari or physical iOS.
- Actual0.2 normal-speed opening and fountain chorus captured with live game audio; dirty/restored views and simulated device layouts saved. Opening: first helper8.73s, four helpers and33motes by39.11s under scripted input. No human timing claim.
- Isolated60-second50-helper sample:3,600 intervals, mean16.666ms, p95/p99/worst16.8ms, zero>33.4ms. The earlier0.1 isolated216.6ms outlier remains unexplained.
- Review page generated at `evidence/REVIEW.html`;18 link/image/media/hash/layout checks pass. Phone protocol-link wrapping corrected. During semantic review, the original45s UI clip was found to include subsequent QAfixtures at its end. It is now trimmed to43s before those fixtures; finalframe has four helpers and livecrew direction. Media manifest updated; targeted recheck pending. Other clips remain42.747s opening canvas/audio and50.068s chorus/audio.
- Owner invited to play exact0.2 in this session; no response/assessment recorded. No outside tester outreach.

In progress / exact next actions:

1. Let art agent's normal-time endurance run finish on exact0.2. It uses actual pointer/UI events,40% brush-duty policy and no simulation acceleration/fixtures/state writes. At474s fountain restored,50 helpers cleaning final20%; all upgrades bought by225s, no gameerrors. The run is non-isolated while root converts media/reviews UI. It recorded one216.6ms interval within its opening1.6s window, including startup/screenshot; precise cause not established. Do not mix this with the isolated profile. Results will be `evidence/v0.2/endurance-normal-time-results.json`; verify complete-ending export/reload comparison and inspect final captures.
2. Sound agent is checking the corrected43s UI clip and updated media hashes. Root should commit the trim/frame/manifest changes and include the targeted review report.
3. Update the review page, BACKLOG, QUALITY-GATES and performance notes with actual endurance results. Preserve explicit human/device gaps; no new product source changes are justified just to stay active.
4. Run `python3 tools/package-review.py` after endurance artifacts stop changing. Verify ZIP integrity and contained game hash (script does this); save package manifest, final continuation checkpoint and local candidate tag. Review package is for inspection, not a native/store release.

Remaining validation gaps: unfamiliar-player causality, appeal, upgrade recognition, fatigue, pacing, sound and restoration payoff; comparative presentation review; owner satisfaction/sell readiness; physical Windows/Mac input, real iPad/iPhone touch/safe areas/thermal performance, branded Safari and native listening. Figma unavailable. These are not passed by automated checks or silence.

Resume unfinished actions above without repeating benchmark research, redoing completed fixes or requesting routine continuation permission. An ended execution session is not a finished game.
