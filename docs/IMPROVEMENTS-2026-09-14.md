# Resumed quality work — 2026-09-14

The owner's current request resumes development and supersedes the historical stop checkpoint. Work remains inside the Bellwether neighborhood. No new campaign destinations or human acceptance are inferred.

## Selected correction: a visible shared tea gathering

- Benefit: the restored crossing leads to a social result the player can see, matching Tavi's dialogue.
- Evidence: actual `neighborhood-route-refined/route.mp4`, 160 seconds, and `evidence/rpg/review-2026-09-14/gathering.png`. Only Tavi and Mara move toward the table; Ivo and Nell retain their earlier targets. Cups are held without drinking, and the scene lacks the bread named in dialogue.
- Smallest implementation: gather all four residents in the existing clear forecourt, face the group when the player is not addressing them, attach the tea cup to the hand through a staggered sip, and add bread/saucer props to the existing table. Preserve colliders, progression and free player control. Update only generated route waypoints that need to follow the residents' new locations.
- Bounded effort: one integrated animation/staging pass, targeted actor/scene checks, then the complete generated native route and ordinary-size visual inspection. Further taste changes require evidence.
- Acceptance: four residents reach their reachable targets; tea cup stays in hand through lift/return; no scene overlap or obstructed dialogue; complete route still earns discovery and home rewards.

## Export baseline

The requested first action, exact packaged checker on the preserved 0.5.0 RPG export, stopped before launch. Its manifest reports a dirty runtime snapshot caused by an untracked earned-route test. That failure is preserved at `evidence/rpg/package-validation-2026-09-14/report.json`. Do not weaken the clean-snapshot gate or edit the old manifest. Produce a clean-source export after corrections and run the full packaged checker on that exact build.

## Navigation and test isolation corrections

The first integrated import fixture exposed two real movement problems: Ivo's proposed standing place obstructed the path toward the table, and Mara could not leave a physically clear narrow passage beside her workshop counter. The latter combined an over-conservative 4 cm navigation-grid clearance with an empty route cached before physics resolved the initial counter contact. Residents now stand in an open arc beside the table; grid clearance is 1 cm, with the existing full-radius continuous collision checks on every connection retained. Empty paths retry at most twice a second after physics contact resolves. A completed table no longer intercepts E when the player walks within one meter of a guest. The 72-second fixture and earned route must pass without moving actors or awarding progress in the test.

A reveal-test invocation omitted the QA flag. That test used the normal save namespace; the independently repeated fresh isolated test produced exactly equal JSON at revision 6. The test-created files were moved out of the ordinary profile and preserved under `evidence/rpg/quality-2026-09-14/accidental-unisolated-save/`. Historical courtyard saves were untouched. All four scene-test entry points now reject a missing `--rpg-qa` before instantiating a game. `tools/check-rpg.mjs` supplies the flag and creates separate fresh evidence/save directories automatically. The failed invocation remains recorded.

## Release presentation

The old 40×40 app icon used a dark gray body, unlike the cream-colored companions shown in the actual game. The icon now uses the same two-eye/leaf identity with a cream body, visible feet and a garden-green background, authored as SVG. Verify the rendered icon at Dock/store sizes and inside the exported app. This is a presentation proposal, not human visual acceptance.

MovieMaker on this Mac clamps a requested 1920-wide native window to 1728 pixels. The first wide capture is preserved with its actual dimensions. The explicit QA-only `--rpg-capture-hd` path uses Godot's documented viewport stretch mode to render genuine 1920×1080 gameplay in a smaller display window. Gameplay, graphics quality and input route are unchanged; capture metadata carries the override. This is offline media rendering, not a 1080p performance measurement. [Godot movie resolution guidance](https://docs.godotengine.org/en/stable/tutorials/animation/creating_movies.html#rendering-at-a-higher-resolution-than-the-screen-resolution)

## Consistent camera controls at the minimum window

The actual 960×640 orbit film rotated 1.767 radians for a requested 1.571-radian quarter turn, a 12.5% sensitivity change caused by Godot scaling `InputEventMouseMotion.relative` with the UI. Camera yaw/pitch now use `screen_relative`; generated QA events explicitly set that unscaled field as a real OS event does. The same full orbit, low/high pitch and return are rechecked at the minimum window. This follows [Godot's input coordinate documentation](https://docs.godotengine.org/en/stable/classes/class_inputeventmousemotion.html#class-inputeventmousemotion-property-screen-relative).

The HD still probe succeeded, but the MovieMaker writer initialized its video size before the scene resized the viewport. The capture tool now freezes explicit viewport size/stretch overrides before engine startup and rejects a non-1920×1080 HD video via ffprobe. Earlier mismatched movies and failed media-generation logs are kept as diagnostics; they are not the final store video.

## Verification checkpoint before export

All seven source suites pass in `evidence/rpg/quality-2026-09-14/release-checks/`: actor 47, story 83, save 44, reveal 25, integrated scene 45, companion/navigation 28, plus the complete earned InputEvent route and seven continuity checks. Four negative-entry tests confirm missing QA flags are rejected before touching ordinary saves.

The 159-step native route finishes in 193.925 engine seconds. Final native media includes seven genuine 1920×1080 screenshots, four title capsules and a 22.6-second gameplay preview with original audio; `evidence/rpg/store-kit-release-20260914/`. Minimum 960×640 settings/journal views fit; the 59-step full camera/acting route passes after the camera correction. Native panel checks find zero layout violations in 167 visible minimum-window dialogue frames and 1,557 frames in the full route. These are generated controls and technical observations; human sessions remain zero.

Two quiet native 1280×800 samples on this M4 Pro/Mac16,7, 48 GB, macOS 26.6.2 use normal graphics/audio with no movie writer. Opening: 60.016579 seconds, 7,201 callbacks, p95 9.282 ms, p99 10.087 ms, worst 14.980 ms. Active four-companion walking: 60.017689 seconds, 7,197 callbacks, p95 12.374 ms, p99 12.898 ms, worst 18.405 ms. Both have zero callbacks above 33.4 ms. Focus was not instrumented; these are callback intervals, not physical input latency, Windows performance or prolonged thermal acceptance. Source manifests and raw intervals are in the two profile folders.

The first active profiling circuit encountered an existing bench and failed its minimum-motion assertion. Its measurements remain diagnostics. The corrected workload reverses along the actually clear front lane for 50 seconds, then settles for 10; actual distance and completed lengths are asserted. Only the profiling driver/console result changed after the final full-game media. All gameplay/actor/environment/camera sources match that recording; the capture has declared project-only HD rendering overrides.


## Exact release verification

Runtime5e07248, source `8196bad7d8968a557ad8efc87b6d56d14b77e8fa05af650b92b537083b5b6406`. The first package check passed78/79 before expected malformed-JSON recovery emitted four engine errors. Replaced static parsing with an instance parser returning an error code, preserving the same validation and backups. The existing recovery fixture now contains genuinely truncated JSON. RPG44/44 and shared legacy16/16 checks passed, then a fresh export passed all95 packaged checks across three native processes. The first failed report is retained. [Godot JSON error handling](https://docs.godotengine.org/en/stable/classes/class_json.html).

Windows ZIP extraction/CRC/notices verified; both22-script source packs match. Exact Mac launcher verified without opening ordinary progress. Steam offline stage17 files verified at `/Users/xingzhaoji/Library/Application Support/Dustlings/SteamStaging/0.5.1-20260914`. The initial Desktop stage failed strict signature due to Finder metadata; a new stage on the local Application Support volume passes. No signing guard was weakened. No app IDs, upload or payment occurred.
