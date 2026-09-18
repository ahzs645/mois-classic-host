/* Mock content transcribed from the MOIS training-environment screenshots. */
import type { PBTreeNode } from '../pb'
import {
  IconBilling, IconBook, IconCalendarGrid, IconChart, IconClock, IconFolder,
  IconGear, IconIdCard, IconPeople, IconPlusDoc, IconReport,
} from '../pb'

const f = (id: string, label: string, children?: PBTreeNode[]): PBTreeNode => ({
  id, label, icon: <IconFolder />, children,
})

export const patientChartTree: PBTreeNode[] = [
  { id: 'summary', label: 'Patient Summary', icon: <IconIdCard />, children: [
    f('demographic', 'Demographic'),
    f('determinants', 'Determinants of Health'),
    f('encounters', 'Encounters'),
    f('measures', 'Measures'),
    f('imaging', 'Imaging'),
    f('consults', 'Consults'),
    f('procedures', 'Procedures'),
    f('interventions', 'Interventions'),
    f('famhx', 'Family History'),
    f('allergy', 'Allergy / Intolerances', [f('reaction', 'Reaction Risks'), f('events', 'Events')]),
    f('ltm', 'Long Term Meds'),
    f('rx', 'Prescriptions', [f('printhx', 'Print History')]),
    f('mar', 'MAR'),
    f('socialhx', 'Social History'),
    f('documents', 'Documents'),
    f('issues', 'Health Issues', [f('conditions', 'Conditions'), f('risks', 'Risks for Conditions'), f('needs', 'Needs for Care')]),
    f('careplan', 'Care Plan', [
      f('prefs', 'Preferences'), f('goals', 'Goals'), f('actions', 'Planned Actions'),
      f('barriers', 'Barriers to Care'), f('resources', 'Patient Resources'), f('summarysettings', 'Summary Settings'),
    ]),
    f('forms', 'Forms', [f('paper', 'Paper Forms'), f('dynamic', 'Dynamic Forms'), f('encforms', 'Encounter Forms')]),
    f('orders', 'Orders'),
    f('admissions', 'Facility Admissions'),
    f('notifications', 'Notifications'),
    f('alerts', 'Alerts'),
    f('mhk', 'myhealthkey'),
  ]},
]

export const schedulerTree: PBTreeNode[] = [
  { id: 'prov', label: 'Provider Schedules', icon: <IconCalendarGrid />, children: [
    f('p-daybook', 'Day Book'),
    f('p-week1', 'Week View - 1 Provider'),
    f('p-day1', 'Day View - 1 Provider'),
    f('p-day3', 'Day View - 3 Providers'),
    f('p-day8', 'Day View - 8 Providers'),
  ]},
  { id: 'res', label: 'Resource Schedules', icon: <IconCalendarGrid />, children: [
    f('r-daybook', 'Day Book'),
    f('r-week1', 'Week View - 1 Resource'),
    f('r-day3', 'Day View - 3 Resources'),
    f('r-day8', 'Day View - 8 Resources'),
  ]},
  { id: 'group', label: 'Group Bookings', icon: <IconPeople /> },
  { id: 'waiting', label: 'Waiting List', icon: <IconBook />, children: [
    f('w-prov', 'Provider Lists'), f('w-res', 'Resource Lists'),
  ]},
  { id: 'blocks', label: 'Reservation Blocks', icon: <IconClock />, children: [
    f('b-prov', 'Provider'), f('b-res', 'Resource'),
  ]},
  { id: 'shift', label: 'Shift Manager', icon: <IconFolder />, children: [
    f('s-prov', 'Provider Shifts'), f('s-res', 'Resource Shifts'),
  ]},
]

/* --- trees for the other five modules ------------------------------------ */
export const workspaceTree: PBTreeNode[] = [
  { id: 'ws', label: 'My Workspace', icon: <IconPlusDoc />, children: [
    f('ws-inbox', 'Inbox'), f('ws-tasks', 'Tasks'),
    f('ws-review', 'Marked for Review'), f('ws-recent', 'Recent Charts'),
  ]},
]

export const billingTree: PBTreeNode[] = [
  { id: 'bl', label: 'Billing', icon: <IconBilling />, children: [
    f('bl-claims', 'Claims'), f('bl-batches', 'Submission Batches'),
    f('bl-remit', 'Remittances'), f('bl-rejects', 'Rejections'),
  ]},
]

export const adminTree: PBTreeNode[] = [
  { id: 'ad', label: 'Administration', icon: <IconChart />, children: [
    f('ad-users', 'Users'), f('ad-providers', 'Providers'),
    f('ad-locations', 'Service Locations'), f('ad-tables', 'Maintenance Tables'),
    f('ad-audit', 'Audit Log'),
  ]},
]

export const exchangeTree: PBTreeNode[] = [
  { id: 'dx', label: 'Data Exchange', icon: <IconGear />, children: [
    f('dx-inbound', 'Inbound'), f('dx-outbound', 'Outbound'),
    f('dx-errors', 'Errors'), f('dx-hl7', 'HL7 Interfaces'),
  ]},
]

export const reportsTree: PBTreeNode[] = [
  { id: 'rp', label: 'Reports', icon: <IconReport />, children: [
    f('rp-clinical', 'Clinical'), f('rp-financial', 'Financial'),
    f('rp-admin', 'Administrative'), f('rp-scheduled', 'Scheduled'),
  ]},
]

export const modules = [
  { id: 'chart', label: 'Patient Chart', icon: <IconIdCard /> },
  { id: 'workspace', label: 'Workspace', icon: <IconPlusDoc /> },
  { id: 'scheduler', label: 'Scheduler', icon: <IconCalendarGrid /> },
  { id: 'billing', label: 'Billing', icon: <IconBilling /> },
  { id: 'admin', label: 'Administration', icon: <IconChart /> },
  { id: 'exchange', label: 'Data Exchange', icon: <IconGear /> },
  { id: 'reports', label: 'Reports', icon: <IconReport /> },
]

