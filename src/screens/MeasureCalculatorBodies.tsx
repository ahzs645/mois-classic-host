import { useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import { useChartRecords } from '../data/chart-records'
import { date } from '../data/charts/relations'
import { calculatorMeasureCode } from '../data/measures'
import { usePatient } from '../data/patient-context'
import { MOIS_TODAY } from '../data/patients'
import { useScreenReport } from '../host/screen-state'
import { PBButton, PBInput, PBRadio, PBWindow } from '../pb'
import type { MeasurementRow } from './MeasureDialogs'

/* ============================================================================
   Measure Calculator — the four calculators besides BMI.

   The Measurements tab's Calculator button, Utilities ▸ Calculators … on the
   Encounter Detail Window, and Utilities ▸ Calculators … on the chart's
   Measures folder all open one of these over the same `Measure Calculator`
   caption the BMI calculator uses (MeasureDialogs.tsx). Each is its own
   layout in MOIS:

   PROVENANCE: art. 302837 "Calculators"
     · `4d69f496…` (592×520) FRAMINGHAM RISK SCORE (FRS), with the blue
       Reference… link: Demographic Information (Gender Male/Female, Age),
       Health Condition (Smoker Non-Smoker/Smoker, Diabetes No
       Diabetes/Diabetes), Lipids (HDL-C, Total Chol (mmol/L)), Blood
       Pressure (Systolic / Diastolic mm[Hg], Treated / Not Treated), SCORE
       with "10 Year Risk (%)" and Calculate Score, "Map Score to MOIS Code:"
       1988 CARDIAC RISK FRAMINGHAM; Populate (Ctrl+P) · Save (F2) · Cancel ·
       Clear (F5). The capture's own case (female, 67, smoker, HDL 1.10, TC
       5.60, SBP 150 treated) scores `>30`, which the points table below
       reproduces. The article's "Calculate Values" is the older caption;
       the capture's "Calculate Score" wins.
     · `eb9d27d7…` (495×394) MOIS PEAK EXPIRATORY FLOW CALCULATOR: Sex, Age,
       Race (Caucasion — MOIS's spelling — / Black), Height (cm) with its
       date and age, Most Recent / Personal Best Peak Flow Measurement,
       Predicted with the two green "Measured as % of …" boxes, Calculate,
       Measure Code 12577, the two blue literature links. Predicted 206 for a
       67-year-old woman 116 cm tall is Hankinson 1999's Caucasian female
       equation (L/s × 60, truncated), which is what this computes.
     · `14e8d18a…` (493×319) GESTATIONAL AGE CALCULATOR: LNMP, EDC, Current
       Gest Age (weeks), Projection Date / Weeks, As of Date, the two
       instruction lines, Calculate (F2) · Cancel · Clear (F5). The article:
       MOIS calculates from the field that has focus — EDC = LNMP + 280 days,
       LNMP = EDC − 280 — and Current Gest Age shows one decimal until the
       cursor is in it.
     · `27fd978b…` (474×387) BODY SURFACE AREA (BSA) CALCULATOR: Height /
       Weight with their dates and imperial boxes, BSA(m2), Age, Sex, the
       Average Values table, the Mosteller citation ("Bases on …", verbatim),
       Measure Code 34086. 116 cm × 80 kg → 1.61, the capture's value.
   INFERRED: the name the Predicted PEF and BSA rows are filed under (their
     calculators show a code only), the Framingham points table's source
     (CCS 2009 FRS, the document the Reference link opens per the article),
     and the two literature links, which open nothing on this stage.
   ========================================================================= */

type Props = {
  calculator: string
  onSave: (row: MeasurementRow) => void
  onClose: () => void
}

export function MeasureCalculatorBody(props: Props) {
  switch (props.calculator) {
    case 'Cardiac Risk': return <CardiacRiskCalculator {...props} />
    case 'Predicted PEF': return <PeakFlowCalculator {...props} />
    case 'Gestational Age': return <GestationalAgeCalculator {...props} />
    case 'BSA': return <BsaCalculator {...props} />
    default: return null
  }
}

/* --- shared shell --------------------------------------------------------- */

const rule: CSSProperties = { borderTop: '1px solid var(--pb-border)' }
const grey: CSSProperties = { background: '#e6e6e6' }
const blue: CSSProperties = { color: '#000094' }

function CalculatorShell({ width, height, band, bandRight, footer, onClose, onKey, children }: {
  width: number
  height: number
  band: ReactNode
  bandRight?: ReactNode
  footer: ReactNode
  onClose: () => void
  onKey?: (e: KeyboardEvent<HTMLDivElement>) => void
  children: ReactNode
}) {
  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 97 }}>
      <PBWindow
        child
        controls={false}
        tutorialId="host.mois.dialog.measure-calculator"
        title="Measure Calculator"
        onClose={onClose}
        style={{ width: `min(${width}px, 100%)`, height: `min(${height}px, 100%)` }}
      >
        <div onKeyDown={onKey} style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}>
          <div style={{ padding: 8, display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}>
            <div style={{ border: '1px solid var(--pb-border)', flex: '1 1 auto', minHeight: 0, overflow: 'auto', background: 'var(--pb-face)' }}>
              <div className="pb-row" style={{ padding: '4px 8px', fontWeight: 700, background: 'linear-gradient(#f4f4f4, #dcdcdc)', borderBottom: '1px solid var(--pb-border)' }}>
                <span style={{ flex: '1 1 auto' }}>{band}</span>
                {bandRight}
              </div>
              {children}
            </div>
          </div>
          <div className="pb-row" style={{ justifyContent: 'space-between', padding: '0 8px 10px', flex: 'none' }}>{footer}</div>
        </div>
      </PBWindow>
    </div>
  )
}

