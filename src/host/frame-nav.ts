/* ============================================================================
   The frame's "go to this folder" for windows and screens.

   MOIS's hyperlinked descriptions jump to the record's own folder — a Goal's
   Linked Health Issue(s) "Description … is a hyperlink, clicking on it will
   jump you to the appropriate record in the Conditions folder" (art.
   303498). The frame's `openNode` (expand the ancestors, select the node,
   route it, report `host.mois.selectNode`) is registered here while the
   frame renders, so a link needs no prop threaded through the shell.
   ========================================================================= */

type Opener = (node: string, recordId?: string) => void

let opener: Opener | null = null

/** called by the frame (host/MoisClassicShell.tsx) with its openNode */
export function setFrameNodeOpener(next: Opener | null) {
  opener = next
}

/** select a tree node (and optionally a record in it); false with no frame */
export function openFrameNode(node: string, recordId?: string): boolean {
  if (!opener) return false
  opener(node, recordId)
  return true
}
