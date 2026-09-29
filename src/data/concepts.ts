/* ============================================================================
   Concept Mapping — the clinic's concepts, and what a concept matches.

   The list is the user's real TRAINING export (conceptTrainingExport.
   generated.ts, 225 concepts / 1,470 rules; data/conceptXml.ts reads it),
   held in a store for as long as the frame (`resetConcepts`) so Concept
   Mapping Detail's Save Changes, New Record and Import Concepts change what
   every other screen that asks "does this record belong to concept X" sees.

   MATCHING. A concept matches a record when any one of its rules does.
     CODE  str_code against the field str_code_field names — the record's own
           code (MOIS), its ATC code (str_atc_code) or its measure class
           (str_class). A trailing `*` is a prefix wildcard, otherwise the
           whole code must match; case and ICD-9's dot are ignored (the export
           writes 2899 for 289.9). A rule naming a code system only matches a
           record in that system, when the record says which it is in.
     TEXT  the record's description must contain Include String 1 and, when
           set, Include String 2, and must not contain the Exclude String —
           "MOIS searches them as wildcards" (art. 302269), so each is a
           case-blind substring, spaces kept ('ACQUI ' is not 'ACQUIRED'); a
           string of only spaces counts as blank.
   INFERRED: that a text rule ignores its code system (the export tags
   HEALTH ISSUE text rules ICD-9 and IMAGE ones SNOMED-CT, which reads as the
   group's default rather than a filter); that a text rule with no include
   string matches nothing (BOWEL ENDOSCOPY carries one, and matching every
   record would put every patient under it); that a CODE rule's include
   strings (ANTICOAGULATION's 789 / TEST) play no part.
   ========================================================================= */
import { useSyncExternalStore } from 'react'
import { TRAINING_CONCEPT_XML } from './conceptTrainingExport.generated'
import { parseConceptXml, type MoisConcept, type MoisConceptRule } from './conceptXml'
import type { MoisExportHeader } from './moisExportXml'

export type ConceptEntry = MoisConcept & { id: string }

/** what a record offers a rule */
export type ConceptTarget = {
  code?: string | null
  codeSystem?: string | null
  atc?: string | null
  measureClass?: string | null
  description?: string | null
}

/* --- matching ------------------------------------------------------------- */
const norm = (s: string | null | undefined) => (s ?? '').trim().toUpperCase()
const systemKey = (s: string | null | undefined) => norm(s).replace(/[^A-Z0-9]/g, '')
const codeKey = (s: string, system: string) => (systemKey(system).startsWith('ICD') ? s.replace(/\./g, '') : s)

function codeMatches(pattern: string, value: string, system: string): boolean {
  const p = codeKey(norm(pattern), system)
  const v = codeKey(norm(value), system)
  if (!p || !v) return false
  return p.endsWith('*') ? v.startsWith(p.slice(0, -1)) : v === p
}

export function ruleMatches(rule: MoisConceptRule, t: ConceptTarget): boolean {
  if (rule.ruleType === 'TEXT') {
    const text = norm(t.description)
    const inc = [rule.include1, rule.include2].filter((s): s is string => !!s && s.trim() !== '').map((s) => s.toUpperCase())
    if (!text || inc.length === 0) return false
    if (!inc.every((s) => text.includes(s))) return false
    return !(rule.exclude?.trim() && text.includes(rule.exclude.toUpperCase()))
  }
  const value = rule.codeField === 'str_atc_code' ? t.atc : rule.codeField === 'str_class' ? t.measureClass : t.code
  if (!rule.code || !value) return false
  if (rule.codeField === 'MOIS' && rule.codeSystem && t.codeSystem && systemKey(rule.codeSystem) !== systemKey(t.codeSystem)) return false
  return codeMatches(rule.code, value, rule.codeSystem ?? t.codeSystem ?? '')
}

export const conceptMatches = (c: Pick<MoisConcept, 'rules'>, t: ConceptTarget) => c.rules.some((r) => ruleMatches(r, t))

/** the Text Based grid's read-only Rule column — "Has DIABETES but exlude if
    it has GESTA" [sic] is the capture's; the two-include form is INFERRED */
