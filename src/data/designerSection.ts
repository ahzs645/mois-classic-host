/* ============================================================================
   Administration ▸ Designer Section.

   Ten nodes hang off the folder in the current build; eight of them were
   measured off list captures and are configured here. `Panel Setup` and
   `Quick Entry` are visible in the v02.30.11 tree but no capture of either
   screen exists in the corpus, so they are deliberately absent — the frame's
   labelled fallback is the honest thing to show for them.

   PROVENANCE. Every width, band height and caption below is a PIL pixel scan
   of a named capture (row-band colour runs, `#C8DCFA` header-run boundaries,
   dark-ink bounding boxes), normalised to 1:1 off the navigator tree's
   16px folder-icon pitch. Two captures are 1.25x and are called out where
   they are used: `Task Set List` (f95d86d598d0) and `Task Set Detail`
   (0ffe065f893e).

   ONE SHELL. All eight lists are the same PowerBuilder window — navy view
   header, a 22px command row carrying the *same four buttons in the same
   order*, a 17px filter strip, and a grid. Only the header caption, the
   column set, the filter set, the row pitch and an optional right-anchored
   Import/Export pair move. Two pairs are literally the same grid: Encounter
   Form is byte-identical to Flowsheet, and Care Plan to Task Sets (±1px).

   The divergence is entirely in the detail window, which is a separate
   top-level window opened over the list rather than an in-pane detail pane.
   Its per-node pieces are at the foot of this file.

   The records are synthetic training data. Only the *vocabularies* are
   observed — Concept Mapping's Group values and GRP/SYM types, Letter
   Templates' MISC / CONSULTATION / REFERRAL, the Flowsheet Data Source type
   list, the Encounter Form Data Type list, the rule sentences. Descriptions,
   dates and authors are made up, in the same house style as the rest of the
   emulator's sample data. Spelling mistakes marked `[sic]` are MOIS's own
   and are kept on purpose.
   ========================================================================= */

export type DesignerColumn = {
  key: string
  header: string
  /** measured painted width, normalised to 1:1 */
  width?: number
  align?: 'left' | 'center' | 'right'
  /** a 13px checkbox centred in the column (Concept Mapping's HM Item) */
  check?: boolean
  /** the narrow "…" lookup column PowerBuilder drops between two data columns */
  dots?: boolean
  /**
   * A read-only column, whose caption renders grey rather than black in the
   * Concept Mapping detail. Observed in 62d4040117d3 but the ink was never
   * sampled, so the kit's `--pb-text-dim` stands in for it.
   */
  dim?: boolean
  /** a filter box sits over this column in the filter strip */
  filter?: boolean
}

export type DesignerRow = Record<string, string | boolean | undefined>

/** A right-anchored command-row button. These size to their text, not to 81px. */
export type DesignerSideButton = { label: string; width: number }

export type DesignerNewField =
  | { kind: 'text'; label: string; w?: number; value?: string; focus?: boolean }
  | { kind: 'memo'; label: string; rows?: number }
  | { kind: 'drop'; label: string; options: string[]; value?: string; w?: number }
  | { kind: 'radio'; label: string; options: string[]; value: string }

export type DesignerNewDialog = {
  /** the title bar, verbatim */
  title: string
  /** the `#DCD7D2` group band inside it, verbatim */
  band: string
  fields: DesignerNewField[]
  /** footer buttons, left to right */
  buttons: string[]
  w: number
  h: number
  source: string
}

/** Which Skeleton-D body the node's detail window uses. */
export type DesignerDetailKind =
  | 'concept' | 'encounter-form' | 'flowsheet' | 'measurement'
  | 'paper-form' | 'care-plan' | 'task-set' | 'letter'

export type DesignerListScreen = {
  node: string
  /** the navigator label — which is not always the view header */
  treeLabel: string
  /** the view header as rendered, verbatim */
  header: string
  /**
   * The optional right-anchored block. Present on exactly three of eight;
   * only `Import Paper Forms` has a captured dialog behind it.
   */
  right?: DesignerSideButton[]
  columns: DesignerColumn[]
  /**
   * Detail-band pitch. 18px on the v02.19.04 set, 19px on the three later
   * builds (Concept Mapping, Care Plan, Task Sets).
   */
  pitch: 18 | 19
  /** measured gutter width; the kit paints its gutter at a fixed 13px */
  gutter: 16 | 17
  rows: DesignerRow[]
  detail: DesignerDetailKind
  /** the detail window's title bar, verbatim */
  detailTitle: string
  newDialog?: DesignerNewDialog
  source: string
}

/**
 * The command row. Identical on all eight nodes — same four captions, same
 * order, 81 x 22 each, butted edge-to-edge and flush left at the pane edge.
 */
