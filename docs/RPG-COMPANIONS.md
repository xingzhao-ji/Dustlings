# Companion movement: diagnosis and navigation candidate

This task responds to actual integrated footage/route evidence: after the player stopped near Ivo, helper distances were approximately 3.27,3.29,6.31,1.09 m despite a 30-second blocked-player interval. The automated driver's line through Ivo was separately incorrect; physical NPC collision should remain. The companion lag required its own diagnosis because it breaks the sense that these creatures accompany the player.

Human observations of this change: **0**. This is engine geometry/movement evidence, not a judgment of appealing animation. The owner now prioritizes grounded movement, contact, anticipation and variation; reliable companion presence supports that priority and does not expand the RPG neighborhood scope.

## Two observed causes

The baseline uses the frozen `builds/3d/rpg-capture-snapshots/neighborhood-integrated` source, with exact hashes in `evidence/rpg/companions/baseline/report.json`. Four companion/door abilities are initialized once as an explicit fixture. Generated physical keys then take the actual player through a street, home, repaired bridge, greenhouse and back. Followers use the untouched current movement code and are never teleported during the route. Each destination includes 30 simulated seconds of rest.

The fixture passes **23/27** checks. All player destinations and solid-overlap checks pass, but one helper fails four later distance checks. Helper 3 first idles east of `OldLanternBase` at approximately (1.291,0.00049,5.651). Its next breadcrumb is (−0.398,0.00084,5.542), 1.693 m away across the collider, with zero actual velocity. It stays there through the home, bridge and greenhouse; its queue grows 33→106→135 and player distance increases 11.24→12.61→20.26 m. The other three settle around 1.09 m from the player. Once the 160-entry queue cap drops the old blocked breadcrumb, it moves again but remains about 11.15 m behind on return. This is an obstacle-recovery failure; changing the waypoint tolerance alone cannot cross that lantern base safely.

A separate **artificial clear-floor probe** tests the proposed spacing deadlock. Four actual companion bodies start 0.36 m around the same unobstructed breadcrumb. Nonfloor world collision is disabled only for this diagnostic. After 12 simulated seconds, all four have zero velocity, one queued point each, and distances **0.2708…0.2741 m** from that point. Existing acceptance is 0.23 m while pair repulsion begins at 0.48 m. That is direct support for a 0.32 m breadcrumb arrival tolerance while preserving creature separation.

Two unsuccessful diagnostic setups are preserved honestly. The first assigned an untyped Array to the game's typed waypoint array and failed before reaching its observation; its apparent one-check report is not a completed probe. The next site's nearby collider interfered with the intended isolation. The corrected clear-floor report contains the actual controlled result. The test now asserts that every required observation stage ran, preventing an early coroutine failure from appearing as a complete pass.

## Small navigation implementation

Root delegated `godot/scripts/rpg_navigation.gd`, the companion test and this document. Root retains sole ownership of `rpg_main.gd` integration. The bounded correction is a flat-world route service using actual collider rectangles, with cached helper paths and no position warps or arbitrary dropped route history. Initial implementation/testing was bounded to approximately ten minutes.

```gdscript
var navigation = preload("res://scripts/rpg_navigation.gd").new()
navigation.configure(world)                    # after current story gates apply
var route: Array[Vector3] = navigation.path(from, to)
navigation.segment_clear(from, to)
navigation.point_clear(to)
```

`configure` traverses current `StaticBody3D` children whose collision layer includes bit 1 and active `BoxShape3D` shapes. It transforms all box corners into global coordinates, ignores floors with top ≤0.05, and uses conservative XZ bounds. The actual bridge and vine gate disappear from the blocked set when their collider layer is disabled. A geometry signature avoids rebuilding when dialogue/material changes leave collision topology unchanged.

The grid has 12,091 cells at 0.32 m spacing, using cardinal A* followed by continuous segment smoothing. Grid clearance is 0.18 m; segment validation uses the actual helper capsule radius, 0.14 m. This distinction lets a helper recover outward from a legitimate contact 0.141 m from a wall while still giving intermediate grid destinations extra room. Unsafe/outside endpoints return an empty route. There is no nearest-point warp or route through a closed gate.

The actual stuck lantern position yields a short clear detour through approximately (1.52,0,6.0), (0.56,0,6.0), then the original target. Closed bridge/greenhouse paths are empty; opening them yields continuous paths. The return type is a typed `Array[Vector3]` and includes the requested destination.

Root integration proposal: cache `nav_path`, `nav_goal` and navigation generation on each companion. Recompute only when the next breadcrumb/idle goal changes materially, a gate generation changes, or the current segment becomes blocked. Advance breadcrumbs within 0.32 m. Advance a detour corner only when the following segment is clear from the actual body, so the arrival tolerance cannot cut a wall. Validate idle orbit goals and find a safe route; a free-looking orbit offset can lie on the far side of a prop. Do not discard blocked historical breadcrumbs merely because the queue grows. Continue to move every frame through `CharacterBody3D.move_and_slide()` and drive animation from actual travel.

## Actual navigation checks and remaining integration gate

`evidence/rpg/companions/navigation/report.json` passes **16/16**. It checks unchanged-layout caching, both closed gates, unsafe/outside endpoints, one rebuild on gate opening and four actual capsule routes: the measured lantern obstruction, home doorway, repaired bridge and opened greenhouse. Each existing helper body is placed at its case's explicit start, then moves only through `move_and_slide()` along the returned path. Final gaps are ≤0.055 m; maximum frame displacement is 0.0528 m, consistent with the fixture's speed and 60 Hz steps. These are isolated navigation geometry cases, not integrated four-helper behavior or animation approval.

Recorded headless grid builds were about **31.1 ms** with 79 active obstacle rectangles and **30.4 ms** with 77 after the gates open. These startup/change costs are real measured headless timings, not native frame performance. The root should avoid per-frame rebuilding, and later profile the integrated route on the intended hardware.

The integration acceptance remains open: all four actual companions must follow the player through the home, bridge and greenhouse, settle within 3 m after interruption, avoid solid overlaps, retain separate readable bodies and make the detours without teleporting. The existing full traversal in `godot/tests/rpg_companion_checks.gd` can be rerun on integrated source with a fresh QA directory. Native matched motion review and human feedback must then evaluate whether the corrected movement feels grounded, responsive and companionable.

No new environment, character or audio assets were produced by this movement task. The independent critic should see the integrated before/after motion before receiving the development team's interpretation.
