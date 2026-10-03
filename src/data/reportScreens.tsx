import type { UniversalSearchPresetId } from './universalSearchPresets'

/* ============================================================================
   The "clinical report" window class.

   Imaging Reports, Consult Reports, Procedure and Paper Forms are the same
   PowerBuilder window: identity strip, Search For, a list, a Report/Detail
   tab pair over a two-column detail form, a Source/Sent Date/Code footer
   with a signature link, and an Acknowledgement History + Workflow Summary
   rail down the right.

   Transcribed from the evidence captures for tdt_image, tdt_consult,
   tdt_procedure and tdt_document.
   ========================================================================= */

export type ReportField =
  | { label: string; kind: 'text' | 'lookup' | 'area' | 'range' | 'check'; w?: number | string; value?: string; rows?: number }
  | { label: string; kind: 'date'; w?: number; value?: string; time?: boolean }
  | { kind: 'gap' }

/** A field painted where the capture puts it, in CSS px from the detail
    page's top-left: MOIS lays several fields on one line (Region · Laterality
    · Flag), which the two-column form cannot say. `label` is the caption and
    the record binding; `cap` places the caption — omitted it sits at the left
    margin, `{ right }` right-aligns it to end at that x, `false` hides it (a
    time box beside its date). */
export type PaintedField = {
  label: string
  /** `check`: a tick box at x / y with `value` as the caption beside it,
      ticked from the record's binding for `label` (Alert's Sensitive:,
      evidence/MATRIX-R1234-start) */
  kind: 'text' | 'lookup' | 'area' | 'date' | 'time' | 'dots' | 'combo' | 'rule' | 'check'
  x: number
  y: number
  w: number
  /** 16 unless given (an area, a two-line caption's box) */
  h?: number
  cap?: { right: number } | { left: number } | false
  disabled?: boolean
  value?: string
  /** a lookup whose "…" opens the Universal Search Window on this preset */
  search?: UniversalSearchPresetId
}

/** one tab's two-column detail form, or its painted fields */
export type ReportForm = { left: ReportField[]; right: ReportField[]; painted?: PaintedField[] }

export type ReportScreen = {
  title: string
  commands: (string | null)[]
  disabled?: string[]
  columns: {
    key: string; header: string; auditId?: string; width?: number; align?: 'left' | 'center' | 'right'; dots?: boolean; check?: boolean
    /** a "…" column that opens the Universal Search Window on this preset */
    search?: UniversalSearchPresetId
    /** an in-cell drop-down DataWindow on the current row: the list headed
        `header`, one row per option (Family Hx's Relationship,
        evidence/MATRIX-R0645-relationship) */
    ddw?: { header: string; options: string[]; listW?: number }
  }[]
  rows: Record<string, string>[]
  /** omit for the tab-less variants such as Paper Forms */
  tabs?: string[]
  /** the detail form for `tabs[0]`, which is the tab the window opens on */
  left: ReportField[]
  right: ReportField[]
  /* Report and Detail are different forms over the same record — MOIS moves
     the order block and the report body onto Report and the provenance and
     facility fields onto Detail. `left`/`right` is the first tab; the rest are
     keyed by tab caption here. */
  forms?: Record<string, ReportForm>
  /** the first tab painted field by field (see PaintedField) */
  painted?: PaintedField[]
  /** the grid's painted height when a capture measures one of its own */
  gridHeight?: number
  /** a "Hide Linked Elsewhere" tick at the end of the Search For line
      (Documents, 2026-09-29 TRAINING capture set 3 c31) */
  hideLinked?: boolean
  /** PowerBuilder's fixed-width tabs rather than caption-sized ones
      (Consult Reports: Report · Detail · Office Notes (0), ~100px each) */
  fixedTabs?: boolean
  /** the fixed tabs' width when a capture measures one other than the kit's
      96px (PBTabs `tabWidth`) */
  tabWidth?: number
  /**
   * The Created / Last Modified line as MOIS DEV v02.31.23 spaces it on the
   * allergy, event and plain folders: `Created:` in line with the page's
   * captions, its stamp 76px after it and `Last Modified:` 348px after it
   * (evidence/MATRIX-R0652-onset, R0689-onset, R0634-date, R1234-start).
   * `modified: 'when-set'` prints Last Modified only on a record that has
   * been modified (R0645 and R0784, never modified, print none);
   * `detailOnly` draws the line under the first tab alone — the other tabs
   * run to the bottom of the window (R0681-code, R0685-onset, R0701, R0710).
   * Omitted, the report family's line (TRAINING c12, c16) is drawn.
   */
  createdLine?: { modified: 'always' | 'when-set'; detailOnly?: boolean }
  /** the Acknowledgement History / Workflow Summary rail */
  rail?: boolean
  /** a plain-text notice between Search For and the grid */
  banner?: string
  /** the Show: checkbox row above the grid (Measurements) */
  filters?: { label: string; checked?: boolean }[]
  /** a trailing dropdown beside Search For */
  viewSelect?: string[]
  /** flag out-of-range rows yellow */
  flagKey?: string
  /** no acknowledgement rail and no signature footer */
  plain?: boolean
  footer?: { source: string; sent?: string; code?: string; sign?: string }
  created?: string
}

const REPORT_CMDS = [
  'New Record', 'Delete Record', 'Save', 'Undo', 'Refresh',
  'Mark for Review', 'Link to Order', 'Print', 'Attachment',
]
/* Save and Undo are never greyed on a chart folder: every manual master shot
   (303240 `8ab16dca…png` Measurements v02.20.04, `fc25957f…png` Condition,
   304732 `a2e5c9af…png` Imaging v02.20.07) and every v02.31 reference capture
   (`reference/order-report.png`, `goal-standard-populated.png`,
   `patient-summary-loaded.png`) paints them enabled with nothing edited. */
const DIS: string[] = []
const clip = { key: 'clip', header: '\u{1F4CE}', width: 22, align: 'center' as const }
const dots = (k: string) => ({ key: k, header: '', dots: true })

