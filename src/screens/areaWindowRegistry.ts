import { createContext, createElement, useContext, type ComponentType, type ReactNode } from 'react'

/* ============================================================================
   Windows opened by name, outside the frame's own dialog states.

   The shell's `openWindowById` is the single switch every "open this window"
   goes through (the `host.mois.openUtility` action, menu `go.open`, command
   buttons). The windows the Workspace, Billing and Reports areas add —
   Create New Task, Create New Message, Reassign Items, Change Workspace, the
   report parameter windows … — register themselves here instead of each
   taking a `useState` in the shell: the shell holds one `{ id, args }` slot,
   reports `id` as `host.dialog`, and renders whatever is registered for it.

   A window file calls `registerAreaWindow(id, Component)` at module level and
   is imported for that side effect from `areaWindows.register.ts`.

   Screens reach the switch through `useOpenWindow()`, so a command button on
   a basket folder can open Create New Task with the current row's chart and
   linked record without a prop being threaded through the shell for it.
   ========================================================================= */

export type AreaWindowArgs = Record<string, unknown>

export type AreaWindowProps = {
  /** what the opener passed: chart, patient, linked record, detail text … */
  args: AreaWindowArgs
  /** close this window (Cancel, Close, the title-bar ×) */
  close: () => void
  /** open another window by id — a window that swaps itself for another
      (Create New Task → Create Task Set) calls this */
  open: (id: string, args?: AreaWindowArgs) => boolean
}

const registry = new Map<string, ComponentType<AreaWindowProps>>()

export function registerAreaWindow(id: string, component: ComponentType<AreaWindowProps>) {
  registry.set(id, component)
}

export const isAreaWindow = (id: string): boolean => registry.has(id)

export function AreaWindowLayer({
  open, onClose, onOpen,
}: {
  open: { id: string; args?: AreaWindowArgs } | null
  onClose: () => void
  onOpen: (id: string, args?: AreaWindowArgs) => boolean
}) {
  if (!open) return null
  const Window = registry.get(open.id)
  if (!Window) return null
  return createElement(Window, { key: open.id, args: open.args ?? {}, close: onClose, open: onOpen })
}

/* --- the switch, for screens ---------------------------------------------- */
type Opener = (id: string, args?: AreaWindowArgs) => boolean

const OpenWindowContext = createContext<Opener>(() => false)

export function AreaWindowProvider({ open, children }: { open: Opener; children: ReactNode }) {
  return createElement(OpenWindowContext.Provider, { value: open }, children)
}

/** Open a window the frame knows by id; false when nothing is registered for it. */
export const useOpenWindow = (): Opener => useContext(OpenWindowContext)
