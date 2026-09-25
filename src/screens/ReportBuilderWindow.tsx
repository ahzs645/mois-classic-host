import { useState, type ReactNode } from 'react'
import { useScreenReport } from '../host/screen-state'
import { builderNavigatorRows, builderReports, loadReportNavigator, saveBuilderReport, type BuilderReport } from '../data/reportParams'
import { patients, MOIS_TODAY } from '../data/patients'
import { PBBand, PBCheckbox, PBDataWindow, PBSelect, PBTextArea, pbSlug, usePBInstrumentation } from '../pb'
import { registerAreaWindow, type AreaWindowProps } from './areaWindowRegistry'
import { DialogButton, WorkspaceDialogFrame } from './WorkspaceDialogFrame'

/* ============================================================================
   Advanced Medical Report Builder — Reports ▸ Report Builders.

   Two windows, as in MOIS: the list of reports you may see, and the Advanced
   Report Builder editor a New / Open / Clone lands in.

   PROVENANCE
   · List — 304055 `d2fba889` (current build): caption `Advanced Medical
     Report Builder`, a navy `Advanced Medical Reports` header, the New ·
     Delete · Open · Clone strip, and Name / Group / Description, with the
     reports as the capture lists them. The article's table calls Open "Edit".
   · Editor — 304055 `10429fe3` / `d008eb9b` (current build): a `Medical
     Report` band over three groups — Detail (Name, Desc., Access [Public ▼]
     with the owner beside it, Group), Actions (Save Changes; Other [Other
     options... ▼] Go) and Output (Report, CSV, Extended, Mail Merge) — then
     two rows of tabs: Interventions · Encounters · Connections · Alias ID ·
     Order · Preference · Risk for Cond. · MAR over Patient Data · Health
     Conditions · Measures · Medications · Imaging · Procedures · Consults ·
     Admissions. A tab carrying rules shows its count, `Measures (1)`
     (`ef440846`).
   · Patient Data — `10429fe3` / 304030 `f842e101`: Patient Characteristics
     (Patient Status A […] (comma separated), Age Range 0 to 120, Sex — a
     text box), Office Details (Provider, Facility Code, Service Center), Last
     Contact Date (In the last 3 year(s)), Additional Patient Data grid.
   · Health Conditions — `d008eb9b`: Health Issues; ☑ Patient has all the
     conditions listed below; ☐ Include records with a stop date; ☐ Include
     Extended Information in CSV File; ☐ Include Patients with No Known.;
     Concept or Problem Name contains… / Check Condition / Include in CSV
     File, and the two notes at the foot.
   · Measures — 304027 `c4b4980f`: Measurements; ☑ Patient has all the
     conditions listed below; "Limited investigation to a date range? ☑ Only
     look at data from the last [2] [Year(s)]"; Code / Concept / Description /
     Check Condition / Control Value / Check Against / When / Include in CSV
     File / # of Results to include* / Column Order in CSV File; the When and
     * notes.
   · Procedures — 304027 `ad4eaa86`: Procedures; Concept or Procedure
     contains … / Check Condition / When / Include in CSV File / Column Order.
   Medications, Imaging, Consults, Admissions and Interventions follow the
   Procedures shape (304055: "Patient has all the … listed below", "Limit
   Investigation to Date Range"); the other tabs (Encounters, Connections,
   Alias ID, Order, Preference, Risk for Cond., MAR) have their own layouts in
   304055 that no lesson here opens, so they show their heading only.

   Behaviour: New opens an empty report (Patient Status A, 0 to 120, last 3
   years); Open / Clone load the current row (a clone is renamed and starts
   Private); Save Changes adds the report to the list (a duplicate name is
   replaced — MOIS refuses one on New); Report prints into the Print Preview;
   Mail Merge loads the Chart Navigator; CSV and Extended hand off to Excel,
   outside MOIS. Each rule row: typing a concept and choosing a Check
   Condition counts it on its tab.

   Window ids `advanced-report-builder-list` and `advanced-report-builder`.
   Fields `host.mois.field.arb-name`, `arb-age-from`, `arb-age-to`, `arb-sex`,
   `arb-<tab>-concept-1`, `arb-<tab>-check-1`, `arb-<tab>-when-1`; commands
   `arb-new|open|clone|delete`, `arb-save`, `arb-report|csv|extended|mail-merge`.
   Reports `host.screen.builderReport`, `builderRules` (`measures:1,…`),
   `builderSaved`.
   ========================================================================= */

