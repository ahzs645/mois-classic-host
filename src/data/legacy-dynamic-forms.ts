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
  fields: SavedDynamicFormField[]
}

export interface SavedDynamicFormField {
  id: string; label: string; value: string; dataType: string; fieldName: string; order: number
  /** the field's definition code (tdt_dform_data.str_field_code) */
  code: string
  /** the record column a field writes when it maps to one (str_mapped_to:
      str_value / str_report on the measure the form hangs from) */
  mappedTo: string
  /** the field it sits under (str_parent; `_self_` when it stands alone) */
  parent: string
  /** str_value_coded: Y when the value is a code from the field's list */
  coded: boolean
}

/**
 * The flags a saved form's header carries (tdt_dform_header). No capture of
 * a native Dynamic Form window shows them as controls — the form's own
 * "Allow other users to edit form" box is str_lock_to_user
 * (screens/Phq9FormWindow.tsx) — so they are read here and drawn nowhere.
 */
export function savedDynamicFormFlags(header: MoisRecord) {
  return {
    /** the window definition version the form was saved against */
    windowVersion: header.id_dform_window_ver ?? '',
    requireSigning: header.str_require_signing === 'Y',
    lockModifiable: header.str_lock_modifiable === 'Y',
    lockToUser: header.str_lock_to_user === 'Y',
    gracePeriod: header.num_grace_period ?? '',
    state: header.stp_record_state ?? '',
  }
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
      code: row.str_field_code ?? '',
      mappedTo: row.str_mapped_to ?? '',
      parent: row.str_parent ?? '',
      coded: row.str_value_coded === 'Y',
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
