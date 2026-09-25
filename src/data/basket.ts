/* ============================================================================
   The Workspace Basket: what is waiting for a clinician to acknowledge.

   Transcribed from the vendor's own per-folder reference pages, one per
   folder, in `MOIS_User_Manual_2026-09-20` — articles 1802756 Measures,
   1802757 Imaging, 1802758 Consults, 1802759 Procedures, 1802760 Documents,
   1802761 Facility Admissions, 1802762 Progress Notes, 1802763 Orders, plus
   1802749 for the shared chrome.

   Widths are 1:1 pixels. Measures and Orders are native-resolution captures
   and were read directly; the other six are 125% DPI captures whose integer
   widths were recovered and cross-checked against a second, native-resolution
   Measures capture that matched exactly.

   Builds differ across the captures (v02.21.18 for most, v02.24.35 Measures,
   v02.28.06 Orders), which is why the folders are not uniform. The
   differences below are real, not drift: do not normalise them.

   The patients and results are synthetic training data.
   ========================================================================= */

export type BasketColumn = { key: string; header: string; width?: number; align?: 'left' | 'center' | 'right' }

export type BasketRow = {
  ra: string
  /** A = acknowledgement, R = review. MOIS draws R bold. */
  t: string
  patient: string
  age: string
  checked?: boolean
  /** a flagged result: MOIS paints this row's `abnormal` cells yellow */
  abnormal?: boolean
  [key: string]: string | boolean | undefined
}

/* Every folder opens with these four, at the same widths but for Patient,
   which is sized per folder and must not be normalised. */
const head = (patient: number): BasketColumn[] => [
  /* 26 in the captures, where RA reads 461 at most; four more pixels, taken
     from Patient, so a three-digit age like 474 is not cut to "4…" */
  { key: 'ra', header: 'RA', width: 30, align: 'center' },
  { key: 't', header: 'T', width: 18, align: 'center' },
  { key: 'patient', header: 'Patient', width: patient - 4 },
  { key: 'age', header: 'Age', width: 30, align: 'center' },
]

/* …and most close with these five. Progress Notes does not — it has no
   Status, no IR and no paperclip, and its Check column is terminal. */
const TAIL: BasketColumn[] = [
  { key: 'status', header: 'Status', width: 35 },
  { key: 'ir', header: 'IR', width: 21, align: 'center' },
  { key: 'assignee', header: 'Assignee', width: 56 },
  { key: 'check', header: 'Check', width: 37, align: 'center' },
  { key: 'clip', header: '\u{1F4CE}', width: 18, align: 'center' },
]

/**
 * The Intended Recipient codes, verbatim from the folder pages. A record with
 * several reasons lists them in this order; a user who is the Default Inbox
 * shows D instead, which overrides any of them. RS and CP come from the
 * Workflow Summary, which spells them out in full.
 */
export const IR_CODES: { code: string; meaning: string }[] = [
  { code: 'O', meaning: 'Ordering' },
  { code: 'C', meaning: 'Copied To' },
  { code: 'F', meaning: 'Family Physician' },
  { code: 'A', meaning: 'Attending' },
  { code: 'R', meaning: 'Referring' },
  { code: 'M', meaning: 'Miscellaneous' },
  { code: 'RS', meaning: 'Reassigned From User' },
  { code: 'CP', meaning: 'Copied From User' },
  { code: 'D', meaning: 'Default Inbox' },
]

/** "Record Age … how long this record has been waiting to be checked", in days. */
export const RA_MEANING = 'Record Age — how many days this record has been waiting to be checked'

export type BasketFolder = {
  id: string
  /** the navigator tree's label */
  label: string
  /** the view header, which is not always the tree label */
  header: string
  columns: BasketColumn[]
  rows: BasketRow[]
  /** the cells a flagged row paints #ffff60 — four in Measures, two in Imaging */
  abnormalCells?: string[]
  /** folders whose command row differs from the shared nine buttons */
  commands?: string[]
  /** the tabs under the grid */
  tabs: string[]
  /** the Report tab's form — see `BasketReportLayout` */
  report: BasketReportLayout
  /** the column Reassign Items / Copy Items add as of MOIS 2.22 (art. 303758) */
  extra: { header: string; key: string }
  /** what a linked Create Task / Create Message names the record as */
  recordType: string
}

