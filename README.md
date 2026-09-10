# Dustlings

A standalone, real 3D incremental restoration game in Godot: brush dust into tiny helpers and bring a miniature courtyard back to life.

**Current milestone: 3D courtyard0.4.0-dev, awaiting human validation.** The courtyard is the only implemented zone. Canal and clocktower garden remain planned. No representative-player or owner acceptance has been recorded; this is a development build, not a Steam release.

[Open the current review hub](evidence/3d/REVIEW.html) for native build links, exact source and artifact hashes, actual before/after gameplay, recordings, measured performance and limitations. The hub refuses to identify stale packages as current. [Continue development](docs/CONTINUATION.md) from the saved exact next action.

## Play and develop

Packaged Windows builds need Dustlings.exe and the adjacent Dustlings.pck. Mac development builds are Universal2 ZIP archives with an ad-hoc signature; they are not notarized. Native Windows execution remains unverified. The packaged game has no browser or network dependency.

For local source work with the installed Godot4.7.2 editor:

```sh
.tools/Godot.app/Contents/MacOS/Godot --path godot
```

Hold and sweep to brush. B selects Brush; D then an open patch directs the crew; U opens discoveries. Scroll or +/− zooms. Right-drag frames the village; Home or Frame returns to the overview. N finds remaining dust; arrows aim, Space brushes, Enter directs. Escape opens pause/settings. Volume, gentle motion, tap sweeping and verified save copies are in Settings. Focus loss pauses; returning requires an explicit action.

Source and native packaging: [3D build notes](docs/3D-BUILD.md). Progress and limitations: [quality gates](docs/QUALITY-GATES.md), [prioritized gaps](docs/BACKLOG.md), [iteration evidence](docs/3D-CYCLES.md), [independent AI critique](docs/CRITIQUE-3D-0.4.md). Human research protocol: [PLAYTEST.md](docs/PLAYTEST.md). Figma is unavailable in this session; inspectable Godot UI is the design fallback.

Capture and test tools freeze source and distinguish generated input, controlled fixtures, headless checks, native execution and human observation. MovieMaker captures advance normal30fps engine time but may render faster than wall time. Performance runs use a separate60-second wall-clock interval without movie recording. Numerical audio checks do not establish listening or enjoyment.

The original Canvas/Electron source under src/ and platforms/ is preserved as a historical mechanics/reliability reference. Its browser artifacts and earlier0.2/0.3 results do not satisfy the current real3D game requirement. iPad and iPhone are later ports with separate usability/performance gates.
