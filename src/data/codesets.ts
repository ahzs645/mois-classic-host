/* ============================================================================
   Administration ▸ Codeset Management — Sources, Systems, Codes, Value Sets
   and Mapping (Reference Sets and Lookup Settings live in adminLists.ts).

   PROVENANCE
   · 2069355 "Codeset Management" — the article's prose for every node, and
     four captures:
       `7bd01e69…`  Codes, empty: New / Delete / Save / Undo / Find / Reset
                    over Code, Code System, Term, Category and ☑ Active;
       `12a10efa…`, `35d919e2…` (2873865), `17a4d551…` (303121)
                    Value Set List: New Record / Delete Record / Edit Record /
                    Close Window, two filter boxes, Common Name · Description;
       `927c8e00…`  Value Set Detail (EMPLOYMENT STATUS, Linked Lab Codes (1));
       `e44221079…` Code Mapping: New / Delete / Save / Undo / Reset, the
                    From / To search strip with "…" and Max row limit 200,
                    From · Code · From Term · To · Code · To Term · Active.
   · 2069363 / 2128358 `36fd5bcb…` (v02.22.92): Codes with a SNOMED-CT code
     found — Alternate Terms (Term · Lang · Active · Type · Subtype, Add /
     Delete), Associated Reference Sets (Reference Set · Active, Add /
     Delete) and Associated Mappings (Add From / Add To / Delete, "Rows: 0").
   · 2873865 `040ba125…` (a later build than `927c8e00…`): Value Set Detail
     with Add Record / Insert Record / Delete Value and Value · Quick Code ·
     Description · Sort Order · Rank · Active. The later build is the one
     drawn, because the article's own steps say "Select Add Record".

   INFERRED (no capture anywhere in the manual):
   · the Sources and Systems windows. 2069355 describes them in prose only:
     Sources is an inline list of Legal Name, Common Name, Abbrev. and
     Active, saved from the command row, with no delete; Systems raises a
     pop-up for New Record ("Add New (F2)") and for Edit Record, and only the
     pop-up can untick Active. Their headers, columns and pop-up fields are
     built from those words.

   Records are public terminology (SNOMED CT, ICD-9, LOINC codes and their
   published terms) and the value sets the captures name. No patient data.
   ========================================================================= */

/* --- Sources ------------------------------------------------------------- */

export type CodeSourceRow = {
  legal: string
  common: string
  abbrev: string
  active: boolean
  /** shipped with MOIS: cannot be deleted (none can) */
  preloaded?: boolean
}

export const CODE_SOURCE_ROWS: CodeSourceRow[] = [
  { legal: 'Alberta Innovates - Health Solutions', common: 'Alberta Innovates', abbrev: 'AIHS', active: true, preloaded: true },
  { legal: 'British Columbia Ministry of Health', common: 'BC Ministry of Health', abbrev: 'BC MoH', active: true, preloaded: true },
  { legal: 'Canadian Institute for Health Information', common: 'CIHI', abbrev: 'CIHI', active: true, preloaded: true },
  /* 2069355: "IHTSDO for SNOMED-CT or Regenstrief for LOINC" */
  { legal: 'International Health Terminology Standards Development Organisation', common: 'SNOMED International', abbrev: 'IHTSDO', active: true, preloaded: true },
  { legal: 'Regenstrief Institute, Inc.', common: 'Regenstrief', abbrev: 'REGENSTRIEF', active: true, preloaded: true },
  { legal: 'World Health Organization', common: 'WHO', abbrev: 'WHO', active: true, preloaded: true },
  { legal: 'WorkSafeBC', common: 'WorkSafeBC', abbrev: 'WCB', active: true, preloaded: true },
]

/* --- Systems ------------------------------------------------------------- */

export type CodeSystemRow = {
  system: string
  desc: string
  source: string
  oid: string
  active: boolean
  preloaded?: boolean
}

/* the Configure Code Lookup Setting pane's code systems (adminLists.ts
   `LOOKUP_CODE_SYSTEMS`, `77260e59…`), each under the source that publishes
   it. OIDs are the published HL7 ones where one exists. */
