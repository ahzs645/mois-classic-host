# pb — PowerBuilder Classic UI Kit

A **visual** recreation of the MOIS PowerBuilder client as it runs today on
Windows 10. This is a look-and-feel project, not an emulator: nothing parses
`.pbl` files or executes PowerScript. It reproduces the chrome, the density,
the alignment and the DataWindow so that a screen *reads* as PowerBuilder.

Three things live here:

| | |
|---|---|
| `src/pb/*.css` | the library — plain `.pb-*` classes, no JS dependency (`kit.css` is the embeddable subset) |
| `src/pb/components/*` | thin React wrappers over those classes |
| `src/screens/*` | MOIS screens rebuilt from the training-environment screenshots |
| `src/host/*` | the MDI frame as an embeddable, instrumented host emulator (see *Embedding it*) |

## Running it

```bash
pnpm install && pnpm dev
```

- `/` — the MOIS recreation. **All seven modules and all 86 tree nodes resolve
  to a screen** — nothing is a dead end. Navigate with the tree and the module
  bar:

  | Tree node | Screen |
  |---|---|
  | Patient Chart ▸ Patient Summary | Patient Summary — chart block, day windows, coloured section bands |
  | Patient Chart ▸ Orders | Order — Report / Distribution / Links / Office Notes / History |
  | Patient Chart ▸ Demographic | Demographics — Demographics, Settings, Incentives, Benefits |
  | Patient Chart ▸ Imaging | Imaging Reports — report body + acknowledgement rail |
  | Patient Chart ▸ Notifications | Notification — Reminders / Recalls / Tasks / Messages / Responses |
  | Patient Chart ▸ Encounters | Encounter list + the Encounter MDI child window |
  | Patient Chart ▸ Health Issues ▸ Needs for Care | Need for Care — Detail + Linked Goals |
  | Patient Chart ▸ Care Plan ▸ Goals | Goals — Quantitative Settings, Evaluation, Linked tabs |
  | …Planned Actions / Barriers / Risks / Conditions | the shared care-plan window |
  | Scheduler ▸ Provider Schedules | Provider Day Book |
  | Scheduler ▸ Resource Schedules | Resource Day Book — the same window, leaner |
  | Scheduler ▸ Group Bookings | Group Visit List — 4 tabs |

  | Scheduler ▸ Day / Week Views | `DayGridView` — time axis, N provider columns |
  | Workspace ▸ Workspace Summary | Basket / Task List / Message Board counts, from `workspace_summary.PNG` |
  | Administration ▸ Configuration ▸ System Settings | the APP SETTING list, from `encounter_limit.PNG` |
  | Data Exchange ▸ Manual Entry | the seven result folders, from `data_exchange_contents1.png` |
  | Billing · Reports | each module has its own tree and screens |

  The Workspace, Administration and Data Exchange trees are transcribed from
  the captures named above rather than invented; Billing and Reports are still
  placeholders.

  Everything else falls through to `ChartSectionView`, the window shape most
  MOIS chart nodes share.

  Child windows: **Order ▸ Attachment** and **Encounter ▸ Service(s) ▸ New…**
  open Patient Service Event; **Goals ▸ New Record** opens New Goal;
  **Demographics ▸ Benefits ▸ Edit** opens the benefit editor, whose **Save**
  raises a classic `PBMessageBox`; the **"…"** beside Chart No. (and **Search**,
  **Go To Chart…**, **Record ▸ Find**) opens the Advanced Lookup Service; the
  **`.*.`** beside Gender — on Patient Summary and on Demographics alike —
  opens **Advanced Gender Designations**, where the administrative, preferred
  and genotypic designations are maintained and **Save / Close (F2)** closes.

### The window behaves like a window

The frame is **maximised** by default, filling the desktop with the inset a
Windows application keeps, and behaves like a window from there:

- drag any of the **eight edges and corners** to resize. A maximised window
  restores under the grip and keeps resizing in the same gesture, so there is
  never a state where the edges look draggable and are not.
- drag the **title bar** to move it. Maximised, that restores the window under
  the pointer first, the way Windows does.
- the title bar's **Restore Down / Maximize** button, or a double-click on the
  bar, toggles the two.

It stops shrinking at **1180px wide**, which is the point a real PowerBuilder
window stops reflowing: below that the desktop scrolls underneath it instead.
That is worth being able to see rather than design around.

The **minimise** button is still decorative — a single-window desktop has no
taskbar to minimise into, and pretending otherwise would be worse than leaving
it inert.

