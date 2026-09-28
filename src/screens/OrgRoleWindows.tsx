import { useState, type CSSProperties, type ReactNode } from 'react'
import {
  PBCheckbox, PBDataWindow, PBInput, PBRadio, PBSelect, PBTabs, PBTextArea, pbSlug, usePBInstrumentation,
} from '../pb'
import { clinicListSpec, clinicRowsKey, type ClinicRow } from '../data/clinicManagement'
import { MOIS_TODAY } from '../data/patients'
import { useScreenReport } from '../host/screen-state'
import { useSessionState } from '../host/screen-windows'
import { useStoredList } from './adminSession'
import { ButtonBand, CentredFooter, Cmd, Line } from './adminKit'
import { ProviderTab } from './ClinicEditorWindows'
import { DemographicModal } from './DemographicDialogs'
import { AliasIdGrid, InboxForwardingGrid, SharingWorkspaceGrid, userNames } from './ProviderTabGrids'
import { StageMessageBox } from './StageWindow'

/* ============================================================================
   Administration ▸ Clinic Management ▸ Org Role List / Organization List —
   New Org Role Profile and the Org Role / Organization window.

   PROVENANCE: 2069798 "Create a New Organization or Org Role" (v02.30.11):
     `e8cb6689…`  New Org Role Profile over the Org Role List: Name,
                  Category (drop-down), Signature; a rule; "Workspace /
                  Scheduling:" and four ticks (daybook, clinical documents,
                  internal tasks, internal message.); Short Name (grey until a
                  workspace is ticked) "(Abbreviated Reference for Workspace
                  identification)"; ☐ Allow workspace blending amongst active
                  members; ☐ Allow users to create temporary memberships;
                  Continue / Cancel.
     `c8213c6f…`  the two windows' headers: Organization — Name, Category,
                  Change Name...; Org Role — the same plus Signature Line.
     `6b135a61…`  General: Status (Active ☑ Yes and a Deactivate button,
                  Service End, Agreement), Correspondence Information; Save
                  at the left, Save / Close · Cancel centred.
     `b8ba256a…`  Scheduling (as the Provider's, with the Private Access
                  list — ProviderTabGrids.tsx).
     `f7425aa2…`  Billing; `8a5a7a17…`, `19c950c5…` Alias ID ("Alias ID's
                  for / ORGROLE: NURSE / Date Assigned"); `17f173e2…`
                  Workspace ("Workspace for / ORGROLE: NURSE", Available
                  Features, Inbox Forwarding / Sharing Workspace With).
     `18112eea…`, `cd31ff2e…`  Member (Org Role): Show Records ○ Active
                  ○ Inactive ○ All; Add Provider · Add User · Edit · Delete;
                  Expand All · Collapse All · Refresh; Member · Access to
                  Workspace Items (Basket · Task List · Message Board) ·
                  Start · End, banded Providers / Users, a provider's
                  associated user under it in red "Inherits from …";
                  Membership Settings ☑ ☑.
     `e3c5e7c3…`  Member (Organization): Add Org. Role as well, and an Org.
                  Roles band whose members inherit.
     `dbc903ba…`  Provider Team Member: Name, User (grey), Membership (Start
                  Date, End Date, Note), Workspace Access (three ticks),
                  Save / Cancel.
     `ad24b217…`  Service (the Provider's); `8691bd75…` Location (a
                  "Location List" band with New / Delete over Start · End ·
                  Location "…" · Address, two address lines, City / Postal
                  Code, Province / Country); `a8bc270f…` Online Booking;
                  `e4a91316…` Telehealth.
     `f85b61da…`, `154f388d…`, `4f788205…`  Subscriptions: Add → Select
                  Event (Access Control - Break Glass, Temporary Membership;
                  Continue / Cancel) → MOIS - Search Window → Event
                  Subscriber ("Please notify the selected subscriber when the
                  following event occurs:", Subscriber + Select..., Duration
                  Start / Stop (optional), Notification Method / Priority,
                  Save / Cancel) → the row, with Edit / Delete.

   INFERRED:
     · "New Organization Profile" — the Organization List's New Record is
       not captured; it is New Org Role Profile without Signature.
     · Category's list (TEAM, LOCATION, CLINIC — 2069798's "Team, Location
       or Clinic"), and Change Name... (a Name / Signature Line pair).
     · the member picker: a "MOIS - Search Window" over this session's org
       roles, providers and users (Name · Type), Ok / Cancel.
     · the refusal when an organization with a workspace has no named user
       holding all three Workspace Items (2069798: "there has to be a named
       user as a member who has access to all three Workspace Items before
       it will save").

   Records are the session's: New Org Role Profile's Continue adds the row
   to its list and opens the window on it; Save writes the header and tabs
   back; members, locations and subscriptions are kept per record.

   Anchors: dialogs new-org-role-profile, new-organization-profile, org-role,
   organization, provider-team-member, member-search, select-event,
   event-subscriber, change-org-name, org-message; fields name, category,
   signature, signature-line, short-name, ws-daybook, ws-documents,
   ws-tasks, ws-messages, allow-blending, allow-temporary, show-records-
   <active|inactive|all>, member-start-date, member-end-date, member-note,
   member-basket, member-task-list, member-message-board, location-<col>-<n>,
   subscriber-start, subscriber-stop, notification-method, notification-
   priority; commands continue, cancel, save, save-close, deactivate,
   change-name, add-org-role, add-provider, add-user, member-edit,
   member-delete, expand-all, collapse-all, member-refresh, member-save,
   member-cancel, location-list-new / -delete, subscriptions-add,
   subscription-edit-<n>, subscription-delete-<n>, event-continue,
   subscriber-select, subscriber-save; rows host.mois.row.member-<slug>,
   event-<slug>, subscription-<n>.
   ========================================================================= */

export const ORG_WINDOWS = ['new-org-role-profile', 'new-organization-profile', 'org-role', 'organization'] as const

