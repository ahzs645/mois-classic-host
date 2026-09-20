/* ============================================================================
   The Reports module's catalogue.

   Reports is shaped differently from every other module: its navigator holds a
   single node, `Report List`, and the catalogue itself is the work area.
   Folders are DataWindow **group bands**, not a tree, and the grid has **no
   column-header row** — the first band sits one pixel under the view header.

   Transcribed from the 2026-09-20 manual. Folder order is `304051/a2d6ecd370`.
   A report's name is taken from its Selection Parameter window's title bar
   (`Report: <Folder> - <Name>`), which is the product's own string.

   `desc: null` means **no rendered description exists in the corpus** — the
   folder has never been captured expanded. Nine of the sixteen are in that
   state, and MOIS shows a description there that we do not know. Leaving the
   cell blank is the honest rendering; do not invent one.

   Build note: every capture of this grid reads v02.17.20 b150326 (March 2015),
   which is far older than the rest of the emulator. Four Clinical - Main rows
   and the `Reaction Risks` rename come from the current articles instead.
   ========================================================================= */

export type ReportRow = {
  folder: string
  name: string
  /** null where the corpus has never rendered this folder's Description column */
  desc: string | null
}

/** The sixteen folders, in the order the capture shows them. */
export const REPORT_FOLDERS = [
  'Accounts - General',
  'Accounts - MSP',
  'Accounts - Private (Inv)',
  'Accounts - Private (Trans)',
  'Bills - by Diagnosis',
  'Bills - Fee Code',
  'Clinical - Audits',
  'Clinical - Main',
  'Clinical - Pro/Obs',
  'Dynamic Forms',
  'MSP Billing',
  'Practice Management',
  'Practice Management - Access',
  'Recalls / Reminders',
  'Report Builders',
  'Security / Access Audit',
] as const

