import { useState, type ReactElement, type ReactNode } from 'react'
import { useChartRecords } from '../data/chart-records'
import {
  SESSION_USER, addPatientText, addSignatureEvent, nowStamp, recordMerge, rollBackMerge,
  saveDefaultValue, setDesktopProvider, useDesktopProvider, useMergeLog, usePatientTexts,
  useSignatureHistory, type MergeLogRow,
} from '../data/chart-basics-state'
import { date } from '../data/charts/relations'
import { daybookProviders } from '../data/mois'
import { usePatient, usePatientRoster } from '../data/patient-context'
import type { PrintReport } from '../data/printReports'
import {
  PBBand, PBButton, PBCheckbox, PBDataWindow, PBInput, PBRadio, PBSelect, PBTextArea, PBWindow,
} from '../pb'
import { AdvancedLookupDialog } from './AdvancedLookupDialog'
import { CmdButton, DemographicModal, DesktopLayer, DialogButtons, MspEligibilityDialog } from './DemographicDialogs'
import { RichtextReportWindow } from './PrintFlow'
import { useScreenReport } from '../host/screen-state'
import { registerAreaWindow, type AreaWindowProps } from './areaWindowRegistry'
import { lastFieldInfo } from '../host/hotkeys'

/* ============================================================================
   The frame-level windows the chart basics lessons open from the menus:
   Action ▸ Print Label, Action ▸ Change Desktop Provider, Help ▸ About,
   Maintenance ▸ Default Value Setting, Utilities ▸ MSP Eligibility Check,
   Utilities ▸ Chart Navigator - Load from File (its Select File dialog),
   Utilities ▸ Paste Patient Text, Utilities ▸ Chart Merging…, and the
   Demographics folder's own Action items — Print Demographics, Family
   Summary and Account Summary.

   Each is registered by id with the frame's window switch (below), so it
   is reported as `host.dialog` while it is up and a lesson can grade it. Every window names the manual article and the image it was
   transcribed from; where the manual has no picture of a window, the
   comment says so and says what the shape rests on instead.
   ========================================================================= */

/* Registered by id with the frame's window switch (screens/areaWindowRegistry):
   `openWindowById`, the menus' `go.open` and `host.mois.openUtility` all reach
   them, and the frame reports the open id as `host.dialog`. A prompt a window
   raises over itself (a confirmation, Merge Complete) reports as
   `host.screen.prompt`, because the frame's own dialog wins `host.dialog`. */
const windows: Record<string, (props: AreaWindowProps) => ReactElement | null> = {
  'print-label': ({ close }) => <PrintLabelDialog onClose={close} />,
  'desktop-provider': ({ close }) => <DesktopProviderDialog onClose={close} />,
  about: ({ close }) => <AboutMoisDialog onClose={close} />,
  'default-value': ({ close, args }) => <DefaultValueDialog field={typeof args.field === 'string' ? args.field : undefined} value={typeof args.value === 'string' ? args.value : undefined} onClose={close} />,
  'msp-eligibility': ({ close }) => <MspEligibilityDialog onClose={close} />,
  'select-file': ({ close, open }) => <SelectFileDialog onClose={close} onOpen={() => { close(); open('chart-navigator') }} />,
  'print-demographics': ({ close }) => <PrintDemographicsWindow onClose={close} />,
  'family-summary': ({ close }) => <FamilySummaryDialog onClose={close} />,
  'account-summary': ({ close }) => <AccountSummaryDialog onClose={close} />,
  'merge-chart': ({ close }) => <MergeChartDialog onClose={close} />,
  'unmerge-chart': ({ close }) => <UnmergeChartDialog onClose={close} />,
  'merge-log': ({ close }) => <MergeLogDialog onClose={close} />,
  'patient-text': ({ close }) => <PatientTextDialog onClose={close} />,
}
for (const [id, component] of Object.entries(windows)) registerAreaWindow(id, component)

/* --- Print Label -------------------------------------------------------------
   art. 301175 `af5fdaab…png` (v02.20.19, over Patient Summary) and art.
   304741 `4e1f3100…png` (the window alone). Three bands: the two provider
   drop-downs and the label count; the nine print options in two columns,
   Detailed selected; Alias ID (Hosp. No.) and Connection (Fam / Ref). Then
   "Printer: lpt1:" with a Change... link, and Ok (F2) / Cancel.

   The provider fields default to the chart's Service Provider with the
   provider's MSP number after a hash (art. 301175: "MOIS appends a hash and
   the provider's MSP number"); the Desktop Provider stands in when the chart
   has none. */
const LABEL_OPTIONS_LEFT = ['Detailed', 'Chart Tab (Top)', 'Chart Tab (Detail)', 'From Clipboard', '1 Inch']
const LABEL_OPTIONS_RIGHT = ['Envelope', 'Chart Tab (Bottom)', 'Referral (To Clipboard)', 'Requisition']