/** the footer every calculator but Gestational Age carries */
function StandardFooter({ onPopulate, onSave, canSave, onClose, onClear }: {
  onPopulate: () => void; onSave: () => void; canSave: boolean; onClose: () => void; onClear: () => void
}) {
  return (
    <>
      <PBButton style={{ minWidth: 96 }} data-tutorial-id="host.mois.command.populate" onClick={onPopulate}>Populate (Ctrl+P)</PBButton>
      <PBButton style={{ minWidth: 96 }} data-tutorial-id="host.mois.command.calculator-save" disabled={!canSave} onClick={onSave}>Save (F2)</PBButton>
      <PBButton style={{ minWidth: 96 }} data-tutorial-id="host.mois.command.calculator-cancel" onClick={onClose}>Cancel</PBButton>
      <PBButton style={{ minWidth: 96 }} data-tutorial-id="host.mois.command.calculator-clear" onClick={onClear}>Clear (F5)</PBButton>
    </>
  )
}

/** Ctrl+P / F2 / F5, the accelerators the footers print */
const keys = (map: { populate?: () => void; save?: () => void; clear?: () => void }) => (e: KeyboardEvent<HTMLDivElement>) => {
  if (e.ctrlKey && (e.key === 'p' || e.key === 'P') && map.populate) { e.preventDefault(); map.populate() }
  else if (e.key === 'F2' && map.save) { e.preventDefault(); map.save() }
  else if (e.key === 'F5' && map.clear) { e.preventDefault(); map.clear() }
}

/** the chart's latest reading of a code, with its date */
function useLatest() {
  const measures = useChartRecords('measure', 'dtm_collect_date')
  return (code: string) => {
    const r = measures.find((m) => m.str_code === code && (m.str_value ?? '') !== '')
    return r ? { value: r.str_value ?? '', date: date(r.dtm_collect_date) } : null
  }
}

const num = (v: string) => (v.trim() === '' ? Number.NaN : Number(v))
const ageYears = (age: string) => { const n = parseInt(age, 10); return Number.isFinite(n) ? String(n) : '' }

/** age in whole years on `when` (YYYY.MM.DD) for a date of birth */
function ageOn(dob: string, when: string): string {
  const [by, bm, bd] = dob.split('.').map(Number)
  const [wy, wm, wd] = when.split('.').map(Number)
  if (!by || !wy) return ''
  return String(wy - by - ((wm! < bm! || (wm === bm && wd! < bd!)) ? 1 : 0))
}

/* ==========================================================================
   FRAMINGHAM RISK SCORE (FRS)
   ========================================================================= */

type Sex = 'M' | 'F'
const band = (v: number, cuts: number[], points: number[]) => {
  /* cuts are ascending lower bounds; the article: "the lowest end point is
     interpreted as greater than or equal to that value" */
  let i = 0
  while (i < cuts.length && v >= cuts[i]!) i += 1
  return points[i]!
}

