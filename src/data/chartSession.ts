/* ============================================================================
   What a learner writes into the open chart during a session.

   The chart export is read-only, but several lessons end on a change they
   made: a record tagged to the Care Plan, a Care Plan snapshot, a letter
   distributed. Those live here, per chart, so every window that shows them
   (the Care Plan summary, its Snapshot tab, the Order's Distribution tab)
   agrees, and closing a window does not lose them. Folder reviews are
   data/folder-reviews.ts.

   A tiny external store rather than shell state, so the windows that write
   and the windows that read need no wiring through the frame.
   ========================================================================= */
import { createSignal } from './sessionStore'
import { SESSION_USER } from './session'

/** The signed-in user's display name — defined in data/session.ts, re-exported
    here for the screens (and src/index.ts) that import it from this module. */
export { SESSION_USER }

export type CarePlanTag = { section: string; rank: string; date: string; description: string; detail: string; category: string; code: string }
export type CarePlanSnapshot = { date: string; createdBy: string; note: string; text: string; letterhead: string }
export type LetterDistribution = {
  orderId: string | null
  doc: string
  date: string
  title: string
  rows: { method: string; type: string; name: string; status: string }[]
}

type ChartState = {
  tags: CarePlanTag[]
  snapshots: CarePlanSnapshot[]
  distributions: LetterDistribution[]
}

const state: Record<string, ChartState> = {}
/* a new frame starts on the chart as exported (resets with the session) */
const changes = createSignal(() => { for (const key of Object.keys(state)) delete state[key] })
const emit = changes.emit
const EMPTY: ChartState = { tags: [], snapshots: [], distributions: [] }
const of = (chart: string): ChartState => (state[chart] ??= { tags: [], snapshots: [], distributions: [] })

/** re-render on any change, then read the chart's slice */
export function useChartSession(chart: string): ChartState {
  changes.use()
  return state[chart] ?? EMPTY
}

export const chartSession = (chart: string): ChartState => state[chart] ?? EMPTY

export function addCarePlanTag(chart: string, tag: CarePlanTag) {
  of(chart).tags = [...of(chart).tags, tag]
  emit()
}

/** Summary Settings ▸ Care Plan Elements ▸ Edit: a tag's section and rank
    (art. 303514; screens/SummarySettingsView.tsx) */
export function updateCarePlanTag(chart: string, index: number, patch: Partial<CarePlanTag>) {
  of(chart).tags = of(chart).tags.map((t, i) => (i === index ? { ...t, ...patch } : t))
  emit()
}

/** Summary Settings ▸ Care Plan Elements ▸ Delete Record: "Tagged records
    must be deleted from this window" (art. 303514) */
export function deleteCarePlanTag(chart: string, index: number) {
  of(chart).tags = of(chart).tags.filter((_, i) => i !== index)
  emit()
}

export function addCarePlanSnapshot(chart: string, snapshot: CarePlanSnapshot) {
  of(chart).snapshots = [snapshot, ...of(chart).snapshots]
  emit()
}

export function deleteCarePlanSnapshot(chart: string, index: number) {
  of(chart).snapshots = of(chart).snapshots.filter((_, i) => i !== index)
  emit()
}

/** a letter sent from Create Distribution: the Order's Distribution tab
    gains a row per recipient */
export function addLetterDistribution(chart: string, d: LetterDistribution) {
  of(chart).distributions = [d, ...of(chart).distributions]
  emit()
}

/** a new frame starts on the chart as exported (the session reset runs this
    as the frame mounts — data/sessionStore.ts) */
export const resetChartSession = () => changes.reset()
