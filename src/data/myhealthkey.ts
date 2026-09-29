import { useSessionState } from '../host/screen-windows'
import { daysFromToday } from './clock'

/* ============================================================================
   myhealthkey (MHK), the patient portal — 2280708 "myhealthkey".
   Demonstration data; all names fictional.

   PROVENANCE
   · Providers `9a293216…`: DR. DEREK SHEPHERD 963852, FAM, BOB 12345,
     HALLIWELL, A. 00003, INTERNIST, JIM 34567, MOA (ORGROLE), MOIS,
     UNIVERSITY 96385 — Registered / Online Booking ticks as captured.
     Service Locations `7197ad58…`: MAIN OFFICE (default), FAMILY PRACTICE,
     FORT ST JOHN, FRASER LAKE, UHNBC. Activity Log `548fadf5…`: the four
     rows (Update Practitioner ×3, Patient Status ERROR).
   · Patients `adfdd6e2…`: the rows (LAGACE DONALD … MITCHELL HENRY), their
     INVITED consents and the pink "missing demographics" cells.
   · Registration Activity `f45df277…`: its five rows.
   · Bulk invite `91dc6d33…`: BEAR MAMA, BRANDO MARION, … — the
     eligible-but-not-invited list.
   · Communication History `e3b212f6…`: only the header row is legible; its
     rows are INFERRED.
   · Chart consent `77d248f2…` (INVITED), `6aae0140…` (ALLOW, "Patient has
     completed registration with myhealthkey"), `1d0cb386…` (NOT ALLOW,
     "Patient has deregistered via myhealthkey", Reason "Patient
     deregistered by Clinic.").
   · The Settings folder: "controlled by Bright Health … Please do not change
     anything in this folder" — no capture; its rows are INFERRED.

   The patient's own half of registration happens outside MOIS (an e-mail
   link). The stage completes it when Check Status is pressed on an invited
   chart — Check Status is the button that asks MHK for the patient's state —
   so a lesson can go on to scheduling, messaging and deregistering.
   ========================================================================= */

export type MhkRegistration = 'NONE' | 'INVITED' | 'ALLOW' | 'NOT ALLOW'

export type MhkChart = {
  registration: MhkRegistration
  detail: string
  reason: string
  validFrom: string
  until: string
  created: string
  createdBy: string
  modified: string
  modifiedBy: string
  scheduling: boolean
  log: { when: string; event: string; channel: string; status: string }[]
}

export const NO_MHK: MhkChart = {
  registration: 'NONE', detail: '', reason: '', validFrom: '', until: '', created: '', createdBy: '',
  modified: '', modifiedBy: '', scheduling: false, log: [],
}

/** Charts already on myhealthkey at the start of a session. */
export const MHK_SEED: Record<string, MhkChart> = {
  10046: {
    registration: 'ALLOW', detail: 'Patient has completed registration with myhealthkey', reason: 'Patient Registration',
    validFrom: '2021.08.04', until: '', created: '2021.08.04 09:37', createdBy: 'THOMSON, SAM',
    modified: '2021.08.04 09:38', modifiedBy: 'SYSTEM.POLLING.PHR', scheduling: true,
    log: [{ when: '2021.08.04 09:38', event: 'Patient Registration', channel: 'SYSTEM', status: 'DONE' }],
  },
}

export const MHK_CHARTS_KEY = 'mhk:charts'
export const MHK_ACTIVITY_KEY = 'mhk:registration-activity'

/** One chart's myhealthkey state, and a setter; used by the chart folder and the messaging window. */
export function useMhkChart(chart: string): [MhkChart, (patch: Partial<MhkChart>) => void] {
  const [all, setAll] = useSessionState<Record<string, MhkChart>>(MHK_CHARTS_KEY, MHK_SEED)
  const value = all[chart] ?? NO_MHK
  return [value, (patch) => setAll((m) => ({ ...m, [chart]: { ...(m[chart] ?? NO_MHK), ...patch } }))]
}

