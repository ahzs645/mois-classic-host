/* ============================================================================
   The MOIS Quick Entry export file — Administration ▸ Designer Section ▸
   Quick Entry ▸ Export Records writes it, Import Records reads it.

   PROVENANCE: a real TRAINING export (MOIS 02.31.23 b250508, 2026-09-29),
   `quick_entrys_<stamp>_<n>.7z`: an unencrypted LZMA 7z holding two files.
     quick_entrys.xml  <root> ▸ <header> (supplier, version, build, date,
                       time, site, contact, reference) ▸ <object_hierarchy>
                       naming `nvo_quick_entry` ▸ <quick_entrys>, one
                       <quick_entry> per template.
     meta.xml          the same document without <object_hierarchy>.
   Both are ISO-8859-1, one element per line (LF), every value in CDATA, and
   end "</root>\n\r\n".

   A <quick_entry> carries str_record_type, str_name, str_description (left
   out when blank) and str_detail — a JSON array holding one record in the
   chart table's own column shape. For `tdt_chart_preference` that is the
   `chart_preference` row (data/carePlanRecords.ts preferenceRecord):
     str_classification  Type (CONSENT, DIRECTIVE, DISCLOSURE, ADVANCE
                         DIRECTIVE, …)
     str_type            Subject (OTHER, MEDICATION, …)
     str_code_type       Identified By (CODE / CONCEPT / …)
     str_code, str_description   the code and its term
     str_instruction_code        Instruction
     str_sensitive, str_include_demo   Mark as Sensitive / Show on
                                 Demographics (Y, N or null)
     str_detail, str_instruction, str_reason_code, str_reason, str_form,
     str_by, dtm_start, dtm_end  the chart fields a template may carry
                                 (the two RELEASE OF INFORMATION (ROI)
                                 templates do).

   INFERRED: the record types of the other four groups (only
   tdt_chart_preference is in the captured export); they are named after
   the chart tables SMOIS lists (tdt_goal, tdt_order, tdt_reaction_risk) and
   their detail is kept verbatim but not decoded. "FREE TEXT" as the Free
   Text code type.

   Nothing here touches the DOM: the format is flat enough to read with a
   scanner, which keeps it usable from tests and the Next server.
   ========================================================================= */
import type { PreferenceIdentifiedBy, PreferenceType } from './preferenceVocab'
import { PREFERENCE_TYPES } from './preferenceVocab'
import type { QuickEntryGroup, QuickEntryPreference, QuickEntryTemplate } from './quickEntryTemplates'

export type QuickEntryDetailRecord = Record<string, string | null>

/** what a template read from a file keeps so writing it back loses nothing */
export type QuickEntrySource = {
  recordType: string
  /** the str_detail array exactly as read */
  detail: QuickEntryDetailRecord[]
}

export type QuickEntryFileHeader = {
  supplier: string
  version: string
  build: string
  date: string
  time: string
  site: string
  contact: string
  reference: string
}

export type QuickEntryFile = {
  header: QuickEntryFileHeader
  /** quick_entrys.xml names nvo_quick_entry; meta.xml does not */
  hierarchy: string[]
  templates: QuickEntryTemplate[]
  /** entries whose record type no Template Group owns */
  skipped: { recordType: string; name: string }[]
}

export const QUICK_ENTRY_RECORD_TYPE: Record<QuickEntryGroup, string> = {
  'Chart Preference': 'tdt_chart_preference',
  /* INFERRED from here down */
  Goal: 'tdt_goal',
  Order: 'tdt_order',
  'Reaction Risk': 'tdt_reaction_risk',
  'MSP Secondary Claims': 'tdt_msp_claim',
}
const GROUP_OF_RECORD_TYPE = Object.fromEntries(
  Object.entries(QUICK_ENTRY_RECORD_TYPE).map(([group, type]) => [type, group as QuickEntryGroup]),
) as Record<string, QuickEntryGroup>