type Kind = 'org-role' | 'organization'
const nodeOf = (kind: Kind) => (kind === 'org-role' ? 'ad-org-role-list' : 'ad-org-list')
const S = (v: unknown) => (v == null ? '' : String(v))
const CATEGORIES = ['', 'CLINIC', 'LOCATION', 'TEAM']

export function useOrgRows(kind: Kind) {
  const node = nodeOf(kind)
  return useStoredList<ClinicRow>(clinicRowsKey(node), clinicListSpec(node)?.rows ?? [])
}

/* ===========================================================================
   New Org Role Profile / New Organization Profile      `e8cb6689…`
   ======================================================================== */

export function NewOrgProfileDialog({ kind, close, open, onAdded }: {
  kind: Kind; close: () => void; open: (id: string, args?: Record<string, unknown>) => void; onAdded?: () => void
}) {
  const [rows, update] = useOrgRows(kind)
  const [d, setD] = useState({ name: '', category: '', signature: '', short: '', daybook: false, documents: false, tasks: false, messages: false, blending: false, temporary: false })
  const workspace = d.documents || d.tasks || d.messages
  const set = (patch: Partial<typeof d>) => setD({ ...d, ...patch })
  const tick = (key: 'daybook' | 'documents' | 'tasks' | 'messages' | 'blending' | 'temporary', anchor: string, label: string) => (
    <div style={{ padding: '2px 0 2px 94px' }}><PBCheckbox label={label} checked={d[key]} onChange={(v) => set({ [key]: v })} tutorialId={`host.mois.field.${anchor}`} /></div>
  )
  const proceed = () => {
    const name = d.name.trim().toUpperCase()
    if (!name || rows.some((r) => S(r.name) === name)) return
    update((all) => [...all, {
      name, category: d.category, signature: kind === 'org-role' ? d.signature : '', abbrev: d.short,
      scheduleAppts: d.daybook, basket: d.documents, taskList: d.tasks, messageBoard: d.messages,
      blending: d.blending, temporary: d.temporary, activeYes: true, assigned: MOIS_TODAY,
    }])
    onAdded?.()
    open(kind, { key: name })
  }
  const title = kind === 'org-role' ? 'New Org Role Profile' : 'New Organization Profile'
  return (
    <DemographicModal title={title} width={546} onClose={close} dialog={kind === 'org-role' ? 'new-org-role-profile' : 'new-organization-profile'}>
      <div style={{ padding: '10px 14px 4px', background: '#fff' }}>
        <Line label="Name:" w={80}><PBInput w={326} value={d.name} onChange={(e) => set({ name: e.target.value })} data-tutorial-id="host.mois.field.name" /></Line>
        <Line label="Category:" w={80}><PBSelect w={216} options={CATEGORIES} value={d.category} onChange={(e) => set({ category: e.target.value })} data-tutorial-id="host.mois.field.category" /></Line>
        {kind === 'org-role' && <Line label="Signature:" w={80}><PBInput w={216} value={d.signature} onChange={(e) => set({ signature: e.target.value })} data-tutorial-id="host.mois.field.signature" /></Line>}
      </div>
      <div style={{ height: 1, background: '#a0a0a0' }} />
      <div style={{ padding: '8px 14px 30px', background: '#fff' }}>
        <div>Workspace / Scheduling:</div>
        {tick('daybook', 'ws-daybook', 'Will require a daybook for scheduling appointments / encounters')}
        {tick('documents', 'ws-documents', 'Will require a workspace for acknowledging clinical documents')}
        {tick('tasks', 'ws-tasks', 'Will require a workspace for receiving / managing internal tasks')}
        {tick('messages', 'ws-messages', 'Will require a workspace for receiving / managing internal message.')}
        <Line label="Short Name:" w={88}>
          <PBInput w={60} value={d.short} disabled={!workspace} onChange={(e) => set({ short: e.target.value })} data-tutorial-id="host.mois.field.short-name" />
          <span style={{ color: '#808080' }}>(Abbreviated Reference for Workspace identification)</span>
        </Line>
        {tick('blending', 'allow-blending', 'Allow workspace blending amongst active members')}
        {tick('temporary', 'allow-temporary', 'Allow users to create temporary memberships')}
      </div>
      <CentredFooter>
        <Cmd id="continue" w={88} onClick={proceed}>Continue</Cmd>
        <Cmd id="cancel" w={88} onClick={close}>Cancel</Cmd>
      </CentredFooter>
    </DemographicModal>
  )
}

/* ===========================================================================
   Org Role / Organization                              `6b135a61…` et al.
   ======================================================================== */

const TABS = ['General', 'Scheduling', 'Billing', 'Alias ID', 'Workspace', 'Member', 'Service', 'Location', 'Online Booking', 'Telehealth', 'Subscriptions']
type Draft = Record<string, string | boolean | undefined>

const IDENT: CSSProperties = { background: '#e4e4e4', fontWeight: 700 }

/** a block of a tab: bold navy caption inside a light outline */
function Group({ title, children, style }: { title: ReactNode; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ border: '1px solid #d4d4d4', padding: '4px 10px 8px', minWidth: 0, ...style }}>
      <div style={{ color: '#000080', fontWeight: 700, padding: '0 0 6px' }}>{title}</div>
      {children}
    </div>
  )
}

export type Member = {
  name: string
  type: 'ORG ROLE' | 'PROVIDER' | 'USER'
  user?: string
  basket: boolean
  taskList: boolean
  messageBoard: boolean
  start: string
  end: string
  note: string
}
export const membersKey = (kind: Kind, name: string) => `admin:${kind}:${name}:members`
const ORG_ROLE_MEMBERS_INDEX = 'admin:org-role-members-index'

