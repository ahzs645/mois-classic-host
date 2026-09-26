/* ============================================================================
   The records behind "MOIS - Address Book".

   PROVENANCE
   · user capture 2026-09-25 #4, #5 (v02.31.23): the Address Book the MOIS
     Viewer's Find bar opens ("Provider + MSP" / "Provider + Address"). Its
     "Select from Type(s)" panel lists five record types, every one ticked:
     Internal Provider List, Internal Organization List, Internal Organization
     Role List, External Provider List, and "MOIS User (excluding users with
     provider accoun…" (cut off by the panel; completed here as "accounts").
     The Contact Lists tree reads "⊟ Regional" over "☐ quesnel".
   · user capture 2026-09-25 #40 (v02.31.23): the same window titled
     "MOIS - Address Book for Pharmacy List", raised by Select Medications to
     Print's "Add One". One type only — External Organization List — and a
     "Limit to Pharmacy List records" tick at the foot of the panel.

   Both captures show the grid empty ("Rows: 0"): no search was run. What a
   search returns is therefore NOT captured. The rows below are the stage's
   own directory, gathered from data the emulator already carries —
   `directoryEntries` (MOIS - Search Window: providers, organizations and
   organization roles, i.e. the internal lists) and the Master Provider List
   (Clinic Management ▸ External Service Providers, i.e. the external list) —
   plus the pharmacy the demographics fixture already names. No patient data.
   ========================================================================= */
import { clinicListSpecs } from './clinicManagement'
import { directoryEntries } from './providers'

export type AddressBookList =
  | 'Internal Provider List'
  | 'Internal Organization List'
  | 'Internal Organization Role List'
  | 'External Provider List'
  | 'MOIS User (excluding users with provider accounts)'
  | 'External Organization List'

export type AddressBookEntry = {
  name: string
  location: string
  city: string
  phone: string
  fax: string
  list: AddressBookList
  practNo?: string
  specialty?: string
  group?: string
  active: boolean
  /** a record on the Pharmacy List (External Organization List only) */
  pharmacy?: boolean
}

/** Which Address Book a caller raises: the Find bar's two, or the pharmacy picker. */
export type AddressBookMode = 'provider-msp' | 'provider-address' | 'pharmacy'

/** #4/#5: the five types, in the order the panel lists them. */
export const PROVIDER_TYPES: AddressBookList[] = [
  'Internal Provider List',
  'Internal Organization List',
  'Internal Organization Role List',
  'External Provider List',
  'MOIS User (excluding users with provider accounts)',
]

/** #40: the pharmacy book's single type. */
export const PHARMACY_TYPES: AddressBookList[] = ['External Organization List']

export const typesFor = (mode: AddressBookMode): AddressBookList[] => (mode === 'pharmacy' ? PHARMACY_TYPES : PROVIDER_TYPES)

/** #4/#5/#40: the Contact Lists tree. `quesnel` is a tickable child list. */
export const CONTACT_LISTS = { root: 'Regional', children: ['quesnel'] }

/** Each Parameters row: caption, and the field slug it is anchored by. */
export const ADDRESS_PARAMETERS = [
  { label: 'Name:', key: 'name' },
  { label: 'Pract. No.:', key: 'pract-no' },
  { label: 'Specialty:', key: 'specialty' },
  { label: 'Group:', key: 'group' },
  { label: 'City:', key: 'city' },
] as const

export type AddressParameterKey = (typeof ADDRESS_PARAMETERS)[number]['key']

/** Only "Includes" is captured; the other two are the stage's, UNVERIFIED. */
export const MATCH_MODES = ['Includes', 'Starts With', 'Equals'] as const
export type MatchMode = (typeof MATCH_MODES)[number]

const internal: AddressBookEntry[] = directoryEntries.map((d) => ({
  name: d.name,
  location: '',
  city: '',
  phone: '',
  fax: '',
  list: d.type === 'PROVIDER' ? 'Internal Provider List'
    : d.type === 'ORGROLE' ? 'Internal Organization Role List'
    : 'Internal Organization List',
  practNo: d.practitionerNo,
  group: d.group,
  active: d.active !== false,
}))

const external: AddressBookEntry[] = (clinicListSpecs.find((s) => s.node === 'ad-providers')?.rows ?? []).map((r) => ({
  name: String(r.name ?? ''),
  location: '',
  city: String(r.city ?? ''),
  phone: String(r.primary ?? ''),
  fax: String(r.fax ?? ''),
  list: 'External Provider List' as const,
  practNo: String(r.pract ?? ''),
  specialty: String(r.spec ?? ''),
  active: true,
}))

/* the pharmacy on the demographics fixture (patients.ts), and the two
   PHARMACY rows of Clinic Management's Contact List, which carry no phone */
const pharmacies: AddressBookEntry[] = [
  { name: 'LONDON DRUGS #51 - PRINCE GEORGE', location: 'Parkwood Place Mall', city: 'PRINCE GEORGE', phone: '1 250-561-1118', fax: '1 250-561-1050', list: 'External Organization List', active: true, pharmacy: true },
  ...(clinicListSpecs.find((s) => s.node === 'ad-contact-list')?.rows ?? [])
    .filter((r) => r.group === 'PHARMACY')
    .map((r): AddressBookEntry => ({
      name: String(r.list ?? ''), location: String(r.desc ?? ''), city: '', phone: '', fax: '',
      list: 'External Organization List', active: true, pharmacy: true,
    })),
]

export const addressBookEntries: AddressBookEntry[] = [...internal, ...external, ...pharmacies]

const matches = (value: string | undefined, wanted: string, mode: MatchMode) => {
  const want = wanted.trim().toUpperCase()
  if (!want) return true
  const have = (value ?? '').toUpperCase()
  return mode === 'Equals' ? have === want : mode === 'Starts With' ? have.startsWith(want) : have.includes(want)
}

/** What Search returns for the ticked types and the Parameters panel. */
export function searchAddressBook({
  types, params, modes, activeOnly, pharmacyOnly,
}: {
  types: Set<AddressBookList>
  params: Partial<Record<AddressParameterKey, string>>
  modes: Partial<Record<AddressParameterKey, MatchMode>>
  activeOnly: boolean
  pharmacyOnly?: boolean
}): AddressBookEntry[] {
  const mode = (k: AddressParameterKey) => modes[k] ?? 'Includes'
  return addressBookEntries
    .filter((e) => types.has(e.list))
    .filter((e) => !activeOnly || e.active)
    .filter((e) => !pharmacyOnly || e.pharmacy)
    .filter((e) => matches(e.name, params.name ?? '', mode('name'))
      && matches(e.practNo, params['pract-no'] ?? '', mode('pract-no'))
      && matches(e.specialty, params.specialty ?? '', mode('specialty'))
      && matches(e.group, params.group ?? '', mode('group'))
      && matches(e.city, params.city ?? '', mode('city')))
    .sort((a, b) => a.name.localeCompare(b.name))
}
