/* ============================================================================
   The Patient Chart taskbar utility windows — their tables.

   Seven modal windows hang off the Patient Chart's Taskbar and Toolbar:
   Find Patient (Superfind), Advance Chart Search, Reviewing: <folder>, Order
   Linking Service, Tag Information to Care Plan, Chart Navigator and Add
   Attachment. The screens that paint them are in `screens/` one file per
   window; what differs between two invocations of the same window — which
   folder called it, which columns it lists — lives here.

   PROVENANCE: `scratchpad/specs/chart-utility-windows.md`, a measured report
   over the vendor manual's own captures. Column widths, band heights and
   colours below are that report's figures, cited per table as
   `article-id / sha12`. Where the report says a figure is inferred or its
   capture's scale is unverified, the comment says so.

   The *rows* are synthetic training data in the house style (the roster in
   `patients.ts`, the providers in `providers.ts`): none of the captures
   transcribe a populated grid, only its columns. The two exceptions are
   called out where they appear — the Attach File(s) sample path and the
   Review History line, both of which are read straight off a capture.
   ========================================================================= */

import { MOIS_TODAY } from './patients'

/* ===========================================================================
   1. Find Patient — the Superfind window  (`303787` `304702`)
   ======================================================================== */

export type SuperfindVariant = 'conditions' | 'prescriptions'

export type SuperfindColumn = {
  key: string
  header: string
  /** measured off `304702 / 11fe47608b45` (1.00x) unless noted */
  width?: number
  align?: 'left' | 'center' | 'right'
}

export type SuperfindRow = {
  chart: string
  last: string
  first: string
  age: string
  sex: string
  status: string
  ins: string
  insuranceNo: string
  [key: string]: string
}

export type SuperfindScreen = {
  variant: SuperfindVariant
  /** the tree nodes this variant is reached from */
  nodes: string[]
  /**
   * The last word of `Find Patient with the following ___:` — it swaps per
   * folder. `Condition` in `11fe47608b45`, `Prescription` in `95d0bdaa6aa8`.
   */
  noun: string
  /**
   * The two search fields, left to right. `key` is the grid column each one
   * searches — either may be left blank, and Enter in either runs the search.
   * `value` is what the capture shows typed into the field.
   */
  fields: { label: string; key: string; width: number; value?: string }[]
  /** Health Conditions carries a read-only Statuses display + its "..."; the
      Prescriptions variant has no Statuses field at all */
  statuses?: string
  columns: SuperfindColumn[]
  rows: SuperfindRow[]
  /** what the lower grid lists for the row picked in the upper one */
  others: Record<string, SuperfindRow[]>
}

/* The nine patient-identity columns both variants open with. Widths from the
   Health-Conditions capture; the Prescriptions capture (≈0.98x) repeats them
   within 1–2 px, so one table serves both. The unlabeled 16px column between
   Age and Status is the sex letter. */
const SUPERFIND_IDENTITY: SuperfindColumn[] = [
  { key: 'chart', header: 'Chart', width: 40 },
  { key: 'last', header: 'Last Name', width: 77 },
  { key: 'first', header: 'First Name', width: 64 },
  { key: 'age', header: 'Age', width: 29, align: 'right' },
  { key: 'sex', header: '', width: 16, align: 'center' },
  { key: 'status', header: 'Status', width: 34, align: 'center' },
  { key: 'ins', header: 'Ins', width: 22, align: 'center' },
  { key: 'insuranceNo', header: 'Insurance No.', width: 68 },
]

const CONDITION_ROWS: SuperfindRow[] = [
  { chart: '3598', last: 'AADAMS', first: 'PATCH', age: '33', sex: 'M', status: 'A', ins: 'BC', insuranceNo: '9876 588 666', start: '2019.11.04', end: '', code: '250.00', description: 'DIABETES MELLITUS - TYPE 2' },
  { chart: '2429', last: 'AARONSON', first: 'FLO', age: '56', sex: 'F', status: 'A', ins: '', insuranceNo: '987836902', start: '2016.03.22', end: '', code: '250.01', description: 'DIABETES MELLITUS - TYPE 1' },
  { chart: '746', last: 'AARONSON', first: 'FRANK', age: '26', sex: 'M', status: 'A', ins: 'BC', insuranceNo: '9086756685', start: '2024.07.09', end: '', code: '250.00', description: 'DIABETES MELLITUS - TYPE 2' },
  { chart: '3429', last: 'ADAAMS', first: 'PATCH', age: '36', sex: 'M', status: 'A', ins: 'BC', insuranceNo: '9657896456', start: '2022.01.18', end: '', code: '250', description: 'DIABETES MELLITUS' },
  { chart: '2350', last: 'ADAMS', first: 'PATCH', age: '35', sex: 'M', status: 'A', ins: 'BC', insuranceNo: '987784786', start: '2021.09.30', end: '', code: '250.00', description: 'DIABETES MELLITUS - TYPE 2' },
  { chart: '3609', last: 'ADAMS', first: 'NICOLE', age: '27', sex: 'F', status: 'A', ins: 'BC', insuranceNo: '87567576598', start: '2025.05.02', end: '2025.12.19', code: '648.8', description: 'DIABETES MELLITUS - GESTATIONAL' },
]