/** the column order MOIS writes a chart_preference detail in */
export const CHART_PREFERENCE_DETAIL_KEYS = [
  'dtm_start', 'dtm_end', 'str_preference', 'str_type', 'str_code_type', 'str_code', 'str_description', 'str_concept',
  'str_detail', 'str_setting', 'str_reason_code', 'str_reason', 'str_sensitive', 'str_include_demo', 'str_classification',
  'str_form', 'str_by', 'str_instruction_code', 'str_instruction', 'str_code_system',
] as const

const HEADER_KEYS = ['supplier', 'version', 'build', 'date', 'time', 'site', 'contact', 'reference'] as const

/* --- reading -------------------------------------------------------------- */
const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }
const unescapeXml = (s: string) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
  if (e[0] === '#') return String.fromCharCode(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10))
  return ENTITIES[e] ?? m
})

/** the text of an element's content: CDATA sections verbatim, the rest unescaped */
function textOf(inner: string): string {
  let out = ''
  let rest = inner
  for (;;) {
    const at = rest.indexOf('<![CDATA[')
    if (at < 0) return out + unescapeXml(rest)
    out += unescapeXml(rest.slice(0, at))
    const end = rest.indexOf(']]>', at + 9)
    if (end < 0) throw new QuickEntryFileError('Unterminated CDATA section.')
    out += rest.slice(at + 9, end)
    rest = rest.slice(end + 3)
  }
}

/** the direct child elements of a flat element body, in order */
function children(body: string): { tag: string; inner: string }[] {
  const out: { tag: string; inner: string }[] = []
  const open = /<([A-Za-z_][\w.-]*)(?:\s[^>]*)?>/g
  let m: RegExpExecArray | null
  while ((m = open.exec(body))) {
    const tag = m[1]!
    const close = `</${tag}>`
    let at = m.index + m[0].length
    /* skip over CDATA so a "</tag>" inside one cannot end the element */
    let end = -1
    for (;;) {
      const cdata = body.indexOf('<![CDATA[', at)
      const next = body.indexOf(close, at)
      if (next < 0) break
      if (cdata >= 0 && cdata < next) { at = body.indexOf(']]>', cdata) + 3; continue }
      end = next
      break
    }
    if (end < 0) throw new QuickEntryFileError(`<${tag}> is not closed.`)
    out.push({ tag, inner: body.slice(m.index + m[0].length, end) })
    open.lastIndex = end + close.length
  }
  return out
}

function section(xml: string, tag: string): string | null {
  const start = xml.indexOf(`<${tag}>`)
  if (start < 0) return null
  const end = xml.lastIndexOf(`</${tag}>`)
  if (end < start) throw new QuickEntryFileError(`<${tag}> is not closed.`)
  return xml.slice(start + tag.length + 2, end)
}

export class QuickEntryFileError extends Error {}

const typeOf = (classification: string | null | undefined): PreferenceType =>
  PREFERENCE_TYPES.find((t) => t.toUpperCase() === (classification ?? '').trim().toUpperCase()) ?? 'Consent'

const identifiedByOf = (codeType: string | null | undefined): PreferenceIdentifiedBy => {
  const v = (codeType ?? '').trim().toUpperCase()
  if (v === 'CODE') return 'Code'
  if (v === 'CONCEPT') return 'Concept'
  return 'Free Text'
}

const IDENTIFIED_BY_CODE: Record<PreferenceIdentifiedBy, string> = { Code: 'CODE', Concept: 'CONCEPT', 'Free Text': 'FREE TEXT' }

/** a Chart Preference template's settings, read from its detail record */
export function preferenceFromDetail(r: QuickEntryDetailRecord): QuickEntryPreference {
  return {
    type: typeOf(r.str_classification),
    subject: (r.str_type ?? '').toUpperCase(),
    identifiedBy: identifiedByOf(r.str_code_type),
    code: r.str_code ?? '',
    concept: r.str_description ?? r.str_preference ?? '',
    instruction: (r.str_instruction_code ?? '').trim(),
    sensitive: r.str_sensitive === 'Y',
    showOnDemo: r.str_include_demo === 'Y',
    chart: {
      subjectDetail: r.str_detail ?? '',
      instructionDetail: r.str_instruction ?? '',
      reason: r.str_reason_code ?? '',
      reasonDetail: r.str_reason ?? '',
      form: r.str_form ?? '',
      by: r.str_by ?? '',
      start: r.dtm_start ?? '',
      stopped: r.dtm_end ?? '',
    },
  }
}

