import catalog from './legacy-dynamic-form-catalog.json'
import type { MoisRecord } from './charts/types'

type CatalogEntry = { title: string; group: string; sections: Record<string, string> }
const forms = catalog as Record<string, CatalogEntry>

/** Names and section captions extracted from the older tdt_dform_window dump. */
export function legacyDynamicFormDefinition(windowId?: string): CatalogEntry | undefined {
  return windowId ? forms[windowId] : undefined
}

export function legacyDynamicFormTitle(windowId?: string): string {
  return legacyDynamicFormDefinition(windowId)?.title ?? (windowId ? `Dynamic Form ${windowId}` : 'Dynamic Form')
}

export interface SavedDynamicFormSection {
  id: string
  title: string
  fields: { id: string; label: string; value: string; dataType: string; fieldName: string; order: number }[]
}

/**
 * A chart export stores one dform_data row per field. Keep export values
 * verbatim: a historical coded value must not be guessed from a newer option
 * list. Unlabelled, empty rows are internal fields and do not help the view.
 */
export function savedDynamicFormSections(header: MoisRecord, records: MoisRecord[]): SavedDynamicFormSection[] {
  const definition = legacyDynamicFormDefinition(header.id_dform_window)
  const sectionMap = new Map<string, SavedDynamicFormSection>()
  for (const row of records) {
    if (row.id_dform_header !== header.id_dform_header) continue
    const value = row.str_value ?? ''
    if (!row.str_field_label && !value) continue
    const sectionId = row.id_dform_window_obj ?? header.id_dform_window ?? ''
    let section = sectionMap.get(sectionId)
    if (!section) {
      section = {
        id: sectionId,
        title: definition?.sections[sectionId] ?? `Section ${sectionId || 'unknown'}`,
        fields: [],
      }
      sectionMap.set(sectionId, section)
    }
    section.fields.push({
      id: row.id_dform_data ?? `${sectionId}:${row.str_field_name ?? section.fields.length}`,
      label: row.str_field_label ?? row.str_field_name ?? 'Unlabelled field',
      value,
      dataType: row.str_data_type ?? '',
      fieldName: row.str_field_name ?? '',
      order: Number(row.num_field_order) >= 0 ? Number(row.num_field_order) : Number.MAX_SAFE_INTEGER,
    })
  }
  const sectionOrder = Object.keys(definition?.sections ?? {})
  return [...sectionMap.values()]
    .map((section) => ({ ...section, fields: section.fields.sort((a, b) => a.order - b.order || a.fieldName.localeCompare(b.fieldName)) }))
    .sort((a, b) => {
      const ai = sectionOrder.indexOf(a.id)
      const bi = sectionOrder.indexOf(b.id)
      if (ai >= 0 && bi >= 0) return ai - bi
      if (ai >= 0) return -1
      if (bi >= 0) return 1
      return Number(a.id) - Number(b.id)
    })
}
