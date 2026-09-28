/* ============================================================================
   Search For and Advanced Search — which fields each Workspace list searches.

   PROVENANCE: the "Searching in …" section of each Basket folder's page
   (1802756 Measures, 1802757 Imaging, 1802758 Consults, 1802759 Procedures,
   1802760 Documents, 1802761 Facility Admissions, 1802762 Progress Notes,
   1802763 Orders) and 1802744 "Searching in Tasks" (`79f934dc…`): the
   default fields (a blue * in Advanced Search) are what a plain Search For
   matches; the rest are reached through the "…" / F4.
   ========================================================================= */

export type AdvancedSearchField = { key: string; label: string; default?: boolean }

/** Each folder's searchable fields, defaults first (the folder pages'
    "Searching in …" sections, 1802756–1802763; Task Inbox 1802744). */
export const SEARCH_FIELDS: Record<string, AdvancedSearchField[]> = {
  'ws-measures': [{ key: 'patient', label: 'Patient', default: true }, { key: 'test', label: 'Test Name', default: true }, { key: 't', label: 'Type' }, { key: 'value', label: 'Value' }, { key: 'flag', label: 'Flag' }, { key: 'units', label: 'Units' }, { key: 'status', label: 'Status' }, { key: 'ir', label: 'IR' }, { key: 'assignee', label: 'Assignee' }, { key: 'concept', label: 'Concept' }],
  'ws-imaging': [{ key: 'patient', label: 'Patient', default: true }, { key: 'test', label: 'Test Name', default: true }, { key: 't', label: 'Type' }, { key: 'flag', label: 'Flag' }, { key: 'status', label: 'Status' }, { key: 'ir', label: 'IR' }, { key: 'assignee', label: 'Assignee' }],
  'ws-consults': [{ key: 'patient', label: 'Patient', default: true }, { key: 'reason', label: 'Reason for Consult Request', default: true }, { key: 't', label: 'Type' }, { key: 'seenBy', label: 'Seen By' }, { key: 'status', label: 'Status' }, { key: 'ir', label: 'IR' }, { key: 'assignee', label: 'Assignee' }, { key: 'concept', label: 'Concept' }],
  'ws-procedures': [{ key: 'patient', label: 'Patient', default: true }, { key: 'description', label: 'Description', default: true }, { key: 't', label: 'Type' }, { key: 'by', label: 'Performed By' }, { key: 'status', label: 'Status' }, { key: 'ir', label: 'IR' }, { key: 'assignee', label: 'Assignee' }],
  'ws-documents': [{ key: 'patient', label: 'Patient', default: true }, { key: 'note', label: 'Note', default: true }, { key: 't', label: 'Type' }, { key: 'author', label: 'Author' }, { key: 'docType', label: 'Doc. Type' }, { key: 'status', label: 'Status' }, { key: 'ir', label: 'IR' }, { key: 'assignee', label: 'Assignee' }],
  'ws-admissions': [{ key: 'patient', label: 'Patient', default: true }, { key: 'description', label: 'Description', default: true }, { key: 't', label: 'Type' }, { key: 'facility', label: 'Facility' }, { key: 'status', label: 'Status' }, { key: 'ir', label: 'IR' }, { key: 'assignee', label: 'Assignee' }, { key: 'concept', label: 'Concept' }],
  'ws-progress': [{ key: 'patient', label: 'Patient', default: true }, { key: 'note', label: 'Appointment Note', default: true }, { key: 't', label: 'Type' }, { key: 'provider', label: 'Provider' }, { key: 'assignee', label: 'Assignee' }],
  'ws-orders': [{ key: 'description', label: 'Description (Order For)', default: true }, { key: 'patient', label: 'Patient', default: true }, { key: 't', label: 'Type' }, { key: 'orderedBy', label: 'Ordered By' }, { key: 'orderType', label: 'Order Type' }, { key: 'src', label: 'Source' }, { key: 'status', label: 'Status' }, { key: 'ir', label: 'IR' }, { key: 'assignee', label: 'Assignee' }],
  task: [{ key: 'p', label: 'Priority' }, { key: 'patient', label: 'Patient', default: true }, { key: 'task', label: 'Task', default: true }, { key: 'assignee', label: 'Assignee' }, { key: 'group', label: 'Group' }, { key: 'team', label: 'Team' }],
}

/** Search For plus the Advanced Search criteria, as MOIS applies them: the
    typed text against the default fields, each criterion against its own. */
export function matchesSearch(r: Record<string, unknown>, text: string, criteria: Record<string, string>, fields: AdvancedSearchField[]): boolean {
  const has = (v: unknown, want: string) => String(v ?? '').toUpperCase().includes(want.trim().toUpperCase())
  if (text.trim() && !fields.filter((f) => f.default).some((f) => has(r[f.key], text))) return false
  return Object.entries(criteria).every(([k, v]) => !v.trim() || has(r[k], v))
}