export type PBTheme = '' | 'pb-theme--flat' | 'pb-theme--classic'

export const THEMES: { id: PBTheme; label: string }[] = [
  { id: '', label: 'MOIS Hybrid (Win10 frame, Win32 controls)' },
  { id: 'pb-theme--flat', label: 'Windows 10 Flat' },
  { id: 'pb-theme--classic', label: 'Classic 95 / 98' },
]

type MdiLike = {
  instances: { key: string; title: string }[]
  focus: (key: string) => void
  closeAll: () => void
}

export const makeMainMenu = (
  setTheme: (t: PBTheme) => void,
  onLogin: () => void,
  mdi?: MdiLike,
  /** opens the component gallery; omitted when embedded, where the host owns the URL */
  onKit?: () => void,
) => [
  { label: 'Record', menu: [
    { label: 'New Record', key: 'Ctrl+N' }, { label: 'Save', key: 'Ctrl+S' },
    { label: 'Delete Record' }, { sep: true }, { label: 'Undo', key: 'Ctrl+Z' }, { label: 'Refresh', key: 'F5' },
  ]},
  { label: 'Modules', menu: [
    { label: 'Patient Chart' }, { label: 'Workspace' }, { label: 'Scheduler' },
    { label: 'Billing' }, { label: 'Administration' }, { label: 'Data Exchange' }, { label: 'Reports' },
  ]},
  { label: 'Views', menu: [
    { label: 'Patient Summary' }, { label: 'Encounters' }, { label: 'Orders' },
    { sep: true }, { label: 'Close All Views' },
    { sep: true },
    ...THEMES.map((t) => ({ label: `Appearance: ${t.label}`, onSelect: () => setTheme(t.id) })),
  ]},
  { label: 'Action', menu: [
    { label: 'Create Appointment…' }, { label: 'Go To Chart…' }, { sep: true },
    { label: 'Mark for Review' }, { label: 'Attachment…' },
  ]},
  { label: 'Utilities', menu: [
    { label: 'Spell Check' }, { label: 'Preferences…' },
    { label: 'Change Password…', onSelect: onLogin },
    { sep: true }, { label: 'Sign In As…', onSelect: onLogin },
  ]},
  { label: 'Print', menu: [{ label: 'Print List' }, { label: 'Print Encounter' }, { label: 'Print Setup…' }] },
  { label: 'Maintenance', menu: [{ label: 'Tables…' }, { label: 'Providers…' }, { label: 'Service Locations…' }] },
  /* an MDI frame lists its open sheets under Window */
  { label: 'Window', menu: [
    ...(mdi?.instances.length
      ? mdi.instances.map((i, n) => ({
          label: `${n + 1}  ${i.title}`,
          onSelect: () => mdi.focus(i.key),
        }))
      : [{ label: '(no windows open)', disabled: true }]),
    { sep: true },
    { label: 'Close All', disabled: !mdi?.instances.length, onSelect: () => mdi?.closeAll() },
  ]},
  { label: 'Help', menu: [
    { label: 'Contents', key: 'F1' }, { sep: true },
    ...(onKit ? [{ label: 'UI Kit gallery…', onSelect: onKit }] : []),
    { label: 'About MOIS…' },
  ]},
]

export const statusCells = [
  { text: 'Ready.', width: 122 },
  { links: ['Go To Chart…', 'Create Appointment…'], grow: true },
  { label: 'Task Item: ', value: '-', width: 148 },
  { label: 'Msg Item: ', value: '-', width: 148 },
  { label: 'User: ', value: 'JALA2', width: 150 },
  { label: 'Site ID: ', value: '_dev', width: 100 },
  { text: 'v02.31.23 b250508', width: 132 },
]

export const patient = {
  chart: '3924',
  first: 'PATCH', middle: 'JULIAN', last: 'AADAMS',
  full: 'PATCH JULIAN AADAMS',
  short: 'PATCH AADAMS',
  dob: '1986.12.19', age: '39 YR OLD', sex: 'M',
  bchn: 'AB *7996654321 00',
  phone: '250-765-3212',
  encounter: '10065087',
}

export const orderRows = [
  { date: '2026.07.10', type: '', by: 'GHATAVI, KAYHAN', to: '', for: '', st: 'IP', links: '1' },
  { date: '2026.07.07', type: '', by: '(RN) DHALIWAL, RUPIN…', to: '', for: 'dot updated', st: 'IP', links: '1' },
  { date: '2026.07.02', type: '', by: '(LPN) GRUBB, HELENA', to: '', for: '', st: 'IP', links: '1' },
  { date: '2026.07.01', type: 'CONSULTATION', by: 'ESIEVOADJE, EVONEM…', to: '', for: '', st: 'IP', links: '-' },
  { date: '2026.07.01', type: 'CONSULTATION', by: 'ESIEVOADJE, EVONEM…', to: 'SMITH, DALENE', for: 'HYPERTENSION - BENIGN', st: 'IP', links: '1' },
  { date: '2026.07.01', type: 'IMAGE', by: 'ESIEVOADJE, EVONEM…', to: '', for: 'STANDARD OUT-PATIENT BREAST IM…', st: 'IP', links: '1' },
]

