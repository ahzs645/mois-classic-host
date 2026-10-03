/* ============================================================================
   The training claim lists behind Billing's four "Prompt -" buttons, and the
   one claim the Unsent MSP window holds.

   Column sets, their order and their widths are transcribed from the four
   captures of these dialogs on the MOIS help site:
     prompt patient.PNG        MSP Unsent Claims - Ordered by Patient
                               (303601 image `0dc50190`)
     prompt provider.PNG       MSP Unsent Claims - Ordered by Doctor
                               (303601 image `28562098`)
     prompt service date.PNG   the same dialog ordered by service date — note
                               its title bar still reads "Ordered by Patient",
                               which is the application's own bug and is kept
                               (303601 image `41ab0bf4`; the cloud build's
                               `ca83fd70` adds a Fee Code filter and "Service
                               Date from … to")
     prompt sent to msp.PNG    Claim Summary: Sent to MSP
     prompt sent by recon.PNG  Advanced Lookup Service ▸ MSP Sent Claim List
                               (303602 image `f2fa600c`)

   Compl and Hold are checkboxes in every capture ("If this column is checked
   off, the claim has been marked as Complete …", 303601), and Sub is the
   claim's submission code — the captures' rows all read `R`.

   The claims themselves are synthetic training data, like the rest of this
   emulator.
   ========================================================================= */
import { CLINIC_PROVIDER_NAMES, rosterProvider } from './clinicRoster'

export type UnsentClaim = {
  chart: string
  last: string; first: string; service: string; doctor: string; fee: string
  dob: string; insrBy: string; insrNbr: string; billed: string
  compl: boolean; hold: boolean; sub: string
  /* --- carried by the live list (data/billingStore.ts), not the captures --- */
  /** a stable id: `u1`… for the training rows, `n1`… for one made this session */
  id?: string
  /** the Claim Review Wizard's columns (303601 `e974131a`) */
  payee?: string; facility?: string; clar?: string; location?: string
  diag?: string
  /** the SNOMED-CT code a mapped ICD-9 diagnosis came from (2069402) */
  mappedFrom?: string
  /** where the claim came from: saved in Unsent MSP, billed off the day book,
      the Bulk Claim Creation Wizard, a resubmit / debit / duplicate */
  origin?: 'training' | 'saved' | 'daybook' | 'bulk' | 'resubmit' | 'debit' | 'duplicate'
  /** the whole claim window as Save left it, so a pick reloads every field */
  form?: ClaimForm
}

export const unsentClaims: UnsentClaim[] = [
  { id: 'u1', chart: '10035', last: 'BROWN', first: 'FARMER', service: '2026.03.18', doctor: 'BEARDWOOD, WALTER', fee: '13060', dob: '1990.10.23', insrBy: 'BC', insrNbr: '9151259051', billed: '71.50', compl: true, hold: false, sub: 'R' },
  { id: 'u2', chart: '10012', last: 'ADAM', first: 'GEORGE', service: '2026.03.18', doctor: 'BEARDWOOD, WALTER', fee: '00100', dob: '1978.02.04', insrBy: 'BC', insrNbr: '9151251882', billed: '33.05', compl: true, hold: false, sub: 'R' },
  { id: 'u3', chart: '10041', last: 'HALE', first: 'MARGARET', service: '2026.03.18', doctor: 'SHEWCHUK, LEAH', fee: '00120', dob: '1955.07.19', insrBy: 'BC', insrNbr: '9151253340', billed: '46.20', compl: true, hold: true, sub: 'R' },
  { id: 'u4', chart: '10057', last: 'RAO', first: 'PRIYA', service: '2026.03.17', doctor: 'HOWSER, DOOGIE', fee: '00101', dob: '1984.12.02', insrBy: 'BC', insrNbr: '9151257712', billed: '52.80', compl: true, hold: false, sub: 'R' },
  { id: 'u5', chart: '10063', last: 'OKONKWO', first: 'SAM', service: '2026.03.17', doctor: 'BEARDWOOD, WALTER', fee: '14070', dob: '1969.05.28', insrBy: 'BC', insrNbr: '', billed: '125.00', compl: false, hold: false, sub: 'R' },
  { id: 'u6', chart: '10078', last: 'FONTAINE', first: 'DALE', service: '2026.03.16', doctor: 'FAIRCHILD, NESRIN L', fee: '13005', dob: '2001.09.11', insrBy: 'BC', insrNbr: '9151258003', billed: '18.40', compl: true, hold: false, sub: 'R' },
  { id: 'u7', chart: '10084', last: 'CASTILLO', first: 'JUNE', service: '2026.03.16', doctor: 'DUCHARME, AMARILYS', fee: '00110', dob: '1947.01.30', insrBy: 'BC', insrNbr: '9151250264', billed: '39.95', compl: true, hold: false, sub: 'R' },
]

