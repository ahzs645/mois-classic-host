import type { Patient } from '../patients'
import {
  MOIS_TODAY, rsAge, rsDaysAgo, rsMatchOf, rsName, rsPatients,
  type ReportSpec, type RSContext, type RSField, type RSMatch, type RSPick, type RSRow,
} from './types'

/* ============================================================================
   Report specs transcribed from manual article 304049 (Reports ▸ Clinical -
   Main): 17 of the folder's 21 reports. Age/Sex Register, Patient by
   Diagnosis / Fee, Patients by Age and Patients by Procedure keep their
   hand-built windows (screens/ReportParameterWindows.tsx,
   PatientsByProcedureWindow.tsx) and are not specified here.

   PROVENANCE: per spec below — `304049 <window hash> (window), <page hash>
   (page)`, the prefixes of the article's Parameters and Report Outcome
   captures.

   THE `%` WILDCARD. 304049 opens with the tip this folder is known for:
   "Want to run a report for all concepts/names/etc., but the search
   parameter window only gives you a list to select from and no option to
   choose "All"? Just enter a % sign into the field. For any report that has
   a CONTAINS argument, BEGINS with, or ENDS with, this single, wildcard
   character will find all entries for you! (e.g. use A%A to find every item
   with two A's in it)." So every search box here (Description, Contains,
   Doc. Type, Admitted To, Test Name, Report, Substance, Reaction, Medication
   Name with its Contains / Begins With / Ends With choice, Connection,
   Service Episode, the Ordered By / To names …) narrows the sample rows
   through `rsLike`, either as a table `filters` entry (a single box over a
   printed column) or inside the spec's `rows` function (several boxes read
   together under an AND / OR choice, or a box over a value the page does
   not print, such as an intervention's name or a lab report's text). The
   drop-downs that are really typed-into lists (Author, Service Provider)
   are `editable`, so `%` can be typed there too.

   All names on the printed pages are the emulator's fictional roster
   (`rsPatients()`); providers are `RS_PROVIDERS`; dates are relative to
   MOIS_TODAY so a window's default range finds them.
   ========================================================================= */

const A = 'Clinical - Main'

/* --- roster and parameter helpers ------------------------------------------ */
const pt = (chart: string): Patient => rsPatients().find((p) => p.chart === chart) ?? rsPatients()[0]!
/** yyyy.mm.dd → yy.mm.dd, the two-digit year the older pages print */
const yy = (d: string) => d.slice(2)
/** yyyy.mm.dd → m/d/yyyy, the Reaction Risks page's */
const mdy = (d: string) => { if (!d) return ''; const [y, m, dd] = d.split('.'); return `${Number(m)}/${Number(dd)}/${y}` }
/** "FIRST LAST", the Patient Connections page's */
const firstLast = (p: Patient) => `${p.first} ${p.last}`

const blankDate = (d: string) => !d.trim() || /^0+\.0+\.0+$/.test(d.trim())
/** `d` inside the range parameter `id` (blank or 0000.00.00 ends ignored) */
function dateOk(ctx: RSContext, id: string, d: string): boolean {
  const lo = ctx.val(`${id}From`); const hi = ctx.val(`${id}To`)
  return (blankDate(lo) || d >= lo.trim()) && (blankDate(hi) || (!!d && d <= hi.trim()))
}
/** the patient inside the age range `id` ("Leave blank or zeros to ignore") */
function ageOk(ctx: RSContext, p: Patient, id = 'age'): boolean {
  const lo = ctx.val(`${id}From`).trim(); const hi = ctx.val(`${id}To`).trim()
  if ((!lo && !hi) || (Number(lo) === 0 && Number(hi) === 0)) return true
  if (!p.dob) return false
  const a = Number(rsAge(p.dob))
  return (!lo || a >= Number(lo)) && (!hi || a <= Number(hi))
}
/** each sample chart's service provider (the "Provider:" drop-downs match it) */
const MRP: Record<string, string> = {
  3598: 'BEARDWOOD, WALTER', 2429: 'DUCHARME, AMARILYS', 746: 'HOWSER, DOOGIE', 1885: 'SHEWCHUK, LEAH', 712: 'BEARDWOOD, WALTER',
  3609: 'SHEWCHUK, LEAH', 3658: 'DUCHARME, AMARILYS', 2680: 'BEARDWOOD, WALTER', 1003: 'FAIRCHILD, NESRIN L', 2350: 'FAIRCHILD, NESRIN L',
}
const mrpOf = (chart: string) => MRP[chart] ?? ''
/** "Active Patients Only" */
const activeOk = (ctx: RSContext, p: Patient, id = 'active') => !ctx.on(id) || p.status === 'A'
/** an INCLUDED / EXCLUDED list of codes (Patient Statuses, Order Statuses …) */
function codesOk(ctx: RSContext, modeId: string, codesId: string, code: string): boolean {
  const codes = ctx.val(codesId).split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
  if (!codes.length) return true
  const hit = codes.some((c) => ctx.like(c, code, 'equals'))
  return ctx.val(modeId).toUpperCase().startsWith('EX') ? !hit : hit
}
/** any of the boxes `ids` matches `value` (`%`-aware); all blank = no filter */
function anyLike(ctx: RSContext, ids: string[], value: string, mode: RSMatch = 'contains'): boolean {
  const pats = ids.map((id) => ctx.val(id)).filter((s) => s.trim())
  return !pats.length || pats.some((s) => ctx.like(s, value, mode))
}
/** an editable provider list: blank or `%` = all, else a `%`-aware match */
const provOk = (ctx: RSContext, id: string, name: string) => ctx.like(ctx.val(id), name, 'equals')
const ids = (base: string, n: number) => Array.from({ length: n }, (_, i) => `${base}${i + 1}`)

/** the "Records Printed / Patients Printed" footer most of these pages carry */
const printed = (nameCol: number, upper = false) => (_ctx: RSContext, rows: string[][]) => {
  const pts = new Set(rows.map((r) => r[nameCol]).filter(Boolean)).size
  return upper
    ? ['%RULE%', `**RECORDS PRINTED: ${rows.length}**`, `**PATIENTS PRINTED: ${pts}**`]
    : ['', `Records Printed: ${rows.length}`, `Patients Printed: ${pts}`]
}

/* --- the lists the "…" pickers and drop-downs offer (fictional) ------------- */
const CONSULT_CONCEPTS = ['DIABETES EDUCATION ASSESSMENT', 'MENTAL HEALTH ASSESSMENT', 'CARDIOLOGY CONSULT', 'ORTHOPAEDIC CONSULT', 'MATERNITY CONSULT']
const ADMISSION_CONCEPTS = ['DISCHARGE SUMMARY', 'EMERGENCY VISIT', 'SURGICAL ADMISSION']
const IMAGING_CONCEPTS = ['MAMMOGRAPHY', 'CHEST X-RAY', 'BONE DENSITY', 'ULTRASOUND ABDOMEN']
const INTERVENTION_CONCEPTS = ['INFLUENZA VACCINATION', 'PNEUMOCOCCAL VACCINATION', 'SMOKING CESSATION', 'FOOT EXAM']
const LAB_CODES = ['BP - BLOOD PRESSURE (SYSTOLIC/DIASTOLIC)', 'BMI - BODY MASS INDEX', 'HBA1C - HEMOGLOBIN A1C', 'LDL - LDL CHOLESTEROL', 'EGFR - ESTIMATED GFR', 'WT - WEIGHT']
const LAB_CONCEPTS = ['BLOOD PRESSURE', 'DIABETES CONTROL', 'LIPIDS', 'RENAL FUNCTION']
const MEDICATIONS = ['AMOXICILLIN 500 MG CAPSULE', 'ATORVASTATIN 20 MG TABLET', 'CEPHALEXIN 250 MG/5 ML POWDER FOR SUSPENSION', 'METFORMIN 500 MG TABLET', 'RAMIPRIL 5 MG CAPSULE', 'SALBUTAMOL 100 MCG INHALER']
const MED_CONCEPTS = ['ANTIBIOTICS', 'ANTIHYPERTENSIVES', 'DIABETES MEDICATIONS', 'STATINS', 'BRONCHODILATORS']
const MATCH_MODES = ['Contains', 'Begins With', 'Ends With']
const ORDER_STATUSES = ['IP - IN PROCESS', 'OH - ON HOLD', 'RA - RESULTS AVAILABLE', 'C - COMPLETED', 'X - CANCELLED', 'E - ERROR']
const ORDER_TYPES = ['IMAGE - IMAGE (XRAY)', 'PROCEDURE - PROCEDURE', 'CONSULTATION - CONSULTATION', 'INTERVENTION - INTERVENTION', 'LAB - LABS', 'MISC - MISC']
const ORDER_PRIORITIES = ['ASAP - ASAP', 'R - ROUTINE', 'S - STAT', 'TC - TIME CRITICAL']
const INCLUDED = ['INCLUDED', 'EXCLUDED']
const BENEFIT_SOURCES = ['', 'PCPC ENROLMENT', 'NIHB', 'WORKSAFEBC', 'VETERANS AFFAIRS']
const BENEFIT_SERVICES = ['', 'ATTACHED PATIENT', 'COMPLEX CARE', 'DENTAL', 'MEDICAL TRANSPORTATION', 'VISION CARE']
const CONN_ROLES = ['', 'REFERRING', 'PRIMARY', 'CONSULTANT', 'PHARMACY', 'HOME CARE']
const CONN_RESOURCES = ['', 'PROVIDER (INT)', 'PROVIDER (EXT)', 'CLINIC', 'ORGANIZATION']
const CONNECTIONS = ['BEARDWOOD, WALTER', 'DUCHARME, AMARILYS', 'FAIRCHILD, NESRIN L', 'HOWSER, DOOGIE', 'SHEWCHUK, LEAH', 'NORTHSIDE PHARMACY', 'PRINCE GEORGE HEALTH UNIT']
const SERVICE_EPISODES = ['MHSU - MENTAL HEALTH & SUBSTANCE USE', 'HC - HOME CARE NURSING', 'MAT - MATERNITY', 'CDM - CHRONIC DISEASE MANAGEMENT', 'PALL - PALLIATIVE CARE']
const PROVIDED_BY = ['BEARDWOOD, WALTER', 'DUCHARME, AMARILYS', 'HOWSER, DOOGIE', 'SHEWCHUK, LEAH', 'NURSING TEAM (ORG ROLE)', 'MENTAL HEALTH TEAM (ORG ROLE)', 'PRINCE GEORGE HEALTH UNIT (ORG)']
const VACCINE_CONCEPTS = ['INFLUENZA VACCINE', 'PNEUMOCOCCAL VACCINE', 'COVID-19 VACCINE', 'TETANUS/DIPHTHERIA VACCINE']

/** the clinic's providers (RS_PROVIDERS) by first name */
const P = { walter: 'BEARDWOOD, WALTER', amarilys: 'DUCHARME, AMARILYS', nesrin: 'FAIRCHILD, NESRIN L', doogie: 'HOWSER, DOOGIE', leah: 'SHEWCHUK, LEAH' }

/* --- field builders shared by the windows ----------------------------------- */
const dots = (title: string, options: RSPick['options'], multi?: boolean): RSPick => ({ title, options, ...(multi ? { multi } : {}) })
const activeCheck = (label = 'Patients List:'): RSField => ({ kind: 'check', id: 'active', label, text: 'Active Patients Only', checked: true })
const dateRange = (heading = 'Date Range (INCLUSIVE)', from = '', to = ''): RSField[] => [
  { kind: 'section', label: heading },
  { kind: 'range', id: 'date', label: 'Start Date:', from, to },
]
/** Provider / Facility Code / Service Center, as the "for Dates" windows line them up */
const pfs: RSField[] = [
  { kind: 'select', id: 'provider', label: 'Provider:', options: 'providers', w: 142, editable: true },
  { kind: 'select', id: 'facility', label: 'Facility Code:', options: 'facilities', w: 102 },
  { kind: 'select', id: 'serviceCenter', label: 'Service Center:', options: 'serviceCenters', w: 142 },
]
/** Description / OR... / Concept …, the search block of the "for Dates" windows */
const searchBlock = (heading: string, label: string, id: string, conceptTitle: string, concepts: readonly string[]): RSField[] => [
  { kind: 'section', label: heading },
  { kind: 'text', id, label, w: 326, required: true },
  { kind: 'note', text: 'OR...' },
  { kind: 'text', id: 'concept', label: 'Concept:', w: 326, dots: dots(conceptTitle, concepts) },
]
/** INCLUDED/EXCLUDED + a "…" list of codes on one line */
const codesRow = (modeId: string, codesId: string, value: string, pick: RSPick, w = 230, hint?: string): RSField => ({
  kind: 'row', fields: [
    { kind: 'select', id: modeId, options: INCLUDED, value: 'INCLUDED', w: 80 },
    { kind: 'text', id: codesId, value, w, dots: pick, ...(hint ? { hint } : {}) },
  ],
})
/** the numbered "1 )" search lines with a Contains / Begins With / Ends With choice */
const medLines = (n: number): RSField[] => Array.from({ length: n }, (_, i) => ({
  kind: 'row' as const, label: `${i + 1} )`, fields: [
    { kind: 'text' as const, id: `med${i + 1}`, w: 390, dots: dots('Medications', MEDICATIONS) },
    { kind: 'select' as const, id: `med${i + 1}Mode`, options: MATCH_MODES, value: 'Contains', w: 90 },
  ],
}))
const conceptLines = (base: string, n: number, title: string, options: readonly string[], w = 180, descW = 360): RSField[] =>
  Array.from({ length: n }, (_, i) => ({
    kind: 'row' as const, label: `${i + 1} )`, fields: [
      { kind: 'text' as const, id: `${base}${i + 1}`, w, dots: dots(title, options) },
      { kind: 'text' as const, id: `${base}${i + 1}Desc`, w: descW, disabled: true },
    ],
  }))
