import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  billingPrograms, enrolmentOf, feeCaption, isEnrolledNow, patientName, patientOf, PBF_TODAY, shiftStamp,
  useBillingPrograms, type ChangeRequest, type EnrolmentClaim, type PbfConfig,
} from '../data/billingPrograms'
import { hhmm } from '../data/clock'
import { useScreenReport } from '../host/screen-state'
import { useScreenWindow } from '../host/screen-windows'
import {
  PBButton, PBCheckbox, PBCommandRow, PBDataWindow, PBInput, PBLookup, PBSelect, PBTabs, PBViewHeader, pbSlug,
  usePBInstrumentation,
} from '../pb'
import { useOpenWindow } from './areaWindowRegistry'
import { Ask, CellButton, CellLink, Dim, Field, FilterGroup, RadioSet } from './billingProgramsKit'
import { NAVY, SectionCaption } from './formKit'
import { PBF_WINDOWS, PbfWindows, pcpcScore, providerOptions } from './PbfWindows'

/* ============================================================================
   Billing ▸ PBF Management — the folder screens.

   PROVENANCE (captures in art. 2257761 "Population Based Funding" and
   2258278 "PBF Administrator Role"; builds as noted):
   - Primary Care Physician Compensation Management (the folder itself, the
     administrator's dashboard)          2258278 `7788a098…` (v02.24.34)
   - PBF Patient Enrollment              `17c5952d…` (v02.28.07, empty) and
     2258278 `d90f3f51…` (v02.28.04, populated; greyed stop dates)
   - MSP Eligibility Requests            `fc17dba2…` (v02.28.04)
   - Enrollment Change Requests (CR)     `f32281d3…` (v02.28.07) and 2258278
     `b94c980c…` (v02.24.43, populated: the ✓ / ⃠ buttons and Detail)
   - Unsent Enrollment Claims List       `b32c6896…` (v02.24.34)
   - Unack Enrollment Claims List        `81e7f05a…` (v02.28.04)
   - Failed Enrollment Claims List       `5e89f3bd…` (v02.28.04)
   - MSP Enrollment Change Requests      `8f34a4f4…` (v02.28.04); 2258278
     `de7be41e…` is the older "MSP Enrollment Request Errors" edition
   - Enrollment Claim History            `6abc8bc6…` (v02.28.04)
   - PCPC Complexity Index Calculator    `511a2a7d…` (v02.28.04)
   - PBF Setup (PBF Configuration)       `58b8f835…` (v02.24.43)
   The user's build (v02.31.23/41) names the folders as data/mois.tsx does;
   its tree has no PBF Configuration node for a clinic user (the captures
   that show it are support builds), so the node is added last, as they
   place it.

   Kept from the user's build where it differs: the Enrollment CR tabs read
   "Enroll Requests" / "Unenroll Requests" (the lessons already name them),
   not v02.24's "Enrollment Request (2)".

   INFERRED
   - The dashboard's Unack / Failed sections (the capture has none
     outstanding) and a click on a dashboard line opening its folder.
   - Patient Enrollment's Last Contact and Registered Start / Stop Date
     follow-up fields (2257761 describes them; the captures show them closed).
   - The CR undo glyph (2258278: "a yellow swoosh"), shown as ↶.
   - The PCPC calculator's Other / Limit Number of Charts fields and what the
     MoH File and CSV File outputs say when they finish.
   ========================================================================= */

export type PbfViewProps = {
  node: string
  onClose?: () => void
  onOpenNode?: (node: string) => void
  onOpenChart?: (chart: string) => void
}

const age = (dob: string) => {
  const [y, m, d] = dob.split('.').map(Number) as [number, number, number]
  const [ty, tm, td] = PBF_TODAY.split('.').map(Number) as [number, number, number]
  return ty - y - (tm < m || (tm === m && td < d) ? 1 : 0)
}
const patientCaption = (chart: string) => {
  const p = patientOf(chart)
  return p ? <>{p.last}, {p.first} <span style={{ color: '#8a8a8a' }}>{p.dob ? `${age(p.dob)} yr old ${p.gender ?? ''}` : ''}</span></> : chart
}
const rowSlug = (chart: string) => `pbf-${pbSlug(patientOf(chart)?.last ?? chart)}-${chart}`

/** Time Frame radios with their follow-up fields (the four PBF grids). */
type Frame = 'All' | 'In Last' | 'Since' | 'Between'
function TimeFrame({ group, value, onChange, n, unit, since, from, to, set }: {
  group: string; value: Frame; onChange: (f: Frame) => void
  n: string; unit: string; since: string; from: string; to: string
  set: (k: 'n' | 'unit' | 'since' | 'from' | 'to', v: string) => void
}) {
  const f = (k: 'n' | 'since' | 'from' | 'to', v: string, w: number) => (
    <PBInput w={w} value={v} onChange={(e) => set(k, e.target.value)} data-tutorial-id={`host.mois.field.${group}-${k}`} />
  )
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', columnGap: 8, rowGap: 3, alignItems: 'center' }}>
      <RadioSet group={group} options={['All'] as Frame[]} value={value} onChange={onChange} /><span />
      <RadioSet group={group} options={['In Last'] as Frame[]} value={value} onChange={onChange} />
      <span className="pb-row" style={{ gap: 4 }}>{f('n', n, 40)}<PBSelect w={80} options={['days', 'weeks', 'months', 'years']} value={unit} onChange={(e) => set('unit', e.target.value)} /></span>
      <RadioSet group={group} options={['Since'] as Frame[]} value={value} onChange={onChange} />{f('since', since, 84)}
      <RadioSet group={group} options={['Between'] as Frame[]} value={value} onChange={onChange} />
      <span className="pb-row" style={{ gap: 4 }}>{f('from', from, 84)}<span>and</span>{f('to', to, 84)}</span>
    </div>
  )
}

function useTimeFrame() {
  const [frame, setFrame] = useState<Frame>('All')
  const [v, setV] = useState({ n: '', unit: 'months', since: '', from: '', to: '' })
  const set = (k: keyof typeof v, value: string) => {
    setV((x) => ({ ...x, [k]: value }))
    setFrame(k === 'since' ? 'Since' : k === 'from' || k === 'to' ? 'Between' : 'In Last')
  }
  const inFrame = (date: string) => {
    if (!date) return frame === 'All'
    if (frame === 'All') return true
    if (frame === 'Since') return !v.since || date >= v.since
    if (frame === 'Between') return (!v.from || date >= v.from) && (!v.to || date <= v.to)
    const n = Number(v.n) || 0
    const days = v.unit === 'weeks' ? n * 7 : v.unit === 'months' ? n * 30 : v.unit === 'years' ? n * 365 : n
    return date >= shiftStamp(PBF_TODAY, -days)
  }
  return { frame, setFrame, v, set, inFrame }
}

/* --- Primary Care Physician Compensation Management (the dashboard) --------- */

