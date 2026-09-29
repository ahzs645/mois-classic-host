/* ============================================================================
   Summary Settings — what the Care Plan Summary shows for the open chart
   (Patient Chart ▸ Care Plan ▸ Summary Settings, art. 303514).

   Two lists per chart, kept for the session like data/chartSession.ts:

     sections   Care Plan Sections: Order · Section Label · Type (SYSTEM for
                a built-in section, USER for a custom one). The Order column
                "controls the display order of the section in the Care Plan
                Summary".
     elements   Care Plan Elements added in Summary Settings (New Record, Add
                from Template): a Category, a code or concept, and either
                This Record Only (absolute — one record, pinned) or a Rule
                (relative — "the N most recent / initial / highest / lowest
                records"), a Record is Required flag, a Section and a Rank.

   The absolute tags made from a folder's right-click Tag to Care Plan
   (screens/TagToCarePlanDialog.tsx) stay in data/chartSession.ts; Summary
   Settings lists them as elements too, and edits / deletes them there.

   `carePlanSummaryRows` is the one place the Care Plan summary's rows are
   put together: the folders it gathers (data/carePlanRows.ts), the tags, and
   each relative element resolved against the chart export, in the order the
   Sections list gives. The summary view, its snapshot and its print preview
   all read it, so they agree.

   PROVENANCE: art. 303514 (text; its three captures are not in the local
   manual), b256251d0d8f (303115's Summary Settings capture, v02.19.04: the
   Care Plan Elements tab, MEASURE · WEIGHT · INITIAL *RECORD(S): 1). The
   default section list, the concept→record matching and the "missing
   record" row text are INFERRED.
   ========================================================================= */
import { createSignal } from './sessionStore'
import type { MoisChartExport, MoisRecord } from './charts'
import { CARE_PLAN_SECTIONS, carePlanRows, type CarePlanRow } from './carePlanRows'
import type { CarePlanTag } from './chartSession'
import { toDots } from './clock'

export type SummarySection = { label: string; order: string; type: 'SYSTEM' | 'USER' }

/** Rules a relative element can use (art. 303514); `THIS RECORD` is the
    absolute kind — This Record Only */
export const ELEMENT_RULES = ['RECENT', 'INITIAL', 'HIGHEST', 'LOWEST'] as const

/** "Dynamic/Rule based records are limited to these 6 categories" (303514),
    plus MAR, which 303115's DIABETES template uses (a1d8149d2b6e) */
export const ELEMENT_CATEGORIES = ['MEASURE', 'IMAGE', 'CONSULT', 'INTERVENTION', 'PROCEDURE', 'FACILITY ADMISSION', 'MAR'] as const

export type CarePlanElement = {
  id: string
  category: string
  identifiedBy: 'Code' | 'Concept'
  code: string
  concept: string
  /** RECENT / INITIAL / HIGHEST / LOWEST, or THIS RECORD for an absolute one */
  rule: string
  records: string
  /** show a missing record in red (true) or grey (false) */
  required: boolean
  section: string
  rank: string
  /** This Record Only: the record pinned when the element was made */
  pinned?: { date: string; description: string; value: string }
}

/** The "Select Standard Sections" list: the summary's own sections (2070139
    `3d93f580…`), the sections 303115's template files under, and ORDER. */
export const STANDARD_SECTIONS: string[] = [
  ...CARE_PLAN_SECTIONS, 'ORDER', 'MAR', 'IMAGING', 'INTERVENTIONS', 'PROCEDURES', 'FACILITY ADMISSIONS',
]

/** A chart starts with the summary's built-in sections, in its order. */
const DEFAULT_SECTIONS: SummarySection[] = CARE_PLAN_SECTIONS.map((label, i) => ({ label, order: String((i + 1) * 50), type: 'SYSTEM' }))

type ChartState = { sections?: SummarySection[]; elements: CarePlanElement[] }

const state: Record<string, ChartState> = {}
let seq = 0
const changes = createSignal(() => { for (const key of Object.keys(state)) delete state[key] })
const emit = changes.emit
const of = (chart: string): ChartState => (state[chart] ??= { elements: [] })
const EMPTY: ChartState = { elements: [] }

export type SummarySettingsState = { sections: SummarySection[]; elements: CarePlanElement[] }

const read = (chart: string): SummarySettingsState => {
  const s = state[chart] ?? EMPTY
  return { sections: s.sections ?? DEFAULT_SECTIONS, elements: s.elements }
}

