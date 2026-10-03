import { useCallback, useMemo } from 'react'
import { useSessionState } from '../host/screen-windows'
import { clinicListSpec, clinicRowsKey, type ClinicRow } from './clinicManagement'
import {
  sentClaims, unsentClaims, type ClaimForm, type SentClaim, type UnsentClaim,
} from './claims'
import { MSP_LOCATION_ROWS } from './mspLocations'
import { SERVICE_CODE_WINDOW } from './adminLists'
import { MOIS_TODAY, type Patient } from './patients'
import { dayRows, stampOf, useSchedulerStore, type SchedulerState } from './schedulerStore'
import { SYSTEM_SETTINGS_KEY } from './systemSettings'

/* ============================================================================
   What the learner has done to Billing this session: the live lists behind
   Unsent Claims, Sent Claims and Invoices.

   The captured screens (screens/BillingViews.tsx, ClaimPromptDialog.tsx)
   read their training rows from data/claims.ts. Everything a Billing window
   *does* to those rows lives here, in the frame's session store
   (host/screen-windows `useSessionState`), because the windows that change a
   list are rarely the list: the Claim Review Wizard edits and deletes unsent
   claims, the Bulk Claim Creation Wizard and Resubmit / Debit Claim add them,
   the Toggle items on Sent Claims' Action menu mark sent ones, and a claim
   billed off the day book (Ctrl+B) has to be waiting in Unsent Claims.

   PROVENANCE:
     303601 (Unsent Claims) — the claim list, Delete Claim, the Claim Review
       and Bulk Claim Creation wizards;
     303602 / 3786544 (Sent Claims, Billing How To's) — R1 / R2 / WO, Mark
       for Delete (R1 = D), Write Off (WO = Y), Resubmit (R1 = R), Debit,
       the adjustment codes and the remittance history;
     2069402 (Multiple Code Sets) — the SNOMED-CT → ICD-9 swap and the
       Associated Mappings rows, `189d341d` (ICD-9 42682 LONG QT SYNDROME);
     3295094 (Default Billing Location) — one provider default, set from the
       day book's MSP Loc or the Provider window's Billing tab; the location
       list is `4eb31491` / `707d1e64` (Code | Description, sixteen rows);
     303603 (Invoices) — invoices, payors, transactions, the tax rates.

   Every value is synthetic training data. Keys are prefixed `billing:`.
   ========================================================================= */

/* --- MSP location codes: data/mspLocations.ts (shared with the Provider
   window's Billing tab). */
export { MSP_LOCATION_ROWS } from './mspLocations'

export const mspLocationText = (code: string) => MSP_LOCATION_ROWS.find((r) => r.code === code)?.desc ?? ''

/** The hospital locations — a claim there may run to a Service To Date. */
export const HOSPITAL_LOCATIONS = ['E', 'G', 'I', 'P']

/* --- Multiple Code Sets ------------------------------------------------------
   "When using alternate Code Systems, such as SNOMED-CT, for coding Health
   Issues, MOIS will automatically map your SNOMED-CT code to an ICD-9
   equivalent for billing purposes" (2069402). The Associated Mappings grid
   in `189d341d`, row for row. */
export type CodeMapping = { from: string; fromCode: string; fromTerm: string; to: string; toCode: string; toTerm: string; active: boolean }

export const CODE_MAPPINGS: CodeMapping[] = [
  { from: 'ICD-9', fromCode: '42682', fromTerm: 'LONG QT SYNDROME', to: 'SNOMED-CT', toCode: '422348008', toTerm: 'ANDERSEN TAWIL SYNDROME', active: true },
  { from: 'ICD-9', fromCode: '42682', fromTerm: 'LONG QT SYNDROME', to: 'SNOMED-CT', toCode: '442917000', toTerm: 'CONGENITAL LONG QT SYNDROME', active: true },
  { from: 'SNOMED-CT', fromCode: '111975006', fromTerm: 'PROLONGED QT INTERVAL', to: 'ICD-9', toCode: '42682', toTerm: 'LONG QT SYNDROME', active: true },
  { from: 'SNOMED-CT', fromCode: '422348008', fromTerm: 'ANDERSEN TAWIL SYNDROME', to: 'ICD-9', toCode: '42682', toTerm: 'LONG QT SYNDROME', active: true },
  { from: 'SNOMED-CT', fromCode: '442917000', fromTerm: 'CONGENITAL LONG QT SYNDROME', to: 'ICD-9', toCode: '42682', toTerm: 'LONG QT SYNDROME', active: true },
]

