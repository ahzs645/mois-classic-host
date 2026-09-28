import { useState } from 'react'
import {
  billingPrograms, panelStatusOf, patientOf, providerOfChart, unsentRow, useBillingPrograms,
} from '../data/billingPrograms'
import { useScreenReport } from '../host/screen-state'
import { PBCheckbox, PBCommandRow, PBDataWindow, PBInput, PBSelect, PBViewHeader, pbSlug } from '../pb'
import { Ask, CellLink, Dim, useUnsentSink } from './billingProgramsKit'

/* ============================================================================
   Billing ▸ PAS Management — Patient Changes and Panel Review.

   PROVENANCE (art. 3788178 "Patient Attachment System (PAS)", the user's
   cloud build):
   - PAS Patient Status Change Review  `675a3ef8…` (v02.31.23): Refresh /
     Close Window; "Status change between [0000.00.00] and [ ]", Service
     Provider; "Shows charts that" were added during the timeframe (New) /
     the status changed during the timeframe (Changed), both ticked;
     "Patient panel status" with "(registration is determine by the most
     recent 98990 MSP claim)" [sic]; columns Patient, Service Provider,
     Status, Before, After, PAS Provider, PAS Registration; the footnote
     "* Marking a patient as unregistered in MOIS is only changing the status
     of the MSP 98990 registration cliam [sic], you will need to manually
     update the PAS system too."
   - PAS Panel Review  `f5ac1485…` (v02.31.41): Service Provider
     (PRACTITIONER, GENERAL), Patient panel status (Registered); columns
     Patient, Insurance, Date, PAS Provider; the same footnote.
   The grids are empty in both captures; they fill on Refresh, the way a
   DataWindow retrieve does.

   Behaviour, from the article: "From the Patient Changes' folder, review
   your patient statuses and add any applicable PAS Registrations"; Panel
   Review lets you "filter by Registered or Unregistered to determine what
   patients still require a registration claim to be submitted". The PAS
   folder's own page (`7119ae1f…`): "Claim code 98990 is used to register a
   patient" and "Marking a claim as 'deleted' will flag the patient as being
   unregistered in MOIS."

   INFERRED — how a registration is added from the list: the PAS
   Registration cell carries a "Register" link on a patient with no current
   98990 claim (it creates an unsent 98990 claim in Unsent Claims) and an
   "Unregister" link on a registered one (it marks the latest claim
   deleted). No capture shows a populated row.
   ========================================================================= */

const PROVIDERS = ['', 'BEARDWOOD, WALTER', 'DUCHARME, AMARILYS', 'HOWSER, DOOGIE', 'PRACTITIONER, GENERAL']
const PANEL_STATUSES = ['', 'Registered', 'Unregistered', 'Not Registered']
const FOOTNOTE = '* Marking a patient as unregistered in MOIS is only changing the status of the MSP 98990 registration cliam, you will need to manually update the PAS system too.'

const name = (chart: string) => {
  const p = patientOf(chart)
  return p ? `${p.last}, ${p.first}` : chart
}

function Footnote() {
  return <div style={{ padding: '4px 8px', color: '#6d6d6d', flex: 'none', background: '#fff', borderTop: '1px solid #d8d8d8' }}>{FOOTNOTE}</div>
}

type PasProps = { onClose?: () => void }