/** re-render on any change, then read the chart's sections and elements */
export function useSummarySettings(chart: string): SummarySettingsState {
  changes.use()
  return read(chart)
}

export const summarySettings = (chart: string): SummarySettingsState => read(chart)

const num = (v: string) => (Number.isFinite(Number(v)) && v.trim() !== '' ? Number(v) : Number.MAX_SAFE_INTEGER)
const byOrder = (a: SummarySection, b: SummarySection) => num(a.order) - num(b.order)

/** the chart's sections, by Order, with any section a tag or element uses
    but the list lacks added on the end ("MOIS will automatically add the
    section") */
export function effectiveSections(chart: string, tags: CarePlanTag[] = []): SummarySection[] {
  const { sections, elements } = read(chart)
  const out = [...sections].sort(byOrder)
  let top = out.reduce((m, s) => Math.max(m, num(s.order) === Number.MAX_SAFE_INTEGER ? 0 : num(s.order)), 0)
  for (const label of [...tags.map((t) => t.section || 'GENERAL'), ...elements.map((e) => e.section)]) {
    if (label && !out.some((s) => s.label === label)) {
      top += 10
      out.push({ label, order: String(top), type: STANDARD_SECTIONS.includes(label) ? 'SYSTEM' : 'USER' })
    }
  }
  return out
}

/* --- sections ------------------------------------------------------------ */
const sectionsOf = (chart: string) => (of(chart).sections ??= DEFAULT_SECTIONS.map((s) => ({ ...s })))

export function addSections(chart: string, labels: { label: string; type: 'SYSTEM' | 'USER' }[]) {
  const list = sectionsOf(chart)
  let top = list.reduce((m, s) => Math.max(m, num(s.order) === Number.MAX_SAFE_INTEGER ? 0 : num(s.order)), 0)
  for (const { label, type } of labels) {
    const clean = label.trim().toUpperCase()
    if (!clean || list.some((s) => s.label === clean)) continue
    top += 10
    list.push({ label: clean, order: String(top), type })
  }
  of(chart).sections = [...list]
  emit()
}

export function updateSection(chart: string, label: string, patch: Partial<SummarySection>) {
  of(chart).sections = sectionsOf(chart).map((s) => (s.label === label ? { ...s, ...patch } : s))
  emit()
}

export function deleteSection(chart: string, label: string) {
  of(chart).sections = sectionsOf(chart).filter((s) => s.label !== label)
  emit()
}

/* --- elements ------------------------------------------------------------ */
export function addElements(chart: string, elements: Omit<CarePlanElement, 'id'>[]) {
  const made = elements.map((e) => ({ ...e, id: `session-element-${++seq}` }))
  of(chart).elements = [...of(chart).elements, ...made]
  /* a section the list lacks joins it */
  const missing = made.map((e) => e.section).filter((s, i, all) => s && all.indexOf(s) === i && !read(chart).sections.some((x) => x.label === s))
  if (missing.length) addSections(chart, missing.map((label) => ({ label, type: STANDARD_SECTIONS.includes(label) ? 'SYSTEM' : 'USER' })))
  else emit()
}

export function updateElement(chart: string, id: string, patch: Partial<CarePlanElement>) {
  of(chart).elements = of(chart).elements.map((e) => (e.id === id ? { ...e, ...patch } : e))
  emit()
}

export function deleteElement(chart: string, id: string) {
  of(chart).elements = of(chart).elements.filter((e) => e.id !== id)
  emit()
}

/** a new frame starts on the chart's default summary (the session reset runs
    this as the frame mounts — data/sessionStore.ts) */
export const resetSummarySettings = () => changes.reset()

/* --- resolving a rule against the chart ----------------------------------- */

/** Which chart records a concept means. The export's measures carry codes
    and descriptions, not concepts, so each concept names the codes and a
    description pattern (INFERRED — MOIS keeps this in Concept Mapping). */