### One chart at a time

MOIS is a chart-at-a-time application, and so is this. `src/data/patients.ts`
holds the roster — 21 fictional charts transcribed from the training
environment's Patient Chart List — and `src/data/patient-context.tsx` holds the
open one. Every chart window reads it through `usePatient()`, so picking a row
in the **Advanced Lookup Service** (or **Previous/Next Chart**, or typing a
chart number into Chart No. and pressing Enter) changes the identity strips,
the patient banners, Demographics and the summary together.

That roster is the **fallback**, not a fixture. A host passes its own patients
in through the `patients` prop and may own the open chart (`chart` +
`onChartChange`), which is how Webforms points the emulator at whichever
patient its Patients dialog is on — and how a chart opened in the lookup
becomes that dialog's active patient. The transcribed 21 are what the
standalone viewer shows when nobody supplies anything.

What does *not* change with the chart is the clinical detail: orders,
encounters, measures and the rest are one shared sample set, because the kit
exists to show the screens rather than to be a database. The Patient Summary's
DEMOGRAPHICS, ALIAS IDS and CONNECTIONS bands are the exception — they are
built from the open chart's own record.

### The menus

All eight menus — Record, Modules, Views, Action, Utilities, Print,
Maintenance, Help — are transcribed item for item, with their accelerators,
from `reference/menus/`. Views, Health Issues, Care Plan, Allergy/Intolerances
and Forms have real fly-out submenus, and the Views items select the tree node
they name, so the menu bar navigates the same screens the tree does.

Real MOIS has no Window menu, so neither does this. The two things the kit
needs and MOIS has nowhere to put are parked where they read most naturally:
the open MDI sheets at the foot of **Views**, and the three looks plus the two
text modes at the foot of **Maintenance** as *Appearance: …* and *Text: …*.

### Transcribed vs extrapolated

Be clear about which is which:

- **Transcribed** — screens measured out of the 43 reference screenshots.
  These match down to the geometry. Patient Summary, the Advanced Lookup
  Service, the patient roster and every menu come from the later captures in
  `reference/` and `reference/menus/`, including the five Patient Summary band
  colours, which were sampled pixel by pixel.
- **Audited** — screens whose columns come from the MOIS field audit
  (1,074 verified control→column mappings across 48 tables, extracted to
  [`reference/field-audit.md`](reference/field-audit.md)). Marked
  `audited: true` in `data/chartScreens.tsx`.
- **Extrapolated** — what remains: the Workspace / Billing / Administration /
  Data Exchange / Reports module screens, and `DayGridView`. Inferred, and
  unmarked so you can tell.

  The Encounter window's **Service(s) ▸ New…** and Order's **Attachment** both
  open the Patient Service Event child window.
- `/#kit` — the component gallery, also reachable from **Help ▸ UI Kit gallery…**

## Embedding it as a host emulator

Webforms (`github.com/ahzs645/webforms`) checks this repo out under
`hosts/mois-classic` and uses it as a **tutorial stage**: a lesson can show
where a deployed form lives in MOIS with the same recorder, player and
practice checks as its builder tutorials. The package exports what that
takes; nothing here depends on Webforms.

```ts
import { MoisClassicShell } from '@webforms/mois-classic-host'          // screens + kit.css
import { moisClassicHostManifest } from '@webforms/mois-classic-host/manifest' // plain data
```

- **`moisClassicHostManifest`** — `id`, `label`, `fixtures` (starting points
  and their initial `host.*` state), `snapshotPaths`, `actions` and `anchors`.
  React-free, so a host can read it without bundling the screens.
