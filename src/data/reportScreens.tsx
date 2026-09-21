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

/** one tab's two-column detail form */
export type ReportForm = { left: ReportField[]; right: ReportField[] }

export type ReportScreen = {
  title: string
  commands: (string | null)[]
  disabled?: string[]
  columns: { key: string; header: string; auditId?: string; width?: number; align?: 'left' | 'center' | 'right'; dots?: boolean; check?: boolean }[]
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
const DIS = ['Save', 'Undo']
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
    viewSelect: ['List View', 'Panel View', 'Graph View'],
    flagKey: 'flag',
    columns: [
      { key: 'collected', auditId: 'MATRIX-R0480-collected', header: 'Collected', width: 82, align: 'center' },
      { key: 'by', auditId: 'MATRIX-R0481-ordered-by', header: 'Ordered By', width: 128 },
      { key: 'code', auditId: 'MATRIX-R0482-code', header: 'Code', width: 60, align: 'center' },
      dots('d'),
      { key: 'test', auditId: 'MATRIX-R0483-test-name', header: 'Test Name' },
      { key: 'value', auditId: 'MATRIX-R0484-value', header: 'Value', width: 92, align: 'center' },
      { key: 'flag', auditId: 'MATRIX-R0485-flag', header: 'Flag', width: 52, align: 'center' },
      { key: 'units', auditId: 'MATRIX-R0486-units', header: 'Units', width: 62, align: 'center' },
      { key: 'status', auditId: 'MATRIX-R0487-status', header: 'Status', width: 52, align: 'center' },
      clip,
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
    columns: [
      { key: 'performed', header: 'Performed', width: 78, align: 'center' },
      { key: 'by', header: 'Ordered By', width: 96, align: 'center' },
      { key: 'test', header: 'Test Name' },
      dots('d'),
      { key: 'region', header: 'Region', width: 72, align: 'center' },
      { key: 'laterality', header: 'Laterality', width: 68, align: 'center' },
      { key: 'modality', header: 'Modality', width: 62, align: 'center' },
      { key: 'contrast', header: 'Contrast', width: 60, align: 'center' },
      { key: 'status', header: 'Status', width: 54, align: 'center' },
      { key: 'm', header: 'M', width: 22, align: 'center' },
      clip,
    ],
    /* evidence/MATRIX-R0568-facility-ref — one filed exam and two empty records */
    rows: [
      { performed: '2025.05.21', by: 'DR. TOPOGRAPHY', test: 'CAT SCAN - WHOLE BODY', region: 'FULL BODY', laterality: '', modality: 'IN PERSON', contrast: 'YES', status: 'C', m: '', clip: '1' },
      { performed: '', by: '', test: '', region: '', laterality: '', modality: '', contrast: '', status: '', m: '', clip: '-' },
      { performed: '', by: '', test: '', region: '', laterality: '', modality: '', contrast: '', status: '', m: '', clip: '1' },
    ],
    tabs: ['Report', 'Detail'],
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
    columns: [
      { key: 'refer', header: 'Refer Date', width: 82, align: 'center' },
      { key: 'seen', header: 'Seen Date', width: 82, align: 'center' },
      { key: 'by', header: 'Referred By', width: 140 },
      dots('d1'),
      { key: 'seenby', header: 'Seen By', width: 150 },
      dots('d2'),
      { key: 'reason', header: 'Reason for Consult Request' },
      dots('d3'),
      { key: 's', header: 'S', width: 22, align: 'center', check: true },
      { key: 'm', header: 'M', width: 22, align: 'center' },
      clip,
    ],
    rows: [
      { refer: '2025.06.01', seen: '2025.07.22', by: '', seenby: '', reason: '', s: '', m: '⇩', clip: '-' },
      { refer: '2025.05.21', seen: '2025.05.21', by: 'LUCKY', seenby: 'DR. LAD', reason: 'CHEST PAIN UNRESPONSIVE TO NITRO SL AND …', s: '', m: '', clip: '1' },
      { refer: '2026.05.05', seen: '', by: '(RN) GIESBRECHT, MARY', seenby: '', reason: '', s: '', m: '', clip: '-' },
    ],
    tabs: ['Report', 'Detail', 'Office Notes (0)'],
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
    columns: [
      { key: 'performed', header: 'Performed', width: 88, align: 'center' },
      { key: 'by', header: 'Performed By', width: 170, align: 'center' },
      { key: 'desc', header: 'Description' },
      dots('d'),
      { key: 'm', header: 'M', width: 22, align: 'center' },
      clip,
    ],
    rows: [{ performed: '', by: '', desc: 'PHLEBOTOMY', m: '', clip: '-' }],
    tabs: ['Report', 'Detail'],
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

/* `Allergy / Intolerances` and its `Reaction Risks` child are the same window in
   MOIS — clicking the folder opens the child. The tree calls the child node
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
    columns: [
      { key: 'admitted', header: 'Admitted', width: 88, align: 'center' },
      { key: 'discharged', header: 'Discharged', width: 88, align: 'center' },
      { key: 'by', header: 'Admit By', width: 120, align: 'center' },
      { key: 'facility', header: 'Facility', width: 130, align: 'center' },
      { key: 'desc', header: 'Description' },
      dots('d'),
      { key: 'm', header: 'M', width: 22, align: 'center' },
      clip,
    ],
    /* evidence/MATRIX-R1140-method — an empty record heads the list */
    rows: [
      { admitted: '', discharged: '', by: '', facility: '', desc: '', m: '', clip: '-' },
      { admitted: '2025.12.17', discharged: '', by: '', facility: 'MCONNELL ESTAT…', desc: 'ASSISTED LIVING', m: '', clip: '-' },
      { admitted: '2025.12.17', discharged: '', by: '', facility: 'TVL', desc: 'LONG TERM CARE FACILITIES (RESIDENTIAL CARE)', m: '', clip: '-' },
    ],
    tabs: ['Report', 'Detail'],
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
    columns: [
      { key: 'date', header: 'Date', width: 84, align: 'center' },
      { key: 'author', header: 'Author', width: 120 },
      dots('d'),
      { key: 'type', header: 'Document Type', width: 118 },
      { key: 'note', header: 'Note' },
      { key: 's', header: 'S', width: 22, align: 'center', check: true },
      { key: 'm', header: 'M', width: 22, align: 'center' },
      { key: 'link', header: 'Link', width: 34, align: 'center' },
      clip,
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
    columns: [
      { key: 'date', header: 'Date', width: 86, align: 'center' },
      dots('d1'),
      { key: 'by', header: 'Performed By', width: 150, align: 'center' },
      { key: 'desc', header: 'Description' },
      dots('d2'),
      { key: 'declined', header: 'Declined', width: 62, align: 'center', check: true },
      { key: 'notind', header: 'Not Indicated', width: 80, align: 'center', check: true },
      { key: 'm', header: 'M', width: 22, align: 'center' },
      clip,
    ],
    rows: [
      { date: '2025.02.26', by: '(RN) FLYNN, DEREK', desc: 'EYE CARE MANAGEMENT', m: '⇩', clip: '-' },
      { date: '2025.02.26', by: '(RN) FLYNN, DEREK', desc: 'FOOT CARE MANAGEMENT', m: '⇩', clip: '-' },
      { date: '2025.02.26', by: '(RN) FLYNN, DEREK', desc: 'MEDICATION REVIEW DONE BY NURSE', m: '', clip: '-' },
    ],
    left: [{ label: 'Comment:', kind: 'area', rows: 7, w: '100%', value: 'Saw last year.' }],
    right: [],
    created: '2025.02.26  13:59  (RN) FLYNN, DEREK',
  },

  /* tdt_family_hx — the Relationship column is an in-cell DDDW */
  famhx: {
    title: 'Family Hx',
    commands: SIMPLE, disabled: DIS, plain: true,
    columns: [
      { key: 'chart', header: 'Chart', width: 86, align: 'center' },
      dots('d1'),
      { key: 'name', header: 'Name', width: 160, align: 'center' },
      { key: 'relationship', header: 'Relationship', width: 120, align: 'center' },
      { key: 'condition', header: 'Condition' },
      dots('d2'),
      { key: 'm', header: 'M', width: 22, align: 'center' },
      clip,
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
    created: '2025.05.07  13:53  MCKENZIE, KRISTEN',
  },

  /* tdt_alert */
  alerts: {
    title: 'Alert',
    commands: SIMPLE, disabled: DIS, plain: true,
    columns: [
      { key: 'start', header: 'Start', width: 82, align: 'center' },
      { key: 'end', header: 'End', width: 78, align: 'center' },
      { key: 'code', header: 'Code', width: 76, align: 'center' },
      dots('d'),
      { key: 'desc', header: 'Description', width: 230 },
      { key: 'detail', header: 'Detail' },
      { key: 's', header: 'S', width: 22, align: 'center', check: true },
      { key: 'm', header: 'M', width: 22, align: 'center' },
      clip,
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
    columns: [
      { key: 'start', header: 'Start', width: 86, align: 'center' },
      { key: 'end', header: 'End', width: 86, align: 'center' },
      { key: 'desc', header: 'Description' },
      dots('d'),
      { key: 's', header: 'S', width: 22, align: 'center', check: true },
      { key: 'm', header: 'M', width: 22, align: 'center' },
      clip,
    ],
    rows: [
      { start: '', end: '', desc: '', s: '', m: '', clip: '-' },
      { start: '2025.02.13', end: '', desc: 'NEWCOMER', s: '✓', m: '', clip: '-' },
    ],
    left: [{ label: 'Comment:', kind: 'area', rows: 7, w: '100%' }],
    right: [],
    created: '2025.02.13  07:41  WARKENTIN, LISA',
  },


  barriers: {
    title: 'Barriers to Care',
    commands: SIMPLE, disabled: DIS, plain: true,
    columns: [
      { key: 'start', header: 'Start', width: 82, align: 'center' },
      { key: 'end', header: 'End', width: 78, align: 'center' },
      { key: 'barrier', header: 'Barrier to Care' },
      dots('d'),
      { key: 's', header: 'S', width: 22, align: 'center', check: true },
      { key: 'm', header: 'M', width: 22, align: 'center' },
      clip,
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

  resources: {
    title: 'Patient Resources',
    commands: SIMPLE, disabled: DIS, plain: true,
    columns: [
      { key: 'start', header: 'Start', width: 82, align: 'center' },
      { key: 'end', header: 'End', width: 78, align: 'center' },
      { key: 'resource', header: 'Resource' },
      dots('d'),
      { key: 's', header: 'S', width: 22, align: 'center', check: true },
      { key: 'm', header: 'M', width: 22, align: 'center' },
      clip,
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
    commands: SIMPLE, disabled: DIS, plain: true,
    columns: [
      { key: 'start', header: 'Start', width: 86, align: 'center' },
      { key: 'type', header: 'Type', width: 130, align: 'center' },
      { key: 'subject', header: 'Subject', width: 210 },
      { key: 'detail', header: 'Detail' },
      { key: 's', header: 'S', width: 22, align: 'center', check: true },
      { key: 'demo', header: 'Show on Demo', width: 90, align: 'center', check: true },
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

  events: {
    title: 'Allergy Events',
    commands: SIMPLE, disabled: DIS, plain: true,
    columns: [
      { key: 'date', header: 'Date', width: 88, align: 'center' },
      { key: 'code', header: 'Code', width: 78, align: 'center' },
      dots('d'),
      { key: 'agent', header: 'Agent', width: 230 },
      { key: 'event', header: 'Event' },
      { key: 'm', header: 'M', width: 22, align: 'center' },
    ],
    rows: [],
    left: [{ label: 'Comment:', kind: 'area', rows: 7, w: '100%' }],
    right: [],
    created: '2026.08.12  09:00  JALIL, AHMAD',
  },
})