function PrintLabelDialog({ onClose }: { onClose: () => void }) {
  const patient = usePatient()
  const desktop = useDesktopProvider()
  const aliases = patient.aliasIds ?? []
  const connections = useChartRecords('connection')
  const provider = patient.provider || desktop.provider
  const [option, setOption] = useState('Detailed')
  const [count, setCount] = useState('1')
  const [name, setName] = useState(provider)
  const ok = () => onClose()
  return (
    <DemographicModal title="Print Label" width={600} onClose={onClose} dialog="print-label">
      <div onKeyDown={(e) => { if (e.key === 'F2') { e.preventDefault(); ok() } }} style={{ padding: 10, display: 'flex', flexDirection: 'column' }}>
        <div className="pb-groupbox" style={{ padding: '8px 12px' }}>
          <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '140px 240px auto', alignItems: 'center' }}>
            <span className="pb-form__label">Provider Name on Label:</span>
            <PBSelect aria-label="Provider Name on Label" options={[...new Set([name, provider, ...daybookProviders.map((p) => p.provider)])]} value={name} onChange={(e) => setName(e.target.value)} w={240} />
            <span />
            <span className="pb-form__label">Primary Care Provider:</span>
            <PBSelect aria-label="Primary Care Provider" options={['', ...daybookProviders.map((p) => p.provider)]} w={240} />
            <span>(for requisition label only)</span>
            <span className="pb-form__label">Number of Labels to Print:</span>
            <PBInput aria-label="Number of Labels to Print" w={40} align="center" value={count} onChange={(e) => setCount(e.target.value)} />
            <span />
          </div>
        </div>
        <div className="pb-groupbox" style={{ padding: '8px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
          <div style={{ display: 'grid', gap: 4 }}>
            {LABEL_OPTIONS_LEFT.map((o) => <PBRadio key={o} name="print-label-option" label={o} checked={option === o} onChange={() => setOption(o)} />)}
          </div>
          <div style={{ display: 'grid', gap: 4, alignContent: 'start' }}>
            {LABEL_OPTIONS_RIGHT.map((o) => <PBRadio key={o} name="print-label-option" label={o} checked={option === o} onChange={() => setOption(o)} />)}
          </div>
        </div>
        <div className="pb-groupbox" style={{ padding: '8px 12px' }}>
          <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '140px 240px', alignItems: 'center' }}>
            <span className="pb-form__label">Alias ID (Hosp. No.):</span>
            <PBSelect aria-label="Alias ID" options={['', ...aliases.map((a) => `${a.desc ?? a.code ?? ''} ${a.value ?? ''}`.trim())]} w={240} />
            <span className="pb-form__label">Connection (Fam / Ref):</span>
            <PBSelect aria-label="Connection" options={['', ...connections.map((c) => c.str_provider ?? c.str_connection_type ?? '').filter(Boolean)]} w={240} />
          </div>
        </div>
        <div className="pb-groupbox pb-row" style={{ padding: '6px 12px' }}>
          <span>Printer:&nbsp; lpt1:</span>
          <span className="pb-row__spacer" />
          <button type="button" className="pb-link">Change...</button>
        </div>
      </div>
      <DialogButtons>
        <CmdButton command="print-label-ok" wide onClick={ok}>Ok (F2)</CmdButton>
        <CmdButton command="print-label-cancel" wide onClick={onClose}>Cancel</CmdButton>
      </DialogButtons>
    </DemographicModal>
  )
}

/* --- Change Desktop Provider -------------------------------------------------
   art. 304393 ("Desktop Provider"): clicking the Desktop Provider field, or
   Action ▸ Change Desktop Provider (Alt+D), opens a dialog where you pick the
   provider, with "Save as my Default" at the bottom right; since 2.20 a
   provider whose user account is inactive cannot be chosen.

   UNVERIFIED LAYOUT: the manual describes this dialog but never shows it, so
   the provider list, its columns (the day book's provider roster) and the
   title are this emulator's reading of that paragraph, not a transcription. */
function DesktopProviderDialog({ onClose }: { onClose: () => void }) {
  const desktop = useDesktopProvider()
  const [cur, setCur] = useState(() => Math.max(0, daybookProviders.findIndex((p) => p.provider === desktop.provider)))
  const pick = (asDefault: boolean) => {
    const row = daybookProviders[cur]
    if (row) setDesktopProvider(row.provider, asDefault)
    onClose()
  }
  return (
    <DemographicModal title="Change Desktop Provider" width={520} height={360} onClose={onClose} dialog="desktop-provider">
      <div style={{ padding: 10, flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <PBBand>Desktop Provider</PBBand>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
          <PBDataWindow
            rows={daybookProviders}
            current={cur}
            onCurrentChange={setCur}
            onActivate={() => pick(false)}
            rowTutorialId={(r) => `host.mois.row.provider-${r.provider.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`}
            columns={[
              { key: 'provider', header: 'Provider', width: 220 },
              { key: 'type', header: 'Type', width: 130 },
              { key: 'loc', header: 'Location' },
            ]}
          />
        </div>
      </div>
      <div className="pb-row" style={{ padding: '0 10px 10px', gap: 10 }}>
        <span className="pb-row__spacer" />
        <CmdButton command="desktop-provider-ok" wide onClick={() => pick(false)}>Ok</CmdButton>
        <CmdButton command="desktop-provider-cancel" wide onClick={onClose}>Cancel</CmdButton>
        <span className="pb-row__spacer" />
        <CmdButton command="save-as-my-default" onClick={() => pick(true)}>Save as my Default</CmdButton>
      </div>
    </DemographicModal>
  )
}

/** The frame's "Desktop For:" strip: the Desktop Provider, and the way to
    change it by clicking in the field (art. 304393). */
export function DesktopProviderField({ onOpen }: { onOpen: () => void }) {
  const desktop = useDesktopProvider()
  return (
    <button
      type="button"
      data-tutorial-id="host.mois.field.desktop-provider"
      onClick={onOpen}
      title="Change Desktop Provider (Alt+D)"
      style={{
        width: 210, height: 17, padding: '0 4px', textAlign: 'left', font: 'inherit', color: 'inherit',
        background: 'var(--pb-yellow)', border: '1px solid var(--pb-border)', cursor: 'default',
      }}
    >
      {desktop.provider}
    </button>
  )
}

/* --- Help ▸ About ------------------------------------------------------------
   art. 304393 (Help table): "Opens a window that states the version of MOIS,
   when it was released, and the contact information for BHSS." No capture
   of the window exists in the manual, so its content is those three things,
   taken from the frame's own status bar (v02.31.23 b250508) and the sign-in
   panel's build line (LoginDialog, "Build 3960 (250508)", "2.31.23 - Spring
   2025"); the support address is the one art. 304393 gives for Request
   support (e-mail). */
function AboutMoisDialog({ onClose }: { onClose: () => void }) {
  return (
    <DemographicModal title="About MOIS" width={420} onClose={onClose} dialog="about">
      <div style={{ padding: '16px 20px', display: 'grid', gap: 6, textAlign: 'center' }}>
        <b style={{ fontSize: 16 }}>MOIS</b>
        <span>Version 2.31.23 - Spring 2025</span>
        <span>v02.31.23 b250508 &nbsp;·&nbsp; Build 3960 (250508)</span>
        <span>Released 2025.05.08</span>
        <span style={{ marginTop: 8 }}>Bright Health Solutions Society</span>
        <span>support@mymois.ca &nbsp;·&nbsp; 250 564 2644 &nbsp;·&nbsp; brighthealth.ca</span>
      </div>
      <DialogButtons><CmdButton command="about-ok" wide onClick={onClose}>Ok</CmdButton></DialogButtons>
    </DemographicModal>
  )
}

/* --- Maintenance ▸ Default Value Setting ---------------------------------------
   art. 304679 `0b1df7e4…png`: title "Default Value", one group box holding
   Field Name and Default Value, then Save Value / Cancel. Field Name is the
   field the cursor was in when the menu was chosen; Default Value is what
   was typed there. */
function DefaultValueDialog({ field: asked, value, onClose }: { field?: string; value?: string; onClose: () => void }) {
  /* the field the cursor was left in, read once as the window opens */
  const [here] = useState(() => lastFieldInfo())
  const field = asked ?? here.field
  const [typed, setTyped] = useState(value ?? here.value)
  return (
    <DemographicModal title="Default Value" width={430} onClose={onClose} dialog="default-value">
      <div style={{ padding: 10 }}>
        <div className="pb-groupbox" style={{ padding: '8px 10px' }}>
          <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '90px 1fr', alignItems: 'center' }}>
            <span className="pb-form__label">Field Name:</span>
            <PBInput aria-label="Default value field name" w="100%" value={field} readOnly data-tutorial-id="host.mois.field.default-value-field-name" />
            <span className="pb-form__label">Default Value:</span>
            <PBInput aria-label="Default value" w="100%" value={typed} onChange={(e) => setTyped(e.target.value)} />
          </div>
        </div>
      </div>
      <DialogButtons>
        <CmdButton command="save-value" wide disabled={!field} onClick={() => { saveDefaultValue(field, typed); onClose() }}>Save Value</CmdButton>
        <CmdButton command="default-value-cancel" wide onClick={onClose}>Cancel</CmdButton>
      </DialogButtons>
    </DemographicModal>
  )
}

