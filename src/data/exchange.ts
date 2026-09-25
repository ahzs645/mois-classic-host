/* ============================================================================
   Data Exchange — the per-folder screens, transcribed.

   Every screen in the module is its own PowerBuilder window with its own
   taskbar, and the bar above it names only the folder ("Manual Entry -
   Imaging", "Lab Results", "Teleplan Web Access"): no module prefix, no
   patient. Each block below names the manual article and image it was
   transcribed from, by the first eight characters of the image's file name
   under `assets/images/` in the MOIS User Manual export.

   Values are the captures' own training data (the manual's clinics are
   fictional), kept verbatim — including MOIS's spelling ("Admited By:",
   "Provider Indentifcation") — so a lesson can quote the screen.
   ========================================================================= */

export type ExColumn = {
  key: string
  header: string
  width?: number
  align?: 'left' | 'center' | 'right'
  /** the narrow "…" lookup column MOIS puts after a coded field */
  dots?: boolean
}

const c = (key: string, header: string, width?: number, align?: ExColumn['align']): ExColumn =>
  ({ key, header, width, align })
const dots = (key: string): ExColumn => ({ key, header: '', dots: true, width: 16 })
const CLIP: ExColumn = { key: 'clip', header: '\u{1F4CE}', width: 20, align: 'center' }

/* ===========================================================================
   Manual Entry — seven folders.

   303381 "Manual Entry" and the seven How-To's (303480 Measures, 303482
   Imaging, 303483 Consults, 303484 Procedures, 303485 Facility Admissions,
   303486 Orders, 303487 Documents). One taskbar for all seven — 303388
   image 23b2bb8a rings it: New Record, Delete Record, Save, Undo, Open
   Chart, Attachment, Close Window. Under it a row of filter boxes, the grid
   (a paper-clip count at its right edge), and a lower half that differs per
   folder: Report/Detail tabs, History (+/- 15 days from discharged date)
   and Distribute To (New / Delete, User Name). Documents and Orders have no
   History panel and a single Detail band instead of tabs.
   ======================================================================== */

export const MANUAL_ENTRY_COMMANDS = [
  'New Record', 'Delete Record', 'Save', 'Undo', 'Open Chart', 'Attachment', 'Close Window',
]

/** One field in a Manual Entry lower half. `pair` puts it in the right-hand
    column beside the previous left-hand field. */
export type ExField =
  | { kind: 'text'; label: string; value?: string; w?: number; lookup?: boolean; pair?: boolean; anchor?: string }
  | { kind: 'date'; label: string; value?: string; time?: boolean; pair?: boolean }
  | { kind: 'select'; label: string; value?: string; w?: number; pair?: boolean }
  | { kind: 'coded'; label: string; code?: string; value?: string }
  | { kind: 'order'; pair?: boolean }
  | { kind: 'attachments' }
  | { kind: 'ranges' }
  | { kind: 'rule' }
  | { kind: 'report'; label: string; anchor: string }

export type ManualEntryFolder = {
  node: string
  /** the bar's caption, verbatim */
  title: string
  /** the patient folder `Open Chart` lands on (303388 Taskbar: "if selected
      while on the imaging folder in Data Exchange, the Imaging folder in
      Patient Chart will be prompted") */
  chartNode: string
  columns: ExColumn[]
  /** widths of the filter boxes above the header, left to right; 0 = gap */
  filters: number[]
  rows: Record<string, string>[]
  /** the blank row New Record appends */
  blank: Record<string, string>
  /** Report/Detail tabs, or one Detail band (Documents, Orders) */
  tabs: string[] | null
  fields: ExField[]
  /** fields a Detail tab shows, where the folder has one */
  detail?: ExField[]
  /** History panel columns, or null where the folder has none */
  history: ExColumn[] | null
  distribute: string[]
  /** a "Created:" / "Record Created:" line at the foot of the lower half */
  footer?: string
  provenance: string
}

const IMAGING_DETAIL: ExField[] = [
  { kind: 'text', label: 'Facility:', w: 180 }, { kind: 'text', label: 'Ref.:', w: 140, pair: true },
  { kind: 'text', label: 'Facility Loc.:', w: 180 },
  { kind: 'text', label: 'Transcribed:', w: 180 }, { kind: 'date', label: 'Date:', time: true, pair: true },
]

