import { useState } from 'react'
import { useScreenReport } from '../host/screen-state'
import { stageStamp } from '../data/clock'
import { patients, MOIS_TODAY } from '../data/patients'
import { SCORECARD_METRICS, pct } from '../data/reportParams'
import { amcareScorecardPage } from '../data/reportSpecs/clinicalAudits'
import { PBCommandRow, PBDataWindow, PBInput, PBTextArea, PBViewHeader, pbSlug } from '../pb'
import { registerAreaWindow, type AreaWindowProps } from './areaWindowRegistry'
import { DialogFooter } from './formKit'
import { CmdCheck, CmdRadio, ParamSection } from './reportKit'
import { DialogButton, WorkspaceDialogFrame } from './WorkspaceDialogFrame'

/* ============================================================================
   Data Exchange ▸ Scorecard Export ▸ AMCARE — the AMCARE Scorecard export.

   WHAT IT IS. The work-area view the AMCARE node opens: a navy `AMCARE
   Scorecard` header, a Run · Previous Scorecard... · Close Window task bar,
   and four navy sections — Version ((•) Version 2 (update 2014 - January) /
   ( ) Version 1), Filter Options (As of Date, greyed "(only available in
   version 1)"; Provider ( ) Current Desktop (•) ALL Providers), Additional
   Items (☑ Clinical Value Items) and Output (Folder
   [C:\Users\Public\Documents] Browse...).

   PROVENANCE: 303386 `64d96ee8` (the view, v02.17.16) and `cb362e46` (the
   scorecard it produces: SCORE CARD FOR: PRACTICE …, the male / female age
   bands, then SECTION · ITEM · PERFORMED/PRESENT · ELIGIBLE POPULATION).
   The page is the one the Reports module's Clinical - Audits ▸ Scorecard
   prints (data/reportSpecs/clinicalAudits `amcareScorecardPage`), with the
   Clinical Value metrics (data/reportParams `SCORECARD_METRICS`) added as a
   last page when Clinical Value Items is ticked.

   BEHAVIOUR: Version 1 enables As of Date (Version 2 always runs as of
   today). Run prints the scorecard into the Print Preview and files it under
   the chosen Folder; Previous Scorecard... lists the scorecards filed so far
   (`amcare-previous-scorecards`), each of which re-opens as the report or
   in its XML view (`amcare-xml`) — 303386: "This report can also be opened
   in an XML view to allow the data to be updated to AMCARE directly. This
   will include the provider's details, such as their Practitioner Number."
   Browse... picks a folder from a short list.

   INFERRED: the Previous Scorecard window, the XML view and the Browse
   folder list have no capture; the XML's element names are reconstructed
   from the article's description. The practitioner numbers are fictional.

   ANCHORS: the view's commands `host.mois.command.run`,
   `host.mois.command.previous-scorecard`, `host.mois.command.close-window`;
   radios `host.mois.command.amcare-version-1|version-2`,
   `amcare-provider-current-desktop|all-providers`; tick
   `host.mois.command.amcare-clinical-value-items`; fields
   `host.mois.field.amcare-as-of-date`, `amcare-folder`; Browse
   `host.mois.command.amcare-browse`. The previous-scorecards window rows
   `host.mois.row.amcare-run-<n>`, buttons `amcare-open-report`,
   `amcare-open-xml`, `amcare-close`. `host.screen` reports `amcareVersion`,
   `amcareProvider`, `amcareClinicalValue`, `amcareRuns`.
   ========================================================================= */

export type AmcareRun = { when: string; version: 1 | 2; allProviders: boolean; clinical: boolean; asOf: string; folder: string; file: string }

const PRACTITIONERS: [string, string][] = [
  ['BEARDWOOD, WALTER', '90211'], ['DUCHARME, AMARILYS', '90344'], ['FAIRCHILD, NESRIN L', '90517'], ['HOWSER, DOOGIE', '90602'], ['SHEWCHUK, LEAH', '90788'],
]
const DESKTOP = PRACTITIONERS[0]!

let runs: AmcareRun[] = [
  { when: '2026.03.31 16:02', version: 2, allProviders: true, clinical: true, asOf: '2026.03.31', folder: 'C:\\Users\\Public\\Documents', file: 'AMCARE_2026-03-31.xml' },
  { when: '2025.12.31 15:40', version: 2, allProviders: false, clinical: false, asOf: '2025.12.31', folder: 'C:\\Users\\Public\\Documents', file: 'AMCARE_2025-12-31.xml' },
]

