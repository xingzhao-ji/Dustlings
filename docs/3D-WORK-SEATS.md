# Far-side helper work-seat experiment

2026-09-10. Status: isolated numerical acceptance checks passed; visual selection and human response remain separate. No production simulation was changed by this task.

Player benefit hypothesis: helpers working on the far side of a patch may keep their faces and hand-to-dust action more visible from the default camera. The evidence motivating the experiment is the independent AI critic's actual-footage observation that the near-side target facing hides the face after the hand-pose correction. This is not a representative-player preference or owner acceptance.

The bounded task was 15 minutes. The smallest experiment changes only `_work_position` in `builds/3d/experiments/far-work-seats`, copied from the frozen `helper-work-contact` source:

| Seat | Near-side baseline | Far-side experiment |
| --- | --- | --- |
| Solo offset, metres | `(0, +0.15)` | `(0, -0.27)` |
| Paired offsets, metres | `(±0.29, +0.12)` | `(±0.29, -0.20)` |

Authored work rates, movement rates, reservation rules, collision separation, upgrade costs, progression and save format are unchanged. A byte comparison confirms those seat offsets are the only difference between the two tested simulation files; their hashes remained unchanged during all checks.

## Actual results

[Summary](../evidence/3d/work-feedback/seat-checks/summary.json) and [source/driver provenance](../evidence/3d/work-feedback/seat-checks/provenance.json) bind the results to the isolated variants. Both variants ran Godot 4.7.2 headlessly on the Mac host. Baseline/far processes ran in parallel while the root captured gameplay; the recorded average simulation tick costs are diagnostic timings under that load, **not sustained game-renderer performance**.

Both variants passed all **5,904 routes using actual `_work_position` goals**, including boundary/fountain projection, solo and both paired seats from four approach corners. Each also passed the ten existing full-ending/save assertions. The controlled 40% brushing fixture produced the first helper at 20.25 simulation seconds and the first meaningful upgrade at 86.30 seconds in both variants.

| 45-second directed-work fixture | Near assisted units | Far assisted units | Change | Far minimum centre distance |
| --- | ---: | ---: | ---: | ---: |
| 5 helpers, solo | 2.15367 | 2.14223 | −0.53% | 0.54000 m |
| 5 helpers, paired | 4.04983 | 4.04289 | −0.17% | 0.54010 m |
| 50 helpers, solo | 22.07450 | 22.28707 | +0.96% | 0.53651 m |
| 50 helpers, paired | 33.99151 | 33.78612 | −0.60% | 0.53616 m |

The exact near-side baseline reproduces the previously reported 33.99 paired assisted units. All four far-side cases reached the assigned area, performed work, stayed on walkable ground and exceeded the tested 0.50 m centre-spacing floor for the approximately 0.46 m body. Maximum observed far-side speed was 1.58011 m/s, below the existing 1.7 m/s jump guard. The 50-helper paired service rate remained above the existing 25-unit regression floor. No tested service deadlock, centre-overlap threshold violation or engine diagnostic occurred. These numerical criteria do not prove that actual crowd motion is visually comfortable or free of every visible limb overlap.

The controlled full ending moved from **561.10 to 566.20 simulation seconds**, a 5.10-second increase (0.91%). A focused phase trace accounts for the difference:

| Phase | Near duration | Far duration | Difference |
| --- | ---: | ---: | ---: |
| Start → chorus request at 75% clear | 439.20 s | 441.85 s | +2.65 s |
| Gathering and active chorus | 23.25 s | 24.30 s | +1.05 s |
| Fountain restoration → completed cleanup | 98.65 s | 100.05 s | +1.40 s |

The active chorus duration remains 18 seconds; the middle-phase increase is gathering time. The run's total assisted contribution changed from 256.419 to 253.155 units, with the corresponding increase in manually brushed contribution. These shifts are consistent with changed travel and work-position geometry. The trace does not identify every individual target reassignment responsible for them. No rates were increased to conceal the tradeoff, and no additional offset variant was invented to optimize this small numerical difference before the visual decision.

## Scope and resumption

The isolated `simulation_driver.gd` is the existing simulation test with an explicit output argument. The isolated `crowd_driver.gd` retains the existing four travel/work fixtures; route coverage comes from the actual-seat simulation driver. The older canonical crowd test still has approximate near-side route offsets, so its route block must not be presented as validation of far-side seats. No canonical test or runtime source was edited here. A separate `phase_driver.gd` repeats only the same ending fixture to locate the measured timing change.

Reports and logs are retained under `evidence/3d/work-feedback/seat-checks/`. Baseline source SHA-256: `d8d819791edf69bc9973a21ec173424fc69c35f64a226cd29ff572e8e0459fc5`. Far-side source SHA-256: `35c5067fd97f6715068068a007a4b2005672f34ab7151974881fa77677b3d11b`. The provenance record includes exact fixture paths and driver hashes.

The root owns the actual same-camera visual comparison and any production adoption. The next decision is whether the observed face/action visibility benefit justifies this measured timing tradeoff. If selected, integrate the exact offset change, retain these results under their original hashes, and inspect the resulting native crowded scene before generating the next review package. Human sessions remain **0**; recognizability, appeal, comfort and current-build owner acceptance remain unverified.
