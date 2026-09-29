import { useEffect, useState } from 'react'
import {
  PBButton, PBCheckbox, PBCommandRow, PBDataWindow, PBInput, PBRadio, PBSelect, PBTabs, PBTextArea, pbSlug,
} from '../pb'
import {
  TASK_FILTER, TASK_FILTER_DEFAULT, TASK_PRIORITIES, USER_GROUPS, WORKSPACE_USERS, taskScreenByNode,
  type TaskRow, type TaskScreen,
} from '../data/tasks'
import { argStr as str } from '../data/text'
import { taskListRows } from '../data/workspaceLists'
import { setCurrentWorkspaceRow, useWorkspaceStore } from '../data/workspaceStore'
import { useWorkspaceExtras, workspaceExtras } from '../data/workspaceExtras'
import { useScreenReport } from '../host/screen-state'
import { useOpenWindow } from './areaWindowRegistry'
import { FormLabel } from './formKit'
import { WorkspaceBanner } from './WorkspaceBanner'
import { SEARCH_FIELDS, matchesSearch } from '../data/workspaceSearch'

/* ============================================================================
   The Workspace's four list screens: Task Inbox, Sent Tasks, Message Inbox
   and Sent Messages.

   One frame, four column sets — see `data/tasks.ts` for the per-screen
   provenance. What distinguishes them on screen is the command row (Sent
   Tasks has no New; Message Inbox has Reply / Reply All / Forward), the
   filter strip (Sent Messages alone has no Acknowledged / Completed
   drop-downs) and the View selector, which only the Task Inbox carries.

   Under the grid (1802744 image `c734bd09`, v02.30.22; 303771 `b1ac2b08`):
   a task shows Detail and Follow Up Notes (n) tabs — Assigned To User AND /
   OR User Group, Chart, Priority, Due, Group, Status (Acknowledged /
   Completed), Created By, Task and Detail. A message (303753 `180bb8f4`;
   1802747 `8fa29914`) shows Priority, From, Status, Chart, Patient,
   Subject and Detail beside the Sent To and Copied To grids, each with its
   own Ack and Comp columns.

   State lives in the ink, not the fill: an unacknowledged row is bold, and
   an acknowledged-and-completed one is struck through in grey. The zebra is
   banding. A team assignee reads TEAM in teal, with the team in a tooltip
   (1802744).

   Added for art. 1802744 "Task Inbox":
   - View: View 1 shows Created and Created By; View 2 shows the Task Group
     in their place (`c734bd09…` ringed selector; INFERRED column position).
   - Follow Up Notes (n) (`d5b7a079…`): a `Follow Up Notes` band with New /
     Delete over Date | Author | Note; a double-click or Alt+Z on a note opens
     it in full (the `follow-up-note` window, WorkspaceBasketWindows.tsx),
     where a change records Modified By.
   - Search For searches Patient and Task; the "…" (or F4) opens Advanced
     Search on Priority, Patient, Task, Assignee, Group and Team
     (`79f934dc…`).
   ========================================================================= */

const cx = (...v: (string | false | undefined)[]) => v.filter(Boolean).join(' ')

const yesNo = (v: string, on: boolean | undefined) =>
  v === 'All' || (v === 'Yes') === Boolean(on)

export const taskRowSlug = (r: TaskRow) => `task-${pbSlug(String(r.task ?? r.subject ?? '').slice(0, 24))}`

/** What a window opened on the current row carries: Create Message from Task
    pre-fills the task's detail and sends to its creator (art. 303599);
    Create Task From Message converts the message (art. 303753). */
export function taskRowArgs(screen: TaskScreen, r: TaskRow): Record<string, unknown> {
  if (screen.kind === 'task') {
    return {
      chart: str(r.chart), patient: str(r.patient), subject: str(r.task),
      detail: str(r.detail), sendTo: str(r.createdBy), fromTask: str(r.task),
    }
  }
  return {
    chart: str(r.chart), patient: str(r.patient), task: str(r.subject), subject: str(r.subject),
    detail: str(r.detail), priority: str(r.p), fromMessage: str(r.subject),
  }
}

function PriorityRow({ value }: { value: string }) {
  return (
    <span className="pb-row" style={{ gap: 18 }}>
      {TASK_PRIORITIES.map((p) => <PBRadio key={p.code} name="detail-priority" label={p.label} checked={value === p.code} />)}
    </span>
  )
}

