import { useSyncExternalStore } from 'react'
import type { UnsentClaim } from './claims'
import { daybookFor, weekdayOf } from './daybook'
import { editedCharts, isPatientSaved, patientEdits, savePatient, updatePatient } from './patient-edits'
import { findPatient, MOIS_TODAY, type BenefitEntry } from './patients'
import { offsetOfStamp, stampOf } from './schedulerStore'

/* ============================================================================
   Billing ▸ PBF / LFP / PAS Management — what the learner does to the three
   provincial programmes this session.

   One store behind every window of the three folders (screens/Lfp*.tsx,
   screens/Pbf*.tsx, screens/PasViews.tsx) and the Time Logger / Time
   Management windows the Scheduler opens, because those windows outlive the
   folder that raised them and change what the others show:

   - LFP (art. 3166420, 3852837, 3295289): LFP Setup, each provider's LFP
     enrolment and service registrations with their claim status, time
     entries logged per provider and day, the time claims made from them
     (with the duplicate submission code D), and the 98990 panel claims the
     DEACON bulk function writes.
   - PBF (art. 2257761, 2258278, 1776677): the enrolment list, enrolment
     change requests, eligibility requests, enrolment claims (unsent,
     unacknowledged, failed, history), MSP change-request errors, PBF
     Setup and the PCPC calculator's runs.
   - PAS (art. 3788178): chart status changes and each provider's panel,
     registration being "determine[d] by the most recent 98990 MSP claim".

   Claim life cycle. The MSP half of MOIS is modelled by two hooks the
   Data Exchange ▸ MSP windows call: `billingPrograms.prepareBills()`
   (Prepare Bills ▸ Run — unsent claims go out: LFP registrations move from
   Pending Submission to Pending Approval, PBF claims to Unack) and
   `billingPrograms.reconcile()` (Reconcile Remittance ▸ Run — MSP answers:
   LFP registrations become current, PBF claims are acknowledged and the
   benefit dates Registered). 3166420: "Go to Data Exchange ▸ MSP ▸ Prepare
   Bills ▸ Run. Then return to the Provider Registration window … and click
   Refresh. The provider status should now change to: Pending Approval".

   Everything is fictional training data. The patients are the emulator's
   training roster (data/patients.ts) so Open Chart / Tear Off reach a chart;
   the providers are the clinic's (data/claims.ts DOCTORS) plus PRACTITIONER,
   GENERAL, who appears in the PAS captures (3788178 `f5ac1485…`).

   One store per frame: the shell calls `resetBillingPrograms()` on mount.
   ========================================================================= */

/* --- dates ------------------------------------------------------------------ */

/** The clinic day the Scheduler opens on (offset 0, 2026.08.11) is "today"
    for time logging — the Time Management window's Today button and the
    Provider Time Summary's Today radio. Enrolment and PBF dates are chart
    dates and use MOIS_TODAY, the date the chart windows stamp. */
export const LFP_TODAY = stampOf(0)
export const PBF_TODAY = MOIS_TODAY

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** `2026.08.11` → `Tuesday August 11, 2026`, the Time Management caption. */
export function longDate(stamp: string): string {
  const [y, m, d] = stamp.split('.').map(Number) as [number, number, number]
  return `${WEEKDAYS[weekdayOf(offsetOfStamp(stamp))]} ${MONTHS[m - 1]} ${String(d).padStart(2, '0')}, ${y}`
}

export const shiftStamp = (stamp: string, days: number) => stampOf(offsetOfStamp(stamp) + days)

/** `HH:MM` → minutes past midnight; NaN when unreadable. */
export function minutesOf(hhmm: string): number {
  const m = /^(\d{1,2}):?(\d{2})$/.exec(hhmm.trim())
  if (!m) return Number.NaN
  const h = Number(m[1]); const mn = Number(m[2])
  return h > 23 || mn > 59 ? Number.NaN : h * 60 + mn
}
export const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
/** 3166420: "LFP is calculated in 15-minute increments. MOIS defaults to the
    closest 15-minute increment." */
export const round15 = (min: number) => Math.round(min / 15) * 15
export const hours = (min: number) => (min / 60).toFixed(2)

/* --- LFP -------------------------------------------------------------------- */

export type LfpSetup = {
  active: boolean
  wizard: boolean
  payors: string
  diagnosis: string
  /** Time Code → Location, the white boxes of the setup grid */
  locations: Record<string, string>
}

/** The setup grid, transcribed from 3166420 `7280452f…` (v02.31.41). */
export const LFP_TIME_CODES: { code: string; description: string; location: string }[] = [
  { code: '98010', description: 'CLINIC DIRECT PATIENT CARE TIME', location: 'L' },
  { code: '98011', description: 'INDIRECT PATIENT CARE TIME', location: 'L' },
  { code: '98012', description: 'CLINICAL ADMIN TIME', location: 'L' },
  { code: '98040', description: 'LOCUM CLINIC DIRECT PATIENT CARE', location: 'L' },
  { code: '98041', description: 'LOCUM INDIRECT PATIENT CARE TIME', location: 'L' },
  { code: '98042', description: 'LOCUM CLINICAL ADMINISTRATION TIME', location: 'L' },
  { code: '98119', description: 'TRAVEL TIME', location: '' },
  { code: '98120', description: 'LTC/PALLIATIVE - WEEKDAY', location: 'C' },
  { code: '98121', description: 'LTC/PLTV CARE - EVENING', location: 'C' },
  { code: '98122', description: 'LTC/PLTV CARE - WKND/STAT', location: 'C' },
  { code: '98123', description: 'LTC/PALLIATIVE - NIGHT', location: 'C' },
  { code: '98124', description: 'INPATIENT - WEEKDAY', location: 'I' },
  { code: '98125', description: 'INPATIENT - EVENING', location: 'I' },
  { code: '98126', description: 'INPATIENT - WKND/STAT', location: 'I' },
  { code: '98127', description: 'INPATIENT - NIGHT', location: 'I' },
  { code: '98128', description: 'PREG/NEWBORN - WEEKDAY', location: 'I' },
  { code: '98129', description: 'PREG/NEWBORN - EVENING', location: 'I' },
  { code: '98130', description: 'PREG/NEWBORN - WKND/STAT', location: 'I' },
  { code: '98131', description: 'PREG/NEWBORN - NIGHT', location: 'I' },
  { code: '98219', description: 'LOCUM TRAVEL TIME', location: '' },
]

/** The LFP "Time Patient" Teleplan requires on every time claim from
    2026.02.23 (3166420, table "LFP 'Time Patient' for BC Teleplan"). The
    chart number is INFERRED — the article names the pseudo patient but not
    its chart. */
export const LFP_TIME_PATIENT = { chart: '99990', last: 'TIME', first: 'LFP', dob: '2005.01.01', phn: '9646191917' }

/** Registration state of one enrolment or service. `pending-submission`
    is a claim waiting in Unsent Claims; `pending-approval` one sent to MSP
    and not yet answered (3166420). */
export type LfpState = '' | 'pending-submission' | 'pending-approval' | 'current' | 'expiring' | 'expired'
export const LFP_SERVICES = ['clinic', 'ltc', 'inpatient', 'pregnancy'] as const
export type LfpService = typeof LFP_SERVICES[number]

export type LfpRegistrationClaim = { service: string; seq: string; code: string; description: string; r1: string; r2: string }

export type LfpProvider = {
  provider: string
  /** the prefix the Registration grid prints: `(MD) MONTAZERIPOURAGHA, AMANALLA` */
  prefix: string
  /** Payment Mode, printed short in the grid's Type column (AP, LFP, MSP) */
  mode: '' | 'AP' | 'PP' | 'LFP' | 'MSP'
  practitioner: string
  payee: string
  location: string
  facility: string
  subFacility: string
  family: LfpState
  locum: LfpState
  services: Record<LfpService, LfpState>
  start: string
  claims: LfpRegistrationClaim[]
}

export const PAYMENT_MODES: { code: LfpProvider['mode']; label: string }[] = [
  { code: '', label: '' },
  { code: 'AP', label: 'Alternative Payment' },
  { code: 'PP', label: 'Patient Pay' },
  { code: 'LFP', label: 'Longitudinal Family Physician' },
  { code: 'MSP', label: 'Fee For Service (MSP)' },
]

