/* ============================================================================
   Quick Entry Templates — Administration ▸ Designer Section ▸ Quick Entry.

   One list of templates, shared by the admin Quick Entry List (and its
   Select Option / template editors / Import / Export windows) and by the
   chart's four Quick Entry windows (Preferences, Goals, Orders, Reaction
   Risks), so a template an administrator saves is the one a clinician picks
   a minute later. A session store like data/chartSession.ts: it lives as
   long as the frame (`resetQuickEntryTemplates`), and is clinic-wide rather
   than per chart, which is what MOIS says of these templates ("available to
   all of your users").

   PROVENANCE: manual article 3071982 "Quick Entry Templates".
     · the five Template Groups and their order: Select Option,
       `c797c87cb7c0…` (Chart Preference, Goal, MSP Secondary Claims, Order,
       Reaction Risk).
     · the seed templates are the ones the captures show:
         VACCINATIONS - NOT DESIRED  `9ce42050dd92…` (Consent · Medication ·
                                     Concept ALL VACCINES · NOT ALLOW ·
                                     Show on Demographics ticked)
         Influenza Vaccine - Not Desired  the list behind `c797c87cb7c0…`
         Smoking Cessation           `8b8958b7ddc6…` (quantitative · MEASURE
                                     · Concept CIGARETTES SMOKED PACKS PER DAY
                                     · < 1 pkg per day)
         Arterial Blood Gas Panel    `3a1f89a73966…` (LAB · ARTERIAL BLOOD
                                     GAS PANEL · LIFELABS LABORATORY
                                     REQUISITION)
         PENICILLIN                  `5fdf37b47490…`, `9ac102714dc9…`
                                     (Allergy · Drug (Category) · 3 PENICILLIN
                                     · 39579001 ANAPHYLAXIS · SEVERE TO LIFE
                                     THREATENING)
         70168                       `1032aefc4faf…` (ACTIVE WOUND MGMT-ACUTE
                                     PHASE AFTER DEBRIDEMENT · 00090 MAJOR TRAY)
   The Chart Preference templates are the TRAINING site's own: its Quick
   Entry export of 2026-09-29 (MOIS 02.31.23 b250508), embedded verbatim in
   quickEntryTrainingExport.generated.ts (scripts/embed-quick-entry-export.mjs)
   and read at load by data/quickEntryXml.ts — 31 templates: the consents,
   the Mental Health Act directives (Forms 4.1–21, Section 37), MOST, the
   risk assessments and Release of Information. They replace the manual's
   Influenza Vaccine / VACCINATIONS / Pharmanet examples.
   The Order templates beside Arterial Blood Gas Panel are the TRAINING Quick
   Entry List capture (2026-09-29 11:54): its rows ACUTE TERTIARY OUTPATIENT …
   DENTAL HEALTH PERINATAL with their descriptions, and ACUTE TERTIARY
   OUTPATIENT's editor (CONSULTATION · TERTIARY REHABILITATIVE - ADULT).
   INFERRED: the other TRAINING Orders' detail (CONSULTATION, Order For the
   description's program name, as the captured one reads), the tails the
   capture's Name / Description columns cut off, and every TRAINING Goal,
   MSP and Reaction Risk template (none captured, so the manual's stay).
   ========================================================================= */
import { ORDER_TYPES } from './orderVocab'
import { createSignal } from './sessionStore'
import type { PreferenceIdentifiedBy, PreferenceType } from './preferenceVocab'
import { TRAINING_QUICK_ENTRY_XML } from './quickEntryTrainingExport.generated'
import { parseQuickEntryXml, type QuickEntryFileHeader, type QuickEntrySource } from './quickEntryXml'

export const QUICK_ENTRY_GROUPS = ['Chart Preference', 'Goal', 'MSP Secondary Claims', 'Order', 'Reaction Risk'] as const
export type QuickEntryGroup = typeof QUICK_ENTRY_GROUPS[number]