/** The ICD-9 code a claim bills for a diagnosis, and the SNOMED-CT code it
    was mapped from (none when the code was ICD-9 to begin with). */
export function billingDiagnosis(code: string): { diag: string; mappedFrom?: string } {
  const m = CODE_MAPPINGS.find((r) => r.active && r.from === 'SNOMED-CT' && r.to === 'ICD-9' && r.fromCode === code.trim())
  return m ? { diag: m.toCode, mappedFrom: m.fromCode } : { diag: code.trim() }
}

/* --- time-dependent fee items ------------------------------------------------
   INFERRED: 303601's "How To Bill Claims with a Time Dependency" is only a
   link in the archive. Its field descriptions say Time(s) Received applies
   to out-of-office billing ("When the physician received a call") and
   Start / Finish to "some specific Fee Codes". The out-of-office call-out
   charges need the time the call came in; the continuing-care surcharges
   need the start and finish. Save treats them so. */
export const CALL_OUT_FEES = ['01200', '01201', '01202']
export const CONTINUING_CARE_FEES = ['01205', '01206', '01207']

/** Fee items the claim's Fee Item "…" offers besides the Master Service Code
    List: the time-dependent ones, and the codes the captures bill. INFERRED
    descriptions and amounts (training values, not an MSP schedule).

    `diag` is the fee code's Default Health Condition from the Service Code
    prompt list (Administration ▸ Prompt Lists ▸ Service Code): "when a fee
    code is entered, the diagnostic code is automatically populated"
    (303219). CONFIRM-CURRENT: 14540 → V2510 is the record of
    `3eb6a249` (data/adminLists SERVICE_CODE_WINDOW) and the claim of
    `45defc38` (v02.2x, an Unsent MSP claim billing 14540 with Diag Code 1
    V2510 filled in). */
export const CLAIM_FEE_ROWS: { code: string; desc: string; fee: string; time?: 'received' | 'start-finish'; diag?: string }[] = [
  { code: '00100', desc: 'VISIT IN OFFICE (AGE 2 - 59)', fee: '29.97' },
  { code: '00101', desc: 'HOME VISIT', fee: '52.80' },
  { code: '00109', desc: 'SUBSEQUENT HOSPITAL VISIT', fee: '31.26' },
  { code: '00110', desc: 'OFFICE CONSULTATION', fee: '39.95' },
  { code: '00120', desc: 'COUNSELLING - INDIVIDUAL', fee: '46.20' },
  { code: '01200', desc: 'CALL-OUT CHARGE - EVENING', fee: '63.38', time: 'received' },
  { code: '01201', desc: 'CALL-OUT CHARGE - NIGHT', fee: '79.22', time: 'received' },
  { code: '01202', desc: 'CALL-OUT CHARGE - WEEKEND/HOLIDAY', fee: '63.38', time: 'received' },
  { code: '01205', desc: 'CONTINUING CARE SURCHARGE - EVENING', fee: '33.60', time: 'start-finish' },
  { code: '01206', desc: 'CONTINUING CARE SURCHARGE - NIGHT', fee: '42.00', time: 'start-finish' },
  { code: '01207', desc: 'CONTINUING CARE SURCHARGE - WEEKEND/HOLIDAY', fee: '33.60', time: 'start-finish' },
  { code: '13060', desc: 'CHRONIC DISEASE MANAGEMENT', fee: '71.50' },
  { code: '14033', desc: 'ANNUAL COMPLEX CARE MANAGEMENT FEE', fee: '315.00' },
  { code: '14070', desc: 'GP ATTACHMENT PARTICIPATION', fee: '125.00' },
  { code: '14091', desc: 'OFFICE VISIT FOR MSP-INSURED NEWBORN', fee: '27.90' },
  { code: SERVICE_CODE_WINDOW.code, desc: SERVICE_CODE_WINDOW.description, fee: SERVICE_CODE_WINDOW.amounts[0][1], diag: SERVICE_CODE_WINDOW.defaultHealthCondition },
  { code: '15130', desc: 'URINALYSIS - SCREENING', fee: '4.97' },
  { code: '16100', desc: 'OFFICE VISIT (AGE 60 - 69)', fee: '35.55' },
  { code: '98000', desc: 'PANEL REPORT - LFP', fee: '0.00' },
]