/** Connection Role / Connection Resource / Connection lines */
const connectionLines = (n: number, requiredFirst: boolean): RSField[] => [
  { kind: 'note', text: ' '.repeat(20) + 'Connection Role' + ' '.repeat(16) + 'Connection Resource' + ' '.repeat(10) + 'Connection' },
  ...Array.from({ length: n }, (_, i): RSField => ({
    kind: 'row', fields: [
      { kind: 'select', id: `role${i + 1}`, options: CONN_ROLES, w: 120 },
      { kind: 'select', id: `resource${i + 1}`, options: CONN_RESOURCES, w: 130 },
      { kind: 'text', id: `conn${i + 1}`, w: 250, dots: dots('Connections', CONNECTIONS), ...(requiredFirst && i === 0 ? { required: true } : {}) },
    ],
  })),
]

/** the medication search both Medications and Prescriptions for Dates run:
    the numbered name lines each with their own Contains / Begins With / Ends
    With, the concept lines, and Search Type AND (the patient has every item)
    or OR (any item). */
function medSearch(ctx: RSContext, lines: number, recs: { chart: string; med: string; concept: string }[]) {
  const names = ids('med', lines).filter((id) => ctx.val(id).trim())
  const concepts = ids('conc', 4).filter((id) => ctx.val(id).trim())
  const crit = [
    ...names.map((id) => (m: { med: string }) => ctx.like(ctx.val(id), m.med, rsMatchOf(ctx.val(`${id}Mode`)))),
    ...concepts.map((id) => (m: { concept: string }) => ctx.like(ctx.val(id), m.concept, 'contains')),
  ]
  if (!crit.length) return () => true
  const and = ctx.val('searchType').startsWith('AND')
  return (r: { chart: string; med: string; concept: string }) => {
    const hitsRow = crit.some((c) => c(r))
    if (!and) return hitsRow
    const mine = recs.filter((x) => x.chart === r.chart)
    return hitsRow && crit.every((c) => mine.some((m) => c(m)))
  }
}

/* ===========================================================================
   The specs
   ======================================================================== */

/* --- Consult Reason for Dates ---------------------------------------------- */
const consults = [
  { chart: '2429', refer: '', seen: 400, reason: 'DIABETIC EDUCATION', concept: 'DIABETES EDUCATION ASSESSMENT', by: '', seenBy: 'DIABETIC CLINIC' },
  { chart: '746', refer: 180, seen: 150, reason: 'ANXIETY - ASSESSMENT', concept: 'MENTAL HEALTH ASSESSMENT', by: P.doogie, seenBy: 'MENTAL HEALTH' },
  { chart: '1885', refer: '', seen: 320, reason: 'DIABETIC EDUCATION', concept: 'DIABETES EDUCATION ASSESSMENT', by: '', seenBy: 'DIABETIC CLINIC' },
  { chart: '3609', refer: 90, seen: 60, reason: 'CHEST PAIN ON EXERTION', concept: 'CARDIOLOGY CONSULT', by: P.leah, seenBy: 'DR. CARDIO' },
  { chart: '712', refer: 45, seen: 20, reason: 'KNEE PAIN, ? MENISCAL TEAR', concept: 'ORTHOPAEDIC CONSULT', by: P.walter, seenBy: 'DR. BONES' },
  { chart: '2680', refer: '', seen: 210, reason: 'DIABETIC EDUCATION', concept: 'DIABETES EDUCATION ASSESSMENT', by: '', seenBy: 'DIABETIC CLINIC' },
  { chart: '3658', refer: 30, seen: 12, reason: 'PRENATAL - FIRST VISIT', concept: 'MATERNITY CONSULT', by: P.amarilys, seenBy: 'MATERNITY CLINIC' },
]

const consultReason: ReportSpec = {
  folder: A, name: 'Consult Reason for Dates', id: 'consult-reason',
  width: 670, height: 540,
  provenance: '304049 10068aaa (window), a15cfeff (page)',
  fields: [
    ...searchBlock('Enter search string for Consult Reason', 'Description:', 'desc', 'Consult Concepts', CONSULT_CONCEPTS),
    ...dateRange(),
    { kind: 'section', label: 'Other Options:' },
    activeCheck(), ...pfs,
  ],
  output: {
    title: 'CONSULT REASON FOR DATE RANGE',
    subtitle: 'For Date between {dateFrom} and {dateTo}\n%SUB%Consult Concept: {concept}',
    cols: [24, 9, 7, 7, 23, 15, 15],
    head: ['NAME', 'DATE OF BIRTH', 'DATE REFER', 'DATE SEEN', 'CONSULT REASON', 'REFER BY', 'SEEN BY'],
    rows: (ctx) => consults
      .filter((c) => { const p = pt(c.chart); return activeOk(ctx, p) && dateOk(ctx, 'date', rsDaysAgo(c.seen)) && ctx.like(ctx.val('concept'), c.concept) && provOk(ctx, 'provider', mrpOf(c.chart)) })
      .map((c) => { const p = pt(c.chart); return [rsName(p), p.dob, typeof c.refer === 'number' ? yy(rsDaysAgo(c.refer)) : '', yy(rsDaysAgo(c.seen)), c.reason, c.by, c.seenBy] })
      .sort((a, b) => a[0]!.localeCompare(b[0]!)),
    filters: [{ field: 'desc', col: 4, mode: 'contains' }],
    footer: printed(0),
  },
}

/* --- Documents for Dates ----------------------------------------------------- */
const documents: [string, number, string, string][] = [
  ['3598', 200, 'PAPER FORM', 'COMPUTED TOMOGRAPHY REQUISITION'],
  ['3598', 200, 'PAPER FORM', 'STANDARD OUT-PATIENT BREAST IMAGING'],
  ['2429', 120, 'PAPER FORM', 'IMAGING REQUISITION'],
  ['746', 95, 'EKG', '12 LEAD - SINUS RHYTHM'],
  ['1885', 60, 'PAPER FORM', 'EEG / EP REQUISITION'],
  ['3609', 44, 'CONSENT', 'CONSENT TO RELEASE INFORMATION'],
  ['712', 30, 'PAPER FORM', 'SURGICAL PATHOLOGY REQUISITION'],
  ['712', 30, 'EKG', '12 LEAD - LEFT AXIS DEVIATION'],
  ['2680', 21, 'CORRESPONDENCE', 'LETTER FROM INSURER'],
  ['3658', 7, 'PAPER FORM', 'X-RAY AND ULTRASOUND REQUISITION'],
]

const documentsForDates: ReportSpec = {
  folder: A, name: 'Documents for Dates', id: 'documents-dates',
  width: 670, height: 540,
  provenance: '304049 d5f4e0e1 (window), 051be3db (page)',
  fields: [
    { kind: 'section', label: 'Enter search string for Document Type:' },
    { kind: 'text', id: 'docType', label: 'Doc. Type:', w: 326, required: true },
    ...dateRange(),
    { kind: 'section', label: 'Other Options:' },
    activeCheck(),
  ],
  output: {
    /* "Documet" as the capture prints it */
    title: 'DOCUMENT FOR DATE RANGE',
    subtitle: 'For Date between {dateFrom} and {dateTo}\n%SUB%Documet Type Contains: {docType}',
    cols: [28, 7, 10, 9, 15, 31],
    head: ['NAME', 'CHART NO.', 'DATE OF BIRTH', 'DATE', 'DOC TYPE', 'NOTE'],
    rows: (ctx) => documents
      .filter(([c, d]) => activeOk(ctx, pt(c)) && dateOk(ctx, 'date', rsDaysAgo(d)))
      .map(([c, d, type, note]) => { const p = pt(c); return [rsName(p), p.chart, p.dob, rsDaysAgo(d), type, note] })
      .sort((a, b) => a[0]!.localeCompare(b[0]!)),
    filters: [{ field: 'docType', col: 4, mode: 'contains' }],
    footer: printed(0),
    chartCol: 1,
  },
}

/* --- Facility Admission for Dates ------------------------------------------- */
const admissions: [string, number | '', string, string, string][] = [
  ['3598', 300, 'UHNBC', 'discharge summary', 'DISCHARGE SUMMARY'],
  ['2429', 410, 'DAWSON CREEK HOSPITAL', 'discharge summary fever NYD', 'DISCHARGE SUMMARY'],
  ['1885', '', 'UHNBC', '', 'EMERGENCY VISIT'],
  ['712', 88, 'G.R. BAKER MEMORIAL', 'discharge summary - lap chole', 'SURGICAL ADMISSION'],
  ['3609', 25, 'UHNBC', 'discharge summary', 'DISCHARGE SUMMARY'],
  ['2680', 140, 'MILLS MEMORIAL', 'discharge summary', 'DISCHARGE SUMMARY'],
]
const withInsurance = (chartCol: number) => (_ctx: RSContext, rows: string[][]) =>
  rows.map((r) => { const p = pt(r[chartCol]!); return [...r, p.insurance ?? 'BC', p.bchn ?? '', p.status] })

const facilityAdmission: ReportSpec = {
  folder: A, name: 'Facility Admission for Dates', id: 'facility-admission',
  width: 670, height: 540,
  provenance: '304049 8beaee4d (window), f47de989 (page)',
  fields: [
    { kind: 'section', label: 'Facility Admission Information' },
    { kind: 'text', id: 'admittedTo', label: 'Admitted To:', w: 142, required: true, hint: '(includes)' },
    { kind: 'text', id: 'desc', label: 'Description:', w: 326 },
    { kind: 'note', text: 'OR...' },
    { kind: 'text', id: 'concept', label: 'Concept:', w: 326, dots: dots('Admission Concepts', ADMISSION_CONCEPTS) },
    ...dateRange(),
    { kind: 'section', label: 'Other Options:' },
    activeCheck(), ...pfs,
  ],
  output: {
    title: 'ADMISSION FOR DATE RANGE',
    cols: [28, 7, 10, 10, 18, 27],
    head: ['NAME', 'CHART NO.', 'DATE OF BIRTH', 'DISCHARGE DATE', 'FACILITY', 'DESCRIPTION'],
    rows: (ctx) => admissions
      .filter(([c, d, , , concept]) => activeOk(ctx, pt(c)) && dateOk(ctx, 'date', d === '' ? '' : rsDaysAgo(d)) && ctx.like(ctx.val('concept'), concept) && provOk(ctx, 'provider', mrpOf(c)))
      .map(([c, d, fac, desc]) => { const p = pt(c); return [rsName(p), p.chart, p.dob, d === '' ? '' : rsDaysAgo(d), fac, desc] })
      .sort((a, b) => a[0]!.localeCompare(b[0]!)),
    filters: [{ field: 'admittedTo', col: 4, mode: 'contains' }, { field: 'desc', col: 5, mode: 'contains' }],
    footer: printed(0),
    chartCol: 1,
    excelHead: ['NAME', 'CHART NO.', 'DATE OF BIRTH', 'DISCHARGE DATE', 'FACILITY', 'DESCRIPTION', 'INSURANCE', 'INSURANCE NO', 'STATUS'],
    excelRows: withInsurance(1),
  },
}

/* --- Imaging for Dates -------------------------------------------------------- */
const images = [
  { chart: '2429', d: 900, desc: 'BREAST MAMM SCREENING', concept: 'MAMMOGRAPHY', by: P.nesrin, note: 'Screening mammogram - no suspicious findings.' },
  { chart: '3609', d: 400, desc: 'RT MAMMOGRAM', concept: 'MAMMOGRAPHY', by: P.leah, note: 'Coned compression views: no persistent abnormality. Resume annual screening.' },
  { chart: '3658', d: 210, desc: 'SCREENING MAMMOGRAM', concept: 'MAMMOGRAPHY', by: P.amarilys, note: 'normal' },
  { chart: '1885', d: 150, desc: 'CHEST X-RAY PA AND LATERAL', concept: 'CHEST X-RAY', by: P.walter, note: 'No acute cardiopulmonary process.' },
  { chart: '712', d: 75, desc: 'ULTRASOUND ABDOMEN', concept: 'ULTRASOUND ABDOMEN', by: P.doogie, note: 'Cholelithiasis without cholecystitis.' },
  { chart: '2350', d: 40, desc: 'BONE DENSITY SCAN', concept: 'BONE DENSITY', by: P.nesrin, note: 'T-score -1.2, osteopenia.' },
]