export const encounterRows = [
  { id: '10065087', date: '2030.05.03', hr: '08', mn: '15', code: 'X', mode: 'DE', nbr: '30', provider: '<SEE NOTE>', reason: '', loc: '', alert: true },
  { id: '10065086', date: '2030.05.02', hr: '08', mn: '30', code: 'X', mode: 'DE', nbr: '12', provider: '<SEE NOTE>', reason: 'LTTCM MEETING', loc: 'DAW HEALTH UNIT', alert: true },
  { id: '10065085', date: '2030.04.26', hr: '08', mn: '15', code: 'X', mode: 'DE', nbr: '30', provider: '<SEE NOTE>', reason: '', loc: '', alert: true },
  { id: '10065084', date: '2030.04.25', hr: '08', mn: '30', code: 'X', mode: 'DE', nbr: '12', provider: '<SEE NOTE>', reason: 'LTTCM MEETING', loc: 'DAW HEALTH UNIT', alert: true },
  { id: '10065083', date: '2030.04.19', hr: '08', mn: '15', code: 'X', mode: 'DE', nbr: '30', provider: '<SEE NOTE>', reason: '', loc: '', alert: true },
  { id: '10065082', date: '2030.04.18', hr: '08', mn: '30', code: 'X', mode: 'DE', nbr: '12', provider: '<SEE NOTE>', reason: 'LTTCM MEETING', loc: 'DAW HEALTH UNIT', alert: true },
  { id: '10065081', date: '2030.04.12', hr: '08', mn: '15', code: 'X', mode: 'DE', nbr: '30', provider: '<SEE NOTE>', reason: '', loc: '', alert: true },
  { id: '10065080', date: '2030.04.11', hr: '08', mn: '30', code: 'X', mode: 'DE', nbr: '12', provider: '<SEE NOTE>', reason: 'LTTCM MEETING', loc: 'DAW HEALTH UNIT', alert: true },
  { id: '10065079', date: '2030.04.05', hr: '08', mn: '15', code: 'X', mode: 'DE', nbr: '30', provider: '<SEE NOTE>', reason: '', loc: '', alert: true },
]

/* --- Demographics ▸ Incentives ------------------------------------------ */
export const incentiveRows = [
  { start: '2026.08.12', end: '2026.08.13', diag: 'A430', fee: '10 OR 24 HOUR TENSION CURVE - DIURNAL', freq: '12' },
]

export const mspClaimRows: Record<string, string>[] = []

/* --- Notification ▸ Messages -------------------------------------------- */
export const messageRows = [
  {
    flag: '', att: '', sent: '2026.08.11', m: '',
    subject: 'Lab results ready for review — CBC + differential',
    by: 'ESIEVOADJE, EVONEME',
    body: 'CBC and differential returned within normal limits.\r\nNo action required; filed to chart.',
  },
  {
    flag: '!', att: '\u{1F4CE}', sent: '2026.08.10', m: '',
    subject: 'Referral acknowledged — CARDIOLOGY',
    by: 'SMITH, DALENE',
    body: 'Referral received. Patient will be contacted within 10 business days.',
  },
  {
    flag: '', att: '', sent: '2026.08.08', m: '\u2713',
    subject: 'Encounter form returned incomplete',
    by: 'GRUBB, HELENA',
    body: 'Visit reason and service location were left blank on the 2026.08.08 encounter.',
  },
]

/* --- Scheduler ▸ Group Visit List --------------------------------------- */
export const groupVisitRows = [
  { date: '', hr: '00', min: '00', n: '3', provider: 'TECHNICAL SUPPORT', topic: '', desc: '', code: '', loc: '', series: false },
  { date: '', hr: '00', min: '00', n: '3', provider: 'TECHNICAL SUPPORT', topic: '', desc: 'Test', code: '', loc: '', series: false },
  { date: '2025.10.30', hr: '13', min: '00', n: '12', provider: 'MURPHY, JOAN', topic: '', desc: 'MULTIPLE PREGNANCY', code: 'G', loc: 'CLOUD CITY', series: true },
  { date: '2025.10.23', hr: '13', min: '00', n: '12', provider: 'MURPHY, JOAN', topic: '', desc: 'MULTIPLE PREGNANCY', code: 'G', loc: 'CLOUD CITY', series: true },
  { date: '2025.10.16', hr: '13', min: '00', n: '6', provider: 'PCIPT 1 NURSE 1 TER', topic: '428', desc: 'CONGESTIVE HEART FAILURE', code: 'G', loc: 'CLOUD CITY', series: false },
  { date: '2025.10.16', hr: '13', min: '00', n: '12', provider: 'MURPHY, JOAN', topic: '', desc: 'MULTIPLE PREGNANCY', code: 'G', loc: 'CLOUD CITY', series: true },
  { date: '2025.10.08', hr: '13', min: '00', n: '6', provider: 'PCIPT 1 NURSE 1 TER', topic: '428', desc: 'CONGESTIVE HEART FAILURE', code: 'G', loc: 'CLOUD CITY', series: false },
  { date: '2025.10.08', hr: '13', min: '00', n: '6', provider: 'PCIPT 1 NURSE 2 PRG', topic: '428', desc: 'CONGESTIVE HEART FAILURE', code: 'G', loc: 'CLOUD CITY', series: false },
  { date: '2025.10.08', hr: '13', min: '00', n: '6', provider: 'PCIPT 1 NURSE 1 TER', topic: '428', desc: 'CONGESTIVE HEART FAILURE', code: 'G', loc: 'CLOUD CITY', series: false },
  { date: '2025.09.25', hr: '15', min: '00', n: '3', provider: 'PCIPT 1 NURSE 3 PRG', topic: '', desc: 'TEST FOR CLONING APTS', code: 'G', loc: 'FRASER LAKE', series: false },
  { date: '2025.09.25', hr: '15', min: '00', n: '3', provider: 'PCIPT 1 NURSE 2 PRG', topic: '', desc: 'TEST FOR CLONING APTS', code: 'G', loc: 'FRASER LAKE', series: false },
  { date: '2025.09.20', hr: '15', min: '00', n: '3', provider: 'PCIPT 1 NURSE 4 PRG', topic: '', desc: 'TEST FOR CLONING APTS', code: 'G', loc: 'FRASER LAKE', series: false },
]

