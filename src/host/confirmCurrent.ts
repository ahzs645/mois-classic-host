/* ============================================================================
   Built from older evidence: confirm against the current MOIS.

   Some windows and screens are laid out from help-site screenshots of older
   builds (v02.24 – v02.31), because no capture of the current build exists.
   Their layout — which controls, in what order, worded how, grouped how — is
   taken from that evidence; their styling follows the current build's kit
   and tokens, never the old screenshot's chrome. What the older build shows
   may have moved since, so each such window is flagged here until a capture
   of the current build confirms or corrects it.

   A screen file registers its own entries at module level, beside the window
   they describe (registerConfirmCurrent), and marks the code with a
   `CONFIRM-CURRENT:` comment so the two can be found together:

     grep -rn "CONFIRM-CURRENT" src

   Opening the viewer with `?confirm=1` draws a badge on every flagged window
   and screen, naming its evidence — the list of what to capture next.
   ========================================================================= */

export type ConfirmCurrent = {
  /** a window's anchor (`host.mois.dialog.<id>`, or the anchor its wrapper
      carries), or a navigator node id for a work-area screen */
  target: { anchor: string } | { node: string }
  /** where the layout came from: help-site article and image, build */
  source: string
  /** what in particular to check, when it is narrower than "everything" */
  check?: string
}

const entries = new Map<string, ConfirmCurrent>()

const keyOf = (e: ConfirmCurrent) => ('anchor' in e.target ? `a:${e.target.anchor}` : `n:${e.target.node}`)

export function registerConfirmCurrent(list: ConfirmCurrent[]) {
  for (const e of list) entries.set(keyOf(e), e)
}

/** every flagged window and screen, in registration order */
export const confirmCurrentEntries = (): ConfirmCurrent[] => [...entries.values()]

/** whether the viewer was opened to show the badges (`?confirm=1`) */
export function confirmCurrentShown(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('confirm') === '1'
}

const cssString = (s: string) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ')}"`

const selectorOf = (e: ConfirmCurrent) => ('anchor' in e.target
  ? `[data-tutorial-id=${cssString(e.target.anchor)}]`
  : `[data-tutorial-id="host.mois.workarea"][data-node=${cssString(e.target.node)}]`)

const captionOf = (e: ConfirmCurrent) =>
  `Confirm vs current MOIS — ${e.source}${e.check ? ` · check: ${e.check}` : ''}`

/** The outline on each flagged window or work area. An outline never moves
    anything, so a window keeps its own positioning. */
export function confirmCurrentCss(): string {
  const outline = confirmCurrentEntries().map(selectorOf).join(',\n')
  return `${outline} { outline: 2px dashed #e08a00; outline-offset: -2px; }
.pb-confirm-badge { position: absolute; right: 2px; bottom: 2px; z-index: 50; max-width: 70%;
  padding: 1px 5px; background: #fff3d6; border: 1px solid #e08a00; color: #6b4300;
  font: 10px/1.3 Tahoma, sans-serif; pointer-events: none; white-space: normal; }`
}

/** Hang a caption in each flagged element still missing one. An element
    that is not already positioned becomes `relative` so the caption sits in
    its corner; an absolutely or fixed placed window keeps its placement. */
export function attachConfirmBadges(root: ParentNode) {
  for (const e of confirmCurrentEntries()) {
    for (const el of root.querySelectorAll<HTMLElement>(selectorOf(e))) {
      if (el.querySelector(':scope > .pb-confirm-badge')) continue
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative'
      const badge = document.createElement('div')
      badge.className = 'pb-confirm-badge'
      badge.textContent = captionOf(e)
      el.append(badge)
    }
  }
}
