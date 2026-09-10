# Active quality gaps and acceptance gates

Current milestone: **courtyard, awaiting human validation**. Player experience, presentation quality, and owner acceptance are independent gates. None has passed. There are zero named human test sessions and no owner acceptance for the current experience. Technical passes do not change those gate statuses.

Priority follows observed impact, then confirmed requirements. No new zones are eligible while the courtyard has material unresolved defects and lacks current-build human review.

| Priority / state | Gap and evidence | Smallest next action / acceptance |
| --- | --- | --- |
| P0 / implementing | A stale second window overwrites newer progress and can destroy its backup. Reproduced using two SaveStore instances. | Serialize browser writes, compare loaded revision, pause stale branch and allow export/latest recovery. Verify two actual tabs preserve both primary/backup and cannot restart over newer data. |
| P1 / implementing | Five dust targets produce navigation oscillation outside work range. Exhaustive route audit. | Safe approach points and circle routing; all 466 nodes from four starts with three buddy offsets must enter work range without obstacle penetration. Inspect actual motion. |
| P1 / implementing | Semantically impossible restoration states pass save validation. | Reject impossible chorus/restoration states; preserve prior local state on failed import and recover backup. |
| P1 / implementing | Required text below proposed size and contrast targets; screenshot and measured CSS colors. | Essential text ≥14px, body ideally16px, normal text contrast ≥4.5:1, reachable/legible journal in actual desktop and phone backgrounds. |
| P1 / implementing | Pan mode overrides selected tools; extra touch moves the active brush; no keyboard brushing; unnamed dialogs. Browser/source audit. | Isolate active pointer, explicit tools exit Pan, meaningful keyboard route, labeled dialogs and stateful drawer. Verify concrete interactions and inspect cursor behavior. |
| P1 / open | Unchanged live-region text is replaced repeatedly; hidden completion audio keeps playing. Mutation/browser audit. | Change-only DOM updates and unconditional hidden audio suspension; verify announcements are not reinserted and return is predictable. Actual screen-reader/hardware listening still required. |
| P2 / open | 216.6ms foreground frame in recorded 50-helper profile, cause unknown. | Trace simulation/render/UI/long tasks and idle redraw; identify reproducible source before optimizing. Retain outliers. |
| P2 / open | Whole-fit phone scene and landscape scene are too small in actual viewport captures. | Prototype closer framing/responsive insets with reachable edges; test real touch when hardware available. |
| P2 / blocked by human availability | Causality, charm, upgrades, pacing, fatigue, sound, restore payoff and voluntary continuation are unknown. | Observe12–20 unfamiliar target players using exact build; separate segments/counts/reasons. No substitute scores. |
| P2 / open platform work | Physical Windows/Mac input, mobile hardware, Safari and native readiness remain unverified. | Inventory accessible test capability; perform named available checks without mislabeling emulation. |
| Gate / pending | Owner's satisfaction with current build, completeness, promised value and sell readiness is not recorded. | Present current reviewable build after technical corrections; record owner's explicit assessment separately from player feedback. Silence is not approval. |

Human evidence ledger must identify tester/segment, build hash, device, observed experience, coaching, frustrations, positive elements to preserve, continuation choice, and follow-up. See PLAYTEST.md. A new material change reopens relevant human review; previous approval cannot be silently carried to a different experience.

Continuation checkpoints are saved approximately every20minutes in docs/CONTINUATION.md. An ended execution session is not a completed game.
