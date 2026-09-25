import { useState } from 'react'
import { useScreenReport } from '../host/screen-state'
import { SESSION_USER, nowStamp } from '../data/chart-basics-state'
import { usePatient } from '../data/patient-context'
import { updatePatient } from '../data/patient-edits'
import type { BenefitEntry } from '../data/patients'
import {
  PBButton, PBCheckbox, PBDataWindow, PBInput, PBPatientBannerBlue, PBSection, PBSelect, PBTextArea,
} from '../pb'
import { CmdButton } from './CmdButton'
import { DemographicModal } from './DemographicDialogs'

/* ============================================================================
   Demographics ▸ Benefits: the windows behind New and Edit.

   New opens "Select a Benefit Source / Service" — a tree of sources with
   their services under them — and Continue opens "New Benefit Source /
   Service" with the chosen source and service filled in. For BC-PBF the save
   button reads Request Enrollment: the record starts as a change request the
   clinic's PBF Administrator must approve (art. 2951102 `e0dfce68…png`,
   `d06560e9…png`; art. 2257761).

   Edit opens "Edit Benefit Source / Service", which carries the patient
   banner. On a Registered BC-PBF record a blue Request Unenrollment link sits
   under the Start Date; it opens Stop Date and Stop Reason, and the Save
   button becomes Request Unenrollment (art. 2951461 `32b23d3c…png`,
   `ee172cd4…png`). A stop date can only be requested once the start date is
   Registered (art. 2257761).
   ========================================================================= */

/** Select a Benefit Source / Service, transcribed from `e0dfce68…png`. */
export const BENEFIT_SOURCES: { source: string; name: string; services: { service: string; description: string }[] }[] = [
  { source: 'MSP', name: 'BC Medical Service Plan', services: [
    { service: 'BASIC COVERAGE', description: 'Basic MSP Coverage' },
    { service: 'BC-PBF', description: 'BC Population Based Funding' },
  ] },
  { source: 'BLUE CROSS', name: 'Blue Cross Insurance', services: [
    { service: 'BASIC COVERAGE', description: 'Basic Coverage' },
    { service: 'PREMIUM COVERAGE', description: 'Premium Coverage' },
  ] },
  { source: 'SUNLIFE', name: 'SunLife Insurance', services: [
    { service: 'BASIC', description: 'Basic Coverage' },
    { service: 'DENTAL', description: 'Dental Insurance' },
    { service: 'ENHANCED', description: 'Enhanced Coverage' },
    { service: 'HSP', description: 'Health Spending Plan' },
  ] },
]

const isPbf = (service: string) => service === 'BC-PBF'

