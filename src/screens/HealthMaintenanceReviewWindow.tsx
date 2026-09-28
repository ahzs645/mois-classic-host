import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useChartExport } from '../data/chart-records'
import { date } from '../data/charts/relations'
import type { MoisRecord } from '../data/charts/types'
import { SESSION_USER } from '../data/chartSession'
import { usePatient } from '../data/patient-context'
import { MOIS_TODAY } from '../data/patients'
import { CLINIC } from '../data/printPages'
import { useScreenReport } from '../host/screen-state'
import { PBBand, PBButton, PBCheckbox, PBTabs, PBWindow, pbSlug, usePBInstrumentation } from '../pb'
import { useOpenWindow } from './areaWindowRegistry'
import './health-maintenance-review.css'

/* ============================================================================
   Health Maintenance Review — Utilities ▸ Health Maintenance Review (Ctrl+H),
   Patient Chart module only.

   PROVENANCE
   - art. 304722 "Health Maintenance Review":
     · `8117c454c1d2…` — the whole window, "Health Maintenance Review : As Of
       2018.08.30 [read only]", 827 × 750 with frame: identity block
       (Patient / Alias, DoB / Gender, Insurance / Chart), Flow Sheet + Print
       over Tear Off + Clipboard (the pair disabled on this tab), the three
       tabs Health Maintenance | Care Plan | Patient Summary, and the
       monospace report ("Age = 66    SEX = FEMALE", black headings, blue
       found lines, red "Not Found" lines, grey "[ lo to hi ]" ranges).
     · `bc77da00d767…` — the newest header (2022.07.18): the insurance cell
       is captioned "BC Health No.:" and the four buttons carry underlined
       accelerators (F, P, T, C). This header is the one reproduced.
     · `4d87f0366efd…`, `82ded285a446…`, `133dbc7f47d9…`, `adb0d27e23bd…` —
       report excerpts: dark red bold abnormal values with their flag
       (`8.0 H`, `0.36 L`, `4.15 A`), navy bold normal ones, "GOAL: <= 3.5"
       after the range, "[ N/A ]" for a measure with no range, and the
       Not Desired sub-line under HIV Screening.
     · Text: Ctrl+1/2/3 switch tabs; Tear Off and Clipboard are "Only
       available in the 'Care Plan' or 'Patient Summary' tabs"; "If there is
       no record for that item, it will display the [record description] and
       'Not Found'"; HIV Screening shows blue even when not done.
   - art. 303225 `5be0ba8b665d…` — the older (2012) window, with Flow Sheet
     ringed "on the top right hand corner of the screen".
   - art. 303111 — the smoking concept is PACKS/DAY (34494) and CANS/DAY
     (61868); whichever was recorded most recently is the one shown. Its
     images `eeaa242cf4b9…` / `2a5a69710ee5…` show the same review for a
     35-year-old: "SMOKING STATUS Not Found" before, and "CIGARETTES
     SMOKED.CURRENT (PACK/DAY - 2016.06.02 - 2 H  [ 0 to 0.01 ]" after, plus
     the "SMOKER For 17 Year(s)" / "EX-SMOKER For 2 Year(s)" line MOIS derives
     from a TOBACCO DEPENDENCE (3051) condition.

   Gaps, deliberately: the review is driven by the clinic's Concept Mapping,
   which the manual does not print whole. The GENERAL items and their order
   are the union of the 35F and 66F captures; the age/sex gates that decide
   which of them a chart gets are inferred from which capture shows them and
   are marked below. Only measures are looked up — vaccines, imaging,
   procedures and consults print "Not Found". The STI/BBP and INCENTIVE CLAIM
   sections are omitted (their preconditions are undocumented), as are
   Care Plan goals on the report lines. The Care Plan and Patient Summary
   tabs are never shown open in the manual; what they list here is a plain
   reading of their names, not a transcription.

   The four buttons (art. 304722's definitions table):
   · Flow Sheet — opens the Flow Sheet parameters (303225).
   · Print — the review, the tab on screen, in the Print Preview window
     (screens/PrintPreviewWindow.tsx), which takes this window's place.
   · Tear Off — "Will open the tab/information in a new MOIS viewer window.
     Only available in the 'Care Plan' or 'Patient Summary' tabs": a
     separate, non-modal text window over this one, closed on its own.
   · Clipboard — "Creates a copy of the information that is within the
     chosen tab, with the option to add Clinic or Provider details (in
     addition to the patient details) at the top": a small options window,
     then the text goes to the system clipboard. The stage names what was
     copied under the buttons, as Print Preview names what was printed.
   INFERRED: neither the torn-off window nor the Clipboard options window is
   captured — their titles, the two tick boxes' wording and the layout are
   read off the definitions. A resolved condition's section states its
   resolve date ("If resolve date - State it", the concept table) as
   "RESOLVED as of <date>" — that wording is inferred too.

   Anchors: each item line is `host.mois.row.hmr-<item>`, each heading
   `host.mois.group.hmr-<heading>`, the first red and first blue line also
   `host.mois.field.hmr-first-missing` / `hmr-first-found` (the colour key a
   lesson points at); tabs are `host.mois.tab.health-maintenance`,
   `care-plan`, `patient-summary`.
   ========================================================================= */

