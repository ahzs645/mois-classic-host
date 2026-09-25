/* ============================================================================
   One letter in progress: which kind it is, what was chosen on the way, and
   what the Letter Writer fills in from the chart.

   MOIS carries a letter's context from window to window: the Action item
   (Create Referral Note / Create Consult Note / Create Information Request)
   or the Care Plan's Distribute... fixes the document type, the template
   picked in Select Letter Template shapes the body, the Order it is linked to
   supplies the header, and Letter Setup's Selected counts decide which record
   tables follow the signature. The windows are separate components, so they
   share that context through this small store rather than through props
   threaded across the frame.

   Header and body are built from the OPEN chart (its export) and the linked
   Order, per the current-generation captures: 304687 `ec4925d6…` and
   `cc487e18…` (referral: salmon populators, the blue `<ENTER REPORT HERE>`
   record field, the section tables after the signature), 303589 `6cf209ce…`
   (the letterhead / recipient / Re: block), 2961349 `24dd02c9…`
   (INFORMATION REQUEST, `Service Event:`, `<Not Coded>`, LOINC X10916) and
   2070139 `5dc6ad4f…` (SHARED CARE PLAN, editable header, Type drop-down).
   ========================================================================= */
import { useSyncExternalStore } from 'react'
import type { MoisChartExport, MoisRecord } from './charts'
import type { ChartPatient } from './patient-context'
import { MOIS_TODAY } from './patients'
import { SESSION_USER } from './chartSession'

export type LetterDocId = 'referral' | 'consult' | 'information-request' | 'care-plan'

/** the Desktop For: provider the frame shows — MOIS's default Author */
export const DESKTOP_PROVIDER = 'TECHNICAL SUPPORT'

export type LetterFlowState = {
  doc: LetterDocId
  /** the template picked in Select Letter Template (or the Send window) */
  template: string
  /** the Order this letter is linked to (Link on Order Linking Service) */
  orderId: string | null
  /** Letter Setup's Selected count per section, at Continue */
  selected: Record<string, number>
  author: string
  recipient: string
  /** the Care Plan Snapshot's note, which a shared care plan carries */
  note: string
  /** set once Distribute (F2) has sent it */
  distributed: boolean
}

const initial = (): LetterFlowState => ({
  doc: 'referral', template: '', orderId: null, selected: {}, author: DESKTOP_PROVIDER,
  recipient: '', note: '', distributed: false,
})

let state: LetterFlowState = initial()
const listeners = new Set<() => void>()
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }

export const letterFlow = (): LetterFlowState => state
export function setLetterFlow(patch: Partial<LetterFlowState>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}
/** a new letter of this kind: everything chosen for the last one is dropped */
export function beginLetter(doc: LetterDocId = 'referral') {
  state = { ...initial(), doc, template: DEFAULT_TEMPLATE[doc] }
  listeners.forEach((l) => l())
}
export function useLetterFlow(): LetterFlowState {
  return useSyncExternalStore(subscribe, () => state, () => state)
}

/** the template each kind of letter preselects in the picker */
export const DEFAULT_TEMPLATE: Record<LetterDocId, string> = {
  referral: 'REFERRAL LETTER - GENERAL',
  consult: 'CONSULT NOTE - CARDIOLOGY',
  'information-request': 'INFORMATION REQUEST LETTER',
  'care-plan': '',
}

/** which LETTER_TEMPLATES `type` a document type is authored with */
export const TEMPLATE_TYPE: Record<LetterDocId, string> = {
  referral: 'REFERRAL',
  consult: 'CONSULTATION',
  'information-request': 'INFORMATION REQUEST',
  'care-plan': 'CARE PLAN',
}

/* ---- the linked Order ---------------------------------------------------- */

const newest = (a: MoisRecord, b: MoisRecord) => String(b.dtm_ord_date ?? '').localeCompare(String(a.dtm_ord_date ?? ''))

/** the chart's consultation orders a letter can be linked to, newest first */
export function consultOrders(data: MoisChartExport | null): MoisRecord[] {
  return [...(data?.order ?? [])].filter((r) => r.str_order_type === 'CONSULTATION').sort(newest)
}

/** the Order a letter describes: the one linked, else the newest referral
    that names who it is going to */
export function letterOrder(data: MoisChartExport | null, orderId: string | null): MoisRecord | undefined {
  const orders = consultOrders(data)
  return (orderId ? orders.find((r) => r.id_order === orderId) : undefined)
    ?? orders.find((r) => r.str_performed_by && r.str_code)
}

/* ---- the header --------------------------------------------------------- */

