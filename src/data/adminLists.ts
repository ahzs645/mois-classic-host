/* ============================================================================
   Administration ▸ Prompt / Selection List Mgt, Configuration ▸ Chart
   Summaries and Codeset Management — the list windows and their editors.

   Each block names the manual article and image it is transcribed from.
   Record data is synthetic training data except where a capture prints it
   (the prompt-list and selection-list names, the visit codes, the reminder
   codes, the snippets, the text/label names, the chart-summary sections and
   the reference sets are all the captures' own).
   ========================================================================= */

export type AdminRow = Record<string, string | number | boolean | undefined>

export type AdminColumn = {
  key: string
  header: string
  width?: number
  align?: 'left' | 'center' | 'right'
  /** a tick box */
  check?: boolean
  /** a colour swatch captioned with the column's own header (ROW COLOR) */
  swatch?: 'row' | 'block'
  /** a drop-down cell (Visit Mode) */
  drop?: boolean
}

/* ===========================================================================
   Prompt List Management                 303078 / 303219
   `78b0e486…` (v02.30.11 b230504) and `55e8fa6d…` (v02.22): Open List /
   Close Window over a Selection List | Description grid of eight rows.
   ======================================================================== */

export const PROMPT_LISTS: AdminRow[] = [
  { list: 'Alert', desc: 'Patient Alerts Code List' },
  { list: 'Allergy/Intolerance - Reaction Agent', desc: 'Agent List for Drug Categories or Non-Drugs' },
  { list: 'Allergy/Intolerance - Reaction Code', desc: 'Reaction Code List' },
  { list: 'Billing Diagnostic Codes', desc: 'Billing Diagnostic Codes (ICD-9)' },
  { list: 'Drug Code', desc: 'Master Drug Code List' },
  { list: 'Immunizations - Historical', desc: 'Historical Immunizations List' },
  { list: 'Lab Code', desc: 'Master Lab Code List' },
  { list: 'Service Code', desc: 'Master Service Code List' },
]

/**
 * `Service Code Prompt Management Window`, `3eb6a249…` (303219): the one
 * prompt list with a window of its own. Code 14540 is the capture's record.
 */
export const SERVICE_CODE_WINDOW = {
  title: 'Service Code Prompt Management Window',
  commands: ['New Record', 'Delete Record', 'Save', 'Find', 'Close Window'],
  code: '14540',
  codeSystem: 'BC.MSP.FEE',
  codeSystems: ['BC.MSP.FEE', 'BC.PRIVATE.FEE', 'WCB.FEE'],
  description: 'INSERTION INTRAUTERINE CONTRACEPTIVE DEVICE',
  amounts: [['MSP:', '40.85'], ['Private:', '88.60'], ['WCB:', '36.19']] as const,
  alternate: { low: '', high: '', ageMin: '0', ageMax: '0' },
  other: [
    ['Department:', ''], ['Allowable Units:', '02'], ['Referral Flag:', '.'],
    ['Serv Clarif Flag:', '.'], ['Restrict Flag:', '.'], ['BCMA Stat Flag:', '..'],
  ] as const,
  defaultHealthCondition: 'V2510',
}

/* ===========================================================================
   Selection List Management              303081 / 303177
   `87e9de33…` (v02.30.11 b230504) prints the list from Abnormal Flag to
   Invoice Payor; `297befda…` (v02.21.12 b161125) the rest, from Health Issue
   - Severity System Code List to Wait List - Type. The two overlap on four
   rows and are joined there.
   ======================================================================== */

