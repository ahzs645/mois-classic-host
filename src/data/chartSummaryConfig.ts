/* ============================================================================
   Administration ▸ Configuration ▸ Chart Summaries — what Save keeps, and the
   Record Filter a saved section applies on the Patient Summary.

   PROVENANCE: art. 303353 "How To Add Specific Measures to the Chart
   Summary": in the PATIENT SUMMARY configuration, New Record, pick the record
   type (MEASURE), type a Record Filter —

     (str_code in ('363','31971')) order by dtm_collect_date desc, id_measure desc limit 3
     (str_description like '%PAPAN%') order by dtm_collect_date desc, id_measure desc limit 3

   — enter a Banner Title ("Last 3 INR Values"), Save, and the patient's
   Patient Summary opens with a new band of those measures (`c5c22b00…png`,
   `b8f6ce26…png` the configuration; `cf5e62ee…png`, `aea85292…png` the
   summary: "LAST 3 INR VALUES [3]" in the section's banner colour above
   DEMOGRAPHICS, each row Date · Description (with a "Ref. Range:  to" line)
   · Detail = the value · the MOIS hyperlink glyph).

   A tiny external store, per summary, so the configuration window and the
   Patient Summary agree for the rest of the session without shell wiring.
   Only the Patient Summary reads it back, and only for sections a learner
   added (New Record): the transcribed sections keep the look the summary's
   own captures give them.

   The Record Filter is the WHERE / ORDER BY / LIMIT tail MOIS appends to the
   section's SQL. Evaluated here: `field in ('a','b')`, `field = 'a'`,
   `field like '%a%'` (SQL wildcards % and _), combined with and / or / not
   and parentheses, then `order by f [asc|desc], …` and `limit n`, over the
   chart export's own column names. RECENT / REQUIRED (the window's own
   placeholders) and anything this cannot parse select nothing. INFERRED:
   MOIS's behaviour on a filter it cannot run (it is SQL there, and would
   raise a database error); an empty band is this emulator's stand-in.
   ========================================================================= */
import { createSignal } from './sessionStore'
import type { SummarySection } from './adminLists'
import type { MoisRecord } from './charts/types'
import type { SummarySection as PatientSummarySection } from './summary'
import { toDots } from './clock'

/** A configuration row, with the flags the window needs on top of the
    transcribed shape: that a learner added it with New Record. */
export type ConfigSection = SummarySection & {
  added?: boolean
  /** added and not saved yet: its Section Code is still a drop-down */
  pending?: boolean
}

const saved: Record<string, ConfigSection[]> = {}
/* a new frame starts on the summaries as configured (resets with the
   session; before, nothing reset this, so one lesson's saved configuration
   showed in the next) */
const changes = createSignal(() => { for (const key of Object.keys(saved)) delete saved[key] })

/** back to the summaries as configured (the session reset runs this as the
    frame mounts — data/sessionStore.ts) */
export const resetChartSummaryConfig = () => changes.reset()

/** The saved configuration of one summary (`patient`, `careplan`, …), or null
    when it has never been saved this session. */
export function savedSummary(summary: string): ConfigSection[] | null {
  return saved[summary] ?? null
}

export function saveSummary(summary: string, sections: ConfigSection[]) {
  saved[summary] = sections.map((s) => ({ ...s }))
  changes.emit()
}

export function useSavedSummary(summary: string): ConfigSection[] | null {
  changes.use()
  return saved[summary] ?? null
}

/** PowerBuilder colour numbers are BGR: 8421631 → #ff8080. */
export function pbColour(value?: string): string | undefined {
  if (!value || !/^\d+$/.test(value.trim())) return undefined
  const n = Number(value)
  if (n > 0xffffff) return undefined
  const hex = (v: number) => v.toString(16).padStart(2, '0')
  return `#${hex(n & 255)}${hex((n >> 8) & 255)}${hex((n >> 16) & 255)}`
}

/** What kind of Record Filter a section carries — a slug for grading, never the text. */
export function filterKind(filter?: string): 'none' | 'code' | 'description' | 'other' {
  const f = (filter ?? '').trim()
  if (!f) return 'none'
  if (/\bstr_code\b/i.test(f)) return 'code'
  if (/\bstr_description\b/i.test(f)) return 'description'
  return 'other'
}

/* --- the filter ------------------------------------------------------------ */

type Tok = { t: 'word' | 'str' | 'num' | 'op' | '(' | ')' | ','; v: string }

