import { useSyncExternalStore } from 'react'
import type { MoisChartExport, MoisRecord } from './charts/types'

/** Local simulator writes only; the imported chart and original XML stay intact. */
export interface DynamicFormWrites {
  measure: MoisRecord[]
  observation: MoisRecord[]
  chart: MoisRecord
}
type Writes = Record<string, Record<string, DynamicFormWrites>>
let writes: Writes = {}
const empty: Record<string, DynamicFormWrites> = {}
const listeners = new Set<() => void>()
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn) } }
export const dynamicFormWritesFor = (chart: string) => writes[chart] ?? empty
export function useDynamicFormWrites(chart: string) {
  return useSyncExternalStore(subscribe, () => dynamicFormWritesFor(chart), () => empty)
}
export function replaceDynamicFormWrites(chart: string, formId: string, next: DynamicFormWrites) {
  const stamp = (records: MoisRecord[], group: string) => records.map((record, index) => ({
    ...record, id_dform_source: formId, [`id_${group}`]: `dform:${formId}:${index}`,
  }))
  // Move an edited form to the end: the latest save owns conflicting chart fields.
  const kept = { ...writes[chart] }
  delete kept[formId]
  writes = { ...writes, [chart]: { ...kept, [formId]: { chart: { ...next.chart }, measure: stamp(next.measure, 'measure'), observation: stamp(next.observation, 'observation') } } }
  listeners.forEach(fn => fn())
}
export function resetDynamicFormWrites() { writes = {}; listeners.forEach(fn => fn()) }

export function mergeDynamicFormWrites(base: MoisChartExport | null, chart: string, entries = dynamicFormWritesFor(chart)): MoisChartExport | null {
  const forms = Object.values(entries)
  if (!forms.length) return base
  const emptyGroups = Object.fromEntries([
    'chart_address', 'chart_occupant', 'chart_preference', 'chart_service', 'connection', 'encounter', 'encounter_note',
    'measure', 'panel', 'order', 'document', 'prescription', 'drug_dose', 'drug_duration', 'health_issue', 'allergy',
    'reaction_risk', 'reaction_event', 'adverse_event', 'adverse_agent', 'adverse_link', 'alert', 'family_hx', 'risk',
    'need', 'action', 'goal', 'goal_link', 'mar', 'mar_action', 'mar_instruction', 'service_event', 'service_event_diag',
    'form_header', 'form_wcb', 'dform_header', 'dform_data',
  ].map(group => [group, []]))
  return {
    ...emptyGroups, ...base,
    header: base?.header ?? { source: 'dynamic-form-preview' },
    chart: Object.assign({ num_chart: chart }, base?.chart, ...forms.map(form => form.chart)),
    measure: [...(base?.measure ?? []), ...forms.flatMap(form => form.measure)],
    observation: [...(base?.observation ?? []), ...forms.flatMap(form => form.observation)],
  } as MoisChartExport
}
