/* ============================================================================
   Letters, templates, responses and e-faxes — what the Letter Writer family
   of windows writes during a session.

   Everything here lives in the frame's session store (`useSessionState`,
   host/screen-windows.tsx): it outlasts the window that wrote it and is
   dropped with the frame, so a new stage starts on the seeds below.

     templates   Administration ▸ Designer Section ▸ Letter Templates: the body
                 each template was authored with (303101), header and footer
                 regions included (304753 "Create yourself a header").
     letters     the letters attached to an Order: UNDISTRIBUTED until
                 Distribute (F2) sends them, then DISTRIBUTED. A correction is
                 a copy of a distributed letter (303589 `e5cee8b0…`,
                 `61160ce7…` — the Attached Letters window).
     responses   the documents sent in response to an Information Request
                 Order (2961349 `71ab5b8c…` Respond to Order, `03485f9c…`
                 the Order's Links tab).
     efax        Administration ▸ eFax Accounts (2616562 `ac8030cc…`).
     faxes       what SRFax queued: the QUEUED status the Print History and
                 the Distribution tabs print (2616562 `d5512c5a…`, `c85ea0f7…`).

   PROVENANCE: articles 303101, 303589, 2961349, 2616562, 304753, 3785340.
   The field catalogue under each Add Database Field source is the article's
   prose list (303101 "Patient Chart: Allows auto-input of patient
   demographic information …") filled out with the populator names its
   captures print (`57c54992…`: [Author Letterhead 1..5], [Current Date],
   [Patient Full Name], [Patient Address 1], [Patient City] …). Which source
   each captured name sits under is INFERRED from the prose.

   All records are fictional training data.
   ========================================================================= */
import { useSessionState } from '../host/screen-windows'
import { SRFAX_ENABLED_ROW, VIEWER_MODE_ROW, isYes, useSystemSetting } from './systemSettings'
import { stageStamp } from './clock'

/* ---- Add Database Field: the sources and their fields -------------------- */

/** 303101: "Select the Source … and then select a Field". Source order is the
    article's; the capture's drop-downs open empty (`d273caae…`). */
export const FIELD_CATALOGUE: Record<string, string[]> = {
  'Patient Chart': [
    'Patient Full Name', 'Patient First Name', 'Patient Last Name', 'Patient Age', 'Patient Gender',
    'Patient Date of Birth', 'Patient PHN', 'Patient PHN Province', 'Patient Chart Number',
    'Patient Address 1', 'Patient Address 2', 'Patient City', 'Patient Province', 'Patient Postal Code',
    'Patient Primary Phone', 'Patient Home Phone', 'Patient Work Phone', 'Patient Cell Phone',
  ],
  'External Provider': [
    'Provider Full Name', 'Provider Address', 'Provider City', 'Provider Province', 'Provider Postal Code',
    'Provider Phone', 'Provider Fax',
  ],
  'Internal Provider': [
    'Provider Signature', 'Provider Practitioner Number', 'Provider Payee Number',
    'Provider Letterhead 1', 'Provider Letterhead 2', 'Provider Letterhead 3', 'Provider Letterhead 4', 'Provider Letterhead 5',
  ],
  /* 304753: "for the first choose 'Desktop Provider'. For the second drop
     down, choose 'Provider Letterhead 1' … all the way to 'Provider
     letterhead 5'" */
  'Desktop Provider': [
    'Provider Letterhead 1', 'Provider Letterhead 2', 'Provider Letterhead 3', 'Provider Letterhead 4', 'Provider Letterhead 5',
    'Provider Signature', 'Provider Practitioner Number', 'Provider Payee Number',
  ],
  /* 304753: "change the top drop down to 'Record Information' second drop
     down will be Recipient Name" and "add a field for 'Record Information'
     and 'Record Report/Comment'". The captures' [Author Letterhead n] are
     the record author's letterhead, so they are listed here (INFERRED). */
  'Record Information': [
    'Record Date', 'Record Code', 'Record Description', 'Record Report/Comment', 'Recipient Name',
    'Author Name', 'Author Letterhead 1', 'Author Letterhead 2', 'Author Letterhead 3', 'Author Letterhead 4', 'Author Letterhead 5',
  ],
  General: ['Current Date', 'Current User', 'Total Pages'],
  'Progress Note': ['Progress Note'],
}