const PRESCRIPTION_ROWS: SuperfindRow[] = [
  { chart: '3598', last: 'AADAMS', first: 'PATCH', age: '33', sex: 'M', status: 'A', ins: 'BC', insuranceNo: '9876 588 666', order: '10462', cdic: '00559407', medication: 'TYLENOL 325MG TAB' },
  { chart: '3924', last: 'AADAMS', first: 'PATCH', age: '39', sex: 'M', status: 'A', ins: '', insuranceNo: 'WFvx0zyo', order: '10455', cdic: '02240351', medication: 'TYLENOL EXTRA STRENGTH 500MG TAB' },
  { chart: '746', last: 'AARONSON', first: 'FRANK', age: '26', sex: 'M', status: 'A', ins: 'BC', insuranceNo: '9086756685', order: '10441', cdic: '00293512', medication: 'TYLENOL #3 TAB' },
  { chart: '1003', last: 'ADAMS', first: 'BRYAN', age: '2', sex: 'M', status: 'A', ins: 'BC', insuranceNo: '9234567156', order: '10438', cdic: '02238661', medication: 'TYLENOL CHILDREN 160MG/5ML SUSP' },
  { chart: '2350', last: 'ADAMS', first: 'PATCH', age: '35', sex: 'M', status: 'I', ins: 'BC', insuranceNo: '987784786', order: '10402', cdic: '02243700', medication: 'TYLENOL ARTHRITIS 650MG TAB' },
]

export const superfindScreens: SuperfindScreen[] = [
  {
    variant: 'conditions',
    nodes: ['conditions'],
    noun: 'Condition',
    /* `Code:` 63 at x 66, `Description:` 250 at x 209 — the capture shows `DM`
       typed into Description */
    fields: [
      { label: 'Code:', key: 'code', width: 63 },
      { label: 'Description:', key: 'description', width: 250, value: 'DM' },
    ],
    /* read-only display, #F0F0F0 face, w 85, default `A`; the "..." beside it
       is 13 wide */
    statuses: 'A',
    columns: [
      ...SUPERFIND_IDENTITY,
      { key: 'start', header: 'Start', width: 51 },
      { key: 'end', header: 'End', width: 51 },
      { key: 'code', header: 'Code', width: 38 },
      { key: 'description', header: 'Description', width: 257 },
    ],
    rows: CONDITION_ROWS,
    others: {
      3598: [
        { chart: '3598', last: 'AADAMS', first: 'PATCH', age: '33', sex: 'M', status: 'A', ins: 'BC', insuranceNo: '9876 588 666', start: '2021.02.11', end: '', code: '401.9', description: 'HYPERTENSION - ESSENTIAL' },
        { chart: '3598', last: 'AADAMS', first: 'PATCH', age: '33', sex: 'M', status: 'A', ins: 'BC', insuranceNo: '9876 588 666', start: '2019.11.04', end: '', code: '272.4', description: 'HYPERLIPIDEMIA' },
        { chart: '3598', last: 'AADAMS', first: 'PATCH', age: '33', sex: 'M', status: 'I', ins: 'BC', insuranceNo: '9876 588 666', start: '2018.06.27', end: '2019.02.14', code: '493.90', description: 'ASTHMA' },
      ],
      2429: [
        { chart: '2429', last: 'AARONSON', first: 'FLO', age: '56', sex: 'F', status: 'A', ins: '', insuranceNo: '987836902', start: '2015.08.19', end: '', code: '244.9', description: 'HYPOTHYROIDISM' },
      ],
      746: [
        { chart: '746', last: 'AARONSON', first: 'FRANK', age: '26', sex: 'M', status: 'A', ins: 'BC', insuranceNo: '9086756685', start: '2024.07.09', end: '', code: '278.00', description: 'OBESITY' },
      ],
    },
  },
  {
    variant: 'prescriptions',
    nodes: ['rx'],
    noun: 'Prescription',
    /* the Prescriptions capture replaces Code / Description with `CDIC:`
       (w ≈47) and `Medication:` (w ≈442, showing TYLENOL) and drops Statuses */
    fields: [
      { label: 'CDIC:', key: 'cdic', width: 47 },
      { label: 'Medication:', key: 'medication', width: 442, value: 'TYLENOL' },
    ],
    columns: [
      ...SUPERFIND_IDENTITY,
      { key: 'order', header: 'Order', width: 50 },
      { key: 'cdic', header: 'CDIC', width: 71 },
      { key: 'medication', header: 'Medication', width: 270 },
    ],
    rows: PRESCRIPTION_ROWS,
    others: {
      3598: [
        { chart: '3598', last: 'AADAMS', first: 'PATCH', age: '33', sex: 'M', status: 'A', ins: 'BC', insuranceNo: '9876 588 666', order: '10461', cdic: '02247683', medication: 'METFORMIN 500MG TAB' },
        { chart: '3598', last: 'AADAMS', first: 'PATCH', age: '33', sex: 'M', status: 'A', ins: 'BC', insuranceNo: '9876 588 666', order: '10460', cdic: '02241465', medication: 'RAMIPRIL 5MG CAP' },
      ],
      3924: [
        { chart: '3924', last: 'AADAMS', first: 'PATCH', age: '39', sex: 'M', status: 'A', ins: '', insuranceNo: 'WFvx0zyo', order: '10454', cdic: '02246998', medication: 'NAPROXEN 250MG TAB' },
      ],
    },
  },
]

