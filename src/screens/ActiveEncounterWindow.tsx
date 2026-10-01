import { useState, type ReactNode } from 'react'
import { useChartRows } from '../data/chart-records'
import { rowsFromExport } from '../data/charts/to-rows'
import { capturedEncounters } from '../data/marChart2429'
import { usePatient } from '../data/patient-context'
import { MOIS_TODAY } from '../data/patients'
import { DESKTOP_USER, nextEncounterId, useEncounterSession, type SessionEncounter } from '../host/encounterArea'
import { useScreenReport } from '../host/screen-state'
import { PBActiveEncounterContext, PBDataWindow, type PBColumn } from '../pb'
import { registerAreaWindow, useOpenWindow, type AreaWindowProps } from './areaWindowRegistry'
import { PBButton } from '../pb'
import { StageWindow } from './StageWindow'

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

   PROVENANCE: 303427 and 303793 describe the window; the 2026-09-29
   TRAINING capture (set 3 c24, chart 2429, raised by MAR ▸ New…) shows it.
   Measured there (2x): an 844 x 606 window on the grey face; a "Select
   Encounter" band and the grid in one framed panel 14px in; columns
   Date 78 · HR 31 · MIN 31 · Slots 46 · Visit 41 · Provider 167 · Service
   Location 193 · Note (15.5px gutter) on 18px rows; Clear Encounter (90)
   at the left, Continue · Cancel (74 each) left of centre, New Encounter
   (90) at the right, 21.5px tall. A chart without an export lists the
   encounters its capture shows (data/marChart2429.ts).
   INFERRED: New Encounter makes a same-day encounter for the desktop
   provider (the way Encounters ▸ New Record does, 303061) and picks it.

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
  { key: 'date', header: 'Date', width: 78, align: 'center' },
  { key: 'hr', header: 'HR', width: 31, align: 'center' },
  { key: 'mn', header: 'MIN', width: 31, align: 'center' },
  { key: 'nbr', header: 'Slots', width: 46, align: 'center' },
  { key: 'code', header: 'Visit', width: 41, align: 'center' },
  { key: 'provider', header: 'Provider', width: 167 },
  { key: 'loc', header: 'Service Location', width: 193 },
  /* c24: Note ends 20px short of the panel; the run past it is white */
  { key: 'reason', header: 'Note', width: 194.5 },
]

/** c24's buttons: plain push buttons, 21.5px tall */
const button = (label: string, width: number, id: string, onClick: () => void, disabled?: boolean) => (
  <PBButton command={id} disabled={disabled} onClick={onClick} style={{ width, minWidth: width, height: 21.5, padding: 0 }}>{label}</PBButton>
)

function ActiveEncounterWindow({ close }: AreaWindowProps) {
  const patient = usePatient()
  const area = useEncounterSession()
  const exported = useChartRows('encounters')
  const captured = exported.length ? [] : rowsFromExport('encounters', capturedEncounters(patient.chart))
  const rows: Row[] = [...(area.session.saved as unknown as Row[]), ...exported, ...captured]
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
    <StageWindow id={ACTIVE_ENCOUNTER_WINDOW} title="Encounter List" width={844} height={606} onClose={close}
      bodyStyle={{ padding: '14px 14px 0', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', border: '1px solid #848280' }}>
        {/* c24: a 24px band, its caption bold, ruled off from the grid */}
        <div className="pb-band" style={{ height: 24, flex: 'none', borderBottom: '1px solid #848280' }}><b>Select Encounter</b></div>
        <PBDataWindow
          flush
          style={{ flex: '1 1 auto', minHeight: 0, ['--pb-dw-row-h' as string]: '18px', ['--pb-dw-gutter-width' as string]: '15.5px' }}
          rows={rows}
          columns={COLUMNS}
          current={Math.min(cur, Math.max(0, rows.length - 1))}
          onCurrentChange={setCur}
          onActivate={(r) => pick(r.id ?? null)}
          rowTutorialId={(r) => `host.mois.row.active-enc-${r.id}`}
          empty={false}
        />
      </div>
      <div className="pb-row" style={{ flex: 'none', height: 60, gap: 0, alignItems: 'center', padding: '0 0 0 1px' }}>
        {button('Clear Encounter', 90, 'active-enc-clear', () => pick(null))}
        <span style={{ width: 240 }} />
        {button('Continue', 74, 'active-enc-continue', () => pick(rows[cur]?.id ?? null), !rows[cur]?.id)}
        <span style={{ width: 6 }} />
        {button('Cancel', 74, 'active-enc-cancel', close)}
        <span className="pb-row__spacer" />
        {button('New Encounter', 90, 'active-enc-new', newEncounter)}
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
