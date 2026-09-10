# Pointer boundary and resize recovery

Player benefit: brushing and crew direction should stop predictably when a gesture leaves the scene or the camera changes, and invisible regions should never accept restoration input.

The focused check used actual mouse down/drag/up events in local headless Google Chrome 152.0.7977.83. It did not test tap-to-sweep or claim physical touch-device behavior. Six bounded cases were exercised against the running app at 844×390, with orientation to 390×844 and a same-mode resize to 900×450.

| Case | Before correction | After correction |
| --- | --- | --- |
| Brush press in excluded blank region | Pass: zero brushed dust | Pass |
| Direct press in excluded blank region | Pass: zero assignments | Pass |
| Drag brushing outside scene | Pass: brushing stops | Pass |
| Release crew direction outside scene | Pass: no assignment | Pass |
| Rotate while brush is held | Failed: stale target remained active; another 0.3825 dust units brushed during the next 450ms | Pass: inactive pointer; zero additional brushing |
| Resize within landscape mode while brush is held | Failed: stale target remained active; another 0.3683 dust units brushed during the next 450ms | Pass: inactive pointer; zero additional brushing |

The root applied the smallest correction in `main.js`: stop active input before changing the renderer/camera on resize; clear pointer visibility and the previous pointer location; release capture after clearing the active pointer identifier. This QA task did not edit `main.js`.

All six checks passed after that correction. The current orientation frame was visually inspected: the portrait camera uses its larger framing, the interface fits, and no active brush ring remains at the stale target. The small gold first-patch prompt is intentionally still visible. All browser instances created by this check were closed before the root's isolated capture work.

Review: [before results](../evidence/input-boundary-before-fix.json), [after results](../evidence/input-boundary-checks.json), [before orientation frame](../evidence/input-boundary-before-orientation.png), [after orientation frame](../evidence/input-boundary-orientation.png), [after same-mode resize](../evidence/input-boundary-same_mode_resize.png).

Repeat with `node tools/input-boundary-checks.mjs` while the local server runs on port 4173. The tool returns a failing exit code if any check fails and closes its browser in a `finally` block. Physical orientation interruptions, finger comfort and unfamiliar-player understanding remain unverified.
