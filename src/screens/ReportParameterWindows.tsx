import { useState, type ComponentType, type CSSProperties, type ReactNode } from 'react'
import { useScreenReport } from '../host/screen-state'
import { MOIS_TODAY, patients } from '../data/patients'
import {
  diagnosisReportPage, loadReportNavigator, recallNavigatorRows, RECALL_NAVIGATOR_CHARTS, unsentClaimsPages, yearsOld,
} from '../data/reportParams'
import { PBBand, PBCheckbox, PBInput, PBLookup, PBRadio, PBSelect, usePBInstrumentation } from '../pb'
import { registerAreaWindow, type AreaWindowProps } from './areaWindowRegistry'
import { DialogButton, WorkspaceDialogFrame } from './WorkspaceDialogFrame'

/* ============================================================================
   Report Selection Parameter windows — the Reports module's.

   A catalogue row's double-click opens its report's parameter window,
   captioned `Report: <Folder> - <Name>`. They share the chart print dialogs'
   anatomy (the grey `Selection Parameter` band, navy section headings ruled
   underneath, Ok / Cancel bottom-centre) but not their fields, so they are
   built here from the Reports articles' own captures:

   · Patient by Diagnosis / Fee — 304026 `8a07e40a`, 304033 `d18cb138`,
     304022 `1a5db5e9` (v02.17.20 b150326). Eight problems and eight fee
     codes in two columns although the headings say "Eight Problems" and
     "Four Fee Codes"; Active Patients Only ticked, Last Visit 3, Min
     Problems 1, Selection Type Or. Ok prints `LIST OF PATIENTS WITH
     SELECTED PROBLEMS` (304022) into the Print Preview.
   · Age/Sex Register — 304028 `bb9b44f3`: Options — As of Date, Time Period
     3, Provider(s) Current Desktop / All Providers, Patient Status A with
     Include TR patient status, and Deficient Items ▸ Direct output to
     Spreadsheet (CSV), ticked.
   · Patients by Age — 304029 `43b7304e`: Selection Options — Active Patients
     Only, Age Range (Leave blank to ignore), Last Contact (INCLUSIVE),
     Provider (If blank, ALL Providers), Gender ALL / Male / Female, and CSV
     Output ▸ Direct Output to Excel, ticked.
   · Patient List — 304029 `ccff332f`: Patient Information — Chart Range,
     Last Contact 0000.00.00 with Prior To / After (After set), Patient
     Status, Provider; CSV Output ▸ Direct output to Excel, ticked; and the
     note "Any option left BLANK will be ignored."
   · Recall List — 304025 `37798caf` (the window 304025 and 304381 walk):
     Report Options — Statuses A, Provider, Due Date, Code (matches) /
     (includes), Status All / Due / Completed Recalls with Due set, Grouping
     No Grouping / By Provider; CSV Output ▸ Direct output to Excel, Direct
     output to Chart Navigator for Chart Review / Mail Merge; Service Option
     ▸ Automatically stop printed recalls. (304358 `418f4fb5` is a newer,
     taller build of the same window with Service Episodes and Patient
     Connections sections; the older one is the one the how-to shows.)
   · Complete Unsent Records — 304052 `da63eea9`: Report Type Summary Report
     (data by provider) / Detail Report (list of all claims); Claims to
     Include ▸ Include Mark for Hold claims (greyed in the capture).

   Ok: a report sent to Excel closes its window — the spreadsheet opens in
   Excel, outside MOIS, which the stage does not paint. (The generic windows in
   screens/ReportSpecWindow.tsx open the stage's Excel sheet instead; these
   six keep closing, which their lessons grade on.) Printed pages follow the
   article captures: Age/Sex Register 304049 `f63a33b2` (AGE / SEX REGISTRY),
   Patients by Age `3a5a2015` (LIST OF PATIENTS BY AGE RANGE AND SEX), Patient
   List 304053 `299f5d11` (PATIENT LIST AS OF …, Chart Range filtering). The Recall List sent
   to the Chart Navigator loads the navigator and opens it. Anything else
   prints into the Print Preview (`print-preview`).

   Anchors: the window rings `host.mois.dialog.report-params-<report>`; its
   Ok / Cancel and the options a lesson presses are `host.mois.command.*`
   prefixed per report (`diagnosis-ok`, `recall-navigator`, `unsent-detail`),
   and report a `host.mois.command` when a learner clicks them. Each window
   reports what it holds into `host.screen` (`report`, `output`, …).
   ========================================================================= */

