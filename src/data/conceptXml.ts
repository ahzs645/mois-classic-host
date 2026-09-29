/* ============================================================================
   The MOIS Concept Mapping export file — Administration ▸ Designer Section ▸
   Concept Mapping ▸ Export Concepts writes it, Import Concepts reads it.

   PROVENANCE: a real TRAINING export (MOIS 02.31.23 b250508, 2026-09-29,
   225 concepts, 1,470 rules), recovered as its two XML files:
     concepts.xml  <root> ▸ <header> ▸ <object_hierarchy> naming nvo_concept
                   and its child nvo_concept_rule ▸ <concepts>, one
                   <concept> per Concept Mapping row, each with its rules in
                   <concept_rules>.
     meta.xml      the same list without <object_hierarchy> or any rules.
   The document shape is every Designer export's (data/moisExportXml.ts).

   A <concept> carries, in this order and leaving out what is blank:
     str_type        GRP (a group), SYM (a system concept — every one the
                     vaccine / measure / health-issue Health Maintenance
                     schedules name) or SYN (a synonym: BNP, BRAIN
                     NATRIURETIC PEPTIDES)
     str_hmm         Y / N — the detail's Health Maintenance Concept tick
     str_group       ADMISSION, CONSULT, FEE CODE, HEALTH ISSUE, IMAGE,
                     INTERVENTION, MEASURE, MEASURE CATEGORY, MEASURE CLASS,
                     MEDICATION, PROCEDURE
     num_hmm_code    the Health Maintenance sequence (0 when not an HM item)
     str_concept, str_description
   A <concept_rule> carries:
     str_code                      the code, `*` a trailing wildcard
     str_include_01, str_include_02, str_exclude   the text rule's strings
     str_note                      the code's term, as the Code Term column
     str_code_field                what the code is matched against: MOIS
                                   (the record's own code), str_atc_code (a
                                   medication's ATC code), str_class (a
                                   measure's class)
     str_code_system               ICD-9, SNOMED-CT, AIHS-INTERVENTION, or none
     str_rule_type                 CODE (the Code Based grid) or TEXT (the
                                   Text Based grid)
   The element order is the same in every record of the capture.
   ========================================================================= */
import {
  MoisExportFileError, cdata, children, closeExport, fieldsOf, readExportFrame, section, writeExportFrame,
  type MoisExportHeader, type MoisExportHierarchyItem,
} from './moisExportXml'

export type ConceptRuleType = 'CODE' | 'TEXT'

export type MoisConceptRule = {
  ruleType: ConceptRuleType
  /** MOIS · str_atc_code · str_class */
  codeField: string
  codeSystem?: string
  code?: string
  include1?: string
  include2?: string
  exclude?: string
  note?: string
}

export type MoisConcept = {
  /** GRP · SYM · SYN */
  type: string
  hm: boolean
  group: string
  hmCode?: string
  concept: string
  description?: string
  rules: MoisConceptRule[]
}

export type ConceptFile = {
  header: MoisExportHeader
  /** concepts.xml names nvo_concept ▸ nvo_concept_rule; meta.xml nothing */
  hierarchy: MoisExportHierarchyItem[]
  concepts: MoisConcept[]
}

export const CONCEPT_HIERARCHY: MoisExportHierarchyItem[] = [{ item: 'nvo_concept' }, { item: 'nvo_concept_rule', parent: 'nvo_concept' }]

export class ConceptFileError extends MoisExportFileError {}

/* the columns, in the order MOIS writes them */
const CONCEPT_COLUMNS: [keyof MoisConcept, string][] = [
  ['type', 'str_type'], ['hm', 'str_hmm'], ['group', 'str_group'], ['hmCode', 'num_hmm_code'],
  ['concept', 'str_concept'], ['description', 'str_description'],
]
const RULE_COLUMNS: [keyof MoisConceptRule, string][] = [
  ['code', 'str_code'], ['include1', 'str_include_01'], ['include2', 'str_include_02'], ['exclude', 'str_exclude'],
  ['note', 'str_note'], ['codeField', 'str_code_field'], ['codeSystem', 'str_code_system'], ['ruleType', 'str_rule_type'],
]

