import { useState } from 'react'
import { PBDataWindow, PBRadio, pbSlug } from '../pb'
import { ALIAS_SOURCES, clinicListSpec, clinicRowsKey, type ClinicRow } from '../data/clinicManagement'
import { USER_ALIAS_ROWS, userListSpec } from '../data/userManagement'
import { MOIS_TODAY } from '../data/patients'
import { useScreenReport } from '../host/screen-state'
import { useStoredList } from './adminSession'
import { ButtonBand, CellSelect, CellText } from './adminKit'

/* ============================================================================
   The editable grids the Provider window (ClinicEditorWindows.tsx) and the
   Org Role / Organization window (OrgRoleWindows.tsx) share.

   PROVENANCE
   · Alias ID ▸ List — 303184 `9889ab26…`, 303054 `c00d2c29…`, 2069798
     `8a5a7a17…`: New / Delete at the band's right, Start Date · End Date ·
     Source (drop-down) · Value · Note. 303184: "MOIS will copy the Alias IDs
     for you once you have entered them the first time in either the User
     or the Provider Account" — so a provider's list is kept with its
     associated User Account (`aliasKey`) and opens with what that account
     already holds; one with no associated user keeps its own.
   · Workspace ▸ Inbox Forwarding / Sharing Workspace With — 303184
     `654dd512…`, 2069798 `17f173e2…`: Start · Stop · Forward to User · Rule
     (Reassign / Copy radios) · Note, and Start · Stop · User Account ·
     Note. "Click a blank space under the Header Forward to User and select
     the provider" — the cell drops the user list.
   · Scheduling ▸ Schedule Access — 2069798 `b8ba256a…`: Public Access reads
     "All users with access to the scheduling module"; Private Access reads
     "Members of this org/org role, users listed below, and all members of
     the org roles / organizations list below" over User / Role · Access ·
     Start · Stop and an Add button, the owner's own row first ("NURSE ·
     Allow · Members of").

   Each list is kept for the stage session under its owner's key, so it is
   there when the window is opened again. Dates are typed yyyy.mm.dd.

   Anchors: host.mois.command.alias-new / -delete, inbox-forwarding-new /
   -delete, sharing-workspace-new / -delete, schedule-access-add; cells
   host.mois.field.alias-<col>-<n>, forward-<col>-<n>, share-<col>-<n>,
   access-<col>-<n>; rows host.mois.row.alias-<n>, forward-<n>, share-<n>,
   access-<n>.
   ========================================================================= */

const S = (v: unknown) => (v == null ? '' : String(v))

export const aliasKey = (owner: string, user: string) => (user ? `admin:alias:user:${user}` : `admin:alias:owner:${owner}`)
const forwardingKey = (owner: string) => `admin:workspace:${owner}:forwarding`
const sharingKey = (owner: string) => `admin:workspace:${owner}:sharing`
const accessKey = (owner: string) => `admin:schedule-access:${owner}`

/** The User Accounts roster's display names. */
export const userNames = () => (userListSpec('ad-users')?.rows ?? []).map((r) => S(r.display)).filter(Boolean)

const EMPTY: ClinicRow[] = []

/* --------------------------------------------------------------------------
   Alias ID ▸ List
   ------------------------------------------------------------------------ */

export function AliasIdGrid({ owner, user }: { owner: string; user: string }) {
  /* a user account the roster knows opens with its own aliases (copied) */
  const known = user && userNames().includes(user)
  const [rows, update] = useStoredList<ClinicRow>(aliasKey(owner, user), known ? USER_ALIAS_ROWS : EMPTY)
  const [cur, setCur] = useState(0)
  useScreenReport({ aliases: rows.length })
  const edit = (i: number, patch: ClinicRow) => update((all) => all.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const text = (key: string, align?: 'center') => (r: ClinicRow, i: number) => (
    <CellText value={r[key]} align={align} onChange={(v) => edit(i, { [key]: v })} anchor={`alias-${key}-${i + 1}`} />
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 160, border: '1px solid #8a8a8a' }}>
      <ButtonBand
        caption="List"
        scope="alias"
        buttons={[
          { label: 'New', w: 60, onPress: () => { update((all) => [...all, { start: MOIS_TODAY, end: '', source: '', value: '', note: '' }]); setCur(rows.length) } },
          { label: 'Delete', w: 60, onPress: () => { update((all) => all.filter((_, j) => j !== cur)); setCur(0) } },
        ]}
      />
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', background: '#fff' }}>
        <PBDataWindow<ClinicRow>
          rows={rows}
          current={Math.min(cur, Math.max(0, rows.length - 1))}
          onCurrentChange={setCur}
          empty=" "
          rowTutorialId={(_r, i) => `host.mois.row.alias-${i + 1}`}
          columns={[
            { key: 'start', header: 'Start Date', width: 76, align: 'center', render: text('start', 'center') },
            { key: 'end', header: 'End Date', width: 76, align: 'center', render: text('end', 'center') },
            {
              key: 'source', header: 'Source', width: 150,
              render: (r, i) => <CellSelect value={r.source} options={['', ...ALIAS_SOURCES.map((x) => ({ value: x.code, label: x.code }))]} onChange={(v) => edit(i, { source: v })} anchor={`alias-source-${i + 1}`} />,
            },
            { key: 'value', header: 'Value', width: 230, render: text('value') },
            { key: 'note', header: 'Note', width: 360, render: text('note') },
          ]}
        />
      </div>
    </div>
  )
}

