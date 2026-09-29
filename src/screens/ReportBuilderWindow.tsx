import { useState, type ReactNode } from 'react'
import { useScreenReport } from '../host/screen-state'
import {
  BUILDER_BUSINESS_UNIT, BUILDER_USER, BUSINESS_UNITS, builderChangeHistory, builderReport, builderReports,
  builderRunHistory, deleteBuilderReport, loadReportNavigator, recordBuilderChange, recordBuilderRun,
  saveBuilderReport, shareBuilderReport, yearsOld, type BuilderReport,
} from '../data/reportParams'
import { stageStamp } from '../data/clock'
import { patients, MOIS_TODAY, type Patient } from '../data/patients'
import { RS_FACILITIES, RS_PROVIDERS, RS_SERVICE_CENTERS, RS_STATUS_CODES } from '../data/reportSpecs/types'
import {
  PBBand, PBCheckbox, PBDataWindow, PBMessageBox, PBTextArea, pbSlug, usePBInstrumentation,
} from '../pb'
import { registerAreaWindow, type AreaWindowProps } from './areaWindowRegistry'
import { DialogFooter, NAVY, SectionCaption } from './formKit'
import { useTickSet } from './listKit'
import { CmdCheck, CmdRadio, DotsButton, FieldInput, FieldSelect } from './reportKit'
import { ReportPicker } from './ReportSpecWindow'
import { DialogButton, WorkspaceDialogFrame } from './WorkspaceDialogFrame'

/* ============================================================================
   Advanced Medical Report Builder — Reports ▸ Report Builders.

   Two windows, as in MOIS: the list of reports you may see, and the Advanced
   Report Builder editor a New / Open / Clone lands in. The editor keeps its
   history and Extended Output windows over itself, so leaving them returns
   to the report being built.

   PROVENANCE (304055, current build)
   · List — `d2fba889`: caption `Advanced Medical Report Builder`, a navy
     `Advanced Medical Reports` header, the New · Delete · Open · Clone
     strip, and Name / Group / Description. The article's table calls Open
     "Edit".
   · Editor — `10429fe3` and the fifteen tab captures: a `Medical Report`
     band over Detail (Name, Desc., Access [Public ▼] with the owner beside
     it, Group), Actions (Save Changes; Other [Other options... ▼] Go) and
     Output (Report, CSV, Extended, Mail Merge), then TWO ROWS of tabs —
     Patient Data … Admissions and Interventions … MAR — where the row
     holding the selected tab sits next to the page, as a Windows multi-row
     tab control does (`10429fe3` Patient Data row below; `adb3f15f`
     Encounters row below). A tab with rules shows its count, `Measures (1)`
     (`ef440846`); Encounters, which has constraints rather than rules, is
     marked `Encounters *` (`18397cfb`).
   · Tab pages, one capture each: Patient Data `10429fe3`; Health Issues
     `d008eb9b`; Measurements `e4ecc3f4`; Long Term Medications `6ad896e9`;
     Images `dc711979`; Procedures `ddbec69b`; Consults `0d68755b`; Facility
     Admissions `502751cf`; Interventions `dc46ac2d`; Encounters `adb3f15f`
     (Conditions — When, Check for have / does not have; Constraint(s) —
     With at least / With no more than visits, Visit Code(s), Appt Status,
     Diagnoses, Service Code(s); Output(s) — Visit Count); Connections
     `18397cfb`; Alias ID `d80e154a`; Orders `b7611461`; Chart Preference
     `74fe2a26`; Risk `a94a8cc9`; Medication Administration Record
     `75158ddf`. Sixteen rule rows a page; When, the CSV tick and the
     Column Order box appear on a row once it has content (the CSV tick on
     every Health Issues row), the Column Order / # of Results boxes once
     its CSV box is ticked.

   BEHAVIOUR
   · New opens an empty report (Patient Status A, 0 to 120, last 3 years).
     Open loads the current row with its saved criteria. Clone asks first
     (304055 "Confirm that you want to clone the selected report"), and the
     copy opens as `COPY OF …`, Private, owned by the user, with no Business
     Units. Delete asks first; it deletes a report this user owns, or, for
     another Business Unit's Limited report, removes only this unit's access.
   · Save Changes refuses a duplicate name on a new report ("Duplicate report
     names will not be allowed") and an Access Level change on a report the
     user does not own ("Only the report owner can change its Access
     Level"); it records what changed in the report's Change History.
   · Report prints into the Print Preview, CSV opens the Excel sheet,
     Extended opens Extended Output, Mail Merge loads the Chart Navigator;
     each is recorded in the report's Run History.
   · Other options ▸ Change History Review / Run History Review ▸ Go opens
     the read-only history. The Limited-investigation lookback is one value
     shared by every tab (304055: "The time range chosen must remain
     consistent across all tabs").

   INFERRED — no capture exists for: the Business Unit section under the
   list (304055: "Review the Business Unit section below the report list"),
   the confirmation and refusal messages, the two history windows, the
   Extended Output window (built from the article's description: identify
   the panel, then choose the facts to gather into a CSV file — last done
   and next due by guideline), the "Patient has at least X …" choice (the
   article's table names it beside the captured "Patient has all …" tick),
   the Measures comparison operators and Check Against list, and every
   concept picker's contents.

   ANCHORS. Window ids `advanced-report-builder-list` / `advanced-report-builder`.
   Fields `host.mois.field.arb-name`, `arb-access`, `arb-group`, `arb-status`,
   `arb-age-from`, `arb-age-to`, `arb-sex`, `arb-last-contact`,
   `arb-<tab>-<column>-<row>` (row 1 of every tab: `arb-measures-concept-1`,
   `arb-measures-check-1`, `arb-measures-when-1`, `arb-connections-role-1` …),
   `arb-<tab>-at-least`, `arb-lookback`, `arb-other`, the Encounters
   constraints `arb-encounters-when|at-least|no-more|visit-codes|appt-status|diagnoses|service-codes`.
   Commands `arb-new|open|clone|delete`, `arb-confirm-yes|no`, `arb-save`,
   `arb-go`, `arb-report|csv|extended|mail-merge`, `arb-<tab>-all`,
   `arb-<tab>-limit`, `arb-encounters-have|not`, `arb-encounters-visit-count`,
   `arb-extended-generate`, `arb-history-close`, `arb-add-business-unit`.
   Tabs `host.mois.tab.<slug>`. Reports `host.screen.builderReport`,
   `builderRules` (`measures:1,procedures:1`), `builderEncounters`,
   `builderSaved`, `builderHistory` (change / run), `builderMessage`.
   ========================================================================= */

const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback)
const ROW_A = ['Patient Data', 'Health Conditions', 'Measures', 'Medications', 'Imaging', 'Procedures', 'Consults', 'Admissions']
const ROW_B = ['Interventions', 'Encounters', 'Connections', 'Alias ID', 'Order', 'Preference', 'Risk for Cond.', 'MAR']
const RULE_ROWS = 16
const WHEN = ['ANY TIME', 'IN RANGE', 'IGNORE']
const DONE = ['', 'Done', 'Not Done']
const HAS = ['', 'Has', 'Does Not Have']
const COMPARE = ['>', '>=', '<', '<=', '=', '<>']

/* ===========================================================================
   The criteria model
   ======================================================================== */
type Row = Record<string, string | boolean>
type Encounters = {
  when: string; check: 'have' | 'not'; atLeast: string; noMore: string
  visitCodes: string; apptStatus: string; diagnoses: string; serviceCodes: string; visitCount: boolean
}
type Criteria = {
  status: string; ageFrom: string; ageTo: string; sex: string
  provider: string; facility: string; service: string; lastYears: string
  fields: Record<string, { filter: string; csv: boolean; order: string }>
  grids: Record<string, Row[]>
  all: Record<string, boolean>
  atLeast: Record<string, string>
  stop: Record<string, boolean>
  noKnown: Record<string, boolean>
  extended: boolean
  limited: Record<string, boolean>
  lookback: { n: string; unit: string }
  encounters: Encounters
}

const blankEncounters = (): Encounters => ({
  when: 'ANY TIME', check: 'have', atLeast: '', noMore: '', visitCodes: '', apptStatus: '', diagnoses: '', serviceCodes: '', visitCount: false,
})
const blankCriteria = (): Criteria => ({
  status: 'A', ageFrom: '0', ageTo: '120', sex: '', provider: '', facility: '', service: '', lastYears: '3',
  fields: {}, grids: {}, all: {}, atLeast: {}, stop: {}, noKnown: {}, extended: false, limited: {},
  lookback: { n: '2', unit: 'Year(s)' }, encounters: blankEncounters(),
})
const isCriteria = (v: unknown): v is Criteria => !!v && typeof v === 'object' && 'grids' in (v as object)
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T

