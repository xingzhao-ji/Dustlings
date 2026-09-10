# Apple app packaging experiment

The requested iPhone/iPad App Store direction now has a native project at [Dustlings.xcodeproj](../platforms/apple/Dustlings.xcodeproj). **This is a compile-checked packaging experiment, not an installable review release or App Store submission.** The courtyard remains awaiting human validation. No human player or owner accepted this Apple experience; no native app has been run.

The app bundles courtyard 0.2.0 byte-for-byte: web source `4384d82d61210269332cb8568ef89c7399425b86`, HTML SHA-256 `cb4b9d7bc6174a96bd203a22f9a8a5a766f3fa0eca10475e80c8e4d681f5feea`. Gameplay sources are unchanged. The packaged copy has its own manifest, and build commands refuse an unexpected hash.

## Bounded cycle: Apple packaging / 12 minutes

Player benefit: open an offline game as an iPhone/iPad app, retain progress between launches, pause on interruption, and keep existing save import/export reachable. Evidence: the owner's platform requirement and the existing integrated web build; no native-device observation yet. Smallest implementation: one UIKit/WKWebView host around the exact frozen HTML, with native safe-area constraints and download sharing. Acceptance: compile for the two Apple iOS targets, verify bundled identity, check the interruption script against real gameplay, and state remaining native checks explicitly.

Implemented behavior:

- Universal iPhone/iPad target, portrait and landscape, experimental minimum iOS16. This minimum is a build setting, not a verified compatibility promise.
- Persistent default WKWebsiteDataStore and a stable bundled HTML resource name. Actual save retention through app updates, force termination and reinstall scenarios needs native validation. Reinstallation may remove local progress.
- A native resign-active notification calls the existing Pause control only after onboarding and when no dialog is already open; it also sends the existing interruption checkpoint event. The app never automatically resumes.
- Entire web view constrained to native safe areas; existing canvas touch interactions and scrolling inside game dialogs are retained.
- File/blob-only navigation. Existing HTML file input uses WebKit's system picker; blob save downloads use WKDownload and a native share sheet. These native paths compile, but have **not** been exercised.
- The [shared provisional opaque 1024px icon](../platforms/shared/README.md), rasterized from the existing favicon geometry. `apple-build` copies this common source into the iOS asset catalog. It is build artwork, not owner-approved App Store artwork.
- A privacy manifest declares no tracking, collection, or app-authored required-reason API use. Store privacy answers and the final binary/dependency audit remain release work. No account, analytics, ads, purchases, remote content or permissions were added.

## Actual verification, 2026-09-10 UTC

Host: existing MacBook Pro environment, Xcode26.6 build17F113, Swift6.3.3, iPhoneOS26.5 and iPhoneSimulator26.5 SDKs. No physical iPhone/iPad or runnable simulator was verified. `simctl list devices available` and `list runtimes` produced no output and were canceled during the earlier bounded inventory.

| Check | Observed result |
| --- | --- |
| Xcode project/device build | **Blocked**, exit70 before source compilation. IDESimulatorFoundation cannot load a DVTDownloads symbol from `/Library/Developer/PrivateFrameworks`. |
| Xcode project/simulator build | **Blocked** by the same installed-framework mismatch. |
| Direct Swift compile and link: device | Passed, exit0, no compiler warnings. ARM64 Mach-O platform2, minimum iOS16.0, SDK26.5. |
| Direct Swift compile and link: simulator | Passed, exit0, no compiler warnings. ARM64 Mach-O platform7, minimum iOS16.0, SDK26.5. |
| Plist/project syntax | Info.plist, PrivacyInfo.xcprivacy and project.pbxproj pass `plutil -lint`. |
| Icon file | 1024×1024 PNG, no alpha. Native asset-catalog compilation remains blocked. |
| Exact interruption script against frozen HTML | 6/6 checks pass in Playwright WebKit on macOS: preserves onboarding; active pause/save; repeated settings; controlled completion-dialog fixture; reload recovery; save retention after relocating the identical HTML to a different absolute file path. This is browser automation, not WKWebView execution. |

Machine-readable results and failure logs: [device Xcode build](../evidence/platforms/apple-device-build.json), [simulator Xcode build](../evidence/platforms/apple-simulator-build.json), [device compiler result](../evidence/platforms/apple-device-compile.json), [simulator compiler result](../evidence/platforms/apple-simulator-compile.json), [interruption checks](../evidence/platforms/apple-lifecycle-checks.json).

The direct compiler fallback creates local inspection directories at `platforms/apple/DerivedData/CompileOnly-device/Dustlings.app` and `CompileOnly-simulator/Dustlings.app`. They contain native executables and frozen web resources. They lack the complete Xcode asset/archive/signing pipeline and are **not** a promised runnable distribution. No signing identity, provisioning profile or developer account was inspected. No system components were installed or repaired.

## Reproduce and resume

```sh
node tools/apple-lifecycle-checks.mjs
node tools/apple-compile.mjs device
node tools/apple-compile.mjs simulator
node tools/apple-build.mjs device
node tools/apple-build.mjs simulator
```

`apple-build` is bounded to three minutes and preserves its log/result even on failure. The project can be opened in Xcode on a healthy installation. The bundle identifier `local.dustlings.courtyard` is a local placeholder and no development team is selected. Distribution requires the owner's chosen identifier and an appropriate Apple account/signing configuration later.

**Exact next action:** resolve or use a healthy Xcode installation with matching developer frameworks, rerun both `apple-build` commands, then launch the simulator app. Do not change gameplay to work around the environment failure. Inspect normal-size portrait/landscape iPhone and iPad gameplay with 50 helpers, native safe areas, modal scrolling, native save export/import, interruption/audio suspension, process termination and return. Record simulator models/runtime and every observed defect. Then perform named physical-device touch, audio, thermal/performance and recovery sessions. Save native screenshots and a short native interaction recording; none exists yet. Player, presentation and owner gates all remain open.

## Focused host review / five-minute followup

File-origin stability: current primary WebKit source represents file origins without a path and retains the `file__0` database identifier for compatibility. The added WebKit browser check moved the exact HTML to a new absolute path and recovered its saved elapsed progress. These observations support retaining the existing file origin; they do not demonstrate survival of a signed iOS app update, WebKit eviction, or native container migration. No speculative origin migration was added. Source inspected2026-09-10: [WebKit SecurityOriginData.cpp](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/page/SecurityOriginData.cpp).

The host review found a concrete ordering weakness in the code: every completed export immediately presented a share sheet, even if the app had become inactive or another sheet was already being shown. The focused correction queues completed files, presents while active with no native modal, advances after sharing, and removes only Dustlings' abandoned export staging directory on a new launch. Ordinary canceled navigation also no longer reports a failed courtyard launch. This is a source-identified failure path, not an observed iPhone failure. Both direct target compiles pass after the correction. Native share cancellation, Files import cancellation, repeated exports and background completion remain required runtime checks; the queued-file behavior has not been claimed as native-tested.