/* The registration claim codes are INFERRED: 3166420 says a claim is made
   for each item ticked in Update LFP Enrollment / Service Registration and
   prints no code. The descriptions are the dialog's own item captions. */
export const LFP_REG_CODES: Record<'family' | 'locum' | LfpService, { code: string; description: string }> = {
  family: { code: '98000', description: 'LFP ENROLMENT - FAMILY PHYSICIAN' },
  locum: { code: '98001', description: 'LFP ENROLMENT - LOCUM PHYSICIAN' },
  clinic: { code: '98002', description: 'LFP REGISTRATION - CLINIC BASED CARE' },
  ltc: { code: '98003', description: 'LFP REGISTRATION - LTC/PALLIATIVE CARE' },
  inpatient: { code: '98004', description: 'LFP REGISTRATION - INPATIENT SERVICE' },
  pregnancy: { code: '98005', description: 'LFP REGISTRATION - PREGNANCY AND NEWBORN' },
}

export type TimeCode = 'direct' | 'indirect' | 'clinical'
export const TIME_CODES: { id: TimeCode; label: string; logger: string; fee: string; locumFee: string }[] = [
  { id: 'direct', label: 'Direct', logger: 'Direct Care', fee: '98010', locumFee: '98040' },
  { id: 'indirect', label: 'Indirect', logger: 'Indirect Care', fee: '98011', locumFee: '98041' },
  { id: 'clinical', label: 'Clinical', logger: 'Clinical Admin', fee: '98012', locumFee: '98042' },
]

export type TimeEntry = {
  id: string
  provider: string
  date: string
  code: TimeCode
  start: string
  stop: string
  note: string
  /** set once Create Claims has billed it: "Once Billing has been created
      from the Time Logger, that entry is locked for editing" (3166420) */
  claimed?: string
}

export type TimeClaim = {
  id: string
  entry: string
  provider: string
  date: string
  start: string
  stop: string
  units: number
  fee: string
  patient: string
  /** the submission code: D when marked duplicate */
  sub: string
  status: 'unsent' | 'sent' | 'refused'
}

/* --- PBF -------------------------------------------------------------------- */

export type EnrolStatus = 'A' | 'TR' | 'D' | 'I'
export type DateStatus = '' | 'Requested' | 'Approved' | 'Submitted' | 'Registered' | 'Rejected' | 'Failed'

export type Enrolment = {
  chart: string
  last: string; first: string; sex: string; dob: string
  insurance: string; by: string
  /** the chart's patient status */
  status: EnrolStatus
  start: string; startStatus: DateStatus
  stop: string; stopStatus: DateStatus; stopReason: string
  provider: string
  created: string
  modified: string
}

export type ChangeRequest = {
  id: string
  chart: string
  kind: 'enroll' | 'unenroll'
  /** the requested start (enrol) or stop (unenrol) date */
  date: string
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED'
  reason: string
  source: 'clinic' | 'msp'
  person: string
  requested: string
  /** set when the request came from a chart's Benefits tab this session */
  fromBenefits?: boolean
}

export type EligibilityRequest = {
  id: string
  chart: string
  provider: string
  date: string
  status: 'NEW' | 'SUBMITTED' | 'PROCESSED' | 'FAILED'
  outcome: string
}

export type EnrolmentClaim = {
  id: string
  chart: string
  fee: string
  doctor: string
  loc: string
  service: string
  diag: string
  sub: string
  payMode: 'Normal' | 'Alternate'
  compl: boolean
  hold: boolean
  holdReason: string
  state: 'unsent' | 'unack' | 'failed' | 'done'
  r1: string; r2: string; wo: string
  e1: string; e2: string; e3: string
  seq: string
  sent: string
  cr?: string
  /** the failed claim a resubmission replaces */
  replaces?: string
  created: string
  modified: string
}

export type MspCrError = {
  id: string
  last: string; first: string; sex: string; dob: string; phn: string
  request: 'Registration' | 'Deregistation'
  reason: string
  received: string
  /** the chart it matched, when it matched one */
  chart: string
  result: 'chart' | 'conflict' | 'ok'
  message: string
  deleted?: boolean
}

export type PbfConfig = {
  active: boolean
  sendCore: boolean
  convertCore: boolean
  standardCode: string
  payors: string
  locations: string
  regFee: string; regDiag: string
  deregFee: string; deregDiag: string
  regOverrideFee: string; regOverrideDiag: string
  deregOverrideFee: string; deregOverrideDiag: string
  autoAcceptReg: string
  autoAcceptDereg: string
  indexCode: string
  indexName: string
  indexOrderedBy: string
  payees: { payee: string; createdBy: string; created: string; modifiedBy: string; modified: string }[]
}

export type PcpcRun = {
  id: string
  date: string
  include: 'enrolled' | 'other'
  provider: 'all' | 'desktop'
  output: string
  charts: string[]
  index: string
  measured: boolean
}

export type HistoryLine = { chart: string; date: string; change: string; status: string; by: string }

/* --- PAS -------------------------------------------------------------------- */

export type PanelClaim = {
  id: string
  chart: string
  provider: string
  date: string
  state: 'unsent' | 'sent' | 'deleted'
  batch?: string
}

export type StatusChange = { chart: string; date: string; kind: 'New' | 'Changed'; before: string; after: string }

/* --- the store ---------------------------------------------------------------- */

export type BillingProgramsState = {
  lfpSetup: LfpSetup
  lfpSaved: boolean
  lfp: LfpProvider[]
  entries: TimeEntry[]
  timeClaims: TimeClaim[]
  enrolments: Enrolment[]
  crs: ChangeRequest[]
  eligibility: EligibilityRequest[]
  claims: EnrolmentClaim[]
  mspErrors: MspCrError[]
  pbf: PbfConfig
  pbfSaved: boolean
  pcpcRuns: PcpcRun[]
  history: HistoryLine[]
  panel: Record<string, string[]>
  panelClaims: PanelClaim[]
  changes: StatusChange[]
  /** DEACON's LFP.PANEL batches: id → claim ids */
  batches: Record<string, string[]>
  /** the last thing done, as a slug a lesson can grade */
  last: string
}

const SESSION_USER = 'ADMINISTRATOR'

const blankServices = (): Record<LfpService, LfpState> => ({ clinic: '', ltc: '', inpatient: '', pregnancy: '' })

function lfpProvider(provider: string, prefix: string, mode: LfpProvider['mode'], practitioner: string, patch: Partial<LfpProvider> = {}): LfpProvider {
  return {
    provider, prefix, mode, practitioner, payee: '00001', location: 'L', facility: '00001', subFacility: '',
    family: '', locum: '', services: blankServices(), start: '', claims: [], ...patch,
  }
}

const P = (chart: string) => findPatient(chart)
function enrolment(chart: string, start: string, provider: string, patch: Partial<Enrolment> = {}): Enrolment {
  const p = P(chart)
  return {
    chart, last: p?.last ?? '', first: p?.first ?? '', sex: p?.gender ?? '', dob: p?.dob ?? '',
    insurance: (p?.insurance ?? '').replace(/\s/g, ''), by: p?.insuranceBy ?? 'BC',
    status: 'A', start, startStatus: 'Registered', stop: '', stopStatus: '', stopReason: '', provider,
    created: `${start} 09:46  ${SESSION_USER}`, modified: `${start} 09:47  ${SESSION_USER}`, ...patch,
  }
}

function claim(id: string, chart: string, fee: string, doctor: string, service: string, state: EnrolmentClaim['state'], patch: Partial<EnrolmentClaim> = {}): EnrolmentClaim {
  return {
    id, chart, fee, doctor, loc: 'A', service, diag: 'V90', sub: '0', payMode: 'Alternate',
    compl: true, hold: false, holdReason: '', state, r1: '', r2: state === 'unack' ? 'U' : '', wo: state === 'unsent' ? '' : 'N',
    e1: '', e2: '', e3: '', seq: state === 'unsent' ? '' : String(15600 + Number(id.replace(/\D/g, '') || 0)), sent: state === 'unsent' ? '' : service,
    created: `${service} 09:47  ${SESSION_USER}`, modified: `${service} 09:47  ${SESSION_USER}`, ...patch,
  }
}