/* ----------------------------------------------------------------------------
   The Report tab under the grid.

   Each folder's reference page lists its Report-tab fields (1802756–1802763);
   the Measures and Consults layouts are drawn from 303756 image `24c0798b`
   and 303764 image `22acb4da` (v02.21.18): two columns of labelled boxes, a
   tall Report memo, then the record-source footer — "Source: SYSTEM  Sent
   Date:  Code: -  UNSIGNED" over "Created: …  Last Modified:  ENC# EMPTY".
   Progress Notes' tab has no source footer (1802762).
   ------------------------------------------------------------------------- */
export type BasketReportLayout = {
  left: [label: string, key: string][]
  right: [label: string, key: string][]
  /** the memo's caption: Report, Comment, Progress Note */
  memo: string
  /** Measures alone carries a Comments box under the Report */
  comments?: boolean
  /** Progress Notes has no Source / Created footer */
  noFooter?: boolean
}

const SHARED_COMMANDS = [
  'Refresh', 'Change W/S', 'Open Chart', 'Create Task', 'Create Message',
  'Reassign Items', 'Copy Items', 'Print', 'Close Window',
]

/** Buttons are sized in the capture; Create Message is the wide one. */
export const BASKET_COMMAND_WIDTH: Record<string, number> = {
  'Create Message': 91, 'Reassign Items': 82, 'Copy Items': 82, Respond: 78,
}

/* Status is the lab's own one-letter code — F final, P preliminary — the way
   the Status column prints it in `24c0798b`. */
const row = (ra: string, t: string, patient: string, age: string, rest: Partial<BasketRow>): BasketRow =>
  ({ ra, t, patient, age, status: 'F', ir: '', assignee: 'ADMIN', clip: '-', ...rest })

/* The synthetic chart each basket patient belongs to, and the record id a
   linked task or message quotes ("Consult - record id: 500090"). */
export const BASKET_CHARTS: Record<string, string> = {
  'BROWN, FARMER': '10023',
  'ADAM, GEORGE': '10031',
  'HALE, MARGARET': '10044',
  'RAO, PRIYA': '10052',
  'OKONKWO, SAM': '10067',
  'FONTAINE, DALE': '10071',
  'CASTILLO, JUNE': '10085',
}

