import { useEffect, useState, type ReactNode } from 'react'
import { basketFolderById, type BasketRow } from '../data/basket'
import { MOIS_TODAY } from '../data/patients'
import { CURRENT_USER, TASK_GROUPS, USER_GROUPS, WORKSPACE_USERS, taskScreenByNode } from '../data/tasks'
import { taskListRows } from '../data/workspaceLists'
import { basketKey, useWorkspaceStore, workspaceStore, type WorkspaceBlend } from '../data/workspaceStore'
import {
  PBCheckbox, PBDataWindow, PBInput, PBRadio, PBSelect, PBTextArea, pbSlug, usePBInstrumentation,
} from '../pb'
import { useScreenReport } from '../host/screen-state'
import { registerAreaWindow, type AreaWindowProps } from './areaWindowRegistry'
import { DialogButton, FormBand, FormRule, WorkspaceDialogFrame } from './WorkspaceDialogFrame'

/* ============================================================================
   The Workspace's own windows (the Create New Task / Message windows live in
   CreateTaskDialog.tsx and CreateMessageDialog.tsx).

   · change-workspace           Change Workspace          303749 `861df29b`
   · mark-for-review            Mark Record for Review    303764 `4bf6cd3b`
   · reassign-items / copy-items  Reassign Items / Copy Items, then the
                                MOIS - Search Window user picker and the
                                Confirm screen            303758 `930dabdd`,
                                                          `9f68ea83`, `00757381`
   · basket-attachments         Document / Attachment List 303765 `30cd15ce`,
                                                          `cc577eb0`
   · confirm-task-from-message  the "Would you like to create a Task for the
                                selected Message?" prompt 303753
   · report-task-list           Report: Task List          303769 `129ef6bf`
   · print-task-list            Print Task / Messages - Current List → the
                                Print Preview              303771
   ========================================================================= */

const str = (v: unknown) => (typeof v === 'string' ? v : '')

/** A Win32 message box that reports its buttons like the rest of the frame. */
function Confirm({ id, title, children, buttons, onClose }: {
  id: string; title: string; children: ReactNode
  buttons: { id: string; label: string; onClick: () => void; isDefault?: boolean }[]
  onClose: () => void
}) {
  return (
    <WorkspaceDialogFrame id={id} title={title} width={420} onClose={onClose} controls={false} zIndex={90}>
      <div className="pb-row" style={{ gap: 14, padding: '20px 20px 18px', alignItems: 'flex-start', background: '#fff' }}>
        <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
          <circle cx="16" cy="16" r="14" fill="#1f7fd0" />
          <path d="M11.6 12.2c0-2.6 2-4.4 4.6-4.4 2.7 0 4.5 1.6 4.5 4 0 3.4-4 3.2-4 6.6h-3c0-4.4 4-4.2 4-6.4 0-1-.7-1.6-1.6-1.6-1 0-1.7.7-1.7 1.8z" fill="#fff" />
          <circle cx="16" cy="23.5" r="2" fill="#fff" />
        </svg>
        <span style={{ paddingTop: 8 }}>{children}</span>
      </div>
      <div className="pb-row" style={{ gap: 8, padding: '10px 12px', justifyContent: 'flex-end' }}>
        {buttons.map((b) => <DialogButton key={b.id} id={b.id} width={75} onClick={b.onClick} isDefault={b.isDefault}>{b.label}</DialogButton>)}
      </div>
    </WorkspaceDialogFrame>
  )
}

/* ---------------------------------------------------------------------------
   Change Workspace (303749 image `861df29b`, v02.21.14)
   ------------------------------------------------------------------------ */
/** The users who have shared their workspace with ADMINISTRATOR. */
const SHARED_WORKSPACES = [
  { name: 'ADMINISTRATOR', initials: 'ADMIN', until: '' },
  { name: 'BEARDWOOD, WENDY', initials: 'WB', until: '' },
  { name: 'SHEWCHUK, LEAH', initials: 'LS', until: '2026.04.30' },
  { name: 'RESIDENT, R1', initials: 'R1', until: '' },
]