/** description column width: "CIGARETTES SMOKED.CURRENT (PACK/DAY" is where MOIS cuts */
const DESC_W = 35
/** the value is padded so the ranges line up (col 61 in `8117c454`) */
const VALUE_W = 9

type Item = {
  /** what prints before "Not Found" */
  name: string
  codes?: string[]
  match?: RegExp
  /** false = not a measure; the review has no source for it here */
  measure?: boolean
  sex?: 'F' | 'M'
  minAge?: number
  maxAge?: number
  /** HIV Screening stays blue when it is missing */
  blueWhenMissing?: boolean
}

const other = (name: string, gate: Partial<Item> = {}): Item => ({ name, measure: false, ...gate })

/* GENERAL AND AGE/SEX SPECIFIC SCREENING, in the captures' order. Gates
   marked "inferred" are read off which capture (35F / 66F) has the item. */
const GENERAL: Item[] = [
  other('SCREENING MAMMOGRAPHY', { sex: 'F', minAge: 50, maxAge: 74 }), // inferred
  { name: 'PAPANICOLAU SMEAR', codes: ['1917'], match: /PAPANICOL/, sex: 'F', minAge: 21, maxAge: 69 },
  { name: 'FRAX WHO FRACTURE RISK ASSESSMENT T', match: /FRAX/, minAge: 65 }, // inferred
  other('PNEUMOCOCCAL VACCINE', { minAge: 65 }), // inferred
  other('INFLUENZA VACCINE', { minAge: 65 }), // inferred
  other('ADVANCE DIRECTIVE DOCUMENTED', { minAge: 65 }), // inferred
  { name: 'GLUCOSE (FASTING)', match: /GLUCOSE \(FASTING\)|GLUCOSE FASTING/, minAge: 40 }, // inferred
  { name: 'OCCULT BLD STL QL IMM', match: /OCCULT BLD/, minAge: 50, maxAge: 74 }, // inferred
  { name: 'PHYSICAL ACTIVITY', codes: ['39959'] },
  { name: 'ALCOHOL INTAKE', codes: ['39957', '3553'], match: /^ALCOHOL/ },
  /* art. 303111: the smoking concept, most recent of the two codes */
  { name: 'SMOKING STATUS', codes: ['34494', '61868'] },
  { name: 'WEIGHT', codes: ['22732'], minAge: 65 }, // inferred
  { name: 'WAIST CIRCUMFERENCE', codes: ['1984'] },
  { name: 'BMI', codes: ['951'] },
  other('TETANUS VACCINE'),
  { name: 'BP', codes: ['1950'] },
  { name: 'CARDIAC RISK FRAMINGHAM', match: /FRAMINGHAM/, minAge: 40 }, // inferred
]

const HIV: Item = { name: 'HIV Screening', match: /^HIV/, blueWhenMissing: true }

const LIPIDS: Item[] = [
  { name: 'CHOLESTEROL - LDL', match: /CHOLESTEROL - LDL/ },
  { name: 'CHOLESTEROL - HDL', match: /CHOLESTEROL - HDL/ },
  { name: 'CHOLEST SERPL-SCNC', match: /CHOLEST SERPL-SCNC/ },
  { name: 'CHOL/HDL RATIO', match: /CHOL.*HDL.*RATIO|CHOLEST\/HDLC/ },
  { name: 'TRIGLYCERIDES', match: /TRIGLYCERIDE/ },
]

