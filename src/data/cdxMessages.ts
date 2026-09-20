/* ============================================================================
   CDX secure messaging — Inbound Messages, Outbound Messages, and the two
   windows they open.

   These live in Data Exchange > Electronic Interfaces (`dx-inbound-msg`,
   `dx-outbound-msg`).

   PROVENANCE
     304753/1dd503bc0674  1024x745, 1:1, TRUE COLOUR (2067 colours). This is
                          the reference capture for every grid colour in the
                          emulator: it returns #c8dcfa as exactly (200,220,250)
                          and #e89c84 as exactly (232,156,132), where the
                          palettised classic captures quantise them.
     304753/daebea8b39ad  1015x739, 1:1, palettised — Outbound Messages and
                          the Transmission Log.
     304753/d65c2aa68919  1016x737, 1:1 — the Quality Review tab.
     304753/70a523664c14  1004x717 — Patient Message Detail.
     304754/72cdbce06e3b  753x706 — the Record Navigator (the "tear off").

   The x positions in those captures are frame-absolute and include the 186px
   navigator, which is why the work area starts near x=199; only the COLUMN
   WIDTHS below are used, and those are frame-independent.

   PROSE vs CAPTURE. 304753's prose names five inbound columns
   (Received / Message From / Chart No. / Status / Msgs). The capture has
   NINE, and the capture wins. The outbound grid likewise carries a `Sex`
   column and a paperclip count column the prose does not mention.

   Patients, facilities and messages are synthetic training data.
   ========================================================================= */

export const CDX = {
  /** view-header title band, measured exactly (0,64,128) */
  viewHeader: '#004080',
  /** the filter panel above every CDX list
      (quantised to (198,255,198) in the two palettised captures) */
  filterBand: '#c0ffc0',
  /** grid header */
  gridHeader: '#c8dcfa',
  /** alternating grid rows */
  rowAlt: '#e8e8e8',
  /** selected grid row */
  select: '#e89c84',
  /** CDX print-preview row headers, white bold text */
  previewHead: '#3196bd',
  /** CDX print-preview value cells, navy text */
  previewCell: '#efefef',
  /** the classic-theme group band on the Quality Review tab */
  bandClassic: '#ded7d6',
  /** Record Navigator: patient group rows */
  navGroup: 'rgb(222, 235, 255)',
  /** Record Navigator: child record rows alternate with white */
  navRowAlt: 'rgb(239, 235, 239)',
  /** Record Navigator's selected record row — a distinctly LIGHTER salmon
      than #e89c84, and unique to that window */
  navSelect: 'rgb(247, 199, 189)',
} as const

/** Grid rows are on a 17px pitch and the header band is 16px tall
    (y 189-204 in 304753/1dd503bc0674). */
export const CDX_GRID = { headerH: 16, rowPitch: 17 } as const

/* --- Inbound Messages ---------------------------------------------------- */

/** Three buttons of 93px each (rules at x 199, 292, 385, 478). */
export const INBOUND_COMMANDS = ['Open Detail (F4)', 'Refresh List (F5)', 'Close Window']

/** Four buttons of 93px each (rules at 197, 290, 383, 476, 569) — the extra
    one is `Open Chart`. */
export const OUTBOUND_COMMANDS = ['Open Detail (F4)', 'Refresh List (F5)', 'Open Chart', 'Close Window']

export const CDX_COMMAND_W = 93

/** `Quality Review (0)` in 304753/1dd503bc0674, bare `Quality Review` in
    304753/d65c2aa68919 — which simultaneously shows 18 errors and 23
    warnings. The count in the caption does not track the grid. */
export const INBOUND_TABS = ['Messages', 'Quality Review (0)']

export type CdxColumn = { key: string; header: string; width?: number; align?: 'left' | 'center' | 'right' }

/** Column widths measured off the true-colour reference capture. The row
    indicator is 13px, which is the kit's own gutter width. */
export const INBOUND_COLUMNS: CdxColumn[] = [
  { key: 'received', header: 'Received', width: 73, align: 'center' },
  { key: 'from', header: 'Message From', width: 140 },
  { key: 'chart', header: 'Chart No.', width: 50, align: 'center' },
  { key: 'patient', header: 'Patient Name', width: 145 },
  { key: 'sex', header: 'Sex', width: 28, align: 'center' },
  { key: 'dob', header: 'DOB', width: 63, align: 'center' },
  { key: 'phn', header: 'PHN', width: 122 },
  { key: 'status', header: 'Status', width: 100 },
  { key: 'msgs', header: 'Msgs', width: 42, align: 'center' },
]