/* ===========================================================================
   The rule tabs, one config each (captures cited in the header)
   ======================================================================== */
type Col = {
  key: string
  header: ReactNode
  w: number
  kind: 'dots' | 'text' | 'select' | 'check' | 'num'
  options?: string[]
  /** the "…" picker's list (`code - desc` fills code and the next column) */
  pick?: string[]
  /** drawn only on a row with content */
  filled?: boolean
  /** drawn only when the row's CSV box is ticked */
  csv?: boolean
  /** drawn only when Check Condition is a comparison */
  compare?: boolean
}
type GridTab = {
  heading: string
  noun: string
  stop?: boolean
  noKnown?: boolean
  extended?: boolean
  limit?: boolean
  cols: Col[]
  /** the columns whose content makes a row count */
  count: string[]
  /** what a row starts with once it has content */
  defaults: Row
  notes: string[]
}

const WHEN_NOTE = 'When:  allows user to limit the selection range (ie BP in the last 2 years - choose IN RANGE)'
const csvCols = (): Col[] => [
  { key: 'csv', header: <>Include in<br />CSV File</>, w: 90, kind: 'check', filled: true },
  { key: 'order', header: <>Column Order<br />in CSV File</>, w: 90, kind: 'num', csv: true },
]
const whenCol: Col = { key: 'when', header: 'When', w: 90, kind: 'select', options: WHEN, filled: true }
const conceptCol = (header: string, pick: string[], w = 290): Col => ({ key: 'concept', header, w, kind: 'dots', pick })
/** Imaging, Procedures, Consults, Admissions, Interventions: one shape */
const doneTab = (heading: string, noun: string, what: string, pick: string[]): GridTab => ({
  heading, noun, limit: true,
  cols: [conceptCol(`Concept or ${what} contains ...`, pick), { key: 'check', header: <>Check<br />Condition</>, w: 90, kind: 'select', options: DONE }, { key: 'gap', header: '', w: 250, kind: 'text' }, whenCol, ...csvCols()],
  count: ['concept'], defaults: { check: 'Done', when: 'ANY TIME' }, notes: [WHEN_NOTE],
})

