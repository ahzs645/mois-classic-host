/* ============================================================================
   Administration ▸ Clinic Management (and the two list screens that sit
   beside it: Address Book ▸ Contact List and External Service Providers ▸
   Providers / Organizations).

   PROVENANCE. Every header, command row, filter strip and column table below
   is transcribed from a specific help-site capture, cited per node in
   `source`. The measurements are PIL pixel measurements off those captures,
   and the scale is recorded with them: the classic (B1/B2/B3) captures are
   1:1, the two B4b ones (`303119` Master Provider List, `303121` Organization
   List) are 125% and their spans were divided by 1.25 before being written
   here.

   ONE SHELL, FOUR COMMAND-ROW DIALECTS. Eleven of these twelve screens are
   the same window: navy view header, a command row of 81px buttons, a filter
   strip whose boxes line up with the grid columns beneath them, and a
   DataWindow. What separates them is which four-to-six buttons the command
   row carries — see `CLINIC_COMMANDS` — and whether the grid is edited in
   place or opened into a modal. Immunization Inventory is the one outlier and
   carries its own row.

   THE #FFC09C WASH. A DataWindow paints its current row #E89C84; an
   *editable* one paints the current *cell* inside that row #FFC09C. Sampling
   the selected row across the captures: Service Location, Clinic Favourite
   Meds, Immunization Inventory and Global Reminders each show a #FFC09C run
   exactly one column wide, while Facility List, Resource List, Service Center
   List, Computer List and both Provider Lists show a uniform #E89C84 row. It
   is focus-dependent, not dialect-dependent — Organization List is an inline
   dialect and shows no wash, because in its capture focus sits in the detail
   pane. `focusColumn` therefore records where the capture's focus was, and is
   absent where there was none.

   SHIPPED TYPOS. `Practioner Type` (Provider List) and `Practition No.`
   (Master Provider List) are the application's own spellings and are kept on
   purpose. Two more — `Identication` (Computer Detail) and `Auxilary` (New
   Contact List) — belong to editor windows this file does not describe.

   The records are synthetic training data.
   ========================================================================= */

export type ClinicRow = Record<string, string | boolean | undefined>

export type ClinicColumn = {
  key: string
  /** the caption as shipped; a `\n` is the line break MOIS draws itself */
  header: string
  /** measured inclusive span between column separators, px at 1:1 */
  width?: number
  align?: 'left' | 'center' | 'right'
  /** caption alignment where it differs from the cells' */
  headAlign?: 'left' | 'center' | 'right'
  /** drawn as a tick box rather than as text */
  check?: boolean
  /** the narrow "..." lookup column PB parks beside an editable cell */
  dots?: boolean
  /** read-only ink (#606060) inside an otherwise editable grid */
  dim?: boolean
}

/* --- the command-row dialects -------------------------------------------- */

export type ClinicDialect =
  /** read-only grid; double-click opens a modal editor */
  | 'edit-record'
  /** the same, plus the only Find / Replace button in the module */
  | 'edit-record-find'
  /** inline-editable grid, saved from the command row */
  | 'inline-save'
  /** inline-editable master grid over a detail pane */
  | 'master-detail-save'
  /** Immunization Inventory's one-off row */
  | 'immunization'

/** `null` is a gap rather than a button. */
export const CLINIC_COMMANDS: Record<ClinicDialect, (string | null)[]> = {
  'edit-record': ['New Record', 'Delete Record', 'Edit Record', 'Close Window'],
  'edit-record-find': ['New Record', 'Delete Record', 'Edit Record', 'Find / Replace', 'Close Window'],
  'inline-save': ['New Record', 'Delete Record', 'Save', 'Undo', 'Refresh'],
  'master-detail-save': ['New Record', 'Delete Record', 'Save', 'Close Window'],
  /* `303075` / `524838a3657e`: the run ends at x 1008 in a 1013-wide pane,
     and the 42px between Import Shipment and Import Immunization List is the
     command row's own #DCD7D2 showing through — sampled, not a disabled
     button. */
  immunization: [
    'New Record', 'Delete Record', 'Save', 'Undo', 'Refresh', 'Import Shipment',
    null,
    'Import Immunization List', 'Export Immunization List',
  ],
}

/**
 * Every button in this module is 81px except these four. (The kit already
 * draws the default at the 80.5px it measured across nine Patient Summary
 * buttons, which is the same measurement to within a pixel, so only the wide
 * ones are named here.)
 */
export const CLINIC_COMMAND_WIDTH: Record<string, number> = {
  'Find / Replace': 105,
  'Import Shipment': 105,
  'Import Immunization List': 129,
  'Export Immunization List': 128,
}

/* --- the filter strip ----------------------------------------------------- */

export type ClinicFilter =
  /** one white box per filterable column, aligned to that column's bounds */
  | { kind: 'columns'; boxes: { col: number; w?: number }[] }
  /** Contact List's different shape: a `Filter:` label and one wide box */
  | { kind: 'labelled'; label: string; w?: number }
  /** the band is there but empty — a plain full-width white expanse */
  | { kind: 'blank' }

/* --- detail panes --------------------------------------------------------- */

export type ClinicField =
  | { kind: 'text'; label?: string; w?: number; value?: string; readOnly?: boolean; hint?: string }
  | { kind: 'memo'; label?: string; rows?: number; value?: string; readOnly?: boolean }
  | { kind: 'lookup'; label?: string; w?: number; value?: string }
  | { kind: 'drop'; label?: string; options: string[]; value?: string; w?: number }
  | { kind: 'check'; label: string; checked?: boolean }
  /** a label followed by several tick boxes on one line */
  | { kind: 'checks'; label: string; items: { label: string; checked?: boolean }[] }
  /** a grey read-only line of text, not a field */
  | { kind: 'static'; text: string }
  /** the monospaced dose tree Clinic Favourite Meds draws in a group box */
  | { kind: 'tree'; caption: string; lines: string[] }
  /** several controls sharing one line */
  | { kind: 'pair'; label?: string; fields: ClinicField[] }

