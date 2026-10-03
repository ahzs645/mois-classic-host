#!/usr/bin/env node
/* ============================================================================
   Turn a MOIS chart export into a fixture the emulator's screens can read.

   MOIS exports a chart as UTF-16 XML: one <chart> record plus repeating record
   groups for everything hanging off it. This reads the whole file and emits
   one module per chart, keyed by the MOIS chart number.

   Field names are kept EXACTLY as MOIS writes them (`str_name_l`, `dtm_dob`,
   `num_chart`). Renaming them to something friendlier would make every screen's
   mapping a guess about which export field it came from; keeping them means a
   grid column can be traced to the column MOIS filled.

   Beside the XML, the export folder carries two more things this reads:
   · `moisx.xml` — the export's manifest, with the site's provider directory
     (`<PROVIDERS>`: id_provider → str_name). Chart records name providers by
     id in places (`id_provider`, `id_attending`, `id_responsible_org`); the
     directory is what turns those back into names. It is the site's list,
     not the patient's, so it is emitted beside the records as
     `provider_directory`.
   · `<id_file>x.<str_link>` — the files the chart's documents point at
     (tdt_document.str_link). PDFs are copied as they are, under their
     content hash so identical files are stored once; `.TXM` files (MOIS's
     TX Text Control documents) are decoded to their plain text, since the
     formatting runs that follow the text are not something a browser can
     draw. A `chart-<num>.attachments.ts` module maps each str_link to its
     asset.

   usage: node scripts/import-chart.mjs <export.xml> [outDir]
   ========================================================================= */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'

/* Record groups, in the order the emulator's tree walks them. Every other
   group the export carries is found in the file itself (`discoverGroups`)
   and appended, so a group this list has never heard of is still imported
   rather than silently dropped. */
const KNOWN_GROUPS = [
  'chart_status', 'chart_name', 'chart_address', 'chart_occupant', 'chart_preference', 'chart_service', 'connection',
  'encounter', 'encounter_note', 'measure', 'panel', 'order', 'document',
  'prescription', 'drug_dose', 'drug_duration',
  'health_issue', 'allergy', 'reaction_risk', 'reaction_event',
  'adverse_event', 'adverse_agent', 'adverse_link', 'alert',
  'family_hx', 'risk', 'need', 'action', 'goal', 'goal_link',
  'mar', 'mar_action', 'mar_instruction',
  'service_event', 'service_event_diag', 'form_header', 'form_wcb',
  'dform_header', 'dform_data',
  'admission', 'intervention', 'social_hx', 'chart_barrier', 'medication_lt',
]

const src = process.argv[2]
if (!src) { console.error('usage: import-chart.mjs <export.xml> [outDir]'); process.exit(1) }
const outDir = process.argv[3] ?? join(process.cwd(), 'src/data/charts')
const exportDir = dirname(src)

/* MOIS writes UTF-16 with a BOM. Reading it as utf8 yields NUL-separated
   characters that silently match nothing. */
const readUtf16 = (path) => readFileSync(path, 'utf16le').replace(/^﻿/, '')
const xml = readUtf16(src)

