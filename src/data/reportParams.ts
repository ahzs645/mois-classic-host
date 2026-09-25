import type { ChartNavigatorRow } from './chartUtilities'
import { patients, MOIS_TODAY } from './patients'
import { unsentClaims } from './claims'

/* ============================================================================
   What running a report in the Reports module needs besides its window.

   · which window a catalogue row opens (a double-click on the row);
   · the list a report hands the Chart Navigator ("Direct output to Chart
     Navigator for Chart Review / Mail Merge", a scorecard's red button, a
     report builder's Mail Merge);
   · the pages a report prints into the Print Preview;
   · the Advanced Medical Report Builder's saved reports and the Clinical
     Value Scorecard's metrics.

   Everything here is synthetic training data over the emulator's roster, the
   same privacy boundary as the rest of the stage.
   ========================================================================= */

/** catalogue row slug (pbSlug of its name) → the window a double-click opens */
export const REPORT_WINDOWS: Record<string, string> = {
  'patient-by-diagnosis-fee': 'report-params-patient-by-diagnosis-fee',
  'age-sex-register': 'report-params-age-sex-register',
  'patients-by-age': 'report-params-patients-by-age',
  'patient-list': 'report-params-patient-list',
  'recall-list': 'report-params-recall-list',
  'complete-unsent-records': 'report-params-complete-unsent-records',
  'scorecard-clinical-value': 'clinical-value-scorecard',
  'advanced-medical-report-builder': 'advanced-report-builder-list',
  /* screens/PatientsByProcedureWindow.tsx (303122 `5bf91e6d…png`) */
  'patients-by-procedure': 'report-params-patients-by-procedure',
}

/* --- the list a report loads into the Chart Navigator ----------------------
   The navigator is the frame's own window (opened by id `chart-navigator`);
   a report fills it through here before opening it. The frame reads it only
   while the Reports module is in front, so a navigator opened from Find
   Patient or Demographics ▸ Utilities keeps its own list.               */
let navigatorRows: ChartNavigatorRow[] | null = null
export const loadReportNavigator = (rows: ChartNavigatorRow[]) => { navigatorRows = rows }
export const reportNavigatorRows = (): ChartNavigatorRow[] | undefined => navigatorRows ?? undefined

const navName = (chart: string) => {
  const p = patients.find((x) => x.chart === chart)
  return p ? `${p.last},${p.first}` : chart
}

/** 304025 `1a6d9804`: a Recall List sent to the navigator reads `RECALL` */
export const RECALL_NAVIGATOR_CHARTS = ['3598', '2429', '1885', '712']
export const recallNavigatorRows = (): ChartNavigatorRow[] =>
  RECALL_NAVIGATOR_CHARTS.map((chart) => ({ chart, name: navName(chart), description: 'RECALL' }))

/** 304023 `2cb8c9cb`: a scorecard's red button reads `FAILED: <metric> - <name>` */
export function scorecardNavigatorRows(metric: ScorecardMetric, passed: boolean): ChartNavigatorRow[] {
  const charts = passed ? ['3598', '746', '1003'] : ['2680', '2365']
  return charts.map((chart) => ({
    chart, name: navName(chart), description: `${passed ? 'PASSED' : 'FAILED'}: ${metric.code} - ${metric.name}`,
  }))
}

/** a report builder's Mail Merge: the patients its criteria matched */
export const builderNavigatorRows = (report: string): ChartNavigatorRow[] =>
  ['3609', '3658', '3093'].map((chart) => ({ chart, name: navName(chart), description: report }))

/* --- Patient by Diagnosis / Fee: the printed page (304022 `1a5db5e9`) -------
   `LIST OF PATIENTS WITH SELECTED PROBLEMS AS OF <date>`, the problems
   echoed and numbered with `*` where a concept matched, then one row per
   patient with the numbers of the problems they carry. */
export const DIAGNOSIS_CONCEPTS = new Set([
  'DIABETES', 'CHRONIC KIDNEY DISEASE', 'CHF', 'CHRONIC RESPIRATORY CONDITION',
  'CEREBROVASCULAR DISEASE', 'CHRONIC NEURODEGENERATIVE', 'COPD', 'CORONARY ARTERY DISEASE',
  'CARDIOVASCULAR DISEASE', 'ANTICOAGULATION',
])

/** whole years between a yyyy.mm.dd birth date and MOIS_TODAY */
export function yearsOld(dob: string): string {
  if (!dob) return ''
  const [y, m, d] = dob.split('.').map(Number)
  const [ty, tm, td] = MOIS_TODAY.split('.').map(Number)
  return String(ty! - y! - (tm! < m! || (tm === m && td! < d!) ? 1 : 0))
}