function frsPoints(p: { sex: Sex; age: number; smoker: boolean; diabetes: boolean; hdl: number; tc: number; sbp: number; treated: boolean }): number {
  const men = p.sex === 'M'
  const age = band(p.age, [35, 40, 45, 50, 55, 60, 65, 70, 75], men ? [0, 0, 2, 5, 7, 8, 10, 11, 12, 14, 15] : [0, 0, 2, 4, 5, 7, 8, 9, 10, 11, 12])
  const hdl = band(p.hdl, [0.9, 1.2, 1.3, 1.6], [2, 1, 0, -1, -2])
  const tc = band(p.tc, [4.1, 5.2, 6.2, 7.2], men ? [0, 1, 2, 3, 4] : [0, 1, 3, 4, 5])
  const sbp = band(p.sbp, [120, 130, 140, 150, 160], men
    ? (p.treated ? [0, 2, 3, 4, 4, 5] : [-2, 0, 1, 2, 2, 3])
    : (p.treated ? [-1, 2, 3, 5, 6, 7] : [-3, 0, 1, 2, 4, 5]))
  return age + hdl + tc + sbp + (p.smoker ? (men ? 4 : 3) : 0) + (p.diabetes ? (men ? 3 : 4) : 0)
}

const FRS_MEN: Record<number, string> = { [-2]: '1.1', [-1]: '1.4', 0: '1.6', 1: '1.9', 2: '2.3', 3: '2.8', 4: '3.3', 5: '3.9', 6: '4.7', 7: '5.6', 8: '6.7', 9: '7.9', 10: '9.4', 11: '11.2', 12: '13.3', 13: '15.6', 14: '18.4', 15: '21.6', 16: '25.3', 17: '29.4' }
const FRS_WOMEN: Record<number, string> = { [-1]: '1.0', 0: '1.2', 1: '1.5', 2: '1.7', 3: '2.0', 4: '2.4', 5: '2.8', 6: '3.3', 7: '3.9', 8: '4.5', 9: '5.3', 10: '6.3', 11: '7.3', 12: '8.6', 13: '10.0', 14: '11.7', 15: '13.7', 16: '15.9', 17: '18.5', 18: '21.5', 19: '24.8', 20: '28.5' }

function frsRisk(sex: Sex, points: number): string {
  if (sex === 'M') return points <= -3 ? '<1' : points >= 18 ? '>30' : FRS_MEN[points]!
  return points <= -2 ? '<1' : points >= 21 ? '>30' : FRS_WOMEN[points]!
}