export const DESIGNER_COMMANDS = ['New Record', 'Delete Record', 'Edit Record', 'Close Window'] as const

/** The three Skeleton-D footer sets, which are the cleanest per-node discriminator. */
export const DETAIL_FOOTERS = {
  /** Encounter Form (25f89bc217fc), Flowsheet (d50bc91a85d7) */
  saveAndClose: ['Save (F2)', 'Save and Close (Alt + S)', 'Cancel (Alt + F4)'],
  /** Concept, Measurement, Paper Form, Care Plan, Task Set */
  saveChanges: ['Save Changes (F2)', 'Cancel'],
  /** Letter Templates alone (fdfcc2d7ed02) */
  closeOnly: ['Save and Close (Alt + S)', 'Cancel (Alt + F4)'],
} as const

/* ---------------------------------------------------------------------------
   The eight lists.
   ------------------------------------------------------------------------ */

const PEOPLE = ['JALIL, AHMAD', 'GRUBB, HELENA', 'BEARDWOOD, WALTER', 'SHEWCHUK, LEAH']

export const designerScreens: DesignerListScreen[] = [
  /* --- 302269 Concept Mapping ----------------------------------------- */
  {
    node: 'ad-concept',
    treeLabel: 'Concept Mapping',
    header: 'Concept Mapping List',
    source: '251267e4f78e (v02.19.04 list), f05574eb03be, art. 302269',
    right: [
      /* these two size to their captions rather than to the 81px grid */
      { label: 'Import Concepts', width: 86 },
      { label: 'Export Concepts', width: 88 },
    ],
    /* four filter boxes: nothing sits over HM Item */
    columns: [
      { key: 'group', header: 'Group', width: 117, filter: true },
      { key: 'concept', header: 'Concept', width: 223, filter: true },
      { key: 'desc', header: 'Description', width: 318, filter: true },
      /* a 13px checkbox centred in a 55px column, pads 24/25 */
      { key: 'hm', header: 'HM Item', width: 55, check: true, align: 'center' },
      /* GRP / SYM, centred, pads 22/23 */
      { key: 'type', header: 'Type', width: 67, align: 'center', filter: true },
    ],
    pitch: 19,
    gutter: 16,
    detail: 'concept',
    detailTitle: 'Concept Mapping Detail',
    rows: [
      { group: 'ADMISSION', concept: 'CHF ADMISSIONS', desc: 'Admissions for congestive heart failure', hm: true, type: 'GRP' },
      { group: 'CONSULT', concept: 'CARDIOLOGY', desc: 'Cardiology consultation requests', hm: false, type: 'GRP' },
      { group: 'FEE CODE', concept: 'CHRONIC CARE', desc: 'Chronic care management fee codes', hm: false, type: 'GRP' },
      { group: 'HEALTH ISSUE', concept: 'CHF', desc: 'Congestive heart failure', hm: true, type: 'GRP' },
      { group: 'HEALTH ISSUE', concept: 'DIABETES', desc: 'Diabetes mellitus, excluding gestational', hm: true, type: 'GRP' },
      { group: 'HEALTH ISSUE', concept: 'DM', desc: 'Diabetes mellitus', hm: false, type: 'SYM' },
      { group: 'MEASURE', concept: 'HBA1C', desc: 'Glycated haemoglobin', hm: true, type: 'GRP' },
      { group: 'MEASURE', concept: 'A1C', desc: 'Glycated haemoglobin', hm: false, type: 'SYM' },
    ],
    newDialog: {
      title: 'New Concept Mapping',
      band: 'New Concept Information',
      w: 430,
      h: 214,
      /* `Create Record` is named by art. 302639; the capture crops the button
         strip, so no Cancel is claimed here — the title bar's close box is
         the only escape the evidence supports. */
      buttons: ['Create Record'],
      source: 'f05574eb03be (fields), art. 302639 (confirm button)',
      fields: [
        { kind: 'radio', label: 'Classification', options: ['Group', 'Synonym'], value: 'Group' },
        { kind: 'drop', label: 'Group:', options: ['', 'ADMISSION', 'CONSULT', 'FEE CODE', 'HEALTH ISSUE', 'MEASURE'], value: '', w: 196 },
        /* the focused edit takes MOIS's #FFC09C fill */
        { kind: 'text', label: 'Concept:', w: 250, focus: true },
        { kind: 'text', label: 'Description:', w: 250 },
      ],
    },
  },

  /* --- 303093 Encounter Form ------------------------------------------- */
  {
    node: 'ad-encounter-form',
    treeLabel: 'Encounter Form',
    header: 'Encounter Documentation Form List',
    source: 'c776abccb363 (list), art. 303093 / 303174',
    columns: [
      { key: 'name', header: 'Name', width: 189, filter: true },
      { key: 'desc', header: 'Description', width: 321, filter: true },
      /* UNDETERMINED: the only dated row in the capture is the highlighted
         one and it measures left +1px, which conflicts with the centred
         `Date Create` on the Letter Template list. Left-aligned here. */
      { key: 'created', header: 'Create Date', width: 96 },
      { key: 'by', header: 'Create By', width: 128 },
    ],
    pitch: 18,
    gutter: 16,
    detail: 'encounter-form',
    detailTitle: 'Encounter Documentation Form Detail',
    /* NO CAPTURE of this node's New Record dialog exists; art. 303174 says
       only "Name your form and give it a description (optional)". Nothing is
       invented, so New Record opens the detail window directly. */
    rows: [
      { name: 'DIABETES REVIEW', desc: 'Annual diabetes flow review', created: '2026.02.11', by: PEOPLE[0] },
      { name: 'CHF ASSESSMENT', desc: 'Heart failure assessment', created: '2026.03.04', by: PEOPLE[1] },
      { name: 'COPD REVIEW', desc: 'Chronic obstructive pulmonary disease review', created: '2026.04.22', by: PEOPLE[0] },
      { name: 'WELL BABY', desc: 'Well baby visit record', created: '2026.05.19', by: PEOPLE[3] },
      { name: 'ASTHMA CONTROL', desc: '', created: '2026.06.30', by: PEOPLE[2] },
    ],
  },

  /* --- 303098 Flowsheet ------------------------------------------------- */
  {
    node: 'ad-flowsheet',
    treeLabel: 'Flowsheet',
    header: 'Flowsheet List',
    source: '6f03714eb56a (list), art. 303098 / 303224',
    right: [
      { label: 'Import Flowsheets', width: 94 },
      { label: 'Export Flowsheets', width: 96 },
    ],
    /* byte-identical to the Encounter Form grid */
    columns: [
      { key: 'name', header: 'Name', width: 189, filter: true },
      { key: 'desc', header: 'Description', width: 321, filter: true },
      { key: 'created', header: 'Create Date', width: 96 },
      { key: 'by', header: 'Create By', width: 128 },
    ],
    pitch: 18,
    gutter: 16,
    detail: 'flowsheet',
    detailTitle: 'Flowsheet Detail',
    /* the date columns are empty in every capture of this list, so they are
       left empty here rather than filled with invented stamps */
    rows: [
      { name: 'DIABETES', desc: 'Diabetes flow sheet', created: '', by: '' },
      { name: 'CHF', desc: 'Congestive heart failure flow sheet', created: '', by: '' },
      { name: 'COPD', desc: 'COPD flow sheet', created: '', by: '' },
      { name: 'HYPERTENSION', desc: 'Blood pressure and weight', created: '', by: '' },
      { name: 'WELL BABY', desc: 'Growth and immunization', created: '', by: '' },
    ],
    newDialog: {
      title: 'New Flowsheet',
      band: 'New Flowsheet Definition',
      w: 418,
      h: 176,
      buttons: ['Create Record', 'Cancel'],
      source: '91a5bf856f19, art. 303224',
      fields: [
        { kind: 'text', label: 'Name:', w: 250, focus: true },
        { kind: 'text', label: 'Description:', w: 250 },
      ],
    },
  },

  /* --- 303100 Measurement Inputs ---------------------------------------- */
  {
    node: 'ad-measure-inputs',
    /* the tree says "Measurement Inputs" on every capture; the article's
       title is singular */
    treeLabel: 'Measurement Inputs',
    header: 'Measurement Input Template List',
    source: '34e7b2cd2b26 (list), art. 303100 / 303228',
    columns: [
      { key: 'name', header: 'Name', width: 214, filter: true },
      { key: 'desc', header: 'Description', width: 426, filter: true },
    ],
    pitch: 18,
    gutter: 16,
    detail: 'measurement',
    detailTitle: 'Measurement Input Template Detail',
    rows: [
      { name: 'VITALS', desc: 'Height, weight, blood pressure, pulse' },
      { name: 'DIABETES PANEL', desc: 'HbA1c, LDL, ACR, eGFR' },
      { name: 'ANTENATAL', desc: 'Fundal height, fetal heart rate, weight' },
      { name: 'WELL BABY', desc: 'Length, weight, head circumference' },
    ],
    newDialog: {
      title: 'New Measurement Input Template',
      band: 'Enter Values',
      w: 418,
      h: 176,
      buttons: ['Create Record', 'Cancel'],
      source: 'c047181758b5, art. 303228',
      fields: [
        { kind: 'text', label: 'Name:', w: 250, focus: true },
        { kind: 'text', label: 'Description:', w: 250 },
      ],
    },
  },

  /* --- 303112 Paper (PDF) Forms ----------------------------------------- */
  {
    node: 'ad-paper-forms',
    treeLabel: 'Paper (PDF) Forms',
    header: 'Paper Form List',
    source: 'a400ca29287c (list), art. 303112 / 303237 / 303327',
    right: [
      { label: 'Import Forms', width: 80 },
      { label: 'Export Forms', width: 81 },
    ],
    /* five filter boxes — one per column */
    columns: [
      { key: 'name', header: 'Name', width: 244, filter: true },
      { key: 'code', header: 'Code', width: 108, filter: true },
      { key: 'desc', header: 'Description', width: 239, filter: true },
      { key: 'author', header: 'Form Author', width: 99, filter: true },
      { key: 'group', header: 'Form Group', width: 95, filter: true },
    ],
    pitch: 18,
    gutter: 16,
    detail: 'paper-form',
    detailTitle: 'Paper Form Detail',
    /* NO CAPTURE of this node's New Record dialog; art. 303112 says only
       that you are "prompted to locate a fillable PDF document and at the
       very least also give the form a name". No field list, so none built. */
    rows: [
      { name: 'CONSULT_REQUEST', code: 'CONSULT', desc: 'Specialist consultation request', author: 'MOIS', group: 'REFERRAL' },
      { name: 'LAB_REQUISITION', code: 'LABREQ', desc: 'Outpatient laboratory requisition', author: 'MOIS', group: 'LAB' },
      { name: 'IMAGING_REQ', code: 'IMGREQ', desc: 'Diagnostic imaging requisition', author: 'MOIS', group: 'IMAGING' },
      { name: 'DRIVERS_MEDICAL', code: 'DL_MED', desc: "Driver's medical examination report", author: 'CLINIC', group: 'FORMS' },
      { name: 'SICK_NOTE', code: 'SICKNOTE', desc: 'Absence from work certificate', author: 'CLINIC', group: 'FORMS' },
    ],
  },

  /* --- 303115 Care Plan Templates --------------------------------------- */
  {
    node: 'ad-careplan-templates',
    treeLabel: 'Care Plan Templates',
    /* the tree and the article both say "Care Plan Templates"; the view
       header does not */
    header: 'Care Plan Tag Template List',
    source: 'f158827a261d (v02.22.92 list), art. 303115',
    columns: [
      { key: 'desc', header: 'Description', width: 299, filter: true },
      { key: 'detail', header: 'Detail', width: 457, filter: true },
    ],
    pitch: 19,
    gutter: 16,
    detail: 'care-plan',
    detailTitle: 'Care Plan Tag Template Detail',
    /* NO CAPTURE of this node's New Record dialog. */
    rows: [
      { desc: 'DIABETES CARE PLAN', detail: 'Standard diabetes care plan summary' },
      { desc: 'CHF CARE PLAN', detail: 'Heart failure monitoring and review' },
      { desc: 'COPD CARE PLAN', detail: 'Chronic obstructive pulmonary disease' },
      { desc: 'FRAILTY CARE PLAN', detail: 'Complex care for frail elderly patients' },
    ],
  },

  /* --- 1802764 Task Set Templates --------------------------------------- */
  {
    node: 'ad-task-sets',
    /* renamed across builds: "Task Sets" on v02.21.12, "Task Set Templates"
       on v02.22.92 and v02.30.11, which is what the tree carries */
    treeLabel: 'Task Set Templates',
    header: 'Task Set List',
    source: 'f95d86d598d0 (1.25x, normalised), art. 1802764',
    /* the same grid as Care Plan to within a pixel */
    columns: [
      { key: 'desc', header: 'Description', width: 298, filter: true },
      { key: 'detail', header: 'Detail', width: 457, filter: true },
    ],
    pitch: 19,
    gutter: 16,
    detail: 'task-set',
    detailTitle: 'Task Set Detail',
    rows: [
      { desc: 'NEW PATIENT INTAKE', detail: 'Tasks raised when a new chart is opened' },
      { desc: 'DIABETES ANNUAL REVIEW', detail: 'Recall, labs, foot check, eye referral' },
      { desc: 'POST-DISCHARGE FOLLOW UP', detail: 'Seven-day follow up after facility discharge' },
      { desc: 'PRENATAL SCHEDULE', detail: 'Visit and screening schedule by trimester' },
    ],
    newDialog: {
      title: 'New Task Set',
      band: 'New Information',
      w: 430,
      h: 214,
      buttons: ['Create Record', 'Cancel'],
      source: '18819d5fd987, art. 1802764',
      fields: [
        { kind: 'text', label: 'Description:', w: 268, focus: true },
        { kind: 'memo', label: 'Detail:', rows: 3 },
      ],
    },
  },

  /* --- 303101 Letter Templates ------------------------------------------ */
  {
    node: 'ad-letters',
    treeLabel: 'Letter Templates',
    header: 'Letter Template List',
    source: 'dd92ae1e643e (v02.30.11 list), art. 303101',
    /* three filter boxes: nothing over Date Create or Created By */
    columns: [
      { key: 'name', header: 'Name', width: 205, filter: true },
      { key: 'type', header: 'Type', width: 124, filter: true },
      { key: 'desc', header: 'Description', width: 276, filter: true },
      /* the caption really does read "Date Create"; values centred, pads 10/11 */
      { key: 'created', header: 'Date Create', width: 74, align: 'center' },
      { key: 'by', header: 'Created By', width: 110 },
    ],
    pitch: 18,
    gutter: 17,
    detail: 'letter',
    detailTitle: 'Letter Template Detail',
    rows: [
      { name: 'NI Specialized Services Virtual Psychiatry Clinic Referral', type: 'REFERRAL', desc: 'Virtual psychiatry clinic referral', created: '2026.01.22', by: PEOPLE[0] },
      { name: 'CARDIOLOGY CONSULT', type: 'CONSULTATION', desc: 'Cardiology consultation request', created: '2025.11.08', by: PEOPLE[1] },
      { name: 'PATIENT RECALL', type: 'MISC', desc: 'Recall letter for overdue reviews', created: '2025.09.16', by: PEOPLE[0] },
      { name: 'IMMUNIZATION REMINDER', type: 'MISC', desc: 'Childhood immunization reminder', created: '2025.06.03', by: PEOPLE[3] },
      { name: 'ORTHOPAEDIC REFERRAL', type: 'REFERRAL', desc: '', created: '2026.04.14', by: PEOPLE[2] },
    ],
    newDialog: {
      title: 'New Letter Template',
      band: 'New Record',
      w: 430,
      h: 214,
      buttons: ['Create Record', 'Cancel'],
      source: 'dd92ae1e643e, art. 303101',
      fields: [
        { kind: 'text', label: 'Name:', w: 268, focus: true },
        { kind: 'drop', label: 'Type:', options: ['MISC', 'CONSULTATION', 'REFERRAL'], value: 'MISC', w: 150 },
        { kind: 'memo', label: 'Description:', rows: 3 },
      ],
    },
  },
]

