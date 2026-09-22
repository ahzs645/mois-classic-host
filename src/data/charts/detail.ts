import type { MoisRecord } from './types'
import type { ReportField } from '../reportScreens'
export const stamp = (r?: MoisRecord, kind = 'create') => r ? [r[`stp_date_${kind}`]?.replace(/\//g, '.'), r[`stp_user_${kind}`]].filter(Boolean).join('  ') : ''
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
  'Informant': ['str_informant'], 'Observer': ['str_observer'], 'Documenter': ['str_documenter'],
}
export function bindReportField(f: ReportField, r?: MoisRecord): ReportField {
  if (f.kind === 'gap') return f
  const keys = fields[f.label.replace(/:\s*$/, '').replace(/\n/g, ' ')] ?? []
  const value = keys.map(k => r?.[k]).find(v => v !== undefined) ?? ''
  return { ...f, value: f.kind === 'date' ? value.replace(/\//g, '.') : value }
}