/* --- Encounter ▸ Measurements ------------------------------------------- */
export const measurementRows = [
  { code: '90754', name: 'OXYTETRACYCLINE SPEC-MCNT', value: '', flag: '-', units: 'mg/kg; ppm' },
]

/* --- Order ▸ History ----------------------------------------------------- */
export const orderHistoryRows: Record<string, string>[] = []

/* --- Care Plan family ----------------------------------------------------
   One PowerBuilder window, six bindings. `descHeader`/`descLabel` and the
   Linked tabs are all that actually change between them.                  */
/* Goals outgrew this family — it has its own grid and five tabs — so it now
   lives in GoalsView. The rest still share one window. */
export type CarePlanKey =
  | 'needs' | 'actions' | 'barriers' | 'risks' | 'conditions'

export type CarePlanConfig = {
  title: string
  descLabel: string
  hasRisk: boolean
  riskLow: string
  riskHigh: string
  tabs: string[]
  linkedBand: string
  columns: CarePlanColumn[]
  rows: Record<string, string>[]
}

export type CarePlanColumn = {
  key: string
  header: React.ReactNode
  width?: number
  align?: 'left' | 'center' | 'right'
  dots?: boolean
  /** render the cell as a checkbox rather than text */
  check?: boolean
}

export const carePlanScreens: Record<CarePlanKey, CarePlanConfig> = {
  needs: {
    title: 'Need for Care', descLabel: 'Need Desc.:',
    hasRisk: true, riskLow: 'Low Risk', riskHigh: 'High Risk',
    tabs: ['Detail', 'Linked Goals'], linkedBand: 'Linked Goals - Read Only',
    columns: [
      { key: 'start', header: 'Start', width: 72, align: 'center' },
      { key: 'end', header: 'End', width: 72, align: 'center' },
      { key: 'desc', header: 'Need Description' },
      { key: 'participants', header: 'Participant(s)', width: 196 },
      { key: 's', header: 'S', width: 24, align: 'center', check: true },
      { key: 'clip', header: '\u{1F4CE}', width: 22, align: 'center' },
    ],
    rows: [{ start: '', end: '', desc: '', participants: '', clip: '-' }],
  },
  actions: {
    title: 'Planned Actions', descLabel: 'Action:',
    hasRisk: false, riskLow: '', riskHigh: '',
    tabs: ['Detail', 'Linked Goals'], linkedBand: 'Linked Goals',
    columns: [
      { key: 'start', header: <>Planned<br />Start</>, width: 66, align: 'center' },
      { key: 'end', header: <>Planned<br />End</>, width: 66, align: 'center' },
      { key: 'desc', header: 'Action' },
      { key: 'participants', header: 'Participant(s)', width: 150 },
      { key: 'completed', header: <>Action<br />Completed</>, width: 66, align: 'center', check: true },
      { key: 'compdate', header: <>Completed<br />Date</>, width: 76, align: 'center' },
      { key: 's', header: 'S', width: 24, align: 'center', check: true },
      { key: 'clip', header: '\u{1F4CE}', width: 22, align: 'center' },
    ],
    rows: [{ start: '', end: '', desc: '', participants: '', compdate: '', clip: '-' }],
  },
  risks: {
    title: 'Risk for Condition', descLabel: 'Risk:',
    hasRisk: false, riskLow: '', riskHigh: '',
    tabs: ['Detail', 'Linked Goals'], linkedBand: 'Linked Goals - Read Only',
    columns: [
      { key: 'start', header: 'Start', width: 76, align: 'center' },
      { key: 'end', header: 'End', width: 76, align: 'center' },
      { key: 'desc', header: 'Risk Code/Description' },
      { key: 'd', header: '', dots: true },
      { key: 'rank', header: 'Rank', width: 48, align: 'center' },
      { key: 'source', header: 'Source', width: 104, align: 'center' },
      { key: 's', header: 'S', width: 24, align: 'center', check: true },
      { key: 'neg', header: 'Neg.', width: 34, align: 'center', check: true },
      { key: 'm', header: 'M', width: 22, align: 'center' },
      { key: 'clip', header: '\u{1F4CE}', width: 22, align: 'center' },
    ],
    rows: [
      { start: '', end: '', desc: 'VASOVAGAL SYNCOPE*', rank: '', source: 'PROVIDER', m: '', clip: '-' },
      { start: '2025.02.26', end: '', desc: 'EYE TESTS*', rank: '', source: 'PATIENT', m: '', clip: '-' },
    ],
  },
  conditions: {
    title: 'Conditions', descLabel: 'Condition:',
    hasRisk: false, riskLow: '', riskHigh: '',
    tabs: ['Detail', 'Linked Goals'], linkedBand: 'Linked Goals - Read Only',
    columns: [
      { key: 'start', header: 'Start', width: 76, align: 'center' },
      { key: 'end', header: 'End', width: 76, align: 'center' },
      { key: 'desc', header: 'Condition' },
      { key: 'd', header: '', dots: true },
      { key: 'certainty', header: 'Certainty', width: 96, align: 'center' },
      { key: 's', header: 'S', width: 24, align: 'center', check: true },
      { key: 'm', header: 'M', width: 22, align: 'center' },
      { key: 'clip', header: '\u{1F4CE}', width: 22, align: 'center' },
    ],
    rows: [{ start: '2026.08.12', end: '', desc: 'ACROPHOBIA', certainty: 'Confirmed', m: '', clip: '-' }],
  },
  barriers: {
    title: 'Barriers to Care', descLabel: 'Barrier:',
    hasRisk: true, riskLow: 'Minor', riskHigh: 'Major',
    tabs: ['Detail'], linkedBand: 'Linked Goals - Read Only',
    columns: [
      { key: 'start', header: 'Start', width: 76, align: 'center' },
      { key: 'end', header: 'End', width: 76, align: 'center' },
      { key: 'desc', header: 'Barrier Description' },
      { key: 'participants', header: 'Participant(s)', width: 180 },
      { key: 's', header: 'S', width: 24, align: 'center', check: true },
      { key: 'clip', header: '\u{1F4CE}', width: 22, align: 'center' },
    ],
    rows: [{ start: '', end: '', desc: '', participants: '', clip: '-' }],
  },
}

