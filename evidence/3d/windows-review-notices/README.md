# Windows review ZIP with build-specific notices

2026-09-10. Bounded packaging correction only; no game/runtime edits, Windows execution, publication or human acceptance claim.

The packager preserves the historical three-entry format when a build manifest has no `notices` property. When that property exists, it requires schema 1 and the four exact build-root files:

- `Notices/GODOT_LICENSE.txt`
- `Notices/GODOT_COPYRIGHT.txt`
- `Notices/THIRD-PARTY-NOTICES.txt`
- `Notices/notice-manifest.json`

These appear at the same `Notices/...` paths inside the ZIP, after `Dustlings.exe`, `Dustlings.pck` and `README.txt`. Companion `entry.source` paths for notices are relative to the build root, never `Windows/`. Companion version remains 1; notice-bearing packages add `verification.noticeFiles: 4`.

Validation checks actual regular-file bytes/hashes; outer and internal source revision/hash; full engine revision and its version suffix; editor hash; both export-template records; upstream records; and the internal hashes for all three text files. Actual ZIP contents are CRC-checked, extracted and hashed; the shared `verifyNoticeArchive` also verifies decompressed notice bytes. Missing, changed, misplaced or contradictory notices fail before publication. Frozen manifests are never rewritten, and existing different archive/companion bytes are refused.

## Controlled fixture evidence

`checks.py` passed **30/30** checks. It used the exact historical `056dc75f00` EXE/PCK in unique temporary directories, generated real notices through the shared audited helper, and added that returned notice record to a **temporary fixture manifest**. This is not a claim that the historical published manifest contained notices or that these fixtures are a new release.

The cases include independent seven-entry/CRC/extracted-byte checks, build-root source paths, idempotent rerun, wrong source revision/hash, wrong editor/version/engine revision, absent/changed/null/incomplete notices, internally contradictory source/text/template identities despite a refreshed outer file hash, and notices incorrectly placed under `Windows/`. Rejected fixtures leave no archive/companion. The historical archive rebuilt in a new temporary folder is byte-identical; all five original manifest/EXE/PCK/ZIP/companion hashes **and modification times** remain unchanged.

`results.json` records each actual outcome. `fixture-manifest.json`, `fixture-companion.json` and `fixture-notice-manifest.json` preserve the exact temporary identity used; logs preserve all expected failures. The temporary ZIP itself is removed with its test directory. No archive was written into an existing frozen package.

The fixture process overlapped the beginning of the lead's first performance sample. That overlap was immediately reported; the lead preserves the sample as non-isolated and performs a separate quiet sample. No packaging performance result or quiet-runtime claim is made here.

## Fresh build packaging

After the lead released the quiet profile, the actual build was packaged and `--verify-only` passed:

- Build: `builds/3d/0.4.0-dev-2026-09-10T10-59-12-915Z-ee3a43ae3d/manifest.json`
- Source SHA-256: `ee3a43ae3dcf50364bcdb3914c730f2cc459ebeb18559b39f376e3a3996ef920`
- Original manifest SHA-256: `7c54caa2772dc45ddc09f2749ad7692c68b14bf6bed5c242cf4b0caed2141ba0`
- Archive: `Windows/Dustlings-Windows.zip`, **39,636,125 bytes**
- Archive SHA-256: `d7733b1a2f3b09ed67c94abe2e659257f109c8b71aebdf8cf4a7ad858bdbc80b`
- Companion: `windows-review-package.json` in that same build root; copy preserved as `current-companion.json`.

Independent actual-build verification passes **17/17** checks: original manifest, EXE, PCK and all four notice files retain their hashes, sizes and modification times; companion identity is exact; the ZIP has exactly seven entries and valid CRC; every decompressed entry matches its recorded bytes/hash. See `current-results.json`, `current-original.json`, `current-package.log` and `current-verify.log`. This is distinct from the 30 controlled fixture checks and does not establish Windows execution or legal/release approval. The store/review agent received the exact companion path for independent hub verification.