export const claimFee = (code: string) => CLAIM_FEE_ROWS.find((r) => r.code === code.trim())

/** Global ▸ Service Code Option 1 / 2 (F11 / F12), from System Settings
    (3295094 `3107ae20`: 14033 ANNUAL COMPLEX CARE MANAGEMENT FEE, 15130
    URINALYSIS - SCREENING). */
export const FEE_OPTION_1 = '14033'
export const FEE_OPTION_2 = '15130'

/* ============================================================================
   Unsent claims.
   ========================================================================= */

type UnsentState = {
  /** claims made this session (Save, Bulk Claims, Resubmit, Debit, Duplicate) */
  added: UnsentClaim[]
  /** changes to any claim by id (the Claim Review Wizard, a re-save) */
  edits: Record<string, Partial<UnsentClaim>>
  /** ids removed (Delete Claim, the wizard's Delete Claims) */
  deleted: string[]
  /** how many a session has made, for ids */
  serial: number
}

export const UNSENT_STATE_KEY = 'billing:unsent'
const EMPTY_UNSENT: UnsentState = { added: [], edits: {}, deleted: [], serial: 0 }

/** Per-provider facility and payee numbers the wizard lists show. */
const PAYEE: Record<string, string> = {
  'BEARDWOOD, WALTER': '40881', 'SHEWCHUK, LEAH': '33120', 'HOWSER, DOOGIE': '54321',
  'FAIRCHILD, NESRIN L': '54321', 'DUCHARME, AMARILYS': '54321',
}
export const payeeOf = (doctor: string) => PAYEE[doctor] ?? '54321'

const TRAINING_UNSENT: UnsentClaim[] = unsentClaims.map((c) => ({
  clar: 'PG', location: 'A', facility: '00000', diag: '780', payee: payeeOf(c.doctor), origin: 'training' as const, ...c,
}))

/** A claim billed off the day book (MSP Bill / Ctrl+B / Ctrl+I): the row's
    patient, the day, fee 00100 (what the day book prints once billed), and
    its Health Issue mapped to ICD-9. */
function daybookClaims(s: SchedulerState, roster: Patient[]): UnsentClaim[] {
  const out: UnsentClaim[] = []
  for (const key of Object.keys(s.billed)) {
    const added = s.added.find((x) => x.key === key)
    const [provider, off] = added ? [added.provider, String(added.offset)] : key.split('|')
    if (!provider || off === undefined) continue
    const offset = Number(off)
    const row = dayRows(s, provider, offset).find((r) => r.key === key)
    if (!row) continue
    const p = roster.find((r) => r.chart === row.chart)
    const { diag, mappedFrom } = billingDiagnosis(row.issue || '')
    out.push({
      id: `d:${key}`, chart: row.chart, last: row.last, first: row.first, service: stampOf(offset), doctor: provider,
      fee: '00100', dob: p?.dob ?? '', insrBy: p?.insuranceBy || 'BC', insrNbr: p?.insurance ?? '', billed: '29.97',
      compl: Boolean(diag && row.chart), hold: false, sub: 'R', clar: 'PG', location: 'A', facility: '00000',
      diag, mappedFrom, payee: payeeOf(provider), origin: 'daybook',
    })
  }
  return out
}

export type UnsentStore = {
  /** the list every Unsent lookup and the Claim Review Wizard read */
  rows: UnsentClaim[]
  add: (rows: UnsentClaim[]) => string[]
  update: (ids: string[], patch: Partial<UnsentClaim> | ((row: UnsentClaim) => Partial<UnsentClaim>)) => void
  remove: (ids: string[]) => void
  deletedCount: number
}

