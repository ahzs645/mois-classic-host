import { useState, type ReactNode } from 'react'
import { useScreenReport } from '../../host/screen-state'
import { MOIS_TODAY, patients } from '../../data/patients'
import {
  AMCARE_FACILITIES, AMCARE_SERVICE_CENTERS, AMCARE_VERSIONS, amcareDeficientSheet, amcareScorecardPage, type AmcareOptions,
} from '../../data/reportSpecs/clinicalAudits'
import { PBBand, PBCheckbox, PBInput, PBSelect, usePBInstrumentation } from '../../pb'
import { registerAreaWindow, type AreaWindowProps } from '../areaWindowRegistry'
import { DialogButton, WorkspaceDialogFrame } from '../WorkspaceDialogFrame'

/* ============================================================================
   Hand-built Reports-module windows that do not fit the generic Selection
   Parameter form (screens/ReportSpecWindow.tsx). Each registers itself with
   registerAreaWindow and is named by its spec's `window`.

   Clinical - Audits ▸ Scorecard — the AMCARE Scorecard's parameter window,
   `report-params-amcare-scorecard`.

   PROVENANCE: 304048 `70b45e1a` (the window, 661x497) and `1bd39e02` (the
   printed scorecard). Caption `Report: Clinical - Audits - Scorecard`; the
   grey Selection Parameter band; navy "Scorecard Options:" heading; Version
   [V2 - Current ▼]; As of Date [2014.03.11] (a cut-off date for problems and
   events - if blank, will use today); Time Period [3] (number of years from
   present or as of date, if applicable, since last contact); ruled; Provider(s)
   ( ) Current Desktop (•) All Providers; Facility Code [▼]; Service Center
   [▼]; ruled; Patients List: ☑ Only Active Patients; ruled; Deficient Items:
   ☐ Direct output to Spreadsheet (CSV). Three buttons along the bottom:
   Previous Scorecard... at the left, Build Scorecard and Cancel centred.
   It is hand-built rather than a spec because of that third button and the
   Build Scorecard caption on the default one.

   Behaviour: Build Scorecard prints the scorecard (data/reportSpecs/
   clinicalAudits.ts `amcareScorecardPage`) into the Print Preview, or, with
   Deficient Items ticked, opens the list of deficient patients per item in
   the Excel sheet ("If checked, MOIS will produce a list of patients
   deficient for each scorecard item", 304048). Each build is remembered for
   Previous Scorecard....

   INFERRED: Previous Scorecard... — the article says only "Allows you to
   select a previously created scorecard from the drop down menu to view.
   Once selected, press 'View Previous Scorecard' to open it"; no capture
   shows it, so it is a small window over this one with that drop-down and
   button. The Version drop-down's other entry (V1 - Original) and the
   deficient sheet's columns are also inferred. The capture's As of Date is
   2014.03.11; the emulator opens on today.

   Anchors: host.mois.dialog.report-params-amcare-scorecard; fields
   host.mois.field.amcare-scorecard-{version,as-of,period,facility,service};
   commands host.mois.command.amcare-scorecard-{provider-current-desktop,
   provider-all-providers, active, deficient, ok, cancel, previous}; the
   picker host.mois.dialog.amcare-previous with host.mois.field.
   amcare-previous-build and commands amcare-previous-view / -cancel.
   `host.screen` carries report, provider, output (print / excel), active,
   previous (open / closed) — never typed values.
   ========================================================================= */

const NAVY = '#000080'
const P = 'amcare-scorecard'

/** the scorecards built this session, newest first — Previous Scorecard lists them */
type Built = { label: string; options: AmcareOptions }
const BUILT: Built[] = [
  {
    label: '2026.06.30 - ALL PROVIDERS - V2 - Current',
    options: { version: 'V2 - Current', asOf: '2026.06.30', period: '3', allProviders: true, facility: '', service: '', active: true },
  },
  {
    label: '2026.03.31 - ALL PROVIDERS - V2 - Current',
    options: { version: 'V2 - Current', asOf: '2026.03.31', period: '3', allProviders: true, facility: '', service: '', active: true },
  },
]