const header = Object.fromEntries(
  [...xml.matchAll(/<(supplier|version|build|date|time|site|reference)>([^<]*)<\//g)]
    .map((m) => [m[1], m[2]]),
)

/* A field is `<prefix>_name`; anything else that ends in `s` and holds
   only elements (or nothing) is a group container, and MOIS names its
   records by dropping the `s` — `<chart_addresss><chart_address>`,
   `<consults></consults>`. */
const FIELD = /^(str|num|dtm|id|stp|lkp|cmp)_/
const NOT_GROUPS = new Set(['EXPORT_BODY', 'HEADER', 'chart_data', 'isprivate'])
function discoverGroups() {
  const found = new Set()
  for (const m of xml.matchAll(/<([a-z][\w]*s)>\s*(<\/?)/g)) {
    const [, tag, next] = m
    if (FIELD.test(tag) || NOT_GROUPS.has(tag)) continue
    const record = tag.slice(0, -1)
    /* `<chart_address><id_chart_address>` is a record that happens to end
       in s: a container is either empty or holds its own records */
    if (next === '</' || xml.includes(`<${record}>`)) found.add(record)
  }
  return [...found]
}
const discovered = discoverGroups()
const GROUPS = [...KNOWN_GROUPS, ...discovered.filter((g) => !KNOWN_GROUPS.includes(g)).sort()]

/** Leaf fields of one record, without descending into nested groups. */
function fieldsOf(block) {
  const out = {}
  /* CDATA first: MOIS wraps anything with punctuation in it */
  for (const m of block.matchAll(/<([a-z][\w_]*)><!\[CDATA\[([\s\S]*?)\]\]><\/\1>/g)) {
    out[m[1]] = m[2].trim()
  }
  for (const m of block.matchAll(/<([a-z][\w_]*)>([^<]*)<\/\1>/g)) {
    if (!(m[1] in out)) out[m[1]] = m[2].trim()
  }
  /* an emptied container (`<encounter_notes></encounter_notes>`) is not a field */
  for (const g of GROUPS) delete out[`${g}s`]
  return out
}

/** Every record of one group, nested groups stripped so fields stay flat. */
function recordsOf(group) {
  const out = []
  const open = new RegExp(`<${group}>`, 'g')
  let m
  while ((m = open.exec(xml))) {
    /* find this record's matching close, allowing the same tag to nest */
    let depth = 1, i = open.lastIndex
    const tok = new RegExp(`<(/?)${group}>`, 'g')
    tok.lastIndex = i
    let t
    while (depth > 0 && (t = tok.exec(xml))) { depth += t[1] ? -1 : 1; i = t.index }
    const body = xml.slice(open.lastIndex, i)
    /* drop nested groups so a parent does not absorb its children's fields */
    let flat = body
    for (const g of GROUPS) flat = flat.replace(new RegExp(`<${g}>[\\s\\S]*?</${g}>`, 'g'), '')
    out.push(fieldsOf(flat))
    open.lastIndex = i
  }
  return out
}

const chart = recordsOf('chart')[0] ?? {}
const num = chart.num_chart
if (!num) { console.error('no <num_chart> in', src); process.exit(1) }

const data = { header, chart }
/* keyed by the group name MOIS uses, verbatim — pluralising turns
   `chart_address` into `chart_addresss` and buys nothing */
for (const g of GROUPS) data[g] = recordsOf(g)

/* ---- moisx.xml: the manifest and the provider directory ---------------- */
const manifestPath = join(exportDir, 'moisx.xml')
let idFile = basename(src).replace(/\.xml$/i, '')
if (existsSync(manifestPath)) {
  /* moisx.xml is plain ASCII, unlike the chart file */
  const manifest = readFileSync(manifestPath, 'utf8')
  const mine = [...manifest.matchAll(/<CHART>([\s\S]*?)<\/CHART>/g)]
    .map((c) => c[1])
    .find((c) => c.includes(`<num_chart>${num}</num_chart>`))
  idFile = mine?.match(/<id_file>([^<]*)</)?.[1] ?? idFile
  data.provider_directory = [...manifest.matchAll(/<PROVIDER>([\s\S]*?)<\/PROVIDER>/g)].map((p) => fieldsOf(p[1]))
}

/* ---- the documents' files ------------------------------------------------ */
const name = `chart-${num}`
const assetDir = join(outDir, 'attachments', num)
/** TX Text Control's .TXM: a 14-byte header, the text's length in UTF-16
    code units (uint16) and a flag word, then the text, then formatting runs. */
function txmText(buf) {
  const n = buf.readUInt16LE(14)
  return buf.subarray(18, 18 + 2 * n).toString('utf16le')
    .replace(/\r\n?/g, '\n')
    /* control characters other than tab and newline are layout markers */
    .replace(/[\u0000-\u0008\u000b-\u001f]/g, '')
}
const attachments = {}
const exportFiles = existsSync(exportDir) ? readdirSync(exportDir) : []
const prefix = `${idFile}x.`
const links = new Set(data.document.flatMap((d) => [d.str_link, d.str_link2]).filter(Boolean))
rmSync(assetDir, { recursive: true, force: true })
for (const link of [...links].sort()) {
  const file = exportFiles.find((f) => f === `${prefix}${link}`)
  if (!file) continue
  const buf = readFileSync(join(exportDir, file))
  mkdirSync(assetDir, { recursive: true })
  if (/\.txm$/i.test(link)) {
    const text = txmText(buf)
    const out = `${link.replace(/\.txm$/i, '')}.txt`
    writeFileSync(join(assetDir, out), text)
    attachments[link] = { kind: 'text', file: out, bytes: buf.length }
  } else if (/\.pdf$/i.test(link)) {
    const out = `${createHash('sha1').update(buf).digest('hex').slice(0, 16)}.pdf`
    if (!existsSync(join(assetDir, out))) writeFileSync(join(assetDir, out), buf)
    attachments[link] = { kind: 'pdf', file: out, bytes: buf.length }
  }
}

mkdirSync(outDir, { recursive: true })
const camel = name.replace(/-(\w)/g, (_, c) => c.toUpperCase())

/* The demographics go in their own module. The roster needs them on every
   load to list the patient at all, while the records — the other 99% of the
   file — are only wanted once someone opens this chart, so they are imported
   lazily and must not be reachable from anything the roster touches. */
writeFileSync(join(outDir, `${name}.summary.ts`), `/* Generated by scripts/import-chart.mjs from ${basename(src)} — do not edit.
 * The <chart> record only: what the roster needs to list this patient.
 */
import type { MoisRecord } from './types'

export const ${camel}Summary: MoisRecord = ${JSON.stringify(chart, null, 1)}
`)
const body = `/* Generated by scripts/import-chart.mjs from ${basename(src)} — do not edit.
 *
 * A real MOIS chart export, ${header.supplier} ${header.version} b${header.build},
 * site ${header.site}, reference ${header.reference}. Field names are MOIS's own.
 *
 * ${GROUPS.filter((g) => data[g].length).map((g) => `${g}: ${data[g].length}`).join(' · ')}
 * empty in this export: ${GROUPS.filter((g) => !data[g].length).join(', ')}
 */
import type { MoisChartExport } from './types'

export const ${camel}: MoisChartExport = ${JSON.stringify(data, null, 1)}
`
writeFileSync(join(outDir, `${name}.ts`), body)

/* Resolve local assets through an optional context so builds also work without
   the Git-ignored attachments. Importing a real export fills that context. */
const entries = Object.entries(attachments)
writeFileSync(join(outDir, `${name}.attachments.ts`), `/* Generated by scripts/import-chart.mjs from ${basename(src)} — do not edit.
 * The files chart ${num}'s documents point at (tdt_document.str_link), keyed
 * by that link. PDFs are stored under their content hash; .TXM documents as
 * their decoded text.
 */
import type { ChartAttachment } from './types'
import { chartAttachmentUrl } from './attachments'

export const ${camel}Attachments: Record<string, ChartAttachment> = {
${entries.map(([link, a]) => `  ${JSON.stringify(link)}: { kind: '${a.kind}', url: chartAttachmentUrl(${JSON.stringify(num)}, ${JSON.stringify(a.file)}) },`).join('\n')}
}
`)

console.log(`${name}.ts  ${(body.length / 1024).toFixed(0)} KB`)
for (const g of GROUPS) if (data[g].length) console.log(`  ${String(data[g].length).padStart(4)}  ${g}`)
const newGroups = discovered.filter((g) => !KNOWN_GROUPS.includes(g))
if (newGroups.length) console.log(`  groups found in the file beyond the known list: ${newGroups.join(', ')}`)
if (data.provider_directory) console.log(`  ${String(data.provider_directory.length).padStart(4)}  provider_directory (moisx.xml)`)
console.log(`  ${String(entries.length).padStart(4)}  attachments of ${links.size} linked (${entries.filter(([, a]) => a.kind === 'pdf').length} pdf, ${entries.filter(([, a]) => a.kind === 'text').length} text)`)
