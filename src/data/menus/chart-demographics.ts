import type { PBMenuItem } from '../../pb/components/chrome'
import { registerMenus } from './index'

/* ============================================================================
   The Demographics folder's Action menu.

   art. 303741 ("Demographics folder – Additional Options") lists the items
   Action gains on this folder, and art. 301561 `cda16d47…png` / art. 301560
   `388a4abb…png` (v02.20.19) show them in place, between Create Consult Note
   and Print Label, with their accelerators:

     Print Demographics  Ctrl+D   the Print Preview of the demographics page
     Family Summary      Ctrl+F   relatives who hold a chart at the clinic
     Create Unsent Claim Ctrl+B   Billing ▸ Unsent MSP, to create a claim
     Swipe Identification Card    fill name / DOB / PHN from a care card

   The rest of the list is the chart's own Action menu (the v02.31 capture),
   so it is extended rather than re-typed: the four go in just above Print
   Label, which is where the v02.20 capture has them. Family Summary's
   Ctrl+F exists only here — art. 301561: "only available from the Patient
   Chart - Demographics folder".
   ========================================================================= */

registerMenus('chart:demographic', (ctx) => {
  const base = ctx.base?.Action ?? []
  const extra: PBMenuItem[] = [
    { label: 'Print Demographics', key: 'Ctrl+D', onSelect: () => ctx.go.open?.('print-demographics') },
    { label: 'Family Summary', key: 'Ctrl+F', onSelect: () => ctx.go.open?.('family-summary') },
    { label: 'Create Unsent Claim', key: 'Ctrl+B', onSelect: () => ctx.go.node?.('bl-unsent') },
    /* needs a card reader on the workstation; nothing to open without one */
    { label: 'Swipe Identification Card' },
  ]
  const at = base.findIndex((item) => item.label === 'Print Label')
  return { Action: at < 0 ? [...base, ...extra] : [...base.slice(0, at), ...extra, ...base.slice(at)] }
})
