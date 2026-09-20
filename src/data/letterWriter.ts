/* ============================================================================
   MOIS Letter Writer — the current flat generation.

   Three generations of this window exist in the vendor's manual and they must
   not be merged: `classic` (navy #08246b title bar, read-only Author / Primary
   Recipient / Copies To + Diag. Code / Diag. Desc, four buttons in `Other`),
   `v2` (teal #038387, 4+4 header fields, five buttons) and the `current flat`
   generation (cyan #66cbea, 4+4 header fields, five buttons in `Other` plus a
   sixth toolbox group `Document > Insert Signature`).

   Everything here is the CURRENT FLAT generation, which is the one the newest
   capture in the corpus shows.

   PROVENANCE. Every measurement below carries the capture it came from, using
   the manual's `article/sha12` form:

     304687/fe7ad734ae59   1017x275, 1:1, TRUE COLOUR — the band stack, the
                           header field grid, the Source and Created rows.
     304755/c59d6282a6c8   1007x766, 1:1, true colour — the toolbox rail
                           geometry, the format toolbar and the status bar.
     304687/cc487e1801e4   1022x777, 1:1 — the five-button `Other` group and
                           the salmon/blue document colours.
     304687/db26eadc539f   1268x898, 1.25 — the only capture of the
                           `Document > Insert Signature` group.
     303101/57c549923ad1   1261x784, 1.25 — the template-design variant.
     304687/d5e7529a32e2   1674x716, 1:1 — the Add-Table output table.
     304687/23324eb64b32   — the Add-Detail output block.
     304687/ba222444b2c6   1022x684 — the Selection Window (Measures List).
     304687/4b38950212f4   1022x684 — the Selection Window (Facility
                           Admissions List).
     304687/0f2cd512f237   — the Selection Window's Attachment List variant.

   COLOUR FIDELITY. The classic-theme captures are 8-bit palettised, so
   #c8dcfa reads back as (206,223,255) and #e89c84 as (239,158,132) in them.
   The true-colour captures return both exactly. Every colour below is taken
   from a true-colour capture unless it says otherwise.

   Patients, providers and letter text are synthetic training data.
   ========================================================================= */

/* --- colours -------------------------------------------------------------
   The two that matter most are LW_POPULATOR and LW_ORDER_FIELD: they are what
   the window is for. Salmon marks text pulled from the source record and is
   read-only; blue marks the one field the user may edit here, whose edit
   reads back into the Order.                                              */
export const LW = {
  /** title bar, current flat generation (v2 is #038387, classic #08246b) */
  titleBar: '#66cbea',
  /** command row, document-title band, group header bands */
  band: '#dcd7d2',
  /** menu bar, format toolbar, toolbox panel */
  face: '#f0f0f0',
  /** 1px band rules */
  rule: '#646464',
  /** 1px panel splitters and the two soft rules inside the header block */
  ruleSoft: '#c8c8c8',
  /** header panel gradient, top -> bottom. NOT a flat #c8dcfa fill: it only
      grazes (199,222,246) mid-panel. 304687/fe7ad734ae59, true colour. */
  headerTop: '#b8d5f3',
  headerBottom: '#fefeff',
  /** populator wash: text populated from the source record, read-only */
  populator: '#ffc09c',
  /** the "field in blue" — editable here, reads back to the Order */
  orderField: '#bee6f8',
  /** template-design populators, and Add-Table / Add-Detail output cells */
  yellow: '#ffff9c',
  /** generated-table header row */
  tableHead: '#c0c0c0',
  /** toolbox buttons */
  btnFace: '#e1e1e1',
  btnBorder: '#adadad',
  /** toolbox group-box borders, x=862 and x=1004 in 304755/c59d6282a6c8 */
  groupBorder: '#dcdcdc',
  link: '#0000ff',
} as const

/* --- the band stack (1:1, measured at x=600) -----------------------------
   y 0-29     30  title bar            #66cbea
   y 30-49    20  menu bar             #f0f0f0
   y 50        1  rule                 #646464
   y 51-70    20  command row          #dcd7d2
   y 71        1  rule                 #646464
   y 72-91    20  document-title band  #dcd7d2, bold, text from x=12
   y 92        1  rule                 #646464
   y 93-182   90  header field panel   gradient, 4 rows at 21px pitch
   y 183       1  rule                 #c8c8c8
   y 184-202  19  Source row           gradient continues
   y 203       1  rule                 #c8c8c8
   y 204-221  18  Created row          gradient continues
   y 222       1  rule                 #646464
   y 223-270  48  format toolbar       #f0f0f0
   y 271+         ruler, then the document canvas                          */
