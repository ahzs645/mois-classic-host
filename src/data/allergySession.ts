/* ============================================================================
   Allergy / Intolerances: what a learner files into the open chart during a
   session — Reaction Risks, Adverse Events, the links between them, and the
   Reaction Risks folder's `** NO KNOWN **` assertion.

   The chart export is read-only; these live here, per chart, so the folder
   grids (screens/reportRecords.ts), the event and risk tabs, the Reviewing
   window and any other window that files a Reaction Risk (New Reaction Risk,
   Elevate Event To a Reaction Risk, the New Adverse Event's "Link to a New
   Reaction Risk", Quick Entry) all agree. A tiny external store, the
   data/chartSession.ts pattern, so a writer needs no wiring through the frame:

     addReactionRisk(chart, { reactionType, agentType, agentTerm, reactions,
                              severity, firstOccurrence, … })

   PROVENANCE: art. 303131 "Allergy/Intolerances" —
   · `659a688f…` New Reaction Risk wizard fields (Reaction Type, Agent Type,
     Date of Onset/Stopped, Agent, Reaction 1…, Severity, Comments);
   · `3eb9ccdf…` Reaction Risk detail (Certainty, Criticality, Type, Agent,
     Comment, Risk Status, Severity, Category, Phase at Onset, Informant,
     Observer, Documenter, Agent Category);
   · `8f620729…` / `0d3d5d53…` / `b7ebbce5…` an Adverse Event's Onset/Time,
     Type, Severity, Comment, Event Type, agents (Category, Agent / Brand
     Name / Manufacturer, Lot/Series Number, Dose, Route, Site) and reactions
     (Code, Reaction, Rank);
   · `8ed81b2c…` / `a4b9f727…` No Known: "if there are no allergies present, a
     ** NO KNOWN ** assertion will be added under the Search bar"; it is
     listed in Reviewing: Reaction Risk's Review History as a `No Known` row
     with a Delete, and "when an allergy is added to this window it will
     automatically remove the ** NO KNOWN ** assertion".

   INFERRED: the Category tick is set only for an agent of type Drug
   (Category) (the article: "Check the box IF the allergy is a drug which
   belongs to a drug category"); the export's `str_is_drug` is `N` for its
   PENICILLIN category record, so a Drug (Specific) agent is filed `Y`.
   ========================================================================= */
import { createSignal } from './sessionStore'
import type { MoisRecord } from './charts'
import { SESSION_USER } from './chartSession'
import { MOIS_TODAY, hhmmss, toSlashes } from './clock'

export type ReactionType = 'Allergy' | 'Intolerance'
export type AgentType = 'Drug (Specific)' | 'Drug (Category)' | 'Food' | 'Environmental'
export type CodedTerm = { code: string; term: string }

/** What any window files as a Reaction Risk. Dates are `yyyy.mm.dd`. */
export type ReactionRiskInput = {
  reactionType: ReactionType
  agentType: AgentType
  agentCode?: string
  agentTerm: string
  reactions?: CodedTerm[]
  severity?: string
  /** Date of Onset; today when omitted */
  firstOccurrence?: string
  /** Quick Entry's age at first occurrence, kept on the record's comment line */
  age?: string
  stopped?: string
  comments?: string
  certainty?: string
  criticality?: string
  riskStatus?: string
  phaseAtOnset?: string
  informant?: string
  observer?: string
  documenter?: string
  agentCategory?: string
  /** adverse events (their `id_adverse_event`) this risk is evidence-linked to */
  linkEvents?: string[]
}

export type EventAgent = {
  category: boolean
  code: string
  agent: string
  brand: string
  manufacturer: string
  lot: string
  series: string
  doseQty: string
  doseUnit: string
  route: string
  site: string
}
export type EventReaction = CodedTerm & { rank: string }

export type AdverseEventInput = {
  onset: string
  time: string
  type: string
  severity: string
  comment: string
  agents: EventAgent[]
  reactions: EventReaction[]
}

type StoredRisk = { id: string; input: ReactionRiskInput; created: string }
type StoredEvent = { id: string; input: AdverseEventInput; created: string }
export type EventRiskLink = { event: string; risk: string }
export type NoKnownAssertion = { date: string; by: string }