function ruleOf(f: Record<string, string>): MoisConceptRule {
  const r: MoisConceptRule = { ruleType: f.str_rule_type === 'TEXT' ? 'TEXT' : 'CODE', codeField: f.str_code_field ?? 'MOIS' }
  for (const [key, col] of RULE_COLUMNS) {
    if (key === 'ruleType' || key === 'codeField') continue
    if (f[col] !== undefined) (r as Record<string, string>)[key] = f[col]!
  }
  return r
}

/** Read a Concept Mapping export (concepts.xml or meta.xml). */
export function parseConceptXml(xml: string): ConceptFile {
  const { root, header, hierarchy } = readExportFrame(xml, 'Concept Mapping')
  const list = section(root, 'concepts')
  if (list == null) throw new ConceptFileError('This MOIS export holds no concepts (no <concepts>).')
  const concepts = children(list).filter((c) => c.tag === 'concept').map((c): MoisConcept => {
    const f = fieldsOf(c.inner)
    const concept: MoisConcept = {
      type: f.str_type ?? '', hm: f.str_hmm === 'Y', group: f.str_group ?? '', concept: f.str_concept ?? '', rules: [],
    }
    if (f.num_hmm_code !== undefined) concept.hmCode = f.num_hmm_code
    if (f.str_description !== undefined) concept.description = f.str_description
    const rules = section(c.inner, 'concept_rules')
    if (rules != null) concept.rules = children(rules).filter((r) => r.tag === 'concept_rule').map((r) => ruleOf(fieldsOf(r.inner)))
    return concept
  })
  return { header, hierarchy, concepts }
}

/* --- writing -------------------------------------------------------------- */
const valueOf = (c: MoisConcept, key: keyof MoisConcept): string | undefined => {
  if (key === 'hm') return c.hm ? 'Y' : 'N'
  const v = c[key]
  return typeof v === 'string' && (v !== '' || key === 'concept' || key === 'type' || key === 'group') ? v : undefined
}

/** One file. `rules: false` writes meta.xml's rule-less list. */
export function serializeConceptXml(file: Pick<ConceptFile, 'header' | 'hierarchy' | 'concepts'>, opts: { rules?: boolean } = {}): string {
  const withRules = opts.rules ?? file.hierarchy.length > 0
  const lines = writeExportFrame(file.header, file.hierarchy)
  let first = true
  for (const c of file.concepts) {
    const fields = CONCEPT_COLUMNS.flatMap(([key, col]) => {
      const v = valueOf(c, key)
      return v === undefined ? [] : [`<${col}>${cdata(v)}</${col}>`]
    })
    fields[0] = `${first ? '<concepts>' : ''}<concept>${fields[0] ?? ''}`
    first = false
    lines.push(...fields)
    if (withRules && c.rules.length) {
      c.rules.forEach((r, i) => {
        const cols = RULE_COLUMNS.flatMap(([key, col]) => {
          const v = r[key]
          return v === undefined || (v === '' && key !== 'codeField' && key !== 'ruleType') ? [] : [`<${col}>${cdata(v)}</${col}>`]
        })
        cols[0] = `${i === 0 ? '<concept_rules>' : ''}<concept_rule>${cols[0] ?? ''}`
        lines.push(...cols, '</concept_rule>')
      })
      lines.push('</concept_rules>')
    }
    lines.push('</concept>')
  }
  lines.push(first ? '<concepts></concepts>' : '</concepts>')
  return closeExport(lines)
}

/** the two files an export 7z holds — meta.xml first, the full file last */
export function conceptExportFiles(concepts: MoisConcept[], header: MoisExportHeader): { name: string; text: string }[] {
  return [
    { name: 'meta.xml', text: serializeConceptXml({ header, hierarchy: [], concepts }, { rules: false }) },
    { name: 'concepts.xml', text: serializeConceptXml({ header, hierarchy: CONCEPT_HIERARCHY, concepts }) },
  ]
}
