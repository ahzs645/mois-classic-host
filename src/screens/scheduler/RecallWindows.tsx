import { useEffect, useState } from 'react'
import {
  PBButton, PBCheckbox, PBDataWindow, PBInput, PBSelect, PBTextArea, PBWindow,
} from '../../pb'
import { usePatient } from '../../data/patient-context'
import { RECALL_CODES } from '../../data/schedulerSetup'
import { currentRow, schedulerStore, useSchedulerStore } from '../../data/schedulerStore'
import { registerAreaWindow, type AreaWindowProps } from '../areaWindowRegistry'
import { SchedulerDialog, str } from './SchedulerDialog'

/* ============================================================================
   Recalls from the day book's right-click menu.

   Create Recall — art. 303815 `8b377798…`: a `Recall Information` box with
   Code (drop-down), Due Date and Grace Per. across the top, Reminder, the
   Event check boxes (Patient Arrive, Open Chart, Patient Discharge, Open
   Encounter Detail, Booking Appointment), Flag Item ▸ Highlight Row and a
   Description box; Create (F2) and Cancel. The codes are Administration's
   Reminder / Recall Code list (art. 303176). Opened as Create Reminder, the
   same window carries that title.

   Patient Recall List — art. 303818 `6f3b9b91…`: Create and Delete on its
   own strip, the patient line (CHART / FIRST / MIDDLE / LAST / DoB), a grid
   of Code / Note / Due / Stop / M, and under it Detail, Triggering Event,
   Recurring (if applicable), Other Items (Flag Item, Start Date, Grace Per.,
   Stopped By) and the record stamp; Save / Close and Close.
   ========================================================================= */

const DUE = '2026.11.11'

function CreateRecall({ args, close }: AreaWindowProps) {
  const row = currentRow()
  const [code, setCode] = useState('')
  const [due, setDue] = useState(DUE)
  const [reminder, setReminder] = useState('')
  const typed = JSON.stringify(args)
  useEffect(() => {
    const a = JSON.parse(typed) as Record<string, unknown>
    if (str(a.code)) setCode(str(a.code))
    if (str(a.due)) setDue(str(a.due))
    if (str(a.reminder)) setReminder(str(a.reminder))
  }, [typed])
  const create = () => {
    if (!row?.chart) return
    schedulerStore.createRecall({ chart: row.chart, code, due, reminder })
    close()
  }
  const title = str(args.title) || 'Create Recall'
  return (
    <SchedulerDialog
      id="create-recall"
      title={title}
      width={580}
      band="Recall Information"
      onClose={close}
      buttons={[
        { label: 'Create (F2)', id: 'create-recall', onClick: create, primary: true },
        { label: 'Cancel', id: 'cancel' },
      ]}
    >
      <div style={{ padding: '6px 8px', display: 'grid', gridTemplateColumns: '72px 1fr', rowGap: 6, alignItems: 'center' }}>
        <span>Code:</span>
        <div className="pb-row" style={{ gap: 8 }} data-tutorial-id="host.mois.field.recall-code">
          <PBSelect w={110} options={['', ...RECALL_CODES]} value={code} onChange={(e) => setCode(e.target.value)} />
          <span style={{ marginLeft: 60 }}>Due Date:</span>
          <PBInput w={84} align="center" value={due} onChange={(e) => setDue(e.target.value)} />
          <span style={{ marginLeft: 30 }}>Grace Per.:</span>
          <PBInput w={50} />
        </div>
        <span>Reminder:</span>
        <PBInput w={378} value={reminder} onChange={(e) => setReminder(e.target.value)} />
        <span style={{ alignSelf: 'start' }}>Event:</span>
        <div data-tutorial-id="host.mois.field.recall-events" style={{ display: 'grid', gridTemplateColumns: '160px 160px 1fr', rowGap: 4 }}>
          <PBCheckbox label="Patient Arrive" />
          <PBCheckbox label="Open Chart" />
          <span />
          <PBCheckbox label="Patient Discharge" />
          <PBCheckbox label="Open Encounter Detail" />
          <span />
          <PBCheckbox label="Booking Appointment" />
          <span />
          <span className="pb-row" style={{ gap: 6, justifySelf: 'end' }}>Flag Item: <PBCheckbox label="Highlight Row" /></span>
        </div>
        <span style={{ alignSelf: 'start' }}>Description:</span>
        <PBTextArea rows={7} w={464} />
      </div>
    </SchedulerDialog>
  )
}

