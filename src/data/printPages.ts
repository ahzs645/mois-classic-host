/* ============================================================================
   The chart reports' pages, laid out from the open chart.

   MOIS fills every Print-menu report from the chart it has open: the header
   block is the patient's, the rows are the chart's records. A static sample
   patient on the page contradicts the banner above it, so each report in
   `printReports.ts` names a builder here and the preview calls it with the
   open chart's export.

   Layout is transcribed per report from the manual's article image (cited on
   each builder). The page markup the preview understands:

     %RULE%          a full-measure paragraph rule
     %G%text         the grey running header (clinic, title, period lines)
     %S%text         a bold section title (PROBLEM LIST, CONSULTATIONS, …)
     %U%text         a column-caption line with the rule drawn under it
     **text**        bold inline (the patient values in the identity block)
     %COLS:a,b,…%    starts a proportional table; following %TR%a|b|… lines
                     are its rows, %TH% its caption row (MAR History only)

   Everything is monospace (Lucida Console, 93 columns) except MAR History,
   which MOIS renders as a DataWindow report in a proportional face.
   ========================================================================= */
import type { MoisChartExport, MoisRecord } from './charts'
import { ROW_MAPS } from './charts/to-rows'
import type { ChartPatient } from './patient-context'
import { MOIS_TODAY } from './patients'

export type PrintParams = Record<string, string | boolean>

export type PrintContext = {
  patient: ChartPatient
  /** the open chart's export; null when it has none (the page is then empty) */
  data: MoisChartExport | null
  /** what the Selection Parameter window held when Ok was pressed */
  params: PrintParams
}

export const PAGE_WIDTH = 93
/** the clinic MOIS prints at the top left of every chart report */
export const CLINIC = 'HALLIWELL MEDICAL CLINIC'

/** YYYY.MM.DD (the dialog) or YYYY/MM/DD (the export) → YYYY/MM/DD */
export const slash = (v?: string) => (v ?? '').split(' ')[0]!.replace(/[.-]/g, '/')
/** → YYYY-MM-DD, the dashed form the Richtext reports print in their rows */
export const dash = (v?: string) => (v ?? '').split(' ')[0]!.replace(/[./]/g, '-')
/** → YYYY.MM.DD, the MAR report's form */
export const dot = (v?: string) => (v ?? '').split(' ')[0]!.replace(/[/-]/g, '.')
const today = slash(MOIS_TODAY)

const pad = (s: string, n: number) => (s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length))
const center = (s: string) => ' '.repeat(Math.max(0, Math.floor((PAGE_WIDTH - s.length) / 2))) + s

/**
 * One row of fixed columns: `[[text, width], …]`, the last cell unpadded.
 * A cell longer than its width wraps onto continuation lines in the same
 * column, which is what MOIS does with `FILATOV, Sergei Alexandrovich`.
 */
export function columns(cells: [string, number][]): string[] {
  const wrapped = cells.map(([text, width], i) => {
    const w = i === cells.length - 1 ? PAGE_WIDTH : width - 1
    return wrap(text, Math.max(1, w))
  })
  const height = Math.max(...wrapped.map((c) => c.length))
  const out: string[] = []
  for (let line = 0; line < height; line += 1) {
    out.push(cells.map(([, width], i) => {
      const text = wrapped[i]![line] ?? ''
      return i === cells.length - 1 ? text : pad(text, width)
    }).join('').replace(/\s+$/, ''))
  }
  return out
}

function wrap(text: string, width: number): string[] {
  if (!text) return ['']
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    if (!line) line = word
    else if (line.length + 1 + word.length <= width) line += ` ${word}`
    else { lines.push(line); line = word }
  }
  if (line) lines.push(line)
  return lines
}

/** a labelled block (`   Report: …`, `  COMMENT: …`) indented under a row */
export function labelled(label: string, text: string | undefined, indent: number): string[] {
  if (!text?.trim()) return []
  const out: string[] = []
  text.split(/\r?\n/).forEach((para, p) => {
    const lines = wrap(para.trim(), PAGE_WIDTH - indent)
    lines.forEach((l, i) => {
      out.push(pad(p === 0 && i === 0 ? label : '', indent) + l)
    })
  })
  return out
}

/* ---- the running header and the identity block ------------------------- */

/**
 * Clinic and `Page 1` on one grey line, then the report's title lines.
 * `centred` titles are the dated reports (radiology, consultations,
 * procedures, admissions, interventions); the three undated lists print
 * theirs flush left under the clinic, as 303457 / 303158 / 303444 show.
 */