export type QuickEntryPreference = {
  /** blank on a new template until a Type radio is picked */
  type: PreferenceType | ''
  subject: string
  /** blank until an Identified By radio is picked */
  identifiedBy: PreferenceIdentifiedBy | ''
  /** the code behind the concept / code term (str_code), when there is one */
  code?: string
  concept: string
  instruction: string
  sensitive: boolean
  showOnDemo: boolean
  /** chart fields a template carries (the ROI templates' Form / By /
      instruction comment …); the chart window starts from them */
  chart?: Partial<Record<'subjectDetail' | 'instructionDetail' | 'reason' | 'reasonDetail' | 'form' | 'by' | 'start' | 'stopped', string>>
}

export type QuickEntryGoal = {
  quantitative: boolean
  subject: string
  identifiedBy: 'Code' | 'Concept'
  concept: string
  operator: string
  target: string
  every: string
  units: string
}

export type QuickEntryOrder = { type: string; orderFor: string; attachment: string }

export type QuickEntryCodeTerm = { code: string; term: string }

export type QuickEntryReaction = {
  reactionType: 'Allergy' | 'Intolerance'
  agentType: 'Drug (Specific)' | 'Drug (Category)' | 'Food' | 'Environmental'
  agent: QuickEntryCodeTerm
  reactions: QuickEntryCodeTerm[]
  severity: string
}

export type QuickEntryMsp = {
  primary: QuickEntryCodeTerm
  secondary: (QuickEntryCodeTerm & { services: string })[]
}

export type QuickEntryTemplate = {
  id: string
  group: QuickEntryGroup
  name: string
  description: string
  preference?: QuickEntryPreference
  goal?: QuickEntryGoal
  order?: QuickEntryOrder
  reaction?: QuickEntryReaction
  msp?: QuickEntryMsp
  /** the record a template read from an export file came from */
  source?: QuickEntrySource
}

/** the chart window caption per group — "Quick Entry - Chart Preference" … */
export const QUICK_ENTRY_CHART_TITLE: Record<QuickEntryGroup, string> = {
  'Chart Preference': 'Chart Preference',
  Goal: 'Chart Goal',
  'MSP Secondary Claims': 'MSP Group of Claims',
  Order: 'Chart Order',
  'Reaction Risk': 'Reaction Risks',
}

/** the admin editor caption per group — `8533ea5a…`, `70b9b8b9…`,
    `b5c63c1c…` (whose title bar still reads "Chart Goal" [sic]),
    `0dfc31a3…`, `9d5aadd7…` */
export const QUICK_ENTRY_EDITOR_TITLE: Record<QuickEntryGroup, string> = {
  'Chart Preference': 'Quick Entry Template - Chart Preference',
  Goal: 'Quick Entry Template - Chart Goal',
  'MSP Secondary Claims': 'Quick Entry Template - MSP Group of Claims',
  Order: 'Quick Entry Template - Chart Order',
  'Reaction Risk': 'Quick Entry Template - Reaction Risk',
}