export const reportScreens: Record<string, ReportScreen> = {
  measures: {
    title: 'Measurements',
    commands: [
      'New Record', 'Delete Record', 'Save', 'Undo', 'Refresh',
      'Mark for Review', 'Graph', 'Link to Order', 'Print', 'Attachment',
    ],
    disabled: DIS,
    filters: [
      { label: 'Show All', checked: true }, { label: 'Laboratory', checked: true },
      { label: 'Pathology', checked: true }, { label: 'Direct Clinical Obs', checked: true },
    ],
    /* List View / Panel View only (302837 `d417fc8b…`) */
    viewSelect: ['List View', 'Panel View'],
    flagKey: 'flag',
    /* widths and alignment read off the MOIS DEV v02.31.23 field audit,
       evidence/MATRIX-R0480-collected (1x): every column sized, so the grid
       ends at Status + clip; Collected and Flag centred, Code, Value, Units
       and Status left-aligned under centred captions */
    columns: [
      { key: 'collected', auditId: 'MATRIX-R0480-collected', header: 'Collected', width: 77, align: 'center' },
      { key: 'by', auditId: 'MATRIX-R0481-ordered-by', header: 'Ordered By', width: 116 },
      { key: 'code', auditId: 'MATRIX-R0482-code', header: 'Code', width: 62 },
      dots('d'),
      { key: 'test', auditId: 'MATRIX-R0483-test-name', header: 'Test Name', width: 241 },
      { key: 'value', auditId: 'MATRIX-R0484-value', header: 'Value', width: 81 },
      /* 302837's "Unnamed Column", right of Value: an ellipsis where a
         calculator produced the value, `.*.` for a dynamic form (`17afb92b…`) */
      { key: 'marker', header: '', width: 16, align: 'center' },
      { key: 'flag', auditId: 'MATRIX-R0485-flag', header: 'Flag', width: 47, align: 'center' },
      { key: 'units', auditId: 'MATRIX-R0486-units', header: 'Units', width: 64 },
      { key: 'status', auditId: 'MATRIX-R0487-status', header: 'Status', width: 40 },
      { ...clip, width: 18 },
    ],
    rows: [
      { collected: '2026.07.14', by: 'DOCTOR, TEST', code: '27958', test: 'ESTROGEN 24H UR-SCNC', value: '5', flag: '-', units: '', status: 'F', clip: '-' },
      { collected: '2026.02.19', by: 'PCIPT 1 NURSE 12 …', code: '1948', test: 'HEIGHT', value: '180', flag: '-', units: 'Cms', status: 'F', clip: '-' },
      { collected: '2026.02.19', by: 'PCIPT 1 NURSE 12 …', code: '2010', test: 'TEMPERATURE', value: '36.5', flag: '-', units: 'Deg C', status: 'F', clip: '-' },
      { collected: '2026.02.19', by: 'PCIPT 1 NURSE 12 …', code: '22732', test: 'WEIGHT', value: '80', flag: '-', units: 'kg', status: 'F', clip: '-' },
      { collected: '2026.02.19', by: 'PCIPT 1 NURSE 12 …', code: '1950', test: 'BLOOD PRESSURE (SYSTOLIC/DIASTOLIC)', value: '120/80', flag: '-', units: 'mm Hg', status: 'F', clip: '-' },
      { collected: '2026.02.19', by: 'PCIPT 1 NURSE 12 …', code: '951', test: 'BODY MASS INDEX', value: '24.7', flag: '-', units: '', status: 'F', clip: '-' },
      { collected: '2026.02.19', by: 'PCIPT 1 NURSE 12 …', code: '84782', test: 'COLUMBIA-SUICIDE SEVERITY RATING SCALE', value: 'MEDIUM', flag: '', units: '', status: 'F', clip: '1' },
      { collected: '2026.02.19', by: 'PCIPT 1 NURSE 12 …', code: '43894', test: 'PHQ-9 TOTAL SCORE', value: '19', flag: 'H', units: '', status: 'F', clip: '-' },
      { collected: '2026.02.13', by: 'TECHNICAL SUPPO…', code: '61838', test: 'NUMBER OF SWOLLEN JOINTS', value: '', flag: '-', units: '', status: '', clip: '-' },
    ],
    tabs: ['Report', 'Detail', 'Panel (0)'],
    /* Report, the tab the window opens on, over the selected first row —
       evidence/MATRIX-R0487-status */
    left: [
      { label: 'Test Name:', kind: 'text', w: 320, value: 'ESTROGEN 24H UR-SCNC' },
      { label: 'Value:', kind: 'text', w: 116, value: '5' },
      { label: 'Flag:', kind: 'text', w: 64 },
      { label: 'Ref. Ranges:', kind: 'range' },
      { label: 'Report:', kind: 'area', rows: 8, w: '100%' },
      { label: 'Comments:', kind: 'area', rows: 3, w: '100%' },
    ],
    right: [
      { label: 'Order Date:', kind: 'date', w: 92 },
      { label: 'Order #:', kind: 'lookup', w: 130 },
      { label: 'Ordered By:', kind: 'text', w: 250, value: 'DOCTOR, TEST' },
      { label: 'Copies To:', kind: 'text', w: 250 },
    ],
    forms: {
      /* evidence/MATRIX-R0524-specimen-src, captured over the COLUMBIA row */
      Detail: {
        left: [
          { label: 'Test Name:', kind: 'text', w: 320, value: 'COLUMBIA-SUICIDE SEVERITY RATING SCALE SCREENER-RE' },
          { label: 'Value:', kind: 'text', w: 116, value: 'MEDIUM' },
          { label: 'Flag:', kind: 'text', w: 64 },
          { label: 'Ref. Ranges:', kind: 'range' },
          { label: 'MOIS Code:', kind: 'text', w: 116, value: '84782' },
          { label: 'LOINC:', kind: 'text', w: 116, value: '93373-9' },
          { label: 'Perform By:', kind: 'text', w: 168 },
          { label: 'Report By:', kind: 'text', w: 168 },
          { label: 'Transcribed:', kind: 'text', w: 168 },
          { label: 'Collect By:', kind: 'text', w: 168, value: 'DUCHARME, AMARILYS' },
          { label: 'Collect Note:', kind: 'area', rows: 3, w: 320 },
        ],
        right: [
          { label: 'Facility:', kind: 'text', w: 186 },
          { label: 'Facility Loc.:', kind: 'text', w: 186 },
          { label: 'Facility Ref.:', kind: 'text', w: 186 },
          { label: 'Ord. Name:', kind: 'text', w: 186 },
          { label: 'Volume:', kind: 'text', w: 186 },
          { label: 'Category:', kind: 'text', w: 186, value: 'PSYCH' },
          { label: 'Specimen Src.:', kind: 'text', w: 186 },
        ],
      },
    },
    rail: true,
    footer: { source: 'SYSTEM', code: '-', sign: 'UNSIGNED' },
    /* the provenance line belongs to the selected record, which is row 0 */
    created: '2026.07.14  13:43  SKRECKY, JENNIFER',
  },

  allergy: {
    title: 'Reaction Risks',
    commands: [
      'New Record', 'Quick Entry', 'Delete Record', 'Save', 'Undo', 'Refresh',
      'Attachment', 'Review', 'No Known',
    ],
    disabled: DIS,
    banner: 'Reaction Risks have not been reviewed for this patient',
    columns: [
      { key: 'onset', header: 'Onset', width: 82, align: 'center' },
      { key: 'tilde', header: '~', width: 24, align: 'center' },
      { key: 'type', header: 'Type', width: 110, align: 'center' },
      /* Category is a tick, not a word — it is `str_is_drug` */
      { key: 'category', header: 'Category', width: 62, align: 'center', check: true },
      { key: 'code', header: 'Code', width: 70, align: 'center' },
      dots('d'),
      { key: 'agent', header: 'Agent' },
      { key: 'reactions', header: 'Reactions', width: 170 },
      { key: 'm', header: 'M', width: 22, align: 'center' },
      clip,
    ],
    rows: [
      { onset: '2026.07.22', tilde: '', type: 'DRUG ALLERGY', category: '', code: '02235092', agent: 'COUCH GRASS 1 X TABLET', reactions: 'MALAISE AND FATIGUE', m: '', clip: '-' },
      { onset: '2025.11.07', tilde: '', type: 'DRUG ALLERGY', category: '', code: '02471671', agent: 'AMOXICILLIN (AMOXICILLIN TRIHYDRATE) …', reactions: 'ALLERGIC URTICARIA', m: '', clip: '-' },
      { onset: '2025.05.13', tilde: '', type: 'DRUG ALLERGY', category: '', code: '02252716', agent: 'CIPROFLOXACIN (CIPROFLOXACIN HYDRO…', reactions: 'PRURITIC RASH', m: '', clip: '-' },
      { onset: '2024.08.08', tilde: '', type: 'DRUG ALLERGY', category: '', code: '00468029', agent: 'PENICILLIN V POTASSIUM 500000UNIT TAB…', reactions: 'ANAPHYLAXIS', m: '', clip: '-' },
      { onset: '2024.09.24', tilde: '', type: 'DRUG ALLERGY', category: '', code: '00636517', agent: 'IBUPROFEN 200 MG TABLET', reactions: 'RASH', m: '', clip: '-' },
      { onset: '2024.08.08', tilde: '', type: 'DRUG ALLERGY', category: '', code: '02365596', agent: 'ACETAMINOPHEN 1000MG DEXTROMETHO…', reactions: 'ABDOMINAL BLOATING', m: '', clip: '-' },
      { onset: '2024.08.08', tilde: '', type: 'DRUG ALLERGY', category: '', code: '02365596', agent: 'ACETAMINOPHEN 1000MG DEXTROMETHO…', reactions: 'ABDOMINAL BLOATING', m: '', clip: '-' },
      { onset: '2024.08.08', tilde: '', type: 'DRUG ALLERGY', category: '', code: '00468029', agent: 'PENICILLIN V POTASSIUM 500000UNIT TAB…', reactions: 'ANAPHYLAXIS', m: '', clip: '-' },
    ],
    tabs: ['Detail', 'Reactions', 'Linked Events'],
    /* evidence/MATRIX-R0652-onset, MATRIX-R0681-code (DEV v02.31.23): PB's
       fixed tabs, about 94px each with the caption centred — not sized to
       their captions */
    fixedTabs: true,
    createdLine: { modified: 'always', detailOnly: true },
    /* 2026-09-29 TRAINING capture (set 3) c04, chart 2429: the agent line
       under Type is led by its own Agent Category drop-down, then the code,
       its "…" and the agent; two rules part it from the four coded
       drop-downs and from Comment */
    painted: [
      { label: 'Date of Onset:', kind: 'date', x: 112.5, y: 11, w: 83, cap: { left: 11 } },
      { label: 'Type:', kind: 'combo', x: 112.5, y: 30, w: 155.5, cap: { left: 11 } },
      { label: 'Agent Category Selector', kind: 'combo', x: 11, y: 49, w: 98, cap: false, value: 'Agent Category:' },
      { label: 'Agent Code:', kind: 'text', x: 112.5, y: 49, w: 83, cap: false },
      { label: 'Agent lookup', kind: 'dots', x: 195.5, y: 49, w: 15, cap: false },
      { label: 'Agent:', kind: 'text', x: 211, y: 49, w: 320.5, cap: false },
      { label: 'Stop Date:', kind: 'date', x: 569, y: 11, w: 83, cap: { right: 562.5 } },
      { label: 'Agent Category:', kind: 'text', x: 569, y: 30, w: 204, cap: { right: 562.5 }, disabled: true },
      { label: 'rule 1', kind: 'rule', x: 0, y: 71.5, w: 1000, cap: false },
      { label: 'Risk Status:', kind: 'combo', x: 112.5, y: 81, w: 218, cap: { left: 11 } },
      { label: 'Certainty:', kind: 'combo', x: 112.5, y: 100, w: 218, cap: { left: 11 } },
      { label: 'Criticality:', kind: 'combo', x: 112.5, y: 119, w: 218, cap: { left: 11 } },
      { label: 'Severity:', kind: 'combo', x: 112.5, y: 138, w: 218, cap: { left: 11 } },
      { label: 'Phase at Onset:', kind: 'combo', x: 569, y: 81, w: 204, cap: { right: 562.5 } },
      { label: 'Informant:', kind: 'combo', x: 569, y: 100, w: 204, cap: { right: 562.5 } },
      { label: 'Observer:', kind: 'combo', x: 569, y: 119, w: 204, cap: { right: 562.5 } },
      { label: 'Documenter:', kind: 'combo', x: 569, y: 138, w: 204, cap: { right: 562.5 } },
      { label: 'rule 2', kind: 'rule', x: 0, y: 159.5, w: 1000, cap: false },
      { label: 'Comment:', kind: 'area', x: 87.5, y: 166.5, w: 686, h: 72, cap: { left: 11 } },
    ],
    /* evidence/MATRIX-R0660-paper-clip: the agent row spans both columns and a
       blank band separates it from the four coded dropdowns below */
    left: [
      { label: 'Date of Onset:', kind: 'date', w: 104, value: '2026.07.22' },
      { label: 'Type:', kind: 'text', w: 160, value: 'DRUG ALLERGY' },
      { label: 'Agent Category:', kind: 'text', w: 104, value: '02235092' },
      { kind: 'gap' },
      { label: 'Risk Status:', kind: 'text', w: 160 },
      { label: 'Certainty:', kind: 'text', w: 160 },
      { label: 'Criticality:', kind: 'text', w: 160 },
      { label: 'Severity:', kind: 'text', w: 160 },
      { label: 'Comment:', kind: 'area', rows: 4, w: 320 },
    ],
    right: [
      { label: 'Stop Date:', kind: 'date', w: 104 },
      { label: 'Agent Category:', kind: 'text', w: 186 },
      { kind: 'gap' },
      { kind: 'gap' },
      { label: 'Phase at Onset:', kind: 'text', w: 186 },
      { label: 'Informant:', kind: 'text', w: 186 },
      { label: 'Observer:', kind: 'text', w: 186 },
      { label: 'Documenter:', kind: 'text', w: 186 },
    ],
    created: '2026.07.22  09:00  (RN) ORMOND, SAMANTHA',
  },

  imaging: {
    title: 'Imaging Reports',
    commands: REPORT_CMDS, disabled: DIS,
    /* widths and alignment from MOIS DEV, evidence/MATRIX-R0537-test-name
       and imaging-empty-screen.png (1x); Performed and Status centred, the
       rest left */
    columns: [
      { key: 'performed', header: 'Performed', width: 66, align: 'center' },
      { key: 'by', header: 'Ordered By', width: 85 },
      /* DEV sizes this column too and its band stops after the clip, the
         grid's white body running on to the frame (imaging-empty-screen.png) */
      { key: 'test', header: 'Test Name', width: 251 },
      /* the Test Name "…" searches MEDICAL IMAGING (2026-09-29 TRAINING capture c11) */
      { ...dots('d'), width: 21, search: 'medical-imaging' },
      { key: 'region', header: 'Region', width: 61 },
      { key: 'laterality', header: 'Laterality', width: 58 },
      { key: 'modality', header: 'Modality', width: 47 },
      { key: 'contrast', header: 'Contrast', width: 45 },
      { key: 'status', header: 'Status', width: 39, align: 'center' },
      { key: 'm', header: 'M', width: 18, align: 'center' },
      { ...clip, width: 18 },
    ],
    /* evidence/MATRIX-R0568-facility-ref — one filed exam and two empty records */
    rows: [
      { performed: '2025.05.21', by: 'DR. TOPOGRAPHY', test: 'CAT SCAN - WHOLE BODY', region: 'FULL BODY', laterality: '', modality: 'IN PERSON', contrast: 'YES', status: 'C', m: '', clip: '1' },
      { performed: '', by: '', test: '', region: '', laterality: '', modality: '', contrast: '', status: '', m: '', clip: '-' },
      { performed: '', by: '', test: '', region: '', laterality: '', modality: '', contrast: '', status: '', m: '', clip: '1' },
    ],
    tabs: ['Report', 'Detail'],
    /* Report painted as MOIS DEV draws it, evidence/MATRIX-R0537-test-name
       (1x; boxes on the Detail tab's 19px pitch): Test Name, then Region ·
       Laterality · Flag and Modality · Contrast · Status three to a line, the
       Report body across the page; Order Date with Order # greyed beside it,
       Ordered By and Copies To on the right. With no record behind the
       current row the page is bare (imaging-empty-screen.png). */
    painted: [
      { label: 'Test Name:', kind: 'text', x: 68.5, y: 6, w: 280 },
      { label: 'Region:', kind: 'text', x: 68.5, y: 25, w: 71 },
      { label: 'Laterality:', kind: 'text', x: 192.5, y: 25, w: 71, cap: { right: 187.5 } },
      { label: 'Flag:', kind: 'text', x: 307, y: 25, w: 41, cap: { right: 302.5 } },
      { label: 'Modality:', kind: 'text', x: 68.5, y: 44, w: 71 },
      { label: 'Contrast:', kind: 'text', x: 192.5, y: 44, w: 71, cap: { right: 187.5 } },
      { label: 'Status:', kind: 'text', x: 307, y: 44, w: 41, cap: { right: 302.5 } },
      { label: 'Report:', kind: 'area', x: 68.5, y: 63, w: 579, h: 183 },
      { label: 'Order Date:', kind: 'date', x: 419.5, y: 6, w: 78, cap: { right: 414.5 } },
      { label: 'Order #:', kind: 'lookup', x: 567.5, y: 6, w: 80, cap: { right: 562.5 }, disabled: true },
      { label: 'Ordered By:', kind: 'text', x: 419.5, y: 25, w: 228, cap: { right: 414.5 } },
      { label: 'Copies To:', kind: 'text', x: 419.5, y: 44, w: 228, cap: { right: 414.5 } },
    ],
    /* Report — evidence/MATRIX-R0535-paper-clip */
    left: [
      { label: 'Test Name:', kind: 'text', w: 320, value: 'CAT SCAN - WHOLE BODY' },
      { label: 'Region:', kind: 'text', w: 150, value: 'FULL BODY' },
      { label: 'Laterality:', kind: 'text', w: 150 },
      { label: 'Flag:', kind: 'text', w: 64 },
      { label: 'Modality:', kind: 'text', w: 150, value: 'IN PERSON' },
      { label: 'Contrast:', kind: 'text', w: 150, value: 'YES' },
      { label: 'Status:', kind: 'text', w: 64, value: 'C' },
      { label: 'Report:', kind: 'area', rows: 8, w: '100%' },
    ],
    right: [
      { label: 'Order Date:', kind: 'date', w: 92 },
      { label: 'Order #:', kind: 'lookup', w: 130 },
      { label: 'Ordered By:', kind: 'text', w: 250, value: 'DR. TOPOGRAPHY' },
      { label: 'Copies To:', kind: 'text', w: 250 },
    ],
    forms: {
      /* evidence/MATRIX-R0568-facility-ref: only the facility trio is on the
         right; who performed, reported and transcribed stays on the left with
         its date beside it */
      Detail: {
        /* 2026-09-29 TRAINING capture c12 (chart 3924, a new record): every
           field on a 19px pitch, captions at the left margin or right-aligned
           before their box */
        painted: [
          { label: 'Test Name:', kind: 'text', x: 68.5, y: 6, w: 347 },
          { label: 'Region:', kind: 'text', x: 68.5, y: 25, w: 71 },
          { label: 'Laterality:', kind: 'text', x: 192.5, y: 25, w: 71, cap: { right: 187.5 } },
          { label: 'Flag:', kind: 'text', x: 307, y: 25, w: 41, cap: { right: 302.5 } },
          { label: 'Modality:', kind: 'text', x: 68.5, y: 44, w: 71 },
          { label: 'Contrast:', kind: 'text', x: 192.5, y: 44, w: 71, cap: { right: 187.5 } },
          { label: 'Status:', kind: 'text', x: 307, y: 44, w: 41, cap: { right: 302.5 } },
          { label: 'Perform By:', kind: 'text', x: 68.5, y: 63, w: 195 },
          { label: 'Date:', kind: 'date', x: 307, y: 63, w: 63, cap: { right: 302.5 } },
          { label: 'Perform Time', kind: 'time', x: 373.5, y: 63, w: 42, cap: false, value: ':' },
          { label: 'Report By:', kind: 'text', x: 68.5, y: 82, w: 195 },
          { label: 'Date:', kind: 'date', x: 307, y: 82, w: 63, cap: { right: 302.5 } },
          { label: 'Transcribed:', kind: 'text', x: 68.5, y: 101, w: 195 },
          { label: 'Date:', kind: 'date', x: 307, y: 101, w: 63, cap: { right: 302.5 } },
          { label: 'Transcribed Time', kind: 'time', x: 373.5, y: 101, w: 42, cap: false },
          { label: 'Exam Reasn:', kind: 'text', x: 68.5, y: 120, w: 347 },
          { label: 'Diag. Desc:', kind: 'lookup', x: 68.5, y: 139, w: 347 },
          { label: 'Key Word:', kind: 'area', x: 68.5, y: 158, w: 347, h: 43 },
          { label: 'Facility:', kind: 'text', x: 491.5, y: 6, w: 157, cap: { right: 487.5 } },
          { label: 'Facility Loc.:', kind: 'text', x: 491.5, y: 25, w: 157, cap: { right: 487.5 } },
          { label: 'Facility Ref.:', kind: 'text', x: 491.5, y: 44, w: 157, cap: { right: 487.5 } },
        ],
        left: [
          { label: 'Test Name:', kind: 'text', w: 320, value: 'CAT SCAN - WHOLE BODY' },
          { label: 'Region:', kind: 'text', w: 150, value: 'FULL BODY' },
          { label: 'Laterality:', kind: 'text', w: 150 },
          { label: 'Flag:', kind: 'text', w: 64 },
          { label: 'Modality:', kind: 'text', w: 150, value: 'IN PERSON' },
          { label: 'Contrast:', kind: 'text', w: 150, value: 'YES' },
          { label: 'Status:', kind: 'text', w: 64, value: 'C' },
          { label: 'Perform By:', kind: 'text', w: 180 },
          { label: 'Date:', kind: 'date', w: 92, time: true, value: '2025.05.21' },
          { label: 'Report By:', kind: 'text', w: 180 },
          { label: 'Date:', kind: 'date', w: 92 },
          { label: 'Transcribed:', kind: 'text', w: 180 },
          { label: 'Date:', kind: 'date', w: 92, time: true },
          { label: 'Exam Reasn:', kind: 'text', w: 320 },
          { label: 'Diag. Desc.:', kind: 'lookup', w: 320 },
          { label: 'Key Word:', kind: 'area', rows: 3, w: 320 },
        ],
        right: [
          { label: 'Facility:', kind: 'text', w: 180 },
          { label: 'Facility Loc.:', kind: 'text', w: 180 },
          { label: 'Facility Ref.:', kind: 'text', w: 180 },
        ],
      },
    },
    rail: true,
    footer: { source: 'SYSTEM', code: '-', sign: 'UNSIGNED' },
    created: '2024.09.27  09:47  KUMAR, PRAVEEN',
  },

  consults: {
    title: 'Consult Reports',
    commands: REPORT_CMDS, disabled: DIS,
    /* widths from MOIS DEV, evidence/MATRIX-R0579-reason (1x); Reason fills
       the rest, as it does there */
    columns: [
      { key: 'refer', header: 'Refer Date', width: 76, align: 'center' },
      { key: 'seen', header: 'Seen Date', width: 77, align: 'center' },
      { key: 'by', header: 'Referred By', width: 136 },
      { ...dots('d1'), width: 17 },
      { key: 'seenby', header: 'Seen By', width: 132 },
      dots('d2'),
      { key: 'reason', header: 'Reason for Consult Request' },
      /* the Reason "…" searches CONSULT REQUESTS (AIHS) (capture c13) */
      { ...dots('d3'), search: 'consult-requests' },
      { key: 's', header: 'S', width: 23, align: 'center', check: true },
      { key: 'm', header: 'M', width: 18, align: 'center' },
      { ...clip, width: 18 },
    ],
    rows: [
      { refer: '2025.06.01', seen: '2025.07.22', by: '', seenby: '', reason: '', s: '', m: '⇩', clip: '-' },
      { refer: '2025.05.21', seen: '2025.05.21', by: 'LUCKY', seenby: 'DR. LAD', reason: 'CHEST PAIN UNRESPONSIVE TO NITRO SL AND …', s: '', m: '', clip: '1' },
      { refer: '2026.05.05', seen: '', by: '(RN) GIESBRECHT, MARY', seenby: '', reason: '', s: '', m: '', clip: '-' },
    ],
    tabs: ['Report', 'Detail', 'Office Notes (0)'],
    fixedTabs: true,
    /* Report as the 2026-09-29 TRAINING capture c16 paints it (chart 2429):
       Reason with its "…", Seen By and its Date, a two-line Consultant's
       Diagnosis box with a "…" beside it, the Report body across the page;
       the order block on the right, Order # greyed */
    painted: [
      { label: 'Reason:', kind: 'lookup', x: 68.5, y: 6, w: 272, search: 'consult-requests' },
      { label: 'Seen By:', kind: 'text', x: 68.5, y: 25, w: 151 },
      { label: 'Date:', kind: 'date', x: 264.5, y: 25, w: 77, cap: { right: 259.5 } },
      { label: "Consultant's\nDiagnosis:", kind: 'area', x: 68.5, y: 44.5, w: 254, h: 35 },
      { label: "Consultant's Diagnosis lookup", kind: 'dots', x: 323.5, y: 44.5, w: 18, cap: false },
      { label: 'Report:', kind: 'area', x: 68.5, y: 82.5, w: 580, h: 164 },
      { label: 'Refer Date:', kind: 'date', x: 419.5, y: 6, w: 77, cap: { right: 414.5 } },
      { label: 'Order #:', kind: 'lookup', x: 559.5, y: 6, w: 88, cap: { right: 554.5 }, disabled: true },
      { label: 'Referred By:', kind: 'lookup', x: 419.5, y: 25, w: 228, cap: { right: 414.5 } },
      { label: 'Report By:', kind: 'text', x: 419.5, y: 44, w: 128, cap: { right: 414.5 } },
      { label: 'Date:', kind: 'date', x: 582.5, y: 44, w: 66, cap: { right: 577.5 } },
      { label: 'Copies To:', kind: 'lookup', x: 419.5, y: 63, w: 228, cap: { right: 414.5 } },
    ],
    /* Report — evidence/MATRIX-R0577-paper-clip */
    left: [
      { label: 'Reason:', kind: 'lookup' },
      { label: 'Seen By:', kind: 'text', w: 150 },
      { label: "Consultant's\nDiagnosis:", kind: 'lookup' },
      { label: 'Report:', kind: 'area', rows: 7, value: 'Bug testing 101' },
    ],
    right: [
      { label: 'Refer Date:', kind: 'date', w: 92, value: '2025.06.01' },
      { label: 'Order #:', kind: 'lookup', w: 130 },
      { label: 'Referred By:', kind: 'lookup', w: 200 },
      { label: 'Report By:', kind: 'text', w: 140 },
      { label: 'Date:', kind: 'date', w: 92 },
      { label: 'Copies To:', kind: 'lookup', w: 200, value: 'CALL CENTRE AGENT 1' },
    ],
    forms: {
      /* evidence/MATRIX-R0599-facility-ref */
      Detail: {
        /* painted as MOIS DEV draws it, evidence/MATRIX-R0590-reason (1x, a
           19px pitch): Reason with its "…", Report By and Transcribed each
           with a Date (Transcribed's time box beside it), the two-line
           Consultant's Diagnosis box and its "…", Key Word; the facility trio
           on the right */
        painted: [
          { label: 'Reason:', kind: 'lookup', x: 68.5, y: 6, w: 333, search: 'consult-requests' },
          { label: 'Report By:', kind: 'text', x: 68.5, y: 25, w: 151 },
          { label: 'Date:', kind: 'date', x: 269.5, y: 25, w: 88, cap: { right: 264.5 } },
          { label: 'Transcribed:', kind: 'text', x: 68.5, y: 44, w: 151 },
          { label: 'Date:', kind: 'date', x: 269.5, y: 44, w: 88, cap: { right: 264.5 } },
          { label: 'Transcribed Time', kind: 'time', x: 360.5, y: 44, w: 41, cap: false },
          { label: "Consultant's\nDiagnosis:", kind: 'area', x: 68.5, y: 63, w: 316, h: 35 },
          { label: "Consultant's Diagnosis lookup", kind: 'dots', x: 385.5, y: 63, w: 16, cap: false },
          { label: 'Key Word:', kind: 'area', x: 68.5, y: 101, w: 333, h: 43 },
          { label: 'Facility:', kind: 'text', x: 492.5, y: 6, w: 155, cap: { right: 487.5 } },
          { label: 'Facility Loc.:', kind: 'text', x: 492.5, y: 25, w: 155, cap: { right: 487.5 } },
          { label: 'Facility Ref.:', kind: 'text', x: 492.5, y: 44, w: 155, cap: { right: 487.5 } },
        ],
        left: [
          { label: 'Reason:', kind: 'lookup', w: 320 },
          { label: 'Report By:', kind: 'text', w: 168 },
          { label: 'Date:', kind: 'date', w: 92 },
          { label: 'Transcribed:', kind: 'text', w: 168 },
          { label: 'Date:', kind: 'date', w: 92, time: true },
          { label: "Consultant's\nDiagnosis:", kind: 'lookup', w: 320 },
          { label: 'Key Word:', kind: 'area', rows: 3, w: 320 },
        ],
        right: [
          { label: 'Facility:', kind: 'text', w: 180 },
          { label: 'Facility Loc.:', kind: 'text', w: 180 },
          { label: 'Facility Ref.:', kind: 'text', w: 180 },
        ],
      },
    },
    rail: true,
    footer: { source: 'SYSTEM', code: '-', sign: 'UNSIGNED' },
    created: '2024.08.01  09:48  STEPHENSON, TOM',
  },

  procedures: {
    title: 'Procedure',
    commands: REPORT_CMDS, disabled: DIS,
    /* widths from MOIS DEV, evidence/MATRIX-R0605-performed (1x) */
    columns: [
      { key: 'performed', header: 'Performed', width: 81, align: 'center' },
      { key: 'by', header: 'Performed By', width: 178, align: 'center' },
      /* DEV sizes this column too and its band stops after the clip, the
         grid's white body running on to the frame (MATRIX-R0605) */
      { key: 'desc', header: 'Description', width: 364 },
      dots('d'),
      { key: 'm', header: 'M', width: 18, align: 'center' },
      { ...clip, width: 18 },
    ],
    rows: [{ performed: '', by: '', desc: 'PHLEBOTOMY', m: '', clip: '-' }],
    tabs: ['Report', 'Detail'],
    /* Report painted as MOIS DEV draws it, evidence/MATRIX-R0611-description
       (1x, a 19px pitch): Description and Diag Desc. on the left; Order Date
       with Order # greyed, Ordered By, Report By with its Date, Copies To on
       the right; the Report body across the page under them */
    painted: [
      { label: 'Description:', kind: 'text', x: 68.5, y: 5, w: 273 },
      { label: 'Diag Desc.:', kind: 'lookup', x: 68.5, y: 24, w: 275 },
      { label: 'Report:', kind: 'area', x: 68.5, y: 81, w: 580, h: 165 },
      { label: 'Order Date:', kind: 'date', x: 419.5, y: 5, w: 93, cap: { right: 414.5 } },
      { label: 'Order #:', kind: 'lookup', x: 567.5, y: 5, w: 81, cap: { right: 562.5 }, disabled: true },
      { label: 'Ordered By:', kind: 'text', x: 419.5, y: 24, w: 229, cap: { right: 414.5 } },
      { label: 'Report By:', kind: 'text', x: 419.5, y: 43, w: 128, cap: { right: 414.5 } },
      { label: 'Date:', kind: 'date', x: 585.5, y: 43, w: 63, cap: { right: 580.5 } },
      { label: 'Copies To:', kind: 'text', x: 419.5, y: 62, w: 229, cap: { right: 414.5 } },
    ],
    /* Report — evidence/MATRIX-R0609-paper-clip */
    left: [
      { label: 'Description:', kind: 'text', w: 320, value: 'PHLEBOTOMY' },
      { label: 'Diag Desc.:', kind: 'lookup', w: 320 },
      { label: 'Report:', kind: 'area', rows: 8, w: '100%' },
    ],
    right: [
      { label: 'Order Date:', kind: 'date', w: 92 },
      { label: 'Order #:', kind: 'lookup', w: 130 },
      { label: 'Ordered By:', kind: 'text', w: 230 },
      { label: 'Report By:', kind: 'text', w: 150 },
      { label: 'Date:', kind: 'date', w: 92 },
      { label: 'Copies To:', kind: 'text', w: 230 },
    ],
    forms: {
      /* evidence/MATRIX-R0632-facility-ref */
      Detail: {
        /* painted as MOIS DEV draws it, evidence/MATRIX-R0621-description
           (1x, a 19px pitch): Perform By, Report By and Transcribed each with
           a Date — Perform By's and Transcribed's with a time box, Perform
           By's masked " : " — then Diag Desc. and Key Word; the facility
           trio on the right */
        painted: [
          { label: 'Description:', kind: 'text', x: 68.5, y: 6, w: 321 },
          { label: 'Perform By:', kind: 'text', x: 68.5, y: 25, w: 166 },
          { label: 'Date:', kind: 'date', x: 281.5, y: 25, w: 63, cap: { right: 276.5 } },
          { label: 'Perform Time', kind: 'time', x: 347.5, y: 25, w: 42, cap: false, value: ':' },
          { label: 'Report By:', kind: 'text', x: 68.5, y: 44, w: 166 },
          { label: 'Date:', kind: 'date', x: 281.5, y: 44, w: 63, cap: { right: 276.5 } },
          { label: 'Transcribed:', kind: 'text', x: 68.5, y: 63, w: 166 },
          { label: 'Date:', kind: 'date', x: 281.5, y: 63, w: 63, cap: { right: 276.5 } },
          { label: 'Transcribed Time', kind: 'time', x: 347.5, y: 63, w: 42, cap: false },
          { label: 'Diag Desc.:', kind: 'lookup', x: 68.5, y: 82, w: 321 },
          { label: 'Key Word:', kind: 'area', x: 68.5, y: 101, w: 321, h: 43 },
          { label: 'Facility:', kind: 'text', x: 471.5, y: 6, w: 176, cap: { right: 466.5 } },
          { label: 'Facility Loc.:', kind: 'text', x: 471.5, y: 25, w: 176, cap: { right: 466.5 } },
          { label: 'Facility Ref.:', kind: 'text', x: 471.5, y: 44, w: 176, cap: { right: 466.5 } },
        ],
        left: [
          { label: 'Description:', kind: 'text', w: 320, value: 'PHLEBOTOMY' },
          { label: 'Perform By:', kind: 'text', w: 168 },
          { label: 'Date:', kind: 'date', w: 92, time: true },
          { label: 'Report By:', kind: 'text', w: 168 },
          { label: 'Date:', kind: 'date', w: 92 },
          { label: 'Transcribed:', kind: 'text', w: 168 },
          { label: 'Date:', kind: 'date', w: 92, time: true },
          { label: 'Diag Desc.:', kind: 'lookup', w: 320 },
          { label: 'Key Word:', kind: 'area', rows: 3, w: 320 },
        ],
        right: [
          { label: 'Facility:', kind: 'text', w: 176 },
          { label: 'Facility Loc.:', kind: 'text', w: 176 },
          { label: 'Facility Ref.:', kind: 'text', w: 176 },
        ],
      },
    },
    rail: true,
    footer: { source: 'SYSTEM', code: '-', sign: 'UNSIGNED' },
    created: '2024.10.24  08:41  JANG, SEAN',
  },

  paper: {
    title: 'Paper Forms',
    commands: ['New Record', 'Delete Record', 'Save', 'Undo', 'Refresh', 'Print'],
    disabled: DIS,
    columns: [
      { key: 'date', header: 'Date', width: 84, align: 'center' },
      { key: 'author', header: 'Author', width: 110, align: 'center' },
      { key: 'type', header: 'Document Type', width: 120, align: 'center' },
      { key: 'form', header: 'Form Name' },
      { key: 's', header: 'S', width: 22, align: 'center' },
      { key: 'm', header: 'M', width: 22, align: 'center' },
      clip,
    ],
    rows: [
      { date: '2030.05.03', author: '', type: 'PAPER FORM', form: 'INTEGRATED PRIMARY COMMUNITY CARE SERVICE REQUEST', s: '', m: '⇩', clip: '1' },
      { date: '2028.12.27', author: '', type: 'PAPER FORM', form: 'CARE FACILITY ADMISSION CONSENT - MULTIPLE FACILITIES FORM', s: '', m: '⇩', clip: '1' },
      { date: '2028.12.06', author: '', type: 'PAPER FORM', form: 'INTENSIVE CASE MANAGEMENT TEAM (ICMT)', s: '', m: '⇩', clip: '1' },
      { date: '2027.08.26', author: '', type: 'PAPER FORM', form: 'CD HUB NOTIFICATION TOOL', s: '', m: '⇩', clip: '1' },
      { date: '2027.06.03', author: '', type: 'PAPER FORM', form: 'ROURKE BABY RECORD - FULL PACKAGE', s: '', m: '⇩', clip: '1' },
      { date: '2027.06.03', author: '', type: 'PAPER FORM', form: 'NH RAPID MOBILIZATION PLAN OF CARE', s: '', m: '⇩', clip: '1' },
      { date: '2027.06.03', author: 'PCIPT 2 RSW 2', type: 'PAPER FORM', form: 'COLUMBIA SUICIDE SEVERITY RATING SCALE SCREENER', s: '', m: '⇩', clip: '1' },
      { date: '2027.06.03', author: 'PCIPT 2 RSW 2', type: 'PAPER FORM', form: 'BRADEN RISK AND SKIN ASSESSMENT FLOWSHEET', s: '', m: '⇩', clip: '1' },
      { date: '2027.06.03', author: 'PCIPT 2 RSW 2', type: 'PAPER FORM', form: 'BRADEN Q SCALE (AGE-BIRTH TO 16 YEARS) FORM', s: '', m: '⇩', clip: '1' },
      { date: '2027.05.28', author: '', type: 'PAPER FORM', form: 'ROURKE BABY RECORD - FULL PACKAGE', s: '', m: '⇩', clip: '1' },
      { date: '2027.05.27', author: '', type: 'PAPER FORM', form: 'EDINBURGH POSTNATAL DEPRESSION SCALE (EPDS)SCREENING RESULTS', s: '', m: '⇩', clip: '1' },
    ],
    left: [
      { label: 'Note:', kind: 'text', w: 320, value: 'INTEGRATED PRIMARY COMMUNITY CARE SERVICE REQU' },
      { label: 'Attending:', kind: 'lookup', w: 320 },
      { label: 'Author:', kind: 'lookup', w: 320 },
      { label: 'Responsible Org.:', kind: 'lookup', w: 320, value: 'PCIPT 2 RSW 2' },
      { label: 'Transcribed:', kind: 'text', w: 168 },
      { label: 'Service Event:', kind: 'lookup', w: 320 },
      { label: 'Comment:', kind: 'area', rows: 6, w: 320 },
    ],
    right: [
      { label: 'Primary Recipient:', kind: 'lookup', w: 250 },
      { label: 'Copies To:', kind: 'lookup', w: 250 },
      { label: 'Facility:', kind: 'text', w: 250 },
      { label: 'Facility Ref.:', kind: 'text', w: 250 },
      { label: 'Facility Loc.:', kind: 'text', w: 250 },
    ],
    footer: { source: 'SYSTEM', sent: '2030.05.03', code: '11488-4 - Encounter Summary', sign: 'UNSIGNED' },
    created: '2026.07.20  13:38  (RN) AREMU, OMOTAYO',
  },
}

