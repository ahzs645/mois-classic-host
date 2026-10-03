import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useChartExport } from '../data/chart-records'
import { date } from '../data/charts/relations'
import type { MoisRecord } from '../data/charts/types'
import { SESSION_USER } from '../data/chartSession'
import { usePatient } from '../data/patient-context'
import { MOIS_TODAY } from '../data/patients'
import { CLINIC } from '../data/printPages'
import { registerConfirmCurrent } from '../host/confirmCurrent'
import { useScreenReport } from '../host/screen-state'
import { PBBand, PBButton, PBCheckbox, PBTabs, PBWindow, pbSlug } from '../pb'
import { useOpenWindow } from './areaWindowRegistry'
import { ModalWindow } from './dialogKit'
import { DialogFooter } from './formKit'
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

   - art. 304722's "Concept Mapping Preconditions and Screening Elements"
     table (text) — the age/sex precondition of every GENERAL item and the
     screening elements of each condition section, in the order the
     captures print them (5be0ba8b: HYPERLIPIDEMIA › DIABETES › CHF;
     8117c454: HYPERTENSION's lipids as CHOL/HDL RATIO, CHOLEST, HDL, LDL,
     TRIGLYCERIDES). Its "Additional Tips": Framingham in GENERAL and
     HYPERLIPIDEMIA between 29 and 79; Cannabis Use in GENERAL; a
     Preference with a past stop date is not shown. `adb0d27e` adds the
     Not Found wording "FRAMINGHAM CARDIAC RISK ASSESSMENT" and GFR
     printed after HIV Screening when present (the table's "If present…").
   - art. 303366 — the CHF concept: include string "CHF", and the rule it
     adds (include "Heart" + "Failure", exclude "Acute").

   CONFIRM-CURRENT: all of the report's content above is help-site
   evidence (v2012–2022 builds and article text); it is registered below
   for a current-build capture to confirm. The concept table names its
   elements by concept ("CIGARETTES SMOKED PACKS PER DAY"), not by what the
   review prints ("SMOKING STATUS" / "CIGARETTES SMOKED.CURRENT (PACK/DAY"),
   so where no capture shows an element printed, its "Not Found" wording is
   the table's.

   Gaps, deliberately: only measures are looked up — vaccines, imaging,
   procedures and consults print "Not Found", and the procedure sub-lines
   the 66F capture shows ("NOT INDICATED as of", "COLONOSCOPY Was Done")
   are not reproduced. The STI/BBP and INCENTIVE CLAIM sections are
   omitted, as are the table's FRAILTY, HIV, DEPRESSION, PSYCHOTIC MENTAL
   DISORDER, UNSAFE DRUG / ALCOHOL USE, SPLENECTOMY and HEPC sections (their
   "Last Encounter" / calculated / procedure lines have no captured print
   form), ASTHMA's two calculated Peak Flow lines, and the Care Plan goals
   ("GOAL: …") on the report lines. INFERRED: the Care Plan and Patient
   Summary tabs are never shown open in the manual; what they list here is
   a plain reading of their names, not a transcription.

   The four buttons (art. 304722's definitions table):
   · Flow Sheet — opens the Flow Sheet parameters (303225).
   · Print — the review, the tab on screen, in the Print Preview window
     (screens/PrintPreviewWindow.tsx), which takes this window's place.
   · Tear Off — "Will open the tab/information in a new MOIS viewer window.
     Only available in the 'Care Plan' or 'Patient Summary' tabs": a
     separate, non-modal text window over this one, closed on its own.
     CONFIRM-CURRENT: art. 303741 (text) describes every folder's Tear Off
     the same way — "a movable window" that "remains open while you
     navigate" — so it moves by its title bar here.
   · Clipboard — "Creates a copy of the information that is within the
     chosen tab, with the option to add Clinic or Provider details (in
     addition to the patient details) at the top": a small options window,
     then the text goes to the system clipboard. The stage names what was
     copied under the buttons, as Print Preview names what was printed.
   CONFIRM-CURRENT: what each of the two windows holds — the tab's text;
   patient details always, Clinic and Provider details on request — is the
   definitions' text. INFERRED: neither window is captured, so their
   titles beyond "MOIS viewer", the two tick boxes' wording, the buttons and
   the layout are not evidenced. A resolved condition's section states its
   resolve date ("If resolve date - State it", the concept table); MOIS
   prints a preference that way ("NOT INDICATED as of 2013.05.02",
   `8117c454`), but "RESOLVED as of <date>" itself is INFERRED.

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
  /** printed only when the chart has it — the table's "If present…" (GFR) */
  onlyIfFound?: boolean
}

const other = (name: string, gate: Partial<Item> = {}): Item => ({ name, measure: false, ...gate })

/* The elements more than one section prints. Names are what the captures
   print: the Not Found wording where a capture shows it missing, else the
   found record's own description. */
const PHYSICAL_ACTIVITY: Item = { name: 'PHYSICAL ACTIVITY', codes: ['39959'] }
const ALCOHOL: Item = { name: 'ALCOHOL INTAKE', codes: ['39957', '3553'], match: /^ALCOHOL/ }
/* art. 303111: the smoking concept, most recent of the two codes */
const SMOKING: Item = { name: 'SMOKING STATUS', codes: ['34494', '61868'] }
const CIGARETTES: Item = { name: 'CIGARETTES SMOKED.CURRENT (PACK/DAY)', codes: ['34494', '61868'] }
const ACTIVITY_PER_WEEK: Item = { name: 'PHYSICAL ACTIVITY MINUTES PER WEEK', codes: ['39959'] }
/* `adb0d27e` prints it missing as "FRAMINGHAM CARDIAC RISK ASSESSMENT" */
const FRAMINGHAM: Item = { name: 'FRAMINGHAM CARDIAC RISK ASSESSMENT', match: /FRAMINGHAM/ }
const GLUCOSE: Item = { name: 'GLUCOSE (FASTING)', match: /GLUCOSE \(FASTING\)|GLUCOSE FASTING/ }
const GFR: Item = { name: 'GFR SERPL-VRATE', codes: ['27540'], match: /\bGFR\b/ }
const CREATININE: Item = { name: 'CREATININE', match: /^CREATININE\b/ }
const BLOOD_PRESSURE: Item = { name: 'BLOOD PRESSURE (SYSTOLIC/DIASTOLIC)', codes: ['1950'] }
const UALB_CR: Item = { name: 'URINE MICROALB/CREAT RATIO', match: /MICROALB\/CREAT/ }
const WEIGHT: Item = { name: 'WEIGHT', codes: ['22732'] }
const HEIGHT: Item = { name: 'HEIGHT', codes: ['1948'] }
const INR: Item = { name: 'INR', match: /\bINR\b/ }
const SPIROMETRY: Item = { name: 'SPIROMETRY', match: /^SPIROMETRY/ }
const FEV1_POST: Item = { name: 'FEV1 % PREDICTED POST BRONCHODILATO', match: /FEV1 % PREDICTED POST/ }
const PNEUMOCOCCAL = other('PNEUMOCOCCAL VACCINE')
const INFLUENZA = other('INFLUENZA VACCINE')

const LDL: Item = { name: 'CHOLESTEROL - LDL', match: /CHOLESTEROL - LDL/ }
const HDL: Item = { name: 'CHOLESTEROL - HDL', match: /CHOLESTEROL - HDL/ }
const SERUM_CHOLESTEROL: Item = { name: 'CHOLEST SERPL-SCNC', match: /CHOLEST SERPL-SCNC/ }
const CHOL_HDL_RATIO: Item = { name: 'CHOL/HDL RATIO', match: /CHOL.*HDL.*RATIO|CHOLEST\/HDLC/ }
const TRIGLYCERIDES: Item = { name: 'TRIGLYCERIDES', match: /TRIGLYCERIDE/ }
/* the two orders the table and captures give the lipids in: DIABETES's
   (`82ded285`), and every other section's (8117c454's HYPERTENSION,
   5be0ba8b's HYPERLIPIDEMIA) */
const LIPIDS_DIABETES = [LDL, HDL, SERUM_CHOLESTEROL, CHOL_HDL_RATIO, TRIGLYCERIDES]
const LIPIDS = [CHOL_HDL_RATIO, SERUM_CHOLESTEROL, HDL, LDL, TRIGLYCERIDES]

/* GENERAL AND AGE/SEX SPECIFIC SCREENING, in the captures' order (66F
   `8117c454`, 35F `2a5a6971`, 50F `5be0ba8b`).
   CONFIRM-CURRENT: every gate is art. 304722's precondition table
   ("Age >11" = 12 and over, "M – Age 35> to <60" = 36–59, …); the
   table's FRAMINGHAM is 29> to <79, though the 2016 35F capture does not
   print it, and its Cannabis Use is "Age >12" where the tips say "+10".
   SERUM CHOLESTEROL / CHOL/HDL RATIO / ABDOMINAL IMAGING (male) and
   CANNABIS USE take the table's place in the order (5be0ba8b prints
   CHOLEST SERPL-SCNC after PAPANICOLAU SMEAR); ABDOMINAL IMAGING and
   CANNABIS USE are printed with the table's wording. */
const GENERAL: Item[] = [
  other('SCREENING MAMMOGRAPHY', { sex: 'F', minAge: 50, maxAge: 70 }),
  { name: 'PAPANICOLAU SMEAR', codes: ['1917'], match: /PAPANICOL/, sex: 'F', minAge: 25, maxAge: 70 },
  /* the table's OSTEOPOROSIS SCREENING: the FRAX measure or a bone density image */
  { name: 'FRAX WHO FRACTURE RISK ASSESSMENT T', match: /FRAX|BONE DENSITY/, sex: 'F', minAge: 60, maxAge: 79 },
  { ...SERUM_CHOLESTEROL, sex: 'M', minAge: 36, maxAge: 59 },
  { ...CHOL_HDL_RATIO, sex: 'M', minAge: 36, maxAge: 59 },
  other('ABDOMINAL IMAGING', { sex: 'M', minAge: 66, maxAge: 79 }),
  other('PNEUMOCOCCAL VACCINE', { minAge: 65 }),
  other('INFLUENZA VACCINE', { minAge: 65 }),
  /* the table's LEVEL OF INTERVENTION, or an Advance Directive preference */
  other('ADVANCE DIRECTIVE DOCUMENTED', { minAge: 65 }),
  { ...GLUCOSE, minAge: 45 },
  { name: 'OCCULT BLD STL QL IMM', match: /OCCULT BLD/, minAge: 50, maxAge: 74 },
  { ...PHYSICAL_ACTIVITY, minAge: 12 },
  { ...ALCOHOL, minAge: 12 },
  { ...SMOKING, minAge: 12 },
  { ...WEIGHT, minAge: 65 }, // INFERRED: the table has no WEIGHT in GENERAL; the 66F capture prints it, the 35F one does not
  { name: 'WAIST CIRCUMFERENCE', codes: ['1984'], minAge: 12 },
  { name: 'BMI', codes: ['951'], minAge: 12 },
  { name: 'CANNABIS USE', match: /CANNABIS/, minAge: 13 },
  other('TETANUS VACCINE', { minAge: 26 }),
  { name: 'BP', codes: ['1950'], minAge: 19 },
  { ...FRAMINGHAM, minAge: 30, maxAge: 78 },
]

const HIV: Item = { name: 'HIV Screening', match: /^HIV/, blueWhenMissing: true, minAge: 19 }
/* `adb0d27e`: after HIV Screening and its Not Desired line, when present */
const GENERAL_GFR: Item = { ...GFR, onlyIfFound: true }

/* Condition sections, in the table's order (which 5be0ba8b keeps). The
   heading is the chart's own problem name. CONFIRM-CURRENT: the element
   lists are art. 304722's concept table, with the captured order where a
   capture shows one (HYPERTENSION `8117c454`/`4d87f036`, DIABETES
   `5be0ba8b`/`82ded285`, COPD `133dbc7f`, HYPERLIPIDEMIA `5be0ba8b`).
   Which problem names open a section is each clinic's Concept Mapping:
   COPD's strings are 304722's, CHF's are 303366's, HYPERTENSION /
   DIABETES / HYPERLIPIDEMIA match the captured headings; INFERRED: the
   ANTICOAGULATION, CEREBROVASCULAR, CARDIOVASCULAR, ASTHMA and CKD
   patterns are the table's section names. */
const CONDITIONS: { when: (problem: string) => boolean; items: Item[] }[] = [
  { when: (p) => /ANTICOAG/.test(p), items: [INR] },
  {
    when: (p) => /HYPERLIPID/.test(p),
    items: [...LIPIDS, { ...FRAMINGHAM, minAge: 30, maxAge: 78 }],
  },
  {
    when: (p) => /CEREBROVASC/.test(p),
    items: [BLOOD_PRESSURE, ...LIPIDS, CIGARETTES, ACTIVITY_PER_WEEK],
  },
  {
    when: (p) => /CARDIOVASCULAR/.test(p),
    items: [BLOOD_PRESSURE, ...LIPIDS, CIGARETTES, ACTIVITY_PER_WEEK, { name: 'CANNABIS USE', match: /CANNABIS/ }],
  },
  {
    when: (p) => /DIABETES/.test(p),
    items: [
      ...LIPIDS_DIABETES, UALB_CR, GFR,
      { name: 'HEMOGLOBIN A1C', codes: ['HBA1C', '128'], match: /HEMOGLOBIN A1C/ },
      GLUCOSE, BLOOD_PRESSURE, PNEUMOCOCCAL, INFLUENZA,
      /* 5be0ba8b prints two "CONSULT FOR DIABETIC …" lines here, cut off
         by the window over them; the wording is the table's */
      other('OPHTHALMOLOGY ASSESSMENT'),
      other('DIABETES EDUCATION ASSESSMENT'),
    ],
  },
  {
    when: (p) => /HYPERTENSION/.test(p),
    items: [
      CREATININE, GLUCOSE, GFR, BLOOD_PRESSURE,
      other('ECG'),
      ...LIPIDS, UALB_CR, CIGARETTES,
      /* the table's tail, past where 8117c454 is cut */
      ACTIVITY_PER_WEEK, ALCOHOL,
      { ...FRAMINGHAM, minAge: 30, maxAge: 74 },
    ],
  },
  {
    when: (p) => /COPD|C\.O\.P\.D\.|CHRONIC OBSTRUC/.test(p),
    items: [
      SPIROMETRY, FEV1_POST,
      { name: 'FEV1/FVC POST BRONCHODILATOR', match: /FEV1\/FVC POST/ },
      WEIGHT, HEIGHT, CIGARETTES, ACTIVITY_PER_WEEK, PNEUMOCOCCAL, INFLUENZA,
    ],
  },
  {
    when: (p) => /ASTHMA/.test(p),
    items: [
      SPIROMETRY,
      { name: 'PEAK EXPIRATORY FLOW', match: /PEAK EXPIRATORY FLOW|PEAK FLOW/ },
      { name: 'FEV1PREB', match: /FEV1.*PRE BRONCHODILAT/ },
      FEV1_POST, CIGARETTES, PNEUMOCOCCAL, INFLUENZA,
    ],
  },
  {
    when: (p) => /CHRONIC KIDNEY|CHRONIC RENAL|\bCKD\b/.test(p),
    items: [
      BLOOD_PRESSURE, WEIGHT, HEIGHT, GFR, UALB_CR, LDL, HDL, SERUM_CHOLESTEROL, CHOL_HDL_RATIO,
      { name: 'HEMOGLOBIN', match: /^HEMOGLOBIN\b(?! A1C)/ },
      { name: 'IRON SATURATION', match: /IRON SAT/ },
      { name: 'SERUM CALCIUM', match: /^CALCIUM\b/ },
      { name: 'PO4', match: /^PHOSPHATE|\bPO4\b/ },
      { name: 'IPTH', match: /\bPTH\b/ },
      PNEUMOCOCCAL, INFLUENZA, other('HEP B VACCINE'), other('RENAL IMAGING'), other('NEPHROLOGY ASSESSMENT'),
    ],
  },
  {
    /* 303366: "CHF", or "Heart" and "Failure" but not "Acute" */
    when: (p) => /CHF/.test(p) || (/HEART/.test(p) && /FAILURE/.test(p) && !/ACUTE/.test(p)),
    items: [
      CREATININE,
      { name: 'SERUM SODIUM', match: /^SODIUM\b/ },
      { name: 'SERUM POTASSIUM', match: /^POTASSIUM\b/ },
      { name: 'PRO BNP', match: /BNP/ },
      { name: 'NYHA CLASS', match: /NYHA/ },
      { name: 'CARDIAC EJECTION FRACTION', match: /EJECTION FRACTION/ },
      BLOOD_PRESSURE, WEIGHT, other('CHEST IMAGING'), PNEUMOCOCCAL, INFLUENZA,
    ],
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
  if (!r && item.onlyIfFound) return null
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

/* CONFIRM-CURRENT: no capture of the current build shows any of these three
   windows; each is laid out from the help site (see PROVENANCE). */
registerConfirmCurrent([
  {
    target: { anchor: 'host.mois.dialog.health-maintenance-review' },
    source: 'help-site art. 304722 img 8117c454 (2018), bc77da00 (2022) + concept table; 303225 img 5be0ba8b (2012); 303111 img 2a5a6971 (2016)',
    check: 'header and buttons, which report lines print at which age/sex, section order, Care Plan / Patient Summary tabs',
  },
  {
    target: { anchor: 'host.mois.dialog.hmr-tear-off' },
    source: 'art. 304722 + 303741 (text only)',
    check: 'whole window: is it the PDF MOIS Viewer or a text window; title, layout, Close button; does it outlive the review',
  },
  {
    target: { anchor: 'host.mois.dialog.hmr-clipboard' },
    source: 'art. 304722 (text only)',
    check: 'whole window: title, tick-box wording, buttons',
  },
])

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
  /* CONFIRM-CURRENT (304722's tips): "When a Preference has a stop date
     (in the past) do not show the Preference in the CTRL+H" */
  const hivDeclined = (data?.chart_preference ?? []).find((r) =>
    /HIV SCREENING/.test((r.str_description ?? r.str_preference ?? '').toUpperCase())
    && /NOT DESIRED/.test((r.str_instruction_code ?? '').toUpperCase())
    && !(r.dtm_end && date(r.dtm_end) < MOIS_TODAY))

  /* "If resolve date - State it / Else - <the items>" (the concept table):
     an open issue lists its items, a resolved one only its resolve date */
  const conditions = CONDITIONS.flatMap((c) => {
    const hits = issues.filter((r) => c.when((r.str_problem_name ?? '').toUpperCase()))
    const hit = hits.find((r) => !r.dtm_end) ?? hits[0]
    const items = c.items.filter((it) => applies(it, sex, age))
    return hit ? [{ title: (hit.str_problem_name ?? '').toUpperCase(), items, resolved: hit.dtm_end ? date(hit.dtm_end) : '' }] : []
  })

  const careTab = tab !== 'Health Maintenance'
  const general = GENERAL.filter((it) => applies(it, sex, age))
  const hiv = applies(HIV, sex, age)
  const marks: Marks = (() => {
    const seq: [string, Item][] = [
      ...general.map((it): [string, Item] => [`general:${it.name}`, it]),
      ...(hiv ? [[`general:${HIV.name}`, HIV] as [string, Item]] : []),
      [`general:${GENERAL_GFR.name}`, GENERAL_GFR],
      ...conditions.filter((c) => !c.resolved).flatMap((c) => c.items.map((it): [string, Item] => [`${c.title}:${it.name}`, it])),
    ]
    const found = (it: Item) => !!mostRecent(it, measures) || !!it.blueWhenMissing
    /* an "If present…" element that is absent prints nothing, so it is never the first red line */
    return { missing: seq.find(([, it]) => !found(it) && !it.onlyIfFound)?.[0], found: seq.find(([, it]) => found(it))?.[0] }
  })()

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
  const print = () => {
    openWindow('print-preview', {
      title: `Health Maintenance Review - ${tab}`,
      pages: [[`**Health Maintenance Review : As Of ${MOIS_TODAY}**`, ...identity, '', ...reportLines()].join('\n')],
    })
  }
  const tearOff = () => setTornOff({ tab, lines: reportLines() })
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
    <ModalWindow
      id="health-maintenance-review"
      title={`Health Maintenance Review : As Of ${MOIS_TODAY} [read only]`}
      onClose={onClose}
      zIndex={96}
      layerStyle={{ position: 'fixed', padding: 8 }}
      windowClassName="pb-hmr"
      windowStyle={{ width: 'min(827px, 100%)', height: 'min(750px, 100%)' }}
      after={<>
        {tornOff && <TearOffWindow tab={tornOff.tab} lines={tornOff.lines} identity={identity} onClose={() => setTornOff(null)} />}
        {clipOpen && <ClipboardWindow tab={tab} onCopy={copy} onClose={() => setClipOpen(false)} />}
      </>}
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
          <PBButton command="hmr-flow-sheet" onClick={() => onFlowSheet()}><u>F</u>low Sheet</PBButton>
          <PBButton command="hmr-print" onClick={print}><u>P</u>rint</PBButton>
          <PBButton disabled={!careTab} command="hmr-tear-off" onClick={tearOff}><u>T</u>ear Off</PBButton>
          <PBButton disabled={!careTab} command="hmr-clipboard" onClick={() => setClipOpen(true)}><u>C</u>lipboard</PBButton>
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
                  {hiv && <ItemLine item={HIV} measures={measures} marks={marks} at={`general:${HIV.name}`} />}
                  {hiv && hivDeclined && (
                    <div className="pb-hmr__found">{` NOT DESIRED FURTHER MEASURE as of ${date(hivDeclined.dtm_start)}`}</div>
                  )}
                  <ItemLine item={GENERAL_GFR} measures={measures} marks={marks} at={`general:${GENERAL_GFR.name}`} />
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
    </ModalWindow>
  )
}

/* Tear Off. CONFIRM-CURRENT: the tab's text in a separate "MOIS viewer"
   window that moves by its title bar (304722, 303741 text). INFERRED: the
   " - <tab>" in the title, the patient lines heading the text, the Close
   button, and the offset that keeps both title bars in view. MOIS's own
   "MOIS Viewer" is the PDF viewer (MoisViewerWindow.tsx); whether the
   review's text opens there is not evidenced. The window closes with the
   review here, though 303741 says a torn-off window "remains open while
   you navigate" — that needs a frame-level slot the area-window switch
   does not have (one window at a time). */
function TearOffWindow({ tab, lines, identity, onClose }: { tab: string; lines: string[]; identity: string[]; onClose: () => void }) {
  return (
    <PBWindow child controls title={`MOIS Viewer - ${tab}`} onClose={onClose} tutorialId="host.mois.dialog.hmr-tear-off"
      className="pb-hmr pb-hmr__tearoff">
      <div className="pb-hmr__report" style={{ margin: 6 }} data-tutorial-id="host.mois.field.hmr-tear-off-text">
        {[...identity, '', `${tab.toUpperCase()} : As Of ${MOIS_TODAY}`, ...lines].join('\n')}
      </div>
      <DialogFooter frame="pb" buttons={[{ label: 'Close', command: 'hmr-tear-off-close', wide: true, onClick: onClose }]} />
    </PBWindow>
  )
}

/* Clipboard. CONFIRM-CURRENT: patient details always, Clinic and Provider
   details on request (304722's definition). INFERRED: the window itself —
   title, band, tick-box wording, OK / Cancel. */
function ClipboardWindow({ tab, onCopy, onClose }: { tab: string; onCopy: (clinic: boolean, provider: boolean) => void; onClose: () => void }) {
  const [clinic, setClinic] = useState(false)
  const [provider, setProvider] = useState(false)
  return (
    <ModalWindow id="hmr-clipboard" title="Copy to Clipboard" onClose={onClose} zIndex={2} windowStyle={{ width: 360 }}>
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
        <DialogFooter frame="pb" buttons={[
          { label: 'OK', command: 'hmr-clipboard-ok', wide: true, primary: true, onClick: () => onCopy(clinic, provider) },
          { label: 'Cancel', command: 'hmr-clipboard-cancel', wide: true, onClick: onClose },
        ]} />
    </ModalWindow>
  )
}
