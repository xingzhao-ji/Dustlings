# Courtyard performance corrections — 2026-09-10

The intended benefit is responsive interaction with50 visible helpers and less unnecessary work when paused. These are browser measurements on MacBook Pro Mac16,7, M4 Pro,48GB, macOS26.6.2, headless Chrome152. They do not establish energy use, on-screen responsiveness, thermal stability, human comfort, or weaker-device performance.

## Observed issue and bounded correction

The0.1 sustained profile reported one216.6ms foreground interval. A10-second instrumented50-helper probe did not reproduce it: active render p95=1.7ms, no long tasks. The original outlier remains unexplained; no causal fix is claimed.

The same probe established300 canvas redraws during5 seconds of stationary pause, mean1.58ms per draw. The smallest correction marks the scene dirty after relevant state/layout changes, redraws on demand while paused, and preserves continuous active animation. Repeated pause UI refreshes were also removed.

Afterward the corresponding5-second paused probe recorded0 redraws. A10-second active probe had frame p95=16.7ms, max16.8ms, renderer p95=3.4ms and max4.9ms. Other browser work may have overlapped these short probes, so their active render times are not a controlled speed comparison.

Evidence: [before](../evidence/profile-before-idle-fix.json), [after](../evidence/profile-after-idle-fix.json). An8-check [integration test](../evidence/idle-checks.json) verifies welcome silence, active animation, no paused simulation/redraw, resize and resolution-setting redraws, return to idle, resumed animation/audio, and no errors. The page still receives animation-frame callbacks; zero canvas redraws does not mean zero CPU usage.

A separate startup long frame was traced to native AudioContext creation, approximately111ms in three cold trials. Audio preparation moves that source-free setup into the welcome period after paint. The Start gesture still builds the graph and begins sound. See AUDIO-STARTUP.md for exact trial conditions and lifecycle checks. This does not explain the earlier isolated active-play216.6ms interval.

## Current limits and next checks

A sustained50-helper profile must identify the exact standalone artifact, browser, viewport, DPR, audio/quality settings and concurrent workload. Keep all stalls in reported statistics. Record physical Windows/MacBook input and mobile hardware only when actually tested. Performance acceptance is also contingent on target players finding movement readable and controls comfortable; no automated threshold substitutes for those judgments.
