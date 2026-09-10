# Review provenance and reference packaging

The owner now requires fully 3D geometry, lighting and creatures with an immersive close camera. **Courtyard 0.3 is a historical 2D mechanics reference, not the eligible product milestone.** These tools protect build/evidence consistency; they do not certify the new 3D direction, player satisfaction or owner acceptance. No archives were compressed and no apps were launched during this provenance correction.

## Observed mismatch and corrections

On 2026-09-10, `evidence/REVIEW.html` still identified 0.2 and its old hash while its shared Play link opened the newer 0.3 HTML. The old review packager checked only the embedded game's hash and could have packaged that misleading combination. Its recursive evidence scan also included newly created native test profiles and caches. The old native archive script accepted its own potentially stale manifest and assigned `runtimeExecuted: true` to every Mac target without consulting execution evidence.

The corrected tools fail before compression when the standalone build, native manifest/payload, review identity, media provenance or linked native archive disagree. Review packaging excludes test profiles, dependency directories, raw recordings and caches; historical evidence is retained. Native packaging reports execution as unassessed by packaging. Files are written to temporary archives, validated, then renamed; an interrupted compression cannot replace the named archive with a partial ZIP.

## Commands and evidence contract

```sh
node tools/verify-current-review.mjs --builds-only
node tools/package-desktop.mjs --preflight
node tools/verify-current-review.mjs
python3 tools/package-review.py --preflight
```

The first two commands inspect bytes only. They validate the declared standalone HTML size/hash, matching native build identifiers, current desktop host source hashes, and embedded game/host/package versions for every listed target. They do not start Electron or imply Windows execution. The current native adapter is specific to the historical Electron packages; a future native 3D engine needs an adapter for its actual exported binaries and resources.

Full review validation additionally requires:

- A review title containing the declared build version, visible exact artifact hash/source revision, and a local Play link to that HTML.
- Every direct local link/resource to exist within the project; displayed resources must be local.
- A media manifest at `evidence/v<major>.<minor>/media-manifest.json`, or `--media-manifest <path>`. Its `build` must match the standalone manifest's version, hash and source revision. Every displayed image, video, audio source and poster needs a `files` entry containing its project-relative `path` and actual `sha256`.
- Historical comparison media explicitly marked `historical: true` with a provenance `note` in that manifest and `data-evidence="historical"` on each displaying HTML element. Current media can omit these fields. A changed image or recording requires a new hash. Hash registration records declared provenance; it does not prove which build produced the pixels.
- Linked native ZIPs to match the current native package manifest and its embedded-game identifier; full native verification also compares the recorded ASAR hash with the actual app bundle. Native ZIPs linked from the review are included in a portable review archive, so this can increase its size substantially.

`--review <path>` selects an alternate review; `--root <path>` supports isolated fixtures or an extracted reference package. `--no-native` skips installed Electron/ASAR inspection, useful for the portable HTML reference and for the review packager. It still checks linked native archive hashes/declared identities. None of these switches overrides stale review or media checks. The validator returns nonzero on failure and writes no evidence files by itself.

## Actual verification of this correction

- Syntax checks passed for both JavaScript tools and the Python packager.
- Build-only and native-package preflight passed for the frozen 0.3 reference: standalone SHA-256 `87462fc27f21240cd0f3f067332005a33a36711dcc81ac1b89836c6b2173e637`; both native targets embed that game. This is byte inspection, not fresh platform play.
- Full review validation and review-package preflight correctly failed: `Review title does not identify the current build version`. No new review/archive was produced.
- Four isolated parser/provenance fixtures passed: matching declarations accepted; stale title rejected; altered media rejected; unmarked historical/current media mismatch rejected. These were temporary synthetic files, not gameplay or media-decoding tests.

## Next actions

Root owns the 3D migration and current review page. Preserve 0.2/0.3 as clearly labeled historical references. After the next eligible 3D build and its critique/corrections, freeze that engine's exact export and record matching provenance using an engine-appropriate native adapter. Capture and inspect final gameplay, motion and affected audio; register the exact media hashes and conditions. Update the review's build identity and distinguish every historical comparison. Then run full provenance validation plus actual browser/media decoding and layout checks before packaging.

For a deliberately requested historical 2D reference archive, first align its review page/media manifest with its exact frozen reference build. Run both preflights; compression commands are `node tools/package-desktop.mjs` and `python3 tools/package-review.py` only after those checks pass. Existing `review-page-checks.mjs` writes hard-coded `evidence/v0.2` outputs and must not be used for new evidence without updating its destinations. Its old test results must not be relabeled as current. Human player and owner gates remain separate and pending.
