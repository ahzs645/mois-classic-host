/* ============================================================================
   The Print menu's remaining chart reports (680492 "Print Menu"):

     Cumulative Lab Data for Patient   date range + output (Summary Only ·
                                       Comments Only · Comments and Report)
     Lab Code for Patient              one lab code + date range
     Lab Profile for Patient           one profile (a panel) + date range
     Reminder List for Patient         date range, Description contains,
                                       Current / Stopped / All
     Clinical History Tabular          date range → Health Conditions,
                                       Reaction Risks, Family History
     Clinical Summary                  problems, allergies, long term meds,
                                       interventions, images, consultations,
                                       procedures, admissions, family history
     Access List                       chart + date range → who was in the
                                       chart (the Chart Access report of
                                       Reports ▸ Security/Access Audit)

   PROVENANCE: 680492's prose for each (every image in that article is
   missing — `[IMG missing-image.]`), 303353's Print-menu glossary for the
   parameters ("Select the date range for the reminders you want to print.
   Also, you can filter the reminders by entering words that the description
   may contain, and choosing between current reminders, stopped reminders,
   or all reminders"; "Lab Code for Patient: … the date range and the
   specific lab"), and 680492's column lists ("This output will show only
   the test name, date collected, ordered by, result, units, flag and
   reference range"). Page layout follows the captured chart reports in
   data/printPages.ts (running header, identity block, %S% section titles,
   %U% column captions). Lab Profile's article section reads "NEEDS DATA":
   its parameters and page are INFERRED as Lab Code's with a panel in place
   of the code. Every layout here is INFERRED from prose.

   The Access List is built from the export's own audit stamps
   (stp_user_create / stp_date_create, stp_user_modify / stp_date_modify on
   every record), which is what a chart access report reads.
   ========================================================================= */
import type { MoisChartExport, MoisRecord } from './charts'
import {
  columns, dash, identityBlock, inRange, labelled, runningHeader, slash, type PrintContext,
} from './printPages'
import { MOIS_TODAY } from './patients'

const today = slash(MOIS_TODAY)
const group = (data: MoisChartExport | null, g: string): MoisRecord[] =>
  ((data as Record<string, MoisRecord[] | undefined> | null)?.[g] ?? [])
const newest = (rows: MoisRecord[], field: string) =>
  [...rows].sort((a, b) => String(b[field] ?? '').localeCompare(String(a[field] ?? '')))
const period = (params: PrintContext['params']) =>
  `PERIOD ${slash(String(params.from ?? '')) || '0000/00/00'} TO ${slash(String(params.to ?? '')) || today}`

/** a measure's reference range, from its normal limits */
const range = (m: MoisRecord) => (m.str_normal_lower || m.str_normal_high ? `${m.str_normal_lower ?? ''} - ${m.str_normal_high ?? ''}`.trim() : m.str_ref_range ?? '')
const labs = (data: MoisChartExport | null) => group(data, 'measure').filter((m) => m.str_value !== undefined || m.str_report)

const LAB_HEAD = '%U%DATE       TEST NAME                   ORDERED BY        RESULT      UNITS     FLAG  REF RANGE'
const labRow = (m: MoisRecord) => columns([
  [dash(m.dtm_collect_date), 11], [m.str_description ?? m.str_code ?? '', 28], [m.str_order_by ?? '', 18],
  [m.str_value ?? '', 12], [m.str_units ?? '', 10], [m.str_abnormal ?? '', 6], [range(m), 14],
])

/** 680492 Cumulative Lab Data for Patient, three outputs */
export function cumulativeLabPage({ patient, data, params }: PrintContext): string {
  const output = String(params.output ?? 'Summary Only')
  const rows = newest(labs(data), 'dtm_collect_date').filter((m) => inRange(m.dtm_collect_date, params))
  return [
    ...runningHeader([`CUMULATIVE LAB DATA AS OF ${today}`, period(params)], true),
    ...identityBlock(patient),
    '%S%LABORATORY RESULTS',
    LAB_HEAD,
    ...rows.flatMap((m) => [
      ...labRow(m),
      ...(output !== 'Summary Only' ? labelled('   Comment:', m.str_comment, 13) : []),
      ...(output === 'Comments and Report' ? labelled('   Report:', m.str_report, 13) : []),
    ]),
  ].join('\n')
}