const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback)
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback)

const NAVY = '#000080'
const PROVIDERS = ['', 'BEARDWOOD, WALTER', 'DUCHARME, AMARILYS', 'FAIRCHILD, NESRIN L', 'HOWSER, DOOGIE', 'SHEWCHUK, LEAH']

/** the navy section heading, ruled underneath */
const Section = ({ children }: { children: ReactNode }) => (
  <div style={{ color: NAVY, fontWeight: 700, padding: '5px 8px 3px', borderBottom: '1px solid #a0a0a0', borderTop: '1px solid #a0a0a0', marginTop: 4 }}>
    {children}
  </div>
)

/** label + control on one line, the label in its own fixed column */
const Line = ({ label, w = 90, children, style }: { label?: ReactNode; w?: number; children: ReactNode; style?: CSSProperties }) => (
  <div className="pb-row" style={{ gap: 6, padding: '2px 10px', minHeight: 21, ...style }}>
    <span className="pb-form__label" style={{ width: w, flex: 'none' }}>{label}</span>
    {children}
  </div>
)

const Hint = ({ children }: { children: ReactNode }) => <span style={{ whiteSpace: 'nowrap' }}>{children}</span>

/** A checkbox a lesson presses: anchored and reported as a command. */
function CmdCheck({ id, label, checked, onChange, disabled }: {
  id: string; label: ReactNode; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean
}) {
  const host = usePBInstrumentation()
  return (
    <PBCheckbox
      label={label}
      checked={checked}
      disabled={disabled}
      tutorialId={host?.anchor('command', id)}
      onChange={(v) => { host?.report('command', { command: id }); onChange(v) }}
    />
  )
}

/** A radio a lesson presses, anchored on its input and reported as a command. */
function CmdRadio({ id, name, label, checked, onChange }: {
  id: string; name: string; label: ReactNode; checked: boolean; onChange: () => void
}) {
  const host = usePBInstrumentation()
  return (
    <label className="pb-check pb-check--radio">
      <input
        type="radio"
        name={name}
        checked={checked}
        data-tutorial-id={host?.anchor('command', id)}
        onChange={() => { host?.report('command', { command: id }); onChange() }}
      />
      <span className="pb-check__box"><span className="pb-check__dot" /></span>
      <span className="pb-check__label">{label}</span>
    </label>
  )
}

/** The frame every Reports parameter window shares. */
function ParamFrame({
  report, title, width, height, prefix, onOk, close, children,
}: {
  report: string; title: string; width: number; height: number; prefix: string
  onOk: () => void; close: () => void; children: ReactNode
}) {
  return (
    <WorkspaceDialogFrame id={`report-params-${report}`} title={title} width={width} height={height} controls={false} onClose={close}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, padding: '10px 12px 0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, border: '1px solid #646464', background: 'var(--pb-face)' }}>
          <PBBand>Selection Parameter</PBBand>
          <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', paddingBottom: 6 }}>{children}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 19, padding: '12px 0 10px', flex: 'none' }}>
          <DialogButton id={`${prefix}-ok`} width={75} isDefault onClick={onOk}>Ok</DialogButton>
          <DialogButton id={`${prefix}-cancel`} width={75} onClick={close}>Cancel</DialogButton>
        </div>
      </div>
    </WorkspaceDialogFrame>
  )
}

/* ===========================================================================
   Clinical - Main ▸ Patient by Diagnosis / Fee
   ======================================================================== */
