import { useSyncExternalStore } from 'react'
import { createStore } from './sessionStore'
import type { MoisChartExport, MoisRecord } from './charts/types'

/** Local simulator writes only; the imported chart and original XML stay intact. */
export interface DynamicFormWrites {
  measure: MoisRecord[]
  observation: MoisRecord[]
  chart: MoisRecord
}
type Writes = Record<string, Record<string, DynamicFormWrites>>
/* NOT reset with the session (`reset: false`). The Webforms app writes these
   from its own dynamic-form store (components/tutorials/host-stage/
   dynamic-form-store.ts: writeDynamicFormChart → replaceDynamicFormWrites),
   which keeps the saved forms and their measures independently of the frame
   and only clears them — with resetDynamicFormWrites — in its tests. Clearing
   the chart writes on every frame mount would leave the app's saved forms
   listed while their values vanished from the chart. The app owns the reset. */
const writes = createStore<Writes>({}, { reset: false })
const empty: Record<string, DynamicFormWrites> = {}
export const dynamicFormWritesFor = (chart: string) => writes.get()[chart] ?? empty
export function useDynamicFormWrites(chart: string) {
  return useSyncExternalStore(writes.subscribe, () => dynamicFormWritesFor(chart), () => empty)
}
export function replaceDynamicFormWrites(chart: string, formId: string, next: DynamicFormWrites) {
  const stamp = (records: MoisRecord[], group: string) => records.map((record, index) => ({
    ...record, id_dform_source: formId, [`id_${group}`]: `dform:${formId}:${index}`,
  }))
  // Move an edited form to the end: the latest save owns conflicting chart fields.
  writes.set((all) => {
    const kept = { ...all[chart] }
    delete kept[formId]
    return { ...all, [chart]: { ...kept, [formId]: { chart: { ...next.chart }, measure: stamp(next.measure, 'measure'), observation: stamp(next.observation, 'observation') } } }
  })
}
export function resetDynamicFormWrites() { writes.reset() }

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
