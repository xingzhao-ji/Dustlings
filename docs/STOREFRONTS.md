# Storefront preparation

Checked 2026-09-09 Pacific. Latest priority: **Steam for Windows first, Mac testing throughout; iPhone/iPad App Store as later ports**. A separate Mac App Store release remains an optional preference awaiting the owner's response. Storefront preparation does not expand the approved one-village scope or authorize publication.

The courtyard 0.2 milestone remains **awaiting human validation**. Human sessions: **0**; unfamiliar incremental buyers 0, unfamiliar cozy/cleanup players 0, friends/developers 0. No release approval or current-build owner acceptance has been recorded. Packaging success cannot pass those gates.

## Current bounded task

Player benefit: launch Dustlings as an app and reliably return to the courtyard after closing or suspending it. Evidence: the owner's storefront instruction and existing offline game/save requirements; there is no native-player feedback yet. Smallest implementation: package the unchanged, frozen courtyard in a desktop host and a universal iPhone/iPad host, preserving its original interaction and art. One initial implementation/check pass per host; fix demonstrated packaging failures before adding platform features.

Acceptance checks: record the embedded game hash, compile/package outputs, actual launch result where runnable, offline behavior, pause/audio interruption, save/return, and import/export. Inspect real app captures at normal viewing size. Label unsigned builds, unrun binaries, simulator results and physical-device results separately. A successful compiler exit establishes compilation only. Platform build notes and evidence must carry the actual results; this document does not presume them.

## Technical preparation, in order

| Target | Preparation and observable checks | Release evidence still needed |
| --- | --- | --- |
| Steam: Windows | Package a Windows executable; verify clean install/launch, correct display scaling, mouse/keyboard behavior, audio, saving, quit/relaunch and 50-helper performance on a named Windows machine. | Actual Windows execution and human play; measured minimum requirements; Steam installation/update and save persistence checks. |
| Steam: Mac | Package a macOS app; verify launch, resizing, trackpad/keyboard, audio, pause/sleep, saving, quit/relaunch and 50-helper performance. Record architecture and OS. | Human MacBook play; tested support for each advertised architecture; distribution signing/notarization and clean-machine installation review. |
| App Store: iPhone/iPad | Build a universal app with current required SDKs; retain local saves; inspect safe areas, rotation, touch offset, legible controls, import/export and interruption recovery. | Physical named iPhone and iPad tests, finger comfort, audio interruptions, sustained performance/thermal behavior, signed installation and update recovery. Simulator or browser layout checks cannot replace these. |

Do not add achievements, cloud saves, purchases or controller support merely because a store supports them. Any added feature needs its own player benefit, smallest implementation and acceptance check. Store descriptions must advertise only verified support. Figma remains unavailable; real app UI captures and [DESIGN.md](DESIGN.md) are the inspectable fallback.

## Store requirements and owner-controlled steps

**Steam.** Steamworks onboarding involves legal paperwork, identity verification, bank/tax information and a USD 100 fee per product. Valve lists a 30-day delay after paying the app fee for the first few titles and a public Coming Soon page for at least two weeks. Store page/build review precedes release; those waiting periods are scheduling constraints, not a promised launch date. No enrollment, fee payment or public page was performed during this preparation. [Steam Direct](https://partner.steamgames.com/steamdirect/)

Prepare store copy, actual gameplay screenshots/trailer, supported OS requirements and build/depot configuration locally. Submit the store presence and build for their separate reviews only when the owner has approved the concrete materials and submission. Keep pricing and release date undecided until owner direction; no business model has been selected. [Steam release process](https://partner.steamgames.com/doc/store/releasing)

**Apple SDK timing.** Apple's dated February 3, 2026 notice requires iOS/iPadOS 26 SDK or later for uploads from April 28, 2026. This is the current dated minimum used for this September 2026 preparation. [Dated SDK notice](https://developer.apple.com/news/?id=ueeok6yw) The live submission page currently describes an SDK 27 minimum beginning **April 2027**, a future requirement, not evidence that SDK 26 is already disallowed. Recheck before actual upload. SDK minimums also do not establish the oldest OS Dustlings can support. [Apple submission requirements](https://developer.apple.com/app-store/submitting/)

Apple Developer Program enrollment requires verification and acceptance of its agreement; the listed membership is USD 99 annually, with regional pricing. Account enrollment, payment, credentials, distribution signing and store uploads remain owner-controlled steps; no enrollment or payment was performed here. [Apple enrollment](https://developer.apple.com/help/account/membership/program-enrollment)

For a reviewable submission, prepare a signed archive, final icon, actual device screenshots/previews, support/privacy information, accurate privacy disclosures and age-rating responses. Audit the complete packaged app and dependencies before claiming no data collection or accessibility support. Review distribution availability explicitly: Apple's compatible iPhone/iPad apps can be available on Apple-silicon Macs by default; that does not establish our separate Mac App Store decision or tested Mac support. [App Store submission preparation](https://developer.apple.com/app-store/submitting/)

Apple requires a complete app, on-device stability checks and accurate metadata. Guideline 4.2 asks for app-like features/content/UI and lasting entertainment beyond a repackaged website. Our inference: the playable restoration game and native lifecycle must be assessed as the complete experience; merely wrapping HTML neither proves acceptance nor establishes automatic rejection. Beta testing belongs in TestFlight rather than a public prototype listing. Any later digital purchase design needs a fresh review of the applicable payment rules; no IAP or monetization has been selected. [App Review Guidelines, sections 2.1–2.3, 3.1 and 4.2](https://developer.apple.com/app-store/review/guidelines/)

## Evidence required before selling

- **Player experience:** test the current build with 12–20 unfamiliar target players; record segment-specific upgrade-without-coaching and voluntary-continuation n/N, reasons and disagreements. The private decision rules remain at least 80% reaching the meaningful upgrade uncoached and at least half continuing voluntarily. See [PLAYTEST.md](PLAYTEST.md).
- **Presentation:** human review of actual gameplay, movement and listening against the selected reference qualities, including the 50-helper scene and restored courtyard; correct material defects and obtain fresh feedback.
- **Owner acceptance:** explicit approval of the current experience, completeness, promised value and readiness to sell. Record the exact build and date independently from player enthusiasm.
- **Platform release:** verified device/OS support, reliable install/update/save recovery, relevant performance results, truthful store materials and the store's own review. Record each result; do not infer acceptance from silence.

Next action: finish the two local packaging probes and record their real checks, then address any launch, input, audio or recovery defect. Human validation remains the gate for content expansion; native reliability work can proceed while participants are unavailable.