const GRID_TABS: Record<string, GridTab> = {
  'Health Conditions': {
    heading: 'Health Issues', noun: 'conditions', stop: true, extended: true, noKnown: true,
    cols: [
      conceptCol('Concept or Problem Name contains...', ['ASTHMA', 'CARDIOVASCULAR DISEASE', 'CERVICAL CANCER', 'CHF', 'CHRONIC KIDNEY DISEASE', 'COPD', 'DEPRESSION', 'DIABETES', 'HYPERTENSION', 'OBESITY', 'TYPE 2 DIABETES MELLITUS'], 400),
      { key: 'check', header: <>Check<br />Condition</>, w: 90, kind: 'select', options: HAS },
      { key: 'gap', header: '', w: 230, kind: 'text' },
      { key: 'csv', header: <>Include in<br />CSV File</>, w: 90, kind: 'check' },
    ],
    count: ['concept'], defaults: { check: 'Has' },
    notes: [
      "Include Extended Information in CSV File will output the health issues' START DATE and actual PROBLEM NAME as it appears in the patient's chart.",
      'If the Include Items with a Stop Date is checked, the END DATE will be included in the CSV File.',
    ],
  },
  Measures: {
    heading: 'Measurements', noun: 'conditions', limit: true,
    cols: [
      { key: 'code', header: 'Code', w: 76, kind: 'dots', pick: ['328 - FREE HEMOGLOBIN', '1950 - BLOOD PRESSURE', '128 - HBA1C', '412 - LDL CHOLESTEROL', '210 - EGFR', '77 - BMI', '903 - PAP SMEAR', '640 - SMOKING STATUS'] },
      conceptCol('Concept / Description', ['BLOOD PRESSURE', 'BMI', 'EGFR', 'FREE HEMOGLOBIN', 'HBA1C', 'LDL CHOLESTEROL', 'PAP SMEAR', 'SMOKING STATUS', 'WEIGHT'], 236),
      { key: 'check', header: <>Check<br />Condition</>, w: 90, kind: 'select', options: [...DONE, ...COMPARE] },
      { key: 'control', header: 'Control Value', w: 100, kind: 'text', compare: true },
      { key: 'against', header: 'Check Against', w: 110, kind: 'select', options: ['', 'Last Value', 'Any Value', 'Average'], compare: true },
      whenCol,
      { key: 'csv', header: <>Include in<br />CSV File</>, w: 70, kind: 'check', filled: true },
      { key: 'results', header: <># of Results<br />to include*</>, w: 72, kind: 'num', csv: true },
      { key: 'order', header: <>Column Order<br />in CSV File</>, w: 80, kind: 'num', csv: true },
    ],
    count: ['code', 'concept'], defaults: { check: 'Done', when: 'ANY TIME' },
    notes: [WHEN_NOTE, '*  # of Results to include:  allows the user to output more than one value to the CSV file.  Values will be output in descending date, with the most recent first.'],
  },
  Medications: {
    heading: 'Long Term Medications', noun: 'medications', stop: true, noKnown: true,
    cols: [
      conceptCol('Concept or Medication contains ...', ['ACE INHIBITOR', 'ASA', 'BETABLOCKER', 'INSULIN', 'METFORMIN', 'OPIOID', 'STATIN', 'WARFARIN']),
      { key: 'check', header: <>Check<br />Condition</>, w: 90, kind: 'select', options: ['', 'Taking', 'Not Taking'] },
      { key: 'gap', header: '', w: 340, kind: 'text' },
      ...csvCols(),
    ],
    count: ['concept'], defaults: { check: 'Taking' }, notes: [],
  },
  Imaging: doneTab('Images', 'images', 'Image', ['BONE DENSITY', 'CHEST XRAY', 'ECHOCARDIOGRAM', 'MAMMOGRAM', 'ULTRASOUND ABDOMEN']),
  Procedures: doneTab('Procedures', 'procedures', 'Procedure', ['COLONOSCOPY', 'EYE EXAM', 'FOOT EXAM', 'HYSTERECTOMY', 'PAP SMEAR', 'SPIROMETRY']),
  Consults: doneTab('Consults', 'consults', 'Consult', ['CARDIOLOGY', 'ENDOCRINOLOGY', 'NEPHROLOGY', 'OPHTHALMOLOGY', 'PSYCHIATRY']),
  Admissions: doneTab('Facility Admissions', 'admissions', 'Facility Admission', ['DAWSON CREEK AND DISTRICT HOSPITAL', 'FORT ST. JOHN HOSPITAL', 'UNIVERSITY HOSPITAL OF NORTHERN BC']),
  Interventions: doneTab('Interventions', 'interventions', 'Intervention', ['DIETITIAN REFERRAL', 'FOOT CARE EDUCATION', 'INFLUENZA', 'PNEUMOCOCCAL', 'SMOKING CESSATION COUNSELLING']),
  Connections: {
    heading: 'Connections', noun: 'connections', stop: true,
    cols: [
      { key: 'role', header: 'Connection Role', w: 124, kind: 'select', options: ['', 'CARE TEAM', 'CONSULTING', 'MRP', 'PHARMACY', 'PRIMARY', 'REFERRING'] },
      { key: 'resource', header: 'Connection Resource', w: 110, kind: 'select', options: ['', 'CLINIC', 'ORGANIZATION', 'PROVIDER (EXT)', 'PROVIDER (INT)'] },
      { key: 'connection', header: 'Connection', w: 268, kind: 'dots', pick: RS_PROVIDERS.filter(Boolean) },
      { key: 'check', header: <>Check<br />Condition</>, w: 90, kind: 'select', options: HAS },
      { key: 'gap', header: '', w: 110, kind: 'text' },
      ...csvCols(),
    ],
    count: ['role', 'connection'], defaults: { check: 'Has' }, notes: [],
  },
  'Alias ID': {
    heading: 'Alias ID', noun: 'alias id',
    cols: [
      { key: 'code', header: 'Code', w: 96, kind: 'select', options: ['', 'BAND', 'DND', 'IFHP', 'RCMP', 'STATUS', 'WCB'] },
      { key: 'description', header: 'Description', w: 406, kind: 'text' },
      { key: 'check', header: <>Check<br />Condition</>, w: 90, kind: 'select', options: HAS },
      { key: 'gap', header: '', w: 110, kind: 'text' },
      ...csvCols(),
    ],
    count: ['code'], defaults: { check: 'Has' }, notes: [],
  },
  Order: {
    heading: 'Orders', noun: 'orders', limit: true,
    cols: [
      { key: 'type', header: 'Order Type', w: 124, kind: 'select', options: ['', 'CONSULT', 'IMAGING', 'LAB', 'PROCEDURE', 'REFERRAL'] },
      { key: 'code', header: 'Code', w: 124, kind: 'dots', pick: ['CBC - COMPLETE BLOOD COUNT', 'HBA1C - HEMOGLOBIN A1C', 'LIPID - LIPID PROFILE', 'MAMMO - MAMMOGRAM SCREENING', 'XCHEST - CHEST XRAY'] },
      { key: 'description', header: 'Description', w: 308, kind: 'text' },
      { key: 'check', header: <>Check<br />Condition</>, w: 90, kind: 'select', options: DONE },
      whenCol,
      ...csvCols(),
    ],
    count: ['type', 'code'], defaults: { check: 'Done', when: 'ANY TIME' }, notes: [WHEN_NOTE],
  },
  Preference: {
    heading: 'Chart Preference', noun: 'preference', stop: true,
    cols: [
      { key: 'type', header: 'Type', w: 98, kind: 'text' },
      { key: 'subject', header: 'Subject', w: 92, kind: 'select', options: ['', 'Contact', 'Immunization', 'Medication', 'Screening', 'Treatment'] },
      { key: 'identify', header: 'Identify By', w: 74, kind: 'select', options: ['', 'Concept', 'Standard Code'] },
      { key: 'concept', header: 'Concept', w: 312, kind: 'dots', pick: ['ALL VACCINES', 'BLOOD PRODUCTS', 'CONTACT BY PHONE', 'INFLUENZA VACCINE'] },
      { key: 'check', header: <>Check<br />Condition</>, w: 96, kind: 'select', options: HAS },
      { key: 'instruction', header: 'Instruction', w: 140, kind: 'text', filled: true },
      ...csvCols(),
    ],
    count: ['type', 'concept'], defaults: { check: 'Has' }, notes: [],
  },
  'Risk for Cond.': {
    heading: 'Risk', noun: 'risk', stop: true,
    cols: [
      conceptCol('Concept or Description contains ...', ['BREAST CANCER', 'CARDIOVASCULAR DISEASE', 'CERVICAL CANCER', 'COLORECTAL CANCER', 'DIABETES']),
      { key: 'check', header: <>Check<br />Condition</>, w: 90, kind: 'select', options: HAS },
      { key: 'gap', header: '', w: 340, kind: 'text' },
      ...csvCols(),
    ],
    count: ['concept'], defaults: { check: 'Has' }, notes: [],
  },
  MAR: {
    heading: 'Medication Administration Record', noun: 'MAR', limit: true,
    cols: [
      { key: 'code', header: 'Code', w: 84, kind: 'dots', pick: ['02420686 - HEP B VACCINE', '02231015 - INFLUENZA VACCINE', '00015652 - VITAMIN B12 INJECTION', '`a J07CA - COMBINED VACCINES'] },
      conceptCol('Concept or Generic Name contains ...', ['DEPOT MEDROXYPROGESTERONE', 'HEP B VACCINE', 'INFLUENZA VACCINE', 'VITAMIN B12'], 228),
      { key: 'check', header: <>Check<br />Condition</>, w: 90, kind: 'select', options: DONE },
      { key: 'gap', header: '', w: 250, kind: 'text' },
      whenCol,
      ...csvCols(),
    ],
    count: ['code', 'concept'], defaults: { check: 'Done', when: 'ANY TIME' },
    notes: [WHEN_NOTE.replace('BP in the last', 'MAR in the last'), 'To search for ATC Codes, add `a before the code (ie `a J07CA*)'],
  },
}

const ALIAS_DESCRIPTIONS: Record<string, string> = {
  BAND: 'BAND NUMBER', DND: 'DEPARTMENT OF NATIONAL DEFENCE', IFHP: 'INTERIM FEDERAL HEALTH', RCMP: 'RCMP NUMBER', STATUS: 'STATUS CARD NUMBER', WCB: 'WCB CLAIM NUMBER',
}

const rowsOf = (c: Criteria, t: string): Row[] => c.grids[t] ?? Array.from({ length: RULE_ROWS }, () => ({}))
const rowHas = (t: string, r: Row) => GRID_TABS[t]!.count.some((k) => typeof r[k] === 'string' && (r[k] as string).trim())
const counted = (c: Criteria, t: string) => (GRID_TABS[t] ? rowsOf(c, t).filter((r) => rowHas(t, r)).length : 0)
const encountersSet = (e: Encounters) => e.visitCount || !!(e.atLeast || e.noMore || e.visitCodes || e.apptStatus || e.diagnoses || e.serviceCodes)
const ruleSummary = (c: Criteria) => [...ROW_A, ...ROW_B].filter((t) => counted(c, t)).map((t) => `${pbSlug(t)}:${counted(c, t)}`).join(',')

/** the patients a report matches: the Patient Data filters, then fewer as rules are added */
function matchedPatients(c: Criteria): Patient[] {
  const statuses = c.status.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
  const lo = Number(c.ageFrom) || 0
  const hi = c.ageTo ? Number(c.ageTo) : 200
  const rules = [...ROW_A, ...ROW_B].reduce((n, t) => n + counted(c, t), 0) + (encountersSet(c.encounters) ? 1 : 0)
  return patients
    .filter((p) => p.dob)
    .filter((p) => !statuses.length || statuses.includes(p.status))
    .filter((p) => !c.sex || p.gender === c.sex.toUpperCase())
    .filter((p) => { const a = Number(yearsOld(p.dob)); return a >= lo && a <= hi })
    .filter((_p, i) => rules === 0 || (i + rules) % (rules + 2) !== 0)
}

/* ===========================================================================
   The list
   ======================================================================== */
type Confirm = { kind: 'clone' | 'delete'; report: BuilderReport }

function BuilderListWindow({ close, open }: AreaWindowProps) {
  const [version, setVersion] = useState(0)
  const rows = builderReports()
  const [cur, setCur] = useState(0)
  const picked = rows[Math.min(cur, rows.length - 1)]
  const [confirm, setConfirm] = useState<Confirm | null>(null)
  const [adding, setAdding] = useState(false)
  useScreenReport({ builderReport: pbSlug(picked?.name ?? ''), builderReports: rows.length, builderConfirm: confirm?.kind ?? '' })
  const openReport = (r: BuilderReport | undefined) => {
    if (r) open('advanced-report-builder', { ...r, original: r.name })
  }
  const answer = (v: string) => {
    const c = confirm
    setConfirm(null)
    if (!c || v !== 'yes') return
    if (c.kind === 'clone') {
      open('advanced-report-builder', {
        name: `COPY OF ${c.report.name}`, group: c.report.group, description: c.report.description,
        access: 'Private', owner: BUILDER_USER, criteria: c.report.criteria, isNew: true,
      })
    } else {
      deleteBuilderReport(c.report.name)
      setVersion((n) => n + 1)
    }
  }
  const foreign = picked && picked.access === 'Limited' && picked.owner !== BUILDER_USER

  return (
    <WorkspaceDialogFrame id="advanced-report-builder-list" title="Advanced Medical Report Builder" width={992} height={600} onClose={close}>
      <div style={{ background: NAVY.win, color: '#fff', fontSize: 17, fontWeight: 700, padding: '4px 6px', flex: 'none' }}>Advanced Medical Reports</div>
      <div className="pb-row" style={{ gap: 0, padding: '2px 0', background: '#d4d0c8', borderBottom: '1px solid #808080', flex: 'none' }}>
        <DialogButton id="arb-new" width={80} onClick={() => open('advanced-report-builder', { isNew: true })}>New</DialogButton>
        <DialogButton id="arb-delete" width={80} onClick={() => picked && setConfirm({ kind: 'delete', report: picked })}>Delete</DialogButton>
        <DialogButton id="arb-open" width={80} onClick={() => openReport(picked)}>Open</DialogButton>
        <DialogButton id="arb-clone" width={80} onClick={() => picked && setConfirm({ kind: 'clone', report: picked })}>Clone</DialogButton>
      </div>
      <div key={version} style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
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
      {/* INFERRED: the Business Unit section under the list (304055 text) */}
      <div style={{ flex: 'none', height: 132, display: 'flex', flexDirection: 'column', borderTop: '1px solid #808080' }} data-tutorial-id="host.mois.group.arb-business-units">
        <PBBand right={picked?.access === 'Limited' ? <DialogButton id="arb-add-business-unit" width={130} onClick={() => setAdding(true)}>Add Business Unit</DialogButton> : undefined}>
          Business Unit
        </PBBand>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
          {picked?.access === 'Limited' ? (
            <PBDataWindow
              rows={(picked.businessUnits ?? []).map((u) => ({ unit: u, owner: u === BUILDER_BUSINESS_UNIT && picked.owner === BUILDER_USER ? 'Owner' : '' }))}
              columns={[{ key: 'unit', header: 'Business Unit', width: 320 }, { key: 'owner', header: '' }]}
              empty="No Business Unit has access to this report."
            />
          ) : (
            <div style={{ padding: '6px 8px', color: '#404040' }}>
              {picked ? `${picked.access} report — Business Unit access applies to Limited reports only. Owner: ${picked.owner ?? BUILDER_USER}` : ''}
            </div>
          )}
        </div>
      </div>
      {confirm && (
        <PBMessageBox
          title="Advanced Medical Report Builder"
          icon="question"
          buttons={[
            { label: 'Yes', value: 'yes', default: true, command: 'arb-confirm-yes' },
            { label: 'No', value: 'no', command: 'arb-confirm-no' },
          ]}
          onClose={answer}
        >
          {confirm.kind === 'clone'
            ? `Clone the report '${confirm.report.name}'?`
            : foreign
              ? `The report '${confirm.report.name}' belongs to another Business Unit. Remove your Business Unit's access to it?`
              : `Delete the report '${confirm.report.name}'?`}
        </PBMessageBox>
      )}
      {adding && picked && (
        <ReportPicker
          pick={{ title: 'Add Business Unit', options: BUSINESS_UNITS }}
          value=""
          onCancel={() => setAdding(false)}
          onOk={(u) => { if (u) shareBuilderReport(picked.name, u); setAdding(false); setVersion((n) => n + 1) }}
        />
      )}
    </WorkspaceDialogFrame>
  )
}

/* ===========================================================================
   The editor's small controls
   ======================================================================== */
const Heading = ({ children }: { children: ReactNode }) => (
  <SectionCaption padding="6px 0 3px" rule="#c0c0c0" style={{ marginBottom: 4 }}>{children}</SectionCaption>
)

const PATIENT_FIELDS = ['Address 1', 'Address 2', 'City', 'Province', 'Country', 'Postal Code', 'Home Phone', 'Work Phone', 'Cell Phone', 'Other Phone', 'Fax', 'Home Email', 'Work Email', 'Location Code', 'Insurance Provider', 'Ethnicity - Father', 'Ethnicity - Mother']

/* ===========================================================================
   The editor
   ======================================================================== */
type Message = { title: string; icon: 'warn' | 'error' | 'info'; text: string; slug: string }
type Picking = { title: string; options: readonly string[]; multi?: boolean; value: string; apply: (v: string) => void }

function BuilderEditorWindow({ args, close, open }: AreaWindowProps) {
  const host = usePBInstrumentation()
  const [original, setOriginal] = useState(str(args.original))
  const [isNew, setIsNew] = useState(args.isNew === true || !str(args.original))
  const [owner] = useState(str(args.owner, BUILDER_USER))
  const [name, setName] = useState(str(args.name))
  const [desc, setDesc] = useState(str(args.description))
  const [group, setGroup] = useState(str(args.group))
  const [access, setAccess] = useState(str(args.access, 'Public'))
  const [other, setOther] = useState('Other options...')
  const [tab, setTab] = useState('Patient Data')
  const [c, setC] = useState<Criteria>(() => (isCriteria(args.criteria) ? clone(args.criteria) : blankCriteria()))
  const [baseline, setBaseline] = useState(() => ({ c: isCriteria(args.criteria) ? clone(args.criteria) : blankCriteria(), name: str(args.name), desc: str(args.description), group: str(args.group), access: str(args.access, 'Public') }))
  const [saved, setSaved] = useState(false)
  const [message, setMessage] = useState<Message | null>(null)
  const [picking, setPicking] = useState<Picking | null>(null)
  const [history, setHistory] = useState<'change' | 'run' | null>(null)
  const [extended, setExtended] = useState(false)

  const edit = (f: (d: Criteria) => void) => { setSaved(false); setC((prev) => { const d = clone(prev); f(d); return d }) }
  const setRow = (t: string, i: number, patch: Row) => edit((d) => {
    const cfg = GRID_TABS[t]!
    const list = rowsOf(d, t)
    const before = list[i] ?? {}
    let next: Row = { ...before, ...patch }
    /* a row that gets content takes its tab's defaults (Has / Done / Taking, ANY TIME) */
    if (!rowHas(t, before) && rowHas(t, next)) next = { ...cfg.defaults, ...next }
    if (t === 'Alias ID' && typeof patch.code === 'string') next.description = ALIAS_DESCRIPTIONS[patch.code] ?? ''
    list[i] = next
    d.grids[t] = list
  })
  const reportName = name.trim() || 'NAME OF REPORT'

  useScreenReport({
    builderReport: pbSlug(name),
    builderRules: ruleSummary(c),
    builderEncounters: encountersSet(c.encounters),
    builderSaved: saved,
    builderHistory: history ?? '',
    builderMessage: message?.slug ?? '',
    builderExtended: extended,
  })

  /* --- the tab strip: the selected tab's row sits next to the page ------- */
  const pickTab = (t: string) => { host?.report('selectTab', { tab: pbSlug(t) }); setTab(t) }
  const tabButton = (t: string) => {
    const n = counted(c, t)
    const label = n ? `${t} (${n})` : t === 'Encounters' && encountersSet(c.encounters) ? 'Encounters *' : t
    const on = t === tab
    return (
      <button
        key={t}
        type="button"
        data-tutorial-id={host?.anchor('tab', pbSlug(t))}
        onClick={() => pickTab(t)}
        style={{
          flex: '1 1 0', height: 21, border: '1px solid #a0a0a0', borderBottom: on ? '1px solid #fff' : '1px solid #a0a0a0',
          background: on ? '#fff' : '#f0f0f0', fontWeight: 400, fontSize: 12, padding: 0, marginTop: on ? -2 : 0,
          outline: on ? '1px dotted #000' : undefined, outlineOffset: -4,
        }}
      >
        {label}
      </button>
    )
  }
  const [far, near] = ROW_B.includes(tab) ? [ROW_A, ROW_B] : [ROW_B, ROW_A]

  /* --- outputs ----------------------------------------------------------- */
  const matched = () => matchedPatients(c)
  const run = (output: string, n: number) => recordBuilderRun(reportName.toUpperCase(), output, n, stageStamp())
  const reportOutput = () => {
    const list = matched()
    run('Report', list.length)
    const tabs = [...ROW_A, ...ROW_B].filter((t) => counted(c, t)).map((t) => `${t} (${counted(c, t)})`)
    open('print-preview', {
      title: reportName.toUpperCase(),
      pages: [[
        '**MOIS TEST CLINIC**',
        `%TITLE%${reportName.toUpperCase()} AS OF ${MOIS_TODAY}`,
        ...(desc ? [`%SUB%${desc}`] : []),
        `%SUB%Number of patients matching: ${list.length}`,
        `%G%Criteria: Patient Status ${c.status || 'ALL'}; Age ${c.ageFrom || '0'} to ${c.ageTo || '120'}${c.sex ? `; Sex ${c.sex}` : ''}${c.lastYears ? `; Last contact in the last ${c.lastYears} year(s)` : ''}${tabs.length ? `; ${tabs.join(', ')}` : ''}`,
        '%COLS:9,28,13,7,6,17,20%',
        '%TH%CHART|NAME|DOB|AGE|SEX|HOME PHONE|PROVIDER',
        ...list.map((p) => `%TR%${p.chart}|${p.last}, ${p.first}|${p.dob}|${yearsOld(p.dob)}|${p.gender}|${p.home ?? ''}|${p.provider ?? ''}`),
        '',
        `**TOTAL PATIENTS: ${list.length}**`,
      ].join('\n')],
    })
  }
  const csvOutput = () => {
    const list = matched()
    run('CSV', list.length)
    const extra: { head: string; value: (p: Patient) => string }[] = []
    for (const f of PATIENT_FIELDS) if (c.fields[f]?.csv) extra.push({ head: f.toUpperCase(), value: (p) => fieldOf(p, f) })
    for (const t of [...ROW_A, ...ROW_B]) {
      if (!GRID_TABS[t]) continue
      rowsOf(c, t).forEach((r) => {
        if (!rowHas(t, r) || r.csv !== true) return
        const label = String(r.concept || r.code || r.connection || r.type || '').toUpperCase()
        extra.push({ head: label, value: (p) => ((Number(p.chart) + label.length) % 3 ? (r.check === 'Not Done' || r.check === 'Does Not Have' ? '' : 'Y') : '') })
      })
    }
    if (c.encounters.visitCount) extra.push({ head: 'VISIT COUNT', value: (p) => String((Number(p.chart) % 9) + 1) })
    open('report-excel', {
      title: reportName,
      head: ['CHART', 'LAST NAME', 'FIRST NAME', 'DOB', 'AGE', 'SEX', 'STATUS', ...extra.map((e) => e.head)],
      rows: list.map((p) => [p.chart, p.last, p.first, p.dob, yearsOld(p.dob), p.gender, p.status, ...extra.map((e) => e.value(p))]),
    })
  }
  const mailMerge = () => {
    const list = matched()
    run('Mail Merge', list.length)
    loadReportNavigator(list.map((p) => ({ chart: p.chart, name: `${p.last},${p.first}`, description: reportName.toUpperCase() })))
    close()
    open('chart-navigator')
  }

  /* --- Save Changes ------------------------------------------------------- */
  const save = () => {
    const n = name.trim().toUpperCase()
    if (!n) { setMessage({ title: 'Advanced Report Builder', icon: 'warn', text: 'Please enter a name for the report.', slug: 'name-required' }); return }
    const existing = builderReport(n)
    if (existing && (isNew || n !== original)) {
      setMessage({ title: 'Advanced Report Builder', icon: 'error', text: `A report named '${n}' already exists. Duplicate report names are not allowed.`, slug: 'duplicate-name' })
      return
    }
    if (!isNew && owner !== BUILDER_USER && access !== baseline.access) {
      setMessage({ title: 'Advanced Report Builder', icon: 'warn', text: 'Only the report owner can change its Access Level. Clone the report to make your own copy.', slug: 'not-owner' })
      return
    }
    const units = builderReport(original)?.businessUnits
    saveBuilderReport({ name: n, group, description: desc, access: access as BuilderReport['access'], owner, businessUnits: units, criteria: clone(c) })
    const list: { change: string; detail: string }[] = []
    if (isNew) list.push({ change: 'Report created', detail: `Name: ${n}\nAccess: ${access}` })
    else {
      if (n !== baseline.name) list.push({ change: `Name: ${baseline.name} -> ${n}`, detail: 'Report renamed.' })
      if (access !== baseline.access) list.push({ change: `Access: ${baseline.access} -> ${access}`, detail: `Access Level changed from ${baseline.access} to ${access}.` })
      if (desc !== baseline.desc) list.push({ change: 'Description changed', detail: desc })
      if (group !== baseline.group) list.push({ change: `Group: ${baseline.group || '(none)'} -> ${group || '(none)'}`, detail: '' })
    }
    for (const t of [...ROW_A, ...ROW_B]) {
      if (!GRID_TABS[t]) continue
      const was = counted(baseline.c, t)
      const is = counted(c, t)
      const lines = rowsOf(c, t).filter((r) => rowHas(t, r)).map((r) => `  ${String(r.concept || r.code || r.connection || r.type || '')}  ${String(r.check ?? '')}`)
      if (was !== is || JSON.stringify(rowsOf(baseline.c, t)) !== JSON.stringify(rowsOf(c, t))) {
        list.push({ change: `${t}: ${is} rule(s)`, detail: [t, ...lines].join('\n') })
      }
    }
    if (JSON.stringify(baseline.c.encounters) !== JSON.stringify(c.encounters)) list.push({ change: 'Encounters: constraints changed', detail: 'Encounters' })
    const patientKeys = ['status', 'ageFrom', 'ageTo', 'sex', 'provider', 'facility', 'service', 'lastYears'] as const
    if (patientKeys.some((k) => baseline.c[k] !== c[k]) || JSON.stringify(baseline.c.fields) !== JSON.stringify(c.fields)) {
      list.push({ change: 'Patient Data changed', detail: `Patient Status ${c.status}; Age ${c.ageFrom} to ${c.ageTo}; Sex ${c.sex || '(any)'}; Last contact ${c.lastYears || '(ignored)'} year(s)` })
    }
    recordBuilderChange(n, list, stageStamp())
    setName(n)
    setOriginal(n)
    setIsNew(false)
    setBaseline({ c: clone(c), name: n, desc, group, access })
    setSaved(true)
  }

  const go = () => {
    if (other === 'Change History Review') setHistory('change')
    else if (other === 'Run History Review') setHistory('run')
  }

  /* --- the grid tabs ------------------------------------------------------ */
  const gridTab = (t: string) => {
    const cfg = GRID_TABS[t]!
    const slug = pbSlug(t)
    const all = c.all[t] ?? true
    const limit = c.limited[t] ?? false
    const template = cfg.cols.map((col) => `${col.w}px`).join(' ') + ' 1fr'
    const cell = (col: Col, r: Row, i: number) => {
      const id = i === 0 ? `arb-${slug}-${col.key}-1` : undefined
      const v = typeof r[col.key] === 'string' ? (r[col.key] as string) : ''
      const has = rowHas(t, r)
      const hidden = (col.filled && !has && !(t === 'Health Conditions' && col.kind === 'check'))
        || (col.csv && r.csv !== true)
        || (col.compare && !COMPARE.includes(String(r.check ?? '')))
        || col.key === 'gap'
      if (hidden) return <span key={col.key} />
      switch (col.kind) {
        case 'dots': {
          const pick = col.pick ?? []
          return (
            <span key={col.key} className="pb-inputgroup" style={{ width: col.w - 4 }}>
              <FieldInput id={id} value={v} w="100%" onChange={(x) => setRow(t, i, { [col.key]: x.toUpperCase() })} />
              <DotsButton h={19}
                id={i === 0 ? `arb-${slug}-${col.key}-1` : undefined}
                onClick={() => setPicking({
                  title: `Select ${typeof col.header === 'string' ? col.header.replace(/ contains.*$/, '') : 'Concept'}`,
                  options: pick, value: v,
                  apply: (x) => {
                    const [code, rest] = x.includes(' - ') ? x.split(' - ') : [x, '']
                    if (rest && col.key === 'code') {
                      const next = cfg.cols[cfg.cols.indexOf(col) + 1]
                      setRow(t, i, { code: code!.trim(), ...(next ? { [next.key]: rest.trim() } : {}) })
                    } else setRow(t, i, { [col.key]: x })
                  },
                })}
              />
            </span>
          )
        }
        case 'select':
          return (
            <span key={col.key}>
              <FieldSelect id={id} value={v || (col.key === 'when' ? 'ANY TIME' : '')} options={col.options ?? []} w={col.w - 4}
                onChange={(x) => setRow(t, i, { [col.key]: x })} />
            </span>
          )
        case 'check':
          return (
            <span key={col.key} style={{ textAlign: 'center' }}>
              {i === 0
                ? <CmdCheck id={`arb-${slug}-csv-1`} checked={r.csv === true} onChange={(x) => setRow(t, i, { csv: x })} />
                : <PBCheckbox checked={r.csv === true} onChange={(x) => setRow(t, i, { csv: x })} />}
            </span>
          )
        case 'num':
          return <span key={col.key} style={{ textAlign: 'center' }}><FieldInput id={id} value={v} w={col.w - 18} align="center" onChange={(x) => setRow(t, i, { [col.key]: x })} /></span>
        default:
          return <span key={col.key}><FieldInput id={id} value={v} w={col.w - 4} onChange={(x) => setRow(t, i, { [col.key]: x })} /></span>
      }
    }
    return (
      <div style={{ padding: '4px 8px', display: 'flex', flexDirection: 'column', minHeight: 0, flex: '1 1 auto' }}>
        <Heading>{cfg.heading}</Heading>
        <div className="pb-row" style={{ gap: 16, padding: '2px 0 6px', borderBottom: '1px solid #c0c0c0', alignItems: 'flex-start' }}>
          <span className="pb-row" style={{ gap: 6 }}>
            <CmdCheck id={`arb-${slug}-all`} label={all ? `Patient has all the ${cfg.noun} listed below.` : 'Patient has at least'} checked={all}
              onChange={(v) => edit((d) => { d.all[t] = v })} />
            {!all && (
              <>
                <FieldInput id={`arb-${slug}-at-least`} value={c.atLeast[t] ?? '1'} w={32} align="center" onChange={(v) => edit((d) => { d.atLeast[t] = v })} />
                <span>{cfg.noun} listed below.</span>
              </>
            )}
          </span>
          <span style={{ flex: '1 1 auto' }} />
          {cfg.stop && (
            <CmdCheck id={`arb-${slug}-stop-date`} label="Include records with a stop date." checked={c.stop[t] ?? false} onChange={(v) => edit((d) => { d.stop[t] = v })} />
          )}
          {(cfg.extended || cfg.noKnown) && (
            <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {cfg.extended && <CmdCheck id={`arb-${slug}-extended`} label="Include Extended Information in CSV File" checked={c.extended} onChange={(v) => edit((d) => { d.extended = v })} />}
              {cfg.noKnown && <CmdCheck id={`arb-${slug}-no-known`} label="Include Patients with No Known." checked={c.noKnown[t] ?? false} onChange={(v) => edit((d) => { d.noKnown[t] = v })} />}
            </span>
          )}
          {cfg.limit && (
            <span className="pb-row" style={{ gap: 6 }}>
              <span>Limited investigation to a date range?</span>
              <CmdCheck id={`arb-${slug}-limit`} checked={limit} onChange={(v) => edit((d) => { d.limited[t] = v })} />
              {limit && (
                <>
                  <span>Only look at data from the last</span>
                  <FieldInput id="arb-lookback" value={c.lookback.n} w={32} align="center" onChange={(v) => edit((d) => { d.lookback.n = v })} />
                  <FieldSelect value={c.lookback.unit} options={['Year(s)', 'Month(s)', 'Day(s)']} w={66} onChange={(v) => edit((d) => { d.lookback.unit = v })} />
                </>
              )}
            </span>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: template, alignItems: 'end', padding: '4px 0', textAlign: 'center' }}>
          {cfg.cols.map((col) => <span key={col.key} style={{ textAlign: ['check', 'when', 'csv', 'order', 'results', 'control', 'against'].includes(col.key) ? 'center' : 'left' }}>{col.key === 'gap' ? '' : col.header}</span>)}
          <span />
        </div>
        <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto' }}>
          {rowsOf(c, t).map((r, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: template, alignItems: 'center', height: 22 }}>
              {cfg.cols.map((col) => cell(col, r, i))}
              <span />
            </div>
          ))}
        </div>
        {cfg.notes.length > 0 && (
          <div style={{ borderTop: '1px solid #c0c0c0', padding: '4px 0', fontSize: 11 }}>
            {cfg.notes.map((n) => <div key={n}>{n}</div>)}
          </div>
        )}
      </div>
    )
  }

  /* --- Encounters (`adb3f15f`) ------------------------------------------- */
  const e = c.encounters
  const setE = (patch: Partial<Encounters>) => edit((d) => { d.encounters = { ...d.encounters, ...patch } })
  const encountersTab = (
    <div style={{ padding: '4px 8px', display: 'flex', flexDirection: 'column', minHeight: 0, flex: '1 1 auto', overflow: 'auto' }}>
      <Heading>Encounters</Heading>
      <div className="pb-row" style={{ gap: 6, padding: '2px 270px 6px 0', borderBottom: '1px solid #c0c0c0', justifyContent: 'flex-end' }}>
        <span>Limited investigation to a date range?</span>
        <CmdCheck id="arb-encounters-limit" checked={c.limited.Encounters ?? false} onChange={(v) => edit((d) => { d.limited.Encounters = v })} />
        {c.limited.Encounters && (
          <>
            <span>Only look at data from the last</span>
            <FieldInput id="arb-lookback" value={c.lookback.n} w={32} align="center" onChange={(v) => edit((d) => { d.lookback.n = v })} />
            <FieldSelect value={c.lookback.unit} options={['Year(s)', 'Month(s)', 'Day(s)']} w={66} onChange={(v) => edit((d) => { d.lookback.unit = v })} />
          </>
        )}
      </div>
      <div style={{ fontWeight: 700, padding: '4px 0 2px' }}>Conditions</div>
      <div style={{ display: 'grid', gridTemplateColumns: '84px 1fr', rowGap: 4, alignItems: 'center', paddingBottom: 6, borderBottom: '1px solid #c0c0c0' }}>
        <span>When:</span><span><FieldSelect id="arb-encounters-when" value={e.when} options={WHEN} w={82} onChange={(v) => setE({ when: v })} /></span>
        <span style={{ alignSelf: 'start' }}>Check for:</span>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <CmdRadio id="arb-encounters-have" name="arb-enc-check" label="Have visits with following information" checked={e.check === 'have'} onChange={() => setE({ check: 'have' })} />
          <CmdRadio id="arb-encounters-not" name="arb-enc-check" label="Does not have visits with following information" checked={e.check === 'not'} onChange={() => setE({ check: 'not' })} />
        </span>
      </div>
      <div style={{ fontWeight: 700, padding: '4px 0 2px' }}>Constraint(s)</div>
      <div style={{ display: 'grid', gridTemplateColumns: '84px 1fr', rowGap: 3, alignItems: 'center', paddingBottom: 18, borderBottom: '1px solid #c0c0c0' }}>
        <span>With at least</span>
        <span className="pb-row" style={{ gap: 6 }}>
          <FieldInput id="arb-encounters-at-least" value={e.atLeast} w={42} align="center" onChange={(v) => setE({ atLeast: v })} /> visits.
          <span style={{ width: 16 }} />With no more than
          <FieldInput id="arb-encounters-no-more" value={e.noMore} w={42} align="center" onChange={(v) => setE({ noMore: v })} /> visits.
        </span>
        <span>Visit Code(s):</span>
        <span className="pb-row" style={{ gap: 6 }}>
          <span className="pb-inputgroup" style={{ width: 134 }}>
            <FieldInput id="arb-encounters-visit-codes" value={e.visitCodes} w="100%" onChange={(v) => setE({ visitCodes: v.toUpperCase() })} />
            <DotsButton h={19} id="arb-encounters-visit-codes" onClick={() => setPicking({ title: 'Visit Codes', options: ['OV - OFFICE VISIT', 'PH - PHONE', 'VV - VIRTUAL VISIT', 'HV - HOME VISIT', 'GR - GROUP'], multi: true, value: e.visitCodes, apply: (v) => setE({ visitCodes: v }) })} />
          </span>
          (comma separated list)
        </span>
        <span>Appt Status:</span>
        <span className="pb-row" style={{ gap: 6 }}>
          <span className="pb-inputgroup" style={{ width: 118 }}>
            <FieldInput id="arb-encounters-appt-status" value={e.apptStatus} w="100%" onChange={(v) => setE({ apptStatus: v.toUpperCase() })} />
            <DotsButton h={19} id="arb-encounters-appt-status" onClick={() => setPicking({ title: 'Appointment Status', options: ['A - ARRIVED', 'C - CANCELLED', 'N - NO SHOW', 'R - REBOOKED', 'S - SEEN', 'ALL'], multi: true, value: e.apptStatus, apply: (v) => setE({ apptStatus: v }) })} />
          </span>
          if BLANK - (C)ancel, (R)ebook and (N)o show will be automatically excluded.  To include these, enter ALL.
        </span>
        <span>Diagnoses:</span>
        <span className="pb-row" style={{ gap: 6 }}>
          <span className="pb-inputgroup" style={{ width: 460 }}>
            <FieldInput id="arb-encounters-diagnoses" value={e.diagnoses} w="100%" onChange={(v) => setE({ diagnoses: v.toUpperCase() })} />
            <DotsButton h={19} id="arb-encounters-diagnoses" onClick={() => setPicking({ title: 'Diagnoses', options: ['250 - DIABETES MELLITUS', '401 - HYPERTENSION', '428 - HEART FAILURE', '493 - ASTHMA', '496 - COPD', '311 - DEPRESSION'], multi: true, value: e.diagnoses, apply: (v) => setE({ diagnoses: v }) })} />
          </span>
          (comma separated list)
        </span>
        <span>Service Code(s):</span>
        <span className="pb-row" style={{ gap: 6 }}>
          <span className="pb-inputgroup" style={{ width: 460 }}>
            <FieldInput id="arb-encounters-service-codes" value={e.serviceCodes} w="100%" onChange={(v) => setE({ serviceCodes: v.toUpperCase() })} />
            <DotsButton h={19} id="arb-encounters-service-codes" onClick={() => setPicking({ title: 'Service Codes', options: ['00100 - VISIT IN OFFICE', '13050 - COMPLEX CARE MANAGEMENT', '14033 - ANNUAL CHRONIC CARE BONUS', '14076 - PATIENT CONFERENCE'], multi: true, value: e.serviceCodes, apply: (v) => setE({ serviceCodes: v }) })} />
          </span>
          (comma separated list)
        </span>
      </div>
      <div style={{ fontWeight: 700, padding: '6px 0 4px' }}>Output(s)</div>
      <div style={{ paddingLeft: 84 }}>
        <CmdCheck id="arb-encounters-visit-count" label="Visit Count" checked={e.visitCount} onChange={(v) => setE({ visitCount: v })} />
      </div>
    </div>
  )

  /* --- Patient Data (`10429fe3`) ------------------------------------------ */
  const setP = (patch: Partial<Criteria>) => edit((d) => { Object.assign(d, patch) })
  const patientData = (
    <div style={{ padding: '4px 8px', overflow: 'auto', flex: '1 1 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', columnGap: 10 }}>
        <div>
          <Heading>Patient Characteristics:</Heading>
          <div className="pb-row" style={{ gap: 6, padding: '1px 0' }}>
            <span className="pb-form__label" style={{ width: 80 }}>Patient Status:</span>
            <span className="pb-inputgroup" style={{ width: 134 }}>
              <FieldInput id="arb-status" value={c.status} onChange={(v) => setP({ status: v.toUpperCase() })} w="100%" />
              <DotsButton h={19} id="arb-status" onClick={() => setPicking({ title: 'Patient Status', options: RS_STATUS_CODES, multi: true, value: c.status, apply: (v) => setP({ status: v }) })} />
            </span>
            <span>(comma separated)</span>
          </div>
          <div className="pb-row" style={{ gap: 6, padding: '1px 0' }}>
            <span className="pb-form__label" style={{ width: 80 }}>Age Range:</span>
            <FieldInput id="arb-age-from" value={c.ageFrom} onChange={(v) => setP({ ageFrom: v })} w={46} align="right" /> to <FieldInput id="arb-age-to" value={c.ageTo} onChange={(v) => setP({ ageTo: v })} w={46} align="right" />
          </div>
          <div className="pb-row" style={{ gap: 6, padding: '1px 0' }}>
            <span className="pb-form__label" style={{ width: 80 }}>Sex:</span>
            <FieldInput id="arb-sex" value={c.sex} onChange={(v) => setP({ sex: v.toUpperCase() })} w={46} />
          </div>
        </div>
        <div>
          <Heading>Office Details:</Heading>
          {([['Provider:', 'provider', RS_PROVIDERS], ['Facility Code:', 'facility', RS_FACILITIES], ['Service Center:', 'service', RS_SERVICE_CENTERS]] as const).map(([l, k, opts]) => (
            <div key={l} className="pb-row" style={{ gap: 6, padding: '1px 0' }}>
              <span className="pb-form__label" style={{ width: 80 }}>{l}</span>
              <FieldSelect id={`arb-${k}`} value={c[k]} options={opts} w={172} onChange={(v) => setP({ [k]: v } as Partial<Criteria>)} />
            </div>
          ))}
        </div>
      </div>
      <Heading>Last Contact Date</Heading>
      <div className="pb-row" style={{ gap: 6 }}>
        <span className="pb-form__label" style={{ width: 80 }}>In the last:</span>
        <FieldInput id="arb-last-contact" value={c.lastYears} onChange={(v) => setP({ lastYears: v })} w={72} align="center" /> year(s)
      </div>
      <Heading>Additional Patient Data</Heading>
      <div style={{ display: 'grid', gridTemplateColumns: '180px 230px 90px 90px', alignItems: 'end', rowGap: 1 }}>
        <span>Field</span><span>Filter / Select<br />(empty fields will be ignored)</span>
        <span style={{ textAlign: 'center' }}>Include in<br />CSV File</span><span style={{ textAlign: 'center' }}>Column Order<br />in CSV File</span>
        {PATIENT_FIELDS.map((f) => {
          const slug = pbSlug(f)
          const v = c.fields[f] ?? { filter: '', csv: false, order: '' }
          const setF = (patch: Partial<typeof v>) => edit((d) => { d.fields[f] = { ...v, ...patch } })
          return [
            <span key={`${f}l`}>{f}</span>,
            <FieldInput key={`${f}f`} id={`arb-field-${slug}`} value={v.filter} w={224} onChange={(x) => setF({ filter: x })} />,
            <span key={`${f}c`} style={{ textAlign: 'center' }}><CmdCheck id={`arb-field-${slug}-csv`} checked={v.csv} onChange={(x) => setF({ csv: x })} /></span>,
            <span key={`${f}o`} style={{ textAlign: 'center' }}>{v.csv ? <FieldInput value={v.order} w={60} align="center" onChange={(x) => setF({ order: x })} /> : null}</span>,
          ]
        })}
      </div>
    </div>
  )

  return (
    <WorkspaceDialogFrame id="advanced-report-builder" title="Advanced Report Builder" width={994} height={770} controls={false} onClose={() => open('advanced-report-builder-list')}>
      <div style={{ border: '1px solid #808080', margin: 4, flex: 'none' }}>
        <PBBand>Medical Report</PBBand>
        <div style={{ display: 'flex', gap: 6, padding: '2px 6px 6px' }}>
          <fieldset className="pb-fieldset" style={{ margin: 0, flex: '1 1 auto' }}>
            <legend className="pb-fieldset__legend" style={{ color: '#000', fontWeight: 700 }}>Detail</legend>
            <div className="pb-fieldset__body" style={{ display: 'grid', gridTemplateColumns: '44px 1fr', rowGap: 3, alignItems: 'center' }}>
              <span>Name:</span><FieldInput id="arb-name" value={name} onChange={(v) => { setName(v.toUpperCase()); setSaved(false) }} w={456} />
              <span style={{ alignSelf: 'start' }}>Desc.:</span>
              <PBTextArea rows={2} w={456} value={desc} data-tutorial-id="host.mois.field.arb-desc" onChange={(ev) => { setDesc(ev.target.value); setSaved(false) }} />
              <span>Access:</span>
              <span className="pb-row" style={{ gap: 6 }}>
                <FieldSelect id="arb-access" value={access} options={['Private', 'Limited', 'Public']} onChange={(v) => { setAccess(v); setSaved(false) }} w={80} />
                <span style={{ color: '#6d6d6d', width: 130 }}>{owner}</span>
                <span style={{ marginLeft: 'auto' }}>Group:</span>
                <FieldInput id="arb-group" value={group} onChange={(v) => { setGroup(v); setSaved(false) }} w={144} />
              </span>
            </div>
          </fieldset>
          <fieldset className="pb-fieldset" style={{ margin: 0, width: 250, flex: 'none' }}>
            <legend className="pb-fieldset__legend" style={{ color: '#000', fontWeight: 700 }}>Actions</legend>
            <div className="pb-fieldset__body" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <DialogButton id="arb-save" width={90} onClick={save}>Save Changes</DialogButton>
              <span style={{ color: '#6d6d6d' }}>Other</span>
              <span className="pb-row" style={{ gap: 8 }}>
                <FieldSelect id="arb-other" value={other} options={['Other options...', 'Change History Review', 'Run History Review']} onChange={setOther} w={164} />
                <DialogButton id="arb-go" width={62} onClick={go}>Go</DialogButton>
              </span>
            </div>
          </fieldset>
          <fieldset className="pb-fieldset" style={{ margin: 0, width: 190, flex: 'none' }}>
            <legend className="pb-fieldset__legend" style={{ color: '#000', fontWeight: 700 }}>Output</legend>
            <div className="pb-fieldset__body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 8px' }}>
              <DialogButton id="arb-report" width={76} onClick={reportOutput}>Report</DialogButton>
              <DialogButton id="arb-csv" width={76} onClick={csvOutput}>CSV</DialogButton>
              <DialogButton id="arb-extended" width={76} onClick={() => setExtended(true)}>Extended</DialogButton>
              <DialogButton id="arb-mail-merge" width={76} onClick={mailMerge}>Mail Merge</DialogButton>
            </div>
          </fieldset>
        </div>
      </div>
      <div style={{ padding: '4px 4px 0', flex: 'none' }}>
        <div style={{ display: 'flex' }}>{far.map(tabButton)}</div>
        <div style={{ display: 'flex' }}>{near.map(tabButton)}</div>
      </div>
      <div
        data-tutorial-id="host.mois.field.arb-tab-page"
        style={{ flex: '1 1 auto', minHeight: 0, margin: '0 4px 4px', border: '1px solid #a0a0a0', borderTop: 0, background: 'var(--pb-face)', display: 'flex', flexDirection: 'column' }}
      >
        {tab === 'Patient Data' ? patientData : tab === 'Encounters' ? encountersTab : gridTab(tab)}
      </div>

      {message && (
        <PBMessageBox title={message.title} icon={message.icon} buttons={[{ label: 'OK', value: 'ok', default: true, command: 'arb-message-ok' }]} onClose={() => setMessage(null)}>
          {message.text}
        </PBMessageBox>
      )}
      {picking && (
        <ReportPicker
          pick={{ title: picking.title, options: picking.options, multi: picking.multi }}
          value={picking.value}
          onCancel={() => setPicking(null)}
          onOk={(v) => { picking.apply(v); setPicking(null) }}
        />
      )}
      {history && <HistoryWindow kind={history} report={original || reportName.toUpperCase()} onClose={() => setHistory(null)} />}
      {extended && (
        <ExtendedOutputWindow
          report={reportName}
          patients={matched()}
          onCancel={() => setExtended(false)}
          onGenerate={(head, rows) => { run('Extended', rows.length); setExtended(false); open('report-excel', { title: `${reportName} - Extended`, head, rows }) }}
        />
      )}
    </WorkspaceDialogFrame>
  )
}

