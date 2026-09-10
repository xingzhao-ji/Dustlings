# Dustlings working agreement

Governing objective: human players find the game beautiful, satisfying, understandable and worth playing. The user's vision defines requirements; intended-player evidence guides refinement. Assistant taste is a hypothesis, never market evidence.

- Preserve single-player incremental restoration: mess becomes living workforce. One village, courtyard → canal → clocktower garden, one coherent upgrade tree, finite ending. Do not produce more zones before the courtyard interaction, presentation, audio, interface and save recovery are integrated and reviewed. Do not expand scope without player evidence.
- Active checkpoint is a local Canvas 2D courtyard prototype, not a native platform release or human-accepted milestone. Read README.md and docs/DEVELOPMENT.md first when resuming.
- For a substantial change record benefit, evidence source, smallest implementation, bounded effort, and observable acceptance. Fix evidenced core problems before optional polish/content. Save a resumable checkpoint.
- Never invent playtests, enjoyment scores or demand. Human sessions currently zero; docs/PLAYTEST.md is the protocol. Separate unfamiliar incremental buyers, cozy/cleanup players, and friends/developers. Report exact n/N and reasons; 12–20 unfamiliar target players, ≥80% uncoached first upgrade and ≥half voluntary continuation are private decision rules.
- Inspect actual normal-size gameplay and motion, including 50 helpers. Maintain grounded creatures, reachable surfaces, clear assignments, legible controls and optical proportions. Quality assertions require human review.
- Figma is unavailable in this session. Actual game UI and docs/DESIGN.md are the inspectable fallback. Do not claim a Figma file exists.
- Audio is original procedural WebAudio. Numerical checks do not constitute listening. Preserve motif, restoration layers, headroom, rate limits, user volume settings, pause and gesture start.
- Desktop first; touch offset/zoom/pan are prototypes. Distinguish automated Mac-host execution, simulated viewport layout, physical-device play, and release readiness. Do not increase the tested 50-helper cap without evidence.
- Use `npm test` for relevant simulation/save changes, `node tools/browser-checks.mjs` for interaction changes, `npm run build` to regenerate the standalone artifact, and `node tools/review-build.mjs` for final offline build/performance checks. Browser scripts default to local macOS Chrome; override PLAYWRIGHT_EXECUTABLE_PATH elsewhere. `npm run qa` records the real-time opening and controlled pacing fixtures.
- At each milestone provide the playable build, actual before/after captures, a short interaction recording, relevant measured performance, human-review gaps and next task. Label fixtures/accelerated simulations explicitly. Do not claim a whole-game or benchmark-quality finish from technical tests.

Source ownership: src/game.js pure simulation; renderer.js artwork/camera; audio.js sound; main.js interaction/UI; storage.js recovery; style.css interface. Runtime has no external dependencies. Build and QA dependencies are development-only.