/** Detail / Follow Up Notes under a task list. */
function TaskDetail({ r }: { r: TaskRow | undefined }) {
  const extras = useWorkspaceExtras()
  const openWindow = useOpenWindow()
  const slug = r ? taskRowSlug(r) : ''
  const notes = slug ? extras.followUps[slug] ?? [] : []
  const [noteCur, setNoteCur] = useState(0)
  const [tab, setTab] = useState('Detail')
  const notesTab = `Follow Up Notes (${notes.length})`
  const openNote = (id?: string) => { if (r) openWindow('follow-up-note', { task: slug, note: id ?? '', subject: str(r.task) }) }
  const noteButton = (id: string, label: string, onClick: () => void) => (
    <PBButton size="sm" style={{ minWidth: 52 }} disabled={!r} command={id} onClick={onClick}>
      {label}
    </PBButton>
  )
  const rule = <div style={{ borderTop: '1px solid #b8b8b8', margin: '3px 0' }} />
  return (
    <PBTabs tabs={['Detail', notesTab]} active={tab === 'Detail' ? 'Detail' : notesTab} onChange={(t) => setTab(t === 'Detail' ? 'Detail' : 'notes')} face>
      {tab === 'Detail' ? (
        <div style={{ padding: '4px 8px', display: 'flex', flexDirection: 'column', gap: 3, flex: '1 1 auto', minHeight: 0 }} data-tutorial-id="host.mois.field.task-detail-pane">
          <div className="pb-row" style={{ gap: 8 }}>
            <FormLabel w={80}>Assigned To:</FormLabel>
            <span className="pb-form__label">User:</span>
            <PBSelect w={170} options={['', ...WORKSPACE_USERS]} value={str(r?.user)} onChange={() => {}} />
            <b style={{ margin: '0 20px' }}>AND / OR</b>
            <span className="pb-form__label">User Group:</span>
            <PBSelect w={170} options={USER_GROUPS} value={str(r?.team)} onChange={() => {}} />
          </div>
          <div className="pb-row" style={{ gap: 8 }}>
            <FormLabel w={80}>Chart:</FormLabel>
            <b style={{ width: 70 }}>{str(r?.chart)}</b>
            <b>{str(r?.patient)}</b>
          </div>
          {rule}
          <div className="pb-row" style={{ gap: 8 }}>
            <FormLabel w={80}>Priority:</FormLabel>
            <PriorityRow value={str(r?.p)} />
          </div>
          <div className="pb-row" style={{ gap: 8 }}>
            <FormLabel w={80}>Due:</FormLabel>
            <PBInput w={84} align="center" readOnly value={str(r?.due)} />
            <span className="pb-form__label">Group:</span>
            <PBSelect w={176} options={['', str(r?.group)].filter((v, i) => i === 0 || v)} value={str(r?.group)} onChange={() => {}} />
          </div>
          {rule}
          <div className="pb-row" style={{ gap: 8, alignItems: 'flex-start' }}>
            <FormLabel w={80}>Status:</FormLabel>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2, width: 200 }}>
              <PBCheckbox label="Acknowledged" checked={Boolean(r?.ack)} />
              <PBCheckbox label="Completed" checked={Boolean(r?.comp)} />
            </span>
            <span style={{ flex: '1 1 auto' }} />
            <span className="pb-form__label">Created By:</span>
            <span style={{ width: 180 }}>{str(r?.createdBy)}<br />{str(r?.created)}</span>
          </div>
          {rule}
          <div className="pb-row" style={{ gap: 8 }}>
            <FormLabel w={80}>Task:</FormLabel>
            <PBInput w="100%" readOnly value={str(r?.task)} />
          </div>
          <div className="pb-row" style={{ gap: 8, alignItems: 'stretch', flex: '1 1 auto', minHeight: 0 }}>
            <FormLabel w={80}>Detail:</FormLabel>
            <PBTextArea readOnly value={str(r?.detail)} style={{ flex: '1 1 auto', minHeight: 44, resize: 'none', fontFamily: 'var(--pb-mono, monospace)' }} />
          </div>
          <div className="pb-row" style={{ gap: 12 }}>
            <FormLabel w={80}>Created:</FormLabel>
            <span>{str(r?.createdAt) || str(r?.created)}{'   '}{str(r?.createdBy)}</span>
          </div>
        </div>
      ) : (
        <div
          style={{ padding: 6, flex: '1 1 auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}
          data-tutorial-id="host.mois.field.follow-up-notes"
          onKeyDown={(e) => { if (e.altKey && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); openNote(notes[noteCur]?.id) } }}
        >
          <div className="pb-row" style={{ gap: 2, background: 'linear-gradient(#f4f4f4, #dcdcdc)', border: '1px solid #a0a0a0', padding: '2px 4px', flex: 'none' }}>
            <b>Follow Up Notes</b>
            <span className="pb-row__spacer" />
            {noteButton('follow-up-new', 'New', () => openNote())}
            {noteButton('follow-up-delete', 'Delete', () => { const n = notes[noteCur]; if (n) workspaceExtras.deleteFollowUp(slug, n.id) })}
          </div>
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
            <PBDataWindow
              rows={notes.map((n) => ({ ...n, who: n.modifiedBy ? `${n.author} (Modified By: ${n.modifiedBy})` : n.author }))}
              current={noteCur}
              onCurrentChange={setNoteCur}
              onActivate={(n) => openNote(n.id)}
              rowTutorialId={(_n, i) => `host.mois.row.follow-up-${i}`}
              columns={[{ key: 'date', header: 'Date', width: 90 }, { key: 'who', header: 'Author', width: 200 }, { key: 'note', header: 'Note' }]}
              empty="No follow up notes."
            />
          </div>
        </div>
      )}
    </PBTabs>
  )
}