/* --------------------------------------------------------------------------
   Workspace ▸ Inbox Forwarding / Sharing Workspace With
   ------------------------------------------------------------------------ */

export function InboxForwardingGrid({ owner }: { owner: string }) {
  const [rows, update] = useStoredList<ClinicRow>(forwardingKey(owner), EMPTY)
  const [cur, setCur] = useState(0)
  const forwardTo = ['', ...userNames(), ...(clinicListSpec('ad-provider-list')?.rows ?? []).map((r) => S(r.name))]
    .filter((x, i, a) => a.indexOf(x) === i)
  useScreenReport({ forwarding: rows.length })
  const edit = (i: number, patch: ClinicRow) => update((all) => all.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, border: '1px solid #8a8a8a' }}>
      <ButtonBand
        caption="Inbox Forwarding"
        scope="inbox-forwarding"
        buttons={[
          { label: 'New', w: 60, onPress: () => { update((all) => [...all, { start: MOIS_TODAY, stop: '', forward: '', rule: 'Reassign', note: '' }]); setCur(rows.length) } },
          { label: 'Delete', w: 60, onPress: () => { update((all) => all.filter((_, j) => j !== cur)); setCur(0) } },
        ]}
      />
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', background: '#fff' }}>
        <PBDataWindow<ClinicRow>
          rows={rows}
          current={Math.min(cur, Math.max(0, rows.length - 1))}
          onCurrentChange={setCur}
          empty=" "
          rowTutorialId={(_r, i) => `host.mois.row.forward-${i + 1}`}
          columns={[
            { key: 'start', header: 'Start', width: 76, align: 'center', render: (r, i) => <CellText value={r.start} align="center" onChange={(v) => edit(i, { start: v })} anchor={`forward-start-${i + 1}`} /> },
            { key: 'stop', header: 'Stop', width: 76, align: 'center', render: (r, i) => <CellText value={r.stop} align="center" onChange={(v) => edit(i, { stop: v })} anchor={`forward-stop-${i + 1}`} /> },
            { key: 'forward', header: 'Forward to User', width: 190, render: (r, i) => <CellSelect value={r.forward} options={forwardTo} onChange={(v) => edit(i, { forward: v })} anchor={`forward-user-${i + 1}`} /> },
            {
              key: 'rule', header: 'Rule', width: 150, align: 'center',
              render: (r, i) => (
                <span className="pb-row" style={{ gap: 8 }}>
                  {['Reassign', 'Copy'].map((rule) => (
                    <PBRadio key={rule} name={`forward-rule-${owner}-${i}`} label={rule} checked={S(r.rule) === rule} onChange={() => edit(i, { rule })} tutorialId={`host.mois.field.forward-rule-${pbSlug(rule)}-${i + 1}`} />
                  ))}
                </span>
              ),
            },
            { key: 'note', header: 'Note', width: 390, render: (r, i) => <CellText value={r.note} onChange={(v) => edit(i, { note: v })} anchor={`forward-note-${i + 1}`} /> },
          ]}
        />
      </div>
    </div>
  )
}

export function SharingWorkspaceGrid({ owner }: { owner: string }) {
  const [rows, update] = useStoredList<ClinicRow>(sharingKey(owner), EMPTY)
  const [cur, setCur] = useState(0)
  useScreenReport({ sharing: rows.length })
  const edit = (i: number, patch: ClinicRow) => update((all) => all.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, border: '1px solid #8a8a8a' }}>
      <ButtonBand
        caption="Sharing Workspace With"
        scope="sharing-workspace"
        buttons={[
          { label: 'New', w: 60, onPress: () => { update((all) => [...all, { start: MOIS_TODAY, stop: '', user: '', note: '' }]); setCur(rows.length) } },
          { label: 'Delete', w: 60, onPress: () => { update((all) => all.filter((_, j) => j !== cur)); setCur(0) } },
        ]}
      />
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', background: '#fff' }}>
        <PBDataWindow<ClinicRow>
          rows={rows}
          current={Math.min(cur, Math.max(0, rows.length - 1))}
          onCurrentChange={setCur}
          empty=" "
          rowTutorialId={(_r, i) => `host.mois.row.share-${i + 1}`}
          columns={[
            { key: 'start', header: 'Start', width: 76, align: 'center', render: (r, i) => <CellText value={r.start} align="center" onChange={(v) => edit(i, { start: v })} anchor={`share-start-${i + 1}`} /> },
            { key: 'stop', header: 'Stop', width: 76, align: 'center', render: (r, i) => <CellText value={r.stop} align="center" onChange={(v) => edit(i, { stop: v })} anchor={`share-stop-${i + 1}`} /> },
            { key: 'user', header: 'User Account', width: 200, render: (r, i) => <CellSelect value={r.user} options={['', ...userNames()]} onChange={(v) => edit(i, { user: v })} anchor={`share-user-${i + 1}`} /> },
            { key: 'note', header: 'Note', width: 300, render: (r, i) => <CellText value={r.note} onChange={(v) => edit(i, { note: v })} anchor={`share-note-${i + 1}`} /> },
          ]}
        />
      </div>
    </div>
  )
}