export type ClinicPage =
  | { kind: 'form'; left: ClinicField[]; right?: ClinicField[]; footer?: string }
  | {
    kind: 'grid'
    caption?: string
    buttons?: string[]
    /** names this pane's buttons for tutorials: `host.mois.command.<scope>-new` */
    scope?: string
    columns: ClinicColumn[]
    rows: ClinicRow[]
    legend?: { label: string; keys: string[] }
  }
  /** the tab exists in the capture but its page was never captured */
  | { kind: 'uncaptured' }

export type ClinicDetail = {
  /** measured height of the pane under the splitter, where a capture gives one */
  height?: number
  /** tab-strip height, measured; absent for an untabbed detail form */
  stripH?: number
  tabs?: string[]
  pages: Record<string, ClinicPage>
}

/* --- a screen ------------------------------------------------------------- */

export type ClinicListSpec = {
  node: string
  /** the tree label, for reference */
  label: string
  /** the view header, which for four of these is NOT the tree label */
  header: string
  dialect: ClinicDialect
  /** inline-save only: whether the row ends with Close Window */
  closeWindow?: boolean
  filter?: ClinicFilter
  columns: ClinicColumn[]
  rows: ClinicRow[]
  /** the grid is edited in place (the inline dialects) */
  editable?: boolean
  /** column the capture shows focused — where the #FFC09C wash sits */
  focusColumn?: number
  /** grouped grid: the bands, in painting order */
  groups?: string[]
  /** which field of a row names its band */
  groupKey?: string
  /** band fill, where it is not the kit's default */
  groupFill?: string
  /** the grid draws no header band, no gutter and no column rules */
  bare?: boolean
  detail?: ClinicDetail
  /** `host.mois.row.<anchorPrefix>-<slug of row[anchorKey]>` */
  anchorPrefix: string
  anchorKey: string
  /**
   * Ring a cell rather than the row. The Computer List's seven columns
   * measure 805px against an 803px work area — the row is wider than the
   * viewport, so a tutorial must ring one cell of it.
   */
  anchorCell?: string
  source: string
}

/* ===========================================================================
   C.1  Provider List
   ======================================================================== */
const PROVIDER_LIST: ClinicListSpec = {
  node: 'ad-provider-list',
  label: 'Provider List',
  header: 'Provider List',
  dialect: 'edit-record',
  source: '303054 / 8a64ac22c105 (894x457 crop, 1:1); tree context 303184 / 8233475bccba',
  filter: { kind: 'columns', boxes: [{ col: 0, w: 131 }, { col: 1, w: 101 }, { col: 2, w: 101 }, { col: 3, w: 101 }] },
  /* The B4b build (`303184` / `8233475bccba`) adds an eighth column,
     `Associated User`, and swaps the blue header band for a two-line 34px one
     with left-aligned grey #808080 captions and no vertical separators. The
     classic seven-column header is what is rendered here, because it is the
     build every other screen in this file was measured on. */
  columns: [
    { key: 'name', header: 'Name', width: 133, headAlign: 'center' },
    { key: 'pract', header: 'Pract. No', width: 103, headAlign: 'center' },
    { key: 'payee', header: 'Payee No.', width: 103, headAlign: 'center' },
    { key: 'payment', header: 'Payment Type', width: 103, headAlign: 'center' },
    /* shipped typo: the caption reads "Practioner Type" */
    { key: 'ptype', header: 'Practioner Type', width: 92, align: 'center' },
    { key: 'active', header: 'Active', width: 56, align: 'center' },
    /* the crop is clipped mid-column, so 94 is a lower bound, not a measurement */
    { key: 'serviceEnd', header: 'Service End', width: 94, headAlign: 'center' },
  ],
  /* Payment Type carries the codes both captures print — MSP, AP (alternate
     payment), PP (patient pay) — and Pract. No / Payee No. are the plain
     numbers the captures show (`963852`, `00003`), not prefixed ones.
     `UHNBC ER` is 2090817's own example of an outside clinic kept as a
     "Provider" for tracking encounters, the record the Provider Type
     Conversion Utility exists for. */
  rows: [
    { name: 'BEARDWOOD, WALTER', pract: '40881', payee: '40881', payment: 'MSP', ptype: 'MD', active: 'Y', serviceEnd: '' },
    { name: 'SHEWCHUK, LEAH', pract: '33120', payee: '33120', payment: 'MSP', ptype: 'MD', active: 'Y', serviceEnd: '' },
    { name: 'OKUDA, TIKA', pract: '21044', payee: '21044', payment: 'AP', ptype: 'MD', active: 'Y', serviceEnd: '' },
    { name: 'GRUBB, HELENA (LPN)', pract: '', payee: '', payment: '', ptype: 'LPN', active: 'Y', serviceEnd: '' },
    { name: 'DHALIWAL, RUPINDER (RN)', pract: '', payee: '', payment: '', ptype: 'RN', active: 'Y', serviceEnd: '' },
    { name: 'ROSS, ADRIENNE (NHVC)', pract: '', payee: '', payment: '', ptype: 'RN', active: 'Y', serviceEnd: '' },
    { name: 'UHNBC ER', pract: '', payee: '', payment: '', ptype: '', active: 'Y', serviceEnd: '' },
    { name: 'HALLIWELL, ALYSSA', pract: '00003', payee: '54321', payment: 'PP', ptype: 'MD', active: 'N', serviceEnd: '2025.06.30' },
  ],
  anchorPrefix: 'provider',
  anchorKey: 'name',
}

/* ===========================================================================
   C.2  Resource List
   ======================================================================== */