export function PbfDashboardView({ onOpenNode }: PbfViewProps) {
  const s = useBillingPrograms()
  const host = usePBInstrumentation()
  useEffect(() => { billingPrograms.syncFromCharts() }, [])
  const requested = s.crs.filter((c) => c.status === 'REQUESTED')
  const bySource = (['clinic', 'msp'] as const).map((src) => ({ label: src === 'clinic' ? 'Clinic User' : 'MSP', n: requested.filter((c) => c.source === src).length })).filter((x) => x.n)
  const count = (state: EnrolmentClaim['state']) => {
    const m = new Map<string, number>()
    s.claims.filter((c) => c.state === state).forEach((c) => m.set(c.fee, (m.get(c.fee) ?? 0) + 1))
    return [...m].map(([fee, n]) => ({ label: feeCaption(fee), n }))
  }
  const errors = new Map<string, number>()
  s.mspErrors.filter((m) => m.result !== 'ok' && !m.deleted).forEach((m) => {
    const k = `[${m.request === 'Registration' ? 'R' : 'D'}] ${m.message}`
    errors.set(k, (errors.get(k) ?? 0) + 1)
  })
  const sections: { title: string; node: string; lines: { label: string; n: number }[] }[] = [
    { title: 'Patient Enrollment Requests', node: 'bl-pbf-cr', lines: bySource },
    { title: 'Unsent Enrollment Claims', node: 'bl-pbf-unsent', lines: count('unsent') },
    { title: 'Unacknowledged Enrollment Claims', node: 'bl-pbf-unack', lines: count('unack') },
    { title: 'Failed Enrollment Claims', node: 'bl-pbf-failed', lines: count('failed') },
    { title: 'MSP Enrollment Request Errors', node: 'bl-pbf-review', lines: [...errors].map(([label, n]) => ({ label, n })) },
  ]
  useScreenReport({ outstanding: sections.reduce((n, x) => n + x.lines.reduce((m, l) => m + l.n, 0), 0) })
  return (
    <>
      <PBViewHeader title="Primary Care Physician Compensation Management" />
      <div style={{ flex: '1 1 auto', overflowY: 'auto', background: '#fff' }}>
        {sections.filter((x) => x.lines.length).map((x) => (
          <div key={x.node} data-tutorial-id={host?.anchor('group', `pbf-dashboard-${pbSlug(x.title)}`)}>
            <div style={{ background: '#dcd7d2', fontWeight: 700, padding: '4px 8px', borderBottom: '1px solid #b0b0b0' }}>{x.title}</div>
            {x.lines.map((l) => (
              <PBButton
                key={l.label}
                bare
                command={`pbf-dashboard-${pbSlug(l.label)}`}
                onClick={() => onOpenNode?.(x.node)}
                style={{ display: 'flex', width: '100%', border: 0, background: 'none', padding: '4px 8px 4px 24px', font: 'inherit', textAlign: 'left', cursor: 'pointer' }}
              >
                <span style={{ flex: '1 1 auto' }}>{l.label}</span><span style={{ width: 200 }}>{l.n}</span>
              </PBButton>
            ))}
          </div>
        ))}
      </div>
    </>
  )
}

/* --- PBF Patient Enrollment ------------------------------------------------- */

type EnrolFilter = 'Currently Active' | 'Registered Start Date' | 'Registered Stop Date'

export function PbfEnrolmentView({ onClose, onOpenChart }: PbfViewProps) {
  const s = useBillingPrograms()
  const win = useScreenWindow()
  const openWindow = useOpenWindow()
  const [provider, setProvider] = useState('')
  const [statuses, setStatuses] = useState('')
  const [last, setLast] = useState('')
  const [first, setFirst] = useState('')
  const [contact, setContact] = useState('Ignore')
  const [enrol, setEnrol] = useState<EnrolFilter>('Currently Active')
  const [when, setWhen] = useState('In the last')
  const [amount, setAmount] = useState('3')
  const [unit, setUnit] = useState('months')
  const [cur, setCur] = useState(0)
  const [notice, setNotice] = useState('')

  const rows = useMemo(() => s.enrolments.filter((e) => {
    if (e.startStatus !== 'Registered' && enrol === 'Currently Active') return false
    if (provider === 'Unattached' ? !!e.provider : provider && e.provider !== provider) return false
    const codes = statuses.split(',').map((x) => x.trim().toUpperCase()).filter(Boolean)
    if (codes.length && !codes.includes(e.status)) return false
    if (last && !e.last.toLowerCase().startsWith(last.toLowerCase())) return false
    if (first && !e.first.toLowerCase().startsWith(first.toLowerCase())) return false
    if (enrol === 'Currently Active') return isEnrolledNow(e)
    const date = enrol === 'Registered Start Date' ? e.start : e.stop
    if (!date) return false
    const n = Number(amount) || 0
    const days = unit === 'weeks' ? n * 7 : unit === 'months' ? n * 30 : n * 365
    if (when === 'In the last') return date <= PBF_TODAY && date >= shiftStamp(PBF_TODAY, -days)
    if (when === 'In the next') return date >= PBF_TODAY && date <= shiftStamp(PBF_TODAY, days)
    return true
  }), [s.enrolments, provider, statuses, last, first, enrol, when, amount, unit])
  const current = rows[cur]
  const edit = () => { if (current) win.open(PBF_WINDOWS.plan, { chart: current.chart, mode: 'edit' }) }
  useScreenReport({ rows: rows.length, row: current ? rowSlug(current.chart) : null, enrollment: pbSlug(enrol) })

  return (
    <>
      <PBViewHeader title="PBF Patient Enrollment" />
      <PBCommandRow commands={[
        { label: 'Edit', onClick: edit },
        { label: 'Refresh', onClick: () => setCur(0) },
        { label: 'Change Service Provider', onClick: () => { if (current) win.open(PBF_WINDOWS.provider, { chart: current.chart }) } },
        { label: 'Print', onClick: () => setNotice(`The enrollment list (${rows.length} patients) was sent to the printer.`) },
        { label: 'CSV Output', onClick: () => setNotice(`pbf_enrollment_${PBF_TODAY.replace(/\./g, '')}.csv was written (${rows.length} rows).`) },
        { label: 'Chart Navigator', onClick: () => openWindow('chart-navigator', { charts: rows.map((r) => r.chart) }) },
        { label: 'Close Window', onClick: onClose },
      ]} />
      <div className="pb-row" style={{ alignItems: 'stretch', gap: 8, padding: '4px 6px', flex: 'none', flexWrap: 'wrap' }}>
        <FilterGroup title="Selection Parameters">
          <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', columnGap: 8, rowGap: 3, alignItems: 'center' }}>
            <span className="pb-form__label">Provider:</span>
            <span data-tutorial-id="host.mois.field.pbf-enrol-provider"><PBSelect w={260} options={['', 'Unattached', ...providerOptions]} value={provider} onChange={(e) => setProvider(e.target.value)} /></span>
            <span className="pb-form__label">Patient Status:</span>
            <PBLookup w={260} value={statuses} onChange={setStatuses} name="pbf-patient-status" fieldId="host.mois.field.pbf-enrol-patient-status" placeholder="A,TR" />
            <span className="pb-form__label">Last Name:</span>
            <PBInput w={190} value={last} onChange={(e) => setLast(e.target.value)} data-tutorial-id="host.mois.field.pbf-enrol-last-name" />
            <span className="pb-form__label">First Name:</span>
            <PBInput w={190} value={first} onChange={(e) => setFirst(e.target.value)} data-tutorial-id="host.mois.field.pbf-enrol-first-name" />
            <span className="pb-form__label">Last Contact:</span>
            <span data-tutorial-id="host.mois.field.pbf-enrol-last-contact"><PBSelect w={140} options={['Ignore', 'In Last X yrs', 'Not in the Last X yrs', 'After', 'Before']} value={contact} onChange={(e) => setContact(e.target.value)} /></span>
          </div>
        </FilterGroup>
        <FilterGroup title="Enrollment Status" style={{ flex: '1 1 300px' }}>
          <div className="pb-row" style={{ gap: 8 }}>
            <span className="pb-form__label">Enrollment:</span>
            <span data-tutorial-id="host.mois.field.pbf-enrollment-status"><PBSelect w={260} options={['Currently Active', 'Registered Start Date', 'Registered Stop Date']} value={enrol} onChange={(e) => { setEnrol(e.target.value as EnrolFilter); setCur(0) }} /></span>
          </div>
          {enrol !== 'Currently Active' && (
            <div className="pb-row" style={{ gap: 6, paddingTop: 4, paddingLeft: 74 }}>
              <PBSelect w={100} options={['In the last', 'In the next', 'Between']} value={when} onChange={(e) => setWhen(e.target.value)} />
              <PBInput w={40} value={amount} onChange={(e) => setAmount(e.target.value)} data-tutorial-id="host.mois.field.pbf-enrol-amount" />
              <PBSelect w={80} options={['weeks', 'months', 'years']} value={unit} onChange={(e) => setUnit(e.target.value)} />
            </div>
          )}
        </FilterGroup>
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3 }}>
        <PBDataWindow
          columns={[
            { key: 'chart', header: 'Chart', width: 52, align: 'right' },
            { key: 'last', header: 'Last Name', width: 130 },
            { key: 'first', header: 'First Name', width: 110 },
            { key: 'sex', header: '', width: 23, align: 'center' },
            { key: 'dob', header: 'DoB', width: 78, align: 'center' },
            { key: 'insurance', header: 'Insurance Nbr.', width: 92 },
            { key: 'by', header: 'By', width: 34, align: 'center' },
            { key: 'status', header: 'Status', width: 44, align: 'center' },
            { key: 'start', header: 'Start', width: 76, align: 'center', render: (e) => <span style={{ color: e.startStatus === 'Registered' ? undefined : '#9a9a9a' }}>{e.start}</span> },
            { key: 'stop', header: 'Stop', width: 76, align: 'center', render: (e) => <span style={{ color: '#9a9a9a' }}>{e.stop}</span> },
            { key: 'provider', header: 'Service Provider', width: 170 },
          ]}
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
          onActivate={() => edit()}
          rowTutorialId={(e) => `host.mois.row.${rowSlug(e.chart)}`}
          empty=" "
        />
      </div>
      {notice && <Ask id="pbf-enrol-notice" title="PBF Patient Enrollment" icon="info" buttons={[{ label: 'OK', value: 'ok', default: true }]} onAnswer={() => setNotice('')}>{notice}</Ask>}
      <PbfWindows onOpenChart={onOpenChart} />
    </>
  )
}

