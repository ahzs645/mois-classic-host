import type { Patient } from './patients'

export type OpeningReminder = NonNullable<Patient['reminders']>[number]

/** MOIS dates sort lexically in YYYY.MM.DD form. */
export function dueOpeningReminders(patient: Patient | undefined, today: string): OpeningReminder[] {
  return (patient?.reminders ?? []).filter((reminder) =>
    !reminder.stopped && reminder.due <= today,
  )
}
