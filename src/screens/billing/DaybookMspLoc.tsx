import { useEffect } from 'react'
import { PBInput } from '../../pb'
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

   The field itself is a plain edit box, no drop-down arrow, about 50 px
   wide left of Alias (2026-10-02 TRAINING capture, Desktop 11.43.34 PM,
   v02.31.23: "MSP Loc.: [    ]" beside the Alias drop-down). The location
   code is typed into it. INFERRED: the code is taken upper-cased, and only
   a code of the MSP location list (data/mspLocations) is saved as the
   provider's default; whether the current build still drops the 3295094
   list from it on focus is not shown.

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
  const known = MSP_LOCATION_ROWS.some((r) => r.code === value)
  const pick = value && value !== saved && known ? value : null
  useEffect(() => {
    pendingCommit = pick === null ? null : () => save(pick)
    return () => { pendingCommit = null }
  }, [pick, save])
  const shown = value || saved
  useScreenReport({ mspLoc: pick !== null ? 'pending' : saved ? 'saved' : 'none', mspLocCode: shown })
  return (
    <PBInput
      w={50}
      value={shown}
      onChange={(e) => onChange(e.target.value.trim().toUpperCase())}
      data-tutorial-id="host.mois.field.daybook-msp-loc"
    />
  )
}
