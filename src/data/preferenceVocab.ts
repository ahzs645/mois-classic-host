/* ============================================================================
   Chart Preference vocabularies, shared by every window that builds a
   preference: the folder's New Preference dialog, the Quick Entry Template -
   Chart Preference editor (Administration ▸ Designer Section ▸ Quick Entry)
   and the chart's Quick Entry - Chart Preference window.

   PROVENANCE:
     · the seven types and their order: art. 300925 ("Types of Preferences")
       and the Quick Entry Template - Chart Preference capture, art. 3071982
       `8533ea5acbce…` (Consent, Directive, Disclosure, Advance Directive,
       Not Indicated, Contraindicated, Precaution).
     · the Instruction list per type: art. 3071982's step 6a. The article
       text says "Allow or Disallow" for Consent and Disclosure, but the
       build's own capture (`9ce42050dd92…`, v02.31) shows the value as
       `NOT ALLOW`, so the lists carry the capture's wording — the build
       wins over the text.
     · the Subject options: art. 3071982 ("Subject Options": Consultation,
       Image, Intervention, Measure, Medication, Procedure, Other).
     · Form and By: art. 300925 step 9 (In person, Paper, Phone, Verbal;
       Client, Guardian, Mature Minor, Parent, Other), upper-cased the way
       PreferencesDetail's captured drop lists print them.
   INFERRED: the Precaution instruction list ("scroll through it to select
   the appropriate one" — no capture opens it).
   ========================================================================= */

export const PREFERENCE_TYPES = [
  'Consent', 'Directive', 'Disclosure', 'Advance Directive', 'Not Indicated', 'Contraindicated', 'Precaution',
] as const
export type PreferenceType = typeof PREFERENCE_TYPES[number]

/** the Instruction drop list for each preference type */
export const PREFERENCE_INSTRUCTIONS: Record<PreferenceType, string[]> = {
  Consent: ['ALLOW', 'NOT ALLOW'],
  Directive: ['DESIRED', 'NOT DESIRED'],
  Disclosure: ['ALLOW', 'NOT ALLOW'],
  'Advance Directive': ['SEE DETAIL'],
  'Not Indicated': ['NOT INDICATED'],
  Contraindicated: ['CONTRAINDICATED'],
  /* INFERRED */
  Precaution: ['FEAR OF NEEDLES', 'LATEX PRECAUTION', 'SYNCOPE', 'OTHER'],
}

export const PREFERENCE_SUBJECTS = ['CONSULTATION', 'IMAGE', 'INTERVENTION', 'MEASURE', 'MEDICATION', 'PROCEDURE', 'OTHER']

export const PREFERENCE_IDENTIFIED_BY = ['Concept', 'Code', 'Free Text'] as const
export type PreferenceIdentifiedBy = typeof PREFERENCE_IDENTIFIED_BY[number]

/** art. 300925 step 6: every type is identified by Concept by default,
    except Advance Directive, which is set to Code */
export const defaultIdentifiedBy = (type: PreferenceType): PreferenceIdentifiedBy =>
  type === 'Advance Directive' ? 'Code' : 'Concept'

export const PREFERENCE_FORMS = ['IN PERSON', 'PAPER', 'PHONE', 'VERBAL']
export const PREFERENCE_BY = ['CLIENT', 'GUARDIAN', 'MATURE MINOR', 'PARENT', 'OTHER']

/* --- added for the New Preference dialog (screens/PreferenceWindows.tsx) ---
   PROVENANCE: the Reason list is the one PreferencesDetail transcribed from
   the supplied MOIS drop-down capture (2026-09-22); it moved here so the
   folder's Detail tab and the New Preference dialog offer one list.
   The Concept / Code lists behind the `…` depend on the Subject (art. 300925
   step 6: "The list of available concepts and codes changes based on the
   selected Subject"). The OTHER codes are chart 87288's own exported
   preferences (01000, 01002, 01015, 01100, MHEL, POA) plus the HRV example of
   art. 304053; the concept names are the Health Maintenance concepts art.
   304722 lists (INFLUENZA VACCINE, PAP SMEAR, MAMMOGRAPHY, HIV SCREENING,
   BOWEL ENDOSCOPY, LEVEL OF INTERVENTION …) and art. 300925's own examples
   (Cardiopulmonary Resuscitation, Pharmanet Access).
   INFERRED: the codes given to the concepts, the Code lists outside OTHER,
   and which lists carry which term — no capture opens either lookup.
   ------------------------------------------------------------------------ */
export const PREFERENCE_REASONS = ['GUILLAIN BARRE SYNDROME', 'ABORIGINAL ANCESTRY', 'ALREADY IMMUNE', 'FAM HX CONGENITAL IMMUNO',
  'IMMUNITY LAB EVIDENCE', 'IMMUNITY PREVIOUS DISEASE', 'INELIGIBLE FOR VACCINE', 'INVALID DOSE',
  'INVOLUNTARY ADMISSION', 'MATURE MINOR-SENSITIVE', 'NO VALID CONSENT', 'NOT SEXUALLY ACTIVE', 'OTHER',
  'PARENT DIRECTED SCHEDULING', 'SELF CHOICE']

export type PreferenceTerm = { code: string; description: string }
const t = (code: string, description: string): PreferenceTerm => ({ code, description })