/* --- MSP Eligibility Requests ------------------------------------------------ */

type EligStatus = 'All Records' | 'New' | 'Submitted' | 'Processed' | 'Failed'

export function PbfEligibilityView({ onClose, onOpenChart }: PbfViewProps) {
  const s = useBillingPrograms()
  const win = useScreenWindow()
  const tf = useTimeFrame()
  const [status, setStatus] = useState<EligStatus>('All Records')
  const [last, setLast] = useState('')
  const [ins, setIns] = useState('')
  const [applied, setApplied] = useState({ last: '', ins: '' })
  const [cur, setCur] = useState(0)
  const rows = s.eligibility.filter((e) => {
    const p = patientOf(e.chart)
    if (status !== 'All Records' && e.status !== status.toUpperCase()) return false
    if (!tf.inFrame(e.date)) return false
    if (applied.last && !(p?.last ?? '').toLowerCase().startsWith(applied.last.toLowerCase())) return false
    if (applied.ins && !(p?.insurance ?? '').replace(/\s/g, '').startsWith(applied.ins)) return false
    return true
  })
  const current = rows[cur]
  useScreenReport({ rows: rows.length, row: current ? rowSlug(current.chart) : null, eligibilityStatus: current ? current.status.toLowerCase() : null })
  return (
    <>
      <PBViewHeader title="MSP Eligibility Requests" />
      <PBCommandRow commands={[
        { label: 'New', onClick: () => win.open(PBF_WINDOWS.eligibility, {}) },
        { label: 'Delete', disabled: current?.status !== 'NEW', onClick: () => { if (current) billingPrograms.deleteEligibility(current.id) } },
        { label: 'Open Chart', onClick: () => { if (current) onOpenChart?.(current.chart) } },
        { label: 'Close Window', onClick: onClose },
      ]} />
      <div className="pb-row" style={{ alignItems: 'stretch', gap: 8, padding: '4px 6px', flex: 'none', flexWrap: 'wrap' }}>
        <FilterGroup title="Status"><RadioSet group="pbf-eligibility-status" options={['All Records', 'Processed', 'New', 'Failed', 'Submitted'] as EligStatus[]} value={status} onChange={setStatus} columns={2} /></FilterGroup>
        <FilterGroup title="Time Frame (status date)"><TimeFrame group="pbf-eligibility-time" value={tf.frame} onChange={tf.setFrame} {...tf.v} set={tf.set} /></FilterGroup>
        <FilterGroup title="Other" style={{ flex: '1 1 260px' }}>
          <Field id="pbf-eligibility-last-name" label="Last Name:" labelW={80} value={last} onChange={setLast} w={190} />
          <Field id="pbf-eligibility-insurance" label="Insurance No.:" labelW={80} value={ins} onChange={setIns} w={120} />
          <div className="pb-row" style={{ justifyContent: 'flex-end', paddingTop: 6 }}>
            <PBCommandRow commands={[{ label: 'Refresh', onClick: () => setApplied({ last, ins }) }]} />
          </div>
        </FilterGroup>
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3 }}>
        <PBDataWindow
          columns={[
            { key: 'last', header: 'Last Name', width: 116, render: (e) => patientOf(e.chart)?.last ?? '' },
            { key: 'first', header: 'First Name', width: 96, render: (e) => patientOf(e.chart)?.first ?? '' },
            { key: 'sex', header: '', width: 21, align: 'center', render: (e) => patientOf(e.chart)?.gender ?? '' },
            { key: 'dob', header: 'DoB', width: 80, align: 'center', render: (e) => patientOf(e.chart)?.dob ?? '' },
            { key: 'insurance', header: 'Insurance No.', width: 96, render: (e) => (patientOf(e.chart)?.insurance ?? '').replace(/\s/g, '') },
            { key: 'provider', header: 'Service Provider', width: 160 },
            { key: 'date', header: 'Status Date', width: 80, align: 'center' },
            { key: 'status', header: 'Status', width: 90, align: 'center' },
            { key: 'outcome', header: 'Outcome', width: 170 },
          ]}
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
          rowTutorialId={(e) => `host.mois.row.${rowSlug(e.chart)}`}
          empty=" "
        />
      </div>
      <PbfWindows onOpenChart={onOpenChart} />
    </>
  )
}

/* --- Enrollment Change Requests (CR) ----------------------------------------- */

type CrStatus = 'New CR' | 'Approved CR' | 'Rejected CR' | 'All CR'
type CrSource = 'Clinic User' | 'MSP' | 'Both'