/**
 * Which Superfind the folder opens.
 *
 * `304702` lists ten folders the window is available from — Imaging,
 * Consults, Procedures, Interventions, Reaction Risks, Long Term Medications,
 * Prescriptions, Health Conditions, Social History and Facility Admissions —
 * but only two of them were ever captured, so only two are built. The other
 * eight would need their own caption noun and their own last four columns,
 * and neither is in the corpus.
 */
export function superfindForNode(node: string): SuperfindScreen | undefined {
  return superfindScreens.find((s) => s.nodes.includes(node))
}

/* ===========================================================================
   4. Chart Navigator  (`303794 / 963fcbd704d2`, 864x514 @1.00x)
   ======================================================================== */

export type ChartNavigatorRow = {
  chart: string
  /** MOIS renders this `LAST,FIRST` with no space after the comma */
  name: string
  /** auto-filled `Loaded Chart Number:<n>` for a CHART-column load */
  description: string
  exclude?: boolean
}

/** A five-row CHART column loaded from a CSV, the way `303794` describes. */
export const chartNavigatorRows: ChartNavigatorRow[] = [
  { chart: '3924', name: 'AADAMS,PATCH', description: 'Loaded Chart Number:3924' },
  { chart: '3598', name: 'AADAMS,PATCH', description: 'Loaded Chart Number:3598' },
  { chart: '2429', name: 'AARONSON,FLO', description: 'Loaded Chart Number:2429' },
  { chart: '746', name: 'AARONSON,FRANK', description: 'Loaded Chart Number:746' },
  { chart: '1003', name: 'ADAMS,BRYAN', description: 'Loaded Chart Number:1003' },
]

/* ===========================================================================
   7. Reviewing: <folder>  (`303791 / 7d42bca76bd7`, 1.00x)
   ======================================================================== */

export type ReviewRow = { date: string; by: string; note: string }

/**
 * The window's noun tracks the folder that opened it. Only the Conditions
 * title was captured — `Reviewing: Health Condition`. `303791` says Review is
 * also available from Reaction Risks and Long Term Meds; the nouns those two
 * print are NOT in the corpus, so the two below are derived from the folder
 * names and marked as such.
 */
export const REVIEW_NOUNS: Record<string, string> = {
  /* captured (`7d42bca76bd7`) */
  conditions: 'Health Condition',
  /* derived from the folder label — never captured */
  reaction: 'Reaction Risk',
  ltm: 'Long Term Medication',
}

