import { visitCodeRows } from '../daybook'
import { DESKTOP_PROVIDER } from '../letterFlow'
import type { Patient } from '../patients'
import {
  RS_PROVIDERS, rsAge, rsDaysAgo, rsMatchOf, rsName, rsPatients,
  type ReportSpec, type RSContext, type RSField, type RSRow,
} from './types'
import { yn } from '../text'

/* ============================================================================
   Report specs transcribed from manual article 304050 (Reports ▸ Clinical -
   Problem/Observations): the eleven `Clinical - Pro/Obs` rows.

   Every window is the same Selection Parameter form in three blocks:
   `Problems:` (eight "N. Contains … but doesn't contain …" lines for the
   multi-problem reports, one line plus a Problem Concept "…" for the rest),
   a report-specific block (consult reasons, claim dates, a form code, up to
   three interventions / labs / consult reasons, medication search strings,
   an encounter provider or visit code), and the shared `Other Options:`
   block (Active Patients Only, Last Visit 3, Age Range 0 to 120, Facility
   Code, Service Center, Provider radio, CSV Output).

   The printed page opens with an echo of the parameters (the problems, the
   date range, the age range, Active / Stop Date / Years flags, the practice)
   and then one table, so each spec carries both `pages` (the page as the
   capture lays it out, echo block included) and `output` (the same rows as
   one table, which is also what the Excel / CSV output writes, with the extra
   columns each report's article paragraph lists).

   All text parameters honour the `%` wildcard through `ctx.like` (304049):
   problem include / exclude, concept, reasons, interventions, labs, the
   encounter provider and the medication strings, which take their own
   Contains / Begins With / Ends With choice line by line.

   The cohort below is fictional training data laid over roster charts; the
   problems, visits, labs and medications are invented.
   PROVENANCE: per spec below.
   ========================================================================= */

/* --- fictional cohort ------------------------------------------------------ */

type Member = {
  chart: string
  doctor: string
  facility: string
  service: string
  /** days since last contact */
  last: number
  problems: { text: string; dx: string; resolved?: boolean }[]
  consults: { ago: number; reason: string; seenBy: string }[]
  visits: { ago: number; provider: string; code: string; reason: string }[]
  forms: { form: string; ago: number; by: string }[]
  interventions: { name: string; ago: number; by: string; declined?: boolean }[]
  /** lab code → [days ago, value] */
  labs: Record<string, [number, number][]>
  meds: { name: string; cls: string; ago: number; dose: string }[]
}

const [, BEARDWOOD, DUCHARME, FAIRCHILD, HOWSER, SHEWCHUK] = RS_PROVIDERS as [string, string, string, string, string, string]
const CLINIC = 'MOIS TEST CLINIC'
const DAWSON = 'DAWSON CREEK HEALTH UNIT'
const DM2 = { text: 'DIABETES MELLITUS TYPE 2', dx: '250' }
const HTN = { text: 'HYPERTENSION', dx: '401' }
const COPD = { text: 'CHRONIC OBSTRUCTIVE PULMONARY DISEASE (COPD)', dx: '496' }
const DEP = { text: 'DEPRESSION', dx: '311' }
const HYPO = { text: 'HYPOTHYROIDISM', dx: '244' }

