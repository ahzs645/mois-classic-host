import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import {
  PBButton, PBCheckbox, PBDataWindow, PBDropDownDataWindow, PBInput, PBMessageBox, PBRadio,
} from '../../pb'
import {
  claimFee, MSP_LOCATION_ROWS, payeeOf, useUnsentClaims,
} from '../../data/billingStore'
import { DOCTORS, type UnsentClaim } from '../../data/claims'
import { usePatientRoster } from '../../data/patient-context'
import { MOIS_TODAY, type Patient } from '../../data/patients'
import { useScreenReport } from '../../host/screen-state'
import { registerAreaWindow, type AreaWindowProps } from '../areaWindowRegistry'
import { DialogButton, WorkspaceDialogFrame } from '../WorkspaceDialogFrame'
import { ModalWindow } from '../dialogKit'
import { FormLine, NAVY } from '../formKit'
import { useTickSet } from '../listKit'
import { registerConfirmCurrent } from '../../host/confirmCurrent'

/* ============================================================================
   Unsent Claims ▸ Utilities: the Claim Review Wizard and the Bulk Claim
   Creation Wizard.

   ---------------------------------------------------------------------------
   Unsent Claim Review Wizard — `unsent-claim-review-wizard`
   PROVENANCE: 303601 "How To Use the Claim Review Wizard in Unsent Claims"
   and "How to Modify or Delete Bulk Claims"; captures `c379631e` (1038 x 870,
   empty), `e974131a` (Provider ORTHO, JANE filtered, Change Provider ticked
   with FAM, BOB as New Value), `08c212b4` (an excluded row struck through,
   Delete Claims ringed), `1580330d` (Refresh Provider Information).
   Layout: two blue-headed panes across the top — "Filter Options" (Provider
   drop-down; Payee No., Facility No., Fee Code, Rural Retention boxes;
   Location Code drop-down) and "Update Options  New Value" (Change Provider,
   Change Facility No, Change Fee Code, Change Rural Retention, Change
   Location Code, each with its New Value box once ticked; a rule; Refresh
   Provider Information "(will only update claim Pract and Payee No)");
   then the list — Exclude | Last Name | First Name | Doctor | Payee No. |
   Facility No. | Fee Code (clarification and code: `PG  00100`) | Location —
   empty until a filter is set; Delete Claims at the left, Update Claims and
   Cancel centred.
   Behaviour: the list is every unsent claim matching every filter that is
   set; a ticked Exclude strikes a row out and leaves it alone. Delete
   Claims removes the rest; Update Claims applies each ticked update to
   them. INFERRED: the confirmation before Delete Claims and the count
   message after either (not captured).

   ---------------------------------------------------------------------------
   Batch Claim Wizard — `batch-claim-wizard` (Utilities ▸ Bulk Claim Creation
   Wizard; the window's own title is "Batch Claim Wizard")
   PROVENANCE: 303601 "How To Use the Bulk Claim Creation Wizard"; captures
   `24bd5844` (Service Provider, Retrieve ringed), `8c056b46` (Service
   Provider (from demo page) dropped), `76c14603` (Patient Connection:
   Connection Role PRIMARY, Connection Resource list CLINIC … PROVIDER
   (INT), Connection), `3ff4e8ca` (Advanced Report: Run Report…, then the
   Advanced Medical Report Builder's list), `eccfcffc` (File: path "…",
   "What is the first row of data:", "Which column has the chart
   number:"), `a5aa3acb` (896 x 581: the whole window with the Patient List
   — Chart | Patient | Gender | DoB | Status | Insurance | Last Contact |
   Ignore / Exclude), `58ca0ec4` (the Create Claims button).
   Left pane "Patient Selection Parameter(s)": "How would you like to build a
   list of patients?" and the four radios; under the Service Provider and
   Patient Connection choices, "Patients must have one of the following
   status codes:" [A][…] and "Last contact date with patient:" Since / In
   the Last [3][Year(s)] / Ignore; Retrieve at the bottom right. Right pane
   "MSP Claims Information" with "Number of claims to create: [1]":
   Provider, Service Date, Location; No. Service, Fee Item [-][…], Diag Code
   1, Diag Code 2; Refer to/by N/A · To · By; Facility No.
   INFERRED: where Create Claims sits (the capture is a crop — bottom right,
   beside Close); the training charts carry no Service Provider, so each is
   given one of the clinic's five in roster order; a connection, report or
   file retrieves a fixed slice of the roster.
   Create Claims files one claim per patient not ignored (times Number of
   claims to create) in Unsent Claims, where the Claim Review Wizard can
   modify or delete them.
   ========================================================================= */

/* CONFIRM-CURRENT: both wizards are laid out from the help site's cloud
   captures (303601, 2025–26 builds); no capture of the current build. */