export function OrgWindow({ kind, rowKey, close }: { kind: Kind; rowKey: string; close: () => void }) {
  const [rows, update] = useOrgRows(kind)
  const [key, setKey] = useState(rowKey)
  const row = rows.find((r) => S(r.name) === key) ?? { name: key }
  const [draft, setDraft] = useState<Draft>(() => ({
    activeYes: true, scheduleAppts: true, access: 'public', basket: true, taskList: true, messageBoard: true, assigned: MOIS_TODAY,
    ...row, display: S(row.name), first: '', last: '',
  }))
  const [members, setOwnMembers] = useSessionState<Member[]>(membersKey(kind, key), [])
  /* an org role's members are also filed under its name in one index, which
     is where an organization reads the members its org roles pass down */
  const [, setIndex] = useSessionState<Record<string, Member[]>>(ORG_ROLE_MEMBERS_INDEX, {})
  const setMembers = (next: Member[] | ((prev: Member[]) => Member[])) => setOwnMembers((prev) => {
    const value = typeof next === 'function' ? next(prev) : next
    if (kind === 'org-role') setIndex((ix) => ({ ...ix, [key]: value }))
    return value
  })
  const [tab, setTab] = useState(TABS[0]!)
  const [renaming, setRenaming] = useState(false)
  const [notice, setNotice] = useState('')
  const [saved, setSaved] = useState(false)
  const set = (patch: Draft) => { setDraft((d) => ({ ...d, ...patch })); setSaved(false) }
  const label = kind === 'org-role' ? 'Org Role' : 'Organization'
  useScreenReport({ dialog: kind, orgActive: draft.activeYes !== false, members: members.length, saved })

  const save = (): boolean => {
    const workspace = Boolean(draft.basket || draft.taskList || draft.messageBoard)
    if (kind === 'organization' && workspace && !members.some((m) => m.type === 'USER' && m.basket && m.taskList && m.messageBoard && !m.end)) {
      setNotice('An organization with a workspace needs a named user as a member with access to all three Workspace Items (Basket, Task List and Message Board) before it can be saved.')
      return false
    }
    const name = S(draft.name) || key
    update((all) => all.map((r) => (S(r.name) === key ? { ...r, ...draft, name, active: draft.activeYes === false ? 'N' : 'Y' } : r)))
    setKey(name)
    setSaved(true)
    return true
  }

  const page = (() => {
    switch (tab) {
      case 'General': return <OrgGeneral draft={draft} set={set} />
      case 'Alias ID': return (
        <>
          <Assigned title="Alias ID's for" kind={kind} draft={draft} />
          <AliasIdGrid owner={key} user="" />
        </>
      )
      case 'Workspace': return <OrgWorkspace kind={kind} owner={key} draft={draft} set={set} />
      case 'Member': return <MemberTab kind={kind} members={members} setMembers={setMembers} draft={draft} set={set} />
      case 'Location': return <LocationTab owner={`${kind}:${key}`} />
      case 'Subscriptions': return <SubscriptionsTab owner={`${kind}:${key}`} />
      /* Scheduling, Billing, Service, Online Booking and Telehealth are the
         Provider window's own tabs (2069798's captures match them) */
      default: return <ProviderTab tab={tab} draft={{ ...draft, name: key }} set={set} onChangeUser={() => undefined} />
    }
  })()

  return (
    <DemographicModal title={label} width={975} height={722} onClose={close} dialog={kind}>
      <div className="pb-row" style={{ alignItems: 'flex-start', gap: 0, padding: '6px 12px 18px', flex: 'none', background: 'linear-gradient(#f3f9fd, #cfe7f7)', borderBottom: '1px solid #9ab' }}>
        <div>
          <Line label="Name:" w={80}><PBInput w={286} value={S(draft.name)} readOnly style={IDENT} data-tutorial-id="host.mois.field.name" /></Line>
          <Line label="Category:" w={80}><PBSelect w={216} options={CATEGORIES} value={S(draft.category)} onChange={(e) => set({ category: e.target.value })} data-tutorial-id="host.mois.field.category" /></Line>
        </div>
        {kind === 'org-role' && (
          <div style={{ marginLeft: 50 }}>
            <Line label="Signature Line:" w={90}><PBInput w={212} value={S(draft.signature)} onChange={(e) => set({ signature: e.target.value })} data-tutorial-id="host.mois.field.signature-line" /></Line>
          </div>
        )}
        <div style={{ marginLeft: 'auto' }}><Cmd id="change-name" w={92} onClick={() => setRenaming(true)}>Change Name...</Cmd></div>
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <PBTabs tabs={TABS} active={tab} onChange={setTab} compact face>
          <div key={tab} style={{ flex: '1 1 auto', minHeight: 0, minWidth: 0, overflow: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {page}
          </div>
        </PBTabs>
      </div>
      <CentredFooter left={<Cmd id="save" w={88} onClick={save}>Save</Cmd>}>
        <Cmd id="save-close" w={88} onClick={() => { if (save()) close() }}>Save / Close</Cmd>
        <Cmd id="cancel" w={88} onClick={close}>Cancel</Cmd>
      </CentredFooter>
      {renaming && (
        <ChangeOrgName kind={kind} draft={draft} onClose={() => setRenaming(false)}
          onSave={(name, signature) => { set({ name, signature }); setRenaming(false) }} />
      )}
      {notice && (
        <StageMessageBox id="org-message" title="MOIS" icon="warn" buttons={[{ label: 'OK', value: 'ok', default: true }]} onClose={() => setNotice('')}>
          {notice}
        </StageMessageBox>
      )}
    </DemographicModal>
  )
}

function ChangeOrgName({ kind, draft, onSave, onClose }: { kind: Kind; draft: Draft; onSave: (name: string, signature: string) => void; onClose: () => void }) {
  const [name, setName] = useState(S(draft.name))
  const [sig, setSig] = useState(S(draft.signature))
  return (
    <DemographicModal title="Change Name" width={460} onClose={onClose} dialog="change-org-name">
      <div style={{ padding: '10px 14px', background: '#fff' }}>
        <Line label="Name:" w={90}><PBInput w={300} value={name} onChange={(e) => setName(e.target.value)} data-tutorial-id="host.mois.field.new-name" /></Line>
        {kind === 'org-role' && <Line label="Signature Line:" w={90}><PBInput w={300} value={sig} onChange={(e) => setSig(e.target.value)} data-tutorial-id="host.mois.field.new-signature-line" /></Line>}
      </div>
      <CentredFooter>
        <Cmd id="change-name-save" w={78} onClick={() => name.trim() && onSave(name.trim().toUpperCase(), sig)}>Save</Cmd>
        <Cmd id="change-name-cancel" w={78} onClick={onClose}>Cancel</Cmd>
      </CentredFooter>
    </DemographicModal>
  )
}

/** "Alias ID's for" / "Workspace for": ORGROLE / ORGANIZATION and Date Assigned (`8a5a7a17…`, `17f173e2…`). */
function Assigned({ title, kind, draft }: { title: string; kind: Kind; draft: Draft }) {
  return (
    <Group title={title}>
      <div className="pb-row" style={{ gap: 8 }}>
        <span style={{ width: 100 }}>{kind === 'org-role' ? 'ORGROLE:' : 'ORGANIZATION:'}</span>
        <PBInput w={260} readOnly value={S(draft.name)} style={{ background: '#e8e8e8' }} />
        <span className="pb-row__spacer" />
        <span>Date Assigned:</span>
        <PBInput w={74} readOnly align="center" value={S(draft.assigned)} style={{ background: '#e8e8e8' }} />
      </div>
    </Group>
  )
}

/* General — `6b135a61…`: Status with the Deactivate button, then the
   Correspondence Information the Provider window also carries */
function OrgGeneral({ draft, set }: { draft: Draft; set: (patch: Draft) => void }) {
  const text = (label: string, key: string, w: number) => (
    <PBInput w={w} value={S(draft[key])} onChange={(e) => set({ [key]: e.target.value })} data-tutorial-id={`host.mois.field.${pbSlug(label)}`} />
  )
  const hint = { color: '#808080' }
  return (
    <>
      <Group title="Status">
        <Line label="Active:">
          <PBCheckbox label="Yes" checked={draft.activeYes !== false} onChange={(v) => set({ activeYes: v })} tutorialId="host.mois.field.active" />
          <span style={{ width: 24 }} />
          <Cmd id="deactivate" w={68} disabled={draft.activeYes === false} onClick={() => set({ activeYes: false, serviceEnd: S(draft.serviceEnd) || MOIS_TODAY })}>Deactivate</Cmd>
        </Line>
        <Line label="Service End:">{text('Service End', 'serviceEnd', 74)}</Line>
        <Line label="Agreement:">{text('Agreement', 'agreement', 74)}<span style={hint}>(service agreement accepted date)</span></Line>
      </Group>
      <Group title="Correspondence Information">
        <div style={{ ...hint, paddingBottom: 4 }}>The following information is used throughout MOIS to personalize report output, Rx printouts, Letter Templates, Fillable PDF forms and so on.</div>
        {[1, 2, 3, 4, 5].map((n) => (
          <Line key={n} label={n === 1 ? 'Letterhead:' : ''}>{text(`Letterhead ${n}`, `letterhead${n}`, 264)}<span style={hint}>(letterhead {n})</span></Line>
        ))}
        <div style={{ ...hint, padding: '4px 0' }}>Other values (this information is not automatically included in the letterhead sections of report - for this information to appear in the letterhead, it must be duplicated in the above designated fields)</div>
        <Line label="Postal Code:">{text('Postal Code', 'postal', 96)}</Line>
        <Line label="Phone 1:">{text('Phone 1', 'phone1', 96)}</Line>
        <Line label="Phone 2:">{text('Phone 2', 'phone2', 96)}</Line>
        <Line label="Fax 1:">{text('Fax 1', 'fax1', 96)}</Line>
        <div style={{ ...hint, padding: '4px 0' }}>Primary Location is used to inform Labs or other testing facilities of this provider&apos;s primary location when it is different from the current clinic.</div>
        <Line label="Primary Location:">{text('Primary Location', 'primaryLocation', 264)}</Line>
      </Group>
    </>
  )
}

/* Workspace — `17f173e2…` */
function OrgWorkspace({ kind, owner, draft, set }: { kind: Kind; owner: string; draft: Draft; set: (patch: Draft) => void }) {
  const [sub, setSub] = useState('Inbox Forwarding')
  const tick = (label: string, key: string, note: string) => (
    <Line label={`${label}:`} w={84}><PBCheckbox label={note} checked={draft[key] !== false} onChange={(v) => set({ [key]: v })} tutorialId={`host.mois.field.${pbSlug(label)}`} /></Line>
  )
  return (
    <>
      <Assigned title="Workspace for" kind={kind} draft={draft} />
      <Group title="Available Features">
        <div className="pb-row" style={{ alignItems: 'flex-start', gap: 40 }}>
          <div>
            {tick('Basket', 'basket', '(for acknowledging clinical documents)')}
            {tick('Task List', 'taskList', '(for receiving / managing internal tasks)')}
            {tick('Message Board', 'messageBoard', '(for receiving / managing internal message)')}
          </div>
          <div>
            <Line label="Abbreviated Reference:" w={120}><PBInput w={72} value={S(draft.abbrev)} onChange={(e) => set({ abbrev: e.target.value })} data-tutorial-id="host.mois.field.abbreviated-reference" /></Line>
            <div style={{ color: '#808080', paddingLeft: 126 }}>(for the blended workspace initials column)</div>
          </div>
        </div>
      </Group>
      <div style={{ flex: '1 1 auto', minHeight: 200, display: 'flex', flexDirection: 'column' }}>
        <PBTabs tabs={['Inbox Forwarding', 'Sharing Workspace With']} active={sub} onChange={setSub} compact face>
          {sub === 'Inbox Forwarding' ? <InboxForwardingGrid key="f" owner={`${kind}:${owner}`} /> : <SharingWorkspaceGrid key="s" owner={`${kind}:${owner}`} />}
        </PBTabs>
      </div>
    </>
  )
}

/* ===========================================================================
   Member                                    `18112eea…`, `cd31ff2e…`, `e3c5e7c3…`
   ======================================================================== */

type MemberRow = Member & { band: string; inherits?: string; index: number }

const BANDS = ['Org. Roles', 'Providers', 'Users']
const bandOf = (m: Member) => (m.type === 'ORG ROLE' ? 'Org. Roles' : m.type === 'PROVIDER' ? 'Providers' : 'Users')

function MemberTab({ kind, members, setMembers, draft, set }: {
  kind: Kind; members: Member[]; setMembers: (next: Member[] | ((p: Member[]) => Member[])) => void
  draft: Draft; set: (patch: Draft) => void
}) {
  const host = usePBInstrumentation()
  const [show, setShow] = useState<'Active' | 'Inactive' | 'All'>('Active')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [cur, setCur] = useState(0)
  const [adding, setAdding] = useState<Member['type'] | null>(null)
  const [editing, setEditing] = useState<{ index: number; member: Member } | null>(null)
  /* an org role's own members inherit into an organization (`e3c5e7c3…`) */
  const [orgRoleMembers] = useSessionState<Record<string, Member[]>>(ORG_ROLE_MEMBERS_INDEX, {})
  const live = (m: Member) => !m.end || m.end >= MOIS_TODAY
  const kept = members.map((m, index) => ({ m, index })).filter(({ m }) => show === 'All' || (show === 'Active' ? live(m) : !live(m)))
  const rows: MemberRow[] = []
  for (const b of BANDS) {
    for (const { m, index } of kept.filter((x) => bandOf(x.m) === b)) {
      rows.push({ ...m, band: b, index })
      /* a provider's associated user, and an org role's members, inherit */
      if (m.type === 'PROVIDER') rows.push({ ...m, band: b, index, inherits: m.name, name: m.user || m.name })
      if (m.type === 'ORG ROLE') for (const x of orgRoleMembers[m.name] ?? []) rows.push({ ...x, band: b, index, inherits: m.name })
    }
  }
  const at = Math.min(cur, Math.max(0, rows.length - 1))
  const row = rows[at]
  const link = (id: string, label: string, act: () => void) => (
    <button type="button" className="pb-link" style={{ textDecoration: 'underline', marginRight: 36 }}
      data-tutorial-id={host?.anchor('command', id)} onClick={() => { host?.report('command', { command: id }); act() }}>{label}</button>
  )
  const yn = (v: boolean) => (v ? 'Y' : '')
  return (
    <>
      <div style={{ border: '1px solid #8a8a8a', display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 300 }}>
        <div className="pb-row" style={{ gap: 14, padding: '4px 8px', background: 'linear-gradient(#e6f3fc, #c6e3f7)', flex: 'none' }}>
          <span>Show Records:</span>
          {(['Active', 'Inactive', 'All'] as const).map((v) => (
            <PBRadio key={v} name={`show-records-${kind}`} label={v} checked={show === v} onChange={() => setShow(v)} tutorialId={`host.mois.field.show-records-${v.toLowerCase()}`} />
          ))}
          <span className="pb-row__spacer" />
          {kind === 'organization' && <Cmd id="add-org-role" w={98} onClick={() => setAdding('ORG ROLE')}>Add Org. Role</Cmd>}
          <Cmd id="add-provider" w={98} onClick={() => setAdding('PROVIDER')}>Add Provider</Cmd>
          <Cmd id="add-user" w={98} onClick={() => setAdding('USER')}>Add User</Cmd>
          <Cmd id="member-edit" w={98} disabled={!row || Boolean(row.inherits)} onClick={() => row && !row.inherits && setEditing({ index: row.index, member: members[row.index]! })}>Edit</Cmd>
          <Cmd id="member-delete" w={98} disabled={!row || Boolean(row.inherits)} onClick={() => { if (row && !row.inherits) { setMembers((all) => all.filter((_, j) => j !== row.index)); setCur(0) } }}>Delete</Cmd>
        </div>
        <div className="pb-row" style={{ padding: '3px 12px', background: 'linear-gradient(#e6f3fc, #c6e3f7)', borderTop: '1px solid #9ab', flex: 'none' }}>
          {link('expand-all', 'Expand All', () => setCollapsed(new Set()))}
          {link('collapse-all', 'Collapse All', () => setCollapsed(new Set(BANDS)))}
          {link('member-refresh', 'Refresh', () => setCur(0))}
        </div>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', background: '#fff' }}>
          <PBDataWindow<MemberRow>
            rows={rows}
            current={at}
            onCurrentChange={setCur}
            onActivate={(r) => { if (!r.inherits) setEditing({ index: r.index, member: members[r.index]! }) }}
            groupBy={(r) => r.band}
            groups={kind === 'organization' ? BANDS : BANDS.slice(1)}
            collapsed={collapsed}
            onCollapsedChange={setCollapsed}
            groupTutorialId={(g) => `host.mois.group.members-${pbSlug(g)}`}
            rowTutorialId={(r) => (r.inherits ? undefined : `host.mois.row.member-${pbSlug(r.name)}`)}
            rowClassName={(r) => (r.inherits ? 'is-inherited' : undefined)}
            empty=" "
            columns={[
              { key: 'name', header: 'Member', width: 300, render: (r) => <span style={{ paddingLeft: r.inherits ? 8 : 0 }}>{r.name}</span> },
              { key: 'basket', header: 'Basket', width: 80, align: 'center', render: (r) => (r.inherits ? <span>Inherits from {r.inherits}</span> : yn(r.basket)) },
              { key: 'taskList', header: 'Task List', width: 76, align: 'center', render: (r) => (r.inherits ? '' : yn(r.taskList)) },
              { key: 'messageBoard', header: 'Message Board', width: 110, align: 'center', render: (r) => (r.inherits ? '' : yn(r.messageBoard)) },
              { key: 'start', header: 'Start', width: 90, align: 'center' },
              { key: 'end', header: 'End', width: 90, align: 'center' },
              { key: 'note', header: '', width: 190, render: (r) => <span style={{ color: '#808080' }}>{r.inherits ? '' : r.note}</span> },
            ]}
          />
        </div>
      </div>
      <style>{'.is-inherited > td { color: #c0504d !important; }'}</style>
      <Group title="Membership Settings">
        <div className="pb-row" style={{ gap: 90 }}>
          <PBCheckbox label="Allow workspace blending amongst active members" checked={Boolean(draft.blending)} onChange={(v) => set({ blending: v })} tutorialId="host.mois.field.allow-blending" />
          <PBCheckbox label="Allow temporary memberships" checked={Boolean(draft.temporary)} onChange={(v) => set({ temporary: v })} tutorialId="host.mois.field.allow-temporary" />
        </div>
      </Group>
      {adding && (
        <MemberSearchWindow
          type={adding}
          onClose={() => setAdding(null)}
          onPick={(name, user) => {
            setAdding(null)
            setEditing({ index: -1, member: { name, type: adding, user, basket: true, taskList: true, messageBoard: true, start: MOIS_TODAY, end: '', note: '' } })
          }}
        />
      )}
      {editing && (
        <ProviderTeamMember
          member={editing.member}
          onClose={() => setEditing(null)}
          onSave={(m) => {
            setMembers((all) => (editing.index < 0 ? [...all, m] : all.map((x, j) => (j === editing.index ? m : x))))
            setEditing(null)
          }}
        />
      )}
    </>
  )
}

/** "MOIS - Search Window" for a member — INFERRED layout over this session's records. */
function MemberSearchWindow({ type, onPick, onClose }: { type: Member['type']; onPick: (name: string, user?: string) => void; onClose: () => void }) {
  const [orgRoles] = useOrgRows('org-role')
  const [providers] = useStoredList<ClinicRow>(clinicRowsKey('ad-provider-list'), clinicListSpec('ad-provider-list')?.rows ?? [])
  const [name, setName] = useState('')
  const [cur, setCur] = useState(0)
  const all: { name: string; kind: string; user?: string }[] = type === 'ORG ROLE'
    ? orgRoles.map((r) => ({ name: S(r.name), kind: 'ORG ROLE' }))
    : type === 'PROVIDER'
      ? providers.filter((r) => r.active !== 'N').map((r) => ({ name: S(r.name), kind: 'PROVIDER', user: S(r.userProfile) || S(r.name).replace(/\s*\(.*\)$/, '') }))
      : userNames().map((n) => ({ name: n, kind: 'USER' }))
  const rows = all.filter((r) => r.name.toUpperCase().includes(name.trim().toUpperCase())).sort((a, b) => a.name.localeCompare(b.name))
  const at = Math.min(cur, Math.max(0, rows.length - 1))
  const row = rows[at]
  return (
    <DemographicModal title="MOIS - Search Window" width={620} height={520} onClose={onClose} dialog="member-search">
      <div style={{ padding: '6px 10px', background: 'linear-gradient(#e6effb, #d2e1f5)', flex: 'none' }}>
        Search for:
        <Line label="Name:" w={60}><PBInput w={260} value={name} onChange={(e) => { setName(e.target.value); setCur(0) }} data-tutorial-id="host.mois.field.member-search-name" /></Line>
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', margin: '4px 8px', border: '1px solid #8a8a8a', background: '#fff' }}>
        <PBDataWindow
          rows={rows}
          current={at}
          onCurrentChange={setCur}
          onActivate={(r) => onPick(r.name, r.user)}
          rowTutorialId={(r) => `host.mois.row.member-search-${pbSlug(r.name)}`}
          empty="Nothing matches."
          columns={[{ key: 'name', header: 'Name', width: 330, headAlign: 'left' }, { key: 'kind', header: 'Type', width: 150, headAlign: 'left' }]}
        />
      </div>
      <CentredFooter>
        <Cmd id="member-search-ok" w={74} disabled={!row} onClick={() => row && onPick(row.name, row.user)}>Ok</Cmd>
        <Cmd id="member-search-cancel" w={74} onClick={onClose}>Cancel</Cmd>
      </CentredFooter>
    </DemographicModal>
  )
}

/** Provider Team Member — `dbc903ba…`. */
function ProviderTeamMember({ member, onSave, onClose }: { member: Member; onSave: (m: Member) => void; onClose: () => void }) {
  const [m, setM] = useState(member)
  const set = (patch: Partial<Member>) => setM({ ...m, ...patch })
  return (
    <DemographicModal title="Provider Team Member" width={628} height={425} onClose={onClose} dialog="provider-team-member">
      <div style={{ padding: '6px 12px 10px', background: 'linear-gradient(#f3f9fd, #cfe7f7)', borderBottom: '1px solid #9ab', flex: 'none' }}>
        <Line label="Name:" w={70}><PBInput w={222} readOnly value={m.name} style={IDENT} /></Line>
        <Line label="User:" w={70}><PBInput w={354} readOnly value={m.type === 'ORG ROLE' ? '' : m.user ?? (m.type === 'USER' ? m.name : '')} style={{ background: '#e8e8e8' }} /></Line>
      </div>
      <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8, flex: '1 1 auto' }}>
        <Group title="Membership">
          <div className="pb-row" style={{ alignItems: 'flex-start', gap: 60 }}>
            <div>
              <Line label="Start Date:" w={80}><PBInput w={82} value={m.start} onChange={(e) => set({ start: e.target.value })} data-tutorial-id="host.mois.field.member-start-date" /></Line>
              <Line label="End Date:" w={80}><PBInput w={82} value={m.end} onChange={(e) => set({ end: e.target.value })} data-tutorial-id="host.mois.field.member-end-date" /></Line>
            </div>
            <Line label="Note:" w={30} style={{ alignItems: 'flex-start' }}><PBTextArea rows={2} w={260} value={m.note} onChange={(e) => set({ note: e.target.value })} data-tutorial-id="host.mois.field.member-note" /></Line>
          </div>
        </Group>
        <Group title="Workspace Access">
          <div><PBCheckbox label="Access to Workspace Basket for reviewing and acknowledge clinical records on behalf of the role / organization" checked={m.basket} onChange={(v) => set({ basket: v })} tutorialId="host.mois.field.member-basket" /></div>
          <div><PBCheckbox label="Access to Workspace Task List for reviewing and acknowledge items on behalf of the role / organization" checked={m.taskList} onChange={(v) => set({ taskList: v })} tutorialId="host.mois.field.member-task-list" /></div>
          <div><PBCheckbox label="Access to Workspace Message Board for reviewing and acknowledge items on behalf of the role / organization" checked={m.messageBoard} onChange={(v) => set({ messageBoard: v })} tutorialId="host.mois.field.member-message-board" /></div>
        </Group>
      </div>
      <CentredFooter>
        <Cmd id="member-save" w={88} onClick={() => m.start.trim() && onSave(m)}>Save</Cmd>
        <Cmd id="member-cancel" w={88} onClick={onClose}>Cancel</Cmd>
      </CentredFooter>
    </DemographicModal>
  )
}