export function runningHeader(titles: string[], centred: boolean): string[] {
  const page = 'Page **1**'
  const clinic = pad(CLINIC, PAGE_WIDTH - 6)
  return [
    `%G%${clinic}${page}`,
    ...titles.map((t) => `%G%${centred ? center(t) : t}`),
    '%RULE%',
  ]
}

const nameOf = (p: ChartPatient) =>
  [p.last, [p.first, p.middle].filter(Boolean).join(' ')].filter(Boolean).join(', ').toUpperCase()

/**
 * `PATIENT : NAME … DOB: … SEX: …` and `INS NO. : … CHART: …`, values bold.
 * The BCHN pair on the second line is the current build's
 * (303146 `8e214ced…`); the v02.17 captures leave it out.
 */
export function identityBlock(p: ChartPatient): string[] {
  const name = nameOf(p)
  const dob = dash(p.dob)
  const left1 = `PATIENT : `
  const right1 = `DOB: ${dob} SEX: ${p.sex || ''}`
  const gap1 = PAGE_WIDTH - 4 - left1.length - name.length - right1.length
  const ins = [p.insuranceBy, p.insurance, p.dep || '00'].filter(Boolean).join('  ')
  const left2 = `INS NO. : `
  const bchn = p.bchn || (p.insuranceBy === 'BC' ? p.insurance : '') || ''
  const mid2 = bchn ? `   BCHN : ${bchn}` : ''
  const right2 = `CHART: ${p.chart}`
  const gap2 = PAGE_WIDTH - 4 - left2.length - ins.length - mid2.length - right2.length
  return [
    '',
    `${left1}**${name}**${' '.repeat(Math.max(2, gap1))}DOB: **${dob}** SEX: **${p.sex || ''}**`,
    `${left2}**${ins}**${bchn ? `   BCHN : **${bchn}**` : ''}${' '.repeat(Math.max(2, gap2))}CHART: **${p.chart}**`,
    '',
  ]
}

/* ---- record helpers ---------------------------------------------------- */

const group = (data: MoisChartExport | null, g: keyof MoisChartExport): MoisRecord[] =>
  ((data?.[g] as MoisRecord[] | undefined) ?? [])

const newestFirst = (rows: MoisRecord[], field: string) =>
  [...rows].sort((a, b) => String(b[field] ?? '').localeCompare(String(a[field] ?? '')))

/** a record date (any separator) inside the dialog's inclusive From/To */
export function inRange(value: string | undefined, params: PrintParams, from = 'from', to = 'to'): boolean {
  const v = slash(value)
  const lo = slash(String(params[from] ?? ''))
  const hi = slash(String(params[to] ?? ''))
  if (!v) return false
  if (lo && !/^0000/.test(lo) && v < lo) return false
  if (hi && !/^0000/.test(hi) && v > hi) return false
  return true
}

const isOrder = (type: string) => (r: MoisRecord) => r.str_order_type === type
const orderText = (r: MoisRecord) => r.str_description ?? r.str_code_term ?? ''
const orderReport = (r: MoisRecord) => r.str_report ?? r.str_result ?? r.str_note ?? ''

/* ---- the pages --------------------------------------------------------- */

/** 303457 `12c75ead…`: PROBLEM LIST — START / RESOLVE / PROBLEM, comments indented */
export function problemListPage({ patient, data }: PrintContext): string {
  const rows = newestFirst(group(data, 'health_issue'), 'dtm_start')
  return [
    ...runningHeader([`PATIENT PROBLEM LIST AS OF ${today}`], false),
    ...identityBlock(patient),
    '%S%PROBLEM LIST',
    '%U%START      RESOLVE     PROBLEM',
    ...rows.flatMap((r) => [
      ...columns([[dash(r.dtm_start), 11], [dash(r.dtm_resolve), 12], [r.str_problem_name ?? '', 70]]),
      ...labelled('', r.str_comment ?? r.str_note, 27),
    ]),
  ].join('\n')
}