export const designerScreen = (node: string): DesignerListScreen | undefined =>
  designerScreens.find((s) => s.node === node)

/** Node ids this view owns, for the frame's route table. */
export const designerNodes = designerScreens.map((s) => s.node)

/* ===========================================================================
   Skeleton D — the detail windows.

   Seven of the eight are the same window class with a swapped body; Letter
   Template Detail is a different window and is described last.
   ======================================================================== */

/* --- 302269 Concept Mapping Detail (62d4040117d3, 30a3bdf6f957) ---------- */

export const CONCEPT_HM_CAPTION =
  '(system defined and used when performing Health Maintenance checks)'

/** Shown in the form area only while the Health Maintenance box is ticked. */
export const CONCEPT_HM_WARNING = [
  'The information related to a Health Maintenance Concept should be changed with',
  'caution - adding or deleting rules will result in inaccurate / misleading Health',
  'Maintenance Checks / Scorecards.',
]

export const CONCEPT_CODE_RULE_COLUMNS: DesignerColumn[] = [
  { key: 'system', header: 'Code System', width: 197, dim: true },
  { key: 'code', header: 'Code', width: 104 },
  { key: 'dots', header: '', dots: true, width: 17 },
  { key: 'term', header: 'Code Term', width: 383 },
]

export const CONCEPT_CODE_RULE_ROWS: DesignerRow[] = [
  { system: 'ICD9', code: '428', term: 'HEART FAILURE' },
  { system: 'ICD9', code: '428.0', term: 'CONGESTIVE HEART FAILURE, UNSPECIFIED' },
  { system: 'ICD9', code: '428.20', term: 'SYSTOLIC HEART FAILURE, UNSPECIFIED' },
]

