import type { Patient } from '../patients'
import { VISIT_MODES } from '../clinicManagement'
import { apptStatusCodes, serviceLocations } from '../encounterPickers'
import { PREFERENCE_INSTRUCTIONS, PREFERENCE_SUBJECTS, PREFERENCE_TYPES } from '../preferenceVocab'
import {
  MOIS_TODAY, RS_PROVIDERS, RS_USERS, rsAge, rsDaysAgo, rsLike, rsMatchOf, rsName, rsPatients, rsSample,
  type ReportSpec, type RSContext, type RSField, type RSRow,
} from './types'

/* ============================================================================
   Report specs transcribed from manual article 304053 (Reports ▸ Practice
   Management). One spec per catalogue row except Patient List, which keeps
   its hand-built window (screens/ReportParameterWindows.tsx).

   PROVENANCE: per spec below — the article's Parameters capture (window)
   and Report Outcome capture (page), by image hash prefix. Where the
   article's parameter table disagrees with its own capture (Care Plan
   Audit, Patients by City, Visit Mode / Code / Status), the capture wins.
   Two Outcome captures sit under the wrong heading in the article: the
   `CONSULTS FOR DATE RANGE` listing (`9e8fc559`) is placed under Consults
   Summary and the `REFERING PRACTITIONER SUMMARY` (`dbc15d1d`) under
   Consults for Refer — each is used here for the report it actually is.

   All rows are fictional training data over the emulator's roster; user
   names are the clinic's RS_USERS / RS_PROVIDERS.
   ========================================================================= */

/* --- helpers ---------------------------------------------------------------- */

const D0 = '0000.00.00'
const TODAY = MOIS_TODAY
const YEAR_START = `${MOIS_TODAY.slice(0, 4)}.01.01`
const blankDate = (v: string) => !v.trim() || v.trim() === D0
const orDate = (v: string, fallback: string) => (blankDate(v) ? fallback : v.trim())
const inRange = (d: string, from: string, to: string) => (blankDate(from) || d >= from.trim()) && (blankDate(to) || d <= to.trim())
const slashDate = (v: string) => v.replace(/\./g, '/')
/** 2011.11.09 → 11/9/2011, the form some of these DataWindows print */
const mdy = (v: string) => { const [y, m, d] = v.split('.').map(Number); return v ? `${m}/${d}/${y}` : '' }
const weekday = (v: string) => {
  const [y, m, d] = v.split('.').map(Number)
  return new Date(Date.UTC(y!, m! - 1, d!)).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: '2-digit', year: 'numeric', timeZone: 'UTC' })
}
const firstLast = (p: Patient) => `${p.first} ${p.last}`
const list = (v: string) => v.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
/** a code selector's EXCLUDED / INCLUDED drop and its comma list */
const codeKept = (mode: string, codes: string, code: string) => {
  const set = list(codes)
  if (!set.length) return true
  return mode === 'INCLUDED' ? set.includes(code.toUpperCase()) : !set.includes(code.toUpperCase())
}
const ageKept = (ctx: RSContext, id: string, dob: string) => {
  const lo = Number(ctx.val(`${id}From`) || 0)
  const hi = Number(ctx.val(`${id}To`) || 0)
  if (!lo && !hi) return true
  const a = Number(rsAge(dob))
  return a >= lo && (!hi || a <= hi)
}
const PROVIDERS = RS_PROVIDERS.filter(Boolean)
const byChart = (chart: string) => rsPatients().find((p) => p.chart === chart)

/** a total or summary row drawn on its own column grid */
const band = (cols: number[], cells: string[]) => `%COLS:${cols.join(',')}%\n%TR%${cells.join('|')}`

type Page = {
  clinic?: string | false
  title?: string
  subs?: string[]
  /** lines between the title block and the column header */
  pre?: string[]
  cols: number[]
  /** the column captions; none when each group draws its own */
  head?: string[]
  body: RSRow[]
  footer?: RSRow[]
}

/**
 * One report page (or several, 34 body lines to a page, header repeated),
 * in the markup `ReportPage` draws. A raw line resets the column grid, so
 * the grid is put back before the next row, as the generic renderer does.
 */
function page(o: Page): string[] {
  const cols = `%COLS:${o.cols.join(',')}%`
  const head = [
    ...(o.clinic === false ? [] : [`**${o.clinic ?? 'MOIS TEST CLINIC'}**`]),
    ...(o.title ? [`%TITLE%${o.title}`] : []),
    ...(o.subs ?? []).map((s) => `%SUB%${s}`),
    ...(o.pre ?? []),
    cols,
    ...(o.head?.length ? [`%TH%${o.head.join('|')}`] : []),
  ]
  const raw = [...o.body, ...(o.footer ?? [])].map((r) => (typeof r === 'string' ? r : `%TR%${r.join('|')}`))
  const lines: string[] = []
  raw.forEach((l, j) => {
    if (l.startsWith('%TR%') && j > 0 && !raw[j - 1]!.startsWith('%TR%')) lines.push(cols)
    lines.push(l)
  })
  const pages: string[] = []
  for (let i = 0; i < Math.max(1, lines.length); i += 34) {
    let slice = lines.slice(i, i + 34)
    if (slice[0]?.startsWith('%COLS:')) slice = slice.slice(1)
    pages.push([...head, ...slice].join('\n'))
  }
  return pages
}

/* --- shared pick lists ------------------------------------------------------ */

const STATUS_OPTS = ['', 'A', 'D', 'I', 'LU', 'M', 'T', 'TR']
const VISIT_CODE_OPTS = [
  'C - Consultation Visit', 'F - Follow Up', 'FP - First Prenatal', 'H - Home Visit', 'LA - Long Assessment',
  'N - Note, Patient Not Seen', 'PN - Prenatal', 'Q - Quick Check', 'R - Routine', 'SA - Short Assessment',
  'U - Urgent', 'V - Virtual', 'W - Walk in Clinic',
]
const STATUS_CODE_OPTS = apptStatusCodes.map((s) => `${s.code} - ${s.description}`)
const LOCATIONS = ['', ...serviceLocations.map((l) => (typeof l === 'string' ? l : l.name))]
const MODES = ['', ...VISIT_MODES]
const FEE_CODE_OPTS = [
  '14033 - ANNUAL COMPLEX CARE MANAGEMENT FEE',
  '14050 - INCENTIVE FOR FULL SERVICE GP - ANNUAL CHRONIC',
  '14051 - INCENTIVE FOR FULL SERVICE GP - HEART FAILURE',
  '14052 - INCENTIVE FOR FULL SERVICE GP - HYPERTENSION',
  '14053 - INCENTIVE FOR FULL SERVICE GP - COPD',
]
const WAIT_TYPES = ['', 'NEW PATIENT', 'SPECIALIST REFERRAL', 'COUNSELLING', 'DIABETES EDUCATION']
/** non-breaking spaces: a heading's second caption sits well to the right */
const nb = (n: number) => '\u00a0'.repeat(n)

/** the Visit Codes / Status Codes selector: EXCLUDED|INCLUDED drop + list + "…" */
const codeSelector = (id: string, kind: 'visit' | 'status', value = '', w = 262, hint?: string): RSField => ({
  kind: 'row',
  fields: [
    { kind: 'select', id: `${id}Mode`, options: ['EXCLUDED', 'INCLUDED'], value: 'EXCLUDED', w: 74 },
    {
      kind: 'text', id, value, w, hint,
      dots: kind === 'visit'
        ? { title: 'Visit Codes', options: VISIT_CODE_OPTS, multi: true }
        : { title: 'Appointment Status Codes', options: STATUS_CODE_OPTS, multi: true },
    },
  ],
})

/** "From Date: [salmon] to [ ]" — a range whose first box is required */
const requiredRange = (id: string, label: string, hint?: string, from = D0, to = D0): RSField => ({
  kind: 'row',
  label,
  fields: [
    { kind: 'text', id: `${id}From`, value: from, w: 80, align: 'center', required: true, hint: 'to' },
    { kind: 'text', id: `${id}To`, value: to, w: 80, align: 'center', hint },
  ],
})

/* --- sample visits (the encounter reports) ------------------------------------ */

type Visit = {
  p: Patient; date: string; time: string; end: string; attending: string; status: string; vc: string
  diag: string; fee: string; reason: string; ins: string; uid: string; note: string; bill: string; mode: string; location: string
}
const VISITS: Visit[] = rsSample(14).map((p, i) => ({
  p,
  date: rsDaysAgo([2, 2, 2, 5, 5, 9, 9, 12, 16, 16, 21, 30, 30, 44][i]!),
  time: ['09:00', '09:30', '10:15', '09:10', '13:40', '10:20', '14:00', '11:00', '09:30', '15:15', '10:00', '09:10', '09:30', '13:00'][i]!,
  end: ['09:15', '09:45', '10:30', '09:25', '13:55', '10:35', '14:15', '11:15', '09:45', '15:30', '10:15', '09:25', '09:45', '13:15'][i]!,
  attending: PROVIDERS[i % 3]!,
  status: ['S', 'D', 'C', 'S', 'N', 'D', 'R', 'S', 'D', 'C', 'S', 'D', 'N', 'S'][i]!,
  vc: ['R', 'F', 'R', 'PN', 'R', 'C', 'R', 'U', 'F', 'R', 'V', 'R', 'R', 'F'][i]!,
  diag: ['250', '401', '', 'V22', '4659', '250', '', '845', '7094', '', '496', '250', '', '401'][i]!,
  fee: ['00100', '00100', '', '14090', '00100', '00110', '', '00100', '00100', '', '13237', '14050', '', '00100'][i]!,
  reason: ['DIABETES REVIEW', 'BP CHECK', 'RX RENEWAL', 'PRENATAL VISIT', 'COUGH', 'DIABETES EXAM', 'LAB RESULTS', 'ANKLE INJURY', 'SKIN FB', 'PAP', 'COPD FOLLOW UP', 'DIABETES', 'MED REVIEW', 'BP FOLLOW UP'][i]!,
  ins: i % 5 === 4 ? 'UNK' : 'BC',
  uid: String(500920 + i),
  note: ['C', 'I', 'C', 'C', 'I', 'C', 'C', 'I', 'C', 'C', 'C', 'I', 'C', 'C'][i]!,
  bill: ['C', 'I', 'C', 'I', 'C', 'I', 'C', 'I', 'C', 'C', 'I', 'C', 'C', 'I'][i]!,
  mode: i % 4 === 3 ? 'TELEPHONE WITH CLIENT ALONE' : 'DIRECT ENCOUNTER WITH CLIENT ALONE',
  location: ['MOIS TEST CLINIC', 'MOIS TEST CLINIC', 'COMMUNITY'][i % 3]!,
}))
const visitsIn = (ctx: RSContext, id: string) => VISITS.filter((v) => inRange(v.date, ctx.val(`${id}From`), ctx.val(`${id}To`)))
const phnOf = (p: Patient) => `9${String((Number(p.chart) * 7919) % 1000000000).padStart(9, '0')}`
const groupBy = <T,>(xs: T[], key: (x: T) => string) => {
  const m = new Map<string, T[]>()
  for (const x of xs) m.set(key(x), [...(m.get(key(x)) ?? []), x])
  return [...m.entries()].sort(([a], [b]) => a.localeCompare(b))
}

/* --- 1. Care Plan Audit ------------------------------------------------------- */

const CARE_PLAN_PATIENTS: [number, number, number, number, number][] = [
  [2, 0, 0, 0, 0], [2, 0, 0, 0, 0], [7, 11, 0, 0, 0], [4, 0, 0, 0, 0], [0, 2, 0, 0, 0], [3, 3, 1, 0, 0], [3, 8, 1, 1, 0], [2, 0, 0, 0, 1],
]
const CARE_PLAN_USERS: [string, number, number, number, number, number][] = [
  ['<EMPTY - NOT CHANGED>', 12, 17, 2, 0, 0], ['ADMIN, MOIS', 0, 1, 0, 0, 0], ['BEARDWOOD, WALTER', 2, 0, 0, 1, 0],
  ['FRONT DESK, MOA', 5, 2, 0, 0, 0], ['HOWSER, DOOGIE', 4, 2, 0, 0, 1], ['SHEWCHUK, LEAH', 0, 2, 0, 0, 0],
]
const dash = (n: number) => (n ? String(n) : '-')
const carePlanPatientRows = (): string[][] =>
  rsSample(8, 2).map((p, i) => [p.chart, rsName(p), ...CARE_PLAN_PATIENTS[i]!.map(dash)])

