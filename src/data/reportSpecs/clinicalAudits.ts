import type { Patient } from '../patients'
import {
  MOIS_TODAY, RS_FACILITIES, RS_PROVIDERS, RS_SERVICE_CENTERS, rsAge, rsDaysAgo, rsName,
  type ReportSpec, type RSContext, type RSField,
} from './types'

/* ============================================================================
   Report specs transcribed from manual article 304048 (Clinical - Audits).
   PROVENANCE: per spec below; the folder's rows are 304048 `e00e330a`.

   Three kinds of window live in this folder:

   · The "(Excel)" disease audits (Asthma, CHF, CKD, COPD, Diabetes, Hep C,
     HTN). Their Selection Parameter pane is a read-only list, not a form:
     bold headings (<DISEASE> AUDIT INFORMATION, PATIENT SELECTION, CHART
     ELEMENT - MEASURE / CONSULT / MAR, ENCOUNTER FORM ELEMENTS) over label /
     value lines — "This window has set options for generating an Excel
     report". Each is drawn with label / value `columns` of notes and is
     `excelOnly`. No capture shows their Excel output, so its columns are
     INFERRED from the elements the window lists: patient identity, then a
     value and a date per measure, a date per consult and MAR item, and the
     most recent entry per encounter-form element.
   · The Selection Options forms (Mammogram, Number of Visits, Obesity, Pap
     Smear, Polypharmacy): Active Patients Only, Age Range, Last Contact …
     and CSV Output ▸ Direct Output to Excel. Their pages carry a two-line
     sub-title and totals under the columns, so each has `pages` for the
     print and `output` for the Excel sheet, both from one row builder.
   · Scorecard (AMCARE): its own window, `report-params-amcare-scorecard`
     (screens/reports/AuditReportWindows.tsx) — it has a third button,
     Previous Scorecard…, the generic window does not draw. Its page and
     deficient-items sheet are built here (`amcareScorecardPage`,
     `amcareDeficientSheet`).

   Scorecard - Clinical Value keeps its hand-built window
   (screens/ScorecardWindow.tsx); no spec is written for it.

   All sample rows are fictional, over the emulator's roster.
   ========================================================================= */

/* --- shared helpers ------------------------------------------------------- */
const num = (s: string) => (s.trim() === '' ? NaN : Number(s))
const ageOf = (p: Patient) => Number(rsAge(p.dob))
/** a stable 0..n-1 per chart, so a patient keeps its sample values */
const pick = (p: Patient, n: number, salt = 0) => (Number(p.chart.replace(/\D/g, '') || 0) * 7 + salt * 13) % n

/** the roster the Selection Options pick from: Active Patients Only, Age Range (blank or 0 ignored), sex */
function selected(ctx: RSContext, opts: { sex?: 'F'; active?: string; age?: string } = {}): Patient[] {
  const from = num(ctx.val(`${opts.age ?? 'age'}From`))
  const to = num(ctx.val(`${opts.age ?? 'age'}To`))
  return ctx.patients
    .filter((p) => p.dob && (p.gender === 'M' || p.gender === 'F'))
    .filter((p) => !ctx.on(opts.active ?? 'active') || p.status === 'A')
    .filter((p) => !opts.sex || p.gender === opts.sex)
    .filter((p) => (Number.isNaN(from) || from === 0 || ageOf(p) >= from) && (Number.isNaN(to) || to === 0 || ageOf(p) <= to))
    .sort((a, b) => rsName(a).localeCompare(rsName(b)))
}

const statusLine = (ctx: RSContext) =>
  `PATIENT STATUS: ${ctx.on('active') ? 'ACTIVE' : 'ALL'}     LAST CONTACT / VISIT WITHIN LAST ${ctx.val('lastContact') || '3'} yrs`
const agesLine = (ctx: RSContext) => `AGES BETWEEN: ${ctx.val('ageFrom') || '0'} and ${ctx.val('ageTo') || '120'}`

/** the page heading as the generic renderer draws it, plus extra sub-title lines */
function paged(title: string, subs: string[], cols: string, th: string, body: string[], footer: string[]): string[] {
  const head = ['**MOIS TEST CLINIC**', `%TITLE%${title}`, '%RULE%', ...subs.map((s) => `%SUB%${s}`), cols, `%TH%${th}`]
  const pages: string[] = []
  for (let i = 0; i < Math.max(1, body.length); i += 30) {
    pages.push([...head, ...body.slice(i, i + 30), ...(i + 30 >= body.length ? footer : [])].join('\n'))
  }
  return pages
}

/** "Patients List: ☑ Active Patients Only", "Age Range", "Last Contact" */
const selectionOptions = (ageFrom: string, ageTo: string, ageHint = '(Leave blank to ignore)', list = 'Patients List:'): RSField[] => [
  { kind: 'section', label: 'Selection Options' },
  { kind: 'check', id: 'active', label: list, text: 'Active Patients Only', checked: true },
  { kind: 'range', id: 'age', label: 'Age Range:', from: ageFrom, to: ageTo, w: 52, hint: ageHint },
]
const lastContact: RSField = { kind: 'text', id: 'lastContact', label: 'Last Contact:', value: '3', w: 52, align: 'center', hint: '(Years since last contact)' }
const csvOutput: RSField[] = [
  { kind: 'rule' },
  { kind: 'check', id: 'excel', label: 'CSV Output:', text: 'Direct Output to Excel', output: 'excel' },
]

/* ===========================================================================
   The (Excel) disease audits
   ======================================================================== */
type Pair = [label: string, value?: string]
type ExcelAudit = {
  name: string; id: string; heading: string; concept: string
  measures: Pair[]; consults?: Pair[]; mar: Pair[]; forms: Pair[]
  width: number; height: number; hash: string
  /** the capture's scroll bar shows more lines below the last one it paints */
  truncated?: boolean
  /** roster offset for the sample rows */
  from: number
}

