import { useState } from 'react'
import { useChartRecords } from '../data/chart-records'
import { date } from '../data/charts/relations'
import { usePatient } from '../data/patient-context'
import { useEncounterSession } from '../host/encounterArea'
import {
  PBBand, PBButton, PBDataWindow, PBInput, PBPatientBannerYellow, PBTextArea, PBWindow,
} from '../pb'
import { registerAreaWindow, type AreaWindowProps } from './areaWindowRegistry'

/* ============================================================================
   Measure History — Measures ▸ Action ▸ Show History (or the row's right-click
   Show History).

   PROVENANCE: art. 302837 `6db471eb…` (the right-click menu, Show History
   ringed) and `546536b7…` (the window, 955×633): the yellow patient banner;
   "Selected Item Detail" (Description / Value, MOIS Code / LOINC / Reference
   Range … to …, Collect Date / Status / Flag, Comment, and Create Message /
   Create Task beside it); "Goal(s)" (Goal / Start / End); "Related
   Measurements (Including Selected)" (Collected / Value / Test Name /
   Comment, and an Add to Comment link per row); Graph at the lower left and
   Save (F2) / Cancel centred. The article: a comment can be added to a
   signed record here without unsigning it, and a Message or Task raised
   from the result.
   ========================================================================= */

function MeasureHistory({ close, open }: AreaWindowProps) {
  const patient = usePatient()
  const { session } = useEncounterSession()
  const selected = session.measureSelected
  const measures = useChartRecords('measure', 'dtm_collect_date')
  const record = measures.find((r) => r.id_measure === selected?.id)
  const related = measures.filter((r) => r.str_code && r.str_code === (record?.str_code ?? selected?.code))
  const [comment, setComment] = useState(record?.str_comment ?? '')
  const field = (w: number | string, value?: string, yellow?: boolean) => (
    <PBInput w={w} value={value ?? ''} readOnly style={yellow ? { background: 'var(--pb-yellow)' } : undefined} />
  )
  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ position: 'fixed', padding: 8, zIndex: 96 }}>
      <PBWindow
        child
        controls={false}
        tutorialId="host.mois.dialog.measure-history"
        title="Measure History"
        onClose={close}
        style={{ width: 'min(955px, 100%)', height: 'min(633px, 100%)' }}
      >
        <PBPatientBannerYellow name={patient.short} bchn={patient.bchn ?? ''} home={patient.phone} dob={patient.dob} sex={patient.sex} />
        <div style={{ display: 'flex', gap: 2, padding: '4px 6px 0', flex: 'none' }}>
          <div className="pb-groupbox" style={{ flex: '1 1 auto', minWidth: 0 }}>
            <PBBand>Selected Item Detail</PBBand>
            <div style={{ padding: '4px 8px', display: 'grid', gridTemplateColumns: '72px 316px 1fr', rowGap: 3, alignItems: 'center' }}>
              <span>Description:</span>{field(314, record?.str_description ?? selected?.test)}
              <span className="pb-row" style={{ justifyContent: 'flex-end' }}>Value: {field(142, record?.str_value ?? selected?.value)}</span>
              <span>MOIS Code:</span>
              <span className="pb-row" style={{ gap: 0 }}>{field(94, record?.str_code ?? selected?.code)}<span style={{ marginLeft: 70 }}>LOINC: {record?.str_loinic_num ?? ''}</span></span>
              <span className="pb-row" style={{ justifyContent: 'flex-end' }}>Reference Range: {field(56, record?.str_normal_lower, true)} to {field(56, record?.str_normal_high, true)}</span>
              <span>Collect Date:</span>
              <span className="pb-row">{field(94, date(record?.dtm_collect_date) || selected?.collected)}<PBInput w={40} value=":" readOnly /><span style={{ marginLeft: 22 }}>Status:</span>{field(44, record?.str_status)}</span>
              <span className="pb-row" style={{ justifyContent: 'flex-end' }}>Flag: {field(56, record?.str_abnormal)}</span>
            </div>
            <div className="pb-row" style={{ padding: '0 8px 6px', alignItems: 'flex-start' }}>
              <span style={{ width: 72 }}>Comment:</span>
              <PBTextArea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} w={460} data-tutorial-id="host.mois.field.measure-history-comment" />
              <span className="pb-stack" style={{ gap: 4, marginTop: 20 }}>
                <PBButton onClick={() => open('create-message')}>Create Message</PBButton>
                <PBButton onClick={() => open('create-task')}>Create Task</PBButton>
              </span>
            </div>
          </div>
          <div className="pb-groupbox" style={{ width: 292, flex: 'none', display: 'flex', flexDirection: 'column' }}>
            <PBBand>Goal(s)</PBBand>
            <div style={{ flex: '1 1 auto', display: 'flex' }}>
              <PBDataWindow flush gutter={false} rows={[]} columns={[
                { key: 'goal', header: 'Goal', width: 70 }, { key: 'start', header: 'Start', width: 96 }, { key: 'end', header: 'End' },
              ]} empty="" />
            </div>
          </div>
        </div>
        <div className="pb-groupbox" style={{ flex: '1 1 auto', minHeight: 0, margin: '6px 6px 0', display: 'flex', flexDirection: 'column' }}>
          <PBBand>Related Measurements (Including Selected)</PBBand>
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
            <PBDataWindow
              flush
              gutter={false}
              rows={related.map((r) => ({ collected: date(r.dtm_collect_date), value: r.str_value ?? '', test: r.str_description ?? '', comment: r.str_comment ?? '' }))}
              columns={[
                { key: 'collected', header: 'Collected', width: 70 },
                { key: 'value', header: 'Value', width: 78 },
                { key: 'test', header: 'Test Name', width: 248 },
                { key: 'comment', header: 'Comment', width: 300 },
                {
                  key: 'add', header: '', width: 120,
                  render: (r) => <button className="pb-link" onClick={() => setComment((c) => [c, `${r.collected} ${r.value}`].filter(Boolean).join('\n'))}>Add to Comment</button>,
                },
              ]}
              empty=""
            />
          </div>
        </div>
        <div className="pb-row" style={{ padding: '8px 6px 8px', flex: 'none' }}>
          <PBButton style={{ minWidth: 75 }} onClick={() => { const code = record?.str_code ?? selected?.code; close(); if (code) open('measurement-graph', { code }) }}>Graph</PBButton>
          <span className="pb-row__spacer" />
          <PBButton style={{ minWidth: 75 }} data-tutorial-id="host.mois.command.measure-history-save" onClick={close}>Save (F2)</PBButton>
          <PBButton style={{ minWidth: 75 }} onClick={close}>Cancel</PBButton>
          <span className="pb-row__spacer" />
          <span style={{ width: 75 }} />
        </div>
      </PBWindow>
    </div>
  )
}

registerAreaWindow('show-history', MeasureHistory)