/** 303158 `d3adc46e…`: FAMILY HISTORY — RELATIONSHIP -> CONDITION, relatives in mixed case */
export function familyHistoryPage({ patient, data }: PrintContext): string {
  const rows = [...group(data, 'family_hx')].sort((a, b) =>
    String(a.str_relationship ?? '').localeCompare(String(b.str_relationship ?? '')))
  return [
    ...runningHeader([`PATIENT FAMILY HISTORY AS OF ${today}`], false),
    ...identityBlock(patient),
    '%S%FAMILY HISTORY',
    `%U%${pad('RELATIONSHIP', 41)}CONDITION`,
    ...rows.map((r) => `${pad(r.str_relationship ?? '', 38)}-> ${r.str_problem_name ?? r.str_description ?? ''}`.replace(/\s+$/, '')),
  ].join('\n')
}

/** 303444 `07cf40c5…`: SOCIAL HISTORY — START / END / DESCRIPTION, `COMMENT:` under a row */
export function socialHistoryPage({ patient, data }: PrintContext): string {
  const rows = newestFirst(group(data, 'social_hx' as keyof MoisChartExport), 'dtm_start')
  return [
    ...runningHeader([`PATIENT SOCIAL HISTORY AS OF ${today}`], false),
    ...identityBlock(patient),
    '%S%SOCIAL HISTORY',
    '%U%START      END         DESCRIPTION',
    ...rows.flatMap((r) => [
      ...columns([[dash(r.dtm_start), 11], [dash(r.dtm_end), 12], [r.str_description ?? '', 70]]),
      ...labelled('  COMMENT:', r.str_comment ?? r.str_note, 11),
    ]),
  ].join('\n')
}

const periodLine = (params: PrintParams, word = 'PERIOD') =>
  `${word} ${slash(String(params.from ?? '')) || '0000/00/00'} TO ${slash(String(params.to ?? '')) || today}`

/** 303120 `83853431…`: IMAGE SUMMARY — DATE / ORDERED BY / DESCRIPTION / DETAIL, `Report:` block */
export function radiologyPage({ patient, data, params }: PrintContext): string {
  const detail = params.detail !== false
  const rows = newestFirst(group(data, 'order'), 'dtm_ord_date')
    .filter((r) => r.str_order_type === 'IMAGING' || r.str_order_type === 'XRAY')
    .filter((r) => inRange(r.dtm_finish_date || r.dtm_ord_date, params))
  return [
    ...runningHeader([`RADIOLOGY REPORT AS OF ${today}`, periodLine(params)], true),
    ...identityBlock(patient),
    '%S%IMAGE SUMMARY',
    `%U%${pad('DATE', 11)}${pad('ORDERED BY', 19)}${pad('DESCRIPTION', 50)}DETAIL`,
    ...rows.flatMap((r) => [
      ...columns([[dash(r.dtm_finish_date || r.dtm_ord_date), 11], [r.str_order_by ?? '', 19], [orderText(r), 50], [r.str_detail ?? '', 13]]),
      ...(detail ? labelled('   Report:', orderReport(r), 11) : []),
    ]),
  ].join('\n')
}

/**
 * 303134 `81cf425c…`: CONSULTATIONS — SEEN / REFER BY / SEEN BY / DESCRIPTION.
 * Dated by the seen (finish) date, so a referral still waiting to be seen
 * has no date to fall inside the range and does not print.
 */
export function consultationsPage({ patient, data, params }: PrintContext): string {
  const detail = params.detail !== false
  const rows = newestFirst(group(data, 'order').filter(isOrder('CONSULTATION')), 'dtm_finish_date')
    .filter((r) => inRange(r.dtm_finish_date, params))
  return [
    ...runningHeader([`CONSULTATIONS AS OF ${today}`, periodLine(params, 'FROM')], true),
    ...identityBlock(patient),
    '%S%CONSULTATIONS',
    `%U%${pad('SEEN', 11)}${pad('REFER BY', 16)}${pad('SEEN BY', 17)}DESCRIPTION`,
    ...rows.flatMap((r) => [
      ...columns([[dash(r.dtm_finish_date), 11], [r.str_order_by ?? '', 16], [r.str_performed_by ?? r.str_assignedto ?? '', 17], [orderText(r), 49]]),
      ...(detail ? labelled('   Report:', orderReport(r), 11) : []),
    ]),
  ].join('\n')
}