export const MANUAL_ENTRY: ManualEntryFolder[] = [
  {
    node: 'dx-measures',
    title: 'Manual Entry - Measures',
    chartNode: 'measures',
    provenance: '303480 image b4ba45db (v02.17.19); 303388 ab0bb230 for the empty v02.22.92 lower half',
    columns: [
      c('chart', 'Chart', 64, 'right'), dots('d1'), c('patient', 'Patient', 110),
      c('collected', 'Collected', 78, 'center'), c('by', 'Ordered By', 78), c('code', 'Code', 56),
      dots('d2'), c('test', 'Test Name', 188), c('value', 'Value', 80), c('flag', 'Flag', 30, 'center'),
      c('units', 'Units', 56), CLIP,
    ],
    filters: [64, 16, 110, 0, 78, 56, 0, 188],
    rows: [
      { chart: '23', patient: 'CATHY ANDREWS', collected: '2015.03.20', by: 'DR SMITH', code: '1008', test: 'INVALID TEST CODE', value: '', flag: '', units: '', clip: '-' },
    ],
    blank: { chart: '', patient: '', collected: '', by: '', code: '', test: '', value: '', flag: '', units: '', clip: '-' },
    tabs: ['Report', 'Detail'],
    fields: [
      { kind: 'ranges' },
      { kind: 'date', label: 'Order Date:' }, { kind: 'order', pair: true },
      { kind: 'attachments' },
      { kind: 'coded', label: 'Code:', code: '1008', value: 'INVALID TEST CODE' },
      { kind: 'text', label: 'Ordered By:', value: 'DR SMITH', w: 420 },
      { kind: 'text', label: 'Copies To:', w: 420 },
      { kind: 'report', label: 'Report:', anchor: 'report' },
    ],
    detail: [
      { kind: 'text', label: 'MOIS Code:', value: '1008', w: 110 }, { kind: 'text', label: 'LOINC:', w: 110, pair: true },
      { kind: 'text', label: 'Perform By:', w: 180 }, { kind: 'text', label: 'Collect By:', w: 180, pair: true },
      { kind: 'text', label: 'Report By:', w: 180 }, { kind: 'text', label: 'Transcribed:', w: 180, pair: true },
    ],
    history: [c('collected', 'Collected', 56, 'center'), c('test', 'Test Name', 140), c('value', 'Value', 64)],
    distribute: ['JOHN'],
  },
  {
    node: 'dx-imaging',
    title: 'Manual Entry - Imaging',
    chartNode: 'imaging',
    provenance: '303388 image f77abdf6 (v02.22.92) for the grid and Report tab; 303489 b5550316 for the two-attachment row',
    columns: [
      c('chart', 'Chart', 64, 'right'), dots('d1'), c('patient', 'Patient', 110),
      c('performed', 'Performed', 80, 'center'), c('by', 'Ordered By', 94), c('test', 'Test Name', 246),
      dots('d2'), c('contrast', 'Contrast', 46), c('flag', 'Flag', 30, 'center'), CLIP,
    ],
    filters: [64, 16, 110, 0, 94, 246],
    rows: [
      { chart: '10035', patient: 'FARMER BROWN', performed: '2018.09.28', by: 'DR. DEREK SHEP', test: 'TRANSESOPHAGEAL ECHOCARDIOGRAPHY', contrast: '', flag: '', clip: '2' },
    ],
    blank: { chart: '', patient: '', performed: '', by: '', test: '', contrast: '', flag: '', clip: '-' },
    tabs: ['Report', 'Detail'],
    fields: [
      { kind: 'date', label: 'Order Date:' }, { kind: 'order', pair: true },
      { kind: 'attachments' },
      { kind: 'text', label: 'Description:', value: 'TRANSESOPHAGEAL ECHOCARDIOGRAPHY', w: 320, lookup: true },
      { kind: 'text', label: 'Copies To:', w: 420 },
      { kind: 'text', label: 'Performed By:', w: 180 }, { kind: 'date', label: 'Date:', value: '2018.09.28', time: true, pair: true },
      { kind: 'text', label: 'Report By:', w: 180 }, { kind: 'date', label: 'Date:', pair: true },
      { kind: 'report', label: 'Report:', anchor: 'report' },
    ],
    detail: IMAGING_DETAIL,
    history: [c('performed', 'Performed', 60, 'center'), c('description', 'Description', 200)],
    distribute: ['FAMILY, BOB'],
  },
  {
    node: 'dx-consults',
    title: 'Manual Entry - Consults',
    chartNode: 'consults',
    provenance: '303483 image c1408175 (v02.22.92)',
    columns: [
      c('chart', 'Chart', 64, 'right'), dots('d1'), c('patient', 'Patient', 112),
      c('seen', 'Seen Date', 72, 'center'), c('seenBy', 'Seen By', 186), dots('d2'),
      c('reason', 'Reason/Code for Consult', 266), dots('d3'), CLIP,
    ],
    filters: [64, 16, 112, 0, 186, 0, 266],
    rows: [
      { chart: '10023', patient: 'MARY COMPLEX', seen: '2018.09.05', seenBy: 'ARROWSMITH, RALPH CRESWELL (', reason: 'PAIN AND SYMPTOM MANAGEMENT', clip: '-' },
    ],
    blank: { chart: '', patient: '', seen: '', seenBy: '', reason: '', clip: '-' },
    tabs: ['Report', 'Detail'],
    fields: [
      { kind: 'date', label: 'Refer Date:' }, { kind: 'order', pair: true },
      { kind: 'attachments' },
      { kind: 'text', label: 'Reason/Code:', value: 'PAIN AND SYMPTOM MANAGEMENT', w: 420, lookup: true },
      { kind: 'text', label: 'Referred By:', value: 'DR. DEREK SHEPHERD', w: 200, lookup: true }, { kind: 'date', label: 'Seen Date:', value: '2018.09.05', pair: true },
      { kind: 'text', label: 'Copies To:', w: 200, lookup: true }, { kind: 'text', label: 'Seen By:', value: 'ARROWSMITH, RALPH (', w: 140, lookup: true, pair: true },
      { kind: 'rule' },
      { kind: 'text', label: 'Facility:', w: 200 }, { kind: 'text', label: 'Ref.:', w: 140, pair: true },
      { kind: 'text', label: 'Facility Loc.:', w: 200 },
      { kind: 'text', label: 'Report By:', w: 200 }, { kind: 'date', label: 'Date:', pair: true },
      { kind: 'text', label: 'Transcribed:', w: 200 }, { kind: 'date', label: 'Date:', time: true, pair: true },
      { kind: 'report', label: 'Report:', anchor: 'report' },
    ],
    detail: IMAGING_DETAIL,
    history: [c('seen', 'Seen', 60, 'center'), c('description', 'Description', 200)],
    distribute: ['FAMILY, BOB'],
  },
  {
    node: 'dx-procedures',
    title: 'Manual Entry - Procedures',
    chartNode: 'procedures',
    provenance: '303388 images bb09e97a and 5162eef7 (v02.22.92)',
    columns: [
      c('chart', 'Chart', 64, 'right'), dots('d1'), c('patient', 'Patient', 106),
      c('proc', 'Proc. Date', 78, 'center'), c('by', 'Performed By', 106), c('description', 'Description', 288),
      dots('d2'), CLIP,
    ],
    filters: [64, 16, 106, 0, 106, 288],
    rows: [
      { chart: '10052', patient: 'MAMA BEAR', proc: '2018.10.02', by: '', description: 'ENDOSCOPIC BIOPSY OF DUODENUM', clip: '-' },
    ],
    blank: { chart: '', patient: '', proc: '', by: '', description: '', clip: '-' },
    tabs: ['Report', 'Detail'],
    fields: [
      { kind: 'date', label: 'Order Date:' }, { kind: 'order', pair: true },
      { kind: 'attachments' },
      { kind: 'text', label: 'Description:', value: 'ENDOSCOPIC BIOPSY OF DUODENUM', w: 320, lookup: true },
      { kind: 'text', label: 'Ordered By:', value: 'DR. DEREK SHEPHERD', w: 184 }, { kind: 'text', label: 'Performed By:', w: 144, pair: true },
      { kind: 'text', label: 'Copies To:', w: 184 }, { kind: 'date', label: 'Date:', value: '2018.10.02', time: true, pair: true },
      { kind: 'rule' },
      { kind: 'text', label: 'Facility:', w: 184 }, { kind: 'text', label: 'Ref.:', w: 144, pair: true },
      { kind: 'text', label: 'Facility Loc.:', w: 184 },
      { kind: 'text', label: 'Report By:', w: 184 }, { kind: 'date', label: 'Date:', pair: true },
      { kind: 'report', label: 'Report:', anchor: 'report' },
    ],
    detail: IMAGING_DETAIL,
    history: [c('proc', 'Proc', 60, 'center'), c('description', 'Description', 200)],
    distribute: ['FAMILY, BOB'],
  },
  {
    node: 'dx-documents',
    title: 'Manual Entry - Documents',
    chartNode: 'documents',
    provenance: '303487 image fd13e2a6 (v02.17.19)',
    columns: [
      c('chart', 'Chart', 56, 'right'), dots('d1'), c('patient', 'Patient', 108), c('date', 'Date', 68, 'center'),
      c('author', 'Author', 108), c('type', 'Document Type', 126), c('venue', 'Source Venue', 124),
      c('note', 'Note', 150), CLIP,
    ],
    filters: [56, 16, 108, 0, 108, 126, 124, 150],
    rows: [],
    blank: { chart: '', patient: '', date: '', author: '', type: '', venue: '', note: '', clip: '-' },
    tabs: null,
    fields: [
      { kind: 'text', label: 'Note:', w: 262 }, { kind: 'attachments' },
      { kind: 'text', label: 'Copies To:', w: 262 }, { kind: 'select', label: 'Author Role:', w: 140, pair: true },
      { kind: 'text', label: 'Author:', w: 262 }, { kind: 'select', label: 'Author Type:', w: 140, pair: true },
      { kind: 'text', label: 'Transcribed:', w: 262 }, { kind: 'date', label: 'Trans. Date:', pair: true },
      { kind: 'text', label: 'Facility:', w: 124 }, { kind: 'text', label: 'Facility Loc.:', w: 140, pair: true },
      { kind: 'report', label: 'Comment:', anchor: 'comment' },
    ],
    history: null,
    distribute: ['JOHN'],
    footer: 'Record Created:',
  },
  {
    node: 'dx-admissions',
    title: 'Manual Entry - Facility Admissions',
    chartNode: 'admissions',
    provenance: '303485 image 0547a4bc (v02.22.92)',
    columns: [
      c('chart', 'Chart', 64, 'right'), dots('d1'), c('patient', 'Patient', 108),
      c('discharged', 'Discharged', 76, 'center'), c('facility', 'Facility', 120),
      c('description', 'Description', 288), dots('d2'), CLIP,
    ],
    filters: [64, 16, 108, 0, 120, 288],
    rows: [
      { chart: '10007', patient: 'LINDA COPD', discharged: '2018.09.05', facility: 'UHNBC', description: 'PULMONARY SARCOIDOSIS', clip: '-' },
    ],
    blank: { chart: '', patient: '', discharged: '', facility: '', description: '', clip: '-' },
    tabs: ['Report', 'Detail'],
    fields: [
      { kind: 'date', label: 'Admit Date:' }, { kind: 'attachments' },
      { kind: 'text', label: 'Description:', value: 'PULMONARY SARCOIDOSIS', w: 320, lookup: true },
      /* "Admited" is MOIS's own spelling (0547a4bc) */
      { kind: 'text', label: 'Admited By:', w: 180 }, { kind: 'date', label: 'Discharged Date:', value: '2018.09.05', pair: true },
      { kind: 'text', label: 'Copies To:', w: 180 }, { kind: 'text', label: 'Attending:', w: 144, pair: true },
      { kind: 'rule' },
      { kind: 'text', label: 'Facility:', value: 'UHNBC', w: 150 }, { kind: 'text', label: 'Ref.:', w: 144, pair: true },
      { kind: 'text', label: 'Facility Loc.:', w: 150 },
      { kind: 'text', label: 'Transcribed:', w: 150 }, { kind: 'date', label: 'Date:', time: true, pair: true },
      { kind: 'text', label: 'Report By:', w: 150 }, { kind: 'date', label: 'Date:', pair: true },
      { kind: 'report', label: 'Report:', anchor: 'report' },
    ],
    detail: [
      { kind: 'text', label: 'Admit Code:', w: 110 }, { kind: 'text', label: 'Discharge Code:', w: 110, pair: true },
    ],
    history: [c('dschrg', 'Dschrg', 60, 'center'), c('description', 'Description', 200)],
    distribute: ['ORTHO, JANE'],
  },
  {
    node: 'dx-orders',
    title: 'Manual Entry - Orders',
    chartNode: 'orders',
    provenance: '303486 image 72234862 (v02.22.92)',
    columns: [
      c('chart', 'Chart', 64, 'right'), dots('d1'), c('patient', 'Patient Name', 76), c('date', 'Date', 60, 'center'),
      c('type', 'Order Type', 92), dots('d2'), c('by', 'Ordered By', 118), dots('d3'),
      c('to', 'Order To', 130), dots('d4'), c('description', 'Description (Order For)', 170), dots('d5'), CLIP,
    ],
    filters: [64, 16, 76, 0, 92, 0, 118, 0, 130, 0, 170],
    rows: [
      { chart: '10035', patient: 'FARMER BROV', date: '2018.11.05', type: 'CONSULTATION', by: 'DR. DEREK SHEPHE', to: 'ARROWSMITH, RALPH C', description: 'BLADDER IMPLANTATION', clip: '-' },
    ],
    blank: { chart: '', patient: '', date: '', type: '', by: '', to: '', description: '', clip: '-' },
    tabs: null,
    fields: [
      { kind: 'text', label: 'Referred To:', value: 'ARROWSMITH, RALPH CRESWELL (R)', w: 250, lookup: true }, { kind: 'select', label: 'Status:', value: 'IN PROCESS', w: 96, pair: true },
      { kind: 'text', label: 'Copies To:', w: 250, lookup: true }, { kind: 'text', label: 'Facility:', w: 100, pair: true },
      { kind: 'text', label: 'Transcribed:', w: 250 }, { kind: 'text', label: 'Facility Ref.:', w: 100, pair: true },
      { kind: 'select', label: 'Payor:', w: 106 }, { kind: 'text', label: 'Facility Loc.:', w: 100, pair: true },
      { kind: 'report', label: 'Referral', anchor: 'referral' },
    ],
    history: null,
    distribute: ['INTERNIST, JIM'],
    footer: 'Created:',
  },
]