const RESOURCE_LIST: ClinicListSpec = {
  node: 'ad-resource-list',
  label: 'Resource List',
  header: 'Resource List',
  dialect: 'edit-record',
  source: '303056 / 495633085c74 (1022x747, 1:1, v02.19.04 b151217)',
  filter: {
    kind: 'columns',
    boxes: [{ col: 0, w: 98 }, { col: 1, w: 336 }, { col: 2, w: 126 }, { col: 3, w: 126 }, { col: 4, w: 55 }],
  },
  columns: [
    { key: 'code', header: 'Code', width: 100 },
    { key: 'desc', header: 'Description', width: 338 },
    { key: 'facility', header: 'Facility Code', width: 128 },
    { key: 'location', header: 'Location Code', width: 128 },
    /* the capture prints a letter, not a tick box */
    { key: 'active', header: 'Active', width: 55, align: 'center' },
  ],
  rows: [
    { code: 'EXAM1', desc: 'Exam Room 1', facility: 'HMC', location: 'HMC-MAIN', active: 'Y' },
    { code: 'EXAM2', desc: 'Exam Room 2', facility: 'HMC', location: 'HMC-MAIN', active: 'Y' },
    { code: 'EXAM3', desc: 'Exam Room 3 - procedures', facility: 'HMC', location: 'HMC-MAIN', active: 'Y' },
    { code: 'ECG', desc: 'ECG machine (portable)', facility: 'HMC', location: 'HMC-MAIN', active: 'Y' },
    { code: 'SPIRO', desc: 'Spirometer', facility: 'HMC', location: 'HMC-MAIN', active: 'Y' },
    { code: 'TREATRM', desc: 'Treatment room', facility: 'HMC', location: 'HMC-ANNEX', active: 'N' },
  ],
  anchorPrefix: 'resource',
  anchorKey: 'code',
}

/* ===========================================================================
   C.3  Facility List
   ======================================================================== */
const FACILITY_LIST: ClinicListSpec = {
  node: 'ad-facility-list',
  label: 'Facility List',
  header: 'Facility List',
  dialect: 'edit-record',
  source: '303057 / 633d5b21e8fb (1020x747, 1:1)',
  /* only Code and Description are filterable; Active and Default have no box */
  filter: { kind: 'columns', boxes: [{ col: 0, w: 108 }, { col: 1, w: 343 }] },
  columns: [
    { key: 'code', header: 'Code', width: 110 },
    { key: 'desc', header: 'Description', width: 345 },
    { key: 'active', header: 'Active', width: 85, align: 'center', check: true },
    { key: 'default', header: 'Default', width: 82, align: 'center', check: true },
  ],
  rows: [
    { code: 'HMC', desc: 'Halliwell Medical Clinic', active: true, default: true },
    { code: 'ANNEX', desc: 'Halliwell Annex', active: true, default: false },
    { code: 'UHNBC', desc: 'University Hospital of Northern BC', active: true, default: false },
    { code: 'LAKES', desc: 'Lakes District Hospital', active: false, default: false },
  ],
  anchorPrefix: 'facility',
  anchorKey: 'code',
}

/* ===========================================================================
   C.4  Service Centers — headed "Service Center List"
   ======================================================================== */
const SERVICE_CENTERS: ClinicListSpec = {
  node: 'ad-service-centers',
  label: 'Service Centers',
  header: 'Service Center List',
  dialect: 'edit-record-find',
  source: '303058 / 439c48301780 (1021x747, 1:1)',
  filter: { kind: 'columns', boxes: [{ col: 0, w: 138 }, { col: 1, w: 329 }] },
  columns: [
    { key: 'code', header: 'Code', width: 140 },
    { key: 'desc', header: 'Description', width: 331 },
    { key: 'active', header: 'Active', width: 55, align: 'center', check: true },
  ],
  rows: [
    { code: 'CARDIO', desc: 'Cardiology service center', active: true },
    { code: 'DIABED', desc: 'Diabetes education', active: true },
    { code: 'MATERNITY', desc: 'Maternity clinic', active: true },
    { code: 'TRAVEL', desc: 'Travel and immunization', active: false },
    { code: 'WOUNDCARE', desc: 'Wound care', active: true },
  ],
  anchorPrefix: 'service-center',
  anchorKey: 'code',
}

/* ===========================================================================
   C.5  Service Location — headed "Service Location List"
   ======================================================================== */
const SERVICE_LOCATION: ClinicListSpec = {
  node: 'ad-locations',
  label: 'Service Location',
  header: 'Service Location List',
  dialect: 'inline-save',
  editable: true,
  /* column 1 is the focused cell in the capture */
  focusColumn: 0,
  source: '303059 / 93837c26c76f (1019x746, 1:1)',
  filter: { kind: 'columns', boxes: [{ col: 0, w: 408 }] },
  /* This is the only classic node whose header band wraps: 28px over two
     lines (y 128-155) rather than the usual 16. The break is MOIS's own. */
  columns: [
    { key: 'location', header: 'Service Location', width: 410 },
    { key: 'scheduler', header: 'Make Available\non Scheduler', width: 96, align: 'center', check: true },
    { key: 'delivery', header: 'Service Delivery Location', width: 225 },
    { key: 'dots', header: '', width: 21, dots: true },
  ],
  /* Field notes from the article prose, recorded rather than rendered — they
     are documentation, not UI text: "Service Delivery Location: This is a
     list of all Northern Health Sites" and "Make Available on Scheduler: Only
     check of locations you want to schedule for" [sic]. */
  rows: [
    { location: 'HALLIWELL MEDICAL CLINIC', scheduler: true, delivery: 'PRINCE GEORGE - HALLIWELL' },
    { location: 'HALLIWELL ANNEX', scheduler: true, delivery: 'PRINCE GEORGE - ANNEX' },
    { location: 'UHNBC AMBULATORY CARE', scheduler: false, delivery: 'UNIVERSITY HOSPITAL OF NORTHERN BC' },
    { location: 'BURNS LAKE OUTREACH', scheduler: false, delivery: 'LAKES DISTRICT HOSPITAL' },
    { location: 'HOME VISIT', scheduler: true, delivery: '' },
  ],
  anchorPrefix: 'location',
  anchorKey: 'location',
}

/* ===========================================================================
   C.6  Computer Registration — headed "Computer List"
   ======================================================================== */
