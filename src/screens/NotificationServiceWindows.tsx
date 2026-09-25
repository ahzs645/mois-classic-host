import { useMemo, useState, type ReactNode } from 'react'
import { MOIS_TODAY } from '../data/patients'
import { CURRENT_USER, WORKSPACE_USERS, type TaskRow } from '../data/tasks'
import { taskListRows } from '../data/workspaceLists'
import { useWorkspaceStore, workspaceStore } from '../data/workspaceStore'
import { PBCheckbox, PBDataWindow, PBRadio, PBSelect, PBTextArea, type PBColumn } from '../pb'
import { useScreenReport } from '../host/screen-state'
import { registerAreaWindow, type AreaWindowProps } from './areaWindowRegistry'
import { DialogButton, WorkspaceDialogFrame } from './WorkspaceDialogFrame'

/* ============================================================================
   The Automated Notification Service — what double-clicking the status bar's
   Task Item / Msg Item cells opens.

   PROVENANCE: article 304741 "Windows and Navigation", section "Task and
   Message Notification Windows" — "You can open the Task and Message
   Notification Window by double-clicking the corresponding Task and Message
   reminders that show at the bottom of the MOIS page" — with its two
   captures, and article 3268648 ("You can open Tasks or Messages by
   double-clicking the flashing item", `5fdcadab…`, `cddfbc94…`).

   Task Reminder — `6a3effdf…` (v02.21, 1010 x 690) with the newer
   `cddfbc94…` for the Team caption "TEAM MOA":
     title bar "Automated Notification Service"; a dark header "Task
     Reminder" with "user: ADMINISTRATOR" at its right; a "Task List" band;
     grid Priority · (blank) · Due · Task · Patient · Chart · Ack. · Comp. ·
     Created By · Created Date · M; under it Resp'blty: Owner [drop] AND / OR
     Team [drop], Created By and the created date with its weekday, Priority
     radios Low / Medium / High / V. High, then Detail and Follow Up Notes;
     buttons Create Message From Task, Open Chart, Acknowledge Only ALL,
     Acknowledge & Mark Complete ALL … Save / Close (F2), Ignore.
   Message List — `d3b770ea…` (1010 x 700):
     the same title bar; a navy "Message List" header with the user; grid
     Priority · Subject · Patient · Chart · Ack. · Completed · Created By ·
     Created Date · M; a Detail box; Reply, Reply To All, Forward centred
     above Create Task from Message, Print Message, Open Chart, Acknowledge
     Only ALL, Acknowledge & Mark Read ALL, Save (F2), Cancel.

   What each lists (304741's note): "The Task Notification Window only shows
   you the Tasks in your Inbox that are overdue … The Message Notification
   Window only shows you the Messages in your Inbox that are not marked as
   Acknowledged or Completed". The rows are the Workspace inboxes' own
   (data/tasks.ts plus what this session raised, data/workspaceLists.ts):
   a task is overdue when its Due is before the stage's day and it is not
   completed.

   The bottom-row table in 304741: Open Chart opens the selected record's
   chart; Acknowledge Only ALL acknowledges every row without marking it
   read (or complete); Acknowledge and Mark Read / Complete ALL does both;
   Ignore / Cancel puts the window aside. Save commits: an acknowledged
   message leaves the Message Inbox's unacknowledged count, which is the
   Msg Item cell's number. The Task Inbox has no session store for
   acknowledgements, so the task window's ticks stay in the window.
   Open Chart and Print Message are inert here: the notification windows
   open over the frame, not inside a chart, and the stage has no route from
   them into one.

   Reported: `host.dialog` is the window's id (task-reminder /
   message-list); `host.screen.notified` counts the rows it listed and
   `host.screen.acked` how many are ticked Ack.
   ========================================================================= */

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** `2016.06.24 - Friday`, the way both captures print the created date. */
function withWeekday(date: string) {
  const [y, m, d] = date.split('.').map(Number)
  if (!y || !m || !d) return date
  return `${date} - ${WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}`
}

const PRIORITIES: { code: string; label: string }[] = [
  { code: 'L', label: 'Low' }, { code: 'M', label: 'Medium' }, { code: 'H', label: 'High' }, { code: 'V', label: 'V. High' },
]