function CardiacRiskCalculator({ onSave, onClose }: Props) {
  const patient = usePatient()
  const latest = useLatest()
  const [sex, setSex] = useState<Sex | ''>('')
  const [age, setAge] = useState('')
  const [smoker, setSmoker] = useState<boolean | null>(null)
  const [diabetes, setDiabetes] = useState<boolean | null>(null)
  const [hdl, setHdl] = useState('')
  const [tc, setTc] = useState('')
  const [sbp, setSbp] = useState('')
  const [dbp, setDbp] = useState('')
  const [treated, setTreated] = useState<boolean | null>(null)
  const [score, setScore] = useState('')
  const [code, setCode] = useState(calculatorMeasureCode['Cardiac Risk'] || '1988')
  useScreenReport({ calculator: 'cardiac-risk', scored: score !== '' })

  const complete = sex !== '' && age !== '' && smoker !== null && diabetes !== null && hdl !== '' && tc !== '' && sbp !== '' && treated !== null
  const calculate = () => {
    if (!complete) return
    setScore(frsRisk(sex as Sex, frsPoints({ sex: sex as Sex, age: num(age), smoker: !!smoker, diabetes: !!diabetes, hdl: num(hdl), tc: num(tc), sbp: num(sbp), treated: !!treated })))
  }
  /* Populate "pull[s] the values from the Chart": sex, age and the latest
     blood pressure; the lipids only where the chart holds them */
  const populate = () => {
    if (patient.sex === 'M' || patient.sex === 'F') setSex(patient.sex)
    setAge(ageYears(patient.age))
    const bp = latest('1950')?.value.split('/')
    if (bp?.[0]) setSbp(bp[0])
    if (bp?.[1]) setDbp(bp[1])
  }
  const clear = () => { setSex(''); setAge(''); setSmoker(null); setDiabetes(null); setHdl(''); setTc(''); setSbp(''); setDbp(''); setTreated(null); setScore('') }
  const save = () => { if (score) onSave({ code, name: 'CARDIAC RISK FRAMINGHAM', value: score, flag: '-', units: '%', fresh: true }) }

  const label = (text: string, w = 96) => <span style={{ width: w, flex: 'none', paddingLeft: 14 }}>{text}</span>
  const section = (title: string, shade: boolean, children: ReactNode) => (
    <div style={{ ...(shade ? grey : {}), padding: '4px 6px 8px' }}>
      <div style={{ ...blue, fontSize: 13, marginBottom: 4 }}>{title}</div>
      {children}
    </div>
  )

  return (
    <CalculatorShell
      width={592}
      height={540}
      band="FRAMINGHAM RISK SCORE (FRS)"
      bandRight={<button type="button" className="pb-link" data-tutorial-id="host.mois.command.frs-reference">Reference...</button>}
      onClose={onClose}
      onKey={keys({ populate, save, clear })}
      footer={<StandardFooter onPopulate={populate} onSave={save} canSave={!!score} onClose={onClose} onClear={clear} />}
    >
      {section('Demographic Information:', false, <>
        <div className="pb-row" style={{ gap: 12, marginBottom: 4 }}>
          {label('Gender:')}
          <PBRadio name="frs-sex" label="Male" checked={sex === 'M'} onChange={() => setSex('M')} tutorialId="host.mois.field.frs-male" />
          <PBRadio name="frs-sex" label="Female" checked={sex === 'F'} onChange={() => setSex('F')} tutorialId="host.mois.field.frs-female" />
        </div>
        <div className="pb-row">{label('Age:')}<PBInput w={50} align="center" value={age} onChange={(e) => setAge(e.target.value)} data-tutorial-id="host.mois.field.frs-age" /></div>
      </>)}
      {section('Health Condition:', true, <>
        <div className="pb-row" style={{ gap: 12, marginBottom: 12 }}>
          {label('Smoker:')}
          <PBRadio name="frs-smoker" label="Non-Smoker" checked={smoker === false} onChange={() => setSmoker(false)} tutorialId="host.mois.field.frs-non-smoker" />
          <PBRadio name="frs-smoker" label="Smoker" checked={smoker === true} onChange={() => setSmoker(true)} tutorialId="host.mois.field.frs-smoker" />
        </div>
        <div className="pb-row" style={{ gap: 12 }}>
          {label('Diabetes:')}
          <PBRadio name="frs-diabetes" label="No Diabetes" checked={diabetes === false} onChange={() => setDiabetes(false)} tutorialId="host.mois.field.frs-no-diabetes" />
          <PBRadio name="frs-diabetes" label="Diabetes" checked={diabetes === true} onChange={() => setDiabetes(true)} tutorialId="host.mois.field.frs-diabetes" />
        </div>
      </>)}
      {section('Lipids:', false, <>
        <div className="pb-row" style={{ gap: 6, marginBottom: 4 }}>{label('HDL-C:')}<PBInput w={50} align="center" value={hdl} onChange={(e) => setHdl(e.target.value)} data-tutorial-id="host.mois.field.frs-hdl" /><span>(mmol/L)</span></div>
        <div className="pb-row" style={{ gap: 6 }}>{label('Total Chol:')}<PBInput w={50} align="center" value={tc} onChange={(e) => setTc(e.target.value)} data-tutorial-id="host.mois.field.frs-total-chol" /><span>(mmol/L)</span></div>
      </>)}
      {section('Blood Pressure:', true, <>
        <div className="pb-row" style={{ gap: 6, marginBottom: 4 }}>
          {label('Systolic BP:')}<PBInput w={50} align="center" value={sbp} onChange={(e) => setSbp(e.target.value)} data-tutorial-id="host.mois.field.frs-systolic" /><span style={{ width: 60 }}>mm[Hg]</span>
          <PBRadio name="frs-treated" label="Treated" checked={treated === true} onChange={() => setTreated(true)} tutorialId="host.mois.field.frs-treated" />
          <span style={{ width: 30 }} />
          <PBRadio name="frs-treated" label="Not Treated" checked={treated === false} onChange={() => setTreated(false)} tutorialId="host.mois.field.frs-not-treated" />
        </div>
        <div className="pb-row" style={{ gap: 6 }}>{label('Diastolic BP:')}<PBInput w={50} align="center" value={dbp} onChange={(e) => setDbp(e.target.value)} data-tutorial-id="host.mois.field.frs-diastolic" /><span>mm[Hg]</span></div>
      </>)}
      <div className="pb-row" style={{ ...rule, borderTopWidth: 2, borderTopColor: '#000', gap: 8, padding: '8px 6px' }}>
        <b style={{ width: 96, textAlign: 'right' }}>SCORE:</b>
        <PBInput w={50} align="center" value={score} readOnly data-tutorial-id="host.mois.field.frs-score" />
        <span>10 Year Risk (%)</span>
        <PBButton style={{ marginLeft: 20 }} disabled={!complete} data-tutorial-id="host.mois.command.calculate-score" onClick={calculate}>Calculate Score</PBButton>
      </div>
      <div className="pb-row" style={{ ...rule, borderTopWidth: 2, borderTopColor: '#000', gap: 8, padding: '8px 6px' }}>
        <span style={{ width: 90, paddingLeft: 14, lineHeight: '13px' }}>Map Score<br />to MOIS Code:</span>
        <PBInput w={50} value={code} onChange={(e) => setCode(e.target.value)} />
        <span style={{ color: '#8a8a8a' }}>CARDIAC RISK FRAMINGHAM</span>
      </div>
    </CalculatorShell>
  )
}