export const FIELD_SOURCES = Object.keys(FIELD_CATALOGUE)

/* ---- Add Tag: what each tag prints in the template ------------------------
   303101's nineteen, in its order. The capture of the drop-down (`a885b995…`)
   reads "Reaction Risks" where the prose says "Reaction Risks (Allergies)";
   the capture wins. The token each tag drops into the page is the capture's
   (`<HEALTH ISSUES>`, `<ALLERGIES>`) and, for the rest, the Letter Setup
   section it pulls from (data/letterSetup.ts) — INFERRED. */
export const TAG_TOKENS: [string, string][] = [
  ['BPMH', 'BPMH'],
  ['Consults', 'CONSULT'],
  ['Document List', 'DOCUMENTS'],
  ['Encounter List', 'ENCOUNTERS'],
  ['Facility Admission', 'ADMISSIONS'],
  ['Family History', 'FAMILY HX'],
  ['Goals List', 'GOALS'],
  ['Health Issue List', 'HEALTH ISSUES'],
  ['Imaging', 'IMAGES'],
  ['Interventions', 'INTERVENTIONS'],
  ['Long Term Meds List', 'LT MEDS'],
  ['Measurements', 'MEASURES'],
  ['Message List', 'MESSAGES'],
  ['Preferences List', 'PREFERENCES'],
  ['Prescription List', 'PRESCRIPTIONS'],
  ['Procedures', 'PROCEDURE'],
  ['Reaction Risks', 'ALLERGIES'],
  ['Social History', 'SOCIAL HX'],
  ['Task List', 'TASKS'],
]
export const TAG_SOURCES = TAG_TOKENS.map(([label]) => label)
export const tagToken = (label: string) => TAG_TOKENS.find(([l]) => l === label)?.[1] ?? label.toUpperCase()

/* ---- a template's body ---------------------------------------------------- */

export type TemplateToken =
  | { t: 'text'; s: string }
  /** a yellow database field, printed `[Name]` */
  | { t: 'field'; s: string; source?: string }
  /** a yellow tag, printed `<NAME>` */
  | { t: 'tag'; s: string }

export type TemplateRegion = 'header' | 'body' | 'footer'

export type TemplateLine = {
  region: TemplateRegion
  tokens: TemplateToken[]
  align?: 'left' | 'center' | 'right'
  bold?: boolean
  underline?: boolean
  /** a horizontal rule rather than text (`57c54992…` under the letterhead) */
  rule?: boolean
}

export type TemplateBody = {
  lines: TemplateLine[]
  /** Insert ▸ First Page Header puts the header on page one only */
  headerFirstPageOnly?: boolean
  footerFirstPageOnly?: boolean
  /** the .docx it was imported from (303101 Import Letter Template) */
  importedFrom?: string
  /** stamped by Save */
  savedAt?: string
}

const text = (s: string): TemplateToken => ({ t: 'text', s })
const field = (s: string): TemplateToken => ({ t: 'field', s })
const tag = (s: string): TemplateToken => ({ t: 'tag', s })
const body = (tokens: TemplateToken[], extra: Partial<TemplateLine> = {}): TemplateLine => ({ region: 'body', tokens, ...extra })

/** 303101 `57c54992…` + `a885b995…`: the referral template the article builds. */
export const SAMPLE_REFERRAL_BODY: TemplateBody = {
  lines: [
    body([field('Author Letterhead 1')]),
    body([field('Author Letterhead 2')]),
    body([], { rule: true }),
    body([field('Author Letterhead 3'), text(' '), field('Author Letterhead 4')], { align: 'center' }),
    body([field('Author Letterhead 5')], { align: 'center' }),
    body([]),
    body([field('Current Date')]),
    body([]),
    body([text('Re: '), field('Patient Full Name')]),
    body([text('       '), field('Patient Address 1'), text(' '), field('Patient City'), text(' '), field('Patient Province')]),
    body([text('       '), field('Patient Postal Code')]),
    body([text('       '), field('Patient Date of Birth'), text(' '), field('Patient Gender'), text(' '), field('Patient Primary Phone')]),
    body([]),
    body([text('Dear '), field('Provider Full Name')]),
    body([text('Thank you for seeing this '), field('Patient Age'), text(' year old '), field('Patient Gender'), text('  patient.')]),
    body([]),
    body([text('Past Medical History')], { bold: true, underline: true }),
    body([tag('HEALTH ISSUES')]),
    body([text('Allergies')], { bold: true, underline: true }),
    body([tag('ALLERGIES')]),
  ],
}