function PatientRecallList({ close }: AreaWindowProps) {
  const s = useSchedulerStore()
  const patient = usePatient()
  const row = currentRow(s)
  const chart = row?.chart ?? ''
  const onChart = chart === patient.chart
  const [cur, setCur] = useState(0)
  const rows = [
    ...(onChart ? [{ code: 'FLU', note: 'Annual influenza vaccine', due: '2026.10.01', stop: false, m: '' }] : []),
    ...s.recalls.filter((r) => r.chart === chart).map((r) => ({ code: r.code, note: r.reminder, due: r.due, stop: false, m: '' })),
  ]
  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 85 }}>
      <PBWindow
        child
        controls={false}
        title="Patient Recall List"
        tutorialId="host.mois.dialog.patient-recall-list"
        onClose={close}
        style={{ width: 834, height: 540, maxWidth: '100%', maxHeight: '100%' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, padding: 10, background: 'var(--pb-face)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, border: '1px solid #646464', background: '#fff' }}>
            <div className="pb-cmdrow" data-tutorial-id="host.mois.field.recall-commands">
              <button type="button" className="pb-cmdrow__btn" data-tutorial-id="host.mois.command.recall-create" onClick={() => schedulerStore.done('recall-row-added')}>Create</button>
              <button type="button" className="pb-cmdrow__btn">Delete</button>
            </div>
            <div className="pb-row" style={{ gap: 0, padding: '4px 6px', justifyContent: 'space-between' }}>
              <span>CHART: <b>{chart}</b></span>
              <span>FIRST: <b>{row?.first}</b></span>
              <span>MIDDLE: <b>{onChart ? (patient.middle ?? '').toUpperCase() : ''}</b></span>
              <span>LAST: <b>{row?.last}</b></span>
              <span>DoB: <b>{onChart ? (patient.dob ?? '').replace(/\./g, '/') : ''}</b></span>
            </div>
            <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }} data-tutorial-id="host.mois.field.recall-grid">
              <PBDataWindow
                rows={rows}
                current={cur}
                onCurrentChange={setCur}
                columns={[
                  { key: 'code', header: 'Code', width: 92 },
                  { key: 'note', header: 'Note', width: 420 },
                  { key: 'due', header: 'Due', width: 104, align: 'center' },
                  { key: 'stop', header: 'Stop', width: 68, align: 'center', render: (r) => <PBCheckbox checked={!!r.stop} /> },
                  { key: 'm', header: 'M', width: 18 },
                ]}
                empty=""
              />
            </div>
            <div style={{ borderTop: '1px solid #bdbdbd', padding: '6px 10px', display: 'grid', gridTemplateColumns: '230px 160px 200px 1fr', gap: 14, fontSize: 11 }}>
              <div>Detail:<PBTextArea rows={6} w="100%" /></div>
              <div style={{ display: 'grid', gap: 2, alignContent: 'start' }}>
                <span>Triggering Event:</span>
                <PBCheckbox label="Patient Arrival" checked={rows.length > 0} />
                <PBCheckbox label="Patient Discharge" />
                <PBCheckbox label="Booking Appointment" />
                <PBCheckbox label="Open Chart" />
                <PBCheckbox label="Open Encounter Detail" />
              </div>
              <div style={{ display: 'grid', gap: 4, alignContent: 'start' }}>
                <span>Recurring (if applicable):</span>
                <span className="pb-row" style={{ gap: 4 }}>Repeat every <PBInput w={30} /> <PBSelect w={62} options={['Month(s)', 'Year(s)']} /></span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: 4, alignContent: 'start' }}>
                <span style={{ gridColumn: 'span 2' }}>Other Items:</span>
                <span style={{ textAlign: 'right' }}>Flag Item:</span><PBCheckbox label="Highlight Row" />
                <span style={{ textAlign: 'right' }}>Start Date:</span><PBInput w={84} value={rows[cur]?.due ?? ''} readOnly />
                <span style={{ textAlign: 'right' }}>Grace Per.:</span><span><PBInput w={42} value="0" readOnly /> (days before due)</span>
                <span style={{ textAlign: 'right' }}>Stopped By:</span><span />
              </div>
            </div>
            <div className="pb-row" style={{ padding: '2px 10px 4px', borderTop: '1px solid #bdbdbd', gap: 90 }}>
              <span>Record Created:</span><span>Last Modified:</span>
            </div>
          </div>
          <div className="pb-row" style={{ justifyContent: 'center', gap: 10, padding: '10px 0 2px' }}>
            <PBButton style={{ minWidth: 88 }} data-tutorial-id="host.mois.command.save-close" onClick={() => { schedulerStore.done('recalls-saved'); close() }}>Save / Close</PBButton>
            <PBButton style={{ minWidth: 88 }} onClick={close}>Close</PBButton>
          </div>
        </div>
      </PBWindow>
    </div>
  )
}

registerAreaWindow('create-recall', CreateRecall)
registerAreaWindow('patient-recall-list', PatientRecallList)
