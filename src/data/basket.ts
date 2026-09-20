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
  { key: 'ra', header: 'RA', width: 26, align: 'center' },
  { key: 't', header: 'T', width: 18, align: 'center' },
  { key: 'patient', header: 'Patient', width: patient },
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
}

const SHARED_COMMANDS = [
  'Refresh', 'Change W/S', 'Open Chart', 'Create Task', 'Create Message',
  'Reassign Items', 'Copy Items', 'Print', 'Close Window',
]

/** Buttons are sized in the capture; Create Message is the wide one. */
export const BASKET_COMMAND_WIDTH: Record<string, number> = {
  'Create Message': 91, 'Reassign Items': 82, 'Copy Items': 82, Respond: 78,
}

const row = (ra: string, t: string, patient: string, age: string, rest: Partial<BasketRow>): BasketRow =>
  ({ ra, t, patient, age, status: 'Final', ir: '', assignee: 'ADMIN', clip: '-', ...rest })

export const basketFolders: BasketFolder[] = [
  {
    id: 'ws-measures',
    label: 'Measures',
    header: 'Acknowledge - Measures',
    tabs: ['Report', 'Detail', 'Panel (0)'],
    abnormalCells: ['test', 'value', 'units', 'flag'],
    columns: [
      ...head(134),
      { key: 'collected', header: 'Collected', width: 56, align: 'center' },
      { key: 'test', header: 'Test Name', width: 196 },
      { key: 'value', header: 'Value', width: 64 },
      { key: 'units', header: 'Units', width: 49 },
      { key: 'flag', header: 'Flag', width: 41, align: 'center' },
      ...TAIL,
    ],
    rows: [
      row('1393', 'A', 'BROWN, FARMER', '35', { collected: '26.03.17', test: 'HEMOGLOBIN A1C', value: '8.4', units: '%', flag: 'H', abnormal: true }),
      row('474', 'A', 'ADAM, GEORGE', '48', { collected: '26.03.17', test: 'CREATININE', value: '96', units: 'umol/L', flag: '' }),
      row('586', 'A', 'HALE, MARGARET', '70', { collected: '26.03.16', test: 'THYROID STIMULATING HORMONE', value: '11.2', units: 'mIU/L', flag: 'H', abnormal: true }),
      row('461', 'A', 'RAO, PRIYA', '41', { collected: '26.03.16', test: 'POTASSIUM', value: '4.1', units: 'mmol/L', flag: '' }),
      row('0', 'R', 'OKONKWO, SAM', '56', { collected: '26.03.15', test: 'LIPID PANEL', value: '', units: '', flag: '', clip: '1' }),
      row('13', 'A', 'FONTAINE, DALE', '24', { collected: '26.03.15', test: 'HEMOGLOBIN', value: '131', units: 'g/L', flag: '' }),
    ],
  },
  {
    id: 'ws-imaging',
    label: 'Imaging',
    /* the tree says Imaging; the banner says Images */
    header: 'Acknowledge - Images',
    tabs: ['Report', 'Detail'],
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
      row('488', 'A', 'CASTILLO, JUNE', '78', { collected: '26.03.14', test: 'CHEST X-RAY, TWO VIEWS', flag: '' }),
      row('474', 'A', 'BROWN, FARMER', '35', { collected: '26.03.12', test: 'ULTRASOUND ABDOMEN COMPLETE', flag: 'A', abnormal: true }),
    ],
  },
  {
    id: 'ws-consults',
    label: 'Consults',
    header: 'Acknowledge - Consults',
    tabs: ['Report', 'Detail'],
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
      row('474', 'A', 'HALE, MARGARET', '70', { seen: '26.03.10', seenBy: 'CARDIOLOGY, UHNBC', reason: 'ATRIAL FIBRILLATION - RATE CONTROL' }),
      row('33', 'A', 'OKONKWO, SAM', '56', { seen: '26.03.09', seenBy: 'GENERAL SURGERY', reason: 'INGUINAL HERNIA REPAIR - FOLLOW UP' }),
      row('25', 'R', 'RAO, PRIYA', '41', { seen: '26.03.05', seenBy: 'RESPIROLOGY', reason: 'CHRONIC COUGH' }),
    ],
  },
  {
    id: 'ws-procedures',
    label: 'Procedures',
    header: 'Acknowledge - Procedures',
    tabs: ['Report', 'Detail'],
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
      row('461', 'A', 'CASTILLO, JUNE', '78', { performed: '26.03.11', by: 'ENDOSCOPY, UHNBC', description: 'COLONOSCOPY WITH POLYPECTOMY', clip: '1' }),
      row('0', 'R', 'FONTAINE, DALE', '24', { performed: '26.03.08', by: 'DAY SURGERY', description: 'WOUND DEBRIDEMENT' }),
    ],
  },
  {
    id: 'ws-documents',
    label: 'Documents',
    header: 'Acknowledge - Documents',
    /* the only folder with three content columns, and the only one with no
       Detail tab */
    tabs: ['Report'],
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
      row('461', 'A', 'BROWN, FARMER', '35', { date: '26.03.13', author: 'NORTHERN HLTH', docType: 'ASSESSMENT', note: 'HOME SUPPORT ASSESSMENT' }),
      row('461', 'A', 'HALE, MARGARET', '70', { date: '26.03.11', author: 'UHNBC', docType: 'DISCHARGE', note: 'DISCHARGE SUMMARY - CARDIOLOGY' }),
    ],
  },
  {
    id: 'ws-admissions',
    label: 'Facility Admissions',
    header: 'Acknowledge - Facility Admissions',
    tabs: ['Report', 'Detail'],
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
      row('461', 'A', 'HALE, MARGARET', '70', { discharge: '26.03.02', facility: 'UHNBC', description: 'DISCHARGE SUMMARY' }),
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
    columns: [
      ...head(153),
      { key: 'apptDate', header: 'Appt. Date', width: 56, align: 'center' },
      { key: 'provider', header: 'Provider', width: 118 },
      { key: 'note', header: 'Appointment Note', width: 284 },
      { key: 'assignee', header: 'Assignee', width: 56 },
      { key: 'check', header: 'Check', width: 39, align: 'center' },
    ],
    rows: [
      row('461', 'A', 'ADAM, GEORGE', '48', { apptDate: '26.03.18', provider: 'RESIDENT, R1', note: 'SAME DAY - SORE THROAT' }),
      row('461', 'A', 'RAO, PRIYA', '41', { apptDate: '26.03.16', provider: 'RESIDENT, R1', note: 'URGENT - CHEST PAIN' }),
    ],
  },
  {
    id: 'ws-orders',
    label: 'Orders',
    header: 'Acknowledge - Orders',
    /* a later build than the rest: ten buttons, with Respond inserted before
       Close Window, and the only folder with a Src. column */
    tabs: ['Report', 'Detail'],
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
      row('33', 'A', 'RAO, PRIYA', '41', { ordDate: '26.03.07', orderedBy: 'RESPIROLOGY', orderType: 'Consultation', src: 'EXT', description: 'PULMONARY FUNCTION TESTING', status: 'In Process' }),
      row('25', 'A', 'BROWN, FARMER', '35', { ordDate: '26.03.04', orderedBy: 'BEARDWOOD, W', orderType: 'Lab', src: 'EXT', description: 'HEMOGLOBIN A1C', status: 'Completed' }),
    ],
  },
]

export const basketCommands = (f: BasketFolder): string[] => f.commands ?? SHARED_COMMANDS

export const basketFolderById = (id: string): BasketFolder | undefined =>
  basketFolders.find((f) => f.id === id)
