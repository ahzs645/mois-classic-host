import { useState } from 'react'
import { ageOf, type Patient } from '../data/patients'
import type { OpeningReminder } from '../data/opening-reminders'
import { PBButton, PBCheckbox, PBDataWindow, PBWindow, type PBColumn } from '../pb'
import './opening-chart-reminder.css'

/* Opening-chart notification, laid out from the supplied MOIS: TRAINING
   capture. The chart identity and reminder rows come from the open chart. */
type Row = OpeningReminder & { stoppedNow: boolean }

export function OpeningChartReminderDialog({ patient, reminders, stopped, onStop, onClose }: {
  patient: Patient
  reminders: OpeningReminder[]
  stopped: ReadonlySet<string>
  onStop: (index: number, value: boolean) => void
  onClose: () => void
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
    { key: 'note', header: '', width: '18%', render: () => <strong>SEE NOTE BELOW</strong> },
  ]

  return (
    <div
      className="pb-modal-layer pb-modal-layer--plain pb-opening-reminder-layer"
      role="dialog" aria-modal="true" aria-label="Automated Notification Service"
    >
      <PBWindow
        child controls={false} title="Automated Notification Service"
        tutorialId="host.mois.dialog.opening-chart-reminder"
        onClose={onClose}
        className="pb-opening-reminder"
      >
        <div className="pb-opening-reminder__red">
          <div className="pb-opening-reminder__content">
            <div className="pb-opening-reminder__heading">
              <strong>Reminder: Opening Chart</strong>
              <strong>chart no.: {patient.chart} {patient.first} {patient.last} {reminderAge(patient.dob)} {patient.gender}</strong>
            </div>
            <div className="pb-opening-reminder__identity">
              <span>CHART: <b>{patient.chart}</b></span>
              <span>FIRST: <b>{patient.first}</b></span>
              <span>MIDDLE: <b>{patient.middle}</b></span>
              <span>LAST: <b>{patient.last}</b></span>
              <span>DoB: <b>{patient.dob.replace(/\./g, '/')}</b></span>
            </div>
            <div className="pb-opening-reminder__list-label">Reminder List</div>
            <PBDataWindow
              columns={columns}
              rows={rows}
              current={current}
              onCurrentChange={setCurrent}
              zebra={false}
              rules="white"
              style={{ flex: '1 1 auto', minHeight: 0, border: 0 }}
              rowClassName={() => 'pb-opening-reminder__row'}
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
      </PBWindow>
    </div>
  )
}

/* The reminder spells the unit out — `39 YEAR OLD M` in the 3924 capture —
   where the view headers abbreviate it (`39 YR OLD`). Only the year form is
   captured, so months keep the header's `MTH`. */
const reminderAge = (dob: string) => ageOf(dob).replace(/\bYR\b/g, 'YEAR')
