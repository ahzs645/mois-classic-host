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
import { useSyncExternalStore } from 'react'

/** The signed-in user. The status bar shows the login, `JALA2`; MOIS stamps
    records with the user's display name, which for that login is this one
    (`userManagement.ts`, and the chart export's own `stp_user_modify`). */
export const SESSION_USER = 'JALIL, AHMAD'

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
const listeners = new Set<() => void>()
let version = 0
const emit = () => { version += 1; listeners.forEach((l) => l()) }
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }
const EMPTY: ChartState = { tags: [], snapshots: [], distributions: [] }
const of = (chart: string): ChartState => (state[chart] ??= { tags: [], snapshots: [], distributions: [] })

/** re-render on any change, then read the chart's slice */
export function useChartSession(chart: string): ChartState {
  useSyncExternalStore(subscribe, () => version, () => version)
  return state[chart] ?? EMPTY
}

export const chartSession = (chart: string): ChartState => state[chart] ?? EMPTY

export function addCarePlanTag(chart: string, tag: CarePlanTag) {
  of(chart).tags = [...of(chart).tags, tag]
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

/** a new frame starts on the chart as exported */
export function resetChartSession() {
  for (const key of Object.keys(state)) delete state[key]
  /* called while the frame renders, before any window subscribes: bump the
     version without notifying, so nothing updates mid-render */
  version += 1
}