export function useUnsentClaims(roster: Patient[] = []): UnsentStore {
  const [state, setState] = useSessionState<UnsentState>(UNSENT_STATE_KEY, EMPTY_UNSENT)
  const sched = useSchedulerStore()
  const rows = useMemo(() => {
    const all = [...TRAINING_UNSENT, ...daybookClaims(sched, roster), ...state.added]
    return all
      .filter((r) => !state.deleted.includes(r.id ?? ''))
      .map((r) => ({ ...r, ...(state.edits[r.id ?? ''] ?? {}) }))
  }, [roster, sched, state])

  const add = useCallback((next: UnsentClaim[]) => {
    const ids: string[] = []
    setState((prev) => {
      let serial = prev.serial
      const made = next.map((r) => { serial += 1; const id = `n${serial}`; ids.push(id); return { ...r, id } })
      return { ...prev, serial, added: [...prev.added, ...made] }
    })
    return ids
  }, [setState])

  const update = useCallback<UnsentStore['update']>((ids, patch) => {
    setState((prev) => {
      const edits = { ...prev.edits }
      const live = [...TRAINING_UNSENT, ...prev.added]
      for (const id of ids) {
        const row = live.find((r) => r.id === id) ?? ({ id } as UnsentClaim)
        const p = typeof patch === 'function' ? patch({ ...row, ...(edits[id] ?? {}) }) : patch
        edits[id] = { ...(edits[id] ?? {}), ...p }
      }
      return { ...prev, edits }
    })
  }, [setState])

  const remove = useCallback((ids: string[]) => {
    setState((prev) => ({ ...prev, deleted: [...prev.deleted, ...ids.filter((id) => !prev.deleted.includes(id))] }))
  }, [setState])

  return { rows, add, update, remove, deletedCount: state.deleted.length }
}

/** The list row a claim window saves as. */
export function rowFromForm(c: ClaimForm, status: 'Complete' | 'Incomplete'): UnsentClaim {
  return {
    chart: c.chart, last: c.last, first: c.first, service: c.serviceDate, doctor: c.doctor, fee: c.fee,
    dob: c.dob, insrBy: c.insuredBy, insrNbr: c.insurance, billed: c.unit,
    compl: status === 'Complete', hold: c.hold, sub: 'R',
    clar: c.clarification, location: c.location, facility: c.facility ?? '00000', diag: c.diag1,
    mappedFrom: c.mappedFrom, payee: payeeOf(c.doctor), origin: 'saved',
    form: { ...c, status },
  }
}

/* ============================================================================
   Sent claims: the Action menu's toggles, Resubmit / Debit, and what MSP
   sent back for each (remittance history, adjustments).
   ========================================================================= */

export type SentEdit = Partial<Pick<SentClaim, 'r1' | 'r2' | 'wo'>> & {
  /** the day Toggle - Write Off set WO to Y (303602 "if it has been written
      off, the date it was written off") */
  woDate?: string
  /** Toggle - Private Claim Flag */
  privateFlag?: boolean
  /** Toggle - Approve / Adjust */
  approved?: boolean
  /** Debit Claim was run on it */
  debited?: boolean
  /** an office note the Sent Claims Claim Review Wizard filed on it */
  note?: string
}

export const SENT_STATE_KEY = 'billing:sent'

export type SentStore = {
  rows: SentClaim[]
  edit: (id: string) => SentEdit
  patch: (ids: string[], patch: SentEdit | ((row: SentClaim, edit: SentEdit) => SentEdit)) => void
}

export function useSentClaims(): SentStore {
  const [edits, setEdits] = useSessionState<Record<string, SentEdit>>(SENT_STATE_KEY, {})
  const rows = useMemo(() => sentClaims.map((c) => {
    const e = edits[c.id]
    return e ? { ...c, r1: e.r1 ?? c.r1, r2: e.r2 ?? c.r2, wo: e.wo ?? c.wo } : c
  }), [edits])
  const patch = useCallback<SentStore['patch']>((ids, p) => {
    setEdits((prev) => {
      const next = { ...prev }
      for (const id of ids) {
        const base = sentClaims.find((c) => c.id === id)
        if (!base) continue
        const cur = next[id] ?? {}
        const live = { ...base, r1: cur.r1 ?? base.r1, r2: cur.r2 ?? base.r2, wo: cur.wo ?? base.wo }
        next[id] = { ...cur, ...(typeof p === 'function' ? p(live, cur) : p) }
      }
      return next
    })
  }, [setEdits])
  return { rows, edit: (id) => edits[id] ?? {}, patch }
}

/** The Sequence No. MSP gave each sent claim. */
export const sequenceOf = (c: SentClaim) => String(182760 + Number(c.id.slice(1)))