export const LW_BANDS = {
  titleBar: 30,
  menuBar: 20,
  commandRow: 20,
  docTitle: 20,
  headerPanel: 90,
  sourceRow: 19,
  createdRow: 18,
  formatToolbar: 48,
  /** 4 header rows at y 102/123/144/165 inside a panel that opens at y=93 */
  headerRowPitch: 21,
  /** the header block the gradient runs across: 90 + 1 + 19 + 1 + 18 */
  headerBlock: 129,
} as const

/* --- the right rail's geometry (304755/c59d6282a6c8, 1:1) ----------------
   1px #000000 rule x=850, #c8c8c8 splitter x=855, panel #f0f0f0 x 856-1006,
   group-box borders #dcdcdc at x=862 and x=1004. Buttons x 877-983.

   The command row runs empty #dcd7d2 to x~855 with a double-chevron collapse
   glyph at x 836-848, y 57-68, so the rail starts level with the command row
   rather than below it.                                                    */
export const LW_RAIL = {
  /** the left column, from the window's left edge to the #646464 rule */
  contentW: 856,
  /** #f0f0f0 panel, x 862-1006 */
  panelW: 145,
  /** measured: x 877-983 */
  buttonW: 107,
  buttonH: 24,
  /** 24px tall on a 27px pitch, so a 3px gap */
  buttonPitch: 27,
} as const

/* --- command row ---------------------------------------------------------
   Six flat buttons, butted, separated by 2px #000000 rules (each button
   keeps its own 1px border). Measured independently in four captures and
   identical in all of them; at 1.25 the same rules land at 96/96/108/96/96/96.

   The captions' glossary is the vendor's own, verbatim from 304687.        */
export type LetterCommand = { label: string; width: number; hint: string }

export const LETTER_WRITER_COMMANDS: LetterCommand[] = [
  { label: 'Save', width: 77, hint: 'Save the letter' },
  { label: 'Link to Order', width: 77, hint: 'Link this letter to an available Order' },
  { label: 'Create Message', width: 87, hint: 'Create a message from the letter' },
  { label: 'Create Task', width: 77, hint: 'Create a task from the letter' },
  { label: 'Distribute...', width: 77, hint: 'Distribute the letter through CDX E2E Messaging' },
  { label: 'Spelling...', width: 77, hint: 'Prompts the MOIS Spell Checker to check for spelling errors' },
]

/** Template-design mode keeps only the first and last button (303101). */
export const TEMPLATE_DESIGN_COMMANDS: LetterCommand[] = [
  { label: 'Save', width: 77, hint: 'Save the template' },
  { label: 'Spelling...', width: 77, hint: 'Prompts the MOIS Spell Checker to check for spelling errors' },
]

/* --- menu bar ------------------------------------------------------------
   Seven captions. Only `File` has been captured expanded (304687/a9e28c40990d)
   and the capture is authoritative over the prose beside it: the prose lists a
   `Fax` item that the capture does not have. Fax survives only as a value of
   the `Method` column in Create Distribution.

   Edit / View / Insert / Format / Table / Action are referenced in the same
   article but were never opened, so their items are unknown and they are left
   as bare captions here rather than invented.                              */
export type LetterMenu = { label: string; menu?: { label?: string; key?: string; sep?: boolean }[] }

export const LETTER_MENUS: LetterMenu[] = [
  {
    label: 'File',
    menu: [
      { label: 'Save Letter', key: 'F2' },
      { label: 'Load Template / File...' },
      { sep: true },
      { label: 'Page Setup...' },
      { label: 'Print Preview' },
      { label: 'Print', key: 'Ctrl+P' },
      { label: 'Print To...', key: 'Ctrl+Shift+P' },
      { label: 'Distribute...' },
      { sep: true },
      { label: 'Close' },
    ],
  },
  { label: 'Edit' },
  { label: 'View' },
  { label: 'Insert' },
  { label: 'Format' },
  { label: 'Table' },
  { label: 'Action' },
]

