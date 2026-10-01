import type { MoisChartExport, MoisChartGroup, MoisOptionalGroup, MoisRecord } from './types'

/* ============================================================================
   Chart exports transcribed from TRAINING captures.

   A handful of the roster's charts have no MOIS export behind them, only
   screenshots of the real client. `captured-2429.ts`, `captured-3924.ts` and
   `captured-3598.ts` write down what those screenshots show in the export's
   own record groups and field names, so every folder's row mapping
   (to-rows.ts) and Patient Summary (summary.ts) read them exactly as they
   read chart 87288's export.

   What these exports are not: a patient record. `chart` carries only the
   chart number; the demographics stay in `patients.ts`, and the patient
   context keeps reading them from there for a `training-capture` export
   (patient-context.tsx). Fields a capture does not show are absent, not
   blank, and every record id is `cap-<chart>-…` so it can never collide with
   a real MOIS id.
   ========================================================================= */

export const CAPTURED_EXPORT_SOURCE = 'training-capture'

const GROUPS: MoisChartGroup[] = [
  'chart_address', 'chart_occupant', 'chart_preference', 'chart_service', 'connection',
  'encounter', 'encounter_note', 'measure', 'panel', 'order', 'document',
  'prescription', 'drug_dose', 'drug_duration',
  'health_issue', 'allergy', 'reaction_risk', 'reaction_event',
  'adverse_event', 'adverse_agent', 'adverse_link', 'alert',
  'family_hx', 'risk', 'need', 'action', 'goal', 'goal_link',
  'mar', 'mar_action', 'mar_instruction',
  'service_event', 'service_event_diag', 'form_header', 'form_wcb',
  'dform_header', 'dform_data',
]

/** A chart export holding only the records a capture shows; every other group is empty. */
export function capturedExport(
  chart: string,
  captures: string,
  records: Partial<Record<MoisChartGroup | MoisOptionalGroup, MoisRecord[]>>,
): MoisChartExport {
  const empty = Object.fromEntries(GROUPS.map((g) => [g, [] as MoisRecord[]])) as Record<MoisChartGroup, MoisRecord[]>
  return {
    ...empty,
    ...records,
    header: { source: CAPTURED_EXPORT_SOURCE, captures },
    chart: { num_chart: chart },
  } as MoisChartExport
}