const MRE = 'Last Result (MOST RECENT)'
const MAR_FLU_PNEU: Pair[] = [['INFLUENZA VACCINATION', 'INFLUENZA VACCINE'], ['PNEUMOCOCCAL VACCINATION', 'PNEUMOCOCCAL VACCINE']]
const MAR_HEP: Pair[] = [['HEPATITIS A VACCINATION', 'HEP A VACCINE'], ['HEPATITIS B VACCINATION', 'HEP B VACCINE']]
const LIFESTYLE: Pair[] = [['HEIGHT'], ['WEIGHT'], ['CIGARETTES SMOKED PACKS PER DAY'], ['PHYSICAL ACTIVITY MINUTES PER WEEK']]

const EXCEL_AUDITS: ExcelAudit[] = [
  {
    name: 'ASTHMA (Excel)', id: 'audit-asthma', heading: 'ASTHMA AUDIT INFORMATION', concept: 'ASTHMA',
    measures: [['FEV1%PREB', 'FEV1PREB'], ['FEV1%POST'], ['FEV1/FVCPR'], ['FEV1/FVCPO'], ['PEAK EXPIRATORY FLOW'], ...LIFESTYLE],
    mar: MAR_FLU_PNEU,
    forms: [['Most Recent Entry for Short Acting Beta Agonists', MRE], ['Most Recent Entry for Long Acting Beta Agonists', MRE],
      ['Most Recent Entry for Anticholinergic Bronchodilators', MRE]],
    width: 658, height: 549, hash: '68fe16e8', truncated: true, from: 0,
  },
  {
    name: 'CHF (Excel)', id: 'audit-chf', heading: 'CHF AUDIT INFORMATION', concept: 'CHF',
    measures: [['CARDIAC EJECTION FRACTION'], ['BP'], ...LIFESTYLE],
    mar: MAR_FLU_PNEU,
    forms: [['Most Recent Entry for ACE Inhibitor', MRE], ['Most Recent Entry for Beta Blocker', MRE], ['Most Recent Entry for ARB', MRE],
      ['Most Recent Entry for Diuretic', MRE], ['Sodium Intake', 'Last Value'], ['Fluid Intake', 'Last Value']],
    width: 658, height: 547, hash: 'b5a212c2', truncated: true, from: 2,
  },
  {
    name: 'CHRONIC KIDNEY DISEASE (Excel)', id: 'audit-ckd', heading: 'CHRONIC KIDNEY DISEASE AUDIT INFORMATION', concept: 'CHRONIC KIDNEY DISEASE',
    measures: [['BP'], ['HEIGHT'], ['WEIGHT'], ['GFR'], ['UALB/CR'], ['LDL'], ['HDL'], ['HEMOGLOBIN'], ['IRON SATURATION'], ['SERUM CALCIUM'], ['PO4'], ['IPTH']],
    mar: [...MAR_FLU_PNEU, ...MAR_HEP],
    forms: [],
    width: 651, height: 543, hash: '6b090b06', truncated: true, from: 4,
  },
  {
    name: 'COPD Audit', id: 'audit-copd', heading: 'COPD AUDIT INFORMATION', concept: 'COPD',
    measures: [['FEV1%POST'], ['FEV1/FVCPO'], ...LIFESTYLE, ['MRC DYSPNEA SCALE']],
    consults: [['RESPIRATORY ASSESSMENT']],
    mar: MAR_FLU_PNEU,
    forms: [['Most Recent Entry for Short Acting Bronchodilator', MRE], ['Most Recent Entry for Long Acting Bronchodilator', MRE],
      ['Most Recent Entry for Inhaled Anticholinergic', MRE]],
    width: 657, height: 545, hash: '921f4fea', truncated: true, from: 6,
  },
  {
    name: 'Diabetes (Excel)', id: 'audit-diabetes', heading: 'DIABETES AUDIT INFORMATION', concept: 'DIABETES',
    measures: [['HGBA1C'], ['LDL'], ['BP'], ['UMICALB']],
    consults: [['OPHTHALMOLOGY ASSESSMENT'], ['DIABETES EDUCATION ASSESSMENT']],
    mar: MAR_FLU_PNEU,
    forms: [['Most Recent Entry for ACEI', MRE], ['Most Recent Entry for ARB', MRE], ['Most Recent Entry for ASA', MRE],
      ['Last Positive Entry for Foot Exam', 'Last Value']],
    width: 656, height: 546, hash: '5820b060', from: 8,
  },
  {
    name: 'Hepatitis C (Excel)', id: 'audit-hepc', heading: 'HEPC AUDIT INFORMATION', concept: 'HEPC',
    measures: [['ALANINE AMINOTRANSFERASE'], ['HEP C RNA PCR']],
    consults: [['HEP C ASSESSMENT']],
    mar: MAR_HEP,
    forms: [['Most Recent Entry for Treatment Criteria', MRE], ['Most Recent Entry for Treatment Outcome', MRE],
      ['Most Recent Entry for Absolute Contraind', MRE], ['Most Recent Entry for Relative Contraind', MRE],
      ['Last Positive Entry for Alcohol Counseling', 'Last Value'], ['Last Positive Entry for Transmission Counseling', 'Last Value']],
    width: 659, height: 547, hash: '4b10102c', from: 10,
  },
  {
    name: 'HTN (Excel)', id: 'audit-htn', heading: 'HYPERTENSION AUDIT INFORMATION', concept: 'HYPERTENSION',
    measures: [['ECG'], ['BP'], ...LIFESTYLE, ['ALCOHOL CONSUMPTION'], ['FRAMINGHAM CARDIAC RISK'], ['LDL'], ['HDL'],
      ['SERUM CREATININE'], ['GFR'], ['FASTING GLUCOSE'], ['UALB/CR']],
    mar: MAR_FLU_PNEU,
    forms: [],
    width: 660, height: 548, hash: 'd2a28ef1', truncated: true, from: 12,
  },
]