/* --- the TRAINING Order rows (Quick Entry List capture, 2026-09-29) ------- */
/** Name / Description as the list prints them ([sic] spellings kept) */
const TRAINING_ORDER_ROWS: [string, string][] = [
  ['ACUTE TERTIARY OUTPATIENT', 'MHSU66 - Tertiary Rehabilitative - Adult'],
  ['ADDED CARE FUNDING CLBC', 'HCC56 - Added Care Funding CLBC'],
  ['ADULT ADDICTIONS DAY TREATMENT PROGRAM (AADTP)', 'MHSU54 - Day Treatment'],
  ['ADULT COMMUNITY ADDICTION SERVICES (ACAS)', 'MHSU39 - Substance Use Communtiy Based Outpatient Services'],
  ['ADULT DAY CENTRE', 'HCC01 - Adult Day Services'],
  ['ASSERTIVE COMMUNITY TREATMENT (ACT)', 'MHSU08 - Assertive Community Treatment'],
  ['ASSISTED LIVING', 'HCC02 - Assisted Living'],
  ['ASSISTED LIVING SPOUSE', 'HCC10 - Assisted Living Spouse'],
  ['CAR60 AND SPECIALIZED RESPONSE TEAM (SRT)', 'MHSU35 - Community Crisis Response'],
  ['CHRONIC DISEASE AND CONDITION MANAGMENT', 'PC03 - Chronic Disease and Condition Management'],
  ['COMMUNICABLE DISEASE CASE MANAGEMENT', 'PH01 - Communicable Disease Case Management'],
  ['COMMUNICABLE DISEASE CONTROL', 'PH07 - Communicable Disease Control'],
  ['COMMUNITY ACUTE STABILIZATION TEAM (CAST)', 'MHSU09 - Adult Short Term Assessment and Treatment'],
  ['COMMUNITY OUTREACH AND ASSERTIVE SERVICES TEAM (COAST)', 'MHSU07 - Case Management (Mental Health & Substance Use)'],
  ['COMMUNITY PSYCHIATRISTS', 'MHSU90 - Community Psychiatric Consultation'],
  ['COMMUNITY REHABILITATION', 'HCC66 - Community Rehabilitation'],
  ['COMMUNITY RESIDENTIAL CARE FACILITIES', 'MHSU57 - Community Residential Care Facilities and Family Care'],
  ['COMMUNITY RESPONSE UNIT (CRU)', 'MHSU01 - Intake/Screening/Walk-In and/or Brief Intervention'],
  ['CONSULTATION', 'HCC53 - Consultation'],
  ['CONTACT RAI', ''],
  ['CONVALESCENT CARE (RESIDENTIAL CARE)', 'HCC49 - Convalescent Care (Residential Care)'],
  ['COVID CASE AND CONTACT MANAGEMENT', 'PH13 - COVID Case and Contact Management'],
  ['DENTAL EARLY CHILDHOOD CARIES PREVENTION', 'PH09 - Dental Early Childhood Caries Prevention'],
  ['DENTAL HEALTH INTERVENTION', 'PH03 - Dental Health Intervention'],
  ['DENTAL HEALTH KINDERGARTEN', 'PH10 - Dental Health Kindergarten'],
  ['DENTAL HEALTH PERINATAL', 'PH08 - Dental Health Perinatal'],
]
/** "MHSU66 - Tertiary Rehabilitative - Adult" → TERTIARY REHABILITATIVE -
    ADULT, the captured row's Order For; a row without a description orders
    its own name */
function orderForOf(name: string, description: string): string {
  const at = description.indexOf(' - ')
  return (at >= 0 ? description.slice(at + 3) : name).toUpperCase()
}

/* --- vocabularies the editors drop ---------------------------------------- */
/* the Goal template's Subject / operator / unit lists are data/goalVocab's
   (QE_GOAL_SUBJECTS, GOAL_SINGLE_OPERATORS, GOAL_UNITS) */
/** art. 3071982 "Quick Entry Template - Order": the types as OrderView's
    Order Type DDDW prints them (303588 `48e7423c…`) — one list, in
    data/orderVocab */