const COHORT: Member[] = [
  {
    chart: '2429', doctor: HOWSER, facility: CLINIC, service: 'PRIMARY CARE', last: 21,
    problems: [DM2, HTN],
    consults: [{ ago: 410, reason: 'DIABETES EDUCATION ASSESSMENT', seenBy: 'DIABETES EDUCATION CENTRE' }, { ago: 95, reason: 'DIABETIC EDUCATION FOLLOW-UP', seenBy: 'DIABETES EDUCATION CENTRE' }],
    visits: [{ ago: 200, provider: HOWSER, code: 'A', reason: 'Diabetic review' }, { ago: 88, provider: 'EMERGENCY', code: 'ER', reason: 'Hypoglycemia' }, { ago: 21, provider: HOWSER, code: 'A', reason: 'review' }],
    forms: [{ form: 'DIABETES', ago: 380, by: HOWSER }, { form: 'DIABETES', ago: 21, by: HOWSER }, { form: 'HTN', ago: 200, by: HOWSER }],
    interventions: [{ name: 'INFLUENZA VACCINATION', ago: 340, by: HOWSER }, { name: 'DIABETIC FOOT EXAM', ago: 21, by: HOWSER }, { name: 'RETINAL EXAM', ago: 300, by: 'OPHTHALMOLOGY' }],
    labs: { HBA1C: [[390, 8.4], [200, 7.6], [30, 7.1]], BMI: [[380, 31.2], [21, 30.4]], LDL: [[200, 2.9], [30, 2.3]] },
    meds: [{ name: 'METFORMIN - TAB 500MG', cls: 'BIGUANIDES', ago: 900, dose: '1 TAB BID' }, { name: 'RAMIPRIL - CAP 5MG', cls: 'ACE INHIBITORS', ago: 600, dose: '1 CAP OD' }],
  },
  {
    chart: '1885', doctor: BEARDWOOD, facility: CLINIC, service: 'PRIMARY CARE', last: 45,
    problems: [DM2, COPD],
    consults: [{ ago: 150, reason: 'RESPIRATORY THERAPY', seenBy: 'RESPIRATORY CLINIC' }],
    visits: [{ ago: 310, provider: BEARDWOOD, code: 'LA', reason: 'Fit in - COPD flare' }, { ago: 45, provider: BEARDWOOD, code: 'A', reason: 'Diabetic' }],
    forms: [{ form: 'COPD', ago: 310, by: BEARDWOOD }],
    interventions: [{ name: 'INFLUENZA VACCINATION', ago: 330, by: BEARDWOOD, declined: true }, { name: 'PNEUMOCOCCAL VACCINATION', ago: 700, by: BEARDWOOD }, { name: 'SPIROMETRY', ago: 150, by: 'RESPIRATORY CLINIC' }],
    labs: { HBA1C: [[320, 6.9], [45, 7.3]], BMI: [[310, 27.8], [45, 28.5]] },
    meds: [{ name: 'METFORMIN - TAB 850MG', cls: 'BIGUANIDES', ago: 1200, dose: '1 TAB BID' }, { name: 'TIOTROPIUM - INH 18MCG', cls: 'BRONCHODILATORS', ago: 800, dose: '1 CAP INH OD' }],
  },
  {
    chart: '712', doctor: HOWSER, facility: DAWSON, service: 'NURSING', last: 12,
    problems: [DM2, { text: 'CHRONIC KIDNEY DISEASE STAGE 3', dx: '585' }, HTN],
    consults: [{ ago: 700, reason: 'DIABETES EDUCATION ASSESSMENT', seenBy: 'DIABETES EDUCATION CENTRE' }, { ago: 60, reason: 'NEPHROLOGY REFERRAL', seenBy: 'NEPHROLOGY' }],
    visits: [{ ago: 140, provider: HOWSER, code: 'A', reason: 'counsel' }, { ago: 60, provider: 'EMERGENCY', code: 'ER', reason: 'Chest pain' }, { ago: 12, provider: DUCHARME, code: 'H', reason: 'Home visit - BP check' }],
    forms: [{ form: 'DIABETES', ago: 500, by: HOWSER }, { form: 'DIABETES', ago: 140, by: HOWSER }],
    interventions: [{ name: 'INFLUENZA VACCINATION', ago: 320, by: DUCHARME }, { name: 'RETINAL EXAM', ago: 400, by: 'OPHTHALMOLOGY' }],
    labs: { HBA1C: [[500, 9.2], [300, 8.8], [140, 8.1], [12, 7.8]], BMI: [[500, 34.1], [140, 34.7]], EGFR: [[400, 58], [140, 52], [12, 49]], LDL: [[140, 3.4]] },
    meds: [{ name: 'GLICLAZIDE MR - TAB 30MG', cls: 'SULFONYLUREAS', ago: 1500, dose: '2 TAB OD' }, { name: 'INSULIN GLARGINE - INJ 100U/ML', cls: 'INSULINS', ago: 300, dose: '18 UNITS HS' }, { name: 'ATORVASTATIN - TAB 20MG', cls: 'STATINS', ago: 700, dose: '1 TAB HS' }],
  },
  {
    chart: '3598', doctor: DUCHARME, facility: CLINIC, service: 'PRIMARY CARE', last: 130,
    problems: [{ text: 'ASTHMA', dx: '493' }],
    consults: [{ ago: 500, reason: 'ASTHMA EDUCATION', seenBy: 'RESPIRATORY CLINIC' }],
    visits: [{ ago: 130, provider: DUCHARME, code: 'A', reason: 'Fit in - Allergy Injection' }],
    forms: [{ form: 'ASTHMA', ago: 130, by: DUCHARME }],
    interventions: [{ name: 'SPIROMETRY', ago: 500, by: 'RESPIRATORY CLINIC' }],
    labs: { BMI: [[130, 23.4]] },
    meds: [{ name: 'SALBUTAMOL HFA - INH 100MCG', cls: 'BRONCHODILATORS', ago: 1100, dose: '2 PUFFS QID PRN' }],
  },
  {
    chart: '746', doctor: SHEWCHUK, facility: CLINIC, service: 'MENTAL HEALTH', last: 34,
    problems: [DEP],
    consults: [{ ago: 240, reason: 'MENTAL HEALTH INTAKE', seenBy: 'MENTAL HEALTH & SUBSTANCE USE' }],
    visits: [{ ago: 240, provider: SHEWCHUK, code: 'LA', reason: 'counsel' }, { ago: 34, provider: SHEWCHUK, code: 'A', reason: 'review' }],
    forms: [],
    interventions: [{ name: 'PHQ-9 SCREEN', ago: 34, by: SHEWCHUK }],
    labs: {},
    meds: [{ name: 'SERTRALINE - TAB 50MG', cls: 'ANTIDEPRESSANTS', ago: 230, dose: '1 TAB OD' }],
  },
  {
    chart: '3609', doctor: FAIRCHILD, facility: DAWSON, service: 'PUBLIC HEALTH', last: 70,
    problems: [{ text: 'GESTATIONAL DIABETES', dx: '648', resolved: true }, HYPO],
    consults: [{ ago: 900, reason: 'DIABETES EDUCATION ASSESSMENT', seenBy: 'DIABETES EDUCATION CENTRE' }],
    visits: [{ ago: 70, provider: FAIRCHILD, code: 'A', reason: 'note' }],
    forms: [],
    interventions: [{ name: 'INFLUENZA VACCINATION', ago: 360, by: FAIRCHILD }],
    labs: { TSH: [[400, 6.8], [70, 3.1]], BMI: [[70, 25.3]] },
    meds: [{ name: 'SYNTHROID - TAB 75MCG', cls: 'THYROID HORMONES', ago: 400, dose: '1 TAB OD' }],
  },
  {
    chart: '3658', doctor: SHEWCHUK, facility: CLINIC, service: 'MENTAL HEALTH', last: 15,
    problems: [DEP, HYPO],
    consults: [{ ago: 400, reason: 'PSYCHIATRY REFERRAL', seenBy: 'PSYCHIATRY' }],
    visits: [{ ago: 400, provider: SHEWCHUK, code: 'CONSU', reason: 'Consult - low mood' }, { ago: 15, provider: SHEWCHUK, code: 'A', reason: 'review' }],
    forms: [],
    interventions: [],
    labs: { TSH: [[400, 9.4], [200, 5.2], [15, 2.7]] },
    meds: [{ name: 'CITALOPRAM - TAB 20MG', cls: 'ANTIDEPRESSANTS', ago: 390, dose: '1 TAB OD' }, { name: 'SYNTHROID - TAB 75MCG', cls: 'THYROID HORMONES', ago: 390, dose: '1 TAB OD' }],
  },
  {
    chart: '3429', doctor: BEARDWOOD, facility: CLINIC, service: 'PRIMARY CARE', last: 260,
    problems: [{ text: 'DIABETES MELLITUS TYPE 1', dx: '250' }],
    consults: [{ ago: 260, reason: 'DIABETIC EDUCATION FOLLOW-UP', seenBy: 'DIABETES EDUCATION CENTRE' }],
    visits: [{ ago: 260, provider: BEARDWOOD, code: 'A', reason: 'Diabetic' }],
    forms: [{ form: 'DIABETES', ago: 260, by: BEARDWOOD }],
    interventions: [{ name: 'DIABETIC FOOT EXAM', ago: 260, by: BEARDWOOD }],
    labs: { HBA1C: [[600, 7.9], [260, 8.3]] },
    meds: [{ name: 'INSULIN GLARGINE - INJ 100U/ML', cls: 'INSULINS', ago: 2000, dose: '24 UNITS HS' }],
  },
  {
    chart: '2350', doctor: HOWSER, facility: CLINIC, service: 'PRIMARY CARE', last: 8,
    problems: [HTN, { text: 'CONGESTIVE HEART FAILURE', dx: '428' }],
    consults: [{ ago: 180, reason: 'CARDIOLOGY REFERRAL', seenBy: 'CARDIOLOGY' }],
    visits: [{ ago: 180, provider: 'EMERGENCY', code: 'ER', reason: 'Shortness of breath' }, { ago: 8, provider: HOWSER, code: 'A', reason: 'review' }],
    forms: [{ form: 'CHF', ago: 8, by: HOWSER }, { form: 'HTN', ago: 170, by: HOWSER }],
    interventions: [{ name: 'INFLUENZA VACCINATION', ago: 350, by: HOWSER }],
    labs: { EGFR: [[180, 71], [8, 66]], BMI: [[8, 29.9]] },
    meds: [{ name: 'FUROSEMIDE - TAB 40MG', cls: 'DIURETICS', ago: 175, dose: '1 TAB OD' }, { name: 'RAMIPRIL - CAP 10MG', cls: 'ACE INHIBITORS', ago: 175, dose: '1 CAP OD' }],
  },
  {
    chart: '3132', doctor: DUCHARME, facility: CLINIC, service: 'PRIMARY CARE', last: 400,
    problems: [{ text: 'PREDIABETES', dx: '790' }],
    consults: [{ ago: 400, reason: 'NUTRITION COUNSELLING', seenBy: 'DIETITIAN' }],
    visits: [{ ago: 400, provider: DUCHARME, code: 'A', reason: 'Fit in - Slipped on ice' }],
    forms: [],
    interventions: [],
    labs: { HBA1C: [[400, 6.1]], FBS: [[400, 6.4]], BMI: [[400, 32.6]] },
    meds: [],
  },
  {
    chart: '2680', doctor: HOWSER, facility: CLINIC, service: 'PRIMARY CARE', last: 90,
    problems: [DM2],
    consults: [],
    visits: [{ ago: 90, provider: HOWSER, code: 'A', reason: 'Diabetic' }],
    forms: [],
    interventions: [],
    labs: { HBA1C: [[90, 6.8]] },
    meds: [{ name: 'METFORMIN - TAB 500MG', cls: 'BIGUANIDES', ago: 800, dose: '1 TAB BID' }],
  },
  {
    chart: '3436', doctor: FAIRCHILD, facility: DAWSON, service: 'NURSING', last: 1900,
    problems: [COPD, DEP],
    consults: [{ ago: 1950, reason: 'RESPIRATORY THERAPY', seenBy: 'RESPIRATORY CLINIC' }],
    visits: [{ ago: 1900, provider: FAIRCHILD, code: 'A', reason: 'review' }],
    forms: [{ form: 'COPD', ago: 1900, by: FAIRCHILD }],
    interventions: [{ name: 'SPIROMETRY', ago: 1950, by: 'RESPIRATORY CLINIC' }],
    labs: { BMI: [[1900, 21.8]] },
    meds: [{ name: 'SALBUTAMOL HFA - INH 100MCG', cls: 'BRONCHODILATORS', ago: 2500, dose: '2 PUFFS QID PRN' }],
  },
]

/* --- the "…" pickers and drop-downs ---------------------------------------- */

const PROBLEM_CONCEPTS = ['ASTHMA', 'CHF', 'CKD', 'COPD', 'DEPRESSION', 'DIABETES', 'HYPERTENSION', 'HYPOTHYROIDISM']
/** a concept → the problem wording it gathers */
const CONCEPT_TERMS: Record<string, string[]> = {
  CHF: ['HEART FAILURE'], CKD: ['KIDNEY DISEASE'], COPD: ['COPD', 'OBSTRUCTIVE PULMONARY'],
}
const LABS: [string, string][] = [
  ['BMI', 'BODY MASS INDEX'], ['EGFR', 'ESTIMATED GFR'], ['FBS', 'FASTING BLOOD SUGAR'],
  ['HBA1C', 'HEMOGLOBIN A1C'], ['LDL', 'LDL CHOLESTEROL'], ['TSH', 'THYROID STIMULATING HORMONE'],
]
const LAB_PICK = LABS.map(([c, d]) => `${c} - ${d}`)
const LAB_CONCEPTS = ['A1C CONCEPT', 'BMI CONCEPT', 'LIPIDS CONCEPT', 'RENAL FUNCTION CONCEPT', 'THYROID CONCEPT']
const FORM_CODES = ['', 'ASTHMA', 'CHF', 'COPD', 'DIABETES', 'FIRST ASSESSMENT', 'HEP C', 'HTN', 'OA', 'RA']
const MED_PICK = [
  'ATORVASTATIN - TAB 20MG', 'CITALOPRAM - TAB 20MG', 'FUROSEMIDE - TAB 40MG', 'GLICLAZIDE MR - TAB 30MG',
  'INSULIN GLARGINE - INJ 100U/ML', 'METFORMIN - TAB 500MG', 'METFORMIN - TAB 850MG', 'RAMIPRIL - CAP 5MG',
  'SALBUTAMOL HFA - INH 100MCG', 'SERTRALINE - TAB 50MG', 'SYNTHROID - TAB 75MCG', 'TIOTROPIUM - INH 18MCG',
]
const MED_CONCEPTS = ['ACE INHIBITORS', 'ANTIDEPRESSANTS', 'BIGUANIDES', 'BRONCHODILATORS', 'DIURETICS', 'INSULINS', 'STATINS', 'SULFONYLUREAS', 'THYROID HORMONES']
const MED_MODES = ['Contains', 'Begins With', 'Ends With']
const ENCOUNTER_PROVIDERS = [...RS_PROVIDERS, 'EMERGENCY']
const VISIT_CODES = ['', ...visitCodeRows.map((v) => v.code)]

