# Current gate status — 2026-09-14

**Technical preview package verified; human and commercial acceptance pending.** [Review hub](../evidence/rpg/REVIEW.html).

| Gate | Current evidence |
| --- | --- |
| Source behavior | Seven sequential isolated suites passed;272 assertions plus earned-route continuity checks. Final truncated-save parser rerun44 RPG /16 legacy checks passed. |
| Actual Mac package |95/95 fresh/resume/damaged-save recovery checks; exact archives, native process logs, screenshots, settings and story comparisons. |
| Complete neighborhood |159-step generated-input route; all four residents gather. Actual moth exchange, kept light, gift and home-return views inspected. Human pacing/enjoyment unmeasured. |
| Minimum UI/camera |960×640 settings/journal bounds and59-step acting/orbit pass;93/167 monitored visible panel frames stable. Native route1557 stable panel frames. |
| Native callback cadence |60s opening and60s active four-companion runs pass on their recorded sources. [Conditions and limits](PERFORMANCE.md). |
| Distribution preparation | Mac/Windows exports, exact source-pack/notices/Windows ZIP checks, offline Steam staging and store-media drafts prepared. Windows remains unrun; Mac unnotarized. |
| Human / presentation / sound / owner |0 RPG participants; all pending. Sparse reverse-view scenery and broader visual appeal remain review questions. |
| Commercial | No paid launch, validated demand or revenue. Full campaign unfinished. |

The older source-bound records below remain historical; their pending package/capture items are superseded by the above, their human gates remain open.

---

# Bellwether RPG opening — quality gates

**Milestone: in development; awaiting human validation and owner acceptance.** This is the new third-person 3D RPG opening, superseding the cleanup-only scope. It is not the old courtyard product. Review snapshot prepared on 10 September 2026; development stopped on the owner’s instruction at18:27UTC. [Local review hub](../evidence/rpg/REVIEW.html).

## Separate decisions

| Gate | Required evidence | Actual status |
| --- | --- | --- |
| Player experience | Unfamiliar intended players control and explore without coaching, distinguish residents, choose goals, notice lasting consequences, discover fair clues and voluntarily want to return. Investigate frustration, fatigue and disappointment. | **0 RPG participants. Awaiting validation.** The [prepared protocol](RPG-PLAYTEST.md) separates cozy/life-sim RPG players, incremental/cleanup experience and friends/developers; target 12–20 unfamiliar players. No outreach or satisfaction has been inferred. |
| Presentation | Actual ordinary-size gameplay and motion show deliberate composition, scale, materials, grounded acting, clear interactions and coherent sound. Compare the relevant Sky qualities and preserve Dustlings' identity. | **Corrections active.** Latest arrival capture exists; complete current art/orbit, NPC and discovery review is pending. Independent critic findings remain its own; new revisions are submitted media-first. Audio has not been auditioned. |
| Owner acceptance | Owner reviews the exact current experience and accepts its quality, scope, value and readiness to sell. | **Pending.** No owner acceptance of the RPG exists. Requests to see or improve the game are not approval. |

Passing technical checks does not pass any of these gates. No full-campaign or Steam-readiness claim follows from this opening.

## What the opening is intended to prove

One walkable neighborhood: a controllable player, enterable home/workshop, four substantial residents, developing relationships, a bridge that changes village routes, a revived garden and shared activity, useful companion light, an authored hidden greenhouse/keepsake and lasting home rewards. Brushing still turns dust into companions. No further destinations are justified before fundamental interaction and presentation weaknesses are resolved.

## Source-bound evidence already available

These are results on their recorded sources, not blanket certification of today's changing runtime.