const carePlanAudit: ReportSpec = {
  folder: 'Practice Management', name: 'Care Plan Audit', id: 'care-plan-audit',
  width: 650, height: 530,
  provenance: '304053 79fb07be (window), e8d13952 (page, Patient Based), cadc5f72 (page, User Based)',
  inferred: 'The article table also lists "CSV Output" and a date range for User Based; the capture has neither, so the window follows the capture.',
  fields: [
    { kind: 'section', label: 'Report Options' },
    { kind: 'radio', id: 'audit', label: 'Audit:', options: ['Patient Based', 'User Based'] },
    { kind: 'check', id: 'navigator', label: 'Output:', text: 'Output to Chart Navigator', output: 'navigator' },
  ],
  output: {
    title: `CARE PLAN REVIEW AS OF ${TODAY}`,
    cols: [8, 32, 14, 12, 12, 11, 11],
    head: ['CHART', 'PATIENT NAME', 'PREFERENCE', 'GOAL', 'ACTION', 'BARRIER', 'RESOURCE'],
    rows: carePlanPatientRows,
    footer: [],
    chartCol: 0,
  },
  pages: (ctx) => (ctx.val('audit') === 'User Based'
    ? page({
      title: `CARE PLAN REVIEW AS OF ${TODAY}`, cols: [40, 12, 12, 12, 12, 12],
      head: ['USER', 'PREFERENCE', 'GOAL', 'ACTION', 'BARRIER', 'RESOURCE'],
      body: CARE_PLAN_USERS.map(([u, ...n]) => [u, ...n.map(dash)]),
    })
    : page({
      title: `CARE PLAN REVIEW AS OF ${TODAY}`, cols: [8, 32, 14, 12, 12, 11, 11],
      head: ['CHART', 'PATIENT NAME', 'PREFERENCE', 'GOAL', 'ACTION', 'BARRIER', 'RESOURCE'],
      body: carePlanPatientRows(),
    })),
}

/* --- the "<records> created by summary" family ---------------------------------- */

/** USER NAME | NUMBER OF RECORDS, with the double-ruled TOTAL RECORDS line */
function userSummary(ctx: RSContext, what: string, counts: [string, number][], rangeId: string, typeId: string, modified: string) {
  const mod = ctx.val(typeId) === modified
  const from = orDate(ctx.val(`${rangeId}From`), '2000.01.01')
  const to = orDate(ctx.val(`${rangeId}To`), TODAY)
  const total = counts.reduce((s, [, n]) => s + n, 0)
  return page({
    title: `${what} ${mod ? 'LAST MODIFIED BY' : 'CREATED BY'} SUMMARY AS OF ${TODAY}`,
    subs: [`${mod ? 'MODIFIED' : 'CREATE'} DATE BETWEEN ${from} AND ${to}`],
    cols: [6, 34, 20, 40], head: ['', 'USER NAME', 'NUMBER OF RECORDS', ''],
    body: counts.map(([u, n]) => ['', u, String(n), '']),
    footer: ['%RULE%', ['', '**TOTAL RECORDS:**', `**${total}**`, ''], '%RULE%'],
  })
}

/* --- 2. Consolidated Data Creation Summary by User ---------------------------- */

const KPI_COUNTS: [string, number, number, number][] = [
  ['ADMIN, MOIS', 4, 36, 46], ['ALICE, DR', 12, 42, 34], ['BEARDWOOD, WALTER', 0, 2, 0], ['DUCHARME, AMARILYS', 6, 96, 4],
  ['FRONT DESK, MOA', 0, 1, 0], ['HOWSER, DOOGIE', 1, 15, 0], ['SHEWCHUK, LEAH', 0, 0, 1],
]
const dataCreationSummary: ReportSpec = {
  folder: 'Practice Management', name: 'Consolidated Data Creation Summary by User', id: 'data-creation-summary',
  width: 650, height: 530,
  provenance: '304053 eac8df98 (window), af8ee53c (page)',
  fields: [
    { kind: 'section', label: 'Date Range (INCLUSIVE)' },
    { kind: 'radio', id: 'type', label: 'Type:', options: ['Created By', 'Last Modified By'] },
    { kind: 'range', id: 'date', label: 'From:', from: D0, to: D0 },
    { kind: 'section', label: 'Key Performance Indicators' },
    { kind: 'check', id: 'reactionRisks', text: 'Reaction Risks', checked: true },
    { kind: 'check', id: 'healthIssues', text: 'Health Issues', checked: true },
    { kind: 'check', id: 'longTermMeds', text: 'Long Term Medication', checked: true },
    { kind: 'section', label: 'Report by User (optional)' },
    {
      kind: 'row', label: 'User Name:', fields: [
        { kind: 'text', id: 'userName', w: 138 },
        { kind: 'radio', id: 'userMatch', options: ['Contains', 'Begins W', 'Matches'] },
      ],
    },
  ],
  pages: (ctx) => {
    const kpis = ([['reactionRisks', 'REACTION RISKS'], ['healthIssues', 'HEALTH ISSUES'], ['longTermMeds', 'LONG TERM MEDS']] as const)
      .map(([id, label], i) => ({ id, label, i })).filter((k) => ctx.on(k.id))
    const mod = ctx.val('type') === 'Last Modified By'
    const rows = KPI_COUNTS.filter(([u]) => rsLike(ctx.val('userName'), u, rsMatchOf(ctx.val('userMatch'))))
    const w = kpis.length ? Math.floor(54 / kpis.length) : 54
    return page({
      title: `${kpis.map((k) => k.label).join(', ') || 'NO INDICATORS'} ${mod ? 'LAST MODIFIED BY' : 'CREATED BY'} SUMMARY AS OF ${TODAY}`,
      subs: [`${mod ? 'MODIFIED' : 'CREATE'} DATE BETWEEN ${orDate(ctx.val('dateFrom'), '2000.01.01')} AND ${orDate(ctx.val('dateTo'), TODAY)}`],
      cols: [6, 40, ...kpis.map(() => w)],
      head: ['', 'USER NAME', ...kpis.map((k) => `NUMBER OF ${k.label}`)],
      body: rows.map(([u, ...n]) => ['', u, ...kpis.map((k) => dash(n[k.i]!))]),
      footer: ['%RULE%', ['', '**TOTAL RECORDS:**', ...kpis.map((k) => `**${rows.reduce((s, r) => s + (r[k.i + 1] as number), 0)}**`)], '%RULE%'],
    })
  },
}

/* --- 3. Consults for Refer or Seen Pract --------------------------------------- */

const SEEN_BY = ['DIABETIC CLINIC', 'CARDIOLOGY CLINIC', 'DIABETIC CLINIC', 'ORTHOPAEDIC CLINIC', 'MENTAL HEALTH INTAKE', 'DERMATOLOGY CLINIC', 'DIABETIC CLINIC', 'RESPIRATORY CLINIC']
const CONSULTS = rsSample(8, 4).map((p, i) => ({
  p,
  referred: i % 3 === 0 ? '' : rsDaysAgo(60 + i * 11),
  seen: rsDaysAgo(20 + i * 9),
  by: i % 3 === 0 ? '' : PROVIDERS[i % PROVIDERS.length]!,
  seenBy: SEEN_BY[i]!,
}))

const equalsFields = (prefix: string, word: string, first = ''): RSField[] =>
  Array.from({ length: 8 }, (_, n) => ({ kind: 'text', id: `${prefix}${n + 1}`, label: `${n + 1}. ${word} ...`, w: 178, value: n === 0 ? first : '' }) as RSField)

const consultRows = (ctx: RSContext): string[][] => {
  const seenType = ctx.val('dateType') !== 'Referred Date'
  const names = Array.from({ length: 8 }, (_, n) => ctx.val(`equals${n + 1}`)).filter((s) => s.trim())
  return CONSULTS
    .filter((c) => inRange(seenType ? c.seen : c.referred, ctx.val('dateFrom'), ctx.val('dateTo')) && (seenType || c.referred))
    .filter((c) => !ctx.on('activeOnly') || c.p.status === 'A')
    .filter((c) => ageKept(ctx, 'age', c.p.dob))
    .filter((c) => !names.length || names.some((n) => rsLike(n, ctx.val('practType') === 'Seen By' ? c.seenBy : c.by, 'equals')))
    .sort((a, b) => rsName(a.p).localeCompare(rsName(b.p)))
    .map((c) => [rsName(c.p), c.p.dob, c.referred, c.seen, c.by, c.seenBy, c.p.chart])
}
const consultsReferSeen: ReportSpec = {
  folder: 'Practice Management', name: 'Consults for Refer or Seen Pract', id: 'consults-refer-seen',
  width: 650, height: 528,
  provenance: '304053 92cb37a2 (window), 9e8fc559 (page — placed under Consults Summary in the article)',
  inferred: 'The article gives the Practitioner row the Consolidated report\'s wording ("Allergies, Health Issues …"); the capture\'s eight "Equals …" boxes are drawn instead.',
  fields: [
    { kind: 'section', label: 'Date Range (INCLUSIVE)' },
    { kind: 'radio', id: 'dateType', label: 'Type:', options: ['Referred Date', 'Seen Date'], value: 'Seen Date' },
    { kind: 'range', id: 'date', label: 'From:', from: D0, to: D0 },
    { kind: 'section', label: `Practitioner${nb(12)}Include if Equals` },
    { kind: 'radio', id: 'practType', label: 'Type:', options: ['Referred By', 'Seen By'] },
    ...equalsFields('equals', 'Equals'),
    { kind: 'section', label: 'Other Options:' },
    { kind: 'check', id: 'activeOnly', label: 'Patients List:', text: 'Active Patients Only', checked: true },
    { kind: 'range', id: 'age', label: 'Age Range:', from: '0', to: '120', w: 52, hint: '(Leave blank or zeros to ignore)' },
    { kind: 'rule' },
    { kind: 'check', id: 'csv', label: 'CSV Output:', text: 'Direct output to Excel', output: 'excel' },
  ],
  output: {
    title: `CONSULTS FOR DATE RANGE AS OF ${TODAY}`,
    cols: [26, 12, 11, 11, 18, 22],
    head: ['NAME', 'DOB', 'REFERRAL DATE', 'SEEN DATE', 'REFERRAL BY', 'SEEN BY'],
    rows: (ctx) => consultRows(ctx).map((r) => r.slice(0, 6)),
    excelHead: ['NAME', 'DOB', 'REFERRAL DATE', 'SEEN DATE', 'REFERRAL BY', 'SEEN BY', 'CHART'],
    excelRows: (ctx) => consultRows(ctx),
  },
  pages: (ctx) => {
    const rows = consultRows(ctx)
    const names = Array.from({ length: 8 }, (_, n) => ctx.val(`equals${n + 1}`).trim()).filter(Boolean)
    const seenType = ctx.val('dateType') !== 'Referred Date'
    const lo = ctx.val('ageFrom') || '0'
    const hi = ctx.val('ageTo') || '0'
    return page({
      title: `CONSULTS FOR DATE RANGE AS OF ${TODAY}`,
      subs: [
        `${seenType ? 'SEEN' : 'REFER'} DATE BETWEEN ${orDate(ctx.val('dateFrom'), '2000.01.01')} AND ${orDate(ctx.val('dateTo'), TODAY)}`,
        `AGES BETWEEN: ${lo} and ${hi} FOR PATIENT STATUS: ${ctx.on('activeOnly') ? 'ACTIVE' : 'ALL'}`,
        `${ctx.val('practType') === 'Seen By' ? 'SEEN BY' : 'REFER BY'} EQUALS: ${names.length ? names.join(' OR ').toUpperCase() : 'ALL RECORDS'}`,
      ],
      cols: [26, 12, 11, 11, 18, 22],
      head: ['NAME', 'DOB', 'REFERRAL DATE', 'SEEN DATE', 'REFERRAL BY', 'SEEN BY'],
      body: rows.map((r) => r.slice(0, 6)),
      footer: ['', `**TOTALS RECORDS PRINTED:    ${rows.length}**`],
    })
  },
}

/* --- 4. Consults Summary for Refer or Seen Pract ------------------------------- */

const consultsSummary: ReportSpec = {
  folder: 'Practice Management', name: 'Consults Summary for Refer or Seen Pract', id: 'consults-summary',
  width: 650, height: 528,
  provenance: '304053 aef20e67 (window), dbc15d1d (page — placed under Consults for Refer in the article)',
  inferred: 'The Seen By title ("SEEN BY PRACTITIONER SUMMARY") — the capture shows the Referred By run only.',
  fields: [
    { kind: 'section', label: 'Date Range (INCLUSIVE)' },
    { kind: 'radio', id: 'dateType', label: 'Type:', options: ['Referred Date', 'Seen Date'], value: 'Seen Date' },
    { kind: 'range', id: 'date', label: 'From:', from: D0, to: D0 },
    { kind: 'section', label: 'Practitioner' },
    { kind: 'radio', id: 'practType', label: 'Type:', options: ['Referred By', 'Seen By'] },
  ],
  pages: (ctx) => {
    const seenBy = ctx.val('practType') === 'Seen By'
    const seenType = ctx.val('dateType') !== 'Referred Date'
    const kept = CONSULTS.filter((c) => inRange(seenType ? c.seen : c.referred, ctx.val('dateFrom'), ctx.val('dateTo')) && (seenType || c.referred))
    const groups = groupBy(kept, (c) => (seenBy ? c.seenBy : c.by))
    return page({
      title: `${seenBy ? 'SEEN BY' : 'REFERING'} PRACTITIONER SUMMARY AS OF ${TODAY}`,
      subs: [`${seenType ? 'SEEN' : 'REFER'} DATE BETWEEN ${orDate(ctx.val('dateFrom'), '2000.01.01')} AND ${orDate(ctx.val('dateTo'), TODAY)}`],
      cols: [6, 34, 16, 44], head: ['', 'PRACTITIONER', 'NUMER OF REFERRALS', ''],
      body: groups.map(([name, cs]) => ['', name, String(cs.length), '']),
      footer: ['%RULE%', ['', '**TOTAL REFERRALS:**', `**${kept.length}**`, ''], '%RULE%'],
    })
  },
}