/* --- header fields -------------------------------------------------------
   Left column: labels left-aligned at x=17, values at x~127. Right column:
   labels right-aligned ending x~490, values from x~493. Row pitch 21px.

   Every value is static text in the referral mode captured at
   304687/fe7ad734ae59 — the article's own words: "these fields are read-only
   from the top of the Letter Writer to encourage users to change the details
   only from the source record (the Order)". The care-plan variant gives each
   left-column field an `...` ellipsis and turns `Type:` into a
   DropDownDataWindow (2070139/5dc6ad4fc232); the Send window gives `Author:`
   and `Primary Recipient:` an ellipsis (2961349/b6c1e819e42a).             */
export const LW_HEADER_GRID = {
  /** x=17 -> x=127 */
  labelLeftW: 110,
  /** value column, x=127 to the right-hand label column */
  valueLeftW: 273,
  /** right-aligned labels ending x~490 */
  labelRightW: 90,
  padLeft: 17,
} as const

export type LetterHeaderField = { label: string; value: string }

/* Row 3 of the right column is document-type dependent and must not be
   hard-coded: `Diagnosis:` for a referral, `Service Event:` on a service
   event, `Note:` on a Shared Care Plan. Prose only ever says "Diagnosis".  */
export type LetterDocumentType = {
  id: string
  /** what the bold document-title band prints */
  title: string
  /** the `Type:` value */
  type: string
  /** the varying label of row 3R */
  row3Label: string
  row3Value: string
  /** the `Code:` value */
  code: string
  /** what the Source row prints after the date */
  loinc: string
  loincName: string
  citation: string
}

export const LETTER_DOCUMENT_TYPES: LetterDocumentType[] = [
  {
    id: 'referral',
    title: 'REFERRAL NOTE - ACCENTUATED SPLIT OF SECOND HEART SOUND, S>2<',
    type: 'REFERRAL',
    row3Label: 'Diagnosis:',
    row3Value: 'ACCENTUATED SPLIT OF SECOND HEART SOUND, S>2<',
    code: 'SNOMED-CT: 76398007',
    loinc: 'LOINC 57133-1',
    loincName: '- Referral Note',
    citation: '304687/fe7ad734ae59, 304755/c59d6282a6c8',
  },
  {
    id: 'service-event',
    title: 'SERVICE EVENT NOTE - COMPLEX CARE PLANNING',
    type: 'MISC',
    row3Label: 'Service Event:',
    row3Value: 'COMPLEX CARE PLANNING',
    code: 'SNOMED-CT: 386053000',
    loinc: 'LOINC X10916',
    loincName: '- Information Request',
    citation: '304687/db26eadc539f, 2961349/24dd02c9c347',
  },
  {
    id: 'care-plan',
    title: 'SHARED CARE PLAN - PLAN OF CARE SNAPSHOT',
    type: 'SHARED CARE PLAN',
    row3Label: 'Note:',
    row3Value: 'PLAN OF CARE SNAPSHOT 2026.03.18',
    code: 'SNOMED-CT: 773130005',
    loinc: 'LOINC 80777-6',
    loincName: '- Shared Care Plan',
    citation: '2070139/5dc6ad4fc232',
  },
]

/** The four left-hand fields, with the defaults the capture shows. */
export const LW_LEFT_FIELDS: LetterHeaderField[] = [
  { label: 'Attending:', value: 'ADMINISTRATOR' },
  { label: 'Author:', value: 'DR. DEREK SHEPHERD' },
  /* measured empty in 304687/fe7ad734ae59 */
  { label: 'Responsible Org.:', value: '' },
  { label: 'Primary Recipient:', value: 'PEDIATRICIAN, ANDY' },
]

/* --- Source and Created rows ---------------------------------------------
   Both are measured to the pixel, so the emulator places each run at its own
   x rather than flowing them. From 304687/fe7ad734ae59 (1:1, true colour).

   The signed indicator is the right-hand slot of the Source row, and its
   styling differs by window: on the CURRENT Letter Writer it is #000000 bold
   and NOT a link (304755/c59d6282a6c8 — 280px of pure black in the glyph
   box); on the classic consult variant and on Order Detail it is a #0000ff
   hyperlink. Every Letter Writer capture in the corpus reads UNSIGNED: what
   a signed one looks like is not captured anywhere.                        */