export const SELECTION_LISTS: AdminRow[] = [
  ['Abnormal Flag', 'Abnormal Flag Values'],
  ['Abnormal Nature', 'Nature / Reason for Abnormal Value'],
  ['Alias ID', 'Alias Identifications'],
  ['Allergy/Intolerance Documenter', 'Adverse Event Documenter Code List'],
  ['Allergy/Intolerance Informant', 'Adverse Event Informant Code List'],
  ['Allergy/Intolerance Observer', 'Adverse Event Observer Code List'],
  ['Anatomic Position', 'Anatomic Positions'],
  ['Associated Party', 'Groups of Associated Parties'],
  ['Author Role', "Document's Author Role"],
  ['Author Type', "Document's Author Type"],
  ['Benefit Source', 'Sources for Patient Benefits'],
  ['Call List Message', 'Call List Messages'],
  ['City', 'City Lookup Service'],
  ['Connection Role', 'Connection Role List.'],
  ['Document Type', 'Document Type'],
  ['DPM - Condition', 'Disease Prevention and Management Condition'],
  ['Drug - Dose Unit', 'Dose Units'],
  ['Drug - Duration', 'Prescription Duration codes'],
  ['Drug - Frequency', 'Prescription frequency codes'],
  ['Drug - Route', 'Drug Route'],
  ['Expertise', 'Expertise Code List'],
  ['Family Relationship', 'Family Relationship'],
  ['First Nations Status', 'First Nations Status List'],
  ['Health Issue - Certainty', 'Certainty of Condition'],
  ['Health Issue - Data Source', 'Source of Date for the Health Issue'],
  ['Health Issue - Severity', 'Generalized Severity of Health Issue.'],
  ['Health Issue - Severity System', 'A standard Severity Ranking System.'],
  ['Health Issue - Severity System Code List', 'The code list for each Severity Ranking System.'],
  ['Intervention - Site', 'Intervention Site'],
  ['Invoice Code', 'Invoice Code'],
  ['Invoice Payor', 'Invoice Payor List.'],
  ['MAR - Immunization Consent', 'Immunization Consent List'],
  ['MAR - Immunization Consent By', 'Immunization Consent By List'],
  ['MAR - Immunization Consent Form', 'Immunization Consent Form List'],
  ['MAR - Reason for Immunization', 'Reason for Immunization List'],
  ['MAR - Reason Not Given', 'Reason Not Given List'],
  ['Measure - Status Code', 'Measure Status Code List.'],
  ['MSP - Location Code', 'Location Code as defined by MSP.'],
  ['MSP - Submission Code', 'Submission Code as defined by MSP.'],
  ['Order - Action Code', 'Order Action Code List.'],
  ['Order - Priority Code', 'Order Priority Code List.'],
  ['Order - Status Code', 'Order Status Code List.'],
  ['Paper Forms - Group', 'Paper Form Group'],
  ['Paper Forms - Type', 'Paper Form Type'],
  ['Patient - Status Code', 'Patient Status Code List.'],
  ['Phase of Life', 'Life Phases Code List'],
  ['Postal Code', 'Postal Code Lookup Service'],
  ['Preference Reason', 'Preference Reason Code List'],
  ['Preference Subject', 'Preference Subject Code List'],
  ['Relationship', 'Relationship Status.'],
  ['Reminder / Recall Code', 'List of codes for patient reminder / recall list.'],
  ['Reservation Block Code', "Provider and Resource Reservation Block Code's and Setup."],
  ['Source Venue', 'Source Venue'],
  ['Task - Type', 'Task Type.'],
  ['User Alias', 'User Alias Code List'],
  ['User Role', 'User Role Code List'],
  ['Visit Code', 'Encounter Visit Code.'],
  ['Wait List - Type', 'Master Wait List Type'],
].map(([list, desc]) => ({ list, desc }))

/** One list's editor, the `Selection List Manager` (303081, 303219). */
export type ManagedList = { columns: AdminColumn[]; rows: AdminRow[]; source: string }

const CODE_DESC_ORDER: AdminColumn[] = [
  { key: 'code', header: 'Code', width: 140 },
  { key: 'desc', header: 'Description', width: 320 },
  { key: 'order', header: 'Order', width: 60, align: 'center' },
]

/* a Visit Code row: code, description, visit mode, # of slots, MHK, order,
   then the Row Color RGB and the Block Color RGB */