function fieldOf(p: Patient, f: string): string {
  switch (f) {
    case 'Address 1': return p.address ?? ''
    case 'Address 2': return p.address2 ?? ''
    case 'City': return p.city ?? ''
    case 'Province': return p.province ?? ''
    case 'Country': return p.country ?? ''
    case 'Postal Code': return p.postal ?? ''
    case 'Home Phone': return p.home ?? ''
    case 'Work Phone': return p.work ?? ''
    case 'Cell Phone': return p.cell ?? ''
    case 'Other Phone': return p.pager ?? ''
    case 'Fax': return p.fax ?? ''
    case 'Home Email': return p.emailHome ?? ''
    case 'Work Email': return p.emailWork ?? ''
    default: return ''
  }
}

/* ===========================================================================
   Change History / Run History — read-only (INFERRED layout)
   ======================================================================== */
function HistoryWindow({ kind, report, onClose }: { kind: 'change' | 'run'; report: string; onClose: () => void }) {
  const changes = builderChangeHistory(report)
  const runs = builderRunHistory(report)
  const [cur, setCur] = useState(0)
  const title = kind === 'change' ? 'Change History Review' : 'Run History Review'
  return (
    <WorkspaceDialogFrame id={`arb-${kind}-history`} title={title} width={720} height={460} controls={false} onClose={onClose} zIndex={90}>
      <PBBand>{`${kind === 'change' ? 'Change History' : 'Run History'} - ${report}`}</PBBand>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 4 }}>
        {kind === 'change' ? (
          <PBDataWindow
            rows={changes}
            current={cur}
            onCurrentChange={setCur}
            rowTutorialId={(_r, i) => `host.mois.row.arb-change-${i + 1}`}
            columns={[
              { key: 'when', header: 'Date / Time', width: 120 },
              { key: 'user', header: 'User', width: 170 },
              { key: 'change', header: 'Change' },
            ]}
            empty="No changes have been recorded for this report."
          />
        ) : (
          <PBDataWindow
            rows={runs.map((r) => ({ ...r, patients: String(r.patients) }))}
            current={cur}
            onCurrentChange={setCur}
            rowTutorialId={(_r, i) => `host.mois.row.arb-run-${i + 1}`}
            columns={[
              { key: 'when', header: 'Date / Time', width: 120 },
              { key: 'user', header: 'Run By', width: 190 },
              { key: 'output', header: 'Output', width: 110 },
              { key: 'patients', header: 'Patients', width: 80, align: 'right' },
            ]}
            empty="This report has not been run."
          />
        )}
      </div>
      {kind === 'change' && (
        <div style={{ flex: 'none', padding: '0 4px 4px' }}>
          <PBTextArea rows={5} w="100%" readOnly value={changes[cur]?.detail ?? ''} data-tutorial-id="host.mois.field.arb-change-detail" />
        </div>
      )}
      <DialogFooter plain padding="4px 0 10px">
        <DialogButton id="arb-history-close" width={75} isDefault onClick={onClose}>Close</DialogButton>
      </DialogFooter>
    </WorkspaceDialogFrame>
  )
}

