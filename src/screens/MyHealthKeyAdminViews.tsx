import { useState } from 'react'
import {
  MHK_ACTIVITY, MHK_ACTIVITY_KEY, MHK_COMMUNICATION, MHK_LOCATION_REGISTERED, MHK_LOCATIONS, MHK_LOCATIONS_KEY,
  MHK_PATIENTS, MHK_PATIENTS_KEY, MHK_PROVIDER_LOG, MHK_PROVIDERS, MHK_PROVIDERS_KEY, MHK_SETTINGS,
  daysFromToday, type MhkActivity, type MhkPatient, type MhkProvider,
} from '../data/myhealthkey'
import { MOIS_TODAY } from '../data/patients'
import { useScreenReport } from '../host/screen-state'
import { useSessionState } from '../host/screen-windows'
import {
  PBCheckbox, PBCommandRow, PBDataWindow, PBGroup, PBInput, PBLookup, PBSelect, PBTabs, PBViewHeader, pbSlug,
} from '../pb'
import { DetailWindow, TopMessage } from './AdminExchangeKit'
import { GreenBand, Lbl } from './ExchangeKit'
import { registerFolderView, type FolderViewProps } from './folderViewRegistry'

/* ============================================================================
   Administration ▸ myhealthkey (BETA) — 2280708 "myhealthkey Administration".
   Data and per-image provenance: data/myhealthkey.ts.

   PROVENANCE (windows)
   · Settings — no capture; the article: "These settings are controlled by
     Bright Health … Please do not change anything in this folder". INFERRED
     as a read-only name / value list with Close.
   · myhealthkey Providers — `9a293216…`: Save, Refresh, Check All, Register
     All, Close; grid Registered / Online Booking / Name / Pract. No / Type /
     Active. Under it two tabs (`7197ad58…`, `548fadf5…`): Service Locations
     ("Online Booking Service Locations for <provider>": Turned On / Service
     Location, the default bold at the top) and Activity Log ("Recent
     Activity for <provider>": Date / Time, Direction, Status, Subject,
     Comment, "…"). An edited row goes salmon until Save (`7a9867ae…`).
     Check All "level sets everything with the providers and locations" —
     here it re-syncs and says so.
   · myhealthkey Service Locations — `8ea2dade…`, `b8176aab…`: the same
     commands; Registered / Service Location; tabs Providers ("Online
     Booking Providers for <location>": Turned On / Name / Pract. No / Type /
     Active) and Activity Log.
   · myhealthkey Patients — `7b3e2878…`, `adfdd6e2…`: Refresh, Open Chart,
     Edit Chart, Close; "Patient Demographics" (Patient Status A with "…",
     Last Name starts with, Aged between 16 and 120) and "Other Criteria"
     (Registration ALLOW / INVITED / NOT ALLOW or cleared, Provider, Last
     Contact, Limit 200, and — only while Registration is cleared — Show
     ineligible). Grid Chart / First Name / Last Name / Age / Gender / PHN /
     Email / Phone / Provider / Status / Current mhk Consent / From / To /
     Expired / Created; ineligible rows grey with the missing cells pink.
     "Patient Clean Up" is this folder with Registration cleared.
   · myhealthkey Registration Activity — `f45df277…`: Refresh, Bulk Invite,
     Open Chart, Close; a green band with four filter boxes and "Last
     updated between"; grid Chart / Last Name / First Name / Registration /
     Valid From / Valid To / Reason / Created By / Updated By / Last Updated.
   · Send myhealthkey Invites (Bulk Invite) — `6f1dc5e5…`, `91dc6d33…`:
     Refresh, Invite All, Close; Patient Demographics as above; Other
     Criteria Provider, Last Contact, Last Invited [n] or more days ago,
     Limit 200; grid Chart / First Name / Last Name / Age / Gender / PHN /
     Provider / Status. It lists only eligible patients who are not invited
     (or whose invite expired and is older than Last Invited). Invite All
     sends the invites and adds INVITED rows to Registration Activity; the
     confirmation message is INFERRED.
   · myhealthkey Communication History — `e3b212f6…`: Refresh, Close; Date
     Range (optional) … (inclusive), Direction, Status, Subject Contains,
     Comment Contains; tabs User Events / System Events; grid Date / Time,
     Direction, Status, Subject, Comment.

   Open Chart opens the Patient Chart's myhealthkey folder; Edit Chart its
   Demographics — both through the frame's node switch.

   Reported: `host.screen.rows`, `host.screen.row`, `host.screen.saved`,
   `host.screen.filter` (registration), `host.screen.invited` (bulk count),
   `host.dialog` (bulk-invite).
   ========================================================================= */