export function PbfCrView({ onClose, onOpenChart }: PbfViewProps) {
  const s = useBillingPrograms()
  const win = useScreenWindow()
  const tf = useTimeFrame()
  const [tab, setTab] = useState('Enroll Requests')
  const [status, setStatus] = useState<CrStatus>('New CR')
  const [source, setSource] = useState<CrSource>('Both')
  const [by, setBy] = useState('')
  const [last, setLast] = useState('')
  const [cur, setCur] = useState(0)
  const [blocked, setBlocked] = useState(false)
  useEffect(() => { billingPrograms.syncFromCharts() }, [])

  const kind = tab === 'Enroll Requests' ? 'enroll' : 'unenroll'
  const rows = s.crs.filter((c) => {
    if (c.kind !== kind) return false
    if (status !== 'All CR' && c.status !== { 'New CR': 'REQUESTED', 'Approved CR': 'APPROVED', 'Rejected CR': 'REJECTED' }[status]) return false
    if (source !== 'Both' && c.source !== (source === 'MSP' ? 'msp' : 'clinic')) return false
    if (!tf.inFrame(c.requested)) return false
    if (by && !c.person.toLowerCase().startsWith(by.toLowerCase())) return false
    if (last && !(patientOf(c.chart)?.last ?? '').toLowerCase().startsWith(last.toLowerCase())) return false
    return true
  })
  const current = rows[cur]
  useScreenReport({ rows: rows.length, row: current ? rowSlug(current.chart) : null, crStatus: current ? current.status.toLowerCase() : null, prompt: blocked ? 'pbf-cr-undo-blocked' : null })

  const actions = (c: ChangeRequest): ReactNode => (
    c.status === 'REQUESTED'
      ? <span className="pb-row" style={{ gap: 3 }}>
          <CellButton id={`pbf-cr-approve-${c.chart}`} title="Approve" onClick={() => billingPrograms.decideCr(c.id, 'APPROVED')}><span style={{ color: '#1f8a2c', fontWeight: 700 }}>✓</span></CellButton>
          <CellButton id={`pbf-cr-reject-${c.chart}`} title="Reject" onClick={() => billingPrograms.decideCr(c.id, 'REJECTED')}><span style={{ color: '#c00000', fontWeight: 700 }}>⃠</span></CellButton>
        </span>
      : <CellButton id={`pbf-cr-undo-${c.chart}`} title="Undo" onClick={() => { if (!billingPrograms.undoCr(c.id)) setBlocked(true) }}><span style={{ color: '#c9a400', fontWeight: 700 }}>↶</span></CellButton>
  )

  return (
    <>
      <PBViewHeader title="Enrollment Change Requests (CR)" />
      <PBCommandRow commands={[
        { label: 'Refresh', onClick: () => billingPrograms.syncFromCharts() },
        { label: 'Tear Off', onClick: () => { if (current) onOpenChart?.(current.chart) } },
        { label: 'Close Window', onClick: onClose },
      ]} />
      <div className="pb-row" style={{ alignItems: 'stretch', gap: 8, padding: '4px 6px', flex: 'none', flexWrap: 'wrap' }}>
        <FilterGroup title="Request Status"><RadioSet group="pbf-cr-status" options={['New CR', 'Approved CR', 'Rejected CR', 'All CR'] as CrStatus[]} value={status} onChange={(v) => { setStatus(v); setCur(0) }} columns={1} /></FilterGroup>
        <FilterGroup title="Time Frame"><TimeFrame group="pbf-cr-time" value={tf.frame} onChange={tf.setFrame} {...tf.v} set={tf.set} /></FilterGroup>
        <FilterGroup title="Optional Parameters" style={{ flex: '1 1 320px' }}>
          <div>Source of Change Request / Suggestion</div>
          <div style={{ paddingLeft: 14 }}><RadioSet group="pbf-cr-source" options={['Clinic User', 'MSP', 'Both'] as CrSource[]} value={source} onChange={setSource} /></div>
          <Field id="pbf-cr-requested-by" label="Requested By:" labelW={110} value={by} onChange={setBy} w={220} />
          <Field id="pbf-cr-patient-last-name" label="Patient Last Name:" labelW={110} value={last} onChange={setLast} w={220} />
        </FilterGroup>
      </div>
      <PBTabs tabs={['Enroll Requests', 'Unenroll Requests']} active={tab} onChange={(t) => { setTab(t); setCur(0) }}>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
          <PBDataWindow
            columns={[
              { key: 'chart', header: <>Patient<br />Chart</>, width: 56, align: 'right' },
              { key: 'patient', header: <><br />Patient</>, width: 230, render: (c) => patientCaption(c.chart) },
              { key: 'date', header: <>{kind === 'enroll' ? 'Enrollment' : 'Unenrollment'}<br />Requested Date</>, width: 86 },
              { key: 'act', header: '', width: 64, render: actions },
              { key: 'status', header: 'Status', width: 90, align: 'center' },
              { key: 'reason', header: 'Reason', width: 54, align: 'center' },
              { key: 'person', header: <>Requested By<br />Person</>, width: 130 },
              { key: 'requested', header: <><br />Date</>, width: 80, align: 'center' },
              { key: 'detail', header: '', width: 66, render: (c) => <CellButton id={`pbf-cr-detail-${c.chart}`} width={58} onClick={() => win.open(PBF_WINDOWS.plan, { chart: c.chart, mode: 'detail' })}>Detail</CellButton> },
            ]}
            rows={rows}
            current={cur}
            onCurrentChange={setCur}
            rowTutorialId={(c) => `host.mois.row.${rowSlug(c.chart)}`}
            empty=" "
          />
        </div>
      </PBTabs>
      {blocked && (
        <Ask id="pbf-cr-undo-blocked" title="Enrollment Change Requests" icon="warn" buttons={[{ label: 'OK', value: 'ok', default: true }]} onAnswer={() => setBlocked(false)}>
          The enrollment claim for this change request has already been sent to MSP. It can no longer be undone.
        </Ask>
      )}
      <PbfWindows onOpenChart={onOpenChart} />
    </>
  )
}

/* --- the three enrolment claim lists ---------------------------------------- */

