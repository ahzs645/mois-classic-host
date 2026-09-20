/* ============================================================================
   The PBF / LFP / PAS views under Billing.

   Fifteen tree nodes, fourteen captured screens and one node no capture in
   the help-site corpus shows at all. Every header, button, filter and column
   below is transcribed from a specific capture, cited per view. Where builds
   disagree the newest is used, and the difference is noted.

   Two structural approximations are deliberate and flagged at their views:
   the Enrollment CR and LFP Provider Registration grids have two-row banded
   headers in MOIS, which this kit's DataWindow does not draw, so their band
   captions are folded into the sub-headers.

   The records are synthetic training data. The spelling mistakes marked
   `[sic]` are the application's own and are kept on purpose.
   ========================================================================= */

export type AdminField =
  | { kind: 'text'; label: string; value?: string; width?: number; hint?: string }
  | { kind: 'drop'; label: string; options: string[]; value?: string; width?: number; hint?: string }
  | { kind: 'lookup'; label: string; value?: string; width?: number; hint?: string }
  | { kind: 'check'; label: string; checked?: boolean; hint?: string }
  | { kind: 'radio'; label: string; options: string[]; value: string }
  | { kind: 'static'; label: string }

export type AdminGroup = { caption?: string; fields: AdminField[] }

export type AdminColumn = { key: string; header: string; width?: number; align?: 'left' | 'center' | 'right' }

export type AdminView = {
  node: string
  /** the view header, which often differs from the tree node's label */
  header: string
  commands: string[]
  groups?: AdminGroup[]
  tabs?: string[]
  columns?: AdminColumn[]
  rows?: Record<string, string>[]
  /** a text-only page, like the PAS folder's */
  body?: string[]
  /** the grey legend strip under a grid */
  footer?: string
  /** buttons along the bottom rather than the command row */
  actions?: string[]
  /** true when no capture of this view exists */
  missing?: boolean
  /** cited capture(s) */
  source: string
}

const CLOSE = 'Close Window'

