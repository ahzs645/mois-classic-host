/* ============================================================================
   A registry of components keyed by id — what the frame's two "render the
   registered thing" slots are built from:
     areaWindowRegistry.ts   windows opened by id (the modal slot)
     folderViewRegistry.ts   work-area views keyed by tree node
   Both were the same Map-plus-lookup written twice. (host/screen-windows.tsx
   is a different mechanism — it registers ids only, and the owning screen
   draws the window — so it is not one of these.)
   ========================================================================= */

export type Registry<C> = {
  register: (ids: string | string[], component: C) => void
  has: (id: string) => boolean
  get: (id: string) => C | undefined
  /** every registered id, in registration order */
  ids: () => string[]
}

export function createRegistry<C>(): Registry<C> {
  const map = new Map<string, C>()
  return {
    register: (ids, component) => { (Array.isArray(ids) ? ids : [ids]).forEach((id) => map.set(id, component)) },
    has: (id) => map.has(id),
    get: (id) => map.get(id),
    ids: () => [...map.keys()],
  }
}