function ClaimList({ state, title, onClose, onOpenChart }: { state: 'unsent' | 'unack' | 'failed' } & { title: string } & Pick<PbfViewProps, 'onClose' | 'onOpenChart'>) {
  const s = useBillingPrograms()
  const win = useScreenWindow()
  const [cur, setCur] = useState(0)
  const [confirm, setConfirm] = useState(false)
  const [filters, setFilters] = useState({ last: '', first: '', doctor: '' })
  const rows = s.claims.filter((c) => c.state === state).filter((c) => {
    const p = patientOf(c.chart)
    return (!filters.last || (p?.last ?? '').toLowerCase().startsWith(filters.last.toLowerCase()))
      && (!filters.first || (p?.first ?? '').toLowerCase().startsWith(filters.first.toLowerCase()))
      && (!filters.doctor || c.doctor.toLowerCase().startsWith(filters.doctor.toLowerCase()))
  })
  const current = rows[cur]
  const edit = () => { if (current) win.open(PBF_WINDOWS.claim, { id: current.id }) }
  useScreenReport({ rows: rows.length, row: current ? rowSlug(current.chart) : null, prompt: confirm ? 'pbf-delete-claim' : null })
  const filter = (k: keyof typeof filters, w: number) => (
    <PBInput w={w} value={filters[k]} onChange={(e) => setFilters((f) => ({ ...f, [k]: e.target.value }))} data-tutorial-id={`host.mois.field.pbf-${state}-filter-${k}`} />
  )
  const p = (c: EnrolmentClaim) => patientOf(c.chart)
  const reconCols = state === 'unsent' ? [] : [
    { key: 'r1', header: 'R1', width: 34, align: 'center' as const },
    { key: 'r2', header: 'R2', width: 33, align: 'center' as const },
    { key: 'wo', header: 'WO', width: 33, align: 'center' as const },
  ]
  return (
    <>
      <PBViewHeader title={title} />
      <PBCommandRow commands={[
        ...(state === 'unsent' ? [{ label: 'Delete Record', onClick: () => { if (current) setConfirm(true) } }] : []),
        { label: 'Edit Record', onClick: edit },
        { label: 'Close Window', onClick: onClose },
      ]} />
      <div className="pb-row" style={{ gap: 3, padding: '3px 6px 3px 20px', flex: 'none', background: '#e4e1de' }}>
        {state !== 'unsent' && <span style={{ width: 96 }}><PBCheckbox checked /></span>}
        {filter('last', state === 'unsent' ? 124 : 146)}{filter('first', 120)}<span style={{ width: 70 }} />{filter('doctor', 143)}
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3 }}>
        <PBDataWindow
          columns={[
            ...reconCols,
            { key: 'last', header: 'Last Name', width: 146, render: (c) => p(c)?.last ?? '' },
            { key: 'first', header: 'First Name', width: 120, render: (c) => p(c)?.first ?? '' },
            { key: 'fee', header: 'Fee Code', width: 70 },
            { key: 'doctor', header: 'Doctor', width: 150 },
            { key: 'loc', header: 'Loc', width: 34, align: 'center' },
            { key: 'service', header: 'Service', width: 76, align: 'center' },
            ...(state === 'unsent' ? [
              { key: 'dob', header: 'DoB', width: 76, align: 'center' as const, render: (c: EnrolmentClaim) => p(c)?.dob ?? '' },
              { key: 'insrBy', header: 'Insr By', width: 46, align: 'center' as const, render: (c: EnrolmentClaim) => p(c)?.insuranceBy ?? 'BC' },
              { key: 'insrNbr', header: 'Insr Nbr', width: 90, render: (c: EnrolmentClaim) => (p(c)?.insurance ?? '').replace(/\s/g, '') },
              { key: 'compl', header: 'Compl', width: 42, align: 'center' as const, render: (c: EnrolmentClaim) => <PBCheckbox checked={c.compl} onChange={(v) => billingPrograms.updateClaim(c.id, { compl: v })} /> },
              { key: 'hold', header: 'Hold', width: 42, align: 'center' as const, render: (c: EnrolmentClaim) => <PBCheckbox checked={c.hold} onChange={(v) => billingPrograms.updateClaim(c.id, { hold: v })} /> },
            ] : []),
            ...(state === 'failed' ? [
              { key: 'e1', header: 'E1', width: 33, align: 'center' as const },
              { key: 'e2', header: 'E2', width: 34, align: 'center' as const },
              { key: 'e3', header: 'E3', width: 36, align: 'center' as const },
            ] : []),
          ]}
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
          onActivate={() => edit()}
          rowTutorialId={(c) => `host.mois.row.${rowSlug(c.chart)}`}
          empty=" "
        />
      </div>
      {confirm && current && (
        <Ask id="pbf-delete-claim" title="Delete Record" buttons={[{ label: 'Yes', value: 'yes', default: true }, { label: 'No', value: 'no' }]}
          onAnswer={(v) => { setConfirm(false); if (v === 'yes') { billingPrograms.deleteUnsentClaim(current.id); setCur(0) } }}>
          Delete the {current.fee} claim for {patientName(current.chart)}? The related change request goes back to Requested.
        </Ask>
      )}
      <PbfWindows onOpenChart={onOpenChart} />
    </>
  )
}

export const PbfUnsentView = (p: PbfViewProps) => <ClaimList state="unsent" title="Unsent Enrollment Claims List" {...p} />
export const PbfUnackView = (p: PbfViewProps) => <ClaimList state="unack" title="Unack Enrollment Claims List" {...p} />
export const PbfFailedView = (p: PbfViewProps) => <ClaimList state="failed" title="Failed Enrollment Claims List" {...p} />

/* --- MSP CR Review (MSP Enrollment Change Requests) --------------------------- */

type RecordsType = 'All Errors' | 'Chart Matching Error' | 'Enrollment Conflict Error' | 'Successfully Processed'

export function PbfMspCrView({ onClose, onOpenChart }: PbfViewProps) {
  const s = useBillingPrograms()
  const win = useScreenWindow()
  const tf = useTimeFrame()
  const [type, setType] = useState<RecordsType>('All Errors')
  const [request, setRequest] = useState('All')
  const [last, setLast] = useState('')
  const [phn, setPhn] = useState('')
  const [cur, setCur] = useState(0)
  const [ask, setAsk] = useState<null | { kind: 'delete' | 'result'; id: string; text: string }>(null)
  const rows = s.mspErrors.filter((m) => {
    if (m.deleted) return false
    if (type === 'All Errors' && m.result === 'ok') return false
    if (type === 'Chart Matching Error' && m.result !== 'chart') return false
    if (type === 'Enrollment Conflict Error' && m.result !== 'conflict') return false
    if (type === 'Successfully Processed' && m.result !== 'ok') return false
    if (request !== 'All' && m.request !== request) return false
    if (!tf.inFrame(m.received)) return false
    if (last && !m.last.toLowerCase().startsWith(last.toLowerCase())) return false
    if (phn && !m.phn.startsWith(phn)) return false
    return true
  })
  const current = rows[cur]
  const replay = (id: string) => {
    const r = billingPrograms.replayMspError(id)
    setAsk({ kind: 'result', id, text: r === 'ok' ? 'The change request was processed successfully.' : 'The change request could not be processed. Review the Record Status.' })
  }
  useScreenReport({ rows: rows.length, row: current ? `pbf-msp-${pbSlug(current.last)}` : null, recordStatus: current ? current.result : null, prompt: ask ? `pbf-msp-cr-${ask.kind}` : null })
  return (
    <>
      <PBViewHeader title="MSP Enrollment Change Requests" />
      <PBCommandRow commands={[
        { label: 'Refresh', onClick: () => setCur(0) },
        { label: 'Delete', onClick: () => { if (current) setAsk({ kind: 'delete', id: current.id, text: `Delete the MSP change request for ${current.last}, ${current.first}?` }) } },
        { label: 'Open Chart', onClick: () => { if (current?.chart && current.result !== 'chart') onOpenChart?.(current.chart) } },
        { label: 'Replay', onClick: () => { if (current) replay(current.id) } },
        { label: 'Close Window', onClick: onClose },
      ]} />
      <div className="pb-row" style={{ alignItems: 'stretch', gap: 8, padding: '4px 6px', flex: 'none', flexWrap: 'wrap' }}>
        <FilterGroup title="Records Type"><RadioSet group="pbf-msp-records" options={['All Errors', 'Chart Matching Error', 'Enrollment Conflict Error', 'Successfully Processed'] as RecordsType[]} value={type} onChange={(v) => { setType(v); setCur(0) }} columns={1} /></FilterGroup>
        <FilterGroup title="Time Frame (received date)"><TimeFrame group="pbf-msp-time" value={tf.frame} onChange={tf.setFrame} {...tf.v} set={tf.set} /></FilterGroup>
        <FilterGroup title="Other" style={{ flex: '1 1 260px' }}>
          <div className="pb-row" style={{ gap: 6 }}>
            <span className="pb-form__label" style={{ width: 80 }}>Request Type:</span>
            <span data-tutorial-id="host.mois.field.pbf-msp-request-type"><PBSelect w={120} options={[{ value: 'All', label: 'All' }, { value: 'Registration', label: 'Registration' }, { value: 'Deregistation', label: 'Deregistation' }]} value={request} onChange={(e) => setRequest(e.target.value)} /></span>
          </div>
          <Field id="pbf-msp-last-name" label="Last Name:" labelW={80} value={last} onChange={setLast} w={190} />
          <Field id="pbf-msp-phn" label="PHN:" labelW={80} value={phn} onChange={setPhn} w={120} />
        </FilterGroup>
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3 }}>
        <PBDataWindow
          columns={[
            { key: 'last', header: 'Last Name', width: 116 },
            { key: 'first', header: 'First Name', width: 96 },
            { key: 'sex', header: '', width: 21, align: 'center' },
            { key: 'dob', header: 'DoB', width: 78, align: 'center' },
            { key: 'phn', header: 'PHN', width: 86 },
            { key: 'request', header: 'Request', width: 90 },
            { key: 'reason', header: 'Reason', width: 50, align: 'center' },
            { key: 'message', header: 'Record Status', width: 220 },
            { key: 'detail', header: '-', width: 44, align: 'center', render: (m) => <CellLink id={`pbf-msp-detail-${pbSlug(m.last)}`} onClick={() => win.open(PBF_WINDOWS.mspDetail, { id: m.id })}>Detail</CellLink> },
            { key: 'delete', header: '-', width: 46, align: 'center', render: (m) => <CellLink id={`pbf-msp-delete-${pbSlug(m.last)}`} onClick={() => setAsk({ kind: 'delete', id: m.id, text: `Delete the MSP change request for ${m.last}, ${m.first}?` })}>Delete</CellLink> },
            { key: 'replay', header: '-', width: 48, align: 'center', render: (m) => <CellLink id={`pbf-msp-replay-${pbSlug(m.last)}`} disabled={m.result === 'ok'} onClick={() => replay(m.id)}>Replay</CellLink> },
          ]}
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
          rowTutorialId={(m) => `host.mois.row.pbf-msp-${pbSlug(m.last)}-${m.id}`}
          empty=" "
        />
      </div>
      {ask && (
        <Ask
          id={`pbf-msp-cr-${ask.kind}`}
          title="MSP Enrollment Change Requests"
          icon={ask.kind === 'delete' ? 'question' : 'info'}
          buttons={ask.kind === 'delete' ? [{ label: 'Yes', value: 'yes', default: true }, { label: 'No', value: 'no' }] : [{ label: 'OK', value: 'ok', default: true }]}
          onAnswer={(v) => { if (ask.kind === 'delete' && v === 'yes') { billingPrograms.deleteMspError(ask.id); setCur(0) } setAsk(null) }}
        >
          {ask.text}
        </Ask>
      )}
      <PbfWindows onOpenChart={onOpenChart} />
    </>
  )
}