type VisitCode = [string, string, string, number, number, number, number]
const VISIT_CODES: VisitCode[] = [
  ['C', 'Consultation Visit', '', 12, 183, 100, 251],
  ['BX', 'Biopsy', 'DIRECT ENCC', 6, 128, 128, 0],
  ['CT', 'CT Scan', '', 6, 35, 124, 233],
  ['CV', 'Community Visit', '', 3, 223, 148, 91],
  ['DT', 'Diagnostic Test', '', 3, 255, 83, 169],
  ['F', 'Follow Up', '', 6, 0, 179, 179],
  ['FP', 'First Prenatal', 'DIRECT ENCC', 6, 255, 128, 192],
  ['G', 'Group Medical', '', 3, 198, 255, 255],
  ['GPS', 'GP Specialist', '', 3, 192, 192, 192],
  ['H', 'Home Visit', '', 3, 192, 129, 129],
  ['LA', 'Long Assessment', '', 3, 203, 151, 255],
  ['MINOR', 'Minor Procedure', '', 3, 228, 206, 234],
  ['MRI', 'MRI Exam', '', 12, 128, 255, 255],
  ['N', 'Note, Patient Not Seen', '', 3, 255, 255, 0],
  ['O', 'Outreach', '', 3, 0, 185, 185],
  ['PN', 'Prenatal', '', 3, 255, 128, 255],
  ['PROC', 'Major Procedure', '', 3, 255, 70, 163],
  ['Q', 'Quick Check', '', 3, 0, 255, 255],
  ['R', 'Routine', '', 3, 177, 216, 216],
  ['RC', 'Residential Care', '', 3, 198, 140, 140],
  ['SA', 'Short Assessment', '', 3, 202, 202, 255],
  ['TR', 'Travel', '', 3, 255, 255, 174],
  ['U', 'Urgent', '', 3, 0, 255, 0],
  ['UTS', 'Ultrasound', '', 3, 147, 111, 176],
  ['V', 'Virtual', '', 3, 62, 158, 255],
  ['W', 'Walk in Clinic', '', 3, 255, 128, 0],
  ['X', 'Misc', '', 3, 255, 0, 0],
  ['XR', 'XRay', '', 3, 98, 153, 131],
]

