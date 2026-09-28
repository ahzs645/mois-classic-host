import { useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import {
  PBBand, PBButton, PBCheckbox, PBDataWindow, PBDropGlyph, PBInput, PBLookup, PBRadio, PBSelect, PBWindow,
  pbSlug, usePBInstrumentation,
} from '../pb'
import { usePatient } from '../data/patient-context'
import {
  serviceCodeRows, universalCodeSystems, universalReferenceSets, universalSearchRows,
  type ServiceCodeRow, type UniversalSearchRow,
} from '../data/encounterPickers'
import { CODE_SYSTEM_ROWS, codeKey, type CodeRecord } from '../data/codesets'
import { useScreenReport } from '../host/screen-state'
import { useSessionState } from '../host/screen-windows'
import { useCodeRecords } from './adminSession'
import { registerAreaWindow } from './areaWindowRegistry'

/* ============================================================================
   The two code lookups the encounter header's `…` buttons open.

   Both are pickers rather than screens: they return a code to the field that
   opened them and MOIS closes them on the pick. They are separate PowerBuilder
   windows, not one parameterised one — the Universal Search Window carries the
   chart in its caption and can file its pick straight onto the chart, which is
   what its third button does.
   ========================================================================= */

/* ---------------------------------------------------------------------------
   MOIS - Universal Search Window: the Health Issues `…`.

   A search over every enabled code system at once. The three panes across the
   top are the search's parameters, the salmon `Search For` box its text, and
   the pane at the bottom prints the current term's alternates.

   PROVENANCE: the encounter capture on chart 3924 (the layout), 2069363 /
   2128358 `206a120e…` (the three panes: All / Clear links, the Parameters
   Code is · Category is like · Status is Active / Inactive / Either ·
   Limit, the salmon Search For with its drop-down and "…") and `c62a9ff7…`
   (Alternate Terms [3]: SYN-P-EN, SYN-A-EN, … — the ICD-9 code is itself
   one of the alternates).

   What the articles teach, and how it behaves here:
   · the Code System / Reference Set ticks narrow the search, All / Clear
     set every box; a code in an unticked system is not found even when the
     text matches (2069363's ICD9 example).
   · Status is Active / Inactive / Either; Category is like; Code is; Limit.
   · Search For's drop-down lists the recent searches (this window's history
     for the stage session, newest first); the "…" in front of Search opens
     a small menu — Clear Search History, Search by Term, Search by Code.
     That menu's wording is INFERRED from "you can clear your search history
     … and search by Term or Code"; no capture shows it open.
   · F6 moves focus Code Systems → Reference Sets → Parameters → Search For
     and round again; the section holding focus has its caption in bold.
   · Esc clears Search For; Esc on an empty Search For closes the window.
   · a term is found by its preferred term or any alternate term (the
     synonyms) — "Searching for any of these terms results in finding the
     same code" — including the terms and the preferred-term changes saved
     under Administration ▸ Codeset Management ▸ Codes this session.

   `admin` drops the chart from the caption and greys Select & Add Health
   Issue: Codes ▸ Find opens it from Administration, where there is no chart.

   Anchors: host.mois.dialog.universal-search; fields usw-system-<slug>,
   usw-set-<slug>, usw-code-is, usw-category, usw-status-<active|inactive|
   either>, usw-limit, usw-search-for, usw-alternate-terms; commands
   usw-systems-all / -clear, usw-sets-all / -clear, usw-history (the drop-
   down), usw-clear-history, usw-search-by-term, usw-search-by-code, search,
   select-term, usw-cancel, usw-add-health-issue; the "…" is
   host.mois.lookup.usw-search-for; history rows host.mois.row.usw-history-
   <n>; result rows host.mois.row.usw-<system>-<code>.
   Reported: host.dialog = universal-search, host.screen.uswSection (the
   section holding focus), host.screen.uswRows, host.screen.uswHistory (how
   many recent searches), host.screen.uswSearchBy.
   ------------------------------------------------------------------------ */

type UswRow = UniversalSearchRow & { active: boolean; sets: string[]; fsn?: string[] }

const SECTIONS = ['systems', 'sets', 'parameters', 'search'] as const
type Section = (typeof SECTIONS)[number]

const HISTORY_KEY = 'usw:history'

/** The encounter pickers' page of terms, with this session's Codes edits laid over it. */
function useUswRows(): UswRow[] {
  const [records] = useCodeRecords()
  return useMemo(() => {
    const byKey = new Map<string, CodeRecord>(records.map((r) => [codeKey(r.system, r.code), r]))
    const fromRecord = (rec: CodeRecord): UswRow => ({
      term: rec.term,
      category: rec.category,
      code: rec.code,
      system: rec.system,
      alternates: rec.alternates.filter((a) => a.active && a.type === 'SYN').map((a) => a.term),
      fsn: rec.alternates.filter((a) => a.active && a.type === 'FSN').map((a) => a.term),
      active: rec.active,
      sets: rec.sets.filter((s) => s.active).map((s) => s.set),
    })
    const seen = new Set<string>()
    const out: UswRow[] = universalSearchRows.map((r) => {
      const k = codeKey(r.system, r.code)
      seen.add(k)
      const rec = byKey.get(k)
      return rec ? fromRecord(rec) : { ...r, active: true, sets: [] }
    })
    for (const rec of records) if (!seen.has(codeKey(rec.system, rec.code))) out.push(fromRecord(rec))
    return out
  }, [records])
}

/** The Alternate Terms lines for a row (`c62a9ff7…`). */
function alternateLines(row: UswRow | undefined): [string, string][] {
  if (!row) return []
  const lines: [string, string][] = [['SYN-P-EN', row.term]]
  /* an ICD-9 row carries its own code as an alternate (`c62a9ff7…`) */
  if (row.system === 'ICD-9') lines.push(['SYN-A-EN', row.code])
  for (const a of row.alternates) lines.push(['SYN-A-EN', a])
  for (const f of row.fsn ?? []) lines.push(['FSN', f])
  return lines
}

export function UniversalSearchDialog({ onPick, onClose, admin }: {
  /** Select — hands the term back to the field that opened the window */
  onPick: (row: UniversalSearchRow, addHealthIssue?: boolean) => void
  onClose: () => void
  /** opened from Administration: no chart in the caption, no Add Health Issue */
  admin?: boolean
}) {
  const host = usePBInstrumentation()
  const patient = usePatient()
  const all = useUswRows()
  /* Administration lists every code system the site holds; a chart lists the
     ones its lookup setting makes available */
  const systemList = useMemo(() => (admin
    ? [...new Set([...universalCodeSystems, ...CODE_SYSTEM_ROWS.filter((s) => all.some((r) => r.system === s.system)).map((s) => s.system)])]
    : universalCodeSystems), [admin, all])
  const [systems, setSystems] = useState<string[]>(systemList)
  const [sets, setSets] = useState<string[]>([])
  const [scope, setScope] = useState('Code Systems')
  const [code, setCode] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('Active')
  const [limit, setLimit] = useState('200')
  const [search, setSearch] = useState('')
  const [searchBy, setSearchBy] = useState<'term' | 'code'>('term')
  const [cur, setCur] = useState(0)
  const [section, setSection] = useState<Section>('search')
  const [history, setHistory] = useSessionState<string[]>(HISTORY_KEY, [])
  const [dropped, setDropped] = useState(false)
  const [menu, setMenu] = useState(false)
  const refs = {
    systems: useRef<HTMLDivElement>(null),
    sets: useRef<HTMLDivElement>(null),
    parameters: useRef<HTMLDivElement>(null),
    search: useRef<HTMLDivElement>(null),
  }
  const searchInput = useRef<HTMLInputElement>(null)

  /* `Search` is a round trip in MOIS; here the grid narrows as the
     parameters change, which is the same result for a training chart. */
  const rows = useMemo(() => {
    const want = search.trim().toUpperCase()
    return all.filter((r) => (
      systems.includes(r.system)
      && (sets.length === 0 || r.sets.some((s) => sets.includes(s)))
      && (status === 'Either' || (status === 'Active' ? r.active : !r.active))
      && (!want || (searchBy === 'code'
        ? r.code.toUpperCase().startsWith(want)
        : [r.term, ...r.alternates, ...(r.fsn ?? [])].some((t) => t.toUpperCase().includes(want))))
      && r.code.toUpperCase().includes(code.trim().toUpperCase())
      && r.category.toUpperCase().includes(category.trim().toUpperCase())
    )).slice(0, Math.max(0, Number(limit) || 0))
  }, [all, systems, sets, status, search, searchBy, code, category, limit])

  const at = Math.min(cur, Math.max(0, rows.length - 1))
  const row = rows[at]
  const alternates = alternateLines(row)

  useScreenReport({ dialog: 'universal-search', uswSection: section, uswRows: rows.length, uswHistory: history.length, uswSearchBy: searchBy })

  const toggle = (list: string[], set: (v: string[]) => void, value: string) => (
    set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value])
  )
  const remember = () => {
    const text = search.trim()
    if (!text) return
    setHistory((h) => [text, ...h.filter((x) => x !== text)].slice(0, 20))
  }
  const runSearch = () => { remember(); setCur(0); setDropped(false) }

  const focusSection = (s: Section) => {
    setSection(s)
    const el = refs[s].current?.querySelector<HTMLElement>('input:not([disabled]), button:not([disabled])')
    el?.focus()
  }

  /* F6 cycles the sections; Esc clears Search For, and closes on an empty one */
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'F6') {
      e.preventDefault()
      focusSection(SECTIONS[(SECTIONS.indexOf(section) + (e.shiftKey ? SECTIONS.length - 1 : 1)) % SECTIONS.length]!)
      host?.report('command', { command: 'usw-f6' })
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      if (dropped || menu) { setDropped(false); setMenu(false); return }
      if (search) { setSearch(''); setCur(0); host?.report('command', { command: 'usw-esc-clear' }) }
      else { host?.report('command', { command: 'usw-esc-close' }); onClose() }
    }
  }

  const bold = (s: Section) => (section === s ? 700 : 400)

  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 95 }}>
      <PBWindow
        child
        controls={false}
        tutorialId="host.mois.dialog.universal-search"
        title={admin ? 'MOIS - Universal Search Window' : `MOIS - Universal Search Window for Chart Number: ${patient.chart} ${patient.first} ${patient.last}`}
        onClose={onClose}
        style={{ width: 'min(1000px, 100%)', height: 'min(720px, 100%)' }}
      >
        <div onKeyDown={onKeyDown} style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}>
          {/* ---- the three parameter panes ---------------------------------- */}
          <div style={{ display: 'flex', flex: 'none', borderBottom: '1px solid var(--pb-border)' }}>
            <div ref={refs.systems} onFocusCapture={() => setSection('systems')} style={{ display: 'contents' }}>
              <CheckPane
                title="Select from Code System(s)"
                bold={bold('systems')}
                scope="systems"
                anchor="system"
                w={258}
                items={systemList}
                checked={systems}
                onToggle={(x) => toggle(systems, setSystems, x)}
                onAll={() => setSystems(systemList)}
                onClear={() => setSystems([])}
                /* MOIS lists the systems this site has licensed and leaves a
                   greyed `More…` row for the ones it has not */
                more={!admin}
              />
            </div>
            <div ref={refs.sets} onFocusCapture={() => setSection('sets')} style={{ display: 'contents' }}>
              <CheckPane
                title="Filter to Reference Set(s)"
                bold={bold('sets')}
                scope="sets"
                anchor="set"
                w={280}
                items={universalReferenceSets}
                checked={sets}
                onToggle={(x) => toggle(sets, setSets, x)}
                onAll={() => setSets(universalReferenceSets)}
                onClear={() => setSets([])}
              />
            </div>
            <div ref={refs.parameters} onFocusCapture={() => setSection('parameters')} style={{ flex: '1 1 auto', minWidth: 0, padding: '3px 6px' }}>
              <div className="pb-row" style={{ gap: 6, marginBottom: 3 }}>
                <span style={{ fontWeight: bold('parameters') }}>Parameters:</span>
                <span style={{ color: 'var(--pb-ink-dim)' }}>Select from</span>
                {['Code Systems', 'Health Issues', 'Encounter History'].map((s) => (
                  <PBRadio key={s} name="universal-scope" label={s} checked={scope === s} onChange={() => setScope(s)} />
                ))}
              </div>
              <div className="pb-row" style={{ gap: 4, marginBottom: 2, justifyContent: 'flex-end' }}>
                <span>Code is</span>
                <PBInput w={186} value={code} onChange={(e) => { setCode(e.target.value); setCur(0) }} data-tutorial-id="host.mois.field.usw-code-is" />
                <span style={{ flex: '1 1 auto' }} />
              </div>
              <div className="pb-row" style={{ gap: 4, marginBottom: 2 }}>
                <span style={{ flex: '0 0 auto' }}>Category is like</span>
                <PBInput style={{ flex: '1 1 auto', minWidth: 0 }} value={category} onChange={(e) => { setCategory(e.target.value); setCur(0) }} data-tutorial-id="host.mois.field.usw-category" />
              </div>
              <div className="pb-row" style={{ gap: 6, marginBottom: 2 }}>
                <span>Status is</span>
                {['Active', 'Inactive', 'Either'].map((s) => (
                  <PBRadio key={s} name="universal-status" label={s} checked={status === s} onChange={() => { setStatus(s); setCur(0) }} tutorialId={`host.mois.field.usw-status-${pbSlug(s)}`} />
                ))}
              </div>
              <div className="pb-row" style={{ gap: 4 }}>
                <span>Limit list to</span>
                <PBInput w={76} value={limit} onChange={(e) => setLimit(e.target.value)} data-tutorial-id="host.mois.field.usw-limit" />
                <span>records</span>
              </div>
            </div>
          </div>

          {/* ---- the search strip ------------------------------------------- */}
          <div ref={refs.search} onFocusCapture={() => setSection('search')} className="pb-row" style={{ gap: 4, padding: '3px 4px', flex: 'none', position: 'relative' }}>
            <span style={{ color: 'var(--pb-link)', fontWeight: bold('search') }}>Search For:</span>
            <span className="pb-inputgroup" style={{ flex: '1 1 auto', minWidth: 0 }}>
              <input
                ref={searchInput}
                type="text"
                className="pb-field"
                value={search}
                /* the salmon box: MOIS paints the field the search runs from
                   the same colour it paints a current row */
                style={{ background: '#f7c6a2' }}
                aria-haspopup="listbox"
                aria-expanded={dropped}
                aria-controls={dropped ? 'usw-history-list' : undefined}
                data-tutorial-id="host.mois.field.usw-search-for"
                onChange={(e) => { setSearch(e.target.value); setCur(0) }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); runSearch() }
                  if ((e.altKey && e.key === 'ArrowDown') || e.key === 'F4') { e.preventDefault(); setDropped((d) => !d) }
                  if (e.key === 'ArrowDown' && !e.altKey && rows.length) { e.preventDefault(); setCur(Math.min(rows.length - 1, at + 1)) }
                  if (e.key === 'ArrowUp' && !e.altKey && rows.length) { e.preventDefault(); setCur(Math.max(0, at - 1)) }
                }}
              />
              <button
                type="button"
                className="pb-inputgroup__btn pb-inputgroup__btn--drop"
                aria-expanded={dropped}
                aria-controls={dropped ? 'usw-history-list' : undefined}
                data-tutorial-id={host?.anchor('command', 'usw-history')}
                onClick={() => { host?.report('command', { command: 'usw-history' }); setMenu(false); setDropped((d) => !d) }}
              >
                <PBDropGlyph />
              </button>
              <button
                type="button"
                className="pb-inputgroup__btn pb-inputgroup__btn--dots"
                aria-expanded={menu}
                aria-controls={menu ? 'usw-search-menu' : undefined}
                data-tutorial-id={host?.anchor('lookup', 'usw-search-for')}
                onClick={() => { host?.report('lookup', { field: 'usw-search-for' }); setDropped(false); setMenu((m) => !m) }}
              >
                …
              </button>
            </span>
            <PBButton
              style={{ minWidth: 90 }}
              data-tutorial-id="host.mois.command.search"
              onClick={() => { host?.report('command', { command: 'search' }); runSearch() }}
            >
              Search
            </PBButton>

            {dropped && (
              <div
                id="usw-history-list"
                role="listbox"
                style={{ position: 'absolute', left: 74, right: 100, top: 24, zIndex: 5, background: '#fff', border: '1px solid #808080', boxShadow: '2px 2px 4px rgba(0,0,0,.25)', maxHeight: 180, overflowY: 'auto' }}
              >
                {history.length === 0 && <div style={{ padding: '2px 6px', color: '#808080' }}>(no recent searches)</div>}
                {history.map((h, i) => (
                  <div
                    key={h}
                    role="option"
                    aria-selected={h === search}
                    data-tutorial-id={`host.mois.row.usw-history-${i + 1}`}
                    onMouseDown={(e) => { e.preventDefault(); setSearch(h); setCur(0); setDropped(false); searchInput.current?.focus() }}
                    style={{ padding: '1px 6px', cursor: 'default', background: h === search ? '#cce4f7' : undefined, borderBottom: '1px solid #eee' }}
                  >
                    {h}
                  </div>
                ))}
              </div>
            )}
            {menu && (
              <div
                id="usw-search-menu"
                role="menu"
                style={{ position: 'absolute', right: 100, top: 24, zIndex: 5, background: '#fff', border: '1px solid #808080', boxShadow: '2px 2px 4px rgba(0,0,0,.25)', minWidth: 190 }}
              >
                {([
                  ['usw-clear-history', 'Clear Search History', () => setHistory([])],
                  ['usw-search-by-term', `${searchBy === 'term' ? '✓ ' : '   '}Search by Term`, () => setSearchBy('term')],
                  ['usw-search-by-code', `${searchBy === 'code' ? '✓ ' : '   '}Search by Code`, () => setSearchBy('code')],
                ] as const).map(([id, label, act]) => (
                  <button
                    key={id}
                    type="button"
                    role="menuitem"
                    className="pb-menu__item"
                    data-tutorial-id={host?.anchor('command', id)}
                    onClick={() => { host?.report('command', { command: id }); act(); setMenu(false); setCur(0) }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '3px 10px', background: 'transparent', border: 0, whiteSpace: 'pre' }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '0 4px' }}>
            <PBDataWindow<UswRow>
              columns={[
                { key: 'term', header: 'Term' },
                { key: 'category', header: 'Category', width: 200 },
                { key: 'code', header: 'Code', width: 120 },
                { key: 'system', header: 'Code System', width: 180 },
              ]}
              rows={rows}
              current={at}
              onCurrentChange={setCur}
              onActivate={(r) => { remember(); onPick(r) }}
              rowTutorialId={(r) => `host.mois.row.usw-${pbSlug(r.system)}-${pbSlug(r.code)}`}
              empty="No term matches those parameters."
            />
          </div>
          {/* the count MOIS prints under the list is the limit it asked for */}
          <div style={{ padding: '2px 8px', flex: 'none', color: 'var(--pb-ink-dim)' }}>
            Rows: {limit}
          </div>

          <div style={{ flex: 'none' }} data-tutorial-id="host.mois.field.usw-alternate-terms">
            <PBBand>{`Alternate Terms      [${alternates.length}]`}</PBBand>
            <div style={{ height: 74, overflowY: 'auto', padding: '3px 6px', background: '#fff', borderBottom: '1px solid var(--pb-border)' }}>
              {alternates.map(([kind, text], i) => (
                <div key={`${kind}-${i}`} className="pb-row" style={{ gap: 0 }}>
                  <span style={{ width: 70, flex: 'none' }}>{kind}</span><span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pb-row" style={{ padding: '8px 6px', gap: 10, flex: 'none' }}>
            <PBButton style={{ minWidth: 172 }}>Save My Default Settings</PBButton>
            <PBButton style={{ minWidth: 172 }} onClick={() => { setSystems(systemList); setSets([]); setStatus('Active'); setLimit('200') }}>Restore System Settings</PBButton>
            <span style={{ flex: '1 1 auto' }} />
            <PBButton
              style={{ minWidth: 118 }}
              disabled={!row}
              data-tutorial-id="host.mois.command.select-term"
              onClick={() => { host?.report('command', { command: 'select-term' }); if (row) { remember(); onPick(row) } }}
            >
              Select
            </PBButton>
            <PBButton
              style={{ minWidth: 118 }}
              data-tutorial-id="host.mois.command.usw-cancel"
              onClick={() => { host?.report('command', { command: 'usw-cancel' }); onClose() }}
            >
              Cancel
            </PBButton>
            <span style={{ flex: '1 1 auto' }} />
            <PBButton
              style={{ minWidth: 186 }}
              disabled={!row || admin}
              data-tutorial-id="host.mois.command.usw-add-health-issue"
              /* the one button that writes: it files the term as a health issue
                 on the chart as well as returning it to the field */
              onClick={() => { host?.report('command', { command: 'usw-add-health-issue' }); if (row) onPick(row, true) }}
            >
              Select &amp; Add Health Issue
            </PBButton>
          </div>
        </div>
      </PBWindow>
    </div>
  )
}

/** One of the two checkbox panes across the top of the Universal Search Window. */
function CheckPane({ title, bold, scope, anchor, w, items, checked, onToggle, onAll, onClear, more }: {
  title: string
  bold: number
  /** `usw-<scope>-all` / `-clear` */
  scope: string
  /** `host.mois.field.usw-<anchor>-<slug>` */
  anchor: string
  w: number
  items: string[]
  checked: string[]
  onToggle: (v: string) => void
  onAll: () => void
  onClear: () => void
  more?: boolean
}) {
  const host = usePBInstrumentation()
  const link = (label: string, act: () => void): ReactNode => (
    <button
      type="button"
      className="pb-link"
      data-tutorial-id={host?.anchor('command', `usw-${scope}-${pbSlug(label)}`)}
      onClick={() => { host?.report('command', { command: `usw-${scope}-${pbSlug(label)}` }); act() }}
    >
      {label}
    </button>
  )
  return (
    <div style={{ width: w, flex: 'none', borderRight: '1px solid var(--pb-border)' }}>
      <div className="pb-band" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ flex: '1 1 auto', minWidth: 0, fontWeight: bold }}>{title}</span>
        {link('All', onAll)}
        {link('Clear', onClear)}
      </div>
      <div style={{ height: 84, overflowY: 'auto', background: '#fff' }}>
        {items.map((name, i) => (
          <div key={name} style={{ padding: '1px 5px', background: i % 2 ? '#eeeee4' : '#fff' }}>
            <PBCheckbox
              label={name}
              checked={checked.includes(name)}
              onChange={() => onToggle(name)}
              tutorialId={`host.mois.field.usw-${anchor}-${pbSlug(name)}`}
            />
          </div>
        ))}
        {more && <div style={{ padding: '1px 5px', color: 'var(--pb-ink-dim)' }}>More…</div>}
      </div>
    </div>
  )
}

/* By name — `host.mois.openUtility {window: 'universal-search-window'}` — for a
   lesson about the window itself rather than the field that raised it. The
   pick returns nowhere; Select closes it. `admin: true` opens the
   Administration variant (no chart in the caption). */
registerAreaWindow('universal-search-window', ({ args, close }) => (
  <UniversalSearchDialog admin={args.admin === true} onPick={() => close()} onClose={close} />
))

/* ---------------------------------------------------------------------------
   Advanced Lookup Service ▸ Master Service Code List: the Services `…`.

   The same window class as the Patient Chart List — band, list, description
   pane, Home/PgUp/Ok/Cancel/PgDwn/End — bound to the fee schedule instead of
   the roster. It filters from one `Search For` box rather than a box per
   column, and carries a Source / Save on Close strip under the buttons.
   ------------------------------------------------------------------------ */
const PAGE = 12

export function ServiceCodeLookupDialog({ onPick, onClose }: {
  onPick: (row: ServiceCodeRow) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('ALL')
  const [source, setSource] = useState('ALL')
  const [saveOnClose, setSaveOnClose] = useState(false)
  const [cur, setCur] = useState(0)

  const rows = useMemo(() => {
    const want = search.trim().toUpperCase()
    if (!want) return serviceCodeRows
    return serviceCodeRows.filter((r) => (
      r.description.toUpperCase().includes(want) || r.code.toUpperCase().includes(want)
    ))
  }, [search])

  const row = rows[Math.min(cur, rows.length - 1)]
  const step = (delta: number) => setCur((i) => Math.max(0, Math.min(rows.length - 1, i + delta)))

  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 95 }}>
      <PBWindow
        child
        controls={false}
        tutorialId="host.mois.dialog.service-code-lookup"
        title="Advanced Lookup Service"
        onClose={onClose}
        style={{ width: 'min(1000px, 100%)', height: 'min(720px, 100%)' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, padding: 8, gap: 6 }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, border: '1px solid var(--pb-border)' }}>
            <div className="pb-band--ruled"><PBBand>Master Service Code List</PBBand></div>
            <div className="pb-row" style={{ gap: 4, padding: '3px 4px', flex: 'none' }}>
              <span style={{ color: 'var(--pb-link)' }}>Search For:</span>
              <PBLookup w="100%" value={search} onChange={setSearch} name="service-code-search" />
              <span>Status:</span>
              <PBSelect
                w={92}
                options={['ALL', 'Active', 'Inactive']}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              />
            </div>
            <PBDataWindow
              flush
              rules="white"
              style={{ flex: '1 1 auto', minHeight: 0 }}
              columns={[
                { key: 'code', header: 'Code', width: 86, align: 'center' },
                { key: 'description', header: 'Description' },
                { key: 'msp', header: 'MSP', width: 78, align: 'right' },
                { key: 'wcb', header: 'WCB', width: 78, align: 'right' },
                { key: 'private', header: 'Private', width: 82, align: 'right' },
                { key: 'system', header: 'Code System', width: 108 },
                { key: 'category', header: 'Category', width: 128 },
                { key: 'type', header: 'Type', width: 88 },
              ]}
              rows={rows}
              current={Math.min(cur, Math.max(0, rows.length - 1))}
              onCurrentChange={setCur}
              onActivate={(r) => onPick(r)}
              empty="No service code matches."
            />
          </div>

          <div
            className="pb-field"
            style={{ height: 96, flex: 'none', padding: '3px 5px', background: '#fff' }}
          >
            This is the master service code selection list
          </div>

          <div style={{ display: 'flex', alignItems: 'center', flex: 'none' }}>
            <PBButton wide onClick={() => setCur(0)}>Home</PBButton>
            <PBButton wide onClick={() => step(-PAGE)}>PgUp</PBButton>
            <span style={{ flex: '1 1 auto' }} />
            <PBButton
              wide
              className="pb-btn--default"
              disabled={!row}
              data-tutorial-id="host.mois.command.pick-service-code"
              onClick={() => row && onPick(row)}
            >
              Ok
            </PBButton>
            <span style={{ width: 14 }} />
            <PBButton wide onClick={onClose}>Cancel</PBButton>
            <span style={{ flex: '1 1 auto' }} />
            <PBButton wide onClick={() => step(PAGE)}>PgDwn</PBButton>
            <PBButton wide onClick={() => setCur(rows.length - 1)}>End</PBButton>
          </div>

          {/* the strip the Patient Chart List does not have */}
          <div className="pb-row" style={{ gap: 10, flex: 'none' }}>
            <span>Source:</span>
            <PBSelect
              w={200}
              options={['ALL', 'BCMSPFEE', 'BCMAFEE', 'USER']}
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
            <PBCheckbox label="Save on Close" checked={saveOnClose} onChange={setSaveOnClose} />
          </div>
        </div>
      </PBWindow>
    </div>
  )
}
