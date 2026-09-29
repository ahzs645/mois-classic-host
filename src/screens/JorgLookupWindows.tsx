import { useState } from 'react'
import { type PBColumn } from '../pb'
import { dformServiceLocations, jorgUnits, type JorgUnit, type ServiceLocation } from '../data/jorg'
import { useColumnFilters } from './listKit'
import {
  FILL_GRID, LOOKUP_BODY, LOOKUP_PANEL, LookupBand, LookupNote, LookupPager, PickButtons, PickListWindow, usePagedCursor,
} from './lookupKit'

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

function useFiltered<T, K extends string & keyof T>(rows: T[], keys: readonly K[]) {
  const { shown: filtered, filterRow } = useColumnFilters(rows, keys.map((key) => ({ key })))
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
  const cursor = usePagedCursor(filtered.length, PAGE)
  const row = filtered[cursor.at]
  return (
    <PickListWindow<JorgUnit>
      window={{
        id: 'jorg-list',
        title: 'JORG List',
        onClose,
        zIndex,
        windowStyle: { width: 'min(839px, calc(100% - 24px))', height: 'min(630px, calc(100% - 24px))' },
      }}
      body={LOOKUP_BODY}
      panel={LOOKUP_PANEL}
      band={<LookupBand variant="ruled">JORG List</LookupBand>}
      gridBox={null}
      grid={{
        flush: true, rules: 'white', style: FILL_GRID,
        columns: JORG_COLUMNS, rows: filtered, filters: filterRow,
        current: cursor.at, onCurrentChange: cursor.setCurrent, onActivate: onPick,
        empty: 'No unit matches those filters.',
      }}
      below={<LookupNote height={64} preWrap>This is the Jurisdictional Organizational Chart</LookupNote>}
      footerInside
      footer={(
        <LookupPager
          cursor={cursor}
          ok={{ isDefault: true, disabled: !row, onClick: () => row && onPick(row) }}
          cancel={{ onClick: onClose }}
        />
      )}
    />
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
    <PickListWindow<ServiceLocation>
      window={{
        id: 'service-location-list',
        title: 'Service Location Selection List',
        onClose,
        zIndex,
        windowStyle: { width: 'min(893px, calc(100% - 24px))', height: 'min(652px, calc(100% - 24px))', marginTop: 30 },
      }}
      body={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, padding: '12px 12px 10px', gap: 16 }}
      panel={LOOKUP_PANEL}
      band={<LookupBand variant="ruled">Service Location List</LookupBand>}
      gridBox={null}
      grid={{
        flush: true, rules: 'white', style: FILL_GRID,
        columns: LOCATION_COLUMNS, rows: filtered, filters: filterRow,
        current: at, onCurrentChange: setCurrent, onActivate: onPick,
        empty: 'No service location matches those filters.',
      }}
      footerInside
      footer={(
        <PickButtons style={{ display: 'flex', justifyContent: 'center', gap: 14, flex: 'none' }} size={{ width: 75 }}
          buttons={[
            { label: 'Ok', isDefault: true, disabled: !row, onClick: () => row && onPick(row) },
            { label: 'Cancel', onClick: onClose },
          ]} />
      )}
    />
  )
}