export const manualEntryFolder = (node: string): ManualEntryFolder | undefined =>
  MANUAL_ENTRY.find((f) => f.node === node)

/* ===========================================================================
   Document / Attachment List — 303489 image b5550316.
   What `Attachment` opens on a record with more than one attachment.
   ======================================================================== */
export const ATTACHMENT_LIST_COMMANDS = [
  'New Record', 'Delete Record', 'Save', 'Add Attachment', 'Open Attachment', 'Unlink Attachment',
]

export const ATTACHMENT_LIST_COLUMNS: ExColumn[] = [
  c('date', 'Date', 72, 'center'), c('author', 'Author', 90), c('type', 'Document Type', 120),
  c('venue', 'Source Venue', 114), c('authorType', 'Author Type', 102), c('role', 'Author Role', 106),
  c('note', 'Note', 110), c('s', 'S', 20, 'center'), c('m', 'M', 20, 'center'), CLIP,
]

export const ATTACHMENT_LIST_ROWS = [
  { date: '2014.12.04', author: 'DR. MOIS', type: 'MISC', venue: 'HOSPITAL', authorType: 'SPECIALIST', role: '', note: 'MAGNETIC RESONA', s: '', m: '\u21e9', clip: '1', file: '75_10000755.PNG' },
  { date: '2014.12.04', author: 'DR. MOIS', type: 'PHOTO', venue: 'HOSPITAL', authorType: 'SPECIALIST', role: '', note: 'MAGNETIC RESONA', s: '', m: '\u21e9', clip: '1', file: '75_10000756.PNG' },
]