function DiagnosisFeeParams({ args, close, open }: AreaWindowProps) {
  const seed = Array.isArray(args.problems) ? args.problems.map(String) : []
  const [problems, setProblems] = useState<string[]>(() => Array.from({ length: 8 }, (_, i) => seed[i] ?? ''))
  const [fees, setFees] = useState<string[]>(() => Array.from({ length: 8 }, () => ''))
  const [active, setActive] = useState(true)
  const [lastVisit, setLastVisit] = useState('3')
  const [minProblems, setMinProblems] = useState(str(args.minProblems, '1'))
  const [stopDate, setStopDate] = useState(false)
  const [andOr, setAndOr] = useState<'and' | 'or'>(args.selectionType === 'and' ? 'and' : 'or')
  const [excel, setExcel] = useState(bool(args.excel, false))
  useScreenReport({
    report: 'patient-by-diagnosis-fee', problems: problems.filter(Boolean).length,
    minProblems: Number(minProblems) || 1, selectionType: andOr, output: excel ? 'excel' : 'print',
  })

  const pairGrid = (label: string, values: string[], set: (v: string[]) => void, field: string) => (
    <div style={{ display: 'grid', gridTemplateColumns: '84px 184px 1fr 84px 184px', rowGap: 2, padding: '4px 10px', alignItems: 'center' }}>
      {values.map((v, i) => {
        const cell = (
          <span key={`f${i}`} className="pb-inputgroup" style={{ width: 184 }}>
            <input
              className="pb-field"
              value={v}
              data-tutorial-id={`host.mois.field.${field}-${i + 1}`}
              onChange={(e) => set(values.map((x, j) => (j === i ? e.target.value : x)))}
            />
            <button type="button" className="pb-inputgroup__btn pb-inputgroup__btn--dots">…</button>
          </span>
        )
        const lab = <span key={`l${i}`} className="pb-form__label">{label} {i + 1}:</span>
        return i % 2 === 0 ? [lab, cell, <span key={`s${i}`} />] : [lab, cell]
      })}
    </div>
  )

  const ok = () => {
    if (excel) { close(); return }
    open('print-preview', { title: 'Patient by Diagnosis / Fee', pages: [diagnosisReportPage(problems, Number(minProblems) || 1)] })
  }

  return (
    <ParamFrame report="patient-by-diagnosis-fee" prefix="diagnosis" title="Report: Clinical - Main - Patient by Diagnosis / Fee" width={640} height={575} onOk={ok} close={close}>
      <Section>Enter up to Eight Problems for search (&quot;CONTAINED IN&quot;)</Section>
      <div data-tutorial-id="host.mois.field.rp-problems">{pairGrid('Problem', problems, setProblems, 'rp-problem')}</div>
      <Section>Enter up to Four Fee Codes for search (Report on last paid date)</Section>
      <div data-tutorial-id="host.mois.field.rp-fee-codes">{pairGrid('Fee Code', fees, setFees, 'rp-fee-code')}</div>
      <Section>Other Options:</Section>
      <div data-tutorial-id="host.mois.field.rp-other-options" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '2px 0' }}>
        <div>
          <Line label="Patients List:" w={84}><PBCheckbox label="Active Patients Only" checked={active} onChange={setActive} /></Line>
          <Line label="Last Visit:" w={84}><PBInput w={52} align="right" value={lastVisit} onChange={(e) => setLastVisit(e.target.value)} /><Hint>(years since last)</Hint></Line>
          <Line label="Min Problems:" w={84}>
            <PBInput w={52} align="right" value={minProblems} data-tutorial-id="host.mois.field.rp-min-problems" onChange={(e) => setMinProblems(e.target.value)} />
            <Hint>(min # of problems)</Hint>
          </Line>
          <Line label="Facility Code:" w={84}><PBSelect w={116} options={['', 'A', 'B', 'C']} /></Line>
          <Line label="Service Center:" w={84}><PBSelect w={142} options={['', 'DAW HEALTH UNIT', 'PRINCE GEORGE']} /></Line>
        </div>
        <div>
          <Line label="Stop Date:" w={84}><PBCheckbox label="Include if Stop Date Present" checked={stopDate} onChange={setStopDate} /></Line>
          <Line label="Provider:" w={84}><PBSelect w={170} options={PROVIDERS} /></Line>
          <Line label="Selection Type:" w={84}>
            <span data-tutorial-id="host.mois.field.rp-selection-type" className="pb-row" style={{ gap: 14 }}>
              <CmdRadio id="diagnosis-and" name="rp-and-or" label="And" checked={andOr === 'and'} onChange={() => setAndOr('and')} />
              <CmdRadio id="diagnosis-or" name="rp-and-or" label="Or" checked={andOr === 'or'} onChange={() => setAndOr('or')} />
            </span>
          </Line>
        </div>
      </div>
      <Section>
        <span className="pb-row" style={{ gap: 24 }}>
          CSV Output
          <span style={{ color: '#000', fontWeight: 400 }}>
            <CmdCheck id="diagnosis-excel" label="Direct Output to Excel" checked={excel} onChange={setExcel} />
          </span>
        </span>
      </Section>
    </ParamFrame>
  )
}

