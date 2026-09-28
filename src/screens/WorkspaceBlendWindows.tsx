import { useState } from 'react'
import { MOIS_TODAY } from '../data/patients'
import { CURRENT_USER } from '../data/tasks'
import { useWorkspaceExtras, workspaceExtras, type Workgroup } from '../data/workspaceExtras'
import { useWorkspaceStore, workspaceStore, type WorkspaceBlend } from '../data/workspaceStore'
import { useScreenReport } from '../host/screen-state'
import { PBCheckbox, PBDataWindow, PBInput, PBRadio, PBSelect, pbSlug } from '../pb'
import { registerAreaWindow, type AreaWindowProps } from './areaWindowRegistry'
import { DialogButton, FormBand, WorkspaceDialogFrame } from './WorkspaceDialogFrame'
import { RaisedMessageBox } from './RaisedMessageBox'

/* ============================================================================
   Change Workspace and the blending windows behind it.

   PROVENANCE: art. 1802767 "Blended Workspaces" and art. 303749.
   - Change Workspace: `861df29b…` (303749, v02.21.14) and `cd964e99…` /
     `cbcd29bb…` / `785f279c…` (1802767): `Select One or More Shared
     Workspaces` (Select | Name | Initials | Shared Until) beside `Included
     Users`, Save as Default, Continue / Cancel, Manage Workgroups…. A user
     whose account is inactive but whose sharing rule has not expired is
     listed in red and can still be blended (`cd964e99…`, ONCOLOGY,
     JENNIFER); a rule with an expiry shows it under Shared Until, and after
     that date the user is no longer listed (`cbcd29bb…` / `785f279c…`).
   - `4bb56388…` (MOIS 2.22, Org Roles): the list is split SHARES /
     MEMBERSHIPS and gains a `Your Accessibility` column (Basket / Tasks /
     Messages). The newest capture (`829c5ad3…` / `8badcc65…`) adds a
     `Reason` column (ME, SHARE, MEMBER OF) and, beside Manage Workgroups…,
     `Add Organization / Role to List` (`c4aabf87…`). This window is the
     v2.22 layout carrying those two additions — a hybrid, kept because the
     existing change-workspaces lesson reads "Select One or More Shared
     Workspaces" and "Included Users". The Workgroups heading sits at the top
     of the list, as the article's Creating a Workgroup step says.
   - Manage Workgroups: `6c28c301…` (Please Choose: ◉ Create a Workgroup ○
     View/Modify a Workgroup ○ Delete a Workgroup; Ok / Cancel) and
     `1e819daf…` (the workgroup drop-down beside View/Modify). With no
     workgroup yet, MOIS goes straight to Create/Edit Workgroup
     (`cc4a0583…`: Workgroup: [name], `Shared Workspaces` Select | Name |
     Initials | Shared Until, Continue / Cancel).
   - Create Temporary Membership: `9b638396…` — the explanation, "Organization
     / Org Role require membership with" [name] Select…, "Reason you require
     membership" (COVER SHIFT / LOCUM / OTHER), Duration of Membership ○ Today
     ◉ Today+Tomorrow ○ For a week, Save / Cancel.
   - Default Blending Changed: `47ccdc42…` — "The following users have been
     removed from your default Blended Workspace selection because their rule
     for sharing with you has expired or been deleted. … Would you like to
     review your current Blended Workspace selections?" Yes / No.

   INFERRED: the Org Role list Select… opens (a plain list of the clinic's
   organizations / org roles); that ticking a workgroup ticks its users;
   Delete a Workgroup deletes without a second prompt (none is captured).

   Window ids: `change-workspace` (args `stage: 'manage' | 'workgroup' |
   'membership'` opens straight onto an inner window), `manage-workgroups`,
   `create-temporary-membership`, `default-blending-changed` (args `users`).
   Inner windows report as `host.screen.window`: `manage-workgroups`,
   `create-edit-workgroup`, `create-temporary-membership`, `org-role-list`.
   Anchors kept from the first build: `host.mois.cell.ws-share-{last}`,
   `host.mois.row.ws-share-{last}`, `host.mois.command.ws-continue`,
   `host.mois.command.ws-cancel`, `host.mois.command.manage-workgroups`,
   `host.mois.field.included-users`.
   ========================================================================= */