registerConfirmCurrent([
  { target: { anchor: 'host.mois.dialog.unsent-claim-review-wizard' }, source: 'help-site 303601 `c379631e`, `e974131a`, `08c212b4`, `1580330d`' },
  { target: { anchor: 'host.mois.dialog.unsent-review-delete-confirm' }, source: 'INFERRED: 303601 shows Delete Claims, not what it asks' },
  { target: { anchor: 'host.mois.dialog.unsent-review-result' }, source: 'INFERRED: not captured' },
  { target: { anchor: 'host.mois.dialog.batch-claim-wizard' }, source: 'help-site 303601 `a5aa3acb`, `24bd5844`, `8c056b46`, `76c14603`, `eccfcffc`, `58ca0ec4`', check: 'where Create Claims sits' },
  { target: { anchor: 'host.mois.dialog.advanced-medical-report-builder' }, source: 'help-site 303601 `3ff4e8ca`' },
  { target: { anchor: 'host.mois.dialog.batch-claim-result' }, source: 'INFERRED: not captured' },
])

const BLUE: CSSProperties = { background: '#c9daf8', color: '#555', padding: '3px 6px', flex: 'none' }

function Pane({ title, right, children, style }: { title: ReactNode; right?: ReactNode; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, ...style }}>
      <div style={{ ...BLUE, display: 'flex', gap: 12, alignItems: 'center' }}>
        <span style={{ flex: '1 1 auto' }}>{title}</span>{right}
      </div>
      <div style={{ padding: '4px 8px', flex: '1 1 auto', minHeight: 0 }}>{children}</div>
    </div>
  )
}

function FRow({ label, children, w = 110 }: { label: ReactNode; children: ReactNode; w?: number }) {
  return <FormLine label={label} w={w} padding="2px 0" align="center" labelClass={false}>{children}</FormLine>
}

const DOCTOR_ROWS = DOCTORS.map((d) => ({ doctor: d }))
const LOCATION_COLUMNS = [{ key: 'code', header: 'Code', width: 44 }, { key: 'desc', header: 'Description', width: 300 }]

function DoctorDrop({ value, onSelect, id, w = 250 }: { value: string; onSelect: (v: string) => void; id: string; w?: number }) {
  return (
    <PBDropDownDataWindow
      w={w}
      value={value}
      display="doctor"
      columns={[{ key: 'doctor', header: 'Provider', width: 240 }]}
      rows={DOCTOR_ROWS}
      onSelect={(r) => onSelect(r.doctor)}
      tutorialId={`host.mois.field.${id}`}
    />
  )
}

