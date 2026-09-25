import type { CSSProperties, ReactNode } from 'react'
import { useWorkspaceStore, type WorkspaceBlend } from '../data/workspaceStore'
import { PBViewHeader } from '../pb'

/* ============================================================================
   The Workspace's Information Bar — whose workspace this is.

   Art. 1802749 ("Basket" ▸ Banner) and its four captures:
   · `b1d02359` navy,      "Your Workspace"                   — your own
   · `9aca59cb` maroon,    "Blended Workspace Including You"  — yours + others
   · `faeda146` purple,    "Blended Workspace Excluding You"  — others, not you
   · `792f7d19` light blue,"Workspace For PSYCHIATRY, MIKE"   — one other user
   Art. 303749: the banner colour (and the Acknowledgements panel's) changes
   so you can tell whose results you are acting on.
   ========================================================================= */

export const BLEND_BANNER: Record<WorkspaceBlend, { fill?: string; caption: (others: string[]) => string }> = {
  own: { caption: () => 'Your Workspace' },
  'blend-with-me': { fill: '#9b1b1f', caption: () => 'Blended Workspace Including You' },
  'blend-without-me': { fill: '#93278f', caption: () => 'Blended Workspace Excluding You' },
  other: { fill: '#4b9cc3', caption: (others) => `Workspace For ${others[0] ?? ''}` },
}

export function WorkspaceBanner({ title }: { title: ReactNode }) {
  const { blend, sharedWith } = useWorkspaceStore()
  const banner = BLEND_BANNER[blend]
  return (
    <div style={{ display: 'contents', ...(banner.fill ? { ['--pb-navy' as string]: banner.fill } : {}) } as CSSProperties}>
      <PBViewHeader
        title={title}
        right={<span className="pb-viewhead__meta" data-tutorial-id="host.mois.field.workspace-banner">{banner.caption(sharedWith)}</span>}
      />
    </div>
  )
}