const imagingForDates: ReportSpec = {
  folder: A, name: 'Imaging for Dates', id: 'imaging-dates',
  width: 670, height: 540,
  provenance: '304049 02c31f04 (window), d7cd99d9 (page)',
  fields: [
    ...searchBlock('Enter search string for Imaging Description', 'Description:', 'desc', 'Imaging Concepts', IMAGING_CONCEPTS),
    ...dateRange(),
    { kind: 'section', label: 'Other Options:' },
    activeCheck(), ...pfs,
  ],
  output: {
    title: 'IMAGING FOR DATE RANGE',
    subtitle: 'For Date between {dateFrom} and {dateTo}\n%SUB%Image Concept: {concept}',
    cols: [28, 7, 10, 10, 26, 19],
    head: ['NAME', 'CHART NO.', 'DATE OF BIRTH', 'DATE PERFORMED', 'IMAGE DESCRIPTION', 'ORDER BY'],
    /* each image's report excerpt prints under its row, so the rows are
       filtered here (a table filter would strand the excerpt lines) */
    rows: (ctx) => images
      .filter((i) => {
        const p = pt(i.chart)
        return activeOk(ctx, p) && dateOk(ctx, 'date', rsDaysAgo(i.d)) && ctx.like(ctx.val('desc'), i.desc)
          && ctx.like(ctx.val('concept'), i.concept) && provOk(ctx, 'provider', i.by)
      })
      .sort((a, b) => rsName(pt(a.chart)).localeCompare(rsName(pt(b.chart))))
      .flatMap((i): RSRow[] => { const p = pt(i.chart); return [[rsName(p), p.chart, p.dob, rsDaysAgo(i.d), i.desc, i.by], `%LINE:17,83%|${i.note}`] }),
    filters: [{ field: 'desc', col: 4, mode: 'contains' }],
    footer: printed(0),
    chartCol: 1,
    excelHead: ['NAME', 'CHART NO.', 'DATE OF BIRTH', 'DATE PERFORMED', 'IMAGE DESCRIPTION', 'ORDER BY', 'INSURANCE', 'INSURANCE NO', 'STATUS'],
    excelRows: withInsurance(1),
  },
}

/* --- Interventions for Dates -------------------------------------------------- */
const interventions = [
  { chart: '3609', d: 340, name: 'INFLUENZA VACCINE', concept: 'INFLUENZA VACCINATION', by: 'MEDOFFIS', decl: '' },
  { chart: '1885', d: 320, name: 'INFLUENZA VACCINE', concept: 'INFLUENZA VACCINATION', by: P.walter, decl: '' },
  { chart: '2680', d: 300, name: 'INFLUENZA VACCINE', concept: 'INFLUENZA VACCINATION', by: 'MOA', decl: 'Y' },
  { chart: '2429', d: 290, name: 'INFLUENZA VACCINE', concept: 'INFLUENZA VACCINATION', by: 'MEDOFFIS', decl: '' },
  { chart: '1003', d: 200, name: 'INFLUENZA VACCINE - PEDIATRIC', concept: 'INFLUENZA VACCINATION', by: P.leah, decl: '' },
  { chart: '712', d: 150, name: 'PNEUMOCOCCAL POLYSACCHARIDE VACCINE', concept: 'PNEUMOCOCCAL VACCINATION', by: P.doogie, decl: '' },
  { chart: '746', d: 90, name: 'SMOKING CESSATION COUNSELLING', concept: 'SMOKING CESSATION', by: P.amarilys, decl: '' },
  { chart: '3598', d: 45, name: 'DIABETIC FOOT EXAM', concept: 'FOOT EXAM', by: P.walter, decl: '' },
]

const interventionsForDates: ReportSpec = {
  folder: A, name: 'Interventions for Dates', id: 'interventions-dates',
  width: 670, height: 540,
  provenance: '304049 165837d1 (window), 50b86d34 (page)',
  fields: [
    ...searchBlock('Enter search string for Intervention Name', 'Contains:', 'contains', 'Intervention Concepts', INTERVENTION_CONCEPTS),
    ...dateRange(),
    { kind: 'section', label: 'Other Options:' },
    activeCheck(),
    { kind: 'range', id: 'age', label: 'Age Range:', from: '0', to: '120', w: 52 },
    ...pfs,
  ],
  output: {
    title: 'INTERVENTIONS FOR DATE RANGE',
    subtitle: 'For Date between {dateFrom} and {dateTo}\n%SUB%Intervention Concept: {concept}\n%SUB%Patient Ages Between: {ageFrom} and {ageTo}',
    cols: [25, 6, 17, 10, 5, 11, 19, 7],
    head: ['NAME', 'CHART NO.', 'INSURANCE NO', 'DATE OF BIRTH', 'SEX', 'DATE PERFORMED', 'PERFORMED BY', 'DECLN'],
    /* the page does not print the intervention's name, so Contains and
       Concept are matched here rather than as column filters */
    rows: (ctx) => interventions
      .filter((i) => {
        const p = pt(i.chart)
        return activeOk(ctx, p) && ageOk(ctx, p) && dateOk(ctx, 'date', rsDaysAgo(i.d))
          && ctx.like(ctx.val('contains'), i.name) && ctx.like(ctx.val('concept'), i.concept) && provOk(ctx, 'provider', mrpOf(i.chart))
      })
      .map((i) => { const p = pt(i.chart); return [rsName(p), p.chart, p.bchn ? `BC   ${p.bchn}` : '', p.dob, p.gender, rsDaysAgo(i.d), i.by, i.decl] })
      .sort((a, b) => a[0]!.localeCompare(b[0]!)),
    footer: printed(0),
    chartCol: 1,
    excelHead: ['NAME', 'CHART NO.', 'INSURANCE NO', 'DATE OF BIRTH', 'SEX', 'DATE PERFORMED', 'PERFORMED BY', 'DECLN', 'STATUS'],
    excelRows: (_ctx, rows) => rows.map((r) => [...r, pt(r[1]!).status]),
  },
}

/* --- Labcodes for Dates -------------------------------------------------------- */
const labs = [
  { chart: '3609', d: 700, code: 'BP', desc: 'BLOOD PRESSURE (SYSTOLIC/DIASTOLIC)', value: '134/82', abn: false, by: 'CNC DOCTOR', report: 'Seated, left arm.' },
  { chart: '3609', d: 400, code: 'BP', desc: 'BLOOD PRESSURE (SYSTOLIC/DIASTOLIC)', value: '125/71', abn: true, by: P.nesrin, report: 'Repeat after rest.' },
  { chart: '746', d: 360, code: 'BP', desc: 'BLOOD PRESSURE (SYSTOLIC/DIASTOLIC)', value: '120/65', abn: false, by: P.walter, report: '' },
  { chart: '746', d: 180, code: 'BP', desc: 'BLOOD PRESSURE (SYSTOLIC/DIASTOLIC)', value: '117/68', abn: true, by: P.walter, report: 'Standing.' },
  { chart: '1885', d: 500, code: 'HBA1C', desc: 'HEMOGLOBIN A1C', value: '8.1', abn: true, by: P.leah, report: 'Poor glycemic control.' },
  { chart: '1885', d: 120, code: 'HBA1C', desc: 'HEMOGLOBIN A1C', value: '7.2', abn: true, by: P.leah, report: 'Improving.' },
  { chart: '712', d: 300, code: 'LDL', desc: 'LDL CHOLESTEROL', value: '3.9', abn: true, by: P.doogie, report: 'Fasting sample.' },
  { chart: '712', d: 60, code: 'BP', desc: 'BLOOD PRESSURE (SYSTOLIC/DIASTOLIC)', value: '152/94', abn: true, by: P.doogie, report: 'White coat effect?' },
  { chart: '2429', d: 250, code: 'EGFR', desc: 'ESTIMATED GFR', value: '58', abn: true, by: P.amarilys, report: 'Stage 3a CKD range.' },
  { chart: '3658', d: 30, code: 'BMI', desc: 'BODY MASS INDEX', value: '24.1', abn: false, by: P.amarilys, report: '' },
]
const labMatches = (ctx: RSContext, l: (typeof labs)[number]) => {
  const p = pt(l.chart)
  const codeDesc = `${l.code} - ${l.desc}`
  return activeOk(ctx, p) && ageOk(ctx, p) && dateOk(ctx, 'collected', rsDaysAgo(l.d))
    && anyLike(ctx, ids('labCode', 9), codeDesc) && anyLike(ctx, ids('labConcept', 5), l.desc)
    && ctx.like(ctx.val('report'), l.report)
}
const labRow = (l: (typeof labs)[number]) => {
  const p = pt(l.chart)
  return [rsName(p), yy(p.dob), yy(rsDaysAgo(l.d)), l.desc, l.abn ? `**${l.value}**` : l.value, l.by]
}

const labcodesForDates: ReportSpec = {
  folder: A, name: 'Labcodes for Dates', id: 'labcodes-dates',
  width: 657, height: 619,
  provenance: '304049 42c796b9 (window), 4497dae5 (page)',
  inferred: 'The capture shows six Lab Code and five Lab Concept lines in scrolling lists; the article says up to nine codes, so nine lines are drawn. The Date Collected "From" box is salmon (required) in the capture; a range cannot carry that tint here.',
  fields: [
    { kind: 'section', label: 'Selection Options' },
    { kind: 'range', id: 'collected', label: 'Date Collected:', from: '0000.00.00', w: 92, hint: '(INCLUSIVE)' },
    activeCheck(),
    { kind: 'range', id: 'age', label: 'Age Range:', w: 54, hint: '(Leave blank to ignore)' },
    { kind: 'select', id: 'facility', label: 'Facility Code:', options: 'facilities', w: 116 },
    { kind: 'select', id: 'serviceCenter', label: 'Service Center:', options: 'serviceCenters', w: 142 },
    { kind: 'section', label: 'Other Options' },
    { kind: 'text', id: 'testName', label: 'Test Name:', w: 256, hint: '(* for wildcard searching' },
    { kind: 'text', id: 'report', label: 'Report:', w: 256, hint: 'for both fields)' },
    { kind: 'rule' },
    {
      kind: 'row', label: 'Output Options:', fields: [
        { kind: 'check', id: 'excel', text: 'Direct Output to Excel', output: 'excel' },
        { kind: 'check', id: 'navigator', text: 'Chart Navigator', output: 'navigator' },
      ],
    },
    { kind: 'section', label: 'Enter Lab Code(s)' },
    ...conceptLines('labCode', 9, 'Lab Codes', LAB_CODES, 110, 400),
    { kind: 'section', label: 'Enter Lab Concept(s)' },
    ...conceptLines('labConcept', 5, 'Lab Concepts', LAB_CONCEPTS, 110, 400),
  ],
  output: {
    title: `LAB CODES FOR DATE RANGE AS OF ${MOIS_TODAY}`,
    subtitle: `Collected Date As of ${MOIS_TODAY}\n%SUB%Ages Between: {ageFrom} and {ageTo}    Include Only Active Patients: Y\n%SUB%LABS: {labCode1} {labConcept1}`,
    cols: [22, 9, 10, 29, 15, 15],
    head: ['NAME', 'DATE OF BIRTH', 'DATE PERFORMED', 'LAB CODE / DESCRIPTION', 'LAB VALUE', 'ORDERED BY'],
    rows: (ctx) => labs.filter((l) => labMatches(ctx, l)).map(labRow).sort((a, b) => a[0]!.localeCompare(b[0]!)),
    filters: [{ field: 'testName', col: 3, mode: 'contains' }],
    footer: (_ctx, rows) => ['', `Records Printed: ${rows.length}`],
    /* the CSV adds facility, service centre, chart, age, sex, lab code … (304049) */
    excelHead: ['FACILITY', 'SERVICE CENTRE', 'CHART', 'NAME', 'AGE', 'SEX', 'DATE OF BIRTH', 'DATE PERFORMED', 'LAB CODE', 'DESCRIPTION', 'LAB VALUE', 'ABNORMAL', 'ORDERED BY', 'COMMENT'],
    excelRows: (ctx) => labs
      .filter((l) => labMatches(ctx, l) && ctx.like(ctx.val('testName'), l.desc))
      .map((l) => { const p = pt(l.chart); return [p.facility ?? 'MOIS TEST CLINIC', p.service ?? '', p.chart, rsName(p), rsAge(p.dob), p.gender, p.dob, rsDaysAgo(l.d), l.code, l.desc, l.value, l.abn ? 'Y' : '', l.by, l.report] }),
  },
}

