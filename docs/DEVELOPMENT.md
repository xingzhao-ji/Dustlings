# Current continuation pointer

The source is undergoing UI refinement described in UI-REFINEMENT.md; the last frozen playable/native build remains courtyard0.2 at source `4384d82d61210269332cb8568ef89c7399425b86`; artifact SHA-256 `cb4b9d7bc6174a96bd203a22f9a8a5a766f3fa0eca10475e80c8e4d681f5feea`. See [CONTINUATION.md](CONTINUATION.md) for the exact resumable task and [BACKLOG.md](BACKLOG.md) for current statuses. The entries below are historical0.1 development observations; they are preserved and do not describe the latest typography, camera, input, or recovery state.

Current milestone remains **awaiting human validation**. No human or owner gate has passed. Current artifact [review page](../evidence/REVIEW.html) includes matching gameplay views and recordings.

---

# Development checkpoint and evidence ledger

Started 2026-09-09. Scope is the courtyard milestone described in [DESIGN.md](DESIGN.md). The full game's courtyard → canal → clocktower garden arc remains a requirement; additional zones are deferred until the integrated courtyard has player evidence. [PLAYTEST.md](PLAYTEST.md) defines the first human round.

## Evidence rules

- Confirmed: user's requirements, inspected source files, reproducible technical results, directly inspected captures, and recorded human observations with provenance.
- Hypothesis: intended enjoyment, clarity, beauty, pacing, comfort, musical warmth, upgrade desirability, or market appeal. Agent assessments stay labeled as assessments.
- Unknown: untested hardware, platform support, long sessions, human reception, and Figma alignment until corresponding evidence exists.
- No human sessions were available at project start. No target-player research outcomes or market demand were invented. The 12–20 / 80% / half-continuing rules come from the user's brief and are private decision thresholds.

## Bounded cycle ledger

Budget each cycle before implementation. Meet its acceptance check, save the result, and move to the next justified problem. When a check fails, record the observed cause and make a focused correction. Do not continue optional polish indefinitely or add zones to compensate for weak core play.

| Cycle / budget | Player benefit and available evidence | Smallest useful implementation | Observable acceptance / status |
| --- | --- | --- | --- |
| C0 Direction and research / 15 min | Keep original identity and concrete presentation targets. Evidence: user brief, engine contract, official reference stills/pages. | Design decisions, optical-scale targets, playtest protocol, evidence ledger. | Completed: these three linked documents; five official visual references inspected. Inferences and human-validation gaps are explicit. |
| C1 Core courtyard / one implementation pass | Show that mess becomes workforce and support a satisfying finite objective. Evidence: confirmed vision; no unfamiliar play observations. | One reachable dust field, local helper birth, capped initial 50-creature prototype, crew direction, three visible upgrades, fountain ending. | Technical integration complete: 17 simulation/save tests pass, normal-speed opening→upgrade→redirect recorded, full pure-simulation ending completed, normal-speed ritual fixture reaches completion dialog. Human timing and enjoyment remain pending. |
| C2 Presentation integration / one capture-review pass plus an 8-minute correction pass | Make actions, scale, restoration, and sound understandable. Evidence: chosen qualities and observed regular dust, healthy initial planting, hidden touch preview and small phone fit. | Cohesive renderer, expressive creature, two-ring chorus, varied dust mats, dormant-to-flowering garden, original motif, touch offset/zoom/pan, responsive overlays. | Dirty/restored matched captures and opening/ritual recordings delivered. Actual frame review shows clearer reveal and separated silhouettes. Numerical audio checks pass; listening and human aesthetic acceptance remain open. Phone fit and typography remain gaps. |
| C3 Reliability and platform probes / one focused check pass plus targeted fixes | Prevent lost progress and discomfort. Evidence: save requirement and observed resize, Escape and touch-preview defects. | Save validation/recovery, pause/return, input cancellation, corrected resize, visible touch preview, ≥44px primary controls, offline build. | 26 browser checks pass; exact final standalone smoke passes with zero network/JS errors and saved completion after reload. 60-second 50-helper sample recorded, including one 216.6ms stall. Four viewport layouts are simulations; physical Windows/iPad/iPhone and native Mac play remain open. |
| C4 Private human round / 12–20 unfamiliar sessions | Identify actual confusion, fatigue, disliked presentation, and voluntary interest. Evidence: none yet. | Observe existing slice using PLAYTEST protocol; test a focused alternative only for an evidenced problem. | Not started. Report exact uncoached-upgrade and voluntary-continuation n/N per segment, reasons, disagreements, and next correction. |