/** 680492 Lab Code for Patient: one code's results */
export function labCodePage({ patient, data, params }: PrintContext): string {
  const code = String(params.code ?? '').trim().toUpperCase()
  const rows = newest(labs(data), 'dtm_collect_date')
    .filter((m) => !code || (m.str_code ?? '').toUpperCase() === code || (m.str_description ?? '').toUpperCase().includes(code))
    .filter((m) => inRange(m.dtm_collect_date, params))
  return [
    ...runningHeader([`LAB CODE ${code || '(ALL)'} AS OF ${today}`, period(params)], true),
    ...identityBlock(patient),
    `%S%${rows[0]?.str_description?.toUpperCase() ?? code ?? 'LAB CODE'}`,
    LAB_HEAD,
    ...rows.flatMap(labRow),
  ].join('\n')
}

/** 680492 Lab Profile for Patient ("NEEDS DATA"): the results of one panel */
export function labProfilePage({ patient, data, params }: PrintContext): string {
  const want = String(params.profile ?? '').trim().toUpperCase()
  const panels = group(data, 'panel').filter((p) => !want || (p.str_panel_name ?? '').toUpperCase().includes(want) || (p.str_panel_code ?? '').toUpperCase() === want)
  const out = [...runningHeader([`LAB PROFILE AS OF ${today}`, period(params)], true), ...identityBlock(patient)]
  for (const p of panels) {
    out.push(`%S%${(p.str_panel_name ?? p.str_panel_code ?? '').toUpperCase()}   ${dash(p.dtm_observation_date)}`, LAB_HEAD)
    group(data, 'measure').filter((m) => m.id_panel === p.id_panel && inRange(m.dtm_collect_date, params)).forEach((m) => out.push(...labRow(m)))
  }
  return out.join('\n')
}

/** 680492 / 303353 Reminder List for Patient */
export function reminderListPage({ patient, params }: PrintContext): string {
  const which = String(params.which ?? 'Current')
  const contains = String(params.contains ?? '').trim().toUpperCase()
  const rows = (patient.reminders ?? [])
    .filter((r) => which === 'All' || (which === 'Stopped' ? r.stopped : !r.stopped))
    .filter((r) => !contains || r.reminder.toUpperCase().includes(contains))
    .filter((r) => !r.due || inRange(r.due, params))
  return [
    ...runningHeader([`PATIENT REMINDERS AS OF ${today}`, period(params)], true),
    ...identityBlock(patient),
    `%S%REMINDERS (${which.toUpperCase()})`,
    '%U%DUE        CODE        REMINDER                                  LEVEL     NOTE',
    ...rows.flatMap((r) => columns([[dash(r.due), 11], [r.code, 12], [r.reminder, 42], [r.level, 10], [r.note, 18]])),
  ].join('\n')
}

/** 680492 Clinical History Tabular: Health Conditions, Reaction Risks, Family History */
export function clinicalHistoryTabularPage({ patient, data, params }: PrintContext): string {
  return [
    ...runningHeader([`CLINICAL HISTORY (TABULAR) AS OF ${today}`, period(params)], true),
    ...identityBlock(patient),
    '%S%HEALTH CONDITIONS',
    '%U%START      RESOLVE     PROBLEM',
    ...newest(group(data, 'health_issue'), 'dtm_start').flatMap((r) => columns([[dash(r.dtm_start), 11], [dash(r.dtm_resolve), 12], [r.str_problem_name ?? '', 70]])),
    '%S%REACTION RISKS',
    '%U%START      SUBSTANCE                                 REACTION(S)',
    ...newest(group(data, 'allergy'), 'dtm_start').flatMap((r) => columns([[dash(r.dtm_start), 11], [r.str_substance ?? '', 42], [r.str_reactions ?? '', 40]])),
    '%S%FAMILY HISTORY',
    '%U%RELATIONSHIP                             CONDITION',
    ...group(data, 'family_hx').map((r) => `${(r.str_relationship ?? '').padEnd(38)}-> ${r.str_problem_name ?? r.str_description ?? ''}`.replace(/\s+$/, '')),
  ].join('\n')
}

