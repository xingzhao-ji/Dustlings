# Continuation checkpoint — 2026-09-10 07:21 UTC

**Run status: active UI refinement, followed by a bounded lighting comparison.** Latest owner direction: standalone Steam Windows first, Mac testing throughout, iPad/iPhone later ports. Sky: Children of the Light is now the primary presentation reference; original Dustlings identity and the one-village/courtyard-first scope remain. Human sessions:0. No player, presentation or owner gate has passed.

## Completed native checkpoint

Native0.2 app packages are preserved at `builds/Dustlings-Courtyard-0.2.0-darwin-arm64-Development.zip` and the corresponding Windows x64 ZIP. Mac packaged execution passes8 launch/import/export/offline checks and5 native recovery checks, including repeated quit, storage failure and reopening. Final wrapper SHA256 aa0dcc81b3c60a08cf8dbf9e6b4d5ee351f2b45aa7071089d42fa56da0d38cdc; checkpoint99ff373. A focused60s native sample recorded7,200 intervals, mean8.33ms, p959.2ms, worst9.4ms; initial200ms pause did not recur and remains unexplained. See DESKTOP-BUILD.md and evidence/platforms/REVIEW.html. Windows binary is unrun. Apple direct device/simulator compiles pass; full Xcode/runtime is blocked by installed framework mismatch. Mobile work is now deferred per latest priority.

## Current implementation and exact next action

- Current SOURCE UI has full-width courtyard and compact HUD; Grow is on demand at every size. Shared paper/relief/button states, full-opacity mute glyph, custom switches/sliders, visual upgrade capability previews and in-card purchase confirmation are implemented. Settings uses a scrolling body and persistent return footer. Pan instructions match actual tool. Grow focus enters/exits correctly. Gentle motion applies to UI, and fresh/unavailable saves have honest onboarding.
- `src/ui.js`, `index.html`, `style.css`, and `src/main.js` contain this unbundled iteration. The standalone HTML and native archives still preserve pre-refinement0.2, so **do not claim new UI is in those packages yet**.
- Eight focused UI checks passed at1280×796,390×844,844×390,820×1180; actual captures are in `evidence/ui-refinement/`. Subsequent small preview-scale/slider corrections need one fresh focused check.37 source tests pass. Browser/accessibility regression process29555 was still active at this checkpoint; inspect its final results.
- `src/audio.js` UI cues committed57e06f5: select/open/close/change/confirm,90ms limiter, mute/SFX/hidden guards, pause-isolated short cue and automatic re-suspension. Nine audition cases and live context checks pass; existing score regression remains numerically consistent. No human listening. See artifacts/audio/ui/.
- Independent artist agent native_icon is preparing an ISOLATED renderer light study under `/tmp/dustlings-light-study`, output `artifacts/light-study/renderer-candidate.js`, matched captures and docs/LIGHT-STUDY.md. Shared renderer is unchanged. Inspect baseline/variant and any safe framing suggestion before integration; reject regressions. SKY-DIRECTION.md records official reference evidence and uncertainty.
- **Exact next action:** inspect browser/accessibility results; rerun focused UI capture after the last small visual correction; correct concrete regressions. Inspect and integrate the bounded lighting candidate only if actual comparison supports its intended clarity benefit. Then save source, bump/freeze the new courtyard candidate, build current desktop packages, run relevant native interaction/recovery checks and record actual new UI motion/audio plus50-helper performance. Preserve0.2 as comparison.

No routine continuation permission is needed. Continue useful work; no added zones until courtyard gates pass. Aesthetic benefit and comfort remain hypotheses requiring unfamiliar-player and owner review. Native packaging does not establish commercial readiness.

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

The previous browser-only checkpoint had no further evidenced correction; the new storefront instruction has opened the native packaging cycle above. Do not manufacture feedback, add content, repeat completed research, request routine continuation permission, or arbitrarily polish to fill time. If the next invocation brings feedback or device access, immediately resume the applicable action above. Otherwise retain this accurate validation blocker. An ended session is not a finished game.