export type InboundRow = {
  received: string
  from: string
  chart: string
  patient: string
  sex: string
  dob: string
  phn: string
  /** MATCHED / UNMATCHED / FAILED are the three seen live; the prose adds
      PRINTED and IGNORED, which no capture shows. */
  status: string
  msgs: string
}

export const INBOUND_ROWS: InboundRow[] = [
  { received: '2013.11.21', from: 'UNIVERSITY HOSPITAL LAB', chart: '3924', patient: 'MORRISON, ASHLEE', sex: 'F', dob: '1979.10.23', phn: 'BC 915125951', status: 'MATCHED', msgs: '3' },
  { received: '2013.11.20', from: 'NORTHERN IMAGING ASSOC.', chart: '', patient: 'CAPP, ANDY', sex: 'M', dob: '1966.02.14', phn: 'BC 910044182', status: 'UNMATCHED', msgs: '1' },
  { received: '2013.11.18', from: 'DR. DEREK SHEPHERD', chart: '4180', patient: 'SMITH, MAGGIE', sex: 'F', dob: '1988.07.04', phn: 'BC 917760233', status: 'MATCHED', msgs: '2' },
  { received: '2013.11.14', from: 'ACROPOLIS MANOR', chart: '', patient: 'BROWN, FARMER', sex: 'M', dob: '1951.12.02', phn: 'BC 912003847', status: 'FAILED', msgs: '1' },
  { received: '2013.11.07', from: 'UNIVERSITY HOSPITAL LAB', chart: '3011', patient: 'HALE, MARGARET', sex: 'F', dob: '1943.05.30', phn: 'BC 913448190', status: 'MATCHED', msgs: '5' },
]

/** `Date Range:` is two edits with the parentheticals the capture prints
    between and after them. */
export const INBOUND_FILTERS = {
  from: '2000.11.07',
  to: '2013.11.21',
  processingStatus: ['ALL', 'MATCHED', 'UNMATCHED', 'FAILED', 'PRINTED', 'IGNORED'],
  batchRef: ['', 'CDX-2013-1121-01', 'CDX-2013-1120-04'],
}

/* --- Outbound Messages --------------------------------------------------- */

export const OUTBOUND_COLUMNS: CdxColumn[] = [
  { key: 'sent', header: 'Sent', width: 84, align: 'center' },
  { key: 'from', header: 'Message From', width: 174 },
  { key: 'type', header: 'Message Type', width: 145 },
  { key: 'chart', header: 'Chart No.', width: 52, align: 'center' },
  { key: 'patient', header: 'Patient Name', width: 154 },
  { key: 'sex', header: 'Sex', width: 27, align: 'center' },
  { key: 'status', header: 'Status', width: 112 },
  { key: 'clip', header: '\u{1F4CE}', width: 17, align: 'center' },
]

export type OutboundRow = {
  sent: string
  from: string
  type: string
  chart: string
  patient: string
  sex: string
  status: string
  clip: string
}

export const OUTBOUND_ROWS: OutboundRow[] = [
  { sent: '2013.11.21 09:14', from: 'DR. DEREK SHEPHERD', type: 'REFERRAL NOTE', chart: '3924', patient: 'MORRISON, ASHLEE', sex: 'F', status: 'SENT_OK', clip: '1' },
  { sent: '2013.11.20 16:02', from: 'DR. DEREK SHEPHERD', type: 'CONSULT NOTE', chart: '4180', patient: 'SMITH, MAGGIE', sex: 'F', status: 'SENT_OK', clip: '' },
  { sent: '2013.11.19 11:38', from: 'ADMINISTRATOR', type: 'INFORMATION REQUEST', chart: '3011', patient: 'HALE, MARGARET', sex: 'F', status: 'FAILED', clip: '' },
]

export const OUTBOUND_FILTERS = {
  transmissionStatus: ['ALL', 'SENT_OK', 'RENDERED', 'CREATED', 'FAILED'],
}

/** Separators at 308, 465, 599, 1004. */
export const TRANSMISSION_LOG_COLUMNS: CdxColumn[] = [
  { key: 'when', header: 'Date / Time', width: 108 },
  { key: 'user', header: 'User', width: 155 },
  { key: 'status', header: 'Status', width: 132 },
  { key: 'detail', header: 'Detail', width: 403 },
]

