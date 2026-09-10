# Native UI accessibility and interruption audit

2026-09-10. Source-only audit of runtime checkpoint `960d96b`; Main SHA-256 `4eb4f15e2d75b6337941c6bee880e762adc8ff5f86e8d65fb5ffd63d38e4e51b`, build source `056dc75f0078eda1fbf61752b940818671ad348ed554974f9dc519fadaaa2313`. Initial effort cap: 15 minutes. The lead subsequently authorized one isolated feedback patch and a prepared native reproduction probe. Canonical game source and the current review package remain unchanged by this audit.

The first pass used code and existing coverage. After the lead released the native slot, item 1 received the isolated native verification below. Items 2–3 remain source-only risks. No physical keyboard session, native operating-system picker interaction, audio audition or human playtest occurred. Human satisfaction and owner acceptance remain unmeasured. Figma remains unavailable; the implemented Godot UI is the inspectable prototype.

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

The first valid-import probe had a **test-only failure**: it assumed serialized `game.cleaned` existed instead of deriving cleaning through `Sim.restore()`. That stopped its coroutine; PID 46378 was terminated, and its source/log are preserved under `valid-import-initial/`. The corrected probe uses the production restore path and completed normally. No runtime change was needed for deferred focus after valid import.

## 2. Keyboard focus can compete with returning to world controls

**Unverified native input-routing risk.** `_close_modal()` always focuses Brush (642–652), while arrows, Space and Enter are handled only by `_unhandled_input()` (329–349). B/D change the tool but do not release UI focus; N explicitly does (365–369). Existing camera checks cover N and held-stroke cancellation, but do not establish the behavior of arrows/Space/Enter while a HUD button owns keyboard focus. This audit does not assert that Godot consumes a particular event without a native reproduction.

Intended benefit: an intentional keyboard return from Settings or Grow should not accidentally activate a different tool or require an unexplained extra action.

Smallest next step: generated native viewport input, not direct calls to `_unhandled_input`, should test Return → D → arrows → Enter, Return → B → arrows → Space, and the documented N-first alternative. Record focused control, tool, aim, actual assignment/removal and handled input. Retain keyboard Tab/Shift-Tab access to HUD buttons. Only if the conflict reproduces, explicitly hand off focus when the player requests world aiming; do not globally disable button keyboard focus.

## 3. Help and completion recap do not choose an initial focus

**Confirmed omission; player impact awaits native verification.** Welcome, Settings and Grow call `grab_focus()` on an intended action. Help and completion recap create their buttons without doing so (752–763), after the prior modal is hidden and queued for deletion. This gives neither panel an explicit initial focused action. It is not evidence of a keyboard trap: Escape still has a close path, and default Tab traversal may work.

This describes the frozen audit baseline. The lead subsequently added explicit Enjoy focus as part of its separate recap correction; its native recap test belongs to that work. Help and general modal Tab traversal remain unverified here.

Intended benefit: make a nested help visit or recap return predictable without searching for an initial focus indicator. Smallest correction, if the native check confirms absent or misleading focus: focus Back to settings and Enjoy the courtyard after constructing their respective panels. Do not change crew orders or automatically choose Let the crew roam.

Observable check: keyboard-open Help and recap; inspect initial focus, activate Back/Enjoy with Enter, and cycle Tab/Shift-Tab through all enabled actions without reaching hidden HUD controls. Escape must leave one coherent panel/world state with no held input. Settings/Grow return and repeated purchases must retain a visible, usable focus.

## Reviewed without a new defect claim

- Existing [native recovery checks](3D-RECOVERY.md) cover save generations, stale writers, pause/focus loss, held-input cancellation, settings persistence and packaged second launch. They do not operate native import/export dialogs. Their passing results are preserved, not repeated here.
- Existing [camera checks](3D-CAMERA.md) cover visible remaining-dust targets, keyboard aiming with parked mouse over HUD, and Home/Frame cancellation. Those corrected failures are not new audit findings.
- Ordinary HUD controls are hidden during a modal, world input is guarded by pause/modal state, and discovery viewports explicitly use `FOCUS_NONE`. No source evidence establishes a focus escape to hidden world actions. Tab confinement still needs the focused native navigation check above.
- Buttons have 46-logical-pixel minimum height, explicit hover/press/focus styles and a two-pixel focus border; settings toggles have 44-pixel minimum height and themed focus. Main labels use 17-pixel type, upgrade explanations 15 and the secondary save label 14. These facts do not prove physical-device readability or comfortable long sessions.
- Baseline `_fit_modal()` uses content minimum height without a viewport clamp or scrolling. The bounded native checks found no baseline overflow in their cases, but did find and correct the first candidate's combined-warning overflow. No general scrolling or modal redesign was added.
- Gentle motion suppresses repeated button response tweens; pause/focus paths already stop held input. No new comfort defect was established in this bounded source audit. Player feedback on keyboard/trackpad fatigue remains absent.

## Exact continuation

The Settings patch is integrated and its merged dialog paths are verified. Lead: finish the separate recap capture/check and refresh the source-bound review build. The frozen before/after artifacts remain independently inspectable. Run the separate keyboard routing/focus checks before treating the remaining risks in items 2–3 as confirmed failures. Physical native file-picker operation, human readability and comfort remain pending; do not repeat the completed recovery/storage audit.