/* --- 5. Daily Appointments --------------------------------------------------------- */

const dailyAppointments: ReportSpec = {
  folder: 'Practice Management', name: 'Daily Appointments', id: 'daily-appointments',
  width: 565, height: 395, labelW: 100,
  provenance: '304053 cf622774 (window), 35e5c921 (page)',
  inferred: 'The Home or Violence Risk and Visit Reason columns (the capture is a run without them): Home or Violence Risk prints the patient\'s Consent preference instruction ("NOT ALLOW" on a HOME RISK ASSESSMENT preference), as the article describes. Patient Name is printed in every run, as the capture shows.',
  fields: [
    { kind: 'section', label: 'Mandatory Selections:' },
    { kind: 'text', id: 'date', label: 'Date:', value: D0, w: 74, align: 'center', required: true },
    { kind: 'select', id: 'daybookFor', label: 'Daybook For:', options: 'providers', w: 238 },
    { kind: 'select', id: 'reportFor', label: 'Report For:', options: 'providers', w: 238 },
    { kind: 'section', label: 'Output Options' },
    { kind: 'check', id: 'homeRisk', label: 'Home or Violence Risk:', text: 'Include' },
    { kind: 'check', id: 'patientName', label: 'Patient Name:', text: 'Include' },
    { kind: 'check', id: 'visitReason', label: 'Visit Reason:', text: 'Include' },
  ],
  pages: (ctx) => {
    const risk = byChart('87288')
    const appts: { start: string; end: string; p?: Patient; code: string; reason: string }[] = [
      ...VISITS.slice(0, 6).map((v) => ({ start: v.time, end: v.end, p: v.p, code: v.vc, reason: v.reason })),
      { start: '12:00', end: '13:00', code: 'L', reason: 'LUNCH' },
      ...VISITS.slice(6, 11).map((v, i) => ({ start: ['13:00', '13:30', '13:40', '14:00', '14:30'][i]!, end: ['13:15', '13:45', '13:55', '14:15', '14:45'][i]!, p: v.p, code: v.vc, reason: v.reason })),
      ...(risk ? [{ start: '15:00', end: '15:30', p: risk, code: 'H', reason: 'HOME VISIT' }] : []),
    ].sort((a, b) => a.start.localeCompare(b.start))
    const withRisk = ctx.on('homeRisk')
    const withReason = ctx.on('visitReason')
    const head = ['', 'START', 'END', 'PATIENT', 'CODE', ...(withReason ? ['REASON'] : []), ...(withRisk ? ['HOME/VIOLENCE RISK'] : []), 'LOCATION', 'ADDRESS', 'CITY', 'PHONE']
    const extra = (withReason ? 1 : 0) + (withRisk ? 1 : 0)
    const cols = [12, 5, 5, 16, 6, ...(withReason ? [12] : []), ...(withRisk ? [12] : []), 10 - extra, 16 - extra * 5, 12 - extra * 2, 18 - extra * 3]
    return page({
      pre: [
        '%RULE%',
        '%TITLE%DAILY APPOINTMENTS',
        '%RULE%',
        `%LINE:14,86%Appointment Date:|${blankDate(ctx.val('date')) ? TODAY : ctx.val('date')}`,
        `%LINE:14,86%Daybook For:|${ctx.val('daybookFor')}`,
        `%LINE:14,86%Report For:|${ctx.val('reportFor')}`,
      ],
      cols, head,
      body: appts.map((a) => [
        '', a.start, a.end, a.p ? firstLast(a.p) : '', a.code,
        ...(withReason ? [a.reason] : []),
        ...(withRisk ? [a.p && a.p.chart === '87288' ? 'NOT ALLOW' : ''] : []),
        a.p?.chart === '87288' ? 'HOME' : '-', a.p?.address || '-', a.p?.city || '-', a.p?.home || '-',
      ]),
    })
  },
}

/* --- 6. Health Issue Summary by User ------------------------------------------------ */

const healthIssueSummary: ReportSpec = {
  folder: 'Practice Management', name: 'Health Issue Summary by User', id: 'health-issue-summary',
  width: 650, height: 528,
  provenance: '304053 5c370424 (window), e991b13a (page)',
  inferred: 'The To date defaults to today (the capture shows its own run date there).',
  fields: [
    { kind: 'section', label: 'Date Range (INCLUSIVE)' },
    { kind: 'radio', id: 'type', label: 'Type:', options: ['Created By', 'Last Modified By'] },
    { kind: 'range', id: 'date', label: 'From:', from: '2010.01.01', to: TODAY },
  ],
  pages: (ctx) => userSummary(ctx, 'HEALTH ISSUES', [['ALICE, DR', 43], ['DUCHARME, AMARILYS', 63], ['FRONT DESK, MOA', 1], ['HOWSER, DOOGIE', 15]], 'date', 'type', 'Last Modified By'),
}

/* --- 7–9. Incentive Claim reports ---------------------------------------------------- */

const patientCriteria = (): RSField[] => [
  { kind: 'section', label: 'Patient Criteria:' },
  { kind: 'select', id: 'status', label: 'Status:', options: STATUS_OPTS, value: 'A', w: 52, hint: '(If blank, ALL status)' },
  { kind: 'select', id: 'provider', label: 'Provider:', options: 'providers', w: 172, hint: '(If blank, ALL Providers)' },
  { kind: 'text', id: 'lastContact', label: 'Last Contact:', value: '3', w: 40, align: 'right', hint: '(yrs)' },
  { kind: 'select', id: 'facility', label: 'Facility Code:', options: 'facilities', w: 140 },
  { kind: 'select', id: 'serviceCenter', label: 'Service Center:', options: 'serviceCenters', w: 140 },
]
const feeConcept = (): RSField[] => [
  { kind: 'section', label: 'Fee Code / Concept' },
  {
    kind: 'text', id: 'feeCode', label: 'Fee Code:', w: 250, hint: '(concept or comma separated list of fee codes)',
    dots: { title: 'Fee Code / Concept', options: FEE_CODE_OPTS, multi: true },
  },
  { kind: 'note', text: '(optional - if blank ALL records will be included)', indent: 96 },
]
const outputRadio = (withProcess: boolean): RSField[] => [
  { kind: 'section', label: 'Output' },
  { kind: 'radio', id: 'output', label: 'Report Output:', options: withProcess ? ['Printable Report', 'CSV File', 'Process List'] : ['Printable Report', 'CSV File'], column: true, outputs: { 'CSV File': 'excel', 'Process List': 'navigator' } },
]

type Claim = { fee: string; p: Patient; start: string; end: string; diag: string; service: string; paid: string; status: string }
const CLAIMS: Claim[] = rsSample(8, 6).map((p, i) => ({
  fee: ['14033', '14050', '14050', '14051', '14052', '14052', '14053', '14050'][i]!,
  p,
  start: rsDaysAgo(900 - i * 70),
  end: i === 5 ? rsDaysAgo(40) : '',
  diag: ['', '250', '250', '428', '401', '401', '496', '250'][i]!,
  service: i % 3 === 0 ? '' : rsDaysAgo(200 + i * 20),
  paid: i % 3 === 0 ? '-' : 'Y',
  status: i % 3 === 0 ? 'NEVER BILLED' : i % 3 === 1 ? 'DUE' : 'BILLED',
}))
const feeDesc = (fee: string) => (FEE_CODE_OPTS.find((o) => o.startsWith(fee)) ?? fee).replace(' - ', ' ')
const claimsFor = (ctx: RSContext) => {
  const fees = list(ctx.val('feeCode'))
  return CLAIMS
    .filter((c) => !fees.length || fees.includes(c.fee))
    .filter((c) => !ctx.val('status') || c.p.status === ctx.val('status'))
    .filter((c) => ctx.on('withEnd') || !c.end)
}

const incentiveAudit: ReportSpec = {
  folder: 'Practice Management', name: 'Incentive Claim Audit - Fee Code', id: 'incentive-audit',
  width: 670, height: 540,
  provenance: '304053 170db322 (window), 7fde5c45 (page)',
  inferred: 'Sample rows: the capture is an empty run (FEE CODE: 00017). Rows are charts billed with the fee code that have no Incentive Claim entry (no start date). CSV File opens the Excel sheet; Process List (INFERRED) loads the charts into the Chart Navigator.',
  fields: [
    { kind: 'section', label: 'Fee Code : Check History Claims' },
    { kind: 'text', id: 'feeCode', label: 'Fee Code:', w: 82, required: true, hint: '(required)' },
    ...patientCriteria(),
    ...outputRadio(true),
  ],
  pages: (ctx) => {
    const fee = ctx.val('feeCode').trim().toUpperCase()
    const rows = VISITS.filter((v) => v.fee && (!fee || rsLike(fee, v.fee, 'equals'))).filter((v) => !ctx.val('status') || v.p.status === ctx.val('status'))
    return page({
      title: `INCENTIVE CLAIM REGISTRY AS OF ${TODAY}`,
      subs: [`FEE CODE: ${fee || 'ALL'}`],
      cols: [34, 10, 10, 8, 12, 12, 14],
      head: ['PATIENT', 'CHART NO.', 'DOB', 'SEX', 'START DATE', 'END DATE', 'DIAG CODE'],
      body: groupBy(rows, (v) => v.p.chart).map(([, [v]]) => [rsName(v!.p), v!.p.chart, v!.p.dob, v!.p.gender, '', '', v!.diag]),
    })
  },
}

const incentiveRegistry: ReportSpec = {
  folder: 'Practice Management', name: 'Incentive Claim Patient Registry', id: 'incentive-registry',
  width: 670, height: 540,
  provenance: '304053 0d1bff9b (window), 39682a11 (page)',
  inferred: '"CSV File" opens the Excel sheet.',
  fields: [
    ...feeConcept(),
    ...patientCriteria(),
    { kind: 'check', id: 'withEnd', label: 'Incentive Claim:', text: 'Include Claims with an End date' },
    ...outputRadio(false),
  ],
  pages: (ctx) => {
    const fees = list(ctx.val('feeCode'))
    return page({
      title: `INCENTIVE CLAIM REGISTRY AS OF ${TODAY}`,
      subs: [`FEE CODE: ${fees.length ? fees.join(', ') : 'ALL'}`],
      cols: [34, 10, 10, 8, 12, 12, 14],
      head: ['PATIENT', 'CHART NO.', 'DOB', 'SEX', 'START DATE', 'END DATE', 'DIAG CODE'],
      body: groupBy(claimsFor(ctx), (c) => c.fee).flatMap(([fee, cs]) => [
        `%S%${feeDesc(fee)}`,
        ...cs.map((c) => [rsName(c.p), c.p.chart, c.p.dob, c.p.gender, c.start, c.end, c.diag]),
      ]),
    })
  },
}

const incentiveSchedule: ReportSpec = {
  folder: 'Practice Management', name: 'Incentive Claim Projected Billing Schedule', id: 'incentive-schedule',
  width: 670, height: 540,
  provenance: '304053 5e8dfda4 (window), 969a4460 (page)',
  inferred: '"CSV File" opens the Excel sheet. Statuses other than NEVER BILLED (DUE, BILLED) are reconstructed.',
  fields: [
    ...feeConcept(),
    ...patientCriteria(),
    { kind: 'check', id: 'withEnd', label: 'Incentive Claim:', text: 'Include Claims with an End date' },
    ...outputRadio(false),
  ],
  pages: (ctx) => {
    const fees = list(ctx.val('feeCode'))
    return page({
      title: `INCENTIVE CLAIM SCHEDULE AS OF ${TODAY}`,
      subs: [`FEE CODE: ${fees.length ? fees.join(', ') : 'ALL'}`],
      cols: [32, 10, 10, 12, 14, 8, 14],
      head: ['PATIENT', 'CHART NO.', 'FEE CODE', 'DIAG CODE', 'SERVICE', 'PAID', 'STATUS'],
      body: claimsFor(ctx).sort((a, b) => rsName(a.p).localeCompare(rsName(b.p)))
        .map((c) => [rsName(c.p), c.p.chart, c.fee, c.diag, c.service, c.paid, c.status]),
    })
  },
}