const initial = (): BillingProgramsState => ({
  lfpSetup: {
    active: true, wizard: true, payors: 'Blank,LFP', diagnosis: 'L23',
    locations: Object.fromEntries(LFP_TIME_CODES.map((c) => [c.code, c.location])),
  },
  lfpSaved: false,
  lfp: [
    lfpProvider('BEARDWOOD, WALTER', 'MD', 'LFP', '12345', {
      family: 'current', services: { clinic: 'current', ltc: 'current', inpatient: '', pregnancy: '' }, start: '2025.04.01',
      claims: [
        { service: '2025.04.01', seq: '14201', code: '98000', description: LFP_REG_CODES.family.description, r1: '', r2: 'P' },
        { service: '2025.04.01', seq: '14202', code: '98002', description: LFP_REG_CODES.clinic.description, r1: '', r2: 'P' },
        { service: '2025.04.01', seq: '14203', code: '98003', description: LFP_REG_CODES.ltc.description, r1: '', r2: 'P' },
      ],
    }),
    lfpProvider('DUCHARME, AMARILYS', 'MD', 'LFP', '30442', {
      family: 'current', services: { clinic: 'current', ltc: '', inpatient: 'expiring', pregnancy: 'expiring' }, start: '2024.09.16',
    }),
    lfpProvider('HOWSER, DOOGIE', 'MD', 'MSP', '30117', {
      locum: 'pending-approval', services: { clinic: 'pending-approval', ltc: '', inpatient: '', pregnancy: '' }, start: '2026.08.01',
    }),
    lfpProvider('SHEWCHUK, LEAH', 'MD', 'LFP', '22781', {
      family: 'expired', services: { clinic: 'expired', ltc: '', inpatient: '', pregnancy: '' }, start: '2023.04.01',
    }),
    lfpProvider('FAIRCHILD, NESRIN L', 'NP', 'AP', '41903'),
    lfpProvider('PRACTITIONER, GENERAL', 'MD', 'MSP', '55555', { location: '' }),
  ],
  entries: [
    /* the article's own example (3166420 "Duplicate LFP Time Claims"): two
       non-overlapping 13-unit Direct Patient Care blocks on one day, so the
       second claim raises the duplicate prompt */
    { id: 't1', provider: 'BEARDWOOD, WALTER', date: LFP_TODAY, code: 'direct', start: '08:00', stop: '11:15', note: '' },
    { id: 't2', provider: 'BEARDWOOD, WALTER', date: LFP_TODAY, code: 'indirect', start: '11:15', stop: '12:00', note: 'charting' },
    { id: 't3', provider: 'BEARDWOOD, WALTER', date: LFP_TODAY, code: 'direct', start: '13:00', stop: '16:15', note: '' },
    { id: 't4', provider: 'DUCHARME, AMARILYS', date: shiftStamp(LFP_TODAY, -1), code: 'direct', start: '08:30', stop: '12:00', note: '', claimed: 'c1' },
    { id: 't5', provider: 'DUCHARME, AMARILYS', date: shiftStamp(LFP_TODAY, -1), code: 'clinical', start: '12:30', stop: '13:30', note: 'forms', claimed: 'c2' },
  ],
  timeClaims: [
    { id: 'c1', entry: 't4', provider: 'DUCHARME, AMARILYS', date: shiftStamp(LFP_TODAY, -1), start: '08:30', stop: '12:00', units: 14, fee: '98010', patient: 'TIME, LFP', sub: 'R', status: 'sent' },
    { id: 'c2', entry: 't5', provider: 'DUCHARME, AMARILYS', date: shiftStamp(LFP_TODAY, -1), start: '12:30', stop: '13:30', units: 4, fee: '98012', patient: 'TIME, LFP', sub: 'R', status: 'sent' },
  ],
  enrolments: [
    enrolment('2429', '2024.01.08', 'BEARDWOOD, WALTER'),
    enrolment('746', '2023.09.11', 'DUCHARME, AMARILYS'),
    enrolment('1885', '2025.02.03', 'BEARDWOOD, WALTER'),
    enrolment('3132', '2024.06.01', 'HOWSER, DOOGIE', { stop: '2026.10.31', stopStatus: 'Registered', stopReason: 'L' }),
    enrolment('3093', '2024.03.01', 'BEARDWOOD, WALTER'),
    enrolment('2350', '2022.05.16', 'BEARDWOOD, WALTER'),
    enrolment('3436', '2026.09.01', 'DUCHARME, AMARILYS', { startStatus: 'Submitted' }),
    enrolment('3429', '2020.09.01', 'BEARDWOOD, WALTER', { stop: '2026.08.28', stopStatus: 'Failed', stopReason: 'L', status: 'TR' }),
  ],
  crs: [
    { id: 'cr1', chart: '3609', kind: 'enroll', date: '2026.09.15', status: 'REQUESTED', reason: '', source: 'clinic', person: SESSION_USER, requested: '2026.09.15' },
    { id: 'cr2', chart: '1003', kind: 'enroll', date: '2026.09.12', status: 'REQUESTED', reason: 'A0', source: 'msp', person: 'MSP', requested: '2026.09.12' },
    { id: 'cr3', chart: '2350', kind: 'unenroll', date: '2026.09.30', status: 'REQUESTED', reason: 'L', source: 'clinic', person: SESSION_USER, requested: '2026.09.16' },
    { id: 'cr4', chart: '3658', kind: 'enroll', date: '2026.09.10', status: 'APPROVED', reason: '', source: 'clinic', person: SESSION_USER, requested: '2026.09.10' },
    { id: 'cr5', chart: '3436', kind: 'enroll', date: '2026.09.01', status: 'APPROVED', reason: '', source: 'clinic', person: SESSION_USER, requested: '2026.08.29' },
  ],
  eligibility: [
    { id: 'el1', chart: '1885', provider: 'BEARDWOOD, WALTER', date: '2026.09.12', status: 'PROCESSED', outcome: 'PENDING REGISTRATION' },
    { id: 'el2', chart: '712', provider: 'DUCHARME, AMARILYS', date: '2026.09.09', status: 'PROCESSED', outcome: 'REG. ANOTHER PAYEE' },
  ],
  claims: [
    claim('e1', '3658', '96090', 'BEARDWOOD, WALTER', '2026.09.10', 'unsent', { cr: 'cr4' }),
    claim('e2', '3436', '96090', 'DUCHARME, AMARILYS', '2026.09.01', 'unack', { cr: 'cr5' }),
    claim('e3', '3429', '96093', 'BEARDWOOD, WALTER', '2026.08.28', 'failed', { r2: 'F', e1: 'RE', e2: 'P9' }),
    claim('e4', '2429', '96090', 'BEARDWOOD, WALTER', '2024.01.08', 'done', { r2: 'P' }),
    claim('e5', '746', '96090', 'DUCHARME, AMARILYS', '2023.09.11', 'done', { r2: 'P' }),
    claim('e6', '1885', '96090', 'BEARDWOOD, WALTER', '2025.02.03', 'done', { r2: 'P' }),
    claim('e7', '3132', '96091', 'HOWSER, DOOGIE', '2026.07.02', 'done', { r2: 'P' }),
  ],
  mspErrors: [
    { id: 'm1', last: 'DO-GOOD', first: 'DUDLEY', sex: 'M', dob: '1957.07.25', phn: '9151206012', request: 'Registration', reason: 'A1', received: '2026.09.14', chart: '', result: 'chart', message: 'No matching chart.' },
    { id: 'm2', last: 'ADAMS', first: 'SAMUEL', sex: 'M', dob: '1974.05.06', phn: '9250737623', request: 'Registration', reason: 'A1', received: '2026.09.14', chart: '1885', result: 'conflict', message: 'Already has active enrollment record.' },
    { id: 'm3', last: 'AADAMS', first: 'PATCH', sex: 'M', dob: '1993.05.12', phn: '9876588666', request: 'Deregistation', reason: '02', received: '2026.09.11', chart: '3598', result: 'conflict', message: 'No enrollment record to unenroll.' },
    { id: 'm4', last: 'ADAMS', first: 'JUSTINE', sex: 'F', dob: '2024.02.06', phn: '9878375689', request: 'Registration', reason: 'A0', received: '2024.03.01', chart: '3093', result: 'ok', message: 'Successfully processed.' },
  ],
  pbf: {
    active: true, sendCore: true, convertCore: true, standardCode: '96198',
    payors: 'WC,WCB,ICBC,IN', locations: 'E',
    regFee: '96090', regDiag: 'V90', deregFee: '96091', deregDiag: 'V90',
    regOverrideFee: '96092', regOverrideDiag: 'V90', deregOverrideFee: '96093', deregOverrideDiag: 'V90',
    autoAcceptReg: '', autoAcceptDereg: 'A0,A1',
    indexCode: '84679', indexName: 'PCPC COMPLEXITY INDEX', indexOrderedBy: 'MOIS - PCPC CALC',
    payees: [{ payee: '00001', createdBy: SESSION_USER, created: '2024.01.02', modifiedBy: SESSION_USER, modified: '2024.01.02' }],
  },
  pbfSaved: false,
  pcpcRuns: [
    { id: 'run1', date: '2026.07.02 14:10', include: 'enrolled', provider: 'all', output: 'Printable Report', charts: ['2429', '746', '1885', '3132', '3093', '2350'], index: '1.27', measured: false },
  ],
  history: [],
  panel: {
    'BEARDWOOD, WALTER': ['2429', '1885', '3093', '3132', '2350', '3609'],
    'DUCHARME, AMARILYS': ['746', '3436', '712'],
    'PRACTITIONER, GENERAL': ['3658', '1003', '3811', '3424'],
    'HOWSER, DOOGIE': ['3429', '3598'],
  },
  panelClaims: [
    { id: 'p1', chart: '2429', provider: 'BEARDWOOD, WALTER', date: '2025.10.15', state: 'sent' },
    { id: 'p2', chart: '1885', provider: 'BEARDWOOD, WALTER', date: '2025.10.15', state: 'sent' },
    { id: 'p3', chart: '3132', provider: 'BEARDWOOD, WALTER', date: '2025.10.15', state: 'deleted' },
    { id: 'p4', chart: '746', provider: 'DUCHARME, AMARILYS', date: '2025.10.20', state: 'sent' },
    { id: 'p5', chart: '3658', provider: 'PRACTITIONER, GENERAL', date: '2025.11.03', state: 'sent' },
  ],
  changes: [
    { chart: '3811', date: '2026.06.18', kind: 'New', before: '', after: 'A' },
    { chart: '4146', date: '2026.06.04', kind: 'New', before: '', after: 'A' },
    { chart: '3132', date: '2026.07.02', kind: 'Changed', before: 'A', after: 'TR' },
    { chart: '3429', date: '2026.08.28', kind: 'Changed', before: 'A', after: 'D' },
    { chart: '3424', date: '2026.09.02', kind: 'Changed', before: 'I', after: 'A' },
  ],
  batches: { '10023': [] },
  last: '',
})