function parseDetail(json: string, name: string): QuickEntryDetailRecord[] {
  if (!json.trim()) return []
  let value: unknown
  try { value = JSON.parse(json) } catch { throw new QuickEntryFileError(`The detail of "${name}" is not valid JSON.`) }
  const list = Array.isArray(value) ? value : [value]
  return list.filter((r): r is QuickEntryDetailRecord => !!r && typeof r === 'object')
}

/**
 * Read a Quick Entry export (quick_entrys.xml or meta.xml). `id` names each
 * template; the store passes its own sequence.
 */
export function parseQuickEntryXml(xml: string, id: (i: number) => string = (i) => `qe-file-${i + 1}`): QuickEntryFile {
  const root = section(xml, 'root')
  if (root == null) throw new QuickEntryFileError('This is not a MOIS export: it has no <root>.')
  const headerBody = section(root, 'header') ?? ''
  const h = Object.fromEntries(children(headerBody).map((c) => [c.tag, textOf(c.inner).trim()]))
  const header = Object.fromEntries(HEADER_KEYS.map((k) => [k, h[k] ?? ''])) as QuickEntryFileHeader
  const hierarchy = [...(section(root, 'object_hierarchy') ?? '').matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => textOf(m[1]!).trim())
  const list = section(root, 'quick_entrys')
  if (list == null) throw new QuickEntryFileError('This MOIS export holds no Quick Entry templates (no <quick_entrys>).')

  const templates: QuickEntryTemplate[] = []
  const skipped: QuickEntryFile['skipped'] = []
  for (const entry of children(list).filter((c) => c.tag === 'quick_entry')) {
    const f = Object.fromEntries(children(entry.inner).map((c) => [c.tag, textOf(c.inner)]))
    const recordType = (f.str_record_type ?? '').trim()
    const name = f.str_name ?? ''
    const group = GROUP_OF_RECORD_TYPE[recordType]
    if (!group) { skipped.push({ recordType, name }); continue }
    const detail = parseDetail(f.str_detail ?? '', name)
    const t: QuickEntryTemplate = {
      id: id(templates.length), group, name, description: f.str_description ?? '',
      source: { recordType, detail },
    }
    if (group === 'Chart Preference') t.preference = preferenceFromDetail(detail[0] ?? {})
    templates.push(t)
  }
  return { header, hierarchy, templates, skipped }
}

/* --- writing -------------------------------------------------------------- */
const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const cdata = (s: string) => `<![CDATA[${s.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`

/** the preference's settings laid over the record it came from (or a blank
    one), touching only what changed so an unedited template writes back as
    it was read */
export function detailFromPreference(p: QuickEntryPreference, base?: QuickEntryDetailRecord): QuickEntryDetailRecord {
  const r: QuickEntryDetailRecord = base ? { ...base } : Object.fromEntries(CHART_PREFERENCE_DETAIL_KEYS.map((k) => [k, null]))
  const was = preferenceFromDetail(r)
  const put = (key: string, value: string) => { r[key] = value === '' ? null : value }
  if (p.type !== was.type) put('str_classification', p.type.toUpperCase())
  if (p.subject !== was.subject) put('str_type', p.subject.toUpperCase())
  if (p.identifiedBy !== was.identifiedBy) put('str_code_type', p.identifiedBy ? IDENTIFIED_BY_CODE[p.identifiedBy] : '')
  if ((p.code ?? '') !== was.code) put('str_code', p.code ?? '')
  if (p.concept !== was.concept) put('str_description', p.concept)
  if (p.instruction !== was.instruction) put('str_instruction_code', p.instruction)
  if (p.sensitive !== was.sensitive) put('str_sensitive', p.sensitive ? 'Y' : 'N')
  if (p.showOnDemo !== was.showOnDemo) put('str_include_demo', p.showOnDemo ? 'Y' : 'N')
  const c = p.chart ?? {}
  const wc = was.chart ?? {}
  const pairs: [keyof NonNullable<QuickEntryPreference['chart']>, string][] = [
    ['subjectDetail', 'str_detail'], ['instructionDetail', 'str_instruction'], ['reason', 'str_reason_code'],
    ['reasonDetail', 'str_reason'], ['form', 'str_form'], ['by', 'str_by'], ['start', 'dtm_start'], ['stopped', 'dtm_end'],
  ]
  for (const [k, col] of pairs) if ((c[k] ?? '') !== (wc[k] ?? '')) put(col, c[k] ?? '')
  return r
}

