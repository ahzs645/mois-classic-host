import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import {
  ADDRESS_PARAMETERS, FAVOURITES_LIST, MATCH_MODES, addressBookEntries, blankContactDetail, externalOrganizationEntry,
  externalProviderEntry, onContactList, searchAddressBook, typesFor,
  type AddressBookEntry, type AddressBookList, type AddressBookMode, type AddressParameterKey, type ContactListDetail, type MatchMode,
} from '../data/addressBook'
import { SYSTEM_SETTINGS, SYSTEM_SETTINGS_KEY, settingRowId } from '../data/systemSettings'
import { useScreenReport } from '../host/screen-state'
import { useSessionState } from '../host/screen-windows'
import { PBButton, PBCheckbox, PBDataWindow, PBInput, PBSelect, PBWindow, pbSlug, usePBInstrumentation } from '../pb'
import { ContactListDetailWindow, useContactDetails } from './AddressBookAdminWindows'
import { registerAreaWindow } from './areaWindowRegistry'
import { MasterProviderWindow, NewMasterProviderDialog } from './ClinicEditorWindows'
import { AddExternalOrganizationDialog, useListRows } from './ExternalServiceWindows'
import { DesktopLayer } from './StageWindow'

/* ============================================================================
   MOIS - Address Book.

   PROVENANCE
   · user capture 2026-09-25 #4, #5 (v02.31.23) — "MOIS - Address Book",
     raised by the MOIS Viewer (Embedded) Find bar's Provider + MSP and
     Provider + Address. Close box only, about 1150 x 850 over the frame.
     Left, full height: "Contact Lists" (⊟ Regional, selected grey; ☐
     quesnel). Top middle: "Select from Type(s)" with blue All / Clear links
     in its caption and five ticked types, each row ruled off with a dotted
     line. Top right: "Parameters" — Name / Pract. No. / Specialty / Group /
     City, each a box and an "Includes" drop-down, ☑ Active Only beside Name,
     and a Search button under them. Below both: the grid Name · Location ·
     City · Phone · Fax with "Rows: 0" at its foot. Bottom: Save as Default ·
     My Favourites (left), Ok · Cancel (centre), an "Other Options..." combo
     and Go (right). Captions sit on a light-blue band in grey type.
   · user capture 2026-09-25 #40 (v02.31.23) — the same window as "MOIS -
     Address Book for Pharmacy List" from Select Medications to Print's
     "Add One": one type, External Organization List, and "☑ Limit to
     Pharmacy List records" at the foot of the type panel.
   · 2873865 (Address Book - Contact Lists): `70960d25…` — a recipient
     lookup's Contact Lists panel banded by group (⊟ FAVOURITE ▸ My
     Favourites, ⊟ HOSPITAL AND CLINICS …) and its seven types; `46bb77ee…`
     — "MOIS - Address Book for Paediatrician" (a Connection Role list):
     one type, "Searching only Paediatrician", and the heart column that
     puts a record on the user's favourites; `66285f4f…` Save As Default;
     `8dc0caaa…` My Favourites opens the favourites' Contact List Detail.
   · 3179351 (add External Organizations and Providers from the address
     lookup window): with System Settings ▸ APP SETTING - ADDRESS BOOK ▸
     Create External Organization / Provider from Window at E (everybody) or
     R (restricted), Other Options offers "Add an External Organization" /
     "Add an External Provider" (and "Update Current Record"); Go opens the
     window; "The new entry will now be highlighted in the address book
     list. It can also now be searched. It will also exist in the Admin
     module list." The option wording is the article's; its screenshots are
     missing from the manual, so the drop-down's look is the capture's
     combo. The practice user has the Organizations / Providers folder
     access R asks for, so R behaves as E here.

   Contact Lists are Administration ▸ Address Book ▸ Contact List's (this
   session's, AddressBookAdminWindows.tsx); an Auxiliary list is not shown
   (2873865: "These lists do NOT display in the Universal Provider Look up
   window"). Ticking lists narrows a search to their members. Save as
   Default keeps the ticked types and lists for this kind of lookup, for
   the stage session.

   Opening it
   · From a window's own state (the Viewer's Find bar, Select Medications to
     Print's "Add One"): render `<AddressBookWindow mode="pharmacy" onSelect
     onClose />` — it portals onto the desktop over whatever raised it.
   · By name (`host.mois.openUtility {window: 'address-book', mode,
     connectionRole}`, or `useOpenWindow()('address-book', { mode:
     'recipient' })`) when nothing else is using the area-window slot.

   Anchors: host.mois.dialog.address-book; host.mois.field.address-{name,
   pract-no, specialty, group, city} (+ `-match`), address-active-only,
   address-type-{slug}, address-pharmacy-only, address-contact-{slug},
   address-other-options; host.mois.command.{all, clear, search, ok,
   cancel, save-as-default, my-favourites, go, favourite-<slug>}; rows
   host.mois.row.address-{slug of name}.
   Reported: host.dialog = address-book, host.screen.addressBook = the mode,
   host.screen.addressBookRows = the grid's row count, addressBookLists (how
   many contact lists are ticked), addressBookOption (the Other Options
   pick, a slug), addressBookAdded (a quick-add was made).
   ========================================================================= */

