import { useEffect, useMemo, useState } from 'react'
import { useChartRecords } from '../data/chart-records'
import { date } from '../data/charts/relations'
import type { MoisRecord } from '../data/charts/types'
import { usePatient } from '../data/patient-context'
import { MOIS_TODAY } from '../data/patients'
import { PBButton, PBDropDownDataWindow, PBInput, PBWindow } from '../pb'
import './flow-sheet.css'

/* ============================================================================
   Flow Sheet Review — Utilities ▸ Flow Sheet Review, the Health Maintenance
   Review's `Flow Sheet` button, and an Encounter Form's `Flow Sheet` toolbar
   button all open the same two windows: the parameters prompt, then the
   sheet itself.

   PROVENANCE
   - art. 303789 "How to Create a Flow Sheet", image `570bfeace7ac…` (the
     annotated composite: 3a/3b are the parameters dialog with its Type list
     dropped, 4 is the "DIABETES Flowsheet" window). The text: dates are
     yyyy.mm.dd; "click Print or Close/Exit"; "At the bottom of every flow
     sheet, there's a list of all the patient's LONG TERM MEDICATIONS. Hover
     your mouse over the medication to view the dosage."
   - art. 303225 "Use a Flow Sheet", image `5be0ba8b665d…` — the same
     parameters dialog opened from the Health Maintenance Review with Type
     still blank, and a "TEST FLOWSHEET Flowsheet" window (Height / Weight /
     Cholesterol - HDL / CHOLESTEROL - LDL / "Known Tiggers?*" — MOIS's typo).
     Its second image `9d01b1910…` is the Diabetes Encounter Template toolbar
     (Save | Refresh | Flow Sheet | Close/Exit); "Ok (F2)" per the text.
   - art. 359179 "Print a Flow Sheet": both of its screenshots are missing
     from the manual capture (`missing-image.svg`); the text only confirms
     "Click 'Ok' or F2" then "click 'Print'".
   - System Settings (data/systemSettings.ts): `Flow Sheet Order` = A,
     "(A)scending or (D)escending from Left to Right", and `Flow Sheet
     Period` = 2, "Default Period Length in Years". Both captures agree: the
     To date is today and From is two years back plus a day (2014.06.04 –
     2016.06.03, 2010.08.10 – 2012.08.09).
   ========================================================================= */

export type FlowSheetParams = { from: string; to: string; type: string }

/** The Flowsheet list the Type drop-down drops (570bfeac, step 3b). */
const FLOWSHEET_TYPES = [
  { flowsheet: 'ASTHMA', description: 'ASTHMA CDM FLOWSHEET' },
  { flowsheet: 'CHF', description: 'CHF CDM FLOWSHEET' },
  { flowsheet: 'COPD', description: 'COPD CDM FLOWSHEET' },
  { flowsheet: 'DIABETES', description: 'DIABETES CDM FLOWSHEET' },
  { flowsheet: 'HEPC', description: 'HEPC CDM FLOWSHEET' },
  { flowsheet: 'HTN', description: 'HTN CDM FLOWSHEET' },
]

/** `Flow Sheet Period` (years) from System Settings. */
const FLOW_SHEET_PERIOD = 2