/** 303142 `035b042b…`: PROCEDURES — PERFORMED / PERFORMED BY / DESCRIPTION, `Report:` block */
export function proceduresPage({ patient, data, params }: PrintContext): string {
  const detail = params.detail !== false
  const rows = newestFirst(group(data, 'order').filter(isOrder('PROCEDURE')), 'dtm_ord_date')
    .filter((r) => inRange(r.dtm_finish_date || r.dtm_ord_date, params))
  return [
    ...runningHeader([`PATIENT PROCEDURES AS OF ${today}`, periodLine(params)], true),
    ...identityBlock(patient),
    '%S%PROCEDURES',
    `%U%${pad('PERFORMED', 11)}${pad('PERFORMED BY', 17)}DESCRIPTION`,
    ...rows.flatMap((r) => [
      ...columns([[dash(r.dtm_finish_date || r.dtm_ord_date), 11], [r.str_performed_by ?? r.str_order_by ?? '', 17], [orderText(r), 60]]),
      ...(detail ? labelled('   Report:', orderReport(r), 11) : []),
    ]),
  ].join('\n')
}

/**
 * 303591 `b7ae6c19…`: FACILITY ADMISSION — DISCHARGE / FACILITY / DESCRIPTION.
 * Dated by discharge: the admission date is not on the page at all.
 */
export function admissionsPage({ patient, data, params }: PrintContext): string {
  const detail = params.detail !== false
  const rows = newestFirst(group(data, 'admission' as keyof MoisChartExport), 'dtm_discharge')
    .filter((r) => inRange(r.dtm_discharge, params))
  return [
    ...runningHeader([`FACILITY ADMISSIONS AS OF ${today}`, periodLine(params)], true),
    ...identityBlock(patient),
    '%S%FACILITY ADMISSION',
    `%U%${pad('DISCHARGE', 11)}${pad('FACILITY', 26)}DESCRIPTION`,
    ...rows.flatMap((r) => [
      ...columns([[dash(r.dtm_discharge), 11], [r.str_facility ?? '', 26], [r.str_description ?? '', 56]]),
      ...(detail ? labelled('   Report:', r.str_report ?? r.str_note, 11) : []),
    ]),
  ].join('\n')
}

/** 303146 `8e214ced…`: INTERVENTIONS — DATE / PERFORMED BY / INTERVENTION / DEC / N.IND, legend */
export function interventionsPage({ patient, data, params }: PrintContext): string {
  const includes = String(params.includes ?? '').trim()
  const excludes = String(params.excludes ?? '').trim()
  const rows = newestFirst(group(data, 'intervention' as keyof MoisChartExport), 'dtm_performed')
    .filter((r) => inRange(r.dtm_performed ?? r.dtm_start, params))
    .filter((r) => !includes || (r.str_description ?? '').toUpperCase().includes(includes.toUpperCase()))
    .filter((r) => !excludes || !(r.str_description ?? '').toUpperCase().includes(excludes.toUpperCase()))
  return [
    ...runningHeader([
      `PATIENT INTERVENTIONS AS OF ${today}`,
      periodLine(params),
      `DESCRIPTION - INCLUDES: ${includes ? includes.toUpperCase() : '<ALL>'} - EXCLUDES: ${excludes ? excludes.toUpperCase() : '<NONE>'}`,
    ], true),
    ...identityBlock(patient),
    '%S%INTERVENTIONS',
    `%U%${pad('DATE', 11)}${pad('PERFORMED BY', 17)}${pad('INTERVENTION', 48)}${pad('DEC', 5)}N.IND`,
    ...rows.flatMap((r) => columns([
      [dash(r.dtm_performed ?? r.dtm_start), 11], [r.str_performed_by ?? '', 17], [r.str_description ?? '', 48],
      [r.str_declined === 'Y' ? 'Y' : 'N', 5], [r.str_not_indicated === 'Y' ? 'Y' : '', 5],
    ])),
    'DEC = DECLINED   N.IND = NOT INDICATED',
  ].join('\n')
}

/**
 * The long-term medication list the Long Term Meds folder shows: the
 * export's tdt_medication_lt records (`ROW_MAPS.ltm` in charts/to-rows.ts),
 * one row per drug. Show Stopped Medications off leaves out any with an end
 * date already past.
 */
function longTermMeds(data: MoisChartExport | null, stopped: boolean): MoisRecord[] {
  const map = ROW_MAPS.ltm
  if (!map) return []
  const seen = new Set<string>()
  return newestFirst(group(data, map.group).filter((r) => !map.where || map.where(r)), map.sort ?? 'dtm_order')
    .filter((r) => {
      const drug = (r.str_generic_name ?? r.str_medication ?? '').toUpperCase()
      if (seen.has(drug)) return false
      seen.add(drug)
      return true
    })
    .filter((r) => stopped || !r.dtm_end || slash(r.dtm_end) >= today)
}