export const CODE_SYSTEM_ROWS: CodeSystemRow[] = [
  { system: 'AIHS-INTERVENTION', desc: 'MOIS Interventions', source: 'AIHS', oid: '', active: true, preloaded: true },
  { system: 'AIHS-LIVEARR', desc: 'Living Arrangement', source: 'AIHS', oid: '', active: true, preloaded: true },
  { system: 'AIHS-MEASURE', desc: 'MOIS Measures', source: 'AIHS', oid: '', active: true, preloaded: true },
  { system: 'AIHS-STOPREASON', desc: 'Stop Reason', source: 'AIHS', oid: '', active: true, preloaded: true },
  { system: 'ICD-10', desc: 'International Classification of Diseases, 10th Revision', source: 'WHO', oid: '2.16.840.1.113883.6.3', active: true, preloaded: true },
  { system: 'ICD-9', desc: 'International Classification of Diseases, 9th Revision', source: 'WHO', oid: '2.16.840.1.113883.6.42', active: true, preloaded: true },
  { system: 'LOINC', desc: 'Logical Observation Identifiers Names and Codes', source: 'REGENSTRIEF', oid: '2.16.840.1.113883.6.1', active: true, preloaded: true },
  { system: 'MSP-DIAGCODE', desc: 'BC MSP Diagnostic Codes', source: 'BC MoH', oid: '', active: true, preloaded: true },
  { system: 'MSP-FEECODE', desc: 'BC MSP Fee Codes', source: 'BC MoH', oid: '', active: true, preloaded: true },
  { system: 'SNOMED-CT', desc: 'SNOMED Clinical Terms', source: 'IHTSDO', oid: '2.16.840.1.113883.6.96', active: true, preloaded: true },
  { system: 'WCB-AOI', desc: 'WorkSafeBC Area of Injury', source: 'WCB', oid: '', active: true, preloaded: true },
  { system: 'WCB-NOI', desc: 'WorkSafeBC Nature of Injury', source: 'WCB', oid: '', active: true, preloaded: true },
]

/* --- Codes --------------------------------------------------------------- */

/** One Alternate Terms row (`36fd5bcb…`). FSN = Fully Specified Name; SYN = Synonym. */
export type AltTerm = {
  term: string
  lang: string
  active: boolean
  type: 'SYN' | 'FSN'
  /** a user's own term is a `QUICK CODE` (2069355) */
  subtype: '' | 'QUICK CODE'
  /** true for a term the user added: only these can be edited */
  user?: boolean
}

export type CodeMapping = {
  fromSystem: string
  fromCode: string
  fromTerm: string
  toSystem: string
  toCode: string
  toTerm: string
  active: boolean
  /** shipped mappings cannot be modified (2069355 Mapping) */
  preloaded?: boolean
}

export type CodeRecord = {
  code: string
  system: string
  /** the preferred synonym — the description a coded row shows */
  term: string
  category: string
  active: boolean
  alternates: AltTerm[]
  /** Associated Reference Sets */
  sets: { set: string; active: boolean }[]
  /** a code the user created under Codes ▸ New */
  user?: boolean
}

const syn = (term: string): AltTerm => ({ term, lang: 'EN', active: true, type: 'SYN', subtype: '' })
const fsn = (term: string): AltTerm => ({ term, lang: 'EN', active: true, type: 'FSN', subtype: '' })

