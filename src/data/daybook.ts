/* ============================================================================
   The training day book: one day of appointments, and the appointment
   statuses that can be set against them.

   Column set, row pitch and the visit-code palette are transcribed from
   `Screenshot_2024-01-02_160729.png` (MOIS v02.30.22, 1920 px, maximised),
   the clearest full-width capture of the Scheduler view. The patients are
   synthetic, like the rest of this emulator; the visit codes, their colours
   and the row order are the capture's.
   ========================================================================= */

export type Appointment = {
  hr: string; mn: string; code: string; mode: string; n: string
  chart: string; first: string; last: string; reason: string
  loc: string; resource: string; room: string
  as: string; tk: string; mg: string
  issue: string; services: string; payor: string
  ds: string; bs: string; tm: string; rp: string
}

/**
 * Visit-code colours, sampled from the capture's eight rows. A clinic
 * configures these in Administration, so they are a training palette rather
 * than a MOIS default.
 */
export const VISIT_CODE_FILL: Record<string, string> = {
  O: '#00b9b9',
  SA: '#cacaff',
  C: '#b764fb',
  U: '#00ff00',
  FP: '#ff80c0',
  TR: '#ffffae',
  R: '#b1d8d8',
  PROC: '#ff46a3',
}

const a = (
  hr: string, mn: string, code: string, chart: string, first: string, last: string,
  reason: string, rest: Partial<Appointment> = {},
): Appointment => ({
  hr, mn, code, mode: 'DE', n: '3', chart, first, last, reason,
  loc: 'PRINCE GEORGE CLINIC', resource: '', room: '',
  as: '', tk: '', mg: '', issue: '', services: '', payor: '',
  ds: '', bs: '', tm: '', rp: '', ...rest,
})

export const daybookAppointments: Appointment[] = [
  a('08', '30', 'O', '10035', 'FARMER', 'BROWN', 'Office visit'),
  a('09', '00', 'SA', '10121', 'GEORGE', 'ADAM', 'Same day — sore throat'),
  a('09', '30', 'C', '10088', 'MARGARET', 'HALE', 'Counselling'),
  a('10', '00', 'U', '10204', 'PRIYA', 'RAO', 'Urgent — chest pain', { room: '2' }),
  a('10', '30', 'FP', '10247', 'SAM', 'OKONKWO', 'Full physical'),
  a('11', '00', 'TR', '10312', 'DALE', 'FONTAINE', 'Treatment room — dressing'),
  a('13', '00', 'R', '10035', 'FARMER', 'BROWN', 'Follow-up — blood pressure'),
  a('13', '30', 'PROC', '10419', 'JUNE', 'CASTILLO', 'Procedure — mole excision', { room: '1' }),
]

/**
 * The seven appointment statuses, in the order the live drop-down lists them.
 * Read off `qu/8876/image.png`, the capture in "How to Enter Appointment
 * Status" (ID303827) that has the AS cell's list open. Note the list says
 * `Seen` and `Discharged` where the article's own table writes "Seen/Start"
 * and "Discharge" — the list's wording is the one on screen.
 */
export const APPOINTMENT_STATUSES: { code: string; label: string; detail: string }[] = [
  { code: 'A', label: 'Arrived', detail: 'Use to mark the time the patient arrived for the appointment' },
  { code: 'I', label: 'In Room', detail: 'Use to mark the time the patient was put into a room' },
  { code: 'S', label: 'Seen', detail: 'Use to mark the time the Provider starts the appointment' },
  { code: 'D', label: 'Discharged', detail: 'Use to mark the time the patient appointment is complete/finished' },
  { code: 'N', label: 'No Show', detail: 'Use to identify that the patient did not show up for their appointment' },
  { code: 'R', label: 'Rebooked', detail: 'Use to identify that the appointment has been rescheduled and will no longer occur on this date' },
  { code: 'C', label: 'Cancelled', detail: 'Use to identify that the appointment has been cancelled - either by the patient or Provider' },
]

/** The three (now four) statuses the Hide Status filter can drop from view. */
export const HIDDEN_BY_DEFAULT = new Set(['N', 'R', 'C'])

/** A row for an appointment booked from the New Appointment window. */
export function bookedAppointment(draft: {
  hr: string; mn: string; slots: string; chart: string; reason: string
}): Appointment {
  const pad = (v: string, fallback: string) => (v.trim() ? v.trim().padStart(2, '0').slice(-2) : fallback)
  return {
    hr: pad(draft.hr, '14'), mn: pad(draft.mn, '00'), code: 'O', mode: 'DE',
    n: draft.slots.trim() || '3',
    chart: draft.chart.trim() || '10035', first: '', last: '',
    reason: draft.reason.trim() || 'Office visit',
    loc: 'PRINCE GEORGE CLINIC', resource: '', room: '',
    as: '', tk: '', mg: '', issue: '', services: '', payor: '',
    ds: '', bs: '', tm: '', rp: '',
  }
}
