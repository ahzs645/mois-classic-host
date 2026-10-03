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
   ========================================================================= */

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

  return (
    <>
      <PBViewHeader title="Report List" />
      <label className="pb-row" style={{ gap: 3, padding: '3px 4px 0', flex: 'none' }}>
        Find:
        <PBInput
          aria-label="Find report"
          data-tutorial-id="host.mois.field.report-find"
          value={find}
          onChange={(event) => { setFind(event.target.value); setCur(-1) }}
          style={{ flex: 1, minWidth: 0 }}
        />
      </label>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3 }}>
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
          /* the catalogue has no column-header row: the first band sits one
             pixel under the view header (art. 304051). Name is 275px and
             Description takes the rest, both measured 1:1. */
          head={false}
          /* the Reports catalogue does not use the ordinary DataWindow pair:
             its band is #cedfff, its stripe #efebef and its current row
             #f7c7bd (art. 304051 / 304030 / 304057) */
          style={{
            ['--pb-dw-group' as string]: '#cedfff',
            ['--pb-dw-row-alt' as string]: '#efebef',
            ['--pb-dw-select' as string]: '#f7c7bd',
          }}
          columns={[
            { key: 'name', header: '', width: 275 },
            { key: 'desc', header: '', render: (r) => r.desc ?? '' },
          ]}
        />
      </div>
    </>
  )
}
