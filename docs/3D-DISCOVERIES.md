# Native 3D discovery previews

Date: 2026-09-10. Status: reusable component verified; root Grow integration and human understanding remain unvalidated. There are zero human sessions or owner approvals for these previews.

## Benefit, evidence and bounded scope

Player benefit: see the capability an upgrade introduces beside its short label, using the same original creatures and materials as the game. The evidence is the approved requirement that upgrades visibly change behavior/capability and the owner's request for a minimal, tactile interface. Whether these particular miniatures make the choice clearer is a hypothesis requiring unfamiliar players.

The bounded implementation supplies three small native 3D previews; it does not add mechanics, text, audio, game state, zones or a new creature design. The lead owns the upgrade row, price, button, purchased state and explanatory label.

## Integration contract

`godot/scripts/discovery_preview.gd` extends `SubViewportContainer`.

```gdscript
var preview = preload("res://scripts/discovery_preview.gd").new()
preview.configure("teamwork", settings.gentle)
row.add_child(preview)
```

`configure(kind: String, gentle_motion: bool)` works before or after `_ready()`. Supported kinds are `brush`, `teamwork`, and `bloom`; an unknown kind safely uses `brush`. The minimum logical size is 110 × 84. The container stretches its viewport to the actual control size; do not stretch the control nonuniformly with `scale`. Place it beside the existing upgrade label rather than putting text inside it.

Mouse input is ignored and focus is disabled, so a preview adds no keyboard stop or blocked button area. Each owns an isolated transparent 3D world, fixed orthographic camera and quiet light setup. Materials and simple geometry are shared within the script, while characters use the existing `DustlingVisual` resource and pose API.

- **Brush:** a muted original-radius ring stays on paving while the wider teal sweep expands. Actual ground specks provide scale.
- **Teamwork:** two existing Dustlings stand side by side, grounded on paving, with their tidying hand pose and a small shared dust patch. There is no repeated locomotion or bounce.
- **Bloom:** three Dustlings surround a miniature fountain; the teal basin fills and the two real water streams appear. This is a capability illustration, not an actual restoration simulation or substitute for the earned reveal.

Normal motion follows a quiet five-second cycle. Hidden widgets disable both processing and viewport rendering. Fully clipped/offscreen widgets freeze their animation clock; rendering uses `UPDATE_WHEN_VISIBLE`. Gentle motion selects a still, completed-capability pose and renders only when needed. The owned viewport/world are child nodes and free with the container. Reconfiguration discards the old content safely.

## Actual inspection and checks

An isolated native Metal Forward+ fixture displayed all three widgets at **110 × 84 actual pixels** over the current warm panel color, using Godot 4.7.2 on the available Apple M4 Pro host. Its external labels identified dimensions only; the widgets contain no text. Captures at approximately 0.3, 1.5 and 2.5 seconds show the changed ring width and fountain water state. The native run exited with no errors or warnings.

Actual stills handed to the lead:

- `/tmp/dustlings-discoveries-start.png`
- `/tmp/dustlings-discoveries-mid.png`
- `/tmp/dustlings-discoveries-full.png`
- `/tmp/dustlings-discoveries-gentle.png`
- Individual transparent 110 × 84 PNGs: `/tmp/dustlings-discovery-{brush,teamwork,bloom}.png`

The complete frame can be inspected at normal size. It shows two separate recognizable helper silhouettes, the wider ring and a distinct fountain grouping. That is an assistant visual observation, not evidence that target players understand or enjoy them.

Captured alpha bounds were:

| Preview | Nontransparent pixel bounds | Result |
| --- | --- | --- |
| Brush | x=3–106, y=31–75 | Transparent margins; ground/ring/shadow stay inside |
| Teamwork | x=3–106, y=20–75 | Both feet, sprouts and shadows remain inside |
| Bloom | x=7–102, y=13–73 | Fountain top, water and crew remain inside |

The three-widget fixture reported **74 draw calls and 43,664 rendered primitives** in one snapshot, including its ordinary UI and render passes. This is not sustained performance, per-widget GPU time, or a 50-helper integrated game measurement. The extra work exists only while the Grow previews are visible; the lead must check the combined modal over the current game.

`Godot --headless --path godot --script res://scripts/discovery_preview.gd --check-only` passed. Native runtime checks verified before/after-ready configuration, hidden clock/render suspension and gentle clock suspension. A final headless state check also verified no focus target, the still tidying pose, isolated transparent worlds, offscreen clipping pause/resumption, ancestor visibility handling and release of the owned `SubViewport`. These final input/lifecycle corrections did not alter the normal-motion geometry in the native stills. Logs/results are `/tmp/dustlings-discoveries-checks.{json,log}` and `/tmp/dustlings-discoveries-state.log`; the lead should preserve them with the milestone evidence.

Godot's documented container sizing and viewport update behavior guided this implementation: [SubViewportContainer](https://docs.godotengine.org/en/latest/classes/class_subviewportcontainer.html) and [SubViewport](https://docs.godotengine.org/en/stable/classes/class_subviewport.html), inspected 2026-09-10.

## Open gates and exact next action

1. The lead places the previews beside the current Grow labels/buttons, then captures the actual modal at normal desktop viewing size and the narrow supported layout. Check row spacing, clipping, price legibility, focus order and the busiest gameplay background.
2. Record a brief actual Grow interaction showing preview motion, purchase feedback and the resulting world capability. The isolated image sequence is not that interaction recording.
3. Ask unfamiliar players what each upgrade changes before purchase, then whether the actual effect matches the preview. Ask whether the small models are pleasant, readable or distracting. The 110 × 84 presentation is technically distinct but human legibility remains unverified.
4. Measure the integrated modal's added rendering work on physical Windows and Mac targets. If it materially harms responsiveness, lower preview rendering frequency or resolution while retaining the original materials and understandable silhouettes.

Exact next action: root integrates this component in the Grow rows, inspects the real modal and captures the purchase flow. Do not add more preview content or arbitrary ornamentation before that evidence.