export const CONCEPT_TEXT_RULE_COLUMNS: DesignerColumn[] = [
  /* the capture really does show `Include String` twice */
  { key: 'inc1', header: 'Include String', width: 197 },
  { key: 'inc2', header: 'Include String', width: 197 },
  { key: 'exc', header: 'Exclude String', width: 241 },
  /* read-only computed sentence */
  { key: 'rule', header: 'Rule', width: 293, dim: true },
]

export const CONCEPT_TEXT_RULE_ROWS: DesignerRow[] = [
  { inc1: 'CHF', inc2: '', exc: '', rule: 'Has CHF' },
  /* MOIS's own spelling of "exclude" [sic] */
  { inc1: 'DIABETES', inc2: '', exc: 'GESTA', rule: 'Has DIABETES but exlude if it has GESTA' },
  { inc1: 'DM', inc2: '', exc: '', rule: 'Has DM' },
]

/**
 * Two other versions of this window exist in the corpus and are reported
 * rather than merged: `b57beca43b29` (art. 303366, older grey theme) draws
 * ONE grid, banded `Concept Rule List`, with columns
 * `Code Type · Code · … · Include String · Include String · Exclude String · Note`;
 * `f05574eb03be` draws two grids but reads `Code Type · Code · … · Note` for
 * the coded one. The pair built here is the newest measured (62d4040117d3).
 */
