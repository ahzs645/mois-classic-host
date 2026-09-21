import type { CSSProperties, ReactNode } from 'react'
import { Fragment, useState } from 'react'
import { pbSlug, usePBInstrumentation } from '../instrumentation'

const cx = (...v: (string | false | undefined | null)[]) => v.filter(Boolean).join(' ')

/* The DataWindow's current-row indicator. A 5x8 chevron, traced off the
   pixels in reference/advanced-lookup-service.png, drawn rather than typed so
   it keeps its weight whichever text mode the kit is in. */
const PB_ROW_ARROW = (
  <svg className="pb-dw__arrow" width="5" height="8" viewBox="0 0 5 8" aria-hidden="true">
    <path d="M1 1 L3.9 4 L1 7" fill="none" stroke="currentColor" strokeWidth="1.4" />
  </svg>
)

/* ===========================================================================
   PBDataWindow — the grid.
   ======================================================================== */
export type PBColumn<T> = {
  key: string
  header: ReactNode
  /** Stable field-audit occurrence ID, never a value from the record. */
  auditId?: string
  width?: number | string
  align?: 'left' | 'center' | 'right'
  /** caption alignment, when it differs from the cells' */
  headAlign?: 'left' | 'center' | 'right'
  italic?: boolean
  /** narrow "…" lookup column */
  dots?: boolean
  render?: (row: T, index: number) => ReactNode
}

export type PBRowStatus = 'normal' | 'alert' | 'ok' | 'highlight' | 'flag'