export type LetterMetaRun = {
  x: number
  text: string
  bold?: boolean
  /** names the run for tutorials, as `host.mois.field.<field>` */
  field?: string
}

export const LW_SOURCE_ROW: LetterMetaRun[] = [
  { x: 18, text: 'Source:' },
  { x: 94, text: 'SYSTEM', field: 'source' },
  { x: 208, text: 'Date:' },
  { x: 241, text: '2018.09.10', field: 'record-date' },
  { x: 343, text: 'LOINC 57133-1', field: 'loinc' },
  { x: 423, text: '- Referral Note' },
  { x: 745, text: 'UNSIGNED', bold: true, field: 'signed-state' },
]

export const LW_CREATED_ROW: LetterMetaRun[] = [
  { x: 18, text: 'Created:' },
  { x: 94, text: '2018.09.10 16:09 ADMINISTRATOR', field: 'created' },
  { x: 366, text: 'Last Modified: 2018.09.10 16:10 ADMINISTRATOR', field: 'last-modified' },
  { x: 731, text: 'ENC# EMPTY', bold: true, field: 'enc-number' },
]

/* --- format toolbar ------------------------------------------------------
   Left to right, from 304755/c59d6282a6c8 (control borders at x 417, 499,
   605, 675, 757, 768, 781). The band is 48px tall; the capture gives one
   horizontal sequence of control borders, so the controls are laid out as a
   single row — the vertical distribution inside the 48px is INFERRED.      */
export const LW_TOOLBAR = {
  styles: ['[Normal]'],
  fonts: ['Arial', 'Times New Roman', 'Courier New'],
  sizes: ['10', '12', '14'],
  zooms: ['90%', '100%', '75%'],
} as const

/* --- status bar ----------------------------------------------------------
   Cell borders at 31,104,114,176,186,232,242,283,293,324,334,370,380,413,
   then the right-hand zoom widgets from x=647. Classic wording differs:
   `Section1/1 | Pg:1/2 | Line 1 | Column 0 | 90 % | | | NUM`.              */
export const LW_STATUS: { text: string; width: number }[] = [
  { text: 'Section1/1', width: 73 },
  { text: 'Page1/2', width: 62 },
  { text: 'Line12', width: 46 },
  { text: 'Col0', width: 41 },
  { text: '', width: 31 },
  { text: '', width: 36 },
  { text: 'NUM', width: 33 },
]

/* --- the toolbox rail ----------------------------------------------------
   Group order for the current generation (304687/db26eadc539f). Classic has
   four buttons in `Other` (no `Paste Care Plan`) and no `Document` group.

   No article mentions `Document > Insert Signature`; only the capture shows
   it, and no prose, dialog or result capture exists for what it does.      */
export type ToolboxGroup =
  | { kind: 'link'; title: string; label: string }
  | { kind: 'source'; title: string; label: string; options: string[]; button: string; note: string }
  | { kind: 'buttons'; title: string; buttons: { label: string; hint?: string }[] }
  | { kind: 'text'; title: string; text: string; button?: string; note?: string }
  | { kind: 'fields'; title: string; fields: { label: string; options: string[] }[]; button: string }

/** Prose lists 17 table sources; no capture shows the list expanded, so its
    height, sort order and control class are unmeasured. MEASURE LIST and
    DOCUMENT LIST are the two seen live in a closed field. */
export const TABLE_SOURCES = [
  'MEASURE LIST', 'DOCUMENT LIST', 'ADMISSION LIST', 'ALLERGY LIST', 'BPMH LIST',
  'CONSULT LIST', 'ENCOUNTER LIST', 'FAMILY HX LIST', 'GOALS LIST', 'HEALTH ISSUE LIST',
  'IMAGE LIST', 'INTERVENTION LIST', 'LT MEDS LIST', 'PREFERENCES LIST',
  'PROCEDURE LIST', 'SOCIAL HX LIST', 'TASK LIST',
]

/** Prose lists 9 detail sources; IMAGE DETAIL is the one seen live. */
export const DATA_SOURCES = [
  'IMAGE DETAIL', 'ADMISSION DETAIL', 'CONSULT DETAIL', 'DOCUMENT DETAIL',
  'INTERVENTION DETAIL', 'MEASURE DETAIL', 'MESSAGE DETAIL', 'PROCEDURE DETAIL',
  'TASK DETAIL',
]

