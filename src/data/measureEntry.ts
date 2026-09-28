import { useSyncExternalStore } from 'react'

/* ============================================================================
   Measures ▸ New Record — the lab-code list the Code column's "…" opens, the
   measures that have a dynamic form behind their Value, and the per-chart
   session state the entry windows share.

   PROVENANCE
   - art. 302837 "Dynamic Measures Calculators": New Record, a code or quick
     code in Code (`46bf7ec5…`), then the "…" right of Value opens the
     measure's form; Save Form stamps Last Modified (`bd504bb6…`), Close Form,
     Save (F2), and the row's marker reads `.*.` (`2f044971…`). Its "Measurement
     Quick Code Examples" table (`4bdc30e8…`) is the quick-code list below,
     code for code.
   - art. 302837 "Patient Questionnaires (PHQ9)": the Code "…" list's two
     PHQ-9 rows (`90db334a…`: Code | Class | Quick Code | Test Name — 43894
     SURVEY.PHQ PHQ9 PHQ-9 TOTAL SCORE, 43882 PANEL.SURVEY.PH… PHQ9P PHQ-9
     QUICK DEPRESSION ASSESS…), and the other PHQ-9 codes on its folder
     captures (`563168db…`: 43895 PHQ-9 INTERPRETATION, 43890 PHQ-9.PROBLEM
     PANEL; `dd25de05…`: 43882 PHQ-9 QUICK DEPRESSION ASSESSMENT PAN…).
   - classes and reference ranges: the chart export's own measure rows
     (chart 87288) where it carries the code.
   INFERRED: the classes of codes the export does not carry are left blank;
   the encounter-window measures come from data/measures.ts.

   The state is a tiny external store (the data/chartSession.ts pattern) so
   the folder, the Lab Code Selection window, the dynamic forms and the New
   Message window agree without wiring through the frame. Rows a learner
   files still go to the frame's session copy (host/encounterArea
   `measureRows`); this store holds only what those rows cannot: the unsaved
   New Record row, saved form answers, and which rows went to the patient.
   ========================================================================= */

export type LabCode = {
  code: string
  klass: string
  quick: string
  test: string
  units?: string
  lower?: string
  upper?: string
}