/** The recipient grids beside a message: who it went to, and whether each
    of them has acknowledged and completed it. */
function RecipientGrid({ caption, names, ack }: { caption: string; names: string[]; ack?: boolean }) {
  return (
    <div style={{ flex: '1 1 0', minHeight: 0, display: 'flex', flexDirection: 'column', background: '#fff' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 38px 38px', background: '#c6dcf5', height: 18, lineHeight: '18px', textAlign: 'center', flex: 'none' }}>
        <span>{caption}</span><span>Ack</span><span>Comp</span>
      </div>
      {names.map((n) => (
        <div key={n} style={{ display: 'grid', gridTemplateColumns: '1fr 38px 38px', height: 18, lineHeight: '18px', background: '#f6b8a0' }}>
          <span style={{ paddingLeft: 2, overflow: 'hidden', whiteSpace: 'nowrap' }}>{n}</span>
          <span style={{ textAlign: 'center' }}>{ack ? 'X' : ''}</span>
          <span />
        </div>
      ))}
    </div>
  )
}

function MessageDetail({ r, inbox }: { r: TaskRow | undefined; inbox: boolean }) {
  const list = (v: unknown) => str(v).split(';').map((s) => s.trim()).filter(Boolean)
  return (
    <div style={{ display: 'flex', flex: '1 1 auto', minHeight: 0, background: 'var(--pb-face)', border: '1px solid #a0a0a0' }} data-tutorial-id="host.mois.field.message-detail-pane">
      <div style={{ flex: '1 1 auto', minWidth: 0, padding: '4px 8px', display: 'flex', flexDirection: 'column', gap: 3 }}>
        {inbox ? (
          <>
            <div className="pb-row" style={{ gap: 8 }}>
              <FormLabel w={70}>Priority:</FormLabel>
              <PriorityRow value={str(r?.p)} />
              <span style={{ flex: '1 1 auto' }} />
              <span className="pb-form__label">From:</span>
              <span>{str(r?.from)}{'   '}{str(r?.sent)}</span>
            </div>
            <div className="pb-row" style={{ gap: 8, alignItems: 'flex-start' }}>
              <FormLabel w={70}>Status:</FormLabel>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2, width: 170 }}>
                <PBCheckbox label="Acknowledged" checked={Boolean(r?.ack)} />
                <PBCheckbox label="Completed" checked={Boolean(r?.comp)} />
              </span>
              <span style={{ flex: '1 1 auto' }} />
              <span style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 8 }}>
                <span className="pb-form__label">Chart:</span><span>{str(r?.chart)}</span>
                <span className="pb-form__label">Patient:</span><span>{str(r?.patient)}</span>
              </span>
            </div>
          </>
        ) : (
          <div className="pb-row" style={{ gap: 8 }}>
            <FormLabel w={70}>Chart:</FormLabel>
            <span>{[str(r?.chart), str(r?.patient)].filter(Boolean).join(' - ')}</span>
          </div>
        )}
        <div className="pb-row" style={{ gap: 8 }}>
          <FormLabel w={70}>Subject:</FormLabel>
          <PBInput w="100%" readOnly value={str(r?.subject)} />
        </div>
        <div className="pb-row" style={{ gap: 8, alignItems: 'stretch', flex: '1 1 auto', minHeight: 0 }}>
          <FormLabel w={70}>Detail:</FormLabel>
          <PBTextArea readOnly value={str(r?.detail)} style={{ flex: '1 1 auto', resize: 'none' }} />
        </div>
        <div className="pb-row" style={{ gap: 12 }}>
          <FormLabel w={70}>Created:</FormLabel>
          <span>{str(r?.sent)}{'   '}{str(r?.from ?? r?.sentBy)}</span>
          <span style={{ marginLeft: 30 }}>Last Modified:</span>
        </div>
      </div>
      <div style={{ width: 208, flex: 'none', display: 'flex', flexDirection: 'column', gap: 6, borderLeft: '1px solid #a0a0a0', padding: 2 }} data-tutorial-id="host.mois.field.message-recipients">
        <RecipientGrid caption="Sent To" names={list(r?.sentTo)} ack={Boolean(r?.sentToAck)} />
        <RecipientGrid caption="Copied To" names={list(r?.copiedTo)} />
      </div>
    </div>
  )
}

