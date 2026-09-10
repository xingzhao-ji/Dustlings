# Isolated courtyard light study

2026-09-10 · Bounded effort: 15 minutes · **Candidate for integration, awaiting human validation.**

[Open the comparison, recordings and three playable copies](../artifacts/light-study/REVIEW.html).

**Intended benefit:** pale helpers should separate from cream paving, buildings should visibly contact the ground, and restored water should draw attention without obscuring work. Evidence is the owner’s village-first/Sky direction plus agent inspection of actual courtyard captures. No player dissatisfaction, preference or approval is inferred. The study ran in `/tmp/dustlings-light-study`; shared `src/renderer.js` was not edited.

## Focused change

The light-only candidate changes existing paint values: slightly darker cream paving, cooler contact shadows and house side walls, a warmer highlight/cooler edge on the existing creature gradient, and deeper fountain side/water values. It adds no geometry, particles, blur passes, draw calls, simulation or audio changes. Existing creatures, grounded feet, paths, architecture and palette identity remain.

The first experiment made paving seams too prominent in agent inspection. Its [negative result](../artifacts/light-study/rejected-strong-grout-restored.png), renderer and recordings are retained. The corrected candidate raises the grout value so its contrast with the tile faces is closer to the original. Whether the final courtyard feels inviting remains a human question; the completed paving still looks somewhat regular and the cooler tones could feel less warm to some players.

The root agent requested a separate framing check after the new compact HUD was captured. Changing the desktop viewport branch from top/bottom80/110 to48/86 increases the village scale at1280×796 from0.7743 to0.8621, **11.3%**. The light-only comparison retains the original camera so the two effects can be reviewed independently.

- [renderer-candidate.js](../artifacts/light-study/renderer-candidate.js): corrected light values only; [diff](../artifacts/light-study/renderer.diff).
- [renderer-framing-candidate.js](../artifacts/light-study/renderer-framing-candidate.js): corrected light **plus** closer framing; [additional framing diff](../artifacts/light-study/framing.diff).
- [renderer-baseline.js](../artifacts/light-study/renderer-baseline.js): frozen pre-study renderer.

## Observed results and limitations

Matched stills use the exact same paused QA saves: 50 helpers at75% clear and a completed courtyard. They are engine renders at1280×796 CSS pixels, DPR1, not artwork mockups or natural playthroughs. The videos resume normal simulation for eight seconds and include the full interface; startup makes files roughly9–10 seconds long. Videos have no audio track. Original PNGs preserve color better than compressed video. Time-separated movement frames at3s/7s were inspected: feet remain attached to their existing contact shadows and moving/working helpers remain identifiable. This is sampled motion inspection, not a human animation-feel assessment.

Agent inspection finds more distinct pale helpers and a clearer basin edge. No new clipping or particle obstruction was seen. The combined framing view keeps roofs, side planters and front steps visible. **One tangency remains:** the broad plinth shadow meets the lower functional hint at1280px. Root will reposition that desktop hint during integration; the experiment itself does not alter interface files.

[Framing checks](../artifacts/light-study/framing-checks.json) cover1280×796,1280×720 and1440×900. At each size,466/466 dust centers are inside the playable viewport and0 lie under the checked HUD controls; no horizontal document overflow. This is geometric reachability, not physical input comfort. Phone portrait and compact landscape branches are unchanged. Tablet-sized layouts using the default desktop branch need later port review.

Eight-second samples on MacBook Pro Mac16,7 / M4 Pro /48GB /macOS26.6.2, headless Chrome152.0.7977.83, DPR1, original audio running:

| Case | Mean renderer JavaScript call | p95 renderer call | Worst frame interval |
|---|---:|---:|---:|
| Baseline,50 helpers working | 1.053ms | 1.2ms | 16.8ms |
| Corrected light,50 helpers working | 1.044ms | 1.2ms | 16.8ms |
| Baseline,restored | 0.683ms | 0.8ms | 16.8ms |
| Corrected light,restored | 0.663ms | 0.8ms | 16.8ms |
| Corrected light+framing,50 helpers working | 1.089ms | 1.2ms | 16.8ms |

Each sample contains480 or481 frame intervals, none over33.4ms; zero JavaScript errors. The tiny CPU differences are not evidence of a speed improvement or a guaranteed zero cost. These short samples include video capture, do not measure GPU time directly, and concurrent root/process workloads were not controlled. They reveal no large immediate regression; sustained native Windows/Mac checks remain required. [Initial/rejected results](../artifacts/light-study/results.json), [corrected results](../artifacts/light-study/results-corrected.json), [combined sample](../artifacts/light-study/results-framed.json).

All three standalone review copies launched offline and loaded50 helpers with zero JavaScript errors or external HTTP requests. [Smoke results](../artifacts/light-study/standalone-checks.json). This is automated Mac-host browser execution, not Windows, native release validation or human play.

## Provenance and exact next action

[Build manifest](../artifacts/light-study/build-manifest.json) records SHA-256 for every frozen HTML/CSS/module input and each standalone copy. [Frozen baseline source archive](../artifacts/light-study/frozen-source.zip) preserves the UI snapshot independently of ongoing root edits. To reproduce, extract it into `/tmp/dustlings-light-study`, copy `baseline` to `variant` and `framed`, replace their `src/renderer.js` with the corresponding candidate, then run `node artifacts/light-study/build-study.mjs`, `run-study.mjs`, and `check-framing.mjs` from the repository root. The latter two require local Chrome and development dependencies. Their fixtures are explicitly labeled and bundled here.

Root inspected the matched stills and plans to integrate the combined candidate, then correct the desktop hint tangency. That is an implementation decision by an agent, **not owner acceptance**. Exact next action: integrate the combined renderer only after the UI gate, move the hint, rerun relevant interaction/reachability/native checks and capture the current build. Obtain fresh human comparison of creature clarity, warmth and restoration payoff. Human sessions and current-build owner approvals remain zero.
