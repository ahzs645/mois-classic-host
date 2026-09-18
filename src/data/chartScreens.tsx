/* ============================================================================
   Chart section configuration.

   Most Patient Chart nodes are the same PowerBuilder window: navy header,
   command row, identity strip, "Search For:", a DataWindow, and a tab set
   underneath. Only the caption, commands, columns and tabs change, so they
   are configuration rather than components.

   PROVENANCE: column sets marked `audited` come from the MOIS field audit in
   reference/field-audit.md — 1,074 verified visible-field -> database-column
   mappings extracted from the evidence set. Those are observed, not guessed.
   The few that remain unmarked are still inferred.
   ========================================================================= */

export type ChartColumn = {
  key: string
  header: string
  width?: number
  align?: 'left' | 'center' | 'right'
  dots?: boolean
}

export type ChartScreen = {
  title: string
  commands: (string | null)[]
  disabled?: string[]
  columns: ChartColumn[]
  tabs?: string[]
  rows?: Record<string, string>[]
  /** screens without an active-encounter block on the identity strip */
  noEncounter?: boolean
  /** column set verified against the MOIS field audit */
  audited?: boolean
  /** tabs wrap the grid itself; there is no detail form underneath */
  gridOnly?: boolean
}

const SAVE_SET = ['New Record', 'Delete Record', 'Save', 'Undo', 'Refresh']
const DIS = ['Save', 'Undo']

const col = (key: string, header: string, width?: number, align?: ChartColumn['align']): ChartColumn =>
  ({ key, header, width, align })
const dots = (key: string): ChartColumn => ({ key, header: '', dots: true })