const salmon = '#f3b9a4'
const Close = (close: () => void) => ({ label: 'Close', onClick: close })

/* --- Settings --------------------------------------------------------------------- */
function MhkSettingsView({ close }: FolderViewProps) {
  return (
    <>
      <PBViewHeader title="myhealthkey Settings" />
      <PBCommandRow commands={[{ label: 'Save', disabled: true }, { label: 'Refresh' }, Close(close)]} />
      <div style={{ padding: '4px 8px', background: '#fff6d8', borderBottom: '1px solid #c8b870', flex: 'none' }}>
        These settings are controlled by Bright Health and connect MOIS to myhealthkey. Please do not change anything in this folder.
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        <PBDataWindow rows={MHK_SETTINGS} rowTutorialId={(r) => `host.mois.row.mhk-setting-${pbSlug(r.name)}`}
          columns={[{ key: 'name', header: 'Setting', width: 260 }, { key: 'value', header: 'Value', width: 400, render: (r) => <span style={{ color: '#808080' }}>{r.value}</span> }]} />
      </div>
    </>
  )
}

/* --- Providers ----------------------------------------------------------------------- */
function MhkProvidersView({ close }: FolderViewProps) {
  const [saved, setSaved] = useSessionState<MhkProvider[]>(MHK_PROVIDERS_KEY, MHK_PROVIDERS)
  const [rows, setRows] = useState(saved)
  const [cur, setCur] = useState(0)
  const [tab, setTab] = useState('Service Locations')
  const [synced, setSynced] = useState(false)
  const row = rows[cur]
  const dirty = (i: number) => JSON.stringify(rows[i]) !== JSON.stringify(saved[i])
  const set = (i: number, patch: Partial<MhkProvider>) => setRows((all) => all.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  useScreenReport({ rows: rows.length, row: row ? pbSlug(row.name) : null, saved: rows.every((_, i) => !dirty(i)) })
  return (
    <>
      <PBViewHeader title="myhealthkey Providers" />
      <PBCommandRow commands={[
        { label: 'Save', onClick: () => setSaved(rows) },
        { label: 'Refresh', onClick: () => setRows(saved) },
        { label: 'Check All', onClick: () => setSynced(true) },
        { label: 'Register All', onClick: () => setRows((all) => all.map((r) => ({ ...r, registered: true }))) },
        Close(close),
      ]} />
      <div style={{ flex: '1 1 55%', minHeight: 0, display: 'flex' }}>
        <PBDataWindow
          rows={rows} current={cur} onCurrentChange={setCur}
          rowFill={(_, i) => (dirty(i) ? salmon : undefined)}
          rowTutorialId={(r) => `host.mois.row.mhk-provider-${pbSlug(r.name)}`}
          columns={[
            { key: 'registered', header: 'Registered', width: 80, align: 'center', render: (r, i) => <PBCheckbox checked={r.registered} onChange={(v) => set(i, { registered: v, booking: v && r.booking })} tutorialId={`host.mois.cell.mhk-registered-${pbSlug(r.name)}`} /> },
            { key: 'booking', header: 'Online Booking', width: 100, align: 'center', render: (r, i) => <PBCheckbox checked={r.booking} disabled={!r.registered} onChange={(v) => set(i, { booking: v })} tutorialId={`host.mois.cell.mhk-booking-${pbSlug(r.name)}`} /> },
            { key: 'name', header: 'Name', width: 280 },
            { key: 'pract', header: 'Pract. No', width: 90 },
            { key: 'type', header: 'Type', width: 100, align: 'center' },
            { key: 'active', header: 'Active', width: 50, align: 'center' },
          ]} />
      </div>
      <div style={{ flex: '1 1 45%', minHeight: 0, display: 'flex', flexDirection: 'column', padding: 3 }}>
        <PBTabs tabs={['Service Locations', 'Activity Log']} active={tab} onChange={setTab} compact>
          {tab === 'Service Locations' ? (
            <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}>
              <div style={{ fontWeight: 700, padding: '2px 6px', background: 'var(--pb-face)' }}>Online Booking Service Locations for {row?.name}</div>
              <div style={{ flex: '1 1 auto', display: 'flex', minHeight: 0 }}>
                <PBDataWindow rows={MHK_LOCATIONS.map((name) => ({ name }))}
                  rowTutorialId={(l) => `host.mois.row.mhk-provider-location-${pbSlug(l.name)}`}
                  columns={[
                    { key: 'on', header: 'Turned On', width: 80, align: 'center', render: (l) => <PBCheckbox checked={!!row?.locations.includes(l.name)} disabled={!row?.booking} tutorialId={`host.mois.cell.mhk-location-on-${pbSlug(l.name)}`}
                      onChange={(v) => row && set(cur, { locations: v ? [...row.locations, l.name] : row.locations.filter((x) => x !== l.name) })} /> },
                    { key: 'name', header: 'Service Location', width: 360, render: (l) => <span style={{ fontWeight: l.name.includes('(default)') ? 700 : 400, color: row?.locations.includes(l.name) ? undefined : '#909090' }}>{l.name}</span> },
                  ]} />
              </div>
            </div>
          ) : <ActivityLog title={`Recent Activity for ${row?.name ?? ''}`} />}
        </PBTabs>
      </div>
      {synced && (
        <TopMessage id="mhk-check-all" title="myhealthkey" buttons={['OK']} prefix="mhk-check-all-" onClose={() => setSynced(false)}>
          Providers and locations have been synchronized with myhealthkey.
        </TopMessage>
      )}
    </>
  )
}

