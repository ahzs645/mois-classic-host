import { useState, type CSSProperties, type ReactNode } from 'react'
import { useScreenReport } from '../host/screen-state'
import { loadReportNavigator, yearsOld } from '../data/reportParams'
import { patients, MOIS_TODAY, type Patient } from '../data/patients'
import { RS_FACILITIES, RS_PROVIDERS, RS_SERVICE_CENTERS, RS_STATUS_CODES, rsLike, rsMatchOf } from '../data/reportSpecs/types'
import { PBBand, PBDataWindow, PBMessageBox, pbSlug } from '../pb'
import { registerAreaWindow, type AreaWindowProps } from './areaWindowRegistry'
import { CmdCheck, CmdRadio, DotsButton, FieldInput, FieldSelect } from './reportKit'
import { ReportPicker } from './ReportSpecWindow'
import { DialogButton, WorkspaceDialogFrame } from './WorkspaceDialogFrame'

/* ============================================================================
   The two other Report Builders rows: the Cohort Selection Tool and the
   (older) Medical Report Builder.

   COHORT SELECTION TOOL — window `cohort-selection-tool`.
   PROVENANCE: 304055 `ca72641c` (the Report List row, v02.31.23),
   `1e32f7d0` (the whole window, captured at 150%: caption `Report: Report
   Builders - Cohort Selection Tool`, a `Templates` pane on the left with a
   `Subject` header and Delete / Export / Import under it, the `Report
   Parameter` band with Clear / Save, four light-blue sections — Include
   patients with … (all elements optional): Subject [yellow], Service
   Provider, Patient Status [A][…], Last Contact [3] (yrs), Age Range _ to _,
   Gender, Health Condition […] "Documented in one of the following selected
   folders" ☑ Health concern ☑ Family history ☑ Risk for condition; Exclude
   patients if they have any of the following procedure(s) — Record Type /
   Concept […]; Exclude patients if they have any of the following
   preference(s) — Type / Subject / Identify By / Instruction; Include
   patients with (•) None of the following records ( ) At least one of the
   following records — Record Type / Concept […] / When "in the last" _ _ —
   and Output as: [Printable Report ▼] Run Report / Cancel at the foot),
   `6947c67d`, `cfceacef`, `9a82ed92`, `f99fbf59`, `dd0d2d58`, `343a77cf`
   (the section close-ups), `b51843b1` (two saved templates: Cervical Cancer
   Screening - High Risk / - Low Risk), `0fc3a62e` (Delete / Export /
   Import).
   BEHAVIOUR: a template's row loads its parameters; Save keeps the current
   parameters as a template named by its Subject (a yellow field is
   required); Clear empties them; Delete removes the selected template;
   Export writes it to a file and Import reads one back (304055: "Export /
   Import Cohort templates to share with other MOIS databases"); Run Report
   goes to the Print Preview, Excel, or the Chart Navigator by Output as.
   INFERRED: the Output as list beyond Printable Report (the article: "Export
   to excel or use the chart navigator"), the drop-down contents (Record
   Type, preference Type / Subject / Identify By / Instruction), the export /
   import file dialogs (a message and a picker here), the grids growing a
   new row once the last is filled, and the printed cohort's layout.

   MEDICAL REPORT BUILDER — window `medical-report-builder`.
   PROVENANCE: 304055 `8ca735c0` (v02.17: caption `Report Builder`, the navy
   `Medical Report Builder` bar, the New Report · Delete Report · Save · Run
   Report · Run Report (CSV Output) · Close Window toolbar, `Report
   Templates` — Name / Group / Description / Created — and `Report
   Parameters`: Patient Characteristics (Active Patients Only, Provider,
   Facility Code, Service Center, Age Range, Sex, Seen in Last _ years,
   Problem Includes / but excluding, Procedure, Medication) and Report
   Criteria (Range: In - Last _ Days / Months / Years; ITEM · LOOK FOR ·
   WHERE IN · WHEN TO CONSIDER rows for Lab / Measurement … Document)) and
   `7ce67333` (the printed page: MEDICAL REPORT BUILDER AS OF …, the
   template's name and description, "Number of patients matching -
   Characteristics: n Criteria: n", MOST RESPONSIBLE PROVIDER bands, NAME /
   AGE / SEX / HOME PHONE / LAST CONTACT / CHART NO).
   BEHAVIOUR: a row loads its template; Save keeps edits (a new name adds a
   row); New Report clears to a blank template; Delete Report removes the
   row; Run Report prints; Run Report (CSV Output) opens the Excel sheet
   (304055: "The excel version includes date of birth instead of age and
   patient status"). Look For honours Contains / Begins With and the `%`
   wildcard (304049) against each patient's sample problem list.

   ANCHORS: `host.mois.dialog.cohort-selection-tool` /
   `…medical-report-builder`; cohort fields `host.mois.field.cohort-<field>`
   (subject, provider, status, last-contact, age-from, age-to, gender,
   condition, proc-type-1, proc-concept-1, pref-type-1 …, incl-type-1,
   incl-concept-1, incl-when-n-1, incl-when-unit-1, output), ticks
   `host.mois.command.cohort-folder-health-concern|family-history|risk-for-condition`,
   radios `cohort-include-none|at-least-one`, buttons `cohort-clear|save|delete|export|import|run|cancel`,
   template rows `host.mois.row.cohort-template-<slug>`. Medical Report
   Builder fields `host.mois.field.mrb-<field>` (name, problem, excluding,
   procedure, medication, age-from, age-to, sex, seen, look-<item>,
   where-<item>, when-<item>), buttons `mrb-new|delete|save|run|run-csv|close`,
   rows `host.mois.row.mrb-<slug>`.
   ========================================================================= */

const NAVY = '#000080'
const BLUE = '#c8dcfa'
const now = () => MOIS_TODAY