/* ===========================================================================
   Clinical - Main ▸ Age/Sex Register
   ======================================================================== */
/** 304049 `f63a33b2`: AGE / SEX REGISTRY — ten-year bands, contacts and
    patients per sex, totals, and the unknowns under them. Contacts are
    synthetic (the roster carries no encounter counts). */
function ageSexPage(asOf: string, years: string, all: boolean, includeTr: boolean): string {
  const pts = patients.filter((p) => p.status === 'A' || (includeTr && p.status === 'TR'))
  const known = pts.filter((p) => p.dob && (p.gender === 'M' || p.gender === 'F'))
  const contacts = (chart: string) => (Number(chart) || chart.length) % 11
  const side = (sex: string, lo: number, hi: number) => {
    const list = known.filter((p) => { const a = Number(yearsOld(p.dob)); return p.gender === sex && a >= lo && a <= hi })
    return { n: list.length, c: list.reduce((t, p) => t + contacts(p.chart), 0) }
  }
  const cp = (c: number, n: number) => (n ? (c / n).toFixed(2) : '0.00')
  const bands = Array.from({ length: 10 }, (_, i) => [i * 10, i === 9 ? 200 : i * 10 + 9] as const)
  const m = side('M', 0, 200)
  const f = side('F', 0, 200)
  return [
    '**MOIS TEST CLINIC**',
    '%TITLE%AGE / SEX REGISTRY',
    `%LINE:33,40,27%As Of Date:  **${asOf}**|Patients Seen in Last:  **${years || '3'}**  years|For Provider(s): **${all ? 'ALL PROVIDERS' : 'CURRENT DESKTOP'}**`,
    '%COLS:14,15,15,12,15,15,14%',
    '%TH%Contacts / Pt|No. of Contacts|No. of Patients|AGE|No. of Patients|No. of Contacts|Contacts / Pt',
    ...bands.map(([lo, hi]) => {
      const a = side('M', lo, hi)
      const b = side('F', lo, hi)
      return `%TR%${cp(a.c, a.n)}|${a.c}|${a.n}|${lo} - ${hi === 200 ? '100+' : hi}|${b.n}|${b.c}|${cp(b.c, b.n)}`
    }),
    `%TR%**${cp(m.c, m.n)}**|**${m.c}**|**${m.n}**|**TOTALS**|**${f.n}**|**${f.c}**|**${cp(f.c, f.n)}**`,
    `%TR%||UNKNOWN AGE OR SEX:|${pts.length - known.length}||**TOTAL PATIENTS:**|**${known.length}**`,
  ].join('\n')
}

