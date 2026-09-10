# Native UI accessibility and interruption audit

2026-09-10. Started as a source-only audit of runtime checkpoint `960d96b`; Main SHA-256 `4eb4f15e2d75b6337941c6bee880e762adc8ff5f86e8d65fb5ffd63d38e4e51b`, build source `056dc75f0078eda1fbf61752b940818671ad348ed554974f9dc519fadaaa2313`. Initial effort cap: 15 minutes. The lead subsequently authorized the isolated feedback correction and focused native follow-ups. The audit agent edited only isolated candidates, tests and evidence; the lead integrated all canonical corrections. Historical review-package identity must not be treated as the corrected runtime identity.

The first pass used code and existing coverage. The lead subsequently authorized isolated native verification, including focused routing checks for items 2–3. No physical keyboard session, native operating-system picker interaction, audio audition or human playtest occurred. Human satisfaction and owner acceptance remain unmeasured. Figma remains unavailable; the implemented Godot UI is the inspectable prototype.

## 1. Save-copy outcomes are hidden while Settings remains open

**Confirmed source path and native reproduction; highest priority.** Settings is the route into Save a copy and Load a copy. `_modal()` hides `ordinary_controls`, including `tip` (Main lines 584–594). Export success and failure, plus invalid import, call only `_notice()` (lines 841–880); that writes `tip.text` (788–790). Those branches keep Settings open. The player therefore receives no visible outcome at the point of the operation. The notice timer is paused too (236–240), so the message can appear after leaving Settings; that does not provide immediate confirmation. Valid import already closes the modal and shows its outcome in the world.

Intended benefit: know whether a recovery copy succeeded or why loading did not change the courtyard, without leaving the recovery controls. This is particularly relevant when a failed autosave has directed the player to save a copy.

Smallest proposed correction: reuse a wrapping status label inside Settings, initially showing its existing save problem. Update that label for export success/failure and invalid import. Retain an explicit device-save warning when a copy operation has not repaired that separate failure. Keep the panel paused, retain one modal, and return keyboard focus to the initiating visible Settings control after the dialog closes or is cancelled. Do not add a world toast behind the modal or silently clear `save_problem`.

Observable native acceptance: in unique QA storage, run successful copy, unwritable/missing destination, invalid JSON, invalid game schema and missing import. On each callback, its precise result must be visible inside the same Settings panel immediately; progress and preferences must remain unchanged for failures; simulation/audio remain paused; no held stroke resumes; focus returns to the initiating control. At both 1280×800 and 960×640, the status and Return control must fit the viewport and remain readable. Cancel must preserve the current message and focus. A successful import remains its separate existing return-to-game path. Actual operating-system file-picker interaction remains an additional check.

The [isolated patch](../evidence/3d/accessibility-audit/main.patch) was verified in copied projects and then integrated by the lead. It adds a Settings-only conditional in `_fit_modal`: when a status is visible and the logical viewport is below 750 pixels tall, vertical gaps use 8 pixels instead of 14. Text and control minimum sizes remain unchanged. This responds to the measured overflow below and does not alter other panels.

### Actual isolated verification

Godot 4.7.2, macOS Apple M4 Pro, native Metal Forward+. Requested windows: 1280×800 and 960×640. Logical canvas sizes: 1440×900 and 1080×675; actual captured canvas PNGs are 1280×800 and 960×600 respectively (the latter is the rendered canvas, not the outer window). Each run created unique cache storage and an ephemeral localhost lock. Canonical `godot/` source and ordinary progress were never changed.

The [probe](../evidence/3d/accessibility-audit/native_feedback_probe.gd) invokes the production FileDialog callbacks. Its test-local `child_entered_tree` hook switches the picker to embedded Godot UI, then emits selected/cancelled outcomes. Files are genuinely written/read by the production store. This does not establish native operating-system picker focus or physical input behavior. The world remains a paused menu fixture; the soundscape never starts.

| Run | PID | Checks passed | Observed failures |
| --- | --- | --- | --- |
| Frozen baseline | 46128 | 119/133 | All 14 save/import outcome-visibility cases fail across both sizes. |
| Initial status candidate | 46136 | 132/133 | Combined invalid-copy/device-save warning produces a 697-pixel panel inside the 675-pixel canvas, clipping top and bottom. |
| Final narrow candidate | 46204 | 133/133 | None in this bounded probe. Longest tested panel is 637 pixels tall, centered with 19 pixels of logical margin. |
| Lead's integrated source | 46324 | 133/133 | Same Settings cases pass after merging separate completion/hint changes. |

