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
  /** the tabs under the grid — every folder ends on More as of 2.31.41
      (303492 `4d6a5577…`; BasketFolderView's MoreTab) */
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
  /** the Detail tab's own fields, where the folder's page lists them
      (1802756 Measures, 1802758 Consults, 1802761 Facility Admissions) */
  detail?: { left: [label: string, key: string][]; right: [label: string, key: string][]; memo?: string }
  /** the Report tab's Order # carries the "…" that opens the Order Linking
      Service — every folder but Orders (1802749) */
  orderLink?: boolean
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
    tabs: ['Report', 'Detail', 'Panel (0)', 'More'],
    recordType: 'Measurement',
    extra: { header: 'Ordered By Provider', key: 'orderedBy' },
    report: {
      left: [['Test Name:', 'test'], ['Value:', 'valueUnits'], ['Flag:', 'flag'], ['Ref. Ranges:', 'range'], ['Status:', 'status']],
      right: [['Order Date:', 'orderDate'], ['Order #:', 'orderNo'], ['Ordered By:', 'orderedBy'], ['Copies To:', 'copiesTo']],
      memo: 'Report',
      comments: true,
      orderLink: true,
      detail: {
        left: [['Test Name:', 'test'], ['Value:', 'valueUnits'], ['Flag:', 'flag'], ['Ref. Ranges:', 'range'], ['Status:', 'status'], ['MOIS Code:', 'moisCode'], ['LOINC Code:', 'loinc'], ['Order Name:', 'orderName'], ['Class:', 'class'], ['Volume:', 'volume']],
        right: [['Facility:', 'facility'], ['Facility Location:', 'facilityLoc'], ['Facility Reference:', 'facilityRef'], ['Performed By:', 'performedBy'], ['Report By:', 'reportBy'], ['Transcribed:', 'transcribed'], ['Collected By:', 'collectedBy'], ['Specimen Source:', 'specimen']],
        memo: 'Collection Note',
      },
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
      row('139', 'A', 'BROWN, FARMER', '35', { collected: '26.03.17', test: 'HEMOGLOBIN A1C', value: '8.4', units: '%', flag: 'H', abnormal: true, range: '4.0 to 6.0', orderDate: '2026.03.16', orderedBy: 'BEARDWOOD, WENDY', recordId: '500112', report: 'Consistent with poorly controlled diabetes.', ir: 'O', owners: 'ADMINISTRATOR;BEARDWOOD, WENDY', panel: 'DIABETES PANEL', moisCode: '128', loinc: '4548-4', orderName: 'DIABETES PANEL', class: 'CHEM', facility: 'LIFELABS', facilityLoc: 'PG', facilityRef: 'L26-031744', performedBy: 'LIFELABS 2026.03.17 11:02', reportBy: 'LIFELABS 2026.03.17 14:10', transcribed: 'SYSTEM 2026.03.17 14:12', collectedBy: 'LIFELABS 2026.03.17 08:40', specimen: 'BLOOD' }),
      row('474', 'A', 'ADAM, GEORGE', '48', { collected: '26.03.17', test: 'CREATININE', value: '96', units: 'umol/L', flag: '', range: '60 to 110', orderDate: '2026.03.16', orderedBy: 'BEARDWOOD, WENDY', recordId: '500113' }),
      row('586', 'A', 'HALE, MARGARET', '70', { collected: '26.03.16', test: 'THYROID STIMULATING HORMONE', value: '11.2', units: 'mIU/L', flag: 'H', abnormal: true, range: '0.32 to 5.04', orderedBy: 'SMITH, DALENE', recordId: '500098' }),
      row('461', 'A', 'RAO, PRIYA', '41', { collected: '26.03.16', test: 'POTASSIUM', value: '4.1', units: 'mmol/L', flag: '', range: '3.5 to 5.0', orderedBy: 'BEARDWOOD, WENDY', recordId: '500101' }),
      row('0', 'R', 'OKONKWO, SAM', '56', { collected: '26.03.15', test: 'LIPID PANEL', value: '', units: '', flag: '', clip: '1', orderedBy: 'SMITH, DALENE', recordId: '500094', reviewNote: 'Please review with the LDL target in mind.', panel: 'LIPID PANEL' }),
      row('13', 'A', 'FONTAINE, DALE', '24', { collected: '26.03.15', test: 'HEMOGLOBIN', value: '131', units: 'g/L', flag: '', range: '120 to 160', orderedBy: 'RESIDENT, R1', recordId: '500090' }),
      /* another user's results: listed only when their workspace is blended
         in or viewed (1802767), with their initials under Assignee */
      row('22', 'A', 'CASTILLO, JUNE', '78', { collected: '26.03.14', test: 'SODIUM', value: '131', units: 'mmol/L', flag: 'L', abnormal: true, range: '135 to 145', orderedBy: 'BEARDWOOD, WENDY', recordId: '500087', assignee: 'WB', ir: 'O', owners: 'BEARDWOOD, WENDY' }),
      row('5', 'A', 'ADAM, GEORGE', '48', { collected: '26.03.13', test: 'THROAT SWAB CULTURE', value: 'NEG', units: '', flag: '', orderedBy: 'SMITH, PETER', recordId: '500085', assignee: 'PS', ir: 'O', owners: 'SMITH, PETER' }),
    ],
  },
  {
    id: 'ws-imaging',
    label: 'Imaging',
    /* the tree says Imaging; the banner says Images */
    header: 'Acknowledge - Images',
    tabs: ['Report', 'Detail', 'More'],
    recordType: 'Image',
    extra: { header: 'Ordered By Provider', key: 'orderedBy' },
    report: {
      /* CONFIRM-CURRENT: Contrast is in 1802757's Report Tab field list
         (text only — the page's images are not in the supplemented manual),
         between Modality and Status, as listed */
      left: [['Test Name:', 'test'], ['Region:', 'region'], ['Laterality:', 'laterality'], ['Flag:', 'flag'], ['Modality:', 'modality'], ['Contrast:', 'contrast'], ['Status:', 'status']],
      right: [['Order Date:', 'orderDate'], ['Order #:', 'orderNo'], ['Ordered By:', 'orderedBy'], ['Copies To:', 'copiesTo']],
      memo: 'Report',
      orderLink: true,
      /* CONFIRM-CURRENT: the Detail tab's fields are 1802757's Detail Tab list
         (text only). Which column each sits in is INFERRED — the record's own
         fields left, where it came from right, the split Measures' capture
         shows — and Key Word is the memo, as in Consults */
      detail: {
        left: [['Test Name:', 'test'], ['Region:', 'region'], ['Laterality:', 'laterality'], ['Flag:', 'flag'], ['Modality:', 'modality'], ['Contrast:', 'contrast'], ['Status:', 'status'], ['Exam Reason:', 'examReason']],
        right: [['Facility:', 'facility'], ['Facility Location:', 'facilityLoc'], ['Facility Reference:', 'facilityRef'], ['Performed By:', 'performedBy'], ['Report By & Date:', 'reportBy'], ['Transcribed & Date:', 'transcribed'], ['Diagnostic Code:', 'diagCode'], ['Diagnostic Desc.:', 'diagDesc']],
        memo: 'Key Word',
      },
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
    tabs: ['Report', 'Detail', 'More'],
    recordType: 'Consult',
    extra: { header: 'Referred By', key: 'referredBy' },
    report: {
      left: [['Reason:', 'reason'], ['Seen By:', 'seenBy'], ['Date:', 'seenDate'], ['Diag. Code:', 'diagCode'], ['Diag Desc.:', 'diagDesc']],
      right: [['Refer Date:', 'orderDate'], ['Order #:', 'orderNo'], ['Referred By:', 'referredBy'], ['Copies To:', 'copiesTo']],
      memo: 'Report',
      orderLink: true,
      /* the consultant's own diagnosis, beside the Reason the patient was
         sent for — "may be different!" (1802758) */
      detail: {
        left: [['Description:', 'diagDesc'], ['Reason:', 'reason'], ['Facility:', 'facility'], ['Facility Location:', 'facilityLoc'], ['Facility Reference:', 'facilityRef']],
        right: [['Report By & Date:', 'reportBy'], ['Transcribed & Date:', 'transcribed'], ['Diagnostic Code:', 'diagCode'], ['Diagnostic Desc.:', 'diagDesc']],
        memo: 'Key Word',
      },
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
      row('474', 'A', 'HALE, MARGARET', '70', { seen: '26.03.10', seenBy: 'CARDIOLOGY, UHNBC', reason: 'ATRIAL FIBRILLATION - RATE CONTROL', seenDate: '2026.03.10', referredBy: 'SMITH, DALENE', diagCode: '427', diagDesc: 'CARDIAC DYSRHYTHMIAS', recordId: '500090', ir: 'C', orderDate: '2026.02.02', facility: 'UHNBC', facilityLoc: 'PG', facilityRef: 'C26-00913', reportBy: 'CARDIOLOGY, UHNBC 2026.03.10', transcribed: 'UHNBC TRANSCRIPTION 2026.03.11 09:15', report: 'Thank you for referring this pleasant 70 year old woman with paroxysmal atrial fibrillation.\n\nImpression: rate controlled on metoprolol. CHADS2 score 2; anticoagulation discussed.\n\nPlan: continue metoprolol, start apixaban 5 mg BID, repeat Holter in 3 months.' }),
      row('33', 'A', 'OKONKWO, SAM', '56', { seen: '26.03.09', seenBy: 'GENERAL SURGERY', reason: 'INGUINAL HERNIA REPAIR - FOLLOW UP', seenDate: '2026.03.09', referredBy: 'BEARDWOOD, WENDY', recordId: '500088' }),
      row('25', 'R', 'RAO, PRIYA', '41', { seen: '26.03.05', seenBy: 'RESPIROLOGY', reason: 'CHRONIC COUGH', seenDate: '2026.03.05', referredBy: 'BEARDWOOD, WENDY', recordId: '500084' }),
    ],
  },
  {
    id: 'ws-procedures',
    label: 'Procedures',
    header: 'Acknowledge - Procedures',
    tabs: ['Report', 'Detail', 'More'],
    recordType: 'Procedure',
    extra: { header: 'Ordered By Provider', key: 'orderedBy' },
    report: {
      left: [['Description:', 'description'], ['Diagnostic Code:', 'diagCode'], ['Diagnostic Description:', 'diagDesc']],
      right: [['Order Date:', 'orderDate'], ['Order #:', 'orderNo'], ['Ordered By:', 'orderedBy'], ['Copies To:', 'copiesTo']],
      memo: 'Report',
      orderLink: true,
      /* CONFIRM-CURRENT: 1802759's Detail Tab list (text only), laid out the
         way Facility Admissions' sibling Detail tab is (INFERRED split) */
      detail: {
        left: [['Description:', 'description'], ['Facility:', 'facility'], ['Facility Location:', 'facilityLoc'], ['Facility Reference:', 'facilityRef']],
        right: [['Performed By:', 'by'], ['Report By & Date:', 'reportBy'], ['Transcribed & Date:', 'transcribed'], ['Diagnostic Code:', 'diagCode'], ['Diagnostic Desc.:', 'diagDesc']],
        memo: 'Key Word',
      },
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
    tabs: ['Report', 'More'],
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
    tabs: ['Report', 'Detail', 'More'],
    recordType: 'Facility Admission',
    extra: { header: 'Attending', key: 'attending' },
    report: {
      left: [['Description:', 'description'], ['Admit Date:', 'admitDate'], ['Attending:', 'attending'], ['Admitted By:', 'admittedBy']],
      right: [['Diagnostic Code:', 'diagCode'], ['Diagnostic Description:', 'diagDesc'], ['Copies To:', 'copiesTo'], ['Order #:', 'orderNo']],
      memo: 'Report',
      orderLink: true,
      detail: {
        left: [['Description:', 'description'], ['Facility:', 'facility'], ['Facility Location:', 'facilityLoc'], ['Facility Reference:', 'facilityRef']],
        right: [['Report By & Date:', 'reportBy'], ['Transcribed & Date:', 'transcribed'], ['Diagnostic Code:', 'diagCode'], ['Diagnostic Desc.:', 'diagDesc']],
        memo: 'Key Word',
      },
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
      row('461', 'A', 'HALE, MARGARET', '70', { discharge: '26.03.02', facility: 'UHNBC', description: 'DISCHARGE SUMMARY', admitDate: '2026.02.26', attending: 'CARDIOLOGY, UHNBC', admittedBy: 'EMERGENCY, UHNBC', diagCode: '427', diagDesc: 'CARDIAC DYSRHYTHMIAS', recordId: '500061', ir: 'F', facilityLoc: 'PG', facilityRef: 'A26-11802', reportBy: 'CARDIOLOGY, UHNBC 2026.03.02', transcribed: 'UHNBC TRANSCRIPTION 2026.03.03 10:04', report: 'Admitted 2026.02.26 with rapid atrial fibrillation. Rate controlled with IV then oral metoprolol. Discharged home 2026.03.02 in sinus rhythm.\n\nFollow-up: family physician in one week; cardiology clinic in six weeks.' }),
      row('461', 'A', 'RAO, PRIYA', '41', { discharge: '26.03.16', facility: 'UHNBC', description: 'ER CARE REPORT - CHEST PAIN', admitDate: '2026.03.16', attending: 'EMERGENCY, UHNBC', admittedBy: 'TRIAGE, UHNBC', recordId: '500059', ir: 'F', report: 'Seen in ER for atypical chest pain. ECG normal, troponin negative x2. Discharged with GP follow-up.' }),
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
    tabs: ['Report', 'More'],
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
    /* CONFIRM-CURRENT: 1802763's text describes a Report tab only; the
       Detail tab here is the shared fallback (BasketFolderView ReportForm) */
    tabs: ['Report', 'Detail', 'More'],
    recordType: 'Order',
    extra: { header: 'Referred To', key: 'referredTo' },
    report: {
      left: [['Referred To:', 'referredTo'], ['Payor:', 'payor'], ['Copies To:', 'copiesTo'], ['Transcribed:', 'transcribed'], ['Status:', 'status']],
      right: [['Order Type:', 'orderType'], ['Ordered By:', 'orderedBy'], ['Facility:', 'facility'], ['Facility Ref:', 'facilityRef'], ['Facility Location:', 'facilityLoc']],
      memo: 'Referral',
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
      row('33', 'A', 'RAO, PRIYA', '41', { ordDate: '26.03.07', orderedBy: 'RESPIROLOGY', orderType: 'Consultation', src: 'EXT', description: 'PULMONARY FUNCTION TESTING', status: 'In Process', referredTo: 'RESPIROLOGY', payor: 'MSP', recordId: '500050', ir: 'R', facility: 'NORTHERN RESPIROLOGY', facilityRef: 'CDX-88213', facilityLoc: 'PG', transcribed: 'CDX 2026.03.07 13:20', report: 'Referral letter: 41 year old with chronic cough, please assess for asthma. PFTs requested.' }),
      row('25', 'A', 'BROWN, FARMER', '35', { ordDate: '26.03.04', orderedBy: 'BEARDWOOD, W', orderType: 'Lab', src: 'INT', description: 'HEMOGLOBIN A1C', status: 'Completed', referredTo: 'LIFELABS', payor: 'MSP', recordId: '500049', transcribed: 'ADMINISTRATOR 2026.03.04 09:02' }),
      /* no Order Type: Print asks for one first (1802763 `d86d53f9…`) */
      row('12', 'A', 'OKONKWO, SAM', '56', { ordDate: '26.03.09', orderedBy: 'GENERAL SURGERY', orderType: '', src: 'EXT', description: 'INGUINAL HERNIA - REFERRAL', status: 'Scheduled', referredTo: 'GENERAL SURGERY', payor: 'MSP', recordId: '500047', report: 'Referral for elective right inguinal hernia repair.' }),
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

/* ============================================================================
   Whose workspace a basket row is in, and what the Basket's own windows
   read beside the rows (1802749 "Using the Workspace Basket").
   ========================================================================= */

/** The users a row is waiting for. Unmarked rows are the signed-in user's. */
export const rowOwners = (r: BasketRow): string[] =>
  String(r.owners ?? 'ADMINISTRATOR').split(';').map((s) => s.trim()).filter(Boolean)

const initialsOf = (name: string) => {
  if (name === 'ADMINISTRATOR') return 'ADMIN'
  const [last = '', first = ''] = name.split(',').map((s) => s.trim())
  return `${first[0] ?? ''}${last[0] ?? ''}`
}

/**
 * The rows a workspace view shows: those waiting for anyone in the view.
 * A row waiting for two or more of them is one blended row whose Assignee
 * reads `*` (1802767: "You will see an asterisk in the 'Assignee' column …
 * when a record is blended, otherwise … the initials of the user").
 */
export function rowsForView(rows: BasketRow[], people: string[]): BasketRow[] {
  return rows.flatMap((r) => {
    const mine = rowOwners(r).filter((o) => people.includes(o))
    if (!mine.length) return []
    if (mine.length > 1) return [{ ...r, assignee: '*', blendedFor: mine.join('; ') }]
    return [{ ...r, assignee: r.owners ? initialsOf(mine[0]!) : r.assignee }]
  })
}

/** Outstanding orders a basket record can be linked to (Order Linking
    Service, 1802749 `a31c8698…` / `6a620b43…`), by patient. */
export const BASKET_ORDERS: Record<string, { orderNo: string; date: string; orderBy: string; referral: string; description: string; status: string; priority: string; comment: string }[]> = {
  'BROWN, FARMER': [
    { orderNo: '700211', date: '2026.03.16', orderBy: 'BEARDWOOD, WENDY', referral: 'LIFELABS', description: 'DIABETES PANEL', status: 'IN PROCESS', priority: 'ROUTINE', comment: 'ORDER BY: BEARDWOOD, WENDY\n\nQuarterly diabetes review.' },
    { orderNo: '700198', date: '2026.03.01', orderBy: 'BEARDWOOD, WENDY', referral: 'RADIOLOGY', description: 'ULTRASOUND ABDOMEN COMPLETE', status: 'SCHEDULED', priority: 'ROUTINE', comment: 'ORDER BY: BEARDWOOD, WENDY' },
  ],
  'ADAM, GEORGE': [{ orderNo: '700220', date: '2026.03.16', orderBy: 'BEARDWOOD, WENDY', referral: 'LIFELABS', description: 'CREATININE', status: 'IN PROCESS', priority: 'ROUTINE', comment: 'ORDER BY: BEARDWOOD, WENDY' }],
  'HALE, MARGARET': [
    { orderNo: '700160', date: '2026.02.02', orderBy: 'SMITH, DALENE', referral: 'CARDIOLOGY, UHNBC', description: 'ATRIAL FIBRILLATION - RATE CONTROL', status: 'SCHEDULED', priority: 'URGENT', comment: 'ORDER BY: SMITH, DALENE\n\nPlease assess rate control.' },
    { orderNo: '700171', date: '2026.03.14', orderBy: 'SMITH, DALENE', referral: 'LIFELABS', description: 'THYROID STIMULATING HORMONE', status: 'IN PROCESS', priority: 'ROUTINE', comment: 'ORDER BY: SMITH, DALENE' },
  ],
  'CASTILLO, JUNE': [{ orderNo: '700150', date: '2026.03.10', orderBy: 'SMITH, DALENE', referral: 'RADIOLOGY', description: 'CHEST X-RAY, TWO VIEWS', status: 'IN PROCESS', priority: 'ROUTINE', comment: 'ORDER BY: SMITH, DALENE' }],
  'OKONKWO, SAM': [{ orderNo: '700140', date: '2026.03.02', orderBy: 'BEARDWOOD, WENDY', referral: 'GENERAL SURGERY', description: 'INGUINAL HERNIA REPAIR', status: 'SCHEDULED', priority: 'ROUTINE', comment: 'ORDER BY: BEARDWOOD, WENDY' }],
  'RAO, PRIYA': [{ orderNo: '700133', date: '2026.03.05', orderBy: 'BEARDWOOD, WENDY', referral: 'RESPIROLOGY', description: 'CHRONIC COUGH', status: 'SCHEDULED', priority: 'ROUTINE', comment: 'ORDER BY: BEARDWOOD, WENDY' }],
  'FONTAINE, DALE': [{ orderNo: '700120', date: '2026.03.14', orderBy: 'RESIDENT, R1', referral: 'LIFELABS', description: 'CBC', status: 'IN PROCESS', priority: 'ROUTINE', comment: 'ORDER BY: RESIDENT, R1' }],
}

/** The HL7 order statuses the Status drop-down lists (1802763; `6a620b43…`). */
export const ORDER_STATUSES: { status: string; description: string }[] = [
  { status: 'IN PROCESS', description: 'In process, unspecified' },
  { status: 'SCHEDULED', description: 'In process, scheduled' },
  { status: 'RESULTS AVAILABLE', description: 'Some, but not all, results available' },
  { status: 'CANCELLED', description: 'Order was cancelled' },
  { status: 'COMPLETED', description: 'Order is completed' },
  { status: 'ERROR', description: 'Error, order not found' },
  { status: 'ON HOLD', description: 'Order is on hold' },
  { status: 'DISCONTINUED', description: 'Order was discontinued' },
  { status: 'REPLACED', description: 'Order has been replaced' },
]

/** A basket measure's earlier values (Show History ▸ Related Measurements),
    by `patient|test`, newest first; the basket row itself is added on top. */
export const MEASURE_HISTORY: Record<string, { collected: string; value: string; comment?: string }[]> = {
  'BROWN, FARMER|HEMOGLOBIN A1C': [
    { collected: '2025.12.10', value: '7.9' }, { collected: '2025.09.02', value: '7.4' },
    { collected: '2025.05.28', value: '7.1', comment: 'Metformin increased' }, { collected: '2025.02.14', value: '6.8' },
  ],
  'ADAM, GEORGE|CREATININE': [{ collected: '2025.10.01', value: '92' }, { collected: '2025.04.11', value: '88' }],
  'HALE, MARGARET|THYROID STIMULATING HORMONE': [{ collected: '2025.11.20', value: '7.8' }, { collected: '2025.06.03', value: '4.9' }],
  'RAO, PRIYA|POTASSIUM': [{ collected: '2025.08.19', value: '4.4' }],
  'FONTAINE, DALE|HEMOGLOBIN': [{ collected: '2025.12.02', value: '128' }, { collected: '2025.07.15', value: '134' }],
  'CASTILLO, JUNE|SODIUM': [{ collected: '2026.01.09', value: '136' }],
}

/** Goals shown beside Show History (2.22: "incorporate Goals"). */
export const MEASURE_GOALS: Record<string, { goal: string; start: string; end: string }[]> = {
  'BROWN, FARMER|HEMOGLOBIN A1C': [{ goal: 'HBA1C < 7.0', start: '2025.09.02', end: '' }],
}

/** The Panel tab: the other results in the row's panel, and its note
    (1802756 "Panel Tab"). */
export const BASKET_PANELS: Record<string, { note: string; results: { test: string; value: string; units: string; flag: string; range: string; status: string }[] }> = {
  'BROWN, FARMER|DIABETES PANEL': {
    note: 'Fasting sample. Patient reports missed metformin doses this month.',
    results: [
      { test: 'HEMOGLOBIN A1C', value: '8.4', units: '%', flag: 'H', range: '4.0 to 6.0', status: 'F' },
      { test: 'GLUCOSE FASTING', value: '9.1', units: 'mmol/L', flag: 'H', range: '3.6 to 6.0', status: 'F' },
      { test: 'CREATININE', value: '84', units: 'umol/L', flag: '', range: '50 to 110', status: 'F' },
      { test: 'ALBUMIN/CREATININE RATIO', value: '3.4', units: 'mg/mmol', flag: 'H', range: '< 2.0', status: 'F' },
    ],
  },
  'OKONKWO, SAM|LIPID PANEL': {
    note: '',
    results: [
      { test: 'CHOLESTEROL', value: '5.9', units: 'mmol/L', flag: 'H', range: '< 5.2', status: 'F' },
      { test: 'LDL CHOLESTEROL', value: '3.8', units: 'mmol/L', flag: 'H', range: '< 3.5', status: 'F' },
      { test: 'HDL CHOLESTEROL', value: '1.1', units: 'mmol/L', flag: '', range: '> 1.0', status: 'F' },
      { test: 'TRIGLYCERIDES', value: '2.2', units: 'mmol/L', flag: 'H', range: '< 1.7', status: 'F' },
    ],
  },
}

/** Workflow Summary: the training acknowledgement history each record
    carries before the session adds to it (1802768 `9a1ef52e…` etc.). */
export const ACK_HISTORY_SEED: Record<string, { at: string; action: string; by: string; to?: string; note?: string }[]> = {
  'ws-measures:OKONKWO, SAM': [
    { at: '2026.03.15 14:52', action: 'CREATED', by: 'SMITH, DALENE', to: 'ADMINISTRATOR', note: '[REVIEWED] Please review with the LDL target in mind.' },
  ],
  'ws-measures:BROWN, FARMER': [
    { at: '2026.03.17 14:12', action: 'CREATED', by: 'INTERFACE', to: 'BEARDWOOD, WENDY' },
    { at: '2026.03.17 14:12', action: 'CREATED', by: 'INTERFACE', to: 'ADMINISTRATOR' },
  ],
  'ws-consults:HALE, MARGARET': [
    { at: '2026.03.11 09:15', action: 'CREATED', by: 'SMITH, DALENE', to: 'SMITH, DALENE' },
    { at: '2026.03.12 10:02', action: 'REASSIGNED', by: 'SMITH, DALENE', to: 'ADMINISTRATOR', note: 'Automatically reassigned according to inbox forwarding rule.' },
  ],
}

/* ----------------------------------------------------------------------------
   The More tab (MOIS 2.31.41, art. 303492 "Update the Workspace to Display
   Additional Patient Information"; image `4d6a5577…`): the lower detail
   section's fourth tab draws the instance's "Workspace Summary" chart
   summary for the row's patient — by default its last five encounters
   (`5e0c9979…`: "dtm_appoint <= current_date … order by dtm_appoint desc
   limit 5") and its connections, under ENCOUNTER [n] / CONNECTIONS [n] bands.
   "If a record is not associated with a patient chart (e.g. task, message)
   then the More tab is blank."

   The basket's patients are synthetic and carry no chart of their own, so
   their summary rows are seeded here, by patient, in the capture's shape:
   an encounter's Description is its provider and Detail its visit reason; a
   connection's Description is its kind and Detail who it is to.
   ------------------------------------------------------------------------- */
export type BasketMoreRow = { date: string; description: string; detail: string }

export const BASKET_MORE: Record<string, { encounters: BasketMoreRow[]; connections: BasketMoreRow[] }> = {
  'BROWN, FARMER': {
    encounters: [
      { date: '2026.03.16', description: 'HALLIWELL, A.', detail: 'DIABETES FOLLOW UP' },
      { date: '2025.12.10', description: 'HALLIWELL, A.', detail: 'Rx' },
      { date: '2025.09.02', description: 'RESIDENT, R1', detail: 'DIABETES FOLLOW UP' },
    ],
    connections: [{ date: '2025.01.24', description: 'BUSINESS UNIT', detail: 'PRIMARY CARE BU' }],
  },
  'ADAM, GEORGE': {
    encounters: [
      { date: '2026.03.18', description: 'RESIDENT, R1', detail: 'SAME DAY - SORE THROAT' },
      { date: '2025.10.01', description: 'HALLIWELL, A.', detail: 'Rx' },
    ],
    connections: [],
  },
  'HALE, MARGARET': {
    encounters: [
      { date: '2026.03.04', description: 'HALLIWELL, A.', detail: 'POST DISCHARGE' },
      { date: '2026.01.20', description: 'HALLIWELL, A.', detail: 'PALPITATIONS' },
      { date: '2025.11.20', description: 'HALLIWELL, A.', detail: 'Rx' },
    ],
    connections: [{ date: '2024.06.11', description: 'FAMILY PHYSICIAN', detail: 'HALLIWELL, A.' }],
  },
  'RAO, PRIYA': {
    encounters: [{ date: '2026.03.16', description: 'RESIDENT, R1', detail: 'URGENT - CHEST PAIN' }],
    connections: [],
  },
  'OKONKWO, SAM': {
    encounters: [{ date: '2026.03.02', description: 'HALLIWELL, A.', detail: 'HERNIA' }],
    connections: [{ date: '2025.01.24', description: 'BUSINESS UNIT', detail: 'PRIMARY CARE BU' }],
  },
  'FONTAINE, DALE': {
    encounters: [{ date: '2026.03.14', description: 'RESIDENT, R1', detail: 'WOUND CHECK' }],
    connections: [],
  },
  'CASTILLO, JUNE': {
    encounters: [{ date: '2026.03.10', description: 'HALLIWELL, A.', detail: 'COUGH' }],
    connections: [],
  },
}
