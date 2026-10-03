/* ============================================================================
   A result panel (tdt_panel) as the Measures folder reads it.

   A panel is the order a set of results came back under: its results carry
   its id (tdt_measure.id_panel) and their place in it (tdt_measure.num_set_id,
   HL7 OBX-1). The record itself is the HL7 OBR segment MOIS keeps: the
   ordering provider (OBR-16), the collector (OBR-10), the filler order number
   (OBR-3, the lab's accession), the universal service id (OBR-4), the
   observation date / time (OBR-7), the results date (OBR-22) and the result
   status (OBR-25).

   Where MOIS shows a panel (302837 "Measures Panel Tab", `91cd8d02…`): the
   Panel tab prints the panel's name and Ordered By over its Panel Notes and
   results, and Panel View's band prints the collected date, the ordering
   provider, the panel code and the name (`d417fc8b…`). No capture shows the
   collector, filler order number, universal service id, results date or
   result status of the panel itself — the Detail tab's Collect By and Facility
   Ref. are the *result's* own columns (tdt_measure.str_collect_by,
   str_filler_ref_no; MATRIX-R0515 / R0520) — so those ride on the model
   unshown rather than being painted into a result's boxes.
   ========================================================================= */
import { toDots } from '../clock'
import type { MoisRecord } from './types'

export type MeasurePanel = {
  id: string
  name: string
  code: string
  codeSystem: string
  orderedBy: string
  collector: string
  fillerOrderNumber: string
  universalServiceId: string
  /** dtm_observation_date, YYYY.MM.DD */
  observed: string
  /** dtm_observation_time, HH:MM */
  observedTime: string
  resultsDate: string
  resultStatus: string
  setId: string
  interface: string
  record: MoisRecord
}

export function measurePanel(record: MoisRecord): MeasurePanel {
  return {
    id: record.id_panel ?? '',
    name: record.str_panel_name ?? '',
    code: record.str_panel_code ?? '',
    codeSystem: record.str_panel_code_system ?? '',
    orderedBy: record.str_ordering_provider ?? '',
    collector: record.str_collector_identifier ?? '',
    fillerOrderNumber: record.str_filler_order_number ?? '',
    universalServiceId: record.str_universal_service_id ?? '',
    observed: toDots(record.dtm_observation_date),
    observedTime: (record.dtm_observation_time ?? '').slice(0, 5),
    resultsDate: toDots(record.dtm_results_date),
    resultStatus: record.str_result_status ?? '',
    setId: record.num_set_id ?? '',
    interface: record.str_interface ?? '',
    record,
  }
}

/** the panel a result came in, or undefined for a result that stands alone */
export function panelFor(panels: MoisRecord[], id: string | undefined): MeasurePanel | undefined {
  if (!id) return undefined
  const record = panels.find((p) => p.id_panel === id)
  return record ? measurePanel(record) : undefined
}

/** a panel's results in the panel's own order (num_set_id), the rest after */
export function inPanelOrder<T extends Record<string, string | undefined>>(rows: T[]): T[] {
  const seq = (r: T) => (r.setId ? Number(r.setId) : Number.MAX_SAFE_INTEGER)
  return rows.map((r, i) => ({ r, i })).sort((a, b) => seq(a.r) - seq(b.r) || a.i - b.i).map((x) => x.r)
}
