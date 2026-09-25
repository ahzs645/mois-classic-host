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

export type UnsentClaim = {
  chart: string
  last: string; first: string; service: string; doctor: string; fee: string
  dob: string; insrBy: string; insrNbr: string; billed: string
  compl: boolean; hold: boolean; sub: string
}

export const unsentClaims: UnsentClaim[] = [
  { chart: '10035', last: 'BROWN', first: 'FARMER', service: '2026.03.18', doctor: 'BEARDWOOD, WALTER', fee: '13060', dob: '1990.10.23', insrBy: 'BC', insrNbr: '9151259051', billed: '71.50', compl: true, hold: false, sub: 'R' },
  { chart: '10012', last: 'ADAM', first: 'GEORGE', service: '2026.03.18', doctor: 'BEARDWOOD, WALTER', fee: '00100', dob: '1978.02.04', insrBy: 'BC', insrNbr: '9151251882', billed: '33.05', compl: true, hold: false, sub: 'R' },
  { chart: '10041', last: 'HALE', first: 'MARGARET', service: '2026.03.18', doctor: 'SHEWCHUK, LEAH', fee: '00120', dob: '1955.07.19', insrBy: 'BC', insrNbr: '9151253340', billed: '46.20', compl: true, hold: true, sub: 'R' },
  { chart: '10057', last: 'RAO', first: 'PRIYA', service: '2026.03.17', doctor: 'HOWSER, DOOGIE', fee: '00101', dob: '1984.12.02', insrBy: 'BC', insrNbr: '9151257712', billed: '52.80', compl: true, hold: false, sub: 'R' },
  { chart: '10063', last: 'OKONKWO', first: 'SAM', service: '2026.03.17', doctor: 'BEARDWOOD, WALTER', fee: '14070', dob: '1969.05.28', insrBy: 'BC', insrNbr: '', billed: '125.00', compl: false, hold: false, sub: 'R' },
  { chart: '10078', last: 'FONTAINE', first: 'DALE', service: '2026.03.16', doctor: 'FAIRCHILD, NESRIN L', fee: '13005', dob: '2001.09.11', insrBy: 'BC', insrNbr: '9151258003', billed: '18.40', compl: true, hold: false, sub: 'R' },
  { chart: '10084', last: 'CASTILLO', first: 'JUNE', service: '2026.03.16', doctor: 'DUCHARME, AMARILYS', fee: '00110', dob: '1947.01.30', insrBy: 'BC', insrNbr: '9151250264', billed: '39.95', compl: true, hold: false, sub: 'R' },
]

export type SentClaim = {
  service: string; diag: string; fee: string; ins: string
  billed: string; paid: string; doctor: string; sent: string
  r1: string; r2: string; wo: string; e1: string; e2: string; e3: string
  ref: string; pract: string; last: string; first: string; m: string; payee: string
}

/* Paid prints a zero as a lone "-", the way `f2fa600c` does on its refused
   and held rows.

   E1–E3 carry only codes whose meaning the manual prints (MSP_EXPLANATORY_
   CODES below), so the Sent Claim Detail window (Ctrl+E) never shows a code
   with an invented description. */
export const sentClaims: SentClaim[] = [
  { service: '2026.02.11', diag: '780', fee: '13060', ins: 'BC', billed: '71.50', paid: '71.50', doctor: 'BEARDWOOD, WALTER', sent: '2026.02.12', r1: '', r2: 'P', wo: 'N', e1: '', e2: '', e3: '', ref: 'X', pract: '12345', last: 'BROWN', first: 'FARMER', m: '', payee: '00001' },
  { service: '2026.02.11', diag: '401', fee: '00100', ins: 'BC', billed: '33.05', paid: '33.05', doctor: 'BEARDWOOD, WALTER', sent: '2026.02.12', r1: '', r2: 'P', wo: 'N', e1: '', e2: '', e3: '', ref: 'X', pract: '12345', last: 'ADAM', first: 'GEORGE', m: '', payee: '00001' },
  { service: '2026.02.04', diag: '250', fee: '14050', ins: 'BC', billed: '98.60', paid: '-', doctor: 'SHEWCHUK, LEAH', sent: '2026.02.05', r1: '', r2: 'R', wo: 'N', e1: 'K4', e2: '', e3: '', ref: 'X', pract: '22781', last: 'HALE', first: 'MARGARET', m: '', payee: '00001' },
  { service: '2026.01.28', diag: '300', fee: '00120', ins: 'BC', billed: '46.20', paid: '41.58', doctor: 'HOWSER, DOOGIE', sent: '2026.01.29', r1: 'A', r2: 'X', wo: 'N', e1: 'K4', e2: '', e3: '', ref: 'T', pract: '30117', last: 'RAO', first: 'PRIYA', m: '', payee: '00001' },
  { service: '2026.01.21', diag: '724', fee: '00101', ins: 'BC', billed: '52.80', paid: '-', doctor: 'BEARDWOOD, WALTER', sent: '2026.01.22', r1: '', r2: 'U', wo: 'N', e1: '', e2: '', e3: '', ref: 'X', pract: '12345', last: 'OKONKWO', first: 'SAM', m: '', payee: '00001' },
  { service: '2026.01.14', diag: '466', fee: '00110', ins: 'BC', billed: '39.95', paid: '39.95', doctor: 'FAIRCHILD, NESRIN L', sent: '2026.01.15', r1: 'R', r2: 'P', wo: 'N', e1: '', e2: '', e3: '', ref: 'X', pract: '41903', last: 'FONTAINE', first: 'DALE', m: '', payee: '00001' },
  { service: '2026.01.07', diag: '780', fee: '00100', ins: 'BC', billed: '33.05', paid: '-', doctor: 'SHEWCHUK, LEAH', sent: '2026.01.08', r1: 'R', r2: 'F', wo: 'N', e1: 'P9', e2: '', e3: '', ref: 'X', pract: '22781', last: 'CASTILLO', first: 'JUNE', m: '', payee: '00001' },
]

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
  hold: boolean
  holdReason: string
  /** what Save decided; a claim that has never been saved reads Incomplete */
  status: 'Complete' | 'Incomplete'
  /** the window's own record state, reported to the frame as `host.screen.claim` */
  state: 'loaded' | 'new' | 'picked' | 'saved'
  created: string
}

export const DOCTORS = ['BEARDWOOD, WALTER', 'SHEWCHUK, LEAH', 'HOWSER, DOOGIE', 'FAIRCHILD, NESRIN L', 'DUCHARME, AMARILYS']

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
    status: 'Incomplete', state: 'new', created: '',
  }
}

/** A row picked in a Prompt list, loaded into the window (303601: "Once a
    claim is selected, the information will automatically populate the MOIS
    Unsent Claims screen"). */
export function claimFromRow(row: UnsentClaim): ClaimForm {
  return {
    ...blankClaim(row.service, row.doctor),
    chart: row.chart, first: row.first, last: row.last,
    insuredBy: row.insrBy, insurance: row.insrNbr, dob: row.dob,
    fee: row.fee, unit: row.billed, diag1: '780',
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

/** The explanatory codes on a sent claim, in E1, E2, E3 order. */
export const explanatoryCodes = (c: SentClaim | null | undefined): string[] =>
  c ? [c.e1, c.e2, c.e3].filter((code) => code.trim()) : []

/** The chart, insurance number and birth date the sent lists do not carry,
    from the same patient's row on the unsent list. */
export const sentClaimPatient = (c: SentClaim): UnsentClaim | undefined =>
  unsentClaims.find((u) => u.last === c.last && u.first === c.first)
