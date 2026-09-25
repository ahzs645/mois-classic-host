/* ============================================================================
   The Workspace's Task List and Message Board.

   Four list screens, transcribed from the vendor's own reference pages in
   `MOIS_User_Manual_2026-09-20`: 1802744 Task Inbox, 1802745 Sent Tasks,
   1802746 Message Inbox, 1802747 Sent Messages.

   Task Inbox and Sent Messages are captured at v02.30.22 and were measured
   1:1. Sent Tasks and Message Inbox have no capture newer than v02.21.x, so
   their widths are converted from 125% DPI shots — marked below. Their
   command rows are the old text-sized ones; the two current screens use a
   uniform 81px pitch, which is what this emulator renders throughout.

   Ink, not fill, carries state here: an unacknowledged row is bold, and a
   completed one is struck through in grey. The zebra is banding, not status.

   Patients and tasks are synthetic training data.
   ========================================================================= */

export type TaskColumn = { key: string; header: string; width?: number; align?: 'left' | 'center' | 'right'; check?: boolean }

export type TaskRow = {
  p: string
  ack?: boolean
  comp?: boolean
  [key: string]: string | boolean | undefined
}

export type TaskScreen = {
  node: string
  title: string
  commands: string[]
  /** Sent Messages is the only one without the Acknowledged/Completed filters */
  filters: boolean
  /** Task Inbox alone carries the View selector at the right of the command row */
  viewSelect?: boolean
  /** per-button widths, for the older text-sized Task Bars (see Message Inbox) */
  commandWidths?: Record<string, number>
  /** task (Detail / Follow Up Notes tabs) or message (Sent To / Copied To grids) */
  kind: 'task' | 'message'
  columns: TaskColumn[]
  rows: TaskRow[]
  source: string
}

const P = { key: 'p', header: 'P', width: 19, align: 'center' as const }