const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback)

const NAVY = '#000080'
const TOP_TABS = ['Interventions', 'Encounters', 'Connections', 'Alias ID', 'Order', 'Preference', 'Risk for Cond.', 'MAR']
const BOTTOM_TABS = ['Patient Data', 'Health Conditions', 'Measures', 'Medications', 'Imaging', 'Procedures', 'Consults', 'Admissions']
const RULE_TABS = new Set(['Health Conditions', 'Measures', 'Medications', 'Imaging', 'Procedures', 'Consults', 'Admissions', 'Interventions'])
const RULE_ROWS = 16

type Rule = { concept: string; check: string; when: string; csv: boolean }
const emptyRules = (): Rule[] => Array.from({ length: RULE_ROWS }, () => ({ concept: '', check: '', when: '', csv: false }))

/* ===========================================================================
   The list
   ======================================================================== */
function BuilderListWindow({ close, open }: AreaWindowProps) {
  const rows = builderReports()
  const [cur, setCur] = useState(0)
  const picked = rows[cur]
  useScreenReport({ builderReport: pbSlug(picked?.name ?? ''), builderReports: rows.length })
  const openReport = (r: BuilderReport | undefined, clone = false) => {
    if (!r) return
    open('advanced-report-builder', clone
      ? { name: `COPY OF ${r.name}`, group: r.group, description: r.description, access: 'Private' }
      : { ...r })
  }
  return (
    <WorkspaceDialogFrame id="advanced-report-builder-list" title="Advanced Medical Report Builder" width={992} height={600} onClose={close}>
      <div style={{ background: NAVY, color: '#fff', fontSize: 17, fontWeight: 700, padding: '4px 6px', flex: 'none' }}>Advanced Medical Reports</div>
      <div className="pb-row" style={{ gap: 0, padding: '2px 0', background: '#d4d0c8', borderBottom: '1px solid #808080', flex: 'none' }}>
        <DialogButton id="arb-new" width={80} onClick={() => open('advanced-report-builder', {})}>New</DialogButton>
        <DialogButton id="arb-delete" width={80}>Delete</DialogButton>
        <DialogButton id="arb-open" width={80} onClick={() => openReport(picked)}>Open</DialogButton>
        <DialogButton id="arb-clone" width={80} onClick={() => openReport(picked, true)}>Clone</DialogButton>
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        <PBDataWindow
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
          onActivate={(r) => openReport(r)}
          rowTutorialId={(r) => `host.mois.row.arb-${pbSlug(r.name)}`}
          columns={[
            { key: 'name', header: 'Name', width: 280 },
            { key: 'group', header: 'Group', width: 120 },
            { key: 'description', header: 'Description' },
          ]}
        />
      </div>
    </WorkspaceDialogFrame>
  )
}

/* ===========================================================================
   The editor
   ======================================================================== */
const Heading = ({ children }: { children: ReactNode }) => (
  <div style={{ color: NAVY, fontWeight: 700, padding: '6px 0 3px', borderBottom: '1px solid #c0c0c0', marginBottom: 4 }}>{children}</div>
)

