import { useMemo, useState } from 'react'
import { PBBand, PBButton, PBDataWindow, PBInput, PBWindow, type PBColumn } from '../pb'
import { dformServiceLocations, jorgUnits, type JorgUnit, type ServiceLocation } from '../data/jorg'

/* ============================================================================
   The two lists a Dynamic Form's "..." lookups open (DataWindow tags
   `^lookup=jorg:…^` and `^lookup=servicelocation:…^`).

   PROVENANCE: Baby Birth Event (v2), MOIS test environment 2026-09-28.
   - "JORG List" (Health Authority "..."): the band, a filter box over every
     column, Health Authority / Service Delivery Area / Branch / Service
     Delivery Location, the description "This is the Jurisdictional
     Organizational Chart", then Home PgUp · Ok Cancel · PgDwn End.
   - "Service Location Selection List" (Responsible Service Delivery Location
     "..."): the band "Service Location List", filter boxes, Service Location /
     Service Delivery Location (SDL) / Branch / Service Delivery Area (SDA) /
     Health Authority, and Ok / Cancel only.
   Both open on their first row, the salmon selection with the `>` indicator.
   Sizes and column widths are scaled off the captures against the form
   window behind them (Maternal Birth Event's 1434px there is our 951px sheet,
   ×0.663). The Service Location list sits inside that window, 29px in from
   its sides and 61px below its top (2026-09-28 capture), smaller than the
   form it opens from; the form window is centred, so centring the list at
   that size and nudging it 15px down puts it there.
   ========================================================================= */

type Filters<K extends string> = Partial<Record<K, string>>

function useFiltered<T, K extends string & keyof T>(rows: T[], keys: readonly K[]) {
  const [filters, setFilters] = useState<Filters<K>>({})
  const filtered = useMemo(() => rows.filter((row) => keys.every((key) => {
    const want = filters[key]?.trim().toUpperCase()
    return !want || String(row[key] ?? '').toUpperCase().includes(want)
  })), [rows, keys, filters])
  const filterRow = keys.map((key) => (
    <PBInput key={key} value={filters[key] ?? ''} onChange={(event) => setFilters((state) => ({ ...state, [key]: event.target.value }))} />
  ))
  return { filtered, filterRow }
}

const PAGE = 20

const JORG_KEYS = ['healthAuthority', 'serviceDeliveryArea', 'branch', 'serviceDeliveryLocation'] as const
const JORG_COLUMNS: PBColumn<JorgUnit>[] = [
  { key: 'healthAuthority', header: 'Health Authority', width: 199 },
  { key: 'serviceDeliveryArea', header: 'Service Delivery Area', width: 199 },
  { key: 'branch', header: 'Branch', width: 199 },
  { key: 'serviceDeliveryLocation', header: 'Service Delivery Location' },
]