export const basketFolders: BasketFolder[] = [
  {
    id: 'ws-measures',
    label: 'Measures',
    header: 'Acknowledge - Measures',
    tabs: ['Report', 'Detail', 'Panel (0)'],
    recordType: 'Measurement',
    extra: { header: 'Ordered By Provider', key: 'orderedBy' },
    report: {
      left: [['Test Name:', 'test'], ['Value:', 'valueUnits'], ['Flag:', 'flag'], ['Ref. Ranges:', 'range'], ['Status:', 'status']],
      right: [['Order Date:', 'orderDate'], ['Order #:', 'orderNo'], ['Ordered By:', 'orderedBy'], ['Copies To:', 'copiesTo']],
      memo: 'Report',
      comments: true,
    },
    abnormalCells: ['test', 'value', 'units', 'flag'],
    columns: [
      ...head(134),
      { key: 'collected', header: 'Collected', width: 56, align: 'center' },
      /* 196 in the capture, which was taken in a wider window; at this
         1000-wide frame the grid would otherwise squeeze RA and Check */
      { key: 'test', header: 'Test Name', width: 176 },
      { key: 'value', header: 'Value', width: 64 },
      { key: 'units', header: 'Units', width: 49 },
      { key: 'flag', header: 'Flag', width: 41, align: 'center' },
      ...TAIL,
    ],
    rows: [
      row('139', 'A', 'BROWN, FARMER', '35', { collected: '26.03.17', test: 'HEMOGLOBIN A1C', value: '8.4', units: '%', flag: 'H', abnormal: true, range: '4.0 to 6.0', orderDate: '2026.03.16', orderedBy: 'BEARDWOOD, WENDY', recordId: '500112', report: 'Consistent with poorly controlled diabetes.' }),
      row('474', 'A', 'ADAM, GEORGE', '48', { collected: '26.03.17', test: 'CREATININE', value: '96', units: 'umol/L', flag: '', range: '60 to 110', orderDate: '2026.03.16', orderedBy: 'BEARDWOOD, WENDY', recordId: '500113' }),
      row('586', 'A', 'HALE, MARGARET', '70', { collected: '26.03.16', test: 'THYROID STIMULATING HORMONE', value: '11.2', units: 'mIU/L', flag: 'H', abnormal: true, range: '0.32 to 5.04', orderedBy: 'SMITH, DALENE', recordId: '500098' }),
      row('461', 'A', 'RAO, PRIYA', '41', { collected: '26.03.16', test: 'POTASSIUM', value: '4.1', units: 'mmol/L', flag: '', range: '3.5 to 5.0', orderedBy: 'BEARDWOOD, WENDY', recordId: '500101' }),
      row('0', 'R', 'OKONKWO, SAM', '56', { collected: '26.03.15', test: 'LIPID PANEL', value: '', units: '', flag: '', clip: '1', orderedBy: 'SMITH, DALENE', recordId: '500094', reviewNote: 'Please review with the LDL target in mind.' }),
      row('13', 'A', 'FONTAINE, DALE', '24', { collected: '26.03.15', test: 'HEMOGLOBIN', value: '131', units: 'g/L', flag: '', range: '120 to 160', orderedBy: 'RESIDENT, R1', recordId: '500090' }),
    ],
  },
  {
    id: 'ws-imaging',
    label: 'Imaging',
    /* the tree says Imaging; the banner says Images */
    header: 'Acknowledge - Images',
    tabs: ['Report', 'Detail'],
    recordType: 'Image',
    extra: { header: 'Ordered By Provider', key: 'orderedBy' },
    report: {
      left: [['Test Name:', 'test'], ['Region:', 'region'], ['Laterality:', 'laterality'], ['Flag:', 'flag'], ['Modality:', 'modality'], ['Status:', 'status']],
      right: [['Order Date:', 'orderDate'], ['Order #:', 'orderNo'], ['Ordered By:', 'orderedBy'], ['Copies To:', 'copiesTo']],
      memo: 'Report',
    },
    abnormalCells: ['test', 'flag'],
    columns: [
      ...head(147),
      { key: 'collected', header: 'Collected', width: 56, align: 'center' },
      { key: 'test', header: 'Test Name', width: 295 },
      { key: 'flag', header: 'Flag', width: 41, align: 'center' },
      { key: 'status', header: 'Status', width: 36 },
      { key: 'ir', header: 'IR', width: 20, align: 'center' },
      { key: 'assignee', header: 'Assignee', width: 56 },
      { key: 'check', header: 'Check', width: 37, align: 'center' },
      { key: 'clip', header: '\u{1F4CE}', width: 18, align: 'center' },
    ],
    rows: [
      row('488', 'A', 'CASTILLO, JUNE', '78', { collected: '26.03.14', test: 'CHEST X-RAY, TWO VIEWS', flag: '', region: 'CHEST', modality: 'XR', orderedBy: 'SMITH, DALENE', recordId: '500077', report: 'No acute cardiopulmonary process.' }),
      row('474', 'A', 'BROWN, FARMER', '35', { collected: '26.03.12', test: 'ULTRASOUND ABDOMEN COMPLETE', flag: 'A', abnormal: true, region: 'ABDOMEN', modality: 'US', orderedBy: 'BEARDWOOD, WENDY', recordId: '500081', report: 'Diffuse fatty infiltration of the liver. No focal lesion.' }),
    ],
  },
  {
    id: 'ws-consults',
    label: 'Consults',
    header: 'Acknowledge - Consults',
    tabs: ['Report', 'Detail'],
    recordType: 'Consult',
    extra: { header: 'Referred By', key: 'referredBy' },
    report: {
      left: [['Reason:', 'reason'], ['Seen By:', 'seenBy'], ['Date:', 'seenDate'], ['Diag. Code:', 'diagCode'], ['Diag Desc.:', 'diagDesc']],
      right: [['Refer Date:', 'orderDate'], ['Order #:', 'orderNo'], ['Referred By:', 'referredBy'], ['Copies To:', 'copiesTo']],
      memo: 'Report',
    },
    columns: [
      ...head(145),
      { key: 'seen', header: 'Seen', width: 56, align: 'center' },
      { key: 'seenBy', header: 'Seen By', width: 118 },
      { key: 'reason', header: 'Reason For Consult Request', width: 218 },
      { key: 'status', header: 'Status', width: 35 },
      { key: 'ir', header: 'IR', width: 21, align: 'center' },
      { key: 'assignee', header: 'Assignee', width: 56 },
      { key: 'check', header: 'Check', width: 37, align: 'center' },
      { key: 'clip', header: '\u{1F4CE}', width: 18, align: 'center' },
    ],
    rows: [
      row('474', 'A', 'HALE, MARGARET', '70', { seen: '26.03.10', seenBy: 'CARDIOLOGY, UHNBC', reason: 'ATRIAL FIBRILLATION - RATE CONTROL', seenDate: '2026.03.10', referredBy: 'SMITH, DALENE', diagCode: '427', diagDesc: 'CARDIAC DYSRHYTHMIAS', recordId: '500090' }),
      row('33', 'A', 'OKONKWO, SAM', '56', { seen: '26.03.09', seenBy: 'GENERAL SURGERY', reason: 'INGUINAL HERNIA REPAIR - FOLLOW UP', seenDate: '2026.03.09', referredBy: 'BEARDWOOD, WENDY', recordId: '500088' }),
      row('25', 'R', 'RAO, PRIYA', '41', { seen: '26.03.05', seenBy: 'RESPIROLOGY', reason: 'CHRONIC COUGH', seenDate: '2026.03.05', referredBy: 'BEARDWOOD, WENDY', recordId: '500084' }),
    ],
  },
  {
    id: 'ws-procedures',
    label: 'Procedures',
    header: 'Acknowledge - Procedures',
    tabs: ['Report', 'Detail'],
    recordType: 'Procedure',
    extra: { header: 'Ordered By Provider', key: 'orderedBy' },
    report: {
      left: [['Description:', 'description'], ['Diagnostic Code:', 'diagCode'], ['Diagnostic Description:', 'diagDesc']],
      right: [['Order Date:', 'orderDate'], ['Order #:', 'orderNo'], ['Ordered By:', 'orderedBy'], ['Copies To:', 'copiesTo']],
      memo: 'Report',
    },
    columns: [
      ...head(153),
      { key: 'performed', header: 'Performed', width: 56, align: 'center' },
      { key: 'by', header: 'Performed By', width: 118 },
      { key: 'description', header: 'Description', width: 214 },
      { key: 'status', header: 'Status', width: 35 },
      { key: 'ir', header: 'IR', width: 20, align: 'center' },
      { key: 'assignee', header: 'Assignee', width: 56 },
      { key: 'check', header: 'Check', width: 37, align: 'center' },
      { key: 'clip', header: '\u{1F4CE}', width: 18, align: 'center' },
    ],
    rows: [
      row('461', 'A', 'CASTILLO, JUNE', '78', { performed: '26.03.11', by: 'ENDOSCOPY, UHNBC', description: 'COLONOSCOPY WITH POLYPECTOMY', clip: '1', orderedBy: 'SMITH, DALENE', recordId: '500079', report: 'Two sessile polyps removed from the sigmoid colon. Pathology to follow.' }),
      row('0', 'R', 'FONTAINE, DALE', '24', { performed: '26.03.08', by: 'DAY SURGERY', description: 'WOUND DEBRIDEMENT', orderedBy: 'RESIDENT, R1', recordId: '500076' }),
    ],
  },
  {
    id: 'ws-documents',
    label: 'Documents',
    header: 'Acknowledge - Documents',
    /* the only folder with three content columns, and the only one with no
       Detail tab */
    tabs: ['Report'],
    recordType: 'Document',
    extra: { header: 'Recipient', key: 'recipient' },
    report: {
      left: [['Note:', 'note'], ['Order #:', 'orderNo'], ['Recipient:', 'recipient'], ['Transcribed:', 'transcribed']],
      right: [['Facility:', 'facility'], ['Facility Ref:', 'facilityRef'], ['Diagnostic Code:', 'diagCode'], ['Copies To:', 'copiesTo']],
      memo: 'Comment',
    },
    columns: [
      ...head(140),
      { key: 'date', header: 'Date', width: 56, align: 'center' },
      { key: 'author', header: 'Author', width: 88 },
      { key: 'docType', header: 'Doc. Type', width: 85 },
      { key: 'note', header: 'Note', width: 172 },
      { key: 'status', header: 'Status', width: 35 },
      { key: 'ir', header: 'IR', width: 20, align: 'center' },
      { key: 'assignee', header: 'Assignee', width: 56 },
      { key: 'check', header: 'Check', width: 37, align: 'center' },
      { key: 'clip', header: '\u{1F4CE}', width: 18, align: 'center' },
    ],
    rows: [
      row('461', 'A', 'BROWN, FARMER', '35', { date: '26.03.13', author: 'NORTHERN HLTH', docType: 'ASSESSMENT', note: 'HOME SUPPORT ASSESSMENT', recipient: 'BEARDWOOD, WENDY', facility: 'NORTHERN HEALTH', recordId: '500070' }),
      row('461', 'A', 'HALE, MARGARET', '70', { date: '26.03.11', author: 'UHNBC', docType: 'DISCHARGE', note: 'DISCHARGE SUMMARY - CARDIOLOGY', recipient: 'SMITH, DALENE', facility: 'UHNBC', recordId: '500068' }),
    ],
  },
  {
    id: 'ws-admissions',
    label: 'Facility Admissions',
    header: 'Acknowledge - Facility Admissions',
    tabs: ['Report', 'Detail'],
    recordType: 'Facility Admission',
    extra: { header: 'Attending', key: 'attending' },
    report: {
      left: [['Description:', 'description'], ['Admit Date:', 'admitDate'], ['Attending:', 'attending'], ['Admitted By:', 'admittedBy']],
      right: [['Diagnostic Code:', 'diagCode'], ['Diagnostic Description:', 'diagDesc'], ['Copies To:', 'copiesTo']],
      memo: 'Report',
    },
    columns: [
      ...head(143),
      { key: 'discharge', header: 'Discharge', width: 56, align: 'center' },
      { key: 'facility', header: 'Facility', width: 118 },
      { key: 'description', header: 'Description', width: 225 },
      { key: 'status', header: 'Status', width: 35 },
      { key: 'ir', header: 'IR', width: 21, align: 'center' },
      { key: 'assignee', header: 'Assignee', width: 56 },
      { key: 'check', header: 'Check', width: 37, align: 'center' },
      { key: 'clip', header: '\u{1F4CE}', width: 18, align: 'center' },
    ],
    rows: [
      row('461', 'A', 'HALE, MARGARET', '70', { discharge: '26.03.02', facility: 'UHNBC', description: 'DISCHARGE SUMMARY', admitDate: '2026.02.26', attending: 'CARDIOLOGY, UHNBC', recordId: '500061' }),
    ],
  },
  {
    id: 'ws-progress',
    label: 'Progress Note',
    /* tree singular, banner plural */
    header: 'Acknowledge - Progress Notes',
    /* the one folder the shared skeleton does not fit: no Status, no IR, no
       paperclip, Check is terminal and a pixel wider, and its Report tab has
       no record-source footer */
    tabs: ['Report'],
    recordType: 'Progress Note',
    extra: { header: 'Author', key: 'author' },
    report: {
      left: [['Appoint:', 'apptDate'], ['Provider:', 'provider']],
      right: [['Author:', 'author'], ['Creator:', 'creator']],
      memo: 'Progress Note',
      noFooter: true,
    },
    columns: [
      ...head(153),
      { key: 'apptDate', header: 'Appt. Date', width: 56, align: 'center' },
      { key: 'provider', header: 'Provider', width: 118 },
      { key: 'note', header: 'Appointment Note', width: 284 },
      { key: 'assignee', header: 'Assignee', width: 56 },
      { key: 'check', header: 'Check', width: 39, align: 'center' },
    ],
    rows: [
      row('461', 'A', 'ADAM, GEORGE', '48', { apptDate: '26.03.18', provider: 'RESIDENT, R1', note: 'SAME DAY - SORE THROAT', author: 'ADMINISTRATOR', creator: 'RESIDENT, R1', recordId: '500058' }),
      row('461', 'A', 'RAO, PRIYA', '41', { apptDate: '26.03.16', provider: 'RESIDENT, R1', note: 'URGENT - CHEST PAIN', author: 'ADMINISTRATOR', creator: 'RESIDENT, R1', recordId: '500057' }),
    ],
  },
  {
    id: 'ws-orders',
    label: 'Orders',
    header: 'Acknowledge - Orders',
    /* a later build than the rest: ten buttons, with Respond inserted before
       Close Window, and the only folder with a Src. column */
    tabs: ['Report', 'Detail'],
    recordType: 'Order',
    extra: { header: 'Referred To', key: 'referredTo' },
    report: {
      left: [['Referred To:', 'referredTo'], ['Payor:', 'payor'], ['Copies To:', 'copiesTo']],
      right: [['Order Type:', 'orderType'], ['Ordered By:', 'orderedBy'], ['Transcribed:', 'transcribed']],
      memo: 'Report',
    },
    commands: [
      'Refresh', 'Change W/S', 'Open Chart', 'Create Task', 'Create Message',
      'Reassign Items', 'Copy Items', 'Print', 'Respond', 'Close Window',
    ],
    columns: [
      ...head(127),
      { key: 'ordDate', header: 'Ord. Date', width: 52, align: 'center' },
      { key: 'orderedBy', header: 'Ordered By', width: 77 },
      { key: 'orderType', header: 'Order Type', width: 92 },
      { key: 'src', header: 'Src.', width: 26 },
      { key: 'description', header: 'Description (Order For)', width: 168 },
      { key: 'status', header: 'Status', width: 35 },
      { key: 'ir', header: 'IR', width: 20, align: 'center' },
      { key: 'assignee', header: 'Assignee', width: 56 },
      { key: 'check', header: 'Check', width: 37, align: 'center' },
      { key: 'clip', header: '\u{1F4CE}', width: 18, align: 'center' },
    ],
    rows: [
      row('33', 'A', 'RAO, PRIYA', '41', { ordDate: '26.03.07', orderedBy: 'RESPIROLOGY', orderType: 'Consultation', src: 'EXT', description: 'PULMONARY FUNCTION TESTING', status: 'In Process', referredTo: 'RESPIROLOGY', payor: 'MSP', recordId: '500050' }),
      row('25', 'A', 'BROWN, FARMER', '35', { ordDate: '26.03.04', orderedBy: 'BEARDWOOD, W', orderType: 'Lab', src: 'EXT', description: 'HEMOGLOBIN A1C', status: 'Completed', referredTo: 'LIFELABS', payor: 'MSP', recordId: '500049' }),
    ],
  },
]

export const basketCommands = (f: BasketFolder): string[] => f.commands ?? SHARED_COMMANDS

export const basketFolderById = (id: string): BasketFolder | undefined =>
  basketFolders.find((f) => f.id === id)

/** The chart folder a basket folder's Open Chart lands on. */
export const CHART_FOLDER_FOR_BASKET: Record<string, string> = {
  'ws-measures': 'measures',
  'ws-imaging': 'imaging',
  'ws-consults': 'consults',
  'ws-procedures': 'procedures',
  'ws-documents': 'documents',
  'ws-admissions': 'admissions',
  'ws-progress': 'encounters',
  'ws-orders': 'orders',
}