export const linkedGoalRows = [
  {
    group: 'GOALS', start: '2026.08.12', end: '', desc: 'DEV AUDIT GOAL',
    phase: 'INITIATION', s: '', by: 'JALIL, AHMAD', when: '2026.08.12  12:26',
  },
]

/* --- Order ▸ Distribution / Links ---------------------------------------- */
export const orderDistributionRows: Record<string, string>[] = []
export const orderLinkRows: Record<string, string>[] = []

/* --- Notification: each tab is its own DataWindow ------------------------ */
export type NotificationTab = {
  list: string
  columns: { key: string; header: string; width?: number; align?: 'left' | 'center' | 'right' }[]
  filters: 'wide' | 'recall' | 'task' | 'one' | 'none'
  /** Responses stacks a second read-only grid instead of a detail pane */
  split?: boolean
  lower?: { list: string; columns: NotificationTab['columns'] }
  lowerTabs?: string[]
  rows: Record<string, string>[]
}

export const notificationTabs: Record<string, NotificationTab> = {
  Reminders: {
    list: 'Reminder List', filters: 'one',
    columns: [
      { key: 'flag', header: '', width: 16, align: 'center' },
      { key: 'reminder', header: 'Reminder' },
      { key: 'start', header: 'Start Date', width: 100, align: 'center' },
      { key: 'stop', header: 'Stop', width: 74, align: 'center' },
      { key: 'm', header: 'M', width: 24, align: 'center' },
    ],
    rows: [],
  },
  Recalls: {
    list: 'Recall List', filters: 'recall',
    columns: [
      { key: 'flag', header: '', width: 16, align: 'center' },
      { key: 'code', header: 'Code', width: 110, align: 'center' },
      { key: 'note', header: 'Note' },
      { key: 'due', header: 'Due', width: 100, align: 'center' },
      { key: 'stop', header: 'Stop', width: 74, align: 'center' },
      { key: 'm', header: 'M', width: 24, align: 'center' },
    ],
    rows: [],
  },
  Tasks: {
    list: 'Task List', filters: 'task', lowerTabs: ['Detail', 'Follow Up Notes (0)'],
    columns: [
      { key: 'flag', header: '', width: 16, align: 'center' },
      { key: 'att', header: '', width: 16, align: 'center' },
      { key: 'due', header: 'Due', width: 86, align: 'center' },
      { key: 'task', header: 'Task' },
      { key: 'ack', header: 'Ack.', width: 46, align: 'center' },
      { key: 'complete', header: 'Complete', width: 62, align: 'center' },
      { key: 'created', header: 'Created', width: 70, align: 'center' },
      { key: 'by', header: 'Created By', width: 94 },
      { key: 'm', header: 'M', width: 24, align: 'center' },
    ],
    rows: [],
  },
  Messages: {
    list: 'Message List', filters: 'wide', lowerTabs: ['Detail', 'Attachments'],
    columns: [
      { key: 'flag', header: '', width: 16, align: 'center' },
      { key: 'att', header: '', width: 16, align: 'center' },
      { key: 'sent', header: 'Sent', width: 96, align: 'center' },
      { key: 'subject', header: 'Subject' },
      { key: 'by', header: 'Sent By', width: 148 },
      { key: 'm', header: 'M', width: 24, align: 'center' },
    ],
    rows: messageRows,
  },
  /* the Responses tab is two stacked read-only grids, with no filter row
     and no lower tab set */
  'Responses - READ ONLY': {
    list: '[READ-ONLY] Response Summary', filters: 'none', split: true,
    columns: [
      { key: 'called', header: 'Called', width: 120, align: 'center' },
      { key: 'contact', header: 'Contact', width: 130, align: 'center' },
      { key: 'desc', header: 'Description' },
      { key: 'status', header: 'Status', width: 190, align: 'center' },
      { key: 'response', header: 'Response', width: 142, align: 'center' },
    ],
    lower: {
      list: '[READ-ONLY] Call Statistics',
      columns: [
        { key: 'last', header: 'Last Called', width: 120, align: 'center' },
        { key: 'contact', header: 'Contact', width: 130, align: 'center' },
        { key: 'data', header: 'Contact Data' },
        { key: 'status', header: 'Status', width: 190, align: 'center' },
        { key: 'total', header: 'Total Calls', width: 110, align: 'center' },
      ],
    },
    rows: [],
  },
}

/* --- Goals ▸ list ------------------------------------------------------- */
export const goalRows = [
  {
    start: '2026.08.12', end: '', goal: 'DEV AUDIT GOAL', phase: 'INITIATION',
    quant: true, commit: '', importance: '', s: false,
  },
  {
    start: '2026.08.12', end: '2026.08.13', goal: 'DEV GOAL', phase: 'TERMINATION',
    quant: false, commit: '', importance: '', s: false,
  },
]

/* --- Demographics ▸ Settings -------------------------------------------- */
export const clinicContactRows = [
  { reason: 'SCHEDULER', order: '1', method: 'VOICE', source: 'PREFERRED', contact: '' },
  { reason: 'SCHEDULER', order: '2', method: 'VOICE', source: 'CELL', contact: '' },
  { reason: 'SCHEDULER', order: '3', method: 'VOICE', source: 'HOME', contact: '' },
]

