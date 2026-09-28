/* ============================================================================
   Care Plan Templates — the Administration ▸ Designer Section list ("Care
   Plan Tag Template List") and the elements each template carries.

   One module, read by both ends of the feature:
     - the admin authoring screen (screens/CarePlanTemplatesView.tsx), which
       creates, edits and deletes templates;
     - Patient Chart ▸ Care Plan ▸ Summary Settings ▸ Add from Template
       (screens/SummarySettingsView.tsx), which copies a template's elements
       onto the open chart as relative (rule-based) Care Plan Elements.

   A template element is a rule, never a record: "the N most RECENT records
   of this code / concept, shown in this section at this rank" (art. 303115:
   "Add elements to the Care Plan template to specify the type and number of
   records that will be shown on the Care Plan Summary").

   PROVENANCE: art. 303115.
     f158827a261d  the list (v02.22.92): DIABETES / Diabetic Care Plan, HIV /
                   HIV Care Plan, COPD / COPD Care Plan, HTN / Hypertension
                   Care Plan, CHF / Congestive Heart Failure Care Plan.
     a1d8149d2b6e  DIABETES's detail: Item Category · Care Plan Section ·
                   Rank · Identified By (Code / Concept radios) ·
                   Identification · … · Rule · No. of Records, fifteen rows,
                   every one RECENT / 1 / rank 10 / Concept.
   The other four templates' elements are not captured; theirs below are
   synthetic training data in the same shape (INFERRED).

   An admin-module demonstration dataset (not chart data), so it is global
   rather than per chart; edits last for the session.
   ========================================================================= */
import { useSyncExternalStore } from 'react'

/** the Item Category drop-down: the capture's three plus the article 303514
    categories a rule can pull (Measure, Image, Consult, Intervention,
    Procedure, Facility Admission) */
export const TEMPLATE_CATEGORIES = [
  'CONSULT', 'FACILITY ADMISSION', 'IMAGE', 'INTERVENTION', 'MAR', 'MEASURE', 'PROCEDURE',
] as const

/** the capture shows RECENT only; art. 303514 names the four rules
    ("most recent, initial/first, highest value (measures only) and lowest
    value (measures only)") */
export const TEMPLATE_RULES = ['RECENT', 'INITIAL', 'HIGHEST', 'LOWEST'] as const

/** the Care Plan Section column's values as a1d8149d2b6e prints them */
export const TEMPLATE_SECTIONS = ['CONSULTS', 'MAR', 'MEASUREMENTS', 'IMAGING', 'INTERVENTIONS', 'PROCEDURES', 'GENERAL'] as const

/** the section an Item Category files under by default (a1d8149d2b6e:
    CONSULT → CONSULTS, MAR → MAR, MEASURE → MEASUREMENTS) */
export const SECTION_FOR_CATEGORY: Record<string, string> = {
  CONSULT: 'CONSULTS', MAR: 'MAR', MEASURE: 'MEASUREMENTS', IMAGE: 'IMAGING',
  INTERVENTION: 'INTERVENTIONS', PROCEDURE: 'PROCEDURES', 'FACILITY ADMISSION': 'GENERAL',
}

/**
 * The concept vocabulary each category's Identification offers. MEASURE's,
 * CONSULT's and MAR's are the capture's own; the rest are INFERRED.
 */
export const TEMPLATE_CONCEPTS: Record<string, string[]> = {
  CONSULT: ['DIABETES EDUCATION ASSESSMENT', 'OPHTHALMOLOGY ASSESSMENT', 'HOME CARE NURSING', 'RESPIRATORY THERAPY'],
  MAR: ['INFLUENZA VACCINE', 'PNEUMOCOCCAL VACCINE'],
  MEASURE: [
    'BMI', 'BP', 'CHOLESTEROL/HDL RATIO', 'CIGARETTES SMOKED PACKS PER DAY', 'GFR', 'HGBA1C',
    'LDL', 'TRIGLYCERIDES', 'UALB/CR', 'WAIST CIRCUMFERENCE', 'WEIGHT', 'HEIGHT', 'TEMPERATURE',
    'PHQ-9 TOTAL SCORE', 'FEV1/FVC', 'INR', 'DIABETIC FOOT CARE',
  ],
  IMAGE: ['CHEST X-RAY', 'ECHOCARDIOGRAM', 'MAMMOGRAM'],
  INTERVENTION: ['SMOKING CESSATION COUNSELLING', 'DIABETIC FOOT EXAM'],
  PROCEDURE: ['SPIROMETRY', 'ECG'],
  'FACILITY ADMISSION': ['HOSPITAL ADMISSION'],
}