/* --- Measure Change Velocity --------------------------------------------------- */
const velocity = [
  { chart: '3609', lab: 'BMI - BODY MASS INDEX', first: [420, '26.9'], last: [60, '24.3'], min: '24.3', max: '26.9', n: 4, pct: '-9.67%' },
  { chart: '1885', lab: 'BMI - BODY MASS INDEX', first: [700, '31.2'], last: [30, '29.8'], min: '29.5', max: '31.9', n: 6, pct: '-4.49%' },
  { chart: '712', lab: 'BMI - BODY MASS INDEX', first: [500, '27.7'], last: [90, '28.4'], min: '27.7', max: '28.6', n: 3, pct: '2.53%' },
  { chart: '1885', lab: 'HBA1C - HEMOGLOBIN A1C', first: [500, '8.1'], last: [120, '7.2'], min: '7.2', max: '8.1', n: 3, pct: '-11.11%' },
  { chart: '2429', lab: 'EGFR - ESTIMATED GFR', first: [600, '64'], last: [250, '58'], min: '58', max: '64', n: 2, pct: '-9.38%' },
  { chart: '746', lab: 'BP - BLOOD PRESSURE (SYSTOLIC/DIASTOLIC)', first: [360, '120/65'], last: [180, '117/68'], min: '117/65', max: '120/68', n: 2, pct: '-2.50%' },
] as const
const velocityRows = (ctx: RSContext): string[][] => velocity
  .filter((v) => {
    const p = pt(v.chart)
    return activeOk(ctx, p) && ageOk(ctx, p) && ctx.like(ctx.val('lab'), v.lab) && dateOk(ctx, 'collected', rsDaysAgo(v.last[0]))
  })
  .map((v) => [rsName(pt(v.chart)), rsDaysAgo(v.first[0]), v.first[1], rsDaysAgo(v.last[0]), v.last[1], v.min, v.max, String(v.n), v.pct])
  .sort((a, b) => a[0]!.localeCompare(b[0]!))

const measureVelocity: ReportSpec = {
  folder: A, name: 'Measure Change Velocity', id: 'measure-velocity',
  width: 663, height: 604,
  provenance: '304049 0dbce543 (window), 155b9c18 (page)',
  fields: [
    { kind: 'section', label: 'Lab Codes / Descriptions' },
    {
      kind: 'row', fields: [
        { kind: 'radio', id: 'codeType', options: ['Code', 'Concept'], value: 'Code' },
        { kind: 'text', id: 'lab', w: 130, dots: dots('Lab Codes', [...LAB_CODES, ...LAB_CONCEPTS]) },
        { kind: 'text', id: 'labDesc', w: 300, disabled: true },
      ],
    },
    { kind: 'range', id: 'collected', label: 'Collected Date:', w: 92, hint: '(INCLUSIVE)' },
    { kind: 'section', label: 'Other Options:' },
    {
      kind: 'columns', columns: [
        [
          activeCheck(),
          { kind: 'text', id: 'lastVisit', label: 'Last Visit:', value: '3', w: 52, align: 'center', hint: '(years since last contact)' },
          { kind: 'range', id: 'age', label: 'Age Range:', from: '0', to: '120', w: 52, hint: '(Leave blank or zeros to ignore)' },
          { kind: 'select', id: 'facility', label: 'Facility:', options: 'facilities', w: 116 },
          { kind: 'select', id: 'serviceCenter', label: 'Service Center:', options: 'serviceCenters', w: 142 },
        ],
        [{ kind: 'radio', id: 'provider', label: 'Provider:', options: ['Current Desktop Provider', 'All Providers'], value: 'All Providers', column: true }],
      ],
    },
    { kind: 'rule' },
    { kind: 'check', id: 'excel', label: 'CSV Output:', text: 'Direct output to Excel', output: 'excel' },
  ],
  /* the page opens with a label / value block, so it is drawn whole */
  pages: (ctx) => {
    const rows = velocityRows(ctx)
    const lab = ctx.val('lab').replace(/^[^-]* - /, '') || ctx.val('lab')
    return [[
      '**MOIS TEST CLINIC**',
      '%TITLE%LIST OF PATIENTS WITH SELECTED LAB RESULT CHANGE VELOCITY',
      '%RULE%',
      `%LINE:22,28,30,20%Active Patients Only:|**${ctx.on('active') ? 'Y' : 'N'}**|Yrs Since Last Contact:|**${ctx.val('lastVisit')}**`,
      `%LINE:22,28,30,20%For Patients Aged:|**${ctx.val('ageFrom')}**   to   **${ctx.val('ageTo')}**|For Practice:|**${ctx.val('provider')}**`,
      '%HR%',
      `%LINE:50,50%LAB NAME:  **${lab.toUpperCase()}**|Collected Date:  **${ctx.val('collectedFrom')}**   to   **${ctx.val('collectedTo') || MOIS_TODAY}**`,
      '%RULE%',
      '%LINE:30,19,19,17,6,9%|FIRST LAB RESULT|LAST LAB RESULT|EXTREMES||PROJECTED',
      '%COLS:30,10,9,10,9,8,9,6,9%',
      '%TH%NAME|DATE|VALUE|DATE|VALUE|MIN|MAX|# OF TESTS|PERCENT CHANGE ¹',
      ...rows.map((r) => `%TR%${r.join('|')}`),
      '%RULE%',
      `%LINE:25,75%Totals Records Printed:|${rows.length}`,
      '%RULE%',
      '**1** The projected percentage change is for the stated timeframe. It is based on a linear regression; if the values follow a non-linear trajectory further investigation will be required.',
    ].join('\n')]
  },
  /* the Excel sheet (CSV adds Doctor, Facility, Service Centre, chart, age, DOB, sex, last contact) */
  output: {
    title: 'LIST OF PATIENTS WITH SELECTED LAB RESULT CHANGE VELOCITY',
    cols: [30, 10, 9, 10, 9, 8, 9, 6, 9],
    head: ['NAME', 'FIRST DATE', 'FIRST VALUE', 'LAST DATE', 'LAST VALUE', 'MIN', 'MAX', '# OF TESTS', 'PROJECTED PERCENT CHANGE'],
    rows: velocityRows,
  },
}

/* --- Medications for Dates / Prescriptions for Dates ---------------------------- */
const meds = [
  { chart: '3598', d: 600, stop: 590, med: 'AMOXICILLIN 500 MG CAPSULE', concept: 'ANTIBIOTICS', dose: '1 CAP TID', by: P.walter },
  { chart: '2429', d: 500, stop: 0, med: 'RAMIPRIL 5 MG CAPSULE', concept: 'ANTIHYPERTENSIVES', dose: '1 CAP OD', by: P.amarilys },
  { chart: '2429', d: 480, stop: 0, med: 'ATORVASTATIN 20 MG TABLET', concept: 'STATINS', dose: '1 TAB HS', by: P.amarilys },
  { chart: '1885', d: 420, stop: 0, med: 'METFORMIN 500 MG TABLET', concept: 'DIABETES MEDICATIONS', dose: '1 TAB BID', by: P.leah },
  { chart: '1885', d: 300, stop: 0, med: 'ATORVASTATIN 20 MG TABLET', concept: 'STATINS', dose: '1 TAB HS', by: P.leah },
  { chart: '1003', d: 200, stop: 190, med: 'CEPHALEXIN 250 MG/5 ML POWDER FOR SUSPENSION', concept: 'ANTIBIOTICS', dose: '5 ML QID', by: P.nesrin },
  { chart: '712', d: 150, stop: 0, med: 'RAMIPRIL 5 MG CAPSULE', concept: 'ANTIHYPERTENSIVES', dose: '1 CAP OD', by: P.doogie },
  { chart: '3609', d: 90, stop: 0, med: 'SALBUTAMOL 100 MCG INHALER', concept: 'BRONCHODILATORS', dose: '2 PUFFS QID PRN', by: P.leah },
  { chart: '2680', d: 60, stop: 0, med: 'METFORMIN 500 MG TABLET', concept: 'DIABETES MEDICATIONS', dose: '1 TAB BID', by: P.walter },
]
const searchType: RSField = { kind: 'radio', id: 'searchType', options: ['AND   (ALL items in list)', 'OR   (Any item in list)'], value: 'OR   (Any item in list)' }

const medicationsForDates: ReportSpec = {
  folder: A, name: 'Medications for Dates', id: 'medications-dates',
  width: 670, height: 570,
  provenance: '304049 1c52a2c9 (window), 1c7d8cf5 (page)',
  inferred: 'The name and concept lists scroll in the capture (seven and four lines shown); the article table says up to 7 names and 4 concepts, so that many lines are drawn.',
  labelW: 80,
  fields: [
    { kind: 'section', label: 'Enter search string(s) for Medication Name' },
    ...medLines(7),
    { kind: 'section', label: 'Enter Medication Concept' },
    ...conceptLines('conc', 4, 'Medication Concepts', MED_CONCEPTS),
    { kind: 'note', text: 'Search Type:' },
    searchType,
    ...dateRange('Date Range (INCLUSIVE - if start date is blank, will include ALL until the end date)', rsDaysAgo(729), MOIS_TODAY),
    { kind: 'section', label: 'Other Options:' },
    activeCheck(),
    { kind: 'text', id: 'lastVisit', label: 'Last Visit:', value: '3', w: 30, align: 'center', hint: '(number years since last visit)' },
  ],
  output: {
    clinic: false,
    title: `LONG TERM MEDICATIONS REVIEW AS OF ${MOIS_TODAY}`,
    subtitle: 'MEDICATION START DATE BETWEEN {dateFrom} AND {dateTo}\n**CRITERIA: ACTIVE PATIENTS / {lastVisit} YRS SINCE LAST VISIT / SEARCH STRINGS: {med1} {med2} {med3}**',
    cols: [19, 6, 9, 8, 8, 25, 13, 12],
    head: ['PATIENT', 'CHART', 'DATE OF BIRTH', 'DATE STARTED', 'DATE STOPPED', 'MEDICATION', 'DOSE FREQUENCY', 'ORDERED BY'],
    rows: (ctx) => {
      const keep = medSearch(ctx, 7, meds)
      const seen = new Set<string>()
      return meds
        .filter((m) => activeOk(ctx, pt(m.chart)) && dateOk(ctx, 'date', rsDaysAgo(m.d)) && keep(m))
        .sort((a, b) => rsName(pt(a.chart)).localeCompare(rsName(pt(b.chart))))
        .map((m) => {
          const p = pt(m.chart)
          /* "For patients with multiple medications in the criteria list, names are only listed once" */
          const first = !seen.has(p.chart); seen.add(p.chart)
          return [first ? rsName(p) : '', first ? p.chart : '', first ? p.dob : '', rsDaysAgo(m.d), m.stop ? rsDaysAgo(m.stop) : '', m.med, m.dose, m.by]
        })
    },
    footer: [],
  },
}

const prescriptionsForDates: ReportSpec = {
  folder: A, name: 'Prescriptions for Dates', id: 'prescriptions-dates',
  width: 670, height: 570,
  provenance: '304049 fa8ea9b5 (window), 9335aa4d (page)',
  inferred: 'The name and concept lists scroll in the capture (seven and four lines shown); the article table says up to 8 names and 4 concepts, so that many lines are drawn.',
  labelW: 80,
  fields: [
    { kind: 'section', label: 'Enter search string(s) for Medication Name' },
    ...medLines(8),
    { kind: 'section', label: 'Enter Medication Concept' },
    ...conceptLines('conc', 4, 'Medication Concepts', MED_CONCEPTS),
    { kind: 'note', text: 'Search Type:' },
    searchType,
    ...dateRange('Date Range (INCLUSIVE)', rsDaysAgo(729), MOIS_TODAY),
    { kind: 'section', label: 'Other Options:' },
    activeCheck(),
  ],
  output: {
    title: `PRESCRIPTION REVIEW AS OF ${MOIS_TODAY}`,
    subtitle: 'MEDICATION START DATE BETWEEN {dateFrom} AND {dateTo}\n**CRITERIA: ACTIVE PATIENTS /  / SEARCH STRINGS: {med1} {med2} {med3}**',
    cols: [19, 6, 9, 9, 32, 13, 12],
    head: ['PATIENT', 'CHART', 'DATE OF BIRTH', 'DATE', 'MEDICATION', 'DOSE FREQUENCY', 'ORDERED BY'],
    rows: (ctx) => {
      const keep = medSearch(ctx, 8, meds)
      /* each prescription is a refill line under its patient */
      const scripts = meds.flatMap((m) => [m, { ...m, d: Math.max(1, m.d - 60) }, { ...m, d: Math.max(1, m.d - 120) }])
      const seen = new Set<string>()
      return scripts
        .filter((m) => activeOk(ctx, pt(m.chart)) && dateOk(ctx, 'date', rsDaysAgo(m.d)) && keep(m))
        .sort((a, b) => rsName(pt(a.chart)).localeCompare(rsName(pt(b.chart))) || (rsDaysAgo(a.d) < rsDaysAgo(b.d) ? -1 : 1))
        .map((m) => {
          const p = pt(m.chart)
          const first = !seen.has(p.chart); seen.add(p.chart)
          return [first ? rsName(p) : '', first ? p.chart : '', first ? p.dob : '', rsDaysAgo(m.d), m.med, m.dose, m.by]
        })
    },
    footer: printed(0, true),
    /* the CSV adds the prescription and drops dose / frequency (304049) */
    excelHead: ['PATIENT', 'CHART', 'DATE OF BIRTH', 'DATE', 'MEDICATION', 'ORDERED BY', 'PRESCRIPTION'],
    excelRows: (_ctx, rows) => rows.map((r) => [r[0]!, r[1]!, r[2]!, r[3]!, r[4]!, r[6]!, `${r[4]} ${r[5]}`]),
  },
}