function LocationDrop({ value, onSelect, id, w = 60 }: { value: string; onSelect: (v: string) => void; id: string; w?: number }) {
  return (
    <PBDropDownDataWindow
      w={w}
      listW={360}
      value={value}
      display="code"
      columns={LOCATION_COLUMNS}
      rows={MSP_LOCATION_ROWS}
      onSelect={(r) => onSelect(r.code)}
      tutorialId={`host.mois.field.${id}`}
    />
  )
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

/* ============================================================================
   Unsent Claim Review Wizard
   ========================================================================= */

type Filters = { provider: string; payee: string; facility: string; fee: string; rural: string; location: string }
type Update = 'provider' | 'facility' | 'fee' | 'rural' | 'location'
const UPDATES: { key: Update; label: string }[] = [
  { key: 'provider', label: 'Change Provider' },
  { key: 'facility', label: 'Change Facility No' },
  { key: 'fee', label: 'Change Fee Code' },
  { key: 'rural', label: 'Change Rural Retention' },
  { key: 'location', label: 'Change Location Code' },
]

export function UnsentClaimReviewWizard({ close }: AreaWindowProps) {
  const roster = usePatientRoster()
  const store = useUnsentClaims(roster)
  const [f, setF] = useState<Filters>({ provider: '', payee: '', facility: '', fee: '', rural: '', location: '' })
  const [on, setOn] = useState<Record<Update, boolean>>({ provider: false, facility: false, fee: false, rural: false, location: false })
  const [value, setValue] = useState<Record<Update, string>>({ provider: '', facility: '', fee: '', rural: '', location: '' })
  const [refresh, setRefresh] = useState(false)
  const excluded = useTickSet<string>()
  const [ask, setAsk] = useState<'delete' | 'deleted' | 'updated' | 'nothing' | null>(null)
  const [count, setCount] = useState(0)
  const [cur, setCur] = useState(0)

  const filtering = Object.values(f).some((v) => v.trim())
  const rows = useMemo(() => (filtering ? store.rows.filter((r) => (
    (!f.provider || r.doctor === f.provider)
    && (!f.payee.trim() || (r.payee ?? '').includes(f.payee.trim()))
    && (!f.facility.trim() || (r.facility ?? '').includes(f.facility.trim()))
    && (!f.fee.trim() || r.fee.includes(f.fee.trim()))
    && (!f.rural.trim() || (r.clar ?? '').toUpperCase() === f.rural.trim().toUpperCase())
    && (!f.location || (r.location ?? 'A') === f.location)
  )) : []).sort((a, b) => a.last.localeCompare(b.last)), [f, filtering, store.rows])

  const targets = rows.filter((r) => !excluded.has(r.id ?? ''))
  const ids = targets.map((r) => r.id!).filter(Boolean)

  useScreenReport({
    rows: rows.length,
    excluded: rows.length - targets.length,
    updates: UPDATES.filter((u) => on[u.key]).map((u) => u.key).join(',') || 'none',
    refreshProvider: refresh,
    ...(ask === 'delete' ? { confirm: 'delete-claims' } : {}),
  })

  const updateClaims = () => {
    const chosen = UPDATES.filter((u) => on[u.key] && value[u.key].trim())
    if (!ids.length || (!chosen.length && !refresh)) { setAsk('nothing'); return }
    store.update(ids, (row) => {
      const p: Partial<UnsentClaim> = {}
      if (on.provider && value.provider) { p.doctor = value.provider }
      if (on.facility && value.facility.trim()) p.facility = value.facility.trim()
      if (on.fee && value.fee.trim()) {
        p.fee = value.fee.trim()
        const fee = claimFee(p.fee)
        if (fee) p.billed = fee.fee
      }
      if (on.rural && value.rural.trim()) p.clar = value.rural.trim().toUpperCase()
      if (on.location && value.location) p.location = value.location
      /* "will only update claim Pract and Payee No" */
      if (refresh) p.payee = payeeOf(p.doctor ?? row.doctor)
      return p
    })
    setCount(ids.length)
    setAsk('updated')
  }

  const filter = (key: keyof Filters, label: string, w = 84) => (
    <FRow label={label}>
      <PBInput w={w} value={f[key]} onChange={(e) => setF({ ...f, [key]: e.target.value })} data-tutorial-id={`host.mois.field.review-${slug(label)}`} />
    </FRow>
  )

  return (
    <WorkspaceDialogFrame id="unsent-claim-review-wizard" title="Unsent Claim Review Wizard" width={1038} height={760} controls={false} onClose={close}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, padding: 8, gap: 0 }}>
        <div style={{ display: 'flex', border: '1px solid #8c8c8c', background: '#fff', flex: 'none' }}>
          <Pane title="Filter Options" style={{ flex: '1 1 50%', borderRight: '1px solid #8c8c8c' }}>
            <FRow label="Provider:"><DoctorDrop value={f.provider} onSelect={(v) => setF({ ...f, provider: v })} id="review-provider" /></FRow>
            {filter('payee', 'Payee No.:')}
            {filter('facility', 'Facility No.:')}
            {filter('fee', 'Fee Code:')}
            {filter('rural', 'Rural Retention:')}
            <FRow label="Location Code:"><LocationDrop value={f.location} onSelect={(v) => setF({ ...f, location: v })} id="review-location-code" /></FRow>
          </Pane>
          <Pane title={<span style={{ display: 'inline-flex', gap: 90 }}><span>Update Options</span><span>New Value</span></span>} style={{ flex: '1 1 50%' }}>
            {UPDATES.map((u) => (
              <FormLine
                key={u.key} w={180} padding="1px 0" align="center" minHeight={23} labelClass={false}
                label={<PBCheckbox label={u.label} checked={on[u.key]} onChange={(v) => setOn({ ...on, [u.key]: v })} tutorialId={`host.mois.check.review-${slug(u.label)}`} />}
              >
                {on[u.key] && (u.key === 'provider'
                  ? <DoctorDrop value={value.provider} onSelect={(v) => setValue({ ...value, provider: v })} id="review-new-provider" w={270} />
                  : u.key === 'location'
                    ? <LocationDrop value={value.location} onSelect={(v) => setValue({ ...value, location: v })} id="review-new-location" />
                    : <PBInput w={110} value={value[u.key]} onChange={(e) => setValue({ ...value, [u.key]: e.target.value })} data-tutorial-id={`host.mois.field.review-new-${u.key}`} />)}
              </FormLine>
            ))}
            <div style={{ borderTop: '1px solid #c8c8c8', margin: '4px 0' }} />
            <div className="pb-row" style={{ gap: 4 }}>
              <PBCheckbox label="Refresh Provider Information" checked={refresh} onChange={setRefresh} tutorialId="host.mois.check.review-refresh-provider-information" />
              <span style={{ color: '#666' }}>(will only update claim Pract and Payee No)</span>
            </div>
          </Pane>
        </div>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', border: '1px solid #8c8c8c', borderTop: 0 }}>
          <PBDataWindow
            flush
            style={{ flex: '1 1 auto', minHeight: 0 }}
            columns={[
              {
                key: 'exclude', header: 'Exclude', width: 58, align: 'center',
                render: (r: UnsentClaim) => (
                  <PBCheckbox
                    checked={excluded.has(r.id ?? '')}
                    onChange={(v) => excluded.set(r.id ?? '', v)}
                    tutorialId={`host.mois.check.review-exclude-${slug(r.last)}`}
                  />
                ),
              },
              { key: 'last', header: 'Last Name', width: 145, render: (r: UnsentClaim) => <Struck on={excluded.has(r.id ?? '')}>{r.last}</Struck> },
              { key: 'first', header: 'First Name', width: 120, render: (r: UnsentClaim) => <Struck on={excluded.has(r.id ?? '')}>{r.first}</Struck> },
              { key: 'doctor', header: 'Doctor', width: 140, render: (r: UnsentClaim) => <Struck on={excluded.has(r.id ?? '')}>{r.doctor}</Struck> },
              { key: 'payee', header: 'Payee No.', width: 84, render: (r: UnsentClaim) => <Struck on={excluded.has(r.id ?? '')}>{r.payee ?? ''}</Struck> },
              { key: 'facility', header: 'Facility No.', width: 86, render: (r: UnsentClaim) => <Struck on={excluded.has(r.id ?? '')}>{r.facility ?? ''}</Struck> },
              { key: 'fee', header: 'Fee Code', width: 110, render: (r: UnsentClaim) => <Struck on={excluded.has(r.id ?? '')}>{`${r.clar ?? 'PG'}   ${r.fee}`}</Struck> },
              { key: 'location', header: 'Location', width: 80, render: (r: UnsentClaim) => <Struck on={excluded.has(r.id ?? '')}>{r.location ?? 'A'}</Struck> },
            ]}
            rows={rows}
            current={Math.min(cur, Math.max(0, rows.length - 1))}
            onCurrentChange={setCur}
            rowTutorialId={(r) => `host.mois.row.review-${slug(r.last)}`}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', paddingTop: 8, flex: 'none' }}>
          <DialogButton id="review-delete-claims" width={110} disabled={!ids.length} onClick={() => setAsk('delete')}>Delete Claims</DialogButton>
          <span style={{ flex: '1 1 auto' }} />
          <DialogButton id="review-update-claims" width={110} isDefault onClick={updateClaims}>Update Claims</DialogButton>
          <span style={{ width: 14 }} />
          <DialogButton id="review-cancel" width={94} onClick={close}>Cancel</DialogButton>
          <span style={{ flex: '1 1 auto' }} />
          <span style={{ width: 110 }} />
        </div>
      </div>

      {ask === 'delete' && (
        <PBMessageBox
          title="Confirmation - Delete Claims"
          tutorialId="host.mois.dialog.unsent-review-delete-confirm"
          icon="question"
          buttons={[
            { label: 'Yes', value: 'yes', default: true, command: 'review-delete-yes' },
            { label: 'No', value: 'no', command: 'review-delete-no' },
          ]}
          onClose={(v) => {
            if (v === 'yes') { store.remove(ids); setCount(ids.length); setAsk('deleted') } else setAsk(null)
          }}
        >
          {`Would you like to delete the ${ids.length} selected Unsent MSP claim(s)?`}
        </PBMessageBox>
      )}
      {(ask === 'deleted' || ask === 'updated' || ask === 'nothing') && (
        <PBMessageBox
          title="Unsent Claim Review Wizard"
          tutorialId="host.mois.dialog.unsent-review-result"
          buttons={[{ label: 'OK', value: 'ok', default: true, command: 'review-ok' }]}
          onClose={() => setAsk(null)}
        >
          {ask === 'deleted' ? `${count} claim(s) deleted.`
            : ask === 'updated' ? `${count} claim(s) updated.`
              : 'Select the claims and tick at least one update option, with its new value.'}
        </PBMessageBox>
      )}
    </WorkspaceDialogFrame>
  )
}

