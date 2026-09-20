# Reference notes

Findings from the source material, kept separate from the kit itself. Nothing
here is wired into the build — it is here so the next pass does not have to
re-derive it.

---

## 1. Appeon `PowerBuilder-ModernUI-Example`

Mined for reference only. Nothing from it was built into the kit.

### What it actually is

An official Appeon demo of **RibbonView**, a PowerBuilder **2025** feature that
converts an existing MDI menu into a Ribbon bar with no code changes. It is a
*different era of PowerBuilder* from MOIS — useful as a contrast, not as a
source for the classic look.

### What could not be extracted

- **`.pbl` libraries are opaque.** `modernuiapp.pbl`, `common.pbl`,
  `salesorder.pbl`, `person.pbl`, `product.pbl`, `report.pbl` and
  `menuinribbonviewextension.pbl` are compressed PowerBuilder 2025 containers
  (magic `PDW2500`). `strings` yields only chunk headers (`DAT*`) — no
  PowerScript, no window definitions, no control geometry. Opening them needs
  the PowerBuilder IDE on Windows; there is no source to read on macOS.
- **The icon set is the wrong era.** 32 icons at 16–32px, all modern flat
  Appeon artwork in blue/orange (`address.png`, `customer.png`, `order.png`,
  `product.png`, `statistics.png`, `survey.ico`, …). MOIS uses the Win32
  language — yellow folders, small calendar grids, chiselled document glyphs.
  Mixing them would read as two applications.

### What is usable — the MDI toolbar (`image/DisplayAsRibbonBar.png`)

This is the most directly relevant artefact: a **PowerBuilder 2025 MDI frame in
classic menu mode on Windows 10**, which is exactly the chrome family MOIS sits
in. It confirms several choices already made in the kit:

- flat white title bar, hairline Win10 glyphs
- menu bar as plain text on white, generous horizontal padding
- toolbar as a **single row of flat 16px icons with no button borders at all**,
  separated into groups by thin vertical rules and a drag grip (`⋮`) at the
  left of each band
- a second toolbar row that wraps, each band independently draggable
- tooltips are plain white rectangles with a 1px grey border, no rounding

Menu structure: `Boards · Action · View · Report · Window · Help`.

> Note: MOIS's command strips are **not** this. MOIS draws hard 1px black
> bordered buttons butted edge to edge (see `.pb-cmdrow`). The Appeon demo uses
> borderless icon buttons. Both are PowerBuilder; they are different decades.

### The RibbonBar, if it is ever wanted

From `image/RibbonBarSettings.png`, the anatomy is:

- **QuickAccessToolbar** pinned above the category tabs — the old toolbar,
  borderless 16px icons, grouped by vertical rules
- **Category tabs** (`Boards`, `Action`, `View`, …) — flat, the selected one
  white and merging into the panel below, same construction as `.pb-tabs`
- **Panels**, each a group of commands with a **centred caption underneath**
  (`Common`, `Finance`, `Logistics`) and a vertical rule between panels
- **Large buttons**: 32px icon above a two-line label, optional `▾` caret
- **Small buttons**: 16px icon beside a single-line label, stacked three per
  column
- Panel background white, tab strip `#efefef`, no gradients

Property synchronisation is the demo's real subject: menu `Enabled`/`Visible`
flow to the RibbonView automatically, and `ToolbarItemVisible` flows to the
QAT. That is runtime behaviour, not styling.

---

## 2. XPandeder.css / XP.css

### Adopted — glyphs

Ten SVGs are vendored into `src/pb/glyphs/` (see `ATTRIBUTION.md` there). The
reason is a measurement, not a preference: a pixel dump of a checked checkbox
in `scheduler-provider-daybook-left.png` gives a 13×13 box, 1px `#2f2d2e`
border, white fill, and a chunky `#4a4849`–`#706e6f` tick. That is the shape of
`themes/98/icon/checkmark.svg`, not the clean 1.5px stroke Windows 10 draws.

MOIS is a **hybrid**: a Win32 program without a visual-styles manifest keeps
the Windows 95-era common controls even on Windows 10. Verified across the
screenshots:

| element | era | evidence |
|---|---|---|
| title bar, menu bar | Win10 | flat white, hairline glyphs |
| edit fields | Win10 | all four borders `#acacac`, no bevel |
| scrollbars | Win10 | light track, mid-grey thumb, thin chevrons |
| **checkbox** | **Win32 classic** | 1px `#2f2d2e` box, chunky grey tick |
| **radio** | **Win32 classic** | hard ring, large dark dot |
| tabs, command strips, DataWindow | PowerBuilder | app-drawn |

The tick is applied as a CSS `mask` rather than an image so `--pb-check-tick`
stays a token — the screenshots put it near `#55534f`, and the vendored glyph
is black.