/* --- 10. Long Term Medication Entry Summary by User ----------------------------------- */

const ltmSummary: ReportSpec = {
  folder: 'Practice Management', name: 'Long Term Medication Entry Summary by User', id: 'ltm-summary',
  width: 650, height: 528,
  provenance: '304053 6e6e8480 (window), 8432f8a1 (page)',
  fields: [
    { kind: 'section', label: 'Date Range (INCLUSIVE)' },
    { kind: 'radio', id: 'type', label: 'Type:', options: ['Create Date', 'Last Modify Date'] },
    { kind: 'range', id: 'date', label: 'From:' },
  ],
  pages: (ctx) => userSummary(ctx, 'LONG TERM MEDICATIONS', [['ALICE, DR', 34], ['DUCHARME, AMARILYS', 2], ['FRONT DESK, MOA', 1]], 'date', 'type', 'Last Modify Date'),
}

/* --- 11. Messages / Tasks Audit ----------------------------------------------------------- */

const INACTIVE_USER = 'LOCUM, TEMP'
type Inbox = { user: string; kind: 'Messages' | 'Tasks'; created: string; by: string; ack: string; comp: string; chart: string; subject: string }
const INBOX: Inbox[] = [
  { user: 'ADMIN, MOIS', kind: 'Messages', created: rsDaysAgo(3), by: 'ADMIN, MOIS', ack: 'Y', comp: 'Y', chart: rsSample(1, 0)[0]!.chart, subject: 'SUBJECT LINE' },
  { user: 'ADMIN, MOIS', kind: 'Messages', created: rsDaysAgo(4), by: 'ADMIN, MOIS', ack: 'Y', comp: 'Y', chart: rsSample(1, 1)[0]!.chart, subject: 'REVIEW' },
  { user: 'BEARDWOOD, WALTER', kind: 'Messages', created: rsDaysAgo(1), by: 'FRONT DESK, MOA', ack: 'N', comp: 'N', chart: rsSample(1, 2)[0]!.chart, subject: 'LAB RESULTS TO REVIEW' },
  { user: 'BEARDWOOD, WALTER', kind: 'Tasks', created: rsDaysAgo(2), by: 'FRONT DESK, MOA', ack: 'Y', comp: 'N', chart: rsSample(1, 3)[0]!.chart, subject: 'CALL PATIENT RE: REFERRAL' },
  { user: 'FRONT DESK, MOA', kind: 'Tasks', created: rsDaysAgo(6), by: 'HOWSER, DOOGIE', ack: 'N', comp: 'N', chart: rsSample(1, 4)[0]!.chart, subject: 'BOOK FOLLOW UP 2 WEEKS' },
  { user: 'FRONT DESK, MOA', kind: 'Messages', created: rsDaysAgo(8), by: 'SHEWCHUK, LEAH', ack: 'N', comp: 'N', chart: '', subject: 'CLINIC MEETING MOVED' },
  { user: 'HOWSER, DOOGIE', kind: 'Messages', created: rsDaysAgo(5), by: 'ADMIN, MOIS', ack: 'Y', comp: 'N', chart: rsSample(1, 5)[0]!.chart, subject: 'SPECIALIST LETTER RECEIVED' },
  { user: INACTIVE_USER, kind: 'Messages', created: rsDaysAgo(120), by: 'FRONT DESK, MOA', ack: 'N', comp: 'N', chart: rsSample(1, 6)[0]!.chart, subject: 'PLEASE SIGN CONSULT NOTE' },
  { user: INACTIVE_USER, kind: 'Tasks', created: rsDaysAgo(140), by: 'ADMIN, MOIS', ack: 'N', comp: 'N', chart: rsSample(1, 7)[0]!.chart, subject: 'RENEW PRESCRIPTION' },
]
const yn = (choice: string, v: string) => choice === 'All Records' || (choice === 'Has Been' ? v === 'Y' : v === 'N')
const inboxFor = (ctx: RSContext) => INBOX
  .filter((r) => (r.kind === 'Messages' ? ctx.on('messages') : ctx.on('tasks')))
  .filter((r) => inRange(r.created, ctx.val('createdFrom'), ctx.val('createdTo')))
  .filter((r) => (ctx.val('users') === 'Only Inactive Users' ? r.user === INACTIVE_USER : !ctx.val('user') || r.user === ctx.val('user')))
  .filter((r) => yn(ctx.val('ack'), r.ack) && yn(ctx.val('comp'), r.comp))
const anyOf = (choice: string) => (choice === 'All Records' ? 'ANY' : choice === 'Has Been' ? 'YES' : 'NO')

const messagesTasksAudit: ReportSpec = {
  folder: 'Practice Management', name: 'Messages / Tasks Audit', id: 'messages-tasks-audit',
  width: 700, height: 570, labelW: 110,
  provenance: '304053 de7e334b (window), 986bf13a (page)',
  inferred: 'The sort order and the [ACTIVE] / [INACTIVE] tag follow the article text; the inactive user is fictional.',
  fields: [
    { kind: 'section', label: 'Selection Options' },
    { kind: 'check', id: 'messages', label: 'Report:', text: 'Include Messages', checked: true },
    { kind: 'check', id: 'tasks', text: 'Include Tasks', checked: true },
    { kind: 'range', id: 'created', label: 'Created Between:', from: D0, to: D0, w: 100, hint: '(optional - blank for all)' },
    { kind: 'rule' },
    { kind: 'radio', id: 'users', label: 'Users:', options: ['Select a User', 'Only Inactive Users'] },
    { kind: 'select', id: 'user', options: [...RS_USERS, INACTIVE_USER], w: 190, hint: '(optional - blank for all)' },
    { kind: 'rule' },
    { kind: 'radio', id: 'ack', label: 'Acknowledged:', options: ['All Records', 'Has Been', 'Has Not Been'], value: 'Has Not Been' },
    { kind: 'radio', id: 'comp', label: 'Completed:', options: ['All Records', 'Has Been', 'Has Not Been'], value: 'Has Not Been' },
    { kind: 'rule' },
    { kind: 'check', id: 'navigator', label: 'Output:', text: 'Direct Output to Chart Navigator for Chart Review / Mail Merge', output: 'navigator' },
    { kind: 'note', text: 'NOTE: Output to Chart Navigator only includes records that have an associated Chart.', indent: 116 },
    { kind: 'rule' },
  ],
  output: {
    title: `MESSAGE / TASK SUMMARY BY USER AS OF ${TODAY}`,
    cols: [18, 10, 12, 18, 6, 6, 10, 20],
    head: ['USER', 'TYPE', 'CREATED', 'CREATED BY', 'ACK.', 'COMP.', 'CHART', 'SUBJECT'],
    rows: (ctx) => inboxFor(ctx).map((r) => [r.user, r.kind, r.created, r.by, r.ack, r.comp, r.chart, r.subject]),
    chartCol: 6,
  },
  pages: (ctx) => {
    const rows = inboxFor(ctx)
    const body: RSRow[] = []
    for (const [user, recs] of groupBy(rows, (r) => r.user)) {
      for (const kind of ['Messages', 'Tasks'] as const) {
        const rs = recs.filter((r) => r.kind === kind).sort((a, b) => b.created.localeCompare(a.created))
        if (!rs.length) continue
        const n = (f: (r: Inbox) => boolean) => rs.filter(f).length
        body.push('%RULE%', `%S%${user} [${user === INACTIVE_USER ? 'INACTIVE' : 'ACTIVE'}] - ${kind}`, '%RULE%')
        body.push(band([10, 18, 6, 6, 10, 50], ['**CREATED**', '**CREATED BY**', '**ACK.**', '**COMP.**', '**CHART**', '**SUBJECT**']))
        body.push(...rs.map((r) => [r.created, r.by, r.ack, r.comp, r.chart, r.subject]))
        body.push(band([10, 14, 20, 20, 18, 18], ['**TOTAL**', `Records: ${rs.length}`, `Acknowledged: ${n((r) => r.ack === 'Y')}`,
          `Not Acknowledged: ${n((r) => r.ack !== 'Y')}`, `Completed: ${n((r) => r.comp === 'Y')}`, `Not Completed: ${n((r) => r.comp !== 'Y')}`]))
      }
    }
    const from = ctx.val('createdFrom')
    const to = ctx.val('createdTo')
    return page({
      title: `MESSAGE / TASK SUMMARY BY USER AS OF ${TODAY}`,
      subs: [
        blankDate(from) && blankDate(to) ? 'CREATED: ALL DATES' : `CREATED BETWEEN ${orDate(from, '2000.01.01')} AND ${orDate(to, TODAY)}`,
        ctx.val('users') === 'Only Inactive Users' ? 'FOR ALL INACTIVE USERS' : ctx.val('user') ? `FOR USER: ${ctx.val('user')}` : 'FOR ALL USERS',
        `ACKNOWLEDGED: ${anyOf(ctx.val('ack'))}    COMPLETED: ${anyOf(ctx.val('comp'))}`,
      ],
      cols: [10, 18, 6, 6, 10, 50],
      body,
    })
  },
}

/* --- 12. Messages for Date Range ----------------------------------------------------------- */

const MESSAGES = [
  { by: 'ADMIN, MOIS', sent: rsDaysAgo(4), priority: 'VHIGH', to: 'ADMIN, MOIS', ack: ['Y', rsDaysAgo(4), 'ADMIN, MOIS'], comp: ['Y', rsDaysAgo(4), 'ADMIN, MOIS'], p: rsSample(1, 1)[0]!, subject: 'REVIEW', detail: ['Encounter: {PATIENT}', `Date / Time: ${rsDaysAgo(4)} 10:30`, 'R Ankle', '', 'Body - bulk message'] },
  { by: 'FRONT DESK, MOA', sent: rsDaysAgo(2), priority: 'NORMAL', to: 'BEARDWOOD, WALTER', ack: ['N', '', ''], comp: ['N', '', ''], p: rsSample(1, 2)[0]!, subject: 'LAB RESULTS TO REVIEW', detail: ['Please review the attached lab results and advise.'] },
  { by: 'HOWSER, DOOGIE', sent: rsDaysAgo(9), priority: 'HIGH', to: 'FRONT DESK, MOA', ack: ['Y', rsDaysAgo(8), 'FRONT DESK, MOA'], comp: ['N', '', ''], p: rsSample(1, 4)[0]!, subject: 'BOOK FOLLOW UP', detail: ['Book a follow up visit in 2 weeks.'] },
]
const messagesDateRange: ReportSpec = {
  folder: 'Practice Management', name: 'Messages for Date Range', id: 'messages-date-range',
  width: 670, height: 540,
  provenance: '304053 fc07fb49 (window), aa59cbc0 (page)',
  inferred: 'Date defaults: the capture shows 2012.01.01 to its own run date, drawn here as 1 January of this year to today.',
  fields: [
    { kind: 'section', label: 'Message Create / Sent Date Range (INCLUSIVE)' },
    { kind: 'range', id: 'sent', label: 'From Date:', from: YEAR_START, to: TODAY },
    { kind: 'section', label: 'Sent By (optional)' },
    { kind: 'select', id: 'sentBy', label: 'User Name:', options: 'users', w: 140 },
  ],
  pages: (ctx) => {
    const msgs = MESSAGES.filter((m) => inRange(m.sent, ctx.val('sentFrom'), ctx.val('sentTo')) && (!ctx.val('sentBy') || m.by === ctx.val('sentBy')))
    const one = (m: typeof MESSAGES[number]) => [
      '**MOIS TEST CLINIC**',
      `%TITLE%MESSAGE AS OF ${TODAY}`,
      '%RULE%',
      `%LINE:11,38,36,15%**SENT BY:**|${m.by}|**SENT DATE:** ${m.sent}|PRIORITY:  **${m.priority}**`,
      '%LINE:11,38,26,25%|**SENT TO:**|**ACKNOWLEDGED / DATE / BY**|**COMPLETED / DATE / BY**',
      `%LINE:11,38,26,25%|${m.to}|${m.ack.join('  ')}|${m.comp.join('  ')}`,
      '%HR%',
      `%LINE:11,89%CHART:|**${m.p.chart}      ${rsName(m.p)}**`,
      '%HR%',
      `%LINE:11,89%SUBJECT:|${m.subject}`,
      ...m.detail.map((d, i) => `%LINE:11,89%${i ? '' : 'DETAIL:'}|${d.replace('{PATIENT}', firstLast(m.p))}`),
      '%HR%',
    ].join('\n')
    return msgs.length ? msgs.map(one) : [['**MOIS TEST CLINIC**', `%TITLE%MESSAGE AS OF ${TODAY}`, '%RULE%', 'NO MESSAGES FOUND'].join('\n')]
  },
}

/* --- 13. Patient Preference Settings ---------------------------------------------------------- */