export const CONCEPT_DETAIL_VARIANTS = [
  'b57beca43b29 (303366): one grid, band `Concept Rule List`, Code Type · Code · … · Include String · Include String · Exclude String · Note',
  'f05574eb03be (302269): two grids, coded grid reads Code Type · Code · … · Note',
] as const

/* --- 303093 Encounter Documentation Form Detail -------------------------- */

export const ENCOUNTER_FORM_TABS = ['Groups', 'Elements', 'Reference List', 'Form Layout', 'Version']

export const ENCOUNTER_GROUP_COLUMNS: DesignerColumn[] = [
  { key: 'order', header: 'Order', width: 60, align: 'center' },
  { key: 'heading', header: 'Heading', width: 354 },
  { key: 'note', header: 'Note', width: 532 },
]

export const ENCOUNTER_GROUP_ROWS: DesignerRow[] = [
  { order: '10', heading: 'History', note: 'Presenting history and review' },
  { order: '20', heading: 'Measurements', note: 'Values written back to the Measures tab' },
  { order: '30', heading: 'Examination', note: '' },
  { order: '40', heading: 'Plan', note: 'Follow-up interval and referrals' },
]

export const ENCOUNTER_ELEMENT_COLUMNS: DesignerColumn[] = [
  { key: 'element', header: 'Element', width: 314 },
]

