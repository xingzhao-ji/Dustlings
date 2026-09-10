# Responsive camera checkpoint

This cycle fixes a documented presentation and interaction problem: at 844×390 the landscape village occupied roughly 125×78 CSS pixels. Fixed top/bottom reservations consumed most of the game region. The portrait phone also opened at a small whole-village fit. These observations came from actual browser captures; they are not human usability findings.

| Player benefit | Evidence | Smallest change | Acceptance |
| --- | --- | --- | --- |
| See the landscape courtyard and crew clearly | Normal-size landscape capture showed a tiny village surrounded by unused space | Move landscape controls into a 300px left region and fit the scene into the remaining height | Village at least approximately 300×190 CSS pixels at 844×390; required controls remain readable and at least 44px |
| Start portrait play with a more useful brush/creature scale | Whole-field fit at 390×844 reduced the brush radius to around 15px | Recommend initial portrait zoom 1.7; retain root-owned zoom and the fit control | Actual initial zoom is 1.7; “−” returns to fit and “+” zooms again |
| Reach every required patch after zooming | Larger portrait framing crops the sides | Preserve exact inverse projection and existing pan controls; exclude control regions from scene input | All 466 dust nodes reachable using existing pan bounds; actual drag reaches four corner patches |

## Implementation contract

`resize(width,height,dpr)` automatically derives a scene viewport from the measured canvas size. It sets `canvas.dataset.viewportMode`, and the landscape CSS follows that same mode, avoiding a mismatch between window media queries and the canvas dimensions.

| Mode | Measured canvas condition | Insets in CSS pixels | Recommended initial zoom |
| --- | --- | --- | --- |
| Landscape | Width at least 620, height at most 420 | Left 300, right 12, top 12, bottom 12 | 1 |
| Portrait | Width at most 560, height greater than width | Left/right 0, top 88, bottom 122 | 1.7 |
| Desktop | Other sizes | Left/right 0, top 80, bottom 110 | 1 |

The renderer exposes `viewport = {x,y,width,height}`, `viewportMode`, `recommendedZoom`, and `containsScreenPoint(x,y)`. `setResponsiveViewport()` restores automatic viewport selection. `setViewportInsets(top,bottom,left,right)` or an object with those fields supplies a manual override. `setCamera(zoom,centerX=500,centerY=390)` remains the camera API.

The renderer does not silently change zoom. Root integration applies the recommendation when the viewport mode changes, preserves the root zoom value for controls, rejects pointer input outside the scene, and uses viewport bounds for keyboard aiming and birth labels. Fit remains zoom 1. Panning uses the existing center limits.

Ground projection remains `screenX = offsetX + worldX × scale` and `screenY = offsetY + worldY × .72 × scale`. Only ground locations use the .72 projection. Creature shapes receive the same horizontal and vertical scale and remain upright, including their existing optical adjustment; no stretching was introduced. The scene is clipped to its four-sided viewport. The landscape controls remain outside that rectangle.

## Actual verification

Local headless Google Chrome 152.0.7977.83, DPR 1. Phone cases use touch-enabled browser contexts. These are simulated layouts on the development Mac, not physical iPhone/iPad testing or Windows support validation.

| Window viewport | Actual initial zoom | Approximate full artwork bounds | Result |
| --- | ---: | ---: | --- |
| 1440×900 | 1 | 745×472px | Normal desktop framing preserved |
| 844×390 | 1 | 373×236px | Landscape size target met; full scene fits |
| 390×844 | 1.7 | 531×337px | Larger initial scene; sides intentionally crop and remain reachable by pan/fit |

- Camera forward/inverse projection checked across 466 dust nodes, four zoom values and three centers in each of three layouts. Maximum round-trip error: 2.28×10⁻¹³ world units.
- All 466 nodes can be placed within the scene with at least 12px margin at zoom 1, 1.7 and 2 using the existing pan center limits. Zero unreachable nodes.
- Actual mouse drags through the shared pointer handler in touch-enabled browser contexts reached all four corner dust sites in both landscape and portrait at zoom 2: eight of eight checks passed. This is not a physical finger-comfort test.
- Actual initial portrait zoom, landscape zoom and desktop zoom match the renderer recommendation after root integration. The initial states were captured directly, without overriding zoom for those captures.
- Normal-size opening, 50-creature fixtures, assignment feedback, and desktop views were inspected. Landscape controls, instructions and the roam action do not overlap. The 50-creature images are constructed presentation fixtures, not observed player progress.
- No page errors were observed. No sustained-performance claim is made by this camera cycle; concurrent root profiling is recorded separately.

Run `node tools/camera-qa.mjs` while the local app is served on port 4173. Set `DUSTLINGS_CHROME` if the installed Chrome executable is elsewhere. The script checks initial zoom integration, projection, reachability, live drag panning, and generates captures plus a JSON report.

## Review artifacts

- Landscape: [before 50-creature view](../evidence/camera-before-landscape-swarm-fixture.png), [after 50-creature view](../evidence/camera-after-landscape-swarm-fixture.png), [actual opening](../evidence/camera-after-landscape.png), [assignment controls](../evidence/camera-after-landscape-assignment.png).
- Portrait: [before opening](../evidence/camera-before-phone.png), [actual new opening](../evidence/camera-after-phone.png), [50-creature view](../evidence/camera-after-phone-swarm-fixture.png), [fit view](../evidence/camera-after-phone-fit-fixture.png).
- [Automated portrait pan/fit interaction recording](../evidence/camera-pan-and-fit.webm).
- [Final integrated QA results](../evidence/camera-results.json), [camera QA script](../tools/camera-qa.mjs).

## Remaining human questions

Do players understand that “−” shows the whole courtyard, discover panning comfortably, and keep the destination visible above a real finger? Are the 50-creature landscape silhouettes recognizable at normal phone viewing distance? Does a larger cropped portrait opening feel more inviting than the fit view? Physical safe areas, real finger reach, sustained device performance, and player preference remain unverified. The recorded geometry and automated actions do not answer those questions.