function ActivityLog({ title }: { title: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}>
      <div style={{ fontWeight: 700, padding: '2px 6px', background: 'var(--pb-face)' }}>{title}</div>
      <div style={{ flex: '1 1 auto', display: 'flex', minHeight: 0 }}>
        <PBDataWindow rows={MHK_PROVIDER_LOG} columns={[
          { key: 'when', header: 'Date / Time', width: 130 }, { key: 'direction', header: 'Direction', width: 90 },
          { key: 'status', header: 'Status', width: 80 }, { key: 'subject', header: 'Subject', width: 130 },
          { key: 'comment', header: 'Comment', width: 360 }, { key: 'more', header: '', width: 20, render: () => '…' },
        ]} />
      </div>
    </div>
  )
}

/* --- Locations ---------------------------------------------------------------------- */
function MhkLocationsView({ close }: FolderViewProps) {
  const [saved, setSaved] = useSessionState<string[]>(MHK_LOCATIONS_KEY, MHK_LOCATION_REGISTERED)
  const [registered, setRegistered] = useState(saved)
  const [providers] = useSessionState<MhkProvider[]>(MHK_PROVIDERS_KEY, MHK_PROVIDERS)
  const [cur, setCur] = useState(0)
  const [tab, setTab] = useState('Providers')
  const location = MHK_LOCATIONS[cur]!
  useScreenReport({ rows: MHK_LOCATIONS.length, row: pbSlug(location), saved: JSON.stringify(registered) === JSON.stringify(saved) })
  return (
    <>
      <PBViewHeader title="myhealthkey Service Locations" />
      <PBCommandRow commands={[
        { label: 'Save', onClick: () => setSaved(registered) },
        { label: 'Refresh', onClick: () => setRegistered(saved) },
        { label: 'Check All' },
        { label: 'Register All', onClick: () => setRegistered([...MHK_LOCATIONS]) },
        Close(close),
      ]} />
      <div style={{ flex: '1 1 45%', minHeight: 0, display: 'flex' }}>
        <PBDataWindow rows={MHK_LOCATIONS.map((name) => ({ name }))} current={cur} onCurrentChange={setCur}
          rowFill={(l) => (registered.includes(l.name) !== saved.includes(l.name) ? salmon : undefined)}
          rowTutorialId={(l) => `host.mois.row.mhk-location-${pbSlug(l.name)}`}
          columns={[
            { key: 'reg', header: 'Registered', width: 80, align: 'center', render: (l) => <PBCheckbox checked={registered.includes(l.name)} tutorialId={`host.mois.cell.mhk-location-registered-${pbSlug(l.name)}`}
              onChange={(v) => setRegistered((r) => (v ? [...r, l.name] : r.filter((x) => x !== l.name)))} /> },
            { key: 'name', header: 'Service Location', width: 400, render: (l) => <span style={{ fontWeight: l.name.includes('(default)') ? 700 : 400, color: registered.includes(l.name) ? undefined : '#909090' }}>{l.name}</span> },
          ]} />
      </div>
      <div style={{ flex: '1 1 55%', minHeight: 0, display: 'flex', flexDirection: 'column', padding: 3 }}>
        <PBTabs tabs={['Providers', 'Activity Log']} active={tab} onChange={setTab} compact>
          {tab === 'Providers' ? (
            <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}>
              <div style={{ fontWeight: 700, padding: '2px 6px', background: 'var(--pb-face)' }}>Online Booking Providers for {location}</div>
              <div style={{ flex: '1 1 auto', display: 'flex', minHeight: 0 }}>
                <PBDataWindow rows={providers.filter((p) => p.type === 'PROVIDER')}
                  rowTutorialId={(p) => `host.mois.row.mhk-location-provider-${pbSlug(p.name)}`}
                  columns={[
                    { key: 'on', header: 'Turned On', width: 80, align: 'center', render: (p) => <PBCheckbox checked={p.locations.includes(location)} /> },
                    { key: 'name', header: 'Name', width: 260 }, { key: 'pract', header: 'Pract. No', width: 90 },
                    { key: 'type', header: 'Type', width: 90, align: 'center' }, { key: 'active', header: 'Active', width: 50, align: 'center' },
                  ]} />
              </div>
            </div>
          ) : <ActivityLog title={`Recent Activity for ${location}`} />}
        </PBTabs>
      </div>
    </>
  )
}