/* --- window building blocks ------------------------------------------------ */

const PROBLEM_HEAD: RSField = {
  kind: 'section', label: 'Problems:',
  right: { kind: 'row', fields: [{ kind: 'note', text: 'Include if Contains' }, { kind: 'note', text: 'Exclude if Contains' }] },
}
const RESOLVE: RSField = { kind: 'check', id: 'resolve', label: 'Resolve Date:', text: 'Include problem if the resolve / stop date is present' }

const problemLine = (i: number, label: string, required: boolean): RSField => ({
  kind: 'row', label, fields: [
    { kind: 'text', id: `inc${i}`, w: 178, required },
    { kind: 'note', text: "but doesn't contain" },
    { kind: 'text', id: `exc${i}`, w: 178 },
  ],
})

/** the eight-line Problems block of the multi-problem reports */
function multiProblems(opts: { required: boolean; wideThird?: boolean }): RSField[] {
  const lines = [1, 2, 3, 4, 5, 6, 7, 8].map((i) =>
    problemLine(i, `${i}.${i === 3 && opts.wideThird ? '  ' : ' '}Contains ...`, opts.required && i === 1))
  return [
    PROBLEM_HEAD, ...lines, { kind: 'rule' },
    { kind: 'text', id: 'exclAll', label: 'Exclude if Contains:', w: 178, hint: '(for all problems)' },
    { kind: 'rule' }, RESOLVE,
  ]
}

/** the one-line Problems block with its Problem Concept "…" */
function oneProblem(label = '1. Contains ...'): RSField[] {
  return [
    PROBLEM_HEAD, problemLine(1, label, true),
    { kind: 'note', text: 'OR Select by ...' },
    { kind: 'text', id: 'concept', label: 'Problem Concept:', w: 285, dots: { title: 'Problem Concept', options: PROBLEM_CONCEPTS } },
    { kind: 'rule' }, RESOLVE,
  ]
}

/** the shared Other Options block */
function otherOptions(opts: { csv?: boolean; facilityLabel?: string } = {}): RSField[] {
  const f: RSField[] = [
    { kind: 'section', label: 'Other Options:' },
    {
      kind: 'columns', columns: [
        [
          { kind: 'check', id: 'active', label: 'Patients List:', text: 'Active Patients Only', checked: true },
          { kind: 'text', id: 'lastVisit', label: 'Last Visit:', value: '3', w: 52, align: 'center', hint: '(years since last contact)' },
          { kind: 'range', id: 'age', label: 'Age Range:', from: '0', to: '120', w: 52, hint: '(Leave blank or zeros to ignore)' },
          { kind: 'select', id: 'facility', label: opts.facilityLabel ?? 'Facility Code:', options: 'facilities', w: 116 },
          { kind: 'select', id: 'service', label: 'Service Center:', options: 'serviceCenters', w: 142 },
        ],
        [{ kind: 'radio', id: 'provider', label: 'Provider:', options: ['Current Desktop Provider', 'All Providers'], value: 'All Providers', column: true }],
      ],
    },
    { kind: 'rule' },
  ]
  if (opts.csv !== false) f.push({ kind: 'check', id: 'csv', label: 'CSV Output:', text: 'Direct output to Excel', output: 'excel' })
  return f
}

const dateRange = (id: string, label: string): RSField =>
  ({ kind: 'range', id, label, w: 90, hint: '(INCLUSIVE)' })

/** "1. (•) Description ( ) Concept [ … ] (includes)" */
const byLine = (id: string, i: number): RSField => ({
  kind: 'row', label: `${i}.`, fields: [
    { kind: 'radio', id: `${id}${i}By`, options: ['Description', 'Concept'], value: 'Description' },
    { kind: 'text', id: `${id}${i}`, w: 310, hint: '(includes)' },
  ],
})

/** "1. (•) Code ( ) Concept [ …] [description] [cmp] [value]" */
const labLine = (i: number, compare: boolean, descW: number): RSField => ({
  kind: 'row', label: `${i}.`, fields: [
    { kind: 'radio', id: `lab${i}By`, options: ['Code', 'Concept'], value: 'Code' },
    { kind: 'text', id: `lab${i}`, w: 100, dots: { title: 'Lab Code', options: [...LAB_PICK, ...LAB_CONCEPTS] } },
    { kind: 'text', id: `lab${i}Desc`, w: descW, disabled: true },
    ...(compare ? [
      { kind: 'text', id: `lab${i}Cmp`, w: 25, align: 'center' } as RSField,
      { kind: 'text', id: `lab${i}Val`, w: 90 } as RSField,
    ] : []),
  ],
})

/* --- selection over the cohort --------------------------------------------- */

type Hit = { m: Member; p: Patient; nums: number[] }

const isDate = (s: string) => /^\d{4}\.\d{2}\.\d{2}$/.test(s) && s !== '0000.00.00'
const shown = (s: string) => (isDate(s) ? s : '')
const inRange = (ctx: RSContext, id: string, ago: number) => {
  const d = rsDaysAgo(ago), from = ctx.val(`${id}From`), to = ctx.val(`${id}To`)
  return (!isDate(from) || d >= from) && (!isDate(to) || d <= to)
}
/** the list-page date style, 3/7/2010 */
const mdy = (ago: number) => {
  const [y, m, d] = rsDaysAgo(ago).split('.')
  return `${Number(m)}/${Number(d)}/${y}`
}
const up = (s: string) => s.toUpperCase()
/** bold, or nothing when blank */
const b = (s: string) => (s ? `**${s}**` : '')
const byName = (a: Hit, b: Hit) => rsName(a.p).localeCompare(rsName(b.p))
const labName = (code: string) => LABS.find(([c]) => c === code)?.[1] ?? code

/** the Other Options filters every report shares */
function eligible(ctx: RSContext): Hit[] {
  const roster = rsPatients()
  const a0 = Number(ctx.val('ageFrom')) || 0, a1 = Number(ctx.val('ageTo')) || 0
  const yrs = Number(ctx.val('lastVisit')) || 0
  const fac = ctx.val('facility'), svc = ctx.val('service')
  const desk = ctx.val('provider') === 'Current Desktop Provider'
  return COHORT.flatMap((m) => {
    const p = roster.find((x) => x.chart === m.chart)
    if (!p) return []
    if (ctx.on('active') && p.status !== 'A') return []
    if (yrs > 0 && m.last > yrs * 365) return []
    const age = Number(rsAge(p.dob))
    if ((a0 || a1) && (age < a0 || (a1 > 0 && age > a1))) return []
    if (fac && fac !== m.facility) return []
    if (svc && svc !== m.service) return []
    if (desk && m.doctor !== DESKTOP_PROVIDER) return []
    return [{ m, p, nums: [] }]
  })
}

/** the problems a chart shows the report: resolved ones only when ticked */
const problemsOf = (ctx: RSContext, m: Member) =>
  m.problems.filter((x) => !x.resolved || ctx.on('resolve')).map((x) => x.text)

/** eight problem lines: the line numbers a chart meets, or null.
    `and` (Claims for Diagnosis' Comparison) needs every filled line. */
function multiHits(ctx: RSContext, and = false): Hit[] {
  const exclAll = ctx.val('exclAll')
  const lines = [1, 2, 3, 4, 5, 6, 7, 8].filter((i) => ctx.val(`inc${i}`))
  return eligible(ctx).flatMap((h) => {
    const ps = problemsOf(ctx, h.m)
    if (!ps.length) return []
    if (exclAll && ps.some((t) => ctx.like(exclAll, t))) return []
    const nums = lines.filter((i) => ps.some((t) => {
      const exc = ctx.val(`exc${i}`)
      return ctx.like(ctx.val(`inc${i}`), t) && !(exc && ctx.like(exc, t))
    }))
    if (lines.length && (and ? nums.length < lines.length : !nums.length)) return []
    return [{ ...h, nums }]
  }).sort(byName)
}

/** one problem line or a Problem Concept */
function oneHits(ctx: RSContext): Hit[] {
  const inc = ctx.val('inc1'), exc = ctx.val('exc1'), concept = up(ctx.val('concept'))
  const terms = concept ? CONCEPT_TERMS[concept] ?? [concept] : inc ? [inc] : []
  return eligible(ctx).filter(({ m }) => {
    const ps = problemsOf(ctx, m)
    return ps.some((t) => (!terms.length || terms.some((x) => ctx.like(x, t))) && !(exc && ctx.like(exc, t)))
  }).sort(byName)
}

/* --- page furniture -------------------------------------------------------- */

const pageHead = (title: string) => [`%LINE:86,14%**${CLINIC}**|**Page 1**`, `%TITLE%${title}`, '%RULE%']

