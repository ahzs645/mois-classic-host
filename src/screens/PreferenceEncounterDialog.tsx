import { useState } from 'react'
import type { MoisRecord } from '../data/charts'
import { date } from '../data/charts/relations'
import { ROW_MAPS } from '../data/charts/to-rows'
import { PBBand, PBButton, PBDataWindow, type PBColumn } from '../pb'
import { ModalWindow } from './dialogKit'
import './preferences-detail.css'

const columns: PBColumn<Record<string, string>>[] = [
  { key: 'date', header: 'Date', width: 90, align: 'center' },
  { key: 'hr', header: 'HR', width: 34, align: 'center' },
  { key: 'mn', header: 'MIN', width: 34, align: 'center' },
  { key: 'nbr', header: 'Slots', width: 50, align: 'center' },
  { key: 'code', header: 'Visit', width: 44, align: 'center' },
  { key: 'provider', header: 'Provider', width: 190 },
  { key: 'loc', header: 'Service Location', width: 210 },
  { key: 'reason', header: 'Note', width: 210 },
]

/** Encounter ID: a record's encounter, with Change Encounter to relink it.
    The Preferences folder opens it, and so does a Dynamic Form's
    "Encounter Date:" link, over the form window (hence `zIndex`). */
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
      trap={{ label: title, width: picking ? 'min(1000px, 96%)' : 'min(415px, 96%)', style: { minWidth: 0 } }}
      tutorialId={picking ? 'host.mois.dialog.preference-encounter-list' : 'host.mois.dialog.preference-encounter'}
      windowStyle={{ width: '100%', height: picking ? 'min(650px, 85vh)' : 300, maxHeight: '90vh', ...(picking ? {} : { background: '#fff' }) }}>
        {picking ? <>
          <div style={{ margin: '18px 16px 0', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <PBBand>Select Encounter</PBBand>
            <PBDataWindow rows={rows} columns={columns} current={current} onCurrentChange={setCurrent}
              onActivate={r => choose(r.id)} empty="No encounters on file." />
          </div>
          <div className="pb-row" style={{ padding: '20px 16px', gap: 8 }}>
            <PBButton onClick={() => { onChange(''); onClose() }}>Clear Encounter</PBButton>
            <span className="pb-row__spacer" />
            <PBButton disabled={!rows[current]?.id} onClick={() => choose(rows[current]?.id)}>Continue</PBButton>
            <PBButton onClick={onClose}>Cancel</PBButton>
            <span className="pb-row__spacer" />
            <PBButton disabled title="New encounters are not available in the chart export viewer">New Encounter</PBButton>
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
            <PBButton onClick={() => setPicking(true)}>Change Encounter</PBButton>
            <PBButton onClick={onClose}>Close (Esc)</PBButton>
          </div>
        </>}
    </ModalWindow>
  )
}
