import {
  useId, useLayoutEffect, useRef, useState,
  type CSSProperties, type ReactNode, type RefObject,
} from 'react'
import { createPortal } from 'react-dom'

/* ============================================================================
   pb/popup — a menu or a dropped list is a *window*, not a box.

   In Win32 a drop-down menu and a DDDW's list are top-level windows of their
   own: they are painted over the screen and only the screen's edges push them
   around. Drawn inline they are children of the frame instead, so
   `.pb-window`'s `overflow: hidden` cuts them off — a menu as long as Views
   loses half its items at the bottom of the frame, and the Gender list
   disappears behind the status bar.

   So a popup is portalled onto the nearest `.pb-desktop`, which is what MOIS
   has for a screen: the monitor when the viewer runs standalone, the stage box
   when Webforms embeds the shell. It is placed from its anchor's rect, then
   flipped and slid back inside that box the way a Win32 menu is, and it
   scrolls only when it is taller than the screen itself.
   ========================================================================= */

/** Which edge of the anchor the popup hangs off. */
export type PBPopupSide = 'below' | 'beside'

/** The box a popup is confined to. */
function screenOf(el: HTMLElement): HTMLElement {
  return (el.closest('.pb-desktop') as HTMLElement | null) ?? document.body
}

/**
 * A token tying a popup to the control that opened it, so a click-away
 * handler can tell "inside my own menu" from "somewhere else on the desktop".
 */
export function usePBPopupOwner(): string {
  return useId()
}

/** True when `target` sits inside a popup owned by `owner`. */
export function pbInPopup(target: EventTarget | null, owner: string): boolean {
  for (let el = target as HTMLElement | null; el; el = el.parentElement) {
    if (el.dataset?.pbPopup === owner) return true
  }
  return false
}

/* A fly-out lines its first item up with the item it hangs off, so it starts
   a border and a pad's worth above it. */
const FLYOUT_RISE = 3

function place(
  anchor: HTMLElement,
  pop: HTMLElement,
  layer: HTMLElement,
  side: PBPopupSide,
  minWidth: number | 'anchor' | undefined,
): CSSProperties {
  const a = anchor.getBoundingClientRect()
  const onBody = layer === document.body
  const lr = layer.getBoundingClientRect()
  /* clientWidth/Height so a scrollbar on the desktop is not counted as room */
  const screen = onBody
    ? { left: 0, top: 0, width: document.documentElement.clientWidth, height: document.documentElement.clientHeight }
    : { left: lr.left, top: lr.top, width: layer.clientWidth, height: layer.clientHeight }
  const w = pop.offsetWidth
  const h = pop.offsetHeight

  let left = side === 'below' ? a.left : a.right
  let top = side === 'below' ? a.bottom : a.top - FLYOUT_RISE

  /* vertical: drop, else flip up over the anchor (a fly-out just slides up),
     and only scroll when even the whole screen cannot hold it */
  let maxHeight: number | undefined
  if (h > screen.height) {
    maxHeight = screen.height
  } else if (top + h > screen.top + screen.height) {
    top = side === 'below' ? a.top - h : screen.top + screen.height - h
  }
  top = Math.min(Math.max(top, screen.top), screen.top + screen.height - Math.min(h, screen.height))

  /* horizontal: a bar menu right-aligns on its item, a fly-out swaps sides */
  if (left + w > screen.left + screen.width) left = side === 'below' ? a.right - w : a.left - w
  left = Math.max(screen.left, Math.min(left, screen.left + screen.width - w))

  const width = minWidth === 'anchor' ? a.width : minWidth

  return {
    position: onBody ? 'fixed' : 'absolute',
    left: onBody ? left : left - screen.left + layer.scrollLeft,
    top: onBody ? top : top - screen.top + layer.scrollTop,
    ...(maxHeight === undefined ? null : { maxHeight, overflowY: 'auto' as const }),
    ...(width === undefined ? null : { minWidth: width }),
  }
}

export function PBPopup({
  anchorRef, owner, side = 'below', minWidth, className, style, tutorialId, id, children,
}: {
  /** the control the popup hangs off — already mounted when the popup opens */
  anchorRef: RefObject<HTMLElement | null>
  owner: string
  side?: PBPopupSide
  /** `'anchor'` makes the popup at least as wide as the control, as a combo's list is */
  minWidth?: number | 'anchor'
  className?: string
  style?: CSSProperties
  tutorialId?: string
  /** for the opener's `aria-controls`, which is how a tutorial ring finds an open list */
  id?: string
  children: ReactNode
}) {
  const popRef = useRef<HTMLDivElement>(null)
  const [layer, setLayer] = useState<HTMLElement | null>(null)
  /* measured on the first commit, so it is painted only once it is placed */
  const [box, setBox] = useState<CSSProperties>({ position: 'absolute', left: 0, top: 0, visibility: 'hidden' })

  useLayoutEffect(() => {
    if (anchorRef.current) setLayer(screenOf(anchorRef.current))
  }, [anchorRef])

  useLayoutEffect(() => {
    const anchor = anchorRef.current
    const pop = popRef.current
    if (!layer || !anchor || !pop) return
    const put = () => setBox(place(anchor, pop, layer, side, minWidth))
    put()
    window.addEventListener('resize', put)
    return () => window.removeEventListener('resize', put)
  }, [anchorRef, layer, side, minWidth])

  if (!layer) return null

  return createPortal(
    <div ref={popRef} id={id} data-pb-popup={owner} data-tutorial-id={tutorialId} className={className} style={{ ...style, ...box }}>
      {children}
    </div>,
    layer,
  )
}