The XP set is still mostly unusable (green checkmark `#22a122`, green radio dot
`#4dbf4a`), with one exception: `spinbox-up/down.svg` are plain `#4D6185`
chevrons, now driving `PBSpinner`.

### Adopted — layout

The **`ul.tree-view` branch-line technique**, now the basis of `.pb-tree`:

```css
ul.tree-view ul        { border-left: 1px dotted grey; }   /* the spine   */
ul.tree-view ul>li::before        { border-bottom: 1px dotted grey; }  /* stub */
ul.tree-view ul>li:last-child::after { background: #fff; }  /* mask tail  */
```

Paired with `<details>`/`<summary>` this removes every per-level indent element
and gives disclosure behaviour for free. The technique is era-neutral; only the
colours needed changing.

### Not adopted, and why

- **There are still no content icons.** `themes/98/icon/` (18 files) and
  `themes/XP/icon/` (55 files) are entirely *control chrome* — checkmarks,
  radio dots, dropdown arrows, scrollbar tracks/thumbs/arrows, spin buttons,
  title-bar glyphs. `public/images/` holds exactly one file,
  `start-menu-button.svg`. The compiled `dist/XP.css` embeds 85 SVG data URIs
  and they are the same set. There are no folders, no calendars, no module
  glyphs — so the MOIS tree and module-bar icons could not come from here.
- **The XP glyph set is Luna-themed.** Green checkmark, green radio dot, blue
  gradient dropdown. Only the spinbox chevrons survived.
- **`.explorer-panel` is a different component.** It is the Windows XP Explorer
  task pane (`linear-gradient(180deg,#7BA2E7,#6B85DC)`, collapsible headers in
  Luna blue), not the MOIS module bar.
- The 98 theme's chiselled `box-shadow` bevels are not in the default theme,
  but they *are* the basis of `pb-theme--classic`, together with the vendored
  `button-up/down.svg` scrollbar buttons.

---

## 3. Screens transcribed from the MOIS screenshots

| Screenshot | Built as |
|---|---|
| `order-office.png` | `OrderView` — Office Notes tab |
| `order-history.png` | `OrderView` — History tab |
| `encounter-current-screen.png` | `EncounterListView` (status-coloured rows) |
| `encounter-detail-header.png` | `EncounterWindow` header + Progress Note(s) |
| `encounter-measurement-populated.png` | `EncounterWindow` — Measurements |
| `encounter-service-event-populated.png` | `ServiceEventDialog` |
| `goal-standard-populated.png` | `GoalDialog` |
| `scheduler-provider-daybook-left.png` | `SchedulerView` |
| `scheduler-group-bookings-patient-list.png` | `GroupVisitView` |
| `notification-messages.png` | `NotificationView` |
| `incentive-claim-populated.png` | `DemographicsView` — Incentives |
| `need-for-care-new-record.png` | `CarePlanView` — Detail |
| `need-linked-goals-populated.png` | `CarePlanView` — Linked Goals (group bands) |
| `order-distribution.png` / `order-links.png` | `OrderView` — those tabs |
| `quantitative-settings-populated.png` | `GoalsView` — Quantitative Settings |
| `contact-preference-populated.png` | `DemographicsView` — Settings |
| `benefit-editor-populated.png` | `DemographicsView` — Benefits + `BenefitEditor` + `PBMessageBox` |
| `notification-recalls/-tasks/-reminders/-responses.png` | `NotificationView` tab configs |
| `imaging-empty-screen.png` | `ImagingView` |
| `scheduler-group-bookings-info.png` | `GroupVisitView` — Additional Information |
| `linked-health-issue-populated.png` | `GoalsView` — Linked Health Issue(s) |
| `goal-linked-actions-populated.png` | `GoalsView` — Linked Action(s) |
| `encounter-linked-order-populated.png` | `ServiceEventDialog` — Linked Orders |
| `encounter-service-health-populated.png` | `ServiceEventDialog` — populated health issues |
| `scheduler-resource-daybook-left.png` | `SchedulerView mode="resource"` |

### The care-plan family is one window

`need-for-care`, `goal-standard`, `action-linked-goals`, `goal-linked-actions`,
`need-linked-goals`, `risk-linked-goals` and `health-issues-linked-goals` are
all the *same* PowerBuilder window with a different DataWindow bound to it:
identity strip → `Search For:` → list → `Detail` beside one or more read-only
`Linked X` tabs. `CarePlanView` takes a key and reads `carePlanScreens`, so the
six tree nodes cost one component.

The `Linked X` tabs introduced two DataWindow features now in the kit:
collapsible **group bands** (`groupBy`) and the **yellow linked-row**
highlight (`rowStatus` → `'highlight'`).

### Goals outgrew the care-plan family

`quantitative-settings-populated.png` shows Goals carrying a nine-column grid
(including two checkbox columns and two-line captions) and five tabs, so it now
has its own `GoalsView`. `CarePlanView` still serves the other five nodes.