function Field({ id, value, onChange, w, align }: { id?: string; value: string; onChange: (v: string) => void; w: number; align?: 'center' | 'right' }) {
  return (
    <input
      className={`pb-field${align === 'center' ? ' pb-field--center' : align === 'right' ? ' pb-field--right' : ''}`}
      style={{ width: w }}
      value={value}
      data-tutorial-id={id ? `host.mois.field.${id}` : undefined}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

function Select({ id, value, options, onChange, w }: { id?: string; value: string; options: string[]; onChange: (v: string) => void; w: number }) {
  return (
    <PBSelect
      w={w}
      value={value}
      options={options}
      data-tutorial-id={id ? `host.mois.field.${id}` : undefined}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

function Dots() {
  return <button type="button" className="pb-inputgroup__btn pb-inputgroup__btn--dots" style={{ height: 19 }}>…</button>
}

const PATIENT_FIELDS = ['Address 1', 'Address 2', 'City', 'Province', 'Country', 'Postal Code', 'Home Phone', 'Work Phone', 'Cell Phone', 'Other Phone', 'Fax', 'Home Email', 'Work Email', 'Location Code', 'Insurance Provider', 'Ethnicity - Father', 'Ethnicity - Mother']

function BuilderEditorWindow({ args, close, open }: AreaWindowProps) {
  const host = usePBInstrumentation()
  const [name, setName] = useState(str(args.name))
  const [desc, setDesc] = useState(str(args.description))
  const [group, setGroup] = useState(str(args.group))
  const [access, setAccess] = useState(str(args.access, 'Public'))
  const [other, setOther] = useState('Other options...')
  const [tab, setTab] = useState('Patient Data')
  const [status, setStatus] = useState('A')
  const [ageFrom, setAgeFrom] = useState('0')
  const [ageTo, setAgeTo] = useState('120')
  const [sex, setSex] = useState('')
  const [lastYears, setLastYears] = useState('3')
  const [limited, setLimited] = useState<Record<string, boolean>>({})
  const [rules, setRules] = useState<Record<string, Rule[]>>({})
  const [saved, setSaved] = useState(false)

  const rulesOf = (t: string) => rules[t] ?? emptyRules()
  const counted = (t: string) => rulesOf(t).filter((r) => r.concept.trim()).length
  const setRule = (t: string, i: number, patch: Partial<Rule>) => {
    setSaved(false)
    setRules((prev) => ({ ...prev, [t]: (prev[t] ?? emptyRules()).map((r, j) => (j === i ? { ...r, ...patch } : r)) }))
  }
  useScreenReport({
    builderReport: pbSlug(name),
    builderRules: [...BOTTOM_TABS, ...TOP_TABS].filter((t) => counted(t)).map((t) => `${pbSlug(t)}:${counted(t)}`).join(','),
    builderSaved: saved,
  })

  const pickTab = (t: string) => { host?.report('selectTab', { tab: pbSlug(t) }); setTab(t) }
  const tabButton = (t: string) => {
    const n = counted(t)
    const label = n ? `${t} (${n})` : t
    return (
      <button
        key={t}
        type="button"
        data-tutorial-id={host?.anchor('tab', pbSlug(t))}
        onClick={() => pickTab(t)}
        style={{
          flex: '1 1 0', height: 21, border: '1px solid #a0a0a0', borderBottom: t === tab ? '1px solid #fff' : '1px solid #a0a0a0',
          background: t === tab ? '#fff' : '#f0f0f0', fontWeight: t === tab ? 700 : 400, fontSize: 12, padding: 0, marginTop: t === tab ? -2 : 0,
        }}
      >
        {label}
      </button>
    )
  }

  const reportName = name.trim() || 'NAME OF REPORT'
  const save = () => {
    if (!name.trim()) return
    saveBuilderReport({ name: name.trim().toUpperCase(), group, description: desc, access: access as BuilderReport['access'] })
    setSaved(true)
  }
  const reportOutput = () => open('print-preview', {
    title: reportName.toUpperCase(),
    heading: `${reportName.toUpperCase()} AS OF ${MOIS_TODAY}`,
    columns: [{ key: 'chart', header: 'CHART', width: 60 }, { key: 'name', header: 'PATIENT', width: 200 }, { key: 'dob', header: 'DOB', width: 90 }, { key: 'sex', header: 'SEX', width: 40 }],
    rows: ['3609', '3658', '3093'].map((chart) => {
      const p = patients.find((x) => x.chart === chart)
      return { chart, name: p ? `${p.last}, ${p.first}` : chart, dob: p?.dob ?? '', sex: p?.gender ?? '' }
    }),
  })
  const mailMerge = () => {
    loadReportNavigator(builderNavigatorRows(reportName.toUpperCase()))
    close()
    open('chart-navigator')
  }

  const ruleTab = (t: string) => {
    const slug = pbSlug(t)
    const measures = t === 'Measures'
    const noun = t === 'Health Conditions' ? 'conditions' : t === 'Measures' ? 'conditions' : t.toLowerCase()
    const cols = measures
      ? '50px 20px 216px 20px 90px 130px 110px 90px 70px 70px 1fr'
      : t === 'Health Conditions' ? '390px 20px 90px 280px 1fr' : '290px 20px 90px 250px 90px 80px 1fr'
    const limit = limited[t] ?? false
    return (
      <div style={{ padding: '4px 8px', display: 'flex', flexDirection: 'column', minHeight: 0, flex: '1 1 auto' }}>
        <Heading>{t === 'Health Conditions' ? 'Health Issues' : measures ? 'Measurements' : t}</Heading>
        <div className="pb-row" style={{ gap: 16, padding: '2px 0 6px', borderBottom: '1px solid #c0c0c0' }}>
          <PBCheckbox label={`Patient has all the ${noun} listed below.`} checked />
          <span style={{ flex: '1 1 auto' }} />
          {t === 'Health Conditions' ? (
            <>
              <PBCheckbox label="Include records with a stop date." />
              <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <PBCheckbox label="Include Extended Information in CSV File" />
                <PBCheckbox label="Include Patients with No Known." />
              </span>
            </>
          ) : (
            <span className="pb-row" style={{ gap: 6 }}>
              <span>Limited investigation to a date range?</span>
              <PBCheckbox checked={limit} onChange={(v) => setLimited((p) => ({ ...p, [t]: v }))} />
              {limit && <><span>Only look at data from the last</span><Field value="2" onChange={() => undefined} w={32} align="center" /><PBSelect w={66} options={['Year(s)', 'Month(s)']} /></>}
            </span>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: cols, alignItems: 'end', padding: '4px 0', textAlign: 'center', columnGap: 0 }}>
          {measures ? (
            <>
              <span style={{ textAlign: 'left' }}>Code</span><span /><span style={{ textAlign: 'left' }}>Concept / Description</span><span />
              <span>Check<br />Condition</span><span>Control Value</span><span>Check Against</span><span>When</span>
              <span>Include in<br />CSV File</span><span># of Results<br />to include*</span><span>Column Order<br />in CSV File</span>
            </>
          ) : (
            <>
              <span style={{ textAlign: 'left' }}>{t === 'Health Conditions' ? 'Concept or Problem Name contains...' : `Concept or ${t === 'Procedures' ? 'Procedure' : 'Description'} contains ...`}</span><span />
              <span>Check<br />Condition</span>
              {t === 'Health Conditions' ? <><span /><span>Include in<br />CSV File</span></> : <><span /><span>When</span><span>Include in<br />CSV File</span><span>Column Order<br />in CSV File</span></>}
            </>
          )}
        </div>
        <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto' }}>
          {rulesOf(t).map((r, i) => {
            const idp = `arb-${slug}`
            const concept = (
              <span className="pb-inputgroup" style={{ width: '100%' }}>
                <Field id={i === 0 ? `${idp}-concept-1` : undefined} value={r.concept} onChange={(v) => setRule(t, i, { concept: v.toUpperCase() })} w={measures ? 196 : t === 'Health Conditions' ? 370 : 270} />
                <Dots />
              </span>
            )
            const check = <Select id={i === 0 ? `${idp}-check-1` : undefined} value={r.check} options={['', 'Has', 'Done', 'Not Done', 'Does Not Have']} onChange={(v) => setRule(t, i, { check: v })} w={88} />
            const when = r.concept
              ? <Select id={i === 0 ? `${idp}-when-1` : undefined} value={r.when || 'ANY TIME'} options={['ANY TIME', 'IN RANGE', 'IGNORE']} onChange={(v) => setRule(t, i, { when: v })} w={84} />
              : <span />
            const csv = r.concept || t === 'Health Conditions'
              ? <span style={{ textAlign: 'center' }}><PBCheckbox checked={r.csv} onChange={(v) => setRule(t, i, { csv: v })} /></span>
              : <span />
            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: cols, alignItems: 'center', height: 22 }}>
                {measures ? (
                  <>
                    <span className="pb-inputgroup"><input className="pb-field" style={{ width: 50 }} /></span><Dots />
                    {concept}<span />{check}<span /><span />{when}{csv}<span /><span />
                  </>
                ) : t === 'Health Conditions' ? (
                  <>{concept}<span />{check}<span />{csv}</>
                ) : (
                  <>{concept}<span />{check}<span />{when}{csv}<span /></>
                )}
              </div>
            )
          })}
        </div>
        <div style={{ borderTop: '1px solid #c0c0c0', padding: '4px 0', fontSize: 11 }}>
          {t === 'Health Conditions' ? (
            <>
              <div>Include Extended Information in CSV File will output the health issues&apos; START DATE and actual PROBLEM NAME as it appears in the patient&apos;s chart.</div>
              <div>If the Include Items with a Stop Date is checked, the END DATE will be included in the CSV File.</div>
            </>
          ) : (
            <>
              <div>When:  allows user to limit the selection range (ie BP in the last 2 years - choose IN RANGE)</div>
              {measures && <div>*  # of Results to include:  allows the user to output more than one value to the CSV file.  Values will be output in descending date, with the most recent first.</div>}
            </>
          )}
        </div>
      </div>
    )
  }

  const patientData = (
    <div style={{ padding: '4px 8px', overflow: 'auto', flex: '1 1 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', columnGap: 10 }}>
        <div>
          <Heading>Patient Characteristics:</Heading>
          <div className="pb-row" style={{ gap: 6, padding: '1px 0' }}>
            <span className="pb-form__label" style={{ width: 80 }}>Patient Status:</span>
            <span className="pb-inputgroup"><Field id="arb-status" value={status} onChange={setStatus} w={120} /><Dots /></span>
            <span>(comma separated)</span>
          </div>
          <div className="pb-row" style={{ gap: 6, padding: '1px 0' }}>
            <span className="pb-form__label" style={{ width: 80 }}>Age Range:</span>
            <Field id="arb-age-from" value={ageFrom} onChange={setAgeFrom} w={46} align="right" /> to <Field id="arb-age-to" value={ageTo} onChange={setAgeTo} w={46} align="right" />
          </div>
          <div className="pb-row" style={{ gap: 6, padding: '1px 0' }}>
            <span className="pb-form__label" style={{ width: 80 }}>Sex:</span>
            <Field id="arb-sex" value={sex} onChange={(v) => setSex(v.toUpperCase())} w={46} />
          </div>
        </div>
        <div>
          <Heading>Office Details:</Heading>
          {['Provider:', 'Facility Code:', 'Service Center:'].map((l) => (
            <div key={l} className="pb-row" style={{ gap: 6, padding: '1px 0' }}>
              <span className="pb-form__label" style={{ width: 80 }}>{l}</span><PBSelect w={172} options={['']} />
            </div>
          ))}
        </div>
      </div>
      <Heading>Last Contact Date</Heading>
      <div className="pb-row" style={{ gap: 6 }}>
        <span className="pb-form__label" style={{ width: 80 }}>In the last:</span>
        <Field id="arb-last-contact" value={lastYears} onChange={setLastYears} w={72} align="center" /> year(s)
      </div>
      <Heading>Additional Patient Data</Heading>
      <div style={{ display: 'grid', gridTemplateColumns: '180px 230px 90px 90px', alignItems: 'end', rowGap: 1 }}>
        <span>Field</span><span>Filter / Select<br />(empty fields will be ignored)</span>
        <span style={{ textAlign: 'center' }}>Include in<br />CSV File</span><span style={{ textAlign: 'center' }}>Column Order<br />in CSV File</span>
        {PATIENT_FIELDS.map((f) => (
          <FieldRow key={f} label={f} />
        ))}
      </div>
    </div>
  )

  return (
    <WorkspaceDialogFrame id="advanced-report-builder" title="Advanced Report Builder" width={994} height={700} controls={false} onClose={() => open('advanced-report-builder-list')}>
      <div style={{ border: '1px solid #808080', margin: 4, flex: 'none' }}>
        <PBBand>Medical Report</PBBand>
        <div style={{ display: 'flex', gap: 6, padding: '2px 6px 6px' }}>
          <fieldset className="pb-fieldset" style={{ margin: 0, flex: '1 1 auto' }}>
            <legend className="pb-fieldset__legend" style={{ color: '#000', fontWeight: 700 }}>Detail</legend>
            <div className="pb-fieldset__body" style={{ display: 'grid', gridTemplateColumns: '44px 1fr', rowGap: 3, alignItems: 'center' }}>
              <span>Name:</span><Field id="arb-name" value={name} onChange={(v) => { setName(v.toUpperCase()); setSaved(false) }} w={456} />
              <span style={{ alignSelf: 'start' }}>Desc.:</span>
              <PBTextArea rows={2} w={456} value={desc} onChange={(e) => setDesc(e.target.value)} />
              <span>Access:</span>
              <span className="pb-row" style={{ gap: 6 }}>
                <Select id="arb-access" value={access} options={['Private', 'Limited', 'Public']} onChange={setAccess} w={80} />
                <span style={{ color: '#6d6d6d', width: 120 }}>ADMIN, MOIS</span>
                <span style={{ marginLeft: 'auto' }}>Group:</span>
                <Field id="arb-group" value={group} onChange={setGroup} w={144} />
              </span>
            </div>
          </fieldset>
          <fieldset className="pb-fieldset" style={{ margin: 0, width: 250, flex: 'none' }}>
            <legend className="pb-fieldset__legend" style={{ color: '#000', fontWeight: 700 }}>Actions</legend>
            <div className="pb-fieldset__body" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <DialogButton id="arb-save" width={90} onClick={save}>Save Changes</DialogButton>
              <span style={{ color: '#6d6d6d' }}>Other</span>
              <span className="pb-row" style={{ gap: 8 }}>
                <Select value={other} options={['Other options...', 'Change History Review']} onChange={setOther} w={164} />
                <DialogButton id="arb-go" width={62}>Go</DialogButton>
              </span>
            </div>
          </fieldset>
          <fieldset className="pb-fieldset" style={{ margin: 0, width: 190, flex: 'none' }}>
            <legend className="pb-fieldset__legend" style={{ color: '#000', fontWeight: 700 }}>Output</legend>
            <div className="pb-fieldset__body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 8px' }}>
              <DialogButton id="arb-report" width={76} onClick={reportOutput}>Report</DialogButton>
              <DialogButton id="arb-csv" width={76}>CSV</DialogButton>
              <DialogButton id="arb-extended" width={76}>Extended</DialogButton>
              <DialogButton id="arb-mail-merge" width={76} onClick={mailMerge}>Mail Merge</DialogButton>
            </div>
          </fieldset>
        </div>
      </div>
      <div style={{ padding: '4px 4px 0', flex: 'none' }}>
        <div style={{ display: 'flex' }}>{TOP_TABS.map(tabButton)}</div>
        <div style={{ display: 'flex' }}>{BOTTOM_TABS.map(tabButton)}</div>
      </div>
      <div
        data-tutorial-id="host.mois.field.arb-tab-page"
        style={{ flex: '1 1 auto', minHeight: 0, margin: '0 4px 4px', border: '1px solid #a0a0a0', borderTop: 0, background: 'var(--pb-face)', display: 'flex', flexDirection: 'column' }}
      >
        {tab === 'Patient Data' ? patientData
          : RULE_TABS.has(tab) ? ruleTab(tab)
            : <div style={{ padding: '4px 8px' }}><Heading>{tab}</Heading></div>}
      </div>
    </WorkspaceDialogFrame>
  )
}

function FieldRow({ label }: { label: string }) {
  const [csv, setCsv] = useState(false)
  return (
    <>
      <span>{label}</span>
      <input className="pb-field" style={{ width: 224 }} />
      <span style={{ textAlign: 'center' }}><PBCheckbox checked={csv} onChange={setCsv} /></span>
      <span />
    </>
  )
}

registerAreaWindow('advanced-report-builder-list', BuilderListWindow)
registerAreaWindow('advanced-report-builder', BuilderEditorWindow)
