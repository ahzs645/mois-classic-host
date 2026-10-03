import { PBDropDownDataWindow, type PBColumn } from '../pb'
import { chartStatusRows } from '../data/mois'
import { patients as fallbackRoster, type Patient } from '../data/patients'
import { useColumnFilters } from './listKit'
import {
  FILL_GRID, LOOKUP_BODY, LOOKUP_PANEL, LookupBand, LookupNote, LookupPager, PickListWindow, usePagedCursor,
} from './lookupKit'

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
/* Every column filters but Middle Name: the capture's strip has 12 boxes
   and a grey gap over Middle Name (art. 301170 `38edd7be…png` agrees). */
const COLUMNS: { key: Key; header: string; width?: number; filter: boolean }[] = [
  { key: 'status', header: 'Status', width: 46, filter: true },
  { key: 'last', header: 'Last Name', width: 95, filter: true },
  { key: 'first', header: 'First Name', width: 95, filter: true },
  { key: 'middle', header: 'Middle Name', width: 71, filter: false },
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

export function AdvancedLookupDialog({ chart, roster = fallbackRoster, onPick, onClose, zIndex = 80 }: {
  /** the chart that is open, so the list lands on it */
  chart: string
  /** the charts on file; omitted = the transcribed training roster */
  roster?: Patient[]
  onPick: (chart: string) => void
  onClose: () => void
  /** stacking order; a window opened over another modal (the address
      wizard's Find / Add) passes one above it */
  zIndex?: number
}) {
  const filters = useColumnFilters<Patient>(roster, COLUMNS.map((c) => (c.filter ? {
    key: c.key,
    ...(c.key === 'chart' ? { anchor: 'lookup-filter-chart', ariaLabel: 'Filter Chart No' } : {}),
    box: c.key === 'status'
      ? (value: string, set: (v: string) => void) => (
        <PBDropDownDataWindow
          key={c.key}
          w="100%"
          value={value}
          display="code"
          columns={[{ key: 'code', header: 'St', width: 44 }, { key: 'status', header: 'Chart status' }]}
          rows={chartStatusRows}
          onSelect={(row) => set(String(row.code))}
        />
      )
      : undefined,
  } : null)))
  const rows = filters.shown

  const cursor = usePagedCursor(rows.length, PAGE, () => Math.max(0, roster.findIndex((p) => p.chart === chart)))
  const row = rows[cursor.at]

  const columns: PBColumn<Patient>[] = COLUMNS.map((c) => ({
    key: c.key,
    header: c.header,
    width: c.width,
    align: c.key === 'status' || c.key === 'insuranceBy' ? 'center' : 'left',
  }))

  return (
    <PickListWindow<Patient>
      window={{
        id: 'chart-lookup', title: 'Advanced Lookup Service', onClose, zIndex,
        windowStyle: { width: 'min(1120px, calc(100vw - 60px))', height: 'min(620px, calc(100vh - 80px))' },
      }}
      body={LOOKUP_BODY}
      panel={LOOKUP_PANEL}
      /* the capture rules the band off from the filter strip below */
      band={<LookupBand variant="ruled">Patient Chart List</LookupBand>}
      gridBox={null}
      grid={{
        flush: true,
        rules: 'white',
        /* the list fills the dialog: MOIS shows the empty rows below the
           last match rather than shrinking the box to fit them */
        style: FILL_GRID,
        columns,
        rows,
        filters: filters.filterRow,
        current: cursor.at,
        onCurrentChange: cursor.setCurrent,
        onActivate: (r) => onPick(r.chart),
        empty: 'No chart matches those filters.',
      }}
      /* the pane MOIS explains the current list in */
      below={<LookupNote height={64} preWrap>ALL Patient charts.</LookupNote>}
      footerInside
      footer={(
        <LookupPager
          cursor={cursor}
          ok={{ command: 'lookup-ok', isDefault: true, disabled: !row, onClick: () => { if (row) onPick(row.chart) } }}
          cancel={{ command: 'lookup-cancel', onClick: onClose }}
        />
      )}
    />
  )
}