export const LETTER_TOOLBOX: ToolboxGroup[] = [
  { kind: 'link', title: 'Help?', label: 'Help?' },
  {
    kind: 'source',
    title: 'Add Table of Records',
    label: 'Table Source:',
    options: TABLE_SOURCES,
    button: 'Add Table',
    note: 'Adds a table of records from the chart to the letter.',
  },
  {
    kind: 'source',
    title: 'Add Detail Report',
    label: 'Data Source:',
    options: DATA_SOURCES,
    button: 'Add Detail',
    note: 'Adds a labelled detail block rather than a row table.',
  },
  {
    kind: 'buttons',
    title: 'Re-populate Fields',
    /* six buttons at y 315/342/369/396/423/450 — a 27px pitch. Glossary
       verbatim from 304687. */
    buttons: [
      { label: 'Patient Data', hint: 'Patient Demographic information' },
      { label: 'Internal Provider', hint: 'Provider signature, practitioner number, payee number, or letterhead' },
      { label: 'External Provider', hint: 'Provider contact information' },
      { label: 'Desktop Provider', hint: 'Provider signature, practitioner number, payee number, or letterhead' },
      { label: 'General Data', hint: 'General information (e.g. current date, page numbers)' },
      { label: 'Record Data', hint: 'Record date, code, description, or comment' },
    ],
  },
  {
    kind: 'buttons',
    title: 'Other',
    /* five in the current generation; four in classic, which has no
       `Paste Care Plan`. The prose lists it both ways; the capture wins. */
    buttons: [
      { label: 'Paste Provider Data' },
      { label: 'Paste Patient Data' },
      { label: 'Paste Care Plan' },
      { label: 'Paste Progress Note' },
      { label: 'Attachments' },
    ],
  },
  {
    kind: 'buttons',
    title: 'Document',
    /* 304687/db26eadc539f only. Undocumented in every article. */
    buttons: [{ label: 'Insert Signature' }],
  },
]

/* Template-design mode replaces the whole rail (303101/57c549923ad1). The
   seven `Add Database Field` sources and the nineteen tags are the article's
   own lists, verbatim. */
export const ADD_FIELD_SOURCES = [
  'Patient Chart', 'External Provider', 'Internal Provider', 'Desktop Provider',
  'Record Information', 'General', 'Progress Note',
]

export const ADD_FIELD_FIELDS = [
  'Patient Full Name', 'Patient PHN Province', 'Patient Date of Birth',
  'Patient Chart Number', 'Patient Address',
]

export const ADD_TAG_LIST = [
  'BPMH', 'Consults', 'Document List', 'Encounter List', 'Facility Admission',
  'Family History', 'Goals List', 'Health Issue List', 'Imaging', 'Interventions',
  'Long Term Meds List', 'Measurements', 'Message List', 'Preferences List',
  'Prescription List', 'Procedures', 'Reaction Risks (Allergies)', 'Social History',
  'Task List',
]

export const TEMPLATE_TOOLBOX: ToolboxGroup[] = [
  {
    kind: 'fields',
    title: 'Add Database Field',
    fields: [
      { label: 'Source:', options: ADD_FIELD_SOURCES },
      { label: 'Field:', options: ADD_FIELD_FIELDS },
    ],
    button: 'Add Field',
  },
  {
    kind: 'text',
    title: 'Remove Field',
    text: 'Place your cursor in the yellow field and press Delete Field. '
      + '(Delete and backspace will not operate on these fields.)',
    button: 'Delete Field',
    note: '(New: Double-Click field for prompt)',
  },
  {
    kind: 'source',
    title: 'Add Tag',
    label: 'Source:',
    options: ADD_TAG_LIST,
    button: 'Add Tag',
    note: 'A tag on the line below a header leaves one blank line before the table.',
  },
  {
    kind: 'text',
    title: 'Remove Tag',
    /* the only group in the rail with no button at all */
    text: 'Select the whole tag, including the angle brackets, and cut it.',
  },
]