Each size covers successful export, failed export into a missing directory, malformed JSON, wrong game schema, missing import, both dialog cancellations, and successful/invalid-copy outcomes while actual device saving fails. Assertions check visible text, all essential control bounds, unchanged payload, one paused Settings modal, originating-button focus and cleared held input. Four deliberately malformed JSON reads per run emit the store's existing parse diagnostics; logs preserve them. No diagnostic suppression or new runtime exception is claimed.

Actual normal-size views inspected: [baseline hidden invalid-copy outcome](../evidence/3d/accessibility-audit/baseline/960-invalid-json.png), [initial clipped candidate](../evidence/3d/accessibility-audit/candidate-initial/960-recovery-invalid.png), [corrected recovery failure](../evidence/3d/accessibility-audit/candidate/960-recovery-invalid.png), and [1280 copy success](../evidence/3d/accessibility-audit/candidate/1280-saved-copy.png). The final message, focus ring and Return control are visible over real courtyard geometry. Readability and comfort remain human questions, not conclusions from the checks.

Exact hashes and run reports: [proposal.json](../evidence/3d/accessibility-audit/proposal.json), [file hashes](../evidence/3d/accessibility-audit/files.json). Final candidate Main SHA-256: `7893e39a2af90360a2cb9c6e90a611e371fe5b1641f1976f649fb132b4ac0b22`. The earlier failed candidate and all logs/stills are preserved.

The integrated 133-check run used Main `90bc802595b85af5d4fe45cb8a948af1a56df7808f4e45414afbc7567c5fc1bd`; its [minimum-window result](../evidence/3d/accessibility-audit/integrated/960-recovery-invalid.png) was visually inspected and retains the fitting status, focus ring and Return control. This probe does not test the lead's separate recap changes.