/** A sent claim carried back into Unsent Claims (Resubmit, Debit, Duplicate). */
export function unsentFromSent(c: SentClaim, patient: UnsentClaim | undefined, origin: 'resubmit' | 'debit' | 'duplicate'): UnsentClaim {
  const debit = origin === 'debit'
  return {
    chart: patient?.chart ?? '', last: c.last, first: c.first, service: c.service, doctor: c.doctor, fee: c.fee,
    dob: patient?.dob ?? '', insrBy: c.ins, insrNbr: patient?.insrNbr ?? '',
    billed: debit ? `-${c.billed}` : c.billed,
    compl: origin !== 'duplicate', hold: origin === 'duplicate',
    /* MSP's submission codes: a debit goes out as a D, a resubmission as an R
       (303601 "Sub: Submission Code for the claim") */
    sub: debit ? 'D' : 'R',
    clar: 'PG', location: 'A', facility: '00000', diag: c.diag, payee: c.payee, origin,
  }
}

/* --- adjustments -------------------------------------------------------------
   303602 "Adjustment Codes": "When MSP makes an adjustment on the paid amount
   of a claim, an adjustment code is assigned … For example you might see 39
   in front of the row meaning RRP (Rural Retention Program)." The list is
   the Teleplan specification's P14 table (`5926d083`, `58c0d926`); only the
   codes the training claims carry, plus the article's own 39, are kept. */
export const ADJUSTMENT_CODES: Record<string, string> = {
  '01': 'Northern Allowance',
  '02': 'Pro-ration',
  '05': 'MSP Deduction',
  '32': 'Discount',
  '35': 'Fee Item Pro-ration',
  '37': 'Emergency Medicine',
  '38': 'RRP - Rural Retention Premium',
  '39': 'RRP (Rural Retention Program)',
  '80': 'Retro Payment',
  '88': 'Reciprocal Payment',
}

export type Adjustment = { code: string; amount: number }

/** What MSP adjusted on each training claim: ADAM's rural retention bump,
    RAO's pro-rated counselling fee. */
const ADJUSTMENTS: Record<string, Adjustment[]> = {
  s2: [{ code: '39', amount: 4.17 }],
  s4: [{ code: '35', amount: -4.62 }],
}

export const adjustmentsOf = (c: SentClaim): Adjustment[] => ADJUSTMENTS[c.id] ?? []

const num = (v: string) => (v === '-' || !v.trim() ? 0 : Number(v))

/** Gross (before adjustments) and net payment. */
export function paymentOf(c: SentClaim): { gross: number; adjust: number; net: number } {
  const net = num(c.paid)
  const adjust = adjustmentsOf(c).reduce((s, a) => s + a.amount, 0)
  return { gross: +(net - adjust).toFixed(2), adjust: +adjust.toFixed(2), net }
}

/** The remittance lines MSP sent for a claim, oldest first: nothing for an
    unacknowledged claim, one line otherwise, and a second when a claim that
    was refused was later paid on resubmission. INFERRED dates (two weeks
    after sending — the Teleplan cycle). */
export type RemittanceLine = { paid: string; payee: string; seq: string; net: string; code: string; e1: string; e2: string; e3: string; adj: string }

export function remittanceOf(c: SentClaim): RemittanceLine[] {
  if (c.r2 === 'U' || c.r2 === 'H') return []
  const { net } = paymentOf(c)
  const adj = adjustmentsOf(c)[0]?.code ?? ''
  return [{
    paid: plusDays(c.sent, 14), payee: c.payee, seq: sequenceOf(c), net: net ? net.toFixed(2) : '0.00',
    code: c.r2, e1: c.e1, e2: c.e2, e3: c.e3, adj,
  }]
}

export function plusDays(stamp: string, days: number): string {
  const [y, m, d] = stamp.split('.').map(Number) as [number, number, number]
  if (!y) return ''
  const t = new Date(Date.UTC(y, m - 1, d + days))
  const two = (n: number) => String(n).padStart(2, '0')
  return `${t.getUTCFullYear()}.${two(t.getUTCMonth() + 1)}.${two(t.getUTCDate())}`
}