export const QE_ORDER_TYPES = ORDER_TYPES
/** what the Order For "…" offers per type — INFERRED (no capture opens it) */
export const QE_ORDER_FOR: Record<string, string[]> = {
  CONSULTATION: [...new Set(['CARDIOLOGY', 'DERMATOLOGY', 'INTERNAL MEDICINE', 'PSYCHIATRY', ...TRAINING_ORDER_ROWS.map(([name, d]) => orderForOf(name, d))])],
  IMAGE: ['CHEST X-RAY', 'MAMMOGRAM - SCREENING', 'ULTRASOUND - ABDOMEN'],
  INTERVENTION: ['INFLUENZA VACCINE', 'PNEUMOCOCCAL VACCINE', 'TETANUS BOOSTER'],
  LAB: ['ARTERIAL BLOOD GAS PANEL', 'HBA1C', 'LIPID PANEL - FASTING', 'SERUM CREATININE / EGFR'],
  PROCEDURE: ['COLONOSCOPY', 'PAP SMEAR', 'SPIROMETRY'],
  MISC: ['HOME CARE NURSING', 'PHYSIOTHERAPY'],
}
/** Attachment "…": Paper Forms and Letter Templates (Attach Form/Letter tab) */
export const QE_ORDER_ATTACHMENTS = ['LIFELABS LABORATORY REQUISITION', 'BC STANDARD OUTPATIENT LAB REQUISITION', 'PAP SMEAR REQUISITION', 'REFERRAL LETTER']
export const QE_AGENT_TYPES = ['Drug (Specific)', 'Drug (Category)', 'Food', 'Environmental'] as const
/** the agent "…" prompt, a few code/term pairs per agent type — INFERRED
    apart from 3 PENICILLIN (`9ac102714dc9…`) */
export const QE_AGENTS: Record<string, QuickEntryCodeTerm[]> = {
  'Drug (Specific)': [{ code: '723', term: 'AMOXICILLIN' }, { code: '1191', term: 'ASPIRIN' }, { code: '2670', term: 'CODEINE' }],
  'Drug (Category)': [{ code: '3', term: 'PENICILLIN' }, { code: '12', term: 'SULFONAMIDES' }, { code: '27', term: 'CEPHALOSPORINS' }],
  Food: [{ code: '256349002', term: 'PEANUT' }, { code: '227150003', term: 'SHELLFISH' }, { code: '102263004', term: 'EGGS' }],
  Environmental: [{ code: '111088007', term: 'LATEX' }, { code: '256277009', term: 'GRASS POLLEN' }, { code: '288328004', term: 'BEE VENOM' }],
}
/** reaction "…" prompt — 39579001 ANAPHYLAXIS is captured, the rest INFERRED */
export const QE_REACTIONS: QuickEntryCodeTerm[] = [
  { code: '39579001', term: 'ANAPHYLAXIS' }, { code: '126485001', term: 'HIVES' }, { code: '271807003', term: 'RASH' },
  { code: '422587007', term: 'NAUSEA' }, { code: '267036007', term: 'SHORTNESS OF BREATH' }, { code: '41291007', term: 'ANGIOEDEMA' },
]
/** the MSP fee code "…" — 70168 and 00090 are captured, the rest INFERRED */
export const QE_MSP_FEES: QuickEntryCodeTerm[] = [
  { code: '70168', term: 'ACTIVE WOUND MGMT-ACUTE PHASE AFTER DEBRIDEMENT' },
  { code: '00090', term: 'MAJOR TRAY' },
  { code: '13015', term: 'LACERATIONS - SIMPLE/SINGLE LAYER SUTURE' },
  { code: '00081', term: 'MINOR TRAY' },
  { code: '00100', term: 'OFFICE VISIT - GENERAL PRACTICE' },
]

/* --- the seed list -------------------------------------------------------- */
/** the TRAINING export the Chart Preference seed is read from */
const TRAINING_FILE = parseQuickEntryXml(TRAINING_QUICK_ENTRY_XML, (i) => `qe-training-${i + 1}`)
export const TRAINING_QUICK_ENTRY_HEADER: QuickEntryFileHeader = TRAINING_FILE.header

