# Provisional native packaging icon

These icons identify the native app prototypes as Dustlings instead of the Electron or Xcode template. They derive from the original inline SVG favicon in `index.html`; its body, leaf, eyes, geometry and colors are unchanged. The only visual addition is the opaque `#f6f3e9` cream background already used in `style.css`, so wallpaper does not change the creature's contrast and the 1024px source has no alpha channel.

This is packaging preparation under the owner's Steam / Apple App Store direction. It is **not approved storefront artwork**. Human creature appeal, brand recognition, store presentation and owner acceptance remain unvalidated.

Run from the repository root on macOS:

```sh
node tools/build-native-icon.mjs
```

The script uses the existing Playwright development dependency, installed Chrome (override with `PLAYWRIGHT_EXECUTABLE_PATH`) and macOS `/usr/bin/iconutil`. No remote assets, image-generation tools or game reference assets are used. `icon-manifest.json` records source and output hashes. Generated assets are committed so consuming builds do not require Chrome or iconutil.

- `app-icon.svg`: original favicon plus the cream background.
- `app-icon-1024.png`: opaque RGB source for Apple app-icon preparation; additional PNGs range from 16 to 512px.
- `app-icon.icns`: macOS bundle icon, with a source `Dustlings.iconset` containing 16/32/128/256/512 points at 1× and 2×.
- `app-icon.ico`: Windows icon with PNG entries at 16, 32, 48, 64, 128 and 256px.
- `icon-size-review.png`: 16–256px renders displayed at actual CSS pixel size for review.

Acceptance check, 2026-09-10: generated all formats; `file` recognizes ICO, ICNS and PNG; `sips` confirms 1024×1024 RGB PNG with no alpha. Agent visual inspection of the size review finds the two eyes and leaf retained at small sizes, with complete shape bounds and no transparent fringes. This inspection is a technical/presentation check by an agent, not human preference evidence. Native Dock, Explorer and device launcher appearance still need review on their actual platforms. Effort budget: six minutes; no game art or behavior changed.