const COMPUTER_LIST: ClinicListSpec = {
  node: 'ad-computer',
  label: 'Computer Registration',
  header: 'Computer List',
  dialect: 'edit-record',
  source: '303060 / f94561ee3583 (1020x749, 1:1)',
  filter: {
    kind: 'columns',
    boxes: [
      { col: 0, w: 96 }, { col: 1, w: 124 }, { col: 2, w: 133 }, { col: 3, w: 133 },
      { col: 4, w: 133 }, { col: 5, w: 133 }, { col: 6, w: 29 },
    ],
  },
  columns: [
    { key: 'computer', header: 'Computer Name', width: 98 },
    { key: 'location', header: 'Location', width: 126 },
    { key: 'report', header: 'Report Printer', width: 135 },
    { key: 'label', header: 'Label Printer', width: 135 },
    { key: 'form', header: 'Form Printer', width: 135 },
    { key: 'rx', header: 'Rx Printer', width: 135 },
    /*
     * Column 7 is clipped at the pane edge in the only capture: 29px of it
     * show and the caption reads `DEFA…`. The article's own glossary defines
     * `Fax Device: The name of the fax machine`, which is where this caption
     * comes from — it is inferred, not measured, and the column has no
     * measured width, so it is left to take whatever the pane has left, the
     * way the capture shows it running off the edge.
     */
    { key: 'fax', header: 'Fax Device' },
  ],
  rows: [
    { computer: 'FRONT01', location: 'Reception', report: 'HP LaserJet 4250', label: 'Zebra GK420d', form: 'HP LaserJet 4250', rx: 'HP LaserJet 4250', fax: 'FAX01' },
    { computer: 'FRONT02', location: 'Reception', report: 'HP LaserJet 4250', label: 'Zebra GK420d', form: 'HP LaserJet 4250', rx: 'HP LaserJet 4250', fax: 'FAX01' },
    { computer: 'NURSE01', location: 'Nursing station', report: 'HP LaserJet M404', label: 'Zebra GK420d', form: 'HP LaserJet M404', rx: 'HP LaserJet M404', fax: 'FAX01' },
    { computer: 'EXAM1PC', location: 'Exam Room 1', report: 'HP LaserJet M404', label: '', form: 'HP LaserJet M404', rx: 'HP LaserJet M404', fax: '' },
    { computer: 'ADMIN01', location: 'Administration', report: 'HP LaserJet 4250', label: '', form: 'HP LaserJet 4250', rx: '', fax: 'FAX02' },
  ],
  anchorPrefix: 'computer',
  anchorKey: 'computer',
  anchorCell: 'computer',
}

/* ===========================================================================
   C.7  Global Reminders
   ======================================================================== */
const GLOBAL_REMINDERS: ClinicListSpec = {
  node: 'ad-reminders',
  label: 'Global Reminders',
  header: 'Global Reminders',
  dialect: 'master-detail-save',
  editable: true,
  focusColumn: 0,
  source: '303071 / c115fa830a1b (1025x745, 1:1, v02.21.12 b161125)',
  filter: { kind: 'columns', boxes: [{ col: 0, w: 513 }] },
  columns: [
    { key: 'reminder', header: 'Reminder', width: 543 },
    { key: 'stop', header: 'Stop', width: 84, align: 'center', check: true },
  ],
  rows: [
    { reminder: 'Patient has no primary care provider recorded', stop: false },
    { reminder: 'Diabetic patient overdue for HbA1c', stop: false },
    { reminder: 'Influenza immunization due (65 and over)', stop: false },
    { reminder: 'Chart has an unsigned encounter older than 30 days', stop: true },
  ],
  detail: {
    /* splitter at y 472 in a 745-tall window; tab strip y 473-501 = 28px */
    height: 246,
    stripH: 28,
    tabs: ['Detail', 'Condition(s)'],
    pages: {
      /*
       * Never captured. Every shot of this window — `303071` and `303197`
       * share one image — has Condition(s) active, so the Detail tab's field
       * layout and control types are unknown. The prose names four things
       * only: a free-text detail area, a triggering-event selector ("patient
       * arrival, book appointment etc."), a due date and a grace period. That
       * is not enough to draw, so the page is left empty rather than invented.
       */
      Detail: { kind: 'uncaptured' },
      'Condition(s)': {
        kind: 'grid',
        buttons: ['New', 'Delete'],
        scope: 'conditions',
        columns: [
          { key: 'element', header: 'Element Type', width: 112 },
          { key: 'code', header: 'Code', width: 84 },
          { key: 'concept', header: 'Description or Concept', width: 259, dim: true },
          { key: 'dots', header: '', width: 17, dots: true },
          { key: 'comparison', header: 'Comparison', width: 70, align: 'center' },
          { key: 'value', header: 'Value', width: 100 },
          { key: 'units', header: 'Units', width: 68 },
          { key: 'operator', header: 'Operator', width: 64 },
        ],
        rows: [
          { element: 'STATUS', code: 'DIABETES', concept: 'DIABETES MELLITUS', comparison: '=', value: '', units: '', operator: 'AND' },
          { element: 'MEASURE', code: '4548-4', concept: 'HEMOGLOBIN A1C / HEMOGLOBIN.TOTAL IN BLOOD', comparison: '>', value: '7.0', units: '%', operator: '' },
        ],
        legend: {
          label: 'Comparison Key:',
          keys: ['[ > Greater Than ]', '[ < Less Than ]', '[ = Equals or Exists ]', '[ <> Not Equal or Does Not Exist ]'],
        },
      },
    },
  },
  anchorPrefix: 'reminder',
  anchorKey: 'reminder',
}

/* ===========================================================================
   C.8  Clinic Favourite Meds — headed "Clinic Favourite Medication List"
   ======================================================================== */
