# Grounded crowd separation

Status: body separation has an automated/rendered comparison; a subsequent spatial work-reservation correction has passed automated checks and **awaits fresh gameplay capture**. The earlier recording below is the spacing-only snapshot. Current-build player enjoyment, creature appeal and owner acceptance remain unverified. Human sessions: **0**. This is courtyard-only work with the existing 50-helper cap.

## Problem and bounded correction

The independent automated critic identified two or three travelling helpers visibly fusing in the existing opening recording at 55–58 seconds, with only five helpers. That observation is evidence of a presentation defect, not representative player feedback. The deterministic comparison also reproduced overlapping centers: 0.116m for five solo helpers and below 0.005m in paired/crowded cases, versus an approximately 0.46m body diameter.

Player benefit: keep individual creatures visible while they travel, work and gather. Smallest correction, budget approximately 15 minutes:

- Maintain a 0.54m desired center spacing on the existing ground plane, using up to 12 symmetric constraint passes with an early exit. Packed positions avoid repeated dictionary access; non-contact pairs skip square roots.
- Use one consistent passing side when approaching another body, then stop steering close to a work spot so helpers can settle.
- Place newborns in a nearby free position beside their source patch, instead of forming inside an existing worker.
- Give explicit teammates 0.29m left/right offsets and reserve a work spot for one worker or its teammate. Preventing unrelated workers from choosing the same spot reduces physically impossible destination stacking.
- Check cleaning range after separation and drive movement animation from actual displacement. Fountain clearance and the walkable courtyard bounds remain enforced. No height, camera, sound, save-format, upgrade-cost or cleaning-rate change was made; deterministic dust `cell` metadata and save validation were retained.

## Actual checks

Run from the repository root:

```sh
.tools/Godot.app/Contents/MacOS/Godot --headless --path godot --script tests/crowd_checks.gd
.tools/Godot.app/Contents/MacOS/Godot --headless --path godot --script tests/simulation_checks.gd
```

The crowd fixture starts either five or 50 helpers, orders them across the courtyard and measures 45 simulated seconds at 60Hz, with solo and paired variants. All four final cases reached the assigned side, assisted with cleaning and stayed within walkable ground. Minimum center distances were:

| Fixture | Before | After |
| --- | ---: | ---: |
| Five, solo | 0.116m | 0.540m |
| Five, paired | 0.004m | 0.540m |
| 50, solo | 0.002m | 0.528m |
| 50, paired | 0.0003m | 0.524m |

The final maximum 50-helper movement speed was 1.424m/s including constraint corrections. All 5,904 dust/actual-pair-offset/approach-corner routes reached cleaning range. The separate full simulation fixture still completed all dust and the fountain with 50 helpers at 640.5 simulated seconds, formed its first helper at 20.25s and reached its first upgrade at 86.3s under the existing 40% brush-duty fixture. Save round-trip and invalid-state rejection checks passed. These are controlled fixtures, not human pacing measurements.

Average headless simulation tick time on this M4 Pro Mac was approximately 0.025ms for five helpers and 2.65–2.78ms for 50. The old overlapping simulation was approximately 0.012ms/0.12ms respectively. This added cost needs inclusion in the integrated sustained performance check; it is not a claim of 60fps on any device. Four- and eight-pass attempts failed the dense spacing check and were replaced before the final capture.

## Inspectable comparison and provenance

The actual Godot/Metal comparison is `builds/3d/crowd-visual.mp4`: 32.27 seconds, 1280×800, unchanged current default camera, on Apple M4 Pro / Mac16,7 / macOS 26.6.2. Segments show before-five, after-five, before-50 and after-50 in the same process and presentation settings. **Each segment has 12 seconds of accelerated fixture preparation followed by eight seconds of displayed movement.** The engine used movie mode at 30fps; its faster-than-real-time recording statistics are not sustained gameplay performance.