/** Whether a chart can be sent a myhealthkey message (an active account). */
export const hasActiveMhk = (c: MhkChart) => c.registration === 'ALLOW'

/** yyyy.mm.dd n days after the stage's day (data/clock.ts). */
export { daysFromToday }

/* --- Administration ▸ myhealthkey (BETA) -------------------------------------------- */
export const MHK_SETTINGS: { name: string; value: string }[] = [
  { name: 'MHK Service Enabled', value: 'Y' },
  { name: 'MHK API Server', value: 'https://api.myhealthkey.ca/' },
  { name: 'MHK Clinic Identifier', value: 'BHS-TRAINING-0001' },
  { name: 'Slot Publishing', value: 'Y' },
  { name: 'Invite Valid Days', value: '14' },
  { name: 'Bulk Invite Exclusion Days', value: '30' },
  { name: 'Polling Interval (seconds)', value: '300' },
]

export type MhkProvider = { name: string; pract: string; type: 'PROVIDER' | 'ORGROLE'; active: 'Y' | 'N'; registered: boolean; booking: boolean; locations: string[] }

export const MHK_LOCATIONS = ['MAIN OFFICE (default)', 'FAMILY PRACTICE', 'FORT ST JOHN', 'FRASER LAKE', 'UHNBC']

export const MHK_PROVIDERS: MhkProvider[] = [
  { name: 'DR. DEREK SHEPHERD', pract: '963852', type: 'PROVIDER', active: 'Y', registered: true, booking: true, locations: ['MAIN OFFICE (default)'] },
  { name: 'FAM, BOB', pract: '12345', type: 'PROVIDER', active: 'Y', registered: true, booking: true, locations: ['MAIN OFFICE (default)'] },
  { name: 'HALLIWELL, A.', pract: '00003', type: 'PROVIDER', active: 'Y', registered: true, booking: false, locations: [] },
  { name: 'INTERNIST, JIM', pract: '34567', type: 'PROVIDER', active: 'Y', registered: true, booking: true, locations: ['MAIN OFFICE (default)'] },
  { name: 'MOA', pract: '', type: 'ORGROLE', active: 'Y', registered: true, booking: false, locations: [] },
  { name: 'MOIS, UNIVERSITY', pract: '96385', type: 'PROVIDER', active: 'Y', registered: true, booking: false, locations: [] },
  { name: 'ROSS, DOUG', pract: '44120', type: 'PROVIDER', active: 'Y', registered: false, booking: false, locations: [] },
]

export const MHK_LOCATION_REGISTERED = ['MAIN OFFICE (default)']

export const MHK_PROVIDER_LOG = [
  { when: '2020-01-30 11:06:21', direction: 'SENT', status: 'DONE', subject: 'Update Practitioner', comment: 'Practitioner has been updated on myhealthkey.' },
  { when: '2020-01-30 11:04:03', direction: 'SENT', status: 'DONE', subject: 'Update Practitioner', comment: 'Practitioner has been updated on myhealthkey.' },
  { when: '2020-01-28 10:05:48', direction: 'SENT', status: 'DONE', subject: 'Update Practitioner', comment: 'Practitioner has been updated on myhealthkey.' },
  { when: '2020-01-24 11:12:43', direction: 'SENT', status: 'ERROR', subject: 'Patient Status', comment: 'Patient registration timed out and will need to be re-sent.' },
]

export type MhkPatient = {
  chart: string; first: string; last: string; age: number; gender: string; phn: string; email: string; phone: string
  provider: string; status: string; consent: '' | 'INVITED' | 'ALLOW' | 'NOT ALLOW'; from: string; to: string; expired: boolean; created: string
  /** demographics the invite needs and the chart lacks — painted pink */
  missing?: ('phn' | 'email' | 'gender' | 'age')[]
  lastInvited?: number
}