const FAVOURITE_MEDS: ClinicListSpec = {
  node: 'ad-meds',
  label: 'Clinic Favourite Meds',
  header: 'Clinic Favourite Medication List',
  dialect: 'inline-save',
  closeWindow: true,
  editable: true,
  focusColumn: 0,
  source: '303074 / c063471a53d0 (1022x749, 1:1)',
  /* the band y 105-125 is there but empty: a plain full-width white expanse */
  filter: { kind: 'blank' },
  columns: [
    { key: 'identifier', header: 'Identifier', width: 161 },
    { key: 'cdic', header: 'CDIC', width: 69 },
    { key: 'cdicDots', header: '', width: 16, dots: true },
    { key: 'medication', header: 'Medication', width: 285 },
    { key: 'dose', header: 'Dose / Frequency', width: 126 },
    { key: 'doseDots', header: '', width: 16, dots: true },
    { key: 'amount', header: 'Amount', width: 96 },
  ],
  /* `303074` delegates its field documentation: "All descriptions for this
     page can be found in the Prescriptions folder of the Patient Chart
     section of this manual." */
  rows: [
    { identifier: 'ATORVASTATIN 20', cdic: '02248630', medication: 'ATORVASTATIN CALCIUM 20 MG TABLET', dose: '1 TAB ORAL DAILY', amount: '90 TAB' },
    { identifier: 'METFORMIN 500', cdic: '02045463', medication: 'METFORMIN HCL 500 MG TABLET', dose: '1 TAB ORAL TID', amount: '270 TAB' },
    { identifier: 'RAMIPRIL 5', cdic: '02240947', medication: 'RAMIPRIL 5 MG CAPSULE', dose: '1 CAP ORAL DAILY', amount: '90 CAP' },
    { identifier: 'AMOXICILLIN 500', cdic: '00628115', medication: 'AMOXICILLIN 500 MG CAPSULE', dose: '1 CAP ORAL TID', amount: '21 CAP' },
    { identifier: 'LEVOTHYROXINE 50', cdic: '02230489', medication: 'LEVOTHYROXINE SODIUM 50 MCG TABLET', dose: '1 TAB ORAL DAILY', amount: '90 TAB' },
  ],
  detail: {
    /* splitter y 498; the untabbed form runs y 501-717 */
    height: 216,
    pages: {
      main: {
        kind: 'form',
        left: [
          { kind: 'text', label: 'ATC Code:', w: 86, value: 'C10AA05' },
          { kind: 'memo', label: 'Generic Name:', rows: 2, value: 'ATORVASTATIN CALCIUM', readOnly: true },
          { kind: 'lookup', label: 'Indication:', w: 120 },
          { kind: 'memo', label: 'Comment:', rows: 2 },
          { kind: 'memo', label: 'Printed on Prescription', rows: 2 },
        ],
        right: [
          { kind: 'checks', label: 'Instructions:', items: [{ label: 'Do Not Substitute' }, { label: 'Do Not Adapt' }] },
          { kind: 'checks', label: 'PRN:', items: [{ label: '(when necessary)' }] },
          /* the tree's shape is `c063471a…`'s; its values are the current
             row's (ATORVASTATIN 20: 1 TAB ORAL DAILY, 90 TAB), so it reads as
             what that row resolves to */
          { kind: 'tree', caption: 'Dose Detail', lines: ['⊟ DISPENSE: 90 TAB', '   └ 1.0 TAB ORAL DAILY'] },
        ],
        footer: 'Created:  2016.01.13 09:43 ADMINISTRATOR      Last Modified: 2016.01.13 09:43 ADMINISTRATOR',
      },
    },
  },
  anchorPrefix: 'med',
  anchorKey: 'identifier',
}

/* ===========================================================================
   C.9  Immunization Inventory
   ======================================================================== */
const IMMUNIZATION: ClinicListSpec = {
  node: 'ad-immunization',
  label: 'Immunization Inventory',
  header: 'Immunization Inventory',
  dialect: 'immunization',
  editable: true,
  focusColumn: 0,
  source: '303075 / 524838a3657e (1022x746, 1:1); Lot Numbers 303075 / baee1c46b739 (814x285)',
  filter: { kind: 'blank' },
  columns: [
    { key: 'code', header: 'Code', width: 65 },
    { key: 'codeDots', header: '', width: 18, dots: true },
    /* the "(read-only)" suffix is part of the shipped caption */
    { key: 'brand', header: 'Brand Name (read-only)', width: 209 },
    { key: 'generic', header: 'Generic Name (read-only)', width: 355 },
    { key: 'dose', header: 'Dose', width: 61, align: 'right' },
    { key: 'unit', header: 'Unit', width: 59 },
  ],
  rows: [
    { code: '02015986', brand: 'FLUVIRAL S/F', generic: 'INFLUENZA VIRUS VACCINE (SPLIT VIRION)', dose: '0.5', unit: 'mL' },
    { code: '02245386', brand: 'ENGERIX-B', generic: 'HEPATITIS B VACCINE (RECOMBINANT)', dose: '1.0', unit: 'mL' },
    { code: '02248152', brand: 'TWINRIX', generic: 'HEPATITIS A (INACTIVATED) AND HEPATITIS B (RECOMBINANT) VACCINE', dose: '1.0', unit: 'mL' },
    { code: '01916122', brand: 'ADACEL', generic: 'TETANUS, DIPHTHERIA AND ACELLULAR PERTUSSIS VACCINE', dose: '0.5', unit: 'mL' },
    { code: '02362654', brand: 'PNEUMOVAX 23', generic: 'PNEUMOCOCCAL POLYSACCHARIDE VACCINE', dose: '0.5', unit: 'mL' },
  ],
  detail: {
    /* splitter y 432; tab strip y 433-456 = 24px */
    height: 286,
    stripH: 24,
    tabs: ['Detail', 'Lot Numbers'],
    pages: {
      Detail: {
        kind: 'form',
        left: [
          { kind: 'static', text: 'Drug Code: 02015986   Source: DPD [HC]   ATC Code: J07BB01   Reference Set: BCIMM' },
          { kind: 'text', label: 'Brand Name:', w: 220, value: 'FLUVIRAL S/F', readOnly: true },
          { kind: 'text', label: 'Generic Name:', w: 320, value: 'INFLUENZA VIRUS VACCINE (SPLIT VIRION)', readOnly: true },
          { kind: 'text', label: 'Manufacturer:', w: 220, value: 'GLAXOSMITHKLINE INC', readOnly: true },
          { kind: 'pair', label: 'Dose:', fields: [
            { kind: 'text', w: 54, value: '0.5' },
            { kind: 'static', text: '/' },
            { kind: 'drop', options: ['mL', 'mg', 'DOSE'], value: 'mL', w: 70 },
          ] },
          { kind: 'memo', label: 'Comment:', rows: 3 },
        ],
        footer: 'Created:  2015.10.20 16:34 HALLIWELL, ALYSSA',
      },
      'Lot Numbers': {
        kind: 'grid',
        caption: 'Lot Numbers',
        buttons: ['New', 'Delete'],
        scope: 'lot-numbers',
        /* the nested grid's column widths were never measured — the capture
           is an 814x285 crop with no separator run to read — so they are left
           to the DataWindow */
        columns: [
          { key: 'lot', header: 'Lot Number' },
          { key: 'expiry', header: 'Expiry' },
          { key: 'recalled', header: 'Recalled', align: 'center', check: true },
          { key: 'recallDate', header: 'Recall Date' },
          { key: 'reason', header: 'Recall Reason / General Comments' },
        ],
        rows: [
          { lot: 'AFLUA612AA', expiry: '2016.06.30', recalled: false, recallDate: '', reason: '' },
          { lot: 'AFLUA701BB', expiry: '2016.09.30', recalled: false, recallDate: '', reason: 'Second shipment' },
        ],
      },
    },
  },
  anchorPrefix: 'immunization',
  anchorKey: 'brand',
}

