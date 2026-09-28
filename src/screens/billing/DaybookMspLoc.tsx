import { useEffect } from 'react'
import { PBDropDownDataWindow } from '../../pb'
import { MSP_LOCATION_ROWS, useDefaultLocation } from '../../data/billingStore'
import { useScreenReport } from '../../host/screen-state'

/* ============================================================================
   The day book's MSP Loc. — a provider's default billing location
   (3295094 "Default Billing Location").

   PROVENANCE: 3295094 `4eb31491` (v02.30.11): the Provider Day Book's MSP
   Loc. drop-down, ringed, dropped to a Code | Description list of sixteen
   locations (A Practitioner's Office in Community … T Practitioner's Office
   in Public Admin Facility). "In the MSP Loc field … open the list of
   options to select the preferred Billing Default location for this
   Provider. Click Save and Refresh. This Provider's default location is set
   to this location for each day moving forward."

   The pick is the day book's own field until its Save (which calls
   `commitDaybookMspLoc`), then written to the provider's default — the same
   store Administration ▸ Provider List ▸ Provider ▸ Billing ▸ MSP Location
   edits (data/billingStore `useDefaultLocation`), and the location a new
   claim in Unsent MSP opens on.

   Reported: `host.screen.mspLoc` — `saved`, `pending` (picked, not yet
   saved) or `none`; `host.screen.mspLocCode` — the code on screen.
   ========================================================================= */

let pendingCommit: (() => void) | null = null

/** The day book's Save: commit a picked MSP Loc. as the provider's default. */
export function commitDaybookMspLoc() {
  pendingCommit?.()
}

/** `value` / `onChange` are the day book's own per-day field (stream D's
    data/schedulerExtras `mspLoc`); '' shows the provider's saved default. */
export function DaybookMspLoc({ provider, value, onChange }: { provider: string; value: string; onChange: (code: string) => void }) {
  const [saved, save] = useDefaultLocation(provider)
  const pick = value && value !== saved ? value : null
  useEffect(() => {
    pendingCommit = pick === null ? null : () => save(pick)
    return () => { pendingCommit = null }
  }, [pick, save])
  const shown = value || saved
  useScreenReport({ mspLoc: pick !== null ? 'pending' : saved ? 'saved' : 'none', mspLocCode: shown })
  return (
    <PBDropDownDataWindow
      w={60}
      listW={380}
      value={shown}
      display="code"
      columns={[{ key: 'code', header: 'Code', width: 44 }, { key: 'desc', header: 'Description', width: 320 }]}
      rows={MSP_LOCATION_ROWS}
      onSelect={(r) => onChange(r.code)}
      tutorialId="host.mois.field.daybook-msp-loc"
    />
  )
}
