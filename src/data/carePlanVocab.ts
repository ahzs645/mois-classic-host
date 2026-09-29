/* ============================================================================
   Care Plan vocabularies — the Rule and Item Category lists a relative
   (rule-based) Care Plan element draws from, and the MEASURE concept list.

   One definition, read by Summary Settings' Care Plan Elements
   (data/summarySettings → screens/SummarySettingsView), the admin Care Plan
   Tag Templates (data/carePlanTemplates → screens/CarePlanTemplatesView) and
   the Goals folder's Quantitative Settings (data/goalVocab). React-free.
   ========================================================================= */

/** Rules a relative element can use — art. 303514: "most recent,
    initial/first, highest value (measures only) and lowest value (measures
    only)". The template capture a1d8149d2b6e shows RECENT on every row.
    `THIS RECORD` (This Record Only) is the absolute kind, not a rule. */
export const CARE_PLAN_RULES = ['RECENT', 'INITIAL', 'HIGHEST', 'LOWEST'] as const

/** The Item Category drop-down. "Dynamic/Rule based records are limited to
    these 6 categories" (art. 303514, in the article's order), plus MAR, which
    303115's DIABETES template uses (a1d8149d2b6e). No capture opens the
    drop-down, so the order is the article's; the Care Plan Templates editor
    used to list the same seven alphabetically (no source for that order). */
export const CARE_PLAN_CATEGORIES = [
  'MEASURE', 'IMAGE', 'CONSULT', 'INTERVENTION', 'PROCEDURE', 'FACILITY ADMISSION', 'MAR',
] as const

/** MEASURE concepts. The first eleven are a1d8149d2b6e's DIABETES rows,
    verbatim and in order; the rest are INFERRED. The Goals folder's MEASURE
    concept list (an INFERRED subset of these) now reads this list too. */
export const MEASURE_CONCEPTS = [
  'BMI', 'BP', 'CHOLESTEROL/HDL RATIO', 'CIGARETTES SMOKED PACKS PER DAY', 'GFR', 'HGBA1C',
  'LDL', 'TRIGLYCERIDES', 'UALB/CR', 'WAIST CIRCUMFERENCE', 'WEIGHT',
  /* INFERRED */
  'HEIGHT', 'TEMPERATURE', 'PHQ-9 TOTAL SCORE', 'FEV1/FVC', 'INR', 'DIABETIC FOOT CARE',
]