/** Three rows, newest first — note that only SENT_OK and CREATED carry a
    User; RENDERED is the server's own step and its User cell is empty. */
export const TRANSMISSION_LOG = [
  { when: '2013.11.21 09:14', user: 'ADMINISTRATOR', status: 'SENT_OK', detail: 'Message sent successfully.' },
  { when: '2013.11.21 09:14', user: '', status: 'RENDERED', detail: 'Message rendered to CDA for transmission.' },
  { when: '2013.11.21 09:13', user: 'ADMINISTRATOR', status: 'CREATED', detail: 'Message created by MOIS.' },
]

/* --- Quality Review tab --------------------------------------------------
   304753/d65c2aa68919. Group band `Messages Flagged for Review` with a
   right-aligned, checked `Include Warnings` checkbox; a green band carrying
   `Downloaded From:` / `To:` / `(optional)`; then the grid.

   The grid's column widths were NOT measured in the capture — only its four
   columns and its rows. The widths below are inferred to fit the captions. */
export const QUALITY_REVIEW_FILTERS = { from: '2001.03.13', to: '2014.03.27' }

export const QUALITY_REVIEW_COLUMNS: CdxColumn[] = [
  { key: 'item', header: 'Item', width: 260 },
  { key: 'errors', header: '⊗ Errors', width: 90, align: 'center' },
  { key: 'warnings', header: '⚠ Warnings', width: 100, align: 'center' },
  { key: 'tear', header: '', width: 90, align: 'center' },
]

export type QualityReviewRow = { item: string; errors: string; warnings: string; total?: boolean }

export const QUALITY_REVIEW_ROWS: QualityReviewRow[] = [
  { item: 'Imaging', errors: '-', warnings: '3' },
  { item: 'Consults', errors: '14', warnings: '15' },
  { item: 'Facility Admissions', errors: '4', warnings: '5' },
  { item: '', errors: '18', warnings: '23', total: true },
]

/** Verbatim from 304754. Errors must be fixed before the record is placed in
    the chart; warnings are already in the chart with information missing. */
export const QUALITY_REVIEW_RULES = {
  errors: [
    'Consults: Reason for Consult', 'Procedures: Description', 'Orders: Description',
    'Facility Admissions: Description', 'Documents: Note',
  ],
  warnings: [
    'Imaging: Code', 'Consults: Code', 'Procedures: Code', 'Orders: Code',
    'Facility Admissions: Code',
  ],
  /** "90 days previous to today's date" (304753) */
  defaultLookBack: '90 days previous to today’s date',
}

/* --- Patient Message Detail (double-click an inbound row) ----------------- */

export const MESSAGE_DETAIL_COLUMNS: CdxColumn[] = [
  { key: 'docDate', header: 'Document Date', width: 100, align: 'center' },
  { key: 'facility', header: 'Facility', width: 190 },
  { key: 'facilityRef', header: 'Facility Ref.', width: 110 },
  { key: 'processDate', header: 'Process Date', width: 100, align: 'center' },
  { key: 'processStatus', header: 'Process Status', width: 110 },
  { key: 'docType', header: 'Document Type', width: 150 },
  { key: 'clip', header: '\u{1F4CE}', width: 26, align: 'center' },
]

export const MESSAGE_DETAIL_ROWS = [
  { docDate: '2013.11.20', facility: 'NORTHERN IMAGING ASSOC.', facilityRef: 'NIA-884120', processDate: '2013.11.20', processStatus: 'UNMATCHED', docType: 'IMAGING REPORT', clip: '1' },
  { docDate: '2013.11.20', facility: 'NORTHERN IMAGING ASSOC.', facilityRef: 'NIA-884121', processDate: '2013.11.20', processStatus: 'UNMATCHED', docType: 'IMAGING REPORT', clip: '' },
]

/** `Patient Data From Message` — statics, plus the two-row insurance panel. */
export const MESSAGE_DETAIL_PATIENT = {
  patient: 'CAPP, ANDY',
  dob: '1966.02.14',
  sex: 'M',
  insurance: 'BC MEDICAL SERVICES PLAN',
  identifiers: [
    { scheme: 'BCPHN', value: '910044182' },
    { scheme: 'NHAMRN', value: '00884120' },
  ],
}