let state: BillingProgramsState = initial()
let serial = 100
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const nextId = (p: string) => `${p}${++serial}`

function set(next: Partial<BillingProgramsState>) {
  state = { ...state, ...next }
  emit()
}

export function resetBillingPrograms() {
  state = initial()
  serial = 100
  emit()
}

export const billingProgramsState = () => state

export function useBillingPrograms(): BillingProgramsState {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l) },
    () => state,
    () => state,
  )
}

/* --- derived ---------------------------------------------------------------- */

export const patientOf = (chart: string) => P(chart)
export const patientName = (chart: string) => {
  const p = P(chart)
  return p ? `${p.last}, ${p.first}` : chart
}

export const lfpProviderOf = (s: BillingProgramsState, provider: string) => s.lfp.find((p) => p.provider === provider)

/** Enrolled as a family physician or a locum, current or pending approval —
    the providers Time Management's Provider Profile lists ("only
    LFP-registered providers will appear", 3166420). */
export const isLfpRegistered = (p: LfpProvider) =>
  ['current', 'expiring', 'pending-approval'].includes(p.family) || ['current', 'expiring', 'pending-approval'].includes(p.locum)

export const lfpRegisteredProviders = (s: BillingProgramsState) => s.lfp.filter(isLfpRegistered).map((p) => p.provider)

export const minutesOfEntry = (e: TimeEntry) => {
  const a = minutesOf(e.start); const b = minutesOf(e.stop)
  return Number.isNaN(a) || Number.isNaN(b) || b <= a ? 0 : b - a
}

export const entriesFor = (s: BillingProgramsState, provider: string, date: string) =>
  s.entries.filter((e) => e.provider === provider && e.date === date)
    .sort((a, b) => minutesOf(a.start) - minutesOf(b.start))

/** An appointment is Fee For Service when its payor is not one of LFP
    Setup's payor codes (`Blank` meaning none) — the Time Claim Wizard's
    "non LFP payor code (ie ICBC, WCB, PATIENT, …)" (3166420 `6989e576…`).
    Its length is the slot count times five minutes (INFERRED: the day book
    carries a slot count, not a duration) and one slot of 15 minutes when
    it has none. */
export type DayAppointment = { start: number; stop: number; chart: string; name: string; payor: string; column: 'appt' | 'icbc' | 'wcb' | 'oop'; ffs: boolean; status: string }

export function appointmentsFor(s: BillingProgramsState, provider: string, date: string): DayAppointment[] {
  const lfpPayors = s.lfpSetup.payors.split(',').map((x) => x.trim().toUpperCase())
  return daybookFor(provider, offsetOfStamp(date)).map((a) => {
    const start = Number(a.hr) * 60 + Number(a.mn)
    const len = a.n ? Math.max(5, Number(a.n) * 5) : 15
    const payor = (a.payor || '').toUpperCase()
    const blank = !payor && lfpPayors.includes('BLANK')
    const ffs = !(blank || lfpPayors.includes(payor))
    const column: DayAppointment['column'] = payor === 'ICBC' ? 'icbc' : payor === 'WC' || payor === 'WCB' ? 'wcb' : payor === 'OOP' ? 'oop' : 'appt'
    return { start, stop: start + len, chart: a.chart, name: `${a.last}, ${a.first}`, payor, column, ffs, status: a.code }
  })
}

/** 3166420 "LFP and FFS billing together": an entry overlapping a FFS
    appointment is drawn with a red line. */
export const overlapsFfs = (e: TimeEntry, appts: DayAppointment[]) =>
  appts.some((a) => a.ffs && a.start < minutesOf(e.stop) && a.stop > minutesOf(e.start))

/** The claim-window Patient, by the Time Claim Wizard's "Use the first
    patient of the day for all time claims" rules (3166420 "Time Claim
    Wizard Setting"). */
export function patientForSlot(appts: DayAppointment[], entries: TimeEntry[], entry: TimeEntry, firstOfDay: boolean): string {
  const valid = appts.filter((a) => a.chart).sort((a, b) => a.start - b.start)
  if (!valid.length) return ''
  if (firstOfDay) return valid[0]!.name
  const at = minutesOf(entry.start)
  const after = valid.find((a) => a.start >= at)
  if (after) return after.name
  const previous = entries.filter((e) => minutesOf(e.stop) <= at).sort((a, b) => minutesOf(b.start) - minutesOf(a.start))[0]
  if (previous) {
    const prevAppt = valid.find((a) => a.start >= minutesOf(previous.start))
    if (prevAppt) return prevAppt.name
  }
  return valid[0]!.name
}

export type ClaimLine = {
  entry: TimeEntry
  start: string
  stop: string
  units: number
  fee: string
  code: TimeCode
  patient: string
  ffsMinutes: number
  note: string
}

/** The Time Claim Review rows for a provider's day: one claim per unbilled
    entry, less the FFS appointment minutes it overlaps (Subtract Fee for
    Service Appointment Times), in 15-minute units. Optimize Time Segments
    combines the leftover minutes of the day's entries into extra units of
    the most-used code. */