Its **Quantitative Settings** page is worth noting as a layout: PowerBuilder
separates the groups with a plain horizontal rule and no group box at all,
which is what `PBSection` does.

### There are two different "Linked X" tabs

This was not obvious until both were populated:

| | care-plan window | Goals window |
|---|---|---|
| header | a grey `PBBand` reading *"Linked Goals - Read Only"* | a `pb-cmdrow` of hard-bordered buttons |
| buttons | none | `Link Health Issue(s)` / `Unlink Health Issue`, or the five-button action set |
| flag columns | `S` | `Sensitive`, and `Completed` on actions |

Both share the group band and the yellow linked row, so `PBDataWindow` covers
them; only the header strip and the column set differ. `goalLinkedTabs` in
`data/mois.tsx` holds the two Goals variants.

### The two day books are one window

`scheduler-resource-daybook-left.png` is the provider day book minus the
MSP/call-list panel, the four extra print commands, the `Discharged` filter,
the `or Show Only` row and the summary strip; its grid swaps the trailing
`Resource` column for `Provider`. `SchedulerView` takes
`mode="provider" | "resource"`.

### Geometry audit

Measured by scanning pixel rows down `order-office.png` at x=500..1280 and
comparing against `getBoundingClientRect()` in the running app. Four
discrepancies were found and fixed:

| band | was | reference | fix |
|---|---|---|---|
| DataWindow header | 14px | 18px | `height` had been changed to `auto` for two-line captions; a table cell treats `height` as a minimum, so the original value works for both |
| identity strip | 22px | 26px | became `--pb-ident-h`, and the block was factored into `PBIdentityStrip` — it had been copy-pasted into six screens |
| status bar | 22px | 24px | `--pb-status-h` |
| tab strip | 21px | 23px | `--pb-tabstrip-h` |

Left uncorrected, these compounded: the grid started 5px high and the whole
lower half of every screen was out of register. Afterwards the status bar
lands at exactly y=662 of a 686px client area, matching the reference.

Two of the four were silent failures worth noting: the `--pb-ident-h` and
`--pb-tabstrip-h` declarations did not land on the first attempt (the anchor
string had a different run of trailing spaces), so the rules referenced
undefined variables and collapsed to content height. CSS gives no error for
this — only re-measuring caught it.

### Navigation audit

Before this pass, 43 of 86 tree nodes silently fell through to the Order
view. Every node now resolves, verified by driving the running app: click
each of the 86 nodes across all seven modules and record the resulting view
header. `ChartSectionView` absorbs the long tail, `DayGridView` covers the
multi-column day and week views, and the five non-clinical modules got their
own trees.

One real bug surfaced: `PBTree` selected leaf nodes on `mousedown` but parent
nodes on `click`, so parents did not respond to the same gesture. A Win32
tree selects on mouse-down regardless, so both row shapes now agree.

### Correction: 16 screenshots had not actually been opened

An earlier pass described the remaining 16 captures as "state variants of
screens that exist" on the strength of their filenames. That was an
assumption, and opening them found ten real errors:

| capture | what it actually shows |
|---|---|
| `encounter-detail-summary` | **the MOIS sign-in dialog** — not an encounter tab at all. Branded splash, version block, User Name / Password, Change Password. A whole screen that would otherwise have been missed. |
| `encounter-detail-coding` | Detail / Coding is a **coding matrix** — Procedure / Health Issue / Service against Code 1–5, with ragged slot counts (2, 4, 4) — plus Resource, Docu. Status, Billing Status, Visit Mode, Encounter Ref. The invented Payor/Fee-Code layout was wrong. |
| `scheduler-provider-daybook-right` | the day book grid has **14 columns**; AS, TK, MG, DS, BS, TM and RP were missing |
| `action-linked-goals-populated` | Planned Actions has its own grid — Planned Start / Planned End / Action / Participant(s) / Action Completed / Completed Date — and its band reads `Linked Goals`, without the `- Read Only` suffix |
| `risk-linked-goals-populated` | the screen is titled **"Risk for Condition"** (singular) with Rank, Source, Neg. columns |
| `goal-saved` | the Goals **Detail** tab carries three trackbars (Patient Commitment / Patient Confidence / Provider Importance), and **Quantitative Settings greys out** when the row is not a quantitative goal |
| `notification-responses` | two stacked read-only grids, no filter row, no detail pane |
| `notification-reminders-empty` | columns are Reminder / Start Date / Stop / M with a single filter field |
| `order-links` | columns are Section / Date / Description |
| `scheduler-group-bookings-providers` / `-resources` | "Other Provider List" / "Other Resource List", columns Provider / Note / Reserve Time on Schedule |

Three were what the filenames suggested: `encounter-service-event-editor` (a
new, unsaved service event — no *Change Linked Service Episode* button, Service
Episode editable, Service Phase disabled), `encounter-detail-progress` and
`encounter-detail-measurements`.

