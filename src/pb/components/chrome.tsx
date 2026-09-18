import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { pbSlug, usePBInstrumentation } from '../instrumentation'
import {
  GlyphClose, GlyphMaximize, GlyphMinimize, GlyphRestore, IconMoisApp,
} from '../icons'

const cx = (...v: (string | false | undefined | null)[]) => v.filter(Boolean).join(' ')

/** The eight places a window frame can be dragged from. */
export type PBResizeEdge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

const RESIZE_EDGES: PBResizeEdge[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']

/* --- PBWindow ------------------------------------------------------------ */
export function PBWindow({
  title, sub, icon, child, onClose, controls = true, style, className, children,
  maximized, onMinimize, onMaximize, onMovePointerDown, onResizePointerDown,
}: {
  title: ReactNode
  sub?: ReactNode
  icon?: ReactNode
  /** render as an MDI child (lighter frame) */
  child?: boolean
  onClose?: () => void
  /** false hides minimise/maximise, leaving only the close box */
  controls?: boolean
  style?: CSSProperties
  className?: string
  children: ReactNode
  /** draws the restore glyph in place of maximise, the way Windows does */
  maximized?: boolean
  onMinimize?: () => void
  onMaximize?: () => void
  /** drag the title bar to move the window */
  onMovePointerDown?: (event: ReactPointerEvent<HTMLElement>) => void
  /** supplying this draws the eight resize grips around the frame */
  onResizePointerDown?: (edge: PBResizeEdge, event: ReactPointerEvent<HTMLElement>) => void
}) {
  return (
    <div className={cx('pb-window', child && 'pb-window--child', className)} style={style}>
      <div
        className="pb-titlebar"
        onPointerDown={onMovePointerDown}
        /* double-clicking the title bar maximises and restores */
        onDoubleClick={onMaximize}
      >
        <span className="pb-titlebar__icon">{icon ?? <IconMoisApp />}</span>
        <span className="pb-titlebar__text">{title}</span>
        {sub && <span className="pb-titlebar__sub">{sub}</span>}
        <span className="pb-titlebar__spacer" />
        <span className="pb-titlebar__buttons">
          {controls && (
            <>
              <button className="pb-titlebar__btn" title="Minimize" onClick={onMinimize}>
                <GlyphMinimize />
              </button>
              <button
                className="pb-titlebar__btn"
                title={maximized ? 'Restore Down' : 'Maximize'}
                onClick={onMaximize}
              >
                {maximized ? <GlyphRestore /> : <GlyphMaximize />}
              </button>
            </>
          )}
          <button className="pb-titlebar__btn pb-titlebar__btn--close" title="Close" onClick={onClose}>
            <GlyphClose />
          </button>
        </span>
      </div>
      {children}
      {onResizePointerDown && RESIZE_EDGES.map((edge) => (
        <div
          key={edge}
          className={`pb-window__grip pb-window__grip--${edge}`}
          onPointerDown={(event) => onResizePointerDown(edge, event)}
        />
      ))}
    </div>
  )
}

/* --- PBMenuBar -----------------------------------------------------------
   Menus open on click and track the pointer across the bar once open, the
   way a real Win32 menu does.                                              */
export type PBMenuItem = {
  label?: string
  key?: string
  disabled?: boolean
  sep?: boolean
  onSelect?: () => void
  /** a fly-out submenu — Views ▸ Care Plan ▸ Goals */
  menu?: PBMenuItem[]
}

export function PBMenuBar({ items }: { items: { label: string; menu?: PBMenuItem[] }[] }) {
  const [open, setOpen] = useState<number | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const host = usePBInstrumentation()

  useEffect(() => {
    if (open === null) return
    const away = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(null)
    }
    document.addEventListener('mousedown', away)
    return () => document.removeEventListener('mousedown', away)
  }, [open])

  return (
    <div className="pb-menubar" ref={ref} style={{ position: 'relative' }}>
      {items.map((it, i) => (
        <div key={it.label} style={{ position: 'relative', display: 'flex' }}>
          <button
            className="pb-menubar__item"
            aria-expanded={open === i}
            data-tutorial-id={host?.anchor('menu', pbSlug(it.label))}
            onClick={() => setOpen(open === i ? null : i)}
            onMouseEnter={() => open !== null && setOpen(i)}
          >
            {it.label}
          </button>
          {open === i && it.menu && (
            <PBMenuList
              items={it.menu}
              menu={it.label}
              style={{ top: '100%', left: 0 }}
              onPick={() => setOpen(null)}
            />
          )}
        </div>
      ))}
    </div>
  )
}

