import { createSignal } from './sessionStore'

/* ============================================================================
   Patient Chart ▸ Determinants of Health — what the four tabs show and the
   per-chart session edits the window and its Update panel share.

   PROVENANCE: art. 2593946 "Determinants of Health" (v02.30.22 captures):
     · Employment `1b786cef…`: status rows EMPLOYMENT STATUS and EMPLOYMENT
       HOURS; Employment History (Start | End | Occupation | … | Hrs/Wk |
       Company | Phone (M) | 📎); "Total Hrs/Wk for all Current Employment
       Records:"; Employer Information and General Notes.
     · Education `7ee611bf…`: CURRENT EDUCATIONAL ENGAGEMENT and HIGHEST
       LEVEL OF EDUCATION; Education History (Start | Stop | Educational
       Institution | … | Level of Education | … | Completed | 📎) and its
       detail (Educational Institution, Level of Education, Institution
       Category, Completed Date, Enrollment Period, Field of Study, Enrolled
       As, Comment). The capture's CORRELIEU SECONDARY SCHOOL / GRADE 11-12
       are two of the pick-list entries below.
     · Housing `0b2e3725…`: CURRENT LIVING ARRANGEMENT, HOUSING TENURE and
       PRECARIOUS LIVING CONDITIONS; Contact Information as per Demographics
       (read-only); Who Lives with Me (Start | Stop | Occupant Relationship |
       Quantity | Note | 📎) — "Lives alone" is the capture's.
     · Socioeconomic `d7f58b3c…`: HAVE YOU STRUGGLED MAKING ENDS MEET AT EOM?
       and SUSPECT SIGNIFICANT SOCIOECONOMIC CHALLENGES, answered YES (the
       article: "select Yes or No from the Value Sets list"). Their codes,
       76916 and 76917, are on 302837 `46bf7ec5…`'s Measures list.
   The panels behind Update are the EMPLOYMENT / EDUCATION / HOUSING STATUS
   PANELs of Measure Template / Panel Selection (data/measures.ts). Chart
   87288's export carries a HOUSING STATUS panel (codes 45973, 84683, 84684,
   values Family / OWN HOME / NO), which fixes those three codes.

    2026-09-29 TRAINING captures (the user's, eight screens, 2x): chart 3598
   on Education / Housing / Socioeconomic and chart 3924 on all four tabs,
   including Who Lives with Me's Occupant Relationship dropped open — the
   only dropped list captured, so OCCUPANT_RELATIONSHIPS is its real value
   set. What those two charts hold is in DETERMINANT_CHARTS below. The live
   spellings they show (Partner, RENTAL, UNKNOWN/NOT ASKED, All Grades,
   GRADE 12 OR EQUIVALENT, College of New Caledonia) are folded into the
   lists here.

   INFERRED: the other value sets (no capture of their dropped lists or of
   the Update panel exists), the Employment and Education observations' codes (none
   known — they are filed without one), the Socioeconomic panel's name, and
   the pick lists behind the "…" buttons. Values of the export are kept as
   the export spells them.
   ========================================================================= */

export type DeterminantTab = 'Employment' | 'Education' | 'Housing' | 'Socioeconomic'
export const DETERMINANT_TABS: DeterminantTab[] = ['Employment', 'Education', 'Housing', 'Socioeconomic']

export type DeterminantObservation = { code: string; name: string; options: string[] }

export const DETERMINANT_PANELS: Record<DeterminantTab, { panel: string; band: string; observations: DeterminantObservation[] }> = {
  Employment: {
    panel: 'EMPLOYMENT STATUS',
    band: 'Employment Status',
    observations: [
      { code: '', name: 'EMPLOYMENT STATUS', options: ['EMPLOYED', 'SELF-EMPLOYED', 'UNEMPLOYED', 'RETIRED', 'STUDENT', 'UNABLE TO WORK', 'HOMEMAKER'] },
      { code: '', name: 'EMPLOYMENT HOURS', options: ['FULL TIME', 'PART TIME', 'CASUAL', 'SEASONAL'] },
    ],
  },
  Education: {
    panel: 'EDUCATION STATUS',
    band: 'Education Status',
    observations: [
      { code: '', name: 'CURRENT EDUCATIONAL ENGAGEMENT', options: ['FULL TIME STUDENT', 'PART TIME STUDENT', 'NOT CURRENTLY IN SCHOOL', 'UNKNOWN/NOT ASKED'] },
      { code: '', name: 'HIGHEST LEVEL OF EDUCATION', options: ['LESS THAN HIGH SCHOOL', 'HIGH SCHOOL DIPLOMA OR EQUIVALENT', 'POST SECONDARY CERTIFICATE', 'DIPLOMA', "BACHELOR'S DEGREE", 'GRADUATE DEGREE', 'UNKNOWN/NOT ASKED'] },
    ],
  },
  Housing: {
    panel: 'HOUSING STATUS',
    band: 'Housing Status',
    observations: [
      { code: '45973', name: 'CURRENT LIVING ARRANGEMENT', options: ['Alone', 'Family', 'Partner', 'Friends/Roommates', 'Group Living', 'Other'] },
      { code: '84683', name: 'HOUSING TENURE', options: ['OWN HOME', 'RENTAL', 'SUBSIDIZED HOUSING', 'SHELTER', 'NO FIXED ADDRESS'] },
      { code: '84684', name: 'PRECARIOUS LIVING CONDITIONS', options: ['YES', 'NO'] },
    ],
  },
  Socioeconomic: {
    panel: 'SOCIOECONOMIC STATUS',
    band: 'Socioeconomic Status',
    observations: [
      { code: '76916', name: 'HAVE YOU STRUGGLED MAKING ENDS MEET AT EOM?', options: ['YES', 'NO'] },
      { code: '76917', name: 'SUSPECT SIGNIFICANT SOCIOECONOMIC CHALLENGES', options: ['YES', 'NO'] },
    ],
  },
}