function AgeSexParams({ args, close, open }: AreaWindowProps) {
  const [asOf, setAsOf] = useState(MOIS_TODAY)
  const [period, setPeriod] = useState('3')
  const [providers, setProviders] = useState<'desktop' | 'all'>('all')
  const [includeTr, setIncludeTr] = useState(false)
  const [csv, setCsv] = useState(bool(args.csv, true))
  useScreenReport({ report: 'age-sex-register', output: csv ? 'excel' : 'print' })
  const ok = () => {
    if (csv) { close(); return }
    open('print-preview', { title: 'Age/Sex Register', pages: [ageSexPage(asOf || MOIS_TODAY, period, providers === 'all', includeTr)] })
  }
  return (
    <ParamFrame report="age-sex-register" prefix="agesex" title="Report: Clinical - Main - Age/Sex Register" width={640} height={505} onOk={ok} close={close}>
      <Section>Options</Section>
      <Line label="As of Date:"><PBInput w={84} align="right" value={asOf} onChange={(e) => setAsOf(e.target.value)} /><Hint>(a cut-off date for patient status - if blank use today)</Hint></Line>
      <Line label="Time Period:"><PBInput w={50} align="center" value={period} onChange={(e) => setPeriod(e.target.value)} /><Hint>(number of years from present or as of date, if applicable, since last contact)</Hint></Line>
      <div style={{ borderTop: '1px solid #c8c8c8', margin: '4px 0' }} />
      <Line label="Provider(s):">
        <span className="pb-row" style={{ gap: 18 }}>
          <PBRadio name="agesex-prov" label="Current Desktop" checked={providers === 'desktop'} onChange={() => setProviders('desktop')} />
          <PBRadio name="agesex-prov" label="All Providers" checked={providers === 'all'} onChange={() => setProviders('all')} />
        </span>
      </Line>
      <div style={{ borderTop: '1px solid #c8c8c8', margin: '4px 0' }} />
      <Line label="Patient Status:"><PBLookup w={104} defaultValue="A" /><Hint>(comma separated list, BLANK will include ALL - except for TR)</Hint></Line>
      <Line><PBCheckbox label="Include TR patient status" checked={includeTr} onChange={setIncludeTr} /></Line>
      <div style={{ borderTop: '1px solid #c8c8c8', margin: '4px 0' }} />
      <Line label="Deficient Items:">
        <span data-tutorial-id="host.mois.field.rp-deficient-items">
          <CmdCheck id="agesex-csv" label="Direct output to Spreadsheet (CSV)" checked={csv} onChange={setCsv} />
        </span>
      </Line>
    </ParamFrame>
  )
}

/* ===========================================================================
   Clinical - Main ▸ Patients by Age
   ======================================================================== */
function PatientsByAgeParams({ args, close, open }: AreaWindowProps) {
  const [active, setActive] = useState(true)
  const [ageFrom, setAgeFrom] = useState(str(args.ageFrom))
  const [ageTo, setAgeTo] = useState(str(args.ageTo))
  const [gender, setGender] = useState<'all' | 'm' | 'f'>('all')
  const [csv, setCsv] = useState(bool(args.csv, true))
  useScreenReport({ report: 'patients-by-age', ageFrom, ageTo, output: csv ? 'excel' : 'print' })
  const ok = () => {
    if (csv) { close(); return }
    const lo = ageFrom ? Number(ageFrom) || 0 : 0
    const hi = ageTo ? Number(ageTo) || 200 : 200
    const rows = patients
      .filter((p) => !active || p.status === 'A')
      .filter((p) => p.dob && (gender === 'all' || p.gender === gender.toUpperCase()))
      .map((p) => ({ p, age: Number(yearsOld(p.dob)) }))
      .filter(({ age }) => age >= lo && age <= hi)
      .sort((a, b) => a.p.last.localeCompare(b.p.last) || a.p.first.localeCompare(b.p.first))
    /* 304049 `3a5a2015`: LIST OF PATIENTS BY AGE RANGE AND SEX */
    open('print-preview', {
      title: 'Patients by Age',
      pages: [[
        '**MOIS TEST CLINIC**',
        '%TITLE%LIST OF PATIENTS BY AGE RANGE AND SEX',
        `%SUB%Ages Between: ${ageFrom || ageTo ? `${ageFrom || '0'} AND ${ageTo || '120'}` : 'ALL AGES'}   Sex: ${gender === 'all' ? 'ALL' : gender.toUpperCase()}   Include Only Active Patients: ${active ? 'Y' : 'N'}`,
        '%COLS:15,15,6,6,12,8,13,12,13%',
        '%TH%LAST NAME|FIRST NAME|AGE|SEX|DATE OF BIRTH|CHART NO|HOME|WORK|CELL/OTHER',
        ...rows.map(({ p, age }) => `%TR%${p.last}|${p.first}|${age}|${p.gender}|${p.dob}|${p.chart}|${p.home ?? ''}|${p.work ?? ''}|${p.cell ?? ''}`),
        '',
        `Records Printed: ${rows.length}`,
      ].join('\n')],
    })
  }
  return (
    <ParamFrame report="patients-by-age" prefix="byage" title="Report: Clinical - Main - Patients by Age" width={640} height={505} onOk={ok} close={close}>
      <Section>Selection Options</Section>
      <Line label="Patients List:"><PBCheckbox label="Active Patients Only" checked={active} onChange={setActive} /></Line>
      <Line label="Age Range:">
        <span data-tutorial-id="host.mois.field.rp-age-range" className="pb-row" style={{ gap: 6 }}>
          <PBInput w={54} value={ageFrom} data-tutorial-id="host.mois.field.rp-age-from" onChange={(e) => setAgeFrom(e.target.value)} /> to
          <PBInput w={54} value={ageTo} data-tutorial-id="host.mois.field.rp-age-to" onChange={(e) => setAgeTo(e.target.value)} />
        </span>
        <Hint>(Leave blank to ignore)</Hint>
      </Line>
      <Line label="Last Contact:"><PBInput w={92} /> to <PBInput w={92} /><Hint>(INCLUSIVE)</Hint></Line>
      <Line label="Provider:"><PBSelect w={170} options={PROVIDERS} /><Hint>(If blank, ALL Providers)</Hint></Line>
      <Line label="Gender:">
        <span className="pb-row" style={{ gap: 18 }}>
          <PBRadio name="byage-gender" label="ALL" checked={gender === 'all'} onChange={() => setGender('all')} />
          <PBRadio name="byage-gender" label="Male" checked={gender === 'm'} onChange={() => setGender('m')} />
          <PBRadio name="byage-gender" label="Female" checked={gender === 'f'} onChange={() => setGender('f')} />
        </span>
      </Line>
      <div style={{ borderTop: '1px solid #a0a0a0', margin: '4px 0' }} />
      <Line label="CSV Output:"><CmdCheck id="byage-csv" label="Direct Output to Excel" checked={csv} onChange={setCsv} /></Line>
    </ParamFrame>
  )
}

