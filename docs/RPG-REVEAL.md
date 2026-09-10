# Greenhouse handoff continuity

Status: **25/25 headless integration checks pass** on the frozen `neighborhood-art-motion` runtime. Native motion, audio audition and human reaction remain separate pending gates. No human testing was performed.

The benefit is a readable exchange involving the same companion: the player can finish reading, watch the companion approach, see the moth meet it, and keep the useful light without losing control or progress. The art-direction evidence was the earlier integrated sequence's helper shrinking/reappearing and an exchange that left the clear view. Root implemented the correction; this independent development QA pass owns only the test and evidence and does not supply the independent player critic's verdict.

## Method

`godot/tests/rpg_reveal_checks.gd` instantiates the actual neighborhood in Godot 4.7.2, headless at fixed 60Hz. Prerequisite story progress is prepared once. Player position is initialized to `(12,0,-11.5)` and the three existing companion starts to `(11.3/11.8/12.3,0,-11.1)`, age 3. Production dialogue choice, animation, collision movement, settings pause and filesystem saving run unchanged thereafter. This fixture does not prove that an unfamiliar player can reach or understand the discovery.

Source was copied from `builds/3d/rpg-capture-snapshots/neighborhood-art-motion` to `/tmp/dustlings-reveal-fixture`; only tests were added to that temporary copy. Main SHA256: `c6ce8bd5ca7be6536fb0a3ba4a1e1a733068f71c960676f68cce8c84c4ae69cd`. Runtime source remained unchanged during both checks. Fresh isolated saves leave the owner's play state untouched.

The first run passed 24/24. A final additional check verifies that the production choice has already saved the ability while the letter remains open, before any explicit later save. Final results and clean logs are in `evidence/rpg/reveal/final`; the first result remains in `evidence/rpg/reveal/first`.

## Observed results

- Holding the letter open for six simulated seconds keeps the existing first companion full-size and stationary. The fourth starts small and grows during dialogue, with no later full-size-to-dot restart.
- Closing the panel sends the same first body to the meeting in 53 sampled frames. Maximum observed travel between samples: 0.0576m. The test does not teleport the body during the sequence.
- The actual moth reaches the first companion's head target, measured minimum distance 0m; the receiving body's maximum position drift during contact is 0m. The contact cue event occurs and the helper's light remains after the sequence.
- Generated walking and camera-orbit input remain effective during approach. A two-second settings pause freezes player, companion, moth position and scene clock; resume continues the same phase and the sequence finishes.
- Memory and glow flags are on disk while reading. A fresh scene reload after completion reconstructs four companions and the retained useful light.

These are behavioral and transform observations. The sound event check is not listening approval; head coordinates do not establish a beautiful or emotionally convincing exchange.

## Companion regression

The existing four-companion traversal was rerun on this same frozen runtime: **28/28 pass**, clean log, `source_changed=false`. Evidence: `evidence/rpg/companions/art-motion`. The test prepares four-companion/open-gate progress once, then uses generated walking InputEvents over the real home doorway, repaired bridge, greenhouse and return routes. All four settle within 3m at every required rest stage and have no solid-body overlap. It is accelerated headless QA, not a native performance result or human route test.

## Exact next action

Inspect root's matching uninterrupted native greenhouse footage from letter reading through departure, including the same helper's approach, moth contact, held pose, light transfer and return. Audition the contact cue and neighboring music. The independent critic should receive the source-bound footage and method before developer interpretation. Then representative humans should verify that they understand what changed and value the discovery. Report actual player counts and reasons; none are available yet.
