/* ============================================================================
   The Care Plan summary's rows, gathered from the chart.

   Art. 303472: "a consolidated view of records in the Care Plan folders,
   Health Issues folders, Long Term Medications and any information that has
   been 'tagged' to the Care Plan. All items marked as Sensitive are
   excluded." By default the summary includes Preferences, Goals, Planned
   Actions, Barriers to Care, Patient Resources, all three Health Issues
   subfolders and Long Term Medications. Its captures also band REACTION RISKS
   (`7abec7c5…`, `3d93f580…`), so allergies are gathered too.

   The Detail column per folder is the article's table: Preferences show the
   setting / reason code, Goals their phase, Planned Actions and Needs their
   participants, Conditions `Certainty: … - Severity: …`, medications their
   dose and frequency. A condition's comment prints on the lines under it.

   Section names and order are 2070139 `3d93f580…` (v02.22): ASSOCIATED PARTY,
   ADVANCE DIRECTIVE, PREFERENCES, GOALS, ACTIONS, BARRIERS TO CARE,
   RESOURCES, HEALTH ISSUES, HEALTH RISKS, HEALTH NEEDS, LONG TERM
   MEDICATIONS, REACTION RISKS, MEASUREMENTS, CONSULTS, GENERAL.
   ========================================================================= */
import type { MoisChartExport, MoisRecord } from './charts'
import type { CarePlanTag } from './chartSession'

export const CARE_PLAN_SECTIONS = [
  'ASSOCIATED PARTY', 'ADVANCE DIRECTIVE', 'PREFERENCES', 'GOALS', 'ACTIONS',
  'BARRIERS TO CARE', 'RESOURCES', 'HEALTH ISSUES', 'HEALTH RISKS', 'HEALTH NEEDS',
  'LONG TERM MEDICATIONS', 'REACTION RISKS', 'MEASUREMENTS', 'CONSULTS', 'GENERAL',
] as const

/** the band colours 303472 `7abec7c5…` shows: green preferences, pale blue
    health issues, yellow reaction risks; every other band is the pale blue */
export const CARE_PLAN_ACCENT: Record<string, string> = {
  PREFERENCES: '#7ee03a',
  'REACTION RISKS': '#f6f36a',
}
export const CARE_PLAN_DEFAULT_ACCENT = '#d3e1fb'

export type CarePlanRow = {
  section: string
  date: string
  description: string
  detail: string
  /** the indented comment lines under a row */
  comment: string
  link: string
}

const d = (v?: string) => (v ? v.split(' ')[0]!.replace(/\//g, '.') : '')
const visible = (r: MoisRecord) => r.str_sensitive !== 'Y'
const newest = (field: string) => (a: MoisRecord, b: MoisRecord) => String(b[field] ?? '').localeCompare(String(a[field] ?? ''))
const LINK = '↪'

function from(data: MoisChartExport | null, group: keyof MoisChartExport, field: string): MoisRecord[] {
  return [...((data?.[group] as MoisRecord[] | undefined) ?? [])].filter(visible).sort(newest(field))
}

export function carePlanRows(data: MoisChartExport | null, tags: CarePlanTag[] = []): CarePlanRow[] {
  const rows: CarePlanRow[] = []
  const push = (section: string, date: string, description: string, detail = '', comment = '') =>
    rows.push({ section, date, description, detail, comment, link: LINK })

  from(data, 'chart_preference', 'dtm_start').forEach((r) =>
    push('PREFERENCES', d(r.dtm_start), r.str_preference ?? r.str_description ?? '', r.str_instruction_code ?? '', r.str_instruction ?? ''))
  from(data, 'goal', 'dtm_start').forEach((r) =>
    push('GOALS', d(r.dtm_start), r.str_goal ?? '', r.str_phase ?? ''))
  from(data, 'action', 'dtm_start').forEach((r) =>
    push('ACTIONS', d(r.dtm_start), r.str_action ?? r.str_description ?? '', r.str_participants ?? ''))
  from(data, 'health_issue', 'dtm_start').forEach((r) => {
    const detail = [r.str_certainity && `Certainty: ${r.str_certainity}`, r.str_severity && `Severity: ${r.str_severity}`].filter(Boolean).join(' - ')
    push('HEALTH ISSUES', d(r.dtm_start), r.str_problem_name ?? '', detail, r.str_comment ?? r.str_note ?? '')
  })
  from(data, 'risk', 'dtm_start').forEach((r) =>
    push('HEALTH RISKS', d(r.dtm_start), r.str_description ?? '', ''))
  from(data, 'need', 'dtm_start').forEach((r) =>
    push('HEALTH NEEDS', d(r.dtm_start), r.str_description ?? r.str_need ?? '', r.str_participants ?? ''))
  from(data, 'allergy', 'dtm_start').forEach((r) =>
    push('REACTION RISKS', d(r.dtm_start), r.str_substance ?? '', r.str_reactions ?? r.str_reaction ?? ''))
  for (const t of tags) push(t.section || 'GENERAL', t.date, t.description, t.detail)

  const order = (s: string) => {
    const i = (CARE_PLAN_SECTIONS as readonly string[]).indexOf(s)
    return i < 0 ? CARE_PLAN_SECTIONS.length : i
  }
  return rows.map((r, i) => [r, i] as const)
    .sort(([a, i], [b, j]) => order(a.section) - order(b.section) || i - j)
    .map(([r]) => r)
}

/** The fixed-pitch text a snapshot freezes: 1673065 `ede59df4…`. */
export function carePlanSnapshotText(
  rows: CarePlanRow[],
  patient: { first: string; last: string; age: string; sex: string; bchn?: string; insurance?: string },
  date: string,
  letterhead: string[],
): string {
  const rule = '-'.repeat(79)
  const out = [
    `CARE PLAN AS OF ${date.replace(/\./g, '-')} FOR:`,
    `${patient.first} ${patient.last}`.toUpperCase(),
    `${patient.age.toUpperCase()}     ${patient.sex}`,
    `PHN: ${patient.bchn || patient.insurance || ''}`,
    '',
    rule,
    ...letterhead,
    rule,
  ]
  const sections = [...new Set(rows.map((r) => r.section))]
  for (const s of sections) {
    out.push(s)
    for (const r of rows.filter((x) => x.section === s)) {
      out.push(`${r.date.replace(/\./g, '-').padEnd(11)}${r.description.padEnd(41)}${r.detail}`.trimEnd())
      if (r.comment) out.push('           Comments:', `           ${r.comment}`)
    }
    out.push('', rule)
  }
  return out.join('\n')
}