const CONCEPT_MATCH: Record<string, { codes: string[]; re: RegExp }> = {
  BMI: { codes: ['951'], re: /BODY MASS INDEX|\bBMI\b/i },
  BP: { codes: ['1950', '61826'], re: /BLOOD PRESSURE/i },
  HGBA1C: { codes: ['HBA1C', '128'], re: /A1C/i },
  WEIGHT: { codes: ['22732'], re: /^WEIGHT/i },
  HEIGHT: { codes: ['1948'], re: /^HEIGHT/i },
  TEMPERATURE: { codes: ['2010'], re: /TEMPERATURE/i },
  GFR: { codes: ['27540'], re: /GFR/i },
  'PHQ-9 TOTAL SCORE': { codes: ['43894'], re: /PHQ-9/i },
  LDL: { codes: [], re: /\bLDL\b/i },
  TRIGLYCERIDES: { codes: [], re: /TRIGLYCERIDE/i },
  'UALB/CR': { codes: [], re: /ALB.*CREAT|UALB/i },
  'WAIST CIRCUMFERENCE': { codes: [], re: /WAIST/i },
  'CHOLESTEROL/HDL RATIO': { codes: [], re: /HDL/i },
  'CIGARETTES SMOKED PACKS PER DAY': { codes: [], re: /CIGARETTE/i },
  INR: { codes: [], re: /\bINR\b/i },
  'FEV1/FVC': { codes: [], re: /FEV1/i },
}

type Found = { date: string; description: string; value: string; n: number }

const day = toDots

/** the records a category draws on, as date / description / code / value */
function pool(data: MoisChartExport | null, category: string): { date: string; description: string; code: string; value: string; n: number }[] {
  if (!data) return []
  const visible = (r: MoisRecord) => r.str_sensitive !== 'Y'
  const orders = (types: string[]) => data.order.filter((r) => visible(r) && types.includes(r.str_order_type ?? ''))
    .map((r) => ({ date: day(r.dtm_ord_date), description: r.str_description ?? r.str_code_term ?? '', code: r.str_code ?? '', value: day(r.dtm_finish_date), n: NaN }))
  switch (category) {
    case 'MEASURE':
      return data.measure.filter(visible).map((r) => ({
        date: day(r.dtm_collect_date), description: r.str_description ?? r.str_order_name ?? '',
        code: r.str_code ?? r.str_loinic_num ?? '', value: [r.str_value, r.str_units].filter(Boolean).join(' '),
        n: parseFloat(r.str_value ?? ''),
      }))
    case 'CONSULT': return orders(['CONSULTATION'])
    case 'IMAGE': return orders(['IMAGING', 'XRAY'])
    case 'PROCEDURE': return orders(['PROCEDURE'])
    case 'INTERVENTION':
      return (data.intervention ?? []).filter(visible).map((r) => ({ date: day(r.dtm_date), description: r.str_description ?? '', code: r.str_code ?? '', value: '', n: NaN }))
    case 'FACILITY ADMISSION':
      return (data.admission ?? []).filter(visible).map((r) => ({ date: day(r.dtm_admit), description: r.str_facility ?? r.str_description ?? '', code: r.str_code ?? '', value: day(r.dtm_discharge), n: NaN }))
    case 'MAR':
      return data.mar.filter(visible).map((r) => ({ date: day(r.dtm_admin_date), description: r.str_generic_name ?? r.str_medication ?? '', code: r.str_din ?? r.str_code ?? '', value: [r.num_dose_size, r.str_dose_unit].filter(Boolean).join(' '), n: NaN }))
    default: return []
  }
}

/** the records a code / concept names, before the rule is applied */
function matching(data: MoisChartExport | null, e: Pick<CarePlanElement, 'category' | 'identifiedBy' | 'code' | 'concept'>) {
  const all = pool(data, e.category).filter((r) => r.date)
  if (e.identifiedBy === 'Code') {
    const code = e.code.split(/\s+/)[0]!.toUpperCase()
    return code ? all.filter((r) => r.code.toUpperCase() === code) : []
  }
  const concept = e.concept.trim().toUpperCase()
  if (!concept) return []
  const known = CONCEPT_MATCH[concept]
  if (known) return all.filter((r) => known.codes.includes(r.code.toUpperCase()) || known.re.test(r.description))
  const stem = concept.split(/\s+/)[0]!.slice(0, 6)
  return all.filter((r) => r.description.toUpperCase().includes(concept) || (stem.length >= 4 && r.description.toUpperCase().includes(stem)))
}