/* --- the Patient Demographics / Other Criteria block ------------------------------------------ */
type Criteria = { status: string; lastName: string; ageFrom: string; ageTo: string; registration: string; provider: string; lastContact: string; lastInvited: string; limit: string; ineligible: boolean }
const CRITERIA: Criteria = { status: 'A', lastName: '', ageFrom: '16', ageTo: '120', registration: 'ALLOW', provider: '', lastContact: '', lastInvited: '', limit: '200', ineligible: false }

function CriteriaBlock({ c, set, mode }: { c: Criteria; set: (p: Partial<Criteria>) => void; mode: 'patients' | 'invite' }) {
  const providers = ['', 'FAM, BOB', 'HALLIWELL, A.', 'MOISCON', 'ROSS, DOUG']
  return (
    <div className="pb-row" style={{ gap: 10, padding: '4px 6px', alignItems: 'stretch', background: 'var(--pb-face)', flex: 'none' }}>
      <PBGroup title="Patient Demographics" style={{ width: 400 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 3, alignItems: 'center' }} data-tutorial-id="host.mois.group.mhk-patient-demographics">
          <span>Patient Status:</span><PBLookup w={200} value={c.status} name="mhk-patient-status" onChange={(v) => set({ status: v })} />
          <span>Last Name starts with:</span><PBInput w={190} value={c.lastName} onChange={(e) => set({ lastName: e.target.value })} data-tutorial-id="host.mois.field.mhk-last-name" />
          <span>Aged between:</span>
          <span className="pb-row" style={{ gap: 4 }}>
            <PBInput w={50} value={c.ageFrom} onChange={(e) => set({ ageFrom: e.target.value })} data-tutorial-id="host.mois.field.mhk-age-from" />
            <span style={{ color: '#0a246a' }}>and</span>
            <PBInput w={50} value={c.ageTo} onChange={(e) => set({ ageTo: e.target.value })} data-tutorial-id="host.mois.field.mhk-age-to" />
          </span>
        </div>
      </PBGroup>
      <PBGroup title="Other Criteria" style={{ width: 400 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 3, alignItems: 'center' }} data-tutorial-id="host.mois.group.mhk-other-criteria">
          {mode === 'patients' && (<>
            <span>Registration:</span>
            <PBSelect w={200} options={['', 'ALLOW', 'INVITED', 'NOT ALLOW']} value={c.registration} onChange={(e) => set({ registration: e.target.value })} data-tutorial-id="host.mois.field.mhk-registration" />
          </>)}
          <span>Provider:</span><PBSelect w={200} options={providers} value={c.provider} onChange={(e) => set({ provider: e.target.value })} data-tutorial-id="host.mois.field.mhk-provider" />
          <span>Last Contact:</span><PBSelect w={100} options={['', '1 year', '2 years', '3 years']} value={c.lastContact} onChange={(e) => set({ lastContact: e.target.value })} />
          {mode === 'invite' && (<>
            <span>Last Invited:</span>
            <span className="pb-row" style={{ gap: 4 }}><PBInput w={50} value={c.lastInvited} onChange={(e) => set({ lastInvited: e.target.value })} data-tutorial-id="host.mois.field.mhk-last-invited" /> or more days ago</span>
          </>)}
          <span>Limit:</span>
          <span className="pb-row" style={{ gap: 20 }}>
            <PBInput w={50} value={c.limit} onChange={(e) => set({ limit: e.target.value })} data-tutorial-id="host.mois.field.mhk-limit" />
            {mode === 'patients' && !c.registration && (
              <PBCheckbox label="Show ineligible:" checked={c.ineligible} onChange={(v) => set({ ineligible: v })} tutorialId="host.mois.field.mhk-show-ineligible" />
            )}
          </span>
        </div>
      </PBGroup>
    </div>
  )
}

