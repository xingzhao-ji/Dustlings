# Current RPG packages — 2026-09-14

Build `builds/3d/0.5.1-rpg-dev-2026-09-14T02-20-51-771Z-8196bad7d8/manifest.json` is an unchanged clean runtime export from 5e07248. Actual Mac fresh/resume/corrupt-primary-plus-backup processes pass **95/95** with clean logs: [report](../evidence/rpg/package-save-fixed-20260914/report.json). The earlier78/79 failure revealed repeated errors from static JSON parsing; instance parsing now handles expected damaged generations while preserving original bytes. RPG44 and legacy16 save checks pass. Both platform PCKs contain 22 verified scripts/shaders with required notices; Windows ZIP CRC/extracted bytes pass. Windows has not run on Windows hardware.

Mac ZIP SHA256 `3f877e707e00fefcef7b86ca81f41e2b6e45505793d4a3b3b595dd9a9cfd471b`. Universal2, ad-hoc signed, unnotarized. `Play Dustlings.command` verifies this exact archive and extracts to local Application Support, avoiding Desktop FileProvider metadata. `builds/3d/current-rpg.json` selects it explicitly; no latest-by-date guess.

The offline Steam staging directory is `/Users/xingzhaoji/Library/Application Support/Dustlings/SteamStaging/0.5.1-20260914`. Its 17 file hashes, Mac signature and Windows runtime match the package. VDF templates keep Preview1 and SetLive empty. Supply real application/depot IDs only when the account exists; the tool performs no upload. Stage outside Desktop because the native FileProvider attaches metadata to app directories there. [SteamPipe](https://partner.steamgames.com/doc/sdk/uploading).

[Final store kit](../evidence/rpg/store-kit-release-20260914/README.md): seven genuine 1920×1080 gameplay stills, four title-only capsule drafts, icon and 22.6-second original-audio gameplay preview. The movie capture predates the save-parser-only correction and final profiling-driver edits; capture manifests preserve the exact source. [Store copy and scope](STORE-COPY-2026-09-14.md).

Open gates: human presentation/audio review and playtests, owner acceptance, Windows execution, signing/notarization, account IDs and store/build review. The commercial scope is a neighborhood preview; full campaign and profitability remain unproven. The original runner specification below is historical where it says execution is pending.

---

# RPG package smoke and recovery verification

Status: runner prepared; **current RPG package execution is pending**. No current package, physical input, human acceptance or Windows runtime result is implied by preparation.

The preserved courtyard process checker has incompatible QA cases and save fields. The smallest useful correction is a separate `tools/rpg-package-check.mjs`, leaving historical tools/evidence intact. Benefit: people review the actual standalone RPG export, and copied campaign progress returns through its shipped code. Evidence: the new RPG entrypoint and save schema require their own native process checks. Preparation budget: approximately eight minutes.

## Exact invocation after the lead releases the native slot

```sh
node tools/rpg-package-check.mjs --build=/absolute/current/manifest.json --save=/absolute/current-route/isolated-save.json --output=/absolute/new/evidence-directory
```

`--build` and an entirely new `--output` are mandatory. `--save` is optional; without it the second process resumes the new opening save, and the report explicitly makes no completed-story recovery claim. `--preflight-only` verifies packaging without launching gameplay. The tool never selects a latest build implicitly, never opens the editor project for gameplay, and never uses the ordinary player profile.

The lead must supply the new immutable manifest and wait until captures/profiles have released the native slot. Do not run this concurrently with a performance measurement. No native process has been launched by this specialist while preparing the tool.

## What the runner verifies

- Manifest identifies a complete, unchanged export with clean runtime source; its complete source-inventory hash is recomputed.
- RPG scripts and entrypoint exist in the frozen snapshot; every runtime script, shader, scene and project-file hash is checked. Both platform source-pack proofs must report the exact expected script/shader count and zero failures.
- Exact Mac ZIP bytes match; an independent temporary extraction contains one app. Every manifest-listed bundle file, executable, PCK, plist identity and development signature is checked, together with the four accompanying notice files.
- Actual Windows EXE/PCK bytes match. If the separate Windows ZIP companion exists, its manifest binding and archive bytes are checked. **Windows is never executed by this runner.**
- Three separate native Mac processes use the shipped `rpg_qa` driver at 1280×800, with actual stdout/stderr, process identity, exit status, diagnostics, screenshots and JSON results preserved: fresh overview; copied-save resume; controlled corrupt-primary plus valid-backup recovery.
- Save comparisons include every game/story, settings and dust-patch field. Disk and actual scene positions allow at most 3.5cm of grounded physics settling, since the resume route sends no walking inputs.
- Recovery must preserve the corrupt primary bytes under an unreadable-save filename before committing recovered progress. The external input save, executable, PCK, build manifest and Mac archive must remain unchanged.
- All test saves are confined to each new evidence subdirectory. A 90-second per-process timeout terminates the owned process and records failure. The report survives a handled process failure.

The runner records an existing capture manifest beside the optional input save when available, including whether its runtime files match this build. A compatible save from an older source is still a copied fixture; it does not become evidence of a fresh full campaign run on the new package.

## Verification of the prepared runner

`node --check tools/rpg-package-check.mjs` passes. A controlled `--preflight-only` invocation against the older courtyard-only manifest correctly rejected `rpgSourcesPresent` before extraction or launch: four preceding checks passed, the expected fifth check rejected it, **zero gameplay processes**. Diagnostic report preserved at `/tmp/dustlings-rpg-package-legacy-rejection-01/report.json` for this session. Successful RPG export/run checks remain pending and must not be reported as passed until actual execution.

## Packaging copy still required

At preparation time, `tools/package-windows-review.mjs` still embeds courtyard controls, upgrades and earlier zone scope in README.txt. The lead must make this helper RPG-aware before producing the Windows review ZIP. Expected RPG instructions: WASD walking, right-drag camera, E interaction, Space brushing, J journal, Escape settings/pause, appropriate camera controls and a clear development-build limitation. Do not overwrite or retroactively modify historical ZIPs/manifests.

## Limits

QA bypasses the ordinary single-instance lock, so this does not test lock enforcement or a second ordinary window. Generated inputs do not establish physical mouse/trackpad/controller usability, audio audition, human attachment, surprise or enjoyment. These short runs are not sustained performance measurements. Ad-hoc Mac verification is not notarization or Steam release approval. All player, owner and commercial-readiness gates remain open.