/** Chart 3598's capture cuts this level off at "POST SECONDARY CERTIFICATE,
    DIPLO…"; the rest of the wording is INFERRED. */
const POST_SECONDARY = 'POST SECONDARY CERTIFICATE, DIPLOMA OR DEGREE'

/** the pick lists behind the history grids' "…" buttons */
export const DETERMINANT_LISTS: Record<string, { title: string; values: string[] }> = {
  occupation: {
    title: 'Occupation',
    values: [
      'CARPENTERS', 'COOKS', 'ELEMENTARY SCHOOL TEACHERS', 'FOOD PRESERVER', 'INSURANCE REPRESENTATIVES',
      'LABOURERS IN FOOD PROCESSING', 'REGISTERED NURSES', 'RETAIL SALESPERSONS',
      'SHOP, STALL AND MARKET SALESPERSONS AND DEMONSTRATORS', 'TRANSPORT TRUCK DRIVERS',
    ],
  },
  institution: {
    title: 'Educational Institution',
    values: ['AATSE DAVIE SCHOOL', 'CENTRAL UNIVERSITY', 'College of New Caledonia', 'CORRELIEU SECONDARY SCHOOL', 'NORTHERN COMMUNITY COLLEGE', 'RIVERSIDE ELEMENTARY SCHOOL', 'VALLEY TRADES INSTITUTE'],
  },
  level: {
    title: 'Level of Education',
    values: ['GRADE 1-8', 'GRADE 9-10', 'GRADE 11-12', 'GRADE 12 OR EQUIVALENT', 'HIGH SCHOOL DIPLOMA', 'POST SECONDARY CERTIFICATE', POST_SECONDARY, 'DIPLOMA', "BACHELOR'S DEGREE", "MASTER'S DEGREE", 'DOCTORATE'],
  },
  field: {
    title: 'Field of Study',
    values: ['ARTS', 'BUSINESS', 'EDUCATION', 'ENGINEERING', 'HEALTH SCIENCES', 'SCIENCE', 'TRADES'],
  },
}

export const INSTITUTION_CATEGORIES = ['', 'All Grades', 'Elementary School', 'Secondary School', 'College', 'University', 'Trade School']
export const ENROLLED_AS = ['', 'Full Time', 'Part Time']
/** Administration > Codeset Management > Value Sets > Occupant Relationship —
    the Value | Description list chart 3924's capture drops open, verbatim
    ("non- related" is the product's own spacing) */
export const OCCUPANT_RELATIONSHIPS: { value: string; description: string }[] = [
  'Lives alone', 'Lives with relative(s)', 'Lives with non- related person', 'Unknown/Not Asked',
].map((value) => ({ value, description: value }))

/* --- what the captured charts hold ---------------------------------------- */

export type ChartStatusValue = { name: string; value: string; collected: string; ranges?: string }
export type DeterminantChart = {
  /** the status panels' latest values, collected as YYYY-MM-DD */
  observations: ChartStatusValue[]
  education?: HistoryRow[]
  occupants?: HistoryRow[]
}

const occupant = (key: string, start: string, stop: string, relationship: string, quantity: string, note = ''): HistoryRow =>
  ({ key, start, stop, relationship, quantity, note, clip: '-' })

/** Charts 3598 and 3924 as the 2026-09-29 TRAINING captures show them.
    Chart 3924's WEBFORMS TEST rows are what Webforms' own write tests left on
    that chart; they are kept because the chart is transcribed, not tidied. */