export const billingAdminViews: AdminView[] = [
  /* --- PBF ------------------------------------------------------------- */
  {
    node: 'bl-pbf-enrol',
    header: 'PBF Patient Enrollment',
    commands: ['Edit', 'Refresh', 'Change Service Provider', 'Print', 'CSV Output', 'Chart Navigator', CLOSE],
    source: 'image(72).png (v02.28.07) and image(88).png',
    groups: [
      {
        caption: 'Selection Parameters',
        fields: [
          { kind: 'drop', label: 'Provider:', options: ['', 'BEARDWOOD, WALTER', 'SHEWCHUK, LEAH'], width: 198 },
          { kind: 'lookup', label: 'Patient Status:', width: 215 },
          { kind: 'text', label: 'Last Name:', width: 155 },
          { kind: 'text', label: 'First Name:', width: 155 },
          { kind: 'drop', label: 'Last Contact:', options: ['Ignore', 'In the last', 'Since'], value: 'Ignore', width: 80 },
        ],
      },
      {
        caption: 'Enrollment Status',
        fields: [
          { kind: 'drop', label: 'Enrollment:', options: ['Currently Active', 'Registered Start Date', 'Registered Stop Date'], value: 'Currently Active', width: 216 },
        ],
      },
    ],
    columns: [
      { key: 'chart', header: 'Chart', width: 52, align: 'right' },
      { key: 'last', header: 'Last Name', width: 108 },
      { key: 'first', header: 'First Name', width: 92 },
      { key: 'sex', header: '', width: 23, align: 'center' },
      { key: 'dob', header: 'DoB', width: 70, align: 'center' },
      { key: 'insurance', header: 'Insurance Nbr.', width: 78 },
      { key: 'by', header: 'By', width: 34, align: 'center' },
      { key: 'status', header: 'Status', width: 39, align: 'center' },
      { key: 'start', header: 'Start', width: 68, align: 'center' },
      { key: 'stop', header: 'Stop', width: 68, align: 'center' },
      { key: 'provider', header: 'Service Provider', width: 150 },
    ],
    rows: [
      { chart: '10035', last: 'BROWN', first: 'FARMER', sex: 'M', dob: '1990.10.23', insurance: '9151259051', by: 'BC', status: 'A', start: '2024.01.08', stop: '', provider: 'BEARDWOOD, WALTER' },
      { chart: '10088', last: 'HALE', first: 'MARGARET', sex: 'F', dob: '1955.07.19', insurance: '9151253340', by: 'BC', status: 'A', start: '2023.09.11', stop: '', provider: 'SHEWCHUK, LEAH' },
      { chart: '10204', last: 'RAO', first: 'PRIYA', sex: 'F', dob: '1984.12.02', insurance: '9151257712', by: 'BC', status: 'A', start: '2025.02.03', stop: '', provider: 'BEARDWOOD, WALTER' },
    ],
  },
  {
    node: 'bl-pbf-elig',
    header: 'MSP Eligibility Requests',
    commands: ['New', 'Delete', 'Open Chart', CLOSE],
    source: 'image(86).png (v02.28.04)',
    groups: [
      { caption: 'Status', fields: [{ kind: 'radio', label: '', options: ['All Records', 'New', 'Submitted', 'Processed', 'Failed'], value: 'All Records' }] },
      { caption: 'Time Frame (status date)', fields: [{ kind: 'radio', label: '', options: ['All', 'In Last', 'Since', 'Between'], value: 'All' }] },
      { caption: 'Other', fields: [
        { kind: 'text', label: 'Last Name:', width: 155 },
        { kind: 'text', label: 'Insurance No.:', width: 155 },
      ] },
    ],
    columns: [
      { key: 'last', header: 'Last Name', width: 94 },
      { key: 'first', header: 'First Name', width: 73 },
      { key: 'sex', header: '', width: 21, align: 'center' },
      { key: 'dob', header: 'DoB', width: 74, align: 'center' },
      { key: 'insurance', header: 'Insurance No.', width: 80 },
      { key: 'provider', header: 'Service Provider', width: 137 },
      { key: 'date', header: 'Status Date', width: 73, align: 'center' },
      { key: 'status', header: 'Status', width: 82, align: 'center' },
      { key: 'outcome', header: 'Outcome', width: 148 },
    ],
    rows: [
      { last: 'OKONKWO', first: 'SAM', sex: 'M', dob: '1969.05.28', insurance: '9151254496', provider: 'BEARDWOOD, WALTER', date: '2026.03.12', status: 'PROCESSED', outcome: 'PENDING REGISTRATION' },
      { last: 'CASTILLO', first: 'JUNE', sex: 'F', dob: '1947.01.30', insurance: '9151250264', provider: 'SHEWCHUK, LEAH', date: '2026.03.09', status: 'PROCESSED', outcome: 'REG. ANOTHER PAYEE' },
    ],
  },
  {
    node: 'bl-pbf-cr',
    header: 'Enrollment Change Requests (CR)',
    commands: ['Refresh', 'Tear Off', CLOSE],
    /* MOIS draws a two-row banded header here (Patient / Enrollment / Status /
       Reason / Requested By over Chart, Patient, Requested Date, Person,
       Date) and a taller 31px row carrying approve and reject icons. This
       kit's grid has one header row, so the band captions are folded in. */
    source: 'image(75).png (v02.28.07) for the chrome, image(454).png (v02.24.43) for the rows',
    tabs: ['Enroll Requests', 'Unenroll Requests'],
    groups: [
      { caption: 'Request Status', fields: [{ kind: 'radio', label: '', options: ['New CR', 'Approved CR', 'Rejected CR', 'All CR'], value: 'New CR' }] },
      { caption: 'Time Frame', fields: [{ kind: 'radio', label: '', options: ['All', 'In Last', 'Since', 'Between'], value: 'All' }] },
      { caption: 'Optional Parameters', fields: [
        { kind: 'static', label: 'Source of Change Request / Suggestion' },
        { kind: 'radio', label: '', options: ['Clinic User', 'MSP', 'Both'], value: 'Both' },
        { kind: 'text', label: 'Requested By:', width: 155 },
        { kind: 'text', label: 'Patient Last Name:', width: 155 },
      ] },
    ],
    columns: [
      { key: 'chart', header: 'Chart', width: 60, align: 'right' },
      { key: 'patient', header: 'Patient', width: 225 },
      { key: 'requested', header: 'Requested Date', width: 132, align: 'center' },
      { key: 'status', header: 'Status', width: 83, align: 'center' },
      { key: 'reason', header: 'Reason', width: 53, align: 'center' },
      { key: 'person', header: 'Person', width: 150 },
      { key: 'date', header: 'Date', width: 98, align: 'center' },
      { key: 'detail', header: '', width: 62, align: 'center' },
    ],
    rows: [
      { chart: '10035', patient: 'BROWN, FARMER  35 yr old M', requested: '2026.03.12', status: 'REQUESTED', reason: '', person: 'ADMINISTRATOR', date: '2026.03.12', detail: 'Detail' },
      { chart: '10247', patient: 'OKONKWO, SAM  56 yr old M', requested: '2026.03.10', status: 'REQUESTED', reason: '', person: 'ADMINISTRATOR', date: '2026.03.10', detail: 'Detail' },
    ],
  },
  {
    node: 'bl-pbf-unsent',
    header: 'Unsent Enrollment Claims List',
    commands: ['Delete Record', 'Edit Record', CLOSE],
    source: 'image(455).png (v02.24.34 — the only capture; its tree still reads "PCPC Management")',
    columns: [
      { key: 'last', header: 'Last Name', width: 124 },
      { key: 'first', header: 'First Name', width: 104 },
      { key: 'fee', header: 'Fee Code', width: 63 },
      { key: 'doctor', header: 'Doctor', width: 111 },
      { key: 'loc', header: 'Loc.', width: 34, align: 'center' },
      { key: 'service', header: 'Service', width: 71, align: 'center' },
      { key: 'dob', header: 'DoB', width: 71, align: 'center' },
      { key: 'insrBy', header: 'Insr By', width: 43, align: 'center' },
      { key: 'insrNbr', header: 'Insr Nbr', width: 74 },
      { key: 'compl', header: 'Compl', width: 40, align: 'center' },
      { key: 'hold', header: 'Hold', width: 52, align: 'center' },
    ],
    rows: [
      { last: 'BROWN', first: 'FARMER', fee: '96091', doctor: 'BEARDWOOD, WA...', loc: 'A', service: '2026.03.12', dob: '1990.10.23', insrBy: 'BC', insrNbr: '9151259051', compl: 'Y', hold: '' },
      { last: 'OKONKWO', first: 'SAM', fee: '96093', doctor: 'BEARDWOOD, WA...', loc: 'A', service: '2026.03.10', dob: '1969.05.28', insrBy: 'BC', insrNbr: '9151254496', compl: 'Y', hold: '' },
    ],
  },
  {
    node: 'bl-pbf-unack',
    header: 'Unack Enrollment Claims List',
    commands: ['Edit Record', CLOSE],
    source: 'image(76).png (v02.28.04)',
    columns: [
      { key: 'r1', header: 'R1', width: 34, align: 'center' },
      { key: 'r2', header: 'R2', width: 33, align: 'center' },
      { key: 'wo', header: 'WO', width: 33, align: 'center' },
      { key: 'last', header: 'Last Name', width: 146 },
      { key: 'first', header: 'First Name', width: 120 },
      { key: 'fee', header: 'Fee Code', width: 70 },
      { key: 'doctor', header: 'Doctor', width: 143 },
      { key: 'loc', header: 'Loc', width: 30, align: 'center' },
      { key: 'service', header: 'Service', width: 69, align: 'center' },
    ],
    rows: [
      { r1: '', r2: 'U', wo: 'N', last: 'HALE', first: 'MARGARET', fee: '96091', doctor: 'SHEWCHUK, LEAH', loc: 'A', service: '2026.03.05' },
    ],
  },
  {
    node: 'bl-pbf-failed',
    header: 'Failed Enrollment Claims List',
    commands: ['Edit Record', CLOSE],
    source: 'image(79).png (v02.28.04)',
    columns: [
      { key: 'r1', header: 'R1', width: 34, align: 'center' },
      { key: 'r2', header: 'R2', width: 33, align: 'center' },
      { key: 'wo', header: 'WO', width: 33, align: 'center' },
      { key: 'last', header: 'Last Name', width: 146 },
      { key: 'first', header: 'First Name', width: 120 },
      { key: 'fee', header: 'Fee Code', width: 70 },
      { key: 'doctor', header: 'Doctor', width: 143 },
      { key: 'loc', header: 'Loc', width: 30, align: 'center' },
      { key: 'service', header: 'Service', width: 69, align: 'center' },
      { key: 'e1', header: 'E1', width: 33, align: 'center' },
      { key: 'e2', header: 'E2', width: 34, align: 'center' },
      { key: 'e3', header: 'E3', width: 36, align: 'center' },
    ],
    rows: [
      { r1: 'F', r2: 'N', wo: '', last: 'CASTILLO', first: 'JUNE', fee: '96093', doctor: 'PBF GP (55555)', loc: 'A', service: '2026.01.13', e1: 'RE', e2: 'P9', e3: '' },
    ],
  },
  {
    node: 'bl-pbf-review',
    header: 'MSP Enrollment Change Requests',
    commands: ['Refresh', 'Delete', 'Open Chart', 'Replay', CLOSE],
    source: 'image(83).png (v02.28.04)',
    groups: [
      { caption: 'Records Type', fields: [{ kind: 'radio', label: '', options: ['All Errors', 'Chart Matching Error', 'Enrollment Conflict Error', 'Successfully Processed'], value: 'All Errors' }] },
      { caption: 'Time Frame (received date)', fields: [{ kind: 'radio', label: '', options: ['All', 'In Last', 'Since', 'Between'], value: 'All' }] },
      { caption: 'Other', fields: [
        { kind: 'drop', label: 'Request Type:', options: ['All', 'Registration', 'Deregistation'], value: 'All', width: 155 },
        { kind: 'text', label: 'Last Name:', width: 155 },
        { kind: 'text', label: 'PHN:', width: 155 },
      ] },
    ],
    columns: [
      { key: 'last', header: 'Last Name', width: 94 },
      { key: 'first', header: 'First Name', width: 79 },
      { key: 'sex', header: '', width: 21, align: 'center' },
      { key: 'dob', header: 'DoB', width: 73, align: 'center' },
      { key: 'phn', header: 'PHN', width: 76 },
      { key: 'request', header: 'Request', width: 80 },
      { key: 'reason', header: 'Reason', width: 48, align: 'center' },
      { key: 'recordStatus', header: 'Record Status', width: 180 },
      { key: 'detail', header: '-', width: 38, align: 'center' },
      { key: 'delete', header: '-', width: 42, align: 'center' },
      { key: 'replay', header: '-', width: 44, align: 'center' },
    ],
    /* "Deregistation" is the application's own misspelling, kept [sic] */
    rows: [
      { last: 'HALE', first: 'MARGARET', sex: 'F', dob: '1955.07.19', phn: '9151253340', request: 'Deregistation', reason: '02', recordStatus: 'No enrollment record to unenroll.', detail: 'Detail', delete: 'Delete', replay: 'Replay' },
    ],
  },
  {
    node: 'bl-pbf-audit',
    header: 'MSP Registry Audit',
    commands: [CLOSE],
    missing: true,
    source: 'no capture in the corpus, and no article documents it',
    body: [
      'No capture of this screen exists in the MOIS help site, and no article',
      'describes it. The node is left as a placeholder rather than guessed at.',
      '',
      'It sits between MSP CR Review and Enrollment Claim History in every',
      'cloud build, and is absent from the "MOIS: DAILY" builds, which',
      'suggests it is access-gated rather than new.',
    ],
  },
  {
    node: 'bl-pbf-history',
    header: 'Enrollment Claim History',
    commands: ['Refresh', CLOSE],
    source: 'image(84).png (v02.28.04)',
    groups: [
      { caption: 'History For', fields: [
        { kind: 'lookup', label: 'Chart:', width: 120 },
        { kind: 'lookup', label: 'Fee Code:', width: 120 },
      ] },
      { caption: 'Time Frame', fields: [
        { kind: 'radio', label: '', options: ['Sent Date', 'Paid Date'], value: 'Sent Date' },
        { kind: 'radio', label: '', options: ['All', 'In Last', 'Since', 'Between'], value: 'All' },
      ] },
      { caption: 'Requested By', fields: [
        { kind: 'check', label: 'Recon Code 1:  Include All', checked: true },
        { kind: 'check', label: 'Recon Code 2:  Include All', checked: true },
      ] },
    ],
    columns: [
      { key: 'r1', header: 'R1', width: 34, align: 'center' },
      { key: 'r2', header: 'R2', width: 33, align: 'center' },
      { key: 'wo', header: 'WO', width: 33, align: 'center' },
      { key: 'last', header: 'Last Name', width: 146 },
      { key: 'first', header: 'First Name', width: 120 },
      { key: 'fee', header: 'Fee Code', width: 70 },
      { key: 'doctor', header: 'Doctor', width: 143 },
      { key: 'loc', header: 'Loc', width: 30, align: 'center' },
      { key: 'service', header: 'Service', width: 69, align: 'center' },
      { key: 'e1', header: 'E1', width: 33, align: 'center' },
      { key: 'e2', header: 'E2', width: 34, align: 'center' },
      { key: 'e3', header: 'E3', width: 36, align: 'center' },
    ],
    rows: [
      { r1: '', r2: 'P', wo: 'N', last: 'BROWN', first: 'FARMER', fee: '96091', doctor: 'BEARDWOOD, WALTER', loc: 'A', service: '2024.01.08', e1: '', e2: '', e3: '' },
      { r1: '', r2: 'P', wo: 'N', last: 'RAO', first: 'PRIYA', fee: '96091', doctor: 'BEARDWOOD, WALTER', loc: 'A', service: '2025.02.03', e1: '', e2: '', e3: '' },
    ],
  },
  {
    node: 'bl-pbf-pcpc',
    header: 'PCPC Complexity Index Calculator',
    commands: [CLOSE],
    source: 'image(85).png (v02.28.04)',
    groups: [
      { caption: 'Include Patients', fields: [{ kind: 'radio', label: '', options: ['PBF Enrolled', 'Other'], value: 'PBF Enrolled' }] },
      { caption: 'Optional Filters', fields: [{ kind: 'radio', label: 'Primary Provider:', options: ['All Providers', 'Desktop Provider'], value: 'All Providers' }] },
      { caption: 'Patient Measurement', fields: [{ kind: 'check', label: 'Add a new Final Index record to each chart', checked: true }] },
      { caption: 'Direct Output to', fields: [{ kind: 'radio', label: '', options: ['Printable Report', 'MoH File', 'Chart Navigator', 'CSV File'], value: 'Printable Report' }] },
      { caption: 'Trouble Shooting Options', fields: [
        { kind: 'check', label: 'Turn On Logging', hint: '(Records additional information for each patient - could be used to investigate any issues)' },
        { kind: 'check', label: 'Turn On Debugging', hint: '(Records additional information for the patient panel - could be used to troubleshoot problems)' },
        { kind: 'check', label: 'Limit Number of Charts' },
      ] },
    ],
    actions: ['Run Calculator', 'Load Previous Results'],
  },

  /* --- LFP ------------------------------------------------------------- */
  {
    node: 'bl-lfp-setup',
    header: 'LFP - Setup',
    commands: ['Save', CLOSE],
    source: 'image(22).png (v02.31.41)',
    groups: [
      { caption: 'Configuration', fields: [
        { kind: 'check', label: 'Activate Longitudinal Family Physician Model', checked: true },
        { kind: 'check', label: 'Enable Time Claim Wizard', checked: true },
        { kind: 'text', label: 'LFP Payor Codes:', value: 'Blank,LFP', width: 200, hint: '(comma separated list of Payor Code(s) used by the Claim Wizard to identify LFP Appts)' },
      ] },
      { caption: 'Claim Codes', fields: [{ kind: 'text', label: 'Diagnosis:', value: 'L23', width: 80 }] },
    ],
    columns: [
      { key: 'code', header: 'Time Code', width: 66 },
      { key: 'description', header: 'Description', width: 309 },
      { key: 'location', header: 'Location', width: 70, align: 'center' },
    ],
    rows: [
      { code: '98010', description: 'CLINIC DIRECT PATIENT CARE TIME', location: 'L' },
      { code: '98011', description: 'INDIRECT PATIENT CARE TIME', location: 'L' },
      { code: '98012', description: 'CLINICAL ADMIN TIME', location: 'L' },
      { code: '98040', description: 'LOCUM CLINIC DIRECT PATIENT CARE', location: 'L' },
      { code: '98041', description: 'LOCUM INDIRECT PATIENT CARE TIME', location: 'L' },
      { code: '98042', description: 'LOCUM CLINICAL ADMINISTRATION TIME', location: 'L' },
      { code: '98119', description: 'TRAVEL TIME', location: '' },
      { code: '98120', description: 'LTC/PALLIATIVE - WEEKDAY', location: 'C' },
      { code: '98121', description: 'LTC/PLTV CARE - EVENING', location: 'C' },
      { code: '98122', description: 'LTC/PLTV CARE - WKND/STAT', location: 'C' },
      { code: '98123', description: 'LTC/PALLIATIVE - NIGHT', location: 'C' },
      { code: '98124', description: 'INPATIENT - WEEKDAY', location: 'I' },
      { code: '98125', description: 'INPATIENT - EVENING', location: 'I' },
      { code: '98126', description: 'INPATIENT - WKND/STAT', location: 'I' },
      { code: '98127', description: 'INPATIENT - NIGHT', location: 'I' },
      { code: '98128', description: 'PREG/NEWBORN - WEEKDAY', location: 'I' },
      { code: '98129', description: 'PREG/NEWBORN - EVENING', location: 'I' },
      { code: '98130', description: 'PREG/NEWBORN - WKND/STAT', location: 'I' },
      { code: '98131', description: 'PREG/NEWBORN - NIGHT', location: 'I' },
      { code: '98219', description: 'LOCUM TRAVEL TIME', location: '' },
    ],
  },
  {
    node: 'bl-lfp-reg',
    header: 'LFP Provider Registration',
    commands: ['Refresh', 'Enroll/Register', CLOSE],
    /* the capture's header is banded — LFP Enrollment over Family Phy./Locum,
       Registered Services over four service columns — folded in here */
    source: '2026_03_10_19_47_3612.png (v02.31.41)',
    groups: [
      { caption: 'Enrolled as', fields: [
        { kind: 'check', label: 'Family Physician', checked: true },
        { kind: 'check', label: 'Locum Physician', checked: true },
        { kind: 'check', label: 'Not enrolled', checked: true },
      ] },
      { caption: 'Registered services', fields: [
        { kind: 'static', label: 'Option:  Show all providers regardless of registered service(s)' },
        { kind: 'check', label: 'Clinic Based Services' },
        { kind: 'check', label: 'Inpatient Service' },
        { kind: 'check', label: 'LTC/Palliative Care Service' },
        { kind: 'check', label: 'Pregnancy / Newborn Service' },
      ] },
      { caption: 'Enrollment / Registration Status', fields: [
        { kind: 'radio', label: '', options: ['Any status', 'Currently Active', 'Expiring Soon', 'Has Expired'], value: 'Any status' },
      ] },
    ],
    columns: [
      { key: 'provider', header: 'Provider', width: 190 },
      { key: 'type', header: 'Type', width: 60 },
      { key: 'facility', header: 'Facility No.', width: 70, align: 'center' },
      { key: 'family', header: 'Family Phy.', width: 66, align: 'center' },
      { key: 'locum', header: 'Locum', width: 56, align: 'center' },
      { key: 'clinic', header: 'Clinic Based', width: 76, align: 'center' },
      { key: 'ltc', header: 'LTC/Palliative Care', width: 106, align: 'center' },
      { key: 'inpatient', header: 'Inpatient', width: 62, align: 'center' },
      { key: 'pregnancy', header: 'Pregnancy / Newborn', width: 118, align: 'center' },
    ],
    rows: [
      { provider: 'BEARDWOOD, WALTER', type: 'MD', facility: '00001', family: '✓', locum: '-', clinic: '✓', ltc: '✓', inpatient: '-', pregnancy: '-' },
      { provider: 'SHEWCHUK, LEAH', type: 'MD', facility: '00001', family: '✓', locum: '-', clinic: '✓', ltc: '-', inpatient: '✓', pregnancy: '✓' },
      { provider: 'HOWSER, DOOGIE', type: 'MD', facility: '00001', family: '-', locum: '✓*', clinic: '✓', ltc: '-', inpatient: '-', pregnancy: '-' },
      { provider: 'FAIRCHILD, NESRIN L', type: 'NP', facility: '00001', family: '-', locum: '-', clinic: '-', ltc: '-', inpatient: '-', pregnancy: '-' },
    ],
    footer: 'Status:   ✓ Current    ✓* Pending MSP approval    ⚠ Expiring Soon    ✗ Expired',
  },
  {
    node: 'bl-lfp-time',
    header: 'LFP Provider Time Review',
    commands: ['Refresh', 'New Entry', CLOSE],
    source: 'Screenshot (v02.30.12) — the only capture, downscaled, and its grid is empty',
    groups: [
      { caption: 'Time Frame', fields: [{ kind: 'radio', label: '', options: ['Today', 'Yesterday', 'In the Last', 'Range'], value: 'Today' }] },
    ],
    columns: [
      { key: 'provider', header: 'Provider', width: 175 },
      { key: 'date', header: 'Date', width: 69, align: 'center' },
      { key: 'direct', header: 'Direct', width: 55, align: 'right' },
      { key: 'indirect', header: 'Indirect', width: 55, align: 'right' },
      { key: 'clinical', header: 'Clinical', width: 55, align: 'right' },
      { key: 'total', header: 'Total', width: 53, align: 'right' },
      { key: 'locum', header: 'Locum For', width: 182 },
      { key: 'billing', header: 'MSP Billing Status', width: 148 },
    ],
    rows: [],
  },

  /* --- PAS ------------------------------------------------------------- */
  {
    node: 'bl-pas',
    header: 'Provincial Attachment System (PAS) - DOBC',
    commands: [],
    source: 'image(55).png (v02.31.23)',
    body: [
      'This section of MOIS is designed to help monitor patient chart status changes and help create PAS Patient Panel registration claims.',
      'Until the PAS System supports integrated patient panel managment features, MOIS must rely on MSP Teleplan claims.',
      '- Claim code 98990 is used to register a patient',
      "- Marking a claim as 'deleted' will flag the patient as being unregistered in MOIS.",
    ],
  },
  {
    node: 'bl-pas-changes',
    header: 'PAS Patient Status Change Review',
    commands: ['Refresh', CLOSE],
    source: 'image(56).png (v02.31.23)',
    groups: [
      { fields: [
        { kind: 'text', label: 'Status change between', value: '0000.00.00', width: 100 },
        { kind: 'text', label: 'and', width: 100 },
        { kind: 'drop', label: 'Service Provider', options: ['', 'BEARDWOOD, WALTER'], width: 213 },
        { kind: 'static', label: 'Shows charts that' },
        { kind: 'check', label: 'were added during the timeframe (New)', checked: true },
        { kind: 'check', label: 'the status changed during the timeframe (Changed)', checked: true },
        { kind: 'drop', label: 'Patient panel status', options: ['', 'Registered', 'Unregistered', 'Not Registered'], width: 130, hint: '(registration is determine by the most recent 98990 MSP claim)' },
      ] },
    ],
    columns: [
      { key: 'patient', header: 'Patient', width: 160 },
      { key: 'provider', header: 'Service Provider', width: 180 },
      { key: 'status', header: 'Status', width: 56 },
      { key: 'before', header: 'Before', width: 48 },
      { key: 'after', header: 'After', width: 40 },
      { key: 'pasProvider', header: 'PAS Provider', width: 139 },
      { key: 'pasReg', header: 'PAS Registration', width: 130 },
    ],
    rows: [],
    footer: '* Marking a patient as unregistered in MOIS is only changing the status of the MSP 98990 registration cliam, you will need to manually update the PAS system too.',
  },
  {
    node: 'bl-pas-panel',
    header: 'PAS Panel Review',
    commands: ['Refresh', CLOSE],
    source: 'image(57).png (v02.31.41)',
    groups: [
      { fields: [
        { kind: 'drop', label: 'Service Provider', options: ['PRACTITIONER, GENERAL', 'BEARDWOOD, WALTER'], value: 'PRACTITIONER, GENERAL', width: 213 },
        { kind: 'drop', label: 'Patient panel status', options: ['Registered', 'Unregistered', 'Not Registered'], value: 'Registered', width: 130 },
      ] },
    ],
    columns: [
      { key: 'patient', header: 'Patient', width: 234 },
      { key: 'insurance', header: 'Insurance', width: 112 },
      { key: 'date', header: 'Date', width: 88, align: 'center' },
      { key: 'pasProvider', header: 'PAS Provider', width: 180 },
    ],
    rows: [],
    footer: '* Marking a patient as unregistered in MOIS is only changing the status of the MSP 98990 registration cliam, you will need to manually update the PAS system too.',
  },
]

export const billingAdminView = (node: string): AdminView | undefined =>
  billingAdminViews.find((v) => v.node === node)
