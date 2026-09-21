/* ============================================================================
   A MOIS chart export, as the emulator's screens read it.

   One record is a flat bag of MOIS's own column names — `str_name_l`,
   `dtm_collect_date`, `num_chart`. They are deliberately not renamed: a screen
   that shows a column can be traced straight back to the export field it came
   from, and a field MOIS leaves empty stays visibly empty rather than becoming
   an invented default.

   Values are strings because that is what the XML carries; a missing field is
   absent rather than empty-string, so `?? ''` at the point of use is the
   difference between "MOIS wrote nothing" and "MOIS wrote a blank".
   ========================================================================= */

export type MoisRecord = Record<string, string | undefined>

/** The record groups a chart export can carry, in tree order. */
export type MoisChartGroup =
  | 'chart_address' | 'chart_occupant' | 'chart_preference' | 'chart_service' | 'connection'
  | 'encounter' | 'encounter_note' | 'measure' | 'panel' | 'order' | 'document'
  | 'prescription' | 'drug_dose' | 'drug_duration'
  | 'health_issue' | 'allergy' | 'reaction_risk' | 'reaction_event'
  | 'adverse_event' | 'adverse_agent' | 'adverse_link' | 'alert'
  | 'family_hx' | 'risk' | 'need' | 'action' | 'goal' | 'goal_link'
  | 'mar' | 'mar_action' | 'mar_instruction'
  | 'service_event' | 'service_event_diag' | 'form_header' | 'form_wcb'
  | 'dform_header' | 'dform_data'

export type MoisChartExport = {
  /** who exported it, from which build — the provenance MOIS stamps itself */
  header: Record<string, string>
  /** the single <chart> record: demographics, insurance, status */
  chart: MoisRecord
} & Record<MoisChartGroup, MoisRecord[]>