export const chartScreens: Record<string, ChartScreen> = {
  summary: {
    title: 'Patient Summary',
    commands: ['Refresh', 'Print', 'Attachment'],
    columns: [
      col('section', 'Section', 190),
      col('detail', 'Detail'),
      col('updated', 'Last Updated', 130, 'center'),
      col('by', 'Updated By', 150),
    ],
    rows: [
      { section: 'ALLERGY / INTOLERANCES', detail: 'No known allergies', updated: '2026.07.02', by: 'GRUBB, HELENA' },
      { section: 'HEALTH ISSUES', detail: 'ACROPHOBIA', updated: '2026.08.12', by: 'JALIL, AHMAD' },
      { section: 'CARE PLAN', detail: 'DEV AUDIT GOAL (INITIATION)', updated: '2026.08.12', by: 'JALIL, AHMAD' },
      { section: 'LONG TERM MEDS', detail: '—', updated: '', by: '' },
    ],
  },

  determinants: {
    title: 'Determinants of Health',
    commands: SAVE_SET, disabled: DIS,
    columns: [
      col('date', 'Date', 86, 'center'), col('determinant', 'Determinant', 210),
      col('value', 'Value', 150), col('note', 'Note'), col('by', 'Recorded By', 140),
    ],
    tabs: ['Detail', 'History'],
  },

  measures: {
    title: 'Measures',
    commands: ['New Record', 'Delete Record', 'Save', 'Undo', 'Refresh', 'Graph', 'Calculator', 'Template', 'Other Template'],
    disabled: DIS,
    columns: [
      col('collected', 'Collected', 88, 'center'),
      col('by', 'Ordered By', 120),
      col('code', 'Code', 62, 'center'),
      dots('d'),
      col('name', 'Test Name'),
      col('value', 'Value', 110, 'center'),
      col('flag', 'Flag', 52, 'center'),
      col('units', 'Units', 80, 'center'),
      col('status', 'Status', 62, 'center'),
    ],
    tabs: ['Report', 'Detail'],
    rows: [{ collected: '2026.08.10', by: '', code: '90754', name: 'OXYTETRACYCLINE SPEC-MCNT', value: '', flag: '-', units: 'mg/kg; ppm', status: '' }],
    audited: true,
  },

  consults: {
    title: 'Consults',
    commands: ['New Record', 'Delete Record', 'Save', 'Undo', 'Refresh', 'Mark for Review', 'Print', 'Attachment'],
    disabled: DIS,
    columns: [
      col('refer', 'Refer Date', 88, 'center'),
      col('seen', 'Seen Date', 88, 'center'),
      col('by', 'Referred By', 160),
      col('seenby', 'Seen By', 160),
      col('reason', 'Reason for Consult Request'),
      col('s', 'S', 24, 'center'),
      col('m', 'M', 24, 'center'),
    ],
    tabs: ['Report', 'Detail'],
    audited: true,
  },

  procedures: {
    title: 'Procedures',
    commands: ['New Record', 'Delete Record', 'Save', 'Undo', 'Refresh', 'Mark for Review', 'Print', 'Attachment'],
    disabled: DIS,
    columns: [
      col('performed', 'Performed', 88, 'center'),
      col('by', 'Performed By', 170),
      col('desc', 'Description'),
      dots('d'),
      col('diag', 'Diag Desc', 200),
    ],
    tabs: ['Report', 'Detail'],
    audited: true,
  },

  interventions: {
    title: 'Interventions',
    commands: SAVE_SET, disabled: DIS,
    columns: [
      col('start', 'Start', 82, 'center'), col('end', 'End', 82, 'center'),
      col('intervention', 'Intervention'), dots('d'),
      col('by', 'Provided By', 160), col('status', 'Status', 90, 'center'),
    ],
    tabs: ['Detail', 'Linked Goals'],
  },

  famhx: {
    title: 'Family History',
    commands: SAVE_SET, disabled: DIS,
    columns: [
      col('relation', 'Relation', 120, 'center'), col('condition', 'Condition'), dots('d'),
      col('age', 'Age at Onset', 84, 'center'), col('alive', 'Living', 60, 'center'),
      col('note', 'Note', 220),
    ],
    tabs: ['Detail'],
  },

  allergy: {
    title: 'Allergy / Intolerances',
    commands: ['New Record', 'Delete Record', 'Save', 'Undo', 'Refresh', 'Attachment'],
    disabled: DIS,
    columns: [
      col('onset', 'Onset', 88, 'center'),
      col('tilde', '~', 26, 'center'),
      col('type', 'Type', 100, 'center'),
      col('category', 'Category', 110, 'center'),
      col('code', 'Code', 70, 'center'),
      col('agent', 'Agent'),
    ],
    tabs: ['Detail', 'Reaction Risks', 'Events'],
    rows: [{ onset: '', tilde: '', type: '', category: '', code: '', agent: 'NO KNOWN ALLERGIES' }],
    audited: true,
  },
  reaction: {
    title: 'Reaction Risks',
    commands: SAVE_SET, disabled: DIS,
    columns: [
      col('agent', 'Agent', 220), col('reaction', 'Reaction'), dots('d'),
      col('severity', 'Severity', 90, 'center'), col('by', 'Recorded By', 140),
    ],
  },
  events: {
    title: 'Allergy Events',
    commands: SAVE_SET, disabled: DIS,
    columns: [
      col('date', 'Date', 86, 'center'), col('agent', 'Agent', 200),
      col('event', 'Event'), col('outcome', 'Outcome', 130, 'center'),
    ],
  },

  ltm: {
    title: 'Long Term Meds',
    commands: SAVE_SET.concat(['Print', 'Attachment']), disabled: DIS,
    columns: [
      col('start', 'Start', 82, 'center'), col('drug', 'Drug'), dots('d'),
      col('dose', 'Dose', 110, 'center'), col('route', 'Route', 70, 'center'),
      col('freq', 'Frequency', 110, 'center'), col('status', 'ST', 34, 'center'),
    ],
    tabs: ['Detail', 'History'],
  },
  rx: {
    title: 'Prescriptions',
    commands: ['New Record', 'Quick Entry', 'Delete Record', 'Save', 'Undo', 'Refresh', 'Print', 'Attachment'],
    disabled: DIS,
    columns: [
      col('date', 'Date', 82, 'center'), col('drug', 'Drug'), dots('d'),
      col('dose', 'Dose', 100, 'center'), col('qty', 'Qty', 50, 'right'),
      col('repeats', 'Rpt', 42, 'center'), col('prescriber', 'Prescriber', 150),
      col('status', 'ST', 34, 'center'),
    ],
    tabs: ['Detail', 'Distribution', 'History'],
  },
  printhx: {
    title: 'Prescription Print History',
    commands: ['Refresh', 'Print'],
    columns: [
      col('printed', 'Printed', 120, 'center'), col('drug', 'Drug'),
      col('by', 'Printed By', 160), col('copies', 'Copies', 60, 'center'),
    ],
  },
  mar: {
    title: 'MAR',
    commands: ['Refresh', 'Print'],
    columns: [
      col('when', 'Date/Time', 120, 'center'),
      col('by', 'Given By', 150),
      col('med', 'Medication'),
      col('dosage', 'Dosage', 100, 'center'),
      col('route', 'Route', 80, 'center'),
      col('site', 'Site', 90, 'center'),
    ],
    audited: true,
  },

  socialhx: {
    title: 'Social History',
    commands: SAVE_SET, disabled: DIS,
    columns: [
      col('date', 'Date', 86, 'center'), col('topic', 'Topic', 180),
      col('value', 'Value', 170), col('note', 'Note'), col('by', 'Recorded By', 140),
    ],
    tabs: ['Detail'],
  },
  documents: {
    title: 'Documents',
    commands: ['New Record', 'Delete Record', 'Save', 'Undo', 'Refresh', 'Mark for Review', 'Print', 'Attachment'],
    disabled: DIS,
    columns: [
      col('date', 'Date', 88, 'center'),
      col('author', 'Author', 160),
      col('type', 'Document Type', 150),
      col('venue', 'Source Venue', 130),
      col('note', 'Note'),
      col('s', 'S', 24, 'center'),
      col('m', 'M', 24, 'center'),
      col('clip', '\u{1F4CE}', 22, 'center'),
    ],
    tabs: ['Report', 'Detail', 'Distribution'],
    audited: true,
  },

  issues: {
    title: 'Health Issues',
    commands: ['New Record', 'Delete Record', 'Save', 'Undo', 'Refresh', 'Attachment'],
    disabled: DIS,
    columns: [
      col('start', 'Start', 82, 'center'),
      col('end', 'End', 82, 'center'),
      col('problem', 'Problem Name'),
      dots('d'),
      col('rank', 'Rank', 52, 'center'),
      col('certainty', 'Certainty', 96, 'center'),
      col('severity', 'Severity', 90, 'center'),
      col('s', 'S', 24, 'center'),
    ],
    tabs: ['Detail', 'Linked Goals'],
    rows: [{ start: '2026.08.12', end: '', problem: 'ACROPHOBIA', rank: '', certainty: 'Confirmed', severity: '', s: '' }],
    audited: true,
  },

  careplan: {
    title: 'Care Plan Summary',
    commands: ['Refresh', 'Print'],
    columns: [
      col('section', 'Section', 170), col('detail', 'Detail'),
      col('phase', 'Phase', 110, 'center'), col('by', 'Recorded By', 150),
    ],
    rows: [{ section: 'GOALS', detail: 'DEV AUDIT GOAL', phase: 'INITIATION', by: 'JALIL, AHMAD' }],
  },
  prefs: {
    title: 'Preferences',
    commands: ['New Record', 'Delete Record', 'Save', 'Undo', 'Refresh'],
    disabled: DIS,
    columns: [
      col('start', 'Start', 86, 'center'),
      col('type', 'Type', 130, 'center'),
      col('subject', 'Subject', 220),
      col('detail', 'Detail'),
      col('s', 'S', 24, 'center'),
      col('demo', 'Show on Demo', 92, 'center'),
    ],
    tabs: ['Detail'],
    audited: true,
  },
  resources: {
    title: 'Patient Resources',
    commands: SAVE_SET, disabled: DIS,
    columns: [
      col('resource', 'Resource', 240), col('detail', 'Detail'),
      col('given', 'Given', 100, 'center'), col('by', 'Given By', 150),
    ],
  },
  summarysettings: {
    title: 'Summary Settings',
    commands: ['New Record', 'Delete Record', 'Save', 'Refresh', 'Add from Template'],
    columns: [
      col('order', 'Order', 80, 'center'),
      col('label', 'Section Label', 300),
      col('type', 'Type', 130),
      col('pad', ''),
    ],
    tabs: ['Care Plan Sections', 'Care Plan Elements'],
    gridOnly: true,
    rows: [
      { order: '450', label: 'ORDER', type: 'SYSTEM', pad: '' },
      { order: '500', label: 'MEASUREMENTS', type: 'SYSTEM', pad: '' },
      { order: '500', label: 'MEASUREMENTS', type: 'SYSTEM', pad: '' },
      { order: '500', label: 'MEASUREMENTS', type: 'SYSTEM', pad: '' },
      { order: '500', label: 'MEASUREMENTS', type: 'SYSTEM', pad: '' },
    ],
    audited: true,
  },

  forms: {
    title: 'Forms',
    commands: SAVE_SET.concat(['Print']), disabled: DIS,
    columns: [
      col('date', 'Date', 86, 'center'), col('form', 'Form Name'),
      col('type', 'Type', 110, 'center'), col('status', 'Status', 90, 'center'),
      col('by', 'Completed By', 150),
    ],
    tabs: ['Detail'],
  },
  paper: { title: 'Paper Forms', commands: ['Refresh', 'Print'],
    columns: [col('form', 'Form Name'), col('category', 'Category', 150, 'center'), col('revised', 'Revised', 100, 'center')] },
  dynamic: { title: 'Dynamic Forms', commands: ['New Record', 'Refresh', 'Print'],
    columns: [col('form', 'Form Name'), col('version', 'Version', 80, 'center'), col('status', 'Status', 100, 'center')] },
  encforms: { title: 'Encounter Forms', commands: ['New Record', 'Refresh', 'Print'],
    columns: [col('date', 'Date', 86, 'center'), col('form', 'Form Name'), col('encounter', 'Encounter #', 110, 'center'), col('status', 'Status', 100, 'center')] },

  admissions: {
    title: 'Facility Admissions',
    commands: ['New Record', 'Delete Record', 'Save', 'Undo', 'Refresh', 'Print', 'Attachment'],
    disabled: DIS,
    columns: [
      col('admitted', 'Admitted', 92, 'center'),
      col('discharged', 'Discharged', 92, 'center'),
      col('by', 'Admit By', 160),
      col('facility', 'Facility', 200),
      col('desc', 'Description'),
      col('clip', '\u{1F4CE}', 22, 'center'),
    ],
    tabs: ['Report', 'Detail'],
    audited: true,
  },
  alerts: {
    title: 'Alerts',
    commands: ['New Record', 'Delete Record', 'Save', 'Undo', 'Refresh'],
    disabled: DIS,
    columns: [
      col('start', 'Start', 82, 'center'),
      col('end', 'End', 82, 'center'),
      col('code', 'Code', 70, 'center'),
      col('desc', 'Description', 220),
      col('detail', 'Detail'),
      col('s', 'S', 24, 'center'),
      col('m', 'M', 24, 'center'),
      col('clip', '\u{1F4CE}', 22, 'center'),
    ],
    tabs: ['Detail'],
    audited: true,
  },
  mhk: {
    title: 'myhealthkey',
    commands: ['Refresh'],
    columns: [
      col('when', 'Date / Time', 130, 'center'), col('event', 'Event'),
      col('channel', 'Channel', 110, 'center'), col('status', 'Status', 100, 'center'),
    ],
  },
}

