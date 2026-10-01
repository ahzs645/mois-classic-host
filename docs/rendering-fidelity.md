# Rendering fidelity: how the emulator is made to look like MOIS

This page records how the emulator is matched to screenshots of the real MOIS
TRAINING client. It covers the two display modes, the numbers they were tuned
against, and where to change each thing. Read it before re-tuning the look,
and add to it when a new capture changes a number.

Ground truth is the 2026-09-29 TRAINING capture set. Measurements below come
from set 3 capture c34 (Patient Chart ▸ Health Issues ▸ Conditions, chart 2429)
unless another capture is named. The older captures in `reference/` agree
wherever both show the same thing.

## 1. Two things make a screenshot differ from the page

### 1.1 The screenshots are Display P3, the page is sRGB

macOS saves screenshots with a Display P3 colour profile. Read raw, which is
what PIL does, a P3 file's saturated colours come out wrong. Greys are
unaffected, which is why the error is easy to miss.

| colour                        | raw P3 value | true sRGB value | kit token / value            |
|-------------------------------|--------------|-----------------|------------------------------|
| header navy                   | `#183f7c`    | `#004080`       | `--pb-navy` `#004081`        |
| grid header blue              | `#ccdbf7`    | `#c8dcfa`       | `--pb-dw-header` `#c8dcfa`   |
| current row (salmon)          | `#dd9f88`    | `#e89c84`       | `--pb-dw-select` `#e89c84`   |
| Desktop For field             | `#ffffc7`    | `#ffffc0`       | `#ffffc0`                    |
| window face                   | `#f0f0f0`    | `#f0f0f0`       | `--pb-face`                  |

**Rule:** convert every capture before sampling a colour:

```bash
python3 scripts/fidelity/to-srgb.py ~/Desktop/Screenshot*.png --out /tmp/caps
```

On 2026-09-30, fifteen colours that had been sampled raw were converted back.
Check a file's profile with `sips -g profile file.png`.

### 1.2 Windows draws MOIS at 1x, then stretches it

MOIS is a 96-dpi PowerBuilder program. The captures come from a Windows
display set to 200%. Windows draws the window at 1x and stretches the finished
picture to 2x with bilinear smoothing. That is why every edge in a capture is
soft, and why text looks heavier than a crisp render of the same font.

The glyphs are the same. The body text is the MS Sans Serif bitmap (the kit's
`Pixelated MS Sans Serif`), and "Problem Name:" is 140 device px wide in the
capture against 138 in the emulator. Only the rasterisation differs.

A bilinear 2x upscale of a 1x image is exactly a `[1 2 1]/4 × [1 2 1]/4`
convolution of that image drawn sharp at 2x, one kernel step per device pixel.
That kernel is what the 200% mode applies.

## 2. The display modes

| mode                       | class on `.pb-root` | what it does                                          | use it for                                               |
|----------------------------|---------------------|-------------------------------------------------------|----------------------------------------------------------|
| **Windows 200%** (default) | `pb-scale--200`     | the stretch above, on a 2x screen only                | matching the TRAINING captures; what learners see on a Mac |
| **Windows 100%**           | none                | sharp: every pixel on the grid                        | MOIS on a 100% Windows display; pixel measurement        |

**Switching modes:**
- Maintenance ▸ Display, which is remembered in `localStorage` under `pb.display-scale`.
- URL `?scale=200` or `?scale=100`.
- The shell prop `scale` pins the mode.

**Where it lives:**
- `src/pb/scale.tsx` holds the filter definition, mounted once in `.pb-desktop`.
- `src/pb/scale.css` applies it: a CSS `filter` on each direct child of `.pb-desktop`, inside `@media (resolution: 2dppx)`.
- `src/data/mois.tsx` holds `PBScaleMode` and `SCALE_MODES`.
- `src/host/MoisClassicShell.tsx` holds the state, the URL parsing and storage.

**Why not the obvious alternatives:**
- `filter: blur()` at the radii needed does nothing in Chromium; only large radii apply.
- A `backdrop-filter` overlay painted mirrored copies of the menu bar and tree, because Chromium mirrors the backdrop it samples.
- A filter on the whole `.pb-desktop`, or on nested windows, would re-anchor fixed-position layers or filter them twice.
- With the filter on each direct child, menus, dropped lists and dialogs open at the same place in both modes. This is checked by comparing `getBoundingClientRect` in both modes.

**On other screens:** the filter is off at any pixel ratio other than 2, including 1x. At 1x the page already is MOIS at 100%.

Text rasterisation is a separate axis, Maintenance ▸ Text, described in `src/pb/text.css`:
- **Bitmap MS Sans Serif** (default) draws the client area in the pixel font.
- **Tahoma** draws it in an outline face.

## 3. Measured differences

These figures are for c34 against the emulator, both 2x and sRGB. "Weight" is
the summed darkness of the ink in the region (`compare.py ink`); it is what
"the font looks lighter" means as a number.