/* --- Select File ---------------------------------------------------------------
   art. 303794 `145afabe…png` (and annotation 4 of `cda6b539…png`): the
   Windows common dialog Chart Navigator - Load from File raises — Look in,
   the file list, File name, Files of type, Open / Cancel. The manual's tip is
   that a .txt is not listed until Files of type is set to All Files (*.*),
   so the default filter here lists CSV files only. The desktop's contents are
   this stage's sample files, not a transcription. */
const SAMPLE_FILES = [
  { name: 'CHART', kind: 'Microsoft Excel Comma Separated Values File', size: '1 KB', csv: true },
  { name: 'PHN', kind: 'Text Document', size: '76 bytes', csv: false },
]
function SelectFileDialog({ onClose, onOpen }: { onClose: () => void; onOpen: () => void }) {
  const [all, setAll] = useState(false)
  const files = SAMPLE_FILES.filter((f) => all || f.csv)
  const [name, setName] = useState('CHART')
  return (
    <DemographicModal title="Select File" width={640} height={330} onClose={onClose} dialog="select-file">
      <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6, flex: '1 1 auto', minHeight: 0 }}>
        <div className="pb-row"><span>Look in:</span><PBSelect aria-label="Look in" options={['Desktop']} w={220} /></div>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
          <PBDataWindow
            gutter={false}
            rows={files}
            current={Math.max(0, files.findIndex((f) => f.name === name))}
            onCurrentChange={(i) => files[i] && setName(files[i].name)}
            onActivate={onOpen}
            rowTutorialId={(r) => `host.mois.row.file-${r.name.toLowerCase()}`}
            columns={[
              { key: 'name', header: 'Name', width: 180 },
              { key: 'kind', header: 'Type' },
              { key: 'size', header: 'Size', width: 80, align: 'right' },
            ]}
            empty=" "
          />
        </div>
        <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '80px 1fr 90px', alignItems: 'center' }}>
          <span>File name:</span>
          <PBInput aria-label="File name" value={name} onChange={(e) => setName(e.target.value)} />
          <CmdButton command="select-file-open" disabled={!name} onClick={onOpen}>Open</CmdButton>
          <span>Files of type:</span>
          <PBSelect aria-label="Files of type" options={['CSV Files (*.csv)', 'All Files (*.*)']} value={all ? 'All Files (*.*)' : 'CSV Files (*.csv)'} onChange={(e) => setAll(e.target.value.startsWith('All'))} />
          <CmdButton command="select-file-cancel" onClick={onClose}>Cancel</CmdButton>
        </div>
      </div>
    </DemographicModal>
  )
}

/* --- Action ▸ Print Demographics (Ctrl+D) ---------------------------------------
   art. 319687 `efa54f10…png`, and art. 303741's Demographics-folder Action
   table ("Opens the Print Preview dialog for the patient's demographic
   information"). The page is PATIENT DEMOGRAPHIC INFORMATION: identity and
   contacts on the left, clinic provider / facility / location / service
   center on the right, then ALIAS LIST, CONNECTION LIST, ASSOCIATED PARTIES
   and NOTES. It opens in the same Richtext Report window every MOIS print
   preview uses. */