- **`<MoisClassicShell fixture patients chart onChartChange onAction onStateChange onReady formSlot />`**
  - `patients` is the chart roster — `{ chart, first, last }` plus whatever of
    `middle / alias / dob / gender / home / insurance / insuranceBy / dep /
    bchn / note / location / registered / provider` the host has. Missing
    fields render blank rather than borrowing another chart's. Omit the prop
    and the emulator uses its own training roster.
  - `chart` + `onChartChange` make the open chart controlled, so the host and
    the emulator never disagree about who is on screen.
  - `onAction(id, payload)` reports `host.mois.selectNode { node }`,
    `host.mois.selectModule { module }`, `host.mois.command { command }`,
    `host.mois.selectTab { tab }`, `host.mois.menu { menu, item }`,
    `host.mois.lookup { field, dialog }`, `host.mois.selectPatient { chart }`,
    `host.mois.status { link }`, `host.mois.daybook { move }`,
    `host.mois.daybookFor { provider }`, `host.mois.toggleNode`,
    `host.mois.openWindow`, `host.mois.closeDialog` — slugs only. The one
    patient-derived value is the chart number, which a lesson about finding a
    chart has to be able to grade; the roster it names is fictional.
  - `onStateChange(state)` reports
    `{ module, node, view, tab, dialog, patient, windows, draft, daybook, provider, theme }`.
    `patient` is the open chart's number, `draft` says whether a New Record is
    open and unsaved, `daybook` is the day the Scheduler is showing
    (`YYYY.MM.DD`) and `provider` is whose day book that is — the three a
    lesson needs to grade a record being started, saved, or a day changed.
  - `onReady(api)` hands over `api.perform(actionId, args)`, which replays any
    action natively (opening a nested tree node expands its branch first), and
    `api.getState()`.
  - `formSlot` renders inside the Dynamic Forms window in place of the sample grid.
- **Anchors**: `data-tutorial-id` on the desktop (`host.mois.desktop`), the
  navigator and work area, every tree node (`host.mois.tree.<id>`), module
  button (`host.mois.module.<id>`), command button (`host.mois.command.<slug>`),
  tab (`host.mois.tab.<slug>`), menu item (`host.mois.menu.<menu>.<item>`),
  lookup button (`host.mois.lookup.<field>`), status-bar link
  (`host.mois.status.<link>`), day-book move (`host.mois.daybook.<move>`) and
  the Daybook For field (`host.mois.daybookfor`).
  The frame's own bands carry one each, named the way the manual's window tour
  names them: `host.mois.menubar` (Toolbar), `host.mois.modulebar` (Main Menu),
  `host.mois.commandrow` (Task Bar), `host.mois.viewhead` (Information Bar) and
  `host.mois.statusbar` (Bottom Bar) — so a lesson can ring a region rather
  than a control. A grid can name one row with `PBDataWindow`'s
  `rowTutorialId`, which is how `host.mois.row.<slug>` anchors are stamped.
  Command rows, tabs and menus get theirs from `PBInstrumentationProvider`
  (`src/pb/instrumentation.tsx`), so a screen added later is instrumented for
  free; outside a provider the kit renders exactly as before.

`src/host/types.ts` restates the contract the shell implements; the canonical
copy lives in Webforms at `lib/host-emulators/contract.ts`.

## The era matters — and it is a hybrid

MOIS is **not** a Windows 10 application. It is an old PowerBuilder application
*running on* Windows 10, and the two halves are visibly different. A Win32
program without a visual-styles manifest still gets the Windows 95-era common
controls, so the frame is modern while the controls inside the client area are
not. Both halves were measured out of the screenshots:

**Windows 10, drawn by the OS**

- white title bar with hairline minimise/maximise/close glyphs
- menu bar as plain text on white
- flat scrollbars — light track, mid-grey thumb, thin chevrons
- edit fields as a flat 1px `#a0a0a0` box. A pixel scan of an empty field in
  `encounter-detail-header.png` gives `#acacac` on all four sides — no bevel.
- dialog face `#efefef`, not `#d4d0c8`

**Classic Win32, drawn by the control**

- the **checkbox** is a 13×13 box with a 1px `#2f2d2e` hairline and a chunky
  `#4a4849`–`#706e6f` tick — not Windows 10's clean 1.5px stroke. That tick is
  pixel-for-pixel `themes/98/icon/checkmark.svg` from XP.css, which is why the
  kit vendors it.
- the **radio** is a hard ring with a large dark dot, not a thin Win10 ring

**PowerBuilder, drawn by the app**

- navy view headers, grey section bands, 19px field rows, the hard-bordered
  command strips, and above all the DataWindow

### Dialling it

The default is that hybrid. Two overrides shift it either way — switch live
from **Maintenance ▸ Appearance**, or apply the class yourself:

| class | look |
|---|---|
| *(none)* | **MOIS hybrid** — Win10 frame, Win32 controls. The measured default. |
| `pb-theme--flat` | **Windows 10** throughout — crisp modern glyphs. |
| `pb-theme--classic` | **Windows 95/98** — full chisel, silver `#d4d0c8`, gradient title bars, XP.css's bevelled 98 scroll buttons. |

```html
<div class="pb-root pb-theme--classic"> … </div>
```

### Text: Tahoma or the bitmap

