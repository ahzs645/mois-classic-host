import { useEffect, useState, type ReactNode } from 'react'
import { basketFolderById, type BasketRow } from '../data/basket'
import { MOIS_TODAY } from '../data/patients'
import { argStr } from '../data/text'
import { CURRENT_USER, TASK_GROUPS, USER_GROUPS, WORKSPACE_USERS, taskScreenByNode } from '../data/tasks'
import { taskListRows } from '../data/workspaceLists'
import { basketKey, useWorkspaceStore, workspaceStore } from '../data/workspaceStore'
import { workspaceExtras } from '../data/workspaceExtras'
import {
  PBCheckbox, PBDataWindow, PBInput, PBRadio, PBSelect, PBTextArea, pbSlug,
} from '../pb'
import { useScreenReport } from '../host/screen-state'
import { registerAreaWindow, type AreaWindowProps } from './areaWindowRegistry'
import { SelectAllPair, useTickSet } from './listKit'
import { MOIS_SEARCH_TITLE, MoisSearchWindow, PickButtons, SIZE } from './lookupKit'
import { DialogButton, FormBand, FormRule, WorkspaceDialogFrame } from './WorkspaceDialogFrame'
import { AttachmentToolbar, DocumentAttachmentFrame } from './AttachmentListWindow'
import { LAYER } from './dialogKit'
import { DialogFooter } from './formKit'

/* ============================================================================
   The Workspace's own windows (the Create New Task / Message windows live in
   CreateTaskDialog.tsx and CreateMessageDialog.tsx).

   · change-workspace           Change Workspace — moved to
                                WorkspaceBlendWindows.tsx (1802767)
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
      <DialogFooter justify="flex-end" gap={8} padding="10px 12px" fixed={false}>
        {buttons.map((b) => <DialogButton key={b.id} id={b.id} width={75} onClick={b.onClick} isDefault={b.isDefault}>{b.label}</DialogButton>)}
      </DialogFooter>
    </WorkspaceDialogFrame>
  )
}

/* Change Workspace (303749 / 1802767) and its Manage Workgroups, Create
   Temporary Membership and Default Blending Changed windows are in
   WorkspaceBlendWindows.tsx. */

/* ---------------------------------------------------------------------------
   Mark Record for Review (303764 image `4bf6cd3b`)
   ------------------------------------------------------------------------ */
