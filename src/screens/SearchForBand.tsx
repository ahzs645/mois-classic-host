import { useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { PBButton, PBDataWindow, PBInput, pbSlug, usePBInstrumentation } from '../pb'
import { useScreenReport } from '../host/screen-state'
import { useSessionState } from '../host/screen-windows'
import { CmdButton } from './CmdButton'
import { DemographicModal } from './DemographicDialogs'
import { DialogFooter } from './formKit'
import { SelectAllPair, useTickSet } from './listKit'
import { LookupBand } from './lookupKit'

/* ============================================================================
   The chart folder's "Search For:" band — Search and Filter (MOIS 2.20+).

   PROVENANCE: 304711 / 2122622 "Search for Records within a Chart and Filter
   Codes within Code Lists" and its captures (Consult Reports, v02.20–02.22):
     `ba88dd88…`  hovering the field: the tooltip "Default Search Field(s):
                  Reason for Consult / Use the ellipsis [...] for advanced
                  search";
     `26819149…`  with the cursor in the field the "Search For" caption is
                  blue;
     `dcb72949…`  a well-formed search turns the band green;
     `872b72de…`  a malformed one (COED:"25061") turns it red with a yellow
                  warning glyph after the "…"; the glyph opens "Validation
                  Messages" — a ⚠ and "'COED' is not a searchable field and
                  will be ignored", Continue (F2);
     `b85fae5e…`  typing drops the history under the field (RE,
                  REFERREDBY:"BILL", REASON:"DIAB"), newest first, per folder;
     `2b4c6b22…`, `28b796f2…`  the "…" or F4 opens "Advanced Search": a
                  "Searchable Fields" band, one box per field, a blue ✱ on
                  the default field and a Concept box with its own "…", the
                  footnote, Clear History... · Ok · Cancel;
     `90fe42d3…`  Clear History... opens "Remove From Search History":
                  Select · Search Text, Select All · Unselect All · Ok ·
                  Cancel.

   The search language, as the article teaches it:
     word              partial match on the default field(s)
     FIELD:WORD        a named field — the column caption without spaces
                       (REFERREDBY); a prefix of it is accepted too (REASON
                       for REASONFORCONSULT), as the history capture shows
     "TWO WORDS"       a phrase (matching quotes, single or double)
     CHOL* *CHOL *CHOL*  wildcards: starts / ends / contains
     -FIELD:WORD       NOT — only on the Search For bar, never on a synonym
     Esc               clears the field
   Several terms are ANDed. A field MOIS does not know is ignored and the
   band turns red; everything else that parses is green.

   INFERRED: the band is colour-coded while typing (the captures only show
   the settled states), and a search enters the history when Enter is
   pressed or the field is left. Concept searches match the folder's concept
   column where it has one; no folder here carries concept data, so a
   CONCEPT: term narrows nothing but is well-formed.

   Anchors: host.mois.field.search-for (the edit), host.mois.lookup.search-
   for (the "…"), host.mois.command.search-for-history (the ▾),
   host.mois.command.search-warning (the ⚠); history rows host.mois.row.
   search-history-<n>. Advanced Search: host.mois.dialog.advanced-search,
   fields host.mois.field.advanced-<slug>, commands advanced-search-ok /
   -cancel, clear-history. Remove From Search History: host.mois.dialog.
   remove-from-search-history, ticks host.mois.field.remove-history-<n>,
   commands select-all, unselect-all, remove-history-ok / -cancel.
   Validation Messages: host.mois.dialog.validation-messages, command
   validation-continue.
   Reported: host.screen.searchState = empty | valid | invalid,
   host.screen.searchNegated (a NOT term is in play), host.screen.
   searchHistory (how many), host.screen.searchMatches (rows shown).
   Typed text is never reported.
   ========================================================================= */

export type SearchField = {
  /** the row key it reads */
  key: string
  /** the caption, as the Advanced Search dialog prints it */
  label: string
  /** the folder's default Search For field (the blue ✱) */
  isDefault?: boolean
  /** the Concept field: its box carries a "…" */
  concept?: boolean
}

type Term = { field: SearchField | null; value: string; negate: boolean; phrase: boolean }

export type ParsedSearch = { terms: Term[]; errors: string[]; empty: boolean }

/** The token a column is searched by: its caption, upper case, no spaces. */
export const fieldToken = (f: SearchField) => f.label.toUpperCase().replace(/[^A-Z0-9#]/g, '')

function tokenize(text: string): string[] {
  const out: string[] = []
  const re = /(-?[A-Za-z0-9#.]+:)?("[^"]*"?|'[^']*'?|\S+)|-?[A-Za-z0-9#.]+:/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) out.push(m[0])
  return out
}

export function parseSearch(text: string, fields: SearchField[]): ParsedSearch {
  const errors: string[] = []
  const terms: Term[] = []
  for (const raw of tokenize(text.trim())) {
    let t = raw
    let negate = false
    if (t.startsWith('-') && t.length > 1) { negate = true; t = t.slice(1) }
    let field: SearchField | null = null
    const colon = /^([A-Za-z0-9#.]+):(.*)$/.exec(t)
    if (colon) {
      const name = colon[1]!.toUpperCase()
      field = fields.find((f) => fieldToken(f) === name) ?? fields.find((f) => fieldToken(f).startsWith(name)) ?? null
      if (!field) { errors.push(`'${colon[1]}' is not a searchable field and will be ignored`); continue }
      t = colon[2]!
    }
    const quoted = /^(["'])(.*)\1$/.exec(t)
    if (!quoted && /^["']/.test(t)) { errors.push(`The phrase ${t} has no closing quotation mark`); continue }
    const value = quoted ? quoted[2]! : t
    if (!value) continue
    if (negate && !field) { errors.push('The Not operator (-) can only be used with a column search, e.g. -STATE:UN'); continue }
    terms.push({ field, value: value.toUpperCase(), negate, phrase: Boolean(quoted) })
  }
  return { terms, errors, empty: !text.trim() }
}

/** CHOL* / *CHOL / *CHOL* / CHOL (partial). */
function wildcard(have: string, want: string): boolean {
  const starts = want.endsWith('*')
  const ends = want.startsWith('*')
  const core = want.replace(/^\*+|\*+$/g, '')
  if (!core) return true
  if (starts && !ends) return have.split(/\s+/).some((w) => w.startsWith(core)) || have.startsWith(core)
  if (ends && !starts) return have.split(/[\s,]+/).some((w) => w.endsWith(core)) || have.endsWith(core)
  return have.includes(core)
}

/** Does a row pass every term? Unfielded terms look at the default field(s). */
export function matchesSearch(row: Record<string, unknown>, parsed: ParsedSearch, fields: SearchField[], extra?: (row: Record<string, unknown>) => string[]): boolean {
  const defaults = fields.filter((f) => f.isDefault)
  const scope = defaults.length ? defaults : fields
  return parsed.terms.every((t) => {
    const targets = t.field ? [t.field] : scope
    const texts = targets.flatMap((f) => [String(row[f.key] ?? '').toUpperCase()])
    /* synonyms answer a plain search, never a NOT (304711) */
    if (!t.field && extra) texts.push(...extra(row).map((s) => s.toUpperCase()))
    const hit = texts.some((have) => (t.phrase ? have.includes(t.value) : wildcard(have, t.value)))
    return t.negate ? !hit : hit
  })
}

/* ---------------------------------------------------------------------------
   The band
   ------------------------------------------------------------------------ */

const BAND = { valid: '#a4d86e', invalid: '#ff1a1a' } as const

export function SearchForBand({ context, fields, value, onChange, right, style }: {
  /** the folder — history is kept per folder ("what you search for in
      Procedures shows a different history than … Measures") */
  context: string
  fields: SearchField[]
  value: string
  onChange: (text: string) => void
  /** anything the band carries after the field (the View select) */
  right?: ReactNode
  style?: CSSProperties
}) {
  const host = usePBInstrumentation()
  const listId = useId()
  const input = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)
  const [dropped, setDropped] = useState(false)
  const [advanced, setAdvanced] = useState(false)
  const [warnings, setWarnings] = useState(false)
  const [history, setHistory] = useSessionState<string[]>(`search-history:${context}`, [])
  const parsed = useMemo(() => parseSearch(value, fields), [value, fields])
  const state = parsed.empty ? 'empty' : parsed.errors.length ? 'invalid' : 'valid'
  const defaults = fields.filter((f) => f.isDefault).map((f) => f.label)

  useScreenReport({
    searchState: state,
    searchNegated: parsed.terms.some((t) => t.negate),
    searchHistory: history.length,
  })

  const remember = (text = value) => {
    const t = text.trim()
    if (!t) return
    setHistory((h) => [t, ...h.filter((x) => x !== t)].slice(0, 25))
  }
  const suggestions = history.filter((h) => !value.trim() || h.toUpperCase().startsWith(value.trim().toUpperCase()))

  return (
    <div
      className="pb-row"
      style={{
        padding: '2px 8px', gap: 4, flex: 'none', position: 'relative',
        background: state === 'valid' ? BAND.valid : state === 'invalid' ? BAND.invalid : undefined,
        ...style,
      }}
      data-tutorial-id="host.mois.field.search-for-band"
    >
      {/* blue while the cursor is in the field (`26819149…`) */}
      <span style={{ color: focused ? '#0000ff' : state === 'invalid' ? '#000' : undefined, whiteSpace: 'nowrap' }}>Search For:</span>
      <span className="pb-inputgroup" style={{ flex: '1 1 auto', minWidth: 0 }}>
        <input
          ref={input}
          type="text"
          className="pb-field"
          value={value}
          title={`Default Search Field(s):  ${defaults.join(', ') || '(none)'}\nUse the ellipsis [...] for advanced search`}
          aria-haspopup="listbox"
          aria-expanded={dropped}
          aria-controls={dropped ? listId : undefined}
          data-tutorial-id="host.mois.field.search-for"
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); setDropped(false); remember() }}
          onChange={(e) => { onChange(e.target.value); setDropped(Boolean(e.target.value) && history.length > 0) }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onChange(''); setDropped(false); host?.report('command', { command: 'search-for-clear' }) }
            if (e.key === 'Enter') { e.preventDefault(); remember(); setDropped(false) }
            if (e.key === 'F4') { e.preventDefault(); setAdvanced(true) }
            if (e.key === 'ArrowDown' && e.altKey) { e.preventDefault(); setDropped((d) => !d) }
          }}
        />
        <button
          type="button"
          className="pb-inputgroup__btn pb-inputgroup__btn--drop"
          aria-expanded={dropped}
          aria-controls={dropped ? listId : undefined}
          data-tutorial-id={host?.anchor('command', 'search-for-history')}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => { host?.report('command', { command: 'search-for-history' }); setDropped((d) => !d); input.current?.focus() }}
          title="Search history"
        >
          ▾
        </button>
        <button
          type="button"
          className="pb-inputgroup__btn pb-inputgroup__btn--dots"
          data-tutorial-id={host?.anchor('lookup', 'search-for')}
          onClick={() => { host?.report('lookup', { field: 'search-for' }); setAdvanced(true) }}
          title="Advanced search"
        >
          …
        </button>
      </span>
      {state === 'invalid' && (
        <PBButton
          size="sm"
          aria-label="Validation messages"
          command="search-warning"
          onClick={() => setWarnings(true)}
          style={{ minWidth: 0, width: 22, padding: 0, background: '#ffd200', fontWeight: 700 }}
        >
          !
        </PBButton>
      )}
      {right}

      {dropped && suggestions.length > 0 && (
        <div
          id={listId}
          role="listbox"
          style={{ position: 'absolute', left: 72, right: 40, top: '100%', zIndex: 30, background: '#fffbee', border: '1px solid #808080', boxShadow: '2px 2px 4px rgba(0,0,0,.25)', maxHeight: 200, overflowY: 'auto' }}
        >
          {suggestions.map((h, i) => (
            <div
              key={h}
              role="option"
              aria-selected={h === value}
              data-tutorial-id={`host.mois.row.search-history-${i + 1}`}
              onMouseDown={(e) => { e.preventDefault(); onChange(h); setDropped(false); remember(h) }}
              style={{ padding: '2px 4px', borderBottom: '1px solid #e8e0c8', cursor: 'default' }}
            >
              {h}
            </div>
          ))}
        </div>
      )}

      {advanced && (
        <AdvancedSearchDialog
          fields={fields}
          history={history}
          onClearHistory={(remove) => setHistory((h) => h.filter((x) => !remove.includes(x)))}
          onOk={(text) => { onChange(text); remember(text); setAdvanced(false) }}
          onClose={() => setAdvanced(false)}
        />
      )}
      {warnings && <ValidationMessages messages={parsed.errors} onClose={() => setWarnings(false)} />}
    </div>
  )
}

/* ---------------------------------------------------------------------------
   Advanced Search                          `2b4c6b22…`, `28b796f2…`
   ------------------------------------------------------------------------ */

function AdvancedSearchDialog({ fields, history, onClearHistory, onOk, onClose }: {
  fields: SearchField[]
  history: string[]
  onClearHistory: (remove: string[]) => void
  onOk: (text: string) => void
  onClose: () => void
}) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [clearing, setClearing] = useState(false)
  const quote = (v: string) => (/\s/.test(v.trim()) ? `"${v.trim()}"` : v.trim())
  /* the default field goes in bare; any other becomes FIELD:VALUE (304711:
     "typing Bo in the Seen By field prompts MOIS to add … SEENBY:BO") */
  const compose = () => fields
    .filter((f) => (values[f.key] ?? '').trim())
    .map((f) => (f.isDefault ? quote(values[f.key]!) : `${fieldToken(f)}:${quote(values[f.key]!)}`).toUpperCase())
    .join(' ')
  return (
    <DemographicModal title="Advanced Search" width={520} onClose={onClose} dialog="advanced-search">
      <div style={{ margin: '8px 10px 0', border: '1px solid #9a9a9a', background: '#fff', display: 'flex', flexDirection: 'column', minHeight: 300 }}>
        <div style={{ background: 'linear-gradient(#ecebe8, #d8d5d0)', fontWeight: 700, padding: '3px 6px', borderBottom: '1px solid #9a9a9a' }}>Searchable Fields</div>
        <div style={{ padding: '4px 0', flex: '1 1 auto' }}>
          {fields.map((f, i) => (
            <div key={f.key} className="pb-row" style={{ gap: 4, padding: '1px 6px', background: i % 2 ? '#f0f0f0' : '#fff' }}>
              <span style={{ width: 10, color: '#0000ff', fontWeight: 700 }}>{f.isDefault ? '*' : ''}</span>
              <span style={{ width: 150, overflow: 'hidden', whiteSpace: 'nowrap' }}>{f.label}:</span>
              {f.concept
                ? (
                  <span className="pb-inputgroup" style={{ width: 316 }}>
                    <input type="text" className="pb-field" value={values[f.key] ?? ''} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} data-tutorial-id={`host.mois.field.advanced-${pbSlug(f.label)}`} />
                    <button type="button" className="pb-inputgroup__btn pb-inputgroup__btn--dots">…</button>
                  </span>
                )
                : <PBInput w={300} value={values[f.key] ?? ''} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} data-tutorial-id={`host.mois.field.advanced-${pbSlug(f.label)}`} />}
            </div>
          ))}
        </div>
        <div className="pb-row" style={{ gap: 6, padding: '4px 8px', color: '#808080', borderTop: '1px solid #e0e0e0', alignItems: 'flex-start', whiteSpace: 'normal' }}>
          <span style={{ color: '#0000ff', fontWeight: 700 }}>*</span>
          <span>Indicates that the field is default search criteria.  If you don&apos;t explicitly state which column you&apos;re searching, this will be searched by default.</span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', padding: '8px 10px' }}>
        <span><CmdButton command="clear-history" style={{ width: 88 }} onClick={() => setClearing(true)}>Clear History...</CmdButton></span>
        <span className="pb-row" style={{ gap: 8 }}>
          <CmdButton command="advanced-search-ok" style={{ width: 74 }} onClick={() => onOk(compose())}>Ok</CmdButton>
          <CmdButton command="advanced-search-cancel" style={{ width: 74 }} onClick={onClose}>Cancel</CmdButton>
        </span>
        <span />
      </div>
      {clearing && (
        <RemoveFromSearchHistory
          history={history}
          onOk={(remove) => { onClearHistory(remove); setClearing(false) }}
          onClose={() => setClearing(false)}
        />
      )}
    </DemographicModal>
  )
}

/* ---------------------------------------------------------------------------
   Remove From Search History               `90fe42d3…`
   ------------------------------------------------------------------------ */

function RemoveFromSearchHistory({ history, onOk, onClose }: {
  history: string[]
  onOk: (remove: string[]) => void
  onClose: () => void
}) {
  const picked = useTickSet()
  const [cur, setCur] = useState(0)
  const rows = history.map((text, i) => ({ text, i }))
  useScreenReport({ historyPicked: picked.size })
  return (
    <DemographicModal title="Remove From Search History" width={720} height={580} onClose={onClose} dialog="remove-from-search-history">
      <div style={{ margin: '8px 10px 0', border: '1px solid #9a9a9a', background: '#fff', flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <LookupBand variant="grey">Search History</LookupBand>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
          <PBDataWindow<{ text: string; i: number }>
            rows={rows}
            current={cur}
            onCurrentChange={setCur}
            empty=" "
            columns={[
              {
                key: 'select', header: 'Select', width: 42, align: 'center',
                render: (r) => (
                  <input
                    type="checkbox"
                    className="pb-check__box"
                    checked={picked.has(r.i)}
                    aria-label={`Select search ${r.i + 1}`}
                    data-tutorial-id={`host.mois.field.remove-history-${r.i + 1}`}
                    onChange={() => picked.flip(r.i)}
                  />
                ),
              },
              { key: 'text', header: 'Search Text', width: 600, headAlign: 'center' },
            ]}
          />
        </div>
      </div>
      <div className="pb-row" style={{ padding: '10px', gap: 8 }}>
        <SelectAllPair as="command" ids={['select-all', 'unselect-all']} width={76}
          onSelectAll={() => picked.selectAll(history.map((_, i) => i))} onUnselectAll={picked.clear} />
        <span style={{ flex: '1 1 auto' }} />
        <CmdButton command="remove-history-ok" style={{ width: 82 }} onClick={() => onOk(history.filter((_, i) => picked.has(i)))}>Ok</CmdButton>
        <CmdButton command="remove-history-cancel" style={{ width: 82 }} onClick={onClose}>Cancel</CmdButton>
        <span style={{ flex: '1 1 auto' }} />
        <span style={{ width: 160 }} />
      </div>
    </DemographicModal>
  )
}

/* ---------------------------------------------------------------------------
   Validation Messages                      `872b72de…`
   ------------------------------------------------------------------------ */

function ValidationMessages({ messages, onClose }: { messages: string[]; onClose: () => void }) {
  return (
    <DemographicModal title="Validation Messages" width={660} height={300} onClose={onClose} dialog="validation-messages">
      <div
        style={{ margin: '8px 10px 0', border: '1px solid #9a9a9a', background: '#fff', flex: '1 1 auto', minHeight: 140 }}
        onKeyDown={(e) => { if (e.key === 'F2') { e.preventDefault(); onClose() } }}
      >
        {messages.map((m) => (
          <div key={m} className="pb-row" style={{ gap: 10, padding: '4px 12px', borderBottom: '1px solid #d0d0d0' }}>
            <span style={{ color: '#c00000', fontWeight: 700 }}>⚠</span><span>{m}</span>
          </div>
        ))}
      </div>
      <DialogFooter fixed={false} padding={10}>
        <CmdButton command="validation-continue" style={{ width: 88 }} onClick={onClose}>Continue (F2)</CmdButton>
      </DialogFooter>
    </DemographicModal>
  )
}

/* ---------------------------------------------------------------------------
   Folder defaults
   ------------------------------------------------------------------------ */

/**
 * Each folder's default Search For field — "the one field that's designated
 * … based on what's most relevant to that folder" (304711): the Reason for
 * Consult in Consults, Test Name in Measures and Imaging (`28b796f2…`).
 * Where a folder is not named, the first text column that reads like a
 * description is the default. INFERRED for every folder but those three.
 */
const DEFAULT_BY_TITLE: Record<string, string[]> = {
  'Consult Reports': ['reason', 'Reason for Consult', 'Reason for Consult Request'],
  Measures: ['test', 'Test Name'],
  'Imaging Reports': ['test', 'Test Name', 'Exam'],
  'Dynamic Forms': ['title', 'Title', 'Form'],
}
const DEFAULTISH = /^(description|reason|title|name|test|term|health issue|issue|procedure|intervention|medication|agent)/i

/** The Search For fields for a folder, from its columns. */
export function searchFieldsFor(title: string, columns: { key: string; header: ReactNode }[], opts?: { concept?: boolean }): SearchField[] {
  const text = columns
    /* the text columns: not the tick / flag / attachment glyph columns, and
       not the dates (neither Advanced Search capture offers a date) */
    .filter((c) => typeof c.header === 'string' && /[A-Za-z]{3}/.test(c.header) && !/date/i.test(c.header)
      && c.key !== 'dots' && !c.key.endsWith('Dots'))
    .map((c) => ({ key: c.key, label: String(c.header).trim() }))
  const named = DEFAULT_BY_TITLE[title] ?? []
  let def = text.find((f) => named.includes(f.key) || named.includes(f.label))
  if (!def) def = text.find((f) => DEFAULTISH.test(f.label)) ?? text[0]
  const out: SearchField[] = text.map((f) => ({ ...f, isDefault: f === def }))
  if (opts?.concept && !out.some((f) => f.label.toUpperCase() === 'CONCEPT')) out.push({ key: 'concept', label: 'Concept', concept: true })
  return out
}

/** Hook: the band's text and the filter it implies, for one folder. */
export function useFolderSearch(context: string, fields: SearchField[]) {
  const [text, setText] = useState('')
  const parsed = useMemo(() => parseSearch(text, fields), [text, fields])
  const test = (row: Record<string, unknown>) => parsed.empty || matchesSearch(row, parsed, fields)
  return { text, setText, parsed, test, context }
}