The lesson is narrow and worth stating: filenames in this set are not
reliable, and `encounter-detail-summary` proves it.

**All 43 captures have now been opened.**

### The `evidence/` folder was never opened

A second correction. `reference/` was described as done; it was not. The MOIS
output folder also carries `evidence/` — **1,098 directories**, each holding a
`ui-original.png`, a red-arrow annotation, an audit dialog and a `result.json`
mapping one visible control to its database column.

Two things came out of it:

**786 distinct screenshots, only 34 of which overlap the 43 top-level captures.**
752 show screens or states nothing else in the set does.

**1,074 verified field mappings across 48 tables.** Extracted to
`reference/field-audit.md`. This replaces guesswork with observation for the
screens that had been built as extrapolations:

| screen | column set now |
|---|---|
| Measures | `Collected · Ordered By · Code · Test Name · Value · Flag · Units · Status` |
| Consults | `Refer Date · Seen Date · Referred By · Seen By · Reason for Consult Request · S · M` |
| Procedures | `Performed · Performed By · Description · Diag Desc` |
| Documents | `Date · Author · Document Type · Source Venue · Note · S · M` |
| MAR | `Date/Time · Given By · Medication · Dosage · Route · Site` |
| Alerts | `Start · End · Code · Description · Detail · S · M` |
| Health Issues | `Start · End · Problem Name · Rank · Certainty · Severity · S` |
| Facility Admissions | `Admitted · Discharged · Admit By · Facility · Description` |
| Allergy | `Onset · ~ · Type · Category · Code · Agent` |

The audit also supplied the five Demographics tabs that had been left as empty
placeholders — ID Alias, Connections, Services, Associated Parties and WCB
Claims — from `tdt_alias_id`, `tdt_connection`, `tdt_chart_service`,
`tdt_associated_party` and `tdt_claim_wcb`.

It independently confirms two column sets derived from screenshots: `tdt_risk`
(Start · End · Risk Code/Description · Rank · Source · S · Neg) and `tdt_need`
(Start · End · Need Description · Participant(s) · S), and the Goals trackbar
labels (Patient Commitment / Patient Confidence / Provider Importance Level).

Screens in `chartScreens.tsx` now carry `audited: true` where their columns
come from this file. What is still inferred is unmarked.

### Module bar was wrong

Measured off `scheduler-provider-daybook-left.png` at x=430: the buttons are a
warm top-lit gradient `#fffdfe → #ebe7e4 → #d4d3d1`, 29px tall, butted against
one another with a hard 1px black rule between them — and the **active button
is flat `#d4d3d8`**, pressed rather than lit. The kit had a cool
`#fbfbfb → #eaeaea` gradient with 1px `#b9b9b9` borders and a blue-tinted
active state, which read as far too modern.

### Screens found in the evidence captures

Representatives were pulled per cluster (42 dominant tables) rather than
opening 750 near-duplicates — most differ only in which control carries the
red arrow, so one shot per cluster covers every distinct screen family.

Four were wholly unlike what had been built from guesswork:

**`Rx - Prescription`** — commands `New Record · Rx Wizard · Rx Favourite ·
Delete Record · Save · Undo · Refresh · Duplicate · Attachment · Print Rx`;
grid `Order · Medication · Dose / Frequency · Amount · Type · M`; tabs
`Detail · CPP`. The Detail page puts ATC Code, Generic Name, Indication,
Comment ("Printed on Prescription") and Office Note on the left, with an
instruction block on the right — `Do Not Substitute`, `Do Not Adapt`,
`PRN (when necessary)`, `Repeat`.

**`Long Term Medications`** — the same window family, plus `Renew`, `Review`
and `No Known` commands, a `Start · End` grid, and a plain-text banner above
it reading *"Long Term Medications have not been reviewed for this patient"*.

**`Provider Waiting List`** — far richer than the extrapolation: a
Provider (required) / Wait List (optional) filter pair, an
`All Records` / `Waiting Records (w/o outcome date)` radio group, a
`Hide booked patients` flag, an eleven-column grid, and four tabs
(`Contact Information · List Detail · Procedure List · Unavailab…`). It also
shows a **DropDownDataWindow** — a dropdown whose list is a two-column grid
(Name / Description) rather than plain text.

**`Demographics ▸ Patient Detail`** — three Ethnicity rows each with a
`Self ID'd` flag, First Nation Status, Patient Adopted / Multi-Gestation,
Relationship, Education Level, Socioeconomic, Living Arrangements, General
Notes; a `Status History` grid and `Name History` form on the right; and a
`Historical Contact Information` block paging *"This is 1 of 17 records"*.
Notably it shows a **yellow-highlighted field label** (Preferred Gender) —
MOIS flagging a field.

The Encounter list also gains a leading `Date` column that the top-level
capture had scrolled out of view.

### MDI window classes

