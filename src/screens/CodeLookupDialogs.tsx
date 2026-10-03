import { useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import {
  PBButton, PBCheckbox, PBDataWindow, PBDropGlyph, PBInput, PBLookup, PBRadio, PBSelect,
  pbSlug, usePBInstrumentation,
} from '../pb'
import { usePatient } from '../data/patient-context'
import {
  serviceCodeRows, universalCodeSystems, universalReferenceSets, universalSearchRows,
  type ServiceCodeRow, type UniversalSearchRow,
} from '../data/encounterPickers'
import { UNIVERSAL_SEARCH_PRESETS, isUniversalSearchPreset, type UniversalSearchPresetId } from '../data/universalSearchPresets'
import { CODE_SYSTEM_ROWS, codeKey, type CodeRecord } from '../data/codesets'
import { useScreenReport } from '../host/screen-state'
import { useSessionState } from '../host/screen-windows'
import { useCodeRecords } from './adminSession'
import { registerAreaWindow } from './areaWindowRegistry'
import { ModalWindow } from './dialogKit'
import {
  FILL_GRID, LOOKUP_BODY, LOOKUP_PANEL, LookupBand, LookupNote, LookupPager, PickListWindow, SearchForRow, usePagedCursor,
} from './lookupKit'

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
   Geometry, colours and the imaging / consult variants: 2026-09-29 TRAINING
   captures c11 (Imaging Reports ▸ Test Name `…`) and c13 (Consult Reports ▸
   Reason `…`) — a white window face, #c8dcfa bands with grey captions, the
   Select from radios on the Parameters band, left-set column captions,
   24px grid rows zebra'd from the second row, no drop button on Search For,
   and Alternate Terms printed as bare zebra lines without the preferred term.

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
   `systems`, `referenceSets` and `page` narrow it further: the Provider
   window's Service tab offers SNOMED-CT alone, ticked, over its own page of
   service concepts, with nothing under Reference Set(s) (AdminPickerWindows,
   user capture #72).

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

/* --- the painted geometry (2026-09-29 TRAINING captures c11 / c13) --------
   Every value is the 2x capture's device pixels halved. The window's face is
   white, not the dialog grey; every band (the pane captions, the grid's
   column captions, Alternate Terms) is the same #c8dcfa with its caption in
   the grey of a disabled label, and the rules between the boxes are one
   #646464 pixel. */
const USW = {
  width: 1003,
  height: 737,
  titlebar: 33,
  band: '#c8dcfa',
  caption: '#808080',
  rule: '1px solid #646464',
  bandH: 24,
  /** the two checkbox panes; Parameters takes the rest */
  paneW: 267,
  /** a checkbox pane's row */
  checkRowH: 21,
  /** the pane body under its band */
  paneBodyH: 87,
  /** the result grid's row and header */
  gridRowH: 24,
  /** an Alternate Terms line */
  altRowH: 18,
  altBodyH: 61,
  zebra: '#e8e8e8',
} as const

const bandStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', height: USW.bandH, flex: 'none', background: USW.band, color: USW.caption, whiteSpace: 'nowrap',
}

/** A page of terms (the encounter pickers' by default), with this session's
    Codes edits laid over it. */
function useUswRows(page: UniversalSearchRow[]): UswRow[] {
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
    const out: UswRow[] = page.map((r) => {
      const k = codeKey(r.system, r.code)
      seen.add(k)
      const rec = byKey.get(k)
      return rec ? fromRecord(rec) : { ...r, active: true, sets: r.sets ?? [] }
    })
    for (const rec of records) if (!seen.has(codeKey(rec.system, rec.code))) out.push(fromRecord(rec))
    return out
  }, [records, page])
}

/** The Alternate Terms lines for a row.

    Administration (`c62a9ff7…`) prints each line under its description type:
    SYN-P-EN for the preferred term, SYN-A-EN for the others — an ICD-9 row
    carries its own code as one — and FSN.

    The chart's window (c11, c13) prints the terms alone, one per zebra line,
    and leaves the preferred term out: c11's ACUTE GASTROINTESTINAL BLOOD LOSS
    IMAGING reads [1], its one line the fully specified name. */