/* ===========================================================================
   MSP — 303383 "MSP" and 303500 "How to Submit to Teleplan".
   ======================================================================== */

/** Prepare Bills — 303383 image 81237c69 */
export const PREPARE_BILLS = {
  title: 'Prepare Bills for MSP TELEPLAN VERSION 3.0 FORMAT',
  claims: [
    { label: 'Number of Completed Claims:', value: '-' },
    { label: 'Number of Held Claims:', value: '-' },
    { label: 'Number of Incomplete Claims:', value: '8' },
  ],
  user: 'kcahoon',
  date: '2014.05.29',
  path: 'C:\\AIHS\\DEV-MOIS-CURRENT\\DATASTORE\\msp\\',
  status: ['1. Ready', '2. Initializing Process', '3. Processing Claims', '4. Closing Process', '5. Process Complete.'],
}

/** Reconcile Remittance — 303383 image 723d1c60 */
export const RECONCILE = {
  title: 'Reconcile Claim Remittance Data',
  file: 'C:\\AIHS\\DEV-MOIS-CURRENT\\DATASTORE\\msp\\receive.dat',
  status: [
    '1. Ready', '2. Copying Files', '3. Creating Batch', '4. Reading File', '5. Saving File',
    '6. Initializing Objects', '7. Processing Records', '8. Closing Process', '9. Process Completed',
  ],
}

/** Teleplan Web Access — 303383 image 3b42f701; 303502 images 3073580c and
    e0dd550c for the Download Successful prompt. Eight radio options, one
    Go! button, the green "Login Result - SUCCESS" band, Show Detail. */
export const TELEPLAN_OPTIONS = [
  'Send and Receive', 'Send Only', 'Receive Only', 'Change Password',
  'Print Current Log', 'Print Previous Log', 'Download Fee Codes', 'Download Explanatory Codes',
]

export const TELEPLAN_LOGIN = 'Login Result - SUCCESS'

/** What a Go! adds to the log pane. 303383: each function writes a green
    header over its Teleplan log ("Uncheck the box to show only the green
    headers, and not the logs"), and a red one on an error. Only the login
    header is captured (3b42f701); these wordings are the stage's own. */
