# Camera and remaining-dust access audit

Status: the five confirmed control failures are corrected and the focused native audit passes. Current gameplay movement inspection and human usability validation remain separate gates. This is a focused reachability/input audit; no camera composition redesign, new content or human usability claim is proposed.

Player benefit: remaining work should be findable without aiming through scenery, and reframing should never sweep an unintended path. Evidence is the current source plus actual native projection/physics checks. The earlier integration assertion checked only that N enabled keyboard aim at a nonzero coordinate; that does not establish visibility or an unobstructed ground ray.

## Actual baseline

On 2026-09-10, Godot 4.7.2 on Apple M4 Pro, Metal Forward+, a controlled native audit tested 492 dust centers at two window sizes (1280 × 800 and the supported minimum 960 × 640). The logical game viewports were 1440 × 900 and 1080 × 675 respectively. For each layout it tested the default 1.12 zoom, Frame at 1.0, close view at 1.8, and four legal corner pans at 1.8. This is generated native input/raycast testing on a Mac host, not a human usability session or Windows validation. The fixture uses a fresh cache path and ephemeral lock, never writes progress and never starts audio.

At default and Frame, 480/492 dust centers had an unobstructed, in-view ground ray; 12 were blocked by real scenery. At close view and panned edges, some required centers were outside the viewport or under HUD, as expected for zooming. Six near-fountain centers were blocked in every sampled view. A subsequent controlled final-speck fixture left only those six cells, with the existing 50-helper workforce: after 14 simulated seconds, remaining dust was zero and assisted removal was 6.0. This verifies the existing automatic residual cleanup, not direct visibility or human pacing.

## Baseline failures and focused corrections

1. **N repeats a blocked target.** With only dust 69 and 70 remaining, both presses selected 69 at (−1.573, −2.908). Its actual ray hit `CourtyardBlockers_stone`. Dust 70 at (−0.961, −2.966) was an unobscured ground alternative. Correction: select remaining targets using actual projected bounds, HUD exclusion and layer-1 raycasts; advance past blocked candidates. If no current target is visible, reframe safely and select a reachable location or clearly explain helper cleanup. Acceptance: repeated N cannot strand the player at a blocked marker while an open remaining patch exists.
2. **Home and Frame preserve held strokes.** Both retained mouse brushing, keyboard hold and tap duration while changing the camera target. Correction: share one reframe method that cancels active stroke/pan state before changing zoom/target. Acceptance: all held stroke flags are clear immediately after either path; returning from a camera move requires fresh intentional input.
3. **Keyboard aim depends on parked mouse hover.** With a verified open keyboard target, placing generated mouse hover on Settings made `_update_cursor()` reject the keyboard target. Correction: perform GUI-hover rejection for pointer-driven targeting only, while independently checking the keyboard target's own screen position. Acceptance: keyboard targeting on open paving still works with the mouse over HUD, and keyboard coordinates under a UI control cannot brush through it.
4. **N leaves an offscreen residual target offscreen.** At zoom 1.8, pan (−3, −2.2), only dust 23 at (4.528, −3.872) remained. N kept its marker at logical x1458.93, outside the 1440-pixel viewport. Its initial cell happens to be visible in all sampled cameras, so the opening alone did not expose this defect. Correction: safely return to a bounded wider view before selecting again. Acceptance: N brings a reachable remaining target into view; when every remaining cell is occluded, it explains the verified helper cleanup instead of aiming through a blocker.

## Verified correction

Root implemented a shared stroke-cancelling Frame/Home path, mouse-only hover rejection, and a cycling N search that validates screen bounds and actual surface rays. When a dust center is hidden by the fountain silhouette, the search can select visible neighboring paving inside the existing brush radius. If no current-view candidate works, it cancels stale input and smoothly frames wider before searching again. It does not change obstacles, cleaning rules or the camera's perspective.

The initial native baseline had 16 passes and 4 failures; the expanded offscreen/residual fixture had 17 passes and 5 failures. The first corrected run had 23 passes and zero failures. The final strengthened audit had **25 passes and zero failures**, including:

- All **984** individual remaining-cell cases (492 actual cells × two window layouts) yielded an in-view, unobscured ground point covering the remaining dust within the existing brush radius.
- Dust 69/70 now have valid neighboring coverage; repeated N advances to a valid second aim. The six hidden centers also have reachable neighboring brush positions. Existing 50-helper final-speck cleanup still removes their 6.0 units in the controlled 14-second simulation.
- A deliberately farther offscreen target, dust 491 at (7.058, 4.316), began at logical screen (1803.27, 1688.56). The actual smooth reframe took **48 native process frames / 776.9 ms**, with measured frame deltas and no manual camera snap. Its zoom settled from 1.8 toward 0.85 (measured 0.85296), and the selected ground point covered that dust. This is one controlled native observation, not an animation preference or performance guarantee.
- Home and Frame clear mouse, keyboard and tap stroke flags. Keyboard aim remains valid with generated mouse hover over Settings. The test never starts the soundscape or writes progress.

The target acceptance was strengthened to assess the actual visible selected ray and remaining-dust coverage, allowing the purposeful neighboring brush position instead of requiring every hidden dust center to become directly visible. The additional far-offscreen and 984-cell sweep specifically cover the new search/reframe behavior. These are controlled state/input fixtures, not physical mouse/keyboard events, human play, pacing evidence, or Windows validation.

Before failures, both corrected runs, exact before/after main sources, test versions and SHA-256 hashes are preserved in [evidence/3d/camera](../evidence/3d/camera/). The final [results](../evidence/3d/camera/after-final.json) and [engine log](../evidence/3d/camera/after-final.log) contain no runtime errors or cleanup warnings. The main source hash for the successful runs is `e44af73f26f887e682512bdbb440c92e2735cee8702a0f2a44c3426dc17eae0b`; later QA-only changes must not be mistaken for that exact snapshot.

Run the committed native test with the app slot free:

```sh
.tools/Godot.app/Contents/MacOS/Godot --path godot --script res://tests/camera_checks.gd --resolution 1280x800 --max-fps 60 -- --qa --camera-output=/tmp/dustlings-camera-results.json
```

The script deliberately disables autonomous simulation ticks while exercising real camera methods, native viewport resizing and world physics rays; the smooth reframe uses actual native process frames. Its generated input and isolated progress path are explicit in the report. A headless run is not equivalent to the native viewport/GUI checks recorded here.

No target-player or owner acceptance is recorded. Human review should assess whether N, camera movement and blocked-target notices are comfortable and understandable at normal window size; automated rays do not establish that. Exact next action: root includes the corrected runtime in the current native gameplay review capture and packaged verification. Ask unfamiliar players to locate remaining work and recover from close zoom without coaching; investigate frustration or unexpected movement before any broader camera redesign.
