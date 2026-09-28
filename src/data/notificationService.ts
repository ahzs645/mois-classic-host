/* ============================================================================
   Data Exchange ▸ Automated Notifications (NRS — the Notifications and
   Reminder Service) — demonstration data. All names fictional.

   PROVENANCE — 303385 "Automated Notifications":
   · Setup / Registration `77bc0623…` (v02.31.27 b250423): the values below —
     service Yes, close past ending No; Scheduler Settings EXCLUDED C,R /
     EXCLUDED DE,IA / EXCLUDED (blank); 00:00 No; auto-generate Yes at
     20:00; the provider list with HALLIWELL, A. ticked; Call List Defaults
     SCHEDULER/APPOINTMENTS/2, RECALL/RECALL/60, OTHER/OTHER/60; consent Yes,
     assume-consent unticked at 18; Contact Preferences SCHEDULER SMS,
     SCHEDULER EMAIL.
   · Call Lists `23760faf…` (v02.18.07): its filter (Beginning 2005.09.09 …
     2015.09.23) and an empty grid. The rows here are INFERRED from the
     article's column descriptions and dot colours, and dated around the
     stage's day.
   · Call List detail `68d46b7e…`: "ORTHO, JANE FOR DAY BOOK 2022.08.19",
     SCHEDULER, STARTED, Begin Calling 2 Days in Advance, APPOINTMENTS,
     Calling Begins 2022.08.17, the six MOIS patients and their responses
     (OTHER, CONFIRMED, CANCELED, CONFIRMED, OTHER, CONFIRMED). Kept as the
     first list's items, re-dated. The contact detail (the e-mail address or
     cell number each reminder went to) is INFERRED: the article places it
     "at the bottom of this window" but the capture is cropped above it.
   ========================================================================= */

export const NRS_PROVIDERS = [
  'DONOTUSE, DONOTUSE', 'DR. APRIL PARRISH', 'FAM, BOB', 'GILLESPIE, IAN', 'HALLIWELL, A.',
  'INTERNIST, JIM', 'LEOPPKY, KLUHANE', 'LITTLE, STUART', 'MOA', 'MOIS, UNIVERSITY',
]

export type NrsSetup = {
  enabled: boolean
  closePast: boolean
  comment: string
  apptMode: string; apptStatuses: string
  patientMode: string; patientStatuses: string
  visitMode: string; visitCodes: string
  excludeMidnight: boolean
  autoGenerate: boolean
  atHour: string; atMinute: string
  providers: string[]
  defaults: { type: string; message: string; days: string }[]
  consentRequired: boolean
  assumeConsent: boolean
  assumeAge: string
  preferences: { reason: string; order: string; method: string; source: string }[]
}

export const NRS_SETUP: NrsSetup = {
  enabled: true, closePast: false, comment: '',
  apptMode: 'EXCLUDED', apptStatuses: 'C,R',
  patientMode: 'EXCLUDED', patientStatuses: 'DE,IA',
  visitMode: 'EXCLUDED', visitCodes: '',
  excludeMidnight: false, autoGenerate: true, atHour: '20', atMinute: '00',
  providers: ['HALLIWELL, A.'],
  defaults: [
    { type: 'SCHEDULER', message: 'APPOINTMENTS', days: '2' },
    { type: 'RECALL', message: 'RECALL', days: '60' },
    { type: 'OTHER', message: 'OTHER', days: '60' },
  ],
  consentRequired: true, assumeConsent: false, assumeAge: '18',
  preferences: [
    { reason: 'SCHEDULER', order: '', method: 'SMS', source: '' },
    { reason: 'SCHEDULER', order: '', method: 'EMAIL', source: '' },
  ],
}

export type CallListItem = {
  contact: string; chart: string; first: string; last: string; appt: string; location: string
  lastCall: string; status: string; response: string; ack: boolean; excluded?: boolean
  method: 'SMS' | 'EMAIL'; to: string
}

export type CallList = {
  id: string
  beginning: string; ending: string; type: 'SCHEDULER' | 'RECALL' | 'OTHER'
  description: string; provider: string; daysAhead: string; message: string
  status: 'NEW' | 'STARTED' | 'CLOSED'; callingBegins: string; daybookDate: string
  created: string; modified: string; note: string
  items: CallListItem[]
}

const item = (chart: string, first: string, appt: string, response: string, method: 'SMS' | 'EMAIL', to: string, extra: Partial<CallListItem> = {}): CallListItem => ({
  contact: 'PATIENT', chart, first, last: 'MOIS', appt, location: '', lastCall: '2026.09.16 11:12',
  status: 'DELIVERED', response, ack: false, method, to, ...extra,
})

