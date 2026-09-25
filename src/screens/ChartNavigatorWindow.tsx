import { useState } from 'react'
import { PBButton, PBCheckbox, PBDataWindow, PBWindow } from '../pb'
import { chartNavigatorRows, type ChartNavigatorRow } from '../data/chartUtilities'
import { useScreenReport } from '../host/screen-state'

/* ============================================================================
   Chart Navigator.

   A loaded list of charts you can flip through one at a time, and the window
   a Mail Merge is started from. Two ways in: the `Chart Navigator` button on
   Find Patient, or Demographics ▸ Taskbar `Utilities` ▸
   `Chart Navigator - Load from File`, which opens a `Select File` common
   dialog for a one-column CSV or .txt headed `CHART` or `PHN`.

   It is the one window in this family with a full Win7 Aero caption —
   minimize, maximize *and* close, where the rest have only ✕ — and the one
   with no Ok / Cancel: `Print List` bottom-left, `Mail Merge...` bottom-right,
   and the ✕ is how it is dismissed. Alt + Tab moves between it and the main
   MOIS window.

   PROVENANCE: `303794 / 963fcbd704d2` @1.00x, 864x514, title bar 28 tall;
   button row from `303794 / cda6b53915c0` (a ≈0.45x composite — the two
   buttons' captions and corners are readable, their sizes are not).
   ========================================================================= */

const W = 864
const H = 514
const TITLEBAR_H = 28

export function ChartNavigatorWindow({ rows = chartNavigatorRows, onOpenChart, onMailMerge, onPrintList, onClose }: {
  rows?: ChartNavigatorRow[]
  /** flipping to a chart: the caller opens it in the Patient Chart module */
  onOpenChart?: (chart: string) => void
  onMailMerge?: () => void
  onPrintList?: () => void
  onClose: () => void
}) {
  const [current, setCurrent] = useState(0)
  const [excluded, setExcluded] = useState<Set<string>>(new Set())

  const toggle = (chart: string) => setExcluded((prev) => {
    const next = new Set(prev)
    next.has(chart) ? next.delete(chart) : next.add(chart)
    return next
  })
  /* how many charts are loaded and excluded, and which is current — a Mail
     Merge lesson grades the Exclude it asked for */
  useScreenReport({ navigatorRows: rows.length, excluded: excluded.size, navigatorChart: rows[current]?.chart ?? '' })

  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 80 }}>
      <PBWindow
        child
        /* the full Aero caption: minimize and maximize as well as close */
        title="Chart Navigator"
        onClose={onClose}
        style={{ width: W, height: H, ['--pb-titlebar-h' as string]: `${TITLEBAR_H}px` }}
      >
        <div
          data-tutorial-id="host.mois.dialog.chart-navigator"
          style={{
            display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0,
            background: 'var(--pb-face)', padding: 8, gap: 8,
          }}
        >
          {/* The grid is the window's only body content. Its column widths are
              the capture's; its x origin there (214) is a screen coordinate,
              not an offset inside the window, so only the widths carry over
              and the grid is left-aligned in the frame. The row-marker column
              measures 16 in the capture against the kit's fixed 13px gutter. */}
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
            <PBDataWindow
              rows={rows}
              current={current}
              onCurrentChange={setCurrent}
              onActivate={(r) => onOpenChart?.(r.chart)}
              rowTutorialId={(r) => `host.mois.row.navigator-${r.chart}`}
              columns={[
                { key: 'chart', header: 'Chart', width: 64 },
                /* MOIS renders this LAST,FIRST with no space */
                { key: 'name', header: 'Patient Name', width: 184 },
                /* auto-filled `Loaded Chart Number:<n>` */
                { key: 'description', header: 'Description', width: 240 },
                {
                  key: 'exclude',
                  header: 'Exclude',
                  width: 49,
                  align: 'center',
                  /* a checkbox cell; every row is unchecked by default */
                  render: (r) => (
                    <PBCheckbox
                      tutorialId={`host.mois.cell.exclude-${r.chart}`}
                      checked={excluded.has(r.chart)}
                      onChange={() => toggle(r.chart)}
                    />
                  ),
                },
              ]}
              empty="No charts loaded."
              style={{
                flex: '1 1 auto', minWidth: 0,
                /* v2.20 chrome: 15px row pitch under a 16px header band */
                ['--pb-dw-row-h' as string]: '15px',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', flex: 'none' }}>
            <PBButton
              data-tutorial-id="host.mois.command.navigator-print-list"
              onClick={onPrintList}
            >
              Print List
            </PBButton>
            <span style={{ flex: '1 1 auto' }} />
            <PBButton
              data-tutorial-id="host.mois.command.mail-merge"
              onClick={onMailMerge}
            >
              Mail Merge...
            </PBButton>
          </div>
        </div>
      </PBWindow>
    </div>
  )
}
