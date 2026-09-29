import { useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import { PBButton, PBInput, usePBInstrumentation, type PBCommand } from '../pb'
import { Cmd } from './adminKit'
import { CmdButton } from './CmdButton'
import { DialogButton } from './WorkspaceDialogFrame'

/* ============================================================================
   The list mechanics the windows repeat: ticked rows with Select All /
   Unselect All, per-column filter boxes over a grid, a record list with its
   current row, and the New / Delete / Save / Undo draft contract of the
   chart folders. Hooks and plain functions only, plus the two tiny button
   and filter strips whose markup every copy shares — nothing here draws
   anything a copy does not already draw.

   This wave builds the primitives; the call sites still carry their own
   copies. The migration notes on each export list those copies and the
   parameters that reproduce each one's markup exactly (DOM, classes, inline
   styles and `host.mois.*` anchors), or why a copy stays as it is.
   ========================================================================= */

/* ===========================================================================
   1. Ticked rows — useTickSet, toggled, SelectAllPair
   ======================================================================== */

/**
 * `set` with `key` ticked (`on` true), unticked (`on` false) or flipped
 * (`on` omitted), as a new Set — the one-liner
 * `setX((s) => { const n = new Set(s); v ? n.add(k) : n.delete(k); return n })`
 * written out in some 25 files. For a store the hook cannot own
 * (`useSessionState`, a lifted state): `setX((s) => toggled(s, k, v))`.
 */
export function toggled<K>(set: ReadonlySet<K>, key: K, on?: boolean): Set<K> {
  const next = new Set(set)
  if (on ?? !next.has(key)) next.add(key)
  else next.delete(key)
  return next
}

/**
 * The ticked rows of a pick-list grid: a Set of row keys (the row index by
 * default; a string key — an appointment key, a chart — where the list
 * re-sorts).
 *
 * MIGRATION — `const [picked, setPicked] = useState<Set<number>>(() => new Set())`
 * plus its toggle becomes `const tick = useTickSet()`; `picked.has(i)` →
 * `tick.has(i)`, `toggle(i, v)` → `tick.set(i, v)`, the flip form
 * (SearchForBand 386, GoalWindows 298, AdminListsView 890) → `tick.flip(i)`,
 * `setPicked(new Set(rows.map((_, i) => i)))` → `tick.selectAll(rows.map((_, i) => i))`,
 * `setPicked(new Set())` → `tick.clear()`. Sites: QuickEntryWindows 290/372,
 * WorkspaceWindows 136/216, ConceptTransferWindows 147, SearchForBand 386,
 * AppointmentSeriesWindows 678 (`useTickSet<string>()`), MedicationWindows
 * 497, RecordOptionWindows 237, SummarySettingsView 352/597 (597 keeps an
 * *un*ticked set: `set(i, !v)`), ReportSpecWindow 252, MarActionWindows 510,
 * UserAccountWindow 757, PrescriptionPrintWindows 286/296/460, ReportBuilder-
 * Window 1134, PrintFlow 246, ChartBasicsWindows 572, NotificationView 257,
 * MarView 340/344, ClaimWizards 244/558, SentReviewWizard 289, InvoiceWindows
 * 150, SchedulerMenuWindows 328, GroupBookingWindows 407/467, AccessReport-
 * Windows 270, WorkspaceBlendWindows 329, ScorecardWindow 67, ChartNavigator-
 * Window 42, AddressBookWindow 240/246, SecurityProfileWindow 169,
 * AddAttachmentDialog 106, OrgRoleWindows 582, AddressBookAdminWindows 361,
 * EncounterLinkServiceDialog 141, BasketFolderView 599, UiKit 51.
 * PaperFormAdminWindows 142 keeps a `boolean[]` — `useTickSet()` there with
 * `count = tick.size` draws the same.
 */
export function useTickSet<K = number>(initial?: Iterable<K> | (() => Iterable<K>)) {
  const [ticked, setTicked] = useState<Set<K>>(() => new Set(typeof initial === 'function' ? initial() : initial))
  return {
    ticked,
    setTicked,
    size: ticked.size,
    has: (key: K) => ticked.has(key),
    /** tick (`on` true) or untick one row */
    set: (key: K, on: boolean) => setTicked((s) => toggled(s, key, on)),
    /** flip one row */
    flip: (key: K) => setTicked((s) => toggled(s, key)),
    /** tick exactly these rows (Select All) */
    selectAll: (keys: Iterable<K>) => setTicked(new Set(keys)),
    /** untick every row (Unselect All / Clear Selections) */
    clear: () => setTicked(new Set()),
  }
}

/** How a copy draws its two buttons — each is an existing wrapper, unchanged. */
export type SelectAllButton =
  /** `DialogButton` (WorkspaceDialogFrame): `width`, `minWidth: 0`, `height: 24`, reported */
  | 'dialog'
  /** adminKit's `Cmd`: `width`, `minWidth: 0`, reported */
  | 'cmd'
  /** `CmdButton`: `style={{ width }}` only (keeps the button's own min-width), reported */
  | 'command'
  /** a bare `PBButton` anchored `host.mois.command.<id>` but not reported, no width */
  | 'anchor'

/**
 * Select All / Unselect All, side by side: two buttons, no wrapper — the row
 * around them, the gap and whatever follows stay the caller's.
 *
 * MIGRATION (each copy's exact markup):
 * - QuickEntryWindows 312-313: `ids={['qe-export-select-all', 'qe-export-unselect-all']} width={88}`
 * - QuickEntryWindows 408-409: `ids={['qe-import-select-all', 'qe-import-unselect-all']} width={88}`
 * - WorkspaceWindows 177-178: `ids={['forward-select-all', 'forward-unselect-all']} width={76}`
 * - AppointmentSeriesWindows 695-696: `ids={['series-select-all', 'series-clear-selections']}
 *   labels={['Select All', 'Clear Selections']} width={[84, 100]}`
 * - ConceptTransferWindows 161-162: `as="cmd" ids={['select-all', 'unselect-all']} width={80}`
 *   (its Select All skips existing concepts: `onSelectAll={() => tick.selectAll(importable)}`)
 * - SearchForBand 396-397: `as="command" ids={['select-all', 'unselect-all']} width={76}`
 * - PaperFormAdminWindows 146-147: `as="anchor" ids={['export-select-all', 'export-unselect-all']}`
 * Not a pair (left alone): SummarySettingsView 590 (Select All only),
 * DesignerDetailWindow 1028, LetterWriterWindow 678, PreSlotWizard 267
 * (unanchored `PBButton`s, some `size="sm"`, no Unselect or conditional).
 */
export function SelectAllPair({
  ids, labels = ['Select All', 'Unselect All'], width, as = 'dialog', onSelectAll, onUnselectAll,
}: {
  /** the two command ids: `host.mois.command.<id>` */
  ids: readonly [string, string]
  labels?: readonly [ReactNode, ReactNode]
  /** one width for both, or [select, unselect]; unused by `as="anchor"` */
  width?: number | readonly [number, number]
  as?: SelectAllButton
  onSelectAll: () => void
  onUnselectAll: () => void
}) {
  const host = usePBInstrumentation()
  const widths = typeof width === 'number' || width === undefined ? [width, width] : width
  const button = (i: 0 | 1, onClick: () => void) => {
    const id = ids[i]
    const w = widths[i]
    switch (as) {
      case 'dialog': return <DialogButton key={id} id={id} width={w} onClick={onClick}>{labels[i]}</DialogButton>
      case 'cmd': return <Cmd key={id} id={id} w={w} onClick={onClick}>{labels[i]}</Cmd>
      case 'command': return <CmdButton key={id} command={id} style={{ width: w }} onClick={onClick}>{labels[i]}</CmdButton>
      case 'anchor': return <PBButton key={id} onClick={onClick} data-tutorial-id={host?.anchor('command', id)}>{labels[i]}</PBButton>
    }
  }
  return <>{button(0, onSelectAll)}{button(1, onUnselectAll)}</>
}

/* ===========================================================================
   2. Per-column filter boxes — useColumnFilters, FilterStrip
   ======================================================================== */

/**
 * How a typed filter matches a cell (a substring, case-folded):
 * - `upper-trim`: `cell.toUpperCase().includes(typed.trim().toUpperCase())` —
 *   Jorg, AdvancedLookup, Codeset Management, External Service, Invoice
 * - `upper`: no trim — MedicationWindows, MasterProviderList, Determinants
 * - `lower-trim`: UserManagement, CarePlanTemplates, DesignerSection, QuickEntryList
 * - `lower`: no trim — ConfigurationViews, EncounterWindow's Select Form
 * An empty filter matches every row in every mode.
 */
export type FilterMatch = 'upper-trim' | 'upper' | 'lower-trim' | 'lower'
export type FilterValues = Record<string, string>

/** One grid column's filter box; `null` for a column with no box. */
export type FilterColumn<T> = {
  /** the filter's key (and, without `value`, the row field it reads) */
  key: string
  /** the cell text it matches; default `row[key]` (null/undefined → '') */
  value?: (row: T) => unknown
  /** a predicate replacing the substring match (date bounds, exact codes) */
  test?: (row: T, typed: string) => boolean
  /** `host.mois.field.<anchor>` on the box */
  anchor?: string
  /** the box's `aria-label` (ConfigurationViews: `Filter ${header}`) */
  ariaLabel?: string
  /** PBInput `w` (a box sized to its column: MasterProviderList `c.width - 2`) */
  w?: number | string
  style?: CSSProperties
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void
  /** a box that is not a text box — a drop-down (AdvancedLookup's Status),
      a tick (DesignerSection's HM Item) — drawn by the caller */
  box?: (value: string, set: (value: string) => void) => ReactNode
} | null

const fold = (s: string, match: FilterMatch) => (match.startsWith('lower') ? s.toLowerCase() : s.toUpperCase())
const cellText = (v: unknown) => String(v ?? '')

/** The substring test every filter row runs, by `match`. */
export function filterMatches(cell: unknown, typed: string, match: FilterMatch = 'upper-trim'): boolean {
  const want = match.endsWith('-trim') ? typed.trim() : typed
  return fold(cellText(cell), match).includes(fold(want, match))
}

/**
 * Filter boxes over a grid's columns and the rows they leave.
 *
 * `columns` runs in grid-column order, `null` where a column has no box, so
 * `filterRow` drops straight into `PBDataWindow`'s `filters`; `box(key)`
 * draws one box on its own for a strip laid out by hand (Determinants).
 * `opts.onChange` runs after each keystroke — the `setCur(0)` most copies do.
 * `opts.state` hands the values to a lifted store (Determinants keeps one
 * set across its two tabs).
 *
 * MIGRATION (columns listed in grid order; `a:` = anchor, `w:` = width):
 * - ConfigurationViews 70 ListFolder: `match: 'lower'`, each column
 *   `{ key, w: '100%', ariaLabel: \`Filter ${c.header}\`, anchor: \`filter-${pbSlug(c.header)}\` }`
 * - JorgLookupWindows 29 useFiltered: `JORG_KEYS.map((key) => ({ key }))` (and
 *   the Service Location keys); `match: 'upper-trim'`; `shown` is `filtered`
 * - CodesetManagementViews 137/164: `[{ key: 'system', a: 'filter-code-system' },
 *   { key: 'desc', a: 'filter-description' }, null, null, null]`, upper-trim
 * - CodesetManagementViews 537/568: `[{ key: 'name', a: 'filter-common-name' },
 *   { key: 'desc', a: 'filter-description' }]`, upper-trim, `onChange: () => setCur(0)`
 * - ExternalServiceWindows 75/113: rows `rows.map((r, index) => ({ r, index }))`,
 *   `[{ key: 'name', value: (x) => x.r.name, a: 'filter-name' }, { key: 'type',
 *   value: (x) => x.r.orgType, a: 'filter-org-type' }, null, null]`, upper-trim,
 *   `onChange: () => setCur(0)`; New Record's `setFilter({ name: '', type: '' })` → `clear()`
 * - ExternalServiceWindows 163/190: `[{ key: 'location', value: (x) => x.r.location,
 *   a: 'filter-location' }, null, null, null]`, same; New Record → `clear()`
 * - DeterminantsView 82/283/351: parent holds the values; each tab
 *   `useColumnFilters(rows, [{ key: 'occupation', w: 276, a: 'employment-search-occupation' },
 *   { key: 'company', w: 148, a: 'employment-search-company' }], { match: 'upper',
 *   state: [filters, setFilter] })` and draws `box('occupation')` / `box('company')`
 *   where its PBInputs are (Education: institution 276 / level 196)
 * - AdvancedLookupDialog 60/82: `COLUMNS.map((c) => c.filter ? { key: c.key,
 *   box: c.key === 'status' ? <its PBDropDownDataWindow> : undefined, …the
 *   copy's other PBInput props } : null)`, upper-trim
 * - UserManagementView 115/156: lower-trim; boxes from `spec.filter` (`w: box.w`)
 * - CarePlanTemplatesView 66/105: lower-trim, `a: filter-${pbSlug(c.header)}`,
 *   `onChange: () => setCur(0)`; filters only 'desc' and 'detail' — the other
 *   columns' boxes type but do not filter: give them `test: () => true`
 * - DesignerSectionView 89/204: lower-trim; the HM Item tick is a `box` plus
 *   `test` (its tick state stays separate, `onlyTicked`)
 * - MasterProviderListDialog 40/50: upper, `w: c.width! - 2` for i < 4, else null,
 *   `onChange: () => setCur(0)`
 * - MedicationWindows 64 DrugLookup: upper, `initial: { generic: initial }`,
 *   `a: drug-${k}`, `onChange: () => setCur(0)`, `[f, generic, brand, atc,
 *   atcName, null, null]`. Its cells are `String(d[k])` (a null prints "null");
 *   every DrugRow field is a string, so no row changes.
 * - MedicationWindows 291 FavouriteList: upper, `[type, identifier, med, null, null]`,
 *   no anchors (its source drop-down stays an outer filter on `rows`)
 * - InvoiceWindows 261: upper-trim, `a: invoice-filter-${k}`,
 *   `onKeyDown: (e) => { if (e.key === 'Enter') setCur(0) }`, four nulls after
 * - QuickEntryListView 30: lower-trim, `[{ key: 'group', a: 'filter-template-group' },
 *   { key: 'name', a: 'filter-name' }, null]`, `onChange: () => setCur(0)`
 * - EncounterWindow 783 Select Form: lower, `[{ key: 'type', a: 'form-type' },
 *   { key: 'name', a: 'form-name' }, { key: 'version' }]`, `onChange: () => setCur(0)`
 * Not a fit: ClaimPromptDialog 170 (typed "draft" vs applied filters, the R1
 * rule and date bounds — keep it); ClinicListView 304, ManualEntryView 310,
 * DemographicsView (boxes drawn but never filtering — see FilterStrip).
 */
export function useColumnFilters<T>(
  rows: readonly T[],
  columns: readonly FilterColumn<T>[],
  opts: {
    match?: FilterMatch
    /** after a box changes — typically `() => setCur(0)` */
    onChange?: (key: string, value: string) => void
    initial?: FilterValues
    /** a lifted store: [values, set(key, value)] */
    state?: readonly [FilterValues, (key: string, value: string) => void]
  } = {},
) {
  const { match = 'upper-trim', onChange, initial, state } = opts
  const [own, setOwn] = useState<FilterValues>(() => initial ?? {})
  const values = state ? state[0] : own
  const setValue = (key: string, value: string) => {
    if (state) state[1](key, value)
    else setOwn((f) => ({ ...f, [key]: value }))
    onChange?.(key, value)
  }
  const live = columns.filter((c): c is NonNullable<FilterColumn<T>> => !!c)
  const shown = rows.filter((row) => live.every((c) => {
    const typed = values[c.key] ?? ''
    if (c.test) return c.test(row, typed)
    return filterMatches(c.value ? c.value(row) : (row as Record<string, unknown>)[c.key], typed, match)
  }))
  const box = (key: string): ReactNode => {
    const c = live.find((x) => x.key === key)
    if (!c) return null
    const value = values[key] ?? ''
    if (c.box) return c.box(value, (v) => setValue(key, v))
    return (
      <PBInput
        key={key}
        w={c.w}
        style={c.style}
        value={value}
        aria-label={c.ariaLabel}
        data-tutorial-id={c.anchor ? `host.mois.field.${c.anchor}` : undefined}
        onKeyDown={c.onKeyDown}
        onChange={(e) => setValue(key, e.target.value)}
      />
    )
  }
  return {
    /** the rows every box lets through */
    shown,
    /** one cell per grid column, for `PBDataWindow filters` */
    filterRow: columns.map((c) => (c ? box(c.key) : null)),
    box,
    values,
    setValue,
    /** empty every box (a New Record that must be visible) */
    clear: () => { if (state) live.forEach((c) => state[1](c.key, '')); else setOwn({}) },
  }
}

/**
 * A white strip of filter boxes laid over a list whose grid has no filter
 * row (AdminListsView 141: Prompt List 539 `widths={[100, 272, 396]}`,
 * Selection List 591 `widths={[68, 240]}` — identical markup as is). The
 * copies never filter; pass `values`/`onChange` to make the boxes live.
 */
export function FilterStrip({ widths, values, onChange }: {
  widths: readonly (number | null)[]
  values?: readonly string[]
  onChange?: (index: number, value: string) => void
}) {
  return (
    <div className="pb-row" style={{ gap: 2, padding: '3px 3px 3px 16px', background: '#fff', flex: 'none' }}>
      {widths.map((w, i) => (w === null
        ? <span key={i} style={{ width: 0 }} />
        : (
          <PBInput
            key={i}
            w={w}
            data-tutorial-id={`host.mois.field.filter-${i + 1}`}
            {...(values ? { value: values[i] ?? '', onChange: (e) => onChange?.(i, e.target.value) } : null)}
          />
        )))}
    </div>
  )
}

/* ===========================================================================
   3. A record list and its current row — useRecordList, useRecordCursor
   ======================================================================== */

export type RowsUpdate<T> = (fn: (prev: T[]) => T[]) => void

/**
 * A list's rows, the current row, and the New / Delete / edit verbs over an
 * existing store — a `useState` setter, adminSession's `useStoredList`
 * update, `useSessionState`'s setter. `useRecordList` owns the store.
 *
 * - `add(row)`: `update((r) => [...r, row]); setCur(rows.length)`
 * - `prepend(row)`: `update((r) => [row, ...r]); setCur(0)`
 * - `remove(i = cur)`: `update((r) => r.filter((_, j) => j !== i))`, then
 *   `setCur(0)` (`afterRemove: 'first'`, the default) or
 *   `setCur(Math.max(0, cur - 1))` (`'previous'`)
 * - `edit(i, patch | fn)`: one row replaced
 * `row` is `rows[cur]` as the copies read it; `at`/`current` are clamped
 * into the list for a grid's `current`.
 *
 * MIGRATION (extra statements a copy runs — `setSaved(false)`,
 * `setDirty(true)` — stay beside the call):
 * - `afterRemove: 'first'`: AdminListsView 348, 383, 480, 529, 582, 803;
 *   ClinicListView 188; ClinicEditorWindows 1532; ConfigurationViews 130,
 *   174, 273; InterfaceExchangeViews 359; EfaxAccountsView 54;
 *   UserAgreementWindows 154; UserManagementView 369; DemographicsView 826;
 *   DocumentCenterViews 119; OrgRoleWindows 720; ProviderTabGrids 77, 121,
 *   165, 209 (`useRecordCursor(all, update)`); AttachmentUtilityViews 181;
 *   AdverseEventWindows 365, 372 (two lists: two hooks); CodesetManagement-
 *   Views 388; UnmatchedResultViews 238 (`remove(index)`)
 * - `afterRemove: 'previous'`: TaskSetTemplateWindow 87, CarePlanTemplatesView
 *   234, CodesetManagementViews 652, AdminListsView 681
 * - New Record `setRows((r) => [...r, blank]); setCur(rows.length)` → `add(blank)`:
 *   AdminListsView 347, 524, 802; ClinicListView 187; ClinicEditorWindows 1531
 * Not a fit: AdverseEventWindows 566/584 (`save(list)` writes through a
 * non-functional store — `useRecordCursor(list, (fn) => save(fn(list)))`
 * works but reads no better), ExternalServiceWindows 100/177 (removal by a
 * filtered row's `index` — `remove(current.index)` fits, with `clear()` on
 * the filters for New).
 */
export function useRecordCursor<T>(rows: T[], update: RowsUpdate<T>, opts: {
  initialCur?: number
  afterRemove?: 'first' | 'previous'
} = {}) {
  const [cur, setCur] = useState(opts.initialCur ?? 0)
  const at = Math.min(cur, Math.max(0, rows.length - 1))
  return {
    rows,
    setRows: update,
    cur,
    setCur,
    /** `cur` clamped into the list */
    at,
    /** `rows[cur]`, as the copies read it */
    row: rows[cur] as T | undefined,
    /** `rows[at]` */
    current: rows[at] as T | undefined,
    add: (row: T) => { update((r) => [...r, row]); setCur(rows.length) },
    prepend: (row: T) => { update((r) => [row, ...r]); setCur(0) },
    remove: (i: number = cur) => {
      update((r) => r.filter((_, j) => j !== i))
      setCur(opts.afterRemove === 'previous' ? Math.max(0, cur - 1) : 0)
    },
    edit: (i: number, patch: Partial<T> | ((row: T) => T)) =>
      update((r) => r.map((x, j) => (j !== i ? x : typeof patch === 'function' ? patch(x) : { ...x, ...patch }))),
  }
}

/** `useRecordCursor` over its own `useState` list. */
export function useRecordList<T>(initial: T[] | (() => T[]), opts?: Parameters<typeof useRecordCursor<T>>[2]) {
  const [rows, setRows] = useState<T[]>(initial)
  return useRecordCursor(rows, setRows, opts)
}

/* ===========================================================================
   4. The folders' draft contract — useDraftRecords
   ======================================================================== */

export type DraftCommand = 'New Record' | 'Delete Record' | 'Save' | 'Undo' | 'Refresh'
export type DraftCommit<R> = {
  /** new rows, top first */
  drafts: R[]
  /** edited committed rows, by key */
  edits: Record<string, R>
  /** keys of the committed rows deleted */
  removed: string[]
}

const DRAFT_COMMANDS: readonly DraftCommand[] = ['New Record', 'Delete Record', 'Save', 'Undo', 'Refresh']

/**
 * The PowerBuilder DataWindow draft contract the chart folders share (art.
 * 304655; 303455, 303144, 303210): New Record puts a blank row at the top
 * and makes it current; Delete Record takes the current row out; edits to
 * committed rows are pending; all of it is the folder's draft until Save
 * files it or Undo / Refresh throws it away.
 *
 * The hook keeps the pending state — `drafts` (new rows), `edits` (by key),
 * `removed` (keys) and the `status` the folder reports — over the caller's
 * committed `base`, and hands back the list the grid draws:
 * `[...drafts, ...base minus removed, with edits applied]`. What is filed,
 * where, and what is reported stays the caller's: `commit` does the filing
 * on Save and may return the status; the caller's `useScreenReport` reads
 * `dirty` / `status` / `list.length` as it likes.
 *
 * Verbs: `newRecord()` (blank on top, `setCur(0)`, status ''), `deleteRecord(target
 * = record)` (a draft is dropped, a committed row's key is pended; then
 * `setCur(max(0, at - 1))` unless `deleteMoves: 'none'`; status ''),
 * `edit(patch)` (the current row), `save()`, `undo()`, `refresh()`, and
 * `commands(cmds, extra)`, which rewires the command row's buttons named in
 * `wire` — and any label in `extra` — the way each copy's `commands` does.
 * The default Save status is carePlanFolder's: 'deleted' when only
 * deletions were pending, 'saved' when anything was, '' otherwise.
 *
 * MIGRATION — how each copy is re-expressed:
 * - carePlanFolder.ts `useCarePlanFolder`: `base` = the merged folder records,
 *   `keyOf: (r) => r[idKey] ?? ''`, `blank` = its new-record object, `commit`
 *   = add the draft, save each edit not removed, delete each removed id
 *   (return nothing), `wire` = all five. `edit(field, value, more)` →
 *   `edit({ [field]: value, ...more })`; `isNew`, `cur: at`, `record` as now.
 * - reportRecords.tsx `useReportRecords`: `base` = the wrapped rows
 *   (`session.added`, stored, practice, export) minus `session.removed`,
 *   `keyOf: (x) => x.row.__key!`, `blank: () => ({ row: blank(), record: undefined })`,
 *   `singleRemove: true` (its one `pendingRemove`), `clamp: false`
 *   (`list[cur]`), `deleteMoves: 'none'`, `wire: ['New Record', 'Delete Record',
 *   'Save', 'Undo']`, `commit` = the two `setSession` calls returning
 *   `removed.length && !drafts.length ? 'deleted' : 'saved'`. Its New Record
 *   window and No Known / Quick Entry / Elevate To Risk go in `extra`;
 *   `mark`/`file` use `setStatus`/`setCur`. One difference: deleting the
 *   draft here also clears `status` (the copy leaves it — only visible if a
 *   Quick Entry `mark('saved')` landed while a blank row was pending).
 * - reportRecordEdits.tsx `useReportRecordEdits`: `base` = `rows.map((row, i) =>
 *   ({ row, record: records[i], src: i }))`, `keyOf: (x) => String(x.src)`,
 *   `blank: () => ({ row: {}, record: undefined, src: -1 })`, `multiNew: true`
 *   (its `added` counter), `active: enabled`, `disableDelete: false`,
 *   `wire: ['New Record', 'Delete Record']`; report `draft: drafts.length > 0`.
 * - PreferenceWindows.tsx `usePreferenceFolder` + `preferenceCommands`: no
 *   `blank` (New Record opens New Preference: `extra`), `clamp: false`,
 *   `deleteMoves: 'none'`, `keyOf: (r) => r.id_chart_preference ?? ''`,
 *   `base` = merged and sorted records; `commit` closes over the Detail-tab
 *   patch drafts ClinicalReportView keeps, files them and the removals and
 *   returns its status; `extra` wraps Save / Undo / Refresh with
 *   `clearDrafts()` / `undoDraft()` and adds Quick Entry. `edits` stays unused
 *   (its patches are partial and live in ClinicalReportView).
 * ClinicalReportView stacks reportRecords over reportRecordEdits by switching
 * the second off (`active: false`) where the first is active — unchanged.
 */
export function useDraftRecords<R extends object>({
  base, keyOf, cur, setCur, active = true, blank, multiNew = false, singleRemove = false,
  clamp = true, deleteMoves = 'previous', commit, wire = DRAFT_COMMANDS, disableDelete = true,
}: {
  /** the committed rows, as filed (merged, filtered and sorted by the caller) */
  base: R[]
  /** a committed row's identity — what `removed` and `edits` are keyed by */
  keyOf: (row: R) => string
  cur: number
  setCur: (i: number) => void
  /** false: `list` is `base` and `commands` passes the row through */
  active?: boolean
  /** New Record's row; omitted, the caller wires New Record through `extra` */
  blank?: () => R
  /** New Record stacks another blank (reportRecordEdits); default replaces it */
  multiNew?: boolean
  /** one pending deletion at a time — a second replaces the first (reportRecords) */
  singleRemove?: boolean
  /** Delete and `record` address `cur` clamped into the list (default) or `list[cur]` */
  clamp?: boolean
  /** after Delete: the row above (default) or leave `cur` */
  deleteMoves?: 'previous' | 'none'
  /** Save's filing; return the status to report, or nothing for the default */
  commit?: (pending: DraftCommit<R>) => string | void
  /** the command-row labels `commands` rewires */
  wire?: readonly DraftCommand[]
  /** grey Delete Record with no current row */
  disableDelete?: boolean
}) {
  const [drafts, setDrafts] = useState<R[]>([])
  const [edits, setEdits] = useState<Record<string, R>>({})
  const [removed, setRemoved] = useState<string[]>([])
  const [status, setStatus] = useState('')

  const list = !active ? base : [
    ...drafts,
    ...base.filter((r) => !removed.includes(keyOf(r))).map((r) => edits[keyOf(r)] ?? r),
  ]
  const at = clamp ? Math.min(cur, Math.max(0, list.length - 1)) : cur
  const record = list[at] as R | undefined
  const isNew = !!record && drafts.includes(record)
  const dirty = drafts.length > 0 || removed.length > 0 || Object.keys(edits).length > 0

  const clear = () => { setDrafts([]); setEdits({}); setRemoved([]) }
  const act = {
    newRecord: () => {
      if (!blank) return
      const row = blank()
      setDrafts((d) => (multiNew ? [row, ...d] : [row]))
      setCur(0); setStatus('')
    },
    deleteRecord: (target: R | undefined = record) => {
      if (!target) return
      if (drafts.includes(target)) setDrafts((d) => d.filter((x) => x !== target))
      else {
        const key = keyOf(target)
        setRemoved((r) => (singleRemove ? [key] : [...r, key]))
      }
      if (deleteMoves === 'previous') setCur(Math.max(0, at - 1))
      setStatus('')
    },
    save: () => {
      const said = commit?.({ drafts, edits, removed })
      const edited = Object.keys(edits).length > 0
      setStatus(typeof said === 'string' ? said : removed.length && !drafts.length && !edited ? 'deleted' : dirty ? 'saved' : '')
      clear()
    },
    undo: () => { clear(); setStatus('') },
    refresh: () => { clear(); setStatus('') },
  }

  /** change fields of the current row: the draft itself, or a pending edit */
  const edit = (patch: Partial<R>) => {
    if (!record) return
    const next = { ...record, ...patch } as R
    if (isNew) setDrafts((d) => d.map((x) => (x === record ? next : x)))
    else setEdits((e) => ({ ...e, [keyOf(record)]: next }))
    setStatus('')
  }

  const commands = (
    cmds: PBCommand[],
    extra: Partial<Record<string, (c: NonNullable<PBCommand>) => PBCommand>> = {},
  ): PBCommand[] => (!active ? cmds : cmds.map((c) => {
    if (!c) return c
    const own = extra[c.label]
    if (own) return own(c)
    if (!wire.includes(c.label as DraftCommand)) return c
    switch (c.label as DraftCommand) {
      case 'New Record': return blank ? { ...c, onClick: act.newRecord } : c
      case 'Delete Record': return { ...c, ...(disableDelete ? { disabled: !record } : null), onClick: () => act.deleteRecord() }
      case 'Save': return { ...c, onClick: act.save }
      case 'Undo': return { ...c, onClick: act.undo }
      case 'Refresh': return { ...c, onClick: act.refresh }
    }
  }))

  return {
    list, at, record, isNew, dirty,
    status, setStatus,
    drafts, edits, removed,
    edit, commands,
    ...act,
  }
}