/* --- Enrollment Claim History ------------------------------------------------ */

export function PbfHistoryView({ onClose, onOpenChart }: PbfViewProps) {
  const s = useBillingPrograms()
  const win = useScreenWindow()
  const tf = useTimeFrame()
  const [chart, setChart] = useState('')
  const [fee, setFee] = useState('')
  const [dateKind, setDateKind] = useState<'Sent Date' | 'Paid Date'>('Sent Date')
  const [r1, setR1] = useState(''); const [r1All, setR1All] = useState(true)
  const [r2, setR2] = useState(''); const [r2All, setR2All] = useState(true)
  const [cur, setCur] = useState(0)
  const rows = s.claims.filter((c) => c.state !== 'unsent').filter((c) => (
    (!chart || c.chart === chart.trim()) && (!fee || c.fee === fee.trim())
    && tf.inFrame(c.sent || c.service)
    && (r1All || c.r1 === r1.trim().toUpperCase()) && (r2All || c.r2 === r2.trim().toUpperCase())
  )).sort((a, b) => (patientOf(a.chart)?.last ?? '').localeCompare(patientOf(b.chart)?.last ?? ''))
  const current = rows[cur]
  useScreenReport({ rows: rows.length, row: current ? rowSlug(current.chart) : null })
  return (
    <>
      <PBViewHeader title="Enrollment Claim History" />
      <PBCommandRow commands={[{ label: 'Refresh', onClick: () => setCur(0) }, { label: 'Close Window', onClick: onClose }]} />
      <div className="pb-row" style={{ alignItems: 'stretch', gap: 8, padding: '4px 6px', flex: 'none', flexWrap: 'wrap' }}>
        <FilterGroup title="History For">
          <div className="pb-row" style={{ gap: 6 }}><span className="pb-form__label" style={{ width: 62 }}>Chart:</span><PBLookup w={124} value={chart} onChange={setChart} name="pbf-history-chart" fieldId="host.mois.field.pbf-history-chart" /></div>
          <div className="pb-row" style={{ gap: 6, paddingTop: 3 }}><span className="pb-form__label" style={{ width: 62 }}>Fee Code:</span><PBLookup w={124} value={fee} onChange={setFee} name="pbf-history-fee" fieldId="host.mois.field.pbf-history-fee-code" /></div>
        </FilterGroup>
        <FilterGroup title="Time Frame">
          <div className="pb-row" style={{ alignItems: 'flex-start', gap: 14 }}>
            <RadioSet group="pbf-history-date" options={['Sent Date', 'Paid Date'] as const} value={dateKind} onChange={setDateKind} columns={1} />
            <TimeFrame group="pbf-history-time" value={tf.frame} onChange={tf.setFrame} {...tf.v} set={tf.set} />
          </div>
        </FilterGroup>
        <FilterGroup title="Requested By">
          <div className="pb-row" style={{ gap: 6 }}><span className="pb-form__label">Recon Code 1:</span><PBInput w={32} value={r1} readOnly={r1All} onChange={(e) => setR1(e.target.value)} data-tutorial-id="host.mois.field.pbf-history-r1" /><PBCheckbox label="Include All" checked={r1All} onChange={setR1All} tutorialId="host.mois.field.pbf-history-r1-all" /></div>
          <div className="pb-row" style={{ gap: 6, paddingTop: 3 }}><span className="pb-form__label">Recon Code 2:</span><PBInput w={32} value={r2} readOnly={r2All} onChange={(e) => setR2(e.target.value)} data-tutorial-id="host.mois.field.pbf-history-r2" /><PBCheckbox label="Include All" checked={r2All} onChange={setR2All} tutorialId="host.mois.field.pbf-history-r2-all" /></div>
        </FilterGroup>
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3 }}>
        <PBDataWindow
          columns={[
            { key: 'r1', header: 'R1', width: 34, align: 'center' },
            { key: 'r2', header: 'R2', width: 33, align: 'center' },
            { key: 'wo', header: 'WO', width: 33, align: 'center' },
            { key: 'last', header: 'Last Name', width: 146, render: (c) => patientOf(c.chart)?.last ?? '' },
            { key: 'first', header: 'First Name', width: 120, render: (c) => patientOf(c.chart)?.first ?? '' },
            { key: 'fee', header: 'Fee Code', width: 70 },
            { key: 'doctor', header: 'Doctor', width: 150 },
            { key: 'loc', header: 'Loc', width: 30, align: 'center' },
            { key: 'service', header: 'Service', width: 76, align: 'center' },
            { key: 'e1', header: 'E1', width: 33, align: 'center' },
            { key: 'e2', header: 'E2', width: 34, align: 'center' },
            { key: 'e3', header: 'E3', width: 36, align: 'center' },
          ]}
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
          onActivate={(c) => win.open(PBF_WINDOWS.claim, { id: c.id })}
          rowTutorialId={(c) => `host.mois.row.${rowSlug(c.chart)}-${c.fee}`}
          empty=" "
        />
      </div>
      <PbfWindows onOpenChart={onOpenChart} />
    </>
  )
}