/** What Create a new letter from an existing file brings in from a .docx
    (303101 Import Letter Template). The file's text, as plain runs: the
    Letter Writer "will match basic Word formatting". INFERRED content. */
export const IMPORTED_DOCX_BODY: TemplateBody = {
  lines: [
    body([text('NORTHERN INTERIOR SPECIALIZED SERVICES')], { bold: true, align: 'center' }),
    body([text('Virtual Psychiatry Clinic — Referral')], { align: 'center' }),
    body([]),
    body([text('Patient name: ')]),
    body([text('Date of birth: ')]),
    body([text('Reason for referral: ')]),
    body([]),
    body([text('Referring provider signature: ')]),
  ],
}

/** The templates the stage ships with a body (Select Letter Template's list,
    data/letterSetup.ts, and the Designer's Letter Template List). */
const SEED_TEMPLATES: Record<string, TemplateBody> = {
  'REFERRAL LETTER - GENERAL': SAMPLE_REFERRAL_BODY,
  'ORTHOPAEDIC REFERRAL': SAMPLE_REFERRAL_BODY,
}

export const TEMPLATE_BODIES_KEY = 'letters:template-bodies'

/** Every template's body by name; a template with none opens blank. */
export function useTemplateBodies(): [Record<string, TemplateBody>, (name: string, body: TemplateBody) => void] {
  const [bodies, setBodies] = useSessionState<Record<string, TemplateBody>>(TEMPLATE_BODIES_KEY, SEED_TEMPLATES)
  return [bodies, (name, b) => setBodies((all) => ({ ...all, [name]: b }))]
}

/** How many fields / tags / header lines a body carries — a lesson grades these. */
export function templateCounts(b: TemplateBody | undefined) {
  const lines = b?.lines ?? []
  const tokens = lines.flatMap((l) => l.tokens)
  return {
    fields: tokens.filter((t) => t.t === 'field').length,
    tags: tokens.filter((t) => t.t === 'tag').length,
    header: lines.some((l) => l.region === 'header'),
    footer: lines.some((l) => l.region === 'footer'),
  }
}

/* ---- the template being designed ------------------------------------------
   Which template the designer window is editing, and how it was started
   (New Letter's three options). The Letter Template Detail's Edit sets it. */
export type DesignerStart = { template: string; type: string; option: 'blank' | 'template' | 'file'; from?: string; file?: string }
export const DESIGNER_START_KEY = 'letters:designer-start'

/* ---- templates authored in the Designer ------------------------------------
   Name → Type / Description, written when the designer saves a template, so
   a new template reaches Select Letter Template and the Send window's
   Use a Letter Template ("a letter template will not show as an option if
   you have not previously created a letter template for the document type
   that you have selected", 2961349). */
export type TemplateMeta = { name: string; type: string; description: string }
export const TEMPLATE_META_KEY = 'letters:template-meta'
export function useTemplateMeta(): [TemplateMeta[], (m: TemplateMeta) => void] {
  const [rows, set] = useSessionState<TemplateMeta[]>(TEMPLATE_META_KEY, [])
  return [rows, (m) => set((all) => [...all.filter((x) => x.name !== m.name), m])]
}

/* ---- letters attached to Orders ------------------------------------------- */

export type AttachedLetter = {
  id: string
  chart: string
  orderId: string
  date: string
  author: string
  /** LetterDocId */
  doc: string
  /** what the Document Type column prints */
  type: string
  note: string
  status: 'UNDISTRIBUTED' | 'DISTRIBUTED'
  template: string
  /** the letter this one corrects (Correct a Distributed Letter) */
  correctionOf?: string
}