export const TELEPLAN_RESULTS: Record<string, string[]> = {
  'Send and Receive': ['Send Result - SUCCESS', 'Receive Result - SUCCESS'],
  'Send Only': ['Send Result - SUCCESS'],
  'Receive Only': ['Receive Result - SUCCESS'],
  'Change Password': ['Change Password - see Utilities > Change Teleplan Password'],
  'Print Current Log': ['Print Current Log - SUCCESS'],
  'Print Previous Log': ['Print Previous Log - SUCCESS'],
  'Download Fee Codes': ['Download Fee Codes - SUCCESS'],
  'Download Explanatory Codes': ['Download Explanatory Codes - SUCCESS'],
}

/* ===========================================================================
   Administration ▸ Prompt / Selection List Mgt ▸ Auto-Update Utilities.
   303084 image f5dda7e0 (v02.22.92); 3134339 images 6af8f5ab and 358fa649.
   ======================================================================== */
export const AUTO_UPDATE_ROWS = [
  { utility: 'MSP Fees', description: 'Update MSP Fees' },
  { utility: 'MSP Explanatory Codes', description: 'Update MSP Explanatory Codes' },
  { utility: 'DOBC Private Fee Codes', description: 'Update Private Fee Codes Using Doctors of BC Data File' },
  { utility: 'Code Mapping', description: 'Load code mappings from spreadsheet' },
]

/** Update DOBC Private Fees — 3134339 image 358fa649 */
export const DOBC_UPDATE = {
  band: "Doctor's of BC Private Fee Code Update",
  file: 'M:\\ci10\\uploads\\DOBCfees1Apr2022wDesc.txt',
  created: '2023.06.02 17:03',
  modified: '2023.06.02 17:03',
  groups: [
    { group: 'New', changes: '879', accepted: '879', rejected: '0', fill: '#fffbe0' },
    { group: 'Update', changes: '3447', accepted: '3447', rejected: '0', fill: '#eaf8e4' },
    { group: 'Ignore', changes: '58', accepted: '58', rejected: '0', fill: '#ececec' },
  ],
}

/* ===========================================================================
   Electronic Interfaces — 303384.
   ======================================================================== */

/** Send/Receive Electronic Data — 303491 image fcf7937c (v02.17.19). The two
    rows are that clinic's registered interfaces; 303491 lists the four a BC
    clinic can have (NHA, EXC, IHA, CDX). */
export const SEND_RECEIVE = {
  interfaces: [
    { code: 'EXC', description: 'Excelleris Lab Interface Technologies' },
    { code: 'CDX', description: 'Clinical Document Exchange' },
  ],
  inboxText:
    'The default user inbox will be used when an incoming lab has been matched to a patient but does not have a corresponding provider (ordering, cc\u2019d, and so on).  These results will be placed in the default user\u2019s in-basket.',
  user: 'AIHS Admin',
}

/** Setup / Registration — 303384 image de324c30, 303504 image 6f2b2b61. */
export const SETUP_REGISTRATION = {
  defaultInbox: 'AIHS Admin',
  codes: ['NHA', 'EXC', 'IHA', 'CDX'],
  rows: [
    { code: 'CDX', user: 'cdx-cdx-aihs', password: 'WinterSnow33', active: true },
    { code: 'EXC', user: 'EMRuserS', password: 'October123', active: true },
    { code: 'NHA', user: '.P-CIX-NHATEST1', password: '___cixnhatest1', active: false },
  ],
  users: ['AIHS Admin', 'DR SMITH', 'JOHN'],
  inboxNote: [
    'The selected user will be designated to receive all incoming lab messages when:',
    '- there is a patient match',
    '- there is NO provider match',
  ],
}

/** Lab Results — 303384 image dd8676f0 (Messages) and 333106 image
    8780d505 (Quality Review). */
export const LAB_RESULTS_COMMANDS = ['Open Detail (F4)', 'Refresh List (F5)', 'Print List', 'Close Window']
export const LAB_RESULTS_TABS = ['Messages', 'Quality Review']
export const LAB_RESULTS_FILTERS = {
  from: '2000.01.01', to: '2015.03.20',
  processingStatus: ['ALL', 'PROCESSED', 'UNMATCHED', 'PRINTED', 'IGNORED'],
}
export const LAB_RESULTS_COLUMNS: ExColumn[] = [
  c('patient', 'Patient Name', 160), c('sex', 'Sex', 34, 'center'), c('dob', 'DOB', 76, 'center'),
  c('provider', 'Provider', 48, 'center'), c('alias1', 'Alias 01', 58), c('alias1v', 'Alias 01', 86),
  c('alias2', 'Alias 02', 58), c('alias2v', 'Alias 02', 86), c('status', 'Status', 80),
  c('msgs', 'Msgs', 34, 'right'), c('chart', 'Chart No.', 58),
]
const lab = (patient: string, sex: string, dob: string, a1: string, a2: string, status: string, msgs: string, chart = '') =>
  ({ patient, sex, dob, provider: 'EXC', alias1: 'PHNBC', alias1v: a1, alias2: '', alias2v: a2, status, msgs, chart })
