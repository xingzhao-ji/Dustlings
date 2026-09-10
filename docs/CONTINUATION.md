# Continuation checkpoint — 2026-09-10 06:12 UTC

Current milestone: **courtyard, awaiting human validation**. Player experience, presentation comparison, and owner acceptance remain separate, unpassed gates. Human sessions: **0**. Development is still running at this checkpoint.

Completed since the 05:52 checkpoint:

- Readable typography/contrast and responsive camera integrated. Desktop framing preserved, landscape village grew from approximately 125 × 78 to 373 × 236 px, portrait opens at 1.7×. All 466 dust nodes reachable, 8 corner drags pass; before/after views and short motion recordings saved. Commit `30a8f5e` plus root integration `dccdd37`.
- Paused rendering reduced from 300 canvas draws per 5 seconds to 0. Eight integration checks pass, including paused resize/resolution redraw and resume. The original isolated 216.6 ms active-play stall remains unexplained and was not reproduced in the 10-second trace.
- Reproducible audio startup cost traced to native AudioContext construction. Silent welcome preparation reduced measured Start work from 126–128 to 13–14 ms across 3 trials. Cost moved earlier, not removed. Generated source buffers unchanged; no human listening claim. Commit `8cf3b4e`.
- WebKit 26.6 installed and tested. It exposed canceled tap-to-sweep after finger lift; corrected in main. Fresh WebKit 26/26 and focused Chrome 3/3 pass. This is Playwright WebKit on Mac, not branded Safari or physical iOS. Audit commit `944b2c0`.
- Rotation/resize while holding brush reproduced stale-target cleaning; input now stops and releases capture. All 6 boundary checks pass, with 0 additional dust brushed after rotation/resize. Evidence commit `ea7bac6`.
- Invalid saved settings normalized independently using strict numeric/boolean fields. Three new unit tests pass; total source unit tests currently 27. Actual settings browser rerun is pending joint recovery integration.

Highest-impact open work:

1. Interruption audit reproduced lost newly brushed progress in all 5 reload/back/close trials. The sound agent is implementing `SaveStore.checkpoint(state)` in storage.js: synchronous separate recovery journal carrying exact canonical baseline, with a journal-change conflict guard. Canonical primary/backup writes stay under Web Locks. Integrate checkpoint calls on pagehide and hidden visibility in main.js; label interrupted recovery accurately. Then rerun actual interruption/settings and existing two-tab conflict checks. Do not replace canonical locking with an unsafe unload write.
2. Commit tested input/settings integration and checkpoint state. After recovery passes, freeze source version 0.2 and `npm run build`; build manifest now records source revision, dirty status and artifact hash. Current standalone artifact remains old 0.1 until that command.
3. Run current-artifact opening capture, restoration recording, offline smoke and isolated 50-helper 60-second profile. Tools accept `DUSTLINGS_EVIDENCE_DIR=evidence/v0.2`; QA accepts `DUSTLINGS_CAPTURE_ONLY=1` and `DUSTLINGS_URL=file://...?...`; fixture-aware tools accept `DUSTLINGS_FIXTURE_DIR`. Preserve old evidence. Convert recordings to MP4 with ffmpeg. `tools/review-page.mjs` will generate the updated human review page only after matching-hash evidence exists.
4. Research agent has prepared dynamic source enumeration (now includes settings.js) and exact standalone WebKit checks. Notify it when the build is frozen; coordinate browser shutdown before isolated performance sampling.

Useful next work is recovery integration and exact candidate verification, not more aesthetic additions. No further zones. Physical Windows/Mac input, real mobile touch/safe areas/thermal performance, native listening, unfamiliar-player satisfaction and owner acceptance remain unresolved. Figma unavailable. No tester outreach sent.

Resume by checking git status and unfinished actions above. Do not repeat benchmark research, rebuild the plan, or ask whether to continue. An ended session is not a completed game.