export const patientContactRows = [
  { reason: 'OTHER', order: '1', method: 'EMAIL', source: 'PREFERRED', contact: 'leminor@gmail.com' },
]

/* --- Demographics ▸ Benefits -------------------------------------------- */
export const benefitRows = [
  { group: 'MSP', benefit: 'BASIC COVERAGE', demo: 'X', careplan: 'X' },
]

/* --- Imaging Reports ----------------------------------------------------- */
export const imagingRows: Record<string, string>[] = []

/* --- Goals ▸ Linked tabs -------------------------------------------------
   Unlike the read-only "Linked X" tabs on the care-plan window, these carry
   their own command row and a different column set each.                  */
export const goalLinkedTabs = {
  'Linked Health Issue(s)': {
    commands: ['Link Health Issue(s)', 'Unlink Health Issue'],
    group: 'HEALTH CONDITION',
    flags: [{ key: 'sensitive', header: 'Sensitive', width: 62 }],
    rows: [
      { group: 'HEALTH CONDITION', start: '2026.08.12', end: '', desc: 'ACROPHOBIA',
        by: 'JALIL, AHMAD', when: '2026.08.12  11:52' },
    ],
  },
  'Linked Action(s)': {
    commands: ['New Action', 'Delete Action', 'Link Action(s)', 'Unlink Action', 'Edit Action'],
    group: 'PLANNED ACTIONS',
    flags: [
      { key: 'completed', header: 'Completed', width: 66 },
      { key: 'sensitive', header: 'Sensitive', width: 62 },
    ],
    rows: [
      { group: 'PLANNED ACTIONS', start: '', end: '', desc: '',
        by: 'JALIL, AHMAD', when: '2026.08.12  12:28' },
    ],
  },
} as const

/* --- Patient Service Event ----------------------------------------------- */
export const serviceHealthIssueRows = [
  { issue: 'ADJUSTMENT REACTION - OTHER', certainty: 'Confirmed' },
]

export const linkedOrderRows = [
  { date: '2025-12-30', by: 'GRAHAM, CHELSEA', to: 'TECHNICAL SUPPORT', desc: 'test' },
]

/* --- Rx / Long Term Medications ------------------------------------------ */
export const prescriptionRows = [
  { order: '2026.07.06', med: 'CEFTRIAXONE FOR INJECTION USP 250 mg Powder For Solution', dose: '', amount: '', type: '', m: '', clip: '-',
    generic: 'CEFTRIAXONE (CEFTRIAXONE SODIUM) 250 mg [Intramuscular Powder For Solution]' },
  { order: '2026.06.26', med: 'CEFTRIAXONE SODIUM FOR INJECTION BP 500 mg Powder For …', dose: '', amount: '', type: '', m: '', clip: '-', generic: '' },
  { order: '2026.06.26', med: 'NH0041', dose: '', amount: '', type: '', m: '', clip: '-', generic: '' },
  { order: '2026.05.14', med: 'METHADONE HYDROCHLORIDE 1 mg [Oral Solution]', dose: '', amount: '', type: 'CPP', m: '', clip: '-', generic: '' },
  { order: '2026.05.08', med: 'CEFTRIAXONE FOR INJECTION USP 250 mg Powder For Solution', dose: '', amount: '', type: '', m: '', clip: '-', generic: '' },
  { order: '2026.05.07', med: 'SUBOXONE 8 mg Tablet', dose: '', amount: '', type: 'CPP', m: '', clip: '-', generic: '' },
  { order: '2026.04.21', med: 'BICILLIN L-A 1200000 unit Suspension', dose: '1 DOSE Intramuscular WEE…', amount: '', type: '\u21e9', m: '', clip: '-', generic: '' },
  { order: '2026.04.21', med: 'BICILLIN L-A 1200000 unit Suspension', dose: '1 DOSE Intramuscular DAIL…', amount: '1 DAY', type: '\u21e9', m: '', clip: '-', generic: '' },
  { order: '2026.02.23', med: 'HYDROMORPHONE HYDROCHLORIDE 10MG LIQUID', dose: '', amount: '', type: 'CPP', m: '', clip: '-', generic: '' },
  { order: '2026.02.19', med: 'ISONIAZID', dose: '400 MG Oral DAILY', amount: '3 MONTH', type: '', m: '', clip: '-', generic: '' },
]

export const longTermMedRows = [
  { start: '2026.01.10', end: '', med: 'INSULIN GLARGINE 100 UNIT [SUBCUTANEOUS SOLUTION]', dose: '2 mg daily', indic: '', type: '\u21e9', m: '-',
    generic: 'INSULIN GLARGINE 100UNIT SOLUTION' },
  { start: '2025.10.31', end: '', med: 'ISONIAZID', dose: '400 MG Oral DAILY', indic: '', type: '', m: '1', generic: '' },
  { start: '2026.01.10', end: '', med: 'ISONIAZID', dose: '400 MG Oral DAILY', indic: '', type: '', m: '-', generic: '' },
  { start: '2026.01.10', end: '', med: 'TESTOSTERONE CYPIONATE 100 mg [Intramuscular Solu…', dose: '20mg (0.2ml) sc qweek', indic: '', type: '', m: '-', generic: '' },
  { start: '', end: '2026.01.10', med: '', dose: '', indic: '', type: '', m: '-', generic: '' },
  { start: '2025.01.15', end: '2026.01.10', med: 'INSULIN GLARGINE 100 unit [Subcutaneous Solution]', dose: '', indic: '', type: '\u21e9', m: '-', generic: '' },
  { start: '2025.09.22', end: '2026.01.10', med: 'ISONIAZID', dose: '400 MG Oral DAILY', indic: '', type: '', m: '1', generic: '' },
  { start: '2025.09.22', end: '2025.10.31', med: 'ISONIAZID', dose: '400 MG Oral DAILY', indic: '', type: '', m: '-', generic: '' },
  { start: '2025.03.11', end: '2025.09.22', med: 'ISONIAZID', dose: '200 MG daily', indic: '', type: '', m: '1', generic: '' },
]

