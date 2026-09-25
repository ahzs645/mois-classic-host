import { registerMenus } from './index'

/* ============================================================================
   The Reports module's menus.

   art. 304057 "Reports Content": "The toolbar options available in the
   Reports module match those found in the Administration module", and "The
   Utilities tool remains consistent regardless of the folder selected".
   Image `00a57c8b` (v02.17.20 b150326) shows that Utilities menu dropped
   over the Report List: Provider Address to Clipboard, Patient Address to
   Clipboard (lookup) | Change Teleplan Password — three items, where the
   Patient Chart's has twelve. Chart Navigator - Load from File is not among
   them: art. 303794 runs it from a Patient Chart folder.

   Only Utilities is replaced here; the other menus keep the frame's set.
   ========================================================================= */

registerMenus('reports', (ctx) => ({
  Utilities: [
    { label: 'Provider Address to Clipboard' },
    { label: 'Patient Address to Clipboard (lookup)', onSelect: () => ctx.go.lookup?.() },
    { sep: true },
    { label: 'Change Teleplan Password', onSelect: () => ctx.go.open?.('change-teleplan-password') },
  ],
}))