export const LAB_RESULTS_ROWS = [
  lab('AITCHISON, JOHN', 'F', '1111-11-11', '111111111', '11111111111', 'UNMATCHED', '4'),
  lab('BLACK, CINDY', 'F', '1969-12-01', '', '100049583', 'PROCESSED', '2', '186'),
  lab('DOWNSPOTO, ZEUS', 'F', '1945-04-26', '9890798305', '800000079', 'UNMATCHED', '2'),
  lab('EXCELLERIS, BBPATIENT', 'M', '1949-06-14', '9039676767', '', 'UNMATCHED', '3'),
  lab('EXCELLERIS, DPATIENT', 'F', '1980-10-18', '1009000111', 'D1009000111', 'PROCESSED', '1', '298'),
  lab('EXCELLERIS, JPATIENT', 'M', '1955-12-02', '9054123456', '10062891', 'UNMATCHED', '2'),
  lab('EXCELLERIS, JPATIENT', 'M', '1955-12-02', '9054123456', '7779630', 'PROCESSED', '1', '166'),
  lab('EXCELLERIS, RPATIENT', 'F', '1946-08-30', '1007210310', '0136097', 'UNMATCHED', '2'),
  lab('EXCELLERIS, VPATIENT', 'M', '1965-11-30', '1009000666', 'LM00303008', 'UNMATCHED', '3'),
  lab('EXCELLERIS, WPATIENT', 'F', '1962-10-22', '2222744855', 'PR00041152', 'PROCESSED', '1', '297'),
  lab('FHAMITEST, BHRAD', 'F', '1967-05-04', '', '', 'UNMATCHED', '6'),
  lab('HAMBURGER, IVANA', 'F', '1978-01-01', '9892653864', '100049587', 'UNMATCHED', '2'),
  lab('WHCC, SCOOBY', 'F', '1960-11-11', '9892649746', '100049586', 'UNMATCHED', '2'),
]

/** Patient Lab Detail — 303492 image cd14c83a */
export const LAB_DETAIL = {
  patient: 'LASTNAME, MIDDLE', dob: '2016-05-05', sex: 'M', alias1: 'PHNBC', alias2: '1111111',
  matchText: ['The data below has not been matched / linked to a patient\u2019s chart.', 'This is a manual process.'],
  columns: [
    c('orderedBy', 'Ordered By', 118), c('copyTo', 'Copy To', 118), c('facility', 'Facility / Lab', 110),
    c('ref', 'Lab ID / Ref.', 110), c('collected', 'Collected Date', 110), c('status', 'Process Status', 90),
    c('processed', 'Process Date', 96), c('target', 'Target Module', 86), CLIP,
  ] as ExColumn[],
  rows: [
    { orderedBy: 'BW1, DOCTOR', copyTo: 'BW1 DOCTOR', facility: 'VIHADI', ref: '11-16', collected: '2016-05-05 11:49', status: 'UNMATCHED', processed: '', target: 'IMAGING', clip: '-' },
    { orderedBy: 'BW1, DR', copyTo: 'BW1 DR', facility: 'CW', ref: '11-16', collected: '2016-11-10', status: 'UNMATCHED', processed: '', target: 'IMAGING', clip: '-' },
    { orderedBy: 'BW1, DR', copyTo: 'BW1 DR', facility: 'CW', ref: '11-16', collected: '2016-11-10', status: 'UNMATCHED', processed: '', target: 'IMAGING', clip: '-' },
  ],
  actions: [
    { label: 'Print - manual distribution required', key: '(Ctrl+P)', anchor: 'print-manual-distribution' },
    { label: 'Ignore - no action required', key: '(Ctrl+I)', anchor: 'ignore-no-action' },
    { label: 'Fax ALL reports', anchor: 'fax-all-reports' },
    { label: 'Print ALL reports', anchor: 'print-all-reports' },
    { label: 'Ignore ALL reports', anchor: 'ignore-all-reports' },
  ],
  report: [
    'Patient:  LASTNAME, MIDDLE            Acc No.:  11-16',
    '                                               1111111',
    'Age:  0 days        Sex: M',
    'Date of Birth:  2016-05-05              Service Date:  -- :',
    '',
    'Ordered By:  BW1, DOCTOR',
    'Copied To:   BW1 DOCTOR',
    '',
    'Study Performed:   Autopsy Report: Pathology Studies',
    'Reason for Study:',
    '  This is a line in the autopsy report.',
    '  This is a line in the autopsy report.',
  ].join('\n'),
}

/** Manual Lab Result Processing — 303492 image a6474f86 */
export const MANUAL_LAB = {
  chart: '262',
  matches: [
    { patient: 'TEST, BABYBOY', match: '2 / 4' }, { patient: 'TEST, BABYBOY', match: '2 / 4' },
    { patient: 'TEST, BOB', match: '2 / 4' }, { patient: 'TEST, BOB', match: '2 / 4' },
    { patient: 'TEST, JO-JO', match: '2 / 4' }, { patient: 'TEST, JO-JO', match: '2 / 4' },
    { patient: 'TEST, JOSEPHINE', match: '2 / 4' },
  ],
  picked: 2,
  info: [
    ['Chart:', '262'], ['Last Name:', 'TEST'], ['First Name:', 'BOB'], ['Middle Name:', ''],
    ['DoB:', '1955.02.13'], ['Gender:', 'F'], ['Phone:', ''], ['Cell:', ''], ['Status:', 'IA'],
    ['Insurance:', ''], ['Insurance Nbr.:', ''], ['Dep.:', '00'],
  ] as [string, string][],
  bold: ['Last Name:', 'DoB:', 'Gender:', 'Insurance:', 'Dep.:'],
  alias: ['MRNNHA   NORTHERN HEALTH NUMBER', '         11079633'],
  report: [
    'TEST, TROY                                   NH#:  11078544',
    'Enc#',
    'FT NELSON GH     Sex:  M        Age: 26 years     DOB:  1985-03-23',
    '                 Healthcare #:  UNKNOWN',
    '                 Ordering:  TEST, PHYSICIAN MID',
    '',
    'LAB',
    '  Collected Date:  2011-03-28',
    'Chemistry and Haematology',
    'PROCEDURE                     UNITS     REFERENCE RANGE',
    'RBC            N   5.00       x10(12)/L  4.30-5.50',
    'Hct            N   0.45       L/L        0.40-0.49',
    'MCHC           N   330        g/L        320-360',
    'Hgb            N   150        g/L        135-170',
    'WBC            N   4.5        x10(9)/L   4.0-10.0',
  ].join('\n'),
}

