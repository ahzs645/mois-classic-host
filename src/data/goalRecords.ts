/* ============================================================================
   Goals a learner enters or changes during a session (Patient Chart ▸ Care
   Plan ▸ Goals, art. 303498).

   The chart export is read-only. New goals, edits to exported goals and
   goals deleted live here, per chart, so the Goals folder, its New Goal
   window and Quick Entry agree, and closing the folder loses nothing. A new
   frame starts on the chart as exported (`resetGoalRecords`).

   Links and actions are NOT kept here: a goal's Linked Health Issue(s) and
   Linked Action(s) tabs read and write the Care Plan store
   (data/carePlanRecords.ts — `linkGoal` / `unlinkGoal` / `linkedGoalIds`,
   and the Planned Actions folder's `addFolderRecord` / `saveFolderRecord` /
   `deleteFolderRecord`), so a link made from either end shows at both.

   ---------------------------------------------------------------------------
   addGoal(chart, input) — THE ENTRY POINT FOR OTHER WINDOWS (Quick Entry's
   Chart Goal applies a Goal template through it). `input` is a GoalInput:

     goal             the Goal description (required; a quantitative goal
                      with no description gets one written from its
                      settings — "HGBA1C <= 8.5")
     start, end       'YYYY.MM.DD'; start defaults to today's MOIS date
     phase            e.g. 'INITIATION'
     quantitative     true → the Quantitative Settings tab is enabled
     subject          Quantitative Settings' Subject (the article's
                      "Category"): 'MEASURE', 'MAR', 'CONSULT' …
     identifiedBy     'Code' | 'Concept'
     concept          the concept or code — 'HGBA1C'
     operator         '=', '<', '<=', '>', '>=', 'BETWEEN'
     target, target2  Target Value's second (and, for BETWEEN, third) box
     every, units     Require Every — '1', 'YEARS'
     detail, expectedOutcome, evaluationMethod, actualOutcome
     commitment, confidence, importance   '1'…'10' or ''
     sensitive

   It returns the new goal's id (`session-goal-N`), which the Goals grid
   lists first.
   ========================================================================= */
import { createSignal } from './sessionStore'
import type { MoisRecord } from './charts'
import { SESSION_USER } from './chartSession'
import { MOIS_TODAY, toDots } from './clock'

export type GoalFields = {
  goal: string
  start: string
  end: string
  phase: string
  quantitative: boolean
  subject: string
  identifiedBy: 'Code' | 'Concept'
  concept: string
  operator: string
  target: string
  target2: string
  every: string
  units: string
  detail: string
  expectedOutcome: string
  commitment: string
  confidence: string
  importance: string
  evaluationMethod: string
  actualOutcome: string
  sensitive: boolean
}

export type GoalInput = Partial<GoalFields> & { goal: string }

export type SessionGoal = GoalFields & { id: string; createdBy: string; createdAt: string }

type ChartState = {
  goals: SessionGoal[]
  edits: Record<string, Partial<GoalFields>>
  deletedGoals: string[]
}

const fresh = (): ChartState => ({ goals: [], edits: {}, deletedGoals: [] })
const state: Record<string, ChartState> = {}
let seq = 0
const changes = createSignal(() => { for (const key of Object.keys(state)) delete state[key] })
const emit = changes.emit
const EMPTY: ChartState = fresh()
const of = (chart: string): ChartState => (state[chart] ??= fresh())

/** re-render on any change, then read the chart's slice */
export function useGoalRecords(chart: string): ChartState {
  changes.use()
  return state[chart] ?? EMPTY
}

export const goalRecords = (chart: string): ChartState => state[chart] ?? EMPTY

const BLANK: GoalFields = {
  goal: '', start: '', end: '', phase: '', quantitative: false, subject: '', identifiedBy: 'Concept',
  concept: '', operator: '', target: '', target2: '', every: '', units: '', detail: '', expectedOutcome: '',
  commitment: '', confidence: '', importance: '', evaluationMethod: '', actualOutcome: '', sensitive: false,
}

/** the Goal a quantitative goal's settings describe (art. 303498: "if the
    user codes a quantitative goal, the goal description will be
    automatically populated") — the wording is INFERRED */
export function quantitativeDescription(f: Pick<GoalFields, 'concept' | 'operator' | 'target' | 'target2'>): string {
  if (!f.concept) return ''
  if (!f.operator) return f.concept.toUpperCase()
  if (f.operator === 'BETWEEN') return `${f.concept} BETWEEN ${f.target} AND ${f.target2}`.toUpperCase().trim()
  return `${f.concept} ${f.operator} ${f.target}`.toUpperCase().trim()
}

/** Add a goal to the chart; returns its id. See the header for the shape. */
export function addGoal(chart: string, input: GoalInput): string {
  const id = `session-goal-${++seq}`
  const fields: GoalFields = { ...BLANK, start: MOIS_TODAY, ...input }
  if (!fields.goal && fields.quantitative) fields.goal = quantitativeDescription(fields)
  of(chart).goals = [{ ...fields, id, createdBy: SESSION_USER, createdAt: MOIS_TODAY }, ...of(chart).goals]
  emit()
  return id
}

/** change a goal — one entered this session, or an exported one (kept as an edit over it) */
export function updateGoal(chart: string, id: string, patch: Partial<GoalFields>) {
  const s = of(chart)
  if (s.goals.some((g) => g.id === id)) s.goals = s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g))
  else s.edits = { ...s.edits, [id]: { ...s.edits[id], ...patch } }
  emit()
}

export function deleteGoal(chart: string, id: string) {
  const s = of(chart)
  if (s.goals.some((g) => g.id === id)) s.goals = s.goals.filter((g) => g.id !== id)
  else s.deletedGoals = [...s.deletedGoals, id]
  emit()
}

/** an exported goal record as goal fields */
export function goalFieldsOf(r: MoisRecord): GoalFields {
  const d = toDots
  return {
    ...BLANK,
    goal: r.str_goal ?? '',
    start: d(r.dtm_start),
    end: d(r.dtm_end),
    phase: r.str_phase ?? '',
    quantitative: r.str_quantitative === 'Y',
    subject: r.str_type ?? '',
    identifiedBy: r.str_code_type === 'CODE' || (!r.str_concept && r.str_code) ? 'Code' : 'Concept',
    concept: r.str_concept ?? r.str_code ?? '',
    operator: r.str_operator ?? '',
    target: r.num_value ?? r.str_value ?? '',
    target2: r.num_value2 ?? '',
    detail: r.str_reason ?? '',
    expectedOutcome: r.str_outcome_expected ?? '',
    commitment: r.num_commitment ?? '',
    confidence: r.num_confidence ?? '',
    importance: r.num_importance ?? '',
    evaluationMethod: r.str_evaluation ?? '',
    actualOutcome: r.str_outcome_actual ?? '',
    sensitive: r.str_sensitive === 'Y',
  }
}

/** a new frame starts on the chart as exported (the session reset runs this
    as the frame mounts — data/sessionStore.ts) */
export const resetGoalRecords = () => changes.reset()
