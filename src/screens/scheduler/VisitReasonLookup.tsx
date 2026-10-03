import { useState } from 'react'
import { PBCheckbox, PBSelect, type PBColumn } from '../../pb'
import { VISIT_REASON_CODES, type VisitReasonCode } from '../../data/daybook'
import { currentRow, schedulerStore } from '../../data/schedulerStore'
import { registerAreaWindow, type AreaWindowProps } from '../areaWindowRegistry'
import { useColumnFilters } from '../listKit'
import {
  FILL_GRID, LOOKUP_BODY, LOOKUP_PANEL, LookupBand, LookupNote, LookupPager, PickListWindow, usePagedCursor,
} from '../lookupKit'

/* ============================================================================
   Day Book ▸ Visit Reason "…": Advanced Lookup Service ▸ Visit Reason Code
   List.

   PROVENANCE: 2026-10-02 TRAINING capture (Desktop 11.43.39 PM, v02.31.23,
   ≈1.13× CSS px), opened over the day book with its current row on PATCH
   AADAMS. The Patient Chart List's window class (AdvancedLookupDialog): a
   777 × 652 window, the ruled grey band, a filter strip with boxes over Code
   and Description only, Code · Description · Category · Code System
   (124 / 327 / 190 / 102 px), the description pane reading "This is the
   Visit Reason selection list", Home · PgUp · Ok · Cancel · PgDwn · End,
   and under them the Source / Save on Close strip the Master Service Code
   List also has. Ok (or a double-click) writes the description into the
   current appointment's Visit Reason.
   INFERRED: Source lists only SNOMED, the one value the capture shows.
   ========================================================================= */

const COLUMNS: PBColumn<VisitReasonCode>[] = [
  { key: 'code', header: 'Code', width: 124, headAlign: 'left' },
  { key: 'description', header: 'Description', width: 327, headAlign: 'left' },
  { key: 'category', header: 'Category', width: 190, headAlign: 'left' },
  { key: 'system', header: 'Code System', headAlign: 'left' },
]

function VisitReasonLookup({ close }: AreaWindowProps) {
  const [source, setSource] = useState('SNOMED')
  const [saveOnClose, setSaveOnClose] = useState(false)
  const filters = useColumnFilters<VisitReasonCode>(VISIT_REASON_CODES, [
    { key: 'code', ariaLabel: 'Filter Code' },
    { key: 'description', ariaLabel: 'Filter Description' },
    null,
    null,
  ])
  const rows = filters.shown.filter((r) => r.system === source)
  const cursor = usePagedCursor(rows.length, 12)
  const row = rows[cursor.at]
  const pick = (r: VisitReasonCode | undefined) => {
    const appt = currentRow()
    if (r && appt) schedulerStore.setReason(appt.key, r.description)
    close()
  }

  return (
    <PickListWindow<VisitReasonCode>
      window={{
        id: 'visit-reason-lookup', title: 'Advanced Lookup Service', onClose: close, zIndex: 95,
        windowStyle: { width: 'min(777px, calc(100% - 16px))', height: 'min(652px, calc(100% - 16px))' },
      }}
      body={LOOKUP_BODY}
      panel={LOOKUP_PANEL}
      band={<LookupBand variant="ruled">Visit Reason Code List</LookupBand>}
      gridBox={null}
      grid={{
        flush: true,
        rules: 'white',
        style: FILL_GRID,
        columns: COLUMNS,
        rows,
        filters: filters.filterRow,
        current: cursor.at,
        onCurrentChange: cursor.setCurrent,
        onActivate: (r) => pick(r),
        rowTutorialId: (r) => `host.mois.row.visit-reason-${r.code}`,
        empty: false,
      }}
      below={<LookupNote height={74}>This is the Visit Reason selection list</LookupNote>}
      footerInside
      footer={(
        <LookupPager
          cursor={cursor}
          ok={{ command: 'visit-reason-ok', isDefault: true, disabled: !row, onClick: () => pick(row) }}
          cancel={{ command: 'visit-reason-cancel', onClick: close }}
        />
      )}
      after={(
        <div className="pb-row" style={{ gap: 14, flex: 'none', paddingLeft: 10 }}>
          <span>Source:</span>
          <PBSelect w={190} options={['SNOMED']} value={source} onChange={(e) => setSource(e.target.value)} />
          <PBCheckbox label="Save on Close" checked={saveOnClose} onChange={setSaveOnClose} />
        </div>
      )}
    />
  )
}

registerAreaWindow('daybook-visit-reason', VisitReasonLookup)