const CAPTION: CSSProperties = {
  flex: 'none', display: 'flex', alignItems: 'center', gap: 16, height: 22, padding: '0 6px',
  background: '#cfdbee', color: '#8b8f96',
}
const PANEL: CSSProperties = { display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, background: '#fff', border: '1px solid #b9c3d3' }

function Panel({ caption, right, style, children }: { caption: string; right?: ReactNode; style?: CSSProperties; children: ReactNode }) {
  return (
    <div style={{ ...PANEL, ...style }}>
      <div style={CAPTION}><span>{caption}</span>{right}</div>
      {children}
    </div>
  )
}

function Link({ label, onClick }: { label: string; onClick: () => void }) {
  const host = usePBInstrumentation()
  return (
    <button
      type="button"
      className="pb-link"
      data-tutorial-id={host?.anchor('command', pbSlug(label))}
      onClick={() => { host?.report('command', { command: pbSlug(label) }); onClick() }}
    >
      {label}
    </button>
  )
}

/** A face button anchored and reported `host.mois.command.{slug}`. */
function Cmd({ label, onClick, w = 86, disabled }: { label: string; onClick?: () => void; w?: number; disabled?: boolean }) {
  const host = usePBInstrumentation()
  return (
    <PBButton
      disabled={disabled}
      data-tutorial-id={host?.anchor('command', pbSlug(label))}
      onClick={() => { host?.report('command', { command: pbSlug(label) }); onClick?.() }}
      style={{ minWidth: w }}
    >
      {label}
    </PBButton>
  )
}

const S = (v: unknown) => (v == null ? '' : String(v))

/** "E", "R" or "N" as System Settings holds it (committed value, else the shipped one). */
function useAddressSetting(name: string): string {
  const [committed] = useSessionState<Record<string, string>>(SYSTEM_SETTINGS_KEY, {})
  const setting = SYSTEM_SETTINGS.find((s) => s.band === 'APP SETTING - ADDRESS BOOK' && s.name === name)
  return setting ? S(committed[settingRowId(setting)] ?? setting.value).trim().toUpperCase() : 'N'
}

const OPTION_ORG = 'Add an External Organization'
const OPTION_PROVIDER = 'Add an External Provider'
const OPTION_UPDATE = 'Update Current Record'

type Default = { types: AddressBookList[]; lists: string[] }