type AllergyState = {
  risks: StoredRisk[]
  events: StoredEvent[]
  /** agents / reactions edited on an event's tabs, by id_adverse_event */
  parts: Record<string, { agents?: EventAgent[]; reactions?: EventReaction[] }>
  links: EventRiskLink[]
  /** `${event}|${risk}` pairs unlinked, including the export's own */
  unlinked: string[]
  /** by folder (`reaction`); the store is shaped for Conditions / LTM too */
  noKnown: Record<string, NoKnownAssertion | undefined>
}

const state: Record<string, AllergyState> = {}
let seq = 0
const changes = createSignal(() => { for (const key of Object.keys(state)) delete state[key] })
const emit = changes.emit
const blank = (): AllergyState => ({ risks: [], events: [], parts: {}, links: [], unlinked: [], noKnown: {} })
const EMPTY = blank()
/* each write replaces the chart's slice, so a reader memoising on it sees
   the change */
const of = (chart: string): AllergyState => (state[chart] = { ...(state[chart] ?? blank()) })

/* stamped on the stage's day, as the export writes it: 2026/09/18 14:05:09 */
const now = () => `${toSlashes(MOIS_TODAY)} ${hhmmss()}`
/* not clock.ts toSlashes: this keeps a trailing time and leaves dashes alone */
const slash = (d?: string) => (d ?? '').replace(/\./g, '/')
export const pairKey = (l: EventRiskLink) => `${l.event}|${l.risk}`

/** re-render on any change, then read the chart's slice */
export function useAllergySession(chart: string): AllergyState {
  changes.use()
  return state[chart] ?? EMPTY
}

export const allergySession = (chart: string): AllergyState => state[chart] ?? EMPTY

/** `DRUG ALLERGY`, `FOOD INTOLERANCE` … the Type column's wording */
export function riskTypeOf(i: Pick<ReactionRiskInput, 'agentType' | 'reactionType'>): string {
  const agent = i.agentType.startsWith('Drug') ? 'DRUG' : i.agentType.toUpperCase()
  return `${agent} ${i.reactionType.toUpperCase()}`
}

/** File a Reaction Risk; returns its id. Clears the folder's No Known. */
export function addReactionRisk(chart: string, input: ReactionRiskInput): string {
  const s = of(chart)
  const id = `session-risk-${++seq}`
  s.risks = [{ id, input, created: now() }, ...s.risks]
  if (input.linkEvents?.length) s.links = [...s.links, ...input.linkEvents.map((event) => ({ event, risk: id }))]
  /* 303131: "when an allergy is added to this window it will automatically
     remove the ** NO KNOWN ** assertion" */
  s.noKnown = { ...s.noKnown, reaction: undefined }
  emit()
  return id
}

/** File a New Adverse Event (Event Type NORMAL); returns its id. */
export function addAdverseEvent(chart: string, input: AdverseEventInput): string {
  const s = of(chart)
  const id = `session-ae-${++seq}`
  s.events = [{ id, input, created: now() }, ...s.events]
  emit()
  return id
}

export function setEventParts(chart: string, id: string, parts: { agents?: EventAgent[]; reactions?: EventReaction[] }) {
  const s = of(chart)
  s.parts = { ...s.parts, [id]: { ...s.parts[id], ...parts } }
  emit()
}

export function linkEventRisk(chart: string, links: EventRiskLink[]) {
  const s = of(chart)
  const have = new Set(s.links.map(pairKey))
  const drop = new Set(links.map(pairKey))
  s.links = [...s.links, ...links.filter((l) => !have.has(pairKey(l)))]
  s.unlinked = s.unlinked.filter((k) => !drop.has(k))
  emit()
}

export function unlinkEventRisk(chart: string, link: EventRiskLink) {
  const s = of(chart)
  const key = pairKey(link)
  s.links = s.links.filter((l) => pairKey(l) !== key)
  if (!s.unlinked.includes(key)) s.unlinked = [...s.unlinked, key]
  emit()
}

/** The export's links plus this session's, less the ones unlinked. */
export function effectiveLinks(chart: string, exported: EventRiskLink[]): EventRiskLink[] {
  const s = allergySession(chart)
  const gone = new Set(s.unlinked)
  const seen = new Set<string>()
  return [...exported, ...s.links].filter((l) => {
    const k = pairKey(l)
    if (gone.has(k) || seen.has(k)) return false
    seen.add(k)
    return true
  })
}

export function setNoKnown(chart: string, folder: string, by: string) {
  const s = of(chart)
  s.noKnown = { ...s.noKnown, [folder]: { date: MOIS_TODAY, by } }
  emit()
}