Implementation owners should replace pending statuses with concrete command/output or artifact references after the checks; do not infer success from the table. Every later substantial change uses this record:

```text
Cycle ID / checkpoint / date / effort cap:
Most important player problem:
Intended benefit:
Evidence + source + confidence (requirement / technical / agent review / human):
Smallest implementation:
Acceptance check:
Changed files:
Actual result / observed failure:
Before and after captures / normal-speed recording / affected audio:
Performance conditions and result:
Human validation still needed:
Decision: accept / revise / defer, with reason:
Saved checkpoint and next concrete task:
```

## Milestone delivery gate

Provide a runnable build and launch instructions; real dirty/restored gameplay views; a short interaction recording; measured performance with environment, creature count, effects, viewport, DPR, duration, and frame-time statistics; test output; presentation defects; save/return results; and human-feedback gaps. Clearly label controlled fixtures or accelerated simulation versus an uninterrupted natural playthrough. A milestone build may be available for private review while human acceptance is pending; do not call that a finished or benchmark-quality courtyard.

Performance starts at 50 visible helpers. Do not increase that ceiling without a sustained sample showing acceptable frame times, movement, responsiveness, and readability. Capture average, p95/p99, worst frame, and long-frame count where supported, with foreground/background state. Adjust effects/shadows/resolution/decorative simulation in that order only when measurement motivates it. Physical Windows/MacBook validation precedes mobile release readiness; phone/tablet viewport emulation is only layout evidence.

## Current resumable state

Courtyard prototype 0.1 is integrated and reviewable. This is a technical integration checkpoint, not a human-accepted milestone or native platform release. Git checkpoint tag: `courtyard-prototype-v0.1`. The exact playable artifact is [Dustlings Courtyard.html](../builds/Dustlings%20Courtyard.html), 120,728 bytes, no runtime/network dependencies. SHA-256: `e3e4f93cdec9ce0ee1ab0c3bcfc29cff183e9c9112e4eaff64d8bb36ac8e3b1f`. [Manifest](../builds/build-manifest.json). Built 2026-09-09 Pacific / 2026-09-10 05:17:34 UTC.

The source server uses `npm start` at http://localhost:4173. The standalone HTML opens directly in a browser without Node. Build with `npm run build`; no remote service or account is required. Local browser saves retain a previous valid checkpoint. Export/import lets players move progress between copies or browsers.

### Actual evidence