export const taskScreens: TaskScreen[] = [
  {
    node: 'ws-task-inbox',
    title: 'Task Inbox',
    source: '1802744 (v02.30.22, measured 1:1)',
    commands: ['New', 'Delete', 'Save', 'Undo', 'Refresh', 'Change W/S', 'Open Chart', 'Close Window'],
    filters: true,
    viewSelect: true,
    kind: 'task',
    columns: [
      P,
      { key: 'due', header: 'Due', width: 70 },
      { key: 'patient', header: 'Patient', width: 129 },
      { key: 'task', header: 'Task', width: 246 },
      { key: 'assignee', header: 'Assignee', width: 55 },
      { key: 'ack', header: 'Ack.', width: 42, align: 'center', check: true },
      { key: 'comp', header: 'Comp.', width: 42, align: 'center', check: true },
      { key: 'created', header: 'Created', width: 70 },
      { key: 'createdBy', header: 'Created By', width: 103 },
    ],
    rows: [
      { p: 'H', due: '2026.03.19', patient: 'BROWN, FARMER', chart: '10023', task: 'Book follow-up for abnormal A1C', assignee: 'ADMIN', user: 'ADMINISTRATOR', created: '2026.03.17', createdAt: '2026.03.17 09:12', createdBy: 'BEARDWOOD, WENDY', group: 'LAB FOLLOW-UP', detail: 'Test Name: HEMOGLOBIN A1C\nValue: 8.4 %\nDate Collected: Mar 17 2026' },
      { p: 'M', due: '2026.03.20', patient: 'HALE, MARGARET', chart: '10044', task: 'Fax cardiology consult to referring GP', assignee: 'TEAM', team: 'MOA', ack: true, created: '2026.03.16', createdAt: '2026.03.16 14:40', createdBy: 'SHEWCHUK, LEAH', detail: 'Description: ATRIAL FIBRILLATION - RATE CONTROL\n\nSeen By: CARDIOLOGY, UHNBC' },
      { p: 'V', due: '2026.03.18', patient: 'RAO, PRIYA', chart: '10052', task: 'Call re: chest pain result', assignee: 'ADMIN', user: 'ADMINISTRATOR', created: '2026.03.16', createdAt: '2026.03.16 16:05', createdBy: 'BEARDWOOD, WENDY', group: 'CALLBACK', detail: 'Troponin negative x2. Please call the patient with the result and book a follow-up.' },
      { p: 'L', due: '2026.03.12', patient: 'CASTILLO, JUNE', chart: '10085', task: 'Send colonoscopy prep instructions', assignee: 'ADMIN', user: 'ADMINISTRATOR', ack: true, comp: true, created: '2026.03.09', createdAt: '2026.03.09 10:30', createdBy: 'ADMINISTRATOR', detail: 'Mail the bowel prep sheet.' },
    ],
  },
  {
    node: 'ws-task-sent',
    title: 'Sent Tasks',
    /* no New button on this screen, and the Completed column is headed in
       full rather than abbreviated */
    source: '1802745 (v02.21.19, converted from 125%)',
    commands: ['Delete', 'Save', 'Undo', 'Refresh', 'Change W/S', 'Open Chart', 'Close Window'],
    filters: true,
    kind: 'task',
    columns: [
      { ...P, width: 17 },
      { key: 'due', header: 'Due', width: 74 },
      { key: 'patient', header: 'Patient', width: 135 },
      { key: 'task', header: 'Task', width: 315 },
      { key: 'assignee', header: 'Assignee', width: 56 },
      { key: 'ack', header: 'Ack.', width: 48, align: 'center', check: true },
      { key: 'comp', header: 'Complete', width: 54, align: 'center', check: true },
      { key: 'created', header: 'Created', width: 73 },
    ],
    rows: [
      { p: 'M', due: '2026.03.21', patient: 'OKONKWO, SAM', chart: '10067', task: 'Confirm hernia repair follow-up booked', assignee: 'TEAM', team: 'MOA', created: '2026.03.17', createdAt: '2026.03.17 11:02', createdBy: 'ADMINISTRATOR', detail: 'Description: INGUINAL HERNIA REPAIR - FOLLOW UP' },
      { p: 'L', due: '2026.03.14', patient: 'FONTAINE, DALE', chart: '10071', task: 'Dressing change supplies to treatment room', assignee: 'GRUBB', user: 'GRUBB, HELENA', ack: true, comp: true, created: '2026.03.11', createdAt: '2026.03.11 08:45', createdBy: 'ADMINISTRATOR', detail: '' },
    ],
  },
  {
    node: 'ws-msg-inbox',
    title: 'Message Inbox',
    source: '1802746 (v02.21.12, converted from 125%)',
    commands: [
      'New', 'Delete', 'Save', 'Undo', 'Refresh', 'Open Chart',
      'Reply', 'Reply All', 'Forward', 'Print', 'Change W/S', 'Close Window',
    ],
    /* the v02.21 Task Bar is text-sized, and its twelve buttons fit the
       window (1802746; 303753 image `180bb8f4`, 303749 image `861df29b`).
       At the uniform 80.5 the last three ran off the window, where pressing
       Change W/S scrolled the frame instead of opening anything. Scaled from
       `180bb8f4` to this 1000-wide frame. */
    commandWidths: {
      New: 56, Delete: 60, Save: 56, Undo: 56, Refresh: 62, 'Open Chart': 70,
      Reply: 56, 'Reply All': 62, Forward: 60, Print: 56, 'Change W/S': 72, 'Close Window': 78,
    },
    filters: true,
    kind: 'message',
    columns: [
      P,
      { key: 'sent', header: 'Sent', width: 67 },
      { key: 'from', header: 'From', width: 115 },
      { key: 'patient', header: 'Patient', width: 125 },
      { key: 'subject', header: 'Subject', width: 290 },  /* 313 at 125% DPI; trimmed to fit the 1000-wide frame */
      { key: 'assignee', header: 'Assignee', width: 55 },
      { key: 'ack', header: 'Ack.', width: 42, align: 'center', check: true },
      { key: 'comp', header: 'Comp.', width: 42, align: 'center', check: true },
    ],
    rows: [
      { p: 'H', sent: '2026.03.18', from: 'SHEWCHUK, LEAH', patient: 'HALE, MARGARET', chart: '10044', subject: 'Cardiology wants a repeat ECG before the visit', assignee: 'ADMIN', sentTo: 'ADMINISTRATOR', copiedTo: 'BEARDWOOD, WENDY', detail: 'Description: ATRIAL FIBRILLATION - RATE CONTROL\n\nSeen By: CARDIOLOGY, UHNBC\n\nCardiology would like a repeat ECG on file before the follow-up visit.' },
      { p: 'M', sent: '2026.03.17', from: 'BEARDWOOD, WENDY', patient: 'BROWN, FARMER', chart: '10023', subject: 'Please book diabetic education', assignee: 'ADMIN', ack: true, sentTo: 'ADMINISTRATOR', detail: 'A1C 8.4. Please book with the diabetes educator.' },
      { p: 'L', sent: '2026.03.11', from: 'ADMINISTRATOR', patient: '', subject: 'Clinic closed Friday afternoon', assignee: 'TEAM', team: 'MOA', ack: true, comp: true, sentTo: 'ADMINISTRATOR', detail: 'Staff meeting 1300-1700.' },
    ],
  },
  {
    node: 'ws-msg-sent',
    title: 'Sent Messages',
    /* the only one of the four with no Acknowledged / Completed filters */
    source: '1802747 (v02.30.22, measured 1:1)',
    commands: ['New', 'Refresh', 'Change W/S', 'Open Chart', 'Forward', 'Print', 'Close Window'],
    filters: false,
    kind: 'message',
    columns: [
      P,
      { key: 'sent', header: 'Sent', width: 67 },
      { key: 'patient', header: 'Patient', width: 115 },
      { key: 'subject', header: 'Subject', width: 459 },
      { key: 'sentBy', header: 'Sent By', width: 119 },
    ],
    rows: [
      { p: 'M', sent: '2026.03.18', patient: 'RAO, PRIYA', chart: '10052', subject: 'Respirology referral faxed, awaiting acknowledgement', sentBy: 'ADMIN', sentTo: 'BEARDWOOD, WENDY', sentToAck: true, detail: 'Referral to RESPIROLOGY faxed 2026.03.18.' },
      { p: 'L', sent: '2026.03.15', patient: '', subject: 'Reminder: flu clinic sign-up closes Friday', sentBy: 'ADMIN', sentTo: 'SHEWCHUK, LEAH', copiedTo: 'GRUBB, HELENA', detail: '' },
    ],
  },
]

