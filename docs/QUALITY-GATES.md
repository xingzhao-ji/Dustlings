# Current-build human review ledger

**Courtyard milestone: awaiting human validation. Player experience, presentation quality, and owner acceptance are three independent gates. None has passed.** There are zero recorded human sessions and no explicit owner acceptance of the current experience. Automated tests, agent review, benchmark references, and a playable artifact do not establish any of these human outcomes.

Use the existing [PLAYTEST.md](PLAYTEST.md) protocol for recruitment, observation, the required segment, continuation, coaching, and debrief. This document records provenance and gate decisions; it does not replace that protocol. [BACKLOG.md](BACKLOG.md) tracks concrete corrections. No outreach or recruitment has been performed through this ledger.

## Review candidate

Freeze the exact playable artifact before attaching human feedback. The current source is undergoing integration after navigation/save, readability, keyboard, and interruption corrections. The prior prototype's artifact hash must not be relabeled as this candidate.

| Field | Current record |
| --- | --- |
| Candidate ID / version | Pending final integrated build |
| Playable artifact path / launch instructions | Pending root's build checkpoint |
| Artifact SHA-256 | Not yet recorded for this candidate |
| Full source checkpoint / build date | Pending integration checkpoint; navigation/save sub-checkpoint is `ef1ae41`, which alone does not identify the entire candidate |
| Change summary since previous reviewed build | Navigation around fountain, restoration save validation, stale-tab recovery, typography/layout, keyboard access, and background audio corrections |
| Before/after gameplay / normal-speed recording / audio | Attach root's evidence for this exact artifact; distinguish controlled fixtures and synthetic timings |
| Technical conditions and known limits | Attach test/performance records; Windows guest, physical mobile, native listening, and human reception remain unverified |
| Human feedback linked to this exact candidate | None |

If the artifact changes materially, create a new candidate row/history entry. Retain previous reviews with their original build hashes; explicitly identify which findings may transfer and which need another observation. Never silently carry acceptance to a changed experience.

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

No owner assessment is recorded. Do not infer approval from silence, authorization to keep developing, or technical test results. Continue authorized technical corrections while the human gates await evidence.