/** fictional results per chart element; anything unlisted gets a plain number */
const SAMPLE_VALUES: Record<string, string[]> = {
  FEV1PREB: ['2.41', '3.10', '1.87', '2.95', '2.22'], 'FEV1%POST': ['78', '84', '66', '91', '72'],
  'FEV1/FVCPR': ['0.71', '0.78', '0.64', '0.82'], 'FEV1/FVCPO': ['0.74', '0.80', '0.66', '0.69'],
  'PEAK EXPIRATORY FLOW': ['380', '420', '310', '455'], HEIGHT: ['162', '175', '158', '181', '169'],
  WEIGHT: ['68.2', '91.4', '57.0', '102.3', '77.8'], 'CIGARETTES SMOKED PACKS PER DAY': ['0', '0.5', '0', '1'],
  'PHYSICAL ACTIVITY MINUTES PER WEEK': ['150', '60', '210', '0', '90'], 'CARDIAC EJECTION FRACTION': ['35', '42', '55', '28'],
  BP: ['128/82', '142/90', '118/76', '136/84', '151/94'], GFR: ['48', '62', '37', '55'], 'UALB/CR': ['2.8', '14.1', '31.0', '6.4'],
  LDL: ['2.1', '3.4', '2.6', '1.9'], HDL: ['1.2', '0.9', '1.5', '1.1'], HEMOGLOBIN: ['128', '112', '141', '119'],
  'IRON SATURATION': ['0.22', '0.31', '0.18'], 'SERUM CALCIUM': ['2.31', '2.40', '2.18'], PO4: ['1.1', '1.4', '0.9'], IPTH: ['7.2', '12.5', '5.8'],
  'MRC DYSPNEA SCALE': ['2', '3', '4', '1'], HGBA1C: ['7.1', '8.4', '6.6', '9.2', '6.9'], UMICALB: ['1.8', '4.2', '0.9', '12.0'],
  'ALANINE AMINOTRANSFERASE': ['42', '88', '31', '120'], 'HEP C RNA PCR': ['NOT DETECTED', 'DETECTED', 'NOT DETECTED'],
  ECG: ['NORMAL', 'LVH', 'NORMAL', 'ABNORMAL'], 'ALCOHOL CONSUMPTION': ['2', '0', '7', '14'], 'FRAMINGHAM CARDIAC RISK': ['8', '14', '21', '5'],
  'SERUM CREATININE': ['88', '104', '131', '76'], 'FASTING GLUCOSE': ['5.4', '6.8', '7.4', '5.9'],
}
const FORM_VALUES = ['SALBUTAMOL', 'Y', 'N', 'RAMIPRIL', 'METOPROLOL', 'Y', '']

/** "Most Recent Entry for Short Acting Beta Agonists" → "Short Acting Beta Agonists" */
const formColumn = (label: string) => label.replace(/^(Most Recent|Last Positive) Entry for /, '')

function excelAuditSpec(a: ExcelAudit): ReportSpec {
  const pairs = (list: Pair[]): RSField => ({
    kind: 'columns',
    columns: [list.map(([l]) => ({ kind: 'note', text: l })), list.map(([l, v]) => ({ kind: 'note', text: v ?? l }))],
  })
  const block = (label: string, list?: Pair[]): RSField[] => (list?.length ? [{ kind: 'section', label }, pairs(list)] : [])
  const valueOf = (l: Pair) => l[1] ?? l[0]
  const head = [
    'CHART', 'PATIENT NAME', 'DOB', 'AGE', 'SEX', 'HOME PHONE', 'HEALTH ISSUE',
    ...a.measures.flatMap((m) => [valueOf(m), `${valueOf(m)} DATE`]),
    ...(a.consults ?? []).map((c) => `${valueOf(c)} DATE`),
    ...a.mar.map((m) => `${valueOf(m)} DATE`),
    ...a.forms.map((f) => formColumn(f[0])),
  ]
  /* six adults per audit, a different six for each (the roster is small, so it wraps) */
  const cohort = (all: Patient[]) => {
    const adults = all.filter((p) => p.dob && p.status === 'A' && ageOf(p) >= 18)
    return Array.from({ length: Math.min(6, adults.length) }, (_, i) => adults[(a.from + i) % adults.length]!)
  }
  const rows = (ctx: RSContext): string[][] => cohort(ctx.patients)
    .sort((x, y) => rsName(x).localeCompare(rsName(y)))
    .map((p, i) => [
      p.chart, rsName(p), p.dob, rsAge(p.dob), p.gender, p.home ?? '', a.concept,
      ...a.measures.flatMap((m, j) => {
        const vals = SAMPLE_VALUES[valueOf(m)]
        if ((i + j) % 5 === 4) return ['', '']
        return [vals ? vals[(i + j) % vals.length]! : String(10 + ((i * 7 + j * 3) % 40)), rsDaysAgo(20 + i * 31 + j * 9)]
      }),
      ...(a.consults ?? []).map((_, j) => ((i + j) % 3 === 2 ? '' : rsDaysAgo(90 + i * 45 + j * 20))),
      ...a.mar.map((_, j) => ((i + j) % 4 === 3 ? '' : rsDaysAgo(200 + i * 30 + j * 60))),
      ...a.forms.map((_, j) => FORM_VALUES[(i + j) % FORM_VALUES.length]!),
    ])
  return {
    folder: 'Clinical - Audits',
    name: a.name,
    id: a.id,
    width: a.width,
    height: a.height,
    labelW: 300,
    provenance: `304048 ${a.hash} (window), none (page)`,
    inferred: 'No Excel output is captured: the sheet columns (identity, a value and date per measure, a date per consult / MAR item, '
      + 'the most recent entry per encounter-form element) are inferred from the elements the window lists. '
      + 'The window is drawn as label / value note columns rather than its ruled read-only grid with black headings.'
      + (a.truncated ? " The capture's list scrolls past its last painted line; only the painted lines are transcribed." : ''),
    excelOnly: true,
    fields: [
      ...block(a.heading, [['Health Issue Concept', a.concept], ['Include items w/ Resolve Date', 'N']]),
      ...block('PATIENT SELECTION', [['Patient Status', "'A'"], ['Last Contact', 'Last 3 year(s)']]),
      ...block('CHART ELEMENT - MEASURE', a.measures),
      ...block('CHART ELEMENT - CONSULT', a.consults),
      ...block('CHART ELEMENT - MAR', a.mar),
      ...block('ENCOUNTER FORM ELEMENTS', a.forms),
    ],
    output: {
      title: `${a.concept} AUDIT`,
      cols: head.map(() => Math.max(1, Math.floor(100 / head.length))),
      head,
      rows,
      chartCol: 0,
    },
  }
}

