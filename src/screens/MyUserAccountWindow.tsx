import { useState } from 'react'
import { PBBand, PBDataWindow, PBInput, PBRadio, PBSelect, PBTabs, pbSlug, usePBInstrumentation } from '../pb'
import type { PBColumn } from '../pb'
import {
  FORWARDING_RULES, INBOX_FORWARDING_COLUMNS, SHARED_WITH_ME_COLUMNS, SHARED_WITH_ME_W,
  SHARING_WORKSPACE_COLUMNS, type UserRow,
} from '../data/userManagement'
import { MOIS_TODAY } from '../data/patients'
import {
  MY_SETTINGS_LOGIN, MY_SETTINGS_USER, MY_USER_ACCOUNT_SIZE, MY_USER_ACCOUNT_TABS,
  SHARE_USER_OPTIONS, useWorkspaceSettings, workspaceSettingsStore,
} from '../data/workspaceSettings'
import { useScreenReport } from '../host/screen-state'
import { BandButtons, UM_CSS, umColumns } from './UserManagementKit'
import { DialogButton, WorkspaceDialogFrame } from './WorkspaceDialogFrame'
import { registerAreaWindow, type AreaWindowProps } from './areaWindowRegistry'

/* ============================================================================
   The signed-in user's own `User Account` window — `my-user-account`.

   PROVENANCE. 303747 "How to Share a Workspace", image `200c97ac`; 303743
   "Workspace Settings", image `bae79d4e`. Reached from My Settings ▸
   Workspace ▸ `Edit...` (and, per 303741, Maintenance ▸ User Settings).

   This is NOT the ten-tab Administration window (`UserAccountWindow.tsx`,
   `42be29fdd885`), where the tab is captioned `Workspace Mgt` and sits
   sixth. Opened on yourself the window has three tabs — `User Settings`,
   `Workspace Management`, `Prompt Windows` — and opens on the second
   (303743: "the User Account window to the second tab labeled 'Workspace
   Management'"). Above the strip: `User Name:` and `Full Name:`; below it,
   `Apply Changes` and `Cancel`, centred.

   The Workspace Management page, top to bottom (`200c97ac`):
     - `Inbox Forwarding` band, `New` / `Delete` at its right; grid
       Start · Stop · Forward to User · Rule · Note. (The Administration
       window's band also carries Acknowledge Backlog / Reassign Backlog;
       this one does not.)
     - `Sharing Workspace With` band, `New` / `Delete`; grid
       Start · Stop · User Account · Note — at the bottom left;
     - `Workspaces Shared With Me`, read-only, pale-blue caption, at the
       bottom right; an empty stop prints `--`.

   The column tables are the Administration window's (`userManagement.ts`),
   which is the same DataWindow. `New` under Sharing Workspace With adds a
   row with today's start date filled in (303747: "MOIS will automatically
   populate with today's date"), an empty stop, a user drop-down and a note.
   `Apply Changes` writes both grids to `workspaceSettings.ts` and closes, so
   the Workspace Settings panels show the rule at once; `Cancel` discards.

   The User Settings and Prompt Windows pages are real tabs, but the manual
   never captures their contents on this window, so they are left empty
   rather than invented — the same rule `UserAccountWindow.tsx` follows.
   ========================================================================= */

type Row = UserRow & { _new?: boolean }

const PITCH = 19

function Grid({ columns, rows, current, onCurrent, rowId }: {
  columns: PBColumn<Row>[]
  rows: Row[]
  current: number
  onCurrent: (i: number) => void
  rowId?: (r: Row, i: number) => string | undefined
}) {
  return (
    <PBDataWindow<Row>
      rows={rows}
      current={rows.length ? Math.min(current, rows.length - 1) : undefined}
      onCurrentChange={onCurrent}
      columns={columns}
      rowTutorialId={rowId}
      style={{ ['--pb-dw-row-h' as string]: `${PITCH}px` }}
      empty=" "
    />
  )
}