/** 680492 / 303353 Clinical Summary: an overview of the chart */
export function clinicalSummaryPage({ patient, data }: PrintContext): string {
  const orders = (type: string) => newest(group(data, 'order').filter((o) => o.str_order_type === type), 'dtm_ord_date')
  const section = (title: string, head: string, rows: string[]) => [`%S%${title}`, `%U%${head}`, ...(rows.length ? rows : ['  (none)'])]
  return [
    ...runningHeader([`CLINICAL SUMMARY AS OF ${today}`], false),
    ...identityBlock(patient),
    ...section('PROBLEMS', 'START      RESOLVE     PROBLEM', newest(group(data, 'health_issue'), 'dtm_start').flatMap((r) => columns([[dash(r.dtm_start), 11], [dash(r.dtm_resolve), 12], [r.str_problem_name ?? '', 70]]))),
    ...section('ALLERGIES', 'START      SUBSTANCE                                 REACTION(S)', group(data, 'allergy').flatMap((r) => columns([[dash(r.dtm_start), 11], [r.str_substance ?? '', 42], [r.str_reactions ?? '', 40]]))),
    ...section('LONG TERM MEDICATIONS', 'START      MEDICATION                                          DOSE / FREQUENCY', group(data, 'medication_lt').flatMap((r) => columns([[dash(r.dtm_start), 11], [r.str_medication ?? '', 52], [r.str_dose_freq ?? '', 30]]))),
    ...section('INTERVENTIONS', 'DATE       INTERVENTION', group(data, 'intervention').flatMap((r) => columns([[dash(r.dtm_performed ?? r.dtm_start), 11], [r.str_description ?? '', 80]]))),
    ...section('IMAGES', 'DATE       DESCRIPTION', [...orders('IMAGING'), ...orders('XRAY')].flatMap((r) => columns([[dash(r.dtm_ord_date), 11], [r.str_description ?? '', 80]]))),
    ...section('CONSULTATIONS', 'DATE       REFERRED TO          DESCRIPTION', orders('CONSULTATION').flatMap((r) => columns([[dash(r.dtm_ord_date), 11], [r.str_performed_by ?? '', 21], [r.str_description ?? '', 60]]))),
    ...section('PROCEDURES', 'DATE       DESCRIPTION', orders('PROCEDURE').flatMap((r) => columns([[dash(r.dtm_ord_date), 11], [r.str_description ?? '', 80]]))),
    ...section('ADMISSIONS', 'DISCHARGE  FACILITY                  DESCRIPTION', group(data, 'admission').flatMap((r) => columns([[dash(r.dtm_discharge), 11], [r.str_facility ?? '', 26], [r.str_description ?? '', 56]]))),
    ...section('FAMILY HISTORY', 'RELATIONSHIP                             CONDITION', group(data, 'family_hx').map((r) => `${(r.str_relationship ?? '').padEnd(38)}-> ${r.str_problem_name ?? ''}`)),
  ].join('\n')
}

/** the folder an export group is filed under, for the access report */
const FOLDERS: Record<string, string> = {
  encounter: 'ENCOUNTERS', encounter_note: 'ENCOUNTERS', measure: 'MEASURES', order: 'ORDERS', document: 'DOCUMENTS',
  prescription: 'PRESCRIPTIONS', health_issue: 'HEALTH ISSUES', allergy: 'ALLERGY / INTOLERANCES', family_hx: 'FAMILY HISTORY',
  mar: 'MAR', goal: 'GOALS', dform_header: 'DYNAMIC FORMS', chart_preference: 'PREFERENCES', service_event: 'SERVICE EVENTS',
}

/** 680492 Access List: "select a chart and date range to find out what user has been in the chart" */
export function accessListPage({ patient, data, params }: PrintContext): string {
  const hits: { when: string; user: string; action: string; folder: string }[] = []
  for (const [g, folder] of Object.entries(FOLDERS)) {
    for (const r of group(data, g)) {
      if (r.stp_date_create && r.stp_user_create) hits.push({ when: r.stp_date_create, user: r.stp_user_create, action: 'CREATE', folder })
      if (r.stp_date_modify && r.stp_user_modify) hits.push({ when: r.stp_date_modify, user: r.stp_user_modify, action: 'MODIFY', folder })
    }
  }
  const rows = hits.filter((h) => inRange(h.when, params)).sort((a, b) => b.when.localeCompare(a.when))
  return [
    ...runningHeader([`CHART ACCESS REPORT AS OF ${today}`, period(params)], true),
    ...identityBlock(patient),
    '%S%CHART ACCESS',
    '%U%DATE / TIME          USER                          ACCESS    FOLDER',
    ...rows.flatMap((h) => columns([[h.when.replace(/\//g, '-'), 21], [h.user, 30], [h.action, 10], [h.folder, 30]])),
  ].join('\n')
}
