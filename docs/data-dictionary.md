# MOIS Data Dictionary on the stage

The MOIS Data Dictionary is the workbook that maps every MOIS field to where it
is stored: a navigation path (Module ▸ Folder ▸ Sub Folder ▸ Tab ▸ … ▸ Field
Heading ▸ Field) beside a Table Name and Field Name. In August 2026 a field
audit walked its `Matrix` sheet in MOIS DEV. For each field it focused the
control, pressed **Ctrl+Shift+A**, and recorded what MOIS answered, with
screenshot evidence for every row (`~/github/Mois/outputs/019ff32b…/`).

The emulator uses that audit three ways.

## 1. The data — `src/data/dataDictionary.generated.ts`

```bash
python3 scripts/embed-data-dictionary.py ~/github/Mois/outputs/019ff32b-2bb1-77f1-9a9f-e3eed4bd4978
```

The script writes one entry per audited workbook row (1,074 of them), keyed by
the audit's evidence ID (`MATRIX-R0008-chart-no`, the Matrix sheet's Excel row
and the field). Each entry holds:

- the workbook path;
- what the workbook records: table, field, type, format, length and the
  analysts' note on how the field behaves ("Only available with Order Type:
  'Lab'"; 142 rows have one);
- the table and column(s) MOIS named;
- the audit status;
- MOIS's answer (`audit`). This is one of:
  - `not-available` (a column was named);
  - `register` (only the registration prompt);
  - `report` (a registered field);
  - `none` (no dialog);
  - `untested` (no answer is known).

The audit's free-text notes describe its synthetic DEV records, so they are
left behind. `Matrix (2)` is an older draft of the sheet; its 32 extra rows
carry no mapping, so it is not read. The 2026-09-21 live TRAINING rechecks are
applied in the script (`RECHECKS`). Webforms keeps the same audit in
`data/mois-field-audit/catalog.json`, and its `mois-data-dictionary` test
checks that the two copies agree.

`src/data/dataDictionary.ts` joins the entries to the frame:

- `entryNode` gives the navigator node a row's folder path names.
- `resolveDictionaryEntry` finds the row for a control on screen.
- `auditAnswer` gives what MOIS shows for a row.

## 2. Ctrl+Shift+A — `src/host/field-audit.ts`, `src/screens/FieldAuditWindows.tsx`

Put the cursor in a field, or click a grid cell, and press Ctrl+Shift+A. This
works in the work area and in raised windows alike, as it does in MOIS.

- **An unregistered field** shows *Audit Information Not Available*, naming the
  Table Name and Field Name. OK then raises *Register Table - Field*.
- **Yes on that prompt** registers the field for the session. Its next
  Ctrl+Shift+A opens the *Change Audit Report* print preview, which is blank
  because the stage records no change history.
- **A field the audit got no answer for** shows the workbook's mapping where
  the workbook names a real column. It is reported with `source: 'workbook'`.

How a control finds its row:

- A `data-mois-audit-id` on the control, or on its grid column's `auditId`,
  names the row outright.
- Otherwise the row is found from what is on screen:
  - the caption painted beside the control, or the column header over a cell;
  - the caption before that one, so `Date:` after `Perform By:` is the
    composite `Perform By:Date/Tme`, part by part;
  - the selected tabs around the control;
  - the pop-out window holding it;
  - the group box it sits in.
- A same-named field on another tab never matches.
- A caption painted twice on a page takes the workbook's rows in order.
- When nothing on the page matches exactly, a looser reading is tried:
  - abbreviations, word for word (`Diag Desc.`, `eMail (H)`);
  - the field's leading words (`Home` for `Home Phone`);
  - one-letter typos (`Prefered`).

The shell reports the lookup as `host.mois.fieldAudit {entry, answer}` and
`host.fieldAudit.*` state, and replays it from `entry` alone.

## 3. Coverage — `scripts/data-dictionary-coverage.mjs`

```bash
pnpm dev   # in another terminal
node scripts/data-dictionary-coverage.mjs [--url http://localhost:5180/] [--charts 3924,87288,2429,3598] [--json out.json]
node scripts/data-dictionary-coverage.mjs --nodes imaging,mar   # a quick partial run; leaves the report alone
```

A full run takes about 15 minutes.

The script crawls the dev server with Playwright. For each node the dictionary
has rows under, it:

- opens the node on each chart;
- opens every tab, including hand-drawn strips;
- opens the pop-out windows in its `OPENERS` table. For Imaging, Procedures and
  Facility Admissions it presses New Record instead: none of the crawled
  charts has a record there, and MOIS draws those folders' Report / Detail
  pages blank with no row, so an unsaved row is the only way to reach the
  fields (the field audit used the same move);
- asks the lookup about every control on screen.

It writes `docs/data-dictionary-coverage.md`, which lists:

- the rows reached, per node;
- the rows not reached: either the stage does not draw the field, or a caption
  needs a `data-mois-audit-id`;
- the captions on screen with no row;
- the lookups that page order decided.

Regenerate it after changing a screen or the dictionary.

## In Webforms

The stage's **Field connections** explorer
(`components/tutorials/host-stage/mois-field-explorer.tsx`) uses the same
lookup:

- *Select on screen* outlines and selects any control the dictionary resolves.
- A field's detail says what Ctrl+Shift+A answers for it.
- *Show on screen* opens the field's node and tab, and rings the control.

The checks in `lib/host-emulators/__tests__/mois-data-dictionary.test.tsx` also
compare the chart import's column map (`src/data/charts/to-rows.ts`) with the
columns MOIS verified.
