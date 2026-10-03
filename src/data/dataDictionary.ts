import type { PBTreeNode } from '../pb'
import { adminTree, billingTree, exchangeTree, patientChartTree, reportsTree, schedulerTree, workspaceTree } from './mois'
import { DATA_DICTIONARY_ENTRIES } from './dataDictionary.generated'

/* ============================================================================
   data/dataDictionary — the MOIS Data Dictionary, joined to the frame.

   The dictionary is the workbook NH keeps of where every MOIS field is
   stored: a navigation path down to the field (Module ▸ Folder ▸ Sub Folder ▸
   Tab ▸ … ▸ Field Heading ▸ Field) beside a Table Name and Field Name. The
   2026-08 field audit then walked each row in MOIS DEV, focused the field,
   pressed Ctrl+Shift+A and recorded what MOIS answered — usually "Audit
   Information Not Available" naming the table and column the control writes.
   scripts/embed-data-dictionary.py carries both into
   dataDictionary.generated.ts, one entry per workbook row, keyed by the
   audit's evidence ID (`MATRIX-R0008-chart-no`: the Matrix sheet's Excel
   row and the field).

   What this module adds is the join to the emulator:
   - `entryNode` — the navigator node (data/mois.tsx) the entry's folder path
     names, so an entry can be opened;
   - `resolveDictionaryEntry` — the entry for a control on screen, from where
     it sits (node, tab strip, pop-out window, field heading) and its caption.
     A control can also name its entry outright with `data-mois-audit-id`,
     which wins (host/field-audit.ts reads it).
   - `auditAnswer` — what MOIS shows when Ctrl+Shift+A is pressed in it
     (screens/FieldAuditWindows.tsx draws it).
   ========================================================================= */

export type DictionaryPath = {
  module: string
  folder: string
  subFolder?: string
  subSubFolder?: string
  tab?: string
  subTab?: string
  popOutWindow?: string
  popOutWindowTab?: string
  fieldHeading?: string
  field: string
  subField?: string
}

/**
 * MOIS's answer to Ctrl+Shift+A on the field, as the audit recorded it:
 * - `not-available` "Audit Information Not Available" naming the table and
 *                   column, then "Register Table - Field"
 * - `register`      only the "Register Table - Field" prompt
 * - `report`        a Change Audit Report: the field is registered
 * - `none`          nothing happens (display-only cells, links, buttons)
 * - `untested`      not known — no row to focus, or focus stayed elsewhere
 */
export type DictionaryAuditKind = 'not-available' | 'register' | 'report' | 'none' | 'untested'

export type DictionaryEntry = {
  /** the audit's evidence ID: `MATRIX-R<Excel row>-<field slug>` */
  id: string
  /** the row on the workbook's Matrix sheet */
  row: number
  at: DictionaryPath
  /** what the workbook records; blank where it records nothing */
  workbook: {
    table?: string; field?: string; type?: string; format?: string; length?: string; coded?: string
    /** the analysts' note on the field's behaviour ("Only available with Order Type: 'Lab'") */
    note?: string
  }
  /** Verified · Discrepancy · Needs manual review · Not testable · Not auditable · Not a data field */
  status: string
  audit: DictionaryAuditKind
  /** the audit's own words for what MOIS showed */
  dialog: string
  /** the table and column(s) MOIS named; a composite (date + time) names one per part */
  verified?: { table: string; columns: string[] }
}

export const DATA_DICTIONARY: readonly DictionaryEntry[] = DATA_DICTIONARY_ENTRIES

const BY_ID = new Map(DATA_DICTIONARY.map((entry) => [entry.id, entry]))

export const dictionaryEntry = (id: string): DictionaryEntry | undefined => BY_ID.get(id)

/* --- labels ---------------------------------------------------------------- */

/** A caption reduced for comparison: `Chart No.:` and `Chart No` agree,
    `Allergy / Intolerances` and `Allergy/Intolerance` agree, and a tab's
    record count (`History (0)`) is dropped. The paper clip a grid paints as
    a glyph is the workbook's `Paper clip`; a caption that is only a symbol
    (`~`) stays that symbol. */