const matches = (p: MhkPatient, c: Criteria) =>
  (!c.status || p.status === c.status)
  && (!c.lastName || p.last.toLowerCase().startsWith(c.lastName.toLowerCase()))
  && p.age >= (Number(c.ageFrom) || 0) && p.age <= (Number(c.ageTo) || 999)
  && (!c.provider || p.provider === c.provider)

/* --- Patients -------------------------------------------------------------------------- */
function MhkPatientsView({ close, openNode }: FolderViewProps) {
  const [patients] = useSessionState<MhkPatient[]>(MHK_PATIENTS_KEY, MHK_PATIENTS)
  const [c, setC] = useState<Criteria>(CRITERIA)
  const [applied, setApplied] = useState<Criteria>(CRITERIA)
  const [cur, setCur] = useState(0)
  const rows = patients
    .filter((p) => matches(p, applied))
    .filter((p) => (applied.registration
      ? p.consent === applied.registration && !(applied.registration === 'INVITED' && p.expired)
      /* cleared: not invited, or invite expired; ineligible (missing demographics) only when asked */
      : (p.consent === '' || (p.consent === 'INVITED' && p.expired)) && (applied.ineligible || !p.missing?.length)))
    .sort((a, b) => Number(!!a.missing?.length) - Number(!!b.missing?.length))
    .slice(0, Number(applied.limit) || 200)
  const row = rows[cur]
  useScreenReport({ rows: rows.length, filter: applied.registration ? pbSlug(applied.registration) : 'cleared', row: row?.chart ?? null })
  const pink = (p: MhkPatient, key: 'phn' | 'email' | 'gender' | 'age', text: string) =>
    p.missing?.includes(key) ? <span style={{ display: 'block', background: 'linear-gradient(90deg, #f7a0aa, #fff0f0)', margin: '0 -2px', padding: '0 2px' }}>{text || ' '}</span> : text
  return (
    <>
      <PBViewHeader title="myhealthkey Patients" />
      <PBCommandRow commands={[
        { label: 'Refresh', onClick: () => { setApplied(c); setCur(0) } },
        { label: 'Open Chart', onClick: () => { if (row) openNode('mhk') } },
        { label: 'Edit Chart', onClick: () => { if (row) openNode('demographic') } },
        Close(close),
      ]} />
      <CriteriaBlock c={c} set={(p) => setC((x) => ({ ...x, ...p }))} mode="patients" />
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        <PBDataWindow rows={rows} current={cur} onCurrentChange={setCur} gutter={false}
          rowTutorialId={(p) => `host.mois.row.mhk-patient-${p.chart}`}
          rowClassName={(p) => (p.missing?.length ? 'pb-dw--struck' : undefined)}
          columns={[
            { key: 'chart', header: 'Chart', width: 56 }, { key: 'first', header: 'First Name', width: 100 }, { key: 'last', header: 'Last Name', width: 100 },
            { key: 'age', header: 'Age', width: 36 }, { key: 'gender', header: 'Gender', width: 60, render: (p) => pink(p, 'gender', p.gender) },
            { key: 'phn', header: 'PHN', width: 90, render: (p) => pink(p, 'phn', p.phn) },
            { key: 'email', header: 'Email', width: 170, render: (p) => pink(p, 'email', p.email) },
            { key: 'phone', header: 'Phone', width: 100 }, { key: 'provider', header: 'Provider', width: 100 },
            { key: 'status', header: 'Status', width: 44, align: 'center' }, { key: 'consent', header: 'Current mhk Consent', width: 130 },
            { key: 'from', header: 'From', width: 80 }, { key: 'to', header: 'To', width: 80 },
            { key: 'expired', header: 'Expired', width: 54, align: 'center', render: (p) => <PBCheckbox checked={p.expired} /> },
            { key: 'created', header: 'Created', width: 130 },
          ]}
          empty="No patients match the criteria." />
      </div>
    </>
  )
}

