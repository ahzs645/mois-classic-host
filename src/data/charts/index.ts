/* ============================================================================
   Charts with a real MOIS export behind them, keyed by chart number.

   Most of the emulator's patients are hand-transcribed fixtures: one screen's
   worth of rows written to match a capture. A chart in here is different —
   every screen reads the same exported record set, so the encounters, the
   measures, the medications and the documents all belong to one person and
   agree with each other.

   The records are imported lazily and the demographics are not. Listing the
   patient in the roster needs the name and birth date on every load; the
   several hundred KB of records behind them is only wanted once somebody opens
   that chart, and bundling it eagerly doubled the stage's payload for every
   learner who never selects it.
   ========================================================================= */
import { useSyncExternalStore } from 'react'
import { chart87288Summary } from './chart-87288.summary'
import { withTrainingRecords } from './overlays'
import type { MoisChartExport, MoisRecord } from './types'

/** demographics for every exported chart — always loaded, small */
export const chartSummaries: Record<string, MoisRecord> = {
  [chart87288Summary.num_chart ?? '87288']: chart87288Summary,
}

const loaders: Record<string, () => Promise<MoisChartExport>> = {
  [chart87288Summary.num_chart ?? '87288']: () =>
    import('./chart-87288').then((m) => withTrainingRecords('87288', m.chart87288)),
}

/** resolved exports, so a chart is fetched once per session */
const loaded: Record<string, MoisChartExport> = {}
const pending: Record<string, Promise<MoisChartExport> | undefined> = {}
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
/** Loading and missing exports are empty, never permission to borrow fixture data. */
export function useLoadedChart(chart: string): MoisChartExport | null {
  return useSyncExternalStore(subscribe, () => loaded[chart] ?? null, () => null)
}

export const hasChartExport = (chart: string): boolean => chart in loaders

/** the export if it is already in memory; null means "not loaded yet" */
export const chartExportFor = (chart: string): MoisChartExport | null =>
  loaded[chart] ?? null

/** load a chart's records, returning the cached copy on every later call */
export async function loadChartExport(chart: string): Promise<MoisChartExport | null> {
  if (loaded[chart]) return loaded[chart]!
  const load = loaders[chart]
  if (!load) return null
  pending[chart] ??= load().then((data) => {
    loaded[chart] = data
    listeners.forEach((listener) => listener())
    return data
  }).finally(() => { delete pending[chart] })
  return pending[chart]!
}

export type { MoisChartExport, MoisChartGroup, MoisRecord } from './types'
