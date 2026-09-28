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
   INFERRED: the Influenza Vaccine template's detail (only its list row is
   captured) and the Pharmanet one (the article names Pharmanet consent as a
   preference; no template capture carries it).
   ========================================================================= */
import { useSyncExternalStore } from 'react'
import type { PreferenceIdentifiedBy, PreferenceType } from './preferenceVocab'

export const QUICK_ENTRY_GROUPS = ['Chart Preference', 'Goal', 'MSP Secondary Claims', 'Order', 'Reaction Risk'] as const
export type QuickEntryGroup = typeof QUICK_ENTRY_GROUPS[number]

export type QuickEntryPreference = {
  type: PreferenceType
  subject: string
  identifiedBy: PreferenceIdentifiedBy
  concept: string
  instruction: string
  sensitive: boolean
  showOnDemo: boolean
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

/* --- vocabularies the editors drop ---------------------------------------- */
/** art. 3071982, "Quick Entry Template - Goal" */
export const GOAL_SUBJECTS = ['CONSULT', 'IMAGE', 'INTERVENTION', 'MEASURE', 'PROCEDURE']
/** Target Value Operator — INFERRED beyond the captured `<` */
export const GOAL_OPERATORS = ['<', '<=', '=', '>=', '>']
/** "a recurrent time period (e.g. days, hours, weeks, months, years)" */
export const GOAL_UNITS = ['HOURS', 'DAYS', 'WEEKS', 'MONTHS', 'YEARS']
/** art. 3071982 "Quick Entry Template - Order": the types as OrderView's
    Order Type DDDW prints them (303588 `48e7423c…`) */
export const QE_ORDER_TYPES = [
  { type: 'CONSULTATION', description: 'Medical Consultation Request' },
  { type: 'IMAGE', description: 'Medical Imaging Request' },
  { type: 'INTERVENTION', description: 'Medical Intervention Request' },
  { type: 'LAB', description: 'Medical Laboratory Requisition' },
  { type: 'PROCEDURE', description: 'Medical Procedure Request' },
  { type: 'MISC', description: 'Miscellaneous' },
]
/** what the Order For "…" offers per type — INFERRED (no capture opens it) */
export const QE_ORDER_FOR: Record<string, string[]> = {
  CONSULTATION: ['CARDIOLOGY', 'DERMATOLOGY', 'INTERNAL MEDICINE', 'PSYCHIATRY'],
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
const SEED: QuickEntryTemplate[] = [
  {
    id: 'qe-1', group: 'Chart Preference', name: 'Influenza Vaccine - Not Desired', description: '',
    preference: { type: 'Directive', subject: 'MEDICATION', identifiedBy: 'Concept', concept: 'INFLUENZA VACCINE', instruction: 'NOT DESIRED', sensitive: false, showOnDemo: true },
  },
  {
    id: 'qe-2', group: 'Chart Preference', name: 'VACCINATIONS - NOT DESIRED', description: 'Declined all vaccines',
    preference: { type: 'Consent', subject: 'MEDICATION', identifiedBy: 'Concept', concept: 'ALL VACCINES', instruction: 'NOT ALLOW', sensitive: false, showOnDemo: true },
  },
  {
    id: 'qe-3', group: 'Chart Preference', name: 'Pharmanet Consent - Allow', description: 'Consent for Pharmanet access on file',
    preference: { type: 'Disclosure', subject: 'OTHER', identifiedBy: 'Free Text', concept: 'PHARMANET ACCESS', instruction: 'ALLOW', sensitive: false, showOnDemo: true },
  },
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

/* --- the store ------------------------------------------------------------ */
/** the templates the last Export wrote, which Import then offers — the
    session's stand-in for the 7z on disk */
let exported: QuickEntryTemplate[] = []
let templates: QuickEntryTemplate[] = SEED
let seq = SEED.length
let version = 0
const listeners = new Set<() => void>()
const emit = () => { version += 1; listeners.forEach((l) => l()) }
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }

export function useQuickEntryTemplates(): QuickEntryTemplate[] {
  useSyncExternalStore(subscribe, () => version, () => version)
  return templates
}

export const quickEntryTemplates = () => templates

export const nextQuickEntryId = () => `qe-${++seq}`

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

/** a new frame starts on the seed list */
export function resetQuickEntryTemplates() {
  templates = SEED
  seq = SEED.length
  exported = []
  version += 1
}

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
