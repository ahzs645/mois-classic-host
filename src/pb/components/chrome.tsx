import type { CSSProperties, ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { pbSlug, usePBInstrumentation } from '../instrumentation'
import {
  GlyphClose, GlyphMaximize, GlyphMinimize, IconMoisApp,
} from '../icons'

const cx = (...v: (string | false | undefined | null)[]) => v.filter(Boolean).join(' ')

/* --- PBWindow ------------------------------------------------------------ */
export function PBWindow({
  title, sub, icon, child, onClose, controls = true, style, className, children,
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
}) {
  return (
    <div className={cx('pb-window', child && 'pb-window--child', className)} style={style}>
      <div className="pb-titlebar">
        <span className="pb-titlebar__icon">{icon ?? <IconMoisApp />}</span>
        <span className="pb-titlebar__text">{title}</span>
        {sub && <span className="pb-titlebar__sub">{sub}</span>}
        <span className="pb-titlebar__spacer" />
        <span className="pb-titlebar__buttons">
          {controls && (
            <>
              <button className="pb-titlebar__btn" title="Minimize"><GlyphMinimize /></button>
              <button className="pb-titlebar__btn" title="Maximize"><GlyphMaximize /></button>
            </>
          )}
          <button className="pb-titlebar__btn pb-titlebar__btn--close" title="Close" onClick={onClose}>
            <GlyphClose />
          </button>
        </span>
      </div>
      {children}
    </div>
  )
}

/* --- PBMenuBar -----------------------------------------------------------
   Menus open on click and track the pointer across the bar once open, the
   way a real Win32 menu does.                                              */
export type PBMenuItem = { label?: string; key?: string; disabled?: boolean; sep?: boolean; onSelect?: () => void }

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
            <div className="pb-menu" style={{ top: '100%', left: 0 }}>
              {it.menu.map((m, j) =>
                m.sep ? (
                  <div key={j} className="pb-menu__sep" />
                ) : (
                  <button
                    key={j}
                    className="pb-menu__item"
                    disabled={m.disabled}
                    data-tutorial-id={m.label ? host?.anchor('menu', pbSlug(it.label), pbSlug(m.label)) : undefined}
                    onClick={() => {
                      setOpen(null)
                      if (m.label) host?.report('menu', { menu: pbSlug(it.label), item: pbSlug(m.label) })
                      m.onSelect?.()
                    }}
                  >
                    {m.label}
                    {m.key && <span className="pb-menu__key">{m.key}</span>}
                  </button>
                ),
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/* --- PBStatusBar ---------------------------------------------------------- */
export type PBStatusCell =
  | { text: ReactNode; grow?: boolean; width?: number }
  | { links: string[]; grow?: boolean; width?: number }
  | { label: string; value: ReactNode; grow?: boolean; width?: number }

export function PBStatusBar({ cells }: { cells: PBStatusCell[] }) {
  return (
    <div className="pb-statusbar">
      {cells.map((c, i) => (
        <div
          key={i}
          className={cx('pb-statusbar__cell', c.grow && 'pb-statusbar__cell--grow')}
          style={c.width ? { width: c.width, flex: 'none' } : undefined}
        >
          {'links' in c
            ? c.links.map((l) => <button key={l} className="pb-link" style={{ marginRight: 12 }}>{l}</button>)
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