const str = (v: unknown) => (typeof v === 'string' ? v : '')

/** The dark header both windows open on, with the signed-in user at its right. */
function NotificationHeader({ title, navy }: { title: string; navy?: boolean }) {
  return (
    <div className="pb-viewhead" style={navy ? undefined : { background: 'linear-gradient(#6a6a6a, #3e3e3e)' }}>
      <span className="pb-viewhead__title">{title}</span>
      <span className="pb-viewhead__spacer" />
      <span className="pb-viewhead__title" style={{ fontSize: '1em', paddingRight: 8 }}>user: {CURRENT_USER.name}</span>
    </div>
  )
}

/** The M column's blue down-arrow glyph. */
const DownArrow = () => <span aria-hidden="true" style={{ color: '#3a3ad0', fontWeight: 700 }}>⇩</span>

const tick = (checked: boolean) => <PBCheckbox checked={checked} />

type Row = TaskRow & { __key: string }

/* ---------------------------------------------------------------------------
   Task Reminder
   ------------------------------------------------------------------------ */
export function TaskReminderWindow({ close, open }: AreaWindowProps) {
  const ws = useWorkspaceStore()
  /* overdue and not completed, from the Task Inbox as the session left it */
  const rows = useMemo<Row[]>(() => taskListRows('ws-task-inbox', ws)
    .filter((r) => !r.comp && str(r.due) !== '' && str(r.due) < MOIS_TODAY)
    .map((r, i) => ({ ...r, __key: `${i}:${str(r.task)}` })), [ws])
  const [ticks, setTicks] = useState<Record<string, { ack?: boolean; comp?: boolean }>>({})
  const [cur, setCur] = useState(0)
  const r = rows[Math.min(cur, rows.length - 1)]
  const ackOf = (row: Row) => ticks[row.__key]?.ack ?? Boolean(row.ack)
  const compOf = (row: Row) => ticks[row.__key]?.comp ?? Boolean(row.comp)
  useScreenReport({ notified: rows.length, acked: rows.filter(ackOf).length })

  const all = (comp: boolean) => setTicks(Object.fromEntries(rows.map((row) => [row.__key, { ack: true, comp: comp || compOf(row) }])))

  const columns: PBColumn<Row>[] = [
    { key: 'p', header: 'Priority', width: 40, align: 'center' },
    { key: 'blank', header: '', width: 16 },
    { key: 'due', header: 'Due', width: 70, align: 'center' },
    { key: 'task', header: 'Task', width: 300 },
    { key: 'patient', header: 'Patient', width: 140 },
    { key: 'chart', header: 'Chart', width: 50, align: 'center' },
    { key: 'ack', header: 'Ack.', width: 40, align: 'center', render: (row) => tick(ackOf(row)) },
    { key: 'comp', header: 'Comp.', width: 42, align: 'center', render: (row) => tick(compOf(row)) },
    { key: 'createdBy', header: 'Created By', width: 96 },
    { key: 'created', header: 'Created Date', width: 76, align: 'center' },
    { key: 'm', header: 'M', width: 16, align: 'center', render: () => <DownArrow /> },
  ]

  return (
    <WorkspaceDialogFrame id="task-reminder" title="Automated Notification Service" width={1010} height={690} onClose={close}>
      <NotificationHeader title="Task Reminder" />
      <div className="pb-band" style={{ background: '#dcd7d2' }}>Task List</div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', background: '#fff' }}>
        <PBDataWindow
          rows={rows}
          columns={columns}
          current={cur}
          onCurrentChange={setCur}
          rowTutorialId={(row) => `host.mois.row.reminder-${String(row.patient ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'task'}`}
          empty="No overdue tasks."
        />
      </div>
      <div style={{ flex: 'none', borderTop: '1px solid #a0a0a0', padding: '6px 8px 4px', display: 'grid', gridTemplateColumns: 'auto 1fr auto', rowGap: 4 }}>
        <div className="pb-row" style={{ gap: 6 }}>
          <span className="pb-form__label" style={{ width: 54 }}>Resp&apos;blty:</span>
          <span className="pb-form__label">Owner:</span>
          <PBSelect w={150} options={['', ...WORKSPACE_USERS]} value={str(r?.user)} onChange={() => {}} />
          <b style={{ padding: '0 14px' }}>AND / OR</b>
          <span className="pb-form__label">Team:</span>
          <PBSelect w={190} options={['', 'TEAM MOA', 'TEAM NURSE', 'TEAM SUPPORT STAFF']} value={r?.team ? `TEAM ${str(r.team)}` : ''} onChange={() => {}} />
        </div>
        <span />
        <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', columnGap: 6, alignSelf: 'start' }}>
          <span className="pb-form__label">Created By:</span><span>{str(r?.createdBy)}</span>
          <span /><span>{r ? withWeekday(str(r.created)) : ''}</span>
        </div>
        <div className="pb-row" style={{ gap: 14 }}>
          <span className="pb-form__label" style={{ width: 54 }}>Priority:</span>
          {PRIORITIES.map((p) => (
            <PBRadio key={p.code} name="task-reminder-priority" label={p.label} checked={r?.p === p.code} />
          ))}
        </div>
      </div>
      <div style={{ flex: 'none', borderTop: '1px solid #a0a0a0', padding: '4px 8px 8px', display: 'grid', gridTemplateColumns: '60px 1fr 1fr', columnGap: 8, height: 118 }}>
        <span className="pb-form__label">Detail:</span>
        <PBTextArea readOnly value={str(r?.detail)} style={{ height: '100%', resize: 'none' }} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="pb-form__label">Follow Up Notes:</span>
          <PBTextArea readOnly value="" style={{ flex: '1 1 auto', resize: 'none' }} />
        </div>
      </div>
      <ButtonRow>
        <DialogButton id="create-message-from-task" width={168} onClick={() => {
          if (!r) return
          open('create-message', { chart: str(r.chart), patient: str(r.patient), subject: str(r.task), detail: str(r.detail) })
        }}>Create Message From Task</DialogButton>
        <DialogButton id="reminder-open-chart" width={96}>Open Chart</DialogButton>
        <DialogButton id="acknowledge-only-all" width={184} onClick={() => all(false)}>Acknowledge Only ALL</DialogButton>
        <DialogButton id="acknowledge-and-mark-complete-all" width={184} onClick={() => all(true)}>Acknowledge &amp; Mark Complete ALL</DialogButton>
        <span style={{ flex: '1 1 auto' }} />
        <DialogButton id="reminder-save-close" width={100} isDefault onClick={close}>Save / Close (F2)</DialogButton>
        <DialogButton id="reminder-ignore" width={100} onClick={close}>Ignore</DialogButton>
      </ButtonRow>
    </WorkspaceDialogFrame>
  )
}