Encounters are now tied together the way PowerBuilder does it. `w_encounter`
is a *class*; `OpenSheet` makes an instance bound to one record, and several
can be live at once. `src/pb/mdi.tsx` models that:

- `PBMdiProvider` holds the instance stack; `PBMdiHost` renders it
- instances are keyed by record (`encounter:10065084`), so re-opening the same
  encounter **focuses** the existing sheet rather than duplicating it
- new sheets cascade, drag by their title bar, raise on mouse-down and close
  independently
- the frame's **Window** menu lists open sheets and offers `Close All`

Double-clicking an encounter row opens that encounter. `PBDataWindow` gained
an `onActivate` prop for the double-click / Enter gesture.

### Tab strip corrected

The selected tab had been drawn as a solid-bordered box *plus* an inset dotted
rectangle — doubled up — while unselected tabs sat on a near-white strip, so
the whole row read flat. Magnifying the reference at 5x shows the real
construction:

- an unselected tab is **not a box at all** — just a caption with a 1px
  `#c9c9c9` hairline separator, on the `#efefef` strip
- the selected tab is a **white plate whose only outline is the dotted focus
  rectangle**, no solid border
- it stands **proud**: 23px against the unselected tabs' 19px, achieved with
  `align-items: flex-end` on the strip
- its bottom edge punches through the strip's rule into the page below

### Controls added

**`PBDropDownDataWindow`** — a PowerBuilder DDDW drops a *grid*, not a list:
grey `#c7c7c7` header row, zebra `#fffdff` / `#eeeee4` rows, no cell borders,
inside a hard 1px black frame. Driving the Wait List field on the Provider
Waiting List, it reproduces the reference popup exactly, description column
and all.

**Flagged fields** — MOIS paints a control's *label* yellow once its value has
been changed. `.pb-form__label--flagged` / `.pb-flag`. Seen on Preferred
Gender and Genotypic Gender in Patient Detail, and on Expiry Date in the
Historical Contact block.

### Screens built from the evidence captures

| screen | notes |
|---|---|
| `Rx - Prescription` | 10-command row, `Detail · CPP` tabs, instruction flag block |
| `Long Term Medications` | same family, plus the "have not been reviewed" banner |
| `Provider Waiting List` | required/optional filter pair, radio scope, 11-column grid, 4 tabs, DDDW |
| `Demographics ▸ Patient Detail` | triple Ethnicity rows, Status/Name History, paging contact block |

### The clinical-report window class

The biggest structural finding of the whole exercise. **Imaging Reports,
Consult Reports, Procedure, Paper Forms and Measurements are one PowerBuilder
window**, not five: identity strip, Search For, a list, a `Report`/`Detail`
tab pair over a two-column detail form, a `Source · Sent Date · Code ·
UNSIGNED` provenance footer, and an Acknowledgement History + Workflow Summary
rail down the right. Only the caption, the grid binding and which detail
fields appear change.

`ClinicalReportView` + `data/reportScreens.tsx` replaces the five separate
implementations (and `ImagingView`, now deleted). Measurements adds a
`Show: ☑ Show All ☑ Laboratory ☑ Pathology ☑ Direct Clinical Obs` filter row,
a `List View` selector and a `Panel (0)` tab; Reaction Risks adds a review
banner and `Reactions` / `Linked Events` tabs.

Two states came out of Measurements: an **out-of-range result paints its whole
row yellow** (`pb-dw--flag`, seen on PHQ-9 TOTAL SCORE with flag `H`), and the
**Ref. Ranges fields are themselves yellow**.

### Corrections from this pass

- a **DDDW's selected row is navy with white text**, not the salmon used by an
  ordinary DataWindow — visible in the Type dropdown on Reaction Risks
- `Rx - Prescription` and `Long Term Medications` are a second shared family,
  distinct from the report one — no rail, no signature footer, but a `CPP` tab
  and an instruction-flag block
- MAR is not a list screen at all but a **Medication Administration Detail
  Record** child window, with a third DDDW (the administration-site list)
- a missing React `key` on the Waiting List contact rows, caught by the sweep

### Screens completed

| screen | source |
|---|---|
| Imaging · Consults · Procedure · Paper Forms · Measurements | one class, five bindings |
| Reaction Risks (+ Reactions, Linked Events) | tdt_allergy capture |
| Rx - Prescription (+ CPP) · Long Term Medications | tdt_prescription, tdt_medication_lt |
| MAR + Medication Administration Detail Record | tdt_mar |
| Provider Waiting List (all four tabs) | tdt_wait_list |
| Demographics ▸ Patient Detail | tdt_chart_address |

### Going through the rest

All 48 cluster representatives accounted for. Working through them collapsed
the chart into **three window classes**, not forty screens:

**1. Clinical report** — Imaging, Consults, Procedure, Paper Forms,
Measurements, Facility Admissions. Identity strip, Search For, list,
`Report`/`Detail` tabs over a two-column form, `Source · Sent Date · Code ·
UNSIGNED` footer, Acknowledgement History + Workflow Summary rail.