/** the `…` list for a Subject, by what the preference is Identified By */
export const PREFERENCE_TERMS: Record<string, { Concept: PreferenceTerm[]; Code: PreferenceTerm[] }> = {
  OTHER: {
    Concept: [
      t('CPR', 'CARDIOPULMONARY RESUSCITATION'), t('PNET', 'PHARMANET ACCESS'), t('ORGDON', 'ORGAN DONATION'),
      t('POA', 'POWER OF ATTORNEY'), t('ECOM', 'ELECTRONIC COMMUNICATION CONSENT'), t('VCARE', 'CONSENT FOR VIRTUAL CARE'),
    ],
    Code: [
      t('01000', 'AUTOMATED CALL SERVICE'), t('01002', 'HOME RISK ASSESSMENT'), t('01015', 'ELECTRONIC COMMUNICATION CONSENT'),
      t('01100', 'CONSENT FOR VIRTUAL CARE'), t('CPR', 'CARDIOPULMONARY RESUSCITATION'), t('HRV', 'HOME RISK VIOLENCE'),
      t('MHEL', 'MENTAL HEALTH ACT'), t('ORGDON', 'ORGAN DONATION'), t('PNET', 'PHARMANET ACCESS'), t('POA', 'POWER OF ATTORNEY'),
    ],
  },
  MEDICATION: {
    Concept: [
      t('COVID', 'COVID-19 VACCINE'), t('HB', 'HEPATITIS B VACCINE'), t('HPV', 'HPV VACCINE'), t('FLU', 'INFLUENZA VACCINE'),
      t('MMR', 'MMR VACCINE'), t('PNEU', 'PNEUMOCOCCAL VACCINE'), t('TD', 'TETANUS DIPHTHERIA VACCINE'),
    ],
    Code: [
      t('FLU-QIV', 'INFLUENZA QUADRIVALENT INACTIVATED'), t('HB', 'HEPATITIS B'), t('HPV-9', 'HUMAN PAPILLOMAVIRUS 9-VALENT'),
      t('MMR', 'MEASLES MUMPS RUBELLA'), t('PNEU-P-23', 'PNEUMOCOCCAL POLYSACCHARIDE 23-VALENT'), t('TD', 'TETANUS DIPHTHERIA'),
    ],
  },
  MEASURE: {
    Concept: [
      t('ALC', 'ALCOHOL CONSUMPTION'), t('BP', 'BLOOD PRESSURE'), t('CANN', 'CANNABIS USE'), t('FBG', 'FASTING GLUCOSE'),
      t('HIVS', 'HIV SCREENING'), t('PAP', 'PAP SMEAR'), t('FOBT', 'SCREENING FECAL OCCULT BLOOD'), t('WT', 'WEIGHT'),
    ],
    Code: [t('BP', 'BLOOD PRESSURE'), t('FOBT', 'FECAL OCCULT BLOOD TEST'), t('HBA1C', 'HEMOGLOBIN A1C'), t('WT', 'WEIGHT')],
  },
  IMAGE: {
    Concept: [t('BMD', 'BONE DENSITY'), t('CXR', 'CHEST X-RAY'), t('MAMMO', 'MAMMOGRAPHY')],
    Code: [t('BMD', 'BONE MINERAL DENSITY'), t('MAMMO', 'SCREENING MAMMOGRAM')],
  },
  PROCEDURE: {
    Concept: [t('ENDO', 'BOWEL ENDOSCOPY'), t('HYST', 'HYSTERECTOMY'), t('MAST', 'MASTECTOMY')],
    Code: [t('COLON', 'COLONOSCOPY'), t('SIG', 'SIGMOIDOSCOPY')],
  },
  INTERVENTION: {
    Concept: [t('LOI', 'LEVEL OF INTERVENTION'), t('LOIA', 'LOI ASSESSMENT'), t('SMOK', 'SMOKING CESSATION COUNSELLING')],
    Code: [t('LOI', 'LEVEL OF INTERVENTION'), t('SMOK', 'SMOKING CESSATION COUNSELLING')],
  },
  CONSULTATION: {
    Concept: [t('DIET', 'DIETITIAN REFERRAL'), t('MHC', 'MENTAL HEALTH CONSULTATION'), t('SW', 'SOCIAL WORK REFERRAL')],
    Code: [t('DIET', 'DIETITIAN'), t('MHC', 'MENTAL HEALTH'), t('SW', 'SOCIAL WORK')],
  },
}

export const preferenceTerms = (subject: string, by: PreferenceIdentifiedBy): PreferenceTerm[] =>
  by === 'Free Text' ? [] : PREFERENCE_TERMS[subject.toUpperCase()]?.[by] ?? []

/* art. 300925: "a Directive for Cardiopulmonary Resuscitation provides
   different instruction options, such as CPR and DNR, than a Disclosure for
   Pharmanet Access, which indicates Allow or Not Allow". The Mental Health
   Act instruction is chart 87288's exported one; its second entry is
   INFERRED. */
const TERM_INSTRUCTIONS: Record<string, string[]> = {
  'CARDIOPULMONARY RESUSCITATION': ['CPR', 'DNR'],
  'PHARMANET ACCESS': ['ALLOW', 'NOT ALLOW'],
  'MENTAL HEALTH ACT': ['FORM 4.1 - INVOLUNTARY ADMISSION (FIRST CERTIFICATION)', 'FORM 4.2 - INVOLUNTARY ADMISSION (SECOND CERTIFICATION)'],
}

/** the Instruction list: the concept / code's own, else the type's */
export const preferenceInstructions = (type: string, term = ''): string[] =>
  TERM_INSTRUCTIONS[term.toUpperCase()] ?? PREFERENCE_INSTRUCTIONS[type as PreferenceType] ?? []
