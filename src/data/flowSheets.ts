import { pad2 } from './clock'

/* ============================================================================
   Flow Sheet Review's data: the six CDM flow sheets the Type drop-down
   offers, and the element rows each one prints (FlowSheetWindows.tsx draws
   them).

   PROVENANCE
   - Drive `MOIS Screenshot/` 2026-07-27 12.11.17 / 12.11.27 PM — the current
     build's DIABETES flow sheet, scrolled to the top and then to the bottom:
     every element row from Review BS Records? to Pneumococcal Vaccination,
     then a long dashed rule, LONG TERM MEDICATIONS and one row per
     long-term medication. This is the whole DIABETES element list; the
     older art. 303789 image (`570bfeac`) is cut off at Insulin.
   - art. 303789 `570bfeac` (step 3b) — the Type list.
   - System Settings (data/systemSettings.ts): `Flow Sheet Period` = 2,
     "Default Period Length in Years".
   ========================================================================= */

/** The Flowsheet list the Type drop-down drops (570bfeac, step 3b). */
export const FLOWSHEET_TYPES = [
  { flowsheet: 'ASTHMA', description: 'ASTHMA CDM FLOWSHEET' },
  { flowsheet: 'CHF', description: 'CHF CDM FLOWSHEET' },
  { flowsheet: 'COPD', description: 'COPD CDM FLOWSHEET' },
  { flowsheet: 'DIABETES', description: 'DIABETES CDM FLOWSHEET' },
  { flowsheet: 'HEPC', description: 'HEPC CDM FLOWSHEET' },
  { flowsheet: 'HTN', description: 'HTN CDM FLOWSHEET' },
]

/** `Flow Sheet Period` (years) from System Settings. */
export const FLOW_SHEET_PERIOD = 2

/** The default From date: today less the period. The 2026-07-27 captures
    print "DATE RANGE: 2024.07.27 TO 2026.07.27" — exactly two years. The
    older help-site images (art. 303789, 303225) start a day later
    (2014.06.04 – 2016.06.03); the current build wins. */
export function periodStart(today: string, years = FLOW_SHEET_PERIOD): string {
  const [y, m, d] = today.split('.').map(Number)
  const t = new Date(Date.UTC(y - years, m - 1, d))
  return `${t.getUTCFullYear()}.${pad2(t.getUTCMonth() + 1)}.${pad2(t.getUTCDate())}`
}

/* ============================================================================
   The element list per flow sheet.

   A flow sheet is a Designer ▸ Flowsheet definition (art. 303098): ordered
   labels, each bound to a data source — Measure, Long Term Medications, an
   Encounter Form question, the CDM forms (Asthma, Diabetes, …). Only
   DIABETES is captured; the other five are NOT in any capture or article,
   and their rows are a reasonable reading of the matching Health
   Maintenance concept (the COPD list follows the art. 304722 concept table).

   `form` rows read a form answer a chart export does not carry, so they
   print empty. That includes the medication elements (ACE Inhibitor,
   Metformin, ASA, Insulin, ARB): the 2026-07-27 capture shows every one of
   them empty across all thirteen date columns while the patient's LONG TERM
   MEDICATIONS list has METFORMIN bars running through the same dates, so
   they are not fed by the long-term medications. INFERRED: they are CDM-form
   answers like the rows around them.
   ========================================================================= */
export type FlowSheetElement =
  | { kind: 'measure'; label: string; codes?: string[]; match?: RegExp }
  | { kind: 'form'; label: string }
  | { kind: 'sep'; label: string }

const m = (label: string, codes: string[], match?: RegExp): FlowSheetElement => ({ kind: 'measure', label, codes, match })
const d = (label: string, match: RegExp): FlowSheetElement => ({ kind: 'measure', label, match })
const q = (label: string): FlowSheetElement => ({ kind: 'form', label })
/** the short separator row, four hyphens (2026-07-27 capture) */
const SEP: FlowSheetElement = { kind: 'sep', label: '----' }

/** The rule MOIS prints under the last element, before the long-term
    medications: twenty-three hyphens, counted off both 2026-07-27 captures. */
export const LTM_RULE = '-'.repeat(23)
export const LTM_HEADING = 'LONG TERM MEDICATIONS'

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
const ACE = q('ACE Inhibitor')
const BETA = q('Beta Blocker')
const ICS = q('Inhaled Corticosteroid')

export const FLOWSHEET_ELEMENTS: Record<string, FlowSheetElement[]> = {
  /* transcribed from the 2026-07-27 captures, top to bottom */
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
    q('Metformin'),
    q('ASA'),
    q('Insulin'),
    q('ARB'),
    SEP,
    q('Eye Examination'),
    q('Peripheral Anaesthesia'),
    q('Neuropathy Symptoms - Peripheral'),
    q('Neuropathy Symptoms - Focal'),
    q('Neuropathy Symptoms - Autonomic'),
    SEP,
    q('Self Management Goals?'),
    q('Insulin Self Management?'),
    q('Diabetes/Lipid Education'),
    /* INFERRED: form answers rather than immunization records — both rows
       are empty in the capture */
    q('Influenza Vaccination'),
    q('Pneumococcal Vaccination'),
  ],
  /* not in any capture or article — see above */
  ASTHMA: [
    m('Peak Expiratory Flow', ['39951']),
    d('FEV1 % Predicted', /FEV1 %/),
    d('FEV1/FVC', /FEV1\/FVC/),
    m('Oxygen Saturation', ['34683']),
    SMOKING,
    SEP,
    ICS,
    q('Short Acting Beta Agonist'),
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
    q('Diuretic'),
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
    q('Anticholinergic'),
    q('Long Acting Beta Agonist'),
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
    q('ARB'),
    q('Thiazide Diuretic'),
    q('Calcium Channel Blocker'),
    BETA,
  ],
}