/* Condition sections: heading is the chart's own problem name. The COPD list
   is the art. 304722 concept table; HYPERTENSION is `8117c454`; DIABETES is
   `5be0ba8b` + `82ded285`; CHF shows only CREATININE before the capture
   cuts it. */
const CONDITIONS: { when: RegExp; items: Item[] }[] = [
  {
    when: /DIABETES/,
    items: [
      ...LIPIDS,
      { name: 'URINE MICROALB/CREAT RATIO', match: /MICROALB\/CREAT/ },
      { name: 'GFR SERPL-VRATE', codes: ['27540'], match: /\bGFR\b/ },
      { name: 'HEMOGLOBIN A1C', codes: ['HBA1C', '128'], match: /HEMOGLOBIN A1C/ },
      { name: 'GLUCOSE (FASTING)', match: /GLUCOSE \(FASTING\)|GLUCOSE FASTING/ },
      { name: 'BLOOD PRESSURE (SYSTOLIC/DIASTOLIC)', codes: ['1950'] },
      other('PNEUMOCOCCAL VACCINE'),
      other('INFLUENZA VACCINE'),
    ],
  },
  {
    when: /HYPERTENSION/,
    items: [
      { name: 'CREATININE', match: /^CREATININE\b/ },
      { name: 'GLUCOSE (FASTING)', match: /GLUCOSE \(FASTING\)|GLUCOSE FASTING/ },
      { name: 'GFR SERPL-VRATE', codes: ['27540'], match: /\bGFR\b/ },
      { name: 'BLOOD PRESSURE (SYSTOLIC/DIASTOLIC)', codes: ['1950'] },
      other('ECG'),
      ...LIPIDS,
      { name: 'URINE MICROALB/CREAT RATIO', match: /MICROALB\/CREAT/ },
      { name: 'CIGARETTES SMOKED.CURRENT (PACK/DAY)', codes: ['34494', '61868'] },
    ],
  },
  {
    when: /COPD|C\.O\.P\.D\.|CHRONIC OBSTRUC/,
    items: [
      { name: 'SPIROMETRY', match: /^SPIROMETRY/ },
      { name: 'FEV1 % PREDICTED POST BRONCHODILATO', match: /FEV1 % PREDICTED POST/ },
      { name: 'FEV1/FVC POST BRONCHODILATOR', match: /FEV1\/FVC POST/ },
      { name: 'WEIGHT', codes: ['22732'] },
      { name: 'HEIGHT', codes: ['1948'] },
      { name: 'CIGARETTES SMOKED.CURRENT (PACK/DAY)', codes: ['34494', '61868'] },
      { name: 'PHYSICAL ACTIVITY MINUTES PER WEEK', codes: ['39959'] },
      other('PNEUMOCOCCAL VACCINE'),
      other('INFLUENZA VACCINE'),
    ],
  },
  {
    when: /HEART FAILURE/,
    items: [{ name: 'CREATININE', match: /^CREATININE\b/ }],
  },
]

/** whole years between a `YYYY.MM.DD` birth date and today */
function years(dob: string, today = MOIS_TODAY): number | undefined {
  const [by, bm, bd] = dob.split('.').map(Number)
  const [ty, tm, td] = today.split('.').map(Number)
  if (!by || !ty) return undefined
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0)
}

function applies(item: Item, sex: string, age?: number) {
  if (item.sex && item.sex !== sex) return false
  if (age === undefined) return !item.minAge && !item.maxAge
  if (item.minAge !== undefined && age < item.minAge) return false
  if (item.maxAge !== undefined && age > item.maxAge) return false
  return true
}

/** "Items in the HM report will be processed in sequence (the most recent appears on the HM review)" */
function mostRecent(item: Item, measures: MoisRecord[]): MoisRecord | undefined {
  if (item.measure === false) return undefined
  return measures
    .filter((r) => (r.str_value ?? '') !== '')
    .filter((r) => item.codes?.includes(r.str_code ?? '') || (!!item.match && item.match.test((r.str_description ?? '').toUpperCase())))
    .sort((a, b) => String(b.dtm_collect_date ?? '').localeCompare(String(a.dtm_collect_date ?? '')))[0]
}