export type SentClaim = {
  /** a stable id (`s1`…) the session's toggles are kept against */
  id: string
  service: string; diag: string; fee: string; ins: string
  billed: string; paid: string; doctor: string; sent: string
  r1: string; r2: string; wo: string; e1: string; e2: string; e3: string
  ref: string; pract: string; last: string; first: string; m: string; payee: string
}

/* Paid prints a zero as a lone "-", the way `f2fa600c` does on its refused
   and held rows.

   E1–E3 carry only codes whose meaning the manual prints (MSP_EXPLANATORY_
   CODES below), so the Sent Claim Detail window (Ctrl+E) never shows a code
   with an invented description. Pract. No and Payee are the doctor's, from
   data/clinicRoster. */
const SENT_ROWS: Omit<SentClaim, 'pract' | 'payee'>[] = [
  { id: 's1', service: '2026.02.11', diag: '780', fee: '13060', ins: 'BC', billed: '71.50', paid: '71.50', doctor: 'BEARDWOOD, WALTER', sent: '2026.02.12', r1: '', r2: 'P', wo: 'N', e1: '', e2: '', e3: '', ref: 'X', last: 'BROWN', first: 'FARMER', m: '' },
  { id: 's2', service: '2026.02.11', diag: '401', fee: '00100', ins: 'BC', billed: '33.05', paid: '37.22', doctor: 'BEARDWOOD, WALTER', sent: '2026.02.12', r1: '', r2: 'P', wo: 'N', e1: '', e2: '', e3: '', ref: 'X', last: 'ADAM', first: 'GEORGE', m: '' },
  { id: 's3', service: '2026.02.04', diag: '250', fee: '14050', ins: 'BC', billed: '98.60', paid: '-', doctor: 'SHEWCHUK, LEAH', sent: '2026.02.05', r1: '', r2: 'R', wo: 'N', e1: 'K4', e2: '', e3: '', ref: 'X', last: 'HALE', first: 'MARGARET', m: '' },
  { id: 's4', service: '2026.01.28', diag: '300', fee: '00120', ins: 'BC', billed: '46.20', paid: '41.58', doctor: 'HOWSER, DOOGIE', sent: '2026.01.29', r1: 'A', r2: 'X', wo: 'N', e1: 'K4', e2: '', e3: '', ref: 'T', last: 'RAO', first: 'PRIYA', m: '' },
  { id: 's5', service: '2026.01.21', diag: '724', fee: '00101', ins: 'BC', billed: '52.80', paid: '-', doctor: 'BEARDWOOD, WALTER', sent: '2026.01.22', r1: '', r2: 'U', wo: 'N', e1: '', e2: '', e3: '', ref: 'X', last: 'OKONKWO', first: 'SAM', m: '' },
  { id: 's6', service: '2026.01.14', diag: '466', fee: '00110', ins: 'BC', billed: '39.95', paid: '39.95', doctor: 'FAIRCHILD, NESRIN L', sent: '2026.01.15', r1: 'R', r2: 'P', wo: 'N', e1: '', e2: '', e3: '', ref: 'X', last: 'FONTAINE', first: 'DALE', m: '' },
  { id: 's7', service: '2026.01.07', diag: '780', fee: '00100', ins: 'BC', billed: '33.05', paid: '-', doctor: 'SHEWCHUK, LEAH', sent: '2026.01.08', r1: 'R', r2: 'F', wo: 'N', e1: 'P9', e2: '', e3: '', ref: 'X', last: 'CASTILLO', first: 'JUNE', m: '' },
]
export const sentClaims: SentClaim[] = SENT_ROWS.map((c) => ({
  ...c, pract: rosterProvider(c.doctor)?.pract ?? '', payee: rosterProvider(c.doctor)?.payee ?? '',
}))

