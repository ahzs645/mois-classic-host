import { useState } from 'react'
import {
  ACTIVITY_SEED, ALIAS_OWNERS, ALIAS_ROWS, ALIAS_ROWS_KEY, ALIAS_SOURCES, LAB_ACTIVITY_KEY, REASSIGN_TARGETS,
  ROUTING, ROUTING_CONNECTIONS, ROUTING_INBOXES, ROUTING_KEY, UNMATCHED_ITEMS, UNMATCHED_ITEMS_KEY,
  type ActivityEntry, type AliasRow, type RoutingConfig, type UnmatchedItem,
} from '../data/unmatched'
import { MOIS_TODAY } from '../data/patients'
import { useScreenReport } from '../host/screen-state'
import { useSessionState } from '../host/screen-windows'
import {
  PBCheckbox, PBCommandRow, PBDataWindow, PBGroup, PBInput, PBRadio, PBSelect, PBTextArea, PBViewHeader, pbSlug,
} from '../pb'
import { Btn, DetailWindow, FieldLabel, TopMessage, stampNow } from './AdminExchangeKit'
import { GreenBand, Lbl } from './ExchangeKit'
import { registerFolderView, type FolderViewProps } from './folderViewRegistry'
import { WorkspaceBanner } from './WorkspaceBanner'

/* ============================================================================
   Unmatched inbound results — the MOIS 2.31.41 enhancements of 303492
   "Match Unmatched Labs". Data and provenance: data/unmatched.ts.

   What is here, and where it shows:
   · Activity record — `e9610920…`: "Activity  n records", newest first,
     "<Action> on yyyy.mm.dd hh:mm / by: <user> / <reason or To:>". Drawn by
     `LabActivityPanel` in Patient Lab Detail (InterfaceExchangeViews.tsx),
     where "all action buttons have moved up in the window, in line with
     the 'Lab Message List' heading" — `LabActionButtons`: Print, Ignore,
     Fax, Reassign, Save as PDF (`3c17c435…` — its option list is not
     legible; one Save as PDF button stands for it). Print / Ignore / Fax
     ask for a reason (the log keeps "Date, time, user, reason"); the
     Reason prompt is INFERRED. Reassign — "Manual Reassign can be to
     another User or Org Role … Only one 'assigned' user … Reassignment is
     logged" — opens Reassign Responsibility (INFERRED layout).
   · User Alias Review — `5f32d5f5…`: Refresh, New, Edit, Delete, Print,
     Close Window; "User Parameter" (Name; Status Exclude Inactive / Include
     Inactive / Only Inactive) and "Alias Parameter" (Source, Value, Include
     inactive alias records); grid User / Active / Expiry / Alias Code /
     Alias Value / Start / Stop. New / Edit follow the article's steps
     (select a User, Provider, Org, or Org Role; Source; Value; start / end
     date; Note; Save) — that window has no capture and is INFERRED. Delete
     asks first. Print opens the frame's print preview if registered.
   · Unmatched Items — Workspace ▸ Basket ▸ Unmatched Items: the article's
     filters (Date range; Status, default UNMATCHED; Patient name) over an
     INFERRED grid; Open Detail and Reassign act on the current row.
   · Routing — Setup / Registration's two new panes (drawn in
     InterfaceExchangeViews.tsx from `RoutingPanes` here): `59647e5a…` and
     `95dab64d…`.
   · User-specific delegation — User Account ▸ Workspace Settings ▸
     Unmatched Results Inbox (screens/UserAccountWindow.tsx).

   Reported: `host.screen.rows`, `host.screen.row`, `host.screen.activity`
   (records in the open result's log), `host.screen.assigned`,
   `host.screen.filter`, `host.screen.saved`, `host.dialog`.
   ========================================================================= */

const USER = 'administrator'

/* --- the activity log ------------------------------------------------------------ */
export function useLabActivity(resultKey: string) {
  const [all, setAll] = useSessionState<Record<string, ActivityEntry[]>>(LAB_ACTIVITY_KEY, {})
  const entries = all[resultKey] ?? (resultKey.endsWith(':0') ? ACTIVITY_SEED : [])
  const add = (e: Omit<ActivityEntry, 'when' | 'by'>) =>
    setAll((m) => ({ ...m, [resultKey]: [{ ...e, when: stampNow().replace(/\s+/g, ' '), by: USER }, ...(m[resultKey] ?? (resultKey.endsWith(':0') ? ACTIVITY_SEED : []))] }))
  return { entries, add }
}

