# Current-build human review ledger

**Courtyard milestone: awaiting human validation. Player experience, presentation quality, and owner acceptance are three independent gates. None has passed.** There are zero recorded human sessions and no explicit owner acceptance of the current experience. Automated tests, agent review, benchmark references, and a playable artifact do not establish any of these human outcomes.

Use the existing [PLAYTEST.md](PLAYTEST.md) protocol for recruitment, observation, the required segment, continuation, coaching, and debrief. This document records provenance and gate decisions; it does not replace that protocol. [BACKLOG.md](BACKLOG.md) tracks concrete corrections. No outreach or recruitment has been performed through this ledger.

## Current 3D review candidate

<!-- 3D-REVIEW-CANDIDATE:START -->
The packaged review candidate is **0.4.0-dev**, a real-geometry Godot courtyard, **awaiting human validation**.

| Field | Exact record |
| --- | --- |
| Export manifest | [builds/3d/0.4.0-dev-2026-09-10T09-23-03-961Z-0db02d30ce/manifest.json](../builds/3d/0.4.0-dev-2026-09-10T09-23-03-961Z-0db02d30ce/manifest.json) |
| Source revision | `2572e2f84d83f4175fac879e6735ee490fcfe47d` |
| Source dirty / repository dirty | false / true |
| Source SHA-256 | `0db02d30cecf84b28fce7919352f9ca2fd79c9deb82d5a7deffdb40e69d7d431` |
| Mac PCK SHA-256 | `a55ebb8d8ec501f8cb9d5484d2e9a473d3b443224bbec0ad4915b4171c8adb04` |
| Mac archive SHA-256 | `7d7699265376fe475c699dcce10157d44aaa2523919e431a201b5431770d417b` |
| Windows executable SHA-256 | `56dd343a5286c08d40d077122a8069b41cec67f54db51724fa59ffc9284f5512` |
| Export finished | 2026-09-10T09:23:19.311Z |
| Current review hub | [Actual gameplay, package links and provenance](../evidence/3d/REVIEW.html) |
| Human / owner acceptance | Zero human sessions; no current-build owner approval |

Mac signing is local ad-hoc, with no notarization. Windows execution, physical iPad/iPhone support and store readiness remain unverified. The hub verifies runtime source parity between the package and its captures; fixtures and movie-mode timing are labeled separately from human play.

This package is separate from changed live development. Its frozen source and attached capture runtime bytes match; this record makes no parity claim for the working tree. Corrections in progress require a new package and verification.

Known package gaps:

- Helpers can appear to work without a sufficiently legible local cleaning response. An independent AI critique of actual footage identified this; correction is in progress, with human confirmation still needed.
- The completed courtyard can still display 99% clear in the HUD, as confirmed in the full film near 697 seconds. The live correction is not included in this package.
<!-- 3D-REVIEW-CANDIDATE:END -->

Bind every human review to the exact native PCK and executable/archive hashes, source revision and dirty state. If implementation or presentation changes, preserve old observations under their original identity and obtain fresh review for affected claims. An agent's critique, generated input recording or fixture is not a human session. No gate transfers from the old 2D prototype.

## Historical 2D candidate — retained provenance

The following 0.2 record is historical. Its browser artifact, captures and tests do not validate the active 3D implementation or current native platform readiness.

| Field | Historical record |
| --- | --- |
| Candidate ID / version | Courtyard 0.2.0 |
| Playable artifact path / launch instructions | Open `builds/Dustlings Courtyard.html` in a modern browser; offline, no install |
| Artifact SHA-256 | `cb4b9d7bc6174a96bd203a22f9a8a5a766f3fa0eca10475e80c8e4d681f5feea` |
| Full source checkpoint / build date | `4384d82d61210269332cb8568ef89c7399425b86`; 2026-09-10T06:17:56.300Z; source dirty: false |
| Change summary since previous reviewed build | Navigation around fountain, restoration save validation, stale-tab recovery, typography/layout, keyboard access, and background audio corrections |
| Before/after gameplay / normal-speed recording / audio | `evidence/v0.2/` and `evidence/REVIEW.html`; actual opening and chorus recordings with artifact hashes, controlled fixtures explicitly labeled |
| Technical conditions and known limits | Attach test/performance records; Windows guest, physical mobile, native listening, and human reception remain unverified |
| Human feedback linked to this exact candidate | None |


## Gate ledger

| Gate | Status | Evidence required for a recorded decision | Decision record |
| --- | --- | --- | --- |
| Player experience | **Not passed — awaiting human validation** | Current-build unfamiliar target players understand dust-to-helper causality, direct comfortably, notice upgrade effects, experience restoration, and choose whether to continue. Report exact protocol counts and reasons, plus awkwardness/fatigue/confusion. | Reviewer / date / candidate hash / decision / reasons: not recorded |
| Presentation quality | **Not passed — awaiting human validation** | Humans inspect actual gameplay at normal screen size and speed, including opening, busy workforce, final cleanup, restoration, UI, loops/transitions, and repeated audio. Record specific perceived scale, legibility, motion, material, and sound problems and positive elements. | Reviewer / date / candidate hash / decision / reasons: not recorded |
| Owner acceptance | **Not passed — awaiting owner assessment** | Owner plays/reviews the exact candidate and explicitly assesses its fit to the vision, completeness, quality, promised value, and readiness. Record remaining conditions separately. | Owner identity / date / candidate hash / explicit assessment: not recorded |