export function labelKey(label: string | undefined | null): string {
  const raw = (label ?? '').replace(/\u{1F4CE}/gu, ' paper clip ').trim()
  const key = raw
    .toLowerCase()
    .replace(/\(\d+\)/g, ' ')
    .replace(/&/g, ' and ')
    .replace(/#/g, ' no ')
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((word) => (word.length > 3 ? word.replace(/s$/, '') : word))
    .join('')
  return key || raw.replace(/\s+/g, '')
}

/** The captions an entry is painted under on screen: its Field (10), without
    a bracketed hint (`Dose (qnty/unit)`), and its Sub Field (11). */
function captionKeys(entry: DictionaryEntry): string[] {
  const field = entry.at.field
  const keys = new Set([labelKey(field)])
  const bare = field.replace(/\([^)]*\)/g, ' ').trim()
  if (bare) keys.add(labelKey(bare))
  if (entry.at.subField) keys.add(labelKey(entry.at.subField))
  keys.delete('')
  return [...keys]
}

/** A caption's words, keyed the way `labelKey` keys the whole. */
const wordsOf = (label: string) => label
  .toLowerCase()
  .replace(/\(\d+\)/g, ' ')
  .split(/[^a-z0-9]+/)
  .filter(Boolean)
  .map((word) => (word.length > 3 ? word.replace(/s$/, '') : word))