/* ==========================================================================
   MOIS PEAK EXPIRATORY FLOW CALCULATOR — Hankinson et al, 1999 (NHANES III)
   ========================================================================= */

/* adult coefficients: PEF (L/s) = b0 + b1·age + b2·age² + b3·height²(cm) */
const HANKINSON: Record<string, [number, number, number, number]> = {
  'M-caucasian': [1.0523, 0.08272, -0.001301, 0.00024962],
  'F-caucasian': [0.9267, 0.06929, -0.001031, 0.00018623],
  'M-black': [2.2257, -0.04082, 0, 0.00018694],
  'F-black': [1.3597, 0.03458, -0.000847, 0.00014982],
}

function PeakFlowCalculator({ onSave, onClose }: Props) {
  const patient = usePatient()
  const latest = useLatest()
  const [sex, setSex] = useState<Sex | ''>('')
  const [age, setAge] = useState('')
  const [race, setRace] = useState<'caucasian' | 'black' | ''>('')
  const [height, setHeight] = useState('')
  const [heightNote, setHeightNote] = useState('')
  const [recent, setRecent] = useState('')
  const [best, setBest] = useState('')
  const [predicted, setPredicted] = useState('')
  const [code, setCode] = useState(calculatorMeasureCode['Predicted PEF'] || '12577')
  useScreenReport({ calculator: 'predicted-pef', predicted: predicted !== '' })

  const pct = (of: string) => {
    const a = num(recent); const b = num(of)
    return predicted && a > 0 && b > 0 ? `${Math.round((a / b) * 100)}%` : ''
  }
  const calculate = () => {
    const c = sex && race ? HANKINSON[`${sex}-${race}`] : undefined
    const a = num(age); const h = num(height)
    if (!c || !(a > 0) || !(h > 0)) return
    setPredicted(String(Math.floor((c[0] + c[1] * a + c[2] * a * a + c[3] * h * h) * 60)))
  }
  const populate = () => {
    if (patient.sex === 'M' || patient.sex === 'F') setSex(patient.sex)
    setAge(ageYears(patient.age))
    const h = latest('1948')
    if (h) { setHeight(Number(h.value).toFixed(1)); setHeightNote(`(${h.date} at age ${ageOn(patient.dob, h.date)})`) }
    const pef = latest('39951')
    if (pef) setRecent(pef.value)
  }
  const clear = () => { setSex(''); setAge(''); setRace(''); setHeight(''); setHeightNote(''); setRecent(''); setBest(''); setPredicted('') }
  const save = () => { if (predicted) onSave({ code, name: 'PREDICTED PEAK EXPIRATORY FLOW', value: predicted, flag: '-', units: 'L/min', fresh: true }) }
  const green: CSSProperties = { background: '#99ee99', padding: '1px 4px', width: 226 }

  return (
    <CalculatorShell
      width={495}
      height={410}
      band="MOIS PEAK EXPIRATORY FLOW CALCULATOR"
      onClose={onClose}
      onKey={keys({ populate, save, clear })}
      footer={<StandardFooter onPopulate={populate} onSave={save} canSave={!!predicted} onClose={onClose} onClear={clear} />}
    >
      <div className="pb-row" style={{ gap: 12, padding: '5px 8px' }}>
        <span style={{ width: 70 }}>Sex:</span>
        <PBRadio name="pef-sex" label="Male" checked={sex === 'M'} onChange={() => setSex('M')} tutorialId="host.mois.field.pef-male" />
        <PBRadio name="pef-sex" label="Female" checked={sex === 'F'} onChange={() => setSex('F')} tutorialId="host.mois.field.pef-female" />
        <span>Age:</span><PBInput w={60} align="center" value={age} onChange={(e) => setAge(e.target.value)} data-tutorial-id="host.mois.field.pef-age" />
      </div>
      <div className="pb-row" style={{ ...rule, gap: 12, padding: '5px 8px' }}>
        <span style={{ width: 70 }}>Race:</span>
        <PBRadio name="pef-race" label="Caucasion" checked={race === 'caucasian'} onChange={() => setRace('caucasian')} tutorialId="host.mois.field.pef-caucasian" />
        <PBRadio name="pef-race" label="Black" checked={race === 'black'} onChange={() => setRace('black')} tutorialId="host.mois.field.pef-black" />
      </div>
      <div style={{ ...rule, padding: '8px 8px' }}>
        <div className="pb-row" style={{ gap: 6, marginBottom: 6 }}>
          <span>Height (cm):</span>
          <PBInput w={60} align="right" value={height} onChange={(e) => { setHeight(e.target.value); setHeightNote('') }} data-tutorial-id="host.mois.field.pef-height" />
          <span>{heightNote}</span>
        </div>
        <div className="pb-row" style={{ marginBottom: 4 }}>
          <span style={{ width: 240 }}>Most Recent Peak Flow Measurement:</span>
          <PBInput w={62} value={recent} onChange={(e) => setRecent(e.target.value)} data-tutorial-id="host.mois.field.pef-recent" />
        </div>
        <div className="pb-row">
          <span style={{ width: 240 }}>Personal Best Peak Flow Measurement:</span>
          <PBInput w={62} value={best} onChange={(e) => setBest(e.target.value)} data-tutorial-id="host.mois.field.pef-best" />
        </div>
      </div>
      <div className="pb-row" style={{ ...rule, borderTopColor: '#000', gap: 10, padding: '8px 8px', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
          <div className="pb-row" style={{ gap: 6 }}><span>Predicted:</span><PBInput w={50} align="center" value={predicted} readOnly data-tutorial-id="host.mois.field.pef-predicted" /></div>
          <PBButton style={{ minWidth: 86 }} data-tutorial-id="host.mois.command.pef-calculate" onClick={calculate}>Calculate</PBButton>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={green}>Measured as % of Predicted: {pct(predicted)}</span>
          <span style={green}>Measured as % of Personal Best: {pct(best)}</span>
        </div>
      </div>
      <div className="pb-row" style={{ ...rule, borderTopColor: '#000', gap: 6, padding: '6px 8px' }}>
        <span>Measure Code:</span><PBInput w={52} value={code} onChange={(e) => setCode(e.target.value)} />
      </div>
      <div style={{ ...rule, padding: '8px 8px', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
        <button type="button" className="pb-link">Based on Hankinson et al, 1999 (Am.J Respir.Crit.Care Med)</button>
        <button type="button" className="pb-link">PEF Formulae In the Literature</button>
      </div>
    </CalculatorShell>
  )
}

/* ==========================================================================
   GESTATIONAL AGE CALCULATOR
   ========================================================================= */

const toDate = (v: string) => {
  const m = /^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/.exec(v.trim())
  return m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) : null
}
const fromDate = (d: Date) => `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${String(d.getUTCDate()).padStart(2, '0')}`
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000)
const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86400000)

type GestField = 'lnmp' | 'edc' | 'projDate' | 'projWeeks' | 'asOf' | 'current'

function GestationalAgeCalculator({ onClose }: Props) {
  const [lnmp, setLnmp] = useState('')
  const [edc, setEdc] = useState('')
  const [current, setCurrent] = useState<number | null>(null)
  const [projDate, setProjDate] = useState('')
  const [projWeeks, setProjWeeks] = useState('')
  const [asOf, setAsOf] = useState(MOIS_TODAY)
  const [focus, setFocus] = useState<GestField>('lnmp')
  useScreenReport({ calculator: 'gestational-age', calculated: current !== null })

  /* "MOIS calculates this based on the field that is in focus … at the time
     the user presses Calculate or F2" */
  const calculate = () => {
    let start = toDate(lnmp)
    if (focus === 'edc' && toDate(edc)) {
      start = addDays(toDate(edc)!, -280)
      setLnmp(fromDate(start))
    } else if (start) {
      setEdc(fromDate(addDays(start, 280)))
    } else if (toDate(edc)) {
      start = addDays(toDate(edc)!, -280)
      setLnmp(fromDate(start))
    }
    if (!start) return
    const ref = toDate(asOf)
    setCurrent(ref ? daysBetween(start, ref) / 7 : null)
    if (focus === 'projWeeks' && projWeeks.trim() !== '' && !Number.isNaN(Number(projWeeks))) {
      setProjDate(fromDate(addDays(start, Math.round(Number(projWeeks) * 7))))
    } else if (toDate(projDate)) {
      setProjWeeks((daysBetween(start, toDate(projDate)!) / 7).toFixed(1))
    }
  }
  const clear = () => { setLnmp(''); setEdc(''); setCurrent(null); setProjDate(''); setProjWeeks(''); setAsOf(MOIS_TODAY) }

  const field = (id: GestField, value: string, set: (v: string) => void, w = 82) => (
    <PBInput
      w={w}
      align="center"
      value={value}
      onFocus={() => setFocus(id)}
      onChange={(e) => set(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); calculate() } }}
      data-tutorial-id={`host.mois.field.gestation-${id === 'projDate' ? 'projection-date' : id === 'projWeeks' ? 'projection-weeks' : id === 'asOf' ? 'as-of' : id}`}
    />
  )

  return (
    <CalculatorShell
      width={493}
      height={330}
      band="GESTATIONAL AGE CALCULATOR"
      onClose={onClose}
      onKey={keys({ save: calculate, clear })}
      footer={<>
        <span />
        <span className="pb-row" style={{ gap: 6 }}>
          <PBButton style={{ minWidth: 96 }} data-tutorial-id="host.mois.command.gestation-calculate" onClick={calculate}>Calculate (F2)</PBButton>
          <PBButton style={{ minWidth: 96 }} data-tutorial-id="host.mois.command.calculator-cancel" onClick={onClose}>Cancel</PBButton>
        </span>
        <PBButton style={{ minWidth: 96 }} data-tutorial-id="host.mois.command.calculator-clear" onClick={clear}>Clear (F5)</PBButton>
      </>}
    >
      <div style={{ padding: '6px 10px', display: 'grid', gridTemplateColumns: '100px auto', rowGap: 3, justifyContent: 'start' }}>
        <span>LNMP:</span>{field('lnmp', lnmp, setLnmp)}
        <span>EDC:</span>{field('edc', edc, setEdc)}
      </div>
      <div className="pb-row" style={{ ...rule, gap: 6, padding: '8px 10px' }}>
        <span style={{ width: 94 }}>Current Gest Age:</span>
        {/* one decimal until the cursor is in it — "put their cursor in the
            Current Gestational Age field" shows the full number */}
        <PBInput
          w={50}
          align="center"
          readOnly
          value={current === null ? '' : focus === 'current' ? String(Number(current.toFixed(5))) : current.toFixed(1)}
          onFocus={() => setFocus('current')}
          data-tutorial-id="host.mois.field.gestation-current"
        />
        <span>(weeks)</span>
      </div>
      <div style={{ ...rule, padding: '8px 10px', display: 'grid', gridTemplateColumns: '100px auto', rowGap: 3, justifyContent: 'start' }}>
        <span>Projection:&nbsp;&nbsp;Date:</span>{field('projDate', projDate, setProjDate)}
        <span style={{ textAlign: 'right', paddingRight: 8 }}>Weeks:</span>{field('projWeeks', projWeeks, setProjWeeks, 50)}
      </div>
      <div className="pb-row" style={{ ...rule, gap: 6, padding: '8px 10px' }}>
        <span style={{ width: 94 }}>As of Date:</span>{field('asOf', asOf, setAsOf)}
      </div>
      <div style={{ ...rule, padding: '6px 10px', lineHeight: '18px' }}>
        <div>Tab through calculator to make entries</div>
        <div>Press &quot;Enter&quot; or &quot;F2&quot; to calculate</div>
      </div>
    </CalculatorShell>
  )
}