export function ruleSentence(r: Pick<MoisConceptRule, 'include1' | 'include2' | 'exclude'>): string {
  const inc = [r.include1, r.include2].filter((s) => s && s.trim())
  if (!inc.length) return ''
  const has = `Has ${inc.join(' and ')}`
  return r.exclude?.trim() ? `${has} but exlude if it has ${r.exclude}` : has
}

/** the Code Based grid's Code System column: the rule's own system, else
    what its code field reads (INFERRED — no capture shows an ATC or class
    rule in the grid) */
export function ruleCodeSystem(r: MoisConceptRule): string {
  if (r.codeSystem) return r.codeSystem
  if (r.codeField === 'str_atc_code') return 'ATC'
  if (r.codeField === 'str_class') return 'MEASURE CLASS'
  return 'MOIS'
}

/* --- the seed ------------------------------------------------------------- */
const TRAINING_FILE = parseConceptXml(TRAINING_CONCEPT_XML)
export const TRAINING_CONCEPT_HEADER: MoisExportHeader = TRAINING_FILE.header
const SEED: ConceptEntry[] = TRAINING_FILE.concepts.map((c, i) => ({ ...c, id: `concept-${i + 1}` }))

/* --- the store ------------------------------------------------------------ */
export type ConceptExportFile = { name: string; concepts: MoisConcept[] }

let concepts: ConceptEntry[] = SEED
/** the files this session's Export Concepts wrote, which Import then offers
    — the session's stand-in for the folder on disk */
let exported: ConceptExportFile[] = []
let seq = 0
let version = 0
const listeners = new Set<() => void>()
const emit = () => { version += 1; listeners.forEach((l) => l()) }
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }

export function useConcepts(): ConceptEntry[] {
  useSyncExternalStore(subscribe, () => version, () => version)
  return concepts
}

export const allConcepts = () => concepts

const nextId = () => {
  let id: string
  do { id = `concept-new-${++seq}` } while (concepts.some((c) => c.id === id))
  return id
}

/** a concept by name, and group when two groups share the name (LABORATORY) */
export function findConcept(name: string, group?: string): ConceptEntry | undefined {
  const n = norm(name)
  const g = group ? norm(group) : ''
  return concepts.find((c) => norm(c.concept) === n && (!g || norm(c.group) === g))
    ?? concepts.find((c) => norm(c.concept) === n)
}

export const conceptNames = (group?: string) => concepts.filter((c) => !group || c.group === group).map((c) => c.concept)

/** Save Changes: replaces the concept of the same id */
export function saveConcept(c: ConceptEntry) {
  concepts = concepts.map((x) => (x.id === c.id ? c : x))
  emit()
}

/** New Record's Create Record */
export function addConcept(c: MoisConcept): ConceptEntry {
  const entry = { ...c, id: nextId() }
  concepts = [...concepts, entry]
  emit()
  return entry
}

export const conceptExists = (c: Pick<MoisConcept, 'group' | 'concept'>) =>
  concepts.some((x) => norm(x.group) === norm(c.group) && norm(x.concept) === norm(c.concept))

/** Import Concepts: the chosen concepts join the list; one already there
    (same group and name) is left alone */
export function importConcepts(rows: MoisConcept[]): number {
  const fresh = rows.filter((r) => !conceptExists(r))
  concepts = [...concepts, ...fresh.map((r) => ({ ...structuredClone(r), id: nextId() }))]
  emit()
  return fresh.length
}

export const exportedConceptFiles = () => exported
export function rememberConceptExport(file: ConceptExportFile) {
  exported = [...exported.filter((f) => f.name !== file.name), file]
}

/** a new frame starts on the seed list */
export function resetConcepts() {
  concepts = SEED
  exported = []
  seq = 0
  version += 1
}

/** the Concept Mapping List's row shape */
export const conceptRow = (c: ConceptEntry): Record<string, string | boolean | undefined> => ({
  group: c.group, concept: c.concept, desc: c.description ?? '', hm: c.hm, type: c.type, __id: c.id,
})