/**
 * The single Review History line the capture carries: the `Last Reviewed`
 * strip under the Condition page's Search For bar reads
 * `Last Reviewed  2024.02.20  LAROCHE, DEB`, and the grid's first row is that
 * review. Its Note cell is blank in the capture.
 */
export const reviewHistory: ReviewRow[] = [
  { date: '2024.02.20', by: 'LAROCHE, DEB', note: '' },
]

/** Who a review performed in the emulator is filed under, and when. */
export const REVIEW_USER = 'TECHNICAL SUPPORT'
export const REVIEW_TODAY = MOIS_TODAY

/* ===========================================================================
   8. Order Linking Service  (`303792 / 18088c4cd7da`, 1.00x)
   ======================================================================== */

export type OrderLinkRow = {
  date: string
  orderBy: string
  referral: string
  description: string
  detail: string
  /** an in-cell drop-down; only `IN PROCESS` is ever shown in the corpus */
  status: string
  priority: string
  /** `-` until the record is linked */
  links: string
}

export const orderLinkRows: OrderLinkRow[] = [
  { date: '2026.09.02', orderBy: 'SMITH, JOHN', referral: 'UHNBC LAB', description: 'HBA1C', detail: 'LAB', status: 'IN PROCESS', priority: 'ROUTINE', links: '-' },
  { date: '2026.08.27', orderBy: 'SMITH, JOHN', referral: 'UHNBC LAB', description: 'LIPID PANEL - FASTING', detail: 'LAB', status: 'IN PROCESS', priority: 'ROUTINE', links: '-' },
  { date: '2026.08.14', orderBy: 'AKEHURST.WILLIAM', referral: 'PRG DIAGNOSTIC IMAGING', description: 'CHEST X-RAY - PA AND LATERAL', detail: 'IMAGING', status: 'IN PROCESS', priority: 'ROUTINE', links: '-' },
  { date: '2026.07.31', orderBy: 'AMIN. MONA', referral: 'INTERNAL MEDICINE - UHNBC', description: 'CONSULT - ENDOCRINOLOGY', detail: 'CONSULT', status: 'IN PROCESS', priority: 'ROUTINE', links: '-' },
  { date: '2026.06.19', orderBy: 'SMITH, JOHN', referral: 'UHNBC LAB', description: 'SERUM CREATININE / EGFR', detail: 'LAB', status: 'IN PROCESS', priority: 'ROUTINE', links: '-' },
]

/** The read-only multiline inside the bottom `Comment` group, as captured. */
export const ORDER_LINK_COMMENT = 'ORDER BY: SMITH, JOHN'

/* ===========================================================================
   9. Tag Information to Care Plan  (`304731 / fc801c1cfa93`, 1.00x)
   ======================================================================== */

export type TagCarePlanRecord = {
  /** the source folder, shown in a greyed read-only edit */
  category: string
  code: string
  description: string
  /** prefilled from the source folder; the full Section list is undocumented */
  section: string
}

/**
 * The one record the capture shows, tagged out of the Consults folder.
 * Every other folder would prefill its own Category and Section, and the
 * Section drop-down's list is not in the corpus, so nothing else is tabled.
 */
export const tagCarePlanRecords: Record<string, TagCarePlanRecord> = {
  consults: { category: 'CONSULT', code: '25061', description: 'NEUROPATHY - DIABETIC', section: 'CONSULTS' },
}

/* ===========================================================================
   3. Add Attachment  (`303790` `303793` `303803`)
   ======================================================================== */

/** Tab A's filter boxes, one per data column. Widths from `c4c825549fd1`. */
export const FORM_LETTER_WIDTHS = {
  /** the heart gutter carries no filter box */
  favourite: 24,
  description: 651,
  source: 81,
  docType: 76,
  /** unlabeled and empty in every capture */
  spare: 63,
}

export type FormLetterRow = {
  group: 'RECENT' | 'FORMS'
  description: string
  source: string
  docType: string
  spare: string
}

/** The two bands the tree-grid paints, in painting order. */
export const FORM_LETTER_GROUPS: FormLetterRow['group'][] = ['RECENT', 'FORMS']

/* Source/Org and Doc type values are the ones listed in the capture:
   FNHA / MISC / NH / GOVT-BC / GOVT-FED / AHS / IH / AB / PROVIDENCE, and
   REQ / REFERRAL / REQ-LAB / MISC / QUESTIONN… (clipped in the capture by the
   76px column, and left long here so the column clips it the same way). */
