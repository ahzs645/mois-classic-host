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
  /** the M (general note) and paperclip roll-ups past RP */
  m?: string; clip?: string
  /** the encounter this appointment *is* — only rows on the open training
      chart (87288) carry one, because only that chart has an export */
  enc?: string
  /** the resource day book names the provider seeing the patient */
  provider?: string
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

/* ---------------------------------------------------------------------------
   The visit-code table itself — what the `Visit Code` field drops.

   Transcribed from a capture of the dropped list on the encounter window:
   `Code | Description | Visit Mode | # | MHK`, the first screenful (A to N)
   of a longer list. The `#` cell is the code's default slot count, painted in
   the colour the day book books that code in — which is why this list doubles
   as the palette legend.

   This is a different clinic's configuration from `VISIT_CODE_FILL` above, so
   the two palettes disagree about `C`; both are real, neither is the default.
   Two codes are clipped by their column in the capture and are recorded as
   MOIS renders them: `CONSU` prints as `CONSI` and `MINOR` as `MINOF`.
 ------------------------------------------------------------------------- */
export type VisitCode = {
  code: string
  description: string
  mode: string
  /** default slots; blank on a code that does not book time */
  slots: string
  /** the colour MOIS fills the slot-count cell — and the appointment — with */
  fill?: string
}

export const visitCodeRows: VisitCode[] = [
  { code: 'A', description: 'Ambulatory', mode: '', slots: '' },
  { code: 'AC', description: 'Anonymous Client', mode: '', slots: '1', fill: '#ffffff' },
  { code: 'C', description: 'Community Visit', mode: '', slots: '6', fill: '#c8a982' },
  { code: 'CED', description: 'Client Education', mode: '', slots: '6', fill: '#8080c0' },
  { code: 'CONSU', description: 'Consultation', mode: '', slots: '12', fill: '#3fd7a4' },
  { code: 'DT', description: 'Diagnostic Test', mode: '', slots: '2', fill: '#c0c0c0' },
  { code: 'DTP', description: 'Day Treatment Program', mode: '', slots: '90', fill: '#ff5500' },
  { code: 'ER', description: 'Emergency Room', mode: '', slots: '3', fill: '#ff8080' },
  { code: 'G', description: 'Group Medical/Education', mode: '', slots: '12', fill: '#cfe8f8' },
  { code: 'GPS', description: 'GP Specialist', mode: '', slots: '3', fill: '#a8a8a8' },
  { code: 'H', description: 'Home Visit', mode: '', slots: '6', fill: '#a8a060' },
  { code: 'I', description: 'Inpatient', mode: '', slots: '3', fill: '#d8d0a0' },
  { code: 'INJ', description: 'Injection', mode: '', slots: '0', fill: '#ffffff' },
  { code: 'LA', description: 'Long Assessment', mode: '', slots: '12', fill: '#b0b0e8' },
  { code: 'MINOR', description: 'Minor Procedure', mode: '', slots: '6', fill: '#ffc8f0' },
  { code: 'N', description: 'Note, Patient Not Seen', mode: '', slots: '0', fill: '#ffff00' },
]

/* Every flag column MOIS paints on an empty appointment: DS and BS start at
   `I` (Incomplete) and the four roll-ups TK / MG / TM / RP, and M, at `-`.
   Read off art. 303827 `b567c24a…` and art. 303834 `d2620a14…` (v02.30.22),
   where every untouched row carries exactly these. */
const FLAGS = { as: '', tk: '-', mg: '-', ds: 'I', bs: 'I', tm: '-', rp: '-', m: '-', clip: '' }

const a = (
  hr: string, mn: string, code: string, chart: string, first: string, last: string,
  reason: string, rest: Partial<Appointment> = {},
): Appointment => ({
  hr, mn, code, mode: 'DE', n: '3', chart, first, last, reason,
  loc: 'PRINCE GEORGE CLINIC', resource: '', room: '',
  issue: '', services: '', payor: '',
  ...FLAGS, ...rest,
})

/* The training chart every lesson opens (87288, PATCH AADAMS) is on this
   day book four times, each row bound to one of that chart's real
   encounters, so a double-click on the row opens the encounter it describes:
   08:30 an open visit with no note yet (DS I), 11:30 the visit its
   measurements were taken at, 13:00 a wound-care visit carrying two progress
   notes, and 14:00 the WCB visit whose report is on the chart. Everyone else
   is synthetic. */
export const TRAINING_CHART = '87288'