export const MANAGED_LISTS: Record<string, ManagedList> = {
  /* `b679cbb1…` (303081, v02.30.11 b230504). BX's Block Color RGB reads
     0 / 0 / 0 in the capture while its Row Color is 128 / 128 / 0 — kept. */
  'Visit Code': {
    source: '303081 / b679cbb1',
    columns: [
      { key: 'code', header: 'Code', width: 58 },
      { key: 'desc', header: 'Description', width: 196 },
      { key: 'mode', header: 'Visit Mode', width: 116, drop: true },
      { key: 'slots', header: '# of Slots', width: 66, align: 'center' },
      { key: 'mhk', header: 'MHK', width: 40, align: 'center', check: true },
      { key: 'order', header: 'Order', width: 56, align: 'center' },
      { key: 'r', header: 'Red', width: 56, align: 'center' },
      { key: 'g', header: 'Green', width: 56, align: 'center' },
      { key: 'b', header: 'Blue', width: 56, align: 'center' },
      { key: 'rowColor', header: 'Row Color', width: 102, swatch: 'row' },
      { key: 'br', header: 'Red', width: 56, align: 'center' },
      { key: 'bg', header: 'Green', width: 56, align: 'center' },
      { key: 'bb', header: 'Blue', width: 56, align: 'center' },
      { key: 'blockColor', header: 'Block Color', width: 102, swatch: 'block' },
    ],
    rows: VISIT_CODES.map(([code, desc, mode, slots, r, g, b]) => ({
      code, desc, mode, slots, mhk: false, order: 0, r, g, b,
      ...(code === 'BX' ? { br: 0, bg: 0, bb: 0 } : { br: r, bg: g, bb: b }),
    })),
  },
  /* `318eb80b…` (303081, v02.30.11 b230504) */
  'Reservation Block Code': {
    source: '303081 / 318eb80b',
    columns: [
      { key: 'code', header: 'Code', width: 140 },
      { key: 'desc', header: 'Description', width: 316 },
      { key: 'order', header: 'Order', width: 60, align: 'center' },
      { key: 'r', header: 'Red', width: 60, align: 'center' },
      { key: 'g', header: 'Green', width: 60, align: 'center' },
      { key: 'b', header: 'Blue', width: 60, align: 'center' },
      { key: 'blockColor', header: '', width: 112, swatch: 'block' },
    ],
    rows: [
      ['CLOSED', '', 255, 255, 192], ['LUNCH', 0, 155, 155, 155], ['DEVELOPMENT', '', 232, 232, 255],
      ['GROUP VISIT', '', 192, 255, 192], ['MEETINGS', '', 192, 232, 255], ['OUT-OF-OFFICE', '', 192, 192, 192],
      ['ROUNDS', '', 255, 192, 192], ['HOLIDAY', 0, 255, 0, 0], ['TEST', 0, 56, 156, 56],
    ].map(([code, order, r, g, b]) => ({ code, desc: '', order, r, g, b, br: r, bg: g, bb: b })),
  },
  /* `08a4b560…` (303176, v02.19.04 b151217) */
  'Reminder / Recall Code': {
    source: '303176 / 08a4b560',
    columns: [
      { key: 'code', header: 'Code', width: 86 },
      { key: 'desc', header: 'Description', width: 258 },
      { key: 'grace', header: 'Grace Period (Days)', width: 120, align: 'center' },
      { key: 'order', header: 'Order', width: 48, align: 'center' },
    ],
    rows: [
      ['COLON', 'Colonoscopy', 0], ['COPD', 'COPD Screening', 0], ['CT', 'CT Scan', 0],
      ['DIAB', 'Diabetes Screening', 0], ['FLU', 'Flu Vaccination', 0], ['HTN', 'Hypertension Screening', 0],
      ['MAMMO', 'Mammogram', 0], ['MRI', 'MRI Scan', 0], ['PAP', 'Pap Test', 0], ['OTHER', 'Other', 1000],
    ].map(([code, desc, order]) => ({ code, desc, grace: 90, order })),
  },
  /* No capture opens the Postal Code list. 303177 says only that it holds
     "postal codes that are set to specific cities", and 303081 that every
     list's record is a code, a description and an order — so it is drawn
     with those three columns over a few synthetic northern-BC prefixes. */
  'Postal Code': {
    source: '303177 prose; no capture',
    columns: CODE_DESC_ORDER,
    rows: [
      ['V2K', 'PRINCE GEORGE'], ['V2L', 'PRINCE GEORGE'], ['V2M', 'PRINCE GEORGE'], ['V2N', 'PRINCE GEORGE'],
      ['V0J 2X0', 'VANDERHOOF'], ['V1J', 'FORT ST. JOHN'], ['V2J', 'QUESNEL'],
    ].map(([code, desc]) => ({ code, desc, order: 0 })),
  },
}

/** Any list with no capture of its own: code, description and order (303081). */
export const GENERIC_MANAGED_LIST: ManagedList = { source: '303081 prose', columns: CODE_DESC_ORDER, rows: [] }

/* ===========================================================================
   Benefit Source                         1784166 / 303081
   The one selection list that opens its own window. `31431ac8…` (303081,
   v02.30.11 b230504): New Record / Delete Record / Edit Record / Close
   Window over Benefit Source | Description | Status, the inactive row grey.
   (The older `8c38f7d7…`, v02.19, has no Delete Record.) New Record raises
   `New Benefit Source` (`8c38f7d7…`); Create Record opens `Benefit Source
   Detail` (`e6a6a6be…`) with its Services band.
   ======================================================================== */

export const BENEFIT_SOURCES: AdminRow[] = [
  { source: 'BLUE CROSS', desc: 'Blue Cross Insurance', status: 'ACTIVE' },
  { source: 'Manulife', desc: 'Manulife Insurance', status: 'ACTIVE' },
  { source: 'MSP', desc: 'BC Medical Service Plan', status: 'ACTIVE' },
  { source: 'SUNLIFE', desc: 'SunLife Insurance', status: 'ACTIVE' },
  { source: 'Manulife', desc: 'Manulife Insurance', status: 'INACTIVE' },
]

export const BENEFIT_SERVICES: AdminRow[] = [
  { service: 'BASIC', desc: 'Basic Insurance', status: 'ACTIVE' },
  { service: 'PREMIUM', desc: 'Premium Insurance', status: 'ACTIVE' },
]