function range(r: MoisRecord) {
  const lo = r.str_normal_lower ?? ''
  const hi = r.str_normal_high ?? ''
  return lo || hi ? `[ ${lo} to ${hi} ]` : '[ N/A ]'
}

/** `section:item` of the first red and the first blue line, which carry the
    colour-key anchors; every other line is anchored by its item */
type Marks = { missing?: string; found?: string }
const anchorOf = (marks: Marks | undefined, kind: keyof Marks, at: string | undefined, item: string) =>
  (marks && at && marks[kind] === at ? `host.mois.field.hmr-first-${kind}` : `host.mois.row.hmr-${pbSlug(item)}`)

function ItemLine({ item, measures, marks, at }: { item: Item; measures: MoisRecord[]; marks?: Marks; at?: string }) {
  const r = mostRecent(item, measures)
  if (!r) {
    const kind = item.blueWhenMissing ? 'found' : 'missing'
    return <div className={`pb-hmr__${kind}`} data-hm-state={kind} data-tutorial-id={anchorOf(marks, kind, at, item.name)}>{item.name} Not Found</div>
  }
  const desc = (r.str_description ?? item.name).toUpperCase().slice(0, DESC_W).padEnd(DESC_W)
  const flag = r.str_abnormal ?? ''
  const value = [r.str_value, flag].filter(Boolean).join(' ')
  return (
    <div className="pb-hmr__found" data-hm-state="found" data-tutorial-id={anchorOf(marks, 'found', at, item.name)}>
      {`${desc} - ${date(r.dtm_collect_date)} - `}
      <b className={flag ? 'pb-hmr__abnormal' : 'pb-hmr__normal'}>{value}</b>
      {' '.repeat(Math.max(1, VALUE_W - value.length + 1))}
      <span className="pb-hmr__range">{range(r)}</span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="pb-hmr__section">
      <div className="pb-hmr__heading" data-tutorial-id={`host.mois.group.hmr-${pbSlug(title)}`}>{title}</div>
      {children}
    </div>
  )
}

const HMR_TAB_KEYS: Record<string, string | undefined> = { 1: 'Health Maintenance', 2: 'Care Plan', 3: 'Patient Summary' }