function ChangeWorkspaceDialog({ close }: AreaWindowProps) {
  const ws = useWorkspaceStore()
  const [picked, setPicked] = useState<Set<string>>(() => new Set(
    ws.blend === 'own' || ws.blend === 'blend-with-me' ? [CURRENT_USER.name, ...ws.sharedWith] : ws.sharedWith,
  ))
  const [cur, setCur] = useState(0)
  const toggle = (name: string, on: boolean) => setPicked((s) => {
    const next = new Set(s)
    on ? next.add(name) : next.delete(name)
    return next
  })
  const proceed = () => {
    const others = SHARED_WORKSPACES.map((u) => u.name).filter((n) => n !== CURRENT_USER.name && picked.has(n))
    const me = picked.has(CURRENT_USER.name)
    const blend: WorkspaceBlend = !others.length ? 'own'
      : me ? 'blend-with-me'
        : others.length === 1 ? 'other' : 'blend-without-me'
    workspaceStore.changeWorkspace(blend, others)
    close()
  }
  const included = SHARED_WORKSPACES.filter((u) => picked.has(u.name))
  return (
    <WorkspaceDialogFrame id="change-workspace" title="Change Workspace" width={900} height={600} onClose={close} controls={false}>
      <div style={{ display: 'flex', gap: 6, padding: '10px 10px 0', flex: '1 1 auto', minHeight: 0 }}>
        <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', border: '1px solid #a0a0a0', background: '#fff' }}>
          <FormBand>Select One or More Shared Workspaces</FormBand>
          <div style={{ display: 'flex', flex: '1 1 auto', minHeight: 0 }}>
            <PBDataWindow
              rows={SHARED_WORKSPACES}
              current={cur}
              onCurrentChange={setCur}
              groupBy={() => 'USERS'}
              groupLabel={(g) => <b>{g}</b>}
              rowTutorialId={(u) => `host.mois.row.ws-share-${pbSlug(u.name.split(',')[0]!)}`}
              columns={[
                {
                  key: 'select', header: 'Select', width: 80, align: 'center',
                  render: (u) => (
                    <PBCheckbox
                      tutorialId={`host.mois.cell.ws-share-${pbSlug(u.name.split(',')[0]!)}`}
                      checked={picked.has(u.name)}
                      onChange={(v) => toggle(u.name, v)}
                    />
                  ),
                },
                { key: 'name', header: 'Name', width: 300 },
                { key: 'initials', header: 'Initials', width: 80 },
                { key: 'until', header: 'Shared Until', width: 90 },
              ]}
            />
          </div>
        </div>
        <div style={{ width: 230, flex: 'none', display: 'flex', flexDirection: 'column', border: '1px solid #a0a0a0', background: '#fff' }}>
          <FormBand>Included Users</FormBand>
          <div style={{ display: 'flex', flex: '1 1 auto', minHeight: 0 }} data-tutorial-id="host.mois.field.included-users">
            <PBDataWindow rows={included} gutter={false} current={-1} columns={[{ key: 'name', header: 'Name' }]} />
          </div>
        </div>
      </div>
      <div className="pb-row" style={{ gap: 8, padding: '10px 12px', flex: 'none' }}>
        <PBCheckbox label="Save as Default" />
        <span style={{ flex: '1 1 auto' }} />
        <DialogButton id="ws-continue" onClick={proceed} isDefault>Continue</DialogButton>
        <DialogButton id="ws-cancel" onClick={close}>Cancel</DialogButton>
        <span style={{ flex: '1 1 auto' }} />
        <DialogButton id="manage-workgroups" width={150}>Manage Workgroups...</DialogButton>
      </div>
    </WorkspaceDialogFrame>
  )
}

/* ---------------------------------------------------------------------------
   Mark Record for Review (303764 image `4bf6cd3b`)
   ------------------------------------------------------------------------ */