/* --- the document ---------------------------------------------------------
   The body is a token stream rather than a string, because the two colours
   ARE the content: `pop` is the #ffc09c salmon wash the article describes as
   "text ... populated from a field from your source record", and `order` is
   the single #bee6f8 blue field — "this can be modified in the Letter Writer
   by the user and will read back/update the Order; you will see these changes
   in the 'Referral Note' box on that record in the Patient Chart".         */
export type LetterToken =
  | { t: 'plain'; s: string }
  | { t: 'pop'; s: string }
  | { t: 'order'; s: string }

export type LetterParagraph = { tokens: LetterToken[]; bold?: boolean; gap?: number }

const plain = (s: string): LetterToken => ({ t: 'plain', s })
const pop = (s: string): LetterToken => ({ t: 'pop', s })

export const LETTER_BODY: LetterParagraph[] = [
  { tokens: [pop('NORTHERN VALLEY FAMILY PRACTICE')], bold: true },
  { tokens: [pop('1188 CENTRAL STREET, PRINCE GEORGE BC  V2L 1X4')] },
  { tokens: [pop('TEL 250.555.0142    FAX 250.555.0143')], gap: 14 },
  { tokens: [pop('2018.09.10')], gap: 14 },
  { tokens: [pop('PEDIATRICIAN, ANDY')] },
  { tokens: [pop('300 - 1900 VICTORIA STREET')] },
  { tokens: [pop('PRINCE GEORGE BC  V2L 2L8')], gap: 14 },
  { tokens: [plain('Dear '), pop('DR. ANDY PEDIATRICIAN'), plain(',')], gap: 10 },
  {
    tokens: [
      plain('Re: '), pop('MORRISON, ASHLEE'), plain('   DoB '), pop('1979.10.23'),
      plain('   PHN '), pop('BC 915125951'),
    ],
    gap: 12,
  },
  {
    tokens: [
      plain('Thank you for seeing this patient, who is referred with '),
      pop('ACCENTUATED SPLIT OF SECOND HEART SOUND, S>2<'), plain('.'),
    ],
    gap: 12,
  },
  { tokens: [{ t: 'order', s: '<ENTER REPORT HERE>' }], gap: 14 },
  { tokens: [plain('Kind regards,')], gap: 20 },
  { tokens: [pop('DR. DEREK SHEPHERD')] },
  { tokens: [pop('MSP 12345')] },
]

/* --- Add Table of Records output ----------------------------------------
   The table lands in the document with a #c0c0c0 header row and #ffff9c cell
   fills. Columns for the measure list, measured at 304687/d5e7529a32e2. Only
   the MEASURE LIST output is captured; the other sixteen sources are named in
   prose but no capture shows what they emit.                               */
export const MEASURE_TABLE = {
  source: 'MEASURE LIST',
  columns: ['DATE', 'TEST NAME', 'FLAG', 'VALUE', 'UNITS', 'REF RANGE'],
  rows: [
    ['2018.08.22', 'HEMOGLOBIN A1C', 'H', '8.4', '%', '4.0 - 6.0'],
    ['2018.05.14', 'HEMOGLOBIN A1C', 'H', '8.1', '%', '4.0 - 6.0'],
    ['2018.02.06', 'HEMOGLOBIN A1C', '', '6.9', '%', '4.0 - 6.0'],
  ],
}

/* --- Add Detail Report output --------------------------------------------
   A labelled block rather than a row table, all #ffff9c (304687/23324eb64b32).
   Left column then a second column, then two full-width blocks.            */
export const IMAGE_DETAIL_BLOCK = {
  source: 'IMAGE DETAIL',
  title: 'IMAGE REPORT',
  left: [
    ['Performed', '2018.07.30'],
    ['Code', '71020'],
    ['Description', 'CHEST X-RAY, 2 VIEWS'],
    ['Region', 'CHEST'],
    ['Laterality', 'N/A'],
  ],
  right: [
    ['Ordered By', 'DR. DEREK SHEPHERD'],
    ['Modality', 'DX'],
    ['Contrast', 'NONE'],
  ],
  blocks: [
    ['Radiology Report', 'Lungs are clear. Heart size within normal limits. No acute findings.'],
    ['Patient ID', 'BC 915125951'],
  ],
}