/* ==========================================================================
   BODY SURFACE AREA (BSA) CALCULATOR — Mosteller
   ========================================================================= */

const BSA_AVERAGES: [string, string][] = [
  ['Man', '1.90 m2'], ['Woman', '1.60 m2'], ['9 year old child', '1.07 m2'],
  ['10 year old child', '1.14 m2'], ['12-13 year old child', '1.33 m2'],
]

function BsaCalculator({ onSave, onClose }: Props) {
  const patient = usePatient()
  const latest = useLatest()
  const [cms, setCms] = useState('')
  const [kgs, setKgs] = useState('')
  const [hDate, setHDate] = useState('')
  const [wDate, setWDate] = useState('')
  const [age, setAge] = useState('')
  const [sex, setSex] = useState('')
  const [code, setCode] = useState(calculatorMeasureCode.BSA || '34086')

  const h = num(cms); const w = num(kgs)
  const bsa = h > 0 && w > 0 ? Math.sqrt((h * w) / 3600).toFixed(2) : ''
  useScreenReport({ calculator: 'bsa', calculated: bsa !== '' })

  const populate = () => {
    const ht = latest('1948'); const wt = latest('22732')
    if (ht) { setCms(Number(ht.value).toFixed(1)); setHDate(ht.date) }
    if (wt) { setKgs(Number(wt.value).toFixed(2)); setWDate(wt.date) }
    setAge(ageYears(patient.age))
    setSex(patient.sex)
  }
  const clear = () => { setCms(''); setKgs(''); setHDate(''); setWDate(''); setAge(''); setSex('') }
  const save = () => { if (bsa) onSave({ code, name: 'BODY SURFACE AREA', value: bsa, flag: '-', units: 'm2', fresh: true }) }

  const inches = h > 0 ? (h / 2.54) % 12 : 0
  const small = (v: string) => <PBInput w={36} align="center" value={v} readOnly />

  return (
    <CalculatorShell
      width={474}
      height={400}
      band="BODY SURFACE AREA (BSA) CALCULATOR"
      onClose={onClose}
      onKey={keys({ populate, save, clear })}
      footer={<StandardFooter onPopulate={populate} onSave={save} canSave={!!bsa} onClose={onClose} onClear={clear} />}
    >
      <div style={{ padding: '4px 6px' }}>
        <div className="pb-row" style={{ gap: 6, marginBottom: 4 }}>
          <span style={{ width: 84 }}>Height (cms):</span>
          <PBInput w={74} align="right" value={cms} onChange={(e) => { setCms(e.target.value); setHDate('') }} data-tutorial-id="host.mois.field.bsa-height" />
          <span style={{ width: 70 }}>{hDate}</span>
          <span>(ft):</span>{small(h > 0 ? String(Math.floor(h / 30.48)) : '-')}
          <span>(in):</span>{small(h > 0 ? inches.toFixed(1) : '-')}
        </div>
        <div className="pb-row" style={{ gap: 6 }}>
          <span style={{ width: 84 }}>Weight (kgs):</span>
          <PBInput w={74} align="right" value={kgs} onChange={(e) => { setKgs(e.target.value); setWDate('') }} data-tutorial-id="host.mois.field.bsa-weight" />
          <span style={{ width: 70 }}>{wDate}</span>
          <span>(lb):</span>{small(w > 0 ? String(Math.floor(w * 2.20462)) : '-')}
          <span>(oz):</span>{small('-')}
        </div>
      </div>
      <div style={{ ...rule, padding: '6px 6px' }}>
        <div className="pb-row" style={{ gap: 6, marginBottom: 6 }}>
          <span style={{ width: 84 }}>BSA(m2):</span>
          <PBInput w={60} align="center" value={bsa} readOnly data-tutorial-id="host.mois.field.bsa-result" />
        </div>
        <div className="pb-row" style={{ gap: 6, paddingLeft: 90 }}>
          <span>Age:</span><PBInput w={36} align="center" value={age} onChange={(e) => setAge(e.target.value)} />
          <span style={{ marginLeft: 24 }}>Sex:</span><PBInput w={24} align="center" value={sex} onChange={(e) => setSex(e.target.value)} />
        </div>
      </div>
      <div style={{ ...rule, padding: '4px 6px', display: 'flex' }}>
        <span style={{ width: 70 }}>Average<br />Values:</span>
        <div style={{ flex: '0 0 220px' }}>
          {BSA_AVERAGES.map(([who, v]) => (
            <div key={who} className="pb-row" style={{ justifyContent: 'space-between', borderBottom: '1px solid #c8c8c8', padding: '2px 0' }}>
              <span style={{ flex: '1 1 auto', textAlign: 'right', paddingRight: 24 }}>{who}</span><span style={{ width: 60 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ ...rule, padding: '4px 6px' }}>
        <div>Bases on Mosteller RD. &quot;Simplified calculation of body surface area&quot;.</div>
        <div style={{ textAlign: 'right' }}>N Engl J Med 1987;317;1098</div>
      </div>
      <div className="pb-row" style={{ ...rule, gap: 6, padding: '6px 6px' }}>
        <span>Measure Code:</span><PBInput w={60} value={code} onChange={(e) => setCode(e.target.value)} />
      </div>
    </CalculatorShell>
  )
}