const PREFS = [
  { chart: 0, start: rsDaysAgo(400), pref: 'CONSULT - DIABETES EDUCATION ASSESSMENT', setting: 'DECLINED', type: 'Consent' },
  { chart: 0, start: rsDaysAgo(120), pref: 'GET INFORMATION', setting: '', type: 'Disclosure' },
  { chart: 0, start: rsDaysAgo(120), pref: 'IMAGE - MAMMOGRAPHY', setting: 'NOT INDICATED', type: 'Not Indicated' },
  { chart: 1, start: rsDaysAgo(900), pref: 'INTERVENTION - HEPATITIS B VACCINATION', setting: 'DECLINED', type: 'Directive' },
  { chart: 2, start: rsDaysAgo(700), pref: 'INTERVENTION - INFLUENZA VACCINATION', setting: 'DECLINED', type: 'Directive' },
  { chart: 3, start: rsDaysAgo(650), pref: 'INTERVENTION - INFLUENZA VACCINATION', setting: 'DECLINED', type: 'Directive' },
  { chart: 4, start: rsDaysAgo(30), pref: 'INTERVENTION - LOI ASSESSMENT', setting: 'DECLINED', type: 'Consent' },
]
const prefRows = (ctx: RSContext): string[][] => {
  const sample = rsSample(5, 9)
  const home = byChart('87288')
  const rows = PREFS.map((r) => ({ ...r, p: sample[r.chart]! }))
  if (home) rows.push({ chart: -1, p: home, start: rsDaysAgo(180), pref: 'OTHER - HOME RISK ASSESSMENT', setting: 'NOT ALLOW', type: 'Consent' })
  return rows
    .filter((r) => !ctx.val('type') || r.type.toUpperCase() === ctx.val('type').toUpperCase())
    .filter((r) => !ctx.val('subject') || r.pref.startsWith(ctx.val('subject').slice(0, 5)))
    .filter((r) => rsLike(ctx.val('concept'), r.pref))
    .filter((r) => !ctx.val('instruction') || r.setting === ctx.val('instruction'))
    .filter((r) => inRange(r.start, ctx.val('start'), ctx.val('end')))
    .map((r) => [r.p.chart, rsName(r.p), r.start, r.pref, r.setting])
}
const patientPreferenceSettings: ReportSpec = {
  folder: 'Practice Management', name: 'Patient Preference Settings', id: 'patient-preference-settings',
  width: 655, height: 590, labelW: 100,
  provenance: '304053 39e90e72 (window), 9af9b616 (page)',
  inferred: 'The Chart Services and Chart Connections filters are drawn but do not narrow the sample rows. The Connection Role / Resource / Connection captions sit on one note line above their three controls.',
  fields: [
    { kind: 'section', label: 'Selection Options' },
    { kind: 'select', id: 'type', label: 'Type:', options: ['', ...PREFERENCE_TYPES.map((t) => t.toUpperCase())], w: 164 },
    { kind: 'select', id: 'subject', label: 'Subject:', options: ['', ...PREFERENCE_SUBJECTS], w: 164 },
    { kind: 'radio', id: 'identifiedBy', label: 'Identified By:', options: ['Code', 'Concept', 'Free Text'], value: 'Concept' },
    {
      kind: 'text', id: 'concept', label: 'Concept:', w: 436,
      dots: { title: 'Concept', options: ['DIABETES EDUCATION ASSESSMENT', 'HEPATITIS B VACCINATION', 'HOME RISK ASSESSMENT', 'INFLUENZA VACCINATION', 'LOI ASSESSMENT', 'MAMMOGRAPHY'] },
    },
    { kind: 'select', id: 'instruction', label: 'Instruction:', options: ['', ...new Set(Object.values(PREFERENCE_INSTRUCTIONS).flat()), 'DECLINED'], w: 336 },
    { kind: 'check', id: 'stopped', text: 'Include Stopped Preference' },
    { kind: 'section', label: 'Optional Preference Date Range:' },
    {
      kind: 'row', label: 'Start Date:', fields: [
        { kind: 'text', id: 'start', w: 74, hint: `${nb(14)}End Date:` },
        { kind: 'text', id: 'end', w: 74 },
      ],
    },
    { kind: 'section', label: 'Optional Chart Services Filter:' },
    { kind: 'text', id: 'serviceEpisode', label: 'Service Episode', w: 336, dots: { title: 'Service Episode', options: ['CHRONIC DISEASE MANAGEMENT', 'MATERNITY', 'MENTAL HEALTH AND SUBSTANCE USE', 'PRIMARY CARE'] } },
    { kind: 'text', id: 'providedBy', label: 'Service Provided By:', w: 336, dots: { title: 'Service Provided By', options: 'providers' } },
    { kind: 'radio', id: 'provided', label: 'Service Provided:', options: ['As MRP', 'As Member Of', 'Either'] },
    { kind: 'section', label: 'Optional Chart Connections Filter:' },
    { kind: 'note', text: `Connection Role${nb(18)}Connection Resource${nb(18)}Connection` },
    {
      kind: 'row', fields: [
        { kind: 'select', id: 'connectionRole', options: ['', 'FAMILY PHYSICIAN', 'CASE MANAGER', 'SPECIALIST'], w: 124 },
        { kind: 'select', id: 'connectionResource', options: ['', 'PROVIDER', 'SERVICE CENTER'], w: 140 },
        { kind: 'text', id: 'connection', w: 232, dots: { title: 'Connection', options: 'providers' } },
      ],
    },
    { kind: 'rule' },
    { kind: 'check', id: 'csv', label: 'CSV Output', text: 'Direct Output to CSV', output: 'excel' },
  ],
  output: {
    title: `PREFERENCE CHECK AS OF ${TODAY}`,
    cols: [8, 26, 11, 42, 13],
    head: ['CHART', 'PATIENT NAME', 'START', 'PREFERENCE', 'SETTING'],
    rows: prefRows,
    footer: [],
    chartCol: 0,
  },
}

/* --- 14. Patient Registration --------------------------------------------------------------------- */

const REGS = rsSample(6, 14).map((p, i) => ({
  p, reg: rsDaysAgo(20 + i * 23), last: i === 2 ? '' : rsDaysAgo(18 + i * 20), attending: i < 3 ? '' : PROVIDERS[i % PROVIDERS.length]!,
  sc: i % 2 ? 'PRIMARY CARE' : '', jur: i < 3 ? '' : 'BC', ref: i === 4 ? 'SHEWCHUK, LEAH' : '',
}))
const patientRegistration: ReportSpec = {
  folder: 'Practice Management', name: 'Patient Registration', id: 'patient-registration',
  width: 670, height: 540,
  provenance: '304053 940a85f3 (window), 2bc54a91 (page)',
  inferred: 'Date defaults (capture: 2012.01.01 to its run date → 1 January of this year to today); the Summary Report layout (totals only, per the article).',
  fields: [
    { kind: 'section', label: 'Chart Create Date Range (INCLUSIVE)' },
    { kind: 'range', id: 'created', label: 'From Date:', from: YEAR_START, to: TODAY },
    { kind: 'note', text: '' },
    { kind: 'section', label: 'Report Option' },
    { kind: 'radio', id: 'option', options: ['Detail Report', 'Summary Report'], column: true },
  ],
  pages: (ctx) => {
    const detail = ctx.val('option') !== 'Summary Report'
    const regs = REGS.filter((r) => inRange(r.reg, ctx.val('createdFrom'), ctx.val('createdTo')))
    const cols = [28, 6, 9, 8, 10, 12, 9, 18]
    const tot = (label: string, n: number, at: number) => band([at, 100 - at - 8, 8], ['', label, String(n)])
    const body: RSRow[] = []
    for (const [att, rs] of groupBy(regs, (r) => r.attending)) {
      body.push(`%S%ATTENDING: ${att}`, '%RULE%')
      if (detail) body.push(...rs.map((r) => [rsName(r.p), rsAge(r.p.dob), r.reg, r.p.chart, r.last, r.sc, r.jur, r.ref]))
      for (const [jur, js] of groupBy(rs, (r) => r.jur)) body.push(tot(`TOTAL VISITS FOR JURISDICTION CODE ${jur || 'BLANK'}:`, js.length, 25), '%HR%')
      for (const [sc, ss] of groupBy(rs, (r) => r.sc)) body.push(tot(`TOTAL VISITS FOR SERVICE CENTRE ${sc || 'BLANK'}:`, ss.length, 20), '%HR%')
      body.push(tot(`TOTAL VISITS FOR ATTENDING ${att || 'BLANK'}:`, rs.length, 16), '%HR%')
    }
    body.push('%RULE%', band([16, 76, 8], ['', '**TOTAL FOR REPORT:**', `**${regs.length}**`]), '%RULE%')
    return page({
      title: `NEW PATIENT REGISTRATION BY ATTENDING/SERV/JURISD AS OF ${TODAY}`,
      subs: [`FROM ${orDate(ctx.val('createdFrom'), '2000.01.01')} TO ${orDate(ctx.val('createdTo'), TODAY)}`],
      cols, head: ['NAME', 'AGE', 'REG DATE', 'CHART NO', 'LAST CONTACT', 'SERVICE CENTER', 'JURISD', 'REF DOCTOR'],
      body,
    })
  },
}

/* --- 15–16. Patients by City / by Service Center ---------------------------------------------------- */

const CITIES = ['Prince George', 'Prince George, B.C.', 'PRINCE GEORGE', 'Vanderhoof', 'Quesnel', 'Prince George', 'Mackenzie', 'Prince George']
const CENTRES = ['LTC', 'PRIMARY CARE', 'LTC', 'MENTAL HEALTH', 'NURSING', 'LTC', 'PUBLIC HEALTH', 'PRIMARY CARE']
const locals = () => rsPatients().filter((p) => p.dob).map((p, i) => ({
  p,
  city: p.city ? p.city : CITIES[i % CITIES.length]!,
  province: p.province || (i % 4 === 1 ? '' : 'BC'),
  contact: p.lastContact || rsDaysAgo(30 + ((i * 97) % 900)),
  centre: CENTRES[i % CENTRES.length]!,
  doctor: PROVIDERS[i % PROVIDERS.length]!,
}))
const lastVisitKept = (ctx: RSContext, contact: string) => {
  const yrs = Number(ctx.val('lastVisit') || 0)
  return !yrs || contact >= rsDaysAgo(Math.round(yrs * 365.25))
}
const otherOptions = (lastVisit: string): RSField[] => [
  { kind: 'section', label: 'Other Options:' },
  { kind: 'check', id: 'activeOnly', label: 'Patients List:', text: 'Active Patients Only', checked: true },
  { kind: 'text', id: 'lastVisit', label: 'Last Visit:', value: lastVisit, w: 52, align: 'right', hint: '(years since last contact)' },
  { kind: 'range', id: 'age', label: 'Age Range:', from: '0', to: '120', w: 52, hint: '(Leave blank or zeros to ignore)' },
  { kind: 'rule' },
  { kind: 'check', id: 'csv', label: 'CSV Output:', text: 'Direct output to Excel', output: 'excel' },
]
const subsFor = (ctx: RSContext, what: string, word: string, prefix: string) => {
  const names = Array.from({ length: 8 }, (_, n) => ctx.val(`${prefix}${n + 1}`).trim()).filter(Boolean)
  return [
    `LAST CONTACT DATE WITHIN LAST ${ctx.val('lastVisit') || 0} YRS`,
    `AGES BETWEEN: ${ctx.val('ageFrom') || '0'} and ${ctx.val('ageTo') || '0'} FOR PATIENT STATUS: ${ctx.on('activeOnly') ? 'ACTIVE' : 'ALL'}`,
    `${what} ${word}: ${names.length ? names.join(' OR ').toUpperCase() : 'ALL RECORDS'}`,
  ]
}
const localsFor = (ctx: RSContext, prefix: string, pick: (l: ReturnType<typeof locals>[number]) => string, mode: 'contains' | 'equals') => {
  const names = Array.from({ length: 8 }, (_, n) => ctx.val(`${prefix}${n + 1}`)).filter((s) => s.trim())
  return locals()
    .filter((l) => !names.length || names.some((n) => rsLike(n, pick(l), mode)))
    .filter((l) => !ctx.on('activeOnly') || l.p.status === 'A')
    .filter((l) => lastVisitKept(ctx, l.contact) && ageKept(ctx, 'age', l.p.dob))
    .sort((a, b) => rsName(a.p).localeCompare(rsName(b.p)))
}

const cityRows = (ctx: RSContext) => localsFor(ctx, 'city', (l) => l.city, 'contains')
  .map((l) => [rsName(l.p), l.p.chart, mdy(l.p.dob), mdy(l.contact), l.city, l.province])
