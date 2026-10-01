import { formLetterRows, type FormLetterRow } from './chartUtilities'

/* ============================================================================
   Add Attachment ▸ Attach Form / Letter — the template list.

   PROVENANCE: 2026-09-29 TRAINING capture c09 (chart 3924, Attachment on a
   chart report folder). The list opens on the FORMS band with the recent
   list set to 0, so no RECENT band is painted. The rows below are every row
   the capture shows, verbatim and in the capture's order, including its
   spelling (`ADULT SAFTEY PLAN`) and its blank Source/Org on
   `003-KAMLOOPS PRIMARY NETWORK`. The list is not alphabetical at its head:
   PALLIATIVE CARE PROGRAM REGISTRATION FORM comes first, as captured.

   The row under the last one here is cut off by the grid's bottom edge in
   the capture, so it is not transcribed.
   ========================================================================= */

const form = (description: string, source: string, docType: string): FormLetterRow =>
  ({ group: 'FORMS', description, source, docType, spare: '' })

/** c09's FORMS rows, in order. */
export const C09_FORM_ROWS: FormLetterRow[] = [
  form('PALLIATIVE CARE PROGRAM REGISTRATION FORM', 'NH', 'REFERRAL'),
  form('(PAGE 1) LTC APPLICATION FORM HOME AND COMMUNITY CARE', 'NH', 'HCC'),
  form('(PAGE 2) LTC HCC LTC ASSESSMENT/SERVICE APPROVAL', 'NH', 'HCC'),
  form('003-KAMLOOPS PRIMARY NETWORK', '', 'REFERRAL'),
  form('01 DOT APPLICATION OF EYE OINTMENT', 'NH', 'HCC'),
  form('01 DOT APPLICATION OF MEDICATED OINTMENT/CREAM', 'NH', 'HCC'),
  form('01 DOT APPLICATION/REMOVAL OF MEDICATED TRANSDERMAL PATCH', 'NH', 'HCC'),
  form('01 DOT INSERTION OF RECTAL SUPPOSITORIES', 'NH', 'HCC'),
  form('01 DOT VAGINAL MEDICATION', 'NH', 'HCC'),
  form('05 A MSK AND LUMBAR MRI APPROPRIATENESS CHECKLIST (UHNBC)', 'NH', 'ASSESSMENT'),
  form('05 MAGNETIC RESONANCE IMAGING (MRI) REQUISITION (ALL SITES)', 'NH', 'REQ-IMG'),
  form('1 INSULIN START CHECKLIST AND RECORD FORM', 'NH', 'COMM-CARE'),
  form('ABNORMAL INVOLUNTARY MOVEMENT SCALE (AIMS)', 'MISC', 'MISC'),
  form('ACCESS TO PHARMANET AGREEMENT', 'MISC', 'MISC'),
  form('ACQUIRED BRAIN INJURY SERVICES REFERRAL FORM', 'MISC', 'REFERRAL'),
  form('ADMISSION AND DISCHARGE PROFESSIONAL SERVICES', 'NH', 'MISC'),
  form('ADOLESCENT SAFETY PLAN', 'NH', 'MISC'),
  form('ADULT ADHD SELF-REPORT SCALE SYMPTOM CHECKLIST INSTRUCTION', 'MISC', 'MISC'),
  /* the capture clips this Source/Org to `NORTHERN H…`; the rest of the word
     is INFERRED, and the column clips it the same way */
  form('ADULT NIH STROKE SCALE', 'NORTHERN HEALTH', 'MISC'),
  form('ADULT OUTPATIENT DIETITIAN REFERRAL', 'NH', 'REFERRAL'),
  form('ADULT OUTPATIENT NUTRITION COUNSELLING RECORD', 'NH', 'ASSESSMENT'),
  form('ADULT PALLIATIVE CARE CRISIS EVENT MAR', 'NH', 'MISC'),
  form('ADULT SAFTEY PLAN', 'NH', 'MISC'),
  form('ADVERSE CHILDHOOD EXPERIENCE (ACE) QUESTIONNAIRE', 'NH', 'HCC'),
]

/**
 * The FORMS rows from the older captures (`303790`, data/chartUtilities.ts)
 * that c09 does not contradict. They sort after c09's visible `A…` run, so
 * they sit below it. `ADVANCE CARE PLANNING - MY VOICE` is left out: it would
 * sort inside the stretch c09 shows, and c09 has no such row.
 */
const OLDER_FORM_ROWS = formLetterRows.filter(
  (r) => r.group === 'FORMS'
    && r.description !== 'ADVANCE CARE PLANNING - MY VOICE'
    && !C09_FORM_ROWS.some((c) => c.description === r.description),
)

/** The RECENT band's candidates (`303790`), newest first; the dialog shows as
    many as `Maximum Items in Your Recent List` allows. */
export const RECENT_FORM_ROWS: FormLetterRow[] = formLetterRows.filter((r) => r.group === 'RECENT')

/** The PHSA eFORMS band (3001613 / 3001611), painted under FORMS. */
const PHSA_FORM_ROWS: FormLetterRow[] = formLetterRows.filter((r) => r.group === 'PHSA eFORMS')

/** Every row but RECENT, in painting order. */
export const ATTACH_FORM_ROWS: FormLetterRow[] = [...C09_FORM_ROWS, ...OLDER_FORM_ROWS, ...PHSA_FORM_ROWS]

/** c09: `Maximum Items in Your Recent List: 0`. */
export const DEFAULT_RECENT_LIMIT = 0

/** The rows the grid paints for a given recent limit. */
export const attachFormRowsFor = (recentLimit: number): FormLetterRow[] =>
  [...RECENT_FORM_ROWS.slice(0, Math.max(0, recentLimit)), ...ATTACH_FORM_ROWS]