/* --- sample clinical facts per roster chart (fictional) ----------------- */
const PROBLEMS = ['DIABETES MELLITUS TYPE 2', 'HYPERTENSION', 'ASTHMA', 'COPD', 'DEPRESSION', 'CONGESTIVE HEART FAILURE', 'OBESITY', 'HYPOTHYROIDISM', 'OSTEOARTHRITIS', 'CHRONIC KIDNEY DISEASE']
const problemsOf = (p: Patient): string[] => {
  const n = Number(p.chart) || p.chart.length
  return PROBLEMS.filter((_, i) => (n + i * 7) % 4 === 0)
}
const lastContact = (p: Patient) => {
  const n = Number(p.chart) || 1
  return `20${String(24 + (n % 3)).padStart(2, '0')}.${String((n % 12) + 1).padStart(2, '0')}.${String((n % 27) + 1).padStart(2, '0')}`
}

const Grey = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => <span style={{ color: '#6d6d6d', ...style }}>{children}</span>

/* ===========================================================================
   Cohort Selection Tool
   ======================================================================== */
type ProcRow = { type: string; concept: string }
type PrefRow = { type: string; subject: string; identify: string; instruction: string }
type InclRow = { type: string; concept: string; n: string; unit: string }
type Cohort = {
  subject: string; provider: string; status: string; lastContact: string; ageFrom: string; ageTo: string; gender: string
  condition: string; folders: { concern: boolean; family: boolean; risk: boolean }
  procs: ProcRow[]; prefs: PrefRow[]; include: 'none' | 'one'; incl: InclRow[]
}
const blankCohort = (): Cohort => ({
  subject: '', provider: '', status: 'A', lastContact: '3', ageFrom: '', ageTo: '', gender: '', condition: '',
  folders: { concern: true, family: true, risk: true },
  procs: [{ type: '', concept: '' }], prefs: [{ type: '', subject: '', identify: '', instruction: '' }], include: 'none', incl: [{ type: '', concept: '', n: '', unit: '' }],
})
let cohortTemplates: Cohort[] = [
  { ...blankCohort(), subject: 'Cervical Cancer Screening - High Risk', ageFrom: '25', ageTo: '69', gender: 'F', condition: 'CERVICAL CANCER',
    procs: [{ type: 'Procedure', concept: 'HYSTERECTOMY - TOTAL' }, { type: '', concept: '' }],
    include: 'none', incl: [{ type: 'Measure', concept: 'PAP SMEAR', n: '1', unit: 'Year(s)' }, { type: '', concept: '', n: '', unit: '' }] },
  { ...blankCohort(), subject: 'Cervical Cancer Screening - Low Risk', ageFrom: '25', ageTo: '69', gender: 'F',
    procs: [{ type: 'Procedure', concept: 'HYSTERECTOMY - TOTAL' }, { type: '', concept: '' }],
    prefs: [{ type: 'Screening', subject: 'Cervical Screening', identify: 'Concept', instruction: 'Declined' }, { type: '', subject: '', identify: '', instruction: '' }],
    include: 'none', incl: [{ type: 'Measure', concept: 'PAP SMEAR', n: '3', unit: 'Year(s)' }, { type: '', concept: '', n: '', unit: '' }] },
]
const EXPORTED_FILES = ['Diabetes Foot Exam Overdue.cst', 'Influenza 65+ Not Immunized.cst', 'Colorectal Screening 50-74.cst']

const RECORD_TYPES = ['', 'Procedure', 'Measure', 'Imaging', 'Intervention', 'Consult', 'Medication']
const PREF_TYPES = ['', 'Consent', 'Screening', 'Contact', 'Treatment']
const PREF_SUBJECTS = ['', 'Cervical Screening', 'Colorectal Screening', 'Immunization', 'Mammogram', 'Medication']
const IDENTIFY = ['', 'Code', 'Concept']
const INSTRUCTIONS = ['', 'Declined', 'Deferred', 'Not Applicable', 'Refused']
const CONCEPTS = ['COLONOSCOPY', 'FIT TEST', 'HYSTERECTOMY - TOTAL', 'MAMMOGRAM', 'PAP SMEAR', 'INFLUENZA VACCINE', 'HPV TEST']
const CONDITIONS = ['ASTHMA', 'CERVICAL CANCER', 'COPD', 'DIABETES', 'HYPERTENSION', 'CHRONIC KIDNEY DISEASE']

function cohortPatients(c: Cohort): Patient[] {
  const statuses = c.status.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
  const lo = Number(c.ageFrom) || 0
  const hi = c.ageTo ? Number(c.ageTo) : 200
  const excl = c.procs.filter((r) => r.concept).length + c.prefs.filter((r) => r.type).length
  return patients
    .filter((p) => p.dob)
    .filter((p) => !statuses.length || statuses.includes(p.status))
    .filter((p) => !c.gender || p.gender === c.gender)
    .filter((p) => { const a = Number(yearsOld(p.dob)); return a >= lo && a <= hi })
    .filter((p) => !c.provider || (p.provider ?? '').toUpperCase().includes(c.provider.split(',')[0]!))
    .filter((_, i) => (i + excl) % (excl + 3) !== 0)
}