/* --- Scheduler sections that are not a day book -------------------------- */
export const schedulerScreens: Record<string, ChartScreen> = {
  waiting: {
    title: 'Waiting List', noEncounter: true,
    commands: ['New Entry', 'Delete Entry', 'Save', 'Undo', 'Refresh', 'Book Appt'],
    disabled: DIS,
    columns: [
      col('added', 'Added', 86, 'center'), col('chart', 'Chart', 68, 'center'),
      col('first', 'First Name', 110), col('last', 'Last Name', 110),
      col('provider', 'Provider', 160), col('reason', 'Visit Reason'),
      col('priority', 'Priority', 70, 'center'),
    ],
  },
  'w-prov': { title: 'Waiting List - Provider Lists', noEncounter: true, commands: ['Refresh', 'Print List'],
    columns: [col('provider', 'Provider', 200), col('waiting', 'Waiting', 70, 'center'), col('oldest', 'Oldest Entry', 110, 'center')] },
  'w-res': { title: 'Waiting List - Resource Lists', noEncounter: true, commands: ['Refresh', 'Print List'],
    columns: [col('resource', 'Resource', 200), col('waiting', 'Waiting', 70, 'center'), col('oldest', 'Oldest Entry', 110, 'center')] },

  blocks: {
    title: 'Reservation Blocks', noEncounter: true,
    commands: ['New Block', 'Delete Block', 'Save', 'Undo', 'Refresh'], disabled: DIS,
    columns: [
      col('date', 'Date', 86, 'center'), col('from', 'From', 60, 'center'), col('to', 'To', 60, 'center'),
      col('owner', 'Provider / Resource', 190), col('reason', 'Reason'),
      col('recurs', 'Recurs', 70, 'center'),
    ],
  },
  'b-prov': { title: 'Reservation Blocks - Provider', noEncounter: true, commands: ['New Block', 'Delete Block', 'Refresh'],
    columns: [col('date', 'Date', 86, 'center'), col('from', 'From', 60, 'center'), col('to', 'To', 60, 'center'), col('provider', 'Provider', 200), col('reason', 'Reason')] },
  'b-res': { title: 'Reservation Blocks - Resource', noEncounter: true, commands: ['New Block', 'Delete Block', 'Refresh'],
    columns: [col('date', 'Date', 86, 'center'), col('from', 'From', 60, 'center'), col('to', 'To', 60, 'center'), col('resource', 'Resource', 200), col('reason', 'Reason')] },

  shift: {
    title: 'Shift Manager', noEncounter: true,
    commands: ['New Shift', 'Delete Shift', 'Save', 'Undo', 'Refresh', 'Generate'], disabled: DIS,
    columns: [
      col('from', 'Effective From', 100, 'center'), col('to', 'Effective To', 100, 'center'),
      col('owner', 'Provider / Resource', 190), col('pattern', 'Pattern', 130, 'center'),
      col('loc', 'Service Location', 170), col('slots', 'Slots', 56, 'center'),
    ],
  },
  's-prov': { title: 'Provider Shifts', noEncounter: true, commands: ['New Shift', 'Delete Shift', 'Refresh', 'Generate'],
    columns: [col('from', 'Effective From', 100, 'center'), col('to', 'Effective To', 100, 'center'), col('provider', 'Provider', 190), col('pattern', 'Pattern', 130, 'center'), col('loc', 'Service Location', 170)] },
  's-res': { title: 'Resource Shifts', noEncounter: true, commands: ['New Shift', 'Delete Shift', 'Refresh', 'Generate'],
    columns: [col('from', 'Effective From', 100, 'center'), col('to', 'Effective To', 100, 'center'), col('resource', 'Resource', 190), col('pattern', 'Pattern', 130, 'center'), col('loc', 'Service Location', 170)] },
}

