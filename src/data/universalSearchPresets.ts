import type { UniversalSearchRow } from './encounterPickers'

/* ============================================================================
   What the Universal Search Window opens on, by the field that raised it.

   MOIS binds each code field to a lookup setting: which code systems the
   window offers, which reference sets it lists and which of those are ticked.
   The window is the same one the encounter's Health Issues `…` opens; only
   its parameters and first page of terms differ.

   PROVENANCE: 2026-09-29 TRAINING captures on chart 3924 (PATCH AADAMS):
   · c11 — Imaging Reports ▸ Test Name `…`: SNOMED-CT alone, ticked; MEDICAL
     IMAGING alone, ticked; no `More…` row; Alternate Terms [1].
   · c13 — Consult Reports ▸ Reason `…`: ICD-9, NHA CUSTOM and SNOMED-CT all
     ticked, then `More…`; CONSULT REQUESTS (AIHS) ticked, HEALTH CONCERNS and
     HEALTH CONCERNS (BC) not; Alternate Terms [4].
   Rows are the first screenful each capture paints, verbatim, in its order.
   ========================================================================= */

export type UniversalSearchPresetId = 'medical-imaging' | 'consult-requests'

export type UniversalSearchPreset = {
  /** the code systems offered, all ticked */
  systems: string[]
  /** the Reference Set(s) pane's list */
  referenceSets: string[]
  /** the reference sets ticked when the window opens */
  checkedSets: string[]
  /** whether the Code System(s) pane ends in a greyed `More…` row */
  more: boolean
  /** the page of terms the window opens on */
  page: UniversalSearchRow[]
}

const MEDICAL_IMAGING = 'MEDICAL IMAGING'
const CONSULT_REQUESTS = 'CONSULT REQUESTS (AIHS)'

const imaging = (term: string, code: string, alternates: string[] = []): UniversalSearchRow => (
  { term, category: 'PROCEDURE', code, system: 'SNOMED-CT', alternates, sets: [MEDICAL_IMAGING] }
)

const consult = (term: string, category: string, code: string, alternates: string[] = []): UniversalSearchRow => (
  { term, category, code, system: 'SNOMED-CT', alternates, sets: [CONSULT_REQUESTS] }
)

/* c11. Only the first row's alternates are shown (the current row). */
const IMAGING_PAGE: UniversalSearchRow[] = [
  imaging('ACUTE GASTROINTESTINAL BLOOD LOSS IMAGING', '17984001', ['ACUTE GASTROINTESTINAL BLOOD LOSS IMAGING (PROCEDURE)']),
  imaging('ANGIOGRAPHY OF EXTERNAL CAROTID ARTERY', '241220000'),
  imaging('ANGIOGRAPHY OF EYE USING FLUORESCEIN', '172581008'),
  imaging('ANGIOGRAPHY OF INTRACRANIAL VASCULAR STRUCTURE USING RADIOACTIVE ISOTOPE', '169161000'),
  imaging('ANGIOGRAPHY OF LEFT RENAL ARTERY', '287582002'),
  imaging('ANGIOGRAPHY OF SUBCLAVIAN ARTERY', '175462006'),
  imaging('ANGIOGRAPHY OF THYROID ARTERY', '287595007'),
  imaging('ANGIOGRAPHY USING INDOCYANINE GREEN', '252823001'),
  imaging('ARTHROGRAPHY OF ANKLE JOINT', '241203004'),
  imaging('ARTHROGRAPHY OF ANKLE WITH POSITIVE CONTRAST', '51808006'),
  imaging('ARTHROGRAPHY OF KNEE WITH POSITIVE CONTRAST', '91360003'),
  imaging('ARTHROGRAPHY OF WRIST', '46822003'),
  imaging('ASPIRATION OF FOOT USING ULTRASOUND GUIDANCE', '432148009'),
  imaging('ASPIRATION OF HAND USING FLUOROSCOPIC GUIDANCE', '432071009'),
  imaging('ASPIRATION OF OVARIAN CYST USING ULTRASOUND GUIDANCE', '433176007'),
  imaging('ASPIRATION OF SHOULDER USING FLUOROSCOPIC GUIDANCE', '432784006'),
]