const patientsByCity: ReportSpec = {
  folder: 'Practice Management', name: 'Patients by City', id: 'patients-by-city',
  width: 670, height: 540,
  provenance: '304053 666b78af (window), c72a9b18 (page)',
  inferred: 'The article table describes a Last Contact date with Before / After; the capture has "Last Visit: n (years since last contact)", which is drawn. Cities of roster charts without one on file are fictional.',
  fields: [
    { kind: 'section', label: `City Name(s):${nb(10)}Include if Contains` },
    ...equalsFields('city', 'Contains', 'PRINCE GEORGE'),
    ...otherOptions('1'),
  ],
  output: {
    title: `PATIENTS BY CITY FOR LAST CONTACT RANGE AS OF ${TODAY}`,
    cols: [28, 8, 12, 12, 24, 16],
    head: ['NAME', 'CHART NO', 'DOB', 'CONTACT DATE', 'CITY', 'PROVINCE'],
    rows: cityRows,
  },
  pages: (ctx) => {
    const rows = cityRows(ctx)
    return page({
      title: `PATIENTS BY CITY FOR LAST CONTACT RANGE AS OF ${TODAY}`,
      subs: subsFor(ctx, 'CITY', 'CONTAINS', 'city'),
      cols: [28, 8, 12, 12, 24, 16],
      head: ['NAME', 'CHART NO', 'DOB', 'CONTACT DATE', 'CITY', 'PROVINCE'],
      body: rows,
      footer: ['', `**TOTALS RECORDS PRINTED:    ${rows.length}**`],
    })
  },
}

const centreRows = (ctx: RSContext) => localsFor(ctx, 'centre', (l) => l.centre, 'equals')
  .map((l) => [rsName(l.p), l.p.dob, l.contact, l.centre, l.doctor, l.p.home ?? ''])
const patientsByServiceCenter: ReportSpec = {
  folder: 'Practice Management', name: 'Patients by Service Center', id: 'patients-by-service-center',
  width: 670, height: 540,
  provenance: '304053 1a5c8761 (window), 54c97d68 (page)',
  inferred: 'Sample rows (the capture is an empty run); service centres of roster charts are fictional.',
  fields: [
    { kind: 'section', label: 'Service Center(s) Include if Equals' },
    ...equalsFields('centre', 'Equals', 'LTC'),
    ...otherOptions('3'),
  ],
  output: {
    title: `PATIENTS BY SERVICE CENTRE FOR DATE RANGE AS OF ${TODAY}`,
    cols: [28, 11, 11, 20, 16, 14],
    head: ['NAME', 'DOB', 'CONTACT DATE', 'SERVICE CENTER', 'DOCTOR', 'HOME PHONE'],
    rows: centreRows,
  },
  pages: (ctx) => {
    const rows = centreRows(ctx)
    return page({
      title: `PATIENTS BY SERVICE CENTRE FOR DATE RANGE AS OF ${TODAY}`,
      subs: subsFor(ctx, 'SERVICE CENTRE', 'EQUALS', 'centre'),
      cols: [28, 11, 11, 20, 16, 14],
      head: ['NAME', 'DOB', 'CONTACT DATE', 'SERVICE CENTER', 'DOCTOR', 'HOME PHONE'],
      body: rows,
      footer: ['', `**TOTALS RECORDS PRINTED:    ${rows.length}**`],
    })
  },
}

/* --- 17. Reaction Risk Summary by User ---------------------------------------------------------------- */

const reactionRiskSummary: ReportSpec = {
  folder: 'Practice Management', name: 'Reaction Risk Summary by User', id: 'reaction-risk-summary',
  width: 650, height: 530,
  provenance: '304053 96b0a6f7 (window), c4fcd4d5 (page)',
  fields: [
    { kind: 'section', label: 'Date Range (INCLUSIVE)' },
    { kind: 'radio', id: 'type', label: 'Type:', options: ['Created By', 'Last Modified By'] },
    { kind: 'range', id: 'date', label: 'From:', from: D0, to: D0 },
  ],
  pages: (ctx) => userSummary(ctx, 'REACTION RISKS', [
    ['ADMIN, MOIS', 4], ['ALICE, DR', 11], ['BEARDWOOD, WALTER', 1], ['DUCHARME, AMARILYS', 7], ['FRONT DESK, MOA', 4], ['HOWSER, DOOGIE', 1], ['SHEWCHUK, LEAH', 7],
  ], 'date', 'type', 'Last Modified By'),
}

/* --- 18. Statistics - Avg Diag Code / Encounter ------------------------------------------------------- */

const avgDiag: ReportSpec = {
  folder: 'Practice Management', name: 'Statistics - Avg Diag Code / Encounter', id: 'avg-diag-encounter',
  width: 670, height: 540,
  provenance: '304053 07e29cd1 (window), 41d8e740 (page)',
  fields: [
    { kind: 'section', label: 'Appointment Date Range (INCLUSIVE)' },
    requiredRange('appt', 'From Date:'),
    { kind: 'note', text: '' },
    { kind: 'rule' },
    { kind: 'note', text: 'Please Note:' },
    { kind: 'note', text: 'An encounter must have a diagnostic code 1 to be included in the report.' },
  ],
  pages: (ctx) => {
    const vs = visitsIn(ctx, 'appt').filter((v) => v.diag)
    const groups = groupBy(vs, (v) => v.attending)
    const codes = (v: Visit) => (v.diag === '250' ? 2 : 1)
    const avg = (e: number, c: number) => (e ? (c / e).toFixed(3) : '0.000')
    const te = vs.length
    const tc = vs.reduce((s, v) => s + codes(v), 0)
    return page({
      title: `AVERAGE NUMBER OF DIAGNOSTIC CODES PER ENCOUNTER OF ${TODAY}`,
      subs: [
        `APPOINTMENT DATES INCLUSIVE ${slashDate(orDate(ctx.val('apptFrom'), '2000.01.01'))} AND ${slashDate(orDate(ctx.val('apptTo'), TODAY))}`,
        'ENCOUNTER WITHOUT A DIAGNOSTIC CODE 1 ARE NOT INCLUDED',
      ],
      cols: [40, 20, 20, 20],
      head: ['PROVIDER', 'NUMBER OF ENCOUNTERS', 'NUMBER OF DIAGNOSTIC CODES', 'AVERAGE CODES / ENCOUNTER'],
      body: groups.map(([att, g]) => { const c = g.reduce((s, v) => s + codes(v), 0); return [att, String(g.length), String(c), avg(g.length, c)] }),
      footer: ['%RULE%', ['REPORT TOTALS:', String(te), String(tc), avg(te, tc)]],
    })
  },
}

/* --- 19. Visit Audit - Diagnostic or Fee Code (Excel only) --------------------------------------------- */

const auditRows = (ctx: RSContext): string[][] => {
  const fees = list(ctx.val('fees'))
  const diags = list(ctx.val('diags'))
  return visitsIn(ctx, 'appt')
    .filter((v) => !ctx.val('attending') || v.attending === ctx.val('attending'))
    .filter((v) => !ctx.val('mode') || v.mode === ctx.val('mode'))
    .filter((v) => !ctx.val('location') || v.location === ctx.val('location'))
    .filter((v) => (!fees.length || fees.includes(v.fee)) && (!diags.length || diags.includes(v.diag.toUpperCase())))
    .filter((v) => codeKept(ctx.val('visitCodesMode'), ctx.val('visitCodes'), v.vc) && codeKept(ctx.val('statusCodesMode'), ctx.val('statusCodes'), v.status))
    .map((v, i) => {
      const [h, m] = v.time.split(':')
      return ['MOIS TEST CLINIC', ['PRIMARY CARE', 'NURSING', 'MENTAL HEALTH'][i % 3]!, PROVIDERS[(i + 1) % PROVIDERS.length]!, v.p.chart, v.p.last, v.p.first, phnOf(v.p), v.p.dob, v.p.gender,
        v.date, String(Number(h)), String(Number(m)), v.attending, v.location, v.vc, v.mode, v.reason, v.status, v.diag, '', '', '', v.fee, v.bill, i % 4 ? 'Y' : 'N']
    })
}
const visitAudit: ReportSpec = {
  folder: 'Practice Management', name: 'Visit Audit - Diagnostic or Fee Code', id: 'visit-audit',
  width: 670, height: 540, labelW: 108, excelOnly: true,
  provenance: '304053 fe744451 (window), 16ce3bc7 (Excel output)',
  inferred: 'Excel columns after FEE CODE (BILLING STATUS, BC PCPC ENROLLED STATUS) come from the article text; the capture is cut off at column W.',
  fields: [
    { kind: 'section', label: 'Patient Filters:' },
    { kind: 'select', id: 'serviceCenter', label: 'Service Center:', options: 'serviceCenters', w: 150 },
    { kind: 'select', id: 'primary', label: 'Primary Provider:', options: 'providers', w: 150 },
    { kind: 'section', label: 'Encounter Filters:' },
    { kind: 'range', id: 'appt', label: 'Appointment Date:', from: D0, to: D0, w: 80, hint: '(required and inclusive)' },
    { kind: 'select', id: 'mode', label: 'Visit Mode:', options: MODES, w: 270 },
    { kind: 'select', id: 'location', label: 'Service Location:', options: LOCATIONS, w: 150 },
    { kind: 'select', id: 'attending', label: 'Attending Provider:', options: 'providers', w: 150 },
    { kind: 'text', id: 'fees', label: 'Fee Code(s):', w: 218, hint: '(comma seperated list)' },
    { kind: 'text', id: 'diags', label: 'Diag Code(s):', w: 218, hint: '(comma seperated list)' },
    { kind: 'note', text: 'Visit Codes' },
    codeSelector('visitCodes', 'visit', '', 232),
    { kind: 'note', text: 'Status Codes' },
    codeSelector('statusCodes', 'status', 'C,R,N', 232),
    { kind: 'rule' },
    { kind: 'note', text: 'Due to the amount of data, all output is directed to a CSV file / Excel.' },
    { kind: 'note', text: 'Note: All parameters except Appointment Date range are OPTIONAL, if left blank then the report will ignore the filter.' },
  ],
  output: {
    title: 'VISIT AUDIT - DIAGNOSTIC OR FEE CODE',
    cols: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    head: ['FACILITY', 'SERVICE CENTER', 'PRIMARY SERVICE PROVIDER', 'CHART NUMBER', 'LAST NAME', 'FIRST NAME', 'PHN', 'DOB', 'GENDER', 'APPT DATE',
      'APPT HR', 'APPT MIN', 'ATTENDING', 'SERVICE LOCATION', 'VISIT CODE', 'VISIT MODE', 'VISIT REASON', 'APPT STATUS',
      'DIAG CODE 1', 'DIAG CODE 2', 'DIAG CODE 3', 'DIAG CODE 4', 'FEE CODE', 'BILLING STATUS', 'BC PCPC ENROLLED STATUS'],
    rows: auditRows,
  },
}

/* --- 20. Visit Mode / Code / Status -------------------------------------------------------------------------- */

const modeRows = (ctx: RSContext): string[][] => VISITS
  .filter((v) => inRange(v.date, ctx.val('start'), ctx.val('end')))
  .filter((v) => !ctx.val('mode') || v.mode === ctx.val('mode'))
  .filter((v) => !ctx.val('location') || v.location === ctx.val('location'))
  .filter((v) => codeKept(ctx.val('visitCodesMode'), ctx.val('visitCodes'), v.vc) && codeKept(ctx.val('statusCodesMode'), ctx.val('statusCodes'), v.status))
  .map((v) => [v.date, v.time, v.p.chart, rsName(v.p), v.attending, v.location, v.vc, v.mode, v.status])
