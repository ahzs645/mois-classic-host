import type { MoisRecord } from './types'
import type { ReportField } from '../reportScreens'
/** A record's Created / Last Modified stamp as MOIS prints it: to the minute,
    two spaces between date, time and user — `2026.08.12  10:42  JALIL, AHMAD`
    (goal-saved.png, need-for-care-new-record.png; evidence/MATRIX-R0835 `2026.02.13  06:39  WASHINGTON,
    ALYSSA`; the MAR Detail Record, evidence/MATRIX-R0766-date-time). The
    export holds `2026/08/12 10:42:51`. A strip that prints it needs
    `white-space: pre`, or the doubled spaces collapse. */
export const stamp = (r?: MoisRecord, kind = 'create') => {
  if (!r) return ''
  const at = r[`stp_date_${kind}`]
    ?.replace(/\//g, '.')
    .replace(/(\d{1,2}:\d{2}):\d{2}/, '$1')
    .replace(/^(\S+) +(?=\d)/, '$1  ')
  return [at, r[`stp_user_${kind}`]].filter(Boolean).join('  ')
}
const fields: Record<string, string[]> = {
  'Ordered By': ['str_order_by'], 'Order Date': ['dtm_ord_date'], 'Order #': ['id_order'],
  'Copies To': ['str_copy_to'], 'Report': ['str_report', 'str_note'], 'Comment': ['str_comment', 'str_note'],
  'Comments': ['str_comment'], 'Note': ['str_note'], 'Detail': ['str_detail'],
  'Facility': ['str_facility'], 'Facility Loc.': ['str_facility_loc'], 'Facility Ref.': ['str_filler_ref_no'],
  'Attending': ['str_attending'], 'Responsible Org.': ['str_responsible_org'], 'Status': ['str_status'],
  'Date': ['dtm_date'], 'Start Date': ['dtm_start'], 'Stop Date': ['dtm_end'], 'Date of Onset': ['dtm_start'],
  'Refer Date': ['dtm_ord_date'], 'Referred By': ['str_order_by'], 'Seen By': ['str_performed_by'],
  'Perform By': ['str_performed_by'], 'Report By': ['str_report_by'], 'Transcribed': ['str_transcribed_by'],
  'Description': ['str_description'], 'Test Name': ['str_description'], 'Exam Reasn': ['str_description'],
  'Type': ['str_intolerance_type', 'str_doc_type'], 'Agent Category': ['str_category'],
  'Severity': ['str_severity'], 'Criticality': ['str_criticality'], 'Risk Status': ['str_risk_status'],
  'Problem Name': ['str_problem_name'], 'Certainty': ['str_certainity'], 'Source': ['str_source'],
  'Author': ['str_author'], 'Author Role': ['str_author_role'], 'Sensitive': ['str_sensitive'],
  'Subject': ['str_type'], 'Subject Detail': ['str_preference'], 'Category': ['str_classification'],
  /* Reaction Risks' agent line (set 3 c04): the code and the agent */
  'Agent Code': ['str_substance_code'], 'Agent': ['str_substance'],
  'Informant': ['str_informant'], 'Observer': ['str_observer'], 'Documenter': ['str_documenter'],
}
/* tdt_document behind the Documents folder's Report tab: the same captions
   as the order-backed report windows, other columns. Each is the column
   Ctrl+Shift+A resolved on v02.31.23 (data dictionary, Documents ▸ Report):
   Source Venue R0795, Author Type R0796, Author Role R0797, Responsible Org.
   R0806, Recipient R0807, Copies To R0808, Transcribed R0809 and its date
   R0810. The workbook's "Diagnosis" (R0811, str_diag_desc) is the box MOIS
   captions Service Event — its evidence: "the visible MOIS label is Service
   Event; Ctrl+Shift+A resolved tdt_document.str_diag_desc". */
const documentFields: Record<string, string[]> = {
  'Source Venue': ['str_source_venue'], 'Author Type': ['str_author_type'], 'Author Role': ['str_author_role'],
  'Responsible Org.': ['str_responsible_org'], 'Recipient': ['str_primary_recipient'], 'Copies To': ['str_sent_to'],
  'Transcribed': ['str_transcriptionist'], 'Transcribed Date': ['dtm_transcribed_date'], 'Service Event': ['str_diag_desc'],
}
export function bindReportField(f: ReportField, r?: MoisRecord): ReportField {
  if (f.kind === 'gap') return f
  const label = f.label.replace(/:\s*$/, '').replace(/\n/g, ' ')
  const ownKeys = r?.id_document !== undefined ? documentFields[label] : undefined
  const keys = ownKeys ?? fields[label] ?? []
  const stored = keys.map(k => r?.[k]).find(v => v !== undefined) ?? ''
  /* dtm_transcribed_date carries its time; the Transcribed date box takes the date */
  const value = ownKeys && f.kind === 'date' ? stored.split(' ')[0]! : stored
  return { ...f, value: f.kind === 'date' ? value.replace(/\//g, '.') : value }
}