/* ===========================================================================
   C.12  Address Book ▸ Contact List
   ======================================================================== */
const CONTACT_LIST: ClinicListSpec = {
  node: 'ad-contact-list',
  label: 'Contact List',
  header: 'Contact List',
  dialect: 'edit-record',
  source: '2873865 / e739f2f5041a (1182x496, 125%)',
  /* not the per-column box strip: one labelled control and one wide box */
  filter: { kind: 'labelled', label: 'Filter:', w: 420 },
  /* no column separators and no header captions; the bands carry the name */
  bare: true,
  groups: ['CLINICS', 'HOSPITAL AND CLINICS', 'LABS AND IMAGING', 'PHARMACY', 'REGIONAL', 'UHNBC'],
  groupKey: 'group',
  groupFill: '#a6caf0',
  /* the capture gives no column separator run, so no width is measured here */
  columns: [
    { key: 'list', header: '' },
    { key: 'desc', header: '' },
    { key: 'type', header: '', align: 'right' },
  ],
  rows: [
    { group: 'CLINICS', list: 'HALLIWELL MEDICAL CLINIC', desc: 'Clinic reception and MOA fax', type: 'STANDARD' },
    { group: 'CLINICS', list: 'HALLIWELL ANNEX', desc: 'Annex reception', type: 'STANDARD' },
    { group: 'HOSPITAL AND CLINICS', list: 'UHNBC SWITCHBOARD', desc: 'Main hospital switchboard', type: 'STANDARD' },
    { group: 'HOSPITAL AND CLINICS', list: 'LAKES DISTRICT HOSPITAL', desc: 'Burns Lake', type: 'STANDARD' },
    { group: 'LABS AND IMAGING', list: 'LIFELABS - PRINCE GEORGE', desc: 'Outpatient laboratory', type: 'STANDARD' },
    { group: 'LABS AND IMAGING', list: 'UHNBC MEDICAL IMAGING', desc: 'X-ray, CT and ultrasound booking', type: 'STANDARD' },
    { group: 'PHARMACY', list: 'SHOPPERS DRUG MART #2187', desc: 'Victoria Street', type: 'STANDARD' },
    { group: 'PHARMACY', list: 'HALLIWELL COMPOUNDING', desc: 'Compounding pharmacy', type: 'STANDARD' },
    { group: 'REGIONAL', list: 'NORTHERN HEALTH PUBLIC HEALTH', desc: 'Communicable disease reporting', type: 'STANDARD' },
    { group: 'UHNBC', list: 'UHNBC AMBULATORY CARE', desc: 'Ambulatory clinic booking', type: 'STANDARD' },
  ],
  anchorPrefix: 'contact',
  anchorKey: 'list',
}

/* ===========================================================================
   C.10  External Service Providers ▸ Providers — headed "Master Provider List"
   ======================================================================== */
const MASTER_PROVIDERS: ClinicListSpec = {
  node: 'ad-providers',
  label: 'Providers',
  header: 'Master Provider List',
  dialect: 'edit-record',
  source: '303119 / 78377ed4a78b (1263x930, 125%, v02.29.09 b220906) — widths divided by 1.25',
  /* four boxes, under Name / Practition No. / Spec Code / City. The capture
     does not give their widths, so each box takes its column's width. */
  filter: { kind: 'columns', boxes: [{ col: 0 }, { col: 1 }, { col: 2 }, { col: 3 }] },
  columns: [
    { key: 'name', header: 'Name', width: 198 },
    /* shipped typo: the grid caption reads "Practition No." where the
       article's prose calls it "Practitioner No." */
    { key: 'pract', header: 'Practition No.', width: 85 },
    { key: 'spec', header: 'Spec Code', width: 136 },
    { key: 'city', header: 'City', width: 98 },
    { key: 'primary', header: 'Primary', width: 86 },
    { key: 'secondary', header: 'Secondary', width: 86 },
    { key: 'fax', header: 'Fax', width: 63 },
  ],
  rows: [
    { name: 'AKEHURST, WILLIAM', pract: 'J12345', spec: '00 GENERAL PRACTICE', city: 'PRINCE GEORGE', primary: '250-555-0142', secondary: '250-555-0143', fax: '250-555-0144' },
    { name: 'CHEN, MEILIN', pract: 'J20981', spec: '15 PSYCHIATRY', city: 'PRINCE GEORGE', primary: '250-555-0161', secondary: '', fax: '250-555-0162' },
    { name: 'DOOLITTLE, EDDIE', pract: 'J33120', spec: '07 GENERAL SURGERY', city: 'VANDERHOOF', primary: '250-555-0175', secondary: '', fax: '250-555-0176' },
    { name: 'FAIRCHILD, NESRIN', pract: 'J54321', spec: '12 INTERNAL MEDICINE', city: 'PRINCE GEORGE', primary: '250-555-0188', secondary: '250-555-0189', fax: '250-555-0190' },
    { name: 'OKUDA, TIKA', pract: 'J21044', spec: '06 OBSTETRICS & GYNECOLOGY', city: 'QUESNEL', primary: '250-555-0133', secondary: '', fax: '250-555-0134' },
    { name: 'RAMSAY, GORDON', pract: 'J40881', spec: '18 DERMATOLOGY', city: 'PRINCE GEORGE', primary: '250-555-0151', secondary: '', fax: '250-555-0152' },
  ],
  anchorPrefix: 'master-provider',
  anchorKey: 'name',
}