/* --- Provider Waiting List ----------------------------------------------- */
export const waitListNames = [
  { name: 'BIRCHVIEW', desc: '' },
  { name: 'GATEWAY', desc: '' },
  { name: 'JUBILEE', desc: '' },
  { name: 'MENTAL HEALTH SERVICES', desc: '' },
  { name: 'NURSING SERVICES', desc: '' },
  { name: 'PARKVIEW', desc: '' },
  { name: 'COVID-19 VACCINATION', desc: 'waitlist for COVID-19 vaccination appointments' },
  { name: 'HIMS - COVID DEMOGRAPHICS', desc: 'Needs demographics corrected or updated' },
  { name: 'HIMS - COVID DECEASED', desc: '' },
  { name: 'HIMS - COVID OTHER', desc: '' },
]

export const waitListRows = [
  { row: '1', last: '', first: '', chart: '', added: '2022.04.01', wt: '1594', bkd: '\u2713', list: '', reason: '', priority: '' },
  { row: '2', last: '', first: '', chart: '', added: '2025.06.19', wt: '419', bkd: '\u2717', list: '', reason: '', priority: '' },
  { row: '3', last: 'AADAMS', first: 'PATCH', chart: '10006', added: '2019.01.14', wt: '2767', bkd: '\u2713', list: '', reason: '', priority: '' },
  { row: '4', last: 'ABADZADESAHRAE', first: 'SINA', chart: '66718', added: '2023.01.31', wt: '1289', bkd: '\u2713', list: '', reason: '', priority: '' },
  { row: '5', last: 'ABBOT', first: 'MIKEL', chart: '15633', added: '2023.01.31', wt: '1289', bkd: '\u2713', list: '', reason: '', priority: '' },
  { row: '6', last: 'ABBOTT', first: 'DANIEL', chart: '33817', added: '2019.10.08', wt: '2500', bkd: '\u2713', list: '', reason: '', priority: '' },
  { row: '7', last: 'BAKER', first: 'JODI', chart: '28550', added: '2021.01.12', wt: '2038', bkd: '\u2713', list: '', reason: '', priority: '' },
  { row: '8', last: 'BLANCHARD', first: 'AARON', chart: '58211', added: '2021.01.12', wt: '2038', bkd: '\u2717', list: '', reason: '', priority: '' },
  { row: '9', last: 'FROSE', first: 'SUSIE', chart: '87168', added: '2021.01.15', wt: '2035', bkd: '\u2717', list: '', reason: '', priority: '' },
  { row: '10', last: 'MOUSE', first: 'MIC"KET', chart: '87167', added: '2023.01.31', wt: '1289', bkd: '\u2717', list: '', reason: '', priority: '' },
  { row: '11', last: 'MOUSE', first: 'MICKEY', chart: '10008', added: '2024.01.26', wt: '929', bkd: '\u2717', list: '', reason: '', priority: '' },
]

/* --- MAR ------------------------------------------------------------------ */
export const marRows = [
  { when: '2025.10.08  10:47', by: 'JORGENSON, ELLA', med: 'BICILLIN L-A 1200000 unit Suspension', dosage: '1 DOSE', route: 'IM', site: 'LEFT GLUTEAL' },
  { when: '2025.09.30  09:12', by: '(RN) ORMOND, SAMANTHA', med: 'INSULIN GLARGINE 100 unit [Subcutaneous Solution]', dosage: '20 units', route: 'SC', site: 'LEFT ARM' },
]

/* the administration-site DDDW list */
export const adminSites = [
  { site: 'LA', desc: 'LEFT ARM (LEFT DELTOID AREA)' },
  { site: 'LAF', desc: 'LEFT ARM - FOREARM' },
  { site: 'LAL', desc: 'LEFT ARM - LOWER (LEFT DELTOID)' },
  { site: 'LAU', desc: 'LEFT ARM - UPPER (LEFT DELTOID)' },
  { site: 'LG', desc: 'LEFT GLUTEAL' },
  { site: 'LL', desc: 'LEFT LEG (LEFT VASTUS LATERALUS)' },
  { site: 'LLL', desc: 'LEFT LEG - LOWER (LEFT VASTUS LATERALUS)' },
  { site: 'LLU', desc: 'LEFT LEG - UPPER (LEFT VASTUS LATERALUS)' },
  { site: 'MO', desc: 'MOUTH' },
  { site: 'NO', desc: 'NOSE' },
  { site: 'RA', desc: 'RIGHT ARM (RIGHT DELTOID AREA)' },
  { site: 'RAF', desc: 'RIGHT ARM - FOREARM' },
  { site: 'RAL', desc: 'RIGHT ARM - LOWER (RIGHT DELTOID)' },
  { site: 'RAU', desc: 'RIGHT ARM - UPPER (RIGHT DELTOID)' },
  { site: 'RG', desc: 'RIGHT GLUTEAL' },
  { site: 'RL', desc: 'RIGHT LEG (RIGHT VASTUS LATERALUS)' },
]

