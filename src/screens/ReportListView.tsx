import { useState } from 'react'
import { PBDataWindow, PBInput, PBViewHeader, pbSlug, usePBInstrumentation } from '../pb'
import { REPORT_FOLDERS, reportRows, type ReportRow } from '../data/reportCatalogue'
import { REPORT_WINDOWS } from '../data/reportParams'
import { reportSpecFor, reportSpecWindow } from '../data/reportSpecs'
import { useScreenReport } from '../host/screen-state'
import { useOpenWindow } from './areaWindowRegistry'

/* ============================================================================
   Report List — the whole Reports module.

   Unlike every other module, Reports puts nothing in the navigator but a
   single `Report List` node: the catalogue itself is the work area, sixteen
   folders each with a +/- box and a report per row underneath carrying its own
   description. Transcribed from `DynamicForms1.png` and the four other tree
   captures cited in `data/reportCatalogue.ts`.

   A report is run by double-clicking its row, which in MOIS opens that
   report's Selection Parameter dialog. The rows the lessons run open their
   window by id (data/reportParams `REPORT_WINDOWS` → the frame's
   `openWindowById`); the double-click reports `host.mois.openUtility` with
   that window, the same action a replayed step performs. The current row
   (orange, #f7c7bd) is reported as `host.screen.row`, so `host.mois.selectRow`
   can be graded.

   Find: the live DEV client (v02.31.23, 2026) shows a `Find:` box over the
   catalogue — ~/github/Mois/references/reports.md "Report List" ("Controls:
   `Find:` search field. Expandable report categories.") and
   module-overview.md ("`Report List` with `Find:` filter"). The manual's
   captures of this grid all read v02.17.20 (data/reportCatalogue.ts), which
   predates it. INFERRED: its strip and width, drawn the way System Settings
   puts Find (a label and a box filling the row), and what it matches — a
   report's name or description, showing the matches under open folders the
   way System Settings' Find does (`0f26ee79…`).

   GEOMETRY (2026-10-03 fidelity pass). Measured 1:1 off 304051 `a2d6ecd3`
   (v02.17.20) and checked against the current build, Drive `MOIS
   Screenshot/` 2026-08-11 3.38.31 PM (v02.31.23, a video frame at ≈1.2×):
   · the view header is GREY, not navy — #848284 between 1px black rules,
     26px overall (both captures; the navigator's `Reports` stays navy);
   · the catalogue is one white box, #646464-ruled, 4px in from the work
     area's sides and bottom and flush under the header. In v02.31.23 the
     `Find:` strip is the top of that box — 26px of white over a rule — with
     the label 9px in and a 522px box at 39px (3.38.31 PM; the rule's grey is
     INFERRED, the video blurs it);
   · a folder band is 24px — 2px of white, then 22px of #cedfff — with no
     rule under it; its box sits 12px in and its caption 29px in;
   · a report row is 22px — 2px white, 19px of fill, 1px white — and the
     zebra restarts under every band: a folder's first report is white, its
     second #efebef. The name is set 29px in (under the folder caption), the
     description at 274px. No column rules.
   The kit's DataWindow is 20px rows with hairlines and a whole-grid zebra,
   so the catalogue's own sizes are a scoped stylesheet (RL_CSS) — a
   PBDataWindow / PBViewHeader prop candidate.
   ========================================================================= */

const RL_CSS = `
.rl-view > .pb-viewhead { background: #848284; height: 26px; box-sizing: border-box; border-top: 1px solid #000; border-bottom: 1px solid #000; }
.rl-box { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; margin: 0 4px 4px; border: 1px solid #646464; background: #fff; }
.rl-find { display: flex; align-items: center; gap: 0; height: 26px; padding-left: 9px; border-bottom: 1px solid #a0a0a0; flex: none; box-sizing: border-box; }
.rl-box .pb-dw__table > tbody > tr:nth-child(n) { background: #fff; }
.rl-box .pb-dw__table > tbody > tr.rl-alt:nth-child(n) { background: #efebef; }
.rl-box .pb-dw__table > tbody > tr.is-current:nth-child(n) { background: #f7c7bd; }
.rl-box .pb-dw__table > tbody > tr.pb-dw__group:nth-child(n) { background: #cedfff; }
.rl-box .pb-dw__table > tbody > tr > td {
  height: 22px; border-right: 0; padding: 0 4px;
  background-image: linear-gradient(#fff 0 2px, transparent 2px 21px, #fff 21px 22px);
}
.rl-box .pb-dw__table > tbody > tr:not(.pb-dw__group) > td:first-child { padding-left: 29px; }
.rl-box .pb-dw__table > tbody > tr.pb-dw__group > td {
  height: 24px; padding: 2px 4px 0 12px; border-bottom: 0;
  background-image: linear-gradient(#fff 0 2px, transparent 2px);
}
.rl-box .pb-dw__groupcell { gap: 8px; }
`