export const ENCOUNTER_ELEMENT_ROWS: DesignerRow[] = [
  { element: 'Smoking status' },
  { element: 'Height' },
  { element: 'Weight' },
  { element: 'Blood pressure' },
  { element: 'Foot check completed' },
  { element: 'Follow up interval' },
]

export const ENCOUNTER_REFERENCE_COLUMNS: DesignerColumn[] = [
  { key: 'order', header: 'Order', width: 40, align: 'center' },
  { key: 'reference', header: 'Reference', width: 278 },
  { key: 'highlight', header: 'Highlight', width: 57, check: true, align: 'center' },
  { key: 'type', header: 'Type', width: 104 },
  { key: 'link', header: 'Link', width: 439 },
  { key: 'dots', header: '', dots: true, width: 18 },
]

export const ENCOUNTER_REFERENCE_ROWS: DesignerRow[] = [
  { order: '1', reference: 'Diabetes Canada guidelines', highlight: true, type: 'Web Page', link: 'https://guidelines.diabetes.ca/', dots: '' },
  { order: '2', reference: 'Clinic foot-check protocol', highlight: false, type: 'File', link: 'C:\\AIHS\\data\\Resource\\footcheck.pdf', dots: '' },
]

/** The two-line note the Reference List tab prints above its button row. */
export const ENCOUNTER_REFERENCE_NOTE = [
  'NOTE: To ensure all users have access to the files, on save, each file will be moved to the MOIS RESOURCE FOLDER:',
  'C:\\AIHS\\data\\Resource\\',
]

export const ENCOUNTER_VERSION_COLUMNS: DesignerColumn[] = [
  { key: 'version', header: 'Version', width: 60, align: 'center' },
  { key: 'by', header: 'Change By', width: 169 },
  { key: 'date', header: 'Date', width: 78, align: 'center' },
  { key: 'reason', header: 'Reason', width: 467 },
]

export const ENCOUNTER_VERSION_ROWS: DesignerRow[] = [
  { version: '1', by: PEOPLE[0], date: '2026.02.11', reason: 'Initial version' },
  { version: '2', by: PEOPLE[1], date: '2026.03.19', reason: 'Added foot check element' },
  { version: '3', by: PEOPLE[0], date: '2026.06.02', reason: 'Reordered the Plan group' },
]

/** Answer Settings ▸ Data Type, per art. 303093. */
export const ENCOUNTER_DATA_TYPES = [
  'Free Text', 'Number', 'Date', 'Selection List', 'Radio Button', 'Check Box',
]