/* ===========================================================================
   Text / Label List                      303086 / 303194
   `f183bf64…` (v02.19.04 b151217): seven buttons, a three-box filter strip,
   Author | Name | Description, then a `Text / Note / Label` pane in a
   fixed-pitch face and a Record Created / Last Modified footer.
   ======================================================================== */

export const TEXT_LABEL_COMMANDS = ['New Record', 'Delete Record', 'Save', 'Undo', 'Refresh', 'Print Label', 'Close Window']

export const TEXT_LABELS: AdminRow[] = [
  { author: 'System', name: '6 WK POST PARTUM CHECK', desc: '' },
  { author: 'System', name: 'A CVS RISK GLUF, LIPID, BP, SMOKING', desc: 'G14034 fee' },
  { author: 'System', name: 'A TO WHOM IT MAY CONCERN', desc: '' },
  { author: 'System', name: 'A WELL WOMAN', desc: '' },
  { author: 'System', name: 'BCP', desc: 'pre BCP counselling' },
  { author: 'System', name: 'CCP - CEREBROVASCULAR DISEASE', desc: 'complex care plan' },
  { author: 'System', name: 'CCP - CHF', desc: '' },
  { author: 'System', name: 'CCP - CHRONIC KIDNEY DISEASE', desc: '' },
  { author: 'System', name: 'CCP - DIABETES', desc: 'complex care plan template for Diabetes' },
  { author: 'System', name: 'CCP - GENERIC', desc: '' },
  { author: 'System', name: 'CCP - ISCHEMIC HEART DISEASE', desc: 'major complex care plan' },
  { author: 'System', name: 'CCP ASTHMA', desc: '' },
  { author: 'System', name: 'CHAPERONE TEXT', desc: '' },
  { author: 'System', name: 'CIRCUMCISION', desc: '' },
  { author: 'System', name: 'NARCOTIC CONTRACT', desc: '' },
  { author: 'System', name: 'NORMAL ABDOMENAL EXAM', desc: '' },
]

/** the first row's body, as the capture prints it (typos included) */
export const TEXT_LABEL_BODY = [
  'S. 6/52 post-partum. Successfully breastfeeding with no problems. No furthur bleeding.  No menses. Perineum',
  'well healed.',
  'O. looks well.',
  'PV: vulva, vagina, cervix, uterus, adnexa normal.',
  'A. Well post partum',
  'P. PAP sent.Discussed appropriate Fe supp, and contraception.',
  '',
  '',
  'THis is all about me.',
].join('\n')

/* ===========================================================================
   Snippet List                           303089 / 303195
   `77c3c212…` / `1b873663…` (v02.19.04 b151217): five buttons, a filter box
   over each of Code and Value, and three snippets ("Pnheumoccocal" sic).
   ======================================================================== */

export const SNIPPET_COMMANDS = ['New Record', 'Delete Record', 'Save', 'Undo', 'Close Window']

export const SNIPPETS: AdminRow[] = [
  { code: 'pg', value: 'Prince George' },
  { code: 'vanc', value: 'Vancouver' },
  { code: 'pne', value: 'Pnheumoccocal' },
]

/* ===========================================================================
   Chart Summary Configuration            303160 / 303353 / 1787512 / 311254
   PATIENT SUMMARY: `a6122e83…` (v02.21.18 b161219) — the list with a
   BENEFIT section, whose Record Filter is str_include_demo = 'Y'; the
   NOTIFICATION and MEASURE details from `4cd9daf9…` / `eaed1b34…`.
   CAREPLAN: `09798532…` (the same build) with BENEFIT filtered
   str_include_care_plan = 'Y'.
   A section no capture opens shows its code and rank with every other
   option empty and Hide Sensitive ticked, which is how BENEFIT paints.
   ======================================================================== */

export const CHART_SUMMARY_COMMANDS = ['New Record', 'Delete Record', 'Save', 'Undo', 'Refresh', 'Change Summary']

/** 303353: "You can edit the Allergy/Intolerances Summary, Care Plan Summary,
    Form Summary, Health Summary and Patient Summary". The captions are the
    view header's (`PATIENT SUMMARY`, `CAREPLAN`). */