export function claimLines(s: BillingProgramsState, provider: string, date: string, opts: { optimize: boolean; subtract: boolean; firstPatient: boolean }): ClaimLine[] {
  const lfp = lfpProviderOf(s, provider)
  const locum = !!lfp && lfp.locum && !lfp.family
  const appts = appointmentsFor(s, provider, date)
  const all = entriesFor(s, provider, date)
  const open = all.filter((e) => !e.claimed)
  let spare = 0
  const lines = open.map((e) => {
    const a = minutesOf(e.start); const b = minutesOf(e.stop)
    const ffs = opts.subtract
      ? appts.filter((x) => x.ffs).reduce((n, x) => n + Math.max(0, Math.min(b, x.stop) - Math.max(a, x.start)), 0)
      : 0
    const net = Math.max(0, minutesOfEntry(e) - ffs)
    spare += net % 15
    const code = TIME_CODES.find((c) => c.id === e.code)!
    return {
      entry: e, start: e.start, stop: e.stop, units: Math.floor(net / 15),
      fee: locum ? code.locumFee : code.fee, code: e.code,
      patient: patientForSlot(appts, all, e, opts.firstPatient), ffsMinutes: ffs, note: e.note,
    }
  })
  if (opts.optimize && spare >= 15 && lines.length) {
    const top = [...lines].sort((x, y) => y.units - x.units)[0]!
    top.units += Math.floor(spare / 15)
  }
  return lines.filter((l) => l.units > 0)
}

/** 3852837 / 3166420: MOIS's duplicate check matches patient, provider,
    date, fee code and number of services — never the start and stop times. */
export const isDuplicateClaim = (existing: { provider: string; date: string; fee: string; units: number }[], line: { provider: string; date: string; fee: string; units: number }) =>
  existing.some((c) => c.provider === line.provider && c.date === line.date && c.fee === line.fee && c.units === line.units)

export const panelStatusOf = (s: BillingProgramsState, chart: string): { status: 'Registered' | 'Unregistered' | 'Not Registered'; date: string; provider: string } => {
  const latest = s.panelClaims.filter((c) => c.chart === chart).sort((a, b) => b.date.localeCompare(a.date))[0]
  if (!latest) return { status: 'Not Registered', date: '', provider: '' }
  return { status: latest.state === 'deleted' ? 'Unregistered' : 'Registered', date: latest.date, provider: latest.provider }
}

export const providerOfChart = (s: BillingProgramsState, chart: string) =>
  Object.entries(s.panel).find(([, charts]) => charts.includes(chart))?.[0] ?? ''

export const isEnrolledNow = (e: Enrolment, today = PBF_TODAY) =>
  e.startStatus === 'Registered' && e.start <= today && (!e.stop || e.stopStatus !== 'Registered' || e.stop > today)

export const enrolmentOf = (s: BillingProgramsState, chart: string) => s.enrolments.find((e) => e.chart === chart)

/** The claim header the enrolment claim window prints, by fee code
    (2257761 `52f24e67…`, `f16e989b…`, `7e4f3103…`). */
export function claimTitle(fee: string, pbf = state.pbf): string {
  if (fee === pbf.regFee) return 'PBF-PRIMARY CARE REGISTRATION CLAIM'
  if (fee === pbf.deregFee) return 'PBF-PRIMARY CARE DE-REGISTRATION CLAIM'
  if (fee === pbf.regOverrideFee) return 'PBF-PRIMARY CARE REGISTRATION OVERRIDE CLAIM'
  if (fee === pbf.deregOverrideFee) return 'PBF-PRIMARY CARE DE-REGISTRATION OVERRIDE CLAIM'
  return 'PBF-PRIMARY CARE CLAIM'
}
/** The dashboard's `96090: PHC-PRIMARY CARE REGISTRATION` line (2258278 `7788a098…`). */
export const feeCaption = (fee: string) => `${fee}: ${claimTitle(fee).replace(/^PBF-/, 'PHC-').replace(/ CLAIM$/, '')}`

/** A claim as the Billing ▸ Unsent Claims lists carry it. */
export function unsentRow(chart: string, fee: string, doctor: string, service: string, sub = 'R'): UnsentClaim {
  const p = P(chart)
  return {
    chart, last: p?.last ?? '', first: p?.first ?? '', service, doctor, fee,
    dob: p?.dob ?? '', insrBy: p?.insuranceBy ?? 'BC', insrNbr: (p?.insurance ?? '').replace(/\s/g, ''),
    billed: '0.00', compl: true, hold: false, sub,
  }
}

const log = (chart: string, change: string, status: string): HistoryLine => ({ chart, date: `${PBF_TODAY} ${nowTime()}`, change, status, by: SESSION_USER })
const nowTime = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/* --- the chart's own benefit record -------------------------------------------
   A BC-PBF request made on a chart's Benefits tab this session lives in the
   chart's edits (screens/BenefitDialogs.tsx). The administrator's decision
   and MSP's answer are written back to it, so the Benefits tab reads
   Approved while the claim waits, Submitted once it has gone and Registered
   once MSP accepts it. */
const PBF_SERVICE = 'BC-PBF'

function setBenefit(chart: string, from: BenefitEntry['status'][] | null, to: BenefitEntry['status']) {
  const list = patientEdits(chart).benefits
  if (!list?.some((b) => b.service === PBF_SERVICE)) return
  const clean = isPatientSaved(chart)
  updatePatient(chart, {
    benefits: list.map((b) => (b.service === PBF_SERVICE && (!from || from.includes(b.status)) ? { ...b, status: to } : b)),
  })
  if (clean) savePatient(chart)
}

/** BC-PBF requests waiting on charts' Benefits tabs. */
function benefitRequests(): { chart: string; kind: 'enroll' | 'unenroll'; date: string; reason: string }[] {
  return editedCharts().flatMap((chart) => (patientEdits(chart).benefits ?? [])
    .filter((b) => b.service === PBF_SERVICE && (b.status === 'Requested' || b.status === 'Unenrollment Requested'))
    .map((b) => (b.status === 'Requested'
      ? { chart, kind: 'enroll' as const, date: b.start ?? PBF_TODAY, reason: '' }
      : { chart, kind: 'unenroll' as const, date: b.stop ?? PBF_TODAY, reason: b.stopReason ?? '' })))
}

/* --- actions ---------------------------------------------------------------- */

function updateEnrolment(chart: string, patch: Partial<Enrolment>, s = state): Enrolment[] {
  const existing = s.enrolments.find((e) => e.chart === chart)
  if (existing) return s.enrolments.map((e) => (e.chart === chart ? { ...e, ...patch, modified: `${PBF_TODAY} ${nowTime()}  ${SESSION_USER}` } : e))
  return [...s.enrolments, { ...enrolment(chart, patch.start ?? PBF_TODAY, patch.provider ?? providerOfChart(s, chart) ?? '', { startStatus: '' }), ...patch }]
}