export function diagnosisReportPage(problems: string[], minProblems: number): string {
  const numbered = problems.map((p, i) => `${i + 1}. ${p}${p && DIAGNOSIS_CONCEPTS.has(p.toUpperCase()) ? '*' : ''}`)
  const pairs: string[] = []
  for (let i = 0; i < 8; i += 4) pairs.push(`%TR%${numbered.slice(i, i + 4).join('|')}`)
  const sample = [
    { chart: '3598', has: [1, 2] }, { chart: '2429', has: [2, 4] }, { chart: '746', has: [1, 4, 7] },
    { chart: '1885', has: [2, 4] }, { chart: '712', has: [1, 2, 4] }, { chart: '1003', has: [3] },
  ]
  const filled = problems.filter(Boolean).length
  const rows = sample
    .map((s) => ({ ...s, has: s.has.filter((n) => n <= Math.max(filled, 1)) }))
    .filter((s) => s.has.length >= Math.max(1, minProblems))
    .map((s) => {
      const p = patients.find((x) => x.chart === s.chart)!
      const probs = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => (s.has.includes(n) ? String(n) : '')).join(' ')
      return `%TR%${s.chart}|${p.last}|${p.first}|${p.gender ?? ''}|${p.dob}|${yearsOld(p.dob)}|${probs}|${p.home ?? ''}`
    })
  return [
    'MOIS TEST CLINIC',
    `%TITLE%LIST OF PATIENTS WITH SELECTED PROBLEMS AS OF ${MOIS_TODAY.replace(/\./g, '/')}`,
    'PROBLEMS (* indicates a concept)',
    '%COLS:25,25,25,25%',
    ...pairs,
    '%RULE%',
    '%COLS:7,14,14,5,11,6,27,16%',
    '%TH%CHART|LAST NAME|FIRST NAME|SEX|DOB|AGE|PROBLEMS|HOME TEL',
    ...rows,
    '',
    `TOTAL PATIENTS: ${rows.length}`,
  ].join('\n')
}

/* --- Complete Unsent Records (304052 `a32a86d6` / `4d64fe0c`) -------------- */
export function unsentClaimsPages(detail: boolean, includeHold: boolean): string[] {
  const claims = unsentClaims.filter((c) => c.compl && (!c.hold || includeHold))
  const byDoctor = new Map<string, typeof claims>()
  for (const c of claims) byDoctor.set(c.doctor, [...(byDoctor.get(c.doctor) ?? []), c])
  const money = (n: number) => n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const total = (list: typeof claims) => list.reduce((s, c) => s + Number(c.billed), 0)
  const asOf = MOIS_TODAY
  if (!detail) {
    return [[
      `%TITLE%COMPLETE UNSENT MSP SUBMISSION SUMMARY AS OF ${asOf}`,
      '%COLS:26,12,12,12,13,13,12%',
      '%TH%PROVIDER|PRACT NO|PAYEE NO|NUMBER OF CLAIMS|NEW CLAIMS|RESUBMITTED|TOTAL CLAIMS',
      ...[...byDoctor].map(([doctor, list]) => `%TR%${doctor}|||${list.length}|${money(total(list))}|0.00|${money(total(list))}`),
      '%COLS:26,12,12,12,13,13,12%',
      `%TR%**TOTAL READY CLAIMS FOR ALL PROVIDERS**|||**${claims.length}**|**${money(total(claims))}**|**0.00**|**${money(total(claims))}**`,
    ].join('\n')]
  }
  /* the detail report starts each provider on a new page */
  return [...byDoctor].map(([doctor, list], i, all) => [
    `%TITLE%COMPLETE UNSENT CLAIMS TO MSP RECORDS AS OF ${asOf}`,
    '%COLS:36,12,7,8,10,10,7,10%',
    '%TH%PATIENT|SERVICE DATE|PAYOR|FEE CODE|AMOUNT BILLED|DIAG CODE|LOC|SUB CODE',
    ...list.flatMap((c) => [
      `%TR%${c.last}, ${c.first}|${c.service}|${c.insrBy}|${c.fee}|${c.billed}|||${c.sub || '0'}`,
      `%TR%**SUB TOTAL ${doctor} ON ${c.service}**||||**${c.billed}**|||`,
    ]),
    `%TR%**TOTAL ${doctor}**||||**${money(total(list))}**|||`,
    ...(i === all.length - 1
      ? ['', '%COLS:36,12,7,8,10,10,7,10%', `%TR%**TOTAL READY CLAIMS FOR ALL PROVIDERS**||||**${money(total(claims))}**|||`]
      : []),
  ].join('\n'))
}

/* --- Clinical Value Scorecard (304048 `c4154ff8` / 304028 `4c1bc34f`) -------
   The metric rows and targets of `CVM LEVEL 3 - MAR 2014`, in the order the
   capture lists them. Numerators and denominators are synthetic. */
export type ScorecardMetric = { code: string; name: string; target: string; num: number; den: number }