function tokenize(src: string): Tok[] | null {
  const out: Tok[] = []
  let i = 0
  while (i < src.length) {
    const c = src[i]!
    if (/\s/.test(c)) { i += 1; continue }
    /* straight and typographic quotes both: the manual prints curly ones */
    if (/['"‘’“”]/.test(c)) {
      let j = i + 1
      let v = ''
      while (j < src.length && !/['"‘’“”]/.test(src[j]!)) { v += src[j]; j += 1 }
      if (j >= src.length) return null
      out.push({ t: 'str', v }); i = j + 1; continue
    }
    if (c === '(' || c === ')' || c === ',') { out.push({ t: c, v: c }); i += 1; continue }
    if (c === '=' ) { out.push({ t: 'op', v: '=' }); i += 1; continue }
    if (c === '<' || c === '>' || c === '!') {
      const two = src.slice(i, i + 2)
      if (two === '<>' || two === '!=' || two === '<=' || two === '>=') { out.push({ t: 'op', v: two }); i += 2; continue }
      if (c === '!') return null
      out.push({ t: 'op', v: c }); i += 1; continue
    }
    const m = /^[A-Za-z_][A-Za-z0-9_.]*/.exec(src.slice(i))
    if (m) { out.push({ t: 'word', v: m[0] }); i += m[0].length; continue }
    const n = /^-?\d+(\.\d+)?/.exec(src.slice(i))
    if (n) { out.push({ t: 'num', v: n[0] }); i += n[0].length; continue }
    return null
  }
  return out
}

type Pred = (r: MoisRecord) => boolean

function likeToRegExp(pattern: string): RegExp {
  const body = pattern.split('').map((ch) => (ch === '%' ? '.*' : ch === '_' ? '.' : ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).join('')
  return new RegExp(`^${body}$`, 'i')
}

/** where-clause recursive descent: or → and → not → atom */
function parseWhere(toks: Tok[]): Pred | null {
  let p = 0
  const peekWord = (w: string) => toks[p]?.t === 'word' && toks[p]!.v.toLowerCase() === w
  const value = (): string | null => {
    const t = toks[p]
    if (t && (t.t === 'str' || t.t === 'num')) { p += 1; return t.v }
    return null
  }
  const atom = (): Pred | null => {
    if (toks[p]?.t === '(') {
      p += 1
      const inner = or()
      if (!inner || toks[p]?.t !== ')') return null
      p += 1
      return inner
    }
    const field = toks[p]
    if (field?.t !== 'word') return null
    p += 1
    const get = (r: MoisRecord) => String(r[field.v.toLowerCase()] ?? r[field.v] ?? '')
    const negate = peekWord('not') ? (p += 1, true) : false
    if (peekWord('in')) {
      p += 1
      if (toks[p]?.t !== '(') return null
      p += 1
      const list: string[] = []
      for (;;) {
        const v = value()
        if (v === null) return null
        list.push(v)
        if (toks[p]?.t === ',') { p += 1; continue }
        if (toks[p]?.t === ')') { p += 1; break }
        return null
      }
      return (r) => list.includes(get(r)) !== negate
    }
    if (peekWord('like')) {
      p += 1
      const v = value()
      if (v === null) return null
      const re = likeToRegExp(v)
      return (r) => re.test(get(r)) !== negate
    }
    if (negate) return null
    const op = toks[p]
    if (op?.t !== 'op') return null
    p += 1
    const v = value()
    if (v === null) return null
    const cmp = (a: string) => {
      const x = Number(a); const y = Number(v)
      return Number.isFinite(x) && Number.isFinite(y) && a !== '' ? x - y : a.localeCompare(v)
    }
    switch (op.v) {
      case '=': return (r) => get(r) === v
      case '<>': case '!=': return (r) => get(r) !== v
      case '<': return (r) => cmp(get(r)) < 0
      case '>': return (r) => cmp(get(r)) > 0
      case '<=': return (r) => cmp(get(r)) <= 0
      case '>=': return (r) => cmp(get(r)) >= 0
      default: return null
    }
  }
  const not = (): Pred | null => {
    if (peekWord('not')) { p += 1; const inner = not(); return inner ? (r) => !inner(r) : null }
    return atom()
  }
  const and = (): Pred | null => {
    let left = not()
    while (left && peekWord('and')) { p += 1; const right = not(); if (!right) return null; const l = left; left = (r) => l(r) && right(r) }
    return left
  }
  function or(): Pred | null {
    let left = and()
    while (left && peekWord('or')) { p += 1; const right = and(); if (!right) return null; const l = left; left = (r) => l(r) || right(r) }
    return left
  }
  const pred = or()
  return pred && p === toks.length ? pred : null
}

/** Apply a section's Record Filter to a chart's records; null = not runnable. */
export function applyRecordFilter(records: MoisRecord[], filter: string): MoisRecord[] | null {
  const src = filter.trim()
  if (!src || /\b(RECENT|REQUIRED)\b/.test(src)) return null
  const lower = src.toLowerCase()
  const orderAt = lower.search(/\border\s+by\b/)
  const limitAt = lower.search(/\blimit\s+\d+\s*$/)
  const whereEnd = [orderAt, limitAt].filter((n) => n >= 0).reduce((a, b) => Math.min(a, b), src.length)
  const whereText = src.slice(0, whereEnd)
  const toks = tokenize(whereText)
  const pred = toks && toks.length ? parseWhere(toks) : null
  if (!pred) return null
  let rows = records.filter(pred)
  if (orderAt >= 0) {
    const orderText = src.slice(orderAt, limitAt > orderAt ? limitAt : src.length).replace(/^order\s+by\s+/i, '')
    const keys = orderText.split(',').map((k) => k.trim().split(/\s+/)).filter((k) => k[0])
      .map(([field, dir]) => ({ field: field!.toLowerCase(), desc: (dir ?? '').toLowerCase() === 'desc' }))
    rows = [...rows].sort((a, b) => {
      for (const k of keys) {
        const x = String(a[k.field] ?? ''); const y = String(b[k.field] ?? '')
        const nx = Number(x); const ny = Number(y)
        const c = x !== '' && y !== '' && Number.isFinite(nx) && Number.isFinite(ny) ? nx - ny : x.localeCompare(y)
        if (c) return k.desc ? -c : c
      }
      return 0
    })
  }
  if (limitAt >= 0) rows = rows.slice(0, Number(/\d+/.exec(src.slice(limitAt))![0]))
  return rows
}

/* --- the Patient Summary's added bands -------------------------------------- */

const summaryDate = toDots

/** The bands a saved PATIENT SUMMARY configuration adds: one per section a
    learner added with New Record whose code this emulator can fill
    (MEASURE, from the chart's measures), in rank order. Each row is Date ·
    Description · Detail (the value and its units) with the "Ref. Range:
    lower to upper" line the captures print under the description, and the
    hyperlink into Measures. */
export function addedSummaryBands(config: ConfigSection[] | null, measures: MoisRecord[]): (PatientSummarySection & { rank: number })[] {
  if (!config) return []
  return config
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => s.added && s.code === 'MEASURE')
    .sort((a, b) => a.s.rank - b.s.rank || a.i - b.i)
    .map(({ s, i }) => {
      const pool = s.hideSensitive ? measures.filter((m) => m.str_sensitive !== 'Y') : measures
      const rows = applyRecordFilter(pool, s.filter ?? '') ?? []
      return {
        id: `added-${i}`,
        rank: s.rank,
        title: s.title?.trim() || 'MEASURES',
        accent: pbColour(s.colour) ?? s.swatch,
        open: Boolean(s.expand),
        rows: rows.map((m) => ({
          recordId: m.id_measure,
          date: summaryDate(m.dtm_collect_date),
          description: m.str_description ?? '',
          note: `Ref. Range:  ${m.str_normal_lower ?? ''} to ${m.str_normal_high ?? ''}`.replace(/\s+$/, ''),
          detail: [m.str_value, m.str_units].filter(Boolean).join(' '),
          link: 'Measures' as const,
        })),
      }
    })
}

/** Lay the added bands into the summary's own: a band ranked ahead of
    DEMOGRAPHICS (101, the first transcribed band) goes above it and — MOIS
    opening only the first band — leaves the rest collapsed; the others go
    last. */
export function withAddedBands(sections: PatientSummarySection[], added: (PatientSummarySection & { rank: number })[]): PatientSummarySection[] {
  if (!added.length) return sections
  const before = added.filter((s) => s.rank <= 101)
  const after = added.filter((s) => s.rank > 101)
  if (!before.length) return [...sections, ...after]
  return [
    ...before.map((s, i) => ({ ...s, open: s.open || i === 0 })),
    ...sections.map((s) => ({ ...s, open: false })),
    ...after,
  ]
}
