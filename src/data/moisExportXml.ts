/* ============================================================================
   The file format behind every MOIS Designer Section Export / Import.

   PROVENANCE: two real TRAINING exports (MOIS 02.31.23 b250508, 2026-09-29)
   — Quick Entry (`quick_entrys_<stamp>_<n>.7z`, data/quickEntryXml.ts) and
   Concept Mapping (data/conceptXml.ts). Both are the same document shape:

     <?xml version="1.0" encoding="ISO-8859-1"?>
     <root><header><supplier>MOIS</supplier>
     <version>…</version> … <reference>…</reference>
     </header>
     <object_hierarchy><records> … </records>
     </object_hierarchy>            (the full file only; meta.xml omits it)
     <things><thing><str_a><![CDATA[…]]></str_a>
     …
     </things>
     </root>\n\r\n

   One element per line (LF), every value in CDATA, a list's first record on
   the line that opens the list, and a trailing "\n\r\n". The object
   hierarchy names the PowerBuilder objects the records were read from, a
   child naming its parent (nvo_concept ▸ nvo_concept_rule).

   Nothing here touches the DOM: the format is flat enough to read with a
   scanner, which keeps it usable from tests and the Next server.
   ========================================================================= */

export type MoisExportHeader = {
  supplier: string
  version: string
  build: string
  date: string
  time: string
  site: string
  contact: string
  reference: string
}

export const MOIS_EXPORT_HEADER_KEYS = ['supplier', 'version', 'build', 'date', 'time', 'site', 'contact', 'reference'] as const

/** one <record> of <object_hierarchy>: an item and, below the first, its parent */
export type MoisExportHierarchyItem = { item: string; parent?: string }

export class MoisExportFileError extends Error {}

/* --- reading -------------------------------------------------------------- */
const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }
const unescapeXml = (s: string) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
  if (e[0] === '#') return String.fromCharCode(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10))
  return ENTITIES[e] ?? m
})

/** the text of an element's content: CDATA sections verbatim, the rest unescaped */
export function textOf(inner: string): string {
  let out = ''
  let rest = inner
  for (;;) {
    const at = rest.indexOf('<![CDATA[')
    if (at < 0) return out + unescapeXml(rest)
    out += unescapeXml(rest.slice(0, at))
    const end = rest.indexOf(']]>', at + 9)
    if (end < 0) throw new MoisExportFileError('Unterminated CDATA section.')
    out += rest.slice(at + 9, end)
    rest = rest.slice(end + 3)
  }
}

/** the direct child elements of a flat element body, in order */
export function children(body: string): { tag: string; inner: string }[] {
  const out: { tag: string; inner: string }[] = []
  const open = /<([A-Za-z_][\w.-]*)(?:\s[^>]*)?>/g
  let m: RegExpExecArray | null
  while ((m = open.exec(body))) {
    const tag = m[1]!
    const close = `</${tag}>`
    const start = m.index + m[0].length
    /* nested same-name elements do not occur in these files, but a
       "</tag>" inside CDATA must not end the element */
    let at = start
    let end = -1
    for (;;) {
      const cdata = body.indexOf('<![CDATA[', at)
      const next = body.indexOf(close, at)
      if (next < 0) break
      if (cdata >= 0 && cdata < next) { at = body.indexOf(']]>', cdata) + 3; continue }
      end = next
      break
    }
    if (end < 0) throw new MoisExportFileError(`<${tag}> is not closed.`)
    out.push({ tag, inner: body.slice(start, end) })
    open.lastIndex = end + close.length
  }
  return out
}

/** the body of the first <tag> … last </tag> */
export function section(xml: string, tag: string): string | null {
  const start = xml.indexOf(`<${tag}>`)
  if (start < 0) return null
  const end = xml.lastIndexOf(`</${tag}>`)
  if (end < start) throw new MoisExportFileError(`<${tag}> is not closed.`)
  return xml.slice(start + tag.length + 2, end)
}

/** a record's fields in file order, each value as written (absent ≠ empty) */
export function fieldsOf(body: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const c of children(body)) {
    const lead = c.inner.trimStart()
    /* a nested list (<concept_rules>) is the caller's to read */
    if (lead.startsWith('<') && !lead.startsWith('<![CDATA[')) continue
    out[c.tag] = textOf(c.inner)
  }
  return out
}

/** the root, header and object hierarchy every export starts with */
export function readExportFrame(xml: string, what: string): { root: string; header: MoisExportHeader; hierarchy: MoisExportHierarchyItem[] } {
  const root = section(xml, 'root')
  if (root == null) throw new MoisExportFileError(`This is not a MOIS ${what} export: it has no <root>.`)
  const h = Object.fromEntries(children(section(root, 'header') ?? '').map((c) => [c.tag, textOf(c.inner).trim()]))
  const header = Object.fromEntries(MOIS_EXPORT_HEADER_KEYS.map((k) => [k, h[k] ?? ''])) as MoisExportHeader
  const hierarchy = children(section(root, 'records') ?? '')
    .filter((c) => c.tag === 'record')
    .map((c) => {
      const f = Object.fromEntries(children(c.inner).map((x) => [x.tag, textOf(x.inner).trim()]))
      return f.parent ? { item: f.item ?? '', parent: f.parent } : { item: f.item ?? '' }
    })
  return { root, header, hierarchy }
}

/* --- writing -------------------------------------------------------------- */
export const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
export const cdata = (s: string) => `<![CDATA[${s.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`

/** the XML declaration, <root>, the header and (full file only) the hierarchy */
export function writeExportFrame(header: MoisExportHeader, hierarchy: MoisExportHierarchyItem[]): string[] {
  const lines = ['<?xml version="1.0" encoding="ISO-8859-1"?>', `<root><header><supplier>${escapeXml(header.supplier)}</supplier>`]
  for (const k of MOIS_EXPORT_HEADER_KEYS.slice(1)) lines.push(`<${k}>${escapeXml(header[k])}</${k}>`)
  lines.push('</header>')
  if (hierarchy.length) {
    lines.push('<object_hierarchy><records>')
    for (const r of hierarchy) {
      if (r.parent) lines.push(`<record><parent>${escapeXml(r.parent)}</parent>`, `<item>${escapeXml(r.item)}</item>`, '</record>')
      else lines.push(`<record><item>${escapeXml(r.item)}</item>`, '</record>')
    }
    lines.push('</records>', '</object_hierarchy>')
  }
  return lines
}

/** the document's closing: `</root>` then MOIS's "\n\r\n" */
export const closeExport = (lines: string[]) => `${[...lines, '</root>'].join('\n')}\n\r\n`

/** the header an Export stamps: the site's own, at the session's clock */
export function exportHeader(site: MoisExportHeader, contact: string, now = new Date()): MoisExportHeader {
  const p = (n: number) => String(n).padStart(2, '0')
  return {
    ...site,
    date: `${now.getFullYear()}/${p(now.getMonth() + 1)}/${p(now.getDate())}`,
    time: `${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`,
    contact,
  }
}

/** `<prefix>_<yyyymmddhhmmss>_<n>.7z`, the way the Quick Entry capture
    (`1036f91d109e…`) names an export */
export function exportFileName(prefix: string, now = new Date(), n = '500033'): string {
  const p = (x: number) => String(x).padStart(2, '0')
  return `${prefix}_${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}_${n}.7z`
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