export function AddressBookWindow({
  mode = 'provider-address', connectionRole, onClose, onSelect,
}: {
  /** the Find bar's Provider + MSP / Provider + Address, the pharmacy picker, or a recipient lookup */
  mode?: AddressBookMode
  /** a Connection Role lookup (a patient's Connections ▸ New ▸ Connection Role "…") */
  connectionRole?: string
  onClose: () => void
  /** Ok (or a double-click) with a row current; the window does not close itself */
  onSelect?: (entry: AddressBookEntry) => void
}) {
  const host = usePBInstrumentation()
  const pharmacy = mode === 'pharmacy'
  const allTypes: AddressBookList[] = connectionRole ? ['External Provider List'] : typesFor(mode)
  const [defaults, setDefaults] = useSessionState<Record<string, Default>>('address-book:defaults', {})
  const saved = defaults[connectionRole ? `role:${connectionRole}` : mode]
  const [types, setTypes] = useState<Set<AddressBookList>>(() => new Set(saved?.types.filter((t) => allTypes.includes(t)) ?? allTypes))
  const [ticked, setTicked] = useState<Set<string>>(() => new Set(saved?.lists ?? []))
  const [pharmacyOnly, setPharmacyOnly] = useState(true)
  const [params, setParams] = useState<Partial<Record<AddressParameterKey, string>>>({})
  const [modes, setModes] = useState<Partial<Record<AddressParameterKey, MatchMode>>>({})
  const [activeOnly, setActiveOnly] = useState(true)
  const [results, setResults] = useState<AddressBookEntry[] | null>(null)
  const [cur, setCur] = useState(0)
  const [option, setOption] = useState('Other Options...')
  const [popup, setPopup] = useState<null | 'org' | 'provider' | { master: string } | { org: string } | 'favourites'>(null)
  const [added, setAdded] = useState(false)
  const rows = useMemo(() => results ?? [], [results])

  /* the session's directory: the internal lists as shipped, and the external
     providers and organizations Administration holds now */
  const [masterProviders] = useListRows('ad-providers')
  const [organizations] = useListRows('ad-organizations')
  const [contactLists] = useListRows('ad-contact-list')
  const [details, setDetails] = useContactDetails()
  const entries = useMemo(() => {
    const orgs = organizations.map(externalOrganizationEntry)
    const names = new Set(orgs.map((o) => o.name))
    return [
      ...addressBookEntries.filter((e) => e.list !== 'External Provider List' && !names.has(e.name)),
      ...masterProviders.map(externalProviderEntry),
      ...orgs,
    ]
  }, [masterProviders, organizations])

  const orgSetting = useAddressSetting('Create External Organization from Window')
  const providerSetting = useAddressSetting('Create External Provider from Window')
  const options = [
    'Other Options...',
    ...(orgSetting === 'E' || orgSetting === 'R' ? [OPTION_ORG] : []),
    ...(providerSetting === 'E' || providerSetting === 'R' ? [OPTION_PROVIDER] : []),
    OPTION_UPDATE,
  ]

  /* the Contact Lists panel: bands of lists, favourites first; no Auxiliary */
  const bands = useMemo(() => {
    const byGroup = new Map<string, string[]>([['FAVOURITE', [FAVOURITES_LIST]]])
    for (const r of contactLists) {
      if (r.type === 'AUXILIARY' || r.group === 'AUXILARY') continue
      if (connectionRole && r.type === 'CONNECTION ROLE') continue
      const g = S(r.group)
      byGroup.set(g, [...(byGroup.get(g) ?? []), S(r.list)])
    }
    return [...byGroup.entries()]
  }, [contactLists, connectionRole])
  const detailOf = (list: string): ContactListDetail | undefined => details[list] ?? (contactLists.some((r) => S(r.list) === list) ? blankContactDetail() : undefined)
  const roleList = connectionRole ? contactLists.find((r) => r.type === 'CONNECTION ROLE' && (S(r.list) === connectionRole || details[S(r.list)]?.role === connectionRole)) : undefined
  const favourites = details[FAVOURITES_LIST] ?? blankContactDetail()
  const isFavourite = (e: AddressBookEntry) => [...favourites.masterProviders, ...favourites.masterOrganizations, ...favourites.providers, ...favourites.organizations, ...favourites.orgRoles, ...favourites.users].includes(e.name)

  useScreenReport({
    dialog: 'address-book', addressBook: mode, addressBookRows: rows.length, addressBookLists: ticked.size,
    addressBookOption: pbSlug(option), addressBookAdded: added,
  })

  const run = (extra?: AddressBookEntry) => {
    const inLists = (e: AddressBookEntry) => {
      if (roleList) {
        const d = detailOf(S(roleList.list))
        if (d && !onContactList(e, d, detailOf)) return false
      }
      if (!ticked.size) return true
      return [...ticked].some((l) => {
        const d = detailOf(l)
        return Boolean(d) && (l === FAVOURITES_LIST ? isFavourite(e) : onContactList(e, d!, detailOf))
      })
    }
    let found = searchAddressBook({ types, params, modes, activeOnly, pharmacyOnly: pharmacy && pharmacyOnly, entries, inLists })
    if (extra && !found.some((e) => e.name === extra.name)) found = [extra, ...found]
    setResults(found)
    setCur(extra ? Math.max(0, found.findIndex((e) => e.name === extra.name)) : 0)
  }
  const ok = () => {
    const picked = rows[cur]
    if (picked && onSelect) onSelect(picked)
    else onClose()
  }
  const toggleType = (t: AddressBookList, on: boolean) => setTypes((prev) => {
    const next = new Set(prev)
    if (on) next.add(t)
    else next.delete(t)
    return next
  })
  const toggleList = (l: string, on: boolean) => setTicked((prev) => {
    const next = new Set(prev)
    if (on) next.add(l)
    else next.delete(l)
    return next
  })
  const toggleFavourite = (e: AddressBookEntry) => {
    const field: keyof ContactListDetail = e.list === 'External Provider List' ? 'masterProviders'
      : e.list === 'External Organization List' ? 'masterOrganizations'
        : e.list === 'Internal Provider List' ? 'providers'
          : e.list === 'Internal Organization List' ? 'organizations'
            : e.list === 'Internal Organization Role List' ? 'orgRoles' : 'users'
    const have = favourites[field] as string[]
    setDetails({ ...details, [FAVOURITES_LIST]: { ...favourites, [field]: have.includes(e.name) ? have.filter((n) => n !== e.name) : [...have, e.name] } })
  }
  const go = () => {
    if (option === OPTION_ORG) setPopup('org')
    else if (option === OPTION_PROVIDER) setPopup('provider')
    else if (option === OPTION_UPDATE) {
      const e = rows[cur]
      if (e?.list === 'External Provider List') setPopup({ master: e.name })
      else if (e?.list === 'External Organization List') setPopup({ org: e.name })
    }
  }
  const title = connectionRole ? `MOIS - Address Book for ${connectionRole}` : pharmacy ? 'MOIS - Address Book for Pharmacy List' : 'MOIS - Address Book'

  return (
    <DesktopLayer>
      <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 90 }}>
        <PBWindow
          child
          controls={false}
          title={title}
          onClose={onClose}
          tutorialId="host.mois.dialog.address-book"
          style={{ width: 'min(1150px, calc(100% - 16px))', height: 'min(850px, calc(100% - 16px))' }}
        >
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'grid', gridTemplateColumns: '205px minmax(0, 300px) minmax(0, 1fr)', gridTemplateRows: 'auto minmax(0, 1fr)', gap: 5, padding: '6px 5px 0', background: 'var(--pb-face)' }}>
            {/* Contact Lists — full height */}
            <Panel caption="Contact Lists" style={{ gridRow: '1 / span 2' }}>
              <div style={{ padding: '2px 0', overflowY: 'auto' }}>
                {bands.map(([group, lists]) => (
                  <div key={group}>
                    <div
                      data-tutorial-id={host?.anchor('field', `address-contact-${pbSlug(group)}`)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, height: 22, padding: '0 8px 0 12px', background: '#e3e5e6' }}
                    >
                      <span aria-hidden="true" style={{ display: 'inline-grid', placeItems: 'center', width: 9, height: 9, border: '1px solid #8c8c8c', fontSize: 9, lineHeight: 1, background: '#fff' }}>−</span>
                      {group}
                    </div>
                    {lists.map((c) => (
                      <div key={c} style={{ display: 'flex', alignItems: 'center', height: 22, padding: '0 8px 0 10px' }}>
                        <PBCheckbox label={c} checked={ticked.has(c)} onChange={(v) => toggleList(c, v)} tutorialId={host?.anchor('field', `address-contact-${pbSlug(c)}`)} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </Panel>

            {/* Select from Type(s) */}
            <Panel
              caption="Select from Type(s)"
              right={<span style={{ display: 'inline-flex', gap: 16, marginLeft: 'auto', marginRight: 40 }}>
                <Link label="All" onClick={() => setTypes(new Set(allTypes))} />
                <Link label="Clear" onClick={() => setTypes(new Set())} />
              </span>}
              style={{ height: 205 }}
            >
              <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', padding: '2px 6px 4px' }}>
                {allTypes.map((t) => (
                  <div key={t} style={{ display: 'flex', alignItems: 'center', height: 24, borderBottom: '1px dotted #b8b8b8', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                    <PBCheckbox label={t} checked={types.has(t)} onChange={(v) => toggleType(t, v)} tutorialId={host?.anchor('field', `address-type-${pbSlug(t)}`)} />
                  </div>
                ))}
                {pharmacy && (
                  <div style={{ marginTop: 'auto' }}>
                    <PBCheckbox label="Limit to Pharmacy List records" checked={pharmacyOnly} onChange={setPharmacyOnly} tutorialId={host?.anchor('field', 'address-pharmacy-only')} />
                  </div>
                )}
              </div>
            </Panel>

            {/* Parameters */}
            <Panel caption="Parameters" style={{ height: 205 }}>
              <div style={{ padding: '6px 6px 0', display: 'grid', gridTemplateColumns: '66px minmax(0, 246px) 92px auto', columnGap: 4, rowGap: 3, alignItems: 'center' }}>
                {ADDRESS_PARAMETERS.map((p, i) => (
                  <span key={p.key} style={{ display: 'contents' }}>
                    <span>{p.label}</span>
                    <PBInput
                      w="100%"
                      value={params[p.key] ?? ''}
                      onChange={(e) => setParams((x) => ({ ...x, [p.key]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') run() }}
                      data-tutorial-id={host?.anchor('field', `address-${p.key}`)}
                    />
                    <PBSelect
                      w={92}
                      options={MATCH_MODES}
                      value={modes[p.key] ?? 'Includes'}
                      onChange={(e) => setModes((x) => ({ ...x, [p.key]: e.target.value as MatchMode }))}
                      data-tutorial-id={host?.anchor('field', `address-${p.key}-match`)}
                    />
                    {i === 0
                      ? <span style={{ paddingLeft: 6 }}><PBCheckbox label="Active Only" checked={activeOnly} onChange={setActiveOnly} tutorialId={host?.anchor('field', 'address-active-only')} /></span>
                      : <span />}
                  </span>
                ))}
              </div>
              <div className="pb-row" style={{ padding: '18px 0 0 12px', gap: 60 }}>
                <Cmd label="Search" onClick={() => run()} w={94} />
                {connectionRole && <span>Searching only {connectionRole}</span>}
              </div>
            </Panel>

            {/* the results grid, under the two top panels */}
            <div style={{ ...PANEL, gridColumn: '2 / span 2', position: 'relative' }}>
              <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
                <PBDataWindow
                  flush
                  columns={[
                    {
                      key: 'fav', header: '', width: 18, align: 'center',
                      /* `46bb77ee…`: the heart puts the record on My Favourites */
                      render: (r) => (
                        <button
                          type="button"
                          aria-label={isFavourite(r) ? 'Remove from favourites' : 'Add to favourites'}
                          data-tutorial-id={host?.anchor('command', `favourite-${pbSlug(r.name)}`)}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={() => { host?.report('command', { command: `favourite-${pbSlug(r.name)}` }); toggleFavourite(r) }}
                          style={{ border: 0, background: 'transparent', padding: 0, color: isFavourite(r) ? '#e00000' : '#9a9a9a', cursor: 'default' }}
                        >
                          ♥
                        </button>
                      ),
                    },
                    { key: 'name', header: 'Name', width: '33%' },
                    { key: 'location', header: 'Location', width: '25%' },
                    { key: 'city', header: 'City', width: '14%' },
                    { key: 'phone', header: 'Phone', width: '11%' },
                    { key: 'fax', header: 'Fax' },
                  ]}
                  rows={rows}
                  current={cur}
                  onCurrentChange={setCur}
                  onActivate={(_r, i) => { setCur(i); const picked = rows[i]; if (picked && onSelect) onSelect(picked) }}
                  rowTutorialId={(r) => `host.mois.row.address-${pbSlug(r.name)}`}
                  empty=""
                />
              </div>
              <div style={{ flex: 'none', padding: '2px 8px 4px', color: '#9a9a9a' }} data-tutorial-id={host?.anchor('field', 'address-rows')}>
                Rows: {rows.length}
              </div>
            </div>
          </div>

          {/* the button strip */}
          <div className="pb-footer" style={{ gap: 0, padding: '6px 5px' }}>
            <span style={{ display: 'flex', width: 205 }}>
              <Cmd label="Save as Default" w={0} onClick={() => setDefaults({ ...defaults, [connectionRole ? `role:${connectionRole}` : mode]: { types: [...types], lists: [...ticked] } })} />
              <Cmd label="My Favourites" w={0} onClick={() => setPopup('favourites')} />
            </span>
            <span className="pb-footer__spacer" />
            <span style={{ display: 'flex', gap: 10 }}>
              <Cmd label="Ok" onClick={ok} />
              <Cmd label="Cancel" onClick={onClose} />
            </span>
            <span className="pb-footer__spacer" />
            <span style={{ display: 'flex', gap: 6 }}>
              <PBSelect w={204} options={options} value={option} onChange={(e) => setOption(e.target.value)} data-tutorial-id={host?.anchor('field', 'address-other-options')} />
              <Cmd label="Go" w={62} disabled={option === 'Other Options...'} onClick={go} />
            </span>
          </div>
        </PBWindow>
      </div>

      {popup === 'org' && (
        <AddExternalOrganizationDialog
          onClose={() => setPopup(null)}
          onCreated={(name) => {
            setPopup(null); setAdded(true)
            run({ ...externalOrganizationEntry({ name }), name })
          }}
        />
      )}
      {popup === 'provider' && (
        <NewMasterProviderDialog
          close={() => setPopup(null)}
          /* Create Provider → the Provider Identification page (3179351) */
          open={(_id, args) => setPopup({ master: S(args?.key) })}
        />
      )}
      {popup !== null && typeof popup === 'object' && 'master' in popup && (
        <MasterProviderWindow
          rowKey={popup.master}
          close={() => {
            const name = popup.master
            setPopup(null); setAdded(true)
            run({ ...externalProviderEntry({ name }), name })
          }}
        />
      )}
      {popup !== null && typeof popup === 'object' && 'org' in popup && (
        <AddExternalOrganizationDialog
          existing={popup.org}
          onClose={() => setPopup(null)}
          onCreated={(name) => { setPopup(null); run({ ...externalOrganizationEntry({ name }), name }) }}
        />
      )}
      {popup === 'favourites' && <ContactListDetailWindow rowKey={FAVOURITES_LIST} close={() => setPopup(null)} />}
    </DesktopLayer>
  )
}

/* by name: `host.mois.openUtility {window: 'address-book', mode: 'recipient'}` */
registerAreaWindow('address-book', ({ args, close }) => (
  <AddressBookWindow
    mode={args.mode === 'pharmacy' || args.mode === 'provider-msp' || args.mode === 'recipient' ? args.mode : 'provider-address'}
    connectionRole={typeof args.connectionRole === 'string' ? args.connectionRole : undefined}
    onClose={close}
    onSelect={() => close()}
  />
))