/* ===========================================================================
   Extended Output (INFERRED from 304055 "Extended Output": the panel comes
   from the report's criteria; this window only chooses the facts gathered
   for it into a CSV file — last done, and next due by guideline)
   ======================================================================== */
const EXTENDED_ITEMS = [
  { item: 'Blood Pressure', every: 12 }, { item: 'BMI / Weight', every: 12 }, { item: 'HbA1c', every: 6 },
  { item: 'LDL Cholesterol', every: 12 }, { item: 'eGFR / Creatinine', every: 12 }, { item: 'Urine ACR', every: 12 },
  { item: 'Foot Exam', every: 12 }, { item: 'Eye Exam', every: 24 }, { item: 'Influenza Vaccine', every: 12 },
  { item: 'Pneumococcal Vaccine', every: 0 }, { item: 'Cervical Screening (PAP / HPV)', every: 36 },
  { item: 'Screening Mammogram', every: 24 }, { item: 'Colorectal Screening (FIT)', every: 24 }, { item: 'Smoking Status', every: 12 },
]

function ExtendedOutputWindow({ report, patients: panel, onCancel, onGenerate }: {
  report: string; patients: Patient[]; onCancel: () => void; onGenerate: (head: string[], rows: string[][]) => void
}) {
  const picked = useTickSet<string>()
  const [due, setDue] = useState(true)
  const [cur, setCur] = useState(0)
  useScreenReport({ extendedItems: [...picked.ticked].map(pbSlug).join(',') })
  const generate = () => {
    const items = EXTENDED_ITEMS.filter((x) => picked.has(x.item))
    const head = ['CHART', 'LAST NAME', 'FIRST NAME', 'DOB', 'SEX', ...items.flatMap((x) => [`${x.item.toUpperCase()} LAST DONE`, ...(due ? [`${x.item.toUpperCase()} NEXT DUE`] : [])])]
    const rows = panel.map((p, i) => [p.chart, p.last, p.first, p.dob, p.gender, ...items.flatMap((x, j) => {
      const months = (i * 5 + j * 7) % 30
      const done = months > 26 ? '' : shiftMonths(MOIS_TODAY, -months)
      const next = !x.every ? (done ? 'COMPLETE' : 'DUE NOW') : done ? shiftMonths(done, x.every) : 'DUE NOW'
      return [done, ...(due ? [next] : [])]
    })])
    onGenerate(head, rows)
  }
  return (
    <WorkspaceDialogFrame id="arb-extended-output" title="Extended Output" width={620} height={560} controls={false} onClose={onCancel} zIndex={90}>
      <PBBand>{`Extended Output - ${report.toUpperCase()}`}</PBBand>
      <div style={{ padding: '6px 10px', flex: 'none' }}>
        The patients are the ones the report&apos;s tabs identify ({panel.length}). Choose the facts to gather for each of them into the CSV file.
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '0 6px' }}>
        <PBDataWindow
          rows={EXTENDED_ITEMS.map((x) => ({ ...x, every: x.every ? `every ${x.every} months` : 'once' }))}
          current={cur}
          onCurrentChange={setCur}
          rowTutorialId={(r) => `host.mois.row.arb-extended-${pbSlug(r.item)}`}
          columns={[
            {
              key: 'pick', header: 'Include', width: 60, align: 'center',
              render: (r) => (
                <CmdCheck id={`arb-extended-${pbSlug(r.item)}`} checked={picked.has(r.item)}
                  onChange={(v) => picked.set(r.item, v)} />
              ),
            },
            { key: 'item', header: 'Data Element', width: 280 },
            { key: 'every', header: 'Guideline' },
          ]}
        />
      </div>
      <div style={{ padding: '6px 10px', flex: 'none' }}>
        <CmdCheck id="arb-extended-next-due" label="Include the next due date recommended by the guideline" checked={due} onChange={setDue} />
      </div>
      <DialogFooter plain gap={19} padding="4px 0 10px">
        <DialogButton id="arb-extended-generate" width={110} isDefault onClick={generate} disabled={!picked.size}>Generate CSV</DialogButton>
        <DialogButton id="arb-extended-cancel" width={75} onClick={onCancel}>Cancel</DialogButton>
      </DialogFooter>
    </WorkspaceDialogFrame>
  )
}

function shiftMonths(date: string, months: number): string {
  const [y, m, d] = date.split('.').map(Number)
  const total = y! * 12 + (m! - 1) + months
  return `${Math.floor(total / 12)}.${String((total % 12) + 1).padStart(2, '0')}.${String(Math.min(d!, 28)).padStart(2, '0')}`
}

registerAreaWindow('advanced-report-builder-list', BuilderListWindow)
registerAreaWindow('advanced-report-builder', BuilderEditorWindow)