/** Inbox Distribution — 303384 image f6fddf3f */
export const INBOX_DISTRIBUTION = {
  from: '2015.03.05', to: '2015.03.19',
  heading: 'ELECTRONIC DATA USER INBOX SUMMARY AS OF 2015.03.19',
  columns: ['USER', '# OF MEASURES'],
  footer: ['PRINTED: Mar 19, 2015 4:32 pm', 'MOIS\u00ae Report: LIIBUSERv1', 'Page 1 of 1'],
}

/** Matching History — 303384 image 2d6f7f9c */
export const MATCHING_HISTORY_NOTES = {
  date: '(inclusive and required)',
  patient: '(LIKE search with space creating break - for example \u2018JO SM\u2019 will return JOAN SMITH and JOHN SMITH)',
  user: '(LIKE search for the User Name)',
  auto: 'Include Matched made by the INTERFACE',
}

/** Interface Data Audit — 303384 image 8489439b */
export const INTERFACE_AUDIT = {
  /* "Provider Indentifcation" is the article's spelling; the screen itself
     reads "Provider Identification" (8489439b) */
  types: ['Lab Code Mapping', 'Provider Identification', 'Patient Identification'],
  from: '2014.12.25', to: '2015.02.23',
  heading: 'LAB INTERFACE - LAB CODE AUDIT AS OF 2015.02.23',
  columns: ['FACILITY', 'MOIS CODE / DESCRIPTION', 'SUPPLIER CODE / DESCRIPTION', 'FREQUENCY'],
  footer: ['PRINTED: Feb 23, 2015 11:27 am', 'MOIS\u00ae Report: LIIAUDLAB1Sv1', 'Page 1 of 1'],
}

/* ===========================================================================
   Attachment Utilities — 303382.
   ======================================================================== */

/** Scan Files — 303382 image af49f461 (v02.21.15) */
export const SCAN_FILES = {
  commands: ['Start Scan', 'Refresh', 'Close Window'],
  folder: 'C:\\AIHS\\SHARED_FOLDER_2_21_15\\scanning\\',
  files: [
    '20131007_110414_36.pdf', '20131007_110415_37.pdf', '20131007_110415_38.pdf', '20131007_110415_39.pdf',
    '20131007_110416_40.pdf', '20131007_110416_41.pdf', '20131007_110416_42.pdf', '20131007_110416_43.pdf',
    '20131007_110416_44.pdf', '20131007_110416_45.pdf', 'Bone-Density - Copy.pdf', 'merged_1.pdf',
    'merged_1_admin.pdf', 'merged_2.pdf', 'merged_3.pdf', 'Sleep Questionnaire.pdf', 'Sleeptech referral form.pdf',
  ],
  current: 12,
  count: '36 Documents',
  preview: [
    'PG IMAGING DEPARTMENT',
    '',
    'ORDERING PHYSICIAN: Dr. Bill',
    '',
    'PATIENT:  Andy Capp',
    'PROCEDURE DATE: Feb 27, 2010',
    '',
    'ULTRASOUND OF ABDOMEN:',
    '',
    'Representative images through gallbladder, common duct, liver,',
    'pancreas, spleen and kidneys are normal. No free fluid in the upper',
    'abdomen is evident.',
  ],
}

/** Attach Files — 303488 image bf17b446 (v02.22.92) and 303382 image
    2315eccf (v02.22.93, the Record band filled in for a Procedure). */
export const ATTACH_FILES = {
  commands: ['Attach', 'Unattach', 'Delete File', 'Refresh', 'Open Chart', 'Link to Order', 'Print', 'Tear Off', 'Close Window'],
  folder: 'C:\\AIHS\\SHARED_FOLDER\\',
  files: [
    '12_10000053.rtf', '146_10000134.jpg', '146_10000135.gif', '20131007_110412_22.pdf', '20131007_110412_23.pdf',
    '20131007_110412_24.pdf', '20131007_110412_25.pdf', '20131007_110412_26.pdf', '20131007_110412_27.pdf',
    '20131007_110412_28.pdf', '20131007_110413_29.pdf', '20131007_110413_30.pdf', '20131007_110414_32.pdf',
  ],
  types: ['', 'Consult', 'Document', 'Facility Admission', 'Imaging', 'Measure', 'Order', 'Procedure'],
  preview: [
    '                         Dr. Bill',
    '                   2000 - Central Street',
    '                    Prince George, BC',
    '                         V2K 2G4',
    '',
    'FOR PATIENT:',
    'NAME:    MARTHA  FEENY                 DOB: 1932/03/02   GENDER: F',
    'PHN:     BC 9030205973 00              AGE: 79           CHART: 11',
    '',
    'REFERRAL:2011/06/22',
    'RE:      ABDOMEN - SYMPTOMS OF',
    '',
    'ABEL, James Gordon',
    '         This is my letter.',
  ],
  distribute: ['HALLIWELL, ALYSSA'],
}

/* ===========================================================================
   Chart Exchange — 303493, 303590, 303496, 303497, 303494.
   ======================================================================== */

/** Export Chart(s) — 303493 image 46924bab (v02.30.36); 303494 0d55320e */
export const EXPORT_CHARTS = {
  selectBy: ['Chart Number(s)', 'Chart Range', 'Service Provider'],
  charts: '10010',
  output: 'M:\\ce01\\uploads\\New folder',
  formats: ['MOIS Export', 'Chart PDF Export'],
  key: '240502',
  keyNote: 'Used to protect the file and MUST be communicated to recipient.',
  note: 'Change doctors',
  logColumns: [c('chart', 'Chart', 96, 'center'), c('patient', 'Patient', 160), c('status', 'Status')] as ExColumn[],
}

