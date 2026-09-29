import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react'
import { useScreenReport } from '../host/screen-state'
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

/** Reports `host.dialog` while the menu it is drawn in is down. */
function ReportDialog({ id }: { id: string }) {
  useScreenReport({ dialog: id })
  return null
}

export function RowContextMenu({ at, items, onClose, reportDialog }: {
  /** the pointer, relative to the positioned element this is rendered in */
  at: ContextMenuAt
  items: PBMenuItem[]
  onClose: () => void
  /** report `host.dialog` as this while the menu is down — the chart
      folders' Option List and the Medication rows' menu report
      `record-option-list`, so a lesson can grade "the menu is open" */
  reportDialog?: string
}) {
  const anchor = useRef<HTMLSpanElement>(null)
  const owner = usePBPopupOwner()
  const host = usePBInstrumentation()
  const [flyout, setFlyout] = useState<number | null>(null)

  useEffect(() => {
    if (!at) return
    const away = (e: MouseEvent) => { if (!pbInPopup(e.target, owner)) onClose() }
    document.addEventListener('mousedown', away)
    return () => document.removeEventListener('mousedown', away)
  }, [at, owner, onClose])

  if (!at) return null
  return (
    <>
      {reportDialog && <ReportDialog id={reportDialog} />}
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
      <PBPopup anchorRef={anchor} owner={owner} side="below" className={items.some((m) => m.menu) ? 'pb-menu pb-menu--arrows' : 'pb-menu'} tutorialId={host?.anchor('menu-region', 'context')}>
        {items.map((m, i): ReactNode => (m.sep ? (
          <div key={i} className="pb-menu__sep" />
        ) : m.menu ? (
          /* a fly-out, the MAR's Administer ▸ (303427 `f625cf01…png`):
             its items are anchored host.mois.menu.context.<parent>-<item> */
          <ContextFlyout key={i} item={m} owner={owner} onClose={onClose} open={flyout === i} onOpen={() => setFlyout(i)} />
        ) : (
          <button
            onMouseEnter={() => setFlyout(null)}
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

/** A context-menu item with its own fly-out beside it. */
function ContextFlyout({ item, owner, open, onOpen, onClose }: {
  item: PBMenuItem
  owner: string
  open: boolean
  onOpen: () => void
  onClose: () => void
}) {
  const btn = useRef<HTMLButtonElement>(null)
  const host = usePBInstrumentation()
  const parent = pbSlug(item.label ?? '')
  return (
    <>
      <button
        ref={btn}
        type="button"
        className="pb-menu__item pb-menu__item--parent"
        disabled={item.disabled}
        aria-expanded={open}
        data-tutorial-id={host?.anchor('menu', 'context', parent)}
        onMouseEnter={onOpen}
        onClick={onOpen}
      >
        {item.label}
        <span className="pb-menu__arrow">{'\u203a'}</span>
      </button>
      {open && (
        <PBPopup anchorRef={btn} owner={owner} side="beside" className="pb-menu">
          {(item.menu ?? []).map((m, i) => (m.sep ? <div key={i} className="pb-menu__sep" /> : (
            <button
              key={i}
              type="button"
              className="pb-menu__item"
              disabled={m.disabled}
              data-tutorial-id={m.label ? host?.anchor('menu', 'context', `${parent}-${pbSlug(m.label)}`) : undefined}
              onClick={() => {
                onClose()
                if (m.label) host?.report('menu', { menu: 'context', item: `${parent}-${pbSlug(m.label)}` })
                m.onSelect?.()
              }}
            >
              {m.label}
            </button>
          )))}
        </PBPopup>
      )}
    </>
  )
}