export type LetterHeader = {
  title: string
  left: { label: string; value: string }[]
  right: { label: string; value: string }[]
  loinc: string
  loincName: string
  date: string
  created: string
}

const codeOf = (r?: MoisRecord) => (r?.str_code ? `${r.str_code_system ? `${r.str_code_system}: ` : ''}${r.str_code}` : '')

export function letterHeader(doc: LetterDocId, data: MoisChartExport | null, flow: LetterFlowState): LetterHeader {
  const order = doc === 'information-request' || doc === 'care-plan' ? undefined : letterOrder(data, flow.orderId)
  const reason = order?.str_description ?? order?.str_code_term ?? ''
  const recipient = flow.recipient || order?.str_performed_by || ''
  const left = [
    { label: 'Attending:', value: order?.str_attending || DESKTOP_PROVIDER },
    { label: 'Author:', value: flow.author || DESKTOP_PROVIDER },
    { label: 'Responsible Org.:', value: order?.str_responsible_org ?? '' },
    { label: 'Primary Recipient:', value: recipient },
  ]
  const created = `${MOIS_TODAY} 10:05  ${SESSION_USER}`
  switch (doc) {
    case 'consult':
      return {
        title: `CONSULT NOTE${reason ? ` - ${reason}` : ''}`,
        left,
        right: [
          { label: 'Type:', value: 'CONSULTATION' }, { label: 'Code:', value: codeOf(order) },
          { label: 'Diagnosis:', value: reason }, { label: 'Copies To:', value: order?.str_copy_to ?? '' },
        ],
        loinc: 'LOINC 11488-4', loincName: '- Consult Note', date: MOIS_TODAY, created,
      }
    case 'information-request':
      return {
        title: 'INFORMATION REQUEST',
        left: left.map((f) => (f.label === 'Attending:' ? { ...f, value: DESKTOP_PROVIDER } : f)),
        right: [
          { label: 'Type:', value: 'INFORMATION REQUEST' }, { label: 'Code:', value: '<Not Coded>' },
          { label: 'Service Event:', value: '' }, { label: 'Copies To:', value: '' },
        ],
        loinc: 'LOINC X10916', loincName: '- Information Request', date: MOIS_TODAY, created,
      }
    case 'care-plan':
      return {
        title: 'SHARED CARE PLAN',
        left: left.map((f) => (f.label === 'Attending:' ? { ...f, value: DESKTOP_PROVIDER } : f)),
        right: [
          { label: 'Type:', value: 'SHARED CARE PLAN' }, { label: 'Note:', value: flow.note },
          { label: 'Diagnosis:', value: '' }, { label: 'Copies To:', value: '' },
        ],
        loinc: 'LOINC 80777-6', loincName: '- Shared Care Plan', date: MOIS_TODAY, created,
      }
    default:
      return {
        title: `REFERRAL NOTE${reason ? ` - ${reason}` : ''}`,
        left,
        right: [
          { label: 'Type:', value: 'REFERRAL' }, { label: 'Code:', value: codeOf(order) },
          { label: 'Diagnosis:', value: reason }, { label: 'Copies To:', value: order?.str_copy_to ?? '' },
        ],
        loinc: 'LOINC 57133-1', loincName: '- Referral Note', date: MOIS_TODAY, created,
      }
  }
}

/** 2070139: the Type drop-down on a care plan, the article's own list */
export const CARE_PLAN_TYPES = [
  'GERIATRIC PLAN OF CARE', 'GERIATRIC PLAN OF CARE NOTE', 'MENTAL HEALTH PLAN OF CARE',
  'MENTAL HEALTH PLAN OF CARE NOTE', 'ONCOLOGY PLAN OF CARE', 'ONCOLOGY PLAN OF CARE NOTE',
  'PALLIATIVE PLAN OF CARE', 'PALLIATIVE PLAN OF CARE NOTE', 'PLAN OF CARE', 'PLAN OF CARE NOTE',
  'SHARED CARE PLAN',
]

/* ---- the body ----------------------------------------------------------- */

/** `pop` salmon (populated, read-only), `order` blue (reads back to the Order) */
export type BodyRun = { t: 'plain' | 'pop' | 'order' | 'bold'; s: string }
export type BodyLine = { runs: BodyRun[]; gap?: number; big?: boolean }
export type BodyTable = { title: string; columns: string[]; rows: string[][] }

const P = (s: string): BodyRun => ({ t: 'plain', s })
const S = (s: string): BodyRun => ({ t: 'pop', s })
const B = (s: string): BodyRun => ({ t: 'bold', s })
const dash = (v?: string) => (v ?? '').split(' ')[0]!.replace(/[./]/g, '-')

