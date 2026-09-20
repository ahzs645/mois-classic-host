import { useMemo, useState } from 'react'
import {
  PBBand, PBButton, PBDataWindow, PBDropDownDataWindow, PBInput, PBWindow, type PBColumn,
} from '../pb'
import { chartStatusRows } from '../data/mois'
import { patients as fallbackRoster, type Patient } from '../data/patients'

/* ============================================================================
   Advanced Lookup Service — the Patient Chart List.

   What the "…" beside Chart No. opens, and what Go To Chart… and Record ▸ Find
   open too. Every chart in the frame's roster is listed; the boxes above the column
   headers filter it as you type, a row is picked with Ok or a double-click,
   and the pick is what changes the chart the whole module is showing.

   PROVENANCE: transcribed from `reference/advanced-lookup-service.png` —
   columns, their order, the filter strip (which has no box over Middle Name),
   the description pane and the six buttons.
   ========================================================================= */

type Key = 'status' | 'last' | 'first' | 'middle' | 'dob' | 'home' | 'chart' | 'alias' | 'insurance' | 'insuranceBy' | 'bchn' | 'note' | 'location'

/* Widths read off the capture's own column rules (the etched white lines in
   `advanced-lookup-service.png`, at logical x = 26, 72, 167, 262, 333, 400,
   486, 550, 655, 736, 776, 857, 990, 1107). Chart Loc. is left unsized so the
   13 columns always add up to the dialog's width instead of scrolling — the
   measured 117 is what the slack comes to. */
/* Every column filters — the capture has 13 boxes above 13 columns. */
const COLUMNS: { key: Key; header: string; width?: number; filter: boolean }[] = [
  { key: 'status', header: 'Status', width: 46, filter: true },
  { key: 'last', header: 'Last Name', width: 95, filter: true },
  { key: 'first', header: 'First Name', width: 95, filter: true },
  { key: 'middle', header: 'Middle Name', width: 71, filter: true },
  { key: 'dob', header: 'DoB', width: 67, filter: true },
  { key: 'home', header: 'Home', width: 86, filter: true },
  { key: 'chart', header: 'Chart No', width: 64, filter: true },
  { key: 'alias', header: 'Alias', width: 105, filter: true },
  { key: 'insurance', header: 'Insurance', width: 81, filter: true },
  { key: 'insuranceBy', header: 'By', width: 40, filter: true },
  { key: 'bchn', header: 'BCHN', width: 81, filter: true },
  { key: 'note', header: 'Note', width: 133, filter: true },
  { key: 'location', header: 'Chart Loc.', filter: true },
]

const PAGE = 12

export function AdvancedLookupDialog({ chart, roster = fallbackRoster, onPick, onClose }: {
  /** the chart that is open, so the list lands on it */
  chart: string
  /** the charts on file; omitted = the transcribed training roster */
  roster?: Patient[]
  onPick: (chart: string) => void
  onClose: () => void
}) {
  const [filters, setFilters] = useState<Partial<Record<Key, string>>>({})

  const rows = useMemo(() => roster.filter((p) => (
    COLUMNS.every(({ key }) => {
      const want = filters[key]?.trim().toUpperCase()
      if (!want) return true
      return String(p[key as keyof Patient] ?? '').toUpperCase().includes(want)
    })
  )), [filters, roster])

  const [current, setCurrent] = useState(() => Math.max(0, roster.findIndex((p) => p.chart === chart)))
  const row = rows[Math.min(current, rows.length - 1)]

  const step = (delta: number) => setCurrent((i) => Math.max(0, Math.min(rows.length - 1, i + delta)))

  const columns: PBColumn<Patient>[] = COLUMNS.map((c) => ({
    key: c.key,
    header: c.header,
    width: c.width,
    align: c.key === 'status' || c.key === 'insuranceBy' ? 'center' : 'left',
  }))

  const filterRow = COLUMNS.map((c) => {
    if (!c.filter) return null
    const set = (v: string) => setFilters((f) => ({ ...f, [c.key]: v }))
    if (c.key === 'status') {
      return (
        <PBDropDownDataWindow
          key={c.key}
          w="100%"
          value={filters.status ?? ''}
          display="code"
          columns={[{ key: 'code', header: 'St', width: 44 }, { key: 'status', header: 'Chart status' }]}
          rows={chartStatusRows}
          onSelect={(row) => set(String(row.code))}
        />
      )
    }
    return <PBInput key={c.key} value={filters[c.key] ?? ''} onChange={(e) => set(e.target.value)} />
  })

  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 80 }}>
      <PBWindow
        child
        controls={false}
        title="Advanced Lookup Service"
        onClose={onClose}
        style={{ width: 'min(1120px, calc(100vw - 60px))', height: 'min(620px, calc(100vh - 80px))' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, padding: 8, gap: 6 }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, border: '1px solid var(--pb-border)' }}>
            {/* the capture rules the band off from the filter strip below */}
            <div className="pb-band--ruled">
              <PBBand>Patient Chart List</PBBand>
            </div>
            <PBDataWindow
              flush
              rules="white"
              /* the list fills the dialog: MOIS shows the empty rows below the
                 last match rather than shrinking the box to fit them */
              style={{ flex: '1 1 auto', minHeight: 0 }}
              columns={columns}
              rows={rows}
              filters={filterRow}
              current={Math.min(current, Math.max(0, rows.length - 1))}
              onCurrentChange={setCurrent}
              onActivate={(r) => onPick(r.chart)}
              empty="No chart matches those filters."
            />
          </div>

          {/* the pane MOIS explains the current list in */}
          <div
            className="pb-field"
            style={{ height: 64, flex: 'none', padding: '3px 5px', whiteSpace: 'pre-wrap', background: '#fff' }}
          >
            ALL Patient charts.
          </div>

          <div style={{ display: 'flex', alignItems: 'center', flex: 'none' }}>
            <PBButton wide onClick={() => setCurrent(0)}>Home</PBButton>
            <PBButton wide onClick={() => step(-PAGE)}>PgUp</PBButton>
            <span style={{ flex: '1 1 auto' }} />
            <PBButton
              wide
              className="pb-btn--default"
              disabled={!row}
              onClick={() => row && onPick(row.chart)}
            >
              Ok
            </PBButton>
            <span style={{ width: 14 }} />
            <PBButton wide onClick={onClose}>Cancel</PBButton>
            <span style={{ flex: '1 1 auto' }} />
            <PBButton wide onClick={() => step(PAGE)}>PgDwn</PBButton>
            <PBButton wide onClick={() => setCurrent(rows.length - 1)}>End</PBButton>
          </div>
        </div>
      </PBWindow>
    </div>
  )
}
