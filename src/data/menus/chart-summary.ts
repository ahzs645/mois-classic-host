import { registerMenus } from './index'

/* ============================================================================
   Patient Chart ▸ Patient Summary — Utilities with Paste Patient Text greyed.

   PROVENANCE: art. 303788 ("How to Paste Patient Text"): "This functionality
   is not available for the Patient Summary folder." The item still shows on
   this folder's Utilities menu — art. 303741 `e69625a1…png` is Utilities
   dropped over Patient Summary, third item Paste Patient Text — so it stays
   in its place, disabled, rather than being removed. Every other item is the
   chart's own Utilities list (data/mois.tsx), extended rather than re-typed.
   ========================================================================= */

registerMenus('chart:summary', (ctx) => {
  const base = ctx.base?.Utilities
  if (!base) return {}
  return {
    Utilities: base.map((item) => (item.label === 'Paste Patient Text' ? { ...item, disabled: true, onSelect: undefined } : item)),
  }
})