**2. List + detail** — the same shape with `plain: true`: no rail, no
signature footer. Intervention, Family Hx, Alert, Condition, Social Hx,
Barriers to Care, Patient Resources, Preferences, Allergy Events. Some carry
tabs (Condition has `Detail · Linked Goals · Medications · Rx History`), some
just a comment box (Intervention, Family Hx).

**3. Medication** — Rx - Prescription and Long Term Medications: `Detail`/`CPP`
tabs and an instruction-flag block, no rail.

Two screens refused to fit and got their own components:

- **Determinants of Health** is four domain tabs (`Employment · Education ·
  Housing · Socioeconomic`), each a current-status grid with `Trend` / `Less…`
  links and an `Update` button in the band, over a history grid, a
  *"Total Hrs/Wk for all Current Employment Records"* line, and an
  Employer Information / General Notes split. It had been a one-line
  extrapolation.
- **Summary Settings** is two tabs (`Care Plan Sections · Care Plan Elements`)
  wrapping the grid directly, with no detail form — hence `gridOnly`.

### Controls found along the way

- an **in-cell DDDW**: Family Hx edits Relationship through a single-column
  dropdown grid inside the row
- a **DDDW's selected row is navy with white text**
- an **out-of-range result paints its row yellow**, and the Ref. Ranges
  fields are yellow too

### Coverage

86 tree nodes across 7 modules resolve to **77 distinct window captions**,
swept with zero React errors.

### Still unbuilt

`action-linked-goals` · `risk-linked-goals` · `health-issues-linked-goals` —
all three are the care-plan read-only Linked-X tab with a different column set,
so they are config, not new layout. `provider-daybook-right` and
`resource-daybook-right` are the same windows scrolled sideways.
`scheduler-group-bookings-providers` / `-resources` are served by the generic
tab already in `GroupVisitView`. `goal-saved` and `encounter-service-event-editor`
are state variants of screens that exist.

What is genuinely unbuilt is only the encounter detail tabs that were never
captured populated (`Encounter Summary`, `Encounter Forms`) and the Demographics
tabs behind `Patient Detail`, `ID Alias`, `Connections`, `Services`,
`Associated Parties`, `WCB Claims` and `Other Claims` — none of which appear in
the screenshot set.

### Components added while building these

| component | came from |
|---|---|
| `PBMessageBox` | the "Register Table - Field" box in `benefit-editor-populated` |
| `PBSection` | the rule-separated groups on Quantitative Settings and the benefit editor |
| `PBDataWindow` `groupBy` | the `GOALS` / `MSP` group bands |
| `PBDataWindow` `rowStatus: 'highlight'` | the yellow linked rows |
| `PBDataWindow` `rowIcon` | the recurrence mark in Group Visit List |
| `PBSpinner` | needed somewhere for XP.css's spinbox chevrons |
| two-line column captions | `Quantitative Goal`, `Show on Demo`, `Tagged to Care Plan` |

### Details worth noting for the next pass

- **Tab strips come in two flavours.** Order and Demographics size tabs to
  their captions; Notification and Group Visit List stretch them to fill the
  strip. Hence `.pb-tabs__strip--justified`.
- **The gutter can carry a glyph.** Group Visit List shows a small clock/
  recurrence mark on series rows — see the `rowIcon` prop on `PBDataWindow`.
- **Demographics has an 11-tab strip** and a distinct identity line that leads
  with `CHART:` rather than `FIRST:`.
- **A focused command button** draws a blue Win10 focus rectangle — visible on
  `Save` in `incentive-claim-populated.png`.

## 4. The design-width pass (Demographics, Order, Patient Summary)

Seven new captures: `demographics-full.png`, the five Order tabs
(`order-report`, `order-distribution`, `order-links`, `order-office-notes`,
`order-history`) and `patient-summary-header.png`.

> **Correction (2026-09-20): these captures are 2x, not 1.5x.** Measured three
> ways in `patient-summary-loaded.png`: the Win10 caption buttons pitch 90.75
> device px against the OS's fixed 45; the tree's scrollbar track is 32 device
> px against the OS's 16; and the four summary captions sit at device
> 398 / 540 / 1234 / 1812, exactly twice the 199 / 270 / 617 / 906 that
> `patient-summary-3598.png` and `-3924.png` — captures of the same window at
> 1000 CSS px — put them at. `patient-summary-header.png` has pixel-identical
> command buttons, so it is the same scale.
>
> Every measurement in the rest of this section was taken as capture ÷ 1.5 and
> is therefore **4/3 too large**; the offsets below (`114 / 243 / 363`, the
> insurance column at 618, the ~1056px design widths) have not been redone.
> Patient Summary's grid has since been re-measured at 2x and now carries the
> painted pixels; Demographics and the Order tabs have not. Measure ÷ 2.

