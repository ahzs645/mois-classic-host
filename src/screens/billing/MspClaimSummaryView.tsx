import { useState } from 'react'
import { PBDataWindow, PBViewHeader, pbSlug } from '../../pb'
import { useUnsentClaims } from '../../data/billingStore'
import { DOCTORS } from '../../data/claims'
import { usePatientRoster } from '../../data/patient-context'
import { useScreenReport } from '../../host/screen-state'
import type { FolderViewProps } from '../folderViewRegistry'

/* ============================================================================
   Billing ▸ MSP Claims — the MSP Claim Summary page.

   PROVENANCE: ~/github/Mois/references/billing.md "MSP Claim Summary" and
   module-overview.md "Billing ▸ MSP Claim Summary" (live DEV v02.31.23,
   2026): "Title: `MSP Claim Summary`. Subtitle: `MSP Claim Summary Page`.
   Grid columns: `Doctor`, `Complete`, `Incomplete`, `Marked for Hold`.
   Rows show providers/doctors and claim counts." The tree's own comment
   (data/mois.tsx) had MSP Claims as "a folder no capture shows a view
   for"; this is that view.

   Drawn on the section landing page the other folder pages use (navy view
   header, the light-blue sub-band in bold, a ruled white strip;
   AdminLandingViews.tsx), with the grid where their term list sits.

   INFERRED
   - The counts partition the session's Unsent Claims list
     (data/billingStore `useUnsentClaims`): a held claim counts once, under
     Marked for Hold, and the rest under Complete or Incomplete by their
     Claim Status — so the three columns add up to what Unsent Claims holds.
   - Only doctors with an unsent claim are listed, in the clinic roster's
     billing order; a zero reads `0`.
   - Column widths; the page is read-only (the guide records no command).

   REPORTED: `host.screen.row` (the current doctor), `host.screen.rows`.
   ========================================================================= */

type SummaryRow = { doctor: string; complete: number; incomplete: number; hold: number }

export function MspClaimSummaryView(_props: FolderViewProps) {
  const roster = usePatientRoster()
  const { rows: claims } = useUnsentClaims(roster)
  const [cur, setCur] = useState(0)
  const byDoctor = new Map<string, SummaryRow>()
  for (const c of claims) {
    const row = byDoctor.get(c.doctor) ?? { doctor: c.doctor, complete: 0, incomplete: 0, hold: 0 }
    if (c.hold) row.hold += 1
    else if (c.compl) row.complete += 1
    else row.incomplete += 1
    byDoctor.set(c.doctor, row)
  }
  const order = (d: string) => { const i = DOCTORS.indexOf(d); return i < 0 ? DOCTORS.length : i }
  const rows = [...byDoctor.values()].sort((a, b) => order(a.doctor) - order(b.doctor) || a.doctor.localeCompare(b.doctor))
  const current = rows[cur]
  useScreenReport({ row: current ? pbSlug(current.doctor) : '', rows: rows.length })

  return (
    <>
      <PBViewHeader title="MSP Claim Summary" />
      <div style={{ background: 'linear-gradient(#e4edfa, #ccdcf3)', padding: '8px 10px', fontWeight: 700, flex: 'none' }}>
        MSP Claim Summary Page
      </div>
      <div style={{ height: 32, background: 'white', borderBottom: '1px solid #666', flex: 'none' }} />
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', background: 'white', padding: 3 }} data-tutorial-id="host.mois.group.msp-claim-summary">
        <PBDataWindow
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
          gutter={false}
          rowTutorialId={(r) => `host.mois.row.msp-summary-${pbSlug(r.doctor)}`}
          columns={[
            { key: 'doctor', header: 'Doctor', width: 260 },
            { key: 'complete', header: 'Complete', width: 90, align: 'right' },
            { key: 'incomplete', header: 'Incomplete', width: 90, align: 'right' },
            { key: 'hold', header: 'Marked for Hold', width: 110, align: 'right' },
            { key: 'pad', header: '' },
          ]}
          empty="No unsent claims."
        />
      </div>
    </>
  )
}