Rasterisation is a separate axis from the three looks, because the problem is
the platform rather than the design. MOIS asks for **Tahoma 11px** — measure
the Demographics tab captions in `demographics-full.png` and they land within
1.5px of it — and Windows hints Tahoma onto the pixel grid at that size, which
is where the hard 1px stems in the screenshots come from. macOS and Linux
ignore TrueType hinting and render the outline, so the same font comes out
rounder and softer, and no CSS turns hinting back on.

| class | text |
|---|---|
| *(none)* | **Tahoma 11px** — what MOIS asks for. Pixel-exact on Windows, soft elsewhere. |
| `pb-text--pixel` | **Bitmap MS Sans Serif** — a reconstruction drawn on an 11px grid, so it lands on the grid anywhere. Crisp off Windows. **The frame's default.** |

The shell starts in the bitmap mode, because off Windows it is the only one
that looks like the captures. Switch it live from **Maintenance ▸ Text**, pin
it on a link with
`?text=pixel` or `?text=tahoma`, pass `text` to the shell, or apply the class:

```html
<div class="pb-root pb-text--pixel"> … </div>
```

The frame around the client area keeps Segoe UI and its smoothing either way —
the Windows 10 chrome in the screenshots was never aliased. The bitmap is a
reconstruction, not Tahoma: a few letterforms differ, captions come out 1–2px
narrower, it exists at 11px only (so `--pb-fs-sm` and `--pb-fs-banner` are
pulled onto 11px with it), and `…`, `✓`, `×` and accents fall back to Tahoma.
See `src/pb/fonts/ATTRIBUTION.md` — the font is CC BY-SA 3.0.

## Geometry

The vertical stack was measured band-by-band out of `order-office.png` by
scanning pixel rows, and the tokens match it:

| band | measured | token |
|---|---|---|
| title bar | 30px | `--pb-titlebar-h` |
| menu bar | 22px | `--pb-menubar-h` |
| navy view header | 24px | `.pb-viewhead` |
| command row | 20px | `.pb-cmdrow__btn` |
| identity strip | 26px | `--pb-ident-h` |
| DataWindow header | 18px | `--pb-dw-row-h` |
| DataWindow row | 18px | `--pb-dw-row-h` |
| tab strip | 23px | `--pb-tabstrip-h` |
| section band | 17px | `--pb-band-h` |
| status bar | 24px | `--pb-status-h` |

With those in place the status bar lands at exactly y=662 in a 686px client
area, same as the reference — which is the real test, since any error in the
stack above it would show up there.

## Colours

Every value in `src/pb/tokens.css` was sampled from the screenshots rather than
guessed. The load-bearing ones:

| token | value | where |
|---|---|---|
| `--pb-navy` | `#173d7b` | module and view header bars |
| `--pb-band` | `#dad5d1` | group-box / section header band |
| `--pb-face` | `#efefef` | dialog and form background |
| `--pb-dw-header` | `#cbdaf7` | DataWindow column headers |
| `--pb-dw-select` | `#e39b83` | current row — salmon, not blue |
| `--pb-dw-alert` | `#ee2211` | status-coloured rows |
| `--pb-yellow` | `#ffffcc` | compact patient banner |
| `--pb-banner-bottom` | `#6fb8e5` | blue patient banner, lower band |
| `--pb-text-head` | `#000080` | bold navy column captions |

Retheme the whole kit by overriding these on `:root`.

## Details worth keeping

A handful of small things carry most of the authenticity:

- **Command rows.** PowerBuilder butts its buttons edge to edge with a shared
  1px *black* border (`margin-right: -1px`). Nothing else looks like this.
- **Two non-editable states.** Protected fields are grey-filled with black text
  (`readOnly`); disabled fields are pale with grey text *and a grey label*
  (`disabled`). MOIS uses both, and they mean different things.
- **The current-row arrow.** A 13px gutter column carrying `›`, not a coloured
  left border.
- **Right-aligned labels** in filter blocks, left-aligned in entry forms.
- **The selected tab** is drawn as a white box whose bottom edge is punched out
  (`margin-bottom: -1px`), and it keeps its dotted focus rectangle.
