import { createElement, type ComponentType } from 'react'
import { createRegistry } from './registry'

/* ============================================================================
   Folder views registered by tree node — the work-area counterpart of
   `areaWindowRegistry.ts`.

   The frame's `ROUTES` table picks a window for each tree node, and every
   new screen used to mean another `View` literal, another import and another
   `{view === … && …}` line in host/MoisClassicShell.tsx. A folder whose
   window is self-contained registers itself here instead:

       registerFolderView(['dx-call-lists'], CallListsView)

   and the frame routes any registered node to `view: 'folder'`, rendering
   whatever is registered for the selected node. A registered node wins over
   the chart-section fallback and the generic `chartScreens` stubs (the
   Patient Chart's myhealthkey folder was one), but not over a purpose-built
   route already in `ROUTES` — the frame checks that table first.

   A file calls `registerFolderView` at module level and is imported for that
   side effect from `folderViews.register.ts`.
   ========================================================================= */

export type FolderViewProps = {
  /** the selected tree node — one component may serve several */
  node: string
  /** Close Window: shut the sheet, leaving the work area empty */
  close: () => void
  /** select another tree node (Open Chart, a hyperlink to a folder) */
  openNode: (id: string) => void
  /** open a frame window by id; false when nothing is registered for it */
  open: (id: string, args?: Record<string, unknown>) => boolean
}

const registry = createRegistry<ComponentType<FolderViewProps>>()

export function registerFolderView(nodes: string[], component: ComponentType<FolderViewProps>) {
  registry.register(nodes, component)
}

export const isFolderView = (node: string): boolean => registry.has(node)

/** The registered view for `node`, or nothing. Keyed on the node so two
    folders sharing one component do not share its state. */
export function FolderViewLayer(props: FolderViewProps) {
  const View = registry.get(props.node)
  return View ? createElement(View, { key: props.node, ...props }) : null
}