/**
 * The long-term medication list. Its dialog is captured
 * (`patient_chart/long_term_meds/active.PNG`); its page is not, anywhere, so
 * the layout follows the captured sibling reports: REACTION RISK first, then
 * the medications.
 */
export function medicationsPage({ patient, data, params }: PrintContext): string {
  const risks = newestFirst(group(data, 'allergy'), 'dtm_start')
  const meds = longTermMeds(data, params.stopped === true)
  return [
    ...runningHeader([`PATIENT LONG TERM MEDICATION LIST AS OF ${today}`], false),
    ...identityBlock(patient),
    '%S%REACTION RISK',
    `%U%${pad('START', 11)}${pad('SUBSTANCE', 41)}REACTION(S)`,
    ...risks.flatMap((r) => columns([[dash(r.dtm_start), 11], [r.str_substance ?? '', 41], [r.str_reactions ?? r.str_reaction ?? '', 41]])),
    '%S%MEDICATION',
    `%U%${pad('START', 11)}${pad('END', 11)}${pad('MEDICATION', 42)}${pad('DOSE / FREQ', 16)}INDICATION`,
    ...meds.flatMap((r) => columns([
      [dash(r.dtm_start ?? r.dtm_order), 11], [dash(r.dtm_end), 11], [r.str_medication ?? '', 42], [r.str_dose_freq ?? '', 16], [r.str_indication ?? '', 13],
    ])),
  ].join('\n')
}

/**
 * 319686 `5239c82b…`: MAR HISTORY AS OF — a DataWindow report, not a
 * Richtext one: proportional type, a bold centred title, the filter echo
 * (ALL RECORDS) under it, then IMMUNIZATION HISTORY and REACTION RISK tables.
 * Dates here are yyyy.mm.dd, unlike the dashed dates of the Richtext reports.
 */
export function marHistoryPage({ patient, data, params }: PrintContext): string {
  const concept = String(params.concept ?? '').trim().toUpperCase()
  const dated = !!(String(params.from ?? '').replace(/0|\./g, '') || String(params.to ?? '').replace(/0|\./g, ''))
  const picked = params.picked ? String(params.picked).split(',') : null
  const mar = newestFirst(group(data, 'mar'), 'dtm_admin_date')
    .filter((r) => !dated || inRange(r.dtm_admin_date, params))
    .filter((r) => !concept || `${r.str_generic_name ?? ''} ${r.str_medication ?? ''}`.toUpperCase().includes(concept))
    .filter((r) => !picked || picked.includes(r.id_mar ?? ''))
  const risks = newestFirst(group(data, 'allergy'), 'dtm_start')
  const echo = !dated && !concept && !picked ? 'ALL RECORDS'
    : [dated ? `${dot(String(params.from))} TO ${dot(String(params.to))}` : '', concept].filter(Boolean).join(' - ') || 'SELECTED RECORDS'
  const cell = (s?: string) => (s ?? '').replace(/\|/g, '/')
  return [
    `%G%${pad(CLINIC, PAGE_WIDTH - 6)}Page **1**`,
    `%TITLE%MAR HISTORY AS OF ${dot(MOIS_TODAY)}`,
    '%RULE%',
    `%SUB%${echo}`,
    `%COLS:13,50,20,17%`,
    `%TR%**PATIENT:**|${nameOf(patient)}|DOB:   ${dot(patient.dob)}|SEX:  ${patient.sex}`,
    `%TR%|INSURANCE:   ${[patient.insuranceBy, patient.insurance, patient.dep || '00'].filter(Boolean).join('     ')}|(yyyy.mm.dd)|`,
    '%RULE%',
    '%S%IMMUNIZATION HISTORY',
    '%COLS:13,46,8,25,18%',
    '%TH%DATE|MEDICATION / AGENT|SERIES|SITE|LOT NUMBER',
    ...mar.map((r) => `%TR%${dot(r.dtm_admin_date)}|${cell(r.str_generic_name ?? r.str_medication)}|${cell(r.str_series)}|${cell(r.str_site)}|${cell(r.str_lot_number)}`),
    '%RULE%',
    '%S%REACTION RISK',
    '%COLS:11,15,40,34%',
    '%TH%DATE|INTOLERANCE TYPE|SUBSTANCE|REACTION(S)',
    ...risks.map((r) => `%TR%${dot(r.dtm_start)}|${cell(r.str_intolerance_type)}|${cell(r.str_substance)}|${cell(r.str_reactions ?? r.str_reaction)}`),
  ].join('\n')
}