export const CODE_RECORDS: CodeRecord[] = [
  /* `36fd5bcb…`, the capture's own code */
  {
    code: '86184003', system: 'SNOMED-CT', term: 'ELECTROCARDIOGRAPHIC MONITOR AND RECORDER', category: 'PHYSICAL OBJECT', active: true,
    alternates: [
      syn('ELECTROCARDIOGRAPHIC MONITOR AND RECORDER, DEVICE'), syn('HOLTER MONITOR'),
      fsn('ELECTROCARDIOGRAPHIC MONITOR AND RECORDER, DEVICE (PHYSICAL OBJECT)'),
    ],
    sets: [],
  },
  {
    code: '44054006', system: 'SNOMED-CT', term: 'DIABETES MELLITUS TYPE 2', category: 'DISORDER', active: true,
    alternates: [syn('TYPE 2 DIABETES MELLITUS'), syn('DM TYPE II'), fsn('DIABETES MELLITUS TYPE 2 (DISORDER)')],
    sets: [{ set: 'HEALTH CONCERNS', active: true }, { set: 'HEALTH CONCERNS (BC)', active: true }],
  },
  {
    code: '38341003', system: 'SNOMED-CT', term: 'HYPERTENSIVE DISORDER', category: 'DISORDER', active: true,
    alternates: [syn('HIGH BLOOD PRESSURE'), syn('HYPERTENSION'), fsn('HYPERTENSIVE DISORDER, SYSTEMIC ARTERIAL (DISORDER)')],
    sets: [{ set: 'HEALTH CONCERNS', active: true }, { set: 'HEALTH CONCERNS (BC)', active: true }],
  },
  {
    code: '195967001', system: 'SNOMED-CT', term: 'ASTHMA', category: 'DISORDER', active: true,
    alternates: [fsn('ASTHMA (DISORDER)')],
    sets: [{ set: 'HEALTH CONCERNS', active: true }],
  },
  {
    code: '13645005', system: 'SNOMED-CT', term: 'CHRONIC OBSTRUCTIVE LUNG DISEASE', category: 'DISORDER', active: true,
    alternates: [syn('COPD'), syn('CHRONIC OBSTRUCTIVE PULMONARY DISEASE'), fsn('CHRONIC OBSTRUCTIVE LUNG DISEASE (DISORDER)')],
    sets: [{ set: 'HEALTH CONCERNS', active: true }],
  },
  {
    code: '84114007', system: 'SNOMED-CT', term: 'HEART FAILURE', category: 'DISORDER', active: true,
    alternates: [syn('CARDIAC FAILURE'), fsn('HEART FAILURE (DISORDER)')],
    sets: [{ set: 'HEALTH CONCERNS', active: true }],
  },
  /* the Universal Search Window's own first row (`c62a9ff7…`) */
  {
    code: '78932', system: 'ICD-9', term: 'ABDMNAL MASS LFT UP QUAD', category: 'DIAGNOSIS', active: true,
    alternates: [syn('ABDOMINAL OR PELVIC SWELLING, MASS, OR LUMP, LEFT UPPER QUADRANT')],
    sets: [],
  },
  { code: '250', system: 'ICD-9', term: 'DIABETES MELLITUS', category: 'DIAGNOSIS', active: true, alternates: [], sets: [{ set: 'HEALTH CONCERNS (BC)', active: true }] },
  { code: '401', system: 'ICD-9', term: 'ESSENTIAL HYPERTENSION', category: 'DIAGNOSIS', active: true, alternates: [], sets: [{ set: 'HEALTH CONCERNS (BC)', active: true }] },
  { code: '493', system: 'ICD-9', term: 'ASTHMA', category: 'DIAGNOSIS', active: true, alternates: [], sets: [] },
  { code: '496', system: 'ICD-9', term: 'CHRONIC AIRWAY OBSTRUCTION NEC', category: 'DIAGNOSIS', active: true, alternates: [], sets: [] },
  { code: '428', system: 'ICD-9', term: 'HEART FAILURE', category: 'DIAGNOSIS', active: true, alternates: [], sets: [] },
  { code: 'E11', system: 'ICD-10', term: 'TYPE 2 DIABETES MELLITUS', category: 'DIAGNOSIS', active: true, alternates: [], sets: [] },
  { code: 'I10', system: 'ICD-10', term: 'ESSENTIAL (PRIMARY) HYPERTENSION', category: 'DIAGNOSIS', active: true, alternates: [], sets: [] },
  { code: '4548-4', system: 'LOINC', term: 'HEMOGLOBIN A1C/HEMOGLOBIN.TOTAL IN BLOOD', category: 'LABORATORY', active: true, alternates: [syn('HBA1C')], sets: [] },
  { code: '8480-6', system: 'LOINC', term: 'SYSTOLIC BLOOD PRESSURE', category: 'CLINICAL', active: true, alternates: [syn('SBP')], sets: [] },
]