/* --------------------------------------------------------------------------
   Scheduling ▸ Schedule Access — the part under the Public / Private radios
   ------------------------------------------------------------------------ */

export function ScheduleAccessList({ owner, isPrivate }: { owner: string; isPrivate: boolean }) {
  const [orgRoles] = useStoredList<ClinicRow>(clinicRowsKey('ad-org-role-list'), clinicListSpec('ad-org-role-list')?.rows ?? EMPTY)
  const [orgs] = useStoredList<ClinicRow>(clinicRowsKey('ad-org-list'), clinicListSpec('ad-org-list')?.rows ?? EMPTY)
  const [rows, update] = useStoredList<ClinicRow>(accessKey(owner), [{ who: owner, access: 'Allow', start: '', stop: '', membersOf: true }])
  const [cur, setCur] = useState(0)
  const who = ['', ...userNames(), ...orgRoles.map((r) => S(r.name)), ...orgs.map((r) => S(r.name))].filter((x, i, a) => a.indexOf(x) === i)
  const edit = (i: number, patch: ClinicRow) => update((all) => all.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  useScreenReport({ scheduleAccess: isPrivate ? 'private' : 'public', scheduleAccessRows: isPrivate ? rows.length : 0 })
  const heading = <div style={{ color: '#000080', fontWeight: 700, padding: '4px 0 2px' }}>Who has access to this schedule</div>
  if (!isPrivate) return <>{heading}<div>All users with access to the scheduling module</div></>
  return (
    <>
      {heading}
      <div style={{ paddingBottom: 3 }}>Members of this org/org role, users listed below, and all members of the org roles / organizations list below</div>
      <div style={{ flex: '1 1 auto', minHeight: 120, display: 'flex', flexDirection: 'column', border: '1px solid #8a8a8a', background: '#fff' }}>
        {/* the capture parks Add in the grid's header row; a band carries it here */}
        <ButtonBand caption="" scope="schedule-access" buttons={[
          { label: 'Add', w: 60, onPress: () => { update((all) => [...all, { who: '', access: 'Allow', start: MOIS_TODAY, stop: '' }]); setCur(rows.length) } },
          { label: 'Remove', w: 60, onPress: () => { if (cur > 0) { update((all) => all.filter((_, j) => j !== cur)); setCur(0) } } },
        ]} />
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
          <PBDataWindow<ClinicRow>
            rows={rows}
            current={Math.min(cur, Math.max(0, rows.length - 1))}
            onCurrentChange={setCur}
            empty=" "
            rowTutorialId={(_r, i) => `host.mois.row.access-${i + 1}`}
            columns={[
              { key: 'who', header: 'User / Role', width: 230, render: (r, i) => (i === 0 && r.membersOf ? S(r.who) : <CellSelect value={r.who} options={who} onChange={(v) => edit(i, { who: v })} anchor={`access-who-${i + 1}`} />) },
              { key: 'access', header: 'Access', width: 90, render: (r, i) => <CellSelect value={r.access} options={['Allow', 'Deny']} onChange={(v) => edit(i, { access: v })} anchor={`access-access-${i + 1}`} /> },
              { key: 'start', header: 'Start', width: 76, align: 'center', render: (r, i) => <CellText value={r.start} align="center" onChange={(v) => edit(i, { start: v })} anchor={`access-start-${i + 1}`} /> },
              { key: 'stop', header: 'Stop', width: 76, align: 'center', render: (r, i) => <CellText value={r.stop} align="center" onChange={(v) => edit(i, { stop: v })} anchor={`access-stop-${i + 1}`} /> },
              { key: 'membersOf', header: '', width: 110, render: (r) => (r.membersOf ? <span style={{ color: '#808080' }}>Members of</span> : '') },
            ]}
          />
        </div>
      </div>
    </>
  )
}