The lead requested one additional **valid-import** path because it closes/frees Settings before the deferred focus callback. Separate run PID 46408 passes **10/10** checks on Main `2f43c73116288e0e104523f220baab9942416dc68c6e03c7566d423318f4224f` (only the lead's ritual QA assertions changed after the 133-check source). It writes and loads a genuinely different valid two-helper courtyard plus all six preferences through the production callback, waits eight native frames, verifies the originating Settings button is freed, confirms live Brush focus and a resumed world/started soundscape, checks visible success confirmation and production saved state, then shuts down without diagnostics. See [report](../evidence/3d/accessibility-audit/valid-import/results.json), [log](../evidence/3d/accessibility-audit/valid-import.log) and [return capture](../evidence/3d/accessibility-audit/valid-import/valid-import-return.png). This count is separate from the 133 checks.

The first valid-import probe had a **test-only failure**: it assumed serialized `game.cleaned` existed instead of deriving cleaning through `Sim.restore()`. That stopped its coroutine; PID 46378 was terminated, and its source/log are preserved under `valid-import-initial/`. The corrected probe uses the production restore path and completed normally. A later input sequence exposed a separate real deferred-focus failure, described below; the single valid-import pass did not establish every timing order.

## 2. Keyboard focus can compete with returning to world controls

**Confirmed by native generated input.** In the frozen baseline, `_close_modal()` focuses Brush (642–652), while arrows, Space and Enter use `_unhandled_input()` (329–349). B/D change the tool but do not release UI focus; N explicitly does (365–369). Existing camera checks used N and therefore did not expose the competing button action.

Intended benefit: an intentional keyboard return from Settings or Grow should not accidentally activate a different tool or require an unexplained extra action.

Native PID 46630: **7/10 checks pass; three failures**. Return → D → Enter assigns the crew at the valid parked pointer, then activates the focused Brush button and changes the mode back to Brush. Valid import → D → Enter has the same behavior. Right arrow after Return moves GUI focus to Direct without changing world aim. N-first direction/arrow/Space paths pass; Space itself also brushes without N. See [exact recorded states](../evidence/3d/accessibility-audit/focus-before/results.json).

That sequence also exposed a deferred-focus diagnostic: `_restore_settings_focus(control: Control)` sometimes received an already-freed control and failed its argument conversion **before** `is_instance_valid()` could guard it. The log is preserved. The lead made the argument untyped so its validity check executes, and released GUI focus when returning to the world or choosing Brush/Direct. This deliberately supersedes the older valid-import assertion that Brush should retain focus. It preserves focus for paused Settings copy outcomes and does not intercept menu arrows/Space globally.

The first handoff candidate, PID 46772, passes **20/21** strengthened checks. World controls, a modal slider and eight deferred valid-import cycles work without diagnostics. Tab cannot acquire focus from the world, however. After explicit first-Tab entry, PID 46845 passes **21/23**: Tab reaches Settings, but forward/backward traversal remains inside that top-level HBox and cannot reach the separate dock. In contrast, all ten Settings controls traverse correctly. Both failed generations are preserved. These findings support explicit cyclic HUD focus links across the separate roots while leaving modal navigation intact.

The lead added cyclic `focus_next`/`focus_previous` links across visible enabled HUD actions, refreshed on Tab so the fountain bell joins when available. Deliberately focused UI controls retain their activation/arrow keys; B/D/N explicitly hand off to world control. **Final PID 47050 passes 30/30** on Main `8864aa553dd03c19cc65f533a7dcf4c6bf8e9b59e5e7e022a38618ed94676cd8`, with no diagnostics or exit leaks. [Report](../evidence/3d/accessibility-audit/focus-after/results.json), [log](../evidence/3d/accessibility-audit/focus-after.log), [exact source](../evidence/3d/accessibility-audit/main-focus-final.gd).

The final checks traverse all seven ordinary HUD actions forward and backward, then all eight when the bell becomes available in the existing 50-helper/80%-clean QA fixture. They traverse all ten Settings controls, preserve modal slider behavior, verify Return/import → D → Enter stays Direct, verify world arrow/Space aiming, prevent incidental world orders from keyboard Grow/Direct activation, and exercise eight valid-import/free cycles. These are generated native events and controlled availability fixtures, not physical keyboard use or a new performance sample.

One preceding run, PID 47003, recorded **27/28** because the probe incorrectly expected an arrow after activating Brush with Space to remain UI navigation. Activating Brush intentionally hands off to the world. That failed expectation and exact probe are preserved under `focus-after-combined-space/`. The final split checks establish all three intended steps: a HUD-focused arrow alone does not aim; Space activates Brush without brushing and releases focus; the following arrow intentionally aims. No further runtime change was made for this probe correction.

## 3. Help and completion recap do not choose an initial focus

**Confirmed omission and native Help behavior.** Welcome, Settings and Grow call `grab_focus()` on an intended action. The frozen Help and completion recap did not (752–763), after the prior modal is hidden and queued for deletion. Native Help PID 46695 opened successfully but had no initial focus; a fresh Enter and two Tab presses left focus null. **1/4** bounded checks passed. Escape remained an available route, so this is not a claim that every keyboard exit was blocked.

The lead added Back to settings focus. Native PID 46855 passes **5/5**: the Enter used to open Help does not immediately close it, Back visibly owns focus after the old panel is freed, a fresh Enter returns, and Tab reaches Let the crew roam and Back. [Actual Help entry](../evidence/3d/accessibility-audit/help-after/help-entry.png) was inspected at normal size; its Back focus ring is visible. The lead separately added and tested Enjoy focus in its recap work; that evidence is not substituted by this Settings/Help probe.

Intended benefit: make a nested help visit or recap return predictable without searching for an initial focus indicator. The correction explicitly focuses the intended return action. No crew order changes or automatic Let the crew roam action were added.

Observable check: keyboard-open Help and recap; inspect initial focus, activate Back/Enjoy with Enter, and cycle Tab/Shift-Tab through all enabled actions without reaching hidden HUD controls. Escape must leave one coherent panel/world state with no held input. Settings/Grow return and repeated purchases must retain a visible, usable focus.

## Reviewed without a new defect claim

- Existing [native recovery checks](3D-RECOVERY.md) cover save generations, stale writers, pause/focus loss, held-input cancellation, settings persistence and packaged second launch. They do not operate native import/export dialogs. Their passing results are preserved, not repeated here.
- Existing [camera checks](3D-CAMERA.md) cover visible remaining-dust targets, keyboard aiming with parked mouse over HUD, and Home/Frame cancellation. Those corrected failures are not new audit findings.
- Ordinary HUD controls are hidden during a modal, world input is guarded by pause/modal state, and discovery viewports explicitly use `FOCUS_NONE`. The native follow-up traverses all ten Settings controls without reaching hidden world actions.
- Buttons have 46-logical-pixel minimum height, explicit hover/press/focus styles and a two-pixel focus border; settings toggles have 44-pixel minimum height and themed focus. Main labels use 17-pixel type, upgrade explanations 15 and the secondary save label 14. These facts do not prove physical-device readability or comfortable long sessions.
- Baseline `_fit_modal()` uses content minimum height without a viewport clamp or scrolling. The bounded native checks found no baseline overflow in their cases, but did find and correct the first candidate's combined-warning overflow. No general scrolling or modal redesign was added.
- Gentle motion suppresses repeated button response tweens; pause/focus paths already stop held input. No new comfort defect was established in this bounded source audit. Player feedback on keyboard/trackpad fatigue remains absent.

## Exact continuation

The Settings patch and supported keyboard/Help corrections are integrated and their focused native checks pass. Lead: finish the current-source recap/full-play capture and refresh the source-bound review build. The frozen before/after artifacts remain independently inspectable. Physical native file-picker operation, physical Windows/macOS input, human readability and comfort remain pending. Do not rerun the completed recovery/storage audit or change tested presentation details without a new reason.
