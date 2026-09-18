import type { CSSProperties, ReactNode } from 'react'
import { Fragment, useState } from 'react'
import { pbSlug, usePBInstrumentation } from '../instrumentation'

const cx = (...v: (string | false | undefined | null)[]) => v.filter(Boolean).join(' ')

/* ===========================================================================
   PBDataWindow — the grid.
   ======================================================================== */
export type PBColumn<T> = {
  key: string
  header: ReactNode
  width?: number | string
  align?: 'left' | 'center' | 'right'
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
  flush,
  rowStatus,
  rowIcon,
  groupBy,
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
  flush?: boolean
  rowStatus?: (row: T, index: number) => PBRowStatus
  /** glyph shown in the gutter when the row is not the current one */
  rowIcon?: (row: T, index: number) => ReactNode
  /** band rows under collapsible group headers; rows must arrive sorted */
  groupBy?: (row: T) => string
  empty?: ReactNode
  style?: CSSProperties
}) {
  const [internal, setInternal] = useState(0)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const cur = current ?? internal
  const setCur = (i: number) => { setInternal(i); onCurrentChange?.(i) }

  const span = columns.length + (gutter ? 1 : 0)
  const toggleGroup = (g: string) => {
    const next = new Set(collapsed)
    next.has(g) ? next.delete(g) : next.add(g)
    setCollapsed(next)
  }

  return (
    <div className={cx('pb-dw', flush && 'pb-dw--flush', !zebra && 'pb-dw--plain')} style={style}>
      <div className="pb-dw__scroll">
        <table className="pb-dw__table">
          <colgroup>
            {gutter && <col style={{ width: 13 }} />}
            {columns.map((c) => <col key={c.key} style={{ width: c.dots ? 16 : c.width }} />)}
          </colgroup>
          <thead>
            <tr>
              {gutter && <th className="pb-dw__gutter" />}
              {columns.map((c) => <th key={c.key}>{c.header}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
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
              const hidden = g !== undefined && collapsed.has(g)
              return (
                <Fragment key={i}>
                {opensGroup && (
                  <tr className="pb-dw__group">
                    <td className="pb-dw__gutter">
                      <button className="pb-dw__groupbox" onClick={() => toggleGroup(g!)}>
                        {collapsed.has(g!) ? '+' : '\u2212'}
                      </button>
                    </td>
                    <td colSpan={span - 1}>{g}</td>
                  </tr>
                )}
                {!hidden && (
                <tr
                  className={cx(
                    i === cur && 'is-current',
                    st === 'alert' && 'pb-dw--alert',
                    st === 'ok' && 'pb-dw--ok',
                    st === 'highlight' && 'pb-dw--highlight',
                    st === 'flag' && 'pb-dw--flag',
                  )}
                  onMouseDown={() => setCur(i)}
                  onDoubleClick={() => onActivate?.(r, i)}
                  tabIndex={onActivate ? 0 : undefined}
                  onKeyDown={(e) => { if (e.key === 'Enter') onActivate?.(r, i) }}
                >
                  {gutter && (
                    <td className="pb-dw__gutter">
                      {i === cur ? '›' : rowIcon?.(r, i) ?? ''}
                    </td>
                  )}
                  {columns.map((c) => (
                    <td
                      key={c.key}
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
  tabs, active, onChange, compact, justified, face, children,
}: {
  tabs: string[]
  active: string
  onChange: (t: string) => void
  compact?: boolean
  /** stretch the tabs to fill the strip (Notification, Group Visit List) */
  justified?: boolean
  /** render the page on the grey dialog face instead of white */
  face?: boolean
  children: ReactNode
}) {
  const host = usePBInstrumentation()
  return (
    <div className="pb-tabs">
      <div className={cx('pb-tabs__strip', compact && 'pb-tabs__strip--compact', justified && 'pb-tabs__strip--justified')}>
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
  nodes, selected, onSelect, expanded, onToggle, getTutorialId,
}: {
  nodes: PBTreeNode[]
  selected?: string
  onSelect?: (id: string) => void
  expanded: Set<string>
  onToggle: (id: string) => void
  /** tutorial anchor for a node's row, e.g. `(id) => \`host.mois.tree.${id}\`` */
  getTutorialId?: (id: string) => string
}) {
  const row = (node: PBTreeNode, hasKids: boolean, open: boolean) => (
    <>
      {hasKids ? (
        <span
          className="pb-tree__toggle"
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(node.id) }}
        >
          {open ? '\u2212' : '+'}
        </span>
      ) : (
        <span className="pb-tree__toggle pb-tree__toggle--spacer" />
      )}
      <span className="pb-tree__icon">{node.icon}</span>
      <span className="pb-tree__label">{node.label}</span>
    </>
  )

  const render = (node: PBTreeNode): ReactNode => {
    const hasKids = !!node.children?.length
    const open = expanded.has(node.id)
    const cls = cx('pb-tree__row', selected === node.id && 'is-selected')

    if (!hasKids) {
      return (
        <li key={node.id}>
          <div className={cls} data-tutorial-id={getTutorialId?.(node.id)} onMouseDown={() => onSelect?.(node.id)}>
            {row(node, false, false)}
          </div>
        </li>
      )
    }
    return (
      <li key={node.id}>
        <details open={open}>
          {/* a Win32 tree selects on mouse-down, leaf or not, so both row
              shapes must agree; preventDefault stops <summary>'s native
              toggle so only the +/- box expands */}
          <summary
            className={cls}
            data-tutorial-id={getTutorialId?.(node.id)}
            onMouseDown={(e) => { e.preventDefault(); onSelect?.(node.id) }}
            onClick={(e) => e.preventDefault()}
            onDoubleClick={() => onToggle(node.id)}
          >
            {row(node, true, open)}
          </summary>
          <ul>{node.children!.map(render)}</ul>
        </details>
      </li>
    )
  }

  return <ul className="pb-tree">{nodes.map(render)}</ul>
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
  return (
    <div className="pb-modulebar">
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
