import { ageOf, fullName, type Patient } from './patients'

/* ============================================================================
   Patient Summary — the sections the summary DataWindow groups its rows into.

   MOIS draws one coloured band per section, captioned `SECTION  [n]`, and the
   two day boxes above the grid ("In the last 60 days", "Required in the next
   90 days") are folded into the captions of the sections they filter:
   `DOCUMENTS  IN LAST 60 DAY(S)  [1]`.

   PROVENANCE: the section list, its order and the five band colours are
   transcribed from `reference/patient-summary-loaded.png`; the band colours
   were sampled out of it (white at the top of each band down to the colour
   below). Row content is extrapolated in the MOIS idiom, except the
   DEMOGRAPHICS rows, which are read off the open chart.
   ========================================================================= */

/** Summary hyperlink captions differ from the navigator's stable node IDs. */
export const SUMMARY_LINK_NODES = {
  'Care Plan': 'careplan',
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
export const SUMMARY_DEFAULT_ACCENT = '#d3e1fb'

/** Band colours sampled from the capture. Everything else is the pale blue default. */
export const SUMMARY_ACCENT = {
  demographics: '#325a5a',
  preferences: '#83238a',
  risks: '#da3c33',
  service: '#ffff9f',
} as const

/* ---------------------------------------------------------------------------
   Transcribed summaries.

   These are read off a capture of the chart itself, section by section, so
   what the window prints is what MOIS printed. Only the expanded sections'
   rows are in a capture: a collapsed band shows a count and nothing else, so
   those sections carry `count` and no rows. Filling them in would be
   invention, and the emulator would then teach a chart that does not exist.
   ------------------------------------------------------------------------ */

/** Chart 3924 — `reference/patient-summary-3924.png`, the chart MOIS opens on. */
const SUMMARY_3924: SummarySection[] = [
  {
    id: 'demographics', title: 'DEMOGRAPHICS', accent: SUMMARY_ACCENT.demographics, open: true,
    rows: [{ description: 'HOME PHONE', detail: '250.765.3212' }],
  },
  { id: 'preferences', title: 'PREFERENCES', accent: SUMMARY_ACCENT.preferences, count: 6, rows: [] },
  { id: 'connections', title: 'CONNECTIONS', count: 6, rows: [] },
  { id: 'parties', title: 'ASSOCIATED PARTIES', count: 2, rows: [] },
  { id: 'risks', title: 'REACTION RISKS', accent: SUMMARY_ACCENT.risks, count: 2, rows: [] },
  { id: 'adverse', title: 'ADVERSE EVENTS', count: 1, rows: [] },
  { id: 'issues', title: 'HEALTH ISSUES', count: 1, rows: [] },
  { id: 'ltm', title: 'LONG TERM MEDS', count: 2, rows: [] },
  { id: 'documents', title: 'DOCUMENTS', window: 'last', count: 6, rows: [] },
  { id: 'paperforms', title: 'FORMS - PAPER', window: 'last', count: 1, rows: [] },
  { id: 'prescriptions', title: 'PRESCRIPTIONS', window: 'last', count: 1, rows: [] },
  { id: 'service', title: 'SERVICE EPISODES', accent: SUMMARY_ACCENT.service, count: 8, rows: [] },
  { id: 'notifications', title: 'NOTIFICATIONS', window: 'required', count: 1, rows: [] },
]

/** Chart 3598 — `reference/patient-summary-3598.png`, with CONNECTIONS open.
    MOIS prints these rows in the case they are stored in, not upper case. */
const SUMMARY_3598: SummarySection[] = [
  {
    id: 'demographics', title: 'DEMOGRAPHICS', accent: SUMMARY_ACCENT.demographics, open: true,
    rows: [
      { description: 'HOME PHONE', detail: '259.876.5678' },
      { description: 'CELL PHONE', detail: '778999666' },
      { description: 'ETHNICITY', detail: 'FIRST NATIONS' },
    ],
  },
  { id: 'preferences', title: 'PREFERENCES', accent: SUMMARY_ACCENT.preferences, count: 15, rows: [] },
  {
    id: 'connections', title: 'CONNECTIONS', open: true,
    rows: [
      { date: '2025.03.19', description: 'Aboriginal Organization', detail: 'Blueberry River First Nation', link: 'Demographics' },
      { date: '2015.01.01', description: 'Aboriginal Organization', detail: "Lheidli T'enneh Band", link: 'Demographics' },
      { date: '1991.01.01', description: 'First Nation Reserve', detail: 'Blueberry River First Nations', link: 'Demographics' },
      { date: '2024.09.17', description: 'First Nation Reserve', detail: "Lheidli T'enneh Band", link: 'Demographics' },
      { date: '2024.09.17', description: 'Pharmacy', detail: 'COSTCO PHARMACY # 158 - 2555 Range Road - Prince George', link: 'Demographics' },
      { date: '2025.02.11', description: 'Pharmacy', detail: 'PHARMASAVE # 076 - TELEPHARMACY - 2520 Harrison Ave. - Masset', link: 'Demographics' },
      { date: '2024.09.17', description: 'Primary Provider', detail: 'GIM CLINIC', link: 'Demographics' },
      { date: '2024.09.17', description: 'Primary Provider', detail: 'NO PRIMARY CARE PROVIDER', link: 'Demographics' },
      { date: '2025.03.19', description: 'Primary Provider', detail: 'NO PRIMARY CARE PROVIDER', link: 'Demographics' },
    ],
  },
  { id: 'alias', title: 'ALIAS IDS', count: 5, rows: [] },
  { id: 'parties', title: 'ASSOCIATED PARTIES', count: 1, rows: [] },
  { id: 'risks', title: 'REACTION RISKS', accent: SUMMARY_ACCENT.risks, count: 3, rows: [] },
  { id: 'issues', title: 'HEALTH ISSUES', count: 3, rows: [] },
  { id: 'ltm', title: 'LONG TERM MEDS', count: 2, rows: [] },
  { id: 'service', title: 'SERVICE EPISODES', accent: SUMMARY_ACCENT.service, count: 18, rows: [] },
]

/** Chart 3424 — `reference/patient-summary-loaded.png`, the capture the rest
    of this window was built from. Its counts are what a chart with years of
    history behind it looks like: 54 preferences, 44 connections, 16 risks. */
const SUMMARY_3424: SummarySection[] = [
  {
    id: 'demographics', title: 'DEMOGRAPHICS', accent: SUMMARY_ACCENT.demographics, open: true,
    rows: [
      /* the summary prints this chart's home phone dot-separated, where the
         Demographics window shows it as it was typed, with hyphens */
      { description: 'HOME PHONE', detail: '250.565.7890' },
      { description: 'ETHNICITY', detail: 'FIRST NATIONS' },
      { description: 'ETHNICITY', detail: 'FIRST NATIONS' },
      { description: 'ETHNICITY', detail: 'METIS' },
    ],
  },
  { id: 'preferences', title: 'PREFERENCES', accent: SUMMARY_ACCENT.preferences, count: 54, rows: [] },
  { id: 'connections', title: 'CONNECTIONS', count: 44, rows: [] },
  { id: 'alias', title: 'ALIAS IDS', count: 16, rows: [] },
  { id: 'parties', title: 'ASSOCIATED PARTIES', count: 8, rows: [] },
  { id: 'risks', title: 'REACTION RISKS', accent: SUMMARY_ACCENT.risks, count: 16, rows: [] },
  { id: 'adverse', title: 'ADVERSE EVENTS', count: 1, rows: [] },
  { id: 'issues', title: 'HEALTH ISSUES', count: 5, rows: [] },
  { id: 'ltm', title: 'LONG TERM MEDS', count: 12, rows: [] },
  { id: 'goals', title: 'GOALS', count: 4, rows: [] },
  { id: 'documents', title: 'DOCUMENTS', window: 'last', count: 1, rows: [] },
  { id: 'encforms', title: 'FORMS - ENCOUNTER', window: 'last', count: 2, rows: [] },
  { id: 'orders', title: 'ORDERS', window: 'last', count: 1, rows: [] },
  { id: 'service', title: 'SERVICE EPISODES', accent: SUMMARY_ACCENT.service, count: 14, rows: [] },
  { id: 'notifications', title: 'NOTIFICATIONS', window: 'required', count: 6, rows: [] },
]

const TRANSCRIBED: Record<string, SummarySection[]> = {
  '3424': SUMMARY_3424,
  '3598': SUMMARY_3598,
  '3924': SUMMARY_3924,
}

/**
 * The summary for a chart: its transcript when there is a capture of it, and
 * otherwise the section list below, which is the shape of chart 3424's window
 * with row content extrapolated in the MOIS idiom. Which sections a chart
 * carries is the chart's own — 3924 has no ALIAS IDS or GOALS band and 3598
 * has no day-window sections at all — so the extrapolated list is a stand-in,
 * not a rule.
 */
export function summarySections(p: Patient): SummarySection[] {
  const transcribed = TRANSCRIBED[p.chart]
  if (transcribed) return transcribed
  return extrapolatedSections(p)
}

function extrapolatedSections(p: Patient): SummarySection[] {
  const ethnicity: SummaryRow[] = [
    { description: 'ETHNICITY', detail: 'FIRST NATIONS' },
    { description: 'ETHNICITY', detail: 'FIRST NATIONS' },
    { description: 'ETHNICITY', detail: 'METIS' },
  ]
  return [
    {
      id: 'demographics', title: 'DEMOGRAPHICS', accent: SUMMARY_ACCENT.demographics, open: true,
      rows: [
        ...(p.home ? [{ description: 'HOME PHONE', detail: p.home }] : []),
        ...ethnicity,
      ],
    },
    {
      id: 'preferences', title: 'PREFERENCES', accent: SUMMARY_ACCENT.preferences,
      rows: [
        { date: '2024.11.21', description: 'ADVANCE CARE PLAN', detail: 'DNR — NO CPR, COMFORT MEASURES', link: 'Care Plan' },
        { date: '2024.08.22', description: 'SUBSTITUTE DECISION MAKER', detail: 'SEE ASSOCIATED PARTIES', link: 'Care Plan' },
        { date: '2025.01.28', description: 'CONTACT BY EMAIL', detail: 'NOT CONSENTED', link: 'Demographics' },
        { date: '2025.06.25', description: 'INTERPRETER REQUIRED', detail: 'NOT REQUIRED', link: 'Demographics' },
        { date: '2024.04.12', description: 'PREFERRED PHARMACY', detail: 'ALL PRESCRIPTIONS FAXED', link: 'Prescriptions' },
      ],
    },
    {
      id: 'connections', title: 'CONNECTIONS',
      rows: [
        { date: '2025.02.27', description: 'MOST RESPONSIBLE PROVIDER', detail: p.provider ?? 'ESIEVOADJE, EVONEME', link: 'Demographics' },
        { date: '2025.02.27', description: 'SERVICE LOCATION', detail: 'ACROPOLIS MANOR', link: 'Demographics' },
      ],
    },
    {
      id: 'alias', title: 'ALIAS IDS',
      rows: [
        ...(p.alias ? [{ description: 'ALIAS', detail: p.alias, link: 'Demographics' as const }] : []),
        ...(p.insurance ? [{ description: 'INSURANCE NO.', detail: p.insurance, link: 'Demographics' as const }] : []),
        ...(p.bchn ? [{ description: 'BC HEALTH NO.', detail: p.bchn, link: 'Demographics' as const }] : []),
      ],
    },
    {
      id: 'parties', title: 'ASSOCIATED PARTIES',
      rows: [
        { description: 'EMERGENCY CONTACT', detail: 'AADAMS, MARION — DAUGHTER', link: 'Demographics' },
        { description: 'PHARMACY', detail: 'PRINCE RUPERT PHARMASAVE', link: 'Demographics' },
      ],
    },
    {
      id: 'risks', title: 'REACTION RISKS', accent: SUMMARY_ACCENT.risks,
      rows: [
        { date: '2026.07.02', description: 'NO KNOWN ALLERGIES', detail: 'REVIEWED — NO KNOWN ALLERGIES', link: 'Reaction Risks' },
      ],
    },
    {
      id: 'adverse', title: 'ADVERSE EVENTS',
      rows: [{ date: '2025.03.14', description: 'RASH', detail: 'AMOXICILLIN — MILD, SELF-LIMITING', link: 'Events' }],
    },
    {
      id: 'issues', title: 'HEALTH ISSUES',
      rows: [
        { date: '2026.08.12', description: 'ACROPHOBIA', detail: 'ACTIVE', link: 'Health Issues' },
        { date: '2025.11.04', description: 'HYPERTENSION - BENIGN', detail: 'ACTIVE', link: 'Health Issues' },
      ],
    },
    {
      id: 'ltm', title: 'LONG TERM MEDS',
      rows: [
        { date: '2026.05.19', description: 'RAMIPRIL 5 MG CAPSULE', detail: '1 CAP PO DAILY', link: 'Long Term Meds' },
        { date: '2026.05.19', description: 'ASA 81 MG TABLET', detail: '1 TAB PO DAILY', link: 'Long Term Meds' },
      ],
    },
    {
      id: 'goals', title: 'GOALS',
      rows: [{ date: '2026.08.12', description: 'DEV AUDIT GOAL', detail: 'INITIATION', link: 'Goals' }],
    },
    {
      id: 'documents', title: 'DOCUMENTS', window: 'last',
      rows: [{ date: '2026.08.11', description: 'LAB REPORT', detail: 'CBC + DIFFERENTIAL — FILED', link: 'Documents' }],
    },
    {
      id: 'encforms', title: 'FORMS - ENCOUNTER', window: 'last',
      rows: [
        { date: '2026.08.10', description: 'PRENATAL RECORD PART 1', detail: 'COMPLETED', link: 'Encounter Forms' },
        { date: '2026.08.10', description: 'HOME CARE ADMISSION CONSENT', detail: 'COMPLETED', link: 'Encounter Forms' },
      ],
    },
    {
      id: 'orders', title: 'ORDERS', window: 'last',
      rows: [{ date: '2026.07.10', description: 'CONSULTATION', detail: 'IP — GHATAVI, KAYHAN', link: 'Orders' }],
    },
    {
      id: 'service', title: 'SERVICE EPISODES', accent: SUMMARY_ACCENT.service,
      rows: [
        { date: '2026.08.10', description: 'PRENATAL CARE', detail: 'OPEN — TECHNICAL SUPPORT', link: 'Encounters' },
        { date: '2026.05.02', description: 'LONG TERM CARE', detail: 'OPEN — DAW HEALTH UNIT', link: 'Encounters' },
      ],
    },
    {
      id: 'notifications', title: 'NOTIFICATIONS', window: 'required',
      rows: [
        { date: '2026.10.01', description: 'INFLUENZA IMMUNIZATION', detail: 'DUE', link: 'Notifications' },
        { date: '2026.11.15', description: 'BP RECHECK', detail: 'DUE', link: 'Notifications' },
      ],
    },
  ]
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