export const billingPrograms = {
  get: () => state,

  /* LFP ------------------------------------------------------------------- */
  saveLfpSetup(setup: LfpSetup) { set({ lfpSetup: setup, lfpSaved: true, last: 'lfp-setup-saved' }) },

  saveLfpProfile(provider: string, patch: Partial<LfpProvider>) {
    set({ lfp: state.lfp.map((p) => (p.provider === provider ? { ...p, ...patch } : p)), last: 'lfp-profile-saved' })
  },

  /** Update LFP Enrollment / Service Registration ▸ Continue: "Once
      completed, a Registration Claim is created and the provider or locum
      status changes to: Pending Submission." */
  registerLfp(provider: string, pick: { enrol: '' | 'family' | 'locum'; services: LfpService[]; start: string }) {
    set({
      lfp: state.lfp.map((p) => {
        if (p.provider !== provider) return p
        const claims = [...p.claims]
        const add = (key: 'family' | 'locum' | LfpService) => claims.push({
          service: pick.start, seq: '', code: LFP_REG_CODES[key].code, description: LFP_REG_CODES[key].description, r1: '', r2: '',
        })
        const next: LfpProvider = { ...p, start: pick.start || p.start, services: { ...p.services }, claims }
        if (pick.enrol) { next[pick.enrol] = 'pending-submission'; add(pick.enrol) }
        pick.services.forEach((svc) => { next.services[svc] = 'pending-submission'; add(svc) })
        return next
      }),
      last: 'lfp-registration-requested',
    })
  },

  addTimeEntry(entry: Omit<TimeEntry, 'id'>) {
    const e = { ...entry, id: nextId('t') }
    set({ entries: [...state.entries, e], last: 'time-entry-added' })
    return e
  },
  updateTimeEntry(id: string, patch: Partial<TimeEntry>) {
    set({ entries: state.entries.map((e) => (e.id === id && !e.claimed ? { ...e, ...patch } : e)), last: 'time-entry-changed' })
  },
  removeTimeEntry(id: string) {
    set({ entries: state.entries.filter((e) => e.id !== id || !!e.claimed), last: 'time-entry-removed' })
  },
  replaceDay(provider: string, date: string, rows: TimeEntry[]) {
    const keep = state.entries.filter((e) => !(e.provider === provider && e.date === date) || e.claimed)
    const fresh = rows.filter((r) => !r.claimed).map((r) => ({ ...r, id: r.id || nextId('t'), provider, date }))
    set({ entries: [...keep, ...fresh], last: 'time-entries-saved' })
  },

  /** Time Claims ▸ Create Claims: one claim per line, locked entries.
      Returns the claims so the window can add them to Unsent Claims. */
  createTimeClaims(provider: string, date: string, lines: (ClaimLine & { sub: string })[]): TimeClaim[] {
    const made: TimeClaim[] = lines.map((l) => ({
      id: nextId('c'), entry: l.entry.id, provider, date, start: l.start, stop: l.stop, units: l.units,
      fee: l.fee, patient: `${LFP_TIME_PATIENT.last}, ${LFP_TIME_PATIENT.first}`, sub: l.sub, status: 'unsent',
    }))
    const byEntry = new Map(made.map((c) => [c.entry, c.id]))
    set({
      timeClaims: [...state.timeClaims, ...made],
      entries: state.entries.map((e) => (byEntry.has(e.id) ? { ...e, claimed: byEntry.get(e.id) } : e)),
      last: made.some((c) => c.sub === 'D') ? 'time-claims-created-duplicate' : 'time-claims-created',
    })
    return made
  },

  /* PBF ------------------------------------------------------------------- */
  savePbfConfig(pbf: PbfConfig) { set({ pbf, pbfSaved: true, last: 'pbf-config-saved' }) },

  /** Enrollment CR ▸ Refresh (and opening the folder): pick up the BC-PBF
      requests made on charts' Benefits tabs this session. */
  syncFromCharts() {
    const fresh = benefitRequests().filter((r) => !state.crs.some((c) => c.chart === r.chart && c.kind === r.kind && c.fromBenefits))
    if (!fresh.length) return
    set({
      crs: [...state.crs, ...fresh.map((r) => ({
        id: nextId('cr'), chart: r.chart, kind: r.kind, date: r.date, status: 'REQUESTED' as const, reason: r.reason,
        source: 'clinic' as const, person: SESSION_USER, requested: PBF_TODAY, fromBenefits: true,
      }))],
      enrolments: fresh.reduce((list, r) => (r.kind === 'enroll' && !list.some((e) => e.chart === r.chart)
        ? [...list, { ...enrolment(r.chart, r.date, providerOfChart(state, r.chart) || 'BEARDWOOD, WALTER'), startStatus: 'Requested' as DateStatus }]
        : list), state.enrolments),
    })
  },

  /** 2258278 Step 3a / 3b. */
  decideCr(id: string, decision: 'APPROVED' | 'REJECTED') {
    const cr = state.crs.find((c) => c.id === id)
    if (!cr || cr.status !== 'REQUESTED') return
    const pbf = state.pbf
    const doctor = enrolmentOf(state, cr.chart)?.provider || providerOfChart(state, cr.chart) || 'BEARDWOOD, WALTER'
    let claims = state.claims
    let enrolments = state.enrolments
    const history = [...state.history]
    const makeClaim = (fee: string) => {
      claims = [...claims, claim(nextId('e'), cr.chart, fee, doctor, cr.date, 'unsent', { cr: cr.id, created: `${PBF_TODAY} ${nowTime()}  ${SESSION_USER}` })]
    }
    if (decision === 'APPROVED') {
      if (cr.source === 'clinic') {
        makeClaim(cr.kind === 'enroll' ? pbf.regFee : pbf.deregFee)
        enrolments = cr.kind === 'enroll'
          ? updateEnrolment(cr.chart, { start: cr.date, startStatus: 'Approved', provider: doctor })
          : updateEnrolment(cr.chart, { stop: cr.date, stopStatus: 'Approved', stopReason: cr.reason })
      } else {
        enrolments = cr.kind === 'enroll'
          ? updateEnrolment(cr.chart, { start: cr.date, startStatus: 'Registered', provider: doctor })
          : updateEnrolment(cr.chart, { stop: cr.date, stopStatus: 'Registered', stopReason: cr.reason })
      }
    } else if (cr.source === 'msp') {
      makeClaim(cr.kind === 'enroll' ? pbf.regOverrideFee : pbf.deregOverrideFee)
    } else if (cr.kind === 'enroll' && !enrolmentOf(state, cr.chart)?.start) {
      enrolments = updateEnrolment(cr.chart, { start: cr.date, startStatus: 'Rejected' })
    }
    history.push(log(cr.chart, `${cr.kind === 'enroll' ? 'Start' : 'Stop'} date ${cr.date}`, decision === 'APPROVED' ? 'Approved' : 'Rejected'))
    set({
      crs: state.crs.map((c) => (c.id === id ? { ...c, status: decision } : c)),
      claims, enrolments, history,
      last: decision === 'APPROVED' ? 'cr-approved' : 'cr-rejected',
    })
    if (cr.kind === 'enroll') setBenefit(cr.chart, ['Requested'], decision === 'APPROVED' ? (cr.source === 'msp' ? 'Registered' : 'Approved') : 'Rejected')
  },

  /** The yellow swoosh: back to REQUESTED, its unsent claims removed.
      False when a claim has already gone to MSP ("Once MSP Claims have been
      sent … the undo process is blocked"). */
  undoCr(id: string): boolean {
    const cr = state.crs.find((c) => c.id === id)
    if (!cr || cr.status === 'REQUESTED') return false
    const linked = state.claims.filter((c) => c.cr === id)
    if (linked.some((c) => c.state !== 'unsent')) return false
    const enrolments = cr.kind === 'enroll'
      ? updateEnrolment(cr.chart, { startStatus: 'Requested' })
      : updateEnrolment(cr.chart, { stopStatus: 'Requested' })
    set({
      crs: state.crs.map((c) => (c.id === id ? { ...c, status: 'REQUESTED' } : c)),
      claims: state.claims.filter((c) => c.cr !== id),
      enrolments,
      history: [...state.history, log(cr.chart, 'Change request action undone', 'Requested')],
      last: 'cr-undone',
    })
    if (cr.kind === 'enroll') setBenefit(cr.chart, ['Approved', 'Rejected'], 'Requested')
    return true
  },

  updateClaim(id: string, patch: Partial<EnrolmentClaim>, dates?: { start?: string; stop?: string }) {
    const c = state.claims.find((x) => x.id === id)
    if (!c) return
    let enrolments = state.enrolments
    const history = [...state.history]
    if (dates && (dates.start !== undefined || dates.stop !== undefined)) {
      enrolments = updateEnrolment(c.chart, { ...(dates.start !== undefined ? { start: dates.start } : {}), ...(dates.stop !== undefined ? { stop: dates.stop } : {}) })
      history.push(log(c.chart, 'Benefit plan dates updated from the unsent claim', 'Approved'))
    }
    set({
      claims: state.claims.map((x) => (x.id === id ? { ...x, ...patch, modified: `${PBF_TODAY} ${nowTime()}  ${SESSION_USER}` } : x)),
      enrolments, history, last: 'enrolment-claim-saved',
    })
  },

  /** "Deleting a claim from the list will 'revert' the related change
      request to a 'needs review' / 'requested' state." */
  deleteUnsentClaim(id: string) {
    const c = state.claims.find((x) => x.id === id)
    if (!c || c.state !== 'unsent') return
    set({
      claims: state.claims.filter((x) => x.id !== id),
      crs: state.crs.map((x) => (x.id === c.cr ? { ...x, status: 'REQUESTED' } : x)),
      history: [...state.history, log(c.chart, `Unsent claim ${c.fee} deleted`, 'Requested')],
      last: 'enrolment-claim-deleted',
    })
  },

  /** Failed Claim Actions ▸ Resubmit: "Resubmission will create another
      unsent enrollment claim, linked accordingly to the failed claim". */
  resubmitClaim(id: string) {
    const c = state.claims.find((x) => x.id === id)
    if (!c || c.state !== 'failed') return
    const fresh = claim(nextId('e'), c.chart, c.fee, c.doctor, PBF_TODAY, 'unsent', { replaces: c.id, cr: c.cr, diag: c.diag, sub: c.sub })
    set({
      claims: [...state.claims.map((x) => (x.id === id ? { ...x, state: 'done' as const, r1: 'R' } : x)), fresh],
      history: [...state.history, log(c.chart, `Failed claim ${c.fee} resubmitted`, 'Approved')],
      last: 'enrolment-claim-resubmitted',
    })
  },
  /** Accept: take MSP's refusal as final (INFERRED — the button is in the
      capture, the article does not describe it). */
  acceptClaim(id: string) {
    const c = state.claims.find((x) => x.id === id)
    if (!c || c.state !== 'failed') return
    set({
      claims: state.claims.map((x) => (x.id === id ? { ...x, state: 'done' as const, r1: 'A' } : x)),
      history: [...state.history, log(c.chart, `Failed claim ${c.fee} accepted`, 'Rejected')],
      last: 'enrolment-claim-accepted',
    })
  },

  /** Patient Enrollment ▸ Edit: overriding a registered start / stop date
      (2258278 "Overriding Enrollment Start/Stop Dates"). */
  overrideDates(chart: string, patch: { start?: string; stop?: string; stopReason?: string }) {
    const before = enrolmentOf(state, chart)
    set({
      enrolments: updateEnrolment(chart, patch),
      history: [...state.history, log(chart, `Override: start ${before?.start ?? ''} → ${patch.start ?? before?.start ?? ''}; stop ${before?.stop || '-'} → ${patch.stop ?? (before?.stop || '-')}`, 'Registered')],
      last: 'enrolment-override-saved',
    })
  },

  /** Action ▸ By-Pass Registration Process to… (2258278 "Manually Creating
      Patient PBF Enrollment Records"): the record is written Registered
      with no change request and no claim. */
  bypass(mode: 'enroll' | 'unenroll', chart: string, date: string, provider: string, reason: string) {
    const patch: Partial<Enrolment> = mode === 'enroll'
      ? { start: date, startStatus: 'Registered', stop: '', stopStatus: '', provider }
      : { stop: date, stopStatus: 'Registered', stopReason: reason }
    set({
      enrolments: updateEnrolment(chart, patch),
      history: [...state.history, log(chart, `By-pass ${mode === 'enroll' ? 'enrolment' : 'unenrolment'} ${date}`, 'Registered')],
      last: mode === 'enroll' ? 'bypass-enrolled' : 'bypass-unenrolled',
    })
  },

  changeServiceProvider(chart: string, provider: string) {
    set({ enrolments: updateEnrolment(chart, { provider }), last: 'service-provider-changed' })
  },

  addEligibility(chart: string, provider: string) {
    set({ eligibility: [...state.eligibility, { id: nextId('el'), chart, provider, date: PBF_TODAY, status: 'NEW', outcome: '' }], last: 'eligibility-requested' })
  },
  deleteEligibility(id: string) {
    set({ eligibility: state.eligibility.filter((e) => e.id !== id || e.status !== 'NEW'), last: 'eligibility-deleted' })
  },

  deleteMspError(id: string) {
    set({ mspErrors: state.mspErrors.map((m) => (m.id === id ? { ...m, deleted: true } : m)), last: 'msp-cr-deleted' })
  },
  /** Replay: match and check the remittance record again, against the data
      as it now is (2257761 "Cleaned up MOIS data to ensure the record can be
      successfully reprocessed"). */
  replayMspError(id: string): 'ok' | 'chart' | 'conflict' {
    const m = state.mspErrors.find((x) => x.id === id)
    if (!m) return 'chart'
    const match = findPatient(m.chart)
    if (!match) {
      set({ last: 'msp-cr-replay-failed' })
      return 'chart'
    }
    const e = enrolmentOf(state, m.chart)
    const enrolled = !!e && isEnrolledNow(e)
    let result: MspCrError['result'] = 'ok'
    let message = 'Successfully processed.'
    let enrolments = state.enrolments
    if (m.request === 'Registration') {
      if (enrolled) { result = 'conflict'; message = 'Already has active enrollment record.' }
      else enrolments = updateEnrolment(m.chart, { start: m.received, startStatus: 'Registered', stop: '', stopStatus: '' })
    } else if (!enrolled) { result = 'conflict'; message = 'No enrollment record to unenroll.' }
    else enrolments = updateEnrolment(m.chart, { stop: m.received, stopStatus: 'Registered', stopReason: m.reason })
    set({
      mspErrors: state.mspErrors.map((x) => (x.id === id ? { ...x, result, message } : x)),
      enrolments,
      last: result === 'ok' ? 'msp-cr-replayed' : 'msp-cr-replay-failed',
    })
    return result
  },

  recordPcpcRun(run: Omit<PcpcRun, 'id'>) {
    const r = { ...run, id: nextId('run') }
    set({ pcpcRuns: [...state.pcpcRuns, r], last: 'pcpc-run' })
    return r
  },

  /* PAS ------------------------------------------------------------------- */
  addPanelClaims(charts: string[], provider: string, batch?: string): PanelClaim[] {
    const made = charts.map((chart) => ({ id: nextId('p'), chart, provider, date: MOIS_TODAY, state: 'unsent' as const, batch }))
    set({
      panelClaims: [...state.panelClaims, ...made],
      batches: batch ? { ...state.batches, [batch]: made.map((m) => m.id) } : state.batches,
      last: batch ? 'panel-batch-created' : 'panel-claim-created',
    })
    return made
  },
  /** "Marking a claim as 'deleted' will flag the patient as being
      unregistered in MOIS" (3788178 `7119ae1f…`). */
  unregister(chart: string) {
    const latest = state.panelClaims.filter((c) => c.chart === chart).sort((a, b) => b.date.localeCompare(a.date))[0]
    if (!latest) return
    set({ panelClaims: state.panelClaims.map((c) => (c.id === latest.id ? { ...c, state: 'deleted' as const } : c)), last: 'panel-unregistered' })
  },
  /** DEACON ▸ Undo / delete bulk patient LFP registration claims. Returns
      the charts removed, or null when the batch is not an LFP.PANEL one. */
  undoBatch(batch: string): string[] | null {
    const ids = state.batches[batch]
    if (!ids) return null
    const removed = state.panelClaims.filter((c) => ids.includes(c.id) && c.state === 'unsent')
    set({
      panelClaims: state.panelClaims.filter((c) => !removed.includes(c)),
      last: 'panel-batch-undone',
    })
    return removed.map((c) => c.chart)
  },
  nextBatchId() {
    return String(10024 + Object.keys(state.batches).length - 1)
  },

  /* MSP ------------------------------------------------------------------- */
  /** Data Exchange ▸ MSP ▸ Prepare Bills ▸ Run. */
  prepareBills() {
    const sending = [...new Set(state.claims.filter((c) => c.state === 'unsent' && c.compl && !c.hold).map((c) => c.chart))]
    const bump = (v: LfpState): LfpState => (v === 'pending-submission' ? 'pending-approval' : v)
    set({
      lfp: state.lfp.map((p) => ({
        ...p,
        family: bump(p.family), locum: bump(p.locum),
        services: Object.fromEntries(LFP_SERVICES.map((k) => [k, bump(p.services[k])])) as Record<LfpService, LfpState>,
        claims: p.claims.map((c, i) => (c.seq ? c : { ...c, seq: String(15000 + i + serial), r2: 'U' })),
      })),
      claims: state.claims.map((c) => (c.state === 'unsent' && c.compl && !c.hold
        ? { ...c, state: 'unack' as const, r2: 'U', wo: 'N', sent: PBF_TODAY, seq: String(15700 + Number(c.id.replace(/\D/g, ''))) }
        : c)),
      enrolments: state.enrolments.map((e) => {
        const sending = state.claims.some((c) => c.chart === e.chart && c.state === 'unsent' && c.compl && !c.hold)
        if (!sending) return e
        return {
          ...e,
          startStatus: e.startStatus === 'Approved' ? 'Submitted' : e.startStatus,
          stopStatus: e.stopStatus === 'Approved' ? 'Submitted' : e.stopStatus,
        }
      }),
      eligibility: state.eligibility.map((e) => (e.status === 'NEW' ? { ...e, status: 'SUBMITTED' as const, date: PBF_TODAY } : e)),
      timeClaims: state.timeClaims.map((c) => (c.status === 'unsent' ? { ...c, status: 'sent' as const } : c)),
      panelClaims: state.panelClaims.map((c) => (c.state === 'unsent' ? { ...c, state: 'sent' as const } : c)),
      last: 'msp-prepared',
    })
    sending.forEach((chart) => setBenefit(chart, ['Approved'], 'Submitted'))
  },

  /** Data Exchange ▸ MSP ▸ Reconcile Remittance ▸ Run. */
  reconcile() {
    const settle = (v: LfpState): LfpState => (v === 'pending-approval' ? 'current' : v)
    const acked = state.claims.filter((c) => c.state === 'unack')
    set({
      lfp: state.lfp.map((p) => ({
        ...p,
        family: settle(p.family), locum: settle(p.locum),
        services: Object.fromEntries(LFP_SERVICES.map((k) => [k, settle(p.services[k])])) as Record<LfpService, LfpState>,
        claims: p.claims.map((c) => (c.r2 === 'U' ? { ...c, r2: 'P' } : c)),
      })),
      claims: state.claims.map((c) => (c.state === 'unack' ? { ...c, state: 'done' as const, r2: 'P' } : c)),
      enrolments: state.enrolments.map((e) => {
        if (!acked.some((c) => c.chart === e.chart)) return e
        return {
          ...e,
          startStatus: e.startStatus === 'Submitted' ? 'Registered' : e.startStatus,
          stopStatus: e.stopStatus === 'Submitted' ? 'Registered' : e.stopStatus,
        }
      }),
      eligibility: state.eligibility.map((e) => {
        if (e.status !== 'SUBMITTED') return e
        const en = enrolmentOf(state, e.chart)
        return { ...e, status: 'PROCESSED' as const, outcome: en && isEnrolledNow(en) ? 'REGISTERED' : 'PENDING REGISTRATION' }
      }),
      last: 'msp-reconciled',
    })
    acked.forEach((c) => setBenefit(c.chart, c.fee === state.pbf.deregFee ? ['Unenrollment Requested', 'Registered'] : ['Submitted'], 'Registered'))
  },
}

