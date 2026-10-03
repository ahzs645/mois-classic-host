import { useState } from 'react'
import type { MoisRecord } from '../data/charts'
import { date } from '../data/charts/relations'
import { ROW_MAPS } from '../data/charts/to-rows'
import { PBBand, PBButton, PBDataWindow, type PBColumn } from '../pb'
import { ModalWindow } from './dialogKit'
import './preferences-detail.css'

/* the Encounter List's columns, Drive Mois 2026-09-22 8.13.40 (1.5×, header
   rules at 167/285/332/379/449/511/765/1057/1353): Date 79, HR 31, MIN 31,
   Slots 47, Visit 41, Provider 169, Service Location 195, Note 197 — the
   numbers centred, the names left; the grid's white runs on past Note */
const columns: PBColumn<Record<string, string>>[] = [
  { key: 'date', header: 'Date', width: 79, align: 'center' },
  { key: 'hr', header: 'HR', width: 31, align: 'center' },
  { key: 'mn', header: 'MIN', width: 31, align: 'center' },
  { key: 'nbr', header: 'Slots', width: 47, align: 'center' },
  { key: 'code', header: 'Visit', width: 41, align: 'center' },
  { key: 'provider', header: 'Provider', width: 169 },
  { key: 'loc', header: 'Service Location', width: 195 },
  { key: 'reason', header: 'Note', width: 197 },
]

/** Encounter ID: a record's encounter, with Change Encounter to relink it.
    The Preferences folder opens it from its "ENC# …" link, and so does a
    Dynamic Form's "Encounter Date:" link, over the form window (hence
    `zIndex`); the MAR opens it over a medication too.

    EVIDENCE (current build v02.31.23, Drive Mois 2026-09-22):
      8.13.29  "Encounter ID: EMPTY" over Preferences, the record unlinked:
               the three message lines and Change Encounter / Close (Esc).
      8.13.40  Change Encounter → "Encounter List": the "Select Encounter"
               band over the chart's encounters, newest first, the first row
               current; Clear Encounter, Continue, Cancel, New Encounter.
    Geometry for both is in preferences-detail.css. The linked window's rows
    (Encounter No. … Service Code(s)) follow the 2026-09-29 Baby Birth Event
    capture. INFERRED: the wording of the viewer-only "not included in the
    current chart export" note, and New Encounter staying disabled (the
    capture shows it live; the viewer files no new encounters).

    Anchors: host.mois.dialog.preference-encounter / -encounter-list;
      host.mois.command.preference-encounter-{change|close} and
      host.mois.command.preference-encounter-list-{clear|continue|cancel|new}. */
export function PreferenceEncounterDialog({ encounterId, encounters, onChange, onClose, zIndex = 80 }: {
  encounterId: string; encounters: MoisRecord[]; onChange: (id: string) => void; onClose: () => void; zIndex?: number
}) {
  const [picking, setPicking] = useState(false)
  const [current, setCurrent] = useState(() => Math.max(0, encounters.findIndex(r => r.id_encounter === encounterId)))
  const encounter = encounters.find(r => r.id_encounter === encounterId)
  const rows = encounters.map(r => ROW_MAPS.encounters!.row(r))
  const choose = (id?: string) => { if (id) { onChange(id); onClose() } }
  const e = (key: string) => encounter?.[key] ?? ''
  const codes = (prefix: string) => [1, 2, 3, 4].map(i => e(`${prefix}_${i}`)).filter(Boolean).join(', ')
  const details = [
    ['Encounter No.:', encounterId],
    ['Date / Time:', [date(e('dtm_appoint')), e('num_appoint_hr') && e('num_appoint_min') ? `${e('num_appoint_hr').padStart(2, '0')}:${e('num_appoint_min').padStart(2, '0')}` : ''].filter(Boolean).join(' '), 'Appt Length:', e('num_time_slots')],
    ['Provider:', e('lkp_provider') || e('str_attending')],
    ['Service Location:', e('str_service_location')],
    ['Visit Code:', e('str_visit_code'), 'Appt Status:', e('str_appt_status')],
    ['Notes:', e('str_appt_note')],
    ['Diag Code(s):', codes('str_diag_code')],
    ['Service Code(s):', codes('str_fee_code')],
  ]
  const title = picking ? 'Encounter List' : `Encounter ID: ${encounterId || 'EMPTY'}`
  return (
    <ModalWindow title={title} onClose={onClose} portal="parent" zIndex={zIndex}
      trap={{ label: title, width: picking ? 'min(865px, 96%)' : 'min(416px, 96%)', style: { minWidth: 0 } }}
      tutorialId={picking ? 'host.mois.dialog.preference-encounter-list' : 'host.mois.dialog.preference-encounter'}
      windowStyle={{ width: '100%', height: picking ? 'min(615px, 85vh)' : 300, maxHeight: '90vh', ...(picking ? {} : { background: '#fff' }) }}>
        {picking ? <>
          <div className="pb-preference-encounter-list__body">
            <PBBand>Select Encounter</PBBand>
            <PBDataWindow rows={rows} columns={columns} current={current} onCurrentChange={setCurrent}
              onActivate={r => choose(r.id)} empty="No encounters on file." />
          </div>
          <div className="pb-row pb-preference-encounter-list__buttons">
            <PBButton className="pb-preference-encounter-list__side" command="preference-encounter-list-clear"
              onClick={() => { onChange(''); onClose() }}>Clear Encounter</PBButton>
            <span className="pb-preference-encounter-list__middle">
              <PBButton command="preference-encounter-list-continue" disabled={!rows[current]?.id}
                onClick={() => choose(rows[current]?.id)}>Continue</PBButton>
              <PBButton command="preference-encounter-list-cancel" onClick={onClose}>Cancel</PBButton>
            </span>
            <span className="pb-row__spacer" />
            <PBButton className="pb-preference-encounter-list__side" command="preference-encounter-list-new" disabled
              title="New encounters are not available in the chart export viewer">New Encounter</PBButton>
          </div>
        </> : <>
          <div className="pb-preference-encounter__body">
            {!encounterId ? <div className="pb-preference-encounter__empty">
              <p>Encounter ID is empty.</p><p>To link record to an encounter,</p><p>please select the CHANGE ENCOUNTER option.</p>
            </div> : encounter ? details.map(([label, value, secondary, extra]) => <div className="pb-preference-encounter__row" key={label}>
              <span>{label}</span><strong>{value}</strong>{secondary && <span>{secondary}&nbsp; <strong>{extra}</strong></span>}
            </div>) : <div className="pb-preference-encounter__empty"><p>Encounter No.: {encounterId}</p><p>This encounter is not included in the current chart export.</p></div>}
          </div>
          <div className="pb-row pb-preference-encounter__buttons">
            <PBButton command="preference-encounter-change" onClick={() => setPicking(true)}>Change Encounter</PBButton>
            <PBButton command="preference-encounter-close" onClick={onClose}>Close (Esc)</PBButton>
          </div>
        </>}
    </ModalWindow>
  )
}