function scorecardPages(r: AmcareRun): string[] {
  const pages = amcareScorecardPage({
    version: r.version === 1 ? 'V1 - Original' : 'V2 - Current', asOf: r.asOf, period: '3',
    allProviders: r.allProviders, facility: '', service: '', active: true,
  }, patients)
  if (r.clinical) {
    pages.push([
      `%TITLE%CLINICAL VALUE ITEMS`,
      `%SUB%As Of Date: ${r.asOf}    For Provider(s): ${r.allProviders ? 'ALL PROVIDERS' : DESKTOP[0]}`,
      '%COLS:10,46,14,14,16%',
      '%TH%METRIC|ITEM|NUMERATOR|DENOMINATOR|PERCENTAGE',
      ...SCORECARD_METRICS.map((m) => `%TR%${m.code}|${m.name}|${m.num}|${m.den}|${pct(m.num, m.den)}`),
    ].join('\n'))
  }
  return pages
}

function scorecardXml(r: AmcareRun): string {
  const who = r.allProviders ? PRACTITIONERS : [DESKTOP]
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<AmcareScorecard version="${r.version}" asOfDate="${r.asOf.replace(/\./g, '-')}" generated="${r.when.replace(/\./g, '-')}">`,
    '  <Practice name="MOIS TEST CLINIC" />',
    ...who.flatMap(([name, number]) => [
      `  <Provider name="${name}" practitionerNumber="${number}">`,
      ...SCORECARD_METRICS.slice(0, r.clinical ? SCORECARD_METRICS.length : 6).map((m, i) => {
        const share = (i + number.length) % 3 === 0 ? 0.3 : 0.2
        const den = Math.max(1, Math.round(m.den * (r.allProviders ? share : 1)))
        const num = Math.min(den, Math.round(m.num * (r.allProviders ? share : 1)))
        return `    <Indicator code="${m.code}" name="${m.name}" numerator="${num}" denominator="${den}" />`
      }),
      '  </Provider>',
    ]),
    '</AmcareScorecard>',
  ].join('\n')
}

export function AmcareScorecardView({ open, close }: { open: (id: string, args?: Record<string, unknown>) => boolean; close?: () => void }) {
  const [version, setVersion] = useState<1 | 2>(2)
  const [asOf, setAsOf] = useState('')
  const [all, setAll] = useState(true)
  const [clinical, setClinical] = useState(true)
  const [folder, setFolder] = useState('C:\\Users\\Public\\Documents')
  const [browsing, setBrowsing] = useState(false)
  const [count, setCount] = useState(runs.length)
  useScreenReport({ amcareVersion: version, amcareProvider: all ? 'all-providers' : 'current-desktop', amcareClinicalValue: clinical, amcareRuns: count })

  const run = () => {
    const date = version === 1 && asOf ? asOf : MOIS_TODAY
    const r: AmcareRun = {
      when: stageStamp(),
      version, allProviders: all, clinical, asOf: date, folder, file: `AMCARE_${date.replace(/\./g, '-')}.xml`,
    }
    runs = [r, ...runs]
    setCount(runs.length)
    open('print-preview', { title: 'AMCARE Scorecard', pages: scorecardPages(r) })
  }

  return (
    <>
      <PBViewHeader title="AMCARE Scorecard" />
      <PBCommandRow commands={[
        { label: 'Run', onClick: run },
        { label: 'Previous Scorecard...', width: 118, onClick: () => open('amcare-previous-scorecards') },
        { label: 'Close Window', onClick: close },
      ]} />
      <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', background: 'var(--pb-face)' }}>
        <ParamSection kind="open">Version</ParamSection>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '10px 10px' }}>
          <CmdRadio id="amcare-version-1" name="amcare-version" label="Version 1" checked={version === 1} onChange={() => setVersion(1)} />
          <CmdRadio id="amcare-version-2" name="amcare-version" label="Version 2 (update 2014 - January)" checked={version === 2} onChange={() => setVersion(2)} />
        </div>
        <ParamSection kind="open">Filter Options</ParamSection>
        <div className="pb-row" style={{ gap: 10, padding: '8px 10px' }}>
          <span style={{ width: 64, color: version === 1 ? undefined : '#8a8a8a' }}>As of Date:</span>
          <PBInput w={84} value={asOf} disabled={version !== 1} data-tutorial-id="host.mois.field.amcare-as-of-date" onChange={(e) => setAsOf(e.target.value)} />
          <span style={{ color: '#8a8a8a' }}>(only available in version 1)</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '74px 1fr', rowGap: 10, padding: '4px 10px 8px' }}>
          <span>Provider:</span>
          <CmdRadio id="amcare-provider-current-desktop" name="amcare-provider" label="Current Desktop" checked={!all} onChange={() => setAll(false)} />
          <span />
          <CmdRadio id="amcare-provider-all-providers" name="amcare-provider" label="ALL Providers" checked={all} onChange={() => setAll(true)} />
        </div>
        <ParamSection kind="open">Additional Items:</ParamSection>
        <div style={{ padding: '8px 10px' }}><CmdCheck id="amcare-clinical-value-items" label="Clinical Value Items" checked={clinical} onChange={setClinical} /></div>
        <ParamSection kind="open">Output:</ParamSection>
        <div className="pb-row" style={{ gap: 10, padding: '8px 10px' }}>
          <span style={{ width: 64 }}>Folder:</span>
          <PBInput w={486} value={folder} data-tutorial-id="host.mois.field.amcare-folder" onChange={(e) => setFolder(e.target.value)} />
          <DialogButton id="amcare-browse" width={72} onClick={() => setBrowsing(true)}>Browse...</DialogButton>
        </div>
        {browsing && (
          <div style={{ margin: '0 10px 0 84px', width: 486, border: '1px solid #808080', background: '#fff' }} data-tutorial-id="host.mois.group.amcare-folders">
            {['C:\\Users\\Public\\Documents', 'C:\\Users\\Public\\Documents\\AMCARE', 'H:\\Reports\\Scorecards', 'S:\\Clinic\\AMCARE Exports'].map((f) => (
              <div key={f} role="button" tabIndex={0} className="pb-link" style={{ display: 'block', padding: '2px 6px', color: '#000', textDecoration: 'none', cursor: 'default', background: f === folder ? '#cce4ff' : undefined }}
                data-tutorial-id={`host.mois.row.amcare-folder-${pbSlug(f)}`}
                onClick={() => { setFolder(f); setBrowsing(false) }}>{f}</div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

/* --- Previous Scorecard... ---------------------------------------------- */
function PreviousScorecardsWindow({ close, open }: AreaWindowProps) {
  const [cur, setCur] = useState(0)
  const r = runs[cur]
  useScreenReport({ amcareRun: cur + 1, amcareRuns: runs.length })
  return (
    <WorkspaceDialogFrame id="amcare-previous-scorecards" title="Previous Scorecard" width={640} height={380} controls={false} onClose={close}>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 6 }}>
        <PBDataWindow
          rows={runs.map((x) => ({ ...x, v: `Version ${x.version}`, who: x.allProviders ? 'ALL PROVIDERS' : DESKTOP[0], cv: x.clinical ? 'Y' : '' }))}
          current={cur}
          onCurrentChange={setCur}
          onActivate={(x) => open('print-preview', { title: 'AMCARE Scorecard', pages: scorecardPages(x) })}
          rowTutorialId={(_x, i) => `host.mois.row.amcare-run-${i + 1}`}
          columns={[
            { key: 'when', header: 'Run Date', width: 116 },
            { key: 'v', header: 'Version', width: 70 },
            { key: 'who', header: 'Provider', width: 130 },
            { key: 'cv', header: 'CV', width: 30, align: 'center' },
            { key: 'file', header: 'File' },
          ]}
        />
      </div>
      <DialogFooter plain gap={12} padding="4px 0 10px">
        <DialogButton id="amcare-open-report" width={96} isDefault onClick={() => r && open('print-preview', { title: 'AMCARE Scorecard', pages: scorecardPages(r) })}>Open Report</DialogButton>
        <DialogButton id="amcare-open-xml" width={96} onClick={() => r && open('amcare-xml', { run: runs.indexOf(r) })}>Open XML</DialogButton>
        <DialogButton id="amcare-close" width={75} onClick={close}>Close</DialogButton>
      </DialogFooter>
    </WorkspaceDialogFrame>
  )
}

/* --- the XML view --------------------------------------------------------- */
function AmcareXmlWindow({ args, close, open }: AreaWindowProps) {
  const r = runs[typeof args.run === 'number' ? args.run : 0]
  useScreenReport({ amcareXml: !!r })
  return (
    <WorkspaceDialogFrame id="amcare-xml" title={`AMCARE Scorecard - XML - ${r?.file ?? ''}`} width={720} height={520} controls={false} onClose={() => open('amcare-previous-scorecards')}>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 6 }}>
        <PBTextArea readOnly w="100%" rows={24} value={r ? scorecardXml(r) : ''} data-tutorial-id="host.mois.field.amcare-xml"
          style={{ fontFamily: '"Courier New", monospace', fontSize: 12, flex: '1 1 auto', whiteSpace: 'pre' }} />
      </div>
      <DialogFooter plain padding="4px 0 10px">
        <DialogButton id="amcare-xml-close" width={75} isDefault onClick={close}>Close</DialogButton>
      </DialogFooter>
    </WorkspaceDialogFrame>
  )
}

registerAreaWindow('amcare-previous-scorecards', PreviousScorecardsWindow)
registerAreaWindow('amcare-xml', AmcareXmlWindow)
