import { useState } from 'react'
import { MOIS_TODAY } from '../data/patients'
import {
  CURRENT_USER, TASK_GROUPS, TASK_PRIORITIES, TASK_SETS, USER_GROUPS, WORKSPACE_USERS, assigneeLabel,
} from '../data/tasks'
import { workspaceStore } from '../data/workspaceStore'
import { PBInput, PBLookup, PBRadio, PBSelect, PBTextArea } from '../pb'
import { registerAreaWindow, type AreaWindowArgs, type AreaWindowProps } from './areaWindowRegistry'
import { DialogButton, FormBand, FormRule, WorkspaceDialogFrame } from './WorkspaceDialogFrame'

/* ============================================================================
   Create New Task, and Create Task Set.

   PROVENANCE
   · 303766 image `8ae409de` (v02.21.18) — opened from Acknowledge - Consults
     with a record current: the Detail box pre-filled from the record, and a
     read-only Chart / patient / "Linked to: Consult - record id: 500090"
     line under it.
   · 303746 image `3c6b3303` (current build) — opened with New on the Task
     Inbox: nothing linked, so the Chart line is an editable field with the
     ellipsis (F4) chart lookup; the labels read Assign To / User Group, and
     the bottom-left checkbox of the older build is two buttons, Save Default
     Assignees and Remove Default Assignees. The Task field paints the
     required-field peach while it is empty.
   · 303596 image `1ef0075c` — the same window opened from a chart record:
     "Linked to: Chart - record id: 500079".
   · 1802744 image `8742b3f6` — Create Task Set: the blue header with Task
     Set / Assignee (All Tasks) and the chart and linked record at the right,
     then one row per task (Assign To, Priority, Task, Group, Due Date, Detail).

   The current build's labels are the ones used (Assign To / User Group, the
   two default-assignee buttons); the manual's text still describes the older
   "Save assignees as default" checkbox.

   Behaviour: the four Priority radios with Medium pre-selected, Due Date
   pre-filled with today, Create (F2) raising the task — into your own Task
   Inbox when it is assigned to you, into Sent Tasks otherwise — and Create
   Task Set… (or Ctrl+K a second time, art. 303766) swapping the window for
   Create Task Set on the same record.

   ARGS (all optional): `chart`, `patient` (SURNAME, FIRST), `linkedTo`
   ("Consult - record id: 500090"), `detail` (the record's text), `task`
   (a pre-filled subject), `user` / `team` / `priority` (L M H V).
   ========================================================================= */

const str = (v: unknown) => (typeof v === 'string' ? v : '')

const PEACH = '#ffc09c'

