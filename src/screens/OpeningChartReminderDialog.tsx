import { useState } from 'react'
import { ageOf, type Patient } from '../data/patients'
import type { OpeningReminder } from '../data/opening-reminders'
import { PBButton, PBCheckbox, PBDataWindow, type PBColumn } from '../pb'
import { ModalWindow } from './dialogKit'
import { PatientFieldRow } from './patientKit'
import './opening-chart-reminder.css'

/* Opening-chart notification, laid out from the supplied MOIS: TRAINING
   capture. The chart identity and reminder rows come from the open chart.

   `variant="encounter"` is the same Automated Notification Service window
   when an Encounter Detail Window opens on a chart with a reminder due:
   only the heading changes, to "Reminder: Opening Encounter Detail" (Drive
   Mois 2026-09-21 4.38.59 PM, chart 3924 — otherwise identical to the
   Opening Chart capture; Desktop 2026-10-02 11.43.48 PM, chart 3424).
   The 10-02 capture also shows how rows without a note print: regular
   weight, no "SEE NOTE BELOW", red only while due (the not-yet-due rows are
   black), on the DataWindow zebra. A row with a note keeps the bold red and
   "SEE NOTE BELOW" of both 3924 captures. INFERRED: what makes a row red is
   its due date having passed (the black rows' dates are not shown). */
type Row = OpeningReminder & { stoppedNow: boolean }

export function OpeningChartReminderDialog({ patient, reminders, stopped, onStop, onClose, variant = 'chart', today }: {
  patient: Patient
  reminders: OpeningReminder[]
  stopped: ReadonlySet<string>
  onStop: (index: number, value: boolean) => void
  onClose: () => void
  /** what is opening: the chart (the default) or an Encounter Detail Window */
  variant?: 'chart' | 'encounter'
  /** MOIS today, for which rows are due; omitted, every row counts as due */
  today?: string
}) {
  const [current, setCurrent] = useState(0)
  const rows: Row[] = reminders.map((reminder) => ({
    ...reminder,
    stoppedNow: stopped.has(`${patient.chart}:${reminder.code}`),
  }))
  const selected = rows[Math.min(current, rows.length - 1)]
  const columns: PBColumn<Row>[] = [
    { key: 'code', header: 'Code', width: '11%' },
    { key: 'reminder', header: 'Reminder', width: '43%' },
    { key: 'level', header: 'Level', width: '13%' },
    { key: 'stoppedNow', header: 'Stop Reminder', width: '15%', align: 'center', render: (row, index) => (
      <PBCheckbox
        checked={row.stoppedNow}
        tutorialId={`host.mois.reminder.stop.${index}`}
        onChange={(value) => onStop(index, value)}
      />
    ) },
    { key: 'note', header: '', width: '18%', render: (row) => (row.note ? <strong>SEE NOTE BELOW</strong> : null) },
  ]

  return (
    <ModalWindow
      id={variant === 'encounter' ? 'encounter-opening-reminder' : 'opening-chart-reminder'}
      title="Automated Notification Service"
      onClose={onClose}
      windowClassName="pb-opening-reminder"
      layerClassName="pb-modal-layer pb-modal-layer--plain pb-opening-reminder-layer"
      layerAttrs={{ role: 'dialog', 'aria-modal': true, 'aria-label': 'Automated Notification Service' }}
    >
        <div className="pb-opening-reminder__red">
          <div className="pb-opening-reminder__content">
            <div className="pb-opening-reminder__heading">
              <strong>{variant === 'encounter' ? 'Reminder: Opening Encounter Detail' : 'Reminder: Opening Chart'}</strong>
              <strong>chart no.: {patient.chart} {patient.first} {patient.last} {reminderAge(patient.dob)} {patient.gender}</strong>
            </div>
            <PatientFieldRow layout="inline" className="pb-opening-reminder__identity" style={null} fields={[
              { label: 'CHART:', value: patient.chart }, { label: 'FIRST:', value: patient.first },
              { label: 'MIDDLE:', value: patient.middle }, { label: 'LAST:', value: patient.last },
              { label: 'DoB:', value: patient.dob.replace(/\./g, '/') },
            ]} />
            <div className="pb-opening-reminder__list-label">Reminder List</div>
            <PBDataWindow
              columns={columns}
              rows={rows}
              current={current}
              onCurrentChange={setCurrent}
              zebra
              rules="white"
              style={{ flex: '1 1 auto', minHeight: 0, border: 0 }}
              rowClassName={(row) => cx(
                'pb-opening-reminder__row',
                !row.note && 'pb-opening-reminder__row--plain',
                Boolean(today) && row.due > (today ?? '') && 'pb-opening-reminder__row--later',
              )}
            />
            <div className="pb-opening-reminder__detail-head">
              <strong>Description / Detail</strong>
              <span>DUE DATE: {selected?.due}</span>
            </div>
            <div className="pb-opening-reminder__detail">{selected?.note}</div>
          </div>
          <div className="pb-opening-reminder__footer">
            <PBButton wide onClick={onClose} data-tutorial-id="host.mois.reminder.close">Close</PBButton>
          </div>
        </div>
    </ModalWindow>
  )
}

/* The reminder spells the unit out — `39 YEAR OLD M` in the 3924 capture —
   where the view headers abbreviate it (`39 YR OLD`). Only the year form is
   captured, so months keep the header's `MTH`. */
const cx = (...names: (string | false)[]) => names.filter(Boolean).join(' ')

const reminderAge = (dob: string) => ageOf(dob).replace(/\bYR\b/g, 'YEAR')