export function PasChangesView({ onClose }: PasProps) {
  const s = useBillingPrograms()
  const sink = useUnsentSink()
  const [from, setFrom] = useState('0000.00.00')
  const [to, setTo] = useState('')
  const [provider, setProvider] = useState('')
  const [added, setAdded] = useState(true)
  const [changed, setChanged] = useState(true)
  const [panel, setPanel] = useState('')
  const [shown, setShown] = useState<string[] | null>(null)
  const [cur, setCur] = useState(0)
  const [ask, setAsk] = useState<null | { chart: string; kind: 'register' | 'unregister' }>(null)

  const refresh = () => {
    setShown(s.changes.filter((c) => (
      (!from || from === '0000.00.00' || c.date >= from) && (!to || c.date <= to)
      && ((added && c.kind === 'New') || (changed && c.kind === 'Changed'))
      && (!provider || providerOfChart(s, c.chart) === provider)
      && (!panel || panelStatusOf(s, c.chart).status === panel)
    )).map((c) => `${c.chart}|${c.date}`))
    setCur(0)
  }
  const rows = (shown ?? []).map((k) => s.changes.find((c) => `${c.chart}|${c.date}` === k)!).filter(Boolean).map((c) => {
    const reg = panelStatusOf(s, c.chart)
    return { ...c, provider: providerOfChart(s, c.chart), reg }
  })
  const current = rows[cur]
  useScreenReport({ rows: rows.length, row: current ? `pas-${pbSlug(name(current.chart).split(',')[0] ?? '')}` : null, panelStatus: current ? pbSlug(current.reg.status) : null, prompt: ask ? `pas-${ask.kind}` : null })

  const confirm = (v: string) => {
    if (ask && v === 'yes') {
      if (ask.kind === 'register') {
        const prov = providerOfChart(s, ask.chart) || provider || 'PRACTITIONER, GENERAL'
        billingPrograms.addPanelClaims([ask.chart], prov)
        sink([unsentRow(ask.chart, '98990', prov, s.changes.find((c) => c.chart === ask.chart)?.date ?? '')])
      } else billingPrograms.unregister(ask.chart)
    }
    setAsk(null)
  }

  return (
    <>
      <PBViewHeader title="PAS Patient Status Change Review" />
      <PBCommandRow commands={[{ label: 'Refresh', onClick: refresh }, { label: 'Close Window', onClick: onClose }]} />
      <div className="pb-row" style={{ alignItems: 'flex-start', gap: 24, padding: '6px 12px 8px', flex: 'none', borderBottom: '1px solid #b8b8b8' }}>
        <div>
          <div>Status change between</div>
          <div className="pb-row" style={{ gap: 6, paddingTop: 2 }}>
            <PBInput w={100} value={from} onChange={(e) => setFrom(e.target.value)} data-tutorial-id="host.mois.field.pas-change-from" />
            <span>and</span>
            <PBInput w={100} value={to} onChange={(e) => setTo(e.target.value)} data-tutorial-id="host.mois.field.pas-change-to" />
          </div>
          <div style={{ paddingTop: 6 }}>Service Provider</div>
          <span data-tutorial-id="host.mois.field.pas-service-provider"><PBSelect w={240} options={PROVIDERS} value={provider} onChange={(e) => setProvider(e.target.value)} /></span>
        </div>
        <div>
          <div>Shows charts that</div>
          <div style={{ paddingTop: 4 }}><PBCheckbox label="were added during the timeframe (New)" checked={added} onChange={setAdded} tutorialId="host.mois.field.pas-show-new" /></div>
          <div style={{ paddingTop: 4 }}><PBCheckbox label="the status changed during the timeframe (Changed)" checked={changed} onChange={setChanged} tutorialId="host.mois.field.pas-show-changed" /></div>
        </div>
        <div>
          <div>Patient panel status</div>
          <span data-tutorial-id="host.mois.field.pas-panel-status"><PBSelect w={180} options={PANEL_STATUSES} value={panel} onChange={(e) => setPanel(e.target.value)} /></span>
          <Dim style={{ display: 'block', width: 200 }}>(registration is determine by the most recent 98990 MSP claim)</Dim>
        </div>
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        <PBDataWindow
          columns={[
            { key: 'patient', header: 'Patient', width: 150, render: (r) => name(r.chart) },
            { key: 'provider', header: 'Service Provider', width: 150 },
            { key: 'kind', header: 'Status', width: 58 },
            { key: 'before', header: 'Before', width: 48, align: 'center' },
            { key: 'after', header: 'After', width: 42, align: 'center' },
            { key: 'pas', header: 'PAS Provider', width: 150, render: (r) => r.reg.provider },
            {
              key: 'reg', header: 'PAS Registration', width: 220,
              render: (r) => (
                <span className="pb-row" style={{ gap: 8 }}>
                  <span>{r.reg.status}{r.reg.date ? ` ${r.reg.date}` : ''}</span>
                  {r.reg.status === 'Registered'
                    ? <CellLink id={`pas-unregister-${r.chart}`} onClick={() => setAsk({ chart: r.chart, kind: 'unregister' })}>Unregister</CellLink>
                    : <CellLink id={`pas-register-${r.chart}`} onClick={() => setAsk({ chart: r.chart, kind: 'register' })}>Register</CellLink>}
                </span>
              ),
            },
          ]}
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
          rowTutorialId={(r) => `host.mois.row.pas-${pbSlug(name(r.chart).split(',')[0] ?? '')}-${r.chart}`}
          empty=" "
        />
      </div>
      <Footnote />
      {ask && (
        <Ask id={`pas-${ask.kind}`} title="PAS Management" buttons={[{ label: 'Yes', value: 'yes', default: true }, { label: 'No', value: 'no' }]} onAnswer={confirm}>
          {ask.kind === 'register'
            ? <>Create an MSP 98990 panel registration claim for {name(ask.chart)}? It will be sent with your next MSP submission.</>
            : <>Mark {name(ask.chart)}'s 98990 registration claim as deleted? The patient will show as Unregistered in MOIS; update the PAS system too.</>}
        </Ask>
      )}
    </>
  )
}

export function PasPanelView({ onClose }: PasProps) {
  const s = useBillingPrograms()
  const [provider, setProvider] = useState('PRACTITIONER, GENERAL')
  const [status, setStatus] = useState('Registered')
  const [shown, setShown] = useState<{ provider: string; status: string } | null>(null)
  const [cur, setCur] = useState(0)
  const rows = shown
    ? (s.panel[shown.provider] ?? []).map((chart) => ({ chart, reg: panelStatusOf(s, chart) })).filter((r) => r.reg.status === shown.status)
    : []
  const current = rows[cur]
  useScreenReport({ rows: rows.length, panelProvider: pbSlug(provider), panelStatus: pbSlug(status), row: current ? `pas-${pbSlug(name(current.chart).split(',')[0] ?? '')}` : null })
  return (
    <>
      <PBViewHeader title="PAS Panel Review" />
      <PBCommandRow commands={[
        { label: 'Refresh', onClick: () => { setShown({ provider, status }); setCur(0) } },
        { label: 'Close Window', onClick: onClose },
      ]} />
      <div className="pb-row" style={{ alignItems: 'flex-start', padding: '6px 12px 8px', flex: 'none', borderBottom: '1px solid #b8b8b8' }}>
        <div>
          <div>Service Provider</div>
          <span data-tutorial-id="host.mois.field.pas-panel-provider"><PBSelect w={300} options={PROVIDERS.filter(Boolean)} value={provider} onChange={(e) => setProvider(e.target.value)} /></span>
        </div>
        <span className="pb-row__spacer" />
        <div style={{ paddingRight: 160 }}>
          <div>Patient panel status</div>
          <span data-tutorial-id="host.mois.field.pas-panel-review-status"><PBSelect w={180} options={PANEL_STATUSES.filter(Boolean)} value={status} onChange={(e) => setStatus(e.target.value)} /></span>
        </div>
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        <PBDataWindow
          columns={[
            { key: 'patient', header: 'Patient', width: 330, render: (r) => name(r.chart) },
            { key: 'insurance', header: 'Insurance', width: 160, render: (r) => (patientOf(r.chart)?.insurance ?? '').replace(/\s/g, '') },
            { key: 'date', header: 'Date', width: 130, align: 'center', render: (r) => r.reg.date },
            { key: 'pas', header: 'PAS Provider', width: 240, render: (r) => r.reg.provider },
          ]}
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
          rowTutorialId={(r) => `host.mois.row.pas-${pbSlug(name(r.chart).split(',')[0] ?? '')}-${r.chart}`}
          empty=" "
        />
      </div>
      <Footnote />
    </>
  )
}