/* --- the Selection Window (Add Table / Add Detail / Attachments) ----------
   304687/ba222444b2c6 and 304687/4b38950212f4, both 1022x684.

   The first two columns of a RECORD list are headed `Table` and `Detail`;
   only the Attachment List uses `Select`. The prose in the same article calls
   the first column `Select` for every list, and the captures say otherwise.  */
export type SelectionList = {
  /** what the left group header prints */
  title: string
  columns: { key: string; header: string; width?: number; check?: boolean; link?: boolean }[]
  rows: Record<string, string | boolean>[]
  /** the Attachment List alone carries `Select All` beside `Clear Selections` */
  selectAll?: boolean
}

export const SELECTION_LISTS: Record<string, SelectionList> = {
  'MEASURE LIST': {
    title: 'Measures List',
    columns: [
      { key: 'table', header: 'Table', width: 40, check: true },
      { key: 'detail', header: 'Detail', width: 42, check: true },
      { key: 'date', header: 'Date', width: 80 },
      { key: 'test', header: 'Test name', width: 220 },
      { key: 'value', header: 'Value', width: 80 },
      { key: 'flag', header: 'Flag', width: 48 },
      { key: 'clip', header: '\u{1F4CE}', width: 26 },
    ],
    rows: [
      { table: true, detail: false, date: '2018.08.22', test: 'HEMOGLOBIN A1C', value: '8.4 %', flag: 'H', clip: '' },
      { table: true, detail: true, date: '2018.05.14', test: 'HEMOGLOBIN A1C', value: '8.1 %', flag: 'H', clip: '1' },
      { table: false, detail: false, date: '2018.02.06', test: 'HEMOGLOBIN A1C', value: '6.9 %', flag: '', clip: '' },
      { table: false, detail: false, date: '2017.11.19', test: 'BLOOD PRESSURE', value: '148 / 92', flag: 'H', clip: '' },
    ],
  },
  'ADMISSION LIST': {
    title: 'Facility Admissions List',
    columns: [
      { key: 'table', header: 'Table', width: 40, check: true },
      { key: 'detail', header: 'Detail', width: 42, check: true },
      { key: 'date', header: 'Discharge', width: 80 },
      { key: 'facility', header: 'Facility', width: 200 },
      { key: 'description', header: 'Description', width: 220 },
      { key: 'clip', header: '\u{1F4CE}', width: 26 },
    ],
    rows: [
      { table: true, detail: false, date: '2018.04.02', facility: 'UNIVERSITY HOSPITAL', description: 'CHEST PAIN, OBSERVATION', clip: '2' },
      { table: false, detail: false, date: '2016.09.27', facility: 'ACROPOLIS MANOR', description: 'RESPITE STAY', clip: '' },
    ],
  },
  ATTACHMENTS: {
    title: 'Attachment List',
    selectAll: true,
    columns: [
      { key: 'select', header: 'Select', width: 44, check: true },
      { key: 'date', header: 'Date', width: 80 },
      { key: 'author', header: 'Author', width: 160 },
      { key: 'type', header: 'Document Type', width: 160 },
      { key: 'note', header: 'Note', width: 220 },
      { key: 'open', header: '', width: 48, link: true },
    ],
    rows: [
      { select: true, date: '2018.07.30', author: 'DR. DEREK SHEPHERD', type: 'IMAGING REPORT', note: 'Chest x-ray, 2 views', open: 'Open' },
      { select: false, date: '2018.03.11', author: 'ADMINISTRATOR', type: 'CONSENT', note: 'Signed consent to release', open: 'Open' },
    ],
  },
}

/* The right pane of the Selection Window: group header `Advance Selection`,
   grid header `Code | Concept or Code Description`, then four identical
   stacked blocks. `All records` is the selected default, and `If applicable,
   include report.` is checked by default. The glossary is verbatim. */
export const ADVANCE_SELECTION_MODES = [
  { label: 'Relative day range', hint: 'Pulls all records entered from your specified number of days prior to today' },
  { label: 'Specific date range', hint: 'Pulls records between your specified start and end dates' },
  { label: 'Specific number of record(s)', hint: 'Pulls the number of records you enter, starting with the most recent' },
  { label: 'All records', hint: 'Will pull all records listed under the corresponding code/concept' },
]

/** four identical stacked blocks (304687/ba222444b2c6) */
export const ADVANCE_SELECTION_BLOCKS = 4