export type ShareRow = {
  name: string
  initials: string
  until: string
  /** an inactive account whose rule has not expired: listed in red */
  inactive?: boolean
  access: string
  reason: string
  kind: 'WORKGROUPS' | 'SHARES' | 'MEMBERSHIPS'
}

const ALL = 'Basket / Tasks / Messages'

/** The users whose sharing rule names ADMINISTRATOR (Workspace Settings ▸
    Workspaces Shared With Me), with the dates their rules run to. */
export const SHARING_RULES: ShareRow[] = [
  { name: 'ADMINISTRATOR', initials: 'ADMIN', until: '', access: ALL, reason: 'ME', kind: 'SHARES' },
  { name: 'BEARDWOOD, WENDY', initials: 'WB', until: '', access: ALL, reason: 'SHARE', kind: 'SHARES' },
  { name: 'SHEWCHUK, LEAH', initials: 'LS', until: '2026.12.31', access: ALL, reason: 'SHARE', kind: 'SHARES' },
  { name: 'RESIDENT, R1', initials: 'R1', until: '', access: ALL, reason: 'SHARE', kind: 'SHARES' },
  /* a resident's preceptor shares with the resident (art. 304078: "workspace
     sharing … an essential step for resident & preceptor evaluation") */
  { name: 'SMITH, PETER', initials: 'PS', until: '', access: ALL, reason: 'SHARE', kind: 'SHARES' },
  /* the private-note owner in the training overlay (data/privateNotes.ts):
     her Break Glass alerts are seen by viewing her workspace */
  { name: 'LOCKHART, JUSTINE', initials: 'JL', until: '', access: ALL, reason: 'SHARE', kind: 'SHARES' },
  { name: 'ONCOLOGY, JENNIFER', initials: 'JO', until: '', inactive: true, access: ALL, reason: 'SHARE', kind: 'SHARES' },
  /* expired: not listed (1802767 `785f279c…`), but a saved default that
     named him is corrected on the next visit (`47ccdc42…`) */
  { name: 'PSYCHIATRY, MIKE', initials: 'MP', until: '2026.09.01', access: ALL, reason: 'SHARE', kind: 'SHARES' },
]

/** Org roles / organizations the user is a member of (1802767 "Blending
    the Workspace with Org Roles and Organizations"). */
export const MEMBERSHIPS: ShareRow[] = [
  { name: 'MOA', initials: 'MOA', until: '', access: ALL, reason: 'MEMBER OF', kind: 'MEMBERSHIPS' },
]

/** What Add Organization / Role to List can join (INFERRED list). */
export const ORG_ROLES = [
  { name: 'CATE - VMOA', type: 'ORG. ROLE' },
  { name: 'PHYSIOTHERAPY', type: 'ORG. ROLE' },
  { name: 'NORTHERN HEALTH - PRIMARY CARE', type: 'ORGANIZATION' },
]

const expired = (r: ShareRow) => !!r.until && r.until < MOIS_TODAY

/** the list's rows: Workgroups, Shares (unexpired), Memberships (standing
    and temporary) */
export function shareRows(workgroups: Workgroup[], temp: { org: string; until: string; access: string }[]): ShareRow[] {
  return [
    ...workgroups.map((w): ShareRow => ({ name: w.name, initials: '', until: '', access: `${w.users.length} user(s)`, reason: 'WORKGROUP', kind: 'WORKGROUPS' })),
    ...SHARING_RULES.filter((r) => !expired(r)),
    ...MEMBERSHIPS,
    ...temp.map((m): ShareRow => ({ name: m.org, initials: '', until: m.until, access: m.access, reason: 'MEMBER OF', kind: 'MEMBERSHIPS' })),
  ]
}

const lastSlug = (name: string) => pbSlug(name.split(',')[0]!)