/** what a rule picks: art. 303514's four rules, N records */
export function resolveElement(data: MoisChartExport | null, e: CarePlanElement): Found[] {
  if (e.rule === 'THIS RECORD') return e.pinned ? [{ ...e.pinned, n: NaN }] : []
  const found = matching(data, e)
  const n = Math.max(1, parseInt(e.records, 10) || 1)
  const sorted = [...found].sort((a, b) => {
    switch (e.rule) {
      case 'INITIAL': return a.date.localeCompare(b.date)
      case 'HIGHEST': return (Number.isNaN(b.n) ? -Infinity : b.n) - (Number.isNaN(a.n) ? -Infinity : a.n)
      case 'LOWEST': return (Number.isNaN(a.n) ? Infinity : a.n) - (Number.isNaN(b.n) ? Infinity : b.n)
      default: return b.date.localeCompare(a.date)
    }
  })
  return sorted.slice(0, n)
}

/** New Record's This Record Only pins the newest record the code / concept names */
export function pinRecord(data: MoisChartExport | null, e: Pick<CarePlanElement, 'category' | 'identifiedBy' | 'code' | 'concept'>): CarePlanElement['pinned'] {
  const newest = [...matching(data, e)].sort((a, b) => b.date.localeCompare(a.date))[0]
  return newest ? { date: newest.date, description: newest.description, value: newest.value } : undefined
}

/** the codes the chart's own records of a category carry, for New Record's
    Code list — `22732 - WEIGHT` */
export function chartCodes(data: MoisChartExport | null, category: string): string[] {
  const seen = new Map<string, string>()
  for (const r of pool(data, category)) if (r.code && !seen.has(r.code)) seen.set(r.code, r.description)
  return [...seen].map(([c, d]) => `${c} - ${d}`).sort()
}

/** the element's name in its own grid: the concept, or `code - description` */
export const elementLabel = (e: Pick<CarePlanElement, 'identifiedBy' | 'code' | 'concept'>) =>
  (e.identifiedBy === 'Code' ? e.code : e.concept).toUpperCase()

/** the Elements grid's third column for a rule: `INITIAL *RECORD(S): 1` (b256251d0d8f) */
export const ruleText = (e: Pick<CarePlanElement, 'rule' | 'records'>) =>
  (e.rule === 'THIS RECORD' ? 'THIS RECORD ONLY' : `${e.rule} *RECORD(S): ${e.records || '1'}`)

/* --- the summary's rows ---------------------------------------------------- */

/** A summary row; `tone` paints a rule's missing record red (Record is
    Required) or grey. */
export type SummaryRow = CarePlanRow & { tone?: 'required' | 'optional' }

const rankOf = (v: string) => (v.trim() === '' || Number.isNaN(Number(v)) ? Number.MAX_SAFE_INTEGER : Number(v))

/**
 * Every row of the Care Plan summary for this chart, section by section in
 * the Sections list's order. Within a section the gathered folder rows come
 * first, then tags and elements by Rank.
 */
export function carePlanSummaryRows(data: MoisChartExport | null, chart: string, tags: CarePlanTag[]): SummaryRow[] {
  const sections = effectiveSections(chart, tags)
  const base: SummaryRow[] = carePlanRows(data, [])
  const ranked: { rank: number; row: SummaryRow }[] = []
  tags.forEach((t) => ranked.push({ rank: rankOf(t.rank), row: { section: t.section || 'GENERAL', date: t.date, description: t.description, detail: t.detail, comment: '', link: '↪' } }))
  for (const e of read(chart).elements) {
    const found = resolveElement(data, e)
    if (!found.length) {
      ranked.push({ rank: rankOf(e.rank), row: { section: e.section, date: '', description: elementLabel(e), detail: '', comment: '', link: '', tone: e.required ? 'required' : 'optional' } })
      continue
    }
    for (const f of found) ranked.push({ rank: rankOf(e.rank), row: { section: e.section, date: f.date, description: f.description || elementLabel(e), detail: f.value, comment: '', link: '↪' } })
  }
  const extra = ranked.map((r, i) => [r, i] as const).sort(([a, i], [b, j]) => a.rank - b.rank || i - j).map(([r]) => r.row)
  const order = new Map(sections.map((s, i) => [s.label, i]))
  return [...base, ...extra]
    .filter((r) => order.has(r.section))
    .map((r, i) => [r, i] as const)
    .sort(([a, i], [b, j]) => order.get(a.section)! - order.get(b.section)! || i - j)
    .map(([r]) => r)
}

/** the sections that have rows, in summary order */
export function carePlanSummarySections(chart: string, tags: CarePlanTag[], rows: CarePlanRow[]): string[] {
  return effectiveSections(chart, tags).map((s) => s.label).filter((s) => rows.some((r) => r.section === s))
}