/** TECHNICAL SUPPORT's day, 2026.08.11 — the day book the Scheduler opens on. */
export const daybookAppointments: Appointment[] = [
  a('08', '30', 'O', TRAINING_CHART, 'PATCH', 'AADAMS', 'Office visit', { enc: '535349' }),
  a('09', '00', 'SA', '10121', 'GEORGE', 'ADAM', 'Same day — sore throat'),
  a('09', '30', 'C', '10088', 'MARGARET', 'HALE', 'Counselling', { n: '12' }),
  a('10', '00', 'U', '10204', 'PRIYA', 'RAO', 'Urgent — chest pain', { room: '2' }),
  a('10', '30', 'FP', '10247', 'SAM', 'OKONKWO', 'Full physical', { n: '6' }),
  a('11', '00', 'TR', '10312', 'DALE', 'FONTAINE', 'Treatment room — dressing'),
  a('11', '30', 'R', TRAINING_CHART, 'PATCH', 'AADAMS', 'Diabetes follow-up', { enc: '531588', tm: '5' }),
  a('13', '00', 'R', TRAINING_CHART, 'PATCH', 'AADAMS', 'Wound care', { enc: '530216', ds: 'C', m: '1' }),
  a('13', '30', 'PROC', '10419', 'JUNE', 'CASTILLO', 'Procedure — mole excision', { room: '1', n: '6' }),
  a('14', '00', 'R', TRAINING_CHART, 'PATCH', 'AADAMS', 'WCB — arthritis', { enc: '530205', payor: 'WC', ds: 'C', rp: '1' }),
]

/* The other providers' 2026.08.11. Each keeps an 08:30 and a 09:30 row,
   because the lessons that switch provider ring those two times; the rest of
   the day, the patients and the count are theirs. */
const PROVIDER_DAYS: Record<string, Appointment[]> = {
  'BEARDWOOD, WALTER': [
    a('08', '30', 'R', '10458', 'HELEN', 'MARCHAND', 'Rx renewal'),
    a('08', '45', 'R', '10177', 'OSCAR', 'LINDQVIST', 'Follow-up — diabetes'),
    a('09', '30', 'FP', '10390', 'NINA', 'PETROVA', 'Full physical', { n: '6' }),
    a('10', '15', 'SA', '10266', 'TOBY', 'WEST', 'Same day — earache'),
    a('11', '00', 'C', '10501', 'IRENE', 'DOUCETTE', 'Counselling', { n: '12' }),
    a('14', '30', 'O', '10139', 'KEVIN', 'ASHFORD', 'Office visit'),
  ],
  'HOWSER, DOOGIE': [
    a('08', '30', 'U', '10620', 'LIAM', 'BRENNAN', 'Urgent — laceration'),
    a('09', '30', 'R', '10611', 'ZOE', 'KAPOOR', 'Well-baby check'),
    a('10', '00', 'R', '10614', 'AVA', 'NGUYEN', 'Immunization'),
    a('15', '00', 'O', '10633', 'MILES', 'ORTEGA', 'Office visit'),
  ],
  'DUCHARME, AMARILYS': [
    a('08', '30', 'R', '10702', 'ROSE', 'TREMBLAY', 'Care plan review'),
    a('09', '30', 'C', '10715', 'ELLIS', 'GRANT', 'Counselling', { n: '12' }),
    a('13', '00', 'R', '10720', 'VERA', 'STOLZ', 'Medication review'),
  ],
  'FAIRCHILD, NESRIN L': [
    a('08', '30', 'O', '10801', 'PAUL', 'ROMERO', 'Office visit'),
    a('09', '00', 'TR', '10804', 'ANNA', 'BERG', 'Treatment room — dressing'),
    a('09', '30', 'R', '10812', 'LUCAS', 'MOREAU', 'Blood pressure check'),
    a('11', '30', 'SA', '10817', 'FIONA', 'LYNCH', 'Same day — rash'),
    a('14', '00', 'R', '10823', 'OMAR', 'HADDAD', 'Follow-up — asthma'),
  ],
  'SHEWCHUK, LEAH': [],
}

/* Any other day: a deterministic spread of the same synthetic patients, so
   moving the date shows a different list without a table per date, and the
   weekend is empty the way a clinic's is. */