/* ===========================================================================
   Mammogram / Pap Smear — years since the last result, bucketed
   ======================================================================== */
type Bucketed = { p: Patient; bucket: number; hyst?: boolean }
/** bucket 0 is "within the window" (not printed, only counted); the last is NEVER */
function bucketed(ctx: RSContext, buckets: number, salt: number): Bucketed[] {
  return selected(ctx, { sex: 'F' }).slice(0, 14).map((p) => {
    const h = pick(p, 9, salt)
    const bucket = h < 2 ? 0 : h < buckets ? h - 1 : buckets - 1
    return { p, bucket: Math.min(bucket, buckets - 1), hyst: pick(p, 5, salt + 1) === 0 }
  })
}

function bucketSpec(o: {
  name: string; id: string; title: string; head: string[]; cols: number[]; salt: number; hyst?: boolean
  footnote: string; fields: RSField[]; provenance: string; inferred?: string; width: number; height: number; subs: (ctx: RSContext) => string[]
}): ReportSpec {
  const n = o.head.length - 2 - (o.hyst ? 1 : 0) // the year columns
  const cells = (b: Bucketed) => [
    rsName(b.p), rsAge(b.p.dob),
    ...Array.from({ length: n }, (_, i) => (i === b.bucket ? 'X' : '')),
    ...(o.hyst ? [b.hyst ? 'Y' : '-'] : []),
  ]
  const printed = (ctx: RSContext) => bucketed(ctx, n, o.salt).filter((b) => b.bucket > 0)
  const totals = (ctx: RSContext) => {
    const all = bucketed(ctx, n, o.salt)
    return Array.from({ length: n }, (_, i) => String(all.filter((b) => b.bucket === i).length))
  }
  const colsLine = `%COLS:${o.cols.join(',')}%`
  return {
    folder: 'Clinical - Audits',
    name: o.name,
    id: o.id,
    width: o.width,
    height: o.height,
    provenance: o.provenance,
    inferred: o.inferred,
    fields: o.fields,
    pages: (ctx) => {
      const all = bucketed(ctx, n, o.salt)
      const hyst = o.hyst ? [String(all.filter((b) => b.hyst).length)] : []
      return paged(o.title, o.subs(ctx), colsLine, o.head.join('|'), printed(ctx).map((b) => `%TR%${cells(b).join('|')}`), [
        '%RULE%', colsLine, `%TR%TOTAL PATIENTS: ${all.length}||${totals(ctx).join('|')}${hyst.length ? `|${hyst[0]}` : ''}`, '%RULE%', `**${o.footnote}**`,
      ])
    },
    output: {
      title: o.title,
      cols: o.cols,
      head: o.head,
      rows: (ctx) => printed(ctx).map(cells),
      excelHead: ['NAME', 'CHART', 'DOB', 'DOCTOR', ...o.head.slice(1)],
      excelRows: (ctx) => printed(ctx).map((b) => {
        const c = cells(b)
        return [c[0]!, b.p.chart, b.p.dob, RS_PROVIDERS[1 + pick(b.p, RS_PROVIDERS.length - 1)]!, ...c.slice(1)]
      }),
      chartCol: 1,
    },
  }
}

/* ===========================================================================
   Obesity
   ======================================================================== */
type Obese = { p: Patient; ht: string; wt: string; wtDate: string; bmi: string; wc: string; wcDate: string }
const usDate = (d: string) => { const [y, m, dd] = d.split('.').map(Number); return `${m}/${dd}/${y}` }
function obesityRows(ctx: RSContext): { all: Patient[]; rows: Obese[] } {
  const all = selected(ctx).slice(0, 21)
  const rows = all.filter((p) => pick(p, 2) === 0).map((p, i) => {
    const f = p.gender === 'F'
    const ht = pick(p, 4, 1) === 3 ? '' : String((f ? 157 : 170) + pick(p, 18, 2))
    const wt = String((f ? 57 : 72) + pick(p, 50, 3) + (i % 2 ? 0.5 : 0))
    const bmi = ht ? (Number(wt) / (Number(ht) / 100) ** 2).toFixed(2) : ''
    const d = rsDaysAgo(40 + i * 97)
    const wc = pick(p, 3, 4) === 0 ? '' : String((f ? 80 : 90) + pick(p, 30, 5))
    return { p, ht, wt, wtDate: usDate(d), bmi, wc, wcDate: wc ? usDate(d) : '' }
  })
  return { all, rows }
}
function obesityFooter(all: Patient[], rows: Obese[]): string[] {
  const band = (lo: number, hi: number) => String(rows.filter((r) => r.bmi && Number(r.bmi) >= lo && Number(r.bmi) < hi).length)
  const wcOver = (sex: 'M' | 'F', cm: number) => String(rows.filter((r) => r.p.gender === sex && r.wc && Number(r.wc) >= cm).length)
  const count = (f: (r: Obese) => boolean) => String(rows.filter(f).length)
  return [
    '%RULE%',
    `%LINE:22,8,70%PATIENTS SELECTED:|${all.length}|(in age and last contact range, status criteria)`,
    `%LINE:22,8,70%   WITH AT LEAST 1 VALUE:|${rows.length}|(have one or more of HT,WT, and WC measured)`,
    `%LINE:22,8,70%   WC ONLY:|${count((r) => !!r.wc && !r.ht && !r.wt)}|`,
    `%LINE:22,8,70%   HEIGHT ONLY:|${count((r) => !!r.ht && !r.wt)}|`,
    `%LINE:22,8,70%   WEIGHT ONLY:|${count((r) => !!r.wt && !r.ht)}|`,
    `%LINE:22,8,70%   HEIGHT AND WEIGHT:|${count((r) => !!r.ht && !!r.wt)}|`,
    '%HR%',
    `%LINE:32,12,6,28,22%|BMI 18.5 - 24.9 :|${band(18.5, 25)}|WAIST CIRCUMFERENCE|`,
    `%LINE:32,12,6,28,22%|BMI 25.0 - 29.9 :|${band(25, 30)}|   MALES >= 102 cm:|${wcOver('M', 102)}`,
    `%LINE:32,12,6,28,22%|BMI 30.0 - 34.9  (I):|${band(30, 35)}|   FEMALES >= 88 cm:|${wcOver('F', 88)}`,
    `%LINE:32,12,6,50%|BMI 35.0 - 40.0 (II):|${band(35, 40)}|`,
    `%LINE:32,12,6,50%|BMI 40.0 +      (III):|${band(40, 999)}|`,
    '%RULE%',
  ]
}
const obesityCells = (r: Obese) => [rsName(r.p), rsAge(r.p.dob), r.p.gender, r.ht, r.wt, r.wtDate, r.bmi, r.wc, r.wcDate]