export const SCORECARD_METRICS: ScorecardMetric[] = [
  { code: 'M01', name: 'PATIENT INFORMATION', target: '95%', num: 43, den: 47 },
  { code: 'M02', name: 'CONTACT INFORMATION', target: '90%', num: 14, den: 47 },
  { code: 'M03', name: 'PATIENT STATUS', target: '80%', num: 47, den: 54 },
  { code: 'M04a', name: 'PROBLEM LIST/HEALTH CONCERNS (ALL)', target: '40%', num: 21, den: 47 },
  { code: 'M04b', name: 'PROBLEM LIST/HEALTH CONCERNS (CODED)', target: '30%', num: 18, den: 47 },
  { code: 'M05a', name: 'ALLERGIES / INTOLERANCES (ALL)', target: '30%', num: 11, den: 47 },
  { code: 'M05b', name: 'ALLERGIES / INTOLERANCES (CODED)', target: '0%', num: 5, den: 47 },
  { code: 'M06a', name: 'SMOKING STATUS PRESENT', target: '20%', num: 17, den: 41 },
  { code: 'M06b', name: 'SMOKING STATUS CURRENT', target: 'N/A', num: 4, den: 26 },
  { code: 'M07', name: 'BLOOD PRESSURE', target: '50%', num: 15, den: 41 },
  { code: 'M08', name: 'HEIGHT/WEIGHT (BMI)', target: '30%', num: 26, den: 41 },
  { code: 'M09', name: 'PRESCRIPTION PRESENT', target: '40%', num: 20, den: 47 },
  { code: 'XX90', name: 'PRESCRIPTION CODED PRESENT', target: 'N/A', num: 20, den: 47 },
  { code: 'M10a', name: 'PROCEDURES PRESENT (ALL)', target: '30%', num: 22, den: 47 },
  { code: 'M10b', name: 'PROCEDURES PRESENT (CODED)', target: '0%', num: 14, den: 47 },
  { code: 'M11a', name: 'VACCINATIONS/IMMUNIZATION PRESENT', target: '20%', num: 12, den: 47 },
  { code: 'M11b', name: 'INFLUENZA VACCINATIONS', target: 'N/A', num: 3, den: 11 },
  { code: 'M12', name: 'RECALL REMINDERS', target: '20%', num: 6, den: 47 },
  { code: 'M13', name: 'REFERRALS PRESENT', target: '20%', num: 25, den: 47 },
  { code: 'M14', name: 'ENCOUNTER NOTES', target: '80%', num: 101, den: 138 },
]

/** the providers a metric node expands into; the last is always UNASSIGNED */
export const SCORECARD_PROVIDERS = ['BEARDWOOD, WALTER', 'DUCHARME, AMARILYS', 'FAIRCHILD, NESRIN L', 'HOWSER, DOOGIE', 'UNASSIGNED']

/** split a metric's totals across the providers, deterministically */
export function scorecardByProvider(m: ScorecardMetric): { provider: string; num: number; den: number }[] {
  const weights = [0.34, 0.22, 0.2, 0.16, 0.08]
  let dLeft = m.den
  let nLeft = m.num
  return SCORECARD_PROVIDERS.map((provider, i) => {
    const last = i === SCORECARD_PROVIDERS.length - 1
    const den = last ? dLeft : Math.round(m.den * weights[i]!)
    const num = last ? nLeft : Math.min(den, Math.round(m.num * weights[i]!))
    dLeft -= den
    nLeft -= num
    return { provider, num: Math.max(0, num), den: Math.max(0, den) }
  })
}

export const pct = (num: number, den: number) => (den ? `${((num / den) * 100).toFixed(1)}%` : '-')

/* --- Advanced Medical Report Builder (304055 `d2fba889`) --------------------
   The reports the list opens on, as the capture lists them, plus whatever
   this session saves. */
export type BuilderReport = { name: string; group: string; description: string; access: 'Private' | 'Limited' | 'Public' }

const SHIPPED_BUILDER_REPORTS: BuilderReport[] = [
  { name: 'ASTHMA PATIENTS - DECLINED INFLUENZA', group: '', description: 'Active patients, last contact in last 3 years, with Asthma and declined Influenza', access: 'Public' },
  { name: 'AVERAGE AGE', group: '', description: '', access: 'Public' },
  { name: 'BP DONE IN LAST 1 MONTH', group: '', description: '', access: 'Public' },
  { name: 'CERVICAL CANCER SCREENING / PAP', group: '', description: "Women 25-69 who don't have a Diagnosis of Cervical Cancer and who have not had a complete hysterectomy or cervical cancer screening", access: 'Public' },
  { name: 'COLORECTAL CANCER', group: '', description: '', access: 'Public' },
  { name: 'CVD', group: '', description: '', access: 'Public' },
  { name: 'CVD NO FRAMINGHAM', group: '', description: '', access: 'Public' },
  { name: 'CVD PATIENTS ON ASA', group: '', description: 'Patients with a Health Issue of CVD that have a Long Term Med entry for ASA', access: 'Public' },
  { name: 'CVD PATIENTS WITHOUT ASA', group: '', description: 'Patients with a Health issue of CVD without an entry for ASA in their Long Term Meds', access: 'Public' },
  { name: 'CVD RISK', group: '', description: '', access: 'Public' },
]

let savedBuilderReports: BuilderReport[] = []
export const builderReports = (): BuilderReport[] =>
  [...SHIPPED_BUILDER_REPORTS, ...savedBuilderReports].sort((a, b) => a.name.localeCompare(b.name))
/** Save Changes: a new name adds a row, an existing one is replaced */
export function saveBuilderReport(report: BuilderReport) {
  savedBuilderReports = [...savedBuilderReports.filter((r) => r.name !== report.name), report]
}