/* --- 303098 Flowsheet Detail --------------------------------------------- */

export const FLOWSHEET_ELEMENT_COLUMNS: DesignerColumn[] = [
  { key: 'order', header: 'Order', width: 41, align: 'center' },
  { key: 'label', header: 'Label', width: 268 },
]

export const FLOWSHEET_ELEMENT_ROWS: DesignerRow[] = [
  { order: '0', label: 'Height' },
  { order: '1', label: 'Weight' },
  { order: '2', label: 'Blood Pressure' },
  { order: '3', label: 'HbA1c' },
  { order: '4', label: 'Foot Check' },
]

/** Data Source ▸ Type, text-only list from art. 303098. */
export const FLOWSHEET_SOURCE_TYPES = [
  'Chart Element', 'Consultation', 'Facility Admission', 'Image', 'Intervention',
  'Measure', 'Procedure', 'Fee Code', 'Long Term Medications',
  'Observation (Health Issues)', 'Encounter Form (Legacy)', 'Asthma', 'Diabetes',
  'COPD', 'CHF', 'Hep C', 'Hypertension', 'Encounter Form',
  'List of custom user forms',
]

/** Second drop-down on the Data Source block. Only `Measure` is attested (art. 303224). */
export const FLOWSHEET_SOURCES = ['Measure']

/* --- 303100 Measurement Input Template Detail ---------------------------- */

export const MEASUREMENT_ELEMENT_COLUMNS: DesignerColumn[] = [
  { key: 'order', header: 'Order', width: 56, align: 'center' },
  { key: 'code', header: 'Code', width: 69, align: 'center' },
  { key: 'dots', header: '', dots: true, width: 16 },
  { key: 'test', header: 'Test Name', width: 485 },
]

export const MEASUREMENT_ELEMENT_ROWS: DesignerRow[] = [
  { order: '1', code: '3137', dots: '', test: 'HEIGHT' },
  { order: '2', code: '3141', dots: '', test: 'WEIGHT' },
  { order: '3', code: '1950', dots: '', test: 'BLOOD PRESSURE' },
  { order: '4', code: '128', dots: '', test: 'HEMOGLOBIN A1C' },
]

/* --- 303112 Paper Form Detail -------------------------------------------- */

export const PAPER_FIELD_COLUMNS: DesignerColumn[] = [
  { key: 'index', header: 'Index', width: 28, align: 'center' },
  { key: 'title', header: 'Title', width: 137 },
  { key: 'desc', header: 'Description', width: 261 },
  { key: 'type', header: 'Type', width: 85 },
  { key: 'populator', header: 'Populator', width: 109 },
  { key: 'property', header: 'Property', width: 119 },
  { key: 'valueType', header: 'Value Type', width: 104 },
  { key: 'dots', header: '', dots: true, width: 17 },
  { key: 'default', header: 'Default Value', width: 97 },
]

export const PAPER_FIELD_ROWS: DesignerRow[] = [
  { index: '1', title: 'Surname', desc: 'Patient surname', type: 'Text', populator: 'Patient Chart', property: 'Last Name', valueType: 'Text', dots: '', default: '' },
  { index: '2', title: 'GivenName', desc: 'Patient given name', type: 'Text', populator: 'Patient Chart', property: 'First Name', valueType: 'Text', dots: '', default: '' },
  { index: '3', title: 'DOB', desc: 'Date of birth', type: 'Text', populator: 'Patient Chart', property: 'Date of Birth', valueType: 'Date', dots: '', default: '' },
  { index: '4', title: 'PHN', desc: 'Personal health number', type: 'Text', populator: 'Patient Chart', property: 'PHN', valueType: 'Text', dots: '', default: '' },
  { index: '5', title: 'ClinicName', desc: 'Clinic letterhead name', type: 'Text', populator: '', property: '', valueType: '', dots: '', default: 'MOIS TRAINING CLINIC' },
  { index: '6', title: 'ProviderSig', desc: 'Signature block', type: 'Signature', populator: 'Desktop Provider', property: 'Full Name', valueType: 'Text', dots: '', default: '' },
]

/**
 * `Import Paper Forms` (art. 303237, capture d837934e2d27, 867x561).
 * Column NAMES and ORDER are certain; the widths are approximate to +/-4px
 * because the header band is only 11px of clean pixels and its captions split
 * the `#C8DCFA` runs.
 */