/* ---------------------------------------------------------------------------
   Message List
   ------------------------------------------------------------------------ */
export function MessageListWindow({ close, open }: AreaWindowProps) {
  const ws = useWorkspaceStore()
  /* the list is taken once, when the window opens: acknowledging a row does
     not make it vanish until the window is opened again */
  const [rows] = useState<Row[]>(() => taskListRows('ws-msg-inbox', ws)
    .filter((r) => !r.ack && !r.comp)
    .map((r, i) => ({ ...r, __key: `${i}:${str(r.subject)}` })))
  const [ticks, setTicks] = useState<Record<string, { ack?: boolean; comp?: boolean }>>({})
  const [cur, setCur] = useState(0)
  const r = rows[Math.min(cur, rows.length - 1)]
  const ackOf = (row: Row) => ticks[row.__key]?.ack ?? Boolean(row.ack)
  const compOf = (row: Row) => ticks[row.__key]?.comp ?? Boolean(row.comp)
  useScreenReport({ notified: rows.length, acked: rows.filter(ackOf).length })

  const all = (read: boolean) => setTicks(Object.fromEntries(rows.map((row) => [row.__key, { ack: true, comp: read || compOf(row) }])))
  /* Save (F2): the acknowledgements reach the Message Inbox */
  const save = () => {
    for (const row of rows) if (ackOf(row)) workspaceStore.ackMessage(str(row.subject))
    close()
  }
  const reply = (all: boolean) => {
    if (!r) return
    open('create-message', {
      sendTo: str(r.from), copiesTo: all ? str(r.copiedTo) : '',
      subject: `RE: ${str(r.subject)}`, chart: str(r.chart), patient: str(r.patient),
    })
  }

  const columns: PBColumn<Row>[] = [
    { key: 'p', header: 'Priority', width: 40, align: 'center' },
    { key: 'subject', header: 'Subject', width: 370 },
    { key: 'patient', header: 'Patient', width: 170 },
    { key: 'chart', header: 'Chart', width: 58, align: 'center' },
    { key: 'ack', header: 'Ack.', width: 52, align: 'center', render: (row) => tick(ackOf(row)) },
    { key: 'comp', header: 'Completed', width: 56, align: 'center', render: (row) => tick(compOf(row)) },
    { key: 'from', header: 'Created By', width: 104 },
    { key: 'sent', header: 'Created Date', width: 72, align: 'center' },
    { key: 'm', header: 'M', width: 16, align: 'center', render: () => null },
  ]

  return (
    <WorkspaceDialogFrame id="message-list" title="Automated Notification Service" width={1010} height={700} onClose={close}>
      <NotificationHeader title="Message List" navy />
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', background: '#fff' }}>
        <PBDataWindow
          rows={rows}
          columns={columns}
          current={cur}
          onCurrentChange={setCur}
          rowTutorialId={(row) => `host.mois.row.notified-${String(row.patient ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'message'}`}
          empty="No unacknowledged messages."
        />
      </div>
      <div style={{ flex: 'none', borderTop: '1px solid #a0a0a0', padding: '6px 8px 8px', display: 'grid', gridTemplateColumns: '60px 1fr 60px', columnGap: 8, height: 196 }}>
        <span className="pb-form__label">Detail:</span>
        <PBTextArea readOnly value={str(r?.detail)} style={{ height: '100%', resize: 'none' }} />
        <span />
      </div>
      <ButtonRow center>
        <DialogButton id="message-list-reply" width={88} onClick={() => reply(false)}>Reply</DialogButton>
        <DialogButton id="message-list-reply-to-all" width={88} onClick={() => reply(true)}>Reply To All</DialogButton>
        <DialogButton id="message-list-forward" width={88} onClick={() => {
          if (r) open('create-message', { subject: `FW: ${str(r.subject)}`, detail: str(r.detail), chart: str(r.chart), patient: str(r.patient) })
        }}>Forward</DialogButton>
      </ButtonRow>
      <ButtonRow center>
        <DialogButton id="create-task-from-message" width={150} onClick={() => {
          if (r) open('confirm-task-from-message', { fromMessage: str(r.subject), priority: str(r.p), patient: str(r.patient), chart: str(r.chart), detail: str(r.detail) })
        }}>Create Task from Message</DialogButton>
        <DialogButton id="print-message" width={92}>Print Message</DialogButton>
        <DialogButton id="message-list-open-chart" width={88}>Open Chart</DialogButton>
        <DialogButton id="message-acknowledge-only-all" width={160} onClick={() => all(false)}>Acknowledge Only ALL</DialogButton>
        <DialogButton id="acknowledge-and-mark-read-all" width={160} onClick={() => all(true)}>Acknowledge &amp; Mark Read ALL</DialogButton>
        <DialogButton id="message-list-save" width={88} isDefault onClick={save}>Save (F2)</DialogButton>
        <DialogButton id="message-list-cancel" width={100} onClick={close}>Cancel</DialogButton>
      </ButtonRow>
    </WorkspaceDialogFrame>
  )
}

function ButtonRow({ children, center }: { children: ReactNode; center?: boolean }) {
  return (
    <div className="pb-row" style={{ flex: 'none', gap: 4, padding: '6px 10px', justifyContent: center ? 'center' : undefined, borderTop: center ? undefined : '1px solid #a0a0a0' }}>
      {children}
    </div>
  )
}

/** Registered at module load, and again from the frame, which imports this
    file for its exports (see ChangeTeleplanPasswordDialog.tsx). */
export function registerNotificationServiceWindows() {
  registerAreaWindow('task-reminder', TaskReminderWindow)
  registerAreaWindow('message-list', MessageListWindow)
}

registerNotificationServiceWindows()