const MANUAL_SEED: QuickEntryTemplate[] = [
  {
    id: 'qe-4', group: 'Goal', name: 'Smoking Cessation', description: 'Reduce to under one pack a day',
    goal: { quantitative: true, subject: 'MEASURE', identifiedBy: 'Concept', concept: 'CIGARETTES SMOKED PACKS PER DAY', operator: '<', target: '1 pkg per day', every: '', units: '' },
  },
  {
    id: 'qe-5', group: 'MSP Secondary Claims', name: '70168', description: 'ACTIVE WOUND MGMT-ACUTE PHASE AFTER DEBRIDEMENT',
    msp: { primary: { code: '70168', term: 'ACTIVE WOUND MGMT-ACUTE PHASE AFTER DEBRIDEMENT' }, secondary: [{ code: '00090', term: 'MAJOR TRAY', services: '1' }] },
  },
  {
    id: 'qe-6', group: 'Order', name: 'Arterial Blood Gas Panel', description: 'ABG with LifeLabs requisition',
    order: { type: 'LAB', orderFor: 'ARTERIAL BLOOD GAS PANEL', attachment: 'LIFELABS LABORATORY REQUISITION' },
  },
  {
    id: 'qe-7', group: 'Reaction Risk', name: 'PENICILLIN', description: 'PENICILLIN allergy',
    reaction: {
      reactionType: 'Allergy', agentType: 'Drug (Category)', agent: { code: '3', term: 'PENICILLIN' },
      reactions: [{ code: '39579001', term: 'ANAPHYLAXIS' }, { code: '', term: '' }, { code: '', term: '' }],
      severity: 'SEVERE TO LIFE THREATENING',
    },
  },
]

const TRAINING_ORDERS: QuickEntryTemplate[] = TRAINING_ORDER_ROWS.map(([name, description], i) => ({
  id: `qe-order-${i + 1}`, group: 'Order', name, description,
  order: { type: 'CONSULTATION', orderFor: orderForOf(name, description), attachment: '' },
}))

const SEED: QuickEntryTemplate[] = [
  ...TRAINING_FILE.templates,
  ...MANUAL_SEED.filter((t) => t.group !== 'Order'),
  ...[...MANUAL_SEED.filter((t) => t.group === 'Order'), ...TRAINING_ORDERS].sort((a, b) => a.name.localeCompare(b.name)),
].sort((a, b) => QUICK_ENTRY_GROUPS.indexOf(a.group) - QUICK_ENTRY_GROUPS.indexOf(b.group))

/* --- the store ------------------------------------------------------------ */
/** the templates the last Export wrote, which Import then offers — the
    session's stand-in for the 7z on disk */
let exported: QuickEntryTemplate[] = []
let templates: QuickEntryTemplate[] = SEED
let seq = 0
/* a new frame starts on the seed list (resets with the session) */
const changes = createSignal(() => {
  templates = SEED
  seq = 0
  exported = []
})
const emit = changes.emit

export function useQuickEntryTemplates(): QuickEntryTemplate[] {
  changes.use()
  return templates
}

export const quickEntryTemplates = () => templates

export function nextQuickEntryId(): string {
  let id: string
  do { id = `qe-${++seq}` } while (templates.some((t) => t.id === id))
  return id
}

export function saveQuickEntryTemplate(t: QuickEntryTemplate) {
  templates = templates.some((x) => x.id === t.id) ? templates.map((x) => (x.id === t.id ? t : x)) : [...templates, t]
  emit()
}

export function deleteQuickEntryTemplate(id: string) {
  templates = templates.filter((t) => t.id !== id)
  emit()
}

/** Import Quick Entry: the selected rows join the list under fresh ids */
export function importQuickEntryTemplates(rows: QuickEntryTemplate[]) {
  templates = [...templates, ...rows.map((r) => ({ ...r, id: nextQuickEntryId() }))]
  emit()
}

/** a new frame starts on the seed list (the session reset runs this as the
    frame mounts — data/sessionStore.ts) */
export const resetQuickEntryTemplates = () => changes.reset()

/** the grid's row shape: Template Group / Name / Description */
export const quickEntryRow = (t: QuickEntryTemplate) => ({ group: t.group, name: t.name, description: t.description })

/** the file an Export writes and an Import reads — a 7z named the way
    `1036f91d109e…` names it, stamped with the session's clock */
export function quickEntryExportName(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `quick_entrys_${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}_500033.7z`
}

export const setExportedQuickEntries = (rows: QuickEntryTemplate[]) => { exported = rows }
export const exportedQuickEntries = () => exported