const Section = ({ children }: { children: ReactNode }) => (
  <div style={{ color: NAVY, fontWeight: 700, padding: '5px 8px 3px', borderBottom: '1px solid #a0a0a0', marginTop: 2 }}>{children}</div>
)
const Rule = () => <div style={{ borderTop: '1px solid #c8c8c8', margin: '5px 0' }} />
const Line = ({ label, children }: { label?: ReactNode; children: ReactNode }) => (
  <div className="pb-row" style={{ gap: 6, padding: '2px 10px', minHeight: 21 }}>
    <span className="pb-form__label" style={{ width: 90, flex: 'none' }}>{label}</span>
    {children}
  </div>
)
const Hint = ({ children }: { children: ReactNode }) => <span style={{ whiteSpace: 'nowrap' }}>{children}</span>

function AmcareScorecardParams({ close, open }: AreaWindowProps) {
  const host = usePBInstrumentation()
  const [version, setVersion] = useState(AMCARE_VERSIONS[0]!)
  const [asOf, setAsOf] = useState(MOIS_TODAY)
  const [period, setPeriod] = useState('3')
  const [allProviders, setAllProviders] = useState(true)
  const [facility, setFacility] = useState('')
  const [service, setService] = useState('')
  const [active, setActive] = useState(true)
  const [deficient, setDeficient] = useState(false)
  const [previous, setPrevious] = useState(false)
  useScreenReport({
    report: P, provider: allProviders ? 'all-providers' : 'current-desktop', output: deficient ? 'excel' : 'print',
    active, previous: previous ? 'open' : 'closed',
  })

  const cmd = (id: string) => host?.anchor('command', `${P}-${id}`)
  const said = (id: string) => host?.report('command', { command: `${P}-${id}` })

  const build = () => {
    const options: AmcareOptions = { version, asOf: asOf || MOIS_TODAY, period, allProviders, facility, service, active }
    BUILT.unshift({ label: `${options.asOf} - ${allProviders ? 'ALL PROVIDERS' : 'CURRENT DESKTOP'} - ${version}`, options })
    if (deficient) {
      const sheet = amcareDeficientSheet(options, patients)
      open('report-excel', { title: 'Scorecard Deficient Items', head: sheet.head, rows: sheet.rows })
      return
    }
    open('print-preview', { title: 'Scorecard', pages: amcareScorecardPage(options, patients) })
  }

  const radio = (id: string, label: string, checked: boolean, onPick: () => void) => (
    <label className="pb-check pb-check--radio">
      <input type="radio" name={`${P}-provider`} checked={checked} data-tutorial-id={cmd(id)} onChange={() => { said(id); onPick() }} />
      <span className="pb-check__box"><span className="pb-check__dot" /></span>
      <span className="pb-check__label">{label}</span>
    </label>
  )

  return (
    <WorkspaceDialogFrame id={`report-params-${P}`} title="Report: Clinical - Audits - Scorecard" width={661} height={497} controls={false} onClose={close}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, padding: '10px 12px 0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, border: '1px solid #646464', background: 'var(--pb-face)' }}>
          <PBBand>Selection Parameter</PBBand>
          <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', paddingBottom: 6 }}>
            <Section>Scorecard Options:</Section>
            <Line label="Version:">
              <PBSelect w={92} options={AMCARE_VERSIONS} value={version} data-tutorial-id={`host.mois.field.${P}-version`} onChange={(e) => setVersion(e.target.value)} />
            </Line>
            <Line label="As of Date:">
              <PBInput w={84} align="center" value={asOf} data-tutorial-id={`host.mois.field.${P}-as-of`} onChange={(e) => setAsOf(e.target.value)} />
              <Hint>(a cut-off date for problems and events - if blank, will use today)</Hint>
            </Line>
            <Line label="Time Period:">
              <PBInput w={50} align="center" value={period} data-tutorial-id={`host.mois.field.${P}-period`} onChange={(e) => setPeriod(e.target.value)} />
              <Hint>(number of years from present or as of date, if applicable, since last contact)</Hint>
            </Line>
            <Rule />
            <Line label="Provider(s):">
              <span className="pb-row" style={{ gap: 26 }}>
                {radio('provider-current-desktop', 'Current Desktop', !allProviders, () => setAllProviders(false))}
                {radio('provider-all-providers', 'All Providers', allProviders, () => setAllProviders(true))}
              </span>
            </Line>
            <Line label="Facility Code:">
              <PBSelect w={116} options={AMCARE_FACILITIES} value={facility} data-tutorial-id={`host.mois.field.${P}-facility`} onChange={(e) => setFacility(e.target.value)} />
            </Line>
            <Line label="Service Center:">
              <PBSelect w={116} options={AMCARE_SERVICE_CENTERS} value={service} data-tutorial-id={`host.mois.field.${P}-service`} onChange={(e) => setService(e.target.value)} />
            </Line>
            <Rule />
            <Line label="Patients List:">
              <PBCheckbox label="Only Active Patients" checked={active} tutorialId={cmd('active')} onChange={(v) => { said('active'); setActive(v) }} />
            </Line>
            <Rule />
            <Line label="Deficient Items:">
              <PBCheckbox label="Direct output to Spreadsheet (CSV)" checked={deficient} tutorialId={cmd('deficient')} onChange={(v) => { said('deficient'); setDeficient(v) }} />
            </Line>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 0 10px', flex: 'none' }}>
          <DialogButton id={`${P}-previous`} width={130} onClick={() => setPrevious(true)}>Previous Scorecard...</DialogButton>
          <span style={{ flex: '0 0 72px' }} />
          <DialogButton id={`${P}-ok`} width={100} isDefault onClick={build}>Build Scorecard</DialogButton>
          <span style={{ flex: '0 0 4px' }} />
          <DialogButton id={`${P}-cancel`} width={100} onClick={close}>Cancel</DialogButton>
        </div>
      </div>
      {previous && (
        <PreviousScorecard
          onCancel={() => setPrevious(false)}
          onView={(b) => { setPrevious(false); open('print-preview', { title: 'Scorecard', pages: amcareScorecardPage(b.options, patients) }) }}
        />
      )}
    </WorkspaceDialogFrame>
  )
}

