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
