import { useSyncExternalStore } from 'react'

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

   INFERRED: the value sets (no capture of a dropped list or of the Update
   panel exists), the Employment and Education observations' codes (none
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
      { code: '', name: 'CURRENT EDUCATIONAL ENGAGEMENT', options: ['FULL TIME STUDENT', 'PART TIME STUDENT', 'NOT CURRENTLY IN SCHOOL'] },
      { code: '', name: 'HIGHEST LEVEL OF EDUCATION', options: ['LESS THAN HIGH SCHOOL', 'HIGH SCHOOL DIPLOMA OR EQUIVALENT', 'POST SECONDARY CERTIFICATE', 'DIPLOMA', "BACHELOR'S DEGREE", 'GRADUATE DEGREE'] },
    ],
  },
  Housing: {
    panel: 'HOUSING STATUS',
    band: 'Housing Status',
    observations: [
      { code: '45973', name: 'CURRENT LIVING ARRANGEMENT', options: ['Alone', 'Family', 'Spouse/Partner', 'Friends/Roommates', 'Group Living', 'Other'] },
      { code: '84683', name: 'HOUSING TENURE', options: ['OWN HOME', 'RENT', 'SUBSIDIZED HOUSING', 'SHELTER', 'NO FIXED ADDRESS'] },
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
    values: ['CENTRAL UNIVERSITY', 'CORRELIEU SECONDARY SCHOOL', 'NORTHERN COMMUNITY COLLEGE', 'RIVERSIDE ELEMENTARY SCHOOL', 'VALLEY TRADES INSTITUTE'],
  },
  level: {
    title: 'Level of Education',
    values: ['GRADE 1-8', 'GRADE 9-10', 'GRADE 11-12', 'HIGH SCHOOL DIPLOMA', 'POST SECONDARY CERTIFICATE', 'DIPLOMA', "BACHELOR'S DEGREE", "MASTER'S DEGREE", 'DOCTORATE'],
  },
  field: {
    title: 'Field of Study',
    values: ['ARTS', 'BUSINESS', 'EDUCATION', 'ENGINEERING', 'HEALTH SCIENCES', 'SCIENCE', 'TRADES'],
  },
}

export const INSTITUTION_CATEGORIES = ['', 'Elementary School', 'Secondary School', 'College', 'University', 'Trade School']
export const ENROLLED_AS = ['', 'Full Time', 'Part Time']
/** Administration > Codeset Management > Value Sets > Occupant Relationship */
export const OCCUPANT_RELATIONSHIPS = ['', 'Lives alone', 'Lives with relative(s)', 'Spouse/Partner', 'Child', 'Parent', 'Roommate', 'Other']

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
const listeners = new Set<() => void>()
let version = 0
const emit = () => { version += 1; listeners.forEach((l) => l()) }
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }
const EMPTY: DetState = { rows: {}, saved: {}, observations: [], seq: 0 }
const of = (chart: string): DetState => (state[chart] ??= { rows: {}, saved: {}, observations: [], seq: 0 })

export function useDeterminants(chart: string): DetState {
  useSyncExternalStore(subscribe, () => version, () => version)
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

export function recordObservations(chart: string, added: RecordedObservation[]) {
  of(chart).observations = [...added, ...of(chart).observations]
  emit()
}
