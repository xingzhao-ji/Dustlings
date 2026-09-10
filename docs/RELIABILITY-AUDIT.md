# Courtyard reliability audit

2026-09-09, bounded follow-up cycle: investigate saved progress, crew reachability, import/restart, and interruption reliability. Intended benefit is preserving the player's restoration and removing stranded cleanup. Evidence is source inspection, deterministic simulations, isolated headless Chrome interaction, and read-only local capability queries. This is not a human playtest, aesthetic review, native audio audition, or performance sample.

## Three independent acceptance gates

The courtyard is **awaiting human validation**. None of these gates has passed; passing reliability tests cannot close them. [BACKLOG.md](BACKLOG.md) is the current acceptance ledger.

| Gate | Current status | Evidence still required |
| --- | --- | --- |
| Player experience | **Not passed** — zero unfamiliar target-player sessions | Current-build observations of causality, directing, upgrade comprehension, fatigue, restoration, and voluntary continuation. Apply the 12–20-player protocol with exact segment counts and reasons. |
| Presentation quality | **Not passed** — no current-experience human visual/audio acceptance | Human review of actual gameplay at normal size and speed, repeated/crowded audio, readability, miniature scale, and restoration payoff. Agent inspection and numerical checks do not substitute. |
| Owner acceptance | **Not passed** — no explicit acceptance of the current experience recorded | Owner reviews the concrete playable checkpoint and states their assessment of completeness, vision, quality, and readiness. Silence and technical success are not approval. |

## Reproduced defects and focused corrections

| Issue | Before: exact reproduction | Correction / ownership | Acceptance evidence |
| --- | --- | --- | --- |
| Near-fountain work could be unreachable | From `(500,630)`, move toward each real dust site's work target `(dust.x,dust.y+7)` for 1,500 steps at 0.05 seconds. IDs 112, 113, 138, 160, 200 never entered the 17-unit work radius. Node 113 finished 54.09 units away. The short look-ahead tangent steered away repeatedly when the work offset lay near/inside its avoidance radius. | `src/game.js`: project near-rim work offsets to safe approach points, test the whole route segment, and use short circle waypoints. Preserve distance to the actual dust target for work. API unchanged; crew cap remains 50. | All **5,592 routes** passed: 466 real sites × three work offsets (−7, 0, +7) × four distant starting points. Minimum center distance from fountain: **96.00084 units** (fountain radius 83); longest arrival to work radius: **18.35 simulated seconds**. |
| Impossible fountain state accepted from JSON-valid saves | A fresh save with zero cleaned dust and no upgrades accepted `restoration: 1`. A save with only 122/466 dust cleaned accepted an active chorus when upgrades were present. | `src/game.js`: any restoration progress or active chorus requires chorus upgrade and at least 75% cleanup. Reject an active already-finished chorus and malformed progress/ritual types. Invalid assignment coordinates normalize to no assignment. | Seven impossible fountain/chorus cases reject explicitly; valid live chorus, fully completed save, and restored landmark with cleanup remaining still load. Semantic primary corruption falls back to the previous valid backup. |
| Stale tab could erase both checkpoints | Two `SaveStore` instances load the same state. First saves 50 cleaned; second saves stale zero progress twice. Before correction, both primary and backup then contained zero cleaned. | Root owns `src/storage.js` / `src/main.js`: revision comparison, serialized writers, visible conflict handling. | The deterministic two-session regression now preserves at least the newer 50 cleaned progress. Browser multi-tab handling remains part of root's integrated validation; this memory-storage test alone does not prove cross-process locking. |
| Background completion audio stayed running | Open the completion dialog, which pauses simulation; then dispatch a synthetic hidden visibility event. Audio remained `paused:false` because the handler only paused it when simulation was previously running. | Root changed visibility handling to pause audio whenever hidden, independently of the simulation's paused state. | The completion-background regression now passes in the integrated browser suite. No source change made by this audit owner outside `src/game.js`. |

These were reported to root before their respective fixes. The additional restart assertion initially read state before the new asynchronous save lock settled; it was corrected to await the completed restart. That test timing race is not recorded as a product defect.

## Additional checks

- Every real edge dust site accepts a manual brush at its own coordinates and loses dust.
- All 50 helpers gather from four widely separated corners into their actual chorus targets. Every helper is within six units by **12.50 simulated seconds**; the landmark finishes at **43.00 simulated seconds**. This verifies arrival, not the human readability of gathering.
- Invalid JSON, impossible JSON-valid fountain data, and an over-size import preserve current dust, upgrades, restoration, and helper count.
- Restart cancel retains progress; explicit confirm is checked after its asynchronous save operation settles.
- Settings pause freezes simulation and suspends the AudioContext; explicit resume returns it to running.
- A synthetic `document.hidden` event stops input, freezes simulation, suspends audio, and leaves resume explicit. This is application-event coverage, not actual OS app switching or native browser lifecycle validation.
- Final root execution of `node --test newtests/*.test.mjs`: **13/13 passing** — eight deterministic and five browser checks, including completion-background audio. Root's original/additional source suite also passed **24/24** (17 original, four keyboard, three save-conflict). These are technical passes; all three human acceptance gates remain open.

## Reproduction commands and scope

```sh
npm test
node --test newtests/navigation-audit.test.mjs newtests/save-audit.test.mjs
node --test newtests/lifecycle-audit.test.mjs
```

The lifecycle suite serves the current workspace on a temporary loopback port and launches an isolated headless installed Google Chrome at 1440 × 900, DPR 1. `DUSTLINGS_CHROME` can select another browser executable. Browser checks use fresh private contexts and leave normal browser saves untouched. Their synthetic fixtures and timings must not enter human pacing or market reports. The new suites are deliberately separate from the existing `npm test` glob; root may include them in the final required-check command.

## Local Windows test capability

Read-only commands found `prlctl`, `VBoxManage`, and both x86_64/aarch64 QEMU executables. Installed application names include Parallels Desktop, VirtualBox, UTM, and Windows App. This establishes installed tooling, not a working Windows test environment.

- `prlctl list -a` failed with exit 6: Parallels could not initialize in unattended mode. Its suggested initialization was **not** run.
- `VBoxManage list vms` returned one **inaccessible** registered VM. It was not started or repaired.
- UTM's bundled `utmctl list` returned one **stopped** VM named “Virtual Machine.” Read-only configuration identifies x86_64/q35, eight configured CPUs, and 5,723 MB memory. Generic disk names do not identify its guest OS. No Windows installation was verified.
- No VM was booted, no remote account connected, and no Windows gameplay test performed. A working Windows environment remains unverified; installed CLI presence must not be reported as platform validation.

## Remaining limits and handoff

Root owns final integrated browser results, simultaneous-tab UI checks, capture/recording, and performance sampling. Navigation now passes exhaustive reachability constraints; its perceived smoothness still needs actual normal-speed review. Save validation intentionally rejects logically impossible restoration states rather than silently presenting unearned landmark progress. Existing valid courtyard saves retain their version and API. Human comfort, beauty, and native device/audio behavior remain outside this audit's evidence.

Navigation/save-validation source SHA-256 at this checkpoint: `c31dab971d23839fa019b8dd7f3d7c7a7caa5a50dd3ed578c1c327f346829335` (`src/game.js`). Root has completed the integrated original/new suites. Next concrete check: root's normal-speed gameplay capture and performance review, followed by current-build human review recorded against the three independent gates.