function Struck({ on, children }: { on: boolean; children: ReactNode }) {
  return <span style={on ? { textDecoration: 'line-through', color: '#a0a0a0' } : undefined}>{children}</span>
}

/* ============================================================================
   Batch Claim Wizard
   ========================================================================= */

type Source = 'provider' | 'connection' | 'report' | 'file'

/** INFERRED: the training charts carry no Service Provider; each is given
    one of the clinic's providers in roster order. */
export const serviceProviderOf = (p: Patient, i: number) => p.provider || DOCTORS[i % DOCTORS.length]!

const CONNECTION_ROLES = ['PRIMARY', 'REFERRING', 'CONSULTANT', 'SPECIALIST']
const CONNECTION_RESOURCES = ['CLINIC', 'ORG ROLE (INT)', 'ORGANIZATION (EXT)', 'ORGANIZATION (INT)', 'PROVIDER (EXT)', 'PROVIDER (INT)']
/** the Advanced Medical Report Builder list, `3ff4e8ca` */
const ADVANCED_REPORTS = [
  'ASTHMA PATIENTS - DECLINED INFLUENZA', 'BP DONE IN LAST 1 MONTH', 'CERVICAL CANCER SCREENING / PAP',
  'COLORECTAL CANCER', 'CVD', 'CVD NO FRAMMINGHAM', 'CVD PATIENTS ON ASA', 'CVD PATIENTS WITHOUT ASA',
]