type Stage = '' | 'manage' | 'workgroup' | 'membership' | 'orgs'

/* ---------------------------------------------------------------------------
   Change Workspace
   ------------------------------------------------------------------------ */
function ChangeWorkspaceDialog({ args, close }: AreaWindowProps) {
  const ws = useWorkspaceStore()
  const extras = useWorkspaceExtras()
  const rows = shareRows(extras.workgroups, extras.memberships)
  const [picked, setPicked] = useState<Set<string>>(() => new Set(
    ws.blend === 'own' || ws.blend === 'blend-with-me' ? [CURRENT_USER.name, ...ws.sharedWith] : ws.sharedWith,
  ))
  const [cur, setCur] = useState(0)
  const [asDefault, setAsDefault] = useState(false)
  const [stage, setStage] = useState<Stage>(() => {
    const s = args.stage
    /* "If this is the first Workgroup you've created, MOIS will open
       directly to the Create Workgroup window" (1802767) */
    if (s === 'manage' && !extras.workgroups.length) return 'workgroup'
    return s === 'manage' || s === 'workgroup' || s === 'membership' ? s : ''
  })
  /* Manage Workgroups' choice, and the workgroup being edited */
  const [choice, setChoice] = useState<'create' | 'modify' | 'delete'>('create')
  const [chosen, setChosen] = useState(extras.workgroups[0]?.name ?? '')
  const [editing, setEditing] = useState<Workgroup | null>(() => (stage === 'workgroup' ? { name: '', users: [] } : null))
  useScreenReport({
    window: stage === 'manage' ? 'manage-workgroups' : stage === 'workgroup' ? 'create-edit-workgroup'
      : stage === 'membership' ? 'create-temporary-membership' : stage === 'orgs' ? 'org-role-list' : '',
    picked: picked.size,
    workgroups: extras.workgroups.length,
  })

  const toggle = (row: ShareRow, on: boolean) => setPicked((s) => {
    const next = new Set(s)
    const names = row.kind === 'WORKGROUPS' ? extras.workgroups.find((w) => w.name === row.name)?.users ?? [] : [row.name]
    for (const n of names) (on ? next.add(n) : next.delete(n))
    if (row.kind === 'WORKGROUPS') (on ? next.add(row.name) : next.delete(row.name))
    return next
  })
  const proceed = () => {
    const others = rows.filter((r) => r.kind !== 'WORKGROUPS' && r.name !== CURRENT_USER.name && picked.has(r.name)).map((r) => r.name)
    const me = picked.has(CURRENT_USER.name)
    const blend: WorkspaceBlend = !others.length ? 'own'
      : me ? 'blend-with-me'
        : others.length === 1 ? 'other' : 'blend-without-me'
    workspaceStore.changeWorkspace(blend, others)
    if (asDefault) workspaceExtras.saveDefault([...(me ? [CURRENT_USER.name] : []), ...others])
    close()
  }
  const included = rows.filter((r) => r.kind !== 'WORKGROUPS' && picked.has(r.name))

  const openManage = () => {
    if (!extras.workgroups.length) { setEditing({ name: '', users: [] }); setStage('workgroup') } else setStage('manage')
  }
  const manageOk = () => {
    if (choice === 'create') { setEditing({ name: '', users: [] }); setStage('workgroup'); return }
    const w = extras.workgroups.find((x) => x.name === chosen)
    if (!w) return
    if (choice === 'modify') { setEditing(w); setStage('workgroup'); return }
    workspaceExtras.deleteWorkgroup(w.name)
    setPicked((s) => { const n = new Set(s); n.delete(w.name); return n })
    setStage('')
  }

  return (
    <>
      <WorkspaceDialogFrame id="change-workspace" title="Change Workspace" width={940} height={600} onClose={close} controls={false}>
        <div style={{ display: 'flex', gap: 6, padding: '10px 10px 0', flex: '1 1 auto', minHeight: 0 }}>
          <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', border: '1px solid #a0a0a0', background: '#fff', minWidth: 0 }}>
            <FormBand>Select One or More Shared Workspaces</FormBand>
            <div style={{ display: 'flex', flex: '1 1 auto', minHeight: 0 }}>
              <PBDataWindow
                rows={rows}
                current={cur}
                onCurrentChange={setCur}
                groupBy={(u) => u.kind}
                groupLabel={(g) => <b>{g}</b>}
                rowTutorialId={(u) => `host.mois.row.ws-share-${lastSlug(u.name)}`}
                columns={[
                  {
                    key: 'select', header: 'Select', width: 60, align: 'center',
                    render: (u) => (
                      <PBCheckbox
                        tutorialId={`host.mois.cell.ws-share-${lastSlug(u.name)}`}
                        checked={picked.has(u.name)}
                        onChange={(v) => toggle(u, v)}
                      />
                    ),
                  },
                  { key: 'name', header: 'Name', width: 200, render: (u) => <span style={u.inactive ? { color: '#e00000' } : undefined}>{u.name}</span> },
                  { key: 'initials', header: 'Initials', width: 70, render: (u) => <span style={u.inactive ? { color: '#e00000' } : undefined}>{u.initials}</span> },
                  { key: 'until', header: 'Shared Until', width: 86 },
                  { key: 'access', header: 'Your Accessibility', width: 160 },
                  { key: 'reason', header: 'Reason', width: 80, render: (u) => <span style={{ color: '#8a8a8a' }}>{u.reason}</span> },
                ]}
              />
            </div>
            <div className="pb-row" style={{ gap: 4, padding: '4px 6px', background: '#c6dcf5', flex: 'none' }}>
              <DialogButton id="manage-workgroups" width={130} onClick={openManage}>Manage Workgroups...</DialogButton>
              <DialogButton id="add-organization-role" width={180} onClick={() => setStage('membership')}>Add Organization / Role to List</DialogButton>
            </div>
          </div>
          <div style={{ width: 230, flex: 'none', display: 'flex', flexDirection: 'column', border: '1px solid #a0a0a0', background: '#fff' }}>
            <FormBand>Included Users</FormBand>
            <div style={{ display: 'flex', flex: '1 1 auto', minHeight: 0 }} data-tutorial-id="host.mois.field.included-users">
              <PBDataWindow
                rows={included}
                gutter={false}
                current={-1}
                columns={[{ key: 'name', header: 'Name', render: (u) => <span style={u.inactive ? { color: '#e00000' } : undefined}>{u.name}</span> }]}
              />
            </div>
          </div>
        </div>
        <div className="pb-row" style={{ gap: 8, padding: '10px 12px', flex: 'none' }}>
          <PBCheckbox label="Save as Default" checked={asDefault} onChange={setAsDefault} tutorialId="host.mois.check.ws-save-as-default" />
          <span style={{ flex: '1 1 auto' }} />
          <DialogButton id="ws-continue" onClick={proceed} isDefault>Continue</DialogButton>
          <DialogButton id="ws-cancel" onClick={close}>Cancel</DialogButton>
          <span style={{ flex: '1 1 auto' }} />
          <span style={{ width: 150 }} />
        </div>
      </WorkspaceDialogFrame>

      {stage === 'manage' && (
        <WorkspaceDialogFrame id="manage-workgroups" title="Manage Workgroups" width={500} height={250} onClose={() => setStage('')} controls={false} zIndex={88}>
          <div style={{ margin: 10, border: '1px solid #a0a0a0', background: '#fff', flex: '1 1 auto' }}>
            <FormBand>Please Choose</FormBand>
            <div style={{ display: 'grid', gridTemplateColumns: '190px 1fr', rowGap: 8, padding: '10px 14px', alignItems: 'center' }}>
              <PBRadio name="manage-wg" label="Create a Workgroup" checked={choice === 'create'} onChange={() => setChoice('create')} tutorialId="host.mois.field.wg-create" />
              <span />
              <PBRadio name="manage-wg" label="View/Modify a Workgroup" checked={choice === 'modify'} onChange={() => setChoice('modify')} tutorialId="host.mois.field.wg-modify" />
              {choice === 'modify'
                ? <PBSelect w={220} options={extras.workgroups.map((w) => w.name)} value={chosen} onChange={(e) => setChosen(e.target.value)} data-tutorial-id="host.mois.field.wg-pick" />
                : <span />}
              <PBRadio name="manage-wg" label="Delete a Workgroup" checked={choice === 'delete'} onChange={() => setChoice('delete')} tutorialId="host.mois.field.wg-delete" />
              {choice === 'delete'
                ? <PBSelect w={220} options={extras.workgroups.map((w) => w.name)} value={chosen} onChange={(e) => setChosen(e.target.value)} data-tutorial-id="host.mois.field.wg-pick" />
                : <span />}
            </div>
          </div>
          <div className="pb-row" style={{ gap: 10, padding: '0 0 10px', justifyContent: 'center', flex: 'none' }}>
            <DialogButton id="manage-workgroups-ok" width={90} onClick={manageOk} isDefault>Ok</DialogButton>
            <DialogButton id="manage-workgroups-cancel" width={90} onClick={() => setStage('')}>Cancel</DialogButton>
          </div>
        </WorkspaceDialogFrame>
      )}

      {stage === 'workgroup' && editing && (
        <WorkgroupEditor
          initial={editing}
          onSave={(w) => {
            workspaceExtras.saveWorkgroup(w.name, w.users, editing.name || undefined)
            setEditing(null)
            setStage('')
          }}
          onClose={() => { setEditing(null); setStage('') }}
        />
      )}

      {(stage === 'membership' || stage === 'orgs') && (
        <TemporaryMembership
          choosing={stage === 'orgs'}
          onChoose={() => setStage('orgs')}
          onChosen={() => setStage('membership')}
          onSave={() => setStage('')}
          onClose={() => setStage('')}
        />
      )}
    </>
  )
}