/** the Code column's "…" list, in code order */
export const LAB_CODES: LabCode[] = [
  { code: '951', klass: 'PHYSI', quick: 'BMI', test: 'BODY MASS INDEX', lower: '18.5', upper: '25' },
  { code: '1835', klass: '', quick: 'UBLD', test: 'URINE BLOOD', units: '/uL' },
  { code: '1900', klass: '', quick: '', test: 'URINE PROTEIN', units: 'g/L' },
  { code: '1948', klass: 'BDYHGT.ATOM', quick: '', test: 'HEIGHT', units: 'Cms', lower: '20', upper: '210' },
  { code: '1950', klass: 'PHYSI', quick: 'BP', test: 'BLOOD PRESSURE (SYSTOLIC/DIASTOLIC)', units: 'mm Hg' },
  { code: '1984', klass: '', quick: '', test: 'WAIST CIRCUMFERENCE', units: 'cm' },
  { code: '2010', klass: 'BDYTMP.ATOM', quick: '', test: 'TEMPERATURE', units: 'Deg C', lower: '36', upper: '38' },
  { code: '2011', klass: '', quick: '', test: 'PULSE RATE / MIN', units: '/min' },
  { code: '22732', klass: 'BDYWGT.ATOM', quick: '', test: 'WEIGHT', units: 'kg', lower: '0', upper: '150' },
  { code: '34494', klass: '', quick: 'PACK/DAY', test: 'CIGARETTES SMOKED.CURRENT (PACK/DAY)' },
  { code: '34683', klass: '', quick: '', test: 'OXYGEN SATURATION' },
  { code: '34738', klass: '', quick: '', test: 'HEART RATE' },
  { code: '35158', klass: '', quick: '', test: 'RESPIRATORY RATE' },
  { code: '39951', klass: '', quick: '', test: 'PEAK EXPIRATORY FLOW' },
  { code: '39952', klass: '', quick: 'CAGE', test: 'CAGE ALCOHOL SCREENING' },
  { code: '40001', klass: '', quick: 'EPND', test: 'EDINBURGH POSTNATAL DEPRESSION SCORE' },
  { code: '40032', klass: '', quick: 'GAD-7', test: 'GENERALIZED ANXIETY DISORDER 7' },
  { code: '43882', klass: 'PANEL.SURVEY.PHQ', quick: 'PHQ9P', test: 'PHQ-9 QUICK DEPRESSION ASSESSMENT PANEL' },
  { code: '43890', klass: '', quick: '', test: 'PHQ-9.PROBLEM PANEL' },
  { code: '43894', klass: 'SURVEY.PHQ', quick: 'PHQ9', test: 'PHQ-9 TOTAL SCORE', upper: '10' },
  { code: '43895', klass: '', quick: '', test: 'PHQ-9 INTERPRETATION' },
  { code: '61793', klass: '', quick: 'PCS', test: 'PAIN CATASTROPHIZING SCALE' },
  { code: '61841', klass: 'PHYSI', quick: 'SDAI', test: 'SIMPLE DISEASE ACTIVITY INDEX', lower: '0', upper: '3.3' },
  { code: '61842', klass: 'PHYSI', quick: 'CDAI', test: 'CLINICAL DISEASE ACTIVITY INDEX', lower: '0', upper: '2.8' },
  { code: '61848', klass: '', quick: 'MEQ', test: 'MORPHINE DAILY EQUIVALENT' },
  { code: '61858', klass: '', quick: 'DIRE', test: 'DIRE RISK ASSESSMENT TOOL' },
  { code: '61859', klass: '', quick: 'BPISEVERE', test: 'BRIEF PAIN INVENTORY - SEVERITY' },
  { code: '61860', klass: '', quick: 'BPIINTERF', test: 'BRIEF PAIN INVENTORY - INTERFERENCE' },
  { code: '61861', klass: '', quick: 'BPIRELIEF', test: 'BRIEF PAIN INVENTORY - RELIEF' },
  { code: '61862', klass: '', quick: 'PDI', test: 'PAIN DISABILITY INDEX' },
  { code: '61863', klass: '', quick: 'DN4', test: 'DN4 NEUROPATHIC INDEX' },
  { code: '61865', klass: '', quick: 'ORT', test: 'OPIOID RISK TOOL' },
  { code: '76887', klass: '', quick: 'UPAT', test: 'UNIVERSAL PAIN ASSESSMENT' },
  { code: '84678', klass: '', quick: 'PEG', test: 'PEG MEAN SCORE' },
]

/** a code, or a quick code, as typed into the Code column → its lab code */
export function resolveLabCode(typed: string): LabCode | undefined {
  const t = typed.trim().toUpperCase()
  if (!t) return undefined
  return LAB_CODES.find((c) => c.code === t) ?? LAB_CODES.find((c) => c.quick && c.quick === t)
}

/**
 * The measures whose Value has a dynamic form behind it on this stage: the
 * "…" right of Value (or F4 in it) opens the form. MOIS has more (the
 * 302837 quick-code table lists eighteen scored instruments); only these two
 * forms are built, so every other code shows the "-" that means "no form".
 */
export const MEASURE_FORMS: Record<string, 'bp' | 'phq9'> = {
  '1950': 'bp',
  '43894': 'phq9',
}

/** the dynamic-form window (id_dform_window) each form is saved as: a saved
    instance only reopens in the window it was saved from */
export const FORM_WINDOW: Record<'bp' | 'phq9', string> = { bp: '100', phq9: '104' }

/** "Select one of the PHQ-9 questionnaires" (302837 step 5): the codes a
    myhealthkey site can send to the patient as a questionnaire */
export const QUESTIONNAIRE_CODES = new Set(['43894', '43882', '43895', '43890'])

/* --- the session store ---------------------------------------------------- */

export type Phq9Answers = {
  /** items a–i, each '0'…'3' or '' while unanswered */
  items: string[]
  /** item 2, the difficulty question: '0'…'3' or '' */
  difficulty: string
}

