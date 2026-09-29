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
import { S } from './text'

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

/** Which Address Book a caller raises: the Find bar's two, the pharmacy
    picker, or a recipient lookup (fax / letter / referral, 2873865 `70960d25…`). */
export type AddressBookMode = 'provider-msp' | 'provider-address' | 'pharmacy' | 'recipient'

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

/** 2873865 `70960d25…`: a recipient lookup lists the external organizations
    too (its CDX Provider Group / CDX Location lists are not built). */
export const RECIPIENT_TYPES: AddressBookList[] = [
  'Internal Provider List',
  'Internal Organization List',
  'Internal Organization Role List',
  'External Provider List',
  'External Organization List',
]

export const typesFor = (mode: AddressBookMode): AddressBookList[] => (
  mode === 'pharmacy' ? PHARMACY_TYPES : mode === 'recipient' ? RECIPIENT_TYPES : PROVIDER_TYPES)

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
  types, params, modes, activeOnly, pharmacyOnly, entries = addressBookEntries, inLists,
}: {
  types: Set<AddressBookList>
  params: Partial<Record<AddressParameterKey, string>>
  modes: Partial<Record<AddressParameterKey, MatchMode>>
  activeOnly: boolean
  pharmacyOnly?: boolean
  /** the directory to search — the stage session's, where a window has it */
  entries?: AddressBookEntry[]
  /** the ticked Contact Lists, as a membership test */
  inLists?: (e: AddressBookEntry) => boolean
}): AddressBookEntry[] {
  const mode = (k: AddressParameterKey) => modes[k] ?? 'Includes'
  return entries
    .filter((e) => types.has(e.list))
    .filter((e) => !inLists || inLists(e))
    .filter((e) => !activeOnly || e.active)
    .filter((e) => !pharmacyOnly || e.pharmacy)
    .filter((e) => matches(e.name, params.name ?? '', mode('name'))
      && matches(e.practNo, params['pract-no'] ?? '', mode('pract-no'))
      && matches(e.specialty, params.specialty ?? '', mode('specialty'))
      && matches(e.group, params.group ?? '', mode('group'))
      && matches(e.city, params.city ?? '', mode('city')))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/* ============================================================================
   Address Book ▸ Contact Lists — what a list holds.

   PROVENANCE: 2873865 "Address Book - Contact Lists":
     `bdf7df43…`, `63c909fb…`  New Contact List: Type of List ○ Standard
                  ○ Connection Role ○ Auxilary (shipped spelling); Standard
                  asks Group / List Name / Description, Connection Role asks
                  the Connection Role; Create Record / Cancel.
     `df8c9336…`, `0c6f2364…`, `db896347…`, `4c1759f5…`, `e6471409…`
                  Contact List Detail — tabs Summary · City(s) · Clinic
                  Service Providers · External Service Providers (Master
                  Provider List / Master Organization List) · Other Contact
                  List(s) with Join Type Or (all records) / And (common
                  records); Save Changes (F2) / Close.
     `faf4c8cc…`, `0e8b102d…`  Change Settings — All Values (a search box)
                  › / ‹ Selected Value(s), Save / Cancel.
     `46bb77ee…`  the Address Book with a FAVOURITE ▸ My Favourites list and
                  the heart column; `66285f4f…` Save As Default.
   A list is a union of the records named on its tabs (and, where it has
   them, every provider with a named specialty or organization with a named
   type), narrowed to its cities, then joined to its linked lists by the
   Join Type. That rule is the article's description of each tab put
   together; MOIS's own query is not documented.
   ========================================================================= */

export type ContactListType = 'STANDARD' | 'CONNECTION ROLE' | 'AUXILIARY'

export type ContactListDetail = {
  cities: string[]
  providers: string[]
  organizations: string[]
  orgRoles: string[]
  users: string[]
  masterProviders: string[]
  specialties: string[]
  masterOrganizations: string[]
  orgTypes: string[]
  linked: string[]
  join: 'or' | 'and'
  /** a Connection Role list's role */
  role?: string
}

export const blankContactDetail = (): ContactListDetail => ({
  cities: [], providers: [], organizations: [], orgRoles: [], users: [], masterProviders: [], specialties: [],
  masterOrganizations: [], orgTypes: [], linked: [], join: 'or',
})

/** Session key of a contact list's detail. */
export const contactDetailKey = (list: string) => `admin:contact-list:${list}`
/** The user's own FAVOURITE ▸ My Favourites list (`46bb77ee…`, `e6471409…`). */
export const FAVOURITES_LIST = 'My Favourites'

/** Connection roles a Connection Role list is built for (INFERRED beyond Paediatrician). */
export const CONNECTION_ROLES = ['Paediatrician', 'Family Physician', 'Specialist', 'Pharmacist', 'Home Care Nurse', 'Mental Health Clinician']

/** The Change Settings picker's specialty names (`0e8b102d…`, the College's list). */
export const SPECIALTIES = [
  'Cardiology', 'Dermatology', 'Family Medicine', 'General Surgery', 'Internal Medicine', 'Obstetrics & Gynecology',
  'Orthopedics', 'Pediatric Cardiology', 'Pediatric Emergency Medicine', 'Pediatrics', 'Psychiatry',
  'RCPSC - Developmental Pediatrics', 'RCPSC - Pediatric Cardiology', 'RCPSC - Pediatric Emergency Medicine',
  'RCPSC - Pediatric Surgery', 'RCPSC - Pediatrics',
]

/** Cities the lookup's sources carry (`db896347…` shows PRINCE GEORGE and PRINCE GEORGE, BC). */
export const CONTACT_CITIES = ['BURNS LAKE', 'MCBRIDE', 'PRINCE GEORGE', 'PRINCE GEORGE, BC', 'QUESNEL', 'SMITHERS', 'TERRACE', 'VANDERHOOF']

/** The shipped lists' contents, where a list has any. */
export const SEED_CONTACT_DETAILS: Record<string, Partial<ContactListDetail>> = {
  quesnel: { cities: ['QUESNEL'] },
  'LIFELABS - PRINCE GEORGE': { orgTypes: ['LABS'] },
  'UHNBC MEDICAL IMAGING': { orgTypes: ['IMAGING'] },
  'NORTHERN HEALTH PUBLIC HEALTH': { masterOrganizations: ['NORTHERN HEALTH PUBLIC HEALTH'] },
}

/** External providers as directory entries (Clinic Management's session rows). */
export function externalProviderEntry(r: Record<string, unknown>): AddressBookEntry {
  return {
    name: S(r.name), location: S(r.address1), city: S(r.city), phone: S(r.primary), fax: S(r.fax),
    list: 'External Provider List', practNo: S(r.pract), specialty: S(r.spec), active: true,
  }
}

/** External organizations as directory entries. */
export function externalOrganizationEntry(r: Record<string, unknown>): AddressBookEntry & { orgType: string } {
  return {
    name: S(r.name), location: S(r.address1), city: S(r.city), phone: S(r.phone), fax: S(r.fax),
    list: 'External Organization List', group: S(r.orgType), orgType: S(r.orgType), active: true,
    pharmacy: S(r.orgType) === 'PHARMACY',
  }
}

/** Is an entry on a list? `detailOf` resolves a linked list's own detail. */
export function onContactList(e: AddressBookEntry, d: ContactListDetail, detailOf: (list: string) => ContactListDetail | undefined, depth = 0): boolean {
  const up = (v: string | undefined) => (v ?? '').toUpperCase()
  const named = [...d.providers, ...d.organizations, ...d.orgRoles, ...d.users, ...d.masterProviders, ...d.masterOrganizations].map(up)
  const specialty = (e.specialty ?? '').replace(/^\d+\s+/, '')
  const picks = named.length + d.specialties.length + d.orgTypes.length
  let hit = picks === 0
    || named.includes(up(e.name))
    || (e.list === 'External Provider List' && d.specialties.some((s) => up(specialty).includes(up(s)) || up(s).includes(up(specialty))))
    || (e.list === 'External Organization List' && d.orgTypes.map(up).includes(up(e.group)))
  if (d.cities.length) hit = hit && d.cities.some((c) => up(c).startsWith(up(e.city)) && up(e.city) !== '')
  if (d.linked.length && depth < 3) {
    const linked = d.linked.map((l) => detailOf(l)).filter((x): x is ContactListDetail => Boolean(x))
    const others = linked.map((x) => onContactList(e, x, detailOf, depth + 1))
    hit = d.join === 'and' ? hit && others.every(Boolean) : hit || others.some(Boolean)
  }
  return hit
}