export function HealthMaintenanceReviewWindow({ onFlowSheet, onClose }: {
  onFlowSheet: () => void
  onClose: () => void
}) {
  const patient = usePatient()
  const data = useChartExport()
  const [tab, setTab] = useState('Health Maintenance')
  const measures = useMemo(() => data?.measure ?? [], [data])
  const age = years(patient.dob)
  const sex = patient.sex
  const sexWord = sex === 'F' ? 'FEMALE' : sex === 'M' ? 'MALE' : 'UNKNOWN'

  /* Ctrl+1 / Ctrl+2 / Ctrl+3 (art. 304722) */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey) return
      const t = HMR_TAB_KEYS[e.key]
      if (t) { e.preventDefault(); setTab(t) }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const issues = data?.health_issue ?? []
  /* SMOKER / EX-SMOKER For n Year(s), from a TOBACCO DEPENDENCE condition */
  const tobacco = issues.find((r) => r.str_icd === '3051' || /TOBACCO DEPENDENCE/.test((r.str_problem_name ?? '').toUpperCase()))
  const smokerLine = (() => {
    if (!tobacco?.dtm_start) return null
    const start = date(tobacco.dtm_start)
    const end = tobacco.dtm_end ? date(tobacco.dtm_end) : ''
    const n = end ? years(end) : years(start)
    return end ? `EX-SMOKER For ${n ?? 0} Year(s)` : `SMOKER For ${n ?? 0} Year(s)`
  })()
  const hivDeclined = (data?.chart_preference ?? []).find((r) =>
    /HIV SCREENING/.test((r.str_description ?? r.str_preference ?? '').toUpperCase())
    && /NOT DESIRED/.test((r.str_instruction_code ?? '').toUpperCase()))

  /* "If resolve date - State it / Else - <the items>" (the concept table):
     an open issue lists its items, a resolved one only its resolve date */
  const conditions = CONDITIONS.flatMap((c) => {
    const hits = issues.filter((r) => c.when.test((r.str_problem_name ?? '').toUpperCase()))
    const hit = hits.find((r) => !r.dtm_end) ?? hits[0]
    return hit ? [{ title: (hit.str_problem_name ?? '').toUpperCase(), items: c.items, resolved: hit.dtm_end ? date(hit.dtm_end) : '' }] : []
  })

  const careTab = tab !== 'Health Maintenance'
  const general = GENERAL.filter((it) => applies(it, sex, age))
  const marks: Marks = (() => {
    const seq: [string, Item][] = [
      ...general.map((it): [string, Item] => [`general:${it.name}`, it]),
      [`general:${HIV.name}`, HIV],
      ...conditions.filter((c) => !c.resolved).flatMap((c) => c.items.map((it): [string, Item] => [`${c.title}:${it.name}`, it])),
    ]
    const found = (it: Item) => !!mostRecent(it, measures) || !!it.blueWhenMissing
    return { missing: seq.find(([, it]) => !found(it))?.[0], found: seq.find(([, it]) => found(it))?.[0] }
  })()

  const host = usePBInstrumentation()
  const openWindow = useOpenWindow()
  const report = useRef<HTMLDivElement>(null)
  const [tornOff, setTornOff] = useState<{ tab: string; lines: string[] } | null>(null)
  const [clipOpen, setClipOpen] = useState(false)
  const [copied, setCopied] = useState('')
  useScreenReport({
    ...(tornOff ? { dialog: 'hmr-tear-off' } : clipOpen ? { dialog: 'hmr-clipboard' } : {}),
    ...(copied ? { copied: pbSlug(copied) } : {}),
  })

  /** the tab on screen as plain text, one entry per report line */
  const reportLines = () => Array.from(report.current?.querySelectorAll<HTMLElement>('.pb-hmr__age, .pb-hmr__heading, .pb-hmr__found, .pb-hmr__missing') ?? [])
    .map((el) => (el.classList.contains('pb-hmr__heading') ? `\n${el.textContent ?? ''}` : el.textContent ?? ''))
  const identity = [
    `Patient: ${`${patient.first} ${patient.last}`.toUpperCase()}    DoB: ${patient.dob}    Gender: ${patient.sex}`,
    `BC Health No.: ${patient.bchn ?? ''}    Chart: ${patient.chart}`,
  ]
  const press = (id: string, run: () => void) => () => { host?.report('command', { command: id }); run() }

  const print = press('hmr-print', () => {
    openWindow('print-preview', {
      title: `Health Maintenance Review - ${tab}`,
      pages: [[`**Health Maintenance Review : As Of ${MOIS_TODAY}**`, ...identity, '', ...reportLines()].join('\n')],
    })
  })
  const tearOff = press('hmr-tear-off', () => setTornOff({ tab, lines: reportLines() }))
  const copy = (clinic: boolean, provider: boolean) => {
    const text = [
      ...(clinic ? [CLINIC] : []),
      ...(provider ? [`Provider: ${patient.provider ?? SESSION_USER}`] : []),
      ...identity, '', `${tab} : As Of ${MOIS_TODAY}`, ...reportLines(),
    ].join('\n')
    try { void navigator.clipboard?.writeText(text).catch(() => { /* no clipboard permission */ }) } catch { /* no clipboard on this page */ }
    setCopied(tab)
    setClipOpen(false)
  }

  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ position: 'fixed', padding: 8, zIndex: 96 }}>
      <PBWindow
        child
        controls={false}
        tutorialId="host.mois.dialog.health-maintenance-review"
        title={`Health Maintenance Review : As Of ${MOIS_TODAY} [read only]`}
        onClose={onClose}
        className="pb-hmr"
        style={{ width: 'min(827px, 100%)', height: 'min(750px, 100%)' }}
      >
        <div className="pb-hmr__head">
          <div className="pb-hmr__ident">
            <span className="pb-hmr__lbl">Patient:</span><b>{`${patient.first} ${patient.last}`.toUpperCase()}</b>
            <span className="pb-hmr__lbl">DoB:</span><b>{patient.dob}</b>
            <span className="pb-hmr__lbl">BC Health No.:</span><b>{patient.bchn ?? ''}</b>
            <span className="pb-hmr__lbl">Alias:</span><b>{(patient.alias ?? '').toUpperCase()}</b>
            <span className="pb-hmr__lbl">Gender:</span><b>{patient.sex}</b>
            <span className="pb-hmr__lbl">Chart:</span><b>{patient.chart}</b>
          </div>
          <div className="pb-hmr__buttons">
            <PBButton data-tutorial-id="host.mois.command.hmr-flow-sheet" onClick={press('hmr-flow-sheet', onFlowSheet)}><u>F</u>low Sheet</PBButton>
            <PBButton data-tutorial-id="host.mois.command.hmr-print" onClick={print}><u>P</u>rint</PBButton>
            <PBButton disabled={!careTab} data-tutorial-id="host.mois.command.hmr-tear-off" onClick={tearOff}><u>T</u>ear Off</PBButton>
            <PBButton disabled={!careTab} data-tutorial-id="host.mois.command.hmr-clipboard" onClick={press('hmr-clipboard', () => setClipOpen(true))}><u>C</u>lipboard</PBButton>
            {copied && (
              <span className="pb-hmr__note" data-tutorial-id="host.mois.field.hmr-copied">{`${copied} copied to the clipboard`}</span>
            )}
          </div>
        </div>

        <div className="pb-hmr__tabs">
          <PBTabs tabs={['Health Maintenance', 'Care Plan', 'Patient Summary']} active={tab} onChange={setTab}>
            <div className="pb-hmr__report" ref={report}>
              {tab === 'Health Maintenance' && (
                <>
                  <div className="pb-hmr__age">{`Age = ${age ?? ''}    SEX = ${sexWord}`}</div>
                  <Section title="GENERAL AND AGE/SEX SPECIFIC SCREENING">
                    {general.map((it) => <ItemLine key={it.name} item={it} measures={measures} marks={marks} at={`general:${it.name}`} />)}
                    {smokerLine && <div className="pb-hmr__found">{smokerLine}</div>}
                    <ItemLine item={HIV} measures={measures} marks={marks} at={`general:${HIV.name}`} />
                    {hivDeclined && (
                      <div className="pb-hmr__found">{` NOT DESIRED FURTHER MEASURE as of ${date(hivDeclined.dtm_start)}`}</div>
                    )}
                  </Section>
                  {conditions.map((c) => (
                    <Section key={c.title} title={c.title}>
                      {c.resolved
                        ? <div className="pb-hmr__found" data-tutorial-id={`host.mois.row.hmr-${pbSlug(c.title)}-resolved`}>{`RESOLVED as of ${c.resolved}`}</div>
                        : c.items.map((it) => <ItemLine key={it.name} item={it} measures={measures} marks={marks} at={`${c.title}:${it.name}`} />)}
                    </Section>
                  ))}
                </>
              )}
              {tab === 'Care Plan' && (
                <>
                  <Section title="GOALS">
                    {(data?.goal ?? []).map((g, i) => (
                      <div key={i} className="pb-hmr__found">{`${(g.str_goal ?? '').toUpperCase().padEnd(DESC_W)} - ${date(g.dtm_start)}${g.dtm_end ? ` to ${date(g.dtm_end)}` : ''}`}</div>
                    ))}
                  </Section>
                  <Section title="PREFERENCES">
                    {(data?.chart_preference ?? []).map((p, i) => (
                      <div key={i} className="pb-hmr__found">{`${(p.str_description ?? p.str_preference ?? '').toUpperCase().slice(0, DESC_W).padEnd(DESC_W)} - ${date(p.dtm_start)}${p.str_instruction_code ? ` - ${p.str_instruction_code}` : ''}`}</div>
                    ))}
                  </Section>
                </>
              )}
              {tab === 'Patient Summary' && (
                <>
                  <Section title="HEALTH ISSUES">
                    {issues.map((r, i) => (
                      <div key={i} className="pb-hmr__found">{`${(r.str_problem_name ?? '').toUpperCase().slice(0, DESC_W).padEnd(DESC_W)} - ${date(r.dtm_start)}`}</div>
                    ))}
                  </Section>
                  <Section title="ALLERGIES">
                    {(data?.allergy ?? []).map((r, i) => (
                      <div key={i} className="pb-hmr__found">{`${(r.str_substance ?? '').toUpperCase().padEnd(DESC_W)} - ${r.str_reactions ?? r.str_reaction ?? ''}`}</div>
                    ))}
                  </Section>
                  <Section title="MEDICATIONS">
                    {(data?.prescription ?? []).filter((r) => r.str_void !== 'Y').map((r, i) => (
                      <div key={i} className="pb-hmr__found">{`${(r.str_medication ?? '').toUpperCase().slice(0, DESC_W).padEnd(DESC_W)} - ${date(r.dtm_order)} - ${r.str_dose_freq ?? ''}`}</div>
                    ))}
                  </Section>
                </>
              )}
            </div>
          </PBTabs>
        </div>
      </PBWindow>
      {tornOff && <TearOffWindow tab={tornOff.tab} lines={tornOff.lines} identity={identity} onClose={() => setTornOff(null)} />}
      {clipOpen && <ClipboardWindow tab={tab} onCopy={copy} onClose={() => setClipOpen(false)} />}
    </div>
  )
}