/** Verbatim from the capture's own group text. */
export const MESSAGE_DETAIL_MATCH_TEXT =
  'The data below has not been matched / linked to a patient’s chart. '
  + 'This is a manual process.'

/** The `Detail` group is the CDX print preview: row headers #3196bd with
    white bold text, value cells #efefef with navy text. */
export const MESSAGE_DETAIL_PREVIEW: { label: string; value: string }[] = [
  { label: 'Document Type', value: 'IMAGING REPORT' },
  { label: 'Document Date', value: '2013.11.20' },
  { label: 'Facility', value: 'NORTHERN IMAGING ASSOC.' },
  { label: 'Facility Ref.', value: 'NIA-884120' },
  { label: 'Ordered By', value: 'DR. DEREK SHEPHERD' },
  { label: 'Procedure', value: 'CHEST X-RAY, 2 VIEWS' },
  { label: 'Report', value: 'Lungs are clear. Heart size within normal limits. No acute findings.' },
]

/** The right rail: `Actions:` and two blue links, then a push button. */
export const MESSAGE_DETAIL_ACTIONS = [
  'Print - manual distribution required (Ctrl+P)',
  'Ignore - no action required (Ctrl+I)',
]

/* --- Record Navigator (the Quality Review tear-off) ----------------------- */

export const RECORD_NAVIGATOR_COLUMNS: CdxColumn[] = [
  { key: 'type', header: 'Type', width: 130 },
  { key: 'date', header: 'Date', width: 90, align: 'center' },
  { key: 'description', header: 'Description', width: 250 },
  { key: 'detail', header: 'Detail', width: 240 },
]

export type NavigatorRecord = { patient: string; type: string; date: string; description: string; detail: string }

/** Patient group rows carry a bracketed count; the capture shows
    `CAPP, ANDY [2]` and `SMITH, MAGGIE [7]`. */
export const RECORD_NAVIGATOR_ROWS: NavigatorRecord[] = [
  { patient: 'CAPP, ANDY', type: 'IMAGING', date: '2013.11.20', description: 'CHEST X-RAY, 2 VIEWS', detail: 'Code should not be blank.' },
  { patient: 'CAPP, ANDY', type: 'IMAGING', date: '2013.11.20', description: 'ABDOMINAL ULTRASOUND', detail: 'Code should not be blank.' },
  { patient: 'SMITH, MAGGIE', type: 'CONSULT', date: '2013.11.18', description: 'CARDIOLOGY CONSULT', detail: 'Reason for Consult is required.' },
  { patient: 'SMITH, MAGGIE', type: 'CONSULT', date: '2013.11.12', description: 'RESPIROLOGY CONSULT', detail: 'Code should not be blank.' },
]

/** The `Messages` group under the tree: a warning triangle and the message
    text for the selected record. */
export const RECORD_NAVIGATOR_MESSAGE = 'Code should not be blank.'

export const RECORD_NAVIGATOR_REPORT = [
  'IMAGING REPORT',
  '',
  'Performed    : 2013.11.20',
  'Facility     : NORTHERN IMAGING ASSOC.',
  'Procedure    : CHEST X-RAY, 2 VIEWS',
  'Code         :',
  '',
  'Lungs are clear. Heart size within normal limits.',
  'No acute findings.',
].join('\n')

/* --- column glossaries, verbatim (304753) --------------------------------- */

export const CDX_GLOSSARY: Record<string, string> = {
  Received: 'The date that the message was received by your EMR',
  'Message From': 'The sender of the message',
  'Chart No.': 'The patient’s chart number that the message is regarding',
  Status: 'The processing status of the message (Matched to a patient, Unmatched, Failed, Printed, or Ignored)',
  Msgs: 'Number of messages received',
  Sent: 'The date that the message was sent from your EMR',
  'Message Type': 'The type of message that was sent (referral, consult, etc.)',
  'Date / Time': 'The exact date and time in which the message was sent',
  User: 'The person who clicked the distribute button to send the message',
  Detail: 'A more detailed explanation of the status',
}

/** Verbatim from 2961349, and the reason a SENT_OK row is not a delivery
    receipt. */
export const CDX_SUCCESS_CAVEAT =
  'A Distribution Status of ‘Success’ for letters sent through CDX means '
  + 'that the letter has been sent successfully from your office to the CDX '
  + 'server; it does not guarantee that it has been received by the other office.'