export type MeasureDraft = {
  code: string
  test: string
  units: string
  value: string
  flag: string
  lower: string
  upper: string
  category: string
  report: string
  /** the unnamed column: `-`, `…` (a form is available) or `.*.` (one was saved) */
  marker: string
  /** "Last Modified" of the form saved on this row, once Save Form was pressed */
  formModified: string
  phq9?: Phq9Answers
}

export type SentQuestionnaire = {
  date: string
  subject: string
  priority: string
  canReply: boolean
}

type EntryState = {
  draft: MeasureDraft | null
  /** saved form answers by row id — the export's own instances are read from dform_data */
  forms: Record<string, { phq9?: Phq9Answers; modified: string }>
  /** rows sent to the patient through myhealthkey, by row id */
  sent: Record<string, SentQuestionnaire>
  seq: number
}

const state: Record<string, EntryState> = {}
const listeners = new Set<() => void>()
let version = 0
const emit = () => { version += 1; listeners.forEach((l) => l()) }
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }
const EMPTY: EntryState = { draft: null, forms: {}, sent: {}, seq: 0 }
const of = (chart: string): EntryState => (state[chart] ??= { draft: null, forms: {}, sent: {}, seq: 0 })

export function useMeasureEntry(chart: string): EntryState {
  useSyncExternalStore(subscribe, () => version, () => version)
  return state[chart] ?? EMPTY
}

export const BLANK_DRAFT: MeasureDraft = {
  code: '', test: '', units: '', value: '', flag: '', lower: '', upper: '', category: '', report: '', marker: '-', formModified: '',
}

export function startDraft(chart: string) {
  of(chart).draft = { ...BLANK_DRAFT }
  emit()
}

export function clearDraft(chart: string) {
  of(chart).draft = null
  emit()
}

export function patchDraft(chart: string, patch: Partial<MeasureDraft>) {
  const s = of(chart)
  if (!s.draft) return
  s.draft = { ...s.draft, ...patch }
  emit()
}

/** put a lab code on the New Record row — the test name, units and ranges
    follow it, and the marker shows whether a form is behind the value */
export function setDraftCode(chart: string, code: LabCode | undefined, typed = '') {
  if (!code) { patchDraft(chart, { code: typed, test: '', units: '', lower: '', upper: '', category: '', marker: '-' }); return }
  patchDraft(chart, {
    code: code.code, test: code.test, units: code.units ?? '', lower: code.lower ?? '', upper: code.upper ?? '',
    category: code.klass, marker: MEASURE_FORMS[code.code] ? '…' : '-',
  })
}

/** a new row id for something filed this session */
export function nextEntryId(chart: string): string {
  const s = of(chart)
  s.seq += 1
  /* numeric like MOIS's own record ids, above the export's (5041xx) */
  return String(590000 + s.seq)
}

export function saveRowForm(chart: string, id: string, form: { phq9?: Phq9Answers; modified: string }) {
  of(chart).forms = { ...of(chart).forms, [id]: form }
  emit()
}

export function markSent(chart: string, id: string, sent: SentQuestionnaire) {
  of(chart).sent = { ...of(chart).sent, [id]: sent }
  emit()
}

/* --- small formatters shared by the entry windows ------------------------- */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const LONG_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const parts = (mois: string) => {
  const [y, m, d] = mois.split(/[./-]/).map(Number)
  return { y: y ?? 0, m: m ?? 1, d: d ?? 1 }
}

/** `2025.05.04` → `May 04 2025`, the New Message detail's Date Collected */
export function messageDate(mois: string): string {
  const { y, m, d } = parts(mois)
  if (!y) return ''
  return `${MONTHS[m - 1]} ${String(d).padStart(2, '0')} ${y}`
}

/** `2025.05.01` → `Thursday, May 1, 2025`, the sent row's comment (`dd25de05…`) */
export function longDate(mois: string): string {
  const { y, m, d } = parts(mois)
  if (!y) return ''
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return `${DAYS[day]}, ${LONG_MONTHS[m - 1]} ${d}, ${y}`
}

/** the `HH:MM` MOIS stamps a saved form with */
export function clockNow(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}