type ListRow = { chart: string; patient: string; gender: string; dob: string; status: string; insurance: string; last: string; p: Patient }

export function BatchClaimWizard({ close }: AreaWindowProps) {
  const roster = usePatientRoster()
  const store = useUnsentClaims(roster)
  const [source, setSource] = useState<Source>('provider')
  const [provider, setProvider] = useState('')
  const [role, setRole] = useState('PRIMARY')
  const [resource, setResource] = useState('')
  const [connection, setConnection] = useState('')
  const [report, setReport] = useState('')
  const [reportList, setReportList] = useState(false)
  const [file, setFile] = useState('')
  const [firstRow, setFirstRow] = useState('1')
  const [column, setColumn] = useState('1')
  const [statuses, setStatuses] = useState('A')
  const [contact, setContact] = useState<'since' | 'last' | 'ignore'>('last')
  const [since, setSince] = useState('')
  const [lastN, setLastN] = useState('3')
  const [list, setList] = useState<ListRow[] | null>(null)
  const ignored = useTickSet<string>()
  /* MSP Claims Information */
  const [count, setCount] = useState('1')
  const [claimProvider, setClaimProvider] = useState('')
  const [serviceDate, setServiceDate] = useState('')
  const [location, setLocation] = useState('')
  const [noService, setNoService] = useState('1')
  const [clar, setClar] = useState('')
  const [fee, setFee] = useState('')
  const [diag1, setDiag1] = useState('')
  const [diag2, setDiag2] = useState('')
  const [refer, setRefer] = useState<'N/A' | 'To' | 'By'>('N/A')
  const [facility, setFacility] = useState('')
  const [done, setDone] = useState<number | null>(null)
  const [problem, setProblem] = useState<string | null>(null)

  const retrieve = () => {
    const allowed = statuses.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
    const years = Number(lastN) || 0
    const cutoff = `${Number(MOIS_TODAY.slice(0, 4)) - years}${MOIS_TODAY.slice(4)}`
    let picked = roster.map((p, i) => ({ p, i }))
    if (source === 'provider') picked = provider ? picked.filter(({ p, i }) => serviceProviderOf(p, i) === provider) : []
    else if (source === 'connection') picked = connection.trim() ? picked.filter(({ i }) => i % 3 === 0) : []
    else if (source === 'report') picked = report ? picked.filter(({ i }) => i % 2 === ADVANCED_REPORTS.indexOf(report) % 2) : []
    else picked = file.trim() ? picked.slice(Math.max(0, (Number(firstRow) || 1) - 1), 8) : []
    if (source === 'provider' || source === 'connection') {
      picked = picked.filter(({ p }) => !allowed.length || allowed.includes(p.status))
      const last = (p: Patient) => p.lastContact || p.registered || ''
      if (contact === 'last') picked = picked.filter(({ p }) => last(p) >= cutoff)
      else if (contact === 'since' && since.trim()) picked = picked.filter(({ p }) => last(p) >= since.trim())
    }
    ignored.clear()
    setList(picked.map(({ p }) => ({
      chart: p.chart, patient: `${p.last}, ${p.first}`, gender: p.gender, dob: p.dob, status: p.status,
      insurance: `${p.insuranceBy || 'BC'}  ${p.insurance ?? ''}`, last: p.lastContact || p.registered || '', p,
    })))
  }

  const create = () => {
    const rows = (list ?? []).filter((r) => !ignored.has(r.chart))
    const missing = [
      !claimProvider && 'Provider', !serviceDate.trim() && 'Service Date', !location && 'Location',
      !fee.trim() && 'Fee Item', !diag1.trim() && 'Diag Code 1',
    ].filter(Boolean)
    if (!rows.length) { setProblem('Retrieve a Patient List first.'); return }
    if (missing.length) { setProblem(`Enter the claim's ${missing.join(', ')}.`); return }
    const times = Math.max(1, Math.min(10, Number(count) || 1))
    const amount = claimFee(fee.trim())?.fee ?? '0.00'
    const claims: UnsentClaim[] = []
    for (const r of rows) {
      for (let k = 0; k < times; k += 1) {
        claims.push({
          chart: r.p.chart, last: r.p.last, first: r.p.first, service: serviceDate.trim(), doctor: claimProvider,
          fee: fee.trim(), dob: r.p.dob, insrBy: r.p.insuranceBy || 'BC', insrNbr: r.p.insurance ?? '',
          billed: amount, compl: Boolean(r.p.insurance), hold: false, sub: 'R',
          clar: clar.trim().toUpperCase() || 'PG', location, facility: facility.trim() || '00000',
          diag: diag1.trim(), payee: payeeOf(claimProvider), origin: 'bulk',
        })
      }
    }
    store.add(claims)
    setDone(claims.length)
  }

  useScreenReport({
    source,
    patients: list?.length ?? 0,
    ignored: ignored.size,
    ...(reportList ? { panel: 'advanced-medical-reports' } : {}),
  })

  const radio = (value: Source, label: string) => (
    <PBRadio name="batch-source" label={label} checked={source === value} onChange={() => { setSource(value); setList(null) }} tutorialId={`host.mois.radio.batch-${value}`} />
  )
  const grey: CSSProperties = { color: '#707070' }

  return (
    <WorkspaceDialogFrame id="batch-claim-wizard" title="Batch Claim Wizard" width={1040} height={640} onClose={close}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, padding: 6 }}>
        <div style={{ display: 'flex', border: '1px solid #8c8c8c', background: '#fff', flex: 'none', minHeight: 300 }}>
          <Pane title="Patient Selection Parameter(s)" style={{ flex: '1 1 50%', borderRight: '1px solid #8c8c8c' }}>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 3 }}>
              <div>How would you like to build a list of patients?</div>
              <div className="pb-row" style={{ gap: 14 }} data-tutorial-id="host.mois.field.batch-source">
                {radio('provider', 'Service Provider')}{radio('connection', 'Patient Connection')}{radio('report', 'Advanced Report')}{radio('file', 'File')}
              </div>
              {source === 'provider' && (
                <div style={{ paddingLeft: 22 }}>
                  <div style={grey}>Service Provider (from demo page)</div>
                  <DoctorDrop value={provider} onSelect={setProvider} id="batch-service-provider" w={300} />
                </div>
              )}
              {source === 'connection' && (
                <div style={{ paddingLeft: 22, display: 'grid', gridTemplateColumns: '280px 280px', gap: '2px 12px' }}>
                  <span style={grey}>Connection Role</span><span style={grey}>Connection Resource</span>
                  <PBDropDownDataWindow w={270} value={role} display="v" columns={[{ key: 'v', header: 'Role', width: 250 }]}
                    rows={CONNECTION_ROLES.map((v) => ({ v }))} onSelect={(r) => setRole(r.v)} tutorialId="host.mois.field.batch-connection-role" />
                  <PBDropDownDataWindow w={270} value={resource} display="v" columns={[{ key: 'v', header: 'Resource', width: 250 }]}
                    rows={CONNECTION_RESOURCES.map((v) => ({ v }))} onSelect={(r) => setResource(r.v)} tutorialId="host.mois.field.batch-connection-resource" />
                  <span style={grey}>Connection</span><span />
                  <span className="pb-inputgroup" style={{ width: 300 }}>
                    <input className="pb-field" value={connection} onChange={(e) => setConnection(e.target.value)} data-tutorial-id="host.mois.field.batch-connection" />
                    <button type="button" className="pb-inputgroup__btn pb-inputgroup__btn--dots" onClick={() => setConnection(resource ? `${resource} - ${DOCTORS[0]}` : DOCTORS[0]!)}>…</button>
                  </span>
                </div>
              )}
              {source === 'file' && (
                <div style={{ paddingLeft: 22 }}>
                  <div style={grey}>File</div>
                  <span className="pb-inputgroup" style={{ width: 460 }}>
                    <input className="pb-field" value={file} onChange={(e) => setFile(e.target.value)} data-tutorial-id="host.mois.field.batch-file" />
                    <button type="button" className="pb-inputgroup__btn pb-inputgroup__btn--dots" data-tutorial-id="host.mois.lookup.batch-file" onClick={() => setFile('M:\\ci10\\uploads\\panel chart list.csv')}>…</button>
                  </span>
                  <FRow label={<span style={grey}>What is the first row of data:</span>} w={200}>
                    <PBInput w={40} align="center" value={firstRow} onChange={(e) => setFirstRow(e.target.value)} data-tutorial-id="host.mois.field.batch-first-row" />
                  </FRow>
                  <FRow label={<span style={grey}>Which column has the chart number:</span>} w={200}>
                    <PBInput w={40} align="center" value={column} onChange={(e) => setColumn(e.target.value)} data-tutorial-id="host.mois.field.batch-chart-column" />
                  </FRow>
                </div>
              )}
              {(source === 'provider' || source === 'connection') && (
                <>
                  <div style={{ paddingTop: 10 }}>Patients must have one of the following status codes:</div>
                  <span className="pb-inputgroup" style={{ width: 130, marginLeft: 22 }}>
                    <input className="pb-field" value={statuses} onChange={(e) => setStatuses(e.target.value.toUpperCase())} data-tutorial-id="host.mois.field.batch-status-codes" />
                    <button type="button" className="pb-inputgroup__btn pb-inputgroup__btn--dots">…</button>
                  </span>
                  <div style={{ paddingTop: 6 }}>Last contact date with patient:</div>
                  <div style={{ paddingLeft: 4, display: 'grid', gridTemplateColumns: '110px auto', rowGap: 2, alignItems: 'center' }}>
                    <PBRadio name="batch-contact" label="Since" checked={contact === 'since'} onChange={() => setContact('since')} tutorialId="host.mois.radio.batch-contact-since" />
                    {contact === 'since' ? <PBInput w={90} value={since} onChange={(e) => setSince(e.target.value)} /> : <span />}
                    <PBRadio name="batch-contact" label="In the Last" checked={contact === 'last'} onChange={() => setContact('last')} tutorialId="host.mois.radio.batch-contact-last" />
                    <span className="pb-row" style={{ gap: 4 }}><PBInput w={36} align="center" value={lastN} onChange={(e) => setLastN(e.target.value)} /><PBInput w={80} value="Year(s)" readOnly /></span>
                    <PBRadio name="batch-contact" label="Ignore" checked={contact === 'ignore'} onChange={() => setContact('ignore')} tutorialId="host.mois.radio.batch-contact-ignore" />
                    <span />
                  </div>
                </>
              )}
              {source === 'report' && (
                <div style={{ paddingLeft: 22 }}>
                  <div style={grey}>Advanced Report</div>
                  <PBInput w={320} value={report} readOnly data-tutorial-id="host.mois.field.batch-report" />
                </div>
              )}
              <span style={{ flex: '1 1 auto' }} />
              <div className="pb-row" style={{ justifyContent: 'flex-end', gap: 8 }}>
                {source === 'report' && <DialogButton id="batch-run-report" width={100} onClick={() => setReportList(true)}>Run Report...</DialogButton>}
                <DialogButton id="batch-retrieve" width={90} onClick={retrieve}>Retrieve</DialogButton>
              </div>
            </div>
          </Pane>
          <Pane
            title="MSP Claims Information"
            right={(
              <span className="pb-row" style={{ gap: 4 }}>
                Number of claims to create:
                <PBInput w={34} value={count} onChange={(e) => setCount(e.target.value.replace(/\D/g, ''))} data-tutorial-id="host.mois.field.batch-claim-count" />
              </span>
            )}
            style={{ flex: '1 1 50%' }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 0.9fr 0.8fr', gap: '2px 10px', color: '#555' }}>
              <span>Provider</span><span>Service Date</span><span>Location</span>
              <DoctorDrop value={claimProvider} onSelect={setClaimProvider} id="batch-provider" w={240} />
              <PBInput w={96} value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} data-tutorial-id="host.mois.field.batch-service-date" />
              <LocationDrop value={location} onSelect={setLocation} id="batch-location" w={70} />
              <span className="pb-row" style={{ gap: 30 }}><span>No. Service</span><span>Fee Item</span></span><span>Diag Code 1</span><span>Diag Code 2</span>
              <span className="pb-row" style={{ gap: 12 }}>
                <PBInput w={60} align="center" value={noService} onChange={(e) => setNoService(e.target.value)} data-tutorial-id="host.mois.field.batch-no-service" />
                <PBInput w={28} align="center" value={clar} placeholder="-" onChange={(e) => setClar(e.target.value.toUpperCase())} data-tutorial-id="host.mois.field.batch-clarification" />
                <span className="pb-inputgroup" style={{ width: 96 }}>
                  <input className="pb-field" value={fee} onChange={(e) => setFee(e.target.value)} data-tutorial-id="host.mois.field.batch-fee" />
                  <button type="button" className="pb-inputgroup__btn pb-inputgroup__btn--dots">…</button>
                </span>
              </span>
              <span className="pb-inputgroup" style={{ width: 96 }}>
                <input className="pb-field" value={diag1} onChange={(e) => setDiag1(e.target.value)} data-tutorial-id="host.mois.field.batch-diag-1" />
                <button type="button" className="pb-inputgroup__btn pb-inputgroup__btn--dots">…</button>
              </span>
              <span className="pb-inputgroup" style={{ width: 96 }}>
                <input className="pb-field" value={diag2} onChange={(e) => setDiag2(e.target.value)} data-tutorial-id="host.mois.field.batch-diag-2" />
                <button type="button" className="pb-inputgroup__btn pb-inputgroup__btn--dots">…</button>
              </span>
              <span>Refer to/by</span><span /><span>Facility No.</span>
              <span className="pb-row" style={{ gap: 10, color: '#000' }} data-tutorial-id="host.mois.field.batch-refer">
                {(['N/A', 'To', 'By'] as const).map((v) => <PBRadio key={v} name="batch-refer" label={v} checked={refer === v} onChange={() => setRefer(v)} />)}
              </span>
              <span />
              <PBInput w={86} value={facility} onChange={(e) => setFacility(e.target.value)} data-tutorial-id="host.mois.field.batch-facility" />
            </div>
            <div style={{ borderTop: '2px solid #1c2f8c', marginTop: 8 }} />
          </Pane>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, border: '1px solid #8c8c8c', borderTop: 0, background: '#fff' }}>
          <div style={{ ...BLUE, color: '#000' }}>Patient List</div>
          <PBDataWindow
            flush
            style={{ flex: '1 1 auto', minHeight: 0 }}
            columns={[
              { key: 'chart', header: 'Chart', width: 70 },
              { key: 'patient', header: 'Patient', width: 220 },
              { key: 'gender', header: 'Gender', width: 50, align: 'center' },
              { key: 'dob', header: 'DoB', width: 84, align: 'center' },
              { key: 'status', header: 'Status', width: 50, align: 'center' },
              { key: 'insurance', header: 'Insurance', width: 130 },
              { key: 'last', header: 'Last Contact', width: 100, align: 'center' },
              {
                key: 'ignore', header: 'Ignore / Exclude', width: 110, align: 'center',
                render: (r: ListRow) => (
                  <PBCheckbox
                    checked={ignored.has(r.chart)}
                    onChange={(v) => ignored.set(r.chart, v)}
                    tutorialId={`host.mois.check.batch-ignore-${r.chart}`}
                  />
                ),
              },
            ]}
            rows={list ?? []}
            rowTutorialId={(r) => `host.mois.row.batch-${r.chart}`}
            empty={list ? 'No patient matches those parameters.' : 'Choose how to build the list, then press Retrieve.'}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 6, flex: 'none' }}>
          <DialogButton id="batch-create-claims" width={110} isDefault disabled={!list?.length} onClick={create}>Create Claims</DialogButton>
          <DialogButton id="batch-close" width={90} onClick={close}>Close</DialogButton>
        </div>
      </div>

      {reportList && (
        /* `3ff4e8ca`: Run Report… raises the Advanced Medical Report Builder
           over the wizard; picking a report's row fills the list source. */
        <ModalWindow
          id="advanced-medical-report-builder"
          title="Advanced Medical Report Builder"
          onClose={() => setReportList(false)}
          windowStyle={{ width: 520, height: 380 }}
          zIndex={90}
        >
          <div style={{ background: NAVY.caption, color: '#fff', fontSize: 16, fontWeight: 700, padding: '3px 8px' }}>Advanced Medical Reports</div>
          <div className="pb-row" style={{ gap: 2, padding: 2 }}>
            <PBButton disabled>New</PBButton><PBButton disabled>Delete</PBButton>
            <PBButton command="batch-report-open" disabled={!report} onClick={() => setReportList(false)}>Open</PBButton>
          </div>
          <PBDataWindow
            style={{ flex: '1 1 auto', minHeight: 0 }}
            columns={[{ key: 'name', header: 'Name', width: 380 }, { key: 'group', header: 'Group', width: 100 }]}
            rows={ADVANCED_REPORTS.map((name) => ({ name, group: '' }))}
            current={Math.max(0, ADVANCED_REPORTS.indexOf(report))}
            onCurrentChange={(i) => setReport(ADVANCED_REPORTS[i] ?? '')}
            onActivate={() => setReportList(false)}
            rowTutorialId={(r) => `host.mois.row.batch-report-${slug(r.name)}`}
          />
          <div className="pb-row" style={{ justifyContent: 'center', padding: 6 }}>
            <DialogButton id="batch-report-close" onClick={() => setReportList(false)}>Close</DialogButton>
          </div>
        </ModalWindow>
      )}
      {(done !== null || problem) && (
        <PBMessageBox
          title="Batch Claim Wizard"
          tutorialId="host.mois.dialog.batch-claim-result"
          icon={problem ? 'warn' : 'info'}
          buttons={[{ label: 'OK', value: 'ok', default: true, command: 'batch-ok' }]}
          onClose={() => { setProblem(null); setDone(null) }}
        >
          {problem ?? `${done} claim(s) created in Unsent Claims.`}
        </PBMessageBox>
      )}
    </WorkspaceDialogFrame>
  )
}

export function registerClaimWizards() {
  registerAreaWindow('unsent-claim-review-wizard', UnsentClaimReviewWizard)
  registerAreaWindow('batch-claim-wizard', BatchClaimWizard)
}

registerClaimWizards()