/* ===========================================================================
   Number of Visits / Polypharmacy
   ======================================================================== */
function visitRows(ctx: RSContext): { p: Patient; visits: number; last: string }[] {
  const n = Number.parseInt(ctx.val('number'), 10) || 0
  const less = ctx.val('visits').startsWith('Less')
  return selected(ctx).slice(0, 40)
    .map((p, i) => ({ p, visits: 2 + pick(p, 27, 6), last: pick(p, 6, 7) === 0 ? '' : rsDaysAgo(12 + i * 23) }))
    .filter((r) => (less ? r.visits <= n : r.visits >= n))
    .slice(0, 14)
}
const visitCells = (r: { p: Patient; visits: number; last: string }) =>
  [rsName(r.p), r.p.chart, r.p.gender, rsAge(r.p.dob), r.p.dob, r.last, String(r.visits)]

const MEDS = ['METFORMIN', 'RAMIPRIL', 'ATORVASTATIN', 'SALBUTAMOL', 'LEVOTHYROXINE', 'AMLODIPINE', 'FUROSEMIDE', 'OMEPRAZOLE', 'SERTRALINE', 'ASA']
function polyRows(ctx: RSContext): { p: Patient; drugs: number }[] {
  const min = Number.parseInt(ctx.val('meds'), 10) || 1
  const excl = ctx.val('excluding').trim().toUpperCase()
  return selected(ctx).slice(0, 30).map((p) => {
    const count = pick(p, 9, 8)
    const list = Array.from({ length: count }, (_, i) => MEDS[(pick(p, MEDS.length, 9) + i) % MEDS.length]!)
    return { p, drugs: excl ? list.filter((m) => !m.includes(excl)).length : list.length }
  }).filter((r) => r.drugs >= min && r.drugs > 0).slice(0, 12)
}
const polyCells = (r: { p: Patient; drugs: number }) =>
  [r.p.last, r.p.first, rsAge(r.p.dob), r.p.gender, r.p.dob, String(r.drugs), r.p.home ?? '', r.p.work ?? '', r.p.cell ?? '']

/* ===========================================================================
   Scorecard (AMCARE) — page and deficient-items sheet for the hand-built
   window in screens/reports/AuditReportWindows.tsx
   ======================================================================== */
