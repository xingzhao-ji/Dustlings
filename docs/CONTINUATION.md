# Continuation checkpoint — 2026-09-10 06:38 UTC

**Run status: reached a human/device validation blocker; the game is not complete.** Courtyard0.2 is playable and technically verified with the available tools. Player experience, comparative presentation quality and owner acceptance remain separate, unpassed gates. Human sessions:0. Owner feedback was requested in this session and has not arrived. No development is implied to continue after this session ends.

## Exact current experience

- Play `builds/Dustlings Courtyard.html` offline, or open `evidence/REVIEW.html` for current captures, recordings, limits and review instructions.
- Version0.2.0;148,970 bytes; source `4384d82d61210269332cb8568ef89c7399425b86`, clean when built.
- Artifact SHA-256 `cb4b9d7bc6174a96bd203a22f9a8a5a766f3fa0eca10475e80c8e4d681f5feea`.
- Portable archive: `builds/Dustlings-Courtyard-0.2.0-Review.zip`; package CRC and contained game hash are checked by `tools/package-review.py`, with results in `builds/review-package-manifest.json`.
- One courtyard, one creature design, three discoveries,50 helpers, coordinated fountain chorus and finite courtyard ending. Canal and clocktower garden are not produced or eligible yet.

## Completed and verified

- Safer obstacle approaches fix five stranded dust targets; all5,592 tested routes reach work range. All50 helpers reach chorus positions. Impossible restoration saves rejected.
- Stale-window revision/Web Lock guards protect primary and backup saves. A synchronous interruption journal preserves freshly brushed work without bypassing those guards; all5 reload/back/close cases retain it. Same-primary journal conflict and six prior two-tab checks pass. Corrupt settings normalize safely; both browser recovery cases pass.
- Keyboard aim/brush/next-dust/direction, tool/Pan consistency, extra-pointer isolation, named dialogs, change-only announcements and background sound handling integrated. Tap sweep survives normal finger lift; rotation/resize cancels stale input.
- Essential14px / main16px reading text and contrast corrections verified. Landscape courtyard grows from approximately125×78 to373×236 CSSpx; portrait opens1.7×. All466 dust nodes remain reachable;8 corner drags pass. Actual views remain hypotheses for human aesthetics/comfort.
- Paused canvas redraws drop from300 per5s to0 while resize/resolution/resume still work. Silent welcome audio preparation reduces measured Start work from126–128 to13–14ms; native setup cost moves earlier rather than disappearing. Original source sound buffers remain unchanged.
- Source tests37/37; navigation/save/lifecycle13/13; Chrome interaction26/26; accessibility20/20; idle8/8; input-boundary6/6; current WebKit source26/26. Exact offline artifact passes Chrome smoke and12 WebKit checks, with no network requests or JS exceptions. These are engine/layout tests, not physical-device or human evidence.
- Isolated60s,50-helper artifact sample:3,600 intervals, mean16.666ms, p95/p99/worst16.8ms, zero>33.4ms. Host MacBook Pro M4 Pro48GB, macOS26.6.2, headless Chrome152,1440×900,DPR2,audio playing.
- Normal-time actual-input endurance completes in543s with50 helpers, all upgrades and every dust patch cleaned. Exact ending survives save/export/reload/resume; no errors. Non-isolated instrumented run retains three raw timing crossings:216.6ms,100ms,33.400000000023ms; none≥500ms. Startup/final-capture timing is correlated, not a proven cause.19 heap samples2.83–6.99MiB do not prove absence of leaks. See ENDURANCE-0.2.md.
- Current artifact opening/chorus recordings and dirty/restored/device views saved in `evidence/v0.2/`. UI clip corrected from45s to43s so subsequent QAfixture footage is excluded. Historical trim defect preserved. Live audio clips42.747s and50.068s. Artifact/media hashes, playback and links checked; no native/human listening claimed.

## Exact unresolved gaps and next action

1. Use the current artifact for the first real target-player observation and the owner's separate review. Follow PLAYTEST.md and QUALITY-GATES.md; record who, device, artifact hash, exact experience, coaching, frustrations, positive elements, upgrade and continuation counts. Current denominators are0, so no success rate exists. Owner authorization to develop is not quality acceptance.
2. Obtain actual Windows/Mac mouse/trackpad and mobile touch/safe-area/sustained-device observations when access is available. Playwright WebKit is not branded Safari or physical iOS. Native computer-use access was unavailable; no working Windows guest was verified. Figma was unavailable; inspectable DOM/CSS/game prototypes are preserved.
3. Implement the highest-impact newly evidenced weakness, check it, inspect actual gameplay/audio as available, obtain fresh human feedback where required, and save the next checkpoint. Preserve valued elements. Advance beyond the courtyard only when its gates pass.

There is no remaining code correction justified by the presently available evidence. Do not manufacture feedback, add content, repeat completed research, request routine continuation permission, or arbitrarily polish to fill time. If the next invocation brings feedback or device access, immediately resume the applicable action above. Otherwise retain this accurate validation blocker. An ended session is not a finished game.