/* --- Registration Activity + Bulk Invite ---------------------------------------------- */
function MhkRegistrationView({ close, openNode }: FolderViewProps) {
  const [activity, setActivity] = useSessionState<MhkActivity[]>(MHK_ACTIVITY_KEY, MHK_ACTIVITY)
  const [from, setFrom] = useState('2021.08.01')
  const [to, setTo] = useState(MOIS_TODAY)
  const [cur, setCur] = useState(0)
  const [bulk, setBulk] = useState(false)
  const rows = activity.filter((a) => a.updated.slice(0, 10).replace(/-/g, '.') >= from && a.updated.slice(0, 10).replace(/-/g, '.') <= to)
  const row = rows[cur]
  useScreenReport({ rows: rows.length, row: row?.chart ?? null })
  return (
    <>
      <PBViewHeader title="myhealthkey Registration Activity" />
      <PBCommandRow commands={[
        { label: 'Refresh', onClick: () => setCur(0) },
        { label: 'Bulk Invite', onClick: () => setBulk(true) },
        { label: 'Open Chart', onClick: () => { if (row) openNode('mhk') } },
        Close(close),
      ]} />
      <GreenBand anchor="host.mois.group.mhk-activity-filter">
        <PBInput w={90} /><PBInput w={110} /><PBInput w={110} /><PBSelect w={110} options={['', 'ALLOW', 'INVITED', 'NOT ALLOW']} />
        <span className="pb-row__spacer" />
        <Lbl>Last updated between:</Lbl>
        <PBInput w={90} value={from} onChange={(e) => setFrom(e.target.value)} data-tutorial-id="host.mois.field.mhk-updated-from" />
        <PBInput w={90} value={to} onChange={(e) => setTo(e.target.value)} data-tutorial-id="host.mois.field.mhk-updated-to" />
      </GreenBand>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        <PBDataWindow rows={rows} current={cur} onCurrentChange={setCur}
          rowTutorialId={(a, i) => `host.mois.row.mhk-activity-${a.chart}-${i}`}
          columns={[
            { key: 'chart', header: 'Chart', width: 56 }, { key: 'last', header: 'Last Name', width: 100 }, { key: 'first', header: 'First Name', width: 100 },
            { key: 'registration', header: 'Registration', width: 100 }, { key: 'validFrom', header: 'Valid From', width: 80 }, { key: 'validTo', header: 'Valid To', width: 80 },
            { key: 'reason', header: 'Reason', width: 330 }, { key: 'createdBy', header: 'Created By', width: 110 },
            { key: 'updatedBy', header: 'Updated By', width: 110 }, { key: 'updated', header: 'Last Updated', width: 130 },
          ]} />
      </div>
      {bulk && <BulkInviteWindow onClose={() => setBulk(false)} onInvited={(added) => setActivity((all) => [...added, ...all])} />}
    </>
  )
}

