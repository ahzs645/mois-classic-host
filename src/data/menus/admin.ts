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
   · Views — 303377 image `05ed63f6` (v02.21.12 b161125): "The Views tool
               remains consistent regardless of the folder selected", and
               "Selecting one of the following will open the corresponding
               folder". Transcribed item for item with its six separators.
               The captions are the capture's own: `Teams` is the folder the
               current tree calls User Groups, `Task Sets` is Task Set
               Templates, `External Clinics / Providers` are External Service
               Providers ▸ Clinics / Providers. No newer capture of the menu
               exists, so the v02.21 captions stay (E2 stream, 2026-09-28).
   · Utilities wiring (E2): Provider Address to Clipboard and Patient
               Address to Clipboard open their pickers
               (screens/AdminUtilityWindows.tsx), SQL Editor and Intervention
               to MAR Converter their windows (same file), Change Teleplan
               Password the Billing window.
   ========================================================================= */

const sep: PBMenuItem = { sep: true }

const VIEWS: ([label: string, node: string] | null)[] = [
  ['Security Profiles', 'ad-security-profiles'], ['User Accounts', 'ad-users'], ['Teams', 'ad-user-groups'],
  null,
  ['Provider List', 'ad-provider-list'], ['Resource List', 'ad-resource-list'], ['Facility List', 'ad-facility-list'],
  ['Service Center', 'ad-service-centers'], ['Service Location', 'ad-locations'], ['Computer Registration', 'ad-computer'],
  ['Global Reminders', 'ad-reminders'], ['Clinic Favourite Meds', 'ad-meds'], ['Immunization Inventory', 'ad-immunization'],
  null,
  ['Prompt List', 'ad-prompt-lists'], ['Selection List', 'ad-selection-lists'], ['Auto-Update Utilities', 'ad-auto-update'],
  ['Text / Labels', 'ad-text-labels'], ['Snippet', 'ad-snippet'],
  null,
  ['Concept Mapping', 'ad-concept'], ['Encounter Form', 'ad-encounter-form'], ['Flowsheet', 'ad-flowsheet'],
  ['Measurement Inputs', 'ad-measure-inputs'], ['Letter Templates', 'ad-letters'], ['Paper (PDF) Forms', 'ad-paper-forms'],
  ['Care Plan Templates', 'ad-careplan-templates'], ['Task Sets', 'ad-task-sets'],
  null,
  ['External Clinics', 'ad-clinics'], ['External Providers', 'ad-providers'], ['Organizations', 'ad-organizations'],
  null,
  ['System Settings', 'ad-settings'], ['Chart Summaries', 'ad-chart-summaries'], ['Field Audit Setup', 'ad-field-audit'],
  ['Password Policy', 'ad-password'],
]

registerMenus('admin', (ctx) => {
  const utilities: PBMenuItem[] = [
    /* LFP time windows (screens/LfpTimeWindows.tsx): 3295289 `00c2fa04…`
       shows them at the head of this menu in the LFP clinic's build (under
       Switch Service Group / Pathway, which is not modelled) — A2 stream */
    { label: 'Time Entry', key: 'Ctrl+Shift+T', onSelect: () => ctx.go.open?.('time-entry') },
    { label: 'Time Logger', key: 'Ctrl+Shift+L', onSelect: () => ctx.go.open?.('time-logger') },
    { label: 'Provider Address to Clipboard', onSelect: () => ctx.go.open?.('provider-address-clipboard') },
    { label: 'Patient Address to Clipboard (lookup)', onSelect: () => ctx.go.open?.('patient-address-clipboard', { lookup: true }) },
    sep,
    { label: 'Change Teleplan Password', onSelect: () => ctx.go.open?.('change-teleplan-password') },
    { label: 'SQL Editor', onSelect: () => ctx.go.open?.('sql-editor') },
    { label: 'Data Extraction, Access, & Control', onSelect: () => ctx.go.open?.('deacon') },
    { label: 'Intervention to MAR Converter', onSelect: () => ctx.go.open?.('intervention-mar-converter') },
  ]
  const views: PBMenuItem[] = VIEWS.map((v) => (v ? { label: v[0], onSelect: () => ctx.go.node?.(v[1]) } : sep))
  if (ctx.node === 'ad-provider-list') {
    utilities.push(sep, {
      label: 'Convert to Different Provider Type',
      onSelect: () => ctx.go.open?.('provider-type-conversion'),
    })
  }
  return { Views: views, Utilities: utilities }
})