/** Chart Export Log Reports — 303590 image c7cb3ccf */
export const EXPORT_LOGS = {
  columns: [c('reference', 'Reference', 88), c('date', 'Date', 72, 'center'), c('user', 'User', 96),
    c('key', 'Encrypt Key', 110), c('note', 'Reason / Note', 240)] as ExColumn[],
  rows: [
    { reference: '10000020', date: '2015.02.23', user: 'z AIHS KSAMWAY', key: '150223', note: 'Changing doctors' },
    { reference: '10000019', date: '2015.02.23', user: 'z AIHS KSAMWAY', key: '150223', note: 'Changing doctors' },
  ],
  report: {
    heading: 'CHART EXPORT LOG',
    lines: [
      ['EXPORT DATE:', '2015/02/23', 'EXPORTED BY:', 'z AIHS KSAMWAYS'],
      ['REASON/NOTE:', 'Changing doctors', 'ENCRYPT KEY:', '150223'],
      ['', '', 'REFERENCE:', '10000020'],
    ],
    file: 'FILE NAME:  TORRE-PC -> C:\\AIHS\\DEV-MOIS-TESTING\\DATASTORE\\MOIS_REF_10000020.7z',
    section: 'SUCCESSFUL CHART EXPORTS',
    columns: ['CHART NO.', 'LAST NAME', 'FIRST NAME', 'MIDDLE', 'SEX', 'DOB', 'INSURANCE NUMBER'],
    rows: [
      ['75', 'BOOP', 'BETTY', '', 'F', '1961/11/19', 'BC  9151252098'],
      ['79', 'BUMSTEAD', 'CARLA', '', 'F', '1963/08/02', 'BC  9050171077'],
    ],
  },
}

/** Import Chart(s) — 303497 image 9f0ea9c0 (v02.30.36) */
export const IMPORT_CHARTS = {
  file: 'M:\\ce01\\uploads\\New folder\\MOIS_REF_10000006.7z',
  key: '240501',
}

/** Chart Import — 303497 image 80dac923 (v02.17.16). The v02.17 dialog says
    unmapped records are "marked as IMPORT"; 303497 (newer) says they read
    "SEE NOTE". The capture's wording is kept here. */
export const CHART_IMPORT = {
  provider: [
    ['Clinic:', 'MOIS DEVELOPMENT - NOT FOR PRODUCTION USE'], ['Contact:', 'z AIHS KSAMWAYS'], ['Reference:', '10000020'],
  ],
  software: [['Software:', 'MOIS'], ['Version:', '02.17.16'], ['Date:', '2015/02/23']],
  build: [['Build:', '150223'], ['Time:', '11:45:48']],
  mappingText:
    'This is a list of providers from the data provider\u2019s clinic. Mapping a source provider\u2019s profile to a New Provider will update the Encounter and Order records accordingly.  Otherwise, for unmapped providers, the Encounter and Order records will be marked as IMPORT.',
  providers: [
    'BELLE, DR', 'CARE TEAM, PRINCE', 'CNC DOCTOR', 'DR SMITH', 'DR. GORLEY', 'DR. TESTING', 'EMERGENCY',
    'GEORGE, DR', 'MCGREGGOR, ALICE', 'REDDY, DEVAN', 'SMITH, JOHN', 'TEST DR', 'WIGGINS, SAMANTHA',
  ],
  recordsText:
    'This is a list of ALL the patient records delivered by the data provider clinic.  For each patient, MOIS will create a new chart.  Once completed, MOIS will prepare a list of \u2018Chart Merge Candidates\u2019 based on matching patient\u2019s last name, date of birth, gender, and insurance number.  This list can be used to manual merge potential duplicate charts.',
  records: [
    { n: '1', last: 'BOOP', first: 'BETTY', middle: '', sex: 'F', dob: '1961/11/19', ins: 'BC', number: '9151252098' },
    { n: '2', last: 'BUMSTEAD', first: 'CARLA', middle: '', sex: 'F', dob: '1963/08/02', ins: 'BC', number: '9050171077' },
  ],
}

/** Chart Import Log Reports — 303496 image 8d18b9db */
export const IMPORT_LOGS = {
  columns: [c('date', 'Import Date', 80, 'center'), c('user', 'User', 118), c('clinic', 'From Clinic', 250),
    c('contact', 'Contact', 96), c('reference', 'Reference', 88), c('exported', 'Date Exported', 90, 'center'),
    c('time', 'Time', 60, 'center')] as ExColumn[],
  rows: [
    { date: '2014.11.05', user: 'AHMED, ABDULLAH', clinic: 'MOIS DEVELOPMENT - NOT FOR PRODUCTION US', contact: 'AHMED, ABDULLAI', reference: '10000018', exported: '2014/11/05', time: '11:02' },
    { date: '2014.08.20', user: 'DR. BILL', clinic: 'MOIS DEVELOPMENT - NOT FOR PRODUCTION US', contact: 'DR. BILL', reference: '10000017', exported: '2014/08/20', time: '09:41' },
  ],
  report: {
    heading: 'CHART IMPORT LOG',
    lines: [
      ['CLINIC:', 'MOIS DEVELOPMENT - NOT FOR PRODUCTION USE', 'SOFTWARE:', 'MOIS'],
      ['CONTACT:', 'AHMED, ABDULLAH', 'VERSION:', '02.17.07'],
      ['REF.:', '10000018', 'EXPORT DATE:', '2014/11/05'],
    ],
    file: 'DATE IMPORTED:  2014/11/05          IMPORTED BY:  AHMED, ABDULLAH',
    section: '',
    columns: ['LAST NAME', 'FIRST NAME', 'MIDDLE', 'SEX', 'DOB', 'INSURANCE NUMBER', 'CHART NO.'],
    rows: [['<MC> MOUSE', 'DONALD', '', 'M', '1963/09/15', 'BC  9098765177', '283']],
  },
}