| region                         | capture | ours 100% | ours 200% |
|--------------------------------|---------|-----------|-----------|
| review banner text (body font) | 3186    | 2762      | 3000      |
| menu bar (Segoe UI)            | 2106    | 2254      | 2226      |
| view header "Condition"        | 11249   | 11188     | 11180     |

The frame text used to be `-webkit-font-smoothing: antialiased`, which thins
the strokes on macOS. The menu bar weighed 73.2 thinned, against 85.1 in the
capture, and matched at 85.1 with the default smoothing. So `src/pb/text.css`
now uses `auto` for the title bar, menu bar, module bar, status bar and view
header.

### Vertical positions

Device px from the window's top edge, 2x.

| item                              | capture | ours |
|-----------------------------------|---------|------|
| title caption ink                 | 22–39   | 23–39 |
| menu `Record` ink                 | 72–89   | 72–89 |
| blue header top                   | 111     | 111   |
| identity strip rule               | 257     | 254–255 |
| Search For rule                   | 305     | 304–305 |
| grid top border (banner folders)  | 350–351 | 350–351 |

### Geometry, in CSS px

| item | value | where to change it |
|---|---|---|
| window | 1004 × 744 (older Patient Summary captures: 1000 × 736) | `src/App.tsx`, `src/host/manifest.ts` `windowSize` |
| title bar | 27.5 | `--pb-titlebar-h` |
| menu bar | 22, captions 2px down | `--pb-menubar-h`, `.pb-menubar` padding |
| MDI strip under the menu | 1px `#f3f3f3` + grey, 4.5 total; 6.5 over the status bar; 3.5 between the panels | `.pb-split`, `.pb-split__gutter` |
| MDI grey | `#c8c8c8` | `--pb-mdi` |
| work-area left edge | 1px `#6d6d6d` | `.pb-split__gutter + .pb-panel` |
| Desktop For panel | 322.5 wide, starts 36 down; field 216 × 16.5, `#ffffc0`, edge `#adafb5` | `MoisClassicShell.tsx`, `DesktopProviderField` |
| view header | 25.5 tall; title regular weight, 16px, letter-spacing 0.8; identity bold | `.pb-viewhead*` in `layout.css` and `text.css` |
| module bar | 30 per button, including its rule; » row 29; MOIS icons from c34 | `tree.css` `.pb-modulebar*`, `glyphs/module-*.png` |
| title-bar icon | `mois.ico` at 16px, from the SMOIS build | `glyphs/mois-app.png` |
| identity strip | 27.75, rule `#666666` | `--pb-ident-h`, `.pb-identity` |
| Search For row | box 16.5, 3.5 above and below, rule `#666666` | `.pb-searchband` |
| review banner row | padding 3 / 4 | `ClinicalReportView.tsx` |
| grid heights | 244; 242 under a review banner; 216 under Measurements' Show: row | `ClinicalReportView.tsx` `gridHeight` |
| drop-down list rows | 19 (every captured list); list up to 330 tall | `controls.css` `.pb-dddw__table` |
| grids | never stretch: fully sized columns keep their sum (`stretch` to opt out) | `PBDataWindow` |

## 4. Known remaining differences

- **Body text** in 200% mode weighs about 5% under the capture (3000 against 3186). Windows' 1x text is slightly heavier than the vendored bitmap reconstruction.
- **Title caption** is 1 device px shorter (Segoe UI at 12px).
- **Site name:** the frame says "MOIS DEV" / `_dev`; the TRAINING captures say "MOIS: TRAINING" / `rain`.
- **Other browsers:** Firefox and Safari apply the SVG filter too, but only Chromium has been measured.

## 5. Re-measuring after a change

```bash
# 1. captures to sRGB
python3 scripts/fidelity/to-srgb.py ~/Desktop/Screenshot*.png --out /tmp/caps
# 2. the same screen from the emulator (dev server running), in either mode
node scripts/fidelity/shot.mjs --chart 2429 --node Conditions --scale 200 --out /tmp/ours.png
# 3. compare
python3 scripts/fidelity/compare.py side  /tmp/caps/c01.png /tmp/ours.png /tmp/side.png
python3 scripts/fidelity/compare.py ink   /tmp/caps/c01.png /tmp/ours.png 385,300,860,340
python3 scripts/fidelity/compare.py rules /tmp/caps/c01.png /tmp/ours.png --x 1500 --from 150 --to 420
```

Compare like with like:
- Both images must be 2x, the capture's window must be the same 1004 × 744, and both must be sRGB.
- Headless Chromium hides scrollbars. Launch without `--hide-scrollbars` when a scrollbar matters.

## 6. Captured charts

Charts 2429, 3924 and 3598 carry the records their TRAINING captures show, so
each folder can be compared with its capture:
- **The records** are in `src/data/charts/captured-*.ts`, with the shared helper in `captured.ts`. They are registered in `src/data/charts/index.ts` like the 87288 export.
- **Band counts:** a Patient Summary band whose count the capture shows, but not its rows, is painted collapsed with that count. This is `CAPTURED_SUMMARY_COUNTS` in `src/data/summary.ts`.
- **Adding a capture:** transcribe its rows into the chart's file, and name the capture in that file's header.