const POOL: [string, string, string, string, string][] = [
  ['10121', 'GEORGE', 'ADAM', 'R', 'Follow-up — sore throat'],
  ['10088', 'MARGARET', 'HALE', 'C', 'Counselling'],
  ['10204', 'PRIYA', 'RAO', 'R', 'ECG results'],
  ['10247', 'SAM', 'OKONKWO', 'O', 'Office visit'],
  ['10312', 'DALE', 'FONTAINE', 'TR', 'Dressing change'],
  ['10419', 'JUNE', 'CASTILLO', 'R', 'Suture removal'],
  ['10458', 'HELEN', 'MARCHAND', 'SA', 'Same day — cough'],
  ['10177', 'OSCAR', 'LINDQVIST', 'R', 'HbA1c review'],
  ['10390', 'NINA', 'PETROVA', 'O', 'Office visit'],
  ['10266', 'TOBY', 'WEST', 'U', 'Urgent — sprained wrist'],
  ['10501', 'IRENE', 'DOUCETTE', 'FP', 'Full physical'],
  ['10139', 'KEVIN', 'ASHFORD', 'R', 'Rx renewal'],
]
const TIMES = ['08:30', '09:00', '09:15', '09:45', '10:00', '10:30', '11:15', '13:00', '13:45', '14:30', '15:15', '16:00']

const seedOf = (s: string) => [...s].reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 9973, 7)

/** Weekday of a day-book offset: 2026.08.11 is a Tuesday. */
export const weekdayOf = (offset: number) => (((2 + offset) % 7) + 7) % 7

/** One provider's appointments on the day `offset` days from 2026.08.11. */
export function daybookFor(provider: string, offset: number): Appointment[] {
  if (offset === 0) return provider === 'TECHNICAL SUPPORT' ? daybookAppointments : PROVIDER_DAYS[provider] ?? []
  const wd = weekdayOf(offset)
  if (wd === 0 || wd === 6) return []
  const seed = seedOf(`${provider}|${offset}`)
  const count = provider === 'SHEWCHUK, LEAH' ? 0 : 3 + (seed % 5)
  const times = TIMES.filter((_, i) => (seed >> (i % 7)) % 3 !== 0 || i < 2).slice(0, count)
  return times.map((t, i) => {
    const [chart, first, last, code, reason] = POOL[(seed + i * 5) % POOL.length]!
    const [hr, mn] = t.split(':') as [string, string]
    return a(hr, mn, code, chart, first, last, reason, code === 'C' || code === 'FP' ? { n: code === 'C' ? '12' : '6' } : {})
  })
}

/** The name behind a synthetic chart number, for fields that fill from one. */
export function knownPatient(chart: string): { first: string; last: string } | null {
  const rows = [...daybookAppointments, ...Object.values(PROVIDER_DAYS).flat()]
  const row = rows.find((r) => r.chart === chart)
  if (row) return { first: row.first, last: row.last }
  const pooled = POOL.find(([c]) => c === chart)
  return pooled ? { first: pooled[1], last: pooled[2] } : null
}

/* --- Resource Schedules ▸ Day Book ----------------------------------------
   art. 303807 `9c17a65e…`: the resource day book lists a resource's bookings
   with a Provider column where the provider book has Resource. The capture's
   resource is called `1`; its three rows are its day. */
export const RESOURCES = ['1', '2', 'TREATMENT ROOM', 'GROUP ROOM']

export function resourceDayFor(resource: string, offset: number): Appointment[] {
  if (offset !== 0) return []
  if (resource === '1') {
    return [
      a('09', '30', 'R', '10026', 'ASHLEE', 'MORRISON', '', { provider: 'BEARDWOOD, WALTER' }),
      a('10', '00', 'R', '10037', 'DORA', 'EXPLORER', '', { provider: 'HOWSER, DOOGIE' }),
      a('10', '15', 'R', '10023', 'MARY', 'COMPLEX', '', { provider: 'FAIRCHILD, NESRIN L' }),
    ]
  }
  if (resource === 'TREATMENT ROOM') {
    return [a('11', '00', 'TR', '10312', 'DALE', 'FONTAINE', 'Treatment room — dressing', { provider: 'TECHNICAL SUPPORT' })]
  }
  return []
}

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

/** A row for an appointment booked from the New Appointment window. With
    no chart number it is a name only — the start of a Quick Registration
    (art. 303855). */
export function bookedAppointment(draft: {
  hr: string; mn: string; slots: string; chart: string; reason: string
  first?: string; last?: string; code?: string
}): Appointment {
  const pad = (v: string, fallback: string) => (v.trim() ? v.trim().padStart(2, '0').slice(-2) : fallback)
  return a(
    pad(draft.hr, '14'), pad(draft.mn, '00'), draft.code?.trim() || 'O',
    draft.chart.trim(), (draft.first ?? '').trim().toUpperCase(), (draft.last ?? '').trim().toUpperCase(),
    draft.reason.trim() || 'Office visit',
    { n: draft.slots.trim() || '3' },
  )
}
