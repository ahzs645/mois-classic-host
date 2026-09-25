import { createContext, useCallback, useContext, useMemo, useReducer, useRef, useState, type ReactNode } from 'react'
import { useScreenReport } from './screen-state'

/* ============================================================================
   host/screen-windows — windows a *screen* owns, opened by name through the
   *frame*.

   Most MOIS windows belong to a folder: the Drug Lookup List, the Medication
   Dose Wizard, Renew Long Term Medication and the MAR's New Medication
   Administration Information chooser all hang off the screen that raised them
   and act on its rows. They still have to be reachable by name, because
   `host.mois.openUtility {window}` and a menu's `go.open(id)` go through the
   frame's `openWindowById`, and autoplay, practice-mode clicks and menus must
   all reach the same window.

   So the frame holds one slot — which screen window is open, with its
   arguments — and hands it down through this context. A screen renders the
   window when the slot names one of its own ids (declared with
   `registerScreenWindows`, which is what makes `openWindowById` accept them),
   and closes it through the same context. What the window *reports* goes
   through host/screen-state.tsx like every other work-area window:
   `useScreenReport({ dialog })` while it is on screen.

   The context also carries a per-frame session store (`useSessionState`) for
   record edits that must survive leaving a folder — a Long Term Med
   duplicated into Prescriptions has to be there when the learner opens
   Prescriptions. It lives as long as the frame does, so a new stage starts on
   the chart as exported.
   ========================================================================= */

export type ScreenWindow = { id: string; args?: Record<string, unknown> }

type Ctx = {
  window: ScreenWindow | null
  open: (id: string, args?: Record<string, unknown>) => void
  close: () => void
  store: Map<string, unknown>
  version: number
  bump: () => void
}

const ScreenWindowContext = createContext<Ctx | null>(null)

const registered = new Set<string>()

/** Declare window ids a screen renders itself, so `openWindowById` accepts them. */
export function registerScreenWindows(ids: string[]) {
  ids.forEach((id) => registered.add(id))
}

export function isScreenWindow(id: string): boolean {
  return registered.has(id)
}

export function ScreenWindowProvider({
  window, onOpen, onClose, children,
}: {
  window: ScreenWindow | null
  onOpen: (w: ScreenWindow) => void
  onClose: () => void
  children: ReactNode
}) {
  const [store] = useState(() => new Map<string, unknown>())
  const [version, bump] = useReducer((n: number) => n + 1, 0)
  const value = useMemo<Ctx>(() => ({
    window,
    open: (id, args) => onOpen({ id, args }),
    close: onClose,
    store,
    version,
    bump,
  }), [window, onOpen, onClose, store, version])
  return <ScreenWindowContext.Provider value={value}>{children}</ScreenWindowContext.Provider>
}

/* Outside a frame (the kit gallery, a unit test mounting one screen) the
   windows still open and close, locally. */
const fallbackStore = new Map<string, unknown>()

/** The screen-window slot: which one is open, and how to open or close one. */
export function useScreenWindow() {
  const ctx = useContext(ScreenWindowContext)
  const [local, setLocal] = useState<ScreenWindow | null>(null)
  const open = useCallback((id: string, args?: Record<string, unknown>) => {
    if (ctx) ctx.open(id, args)
    else setLocal({ id, args })
  }, [ctx])
  const close = useCallback(() => {
    if (ctx) ctx.close()
    else setLocal(null)
  }, [ctx])
  const window = ctx ? ctx.window : local
  return { window, is: (id: string) => window?.id === id, open, close }
}

/** Report a window as `host.dialog` for as long as it is mounted. */
export function useReportDialog(id: string) {
  useScreenReport({ dialog: id })
}

/** State that outlives the screen but not the frame. Keys should carry the chart. */
export function useSessionState<T>(key: string, initial: T): [T, (next: T | ((prev: T) => T)) => void] {
  const ctx = useContext(ScreenWindowContext)
  const store = ctx?.store ?? fallbackStore
  const [, localBump] = useReducer((n: number) => n + 1, 0)
  const bump = ctx?.bump ?? localBump
  const initialRef = useRef(initial)
  const value = (store.has(key) ? store.get(key) : initialRef.current) as T
  const set = useCallback((next: T | ((prev: T) => T)) => {
    const prev = (store.has(key) ? store.get(key) : initialRef.current) as T
    store.set(key, typeof next === 'function' ? (next as (p: T) => T)(prev) : next)
    bump()
  }, [bump, key, store])
  return [value, set]
}