function PrintDemographicsWindow({ onClose }: { onClose: () => void }) {
  const p = usePatient()
  const aliases = p.aliasIds ?? []
  const connections = useChartRecords('connection')
  const pad = (s: string, n: number) => (s.length >= n ? `${s} ` : s + ' '.repeat(n - s.length))
  const left = (label: string, value = '') => pad(label, 18) + value
  const row = (l: string, r: string) => pad(l, 58) + r
  const lines = [
    '                          PATIENT DEMOGRAPHIC INFORMATION',
    '%RULE%',
    left('CHART NUMBER:', p.chart),
    '%RULE%',
    row(left('PATIENT NAME:', `${p.first}  ${p.last}`.trim()), `CLINIC PROVIDER:  ${p.provider ?? ''}`),
    row(left('ADDRESS:', p.address ?? ''), `FACILITY CODE:    ${p.facility ?? ''}`),
    row(left('', p.address2 ?? ''), `LOCATION CODE:    ${p.officeLocation ?? ''}`),
    row(left('', [p.city, p.province, p.country].filter(Boolean).join('  ')), `SERVICE CENTER:   ${p.service ?? ''}`),
    left('', p.postal ?? ''),
    left('PHONE:', `${p.home ?? ''}  (home)  ${p.work ?? ''}  loc ${p.workExt ?? ''}  (work)`),
    left('', `${p.cell ?? ''}  (cell)`),
    left('EMAIL:', `${p.emailHome ?? ''}  (home)`),
    left('', `${p.emailWork ?? ''}  (work)`),
    '',
    left('DOB:', p.dob),
    left('GENDER:', p.gender),
    left('MED INSUR NO:', `${p.insurance ?? ''}  ${p.dep ?? ''}`),
    '%RULE%',
    row('ALIAS LIST', 'CONNECTION LIST'),
    row(pad('TYPE', 24) + pad('VALUE', 20) + 'EFFECTIVE', pad('CONNECTION TYPE', 18) + pad('PROVIDER', 20) + pad('START', 12) + 'END'),
    ...Array.from({ length: Math.max(aliases.length, connections.length, 1) }, (_, i) => {
      const a = aliases[i]
      const c = connections[i]
      return row(
        a ? pad(a.desc ?? a.code ?? '', 24) + pad(a.value ?? '', 20) + (a.effective ?? '') : '',
        c ? pad(c.str_connection_type ?? '', 18) + pad(c.str_provider ?? '', 20) + pad(date(c.dtm_start), 12) + date(c.dtm_end) : '',
      )
    }),
    '%RULE%',
    'ASSOCIATED PARTIES',
    pad('TYPE', 20) + pad('NAME', 22) + pad('RELATIONSHIP', 16) + pad('HOME', 14) + pad('WORK', 14) + pad('LOC', 6) + 'CELL',
    ...(p.associatedParties ?? []).map((a) =>
      pad(a.type ?? '', 20) + pad(a.name ?? '', 22) + pad(a.relationship ?? '', 16) + pad(a.home ?? '', 14) + pad(a.work ?? '', 14) + pad(a.ext ?? '', 6) + (a.cell ?? '')),
    '%RULE%',
    'NOTES:',
    p.generalNotes ?? '',
  ]
  const report: PrintReport = {
    menu: 'Print Demographics',
    title: 'Print Demographics',
    fields: [],
    reportTitle: 'Patient Demographic Information',
    captured: true,
    page: lines.join('\n'),
  }
  return <RichtextReportWindow report={report} onClose={onClose} />
}

/* --- Action ▸ Family Summary (Ctrl+F) --------------------------------------------
   art. 301561 `cda16d47…png`: title "Family Summary", one Contact
   Information band over a Chart / Name / Relationship / DoB / Home / Work
   grid, and Close. It lists only relatives who are patients at the clinic
   with a MOIS chart number, so a family history row with no chart behind it
   — 87288's one relative has none — does not appear. */