/* --- Order Status ---------------------------------------------------------------- */
const ORDER_TYPE_CHECKS: [string, string, string][] = [
  ['typeImage', 'Image (XRay)', 'IMAGE'], ['typeProcedure', 'Procedure', 'PROCEDURE'], ['typeLabs', 'Labs', 'LAB'],
  ['typeConsult', 'Consultation', 'CONSULTATION'], ['typeIntervention', 'Intervention', 'INTERVENTION'], ['typeMisc', 'Misc', 'MISC'],
]
const orders = [
  { chart: '2429', d: 420, type: 'CONSULTATION', desc: 'CARDIOLOGY REFERRAL', by: P.amarilys, to: 'CARDIO, DR', assigned: 'FRONT DESK, MOA', status: 'IP',
    changes: [[380, 'IN PROCESS', 'ON HOLD', 'FRONT DESK, MOA', 'AWAITING REFERRAL LETTER'], [350, 'ON HOLD', 'IN PROCESS', 'FRONT DESK, MOA', 'LETTER FAXED']] },
  { chart: '1885', d: 300, type: 'IMAGE', desc: 'CHEST X-RAY PA AND LATERAL', by: P.walter, to: 'RADIOLOGY', assigned: P.walter, status: 'RA',
    changes: [[298, 'IN PROCESS', 'RESULTS AVAILABLE', 'ADMIN, MOIS', 'RESULT RECEIVED BY FAX']] },
  { chart: '712', d: 200, type: 'LAB', desc: 'LIPID PANEL', by: P.doogie, to: 'LIFELABS', assigned: P.doogie, status: 'C',
    changes: [[195, 'IN PROCESS', 'RESULTS AVAILABLE', 'ADMIN, MOIS', 'ELECTRONIC RESULT'], [190, 'RESULTS AVAILABLE', 'COMPLETED', P.doogie, 'REVIEWED']] },
  { chart: '3609', d: 120, type: 'PROCEDURE', desc: 'SPIROMETRY', by: P.leah, to: 'RESPIRATORY THERAPY', assigned: 'NURSING TEAM', status: 'IP',
    changes: [[110, 'IN PROCESS', 'ERROR', 'FRONT DESK, MOA', 'WRONG REQUISITION'], [108, 'ERROR', 'IN PROCESS', 'FRONT DESK, MOA', 'CORRECTED']] },
  { chart: '2680', d: 60, type: 'INTERVENTION', desc: 'DIABETIC FOOT CARE', by: P.walter, to: 'NURSING TEAM', assigned: 'NURSING TEAM', status: 'OH',
    changes: [[50, 'IN PROCESS', 'ON HOLD', 'SHEWCHUK, LEAH', 'PATIENT AWAY']] },
  { chart: '746', d: 30, type: 'MISC', desc: 'HOME CARE ASSESSMENT', by: P.amarilys, to: 'HOME CARE', assigned: 'HOME CARE', status: 'IP', changes: [] },
] as const
const orderRows = (ctx: RSContext) => {
  const types = ORDER_TYPE_CHECKS.filter(([id]) => ctx.on(id)).map(([, , t]) => t)
  return orders
    .filter((o) => {
      const p = pt(o.chart)
      const activity = ctx.on('alsoStatus') && o.changes.some((c) => dateOk(ctx, 'created', rsDaysAgo(c[0])))
      return activeOk(ctx, p, 'activeOnly') && (dateOk(ctx, 'created', rsDaysAgo(o.d)) || activity)
        && (!types.length || types.includes(o.type)) && codesOk(ctx, 'statusMode', 'statuses', o.status)
        && anyLike(ctx, ids('orderedBy', 4), o.by) && anyLike(ctx, ids('orderTo', 4), o.to)
    })
    .sort((a, b) => rsName(pt(a.chart)).localeCompare(rsName(pt(b.chart))))
}

const orderStatus: ReportSpec = {
  folder: A, name: 'Order Status', id: 'order-status',
  width: 536, height: 686, labelW: 50,
  provenance: '304049 895ff546 (window), eac85cd8 (page)',
  inferred: 'In the capture "Direct Output to Excel" is ticked and greyed under Grid (Rows by Order), the Excel-only option; Grid always goes to Excel and greys the tick, Detail (Rows by Status Change) prints unless the tick is set. The Excel sheet is the Grid layout.',
  fields: [
    { kind: 'section', label: '*Order Create Date Range (Inclusive):' },
    { kind: 'range', id: 'created', label: 'From:', from: '0000.00.00', joiner: 'To:', w: 92 },
    { kind: 'check', id: 'alsoStatus', label: '', text: 'Also include Orders with Status change activity within the date range' },
    { kind: 'section', label: '*Order Type(s):' },
    { kind: 'row', fields: ORDER_TYPE_CHECKS.slice(0, 3).map(([id, text]): RSField => ({ kind: 'check', id, text })) },
    { kind: 'row', fields: ORDER_TYPE_CHECKS.slice(3).map(([id, text]): RSField => ({ kind: 'check', id, text })) },
    { kind: 'section', label: 'Current Order Status:' },
    codesRow('statusMode', 'statuses', 'IP', dots('Order Statuses', ORDER_STATUSES, true), 250),
    { kind: 'section', label: 'Other Option(s):' },
    { kind: 'check', id: 'activeOnly', label: '', text: 'Include Only Active Patients' },
    { kind: 'section', label: 'Output Options:' },
    { kind: 'radio', id: 'layout', label: '', options: ['Grid (Rows by Order)', 'Detail (Rows by Status Change)'], value: 'Grid (Rows by Order)', outputs: { 'Grid (Rows by Order)': 'excel' } },
    { kind: 'check', id: 'excel', label: '', text: 'Direct Output to Excel', checked: true, output: 'excel', disabledIf: { field: 'layout', is: 'Grid (Rows by Order)' } },
    { kind: 'section', label: 'Ordered By:' },
    ...ids('orderedBy', 4).map((id): RSField => ({ kind: 'text', id, label: '', w: 420, dots: dots('Ordered By', 'users') })),
    { kind: 'section', label: 'Order To:' },
    ...ids('orderTo', 4).map((id): RSField => ({ kind: 'text', id, label: '', w: 420, dots: dots('Order To', [...CONNECTIONS, 'NURSING TEAM', 'HOME CARE', 'RADIOLOGY']) })),
  ],
  /* Detail (Rows by Status Change): each order, then its status changes */
  pages: (ctx) => {
    const types = ORDER_TYPE_CHECKS.filter(([id]) => ctx.on(id)).map(([, , t]) => t)
    const body = orderRows(ctx).filter((o) => o.changes.length).flatMap((o) => {
      const p = pt(o.chart)
      return [
        '%RULE%',
        `%LINE:10,30,10,50%**NAME:**|${rsName(p)}|**CHART:**|${p.chart}`,
        `%LINE:14,52,34%**ORDER DESC:**|${o.desc}|**ASSIGNED TO** ${o.assigned}`,
        `%LINE:14,14,26,26,20%**ORDER DATE:**|${rsDaysAgo(o.d)}|**ORDER TYPE:** ${o.type}|**ORDERED BY** ${o.by}|**ORDERED TO:** ${o.to}`,
        '%COLS:16,16,16,20,32%',
        '%TH%STATUS CHANGE DATE|FROM STATUS|TO STATUS|BY USER|COMMENT',
        ...o.changes.map((c) => `%TR%${rsDaysAgo(c[0])}|${c[1]}|${c[2]}|${c[3]}|${c[4]}`),
      ]
    })
    return [[
      '%TITLE%ORDER STATUS FOR THE DATE RANGE',
      `%SUB%For Dates between ${ctx.val('createdFrom')} and ${ctx.val('createdTo') || MOIS_TODAY}`,
      `%SUB%For Types: ${(types.length ? types : ORDER_TYPE_CHECKS.map(([, , t]) => t)).join(', ')}`,
      `%SUB%Statuses  ${ctx.val('statusMode').replace(/ED$/, 'ING')}: ${ctx.val('statuses')}`,
      ...body,
      '%RULE%',
    ].join('\n')]
  },
  /* Grid (Rows by Order) — the Excel sheet */
  output: {
    title: 'ORDER STATUS FOR THE DATE RANGE',
    cols: [7, 16, 9, 12, 18, 14, 14, 10],
    head: ['CHART', 'NAME', 'ORDER DATE', 'ORDER TYPE', 'ORDER DESC', 'ORDERED BY', 'ORDERED TO', 'CURRENT STATUS'],
    rows: (ctx) => orderRows(ctx).map((o) => { const p = pt(o.chart); return [p.chart, rsName(p), rsDaysAgo(o.d), o.type, o.desc, o.by, o.to, o.status] }),
    chartCol: 0,
  },
}

/* --- Patient Benefits --------------------------------------------------------- */
const benefits = [
  { chart: '2429', source: 'PCPC ENROLMENT', service: 'ATTACHED PATIENT', start: 800, end: 0, mrp: P.amarilys },
  { chart: '2429', source: 'PCPC ENROLMENT', service: 'COMPLEX CARE', start: 400, end: 0, mrp: P.amarilys },
  { chart: '746', source: 'NIHB', service: 'DENTAL', start: 600, end: 0, mrp: P.doogie },
  { chart: '746', source: 'NIHB', service: 'MEDICAL TRANSPORTATION', start: 600, end: 100, mrp: P.doogie },
  { chart: '1885', source: 'PCPC ENROLMENT', service: 'ATTACHED PATIENT', start: 700, end: 0, mrp: P.leah },
  { chart: '712', source: 'WORKSAFEBC', service: 'VISION CARE', start: 300, end: 120, mrp: P.walter },
  { chart: '3609', source: 'PCPC ENROLMENT', service: 'ATTACHED PATIENT', start: 250, end: 0, mrp: P.leah },
  { chart: '2680', source: 'VETERANS AFFAIRS', service: 'MEDICAL TRANSPORTATION', start: 900, end: 0, mrp: P.walter },
]
const statusFields = (hint: string): RSField[] => [
  codesRow('statusMode', 'statuses', 'A', dots('Patient Status', 'statuses', true), 220, hint),
]
const demoExcel = (chart: string, provider: string) => {
  const p = pt(chart)
  return [p.facility ?? 'MOIS TEST CLINIC', p.service ?? '', provider, p.bchn ?? '', p.dob, p.gender, p.status, p.lastContact ?? '']
}