export function LabActivityPanel({ resultKey }: { resultKey: string }) {
  const { entries } = useLabActivity(resultKey)
  useScreenReport({ activity: entries.length })
  return (
    <div data-tutorial-id="host.mois.group.activity" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', background: '#fff' }}>
      <div style={{ background: '#e8f0fa', color: '#667', padding: '2px 4px', borderBottom: '1px solid #b8c8e0' }}>Activity&nbsp;&nbsp;{entries.length} records</div>
      <div style={{ flex: '1 1 auto', overflow: 'auto' }}>
        {entries.map((e, i) => (
          <div key={i} style={{ padding: '3px 4px', borderBottom: '1px solid #e0e0e0', whiteSpace: 'normal' }}>
            <div>{e.kind} <span style={{ color: '#888' }}>on</span> {e.when}</div>
            <div><span style={{ color: '#888' }}>by:</span> {e.by}</div>
            {e.text && <div>{e.text}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

/* --- Reassign Responsibility (INFERRED) ------------------------------------------ */
export function ReassignWindow({ current, onAssign, onClose }: { current?: string; onAssign: (to: string, kind: string) => void; onClose: () => void }) {
  const [kind, setKind] = useState<'User' | 'Org Role'>('User')
  const [to, setTo] = useState('')
  return (
    <DetailWindow id="reassign-responsibility" title="Reassign Responsibility" width={420} zIndex={92} onClose={onClose}
      buttons={<>
        <Btn id="reassign-ok" isDefault width={80} disabled={!to} onClick={() => onAssign(to, kind)}>Ok</Btn>
        <Btn id="reassign-cancel" width={80} onClick={onClose}>Cancel</Btn>
      </>}>
      <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div>Currently assigned to: <b>{current || '(system default)'}</b></div>
        <div className="pb-row" style={{ gap: 14 }}>
          <span>Assign to:</span>
          {(['User', 'Org Role'] as const).map((k) => (
            <PBRadio key={k} name="reassign-kind" label={k} checked={kind === k} onChange={() => { setKind(k); setTo('') }} tutorialId={`host.mois.field.reassign-${pbSlug(k)}`} />
          ))}
        </div>
        <PBSelect w="100%" options={['', ...REASSIGN_TARGETS[kind]]} value={to} onChange={(e) => setTo(e.target.value)} data-tutorial-id="host.mois.field.reassign-to" />
        <div style={{ color: '#666', whiteSpace: 'normal' }}>Only one user or org role can be assigned at a time. The reassignment is recorded in the activity log.</div>
      </div>
    </DetailWindow>
  )
}

/* --- the buttons in line with "Lab Message List" -------------------------------------- */
export function LabActionButtons({ resultKey, assigned, onAssigned }: { resultKey: string; assigned?: string; onAssigned?: (to: string) => void }) {
  const { add } = useLabActivity(resultKey)
  const [reason, setReason] = useState<null | 'Print' | 'Ignore' | 'Fax'>(null)
  const [text, setText] = useState('')
  const [reassign, setReassign] = useState(false)
  const [pdf, setPdf] = useState(false)
  const ask = (k: 'Print' | 'Ignore' | 'Fax') => { setText(''); setReason(k) }
  return (
    <span className="pb-row" style={{ gap: 3 }} data-tutorial-id="host.mois.group.lab-actions">
      <Btn id="lab-print" onClick={() => ask('Print')}>Print</Btn>
      <Btn id="lab-ignore" onClick={() => ask('Ignore')}>Ignore</Btn>
      <Btn id="lab-fax" onClick={() => ask('Fax')}>Fax</Btn>
      <Btn id="lab-reassign" onClick={() => setReassign(true)}>Reassign</Btn>
      <Btn id="lab-save-as-pdf" onClick={() => setPdf(true)}>Save as PDF</Btn>
      {reason && (
        <DetailWindow id="lab-action-reason" title={reason} width={380} zIndex={92} onClose={() => setReason(null)}
          buttons={<>
            <Btn id="lab-reason-ok" isDefault width={80} disabled={!text.trim()} onClick={() => { add({ kind: reason, text: text.trim() }); setReason(null) }}>Ok</Btn>
            <Btn id="lab-reason-cancel" width={80} onClick={() => setReason(null)}>Cancel</Btn>
          </>}>
          <div style={{ padding: '8px 12px' }}>
            <div style={{ marginBottom: 4 }}>Please enter a reason:</div>
            <PBTextArea rows={3} value={text} onChange={(e) => setText(e.target.value)} style={{ width: '100%', resize: 'none' }} data-tutorial-id="host.mois.field.lab-action-reason" />
          </div>
        </DetailWindow>
      )}
      {reassign && (
        <ReassignWindow current={assigned} onClose={() => setReassign(false)}
          onAssign={(to) => { add({ kind: 'Assigned', text: `To: ${to}` }); onAssigned?.(to); setReassign(false) }} />
      )}
      {pdf && (
        <TopMessage id="lab-saved-as-pdf" title="Save as PDF" buttons={['OK']} prefix="lab-pdf-" onClose={() => setPdf(false)}>
          The report has been saved as a PDF.
        </TopMessage>
      )}
    </span>
  )
}

/* ===========================================================================
   User Alias Review
   ======================================================================== */
function UserAliasReviewView({ close, open }: FolderViewProps) {
  const [rows, setRows] = useSessionState<AliasRow[]>(ALIAS_ROWS_KEY, ALIAS_ROWS)
  const [name, setName] = useState('')
  const [status, setStatus] = useState<'exclude' | 'include' | 'only'>('exclude')
  const [source, setSource] = useState('')
  const [value, setValue] = useState('')
  const [inactiveAlias, setInactiveAlias] = useState(false)
  const [cur, setCur] = useState(0)
  const [win, setWin] = useState<null | 'new' | 'edit' | 'delete'>(null)
  const inactive = (r: AliasRow) => r.expiry !== '-' && r.expiry < MOIS_TODAY
  const aliasEnded = (r: AliasRow) => r.stop !== '-' && r.stop < MOIS_TODAY
  const shown = rows
    .filter((r) => !name || r.user.toLowerCase().includes(name.toLowerCase()))
    .filter((r) => (status === 'include' ? true : status === 'only' ? inactive(r) : !inactive(r)))
    .filter((r) => (!source || r.code === source) && (!value || r.value.toLowerCase().includes(value.toLowerCase())))
    .filter((r) => inactiveAlias || !aliasEnded(r))
  const row = shown[cur]
  const index = row ? rows.indexOf(row) : -1
  useScreenReport({ rows: shown.length, row: row ? `${pbSlug(row.user)}-${pbSlug(row.code)}` : null })

  return (
    <>
      <PBViewHeader title="User Alias Review" />
      <PBCommandRow commands={[
        { label: 'Refresh', onClick: () => setCur(0) },
        { label: 'New', onClick: () => setWin('new') },
        { label: 'Edit', onClick: () => { if (row) setWin('edit') } },
        { label: 'Delete', onClick: () => { if (row) setWin('delete') } },
        { label: 'Print', onClick: () => { open('print-preview', { title: 'User Alias Review' }) } },
        { label: 'Close Window', onClick: close },
      ]} />
      <div className="pb-row" style={{ gap: 10, padding: 6, alignItems: 'stretch', background: 'var(--pb-face)', flex: 'none' }}>
        <PBGroup title="User Parameter" style={{ flex: '1 1 50%' }}>
          <div data-tutorial-id="host.mois.group.alias-user-parameter">
            <div className="pb-row" style={{ gap: 6 }}><FieldLabel w={50}>Name:</FieldLabel><PBInput w={260} value={name} onChange={(e) => { setName(e.target.value); setCur(0) }} data-tutorial-id="host.mois.field.alias-user-name" /></div>
            <div className="pb-row" style={{ gap: 6, alignItems: 'flex-start' }}>
              <FieldLabel w={50}>Status:</FieldLabel>
              <div>
                {([['exclude', 'Exclude Inactive'], ['include', 'Include Inactive'], ['only', 'Only Inactive']] as const).map(([k, l]) => (
                  <div key={k}><PBRadio name="alias-status" label={l} checked={status === k} onChange={() => { setStatus(k); setCur(0) }} tutorialId={`host.mois.field.alias-status-${k}`} /></div>
                ))}
              </div>
            </div>
          </div>
        </PBGroup>
        <PBGroup title="Alias Parameter" style={{ flex: '1 1 50%' }}>
          <div data-tutorial-id="host.mois.group.alias-parameter">
            <div className="pb-row" style={{ gap: 6 }}><FieldLabel w={50}>Source:</FieldLabel><PBSelect w={120} options={['', ...ALIAS_SOURCES]} value={source} onChange={(e) => { setSource(e.target.value); setCur(0) }} data-tutorial-id="host.mois.field.alias-source-filter" /></div>
            <div className="pb-row" style={{ gap: 6 }}><FieldLabel w={50}>Value:</FieldLabel><PBInput w={220} value={value} onChange={(e) => { setValue(e.target.value); setCur(0) }} data-tutorial-id="host.mois.field.alias-value-filter" /></div>
            <PBCheckbox label="Include inactive alias records" checked={inactiveAlias} onChange={setInactiveAlias} tutorialId="host.mois.field.alias-include-inactive" />
          </div>
        </PBGroup>
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        <PBDataWindow
          rows={shown}
          current={cur}
          onCurrentChange={setCur}
          onActivate={(_, i) => { setCur(i); setWin('edit') }}
          gutter={false}
          rowTutorialId={(r) => `host.mois.row.alias-${pbSlug(r.user)}-${pbSlug(r.code)}`}
          columns={[
            { key: 'user', header: 'User', width: 220 },
            { key: 'active', header: 'Active', width: 80 },
            { key: 'expiry', header: 'Expiry', width: 80 },
            { key: 'code', header: 'Alias Code', width: 110 },
            { key: 'value', header: 'Alias Value', width: 150 },
            { key: 'start', header: 'Start', width: 80 },
            { key: 'stop', header: 'Stop', width: 80 },
          ]}
        />
      </div>
      {(win === 'new' || (win === 'edit' && row)) && (
        <AliasEditor
          row={win === 'edit' ? row : undefined}
          onClose={() => setWin(null)}
          onSave={(next) => {
            setRows((all) => (win === 'edit' ? all.map((r, i) => (i === index ? next : r)) : [...all, next]))
            setWin(null)
          }}
        />
      )}
      {win === 'delete' && row && (
        <TopMessage id="delete-alias" title="Delete" icon="question" buttons={['Yes', 'No']} prefix="delete-alias-"
          onClose={(b) => { if (b === 'Yes') { setRows((all) => all.filter((_, i) => i !== index)); setCur(0) } setWin(null) }}>
          {'Delete this alias record?\nIf the user is being inactivated, use Edit and add an end date instead.'}
        </TopMessage>
      )}
    </>
  )
}

function AliasEditor({ row, onClose, onSave }: { row?: AliasRow; onClose: () => void; onSave: (r: AliasRow) => void }) {
  const [kind, setKind] = useState<AliasRow['kind']>(row?.kind ?? 'User')
  const [owner, setOwner] = useState(row?.user ?? '')
  const [code, setCode] = useState(row?.code ?? '')
  const [value, setValue] = useState(row?.value ?? '')
  const [start, setStart] = useState(row && row.start !== '-' ? row.start : MOIS_TODAY)
  const [stop, setStop] = useState(row && row.stop !== '-' ? row.stop : '')
  const [note, setNote] = useState(row?.note ?? '')
  const ok = owner && code && value.trim()
  return (
    <DetailWindow id={row ? 'edit-user-alias' : 'new-user-alias'} title={row ? 'Edit User Alias' : 'New User Alias'} width={460} onClose={onClose}
      buttons={<>
        <Btn id="alias-save" isDefault width={90} disabled={!ok} onClick={() => onSave({
          user: owner, kind, active: row?.active ?? MOIS_TODAY, expiry: stop || '-', code, value: value.trim(),
          start: start || '-', stop: stop || '-', note,
        })}>Save (F2)</Btn>
        <Btn id="alias-cancel" width={80} onClick={onClose}>Cancel</Btn>
      </>}>
      <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 5, padding: '8px 12px', alignItems: 'center' }}>
        <FieldLabel>Assign to:</FieldLabel>
        <span className="pb-row" style={{ gap: 10 }}>
          {(['User', 'Provider', 'Org', 'Org Role'] as const).map((k) => (
            <PBRadio key={k} name="alias-kind" label={k} checked={kind === k} onChange={() => { setKind(k); setOwner('') }} tutorialId={`host.mois.field.alias-kind-${pbSlug(k)}`} />
          ))}
        </span>
        <FieldLabel>{kind}:</FieldLabel>
        <PBSelect w="100%" options={['', ...ALIAS_OWNERS[kind]]} value={owner} onChange={(e) => setOwner(e.target.value)} data-tutorial-id="host.mois.field.alias-owner" />
        <FieldLabel>Source:</FieldLabel>
        <PBSelect w={140} options={['', ...ALIAS_SOURCES]} value={code} onChange={(e) => setCode(e.target.value)} data-tutorial-id="host.mois.field.alias-source" />
        <FieldLabel>Value:</FieldLabel>
        <PBInput w={200} value={value} onChange={(e) => setValue(e.target.value)} data-tutorial-id="host.mois.field.alias-value" />
        <FieldLabel>Start Date:</FieldLabel>
        <PBInput w={100} value={start} onChange={(e) => setStart(e.target.value)} data-tutorial-id="host.mois.field.alias-start" />
        <FieldLabel>End Date:</FieldLabel>
        <PBInput w={100} value={stop} onChange={(e) => setStop(e.target.value)} data-tutorial-id="host.mois.field.alias-end" />
        <FieldLabel>Note:</FieldLabel>
        <PBInput w="100%" value={note} onChange={(e) => setNote(e.target.value)} data-tutorial-id="host.mois.field.alias-note" />
      </div>
      <div style={{ padding: '0 12px 6px', color: '#666' }}>User / Provider accounts synchronize when associated.</div>
    </DetailWindow>
  )
}

/* ===========================================================================
   Workspace ▸ Basket ▸ Unmatched Items
   ======================================================================== */
function UnmatchedItemsView({ close, openNode }: FolderViewProps) {
  const [items, setItems] = useSessionState<UnmatchedItem[]>(UNMATCHED_ITEMS_KEY, UNMATCHED_ITEMS)
  const [from, setFrom] = useState('2026.09.01')
  const [to, setTo] = useState(MOIS_TODAY)
  const [status, setStatus] = useState('UNMATCHED')
  const [patient, setPatient] = useState('')
  const [applied, setApplied] = useState({ from: '2026.09.01', to: MOIS_TODAY, status: 'UNMATCHED', patient: '' })
  const [cur, setCur] = useState(0)
  const [reassign, setReassign] = useState(false)
  const rows = items
    .filter((i) => i.received.slice(0, 10) >= applied.from && i.received.slice(0, 10) <= applied.to)
    .filter((i) => applied.status === 'ALL' || i.status === applied.status)
    .filter((i) => !applied.patient || i.patient.split(', ').some((p) => p.toLowerCase().startsWith(applied.patient.toLowerCase())))
  const row = rows[cur]
  useScreenReport({ rows: rows.length, filter: pbSlug(applied.status), row: row?.id ?? null, assigned: row ? pbSlug(row.assigned) : null })
  const refresh = () => { setApplied({ from, to, status, patient }); setCur(0) }
  return (
    <>
      <WorkspaceBanner title="Unmatched Items" />
      <PBCommandRow commands={[
        { label: 'Open Detail', onClick: () => { if (row) openNode('dx-lab-results') } },
        { label: 'Refresh', onClick: refresh },
        { label: 'Reassign', onClick: () => { if (row) setReassign(true) } },
        { label: 'Close Window', onClick: close },
      ]} />
      <GreenBand anchor="host.mois.group.unmatched-filter">
        <Lbl>Date Range:</Lbl><PBInput w={80} value={from} onChange={(e) => setFrom(e.target.value)} data-tutorial-id="host.mois.field.unmatched-from" />
        <span>to</span><PBInput w={80} value={to} onChange={(e) => setTo(e.target.value)} data-tutorial-id="host.mois.field.unmatched-to" />
        <Lbl>Status:</Lbl>
        <PBSelect w={110} options={['ALL', 'UNMATCHED', 'PROCESSED', 'PRINTED', 'IGNORED']} value={status} onChange={(e) => setStatus(e.target.value)} data-tutorial-id="host.mois.field.unmatched-status" />
        <Lbl>Patient Name:</Lbl><PBInput w={160} value={patient} onChange={(e) => setPatient(e.target.value)} data-tutorial-id="host.mois.field.unmatched-patient" />
      </GreenBand>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        <PBDataWindow
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
          onActivate={() => openNode('dx-lab-results')}
          rowTutorialId={(r) => `host.mois.row.unmatched-${r.id}`}
          columns={[
            { key: 'received', header: 'Received', width: 110 },
            { key: 'type', header: 'Type', width: 110 },
            { key: 'patient', header: 'Patient (from source)', width: 170 },
            { key: 'dob', header: 'DOB', width: 80, align: 'center' },
            { key: 'test', header: 'Description', width: 170 },
            { key: 'provider', header: 'Provider', width: 120 },
            { key: 'status', header: 'Status', width: 90 },
            { key: 'assigned', header: 'Assigned To', width: 140 },
          ]}
          empty="No unmatched items match the filter."
        />
      </div>
      {reassign && row && (
        <ReassignWindow current={row.assigned} onClose={() => setReassign(false)}
          onAssign={(target) => { setItems((all) => all.map((i) => (i.id === row.id ? { ...i, assigned: target } : i))); setReassign(false) }} />
      )}
    </>
  )
}

/* ===========================================================================
   Setup / Registration — the routing panes
   ======================================================================== */
export function RoutingPanes() {
  const [routing, setRouting] = useSessionState<RoutingConfig>(ROUTING_KEY, ROUTING)
  const [picking, setPicking] = useState<null | 'default' | 'unmatched' | 'add' | 'add-bu'>(null)
  const [pick, setPick] = useState('')
  const [pick2, setPick2] = useState('')
  const [row, setRow] = useState(0)
  const set = (patch: Partial<RoutingConfig>) => setRouting((r) => ({ ...r, ...patch }))
  const head = { background: '#c8dcfa', color: '#556', padding: '3px 8px' }
  useScreenReport({ handling: routing.handlingEnabled })
  return (
    <div style={{ flex: 'none', borderBottom: '1px solid #888' }} data-tutorial-id="host.mois.group.unmatched-routing">
      <div style={{ display: 'flex' }}>
        <div style={{ flex: '1 1 50%' }}>
          <div style={head}>Routing for matched patient data with unidentified providers</div>
          <div style={{ padding: '4px 8px' }}>
            <div>Unidentified providers with no patient connection routed to</div>
            <div>System Default Inbox:</div>
            <div className="pb-row" style={{ gap: 8 }}>
              <PBInput w={300} readOnly value={routing.systemDefault} style={{ background: '#e8e8e8' }} />
              <button type="button" className="pb-link" data-tutorial-id="host.mois.command.change-system-default" onClick={() => { setPick(routing.systemDefault); setPicking('default') }}>Change Default</button>
            </div>
          </div>
        </div>
        <div style={{ flex: '1 1 50%' }}>
          <div style={head}>Routing for unmatched patient data</div>
          <div style={{ padding: '4px 8px' }}>
            <PBCheckbox label="Enable Unmatched Patient Handling Service" checked={routing.handlingEnabled}
              onChange={(v) => set({ handlingEnabled: v })} tutorialId="host.mois.field.enable-unmatched-handling" />
            <div>Default Unmatched Inbox:</div>
            <div className="pb-row" style={{ gap: 8 }}>
              <PBInput w={300} readOnly value={routing.handlingEnabled ? routing.unmatchedInbox : ''} style={{ background: '#e8e8e8' }} />
              <button type="button" className="pb-link" disabled={!routing.handlingEnabled} data-tutorial-id="host.mois.command.change-unmatched-inbox"
                onClick={() => { setPick(routing.unmatchedInbox); setPicking('unmatched') }}>Change Inbox</button>
            </div>
          </div>
        </div>
      </div>
      <div className="pb-row" style={{ ...head, gap: 6 }} data-tutorial-id="host.mois.group.care-team-routing">
        <span style={{ width: 300 }}>Unidentified provider and patient connected to</span>
        <span style={{ flex: '1 1 auto' }}>will be routed to this inbox</span>
        <Btn id="routing-add" width={80} onClick={() => { setPick(''); setPick2(''); setPicking('add') }}>Add</Btn>
        <Btn id="routing-add-bu" width={80} onClick={() => { setPick(''); setPick2(''); setPicking('add-bu') }}>Add BU</Btn>
      </div>
      {routing.connections.map((c, i) => (
        <div key={i} className="pb-row" onMouseDown={() => setRow(i)} data-tutorial-id={`host.mois.row.routing-${pbSlug(c.connection)}`}
          style={{ gap: 6, padding: '2px 8px', background: i === row ? '#f6d8cc' : '#fff' }}>
          <span style={{ width: 300 }}>{c.bu ? `BU: ${c.connection}` : c.connection}</span>
          <span style={{ flex: '1 1 auto' }}>{c.inbox}</span>
          <Btn id={`routing-delete-${i + 1}`} width={80} onClick={() => set({ connections: routing.connections.filter((_, j) => j !== i) })}>Delete</Btn>
        </div>
      ))}
      {(picking === 'default' || picking === 'unmatched') && (
        <DetailWindow id={picking === 'default' ? 'system-default-inbox' : 'default-unmatched-inbox'} title={picking === 'default' ? 'System Default Inbox' : 'Default Unmatched Inbox'} width={360} onClose={() => setPicking(null)}
          buttons={<>
            <Btn id="routing-inbox-save" isDefault width={80} onClick={() => { set(picking === 'default' ? { systemDefault: pick } : { unmatchedInbox: pick }); setPicking(null) }}>Save</Btn>
            <Btn id="routing-inbox-cancel" width={80} onClick={() => setPicking(null)}>Cancel</Btn>
          </>}>
          <div className="pb-row" style={{ gap: 6, padding: 10 }}>
            <Lbl>Inbox:</Lbl>
            <PBSelect w={220} options={ROUTING_INBOXES} value={pick} onChange={(e) => setPick(e.target.value)} data-tutorial-id="host.mois.field.routing-inbox" />
          </div>
        </DetailWindow>
      )}
      {(picking === 'add' || picking === 'add-bu') && (
        <DetailWindow id="add-routing-connection" title={picking === 'add-bu' ? 'Add BU' : 'Add'} width={420} onClose={() => setPicking(null)}
          buttons={<>
            <Btn id="routing-connection-save" isDefault width={80} disabled={!pick || !pick2}
              onClick={() => { set({ connections: [...routing.connections, { connection: pick, inbox: pick2, bu: picking === 'add-bu' }] }); setPicking(null) }}>Save</Btn>
            <Btn id="routing-connection-cancel" width={80} onClick={() => setPicking(null)}>Cancel</Btn>
          </>}>
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 6, padding: 10, alignItems: 'center' }}>
            <Lbl>{picking === 'add-bu' ? 'Business Unit:' : 'Org / Org Role / Provider:'}</Lbl>
            <PBSelect w="100%" options={['', ...(picking === 'add-bu' ? ['PRIMARY CARE BU', 'MENTAL HEALTH BU'] : ROUTING_CONNECTIONS)]} value={pick} onChange={(e) => setPick(e.target.value)} data-tutorial-id="host.mois.field.routing-connection" />
            <Lbl>Route to inbox:</Lbl>
            <PBSelect w="100%" options={['', ...ROUTING_INBOXES]} value={pick2} onChange={(e) => setPick2(e.target.value)} data-tutorial-id="host.mois.field.routing-connection-inbox" />
          </div>
        </DetailWindow>
      )}
    </div>
  )
}

registerFolderView(['dx-alias-review'], UserAliasReviewView)
registerFolderView(['ws-unmatched'], UnmatchedItemsView)