const visitModeCodeStatus: ReportSpec = {
  folder: 'Practice Management', name: 'Visit Mode / Code / Status', id: 'visit-mode-code-status',
  width: 645, height: 700,
  provenance: '304053 8399ead5 (window); no page capture',
  inferred: 'The printed page (no capture; columns from the article\'s CSV list, cut down to one page) and the Excel columns (the article\'s "Output to CSV" list). Simple / Advanced does not change the sample. The article lists an Attending Provider filter the capture does not have; the capture is drawn.',
  fields: [
    { kind: 'section', label: 'Appointment Date Range (INCLUSIVE)' },
    { kind: 'text', id: 'start', label: 'Start Date:', value: D0, w: 82, align: 'center', required: true },
    { kind: 'text', id: 'end', label: 'End Date:', value: D0, w: 82, align: 'center' },
    { kind: 'section', label: 'Encounter Details' },
    { kind: 'select', id: 'mode', label: 'Visit Mode:', options: MODES, w: 282, hint: '(optional - blank for all)' },
    { kind: 'select', id: 'location', label: 'Service Location:', options: LOCATIONS, w: 158, hint: '(optional - blank for all)' },
    { kind: 'section', label: 'Visit Codes' },
    codeSelector('visitCodes', 'visit', '', 262, '(optional - blank for all)'),
    { kind: 'section', label: 'Status Codes' },
    codeSelector('statusCodes', 'status', 'C,R,N', 262, '(optional - blank for all)'),
    { kind: 'section', label: 'Report Type', right: { kind: 'radio', id: 'reportType', options: ['Simple', 'Advanced'] } },
    ...Array.from({ length: 10 }, (): RSField => ({ kind: 'note', text: '' })),
    { kind: 'section', label: 'Output Format', right: { kind: 'check', id: 'excel', text: 'Direct Output to Excel', output: 'excel' } },
  ],
  output: {
    title: `VISIT MODE / CODE / STATUS AS OF ${TODAY}`,
    cols: [10, 6, 7, 18, 14, 12, 5, 22, 6],
    head: ['APPT DATE', 'TIME', 'CHART', 'PATIENT NAME', 'ATTENDING', 'SERVICE LOCATION', 'VISIT CODE', 'VISIT MODE', 'APPT STATUS'],
    rows: modeRows,
    excelHead: ['FACILITY', 'SERVICE CENTER', 'PRIMARY SERVICE PROVIDER', 'CHART NUMBER', 'PATIENT NAME', 'INSURANCE NBR/PHN', 'BC HEALTH NO. BY', 'DOB', 'GENDER', 'PREFERRED PHONE',
      'APPT DATE', 'APPT TIME', 'ENCOUNTER PROVIDER', 'ATTENDING', 'AUTHOR', 'SERVICE LOCATION', 'VISIT CODE', 'VISIT MODE', 'VISIT REASON', 'APPT STATUS',
      'BILLING CODES', 'SERVICE EPISODE CODE', 'DOCUMENT STATUS', 'BILLING STATUS', 'ENCOUNTER ID', 'APPT SERIES ID', 'TIME SLOT'],
    excelRows: (ctx) => VISITS
      .filter((v) => inRange(v.date, ctx.val('start'), ctx.val('end')))
      .filter((v) => !ctx.val('mode') || v.mode === ctx.val('mode'))
      .filter((v) => !ctx.val('location') || v.location === ctx.val('location'))
      .filter((v) => codeKept(ctx.val('visitCodesMode'), ctx.val('visitCodes'), v.vc) && codeKept(ctx.val('statusCodesMode'), ctx.val('statusCodes'), v.status))
      .map((v, i) => ['MOIS TEST CLINIC', 'PRIMARY CARE', v.attending, v.p.chart, rsName(v.p), phnOf(v.p), 'BC', v.p.dob, v.p.gender, v.p.home ?? '',
        v.date, v.time, v.attending, v.attending, v.attending, v.location, v.vc, v.mode, v.reason, v.status,
        [v.diag, v.fee].filter(Boolean).join(' / '), '', v.note, v.bill, String(700100 + i), '', '15']),
  },
}

/* --- 21. Visit Status --------------------------------------------------------------------------------------------- */

const visitStatus: ReportSpec = {
  folder: 'Practice Management', name: 'Visit Status', id: 'visit-status',
  width: 670, height: 540,
  provenance: '304053 6d7a291a (window), 36a0e24a (page)',
  inferred: '"Current Desktop" is taken as the clinic\'s first provider. One provider to a page, as the capture\'s single-provider page suggests.',
  fields: [
    { kind: 'section', label: 'Date Range (INCLUSIVE)' },
    requiredRange('appt', 'Appointment:', undefined, D0, ''),
    { kind: 'section', label: 'Providers' },
    { kind: 'radio', id: 'providers', options: ['Current Desktop', 'All Providers'], value: 'All Providers', column: true },
    { kind: 'section', label: 'Appt Status' },
    { kind: 'check', id: 'discharged', text: 'Include Discharged Patients' },
    { kind: 'check', id: 'noShow', text: 'Include No-Show Appointments', checked: true },
    { kind: 'check', id: 'rebook', text: 'Include Re-Book Appointments', checked: true },
    { kind: 'check', id: 'cancelled', text: 'Include Cancelled Appointments', checked: true },
  ],
  pages: (ctx) => {
    const want = new Set([ctx.on('discharged') && 'D', ctx.on('noShow') && 'N', ctx.on('rebook') && 'R', ctx.on('cancelled') && 'C'].filter(Boolean) as string[])
    const vs = visitsIn(ctx, 'appt').filter((v) => want.has(v.status))
      .filter((v) => ctx.val('providers') !== 'Current Desktop' || v.attending === PROVIDERS[0])
    const range = `Between ${slashDate(orDate(ctx.val('apptFrom'), '2000.01.01'))} And ${slashDate(orDate(ctx.val('apptTo'), TODAY))}`
    const groups = groupBy(vs, (v) => v.attending)
    const cols = [4, 9, 16, 7, 12, 12, 11, 5, 12, 12]
    const one = (att: string, g: Visit[]) => page({
      clinic: false,
      pre: ['%S%VISITS BY ATTENDING AND STATUS CODE', `%LINE:55,45%**PROVIDER: ${att}**|**Appoint Date:**  ${range}`],
      cols, head: ['AS', 'DIAG CODE', 'APPT NOTE', 'CHART', 'LAST NAME', 'FIRST NAME', 'INS NBR', 'AGE', 'PHONE (H)', 'SERV DATE'],
      body: groupBy(g, (v) => v.status).flatMap(([st, sv]) => [
        ...sv.map((v) => [v.status, v.diag, v.reason.toLowerCase(), v.p.chart, v.p.last, v.p.first, phnOf(v.p), rsAge(v.p.dob), v.p.home || '(   )   -', v.date]),
        band([70, 26, 4], ['', `**TOTAL VISIT FOR STATUS CODE ${st} :**`, `**${sv.length}**`]),
        '%HR%',
      ]),
      footer: [band([55, 41, 4], ['', `**TOTAL VISIT FOR PROVIDER ${att} :**`, `**${g.length}**`]), '%RULE%'],
    })
    return groups.length ? groups.flatMap(([att, g]) => one(att, g)) : one(ctx.val('providers') === 'Current Desktop' ? PROVIDERS[0]! : 'ALL PROVIDERS', [])
  },
}

/* --- 22. Visit Status - Bill / Note Status ---------------------------------------------------------------------- */

const WITHOUT = ['Billing (Bill Status = I)', 'Note (Document Status = I)', 'Billing OR Note']
const billNoteStatus: ReportSpec = {
  folder: 'Practice Management', name: 'Visit Status - Bill / Note Status', id: 'visit-bill-note-status',
  width: 650, height: 530,
  provenance: '304053 d6d0d622 (window), 92675538 (page)',
  fields: [
    { kind: 'section', label: 'Appointment Date Range (INCLUSIVE)' },
    { kind: 'text', id: 'start', label: 'Start Date:', value: D0, w: 80, align: 'center', required: true },
    { kind: 'text', id: 'end', label: 'End Date:', value: D0, w: 80, align: 'center' },
    { kind: 'section', label: 'Contacts Without:' },
    { kind: 'radio', id: 'without', options: WITHOUT, column: true },
    { kind: 'section', label: 'Visit Codes:' },
    codeSelector('visitCodes', 'visit', '', 212, '(optional - blank for all)'),
    { kind: 'section', label: 'Status Codes:' },
    codeSelector('statusCodes', 'status', '', 212, '(optional - blank for all)'),
  ],
  pages: (ctx) => {
    const w = ctx.val('without')
    const incomplete = (v: Visit) => (w === WITHOUT[1] ? v.note === 'I' : w === WITHOUT[2] ? v.note === 'I' || v.bill === 'I' : v.bill === 'I')
    const vs = VISITS.filter((v) => inRange(v.date, ctx.val('start'), ctx.val('end')) && incomplete(v))
      .filter((v) => codeKept(ctx.val('visitCodesMode'), ctx.val('visitCodes'), v.vc) && codeKept(ctx.val('statusCodesMode'), ctx.val('statusCodes'), v.status))
    const codes = list(ctx.val('statusCodes'))
    const body: RSRow[] = []
    for (const [date, dv] of groupBy(vs, (v) => v.date)) {
      body.push('%RULE%', `%SUB%DATE: ${date}   (${weekday(date)})`, '%RULE%')
      for (const [att, av] of groupBy(dv, (v) => v.attending)) {
        body.push(`VISITS FOR PROVIDERS:        **${att}**`, '%RULE%')
        body.push(...av.map((v) => [v.time.replace(':', ' : '), v.p.first, v.p.last, v.reason, v.vc, v.diag, v.fee, v.note === 'I' ? 'I' : '', v.bill === 'I' ? 'I' : '']))
      }
    }
    return page({
      title: `VISIT BY STATUS OF ${TODAY}`,
      subs: [
        `FROM ${orDate(ctx.val('start'), '2000.01.01')} TO ${orDate(ctx.val('end'), TODAY)}`,
        w === WITHOUT[1] ? 'WITHOUT NOTE (STATUS = I)' : w === WITHOUT[2] ? 'WITHOUT BILLING OR NOTE (STATUS = I)' : 'WITHOUT BILLING (STATUS = I)',
        codes.length ? `${ctx.val('statusCodesMode')} STATUS CODES: ${codes.join(', ')}` : 'ALL STATUS CODES',
      ],
      cols: [7, 11, 16, 26, 8, 8, 8, 8, 8],
      head: ['TIME', 'NAME', '', 'REASON', 'VISIT CODE', 'DIAG CODE', 'FEE CODE', 'STATUS NOTE', 'BILL'],
      body,
    })
  },
}

/* --- 23–26. Visits-Attend/… ------------------------------------------------------------------------------------- */

const serviceRange = (required: boolean): RSField[] => [
  { kind: 'section', label: 'Service Date Range (INCLUSIVE)' },
  required ? requiredRange('service', 'From Date:') : { kind: 'range', id: 'service', label: 'From Date:', from: D0, to: D0 },
]
const reportOption = (value: 'Detail Report' | 'Summary Report'): RSField[] => [
  { kind: 'section', label: 'Report Option' },
  { kind: 'radio', id: 'option', options: ['Detail Report', 'Summary Report'], value, column: true },
]
const fromTo = (ctx: RSContext) => `FROM ${orDate(ctx.val('serviceFrom'), '2000.01.01')} TO ${orDate(ctx.val('serviceTo'), TODAY)}`
const TOT = [30, 40, 10, 20]
const totLine = (label: string, n: number) => band(TOT, ['', label, String(n), ''])

const visitsAttendApptIns: ReportSpec = {
  folder: 'Practice Management', name: 'Visits-Attend/Appt/Ins', id: 'visits-attend-appt-ins',
  width: 670, height: 540,
  provenance: '304053 89d0bd51 (window), 446ba97e (page)',
  inferred: 'Summary Report prints the same page without its visit lines (the capture is a Detail run).',
  fields: [...serviceRange(true), { kind: 'note', text: '' }, ...reportOption('Summary Report')],
  pages: (ctx) => {
    const detail = ctx.val('option') === 'Detail Report'
    const vs = visitsIn(ctx, 'service')
    const one = (att: string, g: Visit[]) => page({
      title: `VISITS BY ATTENDING/APPT STATUS/INSURER AS OF ${TODAY}`, subs: [fromTo(ctx)],
      pre: [`**PROVIDER:   ${att}**`],
      cols: [7, 7, 10, 38, 13, 7, 18], head: ['INS', 'AS', 'DIAG CODE', 'REASON FOR VISIT', 'UNIQUE ID', 'AGE', 'DATE OF SERVICE'],
      body: groupBy(g, (v) => v.status).flatMap(([st, sv]) => [
        `**APPT STATUS:   ${st}**`, '%RULE%',
        ...(detail ? sv.map((v) => ['', v.status, v.diag, v.reason, v.uid, rsAge(v.p.dob), v.date]) : []),
        ...groupBy(sv, (v) => v.ins).map(([ins, iv]) => totLine(`TOTALS FOR ${ins}:`, iv.length)),
        '%HR%', band([40, 40, 10, 10], ['', `TOTALS FOR APPT STATUS ${st}:`, String(sv.length), '']), '%HR%',
      ]),
      footer: [band([45, 40, 10, 5], ['', `TOTALS FOR PROVIDER ${att}:`, String(g.length), '']), '%HR%'],
    })
    const groups = groupBy(vs, (v) => v.attending)
    return groups.length ? groups.flatMap(([att, g]) => one(att, g)) : one('', [])
  },
}