export type TemplateElement = {
  category: string
  section: string
  rank: string
  identifiedBy: 'Code' | 'Concept'
  /** the code or the concept, per identifiedBy */
  identification: string
  rule: string
  records: string
}

export type CarePlanTemplate = {
  id: string
  /** the list's Description — `DIABETES` */
  desc: string
  /** the list's Detail — `Diabetic Care Plan` */
  detail: string
  elements: TemplateElement[]
}

const el = (category: string, identification: string, rule = 'RECENT', records = '1', section = SECTION_FOR_CATEGORY[category] ?? 'GENERAL'): TemplateElement =>
  ({ category, section, rank: '10', identifiedBy: 'Concept', identification, rule, records })

/** a1d8149d2b6e's fifteen rows, verbatim and in order */
const DIABETES: TemplateElement[] = [
  el('CONSULT', 'DIABETES EDUCATION ASSESSMENT'),
  el('CONSULT', 'OPHTHALMOLOGY ASSESSMENT'),
  el('MAR', 'INFLUENZA VACCINE'),
  el('MAR', 'PNEUMOCOCCAL VACCINE'),
  el('MEASURE', 'BMI'),
  el('MEASURE', 'BP'),
  el('MEASURE', 'CHOLESTEROL/HDL RATIO'),
  el('MEASURE', 'CIGARETTES SMOKED PACKS PER DAY'),
  el('MEASURE', 'GFR'),
  el('MEASURE', 'HGBA1C'),
  el('MEASURE', 'LDL'),
  el('MEASURE', 'TRIGLYCERIDES'),
  el('MEASURE', 'UALB/CR'),
  el('MEASURE', 'WAIST CIRCUMFERENCE'),
  el('MEASURE', 'WEIGHT'),
]

const SEED: CarePlanTemplate[] = [
  { id: 'cpt-diabetes', desc: 'DIABETES', detail: 'Diabetic Care Plan', elements: DIABETES },
  /* synthetic from here down (INFERRED): the list rows are captured, their
     elements are not */
  { id: 'cpt-hiv', desc: 'HIV', detail: 'HIV Care Plan', elements: [el('MEASURE', 'GFR'), el('MEASURE', 'WEIGHT'), el('MAR', 'PNEUMOCOCCAL VACCINE')] },
  { id: 'cpt-copd', desc: 'COPD', detail: 'COPD Care Plan', elements: [el('MEASURE', 'FEV1/FVC', 'RECENT', '2'), el('MEASURE', 'CIGARETTES SMOKED PACKS PER DAY'), el('MAR', 'INFLUENZA VACCINE'), el('CONSULT', 'RESPIRATORY THERAPY')] },
  { id: 'cpt-htn', desc: 'HTN', detail: 'Hypertension Care Plan', elements: [el('MEASURE', 'BP', 'RECENT', '3'), el('MEASURE', 'WEIGHT'), el('MEASURE', 'GFR')] },
  { id: 'cpt-chf', desc: 'CHF', detail: 'Congestive Heart Failure Care Plan', elements: [el('MEASURE', 'WEIGHT', 'RECENT', '3'), el('MEASURE', 'BP'), el('CONSULT', 'HOME CARE NURSING'), el('IMAGE', 'ECHOCARDIOGRAM')] },
]

let templates: CarePlanTemplate[] = SEED
let seq = 0
const listeners = new Set<() => void>()
let version = 0
const emit = () => { version += 1; listeners.forEach((l) => l()) }
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }

/** re-render on any change, then read the list */
export function useCarePlanTemplates(): CarePlanTemplate[] {
  useSyncExternalStore(subscribe, () => version, () => version)
  return templates
}

export const carePlanTemplates = (): CarePlanTemplate[] => templates

/** add a template; returns its id */
export function addCarePlanTemplate(t: Omit<CarePlanTemplate, 'id'>): string {
  const id = `cpt-session-${++seq}`
  templates = [...templates, { ...t, id }]
  emit()
  return id
}

export function updateCarePlanTemplate(id: string, patch: Partial<Omit<CarePlanTemplate, 'id'>>) {
  templates = templates.map((t) => (t.id === id ? { ...t, ...patch } : t))
  emit()
}

export function deleteCarePlanTemplate(id: string) {
  templates = templates.filter((t) => t.id !== id)
  emit()
}

/** back to the captured list */
export function resetCarePlanTemplates() {
  templates = SEED
  version += 1
}

export const blankTemplateElement = (): TemplateElement =>
  ({ category: 'MEASURE', section: 'MEASUREMENTS', rank: '10', identifiedBy: 'Concept', identification: '', rule: 'RECENT', records: '1' })