export const DETERMINANT_CHARTS: Record<string, DeterminantChart> = {
  '3598': {
    observations: [
      { name: 'CURRENT EDUCATIONAL ENGAGEMENT', value: 'UNKNOWN/NOT ASKED', collected: '2024-12-06' },
      { name: 'HIGHEST LEVEL OF EDUCATION', value: 'UNKNOWN/NOT ASKED', collected: '2024-12-06' },
      { name: 'CURRENT LIVING ARRANGEMENT', value: 'Partner', collected: '2026-07-08', ranges: '-' },
      { name: 'HOUSING TENURE', value: 'RENTAL', collected: '2026-07-08' },
      { name: 'PRECARIOUS LIVING CONDITIONS', value: 'NO', collected: '2026-07-08' },
      { name: 'HAVE YOU STRUGGLED MAKING ENDS MEET AT EOM?', value: 'YES', collected: '2025-04-04' },
      { name: 'SUSPECT SIGNIFICANT SOCIOECONOMIC CHALLENGES', value: 'YES', collected: '2025-04-04' },
    ],
    education: [
      {
        key: 'edu-3598-1', start: '2024.12.06', stop: '', institution: 'AATSE DAVIE SCHOOL', level: '', completed: '', category: 'All Grades', clip: '-',
        created: '2024.12.06  11:42   ANATOLE, RACHEL', modified: '2025.07.25  09:51   SHEWCHUK, LEAH',
      },
      { key: 'edu-3598-2', start: '2000.06.13', stop: '2024.10.28', institution: 'College of New Caledonia', level: POST_SECONDARY, completed: '2024.10.28', clip: '-' },
      { key: 'edu-3598-3', start: '2020.01.28', stop: '2024.10.16', institution: 'College of New Caledonia', level: 'GRADE 12 OR EQUIVALENT', completed: '2024.10.16', clip: '-' },
    ],
    occupants: [
      occupant('occ-3598-1', '2026.07.08', '', 'Lives with non- related person', '1'),
      occupant('occ-3598-2', '2025.03.19', '', 'Lives with non- related person', '1', 'ONE FEMALE OCCUPANT'),
      occupant('occ-3598-3', '2024.10.01', '', 'Lives with relative(s)', '1', 'BROTHER'),
      occupant('occ-3598-4', '2024.09.03', '', 'Lives with relative(s)', '1', 'COUSIN, SAM'),
      occupant('occ-3598-5', '2024.12.06', '2025.03.19', 'Unknown/Not Asked', ''),
    ],
  },
  '3924': {
    observations: [
      { name: 'CURRENT LIVING ARRANGEMENT', value: 'Family', collected: '2025-09-17', ranges: '-' },
      { name: 'HOUSING TENURE', value: 'OWN HOME', collected: '2025-09-17' },
      { name: 'PRECARIOUS LIVING CONDITIONS', value: 'NO', collected: '2025-09-17' },
    ],
    occupants: [
      occupant('occ-3924-1', '2026.09.10', '', '', '1', 'WEBFORMS TEST mtvx0yd5 1ugx'),
      occupant('occ-3924-2', '2026.09.08', '', '', '1', 'WEBFORMS TEST 2026-09-08T21:00:07.907Z y9ey3e'),
      occupant('occ-3924-3', '2025.09.17', '', 'Lives with relative(s)', '1'),
    ],
  },
}

/** MOIS lists the current rows first, newest start on top, then the ended
    ones by their stop date — chart 3598's Education and Who Lives with Me
    both read that way (its 2024.12.06 – 2025.03.19 occupant sits last). */
export function historyOrder(rows: HistoryRow[]): HistoryRow[] {
  const ended = (r: HistoryRow) => !!(r.stop || r.end)
  return [...rows].sort((a, b) => {
    if (ended(a) !== ended(b)) return ended(a) ? 1 : -1
    const ka = ended(a) ? (a.stop || a.end)! : a.start ?? ''
    const kb = ended(b) ? (b.stop || b.end)! : b.start ?? ''
    return kb.localeCompare(ka)
  })
}

/* --- session edits -------------------------------------------------------- */

export type HistoryList = 'employment' | 'education' | 'occupants'
export type HistoryRow = Record<string, string> & { key: string }
export type RecordedObservation = { code: string; name: string; value: string; collected: string; by: string }

type DetState = {
  /** the lists once edited (undefined = still the chart's own) */
  rows: Partial<Record<HistoryList, HistoryRow[]>>
  /** what Save last committed, which Undo returns to */
  saved: Partial<Record<HistoryList, HistoryRow[]>>
  /** Update-panel entries, newest first */
  observations: RecordedObservation[]
  seq: number
}

const state: Record<string, DetState> = {}
const changes = createSignal(() => { for (const key of Object.keys(state)) delete state[key] })
const emit = changes.emit
const EMPTY: DetState = { rows: {}, saved: {}, observations: [], seq: 0 }
const of = (chart: string): DetState => (state[chart] ??= { rows: {}, saved: {}, observations: [], seq: 0 })

export function useDeterminants(chart: string): DetState {
  changes.use()
  return state[chart] ?? EMPTY
}

export function setHistory(chart: string, list: HistoryList, rows: HistoryRow[]) {
  of(chart).rows = { ...of(chart).rows, [list]: rows }
  emit()
}

export function nextHistoryKey(chart: string): string {
  const s = of(chart)
  s.seq += 1
  return `new-${s.seq}`
}

export function saveHistory(chart: string) {
  of(chart).saved = { ...of(chart).rows }
  emit()
}

export function undoHistory(chart: string) {
  of(chart).rows = { ...of(chart).saved }
  emit()
}

/** a new frame starts on the chart's own lists (the session reset runs this
    as the frame mounts — data/sessionStore.ts; before, nothing reset this
    store, so one lesson's edits showed in the next) */
export const resetDeterminants = () => changes.reset()

export function recordObservations(chart: string, added: RecordedObservation[]) {
  of(chart).observations = [...added, ...of(chart).observations]
  emit()
}