/**
 * 303082 `26d0eab1…`: the segmented clinical history. The clinic's own block
 * (name, address, phone and fax) sits under the running header, then the
 * identity block, then one section per Include Section row that was ticked.
 */
export function clinicalHistoryPage({ patient, data, params }: PrintContext): string {
  const include = (s: string) => params[`include:${s}`] === true
  const detail = (s: string) => params[`detail:${s}`] === true
  const all = params.all === true
  const within = (v?: string) => all || inRange(v, params)
  const out: string[] = [
    `%G%${pad(CLINIC, PAGE_WIDTH - 6)}Page **1**`,
    `%G%CLINIC HISTORY AS OF ${dash(MOIS_TODAY)}`,
    '%RULE%',
    `**${CLINIC}**`,
    '1100 - 6th AVENUE',
    'PRINCE GEORGE, BC  V2L 3M6',
    'PHONE: 2505642644    FAX: 2505642655',
    ...identityBlock(patient),
  ]
  if (include('Problem List')) {
    out.push('%S%PROBLEM LIST', '%U%START      RESOLVE     PROBLEM')
    newestFirst(group(data, 'health_issue'), 'dtm_start')
      .filter((r) => all || !r.dtm_start || within(r.dtm_start))
      .forEach((r) => out.push(...columns([[dash(r.dtm_start), 11], [dash(r.dtm_resolve), 12], [r.str_problem_name ?? '', 70]])))
  }
  if (include('Reaction Risks')) {
    out.push('%S%REACTION RISKS', `%U%${pad('START', 11)}${pad('SUBSTANCE', 41)}REACTION(S)`)
    newestFirst(group(data, 'allergy'), 'dtm_start')
      .forEach((r) => out.push(...columns([[dash(r.dtm_start), 11], [r.str_substance ?? '', 41], [r.str_reactions ?? '', 41]])))
  }
  if (include('MAR')) {
    out.push('%S%MAR', `%U%${pad('DATE', 11)}${pad('MEDICATION / AGENT', 50)}ADMINISTERED BY`)
    newestFirst(group(data, 'mar'), 'dtm_admin_date').filter((r) => within(r.dtm_admin_date))
      .forEach((r) => out.push(...columns([[dash(r.dtm_admin_date), 11], [r.str_generic_name ?? r.str_medication ?? '', 50], [r.str_admin_by ?? '', 32]])))
  }
  if (include('Consultations')) {
    out.push('%S%CONSULTATIONS', `%U%${pad('SEEN', 11)}${pad('REFER BY', 16)}${pad('SEEN BY', 17)}DESCRIPTION`)
    newestFirst(group(data, 'order').filter(isOrder('CONSULTATION')), 'dtm_finish_date').filter((r) => within(r.dtm_finish_date))
      .forEach((r) => out.push(...columns([[dash(r.dtm_finish_date), 11], [r.str_order_by ?? '', 16], [r.str_performed_by ?? '', 17], [orderText(r), 49]])))
  }
  if (include('Family History')) {
    out.push('%S%FAMILY HISTORY', `%U%${pad('RELATIONSHIP', 41)}CONDITION`)
    group(data, 'family_hx').forEach((r) => out.push(`${pad(r.str_relationship ?? '', 38)}-> ${r.str_problem_name ?? ''}`.replace(/\s+$/, '')))
  }
  if (include('Encounters')) {
    out.push('%S%ENCOUNTERS', `%U%${pad('DATE', 11)}${pad('ATTENDING', 31)}REASON`)
    const notes = group(data, 'encounter_note')
    newestFirst(group(data, 'encounter'), 'dtm_appoint').filter((r) => within(r.dtm_appoint)).forEach((r) => {
      out.push(...columns([[dash(r.dtm_appoint), 11], [r.lkp_provider ?? r.str_attending ?? '', 31], [r.str_appt_note ?? '', 51]]))
      if (detail('Encounters')) {
        notes.filter((n) => n.id_encounter === r.id_encounter)
          .forEach((n) => out.push(...labelled('   Note:', n.str_note ?? n.str_text ?? '', 11)))
      }
    })
  }
  return out.join('\n')
}