/** INFERRED (no capture): the drop-down of earlier builds and "View Previous Scorecard" */
function PreviousScorecard({ onView, onCancel }: { onView: (b: Built) => void; onCancel: () => void }) {
  const [label, setLabel] = useState(BUILT[0]?.label ?? '')
  const chosen = BUILT.find((b) => b.label === label)
  return (
    <WorkspaceDialogFrame id="amcare-previous" title="Previous Scorecard" width={420} height={150} controls={false} onClose={onCancel} zIndex={90}>
      <div style={{ padding: '14px 12px 6px', flex: '1 1 auto' }}>
        <div className="pb-row" style={{ gap: 6 }}>
          <span className="pb-form__label" style={{ width: 70, flex: 'none' }}>Scorecard:</span>
          <PBSelect w={310} options={BUILT.map((b) => b.label)} value={label} data-tutorial-id="host.mois.field.amcare-previous-build" onChange={(e) => setLabel(e.target.value)} />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 19, padding: '4px 0 10px', flex: 'none' }}>
        <DialogButton id="amcare-previous-view" width={150} isDefault disabled={!chosen} onClick={() => chosen && onView(chosen)}>View Previous Scorecard</DialogButton>
        <DialogButton id="amcare-previous-cancel" width={75} onClick={onCancel}>Cancel</DialogButton>
      </div>
    </WorkspaceDialogFrame>
  )
}

registerAreaWindow(`report-params-${P}`, AmcareScorecardParams)