export const CALL_LISTS: CallList[] = [
  {
    id: 'cl-1', beginning: '2026.09.16', ending: '2026.09.18', type: 'SCHEDULER',
    description: 'HALLIWELL, A. FOR DAY BOOK 2026.09.18', provider: 'HALLIWELL, A.', daysAhead: '2', message: 'APPOINTMENTS',
    status: 'STARTED', callingBegins: '2026.09.16', daybookDate: '2026.09.18',
    created: '2026.09.15 20:30  SYSTEM', modified: '2026.09.16 11:08  SYSTEM.POSTING.NOT', note: '',
    items: [
      item('10055', 'SAM', '09:20', 'OTHER', 'SMS', '250-555-0110'),
      item('10056', 'KIRAN', '09:40', 'CONFIRMED', 'EMAIL', 'kiran.mois@example.test'),
      item('10057', 'BHUPINDER', '10:30', 'CANCELED', 'SMS', '250-555-0112'),
      item('10058', 'KAYLEE', '11:00', 'CONFIRMED', 'SMS', '250-555-0113'),
      item('10059', 'JENN', '11:30', 'OTHER', 'EMAIL', 'jenn.mois@example.test'),
      item('10060', 'MARY', '12:00', 'CONFIRMED', 'SMS', '250-555-0115'),
      item('10061', 'ROBIN', '13:15', '', 'SMS', '', { status: 'EXCLUDED', lastCall: '', excluded: true }),
    ],
  },
  {
    id: 'cl-2', beginning: '2026.09.17', ending: '2026.09.19', type: 'SCHEDULER',
    description: 'HALLIWELL, A. FOR DAY BOOK 2026.09.19', provider: 'HALLIWELL, A.', daysAhead: '2', message: 'APPOINTMENTS',
    status: 'NEW', callingBegins: '2026.09.17', daybookDate: '2026.09.19',
    created: '2026.09.16 20:30  SYSTEM', modified: '', note: '',
    items: [
      item('10062', 'ALEX', '09:00', '', 'SMS', '250-555-0120', { status: 'QUEUED', lastCall: '' }),
      item('10063', 'PAT', '09:30', '', 'EMAIL', 'pat.mois@example.test', { status: 'QUEUED', lastCall: '' }),
    ],
  },
  {
    id: 'cl-3', beginning: '2026.09.08', ending: '2026.09.10', type: 'SCHEDULER',
    description: 'HALLIWELL, A. FOR DAY BOOK 2026.09.10', provider: 'HALLIWELL, A.', daysAhead: '2', message: 'APPOINTMENTS',
    status: 'STARTED', callingBegins: '2026.09.08', daybookDate: '2026.09.10',
    created: '2026.09.07 20:30  SYSTEM', modified: '2026.09.09 09:12  SYSTEM.POSTING.NOT', note: '',
    items: [
      item('10064', 'LEE', '10:00', 'CONFIRMED', 'SMS', '250-555-0130', { lastCall: '2026.09.08 11:02' }),
      item('10065', 'MORGAN', '10:20', 'CONFIRMED', 'EMAIL', 'morgan.mois@example.test', { lastCall: '2026.09.08 11:03' }),
    ],
  },
  {
    id: 'cl-5', beginning: '2026.09.17', ending: '2026.09.19', type: 'SCHEDULER',
    description: 'FAM, BOB FOR DAY BOOK 2026.09.19', provider: 'FAM, BOB', daysAhead: '2', message: 'APPOINTMENTS',
    status: 'STARTED', callingBegins: '2026.09.17', daybookDate: '2026.09.19',
    created: '2026.09.14 20:30  SYSTEM', modified: '2026.09.15 11:40  SYSTEM.POSTING.NOT', note: '',
    items: [
      item('10067', 'DANA', '09:00', 'CONFIRMED', 'SMS', '250-555-0140', { lastCall: '2026.09.15 11:20' }),
      item('10068', 'JORDAN', '09:15', 'CONFIRMED', 'EMAIL', 'jordan.mois@example.test', { lastCall: '2026.09.15 11:21' }),
    ],
  },
  {
    id: 'cl-4', beginning: '2026.06.01', ending: '2026.07.31', type: 'RECALL',
    description: 'ANNUAL FLU RECALL 2026', provider: 'HALLIWELL, A.', daysAhead: '60', message: 'RECALL',
    status: 'CLOSED', callingBegins: '2026.06.01', daybookDate: '',
    created: '2026.05.31 20:30  SYSTEM', modified: '2026.08.01 08:00  SYSTEM', note: '',
    items: [
      item('10066', 'CASEY', '', 'CONFIRMED', 'EMAIL', 'casey.mois@example.test', { lastCall: '2026.06.01 10:00', ack: true }),
    ],
  },
]

/** The legend's dot (303385): red none, blue some, green all, grey past ending, black closed. */
export function callListDot(list: CallList, today: string): 'red' | 'blue' | 'green' | 'grey' | 'black' {
  if (list.status === 'CLOSED') return 'black'
  if (list.ending < today) return 'grey'
  const included = list.items.filter((i) => !i.excluded)
  const responded = included.filter((i) => i.response).length
  if (!responded) return 'red'
  return responded === included.length ? 'green' : 'blue'
}

export const NRS_SETUP_KEY = 'exchange:nrs-setup'
export const CALL_LISTS_KEY = 'exchange:call-lists'
