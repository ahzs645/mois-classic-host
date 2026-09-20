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
  columns: TaskColumn[]
  rows: TaskRow[]
  source: string
}

const P = { key: 'p', header: 'P', width: 16, align: 'center' as const }

export const taskScreens: TaskScreen[] = [
  {
    node: 'ws-task-inbox',
    title: 'Task Inbox',
    source: '1802744 (v02.30.22, measured 1:1)',
    commands: ['New', 'Delete', 'Save', 'Undo', 'Refresh', 'Change W/S', 'Open Chart', 'Close Window'],
    filters: true,
    viewSelect: true,
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
      { p: 'H', due: '2026.03.19', patient: 'BROWN, FARMER', task: 'Book follow-up for abnormal A1C', assignee: 'ADMIN', created: '2026.03.17', createdBy: 'BEARDWOOD, W' },
      { p: 'M', due: '2026.03.20', patient: 'HALE, MARGARET', task: 'Fax cardiology consult to referring GP', assignee: 'TEAM MOA', ack: true, created: '2026.03.16', createdBy: 'SHEWCHUK, L' },
      { p: 'V', due: '2026.03.18', patient: 'RAO, PRIYA', task: 'Call re: chest pain result', assignee: 'ADMIN', created: '2026.03.16', createdBy: 'BEARDWOOD, W' },
      { p: 'L', due: '2026.03.12', patient: 'CASTILLO, JUNE', task: 'Send colonoscopy prep instructions', assignee: 'ADMIN', ack: true, comp: true, created: '2026.03.09', createdBy: 'ADMIN' },
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
      { p: 'M', due: '2026.03.21', patient: 'OKONKWO, SAM', task: 'Confirm hernia repair follow-up booked', assignee: 'TEAM MOA', created: '2026.03.17' },
      { p: 'L', due: '2026.03.14', patient: 'FONTAINE, DALE', task: 'Dressing change supplies to treatment room', assignee: 'ADMIN', ack: true, comp: true, created: '2026.03.11' },
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
    filters: true,
    columns: [
      P,
      { key: 'sent', header: 'Sent', width: 67 },
      { key: 'from', header: 'From', width: 115 },
      { key: 'patient', header: 'Patient', width: 125 },
      { key: 'subject', header: 'Subject', width: 313 },
      { key: 'assignee', header: 'Assignee', width: 55 },
      { key: 'ack', header: 'Ack.', width: 42, align: 'center', check: true },
      { key: 'comp', header: 'Comp.', width: 42, align: 'center', check: true },
    ],
    rows: [
      { p: 'H', sent: '2026.03.18', from: 'SHEWCHUK, LEAH', patient: 'HALE, MARGARET', subject: 'Cardiology wants a repeat ECG before the visit', assignee: 'ADMIN' },
      { p: 'M', sent: '2026.03.17', from: 'BEARDWOOD, W', patient: 'BROWN, FARMER', subject: 'Please book diabetic education', assignee: 'ADMIN', ack: true },
      { p: 'L', sent: '2026.03.11', from: 'ADMIN', patient: '', subject: 'Clinic closed Friday afternoon', assignee: 'TEAM MOA', ack: true, comp: true },
    ],
  },
  {
    node: 'ws-msg-sent',
    title: 'Sent Messages',
    /* the only one of the four with no Acknowledged / Completed filters */
    source: '1802747 (v02.30.22, measured 1:1)',
    commands: ['New', 'Refresh', 'Change W/S', 'Open Chart', 'Forward', 'Print', 'Close Window'],
    filters: false,
    columns: [
      P,
      { key: 'sent', header: 'Sent', width: 67 },
      { key: 'patient', header: 'Patient', width: 115 },
      { key: 'subject', header: 'Subject', width: 459 },
      { key: 'sentBy', header: 'Sent By', width: 119 },
    ],
    rows: [
      { p: 'M', sent: '2026.03.18', patient: 'RAO, PRIYA', subject: 'Respirology referral faxed, awaiting acknowledgement', sentBy: 'ADMIN' },
      { p: 'L', sent: '2026.03.15', patient: '', subject: 'Reminder: flu clinic sign-up closes Friday', sentBy: 'ADMIN' },
    ],
  },
]

/** Acknowledged / Completed both filter on Yes / No / All, in that order. */
export const TASK_FILTER = ['All', 'Yes', 'No']

export const taskScreenByNode = (node: string): TaskScreen | undefined =>
  taskScreens.find((s) => s.node === node)