/* ===========================================================================
   Practice Management ▸ Patient List
   ======================================================================== */
function PatientListParams({ args, close, open }: AreaWindowProps) {
  const [lastContact, setLastContact] = useState(str(args.lastContact, '0000.00.00'))
  const [when, setWhen] = useState<'prior' | 'after'>(args.when === 'prior' ? 'prior' : 'after')
  const [csv, setCsv] = useState(bool(args.csv, true))
  useScreenReport({ report: 'patient-list', lastContactWhen: when, output: csv ? 'excel' : 'print' })
  const [chartFrom, setChartFrom] = useState('')
  const [chartTo, setChartTo] = useState('')
  /* Excel closes the window (the sheet opens outside MOIS); otherwise the
     printed list, 304053 `299f5d11`: PATIENT LIST AS OF … */
  const ok = () => {
    if (csv) { close(); return }
    const lo = Number(chartFrom) || 0
    const hi = Number(chartTo) || Number.MAX_SAFE_INTEGER
    const rows = patients.filter((p) => Number(p.chart) >= lo && Number(p.chart) <= hi)
    open('print-preview', {
      title: 'Patient List',
      pages: [[
        '**MOIS TEST CLINIC**',
        `%TITLE%PATIENT LIST AS OF ${MOIS_TODAY}`,
        `%SUB%LIST OF PATIENT WITH CHART NUMBERS BETWEEN ${chartFrom || 'FIRST'} AND ${chartTo || 'LAST'}`,
        `%SUB%${when === 'after' ? 'AFTER' : 'PRIOR TO'} LAST CONTACT DATE OF   ${lastContact && lastContact !== '0000.00.00' ? lastContact : '<ALL PATIENTS>'}`,
        '%COLS:13,13,8,10,15,13,12,7,9%',
        '%TH%LAST NAME|FIRST NAME|MIDDLE NAME|DOB|ADDRESS 1|CITY|HOME PHONE|STATUS|CHART NO',
        ...rows.map((p) => `%TR%${p.last}|${p.first}|${p.middle}|${p.dob}|${p.address ?? ''}|${p.city ?? ''}|${p.home ?? ''}|${p.status}|${p.chart}`),
      ].join('\n')],
    })
  }
  return (
    <ParamFrame report="patient-list" prefix="patientlist" title="Report: Practice Management - Patient List" width={640} height={420} onOk={ok} close={close}>
      <Section>Patient Information</Section>
      <Line label="Chart Range:"><PBInput w={62} value={chartFrom} data-tutorial-id="host.mois.field.rp-chart-from" onChange={(e) => setChartFrom(e.target.value)} /> to <PBInput w={62} value={chartTo} data-tutorial-id="host.mois.field.rp-chart-to" onChange={(e) => setChartTo(e.target.value)} /><Hint>(Inclusive)</Hint></Line>
      <Line label="Last Contact:">
        <span data-tutorial-id="host.mois.field.rp-last-contact" className="pb-row" style={{ gap: 12 }}>
          <PBInput w={74} align="center" value={lastContact} onChange={(e) => setLastContact(e.target.value)} />
          <CmdRadio id="patientlist-prior-to" name="patientlist-when" label="Prior To" checked={when === 'prior'} onChange={() => setWhen('prior')} />
          <CmdRadio id="patientlist-after" name="patientlist-when" label="After" checked={when === 'after'} onChange={() => setWhen('after')} />
        </span>
      </Line>
      <Line label="Patient Status:"><PBInput w={172} /><Hint>(comma separated list of status codes; BLANK = ALL)</Hint></Line>
      <Line label="Provider:"><PBSelect w={172} options={PROVIDERS} /></Line>
      <div style={{ borderTop: '1px solid #a0a0a0', margin: '8px 0 4px' }} />
      <Line label="CSV Output:"><CmdCheck id="patientlist-csv" label="Direct output to Excel" checked={csv} onChange={setCsv} /></Line>
      <div style={{ borderTop: '1px solid #a0a0a0', margin: '8px 0 4px' }} />
      <div style={{ padding: '4px 10px' }}>Note: Any option left BLANK will be ignored.</div>
    </ParamFrame>
  )
}