/** Folders start shut, the way the module opens. */
const ALL_SHUT = new Set<string>(REPORT_FOLDERS)
const SHARED_NAMES = new Set(reportRows.map((r) => r.name).filter((n, i, all) => all.indexOf(n) !== i))

export function ReportListView({ onRun }: { onRun?: (row: ReportRow) => void }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(ALL_SHUT)
  const [cur, setCur] = useState(-1)
  const [find, setFind] = useState('')
  const openWindow = useOpenWindow()
  const host = usePBInstrumentation()
  const term = find.trim().toLowerCase()
  const rows = term
    ? reportRows.filter((r) => r.name.toLowerCase().includes(term) || (r.desc ?? '').toLowerCase().includes(term))
    : reportRows
  const current = rows[cur]
  useScreenReport({ row: current ? pbSlug(current.name) : '' })
  const run = (row: ReportRow) => {
    onRun?.(row)
    /* the hand-built windows first, then the report's spec
       (data/reportSpecs, drawn by screens/ReportSpecWindow.tsx) */
    const spec = reportSpecFor(row.folder, row.name)
    const window = REPORT_WINDOWS[pbSlug(row.name)] ?? (spec ? reportSpecWindow(spec) : undefined)
    if (!window) return
    host?.report('openUtility', { window })
    openWindow(window)
  }

  /* the zebra restarts under every band (a folder's first report is white) */
  const alt = new Set<ReportRow>()
  rows.forEach((r, i) => {
    let n = 0
    for (let j = i - 1; j >= 0 && rows[j]!.folder === r.folder; j--) n++
    if (n % 2) alt.add(r)
  })

  return (
    <div className="rl-view" style={{ display: 'contents' }}>
      <style>{RL_CSS}</style>
      <PBViewHeader title="Report List" />
      <div className="rl-box">
        <label className="rl-find">
          <span style={{ width: 30, flex: 'none' }}>Find:</span>
          <PBInput
            aria-label="Find report"
            data-tutorial-id="host.mois.field.report-find"
            value={find}
            onChange={(event) => { setFind(event.target.value); setCur(-1) }}
            style={{ width: 522, minWidth: 0, flex: '0 1 auto' }}
          />
        </label>
        <PBDataWindow
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
          onActivate={(row) => run(row)}
          groupBy={(row) => row.folder}
          groupLabel={(folder) => folder}
          collapsed={term ? new Set<string>() : collapsed}
          onCollapsedChange={setCollapsed}
          /* a name two folders share (Bills ▸ MSP / Practice Private) takes
             its folder as a prefix, so each row has its own anchor */
          rowTutorialId={(row) => `host.mois.row.${SHARED_NAMES.has(row.name) ? `${pbSlug(row.folder)}-` : ''}${pbSlug(row.name)}`}
          groupTutorialId={(folder) => `host.mois.group.${pbSlug(folder)}`}
          rowClassName={(row) => (alt.has(row) ? 'rl-alt' : undefined)}
          /* the catalogue has no column-header row: the first band sits
             under the Find strip (v02.31.23) — under the view header in
             v02.17.20 (art. 304051) */
          head={false}
          /* no row-pointer gutter: the folder's box is drawn inside its band */
          gutter={false}
          flush
          /* the Reports catalogue's colours: band #cedfff, stripe #efebef,
             current row #f7c7bd (art. 304051 / 304030 / 304057), painted by
             RL_CSS above */
          columns={[
            /* the description starts 274px in (29px indent + the name) */
            { key: 'name', header: '', width: 270 },
            { key: 'desc', header: '', render: (r) => r.desc ?? '' },
          ]}
        />
      </div>
    </div>
  )
}