function MarkForReviewDialog({ args, close }: AreaWindowProps) {
  const [note, setNote] = useState('')
  const proceed = () => {
    const key = str(args.rowKey)
    if (key) workspaceStore.markForReview(key)
    close()
  }
  return (
    <WorkspaceDialogFrame id="mark-for-review" title="Mark Record for Review" width={447} height={288} onClose={close} controls={false}>
      <div style={{ display: 'grid', gridTemplateColumns: '88px 1fr', rowGap: 6, padding: '18px 22px 0', flex: '1 1 auto' }}>
        <span>User Name:</span><b>{CURRENT_USER.name}</b>
        <span>Date:</span><span>{MOIS_TODAY}</span>
        <span>Time:</span><span>14:43</span>
        <span style={{ marginTop: 12 }}>Note:<br /><span style={{ color: '#8a8a8a' }}>(optional)</span></span>
        <PBTextArea
          value={note}
          placeholder="I need to review this item because..."
          data-tutorial-id="host.mois.field.review-note"
          onChange={(e) => setNote(e.target.value)}
          style={{ marginTop: 12, height: 66, resize: 'none' }}
        />
      </div>
      <div className="pb-row" style={{ gap: 12, padding: '14px 0', justifyContent: 'center', flex: 'none' }}>
        <DialogButton id="review-continue" onClick={proceed} isDefault>Continue</DialogButton>
        <DialogButton id="review-cancel" onClick={close}>Cancel</DialogButton>
      </div>
    </WorkspaceDialogFrame>
  )
}

/* ---------------------------------------------------------------------------
   Reassign Items / Copy Items (303758 / 2124334)
   ------------------------------------------------------------------------ */
const SEARCH_ROWS = [
  { name: 'ADMINISTRATOR', role: 'ADMINISTRATION', type: 'PROVIDER', members: 'BEARDWOOD, W.; SMITH, D.', status: 'A' },
  { name: 'BEARDWOOD, WENDY', role: 'MEDICAL DOCTOR', type: 'PROVIDER', members: 'BEARDWOOD, WENDY', status: 'A' },
  { name: 'DHALIWAL, RUPINDER', role: 'NURSE', type: 'USER', members: '', status: 'A' },
  { name: 'GRUBB, HELENA', role: 'NURSE', type: 'USER', members: '', status: 'A' },
  { name: 'RESIDENT, R1', role: 'RESIDENT', type: 'PROVIDER', members: 'RESIDENT, R1', status: 'A' },
  { name: 'SHEWCHUK, LEAH', role: 'MOA', type: 'USER', members: '', status: 'A' },
  { name: 'SMITH, DALENE', role: 'MEDICAL DOCTOR', type: 'PROVIDER', members: 'SMITH, DALENE', status: 'A' },
  { name: 'MOA', role: '-', type: 'ORG. ROLE', members: 'SHEWCHUK, LEAH', status: 'A' },
]

