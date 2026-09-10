# UI readability checkpoint

This bounded cycle addressed a concrete screenshot defect: important explanations and conditions were small and pale. It changes `style.css`; simulation, progression, camera, audio and game copy are unchanged.

| Intended player benefit | Available evidence | Smallest useful change | Acceptance check |
| --- | --- | --- | --- |
| Read upgrade effects and requirements comfortably | Existing descriptions were 12–13px; requirements were 10px. The description color on a locked card measured about 3.91:1 contrast; the requirement color about 3.72:1. | Essential body/action text at least 14 CSS pixels; primary paragraphs 16px. Shared dark sage text, with existing cream/green surfaces. | Inspect normal-size gameplay and computed text at four viewports; measured required body text at least 4.5:1, large text at least 3:1. |
| Understand the fountain condition before it is available | Disabled landmark guidance was about 2.24:1 contrast. | Keep disabled guidance dark and readable, with a quieter button surface. | Fountain condition remains legible while disabled, and its button can be scrolled into view. |
| Read settings and reliably return to play | Settings explanations and save guidance were 11–12px. Mobile journal close control scrolled away. | Explanations and save guidance at 14px, setting names at 16px; pin the journal close control. | Phone settings inspection; scroll journal to the landmark and close it without returning to its top. |
| Start comfortably in landscape | A tall portrait welcome composition competes with short screens. | Compact the landscape welcome and omit its decorative illustration there. | Start button fully visible at 844×390 without scrolling. |

The established typography, cream/sage palette, rounded cards and restrained spacing remain. Decorative eyebrows, house chapter metadata and purely decorative footer copy can be smaller than 14px. Primary actions, body guidance, upgrade conditions, costs, progress text, crew/mote labels, settings explanations, save guidance and the desktop control reminder are at least 14px.

## Actual checks

Checks ran in locally installed Google Chrome 152.0.7977.83, headless, DPR 1. These are browser viewport simulations on the development Mac, not physical iPhone/iPad tests or Windows support verification.

| Viewport | Required gameplay text sampled | Minimum sampled gameplay contrast | Start visible without scroll | Landmark reachable | Journal close remains reachable |
| --- | ---: | ---: | --- | --- | --- |
| 1440×900 | 24 instances | 5.04:1 | Yes | Yes, journal scroll | Yes |
| 1280×800 | 24 instances | 5.04:1 | Yes | Yes, journal scroll | Yes |
| 390×844 | 24 instances | 5.04:1 | Yes | Yes, journal scroll | Yes, pinned |
| 844×390 | 24 instances | 5.04:1 | Yes | Yes, journal scroll | Yes, pinned |

All 96 sampled gameplay text instances were at least 14px. Another 38 settings text instances across touch-enabled phone and landscape simulations were at least 14px and at least 4.93:1 contrast. The 4.93:1 minimum is the light text on the primary green button. Contrast calculations use computed colors and composited backgrounds; world-overlay samples use the canvas pixel behind the text. This is a targeted check of the listed controls, not a claim of full accessibility conformance.

Normal-size captures were visually inspected for all four layouts, including a synthetic 50-creature fixture, the journal scrolled to the landmark, phone settings and landscape welcome. The 50-creature fixtures are explicitly constructed presentation states; they are not playtest outcomes. Touch-enabled assignment checks also showed the instruction text and “Let the crew roam” action do not overlap. Initial block-level overlap detection included empty space around the centered instruction; its actual text bounds were then checked.

No page errors were observed. The journal scroll interaction, pinned close control and settings return were exercised in an automated short recording. No human participants were observed, and no preference or comfort score is inferred.

## Review artifacts

- Before/after normal opening: [desktop before](../evidence/readability-before-desktop.png), [desktop after](../evidence/readability-after-desktop.png), [phone before](../evidence/readability-before-phone.png), [phone after](../evidence/readability-after-phone.png).
- Busiest constructed scene: [desktop 50-creature fixture](../evidence/readability-after-desktop-swarm-fixture.png), [landscape 50-creature fixture](../evidence/readability-after-landscape-swarm-fixture.png).
- Reachable controls: [phone journal](../evidence/readability-after-phone-journal.png), [phone landmark](../evidence/readability-after-phone-landmark.png), [compact desktop landmark](../evidence/readability-after-compact-landmark.png), [landscape landmark](../evidence/readability-after-landscape-landmark.png), [phone settings](../evidence/readability-after-phone-settings.png), [landscape welcome](../evidence/readability-after-landscape-welcome.png).
- Interaction: [automated phone journal/settings recording](../evidence/readability-journal-scroll.webm).
- Measurements: [baseline](../evidence/readability-before.json), [four-layout results](../evidence/readability-after.json), [touch and settings results](../evidence/readability-touch-and-dialogs.json).

## Problem handed to the next cycle

The landscape world is much too small in the inspected 844×390 capture: the village is approximately 125×78 pixels because fixed renderer reservations consume most of the canvas height. The interface itself fits, but helpers and brushing targets are not readable at that size. The root was notified to address responsive camera framing/insets next. Phone portrait full-field framing also remains small, with zoom/pan offered; its comfort needs a physical-device test.

The larger journal deliberately scrolls rather than shrinking required text. Unfamiliar players must still verify whether they notice this scroll area, understand the upgrade effects and conditions, and find the fountain action without coaching. Human feedback is still unavailable.

The subsequent [camera cycle](CAMERA.md) now addresses the tiny landscape view and applies a larger initial portrait zoom. The captures and measurements above preserve the readability checkpoint before that camera revision.