A player-rate pass is an internal decision rule, not proof of beauty, market demand, sales, or owner approval. Presentation and owner reviews do not replace unfamiliar-player observations. A partial or conditional assessment remains conditional. An ended execution session is not a passed gate or a completed game.

## Exact player counts

The first private round targets **12–20 unfamiliar intended players**. Use one primary segment per person, decided before play. Secondary interests may overlap but must not duplicate people in the total. Keep friends/developers separate from the unfamiliar-target denominator.

| Primary segment | Enrolled N | Uncoached meaningful upgrade n/N | Voluntary continuation n/N | Early stops / technical failures | Reasons and linked sessions |
| --- | --- | --- | --- | --- | --- |
| Incremental-game buyers | 0 | 0/0 — not measurable | 0/0 — not measurable | 0 / 0 | No sessions |
| Cleanup/cozy players | 0 | 0/0 — not measurable | 0/0 — not measurable | 0 / 0 | No sessions |
| Unfamiliar target total | **0** | **0/0 — not measurable** | **0/0 — not measurable** | **0 / 0** | No sessions |
| Friends/developers, separate pilot | 0 | 0/0 — not measurable | 0/0 — not measurable | 0 / 0 | No sessions |

Internal thresholds: uncoached meaningful upgrade successes ≥ `ceil(0.8 × N)`; voluntary continuers ≥ `ceil(0.5 × N)`. At 12 enrolled unfamiliar target players these are 10/12 and 6/12; at 20 they are 16/20 and 10/20. For another N in that range, report its actual numerators and denominator. With N=0, neither a rate nor a pass can be calculated.

Use PLAYTEST's definitions for coaching and voluntary continuation, including actual extra active time and ending-limited continuers. Keep early stops and technical failures in the original enrolled denominator; a supplemental usable-session rate must state all exclusions and also show the original rate. Preserve disagreements between segments and minority discomfort findings even if pooled thresholds pass.

## Individual human session record

No rows are populated. Copy this template only for an actual session; blank fields are missing evidence, not a success.

```text
Session ID / date:
Who: anonymous tester ID / unfamiliar or prior exposure / primary segment:
Relevant game history / secondary interests:
Candidate ID / exact artifact SHA-256 / source checkpoint:
Device model / OS / browser or runtime / screen size / viewport / input:
Audio setup / volume / relevant access or comfort needs voluntarily shared:
Consent / recording permission / private identity record location, if needed:
Experience observed: actions, timestamps, completion state, unprompted reactions:
First patch / first helper / crew noticed / first upgrade / first direction times:
Upgrade chosen / reason / described visible effect:
Coaching or technical intervention: exact content / time / reason:
Awkward, tiring, confusing, or visually unpleasant moments:
Sound issues: repetition, balance, transition, loop, discomfort, or no sound used:
Positive elements to preserve, with exact moment or quotation:
Restoration reached? Reaction / what changed in their own words:
Required segment finished? If not, reason:
Continuation choice / actual extra active duration / actions / stated reason:
Counts: uncoached upgrade yes/no; voluntary continuation yes/no;
  ending-limited continuation separately; protocol exclusions, if any:
Prompted save/return result (separate from voluntary play):
Observed behavior / exact quotation / interpretation (keep separate):
Presentation assessment and concrete defects at normal size/speed:
Linked capture / recording / notes:
Focused follow-up / issue owner / next candidate needing recheck:
```

Use anonymous IDs in shared artifacts. Store identifying information only where consent and access permit; the gate ledger needs traceable sessions, not public contact details. Do not manufacture identities, quotes, reactions, reasons, or enjoyment scores to fill the template.

## Presentation review record

```text
Reviewer ID / relationship to project / date:
Candidate ID / artifact SHA-256:
Actual device, display, input, audio setup, and viewing size:
Reviewed: opening / working crew / 50-helper movement / final cleanup /
  landmark / pause-settings / upgrades / loop-transition-repeat audio:
For each observed problem: capture or timecode / description / impact:
Scale, grounding, perspective, silhouettes, spacing, typography, materials:
Animation and audio assessed live, via recording, or not assessed:
Positive elements worth preserving:
Reference quality compared (specific quality, not assumed parity):
Decision: accepted / conditional / revise / insufficient evidence:
Reasons / conditions / next focused check:
```

Record friends/developers' presentation opinions with their relationship; they are useful feedback but do not become a market conclusion. Conflicting opinions remain visible with their context and counts. No benchmark-level quality claim is currently supported.

## Owner acceptance record

```text
Owner name or identifier / role / date:
Candidate ID / exact artifact SHA-256:
Device and how reviewed: personally played / watched recording / other:
Segments actually reviewed and any unreviewed requirements:
Assessment of: vision fit / completeness / beauty / satisfaction /
  clarity / promised player value / readiness:
Explicit decision: accepted / conditional acceptance / revise / not assessed:
Owner's actual words, or an approved faithful summary:
Remaining conditions, defects, or scope exceptions:
Positive elements the owner wants preserved:
Next required action and responsible person:
Acceptance applies to this exact candidate; changes requiring re-review:
```

The earlier session supplied a historical 2D 0.2 artifact for owner review on 2026-09-10. No owner assessment of it or the current 3D experience is recorded. Do not infer approval from silence, authorization to keep developing, or technical test results. Continue authorized technical corrections while the human gates await evidence.
