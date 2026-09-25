import { useState } from 'react'
import { PBDataWindow, PBViewHeader, pbSlug, usePBInstrumentation } from '../pb'
import { REPORT_FOLDERS, reportRows, type ReportRow } from '../data/reportCatalogue'
import { REPORT_WINDOWS } from '../data/reportParams'
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
   ========================================================================= */

/** Folders start shut, the way the module opens. */
const ALL_SHUT = new Set<string>(REPORT_FOLDERS)

export function ReportListView({ onRun }: { onRun?: (row: ReportRow) => void }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(ALL_SHUT)
  const [cur, setCur] = useState(-1)
  const openWindow = useOpenWindow()
  const host = usePBInstrumentation()
  const current = reportRows[cur]
  useScreenReport({ row: current ? pbSlug(current.name) : '' })
  const run = (row: ReportRow) => {
    onRun?.(row)
    const window = REPORT_WINDOWS[pbSlug(row.name)]
    if (!window) return
    host?.report('openUtility', { window })
    openWindow(window)
  }

  return (
    <>
      <PBViewHeader title="Report List" />
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3 }}>
        <PBDataWindow
          rows={reportRows}
          current={cur}
          onCurrentChange={setCur}
          onActivate={(row) => run(row)}
          groupBy={(row) => row.folder}
          groupLabel={(folder) => folder}
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
          rowTutorialId={(row) => `host.mois.row.${pbSlug(row.name)}`}
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
