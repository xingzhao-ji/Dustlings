# Dustlings design contract

Updated 2026-09-10. Governing objective: a game intended players find beautiful, satisfying, understandable, and worth playing. The user's vision is a requirement; the choices below are hypotheses. Automated checks and an agent's visual review do not establish enjoyment or benchmark quality.

## Identity and current scope

Single-player incremental restoration: brushing removes visible dust; that same dust gathers into a living helper; helpers become the workforce that restores a miniature village. The complete game is one village, with courtyard, canal, and clocktower garden, one coherent upgrade tree, and a finite ending.

Only the courtyard is being implemented now. It must integrate one finished creature design, three upgrades that visibly affect play, coordinated crew behavior, a complete fountain restoration, interaction, animation, audio, UI, and recoverable saves before zone production begins. Canal and clocktower garden remain opportunities, not delivered content or evidence-backed expansion. A future zone must introduce a choice or crew behavior within the established system.

## Presentation references → original decisions

Official reference pages and still images were examined on 2026-09-09. The observations are a limited visual study, not a comparative playtest. No reference artwork or music is bundled in Dustlings. Each translation is an original proposal requiring actual gameplay review.

| Reference and examined source | Specific observation / requested quality | Dustlings decision and observable review |
| --- | --- | --- |
| [Monument Valley official gallery](https://www.monumentvalleygame.com/), [examined still](https://www.monumentvalleygame.com/media/1-55b7370e.jpg) | Pale geometric paths form a strong figure against quieter green negative space; a small bright character remains findable. The user's transformation benchmark still needs motion study. | Frame one central fountain and a continuous readable walking area. Keep warm stone and muted sage dominant, with turquoise concentrated in restored water and active destinations. Compare dirty, half-clean, restored, and 50-creature frames at normal viewing size; all routes and the active destination must remain findable. |
| [It Takes Two official page](https://www.ea.com/games/it-takes-two/it-takes-two), [garden still](https://drop-assets.ea.com/images/40iWqUYmrZ4TXGnawZU55J/93f7923bbbaa3cccb975d5e2c1f7b8e0/itt-screenshot-1920x1080-garden1.jpg) | Oversized flowerpots, grain, and knitted figures communicate playful physical scale. | Use a few oversized petals, round pots, and stone seams as miniature scale cues. A helper compresses as dust gathers, settles onto its contact shadow, then leans into work. Inspect movement for apparent weight and floor contact; material detail must never compete with faces. |
| [Stardew Valley official media](https://www.stardewvalley.net/media/), [examined still](https://www.stardewvalley.net/wp-content/uploads/2016/02/StardewValley_4_1-1024x576.png), [composer's soundtrack](https://concernedape.bandcamp.com/album/stardew-valley-ost) | Paths, timber, and vegetation establish a consistent place. The official soundtrack names themes for places and seasons; emotional warmth is the user's benchmark, not a verified causal result. | Give the courtyard a recognizable original short melodic phrase; restore it with added harmony and water ambience. Repeat the same warm stone, leaf, and clay materials in houses, fountain, and UI accents. Audition the start, loop boundary, progress transitions, and completion on ordinary speakers and headphones; ask players whether the courtyard feels like a place they want to revisit. |
| [Overcooked official gallery](https://www.team17.com/games/overcooked), [kitchen still](https://www.team17.com/hubfs/Kitchen2-1.jpg) | Bright hats separate small chefs; floor routes and work progress remain distinct despite many objects. | Give every Dustling one clear rounded body, dark eyes, and a leaf tuft. Use a clear destination marker and work animation instead of text over every creature. In a crowded capture, a reviewer must distinguish walking, working, and assigned location without pausing. |
| [Animal Crossing official site](https://animalcrossing.nintendo.com/new-horizons/), [examined still](https://animalcrossing.nintendo.com/new-horizons/assets/img/home/explore-photo-1.jpg) | Rounded tools and props, soft materials, and large simple faces support the requested friendly presentation. | Use warm cream UI surfaces, rounded buttons, plain action verbs, and gentle reactions. Give each upgrade one visible before/after behavior description. Place the same UI over opening and busiest gameplay; verify readable text, visible focus, unambiguous selection, and no hidden required surface. |

## Optical scale and framing

World coordinates follow [ENGINE-CONTRACT.md](ENGINE-CONTRACT.md): 1000 × 740, ground projected with y × 0.72. Screen fit must use one uniform scale; draw bodies and faces upright so ground projection does not squash them. These relationships are initial targets, subject to optical adjustment after captures:

| Element | Initial relation / review rule |
| --- | --- |
| Helper body | 18–24 world units across; leaf tuft should survive normal-size display. Ground shadow stays under the feet through movement and birth. |
| Brush | Roughly 3–4 helper body widths across initially. Visible ring describes the actual affected ground region; feedback must show where cleaning happened. |
| Paths / fountain | Walking channels admit several helpers side by side; fountain diameter about 6–8 helper widths. Obstacles and decorations do not mask required dust. |
| Buildings / props | Doors feel a few helpers tall; plant pots roughly 1–2 helpers wide. Reduce detail and contrast in distant roofs, plants, and outer plinth. |
| UI | Design targets remain 16 CSS px body copy, secondary text at least 14, and primary touch controls at least 44 × 44 CSS px. Current main body copy is 16 px and essential secondary copy is at least 14 px. The readability correction passed 134 measured contrast samples and inspected four viewport layouts. Primary controls use 44 px minimum dimensions. Human readability and target acquisition remain unverified; see UI-READABILITY.md. |
| Lighting / effects | One consistent light direction; contact shadows are darker and tighter than cast shadows. Effects are brief and sparse, with the brush target, destination ring, and creature faces always visible. |

Inspect 1× stills and normal-speed movement for stretching, clipping, floating, tangent collisions, floor sliding, interpenetration, shadow inconsistency, noisy detail, and faceless swarms. Finding no technical defects does not establish beauty. Portrait now opens at 1.7× zoom, and landscape uses a side control column. All 466 dust nodes remain reachable through fit/pan. Treat perceived scale as unvalidated until a real finger and screen are observed; see CAMERA.md.

## Interface prototype and devices

No callable Figma capability or Figma document was available in this execution. The playable DOM/CSS overlays are the inspectable interface prototype. Do not claim a Figma board or synced components exist. When Figma becomes available, mirror the implemented color/type/spacing tokens and actual gameplay backgrounds; add frames for opening, brush/direct modes, upgrade choices, pause/settings, progress, completed courtyard, and recovery. Keep differences in the defect register instead of silently letting the two diverge.

The implemented fallback is directly inspectable through these source mappings:

| Design surface | Implementation source and selectors |
| --- | --- |
| Palette and typography | [style.css](../style.css) `:root`: ink `#32483e`, muted `#778276`, cream `#f6f3e9`, line `#d9ddce`, sage `#63836c`, accent `#db9d65`; Georgia headings and system sans text. Final reading-text overrides near the end of this file govern the sizes above. |
| Spacing and responsive layout | [style.css](../style.css) `.topbar`, `.play-layout`, `.journal`, `.tool-dock`, `.upgrade-card`, `.modal`, and width/height media queries. Spacing uses explicit component values, including 8 px card gaps, 24 px layout gaps, and 13/11 px card padding; a unified 4/8 px token scale is a target, not a completed design-system claim. |
| Onboarding, settings/pause, progress, completion | [index.html](../index.html) `#welcome`, `#settings`, `.progress-track`, `#completion`; [src/main.js](../src/main.js) `start`, `openSettings`, `closeSettings`, `updateUI`, and `enjoy` implement clickable states. |
| Upgrade choices and tools | [src/main.js](../src/main.js) generates `.upgrade-card` from [src/game.js](../src/game.js) `UPGRADES`; `setMode`, `closeJournal`, and `setZoom` connect the dock, mobile Grow drawer, and camera controls. [index.html](../index.html) supplies shared SVG symbols. |
| Actual gameplay backgrounds | [src/renderer.js](../src/renderer.js), [current opening](../evidence/v0.2/final-dirty.png), [current restoration](../evidence/v0.2/final-restored.png), and [phone journal](../evidence/v0.2/final-phone-journal.png). These replace blank mockup backgrounds during review. |

[Browser checks](../evidence/browser-checks.json) report 26 passed, 0 failed, 0 console errors using headless installed Google Chrome 152.0.7977.83 at DPR 1. Touch, portrait/landscape layouts, offset direction, pointer cancellation, zoom/pan mapping, dialogs, and reload recovery were automated. These are interaction-correctness results, not human readability/comfort, physical iPhone/iPad testing, or performance measurements. The native dialog check permits Chrome's browser-chrome focus step while checking that no background app control receives focus.

Desktop first: test mouse and trackpad separately on physical Windows and MacBook hardware. Responsive previews are useful but do not verify either platform. Touch prototype from the start: explicit brush/direct modes, stable camera, finger-offset target feedback, cancel handling, and reachable edge dust. Touch targets must stay clear of bottom system gestures and cutouts. Confirm that offset feedback matches the actual destination, including near world edges.

Layout capture targets: 1440 × 900 and 1280 × 800 desktop; 1024 × 768 tablet; 390 × 844 phone portrait and 844 × 390 landscape. These are viewport simulations, not device claims. Review safe areas, menus, readable text, target reach, and the 50-creature scene in each. Mobile release readiness is separate and requires named physical iPad/iPhone models, OS/browser, thermal conditions, sustained performance, and comfort evidence.

## Audio direction and acceptance

The engine contract defines separate brush, birth, assignment, blocked, upgrade, landmark, and completion events. Their onset and timbre should be distinguishable without being louder on every occurrence. Brushing should convey material friction; formation gets a short warm rising gesture; assignment gives a clear acknowledgment; blocked feedback is gentle and distinct; upgrades make a brief developed motif; the fountain receives a resolving phrase with water.

Preserve the melodic identity as restoration adds arrangement and ambience. Limit repeated birth/work voices at 50 creatures and avoid stacking upgrade/completion peaks. Music, effects, ambience, mute, and pause must recover predictably. Inspect numerical peaks and voice counts, then listen to exported/live audio: neither a clean waveform nor synthesis code proves that a sound is satisfying. Human judgments on fatigue, repetition, balance, and warmth remain pending.

## Presentation defect register

Record an actual capture/timecode, condition, perceived problem, proposed smallest correction, owner, and recheck for each observed defect. Do not mark risks as observed defects or silently erase fixed entries.

| ID | Status | Condition / evidence | Next check |
| --- | --- | --- | --- |
| P-01 | Focused framing correction verified; physical review pending | Original fit framing made the village too small. Portrait now starts at 1.7×; landscape village grows from approximately 125 × 78 to 373 × 236 CSS px. [Before/after and actual pan evidence](CAMERA.md) verifies every required patch remains reachable. | Physical-phone recognition, finger occlusion, pan discovery and prolonged comfort test. |
| P-02 | Focused correction implemented; human crowd review pending | Single-ring crowd spacing was corrected to two staggered rings in `src/game.js`; [final restored capture](../evidence/final-restored.png) shows both rings and grounded silhouettes. This still does not establish movement readability. | Review the integrated interaction recording and observe humans redirecting 50 helpers, including dense work and fountain approaches. |
| P-03 | Human review pending | No unfamiliar player has evaluated the first reveal or restored composition. | Show real interactive opening and completion; record specific dislikes and voluntary continuation. |
| P-04 | Human review pending | Procedural motif and crowded mix have no human aesthetic validation. | Audition full opening/restoration and repeated events; capture discomfort and repetition comments. |
| P-05 | Focused correction implemented; appeal pending | Repeated grid-like dust received 12 cached variants, per-node variation, and connected mats. [Final dirty](../evidence/final-dirty.png) retains the same reachable node layout with a less uniform surface. | Ask whether real brushing feels locally clear and whether remaining repetition is visually unpleasant. |
| P-06 | Focused correction implemented; appeal pending | Healthy opening flowers were replaced with dormant planting; [final dirty](../evidence/final-dirty.png) and [final restored](../evidence/final-restored.png) visibly differ in foliage and flowers. | Observe whether unfamiliar players notice and value the garden's restoration. |
| P-07 | Typography and contrast corrected; human review pending | Main copy now 16 px, essential secondary copy at least 14 px; 134 contrast samples pass. [Before/after readability evidence](UI-READABILITY.md) includes phone journal and landscape settings. | Human reading and target-acquisition checks at normal size and on physical devices. Technical targets do not establish comfort or aesthetic preference. |
| P-08 | Corrected; final smoke verified | The completed scene's stale “A place waiting to bloom” caption has been changed to “A little place, alive again” for completion. Earlier captured inconsistency prompted the correction. | Root's final artifact smoke and refreshed opening/completion captures. No human review claimed. |

Add confirmed implementation defects and before/after links after gameplay QA. Claims of parity with any reference remain prohibited until humans review the actual experience.