export function letterBody(doc: LetterDocId, p: ChartPatient, header: LetterHeader): BodyLine[] {
  const recipient = header.left.find((f) => f.label === 'Primary Recipient:')?.value ?? ''
  const author = header.left.find((f) => f.label === 'Author:')?.value ?? ''
  const sex = p.sex === 'M' ? 'Male' : p.sex === 'F' ? 'Female' : p.sex
  const letterhead: BodyLine[] = [
    { runs: [S('HALLIWELL MEDICAL CLINIC')], big: true },
    { runs: [S('1100 - 6th AVENUE')] },
    { runs: [S('PRINCE GEORGE, B.C. V2L 3M6')] },
    { runs: [S('Phone: 250-564-2644 Fax: 250-564-2655')], gap: 22 },
  ]
  const re: BodyLine[] = [
    { runs: [B('Re: '), S(`${p.last}, ${p.first}`)] },
    { runs: [B('DOB: '), S(dash(p.dob))] },
    { runs: [B('Insurance: '), S(p.insuranceBy ?? ''), P(' '), S(p.insurance ?? '')] },
    { runs: [B('H: '), S(p.home ?? ''), B(' W: '), S(p.work ?? ''), B(' C: '), S(p.cell ?? '')], gap: 14 },
  ]
  if (doc === 'information-request') {
    return [
      ...letterhead,
      { runs: [S(dash(header.date))], gap: 14 },
      ...re,
      { runs: [P('To Whom It May Concern,')], gap: 12 },
      { runs: [{ t: 'order', s: '<ENTER REPORT HERE>' }], gap: 12 },
      { runs: [P('Sincerely yours,')], gap: 12 },
      { runs: [S(author)] },
    ]
  }
  const opening = doc === 'consult'
    ? [P('Thank you for referring your patient '), S(p.first), P(' who is a '), S(`${p.age} ${sex}`), P(' .')]
    : doc === 'care-plan'
      ? [P('Please find the shared care plan for your patient '), S(p.first), P(' below.')]
      : [P('Thank you for seeing my patient '), S(p.first), P(' who is a '), S(`${p.age} ${sex}`), P(' .')]
  return [
    ...letterhead,
    { runs: [S(dash(header.date))] },
    { runs: [S(recipient)] },
    { runs: [S(recipient)], gap: 14 },
    ...re,
    { runs: [P('Dear Dr. '), S(recipient), P(',')], gap: 12 },
    { runs: opening, gap: 12 },
    { runs: [{ t: 'order', s: '<ENTER REPORT HERE>' }], gap: 12 },
    { runs: [P('Please see below for additional information.')], gap: 12 },
    { runs: [P('Please do not hesitate to contact me should you need further information.')], gap: 12 },
    { runs: [P('Sincerely,')], gap: 12 },
    { runs: [S(author)] },
  ]
}

/**
 * The tables Letter Setup's Selected counts put after the signature, as the
 * template's tags render them (304687 `ec4925d6…`: `Heath Issues:` — MOIS's
 * own spelling — START / RESOLVED / PROBLEM NAME, then `Medications:`).
 */
export function letterTables(data: MoisChartExport | null, selected: Record<string, number>): BodyTable[] {
  const take = <T,>(rows: T[], section: string) => rows.slice(0, selected[section] ?? 0)
  const out: BodyTable[] = []
  const issues = take([...(data?.health_issue ?? [])].filter((r) => r.str_sensitive !== 'Y'), 'HEALTH ISSUES')
  if (issues.length) {
    out.push({ title: 'Heath Issues:', columns: ['START', 'RESOLVED', 'PROBLEM NAME'],
      rows: issues.map((r) => [dash(r.dtm_start), dash(r.dtm_resolve), r.str_problem_name ?? '']) })
  }
  const allergies = take([...(data?.allergy ?? [])], 'ALLERGIES')
  if (allergies.length) {
    out.push({ title: 'Allergies:', columns: ['SUBSTANCE', 'REACTIONS', 'COMMENT'],
      rows: allergies.map((r) => [r.str_substance ?? '', r.str_reactions ?? r.str_reaction ?? '', '']) })
  }
  const consults = take(consultOrders(data), 'CONSULT')
  if (consults.length) {
    out.push({ title: 'Consults:', columns: ['REFERRED', 'DESCRIPTION', 'REFERRED TO'],
      rows: consults.map((r) => [dash(r.dtm_ord_date), r.str_description ?? '', r.str_performed_by ?? '']) })
  }
  return out
}