function BulkInviteWindow({ onClose, onInvited }: { onClose: () => void; onInvited: (rows: MhkActivity[]) => void }) {
  const [patients, setPatients] = useSessionState<MhkPatient[]>(MHK_PATIENTS_KEY, MHK_PATIENTS)
  const [c, setC] = useState<Criteria>({ ...CRITERIA, registration: '' })
  const [applied, setApplied] = useState<Criteria>({ ...CRITERIA, registration: '' })
  const [cur, setCur] = useState(0)
  const [sent, setSent] = useState<number | null>(null)
  const rows = patients
    .filter((p) => matches(p, applied) && !p.missing?.length)
    .filter((p) => p.consent === '' || (p.consent === 'INVITED' && p.expired && (p.lastInvited ?? 0) >= (Number(applied.lastInvited) || 30)))
    .slice(0, Number(applied.limit) || 200)
  useScreenReport({ rows: rows.length, invited: sent })
  const inviteAll = () => {
    const created = `${MOIS_TODAY.replace(/\./g, '-')} 10:00:00`
    const charts = new Set(rows.map((r) => r.chart))
    setPatients((all) => all.map((p) => (charts.has(p.chart)
      ? { ...p, consent: 'INVITED', from: MOIS_TODAY.replace(/\./g, '-'), to: daysFromToday(30).replace(/\./g, '-'), expired: false, created, lastInvited: 0 }
      : p)))
    onInvited(rows.map((r) => ({
      chart: r.chart, last: r.last, first: r.first, registration: 'INVITED', validFrom: MOIS_TODAY.replace(/\./g, '-'),
      validTo: daysFromToday(30).replace(/\./g, '-'), reason: 'Patient Registration', createdBy: 'ADMINISTRATOR', updatedBy: '', updated: created,
    })))
    setSent(rows.length)
  }
  return (
    <DetailWindow id="bulk-invite" title="Send myhealthkey Invites" width={900} height={560} onClose={onClose}>
      <PBCommandRow commands={[
        { label: 'Refresh', onClick: () => { setApplied(c); setCur(0) } },
        { label: 'Invite All', onClick: inviteAll, disabled: !rows.length },
        { label: 'Close', onClick: onClose },
      ]} />
      <CriteriaBlock c={c} set={(p) => setC((x) => ({ ...x, ...p }))} mode="invite" />
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        <PBDataWindow rows={rows} current={cur} onCurrentChange={setCur}
          rowTutorialId={(p) => `host.mois.row.mhk-invite-${p.chart}`}
          columns={[
            { key: 'chart', header: 'Chart', width: 60 }, { key: 'first', header: 'First Name', width: 110 }, { key: 'last', header: 'Last Name', width: 110 },
            { key: 'age', header: 'Age', width: 40 }, { key: 'gender', header: 'Gender', width: 60 }, { key: 'phn', header: 'PHN', width: 90 },
            { key: 'provider', header: 'Provider', width: 120 }, { key: 'status', header: 'Status', width: 50, align: 'center' },
          ]}
          empty="No eligible patients match the criteria." />
      </div>
      {sent !== null && (
        <TopMessage id="bulk-invite-sent" title="Send myhealthkey Invites" buttons={['OK']} prefix="bulk-invite-" onClose={() => { setSent(null); setApplied({ ...applied }) }}>
          {`${sent} invitation${sent === 1 ? ' has' : 's have'} been sent.`}
        </TopMessage>
      )}
    </DetailWindow>
  )
}