### The windows do not stretch

This is the thing the kit had most obviously wrong. A PowerBuilder window is
painted at one size and only the controls anchored to the right edge grow with
the frame. Every capture shows the same shape on a wide monitor: content on
the left, empty window face on the right.

- Demographics and Order are painted at **~1056px**; Patient Summary's chart
  block runs to **1042** and its command row's buttons stop at **978**.
- `--pb-design-w` + `.pb-fixed` (`PBFixed`) opt a block into that width.
- Some controls in the captures really are anchored: the Order list's grid
  canvas and scrollbar reach the frame while its columns stop where they were
  painted (`reference/order-report.png` past x=1975 is white, not face). The
  kit does **not** reproduce that. A single block running past every other one
  reads as a layout bug on a 1900px stage, so every window stays at its design
  width. If it is ever wanted back, it is a `width: auto` table inside a
  full-width `.pb-dw`.
- The identity strip was spreading its fields across the full width with
  `margin-left: auto`. It is painted at fixed offsets: on Order, FIRST at 9,
  MIDDLE 195, LAST 340, DoB 548, `Active ENC#` 661. Fields now carry a `w`.

### The Win32 GroupBox was missing

Demographics and the Order report page are built from the plain rectangle with
a navy caption set into its top border — not the banded `.pb-groupbox` the kit
had. Added as `PBGroup` / `.pb-fieldset`, a real `<fieldset>`/`<legend>` so the
border breaks around the caption for free.

### Order's tab pages belong to the order, not the window

The five captures are one window with a different row current, and the tab
captions count *that* row's children. `orderRows` therefore carries
`detail` / `distribution` / `linkRows` / `notes` / `history`, and the window
recomputes the captions from the current row. Chart 3424's 2024.10.03
CONSULTATION reproduces the capture exactly: Distribution (2), Links (0),
Office Notes (1), History (2).

Distribution and Links use a **grey** header band, not the DataWindow blue;
Office Notes and History keep the blue. A distribution event is a group band
carrying the document as a bold hyperlink and `Distributed By:` at the right,
with each recipient painted yellow underneath. `--pb-dw-highlight` was too pale
(`#ffffcc`) against both captures and is now `#ffff99`.

### Measured, not guessed

| block | label col | field col | notes |
|---|---|---|---|
| Demographics left groups | 117 | 377 | group inner 500, padding 10 |
| Demographics right groups | 114 | 378 | `Last Contact` / `Invoice Balance` are captioned *above* their fields |
| Order ▸ Detail Information | 120 | 347 + `…` | right sub-column right-aligned, fields 152 |
| Patient Summary header | 114 | fields at 114/243/363, insurance col at 618 | `Service Provider` ends at 1036 |

The Patient Summary status letter is an outline on the window gradient, not a
white edit field — sampling `patient-summary-header.png` at x=317 shows the
gradient straight through the box, so it is no longer a `PBSelect`.

### Still unbuilt

The Demographics tabs behind `Patient Detail`, `ID Alias`, `Connections`,
`Services`, `Associated Parties`, `WCB Claims` and `Other Claims` remain
placeholder column sets — no capture of them exists. The Order list's detail
band measures ~21px in the captures against the kit's 18px default; left alone
rather than diverging one grid from the rest of the kit.

### The chart is the window's only source

Demographics used to be half transcription: the pharmacy block, the Selected
Items grid and the Created / Last Modified line were window-level constants in
`data/mois.tsx`. That is wrong twice over — it cannot show a host's chart, and
on any chart but 3424 it printed somebody else's pharmacy.

They are fields on the chart record now (`data/patients.ts`), and the window
renders whatever the open chart carries, empty where it carries nothing. The
training roster fills 3424 from `demographics-full.png`, so the standalone
gallery still opens on the captured window. A host supplies its own: Webforms
projects them out of the same `PatientScenario` a form binds against, so the
emulator and a form bound to that chart cannot disagree.

Only the drop-down contents — carriers, genders, statuses, service providers,
facilities, countries, preferred-phone list — stay in `data/mois.tsx`, because
those belong to the installation rather than to a patient.

### Patient Summary's hyperlink column

The summary grid's four columns are painted, not elastic. Leaving `detail`
without a width made it swallow every spare pixel, which moves the other
columns whenever the window resizes.

The capture pins them. Its caption blocks sit at 9..54, 144..270, 846..909 and
1332..1440 of the grid; Date and Description are left-aligned in their columns
and Detail and Hyperlink centred, and one set of widths fits all four:

    Date 0..140 | Description 140..614 | Detail 614..1140 | Hyperlink 1140..1632

A trailing `_pad` column takes whatever the window has past 1632, so the
columns hold those positions while the group bands still run the full width.