const ROWS: ReportRow[] = [
  /* --- Accounts - General --- */
  { folder: 'Accounts - General', name: 'Sales Tax Report', desc: 'Print tax report for a date range' },
  { folder: 'Accounts - General', name: 'Detailed Activity Report', desc: 'Print Detailed Activity report for a date range' },
  { folder: 'Accounts - General', name: 'Aging Report', desc: 'Aging Report' },
  /* --- Accounts - MSP --- */
  { folder: 'Accounts - MSP', name: 'Accounts Receivable', desc: null },
  { folder: 'Accounts - MSP', name: 'Accounts Receivable as of', desc: null },
  { folder: 'Accounts - MSP', name: 'Alphabetic AR', desc: null },
  { folder: 'Accounts - MSP', name: 'Billing Profile by Practitioner', desc: null },
  { folder: 'Accounts - MSP', name: 'Claims Sent for Date Range', desc: null },
  { folder: 'Accounts - MSP', name: 'Deletions for Deletion Date Range', desc: null },
  { folder: 'Accounts - MSP', name: 'Explanatory Codes for Date Range', desc: null },
  { folder: 'Accounts - MSP', name: 'Failed Pre-Edit and Refused', desc: null },
  { folder: 'Accounts - MSP', name: 'Payment Detail for Date Range', desc: null },
  { folder: 'Accounts - MSP', name: 'Payment Summary For Date Range', desc: null },
  { folder: 'Accounts - MSP', name: 'Payments by Clarification Code for Date Range', desc: null },
  { folder: 'Accounts - MSP', name: 'Payments by Location for Date Range', desc: null },
  { folder: 'Accounts - MSP', name: 'Submission Code for Date Range', desc: null },
  { folder: 'Accounts - MSP', name: 'Summary by Activity Date', desc: null },
  { folder: 'Accounts - MSP', name: 'Summary by Date of Service', desc: null },
  { folder: 'Accounts - MSP', name: 'Writeoffs for W/O Date Range', desc: null },
  /* --- Accounts - Private (Inv) --- */
  { folder: 'Accounts - Private (Inv)', name: 'A/R by Practitioner for Selected Payor', desc: null },
  { folder: 'Accounts - Private (Inv)', name: 'A/R Sorted by Practitioner / Payor', desc: null },
  { folder: 'Accounts - Private (Inv)', name: 'Alphabetic A/R', desc: null },
  { folder: 'Accounts - Private (Inv)', name: 'Invoice Detail', desc: null },
  { folder: 'Accounts - Private (Inv)', name: 'Invoice Summary', desc: null },
  { folder: 'Accounts - Private (Inv)', name: 'Invoices Written Off', desc: null },
  { folder: 'Accounts - Private (Inv)', name: 'Overpayment', desc: null },
  { folder: 'Accounts - Private (Inv)', name: 'Statements for Overdue Range', desc: null },
  /* --- Accounts - Private (Trans) --- */
  { folder: 'Accounts - Private (Trans)', name: 'Billing Transaction by Service Date', desc: null },
  { folder: 'Accounts - Private (Trans)', name: 'Debit Memos for Adjustment Date Range', desc: null },
  { folder: 'Accounts - Private (Trans)', name: 'Payments for Pay Date Range', desc: null },
  { folder: 'Accounts - Private (Trans)', name: 'Transaction Activity Summary', desc: null },
  { folder: 'Accounts - Private (Trans)', name: 'Transaction By Patients', desc: null },
  { folder: 'Accounts - Private (Trans)', name: 'Writeoff Entries for Date Range', desc: null },
  /* --- Bills - by Diagnosis --- */
  { folder: 'Bills - by Diagnosis', name: 'MSP', desc: null },
  { folder: 'Bills - by Diagnosis', name: 'Practice Private', desc: null },
  /* --- Bills - Fee Code --- */
  { folder: 'Bills - Fee Code', name: 'MSP', desc: null },
  { folder: 'Bills - Fee Code', name: 'Practice Private', desc: null },
  /* --- Clinical - Audits --- */
  { folder: 'Clinical - Audits', name: 'ASTHMA (Excel)', desc: 'ASTHMA Excel Output' },
  { folder: 'Clinical - Audits', name: 'CHF (Excel)', desc: 'CONGESTIVE HEART FAILURE Excel Output' },
  { folder: 'Clinical - Audits', name: 'CHRONIC KIDNEY DISEASE (Excel)', desc: 'CHRONIC KIDNEY DISEASE Excel Output' },
  { folder: 'Clinical - Audits', name: 'COPD Audit', desc: 'COPD Audit Excel Output' },
  { folder: 'Clinical - Audits', name: 'Diabetes (Excel)', desc: 'Diabetes Excel Output' },
  { folder: 'Clinical - Audits', name: 'Hepatitis C (Excel)', desc: 'Hepatitis C Excel Output' },
  { folder: 'Clinical - Audits', name: 'HTN (Excel)', desc: 'Hypertension Excel Output' },
  { folder: 'Clinical - Audits', name: 'Mammogram', desc: 'Mammogram' },
  { folder: 'Clinical - Audits', name: 'Number of Visits', desc: 'Number of Visits for a Patient' },
  { folder: 'Clinical - Audits', name: 'Obesity', desc: 'Obesity' },
  { folder: 'Clinical - Audits', name: 'Pap Smear', desc: 'Pap Smear' },
  { folder: 'Clinical - Audits', name: 'Polypharmacy', desc: 'Polypharmacy' },
  { folder: 'Clinical - Audits', name: 'Scorecard', desc: 'Scorecard' },
  { folder: 'Clinical - Audits', name: 'Scorecard - Clinical Value', desc: 'Clinical Value Scorecard' },
  /* --- Clinical - Main --- */
  { folder: 'Clinical - Main', name: 'Age/Sex Register', desc: 'Age / Sex Register' },
  { folder: 'Clinical - Main', name: 'Consult Reason for Dates', desc: 'Consult Reason for Dates' },
  { folder: 'Clinical - Main', name: 'Documents for Dates', desc: 'Documents for Dates' },
  { folder: 'Clinical - Main', name: 'Facility Admission for Dates', desc: 'Facility Admissions for Dates' },
  { folder: 'Clinical - Main', name: 'Imaging for Dates', desc: 'Imaging for Dates' },
  { folder: 'Clinical - Main', name: 'Interventions for Dates', desc: 'Interventions for Dates' },
  { folder: 'Clinical - Main', name: 'Labcodes for Dates', desc: 'Labcodes for Dates' },
  { folder: 'Clinical - Main', name: 'Measure Change Velocity', desc: 'Measure Change Velocity' },
  { folder: 'Clinical - Main', name: 'Medications for Dates', desc: 'Medications for Dates' },
  { folder: 'Clinical - Main', name: 'Order Status', desc: null },
  { folder: 'Clinical - Main', name: 'Patient Benefits', desc: null },
  { folder: 'Clinical - Main', name: 'Patient Connections', desc: null },
  { folder: 'Clinical - Main', name: 'Patient by Diagnosis / Fee', desc: 'Patient List by Diagnosis and Fee Codes' },
  { folder: 'Clinical - Main', name: 'Patients by Age', desc: 'Patients by Age' },
  { folder: 'Clinical - Main', name: 'Patients by Procedure', desc: 'Patients by Procedure list' },
  { folder: 'Clinical - Main', name: 'Prescriptions for Dates', desc: 'Prescriptions for Dates' },
  { folder: 'Clinical - Main', name: 'Reaction Risks', desc: 'Reaction Risks (Allergies)' },
  { folder: 'Clinical - Main', name: 'Service Episodes by MRP', desc: null },
  { folder: 'Clinical - Main', name: 'Unresulted Orders', desc: 'Unresulted Orders' },
  { folder: 'Clinical - Main', name: 'Vaccination for Dates', desc: 'Vaccination for dates.' },
  { folder: 'Clinical - Main', name: 'Visits by Author / Date', desc: 'Visits by Author/Date' },
  /* --- Clinical - Pro/Obs --- */
  { folder: 'Clinical - Pro/Obs', name: 'All Consults for Reason - Multi Problems', desc: null },
  { folder: 'Clinical - Pro/Obs', name: 'Claims for Diagnosis', desc: null },
  { folder: 'Clinical - Pro/Obs', name: 'Encounter Forms', desc: null },
  { folder: 'Clinical - Pro/Obs', name: 'Interventions', desc: null },
  { folder: 'Clinical - Pro/Obs', name: 'Lab Result Combinations', desc: null },
  { folder: 'Clinical - Pro/Obs', name: 'Lab Results Change Velocity', desc: null },
  { folder: 'Clinical - Pro/Obs', name: 'Laboratory Results', desc: null },
  { folder: 'Clinical - Pro/Obs', name: 'Medications', desc: null },
  { folder: 'Clinical - Pro/Obs', name: 'Most Recent Consult', desc: null },
  { folder: 'Clinical - Pro/Obs', name: 'Visit for Provider - Multi Problems', desc: null },
  { folder: 'Clinical - Pro/Obs', name: 'Visit With Visit Code - Multi Problem', desc: null },
  /* --- Dynamic Forms --- */
  { folder: 'Dynamic Forms', name: 'AEFI Duration Summary', desc: 'List of AEFI forms with duration information' },
  { folder: 'Dynamic Forms', name: 'AEFI Recommendation State', desc: 'List of AEFI forms recommendation signed state' },
  { folder: 'Dynamic Forms', name: 'ASQ-Line List', desc: 'Early Childhood ASQ-Line List Scores' },
  { folder: 'Dynamic Forms', name: 'NOB Client List', desc: 'NOB Client List' },
  { folder: 'Dynamic Forms', name: 'Number of Births by Maternal Age', desc: 'Number of Births by Maternal Age' },
  { folder: 'Dynamic Forms', name: 'Number of Births by Month', desc: 'Number of Births by Month' },
  /* --- MSP Billing --- */
  { folder: 'MSP Billing', name: 'Complete Unsent Records', desc: 'A list of complete unsent MSP records' },
  { folder: 'MSP Billing', name: 'Previous MSP Messages', desc: 'Re-print a previous MSP Messages report' },
  { folder: 'MSP Billing', name: 'Previous MSP Remittance', desc: 'Re-print a prevous MSP Remittance report' },
  /* --- Practice Management --- */
  { folder: 'Practice Management', name: 'Care Plan Audit', desc: null },
  { folder: 'Practice Management', name: 'Consolidated Data Creation Summary by User', desc: null },
  { folder: 'Practice Management', name: 'Consults for Refer or Seen Pract', desc: null },
  { folder: 'Practice Management', name: 'Consults Summary for Refer or Seen Pract', desc: null },
  { folder: 'Practice Management', name: 'Daily Appointments', desc: null },
  { folder: 'Practice Management', name: 'Health Issue Summary by User', desc: null },
  { folder: 'Practice Management', name: 'Incentive Claim Audit - Fee Code', desc: null },
  { folder: 'Practice Management', name: 'Incentive Claim Patient Registry', desc: null },
  { folder: 'Practice Management', name: 'Incentive Claim Projected Billing Schedule', desc: null },
  { folder: 'Practice Management', name: 'Long Term Medication Entry Summary by User', desc: null },
  { folder: 'Practice Management', name: 'Messages / Tasks Audit', desc: null },
  { folder: 'Practice Management', name: 'Messages for Date Range', desc: null },
  { folder: 'Practice Management', name: 'Patient List', desc: null },
  { folder: 'Practice Management', name: 'Patient Preference Settings', desc: null },
  { folder: 'Practice Management', name: 'Patient Registration', desc: null },
  { folder: 'Practice Management', name: 'Patients by City', desc: null },
  { folder: 'Practice Management', name: 'Patients by Service Center', desc: null },
  { folder: 'Practice Management', name: 'Reaction Risk Summary by User', desc: null },
  { folder: 'Practice Management', name: 'Statistics - Avg Diag Code / Encounter', desc: null },
  { folder: 'Practice Management', name: 'Visit Audit - Diagnostic or Fee Code', desc: null },
  { folder: 'Practice Management', name: 'Visit Mode / Code / Status', desc: null },
  { folder: 'Practice Management', name: 'Visit Status', desc: null },
  { folder: 'Practice Management', name: 'Visit Status - Bill / Note Status', desc: null },
  { folder: 'Practice Management', name: 'Visits-Attend/Appt/Ins', desc: null },
  { folder: 'Practice Management', name: 'Visits-Attend/Ins/Service Anon', desc: null },
  { folder: 'Practice Management', name: 'Visits-Attend/Insurer/Service Code', desc: null },
  { folder: 'Practice Management', name: 'Visits-Attend/Visits/Ins', desc: null },
  { folder: 'Practice Management', name: 'Wait List - Booking Summary', desc: null },
  { folder: 'Practice Management', name: 'Wait List Summary', desc: null },
  /* --- Practice Management - Access --- */
  { folder: 'Practice Management - Access', name: 'Advance Appointment Search', desc: null },
  { folder: 'Practice Management - Access', name: 'Same or Next Day Appts', desc: null },
  { folder: 'Practice Management - Access', name: 'Third Soonest Appt', desc: null },
  { folder: 'Practice Management - Access', name: 'Wait/Appt Duration', desc: null },
  /* --- Recalls / Reminders --- */
  { folder: 'Recalls / Reminders', name: 'Recall List', desc: 'Recall List' },
  { folder: 'Recalls / Reminders', name: 'Reminder List', desc: 'Reminder List' },
  /* --- Report Builders --- */
  { folder: 'Report Builders', name: 'Advanced Medical Report Builder', desc: 'Enhanced Medical Report Builder.' },
  { folder: 'Report Builders', name: 'Cohort Selection Tool', desc: 'Allows user to generate a cohort of patients' },
  { folder: 'Report Builders', name: 'Medical Report Builder', desc: 'Medical Report Builder - Alert Policy Report' },
  /* --- Security / Access Audit --- */
  { folder: 'Security / Access Audit', name: 'Chart Access', desc: null },
  { folder: 'Security / Access Audit', name: 'User Access', desc: null },
  { folder: 'Security / Access Audit', name: 'User Profile Report', desc: null },
]

/* A grid's group bands follow row order, and the capture lists the folders
   alphabetically, so the rows are sorted into that order here rather than
   being kept in the order they were transcribed. */
export const reportRows: ReportRow[] = [...ROWS].sort(
  (a, b) => REPORT_FOLDERS.indexOf(a.folder as typeof REPORT_FOLDERS[number])
    - REPORT_FOLDERS.indexOf(b.folder as typeof REPORT_FOLDERS[number]),
)