/* ===========================================================================
   Location                                  `8691bd75…`
   ======================================================================== */

type LocationRow = { start: string; end: string; location: string; address1: string; address2: string; city: string; postal: string; province: string; country: string }

function LocationTab({ owner }: { owner: string }) {
  const [rows, setRows] = useSessionState<LocationRow[]>(`admin:${owner}:locations`, [])
  const [places] = useStoredList<ClinicRow>(clinicRowsKey('ad-locations'), clinicListSpec('ad-locations')?.rows ?? [])
  const [cur, setCur] = useState(0)
  useScreenReport({ locations: rows.length })
  const edit = (i: number, patch: Partial<LocationRow>) => setRows((all) => all.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const box = (i: number, key: keyof LocationRow, w: number) => (
    <PBInput w={w} value={rows[i]![key]} onChange={(e) => edit(i, { [key]: e.target.value })} data-tutorial-id={`host.mois.field.location-${key}-${i + 1}`} />
  )
  return (
    <div style={{ border: '1px solid #8a8a8a', display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 300 }}>
      <ButtonBand caption="Location List" scope="location-list" buttons={[
        { label: 'New', w: 64, onPress: () => { setRows((all) => [...all, { start: MOIS_TODAY, end: '', location: '', address1: '', address2: '', city: '', postal: '', province: 'BC', country: 'CANADA' }]); setCur(rows.length) } },
        { label: 'Delete', w: 64, onPress: () => { setRows((all) => all.filter((_, j) => j !== cur)); setCur(0) } },
      ]} />
      <div className="pb-row" style={{ gap: 0, padding: '2px 18px', background: 'linear-gradient(#e6f3fc, #c6e3f7)', flex: 'none' }}>
        <span style={{ width: 100 }}>Start</span><span style={{ width: 100 }}>End</span><span style={{ width: 326 }}>Location</span><span>Address</span>
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', background: '#fff' }}>
        {rows.map((r, i) => (
          <div key={i} data-tutorial-id={`host.mois.row.location-${i + 1}`} onMouseDown={() => setCur(i)}
            style={{ padding: '3px 18px', background: i === cur ? '#f3c5b8' : undefined, borderBottom: '1px solid #d0d0d0' }}>
            <div className="pb-row" style={{ gap: 4 }}>
              {box(i, 'start', 94)}{box(i, 'end', 94)}
              <PBSelect w={320} options={['', ...places.map((p) => S(p.location))]} value={r.location} onChange={(e) => edit(i, { location: e.target.value })} data-tutorial-id={`host.mois.field.location-location-${i + 1}`} />
              {box(i, 'address1', 398)}
            </div>
            <div className="pb-row" style={{ gap: 4, paddingLeft: 522 }}>{box(i, 'address2', 398)}</div>
            <div className="pb-row" style={{ gap: 4, justifyContent: 'flex-end', paddingRight: 0 }}>
              <span>City / Postal Code:</span>{box(i, 'city', 250)}{box(i, 'postal', 118)}
            </div>
            <div className="pb-row" style={{ gap: 4, justifyContent: 'flex-end' }}>
              <span>Province / Country:</span>{box(i, 'province', 250)}{box(i, 'country', 118)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ===========================================================================
   Subscriptions                             `f85b61da…`, `154f388d…`, `4f788205…`
   ======================================================================== */

type Subscription = { event: string; subscriber: string; method: string; priority: string; start: string; end: string }
const EVENTS = ['Access Control - Break Glass', 'Temporary Membership']

function SubscriptionsTab({ owner }: { owner: string }) {
  const [rows, setRows] = useSessionState<Subscription[]>(`admin:${owner}:subscriptions`, [])
  const [step, setStep] = useState<null | { at: number; event?: string; subscriber?: string; stage: 'event' | 'search' | 'detail' }>(null)
  useScreenReport({ subscriptions: rows.length })
  return (
    <div style={{ border: '1px solid #8a8a8a', display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 300 }}>
      <div className="pb-band" style={{ fontWeight: 700 }}>Subscriptions</div>
      <div className="pb-row" style={{ gap: 0, padding: '2px 4px', color: '#808080', background: 'linear-gradient(#e6f3fc, #c6e3f7)', flex: 'none' }}>
        <span style={{ width: 230 }}>Event</span><span style={{ width: 210 }}>Subscriber</span><span style={{ width: 120 }}>Method</span>
        <span style={{ width: 90 }}>Priority</span><span style={{ width: 80, textAlign: 'right' }}>Start</span><span style={{ width: 70, textAlign: 'right' }}>End</span>
        <span style={{ marginLeft: 'auto' }}><Cmd id="subscriptions-add" w={70} sm onClick={() => setStep({ at: -1, stage: 'event' })}>Add</Cmd></span>
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', background: '#fff' }}>
        {rows.map((r, i) => (
          <div key={i} className="pb-row" data-tutorial-id={`host.mois.row.subscription-${i + 1}`} style={{ gap: 0, padding: '2px 4px', borderBottom: '1px solid #e0e0e0' }}>
            <span style={{ width: 230, textDecoration: 'underline' }}>{r.event}</span><span style={{ width: 210 }}>{r.subscriber}</span>
            <span style={{ width: 120 }}>{r.method}</span><span style={{ width: 90 }}>{r.priority}</span>
            <span style={{ width: 80, textAlign: 'right' }}>{r.start}</span><span style={{ width: 70, textAlign: 'right' }}>{r.end}</span>
            <span style={{ marginLeft: 'auto' }} className="pb-row">
              <Cmd id={`subscription-edit-${i + 1}`} w={52} sm onClick={() => setStep({ at: i, event: r.event, subscriber: r.subscriber, stage: 'detail' })}>Edit</Cmd>
              <Cmd id={`subscription-delete-${i + 1}`} w={52} sm onClick={() => setRows((all) => all.filter((_, j) => j !== i))}>Delete</Cmd>
            </span>
          </div>
        ))}
      </div>
      {step?.stage === 'event' && (
        <SelectEvent onClose={() => setStep(null)} onContinue={(event) => setStep({ ...step, event, stage: 'search' })} />
      )}
      {step?.stage === 'search' && (
        <MemberSearchWindow type="USER" onClose={() => setStep(null)} onPick={(name) => setStep({ ...step, subscriber: name, stage: 'detail' })} />
      )}
      {step?.stage === 'detail' && (
        <EventSubscriber
          initial={step.at >= 0 ? rows[step.at]! : { event: step.event ?? '', subscriber: step.subscriber ?? '', method: 'MOIS Message', priority: 'High', start: MOIS_TODAY, end: '' }}
          onReselect={() => setStep({ ...step, stage: 'search' })}
          subscriber={step.subscriber}
          onClose={() => setStep(null)}
          onSave={(s) => {
            setRows((all) => (step.at >= 0 ? all.map((x, j) => (j === step.at ? s : x)) : [...all, s]))
            setStep(null)
          }}
        />
      )}
    </div>
  )
}

function SelectEvent({ onContinue, onClose }: { onContinue: (event: string) => void; onClose: () => void }) {
  const [cur, setCur] = useState(0)
  return (
    <DemographicModal title="Select Event" width={490} height={430} onClose={onClose} dialog="select-event">
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', margin: 8, border: '1px solid #8a8a8a', background: '#fff' }}>
        <PBDataWindow rows={EVENTS.map((event) => ({ event }))} current={cur} onCurrentChange={setCur} head={false}
          onActivate={(r) => onContinue(r.event)} rowTutorialId={(r) => `host.mois.row.event-${pbSlug(r.event)}`}
          columns={[{ key: 'event', header: '', width: 420 }]} />
      </div>
      <CentredFooter>
        <Cmd id="event-continue" w={74} onClick={() => onContinue(EVENTS[cur]!)}>Continue</Cmd>
        <Cmd id="event-cancel" w={74} onClick={onClose}>Cancel</Cmd>
      </CentredFooter>
    </DemographicModal>
  )
}

function EventSubscriber({ initial, subscriber, onReselect, onSave, onClose }: {
  initial: Subscription; subscriber?: string; onReselect: () => void; onSave: (s: Subscription) => void; onClose: () => void
}) {
  const [s, setS] = useState<Subscription>({ ...initial, subscriber: subscriber ?? initial.subscriber })
  const set = (patch: Partial<Subscription>) => setS({ ...s, ...patch })
  return (
    <DemographicModal title="Event Subscriber" width={490} height={430} onClose={onClose} dialog="event-subscriber">
      <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8, background: '#fff', flex: '1 1 auto' }}>
        <div>Please notify the selected subscriber when the following event occurs:<br /><b>{s.event}</b></div>
        <Group title="Subscriber">
          <div className="pb-row" style={{ gap: 20 }}>
            <PBInput w={300} readOnly value={s.subscriber} style={{ background: '#e8e8e8' }} data-tutorial-id="host.mois.field.subscriber" />
            <Cmd id="subscriber-select" w={78} onClick={onReselect}>Select...</Cmd>
          </div>
        </Group>
        <Group title="Duration">
          <div className="pb-row" style={{ gap: 6 }}>
            Start:<PBInput w={90} value={s.start} onChange={(e) => set({ start: e.target.value })} data-tutorial-id="host.mois.field.subscriber-start" />
            <span style={{ width: 30 }} />Stop:<PBInput w={90} value={s.end} placeholder="0000.00.00" onChange={(e) => set({ end: e.target.value })} data-tutorial-id="host.mois.field.subscriber-stop" />
            <span style={{ color: '#808080' }}>(optional)</span>
          </div>
        </Group>
        <Group title="Notification">
          <Line label="Method:" w={56}><PBSelect w={280} options={['MOIS Message', 'MOIS Task']} value={s.method} onChange={(e) => set({ method: e.target.value })} data-tutorial-id="host.mois.field.notification-method" /></Line>
          <Line label="Priority:" w={56}><PBSelect w={280} options={['Low', 'Medium', 'High', 'V. High']} value={s.priority} onChange={(e) => set({ priority: e.target.value })} data-tutorial-id="host.mois.field.notification-priority" /></Line>
        </Group>
      </div>
      <CentredFooter>
        <Cmd id="subscriber-save" w={80} onClick={() => s.subscriber && onSave(s)}>Save</Cmd>
        <Cmd id="subscriber-cancel" w={80} onClick={onClose}>Cancel</Cmd>
      </CentredFooter>
    </DemographicModal>
  )
}
