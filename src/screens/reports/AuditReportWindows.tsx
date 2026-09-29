import { useState } from 'react'
import { useScreenReport } from '../../host/screen-state'
import { MOIS_TODAY, patients } from '../../data/patients'
import {
  AMCARE_FACILITIES, AMCARE_SERVICE_CENTERS, AMCARE_VERSIONS, amcareDeficientSheet, amcareScorecardPage, type AmcareOptions,
} from '../../data/reportSpecs/clinicalAudits'
import { PBInput, PBSelect } from '../../pb'
import { registerAreaWindow, type AreaWindowProps } from '../areaWindowRegistry'
import { DialogButton, WorkspaceDialogFrame } from '../WorkspaceDialogFrame'
import { FormLine } from '../formKit'
import { CmdCheck, CmdRadio, Hint, ParamFrame, ParamLine, ParamRule, ParamSection } from '../reportKit'

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

function AmcareScorecardParams({ close, open }: AreaWindowProps) {
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
    <CmdRadio id={`${P}-${id}`} name={`${P}-provider`} label={label} checked={checked} onChange={onPick} />
  )

  return (
    <ParamFrame
      id={`report-params-${P}`}
      title="Report: Clinical - Audits - Scorecard"
      w={661}
      h={497}
      onOk={build}
      onCancel={close}
      footer={(
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 0 10px', flex: 'none' }}>
          <DialogButton id={`${P}-previous`} width={130} onClick={() => setPrevious(true)}>Previous Scorecard...</DialogButton>
          <span style={{ flex: '0 0 72px' }} />
          <DialogButton id={`${P}-ok`} width={100} isDefault onClick={build}>Build Scorecard</DialogButton>
          <span style={{ flex: '0 0 4px' }} />
          <DialogButton id={`${P}-cancel`} width={100} onClick={close}>Cancel</DialogButton>
        </div>
      )}
      after={previous && (
        <PreviousScorecard
          onCancel={() => setPrevious(false)}
          onView={(b) => { setPrevious(false); open('print-preview', { title: 'Scorecard', pages: amcareScorecardPage(b.options, patients) }) }}
        />
      )}
    >
      <ParamSection kind="under">Scorecard Options:</ParamSection>
      <ParamLine label="Version:">
        <PBSelect w={92} options={AMCARE_VERSIONS} value={version} data-tutorial-id={`host.mois.field.${P}-version`} onChange={(e) => setVersion(e.target.value)} />
      </ParamLine>
      <ParamLine label="As of Date:">
        <PBInput w={84} align="center" value={asOf} data-tutorial-id={`host.mois.field.${P}-as-of`} onChange={(e) => setAsOf(e.target.value)} />
        <Hint>(a cut-off date for problems and events - if blank, will use today)</Hint>
      </ParamLine>
      <ParamLine label="Time Period:">
        <PBInput w={50} align="center" value={period} data-tutorial-id={`host.mois.field.${P}-period`} onChange={(e) => setPeriod(e.target.value)} />
        <Hint>(number of years from present or as of date, if applicable, since last contact)</Hint>
      </ParamLine>
      <ParamRule />
      <ParamLine label="Provider(s):">
        <span className="pb-row" style={{ gap: 26 }}>
          {radio('provider-current-desktop', 'Current Desktop', !allProviders, () => setAllProviders(false))}
          {radio('provider-all-providers', 'All Providers', allProviders, () => setAllProviders(true))}
        </span>
      </ParamLine>
      <ParamLine label="Facility Code:">
        <PBSelect w={116} options={AMCARE_FACILITIES} value={facility} data-tutorial-id={`host.mois.field.${P}-facility`} onChange={(e) => setFacility(e.target.value)} />
      </ParamLine>
      <ParamLine label="Service Center:">
        <PBSelect w={116} options={AMCARE_SERVICE_CENTERS} value={service} data-tutorial-id={`host.mois.field.${P}-service`} onChange={(e) => setService(e.target.value)} />
      </ParamLine>
      <ParamRule />
      <ParamLine label="Patients List:">
        <CmdCheck id={`${P}-active`} label="Only Active Patients" checked={active} onChange={setActive} />
      </ParamLine>
      <ParamRule />
      <ParamLine label="Deficient Items:">
        <CmdCheck id={`${P}-deficient`} label="Direct output to Spreadsheet (CSV)" checked={deficient} onChange={setDeficient} />
      </ParamLine>
    </ParamFrame>
  )
}

/** INFERRED (no capture): the drop-down of earlier builds and "View Previous Scorecard" */
function PreviousScorecard({ onView, onCancel }: { onView: (b: Built) => void; onCancel: () => void }) {
  const [label, setLabel] = useState(BUILT[0]?.label ?? '')
  const chosen = BUILT.find((b) => b.label === label)
  return (
    <WorkspaceDialogFrame id="amcare-previous" title="Previous Scorecard" width={420} height={150} controls={false} onClose={onCancel} zIndex={90}>
      <div style={{ padding: '14px 12px 6px', flex: '1 1 auto' }}>
        <FormLine label="Scorecard:" w={70}>
          <PBSelect w={310} options={BUILT.map((b) => b.label)} value={label} data-tutorial-id="host.mois.field.amcare-previous-build" onChange={(e) => setLabel(e.target.value)} />
        </FormLine>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 19, padding: '4px 0 10px', flex: 'none' }}>
        <DialogButton id="amcare-previous-view" width={150} isDefault disabled={!chosen} onClick={() => chosen && onView(chosen)}>View Previous Scorecard</DialogButton>
        <DialogButton id="amcare-previous-cancel" width={75} onClick={onCancel}>Cancel</DialogButton>
      </div>
    </WorkspaceDialogFrame>
  )
}

registerAreaWindow(`report-params-${P}`, AmcareScorecardParams)
