/* ============================================================================
   The Measurements command row's four dialogs.

   Transcribed from captures of MOIS: TRAINING on chart 3924 — `Template`
   (the ENCOUNTER WINDOW measure grid), `Other Template` (Measure Template /
   Panel Selection) and `Calculator` (Measure Calculators, then the calculator
   itself).
   ========================================================================= */

export type MeasureSlot = {
  code: string
  name: string
  units: string
}

/**
 * The `ENCOUNTER WINDOW` template: the standard measures an encounter records,
 * in template order rather than code order. MOIS opens it as a grid of empty
 * Value/Flag cells — one row per measure — and files whichever rows were
 * filled in when `Save Changes (F2)` is pressed.
 */
export const encounterWindowMeasures: MeasureSlot[] = [
  { code: '1950', name: 'BLOOD PRESSURE (SYSTOLIC/DIASTOLIC)', units: 'mm Hg' },
  { code: '61828', name: 'BLOOD PRESSURE - LYING', units: 'mm HG' },
  { code: '61826', name: 'BLOOD PRESSURE - SITTING', units: 'mm HG' },
  { code: '61827', name: 'BLOOD PRESSURE - STANDING', units: 'mm HG' },
  { code: '2011', name: 'PULSE RATE / MIN', units: '/min' },
  { code: '1948', name: 'HEIGHT', units: 'Cms' },
  { code: '22732', name: 'WEIGHT', units: 'kg' },
  { code: '1984', name: 'WAIST CIRCUMFERENCE', units: 'cm' },
  { code: '951', name: 'BODY MASS INDEX', units: '' },
  { code: '2010', name: 'TEMPERATURE', units: 'Deg C' },
  { code: '34738', name: 'HEART RATE', units: '' },
  { code: '35158', name: 'RESPIRATORY RATE', units: '' },
  { code: '34683', name: 'OXYGEN SATURATION', units: '' },
  { code: '39951', name: 'PEAK EXPIRATORY FLOW', units: '' },
  { code: '34494', name: 'CIGARETTES SMOKED.CURRENT (PACK/DAY)', units: '' },
  { code: '84643', name: 'CANNABIS SMOKED (G/DAY)', units: 'g/day' },
  { code: '84645', name: 'CANNABIS SMOKED (JOINTS/DAY)', units: 'joints/day' },
  { code: '84647', name: 'CANNABIS INGESTED (MG/DAY)', units: 'mg/day' },
  { code: '84649', name: 'CANNABIS CONCENTRATES (HITS/DAY)', units: 'hits/day' },
  { code: '39959', name: 'PHYSICAL ACTIVITY MINUTES PER WEEK', units: 'mins/wk' },
  { code: '39957', name: 'ALCOHOL DRINKS PER WEEK', units: 'drinks/wk' },
  { code: '13095', name: 'LEUKOCYTES UR STRIP POCT', units: '' },
  { code: '1835', name: 'URINE BLOOD', units: '/uL' },
  { code: '1900', name: 'URINE PROTEIN', units: 'g/L' },
  { code: '15551', name: 'URINE GLUCOSE STRIP-SCNC', units: '' },
  { code: '15548', name: 'KETONES UR STRIP-SCNC', units: '' },
  { code: '1831', name: 'URINE UROBILINOGEN', units: 'umol/L' },
]

/** The Flag column of a measure grid is a drop-down, not free text. */
export const measureFlags = ['', '-', 'L', 'H', 'LL', 'HH', 'A', 'N']

export type MeasureTemplate = {
  name: string
  description: string
  /** a TEMPLATE is a measure list; a PANEL is a scored instrument */
  type: 'TEMPLATE' | 'PANEL'
}

/**
 * `Other Template` opens `Measure Template / Panel Selection` over this list.
 *
 * The three `… STATUS` panels here are the Determinants of Health domains —
 * Education, Employment and Housing are each a real MOIS panel, which is the
 * evidence that the Determinants tabs are a genuine MOIS feature rather than
 * an extrapolation.
 */