export function SelectBenefitSourceDialog({ onContinue, onClose }: {
  onContinue: (pick: { source: string; service: string; description: string }) => void
  onClose: () => void
}) {
  const rows = BENEFIT_SOURCES.flatMap((s) => s.services.map((v) => ({ ...v, source: s.source, sourceName: s.name })))
  const [cur, setCur] = useState(0)
  const pick = rows[cur]
  return (
    <DemographicModal title="Select a Benefit Source / Service" width={640} height={520} onClose={onClose} dialog="select-benefit-source">
      <div style={{ padding: 8, flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div className="pb-band" style={{ background: '#0b3b73', color: '#fff' }}><span>Select Benefit Source / Service</span></div>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
          <PBDataWindow
            gutter={false}
            rows={rows}
            current={cur}
            onCurrentChange={setCur}
            onActivate={() => pick && onContinue(pick)}
            groupBy={(r) => r.source}
            groupLabel={(g) => `${g}  ( ${BENEFIT_SOURCES.find((s) => s.source === g)?.name ?? ''} )`}
            rowTutorialId={(r) => `host.mois.row.benefit-${r.source.toLowerCase().replace(/\s+/g, '-')}-${r.service.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
            columns={[
              { key: 'service', header: '', width: 190, render: (r) => <>{r.service}{isPbf(r.service) ? '*' : ''}</> },
              { key: 'description', header: '' },
              { key: 'status', header: '', width: 90, render: () => 'ACTIVE' },
            ]}
          />
        </div>
      </div>
      <div className="pb-row" style={{ justifyContent: 'center', gap: 10, padding: 12 }}>
        <CmdButton command="benefit-continue" wide disabled={!pick} onClick={() => pick && onContinue(pick)}>Continue</CmdButton>
        <CmdButton command="benefit-select-cancel" wide onClick={onClose}>Cancel</CmdButton>
      </div>
    </DemographicModal>
  )
}

/** New or Edit Benefit Source / Service. `index` is the row being edited. */
export function BenefitSourceServiceWindow({ mode, entry, index, onClose }: {
  mode: 'new' | 'edit'
  entry: BenefitEntry
  index?: number
  onClose: () => void
}) {
  const patient = usePatient()
  const [start, setStart] = useState(entry.start ?? (mode === 'new' ? nowStamp().date : ''))
  const [stop, setStop] = useState(entry.stop ?? '')
  const [reason, setReason] = useState(entry.stopReason ?? '')
  const [unenrolling, setUnenrolling] = useState(false)
  const [demo, setDemo] = useState(entry.demo ?? (mode === 'new' && isPbf(entry.service)))
  const [carePlan, setCarePlan] = useState(entry.carePlan ?? false)
  const [history, setHistory] = useState(false)
  const pbf = isPbf(entry.service)
  const registered = entry.status === 'Registered'
  useScreenReport(history ? { prompt: 'benefit-history' } : {})

  const save = (patch: Partial<BenefitEntry>) => {
    const list = patient.benefits ?? []
    const next = { ...entry, start, demo, carePlan, ...patch }
    updatePatient(patient.chart, {
      benefits: mode === 'new' || index === undefined ? [...list, next] : list.map((b, i) => (i === index ? next : b)),
    })
    onClose()
  }
  const label = { color: 'var(--pb-text-dim)', lineHeight: '19px' }
  return (
    <DemographicModal
      title={mode === 'new' ? 'New Benefit Source / Service' : 'Edit Benefit Source / Service'}
      width={520}
      onClose={onClose}
      dialog={mode === 'new' ? 'new-benefit-source' : 'edit-benefit-source'}
    >
      {mode === 'edit' && (
        <PBPatientBannerBlue
          top={[
            { label: 'CHART NO.', value: patient.chart, w: 88 },
            { label: 'PATIENT (F/M/L)', value: patient.full, w: 196 },
            { label: 'DATE OF BIRTH', value: <>{patient.dob}&nbsp;&nbsp;{patient.age}</>, w: 152 },
            { label: 'GENDER', value: patient.sex },
          ]}
          bottom={[]}
        />
      )}
      <div style={{ background: 'var(--pb-face)', padding: '0 6px' }}>
        <PBSection>
          <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '104px 1fr', alignItems: 'start' }}>
            <span style={label}>Source:</span><b style={{ lineHeight: '19px' }}>{entry.source}</b>
            <span className="pb-form__label">Patient ID:</span>
            <div className="pb-row"><PBInput w={190} /><span style={{ marginLeft: 10 }}>ID Type:</span><PBInput w={124} /></div>
            <span className="pb-form__label">Source Contact<br />Info:</span><PBTextArea rows={2} w="100%" />
            <span className="pb-form__label">Source Note:</span><PBTextArea rows={2} w="100%" />
          </div>
        </PBSection>
        <PBSection>
          <div className="pb-row"><span style={{ ...label, width: 104 }}>Service:</span><b>{entry.service}</b></div>
        </PBSection>
        <PBSection>
          <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '104px 110px 1fr', alignItems: 'center' }}>
            <b>Enrollment:</b><span /><span style={label}>Status</span>
            <span className="pb-form__label">Start Date:</span>
            <PBInput aria-label="Benefit start date" w={106} align="center" value={start} disabled={mode === 'edit' && pbf} onChange={(e) => setStart(e.target.value)} />
            <span style={label}>{entry.status ? `(${entry.status})` : ''}</span>
            {mode === 'edit' && pbf && registered && !unenrolling && (
              <CmdButton command="request-unenrollment-link" className="pb-link" style={{ gridColumn: '1 / span 2', justifySelf: 'start', border: 0, background: 'none', padding: 0 }}
                onClick={() => { setUnenrolling(true); if (!stop) setStop(nowStamp().date) }}>Request Unenrollment</CmdButton>
            )}
            {(unenrolling || entry.stop) && <>
              <span className="pb-form__label">Stop Date:</span>
              <PBInput aria-label="Benefit stop date" w={106} align="center" value={stop} onChange={(e) => setStop(e.target.value)} data-tutorial-id="host.mois.field.benefit-stop-date" />
              <span style={label}>{unenrolling ? '(Requested)' : ''}</span>
              <span className="pb-form__label">Stop Reason:</span>
              {/* the only reason code any capture shows is L */}
              <span data-tutorial-id="host.mois.field.benefit-stop-reason" style={{ display: 'inline-flex' }}>
                <PBSelect aria-label="Benefit stop reason" options={['', 'L']} w={80} value={reason} onChange={(e) => setReason(e.target.value)} />
              </span>
              <PBInput w="100%" readOnly />
            </>}
          </div>
        </PBSection>
        <PBSection>
          <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '104px 1fr' }}>
            <b>Coverage:</b><span />
            <span className="pb-form__label">Description:</span><PBInput w="100%" />
            <span className="pb-form__label">Deductible:</span><PBInput w={96} align="right" />
          </div>
        </PBSection>
        <PBSection>
          <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '104px 1fr' }}>
            <b>Other:</b><PBCheckbox label="Include on Demographics" checked={demo} onChange={setDemo} />
            <span /><PBCheckbox label="Include on Care Plan Summary" checked={carePlan} onChange={setCarePlan} />
          </div>
        </PBSection>
        <PBSection>
          <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '104px 1fr', alignItems: 'start' }}>
            <b>Note:</b><PBTextArea rows={3} w="100%" />
          </div>
        </PBSection>
        <div style={{ padding: '4px 4px 6px', color: 'var(--pb-text-dim)' }}>
          <div>Record Created:&nbsp; {mode === 'new' ? `${nowStamp().date} ${nowStamp().time}   ${SESSION_USER}` : ''}</div>
          <div>Last Modified:</div>
        </div>
      </div>
      <div className="pb-row" style={{ gap: 8, padding: 10 }}>
        <span className="pb-row__spacer" />
        {mode === 'edit' && <CmdButton command="benefit-history" wide onClick={() => setHistory(true)}>History</CmdButton>}
        {mode === 'new' && pbf
          ? <CmdButton command="request-enrollment" onClick={() => save({ status: 'Requested' })}>Request Enrollment</CmdButton>
          : unenrolling
            ? <CmdButton command="request-unenrollment" disabled={!stop || !reason} onClick={() => save({ stop, stopReason: reason, status: 'Unenrollment Requested' })}>Request Unenrollment</CmdButton>
            : <CmdButton command="benefit-save" wide onClick={() => save({})}>Save</CmdButton>}
        <CmdButton command="benefit-cancel" wide onClick={onClose}>Cancel</CmdButton>
      </div>
      {/* art. 2951102 `b5132326…png`: Date / Type / Description / Action / By,
          one row per change request and PBF claim behind the status, Close
          bottom right. A Registered record's own request and the claim that
          registered it are not in the export, so the one row is the record's
          status as this chart holds it. */}
      {history && (
        <DemographicModal title="Benefit Service Transaction History" width={620} height={360} onClose={() => setHistory(false)}>
          <div style={{ padding: 8, flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
            <PBDataWindow
              gutter={false}
              rows={entry.status ? [{ date: entry.start ?? '', type: 'Change Request', description: entry.stop ? 'Unenrollment Request' : 'Enrollment Request', action: entry.status, by: SESSION_USER }] : []}
              columns={[
                { key: 'date', header: 'Date', width: 80, align: 'center' },
                { key: 'type', header: 'Type', width: 110 },
                { key: 'description', header: 'Description', width: 180 },
                { key: 'action', header: 'Action', width: 120 },
                { key: 'by', header: 'By' },
              ]}
              empty=" "
            />
          </div>
          <div className="pb-row" style={{ padding: 10 }}>
            <span className="pb-row__spacer" />
            <PBButton wide onClick={() => setHistory(false)}>Close</PBButton>
          </div>
        </DemographicModal>
      )}
    </DemographicModal>
  )
}