export const ATTACHED_LETTERS_KEY = 'letters:attached'

/* Chart 87288 (MOIS_REF_10000013): one letter in progress and one already
   sent, so the Attached Letters window has something to continue and
   something to correct. Training overlay records, labelled as such: the
   export carries no letters. They sit on orders 522665 and 522664 (each unique in the Select
   Consultation Order list, unlike 522658/522659, which print alike), not on
   522680 — the Order Select Consultation Order opens on, which the existing
   New Referral Mode lesson walks straight through to the template picker. */
const SEED_LETTERS: AttachedLetter[] = [
  {
    id: 'training-letter-522665', chart: '87288', orderId: '522665', date: '2025.09.19', author: 'TECHNICAL SUPPORT',
    doc: 'referral', type: 'REFERRAL', note: 'INTENSIVE CASE MANAGEMENT - COMMUNITY OUTREACH', status: 'UNDISTRIBUTED', template: 'REFERRAL LETTER - GENERAL',
  },
  {
    id: 'training-letter-522664', chart: '87288', orderId: '522664', date: '2025.09.19', author: 'TECHNICAL SUPPORT',
    doc: 'referral', type: 'REFERRAL', note: 'FUNCTIONAL TRAINING', status: 'DISTRIBUTED', template: 'REFERRAL LETTER - GENERAL',
  },
]

/** The seeded sent letter's distribution, so its Order's Distribution tab
    agrees with its DISTRIBUTED status. */
export const SEED_DISTRIBUTIONS = [
  {
    chart: '87288', orderId: '522664', doc: 'referral', date: '2025.09.19',
    title: 'REFERRAL NOTE - FUNCTIONAL TRAINING',
    rows: [{ method: 'CDX', type: 'PRIMARY RECIPIENT', name: 'PCIPT 1 SMI', status: 'SUCCESS' }],
  },
]

export function useAttachedLetters(): [AttachedLetter[], (update: (all: AttachedLetter[]) => AttachedLetter[]) => void] {
  const [letters, setLetters] = useSessionState<AttachedLetter[]>(ATTACHED_LETTERS_KEY, SEED_LETTERS)
  return [letters, (u) => setLetters((all) => u(all))]
}

/* ---- Information Request responses ---------------------------------------- */

export type OrderResponse = {
  id: string
  chart: string
  orderId: string
  date: string
  author: string
  /** MISC · NOTE · NOTIFICATION · PATIENT SUMMARY */
  type: string
  note: string
  status: 'UNDISTRIBUTED' | 'DISTRIBUTED'
  recipient: string
  correctionOf?: string
}

export const ORDER_RESPONSES_KEY = 'letters:responses'

export function useOrderResponses(): [OrderResponse[], (update: (all: OrderResponse[]) => OrderResponse[]) => void] {
  const [rows, set] = useSessionState<OrderResponse[]>(ORDER_RESPONSES_KEY, [])
  return [rows, (u) => set((all) => u(all))]
}

/** 2961349 `0480d274…`: the response Document Type drop-down, as captured. */
export const RESPONSE_DOC_TYPES = [
  { type: 'MISC', description: 'General Medicine Note' },
  { type: 'NOTE', description: 'Note / General Purpose Document' },
  { type: 'NOTIFICATION', description: 'General Purpose Notification' },
  { type: 'PATIENT SUMMARY', description: 'Patient Summary' },
]

/** the band the Send window prints for each document type (`0480d274…`
    "Responding With Patient Summary", `9a83e429…` "Send General Purpose
    Notification"); the others follow their Description (INFERRED) */
export const SEND_BAND: Record<string, string> = {
  MISC: 'General Medicine Note',
  NOTE: 'General Purpose Document',
  NOTIFICATION: 'General Purpose Notification',
  'PATIENT SUMMARY': 'Patient Summary',
  'INFORMATION REQUEST': 'New Information Request',
}

