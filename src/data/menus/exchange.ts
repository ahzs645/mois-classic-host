import type { PBMenuItem } from '../../pb/components/chrome'
import { sendExchangeCommand } from '../exchangeStore'
import { registerMenus } from './index'

/* ============================================================================
   Data Exchange's menus — 303388 "Data Exchange Contents".

   Views (Alt+V) "remains consistent regardless of the folder selected"
   (image bb09e97a, v02.22.92: Imaging, Consults, Facility Admission,
   Procedure, Measure, Document, then MSP Claims and Lab Interface; the
   article's list adds CDM Toolkit, which that build does not show).

   Action (Alt+T) "varies depending on the folder opened". On a Manual Entry
   folder (image ab0bb230): Change Desktop Provider Alt+D, Open Chart
   Alt+F9, Save & Duplicate F3, Link to Order Ctrl+O, Attachments. On Attach
   Files (303490 image 153fe909): Change Desktop Provider, Open Chart,
   Create an Appointment, Link to Order Ctrl+O. Elsewhere only the two
   "consistencies between all folders" the article names.

   Utilities (Alt+U) "remains consistent regardless of the folder opened"
   (image 5162eef7): Provider Address to Clipboard, Patient Address to
   Clipboard (lookup), and Change Teleplan Password.
   ========================================================================= */

const MANUAL_ENTRY = new Set([
  'dx-measures', 'dx-imaging', 'dx-consults', 'dx-procedures', 'dx-documents', 'dx-admissions', 'dx-orders',
])

registerMenus('exchange', ({ node, go }) => {
  const view = (label: string, target: string): PBMenuItem => ({ label, onSelect: () => go.node?.(target) })
  /* "Open Chart (ALT F9) Will open to the Demographics folder of the
     selected patient's chart" */
  const openChart: PBMenuItem = { label: 'Open Chart', key: 'Alt+F9', onSelect: () => go.node?.('demographic') }
  const provider: PBMenuItem = { label: 'Change Desktop Provider', key: 'Alt+D' }
  const linkToOrder: PBMenuItem = { label: 'Link to Order', key: 'Ctrl+O', onSelect: () => go.open?.('order-linking-service') }

  const action: PBMenuItem[] = MANUAL_ENTRY.has(node)
    ? [
      provider,
      openChart,
      { label: 'Save & Duplicate', key: 'F3', onSelect: () => { sendExchangeCommand('save-and-duplicate') } },
      linkToOrder,
      { label: 'Attachments', onSelect: () => { sendExchangeCommand('attachments') } },
    ]
    : node === 'dx-attach-files'
      ? [provider, openChart, { label: 'Create an Appointment' }, linkToOrder]
      : [provider, openChart]

  return {
    Views: [
      view('Imaging', 'dx-imaging'),
      view('Consults', 'dx-consults'),
      view('Facility Admission', 'dx-admissions'),
      view('Procedure', 'dx-procedures'),
      view('Measure', 'dx-measures'),
      view('Document', 'dx-documents'),
      { sep: true },
      view('MSP Claims', 'dx-prepare-bills'),
      view('Lab Interface', 'dx-lab-results'),
    ],
    Action: action,
    Utilities: [
      { label: 'Provider Address to Clipboard' },
      { label: 'Patient Address to Clipboard (lookup)', onSelect: () => go.lookup?.() },
      { sep: true },
      /* the Billing area's window (screens/ChangeTeleplanPasswordDialog.tsx) */
      { label: 'Change Teleplan Password', onSelect: () => go.open?.('change-teleplan-password') },
    ],
  }
})
