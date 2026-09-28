import { useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { PBDataWindow, PBInput, PBRadio, PBSelect, PBTabs, pbSlug, usePBInstrumentation } from '../pb'
import {
  CONNECTION_ROLES, CONTACT_CITIES, FAVOURITES_LIST, SEED_CONTACT_DETAILS, SPECIALTIES, blankContactDetail,
  type ContactListDetail, type ContactListType,
} from '../data/addressBook'
import { CONTACT_LIST_GROUP, EXTERNAL_ORGANIZATION_TYPE, valueSetValues } from '../data/codesets'
import type { ClinicRow } from '../data/clinicManagement'
import { useScreenReport } from '../host/screen-state'
import { useSessionState } from '../host/screen-windows'
import { useValueSets } from './adminSession'
import { ButtonBand, CentredFooter, Cmd, Line, NavyBand, onF2 } from './adminKit'
import { DemographicModal } from './DemographicDialogs'
import { useListRows } from './ExternalServiceWindows'
import { userNames } from './ProviderTabGrids'

/* ============================================================================
   Administration ▸ Address Book ▸ Contact List — New Contact List, Contact
   List Detail and its Change Settings picker.

   PROVENANCE: 2873865 (see data/addressBook.ts for every capture):
     New Contact List  `bdf7df43…` (Standard: Group DEPARTMENTS, List Name,
                       Description), `63c909fb…` (Connection Role: the role
                       drop-down), `df3d9540…` (Auxilary).
     Contact List Detail `df8c9336…`, `0c6f2364…` (External Service
                       Providers ▸ Master Provider List: "This section allows
                       you to include specific, named providers or providers
                       with a selected specialty(s)", Selected Individual
                       Provider(s) Change, Selected Specialty(s) Change),
                       `db896347…` (City(s): "This section allows you limit
                       the contact list to selected city(s)"), `4c1759f5…`
                       (Other Contact List(s): Linked Contact List(s) Change,
                       Join Type ○ Or (all records) ○ And (common records)),
                       `e6471409…` (Summary: "Contact List Summary", Section:
                       External Service Providers, Master Providers records:
                       5, Organizations records: 4; Save Changes (F2) /
                       Close).
     Change Settings   `faf4c8cc…` (Organization Type), `0e8b102d…`
                       (Specialty Name): All Values with a search box, the
                       already-selected values greyed; › "(add selected)",
                       ‹ "(remove selected)"; Selected Value(s); a double-
                       click moves one value, Shift / Ctrl pick several;
                       Save / Cancel.

   INFERRED: the Clinic Service Providers tab's inside (2873865 lists its
   four sources — Provider(s), Organization(s), Organization Role(s),
   User(s) — but never opens it); the Master Organization List sub-tab
   beyond its "Selected Org Type(s)" Change (the article's step list);
   the Connection Role list's name and description (the role, as
   `0c6f2364…` shows PAED / Paediatrician).

   What a list holds is kept for the stage session in one map (every list's
   detail), which is what the Address Book's Contact Lists panel filters by.

   Anchors: dialogs new-contact-list, contact-list-detail, change-settings;
   fields list-type-<standard|connection-role|auxiliary>, contact-group,
   list-name, list-description, connection-role, join-or, join-and,
   change-search; commands create-record, cancel, save-changes,
   contact-close, contact-<section>-change (e.g. contact-orgtypes-change,
   contact-specialties-change, contact-cities-change), change-add, change-remove,
   change-save, change-cancel; rows host.mois.row.all-<slug>,
   selected-<slug>.
   ========================================================================= */

const S = (v: unknown) => (v == null ? '' : String(v))

export const CONTACT_DETAILS_KEY = 'admin:contact-list-details'

const SEED: Record<string, ContactListDetail> = Object.fromEntries(
  Object.entries(SEED_CONTACT_DETAILS).map(([k, d]) => [k, { ...blankContactDetail(), ...d }]),
)

/** Every list's detail, this session. */
export function useContactDetails() {
  return useSessionState<Record<string, ContactListDetail>>(CONTACT_DETAILS_KEY, SEED)
}

/* ===========================================================================
   New Contact List                       `bdf7df43…`, `63c909fb…`
   ======================================================================== */

export function NewContactListDialog({ close, open, onAdded }: {
  close: () => void; open: (id: string, args?: Record<string, unknown>) => void; onAdded?: () => void
}) {
  const [rows, update] = useListRows('ad-contact-list')
  const [details, setDetails] = useContactDetails()
  const [valueSets] = useValueSets()
  const [type, setType] = useState<ContactListType>('STANDARD')
  const [group, setGroup] = useState('')
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [role, setRole] = useState(CONNECTION_ROLES[0]!)
  const groups = ['', ...valueSetValues(valueSets, CONTACT_LIST_GROUP)]
  useScreenReport({ listType: pbSlug(type) })
  const create = () => {
    const list = type === 'CONNECTION ROLE' ? role : name.trim()
    if (!list || rows.some((r) => S(r.list) === list)) return
    if (type === 'STANDARD' && !group) return
    const g = type === 'STANDARD' ? group : type === 'CONNECTION ROLE' ? 'CONNECTION ROLE' : 'AUXILARY'
    /* the list bands its rows by Group, so they stay sorted by it */
    update((all) => [...all, { group: g, list, desc: type === 'CONNECTION ROLE' ? role : desc, type }]
      .sort((a, b) => S(a.group).localeCompare(S(b.group))))
    setDetails({ ...details, [list]: { ...blankContactDetail(), ...(type === 'CONNECTION ROLE' ? { role } : null) } })
    onAdded?.()
    open('contact-list-detail', { key: list })
  }
  const radio = (t: ContactListType, label: string) => (
    <div style={{ padding: '2px 0' }}>
      <PBRadio name="list-type" label={label} checked={type === t} onChange={() => setType(t)} tutorialId={`host.mois.field.list-type-${pbSlug(t)}`} />
    </div>
  )
  return (
    <DemographicModal title="New Contact List" width={560} onClose={close} dialog="new-contact-list">
      <div style={{ margin: '12px 14px 0', border: '1px solid #9a9a9a', background: 'var(--pb-face)' }}>
        <div style={{ background: 'linear-gradient(#ecebe8, #d8d5d0)', fontWeight: 700, padding: '3px 6px', borderBottom: '1px solid #9a9a9a' }}>New List Information</div>
        <div className="pb-row" style={{ alignItems: 'flex-start', gap: 20, padding: '6px 10px', borderBottom: '1px solid #9a9a9a' }}>
          <span style={{ width: 80 }}>Type of List:</span>
          <div>
            {radio('STANDARD', 'Standard')}
            {radio('CONNECTION ROLE', 'Connection Role')}
            {/* shipped spelling */}
            {radio('AUXILIARY', 'Auxilary')}
          </div>
        </div>
        <div style={{ padding: '8px 10px 20px', minHeight: 80 }}>
          {type === 'CONNECTION ROLE'
            ? <Line label="Connection Role:" w={96}><PBSelect w={270} options={CONNECTION_ROLES} value={role} onChange={(e) => setRole(e.target.value)} data-tutorial-id="host.mois.field.connection-role" /></Line>
            : (
              <>
                {type === 'STANDARD' && <Line label="Group:" w={80}><PBSelect w={220} options={groups} value={group} onChange={(e) => setGroup(e.target.value)} data-tutorial-id="host.mois.field.contact-group" /></Line>}
                <Line label="List Name:" w={80}><PBInput w={350} value={name} onChange={(e) => setName(e.target.value)} data-tutorial-id="host.mois.field.list-name" /></Line>
                <Line label="Description:" w={80}><PBInput w={350} value={desc} onChange={(e) => setDesc(e.target.value)} data-tutorial-id="host.mois.field.list-description" /></Line>
              </>
            )}
        </div>
      </div>
      <CentredFooter>
        <Cmd id="create-record" w={96} onClick={create}>Create Record</Cmd>
        <Cmd id="cancel" w={88} onClick={close}>Cancel</Cmd>
      </CentredFooter>
    </DemographicModal>
  )
}

/* ===========================================================================
   Contact List Detail
   ======================================================================== */

const TABS = ['Summary', 'City(s)', 'Clinic Service Providers', 'External Service Providers', 'Other Contact List(s)']

type Section = keyof Omit<ContactListDetail, 'join' | 'role'>
const SECTION_LABEL: Record<Section, { caption: string; column: string }> = {
  cities: { caption: 'Selected City(s)', column: 'City' },
  providers: { caption: 'Selected Provider(s)', column: 'Provider' },
  organizations: { caption: 'Selected Organization(s)', column: 'Organization' },
  orgRoles: { caption: 'Selected Organization Role(s)', column: 'Organization Role' },
  users: { caption: 'Selected User(s)', column: 'User' },
  masterProviders: { caption: 'Selected Individual Provider(s)', column: 'Name' },
  specialties: { caption: 'Selected Specialty(s)', column: 'Specialty' },
  masterOrganizations: { caption: 'Selected Individual Organization(s)', column: 'Name' },
  orgTypes: { caption: 'Selected Org Type(s)', column: 'Organization Type' },
  linked: { caption: 'Linked Contact List(s)', column: 'Contact List' },
}

export function ContactListDetailWindow({ rowKey, close }: { rowKey: string; close: () => void }) {
  const [rows, update] = useListRows('ad-contact-list')
  const [details, setDetails] = useContactDetails()
  const [valueSets] = useValueSets()
  const [clinicProviders] = useListRows('ad-provider-list')
  const [orgs] = useListRows('ad-org-list')
  const [orgRoles] = useListRows('ad-org-role-list')
  const [masterProviders] = useListRows('ad-providers')
  const [masterOrgs] = useListRows('ad-organizations')
  const favourites = rowKey === FAVOURITES_LIST
  const row: ClinicRow = rows.find((r) => S(r.list) === rowKey) ?? (favourites ? { group: 'FAVOURITE', list: FAVOURITES_LIST, desc: FAVOURITES_LIST, type: 'STANDARD' } : { list: rowKey })
  const [head, setHead] = useState({ group: S(row.group), list: S(row.list), desc: S(row.desc) })
  const [d, setD] = useState<ContactListDetail>(() => structuredClone(details[rowKey] ?? blankContactDetail()))
  const [tab, setTab] = useState(TABS[0]!)
  const [sub, setSub] = useState('Master Provider List')
  const [clinicSub, setClinicSub] = useState('Provider(s)')
  const [changing, setChanging] = useState<Section | null>(null)
  const locked = row.type === 'CONNECTION ROLE' || favourites
  useScreenReport({ dialog: 'contact-list-detail', contactTab: pbSlug(tab), contactPicks: Object.values(d).filter(Array.isArray).reduce((n, a) => n + a.length, 0) })

  const all: Record<Section, string[]> = useMemo(() => ({
    cities: CONTACT_CITIES,
    providers: clinicProviders.map((r) => S(r.name)),
    organizations: orgs.map((r) => S(r.name)),
    orgRoles: orgRoles.map((r) => S(r.name)),
    users: userNames(),
    masterProviders: masterProviders.map((r) => S(r.name)),
    specialties: SPECIALTIES,
    masterOrganizations: masterOrgs.map((r) => S(r.name)),
    orgTypes: valueSetValues(valueSets, EXTERNAL_ORGANIZATION_TYPE),
    linked: rows.map((r) => S(r.list)).filter((l) => l && l !== rowKey),
  }), [clinicProviders, orgs, orgRoles, masterProviders, masterOrgs, valueSets, rows, rowKey])

  const save = () => {
    setDetails({ ...details, [rowKey]: d })
    if (!favourites) update((list) => list.map((r) => (S(r.list) === rowKey ? { ...r, group: head.group, desc: head.desc } : r)))
    close()
  }

  const picked = (section: Section, extra?: (value: string) => Record<string, string>) => {
    const values = d[section]
    const byName = (list: ClinicRow[], v: string) => list.find((r) => S(r.name) === v)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 140, border: '1px solid #8a8a8a' }}>
        <ButtonBand caption={SECTION_LABEL[section].caption} scope={`contact-${pbSlug(section)}`} buttons={[{ label: 'Change', w: 90, onPress: () => setChanging(section) }]} />
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', background: '#fff' }}>
          <PBDataWindow<Record<string, string>>
            rows={values.map((v) => ({ value: v, ...(extra ? extra(v) : null) }))}
            gutter={false}
            empty=" "
            rowTutorialId={(r) => `host.mois.row.selected-${pbSlug(r.value!)}`}
            columns={section === 'masterProviders'
              ? [
                { key: 'value', header: 'Name', width: 260, headAlign: 'center' },
                { key: 'city', header: 'City', width: 120, headAlign: 'center', render: (r) => S(byName(masterProviders, r.value!)?.city) },
                { key: 'province', header: 'Province', width: 70, headAlign: 'center', render: (r) => S(byName(masterProviders, r.value!)?.province) || 'BC' },
                { key: 'spec', header: 'Specialty', width: 160, headAlign: 'center', render: (r) => S(byName(masterProviders, r.value!)?.spec) },
              ]
              : section === 'linked'
                ? [
                  { key: 'value', header: 'Contact List', width: 330, headAlign: 'center' },
                  { key: 'desc', header: 'Description', width: 330, headAlign: 'center', render: (r) => S(rows.find((x) => S(x.list) === r.value)?.desc) },
                ]
                : [{ key: 'value', header: SECTION_LABEL[section].column, width: 260, headAlign: 'center' }]}
          />
        </div>
      </div>
    )
  }

  const summary = (() => {
    const lines: [string, string, number][] = [
      ['City(s)', 'Cities', d.cities.length],
      ['Clinic Service Providers', 'Providers', d.providers.length], ['Clinic Service Providers', 'Organizations', d.organizations.length],
      ['Clinic Service Providers', 'Organization Roles', d.orgRoles.length], ['Clinic Service Providers', 'Users', d.users.length],
      ['External Service Providers', 'Master Providers', d.masterProviders.length], ['External Service Providers', 'Specialties', d.specialties.length],
      ['External Service Providers', 'Organizations', d.masterOrganizations.length], ['External Service Providers', 'Organization Types', d.orgTypes.length],
      ['Other Contact List(s)', 'Linked Contact Lists', d.linked.length],
    ]
    const sections = [...new Set(lines.filter((l) => l[2] > 0).map((l) => l[0]))]
    return (
      <div style={{ flex: '1 1 auto', background: '#fff', border: '1px solid #8a8a8a' }} data-tutorial-id="host.mois.field.contact-list-summary">
        <div style={{ background: '#000080', color: '#fff', fontWeight: 700, padding: '4px 10px' }}>Contact List Summary</div>
        {sections.length === 0 && <div style={{ padding: '6px 12px', color: '#808080' }}>Nothing is selected yet.</div>}
        {sections.map((sec) => (
          <div key={sec}>
            <div style={{ background: '#a7c9ed', padding: '3px 12px', fontSize: 13 }}>⊟ Section:&nbsp;&nbsp;<b>{sec}</b></div>
            {lines.filter((l) => l[0] === sec && l[2] > 0).map((l) => (
              <div key={l[1]} className="pb-row" style={{ padding: '2px 40px', background: '#ececec', borderBottom: '1px solid #fff' }}>
                <span style={{ width: 260 }}>⊞ {l[1]}</span><span style={{ color: '#808080' }}>records: {l[2]}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  })()

  const note = (text: string) => <div style={{ padding: '2px 0 4px' }}>{text}</div>
  const page = (() => {
    switch (tab) {
      case 'Summary': return summary
      case 'City(s)': return <>{note('This section allows you limit the contact list to selected city(s)')}<div style={{ width: 300, display: 'flex', flex: '1 1 auto' }}>{picked('cities')}</div></>
      case 'Clinic Service Providers': {
        const map: Record<string, Section> = { 'Provider(s)': 'providers', 'Organization(s)': 'organizations', 'Organization Role(s)': 'orgRoles', 'User(s)': 'users' }
        return (
          <>
            {note('This section allows you to include the providers, organizations, organization roles and users of this clinic')}
            <PBTabs tabs={Object.keys(map)} active={clinicSub} onChange={setClinicSub} compact face>
              <div style={{ display: 'flex', flex: '1 1 auto', padding: 4 }}>{picked(map[clinicSub]!)}</div>
            </PBTabs>
          </>
        )
      }
      case 'External Service Providers': return (
        <PBTabs tabs={['Master Provider List', 'Master Organization List']} active={sub} onChange={setSub} compact face>
          <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', padding: 4 }}>
            {sub === 'Master Provider List'
              ? <>{note('This section allows you to include specific, named providers or providers with a selected specialty(s)')}<div className="pb-row" style={{ alignItems: 'stretch', gap: 6, flex: '1 1 auto' }}><div style={{ flex: '3 1 0', display: 'flex' }}>{picked('masterProviders')}</div><div style={{ flex: '1 1 0', display: 'flex' }}>{picked('specialties')}</div></div></>
              : <>{note('This section allows you to include specific, named organizations or organizations with a selected type(s)')}<div className="pb-row" style={{ alignItems: 'stretch', gap: 6, flex: '1 1 auto' }}><div style={{ flex: '3 1 0', display: 'flex' }}>{picked('masterOrganizations')}</div><div style={{ flex: '1 1 0', display: 'flex' }}>{picked('orgTypes')}</div></div></>}
          </div>
        </PBTabs>
      )
      case 'Other Contact List(s)': return (
        <>
          {note('This section allows you include other contact lists.')}
          <div className="pb-row" style={{ gap: 16, padding: '2px 0 4px' }}>
            Join Type:
            <PBRadio name="join-type" label="Or (all records)" checked={d.join === 'or'} onChange={() => setD({ ...d, join: 'or' })} tutorialId="host.mois.field.join-or" />
            <PBRadio name="join-type" label="And (common records)" checked={d.join === 'and'} onChange={() => setD({ ...d, join: 'and' })} tutorialId="host.mois.field.join-and" />
          </div>
          {picked('linked')}
        </>
      )
      default: return null
    }
  })()

  const headField = (label: string, key: 'group' | 'list' | 'desc', editable: boolean) => (
    <Line label={label} w={90}>
      {key === 'group' && favourites
        ? <PBSelect w={276} options={['FAVOURITE']} value="FAVOURITE" data-tutorial-id="host.mois.field.contact-group" />
        : key === 'group' && row.type === 'STANDARD'
          ? <PBSelect w={276} options={['', ...valueSetValues(valueSets, CONTACT_LIST_GROUP)]} value={head.group} onChange={(e) => setHead({ ...head, group: e.target.value })} data-tutorial-id="host.mois.field.contact-group" />
          : <PBInput w={key === 'group' ? 276 : 490} value={head[key]} readOnly={!editable} style={editable ? undefined : { background: '#e8e8e8' }}
            onChange={(e) => setHead({ ...head, [key]: e.target.value })} data-tutorial-id={`host.mois.field.${key === 'list' ? 'list-name' : key === 'desc' ? 'list-description' : 'contact-group'}`} />}
    </Line>
  )

  return (
    <DemographicModal title="Contact List Detail" width={1000} height={760} onClose={close} dialog="contact-list-detail">
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }} onKeyDown={onF2(save)}>
        <NavyBand>Contact List</NavyBand>
        <div style={{ padding: '4px 10px', flex: 'none', background: 'var(--pb-face)' }}>
          {headField('Group:', 'group', false)}
          {headField('List Name:', 'list', false)}
          {headField('Description:', 'desc', !locked)}
        </div>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', padding: '0 6px' }}>
          <PBTabs tabs={TABS} active={tab} onChange={setTab} justified>
            <div key={tab} style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', padding: 6, overflow: 'auto' }}>{page}</div>
          </PBTabs>
        </div>
        <CentredFooter>
          <Cmd id="save-changes" w={120} primary onClick={save}>Save Changes (F2)</Cmd>
          <Cmd id="contact-close" w={108} onClick={close}>Close</Cmd>
        </CentredFooter>
      </div>
      {changing && (
        <ChangeSettingsDialog
          column={SECTION_LABEL[changing].column}
          all={all[changing]}
          selected={d[changing]}
          onClose={() => setChanging(null)}
          onSave={(values) => { setD({ ...d, [changing]: values }); setChanging(null) }}
        />
      )}
    </DemographicModal>
  )
}

/* ===========================================================================
   Change Settings                        `faf4c8cc…`, `0e8b102d…`
   ======================================================================== */

export function ChangeSettingsDialog({ column, all, selected, onSave, onClose }: {
  column: string; all: string[]; selected: string[]; onSave: (values: string[]) => void; onClose: () => void
}) {
  const host = usePBInstrumentation()
  const [chosen, setChosen] = useState<string[]>(selected)
  const [search, setSearch] = useState('')
  const [left, setLeft] = useState<Set<string>>(new Set())
  const [right, setRight] = useState<Set<string>>(new Set())
  const shown = all.filter((v) => v.toUpperCase().includes(search.trim().toUpperCase()))
  const pick = (set: Set<string>, setSet: (s: Set<string>) => void, v: string, multi: boolean) => {
    const n = new Set(multi ? set : [])
    if (n.has(v)) n.delete(v); else n.add(v)
    setSet(n)
  }
  const add = (vals: string[]) => { setChosen((c) => [...c, ...vals.filter((v) => !c.includes(v))]); setLeft(new Set()) }
  const remove = (vals: string[]) => { setChosen((c) => c.filter((v) => !vals.includes(v))); setRight(new Set()) }
  useScreenReport({ dialog: 'change-settings', selectedValues: chosen.length })
  const item = (v: string, on: boolean, greyed: boolean, onClick: (e: ReactMouseEvent) => void, onDouble: () => void, anchor: string) => (
    <div
      key={v}
      data-tutorial-id={anchor}
      onMouseDown={onClick}
      onDoubleClick={onDouble}
      style={{ padding: '2px 4px', borderBottom: '1px solid #eee', cursor: 'default', background: on ? '#3376d0' : undefined, color: on ? '#fff' : greyed ? '#b0b0b0' : undefined }}
    >
      {v}
    </div>
  )
  const arrow = (id: string, glyph: string, caption: string, act: () => void) => (
    <div style={{ textAlign: 'center' }}>
      <button type="button" className="pb-btn" style={{ width: 56, minWidth: 0 }} data-tutorial-id={host?.anchor('command', id)} onClick={() => { host?.report('command', { command: id }); act() }}>{glyph}</button>
      <div style={{ fontSize: 11 }}>{caption}</div>
    </div>
  )
  return (
    <DemographicModal title="Change Settings" width={850} height={520} onClose={onClose} dialog="change-settings">
      <div className="pb-row" style={{ flex: '1 1 auto', minHeight: 0, alignItems: 'stretch', gap: 14, padding: 10 }}>
        <div style={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', border: '1px solid #9a9a9a', background: '#fff' }}>
          <div style={{ background: 'linear-gradient(#ecebe8, #d8d5d0)', fontWeight: 700, padding: '3px 6px' }}>All Values</div>
          <div style={{ padding: 4 }}><PBInput w={290} value={search} onChange={(e) => setSearch(e.target.value)} data-tutorial-id="host.mois.field.change-search" /></div>
          <div style={{ background: '#cbdaf7', textAlign: 'center', padding: '1px 0' }}>{column}</div>
          <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto' }}>
            {shown.map((v) => item(v, left.has(v), chosen.includes(v), (e) => pick(left, setLeft, v, e.shiftKey || e.ctrlKey || e.metaKey), () => add([v]), `host.mois.row.all-${pbSlug(v)}`))}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 30 }}>
          {arrow('change-add', '>', '(add selected)', () => add([...left]))}
          {arrow('change-remove', '<', '(remove selected)', () => remove([...right]))}
        </div>
        <div style={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', border: '1px solid #9a9a9a', background: '#fff' }}>
          <div style={{ background: 'linear-gradient(#ecebe8, #d8d5d0)', fontWeight: 700, padding: '3px 6px' }}>Selected Value(s)</div>
          <div style={{ background: '#cbdaf7', textAlign: 'center', padding: '1px 0' }}>{column}</div>
          <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto' }}>
            {chosen.map((v) => item(v, right.has(v), false, (e) => pick(right, setRight, v, e.shiftKey || e.ctrlKey || e.metaKey), () => remove([v]), `host.mois.row.selected-value-${pbSlug(v)}`))}
          </div>
        </div>
      </div>
      <CentredFooter>
        <Cmd id="change-save" w={80} onClick={() => onSave(chosen)}>Save</Cmd>
        <Cmd id="change-cancel" w={80} onClick={onClose}>Cancel</Cmd>
      </CentredFooter>
    </DemographicModal>
  )
}