/** Acknowledged / Completed both drop Yes / No / All, in that order, and open
    on All (1802744; 303755 image `81e01b61`). */
export const TASK_FILTER = ['Yes', 'No', 'All']
export const TASK_FILTER_DEFAULT = 'All'

export const taskScreenByNode = (node: string): TaskScreen | undefined =>
  taskScreens.find((s) => s.node === node)

/* ============================================================================
   Who a task or message can go to, and the Task Sets.

   The Assign To / Send To drop-downs list the site's user accounts; User
   Group lists its teams (art. 303596: "MOA, Support Staff, Nurse, Other
   Provider"). The accounts are the synthetic ones the lists above already
   name. The signed-in user is ADMIN — the Assignee column's own spelling —
   whose account name is ADMINISTRATOR, the way the Workspace Summary heads
   its Task List row.
   ========================================================================= */

export const CURRENT_USER = { login: 'ADMIN', name: 'ADMINISTRATOR' }

export const WORKSPACE_USERS = [
  'ADMINISTRATOR',
  'BEARDWOOD, WENDY',
  'SHEWCHUK, LEAH',
  'RESIDENT, R1',
  'DHALIWAL, RUPINDER',
  'GRUBB, HELENA',
  'SMITH, DALENE',
]

/** The short name the Assignee column prints for an account. */
export const assigneeLabel = (user: string) =>
  user === CURRENT_USER.name ? CURRENT_USER.login : user.split(',')[0]!.trim()

export const USER_GROUPS = ['', 'MOA', 'SUPPORT STAFF', 'NURSE', 'OTHER PROVIDER']

/** Task Group — empty unless a site has set groups up in Administration. */
export const TASK_GROUPS = ['', 'CALLBACK', 'FORMS', 'LAB FOLLOW-UP', 'REFERRAL']

export const TASK_PRIORITIES = [
  { code: 'L', label: 'Low' },
  { code: 'M', label: 'Medium' },
  { code: 'H', label: 'High' },
  { code: 'V', label: 'V. High' },
] as const

/**
 * Task Sets — templates authored in Administration ▸ Designer ▸ Task Sets and
 * applied to one record by Create Task Set. `INR` is the set in the manual's
 * capture (1802744 image `8742b3f6`): three tasks, their priorities and the
 * first line of each Detail as painted there; the due dates are offsets from
 * the day the set is applied.
 */
export const TASK_SETS: { name: string; tasks: { task: string; priority: 'L' | 'M' | 'H' | 'V'; detail: string; dueIn: number }[] }[] = [
  {
    name: 'INR',
    tasks: [
      { task: 'ORDER NEW LABS', priority: 'H', detail: 'Re-order the applicable labs', dueIn: 0 },
      { task: 'BILL THE ANTICOAGULATION', priority: 'M', detail: 'Bill Anticoagulation Visit', dueIn: 2 },
      { task: 'TCI', priority: 'V', detail: 'Call the patient in to the office', dueIn: 0 },
    ],
  },
  {
    name: 'ABNORMAL LAB',
    tasks: [
      { task: 'CALL PT TCI', priority: 'H', detail: 'Pt to come in and review labs', dueIn: 0 },
      { task: 'REPEAT LAB IN 3 MONTHS', priority: 'M', detail: 'Book the repeat requisition', dueIn: 90 },
    ],
  },
]