/* ---- eFax accounts and the SRFax queue ------------------------------------ */

export type EfaxAccount = { alias: string; account: string; password: string; email: string; fax: string }

export const EFAX_ACCOUNTS_KEY = 'admin:efax-accounts'

/* 2616562 `ac8030cc…` lists one account aliased "Test"; its Send eFax
   capture (`a38e5ffb…`) shows the same alias as "Test (139663) 250.277.3594",
   so that account number is used for both. Fictional. */
export const SEED_EFAX_ACCOUNTS: EfaxAccount[] = [
  { alias: 'Test', account: '139663', password: 'srfax-training', email: 'frontdesk@example.org', fax: '250-277-3594' },
]

export function useEfaxAccounts(): [EfaxAccount[], (next: EfaxAccount[]) => void] {
  const [rows, set] = useSessionState<EfaxAccount[]>(EFAX_ACCOUNTS_KEY, SEED_EFAX_ACCOUNTS)
  return [rows, (next) => set(next)]
}

export type QueuedFax = {
  date: string
  chart: string
  title: string
  recipient: string
  fax: string
  /** QUEUED until SRFax reports; the stage never hears back */
  status: 'QUEUED' | 'SUCCESS' | 'FAILED'
  from: 'viewer' | 'letter' | 'prescription'
}

export const FAX_LOG_KEY = 'letters:fax-log'

export function useFaxLog(): [QueuedFax[], (fax: QueuedFax) => void] {
  const [rows, set] = useSessionState<QueuedFax[]>(FAX_LOG_KEY, [])
  return [rows, (fax) => set((all) => [fax, ...all])]
}

/* ---- a Documents record distributed on its own (303445) ------------------- */
export type DocDistribution = {
  chart: string
  documentId: string
  date: string
  title: string
  rows: { method: string; type: string; name: string; status: string }[]
}
export const DOC_DISTRIBUTIONS_KEY = 'letters:doc-distributions'
export function useSessionDocDistributions(): [DocDistribution[], (d: DocDistribution) => void] {
  const [rows, set] = useSessionState<DocDistribution[]>(DOC_DISTRIBUTIONS_KEY, [])
  return [rows, (d) => set((all) => [d, ...all])]
}

export const nowStamp = () => stageStamp()

/* ---- the clipboard a measurement graph is copied to -----------------------
   304699: "Select the small graphic on the top left of the graph · Options
   → Copy to Clipboard · … · Open the letter … · 'Paste'". The browser
   clipboard is not readable without a permission prompt, so the graph
   window also leaves its SVG here for the Letter Writer's Edit ▸ Paste. */
let letterClipboard: { kind: 'graph'; svg: string; title: string } | null = null
export const setLetterClipboard = (clip: typeof letterClipboard) => { letterClipboard = clip }
export const readLetterClipboard = () => letterClipboard

/* ---- the System Settings these windows read --------------------------------
   The rows belong to Administration ▸ System Settings (stream E2), read
   through its `useSystemSetting(rowId)` (data/systemSettings.ts): what its
   Save committed this session, else the transcribed value.
     APP SETTING ▸ Referral Mode         (S)tandard or (N)ew — 303589
     APP SETTING ▸ MOIS Viewer Mode      S, E, SI — 304734, 2616562
     APP SETTING - SRFAX ▸ Enabled       Y / N — 2616562 */

/** 303589: Standard Mode prints the referral from Order Detail; New Referral
    Mode writes it in the Letter Writer. */
export const useStandardReferralMode = () => useSystemSetting('referral-mode').trim().toUpperCase().startsWith('S')

/** 2616562: "In order to use fax integration for requisitions, the MOIS
    Viewer must be set to 'Embedded' mode" and SRFax enabled. */
export function useViewerFax(): boolean {
  const srfax = isYes(useSystemSetting(SRFAX_ENABLED_ROW))
  const modes = useSystemSetting(VIEWER_MODE_ROW).toUpperCase().split(',').map((m) => m.trim())
  return srfax && modes.includes('E')
}
export const useSrfaxEnabled = () => isYes(useSystemSetting(SRFAX_ENABLED_ROW))