/** `${system}|${code}` — how a code is keyed in the session store. */
export const codeKey = (system: string, code: string) => `${system}|${code}`

/* --- Mapping ------------------------------------------------------------- */

/* 2069355: "Mapping from the most common ICD-10 and SNOMEDCT codes to BC MSP
   accepted ICD-9 codes has already been included out of the box" */
export const CODE_MAPPING_ROWS: CodeMapping[] = [
  { fromSystem: 'SNOMED-CT', fromCode: '44054006', fromTerm: 'DIABETES MELLITUS TYPE 2', toSystem: 'ICD-9', toCode: '250', toTerm: 'DIABETES MELLITUS', active: true, preloaded: true },
  { fromSystem: 'SNOMED-CT', fromCode: '38341003', fromTerm: 'HYPERTENSIVE DISORDER', toSystem: 'ICD-9', toCode: '401', toTerm: 'ESSENTIAL HYPERTENSION', active: true, preloaded: true },
  { fromSystem: 'SNOMED-CT', fromCode: '195967001', fromTerm: 'ASTHMA', toSystem: 'ICD-9', toCode: '493', toTerm: 'ASTHMA', active: true, preloaded: true },
  { fromSystem: 'SNOMED-CT', fromCode: '13645005', fromTerm: 'CHRONIC OBSTRUCTIVE LUNG DISEASE', toSystem: 'ICD-9', toCode: '496', toTerm: 'CHRONIC AIRWAY OBSTRUCTION NEC', active: true, preloaded: true },
  { fromSystem: 'SNOMED-CT', fromCode: '84114007', fromTerm: 'HEART FAILURE', toSystem: 'ICD-9', toCode: '428', toTerm: 'HEART FAILURE', active: true, preloaded: true },
  { fromSystem: 'ICD-10', fromCode: 'E11', fromTerm: 'TYPE 2 DIABETES MELLITUS', toSystem: 'ICD-9', toCode: '250', toTerm: 'DIABETES MELLITUS', active: true, preloaded: true },
  { fromSystem: 'ICD-10', fromCode: 'I10', fromTerm: 'ESSENTIAL (PRIMARY) HYPERTENSION', toSystem: 'ICD-9', toCode: '401', toTerm: 'ESSENTIAL HYPERTENSION', active: true, preloaded: true },
]

/* --- Value Sets ---------------------------------------------------------- */

export type ValueSetValue = {
  value: string
  quick: string
  desc: string
  sort: string
  rank: string
  active: boolean
}

export type ValueSet = {
  name: string
  desc: string
  values: ValueSetValue[]
  /** "A system level value set or a value set assigned to a lab code cannot be deleted" */
  system?: boolean
  /** the lab codes it is linked to (the Linked Lab Codes tab) */
  labCodes?: { code: string; desc: string }[]
}

const v = (value: string, desc = value, rank = '0'): ValueSetValue => ({ value, quick: '', desc, sort: '0', rank, active: true })

/** Value set names the other admin windows read from. */
export const EXTERNAL_ORGANIZATION_TYPE = 'EXTERNAL ORGANIZATION TYPE'
export const CONTACT_LIST_GROUP = 'CONTACT LIST GROUP'

/* The list is `35d919e2…`'s (the fuller of the two list captures); the
   values are the captures' own where one opens the set. */