/** the items of the AMCARE Scorecard Concepts Table (304048), in its order */
export const AMCARE_ITEMS: [section: string, item: string][] = [
  ['Prevention', 'Current Tobacco use age 12-19'], ['Prevention', 'Current Tobacco use age >19'],
  ['Prevention', 'Tobacco use documented in last 2 yrs age 12-19'], ['Prevention', 'Tobacco use documented in last 2 yrs age >19'],
  ['Prevention', 'Overweight or Obese age 12-19'], ['Prevention', 'Truncal Obesity age >19'],
  ['Prevention', 'BMI or WC documented in last 2 yrs age 12-19'], ['Prevention', 'BMI or WC documented in last 2 yrs age >19'],
  ['Prevention', 'Physical Inactivity age 12-19'], ['Prevention', 'Physical Inactivity age >19'],
  ['Prevention', 'Activity documentation in last 2 yrs age 12-19'], ['Prevention', 'Activity documentation in last 2 yrs age >19'],
  ['Prevention', 'Pneumococcal Vaccination age 65+'], ['Prevention', 'Influenza Vaccination age 65+'],
  ['Screening', 'Cervical Screening (F18-70, last 2 yrs) - BCCA pre 2016'], ['Screening', 'Cervical Screening (F25-70, last 3 yrs) - BCCA 2016'],
  ['Screening', 'Screening Mammogram (F50-70)'], ['Screening', 'Chlamydia Testing in last 12 months (F18-24)'],
  ['Screening', 'Chlamydia Test with POS result'], ['Screening', 'Colon Screening in last 2 yrs age 50-74'],
  ['Screening', 'Cholesterol in last 5 yrs (M35-65)'], ['Screening', 'Fasting blood sugar in last 3 yrs age >45'],
  ['Screening', 'Abdominal Aortic Aneurism Screening (M65-80)'], ['Screening', 'Osteoporosis Assessment in last 5 yrs (F60-79)'],
  ['Screening', 'HIV Screening age 18-70 in last year (Males)'], ['Screening', 'HIV Screening 18-70 in last 5 yrs (Males)'],
  ['Screening', 'HIV Screening age 18-70 in last year (Females)'], ['Screening', 'HIV Screening age 18-70 in last 5 yrs (Females)'],
  ['Screening', 'STI/BBP testing and associated HIV test over one year'],
  ['Screening', 'PHARMACOLOGY - 65 yrs and 5+ meds'], ['Screening', 'PHARMACOLOGY - 65 yrs and 10+ meds'],
  ['CDM', 'Diabetics with HGBA1C in last 6 mo'], ['CDM', 'Diabetics with HGBA1C in last yr <= 7.0'],
  ['CDM', 'Diabetics with LDL in last yr <= 2.5'], ['CDM', 'Diabetes & BP <= 130/80 in last yr'],
  ['CDM', 'Diabetes & Triple Whammy in last yr'], ['CDM', 'Hypertension & BP in last yr'],
  ['CDM', 'Hypertension & BP <= 140/90 in last yr'], ['CDM', 'Asthma and FEV1 at anytime'],
  ['CDM', 'Asthma and Peak Flow in last year'], ['CDM', 'Asthma and non-smoker'],
  ['CDM', 'COPD and pneumococcal vaccine'], ['CDM', 'COPD and FEV1 at anytime'], ['CDM', 'COPD and non-smoker'],
  ['CDM', 'COPD and Activity Assessment in last year'], ['CDM', 'CHF and WT Measured in last 6 months'],
  ['CDM', 'CHF and Ejection Fraction Measured in last 3 yrs'], ['CDM', 'CHF and BETABLOCKER'], ['CDM', 'CHF and ACEI'],
  ['CDM', 'CHRONIC PAIN - Opioids Use'], ['CDM', 'HEP C and RNA PCR Measured in last 2 yrs'],
  ['CDM', 'CALGFR < 60 and BP Measured in last 6 mo'], ['CDM', 'CKD & BP in last yr'], ['CDM', 'CKD & BP <= 130/80 in last yr'],
  ['CDM', 'CKD with ALB/CR in last yr in target range'], ['CDM', 'Frailty and LOI assessment in last yr'],
  ['CDM', 'Frailty and falls assessment in last year'], ['CDM', 'Schizophrenia/Bipolar and visit in last yr'],
  ['CDM', 'Depression and visit in last yr'], ['CDM', 'Unsafe drug - visit in last yr age 12-19'],
  ['CDM', 'Unsafe drug use and visit in last yr age >19'], ['CDM', 'Unsafe alcohol use - visit in last yr age 12-19'],
  ['CDM', 'Unsafe alcohol use - visit in last yr age >19'], ['CDM', 'MENTAL HEALTH - GAF in last year'],
  ['CDM', 'Rheumatoid Arthritis - at least 1 RA Disease Activity in last year'],
]

export type AmcareOptions = {
  version: string; asOf: string; period: string; allProviders: boolean
  facility: string; service: string; active: boolean
}

function amcarePatients(o: AmcareOptions, all: Patient[]): Patient[] {
  return all.filter((p) => (!o.active || p.status === 'A') && (!o.facility || !p.facility || p.facility === o.facility))
}

/** synthetic performed / eligible tallies, stable per item and patient count */
function amcareTallies(o: AmcareOptions, all: Patient[]): { section: string; item: string; perf: number; elig: number }[] {
  const n = amcarePatients(o, all).length
  const scale = o.allProviders ? 1 : 0.4
  return AMCARE_ITEMS.map(([section, item], i) => {
    const elig = Math.max(1, Math.round(((3 + ((i * 7) % 25)) * n * scale) / 28))
    const perf = Math.min(elig, Math.floor((elig * ((i * 37) % 100)) / 100))
    return { section, item, perf, elig }
  })
}

/** The scorecard's printed pages: the Age/Sex block, then each item (304048 `1bd39e02`). */
export function amcareScorecardPage(o: AmcareOptions, all: Patient[]): string[] {
  const pts = amcarePatients(o, all)
  const known = pts.filter((p) => p.dob && (p.gender === 'M' || p.gender === 'F'))
  const contacts = (p: Patient) => pick(p, 10, 11)
  const cp = (c: number, n: number) => (n ? (c / n).toFixed(2) : '0.00')
  const bands = Array.from({ length: 10 }, (_, i) => [i * 10, i === 9 ? 999 : i * 10 + 9] as const)
  const side = (sex: 'M' | 'F', lo: number, hi: number) => {
    const list = known.filter((p) => p.gender === sex && ageOf(p) >= lo && ageOf(p) <= hi)
    const c = list.reduce((s, p) => s + contacts(p), 0)
    return { n: list.length, c }
  }
  const demo = '%COLS:14,15,15,12,15,15,14%'
  const rows = bands.map(([lo, hi]) => {
    const m = side('M', lo, hi)
    const f = side('F', lo, hi)
    const label = hi === 999 ? '90 - 100+' : `${lo} - ${hi}`
    return `%TR%${cp(m.c, m.n)}|${m.c}|${m.n}|${label}|${f.n}|${f.c}|${cp(f.c, f.n)}`
  })
  const tm = side('M', 0, 999)
  const tf = side('F', 0, 999)
  const provider = o.allProviders ? 'ALL PROVIDERS' : 'CURRENT DESKTOP'
  const items = amcareTallies(o, all).map((t) =>
    `%TR%${t.section}|${t.item}|${t.perf}|${t.elig}|${Math.round((t.perf / t.elig) * 100)}%`)
  const itemCols = '%COLS:16,52,12,12,8%'
  const itemHead = '%TH%SECTION|ITEM|PERFORMED/ PRESENT|ELIGIBLE POPULATION|'
  const top = (page: number) => [
    `%LINE:22,58,20%**SCORE CARD FOR:**|**PRACTICE: MOIS TEST CLINIC**|**PAGE ${page}**`,
    '%RULE%',
    `%LINE:30,40,30%As Of Date:  **${o.asOf || MOIS_TODAY}**|Patients Seen in Last:  **${o.period || '3'}**  years|For Provider(s): **${provider}**`,
    '%RULE%',
  ]
  const first = [
    ...top(1),
    demo,
    '%TR%|**MALE**||||**FEMALE**|',
    '%TH%Contacts / Pt|No. of Contacts|No. of Patients|AGE|No. of Patients|No. of Contacts|Contacts / Pt',
    ...rows,
    `%TR%**${cp(tm.c, tm.n)}**|**${tm.c}**|**${tm.n}**|**TOTALS**|**${tf.n}**|**${tf.c}**|**${cp(tf.c, tf.n)}**`,
    `%LINE:25,25,10,28,12%|UNKNOWN AGE OR SEX:|${pts.length - known.length}|**TOTAL PATIENTS:**|**${pts.length}**`,
    '%RULE%',
    itemCols, itemHead, ...items.slice(0, 20),
  ]
  const second = [...top(2), itemCols, itemHead, ...items.slice(20)]
  return [first.join('\n'), second.join('\n')]
}