/* --- DEACON ▸ MSP - LFP PATIENT PANEL ------------------------------------------
   The two functions art. 3295289 walks through (captures `07de3928…`,
   `43859d93…`). screens/DeaconWindow.tsx calls this on Run; null means the
   function has no behaviour here and the window keeps its generic prompt. */
export type DeaconResult = { ok: boolean; message?: string; claims?: UnsentClaim[] }

export function deaconRun(fn: string, params: Record<string, string>): DeaconResult | null {
  const key = fn.toLowerCase()
  const param = (start: string) => Object.entries(params).find(([k]) => k.toLowerCase().startsWith(start))?.[1]?.trim() ?? ''
  if (key.startsWith('create bulk patient lfp registration')) {
    const provider = param('service provider')
    const statuses = param('patient status').toUpperCase().split(',').map((x) => x.trim()).filter(Boolean)
    const asOf = param('last contact').replace(/-/g, '.')
    const mode = param('mode').toUpperCase()
    if (!provider) return { ok: false, message: 'Select the Service Provider.' }
    if (mode !== 'C' && mode !== 'R') return { ok: false, message: 'Enter the Mode: C (claim) or R (review).' }
    const charts = (state.panel[provider] ?? []).filter((chart) => {
      const p = findPatient(chart)
      if (!p) return false
      if (statuses.length && !statuses.includes(p.status ?? 'A')) return false
      if (asOf && (p.registered ?? '') < asOf) return false
      return panelStatusOf(state, chart).status !== 'Registered'
    })
    if (mode === 'R') return { ok: true, message: `${charts.length} patient(s) meet the selected parameters (review only; no claims were created).` }
    const batch = billingPrograms.nextBatchId()
    billingPrograms.addPanelClaims(charts, provider, batch)
    return {
      ok: true,
      message: `MSP Batch ID ${batch}: ${charts.length} unsent 98990 claim(s) created.`,
      claims: charts.map((chart) => unsentRow(chart, '98990', provider, MOIS_TODAY)),
    }
  }
  if (key.startsWith('undo')) {
    const batch = param('msp batch id')
    const removed = batch ? billingPrograms.undoBatch(batch) : null
    if (!removed) return { ok: false, message: `${batch || 'The batch'} is not an LFP.PANEL batch.` }
    return { ok: true, message: `${removed.length} unsent claim(s) removed from batch ${batch}.` }
  }
  return null
}

