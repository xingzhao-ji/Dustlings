# Godot distribution notices

2026-09-10. Packaging correction; no gameplay, PCK, interface or asset change. Human sessions remain zero and no release approval is implied.

The exact reviewed `960d96b` Mac ZIP contains seven app files; the Windows review ZIP contains the executable, PCK and instructions. Neither archive contains a user-readable license, copyright, notice or credits file. The [recorded archive inventories and hashes](../evidence/3d/notices/source-evidence.json) preserve this omission. Embedded engine strings were not counted as an accompanying attribution document.

Godot's official guidance permits an accompanying file for desktop distribution and recommends retaining its complete third-party copyright inventory. This supports a small `Notices/` folder beside the app or executable, with no interruption to the courtyard. [Official inclusion guidance](https://docs.godotengine.org/en/stable/about/complying_with_licenses.html)

## Verified source and content

An isolated headless probe queried the installed official **Godot 4.7.2**, commit `ed1daf0bf001b61586d9930840f2f1394092c079`. It did not launch Dustlings or a native window. The [raw engine API output](../evidence/3d/notices/engine-api.json), [script](../evidence/3d/notices/probe/extract.gd) and [log](../evidence/3d/notices/engine-api.log) are preserved. The API reports 102 component records and 20 license texts. `Engine.get_license_text()` is byte-identical to `LICENSE.txt` fetched from that exact upstream commit. These APIs expose the engine and component license data directly. [Official Engine API](https://docs.godotengine.org/en/stable/classes/class_engine.html)

The bundle contains four files:

| File | Contents |
| --- | --- |
| `GODOT_LICENSE.txt` | Exact upstream engine copyright, MIT permission and disclaimer text. |
| `GODOT_COPYRIGHT.txt` | Exact complete upstream component copyright statements and license texts. This intentionally includes records for editor-only and other-platform components, rather than claiming every listed component runs in Dustlings. |
| `THIRD-PARTY-NOTICES.txt` | Plain introduction, default font and FreeType acknowledgment, pinned engine/component source locations, and clarification that these terms do not license Dustlings itself. |
| `notice-manifest.json` | Game source revision/hash, exact engine/editor/template identity, upstream provenance and hashes of the three text files. |

The pinned upstream inventory includes Open Sans under OFL-1.1, FreeType under FTL, HarfBuzz, Mbed TLS and the other engine components. The actual fallback font reports **Open Sans SemiBold**; the courtyard source inventory contains no separate font files or custom font resource override. The source availability note points to the exact engine commit and its MPL-2.0 CA certificate source, with the full MPL terms retained in the copyright file. [Pinned copyright and license inventory](https://github.com/godotengine/godot/blob/ed1daf0bf001b61586d9930840f2f1394092c079/COPYRIGHT.txt), [component source versions](https://github.com/godotengine/godot/blob/ed1daf0bf001b61586d9930840f2f1394092c079/thirdparty/README.md)

The scan did not establish a separate third-party asset license requirement for Dustlings' authored geometry, shaders, generated audio or original icon. It also cannot establish legal ownership of those assets. No game license, copyright owner, transfer of rights or monetization terms were invented. Additional downloaded assets, fonts, plugins or a changed engine require an updated attribution audit. Browser/Electron development dependencies are outside these native Godot packages.

## Packaging contract

The offline [notice helper](../tools/godot-notices.mjs) refuses a different editor version, editor hash or either selected export-template hash. It validates the preserved API and pinned upstream bytes before writing. It requires an exact game source revision and hash, refuses a different existing bundle, and leaves identical output untouched.

```javascript
import {writeGodotNotices, verifyNoticeArchive} from './godot-notices.mjs';
manifest.notices = await writeGodotNotices({
  output: path.join(out, 'Notices'),
  source: manifest.source,
  toolchain: manifest.toolchain
});
// Add the four declared files to the new archive before its final hash.
await verifyNoticeArchive({archive: macZip, bundle: manifest.notices});
```

The outer `manifest.notices` is `{schema:1, engineHash, sourceProvenance, files}`. `engineHash` is the full upstream engine commit. `sourceProvenance` binds the game revision/hash and engine version/editor hash. Each `files` key is a build-root-relative path beginning `Notices/`, with `bytes` and `sha256`.

For Mac, append the folder outside `Dustlings 3D.app` before calculating the final ZIP hash. The signed app and PCK stay byte-identical; verify the extracted app signature as usual. For Windows, include the same four files in the portable ZIP after the existing executable, PCK and README, with `entry.source` pointing to the build-root-relative file. The Windows companion, archive verifier and review hub must compare their bytes to the base manifest. Preserve historical packages without notices under their existing hashes.

The notice manifest itself uses `kind: dustlings-godot-notice-bundle`, `version:1`, `source:{revision,sha256}`, `engine:{version,revision,editorSha256,templates}`, `upstream`, and three text-file records keyed by basename. It does not include its own hash; the enclosing build manifest binds all four files.

## Actual checks and next action

[Ten focused checks passed](../evidence/3d/notices/checks.json). Staged copies of both real `960d96b` archives received the four files, and every original decompressed archive entry remained identical. The verifier read and hashed the actual new entries. The original archives' SHA-256 values remained unchanged. The tests also rejected missing notices, incorrect notice bytes, a different engine identity, unknown game identity and mixed output; an identical rerun preserved modification time. These staged copies are proof, not replacement downloads. [Reproducible check driver](../evidence/3d/notices/checks.mjs)

The lead's new export `0.4.0-dev-2026-09-10T10-59-12-915Z-ee3a43ae3d` passes the four-file Mac archive check and the extracted app's ad-hoc signature check. Its [exact manifest](../builds/3d/0.4.0-dev-2026-09-10T10-59-12-915Z-ee3a43ae3d/manifest.json) binds the notices to source `ee3a43ae3dcf50364bcdb3914c730f2cc459ebeb18559b39f376e3a3996ef920`. The Windows specialist's [preserved companion](../evidence/3d/windows-review-notices/current-companion.json) records seven actual ZIP entries, four of them notices, with CRC and decompressed-byte checks passed. The Windows ZIP remains unrun. Its SHA-256 is `d7733b1a2f3b09ed67c94abe2e659257f109c8b71aebdf8cf4a7ad858bdbc80b`. Historical three-entry package support remains intact; those older downloads still lack the new notices.

The [new packaged Mac run](../evidence/3d/native-packaged/recovery-a8430be/report.json) separately passed 45 recovery/artifact checks with its exact PCK and executable. The final review hub must verify all four notice bytes in both distributions and show the new archive identities. This delivery evidence does not expand the ownership conclusions or certify unrelated legal/store requirements.

For a future iOS build, recipient access to the notices needs its own delivery check; a desktop folder is not evidence that an App Store package exposes them. This task does not establish Windows execution, store approval, human enjoyment or owner acceptance.
