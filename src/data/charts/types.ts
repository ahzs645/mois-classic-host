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

/**
 * Groups an export carries but the chart-87288 fixture was generated before
 * the importer read them. They are optional so that file still type-checks;
 * a regenerated export fills them in. Chart 87288's own export has all five
 * empty (`<admissions></admissions>`, `<interventions></interventions>`,
 * `<social_hxs></social_hxs>`, `<chart_barriers></chart_barriers>`,
 * `<medication_lts></medication_lts>`), so those folders list nothing for it.
 * Field names are from the multi-chart export MOIS_REF_10000074 and the
 * field audit's verified columns.
 */
export type MoisOptionalGroup =
  | 'admission' | 'intervention' | 'social_hx' | 'chart_barrier' | 'medication_lt' | 'observation'
  /* groups the importer finds in the file itself (scripts/import-chart.mjs
     `discoverGroups`); MOIS_REF_10000013 carries each of them empty */
  | 'alias_id' | 'associated_party' | 'claim_other' | 'claim_wcb' | 'consult' | 'dpm' | 'image'
  | 'occupation' | 'procedure' | 'cp_section' | 'chart_resource' | 'cp_element' | 'custom_form'
  | 'no_known' | 'education' | 'form_encounter'

/** A file a document points at (tdt_document.str_link), as an asset URL. */
export type ChartAttachment = {
  /** `pdf` is the file as MOIS stored it; `text` is a .TXM document's decoded text */
  kind: 'pdf' | 'text'
  url: string
}

export type MoisChartExport = {
  /** who exported it, from which build — the provenance MOIS stamps itself */
  header: Record<string, string>
  /** the single <chart> record: demographics, insurance, status */
  chart_status?: MoisRecord[]
  chart_name?: MoisRecord[]
  chart: MoisRecord
  /** the site's provider directory from the export's moisx.xml
      (id_provider, str_name, str_active) — not the patient's records */
  provider_directory?: MoisRecord[]
} & Record<MoisChartGroup, MoisRecord[]> & Partial<Record<MoisOptionalGroup, MoisRecord[]>>