/** yyyy.mm.dd plus `days`. */
function addDays(stamp: string, days: number): string {
  const [y, m, d] = stamp.split('.').map(Number)
  const at = new Date(Date.UTC(y!, m! - 1, d! + days))
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${at.getUTCFullYear()}.${pad(at.getUTCMonth() + 1)}.${pad(at.getUTCDate())}`
}

/** Raise one task from the window's values. */
function raiseTask(args: AreaWindowArgs, values: {
  user: string; team: string; priority: string; due: string; task: string; chart: string
}) {
  const toSelf = values.user === CURRENT_USER.name || (!values.user && !values.team)
  workspaceStore.addTask({
    p: values.priority,
    due: values.due,
    patient: str(args.patient),
    task: values.task || '(no subject)',
    assignee: values.team ? 'TEAM' : assigneeLabel(values.user || CURRENT_USER.name),
    team: values.team,
    created: MOIS_TODAY,
    createdBy: CURRENT_USER.name,
    chart: values.chart,
  }, toSelf)
}

function PriorityRadios({ name, value, onChange, inline }: {
  name: string; value: string; onChange: (code: string) => void; inline?: boolean
}) {
  const radio = (code: string, label: string) => (
    <PBRadio key={code} name={name} label={label} checked={value === code} onChange={() => onChange(code)} />
  )
  if (inline) {
    return <span className="pb-row" style={{ gap: 14 }}>{TASK_PRIORITIES.map((p) => radio(p.code, p.label))}</span>
  }
  /* two columns: Low over Medium, High over V. High */
  return (
    <span style={{ display: 'grid', gridTemplateColumns: '118px 100px', rowGap: 8 }}>
      {radio('L', 'Low')}
      {radio('H', 'High')}
      {radio('M', 'Medium')}
      {radio('V', 'V. High')}
    </span>
  )
}

/* --------------------------------------------------------------------------
   Create New Task
   ------------------------------------------------------------------------ */
export function CreateTaskDialog({ args, close, open }: AreaWindowProps) {
  const linked = str(args.linkedTo)
  /* a lesson "types" by passing the values (`user`, `team`, `priority`,
     `task`), the way the New Appointment window takes them */
  const [user, setUser] = useState(str(args.user))
  const [team, setTeam] = useState(str(args.team))
  const [priority, setPriority] = useState(str(args.priority) || 'M')
  const [due, setDue] = useState(MOIS_TODAY)
  const [task, setTask] = useState(str(args.task))
  const [group, setGroup] = useState('')
  const [detail, setDetail] = useState(str(args.detail))
  const [chart, setChart] = useState(str(args.chart))

  const create = () => {
    raiseTask(args, { user, team, priority, due, task, chart })
    close()
  }

  const label = (text: string, w = 64) => <span className="pb-form__label" style={{ width: w, flex: 'none' }}>{text}</span>

  return (
    <WorkspaceDialogFrame id="create-task" title="Create New Task" width={856} height={606} onClose={close}>
      <div style={{ margin: '12px 14px 0', border: '1px solid #a0a0a0', background: 'var(--pb-face)', display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}>
        <FormBand
          right={(
            <DialogButton id="create-task-set" width={122} onClick={() => open('create-task-set', args)}>
              Create Task Set…
            </DialogButton>
          )}
        >
          Task Information
        </FormBand>

        <div className="pb-row" style={{ gap: 8, padding: '10px 10px', flex: 'none' }}>
          {label('Assign To:')}
          <PBSelect w={214} options={['', ...WORKSPACE_USERS]} value={user} data-tutorial-id="host.mois.field.task-assign-to" onChange={(e) => setUser(e.target.value)} />
          <b style={{ margin: '0 24px' }}>AND / OR</b>
          <span className="pb-form__label">User Group:</span>
          <PBSelect w={250} options={USER_GROUPS} value={team} data-tutorial-id="host.mois.field.task-user-group" onChange={(e) => setTeam(e.target.value)} />
        </div>
        <FormRule />

        <div className="pb-row" style={{ gap: 8, padding: '10px 10px', flex: 'none', alignItems: 'flex-start' }}>
          {label('Priority:')}
          <span data-tutorial-id="host.mois.field.task-priority"><PriorityRadios name="task-priority" value={priority} onChange={setPriority} /></span>
          <span style={{ flex: '1 1 auto' }} />
          <span className="pb-form__label">Due Date:</span>
          <PBInput w={134} align="center" value={due} data-tutorial-id="host.mois.field.task-due-date" onChange={(e) => setDue(e.target.value)} />
          <span style={{ width: 110 }} />
        </div>
        <FormRule />

        <div style={{ display: 'grid', gridTemplateColumns: '74px 1fr', rowGap: 6, padding: '10px 10px', flex: '1 1 auto', minHeight: 0, gridTemplateRows: 'auto auto 1fr' }}>
          {label('Task:')}
          <PBInput
            w="100%"
            value={task}
            data-tutorial-id="host.mois.field.task-subject"
            style={task ? undefined : { background: PEACH }}
            onChange={(e) => setTask(e.target.value)}
          />
          {label('Group:')}
          <PBSelect w={208} options={TASK_GROUPS} value={group} onChange={(e) => setGroup(e.target.value)} />
          {label('Detail:')}
          <PBTextArea
            value={detail}
            data-tutorial-id="host.mois.field.task-detail"
            onChange={(e) => setDetail(e.target.value)}
            style={{ height: '100%', minHeight: 120, resize: 'none', whiteSpace: 'pre-wrap' }}
          />
        </div>
        <FormRule />

        {/* linked to a record: the chart is read-only and the record named;
            raised from nothing: an editable Chart with the chart lookup */}
        <div className="pb-row" style={{ gap: 8, padding: '10px 10px 14px', flex: 'none' }} data-tutorial-id="host.mois.field.task-chart">
          {label('Chart:', 74)}
          {linked ? (
            <>
              <span style={{ width: 128 }}>{chart}</span>
              <span style={{ flex: '1 1 auto' }}>{str(args.patient)}</span>
              <span className="pb-form__label">Linked to:</span>
              <span style={{ width: 220 }}>{linked}</span>
            </>
          ) : (
            <PBLookup w={128} value={chart} name="task-chart" onChange={setChart} />
          )}
        </div>
      </div>

      <div className="pb-row" style={{ gap: 6, padding: '12px 14px 12px', flex: 'none' }}>
        <DialogButton id="save-default-assignees" width={150}>Save Default Assignees</DialogButton>
        <DialogButton id="remove-default-assignees" width={166}>Remove Default Assignees</DialogButton>
        <span style={{ width: 70 }} />
        <DialogButton id="task-create" onClick={create} isDefault>Create (F2)</DialogButton>
        <DialogButton id="task-cancel" onClick={close}>Cancel</DialogButton>
      </div>
    </WorkspaceDialogFrame>
  )
}

/* --------------------------------------------------------------------------
   Create Task Set
   ------------------------------------------------------------------------ */
type SetRow = { user: string; priority: string; task: string; group: string; due: string; detail: string }

function rowsFor(setName: string, recordText: string): SetRow[] {
  const set = TASK_SETS.find((s) => s.name === setName)
  return (set?.tasks ?? []).map((t) => ({
    user: '', priority: t.priority, task: t.task, group: '', due: addDays(MOIS_TODAY, t.dueIn),
    detail: recordText ? `${t.detail}\n\n\n${recordText}` : t.detail,
  }))
}

export function CreateTaskSetDialog({ args, close }: AreaWindowProps) {
  const record = str(args.detail)
  const [setName, setSetName] = useState(TASK_SETS[0]!.name)
  const [everyone, setEveryone] = useState('')
  const [rows, setRows] = useState<SetRow[]>(() => rowsFor(TASK_SETS[0]!.name, record))
  const [cur, setCur] = useState(0)

  const patch = (i: number, next: Partial<SetRow>) =>
    setRows((all) => all.map((r, j) => (j === i ? { ...r, ...next } : r)))

  const create = () => {
    for (const r of rows) {
      raiseTask(args, { user: r.user || everyone, team: '', priority: r.priority, due: r.due, task: r.task, chart: str(args.chart) })
    }
    close()
  }

  const white = { color: '#fff', fontWeight: 'bold' as const }

  return (
    <WorkspaceDialogFrame id="create-task-set" title="Create Task Set" width={980} height={660} onClose={close}>
      {/* the gradient header: which set, and who gets every task in it */}
      <div
        style={{
          margin: '10px 10px 0', height: 96, flex: 'none', padding: '16px 14px',
          background: 'linear-gradient(#0b4f8a, #3c8fd0 70%, #6fb3e8)',
          display: 'grid', gridTemplateColumns: '130px 280px 1fr', rowGap: 8, alignItems: 'center',
        }}
      >
        <span style={{ color: '#fff' }}>Task Set:</span>
        <PBSelect
          w={270}
          options={TASK_SETS.map((s) => s.name)}
          value={setName}
          data-tutorial-id="host.mois.field.task-set"
          onChange={(e) => { setSetName(e.target.value); setRows(rowsFor(e.target.value, record)); setCur(0) }}
        />
        <span style={{ color: '#fff' }}>
          Chart: <span style={white}>{str(args.chart) || '-'}</span>
          <span style={{ ...white, marginLeft: 30 }}>{str(args.patient)}</span>
        </span>
        <span style={{ color: '#fff' }}>Assignee (All Tasks):</span>
        <PBSelect w={150} options={['', ...WORKSPACE_USERS]} value={everyone} data-tutorial-id="host.mois.field.task-set-assignee" onChange={(e) => setEveryone(e.target.value)} />
        <span style={{ color: '#fff' }}>
          Linked To: <span style={white}>{str(args.linkedTo) || '-'}</span>
        </span>
      </div>

      <div style={{ margin: '0 10px', flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', border: '1px solid #a0a0a0', background: '#f0f0f0' }}>
        <FormBand>Tasks</FormBand>
        <div style={{ overflow: 'auto', flex: '1 1 auto' }}>
          {rows.map((r, i) => (
            <div
              key={i}
              onMouseDown={() => setCur(i)}
              data-tutorial-id={`host.mois.row.task-set-${i}`}
              style={{
                display: 'grid', gridTemplateColumns: '72px 176px 1fr 290px', gap: '6px 8px',
                padding: '6px 8px', borderBottom: '1px solid #b0b0b0',
                background: i === cur ? '#e79b84' : i % 2 ? '#e6e6e6' : '#fff',
              }}
            >
              <span className="pb-form__label">Assign To:</span>
              <PBSelect w={170} options={['', ...WORKSPACE_USERS]} value={r.user || everyone} onChange={(e) => patch(i, { user: e.target.value })} />
              <span className="pb-row" style={{ gap: 10 }}>
                <span className="pb-form__label">Priority:</span>
                <PriorityRadios name={`task-set-priority-${i}`} value={r.priority} onChange={(p) => patch(i, { priority: p })} inline />
              </span>
              <span className="pb-row" style={{ gap: 6, gridRow: 'span 3', alignItems: 'flex-start' }}>
                <span className="pb-form__label">Detail:</span>
                <PBTextArea
                  value={r.detail}
                  onChange={(e) => patch(i, { detail: e.target.value })}
                  style={{ width: 240, height: 92, resize: 'none', fontFamily: 'var(--pb-mono, monospace)' }}
                />
              </span>
              <span className="pb-form__label">Task:</span>
              <span style={{ gridColumn: 'span 2' }}>
                <PBInput w="100%" value={r.task} onChange={(e) => patch(i, { task: e.target.value })} />
              </span>
              <span className="pb-form__label">Group:</span>
              <PBSelect w={170} options={TASK_GROUPS} value={r.group} onChange={(e) => patch(i, { group: e.target.value })} />
              <span className="pb-row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                <span className="pb-form__label">Due Date:</span>
                <PBInput w={130} align="center" value={r.due} onChange={(e) => patch(i, { due: e.target.value })} />
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="pb-row" style={{ gap: 12, padding: '12px 0', justifyContent: 'center', flex: 'none' }}>
        <DialogButton id="task-set-create" onClick={create} isDefault>Create (F2)</DialogButton>
        <DialogButton id="task-set-cancel" onClick={close}>Cancel</DialogButton>
      </div>
    </WorkspaceDialogFrame>
  )
}

registerAreaWindow('create-task', CreateTaskDialog)
registerAreaWindow('create-task-set', CreateTaskSetDialog)
