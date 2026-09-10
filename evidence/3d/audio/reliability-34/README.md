# Audio reliability evidence: 34 checks

These are actual Godot audio-engine checks on the available Mac host with the Dummy driver, plus full integration tests using generated QA input. No human listened or played as part of these tests.

`checks.json` / `checks.log` contain the final34-check result. `checks-harness.wav` is actual mixed engine output from deliberately isolated test transitions, not normal gameplay. `integration-final.log` checks the final shared source.

`drain-before/` preserves all three failing0.15-second drain repetitions. They returned process exit code0 while logging leaks; exit code alone did not establish success. `drain-after/` preserves three clean0.6-second candidate repetitions. The final source applies the longer drain to Dummy only. The failed unpause variant and the earlier clean isolated shutdown are retained to show the limits of those checks.

`provenance.json` records original paths, byte counts and hashes. Current-build native-device exit and human listening remain open gates.