const patientBenefits: ReportSpec = {
  folder: A, name: 'Patient Benefits', id: 'patient-benefits',
  width: 656, height: 616, labelW: 95,
  provenance: '304049 4c5e7f29 (window), a3789525 (page)',
  fields: [
    { kind: 'section', label: 'Patient Detail' },
    { kind: 'select', id: 'provider', label: 'Service Provider:', options: 'providers', w: 172, editable: true, hint: '(optional - blank for all)' },
    { kind: 'select', id: 'serviceCenter', label: 'Service Center:', options: 'serviceCenters', w: 172, hint: '(optional - blank for all)' },
    { kind: 'range', id: 'age', label: 'Age Range:', from: '0', to: '120', w: 52, hint: '(Leave blank or zeros to ignore)' },
    { kind: 'text', id: 'lastContact', label: 'Last Contact:', value: '3', w: 52, align: 'center', hint: '(Years since last contact)' },
    { kind: 'section', label: 'Patient Statuses' },
    ...statusFields('(optional - blank for all)'),
    { kind: 'section', label: 'Benefits' },
    { kind: 'select', id: 'source', label: 'Benefit Source:', options: BENEFIT_SOURCES, w: 218 },
    { kind: 'select', id: 'service', label: 'Benefit Service:', options: BENEFIT_SERVICES, w: 218 },
    { kind: 'range', id: 'started', label: 'Started Between:', joiner: 'and', w: 74 },
    { kind: 'range', id: 'ended', label: 'Ended Between:', joiner: 'and', w: 74 },
    { kind: 'check', id: 'activeServices', label: '', text: 'Include only active services', checked: true },
    { kind: 'rule' },
    { kind: 'check', id: 'excel', label: 'CSV Output:', text: 'Direct Output to Excel', output: 'excel' },
    { kind: 'check', id: 'navigator', label: '', text: 'Direct Output to Chart Navigator for Chart Review / Mail Merge', output: 'navigator' },
  ],
  output: {
    title: `PATIENT BENEFIT SERVICES AS OF ${MOIS_TODAY}`,
    subtitle: 'SERVICE PROVIDER: {provider}    SERVICE CENTER: {serviceCenter}\n%SUB%PATIENT STATUS {statusMode}: {statuses}',
    cols: [9, 30, 20, 23, 9, 9],
    head: ['CHART', 'NAME', 'BENEFIT SOURCE', 'SERVICE', 'START', 'END'],
    rows: (ctx) => benefits
      .filter((b) => {
        const p = pt(b.chart)
        const end = b.end ? rsDaysAgo(b.end) : ''
        return provOk(ctx, 'provider', b.mrp) && ageOk(ctx, p) && codesOk(ctx, 'statusMode', 'statuses', p.status)
          && dateOk(ctx, 'started', rsDaysAgo(b.start)) && (blankDate(ctx.val('endedFrom')) && blankDate(ctx.val('endedTo')) ? true : dateOk(ctx, 'ended', end))
          && (!ctx.on('activeServices') || !end)
      })
      .map((b) => { const p = pt(b.chart); return [p.chart, rsName(p), b.source, b.service, rsDaysAgo(b.start), b.end ? rsDaysAgo(b.end) : ''] })
      .sort((a, b) => a[1]!.localeCompare(b[1]!)),
    filters: [{ field: 'source', col: 2, mode: 'equals' }, { field: 'service', col: 3, mode: 'equals' }],
    chartCol: 0,
    footer: [],
    excelHead: ['CHART', 'NAME', 'BENEFIT SOURCE', 'SERVICE', 'START', 'END', 'FACILITY', 'SERVICE CENTER', 'PRIMARY SERVICE PROVIDER', 'PHN', 'DATE OF BIRTH', 'GENDER', 'PATIENT STATUS', 'LAST CONTACT DATE', 'PATIENT IDENTIFIER', 'PATIENT IDENTIFIER TYPE', 'COVERAGE', 'DEDUCTIBLE'],
    excelRows: (_ctx, rows) => rows.map((r) => {
      const b = benefits.find((x) => x.chart === r[0] && x.service === r[3])
      return [...r, ...demoExcel(r[0]!, b?.mrp ?? ''), '', '', '100%', '0.00']
    }),
  },
}

/* --- Patient Connections ---------------------------------------------------------- */
const connections = [
  { chart: '2429', role: 'REFERRING', resource: 'PROVIDER (EXT)', conn: 'KNOLL, GARRY GRANT', start: 900, end: 0, mrp: P.amarilys },
  { chart: '746', role: 'REFERRING', resource: 'PROVIDER (EXT)', conn: 'SIMPSON, JOHN STEVEN', start: 700, end: 0, mrp: P.doogie },
  { chart: '746', role: 'PHARMACY', resource: 'ORGANIZATION', conn: 'NORTHSIDE PHARMACY', start: 700, end: 0, mrp: P.doogie },
  { chart: '1885', role: 'REFERRING', resource: 'PROVIDER (EXT)', conn: 'KNOLL, SUSAN ELAINE', start: 500, end: 0, mrp: P.leah },
  { chart: '1885', role: 'PRIMARY', resource: 'PROVIDER (INT)', conn: 'SHEWCHUK, LEAH', start: 500, end: 0, mrp: P.leah },
  { chart: '712', role: 'REFERRING', resource: 'PROVIDER (EXT)', conn: 'ABDEL-GALIL, RAMZY', start: 400, end: 0, mrp: P.walter },
  { chart: '3609', role: 'REFERRING', resource: 'PROVIDER (INT)', conn: 'HOWSER, DOOGIE', start: 300, end: 0, mrp: P.leah },
  { chart: '3658', role: 'HOME CARE', resource: 'CLINIC', conn: 'PRINCE GEORGE HEALTH UNIT', start: 200, end: 30, mrp: P.amarilys },
  { chart: '2680', role: 'REFERRING', resource: 'PROVIDER (EXT)', conn: 'COSIO, INGRID CARMEN', start: 800, end: 0, mrp: P.walter },
]
type Crit = (c: (typeof connections)[number]) => boolean
/** the filled Connection lines as criteria (role / resource `%`-aware, connection contains) */
function connCriteria(ctx: RSContext, n: number): Crit[] {
  return Array.from({ length: n }, (_, i) => i + 1)
    .filter((i) => ctx.val(`role${i}`) || ctx.val(`resource${i}`) || ctx.val(`conn${i}`).trim())
    .map((i) => (c) => ctx.like(ctx.val(`role${i}`), c.role, 'equals') && ctx.like(ctx.val(`resource${i}`), c.resource, 'equals') && ctx.like(ctx.val(`conn${i}`), c.conn))
}
/** "Patient Has All Connections Listed Below" / "… at Least 1 …" */
function connKeep(ctx: RSContext, n: number, matchId: string, stoppedId?: string) {
  const crit = connCriteria(ctx, n)
  const live = connections.filter((c) => !c.end || (stoppedId ? ctx.on(stoppedId) : false))
  const all = ctx.val(matchId).includes('All')
  return (c: (typeof connections)[number]) => {
    if (!live.includes(c)) return false
    if (!crit.length) return true
    if (!crit.some((f) => f(c))) return false
    return !all || crit.every((f) => live.some((x) => x.chart === c.chart && f(x)))
  }
}

const patientConnections: ReportSpec = {
  folder: A, name: 'Patient Connections', id: 'patient-connections',
  width: 666, height: 745, labelW: 95,
  provenance: '304049 a1f83537 (window), b117b3e1 (page)',
  fields: [
    { kind: 'section', label: 'Patient Detail' },
    { kind: 'select', id: 'serviceCenter', label: 'Service Center:', options: 'serviceCenters', w: 172, hint: '(optional - blank for all)' },
    { kind: 'select', id: 'provider', label: 'Service Provider:', options: 'providers', w: 172, editable: true, hint: '(optional - blank for all)' },
    { kind: 'range', id: 'age', label: 'Age Range:', from: '0', to: '120', w: 52, hint: '(Leave blank or zeros to ignore)' },
    { kind: 'text', id: 'lastContact', label: 'Last Contact:', value: '3', w: 52, align: 'center', hint: '(Years since last contact - leave blank to ignore)' },
    { kind: 'section', label: 'Patient Statuses' },
    ...statusFields('(optional - blank for all)'),
    { kind: 'section', label: 'Patient Connections', right: { kind: 'check', id: 'stopped', text: 'Include Stopped Connections' } },
    { kind: 'radio', id: 'match', label: '', options: ['Patient Has All Connections Listed Below', 'Patient Has at Least 1 Connection Listed Below'], value: 'Patient Has All Connections Listed Below' },
    ...connectionLines(16, true),
    { kind: 'rule' },
    { kind: 'check', id: 'excel', label: 'CSV Output:', text: 'Direct Output to Excel', output: 'excel' },
    { kind: 'check', id: 'navigator', label: '', text: 'Direct Output to Chart Navigator for Chart Review / Mail Merge', output: 'navigator' },
  ],
  output: {
    title: `PATIENT CONNECTIONS AS OF ${MOIS_TODAY}`,
    subtitle: 'SERVICE PROVIDER: {provider}    SERVICE CENTER: {serviceCenter}\n%SUB%PATIENT STATUSES {statusMode}: {statuses}   AGES BETWEEN: {ageFrom} and {ageTo}   CONTACTED WITHIN LAST {lastContact} yrs',
    cols: [7, 18, 11, 7, 13, 17, 27],
    head: ['CHART', 'NAME', 'PHONE', 'STATUS', 'CONN. ROLE', 'RESOURCE', 'CONNECTION'],
    rows: (ctx) => {
      const keep = connKeep(ctx, 16, 'match', 'stopped')
      return connections
        .filter((c) => { const p = pt(c.chart); return keep(c) && provOk(ctx, 'provider', c.mrp) && ageOk(ctx, p) && codesOk(ctx, 'statusMode', 'statuses', p.status) })
        .sort((a, b) => pt(a.chart).last.localeCompare(pt(b.chart).last) || pt(a.chart).first.localeCompare(pt(b.chart).first))
        .map((c) => { const p = pt(c.chart); return [p.chart, firstLast(p), p.home ?? '', p.status, c.role, c.resource, c.conn] })
    },
    chartCol: 0,
    footer: (_ctx, rows) => ['', `Records Printed: ${rows.length}`],
    excelHead: ['FACILITY', 'SERVICE CENTER', 'PRIMARY SERVICE PROVIDER', 'CHART NUMBER', 'FIRST NAME', 'LAST NAME', 'PHN', 'DOB', 'GENDER', 'STATUS', 'CONNECTION TYPE', 'PROVIDER TYPE', 'PROVIDER', 'CONNECTION START DATE', 'CONNECTION END DATE', 'CONNECTION COMMENT'],
    excelRows: (_ctx, rows) => rows.map((r) => {
      const p = pt(r[0]!)
      const c = connections.find((x) => x.chart === r[0] && x.conn === r[6])
      return [p.facility ?? 'MOIS TEST CLINIC', p.service ?? '', c?.mrp ?? '', p.chart, p.first, p.last, p.bchn ?? '', p.dob, p.gender, p.status, r[4]!, r[5]!, r[6]!, c ? rsDaysAgo(c.start) : '', c?.end ? rsDaysAgo(c.end) : '', '']
    }),
  },
}

/* --- Reaction Risks ------------------------------------------------------------------ */
const reactions: [string, string, string][] = [
  ['3598', 'PENICILLIN', 'RASH'],
  ['2429', 'BEES', ''],
  ['2429', 'EGGS', ''],
  ['2429', 'PEANUT BUTTER', 'ANAPHYLAXIS'],
  ['746', 'PENICILLIN V POTASSIUM 300 MG TABLET', 'APNEA'],
  ['746', 'SOAP', 'CONTACT DERMATITIS'],
  ['1885', 'SULFA', 'ERYTHEMA MULTIFORME'],
  ['712', 'CODEINE', 'NAUSEA'],
  ['3609', 'LACTALBUMIN', 'PAINFUL MOUTH'],
  ['2680', 'LATEX', 'HIVES'],
]

const reactionRisks: ReportSpec = {
  folder: A, name: 'Reaction Risks', id: 'reaction-risks',
  width: 659, height: 527,
  provenance: '304049 bfd8ff7a (window), 87015682 (page)',
  fields: [
    { kind: 'section', label: 'Selection Options' },
    { kind: 'text', id: 'substance', label: 'Substance:', w: 210, required: true, hint: '(contains)' },
    { kind: 'text', id: 'reaction', label: 'Reaction:', w: 210, hint: '(contains)' },
    activeCheck(),
    { kind: 'range', id: 'age', label: 'Age Range:', w: 54, hint: '(Leave blank to ignore)' },
    { kind: 'rule' },
    { kind: 'check', id: 'excel', label: 'CSV Output:', text: 'Direct Output to Excel', output: 'excel' },
  ],
  output: {
    title: 'REACTION RISK - SUBSTANCE AND REACTIONS',
    subtitle: 'Substance: {substance}\n%SUB%Reaction: {reaction}',
    cols: [28, 4, 4, 10, 30, 24],
    head: ['NAME', 'A /', 'S', 'DOB', 'SUBSTANCE', 'REACTIONS'],
    rows: (ctx) => reactions
      .filter(([c]) => { const p = pt(c); return activeOk(ctx, p) && ageOk(ctx, p) })
      .map(([c, s, r]) => { const p = pt(c); return [rsName(p), rsAge(p.dob), p.gender, mdy(p.dob), s, r] })
      .sort((a, b) => a[0]!.localeCompare(b[0]!)),
    filters: [{ field: 'substance', col: 4, mode: 'contains' }, { field: 'reaction', col: 5, mode: 'contains' }],
    footer: (_ctx, rows) => ['', `**Total Patients: ${new Set(rows.map((r) => r[0])).size}**`],
    /* the CSV adds chart number and who created / modified the entry (304049) */
    excelHead: ['CHART', 'NAME', 'AGE', 'SEX', 'DOB', 'SUBSTANCE', 'REACTIONS', 'CREATED', 'CREATED BY', 'MODIFIED', 'MODIFIED BY'],
    excelRows: (_ctx, rows) => rows.map((r) => {
      const p = rsPatients().find((x) => rsName(x) === r[0] && mdy(x.dob) === r[3]) ?? pt('2429')
      return [p.chart, ...r, rsDaysAgo(400), 'ADMIN, MOIS', '', '']
    }),
  },
}

