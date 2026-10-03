import { useState } from 'react'
import { MOIS_TODAY } from '../../data/clock'
import { usePatientRoster } from '../../data/patient-context'
import { findPatient, type Patient } from '../../data/patients'
import { argStr } from '../../data/text'
import { useScreenReport } from '../../host/screen-state'
import { OpeningChartReminderDialog } from '../OpeningChartReminderDialog'
import { registerAreaWindow, type AreaWindowProps } from '../areaWindowRegistry'

/* ============================================================================
   "Reminder: Opening Encounter Detail" — the Automated Notification Service
   window over an Encounter Detail Window the day book has just opened
   (Drive Mois 2026-09-21 4.38.59 PM; Desktop 2026-10-02 11.43.48 PM). It is
   the Opening Chart reminder's window (OpeningChartReminderDialog) with the
   encounter heading.

   Which rows: every reminder on the chart that has not been stopped, the
   due ones red — the 10-02 capture lists three rows of which only the first
   is red. It opens only when at least one is due, like the chart reminder.
   INFERRED: the not-due rows are listed (the capture shows black rows but not
   their dates). Stop Reminder ticks are kept for the session's open window
   only; the frame's own Opening Chart ticks are separate state.
   ========================================================================= */

const listed = (p: Patient | undefined) => (p?.reminders ?? []).filter((r) => !r.stopped)

/** whether opening this chart's encounter raises the reminder */
export function hasDueReminder(roster: Patient[], chart: string): boolean {
  return listed(findPatient(chart, roster)).some((r) => r.due <= MOIS_TODAY)
}

function EncounterOpeningReminder({ args, close }: AreaWindowProps) {
  const roster = usePatientRoster()
  const patient = findPatient(argStr(args.chart), roster)
  const [stopped, setStopped] = useState<Set<string>>(new Set())
  const reminders = listed(patient)
  useScreenReport({ encounterReminders: reminders.length, encounterRemindersStopped: stopped.size })
  if (!patient) return null
  return (
    <OpeningChartReminderDialog
      variant="encounter"
      today={MOIS_TODAY}
      patient={patient}
      reminders={reminders}
      stopped={stopped}
      onStop={(index, value) => {
        const reminder = reminders[index]
        if (!reminder) return
        setStopped((prev) => {
          const next = new Set(prev)
          if (value) next.add(`${patient.chart}:${reminder.code}`)
          else next.delete(`${patient.chart}:${reminder.code}`)
          return next
        })
      }}
      onClose={close}
    />
  )
}

registerAreaWindow('encounter-opening-reminder', EncounterOpeningReminder)
