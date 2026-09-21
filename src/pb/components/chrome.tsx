import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode, RefObject } from 'react'
import { useEffect, useRef, useState } from 'react'
import { pbSlug, usePBInstrumentation } from '../instrumentation'
import { PBPopup, pbInPopup, usePBPopupOwner, type PBPopupSide } from '../popup'
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
  maximized, onMinimize, onMaximize, onMovePointerDown, onResizePointerDown, tutorialId,
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
  /** the window's own anchor, `host.mois.dialog.{slug}`.
   *
   *  A step whose action opens a window needs something to ring, and the
   *  control it pressed is the wrong answer: the window covers it, so the
   *  learner is shown a glowing empty rectangle on the new window's chrome.
   *  Ring the window. */
  tutorialId?: string
}) {
  return (
    <div
      className={cx('pb-window', child && 'pb-window--child', className)}
      style={style}
      data-tutorial-id={tutorialId}
    >
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
   way a real Win32 menu does. The dropped panel is a popup window, not a box
   inside the bar — see pb/popup.                                           */
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
  const owner = usePBPopupOwner()

  useEffect(() => {
    if (open === null) return
    const away = (e: MouseEvent) => {
      /* the panel is portalled off the bar, so "inside" is bar *or* popup */
      if (ref.current?.contains(e.target as Node) || pbInPopup(e.target, owner)) return
      setOpen(null)
    }
    document.addEventListener('mousedown', away)
    return () => document.removeEventListener('mousedown', away)
  }, [open, owner])

  return (
    /* the manual's "Toolbar": the drop-down menus across the frame */
    <div className="pb-menubar" ref={ref} data-tutorial-id={host?.anchor('menubar')}>
      {items.map((it, i) => (
        <PBMenuBarItem
          key={it.label}
          item={it}
          owner={owner}
          open={open === i}
          onToggle={() => setOpen(open === i ? null : i)}
          onHover={() => setOpen((cur) => (cur === null ? cur : i))}
          onPick={() => setOpen(null)}
        />
      ))}
    </div>
  )
}

/* One caption on the bar, and the menu it drops. */
function PBMenuBarItem({
  item, owner, open, onToggle, onHover, onPick,
}: {
  item: { label: string; menu?: PBMenuItem[] }
  owner: string
  open: boolean
  onToggle: () => void
  onHover: () => void
  onPick: () => void
}) {
  const host = usePBInstrumentation()
  const btn = useRef<HTMLButtonElement>(null)

  return (
    <>
      <button
        ref={btn}
        className="pb-menubar__item"
        aria-expanded={open}
        data-tutorial-id={host?.anchor('menu', pbSlug(item.label))}
        data-tutorial-aliases={!open || !item.menu ? host?.anchor('menu-region', pbSlug(item.label)) : undefined}
        onClick={onToggle}
        onMouseEnter={onHover}
      >
        {item.label}
      </button>
      {open && item.menu && (
        <PBMenuList
          items={item.menu}
          menu={item.label}
          owner={owner}
          anchorRef={btn}
          side="below"
          onPick={onPick}
        />
      )}
    </>
  )
}

/* One drop-down. Items carrying their own `menu` open a fly-out beside them. */
function PBMenuList({
  items, menu, owner, anchorRef, side, onPick,
}: {
  items: PBMenuItem[]
  /** the top-level menu these items belong to, for anchors */
  menu: string
  owner: string
  anchorRef: RefObject<HTMLElement | null>
  side: PBPopupSide
  onPick: () => void
}) {
  const [flyout, setFlyout] = useState<number | null>(null)
  const host = usePBInstrumentation()
  /* a list with fly-outs reserves the arrow column on every row, which is
     what makes Views ~15px wider than its captions need */
  const arrows = items.some((m) => m.menu)

  return (
    <PBPopup
      anchorRef={anchorRef}
      owner={owner}
      side={side}
      className={cx('pb-menu', arrows && 'pb-menu--arrows')}
      tutorialId={side === 'below' ? host?.anchor('menu-region', pbSlug(menu)) : undefined}
    >
      {/* the column measurer — see `.pb-menu__sizer` in chrome.css */}
      <div className="pb-menu__sizer" aria-hidden="true">
        <span>
          {items.map((m, j) => (m.sep ? null : <span key={j}>{m.label}</span>))}
        </span>
        <span className="pb-menu__sizer-keys">
          {items.map((m, j) => (m.key ? <span key={j}>{m.key}</span> : null))}
        </span>
      </div>
      {items.map((m, j) =>
        m.sep ? (
          <div key={j} className="pb-menu__sep" />
        ) : (
          <PBMenuRow
            key={j}
            item={m}
            menu={menu}
            owner={owner}
            open={flyout === j}
            onHover={() => setFlyout(m.menu ? j : null)}
            onToggle={() => setFlyout(flyout === j ? null : j)}
            onPick={onPick}
          />
        ),
      )}
    </PBPopup>
  )
}

/* One row of a drop-down, and the fly-out it may open beside itself. */
function PBMenuRow({
  item, menu, owner, open, onHover, onToggle, onPick,
}: {
  item: PBMenuItem
  menu: string
  owner: string
  open: boolean
  onHover: () => void
  onToggle: () => void
  onPick: () => void
}) {
  const host = usePBInstrumentation()
  const btn = useRef<HTMLButtonElement>(null)

  return (
    <>
      <button
        ref={btn}
        className={cx('pb-menu__item', item.menu && 'pb-menu__item--parent')}
        disabled={item.disabled}
        data-tutorial-id={item.label ? host?.anchor('menu', pbSlug(menu), pbSlug(item.label)) : undefined}
        onMouseEnter={onHover}
        onClick={() => {
          if (item.menu) { onToggle(); return }
          onPick()
          if (item.label) host?.report('menu', { menu: pbSlug(menu), item: pbSlug(item.label) })
          item.onSelect?.()
        }}
      >
        {item.label}
        {item.key && <span className="pb-menu__key">{item.key}</span>}
        {item.menu && <span className="pb-menu__arrow">{'›'}</span>}
      </button>
      {open && item.menu && (
        <PBMenuList
          items={item.menu}
          menu={menu}
          owner={owner}
          anchorRef={btn}
          side="beside"
          onPick={onPick}
        />
      )}
    </>
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
    /* the manual's "Bottom Bar" */
    <div className="pb-statusbar" data-tutorial-id={host?.anchor('statusbar')}>
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
  const host = usePBInstrumentation()
  return (
    /* the manual's "Information Bar": what is open, and who it is open on */
    <div className="pb-viewhead" data-tutorial-id={host?.anchor('viewhead')}>
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