- **Tree branches** are pure CSS, using the `ul.tree-view` technique from
  [XP.css / 98.css](https://github.com/botoxparty/XP.css): a nested `<ul>`
  carries the dotted spine, each `<li>::before` draws the horizontal stub, and
  `:last-child::after` masks the tail. `<details>`/`<summary>` gives the
  disclosure behaviour, so there are no per-level indent elements at all.

## Using the CSS without React

The stylesheet stands alone:

```html
<link rel="stylesheet" href="pb/index.css">

<div class="pb-root">
  <div class="pb-window">
    <div class="pb-titlebar"><span class="pb-titlebar__text">MOIS: MOIS DEV</span></div>
    <div class="pb-viewhead"><span class="pb-viewhead__title">Order</span></div>
    <div class="pb-cmdrow">
      <button class="pb-cmdrow__btn">New Record</button>
      <button class="pb-cmdrow__btn">Save</button>
    </div>
    <div class="pb-form">
      <span class="pb-form__label">Provider:</span>
      <input class="pb-field" value="FAKERRY, FAKER">
    </div>
  </div>
</div>
```

## Components

`PBWindow` · `PBMenuBar` (one level of fly-out submenus) · `PBStatusBar` · `PBViewHeader` · `PBBand` ·
`PBGroupBox` · `PBCommandRow` · `PBButton` · `PBInput` · `PBTextArea` ·
`PBSelect` · `PBLookup` · `PBDropField` · `PBCheckbox` · `PBRadio` ·
`PBSlider` · `PBSpinner` · `PBDropDownDataWindow` · `PBTabs` · `PBTree` · `PBModuleBar` ·
`PBDataWindow` · `PBPatientBannerYellow` · `PBPatientBannerBlue` ·
`PBSummaryBand` · `PBMessageBox` · `PBSection` · `PBIdentityStrip`

**MDI:** `PBMdiProvider` · `PBMdiHost` · `useMdi` — window *classes*
instantiated per record. Double-click an encounter row to open it; open
several at once; they cascade, drag, raise on click, and are listed under the
frame's **Window** menu.

`PBDataWindow` takes `groupBy` for collapsible group bands, `rowStatus` for
`alert` / `ok` / `highlight` row colouring, and `rowIcon` for a gutter glyph.
Bands can be captioned and coloured per group (`groupLabel`, `groupAccent`)
and driven from outside (`collapsed` + `onCollapsedChange`, which is what
Expand All / Collapse All use); `filters` puts a control per column above the
headers, and `head="grey"` swaps the DataWindow blue for the window face.
`anchored` is for the one grid a screen is built around: the control fills the
frame while the columns keep their painted widths, so the white canvas and the
scrollbar reach the right edge and the columns do not.

## Windows are painted at a fixed size

A PowerBuilder window has one design width; only right-anchored controls grow
with the frame. On a wide monitor a MOIS screen is therefore content on the
left and empty window face on the right — which is what every capture shows.

Screens set `--pb-design-w` on their root and wrap the blocks that should not
stretch in `PBFixed`. Demographics and Order are painted at 1056px. The
identity strip is painted at fixed offsets too, so `PBIdentityStrip` fields
take a `w`; screens that have not been measured fall back to a default gap.

`PBGroup` is the classic Win32 GroupBox — a rectangle with a navy caption set
into its top border, which is what Demographics and the Order report page are
built from. `PBGroupBox` remains the banded variant.

## Reference

`reference/` holds the screenshots the kit was measured against, plus the
earlier single-file HTML mockup that this replaced. That mockup was built on
`98.css`, which turned out to be the wrong era — worth keeping only as a
before/after.

**[`reference/NOTES.md`](reference/NOTES.md)** is the working record: what was
taken from XP.css and from Appeon's `PowerBuilder-ModernUI-Example`, what could
not be used and why, the RibbonBar anatomy if that theme is ever wanted, and
which MOIS screenshots are still unbuilt.

The short version:

- **XP.css** gave the tree's branch-line technique and ten vendored glyphs in
  [`src/pb/glyphs/`](src/pb/glyphs/ATTRIBUTION.md) — the 98 checkmark and radio
  parts (which turn out to match MOIS's unthemed controls exactly), the 98
  scroll buttons for `pb-theme--classic`, and the XP spinbox chevrons for
  `PBSpinner`. Its *content* icons do not exist: all 73 icon files are control
  chrome. MIT licensed, `reference/LICENSE-xp.css.txt`.
- **Appeon ModernUI** is a PowerBuilder **2025** RibbonBar demo. Its `.pbl`
  files are opaque `PDW2500` binaries with no readable source, and its icons are
  modern flat Appeon artwork. Mined for reference only.

Patient data throughout is the fictional training-environment record
(PATCH JULIAN AADAMS) that appears in the screenshots.