Measuring this the first time by clustering ink columns gave 0 / 107 / 570 /
955 and was wrong — the clusters merged the tree panel with the Date caption
and split Description. Reading the header band as coarse ASCII (see the
`ascii` probe idea in the design-width section) and checking all four captions
against one candidate fit is the reliable way.

The cell itself is **MOIS's own "go to record" glyph and nothing else** — no
label. `public/img/GotoRecord.png` in the Webforms repo is the same asset
`ActionGotoRecord` and `LinkToMois` render inside a real form, so a summary row
jumping into Care Plan and a form's link-to-MOIS button show one icon. It is
vendored as `src/pb/glyphs/goto-record.png` rather than referenced at
`/img/…` so the standalone Vite viewer still renders it, and it is applied as
a CSS background (`.pb-link--mois`) rather than an `<img>` because that path is
already proven in both bundlers. The module name stays as the tooltip and the
accessible name.

## 5. The menus (`reference/menus/`)

Seven captures of the frame's drop-downs — `record` `modules` `views` `action`
`utilities` `print` `maintenance` — at the same 2x the rest of the set is at,
so every figure below is the capture ÷ 2.

### A menu is a window, not a box

The kit drew both the bar's menus and a DDDW's dropped list as
`position: absolute` children of the control they hang off. In Win32 they are
top-level windows painted over the *screen*, and the difference shows the
moment a menu is longer than the frame has room for: `.pb-window` is
`overflow: hidden`, so Views lost its bottom third and the Gender list
disappeared under the status bar.

`src/pb/popup.tsx` portals a popup onto the nearest `.pb-desktop` instead —
the monitor for the standalone viewer, the stage box when Webforms embeds the
shell — and places it from the anchor's rect: a bar menu drops and, with no
room, flips up over its caption; a fly-out swaps to the other side; anything
taller than the screen itself fills it and scrolls. `PBDropDownDataWindow`'s
`popup="fixed"` escape hatch is gone with it, since every list now escapes.

Two things it has to get right beyond placement. A click-away handler can no
longer ask "is the target inside me?", because the menu is no longer a
descendant — hence `data-pb-popup` and `pbInPopup()`, without which mousedown
closed the menu before the item's click could fire. And `PBMenuList` no longer
closes its fly-out on `mouseleave`: the pointer now leaves the parent panel on
its way *into* the fly-out. A Win32 menu keeps a fly-out up until another item
is hovered anyway, which is what the remaining `onMouseEnter` does.

### What the panel measures

Item pitch is 44 device px in all seven, and panel height is
`items × 44 + separators × 14 + 7` exactly: Record's nine captions give 403,
Maintenance's three 139, Action's twelve items and four separators 591. So the
item is 22px, a separator band 7px, and the panel carries 2px of padding
inside a 1px `#cdcdcd` frame.

    caption inset 34px from the inside edge (2px panel pad + 32px item pad)
    right pad     20px to the end of an accelerator
    separator     1px #d9d9d9, 30px in from the left, 2px from the right
    font          Segoe UI 13px — caps measure 18-19 device px, against the
                  title bar's 17 in the same captures, so the bar and its
                  menus are a size above `--pb-fs-chrome` (`--pb-fs-menu`)
    bar item      8px of padding a side: the eight captions span 417px

### Width is a column, not a row

A Win32 menu is as wide as its widest caption *plus* its widest accelerator
even when no one item carries both, and it reserves the accelerator column
whether or not the menu has any:

| menu | widest caption | widest key | panel |
|---|---|---|---|
| Record | `Find First` 47 | `Ctrl+N` 35 | 34 + 47 + 35 + 35 + 20 = **172.5** (measured 173) |
| Action | 161 | `Ctrl+Shift+R` 65 | **316** (measured 315.5) |
| Modules | `Administration` 78 | — | **168** (measured 166.5) |
| Maintenance | 107 | — | **197.5** (measured 196.5) |
| Views | `Determinants Of Health` 123 | `Alt+C` 31.5 | **262** with the fly-out column (measured 261.5) |

The gap between the two columns is 35px, and 51px in a list with fly-outs —
the arrow itself is painted out in the right pad, 11px in from the inside
edge, but the gap opens by its width all the same.

A flex row cannot see across its siblings, so `.pb-menu` carries a
zero-height `.pb-menu__sizer` row of the two columns stacked; it measures and
never paints. Every menu lands within 1.5px of its capture **on Windows**. On
a machine without Segoe UI the panels come out ~7% wide — the fallback is
Arial, which sets `Determinants Of Health` at 135.8px against Segoe UI's 123.5
— the same rasterisation gap `text.css` describes for the client area, and
the same fix would apply (a bundled metric-compatible face, e.g. Selawik).

### Still open

The bar's own height measures 18px against the kit's `--pb-menubar-h: 22px`,
and its captions sit ~6px higher under the title bar than the Patient Summary
captures put them. Left alone: the frame's vertical layout below the bar is
calibrated against those captures, and moving it would shift every screen.