export function clearNoKnown(chart: string, folder: string) {
  const s = of(chart)
  s.noKnown = { ...s.noKnown, [folder]: undefined }
  emit()
}

/* --- the rows and records the folder grids list ---------------------------- */

export type StoredItem = { row: Record<string, string>; record: MoisRecord }

export function riskItem(r: StoredRisk): StoredItem {
  const i = r.input
  const type = riskTypeOf(i)
  const reactions = (i.reactions ?? []).map((x) => x.term).filter(Boolean).join(', ').toUpperCase()
  const comment = [i.comments ?? '', i.age ? `Age at first occurrence: ${i.age}` : ''].filter(Boolean).join('\n')
  return {
    row: {
      __key: r.id,
      onset: i.firstOccurrence ?? MOIS_TODAY,
      tilde: '',
      type,
      category: i.agentType === 'Drug (Category)' ? '✓' : '',
      code: i.agentCode ?? '',
      agent: i.agentTerm.toUpperCase(),
      reactions,
      severity: i.severity ?? '',
      m: '',
      clip: '-',
    },
    record: {
      id_allergy: r.id,
      dtm_start: slash(i.firstOccurrence ?? MOIS_TODAY),
      dtm_end: slash(i.stopped),
      str_intolerance_type: type,
      str_substance_code: i.agentCode ?? '',
      str_substance: i.agentTerm.toUpperCase(),
      str_reactions: reactions,
      str_severity: i.severity ?? '',
      str_is_drug: i.agentType === 'Drug (Specific)' ? 'Y' : 'N',
      str_comment: comment,
      str_certainity: i.certainty ?? '',
      str_criticality: i.criticality ?? '',
      str_risk_status: i.riskStatus ?? '',
      str_informant: i.informant ?? '',
      str_observer: i.observer ?? '',
      str_documenter: i.documenter ?? '',
      str_category: i.agentCategory ?? '',
      str_phase_at_onset: i.phaseAtOnset ?? '',
      stp_user_create: SESSION_USER,
      stp_date_create: r.created,
      stp_user_modify: SESSION_USER,
      stp_date_modify: r.created,
    },
  }
}

export function eventItem(e: StoredEvent): StoredItem {
  const i = e.input
  const [hr = '', min = ''] = i.time.split(':').map((x) => x.trim())
  const agents = i.agents.map((a) => a.agent).filter(Boolean).join(', ').toUpperCase()
  const reactions = i.reactions.map((x) => x.term).filter(Boolean).join(', ').toUpperCase()
  return {
    row: { __key: e.id, onset: i.onset, agents, reactions, m: '', clip: '-' },
    record: {
      id_adverse_event: e.id,
      dtm_administered: slash(i.onset),
      num_administered_hr: hr,
      num_administered_min: min,
      str_agents: agents,
      str_reactions: reactions,
      str_severity: i.severity,
      str_intolerance_type: i.type,
      /* not `str_comment`: that is the Recommendations tab's Comments */
      str_event_comment: i.comment,
      str_event_type: 'NORMAL',
      stp_record_state: 'UNSIGNED',
      stp_user_create: SESSION_USER,
      stp_date_create: e.created,
      stp_user_modify: SESSION_USER,
      stp_date_modify: e.created,
    },
  }
}

/** The stored rows a folder lists above the export's, newest first. */
export function storedItems(node: string, s: AllergyState): StoredItem[] {
  if (node === 'reaction' || node === 'allergy') return s.risks.map(riskItem)
  if (node === 'events') return s.events.map(eventItem)
  return []
}

/** A stored risk's reactions, in the Reactions tab's record shape. */
export function storedRiskReactions(chart: string, id?: string): MoisRecord[] {
  const r = allergySession(chart).risks.find((x) => x.id === id)
  return (r?.input.reactions ?? []).map((x, i) => ({
    str_reaction_code: x.code, str_reaction: x.term.toUpperCase(), num_rank: String(i), str_severity: r?.input.severity ?? '',
  }))
}

export function storedEvent(chart: string, id?: string): AdverseEventInput | undefined {
  return allergySession(chart).events.find((x) => x.id === id)?.input
}

/** a new frame starts on the chart as exported (the session reset runs this
    as the frame mounts — data/sessionStore.ts) */
export const resetAllergySession = () => changes.reset()
