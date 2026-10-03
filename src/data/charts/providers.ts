/* ============================================================================
   Provider ids → names, from the export's own provider directory.

   Chart records name a provider by id in places: tdt_encounter.id_provider,
   tdt_order.id_attending / id_order_by / id_responsible_org,
   tdt_document.id_responsible_org, tdt_dform_header.id_provider,
   tdt_form_header.id_author. The export's moisx.xml carries the site's
   directory of those ids (scripts/import-chart.mjs → `provider_directory`).

   The directory covers MOIS.PROVIDER ids only. MOIS.USER ids (`10003787`)
   and organizations outside it stay unresolved: `providerName` returns ''
   for them, and `providerLabel` falls back to the id so the screen still
   shows what MOIS stored. `-1` is MOIS's "none" and is always blank.
   ========================================================================= */
import type { MoisChartExport } from './types'

/** the directory's name for a provider id, or '' when it has none */
export function providerName(data: MoisChartExport | null | undefined, id: string | undefined): string {
  if (!id || id === '-1' || id === '0') return ''
  return data?.provider_directory?.find((p) => p.id_provider === id)?.str_name?.trim() ?? ''
}

/** the name when the directory knows the id, else the id itself */
export function providerLabel(data: MoisChartExport | null | undefined, id: string | undefined): string {
  if (!id || id === '-1' || id === '0') return ''
  return providerName(data, id) || id
}
