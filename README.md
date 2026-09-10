# Dustlings

A little dust. A little life. A playable courtyard prototype for a single-player miniature restoration game.

**Play:** open [Dustlings Courtyard.html](builds/Dustlings%20Courtyard.html) in a modern browser. It works offline and requires no installation. The local development server is also available at [localhost:4173](http://localhost:4173) while running.

**Review:** [captures, recordings and evidence](evidence/REVIEW.html). [Development checkpoint](docs/DEVELOPMENT.md) explains completed work, limitations and the next task.

Hold and drag to brush. Dust becomes tiny helpers. Choose **Direct crew** (D), then click an open patch; **Brush** (B) returns to sweeping. Spend motes on three discoveries. Clear 75% and learn the chorus to ring the fountain bell. Helpers handle the final specks. Use +/− and the pan button to look closer; touch targets appear 42 CSS pixels above the finger. Escape opens pause/settings. Optional tap-to-sweep reduces holding.

Progress saves locally with a previous valid checkpoint as backup. Export/import a JSON save in Settings when moving browsers or copies. Settings also provide music, effects, ambience, reduced motion and reduced rendering resolution.

This checkpoint contains one courtyard, one creature design, three meaningful upgrades, 50-helper support, a coordinated fountain chorus and a finite courtyard ending. The planned canal and clocktower garden are not implemented. Human acceptance of the slice is pending.

Validated by automated Chrome execution on a MacBook Pro (M4 Pro, 48 GB), including offline launch, saves and a 60-second 50-helper sample. Windows, physical iPad/iPhone, Safari, manual trackpad comfort and native screen/audio review remain unverified. Responsive screenshots are simulated layouts.

Human playtests: **0**. Follow [the private-test protocol](docs/PLAYTEST.md) for 12–20 unfamiliar target players. Technical checks do not establish enjoyment, demand or benchmark quality.

## Development

```sh
npm install
npm start
npm test
npm run build
```

`npm run qa` records a normal-speed opening and controlled simulation fixtures. `node tools/browser-checks.mjs` checks interaction/recovery. `node tools/review-build.mjs` tests the exact standalone build and profiles 50 helpers. `node tools/audio-audition.mjs` renders the original audio sequence for inspection. Browser scripts accept `PLAYWRIGHT_EXECUTABLE_PATH` (the audio script requires it when Playwright's bundled browser is not installed).

Source: [game](src/game.js), [art](src/renderer.js), [sound](src/audio.js), [interface/input](src/main.js), [recovery](src/storage.js). The [design contract](docs/DESIGN.md) links the benchmark study and records original choices. All art/music is original code; no reference-game assets are bundled.
