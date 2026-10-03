import { createContext, useContext } from 'react'

/* ============================================================================
   The desktop a window is raised onto, and how high it stacks there.

   MOIS raises its dialogs and message boxes over the frame that owns them,
   never inside the work area that asked for them (2026-10-02 TRAINING
   captures: New Security Profile over the frame, Select Launch Mode over
   Security Profile Settings, Backlog is Empty over User Account). So a modal
   window portals onto the `.pb-desktop`.

   The shell hands its desktop element down (PBDesktopProvider) so a window
   portals on its first render and mounts once. Finding the desktop in the DOM
   instead means rendering once to look and again to move, which mounts the
   window twice: a list that scrolls to its current row on mount does it in
   the copy that is thrown away.

   Portalled, a window no longer stacks over the one that raised it for free,
   so each modal layer tells the windows raised inside it how high it sits
   (PBRaisedFrom), and theirs stack at least one above. A popup (pb/popup)
   stays above every window (120 and up).
   ========================================================================= */
const PBDesktop = createContext<HTMLElement | null>(null)
export const PBDesktopProvider = PBDesktop.Provider
/** the `.pb-desktop` the shell provided, or null outside a shell */
export const usePBDesktop = () => useContext(PBDesktop)

export const PBRaisedFrom = createContext(0)
/** the z-index a modal layer takes: what it asked for, raised above the
    layer it was opened from */
export function usePBLayerZ(zIndex: number | undefined): number | undefined {
  const floor = useContext(PBRaisedFrom)
  return floor > 0 ? Math.max(zIndex ?? 40, floor + 1) : zIndex
}