Eight actual frames and a media hash registry are under `builds/3d/crowd-visual/`. Frames at three and seven seconds of the after segments were inspected beside the matching before frames: five bodies are separated; the crowded formation occupies more ground instead of sharing body positions. The default-camera smallness of cleaning/foot motion remains a separate presentation gap; fresh review of the recording is needed to judge subtle jitter and comfort. No new audio was introduced or listening acceptance claimed.

- Current simulation SHA-256: `79f70bd9764cb217a251038b28a867c84c18d52ee0e0e78cacb3b3a38c5b9b06`.
- Recording SHA-256: `05bbcd46bdc02289db2152d5d58d8050aa47ea73b58e0ea55d266d1c4191362e`.
- Baseline source is preserved in `builds/3d/crowd-baseline-source.json`, from revision `9e08258b63706fe5885b78c7c1b638bd90a1872c`; quantitative before/after reports are `builds/3d/crowd-checks-before.json` and `crowd-checks-after.json`.

The first render harness failed because the historical simulation lacked the new renderer's `cell` metadata. The harness copied only that deterministic presentation metadata from the current dust grid; no baseline movement behavior was changed. The corrected final render exited 0 without reported errors. Its report contains a few repeated final-stage samples during asynchronous shutdown; these are the same final segment, not extra test cases. The recording and its fixture labels are preserved locally; root should retain them with the final review package.

## Remaining review

The first spacing correction exposed a crowded corner-order slowdown: paired 50-helper assistance was 8.88 motes/45s versus 39.98 in the overlapping baseline. The follow-up below corrects its measured cause while preserving rates. Normal crew-order responsiveness, queueing and perceived comfort still require fresh review.

Root's next action is to capture the current reservation correction, compare the planned closer camera separately, and include it in a fresh native build and sustained 50-helper profile. Intended players must judge whether creatures remain appealing/readable and directing them feels comfortable. Windows execution, mobile interaction, human quality gates and current-build owner approval remain outstanding.

## Follow-up: reserve actual work space

The next bounded ten-minute investigation sampled the paired 50-helper fixture every five seconds. Before correction, 47–49 of 50 reserved work seats overlapped another seat by less than 0.50m. Workers reached the general area but could not physically occupy their assigned places; only nine were cleaning at 45 seconds. This supports a destination-selection correction rather than changing cleaning rates or weakening separation.

`choose_target()` now reserves the ground-projected positions of a worker and its explicit teammate, including fountain/boundary adjustment, before selecting a dust patch. A neighboring dust cell is skipped when its work positions intersect those already reserved. The same position calculation drives movement. Existing speed, rates, costs, cap, assignment anchor and save format are retained.

Actual deterministic results:

| Check | Spacing only | Spatial reservation |
| --- | ---: | ---: |
| 50 paired assistance /45s | 8.88 | 33.99 |
| 50 solo assistance /45s | 8.22 | 22.07 |
| Worst 50-helper center gap | 0.524m | 0.536m |
| Maximum 50-helper speed | 1.424m/s | 1.580m/s |
| Average paired simulation tick | 2.78ms | 2.04ms |
| Controlled whole courtyard completion | 640.5s | 586.5s |

The follow-up's sampled reserved-seat overlap count was zero; 40 workers were cleaning at the 20–35-second samples, versus 8–11 previously. All four five/50 solo/paired cases passed clearance, speed, reachable-ground and useful-cleaning checks. All 5,904 routes and the full ending/save suite passed. A regression floor of 25 assisted motes/45s for this specific crowded paired fixture prevents the measured 8.88-mote queue from silently returning; it is an engineering guard below the observed 33.99 result, not a human pacing target.

The current simulation SHA-256 is `33a7c45f685ded18447dbfdf4575518a8b91aa6720df9af080a93e5fea286b18`. Reports are `builds/3d/crowd-reservations-after.json`, `crowd-diagnosis-before.json` and `crowd-diagnosis-after.json`. These results use headless Mac-host simulation, not Windows execution. No native window was launched during this follow-up because root owned the capture slot. The earlier movie proves only the preceding spacing correction; inspect a fresh current capture for queue flow, foot motion, jitter and the meaning of directing a crew before closing the presentation gap.