const visitsAttendInsServiceAnon: ReportSpec = {
  folder: 'Practice Management', name: 'Visits-Attend/Ins/Service Anon', id: 'visits-attend-ins-service-anon',
  width: 670, height: 540,
  provenance: '304053 458bb9b6 (window), 4cdbcbcf (page, Detail)',
  inferred: 'Summary Report prints the totals only (per the article). "Canc, Rebook or N/S" counts the attending\'s C, R and N visits.',
  fields: [
    ...serviceRange(false),
    { kind: 'check', id: 'blanks', label: 'Service Code:', text: 'Include BLANKS' },
    ...reportOption('Detail Report'),
  ],
  pages: (ctx) => {
    const detail = ctx.val('option') !== 'Summary Report'
    const all = visitsIn(ctx, 'service')
    const one = (att: string, g: Visit[]) => {
      const billed = g.filter((v) => !['C', 'R', 'N'].includes(v.status)).filter((v) => ctx.on('blanks') || v.fee)
      const body: RSRow[] = []
      for (const [fee, fv] of groupBy(billed, (v) => v.fee)) {
        if (detail) body.push(...fv.map((v) => [v.ins, v.fee, v.diag, v.reason.toLowerCase(), v.uid, rsAge(v.p.dob), v.date]))
        body.push(band([50, 40, 10], ['', `**TOTAL VISITS FOR SERVICE CODE ${fee || 'BLANK'}:**`, `**${fv.length}**`]), '%HR%')
      }
      for (const [ins, iv] of groupBy(billed, (v) => v.ins)) body.push(band([55, 40, 5], ['', `**TOTAL VISITS FOR INSURER CODE ${ins}:**`, `**${iv.length}**`]), '%RULE%')
      return page({
        title: `VISITS BY ATTENDING/BENEFIT SOURCE/SERVICE CODE AS OF ${TODAY}`,
        subs: [`${fromTo(ctx)} ${ctx.on('blanks') ? 'INCLUDING' : 'NOT INCLUDING'} BLANK SERVICE CODES`],
        pre: [`**PROVIDER:   ${att}**`],
        cols: [7, 10, 10, 30, 16, 7, 20], head: ['INS', 'SERVICE CODE', 'DIAG CODE', 'REASON FOR VISIT', 'UNIQUE ID', 'AGE', 'SERVICE DATE'],
        body,
        footer: [
          band([45, 50, 5], ['', `**TOTAL VISIT FOR ATTENDING ${att}:**`, `**${billed.length}**`]),
          band([70, 30], ['', `(Canc, Rebook or N/S =  ${g.length - g.filter((v) => !['C', 'R', 'N'].includes(v.status)).length})`]),
          '%RULE%',
        ],
      })
    }
    const groups = groupBy(all, (v) => v.attending)
    return groups.length ? groups.flatMap(([att, g]) => one(att, g)) : one('', [])
  },
}

const visitsAttendInsurerService: ReportSpec = {
  folder: 'Practice Management', name: 'Visits-Attend/Insurer/Service Code', id: 'visits-attend-insurer-service',
  width: 670, height: 541,
  provenance: '304053 ac2bbf7f (window), 25d13e31 (page, Detail)',
  inferred: 'Summary Report prints the totals only (per the article). PHNs are fictional.',
  fields: [...serviceRange(false), { kind: 'note', text: '' }, ...reportOption('Detail Report')],
  pages: (ctx) => {
    const detail = ctx.val('option') !== 'Summary Report'
    const all = visitsIn(ctx, 'service').filter((v) => v.fee && !['C', 'R', 'N'].includes(v.status))
    const one = (att: string, g: Visit[]) => {
      const body: RSRow[] = []
      for (const [ins, iv] of groupBy(g, (v) => v.ins)) {
        for (const [fee, fv] of groupBy(iv, (v) => v.fee)) {
          if (detail) body.push(...fv.map((v) => [v.date, rsName(v.p), v.ins, phnOf(v.p), '00', v.p.dob, v.fee, v.diag]))
          body.push(band([27, 48, 10, 15], ['', `TOTAL FOR SERVICE CODE ${fee}:`, String(fv.length), '']), '%RULE%')
        }
        body.push(band([17, 48, 10, 25], ['', `TOTAL FOR INSURER ${ins}:`, String(iv.length), '']), '%RULE%')
      }
      return page({
        title: `VISITS BY ATTENDING/INSURER/SERVICE CODE ${TODAY}`,
        subs: ['(For Named Patients and Their PHN)', fromTo(ctx)],
        pre: [`**PROVIDER:   ${att}**`],
        cols: [10, 30, 4, 14, 6, 12, 12, 12], head: ['SERVICE DATE', 'NAME', 'PHN', '', '', 'DOB', 'SERVICE CODE', 'DIAG CODE'],
        body,
        footer: ['%RULE%', band([10, 48, 10, 32], ['', `TOTAL FOR PROVIDER ${att}:`, String(g.length), '']), '%RULE%'],
      })
    }
    const groups = groupBy(all, (v) => v.attending)
    return groups.length ? groups.flatMap(([att, g]) => one(att, g)) : one('', [])
  },
}

const visitsAttendVisitsIns: ReportSpec = {
  folder: 'Practice Management', name: 'Visits-Attend/Visits/Ins', id: 'visits-attend-visits-ins',
  width: 670, height: 540,
  provenance: '304053 b4496326 (window), 2d2996ab (page)',
  inferred: 'Summary Report prints the same page without its visit lines (the capture is a Detail run).',
  fields: [...serviceRange(true), { kind: 'note', text: '' }, ...reportOption('Summary Report')],
  pages: (ctx) => {
    const detail = ctx.val('option') === 'Detail Report'
    const vs = visitsIn(ctx, 'service')
    const one = (att: string, g: Visit[]) => page({
      title: `VISITS BY ATTENDING/VISIT CODE/INSURER AS OF ${TODAY}`, subs: [fromTo(ctx)],
      pre: [`**PROVIDER:   ${att}**`],
      cols: [7, 7, 10, 38, 13, 7, 18], head: ['INS', 'VC', 'DIAG CODE', 'REASON FOR VISIT', 'UNIQUE ID', 'AGE', 'DATE OF SERVICE'],
      body: groupBy(g, (v) => v.vc).flatMap(([vc, cv]) => [
        `**VISIT CODE:   ${vc}**`, '%RULE%',
        ...(detail ? cv.map((v) => ['', v.vc, v.diag, v.reason, v.uid, rsAge(v.p.dob), v.date]) : []),
        ...groupBy(cv, (v) => v.ins).map(([ins, iv]) => totLine(`TOTALS FOR ${ins}:`, iv.length)),
        '%HR%', band([40, 40, 10, 10], ['', `TOTALS FOR VISIT CODE ${vc}:`, String(cv.length), '']), '%HR%',
      ]),
      footer: [band([45, 40, 10, 5], ['', `TOTALS FOR PROVIDER ${att}:`, String(g.length), '']), '%HR%'],
    })
    const groups = groupBy(vs, (v) => v.attending)
    return groups.length ? groups.flatMap(([att, g]) => one(att, g)) : one('', [])
  },
}

/* --- 27–28. Wait List reports ------------------------------------------------------------------------------------------ */

const WAIT = rsSample(10, 3).map((p, i) => ({
  p,
  added: rsDaysAgo(812 - i * 70),
  booked: i % 3 === 2 ? '' : rsDaysAgo(20 + i * 6),
  bookedTime: ['14:30', '13:30', '', '09:15', '10:45', '', '11:00', '15:30', '', '09:00'][i]!,
  provider: PROVIDERS[i % PROVIDERS.length]!,
  type: WAIT_TYPES[1 + (i % (WAIT_TYPES.length - 1))]!,
  referBy: ['Dr. Smith', 'Dr. Yu', '', 'Dr. Doe', 'Dr. Smith', 'Dr. Wantata', '', 'Dr. Bill', '', 'Dr. Doe'][i]!,
  reason: ['', '', 'NEW PATIENT', 'Needs a new GP', '', 'Counselling intake', '', '', 'Diabetes teaching', ''][i]!,
  ended: i === 4 ? rsDaysAgo(10) : '',
}))

const waitListBooking: ReportSpec = {
  folder: 'Practice Management', name: 'Wait List - Booking Summary', id: 'wait-list-booking',
  width: 670, height: 540,
  provenance: '304053 9e412adf (window), a0e05006 (page)',
  fields: [
    { kind: 'section', label: 'Parameters' },
    requiredRange('booked', 'Booked Date:', '(inclusive)', D0, ''),
    { kind: 'select', id: 'provider', label: 'Provider:', options: 'providers', w: 140 },
    { kind: 'select', id: 'listType', label: 'List Type:', options: WAIT_TYPES, w: 140 },
  ],
  pages: (ctx) => {
    const rows = WAIT.filter((w) => w.booked && inRange(w.booked, ctx.val('bookedFrom'), ctx.val('bookedTo')))
      .filter((w) => (!ctx.val('provider') || w.provider === ctx.val('provider')) && (!ctx.val('listType') || w.type === ctx.val('listType')))
    const L = '%LINE:12,28,26,34%'
    return [[
      '**MOIS TEST CLINIC**',
      `%TITLE%BOOKING REPORT AS OF ${TODAY}`,
      '%RULE%',
      ...rows.flatMap((w) => [
        `${L}Patient:|**${rsName(w.p)}**|Provider:  **${w.provider}**|Booking Date / Time:  **${w.booked}    ${w.bookedTime}**`,
        `${L}   Contact:|Home: ${w.p.home ?? ''}|Cell: ${w.p.cell ?? ''}|List: ${w.type}`,
        `${L}|Work: ${w.p.work ?? ''}|Pager: ${w.p.pager ?? ''}|Facilty: MOIS TEST CLINIC`,
        `${L}Referred By: ${w.referBy}||Reason: ${w.reason}|Deparment: `,
        '%HR%',
      ]),
    ].join('\n')]
  },
}

const waitListSummary: ReportSpec = {
  folder: 'Practice Management', name: 'Wait List Summary', id: 'wait-list-summary',
  width: 670, height: 540,
  provenance: '304053 1ae483cc (window), 2f3f0576 (page, ordered by Patient)',
  inferred: 'The group headings for the Provider / Wait List orderings (the capture is a Patient-ordered run). W.T. is days on the list.',
  fields: [
    { kind: 'section', label: 'Parameters' },
    requiredRange('listed', 'Listed Date:', '(inclusive)', D0, ''),
    { kind: 'select', id: 'provider', label: 'Provider:', options: 'providers', w: 140 },
    { kind: 'select', id: 'listType', label: 'List Type:', options: WAIT_TYPES, w: 140 },
    { kind: 'text', id: 'reason', label: 'Reason:', w: 216, hint: '(includes)' },
    { kind: 'section', label: 'Include' },
    { kind: 'radio', id: 'records', label: 'Records:', options: ['All Records', 'Waiting Records (w/o end date)'], value: 'Waiting Records (w/o end date)', column: true },
    { kind: 'section', label: 'Groups and Sorting' },
    { kind: 'radio', id: 'ordering', label: 'Ordering:', options: ['Patient', 'Provider', 'Provider and Wait List', 'Wait List'], column: true },
  ],
  pages: (ctx) => {
    const days = (d: string) => {
      const [y, m, dd] = d.split('.').map(Number)
      const [ty, tm, td] = TODAY.split('.').map(Number)
      return String(Math.round((Date.UTC(ty!, tm! - 1, td!) - Date.UTC(y!, m! - 1, dd!)) / 86400000))
    }
    const rows = WAIT.filter((w) => inRange(w.added, ctx.val('listedFrom'), ctx.val('listedTo')))
      .filter((w) => (!ctx.val('provider') || w.provider === ctx.val('provider')) && (!ctx.val('listType') || w.type === ctx.val('listType')))
      .filter((w) => rsLike(ctx.val('reason'), w.reason))
      .filter((w) => ctx.val('records') === 'All Records' || !w.ended)
      .sort((a, b) => a.added.localeCompare(b.added))
    const ord = ctx.val('ordering')
    const key = (w: typeof rows[number]) => (ord === 'Provider' ? `PROVIDER: ${w.provider}` : ord === 'Wait List' ? `WAIT LIST: ${w.type}`
      : ord === 'Provider and Wait List' ? `PROVIDER: ${w.provider}  -  WAIT LIST: ${w.type}` : '')
    const line = (w: typeof rows[number], i: number) => [String(i + 1), mdy(w.added), days(w.added), w.p.last, w.p.first, w.referBy, w.reason]
    const body: RSRow[] = ord === 'Patient' || !ord
      ? rows.map(line)
      : groupBy(rows, key).flatMap(([k, g]) => [`%S%${k}`, ...g.map(line)])
    return page({
      title: `WAIT LIST REPORT AS OF ${TODAY}`,
      cols: [6, 12, 6, 16, 16, 16, 28],
      head: ['POS.', 'DATE ADDED', 'W.T.', 'LAST NAME', 'FIRST NAME', 'REFER BY', 'REASON'],
      body,
    })
  },
}

export const specs: ReportSpec[] = [
  carePlanAudit, dataCreationSummary, consultsReferSeen, consultsSummary, dailyAppointments, healthIssueSummary,
  incentiveAudit, incentiveRegistry, incentiveSchedule, ltmSummary, messagesTasksAudit, messagesDateRange,
  patientPreferenceSettings, patientRegistration, patientsByCity, patientsByServiceCenter, reactionRiskSummary,
  avgDiag, visitAudit, visitModeCodeStatus, visitStatus, billNoteStatus, visitsAttendApptIns,
  visitsAttendInsServiceAnon, visitsAttendInsurerService, visitsAttendVisitsIns, waitListBooking, waitListSummary,
]
