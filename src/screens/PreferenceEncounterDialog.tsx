import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { MoisRecord } from '../data/charts'
import { date } from '../data/charts/relations'
import { ROW_MAPS } from '../data/charts/to-rows'
import { PBBand, PBButton, PBDataWindow, PBWindow, type PBColumn } from '../pb'

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

export function PreferenceEncounterDialog({ encounterId, encounters, onChange, onClose }: {
  encounterId: string; encounters: MoisRecord[]; onChange: (id: string) => void; onClose: () => void
}) {
  const [picking, setPicking] = useState(false)
  const anchor = useRef<HTMLSpanElement>(null)
  const [layer, setLayer] = useState<HTMLElement | null>(null)
  const [current, setCurrent] = useState(() => Math.max(0, encounters.findIndex(r => r.id_encounter === encounterId)))
  const dialog = useRef<HTMLDivElement>(null)
  const encounter = encounters.find(r => r.id_encounter === encounterId)
  const rows = encounters.map(r => ROW_MAPS.encounters!.row(r))
  const choose = (id?: string) => { if (id) { onChange(id); onClose() } }
  useLayoutEffect(() => {
    setLayer((anchor.current?.closest('.pb-desktop') as HTMLElement | null) ?? anchor.current?.parentElement ?? null)
  }, [])
  useEffect(() => {
    if (!layer) return
    const previous = document.activeElement as HTMLElement | null
    dialog.current?.focus()
    return () => previous?.focus()
  }, [layer])
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
  const content = <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 80 }}>
    <div role="dialog" aria-modal="true" aria-label={picking ? 'Encounter List' : `Encounter ID: ${encounterId || 'EMPTY'}`}
      style={{ width: picking ? 'min(1000px, 96%)' : 'min(470px, 96%)', minWidth: 0 }}
      ref={dialog} tabIndex={-1} onKeyDown={event => {
        if (event.key === 'Escape') { event.stopPropagation(); onClose() }
        if (event.key === 'Tab') {
          const items = [...(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]') ?? [])]
          const first = items[0], last = items[items.length - 1]
          if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus() }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
        }
      }}>
      <PBWindow child controls={false} title={picking ? 'Encounter List' : `Encounter ID: ${encounterId || 'EMPTY'}`}
        onClose={onClose} tutorialId={picking ? 'host.mois.dialog.preference-encounter-list' : 'host.mois.dialog.preference-encounter'}
        style={{ width: '100%', height: picking ? 'min(650px, 85vh)' : 344, maxHeight: '90vh' }}>
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
          <div className="pb-row" style={{ padding: '22px 16px', justifyContent: 'center', gap: 10 }}>
            <PBButton onClick={() => setPicking(true)}>Change Encounter</PBButton>
            <PBButton onClick={onClose}>Close (Esc)</PBButton>
          </div>
        </>}
      </PBWindow>
    </div>
  </div>
  return <><span ref={anchor} hidden />{layer && createPortal(content, layer)}</>
}