function editDistance(a: string, b: string): number {
  let row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i += 1) {
    const next = [i]
    for (let j = 1; j <= b.length; j += 1) {
      next[j] = Math.min(row[j]! + 1, next[j - 1]! + 1, row[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    row = next
  }
  return row[b.length]!
}

/* the words a caption leaves off the workbook's field name: `Home` is
   `Home Phone`, `Address` is `Address 1` / `Address 2`, `Alias` is
   `Alias - First Name` / `- Last Name` */
const UNSAID = new Set(['phone', 'name', 'first', 'middle', 'last', 'number', 'no', '1', '2', '3'])

/** A caption that names a field less exactly than the workbook does: an
    abbreviation word for word (`Diag Desc.` for `Diag Descr`, `eMail (H)`
    for `eMail (Home)`), the field's leading words with only `UNSAID` words
    left off, or a one-letter typo either side (`Prefered`, `Arranegments`
    — two letters in a long name). */
function looselyNames(caption: string, field: string): boolean {
  const have = wordsOf(caption)
  const want = wordsOf(field)
  if (!have.length || !want.length || have.join('').length < 4) return false
  if (have.length === want.length && have.every((word, i) => want[i]!.startsWith(word))) return true
  if (have.length < want.length && have.every((word, i) => want[i] === word)
    && want.slice(have.length).every((word) => UNSAID.has(word))) return true
  const a = have.join(''), b = want.join('')
  if (a[0] !== b[0]) return false
  return editDistance(a, b) <= (Math.min(a.length, b.length) >= 12 ? 2 : 1)
}

/** The forms a painted caption takes beyond its own words: without a note
    in brackets (`Office Note(not Printed)`), and up to a colon set inside it
    (`Comment:Printed on Prescription`). */
function captionForms(caption: string): string[] {
  const forms = [caption]
  const bare = caption.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim()
  if (bare && bare !== caption) forms.push(bare)
  const head = caption.split(':')[0]?.trim()
  if (head && head !== caption) forms.push(head)
  return forms
}

/** A composite the workbook writes `Perform By:Date/Tme` — the date and time
    boxes MOIS paints after `Perform By:` under their own `Date:` caption.
    `lead` is the caption before, `tail` the parts' first word. */
function compositeOf(entry: DictionaryEntry): { lead: string; tail: string } | undefined {
  const field = entry.at.field
  const at = field.indexOf(':')
  if (at <= 0) return undefined
  const tail = field.slice(at + 1).split('/')[0] ?? ''
  return { lead: labelKey(field.slice(0, at)), tail: labelKey(tail) }
}

/* --- the navigator --------------------------------------------------------- */

const MODULE_TREES: { module: string; label: string; tree: PBTreeNode[] }[] = [
  { module: 'chart', label: 'Patient Chart', tree: patientChartTree },
  { module: 'scheduler', label: 'Scheduler', tree: schedulerTree },
  { module: 'workspace', label: 'Workspace', tree: workspaceTree },
  { module: 'billing', label: 'Billing', tree: billingTree },
  { module: 'admin', label: 'Administration', tree: adminTree },
  { module: 'exchange', label: 'Data Exchange', tree: exchangeTree },
  { module: 'reports', label: 'Reports', tree: reportsTree },
]

/** The module id the frame uses for a dictionary Module (1). */
export function moduleOfDictionary(label: string): string | undefined {
  return MODULE_TREES.find((m) => labelKey(m.label) === labelKey(label))?.module
}

function findChild(nodes: PBTreeNode[] | undefined, label: string): PBTreeNode | undefined {
  const want = labelKey(label)
  return nodes?.find((n) => labelKey(n.label) === want)
}

/* The Patient Chart's folders hang off one root, Patient Summary, which the
   workbook writes as Folder (2); the Scheduler's folders are roots of their
   own. So the path is matched from the root down for as long as it keeps
   naming nodes, and the deepest node it reaches is the entry's. */
function nodeForPath(path: DictionaryPath): string | undefined {
  const tree = MODULE_TREES.find((m) => labelKey(m.label) === labelKey(path.module))?.tree
  if (!tree) return undefined
  let level: PBTreeNode[] | undefined = tree
  let found: PBTreeNode | undefined
  for (const label of [path.folder, path.subFolder, path.subSubFolder]) {
    if (!label) break
    const next = findChild(level, label)
    if (!next) break
    found = next
    level = next.children
  }
  return found?.id
}

const NODE_BY_ENTRY = new Map<string, string | undefined>()

/** The navigator node an entry lives under (`demographic`, `w-prov`). */
export function entryNode(entry: DictionaryEntry): string | undefined {
  if (!NODE_BY_ENTRY.has(entry.id)) NODE_BY_ENTRY.set(entry.id, nodeForPath(entry.at))
  return NODE_BY_ENTRY.get(entry.id)
}

/** Every entry under a navigator node, in workbook order. */
export function entriesForNode(node: string): DictionaryEntry[] {
  return DATA_DICTIONARY.filter((entry) => entryNode(entry) === node)
}

/* --- resolving a control ---------------------------------------------------- */

/** Where a control sits, read off the screen (host/field-audit.ts). */
export type FieldAuditContext = {
  /** the navigator node the work area shows */
  node: string
  /** the caption painted beside the control, or its grid column's header */
  caption: string
  /** the caption before it on the same line (`Perform By` before `Date:`) */
  lead?: string
  /** further captions to try when `caption` names no row: a radio's group
      caption behind its option label */
  alternates?: string[]
  /** which of the controls under the caption this one is (0 the first): the
      time box of a date + time pair is 1 */
  part?: number
  /** how many controls before it on the same page carry the same caption:
      Demographics paints `Leave Message` once for Home and once for Work,
      and the workbook lists them in that order */
  occurrence?: number
  /** captions of the selected tabs around the control, outermost first */
  tabs?: string[]
  /** the title of the pop-out window holding the control, if any */
  window?: string
  /** what else names that window: its anchor (`encounter` for the Encounter
      Detail Window, whose title bar shows the patient) */
  windowNames?: string[]
  /** the group box or band caption over the control */
  heading?: string
  /** whether the control is a cell of a grid (the workbook's "Record Line") */
  gridCell?: boolean
}

export type ResolvedEntry = {
  entry: DictionaryEntry
  /** rows with a different storage scored the same, and the page order
      (`occurrence`) chose between them */
  ambiguous: boolean
  /** which of the entry's columns the control is (a composite's part) */
  part: number
  /** found by a looser reading of the caption (`looselyNames`) */
  loose: boolean
}

/* A tab the workbook names "Detail Window" is the strip's "Detail", and its
   "Status History" the strip's "History". */
const has = (keys: string[], value: string | undefined) => {
  const want = labelKey(value)
  return !!want && keys.some((key) => key === want
    || want.startsWith(key) || want.endsWith(key) || key.startsWith(want) || key.endsWith(want))
}

/** The workbook files the entry under a tab that is not open around the
    control: it is a same-named field of another tab. */
function onAnotherTab(entry: DictionaryEntry, tabKeys: string[]): boolean {
  if (!tabKeys.length) return false
  const { tab, subTab, popOutWindowTab } = entry.at
  if (tab) return !has(tabKeys, tab)
  const inner = [subTab, popOutWindowTab].filter(Boolean)
  return inner.length > 0 && !inner.some((t) => has(tabKeys, t))
}

function storageOf(entry: DictionaryEntry): string {
  const v = entry.verified
  return v ? `${v.table}.${v.columns.join('+')}` : `${entry.workbook.table ?? ''}.${entry.workbook.field ?? ''}`
}

function score(entry: DictionaryEntry, ctx: FieldAuditContext, tabKeys: string[]): number {
  const at = entry.at
  let points = 0
  /* the tab the workbook files the field under is one of the open ones — or
     the window itself, which the workbook sometimes files as a tab (Goals'
     "New Goal") */
  const open = [...tabKeys, ...[ctx.window, ...(ctx.windowNames ?? [])].map(labelKey).filter(Boolean)]
  for (const tab of [at.tab, at.subTab, at.popOutWindowTab]) {
    if (tab && has(open, tab)) points += 3
  }
  if (at.popOutWindow) {
    const want = labelKey(at.popOutWindow)
    const names = [ctx.window, ...(ctx.windowNames ?? [])].map(labelKey).filter(Boolean)
    if (names.some((win) => win.includes(want) || want.includes(win))) points += 4
    else points -= 2
  } else if (ctx.window && labelKey(at.tab ?? '').includes('window')) {
    points += 1
  }
  if (at.fieldHeading) {
    if (ctx.heading && has([labelKey(ctx.heading)], at.fieldHeading)) points += 2
    if (labelKey(at.fieldHeading) === 'recordline') points += ctx.gridCell ? 2 : -1
  }
  return points
}

/**
 * The dictionary entry for a control: the entries under the node whose field
 * caption matches, best placed first. Undefined when the dictionary has no
 * such field there.
 */
export function resolveDictionaryEntry(ctx: FieldAuditContext): ResolvedEntry | undefined {
  const entries = entriesForNode(ctx.node)
  const part = ctx.part ?? 0
  const lead = labelKey(ctx.lead)
  /* the matches for one caption, each with the column part it is */
  const matchesFor = (captionText: string) => {
    const caption = labelKey(captionText)
    if (!caption) return []
    const out: { entry: DictionaryEntry; part: number }[] = []
    for (const entry of entries) {
      const composite = compositeOf(entry)
      /* `Date:` after `Perform By:` — the date box, then the time box */
      if (composite && lead && composite.lead === lead && composite.tail === caption) out.push({ entry, part })
      else if (captionKeys(entry).includes(caption)) out.push({ entry, part })
    }
    if (out.length) return out
    /* no `Date:` caption of its own: the boxes after `Perform By:`'s first */
    if (part > 0) {
      for (const entry of entries) {
        if (compositeOf(entry)?.lead === caption) out.push({ entry, part: part - 1 })
      }
    }
    return out
  }
  const tabKeys = (ctx.tabs ?? []).map(labelKey)
  const here = (list: { entry: DictionaryEntry; part: number }[]) => list.filter((c) => !onAnotherTab(c.entry, tabKeys))
  /* each caption as painted, exactly and then loosely, before its trimmed
     forms: `eMail (W)` is `eMail (Work)` loosely before it is just `eMail` */
  let candidates: { entry: DictionaryEntry; part: number }[] = []
  let loose = false
  search: for (const captionText of [ctx.caption, ...(ctx.alternates ?? [])]) {
    for (const form of captionForms(captionText)) {
      candidates = here(matchesFor(form))
      if (candidates.length) break search
      candidates = here(entries.filter((entry) => looselyNames(form, entry.at.field)).map((entry) => ({ entry, part })))
      if (candidates.length) { loose = true; break search }
    }
  }
  if (!candidates.length) return undefined
  const ranked = candidates
    .map((c) => ({ ...c, points: score(c.entry, ctx, tabKeys) }))
    .sort((a, b) => b.points - a.points || a.entry.row - b.entry.row)
  /* rows that tie are the same caption painted more than once: the n-th on
     the page is the workbook's n-th */
  const tied = ranked.filter((r) => r.points === ranked[0]!.points)
  const best = tied[Math.min(ctx.occurrence ?? 0, tied.length - 1)]!
  const ambiguous = new Set(tied.map((r) => storageOf(r.entry))).size > 1
  return { entry: best.entry, ambiguous, part: best.part, loose }
}

/* --- what Ctrl+Shift+A shows ------------------------------------------------- */

export type AuditAnswer =
  /** "Audit Information Not Available" naming the column, then the register prompt */
  | { kind: 'not-available'; table: string; column: string; source: 'verified' | 'workbook' }
  /** "Register Table - Field" alone */
  | { kind: 'register' }
  /** the Change Audit Report for a registered field */
  | { kind: 'report'; table?: string; column?: string }
  /** MOIS does nothing */
  | { kind: 'none' }

const isColumn = (value: string | undefined): value is string => !!value && /^[a-z][a-z0-9_]*$/.test(value)
const isTable = (value: string | undefined): value is string => !!value && /^tdt_[a-z0-9_]+$/.test(value)

/**
 * What MOIS answers for an entry. `part` picks a composite's column (the time
 * box of a date + time pair is part 1). `registered` is the session's own
 * registrations, made with Yes on the register prompt.
 *
 * Where the audit could not get an answer out of MOIS (`untested`) and the
 * workbook names a real table and column, the frame answers the way MOIS
 * answers every unregistered field and shows the workbook's mapping, marked
 * `source: 'workbook'` so a lesson or a check can tell the two apart.
 */
export function auditAnswer(entry: DictionaryEntry, part = 0, registered?: ReadonlySet<string>): AuditAnswer {
  const v = entry.verified
  const column = v ? v.columns[Math.min(part, v.columns.length - 1)] : undefined
  if (registered?.has(entry.id)) return { kind: 'report', table: v?.table, column }
  switch (entry.audit) {
    case 'not-available':
      return v && column ? { kind: 'not-available', table: v.table, column, source: 'verified' } : { kind: 'none' }
    case 'register': return { kind: 'register' }
    case 'report': return { kind: 'report', table: v?.table, column }
    case 'none': return { kind: 'none' }
    case 'untested': {
      if (v && column) return { kind: 'not-available', table: v.table, column, source: 'verified' }
      const { table, field } = entry.workbook
      return isTable(table) && isColumn(field) ? { kind: 'not-available', table, column: field, source: 'workbook' } : { kind: 'none' }
    }
  }
}

/** The workbook's mapping where the audit found MOIS stores the field elsewhere. */
export function workbookCorrection(entry: DictionaryEntry): { workbook: string; verified: string } | undefined {
  const v = entry.verified
  const { table, field } = entry.workbook
  if (!v || !isTable(table)) return undefined
  if (v.table === table && field && v.columns.includes(field)) return undefined
  return { workbook: `${table}.${field ?? ''}`, verified: `${v.table}.${v.columns.join(' / ')}` }
}