/* c13. The first row's pane reads [4] but paints three lines above its
   scrollbar; the fourth is not visible and is left out rather than guessed,
   so the emulator counts [3]. */
const CONSULT_PAGE: UniversalSearchRow[] = [
  consult('ACTIVE OR PASSIVE IMMUNIZATION', 'PROCEDURE', '127785005', [
    'ADMINISTRATION OF SUBSTANCE TO PRODUCE IMMUNITY, EITHER ACTIVE OR PASSIVE',
    'ADMINISTRATION TO PRODUCE IMMUNITY, EITHER ACTIVE OR PASSIVE',
    'ADMINISTRATION OF SUBSTANCE TO PRODUCE IMMUNITY, EITHER ACTIVE OR PASSIVE (PROCEDURE)',
  ]),
  consult('ACTIVITIES OF DAILY LIVING ASSESSMENT', 'PROCEDURE', '304492001'),
  consult('ACUTE SITUATIONAL DISTURBANCE', 'CLINICAL FINDING', '192041001'),
  consult('ACUTE STRESS DISORDER', 'CLINICAL FINDING', '67195008'),
  consult('ADMINISTRATION OF MEDICATION', 'PROCEDURE', '18629005'),
  consult('ADULT REHABILITATION ADMISSION ASSESSMENT', 'PROCEDURE', '424074007'),
  consult('ADVANCE CARE PLANNING', 'PROCEDURE', '713603004'),
  consult('ALLERGY EDUCATION', 'PROCEDURE', '58332002'),
  consult('ALLERGY TO FOOD', 'CLINICAL FINDING', '414285001'),
  consult('ASSESSMENT FOR GASTROSTOMY TUBE INSERTION', 'PROCEDURE', '711377002'),
  consult('ASSESSMENT FOR HOME OXYGEN THERAPY', 'PROCEDURE', '445966008'),
  consult('ASSESSMENT FOR LONG TERM OXYGEN THERAPY', 'PROCEDURE', '428342003'),
  consult('ASSESSMENT FOR SIGN OF DISCOMFORT', 'PROCEDURE', '710855004'),
  consult('ASSESSMENT OF ABILITY TO COMMUNICATE BY TALKING', 'PROCEDURE', '709254006'),
  consult('ASSESSMENT OF ABILITY TO PERFORM CARETAKING', 'PROCEDURE', '712533008'),
  consult('ASSESSMENT OF ABILITY TO PREPARE FOOD', 'PROCEDURE', '709256008'),
]

export const UNIVERSAL_SEARCH_PRESETS: Record<UniversalSearchPresetId, UniversalSearchPreset> = {
  /* Imaging Reports ▸ Test Name `…` (c11) */
  'medical-imaging': {
    systems: ['SNOMED-CT'],
    referenceSets: [MEDICAL_IMAGING],
    checkedSets: [MEDICAL_IMAGING],
    more: false,
    page: IMAGING_PAGE,
  },
  /* Consult Reports ▸ Reason `…` (c13) */
  'consult-requests': {
    systems: ['ICD-9', 'NHA CUSTOM', 'SNOMED-CT'],
    referenceSets: [CONSULT_REQUESTS, 'HEALTH CONCERNS', 'HEALTH CONCERNS (BC)'],
    checkedSets: [CONSULT_REQUESTS],
    more: true,
    page: CONSULT_PAGE,
  },
}

export const isUniversalSearchPreset = (v: unknown): v is UniversalSearchPresetId => (
  typeof v === 'string' && Object.prototype.hasOwnProperty.call(UNIVERSAL_SEARCH_PRESETS, v)
)