/* --- PCPC Complexity Index Calculator ----------------------------------------- */

type Output = 'Printable Report' | 'MoH File' | 'Chart Navigator' | 'CSV File'

export function PcpcCalculatorView({ onClose, onOpenChart }: PbfViewProps) {
  const s = useBillingPrograms()
  const win = useScreenWindow()
  const openWindow = useOpenWindow()
  const [include, setInclude] = useState<'PBF Enrolled' | 'Other'>('PBF Enrolled')
  const [statuses, setStatuses] = useState('A')
  const [contact, setContact] = useState('3')
  const [provider, setProvider] = useState<'All Providers' | 'Desktop Provider'>('All Providers')
  const [measure, setMeasure] = useState(true)
  const [output, setOutput] = useState<Output>('Printable Report')
  const [logging, setLogging] = useState(false)
  const [debug, setDebug] = useState(false)
  const [limit, setLimit] = useState(false)
  const [limitN, setLimitN] = useState('100')
  const [message, setMessage] = useState('')
  useScreenReport({
    include: pbSlug(include), primaryProvider: pbSlug(provider), addFinalIndex: measure, output: pbSlug(output),
    logging, debugging: debug, limitCharts: limit, pcpcRuns: s.pcpcRuns.length, prompt: message ? 'pcpc-message' : null,
  })

  const run = () => {
    let charts = include === 'PBF Enrolled'
      ? s.enrolments.filter((e) => isEnrolledNow(e)).map((e) => e.chart)
      : s.enrolments.filter((e) => !statuses.trim() || statuses.toUpperCase().split(',').map((x) => x.trim()).includes(e.status)).map((e) => e.chart)
    if (provider === 'Desktop Provider') charts = charts.filter((c) => enrolmentOf(s, c)?.provider === 'BEARDWOOD, WALTER')
    if (limit) charts = charts.slice(0, Number(limitN) || charts.length)
    const index = charts.length ? (charts.reduce((n, c) => n + Number(pcpcScore(c)), 0) / charts.length).toFixed(2) : '0.00'
    const stamp = `${PBF_TODAY} ${hhmm()}`
    const r = billingPrograms.recordPcpcRun({ date: stamp, include: include === 'PBF Enrolled' ? 'enrolled' : 'other', provider: provider === 'All Providers' ? 'all' : 'desktop', output, charts, index, measured: measure })
    if (output === 'Printable Report') win.open(PBF_WINDOWS.report, { run: r.id })
    else if (output === 'Chart Navigator') openWindow('chart-navigator', { charts })
    else setMessage(`${output === 'MoH File' ? 'The MoH file' : 'The CSV file'} was written for ${charts.length} patients${measure ? `; a Final Index measure (${s.pbf.indexCode}) was added to each chart` : ''}.`)
  }

  const section = (title: string) => <SectionCaption color={NAVY.billing} padding="10px 10px 2px" rule="#b8b8b8">{title}</SectionCaption>
  return (
    <>
      <PBViewHeader title="PCPC Complexity Index Calculator" />
      <PBCommandRow commands={[{ label: 'Close Window', onClick: onClose }]} />
      <div style={{ flex: '1 1 auto', overflowY: 'auto', background: '#fff', margin: 3, border: '1px solid #a0a0a0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          <div>
            {section('Include Patients')}
            <div style={{ padding: '6px 14px' }} data-tutorial-id="host.mois.group.include-patients">
              <RadioSet group="pcpc-include" options={['PBF Enrolled', 'Other'] as const} value={include} onChange={setInclude} columns={1} />
              {include === 'Other' && (
                <div style={{ paddingLeft: 20, paddingTop: 4 }}>
                  <div className="pb-row" style={{ gap: 6 }}><span className="pb-form__label" style={{ width: 90 }}>Patient Status:</span><PBLookup w={140} value={statuses} onChange={setStatuses} name="pcpc-patient-status" fieldId="host.mois.field.pcpc-patient-status" /></div>
                  <div className="pb-row" style={{ gap: 6, paddingTop: 3 }}><span className="pb-form__label" style={{ width: 90 }}>Last Contact:</span><span>in the last</span><PBInput w={34} value={contact} onChange={(e) => setContact(e.target.value)} data-tutorial-id="host.mois.field.pcpc-last-contact" /><span>yrs</span></div>
                </div>
              )}
            </div>
          </div>
          <div>
            {section('Optional Filters')}
            <div className="pb-row" style={{ padding: '6px 14px', gap: 8, alignItems: 'flex-start' }}>
              <span>Primary Provider:</span>
              <RadioSet group="pcpc-provider" options={['All Providers', 'Desktop Provider'] as const} value={provider} onChange={setProvider} columns={1} />
            </div>
          </div>
        </div>
        {section('Patient Measurement')}
        <div style={{ padding: '6px 14px' }}><PBCheckbox label="Add a new Final Index record to each chart" checked={measure} onChange={setMeasure} tutorialId="host.mois.field.pcpc-add-final-index" /></div>
        {section('Direct Output to')}
        <div style={{ padding: '6px 14px' }}><RadioSet group="pcpc-output" options={['Printable Report', 'MoH File', 'Chart Navigator', 'CSV File'] as Output[]} value={output} onChange={setOutput} columns={1} /></div>
        {section('Trouble Shooting Options')}
        <div style={{ padding: '6px 14px', display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 10, rowGap: 3 }}>
          <PBCheckbox label="Turn On Logging" checked={logging} onChange={setLogging} tutorialId="host.mois.field.pcpc-logging" />
          <Dim>(Records additional information for each patient - could be used to investigate any issues)</Dim>
          <PBCheckbox label="Turn On Debugging" checked={debug} onChange={setDebug} tutorialId="host.mois.field.pcpc-debugging" />
          <Dim>(Records additional information for the patient panel - could be used to troubleshoot problems)</Dim>
          <PBCheckbox label="Limit Number of Charts" checked={limit} onChange={setLimit} tutorialId="host.mois.field.pcpc-limit" />
          <span>{limit && <PBInput w={50} value={limitN} onChange={(e) => setLimitN(e.target.value)} data-tutorial-id="host.mois.field.pcpc-limit-count" />}</span>
        </div>
      </div>
      <div className="pb-row" style={{ gap: 8, padding: '10px 14px', flex: 'none' }}>
        <PBCommandRow commands={[
          { label: 'Run Calculator', onClick: run },
          { label: 'Load Previous Results', onClick: () => win.open(PBF_WINDOWS.loadPrevious, { output, provider: provider === 'All Providers' ? 'all' : 'desktop' }) },
        ]} />
      </div>
      {message && <Ask id="pcpc-message" title="PCPC Complexity Index" icon="info" buttons={[{ label: 'OK', value: 'ok', default: true }]} onAnswer={() => setMessage('')}>{message}</Ask>}
      <PbfWindows onOpenChart={onOpenChart} />
    </>
  )
}

/* --- PBF Setup (PBF Configuration) ------------------------------------------ */

export function PbfConfigView({ onClose }: PbfViewProps) {
  const s = useBillingPrograms()
  const [d, setD] = useState<PbfConfig>(s.pbf)
  const [saved, setSaved] = useState(false)
  const [cur, setCur] = useState(0)
  const dirty = JSON.stringify(d) !== JSON.stringify(s.pbf)
  const set = (k: keyof PbfConfig) => (v: string | boolean) => { setD((x) => ({ ...x, [k]: v })); setSaved(false) }
  useScreenReport({ pbfActive: d.active, draft: dirty, saved: saved && !dirty, payees: d.payees.length })
  const head = (t: string, right?: ReactNode) => (
    <SectionCaption inner="b" color={NAVY.billing} padding="6px 10px 2px" rule="#b8b8b8" row right={right}>{t}</SectionCaption>
  )
  const note = <Dim>(please note, multiple entries should be comma separated)</Dim>
  const pair = (label: string, fee: keyof PbfConfig, diag: keyof PbfConfig) => (
    <>
      <span>{label}</span>
      <PBInput w={110} value={String(d[fee])} onChange={(e) => set(fee)(e.target.value)} data-tutorial-id={`host.mois.field.pbf-${pbSlug(label)}-fee`} />
      <PBInput w={110} value={String(d[diag])} onChange={(e) => set(diag)(e.target.value)} data-tutorial-id={`host.mois.field.pbf-${pbSlug(label)}-diag`} />
    </>
  )
  return (
    <>
      <PBViewHeader title="PBF Setup" />
      <PBCommandRow commands={[
        { label: 'Save', onClick: () => { billingPrograms.savePbfConfig(d); setSaved(true) } },
        { label: 'Close Window', onClick: onClose },
      ]} />
      <div style={{ flex: '1 1 auto', overflowY: 'auto', background: '#fff' }}>
        {head('Configuration')}
        <div style={{ padding: '4px 14px', display: 'flex', flexDirection: 'column', gap: 3 }}>
          <PBCheckbox label="Activate PBF / PCPC Funding Model" checked={d.active} onChange={set('active')} tutorialId="host.mois.field.pbf-activate" />
          <PBCheckbox label="Send Core Primary Care Claims to MSP" checked={d.sendCore} onChange={set('sendCore')} tutorialId="host.mois.field.pbf-send-core" />
          <PBCheckbox label="Convert Core Primary Care Service Claims to Standard PBF Service Code" checked={d.convertCore} onChange={set('convertCore')} tutorialId="host.mois.field.pbf-convert-core" />
          <Field id="pbf-standard-code" label="Standard PBF Service Code:" labelW={170} value={d.standardCode} onChange={set('standardCode')} w={90} align="center" />
        </div>
        {head('Core Primary Service Claim Exemptions')}
        <div style={{ padding: '4px 14px' }}>
          <div>Core Primary Care Service claims will be billed as Fee For Service (FFS) claims</div>
          <div>when one of the following conditions are met:</div>
          <div className="pb-row" style={{ gap: 6 }}><Field id="pbf-exempt-payors" label="Payor Code(s):" labelW={130} value={d.payors} onChange={set('payors')} w={290} />{note}</div>
          <div className="pb-row" style={{ gap: 6 }}><Field id="pbf-exempt-locations" label="Location Code(s):" labelW={130} value={d.locations} onChange={set('locations')} w={290} />{note}</div>
        </div>
        {head('Enrollment Claim Configuration')}
        <div style={{ padding: '4px 14px', display: 'grid', gridTemplateColumns: 'auto 116px 116px auto 116px 116px', columnGap: 6, rowGap: 3, alignItems: 'center', justifyContent: 'start' }}>
          <span>MSP Claim Codes:</span><span>Fee Code</span><span>Diagnostic Code</span><span /><span>Fee Code</span><span>Diagnostic Code</span>
          {pair('Registration Claim:', 'regFee', 'regDiag')}{pair('Reg Override Claim:', 'regOverrideFee', 'regOverrideDiag')}
          {pair('Deregistration Claim:', 'deregFee', 'deregDiag')}{pair('Dereg Override Claim:', 'deregOverrideFee', 'deregOverrideDiag')}
        </div>
        {head('MoH Enrollment Change Reason Automatically Accept')}
        <div style={{ padding: '4px 14px' }}>
          {/* both rows read "Registration Claim:" in `58b8f835…` — MOIS's own [sic] */}
          <div className="pb-row" style={{ gap: 6 }}><Field id="pbf-auto-accept-reg" label="Registration Claim:" labelW={130} value={d.autoAcceptReg} onChange={set('autoAcceptReg')} w={290} />{note}</div>
          <div className="pb-row" style={{ gap: 6 }}><Field id="pbf-auto-accept-dereg" label="Registration Claim:" labelW={130} value={d.autoAcceptDereg} onChange={set('autoAcceptDereg')} w={290} />{note}</div>
        </div>
        {head('Complexity Final Index MOIS Code')}
        <div style={{ padding: '4px 14px', display: 'grid', gridTemplateColumns: 'auto auto', columnGap: 60 }}>
          <Field id="pbf-index-code" label="Code:" labelW={130} value={d.indexCode} onChange={set('indexCode')} w={120} />
          <Field id="pbf-index-ordered-by" label="Ordered By:" labelW={80} value={d.indexOrderedBy} onChange={set('indexOrderedBy')} w={350} />
          <Field id="pbf-index-test-name" label="Test Name:" labelW={130} value={d.indexName} onChange={set('indexName')} w={350} />
        </div>
        <div style={{ background: '#e4e1de', marginTop: 8 }}>
          {head('PBF Registered Payee Numbers', (
            <PBCommandRow commands={[
              { label: 'New', onClick: () => setD((x) => ({ ...x, payees: [...x.payees, { payee: '', createdBy: 'ADMINISTRATOR', created: PBF_TODAY, modifiedBy: 'ADMINISTRATOR', modified: PBF_TODAY }] })) },
              { label: 'Delete', onClick: () => setD((x) => ({ ...x, payees: x.payees.filter((_, i) => i !== cur) })) },
            ]} />
          ))}
        </div>
        <div style={{ display: 'flex', minHeight: 120 }}>
          <PBDataWindow
            columns={[
              { key: 'payee', header: 'Payee No.', width: 160, render: (p, i) => <PBInput w={90} value={p.payee} onChange={(e) => setD((x) => ({ ...x, payees: x.payees.map((q, j) => (j === i ? { ...q, payee: e.target.value.slice(0, 5) } : q)) }))} data-tutorial-id={`host.mois.field.pbf-payee-${i}`} /> },
              { key: 'createdBy', header: 'Created By', width: 200 },
              { key: 'created', header: 'Created Date', width: 160 },
              { key: 'modifiedBy', header: 'Last Modified By', width: 200 },
              { key: 'modified', header: 'Last Modified Date', width: 160 },
            ]}
            rows={d.payees}
            current={cur}
            onCurrentChange={setCur}
            empty=" "
          />
        </div>
      </div>
    </>
  )
}

/** node → PBF screen, for BillingAdminView. */
export const PBF_VIEWS: Record<string, (p: PbfViewProps) => ReactNode> = {
  'bl-pbf': PbfDashboardView,
  'bl-pbf-enrol': PbfEnrolmentView,
  'bl-pbf-elig': PbfEligibilityView,
  'bl-pbf-cr': PbfCrView,
  'bl-pbf-unsent': PbfUnsentView,
  'bl-pbf-unack': PbfUnackView,
  'bl-pbf-failed': PbfFailedView,
  'bl-pbf-review': PbfMspCrView,
  'bl-pbf-history': PbfHistoryView,
  'bl-pbf-pcpc': PcpcCalculatorView,
  'bl-pbf-config': PbfConfigView,
}

