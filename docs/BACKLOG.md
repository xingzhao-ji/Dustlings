# Active quality gaps and acceptance gates

Current milestone: **courtyard, awaiting human validation**. Player experience, presentation quality, and owner acceptance are independent gates. None has passed. Recorded human sessions: **0**. There is no owner acceptance for the current experience. Technical passes do not change these statuses.

No additional zones are eligible. Priority follows reproduced player-facing failures, then confirmed requirements and available evidence.

| Priority / state | Gap and evidence | Smallest next action / acceptance |
| --- | --- | --- |
| P0 / corrected, verified | Fresh brushing was lost on reload, history navigation, and close/reopen: initially 0 of 5 cases retained it. | A guarded recovery journal now preserves all 5 cases, both settings cases pass, and same-primary conflicting journals preserve unseen work. All 6 prior two-tab conflict checks and 20 storage tests pass. Physical mobile termination remains unverified. |
| P1 / corrected, verified | Wrong-typed settings produced NaN% / −800% labels and unintended enabled flags. | Strict field normalization: 3 unit tests and both malformed/wrong-typed actual-browser edit/reload cases pass. |
| P1 / recording review checkpoint | Version 0.2 now includes all integrated corrections. | Exact offline artifact passes Chrome smoke and 12 WebKit checks. Current source WebKit 26/26. Opening/chorus recorded. Isolated 60-second 50-helper profile: worst 16.8 ms, zero >33.4 ms. Finish review media/package and the normal-speed full-session endurance check. |
| P2 / bounded investigation complete, monitor | Prototype 0.1 recorded one 216.6 ms foreground frame; a subsequent 10-second probe did not reproduce it. | Keep the outlier visible. Check the new exact artifact's sustained sample; investigate further only if new evidence supplies a reproducible cause. |
| Human gate / awaiting people | Causality, creature appeal, upgrade recognition, fatigue, sound, restoration payoff and voluntary continuation are unknown. | Observe 12–20 unfamiliar target players on the exact candidate. Report actual counts and reasons by segment, including disagreement. No enjoyment or demand scores have been invented. |
| Platform / awaiting access | Physical Windows/Mac input, mobile hardware, branded Safari, native listening and release packaging remain unverified. | Use available named device/engine capability; distinguish simulated layouts and Playwright WebKit from real devices and Safari. Physical mobile release remains a separate milestone. |
| Owner gate / awaiting assessment | Current-build satisfaction, completeness, promised value and sell readiness have no owner review. | Present the concrete artifact and evidence; record explicit assessment separately from target-player feedback. Silence is not approval. |

## Corrected and verified during this run

| Observed problem | Focused correction / verification |
| --- | --- |
| Stale browser window can overwrite newer progress and backup | Revision checks and Web Locks; 6 actual two-tab checks pass. Interruption journal integration must preserve these checks. |
| Five dust targets strand helpers outside work range | Safe approaches and obstacle waypoints; all 5,592 routes across 466 nodes / 3 work offsets / 4 starts reach work range. All 50 helpers gather for the chorus. |
| Impossible restoration states accepted from saves | Strict semantic validation; navigation/save/lifecycle audit suite passes 13 checks. |
| Text too small or faint; landscape village approximately 125 × 78 px | Essential text at least 14 px, main body 16 px; 134 contrast samples pass. Landscape approximately 373 × 236 px; initial portrait zoom 1.7. All 466 nodes reachable, 8 corner drags pass. Human aesthetics/comfort pending. |
| Keyboard play absent, tool/Pan conflict, extra finger changes active brush, unnamed dialogs | Keyboard aim/brush/direction/next dust; isolated pointer; named dialogs and drawer state. 20 accessibility and 26 browser checks pass. No screen-reader or human accessibility approval claimed. |
| Repeated live-region replacement and hidden completion sound | Change-only text updates and hidden audio suspension; actual browser checks pass. |
| Paused scene unnecessarily redrawn 300 times per 5 seconds | Dirty-scene rendering; 0 redraws in the corresponding paused probe. 8 integration checks include resize, resolution changes and resume. No energy-use claim. |
| Start gesture stalls around 127 ms | Silent context setup during welcome idle; 3 cold trials reduce Start work to 13–14 ms. Setup cost is moved earlier, not removed. Source audio buffers match. |
| WebKit cancels timed sweep on finger lift | Preserve intentional tap sweep through pointerleave. WebKit 26/26 and focused Chrome 3/3 checks pass. |
| Rotation/resize keeps cleaning at stale world coordinates | Cancel and release held input before camera change. All 6 input-boundary checks pass; 0 post-resize brushed dust in both failing scenarios. |

Human evidence records must identify tester, segment, exact build hash, device, coaching, observations, frustrations, positives to preserve, continuation choice, and follow-up. See [QUALITY-GATES.md](QUALITY-GATES.md) and [PLAYTEST.md](PLAYTEST.md). An ended session is not a finished game.