/* `Reaction Risks` is this window. (`Allergy / Intolerances` itself opens the
   folder summary, FolderSummaryView.tsx, per the 2026-09-29 TRAINING capture;
   the `allergy` key here is kept as the window's name.) The tree calls the child node
   `reaction`, and the shell checks `reportScreens` before `chartScreens`, so
   without this alias the child fell through to the column-only stub in
   `chartScreens.reaction` and rendered an empty grid with no review banner and
   no `No Known` command. */
reportScreens.reaction = reportScreens.allergy

/* ---------------------------------------------------------------------------
   The remaining Patient Chart windows. Most are the same shape as the report
   class minus the acknowledgement rail and the signature footer: a list, an
   optional tab set, and a detail form. `ClinicalReportView` renders them all.

   Grid columns come from the field audit (reference/field-audit.md); the
   layouts were transcribed from the evidence captures noted per entry.
   ------------------------------------------------------------------------ */

const SIMPLE = ['New Record', 'Delete Record', 'Save', 'Undo', 'Refresh', 'Attachment']

Object.assign(reportScreens, {
  /* tdt_admission — belongs to the report family, rail and all */
  admissions: {
    title: 'Facility Admissions',
    commands: ['New Record', 'Delete Record', 'Save', 'Undo', 'Refresh', 'Mark for Review', 'Print', 'Attachment'],
    disabled: DIS,
    /* widths and alignment from MOIS DEV, evidence/MATRIX-R1135-admitted
       (1x); the dates centred, Facility and
       Description left */
    columns: [
      { key: 'admitted', header: 'Admitted', width: 76, align: 'center' },
      { key: 'discharged', header: 'Discharged', width: 76, align: 'center' },
      { key: 'by', header: 'Admit By', width: 115 },
      { key: 'facility', header: 'Facility', width: 115 },
      /* DEV sizes this column too and its band stops after the clip
         (MATRIX-R1135) */
      { key: 'desc', header: 'Description', width: 272 },
      { ...dots('d'), width: 17 },
      { key: 'm', header: 'M', width: 18, align: 'center' },
      { ...clip, width: 18 },
    ],
    /* evidence/MATRIX-R1140-method — an empty record heads the list */
    rows: [
      { admitted: '', discharged: '', by: '', facility: '', desc: '', m: '', clip: '-' },
      { admitted: '2025.12.17', discharged: '', by: '', facility: 'MCONNELL ESTAT…', desc: 'ASSISTED LIVING', m: '', clip: '-' },
      { admitted: '2025.12.17', discharged: '', by: '', facility: 'TVL', desc: 'LONG TERM CARE FACILITIES (RESIDENTIAL CARE)', m: '', clip: '-' },
    ],
    tabs: ['Report', 'Detail'],
    /* Report painted as MOIS DEV draws it, evidence/MATRIX-R1143-description
       (1x, a 19px pitch): Description, Attending and Diag Desc. on the left,
       Admit Date, Admitted By and Copies To on the right, the Report body
       across the page */
    painted: [
      { label: 'Description:', kind: 'text', x: 68.5, y: 6, w: 273 },
      { label: 'Attending:', kind: 'text', x: 68.5, y: 25, w: 273 },
      { label: 'Diag Desc.:', kind: 'lookup', x: 68.5, y: 44, w: 273 },
      { label: 'Report:', kind: 'area', x: 68.5, y: 63, w: 580, h: 183 },
      { label: 'Admit Date:', kind: 'date', x: 419.5, y: 6, w: 77, cap: { right: 414.5 } },
      { label: 'Admitted By:', kind: 'text', x: 419.5, y: 25, w: 229, cap: { right: 414.5 } },
      { label: 'Copies To:', kind: 'text', x: 419.5, y: 44, w: 229, cap: { right: 414.5 } },
    ],
    /* Report — evidence/MATRIX-R1149-report */
    left: [
      { label: 'Description:', kind: 'text', w: 310, value: 'ASSISTED LIVING' },
      { label: 'Attending:', kind: 'text', w: 310 },
      { label: 'Diag Desc.:', kind: 'lookup', w: 310 },
      { label: 'Report:', kind: 'area', rows: 8, w: '100%' },
    ],
    right: [
      { label: 'Admit Date:', kind: 'date', w: 92, value: '2025.12.17' },
      { label: 'Admitted By:', kind: 'text', w: 230 },
      { label: 'Copies To:', kind: 'text', w: 230 },
    ],
    forms: {
      /* evidence/MATRIX-R1141-paper-clip */
      Detail: {
        /* painted as MOIS DEV draws it, evidence/MATRIX-R1151-description
           (1x): Transcribed (Date and time) above Report By (Date), then
           Diag Desc. and Key Word; the facility trio on the right sits 2px
           higher than the left column */
        painted: [
          { label: 'Description:', kind: 'text', x: 68.5, y: 6, w: 313 },
          { label: 'Transcribed:', kind: 'text', x: 68.5, y: 25, w: 151 },
          { label: 'Date:', kind: 'date', x: 272.5, y: 25, w: 66, cap: { right: 267.5 } },
          { label: 'Transcribed Time', kind: 'time', x: 341.5, y: 25, w: 40, cap: false },
          { label: 'Report By:', kind: 'text', x: 68.5, y: 44, w: 151 },
          { label: 'Date:', kind: 'date', x: 272.5, y: 44, w: 66, cap: { right: 267.5 } },
          { label: 'Diag Desc.:', kind: 'lookup', x: 68.5, y: 63, w: 313 },
          { label: 'Key Word:', kind: 'area', x: 68.5, y: 81, w: 313, h: 43 },
          { label: 'Facility:', kind: 'text', x: 471.5, y: 4, w: 176, cap: { right: 466.5 } },
          { label: 'Facility Loc.:', kind: 'text', x: 471.5, y: 23, w: 176, cap: { right: 466.5 } },
          { label: 'Facility Ref.:', kind: 'text', x: 471.5, y: 42, w: 176, cap: { right: 466.5 } },
        ],
        left: [
          { label: 'Description:', kind: 'text', w: 310, value: 'ASSISTED LIVING' },
          { label: 'Transcribed:', kind: 'text', w: 150 },
          { label: 'Date:', kind: 'date', w: 92, time: true },
          { label: 'Report By:', kind: 'text', w: 150 },
          { label: 'Date:', kind: 'date', w: 92 },
          { label: 'Diag Desc.:', kind: 'lookup', w: 310 },
          { label: 'Key Word:', kind: 'area', rows: 3, w: 310 },
        ],
        right: [
          { label: 'Facility:', kind: 'text', w: 176, value: 'MCONNELL ESTATES' },
          { label: 'Facility Loc.:', kind: 'text', w: 176 },
          { label: 'Facility Ref.:', kind: 'text', w: 176 },
        ],
      },
    },
    rail: true,
    footer: { source: 'SYSTEM', code: '-', sign: 'UNSIGNED' },
    created: '2025.10.24  10:23  CALLAHAN, CHARLOTTE',
  },

  /* tdt_document — the report window again, but its rail is greyed out and
     points at the linked record, and the grid carries a Link column.
     Transcribed from evidence/MATRIX-R0801-paper-clip.

     NOTE: this shadows `chartScreens.documents`, which the shell only reaches
     when `reportScreens` has no entry for the node. Delete that one. */
  documents: {
    title: 'Documents',
    commands: [
      'New Record', 'Delete Record', 'Save', 'Undo', 'Refresh',
      'Mark for Review', 'Link to Order', 'Print', 'Distribute',
    ],
    disabled: DIS,
    /* widths from MOIS DEV, evidence/MATRIX-R0792-date (1x); Note fills the
       rest, as it does there */
    columns: [
      { key: 'date', header: 'Date', width: 67, align: 'center' },
      { key: 'author', header: 'Author', width: 91 },
      { ...dots('d'), width: 19 },
      { key: 'type', header: 'Document Type', width: 116 },
      { key: 'note', header: 'Note' },
      { key: 's', header: 'S', width: 22, align: 'center', check: true },
      { key: 'm', header: 'M', width: 19, align: 'center' },
      { key: 'link', header: 'Link', width: 28, align: 'center' },
      { ...clip, width: 17 },
    ],
    rows: [
      { date: '2030.05.03', author: '', type: 'PAPER FORM', note: 'INTEGRATED PRIMARY COMMUNITY CARE SERVICE REQUEST', s: '✓', m: '⇩', link: '↷', clip: '-' },
      { date: '2030.05.02', author: '', type: 'ENCOUNTER', note: 'LTTCM MEETING', s: '', m: '⇩', link: '↷', clip: '1' },
      { date: '2030.04.26', author: '', type: 'ENCOUNTER', note: '', s: '', m: '⇩', link: '↷', clip: '1' },
      { date: '2028.12.27', author: '(RN) THOMPSO…', type: 'CONSULTATION', note: 'CODE WHITE DRILL', s: '', m: '⇩', link: '↷', clip: '1' },
      { date: '2028.12.27', author: 'ENGEN, RACHE…', type: 'CONSULTATION', note: 'CODE WHITE DRILL', s: '', m: '⇩', link: '↷', clip: '1' },
      { date: '2028.12.27', author: '', type: 'ENCOUNTER', note: 'CODE WHITE DRILL', s: '', m: '⇩', link: '↷', clip: '1' },
      { date: '2028.12.27', author: '', type: 'ENCOUNTER', note: 'CODE WHITE DRILL', s: '', m: '⇩', link: '↷', clip: '1' },
      { date: '2028.12.27', author: '', type: 'ENCOUNTER', note: 'CODE WHITE DRILL', s: '', m: '⇩', link: '↷', clip: '1' },
    ],
    tabs: ['Report', 'Distribution (0)'],
    hideLinked: true,
    /* 2026-09-29 TRAINING capture (set 3) c31, chart 2429: a 20px pitch, the
       coded right-hand fields drop-downs, Order # greyed with its "…",
       Transcribed three boxes, Comment across both columns */
    painted: [
      { label: 'Note:', kind: 'text', x: 91.5, y: 5, w: 280 },
      { label: 'Order #:', kind: 'lookup', x: 548.5, y: 5, w: 98.5, cap: { right: 544.5 }, disabled: true },
      { label: 'Attending:', kind: 'lookup', x: 91.5, y: 25, w: 280 },
      { label: 'Source Venue:', kind: 'combo', x: 455.5, y: 25, w: 192, cap: { right: 450.5 } },
      { label: 'Author:', kind: 'lookup', x: 91.5, y: 45, w: 280 },
      { label: 'Author Type:', kind: 'combo', x: 455.5, y: 45, w: 192, cap: { right: 450.5 } },
      { label: 'Responsible Org.:', kind: 'lookup', x: 91.5, y: 65, w: 280 },
      { label: 'Author Role:', kind: 'combo', x: 455.5, y: 65, w: 192, cap: { right: 450.5 } },
      { label: 'Recipient:', kind: 'lookup', x: 91.5, y: 85, w: 280 },
      { label: 'Facility:', kind: 'text', x: 455.5, y: 85, w: 191.5, cap: { right: 450.5 } },
      { label: 'Copies To:', kind: 'lookup', x: 91.5, y: 104.5, w: 280 },
      { label: 'Facility Ref.:', kind: 'text', x: 455.5, y: 104.5, w: 191.5, cap: { right: 450.5 } },
      { label: 'Transcribed:', kind: 'text', x: 91.5, y: 124.5, w: 162 },
      { label: 'Transcribed Date', kind: 'date', x: 256.5, y: 124.5, w: 72, cap: false },
      { label: 'Transcribed Time', kind: 'time', x: 330.5, y: 124.5, w: 41, cap: false },
      { label: 'Facility Loc.:', kind: 'text', x: 455.5, y: 124.5, w: 191.5, cap: { right: 450.5 } },
      { label: 'Service Event:', kind: 'lookup', x: 91.5, y: 144.5, w: 280 },
      { label: 'Comment:', kind: 'area', x: 91.5, y: 164.5, w: 555.5, h: 88.5 },
    ],
    left: [
      { label: 'Note:', kind: 'text', w: 320, value: 'INTEGRATED PRIMARY COMMUNITY CARE SERVIC…' },
      { label: 'Attending:', kind: 'lookup', w: 320 },
      { label: 'Author:', kind: 'lookup', w: 320 },
      { label: 'Responsible Org.:', kind: 'lookup', w: 320, value: 'PCIPT 2 RSW 2' },
      { label: 'Recipient:', kind: 'lookup', w: 320 },
      { label: 'Copies To:', kind: 'lookup', w: 320 },
      { label: 'Transcribed:', kind: 'text', w: 168 },
      { label: 'Service Event:', kind: 'lookup', w: 320 },
      { label: 'Comment:', kind: 'area', rows: 4, w: 320 },
    ],
    right: [
      { label: 'Order #:', kind: 'lookup', w: 200 },
      { label: 'Source Venue:', kind: 'text', w: 200 },
      { label: 'Author Type:', kind: 'text', w: 200 },
      { label: 'Author Role:', kind: 'text', w: 200 },
      { label: 'Facility:', kind: 'text', w: 200 },
      { label: 'Facility Ref.:', kind: 'text', w: 200 },
      { label: 'Facility Loc.:', kind: 'text', w: 200 },
    ],
    rail: true,
    footer: { source: 'SYSTEM', sent: '2030.05.03', code: '11488-4 - Encounter Summary', sign: 'UNSIGNED' },
    created: '2026.07.20  13:38  (RN) AREMU, OMOTAYO',
  },

  /* tdt_intervention — list over a bare comment box */
  interventions: {
    title: 'Intervention',
    commands: SIMPLE, disabled: DIS, plain: true,
    /* widths and alignment from MOIS DEV, evidence/MATRIX-R0634-date (1x):
       Performed By left-aligned */
    columns: [
      { key: 'date', header: 'Date', width: 80, align: 'center' },
      { ...dots('d1'), width: 18 },
      { key: 'by', header: 'Performed By', width: 144 },
      /* DEV sizes this column too and its band stops after the clip
         (MATRIX-R0634) */
      { key: 'desc', header: 'Description', width: 342 },
      dots('d2'),
      { key: 'declined', header: 'Declined', width: 64, align: 'center', check: true },
      { key: 'notind', header: 'Not Indicated', width: 76, align: 'center', check: true },
      { key: 'm', header: 'M', width: 18, align: 'center' },
      { ...clip, width: 18 },
    ],
    rows: [
      { date: '2025.02.26', by: '(RN) FLYNN, DEREK', desc: 'EYE CARE MANAGEMENT', m: '⇩', clip: '-' },
      { date: '2025.02.26', by: '(RN) FLYNN, DEREK', desc: 'FOOT CARE MANAGEMENT', m: '⇩', clip: '-' },
      { date: '2025.02.26', by: '(RN) FLYNN, DEREK', desc: 'MEDICATION REVIEW DONE BY NURSE', m: '', clip: '-' },
    ],
    left: [{ label: 'Comment:', kind: 'area', rows: 7, w: '100%', value: 'Saw last year.' }],
    right: [],
    /* set 3 c02: the Family Hx layout — caption at the margin, one wide box.
       The caption sits 88px before the box, as MOIS DEV prints it on Family
       Hx and Social History (evidence/MATRIX-R0645-relationship,
       MATRIX-R0784-start). NOTE: DEV's Intervention box itself starts 24px
       further left (x 73, 730 wide, caption 65px before it,
       evidence/MATRIX-R0634-date); c02's geometry is kept. */
    painted: [{ label: 'Comment:', kind: 'area', x: 97, y: 8, w: 690, h: 115, cap: { left: 9 } }],
    /* evidence/MATRIX-R0634-date: Last Modified on a modified record */
    createdLine: { modified: 'when-set' },
    created: '2025.02.26  13:59  (RN) FLYNN, DEREK',
  },

  /* tdt_family_hx — the Relationship column is an in-cell DDDW */
  famhx: {
    title: 'Family Hx',
    commands: SIMPLE, disabled: DIS, plain: true,
    columns: [
      /* widths read off the 2026-09-29 TRAINING capture c15 */
      { key: 'chart', header: 'Chart', width: 65, align: 'center' },
      dots('d1'),
      /* MOIS DEV, evidence/MATRIX-R0645-relationship (1x): Name and
         Relationship left-aligned */
      { key: 'name', header: 'Name', width: 152 },
      /* the current row's Relationship is an in-cell drop-down headed
         "Relationship" (evidence/MATRIX-R0645-relationship). The capture
         shows the list's first sixteen entries and a scroll bar; what
         follows Granddaughter is not captured, so the list stops there. */
      {
        key: 'relationship', header: 'Relationship', width: 115,
        ddw: {
          header: 'Relationship', listW: 132,
          options: [
            'Father', 'Mother', 'Mat. Grandfather', 'Pat. Grandfather', 'Mat. Grandmother', 'Pat. Grandmother',
            'Uncle', 'Aunt', 'Brother', 'Sister', 'Wife', 'Husband', 'Son', 'Daughter', 'Grandson', 'Granddaughter',
          ],
        },
      },
      /* DEV sizes this column too and its band stops after the clip
         (MATRIX-R0643) */
      { key: 'condition', header: 'Condition', width: 298 },
      { ...dots('d2'), width: 19 },
      { key: 'm', header: 'M', width: 18, align: 'center' },
      { ...clip, width: 18 },
    ],
    /* evidence/MATRIX-R0649-comment */
    rows: [
      { chart: '', name: '', relationship: 'PARENT', condition: 'CARDIOMYOPATHY', m: '', clip: '-' },
      { chart: '', name: 'FAKE AARON', relationship: 'Father', condition: 'TYPE 1 DIABETES MELLITUS', m: '', clip: '-' },
      { chart: '', name: '', relationship: '', condition: '', m: '', clip: '-' },
      { chart: '', name: '', relationship: 'PARENT', condition: '', m: '', clip: '-' },
      { chart: '', name: '', relationship: 'Father', condition: 'CARDIAC ARREST', m: '', clip: '-' },
    ],
    left: [{ label: 'Comment:', kind: 'area', rows: 6, w: '100%' }],
    right: [],
    /* c15: the caption at the left margin, one wide box under the grid; the
       caption 88px before the box (MOIS DEV evidence/MATRIX-R0645-relationship) */
    painted: [{ label: 'Comment:', kind: 'area', x: 97, y: 8, w: 690, h: 115, cap: { left: 9 } }],
    createdLine: { modified: 'when-set' },
    created: '2025.05.07  13:53  MCKENZIE, KRISTEN',
  },

  /* tdt_alert */
  alerts: {
    title: 'Alert',
    commands: SIMPLE, disabled: DIS, plain: true,
    /* widths and alignment from MOIS DEV, evidence/MATRIX-R1234-start (1x):
       Code left-aligned */
    columns: [
      { key: 'start', header: 'Start', width: 78, align: 'center' },
      { key: 'end', header: 'End', width: 78, align: 'center' },
      { key: 'code', header: 'Code', width: 72 },
      { ...dots('d'), width: 17 },
      { key: 'desc', header: 'Description', width: 217 },
      /* DEV sizes this column too and its band stops after the clip
         (MATRIX-R1234) */
      { key: 'detail', header: 'Detail', width: 251 },
      { key: 's', header: 'S', width: 28, align: 'center', check: true },
      { key: 'm', header: 'M', width: 18, align: 'center' },
      { ...clip, width: 18 },
    ],
    rows: [
      { start: '', end: '', code: '', desc: 'MAIL', detail: '', m: '', clip: '1' },
      { start: '', end: '', code: 'PHONE2', desc: 'MESSAGE LEFT TO CALL', detail: 'GR 6 immunization', m: '⇩', clip: '-' },
      { start: '', end: '', code: 'PHONE2', desc: 'MESSAGE LEFT TO CALL', detail: '', m: '', clip: '-' },
      { start: '2025.11.06', end: '', code: 'GEN3', desc: 'IMMUNIZATION REQUEST', detail: 'needs mmr', m: '', clip: '-' },
      { start: '2025.10.02', end: '', code: '', desc: 'NO MSP COVERAGE', detail: '', m: '', clip: '-' },
      { start: '2025.09.25', end: '', code: 'PHONE2', desc: 'MESSAGE LEFT TO CALL', detail: '', m: '⇩', clip: '-' },
      { start: '2025.01.23', end: '', code: 'PHONE2', desc: 'MESSAGE LEFT TO CALL', detail: 'GR 6 IMMS', m: '⇩', clip: '1' },
      { start: '2025.01.20', end: '', code: 'PHONE1', desc: 'PHONE CALL UNABLE TO CONTACT', detail: '', m: '', clip: '-' },
      { start: '2024.12.13', end: '', code: 'PHONE3', desc: 'CLIENT CONTACTED APPOINTMENT B…', detail: 'Booked appointment', m: '', clip: '-' },
      { start: '2024.07.31', end: '', code: 'GEN1', desc: 'IMMUNIZATION INFORMATION SENT O…', detail: 'RECORDS MAILED', m: '', clip: '-' },
    ],
    left: [
      { label: 'Detail:', kind: 'text', w: '100%', value: 'needs mmr' },
      { label: 'Sensitive:', kind: 'check', value: 'Yes' },
      { label: 'Comment:', kind: 'area', rows: 6, w: '100%' },
    ],
    right: [],
    /* painted as MOIS DEV draws it, evidence/MATRIX-R1234-start and
       R1243-detail (1x): Detail across the page, the Sensitive tick with its
       "Yes" under it, the Comment box below; every caption 8px in */
    painted: [
      { label: 'Detail:', kind: 'text', x: 101, y: 8, w: 699, cap: { left: 8 } },
      { label: 'Sensitive:', kind: 'check', x: 128, y: 31, w: 40, value: 'Yes', cap: { left: 8 } },
      { label: 'Comment:', kind: 'area', x: 101, y: 50, w: 699, h: 115, cap: { left: 8 } },
    ],
    /* the page is 40px deeper than Family Hx's, as DEV's is (R1234-start:
       Detail page 174 tall against Family Hx's 134, R0645-relationship), so
       the grid gives that back */
    gridHeight: 356,
    /* R1234-start: Last Modified 348px after Created on a modified alert */
    createdLine: { modified: 'when-set' },
    created: '2025.11.06  09:26  BLANCO, ELYN',
  },

  /* tdt_health_issue — Conditions */
  conditions: {
    title: 'Condition',
    commands: [...SIMPLE, 'Review', 'No Known'], disabled: DIS, plain: true,
    banner: 'Health Conditions have not been reviewed for this patient',
    columns: [
      { key: 'start', header: 'Start', width: 82, align: 'center' },
      { key: 'end', header: 'End', width: 78, align: 'center' },
      { key: 'problem', header: 'Problem Name' },
      dots('d'),
      { key: 'rank', header: 'Rank', width: 52, align: 'center' },
      { key: 'certainty', header: 'Certainty', width: 88, align: 'center' },
      { key: 'severity', header: 'Severity', width: 88, align: 'center' },
      { key: 's', header: 'S', width: 22, align: 'center', check: true },
      { key: 'm', header: 'M', width: 22, align: 'center' },
      clip,
    ],
    rows: [
      { start: '', end: '', problem: '', rank: '-', certainty: '', severity: '', m: '', clip: '2' },
      { start: '2025.08.08', end: '', problem: '', rank: '-', certainty: '', severity: '', m: '', clip: '1' },
      { start: '2026.02.13', end: '', problem: 'ASTHMA', rank: '-', certainty: '', severity: '', m: '', clip: '-' },
      { start: '2024.08.08', end: '', problem: 'ASTHMA', rank: '-', certainty: 'Confirmed', severity: 'High', m: '', clip: '1' },
      { start: '2024.08.08', end: '', problem: 'ASTHMA', rank: '-', certainty: 'Confirmed', severity: 'High', m: '', clip: '1' },
      { start: '', end: '', problem: 'ATRIAL FLUTTER', rank: '-', certainty: '', severity: '', m: '', clip: '1' },
      { start: '2026.02.14', end: '', problem: 'ATRIAL FLUTTER 2 CUPID', rank: '-', certainty: '', severity: '', m: '', clip: '-' },
      { start: '2026.01.22', end: '', problem: 'BLOOD IN STOOL - OCCULT', rank: '-', certainty: 'Confirmed', severity: 'Moderate', m: '', clip: '-' },
      { start: '2026.06.10', end: '', problem: 'DEVELOPMENTALLY DISABLED', rank: '-', certainty: '', severity: '', m: '', clip: '-' },
    ],
    tabs: ['Detail', 'Linked Goals', 'Medications', 'Rx History'],
    fixedTabs: true,
    /* set 3 c34, chart 2429 */
    painted: [
      { label: 'Problem Name:', kind: 'lookup', x: 100.5, y: 12, w: 347, cap: { left: 11 } },
      { label: 'Severity System:', kind: 'combo', x: 612, y: 12, w: 176, cap: { right: 604.5 } },
      { label: 'Severity Code:', kind: 'combo', x: 612, y: 31, w: 176, cap: { right: 604.5 } },
      { label: 'Source:', kind: 'combo', x: 100.5, y: 50, w: 182, cap: { left: 11 } },
      { label: 'Comment:', kind: 'area', x: 100.5, y: 69, w: 688, h: 165, cap: { left: 11 } },
    ],
    /* evidence/MATRIX-R0833-paper-clip: a blank band sits under Problem Name */
    left: [
      { label: 'Problem Name:', kind: 'lookup', w: '100%', value: 'ASTHMA' },
      { kind: 'gap' },
      { label: 'Source:', kind: 'text', w: 176 },
      { label: 'Comment:', kind: 'area', rows: 7, w: '100%' },
    ],
    right: [
      { label: 'Severity System:', kind: 'text', w: 176 },
      { label: 'Severity Code:', kind: 'text', w: 176 },
    ],
    created: '2026.02.13  06:39  WASHINGTON, ALYSSA',
  },

  /* tdt_social_hx — one free-text Description per record, not a topic/value
     pair; evidence/MATRIX-R0790-comment */
  socialhx: {
    title: 'Social History',
    commands: SIMPLE, disabled: DIS, plain: true,
    /* widths from MOIS DEV, evidence/MATRIX-R0784-start (1x) */
    columns: [
      { key: 'start', header: 'Start', width: 76, align: 'center' },
      { key: 'end', header: 'End', width: 77, align: 'center' },
      /* DEV sizes this column too and its band stops after the clip
         (MATRIX-R0784) */
      { key: 'desc', header: 'Description', width: 543 },
      { ...dots('d'), width: 17 },
      { key: 's', header: 'S', width: 28, align: 'center', check: true },
      { key: 'm', header: 'M', width: 18, align: 'center' },
      { ...clip, width: 18 },
    ],
    rows: [
      { start: '', end: '', desc: '', s: '', m: '', clip: '-' },
      { start: '2025.02.13', end: '', desc: 'NEWCOMER', s: '✓', m: '', clip: '-' },
    ],
    left: [{ label: 'Comment:', kind: 'area', rows: 7, w: '100%' }],
    right: [],
    /* set 3 c29; the caption 88px before the box (MOIS DEV
       evidence/MATRIX-R0784-start) */
    painted: [{ label: 'Comment:', kind: 'area', x: 97, y: 8, w: 690, h: 115, cap: { left: 9 } }],
    createdLine: { modified: 'when-set' },
    created: '2025.02.13  07:41  WARKENTIN, LISA',
  },


  /* evidence/MATRIX-R0991-start (DEV v02.31.23, 100%): the view header is
     singular, "Barrier to Care" (the tree node is plural), and the grid is
     Start 70 · End 71 · Barrier to Care 550 · S 32 · M 30 · paperclip 20 —
     no "…" column */
  barriers: {
    title: 'Barrier to Care',
    commands: SIMPLE, disabled: DIS, plain: true,
    columns: [
      { key: 'start', header: 'Start', width: 70, align: 'center' },
      { key: 'end', header: 'End', width: 71, align: 'center' },
      { key: 'barrier', header: 'Barrier to Care', width: 550 },
      { key: 's', header: 'S', width: 32, align: 'center', check: true },
      { key: 'm', header: 'M', width: 30, align: 'center' },
      { ...clip, width: 20 },
    ],
    rows: [],
    tabs: ['Detail'],
    left: [
      { label: 'Barrier:', kind: 'lookup', w: '100%' },
      { label: 'Comment:', kind: 'area', rows: 6, w: '100%' },
    ],
    right: [],
    created: '2026.08.12  09:00  JALIL, AHMAD',
  },

  /* evidence/MATRIX-R1000-start: the column is "Patient Resource", and the
     grid is Barrier to Care's geometry (70 · 71 · 550 · 32 · 30 · 20) */
  resources: {
    title: 'Patient Resources',
    commands: SIMPLE, disabled: DIS, plain: true,
    columns: [
      { key: 'start', header: 'Start', width: 70, align: 'center' },
      { key: 'end', header: 'End', width: 71, align: 'center' },
      { key: 'resource', header: 'Patient Resource', width: 550 },
      { key: 's', header: 'S', width: 32, align: 'center', check: true },
      { key: 'm', header: 'M', width: 30, align: 'center' },
      { ...clip, width: 20 },
    ],
    rows: [],
    tabs: ['Detail'],
    left: [
      { label: 'Resource:', kind: 'lookup', w: '100%' },
      { label: 'Note:', kind: 'area', rows: 6, w: '100%' },
    ],
    right: [],
    created: '2026.08.12  09:00  JALIL, AHMAD',
  },

  prefs: {
    title: 'Preferences',
    commands: ['New Record', 'Quick Entry', 'Delete Record', 'Save', 'Undo', 'Refresh', 'Attachment'], plain: true,
    columns: [
      { key: 'start', header: 'Start', width: 67, align: 'center' },
      { key: 'type', header: <>Type<br /><span style={{ color: '#909090' }}>(read-only)</span></>, width: 124 },
      { key: 'subject', header: 'Subject', width: 89 },
      { key: 'detail', header: 'Detail', width: 229 },
      { key: 'instruction', header: <>Instruction<br /><span style={{ color: '#909090' }}>(read-only)</span></>, width: 166 },
      { key: 's', header: 'S', width: 23, align: 'center', check: true },
      { key: 'demo', header: <>Show on<br />Demo.</>, width: 50, align: 'center', check: true },
      { key: 'clip', header: '📎', width: 20, align: 'center' },
    ],
    rows: [],
    tabs: ['Detail'],
    left: [
      { label: 'Subject:', kind: 'lookup', w: '100%' },
      { label: 'Subject Detail:', kind: 'text', w: '100%' },
      { label: 'Instruction:', kind: 'area', rows: 4, w: '100%' },
      { label: 'Reason:', kind: 'lookup', w: '100%' },
    ],
    right: [
      { label: 'Start Date:', kind: 'date', w: 104 },
      { label: 'Form:', kind: 'text', w: 176 },
      { label: 'By:', kind: 'text', w: 176 },
    ],
    created: '2026.08.12  09:00  JALIL, AHMAD',
  },

  /* Adverse Events — 303212 `268301a3…png` (v02.20.04): the command row, the
     Onset / Agents / Reactions / M / clip grid and the five tabs. Only the
     Recommendations tab is captured open (ClinicalReportView draws it from
     AllergyWindows' RecommendationsPane); Agents and Reactions list the
     event's adverse_agent / reaction_event rows and Linked Reaction Risks its
     adverse_link rows. The Detail tab's layout is not captured, so it carries
     only the event's own dated fields. */
  events: {
    title: 'Adverse Events',
    commands: [
      'New Record', 'New AEFI', 'Edit AEFI', 'Delete Record', 'Save', 'Undo',
      'Refresh', 'Attachment', 'Elevate To Risk',
    ],
    /* not plain: evidence/MATRIX-R0689-onset and R0695-onset (DEV v02.31.23)
       print "Last Modified:" after Created on the event's footer line */
    disabled: DIS,
    columns: [
      { key: 'onset', header: 'Onset', width: 88, align: 'center' },
      { key: 'agents', header: 'Agents', width: 340 },
      { key: 'reactions', header: 'Reactions' },
      { key: 'm', header: 'M', width: 22, align: 'center' },
      clip,
    ],
    rows: [],
    tabs: ['Detail', 'Agents', 'Reactions', 'Recommendations', 'Linked Reaction Risks'],
    /* set 3 c13–c18: fixed 138px tabs, the strip 22px higher than the other
       folders' so Recommendations' form fits. DEV agrees: the captions are
       centred 140px apart (evidence/MATRIX-R0689-onset, R0695-onset) */
    fixedTabs: true,
    tabWidth: 138,
    createdLine: { modified: 'always', detailOnly: true },
    gridHeight: 222,
    left: [
      { label: 'Onset Date:', kind: 'date', w: 92, value: '' },
      { label: 'Report Type:', kind: 'text', w: 160 },
      { label: 'Severity:', kind: 'text', w: 220 },
    ],
    right: [
      { label: 'Intolerance Type:', kind: 'text', w: 160 },
    ],
    created: '',
  },
})