/* --- The other five modules ---------------------------------------------
   Their trees are not in the screenshot set, so these follow the MOIS
   naming conventions rather than transcribing anything. The window shape is
   the documented one; the node lists are inferred.                       */
export const moduleScreens: Record<string, ChartScreen> = {
  /* Workspace */
  'ws-inbox': { title: 'Workspace - Inbox', noEncounter: true,
    commands: ['Refresh', 'Mark Reviewed', 'Forward', 'Print'],
    columns: [col('received', 'Received', 110, 'center'), col('type', 'Type', 110, 'center'),
      col('patient', 'Patient', 170), col('subject', 'Subject'), col('from', 'From', 150), col('m', 'M', 24, 'center')] },
  'ws-tasks': { title: 'Workspace - Tasks', noEncounter: true,
    commands: ['New Task', 'Delete Task', 'Save', 'Undo', 'Refresh'], disabled: DIS,
    columns: [col('due', 'Due', 92, 'center'), col('patient', 'Patient', 170), col('task', 'Task'),
      col('ack', 'Ack.', 46, 'center'), col('complete', 'Complete', 62, 'center'), col('by', 'Created By', 140)] },
  'ws-review': { title: 'Workspace - Marked for Review', noEncounter: true,
    commands: ['Refresh', 'Clear Review', 'Print'],
    columns: [col('marked', 'Marked', 100, 'center'), col('patient', 'Patient', 170),
      col('record', 'Record', 150, 'center'), col('detail', 'Detail'), col('by', 'Marked By', 150)] },
  'ws-recent': { title: 'Workspace - Recent Charts', noEncounter: true,
    commands: ['Refresh', 'Go To Chart'],
    columns: [col('opened', 'Opened', 120, 'center'), col('chart', 'Chart', 72, 'center'),
      col('patient', 'Patient', 200), col('dob', 'DoB', 96, 'center'), col('loc', 'Service Location', 170)] },

  /* Billing */
  'bl-claims': { title: 'Billing - Claims', noEncounter: true,
    commands: ['New Claim', 'Delete Claim', 'Save', 'Undo', 'Refresh', 'Submit', 'Print'], disabled: DIS,
    columns: [col('service', 'Service', 86, 'center'), col('chart', 'Chart', 66, 'center'),
      col('patient', 'Patient', 170), col('fee', 'Fee Code', 74, 'center'), col('diag', 'Diag', 60, 'center'),
      col('amount', 'Amount', 80, 'right'), col('payor', 'Payor', 76, 'center'), col('status', 'ST', 34, 'center')] },
  'bl-batches': { title: 'Billing - Submission Batches', noEncounter: true,
    commands: ['Refresh', 'Submit', 'Print'],
    columns: [col('created', 'Created', 110, 'center'), col('batch', 'Batch No.', 100, 'center'),
      col('claims', 'Claims', 60, 'right'), col('total', 'Total', 90, 'right'), col('status', 'Status', 110, 'center')] },
  'bl-remit': { title: 'Billing - Remittances', noEncounter: true,
    commands: ['Refresh', 'Reconcile', 'Print'],
    columns: [col('received', 'Received', 110, 'center'), col('payor', 'Payor', 110, 'center'),
      col('paid', 'Net Paid', 90, 'right'), col('claims', 'Claims', 60, 'right'), col('status', 'Status', 110, 'center')] },
  'bl-rejects': { title: 'Billing - Rejections', noEncounter: true,
    commands: ['Refresh', 'Correct', 'Resubmit', 'Print'],
    columns: [col('service', 'Service', 86, 'center'), col('patient', 'Patient', 170),
      col('fee', 'Fee Code', 74, 'center'), col('reason', 'Rejection Reason'), col('code', 'Code', 60, 'center')] },

  /* Administration */
  'ad-users': { title: 'Administration - Users', noEncounter: true,
    commands: ['New User', 'Delete User', 'Save', 'Undo', 'Refresh', 'Reset Password'], disabled: DIS,
    columns: [col('user', 'User ID', 100, 'center'), col('name', 'Name', 200),
      col('role', 'Role', 150, 'center'), col('loc', 'Default Location', 180), col('active', 'Active', 60, 'center')] },
  'ad-providers': { title: 'Administration - Providers', noEncounter: true,
    commands: ['New Record', 'Delete Record', 'Save', 'Undo', 'Refresh'], disabled: DIS,
    columns: [col('code', 'Code', 80, 'center'), col('name', 'Provider', 210),
      col('type', 'Type', 130, 'center'), col('msp', 'MSP No.', 90, 'center'), col('active', 'Active', 60, 'center')] },
  'ad-locations': { title: 'Administration - Service Locations', noEncounter: true,
    commands: ['New Record', 'Delete Record', 'Save', 'Undo', 'Refresh'], disabled: DIS,
    columns: [col('code', 'Code', 80, 'center'), col('name', 'Service Location', 230),
      col('type', 'Type', 130, 'center'), col('msp', 'MSP Loc.', 80, 'center'), col('active', 'Active', 60, 'center')] },
  'ad-tables': { title: 'Administration - Maintenance Tables', noEncounter: true,
    commands: ['Refresh', 'Edit', 'Print'],
    columns: [col('table', 'Table', 220), col('desc', 'Description'),
      col('rows', 'Rows', 70, 'right'), col('updated', 'Last Updated', 120, 'center')] },
  'ad-audit': { title: 'Administration - Audit Log', noEncounter: true,
    commands: ['Refresh', 'Print'],
    columns: [col('when', 'Date / Time', 130, 'center'), col('user', 'User', 90, 'center'),
      col('action', 'Action', 130, 'center'), col('record', 'Record', 160), col('detail', 'Detail')] },

  /* Data Exchange */
  'dx-inbound': { title: 'Data Exchange - Inbound', noEncounter: true,
    commands: ['Refresh', 'Reprocess', 'Print'],
    columns: [col('received', 'Received', 130, 'center'), col('source', 'Source', 140, 'center'),
      col('type', 'Message Type', 130, 'center'), col('patient', 'Patient', 170), col('status', 'Status', 100, 'center')] },
  'dx-outbound': { title: 'Data Exchange - Outbound', noEncounter: true,
    commands: ['Refresh', 'Resend', 'Print'],
    columns: [col('sent', 'Sent', 130, 'center'), col('target', 'Target', 140, 'center'),
      col('type', 'Message Type', 130, 'center'), col('patient', 'Patient', 170), col('status', 'Status', 100, 'center')] },
  'dx-errors': { title: 'Data Exchange - Errors', noEncounter: true,
    commands: ['Refresh', 'Reprocess', 'Dismiss', 'Print'],
    columns: [col('when', 'Date / Time', 130, 'center'), col('source', 'Source', 140, 'center'),
      col('error', 'Error'), col('code', 'Code', 70, 'center')] },
  'dx-hl7': { title: 'Data Exchange - HL7 Interfaces', noEncounter: true,
    commands: ['Refresh', 'Start', 'Stop'],
    columns: [col('name', 'Interface', 200), col('direction', 'Direction', 100, 'center'),
      col('host', 'Host', 170), col('port', 'Port', 60, 'center'), col('state', 'State', 90, 'center')] },

  /* Reports */
  'rp-clinical': { title: 'Reports - Clinical', noEncounter: true,
    commands: ['Run', 'Schedule', 'Print'],
    columns: [col('report', 'Report', 260), col('desc', 'Description'), col('lastrun', 'Last Run', 120, 'center')] },
  'rp-financial': { title: 'Reports - Financial', noEncounter: true,
    commands: ['Run', 'Schedule', 'Print'],
    columns: [col('report', 'Report', 260), col('desc', 'Description'), col('lastrun', 'Last Run', 120, 'center')] },
  'rp-admin': { title: 'Reports - Administrative', noEncounter: true,
    commands: ['Run', 'Schedule', 'Print'],
    columns: [col('report', 'Report', 260), col('desc', 'Description'), col('lastrun', 'Last Run', 120, 'center')] },
  'rp-scheduled': { title: 'Reports - Scheduled', noEncounter: true,
    commands: ['Refresh', 'Run Now', 'Delete'],
    columns: [col('report', 'Report', 230), col('schedule', 'Schedule', 140, 'center'),
      col('next', 'Next Run', 130, 'center'), col('by', 'Owner', 150)] },
}