- [Review package](../evidence/REVIEW.html): actual [dirty](../evidence/final-dirty.png) and [restored](../evidence/final-restored.png) renderer views with the same framing. Restored state is generated through automated simulation, not human play.
- [45-second full-interface interaction](../evidence/interaction-ui.mp4), silent, shows real-time scripted pointer input with no opening state injection. [Same opening canvas with live audio](../evidence/opening-with-sound.mp4). First helper at 8.78 seconds; four helpers and 33 motes at 39.11 seconds, then the brush upgrade and a crew assignment through actual controls.
- [Normal-speed fountain sequence with live audio](../evidence/restoration-with-sound.mp4): an explicitly automated save begins with cleaning finished and fountain unrestored. Actual bell activation gathers/sings/restores, then reaches the ending dialog. [Result](../evidence/restoration-recording.json). It is not a full uninterrupted natural playthrough.
- `npm test`: 17/17 meaningful simulation/storage tests pass. `node tools/browser-checks.mjs`: [26/26 browser checks](../evidence/browser-checks.json), zero console errors. `node tools/final-smoke.mjs`: [exact delivered artifact passes](../evidence/final-smoke.json), including offline launch, save/return, corrected caption, primary control sizing, no overflow and Escape/drawer access.
- [50-helper profile](../evidence/final-build-checks.json): 60 seconds, 3,600 sampled foreground frame intervals, mean 16.72ms, p95/p99 16.8ms, worst 216.6ms, one interval >33.4ms and none ≥500ms. All foreground intervals are included. Host: MacBook Pro Mac16,7, M4 Pro, 48GB, macOS 26.6.2; headless Chrome 152.0.7977.83; viewport 1440×900; canvas 1020×727 CSS px, DPR2; normal quality, audio active; 50 helpers cleaning from a controlled ~75%-clear save, chorus held. This profile used SHA `440303008dc8fe688450beb6603a5571519e29e907d4e2315b2c2445fd8d6d21`; the delivered artifact only adds the corrected scene caption and 44px control minimums afterward. The single long interval remains an unresolved profiling observation, not omitted as an outlier.
- [Audio checks](../artifacts/audio/audio-checks.json): 36-second 44.1kHz stereo OfflineAudioContext render, −15.29dBFS peak, no clipped or invalid samples, one birth cue from 50 simultaneous requests, mute fades to silence. A detected noise-start click was corrected. [Audition WAV](../artifacts/audio/courtyard-audition.wav). Numerical/audio-source inspection and live capture do not establish human listening quality.
- Layout simulations captured 1280×800 desktop, 820×1180 tablet, 390×844 phone and 844×390 landscape. Camera transforms, 42px touch offset, cancel, blocked feedback and ≥44px main controls are checked. No physical phone/tablet/Windows testing is claimed. Native Computer Use was unavailable because Accessibility/Screen Recording permissions were pending; no such access is needed to play the browser build.

### Corrections completed after observed problems

Canvas inline sizing prevented responsive resizing → CSS owns display size and renderer owns backing pixels. A 50-helper single ring overlapped → two staggered rings. Dust looked like repeated grid piles → 12 cached variants, rotations, sizes and connected mats. Opening flowers already looked healthy → dormant and bloomed garden caches blend with progress. Direct-touch preview was invisible → separate held-preview state. Escape opened and immediately canceled pause → handled key defaults prevented. Some controls fell below 44px → minimums corrected and final smoke verified. Completed scene still said waiting to bloom → state-aware caption. Storage getter denial could block startup → safe unavailable-storage fallback. Frame statistics excluded long stalls → every foreground frame is now counted.

### Pacing and human gaps

Controlled simulation completion: continuous brushing 5:06; 40% brushing duty 8:44; 15% duty 14:05. First helper respectively 8.3s, 20.25s and 50.8s; first upgrade 36.7s, 83.35s and 210.4s. All scripts select a dust target every three simulated seconds and purchase upgrades as soon as possible. [Full results](../evidence/qa-results.json). These data show sensitivity to interaction patterns; they do not validate the user's 30s / 2m / 5m / 10–15m hypotheses. No waiting was added just to match a duration.

Human sessions: **0 unfamiliar incremental buyers, 0 unfamiliar cozy/cleanup players, 0 friends/developers**. Upgrade-without-coaching and voluntary continuation: no denominator, therefore not measured. No enjoyment, benchmark-quality, preference or sales claim. Figma is unavailable; implemented interface prototypes and design source mappings are in DESIGN.md.

Remaining priority questions: whether dust-to-helper causality is noticed; direction/pan-mode comfort; visible upgrade effects; reading size (some hierarchy remains below the proposed 16/14px target); tiny full-fit phone scene; first reveal/chorus satisfaction; audio balance/repetition; trackpad fatigue; physical-device performance and the isolated frame stall. Native packaging, Windows and mobile release requirements remain separate work.

**Next concrete task:** run the 12–20 unfamiliar-player round in PLAYTEST.md using this exact artifact, preserve segment-specific counts and reasons, then implement the strongest evidenced correction in a bounded cycle. Human audio listening and physical Mac/Windows input review can happen alongside it. If participants are unavailable, the next independent technical task is a controlled trace of the recorded long frame and a named Windows browser run; do not add zones. Keep this checkpoint available while gathering evidence.