/* --- Service Episodes by MRP ------------------------------------------------------------ */
const episodes = [
  { chart: '746', mrp: P.doogie, member: 'MENTAL HEALTH TEAM (ORG ROLE)', episode: 'MHSU - MENTAL HEALTH & SUBSTANCE USE', start: 500, end: 0, reason: '' },
  { chart: '2429', mrp: P.amarilys, member: 'NURSING TEAM (ORG ROLE)', episode: 'CDM - CHRONIC DISEASE MANAGEMENT', start: 800, end: 0, reason: '' },
  { chart: '1885', mrp: P.leah, member: 'NURSING TEAM (ORG ROLE)', episode: 'CDM - CHRONIC DISEASE MANAGEMENT', start: 600, end: 0, reason: '' },
  { chart: '3658', mrp: P.amarilys, member: 'PRINCE GEORGE HEALTH UNIT (ORG)', episode: 'MAT - MATERNITY', start: 250, end: 0, reason: '' },
  { chart: '712', mrp: P.walter, member: 'NURSING TEAM (ORG ROLE)', episode: 'HC - HOME CARE NURSING', start: 300, end: 120, reason: 'GOALS MET' },
  { chart: '2680', mrp: P.walter, member: 'MENTAL HEALTH TEAM (ORG ROLE)', episode: 'MHSU - MENTAL HEALTH & SUBSTANCE USE', start: 900, end: 400, reason: 'MOVED AWAY' },
  { chart: '3609', mrp: P.leah, member: 'NURSING TEAM (ORG ROLE)', episode: 'PALL - PALLIATIVE CARE', start: 90, end: 0, reason: '' },
]

const serviceEpisodesMrp: ReportSpec = {
  folder: A, name: 'Service Episodes by MRP', id: 'service-episodes-mrp',
  width: 665, height: 538, labelW: 105,
  provenance: '304049 d18c860c (window), 8ce9bc09 (page)',
  inferred: 'The "Direct Output to:" radio picks the output: CSV / Excel opens the Excel sheet, Chart Navigator loads the navigator.',
  fields: [
    { kind: 'section', label: 'Patient Status:' },
    codesRow('statusMode', 'statuses', 'A', dots('Patient Status', 'statuses', true), 220),
    { kind: 'section', label: 'Service Episode:' },
    { kind: 'text', id: 'episode', label: 'Service Episode:', w: 340, required: true, dots: dots('Master Service Code List', SERVICE_EPISODES) },
    { kind: 'text', id: 'providedBy', label: 'Service Provider By:', w: 340, dots: dots('Service Provided By', PROVIDED_BY) },
    { kind: 'radio', id: 'providedAs', label: 'Service Provided:', options: ['as MRP', 'as Member Of', 'as Either'], value: 'as MRP' },
    {
      kind: 'row', label: 'Service Date:', fields: [
        { kind: 'select', id: 'dateKind', options: ['', 'Start Date', 'Stop Date'], w: 84, hint: 'Between' },
        { kind: 'range', id: 'serviceDate', from: '0000.00.00', to: '0000.00.00', joiner: 'and', w: 76 },
      ],
    },
    { kind: 'radio', id: 'status', label: 'Status:', options: ['Active', 'Stopped', 'All'], value: 'Active' },
    { kind: 'section', label: 'Service Event:', right: { kind: 'check', id: 'serviceEvent', text: 'Include Service Event information' } },
    { kind: 'check', id: 'phaseInitial', label: 'Service Phase(s):', text: 'Initial', disabledIf: { field: 'serviceEvent', is: false } },
    { kind: 'check', id: 'phaseFollowup', label: '', text: 'Followup', disabledIf: { field: 'serviceEvent', is: false } },
    { kind: 'check', id: 'phaseDischarge', label: '', text: 'Discharge', disabledIf: { field: 'serviceEvent', is: false } },
    { kind: 'rule' },
    { kind: 'radio', id: 'outputTo', label: 'Direct Output to:', options: ['Report', 'CSV / Excel', 'Chart Navigator'], value: 'Report', column: true, outputs: { 'CSV / Excel': 'excel', 'Chart Navigator': 'navigator' } },
  ],
  output: {
    title: `SERVICE EPISODES AS OF ${MOIS_TODAY}`,
    subtitle: ' \n%LINE:18,82%**Service MRP:**|{providedBy} {providedAs}\n%LINE:18,82%**Service Episode:**|{episode}\n%LINE:18,82%**Date Range:**|{dateKind} {serviceDateFrom} - {serviceDateTo}\n%LINE:18,82%**Status:**|{status}\n%RULE%',
    cols: [20, 18, 30, 10, 10, 12],
    head: ['PATIENT', 'SERVICE MRP', 'SERVICE EPISODE', 'START', 'END', 'STOP REASON'],
    rows: (ctx) => {
      const as = ctx.val('providedAs')
      const st = ctx.val('status')
      const kind = ctx.val('dateKind')
      return episodes
        .filter((e) => {
          const p = pt(e.chart)
          const who = as === 'as MRP' ? [e.mrp] : as === 'as Member Of' ? [e.member] : [e.mrp, e.member]
          const d = kind === 'Stop Date' ? (e.end ? rsDaysAgo(e.end) : '') : rsDaysAgo(e.start)
          return codesOk(ctx, 'statusMode', 'statuses', p.status) && who.some((w) => ctx.like(ctx.val('providedBy'), w))
            && (st === 'All' || (st === 'Active' ? !e.end : !!e.end)) && (!kind || dateOk(ctx, 'serviceDate', d))
        })
        .map((e) => { const p = pt(e.chart); return [rsName(p), as === 'as Member Of' ? e.member : e.mrp, e.episode, rsDaysAgo(e.start), e.end ? rsDaysAgo(e.end) : '', e.reason] })
        .sort((a, b) => a[0]!.localeCompare(b[0]!))
    },
    filters: [{ field: 'episode', col: 2, mode: 'contains' }],
    footer: (_ctx, rows) => ['', `Records Printed: ${rows.length}`],
  },
}

/* --- Unresulted Orders -------------------------------------------------------------------- */
const unresulted = [
  { chart: '3598', age: 0, d: 700, by: '<NOT LISTED>', to: 'KNOLL, GARRY GRANT', pri: 'R', desc: 'CHONDROMALACIA OF PATELLA', type: 'CONSULTATION', status: 'IP', assigned: '', src: 'External' },
  { chart: '3598', age: 0, d: 650, by: '<NOT LISTED>', to: 'ABBOTT, DAVID', pri: 'R', desc: '', type: 'PROCEDURE', status: 'IP', assigned: '', src: 'External' },
  { chart: '2429', age: 0, d: 500, by: '<NOT LISTED>', to: 'RADIOLOGY', pri: 'R', desc: 'SKELETAL X-RAY OF WRIST AND HAND', type: 'IMAGE', status: 'IP', assigned: '', src: 'Internal' },
  { chart: '1885', age: 0, d: 420, by: P.leah, to: 'LIFELABS', pri: 'R', desc: 'DIABETES, TYPE 2, - UNCOMPLICATED', type: 'LAB', status: 'IP', assigned: P.leah, src: 'Internal' },
  { chart: '712', age: 0, d: 300, by: P.walter, to: 'ABDUL-RAHMAN, ZAINAB', pri: 'ASAP', desc: 'ABDOMINAL ORGAN INJURY', type: 'CONSULTATION', status: 'OH', assigned: 'FRONT DESK, MOA', src: 'External' },
  { chart: '712', age: 0, d: 280, by: P.walter, to: 'RADIOLOGY', pri: 'S', desc: 'CT ABDOMEN', type: 'IMAGE', status: 'IP', assigned: '', src: 'Internal' },
  { chart: '3609', age: 0, d: 150, by: P.doogie, to: 'KNOLL, GARRY GRANT', pri: 'R', desc: 'MENTAL DISORDER - PERSONAL HISTORY OF', type: 'CONSULTATION', status: 'IP', assigned: '', src: 'External' },
  { chart: '2680', age: 0, d: 90, by: P.doogie, to: 'NURSING TEAM', pri: 'TC', desc: 'WOUND CARE', type: 'INTERVENTION', status: 'IP', assigned: 'NURSING TEAM', src: 'Internal' },
  { chart: '746', age: 0, d: 40, by: P.amarilys, to: 'HOME CARE', pri: 'R', desc: 'HOME SAFETY ASSESSMENT', type: 'MISC', status: 'RA', assigned: '', src: 'Internal' },
]
const PRIORITY_NAMES: Record<string, string> = { R: 'ROUTINE', ASAP: 'ASAP', S: 'STAT', TC: 'TIME CRITICAL' }

const unresultedOrders: ReportSpec = {
  folder: A, name: 'Unresulted Orders', id: 'unresulted-orders',
  /* 5cb19599: the navigator's Description reads UNRESULTED ORDER */
  navigatorLabel: 'UNRESULTED ORDER',
  width: 655, height: 917, labelW: 70,
  provenance: '304049 95ff44b8 (window), 400a4027 (page); 5cb19599 (Chart Navigator)',
  inferred: 'The article\'s parameter table also lists "Providers (Name Contains):"; the capture has no such box (it has the Ordered By / Ordered To / Assigned To lists instead), so the capture is followed.',
  fields: [
    { kind: 'section', label: '*Order Types:' },
    codesRow('typeMode', 'types', '', dots('Order Types', ORDER_TYPES, true), 400),
    { kind: 'section', label: '*Date Range (Inclusive):' },
    {
      kind: 'row', label: 'Start Date:', fields: [
        { kind: 'range', id: 'dates', joiner: 'End Date:', w: 116 },
        { kind: 'check', id: 'includeBlank', text: 'Include Blank Dates' },
      ],
    },
    { kind: 'section', label: 'Order Statuses:' },
    codesRow('statusMode', 'statuses', 'IP', dots('Order Statuses', ORDER_STATUSES, true), 420),
    { kind: 'section', label: 'Order Priorities:' },
    codesRow('priorityMode', 'priorities', '', dots('Order Priorities', ORDER_PRIORITIES, true), 420),
    { kind: 'section', label: 'Other Options:' },
    {
      kind: 'row', fields: [
        { kind: 'check', id: 'active', text: 'Include only Active Patients', checked: true },
        { kind: 'select', id: 'source', options: ['', 'Internal', 'External'], w: 100, hint: 'Order Source' },
      ],
    },
    { kind: 'section', label: 'Output Options:' },
    { kind: 'check', id: 'navigator', label: '', text: 'Direct output to Chart Navigator for Chart Review / Mail Merge', output: 'navigator' },
    { kind: 'check', id: 'excel', label: '', text: 'Direct Output to Excel', output: 'excel' },
    { kind: 'section', label: 'Ordered By:' },
    ...ids('orderedBy', 4).map((id): RSField => ({ kind: 'text', id, label: '', w: 460, dots: dots('Ordered By', 'providers') })),
    { kind: 'section', label: 'Ordered To:' },
    ...ids('orderedTo', 4).map((id): RSField => ({ kind: 'text', id, label: '', w: 460, dots: dots('Ordered To', [...CONNECTIONS, 'RADIOLOGY', 'LIFELABS', 'HOME CARE', 'NURSING TEAM']) })),
    { kind: 'section', label: 'Assigned To:' },
    { kind: 'text', id: 'assignedTo', label: '', w: 460, dots: dots('Assigned To', 'users') },
  ],
  output: {
    clinic: false,
    title: 'UNRESULTED ORDERS FOR THE DATE RANGE',
    subtitle: 'For Dates between {datesFrom} and {datesTo}\n%SUB%For Types: {types}\n%SUB%Statuses  {statusMode}: {statuses}',
    cols: [15, 7, 4, 7, 16, 9, 26, 6, 10],
    head: ['PATIENT', 'CHART NUMBER', 'AGE', 'DATE ORDERED', 'ORDERED TO', 'ORDER PRIORITY', 'DESCRIPTION', 'STATUS', 'ASSIGNED TO'],
    /* grouped under an ORDERED BY band, so filtered here */
    rows: (ctx) => {
      const keep = unresulted.filter((o) => {
        const p = pt(o.chart)
        const d = rsDaysAgo(o.d)
        return activeOk(ctx, p) && codesOk(ctx, 'typeMode', 'types', o.type) && codesOk(ctx, 'statusMode', 'statuses', o.status)
          && codesOk(ctx, 'priorityMode', 'priorities', o.pri) && (!ctx.val('source') || ctx.val('source') === o.src)
          && dateOk(ctx, 'dates', d)
          && anyLike(ctx, ids('orderedBy', 4), o.by) && anyLike(ctx, ids('orderedTo', 4), o.to) && ctx.like(ctx.val('assignedTo'), o.assigned)
      })
      const groups = [...new Set(keep.map((o) => o.by))].sort()
      return groups.flatMap((by): RSRow[] => [
        '%RULE%', `%SUB%ORDERED BY:  ${by}`,
        ...keep.filter((o) => o.by === by)
          .sort((a, b) => rsName(pt(a.chart)).localeCompare(rsName(pt(b.chart))))
          .map((o) => { const p = pt(o.chart); return [rsName(p), p.chart, rsAge(p.dob), yy(rsDaysAgo(o.d)), o.to, PRIORITY_NAMES[o.pri] ?? o.pri, o.desc, o.status, o.assigned] }),
      ])
    },
    chartCol: 1,
    footer: (_ctx, rows) => ['%RULE%', `Records Printed: ${rows.length}`],
    /* the CSV adds the orderer's id, diagnostic code, priority code, number of results and patient status (304049) */
    excelHead: ['PATIENT', 'CHART NUMBER', 'AGE', 'DATE ORDERED', 'ORDERED TO', 'ORDER PRIORITY', 'DESCRIPTION', 'STATUS', 'ASSIGNED TO', 'ORDERED BY ID', 'DIAGNOSTIC CODE', 'PRIORITY CODE', 'NUMBER OF RESULTS', 'PATIENT STATUS'],
    excelRows: (_ctx, rows) => rows.map((r) => {
      const o = unresulted.find((x) => x.chart === r[1] && x.desc === r[6] && x.to === r[4])
      return [...r, o && o.by !== '<NOT LISTED>' ? o.by.split(',')[0]!.slice(0, 4) : '', '250', o?.pri ?? '', '0', pt(r[1]!).status]
    }),
  },
}