/* ============================================================================
   Default billing location (3295094).

   ONE store for both routes: the Provider List's own rows (the session key
   the Provider window saves into, data/clinicManagement `clinicRowsKey`),
   field `mspLocation`. So a location picked in the day book's MSP Loc. and
   saved shows in Provider ▸ Billing ▸ MSP Location, and the reverse; and a
   new claim in Unsent MSP opens on it. A day-book provider who is not on
   the Provider List (TECHNICAL SUPPORT, the desktop login) keeps its default
   beside the list instead. With none set, the clinic's System Settings ▸
   Global ▸ Default Location applies (`3107ae20`, "Used in Unsent to MSP
   Records").
   ========================================================================= */

const PROVIDER_NODE = 'ad-provider-list'
const OTHER_DEFAULTS_KEY = 'billing:default-location'

/** System Settings' Default Location, as Save last committed it. */
export function useClinicDefaultLocation(): string {
  const [committed] = useSessionState<Record<string, string>>(SYSTEM_SETTINGS_KEY, {})
  return committed['default-location'] ?? 'A'
}

export function useDefaultLocation(provider: string): [string, (code: string) => void] {
  const base = clinicListSpec(PROVIDER_NODE)?.rows ?? []
  const [stored, setStored] = useSessionState<ClinicRow[] | null>(clinicRowsKey(PROVIDER_NODE), null)
  const [others, setOthers] = useSessionState<Record<string, string>>(OTHER_DEFAULTS_KEY, {})
  const rows = stored ?? base
  const row = rows.find((r) => String(r.name ?? '') === provider)
  const value = row ? String(row.mspLocation ?? '') : (others[provider] ?? '')
  const set = useCallback((code: string) => {
    if (row) setStored((prev) => (prev ?? base).map((r) => (String(r.name ?? '') === provider ? { ...r, mspLocation: code } : r)))
    else setOthers((prev) => ({ ...prev, [provider]: code }))
  }, [base, provider, row, setOthers, setStored])
  return [value, set]
}

/* ============================================================================
   Invoices (303603).
   ========================================================================= */

export type InvoiceTrans = {
  id: string
  date: string
  /** B - Bill, P - Payment, A - Adjustment (303603 "Tran Code") */
  tran: 'B' | 'P' | 'A'
  serv: string
  fee: string
  unit: string
  diag: string
  method: string
  paid: string
  adj: string
  adjAmt: string
  /** Transaction Note's comment box */
  note?: string
}

export type Invoice = {
  no: string
  chart: string
  patient: string
  provider: string
  payor: string
  recon: string
  billDate: string
  claimNo: string
  code: string
  taxable: boolean
  /** GST and PST, as fractions (Change Tax Rates) */
  gst: number
  pst: number
  due: string
  comment: string
  message: string
  trans: InvoiceTrans[]
  /** W/O Balance (Ctrl+W) — what was written off; Write Off reads Y after */
  writtenOff: number
  created: string
}

/** A third-party payor (Add Payor / Edit Payor; Administration ▸ Selection
    List). The Detail block is what a Label prints (303603 "Information in
    the Detail section of the Payor information will print"). */
export type Payor = { code: string; name: string; detail: string[] }

export const TRAINING_PAYORS: Payor[] = [
  { code: 'SELF PAY', name: 'SELF PAY', detail: [] },
  { code: 'RCMP', name: 'RCMP', detail: ['RCMP "E" DIVISION', 'HEALTH SERVICES', '14200 GREEN TIMBERS WAY', 'SURREY BC  V3T 6P3'] },
  { code: 'WCB', name: 'WORKSAFEBC', detail: ['WORKSAFEBC', 'PO BOX 9600 STN TERMINAL', 'VANCOUVER BC  V6B 5J5'] },
  { code: 'ICBC', name: 'ICBC', detail: ['ICBC CLAIMS', '151 WEST ESPLANADE', 'NORTH VANCOUVER BC  V7M 3H9'] },
]

export const INVOICE_CODES = ['Standard', 'Third Party', 'Forms', 'Driver Medical']

/** The invoice the Invoice window opens on (the one pay-an-invoice-in-mois
    pays): chart 75, one 13060 bill. */
export const TRAINING_INVOICE: Invoice = {
  no: '1042', chart: '75', patient: 'BETTY BOOP', provider: 'BEARDWOOD, WALTER', payor: 'SELF PAY', recon: 'U',
  billDate: '2026.03.18', claimNo: '', code: 'Standard', taxable: false, gst: 0.05, pst: 0.07, due: '2026.04.17',
  comment: '', message: '', created: '2026.03.18 16:08 ADMINISTRATOR', writtenOff: 0,
  trans: [{ id: 't1', date: '2026.03.18', tran: 'B', serv: '1', fee: '13060', unit: '71.50', diag: '780', method: '', paid: '', adj: '', adjAmt: '' }],
}