/* --- Determinants of Health ---------------------------------------------- */
export const determinantTabs: Record<string, {
  statusBand: string
  historyBand: string
  detailBand: string
  status: Record<string, string>[]
  columns: { key: string; header: string; width?: number; align?: 'left' | 'center' | 'right'; dots?: boolean }[]
  rows: Record<string, string>[]
  total?: { label: string; value: string }
  fields: { label: string; kind: 'text' | 'lookup'; w?: number; value?: string; pair?: { label: string; w?: number } }[]
}> = {
  Employment: {
    statusBand: 'Employment Status',
    historyBand: 'Employment History',
    detailBand: 'Employer Information',
    status: [
      { collected: '2026-06-01', name: 'EMPLOYMENT STATUS', value: 'EMPLOYED', units: '', flag: '', ranges: '' },
      { collected: '2025-12-17', name: 'TOTAL EMPLOYMENT HRS/WK', value: 'FULL TIME', units: '', flag: '', ranges: '' },
    ],
    columns: [
      { key: 'start', header: 'Start', width: 86, align: 'center' },
      { key: 'end', header: 'End', width: 86, align: 'center' },
      { key: 'occupation', header: 'Occupation' },
      { key: 'd', header: '', dots: true },
      { key: 'hrs', header: 'Hrs/Wk', width: 80, align: 'right' },
      { key: 'company', header: 'Company', width: 180 },
      { key: 'phone', header: 'Phone (M)', width: 130 },
      { key: 'clip', header: '\u{1F4CE}', width: 22, align: 'center' },
    ],
    rows: [
      { start: '2026.06.01', end: '', occupation: 'FOOD PRESERVER', hrs: '25.00', company: 'BC Tomato company', phone: '(250) 567-0000', clip: '-' },
      { start: '2025.05.21', end: '', occupation: 'CEO OF OCEAN FISHING INC', hrs: '80.00', company: 'OCEAN FISHING INC', phone: '(250) -55-5-55', clip: '-' },
      { start: '2024.12.12', end: '', occupation: 'UNEMPLOYED', hrs: '', company: '', phone: '', clip: '-' },
      { start: '2024.01.01', end: '2024.05.06', occupation: 'FISH FRYER', hrs: '', company: 'FISH FRY CO.', phone: '', clip: '-' },
    ],
    total: { label: 'Total Hrs/Wk for all Current Employment Records:', value: '105.00' },
    fields: [
      { label: 'Occupation:', kind: 'lookup', value: 'FOOD PRESERVER' },
      { label: 'Company:', kind: 'text', value: 'BC Tomato company' },
      { label: 'Address:', kind: 'text' },
      { label: '', kind: 'text' },
      { label: 'City:', kind: 'text', w: 140, pair: { label: 'Postal Code:', w: 120 } },
      { label: 'Province:', kind: 'text', w: 140, pair: { label: 'Country:', w: 120 } },
      { label: 'Office - Main:', kind: 'text', w: 140, value: '(250) 567-0000', pair: { label: 'Office - Other:', w: 120 } },
      { label: 'Office Fax:', kind: 'text', w: 140 },
    ],
  },
  Education: {
    statusBand: 'Education Status',
    historyBand: 'Education History',
    detailBand: 'Institution Information',
    status: [
      { collected: '2025-12-17', name: 'HIGHEST LEVEL OF EDUCATION', value: 'POST SECONDARY CERTIFICATE', units: '', flag: '', ranges: '' },
    ],
    columns: [
      { key: 'start', header: 'Start', width: 86, align: 'center' },
      { key: 'stop', header: 'Stop', width: 86, align: 'center' },
      { key: 'institution', header: 'Educational Institution' },
      { key: 'd', header: '', dots: true },
      { key: 'level', header: 'Level of Education', width: 200 },
      { key: 'completed', header: 'Completed', width: 76, align: 'center' },
      { key: 'clip', header: '\u{1F4CE}', width: 22, align: 'center' },
    ],
    rows: [],
    fields: [
      { label: 'Institution:', kind: 'lookup' },
      { label: 'Category:', kind: 'lookup' },
      { label: 'Field of Study:', kind: 'lookup' },
      { label: 'Enrolled As:', kind: 'text', w: 180 },
      { label: 'Completed Date:', kind: 'text', w: 120 },
      { label: 'Comment:', kind: 'text' },
    ],
  },
  Housing: {
    statusBand: 'Housing Status',
    historyBand: 'Housing History',
    detailBand: 'Residence Information',
    status: [],
    columns: [
      { key: 'start', header: 'Start', width: 86, align: 'center' },
      { key: 'stop', header: 'Stop', width: 86, align: 'center' },
      { key: 'type', header: 'Housing Type' },
      { key: 'd', header: '', dots: true },
      { key: 'occupants', header: 'Occupants', width: 90, align: 'right' },
      { key: 'clip', header: '\u{1F4CE}', width: 22, align: 'center' },
    ],
    rows: [],
    fields: [
      { label: 'Housing Type:', kind: 'lookup' },
      { label: 'Tenure:', kind: 'lookup' },
      { label: 'Occupants:', kind: 'text', w: 90 },
      { label: 'Comment:', kind: 'text' },
    ],
  },
  Socioeconomic: {
    statusBand: 'Socioeconomic Status',
    historyBand: 'Socioeconomic History',
    detailBand: 'Income Information',
    status: [],
    columns: [
      { key: 'start', header: 'Start', width: 86, align: 'center' },
      { key: 'stop', header: 'Stop', width: 86, align: 'center' },
      { key: 'measure', header: 'Measure' },
      { key: 'd', header: '', dots: true },
      { key: 'value', header: 'Value', width: 150 },
      { key: 'clip', header: '\u{1F4CE}', width: 22, align: 'center' },
    ],
    rows: [],
    fields: [
      { label: 'Income Source:', kind: 'lookup' },
      { label: 'Band:', kind: 'lookup' },
      { label: 'Comment:', kind: 'text' },
    ],
  },
}
