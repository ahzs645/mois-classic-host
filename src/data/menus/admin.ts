import type { PBMenuItem } from '../../pb/components/chrome'
import { registerMenus } from './index'
/* the two windows these menus open register themselves by id */
import '../../screens/DeaconWindow'
import '../../screens/ProviderTypeConversionDialog'

/* ============================================================================
   The Administration module's menus.

   PROVENANCE
   · Utilities — 2090817 image `25f1dd8f` (v02.30, the Provider List in
               front): Provider Address to Clipboard, Patient Address to
               Clipboard (lookup) | Change Teleplan Password, SQL Editor,
               Data Extraction, Access, & Control, Intervention to MAR
               Converter | Convert to Different Provider Type. The last item
               and its separator are the Provider List's own (2090817:
               "Highlight the Provider … Select Utilities and choose 'Convert
               to Different Provider Type'"); the rest are the module's.
               303367 and 3258362 send an administrator here for DEACON
               ("Click on the Utilities menu … Click on Data Extraction,
               Access, & Control").
   ========================================================================= */

const sep: PBMenuItem = { sep: true }

registerMenus('admin', (ctx) => {
  const utilities: PBMenuItem[] = [
    { label: 'Provider Address to Clipboard' },
    { label: 'Patient Address to Clipboard (lookup)', onSelect: () => ctx.go.lookup?.() },
    sep,
    { label: 'Change Teleplan Password' },
    { label: 'SQL Editor' },
    { label: 'Data Extraction, Access, & Control', onSelect: () => ctx.go.open?.('deacon') },
    { label: 'Intervention to MAR Converter' },
  ]
  if (ctx.node === 'ad-provider-list') {
    utilities.push(sep, {
      label: 'Convert to Different Provider Type',
      onSelect: () => ctx.go.open?.('provider-type-conversion'),
    })
  }
  return { Utilities: utilities }
})