export function JorgListWindow({ onPick, onClose, zIndex = 99 }: {
  onPick: (unit: JorgUnit) => void
  onClose: () => void
  zIndex?: number
}) {
  const { filtered, filterRow } = useFiltered(jorgUnits, JORG_KEYS)
  const [current, setCurrent] = useState(0)
  const at = Math.min(current, Math.max(0, filtered.length - 1))
  const row = filtered[at]
  const step = (delta: number) => setCurrent(Math.max(0, Math.min(filtered.length - 1, at + delta)))
  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex }}>
      <PBWindow child controls={false} title="JORG List" onClose={onClose} tutorialId="host.mois.dialog.jorg-list"
        style={{ width: 'min(839px, calc(100% - 24px))', height: 'min(630px, calc(100% - 24px))' }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, padding: 8, gap: 6 }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, border: '1px solid var(--pb-border)' }}>
            <div className="pb-band--ruled"><PBBand>JORG List</PBBand></div>
            <PBDataWindow flush rules="white" style={{ flex: '1 1 auto', minHeight: 0 }}
              columns={JORG_COLUMNS} rows={filtered} filters={filterRow}
              current={at} onCurrentChange={setCurrent} onActivate={onPick}
              empty="No unit matches those filters." />
          </div>
          <div className="pb-field" style={{ height: 64, flex: 'none', padding: '3px 5px', whiteSpace: 'pre-wrap', background: '#fff' }}>
            This is the Jurisdictional Organizational Chart
          </div>
          <div style={{ display: 'flex', alignItems: 'center', flex: 'none' }}>
            <PBButton wide onClick={() => setCurrent(0)}>Home</PBButton>
            <PBButton wide onClick={() => step(-PAGE)}>PgUp</PBButton>
            <span style={{ flex: '1 1 auto' }} />
            <PBButton wide className="pb-btn--default" disabled={!row} onClick={() => row && onPick(row)}>Ok</PBButton>
            <span style={{ width: 14 }} />
            <PBButton wide onClick={onClose}>Cancel</PBButton>
            <span style={{ flex: '1 1 auto' }} />
            <PBButton wide onClick={() => step(PAGE)}>PgDwn</PBButton>
            <PBButton wide onClick={() => setCurrent(filtered.length - 1)}>End</PBButton>
          </div>
        </div>
      </PBWindow>
    </div>
  )
}

const LOCATION_KEYS = ['name', 'serviceDeliveryLocation', 'branch', 'serviceDeliveryArea', 'healthAuthority'] as const
/* NOT ASSIGNED is printed grey, as the capture shows */
const assigned = (value: unknown) => (value === 'NOT ASSIGNED' ? <span style={{ color: '#8a8a8a' }}>NOT ASSIGNED</span> : String(value ?? ''))
const LOCATION_COLUMNS: PBColumn<ServiceLocation>[] = [
  { key: 'name', header: 'Service Location', width: 207 },
  { key: 'serviceDeliveryLocation', header: 'Service Delivery Location (SDL)', width: 168, render: (row) => assigned(row.serviceDeliveryLocation) },
  { key: 'branch', header: 'Branch', width: 170, render: (row) => assigned(row.branch) },
  { key: 'serviceDeliveryArea', header: 'Service Delivery Area (SDA)', width: 145, render: (row) => assigned(row.serviceDeliveryArea) },
  { key: 'healthAuthority', header: 'Health Authority', render: (row) => assigned(row.healthAuthority) },
]

export function ServiceLocationSelectionWindow({ onPick, onClose, zIndex = 99 }: {
  onPick: (location: ServiceLocation) => void
  onClose: () => void
  zIndex?: number
}) {
  const { filtered, filterRow } = useFiltered(dformServiceLocations, LOCATION_KEYS)
  const [current, setCurrent] = useState(0)
  const at = Math.min(current, Math.max(0, filtered.length - 1))
  const row = filtered[at]
  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex }}>
      <PBWindow child controls={false} title="Service Location Selection List" onClose={onClose} tutorialId="host.mois.dialog.service-location-list"
        style={{ width: 'min(893px, calc(100% - 24px))', height: 'min(652px, calc(100% - 24px))', marginTop: 30 }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, padding: '12px 12px 10px', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, border: '1px solid var(--pb-border)' }}>
            <div className="pb-band--ruled"><PBBand>Service Location List</PBBand></div>
            <PBDataWindow flush rules="white" style={{ flex: '1 1 auto', minHeight: 0 }}
              columns={LOCATION_COLUMNS} rows={filtered} filters={filterRow}
              current={at} onCurrentChange={setCurrent} onActivate={onPick}
              empty="No service location matches those filters." />
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flex: 'none' }}>
            <PBButton className="pb-btn--default" style={{ width: 75 }} disabled={!row} onClick={() => row && onPick(row)}>Ok</PBButton>
            <PBButton style={{ width: 75 }} onClick={onClose}>Cancel</PBButton>
          </div>
        </div>
      </PBWindow>
    </div>
  )
}