/* One drop-down. Items carrying their own `menu` open a fly-out beside them. */
function PBMenuList({
  items, menu, style, onPick,
}: {
  items: PBMenuItem[]
  /** the top-level menu these items belong to, for anchors */
  menu: string
  style?: CSSProperties
  onPick: () => void
}) {
  const host = usePBInstrumentation()
  const [flyout, setFlyout] = useState<number | null>(null)

  return (
    <div className="pb-menu" style={style} onMouseLeave={() => setFlyout(null)}>
      {items.map((m, j) =>
        m.sep ? (
          <div key={j} className="pb-menu__sep" />
        ) : (
          <div key={j} style={{ position: 'relative', display: 'flex' }}>
            <button
              className={cx('pb-menu__item', m.menu && 'pb-menu__item--parent')}
              disabled={m.disabled}
              data-tutorial-id={m.label ? host?.anchor('menu', pbSlug(menu), pbSlug(m.label)) : undefined}
              onMouseEnter={() => setFlyout(m.menu ? j : null)}
              onClick={() => {
                if (m.menu) { setFlyout(flyout === j ? null : j); return }
                onPick()
                if (m.label) host?.report('menu', { menu: pbSlug(menu), item: pbSlug(m.label) })
                m.onSelect?.()
              }}
            >
              {m.label}
              {m.key && <span className="pb-menu__key">{m.key}</span>}
              {m.menu && <span className="pb-menu__arrow">{'\u203a'}</span>}
            </button>
            {flyout === j && m.menu && (
              <PBMenuList items={m.menu} menu={menu} style={{ top: -3, left: '100%' }} onPick={onPick} />
            )}
          </div>
        ),
      )}
    </div>
  )
}

/* --- PBStatusBar ---------------------------------------------------------- */
export type PBStatusLink = string | { label: string; onSelect?: () => void }

export type PBStatusCell =
  | { text: ReactNode; grow?: boolean; width?: number }
  | { links: PBStatusLink[]; grow?: boolean; width?: number }
  | { label: string; value: ReactNode; grow?: boolean; width?: number }

export function PBStatusBar({ cells }: { cells: PBStatusCell[] }) {
  const host = usePBInstrumentation()
  const link = (l: PBStatusLink) => {
    const label = typeof l === 'string' ? l : l.label
    const onSelect = typeof l === 'string' ? undefined : l.onSelect
    return (
      <button
        key={label}
        className="pb-link"
        style={{ marginRight: 12 }}
        data-tutorial-id={host?.anchor('status', pbSlug(label))}
        onClick={() => {
          host?.report('status', { link: pbSlug(label) })
          onSelect?.()
        }}
      >
        {label}
      </button>
    )
  }
  return (
    <div className="pb-statusbar">
      {cells.map((c, i) => (
        <div
          key={i}
          className={cx('pb-statusbar__cell', c.grow && 'pb-statusbar__cell--grow')}
          style={c.width ? { width: c.width, flex: 'none' } : undefined}
        >
          {'links' in c
            ? c.links.map(link)
            : 'label' in c
              ? <><span className="pb-statusbar__label">{c.label}</span><span className="pb-statusbar__value">{c.value}</span></>
              : c.text}
        </div>
      ))}
    </div>
  )
}

/* --- PBViewHeader — the navy band ---------------------------------------- */
export function PBViewHeader({ title, meta, right }: { title: ReactNode; meta?: ReactNode; right?: ReactNode }) {
  return (
    <div className="pb-viewhead">
      <span className="pb-viewhead__title">{title}</span>
      {meta && <span className="pb-viewhead__meta">{meta}</span>}
      <span className="pb-viewhead__spacer" />
      {right}
    </div>
  )
}

/* --- PBBand — grey group/section header ---------------------------------- */
export function PBBand({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="pb-band">
      <span>{children}</span>
      {right && <><span className="pb-band__spacer" />{right}</>}
    </div>
  )
}

/* --- PBGroupBox ----------------------------------------------------------- */
/* --- PBFixed -------------------------------------------------------------
   Keeps a block at the window's painted width instead of letting it grow
   with the frame. See `--pb-design-w` in layout.css.                      */
export function PBFixed({ style, className, children }: { style?: CSSProperties; className?: string; children: ReactNode }) {
  return <div className={cx('pb-fixed', className)} style={style}>{children}</div>
}

/* --- PBGroup -------------------------------------------------------------
   The classic Win32 GroupBox: a rectangle with a navy caption set into its
   top border. Distinct from PBGroupBox below, which is the banded variant.
   `fill` makes the body stretch, for a group wrapped around a grid.       */
export function PBGroup({
  title, fill, style, bodyStyle, className, children,
}: {
  title: ReactNode
  fill?: boolean
  style?: CSSProperties
  bodyStyle?: CSSProperties
  className?: string
  children: ReactNode
}) {
  return (
    <fieldset className={cx('pb-fieldset', fill && 'pb-fieldset--fill', className)} style={style}>
      <legend className="pb-fieldset__legend">{title}</legend>
      <div className="pb-fieldset__body" style={bodyStyle}>{children}</div>
    </fieldset>
  )
}

export function PBGroupBox({
  title, right, pad = true, style, children,
}: { title: ReactNode; right?: ReactNode; pad?: boolean; style?: CSSProperties; children: ReactNode }) {
  return (
    <div className="pb-groupbox" style={style}>
      <PBBand right={right}>{title}</PBBand>
      <div className={pad ? 'pb-groupbox__body' : undefined}>{children}</div>
    </div>
  )
}
