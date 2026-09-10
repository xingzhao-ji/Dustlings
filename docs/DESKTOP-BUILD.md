# Desktop app checkpoint

Steam is the intended Windows/Mac storefront. These are **local development apps**, not Steam submissions or a release-ready game. Courtyard0.2 remains awaiting human validation; all three human gates are open.

- [Mac Apple-silicon development ZIP](../builds/Dustlings-Courtyard-0.2.0-darwin-arm64-Development.zip): extract and open Dustlings.app. Actual packaged execution was automated on MacBook Pro Mac16,7, M4 Pro48GB, macOS26.6.2. Distribution signing/notarization and clean-machine Gatekeeper behavior remain unverified.
- [Windows x64 development ZIP](../builds/Dustlings-Courtyard-0.2.0-win32-x64-Development.zip): extract the entire folder; Dustlings.exe depends on its sibling runtime files. **Packaged but not run on Windows.**
- [Native captures and recording](../evidence/platforms/REVIEW.html). These show the packaged Mac renderer; they are not human playtests.

Both packages embed the unchanged frozen HTML SHA-256 `cb4b9d7bc6174a96bd203a22f9a8a5a766f3fa0eca10475e80c8e4d681f5feea`. Runtime Electron44.3.0, packager20.3.0. Wrapper and archive hashes are recorded in [desktop-package-manifest.json](../builds/desktop-package-manifest.json). The shared original favicon-derived icon is provisional. No Steam SDK, account, analytics, purchase, cloud-save or controller feature was added.

## Player benefit and bounded correction

The owner's storefront requirement supplies the evidence for an offline app that retains progress across closing and returning. The smallest implementation hosts the existing courtyard with a persistent stable `dustlings://courtyard` origin, sandbox, native save destination, pause on interruption and one application instance per profile. Native game saves are separate from browser saves; use Pause → Export save / Import save to move them.

Source review found repeated close/quit requests could bypass a pending save, a failed write could still close the app, and launching a second process after closing the Mac window could leave no window. The focused correction intercepts every pending close/quit, retains the window on a failed save with export guidance, and reopens the existing process. Download handling registers once.

## Actual verification

[Eight launch/interaction checks](../evidence/platforms/desktop-checks.json) and [five recovery checks](../evidence/platforms/desktop-recovery-checks.json) pass against the final packaged wrapper, with zero page exceptions:

- Actual normal-speed mouse input creates a helper at8.87s; save/relaunch retains current dust and crew.
- Injected native suspend pauses simulation/WebAudio. This is an injected event, not physical lid sleep.
- JSON file import, complete matching JSON export, and completed-courtyard quit/relaunch pass. Export destination is provided by automation; native Save dialog usability is not tested.
- Repeated close and repeated quit wait for a deliberately held save lock. Injected storage failure leaves the game open with backup guidance. Second-process reopening retains brushed progress and one download listener.
- A reachable local HTTP probe receives zero requests from the app; the sandboxed page has no Node access. Normal launch does not expose QA hooks.

The first non-isolated native sample retained one200ms frame pause. One focused60s rerun, recording **all7,200 intervals**, measured mean8.33ms, p959.2ms, p999.3ms and worst9.4ms, with zero>33.4ms intervals or long tasks. No focus/visibility event occurred. This uses a50-helper simulation fixture on the host's120Hz display, DPR2, normal rendering and audio, with no capture during the sample. The team avoided other builds, but OS activity was not controlled. The earlier outlier did not recur; its cause remains unknown. [Raw focused sample](../evidence/platforms/desktop-profile.json), [initial result](../evidence/platforms/desktop-checks-initial.json). The focused sample precedes only the close/save guard correction; the embedded game is identical.

Inspected actual dirty, first-helper and restored native renderer images: framing, ground contact and control layout match the frozen courtyard. Native opening recording12.33s contains the actual game audio. No native/human listening or aesthetic approval is claimed. The owner's new UI direction opens a separate refinement cycle; these packages preserve the pre-refinement experience for comparison.

## Reproduce

```sh
npm install --prefix platforms/desktop --no-audit --no-fund
node tools/build-native-icon.mjs
node tools/build-desktop.mjs
node tools/desktop-checks.mjs
node tools/desktop-recovery-checks.mjs
node tools/desktop-profile.mjs
node tools/package-desktop.mjs
```

Tests use fresh temporary profiles under ignored evidence/platforms/profiles. Packaging checks embedded HTML/main hashes and preserves native application files in ZIPs. App-store signing, Steam installation/update, actual Windows execution, Mac physical mouse/trackpad and listening, and current-build human review remain unfinished release work. See [STOREFRONTS.md](STOREFRONTS.md) and [APPLE-BUILD.md](APPLE-BUILD.md).