/* ============================================================================
   The claim on the Unsent MSP window.

   303601 "Unsent Window Description" and the v02.20.02 capture `12299570`
   (with the cloud build's Change Payee / PBF Class. from `fa0339f2`). New
   Claim "removes all information from the previous claim and opens a new
   claim"; the defaults a fresh claim opens on are the ones `fa0339f2` shows
   right after it — Insured By BC, Dep. No. 00, today's service date,
   Location A, No. Service 1.0000, Fee Item PG - 00100 at 29.97, Normal pay
   mode and after-hour indicator, Anatomic Area and NPI 00, both referrals
   N/A, MVA and Letter No, Sub Code 0, Correspondence Code 0.
   ========================================================================= */

export type ClaimForm = {
  doctor: string
  chart: string
  first: string
  middle: string
  last: string
  insuredBy: string
  insurance: string
  dep: string
  dob: string
  serviceDate: string
  location: string
  serviceTo: string
  noService: string
  clarification: string
  fee: string
  unit: string
  diag1: string
  diag2: string
  diag3: string
  payMode: 'Normal' | 'Alternate'
  afterHour: 'Normal' | 'Night' | 'Even' | 'W/end'
  /* --- the rest of the window, so Save keeps what was typed (303601
     "Unsent Window Description"); all optional, a claim from an older
     session store simply lacks them --- */
  /** Time(s) Received / Start / Finish, `hh:mm` */
  received?: string; start?: string; finish?: string
  /** REFER: the two Ref To/By rows */
  ref1?: 'N/A' | 'To' | 'By'; ref1Pract?: string
  ref2?: 'N/A' | 'To' | 'By'; ref2Pract?: string
  /** OPTIONS */
  mva?: 'Yes' | 'No'; icbc?: string; memo?: string; sub?: string; claimNote?: string; mspNote?: string
  /** OPTIONS' lower block: the patient details an out-of-province or newborn
      claim carries (303601 cloud capture `fa0339f2`: DoB, Sex, Address 1–4,
      Postal Code) */
  oopDob?: string; oopSex?: string; addr1?: string; addr2?: string; addr3?: string; addr4?: string; postal?: string
  /** WCB */
  wcbNo?: string; injury?: string
  /** OTHER */
  facility?: string; subFacility?: string
  /** Action ▸ Set as Pay Patient (PP) Claim (Ctrl+P) */
  payPatient?: boolean
  /** Diag Code 1 is an ICD-9 code MOIS mapped from this SNOMED-CT code (2069402) */
  mappedFrom?: string
  /** the live list's id of the claim on screen, once it has one */
  id?: string
  hold: boolean
  holdReason: string
  /** what Save decided; a claim that has never been saved reads Incomplete */
  status: 'Complete' | 'Incomplete'
  /** the window's own record state, reported to the frame as `host.screen.claim` */
  state: 'loaded' | 'new' | 'picked' | 'saved'
  created: string
}

/** the clinic's doctors, in billing order — data/clinicRoster */
export const DOCTORS = CLINIC_PROVIDER_NAMES

/** Fields Save needs before it will mark a claim Complete (303601: "MOIS will
    indicate the reason by showing the field name in red"). */
export const REQUIRED: (keyof ClaimForm)[] = ['chart', 'insurance', 'serviceDate', 'location', 'fee', 'unit', 'diag1']

export const missingFields = (c: ClaimForm) => REQUIRED.filter((k) => !String(c[k] ?? '').trim())