/* --- Communication History ----------------------------------------------------------------- */
function MhkCommunicationView({ close }: FolderViewProps) {
  const [tab, setTab] = useState('User Events')
  const [direction, setDirection] = useState('')
  const [status, setStatus] = useState('')
  const [subject, setSubject] = useState('')
  const rows = (tab === 'User Events' ? MHK_COMMUNICATION.user : MHK_COMMUNICATION.system)
    .filter((r) => (!direction || r.direction === direction) && (!status || r.status === status) && (!subject || r.subject.toLowerCase().includes(subject.toLowerCase())))
  useScreenReport({ rows: rows.length })
  return (
    <>
      <PBViewHeader title="myhealthkey Communication History" />
      <PBCommandRow commands={[{ label: 'Refresh' }, Close(close)]} />
      <GreenBand anchor="host.mois.group.mhk-communication-filter" style={{ display: 'grid', gridTemplateColumns: 'auto auto auto auto auto auto auto', gap: '3px 8px', justifyContent: 'start', alignItems: 'center' }}>
        <Lbl>Date Range:</Lbl><PBInput w={80} defaultValue={daysFromToday(-7)} /><span />
        <Lbl>Direction:</Lbl><PBSelect w={110} options={['', 'SENT', 'RECEIVED']} value={direction} onChange={(e) => setDirection(e.target.value)} data-tutorial-id="host.mois.field.mhk-direction" />
        <Lbl>Subject Contains:</Lbl><PBInput w={180} value={subject} onChange={(e) => setSubject(e.target.value)} data-tutorial-id="host.mois.field.mhk-subject" />
        <Lbl>(optional)</Lbl><PBInput w={80} defaultValue={MOIS_TODAY} /><span>(inclusive)</span>
        <Lbl>Status:</Lbl><PBSelect w={110} options={['', 'DONE', 'ERROR']} value={status} onChange={(e) => setStatus(e.target.value)} data-tutorial-id="host.mois.field.mhk-status" />
        <Lbl>Comment Contains:</Lbl><PBInput w={180} />
      </GreenBand>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', padding: 3 }}>
        <PBTabs tabs={['User Events', 'System Events']} active={tab} onChange={setTab} compact>
          <div style={{ flex: '1 1 auto', display: 'flex', minHeight: 0 }}>
            <PBDataWindow rows={rows} rowTutorialId={(r) => `host.mois.row.mhk-event-${pbSlug(r.when)}`}
              columns={[
                { key: 'when', header: 'Date / Time', width: 130 }, { key: 'direction', header: 'Direction', width: 90 },
                { key: 'status', header: 'Status', width: 80 }, { key: 'subject', header: 'Subject', width: 150 }, { key: 'comment', header: 'Comment', width: 420 },
              ]} />
          </div>
        </PBTabs>
      </div>
    </>
  )
}

registerFolderView(['ad-mhk-settings'], MhkSettingsView)
registerFolderView(['ad-mhk-providers'], MhkProvidersView)
registerFolderView(['ad-mhk-locations'], MhkLocationsView)
registerFolderView(['ad-mhk-patients'], MhkPatientsView)
registerFolderView(['ad-mhk-registration'], MhkRegistrationView)
registerFolderView(['ad-mhk-communication'], MhkCommunicationView)