/* ---------------------------------------------------------------------------
   Create/Edit Workgroup (`cc4a0583…`)
   ------------------------------------------------------------------------ */
function WorkgroupEditor({ initial, onSave, onClose }: { initial: Workgroup; onSave: (w: Workgroup) => void; onClose: () => void }) {
  const [name, setName] = useState(initial.name)
  const [users, setUsers] = useState<Set<string>>(() => new Set(initial.users))
  const [cur, setCur] = useState(0)
  const [refused, setRefused] = useState(false)
  const rows = SHARING_RULES.filter((r) => !expired(r))
  return (
    <>
      <WorkspaceDialogFrame id="create-edit-workgroup" title="Create/Edit Workgroup" width={652} height={620} onClose={onClose} controls={false} zIndex={88}>
        <div className="pb-row" style={{ gap: 8, padding: '10px 12px', flex: 'none' }}>
          <span>Workgroup:</span>
          <PBInput w={440} value={name} onChange={(e) => setName(e.target.value)} data-tutorial-id="host.mois.field.workgroup-name" />
        </div>
        <div style={{ margin: '0 12px', flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', border: '1px solid #a0a0a0', background: '#fff' }}>
          <FormBand>Shared Workspaces</FormBand>
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
            <PBDataWindow
              rows={rows}
              current={cur}
              onCurrentChange={setCur}
              groupBy={() => 'USERS'}
              groupLabel={(g) => <b>{g}</b>}
              rowTutorialId={(u) => `host.mois.row.wg-user-${lastSlug(u.name)}`}
              columns={[
                {
                  key: 'select', header: 'Select', width: 80, align: 'center',
                  render: (u) => (
                    <PBCheckbox
                      checked={users.has(u.name)}
                      tutorialId={`host.mois.cell.wg-user-${lastSlug(u.name)}`}
                      onChange={(on) => setUsers((s) => { const n = new Set(s); on ? n.add(u.name) : n.delete(u.name); return n })}
                    />
                  ),
                },
                { key: 'name', header: 'Name', width: 300, render: (u) => <span style={u.inactive ? { color: '#e00000' } : undefined}>{u.name}</span> },
                { key: 'initials', header: 'Initials', width: 80 },
                { key: 'until', header: 'Shared Until', width: 90 },
              ]}
            />
          </div>
        </div>
        <div className="pb-row" style={{ gap: 6, padding: '12px', justifyContent: 'flex-end', flex: 'none' }}>
          <DialogButton id="workgroup-continue" onClick={() => { if (!name.trim() || !users.size) setRefused(true); else onSave({ name: name.trim().toUpperCase(), users: [...users] }) }} isDefault>Continue</DialogButton>
          <DialogButton id="workgroup-cancel" onClick={onClose}>Cancel</DialogButton>
        </div>
      </WorkspaceDialogFrame>
      {refused && (
        <RaisedMessageBox title="Create/Edit Workgroup" icon="warn" buttons={[{ label: 'OK', value: 'ok', default: true, tutorialId: 'host.mois.command.msgbox-ok' }]} onClose={() => setRefused(false)}>
          Name the workgroup and select at least one user.
        </RaisedMessageBox>
      )}
    </>
  )
}

/* ---------------------------------------------------------------------------
   Create Temporary Membership (`9b638396…`)
   ------------------------------------------------------------------------ */
const REASONS = ['', 'COVER SHIFT', 'LOCUM', 'OTHER']
const DURATIONS = ['Today', 'Today+Tomorrow', 'For a week'] as const
const plusDays = (stamp: string, n: number) => {
  const [y, m, d] = stamp.split('.').map(Number) as [number, number, number]
  const t = new Date(Date.UTC(y, m - 1, d + n))
  return `${t.getUTCFullYear()}.${String(t.getUTCMonth() + 1).padStart(2, '0')}.${String(t.getUTCDate()).padStart(2, '0')}`
}

let pendingOrg = ''

function TemporaryMembership({ choosing, onChoose, onChosen, onSave, onClose }: {
  choosing: boolean; onChoose: () => void; onChosen: () => void; onSave: () => void; onClose: () => void
}) {
  const [org, setOrg] = useState(pendingOrg)
  const [reason, setReason] = useState('')
  const [duration, setDuration] = useState<typeof DURATIONS[number]>('Today+Tomorrow')
  const [cur, setCur] = useState(0)
  const [refused, setRefused] = useState(false)
  const save = () => {
    if (!org || !reason) { setRefused(true); return }
    const until = duration === 'Today' ? MOIS_TODAY : duration === 'Today+Tomorrow' ? plusDays(MOIS_TODAY, 1) : plusDays(MOIS_TODAY, 6)
    workspaceExtras.addMembership({ org, reason, until, access: ALL })
    pendingOrg = ''
    onSave()
  }
  return (
    <>
      <WorkspaceDialogFrame id="create-temporary-membership" title="Create Temporary Membership" width={660} height={480} onClose={onClose} controls={false} zIndex={88}>
        <div style={{ margin: 12, padding: '12px 16px', border: '1px solid #a0a0a0', background: '#fff', flex: '1 1 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span>You are creating a temporary membership with an organization or organization role.  This membership will give you access to the selected workspaces.</span>
          <span>Organization / Org Role require membership with</span>
          <span className="pb-row" style={{ gap: 8 }}>
            <PBInput w={470} readOnly value={org} style={{ background: '#ececec' }} data-tutorial-id="host.mois.field.membership-org" />
            <DialogButton id="membership-select" width={100} onClick={onChoose}>Select...</DialogButton>
          </span>
          <span>Reason you require membership</span>
          <PBSelect w={470} options={REASONS} value={reason} onChange={(e) => setReason(e.target.value)} data-tutorial-id="host.mois.field.membership-reason" />
          <span>Duration of Membership</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }} data-tutorial-id="host.mois.field.membership-duration">
            {DURATIONS.map((d) => (
              <PBRadio key={d} name="membership-duration" label={d} checked={duration === d} onChange={() => setDuration(d)} tutorialId={`host.mois.field.membership-${pbSlug(d)}`} />
            ))}
          </div>
        </div>
        <div className="pb-row" style={{ gap: 10, padding: '0 0 12px', justifyContent: 'center', flex: 'none' }}>
          <DialogButton id="membership-save" onClick={save} isDefault>Save</DialogButton>
          <DialogButton id="membership-cancel" onClick={onClose}>Cancel</DialogButton>
        </div>
      </WorkspaceDialogFrame>
      {choosing && (
        <WorkspaceDialogFrame id="org-role-list" title="Organization / Org Role List" width={480} height={300} onClose={onChosen} controls={false} zIndex={92}>
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', margin: 8 }}>
            <PBDataWindow
              rows={ORG_ROLES}
              current={cur}
              onCurrentChange={setCur}
              onActivate={(r) => { setOrg(r.name); pendingOrg = r.name; onChosen() }}
              rowTutorialId={(r) => `host.mois.row.org-${pbSlug(r.name)}`}
              columns={[{ key: 'name', header: 'Name', width: 280 }, { key: 'type', header: 'Type' }]}
            />
          </div>
          <div className="pb-row" style={{ gap: 8, padding: '0 0 10px', justifyContent: 'center', flex: 'none' }}>
            <DialogButton id="org-role-ok" width={75} onClick={() => { const r = ORG_ROLES[cur]; if (r) { setOrg(r.name); pendingOrg = r.name } onChosen() }} isDefault>Ok</DialogButton>
            <DialogButton id="org-role-cancel" width={75} onClick={onChosen}>Cancel</DialogButton>
          </div>
        </WorkspaceDialogFrame>
      )}
      {refused && (
        <RaisedMessageBox title="Create Temporary Membership" icon="warn" buttons={[{ label: 'OK', value: 'ok', default: true, tutorialId: 'host.mois.command.msgbox-ok' }]} onClose={() => setRefused(false)}>
          Select an organization / org role and a reason.
        </RaisedMessageBox>
      )}
    </>
  )
}

/* ---------------------------------------------------------------------------
   Default Blending Changed (`47ccdc42…`)
   ------------------------------------------------------------------------ */
/** The users a saved default names whose sharing rule has since expired. */
export function expiredDefaults(saved: string[] | null): string[] {
  if (!saved) return []
  return saved.filter((n) => {
    const rule = SHARING_RULES.find((r) => r.name === n)
    return !!rule && expired(rule)
  })
}

function DefaultBlendingChanged({ args, close, open }: AreaWindowProps) {
  const extras = useWorkspaceExtras()
  const [users] = useState(() => (Array.isArray(args.users) ? (args.users as string[]) : expiredDefaults(extras.defaultBlend)))
  const decide = (yes: boolean) => {
    if (extras.defaultBlend) workspaceExtras.saveDefault(extras.defaultBlend.filter((n) => !users.includes(n)))
    if (yes) { if (!open('change-workspace')) close() } else close()
  }
  return (
    <RaisedMessageBox
      title="Default Blending Changed"
      icon="question"
      buttons={[{ label: 'Yes', value: 'yes', default: true, tutorialId: 'host.mois.command.msgbox-yes' }, { label: 'No', value: 'no', tutorialId: 'host.mois.command.msgbox-no' }]}
      onClose={(v) => decide(v === 'yes')}
    >
      <span data-tutorial-id="host.mois.dialog.default-blending-changed">
        The following users have been removed from your default Blended Workspace selection because their rule for sharing with you has expired or been deleted.
        <br /><br />
        {users.map((u) => <b key={u} style={{ display: 'block', paddingLeft: 60 }}>{u}</b>)}
        <br />
        Would you like to review your current Blended Workspace selections?
      </span>
    </RaisedMessageBox>
  )
}

registerAreaWindow('change-workspace', ChangeWorkspaceDialog)
registerAreaWindow('manage-workgroups', (p) => <ChangeWorkspaceDialog {...p} args={{ ...p.args, stage: 'manage' }} />)
registerAreaWindow('create-temporary-membership', (p) => <ChangeWorkspaceDialog {...p} args={{ ...p.args, stage: 'membership' }} />)
registerAreaWindow('default-blending-changed', DefaultBlendingChanged)
