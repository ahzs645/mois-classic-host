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

export type SummaryRow = {
  date?: string
  description: string
  detail?: string
  /** the blue text in the Hyperlink column, which jumps to the source record */
  link?: string
}

export type SummarySection = {
  id: string
  title: string
  /** the colour the band's white-to-colour gradient ends on; unset = pale blue */
  accent?: string
  /** sections whose caption carries a day window */
  window?: 'last' | 'required'
  open?: boolean
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

export function summarySections(p: Patient): SummarySection[] {
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
        ...(p.alias ? [{ description: 'ALIAS', detail: p.alias, link: 'Demographics' }] : []),
        ...(p.insurance ? [{ description: 'INSURANCE NO.', detail: p.insurance, link: 'Demographics' }] : []),
        ...(p.bchn ? [{ description: 'BC HEALTH NO.', detail: p.bchn, link: 'Demographics' }] : []),
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