export const VALUE_SETS: ValueSet[] = [
  { name: 'ACCESS.CONTROL.BREAKGLASS.REASON', desc: 'Access Control Break Glass Reason', system: true, values: [v('EMERGENCY', 'Emergency'), v('CONTINUITY OF CARE', 'Continuity of care'), v('OTHER', 'Other')] },
  { name: 'ADDRESS TENURE', desc: 'Address Tenure', system: true, values: [v('OWN', 'Own'), v('RENT', 'Rent'), v('OTHER', 'Other')] },
  { name: 'ADDRESS TYPE', desc: 'Address Type', system: true, values: [v('HOME', 'Home'), v('MAILING', 'Mailing'), v('TEMPORARY', 'Temporary')] },
  /* 2873865 "Creating Contact List Groups In Value Sets": the groups the
     Contact List (`e739f2f5…`) bands its lists under, and DEPARTMENTS, the
     New Contact List capture's own (`bdf7df43…`) */
  {
    name: CONTACT_LIST_GROUP, desc: 'Contact List - Group',
    values: [v('CLINICS', 'Clinics'), v('DEPARTMENTS', 'Departments'), v('HOSPITAL AND CLINICS', 'Hospital and Clinics'), v('LABS AND IMAGING', 'Labs and Imaging'),
      v('LOCATION', 'Location'), v('PHARMACY', 'Pharmacy'), v('REGIONAL', 'Regional'), v('SERVICE', 'Service'), v('UHNBC', 'UHNBC')],
  },
  { name: 'COVID.ANTIVIRAL.THERAPEUTICS.STREAM', desc: 'COVID Anti Viral Therapeutics Stream', system: true, values: [] },
  { name: 'COVID.VACCINATION.STATUS', desc: 'COVID Vaccination Status', system: true, values: [] },
  { name: 'CRIMINAL JUSTICE SYSTEM INVOLVEMENT', desc: 'Criminal justice system involvement', system: true, values: [] },
  { name: 'DERMATOLOGY GPA', desc: 'Dermatology Physician Global Assessment (PGA) score is just a simple score.', values: [v('0', 'Clear', '0'), v('1', 'Almost clear', '1'), v('2', 'Mild', '2'), v('3', 'Moderate', '3'), v('4', 'Severe', '4')], labCodes: [{ code: 'DERMPGA', desc: 'Dermatology PGA' }] },
  { name: 'EDUCATION ENROLLED AS', desc: 'Patient Level of Enrolled / Partication (full-time,...)', system: true, values: [] },
  { name: 'EDUCATION FIELD OF STUDY', desc: 'Field of Study', system: true, values: [] },
  { name: 'EDUCATION LEVEL', desc: 'Current Education Level', system: true, values: [] },
  { name: 'EDUCATIONAL INSTITUTION - CATEGORY', desc: 'Educational Institution Category', system: true, values: [] },
  { name: 'EMPLOYEE HOURS', desc: 'Employee Hours during the week', system: true, values: [] },
  /* `927c8e00…`, value for value */
  {
    name: 'EMPLOYMENT STATUS', desc: 'Employment Status', system: true,
    values: [
      v('EMPLOYED', 'Employed', '1'), v('HOMEMAKER', 'Homemaker', '2'), v('STUDENT', 'Student - even if employed', '3'),
      v('DISABILITY', 'On Disability', '4'), v('SICK LEAVE', 'On sick leave', '5'),
      v('SUPPORTED EMPLOYMENT', 'Support employment funded by ministries', '6'),
      v('SUPPORTED VOLUNTEER', 'Support volunteer service funded by other ministry or jurisdiction', '7'),
      v('PEER SUPPORT', 'Peer support funded by other ministry / jurisdiction', '8'), v('RETIRED', 'Retired', '9'),
      v('UNEMPLOYED', 'Unemployed', '10'), v('NOT IN LABOUR FORCE', 'Not in labour force', '11'), v('OTHER', 'Other', '12'),
      v('UNKNOWN/NOT ASKED', 'Unknown / Not Asked', '99'),
    ],
    labCodes: [{ code: 'EMPSTAT', desc: 'Employment Status' }],
  },
  { name: 'ENCOUNTER PRIORITY', desc: 'Encounter Priority', system: true, values: [v('ROUTINE', 'Routine'), v('URGENT', 'Urgent')] },
  { name: 'ENCOUNTER.DISCHARGE.OUTCOME', desc: 'Encounter - Discharge Outcome', system: true, values: [] },
  { name: 'ENCOUNTER.DISCHARGE.OUTCOME.VRX', desc: 'Encounter - Discharge Outcome (vRx)', system: true, values: [] },
  /* `040ba125…` CLINICS … UPCC, and the fuller list the Change Settings
     picker drops (`faf4c8cc…`). COMMUNITY AGENCY, HOME AND COMMUNITY CARE
     and PUBLIC HEALTH are this training clinic's own additions, so the
     Organization List's rows have a type to point at. */
  {
    name: EXTERNAL_ORGANIZATION_TYPE, desc: 'External Organization Type', system: true,
    values: [
      v('ABORIGINAL - ABORIGINAL GROUP'), v('ABORIGINAL - FACILITY'), v('ABORIGINAL - FNHSO'), v('ABORIGINAL - ROOT'),
      v('CLINICS', 'Clinics'), v('COMMUNITY AGENCY', 'Community Agency'), v('EDUCATIONAL INSTITUTION', 'Educational Institution'),
      v('FIRST NATION - RESERVE', 'First Nation - Reserve'), v('GOVERNMENT', 'Government'), v('HOME AND COMMUNITY CARE', 'Home and Community Care'),
      v('HOSPITALS', 'Hospitals'), v('IMAGING', 'Imaging'), v('LABS', 'Labs'), v('PHARMACY', 'PHARMACY'), v('PUBLIC HEALTH', 'Public Health'),
      v('UHNBC', 'UHNBC'), v('UPCC', 'UPCC'),
    ],
  },
  { name: 'HOME CARE ESTIMATED PROGRAM STAY', desc: 'Home care estimated program stay', values: [] },
  { name: 'HOME CARE PROJECTED TREATMENT GOALS', desc: 'Home care projected treatment goals', values: [] },
  { name: 'HOUSING TENURE', desc: 'House Tenure', system: true, values: [] },
  { name: 'LIVING ARRANGEMENT', desc: 'Living Arrangement', system: true, values: [] },
  { name: 'MEMBERSHIP.TEMPORARY.REASON', desc: 'Membership - Temporary Record Reason', system: true, values: [v('COVER SHIFT', 'Cover shift'), v('VACATION RELIEF', 'Vacation relief')] },
  { name: 'NATURE OF CRIMINAL JUSTICE INVOLVEMENT', desc: 'Nature of criminal justice involvement', system: true, values: [] },
  { name: 'OCCUPANT RELATIONSHIP', desc: 'Occupant Relationship', system: true, values: [] },
  { name: 'OCCUPANT TYPE', desc: 'Occupant Type', system: true, values: [] },
  { name: 'PARENTING STATUS', desc: 'Parenting status', system: true, values: [] },
  { name: 'PREGNANCY HISTORY', desc: 'Pregnancy History', system: true, values: [] },
  { name: 'YES / NO', desc: 'Yes or No response type', system: true, values: [v('YES', 'Yes', '1'), v('NO', 'No', '2')] },
]

/* --- session keys ---------------------------------------------------------
   A stage session's edits, so a value added to EXTERNAL ORGANIZATION TYPE is
   in the Organization List's drop-down, and a preferred term or alternate
   term changed under Codes is what the Universal Search Window finds. */
export const CODE_SOURCES_KEY = 'admin:codeset:sources'
export const CODE_SYSTEMS_KEY = 'admin:codeset:systems'
export const CODE_RECORDS_KEY = 'admin:codeset:codes'
export const CODE_MAPPINGS_KEY = 'admin:codeset:mappings'
export const VALUE_SETS_KEY = 'admin:codeset:value-sets'

/** The values of a value set as currently saved (active ones only). */
export function valueSetValues(sets: ValueSet[], name: string): string[] {
  return (sets.find((s) => s.name === name)?.values ?? []).filter((x) => x.active).map((x) => x.value)
}
