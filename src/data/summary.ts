import type { MoisChartExport } from './charts'
import { ageOf, fullName, type Patient } from './patients'

/* ============================================================================
   Patient Summary — the sections the summary DataWindow groups its rows into.

   MOIS draws one coloured band per section, captioned `SECTION  [n]`, and the
   two day boxes above the grid ("In the last 60 days", "Required in the next
   90 days") are folded into the captions of the sections they filter:
   `DOCUMENTS  IN LAST 60 DAY(S)  [1]`.

   PROVENANCE: the section layout follows `reference/patient-summary-loaded.png`.
   Colours are sampled in sRGB from the supplied 2026-09-22 07:58 captures:
   white at each band's top down to its accent. Rows come from the open chart.
   ========================================================================= */

/** Summary hyperlink captions differ from the navigator's stable node IDs. */
export const SUMMARY_LINK_NODES = {
  'Care Plan': 'careplan',
  Preferences: 'prefs',
  Demographics: 'demographic',
  Prescriptions: 'rx',
  'Reaction Risks': 'reaction',
  Events: 'events',
  'Health Issues': 'issues',
  'Long Term Meds': 'ltm',
  Goals: 'goals',
  Documents: 'documents',
  'Encounter Forms': 'encforms',
  Encounters: 'encounters',
  Orders: 'orders',
  Notifications: 'notifications',
} as const

export type SummaryRow = {
  /** Stable source ID used when a summary hyperlink opens a specific record. */
  recordId?: string
  instructionComment?: string
  date?: string
  description: string
  detail?: string
  /** Accessible caption of the MOIS glyph, which opens the source section. */
  link?: keyof typeof SUMMARY_LINK_NODES
}

export type SummarySection = {
  id: string
  title: string
  /** the colour the band's white-to-colour gradient ends on; unset = pale blue */
  accent?: string
  /** sections whose caption carries a day window */
  window?: 'last' | 'required'
  open?: boolean
  /**
   * What the band's caption prints between the brackets. A section that is
   * collapsed in a capture shows its count but not the rows behind it, so the
   * count is transcribed and `rows` stays empty rather than being invented.
   * Unset = the caption counts the rows, which is the same number whenever
   * the rows are all there.
   */
  count?: number
  rows: SummaryRow[]
}

/** The pale blue every band without a colour of its own ends on. */
export const SUMMARY_DEFAULT_ACCENT = '#cddffc'

/** Band colours sampled from the capture. Everything else is the pale blue default. */
export const SUMMARY_ACCENT = {
  demographics: '#225958',
  preferences: '#8f158e',
  risks: '#ec1918',
  service: '#fffe90',
} as const

/** Selected row sampled separately from the white/grey alternating rows. */
export const SUMMARY_SELECTED_ROW = '#f2c6b8'