/* ===========================================================================
   C.11  External Service Providers ▸ Organizations — headed "Organization List"
   ======================================================================== */
const ORGANIZATIONS: ClinicListSpec = {
  node: 'ad-organizations',
  label: 'Organizations',
  header: 'Organization List',
  dialect: 'inline-save',
  /* inline-editable, but the capture's focus sits in the detail pane, so no
     cell in the grid carries the #FFC09C wash */
  editable: true,
  source: '303121 / 7eca3b910463 (1250x818, 125%) — widths divided by 1.25',
  /* two boxes, under Name and Organization Type; widths not measured */
  filter: { kind: 'columns', boxes: [{ col: 0 }, { col: 1 }] },
  /* the header band measures 18px at 125%, about 14px logical — narrower than
     the 16px the classic captures give, and narrower than the kit draws */
  columns: [
    { key: 'name', header: 'Name', width: 359 },
    { key: 'orgType', header: 'Organization Type', width: 168 },
    { key: 'city', header: 'City', width: 150 },
    { key: 'phone', header: 'Phone', width: 95 },
  ],
  /* Organization Type values come from Administration ▸ Codeset Management ▸
     Value Sets ▸ EXTERNAL ORGANIZATION TYPE. */
  rows: [
    { name: 'LIFELABS - PRINCE GEORGE', orgType: 'LABORATORY', city: 'PRINCE GEORGE', phone: '250-555-0188' },
    { name: 'NORTHERN HEALTH PUBLIC HEALTH', orgType: 'PUBLIC HEALTH', city: 'PRINCE GEORGE', phone: '250-555-0120' },
    { name: 'UHNBC MEDICAL IMAGING', orgType: 'DIAGNOSTIC IMAGING', city: 'PRINCE GEORGE', phone: '250-555-0177' },
    { name: 'PRINCE GEORGE HOSPICE SOCIETY', orgType: 'COMMUNITY AGENCY', city: 'PRINCE GEORGE', phone: '250-555-0165' },
    { name: 'BURNS LAKE HOME SUPPORT', orgType: 'HOME AND COMMUNITY CARE', city: 'BURNS LAKE', phone: '250-555-0199' },
  ],
  detail: {
    /* the capture gives no splitter y for this window, so the pane is sized
       by its content rather than to an invented height */
    pages: {
      main: {
        kind: 'form',
        left: [
          { kind: 'text', label: 'Address:', w: 260, value: '1488 VICTORIA STREET' },
          { kind: 'text', label: '', w: 260 },
          { kind: 'pair', fields: [
            { kind: 'text', label: 'City:', w: 150, value: 'PRINCE GEORGE' },
            { kind: 'text', label: 'Province:', w: 54, value: 'BC' },
          ] },
          { kind: 'pair', fields: [
            { kind: 'text', label: 'Postal Code:', w: 78, value: 'V2L 2L2' },
            { kind: 'text', label: 'Country:', w: 90, value: 'CANADA' },
          ] },
          { kind: 'text', label: 'Phone:', w: 120, value: '250-555-0188' },
          { kind: 'text', label: 'Fax:', w: 120, value: '250-555-0187' },
        ],
        right: [
          { kind: 'memo', label: 'Note:', rows: 6 },
        ],
        footer: 'Created: 2020.10.13 10:32',
      },
    },
  },
  anchorPrefix: 'organization',
  anchorKey: 'name',
}

/* ===========================================================================
   C.12  Clinic Management ▸ Org Role List / Organization List  (MOIS 2.22+)

   `e8cb6689…` (2069798, v02.30.11 b230504) shows the Org Role List window
   behind its New Org Role Profile dialog: the navy `Org Role List` header,
   New Record / Delete Record / Edit Record / Close Window, and a filter strip
   of two boxes (≈306 and ≈272px) over a two-column grid. The dialog covers
   the grid's captions. The two columns are drawn as Name and Category — the
   two identifying fields New Org Role Profile asks for, and the two lines of
   the Org Role / Organization window header (`c8213c6f…`) — which is an
   inference, stated here, not a reading.

   The Organization List is the same window over organizations (2069411:
   "Organizations and Org Roles are found under Clinic Management"). The
   records are 2069798's and `c8213c6f…`'s own examples (NURSE, HOME CARE)
   and the org roles and organizations the MOIS Search Window lists.
   ======================================================================== */
const ORG_ROLE_LIST: ClinicListSpec = {
  node: 'ad-org-role-list',
  label: 'Org Role List',
  header: 'Org Role List',
  dialect: 'edit-record',
  source: '2069798 / e8cb6689 (header, command row, filter strip); columns inferred',
  filter: { kind: 'columns', boxes: [{ col: 0, w: 306 }, { col: 1, w: 272 }] },
  columns: [
    { key: 'name', header: 'Name', width: 308 },
    { key: 'category', header: 'Category', width: 274 },
  ],
  rows: [
    { name: 'ACUTE 1 PLN 1 PRG', category: '' },
    { name: 'NURSE', category: '' },
    { name: 'TECHNICAL SUPPORT', category: '' },
  ],
  anchorPrefix: 'org-role',
  anchorKey: 'name',
}

const ORGANIZATION_LIST: ClinicListSpec = {
  node: 'ad-org-list',
  label: 'Organization List',
  header: 'Organization List',
  dialect: 'edit-record',
  source: '2069798 / e8cb6689 (the Org Role List window it mirrors); columns inferred',
  filter: { kind: 'columns', boxes: [{ col: 0, w: 306 }, { col: 1, w: 272 }] },
  columns: [
    { key: 'name', header: 'Name', width: 308 },
    { key: 'category', header: 'Category', width: 274 },
  ],
  rows: [
    { name: 'ADULT PSYCH 1 PRG', category: '' },
    { name: 'CT1PRG', category: '' },
    { name: 'GIM CLINIC', category: '' },
    { name: 'HOME CARE', category: '' },
  ],
  anchorPrefix: 'organization',
  anchorKey: 'name',
}