export function blankClaim(today: string, doctor = DOCTORS[0]!): ClaimForm {
  return {
    doctor, chart: '', first: '', middle: '', last: '',
    insuredBy: 'BC', insurance: '', dep: '00', dob: '',
    serviceDate: today, location: 'A', serviceTo: '', noService: '1.0000',
    clarification: 'PG', fee: '00100', unit: '29.97', diag1: '', diag2: '', diag3: '',
    payMode: 'Normal', afterHour: 'Normal', hold: false, holdReason: '',
    received: '', start: '', finish: '', ref1: 'N/A', ref1Pract: '', ref2: 'N/A', ref2Pract: '',
    mva: 'No', icbc: '', memo: '', sub: '0', claimNote: '', mspNote: '',
    oopDob: '', oopSex: '', addr1: '', addr2: '', addr3: '', addr4: '', postal: '',
    wcbNo: '', injury: '', facility: '00000', subFacility: '00000', payPatient: false,
    status: 'Incomplete', state: 'new', created: '',
  }
}

/** A row picked in a Prompt list, loaded into the window (303601: "Once a
    claim is selected, the information will automatically populate the MOIS
    Unsent Claims screen"). */
export function claimFromRow(row: UnsentClaim): ClaimForm {
  /* a claim Save stored whole reloads as it was, under the list's current
     values (the Claim Review Wizard may have changed provider or fee since) */
  if (row.form) {
    return {
      ...row.form,
      id: row.id, doctor: row.doctor, fee: row.fee, unit: row.billed,
      clarification: row.clar ?? row.form.clarification, location: row.location ?? row.form.location,
      facility: row.facility ?? row.form.facility, hold: row.hold,
      status: row.compl ? 'Complete' : 'Incomplete', state: 'picked',
    }
  }
  return {
    ...blankClaim(row.service, row.doctor),
    id: row.id,
    chart: row.chart, first: row.first, last: row.last,
    insuredBy: row.insrBy, insurance: row.insrNbr, dob: row.dob,
    fee: row.fee, unit: row.billed, diag1: row.diag ?? '780', mappedFrom: row.mappedFrom,
    clarification: row.clar ?? 'PG', location: row.location ?? 'A', facility: row.facility ?? '00000',
    hold: row.hold, status: row.compl ? 'Complete' : 'Incomplete',
    state: 'picked', created: `${row.service} 15:38 ADMINISTRATOR`,
  }
}

/** The claim the window opens on: the first row of the unsent list. */
export const initialClaim: ClaimForm = { ...claimFromRow(unsentClaims[0]!), fee: '13060', clarification: '', state: 'loaded' }

/** Session keys (host/screen-windows `useSessionState`). */
export const UNSENT_CLAIM_KEY = 'billing:unsent-claim'
export const UNSENT_ADDED_KEY = 'billing:unsent-added'

/* ============================================================================
   MSP explanatory codes — what Sent Claim Detail (Action ▸ Detail Expl Code,
   Ctrl+E) prints beside a claim's E1–E3.

   The full list is MSP's own (303602 links the provincial page); the manual
   captures print three, and only those are carried here, verbatim:
     K4  `810550956f…` (3786544 "How to View the MSP Explanatory Code")
     RE, P9  `fa942311f4…` (2257761, a failed enrollment claim)
   ========================================================================= */
export const MSP_EXPLANATORY_CODES: Record<string, string> = {
  K4: 'PLEASE REFER TO THE PROTOCOL FOR THIS FEE ITEM',
  RE: 'ENCOUNTER RECEIVED',
  P9: 'REGISTRATION NOT ELIGIBLE FOR PCO SITE',
}

/** Session key: the sent claim a Prompt - Recon / Prompt - Chart pick loaded
    into the Sent To MSP window (host/screen-windows `useSessionState`). */
export const SENT_CLAIM_KEY = 'billing:sent-claim'
/** the chart Prompt Sent for Chart / Prompt Sent to MSP lists claims for:
    the opening view's claim's chart (screens/ClaimPromptDialog.tsx) */
export const CHART_PROMPT_KEY = 'billing:chart-prompt'

/** The explanatory codes on a sent claim, in E1, E2, E3 order. */
export const explanatoryCodes = (c: SentClaim | null | undefined): string[] =>
  c ? [c.e1, c.e2, c.e3].filter((code) => code.trim()) : []

/** The chart, insurance number and birth date the sent lists do not carry,
    from the same patient's row on the unsent list. */
export const sentClaimPatient = (c: SentClaim): UnsentClaim | undefined =>
  unsentClaims.find((u) => u.last === c.last && u.first === c.first)