export const CHART_SUMMARIES: { key: string; label: string; caption: string }[] = [
  { key: 'allergy', label: 'Allergy/Intolerances Summary', caption: 'ALLERGY/INTOLERANCES' },
  { key: 'careplan', label: 'Care Plan Summary', caption: 'CAREPLAN' },
  { key: 'form', label: 'Form Summary', caption: 'FORM SUMMARY' },
  { key: 'health', label: 'Health Summary', caption: 'HEALTH SUMMARY' },
  { key: 'patient', label: 'Patient Summary', caption: 'PATIENT SUMMARY' },
]

export type SummarySection = {
  code: string
  rank: number
  expand?: boolean
  colour?: string
  /** the swatch the ...Banner Colour... button paints */
  swatch?: string
  title?: string
  includeAll?: boolean
  hideSensitive?: boolean
  filter?: string
  redFlag?: string
}

const sections = (rows: [string, number][], detail: Record<string, Partial<SummarySection>>): SummarySection[] =>
  rows.map(([code, rank]) => ({ code, rank, hideSensitive: true, ...detail[code] }))

export const SUMMARY_SECTIONS: Record<string, SummarySection[]> = {
  patient: sections([
    ['NOTIFICATION', 0], ['BENEFIT', 0], ['DEMO', 101], ['PREFERENCE', 102], ['CONNECTION', 103],
    ['ALIAS ID', 104], ['ASSOCIATED PARTY', 105], ['MEASURE', 106], ['REACTION RISK', 200],
    ['ADVERSE EVENT', 201], ['HEALTH ISSUE', 202], ['LT MED', 203], ['GOAL', 204], ['NEED', 215],
    ['RISK', 220], ['CONSULT', 300], ['ADMISSION', 320], ['DOCUMENT', 320], ['ENCOUNTER', 320],
    ['FORMD', 320], ['FORME', 320], ['FORMP', 320], ['IMAGE', 320], ['INTERVENTION', 320],
    ['MAR', 320], ['ORDER', 320], ['PRESCRIPTION', 320], ['PROCEDURE', 320], ['NOTIFICATION', 400],
  ], {
    NOTIFICATION: { colour: '14913930', swatch: '#8a8ae0', includeAll: true },
    BENEFIT: { filter: "str_include_demo = 'Y'" },
    MEASURE: {
      colour: '16435196', swatch: '#fcc8fa', title: 'MEASURES', filter: 'RECENT',
      redFlag: 'If (str_abnormal in\n("A", "AA", "L"," LL","H", "HH", "CRI"), "ERROR", "NOTHING")',
    },
  }),
  careplan: sections([
    ['ASSOCIATED PARTY', 1010], ['BENEFIT', 0], ['NOTIFICATION', 0], ['CONNECTION', 1020],
    ['PREFERENCE', 2005], ['PREFERENCE', 2010], ['GOAL', 2020], ['ACTION', 2030], ['BARRIER', 2040],
    ['RESOURCE', 2050], ['HEALTH ISSUE', 3010], ['RISK', 3020], ['NEED', 3030], ['LT MED', 3040],
    ['REACTION RISK', 3050], ['CLINICAL SUMMARY', 3060],
  ], {
    BENEFIT: { filter: "str_include_care_plan = 'Y'" },
  }),
}

/* ===========================================================================
   Code Reference Sets                    2069356
   `d0fd9579…`: New / Delete / Save / Undo over Reference Set | Source | OID
   | Description | Active; `8e222b72…`: the Codes in Reference Set band with
   Add / Delete / Reset over a Code System drop-down and three search boxes,
   and Code System | Code | … | Term | Category | Active.
   ======================================================================== */

export const REFERENCE_SET_COMMANDS = ['New', 'Delete', 'Save', 'Undo']