/** PROBLEMS: CONTAINS [ BUT DOES NOT CONTAIN ] … (8d74575a, 902acda8) */
function multiEcho(ctx: RSContext): string[] {
  const cell = (i: number) => {
    const inc = ctx.val(`inc${i}`), exc = ctx.val(`exc${i}`)
    return `${i}. ${inc ? `**${up(inc)}**` : ''}${exc ? ` [ ${up(exc)} ]` : ''}`
  }
  return [
    'PROBLEMS: CONTAINS [  BUT DOES NOT CONTAIN ]',
    `%LINE:33,33,34%${cell(1)}|${cell(2)}|${cell(3)}`,
    `%LINE:33,33,34%${cell(4)}|${cell(5)}|${cell(6)}`,
    `%LINE:33,33,34%${cell(7)}|${cell(8)}|`,
    `AND ALL DO NOT CONTAIN:  ${ctx.val('exclAll') ? `**${up(ctx.val('exclAll'))}**` : ''}`,
  ]
}

const practice = (ctx: RSContext) => (ctx.val('provider') === 'Current Desktop Provider' ? DESKTOP_PROVIDER : '')

/** the date / age / flags lines under the multi-problem echo */
function multiTail(ctx: RSContext, fromLabel: string, range: string): string[] {
  return [
    `%LINE:20,12,34,20,6,8%${fromLabel}|${b(shown(ctx.val(`${range}From`)))}|to  ${b(shown(ctx.val(`${range}To`)) || ctx.today)}|For Patients Aged:|${b(ctx.val('ageFrom'))}|to   ${b(ctx.val('ageTo'))}`,
    `%LINE:33,33,34%Active Patients Only:  **${yn(ctx.on('active'))}**|Include Stop Date:  **${yn(ctx.on('resolve'))}**|Yrs Since Last Contact:   **${ctx.val('lastVisit') || '0'}**`,
    `For Practice:  ${b(practice(ctx))}`,
    '%RULE%',
  ]
}

/** Problems Name Includes … For Practice (c661fc10, 0c3252ed …) */
function oneEcho(ctx: RSContext): string[] {
  const concept = ctx.val('concept')
  const includes = concept ? `${up(concept)} CONCEPT` : up(ctx.val('inc1'))
  return [
    `%LINE:17,40,13,30%Problems Name Includes:|${b(includes)}|and Excludes:|${b(up(ctx.val('exc1')))}`,
    `%LINE:17,20,20,13,30%Active Patients Only:|**${yn(ctx.on('active'))}**|Include Stop Date: **${yn(ctx.on('resolve'))}**|Yrs Since Last Contact:|**${ctx.val('lastVisit') || '0'}**`,
    `%LINE:17,40,13,30%For Patients Aged:|${b(ctx.val('ageFrom'))}      to  ${b(ctx.val('ageTo'))}|For Practice:|${b(practice(ctx) || 'All Providers')}`,
    '%RULE%',
  ]
}

/** a right-hand "Date:  from  to  today" beside a report's criteria line */
const dateEcho = (ctx: RSContext, id: string) => `${shown(ctx.val(`${id}From`))}      to  ${b(shown(ctx.val(`${id}To`)) || ctx.today)}`

const tr = (cells: string[]) => `%TR%${cells.join('|')}`
const cols = (w: number[]) => `%COLS:${w.join(',')}%`
const joinRows = (rows: RSRow[]) => rows.map((r) => (typeof r === 'string' ? r : tr(r)))

