# Active quality gaps and acceptance gates

Current milestone: **courtyard, awaiting human validation**. Player experience, presentation quality, and owner acceptance are independent gates. None has passed. Recorded human sessions: **0**. There is no owner acceptance for the current experience. Technical passes do not change these statuses.

No additional zones are eligible. Priority follows reproduced player-facing failures, then confirmed requirements and available evidence.

| Priority / state | Remaining gap and evidence | Exact next action / acceptance |
| --- | --- | --- |
| P0 / awaiting representative players | Causality, crew control, appeal, upgrade recognition, fatigue, restoration payoff and voluntary continuation remain unknown. Recorded unfamiliar-player sessions: 0. | Observe 12–20 intended players on the frozen artifact. Record exact uncoached-upgrade and continuation n/N, reasons, coaching and segment disagreements. Investigate the strongest observed weakness before changing valued details or adding zones. |
| P1 / awaiting human presentation review | Reference study and actual captures exist; no human has judged current composition, scale, motion, music, sound or emotional payoff. | Review actual opening, 50-helper movement, final cleanup and restoration at normal size/speed. Audition speakers/headphones. Record specific defects and positives against the chosen reference qualities. |
| P1 / awaiting owner assessment | Owner was invited to play frozen0.2; no response, satisfaction or sell-readiness assessment is recorded. | Record the owner's explicit current-build assessment separately from player enthusiasm. Conditional acceptance retains its conditions. Silence is not approval. |
| P1 / awaiting device access | Windows/Mac physical input, real phone/tablet touch/safe areas/thermal behavior, branded Safari and native listening remain unverified. | Test named available physical hardware, mouse and trackpad separately, and actual finger offset/pan comfort. Existing Chrome/WebKit automation does not stand in for this. Mobile release remains a separate milestone. |
| P2 / monitor when relevant evidence arrives | Timing outliers remain unexplained:0.1 one216.6ms; instrumented0.2 full run216.6ms,100ms and a33.4ms boundary value near captures. Isolated0.2 sample had no>33.4ms intervals. | Retain raw results. Reproduce a player-visible stall on an available device before another optimization cycle; capture timing is a correlation, not a cause. Do not repeatedly profile a non-reproduced issue just to remain active. |

The available technical courtyard corrections and artifact checks are complete for this checkpoint. No further product change is justified by the current evidence. This is a validation blocker, not completed product quality. Resume immediately when current-build human observations or physical-device access supply the next actionable check; authorization to continue remains in force.

## Corrected and verified during this run

Version0.2 exact artifact passes Chrome offline smoke and12 WebKit artifact checks; current source passes37 unit tests,13 navigation/save/lifecycle tests and26 WebKit checks. A543s normal-time session completes and preserves its exact ending through export/reload/resume. Interruption recovery retains5/5 tested last sweeps and2/2 corrupted-settings cases. Review media and package evidence are linked from REVIEW.html.

| Observed problem | Focused correction / verification |
| --- | --- |
| Stale browser window can overwrite newer progress and backup | Revision checks, Web Locks and journal guards; 6 actual two-tab checks pass after interruption integration. |
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
