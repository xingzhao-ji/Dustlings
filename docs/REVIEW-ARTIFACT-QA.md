# Courtyard 0.2 review artifact check

The local `evidence/REVIEW.html` page passes 18 focused checks in headless Chrome 152. This is automated artifact QA plus assistant inspection of the recorded desktop/phone screenshots; it is not human aesthetic review, physical-device validation, or native audio audition. The work may overlap endurance testing and is not performance evidence.

- All 30 local image, video, poster, and link destinations exist. All six images decode and include descriptive alt text.
- Desktop 1440 × 900 and phone 390 × 844 layouts have no horizontal overflow. Body text is 16 px and captions 14 px. The Play action remains within the viewport.
- Three H.264 videos load metadata, advance during muted playback, and seek successfully: 45.000 s full-interface opening, 42.747 s opening canvas, and 50.068 s restoration. The latter two contain AAC audio tracks according to file metadata; their sound was not auditioned.
- The actual offline artifact SHA-256 and byte count match the build manifest. The review page and all three embedded build records identify the same source checkpoint/artifact. Every media file SHA-256 and codec/dimension/duration record matches its manifest.
- No JavaScript errors or broken-file failures occurred. Chrome's cancelled metadata/seek reads are retained separately as `mediaReadAborts`; the corresponding videos passed playback and seeking.

Assistant visual inspection found a phone line-break defect in the secondary protocol link. Root corrected the review generator; the focused rerun confirms the entire link stays on one line, underneath Play, without overflow. The current review-page SHA-256 is recorded in `evidence/v0.2/review-page-checks.json`.

`tools/review-page-checks.mjs` reproduces the full check. Its `--phone-only` mode preserves the earlier media/hash results while updating the focused phone correction and review-page hash. Evidence includes `review-desktop.png`, `review-phone.png`, `review-interaction-frame.png`, and `review-page-checks.json` in `evidence/v0.2/`.
