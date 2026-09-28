import { useState, type ReactNode } from 'react'
import { useChartRows } from '../data/chart-records'
import { usePatient } from '../data/patient-context'
import { MOIS_TODAY } from '../data/patients'
import { DESKTOP_USER, nextEncounterId, useEncounterSession, type SessionEncounter } from '../host/encounterArea'
import { useScreenReport } from '../host/screen-state'
import { PBActiveEncounterContext, PBBand, PBDataWindow, type PBColumn } from '../pb'
import { registerAreaWindow, useOpenWindow, type AreaWindowProps } from './areaWindowRegistry'
import { FooterButton, StageWindow } from './StageWindow'

/* ============================================================================
   Active Encounter — the "…" after `Active ENC#:` on a chart folder's
   identity strip.

   "If you click the ellipsis, a new window opens with a list of the
   patient's encounters. In this window you are able to pick an existing
   encounter, or create a new encounter and link the MAR record to that
   encounter." (303427, "Active Enc"); "Choose a specific Encounter and make
   it the Active Encounter by pressing on the ellipses […], then attach the
   files in the applicable areas of the Patient Chart. These files will now
   be associated with the Active Encounter selected." (303793 `7e1fd910…png`,
   `d5514a37…png` — the strip itself, "Active ENC#: NO ENCOUNTER […]").

   PROVENANCE: 303427 and 303793 describe the window; neither captures it.
   INFERRED: the layout — "Encounter List" over a "Select Encounter" band,
   the encounter grid, Clear Encounter · Continue · Cancel · New Encounter —
   is the Preferences folder's Change Encounter picker
   (screens/PreferenceEncounterDialog.tsx), the one encounter picker the
   emulator already draws. New Encounter makes a same-day encounter for the
   desktop provider (the way Encounters ▸ New Record does, 303061) and picks
   it.

   The pick lands in the frame's encounter session (`activeEnc`,
   host/encounterArea.tsx) and every identity strip shows it
   (PBActiveEncounterContext, pb/components/banners.tsx) until it is cleared
   or an Encounter Detail Window opens, which takes over while it is open.

   Window id `active-encounter-list` (host.mois.openUtility, or the strip's
   "…", anchored host.mois.lookup.active-encounter). Anchors:
   host.mois.dialog.active-encounter-list; rows host.mois.row.active-enc-<id>;
   host.mois.command.{active-enc-clear, active-enc-continue,
   active-enc-cancel, active-enc-new}. Reported: host.dialog, and
   host.screen.activeEncounter (the picked encounter number, or null).
   ========================================================================= */

export const ACTIVE_ENCOUNTER_WINDOW = 'active-encounter-list'

type Row = Record<string, string>

const COLUMNS: PBColumn<Row>[] = [
  { key: 'date', header: 'Date', width: 90, align: 'center' },
  { key: 'hr', header: 'HR', width: 34, align: 'center' },
  { key: 'mn', header: 'MIN', width: 34, align: 'center' },
  { key: 'nbr', header: 'Slots', width: 50, align: 'center' },
  { key: 'code', header: 'Visit', width: 44, align: 'center' },
  { key: 'provider', header: 'Provider', width: 190 },
  { key: 'loc', header: 'Service Location', width: 200 },
  { key: 'reason', header: 'Note' },
]

function ActiveEncounterWindow({ close }: AreaWindowProps) {
  const patient = usePatient()
  const area = useEncounterSession()
  const exported = useChartRows('encounters')
  const rows: Row[] = [...(area.session.saved as unknown as Row[]), ...exported]
  const [cur, setCur] = useState(() => Math.max(0, rows.findIndex((r) => r.id === area.activeEncounter)))
  const pick = (id: string | null) => {
    area.update((s) => ({ ...s, activeEnc: id }))
    close()
  }
  const newEncounter = () => {
    const enc: SessionEncounter = {
      id: nextEncounterId(patient.chart, area.session.saved), date: MOIS_TODAY, hr: '', mn: '', code: '', mode: '', nbr: '',
      provider: DESKTOP_USER, reason: '', loc: '',
    }
    area.update((s) => ({ ...s, saved: [enc, ...s.saved], activeEnc: enc.id }))
    close()
  }
  return (
    <StageWindow id={ACTIVE_ENCOUNTER_WINDOW} title="Encounter List" width={1000} height={600} onClose={close}
      bodyStyle={{ padding: '14px 16px 0', background: '#fff' }}
      footer={<>
        <FooterButton onClick={() => pick(null)} tutorialId="host.mois.command.active-enc-clear">Clear Encounter</FooterButton>
        <span className="pb-footer__spacer" />
        <FooterButton primary disabled={!rows[cur]?.id} onClick={() => pick(rows[cur]?.id ?? null)} tutorialId="host.mois.command.active-enc-continue">Continue</FooterButton>
        <FooterButton onClick={close} tutorialId="host.mois.command.active-enc-cancel">Cancel</FooterButton>
        <span className="pb-footer__spacer" />
        <FooterButton onClick={newEncounter} tutorialId="host.mois.command.active-enc-new">New Encounter</FooterButton>
      </>}>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', border: '1px solid var(--pb-border)' }}>
        <PBBand>Select Encounter</PBBand>
        <PBDataWindow
          flush
          style={{ flex: '1 1 auto', minHeight: 0 }}
          rows={rows}
          columns={COLUMNS}
          current={Math.min(cur, Math.max(0, rows.length - 1))}
          onCurrentChange={setCur}
          onActivate={(r) => pick(r.id ?? null)}
          rowTutorialId={(r) => `host.mois.row.active-enc-${r.id}`}
          empty="No encounters on file."
        />
      </div>
    </StageWindow>
  )
}

registerAreaWindow(ACTIVE_ENCOUNTER_WINDOW, ActiveEncounterWindow)

/** Mounted once by the frame (host/MoisClassicShell.tsx): feeds every
    identity strip the active encounter and the "…" that changes it. */
export function ActiveEncounterProvider({ children }: { children: ReactNode }) {
  const area = useEncounterSession()
  const open = useOpenWindow()
  useScreenReport({ activeEncounter: area.activeEncounter })
  return (
    <PBActiveEncounterContext.Provider value={{ encounter: area.activeEncounter, onLookup: () => { open(ACTIVE_ENCOUNTER_WINDOW) } }}>
      {children}
    </PBActiveEncounterContext.Provider>
  )
}