export function TaskListView({ node, onOpenChart }: { node: string; onOpenChart?: () => void }) {
  const screen: TaskScreen | undefined = taskScreenByNode(node)
  const ws = useWorkspaceStore()
  const openWindow = useOpenWindow()
  const [ack, setAck] = useState(TASK_FILTER_DEFAULT)
  const [comp, setComp] = useState(TASK_FILTER_DEFAULT)
  const [cur, setCur] = useState(0)
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null)
  /* Ack. / Comp. ticked on the grid, before Save */
  const [marks, setMarks] = useState<Record<string, { ack?: boolean; comp?: boolean }>>({})
  const extras = useWorkspaceExtras()
  const [search, setSearch] = useState('')
  const [criteria, setCriteria] = useState<Record<string, string>>({})

  const all: TaskRow[] = taskListRows(node, ws).map((r): TaskRow => ({ ...r, ...marks[taskRowSlug(r)] }))
  const searchFields = screen?.kind === 'task' ? SEARCH_FIELDS.task! : [{ key: 'patient', label: 'Patient', default: true }, { key: 'subject', label: 'Subject', default: true }]
  const filtered = (screen?.filters ? all.filter((r) => yesNo(ack, r.ack) && yesNo(comp, r.comp)) : all)
    .filter((r) => matchesSearch(r, search, criteria, searchFields))
  const rows = sort
    ? [...filtered].sort((a, b) => String(a[sort.key] ?? '').localeCompare(String(b[sort.key] ?? '')) * sort.dir)
    : filtered
  const current = rows[cur]

  useEffect(() => {
    setCurrentWorkspaceRow(screen && current ? { node, row: taskRowSlug(current), args: taskRowArgs(screen, current) } : null)
  })
  useScreenReport(current ? { row: taskRowSlug(current) } : {})

  if (!screen) return null

  const view2 = !!screen.viewSelect && extras.taskView === 'View 2'
  /* View 2 trades Created / Created By for the Task Group (1802744) */
  const viewColumns = view2
    ? [...screen.columns.filter((c) => c.key !== 'created' && c.key !== 'createdBy'), { key: 'group', header: 'Group', width: 173 }]
    : screen.columns
  const advanced = () => openWindow('advanced-search', { fields: searchFields, initial: criteria, onApply: (v: Record<string, string>) => { setCriteria(v); setCur(0) } })

  const onNew = () => { openWindow(screen.kind === 'task' ? 'create-task' : 'create-message') }
  const reply = (all: boolean) => () => {
    if (!current) return
    openWindow('create-message', {
      chart: str(current.chart), patient: str(current.patient),
      subject: str(current.subject), detail: str(current.detail),
      /* Reply goes to the sender; Reply All to the sender and every other recipient (1802746) */
      sendTo: str(current.from), ...(all ? { copiesTo: str(current.copiedTo) } : {}),
    })
  }
  const actionFor = (label: string): (() => void) | undefined => {
    switch (label) {
      case 'New': return onNew
      case 'Open Chart': return onOpenChart
      case 'Change W/S': return () => { openWindow('change-workspace') }
      case 'Reply': return reply(false)
      case 'Reply All': return reply(true)
      case 'Forward': return () => {
        if (current) openWindow('create-message', { chart: str(current.chart), patient: str(current.patient), subject: `FWD:${str(current.subject)}`, detail: str(current.detail) })
      }
      case 'Print': return () => { openWindow('print-task-list', { node }) }
      default: return undefined
    }
  }

  return (
    <>
      <WorkspaceBanner title={screen.title} />
      <PBCommandRow
        commands={screen.commands.map((label) => ({
          label,
          exactWidth: screen.commandWidths?.[label],
          onClick: actionFor(label),
        }))}
        right={screen.viewSelect
          ? (
            <span className="pb-row" style={{ gap: 6 }}>
              <span className="pb-form__label">View:</span>
              <PBSelect
                w={75}
                options={['View 1', 'View 2']}
                value={extras.taskView}
                onChange={(e) => workspaceExtras.setTaskView(e.target.value === 'View 2' ? 'View 2' : 'View 1')}
                data-tutorial-id="host.mois.field.task-view"
              />
            </span>
          )
          : undefined}
      />

      <div className="pb-row" style={{ gap: 6, padding: '4px 6px', background: '#f0f0f0', flex: 'none', alignItems: 'center' }}>
        <span className="pb-form__label">Search For:</span>
        <PBInput
          w={screen.filters ? 400 : 700}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setCur(0) }}
          onKeyDown={(e) => { if (e.key === 'F4') { e.preventDefault(); advanced() } }}
          data-tutorial-id="host.mois.field.task-search"
        />
        <button className="pb-inputgroup__btn pb-inputgroup__btn--dots" type="button" title="Advanced search…" data-tutorial-id="host.mois.command.task-advanced-search" onClick={advanced}>…</button>
        {screen.filters && (
          <>
            <span className="pb-form__label" style={{ marginLeft: 12 }}>Acknowledged:</span>
            <PBSelect
              w={54}
              options={TASK_FILTER}
              value={ack}
              data-tutorial-id="host.mois.field.filter-acknowledged"
              onChange={(e) => { setAck(e.target.value); setCur(0) }}
            />
            <span className="pb-form__label" style={{ marginLeft: 8 }}>Completed:</span>
            <PBSelect
              w={54}
              options={TASK_FILTER}
              value={comp}
              data-tutorial-id="host.mois.field.filter-completed"
              onChange={(e) => { setComp(e.target.value); setCur(0) }}
            />
          </>
        )}
      </div>

      <div style={{ flex: '1 1 auto', minHeight: 100, display: 'flex', padding: 3 }}>
        <PBDataWindow
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
          onActivate={onOpenChart}
          onSort={(key) => {
            if (key === 'ack' || key === 'comp') return
            setSort((s) => (s && s.key === key ? { key, dir: s.dir > 0 ? -1 : 1 } : { key, dir: 1 }))
            setCur(0)
          }}
          rowClassName={(r: TaskRow) => cx(
            !r.ack && 'pb-dw--unread',
            r.ack && r.comp && 'pb-dw--done',
          )}
          rowTutorialId={(r) => `host.mois.row.${taskRowSlug(r)}`}
          columns={viewColumns.map((c) => ('check' in c && c.check
            ? {
              ...c,
              render: (r: TaskRow) => (
                <PBCheckbox
                  checked={Boolean(r[c.key])}
                  onChange={(v) => setMarks((m) => ({ ...m, [taskRowSlug(r)]: { ...m[taskRowSlug(r)], [c.key]: v } }))}
                />
              ),
            }
            : c.key === 'assignee'
              ? {
                ...c,
                /* a team assignee reads TEAM in teal, the team in a tooltip */
                render: (r: TaskRow) => (
                  <span
                    title={r.assignee === 'TEAM' ? str(r.team) : str(r.user) || undefined}
                    style={r.assignee === 'TEAM' ? { color: '#008585' } : undefined}
                  >
                    {String(r.assignee ?? '')}
                  </span>
                ),
              }
              : c))}
          empty="Nothing matches those filters."
        />
      </div>

      <div style={{ height: 286, flex: 'none', display: 'flex', flexDirection: 'column', padding: '0 3px 3px' }}>
        {screen.kind === 'task'
          ? <TaskDetail r={current} />
          : <MessageDetail r={current} inbox={node === 'ws-msg-inbox'} />}
      </div>
    </>
  )
}