/* ===========================================================================
   Recalls / Reminders ▸ Recall List
   ======================================================================== */
function RecallListParams({ args, close, open }: AreaWindowProps) {
  const [status, setStatus] = useState<'all' | 'due' | 'completed'>('due')
  const [grouping, setGrouping] = useState<'none' | 'provider'>('none')
  const [code, setCode] = useState(str(args.code))
  const [excel, setExcel] = useState(false)
  const [navigator, setNavigator] = useState(bool(args.navigator, false))
  const [autoStop, setAutoStop] = useState(false)
  useScreenReport({ report: 'recall-list', recallStatus: status, output: navigator ? 'chart-navigator' : excel ? 'excel' : 'print' })
  const ok = () => {
    if (navigator) {
      loadReportNavigator(recallNavigatorRows())
      close()
      open('chart-navigator')
      return
    }
    if (excel) { close(); return }
    open('print-preview', {
      title: 'Recall List',
      heading: `RECALL LIST AS OF ${MOIS_TODAY}`,
      columns: [{ key: 'name', header: 'PATIENT', width: 180 }, { key: 'chart', header: 'CHART', width: 60 }, { key: 'code', header: 'CODE', width: 60 }, { key: 'home', header: 'HOME TEL', width: 110 }],
      rows: RECALL_NAVIGATOR_CHARTS.map((chart) => {
        const p = patients.find((x) => x.chart === chart)
        return { name: p ? `${p.last}, ${p.first}` : chart, chart, code: code || 'PAP', home: p?.home ?? '' }
      }),
    })
  }
  return (
    <ParamFrame report="recall-list" prefix="recall" title="Report: Recalls / Reminders - Recall List" width={640} height={505} onOk={ok} close={close}>
      <Section>Report Options</Section>
      <Line label="Statuses:" w={64}><PBLookup w={176} defaultValue="A" /><Hint>(optional: will filter for a specific Patient Status)</Hint></Line>
      <Line label="Provider:" w={64}><PBSelect w={176} options={PROVIDERS} /><Hint>(optional: will filter for a specific Service Provider)</Hint></Line>
      <Line label="Due Date:" w={64}><PBInput w={84} /> to <PBInput w={84} /><Hint>(inclusive)</Hint></Line>
      <Line label="Code:" w={64}>
        <PBSelect w={86} value={code} onChange={(e) => setCode(e.target.value)} options={['', 'CT', 'FLU', 'MAMMO', 'PAP']} />
        <Hint>(matches)</Hint><PBInput w={112} /><Hint>(includes)</Hint>
      </Line>
      <div style={{ display: 'grid', gridTemplateColumns: '84px 1fr', padding: '2px 10px', rowGap: 3 }}>
        <span className="pb-form__label">Status:</span>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }} data-tutorial-id="host.mois.field.rp-recall-status">
          <PBRadio name="recall-status" label="All Recalls" checked={status === 'all'} onChange={() => setStatus('all')} />
          <PBRadio name="recall-status" label="Due Recalls" checked={status === 'due'} onChange={() => setStatus('due')} />
          <PBRadio name="recall-status" label="Completed Recalls" checked={status === 'completed'} onChange={() => setStatus('completed')} />
          <span>(completed recalls are those which have the STOP field checked)</span>
        </span>
        <span className="pb-form__label">Grouping:</span>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <PBRadio name="recall-grouping" label="No Grouping" checked={grouping === 'none'} onChange={() => setGrouping('none')} />
          <PBRadio name="recall-grouping" label="By Provider" checked={grouping === 'provider'} onChange={() => setGrouping('provider')} />
        </span>
      </div>
      <div style={{ borderTop: '1px solid #a0a0a0', margin: '6px 0 2px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '84px 1fr', padding: '2px 10px', rowGap: 3 }} data-tutorial-id="host.mois.field.rp-csv-output">
        <span className="pb-form__label">CSV Output:</span>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <CmdCheck id="recall-excel" label="Direct output to Excel" checked={excel} onChange={setExcel} />
          <CmdCheck id="recall-navigator" label="Direct output to Chart Navigator for Chart Review / Mail Merge" checked={navigator} onChange={setNavigator} />
        </span>
      </div>
      <Section>Service Option</Section>
      <Line label="" w={74}><PBCheckbox label="Automatically stop printed recalls" checked={autoStop} onChange={setAutoStop} /></Line>
    </ParamFrame>
  )
}