/* --- Vaccination for Dates ------------------------------------------------------------------- */
const vaccinations = [
  { chart: '2429', d: 330, vaccine: 'Influenza', concept: 'INFLUENZA VACCINE', by: 'ADMIN, MOIS', loc: 'L DELTOID', lot: 'FLU-2291', reason: 'ROUTINE', consent: 'VERBAL' },
  { chart: '746', d: 320, vaccine: 'INFLUENZA', concept: 'INFLUENZA VACCINE', by: P.amarilys, loc: 'R DELTOID', lot: 'FLU-2291', reason: 'ROUTINE', consent: 'VERBAL' },
  { chart: '1885', d: 300, vaccine: 'Influenza', concept: 'INFLUENZA VACCINE', by: 'PHARMACY', loc: '', lot: '', reason: 'OUTSIDE ADMINISTRATION', consent: '' },
  { chart: '712', d: 280, vaccine: 'Influenza', concept: 'INFLUENZA VACCINE', by: P.walter, loc: 'L DELTOID', lot: 'FLU-2304', reason: 'HIGH RISK', consent: 'WRITTEN' },
  { chart: '712', d: 150, vaccine: 'Pneumococcal polysaccharide', concept: 'PNEUMOCOCCAL VACCINE', by: P.walter, loc: 'R DELTOID', lot: 'PN-118', reason: 'HIGH RISK', consent: 'WRITTEN' },
  { chart: '3609', d: 100, vaccine: 'COVID-19 mRNA', concept: 'COVID-19 VACCINE', by: P.leah, loc: 'L DELTOID', lot: 'CV-5520', reason: 'ROUTINE', consent: 'VERBAL' },
  { chart: '2680', d: 60, vaccine: 'Td', concept: 'TETANUS/DIPHTHERIA VACCINE', by: P.doogie, loc: 'L DELTOID', lot: 'TD-771', reason: 'WOUND', consent: 'VERBAL' },
]
const vaccRecs = (ctx: RSContext) => {
  const byConcept = ctx.val('searchBy').startsWith('Concept')
  const pats = ids('vacc', 6).filter((id) => ctx.val(id).trim())
  const keepConn = connKeep(ctx, 4, 'connMatch')
  return vaccinations
    .filter((v) => {
      const p = pt(v.chart)
      const conns = !ctx.on('includeConn') || connections.some((c) => c.chart === v.chart && keepConn(c))
      return activeOk(ctx, p) && dateOk(ctx, 'date', rsDaysAgo(v.d)) && conns
        && (!pats.length || pats.some((id) => ctx.like(ctx.val(id), byConcept ? v.concept : v.vaccine)))
        && (!ctx.val('provider') || connections.some((c) => c.chart === v.chart && provOk(ctx, 'provider', c.mrp)))
    })
    .sort((a, b) => rsName(pt(a.chart)).localeCompare(rsName(pt(b.chart))))
}

const vaccinationForDates: ReportSpec = {
  folder: A, name: 'Vaccination for Dates', id: 'vaccination-dates',
  width: 670, height: 690, labelW: 95,
  provenance: '304049 8b58755d (window), 98645a25 (page); 036a61c4 (Output Options)',
  inferred: 'The window capture is a 409x412 thumbnail, so the size is estimated. The search lines are captioned "In Concept(s):" as captured (Concept(s) selected); the article says the option is toggled to Concept(s), so Name is the default here. The "Choose:" output radio is transcribed as drawn; Excel output depends on the renderer honouring a radio (see the lead note).',
  fields: [
    { kind: 'section', label: '', right: { kind: 'check', id: 'includeConn', text: 'Include Patient Connections' } },
    { kind: 'radio', id: 'connMatch', label: '', options: ['Patient Has All Connections Below', 'Patient Has at Least 1 Connection Below'], value: 'Patient Has All Connections Below' },
    ...connectionLines(4, false),
    { kind: 'section', label: '*Intervention (Vaccination):' },
    { kind: 'radio', id: 'searchBy', label: 'Search By:', options: ['Name', 'Concept(s)'], value: 'Name' },
    ...ids('vacc', 6).map((id, i): RSField => ({ kind: 'text', id, label: i === 0 ? 'In Concept(s):' : '', w: 330, dots: dots('Vaccine Concepts', VACCINE_CONCEPTS) })),
    ...dateRange('Date Range (Inclusive)'),
    { kind: 'section', label: 'Other Options:' },
    activeCheck(),
    ...pfs,
    { kind: 'section', label: 'Output Options:' },
    { kind: 'radio', id: 'outputChoice', label: 'Choose:', options: ['Report', 'Direct Output to Excel'], value: 'Report', column: true, outputs: { 'Direct Output to Excel': 'excel' } },
  ],
  /* the printed report: a block per vaccination, sorted by last name */
  pages: (ctx) => {
    const L = '%LINE:10,24,7,12,14,17,5,11%'
    return [[
      '%TITLE%VACCINATIONS FOR DATE RANGE',
      `%SUB%For Dates between ${ctx.val('dateFrom').replace(/\./g, '/')} and ${ctx.val('dateTo').replace(/\./g, '/')}`,
      `%SUB%${ctx.val('searchBy').startsWith('Concept') ? 'Medication Concept(s)' : 'Vaccination(s)'}: ${ids('vacc', 6).map((id) => ctx.val(id)).filter(Boolean).join(', ')}`,
      '%RULE%',
      ...vaccRecs(ctx).flatMap((v) => {
        const p = pt(v.chart)
        return [
          `${L}PATIENT:|**${rsName(p)}**|AGE:|**${rsAge(p.dob)}**|VACCINATION:|**${v.vaccine}**||`,
          `${L}DOB:|${p.dob}|SEX:|${p.gender}|PERFORMED:|**${rsDaysAgo(v.d)}**|BY:|${v.by}`,
          `${L}PHN:|${p.bchn ? `BC   ${p.bchn}` : ''}|CHART:|${p.chart}|LOCATION:|${v.loc}|LOT:|${v.lot}`,
          '%HR%',
        ]
      }),
    ].join('\n')]
  },
  /* the Excel sheet: demographics and the MAR's full vaccine detail (304049) */
  output: {
    title: 'VACCINATIONS FOR DATE RANGE',
    cols: [8, 14, 10, 5, 4, 10, 10, 14, 8, 17],
    head: ['CHART', 'NAME', 'DOB', 'AGE', 'SEX', 'PHN', 'DATE ADMINISTERED', 'VACCINE', 'LOT NUMBER', 'ADMINISTERED BY'],
    rows: (ctx) => vaccRecs(ctx).map((v) => { const p = pt(v.chart); return [p.chart, rsName(p), p.dob, rsAge(p.dob), p.gender, p.bchn ?? '', rsDaysAgo(v.d), v.vaccine, v.lot, v.by] }),
    chartCol: 0,
    excelHead: ['CHART', 'NAME', 'DOB', 'AGE', 'SEX', 'PHN', 'DATE ADMINISTERED', 'VACCINE', 'LOT NUMBER', 'ADMINISTERED BY', 'LOCATION', 'REASON', 'CONSENT'],
    excelRows: (ctx) => vaccRecs(ctx).map((v) => { const p = pt(v.chart); return [p.chart, rsName(p), p.dob, rsAge(p.dob), p.gender, p.bchn ?? '', rsDaysAgo(v.d), v.vaccine, v.lot, v.by, v.loc, v.reason, v.consent] }),
  },
}

/* --- Visits by Author / Date -------------------------------------------------------------------- */
const visits: [number, string, string, string, string, string][] = [
  [240, P.walter, '1885', 'counsel', '300', ''],
  [240, P.walter, '1885', 'counsel', '300', ''],
  [200, P.walter, '712', '', '', ''],
  [150, P.leah, '3609', 'review', '493', ''],
  [120, P.walter, '1885', 'Diabetic', '250', '401'],
  [90, P.amarilys, '2429', 'BP check', '401', ''],
  [60, P.walter, '712', 'knee pain', '717', ''],
  [30, P.doogie, '746', 'anxiety follow up', '300', ''],
  [12, P.leah, '3658', 'prenatal', 'V22', ''],
]

const visitsByAuthor: ReportSpec = {
  folder: A, name: 'Visits by Author / Date', id: 'visits-author',
  width: 670, height: 540,
  provenance: '304049 17dbee92 (window), f7c208f3 (page)',
  fields: [
    { kind: 'section', label: 'Selection Options' },
    { kind: 'select', id: 'author', label: 'Author:', options: 'providers', w: 172, editable: true },
    { kind: 'range', id: 'appt', label: 'Appointment:', w: 92, hint: '(INCLUSIVE)' },
    { kind: 'rule' },
    { kind: 'check', id: 'excel', label: 'CSV Output:', text: 'Direct Output to Excel', output: 'excel' },
  ],
  output: {
    title: `VISITS BY PROVIDER AS OF ${MOIS_TODAY}`,
    subtitle: 'FOR {author} Appointment Between: {apptFrom} AND {apptTo}',
    cols: [10, 18, 14, 14, 28, 8, 8],
    head: ['DATE', 'ATTENDING', 'FIRST NAME', 'LAST NAME', 'REASON', 'DIAG 1', 'DIAG 2'],
    rows: (ctx) => visits
      .filter(([d]) => dateOk(ctx, 'appt', rsDaysAgo(d)))
      .map(([d, by, c, reason, dx1, dx2]) => { const p = pt(c); return [rsDaysAgo(d), by, p.first, p.last, reason, dx1, dx2] }),
    filters: [{ field: 'author', col: 1, mode: 'equals' }],
    footer: (_ctx, rows) => ['', `Records Printed: ${rows.length}`],
    /* the CSV adds age, sex, visit code, time, fee codes and the appointment times (304049) */
    excelHead: ['DATE', 'ATTENDING', 'FIRST NAME', 'LAST NAME', 'REASON', 'DIAG 1', 'DIAG 2', 'AGE', 'SEX', 'VISIT CODE', 'TIME', 'FEE CODES', 'TIME ARRIVED', 'TIME SEEN', 'TIME DISCHARGED'],
    excelRows: (_ctx, rows) => rows.map((r, i) => {
      const p = rsPatients().find((x) => x.first === r[2] && x.last === r[3]) ?? pt('2429')
      const hh = String(9 + (i % 7)).padStart(2, '0')
      return [...r, rsAge(p.dob), p.gender, 'OV', `${hh}:00`, '00100', `${hh}:00`, `${hh}:10`, `${hh}:25`]
    }),
  },
}

export const specs: ReportSpec[] = [
  consultReason, documentsForDates, facilityAdmission, imagingForDates, interventionsForDates,
  labcodesForDates, measureVelocity, medicationsForDates, orderStatus, patientBenefits,
  patientConnections, prescriptionsForDates, reactionRisks, serviceEpisodesMrp, unresultedOrders,
  vaccinationForDates, visitsByAuthor,
]