/** "Deficient Items ▸ Direct output to Spreadsheet (CSV)": the patients each item misses */
export function amcareDeficientSheet(o: AmcareOptions, all: Patient[]): { head: string[]; rows: string[][] } {
  const pts = amcarePatients(o, all).filter((p) => p.dob)
  const rows = amcareTallies(o, all).flatMap((t, i) => {
    const miss = Math.min(3, t.elig - t.perf)
    return Array.from({ length: miss }, (_, j) => {
      const p = pts[(i * 5 + j * 11) % Math.max(1, pts.length)]
      return p ? [t.section, t.item, p.chart, rsName(p), rsAge(p.dob), p.gender, p.home ?? ''] : []
    }).filter((r) => r.length)
  })
  return { head: ['SECTION', 'ITEM', 'CHART', 'PATIENT NAME', 'AGE', 'SEX', 'HOME PHONE'], rows }
}

export const AMCARE_VERSIONS = ['V2 - Current', 'V1 - Original']
export const AMCARE_FACILITIES = RS_FACILITIES
export const AMCARE_SERVICE_CENTERS = RS_SERVICE_CENTERS

/* ===========================================================================
   The specs
   ======================================================================== */
export const specs: ReportSpec[] = [
  ...EXCEL_AUDITS.map(excelAuditSpec),
  bucketSpec({
    name: 'Mammogram',
    id: 'audit-mammogram',
    title: 'MAMMOGRAM STATUS OF FEMALE PATIENTS',
    head: ['NAME', 'AGE', '0 - 2 yrs*', '2 - 3 yrs', '3 - 4 yrs', '> 4 yrs', 'NEVER'],
    cols: [30, 10, 12, 12, 12, 12, 12],
    salt: 1,
    footnote: '* PATIENT NOT PRINTED IF MAMMOGRAM < 2 YRS',
    width: 670,
    height: 540,
    provenance: '304048 57574e6c (window), fc30f061 (page)',
    inferred: 'The article says the Age Range defaults to 50 to 74; the capture shows 50 to 69, which is kept. '
      + 'The Excel sheet adds Chart, DOB and Doctor per the article ("Additional information given: Doctor, Chart Number, Date of Birth").',
    subs: (ctx) => [`${agesLine(ctx)}     SEARCH FOR: ${ctx.val('concept').toUpperCase() || 'MAMMOGRAPHY'}`, statusLine(ctx)],
    fields: [
      ...selectionOptions('50', '69'),
      lastContact,
      {
        kind: 'text', id: 'concept', label: 'Concept Name:', value: 'MAMMOGRAPHY', w: 186,
        hint: '(Please refer to the Concept Manager section in the Administration Module for the Search Rules)',
      },
      ...csvOutput,
    ],
  }),
  {
    folder: 'Clinical - Audits',
    name: 'Number of Visits',
    id: 'audit-visits',
    width: 646,
    height: 600,
    provenance: '304048 1cf6fd1d (window), d63eb864 (page)',
    inferred: 'The capture shows sixteen of the provider drop-downs with the list scrolled; twenty are drawn. '
      + 'The article lists a CSV Output tick box the capture does not show (it sits below the scrolled list); it is drawn last. '
      + '"Less Then" is MOIS\'s own spelling. The LESS title wording is inferred from the captured "Patients with 10 or MORE Visits".',
    fields: [
      ...selectionOptions('0', '120', '(Leave blank or zeros to ignore)'),
      { kind: 'range', id: 'appt', label: 'Appoint Date:', w: 90, hint: '(INCLUSIVE)' },
      { kind: 'radio', id: 'visits', label: 'No. Visits:', options: ['Greater Than', 'Less Then'], value: 'Greater Than' },
      { kind: 'text', id: 'number', label: 'Number:', value: '3', w: 52, align: 'center' },
      { kind: 'section', label: 'Select Providers to exclude from report:' },
      ...Array.from({ length: 20 }, (_, i): RSField => ({ kind: 'select', id: `exclude${i + 1}`, label: `${i + 1} )`, options: 'providers', w: 170 })),
      ...csvOutput,
    ],
    pages: (ctx) => {
      const excluded = Array.from({ length: 20 }, (_, i) => ctx.val(`exclude${i + 1}`)).filter(Boolean)
      const rows = visitRows(ctx)
      const more = ctx.val('visits').startsWith('Less') ? 'LESS' : 'MORE'
      const cols = '%COLS:32,9,6,6,13,17,17%'
      return paged(
        `Patients with ${ctx.val('number') || '0'} or ${more} Visits`,
        [
          `Active Patients Only: ${ctx.on('active') ? 'Y' : 'N'}      Age Range ${ctx.val('ageFrom') || '0'} to ${ctx.val('ageTo') || '120'} years`,
          `Encounters from ${ctx.val('apptFrom')}   to ${ctx.val('apptTo') || MOIS_TODAY}`,
          ...(excluded.length ? [`Exclude Provider(s): ${excluded.join('; ')}`] : []),
        ],
        cols,
        'NAME|CHART|SEX|AGE|DOB|LAST CONTACT|No. of VISITS',
        rows.map((r) => `%TR%${visitCells(r).join('|')}`),
        ['%RULE%', `Records Printed: ${rows.length}`],
      )
    },
    output: {
      title: 'Number of Visits',
      cols: [32, 9, 6, 6, 13, 17, 17],
      head: ['NAME', 'CHART', 'SEX', 'AGE', 'DOB', 'LAST CONTACT', 'No. of VISITS'],
      rows: (ctx) => visitRows(ctx).map(visitCells),
      chartCol: 1,
    },
  },
  {
    folder: 'Clinical - Audits',
    name: 'Obesity',
    id: 'audit-obesity',
    width: 670,
    height: 540,
    provenance: '304048 cb11aead (window), 47452c0b (page)',
    inferred: "The Age Range From box is salmon in the capture (probably the focused field; a range cannot be marked required). "
      + 'The capture labels the tick box "Patients List:" where the article says "Patient List:"; the capture is kept.',
    fields: [...selectionOptions('', ''), lastContact, ...csvOutput],
    pages: (ctx) => {
      const { all, rows } = obesityRows(ctx)
      return paged(
        'OVERWEIGHT AND OBESITY AUDIT',
        [agesLine(ctx), statusLine(ctx)],
        '%COLS:30,6,6,8,7,12,8,8,15%',
        'NAME|AGE|SEX|HT|WT|WT DATE|BMI|WC|WC DATE',
        rows.map((r) => `%TR%${obesityCells(r).join('|')}`),
        obesityFooter(all, rows),
      )
    },
    output: {
      title: 'OVERWEIGHT AND OBESITY AUDIT',
      cols: [30, 6, 6, 8, 7, 12, 8, 8, 15],
      head: ['NAME', 'AGE', 'SEX', 'HT', 'WT', 'WT DATE', 'BMI', 'WC', 'WC DATE'],
      rows: (ctx) => obesityRows(ctx).rows.map(obesityCells),
    },
  },
  bucketSpec({
    name: 'Pap Smear',
    id: 'audit-pap',
    title: 'PAP SMEAR STATUS OF FEMALE PATIENTS',
    head: ['NAME', 'AGE', '0 - 3 yrs*', '3 - 4 yrs', '> 4 yrs', 'NEVER', 'HYST?'],
    cols: [32, 10, 12, 12, 12, 14, 8],
    salt: 3,
    hyst: true,
    footnote: '* PATIENT NOT PRINTED IF PAP SMEAR < 3 YRS',
    width: 672,
    height: 541,
    provenance: '304048 e7c6b4a5 (window), 38209207 (page)',
    inferred: 'The article speaks of 0-2 / 2-3 / 4-5 / 5+ groupings and a 2-year cut-off; the captured page prints 0 - 3 / 3 - 4 / > 4 / NEVER '
      + 'with "NOT PRINTED IF PAP SMEAR < 3 YRS", which is kept. The Excel sheet\'s Chart / DOB / Doctor columns follow the Mammogram report.',
    subs: (ctx) => [agesLine(ctx), statusLine(ctx)],
    fields: [...selectionOptions('25', '70'), lastContact, ...csvOutput],
  }),
  {
    folder: 'Clinical - Audits',
    name: 'Polypharmacy',
    id: 'audit-polypharmacy',
    width: 670,
    height: 540,
    provenance: '304048 f2699f33 (window), ab3502e8 (page)',
    inferred: 'A blank "# of Medications" counts from 1.',
    fields: [
      ...selectionOptions('18', '69'),
      lastContact,
      { kind: 'text', id: 'meds', label: '# of Medications:', w: 52, align: 'center', hint: '(Equal to or greater than)' },
      { kind: 'text', id: 'excluding', label: 'Excluding:', w: 134, hint: '(Exclude medications containing string)' },
      ...csvOutput,
    ],
    pages: (ctx) => {
      const rows = polyRows(ctx)
      return paged(
        `PATIENT CURRENTLY ON ${ctx.val('meds') || '1'} OR MORE DRUGS`,
        [agesLine(ctx), statusLine(ctx)],
        '%COLS:16,15,6,5,11,9,13,13,12%',
        'LAST NAME|FIRST NAME|AGE|SEX|DATE OF BIRTH|NUM OF DRUGS|HOME|WORK|CELL/OTHER',
        rows.map((r) => `%TR%${polyCells(r).join('|')}`),
        ['%RULE%', `Records Printed: ${rows.length}`],
      )
    },
    output: {
      title: 'Polypharmacy',
      cols: [16, 15, 6, 5, 11, 9, 13, 13, 12],
      head: ['LAST NAME', 'FIRST NAME', 'AGE', 'SEX', 'DATE OF BIRTH', 'NUM OF DRUGS', 'HOME', 'WORK', 'CELL/OTHER'],
      rows: (ctx) => polyRows(ctx).map(polyCells),
    },
  },
  {
    folder: 'Clinical - Audits',
    name: 'Scorecard',
    id: 'amcare-scorecard',
    window: 'report-params-amcare-scorecard',
    width: 661,
    height: 497,
    provenance: '304048 70b45e1a (window), 1bd39e02 (page)',
    inferred: 'Hand-built (screens/reports/AuditReportWindows.tsx): the window has a Previous Scorecard… button and a Build Scorecard default button. '
      + 'The Previous Scorecard picker and the deficient-items sheet columns are not captured.',
    fields: [],
  },
]