/* ===========================================================================
   MSP Billing ▸ Complete Unsent Records
   ======================================================================== */
function UnsentRecordsParams({ args, close, open }: AreaWindowProps) {
  const [detail, setDetail] = useState(bool(args.detail, false))
  const [hold, setHold] = useState(false)
  useScreenReport({ report: 'complete-unsent-records', reportType: detail ? 'detail' : 'summary' })
  const ok = () => open('print-preview', {
    title: 'Complete Unsent Records',
    pages: unsentClaimsPages(detail, hold),
  })
  return (
    <ParamFrame report="complete-unsent-records" prefix="unsent" title="Report: MSP Billing - Complete Unsent Records" width={640} height={505} onOk={ok} close={close}>
      <Section>Report Type</Section>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '4px 30px' }} data-tutorial-id="host.mois.field.rp-report-type">
        <CmdRadio id="unsent-summary" name="unsent-type" label="Summary Report (data by provider)" checked={!detail} onChange={() => setDetail(false)} />
        <CmdRadio id="unsent-detail" name="unsent-type" label="Detail Report (list of all claims)" checked={detail} onChange={() => setDetail(true)} />
      </div>
      <Section>Claims to Include</Section>
      <div style={{ padding: '4px 30px' }}>
        <PBCheckbox label="Include Mark for Hold claims." checked={hold} onChange={setHold} disabled />
      </div>
    </ParamFrame>
  )
}

/* --- registration -------------------------------------------------------- */
const windows: Record<string, ComponentType<AreaWindowProps>> = {
  'report-params-patient-by-diagnosis-fee': DiagnosisFeeParams,
  'report-params-age-sex-register': AgeSexParams,
  'report-params-patients-by-age': PatientsByAgeParams,
  'report-params-patient-list': PatientListParams,
  'report-params-recall-list': RecallListParams,
  'report-params-complete-unsent-records': UnsentRecordsParams,
}
for (const [id, Component] of Object.entries(windows)) registerAreaWindow(id, Component)