function CohortSelectionWindow({ close, open }: AreaWindowProps) {
  const [c, setC] = useState<Cohort>(blankCohort)
  const [list, setList] = useState(() => cohortTemplates)
  const [cur, setCur] = useState(-1)
  const [output, setOutput] = useState('Printable Report')
  const [message, setMessage] = useState<{ text: string; slug: string; icon: 'info' | 'warn' } | null>(null)
  const [importing, setImporting] = useState(false)
  const [picking, setPicking] = useState<{ title: string; options: readonly string[]; multi?: boolean; value: string; apply: (v: string) => void } | null>(null)
  useScreenReport({
    cohortTemplate: pbSlug(list[cur]?.subject ?? ''), cohortSubject: !!c.subject, cohortOutput: pbSlug(output),
    cohortInclude: c.include, cohortTemplates: list.length, cohortMessage: message?.slug ?? '',
  })
  const set = (patch: Partial<Cohort>) => setC((p) => ({ ...p, ...patch }))
  /* a grid grows a new blank row once its last row is filled */
  const grow = <T extends Record<string, string>>(rows: T[], blank: T, key: keyof T): T[] => (rows[rows.length - 1]?.[key] ? [...rows, blank] : rows)
  const setRow = <K extends 'procs' | 'prefs' | 'incl'>(k: K, i: number, patch: Partial<Cohort[K][number]>) => setC((p) => {
    const rows = (p[k] as Cohort[K][number][]).map((r, j) => (j === i ? { ...r, ...patch } : r))
    const next = k === 'procs' ? grow(rows as ProcRow[], { type: '', concept: '' }, 'concept')
      : k === 'prefs' ? grow(rows as PrefRow[], { type: '', subject: '', identify: '', instruction: '' }, 'type')
        : grow(rows as InclRow[], { type: '', concept: '', n: '', unit: '' }, 'concept')
    return { ...p, [k]: next }
  })
  const load = (i: number) => { setCur(i); const t = list[i]; if (t) setC(JSON.parse(JSON.stringify(t)) as Cohort) }
  const save = () => {
    if (!c.subject.trim()) { setMessage({ text: 'Please enter a Subject for the cohort before saving.', slug: 'subject-required', icon: 'warn' }); return }
    cohortTemplates = [...cohortTemplates.filter((t) => t.subject !== c.subject), JSON.parse(JSON.stringify(c)) as Cohort]
    setList(cohortTemplates)
    setCur(cohortTemplates.findIndex((t) => t.subject === c.subject))
  }
  const del = () => {
    const t = list[cur]
    if (!t) return
    cohortTemplates = cohortTemplates.filter((x) => x !== t)
    setList(cohortTemplates)
    setCur(-1)
  }
  const exportT = () => {
    const t = list[cur]
    if (!t) { setMessage({ text: 'Select a template to export.', slug: 'select-template', icon: 'warn' }); return }
    setMessage({ text: `Template '${t.subject}' was exported to C:\\Users\\Public\\Documents\\${t.subject}.cst`, slug: 'exported', icon: 'info' })
  }
  const importT = (file: string) => {
    setImporting(false)
    if (!file) return
    const subject = file.replace(/\.cst$/, '')
    const t: Cohort = { ...blankCohort(), subject, ageFrom: subject.includes('65') ? '65' : subject.includes('50') ? '50' : '', ageTo: subject.includes('74') ? '74' : '' }
    cohortTemplates = [...cohortTemplates.filter((x) => x.subject !== subject), t]
    setList(cohortTemplates)
    setCur(cohortTemplates.length - 1)
    setC(t)
  }
  const run = () => {
    const rows = cohortPatients(c)
    const title = c.subject || 'Cohort'
    if (output === 'Excel') {
      open('report-excel', {
        title, head: ['CHART', 'LAST NAME', 'FIRST NAME', 'DOB', 'AGE', 'GENDER', 'STATUS', 'PROVIDER', 'LAST CONTACT'],
        rows: rows.map((p) => [p.chart, p.last, p.first, p.dob, yearsOld(p.dob), p.gender, p.status, p.provider ?? '', lastContact(p)]),
      })
    } else if (output === 'Chart Navigator') {
      loadReportNavigator(rows.map((p) => ({ chart: p.chart, name: `${p.last},${p.first}`, description: `COHORT: ${title.toUpperCase()}` })))
      close()
      open('chart-navigator')
    } else {
      open('print-preview', {
        title: 'Cohort Selection Tool',
        pages: [[
          '**MOIS TEST CLINIC**',
          `%TITLE%COHORT SELECTION AS OF ${now()}`,
          `%SUB%${title.toUpperCase()}`,
          `%G%Status ${c.status || 'ALL'}; last contact ${c.lastContact || '-'} yrs; age ${c.ageFrom || '0'} to ${c.ageTo || '120'}${c.gender ? `; gender ${c.gender}` : ''}${c.condition ? `; condition ${c.condition}` : ''}`,
          '%COLS:9,30,13,7,8,33%',
          '%TH%CHART|NAME|DOB|AGE|GENDER|SERVICE PROVIDER',
          ...rows.map((p) => `%TR%${p.chart}|${p.last}, ${p.first}|${p.dob}|${yearsOld(p.dob)}|${p.gender}|${p.provider ?? ''}`),
          '',
          `**PATIENTS IN COHORT: ${rows.length}**`,
        ].join('\n')],
      })
    }
  }

  const sectionHead = (children: ReactNode) => <div style={{ background: BLUE, padding: '4px 10px' }}>{children}</div>
  const gridHead = (cols: [string, number][]) => (
    <div className="pb-row" style={{ background: BLUE, gap: 4, padding: '0 10px 2px 24px' }}>
      {cols.map(([h, w]) => <Grey key={h} style={{ width: w }}>{h}</Grey>)}
    </div>
  )
  const marker = (i: number) => <span style={{ width: 14, flex: 'none' }}>{i === 0 ? '›' : ''}</span>

  return (
    <WorkspaceDialogFrame id="cohort-selection-tool" title="Report: Report Builders - Cohort Selection Tool" width={1004} height={708} controls={false} onClose={close}>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', background: '#fff' }}>
        {/* --- Templates --- */}
        <div style={{ width: 245, flex: 'none', display: 'flex', flexDirection: 'column', borderRight: '1px solid #808080' }}>
          <PBBand>Templates</PBBand>
          <div style={{ background: BLUE, padding: '3px 6px', color: '#6d6d6d' }}>Subject</div>
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
            <PBDataWindow
              rows={list.map((t) => ({ subject: t.subject }))}
              current={cur}
              onCurrentChange={load}
              gutter={false}
              head={false}
              rowTutorialId={(r) => `host.mois.row.cohort-template-${pbSlug(r.subject)}`}
              columns={[{ key: 'subject', header: 'Subject' }]}
            />
          </div>
          <div className="pb-row" style={{ gap: 6, padding: 4, justifyContent: 'space-between' }}>
            <DialogButton id="cohort-delete" width={74} onClick={del}>Delete</DialogButton>
            <DialogButton id="cohort-export" width={74} onClick={exportT}>Export</DialogButton>
            <DialogButton id="cohort-import" width={74} onClick={() => setImporting(true)}>Import</DialogButton>
          </div>
        </div>
        {/* --- Report Parameter --- */}
        <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <PBBand right={<span className="pb-row" style={{ gap: 4 }}><DialogButton id="cohort-clear" width={74} onClick={() => { setC(blankCohort()); setCur(-1) }}>Clear</DialogButton><DialogButton id="cohort-save" width={74} onClick={save}>Save</DialogButton></span>}>
            Report Parameter
          </PBBand>
          <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto' }}>
            {sectionHead(<>Include patients with ...&nbsp;&nbsp;<Grey>(all elements optional)</Grey></>)}
            <div style={{ padding: '4px 10px 8px', display: 'grid', gridTemplateColumns: '180px 150px 1fr', columnGap: 16, rowGap: 2 }}>
              <div className="pb-row" style={{ gridColumn: '1 / 4', gap: 6 }}>
                <span>Subject:</span>
                <FieldInput id="cohort-subject" value={c.subject} w="100%" style={{ background: '#ffffc0' }} onChange={(v) => set({ subject: v })} />
              </div>
              <div style={{ gridColumn: '1 / 3' }}>
                <Grey>Service Provider</Grey>
                <div><FieldSelect id="cohort-provider" value={c.provider} options={RS_PROVIDERS} w={268} onChange={(v) => set({ provider: v })} /></div>
              </div>
              <div style={{ gridRow: '2 / 5', gridColumn: 3 }}>
                <Grey>Health Condition</Grey>
                <div>
                  <span className="pb-inputgroup" style={{ width: 290 }}>
                    <FieldInput id="cohort-condition" value={c.condition} w="100%" onChange={(v) => set({ condition: v.toUpperCase() })} />
                    <DotsButton id="cohort-condition" onClick={() => setPicking({ title: 'Health Condition', options: CONDITIONS, value: c.condition, apply: (v) => set({ condition: v }) })} />
                  </span>
                </div>
                <Grey>Documented in one of the following selected folders</Grey>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingTop: 3 }}>
                  <CmdCheck id="cohort-folder-health-concern" label="Health concern" checked={c.folders.concern} onChange={(v) => set({ folders: { ...c.folders, concern: v } })} />
                  <CmdCheck id="cohort-folder-family-history" label="Family history" checked={c.folders.family} onChange={(v) => set({ folders: { ...c.folders, family: v } })} />
                  <CmdCheck id="cohort-folder-risk-for-condition" label="Risk for condition" checked={c.folders.risk} onChange={(v) => set({ folders: { ...c.folders, risk: v } })} />
                </div>
              </div>
              <div>
                <Grey>Patient Status</Grey>
                <div>
                  <span className="pb-inputgroup" style={{ width: 172 }}>
                    <FieldInput id="cohort-status" value={c.status} w="100%" onChange={(v) => set({ status: v.toUpperCase() })} />
                    <DotsButton id="cohort-status" onClick={() => setPicking({ title: 'Patient Status', options: RS_STATUS_CODES, multi: true, value: c.status, apply: (v) => set({ status: v }) })} />
                  </span>
                </div>
              </div>
              <div>
                <Grey>Last Contact</Grey>
                <div className="pb-row" style={{ gap: 3 }}><FieldInput id="cohort-last-contact" value={c.lastContact} w={52} align="center" onChange={(v) => set({ lastContact: v })} /><Grey>(yrs)</Grey></div>
              </div>
              <div>
                <Grey>Age Range</Grey>
                <div className="pb-row" style={{ gap: 6 }}>
                  <FieldInput id="cohort-age-from" value={c.ageFrom} w={32} onChange={(v) => set({ ageFrom: v })} /> to <FieldInput id="cohort-age-to" value={c.ageTo} w={32} onChange={(v) => set({ ageTo: v })} />
                </div>
              </div>
              <div>
                <Grey>Gender</Grey>
                <div><FieldSelect id="cohort-gender" value={c.gender} options={['', 'F', 'M', 'X', 'U']} w={74} onChange={(v) => set({ gender: v })} /></div>
              </div>
            </div>

            {sectionHead('Exclude patients if they have any of the following procedure(s)')}
            {gridHead([['Record Type', 96], ['Concept', 280]])}
            {c.procs.map((r, i) => (
              <div key={i} className="pb-row" style={{ gap: 4, padding: '2px 10px', background: i % 2 ? '#e8e8e8' : '#fff' }}>
                {marker(i)}
                <FieldSelect id={`cohort-proc-type-${i + 1}`} value={r.type} options={RECORD_TYPES} w={96} onChange={(v) => setRow('procs', i, { type: v })} />
                <span className="pb-inputgroup" style={{ width: 300 }}>
                  <FieldInput id={`cohort-proc-concept-${i + 1}`} value={r.concept} w="100%" onChange={(v) => setRow('procs', i, { concept: v.toUpperCase() })} />
                  <DotsButton id={`cohort-proc-concept-${i + 1}`} onClick={() => setPicking({ title: 'Concept', options: CONCEPTS, value: r.concept, apply: (v) => setRow('procs', i, { concept: v, type: r.type || 'Procedure' }) })} />
                </span>
              </div>
            ))}

            {sectionHead('Exclude patients if they have any of the following preference(s)')}
            {gridHead([['Type', 96], ['Subject', 92], ['Identify By', 72], ['', 170], ['Instruction', 140]])}
            {c.prefs.map((r, i) => (
              <div key={i} className="pb-row" style={{ gap: 4, padding: '2px 10px', background: i % 2 ? '#e8e8e8' : '#fff' }}>
                {marker(i)}
                <FieldSelect id={`cohort-pref-type-${i + 1}`} value={r.type} options={PREF_TYPES} w={96} onChange={(v) => setRow('prefs', i, { type: v })} />
                <FieldSelect id={`cohort-pref-subject-${i + 1}`} value={r.subject} options={PREF_SUBJECTS} w={92} onChange={(v) => setRow('prefs', i, { subject: v })} />
                <FieldSelect id={`cohort-pref-identify-${i + 1}`} value={r.identify} options={IDENTIFY} w={72} onChange={(v) => setRow('prefs', i, { identify: v })} />
                <span style={{ width: 170 }} />
                <FieldSelect id={`cohort-pref-instruction-${i + 1}`} value={r.instruction} options={INSTRUCTIONS} w={140} onChange={(v) => setRow('prefs', i, { instruction: v })} />
              </div>
            ))}

            {sectionHead(
              <>
                <div>Include patients with</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '6px 10px 2px' }}>
                  <CmdRadio id="cohort-include-none" name="cohort-include" label="None of the following records" checked={c.include === 'none'} onChange={() => set({ include: 'none' })} />
                  <CmdRadio id="cohort-include-at-least-one" name="cohort-include" label="At least one of the following records" checked={c.include === 'one'} onChange={() => set({ include: 'one' })} />
                </div>
              </>,
            )}
            {gridHead([['Record Type', 96], ['Concept', 380], ['When', 150]])}
            {c.incl.map((r, i) => (
              <div key={i} className="pb-row" style={{ gap: 4, padding: '2px 10px', background: i % 2 ? '#e8e8e8' : '#fff' }}>
                {marker(i)}
                <FieldSelect id={`cohort-incl-type-${i + 1}`} value={r.type} options={RECORD_TYPES} w={96} onChange={(v) => setRow('incl', i, { type: v })} />
                <span className="pb-inputgroup" style={{ width: 300 }}>
                  <FieldInput id={`cohort-incl-concept-${i + 1}`} value={r.concept} w="100%" onChange={(v) => setRow('incl', i, { concept: v.toUpperCase() })} />
                  <DotsButton id={`cohort-incl-concept-${i + 1}`} onClick={() => setPicking({ title: 'Concept', options: CONCEPTS, value: r.concept, apply: (v) => setRow('incl', i, { concept: v }) })} />
                </span>
                <span style={{ width: 20 }} />
                <Grey>in the last</Grey>
                <FieldInput id={`cohort-incl-when-n-${i + 1}`} value={r.n} w={32} align="center" onChange={(v) => setRow('incl', i, { n: v })} />
                <FieldSelect id={`cohort-incl-when-unit-${i + 1}`} value={r.unit} options={['', 'Day(s)', 'Month(s)', 'Year(s)']} w={80} onChange={(v) => setRow('incl', i, { unit: v })} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="pb-row" style={{ gap: 8, padding: '10px 6px', justifyContent: 'flex-end', borderTop: '1px solid #a0a0a0', flex: 'none' }}>
        <span>Output as:</span>
        <FieldSelect id="cohort-output" value={output} options={['Printable Report', 'Excel', 'Chart Navigator']} w={130} onChange={setOutput} />
        <span style={{ width: 40 }} />
        <DialogButton id="cohort-run" width={74} isDefault onClick={run}>Run Report</DialogButton>
        <DialogButton id="cohort-cancel" width={74} onClick={close}>Cancel</DialogButton>
      </div>
      {message && (
        <PBMessageBox title="Cohort Selection Tool" icon={message.icon} buttons={[{ label: 'OK', value: 'ok', default: true, command: 'cohort-message-ok' }]} onClose={() => setMessage(null)}>
          {message.text}
        </PBMessageBox>
      )}
      {importing && (
        <ReportPicker pick={{ title: 'Import Cohort Template', options: EXPORTED_FILES }} value="" onCancel={() => setImporting(false)} onOk={importT} />
      )}
      {picking && (
        <ReportPicker pick={{ title: picking.title, options: picking.options, multi: picking.multi }} value={picking.value}
          onCancel={() => setPicking(null)} onOk={(v) => { picking.apply(v); setPicking(null) }} />
      )}
    </WorkspaceDialogFrame>
  )
}

/* ===========================================================================
   Medical Report Builder
   ======================================================================== */
const ITEMS = [
  { item: 'Lab / Measurement', where: '' },
  { item: 'Procedure', where: 'Description' },
  { item: 'Medication', where: 'Medication Name' },
  { item: 'Intervention', where: 'Description' },
  { item: 'Prescription', where: 'Medication Name' },
  { item: 'Image / XRay', where: 'Description' },
  { item: 'Consults', where: 'Description' },
  { item: 'Facility Admission', where: 'Facility' },
  { item: 'Document', where: 'Document Type' },
]
const WHEN_TO_CONSIDER = ['Any Time', 'In Range', 'Not in Range', 'Never Done']
type Crit = { look: string; code: string; value: string; where: string; field: string; when: string }
type Mrb = {
  name: string; group: string; description: string; created: string
  active: boolean; provider: string; facility: string; service: string; ageFrom: string; ageTo: string; sex: string; seen: string
  problem: string; excluding: string; procedure: string; medication: string; range: string; unit: string
  greater: boolean; recent: boolean; criteria: Crit[]
}
const blankCrit = (): Crit[] => ITEMS.map((x) => ({ look: '', code: '', value: '', where: 'Contains', field: x.where, when: 'Any Time' }))
const mrb = (name: string, group: string, description: string, created: string, patch: Partial<Mrb> = {}): Mrb => ({
  name, group, description, created, active: true, provider: '', facility: '', service: '', ageFrom: '', ageTo: '', sex: '', seen: '',
  problem: '', excluding: '', procedure: '', medication: '', range: '', unit: 'Years', greater: true, recent: true, criteria: blankCrit(), ...patch,
})
const withCrit = (i: number, c: Partial<Crit>): Crit[] => blankCrit().map((x, j) => (j === i ? { ...x, ...c } : x))
let mrbTemplates: Mrb[] = [
  mrb('DIGOXIN/POTASSIUM', '', 'Potassium less than 3.0 mmole/L when on digoxin', '2004.02.05', { medication: 'DIGOXIN', greater: false, criteria: withCrit(0, { code: 'K', look: 'POTASSIUM', value: '3.0' }) }),
  mrb('FASTING BLOOD SUGAR', '', 'To find all pt who have not had blood sugar', '2008.03.28', { criteria: withCrit(0, { code: 'FBS', look: 'FASTING BLOOD SUGAR', when: 'Never Done' }) }),
  mrb('DIABETES', '', 'To Determine Our Diabetic Patients', '2012.07.26', { problem: 'DIABETES' }),
  mrb('FECAL BLOOD', '', 'To determine who has not had a fecal blood screening', '', { ageFrom: '50', ageTo: '74', criteria: withCrit(1, { look: 'FECAL OCCULT', when: 'Never Done' }) }),
  mrb('FRAIL ELDERLY', '', 'To Determine the Frail Elderly Patients who have not had a CSHAFRAIL SCREENING', '', { ageFrom: '65', criteria: withCrit(3, { look: 'CSHAFRAIL', when: 'Never Done' }) }),
  mrb('FRAIL ELDERLY ADMISN', '', 'To determine which Frail Elderly Patients were admitted to hospital', '', { ageFrom: '65', criteria: withCrit(7, { look: 'HOSPITAL' }) }),
  mrb('FRAIL ELDERLY SCREEN', '', 'All patients who are over 65 who have not been screened for Frail Elderly status', '', { ageFrom: '65', criteria: withCrit(3, { look: 'FRAIL', when: 'Never Done' }) }),
  mrb('HGBA1C', 'HAC', 'Determine whether or not HGBA1C done within last 6 months', '2004.02.05', { problem: 'DIABETES', range: '6', unit: 'Months', criteria: withCrit(0, { code: 'A1C', look: 'HGBA1C', when: 'Not in Range' }) }),
  mrb('HGBA1C OVER TARGET', 'HA', '', '', { problem: 'DIABETES', criteria: withCrit(0, { code: 'A1C', look: 'HGBA1C', value: '7.0' }) }),
  mrb('HYPERTENSION SCREEN', '', 'screening', '', { ageFrom: '18', criteria: withCrit(0, { code: 'BP', look: 'BLOOD PRESSURE', when: 'Never Done' }) }),
  mrb('HYPERTENSION SCREENG', '', 'Screening BP not done in the past year', '', { ageFrom: '18', range: '1', criteria: withCrit(0, { code: 'BP', look: 'BLOOD PRESSURE', when: 'Not in Range' }) }),
]

function mrbPatients(m: Mrb): { characteristics: Patient[]; criteria: Patient[] } {
  const lo = Number(m.ageFrom) || 0
  const hi = m.ageTo ? Number(m.ageTo) : 200
  const characteristics = patients
    .filter((p) => p.dob)
    .filter((p) => !m.active || p.status === 'A')
    .filter((p) => !m.sex || p.gender === m.sex)
    .filter((p) => { const a = Number(yearsOld(p.dob)); return a >= lo && a <= hi })
    .filter((p) => !m.problem || problemsOf(p).some((x) => rsLike(m.problem, x, 'contains')))
    .filter((p) => !m.excluding || !problemsOf(p).some((x) => rsLike(m.excluding, x, 'contains')))
  const used = m.criteria.filter((c) => c.look || c.code)
  const criteria = characteristics.filter((p, i) => used.every((c, j) => {
    /* Look For with Contains / Begins With — `%` wildcards — against a sample item for this chart */
    const sample = `${c.look.replace(/%/g, '')} ${p.chart}`
    const hit = rsLike(c.look, sample, rsMatchOf(c.where)) && (i + j) % 3 !== 0
    return c.when === 'Never Done' || c.when === 'Not in Range' ? !hit || (i % 2 === 0) : hit || (i % 2 === 1)
  }))
  return { characteristics, criteria }
}

function MedicalReportBuilderWindow({ close, open }: AreaWindowProps) {
  const [list, setList] = useState(() => mrbTemplates)
  const [cur, setCur] = useState(2)
  const [m, setM] = useState<Mrb>(() => JSON.parse(JSON.stringify(mrbTemplates[2]!)) as Mrb)
  const [message, setMessage] = useState<string | null>(null)
  useScreenReport({ mrbTemplate: pbSlug(m.name), mrbTemplates: list.length, mrbCriteria: m.criteria.filter((c) => c.look || c.code).length })
  const set = (patch: Partial<Mrb>) => setM((p) => ({ ...p, ...patch }))
  const setCrit = (i: number, patch: Partial<Crit>) => setM((p) => ({ ...p, criteria: p.criteria.map((c, j) => (j === i ? { ...c, ...patch } : c)) }))
  const load = (i: number) => { setCur(i); const t = list[i]; if (t) setM(JSON.parse(JSON.stringify(t)) as Mrb) }
  const save = () => {
    const name = m.name.trim().toUpperCase()
    if (!name) { setMessage('Please enter a name for the report template.'); return }
    const t = { ...m, name, created: m.created || now() }
    mrbTemplates = [...mrbTemplates.filter((x) => x.name !== name), t].sort((a, b) => a.name.localeCompare(b.name))
    setList(mrbTemplates)
    setCur(mrbTemplates.findIndex((x) => x.name === name))
    setM(t)
  }
  const del = () => {
    const t = list[cur]
    if (!t) return
    mrbTemplates = mrbTemplates.filter((x) => x.name !== t.name)
    setList(mrbTemplates)
    setCur(-1)
    setM(mrb('', '', '', ''))
  }
  const runReport = () => {
    const { characteristics, criteria } = mrbPatients(m)
    const byProvider = new Map<string, Patient[]>()
    for (const p of criteria) byProvider.set(p.provider || 'BLANK', [...(byProvider.get(p.provider || 'BLANK') ?? []), p])
    open('print-preview', {
      title: 'Medical Report Builder',
      pages: [[
        '**MOIS TEST CLINIC**',
        `%TITLE%MEDICAL REPORT BUILDER AS OF ${now()}`,
        '%RULE%',
        `%SUB%${m.name || 'UNTITLED'}`,
        ...(m.description ? [`%SUB%${m.description}`] : []),
        `%SUB%Number of patients matching - Characteristics: ${characteristics.length} Criteria: ${criteria.length}`,
        '%RULE%',
        ...[...byProvider].flatMap(([prov, ps]) => [
          `%S%MOST RESPONSIBLE PROVIDER: ${prov.toUpperCase()}`,
          '%COLS:37,8,8,17,16,14%',
          '%TH%NAME|AGE|SEX|HOME PHONE|LAST CONTACT|CHART NO',
          ...ps.sort((a, b) => a.last.localeCompare(b.last)).map((p) => `%TR%${p.last}, ${p.first}|${yearsOld(p.dob)}|${p.gender}|${p.home ?? ''}|${lastContact(p)}|${p.chart}`),
        ]),
      ].join('\n')],
    })
  }
  const runCsv = () => {
    const { criteria } = mrbPatients(m)
    open('report-excel', {
      title: m.name || 'Medical Report Builder',
      head: ['NAME', 'DATE OF BIRTH', 'SEX', 'HOME PHONE', 'LAST CONTACT', 'CHART NO', 'PATIENT STATUS', 'PROVIDER'],
      rows: criteria.map((p) => [`${p.last}, ${p.first}`, p.dob, p.gender, p.home ?? '', lastContact(p), p.chart, p.status, p.provider ?? '']),
    })
  }

  /* the capture's toolbar glyphs (page, red cross, disk, runner) are not drawn */
  const tool = (id: string, label: string, onClick: () => void) => (
    <DialogButton id={id} width={label.length * 7 + 14} onClick={onClick}>{label}</DialogButton>
  )
  const lbl = (t: string, w = 104) => <span className="pb-form__label" style={{ width: w, flex: 'none' }}>{t}</span>

  return (
    <WorkspaceDialogFrame id="medical-report-builder" title="Report Builder" width={1004} height={719} onClose={close}>
      <div style={{ background: 'linear-gradient(#4a6c9b, #2c4f7e)', color: '#fff', fontSize: 15, fontWeight: 700, padding: '4px 6px', flex: 'none' }}>Medical Report Builder</div>
      <div className="pb-row" style={{ gap: 2, padding: '2px 4px', borderBottom: '1px solid #a0a0a0', flex: 'none' }}>
        {tool('mrb-new', 'New Report', () => { setCur(-1); setM(mrb('', '', '', '')) })}
        {tool('mrb-delete', 'Delete Report', del)}
        {tool('mrb-save', 'Save', save)}
        {tool('mrb-run', 'Run Report', runReport)}
        {tool('mrb-run-csv', 'Run Report (CSV Output)', runCsv)}
        {tool('mrb-close', 'Close Window', close)}
      </div>
      <PBBand>Report Templates</PBBand>
      <div style={{ height: 220, flex: 'none', display: 'flex', padding: '0 3px' }}>
        <PBDataWindow
          rows={list}
          current={cur}
          onCurrentChange={load}
          rowTutorialId={(r) => `host.mois.row.mrb-${pbSlug(r.name)}`}
          columns={[
            { key: 'name', header: 'Name', width: 270 },
            { key: 'group', header: 'Group', width: 82 },
            { key: 'description', header: 'Description', width: 494 },
            { key: 'created', header: 'Created' },
          ]}
        />
      </div>
      <PBBand>Report Parameters</PBBand>
      <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', padding: '2px 6px' }}>
        <div className="pb-row" style={{ gap: 10, borderBottom: '1px solid #a0a0a0', paddingBottom: 3 }}>
          <span style={{ color: NAVY, fontWeight: 700, width: 180 }}>Patient Characteristics:</span>
          <CmdCheck id="mrb-active" label="Active Patients Only" checked={m.active} onChange={(v) => set({ active: v })} />
          <span>Provider:</span><FieldSelect id="mrb-provider" value={m.provider} options={RS_PROVIDERS} w={130} onChange={(v) => set({ provider: v })} />
          <span>Facility Code:</span><FieldSelect id="mrb-facility" value={m.facility} options={RS_FACILITIES} w={112} onChange={(v) => set({ facility: v })} />
          <span>Service Center:</span><FieldSelect id="mrb-service" value={m.service} options={RS_SERVICE_CENTERS} w={130} onChange={(v) => set({ service: v })} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', paddingTop: 3 }}>
          <div className="pb-row" style={{ gap: 6 }}>{lbl('Age Range:')}<FieldInput id="mrb-age-from" value={m.ageFrom} w={44} onChange={(v) => set({ ageFrom: v })} /> to <FieldInput id="mrb-age-to" value={m.ageTo} w={44} onChange={(v) => set({ ageTo: v })} /><span style={{ marginLeft: 12 }}>Sex:</span><FieldSelect id="mrb-sex" value={m.sex} options={['', 'F', 'M']} w={40} onChange={(v) => set({ sex: v })} /></div>
          <div className="pb-row" style={{ gap: 6 }}>Seen in Last:<FieldInput id="mrb-seen" value={m.seen} w={26} onChange={(v) => set({ seen: v })} />years.</div>
          <div className="pb-row" style={{ gap: 6 }}>{lbl('Problem Includes:')}<FieldInput id="mrb-problem" value={m.problem} w={280} onChange={(v) => set({ problem: v.toUpperCase() })} /></div>
          <div className="pb-row" style={{ gap: 6 }}>but excluding:<FieldInput id="mrb-excluding" value={m.excluding} w={280} onChange={(v) => set({ excluding: v.toUpperCase() })} /></div>
          <div className="pb-row" style={{ gap: 6 }}>{lbl('Procedure:')}<FieldInput id="mrb-procedure" value={m.procedure} w={280} onChange={(v) => set({ procedure: v.toUpperCase() })} /></div>
          <div />
          <div className="pb-row" style={{ gap: 6 }}>{lbl('Medication:')}<FieldInput id="mrb-medication" value={m.medication} w={280} onChange={(v) => set({ medication: v.toUpperCase() })} /></div>
        </div>
        <div className="pb-row" style={{ gap: 10, borderTop: '1px solid #a0a0a0', borderBottom: '1px solid #a0a0a0', padding: '3px 0', marginTop: 3 }}>
          <span style={{ color: NAVY, fontWeight: 700, width: 100 }}>Report Criteria:</span>
          <span>Range:</span><span>In - Last:</span><FieldInput id="mrb-range" value={m.range} w={40} onChange={(v) => set({ range: v })} />
          {['Days', 'Months', 'Years'].map((u) => <CmdRadio key={u} id={`mrb-range-${pbSlug(u)}`} name="mrb-unit" label={u} checked={m.unit === u} onChange={() => set({ unit: u })} />)}
          <span>(only used only if value is present)</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '110px 290px 90px 150px 1fr', rowGap: 1, alignItems: 'center', paddingTop: 3 }}>
          <b>ITEM</b><b>LOOK FOR</b><b>WHERE IN</b><span /><b>WHEN TO CONSIDER (if blank, ANYTIME if def</b>
          {ITEMS.map((x, i) => {
            const c = m.criteria[i]!
            const slug = pbSlug(x.item)
            return [
              <span key={`${i}a`}>{x.item}:</span>,
              i === 0
                ? <span key={`${i}b`} className="pb-row" style={{ gap: 4 }}><FieldInput id="mrb-look-code" value={c.code} w={62} onChange={(v) => setCrit(0, { code: v.toUpperCase() })} /><FieldInput id={`mrb-look-${slug}`} value={c.look} w={206} onChange={(v) => setCrit(0, { look: v.toUpperCase() })} /></span>
                : <FieldInput key={`${i}b`} id={`mrb-look-${slug}`} value={c.look} w={280} onChange={(v) => setCrit(i, { look: v.toUpperCase() })} />,
              i === 0
                ? <FieldInput key={`${i}c`} id="mrb-value" value={c.value} w={84} onChange={(v) => setCrit(0, { value: v })} />
                : <FieldSelect key={`${i}c`} id={`mrb-where-${slug}`} value={c.where} options={['Contains', 'Begins With']} w={84} onChange={(v) => setCrit(i, { where: v })} />,
              i === 0
                ? <span key={`${i}d`} className="pb-row" style={{ gap: 6 }}><CmdRadio id="mrb-greater" name="mrb-gl" label="Greater T/" checked={m.greater} onChange={() => set({ greater: true })} /><CmdRadio id="mrb-less" name="mrb-gl" label="Less T/" checked={!m.greater} onChange={() => set({ greater: false })} /></span>
                : <FieldSelect key={`${i}d`} value={c.field} options={[x.where]} w={146} onChange={() => undefined} />,
              <span key={`${i}e`} className="pb-row" style={{ gap: 8 }}>
                <FieldSelect id={`mrb-when-${slug}`} value={c.when} options={WHEN_TO_CONSIDER} w={112} onChange={(v) => setCrit(i, { when: v })} />
                {i === 0 && <><CmdRadio id="mrb-most-recent" name="mrb-recent" label="Most Recent" checked={m.recent} onChange={() => set({ recent: true })} /><CmdRadio id="mrb-all-in-range" name="mrb-recent" label="All within Range" checked={!m.recent} onChange={() => set({ recent: false })} /></>}
              </span>,
            ]
          })}
        </div>
        <div className="pb-row" style={{ gap: 6, paddingTop: 6 }}>
          {lbl('Name:', 44)}<FieldInput id="mrb-name" value={m.name} w={260} onChange={(v) => set({ name: v.toUpperCase() })} />
          <span>Group:</span><FieldInput id="mrb-group" value={m.group} w={70} onChange={(v) => set({ group: v.toUpperCase() })} />
          <span>Description:</span><FieldInput id="mrb-description" value={m.description} w={380} onChange={(v) => set({ description: v })} />
        </div>
      </div>
      {message && (
        <PBMessageBox title="Report Builder" icon="warn" buttons={[{ label: 'OK', value: 'ok', default: true, command: 'mrb-message-ok' }]} onClose={() => setMessage(null)}>{message}</PBMessageBox>
      )}
    </WorkspaceDialogFrame>
  )
}

registerAreaWindow('cohort-selection-tool', CohortSelectionWindow)
registerAreaWindow('medical-report-builder', MedicalReportBuilderWindow)