export const REFERENCE_SETS: AdminRow[] = [
  ['CONSULT REQUESTS (AIHS)', 'AIHS', 'MOIS Consult Requests'],
  ['HEALTH CONCERNS', 'AIHS', 'MOIS Health Concerns'],
  ['HEALTH CONCERNS (BC)', 'BC MoH', 'BC Health Concerns'],
  ['INTERVENTIONS (AIHS)', 'AIHS', 'MOIS Interventions'],
  ['INTERVENTIONS (CIHI)', 'CIHI', 'CIHI Interventions'],
  ['MEDICAL IMAGING', 'AIHS', 'MOIS Medical Imaging'],
  ['PROCEDURES', 'AIHS', 'MOIS Procedures'],
  ['SOCIAL HISTORY', 'AIHS', 'MOIS Social History'],
].map(([set, source, desc]) => ({ set, source, oid: '', desc, active: true }))

export const CODE_SOURCES = ['AIHS', 'BC MoH', 'CIHI']

/* ===========================================================================
   Code Lookup Configuration              2069358
   `77260e59…`: Save / Edit / Undo, `Only show :` and `Show special
   settings:`, then a tick column and Description | Code Systems | Code
   Systems On | Reference Sets | Reference Sets On. Only the grid's first
   five rows show above the Configure Code Lookup Setting window in the
   capture, so those five are the rows here. The window's two panes are the
   capture's too.
   ======================================================================== */

export const LOOKUP_COMMANDS = ['Save', 'Edit', 'Undo']

export const LOOKUP_SETTINGS: AdminRow[] = [
  { desc: 'Clinic Management Provider Team - Service Stopped Reason', systems: "'SNOMED-CT'", systemsOn: "'SNOMED-CT'", sets: '', setsOn: '' },
  { desc: 'Connection Stop Reason', systems: "'AIHS-STOPREASON'", systemsOn: "'AIHS-STOPREASON'", sets: '', setsOn: '' },
  { desc: "Consults - Consultant's Diagnosis", systems: "'ICD-9','SNOMED-CT',...", systemsOn: "'ICD-9','MSP-DIAGCO...", sets: "'HEALTH CONCERN...", setsOn: '' },
  { desc: 'Consults - Reason for Consult', systems: "'ICD-9','SNOMED-CT',...", systemsOn: "'ICD-9','SNOMED-CT',...", sets: "'CONSULT REQUES...", setsOn: '' },
  { desc: 'Demographic Detail - Country Origin', systems: "'ISO COUNTRY'", systemsOn: "'ISO COUNTRY'", sets: '', setsOn: '' },
]

/** The Configure Code Lookup Setting panes, `77260e59…`. */
export const LOOKUP_CODE_SYSTEMS: AdminRow[] = [
  ['AIHS-INTERVENTION'], ['AIHS-LIVEARR'], ['AIHS-MEASURE'], ['AIHS-STOPREASON'], ['CDC-RACE'],
  ['ICD-10'], ['ICD-9', true, true], ['ICPC2'], ['ISCO-88'], ['ISO-COUNTRY'], ['ISO-LANGUAGE'],
  ['LOINC'], ['MSP-DIAGCODE', true, true], ['MSP-FEECODE'], ['SNOMED-CT', true], ['WCB-AOI'], ['WCB-NOI'],
].map(([name, available, selected]) => ({ name, available: Boolean(available), selected: Boolean(selected) }))

export const LOOKUP_REFERENCE_SETS: AdminRow[] = [
  ['CONSULT REQUESTS (AIHS)'], ['HEALTH CONCERNS', true], ['HEALTH CONCERNS (BC)', true],
  ['INTERVENTIONS (AIHS)'], ['INTERVENTIONS (CIHI)'], ['MEDICAL IMAGING'], ['PROCEDURES'], ['SOCIAL HISTORY'],
].map(([name, available]) => ({ name, available: Boolean(available), selected: false }))

/** the tree nodes these windows answer */
export const adminListNodes = [
  'ad-prompt-lists', 'ad-selection-lists', 'ad-text-labels', 'ad-snippet',
  'ad-chart-summaries', 'ad-reference-sets', 'ad-lookup-settings',
  /* the two section landing pages (screens/AdminLandingViews.tsx, user
     capture 2026-09-25 #48 / #54): the folder node itself opens them */
  'ad-designer', 'ad-clinic-mgt',
]