/** today less the period, plus one day — how both captures default From */
function periodStart(today: string, years = FLOW_SHEET_PERIOD): string {
  const [y, m, d] = today.split('.').map(Number)
  const t = new Date(Date.UTC(y - years, m - 1, d + 1))
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${t.getUTCFullYear()}.${pad(t.getUTCMonth() + 1)}.${pad(t.getUTCDate())}`
}

/* ============================================================================
   Flow Sheet Parameters

   Measured off `5be0ba8b` (the clean, un-annotated copy): the window is
   ≈333 × 200 client; a sunken group headed by the grey band "Please Enter
   Date Range (inclusive)" holds two navy captions — "Date Range
   (Inclusive):" and "Flow Sheet:" — over From/To and Type; Ok (F2) and
   Cancel sit centred under the group. Note the band says "(inclusive)" and
   the caption "(Inclusive)": both are transcribed as MOIS prints them.
   ========================================================================= */
export function FlowSheetParametersDialog({ defaultType = 'DIABETES', onOk, onClose }: {
  defaultType?: string
  onOk: (params: FlowSheetParams) => void
  onClose: () => void
}) {
  const [from, setFrom] = useState(() => periodStart(MOIS_TODAY))
  const [to, setTo] = useState(MOIS_TODAY)
  const [type, setType] = useState(defaultType)

  const ok = () => { if (type) onOk({ from, to, type }) }

  /* the button says (F2), and in MOIS it means it */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); ok() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ position: 'fixed', padding: 8, zIndex: 96 }}>
      <PBWindow
        child
        controls={false}
        tutorialId="host.mois.dialog.flow-sheet-parameters"
        title="Flow Sheet Parameters"
        onClose={onClose}
        className="pb-fsparams"
        style={{ width: 'min(333px, 100%)' }}
      >
        <div className="pb-fsparams__body">
          <div className="pb-fsparams__group">
            <div className="pb-fsparams__band">Please Enter Date Range (inclusive)</div>
            <div className="pb-fsparams__inner">
              <div className="pb-fsparams__caption">Date Range (Inclusive):</div>
              <div className="pb-fsparams__row">
                <label className="pb-fsparams__lbl" htmlFor="fs-from">From:</label>
                <PBInput id="fs-from" w={90} value={from} onChange={(e) => setFrom(e.target.value)} data-tutorial-id="host.mois.field.flow-sheet-from" />
                <label className="pb-fsparams__lbl pb-fsparams__lbl--to" htmlFor="fs-to">To:</label>
                <PBInput id="fs-to" w={90} value={to} onChange={(e) => setTo(e.target.value)} data-tutorial-id="host.mois.field.flow-sheet-to" />
              </div>
              <div className="pb-fsparams__caption">Flow Sheet:</div>
              <div className="pb-fsparams__row">
                <span className="pb-fsparams__lbl">Type:</span>
                <PBDropDownDataWindow
                  w={176}
                  listW={255}
                  tutorialId="host.mois.field.flow-sheet-type"
                  value={type}
                  display="flowsheet"
                  rows={FLOWSHEET_TYPES}
                  columns={[
                    { key: 'flowsheet', header: 'Flowsheet', width: 125 },
                    { key: 'description', header: 'Description', width: 130 },
                  ]}
                  onSelect={(r) => setType(r.flowsheet)}
                />
              </div>
            </div>
          </div>
          <div className="pb-fsparams__buttons">
            <PBButton style={{ minWidth: 85 }} data-tutorial-id="host.mois.command.flow-sheet-ok" disabled={!type} onClick={ok}>Ok (F2)</PBButton>
            <PBButton style={{ minWidth: 85 }} onClick={onClose}>Cancel</PBButton>
          </div>
        </div>
      </PBWindow>
    </div>
  )
}

/* ============================================================================
   The element list per flow sheet.

   A flow sheet is a Designer ▸ Flowsheet definition (art. 303098): ordered
   labels, each bound to a data source — Measure, Long Term Medications, an
   Encounter Form question, … The manual shows the rows of exactly one of
   the six CDM sheets: DIABETES in `570bfeac`, transcribed below in its
   order, "----" separators included, down to `Insulin` where the capture's
   bottom edge cuts it off. The other five are NOT in the manual; their rows
   are a reasonable reading of the matching Health Maintenance concept (the
   COPD list follows the art. 304722 concept table) and are marked as such.

   `form` rows read an Encounter Form question (Review BS Records?, …) that a
   chart export does not carry, so they print empty — which is also what the
   captures show for most dates.
   ========================================================================= */
type Element =
  | { kind: 'measure'; label: string; codes?: string[]; match?: RegExp }
  | { kind: 'med'; label: string; atc?: RegExp; name?: RegExp }
  | { kind: 'form'; label: string }
  | { kind: 'sep'; label: '----' }

const m = (label: string, codes: string[], match?: RegExp): Element => ({ kind: 'measure', label, codes, match })
const d = (label: string, match: RegExp): Element => ({ kind: 'measure', label, match })
const rx = (label: string, atc?: RegExp, name?: RegExp): Element => ({ kind: 'med', label, atc, name })
const q = (label: string): Element => ({ kind: 'form', label })
const SEP: Element = { kind: 'sep', label: '----' }

const LDL = d('LDL (mmole/L)', /CHOLESTEROL - LDL|\bLDL\b/)
const TRIG = d('Triglycerides (mmole/L)', /TRIGLYCERIDE/)
const CHOL_HDL = d('Chol/HDL Ratio', /CHOL.*HDL.*RATIO|CHOLEST\/HDLC/)
const CREATININE = d('Creatinine (mmole/L)', /^CREATININE\b/)
const ACR = d('Albumin/Creatinine Ratio', /MICROALB\/CREAT|ALBUMIN\/CREATININE/)
const GFR = d('GFR', /\bGFR\b/)
const POTASSIUM = d('Potassium', /^POTASSIUM\b/)
const BP = m('Blood Pressure (mm Hg)', ['1950'])
const WEIGHT = m('Weight (kg)', ['22732'])
const HEIGHT = m('Height (cm)', ['1948'])
const BMI = m('BMI', ['951'])
const WAIST = m('Waist Circumference (cm)', ['1984'], /WAIST CIRCUMFERENCE/)
const SMOKING = m('Cigarettes Smoked (Packs/Day)', ['34494', '61868'])
const ACE = rx('ACE Inhibitor', /^C09[AB]/)
const BETA = rx('Beta Blocker', /^C07/)
const ICS = rx('Inhaled Corticosteroid', /^R03BA/)

const FLOWSHEET_ELEMENTS: Record<string, Element[]> = {
  /* transcribed from 570bfeac, top to bottom */
  DIABETES: [
    q('Review BS Records?'),
    m('HGBA1C', ['HBA1C', '128'], /HEMOGLOBIN A1C|HBA1C/),
    q('Hypo/Hyperglycemia'),
    SEP,
    BP,
    WAIST,
    BMI,
    d('Cardiac Risk (Framingham)%', /FRAMINGHAM/),
    q('Lower Extremity Exam'),
    q('Lifestyle Counseling'),
    SEP,
    LDL,
    TRIG,
    CHOL_HDL,
    q('Meter/Lab BS Comparison'),
    CREATININE,
    ACR,
    SEP,
    ACE,
    rx('Metformin', /^A10BA02/, /METFORMIN/),
    rx('ASA', /^(B01AC06|N02BA01)/, /ACETYLSALICYLIC|\bASA\b/),
    rx('Insulin', /^A10A/, /INSULIN/),
  ],
  /* not in the manual — see above */
  ASTHMA: [
    m('Peak Expiratory Flow', ['39951']),
    d('FEV1 % Predicted', /FEV1 %/),
    d('FEV1/FVC', /FEV1\/FVC/),
    m('Oxygen Saturation', ['34683']),
    SMOKING,
    SEP,
    ICS,
    rx('Short Acting Beta Agonist', /^R03AC0[234]/),
  ],
  CHF: [
    WEIGHT,
    BP,
    m('Pulse Rate / Min', ['2011']),
    SEP,
    CREATININE,
    GFR,
    POTASSIUM,
    d('Ejection Fraction', /EJECTION FRACTION/),
    SEP,
    ACE,
    BETA,
    rx('Diuretic', /^C03/),
  ],
  COPD: [
    d('Spirometry', /^SPIROMETRY/),
    d('FEV1 % Predicted Post Bronchodilator', /FEV1 % PREDICTED POST/),
    d('FEV1/FVC Post Bronchodilator', /FEV1\/FVC POST/),
    WEIGHT,
    HEIGHT,
    SMOKING,
    m('Physical Activity (Minutes/Week)', ['39959']),
    SEP,
    rx('Anticholinergic', /^R03BB/),
    rx('Long Acting Beta Agonist', /^R03AC1[23]|^R03AK|^R03AL/),
    ICS,
  ],
  HEPC: [
    d('ALT', /ALANINE AMINOTRANSFERASE|^ALT\b/),
    d('AST', /ASPARTATE AMINOTRANSFERASE|^AST\b/),
    d('Bilirubin', /BILIRUBIN/),
    d('Albumin', /^ALBUMIN\b/),
    d('Platelets', /PLATELET/),
    d('INR', /\bINR\b/),
    d('HCV RNA', /\bHCV\b/),
  ],
  HTN: [
    BP,
    WEIGHT,
    BMI,
    WAIST,
    SEP,
    CREATININE,
    GFR,
    POTASSIUM,
    LDL,
    CHOL_HDL,
    ACR,
    SEP,
    ACE,
    rx('ARB', /^C09[CD]/),
    rx('Thiazide Diuretic', /^C03A/),
    rx('Calcium Channel Blocker', /^C08/),
    BETA,
  ],
}

function measureMatches(el: Extract<Element, { kind: 'measure' }>, r: MoisRecord) {
  if (el.codes?.includes(r.str_code ?? '')) return true
  return !!el.match && el.match.test((r.str_description ?? '').toUpperCase())
}

function medMatches(el: Extract<Element, { kind: 'med' }>, r: MoisRecord) {
  if (el.atc?.test(r.str_atc_code ?? '')) return true
  const name = `${r.str_medication ?? ''} ${r.str_generic_name ?? ''}`.toUpperCase()
  return !!el.name && el.name.test(name)
}

/** `8.9 LL`, `132 H`, `148/80` — the value and its abnormal flag, as the grid prints them. */
const cellText = (r: MoisRecord) => [r.str_value, r.str_abnormal].filter(Boolean).join(' ')

/* ============================================================================
   The flow sheet window.

   Layout from `570bfeac` (4) and `5be0ba8b`: a toolbar strip with a printer
   glyph + "Print" and "Close/Exit"; a white identity strip "Chart: … Patient:
   … DoB: … Sex: … Insurance: BC 9151252098"; a rule; then "FLOW SHEET AS OF
   <to>" and "DATE RANGE: <from> TO <to>"; then the Element / Date crosstab.
   Date columns run ascending left to right (`Flow Sheet Order` = A); the
   captures draw a heavier rule where the year changes (2014.12.02 |
   2015.01.27, 2010.12.14 | 2011.05.10, 2011.08.12 | 2012.02.10), carried all
   the way down the empty body. The first element row is the current row,
   painted salmon. `5be0ba8b` shows an entirely empty date column
   (2012.02.10), so a column exists for every date an element has a record
   on, valued or not. The grid is a PB crosstab report rather than an
   editable DataWindow — the kit's PBDataWindow has no per-column rule
   styling, so it is a plain table styled in flow-sheet.css.

   Long term medications: the chart export carries no tdt_medication_lt
   rows (see data/charts/to-rows.ts), so the list at the bottom — and the
   medication rows of the grid — read the chart's unvoided prescriptions as
   the nearest source. What a medication *row* prints in a date cell is not
   visible in any capture; here it is the dose on the date it was ordered.
   The LONG TERM MEDICATIONS block itself is below the bottom edge of every
   capture, so its caption and layout are from the article text alone.
   ========================================================================= */
export function FlowSheetWindow({ params, onClose }: { params: FlowSheetParams; onClose: () => void }) {
  const patient = usePatient()
  const measures = useChartRecords('measure')
  const prescriptions = useChartRecords('prescription', 'dtm_order')
  const [current, setCurrent] = useState(0)

  const elements = FLOWSHEET_ELEMENTS[params.type.toUpperCase()] ?? []
  const meds = useMemo(() => prescriptions.filter((r) => r.str_void !== 'Y'), [prescriptions])

  const { from, to } = params
  const { dates, cells } = useMemo(() => {
    const inRange = (day: string) => day >= from && day <= to
    const cells = new Map<string, string>() // `${row}|${date}` → text
    const days = new Set<string>()
    elements.forEach((el, i) => {
      if (el.kind === 'measure') {
        for (const r of measures) {
          const day = date(r.dtm_collect_date)
          if (!day || !inRange(day) || !measureMatches(el, r)) continue
          days.add(day)
          const key = `${i}|${day}`
          /* two readings on one day: the later-listed record wins, as a
             crosstab cell can only hold one */
          cells.set(key, cellText(r) || cells.get(key) || '')
        }
      } else if (el.kind === 'med') {
        for (const r of meds) {
          const day = date(r.dtm_order)
          if (!day || !inRange(day) || !medMatches(el, r)) continue
          days.add(day)
          cells.set(`${i}|${day}`, r.str_dose_freq ?? '')
        }
      }
    })
    return { dates: [...days].sort(), cells }
  }, [elements, measures, meds, from, to])

  const yearStart = (i: number) => i > 0 && dates[i].slice(0, 4) !== dates[i - 1].slice(0, 4)
  const insurance = [patient.insuranceBy, patient.bchn].filter(Boolean).join('   ')

  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ position: 'fixed', padding: 8, zIndex: 96 }}>
      <PBWindow
        child
        controls={false}
        tutorialId="host.mois.dialog.flow-sheet"
        title={`${params.type} Flowsheet`}
        onClose={onClose}
        className="pb-flowsheet"
        style={{ width: 'min(1000px, 100%)', height: 'min(720px, 100%)' }}
      >
        <div className="pb-flowsheet__toolbar">
          <button type="button" className="pb-flowsheet__tool" data-tutorial-id="host.mois.command.flow-sheet-print">
            <PrinterGlyph />Print
          </button>
          <span className="pb-flowsheet__toolsep" />
          <button type="button" className="pb-flowsheet__tool" data-tutorial-id="host.mois.command.flow-sheet-close" onClick={onClose}>
            Close/Exit
          </button>
          <span className="pb-flowsheet__toolsep" />
        </div>

        <div className="pb-flowsheet__ident">
          <span>Chart:<b>{patient.chart}</b></span>
          <span>Patient:<b>{`${patient.first} ${patient.last}`.toUpperCase()}</b></span>
          <span>DoB:<b>{patient.dob}</b></span>
          <span>Sex:<b>{patient.sex}</b></span>
          <span>Insurance:<b>{insurance}</b></span>
        </div>
        <div className="pb-flowsheet__asof">
          <span>FLOW SHEET AS OF <b>{params.to}</b></span>
          <span>DATE RANGE: <b>{params.from}</b>&nbsp;&nbsp; TO &nbsp;&nbsp;<b>{params.to}</b></span>
        </div>

        <div className="pb-flowsheet__scroll">
          <table className="pb-flowsheet__grid">
            <colgroup>
              <col style={{ width: 230 }} />
              {dates.map((day) => <col key={day} style={{ width: 88 }} />)}
              <col />
            </colgroup>
            <thead>
              <tr>
                <th className="pb-flowsheet__el">Element / Date</th>
                {dates.map((day, i) => (
                  <th key={day} className={yearStart(i) ? 'is-year' : undefined}>{day}</th>
                ))}
                <th className="pb-flowsheet__rest" />
              </tr>
            </thead>
            <tbody>
              {elements.map((el, r) => (
                <tr
                  key={r}
                  className={r === current ? 'is-current' : undefined}
                  onClick={() => setCurrent(r)}
                  data-tutorial-id={`host.mois.row.flow-sheet-${r}`}
                >
                  <td className="pb-flowsheet__el">{el.label}</td>
                  {dates.map((day, i) => (
                    <td key={day} className={yearStart(i) ? 'is-year' : undefined}>{cells.get(`${r}|${day}`) ?? ''}</td>
                  ))}
                  <td className="pb-flowsheet__rest" />
                </tr>
              ))}
              {elements.length === 0 && (
                <tr><td className="pb-flowsheet__el" colSpan={dates.length + 2}>No elements are defined for this flow sheet.</td></tr>
              )}
              {/* the column rules carry on down the empty body */}
              <tr className="pb-flowsheet__filler">
                <td className="pb-flowsheet__el" />
                {dates.map((day, i) => <td key={day} className={yearStart(i) ? 'is-year' : undefined} />)}
                <td className="pb-flowsheet__rest" />
              </tr>
            </tbody>
          </table>

          <div className="pb-flowsheet__ltm">
            <div className="pb-flowsheet__ltm-head">LONG TERM MEDICATIONS</div>
            {meds.length === 0 && <div className="pb-flowsheet__ltm-row">&nbsp;</div>}
            {meds.map((r, i) => (
              <div
                key={r.id_prescription ?? i}
                className="pb-flowsheet__ltm-row"
                /* "Hover your mouse over the medication to view the dosage" */
                title={r.str_dose_freq ?? ''}
              >
                {r.str_medication ?? r.str_generic_name ?? ''}
              </div>
            ))}
          </div>
        </div>
      </PBWindow>
    </div>
  )
}

/** The 16px printer glyph in front of "Print" on the flow sheet toolbar. */
function PrinterGlyph() {
  return (
    <svg width="14" height="13" viewBox="0 0 14 13" aria-hidden="true" style={{ marginRight: 4 }}>
      <rect x="3.5" y="0.5" width="7" height="4" fill="#fff" stroke="#555" />
      <rect x="0.5" y="4.5" width="13" height="5" rx="1" fill="#b9c6d6" stroke="#4d5b6c" />
      <rect x="3.5" y="8.5" width="7" height="4" fill="#fff" stroke="#555" />
      <rect x="11" y="6" width="1.5" height="1" fill="#2c8a2c" />
    </svg>
  )
}