function WorkspaceManagementPage({
  forwarding, setForwarding, sharing, setSharing, sharedWithMe,
}: {
  forwarding: Row[]
  setForwarding: (rows: Row[]) => void
  sharing: Row[]
  setSharing: (rows: Row[]) => void
  sharedWithMe: Row[]
}) {
  const host = usePBInstrumentation()
  const [fwdCur, setFwdCur] = useState(0)
  const [shareCur, setShareCur] = useState(0)

  const edit = (rows: Row[], set: (rows: Row[]) => void, i: number, key: string, value: string) =>
    set(rows.map((r, j) => (j === i ? { ...r, [key]: value } : r)))

  /* --- Inbox Forwarding --- */
  const fwdColumns = umColumns(INBOX_FORWARDING_COLUMNS) as PBColumn<Row>[]
  for (const col of fwdColumns) {
    if (col.key === 'rule') {
      /* the Rule cell is an in-grid radio pair, as on the Administration window */
      col.render = (r, i) => (
        <span className="pb-row" style={{ gap: 8, justifyContent: 'center' }}>
          {FORWARDING_RULES.map((v) => (
            <PBRadio
              key={v}
              name={`my-fwd-${i}`}
              label={v}
              checked={r.rule === v}
              onChange={() => edit(forwarding, setForwarding, i, 'rule', v)}
            />
          ))}
        </span>
      )
    } else if (col.key === 'stop' || col.key === 'note') {
      const key = col.key
      col.render = (r, i) => (r._new && i === fwdCur
        ? <PBInput w="100%" value={String(r[key] ?? '')} onChange={(e) => edit(forwarding, setForwarding, i, key, e.target.value)} />
        : String(r[key] ?? ''))
    } else if (col.key === 'forward') {
      col.render = (r, i) => (r._new && i === fwdCur
        ? <PBSelect w="100%" options={SHARE_USER_OPTIONS} value={String(r.forward ?? '')} onChange={(e) => edit(forwarding, setForwarding, i, 'forward', e.target.value)} />
        : String(r.forward ?? ''))
    }
  }

  /* --- Sharing Workspace With --- */
  const shareColumns = umColumns(SHARING_WORKSPACE_COLUMNS) as PBColumn<Row>[]
  for (const col of shareColumns) {
    if (col.key === 'stop' || col.key === 'note') {
      const key = col.key
      col.render = (r, i) => (r._new && i === shareCur
        ? (
          <PBInput
            w="100%"
            value={String(r[key] ?? '')}
            data-tutorial-id={host?.anchor('field', `sharing-${key}`)}
            onChange={(e) => edit(sharing, setSharing, i, key, e.target.value)}
          />
        )
        : String(r[key] ?? ''))
    } else if (col.key === 'user') {
      col.render = (r, i) => (r._new && i === shareCur
        ? (
          <PBSelect
            w="100%"
            options={SHARE_USER_OPTIONS}
            value={String(r.user ?? '')}
            data-tutorial-id={host?.anchor('field', 'sharing-user')}
            onChange={(e) => edit(sharing, setSharing, i, 'user', e.target.value)}
          />
        )
        : String(r.user ?? ''))
    }
  }

  const add = (rows: Row[], set: (rows: Row[]) => void, blank: Row, cur: (i: number) => void) => {
    set([...rows, { ...blank, _new: true }])
    cur(rows.length)
  }
  const remove = (rows: Row[], set: (rows: Row[]) => void, at: number, cur: (i: number) => void) => {
    if (!rows.length) return
    set(rows.filter((_, j) => j !== at))
    cur(Math.max(0, Math.min(at, rows.length - 2)))
  }

  return (
    <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', padding: 3, gap: 6 }}>
      <div style={{ flex: '1 1 0', minHeight: 0, display: 'flex', flexDirection: 'column', border: '1px solid #a0a0a0' }}>
        <PBBand
          right={(
            <BandButtons
              scope="inbox-forwarding"
              labels={['New', 'Delete']}
              onPress={(b) => (b === 'New'
                ? add(forwarding, setForwarding, { start: MOIS_TODAY, stop: '', forward: '', rule: 'Reassign', note: '' }, setFwdCur)
                : remove(forwarding, setForwarding, fwdCur, setFwdCur))}
            />
          )}
        >
          Inbox Forwarding
        </PBBand>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3 }}>
          <Grid columns={fwdColumns} rows={forwarding} current={fwdCur} onCurrent={setFwdCur} />
        </div>
      </div>

      <div style={{ flex: '1 1 0', minHeight: 0, display: 'flex', gap: 6 }}>
        <div
          data-tutorial-id={host?.anchor('group', 'sharing-workspace-with')}
          style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', border: '1px solid #a0a0a0' }}
        >
          <PBBand
            right={(
              <BandButtons
                scope="sharing-workspace"
                labels={['New', 'Delete']}
                onPress={(b) => (b === 'New'
                  ? add(sharing, setSharing, { start: MOIS_TODAY, stop: '', user: '', note: '' }, setShareCur)
                  : remove(sharing, setSharing, shareCur, setShareCur))}
              />
            )}
          >
            Sharing Workspace With
          </PBBand>
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3 }}>
            <Grid
              columns={shareColumns}
              rows={sharing}
              current={shareCur}
              onCurrent={setShareCur}
              rowId={(r, i) => `host.mois.row.sharing-with-${r._new ? `new-${i + 1}` : pbSlug(String(r.user ?? '')) || i + 1}`}
            />
          </div>
        </div>

        {/* read-only, with a pale-blue caption bar of its own */}
        <div
          data-tutorial-id={host?.anchor('group', 'workspaces-shared-with-me')}
          style={{ width: SHARED_WITH_ME_W, flex: 'none', display: 'flex', flexDirection: 'column', border: '1px solid #a0a0a0', background: '#ffffff' }}
        >
          <div style={{ flex: 'none', height: 30, padding: '6px 10px 0', background: 'var(--pb-dw-header)', fontWeight: 'bold' }}>
            Workspaces Shared With Me
          </div>
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3 }}>
            <PBDataWindow<Row>
              rows={sharedWithMe}
              columns={umColumns(SHARED_WITH_ME_COLUMNS) as PBColumn<Row>[]}
              gutter={false}
              rules={false}
              head={false}
              style={{ ['--pb-dw-row-h' as string]: '23px' }}
              empty=" "
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export function MyUserAccountWindow({ args, close }: AreaWindowProps) {
  const saved = useWorkspaceSettings()
  const first = typeof args.tab === 'string' && MY_USER_ACCOUNT_TABS.includes(args.tab) ? args.tab : MY_USER_ACCOUNT_TABS[1]!
  const [tab, setTab] = useState(first)
  const [forwarding, setForwardingRaw] = useState<Row[]>(() => saved.forwarding.map((r) => ({ ...r })))
  const [sharing, setSharingRaw] = useState<Row[]>(() => saved.sharing.map((r) => ({ ...r })))
  const [dirty, setDirty] = useState(false)
  const setForwarding = (rows: Row[]) => { setForwardingRaw(rows); setDirty(true) }
  const setSharing = (rows: Row[]) => { setSharingRaw(rows); setDirty(true) }

  /* `rows`: how many rules Sharing Workspace With holds, New included;
     `row`: the account a new, unapplied rule names (a user slug, never a
     patient) */
  const fresh = [...sharing].reverse().find((r) => r._new)
  useScreenReport({ rows: sharing.length, saved: !dirty, row: fresh ? pbSlug(String(fresh.user ?? '')) || null : null })

  const strip = (rows: Row[]): UserRow[] => rows.map(({ _new, ...r }) => r)
  const apply = () => {
    workspaceSettingsStore.applyWorkspaceManagement(strip(sharing), strip(forwarding))
    close()
  }

  return (
    <WorkspaceDialogFrame
      id="my-user-account"
      title="User Account"
      width={MY_USER_ACCOUNT_SIZE.w}
      height={MY_USER_ACCOUNT_SIZE.h}
      onClose={close}
      controls={false}
      zIndex={60}
    >
      <style>{UM_CSS}</style>
      {/* the fixed strip above the tabs: User Name and Full Name, bold values */}
      <div
        className="pb-row"
        style={{ flex: 'none', gap: 8, padding: '6px 10px', margin: '3px 3px 6px', border: '1px solid #a0a0a0', background: 'var(--pb-face)' }}
      >
        <span>User Name:</span>
        <b style={{ minWidth: 220 }} data-tutorial-id="host.mois.field.user-name">{MY_SETTINGS_LOGIN}</b>
        <span>Full Name:</span>
        <b data-tutorial-id="host.mois.field.full-name">{MY_SETTINGS_USER}</b>
      </div>

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', padding: '0 3px' }}>
        <PBTabs tabs={MY_USER_ACCOUNT_TABS} active={tab} onChange={setTab} compact>
          {tab === 'Workspace Management'
            ? (
              <WorkspaceManagementPage
                forwarding={forwarding}
                setForwarding={setForwarding}
                sharing={sharing}
                setSharing={setSharing}
                sharedWithMe={saved.sharedWithMe}
              />
            )
            /* never captured on this window: drawn empty, not invented */
            : <div style={{ flex: '1 1 auto' }} />}
        </PBTabs>
      </div>

      <div className="pb-footer" style={{ justifyContent: 'center', gap: 28, padding: '12px 9px' }}>
        <DialogButton id="apply-changes" width={100} onClick={apply}>Apply Changes</DialogButton>
        <DialogButton id="cancel" width={100} onClick={close}>Cancel</DialogButton>
      </div>
    </WorkspaceDialogFrame>
  )
}

registerAreaWindow('my-user-account', MyUserAccountWindow)
