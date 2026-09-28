import type { ScreenWindow } from '../host/screen-windows'
import { registerScreenWindows } from '../host/screen-windows'
import { ContactListDetailWindow, NewContactListDialog } from './AddressBookAdminWindows'
import { ClinicDetailWindow, ExternalOrganizationsView, NewClinicDialog, ServiceLocationView } from './ExternalServiceWindows'
import { NewOrgProfileDialog, OrgWindow } from './OrgRoleWindows'

/* ============================================================================
   The Administration windows the admin/reference stream added to the
   Clinic Management list screens (ClinicListView.tsx renders this layer
   beside ClinicEditorLayer, from the same screen-window slot):

     new-org-role-profile / org-role            Org Role List      OrgRoleWindows
     new-organization-profile / organization    Organization List  OrgRoleWindows
     new-contact-list / contact-list-detail     Address Book ▸ Contact List
                                                                   AddressBookAdminWindows
     new-clinic / clinic-detail                 External Service Providers ▸
                                                Clinics            ExternalServiceWindows

   and the two lists ClinicListView hands over whole because they are edited
   in place with a bound detail pane: Organizations (External Service
   Providers) and Service Location.

   Each id is registered, so `host.mois.openUtility {window}` and a menu's
   `go.open(id)` reach it; the args carry `{ key }`, the row's name or code.
   ========================================================================= */

export const ADMIN_EXTRA_WINDOWS = [
  'new-org-role-profile', 'new-organization-profile', 'org-role', 'organization',
  'new-contact-list', 'contact-list-detail', 'new-clinic', 'clinic-detail',
] as const
registerScreenWindows([...ADMIN_EXTRA_WINDOWS])

/** New Record / Edit Record windows for the lists above, by tree node. */
export const EXTRA_NEW_RECORD: Record<string, string> = {
  'ad-org-role-list': 'new-org-role-profile',
  'ad-org-list': 'new-organization-profile',
  'ad-contact-list': 'new-contact-list',
  'ad-clinics': 'new-clinic',
}
export const EXTRA_EDIT_RECORD: Record<string, string> = {
  'ad-org-role-list': 'org-role',
  'ad-org-list': 'organization',
  'ad-contact-list': 'contact-list-detail',
  'ad-clinics': 'clinic-detail',
}

/** The list screens this stream draws itself (edited in place). */
export function adminOwnList(node: string) {
  if (node === 'ad-organizations') return <ExternalOrganizationsView key={node} />
  if (node === 'ad-locations') return <ServiceLocationView key={node} />
  return null
}

export function AdminExtraLayer({ window: win, close, open, onAdded }: {
  window: ScreenWindow | null
  close: () => void
  open: (id: string, args?: Record<string, unknown>) => void
  onAdded?: () => void
}) {
  if (!win) return null
  const key = win.args?.key == null ? '' : String(win.args.key)
  switch (win.id) {
    case 'new-org-role-profile': return <NewOrgProfileDialog kind="org-role" close={close} open={open} onAdded={onAdded} />
    case 'new-organization-profile': return <NewOrgProfileDialog kind="organization" close={close} open={open} onAdded={onAdded} />
    case 'org-role': return <OrgWindow key={key} kind="org-role" rowKey={key} close={close} />
    case 'organization': return <OrgWindow key={key} kind="organization" rowKey={key} close={close} />
    case 'new-contact-list': return <NewContactListDialog close={close} open={open} onAdded={onAdded} />
    case 'contact-list-detail': return <ContactListDetailWindow key={key} rowKey={key} close={close} />
    case 'new-clinic': return <NewClinicDialog close={close} open={open} onAdded={onAdded} />
    case 'clinic-detail': return <ClinicDetailWindow key={key} rowKey={key} close={close} />
    default: return null
  }
}
