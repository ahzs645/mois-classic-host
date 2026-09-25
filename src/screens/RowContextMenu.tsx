import { useEffect, useRef, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react'
import { PBPopup, pbInPopup, pbSlug, usePBInstrumentation, usePBPopupOwner, type PBMenuItem } from '../pb'

/* ============================================================================
   A DataWindow's right-click menu.

   MOIS drops a popup menu at the pointer when a grid row is right-clicked —
   the Rx list's (303232 `b6a3367f…png`, 303234 `139782a5…png`) and the MAR's
   (1741600 `169730ee…png`) are captured. It is the same Win32 menu the menu
   bar drops, so it reuses the kit's `.pb-menu` styling and portal; only the
   anchor differs (a point, not a menu-bar caption).

   Items are anchored `host.mois.menu.context.<item>` so a lesson can ring
   one, and report `host.mois.menu {menu:'context', item}` when picked; the
   same action replays the pick while the menu is down (a lesson opens it
   with `host.mois.rightClickRow` first).
   ========================================================================= */

export type ContextMenuAt = { x: number; y: number } | null

/** Where the menu opens: the pointer, relative to the element that holds the grid. */
export function contextPoint(event: ReactMouseEvent<HTMLElement>): ContextMenuAt {
  event.preventDefault()
  const box = event.currentTarget.getBoundingClientRect()
  return { x: event.clientX - box.left, y: event.clientY - box.top }
}

export function RowContextMenu({ at, items, onClose }: {
  /** the pointer, relative to the positioned element this is rendered in */
  at: ContextMenuAt
  items: PBMenuItem[]
  onClose: () => void
}) {
  const anchor = useRef<HTMLSpanElement>(null)
  const owner = usePBPopupOwner()
  const host = usePBInstrumentation()

  useEffect(() => {
    if (!at) return
    const away = (e: MouseEvent) => { if (!pbInPopup(e.target, owner)) onClose() }
    document.addEventListener('mousedown', away)
    return () => document.removeEventListener('mousedown', away)
  }, [at, owner, onClose])

  if (!at) return null
  return (
    <>
      {/* the menu's "launcher" is the point it dropped at, always expanded:
          `host.mois.menu {menu: 'context', item}` then presses the item
          without trying to drop the menu first, as it does for a menu-bar
          menu that is already open */}
      <span
        ref={anchor}
        data-tutorial-id={host?.anchor('menu', 'context')}
        aria-expanded="true"
        style={{ position: 'absolute', left: at.x, top: at.y, width: 1, height: 1, pointerEvents: 'none' }}
      />
      <PBPopup anchorRef={anchor} owner={owner} side="below" className="pb-menu" tutorialId={host?.anchor('menu-region', 'context')}>
        {items.map((m, i): ReactNode => (m.sep ? (
          <div key={i} className="pb-menu__sep" />
        ) : (
          <button
            key={i}
            type="button"
            className="pb-menu__item"
            disabled={m.disabled}
            data-tutorial-id={m.label ? host?.anchor('menu', 'context', pbSlug(m.label)) : undefined}
            onClick={() => {
              onClose()
              if (m.label) host?.report('menu', { menu: 'context', item: pbSlug(m.label) })
              m.onSelect?.()
            }}
          >
            {m.label}
            {m.key && <span className="pb-menu__key">{m.key}</span>}
          </button>
        )))}
      </PBPopup>
    </>
  )
}