/* --- a stage session's edits to these lists (host/screen-windows.tsx
   `useSessionState`), so a converted provider stays converted when the
   learner moves to the Org Role List ------------------------------------ */

/** the Provider List's current row, which the conversion utility acts on */
export const CURRENT_PROVIDER_KEY = 'admin:provider-list:current'
/** provider name → what it was converted to */
export const CONVERTED_PROVIDERS_KEY = 'admin:provider-list:converted'
export type ConvertedProviders = Record<string, 'org-role' | 'organization'>

/* ===========================================================================
   D.  The editor windows the lists raise (screens/ClinicEditorWindows.tsx)

   A list's rows are session state once anything edits them: New Record adds
   one, a detail window's Save writes its fields back. The whole list is kept
   under one key per node (host/screen-windows.tsx `useSessionState`), so a
   provider added under Administration is in the Master Provider List lookup
   the Letter Writer opens later in the same stage run.
   ======================================================================== */

/** a list's rows for this stage session, by tree node */
export const clinicRowsKey = (node: string) => `admin:clinic:rows:${node}`
/** Facility Detail's nested Locations grid, per facility code */
export const FACILITY_LOCATIONS_KEY = 'admin:clinic:facility-locations'

/**
 * The locations each facility holds — the codes the Resource List's
 * `Location Code` column already names (HMC-MAIN, HMC-ANNEX), gathered under
 * their facility so New Resource and Resource Detail can drop them. Facility
 * Detail (`303057` / `dfb5b6008f0b…`) edits the same grid.
 */
export const FACILITY_LOCATIONS: Record<string, ClinicRow[]> = {
  HMC: [
    { code: 'HMC-MAIN', desc: 'Halliwell Medical Clinic - main floor', default: true, active: true },
    { code: 'HMC-ANNEX', desc: 'Halliwell Medical Clinic - annex', default: false, active: true },
  ],
}

/**
 * Visit Mode — "a standard government code list", not editable by the user.
 * `303360` prints the whole list; `89ac41815efb…` shows it dropped, one
 * upper-case description per line in this order, which is what is drawn.
 */
export const VISIT_MODES: string[] = [
  'Client Portal', 'Direct Encounter', 'Email', 'Help Line', 'Mobile Messaging',
  'Online Call', 'Online Call with Video', 'Online Chat', 'Other Computer Link',
  'Provider Portal', 'Telephone', 'Telemedicine',
].flatMap((mode) => (
  mode === 'Online Call with Video'
    ? ['CLIENT ALONE', 'CLIENT AND THIRD PARTY', 'CLIENT IN GROUP', 'THIRD PARTY'].map((who) => `${mode.toUpperCase()} WITH ${who}`)
    : ['CLIENT ALONE', 'CLIENT AND THIRD PARTY', 'CLIENT IN GROUP', 'THIRD PARTY ALONE'].map((who) => `${mode.toUpperCase()} WITH ${who}`)
))

/** Alias ID ▸ Source, as `9889ab2692c4…` (303184) drops it. */
export const ALIAS_SOURCES: { code: string; desc: string }[] = [
  { code: 'BCMSP', desc: 'BC MSP Provider License Number' },
  { code: 'EXC', desc: 'Excelleris Lab Interface ID' },
  { code: 'IHA', desc: 'Interior Health POI ID' },
  { code: 'IHMEDITECH', desc: 'Interior Health Meditech ID' },
  { code: 'NHA', desc: 'Northern Health CIX ID' },
  { code: 'NHCERNER', desc: 'Northern Health Cerner ID' },
  { code: 'PROVIDERGROUP', desc: 'CDX Provider Group' },
]

/** Billing ▸ Payment Mode: blank (normal), AP or PP — `303054`'s field list. */
export const PAYMENT_MODES = ['', 'AP', 'PP']

/**
 * Billing ▸ MSP Location. The codes are the claim window's Location list
 * (screens/BillingViews.tsx); `6e1c13abe6e8…` prints the description beside
 * the drop-down, and only G's is captured.
 */
export const MSP_LOCATIONS = ['', 'A', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'T', 'U', 'V', 'W']
export const MSP_LOCATION_TEXT: Record<string, string> = { G: 'Hospital - Day Care (surgery)' }

/**
 * The Master Provider List LOOKUP — the modal the Letter Writer's "…" and
 * Utilities ▸ Provider Address to Clipboard open (`304741` / `6127fb5936f2…`,
 * 729x615, 1:1). Not the Administration screen of the same name: its columns
 * are Provider / Provider Ref / City / Spec. Code / Phone / Fax, measured off
 * the capture's separators, over four filter boxes under the first four.
 */
export const MASTER_LOOKUP_COLUMNS: ClinicColumn[] = [
  { key: 'name', header: 'Provider', width: 196 },
  { key: 'pract', header: 'Provider Ref', width: 84 },
  { key: 'city', header: 'City', width: 116 },
  { key: 'spec', header: 'Spec. Code', width: 76 },
  { key: 'primary', header: 'Phone', width: 110, align: 'center' },
  { key: 'fax', header: 'Fax', width: 110, align: 'center' },
]

/* ===========================================================================
   The table the screen is driven from.
   ======================================================================== */
export const clinicListSpecs: ClinicListSpec[] = [
  PROVIDER_LIST,
  ORG_ROLE_LIST,
  ORGANIZATION_LIST,
  RESOURCE_LIST,
  FACILITY_LIST,
  SERVICE_CENTERS,
  SERVICE_LOCATION,
  COMPUTER_LIST,
  GLOBAL_REMINDERS,
  FAVOURITE_MEDS,
  IMMUNIZATION,
  CONTACT_LIST,
  MASTER_PROVIDERS,
  ORGANIZATIONS,
]

const BY_NODE = new Map(clinicListSpecs.map((v) => [v.node, v]))

export function clinicListSpec(node: string): ClinicListSpec | undefined {
  return BY_NODE.get(node)
}

/** The command row for a screen, with the optional Close Window appended. */
export function clinicCommands(view: ClinicListSpec): (string | null)[] {
  const base = CLINIC_COMMANDS[view.dialect]
  return view.closeWindow ? [...base, 'Close Window'] : base
}