/** the str_detail a template writes */
export function detailOf(t: QuickEntryTemplate): QuickEntryDetailRecord[] {
  if (t.group === 'Chart Preference' && t.preference) {
    const [first, ...rest] = t.source?.detail ?? []
    return [detailFromPreference(t.preference, first), ...rest]
  }
  if (t.source) return t.source.detail
  /* INFERRED: a template this session made in a group whose export shape no
     capture shows is written with the emulator's own settings */
  const own = t.goal ?? t.order ?? t.reaction ?? t.msp
  return own ? [JSON.parse(JSON.stringify(own)) as QuickEntryDetailRecord] : []
}

export function serializeQuickEntryXml(file: Pick<QuickEntryFile, 'header' | 'hierarchy' | 'templates'>): string {
  const lines: string[] = ['<?xml version="1.0" encoding="ISO-8859-1"?>']
  const h = file.header
  lines.push(`<root><header><supplier>${escapeXml(h.supplier)}</supplier>`)
  for (const k of HEADER_KEYS.slice(1)) lines.push(`<${k}>${escapeXml(h[k])}</${k}>`)
  lines.push('</header>')
  if (file.hierarchy.length) {
    lines.push('<object_hierarchy><records>')
    for (const item of file.hierarchy) lines.push(`<record><item>${escapeXml(item)}</item>`, '</record>')
    lines.push('</records>', '</object_hierarchy>')
  }
  let first = true
  for (const t of file.templates) {
    const type = t.source?.recordType ?? QUICK_ENTRY_RECORD_TYPE[t.group]
    lines.push(`${first ? '<quick_entrys>' : ''}<quick_entry><str_record_type>${cdata(type)}</str_record_type>`)
    first = false
    lines.push(`<str_name>${cdata(t.name)}</str_name>`)
    if (t.description) lines.push(`<str_description>${cdata(t.description)}</str_description>`)
    lines.push(`<str_detail>${cdata(JSON.stringify(detailOf(t)))}</str_detail>`)
    lines.push('</quick_entry>')
  }
  lines.push(first ? '<quick_entrys></quick_entrys>' : '</quick_entrys>', '</root>')
  return `${lines.join('\n')}\n\r\n`
}

/** the two files an export 7z holds */
export function quickEntryExportFiles(templates: QuickEntryTemplate[], header: QuickEntryFileHeader): { name: string; text: string }[] {
  return [
    { name: 'meta.xml', text: serializeQuickEntryXml({ header, hierarchy: [], templates }) },
    { name: 'quick_entrys.xml', text: serializeQuickEntryXml({ header, hierarchy: ['nvo_quick_entry'], templates }) },
  ]
}

/* --- bytes ---------------------------------------------------------------- */
export const decodeLatin1 = (bytes: Uint8Array) => new TextDecoder('iso-8859-1').decode(bytes)

/** ISO-8859-1 bytes; a character outside it becomes "?" as a Windows ANSI
    write would */
export function encodeLatin1(text: string): Uint8Array {
  const out = new Uint8Array(text.length)
  for (let i = 0; i < text.length; i += 1) {
    const c = text.charCodeAt(i)
    out[i] = c < 256 ? c : 63
  }
  return out
}