/* Tear Off (INFERRED layout): the tab's text in its own window, left open
   beside the review — offset so both title bars show. */
function TearOffWindow({ tab, lines, identity, onClose }: { tab: string; lines: string[]; identity: string[]; onClose: () => void }) {
  const host = usePBInstrumentation()
  return (
    <PBWindow child controls title={`MOIS Viewer - ${tab}`} onClose={onClose} tutorialId="host.mois.dialog.hmr-tear-off"
      className="pb-hmr pb-hmr__tearoff">
      <div className="pb-hmr__report" style={{ margin: 6 }} data-tutorial-id="host.mois.field.hmr-tear-off-text">
        {[...identity, '', `${tab.toUpperCase()} : As Of ${MOIS_TODAY}`, ...lines].join('\n')}
      </div>
      <div className="pb-footer">
        <span className="pb-footer__spacer" />
        <PBButton wide data-tutorial-id={host?.anchor('command', 'hmr-tear-off-close')}
          onClick={() => { host?.report('command', { command: 'hmr-tear-off-close' }); onClose() }}>Close</PBButton>
        <span className="pb-footer__spacer" />
      </div>
    </PBWindow>
  )
}

/* Clipboard (INFERRED layout): patient details always, clinic and provider
   details on request, then OK copies the tab. */