export const MHK_PATIENTS: MhkPatient[] = [
  { chart: '10106', first: 'LAGACE', last: 'DONALD', age: 31, gender: 'M', phn: '5558899654', email: 'testing@test.ca', phone: '', provider: '', status: 'A', consent: '', from: '', to: '', expired: false, created: '' },
  { chart: '10019', first: 'SUSIE', last: 'MCBONE', age: 81, gender: 'F', phn: '999888555', email: 'testing@test.ca', phone: '250-961-1234', provider: 'FAM, BOB', status: 'A', consent: '', from: '', to: '', expired: false, created: '' },
  { chart: '10073', first: 'NONKNOWY', last: 'HELPY', age: 31, gender: 'F', phn: '111333555', email: 'test@test.ca', phone: '', provider: '', status: 'A', consent: 'INVITED', from: '2021-08-11', to: '2021-09-10', expired: true, created: '2021-08-11 14:08:50', lastInvited: 400 },
  { chart: '10038', first: 'JOE', last: 'LABOTOMY', age: 64, gender: 'M', phn: '9151206012', email: 'testing@test.ca', phone: '', provider: '', status: 'A', consent: 'INVITED', from: '2021-07-14', to: '2021-08-13', expired: true, created: '2021-07-14 14:43:45', lastInvited: 420 },
  { chart: '10081', first: 'SHARKYFISH', last: 'BILL', age: 31, gender: 'M', phn: '987855666', email: 'testing@test.ca', phone: '', provider: '', status: 'A', consent: 'INVITED', from: '2021-06-16', to: '2021-07-17', expired: true, created: '2021-06-16 14:41:38', lastInvited: 450 },
  { chart: '10041', first: 'LEMON', last: 'SEED', age: 80, gender: 'F', phn: '9151071072', email: 'testing@test.ca', phone: '', provider: 'ROSS, DOUG', status: 'A', consent: 'INVITED', from: '2021-06-17', to: '2021-07-17', expired: true, created: '2021-06-17 12:28:11', lastInvited: 450 },
  { chart: '10089', first: 'MARY', last: '<MC> COMPLEX', age: 69, gender: 'F', phn: '9098765177', email: 'mcomplex@mois.org', phone: '250-556-9911', provider: '', status: 'A', consent: 'INVITED', from: '2021-06-16', to: '2021-07-16', expired: true, created: '2021-06-16 14:41:38', lastInvited: 450 },
  { chart: '10014', first: 'JACKIE', last: 'HEINZE', age: 71, gender: 'F', phn: '', email: '', phone: '', provider: '', status: 'A', consent: '', from: '', to: '', expired: false, created: '', missing: ['phn', 'email'] },
  { chart: '10074', first: 'TRY', last: 'HELP2', age: 54, gender: 'F', phn: '', email: 'halsjdfads', phone: '', provider: '', status: 'A', consent: '', from: '', to: '', expired: false, created: '', missing: ['phn', 'email'] },
  { chart: '10039', first: 'LUCKY', last: 'LAWLESS', age: 35, gender: '', phn: '9151234921', email: '', phone: '', provider: 'MOISCON', status: 'A', consent: '', from: '', to: '', expired: false, created: '', missing: ['gender', 'email'] },
  { chart: '10022', first: 'MIKE', last: 'MACDONALD', age: 91, gender: 'M', phn: '', email: '', phone: '', provider: '', status: 'A', consent: '', from: '', to: '', expired: false, created: '', missing: ['phn', 'email'] },
  { chart: '10032', first: 'FERDINAND', last: 'MIKKELSEN', age: 71, gender: 'M', phn: '9056792939', email: '', phone: '250-567-9191', provider: 'FAM, BOB', status: 'A', consent: '', from: '', to: '', expired: false, created: '', missing: ['email'] },
  { chart: '10052', first: 'MAMA', last: 'BEAR', age: 35, gender: 'F', phn: '564854', email: 'mama.bear@example.test', phone: '', provider: 'MOISCON', status: 'A', consent: '', from: '', to: '', expired: false, created: '' },
  { chart: '10034', first: 'MARION', last: 'BRANDO', age: 59, gender: 'M', phn: '9151252098', email: 'mbrando@example.test', phone: '', provider: '', status: 'A', consent: '', from: '', to: '', expired: false, created: '' },
  { chart: '10046', first: 'LUCY', last: 'WHO', age: 44, gender: 'F', phn: '9151001234', email: 'lucy.who@example.test', phone: '250-555-0199', provider: 'HALLIWELL, A.', status: 'A', consent: 'ALLOW', from: '2021-08-04', to: '', expired: false, created: '2021-08-04 09:37:48' },
]