| Evidence | Actual result and scope | Exact source identity |
| --- | --- | --- |
| [Authored state](../evidence/rpg/story-checks.json) | 83/83 deterministic state, prerequisite, relationship and save-state checks. No narrative appeal verdict. | Story SHA `71b5ea6f6fcd79ee35d88eb8eb1c5a0343f1b6736d19a7116ce97591c4de0d14` |
| [RPG filesystem saves](../evidence/rpg/save-checks.json) | 44/44 actual isolated filesystem cases, including stages/backups, corruption preservation and stale writes. | Save SHA `baea44034774e4cb72be30ee0a2c408a2aad713655f956134af492d51cb70f95`; story SHA as above. |
| [Integrated scene, drained run](../evidence/rpg/integration/drained/report.json) | 45/45 headless actual-scene InputEvent/physics/import assertions; matching start/end source maps; clean teardown log. No native screen/picker or real-time performance proof. | Main SHA `b0a5eff777c07730b063eaed9e459c4b58d90616d8959ed6763a3b2dd1b5d941`; full five-file source map in report. |
| [Companion corner fixture](../evidence/rpg/companions/rounded-corners/report.json) | 28 assertions passed, zero failures. **Actor source changed during this run**, so it is not frozen integrated-build evidence. Four companions and unlocked doors were explicit fixtures. | Navigation SHA `3102adf4a8c563844a793a5146c49b681eff6f89df0d56b49dff8baba61947a1`; before/after maps retained. |
| [Audio PCM](../evidence/rpg/audio/pcm-checks.json), [engine state](../evidence/rpg/audio/engine-checks.json) | 66/66 numerical PCM checks; 20/20 actual Godot stream/state checks using Dummy audio. **No listening or native sound-device approval.** | Per-file WAV hashes in PCM report; engine-source SHA `e82d0a7ab45de1a058cb868a447908edcd91c0ade08f1fdeb0d3810256e32574`. |
| [Earlier completed route](../evidence/rpg/neighborhood-route-corrected/capture-manifest.json) | 124 generated-input steps, 159.158 engine seconds; four companions and restored opening flags. Older art/behavior. Not human pacing. | Capture source `1a3ed24c8fc5e636afe65da1b77e913e3d800a246fa563b383cfc2d1d4117f9e`. |
| [Later integrated route — failed](../evidence/rpg/neighborhood-integrated/capture-manifest.json) | Stopped at 152.858 engine seconds after a scripted return toward Ivo stalled. This is not proof that a person could not navigate around him; it is not a completed current route. | Capture source `e834ba59ea92629ee4b42883dbe6d6f13326d2859f4189aba3eb4c61fba04633`. |
| [Latest recorded arrival](../evidence/rpg/neighborhood-arrival-current/capture-manifest.json) | Six generated steps, 5.225 engine seconds, actual 1280×800 native view. Stationary opening only; later acting/integration changes are not proven by it. | Capture source `e505ffbc13b70540b8f4353cd5dc26216058d5737c23fce4e2e1909cc83fa8dc`. |

The earlier `neighborhood-arrival-materials` attempt froze the QA driver mid-edit, hit a parse error and was terminated. Its [failure manifest](../evidence/rpg/neighborhood-arrival-materials/capture-manifest.json) and [log](../evidence/rpg/neighborhood-arrival-materials/native.log) remain preserved. The capture tool now explicitly parses the frozen driver before launching the native scene. This historical capture failure is not asserted to remain in current source.

## Current gaps, ordered by player impact

1. Verify the corrected complete sequence and follower return in the current source. A visible discovery needs continuous moth/companion contact and retained light; dialogue should leave the event readable. Older interrupted routes do not close this gap.
2. Inspect individual acting, planted movement through reversal/stop-start, camera orbits and arrival hierarchy at normal size. The shared [direction board](RPG-ART-DIRECTION.md) is a proposal, not proof of quality.
3. Validate resident attachment, player-chosen goals, fair discovery, satisfying consequences and desire to return with unfamiliar players. Record disagreements and exact counts/reasons.
4. Audition the current music, spatial cues, repeated footsteps, brushing, dialogue ambience and discovery transitions on a recorded sound setup.
5. Produce and verify exact current standalone Mac/Windows review packages; measure a quiet current native RPG performance run. Test physical controls and Windows hardware. Record models, conditions and limits.
6. Obtain owner acceptance of that exact current build separately from player feedback. Later full-campaign, Steam distribution/signing and mobile-port readiness have their own gates.

## Delivery status and next concrete actions

No verified RPG package manifest has been supplied to this review page yet. The preserved courtyard ZIP is not linked as an RPG build. The RPG package runner is prepared; exact exported Mac launch/resume/corrupt-primary recovery is pending. Windows remains unrun. No current RPG performance figure is available here; old courtyard numbers do not validate the new neighborhood.

The lead is completing the representative art/motion capture, full route and independent comparison. After accepted technical corrections, freeze source, export desktop packages, run exact packaged Mac recovery and a quiet native callback profile, then update the hub with those artifacts. Figma is unavailable; the inspectable art board and actual game UI are the documented fallback. No development continues after a session ends; the lead maintains the resumable continuation checkpoint.


## Owner-requested stop / delivered candidate

See [SESSION-HANDOFF.json](../evidence/rpg/SESSION-HANDOFF.json) for the exported0.5.0-rpg-dev source, complete163-step native route, exact script/shader parity, Windows archive verification and explicit unperformed checks. Current game is **not complete or approved**. Old pending-package statements above describe the earlier review snapshot; native archives now exist, while actual packaged process execution, current performance, listening and human/owner acceptance remain pending. [Continuation](CONTINUATION.md) orders the exact remaining gaps.