function alternateLines(row: UswRow | undefined, admin: boolean | undefined): [string, string][] {
  if (!row) return []
  const lines: [string, string][] = admin ? [['SYN-P-EN', row.term]] : []
  if (row.system === 'ICD-9') lines.push(['SYN-A-EN', row.code])
  for (const a of row.alternates) lines.push(['SYN-A-EN', a])
  for (const f of row.fsn ?? []) lines.push(['FSN', f])
  return lines
}

/**
 * The Universal Search Window.
 *
 * Open args: a field that is bound to a lookup setting passes `preset` —
 * `'medical-imaging'` (Imaging Reports ▸ Test Name, c11) or
 * `'consult-requests'` (Consult Reports ▸ Reason, c13) — and the window takes
 * its code systems, reference sets (and which are ticked), `More…` row and
 * first page of terms from data/universalSearchPresets.ts. `systems`,
 * `referenceSets`, `checkedSets`, `more` and `page` override a preset piece
 * by piece. By name: `openWindow('universal-search-window', { preset })`.
 */
export function UniversalSearchDialog({
  onPick, onClose, admin, preset: presetId, systems: offered, referenceSets: offeredSets, checkedSets, more: moreProp, page: offeredPage,
}: {
  /** Select — hands the term back to the field that opened the window */
  onPick: (row: UniversalSearchRow, addHealthIssue?: boolean) => void
  onClose: () => void
  /** opened from Administration: no chart in the caption, no Add Health Issue */
  admin?: boolean
  /** the lookup setting of the field that raised the window (c11 / c13) */
  preset?: UniversalSearchPresetId
  /** the only code systems offered, all ticked — the Provider's Service tab
      offers SNOMED-CT alone (AdminPickerWindows, user capture #72) */
  systems?: string[]
  /** the Reference Set(s) pane's list; empty where there is nothing to
      filter to (#72) */
  referenceSets?: string[]
  /** the reference sets ticked on opening (none, unless a preset ticks one) */
  checkedSets?: string[]
  /** the greyed `More…` row under the code systems */
  more?: boolean
  /** the page of terms the window opens on */
  page?: UniversalSearchRow[]
}) {
  const host = usePBInstrumentation()
  const patient = usePatient()
  const preset = presetId ? UNIVERSAL_SEARCH_PRESETS[presetId] : undefined
  const referenceSets = offeredSets ?? preset?.referenceSets ?? universalReferenceSets
  const initialSets = checkedSets ?? preset?.checkedSets ?? NO_SETS
  const all = useUswRows(offeredPage ?? preset?.page ?? universalSearchRows)
  /* MOIS lists the systems this site has licensed and leaves a greyed
     `More…` row for the ones it has not (c13); the imaging setting, which
     offers SNOMED-CT alone, has none (c11) */
  const more = moreProp ?? preset?.more ?? !admin
  /* Administration lists every code system the site holds; a chart lists the
     ones its lookup setting makes available */
  const systemList = useMemo(() => offered ?? preset?.systems ?? (admin
    ? [...new Set([...universalCodeSystems, ...CODE_SYSTEM_ROWS.filter((s) => all.some((r) => r.system === s.system)).map((s) => s.system)])]
    : universalCodeSystems), [offered, preset, admin, all])
  const [systems, setSystems] = useState<string[]>(systemList)
  const [sets, setSets] = useState<string[]>(initialSets)
  const [scope, setScope] = useState('Code Systems')
  const [code, setCode] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('Active')
  const [limit, setLimit] = useState('200')
  const [search, setSearch] = useState('')
  const [searchBy, setSearchBy] = useState<'term' | 'code'>('term')
  const [cur, setCur] = useState(0)
  const [section, setSection] = useState<Section>('search')
  /* the window opens with the caret in Search For and no caption bold (c11,
     c13); the section holding focus is bolded once F6 has moved it */
  const [cycled, setCycled] = useState(false)
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
  const alternates = alternateLines(row, admin)

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
      setCycled(true)
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

  const bold = (s: Section) => (cycled && section === s ? 700 : 400)
  /* the parameter rows: a right-aligned label column ending 81px into the
     pane, the field 5px after it, rows on a 20px pitch (c11) */
  const paramLabel: CSSProperties = { width: 83, flex: 'none', textAlign: 'right', marginRight: 4 }
  const paramRow: CSSProperties = { display: 'flex', alignItems: 'center', height: 20 }
  const box: CSSProperties = { height: 17 }

  return (
    <ModalWindow
      id="universal-search"
      zIndex={95}
      title={admin ? 'MOIS - Universal Search Window' : `MOIS - Universal Search Window for Chart Number: ${patient.chart} ${patient.first} ${patient.last}`}
      onClose={onClose}
      windowStyle={{
        width: `min(${USW.width}px, 100%)`, height: `min(${USW.height}px, 100%)`, background: '#fff',
        ['--pb-titlebar-h' as string]: `${USW.titlebar}px`,
      }}
    >
        <div onKeyDown={onKeyDown} style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, padding: '0 2px', background: '#fff' }}>
          {/* ---- the three parameter panes ---------------------------------- */}
          <div style={{ display: 'flex', flex: 'none', border: USW.rule }}>
            <div ref={refs.systems} onFocusCapture={() => setSection('systems')} style={{ display: 'contents' }}>
              <CheckPane
                title="Select from Code System(s)"
                bold={bold('systems')}
                scope="systems"
                anchor="system"
                items={systemList}
                checked={systems}
                onToggle={(x) => toggle(systems, setSystems, x)}
                onAll={() => setSystems(systemList)}
                onClear={() => setSystems([])}
                more={more}
              />
            </div>
            <div ref={refs.sets} onFocusCapture={() => setSection('sets')} style={{ display: 'contents' }}>
              <CheckPane
                title="Filter to Reference Set(s)"
                bold={bold('sets')}
                scope="sets"
                anchor="set"
                items={referenceSets}
                checked={sets}
                onToggle={(x) => toggle(sets, setSets, x)}
                onAll={() => setSets(referenceSets)}
                onClear={() => setSets([])}
              />
            </div>
            <div ref={refs.parameters} onFocusCapture={() => setSection('parameters')} style={{ flex: '1 1 auto', minWidth: 0 }}>
              {/* the Select from radios sit on the band itself (c11) */}
              <div style={{ ...bandStyle, paddingLeft: 4 }}>
                <span style={{ width: 70, flex: 'none', fontWeight: bold('parameters') }}>Parameters:</span>
                <span style={{ width: 67, flex: 'none' }}>Select from</span>
                {([
                  ['Code Systems', <>Code <u>S</u>ystems</>, 105],
                  ['Health Issues', <><u>H</u>ealth Issues</>, 106],
                  ['Encounter History', <><u>E</u>ncounter History</>, undefined],
                ] as const).map(([s, label, w]) => (
                  <span key={s} style={{ width: w, flex: 'none', color: 'var(--pb-text)' }}>
                    <PBRadio name="universal-scope" label={label} checked={scope === s} onChange={() => setScope(s)} />
                  </span>
                ))}
              </div>
              <div style={{ padding: '2px 0 0' }}>
                <div style={paramRow}>
                  <span style={paramLabel}>Code is</span>
                  <PBInput w={94} style={box} value={code} onChange={(e) => { setCode(e.target.value); setCur(0) }} data-tutorial-id="host.mois.field.usw-code-is" />
                </div>
                <div style={paramRow}>
                  <span style={paramLabel}>Category is like</span>
                  <PBInput w={257} style={box} value={category} onChange={(e) => { setCategory(e.target.value); setCur(0) }} data-tutorial-id="host.mois.field.usw-category" />
                </div>
                <div style={paramRow}>
                  <span style={{ ...paramLabel, marginRight: 7 }}>Status is</span>
                  {['Active', 'Inactive', 'Either'].map((s, i) => (
                    <span key={s} style={{ width: i === 0 ? 59 : i === 1 ? 59 : undefined, flex: 'none' }}>
                      <PBRadio name="universal-status" label={s} checked={status === s} onChange={() => { setStatus(s); setCur(0) }} tutorialId={`host.mois.field.usw-status-${pbSlug(s)}`} />
                    </span>
                  ))}
                </div>
                <div style={paramRow}>
                  <span style={paramLabel}>Limit list to</span>
                  <PBInput w={65} style={box} value={limit} onChange={(e) => setLimit(e.target.value)} data-tutorial-id="host.mois.field.usw-limit" />
                  <span style={{ marginLeft: 4 }}>records</span>
                </div>
              </div>
            </div>
          </div>

          {/* ---- the search strip ------------------------------------------- */}
          <div
            ref={refs.search}
            onFocusCapture={() => setSection('search')}
            className="pb-row"
            style={{ gap: 0, height: 23, padding: '0 2px 0 4px', flex: 'none', position: 'relative', borderLeft: USW.rule, borderRight: USW.rule }}
          >
            <span style={{ flex: 'none', marginRight: 3, color: 'var(--pb-link)', fontWeight: bold('search') }}>Search For:</span>
            <span className="pb-inputgroup" style={{ flex: '1 1 auto', minWidth: 0, height: 17 }}>
              <input
                ref={searchInput}
                type="text"
                className="pb-field"
                value={search}
                /* the salmon box: MOIS paints the field the search runs from
                   the same colour it paints a current row */
                style={{ background: '#ffbf9c', height: 17 }}
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
              {/* the chart's window paints no drop button (c11, c13): its
                  history drops on Alt+Down / F4 only. The article capture the
                  button was drawn from is kept for Administration. */}
              {admin && (
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
              )}
              <button
                type="button"
                className="pb-inputgroup__btn pb-inputgroup__btn--dots"
                style={{ width: 16 }}
                aria-expanded={menu}
                aria-controls={menu ? 'usw-search-menu' : undefined}
                data-tutorial-id={host?.anchor('lookup', 'usw-search-for')}
                onClick={() => { host?.report('lookup', { field: 'usw-search-for' }); setDropped(false); setMenu((m) => !m) }}
              >
                …
              </button>
            </span>
            <PBButton style={{ width: 76, height: 21, marginLeft: 13 }} command="search" onClick={runSearch}>
              Search
            </PBButton>

            {dropped && (
              <div
                id="usw-history-list"
                role="listbox"
                style={{ position: 'absolute', left: 63, right: 100, top: 20, zIndex: 5, background: '#fff', border: '1px solid #808080', boxShadow: '2px 2px 4px rgba(0,0,0,.25)', maxHeight: 180, overflowY: 'auto' }}
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
                style={{ position: 'absolute', right: 100, top: 20, zIndex: 5, background: '#fff', border: '1px solid #808080', boxShadow: '2px 2px 4px rgba(0,0,0,.25)', minWidth: 190 }}
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

          {/* ---- the result grid, its Rows: footer and Alternate Terms ------ */}
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', border: USW.rule }}>
            <PBDataWindow<UswRow>
              flush
              rules={false}
              columns={[
                { key: 'term', header: <UswCaption>Term</UswCaption>, headAlign: 'left' },
                { key: 'category', header: <UswCaption>Category</UswCaption>, headAlign: 'left', width: 216 },
                { key: 'code', header: <UswCaption>Code</UswCaption>, headAlign: 'left', width: 81 },
                { key: 'system', header: <UswCaption>Code System</UswCaption>, headAlign: 'left', width: 191 },
              ]}
              rows={rows}
              current={at}
              onCurrentChange={setCur}
              onActivate={(r) => { remember(); onPick(r) }}
              /* the band runs white, grey, white … from the first row; the kit's
                 zebra starts grey (c11, c13) */
              rowFill={(_r, i) => (i % 2 ? USW.zebra : '#fff')}
              rowTutorialId={(r) => `host.mois.row.usw-${pbSlug(r.system)}-${pbSlug(r.code)}`}
              empty="No term matches those parameters."
              style={{
                flex: '1 1 auto', minHeight: 0,
                ['--pb-dw-row-h' as string]: `${USW.gridRowH}px`,
                ['--pb-dw-cell-gap' as string]: '0px',
                ['--pb-dw-header' as string]: USW.band,
                ['--pb-dw-header-line' as string]: USW.band,
              }}
            />
            {/* the count MOIS prints under the list is the limit it asked for */}
            <div style={{ height: 25, lineHeight: '25px', padding: '0 0 0 15px', flex: 'none', color: USW.caption, background: '#fff' }}>
              Rows: {limit}
            </div>
          </div>

          <div style={{ flex: 'none', borderLeft: USW.rule, borderRight: USW.rule, borderBottom: USW.rule }} data-tutorial-id="host.mois.field.usw-alternate-terms">
            <div style={{ ...bandStyle, paddingLeft: 15 }}>
              <span style={{ width: 119, flex: 'none' }}>Alternate Terms</span>
              <span>[{alternates.length}]</span>
            </div>
            <div style={{ height: USW.altBodyH, overflowY: 'auto', background: '#fff' }}>
              {alternates.map(([kind, text], i) => (
                <div
                  key={`${kind}-${i}`}
                  style={{ display: 'flex', alignItems: 'center', height: USW.altRowH, padding: '0 15px', whiteSpace: 'nowrap', background: i % 2 ? USW.zebra : '#fff' }}
                >
                  {admin && <span style={{ width: 70, flex: 'none' }}>{kind}</span>}
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pb-row" style={{ height: 41, padding: '0 2px 0 4px', gap: 0, flex: 'none' }}>
            <PBButton style={{ width: 132, height: 22 }}>Save My Default Settings</PBButton>
            <PBButton
              style={{ width: 131, height: 22, marginLeft: 7 }}
              onClick={() => { setSystems(systemList); setSets(initialSets); setStatus('Active'); setLimit('200') }}
            >
              Restore System Settings
            </PBButton>
            <PBButton
              style={{ width: 74, height: 22, marginLeft: 148 }}
              disabled={!row}
              command="select-term"
              onClick={() => { if (row) { remember(); onPick(row) } }}
            >
              Select
            </PBButton>
            <PBButton style={{ width: 74, height: 22, marginLeft: 6 }} command="usw-cancel" onClick={onClose}>
              Cancel
            </PBButton>
            <span style={{ flex: '1 1 auto' }} />
            <PBButton
              style={{ width: 136, height: 22 }}
              disabled={!row || admin}
              command="usw-add-health-issue"
              /* the one button that writes: it files the term as a health issue
                 on the chart as well as returning it to the field */
              onClick={() => { if (row) onPick(row, true) }}
            >
              Select &amp; Add Health Issue
            </PBButton>
          </div>
        </div>
    </ModalWindow>
  )
}

const NO_SETS: string[] = []

/** A grid column caption: the disabled-label grey on the band, set 3px
    left of the cells under it (c11). */
function UswCaption({ children }: { children: ReactNode }) {
  /* left-set by the column's headAlign; the span carries the ink and the
     2px pull towards the column's edge */
  return <span style={{ color: USW.caption, marginLeft: -2 }}>{children}</span>
}

/** One of the two checkbox panes across the top of the Universal Search Window. */
function CheckPane({ title, bold, scope, anchor, items, checked, onToggle, onAll, onClear, more }: {
  title: string
  bold: number
  /** `usw-<scope>-all` / `-clear` */
  scope: string
  /** `host.mois.field.usw-<anchor>-<slug>` */
  anchor: string
  items: string[]
  checked: string[]
  onToggle: (v: string) => void
  onAll: () => void
  onClear: () => void
  more?: boolean
}) {
  const host = usePBInstrumentation()
  const link = (label: string, act: () => void, w?: number): ReactNode => (
    <span style={{ width: w, flex: 'none' }}>
      <button
        type="button"
        className="pb-link"
        data-tutorial-id={host?.anchor('command', `usw-${scope}-${pbSlug(label)}`)}
        onClick={() => { host?.report('command', { command: `usw-${scope}-${pbSlug(label)}` }); act() }}
      >
        {label}
      </button>
    </span>
  )
  return (
    <div style={{ width: USW.paneW, flex: 'none', borderRight: USW.rule, display: 'flex', flexDirection: 'column' }}>
      {/* the caption runs 3px in; All sits 187px in and Clear 214px, clear of
          the scroll bar the pane grows (c11, c13) */}
      <div style={{ ...bandStyle, paddingLeft: 3 }}>
        <span style={{ width: 184, flex: 'none', overflow: 'hidden', fontWeight: bold }}>{title}</span>
        {link('All', onAll, 27)}
        {link('Clear', onClear)}
      </div>
      {/* c13's Code System(s) pane shows its scroll bar with `More…` below
          the fold of its last row */}
      <div style={{ height: USW.paneBodyH, overflowY: more ? 'scroll' : 'auto', background: '#fff' }}>
        {items.map((name, i) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', height: USW.checkRowH, padding: '0 6px', background: i % 2 ? USW.zebra : '#fff' }}>
            <PBCheckbox
              label={name}
              checked={checked.includes(name)}
              onChange={() => onToggle(name)}
              tutorialId={`host.mois.field.usw-${anchor}-${pbSlug(name)}`}
            />
          </div>
        ))}
        {more && (
          <div style={{ display: 'flex', alignItems: 'center', height: 24, marginTop: 3, padding: '0 11px', borderTop: '1px solid #f0f0f0', color: USW.caption }}>More…</div>
        )}
      </div>
    </div>
  )
}

/* By name — `host.mois.openUtility {window: 'universal-search-window'}` — for a
   lesson about the window itself rather than the field that raised it. The
   pick returns nowhere; Select closes it. `admin: true` opens the
   Administration variant (no chart in the caption); `preset:
   'medical-imaging' | 'consult-requests'` opens it the way the Imaging Test
   Name or Consult Reason `…` does. */
registerAreaWindow('universal-search-window', ({ args, close }) => (
  <UniversalSearchDialog
    admin={args.admin === true}
    preset={isUniversalSearchPreset(args.preset) ? args.preset : undefined}
    onPick={() => close()}
    onClose={close}
  />
))

/* ---------------------------------------------------------------------------
   Advanced Lookup Service ▸ Master Service Code List: the Services `…`.

   The same window class as the Patient Chart List — band, list, description
   pane, Home/PgUp/Ok/Cancel/PgDwn/End — bound to the fee schedule instead of
   the roster. It filters from one `Search For` box rather than a box per
   column, and carries a Source / Save on Close strip under the buttons.
   ------------------------------------------------------------------------ */
export function ServiceCodeLookupDialog({ onPick, onClose }: {
  onPick: (row: ServiceCodeRow) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('ALL')
  const [source, setSource] = useState('ALL')
  const [saveOnClose, setSaveOnClose] = useState(false)

  const rows = useMemo(() => {
    const want = search.trim().toUpperCase()
    if (!want) return serviceCodeRows
    return serviceCodeRows.filter((r) => (
      r.description.toUpperCase().includes(want) || r.code.toUpperCase().includes(want)
    ))
  }, [search])

  const cursor = usePagedCursor(rows.length, 12)
  const row = rows[cursor.at]

  return (
    <PickListWindow<ServiceCodeRow>
      window={{
        id: 'service-code-lookup',
        title: 'Advanced Lookup Service',
        onClose,
        zIndex: 95,
        windowStyle: { width: 'min(1000px, 100%)', height: 'min(720px, 100%)' },
      }}
      body={LOOKUP_BODY}
      panel={LOOKUP_PANEL}
      band={<LookupBand variant="ruled">Master Service Code List</LookupBand>}
      search={(
        <SearchForRow
          style={{ gap: 4, padding: '3px 4px', flex: 'none' }}
          input={<PBLookup w="100%" value={search} onChange={setSearch} name="service-code-search" />}
          after={(
            <>
              <span>Status:</span>
              <PBSelect
                w={92}
                options={['ALL', 'Active', 'Inactive']}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              />
            </>
          )}
        />
      )}
      gridBox={null}
      grid={{
        flush: true,
        rules: 'white',
        style: FILL_GRID,
        columns: [
          { key: 'code', header: 'Code', width: 86, align: 'center' },
          { key: 'description', header: 'Description' },
          { key: 'msp', header: 'MSP', width: 78, align: 'right' },
          { key: 'wcb', header: 'WCB', width: 78, align: 'right' },
          { key: 'private', header: 'Private', width: 82, align: 'right' },
          { key: 'system', header: 'Code System', width: 108 },
          { key: 'category', header: 'Category', width: 128 },
          { key: 'type', header: 'Type', width: 88 },
        ],
        rows,
        current: cursor.at,
        onCurrentChange: cursor.setCurrent,
        onActivate: (r) => onPick(r),
        empty: 'No service code matches.',
      }}
      below={<LookupNote height={96}>This is the master service code selection list</LookupNote>}
      footerInside
      footer={(
        <LookupPager
          cursor={cursor}
          ok={{ command: 'pick-service-code', isDefault: true, disabled: !row, onClick: () => row && onPick(row) }}
          cancel={{ onClick: onClose }}
        />
      )}
      after={(
        /* the strip the Patient Chart List does not have */
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
      )}
    />
  )
}
