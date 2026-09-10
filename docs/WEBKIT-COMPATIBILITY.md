# WebKit compatibility checkpoint

Bounded cross-engine check of the current courtyard source. Benefit: detect browser-specific failures before claiming wider platform support. Evidence: source snapshots, actual automated browser key/touch events, state inspection, and screenshots. No human session, native Safari app session, physical iPhone/iPad session, or native audio audition occurred. Player, presentation, and owner gates remain not passed.

## Engine and conditions

Playwright's WebKit was initially absent. One `npx playwright install webkit` attempt succeeded, downloading WebKit **26.6**, Playwright browser build **2359**, for macOS arm64. The test launched that installed engine headlessly on the existing Mac host with DPR 1, using 1440 × 900 desktop and simulated touch viewports 390 × 844 and 844 × 390.

The engine identifies itself as WebKit 26.6. Its user-agent includes `AppleWebKit/605.1.15` and `Version/26.6 Safari/605.1.15`; that compatibility string does not turn the test into a Safari-app or iOS-device run. Playwright documents that its WebKit uses patched upstream builds rather than branded Safari. [Official Playwright browser documentation](https://playwright.dev/docs/browsers#webkit).

[tools/webkit-checks.mjs](../tools/webkit-checks.mjs) reads an in-memory snapshot of `index.html`, `style.css`, and every top-level `src/*.js` runtime module, serves it at a temporary loopback origin, and records each file's SHA-256. Runtime files are enumerated automatically so new modules such as `src/settings.js` are included. This prevents concurrent implementation edits from changing the running test halfway through. [Latest exact results and source hashes](../evidence/webkit-checks.json) identify the frozen 0.2 source tested on 2026-09-10 UTC; the exact standalone artifact was checked separately below.

## Checks and actual defect

The initial audit, after correcting coordinate-test precision, recorded **24 passed, 2 failed, 0 runtime/console errors**. Both failures reproduced the same input defect:

1. Enable **Tap to sweep** in Settings.
2. Send an actual automated touchscreen tap over reachable dust.
3. Observe `pointerdown → pointerup → lostpointercapture → pointerout → pointerleave`.
4. The brush remains active through pointerup, then the application's pointerleave handler stops it. In both touch viewports, **zero dust** is brushed after 1,100 ms.

[Before-fix event evidence](../evidence/webkit-before-tap-fix.json) preserves the sequence, setting state, exact coordinates, zero cleaning, and source hashes. Root was notified before modifying shared input code. Root's focused correction preserves an intentional timed sweep after finger release while retaining explicit cancellation on pointercancel, blur, hidden state, and tool changes.

The frozen 0.2 source rerun records **26 passed, 0 failed, 0 runtime/console errors**, with no workspace-source drift during the run. Both touch viewport sweeps continue after release. The source revision is `4384d82d61210269332cb8568ef89c7399425b86`; tested `src/main.js` SHA-256 is `1dbfc4eb30bcac39e7a5e1913b12678bf532536d13c55a29293d9b2959016908`. Other file hashes are in the result file.

A focused [Chrome counterpart](../evidence/chrome-tap-sweep-checks.json), recorded at the earlier correction snapshot, also records **3/3 passed** using installed Google Chrome **152.0.7977.83**, headless, 390 × 844, DPR 1, emulated touch. It cleaned 0.934915 dust after 1,100 ms, expired the timed sweep at 1.16161 total dust, and confirmed an actual injected touch cancellation still stops cleaning. These are technical browser results, not physical touch or player-comfort evidence.

Passing cases include keyboard brushing and next-patch navigation, formation of helpers, earning and keyboard-purchasing the brush upgrade, keyboard crew assignment, exact saved dust/upgrades/assignment after reload, persisted volume setting, gesture-started audio, settings pause/resume and AudioContext suspension, touch destination mapping, Grow open/close, reachable settings resume, and no horizontal overflow in the tested layouts.

The keyboard scenario explicitly advances 48 simulation seconds through QA hooks while driving real key events. It is a capability check, not a normal-speed or human pacing result. Touch continuation uses ordinary browser time and actual automated touchscreen taps. Input coordinates are quantized by WebKit, so comparisons use **two CSS pixels** of tolerance; four initial assertions using a one-world-unit tolerance were test precision errors, not established product defects.

## Visual inspection and remaining limits

The assistant inspected [desktop](../evidence/webkit-desktop.png), [phone portrait](../evidence/webkit-390x844.png), and [phone landscape](../evidence/webkit-844x390.png) captures from the pre-fix snapshot. The canvas, dust, creatures, destination marker, enlarged interface text, and responsive control placement render in this engine. The landscape scene and controls occupy separate areas; portrait uses closer framing and crops outer scenery as expected. The final behavior-only rerun did not regenerate these earlier presentation views; they are not captures of the frozen 0.2 artifact. These stills do not establish human readability, comfortable touch, animation quality, or audio quality. The small creatures in landscape still need physical-screen review.

No Windows research was repeated. No VM was started. Browser availability improves cross-engine evidence only; Windows validation, branded Safari, actual iOS lifecycle behavior, physical touch comfort, sustained device performance, and native listening remain unverified.

## Exact standalone 0.2 check

[Standalone results](../evidence/webkit-build-checks.json) record **12 passed, 0 failed, 0 runtime/console errors, and 0 HTTP(S) requests**. The test opened `builds/Dustlings Courtyard.html` directly through `file://` in a fresh WebKit context at 1440 × 900, DPR 1, without a local server. Its **148,970 bytes** match the manifest and SHA-256 `cb4b9d7bc6174a96bd203a22f9a8a5a766f3fa0eca10475e80c8e4d681f5feea`; that hash stayed unchanged through the test.

The checks cover initialization, gesture-started audio, keyboard brushing and helper formation, Escape pause with audio suspension, meaningful progress saving, exact dust/crew/assignment after reload, saved music and tap-to-sweep preferences, and audio resumption on return. Keyboard input is real automated browser input with **21 explicitly advanced simulation seconds**, not a player pacing result. Network requests were blocked and recorded; none occurred. Save recovery here establishes this engine's same-file reload behavior, not persistence across file moves, browser resets, or every platform.

Both scripts closed their browser contexts and browsers, and the source-check server closed before the root agent's separate performance run. These compatibility passes do not change any human acceptance gate.

## Reproduce

```sh
npx playwright install webkit
node tools/webkit-checks.mjs
node tools/webkit-build-checks.mjs
```

Set `DUSTLINGS_NO_CAPTURE=1` for a focused source behavioral rerun without producing additional screenshots. The scripts close their isolated contexts, browser, and temporary server, if used, after the checks. The focused correction, frozen source rerun, and exact standalone check are complete. Next: physical-device and human review of the frozen candidate, with the separate player, presentation, and owner decisions recorded in the quality ledger.

[tools/webkit-build-checks.mjs](../tools/webkit-build-checks.mjs) accepts an optional artifact path as its first argument. Check a frozen build so its manifest and bytes identify one reviewable candidate.