function FamilySummaryDialog({ onClose }: { onClose: () => void }) {
  const roster = usePatientRoster()
  const family = useChartRecords('family_hx')
  const rows = family
    /* a Family Hx row names a relative; only one linked to a chart of this
       clinic (`id_chart_relative`) is a family member the summary can list */
    .map((f) => ({ f, chart: roster.find((p) => !!f.id_chart_relative && p.chart === f.id_chart_relative) }))
    .filter((x) => x.chart)
    .map(({ f, chart }) => ({
      chart: chart!.chart, name: `${chart!.last}, ${chart!.first}`, relationship: f.str_relationship ?? '',
      dob: chart!.dob, home: chart!.home ?? '', work: chart!.work ?? '',
    }))
  return (
    <DemographicModal title="Family Summary" width={700} height={470} onClose={onClose} dialog="family-summary">
      <div style={{ padding: 10, flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <PBBand>Contact Information</PBBand>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
          <PBDataWindow
            gutter={false}
            rows={rows}
            columns={[
              { key: 'chart', header: 'Chart', width: 64, align: 'center' },
              { key: 'name', header: 'Name', width: 160 },
              { key: 'relationship', header: 'Relationship', width: 130 },
              { key: 'dob', header: 'DoB', width: 90, align: 'center' },
              { key: 'home', header: 'Home', width: 100 },
              { key: 'work', header: 'Work' },
            ]}
            empty=" "
          />
        </div>
      </div>
      <DialogButtons><CmdButton command="family-summary-close" wide onClick={onClose}>Close</CmdButton></DialogButtons>
    </DemographicModal>
  )
}

/* --- Action ▸ Account Summary (Alt+F1) --------------------------------------------
   art. 301560 `388a4abb…png`: title "Summary of All Accounts", an Accounts
   List band with a filter strip, the grid Date / Provider / File / Payor /
   Code / Billed / Paid / Diag Code / Recon / W/O, and Save as / Print List
   bottom left with Close centred. The chart export carries no claims, so the
   list is empty on this stage. */
function AccountSummaryDialog({ onClose }: { onClose: () => void }) {
  return (
    <DemographicModal title="Summary of All Accounts" width={700} height={540} onClose={onClose} dialog="account-summary">
      <div style={{ padding: 10, flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <PBBand>Accounts List</PBBand>
        <div className="pb-row" style={{ gap: 2, padding: '2px 3px', background: 'var(--pb-band)' }}>
          <span style={{ width: 62 }} />
          {[108, 60, 62, 60, 70, 70, 60, 50].map((w, i) => <PBInput key={i} w={w} aria-label={`Accounts filter ${i + 1}`} />)}
        </div>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
          <PBDataWindow
            rows={[] as Record<string, string>[]}
            columns={[
              { key: 'date', header: 'Date', width: 64, align: 'center' },
              { key: 'provider', header: 'Provider', width: 110 },
              { key: 'file', header: 'File', width: 60 },
              { key: 'payor', header: 'Payor', width: 62 },
              { key: 'code', header: 'Code', width: 60, align: 'center' },
              { key: 'billed', header: 'Billed', width: 70, align: 'right' },
              { key: 'paid', header: 'Paid', width: 70, align: 'right' },
              { key: 'diag', header: 'Diag Code', width: 60, align: 'center' },
              { key: 'recon', header: 'Recon', width: 50, align: 'center' },
              { key: 'wo', header: 'W/O', align: 'center' },
            ]}
            empty="No claims on file for this chart."
          />
        </div>
      </div>
      <div className="pb-row" style={{ padding: '0 10px 10px', gap: 6 }}>
        <PBButton wide>Save as</PBButton>
        <PBButton wide>Print List</PBButton>
        <span className="pb-row__spacer" />
        <CmdButton command="account-summary-close" wide onClick={onClose}>Close</CmdButton>
        <span className="pb-row__spacer" />
        <span style={{ width: 180 }} />
      </div>
    </DemographicModal>
  )
}

/** PBMessageBox's look with anchored buttons (`host.mois.command.{prefix}-{value}`),
    so a lesson can ring and press Yes / No / OK on a MOIS confirmation. */
function CmdMessageBox({ title, icon, buttons, prefix, onClose, children }: {
  title: string
  icon: 'info' | 'question'
  buttons: { label: string; value: string; default?: boolean }[]
  prefix: string
  onClose: (value: string) => void
  children: ReactNode
}) {
  return (
    <DesktopLayer>
      <div className="pb-modal-layer" style={{ zIndex: 100 }}>
        <PBWindow child controls={false} title={title} onClose={() => onClose('cancel')} className="pb-msgbox" tutorialId={`host.mois.dialog.${prefix}`}>
          <div className="pb-msgbox__body">
            <span className="pb-msgbox__icon">
              <svg viewBox="0 0 32 32" width="32" height="32">
                <circle cx="16" cy="16" r="14" fill="#1f7fd0" />
                {icon === 'info'
                  ? <><circle cx="16" cy="9.5" r="2" fill="#fff" /><path d="M13.6 14h4.2v10h-4.2z" fill="#fff" /></>
                  : <><path d="M11.6 12.2c0-2.6 2-4.4 4.6-4.4 2.7 0 4.5 1.6 4.5 4 0 3.4-4 3.2-4 6.6h-3c0-4.4 4-4.2 4-6.4 0-1-.7-1.6-1.6-1.6-1 0-1.7.7-1.7 1.8z" fill="#fff" /><circle cx="16" cy="23.5" r="2" fill="#fff" /></>}
              </svg>
            </span>
            <span className="pb-msgbox__text">{children}</span>
          </div>
          <div className="pb-msgbox__footer">
            {buttons.map((b) => (
              <CmdButton key={b.value} command={`${prefix}-${b.value}`} className={b.default ? 'pb-btn--default' : undefined} onClick={() => onClose(b.value)}>
                {b.label}
              </CmdButton>
            ))}
          </div>
        </PBWindow>
      </div>
    </DesktopLayer>
  )
}

/* --- Utilities ▸ Chart Merging… ▸ Merge Chart ----------------------------------------
   art. 301557 `b700fde9…png`: the four numbered Instructions, a Merge Log
   band (Date, User, a Reason box), then Select Charts — Item / Main Chart /
   To Archive Chart / Investigate — where each row that differs needs its
   Okay box ticked; identical rows read "Matched.". Items to Review counts
   the unticked ones and the panel turns green and reads Complete at zero.
   Merge Chart (F2) asks "Confirmation: Chart Merge" (`d60233a0…png`) and
   ends on "Merge Complete" (`8ee7cae7…png`). A special function, off by
   default (Admin ▸ User Account ▸ Special Functions). */
type MergeItem = { item: string; main: string; archive: string }

function MergeChartDialog({ onClose }: { onClose: () => void }) {
  const p = usePatient()
  const roster = usePatientRoster()
  const [reason, setReason] = useState('')
  const [archiveChart, setArchiveChart] = useState('')
  const [lookup, setLookup] = useState(false)
  const [okay, setOkay] = useState<Set<string>>(new Set())
  const [step, setStep] = useState<null | 'confirm' | 'done'>(null)
  const a = roster.find((r) => r.chart === archiveChart)
  const stamp = nowStamp()
  const items: MergeItem[] = [
    { item: 'First Name:', main: p.first, archive: a?.first ?? '' },
    { item: 'Middle Name:', main: p.middle, archive: a?.middle ?? '' },
    { item: 'Last Name:', main: p.last, archive: a?.last ?? '' },
    { item: 'DoB:', main: p.dob, archive: a?.dob ?? '' },
    { item: 'Sex:', main: p.gender, archive: a?.gender ?? '' },
    { item: 'Insurance:', main: `${p.insuranceBy ?? ''}  ${p.insurance ?? ''}  ${p.dep ?? ''}`, archive: a ? `${a.insuranceBy ?? ''}  ${a.insurance ?? ''}  ${a.dep ?? ''}` : '' },
    { item: 'BC Health No.:', main: p.bchn ?? '', archive: a?.bchn ?? '' },
  ]
  const differing = a ? items.filter((i) => i.main.trim() !== i.archive.trim()) : []
  const toReview = differing.filter((i) => !okay.has(i.item)).length
  const complete = !!a && toReview === 0
  useScreenReport(step === 'confirm' ? { prompt: 'confirm-chart-merge' } : step === 'done' ? { prompt: 'merge-complete' }
    : lookup ? { prompt: 'chart-lookup' } : a ? { prompt: complete ? 'merge-ready' : 'merge-investigate' } : {})
  const merge = () => { if (complete) setStep('confirm') }
  return (
    <DemographicModal title="Merge Chart" width={740} onClose={onClose} dialog="merge-chart">
      <div onKeyDown={(e) => { if (e.key === 'F2') { e.preventDefault(); merge() } }} style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: '#fff', padding: '8px 14px', borderBottom: '2px solid #333' }}>
          <b>Instructions:</b>
          <ol style={{ margin: '4px 0 0', paddingLeft: 22 }}>
            <li>Select a Main Record - this record will remain as an active chart.</li>
            <li>Select a To Archive Record - the contents of this chart will be moved to the Main Chart and the Archive Chart status will be changed to &apos;AR&apos;chive.</li>
            <li>Verify the data elements that do not match.</li>
            <li>Merge Charts.</li>
          </ol>
        </div>
        <div style={{ padding: '8px 12px' }}>
          <div className="pb-groupbox">
            <PBBand>Merge Log</PBBand>
            <div className="pb-form" style={{ gridTemplateColumns: '60px 1fr 60px 1fr', padding: '4px 8px', alignItems: 'start' }}>
              <span>Date:</span><b>{stamp.date}</b><span>User:</span><b>{SESSION_USER}</b>
              <span>Reason:</span>
              <PBTextArea aria-label="Merge reason" rows={2} style={{ gridColumn: 'span 3' }} value={reason} onChange={(e) => setReason(e.target.value)} data-tutorial-id="host.mois.field.merge-reason" />
            </div>
          </div>
          <div className="pb-groupbox" style={{ marginTop: 6 }}>
            <PBBand>Select Charts</PBBand>
            <table className="pb-mergetable" style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
              <thead>
                <tr>{['Item', 'Main Chart', 'To Archive Chart', 'Investigate'].map((h) => <th key={h} style={{ textAlign: 'left', padding: '2px 6px', borderBottom: '1px solid #999' }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '2px 6px' }}>Chart No.:</td>
                  <td style={{ padding: '2px 6px' }}><PBInput w={90} value={p.chart} readOnly /></td>
                  <td style={{ padding: '2px 6px' }}>
                    <PBInput w={90} value={archiveChart} readOnly />
                    <CmdButton command="merge-lookup" className="pb-link" style={{ border: 0, background: 'none', marginLeft: 8 }} onClick={() => setLookup(true)}>Lookup ...</CmdButton>
                  </td>
                  <td />
                </tr>
                {items.map((i) => {
                  const same = !a || i.main.trim() === i.archive.trim()
                  return (
                    <tr key={i.item}>
                      <td style={{ padding: '2px 6px' }}>{i.item}</td>
                      <td style={{ padding: '2px 6px' }}><b>{i.main}</b></td>
                      <td style={{ padding: '2px 6px' }}><b>{i.archive}</b></td>
                      <td style={{ padding: '2px 6px' }}>
                        {!a ? null : same ? 'Matched.' : (
                          <PBCheckbox label="Okay" tutorialId={`host.mois.field.merge-okay-${i.item.replace(/[^A-Za-z]+/g, '-').toLowerCase().replace(/-$/, '')}`} checked={okay.has(i.item)}
                            onChange={(v) => setOkay((prev) => { const n = new Set(prev); v ? n.add(i.item) : n.delete(i.item); return n })} />
                        )}
                      </td>
                    </tr>
                  )
                })}
                <tr>
                  <td colSpan={3} />
                  <td style={{ padding: '2px 6px' }}>
                    <div>Items to Review: {a ? toReview : ''}</div>
                    {complete && <div data-tutorial-id="host.mois.field.merge-complete" style={{ background: '#b9f0b0', textAlign: 'center', fontWeight: 700 }}>Complete</div>}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <DialogButtons>
        <CmdButton command="merge-chart-f2" wide disabled={!complete} onClick={merge}>Merge Chart (F2)</CmdButton>
        <CmdButton command="merge-chart-cancel" wide onClick={onClose}>Cancel</CmdButton>
      </DialogButtons>
      {lookup && (
        <DesktopLayer>
          <AdvancedLookupDialog
            /* the list opens on a chart with this patient's name, the way a
               search for the duplicate lands on it */
            chart={roster.find((r) => r.chart !== p.chart && r.last.toUpperCase() === p.last.toUpperCase() && r.first.toUpperCase() === p.first.toUpperCase())?.chart ?? p.chart}
            roster={roster.filter((r) => r.chart !== p.chart)}
            zIndex={95}
            onPick={(chart) => { setArchiveChart(chart); setOkay(new Set()); setLookup(false) }}
            onClose={() => setLookup(false)}
          />
        </DesktopLayer>
      )}
      {step === 'confirm' && a && (
        <CmdMessageBox
          title="Confirmation: Chart Merge"
          icon="question"
          prefix="confirm-merge"
          buttons={[{ label: 'Yes', value: 'yes', default: true }, { label: 'No', value: 'no' }]}
          onClose={(v) => {
            if (v !== 'yes') { setStep(null); return }
            recordMerge(p.chart, {
              mergeDate: stamp.date, user: SESSION_USER, reason, status: 'ACTIVE', chart: a.chart,
              patient: `${a.first}  ${a.last}`, dob: a.dob, sex: a.gender, insBy: a.insuranceBy ?? '',
              insurance: a.insurance ?? '', dep: a.dep ?? '', bchn: a.bchn ?? '',
            })
            setStep('done')
          }}
        >
          You are going to copy (merge) chart {a.chart} into chart {p.chart}.<br />Would you like to continue?
        </CmdMessageBox>
      )}
      {step === 'done' && (
        <CmdMessageBox title="Merge Complete" icon="info" prefix="merge-complete" buttons={[{ label: 'OK', value: 'ok', default: true }]} onClose={() => onClose()}>
          The selected chart have been merge and archived.
        </CmdMessageBox>
      )}
    </DemographicModal>
  )
}

/* --- Utilities ▸ Chart Merging… ▸ Unmerge Chart ---------------------------------------
   art. 301558 `bfc9b0d6…png`: title "Unmerge Chart Information", a Current
   Chart band (Chart No., name, DoB, Sex, Insurance, BC Health No.), the
   Merge Log grid (Merge Date / User Name / Reason / Status / Chart / Patient
   Name / DOB / Sex / Ins By / Insurance Number / Dep / BCHN), then
   Un-Merge Selected Chart / Cancel. Confirmation: Unmerge (`17e28bc7…png`)
   asks Yes / No; an Un-Merge Complete notice follows. */
const MERGE_COLUMNS = [
  { key: 'mergeDate', header: <>Merge<br />Date</>, width: 70, align: 'center' as const },
  { key: 'user', header: 'User Name', width: 110 },
  { key: 'reason', header: 'Reason', width: 140 },
  { key: 'status', header: 'Status', width: 74, align: 'center' as const },
  { key: 'chart', header: 'Chart', width: 64, align: 'center' as const },
  { key: 'patient', header: 'Patient Name', width: 140 },
  { key: 'dob', header: 'DOB', width: 70, align: 'center' as const },
  { key: 'sex', header: 'Sex', width: 32, align: 'center' as const },
  { key: 'insBy', header: <>Ins<br />By</>, width: 32, align: 'center' as const },
  { key: 'insurance', header: <>Insurance<br />Number</>, width: 80 },
  { key: 'dep', header: 'Dep', width: 36, align: 'center' as const },
]

function CurrentChartBand({ bchn = true }: { bchn?: boolean }) {
  const p = usePatient()
  return (
    <div className="pb-groupbox">
      <PBBand>Current Chart</PBBand>
      <div className="pb-row" style={{ padding: '4px 8px', gap: 18 }}>
        <span>Chart No.:&nbsp; <b>{p.chart}</b></span>
        <b>{p.first}&nbsp; {p.last}</b>
        <span>DoB:&nbsp; {p.dob}</span>
        <span>Sex:&nbsp; {p.gender}</span>
        <span>Insurance:&nbsp; {p.insuranceBy} {p.insurance} {p.dep}</span>
        {bchn && <span>BC Health No.:&nbsp; {p.bchn}</span>}
      </div>
    </div>
  )
}

function UnmergeChartDialog({ onClose }: { onClose: () => void }) {
  const p = usePatient()
  const log = useMergeLog(p.chart).filter((r) => r.status === 'ACTIVE')
  const [cur, setCur] = useState(0)
  const [step, setStep] = useState<null | 'confirm' | 'done'>(null)
  const row = log[cur]
  useScreenReport(step === 'confirm' ? { prompt: 'confirm-unmerge' } : step === 'done' ? { prompt: 'unmerge-complete' } : {})
  return (
    <DemographicModal title="Unmerge Chart Information" width={960} height={560} onClose={onClose} dialog="unmerge-chart">
      <div style={{ padding: 8, flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <CurrentChartBand />
        <div className="pb-groupbox" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <PBBand>Merge Log</PBBand>
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
            <PBDataWindow<MergeLogRow & Record<string, string | undefined>>
              rows={log as (MergeLogRow & Record<string, string | undefined>)[]}
              current={cur}
              onCurrentChange={setCur}
              columns={[...MERGE_COLUMNS, { key: 'bchn', header: 'BCHN', width: 80 }]}
              empty="No charts have been merged into this chart."
            />
          </div>
        </div>
      </div>
      <DialogButtons>
        <CmdButton command="un-merge-selected-chart" disabled={!row} onClick={() => setStep('confirm')}>Un-Merge Selected Chart</CmdButton>
        <CmdButton command="unmerge-cancel" wide onClick={onClose}>Cancel</CmdButton>
      </DialogButtons>
      {step === 'confirm' && row && (
        <CmdMessageBox
          title="Confirmation: Unmerge"
          icon="question"
          prefix="confirm-unmerge"
          buttons={[{ label: 'Yes', value: 'yes', default: true }, { label: 'No', value: 'no' }]}
          onClose={(v) => {
            if (v !== 'yes') { setStep(null); return }
            rollBackMerge(p.chart, row.chart, nowStamp().date, SESSION_USER)
            setStep('done')
          }}
        >
          Would you like to unmerge chart {row.chart} from the current chart?
        </CmdMessageBox>
      )}
      {step === 'done' && (
        /* art. 301558 names an "Un-Merge Complete screen" but does not show
           it; its wording here is inferred */
        <CmdMessageBox title="Un-Merge Complete" icon="info" prefix="unmerge-complete" buttons={[{ label: 'OK', value: 'ok', default: true }]} onClose={() => onClose()}>
          The selected chart has been unmerged from the current chart.
        </CmdMessageBox>
      )}
    </DemographicModal>
  )
}

/* --- Utilities ▸ Chart Merging… ▸ View Merge Log ---------------------------------------
   art. 301559 `8622c6c3…png`: title "Chart Merge Log", a Current Chart band
   (no BC Health No. on this one), the Merge Log grid, then the Rollback Log
   grid (Rollback Date / Rollback By / Reason / Status / Chart / Patient Name
   / DOB / Sex / Ins By / Insurance Number / Dep). Read-only; Esc closes. */
function MergeLogDialog({ onClose }: { onClose: () => void }) {
  const p = usePatient()
  const log = useMergeLog(p.chart)
  const rolled = log.filter((r) => r.status === 'ROLLED BACK')
  return (
    <DemographicModal title="Chart Merge Log" width={840} height={560} onClose={onClose} dialog="merge-log">
      <div style={{ padding: 8, flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <CurrentChartBand bchn={false} />
        <div className="pb-groupbox" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <PBBand>Merge Log</PBBand>
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
            <PBDataWindow gutter={false} rows={log as unknown as Record<string, string>[]} columns={MERGE_COLUMNS} empty=" " />
          </div>
        </div>
        <div className="pb-groupbox" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <PBBand>Rollback Log</PBBand>
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
            <PBDataWindow
              gutter={false}
              rows={rolled as unknown as Record<string, string>[]}
              columns={[
                { key: 'rollbackDate', header: <>Rollback<br />Date</>, width: 70, align: 'center' },
                { key: 'rollbackBy', header: 'Rollback By', width: 110 },
                ...MERGE_COLUMNS.slice(2),
              ]}
              empty=" "
            />
          </div>
        </div>
      </div>
    </DemographicModal>
  )
}

/* --- Utilities ▸ Paste Patient Text ------------------------------------------------------
   art. 303788 `1e20d38f…png` (MOIS 2.09): the list window — its caption
   begins "<Response Window>" in that old capture, the rest is blurred — with
   a Patient Text band, New / Edit / Delete on it, an Author / Description
   grid and Select / Cancel; and the second window, "Patient Text", with
   Description, Author (prefilled with your name) and a large Text box, Save
   / Cancel. Select copies the highlighted entry's text to the clipboard. */
function PatientTextDialog({ onClose }: { onClose: () => void }) {
  const p = usePatient()
  const texts = usePatientTexts(p.chart)
  const [cur, setCur] = useState(0)
  const [editing, setEditing] = useState(false)
  const [description, setDescription] = useState('')
  const [text, setText] = useState('')
  useScreenReport(editing ? { prompt: 'patient-text-entry' } : {})
  const select = () => {
    const entry = texts[cur]
    if (!entry) return
    try { void navigator.clipboard?.writeText(entry.text) } catch { /* no clipboard permission on this page */ }
    onClose()
  }
  return (
    <DemographicModal title="<Response Window>" width={600} height={380} onClose={onClose} dialog="patient-text">
      <div style={{ padding: 8, flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <PBBand right={<>
          <CmdButton command="patient-text-new" size="sm" onClick={() => { setDescription(''); setText(''); setEditing(true) }}>New</CmdButton>
          <PBButton size="sm" disabled={!texts[cur]}>Edit</PBButton>
          <PBButton size="sm" disabled={!texts[cur]}>Delete</PBButton>
        </>}>Patient Text</PBBand>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
          <PBDataWindow
            rows={texts}
            current={cur}
            onCurrentChange={setCur}
            onActivate={select}
            columns={[{ key: 'author', header: 'Author', width: 180 }, { key: 'description', header: 'Description' }]}
            empty=" "
          />
        </div>
      </div>
      <DialogButtons>
        <CmdButton command="patient-text-select" wide disabled={!texts[cur]} onClick={select}>Select</CmdButton>
        <CmdButton command="patient-text-cancel" wide onClick={onClose}>Cancel</CmdButton>
      </DialogButtons>
      {editing && (
        <DemographicModal title="Patient Text" width={620} height={430} onClose={() => setEditing(false)}>
          <div style={{ padding: 8, flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <PBBand>Patient Text</PBBand>
            <div className="pb-form" style={{ gridTemplateColumns: '80px 1fr 50px 150px', padding: '6px 4px', alignItems: 'center' }}>
              <span>Description:</span>
              <PBInput aria-label="Patient text description" value={description} onChange={(e) => setDescription(e.target.value)} data-tutorial-id="host.mois.field.patient-text-description" />
              <span>Author:</span>
              <PBInput aria-label="Patient text author" value={SESSION_USER} readOnly />
              <span style={{ alignSelf: 'start' }}>Text:</span>
              <PBTextArea aria-label="Patient text" rows={10} style={{ gridColumn: 'span 3' }} value={text} onChange={(e) => setText(e.target.value)} />
            </div>
          </div>
          <DialogButtons>
            <CmdButton command="patient-text-save" wide disabled={!description.trim()} onClick={() => {
              addPatientText(p.chart, { author: SESSION_USER, description: description.trim(), text })
              setCur(texts.length)
              setEditing(false)
            }}>Save</CmdButton>
            <CmdButton command="patient-text-entry-cancel" wide onClick={() => setEditing(false)}>Cancel</CmdButton>
          </DialogButtons>
        </DemographicModal>
      )}
    </DemographicModal>
  )
}

/* --- Record History / Unsign Current Record ----------------------------------------------
   art. 304732 `d600f569…png`: the blue UNSIGNED / SIGNED link at the foot
   of a clinical window opens Record History — Date / Time / Action / User
   Name / Reason / Note — with Unsign Record bottom left and Close bottom
   right; Unsign Record opens "Unsign Current Record" (User Name, Date, Time,
   Reason, Unsign / Cancel), and MOIS will not take either action without a
   reason. On an unsigned record the same pair reads Sign Record / Sign
   Current Record — the manual shows only the signed case, so that wording
   is inferred from its "sign or unsign" text. */
export function RecordHistoryDialog({ recordKey, signed, onClose }: {
  recordKey: string
  /** whether the record is signed now — the link's own reading */
  signed: boolean
  onClose: () => void
}) {
  const history = useSignatureHistory(recordKey)
  const [asking, setAsking] = useState(false)
  const [reason, setReason] = useState('')
  const verb = signed ? 'Unsign' : 'Sign'
  const stamp = nowStamp()
  useScreenReport(asking ? { dialog: signed ? 'unsign-record' : 'sign-record' } : {})
  return (
    <DemographicModal title="Record History" width={640} height={380} onClose={onClose} dialog="record-history">
      <div style={{ padding: 6, flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        <PBDataWindow
          gutter={false}
          rows={history}
          columns={[
            { key: 'date', header: 'Date', width: 80, align: 'center' },
            { key: 'time', header: 'Time', width: 50, align: 'center' },
            { key: 'action', header: 'Action', width: 90 },
            { key: 'user', header: 'User Name', width: 150 },
            { key: 'reason', header: 'Reason / Note' },
          ]}
          empty=" "
        />
      </div>
      <div className="pb-row" style={{ padding: '0 6px 8px' }}>
        <CmdButton command={`${verb.toLowerCase()}-record`} wide onClick={() => { setReason(''); setAsking(true) }}>{verb} Record</CmdButton>
        <span className="pb-row__spacer" />
        <CmdButton command="record-history-close" wide onClick={onClose}>Close</CmdButton>
      </div>
      {asking && (
        <DemographicModal title={`${verb} Current Record`} width={360} onClose={() => setAsking(false)}>
          <div className="pb-form" style={{ padding: '14px 18px', gridTemplateColumns: '80px 1fr', alignItems: 'start' }}>
            <span>User Name:</span><b>{SESSION_USER}</b>
            <span>Date:</span><span>{stamp.date}</span>
            <span>Time:</span><span>{stamp.time}</span>
            <span>Reason:</span>
            <PBTextArea aria-label={`${verb} reason`} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} data-tutorial-id="host.mois.field.signature-reason" />
          </div>
          <DialogButtons>
            <CmdButton command={`confirm-${verb.toLowerCase()}`} wide disabled={!reason.trim()} onClick={() => {
              addSignatureEvent(recordKey, { ...stamp, action: signed ? 'UNSIGNED' : 'SIGNED', user: SESSION_USER, reason: reason.trim() })
              setAsking(false)
            }}>{verb}</CmdButton>
            <CmdButton command="signature-cancel" wide onClick={() => setAsking(false)}>Cancel</CmdButton>
          </DialogButtons>
        </DemographicModal>
      )}
    </DemographicModal>
  )
}

/** Signed or not: interface arrivals are inserted signed (art. 304732 — Source
    CDX, EXC or INTERFACE), everything else starts unsigned; the Record
    History then decides. */
export function useRecordSignature(recordKey: string, source: string | undefined): boolean {
  const history = useSignatureHistory(recordKey)
  const last = history[history.length - 1]
  if (last) return last.action === 'SIGNED'
  return ['CDX', 'EXC', 'INTERFACE'].includes((source ?? '').toUpperCase())
}