export const measureTemplates: MeasureTemplate[] = [
  { name: 'ATLIN URINE POC', description: 'POC Urine Testing for Atlin', type: 'TEMPLATE' },
  { name: 'BLOOD PRESSURE DETAIL', description: '', type: 'TEMPLATE' },
  { name: 'COMMON MEASURES', description: '', type: 'TEMPLATE' },
  { name: 'EDUCATION STATUS', description: 'Patients current education status', type: 'PANEL' },
  { name: 'EMPLOYMENT STATUS', description: "Patient's current employment status", type: 'PANEL' },
  { name: 'ENCOUNTER WINDOW', description: 'LIST OF STANDARD MEASUREMENTS FOR THE ENCOUNTER WINDOW', type: 'TEMPLATE' },
  { name: 'EYE EXAM', description: '', type: 'TEMPLATE' },
  { name: 'FALL PREVENTION VISIT', description: 'SET TO FALL PREVENTION MEASURES', type: 'TEMPLATE' },
  { name: 'FALLS - COMMUNITY FALLS PREVENTION 3Q SCREENER', description: '3 question falls risk screener (do multifactorial assessment if 1+ yes response(s))', type: 'PANEL' },
  { name: 'FALLS - STAYING INDEPENDENT CHECKLIST', description: '12 item falls risk screener (do multifactorial assessment if score 4+)', type: 'PANEL' },
  { name: 'HIB CASE - TRAVEL DURING COMMUNICABILITY PERIOD', description: 'Haemophilus Influenza Type B Supplemental Questionnaire: CASE', type: 'PANEL' },
  { name: 'HIB CONTACT QUESTIONNAIRE', description: '', type: 'TEMPLATE' },
  { name: 'HIB SUPPLEMENTAL QUESTIONNAIRE: CASE', description: 'Haemophilus Influenza Type B Supplemental Questionnaire: CASE', type: 'PANEL' },
  { name: 'HIB SUPPLEMENTAL QUESTIONNAIRE: CONTACT', description: 'Haemophilus Influenza Type B Supplemental Questionnaire for CONTACTS', type: 'PANEL' },
  { name: 'HOP 6MW', description: 'MEASURES FOR THE 6 MINUTE WALKING TEST', type: 'TEMPLATE' },
  { name: 'HOUSING STATUS', description: 'Patients current housing status', type: 'PANEL' },
  { name: 'IOAT MEASURES', description: 'Measures for the iOAT and Needle Exchange Program', type: 'TEMPLATE' },
  { name: 'LOCUS', description: '', type: 'TEMPLATE' },
  { name: 'MEDICATION ASSESSMENT TB', description: 'Assessment for clients on TB medications Latent and Active', type: 'TEMPLATE' },
  { name: 'METABOLIC MONITORING', description: '', type: 'TEMPLATE' },
  { name: 'MHSU MEASURES', description: 'Mental Health & Substance Use Measures', type: 'TEMPLATE' },
  { name: 'MRC BREATHLESSNESS SCALE', description: 'Degree of breathlessness related to activities', type: 'TEMPLATE' },
  { name: 'NGC INTAKE LV', description: 'NGC INTAKE LV', type: 'TEMPLATE' },
  { name: 'PH COVID DAILY MONITORING', description: 'Active Daily Monitoring form for COVID-19', type: 'TEMPLATE' },
  { name: 'POCT ACUTE', description: 'Point of Care tests that require lab accreditation performed in Acute settings', type: 'PANEL' },
  { name: 'POCT NON ACUTE', description: 'Point of care tests that do not require lab accreditation in Primary and Community Care sites', type: 'PANEL' },
  { name: 'POCT URINALYSIS MACHINE READ', description: 'Point of care urine dipstick machine read done in Primary and Community Care sites', type: 'PANEL' },
  { name: 'POCT URINALYSIS MANUAL READ', description: 'Point of care urine dipstick manual read done in Primary and Community Care sites', type: 'PANEL' },
]

/** `Calculator` opens `Measure Calculators` over this list. */
export const measureCalculators = ['BMI', 'BSA', 'Cardiac Risk', 'Predicted PEF', 'Gestational Age']

/** The measure each calculator writes back, shown in its `Measure Code` box. */
export const calculatorMeasureCode: Record<string, string> = {
  BMI: '951',
  BSA: '3140',
  'Cardiac Risk': '',
  'Predicted PEF': '39951',
  'Gestational Age': '11884',
}

/** The classification table the BMI calculator prints under its fields. */
export const bmiClassification: { label: string; range: string; detail?: [string, string][] }[] = [
  {
    label: 'Underweight:',
    range: '< 18.5 kg',
    detail: [
      ['Severe thinness', '<16.00'],
      ['Moderate thinness', '16.00 - 16.99'],
      ['Mild thinness', '17.00 - 18.49'],
    ],
  },
  { label: 'Normal Weight:', range: '18.50 - 24.99' },
  { label: 'Overweight:', range: '25.00 - 29.99' },
  {
    label: 'Obese:',
    range: '>= 30.00',
    detail: [
      ['Obese Class I', '30.00 - 34.99'],
      ['Obese Class II', '35.00 - 39.99'],
      ['Obese Class III', '>= 40.00'],
    ],
  },
]