function ClipboardWindow({ tab, onCopy, onClose }: { tab: string; onCopy: (clinic: boolean, provider: boolean) => void; onClose: () => void }) {
  const host = usePBInstrumentation()
  const [clinic, setClinic] = useState(false)
  const [provider, setProvider] = useState(false)
  const button = (id: string, label: string, run: () => void, primary = false) => (
    <PBButton wide className={primary ? 'pb-btn--default' : undefined} data-tutorial-id={host?.anchor('command', id)}
      onClick={() => { host?.report('command', { command: id }); run() }}>{label}</PBButton>
  )
  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 2 }}>
      <PBWindow child controls={false} title="Copy to Clipboard" onClose={onClose} tutorialId="host.mois.dialog.hmr-clipboard" style={{ width: 360 }}>
        <div style={{ background: 'var(--pb-face)', padding: 6 }}>
          <div className="pb-groupbox">
            <PBBand>{`Copy the ${tab} tab`}</PBBand>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: '6px 10px' }}>
              <PBCheckbox label="Patient Details" checked disabled />
              <PBCheckbox label="Include Clinic Details" checked={clinic} onChange={setClinic} tutorialId="host.mois.field.hmr-clipboard-clinic" />
              <PBCheckbox label="Include Provider Details" checked={provider} onChange={setProvider} tutorialId="host.mois.field.hmr-clipboard-provider" />
            </div>
          </div>
        </div>
        <div className="pb-footer">
          <span className="pb-footer__spacer" />
          {button('hmr-clipboard-ok', 'OK', () => onCopy(clinic, provider), true)}
          {button('hmr-clipboard-cancel', 'Cancel', onClose)}
          <span className="pb-footer__spacer" />
        </div>
      </PBWindow>
    </div>
  )
}