/** Every summary row comes from the active chart; absent sections stay absent. */
export function summarySections(p: Patient, data: MoisChartExport | null = null, lastDays = '60', now = new Date()): SummarySection[] {
  const sections: SummarySection[] = []
  const add = (id: string, title: string, rows: SummaryRow[], extra: Partial<SummarySection> = {}) => {
    if (rows.length) sections.push({ id, title, rows, ...extra })
  }
  add('demographics', 'DEMOGRAPHICS', [
    ...(p.home ? [{ description: 'HOME PHONE', detail: p.home }] : []),
    ...Object.values(p.ethnicity ?? {}).flatMap((r) => r?.race ? [{ description: 'ETHNICITY', detail: r.race }] : []),
  ], { open: true, accent: SUMMARY_ACCENT.demographics })
  if (!data) return sections
  const date = (v?: string) => v?.split(' ')[0]?.replace(/\//g, '.') ?? ''
  const recent = (v?: string) => {
    if (!v) return false
    const time = new Date(v.split(' ')[0]!.replace(/\//g, '-') + 'T00:00:00').getTime()
    const days = Number(lastDays)
    return Number.isFinite(days) && days >= 0 && time <= now.getTime() && time >= now.getTime() - days * 86400000
  }
  add('preferences', 'PREFERENCES', data.chart_preference.map(r => ({ date: date(r.dtm_start), description: r.str_preference ?? '', detail: r.str_instruction_code ?? '', instructionComment: r.str_instruction, link: 'Preferences', recordId: r.id_chart_preference })), { accent: SUMMARY_ACCENT.preferences })
  add('connections', 'CONNECTIONS', data.connection.map(r => ({ date: date(r.dtm_start), description: r.str_connection_type ?? '', detail: r.str_provider ?? '', link: 'Demographics' })))
  add('risks', 'REACTION RISKS', data.allergy.map(r => ({ date: date(r.dtm_start), description: r.str_substance ?? '', detail: data.reaction_risk.filter(x => x.id_allergy === r.id_allergy).map(x => x.str_reaction).filter(Boolean).join(', '), link: 'Reaction Risks' })), { accent: SUMMARY_ACCENT.risks })
  add('adverse', 'ADVERSE EVENTS', data.adverse_event.map(r => ({ date: date(r.dtm_administered), description: r.str_report_type ?? '', detail: data.reaction_event.filter(x => x.id_adverse_event === r.id_adverse_event).map(x => x.str_reaction).filter(Boolean).join(', '), link: 'Events' })))
  add('issues', 'HEALTH ISSUES', data.health_issue.map(r => ({ date: date(r.dtm_start), description: r.str_problem_name ?? '', link: 'Health Issues' })))
  add('goals', 'GOALS', data.goal.map(r => ({ date: date(r.dtm_start), description: r.str_goal ?? '', detail: r.str_phase ?? '', link: 'Goals' })))
  add('prescriptions', 'PRESCRIPTIONS', data.prescription.filter(r => recent(r.dtm_order)).map(r => ({ date: date(r.dtm_order), description: r.str_medication ?? '', detail: r.str_dose_freq ?? '', link: 'Prescriptions' })), { window: 'last' })
  add('documents', 'DOCUMENTS', data.document.filter(r => recent(r.dtm_date)).map(r => ({ date: date(r.dtm_date), description: r.str_doc_type ?? '', detail: r.str_note ?? '', link: 'Documents' })), { window: 'last' })
  add('encforms', 'FORMS - ENCOUNTER', data.form_header.filter(r => recent(r.dtm_created)).map(r => ({ date: date(r.dtm_created), description: r.str_form_window ?? '', link: 'Encounter Forms' })), { window: 'last' })
  add('orders', 'ORDERS', data.order.filter(r => recent(r.dtm_ord_date)).map(r => ({ date: date(r.dtm_ord_date), description: r.str_order_type ?? '', detail: r.str_description ?? r.str_code_term ?? '', link: 'Orders' })), { window: 'last' })
  add('service', 'SERVICE EPISODES', data.chart_service.map(r => ({ date: date(r.dtm_start), description: r.str_service_code_term ?? '', detail: r.str_service_mrp ?? '', link: 'Demographics' })), { accent: SUMMARY_ACCENT.service })
  return sections
}

/** `DOCUMENTS  IN LAST 60 DAY(S)` — the caption MOIS builds from the day boxes. */
export function sectionCaption(section: SummarySection, lastDays: string, requiredDays: string): string {
  if (section.window === 'last') return `${section.title}  IN LAST ${lastDays} DAY(S)`
  if (section.window === 'required') return `${section.title}  REQUIRED IN ${requiredDays} DAY(S)`
  return section.title
}

/** `PATCH AADAMS 21 MTH OLD F` — the identity MOIS puts on the view header. */
export function headerIdentity(p: Patient): string {
  return [`${p.first} ${p.last}`, ageOf(p.dob), p.gender].filter(Boolean).join(' ')
}

export { fullName }