export const PAPER_IMPORT_COLUMNS: DesignerColumn[] = [
  { key: 'duplicate', header: 'Duplicate', width: 30, align: 'center' },
  { key: 'select', header: 'Select', width: 35, check: true, align: 'center' },
  { key: 'original', header: 'Original Name', width: 245 },
  { key: 'code', header: 'Code', width: 94 },
  { key: 'desc', header: 'Description', width: 198 },
  { key: 'author', header: 'Form Author', width: 87 },
  { key: 'group', header: 'Form Group', width: 83 },
]

/** `Duplicate` renders the literal `Y` or `N` (3f8e7753deb7). */
export const PAPER_IMPORT_ROWS: DesignerRow[] = [
  { duplicate: 'Y', select: false, original: 'CONSULT_REQUEST', code: 'CONSULT', desc: 'Specialist consultation request', author: 'MOIS', group: 'REFERRAL' },
  { duplicate: 'N', select: true, original: 'MENTAL_HEALTH_REFERRAL', code: 'MHREF', desc: 'Mental health services referral', author: 'MOIS', group: 'REFERRAL' },
  { duplicate: 'N', select: true, original: 'HOME_CARE_REQUEST', code: 'HOMECARE', desc: 'Home and community care request', author: 'MOIS', group: 'REFERRAL' },
  { duplicate: 'Y', select: false, original: 'LAB_REQUISITION', code: 'LABREQ', desc: 'Outpatient laboratory requisition', author: 'MOIS', group: 'LAB' },
]

/* --- 303115 Care Plan Tag Template Detail -------------------------------- */

export const CARE_PLAN_COLUMNS: DesignerColumn[] = [
  { key: 'category', header: 'Item Category', width: 106 },
  { key: 'section', header: 'Care Plan Section', width: 120 },
  { key: 'rank', header: 'Rank', width: 47, align: 'center' },
  /* a radio pair `Code` / `Concept` in every row */
  { key: 'identifiedBy', header: 'Identified By', width: 137, align: 'center' },
  { key: 'identification', header: 'Identification', width: 278 },
  { key: 'dots', header: '', dots: true, width: 21 },
  { key: 'rule', header: 'Rule', width: 93 },
  { key: 'records', header: 'No. of Records', width: 86, align: 'center' },
]

export const CARE_PLAN_ROWS: DesignerRow[] = [
  { category: 'HEALTH ISSUE', section: 'Problems', rank: '1', identifiedBy: 'Concept', identification: 'DIABETES', dots: '', rule: 'Latest', records: '1' },
  { category: 'MEASURE', section: 'Monitoring', rank: '2', identifiedBy: 'Code', identification: '128 HEMOGLOBIN A1C', dots: '', rule: 'Latest', records: '3' },
  { category: 'MEASURE', section: 'Monitoring', rank: '3', identifiedBy: 'Code', identification: '1950 BLOOD PRESSURE', dots: '', rule: 'Latest', records: '3' },
  { category: 'INTERVENTION', section: 'Actions', rank: '4', identifiedBy: 'Concept', identification: 'FOOT CHECK', dots: '', rule: 'All', records: '5' },
]

/* --- 1802764 Task Set Detail ---------------------------------------------
   The grid here is NOT columnar: it is a free-form multi-line DataWindow.
   Only the band (20px) and the button widths divide cleanly from the 1.25x
   capture; the sub-control widths carry rounding error and are not claimed.
   ----------------------------------------------------------------------- */

export const TASK_PRIORITIES = ['Low', 'Medium', 'High', 'V. High']

/** Due After's unit drop-down. `Days` is captured; art. 1802764 names the set. */
export const TASK_DUE_UNITS = ['Days', 'Weeks', 'Months']

export type TaskSetRow = {
  priority: string
  task: string
  group: string
  dueAfter: string
  dueUnit: string
  detail: string
}

export const TASK_SET_ROWS: TaskSetRow[] = [
  { priority: 'High', task: 'Book annual review appointment', group: 'RECALL', dueAfter: '7', dueUnit: 'Days', detail: 'Phone the patient to arrange the annual diabetes review.' },
  { priority: 'Medium', task: 'Order HbA1c and lipid panel', group: 'LAB', dueAfter: '14', dueUnit: 'Days', detail: 'Standing requisition; results to the ordering provider.' },
  { priority: 'Low', task: 'Send retinal screening referral', group: 'REFERRAL', dueAfter: '30', dueUnit: 'Days', detail: '' },
]

/* --- 303101 Letter Template Detail ---------------------------------------
   This one breaks the skeleton entirely: no navy band, no grid, no band and
   button strip. Two side-by-side group boxes and a two-button footer.
   ----------------------------------------------------------------------- */

/** `Edit` opens the `New Letter` dialog (01d1c6ccb84c). */
export const NEW_LETTER_OPTIONS = [
  'Create a new blank letter',
  'Create a new letter from a MOIS template',
  'Create a new letter from an existing file',
]