const money = (n: number) => n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const one = (n: number) => n.toLocaleString('en-CA', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
/** patients with nothing on the report first (alphabetical), then the rest by date, oldest first */
function datedOrder<T extends { h: Hit }>(list: T[], ago: (x: T) => number | undefined): T[] {
  const none = list.filter((x) => ago(x) === undefined)
  const dated = list.filter((x) => ago(x) !== undefined).sort((a, b) => ago(b)! - ago(a)!)
  return [...none, ...dated]
}
/** the Excel columns several articles add after the page's own */
const EXTRA_HEAD = ['DOCTOR', 'FACILITY CODE', 'SERVICE CENTRE', 'CHART #']
const extra = (h: Hit) => [h.m.doctor, h.m.facility, h.m.service, h.p.chart]
const PERSON_HEAD = ['AGE', 'DOB', 'SEX', 'LAST CONTACT']
const person = (h: Hit) => [rsAge(h.p.dob), h.p.dob, h.p.gender, rsDaysAgo(h.m.last)]

/* --- visit-list reports (All Consults / Visit for Provider / Visit Code) ---- */

type VisitRow = { h: Hit; ago: number; reason: string; by: string }
const VISIT_COLS = [22, 10, 33, 17, 18]

const visitCells = (rows: VisitRow[]) =>
  rows.map((r) => [rsName(r.h.p), mdy(r.ago), r.reason, r.h.nums.join(','), r.h.m.doctor])

function visitTotals(hits: Hit[], rows: VisitRow[]): string[] {
  const seen = new Set(rows.map((r) => r.h.p.chart)).size
  return [
    `%LINE:32,6%**Total Patients with Problems =**|**${hits.length}**`,
    `%LINE:32,6%**Total Patients with Visits =**|**${seen}**`,
    `%LINE:32,6%**Total Visits =**|**${rows.length}**`,
  ]
}

function visitPage(ctx: RSContext, title: string, head: string[], criteria: string[], tail: string[], v: { hits: Hit[]; rows: VisitRow[] }): string[] {
  return [[
    ...pageHead(title), ...multiEcho(ctx), ...criteria, ...tail,
    cols(VISIT_COLS), `%TH%${head.join('|')}`, ...visitCells(v.rows).map(tr), '%RULE%',
    ...visitTotals(v.hits, v.rows),
  ].join('\n')]
}

function consultVisits(ctx: RSContext) {
  const hits = multiHits(ctx)
  const reasons = [1, 2, 3].map((i) => ctx.val(`reason${i}`)).filter(Boolean)
  const rows = hits.flatMap((h) => h.m.consults
    .filter((c) => inRange(ctx, 'seen', c.ago) && (!reasons.length || reasons.some((r) => ctx.like(r, c.reason))))
    .sort((a, b) => b.ago - a.ago)
    .map((c) => ({ h, ago: c.ago, reason: c.reason, by: c.seenBy })))
  return { hits, rows }
}

function providerVisits(ctx: RSContext) {
  const hits = multiHits(ctx)
  const prov = ctx.val('encProvider')
  const rows = hits.flatMap((h) => h.m.visits
    .filter((v) => inRange(ctx, 'enc', v.ago) && (!prov || ctx.like(prov, v.provider)))
    .sort((a, b) => b.ago - a.ago)
    .map((v) => ({ h, ago: v.ago, reason: v.reason, by: v.provider })))
  return { hits, rows }
}

function codeVisits(ctx: RSContext) {
  const hits = multiHits(ctx)
  const code = ctx.val('visitCode')
  /* a visit code MUST be picked for the report to run (304050) */
  const rows = !code ? [] : hits.flatMap((h) => h.m.visits
    .filter((v) => inRange(ctx, 'enc', v.ago) && ctx.like(code, v.code, 'equals'))
    .sort((a, b) => b.ago - a.ago)
    .map((v) => ({ h, ago: v.ago, reason: v.reason, by: v.provider })))
  return { hits, rows }
}

const visitExcel = (rows: VisitRow[], byHead: string) => ({
  excelHead: ['NAME', 'DATE', 'VISIT REASON', 'PROBLEMS', 'FAMILY DOCTOR', 'FACILITY CODE', 'SERVICE CENTRE', byHead],
  excelRows: rows.map((r, i) => [...visitCells(rows)[i]!, r.h.m.facility, r.h.m.service, r.by]),
})

/* --- Claims for Diagnosis --------------------------------------------------- */

const FEES: Record<string, [string, number]> = {
  A: ['00100', 32.51], LA: ['00120', 57.18], H: ['00103', 45.0], ER: ['00101', 38.75], CONSU: ['00110', 88.4],
}
type ClaimLine = { ago: number; loc: string; dx: string; fee: string; n: number; unit: number }

function claimGroups(ctx: RSContext) {
  const and = ctx.val('comparison') === 'AND'
  return multiHits(ctx, and).map((h) => {
    const dx = h.m.problems[0]!.dx
    const lines: ClaimLine[] = h.m.visits
      .filter((v) => inRange(ctx, 'claim', v.ago))
      .sort((a, b) => b.ago - a.ago)
      .flatMap((v) => {
        const [fee, unit] = FEES[v.code] ?? ['00100', 32.51]
        const loc = v.code === 'ER' ? 'E' : v.code === 'H' ? 'R' : 'A'
        const out: ClaimLine[] = [{ ago: v.ago, loc, dx, fee, n: 1, unit }]
        if (dx === '250' && /diabet/i.test(v.reason)) out.push({ ago: v.ago, loc, dx, fee: '14050', n: 1, unit: 125 })
        return out
      })
    return { h, lines }
  }).filter((g) => g.lines.length)
}

const CLAIM_COLS = [19, 11, 9, 10, 10, 9, 11, 21]
const CLAIM_HEAD = ['', 'DATE OF SERVICE', 'LOCATION', 'DIAG CODE', 'FEE ITEM', 'NO. SERVICE', 'UNIT AMOUNT', 'EXTENDED']

function claimRows(ctx: RSContext): RSRow[] {
  return claimGroups(ctx).flatMap(({ h, lines }) => [
    `%LINE:30,14,22,12,22%**${rsName(h.p)}**|#${h.p.chart}|DOB: ${h.p.dob}|AGE: ${rsAge(h.p.dob)}|SEX: ${h.p.gender}`,
    ...lines.map((l) => ['', mdy(l.ago), l.loc, l.dx, l.fee, String(l.n), money(l.unit), money(l.unit * l.n)]),
    ['', '', '', '', '', '', '**TOTAL:**', `**${money(lines.reduce((s, l) => s + l.unit * l.n, 0))}**`],
  ])
}

function claimTotals(ctx: RSContext): string[] {
  const g = claimGroups(ctx)
  const lines = g.flatMap((x) => x.lines)
  return [
    `%LINE:30,20%Total Patients Printed:|**${g.length}**`,
    `%LINE:30,20%Total Number of Services:|**${lines.reduce((s, l) => s + l.n, 0)}**`,
    `%LINE:30,20%Total Cost of Services:|**$${money(lines.reduce((s, l) => s + l.unit * l.n, 0))}**`,
  ]
}

/* --- Encounter Forms ------------------------------------------------------- */

function formRows(ctx: RSContext) {
  const code = ctx.val('formCode')
  const rows = oneHits(ctx).map((h) => {
    const fs = code ? h.m.forms.filter((f) => ctx.like(code, f.form, 'equals')).sort((a, b) => a.ago - b.ago) : []
    return { h, recent: fs[0], prev: fs[1] }
  })
  return datedOrder(rows, (r) => r.recent?.ago)
}
const formCells = (ctx: RSContext) => formRows(ctx).map((r) => [
  rsName(r.h.p), r.recent ? mdy(r.recent.ago) : '', r.recent?.by ?? '', r.prev ? mdy(r.prev.ago) : '', r.prev?.by ?? '',
])

/* --- the three-slot "most recent" reports (Interventions / Labs / Consult) -- */

type Found = { ago: number; a: string; b: string; value?: number }
type SlotRow = { h: Hit; slots: (Found | undefined)[] }

const LAB_CONCEPT_CODES: Record<string, string[]> = {
  'A1C CONCEPT': ['HBA1C'], 'BMI CONCEPT': ['BMI'], 'LIPIDS CONCEPT': ['LDL'],
  'RENAL FUNCTION CONCEPT': ['EGFR'], 'THYROID CONCEPT': ['TSH'],
}
/** the lab codes a Code / Concept entry names */
function labCodes(ctx: RSContext, pattern: string): string[] {
  if (!pattern) return []
  const concept = LAB_CONCEPT_CODES[up(pattern)]
  if (concept) return concept
  return LABS.filter(([c, d]) => ctx.like(pattern, `${c} - ${d}`)).map(([c]) => c)
}
/** the lab's display name for the column caption */
const labTitle = (ctx: RSContext, pattern: string) => {
  const codes = labCodes(ctx, pattern)
  return codes.length === 1 ? labName(codes[0]!) : up(pattern)
}
/** a chart's results for a pattern inside the Collected Date range, oldest first */
function labSeries(ctx: RSContext, m: Member, pattern: string): [number, number][] {
  return labCodes(ctx, pattern).flatMap((c) => m.labs[c] ?? [])
    .filter(([ago]) => inRange(ctx, 'collected', ago)).sort((a, b) => b[0] - a[0])
}
function latestLab(ctx: RSContext, m: Member, pattern: string): Found | undefined {
  const s = labSeries(ctx, m, pattern)
  const last = s[s.length - 1]
  return last ? { ago: last[0], a: mdy(last[0]), b: one(last[1]), value: last[1] } : undefined
}

function slotRows(ctx: RSContext, find: (m: Member, pattern: string) => Found | undefined, prefix: string): SlotRow[] {
  const pats = [1, 2, 3].map((i) => ctx.val(`${prefix}${i}`))
  const rows = oneHits(ctx).map((h) => ({ h, slots: pats.map((p) => (p ? find(h.m, p) : undefined)) }))
  return datedOrder(rows, (r) => r.slots[0]?.ago)
}
const slotCells = (rows: SlotRow[]) =>
  rows.map((r) => [rsName(r.h.p), ...r.slots.flatMap((s) => [s?.a ?? '', s?.b ?? ''])])

const SLOT_COLS = [32, 9, 12, 9, 12, 9, 17]

function slotPage(ctx: RSContext, o: {
  title: string; criteria: string; dateLabel: string; range: string; prefix: string
  name: (pattern: string) => string; a: string; b: string; first: string; rows: SlotRow[]
}): string[] {
  const pats = [1, 2, 3].map((i) => ctx.val(`${o.prefix}${i}`))
  const withoutDate = o.rows.filter((r) => !r.slots[0]).length
  return [[
    ...pageHead(o.title), ...oneEcho(ctx),
    `%LINE:14,48,14,24%${o.criteria}|1:  ${pats[0] ? o.name(pats[0]) : ''}|${o.dateLabel}|${dateEcho(ctx, o.range)}`,
    `%LINE:14,48%|2:  ${pats[1] ? o.name(pats[1]) : ''}`,
    `%LINE:14,48%|3:  ${pats[2] ? o.name(pats[2]) : ''}`,
    '%RULE%',
    `%LINE:32,21,21,26%|${b(pats[0] ? o.name(pats[0]) : '')}|${b(pats[1] ? o.name(pats[1]) : '')}|${b(pats[2] ? o.name(pats[2]) : '')}`,
    cols(SLOT_COLS), `%TH%**${o.first}**|**${o.a}**|**${o.b}**|**${o.a}**|**${o.b}**|**${o.a}**|**${o.b}**`,
    ...slotCells(o.rows).map(tr),
    '%RULE%',
    `%LINE:22,40%Totals Records Printed:|${o.rows.length}`,
    '%RULE%',
    `%LINE:22,40%Total Records Printed w/o Date:|${withoutDate}`,
  ].join('\n')]
}
const slotFooter = (rows: string[][]) => [
  `Totals Records Printed:   ${rows.length}`,
  `Total Records Printed w/o Date:   ${rows.filter((r) => !r[1]).length}`,
]

function interventionRows(ctx: RSContext): SlotRow[] {
  return slotRows(ctx, (m, pat) => {
    const hit = m.interventions.filter((x) => ctx.like(pat, x.name) && inRange(ctx, 'performed', x.ago)).sort((a, b) => a.ago - b.ago)[0]
    return hit ? { ago: hit.ago, a: mdy(hit.ago), b: hit.declined ? 'Y' : '' } : undefined
  }, 'int')
}
const labRows = (ctx: RSContext) => slotRows(ctx, (m, pat) => latestLab(ctx, m, pat), 'lab')
function reasonRows(ctx: RSContext): SlotRow[] {
  return slotRows(ctx, (m, pat) => {
    const hit = m.consults.filter((c) => ctx.like(pat, c.reason) && inRange(ctx, 'seen', c.ago)).sort((a, b) => a.ago - b.ago)[0]
    return hit ? { ago: hit.ago, a: mdy(hit.ago), b: hit.reason.slice(0, 16) } : undefined
  }, 'reason')
}

/* --- Lab Result Combinations ----------------------------------------------- */

function cmpOk(v: number, cmp: string, val: string): boolean {
  const x = Number(val)
  if (!cmp.trim() || val.trim() === '' || Number.isNaN(x)) return true
  switch (cmp.trim()) {
    case '>': return v > x
    case '<': return v < x
    case '=': return v === x
    case '>=': return v >= x
    case '<=': return v <= x
    case '<>': return v !== x
    default: return true
  }
}
function comboRows(ctx: RSContext) {
  const and = ctx.val('combo') !== 'OR'
  const slots = [1, 2, 3].map((i) => ({ pat: ctx.val(`lab${i}`), cmp: ctx.val(`lab${i}Cmp`), val: ctx.val(`lab${i}Val`) }))
  const active = slots.filter((s) => s.pat)
  const hits = oneHits(ctx)
  const rows = hits.map((h) => ({ h, slots: slots.map((s) => (s.pat ? latestLab(ctx, h.m, s.pat) : undefined)) }))
    .filter((r) => {
      if (!active.length) return true
      const ok = slots.map((s, i) => !!s.pat && !!r.slots[i] && cmpOk(r.slots[i]!.value!, s.cmp, s.val)).filter((_, i) => slots[i]!.pat)
      return and ? ok.every(Boolean) : ok.some(Boolean)
    })
  return { hits, rows: datedOrder(rows, (r) => r.slots[0]?.ago), slots }
}

/* --- Lab Results Change Velocity -------------------------------------------- */

function velocityRows(ctx: RSContext) {
  const pat = ctx.val('lab1')
  return oneHits(ctx).map((h) => {
    const s = pat ? labSeries(ctx, h.m, pat) : []
    if (!s.length) return { h, cells: [rsName(h.p), '', '', '', '', '', '', '', ''] }
    const ys = s.map(([, v]) => v)
    const xs = s.map(([ago]) => -ago)
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length
    const my = ys.reduce((a, b) => a + b, 0) / ys.length
    const den = xs.reduce((a, x) => a + (x - mx) ** 2, 0)
    const slope = den ? xs.reduce((a, x, i) => a + (x - mx) * (ys[i]! - my), 0) / den : 0
    const pct = s.length > 1 && my ? one((slope * 365 / my) * 100) : ''
    const first = s[0]!, last = s[s.length - 1]!
    return {
      h, cells: [
        rsName(h.p), rsDaysAgo(first[0]), one(first[1]), rsDaysAgo(last[0]), one(last[1]),
        one(Math.min(...ys)), one(Math.max(...ys)), String(s.length), pct,
      ],
    }
  })
}
const VELOCITY_COLS = [28, 9, 8, 10, 9, 7, 11, 8, 10]

/* --- Medications ------------------------------------------------------------ */

function medCriteria(ctx: RSContext) {
  const lines = [1, 2, 3, 4].map((i) => ({ pat: ctx.val(`med${i}`), mode: rsMatchOf(ctx.val(`med${i}Mode`) || 'Contains') })).filter((l) => l.pat)
  const concepts = [1, 2, 3, 4, 5].map((i) => ctx.val(`medConcept${i}`)).filter(Boolean)
  return { lines, concepts }
}
function medRows(ctx: RSContext) {
  const { lines, concepts } = medCriteria(ctx)
  const any = lines.length > 0 || concepts.length > 0
  return oneHits(ctx).flatMap((h) => {
    if (!any) return [{ h, med: undefined as Member['meds'][number] | undefined }]
    return h.m.meds
      .filter((md) => lines.some((l) => ctx.like(l.pat, md.name, l.mode)) || concepts.some((c) => ctx.like(c, md.cls)))
      .map((med) => ({ h, med: med as Member['meds'][number] | undefined }))
  }).sort((a, b) => b.h.m.last - a.h.m.last)
}
function medEcho(ctx: RSContext): string {
  const { lines, concepts } = medCriteria(ctx)
  const of = (mode: string) => lines.filter((l) => l.mode === mode).map((l) => up(l.pat)).join(', ')
  const begins = of('begins'), ends = of('ends')
  return `MEDICATIONS:     CONTAIN(S): ${of('contains')}${begins ? `   BEGIN(S) WITH: ${begins}` : ''}${ends ? `   END(S) WITH: ${ends}` : ''}   CONCEPT(S): ${concepts.map(up).join(', ')}`
}

/* --- the reports ----------------------------------------------------------- */

const LABS_HEADING = 'Labs:  Lookup Type / Code (Concept) / Description / Comparison / Value'

export const specs: ReportSpec[] = [
  /* All Consults for Reason - Multi Problems ------------------------------- */
  {
    folder: 'Clinical - Pro/Obs', name: 'All Consults for Reason - Multi Problems', id: 'proobs-consults-multi',
    width: 663, height: 636, labelW: 100,
    provenance: '304050 49ef24f2 (window), 8d74575a (page)',
    inferred: 'Sample rows (the captured page lists none); the Excel columns come from the article text (facility, service centre, seen by).',
    fields: [
      ...multiProblems({ required: true, wideThird: true }),
      { kind: 'section', label: 'Consult Reasons' },
      ...[1, 2, 3].map((i): RSField => ({ kind: 'text', id: `reason${i}`, label: `${i}. Reason Includes:`, w: 288 })),
      { kind: 'rule' },
      dateRange('seen', 'Seen Date:'),
      ...otherOptions(),
    ],
    output: {
      title: 'CONSULT REASONS FOR PATIENT WITH PROBLEMS',
      cols: VISIT_COLS, head: ['NAME', 'DATE', 'CONSULT REASON', 'PROBLEMS', 'FAMILY DOCTOR'],
      rows: (ctx) => visitCells(consultVisits(ctx).rows),
      footer: (ctx) => { const v = consultVisits(ctx); return visitTotals(v.hits, v.rows) },
      excelHead: visitExcel([], 'SEEN BY').excelHead,
      excelRows: (ctx) => visitExcel(consultVisits(ctx).rows, 'SEEN BY').excelRows,
    },
    pages: (ctx) => {
      const r = (i: number) => `${i}. ${ctx.val(`reason${i}`) ? `**${up(ctx.val(`reason${i}`))}**` : ''}`
      return visitPage(ctx, 'CONSULT REASONS FOR PATIENT WITH PROBLEMS', ['NAME', 'DATE', 'CONSULT REASON', 'PROBLEMS', 'FAMILY DOCTOR'],
        ['CONSULTS:', `%LINE:33,33,34%${r(1)}|${r(2)}|${r(3)}`], multiTail(ctx, 'Performed from:', 'seen'), consultVisits(ctx))
    },
  },

  /* Claims for Diagnosis ---------------------------------------------------- */
  {
    folder: 'Clinical - Pro/Obs', name: 'Claims for Diagnosis', id: 'proobs-claims-dx',
    width: 663, height: 604, labelW: 100,
    provenance: '304050 45969384 (window), e2584bd7 (page)',
    inferred: 'The captured page prints only its heading, so the patient band (name, chart, date of birth, age, sex), the fee lines, the per-patient total and the three closing totals are reconstructed from the article text.',
    fields: [
      ...multiProblems({ required: true, wideThird: true }),
      { kind: 'rule' },
      { kind: 'radio', id: 'comparison', label: 'Comparison:', options: ['AND', 'OR'], value: 'OR' },
      { kind: 'section', label: 'Claim Information' },
      dateRange('claim', 'Claim Date:'),
      ...otherOptions({ csv: false, facilityLabel: 'Facility Code' }),
    ],
    output: {
      title: 'CLAIMS FOR PATIENT WITH SELECTED PROBLEMS',
      cols: CLAIM_COLS, head: CLAIM_HEAD,
      rows: claimRows,
      footer: (ctx) => claimTotals(ctx),
    },
    pages: (ctx) => [[
      ...pageHead('CLAIMS FOR PATIENT WITH SELECTED PROBLEMS'), ...multiEcho(ctx),
      `SELECTION TYPE:  **${ctx.val('comparison') || 'OR'}**`,
      ...multiTail(ctx, 'Claim Range:', 'claim'),
      cols(CLAIM_COLS), `%TH%${CLAIM_HEAD.join('|')}`, ...joinRows(claimRows(ctx)), '%RULE%',
      ...claimTotals(ctx),
    ].join('\n')],
  },

  /* Encounter Forms ---------------------------------------------------------- */
  {
    folder: 'Clinical - Pro/Obs', name: 'Encounter Forms', id: 'proobs-encounter-forms',
    width: 663, height: 604, labelW: 100,
    provenance: '304050 e95e8cb0 (window), c661fc10 (page)',
    inferred: 'The Form Code list (the capture shows it closed) is the emulator\'s encounter-form codes.',
    fields: [
      ...oneProblem(),
      { kind: 'section', label: 'Encounter Form' },
      { kind: 'select', id: 'formCode', label: 'Form Code:', options: FORM_CODES, w: 105 },
      ...otherOptions(),
    ],
    output: {
      title: 'LIST OF PATIENTS WITH SELECTED MOST RECENT ENCOUNTER FORMS FOR PROBLEM',
      cols: [33, 10, 22, 10, 25], head: ['NAME', 'MOST RECENT', '', 'PREVIOUS', ''],
      rows: formCells,
      footer: (_ctx, rows) => [`Totals Records Printed:   ${rows.length}`],
    },
    pages: (ctx) => {
      const rows = formCells(ctx)
      return [[
        ...pageHead('LIST OF PATIENTS WITH SELECTED MOST RECENT ENCOUNTER FORMS FOR PROBLEM'), ...oneEcho(ctx),
        `%LINE:12,50,13,25%FORM:|1:  ${ctx.val('formCode')}|Date:|${dateEcho(ctx, 'formDate')}`,
        '%RULE%',
        cols([33, 10, 22, 10, 25]), '%TH%**NAME**|**MOST RECENT**||**PREVIOUS**|',
        ...rows.map(tr), '%RULE%',
        `%LINE:22,40%Totals Records Printed:|${rows.length}`,
      ].join('\n')]
    },
  },

  /* Interventions ------------------------------------------------------------ */
  {
    folder: 'Clinical - Pro/Obs', name: 'Interventions', id: 'proobs-interventions',
    width: 663, height: 604, labelW: 100,
    provenance: '304050 86cf3379 (window), 0c3252ed (page)',
    fields: [
      ...oneProblem(),
      { kind: 'section', label: 'Interventions Search By' },
      byLine('int', 1), byLine('int', 2), byLine('int', 3),
      { kind: 'rule' },
      dateRange('performed', 'Performed Date:'),
      ...otherOptions(),
    ],
    output: {
      title: 'LIST OF PATIENTS WITH SELECTED MOST RECENT INTERVENTIONS RESULTS FOR PROBLEM',
      cols: SLOT_COLS, head: ['PATIENT NAME', 'DATE', 'DECLINE?', 'DATE', 'DECLINE?', 'DATE', 'DECLINE?'],
      rows: (ctx) => slotCells(interventionRows(ctx)),
      footer: (_ctx, rows) => slotFooter(rows),
    },
    pages: (ctx) => slotPage(ctx, {
      title: 'LIST OF PATIENTS WITH SELECTED MOST RECENT INTERVENTIONS RESULTS FOR PROBLEM',
      criteria: 'INTERVENTIONS', dateLabel: 'Date:', range: 'performed', prefix: 'int',
      name: up, a: 'DATE', b: 'DECLINE?', first: 'PATIENT NAME', rows: interventionRows(ctx),
    }),
  },

  /* Lab Result Combinations -------------------------------------------------- */
  {
    folder: 'Clinical - Pro/Obs', name: 'Lab Result Combinations', id: 'proobs-lab-combos',
    width: 713, height: 604, labelW: 100,
    provenance: '304050 8606eeef (window), 6d424fbe (page)',
    inferred: 'Comparison operators accepted (>, <, =, >=, <=, <>) beyond the article\'s ">", "<", "="; a lab line left without a comparison or value counts any result.',
    fields: [
      ...oneProblem('Contains ...'),
      { kind: 'section', label: LABS_HEADING },
      labLine(1, true, 245), labLine(2, true, 245), labLine(3, true, 245),
      { kind: 'rule' },
      dateRange('collected', 'Collected Date:'),
      { kind: 'rule' },
      { kind: 'radio', id: 'combo', label: 'Combinations:', options: ['AND', 'OR'], value: 'AND' },
      ...otherOptions(),
    ],
    output: {
      title: 'LIST OF PATIENTS WITH SELECTED MOST RECENT LAB RESULTS COMBINATIONS FOR PROBLEM',
      cols: SLOT_COLS, head: ['NAME', 'DATE', 'VALUE', 'DATE', 'VALUE', 'DATE', 'VALUE'],
      rows: (ctx) => slotCells(comboRows(ctx).rows),
      footer: (ctx, rows) => [
        `Number of patients with result selection criteria:   ${rows.length}`,
        `Total Patients with diagnostic criteria:   ${comboRows(ctx).hits.length}`,
      ],
      excelHead: ['NAME', 'DATE 1', 'VALUE 1', 'DATE 2', 'VALUE 2', 'DATE 3', 'VALUE 3', 'FACILITY CODE', 'SERVICE CENTRE', 'CHART #'],
      excelRows: (ctx) => { const r = comboRows(ctx).rows; return slotCells(r).map((c, i) => [...c, r[i]!.h.m.facility, r[i]!.h.m.service, r[i]!.h.p.chart]) },
    },
    pages: (ctx) => {
      const { hits, rows, slots } = comboRows(ctx)
      const crit = (i: number) => { const s = slots[i]!; return s.pat ? `${labTitle(ctx, s.pat)} ${s.cmp} ${s.val}`.trim() : '' }
      return [[
        ...pageHead('LIST OF PATIENTS WITH SELECTED MOST RECENT LAB RESULTS COMBINATIONS FOR PROBLEM'), ...oneEcho(ctx),
        `%LINE:14,48,14,24%LABS:|1:  ${crit(0)}|Collected Date:|${dateEcho(ctx, 'collected')}`,
        `%LINE:14,48%|2:  ${crit(1)}`, `%LINE:14,48%|3:  ${crit(2)}`,
        `%LINE:32,6%|${ctx.val('combo') === 'OR' ? 'OR' : 'AND'}`,
        '%RULE%',
        '%LINE:32,21,21,26%|**LAB RESULT / MEAURE 1**|**LAB RESULT / MEAURE 2**|**LAB RESULT / MEAURE 3**',
        cols(SLOT_COLS), '%TH%**NAME**|**DATE**|**VALUE**|**DATE**|**VALUE**|**DATE**|**VALUE**',
        ...slotCells(rows).map(tr), '%RULE%',
        `%LINE:32,40%Number of patients with result selection criteria:|${rows.length}`,
        `%LINE:32,40%Total Patients with diagnostic criteria:|${hits.length}`,
      ].join('\n')]
    },
  },

  /* Lab Results Change Velocity ---------------------------------------------- */
  {
    folder: 'Clinical - Pro/Obs', name: 'Lab Results Change Velocity', id: 'proobs-lab-velocity',
    width: 663, height: 604, labelW: 100,
    provenance: '304050 ed4bf918 (window), 87e1bc6d (page)',
    inferred: 'Projected percent change is computed as the least-squares slope per year over the mean value; the article gives only "Linear Regression - Best Fit Line".',
    fields: [
      ...oneProblem(),
      { kind: 'section', label: 'Lab Codes / Descriptions' },
      labLine(1, false, 305),
      { kind: 'rule' },
      dateRange('collected', 'Collected Date:'),
      ...otherOptions(),
    ],
    output: {
      title: 'LIST OF PATIENTS WITH SELECTED LAB RESULT CHANGE VELOCITY FOR PROBLEM',
      cols: VELOCITY_COLS,
      head: ['NAME', 'FIRST DATE', 'FIRST VALUE', 'LAST DATE', 'LAST VALUE', 'MIN', 'MAX', '# OF TESTS', 'PROJECTED PERCENT CHANGE'],
      rows: (ctx) => velocityRows(ctx).map((r) => r.cells),
      footer: (_ctx, rows) => [`Totals Records Printed:   ${rows.length}`, '', '1  Change velocity (slope) of a measure over time', '   Linear Regression - Best Fit Line.'],
      excelHead: ['NAME', 'FIRST DATE', 'FIRST VALUE', 'LAST DATE', 'LAST VALUE', 'MIN', 'MAX', '# OF TESTS', 'PROJECTED PERCENT CHANGE', ...EXTRA_HEAD, ...PERSON_HEAD],
      excelRows: (ctx) => velocityRows(ctx).map((r) => [...r.cells, ...extra(r.h), ...person(r.h)]),
    },
    pages: (ctx) => {
      const rows = velocityRows(ctx)
      const pat = ctx.val('lab1')
      return [[
        ...pageHead('LIST OF PATIENTS WITH SELECTED LAB RESULT CHANGE VELOCITY FOR PROBLEM'), ...oneEcho(ctx),
        `%LINE:14,48,14,24%LAB NAME:|${b(pat ? labTitle(ctx, pat) : '')}|Collected Date:|${dateEcho(ctx, 'collected')}`,
        '%RULE%',
        `%LINE:28,17,19,18,8,10%|**FIRST LAB RESULT**|**LAST LAB RESULT**|**EXTREMES**|**# OF**|**PROJECTED PERCENT**`,
        cols(VELOCITY_COLS), '%TH%**NAME**|**DATE**|**VALUE**|**DATE**|**VALUE**|**MIN**|**MAX**|**TESTS**|**CHANGE ¹**',
        ...rows.map((r) => tr(r.cells)), '%RULE%',
        `%LINE:22,40%Totals Records Printed:|${rows.length}`,
        '%RULE%',
        '¹ Change velocity (slope) of a measure over time',
        '   Linear Regression - Best Fit Line.',
      ].join('\n')]
    },
  },

  /* Laboratory Results ------------------------------------------------------- */
  {
    folder: 'Clinical - Pro/Obs', name: 'Laboratory Results', id: 'proobs-lab-results',
    width: 663, height: 604, labelW: 100,
    provenance: '304050 1dd6dfed (window), 81382150 (page)',
    fields: [
      ...oneProblem('Contains ...'),
      { kind: 'section', label: LABS_HEADING },
      labLine(1, false, 300), labLine(2, false, 300), labLine(3, false, 300),
      { kind: 'rule' },
      dateRange('collected', 'Collected Date:'),
      ...otherOptions(),
    ],
    output: {
      title: 'LIST OF PATIENTS WITH SELECTED MOST RECENT LAB RESULTS FOR PROBLEM',
      cols: SLOT_COLS, head: ['NAME', 'DATE', 'VALUE', 'DATE', 'VALUE', 'DATE', 'VALUE'],
      rows: (ctx) => slotCells(labRows(ctx)),
      footer: (_ctx, rows) => slotFooter(rows),
      excelHead: ['NAME', 'DATE 1', 'VALUE 1', 'DATE 2', 'VALUE 2', 'DATE 3', 'VALUE 3', ...EXTRA_HEAD, 'LAST CONTACT'],
      excelRows: (ctx) => { const r = labRows(ctx); return slotCells(r).map((c, i) => [...c, ...extra(r[i]!.h), rsDaysAgo(r[i]!.h.m.last)]) },
    },
    pages: (ctx) => slotPage(ctx, {
      title: 'LIST OF PATIENTS WITH SELECTED MOST RECENT LAB RESULTS FOR PROBLEM',
      criteria: 'LABS:', dateLabel: 'Collected Date:', range: 'collected', prefix: 'lab',
      name: (p) => labTitle(ctx, p), a: 'DATE', b: 'VALUE', first: 'NAME', rows: labRows(ctx),
    }),
  },

  /* Medications -------------------------------------------------------------- */
  {
    folder: 'Clinical - Pro/Obs', name: 'Medications', id: 'proobs-medications',
    width: 663, height: 604, labelW: 100,
    provenance: '304050 189e75b2 (window), 4436004d (page)',
    inferred: 'The two scrolling lists (64 search strings, medication concepts) are drawn as the lines the capture shows (4 and 5); the Begins With / Ends With choices of each line\'s drop-down (the capture shows only Contains) come from the article text.',
    fields: [
      ...oneProblem(),
      { kind: 'section', label: 'Enter search string(s) for Medication Name' },
      ...[1, 2, 3, 4].map((i): RSField => ({
        kind: 'row', label: `${i} )`, fields: [
          { kind: 'text', id: `med${i}`, w: 455, dots: { title: 'Medication Name', options: MED_PICK } },
          { kind: 'select', id: `med${i}Mode`, options: MED_MODES, value: 'Contains', w: 90 },
        ],
      })),
      { kind: 'section', label: 'Enter Medication Concept(s)' },
      ...[1, 2, 3, 4, 5].map((i): RSField => ({
        kind: 'row', label: `${i} )`, fields: [
          { kind: 'text', id: `medConcept${i}`, w: 185, dots: { title: 'Medication Concept', options: MED_CONCEPTS } },
          { kind: 'text', id: `medConcept${i}Desc`, w: 360, disabled: true },
        ],
      })),
      ...otherOptions(),
    ],
    output: {
      title: 'LIST OF PATIENTS WITH SELECTED MOST LONG TERM MEDICATIONS FOR PROBLEM',
      cols: [34, 16, 50], head: ['NAME', 'LAST CONTACT', 'MEDICATION'],
      rows: (ctx) => medRows(ctx).map((r) => [rsName(r.h.p), rsDaysAgo(r.h.m.last), r.med?.name ?? '']),
      footer: (_ctx, rows) => [`Total Patients Printed:   ${new Set(rows.map((r) => r[0])).size}`, `Total Records Printed:   ${rows.length}`],
      excelHead: ['NAME', 'LAST CONTACT', 'MEDICATION', ...EXTRA_HEAD, 'AGE', 'DOB', 'SEX', 'START DATE', 'DOSE / FREQUENCY'],
      excelRows: (ctx) => medRows(ctx).map((r) => [
        rsName(r.h.p), rsDaysAgo(r.h.m.last), r.med?.name ?? '', ...extra(r.h),
        rsAge(r.h.p.dob), r.h.p.dob, r.h.p.gender, r.med ? rsDaysAgo(r.med.ago) : '', r.med?.dose ?? '',
      ]),
    },
    pages: (ctx) => {
      const rows = medRows(ctx)
      return [[
        ...pageHead('LIST OF PATIENTS WITH SELECTED MOST LONG TERM MEDICATIONS FOR PROBLEM'), ...oneEcho(ctx),
        medEcho(ctx), '%RULE%',
        cols([34, 16, 50]), '%TH%**NAME**|**LAST CONTACT**|**MEDICATION**',
        ...rows.map((r) => tr([rsName(r.h.p), rsDaysAgo(r.h.m.last), r.med?.name ?? ''])), '%RULE%',
        `%LINE:22,40%Total Patients Printed:|${new Set(rows.map((r) => r.h.p.chart)).size}`,
        `%LINE:22,40%Total Records Printed:|${rows.length}`,
      ].join('\n')]
    },
  },

  /* Most Recent Consult ------------------------------------------------------ */
  {
    folder: 'Clinical - Pro/Obs', name: 'Most Recent Consult', id: 'proobs-recent-consult',
    width: 663, height: 604, labelW: 100,
    provenance: '304050 5581a584 (window), ead5ab80 (page)',
    fields: [
      ...oneProblem(),
      { kind: 'section', label: 'Reasons:' },
      byLine('reason', 1), byLine('reason', 2), byLine('reason', 3),
      { kind: 'rule' },
      dateRange('seen', 'Seen Date:'),
      ...otherOptions(),
    ],
    output: {
      title: 'LIST OF PATIENTS WITH SELECTED MOST RECENT CONSULTS RESULTS FOR PROBLEM',
      cols: SLOT_COLS, head: ['NAME', 'DATE', 'REASON', 'DATE', 'REASON', 'DATE', 'REASON'],
      rows: (ctx) => slotCells(reasonRows(ctx)),
      footer: (_ctx, rows) => slotFooter(rows),
    },
    pages: (ctx) => slotPage(ctx, {
      title: 'LIST OF PATIENTS WITH SELECTED MOST RECENT CONSULTS RESULTS FOR PROBLEM',
      criteria: 'REASON', dateLabel: 'Seen:', range: 'seen', prefix: 'reason',
      name: (p) => up(p).slice(0, 24), a: 'DATE', b: 'REASON', first: 'NAME', rows: reasonRows(ctx),
    }),
  },

  /* Visit for Provider - Multi Problems -------------------------------------- */
  {
    folder: 'Clinical - Pro/Obs', name: 'Visit for Provider - Multi Problems', id: 'proobs-visit-provider',
    width: 663, height: 598, labelW: 100,
    provenance: '304050 63205f5e (window), 902acda8 (page)',
    inferred: 'The capture paints the Encounter Date "from" box salmon (0000.00.00); a range cannot be marked required, so it is a plain default. The Provider list takes a typed name too (EMERGENCY), for the article\'s "To find ER Data" tip.',
    fields: [
      ...multiProblems({ required: false, wideThird: true }),
      { kind: 'section', label: 'Encounter Provider' },
      { kind: 'select', id: 'encProvider', label: '1. Provider:', options: ENCOUNTER_PROVIDERS, w: 182, editable: true, hint: '(Leave blank for ALL)' },
      { kind: 'rule' },
      { kind: 'range', id: 'enc', label: 'Encounter Date:', from: '0000.00.00', w: 90, hint: '(INCLUSIVE)' },
      ...otherOptions(),
    ],
    output: {
      title: 'VISITS WITH PROVIDER FOR PATIENTS WITH PROBLEM',
      cols: VISIT_COLS, head: ['NAME', 'DATE', 'VISIT REASON', 'PROBLEMS', 'FAMILY DOCTOR'],
      rows: (ctx) => visitCells(providerVisits(ctx).rows),
      footer: (ctx) => { const v = providerVisits(ctx); return visitTotals(v.hits, v.rows) },
      excelHead: visitExcel([], 'PROVIDER').excelHead,
      excelRows: (ctx) => visitExcel(providerVisits(ctx).rows, 'PROVIDER').excelRows,
    },
    pages: (ctx) => visitPage(ctx, 'VISITS WITH PROVIDER FOR PATIENTS WITH PROBLEM', ['NAME', 'DATE', 'VISIT REASON', 'PROBLEMS', 'FAMILY DOCTOR'],
      [`PROVIDER:     ${b(up(ctx.val('encProvider')))}`], multiTail(ctx, 'Peformed from:', 'enc'), providerVisits(ctx)),
  },

  /* Visit With Visit Code - Multi Problem ------------------------------------ */
  {
    folder: 'Clinical - Pro/Obs', name: 'Visit With Visit Code - Multi Problem', id: 'proobs-visit-code',
    width: 663, height: 598, labelW: 100,
    provenance: '304050 9f491276 (window), ccd5c53b (page)',
    inferred: 'The red "(REQUIRED)" beside Code is drawn as its grey hint; with no code picked the report lists no visits.',
    fields: [
      ...multiProblems({ required: true }),
      { kind: 'section', label: 'Visit Code' },
      { kind: 'select', id: 'visitCode', label: '1. Code:', options: VISIT_CODES, w: 80, hint: '(REQUIRED)' },
      { kind: 'rule' },
      dateRange('enc', 'Encounter Date:'),
      ...otherOptions(),
    ],
    output: {
      title: 'VISITS WITH VISIT CODE FOR PATIENTS WITH PROBLEM',
      cols: VISIT_COLS, head: ['NAME', 'DATE', 'VISIT REASON', 'PROBLEMS', 'FAMILY DOCTOR'],
      rows: (ctx) => visitCells(codeVisits(ctx).rows),
      footer: (ctx) => { const v = codeVisits(ctx); return visitTotals(v.hits, v.rows) },
      excelHead: visitExcel([], 'PROVIDER').excelHead,
      excelRows: (ctx) => visitExcel(codeVisits(ctx).rows, 'PROVIDER').excelRows,
    },
    pages: (ctx) => visitPage(ctx, 'VISITS WITH VISIT CODE FOR PATIENTS WITH PROBLEM', ['NAME', 'DATE', 'VISIT REASON', 'PROBLEMS', 'FAMILY DOCTOR'],
      [`VISIT CODE:    ${b(ctx.val('visitCode'))}`], multiTail(ctx, 'Peformed from:', 'enc'), codeVisits(ctx)),
  },
]
