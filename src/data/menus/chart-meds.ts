import type { PBMenuItem } from '../../pb/components/chrome'
import { registerMenus, type MenuContext } from './index'

/* ============================================================================
   The medication folders' Action menu.

   MOIS rebuilds Action for the folder you are on. On Prescriptions it gains
   the row commands of the Rx window — transcribed from 303232
   `0949562b…png` (v02.20.04), in its order and with its accelerators:

     Account Summary · Invoice Window · Create Referral Note · Create Consult
     Note · Print Prescription · Duplicate Row · Add to Long Term Medication ·
     Add to Favourite Medications · Select from Favourite Medication · Link to
     Encounter | View Prescription Print Log · Void Prescription · UnVoid
     Prescription | Print Label | Change Desktop Provider | Create Task ·
     Create Message · Attachments | View Acknowledge History

   Long Term Medication's Action menu is not captured. 303234 says its "Add to
   My Favourites" is "also available under 'Action' on the toolbar" from both
   folders, so it keeps the chart's own Action list with the two favourites
   items added where the Rx menu has them — nothing else is invented.

   The MAR's row commands live on its right-click menu (1741600
   `169730ee…png`, screens/MarView.tsx); no capture shows the MAR's Action
   menu, so it keeps the chart's.

   Each item opens its window through the frame's `openWindowById`
   (host/screen-windows.tsx), the same switch the folder's buttons use.
   ========================================================================= */

const open = (ctx: MenuContext, id: string, args?: Record<string, unknown>) => () => ctx.go.open?.(id, args)

function rxAction(ctx: MenuContext): PBMenuItem[] {
  return [
    { label: 'Account Summary', key: 'Alt+F1' },
    { label: 'Invoice Window', key: 'Alt+I' },
    { label: 'Create Referral Note', key: 'Ctrl+R', onSelect: () => ctx.go.letter?.('referral') },
    { label: 'Create Consult Note', key: 'Ctrl+Shift+R', onSelect: () => ctx.go.letter?.('consult') },
    { label: 'Print Prescription', key: 'Ctrl+P', onSelect: open(ctx, 'print-rx') },
    { label: 'Duplicate Row', key: 'Ctrl+D', onSelect: open(ctx, 'rx-duplicate') },
    { label: 'Add to Long Term Medication', key: 'Ctrl+U', onSelect: open(ctx, 'rx-add-to-long-term') },
    { label: 'Add to Favourite Medications', onSelect: open(ctx, 'add-to-favourites') },
    { label: 'Select from Favourite Medication', key: 'Shift+F4', onSelect: open(ctx, 'favourite-medication-list') },
    { label: 'Link to Encounter' },
    { sep: true },
    { label: 'View Prescription Print Log', onSelect: open(ctx, 'prescription-history') },
    { label: 'Void Prescription', onSelect: open(ctx, 'void-prescription') },
    { label: 'UnVoid Prescription', onSelect: open(ctx, 'unvoid-prescription') },
    { sep: true },
    { label: 'Print Label', key: 'Ctrl+L' },
    { sep: true },
    { label: 'Change Desktop Provider', key: 'Alt+D' },
    { sep: true },
    { label: 'Create Task', key: 'Ctrl+K', onSelect: open(ctx, 'create-task') },
    { label: 'Create Message', key: 'Ctrl+M', onSelect: open(ctx, 'create-message') },
    { label: 'Attachments', onSelect: open(ctx, 'add-attachment') },
    { sep: true },
    { label: 'View Acknowledge History' },
  ]
}

function ltmAction(ctx: MenuContext): PBMenuItem[] {
  return [
    { label: 'Account Summary', key: 'Alt+F1' },
    { label: 'Invoice Window', key: 'Alt+I' },
    { label: 'Create Referral Note', key: 'Ctrl+R', onSelect: () => ctx.go.letter?.('referral') },
    { label: 'Create Consult Note', key: 'Ctrl+Shift+R', onSelect: () => ctx.go.letter?.('consult') },
    { label: 'Create Information Request', onSelect: () => ctx.go.letter?.('information-request') },
    { label: 'Distribute Encounter Summary', key: 'Ctrl+Shift+E' },
    { label: 'Add to Favourite Medications', onSelect: open(ctx, 'add-to-favourites') },
    { label: 'Select from Favourite Medication', key: 'Shift+F4', onSelect: open(ctx, 'favourite-medication-list') },
    { label: 'Print Label', key: 'Ctrl+L' },
    { sep: true },
    { label: 'Change Desktop Provider', key: 'Alt+D' },
    { label: 'Create an Appointment' },
    { sep: true },
    { label: 'Create Task', key: 'Ctrl+K', onSelect: open(ctx, 'create-task') },
    { label: 'Create Message', key: 'Ctrl+M', onSelect: open(ctx, 'create-message') },
    { sep: true },
    { label: 'Workflow Summary' },
  ]
}

registerMenus('chart:rx', (ctx) => ({ Action: rxAction(ctx) }))
registerMenus('chart:ltm', (ctx) => ({ Action: ltmAction(ctx) }))