export type MhkActivity = { chart: string; last: string; first: string; registration: string; validFrom: string; validTo: string; reason: string; createdBy: string; updatedBy: string; updated: string }

export const MHK_ACTIVITY: MhkActivity[] = [
  { chart: '10113', last: 'CHART', first: 'NEW', registration: 'INVITED', validFrom: '2021-09-02', validTo: '2021-10-02', reason: 'Patient Registration', createdBy: 'THOMSON, SAM', updatedBy: '', updated: '2021-09-02 13:11:29' },
  { chart: '10026', last: 'MORRISON', first: 'ASHLEE', registration: 'NOT ALLOW', validFrom: '2021-08-31', validTo: '', reason: 'Patient Deregistration', createdBy: 'SYSTEM.POLLING.PH', updatedBy: '', updated: '2021-08-31 18:00:21' },
  { chart: '10073', last: 'HELPY', first: 'NONKNOWY', registration: 'INVITED', validFrom: '2021-08-11', validTo: '2021-09-10', reason: 'Patient Registration', createdBy: 'THOMSON, SAM', updatedBy: '', updated: '2021-08-11 14:08:50' },
  { chart: '10046', last: 'WHO', first: 'LUCY', registration: 'ALLOW', validFrom: '2021-08-04', validTo: '', reason: 'Patient Registration', createdBy: 'THOMSON, SAM', updatedBy: 'SYSTEM.POLLING.PH', updated: '2021-08-04 09:38:28' },
  { chart: '10046', last: 'WHO', first: 'LUCY', registration: 'NOT ALLOW', validFrom: '2021-08-04', validTo: '2021-08-04', reason: 'Patient Deregistration || Closed 8/4/2021 9:37:48 AM because patient is regist...', createdBy: 'SYSTEM.POLLING.PH', updatedBy: 'THOMSON, SAM', updated: '2021-08-04 09:37:47' },
]

export const MHK_COMMUNICATION = {
  user: [
    { when: '2026-09-18 09:12:04', direction: 'SENT', status: 'DONE', subject: 'Patient Invite', comment: 'Invitation sent to patient.' },
    { when: '2026-09-17 15:40:22', direction: 'SENT', status: 'DONE', subject: 'Patient Message', comment: 'Message delivered to patient inbox.' },
    { when: '2026-09-17 10:02:51', direction: 'SENT', status: 'DONE', subject: 'Update Practitioner', comment: 'Practitioner has been updated on myhealthkey.' },
  ],
  system: [
    { when: '2026-09-18 08:00:00', direction: 'RECEIVED', status: 'DONE', subject: 'Patient Status', comment: 'Patient has completed registration with myhealthkey.' },
    { when: '2026-09-18 07:55:00', direction: 'SENT', status: 'DONE', subject: 'Publish Slots', comment: '12 slots published for DR. DEREK SHEPHERD.' },
    { when: '2026-09-17 23:00:00', direction: 'SENT', status: 'ERROR', subject: 'Patient Status', comment: 'Patient registration timed out and will need to be re-sent.' },
  ],
}

export const MHK_PROVIDERS_KEY = 'mhk:providers'
export const MHK_LOCATIONS_KEY = 'mhk:locations'
export const MHK_PATIENTS_KEY = 'mhk:patients'