export type InvoiceState = {
  invoices: Invoice[]
  /** the invoice on screen, by number */
  current: string
  payors: Payor[]
  serial: number
}

export const INVOICE_STATE_KEY = 'billing:invoices'
const EMPTY_INVOICES: InvoiceState = { invoices: [TRAINING_INVOICE], current: TRAINING_INVOICE.no, payors: TRAINING_PAYORS, serial: 1042 }

export function useInvoices() {
  const [state, setState] = useSessionState<InvoiceState>(INVOICE_STATE_KEY, EMPTY_INVOICES)
  const current = state.invoices.find((i) => i.no === state.current) ?? state.invoices[0]!
  const patchCurrent = useCallback((patch: Partial<Invoice> | ((inv: Invoice) => Partial<Invoice>)) => {
    setState((prev) => ({
      ...prev,
      invoices: prev.invoices.map((i) => (i.no === prev.current ? { ...i, ...(typeof patch === 'function' ? patch(i) : patch) } : i)),
    }))
  }, [setState])
  return { state, setState, current, patchCurrent }
}

/** GST / PST as System Settings ▸ Global holds them (3295094 `3107ae20`:
    GST 0.05, PST 0.07), after any Save there. */
export function useClinicTaxRates(): { gst: number; pst: number } {
  const [committed] = useSessionState<Record<string, string>>(SYSTEM_SETTINGS_KEY, {})
  const gst = Number(committed.gst ?? '0.05')
  const pst = Number(committed.pst ?? '0.07')
  return { gst: Number.isFinite(gst) ? gst : 0.05, pst: Number.isFinite(pst) ? pst : 0.07 }
}

/** Billed − Paid − Written Off − Adjustments = Balance / Owed (303603
    "Summary"), with tax on the billed lines when Apply Tax is ticked. */
export function invoiceTotals(inv: Invoice) {
  const sum = (tran: InvoiceTrans['tran'], key: 'unit' | 'paid' | 'adjAmt') => inv.trans
    .filter((t) => t.tran === tran)
    .reduce((s, t) => s + (Number(t[key]) || 0) * (key === 'unit' ? (Number(t.serv) || 1) : 1), 0)
  const net = sum('B', 'unit')
  const tax = inv.taxable ? net * (inv.gst + inv.pst) : 0
  const billed = +(net + tax).toFixed(2)
  const paid = +sum('P', 'paid').toFixed(2)
  const writtenOff = +(inv.writtenOff || 0).toFixed(2)
  const adjusted = +sum('A', 'adjAmt').toFixed(2)
  return { net, tax: +tax.toFixed(2), billed, paid, writtenOff, adjusted, owed: +(billed - paid - writtenOff - adjusted).toFixed(2) }
}

export const nextInvoiceStamp = () => `${MOIS_TODAY} 15:38 ADMINISTRATOR`

/** The invoice heading: the provider's letterhead from Provider List ▸
    Provider ▸ General (303603 "Adjust the Heading on the Invoice": "The
    Heading (aka letterhead) for invoices is pulled from the Provider List >
    Provider's details … for the Provider you have selected for the invoice.
    Note: it is not the desktop provider."). Read from the same session rows
    the Provider window saves, so an edited letterhead prints at once. With
    no letterhead lines, the provider's name and the clinic's address. */
export function useProviderLetterhead(provider: string): string[] {
  const base = clinicListSpec(PROVIDER_NODE)?.rows ?? []
  const [stored] = useSessionState<ClinicRow[] | null>(clinicRowsKey(PROVIDER_NODE), null)
  const row = (stored ?? base).find((r) => String(r.name ?? '') === provider)
  const lines = [1, 2, 3, 4, 5].map((n) => String(row?.[`letterhead${n}`] ?? '').trim()).filter(Boolean)
  if (lines.length) return lines
  const [last = '', first = ''] = provider.split(',').map((x) => x.trim())
  return [`DR. ${first} ${last}`.trim(), 'Halliwell Medical Clinic', '200 - 1110 6th Ave', 'Prince George, BC  V2L 3M6']
}