function MarkForReviewDialog({ args, close }: AreaWindowProps) {
  const [note, setNote] = useState('')
  const proceed = () => {
    const key = argStr(args.rowKey)
    if (key) {
      workspaceStore.markForReview(key)
      /* the Review Note shows in the Workflow Summary's detail (1802768 `9a1ef52e…`) */
      workspaceExtras.record({ key, action: 'MARKED FOR REVIEW', by: CURRENT_USER.name, to: [CURRENT_USER.name], note }, MOIS_TODAY)
    }
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
      <DialogFooter gap={12} padding="14px 0">
        <DialogButton id="review-continue" onClick={proceed} isDefault>Continue</DialogButton>
        <DialogButton id="review-cancel" onClick={close}>Cancel</DialogButton>
      </DialogFooter>
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
  const folder = basketFolderById(argStr(args.folder))
  const ws = useWorkspaceStore()
  const rows: BasketRow[] = (folder?.rows ?? []).filter((r) => !ws.reassigned.includes(basketKey(folder!.id, String(r.patient))))
  const picked = useTickSet()
  const [note, setNote] = useState('')
  const [stage, setStage] = useState<'list' | 'users' | 'confirm'>('list')
  const users = useTickSet<string>()
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

  const finish = () => {
    const keys = [...picked.ticked].map((i) => basketKey(folder.id, String(rows[i]!.patient)))
    if (mode === 'reassign') workspaceStore.reassign(keys)
    /* the note and the users go into each record's Acknowledgement History
       (1802768 `3d36d71e…` REASSIGNED, `315269da…` COPIED) */
    for (const key of keys) {
      workspaceExtras.record({ key, action: mode === 'copy' ? 'COPIED' : 'REASSIGNED', by: CURRENT_USER.name, to: [...users.ticked], note }, MOIS_TODAY)
    }
    close()
  }
  /* the folder's own columns after the Check / paperclip pair are left off,
     and the 2.22 column goes on the end (303758) */
  const columns = [
    {
      key: 'select', header: 'Select', width: 50, align: 'center' as const,
      render: (_r: BasketRow, i: number) => (
        <PBCheckbox tutorialId={`host.mois.cell.forward-${i}`} checked={picked.has(i)} onChange={(v) => picked.set(i, v)} />
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
          <SelectAllPair
            ids={['forward-select-all', 'forward-unselect-all']}
            width={76}
            onSelectAll={() => picked.selectAll(rows.map((_, i) => i))}
            onUnselectAll={picked.clear}
          />
          <span style={{ width: 120, textAlign: 'right', marginLeft: 16 }}>
            {mode === 'copy' ? 'Copying Note:' : 'Reassignment Note:'}<br /><span style={{ color: '#8a8a8a' }}>(optional)</span>
          </span>
          <PBTextArea value={note} onChange={(e) => setNote(e.target.value)} style={{ flex: '1 1 auto', height: 34, resize: 'none' }} data-tutorial-id="host.mois.field.forward-note" />
        </div>
        <DialogFooter gap={6} padding="10px 0">
          <DialogButton id={`forward-${mode}`} width={84} disabled={!picked.size} onClick={() => setStage('users')} isDefault>{Mode} Items</DialogButton>
          <DialogButton id="forward-cancel" width={84} onClick={close}>Cancel</DialogButton>
        </DialogFooter>
      </WorkspaceDialogFrame>

      {stage === 'users' && (
        <MoisSearchWindow
          frame={(content, footer) => (
            <WorkspaceDialogFrame id="search-window" title={MOIS_SEARCH_TITLE} width={900} height={560} onClose={() => setStage('list')} controls={false} zIndex={85}>
              {content}
              {footer}
            </WorkspaceDialogFrame>
          )}
          criteria={{
            layout: 'grid',
            fields: [{ label: 'Name:' }, { label: 'Group:' }, { label: 'Provider:' }],
            membersOf: { options: USER_GROUPS },
            include: [
              { label: 'Users', checked: true }, { label: 'Providers', checked: true },
              { label: 'Org. Roles', checked: true }, { label: 'Organizations', checked: true },
            ],
            membership: { label: 'Limit to My Active Memberships' },
            status: [{ label: 'Active', checked: true }],
          }}
          gridBox={{ margin: '4px 8px 0', display: 'flex', flex: '1 1 auto', minHeight: 0 }}
          grid={{
            rows: SEARCH_ROWS,
            current: userCur,
            onCurrentChange: setUserCur,
            rowTutorialId: (u) => `host.mois.row.user-${pbSlug(u.name.split(',')[0]!)}`,
            columns: [
              {
                key: 'select', header: 'Select', width: 40, align: 'center',
                render: (u) => (
                  <PBCheckbox
                    tutorialId={`host.mois.cell.user-${pbSlug(u.name.split(',')[0]!)}`}
                    checked={users.has(u.name)}
                    onChange={(v) => users.set(u.name, v)}
                  />
                ),
              },
              { key: 'name', header: 'Name', width: 200 },
              { key: 'role', header: 'Role / Group', width: 170 },
              { key: 'type', header: 'Type', width: 110 },
              { key: 'members', header: 'Associated Provider(s) / Members', width: 200 },
              { key: 'status', header: 'Status', width: 50, align: 'center' },
            ],
          }}
          footer={(
            <PickButtons
              className="pb-row"
              style={{ gap: 8, padding: '10px 0', justifyContent: 'center', flex: 'none' }}
              size={SIZE.dialog(75)}
              buttons={[
                { label: 'Ok', command: 'search-ok', disabled: !users.size, onClick: () => setStage('confirm'), isDefault: true },
                { label: 'Cancel', command: 'search-cancel', onClick: () => setStage('list') },
              ]}
            />
          )}
        />
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
          <br /><b>{[...users.ticked].join('; ')}</b>
          {note && <><br />Note: {note}</>}
        </Confirm>
      )}
    </>
  )
}

/* ---------------------------------------------------------------------------
   Document / Attachment List (303765 images `30cd15ce`, `cc577eb0`), in the
   shared frame and flat toolbar (AttachmentListWindow.tsx) with this
   build's columns
   ------------------------------------------------------------------------ */
type AttachmentRow = { date: string; author: string; docType: string; venue: string; authorType: string; authorRole: string; note: string; s: string; m: string; clip: string }

function BasketAttachmentsDialog({ args, close, open }: AreaWindowProps) {
  const [rows, setRows] = useState<AttachmentRow[]>(() => [{
    date: '2026.03.11', author: 'ENDOSCOPY, UHNBC', docType: 'CONSULTATION', venue: 'HOSPITAL',
    authorType: 'SPECIALIST', authorRole: 'PRIMARY PROVIDER', note: '', s: '', m: '', clip: '1',
  }])
  const [cur, setCur] = useState(0)
  const newRecord = () => {
    setRows((r) => [...r, { date: MOIS_TODAY, author: '', docType: '', venue: '', authorType: '', authorRole: '', note: '', s: '', m: '', clip: '-' }])
    setCur(rows.length)
  }
  const addAttachment = () => {
    workspaceStore.attach(argStr(args.rowKey))
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
    <DocumentAttachmentFrame id="basket-attachments" onClose={close} controls zIndex={LAYER.workspace}
      windowStyle={{ width: 1000, height: 700, maxWidth: 'calc(100% - 16px)', maxHeight: 'calc(100% - 16px)' }}
      face="var(--pb-face)"
      toolbar={<AttachmentToolbar prefix="attach-" height={30} on={{ 'new-record': newRecord, 'add-attachment': addAttachment, close }} />}>
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
    </DocumentAttachmentFrame>
  )
}

/* ---------------------------------------------------------------------------
   Action ▸ Create Task From Message (303753)
   ------------------------------------------------------------------------ */
function ConfirmTaskFromMessage({ args, close }: AreaWindowProps) {
  const yes = () => {
    const subject = argStr(args.fromMessage)
    if (subject) {
      workspaceStore.ackMessage(subject)
      /* assigned to whoever the message was sent to — here, you — and
         already acknowledged */
      workspaceStore.addTask({
        p: argStr(args.priority) || 'M', due: MOIS_TODAY, patient: argStr(args.patient), chart: argStr(args.chart),
        task: subject, detail: argStr(args.detail), assignee: CURRENT_USER.login, user: CURRENT_USER.name,
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
      <DialogFooter gap={16} padding="14px 0">
        <DialogButton id="task-report-ok" onClick={ok} isDefault>Ok</DialogButton>
        <DialogButton id="task-report-cancel" onClick={close}>Cancel</DialogButton>
      </DialogFooter>
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
    open('print-preview', taskListPrintArgs(argStr(args.node) || 'ws-task-inbox', ws, {
      ack: argStr(args.ack) || undefined, comp: argStr(args.comp) || undefined,
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

registerAreaWindow('mark-for-review', MarkForReviewDialog)
registerAreaWindow('reassign-items', (p) => <ForwardItemsDialog {...p} args={{ ...p.args, mode: 'reassign' }} />)
registerAreaWindow('copy-items', (p) => <ForwardItemsDialog {...p} args={{ ...p.args, mode: 'copy' }} />)
registerAreaWindow('basket-attachments', BasketAttachmentsDialog)
registerAreaWindow('confirm-task-from-message', ConfirmTaskFromMessage)
registerAreaWindow('report-task-list', ReportTaskListDialog)
registerAreaWindow('print-task-list', PrintTaskListWindow)
