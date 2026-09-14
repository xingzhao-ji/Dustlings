# Dustlings

A local 3D cozy RPG: explore Bellwether, meet four residents, make a small home, and restore forgotten places with dust companions. The current release candidate contains one neighborhood. The full campaign remains unfinished.

**Play on this Mac:** double-click `Play Dustlings.command`. It verifies the selected archive and prepares the app in local Application Support. No AWS credentials, LLM subscription or network service is required.

[Open the review hub](evidence/rpg/REVIEW.html) for Mac/Windows downloads, actual gameplay, screenshots, checks and remaining release gates. Version **0.5.1-rpg-dev** has 95 passing checks on the actual Mac package, including fresh start, resume and damaged-save recovery. Windows exports and archive checks pass; Windows execution is still unverified. Mac is ad-hoc signed and unnotarized.

WASD/arrows walk; right-drag turns the camera; scroll zooms. Comma/period orbit; Q returns forward. E talks or inspects. Hold Space near dust to brush. J opens the journal; Escape leaves dialogue or opens settings. Separate sound levels, gentle motion, camera sensitivity, graphics quality and verified save copies are available. RPG progress uses its own namespace and preserves the historical courtyard profile.

The improved gathering brings all four neighbors to tea, with reachable conversations, bread and hand-attached sipping. Residents recover blocked initial routes; camera movement stays consistent across window sizes. [Changes and evidence](docs/IMPROVEMENTS-2026-09-14.md).

[Release preparation](docs/RPG-PACKAGING.md) includes versioned exports, offline Steam depot templates, seven 1920×1080 gameplay screenshots, four correctly sized capsule drafts, an original icon and a 22.6-second gameplay preview. Human playtests:0. Presentation, sound comfort, owner acceptance, Windows hardware and demand remain open; these are review materials, not evidence of commercial success.

Develop from source with `.tools/Godot.app/Contents/MacOS/Godot --path godot`. Run isolated suites with `node tools/check-rpg.mjs`. [Continuation](docs/CONTINUATION.md), [quality gates](docs/RPG-QUALITY-GATES.md), [playtest protocol](docs/RPG-PLAYTEST.md), [store copy](docs/STORE-COPY-2026-09-14.md), [performance](docs/PERFORMANCE.md).