export function PBDataWindow<T extends Record<string, any>>({
  columns,
  rows,
  current,
  onCurrentChange,
  onActivate,
  gutter = true,
  zebra = true,
  rules = true,
  wrap,
  flush,
  hscroll,
  rowStatus,
  rowFill,
  rowClassName,
  rowIcon,
  rowTutorialId,
  groupTutorialId,
  groupBy,
  groupLabel,
  groupAccent,
  groups,
  collapsed,
  onCollapsedChange,
  filters,
  head = 'blue',
  empty,
  style,
}: {
  columns: PBColumn<T>[]
  rows: T[]
  current?: number
  onCurrentChange?: (i: number) => void
  /** double-click or Enter on a row — PowerBuilder's row "activate" */
  onActivate?: (row: T, index: number) => void
  /** the narrow left column carrying the current-row arrow */
  gutter?: boolean
  zebra?: boolean
  /**
   * The hairlines between cells: the soft #f1f1f1 rule a DataWindow draws
   * (the default), `false` for none (Patient Summary), or `"white"` for the
   * white header separators the Advanced Lookup Service uses.
   */
  rules?: boolean | 'white'
  flush?: boolean
  /**
   * Let the grid pan sideways. A DataWindow clips instead, so this is off
   * by default; only a grid MOIS really does let the user scroll asks.
   */
  hscroll?: boolean
  rowStatus?: (row: T, index: number) => PBRowStatus
  /**
   * The row's own background, which a DataWindow computes per row rather than
   * taking from the zebra — MOIS paints a day-book row in its visit code's
   * colour. The current row still wins, the way the capture shows.
   */
  rowFill?: (row: T, index: number) => string | undefined
  /** extra class on the row, for the ink styles (`pb-dw--struck`, `pb-dw--arrived`) */
  rowClassName?: (row: T, index: number) => string | undefined
  /** glyph shown in the gutter when the row is not the current one */
  rowIcon?: (row: T, index: number) => ReactNode
  /**
   * Tutorial anchor for one row, so a lesson can ring the line it is talking
   * about — `(row) => row.name === 'Encounter Window Limit' ? 'host.mois.row.encounter-window-limit' : undefined`.
   */
  rowTutorialId?: (row: T, index: number) => string | undefined
  /** Tutorial anchor for a group band, so a lesson can ring a whole folder. */
  groupTutorialId?: (group: string) => string | undefined
  /** band rows under collapsible group headers; rows must arrive sorted */
  groupBy?: (row: T) => string
  /** what the band prints — MOIS captions its bands `SECTION  [n]` */
  groupLabel?: (group: string, rows: T[]) => ReactNode
  /** the colour a band's white-to-colour gradient ends on */
  groupAccent?: (group: string) => string | undefined
  /**
   * Every band the window paints, in painting order. Without it a band is
   * drawn by the first row that belongs to it, so a section the grid has no
   * rows for disappears — and MOIS paints that band and its count all the
   * same (a collapsed Patient Summary section is only ever a band).
   */
  groups?: string[]
  /** let a cell run to a second line and grow its row, the way Patient
      Summary's Detail column does; every other grid clips to one line */
  wrap?: boolean
  /** collapsed group keys; pass with onCollapsedChange for Expand All / Collapse All */
  collapsed?: Set<string>
  onCollapsedChange?: (next: Set<string>) => void
  /** a filter control per column, above the headers, the way a lookup DataWindow filters */
  filters?: (ReactNode | null)[]
  /** header band: the DataWindow blue, the grey the Patient Summary uses, or
      `false` for a grid that draws no header row at all (the Report List) */
  head?: 'blue' | 'grey' | false
  empty?: ReactNode
  style?: CSSProperties
}) {
  const [internal, setInternal] = useState(0)
  const [ownCollapsed, setOwnCollapsed] = useState<Set<string>>(new Set())
  const cur = current ?? internal
  const setCur = (i: number) => { setInternal(i); onCurrentChange?.(i) }
  const shut = collapsed ?? ownCollapsed

  const span = columns.length + (gutter ? 1 : 0)

  /* Bands with no rows behind them. They are emitted just before the next
     band that does have rows, so the painted order is `groups`, not the
     order the rows happen to arrive in. */
  const emptyBands = (() => {
    const before = new Map<string, string[]>()
    const trailing: string[] = []
    if (groups && groupBy) {
      const present = new Set(rows.map((r) => groupBy(r)))
      let waiting: string[] = []
      for (const g of groups) {
        if (present.has(g)) {
          if (waiting.length) { before.set(g, waiting); waiting = [] }
        } else {
          waiting.push(g)
        }
      }
      trailing.push(...waiting)
    }
    return { before, trailing }
  })()

  /** One band: the expander box, the caption, and the band's own colour. */
  const renderBand = (g: string) => {
    const accent = groupAccent?.(g)
    const box = (
      <button
        className="pb-expander pb-dw__groupbox"
        data-state={shut.has(g) ? 'shut' : 'open'}
        aria-expanded={!shut.has(g)}
        aria-label={g}
        onClick={() => toggleGroup(g)}
      />
    )
    const label = groupLabel ? groupLabel(g, rows.filter((row) => groupBy!(row) === g)) : g
    return (
      <tr
        key={`band-${g}`}
        className={cx('pb-dw__group', accent && 'pb-dw__group--accent')}
        style={accent ? { ['--pb-dw-group-accent' as string]: accent } : undefined}
        data-tutorial-id={groupTutorialId?.(g)}
      >
        {gutter ? (
          <>
            <td className="pb-dw__gutter">{box}</td>
            <td colSpan={span - 1}>{label}</td>
          </>
        ) : (
          /* no gutter: MOIS draws the box inside the coloured band, so the
             colour runs the full width */
          <td colSpan={span}>
            <span className="pb-dw__groupcell">{box}{label}</span>
          </td>
        )}
      </tr>
    )
  }
  const toggleGroup = (g: string) => {
    const next = new Set(shut)
    next.has(g) ? next.delete(g) : next.add(g)
    if (onCollapsedChange) onCollapsedChange(next)
    else setOwnCollapsed(next)
  }

  return (
    <div
      className={cx(
        'pb-dw',
        flush && 'pb-dw--flush',
        wrap && 'pb-dw--wrap',
        !zebra && 'pb-dw--plain',
        rules === false && 'pb-dw--norules',
        rules === 'white' && 'pb-dw--rules-white',
        head === 'grey' && 'pb-dw--head-grey',
        hscroll && 'pb-dw--hscroll',
      )}
      style={style}
    >
      <div className="pb-dw__scroll">
        <table className="pb-dw__table">
          <colgroup>
            {gutter && <col style={{ width: 13 }} />}
            {columns.map((c) => <col key={c.key} style={{ width: c.width ?? (c.dots ? 16 : undefined) }} />)}
          </colgroup>
          {head !== false && (
            <thead>
            {filters && (
              <tr className="pb-dw__filters">
                {gutter && <th className="pb-dw__gutter" />}
                {columns.map((c, i) => <th key={c.key}>{filters[i]}</th>)}
              </tr>
            )}
            <tr>
              {gutter && <th className="pb-dw__gutter" />}
              {columns.map((c) => (
                <th
                  key={c.key}
                  data-mois-audit-id={c.auditId}
                  className={cx(
                    (c.headAlign ?? c.align) === 'center' && 'pb-dw__c--center',
                    (c.headAlign ?? c.align) === 'right' && 'pb-dw__c--num',
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          )}
          <tbody>
            {rows.length === 0 && !groups?.length && (
              <tr>
                <td colSpan={columns.length + (gutter ? 1 : 0)} style={{ height: 'auto', borderRight: 0 }}>
                  <div className="pb-dw__empty">{empty ?? 'No rows retrieved.'}</div>
                </td>
              </tr>
            )}
            {rows.map((r, i) => {
              const st = rowStatus?.(r, i) ?? 'normal'
              const g = groupBy?.(r)
              const opensGroup = g !== undefined && (i === 0 || groupBy!(rows[i - 1]) !== g)
              const hidden = g !== undefined && shut.has(g)
              return (
                <Fragment key={i}>
                {opensGroup && (
                  <>
                    {(emptyBands.before.get(g!) ?? []).map(renderBand)}
                    {renderBand(g!)}
                  </>
                )}
                {!hidden && (
                <tr
                  className={cx(
                    i === cur && 'is-current',
                    st === 'alert' && 'pb-dw--alert',
                    st === 'ok' && 'pb-dw--ok',
                    st === 'highlight' && 'pb-dw--highlight',
                    st === 'flag' && 'pb-dw--flag',
                    rowClassName?.(r, i),
                  )}
                  style={(() => {
                    const fill = rowFill?.(r, i)
                    return fill
                      ? { ['--pb-dw-row' as string]: fill, ['--pb-dw-row-alt' as string]: fill }
                      : undefined
                  })()}
                  data-tutorial-id={rowTutorialId?.(r, i)}
                  onMouseDown={() => setCur(i)}
                  onDoubleClick={() => onActivate?.(r, i)}
                  tabIndex={onActivate ? 0 : undefined}
                  onKeyDown={(e) => { if (e.key === 'Enter') onActivate?.(r, i) }}
                >
                  {gutter && (
                    <td className="pb-dw__gutter">
                      {i === cur ? PB_ROW_ARROW : rowIcon?.(r, i) ?? ''}
                    </td>
                  )}
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      data-mois-audit-id={c.auditId}
                      className={cx(
                        c.align === 'center' && 'pb-dw__c--center',
                        c.align === 'right' && 'pb-dw__c--num',
                        c.italic && 'pb-dw__c--italic',
                        c.dots && 'pb-dw__c--dots',
                      )}
                    >
                      {c.render ? c.render(r, i) : c.dots ? '…' : r[c.key]}
                    </td>
                  ))}
                </tr>
                )}
                </Fragment>
              )
            })}
            {emptyBands.trailing.map(renderBand)}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ===========================================================================
   PBTabs
   ======================================================================== */
export function PBTabs({
  tabs, active, onChange, compact, justified, face, boldSelected = true, children,
}: {
  tabs: string[]
  active: string
  onChange: (t: string) => void
  /** size every tab to its caption instead of PB's fixed 96px (chart windows) */
  compact?: boolean
  /** stretch the tabs to fill the strip (Notification, Group Visit List) */
  justified?: boolean
  /** render the page on the grey dialog face instead of white */
  face?: boolean
  /** PB's `boldselectedtext`. On everywhere in the source material but Demographics. */
  boldSelected?: boolean
  children: ReactNode
}) {
  const host = usePBInstrumentation()
  return (
    <div className="pb-tabs">
      <div
        className={cx(
          'pb-tabs__strip',
          compact && 'pb-tabs__strip--compact',
          justified && 'pb-tabs__strip--justified',
          !boldSelected && 'pb-tabs__strip--plain',
        )}
      >
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            className={cx('pb-tabs__tab', t === active && 'is-active')}
            data-tutorial-id={host?.anchor('tab', pbSlug(t))}
            onClick={() => {
              host?.report('selectTab', { tab: pbSlug(t) })
              onChange(t)
            }}
          >
            {t}
          </button>
        ))}
      </div>
      <div className={cx('pb-tabs__page', face && 'pb-tabs__page--face')}>{children}</div>
    </div>
  )
}

/* ===========================================================================
   PBTree — Win32 TreeView.

   Built on the `ul.tree-view` pattern from XP.css / 98.css: nested <ul>s
   carry the dotted spine, <details>/<summary> carries the disclosure, and
   CSS draws every branch line. No per-level indent elements.
   ======================================================================== */
export type PBTreeNode = {
  id: string
  label: string
  icon?: ReactNode
  children?: PBTreeNode[]
}

export function PBTree({
  nodes, selected, onSelect, expanded, onToggle, getTutorialId, rootButtons = false,
}: {
  nodes: PBTreeNode[]
  selected?: string
  onSelect?: (id: string) => void
  expanded: Set<string>
  onToggle: (id: string) => void
  /** tutorial anchor for a node's row, e.g. `(id) => \`host.mois.tree.${id}\`` */
  getTutorialId?: (id: string) => string
  /**
   * Draw the +/- box on root items too. The captures disagree about this and
   * the disagreement is per tree, not per version: the Patient Chart tree
   * (`PC_Demographics_image1.png`) and the Administration tree
   * (`encounter_limit.PNG`) give their root folders no button, while the
   * Workspace tree (`workspace_summary.PNG`) gives Basket, Task List and
   * Message Board one — and indents their whole branch to make room.
   */
  rootButtons?: boolean
}) {
  /* MOIS's trees run without TVS_LINESATROOT — measured in
     `demographics-full.png` and `scheduler-provider-daybook-left.png`, where
     no root item carries a +/- box or a spine, while every level below does.
     A root still collapses; in a Win32 tree that is a double-click. */
  const row = (node: PBTreeNode, depth: number, hasKids: boolean, open: boolean) => (
    <>
      {depth === 0 && (!rootButtons || !hasKids) ? null : hasKids ? (
        <span
          className="pb-expander pb-tree__toggle"
          data-state={open ? 'open' : 'shut'}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(node.id) }}
        />
      ) : (
        <span className="pb-tree__toggle pb-tree__toggle--spacer" />
      )}
      <span className="pb-tree__icon">{node.icon}</span>
      <span className="pb-tree__label">{node.label}</span>
    </>
  )

  const render = (node: PBTreeNode, depth: number): ReactNode => {
    const hasKids = !!node.children?.length
    const open = expanded.has(node.id)
    const cls = cx('pb-tree__row', selected === node.id && 'is-selected')

    if (!hasKids) {
      return (
        <li key={node.id}>
          <div className={cls} data-tutorial-id={getTutorialId?.(node.id)} onMouseDown={() => onSelect?.(node.id)}>
            {row(node, depth, false, false)}
          </div>
        </li>
      )
    }
    return (
      <li key={node.id}>
        <details open={open}>
          {/* a Win32 tree selects on mouse-down, leaf or not, so both row
              shapes must agree; preventDefault stops <summary>'s native
              toggle so only the +/- box — or a double-click — expands */}
          <summary
            className={cls}
            data-tutorial-id={getTutorialId?.(node.id)}
            onMouseDown={(e) => { e.preventDefault(); onSelect?.(node.id) }}
            onClick={(e) => e.preventDefault()}
            onDoubleClick={() => onToggle(node.id)}
          >
            {row(node, depth, true, open)}
          </summary>
          <ul>{node.children!.map((child) => render(child, depth + 1))}</ul>
        </details>
      </li>
    )
  }

  return (
    <ul className={cx('pb-tree', rootButtons && 'pb-tree--rootbuttons')}>
      {nodes.map((node) => render(node, 0))}
    </ul>
  )
}

/* ===========================================================================
   PBModuleBar — the Outlook-style module list under the tree
   ======================================================================== */
export function PBModuleBar({
  modules, active, onSelect, getTutorialId,
}: {
  modules: { id: string; label: string; icon?: ReactNode }[]
  active: string
  onSelect: (id: string) => void
  /** tutorial anchor for a module button, e.g. `(id) => \`host.mois.module.${id}\`` */
  getTutorialId?: (id: string) => string
}) {
  const host = usePBInstrumentation()
  return (
    /* the manual's "Main Menu": the list of modules under the tree */
    <div className="pb-modulebar" data-tutorial-id={host?.anchor('modulebar')}>
      <div className="pb-modulebar__grip" />
      {modules.map((m) => (
        <button
          key={m.id}
          type="button"
          className={cx('pb-modulebar__btn', m.id === active && 'is-active')}
          data-tutorial-id={getTutorialId?.(m.id)}
          onClick={() => onSelect(m.id)}
        >
          <span className="pb-modulebar__icon">{m.icon}</span>
          {m.label}
        </button>
      ))}
    </div>
  )
}
