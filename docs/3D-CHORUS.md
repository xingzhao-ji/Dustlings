# Shorter active fountain chorus

Status: the 18-second active chorus and save migration pass automated checks. Fresh native scene/audio review and human validation are pending. Human sessions: **0**; no current-build owner acceptance.

## Evidence and focused change

The lead relayed an independent AI critique of the recorded 53-second chorus: water appeared around 15 seconds, followed by substantially the same ring composition until approximately the 49-second modal. This is a recorded presentation observation, not a human enjoyment result. Root separately removed the automatic completion modal so the restored scene and its sound can remain visible/audible.

The bounded task was to shorten that observed weak stretch without changing progression rates, costs, crew behavior or the environment. `CHORUS_DURATION` is now **18 seconds after enough helpers gather**, down from 38. Gathering still takes its actual travel time; it is not included in that active duration. A tiny floating-point endpoint tolerance prevents an extra simulation step at nominal completion. This timing remains a provisional player-experience hypothesis; no artificial waiting was added to meet a total-duration target.

## Save recovery

The save remains `format: dustlings-3d`, `version: 1`. New saves record `ritual_duration: 18`. A missing duration denotes the previous 38-second clock.

The visible `restoration` fraction is authoritative when a save uses a different duration. For example, a legacy half-restored save with `ritual_time: 19` becomes `ritual_time: 9`, while restoration stays exactly 50%. It does not suddenly finish because 19 exceeds the new duration. Valid new-duration clocks are retained exactly as persisted, avoiding repeated-conversion rounding drift. Completed saves remain complete and do not replay completion events. Restarting an inactive partial chorus retains its restored fraction. Invalid duration metadata is rejected before state mutation.

This is forward recovery of existing 3D saves. No compatibility claim is made for opening a new-duration save in an older executable or for importing the historical 2D save format.

## Actual verification

- **28 focused assertions passed**: a fresh chorus waits for gathering; an active gathered fixture takes 18 simulated seconds; current partial saves retain persisted fraction/clock; five consecutive interruptions do not accumulate drift; legacy 25%, 50% and 90% saves resume gradually; current/legacy completed saves remain completed; invalid duration metadata is rejected atomically.
- **All 5,904 routes passed**, now calculated from `_work_position()` for solo, paired-left and paired-right seats from four approach corners. This replaces the obsolete hard-coded ±0.24m approximation and includes the actual ±0.29m paired placement plus boundary/fountain projection.
- **Full ending/save suite passed** with 50 helpers: the controlled 40% brush-duty fixture completed at 561.1 simulated seconds; first helper at 20.25s and first upgrade at 86.3s. These are fixture timings, not unfamiliar-player comprehension or enjoyment evidence.
- **16 filesystem/lock assertions passed**, covering verified saves, staged recovery, backups, stale-instance protection, import/export and unavailable destinations.

Commands, from the repository root:

```sh
.tools/Godot.app/Contents/MacOS/Godot --headless --path godot --script tests/chorus_checks.gd
.tools/Godot.app/Contents/MacOS/Godot --headless --path godot --script tests/simulation_checks.gd
.tools/Godot.app/Contents/MacOS/Godot --headless --path godot --script tests/save_checks.gd
```

Reports: `evidence/3d/chorus-checks.json`, `simulation-checks.json` and `save-checks.json`. The current simulation SHA-256 is `e45ca206c174eb04843356499f00f3a9989f964d6b7daab4be807878a302b943`. Checks used headless Godot 4.7.2 on the Mac host; no expensive crowd benchmark or native window was run during this task.

The first focused check incorrectly compared the restored JSON value to the pre-serialization binary float. Its failure is preserved in `chorus-checks-first-comparison-failure.json`. The corrected check compares the exact persisted values, and repeated save/load confirms no accumulated drift. This was a test-comparison correction, not a lost-progress result.

## Exact next review

Freeze this source and record the current bell→gather→restoration→optional recap sequence. Avoid leaving an artificial delay in the recording driver after the shortened chorus finishes. Inspect the changing water, vegetation, creature motion and final composition at normal playing size; listen to the faster arrangement/ambience transitions. Root owns this integration capture. Ask intended players whether the sequence feels rewarding, understandable, rushed or prolonged, and record the build, cohort and actual comments before accepting the new timing.