/* --- BC PCPC in-basket claim validation (art. 1776677) -------------------------
   The MSP claim rules the PCPC project added, for the Unsent MSP window's
   Save and the day book's Ctrl+B:
   - "Prevent claims for non enrolled patients using Fee Code 96198";
   - an enrolled patient billed an In-Basket fee code is a validation error:
     "mark claim as incomplete and require the user to update the fee code"
     — the warning reads "Enrolled patients cannot be billed for In-Basket
     items without fee code 96198";
   - for an enrolled patient's 96198 claim the pay mode becomes Alternate;
   - MSP Location E, a WCB claim and an ICBC (MVA) claim override the
     enrolled validation;
   - the Service Date shows "BC PCPC ENROLLED" beside it (`499e7738…`).
   Enrolment is the PBF enrolment list (a registered start on or before the
   service date and no registered stop before it) or a BC-PBF benefit on the
   chart. The check is on while PBF Setup's "Activate PBF / PCPC Funding
   Model" is ticked — the successor of the protected "BC PCPC Site" setting.

   The In-Basket list is INFERRED: 1776677 links an external list and says
   BHSS flags the codes ("PCPC In Basket" on the Service Code prompt,
   `650da387…` shows it ticked on 00100). The office-visit and counselling
   codes below stand for it. */
export const PCPC_IN_BASKET = new Set(['00100', '00101', '00110', '00120', '00121', '00122', '00123', '00124', '00127', '13200', '13201'])

export type PcpcCheck = {
  enrolled: boolean
  /** the grey caption beside Service Date */
  indicator: string
  /** set when the claim breaks a rule */
  issue?: { kind: 'not-enrolled' | 'in-basket'; message: string; blocks: boolean }
  /** what the pay mode must be */
  payMode?: 'Alternate'
}

export function isPcpcEnrolled(chart: string, serviceDate: string, s = state): boolean {
  const e = s.enrolments.find((x) => x.chart === chart)
  if (e && e.startStatus === 'Registered' && e.start <= serviceDate && !(e.stop && e.stopStatus === 'Registered' && e.stop <= serviceDate)) return true
  return (patientEdits(chart).benefits ?? []).some((b) => b.service === PBF_SERVICE && b.status === 'Registered' && (b.start ?? '') <= serviceDate && (!b.stop || b.stop > serviceDate))
}

export function pcpcClaimCheck(claim: { chart: string; serviceDate: string; fee: string; location: string; wcb?: boolean; mva?: boolean }, s = state): PcpcCheck {
  if (!s.pbf.active || !claim.chart) return { enrolled: false, indicator: '' }
  const enrolled = isPcpcEnrolled(claim.chart, claim.serviceDate, s)
  const std = s.pbf.standardCode || '96198'
  const fee = claim.fee.trim()
  const override = claim.location.trim().toUpperCase() === 'E' || !!claim.wcb || !!claim.mva
  const out: PcpcCheck = { enrolled, indicator: enrolled ? 'BC PCPC ENROLLED' : '' }
  if (fee === std && !enrolled) {
    out.issue = { kind: 'not-enrolled', message: `Fee code ${std} can only be billed for patients enrolled in BC PCPC.`, blocks: true }
  } else if (enrolled && !override && PCPC_IN_BASKET.has(fee)) {
    out.issue = { kind: 'in-basket', message: `Enrolled patients cannot be billed for In-Basket items without fee code ${std}.`, blocks: false }
  }
  if (enrolled && fee === std) out.payMode = 'Alternate'
  return out
}