export const formLetterRows: FormLetterRow[] = [
  { group: 'RECENT', description: 'BC CANCER AGENCY - REFERRAL', source: 'GOVT-BC', docType: 'REFERRAL', spare: '' },
  { group: 'RECENT', description: 'LABORATORY REQUISITION - GENERAL', source: 'NH', docType: 'REQ-LAB', spare: '' },
  { group: 'RECENT', description: 'DIABETES EDUCATION REFERRAL', source: 'NH', docType: 'REFERRAL', spare: '' },
  { group: 'FORMS', description: 'ADVANCE CARE PLANNING - MY VOICE', source: 'GOVT-BC', docType: 'MISC', spare: '' },
  { group: 'FORMS', description: 'BC CANCER AGENCY - REFERRAL', source: 'GOVT-BC', docType: 'REFERRAL', spare: '' },
  { group: 'FORMS', description: 'DIABETES EDUCATION REFERRAL', source: 'NH', docType: 'REFERRAL', spare: '' },
  { group: 'FORMS', description: 'DIAGNOSTIC IMAGING REQUISITION', source: 'NH', docType: 'REQ', spare: '' },
  { group: 'FORMS', description: 'FNHA MEDICAL TRANSPORTATION', source: 'FNHA', docType: 'REQ', spare: '' },
  { group: 'FORMS', description: 'HOME HEALTH REFERRAL', source: 'IH', docType: 'REFERRAL', spare: '' },
  { group: 'FORMS', description: 'LABORATORY REQUISITION - GENERAL', source: 'NH', docType: 'REQ-LAB', spare: '' },
  { group: 'FORMS', description: 'MEDICAL TRANSPORTATION AUTHORIZATION', source: 'AB', docType: 'REQ', spare: '' },
  { group: 'FORMS', description: 'PATIENT HEALTH QUESTIONNAIRE (PHQ-9)', source: 'MISC', docType: 'QUESTIONNAIRE', spare: '' },
  { group: 'FORMS', description: 'PROVIDENCE HEALTH - CARDIAC REFERRAL', source: 'PROVIDENCE', docType: 'REFERRAL', spare: '' },
  { group: 'FORMS', description: 'RESIDENTIAL CARE ACCESS REQUEST', source: 'AHS', docType: 'REQ', spare: '' },
  { group: 'FORMS', description: 'VETERANS AFFAIRS - TREATMENT AUTHORIZATION', source: 'GOVT-FED', docType: 'REQ', spare: '' },
]

export type AttachFileRow = {
  location: string
  /** editable; it renames the file as it appears in the Documents folder */
  note: string
  /** the paper-clip column */
  clip: string
}

/**
 * The one populated row is the capture's own (`303793 / c916baf7dc57`, which
 * shows `M:\ci00\scans\12_10000053.rtf` / `Testing` / `1`). A blank spare row
 * carrying only the `...` sits under the last populated one.
 */
export const attachFileRows: AttachFileRow[] = [
  { location: 'M:\\ci00\\scans\\12_10000053.rtf', note: 'Testing', clip: '1' },
]

/** `After Attaching` drop-down, verbatim and in order (`037ccb572632`). */
export const AFTER_ATTACHING: string[] = [
  '---',
  'CREATE A TASK',
  'CREATE A MESSAGE',
  'CREATE A REMINDER',
]

/** Move = the original is deleted once attached; Copy = it stays. */
export const ATTACH_FILE_MODES = ['Move Original File(s)', 'Copy Original File(s)'] as const
export type AttachFileMode = (typeof ATTACH_FILE_MODES)[number]

/* ===========================================================================
   5. Advance Chart Search  (`301562 / 4118f296000c`, 1.00x)
   ======================================================================== */

/**
 * The four name-matching modes. The third label really is `Begins\W`, with a
 * backslash, in the window itself — the manual body writes it "Begins with".
 */
export const CHART_SEARCH_MATCHES = ['Contains', 'Matches', 'Begins\\W', 'Soundex'] as const
export type ChartSearchMatch = (typeof CHART_SEARCH_MATCHES)[number]

/** Verbatim, off the capture. */
export const CHART_SEARCH_NOTE =
  'A Soundex search will return names that sound alike. For example, typing Mark in the first name '
  + 'will return a list of names that will also include Marc (as well as other names with a similar sound).'