function ForwardItemsDialog({ args, close }: AreaWindowProps) {
  const mode = args.mode === 'copy' ? 'copy' : 'reassign'
  const Mode = mode === 'copy' ? 'Copy' : 'Reassign'
  const folder = basketFolderById(str(args.folder))
  const ws = useWorkspaceStore()
  const rows: BasketRow[] = (folder?.rows ?? []).filter((r) => !ws.reassigned.includes(basketKey(folder!.id, String(r.patient))))
  const [picked, setPicked] = useState<Set<number>>(new Set())
  const [note, setNote] = useState('')
  const [stage, setStage] = useState<'list' | 'users' | 'confirm'>('list')
  const [users, setUsers] = useState<Set<string>>(new Set())
  const [cur, setCur] = useState(0)
  const [userCur, setUserCur] = useState(0)
  /* the picker and the confirmation are this window's own stages; the frame
     reports them as host.screen.window, and how many rows (or users) are
     ticked as host.screen.picked */
  useScreenReport({
    window: stage === 'users' ? 'search-window' : stage === 'confirm' ? `confirm-${mode === 'copy' ? 'copying' : 'reassignment'}` : '',
    picked: stage === 'users' ? users.size : picked.size,
  })
  if (!folder) return null

  const toggle = (i: number, on: boolean) => setPicked((s) => { const n = new Set(s); on ? n.add(i) : n.delete(i); return n })
  const finish = () => {
    const keys = [...picked].map((i) => basketKey(folder.id, String(rows[i]!.patient)))
    if (mode === 'reassign') workspaceStore.reassign(keys)
    close()
  }
  /* the folder's own columns after the Check / paperclip pair are left off,
     and the 2.22 column goes on the end (303758) */
  const columns = [
    {
      key: 'select', header: 'Select', width: 50, align: 'center' as const,
      render: (_r: BasketRow, i: number) => (
        <PBCheckbox tutorialId={`host.mois.cell.forward-${i}`} checked={picked.has(i)} onChange={(v) => toggle(i, v)} />
      ),
    },
    ...folder.columns.filter((c) => c.key !== 'check' && c.key !== 'clip'),
    { key: folder.extra.key, header: folder.extra.header, width: 120 },
  ]

  return (
    <>
      <WorkspaceDialogFrame id={mode === 'copy' ? 'copy-items' : 'reassign-items'} title={`${Mode} Items`} width={960} height={600} onClose={close} controls={false}>
        <div style={{ margin: '10px 10px 0', flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', border: '1px solid #a0a0a0', background: '#fff' }}>
          <FormBand>{Mode} Items</FormBand>
          <div style={{ display: 'flex', flex: '1 1 auto', minHeight: 0 }}>
            <PBDataWindow
              rows={rows}
              current={cur}
              onCurrentChange={setCur}
              hscroll
              rowFill={(_r, i) => (picked.has(i) ? '#9cfb9c' : undefined)}
              columns={columns}
            />
          </div>
        </div>
        <div className="pb-row" style={{ gap: 6, padding: '8px 10px 0', flex: 'none', alignItems: 'flex-start' }}>
          <DialogButton id="forward-select-all" width={76} onClick={() => setPicked(new Set(rows.map((_, i) => i)))}>Select All</DialogButton>
          <DialogButton id="forward-unselect-all" width={76} onClick={() => setPicked(new Set())}>Unselect All</DialogButton>
          <span style={{ width: 120, textAlign: 'right', marginLeft: 16 }}>
            {mode === 'copy' ? 'Copying Note:' : 'Reassignment Note:'}<br /><span style={{ color: '#8a8a8a' }}>(optional)</span>
          </span>
          <PBTextArea value={note} onChange={(e) => setNote(e.target.value)} style={{ flex: '1 1 auto', height: 34, resize: 'none' }} data-tutorial-id="host.mois.field.forward-note" />
        </div>
        <div className="pb-row" style={{ gap: 6, padding: '10px 0', justifyContent: 'center', flex: 'none' }}>
          <DialogButton id={`forward-${mode}`} width={84} disabled={!picked.size} onClick={() => setStage('users')} isDefault>{Mode} Items</DialogButton>
          <DialogButton id="forward-cancel" width={84} onClick={close}>Cancel</DialogButton>
        </div>
      </WorkspaceDialogFrame>

      {stage === 'users' && (
        <WorkspaceDialogFrame id="search-window" title="MOIS - Search Window" width={900} height={560} onClose={() => setStage('list')} controls={false} zIndex={85}>
          <div style={{ margin: '8px 8px 0', padding: '4px 8px', display: 'grid', gridTemplateColumns: '80px 220px 1fr 1fr 1fr', rowGap: 4, columnGap: 8, background: '#fff', border: '1px solid #a0a0a0', flex: 'none' }}>
            <b style={{ gridColumn: 'span 2' }}>Search for:</b><b>Include:</b><b>Membership</b><b>Record Status:</b>
            <span>Name:</span><PBInput w={210} />
            <PBCheckbox label="Users" checked /><PBCheckbox label="Limit to My Active Memberships" /><PBCheckbox label="Active" checked />
            <span>Group:</span><PBInput w={210} />
            <PBCheckbox label="Providers" checked /><span /><span />
            <span>Provider:</span><PBInput w={210} />
            <PBCheckbox label="Org. Roles" checked /><span /><span />
            <span>Members of:</span><PBSelect w={210} options={USER_GROUPS} />
            <PBCheckbox label="Organizations" checked /><span /><span />
          </div>
          <div style={{ margin: '4px 8px 0', display: 'flex', flex: '1 1 auto', minHeight: 0 }}>
            <PBDataWindow
              rows={SEARCH_ROWS}
              current={userCur}
              onCurrentChange={setUserCur}
              rowTutorialId={(u) => `host.mois.row.user-${pbSlug(u.name.split(',')[0]!)}`}
              columns={[
                {
                  key: 'select', header: 'Select', width: 40, align: 'center',
                  render: (u) => (
                    <PBCheckbox
                      tutorialId={`host.mois.cell.user-${pbSlug(u.name.split(',')[0]!)}`}
                      checked={users.has(u.name)}
                      onChange={(v) => setUsers((s) => { const n = new Set(s); v ? n.add(u.name) : n.delete(u.name); return n })}
                    />
                  ),
                },
                { key: 'name', header: 'Name', width: 200 },
                { key: 'role', header: 'Role / Group', width: 170 },
                { key: 'type', header: 'Type', width: 110 },
                { key: 'members', header: 'Associated Provider(s) / Members', width: 200 },
                { key: 'status', header: 'Status', width: 50, align: 'center' },
              ]}
            />
          </div>
          <div className="pb-row" style={{ gap: 8, padding: '10px 0', justifyContent: 'center', flex: 'none' }}>
            <DialogButton id="search-ok" width={75} disabled={!users.size} onClick={() => setStage('confirm')} isDefault>Ok</DialogButton>
            <DialogButton id="search-cancel" width={75} onClick={() => setStage('list')}>Cancel</DialogButton>
          </div>
        </WorkspaceDialogFrame>
      )}

      {stage === 'confirm' && (
        <Confirm
          id={mode === 'copy' ? 'confirm-copying' : 'confirm-reassignment'}
          title={mode === 'copy' ? 'Confirm Copying' : 'Confirm Reassignment'}
          onClose={() => setStage('users')}
          buttons={[
            { id: 'confirm-yes', label: 'Yes', onClick: finish, isDefault: true },
            { id: 'confirm-no', label: 'No', onClick: () => setStage('users') },
          ]}
        >
          {mode === 'copy' ? 'Copy' : 'Reassign'} {picked.size} item(s) from {folder.label} to:
          <br /><b>{[...users].join('; ')}</b>
          {note && <><br />Note: {note}</>}
        </Confirm>
      )}
    </>
  )
}

/* ---------------------------------------------------------------------------
   Document / Attachment List (303765 images `30cd15ce`, `cc577eb0`)
   ------------------------------------------------------------------------ */
type AttachmentRow = { date: string; author: string; docType: string; venue: string; authorType: string; authorRole: string; note: string; s: string; m: string; clip: string }

function BasketAttachmentsDialog({ args, close, open }: AreaWindowProps) {
  const [rows, setRows] = useState<AttachmentRow[]>(() => [{
    date: '2026.03.11', author: 'ENDOSCOPY, UHNBC', docType: 'CONSULTATION', venue: 'HOSPITAL',
    authorType: 'SPECIALIST', authorRole: 'PRIMARY PROVIDER', note: '', s: '', m: '', clip: '1',
  }])
  const [cur, setCur] = useState(0)
  const host = usePBInstrumentation()
  const tool = (id: string, label: string, onClick?: () => void) => (
    <button
      type="button"
      className="pb-cmdrow__btn"
      style={{ width: 'auto', padding: '0 8px', border: 0, background: 'transparent' }}
      data-tutorial-id={host?.anchor('command', id)}
      onClick={() => { host?.report('command', { command: id }); onClick?.() }}
    >
      {label}
    </button>
  )
  const newRecord = () => {
    setRows((r) => [...r, { date: MOIS_TODAY, author: '', docType: '', venue: '', authorType: '', authorRole: '', note: '', s: '', m: '', clip: '-' }])
    setCur(rows.length)
  }
  const addAttachment = () => {
    workspaceStore.attach(str(args.rowKey))
    close()
    open('add-attachment')
  }
  /* a record with nothing attached goes straight to Add Attachment; one that
     has something shows what is there first (art. 303765) */
  const none = Number(args.attachments ?? 1) === 0
  useEffect(() => {
    if (!none) return
    close()
    open('add-attachment')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useScreenReport({ rows: rows.length })
  const r = rows[cur]
  if (none) return null
  return (
    <WorkspaceDialogFrame id="basket-attachments" title="Document / Attachment List" width={1000} height={700} onClose={close}>
      <div className="pb-row" style={{ gap: 0, height: 30, flex: 'none', borderBottom: '1px solid #a0a0a0', background: '#f0f0f0' }}>
        {tool('attach-new-record', 'New Record', newRecord)}
        {tool('attach-delete-record', 'Delete Record')}
        {tool('attach-save', 'Save')}
        {tool('attach-add-attachment', 'Add Attachment', addAttachment)}
        {tool('attach-open-attachment', 'Open Attachment')}
        {tool('attach-unlink-attachment', 'Unlink Attachment')}
        <span style={{ flex: '1 1 auto' }} />
        {tool('attach-close', 'Close', close)}
      </div>
      <div style={{ height: 260, flex: 'none', display: 'flex', background: '#fff' }}>
        <PBDataWindow
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
          rowTutorialId={(_r, i) => `host.mois.row.attachment-${i}`}
          columns={[
            { key: 'date', header: 'Date', width: 90 },
            { key: 'author', header: 'Author', width: 115 },
            { key: 'docType', header: 'Document Type', width: 150 },
            { key: 'venue', header: 'Source Venue', width: 140 },
            { key: 'authorType', header: 'Author Type', width: 130 },
            { key: 'authorRole', header: 'Author Role', width: 130 },
            { key: 'note', header: 'Note', width: 120 },
            { key: 's', header: 'S', width: 22, align: 'center' },
            { key: 'm', header: 'M', width: 22, align: 'center' },
            { key: 'clip', header: '\u{1F4CE}', width: 20, align: 'center' },
          ]}
        />
      </div>
      <div style={{ flex: '1 1 auto', padding: '8px 14px', display: 'grid', gridTemplateColumns: '110px 380px 1fr 110px 330px', rowGap: 4, alignContent: 'start', borderTop: '1px solid #a0a0a0' }}>
        <span>Note:</span><PBInput w={370} value={r?.note ?? ''} onChange={(e) => setRows((all) => all.map((x, i) => (i === cur ? { ...x, note: e.target.value } : x)))} /><span /><span /><span />
        <span>Primary Recipient:</span><PBInput w={370} readOnly value="" /><span /><span>Facility:</span><PBInput w={320} readOnly value="" />
        <span>Copies To:</span><PBInput w={370} readOnly value="" /><span /><span>Facility Ref.:</span><PBInput w={320} readOnly value="" />
        <span>Transcribed:</span><PBInput w={180} readOnly value="" /><span /><span>Facility Loc.:</span><PBInput w={320} readOnly value="" />
        <span>Diag. Code:</span><PBInput w={130} readOnly value="" /><span /><span /><span />
        <span>Diag. Desc:</span><PBInput w={370} readOnly value="" /><span /><span /><span />
        <span>Comment:</span><PBTextArea readOnly value="" style={{ gridColumn: 'span 4', height: 90, resize: 'none' }} />
      </div>
    </WorkspaceDialogFrame>
  )
}

/* ---------------------------------------------------------------------------
   Action ▸ Create Task From Message (303753)
   ------------------------------------------------------------------------ */
function ConfirmTaskFromMessage({ args, close }: AreaWindowProps) {
  const yes = () => {
    const subject = str(args.fromMessage)
    if (subject) {
      workspaceStore.ackMessage(subject)
      /* assigned to whoever the message was sent to — here, you — and
         already acknowledged */
      workspaceStore.addTask({
        p: str(args.priority) || 'M', due: MOIS_TODAY, patient: str(args.patient), chart: str(args.chart),
        task: subject, detail: str(args.detail), assignee: CURRENT_USER.login, user: CURRENT_USER.name,
        ack: true, created: MOIS_TODAY, createdAt: `${MOIS_TODAY} 14:43`, createdBy: CURRENT_USER.name,
      }, true)
    }
    close()
  }
  return (
    <Confirm
      id="confirm-task-from-message"
      title="Create Task"
      onClose={close}
      buttons={[
        { id: 'task-from-message-yes', label: 'Yes', onClick: yes, isDefault: true },
        { id: 'task-from-message-no', label: 'No', onClick: close },
      ]}
    >
      Would you like to create a Task for the selected Message?
    </Confirm>
  )
}

/* ---------------------------------------------------------------------------
   Print ▸ Print Task / Messages - Select Parameters (303769 `129ef6bf`)
   ------------------------------------------------------------------------ */
/* 303769: "the date meaning (due date, acknowledge date etc.)" */
const DATE_MEANINGS = ['Due Date', 'Acknowledged Date', 'Created Date', 'Completed Date']
const HAS_BEEN = ['All Records', 'Has Been', 'Has Not Been']

function ReportTaskListDialog({ args, close, open }: AreaWindowProps) {
  const messages = args.kind === 'message'
  const [ack, setAck] = useState(HAS_BEEN[0]!)
  const [comp, setComp] = useState(HAS_BEEN[0]!)
  const radios = (name: string, value: string, set: (v: string) => void) => (
    <span className="pb-row" style={{ gap: 18 }}>
      {HAS_BEEN.map((h) => <PBRadio key={h} name={name} label={h} checked={value === h} onChange={() => set(h)} />)}
    </span>
  )
  const ok = () => {
    const node = messages ? 'ws-msg-inbox' : 'ws-task-inbox'
    close()
    open('print-task-list', { node, filtered: true, ack, comp })
  }
  return (
    <WorkspaceDialogFrame id="report-task-list" title={messages ? 'Report: Message List' : 'Report: Task List'} width={836} height={660} onClose={close} controls={false}>
      <div style={{ margin: '14px 24px 0', border: '1px solid #a0a0a0', flex: '1 1 auto', display: 'flex', flexDirection: 'column', background: 'var(--pb-face)' }}>
        <FormBand>Selection Parameter</FormBand>
        <div style={{ padding: '4px 12px', color: '#1c2f8f', fontWeight: 'bold', borderBottom: '2px solid #1c2f8f', flex: 'none' }}>Selection Options</div>
        <div style={{ display: 'grid', gridTemplateColumns: '106px auto 1fr', rowGap: 6, columnGap: 8, padding: '10px 12px', alignItems: 'center' }}>
          <span>Sent To:</span>
          <span className="pb-row" style={{ gap: 8 }}><span style={{ width: 40 }}>User:</span><PBSelect w={194} options={['', CURRENT_USER.name]} /></span><span />
          <b>AND / OR</b>
          <span className="pb-row" style={{ gap: 8 }}><span style={{ width: 40 }}>Team:</span><PBSelect w={194} options={USER_GROUPS} /></span><span />
        </div>
        <FormRule />
        <div style={{ display: 'grid', gridTemplateColumns: '106px 1fr', rowGap: 6, columnGap: 8, padding: '10px 12px', alignItems: 'center' }} data-tutorial-id="host.mois.field.task-report-parameters">
          <span>Date Range:</span>
          <span className="pb-row" style={{ gap: 12 }}>
            <PBInput w={104} /><span>to</span><PBInput w={104} />
            <PBSelect w={168} options={DATE_MEANINGS} data-tutorial-id="host.mois.field.date-meaning" />
          </span>
          <span>Created By:</span><PBSelect w={248} options={['', ...WORKSPACE_USERS]} />
          <span>Acknowledged:</span>{radios('report-ack', ack, setAck)}
          <span>Completed:</span>{radios('report-comp', comp, setComp)}
          <span>Group:</span><PBSelect w={220} options={TASK_GROUPS} />
          <span>Subject:</span><span className="pb-row" style={{ gap: 8 }}><PBInput w={344} /><span>(use * as a wild card)</span></span>
          <span>Description:</span><span className="pb-row" style={{ gap: 8 }}><PBInput w={344} /><span>(use * as a wild card)</span></span>
          <span>Chart No.:</span><PBInput w={114} />
        </div>
      </div>
      <div className="pb-row" style={{ gap: 16, padding: '14px 0', justifyContent: 'center', flex: 'none' }}>
        <DialogButton id="task-report-ok" onClick={ok} isDefault>Ok</DialogButton>
        <DialogButton id="task-report-cancel" onClick={close}>Cancel</DialogButton>
      </div>
    </WorkspaceDialogFrame>
  )
}

/* ---------------------------------------------------------------------------
   Print Task / Messages - Current List → Print Preview (303771): the list
   the folder shows, less its Follow Up Notes. Hands off to the Reports
   module's Print Preview window.
   ------------------------------------------------------------------------ */
export function taskListPrintArgs(node: string, ws: ReturnType<typeof workspaceStore.get>, filter?: { ack?: string; comp?: string }) {
  const screen = taskScreenByNode(node)
  const has = (want: string | undefined, v: unknown) =>
    !want || want === 'All Records' || (want === 'Has Been') === Boolean(v)
  const rows = taskListRows(node, ws).filter((r) => has(filter?.ack, r.ack) && has(filter?.comp, r.comp))
  const columns = (screen?.columns ?? []).map((c) => ({ key: c.key, header: c.header, width: c.width }))
  return {
    title: screen?.kind === 'message' ? 'Message List' : 'Task List',
    heading: screen?.kind === 'message' ? 'Message List' : 'Task List',
    columns,
    rows: rows.map((r) => Object.fromEntries(columns.map((c) => {
      const v = r[c.key]
      return [c.key, typeof v === 'boolean' ? (v ? 'Y' : '') : String(v ?? '')]
    }))),
  }
}

function PrintTaskListWindow({ args, open }: AreaWindowProps) {
  const ws = useWorkspaceStore()
  useEffect(() => {
    open('print-preview', taskListPrintArgs(str(args.node) || 'ws-task-inbox', ws, {
      ack: str(args.ack) || undefined, comp: str(args.comp) || undefined,
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

registerAreaWindow('change-workspace', ChangeWorkspaceDialog)
registerAreaWindow('mark-for-review', MarkForReviewDialog)
registerAreaWindow('reassign-items', (p) => <ForwardItemsDialog {...p} args={{ ...p.args, mode: 'reassign' }} />)
registerAreaWindow('copy-items', (p) => <ForwardItemsDialog {...p} args={{ ...p.args, mode: 'copy' }} />)
registerAreaWindow('basket-attachments', BasketAttachmentsDialog)
registerAreaWindow('confirm-task-from-message', ConfirmTaskFromMessage)
registerAreaWindow('report-task-list', ReportTaskListDialog)
registerAreaWindow('print-task-list', PrintTaskListWindow)
